"""The check's container mode, host side: run the checks in a Linux container beside PostgreSQL.

``CLINIC_CHECK_MODE=container uv run --locked python scripts/check.py`` does not run pytest on this
machine. It checks that Docker, the test image and the checkout's database container are there,
removes a leftover test container of this checkout, streams the working tree (tracked files and
untracked files that git does not ignore, exactly as they are on disk) into a new container of the
``tests`` service of ``compose.yaml``, and lets the container run the same seven steps through
``scripts/check.py --inside-container``. Nothing is mounted from this machine, so the tests read
and write a Linux filesystem; the database is reached over the compose network as ``db:5432``.

Why the tests cannot outlive the check: the tree travels over the container's standard input and
that input stays open; the container's entry point (docker/tests/bootstrap.py), which supervises
the checks, kills them and exits when it reaches end of file. The input closes when this process
ends by any means (the operating system closes the pipe), the
``docker`` client is started inside the process guard (it dies with this process on Windows), the
container is removed in a ``finally`` and a leftover container is removed at the next start.

Nothing here falls back to the native mode: every way of not getting a container is an error that
is reported and fails the check.
"""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Final

from clinic.devtools.checkout_tag import TAG_ENV, checkout_tag
from clinic.devtools.process_guard import start_guarded, terminate
from clinic.envfile import EnvFileError, parse_line

MODE_ENV: Final = "CLINIC_CHECK_MODE"
MODES: Final = ("native", "container")
IMAGE_REPOSITORY: Final = "clinic-tests"
# The files that make the image; its tag is a hash of their contents (and of uv.lock).
IMAGE_INPUTS: Final = (
    "docker/tests/Dockerfile",
    "docker/tests/Dockerfile.dockerignore",
    "docker/tests/uv-requirements.txt",
    "docker/tests/bootstrap.py",
    "uv.lock",
)
SERVICE: Final = "tests"
DB_SERVICE: Final = "db"
TEST_NETWORK: Final = "tests-internal"
CHECKOUT_LABEL: Final = "clinic.tests.checkout"
HOST_LABEL: Final = "clinic.tests.host-pid"
STEP_COUNT: Final = 7
MAGIC: Final = b"CLINIC-TREE-1"
MANIFEST_NAME: Final = ".clinic-tree-manifest.json"
RESULT_PREFIX: Final = "CLINIC-INNER-RESULT "
INSIDE_ENV: Final = "CLINIC_CHECK_IN_CONTAINER"
CONTAINER_SECONDS_ENV: Final = "CLINIC_CHECK_CONTAINER_SECONDS"
DEFAULT_CONTAINER_SECONDS: Final = 3600.0
_GIT_REDIRECTS: Final = frozenset({"GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"})
DOCKER_TIMEOUT: Final = 60


class ContainerModeError(Exception):
    """The container mode cannot run; the message says why and what to do."""


# ---------------------------------------------------------------- image


