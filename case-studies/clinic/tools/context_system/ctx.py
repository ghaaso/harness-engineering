"""Context system for Claude Code: hook entry point and operator commands.

  ctx.py hook <Event>                       read a hook payload on stdin, print the hook's output
  ctx.py recall search "<terms>" [--limit N] [--kind user,assistant,...] [--session ID] [--no-subagents]
  ctx.py recall show "<ref>" [--chars N] [--offset N]
  ctx.py status [--project DIR] [--session ID]
  ctx.py measure [--project DIR] [TRANSCRIPT ...] [--json]
  ctx.py focus <state-file> --session ID    pin one session's task state file (--clear to unpin)
  ctx.py prune --days N [--project DIR]     delete archived raw window copies older than N days
  ctx.py doctor [--project DIR]
  ctx.py install --project DIR --python EXE [--window N] [--no-rules]
  ctx.py uninstall --project DIR [--all]

Hooks never fail the session: any error is logged under the runtime directory and
the hook exits 0 without output.
"""
from __future__ import annotations

import argparse
import json
import shutil
import statistics
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import core  # noqa: E402
import hooks  # noqa: E402
import recall  # noqa: E402

HOOK_EVENTS = [("SessionStart", None, 30), ("PreCompact", None, 120), ("PostCompact", None, 60),
               ("UserPromptSubmit", None, 15), ("PostToolBatch", None, 15), ("PreToolUse", "Read", 15)]
SHARED_KEYS = ("autoCompactWindow", "bashOutputMaxChars", "precomputeCompactionEnabled")
INSTALL_RECORD = "context-system-install.json"


def say(text: str) -> None:
    """Operator output as UTF-8 bytes, whatever the console code page (falls back for captured streams)."""
    buffer = getattr(sys.stdout, "buffer", None)
    if buffer is not None:
        buffer.write((text + "\n").encode("utf-8", errors="replace"))
    else:
        sys.stdout.write(text + "\n")


def run_hook(event: str) -> int:
    raw = sys.stdin.buffer.read()
    try:
        payload = json.loads(raw.decode("utf-8", errors="replace") or "{}")
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    try:
        out = hooks.handle(event, payload)
    except Exception:
        hooks.log_error(payload, event)
        return 0
    if out is not None:
        text = out if isinstance(out, str) else json.dumps(out, ensure_ascii=False)
        sys.stdout.buffer.write(text.encode("utf-8"))
    return 0


class UsageError(Exception):
    pass


def cli_root(explicit: str | None) -> Path:
    """Project root for operator commands: explicit, CLAUDE_PROJECT_DIR, else the nearest
    ancestor of the working directory that Claude Code has transcripts for."""
    if explicit and not Path(explicit).is_dir():
        raise UsageError(f"--project is not a directory: {explicit}")
    root = core.project_root(explicit=explicit)
    if explicit or core.transcripts_dir(root).is_dir():
        return root
    for parent in root.parents:
        if core.transcripts_dir(parent).is_dir():
            return parent
    return root


# --- measurement -------------------------------------------------------------------------------

