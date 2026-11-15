"""Claude Code hook handlers for the context system.

Each handler receives the hook's stdin payload and returns what the hook should
print: a dict (JSON output), a string (plain stdout) or None (no output).

Whose compaction is it? Tool hooks carry agent_id inside subagents and are ignored
there. The compaction hooks (PreCompact, SessionStart source=compact, PostCompact)
do NOT: Claude Code 2.1.293 fires them for subagent compactions with the main
session's id and transcript. The default is therefore "this is the main
conversation's compaction". A PreCompact is treated as a subagent's ("foreign")
only on positive evidence: it is automatic, the main transcript is well below its
threshold, AND a subagent transcript written moments ago is itself near its own
threshold. A wrong guess in the default direction only adds text to a subagent's
context; the main conversation's restoration is never dropped on a guess.

Restoration contract
- PreCompact assembles the exact text SessionStart(compact) will restore, saves it
  as an immutable snapshot, and tells the summarizer it may reference ONLY the
  state blocks whose full text is verifiably inside that saved text.
- Blocks are restored whole or not at all; nothing is cut after the summarizer
  has been told it is covered. The summarizer's obligations are never truncated.
- SessionStart restores the newest snapshot while the main transcript still has the
  boundary count the snapshot was saved at (Claude Code writes the new boundary
  only after this hook returns), however often it is asked: a subagent may have
  taken an earlier restore. Once the count has moved on it is never restored.
- Blocks promised by an earlier snapshot of the same compaction but absent from
  the newest one are added, so every promise made in this cycle is honoured.
- After restoring, covered blocks are compared with the file on disk and any that
  changed after the snapshot are reported with their current text.
- When nothing is restored the note says truthfully what the summarizer was told.
- Bookkeeping failures never prevent a restore.
"""
from __future__ import annotations

import difflib
import json
import re
import sys
import time
import traceback
from pathlib import Path
from typing import Any

from core import (CHARS_PER_TOKEN, clean, compaction_config, count_boundaries, describe_compaction, load_config,
                  project_root, read_json, rel, runtime_dir_for, tail_status, ucut, ulen, utc_stamp,
                  write_json_atomic, write_new)
from ledger import (build_ledger, find_state_file, read_state_text, read_window, render_ledger,
                    restore_candidates, sha)

OUTLINE_RE = {
    ".md": re.compile(r"^(#{1,3})\s+\S"),
    ".py": re.compile(r"^(\s{0,4})(class|def|async def)\s+\w"),
    ".js": re.compile(r"^(export\s+)?(async\s+)?(function|class)\s+\w|^(export\s+)?const\s+\w+\s*=\s*(async\s*)?\("),
    ".ts": re.compile(r"^(export\s+)?(async\s+)?(function|class|interface|type)\s+\w|^(export\s+)?const\s+\w+\s*="),
}
OUTLINE_RE[".mjs"] = OUTLINE_RE[".js"]
OUTLINE_RE[".tsx"] = OUTLINE_RE[".ts"]
SKIP_READ_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".pdf", ".ipynb"}
META_RE = re.compile(r"^s(\d{4,})-c\d+-.*-meta\.json$")
LINE_RANGE_RE = re.compile(r" \(L\d+-L\d+\)$")
FOREIGN_TOKEN_RATIO = 0.8       # "near its threshold" / "well below its threshold"
FOREIGN_ACTIVITY_SECONDS = 120  # a subagent transcript written this recently counts as active
FOREIGN_FLAG_SECONDS = 300      # how long a subagent-compaction flag silences the follow-up hooks
STALE_SNAPSHOT_TOKENS = 30000   # a snapshot this far behind the compaction gets an age note


def ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def ctx_command(root: Path | None = None) -> str:
    """The operator command as a PowerShell line the model can run from any directory."""
    script = (Path(__file__).resolve().parent / "ctx.py").as_posix()
    return f"& {ps_quote(Path(sys.executable).as_posix())} -I -B {ps_quote(script)}"


def recall_hint(root: Path) -> str:
    return f"{ctx_command()} recall search \"<terms>\" --project {ps_quote(root.as_posix())}"


