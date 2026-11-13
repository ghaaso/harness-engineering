#!/usr/bin/env python3
"""Read the command text of one runbook step out of docs/RUNBOOK-SELFHOST.md.

The rehearsal never retypes a command: every command it runs is cut from the runbook file of the
checkout under test by this script, then placeholders are substituted (each substitution is
logged by the caller). A step is found by its number:

  ### 6.6 Prove the dump ...          (sections 1-9)
  **11.3 Cherry-pick P1.**            (sections 11-12)
  **R5.3 Record where you are ...**   (section 13)

and runs until the next step heading of either kind (or the next `##` section).

  runbook.py fence <file> <step> @<name>         the block under <!-- block: <step>-<name> -->
  runbook.py fence <file> <step> @<name>/<n>     that, or pinned block n when there is no anchor
  runbook.py fence <file> <step> <n>             pinned block n of the step, found by content
  runbook.py span  <file> <step> <substring> [k] the k-th inline `code` span of the step that
                                                  contains <substring> (default k=1)
  runbook.py text  <file> <step>                 the step's whole text (for the record)
  runbook.py count <file> <step>                 number of fenced blocks in the step
  runbook.py anchors <file> <step>               the block anchors of the step
  runbook.py pins  <file>                        the shape of every step (for lib/runbook-pins.tsv)

Exit 3 when the step does not exist. A block is never chosen by its position. A runbook block
carrying an anchor comment is chosen by that anchor. Any other block is chosen by its CONTENT:
`n` names block n of the pin file (RB_PINS: lib/runbook-pins.tsv, recorded from the runbook the
rig was written against), and the cutter takes the step's block whose first line equals that
pin's first line (whitespace collapsed, a `</dev/null` stdin redirect ignored), wherever it now
stands. It refuses with exit 5 ("moved") when no block or more blocks than pinned begin that way,
or when the block's line count differs from the pin (an inserted line); the rehearsal then
records the row as MOVED and types nothing. A changed command that keeps its first line and its
line count is typed as changed; that is the point of cutting instead of retyping.
"""

from __future__ import annotations

import os
import re
import sys

# a step number may carry a letter (11.3a, inserted between 11.3 and 11.4)
HEAD_MD = re.compile(r"^###\s+(\d+\.\d+[a-z]?)\s")
HEAD_BOLD = re.compile(r"^\*\*((?:R\d+|\d+)\.\d+[a-z]?)\s")
SECTION = re.compile(r"^##\s")
NL, TAB = chr(10), chr(9)


def section_lines(lines: list[str], num: str) -> list[str]:
    """A whole `## <num>.` section (used for section 0's conventions: deep health, psql)."""
    out: list[str] = []
    inside = False
    in_fence = False
    for line in lines:
        if line.lstrip().startswith("```"):
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
        return step_lines_from(fh.read().splitlines(), step, path)


def step_lines_from(lines: list[str], step: str, path: str = "the runbook") -> list[str]:
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
        if line.lstrip().startswith("```"):
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
    # A fence may be indented inside a list item (section 0); its body is dedented by the
    # fence's own indentation, as a markdown renderer shows it.
    blocks: list[str] = []
    cur: list[str] | None = None
    indent = 0
    for line in lines:
        if line.lstrip().startswith("```"):
            if cur is None:
                cur = []
                indent = len(line) - len(line.lstrip())
            else:
                blocks.append("\n".join(cur))
                cur = None
            continue
        if cur is not None:
            cur.append(line[indent:] if line[:indent].strip() == "" else line)
    return blocks


def spans(lines: list[str]) -> list[str]:
    text = []
    in_fence = False
    for line in lines:
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            text.append(line)
    joined = "\n".join(text)
    # inline spans may wrap across a line break in the markdown source
    return [s.replace("\n", " ") for s in re.findall(r"`([^`]+)`", joined)]


def shape(lines: list[str]) -> list[tuple[int, int, str]]:
    """(block index, line count, first line) for each fenced block of a step."""
    out = []
    for i, b in enumerate(fences(lines)):
        bl = b.split(NL)
        out.append((i + 1, len(bl), bl[0]))
    return out


def step_names(path: str) -> list[str]:
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    names, in_fence = [], False
    for line in lines:
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = HEAD_MD.match(line) or HEAD_BOLD.match(line)
        if m and m.group(1) not in names:
            names.append(m.group(1))
        s = re.match(r"^## (\d+)\. ", line)
        if s and s.group(1) not in names:
            names.append(s.group(1))
    return names


