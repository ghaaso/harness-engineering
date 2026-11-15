"""The application's local check command (S00): lint, format, types, Django checks, tests.

Run from the repository root:  uv run --locked python scripts/check.py

It succeeds only if every step passes, PostgreSQL 17 is reachable with the configured
runtime and migrator roles, at least one test was collected, every collected test ran, and no
test was skipped, xfailed, xpassed or deselected. A skip is a failure here: unlike the
workflow checker's known defect RT-01, "everything skipped" can never pass.

Every step runs in a child process with a controlled environment (G00-05): inherited
PYTHON*, PYTEST_* and DJANGO_* variables are removed, PYTHONPATH is set to ``src`` only, user
site-packages are disabled, the settings module is ``clinic.settings.test``, and pytest's
plugin autoloading is off, so only pytest-django, the outcome recorder and (for the parallel
pass) pytest-xdist are loaded. The
command takes no arguments that select tests.

The test step runs the suite in two passes that together run every test exactly once: a
parallel pass (pytest-xdist, one test database per worker, ``-m "not serial"``) and a serial
single-process pass (``-m serial``) for the tests that must not share the machine with other
tests: the two-connection races and the timing assertions (docs/tasks/faster-check/task.md).
The step proves the split every time: the two passes' collected ids are disjoint, together
equal the single-process collection, and every collected test finished. Environment knobs:
CLINIC_CHECK_WORKERS (default 6; 0 runs the first pass in one process) and
CLINIC_CHECK_STALL_SECONDS (default 600: a pass that records no test progress for that long
is killed and the check fails with a message naming the hung pass).
"""

from __future__ import annotations

import contextlib
import json
import os
import platform
import signal
import subprocess
import sys
import tempfile
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass, fields
from pathlib import Path
from typing import Any, Final

from clinic.devtools import container_mode
from clinic.devtools.connect_retry import RETRY_LOG_ENV
from clinic.devtools.machine_lock import (
    CheckoutBusy,
    CheckoutLock,
    LockTimeout,
    LockUnavailable,
    MachineLock,
    free_memory_gb,
    lock_dir,
    slot_file,
)
from clinic.devtools.process_guard import reaped, start_guarded, terminate, wait_unreaped
from clinic.devtools.pytest_outcomes import HEARTBEAT_ENV, OUTPUT_ENV

REPO_ROOT: Final = Path(__file__).resolve().parents[3]
REQUIRED_POSTGRES_MAJOR: Final = 17
_DROPPED_PREFIXES: Final = ("PYTHON", "PYTEST_", "DJANGO_")
# Variables that point git at another repository (set when a check runs from a git hook or
# `git rebase -x`): tests that make their own repositories must not reach the real one.
_DROPPED_GIT: Final = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR")
PROBE_FLAG: Final = "--probe-database"
# Internal: the driver the container runs (docker/tests/bootstrap.py starts it); not for people.
INSIDE_FLAG: Final = "--inside-container"
WORKERS_ENV: Final = "CLINIC_CHECK_WORKERS"
STALL_ENV: Final = "CLINIC_CHECK_STALL_SECONDS"
NO_LOCK_ENV: Final = "CLINIC_CHECK_NO_LOCK"
LOCK_WAIT_ENV: Final = "CLINIC_CHECK_LOCK_WAIT_SECONDS"
DEFAULT_LOCK_WAIT_SECONDS: Final = 2700.0
# How many checks may run their tests at the same time on this machine. A constant on purpose:
# no environment variable can widen or narrow it silently, and the summary states it.
# Measured choice: docs/tasks/faster-check/task.md section 13.
TEST_SLOTS: Final = 2
# The second slot is offered only while at least this much physical memory is available (GiB,
# binary: 8 GiB is 8.6 GB);
# a constant, no environment variable changes it (docs/tasks/faster-check/task.md section 15).
SECOND_SLOT_FREE_GB: Final = 8.0
# At most this many workers, and never more than half the logical processors, so one check leaves
# room for the staging VM and the other sessions (measured choice: docs/tasks/faster-check).
DEFAULT_WORKERS: Final = 6
# The container mode's default when CLINIC_CHECK_WORKERS is not set: 12, or half the logical
# processors when that is fewer (measured: docs/tasks/linux-test-runner/task.md section 5).
CONTAINER_DEFAULT_WORKERS: Final = 12
MAX_WORKERS: Final = 32
DEFAULT_STALL_SECONDS: Final = 600.0
# "load" over "loadfile": measured about 3 percent slower, but when a worker dies under
# "loadfile" the run hangs after the replacement worker starts (watchdog after 600 s), while
# under "load" the crash is reported at once (docs/tasks/faster-check/task.md).
DIST_MODE: Final = "load"
# The counts line the step prints, in this order (its format predates the two passes).
COUNT_FIELDS: Final = (
    "collected",
    "finished",
    "passed",
    "failed",
    "errors",
    "skipped",
    "xfailed",
    "xpassed",
    "deselected",
    "removed",
    "collection_errors",
    "exitstatus",
)


