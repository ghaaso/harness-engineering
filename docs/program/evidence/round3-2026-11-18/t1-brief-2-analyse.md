# t1 step 2: brief for the analyst (kind analyse, Opus)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root. Prepend nothing; this is
the whole brief. Use the PROJECT CONTEXT block at the top of `R:t1-brief-1-collect.md` (read it) as given.

## Goal
Answer the lane question of `R:lane-tree.md`: which kind of B-tree, or which combination, fits a tree whose
nodes are model sessions, for (a) a small job known up front, (b) a job that grows while it runs, (c) a very
large project that needs inner levels; the choice stated by measurable features of the work.

## Read
`R:ROUND.md` (sections "What the owner asked", "The report"), `R:lane-tree.md` (all), the five files
`R:t1-collect-ours.md`, `-concurrent.md`, `-writes.md`, `-versions.md`, `-hierarchy.md`. When a claim rests
on a paper, open its `R:papers/tree/<name>/paper.txt` at the cited line and read around it (grep; never the
whole text). Our files: only at the lines the `ours` file cites. List every extra file you read at the end of
the claims file.

## Write two files
1. `R:t1-claims.md`: every claim the report rests on, numbered C01, C02, ... One block each: the claim in one
   sentence; its mark (`proven` = quoted from a paper read in full; `measured here`; `observed` in our files;
   `hypothesis` = reasoned; `summary` = read only as a summary, never used to decide); the quote; its place
   (`R:papers/tree/<name>/paper.txt line N` or `path:line`). A claim about sessions that rests on a paper's
   result is two claims: the paper's result (proven) and the transfer to sessions (hypothesis), with the
   assumption the transfer needs.
2. `R:t1-report.md` (draft), in ROUND.md's order: the answer in at most ten lines; the table (conclusion |
   where it comes from (claim ids) | measured gain and its conditions | what the refuter left (write "pending")
   | what is still a guess for model sessions | what it would change in our rule
   (`docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`, read only the parts you need) or our tree);
   the architecture proposed for our case, ranked by expected gain, each part marked proven / measured here /
   hypothesis, with the measurement that would set its numbers and how it behaves from small to very large
   projects; what was not found and not opened, with what was searched.

The report must settle the four points under "What the report must settle" in `R:lane-tree.md`, each under its
own heading: (1) the operation map: search, insert, split, merge, rebalance, root change, buffer flush, each
with what it means for sessions and its cost in tokens and time as far as the record gives it, "not measured"
where it does not; (2) the variant or combination for the three cases, by measurable features (how often a leaf
overflows, messages down against up, how many nodes change at once, total work against what one node holds);
(3) what the choice changes in the tree's design and in the 13 fixes, without designing the change; (4) what
is left for task r57-0505 (knowledge transfer between nodes, the CAP theorem); do not start it.

Rules: no test, measurement or download. A number not in the record is named as a measurement, never guessed.
Prefer laws in ratios (depth = log of work over leaf capacity, write against read cost by batch size) over
thresholds. "Not found in the papers read" is never "no paper": say what was searched. Say plainly where you
are not sure.

Return at most ten lines: the two paths, the number of claims by mark, the answer in three lines.
