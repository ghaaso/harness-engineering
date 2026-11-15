"""A lock shared by every checkout of this repository on this machine, for the check's heavy step.

Several worktrees run the full check at once; with many pytest workers each, that overloaded the
owner's PC (it shut down uncleanly on 5 and 6 November 2026). The test step therefore takes this
lock first, so only a small number of checkouts (the slots: see TEST_SLOTS in check.py) run their
tests at a time. Each slot is an operating-system file lock (``msvcrt.locking`` on Windows,
``fcntl.flock`` elsewhere; standard library only) on a file in the repository's common git
directory (the same place for every worktree of the repository; a second clone is not excluded),
so a process that is killed, or a machine that restarts, releases its slot and nothing needs
stale-lock logic. Who holds a slot is written to a second file beside it (worktree, process id,
start time) for the people who wait; that file is information only, never consulted to decide
whether the slot is taken.

Memory gate: a second slot is offered only while enough physical memory is available (see
``MachineLock``); memory, not the processors, is what ran out when two checks ran beside other
work, so otherwise a check waits for the first slot.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from types import TracebackType
from typing import Final

LOCK_NAME: Final = "check.lock"
# Variables that would point git at another repository than the worktree asked about.
GIT_REDIRECTS: Final = frozenset({"GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"})
HOLDER_NAME: Final = "check.lock.holder"
POLL_SECONDS: Final = 1.0
REPORT_EVERY_SECONDS: Final = 60.0


class LockTimeout(Exception):
    """The lock stayed taken for the whole bounded wait."""


class LockUnavailable(Exception):
    """The lock cannot be taken at all (no git directory, an unwritable lock directory)."""


def lock_dir(worktree: Path) -> Path:
    """The directory that holds the lock files: ``clinic-check`` inside the repository's common
    git directory, which every worktree of the repository resolves to the same place.

    Not excluded by this: a second clone of the repository has its own git directory.
    """
    git = shutil.which("git")
    if git is None:
        raise LockUnavailable("git was not found, so the common git directory is unknown")
    try:
        done = subprocess.run(
            [
                git,
                *("-C", str(worktree), "rev-parse", "--path-format=absolute"),
                *("--show-toplevel", "--git-common-dir"),
            ],
            capture_output=True,
            check=False,
            timeout=30,
            env={k: v for k, v in os.environ.items() if k.upper() not in GIT_REDIRECTS},
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise LockUnavailable(
            f"cannot run git to find the common git directory ({error})"
        ) from None
    lines = os.fsdecode(done.stdout).strip().splitlines()
    if done.returncode != 0 or len(lines) != 2:
        raise LockUnavailable(
            f"git could not describe the checkout {worktree} (output {lines!r}): "
            f"{os.fsdecode(done.stderr).strip()}"
        )
    top, common = lines[0].strip(), lines[1].strip()
    if os.path.normcase(os.path.realpath(top)) != os.path.normcase(os.path.realpath(worktree)):
        raise LockUnavailable(
            f"{worktree} is not the top of a git checkout of its own (git says the top is "
            f"{top}); the lock would be written into that other repository's git directory"
        )
    if not Path(common).is_absolute():
        raise LockUnavailable(
            f"git could not name the common git directory of {worktree} as an absolute path "
            f"(output {common!r}): {os.fsdecode(done.stderr).strip()}"
        )
    return Path(common) / "clinic-check"


def _try_lock(fd: int) -> bool:
    if sys.platform == "win32":
        import msvcrt

        try:
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
        except OSError:
            return False
        return True
    import fcntl

    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return False
    return True


def _unlock(fd: int) -> None:
    if sys.platform == "win32":
        import msvcrt

        os.lseek(fd, 0, os.SEEK_SET)
        msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
    else:
        import fcntl

        fcntl.flock(fd, fcntl.LOCK_UN)


def slot_file(directory: Path, slot: int) -> Path:
    """The lock file of ``slot``. Slot 0 keeps the name of the single lock of the earlier
    generation of this tool (``check.lock``), so a checkout that still runs the older code takes
    the same file as slot 0 and the two generations keep excluding each other there."""
    return directory / (LOCK_NAME if slot == 0 else f"{LOCK_NAME}.{slot}")


def holder_file(directory: Path, slot: int) -> Path:
    return directory / (HOLDER_NAME if slot == 0 else f"{LOCK_NAME}.{slot}.holder")


def describe_holder(directory: Path, slot: int = 0) -> str:
    """What the holder file says about who has the slot, for a waiting person."""
    try:
        data = json.loads(holder_file(directory, slot).read_text(encoding="utf-8"))
        return f"{data['worktree']} (process {data['pid']}, since {data['since']})"
    except (OSError, ValueError, KeyError, TypeError):
        return "another checkout (no holder information)"


def free_memory_gb() -> float | None:
    """The physical memory available right now, in GiB (2**30 bytes); None where it cannot be read.

    Standard library only: ``GlobalMemoryStatusEx`` through ctypes on Windows (``ullAvailPhys``:
    free plus standby memory, what Task Manager calls available), ``MemAvailable`` of
    ``/proc/meminfo`` on Linux. Other systems (macOS) report None."""
    try:
        if sys.platform == "win32":
            import ctypes

            class Status(ctypes.Structure):
                _fields_ = (
                    ("dwLength", ctypes.c_uint32),
                    ("dwMemoryLoad", ctypes.c_uint32),
                    ("ullTotalPhys", ctypes.c_uint64),
                    ("ullAvailPhys", ctypes.c_uint64),
                    ("ullTotalPageFile", ctypes.c_uint64),
                    ("ullAvailPageFile", ctypes.c_uint64),
                    ("ullTotalVirtual", ctypes.c_uint64),
                    ("ullAvailVirtual", ctypes.c_uint64),
                    ("ullAvailExtendedVirtual", ctypes.c_uint64),
                )

            status = Status()
            status.dwLength = ctypes.sizeof(Status)
            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel32.GlobalMemoryStatusEx.argtypes = (ctypes.POINTER(Status),)
            if not kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
                return None
            return float(status.ullAvailPhys) / 2**30
        for line in Path("/proc/meminfo").read_text(encoding="ascii").splitlines():
            if line.startswith("MemAvailable:"):
                return int(line.split()[1]) / 2**20  # kB to GiB
    except (OSError, ValueError, IndexError, AttributeError):
        return None
    return None


class MachineLock:
    """``with MachineLock(...) as lock:`` takes any free one of ``slots`` locks, waiting up to
    ``wait_seconds`` only when all of them are taken. ``lock.slot`` is the slot taken.

    Memory gate: with ``second_slot_free_gb`` above zero only the first slot is offered unless that
    much physical memory is available (``free_memory``, read again at every poll); a check
    otherwise waits for the first slot as if there were one. An unreadable figure closes the
    second slot too. ``lock.rule`` says which rule applied and the figure seen."""

    def __init__(
        self,
        worktree: Path,
        *,
        wait_seconds: float,
        directory: Path,
        slots: int = 1,
        say: Callable[[str], None] = print,
        poll_seconds: float = POLL_SECONDS,
        report_every: float = REPORT_EVERY_SECONDS,
        second_slot_free_gb: float = 0.0,
        free_memory: Callable[[], float | None] = free_memory_gb,
    ) -> None:
        if slots < 1:
            raise ValueError("a lock needs at least one slot")
        self.worktree = worktree
        self.wait_seconds = wait_seconds
        self.directory = directory
        self.slots = slots
        self.say = say
        self.poll_seconds = poll_seconds
        self.report_every = report_every
        self.second_slot_free_gb = second_slot_free_gb
        self.free_memory = free_memory
        self.waited = 0.0
        self.slot = -1
        self.rule = ""
        self._fd: int | None = None

    def _holders(self) -> str:
        return "; ".join(describe_holder(self.directory, i) for i in range(self.slots))

    def _open_slots(self) -> tuple[int, str]:
        """How many slots may be taken now, and the rule that decided it (with the figure seen)."""
        if self.slots < 2 or self.second_slot_free_gb <= 0:
            return self.slots, ""
        free = self.free_memory()
        need = f"{self.second_slot_free_gb:g} GiB"
        if free is None:
            return 1, f"first slot only (free memory could not be read; the second needs {need})"
        if free < self.second_slot_free_gb:
            return 1, f"first slot only ({free:.1f} GiB free, the second slot needs {need})"
        return self.slots, f"second slot open ({free:.1f} GiB free, it needs {need})"

    def acquire(self) -> None:
        fds: list[int] = []
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            for slot in range(self.slots):
                fds.append(os.open(slot_file(self.directory, slot), os.O_RDWR | os.O_CREAT, 0o600))
        except OSError as error:
            for fd in fds:
                os.close(fd)
            raise LockUnavailable(
                f"cannot open the lock file in {self.directory} ({error})"
            ) from None
        try:
            taken = self._wait_for_a_slot(fds)
        except BaseException:
            for fd in fds:  # a timeout, Ctrl-C, anything: no descriptor stays open
                with contextlib.suppress(OSError):
                    os.close(fd)
            raise
        self._finish(fds, taken)

    def _wait_for_a_slot(self, fds: list[int]) -> int:
        started = time.monotonic()
        last_report = started
        announced = False
        taken = -1
        while taken < 0:
            open_slots, self.rule = self._open_slots()
            for slot, fd in enumerate(fds[:open_slots]):
                if _try_lock(fd):
                    taken = slot
                    break
            if taken >= 0:
                break
            now = time.monotonic()
            if now - started >= self.wait_seconds:
                raise LockTimeout(
                    f"all {open_slots} open machine-wide test lock slot(s) were still held, by "
                    f"{self._holders()}, after {self.wait_seconds:.0f} s"
                    + (f"; rule: {self.rule}" if self.rule else "")
                )
            if not announced or now - last_report >= self.report_every:
                self.say(
                    f"   waiting for a machine-wide test lock slot (all {open_slots} taken), "
                    f"held by {self._holders()} "
                    f"({now - started:.0f} s so far, gives up after {self.wait_seconds:.0f} s)"
                    + (f"; rule: {self.rule}" if self.rule else "")
                )
                announced, last_report = True, now
            time.sleep(self.poll_seconds)
        self.waited = time.monotonic() - started
        return taken

    def _finish(self, fds: list[int], taken: int) -> None:
        for slot, fd in enumerate(fds):
            if slot != taken:
                os.close(fd)
        self.slot = taken
        self._fd = fds[taken]
        holder = {
            "worktree": str(self.worktree),
            "pid": os.getpid(),
            "since": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
        with contextlib.suppress(OSError):
            holder_file(self.directory, taken).write_text(json.dumps(holder), encoding="utf-8")

    def release(self) -> None:
        if self._fd is None:
            return
        with contextlib.suppress(OSError):
            holder_file(self.directory, self.slot).unlink()
        with contextlib.suppress(OSError):
            _unlock(self._fd)
        with contextlib.suppress(OSError):
            os.close(self._fd)
        self._fd = None

    def __enter__(self) -> MachineLock:
        self.acquire()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.release()


class CheckoutBusy(Exception):
    """A check of this very checkout is already running."""


def checkout_files(directory: Path, worktree: Path) -> tuple[Path, Path]:
    """The lock file and the holder file of one checkout, named by a hash of its real path
    (case folded on Windows), so a different spelling of the same path is the same checkout."""
    real = os.path.normcase(os.path.realpath(worktree))
    tag = hashlib.sha1(real.encode(), usedforsecurity=False).hexdigest()[:12]
    return directory / f"checkout-{tag}.lock", directory / f"checkout-{tag}.holder"


class CheckoutLock:
    """A check of one checkout at a time, whatever the number of slots.

    Two checks of the same checkout share one set of test databases (`test_<name>_<hash>_gwN`),
    and `autoclobber` lets one drop the other's. This non-blocking exclusive lock is taken before
    a slot; a second check of the same checkout is refused at once with a message."""

    def __init__(self, worktree: Path, directory: Path) -> None:
        self.worktree = worktree
        self.directory = directory
        self._fd: int | None = None
        self._holder = checkout_files(directory, worktree)[1]

    def acquire(self) -> None:
        lock, holder = checkout_files(self.directory, self.worktree)
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            fd = os.open(lock, os.O_RDWR | os.O_CREAT, 0o600)
        except OSError as error:
            raise LockUnavailable(
                f"cannot open the checkout lock in {self.directory} ({error})"
            ) from None
        if not _try_lock(fd):
            os.close(fd)
            try:
                data = json.loads(holder.read_text(encoding="utf-8"))
                who = f"process {data['pid']}, since {data['since']}"
            except (OSError, ValueError, KeyError, TypeError):
                who = "no holder information"
            raise CheckoutBusy(
                f"a check of this checkout ({self.worktree}) is already running ({who}); two "
                "checks of one checkout would share, and could drop, each other's test databases"
            )
        self._fd = fd
        info = {"pid": os.getpid(), "since": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")}
        with contextlib.suppress(OSError):
            holder.write_text(json.dumps(info), encoding="utf-8")

    def release(self) -> None:
        if self._fd is None:
            return
        with contextlib.suppress(OSError):
            self._holder.unlink()
        with contextlib.suppress(OSError):
            _unlock(self._fd)
        with contextlib.suppress(OSError):
            os.close(self._fd)
        self._fd = None