class Ctx:
    """Everything a handler needs, derived from the payload (never from the code's location)."""

    def __init__(self, payload: dict[str, Any]):
        self.payload = payload
        self.cfg = load_config()
        self.root = project_root(payload)
        self.transcript = payload.get("transcript_path") or ""
        self.session_id = payload.get("session_id") or "unknown"
        self.runtime = runtime_dir_for(self.transcript or None, self.root)
        self.archive = self.runtime / "archive" / self.session_id
        self.state_path = self.runtime / "sessions" / f"{self.session_id}.json"

    def state(self) -> dict[str, Any]:
        return read_json(self.state_path)

    def save_state(self, data: dict[str, Any]) -> bool:
        """Best effort: session bookkeeping must never break a hook."""
        try:
            write_json_atomic(self.state_path, data)
            return True
        except OSError:
            return False

    def compaction(self, model: str | None = None) -> dict[str, Any]:
        return compaction_config(self.root, model or self.payload.get("model"))

    def metas(self) -> list[dict[str, Any]]:
        """Snapshot metadata for this session, oldest first, ordered by sequence number."""
        found = []
        if self.archive.is_dir():
            for path in self.archive.iterdir():
                meta = read_json(path) if META_RE.match(path.name) else {}
                if isinstance(meta.get("tag"), str) and (self.archive / f"{meta['tag']}-restore.md").is_file():
                    found.append(meta)
        return sorted(found, key=lambda meta: int(meta.get("seq") or 0))

    def state_file(self, metas: list[dict[str, Any]] | None = None) -> str | None:
        if not self.transcript:
            return None
        metas = self.metas() if metas is None else metas
        previous = metas[-1].get("state_file") if metas else None
        return find_state_file(self.transcript, self.root, self.state().get("focus"), previous)

    def subagent_near_threshold(self) -> bool:
        """True when a subagent transcript written in the last two minutes is near its own threshold."""
        if not self.transcript:
            return False
        folder = Path(self.transcript).with_suffix("") / "subagents"
        if not folder.is_dir():
            return False
        cutoff = time.time() - FOREIGN_ACTIVITY_SECONDS
        try:
            active = [p for p in folder.rglob("*.jsonl") if p.stat().st_mtime >= cutoff]
        except OSError:
            return False
        for path in active:
            tail = tail_status(path)
            if tail["tokens"] >= FOREIGN_TOKEN_RATIO * self.compaction(tail["model"])["threshold"]:
                return True
        return False


def _out(event: str, text: str, cap: int) -> dict[str, Any]:
    return {"hookSpecificOutput": {"hookEventName": event, "additionalContext": ucut(text, cap)}}


def _recall_section(root: Path) -> str:
    return (f"## Exact recall\nSearch earlier conversation, subagent and archived text: {recall_hint(root)}\n"
            f"Open a hit with: ... recall show \"<ref>\" --project ...")


def _base_label(label: str) -> str:
    return LINE_RANGE_RE.sub("", label)


# --- PreCompact: ledger, archive, immutable restoration snapshot, summary instructions -------

