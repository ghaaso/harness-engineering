"""Declared task-state blocks, adapted from the completed context_system/ledger.py.

No Claude imports, transcript discovery or model calls. Newlines are normalized;
the complete selected block text is otherwise retained.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

SECTIONS = [
    "Next action", "Next actions", "Next step", "Next steps", "Current state",
    "User instructions and corrections", "User corrections", "Decisions",
    "Ruled out", "Rejected approaches", "Open questions", "Unfinished work", "Constraints",
]
HEADING_RE = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$")
FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
STALE_RE = re.compile(r"(?i)\b(superseded|historical|archived|obsolete|deprecated)\b")
NUMBER_RE = re.compile(r"^\s*(\d+[.)]|[A-Za-z][.)])\s+")
MARK_OPEN, MARK_CLOSE = "<!-- ctx:restore -->", "<!-- /ctx:restore -->"


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def read_text(path: Path) -> str:
    data = path.read_bytes()
    encoding = "utf-16" if data[:2] in (b"\xff\xfe", b"\xfe\xff") else "utf-8-sig"
    text = data.decode(encoding)
    if "\x00" in text:
        raise ValueError("Task state contains NUL characters")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def normalize(title: str) -> str:
    return " ".join(NUMBER_RE.sub("", title).strip().strip(":").lower().split())


def headings(lines: list[str]) -> list[dict]:
    result, stack = [], []
    fence = None
    for index, line in enumerate(lines):
        marker = FENCE_RE.match(line)
        if marker:
            value = marker.group(1)
            if fence is None:
                fence = value
            elif value[0] == fence[0] and len(value) >= len(fence) and line.strip() == value:
                fence = None
            continue
        match = HEADING_RE.match(line) if fence is None else None
        if match and match.group(2).strip():
            result.append({"level": len(match.group(1)), "title": match.group(2).strip(), "start": index})
    for index, head in enumerate(result):
        head["end"] = next((other["start"] for other in result[index + 1:]
                            if other["level"] <= head["level"]), len(lines))
        while stack and stack[-1]["level"] >= head["level"]:
            stack.pop()
        head["path"] = [parent["title"] for parent in stack] + [head["title"]]
        stack.append(head)
    return result


def candidates(text: str, whole_budget: int, mode: str | None = None) -> list[dict]:
    lines, blocks = text.split("\n"), []

    def add(label: str, start: int, end: int, rank: int, kind: str) -> None:
        body = "\n".join(lines[start:end]).strip("\n")
        if body.strip():
            blocks.append({"label": label, "start": start, "end": end, "rank": rank,
                           "text": body, "sha": sha(body), "mode": kind})

    opens = [index for index, line in enumerate(lines) if line.strip() == MARK_OPEN]
    if mode in (None, "marked"):
        for index, start in enumerate(opens):
            end = next((j for j in range(start + 1, len(lines)) if lines[j].strip() == MARK_CLOSE), None)
            if end is not None:
                add(f"marked block {index + 1}", start + 1, end, index, "marked")
        if blocks or mode == "marked":
            return blocks
    if text.strip() and (mode == "whole" or (mode is None and len(text.strip()) <= whole_budget)):
        add("whole file", 0, len(lines), 0, "whole")
        return blocks
    wanted = {normalize(name): index for index, name in enumerate(SECTIONS)}
    taken_until = -1
    for head in headings(lines):
        rank = wanted.get(normalize(head["title"]))
        if (head["start"] < taken_until or rank is None
                or any(STALE_RE.search(title) for title in head["path"])):
            continue
        add(" > ".join(head["path"]), head["start"], head["end"], rank, "sections")
        taken_until = head["end"]
    return sorted(blocks, key=lambda block: (block["rank"], block["start"]))
