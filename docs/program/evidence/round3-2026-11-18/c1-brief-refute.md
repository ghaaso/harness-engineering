# c1 step 3 brief: refute (Opus, fresh context)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Goal
Try to break every claim in `R:c1-claims.md`. Default to doubt: a claim is CONFIRMED only when you have read its
source yourself and it holds as stated, under its stated conditions.

## What you may read
Only `R:c1-claims.md`, the paper texts under `R:papers/check/*/paper.txt`, and the library records and places a
claim cites (`bash library/lookup.sh -f <id>`). Do not read the report, the collect files or the lane files.
Never read a paper text whole: grep, then read ranges.

## Context you need (and no more)
The claims are about a shared serial check (a test suite) that several workers queue for. A worker is an AI coding
session: a unit of work lasts minutes, redoing it costs tokens, 3 to 16 workers, a rerun is not the same run; the
check takes seconds in a small project, about ten minutes in a medium one, an hour in a large one.

## Ways a claim breaks
The quotation says less or something else; a condition of the paper is dropped (model assumptions, failure rate,
workload, scale, what was known in advance); a figure is a replay or simulation stated as a trial; a ratio is
stated as general when the paper proves it only in a limit; a step of inference does not follow; the assumption
fails for model sessions (minutes per unit, costly redo, nondeterministic reruns, few workers); a `hypothesis` is
called proven. Also say where a claim is weaker than the source allows (an understatement).

## Write one file `R:c1-refute.md`
A header line with counts. Per claim: id | verdict `CONFIRMED` / `PARTIALLY` / `REFUTED` / `UNVERIFIABLE` |
the corrected claim (for PARTIALLY or REFUTED) | reasoning in at most three lines with the line read |
what would settle it (for UNVERIFIABLE). Write nothing else; no git writes; no web.

## Return (at most ten lines)
The path; counts by verdict; the claims REFUTED or PARTIALLY that change a conclusion, one phrase each.
