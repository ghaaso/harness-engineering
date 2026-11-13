#!/usr/bin/env python3
"""Mutation test of the runbook cutter's selection (the binding review's finding 4).

  python3 lib/selftest-runbook.py <runbook> <pins>

Against mutated copies of <runbook>, in a temporary folder, it checks that:
  - the unchanged runbook is cut as pinned (exit 0);
  - a changed command that keeps its first line and line count is typed as changed (exit 0);
  - a block added in front of the pinned one does not shift the selection (exit 0, same text):
    blocks are found by content, not by position;
  - a `</dev/null` added to the first line is the same block (exit 0);
  - a line inserted into the block, a changed first line, and a second block with the same
    first line are each refused as MOVED (exit 5), so nothing is typed;
  - an anchor comment selects its block wherever it stands, `@name/n` falls back to the pinned
    block when the runbook has no anchor, and a missing anchor without a fallback is MOVED (5);
  - a renamed step is refused as missing (exit 3).
Each case uses a block the rig really types and that main and the runbook batch both keep (6.8,
6.4), so the test holds on either text.
Exit 0 when every case holds. Runs anywhere with Python 3.10+; no network, no Docker.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
NL = chr(10)


def cut(path: str, pins: str, step: str, n: str) -> tuple[int, str]:
    env = dict(os.environ, RB_PINS=pins)
    p = subprocess.run([sys.executable, os.path.join(HERE, "runbook.py"), "fence", path, step, n],
                       capture_output=True, text=True, env=env)
    return p.returncode, p.stdout + p.stderr


def edit_step(text: str, step: str, fn) -> str:
    lines = text.split(NL)
    start = next(i for i, l in enumerate(lines) if l.startswith(f"### {step} "))
    end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("### ") or lines[i].startswith("## "))
    return NL.join(lines[:start] + fn(lines[start:end]) + lines[end:])


def first_fence(body: list[str]) -> int:
    return next(i for i, l in enumerate(body) if l.startswith("```"))


def insert_after_first_fence(body: list[str], new: str) -> list[str]:
    i = first_fence(body)
    return body[: i + 1] + [new] + body[i + 1 :]


def add_block_before_first(body: list[str], first: str = "echo an added block") -> list[str]:
    i = first_fence(body)
    return body[:i] + ["```bash", first, "```", ""] + body[i:]


def anchor_after_added(body: list[str]) -> list[str]:
    i = first_fence(body)
    return body[:i] + ["```bash", "echo an added block", "```", "", "<!-- block: 6.8-appendix -->", ""] + body[i:]


def main() -> int:
    src, pins = sys.argv[1], sys.argv[2]
    text = open(src, encoding="utf-8").read()
    want68 = cut(src, pins, "6.8", "1")[1]
    first68 = want68.split(NL)[0]
    cases = [
        ("unchanged 6.8", text, "6.8", "1", 0, want68),
        ("6.8, a later line changed (same first line and length)",
         edit_step(text, "6.8", lambda b: [l.replace("appendix-b.sql > ", "appendix-b.sql -X > ") for l in b]), "6.8", "1", 0, "-X >"),
        ("6.8, a block added in front (found by content, not shifted)", edit_step(text, "6.8", add_block_before_first), "6.8", "1", 0, want68),
        ("6.8, '</dev/null' added to the first line",
         edit_step(text, "6.8", lambda b: [(l + " </dev/null") if l == first68 else l for l in b]), "6.8", "1", 0, "</dev/null"),
        ("6.4, a line inserted into the block", edit_step(text, "6.4", lambda b: insert_after_first_fence(b, "echo inserted")), "6.4", "1", 5, None),
        ("6.8, the first line changed (a guard put in front)",
         edit_step(text, "6.8", lambda b: [(': "${D:?}" && ' + l) if l == first68 else l for l in b]), "6.8", "1", 5, None),
        ("6.8, a second block with the same first line",
         edit_step(text, "6.8", lambda b: add_block_before_first(b, first68)), "6.8", "1", 5, None),
        ("6.8, an anchored block chosen by its anchor", edit_step(text, "6.8", anchor_after_added), "6.8", "@appendix", 0, want68),
        ("6.8, no anchor: @appendix/1 falls back to the pinned block", text, "6.8", "@appendix/1", 0, want68),
        ("6.8, no anchor and no fallback", text, "6.8", "@appendix", 5, None),
        ("6.8 renamed", text.replace("### 6.8 ", "### 6.8x ", 1), "6.8", "1", 3, None),
    ]
    bad = 0
    with tempfile.TemporaryDirectory() as d:
        for name, body, step, sel, want, needle in cases:
            p = os.path.join(d, "rb.md")
            open(p, "w", encoding="utf-8").write(body)
            rc, out = cut(p, pins, step, sel)
            ok = rc == want and (needle is None or needle in out)
            bad += not ok
            last = out.strip().splitlines()[-1][:150] if out.strip() else ""
            print(f"{'ok  ' if ok else 'FAIL'} {name}: exit {rc} (want {want}){'' if rc == 0 else ': ' + last}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
