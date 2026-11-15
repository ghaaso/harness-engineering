"""Atomic files and OS-released per-session locks (Windows and POSIX)."""
from __future__ import annotations

import contextlib
import json
import os
import re
import tempfile
import time
from pathlib import Path

ID_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,119}\Z")


def valid_id(value: str) -> str:
    if not isinstance(value, str) or not ID_RE.fullmatch(value):
        raise ValueError("A valid session/turn id is required")
    return value


def contained(path: Path, root: Path) -> Path:
    def canonical(value: Path) -> Path:
        name = str(value.resolve())
        # Windows can retain an extended prefix while another thread holds the file.
        # Both spellings identify the same volume; normalize before containment.
        if name.startswith("\\\\?\\UNC\\"):
            name = "\\\\" + name[8:]
        elif name.startswith("\\\\?\\"):
            name = name[4:]
        return Path(name)
    resolved = canonical(path)
    if not resolved.is_relative_to(canonical(root)):
        raise ValueError("Path escapes its declared root")
    return resolved


def read_json(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def write_json(path: Path, value, immutable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".commit-", dir=path.parent)
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        if immutable and path.exists():
            raise FileExistsError(path)
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


@contextlib.contextmanager
def locked(path: Path, timeout: float = 8):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a+b") as lock:
        lock.seek(0, os.SEEK_END)
        if lock.tell() == 0:
            lock.write(b"\0")
            lock.flush()
        deadline, acquired = time.monotonic() + timeout, False
        try:
            while not acquired:
                try:
                    lock.seek(0)
                    if os.name == "nt":
                        import msvcrt
                        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    acquired = True
                except OSError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError("Session lock timed out")
                    time.sleep(0.01)
            yield
        finally:
            if acquired:
                lock.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
