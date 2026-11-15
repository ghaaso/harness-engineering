"""Start the check's pytest so that it cannot outlive the check.

The machine-wide test lock is an operating-system file lock, so when the check process is killed
(a tool timeout, ``taskkill`` without ``/T``, closing the app) the system frees the lock while
pytest and its workers would run on and the next checkout would start beside them: the overload
the lock exists to prevent. This module makes the children die with the check.

- Windows: every child is put in a job object created with "kill on job close". The only handle
  to the job lives in this process, so when this process ends by any means the system closes it
  and terminates every process in the job, workers included. The child is created suspended and
  resumed after it joined the job, so it cannot start a worker first. If the assignment fails the
  child is killed and the error raised: the check never runs an unguarded pytest.
- POSIX: the child starts a new session (so a stalled pass can be killed as a group) and, on
  Linux, asks the kernel to send it SIGKILL when this process dies (``PR_SET_PDEATHSIG``, checked
  against a parent that died first). Only that direct child is covered: its xdist workers exit when
  their pipe closes (within a few seconds) but anything the workers started, such as a browser,
  is not killed; macOS has no parent-death signal. Not exercised on the owner's Windows PC.
"""

from __future__ import annotations

import contextlib
import functools
import os
import subprocess
import sys
import time
from typing import Any, Final

CREATE_SUSPENDED: Final = 0x00000004
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: Final = 0x00002000
JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: Final = 9
PR_SET_PDEATHSIG: Final = 1
SIGKILL: Final = 9

# One job per guarded process; each handle must stay open for as long as this process lives
# (closing it, which the system does when this process ends, kills the job's processes).
_jobs: dict[int, Any] = {}
# Children whose group has been signalled: it is signalled once, before the child is reaped.
_signalled: set[int] = set()


def _windows_job() -> Any:
    if sys.platform != "win32":  # also tells mypy that the rest is Windows-only code
        raise OSError("job objects exist on Windows only")
    import ctypes
    from ctypes import wintypes

    class BasicLimits(ctypes.Structure):
        _fields_ = (
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        )

    class IoCounters(ctypes.Structure):
        _fields_ = tuple((name, ctypes.c_uint64) for name in ("a", "b", "c", "d", "e", "f"))

    class ExtendedLimits(ctypes.Structure):
        _fields_ = (
            ("BasicLimitInformation", BasicLimits),
            ("IoInfo", IoCounters),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        )

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.CreateJobObjectW.argtypes = (wintypes.LPVOID, wintypes.LPCWSTR)
    kernel32.SetInformationJobObject.argtypes = (
        wintypes.HANDLE,
        ctypes.c_int,
        wintypes.LPVOID,
        wintypes.DWORD,
    )
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        raise ctypes.WinError(ctypes.get_last_error())
    limits = ExtendedLimits()
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not kernel32.SetInformationJobObject(
        job,
        JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
        ctypes.byref(limits),
        ctypes.sizeof(limits),
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    return job


def _start_on_windows(args: list[str], **kwargs: Any) -> subprocess.Popen[bytes]:
    if sys.platform != "win32":
        raise OSError("job objects exist on Windows only")
    import ctypes
    from ctypes import wintypes

    job = _windows_job()
    flags = kwargs.pop("creationflags", 0) | CREATE_SUSPENDED
    process = subprocess.Popen(args, creationflags=flags, **kwargs)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.AssignProcessToJobObject.argtypes = (wintypes.HANDLE, wintypes.HANDLE)
    handle = wintypes.HANDLE(int(process._handle))  # type: ignore[attr-defined,unused-ignore]
    try:
        if not kernel32.AssignProcessToJobObject(job, handle):
            raise ctypes.WinError(ctypes.get_last_error())
        ntdll = ctypes.WinDLL("ntdll")
        ntdll.NtResumeProcess.argtypes = (wintypes.HANDLE,)
        if ntdll.NtResumeProcess(handle) != 0:
            raise OSError("could not resume the guarded process")
    except BaseException:
        # The child is still suspended here (it has not run one instruction): killing it leaves
        # nothing behind. The job is closed too.
        process.kill()
        process.wait()
        kernel32.CloseHandle.argtypes = (wintypes.HANDLE,)
        kernel32.CloseHandle(job)
        raise
    _jobs[process.pid] = job
    return process


def wait_unreaped(process: subprocess.Popen[bytes], timeout: float) -> bool:
    """Wait up to ``timeout`` seconds for ``process`` to end; True if it has.

    On POSIX the exit is observed without reaping the child (``waitid`` with ``WNOWAIT``), so its
    process id, which is also its process group id, cannot be reused before ``terminate`` signals
    the group; the caller reaps it with ``process.wait()`` afterwards. Windows: ``Popen.wait``."""
    if sys.platform != "win32" and hasattr(os, "waitid"):
        deadline = time.monotonic() + timeout
        while True:
            if os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT) is not None:
                return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(0.05)
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        return False
    return True


def terminate(process: subprocess.Popen[bytes]) -> None:
    """Kill what is left of a guarded child's tree and release its job, at once.

    Call it when a pass is over, finished or not: a leftover of the parallel pass must not live
    through the serial pass. Windows: terminate and close the job. POSIX: kill the process group,
    which is only known to be ours while the child has not been reaped (see ``wait_unreaped``)."""
    job = _jobs.pop(process.pid, None)
    if job is not None and sys.platform == "win32":
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.TerminateJobObject.argtypes = (wintypes.HANDLE, wintypes.UINT)
        kernel32.CloseHandle.argtypes = (wintypes.HANDLE,)
        kernel32.TerminateJobObject(job, 1)
        kernel32.CloseHandle(job)
    elif sys.platform != "win32" and process.pid not in _signalled and process.returncode is None:
        _signalled.add(process.pid)
        with contextlib.suppress(ProcessLookupError, PermissionError):
            os.killpg(process.pid, SIGKILL)


def reaped(process: subprocess.Popen[bytes]) -> None:
    """Forget that ``process``'s group was signalled: call it once the child has been reaped
    (``process.wait()``), when its process id may be given to another process, so a later child
    with the same id is signalled afresh and the set does not grow with every pass."""
    _signalled.discard(process.pid)


def _die_with_parent(parent: int) -> None:
    import ctypes

    if sys.platform != "win32":
        os.setsid()
        if sys.platform.startswith("linux"):
            libc = ctypes.CDLL(None, use_errno=True)
            libc.prctl(PR_SET_PDEATHSIG, SIGKILL, 0, 0, 0)
            if os.getppid() != parent:  # the parent died before the signal was armed
                os._exit(1)


def start_guarded(args: list[str], **kwargs: Any) -> subprocess.Popen[bytes]:
    """``subprocess.Popen(args, **kwargs)`` whose process tree dies when this process does."""
    if sys.platform == "win32":
        return _start_on_windows(args, **kwargs)
    return subprocess.Popen(
        args, preexec_fn=functools.partial(_die_with_parent, os.getpid()), **kwargs
    )
