#!/usr/bin/env python3
"""Read the command text of one runbook step out of docs/RUNBOOK-SELFHOST.md.

The rehearsal never retypes a command: every command it runs is cut from the runbook file of the
checkout under test by this script, then placeholders are substituted (each substitution is
logged by the caller). A step is found by its number:

  ### 6.6 Prove the dump ...          (sections 1-9)
  **11.3 Cherry-pick P1.**            (sections 11-12)
  **R5.3 Record where you are ...**   (section 13)

and runs until the next step heading of either kind (or the next `##` section).

  runbook.py fence <file> <step> <n>             the n-th fenced code block of the step (1-based)
  runbook.py span  <file> <step> <substring> [k] the k-th inline `code` span of the step that
                                                  contains <substring> (default k=1)
  runbook.py text  <file> <step>                 the step's whole text (for the record)
  runbook.py count <file> <step>                 number of fenced blocks in the step

Exit 3 when the step or the block does not exist: a runbook edit that moves a command makes the
rehearsal fail loudly instead of running something else.
"""

from __future__ import annotations

import re
import sys

HEAD_MD = re.compile(r"^###\s+(\d+\.\d+)\s")
HEAD_BOLD = re.compile(r"^\*\*((?:R\d+|\d+)\.\d+)\s")
SECTION = re.compile(r"^##\s")


def section_lines(lines: list[str], num: str) -> list[str]:
    """A whole `## <num>.` section (used for section 0's conventions: deep health, psql)."""
    out: list[str] = []
    inside = False
    in_fence = False
    for line in lines:
        if line.startswith("```"):
            in_fence = not in_fence
        if not in_fence and line.startswith("## "):
            if inside:
                break
            inside = line.startswith(f"## {num}. ")
        if inside:
            out.append(line)
    return out


def step_lines(path: str, step: str) -> list[str]:
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    if step.isdigit():
        sec = section_lines(lines, step)
        if not sec:
            sys.stderr.write(f"runbook.py: no section {step} in {path}\n")
            sys.exit(3)
        return sec
    out: list[str] = []
    inside = False
    in_fence = False
    for line in lines:
        if line.startswith("```"):
            in_fence = not in_fence
        if not in_fence:
            m = HEAD_MD.match(line) or HEAD_BOLD.match(line)
            if m:
                if inside:
                    break
                if m.group(1) == step:
                    inside = True
            elif inside and SECTION.match(line) and not line.startswith("###"):
                break
        if inside:
            out.append(line)
    if not out:
        sys.stderr.write(f"runbook.py: no step {step} in {path}\n")
        sys.exit(3)
    return out


def fences(lines: list[str]) -> list[str]:
    blocks: list[str] = []
    cur: list[str] | None = None
    for line in lines:
        if line.startswith("```"):
            if cur is None:
                cur = []
            else:
                blocks.append("\n".join(cur))
                cur = None
            continue
        if cur is not None:
            cur.append(line)
    return blocks


def spans(lines: list[str]) -> list[str]:
    text = []
    in_fence = False
    for line in lines:
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            text.append(line)
    joined = "\n".join(text)
    # inline spans may wrap across a line break in the markdown source
    return [s.replace("\n", " ") for s in re.findall(r"`([^`]+)`", joined)]


def main(argv: list[str]) -> int:
    if len(argv) < 4:
        sys.stderr.write(__doc__ or "")
        return 2
    cmd, path, step = argv[1], argv[2], argv[3]
    lines = step_lines(path, step)
    if cmd == "text":
        print("\n".join(lines))
        return 0
    if cmd == "count":
        print(len(fences(lines)))
        return 0
    if cmd == "fence":
        n = int(argv[4])
        fs = fences(lines)
        if not 1 <= n <= len(fs):
            sys.stderr.write(f"runbook.py: step {step} has {len(fs)} fenced block(s), not {n}\n")
            return 3
        print(fs[n - 1])
        return 0
    if cmd == "span":
        needle = argv[4]
        k = int(argv[5]) if len(argv) > 5 else 1
        hits = [s for s in spans(lines) if needle in s]
        if len(hits) < k:
            sys.stderr.write(f"runbook.py: step {step} has no inline span #{k} containing {needle!r}\n")
            return 3
        print(hits[k - 1])
        return 0
    sys.stderr.write(f"runbook.py: unknown command {cmd}\n")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