@dataclass(frozen=True, slots=True)
class Outcomes:
    collected: int = 0
    finished: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    skipped: int = 0
    xfailed: int = 0
    xpassed: int = 0
    deselected: int = 0
    removed: int = 0
    collection_errors: int = 0
    exitstatus: int = 0
    # Not part of the printed counts line.
    worker_crashes: int = 0
    workers_started: int = 0
    distributed: int = 0
    collected_ids: tuple[str, ...] = ()
    deselected_ids: tuple[str, ...] = ()
    finished_ids: tuple[str, ...] = ()

    @classmethod
    def read(cls, path: Path) -> Outcomes:
        data = json.loads(path.read_text(encoding="utf-8"))
        values: dict[str, Any] = {}
        for field in fields(cls):
            if field.name.endswith("_ids"):
                values[field.name] = tuple(str(item) for item in data.get(field.name, ()))
            elif field.name in COUNT_FIELDS:
                values[field.name] = int(data[field.name])
            else:
                values[field.name] = int(data.get(field.name, 0))
        return cls(**values)


def judge_tests(outcomes: Outcomes, pytest_exit: int, *, allowed_deselected: int = 0) -> list[str]:
    """Reasons one pytest pass failed; empty means it passed.

    ``allowed_deselected`` is the number of tests the pass is expected to leave to the other
    pass (``-m`` selection); the split itself is judged by ``judge_split``.
    """
    problems: list[str] = []
    if pytest_exit != 0:
        problems.append(f"pytest exited with status {pytest_exit}")
    if outcomes.collected == 0:
        problems.append("no tests were collected")
    if outcomes.collection_errors:
        problems.append(f"{outcomes.collection_errors} collection error(s)")
    if outcomes.deselected != allowed_deselected:
        problems.append(f"{outcomes.deselected} test(s) deselected")
    if outcomes.removed:
        problems.append(f"{outcomes.removed} test(s) removed during collection without notice")
    if outcomes.finished < outcomes.collected:
        problems.append(f"{outcomes.collected - outcomes.finished} collected test(s) did not run")
    if len(set(outcomes.collected_ids)) != len(outcomes.collected_ids):
        problems.append("a test was collected more than once")
    if outcomes.collected_ids:
        unfinished = set(outcomes.collected_ids) - set(outcomes.finished_ids)
        stray = set(outcomes.finished_ids) - set(outcomes.collected_ids)
        if unfinished:
            problems.append(
                f"{len(unfinished)} collected test(s) have no result, e.g. {min(unfinished)}"
            )
        if stray:
            problems.append(f"{len(stray)} result(s) for tests that were not collected")
    if outcomes.worker_crashes:
        problems.append(f"{outcomes.worker_crashes} pytest-xdist worker(s) crashed")
    for name in ("skipped", "xfailed", "xpassed"):
        count = getattr(outcomes, name)
        if count:
            problems.append(f"{count} test(s) {name}; the check allows none")
    if outcomes.failed or outcomes.errors:
        problems.append(f"{outcomes.failed} failure(s) and {outcomes.errors} error(s)")
    return problems


def judge_split(first: Outcomes, second: Outcomes) -> list[str]:
    """The two passes must run every test exactly once between them.

    ``second`` is the single-process serial pass (``-m serial``): it collects the whole suite
    and reports the tests it left out, so ``first`` (``-m "not serial"``) must have collected
    exactly those, and nothing that ``second`` ran.
    """
    problems: list[str] = []
    ran_first, ran_second = set(first.collected_ids), set(second.collected_ids)
    left_out = set(second.deselected_ids)
    if len(left_out) != len(second.deselected_ids):
        problems.append("the serial pass left the same test out twice")
    if both := ran_first & ran_second:
        problems.append(f"{len(both)} test(s) run in both passes, e.g. {min(both)}")
    if only_first := ran_first - left_out:
        problems.append(
            f"{len(only_first)} test(s) ran in the parallel pass only and are not in the "
            f"single-process collection, e.g. {min(only_first)}"
        )
    if lost := left_out - ran_first:
        problems.append(f"{len(lost)} test(s) ran in neither pass, e.g. {min(lost)}")
    if not first.distributed and len(first.deselected_ids) != len(second.collected_ids):
        # Counted, not compared by id: a test whose parameter ids are random (the one marked
        # serial for that reason) has different ids in different processes.
        problems.append(
            "the first pass left out a different number of tests than the serial pass ran"
        )
    return problems


