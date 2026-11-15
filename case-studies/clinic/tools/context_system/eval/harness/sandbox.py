"""Arms and their sandboxes.

Each arm lives in <run>/<short dir>/ with its own scenario project (p/), its own copy of the context
system (cs/, without eval/), its own .claude settings, task state and (through its own project slug)
its own transcripts and recall archive under <claude config>/projects/<slug>/.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

from .common import COPY_EXCLUDE, CTX_SRC, copytree_filtered, manifest, read_json, run_retry, sync_tree, write_json

sys.path.insert(0, str(CTX_SRC))
import core  # noqa: E402  (the system's own slug / threshold / transcript helpers; read-only use)

ARMS: dict[str, dict[str, Any]] = {
    "system": {"dir": "sys", "window": True, "compacts": True,
               "what": "context system installed by its own ctx.py install (hooks, rules, window)"},
    "native": {"dir": "nat", "window": True, "compacts": True,
               "what": "autoCompactWindow + precomputeCompactionEnabled=false only; no hooks, no rules"},
    "handoff": {"dir": "hof", "window": False, "compacts": False,
                "what": "no compaction window; handoff prompt past a set context size, then a fresh session"},
    "reference": {"dir": "ref", "window": False, "compacts": False,
                  "what": "full context, no compaction, no handoff (only when the history fits)"},
}
LEAK_KEYS = ("autoCompactWindow", "autoCompactEnabled", "precomputeCompactionEnabled", "hooks", "modelSettings")
NOTE_KEYS = ("model", "effortLevel", "ultracode", "env", "permissions", "outputStyle", "enabledPlugins")


def default_root() -> Path:
    return Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local")) / "ctx-eval"


def claude_home() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or (Path.home() / ".claude"))


def arm_paths(run_dir: Path, name: str) -> dict[str, Path]:
    root = Path(run_dir) / ARMS[name]["dir"]
    return {"root": root, "project": root / "p", "ctx": root / "cs", "snap": root / "snap", "eval": root / "eval",
            "logs": root / "logs", "prompts": root / "prompts"}


def transcripts_dir(project: Path, home: Path) -> Path:
    return Path(home) / "projects" / core.project_slug(Path(project).resolve())


def path_budget(project: Path, home: Path) -> dict[str, Any]:
    """Slug length and the longest path the system or Claude Code would create for this project."""
    slug = core.project_slug(Path(project).resolve())
    session = "0" * 36
    tdir = Path(home) / "projects" / slug
    longest = max(
        len(str(tdir / "context-system" / "archive" / session / "s0001-c001-20261010T000000Z-restore-2.md")),
        len(str(tdir / "context-system" / "archive" / session / "subagent-b12-20261010T000000Z-summary-2.md")),
        len(str(tdir / session / "subagents" / "workflows" / ("w" * 24) / ("agent-" + "a" * 40 + ".jsonl"))))
    return {"slug": slug, "slug_len": len(slug), "hashed": len(slug) > 200, "longest_path": longest,
            "ok": len(slug) < 200 and longest < 260}


def settings_leaks(home: Path) -> dict[str, Any]:
    """User-level and managed settings reach every arm. Keys that define an arm must not be set there."""
    out: dict[str, Any] = {"blocking": [], "notes": []}
    sources = [(Path(home) / "settings.json", "user")] + [(p, "managed") for p in core.MANAGED_SETTINGS]
    for path, label in sources:
        if not path.is_file():
            continue
        data = core.read_json(path)
        for key in LEAK_KEYS:
            if key in data:
                out["blocking"].append(f"{label} settings ({path}) set {key}")
        for key in NOTE_KEYS:
            if key in data:
                out["notes"].append(f"{label} settings set {key} (shared by every arm)")
    for name in ("CLAUDE.md", "CLAUDE.local.md"):
        if (Path(home) / name).is_file():
            out["notes"].append(f"user memory file {Path(home) / name} is loaded in every arm")
    return out


def ancestor_context(project: Path, home: Path) -> list[str]:
    """CLAUDE.md files or .claude directories above the sandbox that Claude Code might also load."""
    found = []
    for parent in Path(project).resolve().parents:
        for name in ("CLAUDE.md", "CLAUDE.local.md", ".claude"):
            p = parent / name
            if p.exists() and p.resolve() != Path(home).resolve():
                found.append(str(p))
    return found


def install_command(paths: dict[str, Path], python: str, window: int) -> list[str]:
    return [python, "-I", "-B", "-X", "utf8", str(paths["ctx"] / "ctx.py"), "install", "--project",
            str(paths["project"]), "--python", python, "--window", str(window)]


def tool_env(project: Path, home: Path) -> dict[str, str]:
    """Environment for running the sandbox's own ctx.py from the harness (install, doctor, measure)."""
    env = dict(os.environ)
    env["CLAUDE_PROJECT_DIR"] = str(project)
    env["CLAUDE_CONFIG_DIR"] = str(home)
    return env