def assemble_snapshot(c: Ctx, tag: str, cycle: int, led: dict[str, Any], state_file: str | None,
                      blocks: list[dict[str, Any]], problem: str, tokens: int) -> tuple[str, list[dict[str, Any]]]:
    """Build the exact restore text; return it with the blocks whose full text it contains."""
    cap = int(c.cfg["snapshot_chars"])
    recall = _recall_section(c.root)

    def render(chosen: list[dict[str, Any]], ledger_text: str) -> str:
        parts = [f"[context-system] Restoration snapshot {tag} for compaction cycle {cycle}, saved when the "
                 f"compaction was prepared (context ~{tokens // 1000}k tokens)."]
        if state_file and chosen:
            doc = sorted(chosen, key=lambda b: b["start"])
            parts.append(f"## Task state restored verbatim from {state_file}: "
                         + "; ".join(b["label"] for b in doc) + "\n" + "\n\n".join(b["text"] for b in doc))
        elif state_file:
            why = f" (the file {problem})" if problem else ""
            parts.append(f"## Task state file: {state_file}. No part of it was restored verbatim{why}; the "
                         f"summary carries its content. Read the file before relying on details.")
        if ledger_text:
            parts.append("## Facts from the compacted window (generated from the transcript)\n" + ledger_text)
        parts.append(recall)
        return "\n\n".join(parts)

    min_ledger = render_ledger(led, int(c.cfg["snapshot_ledger_min_chars"]), header=False)
    chosen: list[dict[str, Any]] = []
    for block in blocks[: int(c.cfg["restore_max_blocks"])]:
        if ulen(render(chosen + [block], min_ledger)) <= cap:
            chosen.append(block)
    room = min(int(c.cfg["snapshot_ledger_max_chars"]), cap - ulen(render(chosen, "")) - 80)
    ledger_text = render_ledger(led, room, header=False) if room >= 200 else ""
    text = render(chosen, ledger_text)
    if ulen(text) > cap:
        text = render(chosen, min_ledger if ulen(render(chosen, min_ledger)) <= cap else "")
    if ulen(text) > cap:  # cannot happen with whole-block selection; never restore a cut snapshot
        chosen, text = [], render([], "")
    covered = [b for b in chosen if b["text"] in text]
    return text, covered


def precompact_instructions(led: dict[str, Any], state_file: str | None, covered: list[dict[str, Any]],
                            problem: str, cycle: int, budget: int) -> str:
    """Obligations first and never truncated; only the optional lists shrink to fit the budget."""
    must = [f"Context-system notes for this summary (cycle {cycle}; {led['turns']} API calls, "
            f"peak ~{led['peak'] // 1000}k tokens):"]
    if covered:
        labels = "; ".join(b["label"] for b in sorted(covered, key=lambda b: b["start"]))
        must.append(f"- After compaction exactly these parts of {state_file} are restored verbatim from a snapshot "
                    f"saved now: {labels}. You may reference those parts instead of restating them. Everything "
                    f"else, including every other part of that file, must be carried by the summary.")
    else:
        why = f" ({state_file} {problem})" if state_file and problem else ""
        must.append(f"- No task-state text is restored verbatim after compaction{why}; the summary must carry the "
                    f"current state, decisions with reasons, rejected approaches, unfinished work and the next "
                    f"action in full.")
    must.append(f"- Keep every user instruction and correction from this window near-verbatim with the work it "
                f"governs ({len(led['prompts'])} user messages); a later correction overrides the earlier "
                f"instruction and both must stay visible.")
    if led["failures"]:
        must.append(f"- {len(led['failures'])} tool calls failed in this window; keep any failure not shown "
                    f"resolved, with the command and the decisive error line.")
    # Optional lines, most valuable first; when over budget the least valuable (last) is dropped.
    optional = []
    changed = list(reversed(list(led["changed"].items())))
    if changed:
        names = "; ".join(f"{p[-90:]} ({sum(cnt.values())})" for p, cnt in changed[:12])
        more = f"; +{len(changed) - 12} more" if len(changed) > 12 else ""
        optional.append(f"- For each file created or changed, state what changed, why, and whether it was "
                        f"verified (edit counts in brackets): {names}{more}")
    optional.append("- Exact earlier text stays searchable with the context-system recall command; prefer exact "
                    "pointers over long restatement.")
    big = [p for p, e in sorted(led["reads"].items(), key=lambda kv: -kv[1]["chars"])[:6] if e["chars"] >= 6000]
    if big:
        optional.append("- These files were read at length; keep the facts that matter with path:line ranges: "
                        + "; ".join(p[-90:] for p in big))
    if led["results"]:
        optional.append("- Keep these background result paths so they can be reopened instead of re-run: "
                        + "; ".join((r.get("output-file") or "?")[-110:] for r in led["results"][-6:]))
    while optional and ulen("\n".join(must + optional)) > budget:
        optional.pop()
    return "\n".join(must + optional)


