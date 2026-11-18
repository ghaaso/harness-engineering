# a1 step 3 brief: refute (Opus, fresh context)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Goal
Try to break every claim in `R:a1-claims.md`. Default to doubt: a claim is CONFIRMED only when you have read its
source yourself and it holds as stated, under its stated conditions.

## What you may read
Only `R:a1-claims.md`, the texts under `R:papers/budget/*/` (`paper.txt`, `page.txt`), and the library records and
places a claim cites (`bash library/lookup.sh -f <id>`). Do not read the report, the collect files or the lane
files. Never read a paper text whole: grep, then read ranges.

## Context you need (and no more)
The claims are about two things. (1) Spending a token allowance that refills: a 5-hour window and a weekly window
(and a weekly window for the dearest model), each on its own clock; unspent allowance is lost at the reset; an
empty window stops work; several models of different quality and token price draw on it. (2) Scheduling a few long
units of work. The spender is a coordinator of AI model sessions: a unit lasts minutes, its token cost is known
only roughly before it starts, redoing it costs tokens, a rerun is not the same run, 3 to 16 units run at once,
and there are tens to hundreds of units per window (not measured), not millions.

## Ways a claim breaks
The quotation says less or something else; a condition of the source is dropped (horizon length, number of steps,
i.i.d. or known distribution, budget growing with the horizon, spend per step small against the budget, job length
known, number of processors, workload log); an asymptotic bound (regret, competitive ratio, a limit as the horizon
grows) is stated as if it held for tens of units; a figure from a simulation or a replay of a log is stated as a
trial; a company's self-reported figure is stated as a controlled result; a provider's documentation is stated
beyond what it says or without its date; several budgets are said to combine in a way the source does not state;
a step of inference does not follow; the assumption fails for model sessions; a `hypothesis` is called proven.
Also say where a claim is weaker than the source allows (an understatement).

## Write one file `R:a1-refute.md`
A header line with counts. Per claim: id | verdict `CONFIRMED` / `PARTIALLY` / `REFUTED` / `UNVERIFIABLE` |
the corrected claim (for PARTIALLY or REFUTED) | reasoning in at most three lines with the line read |
what would settle it (for UNVERIFIABLE). Write nothing else; no git writes; no web. Keep every Bash call under
about 120 seconds.

## Return (at most ten lines)
The path; counts by verdict; the claims REFUTED or PARTIALLY that change a conclusion, one phrase each.
