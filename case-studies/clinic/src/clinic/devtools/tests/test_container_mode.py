"""The check's container mode: the parts that can be tested without Docker, with real processes.

What needs Docker itself (the image, the network, a killed check and a real container) was shown
by hand and is recorded in docs/tasks/linux-test-runner/task.md. Here: the image tag, the list of
files that are copied, the archive and the entry point that receives it (a real child process that
extracts, verifies and runs a command), the stop-when-the-input-closes watch (a real parent that is
killed with no clean-up), the preflight messages, the host side with a stand-in client process, and
the rule that a failure of the container mode never turns into a native run.
"""

from __future__ import annotations

import contextlib
import io
import json
import os
import subprocess
import sys
import tarfile
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from clinic.devtools import check, container_mode
from clinic.devtools.check import controlled_env
from clinic.devtools.checkout_tag import BadCheckoutTag, checkout_tag, tag_for
from clinic.devtools.container_mode import (
    ContainerModeError,
    Plan,
    build_archive,
    image_tag,
    parse_result,
    working_tree_files,
)

SRC = Path(__file__).resolve().parents[3]
BOOTSTRAP = SRC.parent / "docker" / "tests" / "bootstrap.py"


def _git(where: Path, *args: str) -> None:
    done = subprocess.run(
        ["git", "-C", str(where), "-c", "user.name=t", "-c", "user.email=t@localhost", *args],  # noqa: S607
        capture_output=True,
        text=True,
        check=False,
        env={k: v for k, v in os.environ.items() if not k.startswith("GIT_")},
    )
    assert done.returncode == 0, done.stderr


def _text(path: Path, content: str) -> None:
    """Write text with plain line feeds on every platform."""
    path.write_bytes(content.encode())


def _repository(root: Path) -> Path:
    """A small real repository: tracked, modified, deleted, untracked, ignored and executable."""
    root.mkdir()
    _git(root, "init", "-q")
    _text(root / ".gitignore", "ignored.txt\n__pycache__/\n")
    _text(root / "kept.txt", "kept\n")
    _text(root / "changed.txt", "before\n")
    _text(root / "removed.txt", "removed\n")
    _text(root / "run.sh", "#!/bin/sh\n")
    (root / "sub").mkdir()
    (root / "sub" / "deep.txt").write_bytes(b"deep\r\nwith crlf\r\n")
    _git(root, "add", "-A")
    _git(root, "update-index", "--chmod=+x", "run.sh")
    _git(root, "commit", "-q", "-m", "one")
    _text(root / "changed.txt", "after, uncommitted\n")
    (root / "removed.txt").unlink()
    _text(root / "new.txt", "untracked\n")
    _text(root / "ignored.txt", "ignored\n")
    return root


# ---------------------------------------------------------------- tag of the image


def _image_sources(root: Path) -> None:
    (root / "docker" / "tests").mkdir(parents=True, exist_ok=True)
    for name in container_mode.IMAGE_INPUTS:
        (root / name).write_text(f"content of {name}\n", encoding="utf-8")
    if not (root / "pyproject.toml").exists():
        (root / "pyproject.toml").write_text("[project]\ndependencies = []\n", encoding="utf-8")


def test_the_image_tag_follows_what_the_image_installs_and_nothing_else(
    scratch_dir: Path,
) -> None:
    _image_sources(scratch_dir)
    pyproject = scratch_dir / "pyproject.toml"
    _text(pyproject, '[project]\ndependencies = ["django"]\n[tool.ruff]\nline-length = 100\n')
    first = image_tag(scratch_dir)
    assert first == image_tag(scratch_dir)
    # Tool settings and code do not rebuild the image ...
    _text(pyproject, '[project]\ndependencies = ["django"]\n[tool.ruff]\nline-length = 90\n')
    _text(scratch_dir / "src.py", "print(1)\n")
    assert image_tag(scratch_dir) == first
    # ... but anything that changes what uv sync installs does, even with uv.lock unchanged.
    for text in (
        '[project]\ndependencies = ["django", "tzdata"]\n',
        '[project]\ndependencies = ["django"]\nrequires-python = ">=3.13"\n',
        '[project]\ndependencies = ["django"]\n[dependency-groups]\ndev = ["pytest"]\n',
        '[project]\ndependencies = ["django"]\n[tool.uv]\npackage = false\n',
    ):
        _text(pyproject, text)
        assert image_tag(scratch_dir) != first, text
    _text(pyproject, '[project]\ndependencies = ["django"]\n[tool.ruff]\nline-length = 100\n')
    for name in ("uv.lock", "docker/tests/Dockerfile", "docker/tests/bootstrap.py"):
        path = scratch_dir / name
        original = path.read_bytes()
        path.write_bytes(original + b"changed\n")
        assert image_tag(scratch_dir) != first, name
        path.write_bytes(original)
    assert image_tag(scratch_dir) == first


def test_a_missing_image_input_is_an_error_not_a_tag(scratch_dir: Path) -> None:
    _image_sources(scratch_dir)
    _text(scratch_dir / "pyproject.toml", "[project]\n")
    (scratch_dir / "uv.lock").unlink()
    with pytest.raises(ContainerModeError, match=r"uv\.lock"):
        image_tag(scratch_dir)


def test_the_real_image_inputs_exist_and_the_tag_is_sixteen_hex_digits() -> None:
    tag = image_tag(SRC.parent)
    assert len(tag) == 16 and set(tag) <= set("0123456789abcdef")


# ---------------------------------------------------------------- the tag of the checkout