def is_foreign_compaction(c: Ctx, tokens: int) -> bool:
    """A subagent's automatic compaction: needs positive evidence, otherwise the compaction is the main one.

    The main context must be well below its threshold AND an active subagent must be near its
    own. A wrong estimate of the main threshold (launch flags the hooks cannot see, a smaller
    model window, a reactive compaction after an API error) therefore never hides a real main
    compaction unless a subagent is also about to compact at that moment.
    """
    if (c.payload.get("trigger") or "auto") != "auto":
        return False
    tail = tail_status(c.transcript)
    if tail["api_error"]:
        return False  # the main thread's own request just failed: this is its reactive compaction
    cc = c.compaction(tail["model"])
    return tokens < FOREIGN_TOKEN_RATIO * cc["threshold"] and c.subagent_near_threshold()


def _archive_window(c: Ctx, tag: str, boundaries: int, raw: list[str], metas: list[dict[str, Any]]) -> None:
    """Optional raw copy for recall; replaces an earlier copy of the same window it extends."""
    data = "".join(raw)
    path = write_new(c.archive / f"{tag}-window.jsonl", data)
    for old in metas:
        if int(old.get("boundaries") or -1) != boundaries:
            continue
        old_copy = c.archive / f"{old['tag']}-window.jsonl"
        try:
            if old_copy.is_file() and old_copy != path and data.startswith(old_copy.read_text(encoding="utf-8")):
                old_copy.unlink()
        except (OSError, UnicodeError):
            pass


def pre_compact(c: Ctx) -> Any:
    if not c.transcript:
        return None
    tokens = tail_status(c.transcript)["tokens"]
    if is_foreign_compaction(c, tokens):
        state = c.state()
        state["foreign_pending"] = time.time()
        c.save_state(state)
        return None
    state = c.state()
    if state.pop("foreign_pending", None) is not None:  # a main compaction supersedes a stale subagent flag
        c.save_state(state)
    window = read_window(c.transcript)
    boundaries = window["boundaries"]
    cycle = boundaries + 1
    led = build_ledger(window["records"], c.root)
    metas = c.metas()
    state_file = c.state_file(metas)
    blocks: list[dict[str, Any]] = []
    problem = ""
    state_sha = None
    if state_file:
        text, problem = read_state_text(c.root / state_file)
        if text is not None:
            state_sha = sha(text)
            whole_budget = int(c.cfg["snapshot_chars"]) - int(c.cfg["snapshot_ledger_min_chars"]) - 1200
            blocks = restore_candidates(text, list(c.cfg["restore_sections"]), whole_budget)
    seq = (int(metas[-1].get("seq") or 0) + 1) if metas else 1
    while True:
        tag = f"s{seq:04d}-c{cycle:03d}-{utc_stamp()}"
        if not c.archive.is_dir() or not any(c.archive.glob(f"s{seq:04d}-*")):
            break
        seq += 1
    tokens = tokens or led["peak"]
    restore_text, covered = assemble_snapshot(c, tag, cycle, led, state_file, blocks, problem, tokens)
    restore_text = clean(restore_text)

    # The small restore text and its metadata come first; the large optional copies must not cost them.
    write_new(c.archive / f"{tag}-restore.md", restore_text)
    ledger_path = c.archive / f"{tag}-ledger.md"
    meta = {"seq": seq, "cycle": cycle, "tag": tag, "created": time.time(), "boundaries": boundaries,
            "tokens": tokens, "peak": led["peak"], "state_file": state_file, "state_sha": state_sha,
            "mode": covered[0]["mode"] if covered else None,
            "covered": [{"label": b["label"], "sha": b["sha"], "text": b["text"]}
                        for b in sorted(covered, key=lambda b: b["start"])],
            "ledger_path": str(ledger_path)}
    # Meta is the commit point: a snapshot only counts once its text and metadata are both complete.
    write_new(c.archive / f"{tag}-meta.json", json.dumps(meta, indent=1))
    for old in metas:  # only the newest snapshot may ever be restored
        if not (c.archive / f"{old['tag']}-consumed").exists():
            try:
                (c.archive / f"{old['tag']}-superseded").touch(exist_ok=True)
            except OSError:
                pass
    try:
        write_new(ledger_path, f"# Ledger before compaction cycle {cycle} ({c.payload.get('trigger') or 'auto'})\n\n"
                               f"Transcript: {c.transcript}\nState file: {state_file or 'none'}\n\n"
                               f"{render_ledger(led, 200000)}\n")
        if c.cfg.get("archive_window_jsonl"):
            _archive_window(c, tag, boundaries, window["raw"], metas)
    except OSError:
        log_error(c.payload, "PreCompact(archive)")
    return precompact_instructions(led, state_file, covered, problem, cycle,
                                   int(c.cfg["precompact_instruction_chars"]))


