#!/usr/bin/env python3
"""Turn a rehearsal's rows.tsv / wrongturns.tsv / train.tsv into results.md.

  report.py <out dir> <title>

The step table keeps the runbook's step numbers; the counts line is what the closing report
quotes. Every value in the TSVs has already been masked by harness.sh (no stand-in secret)."""

from __future__ import annotations

import collections
import csv
import os
import sys


def read(path: str) -> list[dict[str, str]]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8", errors="replace") as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def cell(s: str) -> str:
    return (s or "").replace("|", "\\|").replace("\n", " ").strip()


def main() -> int:
    out, title = sys.argv[1], sys.argv[2]
    rows = read(os.path.join(out, "rows.tsv"))
    wts = read(os.path.join(out, "wrongturns.tsv"))
    train = read(os.path.join(out, "train.tsv"))
    lines = [f"# L4 — {title}", ""]
    counts = collections.Counter(r["verdict"] for r in rows)
    lines.append(
        "Verdicts: "
        + ", ".join(f"{k} {counts[k]}" for k in ("DONE", "FAILED", "AMBIGUOUS", "NRH", "N/A") if counts[k])
        + f" (of {len(rows)} rows; NRH = not rehearsable here)"
    )
    lines += ["", "## Runbook steps", "", "| Phase | Step | Verdict | Run | Check and result | Note |", "| --- | --- | --- | --- | --- | --- |"]
    for r in rows:
        lines.append(
            f"| {cell(r['phase'])} | {cell(r['step'])} | **{cell(r['verdict'])}** | {cell(r['run'])} | {cell(r['check'])} | {cell(r['note'])} |"
        )
    if wts:
        lines += ["", "## Wrong turns", "", "| Id | Wrong turn | What happened | What stopped it | Scripted guard needed? |", "| --- | --- | --- | --- | --- |"]
        for w in wts:
            lines.append("| " + " | ".join(cell(w[k]) for k in ("id", "wrong turn", "what happened", "what stopped it", "scripted guard needed?")) + " |")
    if train:
        lines += ["", "## Deploy-train rows", "", "| Row | Check as written | Result | Evidence |", "| --- | --- | --- | --- |"]
        for t in train:
            lines.append("| " + " | ".join(cell(t[k]) for k in ("row", "check", "result", "evidence")) + " |")
    nrh = [r for r in rows if r["verdict"] == "NRH"]
    if nrh:
        lines += ["", "## Not rehearsable here", ""]
        for r in nrh:
            lines.append(f"- **{cell(r['step'])}** {cell(r['run'])}: {cell(r['note'])}")
    for name, head in (("deviations.log", "Lab substitutions (each one, as it happened)"), ("editor.log", "Edits made in the owner's editor (values never shown)")):
        p = os.path.join(out, name)
        if os.path.exists(p):
            lines += ["", f"## {head}", "", "```", *open(p, encoding="utf-8").read().splitlines(), "```"]
    with open(os.path.join(out, "results.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(lines[2])
    return 0


if __name__ == "__main__":
    sys.exit(main())