def create_arm(run_dir: Path, name: str, scenario, python: str, window: int, home: Path) -> dict[str, Any]:
    """Build one arm's sandbox. Returns its description (paths as strings, settings written, install output)."""
    paths = arm_paths(run_dir, name)
    if paths["root"].exists():
        raise RuntimeError(f"arm directory already exists: {paths['root']}")
    scenario.write_project(paths["project"])
    copytree_filtered(CTX_SRC, paths["ctx"], COPY_EXCLUDE)
    claude_dir = paths["project"] / ".claude"
    claude_dir.mkdir(parents=True, exist_ok=True)
    info: dict[str, Any] = {"name": name, **{k: str(v) for k, v in paths.items()}, "install": None}
    if name == "system":
        cmd = install_command(paths, python, window)
        proc = run_retry(cmd, capture_output=True, timeout=120, env=tool_env(paths["project"], home))
        info["install"] = {"argv": cmd, "exit": proc.returncode,
                           "out": proc.stdout.decode("utf-8", errors="replace").strip()}
        if proc.returncode != 0:
            raise RuntimeError(f"ctx.py install failed in {paths['project']}: {info['install']['out']} "
                               f"{proc.stderr.decode('utf-8', errors='replace')[-400:]}")
    elif name == "native":
        write_json(claude_dir / "settings.json", {"autoCompactWindow": int(window),
                                                  "precomputeCompactionEnabled": False})
    else:
        write_json(claude_dir / "settings.json", {})
    info["budget"] = path_budget(paths["project"], home)
    info["transcripts"] = str(transcripts_dir(paths["project"], home))
    return info


def verify_arm(info: dict[str, Any], python: str, window: int) -> list[str]:
    """Problems with an arm's sandbox (empty list = isolated and configured as specified)."""
    problems = []
    name, project, ctx = info["name"], Path(info["project"]), Path(info["ctx"])
    shared, local = read_json(project / ".claude" / "settings.json"), read_json(project / ".claude" / "settings.local.json")
    rules = project / ".claude" / "rules" / "context-system.md"
    src = manifest(CTX_SRC, COPY_EXCLUDE)
    if manifest(ctx, COPY_EXCLUDE) != src:
        problems.append(f"{name}: context-system copy differs from the source")
    if (ctx / "eval").exists():
        problems.append(f"{name}: eval/ was copied into the sandbox")
    if not info["budget"]["ok"]:
        problems.append(f"{name}: path budget exceeded {info['budget']}")
    commands = [h for groups in (local.get("hooks") or {}).values() for g in groups for h in g.get("hooks") or []]
    if name == "system":
        if shared.get("autoCompactWindow") != window or shared.get("precomputeCompactionEnabled") is not False:
            problems.append(f"system: settings.json is {shared}")
        events = set((local.get("hooks") or {}))
        need = {"SessionStart", "PreCompact", "PostCompact", "UserPromptSubmit", "PostToolBatch", "PreToolUse"}
        if events != need:
            problems.append(f"system: hook events {sorted(events)}")
        for h in commands:
            args = [str(a) for a in h.get("args") or []]
            if os.path.normcase(h.get("command", "")) != os.path.normcase(str(Path(python).resolve())):
                problems.append(f"system: hook interpreter is {h.get('command')}")
            if not any(os.path.normcase(a) == os.path.normcase(str((ctx / 'ctx.py').resolve())) for a in args):
                problems.append(f"system: a hook does not call this arm's own copy: {args}")
        if not rules.is_file():
            problems.append("system: rules file missing")
    else:
        want = {"autoCompactWindow": window, "precomputeCompactionEnabled": False} if name == "native" else {}
        if shared != want:
            problems.append(f"{name}: settings.json is {shared}, expected {want}")
        if local or commands or rules.exists() or (project / ".claude" / "context-system-install.json").exists():
            problems.append(f"{name}: has hooks, rules or an install record")
    return problems


def snapshot(project: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(project, dest)


def restore(project: Path, snap: Path) -> dict[str, list[str]]:
    """Make the project identical to the snapshot again (evaluation branches must not leak into each other)."""
    changed = sync_tree(snap, project)
    if manifest(project) != manifest(snap):
        raise RuntimeError(f"restore of {project} from {snap} did not converge")
    return changed


def collect_outcome(project: Path, base: dict[str, list], out_dir: Path, final_text: str, report: Any,
                    base_snapshot: Path, setup_files: dict[str, str]) -> dict[str, Any]:
    """Save what an evaluation branch changed: the diff, the changed files, the reply and the report."""
    from .common import diff_manifests, write_text
    after = manifest(project)
    diff = diff_manifests(base, after)
    for rel in diff["added"] + diff["modified"]:
        target = out_dir / "files" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(project / rel, target)
    for rel, text in setup_files.items():
        write_text(out_dir / "base_extra" / rel, text)
    outcome = {"diff": diff, "final_text": final_text or "", "report": report, "base": base,
               "base_snapshot": str(base_snapshot)}
    write_json(out_dir / "outcome.json", outcome)
    return outcome


def archive_session(tdir: Path, session: str, dest: Path) -> list[str]:
    """Move one session's transcript, subagent transcripts and context-system state out of the arm's
    transcript directory, so later branches (and their recall searches) cannot see an evaluation branch."""
    moved = []
    dest.mkdir(parents=True, exist_ok=True)
    for src, name in ((tdir / f"{session}.jsonl", f"{session}.jsonl"), (tdir / session, f"{session}-files"),
                      (tdir / "context-system" / "sessions" / f"{session}.json", f"{session}-ctx-state.json"),
                      (tdir / "context-system" / "archive" / session, f"{session}-ctx-archive")):
        if src.exists():
            shutil.move(str(src), str(dest / name))
            moved.append(name)
    return moved


def parse_report(text: str) -> Any:
    """The first JSON object in a reply (None when there is none)."""
    if not text:
        return None
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            depth += {"{": 1, "}": -1}.get(text[i], 0)
            if depth == 0:
                try:
                    data = json.loads(text[start:i + 1])
                    return data if isinstance(data, dict) else None
                except ValueError:
                    break
        start = text.find("{", start + 1)
    return None
