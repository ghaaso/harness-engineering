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
  runbook.py line  <file> <step> <sel> <sub> [<end>]
                                                 the one line of the selected block (sel as for
                                                 fence, or * for every block of the step) that
                                                 contains <sub>; with <end>, from that line to the
                                                 one line after it containing <end> (or to the
                                                 block's last line when <end> is $). Exit 5 when
                                                 no line or more than one contains <sub> (or <end>)
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
or when the block's line count differs from the pin (an inserted line; a pin may list a second
accepted count, `9,8`, for a reviewed second shape); the rehearsal then
records the row as MOVED and types nothing. A changed command that keeps its first line and its
line count is typed as changed; that is the point of cutting instead of retyping. An anchor name
that appears twice in a step is refused (exit 5), never resolved to either block. Part of a block
is chosen by content too (`line`), never by line number.
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
# a here-document opener (`<<'SQL'`, `<<EOF`, `<<-X`), never a here-string (`<<<`)
HEREDOC = re.compile(r"(?<!<)<<-?\s*(['\"]?)([A-Za-z_]\w*)\1")
WORDCH = re.compile(r"[A-Za-z0-9_]")
ASSIGN = re.compile(r"""\s*[A-Za-z_]\w*=(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s;&|]*)""")
KEYWORDS = ("then", "do", "else", "!", "{")


def heredoc_body(lines: list[str]) -> set[int]:
    """Indexes of the lines that are a here-document's body or its closing delimiter: text fed to
    a command, never a command itself."""
    body: set[int] = set()
    i = 0
    while i < len(lines):
        m = None if lines[i].lstrip().startswith("#") else HEREDOC.search(lines[i])
        i += 1
        if m:
            while i < len(lines) and lines[i].strip() != m.group(2):
                body.add(i)
                i += 1
            if i < len(lines):
                body.add(i)
                i += 1
    return body


def shell_marks(line: str) -> tuple[list[int], int]:
    """A light shell reading of one line: where each command begins (the line's start, after an
    unquoted ; & | ( or backtick, and after `$(` outside single quotes) and where an unquoted
    comment begins (len(line) when there is none)."""
    starts, sq, dq, i = [0], False, False, 0
    while i < len(line):
        c = line[i]
        if c == "\\" and not sq:
            i += 2
            continue
        if sq:
            sq = c != "'"
        elif c == "'" and not dq:
            sq = True
        elif c == '"':
            dq = not dq
        elif c == "$" and line[i + 1 : i + 2] == "(":
            starts.append(i + 2)
            i += 1
        elif not dq and c in ";&|(`":
            starts.append(i + 1)
        elif not dq and c == "#" and (i == 0 or line[i - 1] in " " + TAB):
            return starts, i
        i += 1
    return starts, len(line)


def first_word(seg: str) -> str:
    """The command word of a command: leading VAR=value assignments and keywords skipped."""
    while True:
        m = ASSIGN.match(seg)
        if m and m.end() > 0:
            seg = seg[m.end() :]
            continue
        w = seg.split(None, 1)
        if w and w[0] in KEYWORDS:
            seg = w[1] if len(w) > 1 else ""
            continue
        return w[0] if w else ""


def command_hit(line: str, sub: str) -> bool:
    """True when <sub> occurs in <line> as part of a command (review 201-8c2383e MINOR 1): not in a
    comment, not in an echo or printf of the command, and at word boundaries (an option's
    continuation counts as a word: `--report` does not match `--report-json`). Here-document
    bodies are excluded by the caller."""
    if line.lstrip().startswith("#"):
        return False
    starts, comment = shell_marks(line)
    pos = line.find(sub)
    while pos != -1:
        end = pos + len(sub)
        ok = end <= comment
        if ok and WORDCH.match(sub[0]) and pos > 0 and WORDCH.match(line[pos - 1]):
            ok = False
        if ok and WORDCH.match(sub[-1]) and end < len(line) and (WORDCH.match(line[end]) or line[end] == "-"):
            ok = False
        if ok and first_word(line[max(s for s in starts if s <= pos) :]) in ("echo", "printf"):
            ok = False
        if ok:
            return True
        pos = line.find(sub, pos + 1)
    return False


