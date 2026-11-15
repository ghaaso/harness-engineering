"""The check's pytest cannot outlive the check: kill the parent with no clean-up, and the child
and its own child die with it (the lock is freed by the operating system the moment the check
dies, so a pytest left running would let the next checkout start beside it)."""

from __future__ import annotations

import contextlib
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

from clinic.devtools.check import controlled_env

PARENT = """
import sys, time
from pathlib import Path
from clinic.devtools.process_guard import start_guarded

root = Path(sys.argv[1])
start_guarded([sys.executable, str(root / "child.py"), str(root)])
(root / "parent.ready").write_text("1")
time.sleep(600)
"""

CHILD = """
import os, subprocess, sys, time
from pathlib import Path

root = Path(sys.argv[1])
grandchild = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(600)"])
(root / "grandchild.pid").write_text(str(grandchild.pid))
(root / "child.pid").write_text(str(os.getpid()))
time.sleep(600)
"""


def _alive(pid: int) -> bool:
    if sys.platform == "win32":
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        process_query_limited_information = 0x1000
        still_active = 259
        handle = kernel32.OpenProcess(process_query_limited_information, False, pid)
        if not handle:
            return False
        code = ctypes.c_ulong()
        kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        kernel32.CloseHandle(handle)
        return code.value == still_active
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _wait_for(path: Path, seconds: float = 30) -> None:
    deadline = time.monotonic() + seconds
    while not path.exists():
        assert time.monotonic() < deadline, f"{path.name} never appeared"
        time.sleep(0.05)


def test_children_die_with_a_parent_that_is_killed(scratch_dir: Path) -> None:
    (scratch_dir / "parent.py").write_text(PARENT, encoding="utf-8")
    (scratch_dir / "child.py").write_text(CHILD, encoding="utf-8")
    parent = subprocess.Popen(
        [sys.executable, str(scratch_dir / "parent.py"), str(scratch_dir)], env=controlled_env()
    )
    pids: list[int] = []
    try:
        for name in ("parent.ready", "child.pid", "grandchild.pid"):
            _wait_for(scratch_dir / name)
        time.sleep(0.2)
        pids = [int((scratch_dir / name).read_text()) for name in ("child.pid", "grandchild.pid")]
        assert all(_alive(pid) for pid in pids)
        # POSIX covers the direct child only (see process_guard): the grandchild is Windows-only
        watched = pids if sys.platform == "win32" else pids[:1]
        parent.kill()  # no clean-up of any kind
        parent.wait()
        deadline = time.monotonic() + 20
        while any(_alive(pid) for pid in watched):
            assert time.monotonic() < deadline, f"still running after the parent died: {watched}"
            time.sleep(0.1)
    finally:
        parent.kill()
        for name in ("child.pid", "grandchild.pid"):
            with contextlib.suppress(OSError, ValueError):
                os.kill(int((scratch_dir / name).read_text()), signal.SIGTERM)


