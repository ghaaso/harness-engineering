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
  - an anchor name used twice in a step is MOVED (5), never the later block (review m1);
  - `line` takes the one line containing a substring, from one block or from every block of the
    step (*), whichever block it stands in; zero or two matches are MOVED (5) (review M2);
  - only command text is chosen: a comment, an echo of the command, a here-document line and a
    longer option (`--report-json` for `--report`) never stand in for a missing command (MOVED)
    and never compete with the real one (review 201-8c2383e MINOR 1);
  - 6.12's up line is typed unless block 1 holds exactly that line, and a missing up line is
    MOVED (lib/harness.sh rb_up_plan; MINOR 2);
  - WT16's verdict follows what was measured, not one printed line (lib/harness.sh drop_verdict;
    MINOR 3): a lost write needs the backend seen running and the sign-off present, a STOP needs
    both writes kept, and anything else is UNCLEAR;
  - a renamed step is refused as missing (exit 3).
Each case uses a block the rig really types and that main and the runbook batch both keep (6.8,
6.4, 6.12's up line), so the test holds on either text.
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
    args = ["line", path, step] + n.split("\t") if "\t" in n else ["fence", path, step, n]
    p = subprocess.run([sys.executable, os.path.join(HERE, "runbook.py")] + args,
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


def duplicate_anchor(body: list[str]) -> list[str]:
    i = first_fence(body)
    return (body[:i] + ["<!-- block: 6.8-appendix -->", "```bash", "echo first", "```", "",
                        "<!-- block: 6.8-appendix -->", "```bash", "echo decoy", "```", ""] + body[i:])


UP = "force-recreate backend"


def up_line_alone(body: list[str]) -> list[str]:
    # the up line moved out of its block into one of its own, after the next prose line
    up = next(l for l in body if UP in l)
    rest = [l for l in body if l is not up]
    i = max(k for k, l in enumerate(rest) if l.startswith("```") and k < next(j for j, x in enumerate(rest) if x.startswith("**Check")))
    return rest[:i + 1] + ["", "Then:", "", "```bash", up, "```"] + rest[i + 1:]


def replace_line(old: str, new: list[str]):
    return lambda b: [x for l in b for x in (new if l == old else [l])]


def into_heredoc(new: str):
    # a line added inside the step's first here-document body (an SQL comment naming the command)
    def f(b: list[str]) -> list[str]:
        i = next(k for k, l in enumerate(b) if "<<'" in l)
        return b[: i + 1] + [new] + b[i + 1 :]
    return f


def main() -> int:
    src, pins = sys.argv[1], sys.argv[2]
    text = open(src, encoding="utf-8").read()
    # the real lines as the unedited runbook has them (the first two `line` cases below assert
    # that these resolve); each mutation below edits around them
    up = cut(src, pins, "6.12", "*\t" + UP)[1].strip()
    rep = cut(src, pins, "6.13", "*\tset_pin --report")[1].strip()
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
        ("6.8, an anchor name used twice", edit_step(text, "6.8", duplicate_anchor), "6.8", "@appendix", 5, None),
        ("6.12, line * by content", text, "6.12", "*\t" + UP, 0, "up -d"),
        ("6.12, the up line in a block of its own", edit_step(text, "6.12", up_line_alone), "6.12", "*\t" + UP, 0, "up -d"),
        ("6.12, the up line twice", edit_step(text, "6.12", lambda b: add_block_before_first(b, next(l for l in b if UP in l))),
         "6.12", "*\t" + UP, 5, None),
        ("6.12, no line contains the substring", text, "6.12", "*\tno such text in 6.12", 5, None),
        # review 201-8c2383e MINOR 1: only command text is chosen
        ("6.13, line * by content", text, "6.13", "*\tset_pin --report", 0, "=" + rep),
        ("6.12, the up line gone, a comment naming it (B)",
         edit_step(text, "6.12", replace_line(up, ["# needs: ffc ... --force-recreate backend first"])), "6.12", "*\t" + UP, 5, None),
        ("6.12, the up line gone, a trailing comment naming it",
         edit_step(text, "6.12", replace_line(up, ["echo done   # then " + UP])), "6.12", "*\t" + UP, 5, None),
        ("6.13, only a longer option (--report-json) left (C)",
         edit_step(text, "6.13", replace_line(rep, [rep.replace("--report", "--report-json")])), "6.13", "*\tset_pin --report", 5, None),
        ("6.13, a --report-json line beside the real one",
         edit_step(text, "6.13", replace_line(rep, [rep.replace("--report", "--report-json"), rep])), "6.13", "*\tset_pin --report", 0, "=" + rep),
        ("6.12, the up line gone, an echo of it left (D)",
         edit_step(text, "6.12", replace_line(up, [f'echo "now: {up}"'])), "6.12", "*\t" + UP, 5, None),
        ("6.12, an echo of the up line beside the real one",
         edit_step(text, "6.12", replace_line(up, [f'echo "now: {up}"', up])), "6.12", "*\t" + UP, 0, "=" + up),
        ("6.12, a line in the here-document naming the up line (E)",
         edit_step(text, "6.12", into_heredoc("-- then " + up)), "6.12", "*\t" + UP, 0, "=" + up),
        ("6.12, the up line gone, only the here-document names it",
         edit_step(text, "6.12", lambda b: into_heredoc("-- then " + up)(replace_line(up, [])(b))), "6.12", "*\t" + UP, 5, None),
    ]
    bad = 0
    with tempfile.TemporaryDirectory() as d:
        # review 201-8c2383e MINOR 2: 6.12's up line is typed unless block 1 holds exactly that
        # line, and a missing up line is MOVED. lib/harness.sh's rb_up_plan decides; each case
        # below cuts block 1 and the up line from an edited text and asks it.
        def plan(body: str) -> str:
            p = os.path.join(d, "plan.md")
            open(p, "w", encoding="utf-8").write(body)
            b = cut(p, pins, "6.12", "1")
            u = cut(p, pins, "6.12", "*\t" + UP)
            blk = b[1].rstrip(NL) if b[0] == 0 else "__RB_MISSING__"
            ln = u[1].rstrip(NL) if u[0] == 0 else "__RB_MISSING__"
            r = subprocess.run(["bash", "-c", '. "$0"; rb_up_plan "$1" "$2"', os.path.join(HERE, "harness.sh"), blk, ln],
                               capture_output=True, text=True)
            return r.stdout.strip() or r.stderr.strip()[:80]

        base = plan(text)
        blk0 = cut(src, pins, "6.12", "1")[1].rstrip(NL).split(NL)
        e_text = edit_step(text, "6.12", into_heredoc("-- then " + up))
        with open(os.path.join(d, "e.md"), "w", encoding="utf-8") as f:
            f.write(e_text)
        e_blk_ok = cut(os.path.join(d, "e.md"), pins, "6.12", "1")[0] == 0
        pcases = [
            ("6.12 plan, unchanged text", base, "in-block" if up in blk0 else "own"),
            ("6.12 plan, a here-document line naming the up line (E)", plan(e_text), base if e_blk_ok else "moved"),
            ("6.12 plan, the up line gone, a comment naming it (B)",
             plan(edit_step(text, "6.12", replace_line(up, ["# needs: ffc ... --force-recreate backend first"]))), "moved"),
            ("6.12 plan, the up line gone, an echo of it left (D)",
             plan(edit_step(text, "6.12", replace_line(up, [f'echo "now: {up}"']))), "moved"),
            ("rb_up_plan, a block that only mentions the line",
             subprocess.run(["bash", "-c", '. "$0"; rb_up_plan "$1" "$2"', os.path.join(HERE, "harness.sh"),
                             "psql <<'SQL'" + NL + "-- then " + up + NL + "SQL", up], capture_output=True, text=True).stdout.strip(), "own"),
            ("rb_up_plan, a block that holds the line",
             subprocess.run(["bash", "-c", '. "$0"; rb_up_plan "$1" "$2"', os.path.join(HERE, "harness.sh"),
                             "psql <<'SQL'" + NL + "SQL" + NL + up, up], capture_output=True, text=True).stdout.strip(), "in-block"),
        ]
        # review 201-8c2383e MINOR 3: WT16's verdict (lib/harness.sh drop_verdict) rests on what
        # was measured, never on `restore exit=` alone
        def dv(*a: str) -> str:
            return subprocess.run(["bash", "-c", '. "$0"; drop_verdict "$@"', os.path.join(HERE, "harness.sh"), *a],
                                  capture_output=True, text=True).stdout.strip()

        pcases += [
            ("WT16 verdict, both writes gone, backend running, sign-off present",
             dv("0 restore exit=0", "", "1", "0", "1", "0", "3", "present"), "lost"),
            ("WT16 verdict, 'restore exit=' printed but the DROP failed (writes kept)",
             dv("ERROR: ... restore exit=1", "", "1", "1", "1", "1", "3", "present"), "unclear"),
            ("WT16 verdict, the write gone but the backend never seen running",
             dv("0 restore exit=0", "", "1", "0", "1", "0", "0", "present"), "unclear"),
            ("WT16 verdict, the write gone with the sign-off absent",
             dv("0 restore exit=0", "", "1", "0", "1", "0", "3", "absent"), "unclear"),
            ("WT16 verdict, a STOP line and both writes kept (the DROP line's own test)",
             dv("STOP: this database is live", "STOP: this database is live", "1", "1", "1", "1", "3", "present"), "stopped"),
            ("WT16 verdict, a STOP line but a write lost",
             dv("STOP: x", "STOP: x", "1", "1", "1", "0", "3", "present"), "unclear"),
        ]
        for name, got, want in pcases:
            ok = got == want
            bad += not ok
            print(f"{'ok  ' if ok else 'FAIL'} {name}: {got} (want {want})")
        for name, body, step, sel, want, needle in cases:
            p = os.path.join(d, "rb.md")
            open(p, "w", encoding="utf-8").write(body)
            rc, out = cut(p, pins, step, sel)
            # a needle starting with "=" must be the whole output (the one line chosen)
            ok = rc == want and (needle is None or (out.strip() == needle[1:] if needle.startswith("=") else needle in out))
            bad += not ok
            last = out.strip().splitlines()[-1][:150] if out.strip() else ""
            print(f"{'ok  ' if ok else 'FAIL'} {name}: exit {rc} (want {want}){'' if rc == 0 else ': ' + last}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