def command_lines(block: str) -> list[tuple[int, str]]:
    """(index, text) of every line of a block that may be chosen by content: here-document bodies
    and their delimiters are left out."""
    bl = block.split(NL)
    skip = heredoc_body(bl)
    return [(i, l) for i, l in enumerate(bl) if i not in skip]


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
    """name -> 1-based index of the fenced block that follows `<!-- block: <name> -->`, or -1 when
    the name anchors more than one block (a duplicate is never resolved to either)."""
    out: dict[str, int] = {}
    pending: str | None = None
    n = 0
    in_fence = False
    for line in lines:
        if line.lstrip().startswith("```"):
            if not in_fence:
                n += 1
                if pending:
                    out[pending] = -1 if pending in out else n
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
                want[int(f[2])] = (f[3], key(f[4]))
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
    if str(lc) not in k.split(","):
        return None, f"the block of step {step} that begins {kk!r} has {lc} line(s); pinned {k}"
    return i, ""


def check_pin(pins_path: str, step: str, n: int, lines: list[str]) -> str | None:
    """None when pinned block n is found where it was pinned, else the reason (kept for callers
    that index; `fence` selects by content through pick_pinned)."""
    i, why = pick_pinned(pins_path, step, n, lines)
    if i is None:
        return why
    return None if i == n else f"pinned block {n} of step {step} is now block {i}"


def select(step: str, sel: str, lines: list[str]) -> tuple[int, str]:
    """(0, block text) or (exit code, why): the block `fence` and `line` select."""
    fs = fences(lines)
    anch = anchors(lines)
    if sel.startswith("@"):
        # @name: the block under <!-- block: <step>-<name> -->; @name/n falls back to pinned
        # block n when the runbook has no such anchor (a runbook from before the anchors)
        name, _, fallback = sel[1:].partition("/")
        full = f"{step}-{name}"
        if anch.get(full) == -1:
            return 5, f"runbook.py: MOVED: the anchor <!-- block: {full} --> appears more than once in step {step}{NL}"
        if full in anch:
            return 0, fs[anch[full] - 1]
        if not fallback:
            return 5, f"runbook.py: MOVED: no anchor <!-- block: {full} --> in step {step}{NL}"
        sel = fallback
    n = int(sel)
    if not 1 <= n <= len(fs):
        return 3, f"runbook.py: step {step} has {len(fs)} fenced block(s), not {n}{NL}"
    pins = os.environ.get("RB_PINS", "")
    if pins:
        i, why = pick_pinned(pins, step, n, lines)
        if i is None:
            return 5, f"runbook.py: MOVED: {why}{NL}"
        n = i
    return 0, fs[n - 1]


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
        rc, out = select(step, argv[4], lines)
        (print if rc == 0 else sys.stderr.write)(out)
        return rc
    if cmd == "line":
        if len(argv) < 6:
            sys.stderr.write(__doc__ or "")
            return 2
        sel, sub, end = argv[4], argv[5], (argv[6] if len(argv) > 6 else None)
        if sel == "*":
            blocks = fences(lines)
            if not blocks:
                sys.stderr.write(f"runbook.py: step {step} has no fenced block{NL}")
                return 3
        else:
            rc, out = select(step, sel, lines)
            if rc:
                sys.stderr.write(out)
                return rc
            blocks = [out]
        # only command text counts: a comment, a here-document body or an echo of the command
        # that names <sub> is not the command (review 201-8c2383e MINOR 1)
        hits = [(b, i) for b, blk in enumerate(blocks) for i, l in command_lines(blk) if command_hit(l, sub)]
        if len(hits) != 1:
            sys.stderr.write(f"runbook.py: MOVED: {len(hits)} command line(s) of step {step} block {sel} contain {sub!r}; want exactly 1{NL}")
            return 5
        b, i = hits[0]
        bl = blocks[b].split(NL)
        if end is None:
            j = i
        elif end == "$":
            j = len(bl) - 1
        else:
            ends = [x for x, l in command_lines(blocks[b]) if x >= i and command_hit(l, end)]
            if len(ends) != 1:
                sys.stderr.write(f"runbook.py: MOVED: {len(ends)} command line(s) from {sub!r} on in step {step} block {sel} contain {end!r}; want exactly 1{NL}")
                return 5
            j = ends[0]
        print(NL.join(bl[i : j + 1]))
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