def pins_of(path: str) -> list[str]:
    rows = []
    for step in step_names(path):
        sh = shape(step_lines(path, step))
        if not sh:
            rows.append(TAB.join([step, "0", "-", "-", "-"]))
        for n, k, first in sh:
            rows.append(TAB.join([step, str(len(sh)), str(n), str(k), first]))
    return rows


STDIN_NULL = re.compile(r"\s+</dev/null(?=\s|;|$|\))")
ANCHOR = re.compile(r"^<!--\s*block:\s*(\S+)\s*-->\s*$")


def key(first: str) -> str:
    """A block's selection key: its first line with whitespace collapsed and any `</dev/null`
    stdin redirect dropped (the runbook adds those to `ffc exec` lines runbook-wide; they change
    no command's meaning for a rehearsal that types into a non-interactive shell)."""
    return " ".join(STDIN_NULL.sub("", first).split())


def anchors(lines: list[str]) -> dict[str, int]:
    """name -> 1-based index of the fenced block that follows `<!-- block: <name> -->`."""
    out: dict[str, int] = {}
    pending: str | None = None
    n = 0
    in_fence = False
    for line in lines:
        if line.lstrip().startswith("```"):
            if not in_fence:
                n += 1
                if pending:
                    out[pending] = n
                    pending = None
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = ANCHOR.match(line.strip())
        if m:
            pending = m.group(1)
        elif line.strip() and pending:
            pending = None  # an anchor binds only the block right below it
    return out


def pick_pinned(pins_path: str, step: str, n: int, lines: list[str]) -> tuple[int | None, str]:
    """Find pinned block n of a step BY CONTENT: the step's block whose first line has the pinned
    key, whatever its position. Returns (index, "") or (None, why)."""
    want: dict[int, tuple[int, str]] = {}
    with open(pins_path, encoding="utf-8") as fh:
        for row in fh.read().splitlines():
            if not row or row.startswith("#"):
                continue
            f = row.split(TAB, 4)
            if f[0] == step and f[2] != "-":
                want[int(f[2])] = (int(f[3]), key(f[4]))
    if not want:
        return None, f"step {step} is not in the pin file {pins_path}"
    if n not in want:
        return None, f"block {n} of step {step} is not pinned"
    k, kk = want[n]
    rank = sum(1 for i, (_, x) in want.items() if x == kk and i < n)
    pinned_same = sum(1 for _, x in want.values() if x == kk)
    hits = [(i, lc) for i, lc, first in shape(lines) if key(first) == kk]
    if not hits:
        return None, f"no block of step {step} begins {kk!r} (pinned block {n})"
    if len(hits) != pinned_same:
        return None, f"{len(hits)} block(s) of step {step} begin {kk!r}; pinned {pinned_same}"
    i, lc = hits[rank]
    if lc != k:
        return None, f"the block of step {step} that begins {kk!r} has {lc} line(s); pinned {k}"
    return i, ""


def check_pin(pins_path: str, step: str, n: int, lines: list[str]) -> str | None:
    """None when pinned block n is found where it was pinned, else the reason (kept for callers
    that index; `fence` selects by content through pick_pinned)."""
    i, why = pick_pinned(pins_path, step, n, lines)
    if i is None:
        return why
    return None if i == n else f"pinned block {n} of step {step} is now block {i}"


def main(argv: list[str]) -> int:
    if len(argv) == 3 and argv[1] == "pins":
        print(NL.join(pins_of(argv[2])))
        return 0
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
    if cmd == "anchors":
        print(NL.join(sorted(anchors(lines))))
        return 0
    if cmd == "fence":
        sel = argv[4]
        fs = fences(lines)
        anch = anchors(lines)
        if sel.startswith("@"):
            # @name: the block under <!-- block: <step>-<name> -->; @name/n falls back to pinned
            # block n when the runbook has no such anchor (a runbook from before the anchors)
            name, _, fallback = sel[1:].partition("/")
            full = f"{step}-{name}"
            if full in anch:
                print(fs[anch[full] - 1])
                return 0
            if not fallback:
                sys.stderr.write(f"runbook.py: MOVED: no anchor <!-- block: {full} --> in step {step}{NL}")
                return 5
            sel = fallback
        n = int(sel)
        if not 1 <= n <= len(fs):
            sys.stderr.write(f"runbook.py: step {step} has {len(fs)} fenced block(s), not {n}\n")
            return 3
        pins = os.environ.get("RB_PINS", "")
        if pins:
            i, why = pick_pinned(pins, step, n, lines)
            if i is None:
                sys.stderr.write(f"runbook.py: MOVED: {why}{NL}")
                return 5
            n = i
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