def install_relevant_pyproject(repo: Path) -> str:
    """The parts of ``pyproject.toml`` that decide what ``uv sync`` installs, as canonical JSON:
    the Python requirement, the dependencies, the dependency groups and ``[tool.uv]``. Tool
    settings (ruff, mypy, pytest) are not part of it, so editing them does not rebuild the image."""
    import tomllib

    try:
        data = tomllib.loads((repo / "pyproject.toml").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise ContainerModeError(
            f"cannot read pyproject.toml to name the test image ({error})"
        ) from None
    project = data.get("project", {})
    relevant = {
        "requires-python": project.get("requires-python"),
        "dependencies": project.get("dependencies"),
        "optional-dependencies": project.get("optional-dependencies"),
        "dependency-groups": data.get("dependency-groups"),
        "tool.uv": data.get("tool", {}).get("uv"),
    }
    return json.dumps(relevant, sort_keys=True, separators=(",", ":"))


def image_tag(repo: Path) -> str:
    """A hash of everything the image is made from: the Dockerfile and the files it copies,
    ``uv.lock`` and the install-relevant part of ``pyproject.toml`` (what ``uv sync`` reads)."""
    digest = hashlib.sha256()
    digest.update(b"pyproject\0" + install_relevant_pyproject(repo).encode() + b"\0")
    for name in IMAGE_INPUTS:
        try:
            data = (repo / name).read_bytes()
        except OSError as error:
            raise ContainerModeError(
                f"cannot read {name} to name the test image ({error})"
            ) from None
        digest.update(f"{name}\0{len(data)}\0".encode())
        digest.update(data)
    return digest.hexdigest()[:16]


def image_name(repo: Path) -> str:
    return f"{IMAGE_REPOSITORY}:{image_tag(repo)}"


BUILD_COMMAND: Final = "uv run --locked python scripts/test_image.py build"


# ---------------------------------------------------------------- docker


def docker_exe() -> str:
    found = shutil.which("docker")
    if found is None:
        raise ContainerModeError(
            "the docker command was not found, so the container mode cannot run "
            "(install Docker or use the native mode: unset CLINIC_CHECK_MODE)"
        )
    return found


def docker_run(
    *args: str, env: Mapping[str, str] | None = None, timeout: float = DOCKER_TIMEOUT
) -> subprocess.CompletedProcess[str]:
    """Run ``docker`` with ``args``; a failure to run it at all is a ContainerModeError."""
    try:
        return subprocess.run(
            [docker_exe(), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=timeout,
            env=None if env is None else dict(env),
        )
    except subprocess.TimeoutExpired:
        raise ContainerModeError(
            f"`docker {' '.join(args[:2])}` did not answer within {timeout:.0f} s "
            "(is the Docker daemon starting or stuck?)"
        ) from None
    except OSError as error:
        raise ContainerModeError(f"cannot run docker ({error})") from None


def read_env_value(repo: Path, name: str, environ: Mapping[str, str] | None = None) -> str | None:
    """``name`` from the environment, else from the checkout's untracked ``.env`` (not loaded)."""
    env = os.environ if environ is None else environ
    if env.get(name):
        return env[name]
    try:
        text = (repo / ".env").read_text(encoding="utf-8")
    except OSError:
        return None
    for number, line in enumerate(text.splitlines(), start=1):
        try:
            parsed = parse_line(line, number=number)
        except EnvFileError:
            continue
        if parsed is not None and parsed[0] == name:
            return parsed[1]
    return None


@dataclass(frozen=True, slots=True)
class Plan:
    """Where the container mode will run: the compose project of the database container that
    this checkout's ``.env`` points at, the image and the labels."""

    repo: Path
    project: str
    image: str
    tag: str
    db_container: str
    checkout: str
    container_name: str
    host_pid: int = 0

    def compose_base(self) -> list[str]:
        return [
            docker_exe(),
            "compose",
            "-p",
            self.project,
            "--project-directory",
            str(self.repo),
            "-f",
            str(self.repo / "compose.yaml"),
            "--profile",
            "tests",
        ]

    def compose_env(self, environ: Mapping[str, str]) -> dict[str, str]:
        env = dict(environ)
        env["CLINIC_TESTS_TAG"] = self.tag
        env["CLINIC_TESTS_CHECKOUT"] = self.checkout
        env["CLINIC_TESTS_HOST_PID"] = str(self.host_pid)
        env[TAG_ENV] = self.checkout
        for name in ("CLINIC_CHECK_WORKERS", "CLINIC_CHECK_STALL_SECONDS"):
            if not env.get(name):
                env.pop(name, None)
        return env


def find_database_container(
    repo: Path, environ: Mapping[str, str] | None = None
) -> tuple[str, str]:
    """(compose project, container name) of the running database that ``.env`` points at.

    The native check reaches the database through ``CLINIC_DB_PORT``; the container mode uses the
    same database, found as the compose ``db`` container that publishes that port.
    """
    port = read_env_value(repo, "CLINIC_DB_PORT", environ)
    if not port or not port.isdigit():
        raise ContainerModeError(
            "CLINIC_DB_PORT is not set in the environment or in .env, so the database container "
            "this checkout uses cannot be found"
        )
    done = docker_run(
        "ps",
        "--filter",
        f"publish={port}",
        "--filter",
        f"label=com.docker.compose.service={DB_SERVICE}",
        "--format",
        '{{.Names}}\t{{.Label "com.docker.compose.project"}}\t{{.Status}}',
    )
    if done.returncode != 0:
        raise ContainerModeError(f"docker ps failed: {(done.stderr or done.stdout).strip()}")
    rows = [line.split("\t") for line in done.stdout.splitlines() if line.strip()]
    if not rows:
        raise ContainerModeError(
            f"no running database container publishes port {port} (CLINIC_DB_PORT of this "
            "checkout): start it with `docker compose up -d --wait db` "
            "(development guide, section 3)"
        )
    if len(rows) > 1:
        raise ContainerModeError(
            f"more than one database container publishes port {port}: {[row[0] for row in rows]}"
        )
    name, project, status = (rows[0] + ["", "", ""])[:3]
    if not project:
        raise ContainerModeError(f"container {name} has no compose project label")
    if "(healthy)" not in status:
        raise ContainerModeError(
            f"database container {name} is not healthy ({status}); wait for "
            "`docker compose up -d --wait db`"
        )
    attached = docker_run(
        "inspect",
        "--format",
        "{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}",
        name,
    )
    if f"{project}_{TEST_NETWORK}" not in attached.stdout.split():
        raise ContainerModeError(
            f"database container {name} is not on the network {project}_{TEST_NETWORK}, which is "
            "the only network the test container joins (it has no route to the internet): "
            "recreate it with `docker compose up -d --wait db` (the data volume is kept)"
        )
    return project, name


def preflight(repo: Path, environ: Mapping[str, str] | None = None) -> Plan:
    """Everything the container mode needs, or a ContainerModeError that says what is missing."""
    env = dict(os.environ if environ is None else environ)
    docker_exe()
    version = docker_run("version", "--format", "{{.Server.Version}}")
    if version.returncode != 0 or not version.stdout.strip():
        raise ContainerModeError(
            "the Docker daemon is not reachable (start Docker Desktop and wait until `docker ps` "
            f"works): {(version.stderr or version.stdout).strip()[-300:]}"
        )
    tag = image_tag(repo)
    image = f"{IMAGE_REPOSITORY}:{tag}"
    found = docker_run("image", "inspect", "--format", "{{.Id}}", image)
    if found.returncode != 0:
        raise ContainerModeError(
            f"the test image {image} does not exist (uv.lock or docker/tests changed, or it was "
            f"never built here): build it with `{BUILD_COMMAND}`; the check never builds it itself"
        )
    project, db_container = find_database_container(repo, env)
    checkout = checkout_tag(repo)
    return Plan(
        repo=repo,
        project=project,
        image=image,
        tag=tag,
        db_container=db_container,
        checkout=checkout,
        container_name=f"clinic-tests-{checkout}-{os.getpid()}",
        host_pid=os.getpid(),
    )


def process_alive(pid: int) -> bool:
    """Whether a process with this id is running on this machine (a zombie is not running)."""
    if pid <= 0:
        return False
    if sys.platform == "win32":
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        handle = kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        kernel32.CloseHandle(handle)
        return code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    try:
        stat = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
        return stat.rsplit(")", 1)[1].split()[0] != "Z"
    except (OSError, IndexError):
        return True


def sweep(plan: Plan) -> list[str]:
    """Remove the leftover test containers of this checkout; returns their names.

    A leftover is a container whose host check is no longer running (its label names the host's
    process id). A container whose host is alive is refused, never killed: it can belong only to
    a check that bypassed the checkout lock (``locked_test_step`` takes it before the sweep runs,
    also with CLINIC_CHECK_NO_LOCK, so a second check of this checkout is refused there first);
    this is the second line of defence, for that case. A container with no readable host label
    is treated as a leftover.
    """
    done = docker_run(
        "ps",
        "-a",
        "--filter",
        f"label={CHECKOUT_LABEL}={plan.checkout}",
        "--format",
        '{{.Names}}\t{{.Label "' + HOST_LABEL + '"}}',
    )
    if done.returncode != 0:
        raise ContainerModeError(f"docker ps failed: {(done.stderr or done.stdout).strip()}")
    removed_names: list[str] = []
    for line in done.stdout.splitlines():
        if not line.strip():
            continue
        name, _, host = line.partition("\t")
        name, host = name.strip(), host.strip()
        if host.isdigit() and int(host) != plan.host_pid and process_alive(int(host)):
            raise ContainerModeError(
                f"another check of this checkout is running its tests (container {name}, host "
                f"process {host}); wait for it, or remove the container by hand if that process "
                f"is not a check (docker rm -f {name})"
            )
        removed = docker_run("rm", "-f", name)
        if removed.returncode != 0:
            raise ContainerModeError(
                f"cannot remove the leftover test container {name}: "
                f"{(removed.stderr or removed.stdout).strip()}"
            )
        removed_names.append(name)
    return removed_names


def ensure_image(plan: Plan) -> None:
    """The image is still there (the lock wait can be long); the check never builds one."""
    if docker_run("image", "inspect", "--format", "{{.Id}}", plan.image).returncode != 0:
        raise ContainerModeError(
            f"the test image {plan.image} disappeared while the check waited for the lock; "
            f"build it again with `{BUILD_COMMAND}`"
        )


# ---------------------------------------------------------------- the working tree


@dataclass(frozen=True, slots=True)
class TreeArchive:
    path: Path
    length: int
    files: int
    bytes: int
    tree_sha256: str
    skipped: tuple[str, ...] = ()


def _git(repo: Path, *args: str) -> bytes:
    git = shutil.which("git")
    if git is None:
        raise ContainerModeError("git was not found, so the working tree cannot be listed")
    done = subprocess.run(
        [git, "-C", str(repo), *args],
        capture_output=True,
        check=False,
        timeout=120,
        env={k: v for k, v in os.environ.items() if k.upper() not in _GIT_REDIRECTS},
    )
    if done.returncode != 0:
        raise ContainerModeError(
            f"git {' '.join(args[:2])} failed: {os.fsdecode(done.stderr).strip()}"
        )
    return done.stdout


def working_tree_files(repo: Path, skipped: list[str] | None = None) -> dict[str, bool]:
    """Every file of the working tree that the Windows check would see and git does not ignore:
    tracked files that still exist plus untracked files (git's standard exclusions: every
    ``.gitignore``, ``.git/info/exclude`` and the user's global excludes), mapped to 'executable'
    (git's mode). A directory that is itself a repository (a nested worktree or a submodule) is
    not part of this repository's tree: it is left out and its name is appended to ``skipped``."""
    listed = _git(repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard")
    gone = set(_git(repo, "ls-files", "-z", "--deleted").split(b"\0"))
    executable = {
        entry.split(b"\t", 1)[1]
        for entry in _git(repo, "ls-files", "-z", "--stage").split(b"\0")
        if entry.startswith(b"100755 ")
    }
    files: dict[str, bool] = {}
    for raw in sorted(set(listed.split(b"\0")) - {b""}):
        if raw in gone:
            continue
        relative = os.fsdecode(raw)
        path = repo / relative
        if not path.is_symlink() and (relative.endswith("/") or path.is_dir()):
            if skipped is not None:
                skipped.append(relative.rstrip("/"))
            continue
        if path.is_symlink() or not path.is_file():
            raise ContainerModeError(
                f"{relative} is not a plain file (a link or something else); "
                "the copy into the container supports plain files only"
            )
        files[relative] = raw in executable
    _refuse_ignored_code(repo, files)
    return files


def _refuse_ignored_code(repo: Path, files: dict[str, bool]) -> None:
    """Python code that git ignores but the native check would still lint, type-check or collect
    (everything under src/ and scripts/) must not silently be left out of the copy."""
    missing: list[str] = []
    for top in ("src", "scripts"):
        for root, directories, names in os.walk(repo / top):
            directories[:] = [d for d in directories if d != "__pycache__"]
            for name in names:
                relative = Path(root, name).relative_to(repo).as_posix()
                if name.endswith(".py") and relative not in files:
                    missing.append(relative)
    if missing:
        raise ContainerModeError(
            f"{len(missing)} Python file(s) exist but are ignored by git, so they are not copied "
            f"into the container although the native check would test them, e.g. {missing[0]}"
        )


class _Hashing:
    """Reads a file and hashes what it reads, so the manifest describes the shipped bytes."""

    def __init__(self, handle: BinaryIO) -> None:
        self.handle = handle
        self.digest = hashlib.sha256()
        self.size = 0

    def read(self, size: int = -1) -> bytes:
        data = self.handle.read(size)
        self.digest.update(data)
        self.size += len(data)
        return data


def build_archive(repo: Path, into: Path) -> TreeArchive:
    """Write the tar archive of the working tree to ``into`` and return what it holds."""
    skipped: list[str] = []
    files = working_tree_files(repo, skipped)
    table: dict[str, list[object]] = {}
    with (
        into.open("wb") as raw,
        tarfile.open(fileobj=raw, mode="w", format=tarfile.PAX_FORMAT) as tar,
    ):
        for relative, executable in files.items():
            path = repo / relative
            status = path.stat()
            info = tarfile.TarInfo(relative)
            info.size = status.st_size
            info.mtime = int(status.st_mtime)
            info.mode = 0o755 if executable else 0o644
            with path.open("rb") as handle:
                reader = _Hashing(handle)
                tar.addfile(info, reader)
            after = path.stat()
            if (after.st_size, after.st_mtime_ns) != (status.st_size, status.st_mtime_ns):
                raise ContainerModeError(
                    f"{relative} was written while it was being copied; run the check again"
                )
            table[relative] = [reader.size, reader.digest.hexdigest(), info.mode]
        tree = hashlib.sha256()
        for relative in sorted(table):
            tree.update(f"{relative}\0{table[relative][1]}\n".encode())
        manifest = json.dumps({"files": table, "tree_sha256": tree.hexdigest()}).encode()
        info = tarfile.TarInfo(MANIFEST_NAME)
        info.size = len(manifest)
        info.mode = 0o644
        info.mtime = int(time.time())
        tar.addfile(info, io.BytesIO(manifest))
    return TreeArchive(
        into,
        into.stat().st_size,
        len(table),
        sum(int(str(entry[0])) for entry in table.values()),
        tree.hexdigest(),
        tuple(skipped),
    )


# ---------------------------------------------------------------- running


def read_container_seconds(environ: Mapping[str, str] | None = None) -> float:
    raw = (os.environ if environ is None else environ).get(CONTAINER_SECONDS_ENV, "").strip()
    if not raw:
        return DEFAULT_CONTAINER_SECONDS
    try:
        value = float(raw)
    except ValueError:
        value = -1.0
    if not 60 <= value <= 86400:
        raise ContainerModeError(
            f"{CONTAINER_SECONDS_ENV} must be a number of seconds from 60 to 86400"
        )
    return value


@dataclass(frozen=True, slots=True)
class ContainerResult:
    exit_code: int
    steps_passed: int | None
    steps_total: int | None
    timed_out: bool
    result_seen: bool
    relay_failed: bool = False


def _pump(stream: BinaryIO, seen: list[str], broken: threading.Event) -> None:
    """Forward the container's output to this process's output, noting the result line. If this
    process's output fails, say so (``broken``) so that the run is stopped at once: a container
    whose output nobody reads would otherwise hold the lock slot until its deadline."""
    try:
        out = sys.stdout.buffer
        for line in iter(stream.readline, b""):
            out.write(line)
            out.flush()
            text = line.decode("utf-8", errors="replace")
            if text.startswith(RESULT_PREFIX):
                seen.append(text.strip())
    except (OSError, ValueError, AttributeError):
        broken.set()


def parse_result(line: str) -> tuple[int, int] | None:
    """``CLINIC-INNER-RESULT passed=P total=T`` -> (P, T)."""
    parts = dict(item.split("=", 1) for item in line.split()[1:] if "=" in item)
    try:
        return int(parts["passed"]), int(parts["total"])
    except (KeyError, ValueError):
        return None


def run_container(
    plan: Plan,
    archive: TreeArchive,
    environ: Mapping[str, str] | None = None,
    *,
    deadline: float | None = None,
    command: Sequence[str] = (),
) -> ContainerResult:
    """Start the container, stream the tree in, relay its output, wait for it; always remove it."""
    env = plan.compose_env(os.environ if environ is None else environ)
    limit = read_container_seconds(env) if deadline is None else deadline
    args = [
        *plan.compose_base(),
        "run",
        "--rm",
        "-T",
        "--no-deps",
        "--pull",
        "never",  # never fetch or build an image in the middle of a check
        "--name",
        plan.container_name,
        SERVICE,
        *(["--", *command] if command else []),
    ]
    try:
        process = start_guarded(
            args,
            cwd=plan.repo,
            env=env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    except OSError as error:
        raise ContainerModeError(
            f"the docker client could not be started under the process guard ({error})"
        ) from None
    seen: list[str] = []
    broken = threading.Event()
    pump = threading.Thread(target=_pump, args=(process.stdout, seen, broken), daemon=True)
    pump.start()
    stdin = process.stdin
    if stdin is None:
        process.kill()
        raise ContainerModeError("the docker client has no input pipe")

    def send() -> None:
        try:
            stdin.write(MAGIC + b" " + str(archive.length).encode() + b"\n")
            with archive.path.open("rb") as handle:
                while block := handle.read(1 << 20):
                    stdin.write(block)
            stdin.flush()
        except (OSError, ValueError):
            pass  # the container ended (or was killed) before it read everything

    writer = threading.Thread(target=send, name="tree-writer", daemon=True)
    started = time.monotonic()
    writer.start()
    timed_out = False
    try:
        while True:
            try:
                process.wait(timeout=1.0)
                break
            except subprocess.TimeoutExpired:
                if broken.is_set():
                    break
                if time.monotonic() - started > limit:
                    timed_out = True
                    break
    finally:
        _remove_container(plan)
        terminate(process)
        if process.poll() is None:
            process.kill()
        with contextlib.suppress(Exception):
            process.wait(timeout=30)
        with contextlib.suppress(OSError, ValueError):
            stdin.close()
        writer.join(timeout=10)
        pump.join(timeout=10)
        if process.stdout is not None:
            with contextlib.suppress(OSError):
                process.stdout.close()
    parsed = parse_result(seen[-1]) if seen else None
    return ContainerResult(
        exit_code=int(process.returncode if process.returncode is not None else -1),
        steps_passed=parsed[0] if parsed else None,
        steps_total=parsed[1] if parsed else None,
        timed_out=timed_out,
        result_seen=parsed is not None,
        relay_failed=broken.is_set(),
    )


def docker_processors() -> int | None:
    """The number of processors the Docker engine has (``docker info``), or None if unknown."""
    try:
        done = docker_run("info", "--format", "{{.NCPU}}", timeout=30)
    except ContainerModeError:
        return None
    text = done.stdout.strip()
    return int(text) if done.returncode == 0 and text.isdigit() and int(text) > 0 else None


def container_environment(workers: int) -> dict[str, str]:
    """This process's environment with the worker count the container must use, explicitly."""
    env = dict(os.environ)
    env["CLINIC_CHECK_WORKERS"] = str(workers)
    return env


def _remove_container(plan: Plan) -> None:
    with contextlib.suppress(ContainerModeError):
        docker_run("rm", "-f", plan.container_name, timeout=60)


def make_archive(repo: Path) -> tuple[TreeArchive, tempfile.TemporaryDirectory[str]]:
    directory = tempfile.TemporaryDirectory(prefix="clinic-tree-", ignore_cleanup_errors=True)
    try:
        return build_archive(repo, Path(directory.name) / "tree.tar"), directory
    except BaseException:
        directory.cleanup()
        raise
