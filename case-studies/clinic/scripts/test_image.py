"""Build or inspect the Linux test image used by the check's container mode.

    uv run --locked python scripts/test_image.py build    # build clinic-tests:<tag> if missing
    uv run --locked python scripts/test_image.py status   # the image this tree needs; is it there?
    uv run --locked python scripts/test_image.py tag      # print the tag only
    uv run --locked python scripts/test_image.py selftest # kill a real host; its container must go
    uv run --locked python scripts/test_image.py exec -- pytest --collect-only -q
        # run one command in a test container on a verified copy of the working tree (for
        # investigations, such as comparing the tests collected on Linux and on Windows; not a gate)

The tag is a hash of docker/tests/*, uv.lock and the install-relevant part of pyproject.toml, so
the image is built again only when one of them changes. The check never builds the image itself
(it downloads from the network): a missing image fails the container mode with the build command
in the message. Only the image is built; nothing is started. `exec` takes the same locks as a
check (this checkout's own lock and a machine-wide slot). docs/tasks/linux-test-runner/task.md.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from clinic.devtools import container_mode  # noqa: E402
from clinic.devtools.check import locked_test_step  # noqa: E402


def exists(image: str) -> bool:
    return (
        container_mode.docker_run("image", "inspect", "--format", "{{.Id}}", image).returncode == 0
    )


def run_command(words: list[str]) -> int:
    """One command in a test container, under the same locks as a check (this checkout's own
    lock and a machine-wide slot), so it cannot share test databases with a check of this
    checkout; the command's exit status is ours. Not a gate."""
    if words[:1] == ["--"]:
        words = words[1:]
    if not words:
        print("usage: test_image.py exec -- COMMAND...", file=sys.stderr)
        return 2
    exit_code: list[int] = []

    def under_lock() -> bool:
        plan = container_mode.preflight(REPO_ROOT)
        removed = container_mode.sweep(plan)
        if removed:
            print(f"removed leftover test container(s): {', '.join(removed)}", flush=True)
        archive, scratch = container_mode.make_archive(REPO_ROOT)
        with scratch:
            result = container_mode.run_container(
                plan, archive, dict(os.environ), command=words, deadline=3600.0
            )
        exit_code.append(result.exit_code)
        return result.exit_code == 0

    def guarded() -> bool:
        try:
            return under_lock()
        except container_mode.ContainerModeError as error:
            print(f"test_image.py: {error}", file=sys.stderr)
            return False

    try:
        container_mode.preflight(REPO_ROOT)  # fail fast, before waiting for a lock
    except container_mode.ContainerModeError as error:
        print(f"test_image.py: {error}", file=sys.stderr)
        return 1
    ok, note = locked_test_step(guarded)
    print(f"test_image.py: {note}", flush=True)
    if not exit_code:  # the container never ran: a lock was refused or the setup failed
        return 1
    return exit_code[0] if exit_code[0] else (0 if ok else 1)


def selftest() -> int:
    """Start a real container through a real host process, kill that process with no clean-up
    (``TerminateProcess`` / SIGKILL), and require that the container is gone within 30 seconds."""
    try:
        plan = container_mode.preflight(REPO_ROOT)
    except container_mode.ContainerModeError as error:
        print(f"selftest: {error}", file=sys.stderr)
        return 1
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "exec",
        "--",
        "sleep",
        "600",
    ]
    label = f"label={container_mode.CHECKOUT_LABEL}={plan.checkout}"
    existing = container_mode.docker_run("ps", "-a", "--filter", label, "--format", "{{.Names}}")
    if existing.stdout.strip():
        print(
            "selftest: a test container of this checkout exists already "
            f"({existing.stdout.split()[0]}); it may belong to a running check, so nothing was "
            "started",
            file=sys.stderr,
        )
        return 1
    host = subprocess.Popen(command, cwd=REPO_ROOT, stdout=subprocess.DEVNULL)
    try:
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            seen = container_mode.docker_run("ps", "--filter", label, "--format", "{{.Names}}")
            if seen.stdout.strip():
                break
            time.sleep(1)
        else:
            print("selftest: the container never appeared", file=sys.stderr)
            return 1
        time.sleep(3)  # let the entry point start the command
        print(f"selftest: container {seen.stdout.strip()} is up; killing its host (pid {host.pid})")
        host.kill()
        host.wait()
        killed = time.monotonic()
        while time.monotonic() - killed < 30:
            left = container_mode.docker_run(
                "ps", "-a", "--filter", label, "--format", "{{.Names}}"
            )
            if not left.stdout.strip():
                gone = time.monotonic() - killed
                print(f"selftest: PASSED, the container was gone {gone:.1f} s later")
                return 0
            time.sleep(0.25)
        print("selftest: FAILED, the container is still there 30 s after its host was killed")
        return 1
    finally:
        if host.poll() is None:
            host.kill()
            host.wait()
        for name in container_mode.docker_run(
            "ps", "-a", "--filter", label, "--format", "{{.Names}}"
        ).stdout.split():
            container_mode.docker_run("rm", "-f", name)


def main(argv: list[str]) -> int:
    command = argv[0] if argv else "status"
    tag = container_mode.image_tag(REPO_ROOT)
    image = f"{container_mode.IMAGE_REPOSITORY}:{tag}"
    if command == "tag":
        print(tag)
        return 0
    if command == "status":
        print(f"{image}: {'present' if exists(image) else 'MISSING'}")
        return 0
    if command == "exec":
        return run_command(argv[1:])
    if command == "selftest":
        return selftest()
    if command != "build" or len(argv) > 1:
        print(
            "usage: test_image.py [build|status|tag|selftest|exec -- COMMAND...]", file=sys.stderr
        )
        return 2
    if exists(image):
        print(f"{image} already exists; nothing to build")
        return 0
    started = time.monotonic()
    command_line = [
        container_mode.docker_exe(),
        "build",
        "-f",
        str(REPO_ROOT / "docker" / "tests" / "Dockerfile"),
        "-t",
        image,
        str(REPO_ROOT),
    ]
    print(f"building {image} (downloads from Docker Hub, PyPI, Debian and Playwright)", flush=True)
    done = subprocess.run(command_line, cwd=REPO_ROOT, check=False)
    print(f"build exit {done.returncode} after {time.monotonic() - started:.0f}s")
    return done.returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