def measure_transcript(path: Path) -> dict:
    turns, seen = [], set()
    cycles = [{"peak": 0, "floor": None, "calls": 0, "rereads": 0}]
    boundaries = []
    reads, writes, recall_calls = Counter(), Counter(), 0
    last_ts = None
    for n, _, rec in core.iter_lines(path):
        if core.is_compact_boundary(rec):
            meta = rec.get("compactMetadata") or {}
            boundaries.append({"line": n, "ts": rec.get("timestamp"), "trigger": meta.get("trigger"),
                               "pre_tokens": meta.get("preTokens"), "last_call_ts": last_ts})
            cycles.append({"peak": 0, "floor": None, "calls": 0, "rereads": 0})
            reads.clear()
            continue
        if rec.get("type") != "assistant":
            continue
        msg = rec.get("message") or {}
        for block in msg.get("content") or []:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            inp = block.get("input") or {}
            command = str(inp.get("command") or "")
            if block.get("name") == "Read":
                key = (inp.get("file_path"), inp.get("offset"), inp.get("limit"))
                reads[key] += 1
                if reads[key] > 1:
                    cycles[-1]["rereads"] += 1
            elif block.get("name") == "Write":
                writes[inp.get("file_path")] += 1
            elif "ctx.py" in command and "recall" in command:
                recall_calls += 1
        ctx = core.usage_tokens(rec)
        if not ctx or msg.get("id") in seen:
            continue
        seen.add(msg.get("id"))
        last_ts = rec.get("timestamp")
        turns.append(ctx)
        cyc = cycles[-1]
        cyc["calls"] += 1
        cyc["peak"] = max(cyc["peak"], ctx)
        if cyc["floor"] is None:
            cyc["floor"] = ctx
    return {"transcript": str(path), "api_calls": len(turns), "start": turns[0] if turns else 0,
            "peak": max(turns) if turns else 0, "mean": int(statistics.mean(turns)) if turns else 0,
            "compactions": boundaries, "cycles": cycles, "recall_calls": recall_calls,
            "full_rewrites": sum(c - 1 for c in writes.values() if c > 1)}


def cmd_measure(args) -> int:
    root = cli_root(args.project)
    paths = [Path(p) for p in args.transcripts] or sorted(core.transcripts_dir(root).glob("*.jsonl"),
                                                          key=lambda p: p.stat().st_mtime)
    results = [measure_transcript(p) for p in paths]
    if args.json:
        say(json.dumps(results, indent=1))
        return 0
    for r in results:
        say(f"{Path(r['transcript']).name}: {r['api_calls']} calls, start {r['start'] // 1000}k, "
            f"peak {r['peak'] // 1000}k, mean {r['mean'] // 1000}k, compactions {len(r['compactions'])}, "
            f"recall calls {r['recall_calls']}, full rewrites {r['full_rewrites']}")
        for i, cyc in enumerate(r["cycles"]):
            if cyc["calls"]:
                say(f"   cycle {i}: {cyc['calls']} calls, floor {(cyc['floor'] or 0) // 1000}k, "
                    f"peak {cyc['peak'] // 1000}k, same-range rereads {cyc['rereads']}")
    return 0


# --- status / focus / prune / doctor -------------------------------------------------------------

