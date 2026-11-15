"""Per-arm measurements read from transcripts, and what a transcript can prove about the run profile.

Context sizes, cycles and same-range rereads use the system's own definitions (ctx.py measure is run
alongside as a cross-check); pauses, tokens, repeated work and profile evidence are added here.
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from .common import CTX_SRC, is_under

sys.path.insert(0, str(CTX_SRC))
import core  # noqa: E402
import ctx as ctx_cli  # noqa: E402  (measure_transcript)

SHELL = {"Bash", "PowerShell"}
WRITES = {"Write", "Edit", "MultiEdit", "NotebookEdit"}
NOTE_MARK = "[context-system]"


def _ts(value: Any) -> float | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _user_text(rec: dict[str, Any]) -> str | None:
    """Text of a typed user prompt (None for tool results, meta records and compaction summaries)."""
    if rec.get("type") != "user" or rec.get("isMeta") or rec.get("toolUseResult") is not None:
        return None
    if rec.get("isCompactSummary") or rec.get("isVisibleInTranscriptOnly"):
        return None  # the summary Claude Code writes after a boundary quotes earlier prompts; it is not one
    origin = (rec.get("origin") or {}).get("kind")
    if origin and origin != "human":
        return None
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, str):
        return content
    texts = []
    for block in content or []:
        if isinstance(block, dict):
            if block.get("type") == "tool_result":
                return None
            if isinstance(block.get("text"), str):
                texts.append(block["text"])
    return "\n".join(texts) if texts else None


def last_prompt(path: Path) -> tuple[int | None, str]:
    """(line number, text) of the last typed user prompt in a transcript."""
    found: tuple[int | None, str] = (None, "")
    for n, _, rec in core.iter_lines(path, needles=['"user"']):
        text = _user_text(rec)
        if text is not None:
            found = (n, text)
    return found


def prompt_line(path: Path, prompt: str) -> int | None:
    """Line of the last typed user prompt that contains this prompt (where an evaluation branch begins)."""
    key, hit = prompt[:150], None
    for n, _, rec in core.iter_lines(path, needles=['"user"']):
        text = _user_text(rec)
        if text is not None and key in text:
            hit = n
    return hit


def transcript_metrics(path: Path, start_line: int | None = None, sandbox_roots: Iterable[Path] = ()) -> dict[str, Any]:
    """One transcript. With start_line only records from that line on count: an evaluation branch's
    transcript starts with the history it was forked from."""
    roots = [Path(r) for r in sandbox_roots]
    cycles = [{"peak": 0, "floor": None, "calls": 0, "same_range_rereads": 0, "files_reread_from_earlier_cycle": 0}]
    boundaries: list[dict[str, Any]] = []
    calls: dict[str, dict[str, int]] = {}
    reads_cycle: Counter = Counter()
    files_before: set[str] = set()
    files_this_cycle: set[str] = set()
    writes: Counter = Counter()
    commands: Counter = Counter()
    tools: Counter = Counter()
    models: Counter = Counter()
    efforts: Counter = Counter()
    attachments: Counter = Counter()
    perms: Counter = Counter()
    versions: Counter = Counter()
    entrypoints: Counter = Counter()
    recall = {"search": 0, "show": 0}
    outside_writes: list[str] = []
    prompts = api_errors = hook_notes = 0
    first_ts = last_ts = prev_ts = None
    last_call_ts = None
    waiting: dict[str, Any] | None = None
    for n, raw, rec in core.iter_lines(path):
        if start_line is not None and n < start_line:
            continue
        ts = _ts(rec.get("timestamp"))
        if ts is not None:
            first_ts = first_ts if first_ts is not None else ts
            last_ts = ts
        kind = rec.get("type")
        if rec.get("version"):
            versions[rec["version"]] += 1
        if core.is_compact_boundary(rec):
            meta = rec.get("compactMetadata") or {}
            waiting = {"line": n, "ts": rec.get("timestamp"), "trigger": meta.get("trigger"),
                       "pre_tokens": meta.get("preTokens"),
                       "pre_gap_s": round(ts - prev_ts, 1) if ts is not None and prev_ts is not None else None,
                       "since_last_call_s": round(ts - last_call_ts, 1) if ts is not None and last_call_ts else None,
                       "post_gap_s": None, "post_tokens": None,
                       "metadata": {k: v for k, v in meta.items() if isinstance(v, (int, float, str, bool))}}
            boundaries.append(waiting)
            cycles.append({"peak": 0, "floor": None, "calls": 0, "same_range_rereads": 0,
                           "files_reread_from_earlier_cycle": 0})
            files_before |= files_this_cycle
            files_this_cycle = set()
            reads_cycle.clear()
            prev_ts = ts if ts is not None else prev_ts
            continue
        if ts is not None:
            prev_ts = ts
        if kind == "attachment":
            attachments[(rec.get("attachment") or {}).get("type")] += 1
        if kind != "assistant" and NOTE_MARK in raw:
            hook_notes += 1
        if kind == "system" and rec.get("subtype") == "api_error":
            api_errors += 1
        if kind == "user":
            if rec.get("permissionMode"):
                perms[rec["permissionMode"]] += 1
            if _user_text(rec) is not None:
                prompts += 1
            continue
        if kind != "assistant":
            continue
        msg = rec.get("message") or {}
        if rec.get("isApiErrorMessage"):
            api_errors += 1
        if msg.get("model") and msg.get("model") != "<synthetic>":
            models[msg["model"]] += 1
            efforts[str(rec.get("effort"))] += 1
            entrypoints[str(rec.get("entrypoint"))] += 1
        for block in msg.get("content") or []:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            name, inp = block.get("name"), block.get("input") or {}
            tools[name] += 1
            fp = inp.get("file_path")
            if name == "Read" and fp:
                key = (fp, inp.get("offset"), inp.get("limit"))
                reads_cycle[key] += 1
                if reads_cycle[key] > 1:
                    cycles[-1]["same_range_rereads"] += 1
                low = str(fp).replace("\\", "/").lower()
                if low in files_before and low not in files_this_cycle:
                    cycles[-1]["files_reread_from_earlier_cycle"] += 1
                files_this_cycle.add(low)
            elif name in WRITES and fp:
                if name == "Write":
                    writes[str(fp).replace("\\", "/").lower()] += 1
                if roots and not is_under(fp, roots):
                    outside_writes.append(str(fp))
            elif name in SHELL:
                command = re.sub(r"\s+", " ", str(inp.get("command") or "")).strip()
                if command:
                    commands[command] += 1
                if "ctx.py" in command and "recall" in command:
                    recall["show" if re.search(r"\brecall\s+show\b", command) else "search"] += 1
        size = core.usage_tokens(rec)
        mid = msg.get("id")  # same de-duplication as ctx.py measure: one API call, several content records
        if not size:
            continue
        usage = msg.get("usage") or {}
        if mid in calls:  # later blocks of the same API call: only the output count can grow
            calls[mid]["output"] = max(calls[mid]["output"], int(usage.get("output_tokens") or 0))
            continue
        calls[mid] = {"input": int(usage.get("input_tokens") or 0),
                      "cache_write": int(usage.get("cache_creation_input_tokens") or 0),
                      "cache_read": int(usage.get("cache_read_input_tokens") or 0),
                      "output": int(usage.get("output_tokens") or 0), "context": size}
        last_call_ts = ts
        cyc = cycles[-1]
        cyc["calls"] += 1
        cyc["peak"] = max(cyc["peak"], size)
        if cyc["floor"] is None:
            cyc["floor"] = size
        if waiting is not None and waiting["post_gap_s"] is None:
            wts = _ts(waiting["ts"])
            waiting["post_gap_s"] = round(ts - wts, 1) if ts is not None and wts is not None else None
            waiting["post_tokens"] = size
            waiting = None
    for b in boundaries:
        gaps = [g for g in (b["pre_gap_s"], b["post_gap_s"]) if g is not None]
        b["pause_s"] = round(sum(gaps), 1) if gaps else None
    tokens = {k: sum(c[k] for c in calls.values()) for k in ("input", "cache_write", "cache_read", "output")}
    sizes = [c["context"] for c in calls.values()]
    repeated = {cmd: n for cmd, n in commands.items() if n > 1}
    return {
        "transcript": str(path), "api_calls": len(calls), "user_prompts": prompts,
        "context": {"start": sizes[0] if sizes else 0, "peak": max(sizes) if sizes else 0,
                    "mean": int(sum(sizes) / len(sizes)) if sizes else 0},
        "cycles": cycles, "compactions": boundaries, "tokens": tokens,
        "wall_s": round(last_ts - first_ts, 1) if first_ts is not None and last_ts is not None else None,
        "retrieval": recall, "tools": dict(tools),
        "rereads": {"same_range_in_cycle": sum(c["same_range_rereads"] for c in cycles),
                    "files_reread_after_compaction": sum(c["files_reread_from_earlier_cycle"] for c in cycles)},
        "repeated_work": {"full_rewrites": sum(c - 1 for c in writes.values() if c > 1),
                          "repeated_commands": sum(n - 1 for n in repeated.values()),
                          "most_repeated": [[n, cmd[:100]] for cmd, n in sorted(repeated.items(),
                                                                                key=lambda kv: -kv[1])[:5]]},
        "api_errors": api_errors, "hook_notes_seen": hook_notes, "writes_outside_sandbox": outside_writes[:20],
        "evidence": {"models": dict(models), "effort": dict(efforts), "attachments": dict(attachments),
                     "permission_modes": dict(perms), "versions": dict(versions), "entrypoints": dict(entrypoints)},
    }


def cross_check(m: dict[str, Any]) -> list[str]:
    """Differences between these metrics and the system's own ctx.py measure for the same transcript."""
    ref = ctx_cli.measure_transcript(Path(m["transcript"]))
    diffs = []
    pairs = [("api_calls", m["api_calls"], ref["api_calls"]), ("peak", m["context"]["peak"], ref["peak"]),
             ("compactions", len(m["compactions"]), len(ref["compactions"])),
             ("recall_calls", m["retrieval"]["search"] + m["retrieval"]["show"], ref["recall_calls"]),
             ("full_rewrites", m["repeated_work"]["full_rewrites"], ref["full_rewrites"]),
             ("cycle_peaks", [c["peak"] for c in m["cycles"]], [c["peak"] for c in ref["cycles"]]),
             ("same_range_rereads", [c["same_range_rereads"] for c in m["cycles"]],
              [c["rereads"] for c in ref["cycles"]])]
    for name, mine, theirs in pairs:
        if mine != theirs:
            diffs.append(f"{name}: harness {mine} vs ctx.py measure {theirs}")
    return diffs


