"""The machine-wide lock for the check's test step, with two real processes, and the worker
default that leaves headroom for the rest of the machine."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest

from clinic.devtools import check, machine_lock
from clinic.devtools.check import NO_LOCK_ENV, controlled_env, default_workers, locked_test_step
from clinic.devtools.machine_lock import LockTimeout, MachineLock, free_memory_gb

CHILD = """
import sys, time
from pathlib import Path
from clinic.devtools.machine_lock import MachineLock

root, name = Path(sys.argv[1]), sys.argv[2]
slots = int(sys.argv[3]) if len(sys.argv) > 3 else 1

def say(message):
    with open(root / (name + ".said"), "a", encoding="utf-8") as out:
        out.write(message + chr(10))

with MachineLock(Path("worktree-" + name), wait_seconds=60, directory=root / "lock", say=say,
                 slots=slots, poll_seconds=0.05, report_every=0.2) as lock:
    (root / (name + ".slot")).write_text(str(lock.slot))
    (root / (name + ".held")).write_text("1")
    while not (root / (name + ".release")).exists():
        time.sleep(0.05)
(root / (name + ".done")).write_text("1")
"""


def _wait_for(path: Path, seconds: float = 30) -> None:
    deadline = time.monotonic() + seconds
    while not path.exists():
        assert time.monotonic() < deadline, f"{path.name} never appeared"
        time.sleep(0.05)


@contextmanager
def _child(root: Path, name: str, slots: int = 1) -> Iterator[subprocess.Popen[bytes]]:
    process = subprocess.Popen(
        [sys.executable, "-c", CHILD, str(root), name, str(slots)], env=controlled_env()
    )
    try:
        yield process
    finally:
        process.kill()
        process.wait()


def test_the_second_process_waits_for_the_first_and_then_runs(scratch_dir: Path) -> None:
    with _child(scratch_dir, "A") as first:
        _wait_for(scratch_dir / "A.held")
        with _child(scratch_dir, "B") as second:
            _wait_for(scratch_dir / "B.said")
            said = (scratch_dir / "B.said").read_text(encoding="utf-8")
            assert "worktree-A" in said and "waiting for a machine-wide test lock slot" in said
            time.sleep(0.5)
            assert not (scratch_dir / "B.held").exists()  # still waiting
            (scratch_dir / "A.release").write_text("1")
            _wait_for(scratch_dir / "B.held")  # it ran once the first let go
            (scratch_dir / "B.release").write_text("1")
            assert first.wait(30) == 0 and second.wait(30) == 0
    assert not (scratch_dir / "lock" / "check.lock.holder").exists()  # released cleanly


def test_a_killed_holder_releases_the_lock(scratch_dir: Path) -> None:
    with _child(scratch_dir, "A") as first:
        _wait_for(scratch_dir / "A.held")
        with _child(scratch_dir, "B") as second:
            _wait_for(scratch_dir / "B.said")
            first.kill()  # no release, no cleanup: the operating system frees the lock
            _wait_for(scratch_dir / "B.held")
            (scratch_dir / "B.release").write_text("1")
            assert second.wait(30) == 0


def test_the_wait_is_bounded_and_names_the_holder(scratch_dir: Path) -> None:
    with _child(scratch_dir, "A"):
        _wait_for(scratch_dir / "A.held")
        lock = MachineLock(
            Path("worktree-B"), wait_seconds=0.5, directory=scratch_dir / "lock", say=lambda _: None
        )
        with pytest.raises(LockTimeout, match="worktree-A"):
            lock.acquire()


def test_a_step_that_cannot_get_the_lock_is_not_run(
    scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    ran: list[int] = []

    def step() -> bool:
        ran.append(1)
        return True

    with _child(scratch_dir, "A", check.TEST_SLOTS), _child(scratch_dir, "B", check.TEST_SLOTS):
        _wait_for(scratch_dir / "A.held")
        _wait_for(scratch_dir / "B.held")  # every slot is taken
        ok, note = locked_test_step(
            step,
            environ={check.LOCK_WAIT_ENV: "0.5"},
            lock_directory=scratch_dir / "lock",
        )
    assert (ok, ran) == (False, [])
    assert "NOT obtained" in note and "did not run" in note
    out = capsys.readouterr().out
    assert "worktree-A" in out and "worktree-B" in out  # both holders are named


def test_the_step_runs_under_the_lock_and_the_note_says_so(scratch_dir: Path) -> None:
    held_during: list[bool] = []

    def step() -> bool:
        probe = MachineLock(
            Path("probe"), wait_seconds=0, directory=scratch_dir / "lock", say=lambda _: None
        )
        try:
            probe.acquire()
        except LockTimeout:
            held_during.append(True)
            return True
        probe.release()
        held_during.append(False)
        return True

    ok, note = locked_test_step(step, environ={}, lock_directory=scratch_dir / "lock")
    assert ok and held_during == [True]
    assert "held for the test step" in note
    assert f"slot 1 of {check.TEST_SLOTS}" in note and f"up to {check.TEST_SLOTS} checks" in note
    probe = MachineLock(
        Path("probe"),
        wait_seconds=0,
        directory=scratch_dir / "lock",
        slots=check.TEST_SLOTS,
    )
    probe.acquire()  # and it was released afterwards
    probe.release()


def test_the_opt_out_is_reported(scratch_dir: Path, capsys: pytest.CaptureFixture[str]) -> None:
    # a scratch checkout and lock directory: the real checkout lock is held by the check running us
    ok, note = locked_test_step(
        lambda: True,
        environ={NO_LOCK_ENV: "1"},
        lock_directory=scratch_dir / "lock",
        worktree=scratch_dir,
    )
    assert ok
    assert "SKIPPED" in note and NO_LOCK_ENV in note
    assert "SKIPPED" in capsys.readouterr().out


def test_the_default_worker_count_is_at_most_half_the_processors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert [default_workers(n) for n in (1, 2, 4, 8, 12, 24, 64)] == [1, 1, 2, 4, 6, 6, 6]
    monkeypatch.setattr(os, "cpu_count", lambda: 8)
    assert check.read_workers({}) == 4
    monkeypatch.setattr(os, "cpu_count", lambda: None)
    assert check.read_workers({}) == 1
    assert check.read_workers({"CLINIC_CHECK_WORKERS": "12"}) == 12  # an explicit choice is kept


# --- where the lock lives (FC-03) and an unusable lock directory (FC-08) ---------------------


def _git(where: Path, *args: str) -> None:
    subprocess.run(
        [
            shutil.which("git") or "git",
            "-c",
            "user.name=t",
            "-c",
            "user.email=t@localhost",
            "-C",
            str(where),
            *args,
        ],
        check=True,
        capture_output=True,
        env=controlled_env(),  # no GIT_DIR of the surrounding run
    )


def test_every_worktree_of_a_repository_resolves_to_the_same_lock_directory(
    scratch_dir: Path,
) -> None:
    from clinic.devtools.machine_lock import lock_dir

    main = scratch_dir / "main"
    main.mkdir()
    _git(main, "init", "-q")
    _git(main, "commit", "-q", "--allow-empty", "-m", "first")
    other = scratch_dir / "other"
    _git(main, "worktree", "add", "-q", str(other), "-b", "side")
    assert lock_dir(main) == lock_dir(other)
    assert lock_dir(other) == (main / ".git" / "clinic-check").resolve() or lock_dir(other).parts[
        -2:
    ] == (".git", "clinic-check")
    elsewhere = scratch_dir / "elsewhere"
    elsewhere.mkdir()
    _git(elsewhere, "init", "-q")
    assert lock_dir(elsewhere) != lock_dir(main)  # another clone is a different lock


def test_a_directory_that_is_not_a_repository_has_no_lock(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import LockUnavailable, lock_dir

    with pytest.raises(LockUnavailable):
        lock_dir(scratch_dir)


def test_an_unusable_lock_directory_fails_the_step_with_a_message(
    scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    blocker = scratch_dir / "not-a-directory"
    blocker.write_text("a file where the lock directory should be")
    ran: list[int] = []

    def step() -> bool:
        ran.append(1)
        return True

    ok, note = locked_test_step(step, environ={}, lock_directory=blocker / "lock")
    assert (ok, ran) == (False, [])
    assert "NOT obtained" in note
    assert "cannot open the checkout lock" in capsys.readouterr().out


def test_the_summary_note_names_the_lock_file(scratch_dir: Path) -> None:
    ok, note = locked_test_step(lambda: True, environ={}, lock_directory=scratch_dir / "lock")
    assert ok and str(scratch_dir / "lock" / "check.lock") in note


def test_a_tree_unpacked_inside_another_repository_has_no_lock(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import LockUnavailable, lock_dir

    outer = scratch_dir / "outer"
    outer.mkdir()
    _git(outer, "init", "-q")
    inner = outer / "unpacked-source-tree"
    inner.mkdir()
    with pytest.raises(LockUnavailable, match="not the top of a git checkout of its own"):
        lock_dir(inner)  # git would answer with the outer repository's git directory
    assert lock_dir(outer).parts[-2:] == (".git", "clinic-check")


# --- slots: a small number of checks at once (FC-19) -----------------------------------------


def test_the_slot_count_is_a_constant_of_two() -> None:
    assert check.TEST_SLOTS == 2  # measured choice (task record); no environment variable widens it
    source = Path(check.__file__).read_text(encoding="utf-8")
    assert "SLOTS" not in source.replace("TEST_SLOTS", "")  # nothing reads another slot setting
    assert "slots=TEST_SLOTS" in source  # and the one call site passes the constant


def test_two_checks_hold_a_slot_each_and_a_third_waits_for_the_first_to_leave(
    scratch_dir: Path,
) -> None:
    with _child(scratch_dir, "A", 2) as a, _child(scratch_dir, "B", 2) as b:
        _wait_for(scratch_dir / "A.held")
        _wait_for(scratch_dir / "B.held")  # two at once: no waiting
        assert {(scratch_dir / "A.slot").read_text(), (scratch_dir / "B.slot").read_text()} == {
            "0",
            "1",
        }
        assert not (scratch_dir / "A.said").exists() and not (scratch_dir / "B.said").exists()
        with _child(scratch_dir, "C", 2) as c:
            _wait_for(scratch_dir / "C.said")
            said = (scratch_dir / "C.said").read_text(encoding="utf-8")
            assert "worktree-A" in said and "worktree-B" in said and "all 2 taken" in said
            time.sleep(0.5)
            assert not (scratch_dir / "C.held").exists()  # a third check waits
            (scratch_dir / "A.release").write_text("1")
            _wait_for(scratch_dir / "C.held")  # and runs when one of the two leaves
            assert (scratch_dir / "C.slot").read_text() == (scratch_dir / "A.slot").read_text()
            for name in ("B", "C"):
                (scratch_dir / f"{name}.release").write_text("1")
            assert a.wait(30) == 0 and b.wait(30) == 0 and c.wait(30) == 0


def test_a_killed_holder_frees_only_its_own_slot(scratch_dir: Path) -> None:
    with _child(scratch_dir, "A", 2) as a, _child(scratch_dir, "B", 2) as b:
        _wait_for(scratch_dir / "A.held")
        _wait_for(scratch_dir / "B.held")
        freed = (scratch_dir / "A.slot").read_text()
        with _child(scratch_dir, "C", 2) as c:
            _wait_for(scratch_dir / "C.said")
            a.kill()  # no clean-up: the operating system frees slot A held
            _wait_for(scratch_dir / "C.held")
            assert (scratch_dir / "C.slot").read_text() == freed
            assert b.poll() is None  # B still holds its own slot
            (scratch_dir / "B.release").write_text("1")
            (scratch_dir / "C.release").write_text("1")
            assert b.wait(30) == 0 and c.wait(30) == 0


def test_slot_zero_is_the_file_of_the_earlier_single_lock(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import holder_file, slot_file

    assert slot_file(scratch_dir, 0).name == "check.lock"  # an older checkout still excludes there
    assert slot_file(scratch_dir, 1).name == "check.lock.1"
    assert holder_file(scratch_dir, 0).name == "check.lock.holder"
    assert holder_file(scratch_dir, 1).name == "check.lock.1.holder"


def test_a_lock_needs_at_least_one_slot(scratch_dir: Path) -> None:
    with pytest.raises(ValueError, match="at least one slot"):
        MachineLock(Path("x"), wait_seconds=1, directory=scratch_dir, slots=0)


def test_a_slot_file_that_cannot_be_opened_leaves_no_descriptor_open(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import LockUnavailable, slot_file

    directory = scratch_dir / "lock"
    directory.mkdir()
    slot_file(directory, 1).mkdir()  # a directory where slot 1's file should be
    lock = MachineLock(Path("x"), wait_seconds=1, directory=directory, slots=2)
    with pytest.raises(LockUnavailable, match="cannot open the lock file"):
        lock.acquire()
    # slot 0's descriptor was closed on the way out: a new lock can take it at once
    again = MachineLock(Path("y"), wait_seconds=0, directory=directory, slots=1)
    again.acquire()
    again.release()


def test_a_wait_that_runs_out_or_is_interrupted_closes_every_descriptor(scratch_dir: Path) -> None:
    holders = [
        MachineLock(Path(f"h{i}"), wait_seconds=0, directory=scratch_dir / "lock", slots=2)
        for i in range(2)
    ]
    for holder in holders:
        holder.acquire()
    try:
        waiter = MachineLock(
            Path("w"), wait_seconds=0, directory=scratch_dir / "lock", slots=2, say=lambda _: None
        )
        with pytest.raises(LockTimeout):
            waiter.acquire()

        def interrupt(_: str) -> None:
            raise KeyboardInterrupt

        interrupted = MachineLock(
            Path("w2"), wait_seconds=30, directory=scratch_dir / "lock", slots=2, say=interrupt
        )
        with pytest.raises(KeyboardInterrupt):
            interrupted.acquire()
    finally:
        for holder in holders:
            holder.release()
    # nothing the waiters opened is still holding a slot: both slots can be taken at once again
    again = [
        MachineLock(Path("z"), wait_seconds=0, directory=scratch_dir / "lock", slots=2)
        for _ in range(2)
    ]
    for lock in again:
        lock.acquire()
    assert {lock.slot for lock in again} == {0, 1}
    for lock in again:
        lock.release()


def test_releasing_slot_one_removes_its_holder_file(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import holder_file

    first = MachineLock(Path("a"), wait_seconds=0, directory=scratch_dir / "lock", slots=2)
    second = MachineLock(Path("b"), wait_seconds=0, directory=scratch_dir / "lock", slots=2)
    first.acquire()
    second.acquire()
    assert (first.slot, second.slot) == (0, 1)
    assert holder_file(scratch_dir / "lock", 1).exists()
    second.release()
    assert not holder_file(scratch_dir / "lock", 1).exists()
    assert holder_file(scratch_dir / "lock", 0).exists()  # the other slot's information stays
    first.release()


# --- the memory gate on the second slot (FS-08) ------------------------------------------------


def _gated(
    scratch_dir: Path, name: str, free: Callable[[], float | None], *, wait: float = 0.0
) -> MachineLock:
    return MachineLock(
        Path(name),
        wait_seconds=wait,
        directory=scratch_dir / "lock",
        slots=2,
        say=lambda _: None,
        poll_seconds=0.01,
        second_slot_free_gb=8.0,
        free_memory=free,
    )


def test_with_enough_free_memory_a_second_check_takes_the_second_slot(scratch_dir: Path) -> None:
    first, second = _gated(scratch_dir, "a", lambda: 9.5), _gated(scratch_dir, "b", lambda: 9.5)
    first.acquire()
    second.acquire()
    try:
        assert (first.slot, second.slot) == (0, 1)
        assert "second slot open (9.5 GiB free, it needs 8 GiB)" in second.rule
    finally:
        second.release()
        first.release()


def test_with_too_little_free_memory_a_check_waits_for_the_first_slot(scratch_dir: Path) -> None:
    first = _gated(scratch_dir, "a", lambda: 9.5)
    first.acquire()
    try:
        second = _gated(scratch_dir, "b", lambda: 5.2)
        with pytest.raises(LockTimeout, match=r"first slot only \(5.2 GiB free"):
            second.acquire()  # slot 1 is free, but the second slot is closed
        assert second.slot == -1
    finally:
        first.release()
    again = _gated(scratch_dir, "c", lambda: 5.2)
    again.acquire()  # the first slot, once it is free, is taken whatever the memory
    try:
        assert again.slot == 0
        assert "first slot only (5.2 GiB free, the second slot needs 8 GiB)" in again.rule
    finally:
        again.release()


def test_the_threshold_is_inclusive_and_an_unreadable_figure_closes_the_second_slot(
    scratch_dir: Path,
) -> None:
    holder = _gated(scratch_dir, "a", lambda: 8.0)
    holder.acquire()
    try:
        exactly = _gated(scratch_dir, "b", lambda: 8.0)
        exactly.acquire()
        assert exactly.slot == 1 and "second slot open (8.0 GiB free" in exactly.rule
        exactly.release()
        unreadable = _gated(scratch_dir, "c", lambda: None)
        with pytest.raises(LockTimeout, match="free memory could not be read"):
            unreadable.acquire()
    finally:
        holder.release()


def test_memory_that_frees_up_while_waiting_opens_the_second_slot(scratch_dir: Path) -> None:
    readings = iter([4.0, 4.0, 4.0, 12.0])  # then 12.0 for good
    last = [12.0]

    def reading() -> float:
        last[0] = next(readings, last[0])
        return last[0]

    holder = _gated(scratch_dir, "a", lambda: 12.0)
    holder.acquire()
    try:
        waiter = _gated(scratch_dir, "b", reading, wait=30)
        waiter.acquire()
        assert waiter.slot == 1 and waiter.waited > 0
        assert "second slot open (12.0 GiB free" in waiter.rule
        waiter.release()
    finally:
        holder.release()


def test_a_single_slot_lock_reads_no_memory(scratch_dir: Path) -> None:
    def never() -> float:
        raise AssertionError("one slot has no second slot to gate")

    lock = MachineLock(
        Path("a"), wait_seconds=0, directory=scratch_dir / "lock", slots=1,
        second_slot_free_gb=8.0, free_memory=never,
    )  # fmt: skip
    lock.acquire()
    assert lock.slot == 0 and lock.rule == ""
    lock.release()


def test_the_step_says_which_rule_applied_and_the_free_memory_seen(
    scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    ok, note = locked_test_step(
        lambda: True, environ={}, lock_directory=scratch_dir / "lock",
        worktree=scratch_dir, free_memory=lambda: 3.3,
    )  # fmt: skip
    assert ok
    assert "memory rule: first slot only (3.3 GiB free, the second slot needs 8 GiB)" in note
    assert "memory rule: first slot only (3.3 GiB free" in capsys.readouterr().out
    ok, note = locked_test_step(
        lambda: True, environ={}, lock_directory=scratch_dir / "lock",
        worktree=scratch_dir, free_memory=lambda: 20.0,
    )  # fmt: skip
    assert ok and "memory rule: second slot open (20.0 GiB free, it needs 8 GiB)" in note


def test_a_step_with_too_little_memory_does_not_take_the_free_second_slot(
    scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    holder = _gated(scratch_dir, "holder", lambda: 20.0)
    holder.acquire()
    ran: list[int] = []

    def step() -> bool:
        ran.append(1)
        return True

    try:
        ok, note = locked_test_step(
            step, environ={check.LOCK_WAIT_ENV: "0.3"},
            lock_directory=scratch_dir / "lock", worktree=scratch_dir, free_memory=lambda: 2.0,
        )  # fmt: skip
    finally:
        holder.release()
    assert (ok, ran) == (False, [])
    assert "NOT obtained" in note
    assert "first slot only (2.0 GiB free" in capsys.readouterr().out


def test_the_headroom_is_a_constant_that_no_environment_variable_changes() -> None:
    assert check.SECOND_SLOT_FREE_GB == 8.0
    source = Path(check.__file__).read_text(encoding="utf-8")
    assert source.count("SECOND_SLOT_FREE_GB") >= 3
    assert not re.search(r"environ[^\n]*SECOND_SLOT|SECOND_SLOT[^\n]*environ", source)
    assert "second_slot_free_gb=SECOND_SLOT_FREE_GB" in source  # the one call site passes it


def test_free_memory_is_read_from_the_system() -> None:
    reading = free_memory_gb()
    if sys.platform == "win32" or Path("/proc/meminfo").exists():
        assert reading is not None and 0 < reading < 4096
    else:
        assert reading is None


def test_free_memory_on_linux_is_the_available_figure_of_proc_meminfo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    text = "MemTotal:       32768000 kB\nMemFree:          100000 kB\nMemAvailable:    8388608 kB\n"

    class FakePath:
        def __init__(self, name: str) -> None:
            assert name == "/proc/meminfo"

        def read_text(self, encoding: str) -> str:
            return text

    monkeypatch.setattr(machine_lock, "Path", FakePath)
    monkeypatch.setattr(sys, "platform", "linux")
    reading = free_memory_gb()
    monkeypatch.undo()
    assert reading == 8.0  # 8388608 kB is 8 GiB


# --- one check per checkout (FS-02) -----------------------------------------------------------

CHECKOUT_CHILD = """
import sys, time
from pathlib import Path
from clinic.devtools.machine_lock import CheckoutLock