def test_the_pass_starts_pytest_guarded_and_kills_it_when_the_wait_is_interrupted(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    from clinic.devtools import check, process_guard

    started: list[subprocess.Popen[bytes]] = []
    real = process_guard.start_guarded

    def sleeper(args: list[str], **kwargs: object) -> subprocess.Popen[bytes]:
        process = real([sys.executable, "-c", "import time; time.sleep(600)"], **kwargs)
        started.append(process)
        return process

    def interrupted(*_: object) -> bool:
        raise KeyboardInterrupt

    monkeypatch.setattr(check, "start_guarded", sleeper)
    monkeypatch.setattr(check, "_wait_for_progress", interrupted)
    try:
        with pytest.raises(KeyboardInterrupt):
            check._pytest_pass("t", sys.executable, [], 0, scratch_dir, 60.0)
        assert len(started) == 1  # pytest is started through start_guarded
        assert started[0].wait(15) is not None  # and was killed on the way out
    finally:
        for process in started:
            process.kill()


def test_termination_signals_become_an_exit_that_kills_the_children() -> None:
    from clinic.devtools.check import install_exit_signals

    names = [n for n in ("SIGTERM", "SIGHUP", "SIGBREAK") if hasattr(signal, n)]
    saved = {n: signal.getsignal(getattr(signal, n)) for n in names}
    try:
        install_exit_signals()
        for name in names:
            handler = signal.getsignal(getattr(signal, name))
            assert callable(handler) and handler is not saved[name]
            with pytest.raises(SystemExit):
                handler(getattr(signal, name), None)
    finally:
        for name, handler in saved.items():
            signal.signal(getattr(signal, name), handler)


LEFTOVER = """
import subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
grandchild = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(600)"])
(root / "leftover.pid").write_text(str(grandchild.pid))
"""


def test_a_leftover_of_a_finished_pass_is_killed_by_terminate(scratch_dir: Path) -> None:
    from clinic.devtools.process_guard import start_guarded, terminate, wait_unreaped

    (scratch_dir / "leftover.py").write_text(LEFTOVER, encoding="utf-8")
    process = start_guarded(
        [sys.executable, str(scratch_dir / "leftover.py"), str(scratch_dir)], env=controlled_env()
    )
    pid = 0
    try:
        # The pass is over; its helper process was left behind. As in the check, the exit is
        # observed without reaping the child (on POSIX terminate() signals the group only while
        # the child is unreaped), then terminate() runs, then the child is reaped.
        assert wait_unreaped(process, 30)
        _wait_for(scratch_dir / "leftover.pid")
        pid = int((scratch_dir / "leftover.pid").read_text())
        assert _alive(pid)
        terminate(process)
        process.wait()
        deadline = time.monotonic() + 20
        while _alive(pid):
            assert time.monotonic() < deadline, "the leftover survived terminate()"
            time.sleep(0.1)
    finally:
        process.kill()
        if pid:
            with contextlib.suppress(OSError):
                os.kill(pid, signal.SIGTERM)


def test_a_guard_that_cannot_start_pytest_fails_the_pass_with_a_message(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    from clinic.devtools import check

    def refuse(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
        raise OSError("a job that refuses nesting")

    monkeypatch.setattr(check, "start_guarded", refuse)
    result = check._pytest_pass("t", sys.executable, [], 0, scratch_dir, 60.0)
    assert result.outcomes is None and result.exit_code == -1
    assert "could not be started under the process guard" in result.problems[0]
    assert check._pytest_step(sys.executable, 0, 60.0) is False  # no traceback, a failed step
    assert "could not be started under the process guard" in capsys.readouterr().out


def test_a_child_suspended_when_the_job_assignment_fails_is_killed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    if sys.platform != "win32":
        return  # the suspended start and the job exist on Windows only
    import ctypes

    from clinic.devtools import process_guard

    created: list[subprocess.Popen[bytes]] = []
    real_popen = subprocess.Popen

    def recording(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
        process = real_popen(*args, **kwargs)  # type: ignore[call-overload,unused-ignore]
        created.append(process)
        return process  # type: ignore[no-any-return,unused-ignore]

    monkeypatch.setattr(process_guard, "_windows_job", lambda: ctypes.c_void_p(0xDEAD))
    monkeypatch.setattr(subprocess, "Popen", recording)
    with pytest.raises(OSError, match=r"."):
        process_guard.start_guarded([sys.executable, "-c", "import time; time.sleep(600)"])
    assert len(created) == 1
    assert created[0].poll() is not None  # killed while still suspended, nothing left behind


def test_waiting_for_a_process_does_not_reap_it_on_posix_and_times_out_everywhere() -> None:
    from clinic.devtools.process_guard import wait_unreaped

    sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(600)"])
    quick = subprocess.Popen([sys.executable, "-c", "pass"])
    try:
        assert wait_unreaped(sleeper, 0.3) is False  # still running after the timeout
        assert wait_unreaped(quick, 30) is True
        quick.wait(30)
        assert quick.returncode == 0  # reaped by the caller afterwards, with its status intact
    finally:
        sleeper.kill()
        sleeper.wait()
        quick.kill()


def test_the_signalled_entry_of_a_reaped_child_is_forgotten() -> None:
    from clinic.devtools import process_guard

    process = subprocess.Popen([sys.executable, "-c", "pass"], env=controlled_env())
    process.wait(30)
    process_guard._signalled.add(process.pid)  # as terminate() does on POSIX before the reap
    process_guard.reaped(process)
    assert process.pid not in process_guard._signalled  # its id may be reused by a later child
    process_guard.reaped(process)  # and forgetting twice is harmless
