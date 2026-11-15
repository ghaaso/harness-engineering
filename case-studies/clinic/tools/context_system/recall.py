"""Exact recall over a project's Claude Code history.

Sources: main-session transcripts, nested subagent/workflow transcripts, and the
context-system archive (raw window copies, ledgers, summaries, snapshots).
Every reference is the source file's path relative to the project's transcript
directory plus a line and block number (or `#paragraph` for archive notes), so
`show` opens exactly the record that `search` matched. Records present in several
sources (a live transcript and its archived window copy) are reported once.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterator

from core import inside, iter_lines, transcripts_dir

WORD_RE = re.compile(r"[\w./\\:#+-]{2,}", re.U)
UNRESOLVED = "\x00tool:"  # internal label prefix for a tool_result whose tool name is not known yet


def _strings(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from _strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from _strings(v)


def _blocks(rec: dict[str, Any], tool_names: dict[str, str]) -> Iterator[tuple[str, str, str]]:
    """Yield (kind, label, text) for each searchable part of a transcript record."""
    msg = rec.get("message") or {}
    content = msg.get("content")
    kind = rec.get("type")
    if kind == "assistant":
        for block in content or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text" and block.get("text"):
                yield "assistant", "", block["text"]
            elif block.get("type") == "tool_use":
                name = block.get("name") or "tool"
                tool_names[block.get("id") or ""] = name
                inp = block.get("input") or {}
                label = str(inp.get("file_path") or inp.get("command") or inp.get("description") or "")[:80]
                # Decoded string values, not json.dumps: a Windows path must read as the user typed it.
                yield "tool_use", f"{name} {label}".strip(), "\n".join(_strings(inp))
    elif kind == "user":
        if isinstance(content, str):
            yield ("notification" if "<task-notification>" in content else "user"), "", content
            return
        for block in content or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text" and block.get("text"):
                yield "user", "", block["text"]
            elif block.get("type") == "tool_result":
                inner = block.get("content")
                text = inner if isinstance(inner, str) else "\n".join(
                    b.get("text", "") for b in inner or [] if isinstance(b, dict))
                tool_id = block.get("tool_use_id") or ""
                # Unknown tool (its tool_use line was filtered out): carry the id so search can look it up.
                yield "tool_result", tool_names.get(tool_id) or (UNRESOLVED + tool_id if tool_id else ""), text


def sources(base: Path, include_subagents: bool = True, include_archive: bool = True) -> list[Path]:
    """Main transcripts (newest first), then subagent transcripts, then archive files.

    Only files that really live under the transcript directory are returned, so a
    junction or symlink cannot pull in text from elsewhere.
    """
    out = sorted(base.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if include_subagents:
        out += sorted(base.glob("*/subagents/**/*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if include_archive:
        archive = base / "context-system" / "archive"
        out += sorted(archive.glob("*/*-window.jsonl"))
        out += sorted(archive.glob("*/*.md"))
    return [p for p in out if inside(p, base)]


def _kind_prefix(path: Path, base: Path) -> str:
    parts = path.relative_to(base).parts
    if "subagents" in parts:
        return "sub:"
    if parts and parts[0] == "context-system":
        return "archive:"
    return ""


def parse_terms(query: str) -> tuple[list[str], list[str]]:
    """Lower-cased words and quoted phrases (phrase whitespace collapsed to single spaces)."""
    phrases = [" ".join(p.lower().split()) for p in re.findall(r'"([^"]+)"', query)]
    rest = re.sub(r'"[^"]+"', " ", query)
    words = [w.lower() for w in WORD_RE.findall(rest)]
    return words, [p for p in phrases if p]


def _needles(words: list[str], phrases: list[str]) -> list[str]:
    """Line prefilter strings: each term raw and in its JSON-escaped spellings.

    Transcript lines are JSON, so `tools\\core.py` appears with doubled backslashes and
    non-ASCII text may be \\u-escaped; the first word of a phrase is enough to keep the line.
    """
    needles: set[str] = set()
    for term in words + [p.split(" ")[0] for p in phrases]:
        for form in (term, json.dumps(term, ensure_ascii=False)[1:-1], json.dumps(term)[1:-1]):
            needles.add(form.lower())
        if not term.isascii():
            # A file written with \\u escapes hides case (É is \\u00c9, é is \\u00e9); let any escaped
            # line through and decide on the decoded text. Claude Code itself does not escape.
            needles.add("\\u")
    return sorted(needles)


def _kind_ok(kind: str, kinds: set[str] | None) -> bool:
    """A filter accepts the kind exactly as search prints it ("sub:assistant") or its bare name."""
    return not kinds or kind in kinds or kind.split(":")[-1] in kinds


def _tool_name(path: Path, tool_use_id: str) -> str:
    """Name of the tool a result belongs to (its tool_use line may not have matched the query)."""
    if not tool_use_id:
        return ""
    for _, _, rec in iter_lines(path, needles=[tool_use_id.lower()]):
        for block in (rec.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("id") == tool_use_id:
                return block.get("name") or ""
    return ""


def _snippet(text: str, needle: str, width: int = 240) -> str:
    low = text.lower()
    i = max(0, low.find(needle)) if needle else 0
    start = max(0, i - width // 3)
    chunk = " ".join(text[start:start + width].split())
    return ("…" if start else "") + chunk + ("…" if start + width < len(text) else "")


def search(query: str, root: Path, limit: int = 8, kinds: set[str] | None = None, session: str | None = None,
           include_subagents: bool = True, include_archive: bool = True) -> list[dict[str, Any]]:
    words, phrases = parse_terms(query)
    if not words and not phrases:
        return []
    needed = max(1, (len(words) + 1) // 2)
    needles = _needles(words, phrases)
    base = transcripts_dir(root)
    hits: list[dict[str, Any]] = []
    seen_uuids: set[str] = set()
    for path in sources(base, include_subagents, include_archive):
        relpath = path.relative_to(base).as_posix()
        if session and session not in relpath:
            continue
        prefix = _kind_prefix(path, base)
        if path.suffix == ".md":
            text = path.read_text(encoding="utf-8", errors="replace")
            best: list[dict[str, Any]] = []
            for i, para in enumerate(text.split("\n\n")):
                _score(best, para, words, phrases, needed, kinds, prefix + "note", path.name,
                       f"{relpath}#{i}", "")
            if best:  # one hit per archive note file: notes repeat what the records already say
                hits.append(max(best, key=lambda h: (h["distinct"], h["score"])))
            continue
        tool_names: dict[str, str] = {}
        for n, _, rec in iter_lines(path, needles=needles):
            uuid = rec.get("uuid")
            if uuid and uuid in seen_uuids:
                continue
            matched = False
            for b, (kind, label, text) in enumerate(_blocks(rec, tool_names)):
                if _score(hits, text, words, phrases, needed, kinds, prefix + kind, label,
                          f"{relpath}:{n}:{b}", rec.get("timestamp") or ""):
                    matched = True
                    hits[-1]["_path"] = path
            if uuid and matched:
                seen_uuids.add(uuid)
    hits.sort(key=lambda h: (h["distinct"], not h["kind"].endswith("note"), h["score"], h["ts"]), reverse=True)
    top = hits[:limit]
    for hit in top:
        source = hit.pop("_path", None)
        if hit["label"].startswith(UNRESOLVED):
            hit["label"] = _tool_name(source, hit["label"][len(UNRESOLVED):]) if source else ""
    return top


def _score(hits, text, words, phrases, needed, kinds, kind, label, ref, ts) -> bool:
    if not text or not _kind_ok(kind, kinds):
        return False
    low = text.lower()
    flat = " ".join(low.split()) if phrases else low
    if any(p not in flat for p in phrases):
        return False
    present = [w for w in words if w in low]
    if len(present) < needed and not (phrases and not words):
        return False
    score = sum(min(low.count(w), 5) for w in present) + 5 * len(phrases)
    needle = (present or [p.split(" ")[0] for p in phrases] or [""])[0]
    hits.append({"ref": ref, "kind": kind, "label": label, "ts": ts, "distinct": len(present) + len(phrases),
                 "score": score, "snippet": _snippet(text, needle)})
    return True


def show(ref: str, root: Path, chars: int = 4000, offset: int = 0) -> str:
    """Open exactly the record a search reference names (no prefix matching, no fallbacks)."""
    base = transcripts_dir(root)
    m = re.match(r"^(?P<path>.+):(?P<line>\d+):(?P<block>\d+)$", ref)
    if m:
        path = base / m.group("path")
        if not inside(path, base) or not path.is_file():
            return f"No transcript file {m.group('path')}"
        line_no, block_no = int(m.group("line")), int(m.group("block"))
        tool_names: dict[str, str] = {}
        for n, _, rec in iter_lines(path):
            blocks = list(_blocks(rec, tool_names))
            if n != line_no:
                continue
            if block_no >= len(blocks):
                return f"No record at {ref} (line {line_no} has {len(blocks)} blocks)"
            kind, label, text = blocks[block_no]
            label = "" if label.startswith(UNRESOLVED) else label
            return _page(f"{m.group('path')} line {line_no} ({rec.get('type')}, {rec.get('timestamp', '')})",
                         f"[{kind}{' ' + label if label else ''}]\n{text}", chars, offset)
        return f"No record at {ref}"
    m = re.match(r"^(?P<path>.+\.md)#(?P<para>[0-9]+)$", ref)
    if m:
        path = base / m.group("path")
        if not inside(path, base) or not path.is_file():
            return f"No archive entry {ref}"
        paras = path.read_text(encoding="utf-8", errors="replace").split("\n\n")
        index = int(m.group("para"))
        if index >= len(paras):
            return f"No archive entry {ref} (file has {len(paras)} paragraphs)"
        return _page(m.group("path"), paras[index], chars, offset)
    return f"Malformed reference {ref}; expected <path>:<line>:<block> or <path>.md#<n>"


def _page(header: str, text: str, chars: int, offset: int) -> str:
    body = text[offset: offset + chars]
    more = len(text) - (offset + len(body))
    tail = f"\n[{more} more chars: add --offset {offset + len(body)}]" if more > 0 else ""
    return f"== {header} (chars {offset}-{offset + len(body)} of {len(text)})\n{body}{tail}"


def format_hits(hits: list[dict[str, Any]]) -> str:
    if not hits:
        return "No matches."
    out = []
    for h in hits:
        label = f" {h['label'][:60]}" if h["label"] else ""
        out.append(f"{h['ref']}  {h['ts'][:16]}  {h['kind']}{label}\n    {h['snippet']}")
    return "\n".join(out)