# --- SessionStart ------------------------------------------------------------------------------

def session_start(c: Ctx) -> Any:
    source = c.payload.get("source") or "startup"
    cap = int(c.cfg["restore_total_chars"])
    if source == "compact":
        text = restore_after_compaction(c)
        return _out("SessionStart", text, cap) if text else None
    if source == "resume":
        return None
    cc = c.compaction(tail_status(c.transcript)["model"] if c.transcript else None)
    lines = [f"[context-system] This project is {describe_compaction(cc)}. Hooks steer the summary and restore a "
             f"saved snapshot of declared task-state sections afterwards, so work continues in this conversation "
             f"without a manual handoff.",
             f"Exact recall of earlier conversation text: {recall_hint(c.root)}",
             f"To pin this session's task state file: {ctx_command()} focus \"<path>\" --session {c.session_id}"]
    return _out("SessionStart", "\n".join(lines), cap)


def _set_summary_tag(c: Ctx, tag: str) -> None:
    state = c.state()
    state["pending_summary_tag"] = tag
    c.save_state(state)


def _foreign_pending(c: Ctx) -> bool:
    flag = c.state().get("foreign_pending")
    return isinstance(flag, (int, float)) and not isinstance(flag, bool) and time.time() - flag <= FOREIGN_FLAG_SECONDS


def restore_after_compaction(c: Ctx) -> str | None:
    """Restore the newest snapshot if it belongs to this compaction; otherwise say what happened."""
    metas = c.metas()
    now_b = count_boundaries(c.transcript) if c.transcript else None
    fallback_tag = f"nosnap-b{now_b if now_b is not None else 'x'}-{utc_stamp()}"
    recall = f"\nExact recall: {recall_hint(c.root)}"
    newest = metas[-1] if metas else None
    saved_b = int(newest.get("boundaries") or 0) if newest else None
    # Claude Code 2.1.293 writes the compaction boundary only after this hook returns, so the
    # snapshot of the compaction in progress was saved at exactly the current boundary count. It
    # stays restorable at that count however often the hook fires (a subagent may have had the
    # first restore). One count later it is accepted once, and only if no API call has been
    # recorded since that boundary (a version that writes the boundary first); anything else
    # belongs to a different compaction.
    restorable = newest is not None and (
        now_b is None or now_b == saved_b
        or (now_b == saved_b + 1 and tail_status(c.transcript)["at_boundary"]
            and not (c.archive / f"{newest['tag']}-consumed").exists()))
    if not restorable:
        if _foreign_pending(c):
            return None  # a subagent's compaction and nothing of ours to restore: add nothing to its context
        _set_summary_tag(c, fallback_tag)
        if not newest:
            return ("[context-system] Compaction finished. No restoration snapshot exists for this session, so "
                    "the summary was not told to rely on restored text." + recall)
        if (c.archive / f"{newest['tag']}-consumed").exists():
            return ("[context-system] Compaction finished. No snapshot was saved for this compaction (the "
                    "previous one was restored after an earlier compaction), so the summary was not told to rely "
                    "on restored text." + recall)
        told = "; ".join(b.get("label", "?") for b in newest.get("covered") or []) or "nothing"
        return (f"[context-system] Compaction finished. Snapshot {newest['tag']} was saved for an earlier "
                f"compaction (boundary count {saved_b}, now {now_b}) and was NOT restored. When it was saved the "
                f"summarizer was told these parts of {newest.get('state_file')} would be restored: {told}. Read "
                f"the current file for them; the saved text is at {c.archive / (newest['tag'] + '-restore.md')}."
                + recall)
    tag = newest["tag"]
    text = (c.archive / f"{tag}-restore.md").read_text(encoding="utf-8")
    cap = int(c.cfg["restore_total_chars"])
    additions = (("earlier promises", lambda room: earlier_promises(c, newest, metas, room)),
                 ("changed on disk", lambda room: changed_since_snapshot(c, newest, room)),
                 ("snapshot age", lambda room: snapshot_age_note(c, newest, room)))
    for name, build in additions:
        try:  # each addition is an extra; the snapshot itself must be restored whatever happens
            text += build(cap - ulen(text))
        except Exception:
            log_error(c.payload, f"SessionStart({name})")
    try:
        with open(c.archive / f"{tag}-consumed", "x", encoding="utf-8") as fh:
            fh.write(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "boundaries": now_b}))
    except OSError:
        pass  # already marked, or unwritable: restoring twice is safer than not restoring
    _set_summary_tag(c, tag)
    return text


