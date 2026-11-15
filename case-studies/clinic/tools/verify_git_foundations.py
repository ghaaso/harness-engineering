"""Reproduce committed workflow checks and exercise hooks in a disposable clone."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from coding_workflow import ROOT, now, save_evidence


def verify(git, root):
    def run(args, cwd, **kwargs):
        return subprocess.run([git, *args], cwd=cwd, capture_output=True, **kwargs)

    identity = ["-c", "user.name=Disposable workflow verification", "-c", "user.email=workflow-test@localhost"]
    base = run(["rev-parse", "HEAD"], root, text=True)
    if base.returncode:
        raise ValueError("A committed local Git baseline is required")
    # Validate the resolved deletion scope before TemporaryDirectory cleanup.
    with tempfile.TemporaryDirectory(prefix="clinic-workflow-git-check-") as temporary:
        temporary_root = Path(temporary).resolve()
        if not temporary_root.is_relative_to(Path(tempfile.gettempdir()).resolve()) or not temporary_root.name.startswith("clinic-workflow-git-check-"):
            raise ValueError("Unexpected disposable cleanup path")
        copy = temporary_root / "project"
        cloned = run(["clone", "--quiet", "--no-hardlinks", str(root), str(copy)], root, text=True)
        if cloned.returncode:
            raise ValueError(cloned.stderr)
        run(["remote", "remove", "origin"], copy, check=True)
        checks = {}
        for command in ("doctor", "verify"):
            result = subprocess.run([sys.executable, str(copy / "tools/coding_workflow.py"), command], cwd=copy, capture_output=True, text=True)
            checks[command] = {"exitCode": result.returncode, "result": json.loads(result.stdout), "stderr": result.stderr}
        tracked = [name.decode() for name in run(["ls-files", "-z"], copy, check=True).stdout.split(b"\0") if name]
        hook_mode = run(["ls-files", "--stage", "tools/git-hooks/pre-commit"], copy, check=True).stdout.decode().split()[0]
        mismatches = []
        for name in tracked:
            blob = run(["show", "HEAD:" + name], copy, check=True).stdout
            if blob != (copy / name).read_bytes():
                mismatches.append(name)
        for key, value in (("core.hooksPath", "tools/git-hooks"), ("clinicWorkflow.python", sys.executable)):
            run(["config", "--local", key, value], copy, check=True)
        probe = copy / "docs/tasks/hook-probe/task.md"
        probe.parent.mkdir(parents=True)
        probe.write_text("Status: synthetic\n## Next action\nVerify the local hook.\n", encoding="utf-8")
        run(["add", "docs/tasks/hook-probe/task.md"], copy, check=True)
        valid = run([*identity, "commit", "-m", "Synthetic valid hook probe"], copy, text=True)
        good_head = run(["rev-parse", "HEAD"], copy, text=True, check=True).stdout.strip()
        original = (copy / "README.md").read_bytes()
        (copy / "README.md").write_bytes(original + b"\n[Deliberately broken fixture link](missing-for-hook.md)\n")
        run(["add", "README.md"], copy, check=True)
        invalid = run([*identity, "commit", "-m", "Synthetic rejected link probe"], copy, text=True)
        kept_head = run(["rev-parse", "HEAD"], copy, text=True, check=True).stdout.strip() == good_head
        run(["config", "--local", "--unset", "clinicWorkflow.python"], copy, check=True)
        missing_config = run([*identity, "commit", "-m", "Synthetic missing interpreter probe"], copy, text=True)
        run(["config", "--local", "clinicWorkflow.python", str(copy / "does-not-exist-python")], copy, check=True)
        invalid_config = run([*identity, "commit", "-m", "Synthetic invalid interpreter probe"], copy, text=True)
        patterns = [".env", ".env.production", ".venv/cache.txt", "__pycache__/fixture.pyc", "tmp/fixture.txt", "output/learning-design-review/fixture.pdf"]
        # Binary NUL framing avoids Windows text-mode CRLF conversion becoming a filename.
        ignored = run(["check-ignore", "-z", "--stdin"], copy, input=b"\0".join(name.encode() for name in patterns) + b"\0")
        actual_ignored = [name.decode() for name in ignored.stdout.split(b"\0") if name]
        kept = run(["check-ignore", "-z", "--stdin"], copy, input=b".env.example\0sources/MD Health Clinic Inventory final.pdf\0")
        validations = {
            "checkoutCommandsPass": all(item["exitCode"] == 0 and item["result"]["ok"] for item in checks.values()),
            "trackedBytesPreserved": not mismatches,
            "hookTrackedExecutable": hook_mode == "100755",
            "validCommitAccepted": valid.returncode == 0,
            "brokenLinkRejected": invalid.returncode != 0 and "missing file target" in invalid.stdout + invalid.stderr,
            "failedCommitDidNotAdvanceHead": kept_head,
            "missingInterpreterRejected": missing_config.returncode != 0 and "Configure clinicWorkflow.python" in missing_config.stdout + missing_config.stderr,
            "invalidInterpreterRejected": invalid_config.returncode != 0,
            "ignorePolicyMatches": set(actual_ignored) == set(patterns),
            "exampleAndSourceKept": kept.returncode == 1 and not kept.stdout,
        }
        return {"ok": all(validations.values()), "createdAtUtc": now(), "kind": "Git checkout reproduction and actual hook probes",
                "baseCommit": base.stdout.strip(), "gitExecutable": git, "pythonExecutable": sys.executable,
                "checkedTrackedFiles": len(tracked), "byteMismatches": mismatches, "checkoutCommands": checks,
                "trackedHookMode": hook_mode,
                "validations": validations, "actualIgnoredFixtures": actual_ignored,
                "hookProbes": {name: {"exitCode": result.returncode, "log": result.stdout + result.stderr}
                               for name, result in (("valid", valid), ("brokenLink", invalid), ("missingInterpreter", missing_config), ("invalidInterpreter", invalid_config))},
                "externalRemotes": [], "limits": "Same machine/interpreter; committed HEAD only; no remote CI, independent human/machine or clinic acceptance"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--git", default=shutil.which("git"))
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        if not args.git:
            raise ValueError("Select an installed Git executable with --git")
        result = verify(args.git, args.root.resolve())
        save_evidence(args.root.resolve(), args.output, result)
        print(json.dumps({key: result[key] for key in ("ok", "baseCommit", "checkedTrackedFiles", "validations")}, indent=2))
        return 0 if result["ok"] else 2
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
