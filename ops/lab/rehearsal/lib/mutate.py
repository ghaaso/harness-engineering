#!/usr/bin/env python3
"""Make the runbook copy a negative run (L4_MUTATE=1) reads, and report what the run caught.

  mutate.py <runbook> <copy> <mutations.tsv> <committed pins>
      Applies every `runbook` and `moved` mutation of mutations.tsv to <runbook>, each inside
      its own step only (the text to replace must be there, or this exits 2), and writes <copy>
      and <copy>.pins. The pins are the copy's own shape, so a `runbook` mutation is typed as
      changed; for a `moved` mutation's step the committed pin is kept, so the rig must report
      that step MOVED instead of typing it.

  mutate.py report <results dir> <mutations.tsv> <restore|train>
      Writes <results dir>/mutations.md and mutations-result.tsv: for each mutation of that
      rehearsal, the row it targets, the verdict that row got, and whether the check caught it.

mutations.tsv columns: id, rehearsal, type (runbook | moved | state), step, old, new, target,
kind, what it simulates. `\\n` in old/new is a line break. target is `<phase>|<step label>` for
a step row, or `train|<row>` for a train-table row.
"""

from __future__ import annotations

import csv
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import runbook  # noqa: E402

NL = chr(10)


def load(path: str) -> list[dict[str, str]]:
    with open(path, encoding="utf-8", newline="") as fh:
        rows = [r for r in csv.DictReader((l for l in fh if not l.startswith("#")), delimiter="\t", quoting=csv.QUOTE_NONE)]
    return rows


def step_span(lines: list[str], step: str) -> tuple[int, int]:
    """[start, end) line indexes of a step in the whole file."""
    body = runbook.step_lines_from(lines, step)
    first = body[0]
    for i, line in enumerate(lines):
        if line == first and lines[i : i + len(body)] == body:
            return i, i + len(body)
    raise SystemExit(f"mutate.py: step {step} not located")


def apply(src: str, dst: str, muts: str, pins: str) -> int:
    lines = Path(src).read_text(encoding="utf-8").splitlines()
    moved_steps: list[str] = []
    which = os.environ.get("L4_REHEARSAL", "")
    for m in load(muts):
        if m["type"] not in ("runbook", "moved") or (which and m["rehearsal"] != which):
            continue
        a, b = step_span(lines, m["step"])
        old = m["old"].replace("\\n", NL)
        new = m["new"].replace("\\n", NL)
        text = NL.join(lines[a:b])
        if old not in text:
            print(f"mutate.py: {m['id']}: {old!r} not in step {m['step']}")
            return 2
        lines[a:b] = text.replace(old, new, 1).split(NL)
        print(f"runbook mutation {m['id']} applied to step {m['step']} ({m['type']})")
        if m["type"] == "moved":
            moved_steps.append(m["step"])
    Path(dst).write_text(NL.join(lines) + NL, encoding="utf-8")
    own = runbook.pins_of(dst)
    kept = [r for r in Path(pins).read_text(encoding="utf-8").splitlines() if r and not r.startswith("#")]
    out = [r for r in own if r.split("\t", 1)[0] not in moved_steps]
    out += [r for r in kept if r.split("\t", 1)[0] in moved_steps]
    Path(dst + ".pins").write_text(NL.join(out) + NL, encoding="utf-8")
    return 0


def verdicts(d: Path, phase: str, label: str) -> tuple[list[str], str]:
    """The target row's results in a results folder, and the verdict that means "caught"."""
    rows = load(str(d / "rows.tsv")) if (d / "rows.tsv").exists() else []
    trows = load(str(d / "train.tsv")) if (d / "train.tsv").exists() else []
    tgot = [r["result"] for r in trows if r["row"] == label] if phase == "train" else []
    if tgot:
        return tgot, "FAIL"
    return [r["verdict"] for r in rows if r["phase"] == phase and r["step"] == label], "FAILED"


def report(res: str, muts: str, which: str, base: str | None = None) -> int:
    """A mutation is caught when (1) mutations-applied.log says it was APPLIED (its id matched
    exactly: a runbook mutation by apply(), a state mutation only after its hook's change
    succeeded); (2) its target row reads the wanted verdict; and (3) in the paired normal run
    (<base>: the same ref, same rig, no --mutate) that row did not already read it. Without a
    baseline no mutation counts as caught."""
    d = Path(res)
    applied = (d / "mutations-applied.log").read_text(encoding="utf-8") if (d / "mutations-applied.log").exists() else ""
    bd = Path(base) if base else None
    # the paired run's name as --baseline gave it (run.txt's "baseline: <run>", written by
    # l4_baseline), not the folder it was copied to inside the host (review 201-8c2383e NIT)
    rt = (d / "run.txt").read_text(encoding="utf-8", errors="replace") if (d / "run.txt").exists() else ""
    bname = next((l.split(":", 1)[1].strip() for l in rt.splitlines() if l.startswith("baseline:")), "")
    out_tsv = ["id\tkind\ttarget\twant\tgot\tbaseline\tcaught"]
    md = [
        f"Baseline (the paired normal run): `{(bname or bd.name) if bd else 'NONE'}`",
        "",
        "| Id | Kind of check | Mutation | Target row | Wanted | Got | Baseline | Applied | Caught |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for m in load(muts):
        if m["rehearsal"] != which:
            continue
        phase, label = m["target"].split("|", 1)
        # a train row's check (train.tsv: PASS/FAIL/PARTIAL) or a runbook step's row (rows.tsv)
        got, want = verdicts(d, phase, label)
        if m["type"] == "moved":
            want = "MOVED"
        g = got[-1] if got else "(row absent)"
        if bd:
            bgot, _ = verdicts(bd, phase, label)
            b = bgot[-1] if bgot else "(row absent)"
        else:
            b = "(no baseline)"
        if m["type"] == "state":
            ran = re.search(rf"\tstate mutation {re.escape(m['id'])} \([^)]*\) applied$", applied, re.M) is not None
        else:
            ran = re.search(rf"^runbook mutation {re.escape(m['id'])} applied to step ", applied, re.M) is not None
        # the baseline must have read something else (DONE, or AMBIGUOUS/PARTIAL), never the
        # wanted verdict, and never be absent: otherwise the mutation proved nothing
        based = bd is not None and b not in (want, "(row absent)", "FAILED", "FAIL", "MOVED")
        caught = "yes" if (g == want and ran and based) else "NO"
        out_tsv.append("\t".join([m["id"], m["kind"], m["target"], want, g, b, caught]))
        md.append(f"| {m['id']} | {m['kind']} | {m['what']} | `{m['target']}` | {want} | {g} | {b} | {'yes' if ran else 'NO'} | {caught} |")
    (d / "mutations-result.tsv").write_text(NL.join(out_tsv) + NL, encoding="utf-8")
    (d / "mutations.md").write_text(NL.join(md) + NL, encoding="utf-8")
    print(NL.join(md))
    return 0 if all(r.endswith("\tyes") for r in out_tsv[1:]) else 1


if __name__ == "__main__":
    if len(sys.argv) in (5, 6) and sys.argv[1] == "report":
        sys.exit(report(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) == 6 else None))
    if len(sys.argv) == 5:
        sys.exit(apply(*sys.argv[1:5]))
    sys.stderr.write(__doc__ or "")
    sys.exit(2)