def earlier_promises(c: Ctx, newest: dict[str, Any], metas: list[dict[str, Any]], room: int) -> str:
    """Blocks an earlier snapshot of THIS compaction promised but the newest snapshot does not hold.

    Two PreCompact hooks can run for one compaction (a retry, or a subagent compacting at the same
    moment). The summarizer may have been given either set of instructions, so both are honoured.
    """
    have = {b.get("sha") for b in newest.get("covered") or []}
    notes: list[tuple[str, str]] = []
    for old in metas[:-1]:
        if int(old.get("boundaries") or -1) != int(newest.get("boundaries") or 0):
            continue
        for block in old.get("covered") or []:
            if block.get("sha") in have or not isinstance(block.get("text"), str):
                continue
            have.add(block.get("sha"))
            notes.append((f"{block.get('label')} in {c.archive / (old['tag'] + '-restore.md')}",
                          f"### {block.get('label')} (from {old.get('state_file')}, snapshot {old['tag']})\n"
                          f"{block['text']}"))
    head = "\n\n## Also promised to the summarizer by an earlier snapshot of this compaction\n"
    return _fit_notes(head, notes, room, "- Too long to show here; read the saved text: ")


def snapshot_age_note(c: Ctx, meta: dict[str, Any], room: int) -> str:
    """Say so when the snapshot was saved well before the compaction that just ran."""
    now = tail_status(c.transcript)["tokens"] if c.transcript else 0
    saved = int(meta.get("tokens") or 0)
    if now - saved < STALE_SNAPSHOT_TOKENS:
        return ""
    note = (f"\n\n## Snapshot age\nThis snapshot was saved at ~{saved // 1000}k tokens by an earlier compaction "
            f"attempt; the conversation had reached ~{now // 1000}k when it was compacted. Work after the snapshot "
            f"is carried only by the summary, and the facts list above stops at the snapshot.")
    return note if ulen(note) <= room else ""


def changed_since_snapshot(c: Ctx, meta: dict[str, Any], room: int) -> str:
    """Report covered blocks whose on-disk text differs from the snapshot (state updated after it)."""
    state_file, covered = meta.get("state_file"), meta.get("covered") or []
    head = "\n\n## Changed on disk after this snapshot was saved (the file is newer than the text above)\n"
    if not state_file or not covered or room <= ulen(head) + 60:
        return ""
    current_text, problem = read_state_text(c.root / state_file)
    if current_text is None:
        return ucut(head + f"- {state_file} {problem or 'is missing'}; the text above is the last saved copy.", room)
    if sha(current_text) == meta.get("state_sha"):
        return ""
    mode = meta.get("mode") or "sections"
    current = restore_candidates(current_text, list(c.cfg["restore_sections"]), 0, mode=mode)
    pairs, added = match_blocks(covered, current)
    notes: list[tuple[str, str]] = []  # (short label, full note), in the snapshot's order
    for i, item in enumerate(covered):
        base = _base_label(item.get("label", ""))
        now = pairs.get(i)
        if now is None:
            notes.append((base, f"- {base}: no longer present in {state_file}."))
        elif now["sha"] != item.get("sha"):
            notes.append((now["label"], f"### {now['label']} (current text)\n{now['text']}"))
    if mode != "whole":  # declared blocks that did not exist when the snapshot was saved
        notes += [(b["label"], f"### {b['label']} (added after the snapshot)\n{b['text']}") for b in added]
    return _fit_notes(head, notes, room, f"- Also changed (too long to show here); read {state_file}: ")


