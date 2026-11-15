"""Entry point of the test image: receive the working tree on standard input, verify it, run it.

Standard library only, so it can be tested without the project's packages. The check's host side
(``clinic.devtools.container_mode``) writes to this process's standard input:

    CLINIC-TREE-1 <byte length>\\n
    <a tar archive of exactly that many bytes: every file of the working tree, then one last
     member, ``.clinic-tree-manifest.json``, listing each file's size, SHA-256 and mode>

and then leaves the input open. This process extracts the archive into the work directory,
compares what is on disk with the manifest (a missing, extra or different file, a different mode
bit, or a different tree hash stops the run with exit status 3), makes sure the installed
packages match ``uv.lock`` of the copied tree, and then replaces itself with the command (the
check's in-container driver by default).

Lifetime: this process is the supervisor of the command and the tie to the host. The command
(the check's in-container driver by default) runs as its child with /dev/null as its input; this
process keeps reading the host's input and, when it reaches end of file, which happens when the
host check ends by any means (the operating system closes the pipe), kills the command's whole
process group and exits with status 143, which also ends the container. A termination signal does
the same. Otherwise this process ends with the command's exit status.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import tarfile
import threading
from pathlib import Path
from typing import BinaryIO, Final

MAGIC: Final = b"CLINIC-TREE-1"
MANIFEST_NAME: Final = ".clinic-tree-manifest.json"
DEFAULT_WORK: Final = "/work/clinic"
INSIDE_ENV: Final = "CLINIC_CHECK_IN_CONTAINER"
EXIT_HOST_GONE: Final = 143
CHUNK: Final = 1 << 20
EXIT_BAD_TREE: Final = 3
EXIT_BAD_INPUT: Final = 4
EXIT_STALE_IMAGE: Final = 5


class Limited:
    """A read-only view of the first ``remaining`` bytes of a stream (the tar archive)."""

    def __init__(self, stream: BinaryIO, remaining: int) -> None:
        self.stream = stream
        self.remaining = remaining

    def read(self, size: int = -1) -> bytes:
        if self.remaining <= 0:
            return b""
        size = self.remaining if size is None or size < 0 else min(size, self.remaining)
        data = self.stream.read(size)
        self.remaining -= len(data)
        if not data:
            self.remaining = 0
        return data


def tree_hash(files: dict[str, list[object]]) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(f"{path}\0{files[path][1]}\n".encode())
    return digest.hexdigest()


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(CHUNK):
            digest.update(block)
    return digest.hexdigest()


def receive(stream: BinaryIO, work: Path) -> dict[str, list[object]]:
    """Extract the archive into ``work``; return the manifest's file table."""
    header = stream.readline(200)
    parts = header.split()
    if len(parts) != 2 or parts[0] != MAGIC or not parts[1].isdigit():
        raise SystemExit(f"bootstrap: no tree header on standard input (got {header[:60]!r})")
    length = int(parts[1])
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    manifest: dict[str, object] | None = None
    limited = Limited(stream, length)
    with tarfile.open(fileobj=limited, mode="r|") as archive:  # type: ignore[call-overload]
        for member in archive:
            if member.name == MANIFEST_NAME:
                handle = archive.extractfile(member)
                manifest = json.loads(handle.read()) if handle else None
                continue
            if not member.isreg():
                raise SystemExit(f"bootstrap: {member.name} is not a plain file")
            archive.extract(member, work, filter="data")
        # Drain the archive's padding so that the stream is positioned after it.
    while limited.read(CHUNK):
        pass
    if manifest is None:
        raise SystemExit("bootstrap: the archive has no manifest")
    files = manifest.get("files")
    if not isinstance(files, dict):
        raise SystemExit("bootstrap: the manifest has no file table")
    if manifest.get("tree_sha256") != tree_hash(files):
        raise SystemExit("bootstrap: the manifest does not match its own tree hash")
    return files