def test_the_checkout_tag_is_the_hosts_inside_the_container_and_the_paths_own_outside() -> None:
    here = Path("C:/Some/Where")
    inside = {"CLINIC_CHECK_IN_CONTAINER": "1"}
    linux = "linux"
    assert tag_for(here, {}) == checkout_tag(here)
    # Outside the container the variable is ignored: a stray value cannot point a checkout at
    # another checkout's databases.
    assert tag_for(here, {"CLINIC_TEST_CHECKOUT_TAG": "0a1b2c"}, linux) == checkout_tag(here)
    given = inside | {"CLINIC_TEST_CHECKOUT_TAG": "0a1b2c"}
    assert tag_for(Path("/work/clinic"), given, linux) == "0a1b2c"
    # The test container is Linux: a stray marker in a Windows shell is never honoured.
    assert tag_for(here, given, "win32") == checkout_tag(here)
    assert tag_for(here, inside, "win32") == checkout_tag(here)
    # Inside, it is required and checked: no fallback to the container's own, shared path.
    for bad in ("", "0A1B2C", "0a1b2", "0a1b2cd", "x'; DROP", "0a1b2c "):
        with pytest.raises(BadCheckoutTag):
            tag_for(here, inside | {"CLINIC_TEST_CHECKOUT_TAG": bad}, linux)
    with pytest.raises(BadCheckoutTag):
        tag_for(here, inside, linux)
    assert checkout_tag(Path("C:/A/B")) == checkout_tag(Path("c:/a/b"))
    assert checkout_tag(Path("C:/A/B")) != checkout_tag(Path("C:/A/C"))


# ---------------------------------------------------------------- what is copied


def test_the_copy_holds_the_working_tree_as_it_is_on_disk(scratch_dir: Path) -> None:
    repo = _repository(scratch_dir / "repo")
    files = working_tree_files(repo)
    assert sorted(files) == [
        ".gitignore",
        "changed.txt",
        "kept.txt",
        "new.txt",
        "run.sh",
        "sub/deep.txt",
    ]  # no ignored file, no file deleted from the disk, the untracked file is there
    assert files["run.sh"] is True and files["kept.txt"] is False
    archive = build_archive(repo, scratch_dir / "tree.tar")
    assert archive.files == 6
    with tarfile.open(archive.path) as tar:
        names = tar.getnames()
        assert sorted(n for n in names if n != container_mode.MANIFEST_NAME) == sorted(files)
        assert tar.extractfile("changed.txt").read() == b"after, uncommitted\n"  # type: ignore[union-attr]
        assert tar.extractfile("sub/deep.txt").read() == b"deep\r\nwith crlf\r\n"  # type: ignore[union-attr]
        assert tar.getmember("run.sh").mode == 0o755
        manifest = json.loads(tar.extractfile(container_mode.MANIFEST_NAME).read())  # type: ignore[union-attr]
    assert manifest["tree_sha256"] == archive.tree_sha256
    assert set(manifest["files"]) == set(files)


def test_nested_repositories_and_worktrees_are_left_out_and_reported_not_refused(
    scratch_dir: Path,
) -> None:
    """The root's main checkout holds many worktrees under .claude/worktrees (excluded through
    .git/info/exclude) and may hold other nested repositories: none belongs to this tree."""
    repo = _repository(scratch_dir / "repo")
    # a real nested worktree of this repository, excluded the way the main checkout excludes them
    (repo / ".git" / "info").mkdir(exist_ok=True)
    _text(repo / ".git" / "info" / "exclude", ".claude/worktrees/\n")
    (repo / ".claude").mkdir()
    _git(repo, "worktree", "add", "-q", ".claude/worktrees/one", "-b", "wt-one")
    # a second real worktree that is NOT excluded, and a plain nested repository
    _git(repo, "worktree", "add", "-q", "other-worktree", "-b", "wt-two")
    nested = repo / "nested"
    nested.mkdir()
    _git(nested, "init", "-q")
    _text(nested / "f.txt", "x")
    _git(nested, "add", "f.txt")
    _git(nested, "commit", "-q", "-m", "n")
    skipped: list[str] = []
    files = working_tree_files(repo, skipped)
    assert sorted(skipped) == [
        "nested",
        "other-worktree",
    ]  # reported; the excluded one is not listed
    assert not any(name.startswith((".claude/", "nested/", "other-worktree/")) for name in files)
    assert "kept.txt" in files and "new.txt" in files
    archive = build_archive(repo, scratch_dir / "tree.tar")
    assert sorted(archive.skipped) == ["nested", "other-worktree"]
    assert archive.files == len(files)