def match_blocks(covered: list[dict[str, Any]], current: list[dict[str, Any]]
                 ) -> tuple[dict[int, dict[str, Any]], list[dict[str, Any]]]:
    """Pair each snapshot block with today's block by identity, not position.

    Same text first (unchanged, wherever it moved), then the same heading path, then the most
    similar text. Marked blocks have only positional labels, so they skip the label step.
    Returns the pairs and the current blocks nothing was paired with.
    """
    remaining = list(current)
    pairs: dict[int, dict[str, Any]] = {}

    def take(i: int, block: dict[str, Any]) -> None:
        pairs[i] = block
        remaining.remove(block)

    for i, item in enumerate(covered):
        same = next((b for b in remaining if b["sha"] == item.get("sha")), None)
        if same is not None:
            take(i, same)
    for i, item in enumerate(covered):
        base = _base_label(item.get("label", ""))
        if i in pairs or base.startswith("marked block"):
            continue
        named = next((b for b in remaining if _base_label(b["label"]) == base), None)
        if named is not None:
            take(i, named)
    for i, item in enumerate(covered):
        old = item.get("text")
        if i in pairs or not isinstance(old, str):
            continue
        best, best_ratio = None, 0.5
        for block in remaining:
            ratio = difflib.SequenceMatcher(None, old[:4000], block["text"][:4000]).ratio()
            if ratio > best_ratio:
                best, best_ratio = block, ratio
        if best is not None:
            take(i, best)
    return pairs, remaining


def _fit_notes(head: str, notes: list[tuple[str, str]], room: int, pointer_lead: str) -> str:
    """Show every note that fits; name the rest in one pointer line. A long note never hides a short one."""
    if not notes or room <= ulen(head) + 60:
        return ""
    reserve = min(400, ulen(pointer_lead) + sum(ulen(label) + 2 for label, _ in notes))
    shown: list[str] = []
    skipped: list[str] = []
    used = ulen(head)
    for label, note in notes:
        if used + ulen(note) + 2 <= room - reserve:
            shown.append(note)
            used += ulen(note) + 2
        else:
            skipped.append(label)
    out = head + "\n\n".join(shown)
    if skipped:
        pointer = ("\n\n" if shown else "") + pointer_lead + "; ".join(skipped)
        out += ucut(pointer, max(0, room - ulen(out)))
    return out.rstrip()


# --- PostCompact: archive the summary --------------------------------------------------------

def post_compact(c: Ctx) -> Any:
    state = c.state()
    tag = state.pop("pending_summary_tag", None)
    foreign = _foreign_pending(c)
    if isinstance(tag, str) and tag:
        c.save_state(state)
    else:
        count = count_boundaries(c.transcript) if c.transcript else "x"
        tag = f"{'subagent' if foreign else 'nosnap'}-b{count}-{utc_stamp()}"
        if foreign:
            state.pop("foreign_pending", None)
            c.save_state(state)
    write_new(c.archive / f"{tag}-summary.md",
              f"# Compaction summary ({c.payload.get('trigger') or 'auto'}, {tag})\n\n"
              f"{c.payload.get('compact_summary') or ''}\n")
    return None


# --- pre-compaction reminder -----------------------------------------------------------------------