def _latest_transcript(root: Path, session: str | None) -> Path | None:
    files = sorted(core.transcripts_dir(root).glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    for f in files:
        if not session or f.stem.startswith(session):
            return f
    return None


def cmd_status(args) -> int:
    root = cli_root(args.project)
    t = _latest_transcript(root, args.session)
    tail = core.tail_status(t) if t else {"tokens": 0, "model": None}
    cc = core.compaction_config(root, tail["model"])
    say(f"Project: {root}")
    say(f"Compaction: {core.describe_compaction(cc)}")
    if not t:
        say(f"No transcripts in {core.transcripts_dir(root)}")
        return 0
    m = measure_transcript(t)
    say(f"Session {t.stem}: ~{tail['tokens'] // 1000}k tokens now ({tail['model']}), peak {m['peak'] // 1000}k, "
        f"{len(m['compactions'])} compactions observed")
    for b in m["compactions"]:
        say(f"   compacted at {b['ts']} ({b['trigger']}), pre-compaction {b['pre_tokens']} tokens")
    runtime = core.runtime_dir_for(str(t), root)
    archive = runtime / "archive" / t.stem
    if archive.is_dir():
        say(f"Archive: {archive} ({len(list(archive.glob('*-restore.md')))} snapshots, "
            f"{len(list(archive.glob('*-consumed')))} restored)")
    errors = runtime / "errors.jsonl"
    if errors.is_file():
        say(f"Hook errors logged: {sum(1 for _ in errors.open(encoding='utf-8'))} ({errors})")
    return 0


def _session_transcript(session: str) -> Path | None:
    hits = list((core.claude_home() / "projects").glob(f"*/{session}.jsonl"))
    return hits[0] if len(hits) == 1 else None


def cmd_focus(args) -> int:
    """Pin (or clear) the task state file for ONE session; other sessions are unaffected."""
    transcript = _session_transcript(args.session)
    if not transcript:
        say(f"No unique transcript for session {args.session}")
        return 1
    root = None
    for _, _, rec in core.iter_lines(transcript, needles=['"cwd"']):
        if rec.get("cwd"):
            root = Path(rec["cwd"])
            break
    if args.project:
        root = Path(args.project).resolve()
    if root is None:
        say("Cannot tell the session's project; pass --project")
        return 1
    state_path = transcript.parent / "context-system" / "sessions" / f"{args.session}.json"
    state = core.read_json(state_path)
    if args.clear:
        state.pop("focus", None)
        core.write_json_atomic(state_path, state)
        say("Focus cleared for this session.")
        return 0
    target = Path(args.path) if Path(args.path).is_absolute() else root / args.path
    if not target.is_file() or not core.inside(target, root):
        say(f"Not a file inside the session's project ({root}): {target}")
        return 1
    state["focus"] = core.rel(target, root)
    core.write_json_atomic(state_path, state)
    say(f"Session {args.session} task state file: {state['focus']}")
    return 0


def cmd_prune(args) -> int:
    """Raw window copies are the bulk of the archive; snapshots, ledgers and summaries are kept."""
    root = cli_root(args.project)
    archive = core.runtime_dir_for(None, root) / "archive"
    cutoff = time.time() - args.days * 86400
    removed = freed = 0
    for path in archive.glob("*/*-window.jsonl"):
        if path.stat().st_mtime < cutoff:
            freed += path.stat().st_size
            path.unlink()
            removed += 1
    say(f"Removed {removed} window copies older than {args.days} days ({freed / 1e6:.1f} MB) from {archive}")
    return 0


def _norm(path: str) -> str:
    return str(path).replace("\\", "/").rstrip("/").lower()


def _own_scripts(project: Path | None = None) -> set[str]:
    """Script paths whose hook entries are ours: this copy, plus the one a previous install recorded."""
    scripts = {_norm(HERE / "ctx.py")}
    if project is not None:
        recorded = core.read_json(project / ".claude" / INSTALL_RECORD).get("script")
        if isinstance(recorded, str) and recorded:
            scripts.add(_norm(recorded))
    return scripts


def _is_ours(hook: dict, scripts: set[str]) -> bool:
    """Exec-form `<our ctx.py> hook <Event>` only; another tool's ctx.py is not ours."""
    args = hook.get("args")
    if not isinstance(args, list) or "hook" not in args:
        return False
    return any(isinstance(a, str) and _norm(a) in scripts for a in args)


def _hook_groups(settings: dict):
    hooks_cfg = settings.get("hooks")
    if not isinstance(hooks_cfg, dict):
        return
    for event, groups in hooks_cfg.items():
        for group in groups if isinstance(groups, list) else []:
            if isinstance(group, dict):
                yield event, group


def _hook_entries(settings: dict, scripts: set[str] | None = None) -> list[tuple[str, dict]]:
    scripts = scripts or _own_scripts()
    found = []
    for event, group in _hook_groups(settings):
        for h in group.get("hooks") or []:
            if isinstance(h, dict) and _is_ours(h, scripts):
                found.append((event, h))
    return found


def cmd_doctor(args) -> int:
    root = cli_root(args.project)
    ok = True
    say(f"Project: {root}\nPython running this check: {sys.executable}")
    merged: dict = {}
    entries = []
    scripts = _own_scripts(root)
    for name in ("settings.json", "settings.local.json"):
        data, error = core.read_json_strict(root / ".claude" / name)
        if error:
            say(f"UNPARSABLE settings: {error}")
            ok = False
        merged.update(data)
        entries += _hook_entries(data, scripts)
    events = sorted({e for e, _ in entries})
    missing = [e for e, _, _ in HOOK_EVENTS if e not in events]
    say(f"Hooks registered: {', '.join(events) or 'none'}" + (f"; missing: {', '.join(missing)}" if missing else ""))
    ok &= not missing
    counts = Counter(e for e, _ in entries)
    for event, n in counts.items():
        if n > 1:
            say(f"  DUPLICATE: {event} is registered {n} times")
            ok = False
    for event, h in entries:
        exe = Path(h.get("command") or "")
        script = next((a for a in h.get("args") or [] if str(a).endswith("ctx.py")), "")
        if not exe.is_file() or not Path(script).is_file():
            say(f"  BROKEN {event}: interpreter {exe} exists={exe.is_file()}, script {script} "
                f"exists={Path(script).is_file()}")
            ok = False
    cc = core.compaction_config(root, "claude-opus-5-5")
    say(f"Compaction: {core.describe_compaction(cc)}")
    ok &= cc["enabled"] and cc["window"] < 1_000_000
    precompute_off = merged.get("precomputeCompactionEnabled") is False
    say("Background (precomputed) compaction: " + ("disabled, as the snapshot timing requires" if precompute_off
        else "NOT disabled in project settings; a snapshot could then predate later state updates"))
    ok &= precompute_off
    rules = root / ".claude" / "rules" / "context-system.md"
    say(f"Rules file: {'present' if rules.is_file() else 'missing'} ({rules})")
    tdir = core.transcripts_dir(root)
    if tdir.is_dir():
        runtime = core.runtime_dir_for(None, root)
        try:
            runtime.mkdir(parents=True, exist_ok=True)
            probe = runtime / ".doctor"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
            say(f"Runtime dir writable: {runtime}")
        except OSError as exc:
            say(f"Runtime dir NOT writable: {runtime} ({exc})")
            ok = False
    else:
        say(f"No Claude Code transcripts for this project yet ({tdir}); runtime dir not checked")
    start = time.perf_counter()
    proc = subprocess.run([sys.executable, "-I", "-B", str(HERE / "ctx.py"), "hook", "PostToolBatch"],
                          input=b"{}", capture_output=True, timeout=30)
    say(f"No-op hook round trip: {(time.perf_counter() - start) * 1000:.0f} ms, exit {proc.returncode}")
    ok &= proc.returncode == 0
    say("Doctor: OK" if ok else "Doctor: problems found")
    return 0 if ok else 1


# --- install / uninstall -------------------------------------------------------------------------

def _hooks_block(python: str, script: str) -> dict:
    block: dict = {}
    for event, matcher, timeout in HOOK_EVENTS:
        group = {"hooks": [{"type": "command", "command": python, "args": ["-I", "-B", script, "hook", event],
                            "timeout": timeout}]}
        if matcher:
            group["matcher"] = matcher
        block.setdefault(event, []).append(group)
    return block


def _strip_ours(settings: dict, scripts: set[str]) -> dict:
    """Remove only our own hook entries; other tools' entries and odd shapes are left exactly as found."""
    hooks_cfg = settings.get("hooks")
    if not isinstance(hooks_cfg, dict):
        return settings
    for event in list(hooks_cfg):
        if not isinstance(hooks_cfg[event], list):
            continue
        groups = []
        for group in hooks_cfg[event]:
            if not isinstance(group, dict) or not isinstance(group.get("hooks"), list):
                groups.append(group)
                continue
            kept = [h for h in group["hooks"] if not (isinstance(h, dict) and _is_ours(h, scripts))]
            if kept:
                groups.append(dict(group, hooks=kept))
        if groups:
            hooks_cfg[event] = groups
        else:
            del hooks_cfg[event]
    if not hooks_cfg:
        settings.pop("hooks", None)
    return settings


def cmd_install(args) -> int:
    root = Path(args.project).resolve()
    python = str(Path(args.python).resolve())
    if not root.is_dir():
        say(f"Project is not a directory: {root}")
        return 1
    if not Path(python).is_file():
        say(f"Interpreter not found: {python}")
        return 1
    script = str((HERE / "ctx.py").resolve())
    claude_dir = root / ".claude"
    local_path, shared_path = claude_dir / "settings.local.json", claude_dir / "settings.json"
    local, err1 = core.read_json_strict(local_path)
    shared, err2 = core.read_json_strict(shared_path)
    if not err1 and "hooks" in local and not isinstance(local["hooks"], dict):
        err1 = f"{local_path} has a 'hooks' value that is not an object"
    if err1 or err2:
        say("Refusing to install: " + "; ".join(e for e in (err1, err2) if e)
            + ". Fix or move the file first; nothing was changed.")
        return 1
    record_path = claude_dir / INSTALL_RECORD
    record = core.read_json(record_path)
    previous = record.get("previous") if isinstance(record.get("previous"), dict) else {}
    wanted = {"precomputeCompactionEnabled": False}
    if args.window:
        wanted["autoCompactWindow"] = int(args.window)
    if "bashOutputMaxChars" not in shared:
        wanted["bashOutputMaxChars"] = 12000
    for key, value in wanted.items():
        entry = previous.get(key) if isinstance(previous.get(key), dict) else None
        if entry is None:  # remember what was there before the FIRST install only
            entry = previous[key] = {"had": key in shared, "value": shared.get(key)}
        entry["set"] = value  # what we wrote, so uninstall can tell whether the user changed it since
        shared[key] = value
    local = _strip_ours(local, _own_scripts(root))
    for event, groups in _hooks_block(python, script).items():
        local.setdefault("hooks", {}).setdefault(event, []).extend(groups)
    core.write_json_atomic(local_path, local)
    core.write_json_atomic(shared_path, shared)
    core.write_json_atomic(record_path, {"previous": previous, "script": script, "python": python})
    if not args.no_rules:
        rules = claude_dir / "rules" / "context-system.md"
        rules.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(HERE / "templates" / "rules.md", rules)
    gitignore = root / ".gitignore"
    if gitignore.is_file():
        have = gitignore.read_text(encoding="utf-8")
        missing = [line for line in (".claude/settings.local.json", ".claude/" + INSTALL_RECORD) if line not in have]
        if missing:
            with open(gitignore, "a", encoding="utf-8") as fh:
                fh.write("\n# Machine-local Claude Code files (context-system hooks name a local interpreter)\n"
                         + "\n".join(missing) + "\n")
    say(f"Installed hooks in {local_path} (script {script}); settings in {shared_path}"
        + ("" if args.no_rules else "; rules in .claude/rules/context-system.md"))
    return 0


def cmd_uninstall(args) -> int:
    root = Path(args.project).resolve()
    claude_dir = root / ".claude"
    local_path, shared_path = claude_dir / "settings.local.json", claude_dir / "settings.json"
    local, err1 = core.read_json_strict(local_path)
    shared, err2 = core.read_json_strict(shared_path)
    if err1 or (args.all and err2):
        say("Refusing to uninstall: " + "; ".join(e for e in (err1, err2) if e) + ". Nothing was changed.")
        return 1
    if local_path.is_file():
        core.write_json_atomic(local_path, _strip_ours(local, _own_scripts(root)))
    if not args.all:
        say("Context-system hooks removed.")
        return 0
    record_path = claude_dir / INSTALL_RECORD
    previous = core.read_json(record_path).get("previous")
    restored, kept = [], []
    for key, was in (previous if isinstance(previous, dict) else {}).items():
        if key not in SHARED_KEYS or not isinstance(was, dict):
            continue
        if key in shared and shared[key] != was.get("set"):
            kept.append(key)  # changed by hand since the install: the user's value stays
        elif was.get("had"):
            shared[key] = was.get("value")
            restored.append(key)
        elif key in shared:
            del shared[key]
            restored.append(key)
    if restored and shared_path.is_file():
        core.write_json_atomic(shared_path, shared)
    record_path.unlink(missing_ok=True)
    (claude_dir / "rules" / "context-system.md").unlink(missing_ok=True)
    if not isinstance(previous, dict):
        left = [k for k in SHARED_KEYS if k in shared]
        say("Context-system hooks and rules removed. No install record was found, so shared settings were left "
            "as they are" + (f" ({', '.join(left)} remain in {shared_path}; remove them by hand if unwanted)."
                             if left else "."))
    else:
        say("Context-system hooks and rules removed; settings put back to their pre-install values"
            + (f" ({', '.join(restored)})" if restored else " (nothing needed changing)")
            + (f"; left alone because they were changed after the install: {', '.join(kept)}." if kept else "."))
    return 0


# --- recall --------------------------------------------------------------------------------------

def cmd_recall(args) -> int:
    root = cli_root(args.project)
    tdir = core.transcripts_dir(root)
    if not tdir.is_dir():
        say(f"No Claude Code transcripts for project {root} (looked in {tdir}). Pass --project <root>.")
        return 1
    if args.action == "search":
        words, phrases = recall.parse_terms(args.query)
        if not words and not phrases:
            say("The query has no searchable terms (each needs at least 2 characters).")
            return 1
        kinds = {k.strip() for k in args.kind.split(",") if k.strip()} if args.kind else None
        hits = recall.search(args.query, root, limit=args.limit, kinds=kinds, session=args.session,
                             include_subagents=not args.no_subagents)
        say(recall.format_hits(hits))
    else:
        say(recall.show(args.query, root, chars=args.chars, offset=args.offset))
    return 0


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "hook":
        return run_hook(argv[1])
    p = argparse.ArgumentParser(prog="ctx.py", description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("recall")
    r.add_argument("action", choices=["search", "show"])
    r.add_argument("query")
    r.add_argument("--project")
    r.add_argument("--limit", type=int, default=8)
    r.add_argument("--kind")
    r.add_argument("--session")
    r.add_argument("--no-subagents", action="store_true")
    r.add_argument("--chars", type=int, default=4000)
    r.add_argument("--offset", type=int, default=0)
    s = sub.add_parser("status")
    s.add_argument("--project")
    s.add_argument("--session")
    m = sub.add_parser("measure")
    m.add_argument("transcripts", nargs="*")
    m.add_argument("--project")
    m.add_argument("--json", action="store_true")
    f = sub.add_parser("focus")
    f.add_argument("path", nargs="?")
    f.add_argument("--session", required=True)
    f.add_argument("--clear", action="store_true")
    f.add_argument("--project")
    pr = sub.add_parser("prune")
    pr.add_argument("--days", type=int, required=True)
    pr.add_argument("--project")
    d = sub.add_parser("doctor")
    d.add_argument("--project")
    i = sub.add_parser("install")
    i.add_argument("--project", required=True)
    i.add_argument("--python", required=True)
    i.add_argument("--window", type=int)
    i.add_argument("--no-rules", action="store_true")
    u = sub.add_parser("uninstall")
    u.add_argument("--project", required=True)
    u.add_argument("--all", action="store_true")
    args = p.parse_args(argv)
    if args.cmd == "focus" and not args.clear and not args.path:
        p.error("focus needs a path or --clear")
    commands = {"recall": cmd_recall, "status": cmd_status, "measure": cmd_measure, "focus": cmd_focus,
                "prune": cmd_prune, "doctor": cmd_doctor, "install": cmd_install, "uninstall": cmd_uninstall}
    try:
        return commands[args.cmd](args)
    except UsageError as exc:
        say(str(exc))
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