root = Path(sys.argv[1])
CheckoutLock(Path(sys.argv[2]), root / "lock").acquire()
(root / "checkout.held").write_text("1")
time.sleep(600)
"""


@contextmanager
def _checkout_holder(root: Path, worktree: Path) -> Iterator[subprocess.Popen[bytes]]:
    process = subprocess.Popen(
        [sys.executable, "-c", CHECKOUT_CHILD, str(root), str(worktree)], env=controlled_env()
    )
    try:
        _wait_for(root / "checkout.held")
        yield process
    finally:
        process.kill()
        process.wait()


def test_a_second_check_of_the_same_checkout_is_refused_at_once(scratch_dir: Path) -> None:
    from clinic.devtools.machine_lock import CheckoutBusy, CheckoutLock

    worktree = scratch_dir / "wt"
    worktree.mkdir()
    with _checkout_holder(scratch_dir, worktree) as holder:
        # the same checkout spelled another way is the same checkout
        respelled = Path(os.path.join(worktree, "..", "wt"))
        with pytest.raises(CheckoutBusy, match=r"already running \(process \d+"):
            CheckoutLock(respelled, scratch_dir / "lock").acquire()
        # another checkout is not affected
        other = scratch_dir / "other"
        other.mkdir()
        elsewhere = CheckoutLock(other, scratch_dir / "lock")
        elsewhere.acquire()
        elsewhere.release()
        holder.kill()  # a killed holder releases it (the system closes its handles a moment later)
        holder.wait()
        deadline = time.monotonic() + 60
        while True:
            again = CheckoutLock(worktree, scratch_dir / "lock")
            try:
                again.acquire()
                break
            except CheckoutBusy:
                assert time.monotonic() < deadline, "the killed holder never released the lock"
                time.sleep(0.1)
        again.release()


def test_the_step_is_not_run_when_this_checkout_is_already_being_checked(
    scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    worktree = scratch_dir / "wt"
    worktree.mkdir()
    ran: list[int] = []

    def step() -> bool:
        ran.append(1)
        return True

    with _checkout_holder(scratch_dir, worktree):
        for environ in ({}, {NO_LOCK_ENV: "1"}):  # the opt-out does not cover this lock
            ok, note = locked_test_step(
                step, environ=environ, lock_directory=scratch_dir / "lock", worktree=worktree
            )
            assert (ok, ran) == (False, [])
            assert "already being checked" in note
    assert "is already running" in capsys.readouterr().out
    # a free checkout runs, and a slot is taken for it
    ok, note = locked_test_step(
        step, environ={}, lock_directory=scratch_dir / "lock", worktree=scratch_dir / "other"
    )
    assert ok and ran == [1] and "slot 1 of" in note


def test_the_opt_out_path_releases_the_checkout_lock_and_reports_what_ran(
    scratch_dir: Path,
) -> None:
    worktree = scratch_dir / "wt"
    worktree.mkdir()
    ran: list[int] = []

    def step() -> bool:
        ran.append(1)
        return True

    for _ in range(3):  # the checkout lock is free again after each opted-out check
        ok, note = locked_test_step(
            step,
            environ={NO_LOCK_ENV: "1"},
            lock_directory=scratch_dir / "lock",
            worktree=worktree,
        )
        assert ok and "SKIPPED" in note
    assert ran == [1, 1, 1]

    def raising() -> bool:
        raise RuntimeError("the tests blew up")

    with pytest.raises(RuntimeError, match="blew up"):  # not reported as a lock failure
        locked_test_step(
            raising,
            environ={NO_LOCK_ENV: "1"},
            lock_directory=scratch_dir / "lock",
            worktree=worktree,
        )
    ok, _ = locked_test_step(  # and the lock was released on the way out
        step, environ={}, lock_directory=scratch_dir / "lock", worktree=worktree
    )
    assert ok


def test_the_opt_out_without_a_git_directory_says_no_checkout_lock_was_taken(
    scratch_dir: Path,
) -> None:
    ok, note = locked_test_step(lambda: True, environ={NO_LOCK_ENV: "1"}, worktree=scratch_dir)
    assert ok and "SKIPPED" in note and "checkout lock was NOT taken" in note
    ok, note = locked_test_step(lambda: True, environ={}, worktree=scratch_dir)
    assert not ok and "NOT obtained" in note  # without the opt-out, no git directory is a failure


def test_no_test_asks_for_the_real_locks(scratch_dir: Path) -> None:
    """A test that calls ``locked_test_step`` without a scratch ``lock_directory`` or ``worktree``
    would take this checkout's real checkout lock, which the check that is running us holds."""
    import ast

    tree = ast.parse(Path(__file__).read_text(encoding="utf-8"))
    bare = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and getattr(node.func, "id", "") == "locked_test_step"
        and not {"lock_directory", "worktree"} & {k.arg for k in node.keywords}
    ]
    assert bare == [], f"locked_test_step called with the real locks at lines {bare}"