def nudge(c: Ctx, event: str) -> Any:
    if not c.transcript:
        return None
    tail = tail_status(c.transcript)
    cc = c.compaction(tail["model"])
    if not cc["enabled"] or cc["window"] >= 1_000_000:
        return None
    ctx = tail["tokens"]
    if ctx < cc["threshold"] - int(c.cfg["nudge_margin_tokens"]) or ctx >= cc["threshold"]:
        return None
    state = c.state()
    cycle = count_boundaries(c.transcript)
    if state.get("nudged_cycle") == cycle:
        return None
    state["nudged_cycle"] = cycle
    if not c.save_state(state):
        return None  # cannot record it: stay silent rather than repeat on every call
    target = c.state_file() or "the task state file (docs/tasks/<id>/task.md) if this work has one"
    return _out(event, f"[context-system] Context is ~{ctx // 1000}k tokens; auto-compaction is configured for "
                       f"~{cc['threshold'] // 1000}k. Before then, bring {target} up to date. Whole sections headed "
                       f"Next action, Current state, User instructions and corrections, Decisions, Ruled out or "
                       f"Open questions (or text between <!-- ctx:restore --> and <!-- /ctx:restore -->) are "
                       f"restored verbatim after compaction when they fit, so keep them current and concise. "
                       f"Then continue the task.", int(c.cfg["restore_total_chars"]))


# --- Read admission ----------------------------------------------------------------------------

def outline(path: Path, lines: list[str], max_entries: int) -> list[str]:
    rx = OUTLINE_RE.get(path.suffix.lower())
    if not rx:
        return []
    hits = [(i + 1, ln.rstrip()) for i, ln in enumerate(lines) if rx.match(ln)]
    if len(hits) > max_entries and path.suffix.lower() == ".md":
        hits = [h for h in hits if not h[1].startswith("###")]
    if len(hits) > max_entries:
        step = len(hits) / max_entries
        hits = [hits[int(i * step)] for i in range(max_entries)]
    return [f"L{n}: {text[:110]}" for n, text in hits]


def pre_tool_read(c: Ctx) -> Any:
    inp = c.payload.get("tool_input") or {}
    if not c.cfg.get("read_admission") or c.payload.get("tool_name") != "Read":
        return None
    if inp.get("offset") or inp.get("limit") or inp.get("pages"):
        return None
    path = Path(inp.get("file_path") or "")
    if not path.is_file() or path.suffix.lower() in SKIP_READ_EXT:
        return None
    size = path.stat().st_size
    if size < int(c.cfg["large_read_bytes"]):
        return None
    data = path.read_bytes()
    if b"\x00" in data[:8192]:
        return None
    text_lines = data.decode("utf-8", errors="replace").splitlines()
    budget, used, limit = int(c.cfg["first_page_bytes"]), 0, 0
    for line in text_lines:
        used += len(line.encode("utf-8")) + 1
        limit += 1
        if used >= budget and limit >= int(c.cfg["first_page_min_lines"]):
            break
    if limit >= len(text_lines):
        return None
    marks = outline(path, text_lines, int(c.cfg["outline_max_entries"]))
    note = (f"[context-system] {rel(path, c.root)} is {size // 1024} KB / {len(text_lines)} lines "
            f"(~{int(size / CHARS_PER_TOKEN / 1000)}k tokens), so this Read returns lines 1-{limit}. "
            f"Read other ranges with offset/limit when the task needs them.")
    if marks:
        note += " Outline (line: heading):\n" + "\n".join(marks)
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                   "updatedInput": dict(inp, limit=limit),
                                   "additionalContext": ucut(note, int(c.cfg["restore_total_chars"]))}}


# --- dispatch ----------------------------------------------------------------------------------

def handle(event: str, payload: dict[str, Any]) -> Any:
    if payload.get("agent_id"):
        return None
    c = Ctx(payload)
    if event in ("PostToolBatch", "UserPromptSubmit"):
        return nudge(c, event)
    handler = {"SessionStart": session_start, "PreCompact": pre_compact,
               "PostCompact": post_compact, "PreToolUse": pre_tool_read}.get(event)
    return handler(c) if handler else None


def log_error(payload: dict[str, Any], event: str) -> None:
    try:
        root = project_root(payload)
        path = runtime_dir_for(payload.get("transcript_path"), root) / "errors.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "event": event,
                                 "trace": traceback.format_exc()[-2000:]}) + "\n")
    except Exception:
        pass