def judge_workers(outcomes: Outcomes, statuses: Mapping[str, int]) -> list[str]:
    """Judge the workers' own final exit statuses (``statuses`` maps worker id to status).

    A failure after a worker has reported that it is finished never reaches the controller as
    a test report; it shows only in the worker's final status. A status of 1 is the ordinary
    "some test failed" and is explained by the failures the controller counted.
    """
    if not outcomes.distributed:
        return []
    problems: list[str] = []
    expected = outcomes.workers_started - outcomes.worker_crashes
    if len(statuses) != expected:
        problems.append(
            f"{len(statuses)} worker(s) reported a final status, expected {expected} "
            f"({outcomes.workers_started} started, {outcomes.worker_crashes} crashed)"
        )
    explained = outcomes.failed + outcomes.errors > 0
    for worker, status in sorted(statuses.items()):
        if status == 0 or (status == 1 and explained):
            continue
        problems.append(f"worker {worker} ended with exit status {status} that no test explains")
    return problems


def combine(first: Outcomes, second: Outcomes) -> Outcomes:
    """Totals across both passes. Tests one pass left to the other are not 'deselected': the
    split is judged separately, so a deselection nobody accounts for still shows."""
    expected = len(second.collected_ids) if not first.distributed else 0
    unexplained = max(0, first.deselected - expected) + max(
        0, second.deselected - len(first.collected_ids)
    )
    sums = {
        name: getattr(first, name) + getattr(second, name)
        for name in COUNT_FIELDS
        if name not in ("deselected", "exitstatus")
    }
    return Outcomes(
        **sums,
        deselected=unexplained,
        exitstatus=max(first.exitstatus, second.exitstatus),
        worker_crashes=first.worker_crashes + second.worker_crashes,
    )


def controlled_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    """The environment for every check step: inherited Python, pytest and Django variables
    removed; the clinic's own CLINIC_* configuration and the system's variables kept."""
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.upper().startswith(_DROPPED_PREFIXES) and key.upper() not in _DROPPED_GIT
    }
    env |= {
        "PYTHONPATH": str(REPO_ROOT / "src"),
        "PYTHONNOUSERSITE": "1",
        "DJANGO_SETTINGS_MODULE": "clinic.settings.test",
        "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1",
    }
    return env | (extra or {})


def _run(label: str, args: list[str], extra: dict[str, str] | None = None) -> int:
    print(f"\n== {label}: {' '.join(args)}", flush=True)
    started = time.monotonic()
    result = subprocess.run(args, cwd=REPO_ROOT, env=controlled_env(extra), check=False)
    print(
        f"== {label}: {'passed' if result.returncode == 0 else 'FAILED'} (exit {result.returncode})"
    )
    print(f"   elapsed {time.monotonic() - started:.1f}s")
    return result.returncode


def check_database(aliases: tuple[str, ...] = ("default", "migrator")) -> list[str]:
    """Both roles connect to PostgreSQL 17 and are distinct, non-superuser roles.

    Runs inside the child process started with PROBE_FLAG; every failure, including Django
    setup, becomes a reported problem.
    """
    problems: list[str] = []
    try:
        import django
        from django.db import connections

        django.setup()
    except Exception as error:
        return [f"Django setup failed ({type(error).__name__}: {error})"]
    seen: dict[str, str] = {}
    for alias in aliases:
        try:
            with connections[alias].cursor() as cursor:
                cursor.execute("SHOW server_version_num")
                version = int(cursor.fetchone()[0])
                cursor.execute(
                    "SELECT current_user, rolsuper FROM pg_roles WHERE rolname = current_user"
                )
                user, superuser = cursor.fetchone()
        except Exception as error:
            problems.append(
                f"{alias}: cannot connect to PostgreSQL ({type(error).__name__}: {error})"
            )
            continue
        finally:
            # An unknown alias must not hide the failure reported above.
            with contextlib.suppress(Exception):
                connections[alias].close()
        if version // 10000 != REQUIRED_POSTGRES_MAJOR:
            problems.append(
                f"{alias}: server is PostgreSQL {version}, expected major {REQUIRED_POSTGRES_MAJOR}"
            )
        if superuser:
            problems.append(f"{alias}: role {user} is a superuser")
        seen[alias] = user
    if len(set(seen.values())) < len(seen):
        problems.append("runtime and migrator aliases connect as the same role")
    return problems