def subagent_tokens(transcript: Path) -> dict[str, int]:
    total = {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0, "transcripts": 0}
    sub = Path(transcript).with_suffix("") / "subagents"
    if sub.is_dir():
        for path in sub.rglob("*.jsonl"):
            m = transcript_metrics(path)
            total["transcripts"] += 1
            for k in ("input", "cache_write", "cache_read", "output"):
                total[k] += m["tokens"][k]
    return total


def combine(per_session: list[dict[str, Any]], steps: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """An arm's main line: one transcript, or one per handoff session."""
    def total(path: tuple[str, ...]) -> int:
        out = 0
        for m in per_session:
            v: Any = m
            for key in path:
                v = v[key]
            out += v or 0
        return out
    cycles, compactions = [], []
    for i, m in enumerate(per_session):
        for j, c in enumerate(m["cycles"]):
            if c["calls"]:
                cycles.append({"session": i + 1, "cycle": j, **c})
        compactions += [{"session": i + 1, **b} for b in m["compactions"]]
    pauses = [b["pause_s"] for b in compactions if b["pause_s"] is not None]
    out = {
        "sessions": len(per_session), "api_calls": total(("api_calls",)), "user_prompts": total(("user_prompts",)),
        "context_peaks_per_cycle": [c["peak"] for c in cycles], "context_floors_per_cycle": [c["floor"] for c in cycles],
        "context_peak": max([m["context"]["peak"] for m in per_session] or [0]),
        "compaction_count": len(compactions), "compactions": compactions,
        "compaction_pause_s": {"each": pauses, "total": round(sum(pauses), 1),
                               "note": "previous record -> boundary -> first model call after it; includes the "
                                       "summary request and the hooks, measured from transcript timestamps"},
        "retrieval_calls": {k: total(("retrieval", k)) for k in ("search", "show")},
        "rereads": {k: total(("rereads", k)) for k in ("same_range_in_cycle", "files_reread_after_compaction")},
        "repeated_work": {k: total(("repeated_work", k)) for k in ("full_rewrites", "repeated_commands")},
        "tokens": {k: total(("tokens", k)) for k in ("input", "cache_write", "cache_read", "output")},
        "transcript_wall_s": round(sum(m["wall_s"] or 0 for m in per_session), 1),
        "api_errors": total(("api_errors",)), "hook_notes_seen": total(("hook_notes_seen",)),
        "writes_outside_sandbox": [w for m in per_session for w in m["writes_outside_sandbox"]],
    }
    if steps is not None:
        ok = [s for s in steps if s.get("status") == "ok"]
        out["driver"] = {
            "steps": len(steps), "wall_s": round(sum(s.get("wall_s") or 0 for s in steps), 1),
            "wall_s_by_kind": {k: round(sum(s.get("wall_s") or 0 for s in steps if s.get("kind") == k), 1)
                               for k in sorted({s.get("kind") for s in steps})},
            "reported_cost_usd": round(sum(((s.get("result") or {}).get("total_cost_usd") or 0) for s in ok), 4),
            "timeouts": sum(1 for s in steps if s.get("status") == "timeout"),
            "limit_stops": sum(1 for s in steps if s.get("status") == "limit"),
        }
    return out


def verify_profile(per_session: list[dict[str, Any]], expected: dict[str, Any], window: int | None) -> dict[str, Any]:
    """What the transcripts show about the profile actually used, and what they cannot show."""
    def merged(key: str) -> Counter:
        c: Counter = Counter()
        for m in per_session:
            c.update(m["evidence"][key])
        return c
    models, efforts, atts, perms = merged("models"), merged("effort"), merged("attachments"), merged("permission_modes")
    verified, mismatched, unverified = [], [], []

    def judge(name: str, seen: Counter, want: Any) -> None:
        if not seen:
            unverified.append(f"{name}: nothing recorded")
        elif set(seen) == {want}:
            verified.append(f"{name} = {want} on all {sum(seen.values())} records")
        else:
            mismatched.append(f"{name}: expected {want}, transcript shows {dict(seen)}")
    judge("model", models, expected["model"])
    judge("effort", efforts, expected["effort"])
    if (expected.get("settings") or {}).get("ultracode"):
        n = atts.get("ultra_effort_enter", 0)
        (verified if n else unverified).append(
            f"ultracode: {n} ultra_effort_enter attachment(s)" if n else
            "ultracode: no ultra_effort_enter attachment found (the setting itself is not recorded)")
    if perms:
        verified.append(f"permission mode recorded on user prompts: {dict(perms)}")
    autos = [b for m in per_session for b in m["compactions"] if (b.get("trigger") or "auto") == "auto"]
    if window:
        threshold = window - core.COMPACT_RESERVE_TOKENS
        pre = [b["pre_tokens"] for b in autos if isinstance(b.get("pre_tokens"), (int, float))]
        if not pre:
            unverified.append(f"real threshold (~{threshold}): no automatic compaction with compactMetadata.preTokens")
        elif all(0.9 * threshold <= p <= window + 60000 for p in pre):
            verified.append(f"real threshold: preTokens {pre} against configured ~{threshold} (window {window})")
        else:
            mismatched.append(f"real threshold: preTokens {pre} do not match configured ~{threshold} (window {window})")
    elif autos:
        mismatched.append(f"{len(autos)} automatic compaction(s) in an arm that must not compact")
    unverified += ["--setting-sources user,project,local: not recorded in the transcript (hooks firing in the "
                   "system arm show project and local settings were loaded)",
                   "precomputeCompactionEnabled=false: not recorded in the transcript",
                   "--bare absent: not recorded (known only from the driver's command line)"]
    return {"expected": expected, "verified": verified, "mismatched": mismatched, "unverified": unverified,
            "claude_code_versions": dict(merged("versions")), "entrypoints": dict(merged("entrypoints"))}


def hook_evidence(transcripts_dir: Path, sessions: list[str]) -> dict[str, Any]:
    """What the system's hooks left on disk for these sessions (system arm; zeros elsewhere)."""
    runtime = Path(transcripts_dir) / "context-system"
    out = {"runtime_dir": str(runtime), "exists": runtime.is_dir(), "snapshots": 0, "restored": 0, "superseded": 0,
           "summaries": 0, "subagent_summaries": 0, "ledgers": 0, "window_copies": 0, "session_state_files": 0,
           "hook_errors": 0}
    for session in sessions:
        arch = runtime / "archive" / session
        if arch.is_dir():
            names = [p.name for p in arch.iterdir()]
            out["snapshots"] += sum(1 for n in names if n.endswith("-restore.md"))
            out["restored"] += sum(1 for n in names if n.endswith("-consumed"))
            out["superseded"] += sum(1 for n in names if n.endswith("-superseded"))
            out["subagent_summaries"] += sum(1 for n in names if n.startswith("subagent-") and "-summary" in n)
            out["summaries"] += sum(1 for n in names if "-summary" in n and not n.startswith("subagent-"))
            out["ledgers"] += sum(1 for n in names if "-ledger" in n)
            out["window_copies"] += sum(1 for n in names if n.endswith("-window.jsonl"))
        if (runtime / "sessions" / f"{session}.json").is_file():
            out["session_state_files"] += 1
    errors = runtime / "errors.jsonl"
    if errors.is_file():
        with open(errors, encoding="utf-8", errors="replace") as fh:
            out["hook_errors"] = sum(1 for _ in fh)
    return out


def mechanics_verdict(arm_metrics: dict[str, Any], hooks: dict[str, Any]) -> dict[str, Any]:
    """Did the hooks fire around real compactions? This says nothing about answer quality."""
    autos = [b for b in arm_metrics["compactions"] if (b.get("trigger") or "auto") == "auto"]
    checks = {"automatic compaction happened": len(autos) >= 1,
              "a snapshot was saved for each automatic compaction": hooks["snapshots"] >= len(autos) >= 1,
              "a snapshot was restored after compaction": hooks["restored"] >= 1,
              "the compaction summary was filed": hooks["summaries"] >= 1,
              "context-system notes reached the conversation": arm_metrics["hook_notes_seen"] >= 1,
              "no hook errors logged": hooks["hook_errors"] == 0}
    return {"checks": checks, "all_passed": all(checks.values()), "evidence_of_quality": False}