def test_a_link_is_still_refused(scratch_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo = _repository(scratch_dir / "repo")
    real = Path.is_symlink
    monkeypatch.setattr(Path, "is_symlink", lambda self: self.name == "new.txt" or real(self))
    with pytest.raises(ContainerModeError, match=r"new\.txt is not a plain file"):
        working_tree_files(repo)


# ---------------------------------------------------------------- the entry point, for real


def _bootstrap_env() -> dict[str, str]:
    env = controlled_env()
    env.pop("CLINIC_CHECK_IN_CONTAINER", None)
    return env


def _feed(archive: container_mode.TreeArchive) -> bytes:
    body = archive.path.read_bytes()
    return container_mode.MAGIC + b" " + str(len(body)).encode() + b"\n" + body


def _start(work: Path, *command: str, stdin: Any = subprocess.PIPE) -> subprocess.Popen[bytes]:
    return subprocess.Popen(
        [sys.executable, str(BOOTSTRAP), "--work", str(work), "--no-sync-check", *command],
        stdin=stdin,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=_bootstrap_env(),
    )


def _run_to_the_end(process: subprocess.Popen[bytes], payload: bytes) -> str:
    """Send the tree, keep the input open (closing it is the signal to stop) until it ends."""
    assert process.stdin is not None and process.stdout is not None
    process.stdin.write(payload)
    process.stdin.flush()
    try:
        process.wait(timeout=60)
        return process.stdout.read().decode()
    finally:
        with contextlib.suppress(OSError):
            process.stdin.close()
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdout.close()


def test_the_entry_point_extracts_verifies_and_runs_the_command(scratch_dir: Path) -> None:
    repo = _repository(scratch_dir / "repo")
    archive = build_archive(repo, scratch_dir / "tree.tar")
    work = scratch_dir / "work"
    show = (
        "import os, sys; "
        "print('cwd', os.getcwd()); "
        "print('inside', os.environ['CLINIC_CHECK_IN_CONTAINER']); "
        "print('stdin', repr(sys.stdin.read())); "
        "print('file', open('changed.txt').read().strip())"
    )
    process = _start(work, sys.executable, "-c", show)
    output = _run_to_the_end(process, _feed(archive))
    assert process.returncode == 0, output
    assert (
        f"copy verified: 6 files, {archive.bytes} bytes, tree sha256 {archive.tree_sha256}"
        in output
    )
    assert "stdin ''" in output  # the command's own input is not the host's pipe
    assert "inside 1" in output
    assert "file after, uncommitted" in output
    assert (work / "sub" / "deep.txt").read_bytes() == b"deep\r\nwith crlf\r\n"


@pytest.mark.parametrize(
    ("damage", "expected_status", "message"),
    [
        ("changed hash", 3, "content differs"),
        ("missing from manifest", 3, "not in the manifest"),
        ("manifest names a missing file", 3, "missing after the copy"),
        ("bad tree hash", 4, "own tree hash"),
        ("no header", 4, "no tree header"),
        ("no manifest", 4, "no manifest"),
    ],
)
def test_the_entry_point_refuses_a_copy_that_is_not_the_working_tree(
    scratch_dir: Path, damage: str, expected_status: int, message: str
) -> None:
    repo = _repository(scratch_dir / "repo")
    archive = build_archive(repo, scratch_dir / "tree.tar")
    rebuilt = scratch_dir / "damaged.tar"
    with tarfile.open(archive.path) as source, tarfile.open(rebuilt, "w") as target:
        for member in source:
            data = source.extractfile(member).read()  # type: ignore[union-attr]
            if member.name == container_mode.MANIFEST_NAME:
                if damage == "no manifest":
                    continue
                manifest = json.loads(data)
                if damage == "changed hash":
                    manifest["files"]["kept.txt"][1] = "0" * 64
                    manifest["tree_sha256"] = _tree_hash(manifest["files"])
                elif damage == "missing from manifest":
                    del manifest["files"]["kept.txt"]
                    manifest["tree_sha256"] = _tree_hash(manifest["files"])
                elif damage == "manifest names a missing file":
                    manifest["files"]["ghost.txt"] = [1, "0" * 64, 0o644]
                    manifest["tree_sha256"] = _tree_hash(manifest["files"])
                elif damage == "bad tree hash":
                    manifest["tree_sha256"] = "0" * 64
                data = json.dumps(manifest).encode()
                member.size = len(data)
            target.addfile(member, io.BytesIO(data))
    body = rebuilt.read_bytes()
    header = container_mode.MAGIC + b" " + str(len(body)).encode() + b"\n"
    payload = b"garbage\n" if damage == "no header" else header + body
    process = _start(scratch_dir / "work", sys.executable, "-c", "print('RAN')")
    output = process.communicate(payload, timeout=60)[0].decode()
    assert process.returncode == expected_status, output
    assert message in output
    assert "RAN" not in output  # the command never ran on a tree that is not the working tree


def _tree_hash(files: dict[str, list[Any]]) -> str:
    import hashlib

    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(f"{path}\0{files[path][1]}\n".encode())
    return digest.hexdigest()


# ---------------------------------------------------------------- stop when the input closes

WATCHED_COMMAND = """
import os, sys, time
from pathlib import Path
Path(sys.argv[1]).write_text(str(os.getpid()))
time.sleep(600)
"""

HOST = """
import subprocess, sys, time
from pathlib import Path
from clinic.devtools import container_mode

root = Path(sys.argv[1])
archive = container_mode.build_archive(root / "repo", root / "host.tar")
body = archive.path.read_bytes()
child = subprocess.Popen(
    [sys.executable, sys.argv[2], "--work", str(root / "work"), "--no-sync-check",
     sys.executable, "-c", sys.argv[3], str(root / "child.pid")],
    stdin=subprocess.PIPE,
)
child.stdin.write(container_mode.MAGIC + b" " + str(len(body)).encode() + b"\\n" + body)
child.stdin.flush()
(root / "host.pid").write_text(str(child.pid))
time.sleep(600)  # killed by the test with no clean-up
"""


def _alive(pid: int) -> bool:
    if sys.platform == "win32":
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        handle = kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return False
        code = ctypes.c_ulong()
        kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        kernel32.CloseHandle(handle)
        return code.value == 259
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    try:  # a killed child whose parent is gone may linger as a zombie until init reaps it
        return (
            Path(f"/proc/{pid}/stat").read_text(encoding="utf-8").rsplit(")", 1)[1].split()[0]
            != "Z"
        )
    except (OSError, IndexError):
        return True


def _wait_for(path: Path, seconds: float = 60) -> None:
    deadline = time.monotonic() + seconds
    while not path.exists() or not path.read_text(encoding="utf-8").strip():
        assert time.monotonic() < deadline, f"{path.name} never appeared"
        time.sleep(0.05)


@contextmanager
def _reaped(*processes: subprocess.Popen[bytes]) -> Iterator[None]:
    try:
        yield
    finally:
        for process in processes:
            if process.poll() is None:
                process.kill()
            process.wait()
            for stream in (process.stdin, process.stdout):
                if stream is not None:
                    with contextlib.suppress(OSError):
                        stream.close()


def test_the_entry_command_stops_when_the_host_is_killed_with_no_clean_up(
    scratch_dir: Path,
) -> None:
    """The real mechanism: the host holds the write end of a pipe; when the host dies the
    operating system closes it and the command (here a stand-in for the in-container driver,
    started by the real entry point) ends. Nothing but the pipe ties the two together: the host
    here starts the entry point with a plain Popen, not in the process guard's job."""
    _repository(scratch_dir / "repo")
    host = subprocess.Popen(
        [sys.executable, "-c", HOST, str(scratch_dir), str(BOOTSTRAP), WATCHED_COMMAND],
        env=_bootstrap_env(),
    )
    with _reaped(host):
        _wait_for(scratch_dir / "child.pid")
        _wait_for(scratch_dir / "host.pid")
        child_pid = int((scratch_dir / "child.pid").read_text(encoding="utf-8"))
        assert _alive(child_pid)
        time.sleep(0.5)
        assert _alive(child_pid)  # it keeps running for as long as the host lives
        host.kill()
        host.wait()
        deadline = time.monotonic() + 30
        while _alive(child_pid):
            assert time.monotonic() < deadline, "the command outlived the killed host"
            time.sleep(0.05)


def test_the_entry_point_stops_its_command_and_exits_143_when_the_input_closes(
    scratch_dir: Path,
) -> None:
    repo = _repository(scratch_dir / "repo")
    archive = build_archive(repo, scratch_dir / "tree.tar")
    process = _start(
        scratch_dir / "work",
        sys.executable,
        "-c",
        WATCHED_COMMAND,
        str(scratch_dir / "child.pid"),
    )
    with _reaped(process):
        assert process.stdin is not None
        process.stdin.write(_feed(archive))
        process.stdin.flush()
        _wait_for(scratch_dir / "child.pid")
        child_pid = int((scratch_dir / "child.pid").read_text(encoding="utf-8"))
        time.sleep(0.3)
        assert process.poll() is None and _alive(child_pid)
        process.stdin.write(b"bytes the watch ignores")
        process.stdin.flush()
        time.sleep(0.3)
        assert process.poll() is None  # data on the pipe is not the end
        process.stdin.close()
        assert process.wait(timeout=30) == 143
        deadline = time.monotonic() + 10
        while _alive(child_pid):
            assert time.monotonic() < deadline, "the command outlived the entry point"
            time.sleep(0.05)


def test_the_entry_point_returns_the_commands_exit_status(scratch_dir: Path) -> None:
    repo = _repository(scratch_dir / "repo")
    archive = build_archive(repo, scratch_dir / "tree.tar")
    process = _start(scratch_dir / "work", sys.executable, "-c", "raise SystemExit(7)")
    output = _run_to_the_end(process, _feed(archive))
    assert process.returncode == 7, output


# ---------------------------------------------------------------- preflight, with a fake docker


class FakeDocker:
    """Stands in for ``docker_run``: maps the first argument(s) to a canned answer."""

    def __init__(self, answers: dict[str, tuple[int, str]]) -> None:
        self.answers = answers
        self.calls: list[tuple[str, ...]] = []

    def __call__(self, *args: str, **_: Any) -> subprocess.CompletedProcess[str]:
        self.calls.append(args)
        code, out = self.answers.get(args[0], (0, ""))
        return subprocess.CompletedProcess(args, code, out, "")


def _fake(
    monkeypatch: pytest.MonkeyPatch,
    scratch_dir: Path,
    answers: dict[str, tuple[int, str]],
    *,
    port: str = "55499",
) -> FakeDocker:
    _image_sources(scratch_dir)
    (scratch_dir / ".env").write_text(f"CLINIC_DB_PORT={port}\n", encoding="utf-8")
    fake = FakeDocker({"inspect": (0, "clinic-x_default clinic-x_tests-internal"), **answers})
    monkeypatch.setattr(container_mode, "docker_run", fake)
    monkeypatch.setattr(container_mode, "docker_exe", lambda: "docker")
    monkeypatch.delenv("CLINIC_DB_PORT", raising=False)
    return fake


HEALTHY = "clinic-x-db-1\tclinic-x\tUp 3 minutes (healthy)"


def test_preflight_names_the_database_container_the_env_file_points_at(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    fake = _fake(monkeypatch, scratch_dir, {"version": (0, "29.9.2"), "ps": (0, HEALTHY)})
    plan = container_mode.preflight(scratch_dir, {})
    assert (plan.project, plan.db_container) == ("clinic-x", "clinic-x-db-1")
    assert plan.image == f"clinic-tests:{image_tag(scratch_dir)}"
    assert plan.container_name == f"clinic-tests-{checkout_tag(scratch_dir)}-{os.getpid()}"
    assert plan.host_pid == os.getpid()
    ps = next(call for call in fake.calls if call[0] == "ps")
    assert "publish=55499" in ps


@pytest.mark.parametrize(
    ("answers", "message"),
    [
        ({"version": (1, "")}, "Docker daemon is not reachable"),
        ({"version": (0, "29"), "image": (1, "")}, "does not exist"),
        ({"version": (0, "29"), "ps": (0, "")}, "no running database container publishes port"),
        (
            {"version": (0, "29"), "ps": (0, HEALTHY + "\nclinic-y-db-1\tclinic-y\tUp (healthy)")},
            "more than one database container",
        ),
        (
            {"version": (0, "29"), "ps": (0, "clinic-x-db-1\tclinic-x\tUp 5 seconds (starting)")},
            "not healthy",
        ),
        ({"version": (0, "29"), "ps": (1, "")}, "docker ps failed"),
        (
            {"version": (0, "29"), "ps": (0, HEALTHY), "inspect": (0, "clinic-x_default")},
            "not on the network clinic-x_tests-internal",
        ),
    ],
)
def test_every_way_of_not_having_a_container_is_a_clear_error(
    monkeypatch: pytest.MonkeyPatch,
    scratch_dir: Path,
    answers: dict[str, tuple[int, str]],
    message: str,
) -> None:
    _fake(monkeypatch, scratch_dir, answers)
    with pytest.raises(ContainerModeError, match=message):
        container_mode.preflight(scratch_dir, {})


def test_a_missing_image_message_gives_the_build_command_and_the_check_does_not_build(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    fake = _fake(monkeypatch, scratch_dir, {"version": (0, "29"), "image": (1, "")})
    with pytest.raises(ContainerModeError) as error:
        container_mode.preflight(scratch_dir, {})
    assert container_mode.BUILD_COMMAND in str(error.value)
    assert not any(call[0] in {"build", "buildx", "compose", "pull"} for call in fake.calls)


def test_an_unset_database_port_is_an_error(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    _fake(monkeypatch, scratch_dir, {"version": (0, "29")})
    (scratch_dir / ".env").write_text("OTHER=1\n", encoding="utf-8")
    with pytest.raises(ContainerModeError, match="CLINIC_DB_PORT"):
        container_mode.preflight(scratch_dir, {})


def test_the_environment_wins_over_the_env_file_for_the_database_port(
    scratch_dir: Path,
) -> None:
    (scratch_dir / ".env").write_text("CLINIC_DB_PORT=1111\n", encoding="utf-8")
    assert container_mode.read_env_value(scratch_dir, "CLINIC_DB_PORT", {}) == "1111"
    assert (
        container_mode.read_env_value(scratch_dir, "CLINIC_DB_PORT", {"CLINIC_DB_PORT": "2222"})
        == "2222"
    )


def _sweep_plan(root: Path, host_pid: int = 4242) -> Plan:
    return Plan(root, "p", "i", "t", "db", "abc123", "clinic-tests-abc123-4242", host_pid)


def test_the_sweep_removes_leftovers_whose_host_is_gone(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    fake = _fake(monkeypatch, scratch_dir, {"ps": (0, "left-1\t999999999\nleft-2\t\n")})
    monkeypatch.setattr(container_mode, "process_alive", lambda pid: False)
    assert container_mode.sweep(_sweep_plan(scratch_dir)) == ["left-1", "left-2"]
    ps = fake.calls[0]
    assert "label=clinic.tests.checkout=abc123" in ps and "-a" in ps  # running ones too
    assert [call for call in fake.calls if call[0] == "rm"] == [
        ("rm", "-f", "left-1"),
        ("rm", "-f", "left-2"),
    ]


def test_the_sweep_refuses_to_kill_a_run_whose_host_check_is_alive(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    fake = _fake(monkeypatch, scratch_dir, {"ps": (0, "running-1\t31337\n")})
    monkeypatch.setattr(container_mode, "process_alive", lambda pid: pid == 31337)
    with pytest.raises(ContainerModeError, match=r"another check of this checkout.*31337"):
        container_mode.sweep(_sweep_plan(scratch_dir))
    assert not [call for call in fake.calls if call[0] == "rm"]  # nothing was removed


def test_a_container_that_cannot_be_removed_stops_the_check(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    _fake(monkeypatch, scratch_dir, {"ps": (0, "stuck\t\n"), "rm": (1, "")})
    with pytest.raises(ContainerModeError, match="cannot remove the leftover"):
        container_mode.sweep(_sweep_plan(scratch_dir))


def test_a_vanished_image_is_caught_again_after_the_lock(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    _fake(monkeypatch, scratch_dir, {"image": (1, "")})
    with pytest.raises(ContainerModeError, match="disappeared while the check waited"):
        container_mode.ensure_image(_sweep_plan(scratch_dir))


def test_a_live_and_a_dead_process_are_told_apart() -> None:
    assert container_mode.process_alive(os.getpid())
    dead = subprocess.Popen([sys.executable, "-c", "pass"])
    dead.wait()
    deadline = time.monotonic() + 10
    while container_mode.process_alive(dead.pid):  # a reused id would be a different process
        assert time.monotonic() < deadline
        time.sleep(0.05)
    assert not container_mode.process_alive(0)


# ---------------------------------------------------------------- the host side, real processes

CLIENT = """
import os, sys, time
from pathlib import Path

root = Path(os.environ["FAKE_CLIENT_ROOT"])
mode = os.environ["FAKE_CLIENT_MODE"]
header = sys.stdin.buffer.readline()
n = int(header.split()[1])
body = sys.stdin.buffer.read(n)
(root / "client.pid").write_text(str(os.getpid()))
(root / "received").write_text(f"{n} {len(body)}")
if mode == "pass":
    print("steps ran", flush=True)
    print("CLINIC-INNER-RESULT passed=7 total=7", flush=True)
elif mode == "fail":
    print("CLINIC-INNER-RESULT passed=6 total=7", flush=True)
    sys.exit(1)
elif mode == "silent":
    sys.exit(3)
elif mode == "hang":
    print("started", flush=True)
    time.sleep(600)
elif mode == "wait-for-eof":
    import threading
    eof = threading.Event()
    threading.Thread(target=lambda: (sys.stdin.buffer.read(), eof.set()), daemon=True).start()
    time.sleep(1.5)  # the host's deadline is much later than this
    (root / "eof-after-2s").write_text("early" if eof.is_set() else "open")
    time.sleep(600)
"""


@pytest.fixture
def stand_in_client(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> Iterator[tuple[Plan, container_mode.TreeArchive, Path]]:
    """A Python script that plays the docker client: reads the tree from its input."""
    repo = _repository(scratch_dir / "repo")
    script = scratch_dir / "client.py"
    script.write_text(CLIENT, encoding="utf-8")
    plan = Plan(repo, "proj", "img", "tag", "dbc", "abc123", "clinic-tests-abc123")
    monkeypatch.setattr(Plan, "compose_base", lambda self: [sys.executable, str(script)])
    removed: list[tuple[str, ...]] = []

    def docker(*args: str, **_: Any) -> subprocess.CompletedProcess[str]:
        removed.append(args)
        return subprocess.CompletedProcess(args, 0, "", "")

    monkeypatch.setattr(container_mode, "docker_run", docker)
    monkeypatch.setenv("FAKE_CLIENT_ROOT", str(scratch_dir))
    yield plan, build_archive(repo, scratch_dir / "tree.tar"), scratch_dir
    if (scratch_dir / "client.pid").exists():  # a client ran, so a container existed
        assert ("rm", "-f", "clinic-tests-abc123") in removed  # and it is always removed


@pytest.mark.parametrize(
    ("mode", "exit_code", "passed", "seen", "timed_out"),
    [
        ("pass", 0, 7, True, False),
        ("fail", 1, 6, True, False),
        ("silent", 3, None, False, False),
    ],
)
def test_the_host_streams_the_tree_relays_the_output_and_reads_the_result(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
    capfdbinary: pytest.CaptureFixture[bytes],
    mode: str,
    exit_code: int,
    passed: int | None,
    seen: bool,
    timed_out: bool,
) -> None:
    plan, archive, root = stand_in_client
    monkeypatch.setenv("FAKE_CLIENT_MODE", mode)
    result = container_mode.run_container(plan, archive, dict(os.environ))
    assert (result.exit_code, result.steps_passed, result.result_seen, result.timed_out) == (
        exit_code,
        passed,
        seen,
        timed_out,
    )
    assert (root / "received").read_text(encoding="utf-8") == f"{archive.length} {archive.length}"
    if mode == "pass":
        assert b"steps ran" in capfdbinary.readouterr().out


def test_a_container_that_runs_too_long_is_stopped_and_removed(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
) -> None:
    plan, archive, root = stand_in_client
    monkeypatch.setenv("FAKE_CLIENT_MODE", "hang")
    started = time.monotonic()
    result = container_mode.run_container(plan, archive, dict(os.environ), deadline=2.0)
    assert result.timed_out and not result.result_seen
    assert time.monotonic() - started < 60
    assert not _alive(int((root / "client.pid").read_text(encoding="utf-8")))


def test_the_input_stays_open_until_the_container_is_done(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
) -> None:
    """The client sees end of file only when the host lets go, never right after the tree."""
    plan, archive, root = stand_in_client
    monkeypatch.setenv("FAKE_CLIENT_MODE", "wait-for-eof")
    result = container_mode.run_container(plan, archive, dict(os.environ), deadline=12.0)
    assert result.timed_out  # nothing ended the client but the deadline
    # Well after the tree was sent the input was still open: end of file is the host's signal
    # to stop, and it comes only when the host lets go.
    assert (root / "eof-after-2s").read_text(encoding="utf-8") == "open"


def test_a_client_that_cannot_start_is_an_error_not_a_native_run(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
) -> None:
    plan, archive, _ = stand_in_client
    monkeypatch.setattr(Plan, "compose_base", lambda self: ["definitely-not-a-program-clinic"])
    with pytest.raises(ContainerModeError, match="could not be started"):
        container_mode.run_container(plan, archive, dict(os.environ))


def test_the_result_line_is_read_strictly() -> None:
    assert parse_result("CLINIC-INNER-RESULT passed=7 total=7") == (7, 7)
    assert parse_result("CLINIC-INNER-RESULT passed=3 total=7") == (3, 7)
    assert parse_result("CLINIC-INNER-RESULT passed=x total=7") is None
    assert parse_result("CLINIC-INNER-RESULT total=7") is None


# ---------------------------------------------------------------- the mode in check.py


def test_the_mode_is_native_unless_container_is_asked_for() -> None:
    assert check.read_mode({}) == "native"
    assert check.read_mode({"CLINIC_CHECK_MODE": " container "}) == "container"
    assert check.read_mode({"CLINIC_CHECK_MODE": "native"}) == "native"
    with pytest.raises(check.CheckConfigError, match="CLINIC_CHECK_MODE"):
        check.read_mode({"CLINIC_CHECK_MODE": "docker"})


@pytest.fixture(autouse=True)
def own_lock_directory(monkeypatch: pytest.MonkeyPatch, scratch_dir: Path) -> Path:
    """The tests that run the container mode through ``check`` take its checkout lock: keep it in
    a scratch directory, so that they never meet the lock of the check that is running them."""
    directory = scratch_dir / "locks"
    monkeypatch.setattr(check, "lock_dir", lambda worktree: directory)
    return directory


def test_a_container_mode_that_cannot_start_fails_and_never_runs_natively(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def refuse(repo: Path, environ: Any = None) -> Plan:
        raise ContainerModeError("the Docker daemon is not reachable (test)")

    ran: list[str] = []

    def spy(name: str, answer: Any) -> Any:
        def call(*args: Any, **kwargs: Any) -> Any:
            ran.append(name)
            return answer

        return call

    monkeypatch.setattr(container_mode, "preflight", refuse)
    monkeypatch.setattr(check, "run_steps", spy("steps", []))
    monkeypatch.setattr(check, "_pytest_step", spy("pytest", True))
    monkeypatch.setattr(check, "_run", spy("step", 0))
    status = check.run_container_mode(6, 600.0)
    output = capsys.readouterr().out
    assert status == 1
    assert ran == []  # not one step ran on this machine
    assert "the Docker daemon is not reachable (test)" in output
    assert "nothing was run" in output
    assert "CHECK FAILED: 0/7 steps passed" in output


def _plan(root: Path) -> Plan:
    return Plan(
        root, "proj", "clinic-tests:abc", "abc", "proj-db-1", "abc123", "clinic-tests-abc123"
    )


@pytest.mark.parametrize(
    ("result", "passed_line"),
    [
        (container_mode.ContainerResult(0, 7, 7, False, True), "CHECK PASSED: 7/7 steps passed"),
        (container_mode.ContainerResult(1, 6, 7, False, True), "CHECK FAILED: 6/7 steps passed"),
        # A count of 7/7 that did not end cleanly, or is not seven steps, never reads as a pass.
        (container_mode.ContainerResult(0, 7, 7, True, True), "CHECK FAILED: 0/7 steps passed"),
        (container_mode.ContainerResult(2, 7, 7, False, True), "CHECK FAILED: 0/7 steps passed"),
        (container_mode.ContainerResult(0, 3, 3, False, True), "CHECK FAILED: 0/7 steps passed"),
        (container_mode.ContainerResult(0, None, None, False, False), "CHECK FAILED: 0/7 steps"),
    ],
)
def test_the_summary_says_the_mode_and_only_a_clean_result_passes(
    monkeypatch: pytest.MonkeyPatch,
    scratch_dir: Path,
    capsys: pytest.CaptureFixture[str],
    result: container_mode.ContainerResult,
    passed_line: str,
) -> None:
    monkeypatch.setattr(container_mode, "preflight", lambda repo, environ=None: _plan(scratch_dir))
    monkeypatch.setattr(container_mode, "ensure_image", lambda plan: None)
    monkeypatch.setattr(container_mode, "sweep", lambda plan: [])
    monkeypatch.setattr(
        container_mode,
        "make_archive",
        lambda repo: (
            container_mode.TreeArchive(scratch_dir / "x", 1, 1, 1, "0" * 64),
            _Scratch(),
        ),
    )
    monkeypatch.setattr(container_mode, "run_container", lambda *a, **k: result)
    monkeypatch.setenv(check.NO_LOCK_ENV, "1")
    status = check.run_container_mode(6, 600.0)
    output = capsys.readouterr().out
    assert output.rstrip().splitlines()[-1].startswith(passed_line)
    assert (status == 0) == passed_line.startswith("CHECK PASSED")
    assert "mode: container, image clinic-tests:abc" in output
    assert "the checks ran on Linux, not on this machine" in output


def test_an_os_error_while_copying_is_a_failed_check_with_the_summary_not_a_traceback(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    def vanished(repo: Path) -> Any:
        raise FileNotFoundError("a file vanished between listing and reading")

    monkeypatch.setattr(container_mode, "preflight", lambda repo, environ=None: _plan(scratch_dir))
    monkeypatch.setattr(container_mode, "ensure_image", lambda plan: None)
    monkeypatch.setattr(container_mode, "sweep", lambda plan: [])
    monkeypatch.setattr(container_mode, "make_archive", vanished)
    monkeypatch.setenv(check.NO_LOCK_ENV, "1")
    assert check.run_container_mode(6, 600.0) == 1
    output = capsys.readouterr().out
    assert "a file vanished" in output
    assert output.rstrip().splitlines()[-1] == "CHECK FAILED: 0/7 steps passed"


def test_python_code_that_git_ignores_is_refused_not_left_out(
    scratch_dir: Path,
) -> None:
    repo = _repository(scratch_dir / "repo")
    (repo / "src").mkdir()
    _text(repo / "src" / "ok.py", "x = 1\n")
    _git(repo, "add", "src/ok.py")
    _text(repo / ".gitignore", "ignored.txt\n__pycache__/\nsrc/hidden_test.py\n")
    _text(repo / "src" / "hidden_test.py", "def test_x(): assert False\n")
    with pytest.raises(ContainerModeError, match=r"ignored by git.*src/hidden_test\.py"):
        working_tree_files(repo)
    (repo / "src" / "hidden_test.py").unlink()
    (repo / "src" / "__pycache__").mkdir()
    _text(repo / "src" / "__pycache__" / "x.cpython-313.pyc", "bytes")  # ignored and not code
    assert "src/ok.py" in working_tree_files(repo)


class _Scratch:
    def __enter__(self) -> None:
        return None

    def __exit__(self, *_: object) -> None:
        return None


def test_the_inside_driver_refuses_to_run_without_the_hosts_pipe(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv("CLINIC_CHECK_IN_CONTAINER", raising=False)
    assert check.main(["--inside-container"]) == 2
    assert "started by docker/tests/bootstrap.py" in capsys.readouterr().err
    assert check.main(["--something-else"]) == 2


def test_the_compose_environment_carries_the_checkout_tag_and_the_image(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    monkeypatch.setattr(container_mode, "docker_exe", lambda: "docker")  # none inside the image
    plan = _plan(scratch_dir)
    env = plan.compose_env({"PATH": "p", "CLINIC_CHECK_WORKERS": ""})
    assert env["CLINIC_TESTS_TAG"] == "abc"
    assert env["CLINIC_TESTS_CHECKOUT"] == "abc123"
    assert env["CLINIC_TEST_CHECKOUT_TAG"] == "abc123"
    assert "CLINIC_CHECK_WORKERS" not in env  # empty means 'not set', not '0'
    flags = plan.compose_base()
    assert flags[1:3] == ["compose", "-p"] or flags[2] == "-p"
    assert "--profile" in flags and "tests" in flags


@pytest.mark.parametrize(
    ("processors", "expected"), [(1, 1), (2, 1), (8, 4), (16, 8), (24, 12), (64, 12)]
)
def test_the_container_default_is_twelve_workers_or_half_the_processors(
    processors: int, expected: int
) -> None:
    assert check.container_default_workers(processors) == expected


def test_the_container_never_fetches_or_builds_an_image(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
) -> None:
    """The compose command line forbids a pull and a build when the check starts a container."""
    plan, _, _ = stand_in_client
    monkeypatch.undo()  # the real compose_base, with a stand-in for the docker executable
    monkeypatch.setattr(container_mode, "docker_exe", lambda: "docker")
    seen: list[list[str]] = []

    def fake_start(args: list[str], **kwargs: Any) -> Any:
        seen.append(args)
        raise OSError("not started in this test")

    monkeypatch.setattr(container_mode, "start_guarded", fake_start)
    archive = container_mode.TreeArchive(plan.repo / "none", 0, 0, 0, "0" * 64)
    with pytest.raises(ContainerModeError, match="could not be started"):
        container_mode.run_container(plan, archive, {})
    args = seen[0]
    assert args[args.index("--pull") + 1] == "never"
    assert "--build" not in args and "run" in args and "--rm" in args and "-T" in args


def test_a_file_written_while_it_is_being_copied_is_refused(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    repo = _repository(scratch_dir / "repo")
    real_read = container_mode._Hashing.read

    def read_then_touch(self: Any, size: int = -1) -> bytes:
        data = real_read(self, size)
        if self.handle.name.endswith("kept.txt"):
            stamp = os.stat(self.handle.name).st_mtime_ns + 5_000_000_000
            os.utime(self.handle.name, ns=(stamp, stamp))  # an editor saved the file just now
        return data

    monkeypatch.setattr(container_mode._Hashing, "read", read_then_touch)
    with pytest.raises(
        ContainerModeError, match=r"kept\.txt was written while it was being copied"
    ):
        build_archive(repo, scratch_dir / "tree.tar")


def test_a_native_check_refuses_to_start_with_the_container_marker_set(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("CLINIC_CHECK_IN_CONTAINER", "1")
    monkeypatch.setenv("CLINIC_TEST_CHECKOUT_TAG", "0a1b2c")
    ran: list[str] = []
    monkeypatch.setattr(check, "run_steps", lambda *a, **k: ran.append("steps") or [True])  # type: ignore[func-returns-value]
    assert check.main([]) == 2
    assert "must not be set in the shell" in capsys.readouterr().err
    assert ran == []


def test_the_worker_default_follows_the_docker_engine_not_the_host(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path
) -> None:
    _fake(monkeypatch, scratch_dir, {"info": (0, "8\n")})
    assert container_mode.docker_processors() == 8
    assert check.container_default_workers(container_mode.docker_processors()) == 4
    _fake(monkeypatch, scratch_dir, {"info": (1, "")})
    assert container_mode.docker_processors() is None
    _fake(monkeypatch, scratch_dir, {"info": (0, "not a number")})
    assert container_mode.docker_processors() is None


class _BrokenOutput:
    """Stands in for this process's standard output when it cannot be written to."""

    class buffer:
        @staticmethod
        def write(data: bytes) -> int:
            raise BrokenPipeError("the output pipe is closed")

        @staticmethod
        def flush() -> None:
            return None


def test_a_relay_that_cannot_write_stops_the_run_at_once_not_at_the_deadline(
    monkeypatch: pytest.MonkeyPatch,
    stand_in_client: tuple[Plan, container_mode.TreeArchive, Path],
) -> None:
    plan, archive, root = stand_in_client
    monkeypatch.setenv("FAKE_CLIENT_MODE", "hang")  # prints a line, then sleeps ten minutes
    monkeypatch.setattr(sys, "stdout", _BrokenOutput())
    started = time.monotonic()
    result = container_mode.run_container(plan, archive, dict(os.environ), deadline=300.0)
    assert result.relay_failed and not result.timed_out and not result.result_seen
    assert time.monotonic() - started < 60  # not the 300 s deadline
    assert not _alive(int((root / "client.pid").read_text(encoding="utf-8")))


def test_the_summary_names_a_failed_relay(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(container_mode, "preflight", lambda repo, environ=None: _plan(scratch_dir))
    monkeypatch.setattr(container_mode, "ensure_image", lambda plan: None)
    monkeypatch.setattr(container_mode, "sweep", lambda plan: [])
    archive = container_mode.TreeArchive(scratch_dir / "x", 1, 1, 1, "0" * 64, ("wt",))
    monkeypatch.setattr(container_mode, "make_archive", lambda repo: (archive, _Scratch()))
    result = container_mode.ContainerResult(0, 7, 7, False, True, relay_failed=True)
    monkeypatch.setattr(container_mode, "run_container", lambda *a, **k: result)
    monkeypatch.setenv(check.NO_LOCK_ENV, "1")
    assert check.run_container_mode(6, 600.0) == 1
    output = capsys.readouterr().out
    assert "could not write the container's output" in output
    assert "left out 1 nested repositor(ies) or worktree(s)" in output
    assert output.rstrip().splitlines()[-1] == "CHECK FAILED: 0/7 steps passed"


HOLDER_CODE = """
import sys, time
from pathlib import Path
from clinic.devtools.machine_lock import CheckoutLock

CheckoutLock(Path(sys.argv[2]), Path(sys.argv[1])).acquire()
Path(sys.argv[3]).write_text("1")
time.sleep(600)
"""


def test_a_container_check_and_another_check_of_the_same_checkout_exclude_each_other(
    monkeypatch: pytest.MonkeyPatch,
    scratch_dir: Path,
    capsys: pytest.CaptureFixture[str],
    own_lock_directory: Path,
) -> None:
    """LX-03: the container mode takes the checkout's own lock before anything else, so a native
    check (which holds the same lock) and a container check of one checkout never share
    databases; a holder in another process is a real one."""
    from clinic.devtools.machine_lock import CheckoutLock

    ran: list[str] = []

    def spy(name: str) -> Any:
        def call(*args: Any, **kwargs: Any) -> Any:
            ran.append(name)
            raise AssertionError(f"{name} must not run while the checkout is locked")

        return call

    monkeypatch.setattr(container_mode, "preflight", lambda repo, environ=None: _plan(scratch_dir))
    for name in ("ensure_image", "sweep", "make_archive", "run_container"):
        monkeypatch.setattr(container_mode, name, spy(name))
    holder_code = HOLDER_CODE
    held = scratch_dir / "held"
    process = subprocess.Popen(
        [
            sys.executable,
            "-c",
            holder_code,
            str(own_lock_directory),
            str(check.REPO_ROOT),
            str(held),
        ],
        env=controlled_env(),
    )
    try:
        _wait_for(held)
        assert check.run_container_mode(6, 600.0) == 1
        output = capsys.readouterr().out
        assert "is already running" in output
        assert "this checkout is already being checked: the test step did not run" in output
        assert output.rstrip().splitlines()[-1] == "CHECK FAILED: 0/7 steps passed"
        assert ran == []  # not even the sweep or the archive
        # the opposite direction: the container mode holds the lock while it works
        process.kill()
        process.wait()
        deadline = time.monotonic() + 60
        while True:
            probe = CheckoutLock(check.REPO_ROOT, own_lock_directory)
            try:
                probe.acquire()
                break
            except Exception:
                assert time.monotonic() < deadline, "the killed holder never released the lock"
                time.sleep(0.1)
        probe.release()
    finally:
        process.kill()
        process.wait()


def test_the_container_mode_holds_the_checkout_lock_while_the_container_runs(
    monkeypatch: pytest.MonkeyPatch, scratch_dir: Path, own_lock_directory: Path
) -> None:
    from clinic.devtools.machine_lock import CheckoutBusy, CheckoutLock

    monkeypatch.setattr(container_mode, "preflight", lambda repo, environ=None: _plan(scratch_dir))
    monkeypatch.setattr(container_mode, "ensure_image", lambda plan: None)
    monkeypatch.setattr(container_mode, "sweep", lambda plan: [])
    archive = container_mode.TreeArchive(scratch_dir / "x", 1, 1, 1, "0" * 64)
    monkeypatch.setattr(container_mode, "make_archive", lambda repo: (archive, _Scratch()))
    seen: list[str] = []

    def run(*args: Any, **kwargs: Any) -> container_mode.ContainerResult:
        other = CheckoutLock(check.REPO_ROOT, own_lock_directory)
        try:
            other.acquire()
        except CheckoutBusy as error:
            seen.append(str(error))
        else:
            other.release()
            seen.append("NOT HELD")
        return container_mode.ContainerResult(0, 7, 7, False, True)

    monkeypatch.setattr(container_mode, "run_container", run)
    monkeypatch.setenv(check.NO_LOCK_ENV, "1")  # the machine-wide slots are skipped, not this lock
    check.run_container_mode(6, 600.0)
    assert seen and "NOT HELD" not in seen[0] and "is already running" in seen[0]
    # released afterwards
    again = CheckoutLock(check.REPO_ROOT, own_lock_directory)
    again.acquire()
    again.release()