def _database_step(python: str) -> bool:
    print("\n== database: PostgreSQL 17 with separate runtime and migrator roles", flush=True)
    result = subprocess.run(
        [python, str(REPO_ROOT / "scripts" / "check.py"), PROBE_FLAG],
        cwd=REPO_ROOT,
        env=controlled_env(),
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        problems = [str(item) for item in json.loads(result.stdout.strip().splitlines()[-1])]
    except (IndexError, ValueError):
        problems = [
            f"database probe produced no result (exit {result.returncode}): {result.stderr[-500:]}"
        ]
    if result.returncode != 0 and not problems:
        problems = [f"database probe exited with status {result.returncode}"]
    for problem in problems:
        print(f"   {problem}")
    print(f"== database: {'passed' if not problems else 'FAILED'}")
    return not problems


class CheckConfigError(Exception):
    """A CLINIC_CHECK_* variable that is set to something unusable."""


def default_workers(logical_processors: int | None = None) -> int:
    """6, or half the logical processors when that is fewer (never below 1)."""
    cpus = logical_processors if logical_processors is not None else (os.cpu_count() or 2)
    return max(1, min(DEFAULT_WORKERS, cpus // 2))


def container_default_workers(logical_processors: int | None = None) -> int:
    """12, or half the logical processors when that is fewer (never below 1)."""
    cpus = logical_processors if logical_processors is not None else (os.cpu_count() or 2)
    return max(1, min(CONTAINER_DEFAULT_WORKERS, cpus // 2))


def read_lock_wait(environ: Mapping[str, str] | None = None) -> float:
    """How long the test step may wait for the machine-wide lock before it fails."""
    raw = (os.environ if environ is None else environ).get(LOCK_WAIT_ENV, "").strip()
    if not raw:
        return DEFAULT_LOCK_WAIT_SECONDS
    try:
        value = float(raw)
    except ValueError:
        value = -1.0
    if not 0 <= value <= 86400:
        raise CheckConfigError(f"{LOCK_WAIT_ENV} must be a number of seconds from 0 to 86400")
    return value


def locked_test_step(
    step: Callable[[], bool],
    *,
    environ: Mapping[str, str] | None = None,
    lock_directory: Path | None = None,
    worktree: Path | None = None,
    free_memory: Callable[[], float | None] | None = None,
) -> tuple[bool, str]:
    """Run ``step`` (the tests) while holding the checkout's own lock and a machine-wide slot;
    return its result and the one-line note for the summary.

    The checkout's own lock (a check of one checkout at a time: two would share, and could drop,
    each other's test databases) is taken before a slot, also with CLINIC_CHECK_NO_LOCK; only if
    the git directory that holds it cannot be found, and the opt-out is set, is it not taken, and
    the note says so. The machine-wide slots are skipped with CLINIC_CHECK_NO_LOCK, and the note
    says so. When a lock cannot be had (the checkout is already being checked, the wait runs out,
    git or the lock file is unusable) the step fails with a message and is not run.
    The second slot is offered only while SECOND_SLOT_FREE_GB of physical memory is available;
    the note says which rule applied and the free memory seen. ``lock_directory``, ``worktree``
    and ``free_memory`` (the reading) are for tests; the locks otherwise live in the
    repository's common git directory."""
    env = os.environ if environ is None else environ
    tree = worktree if worktree is not None else REPO_ROOT
    skip = bool(env.get(NO_LOCK_ENV, "").strip())
    print("\n== test lock: taking the checkout lock and a machine-wide slot", flush=True)
    try:
        directory = lock_directory if lock_directory is not None else lock_dir(tree)
    except LockUnavailable as error:
        if not skip:
            print(f"   {error}; the test step was not run", flush=True)
            return False, "machine-wide test lock NOT obtained: the test step did not run"
        directory = None  # opted out of the machine-wide lock, and the git directory is unknown
    checkout = CheckoutLock(tree, directory) if directory is not None else None
    try:
        if checkout is not None:
            checkout.acquire()
    except CheckoutBusy as error:
        print(f"   {error}; the test step was not run", flush=True)
        return False, "this checkout is already being checked: the test step did not run"
    except LockUnavailable as error:
        print(f"   {error}; the test step was not run", flush=True)
        return False, "machine-wide test lock NOT obtained: the test step did not run"
    try:
        return _run_under_slot(
            step, env, tree, directory, skip, taken=checkout is not None, free_memory=free_memory
        )
    finally:
        if checkout is not None:
            checkout.release()


def _run_under_slot(
    step: Callable[[], bool],
    env: Mapping[str, str],
    tree: Path,
    directory: Path | None,
    skip: bool,
    *,
    taken: bool,
    free_memory: Callable[[], float | None] | None = None,
) -> tuple[bool, str]:
    """The part of ``locked_test_step`` that runs inside the checkout's own lock."""
    if skip:
        message = f"machine-wide test lock SKIPPED ({NO_LOCK_ENV} is set)"
        if not taken:
            message += "; the checkout lock was NOT taken either (no git directory found)"
        print(f"   {message}", flush=True)
        return step(), message
    if directory is None:  # cannot happen: without a directory only the opt-out gets here
        return False, "machine-wide test lock NOT obtained: the test step did not run"
    lock = MachineLock(
        tree,
        wait_seconds=read_lock_wait(env),
        directory=directory,
        slots=TEST_SLOTS,
        second_slot_free_gb=SECOND_SLOT_FREE_GB,
        free_memory=free_memory or free_memory_gb,
    )
    try:
        lock.acquire()
    except (LockTimeout, LockUnavailable) as error:
        print(f"   {error}; the test step was not run", flush=True)
        return False, "machine-wide test lock NOT obtained: the test step did not run"
    where = slot_file(directory, lock.slot)
    slot = f"slot {lock.slot + 1} of {TEST_SLOTS}"
    try:
        print(
            f"   lock {where} ({slot}) taken after waiting {lock.waited:.0f} s; "
            f"memory rule: {lock.rule}",
            flush=True,
        )
        ok = step()
        return ok, (
            f"machine-wide test lock held for the test step: {slot} (the lock lets up to "
            f"{TEST_SLOTS} checks of this repository run their tests at once, the second only "
            f"with {SECOND_SLOT_FREE_GB:g} GiB of memory available), waited "
            f"{lock.waited:.0f} s, memory rule: {lock.rule}, lock file {where}; this checkout "
            "was checked by this process alone"
        )
    finally:
        lock.release()


def read_workers(environ: Mapping[str, str] | None = None) -> int:
    """The parallel pass's worker count: CLINIC_CHECK_WORKERS, default 6, 0 for one process."""
    raw = (os.environ if environ is None else environ).get(WORKERS_ENV, "").strip()
    if not raw:
        return default_workers()
    if not (raw.isascii() and raw.isdigit()) or int(raw) > MAX_WORKERS:
        raise CheckConfigError(f"{WORKERS_ENV} must be a whole number from 0 to {MAX_WORKERS}")
    return int(raw)


def read_stall_seconds(environ: Mapping[str, str] | None = None) -> float:
    """How long a pass may record no test progress before it is declared hung."""
    raw = (os.environ if environ is None else environ).get(STALL_ENV, "").strip()
    if not raw:
        return DEFAULT_STALL_SECONDS
    try:
        value = float(raw)
    except ValueError:
        value = 0.0
    if not 1 <= value <= 86400:
        raise CheckConfigError(f"{STALL_ENV} must be a number of seconds from 1 to 86400")
    return value


def _kill_tree(process: subprocess.Popen[bytes]) -> None:
    """Stop a hung pytest and every worker it started."""
    terminate(process)  # the whole job at once (Windows)
    if sys.platform == "win32":
        taskkill = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "taskkill.exe"
        subprocess.run(
            [str(taskkill), "/PID", str(process.pid), "/T", "/F"], capture_output=True, check=False
        )
    with contextlib.suppress(Exception):
        process.kill()


def _wait_for_progress(process: subprocess.Popen[bytes], heartbeat: Path, stall: float) -> bool:
    """Wait for ``process``; True if it was killed because no test made progress for ``stall``
    seconds (the plugin touches ``heartbeat`` on every collection and test event)."""
    while True:
        if wait_unreaped(process, 1.0):
            return False
        try:
            idle = time.time() - heartbeat.stat().st_mtime
        except OSError:
            idle = 0.0
        if idle > stall:
            _kill_tree(process)
            process.wait()
            reaped(process)
            return True


def _read_worker_statuses(record: Path) -> dict[str, int]:
    """The final exit status each xdist worker wrote (``<record>.<worker id>``)."""
    statuses: dict[str, int] = {}
    for path in sorted(record.parent.glob(f"{record.name}.*")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            statuses[str(data["worker"])] = int(data["exitstatus"])
        except (OSError, ValueError, KeyError, TypeError):
            statuses[path.suffix.lstrip(".") or path.name] = -1
    return statuses


@dataclass(frozen=True, slots=True)
class PassResult:
    """What one pytest pass left: outcomes (None if it wrote none), its exit status, the
    problems found while running it, each xdist worker's final status and the number of
    database connections it had to retry."""

    outcomes: Outcomes | None
    exit_code: int
    problems: tuple[str, ...] = ()
    worker_statuses: Mapping[str, int] | None = None
    retries: int = 0


def _read_outcomes(record: Path) -> tuple[Outcomes | None, str]:
    """The pass's outcome record, or why there is none ("missing" or "unreadable")."""
    if not record.is_file():
        return None, "missing"
    try:
        return Outcomes.read(record), ""
    except (ValueError, KeyError, TypeError) as error:
        return None, f"unreadable ({error!r})"


def _statuses_when_complete(
    record: Path, outcomes: Outcomes, patience: float = 10.0
) -> dict[str, int] | None:
    """The workers' final statuses, waiting up to ``patience`` seconds for every worker that was
    started and did not crash to have written its file (``None`` for a one-process pass)."""
    if not outcomes.distributed:
        return None
    expected = outcomes.workers_started - outcomes.worker_crashes
    deadline = time.monotonic() + patience
    while True:
        statuses = _read_worker_statuses(record)
        if len(statuses) >= expected or time.monotonic() >= deadline:
            return statuses
        time.sleep(0.1)


def _pytest_pass(
    label: str, python: str, selection: list[str], workers: int, tmp: Path, stall: float
) -> PassResult:
    """Run one pytest pass; the pytest process tree is killed on every way out of the wait."""
    record, heartbeat = tmp / f"{label}-outcomes.json", tmp / f"{label}-heartbeat"
    args = [
        python, "-m", "pytest",
        "-p", "no:cacheprovider",
        "-p", "pytest_django.plugin",
        "-p", "clinic.devtools.pytest_outcomes",
        # An explicit base temporary directory avoids the "current" symlink pytest otherwise
        # makes: on the S00 Windows machine that one os.symlink call took about 32 seconds, and
        # pytest-xdist's controller makes it before any worker starts (profiled 6 November 2026).
        "--basetemp", str(tmp / f"basetemp-{label}"),
        *selection,
    ]  # fmt: skip
    if workers:
        args += ["-p", "xdist.plugin", "-n", str(workers), "--dist", DIST_MODE]
    print(f"\n== pytest {label}: {' '.join(args)}", flush=True)
    heartbeat.write_text(str(time.time()), encoding="utf-8")
    retry_log = tmp / f"{label}-connect-retries"
    env = controlled_env(
        {OUTPUT_ENV: str(record), HEARTBEAT_ENV: str(heartbeat), RETRY_LOG_ENV: str(retry_log)}
    )
    started = time.monotonic()
    try:
        process = start_guarded(args, cwd=REPO_ROOT, env=env)
    except OSError as error:
        # For example a harness job that refuses nesting. Nothing was left running: a child that
        # was created suspended is killed before it runs (process_guard).
        message = f"{label} pass: pytest could not be started under the process guard ({error})"
        print(f"   {message}", flush=True)
        return PassResult(None, -1, (message,))
    try:
        stalled = _wait_for_progress(process, heartbeat, stall)
        outcomes, read_problem = (None, "") if stalled else _read_outcomes(record)
        # The workers write their final status as they leave, a moment after the controller may
        # have exited: read the files before anything is terminated (FS-04).
        statuses = _statuses_when_complete(record, outcomes) if outcomes else None
    except BaseException:
        # Ctrl-C, a termination signal turned into an exception, anything: leave nothing running.
        _kill_tree(process)
        process.wait()
        reaped(process)
        raise
    finally:
        # Whatever is left of this pass dies now, its job is released, and only then is the
        # child reaped (POSIX: its process group is still known to be ours until then).
        terminate(process)
    process.wait()
    reaped(process)
    exit_code = int(process.returncode)
    print(f"== pytest {label}: exit {exit_code}, {time.monotonic() - started:.1f}s", flush=True)
    retries = 0
    if retry_log.is_file():
        retries = len(retry_log.read_text(encoding="utf-8").splitlines())
    if retries:
        print(f"   {label} pass: {retries} connection(s) retried after a socket-buffer refusal")
    problems: list[str] = []
    if stalled:
        problems.append(
            f"{label} pass: no test made progress for {stall:.0f}s (a hung test, a worker, or one "
            "test longer than that limit); pytest and its workers were killed"
        )
    if read_problem.startswith("unreadable"):
        problems.append(f"{label} pass: the outcome record is {read_problem}")
    elif read_problem == "missing":
        problems.append(f"{label} pass: pytest wrote no outcome record (exit {exit_code})")
    return PassResult(outcomes, exit_code, tuple(problems), statuses, retries)


def _pytest_step(
    python: str,
    workers: int,
    stall: float,
    run_pass: Callable[..., PassResult] = _pytest_pass,
) -> bool:
    """Both passes, then the split proof and the totals (one counts line, as before).

    ``run_pass`` is replaceable only so tests can feed the step outcomes it should reject."""
    mode = f"{workers} workers, one database each" if workers else "one process"
    print(f"\n== pytest: parallel pass ({mode}), then serial pass (one process)", flush=True)
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="clinic-check-", ignore_cleanup_errors=True) as name:
        tmp = Path(name)
        first = run_pass("parallel", python, ["-m", "not serial"], workers, tmp, stall)
        second = run_pass("serial", python, ["-m", "serial"], 0, tmp, stall)
    problems = list(first.problems) + list(second.problems)
    if second.retries:
        problems.append(
            f"serial pass: {second.retries} database connection(s) had to be retried after a "
            "socket-buffer refusal; a retry could be mistaken for a blocked call in a race test"
        )
    if first.outcomes is not None and second.outcomes is not None:
        one, two = first.outcomes, second.outcomes
        allowed_first = 0 if one.distributed else two.collected
        problems += [
            f"parallel pass: {item}"
            for item in judge_tests(one, first.exit_code, allowed_deselected=allowed_first)
        ]
        problems += [
            f"serial pass: {item}"
            for item in judge_tests(two, second.exit_code, allowed_deselected=one.collected)
        ]
        for label, result in (("parallel", first), ("serial", second)):
            if result.outcomes is not None and result.worker_statuses is not None:
                problems += [
                    f"{label} pass: {item}"
                    for item in judge_workers(result.outcomes, result.worker_statuses)
                ]
        problems += judge_split(one, two)
        total = combine(one, two)
        if total.deselected:
            problems.append(f"total: {total.deselected} test(s) deselected without explanation")
        print(
            f"   [parallel] tests={one.collected} workers={workers}"
            f"   [serial] tests={two.collected}"
        )
        print("   " + " ".join(f"{name}={getattr(total, name)}" for name in COUNT_FIELDS))
    for problem in problems:
        print(f"   {problem}")
    print(f"== pytest: {'passed' if not problems else 'FAILED'}")
    print(f"   elapsed {time.monotonic() - started:.1f}s")
    return not problems


def install_exit_signals() -> None:
    """Turn SIGTERM, SIGHUP and Ctrl-Break into an exception, so that the ``except BaseException``
    around the wait kills pytest and its workers and the lock is released in an orderly way."""

    def leave(signum: int, frame: object) -> None:
        raise SystemExit(128 + signum)

    for name in ("SIGTERM", "SIGHUP", "SIGBREAK"):
        number = getattr(signal, name, None)
        if number is not None:
            with contextlib.suppress(ValueError, OSError):  # not the main thread, or unsupported
                signal.signal(number, leave)


def read_mode(environ: Mapping[str, str] | None = None) -> str:
    """``native`` (the default: every step on this machine) or ``container`` (every step in the
    Linux test container, see ``clinic.devtools.container_mode``)."""
    raw = (os.environ if environ is None else environ).get(container_mode.MODE_ENV, "").strip()
    if not raw:
        return "native"
    if raw not in container_mode.MODES:
        raise CheckConfigError(
            f"{container_mode.MODE_ENV} must be one of {', '.join(container_mode.MODES)}, "
            f"not {raw!r}"
        )
    return raw


def run_steps(python: str, run_tests: Callable[[], bool]) -> list[bool]:
    """The seven steps in order; ``run_tests`` is the test step (locked, or in the container)."""
    return [
        _run("ruff lint", [python, "-m", "ruff", "check", "."]) == 0,
        _run("ruff format", [python, "-m", "ruff", "format", "--check", "."]) == 0,
        _run("mypy", [python, "-m", "mypy"]) == 0,
        _run("django system checks", [python, "manage.py", "check", "--fail-level", "WARNING"])
        == 0,
        _run("migrations complete", [python, "manage.py", "makemigrations", "--check", "--dry-run"])
        == 0,
        _database_step(python),
        run_tests(),
    ]


def run_inside_container(workers: int, stall: float) -> int:
    """The driver the test container runs: all seven steps on Linux, no lock (the host holds it).
    docker/tests/bootstrap.py starts it and kills it when the host's input closes. It ends with a
    result line for the host."""
    if os.environ.get(container_mode.INSIDE_ENV) != "1":
        print(
            f"check.py {INSIDE_FLAG} is started by docker/tests/bootstrap.py inside the test "
            f"container; {container_mode.INSIDE_ENV} is not set",
            file=sys.stderr,
        )
        return 2
    install_exit_signals()
    started = time.monotonic()
    print(
        f"\n== container: Linux {platform.release()} ({platform.machine()}), Python "
        f"{platform.python_version()}, {os.cpu_count()} logical processors visible, "
        f"{workers} workers, user uid {getattr(os, 'getuid', lambda: -1)()}, "
        f"working tree {REPO_ROOT}",
        flush=True,
    )
    steps_ok = run_steps(sys.executable, lambda: _pytest_step(sys.executable, workers, stall))
    print(f"\ntotal elapsed {time.monotonic() - started:.1f}s (inside the container)")
    print(f"{container_mode.RESULT_PREFIX}passed={sum(steps_ok)} total={len(steps_ok)}", flush=True)
    return 0 if all(steps_ok) else 1


def run_container_mode(workers: int, stall: float) -> int:
    """The host side of the container mode: preflight, lock, copy, run, report. The summary lines
    keep the native format; the notes before them say which mode ran and what it used."""
    started = time.monotonic()
    notes: list[str] = []

    def summary(ok: bool, passed: int, total: int) -> int:
        print(f"\ntotal elapsed {time.monotonic() - started:.1f}s")
        for note in notes:
            print(note)
        print(f"\nCHECK {'PASSED' if ok else 'FAILED'}: {passed}/{total} steps passed")
        return 0 if ok else 1

    print(
        "\n== mode: container (every step runs in a Linux container beside the database; "
        f"{container_mode.MODE_ENV}=container)",
        flush=True,
    )
    try:
        plan = container_mode.preflight(REPO_ROOT)
    except (container_mode.ContainerModeError, OSError, subprocess.SubprocessError) as error:
        print(f"   {error}", flush=True)
        notes.append("mode: container; the container mode could not start, nothing was run")
        return summary(False, 0, container_mode.STEP_COUNT)
    print(
        f"   image {plan.image}; database container {plan.db_container} (compose project "
        f"{plan.project}, reached as db:5432 on its network); test container "
        f"{plan.container_name}",
        flush=True,
    )
    outcome: list[container_mode.ContainerResult] = []

    def under_lock() -> bool:
        try:
            container_mode.ensure_image(plan)
            removed = container_mode.sweep(plan)
            if removed:
                print(f"   removed leftover test container(s): {', '.join(removed)}", flush=True)
            copying = time.monotonic()
            archive, scratch = container_mode.make_archive(REPO_ROOT)
            with scratch:
                print(
                    f"   copying {archive.files} files, {archive.bytes} bytes (tree sha256 "
                    f"{archive.tree_sha256[:16]}) into the container; archive built in "
                    f"{time.monotonic() - copying:.1f}s",
                    flush=True,
                )
                if archive.skipped:
                    print(
                        f"   left out {len(archive.skipped)} nested repositor(ies) or worktree(s), "
                        f"which are not part of this tree: {', '.join(archive.skipped[:5])}",
                        flush=True,
                    )
                result = container_mode.run_container(
                    plan, archive, container_mode.container_environment(workers)
                )
        except (container_mode.ContainerModeError, OSError, subprocess.SubprocessError) as error:
            print(f"   {error}", flush=True)
            return False
        outcome.append(result)
        if result.relay_failed:
            print(
                "   this process could not write the container's output (it was stopped at once, "
                "the container was removed)",
                flush=True,
            )
            return False
        if result.timed_out:
            print(
                f"   the container ran longer than {container_mode.read_container_seconds():.0f} s "
                f"and was removed ({container_mode.CONTAINER_SECONDS_ENV})",
                flush=True,
            )
            return False
        if not result.result_seen:
            print(
                f"   the container ended (exit {result.exit_code}) without reporting a result; "
                "see its output above",
                flush=True,
            )
            return False
        if result.steps_total != container_mode.STEP_COUNT:
            print(
                f"   the container reported {result.steps_total} steps, not "
                f"{container_mode.STEP_COUNT}",
                flush=True,
            )
            return False
        if result.exit_code != 0:
            print(f"   the container's exit status was {result.exit_code}", flush=True)
            return False
        return result.steps_passed == result.steps_total

    ok, lock_note = locked_test_step(under_lock)
    notes.append(
        f"mode: container, image {plan.image}, database {plan.db_container} (project "
        f"{plan.project}); the checks ran on Linux, not on this machine"
    )
    notes.append(lock_note)
    result = outcome[0] if outcome else None
    if (
        result is not None
        and result.result_seen
        and result.steps_total == container_mode.STEP_COUNT
    ):
        if ok or (result.steps_passed or 0) < result.steps_total:
            return summary(ok, result.steps_passed or 0, result.steps_total)
        # The container counted every step as passed but did not end cleanly: say so, count none.
        notes.append("the container's own count was 7/7 but it did not end cleanly (see above)")
    return summary(False, 0, container_mode.STEP_COUNT)


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args == [PROBE_FLAG]:
        print(json.dumps(check_database()))
        return 0
    if args and args != [INSIDE_FLAG]:
        print("check.py takes no arguments", file=sys.stderr)
        return 2

    try:
        workers, stall = read_workers(), read_stall_seconds()
        read_lock_wait()
        mode = read_mode()
    except CheckConfigError as error:
        print(f"check.py: {error}", file=sys.stderr)
        return 2
    if args == [INSIDE_FLAG]:
        return run_inside_container(workers, stall)
    if os.environ.get(container_mode.INSIDE_ENV):
        print(
            f"check.py: {container_mode.INSIDE_ENV} marks the test container and must not be "
            "set in the shell that starts a check (it would change which test databases the "
            "tests use); unset it",
            file=sys.stderr,
        )
        return 2
    install_exit_signals()
    if mode == "container":
        try:
            container_mode.read_container_seconds()
        except container_mode.ContainerModeError as error:
            print(f"check.py: {error}", file=sys.stderr)
            return 2
        if not os.environ.get(WORKERS_ENV, "").strip():
            workers = container_default_workers(container_mode.docker_processors())
        return run_container_mode(workers, stall)
    python = sys.executable
    started = time.monotonic()
    notes: list[str] = ["mode: native (every step ran on this machine)"]

    def tests() -> bool:
        ok, note = locked_test_step(lambda: _pytest_step(python, workers, stall))
        notes.append(note)
        return ok

    steps_ok = run_steps(python, tests)
    passed = all(steps_ok)
    print(f"\ntotal elapsed {time.monotonic() - started:.1f}s")
    for note in notes:
        print(note)
    print(
        f"\nCHECK {'PASSED' if passed else 'FAILED'}: {sum(steps_ok)}/{len(steps_ok)} steps passed"
    )
    return 0 if passed else 1