def verify(work: Path, files: dict[str, list[object]]) -> list[str]:
    """Differences between the extracted tree and the manifest; empty means identical."""
    problems: list[str] = []
    found: set[str] = set()
    for root, _dirs, names in os.walk(work):
        for name in names:
            path = Path(root, name)
            found.add(path.relative_to(work).as_posix())
    missing = set(files) - found
    extra = found - set(files)
    problems += [f"missing after the copy: {p}" for p in sorted(missing)[:20]]
    problems += [f"not in the manifest: {p}" for p in sorted(extra)[:20]]
    for relative in sorted(set(files) & found):
        size, digest, mode = files[relative]
        path = work / relative
        if path.stat().st_size != size:
            problems.append(f"size differs: {relative}")
        elif sha256_of(path) != digest:
            problems.append(f"content differs: {relative}")
        elif os.name == "posix" and (path.stat().st_mode & 0o111 != 0) != (
            int(str(mode)) & 0o111 != 0
        ):
            problems.append(f"executable bit differs: {relative}")
        if len(problems) >= 20:
            break
    return problems


def synced(work: Path) -> str | None:
    """None if the installed packages are exactly what the copied uv.lock locks, else why not."""
    done = subprocess.run(
        ["uv", "sync", "--locked", "--offline", "--check", "--no-install-project"],
        cwd=work,
        capture_output=True,
        text=True,
        check=False,
    )
    if done.returncode == 0:
        return None
    return (done.stdout + done.stderr).strip()[-600:] or f"uv sync --check exited {done.returncode}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="bootstrap.py")
    parser.add_argument("--work", default=DEFAULT_WORK)
    parser.add_argument("--no-sync-check", action="store_true")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    options = parser.parse_args(argv)
    work = Path(options.work)
    stream = sys.stdin.buffer
    try:
        files = receive(stream, work)
    except (tarfile.TarError, json.JSONDecodeError, OSError) as error:
        print(f"bootstrap: the working tree could not be received ({error!r})", flush=True)
        return EXIT_BAD_INPUT
    except SystemExit as error:
        print(error, flush=True)
        return EXIT_BAD_INPUT
    problems = verify(work, files)
    if problems:
        print("bootstrap: the copy is not equal to the working tree:", flush=True)
        for problem in problems:
            print(f"   {problem}", flush=True)
        return EXIT_BAD_TREE
    total = sum(int(str(entry[0])) for entry in files.values())
    print(
        f"copy verified: {len(files)} files, {total} bytes, tree sha256 "
        f"{tree_hash(files)} (every file compared by size and SHA-256 with the host's)",
        flush=True,
    )
    if not options.no_sync_check:
        why = synced(work)
        if why is not None:
            print(
                "bootstrap: the image is stale: its packages do not match uv.lock of this tree "
                f"(rebuild it with scripts/test_image.py build): {why}",
                flush=True,
            )
            return EXIT_STALE_IMAGE
        print("packages verified: the image matches uv.lock of this tree", flush=True)
    given = options.command[1:] if options.command[:1] == ["--"] else options.command
    command = given or [
        sys.executable,
        "scripts/check.py",
        "--inside-container",
    ]
    os.chdir(work)
    os.environ[INSIDE_ENV] = "1"
    return supervise(command, stream)


def kill_tree(child: subprocess.Popen[bytes]) -> None:
    """Kill the command and everything it started (its own process group on Linux)."""
    if os.name == "posix":
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass
    try:
        child.kill()
    except OSError:
        pass


def supervise(command: list[str], stream: BinaryIO) -> int:
    """Run ``command``; stop it, and exit with 143, when the host's input reaches end of file."""
    child = subprocess.Popen(
        command, stdin=subprocess.DEVNULL, start_new_session=(os.name == "posix")
    )

    def host_gone(reason: str) -> None:
        kill_tree(child)
        try:
            print(f"bootstrap: {reason}: stopped the command and the container", flush=True)
        finally:
            os._exit(EXIT_HOST_GONE)

    def watch() -> None:
        fd = stream.fileno()
        while True:
            try:
                data = os.read(fd, 4096)
            except OSError:
                data = b""
            if not data:
                host_gone("the host check closed its input")

    threading.Thread(target=watch, name="host-input-watch", daemon=True).start()
    for name in ("SIGTERM", "SIGHUP", "SIGINT"):
        number = getattr(signal, name, None)
        if number is not None:
            signal.signal(number, lambda signum, frame: host_gone(f"signal {signum}"))
    return child.wait()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
