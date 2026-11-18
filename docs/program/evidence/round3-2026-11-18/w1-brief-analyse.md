# w1 step 2: analyse (opus): draft the report and the claims

Read first: `R:w1-brief-common.md`; `R:ROUND.md` sections "What the owner asked", "The report" and "Library
records"; all of `R:lane-writers.md`.

## Inputs (read these; follow a citation one hop into `R:papers/w1/*/paper.txt` when a claim depends on it)

- The six collect files `R:w1-collect-isolation.md`, `-grain.md`, `-engines.md`, `-order.md`, `-merge.md`,
  `-long.md`, each with its section "Second attempt" if it has one.
- Our rule: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`, the parts on several writers.
- What the harness can enforce today: `docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md` section 1 (the
  several-writers step) and records b1-0101 to b1-0126 (`bash library/lookup.sh -f b1-0101` and so on, or
  `grep -h '"id":"b1-01' library/journal/2026-11-18/b1.jsonl`). Do not assume how the Edit tool, a hook or a
  worktree behaves beyond what those records show.
- Records r57-0406, r57-0128, r57-0301 to r57-0306, r57-0308, r57-0401 (look them up).
- Caveat: in `R:w1-collect-grain.md`, the block on Mohan 1990 (ARIES/KVL) was read from a copy in
  `R:papers/w1/mohan90/` whose origin no session recorded, after one fetch that worked round a 403 (that copy
  was deleted unread). Rest no claim on Mohan alone: cite it only where Graefe 2010, Graefe 2007 or the InnoDB
  page says the same, and cite those.

## Write

1. `R:w1-claims.md`: every claim the report rests on, numbered `W01`, `W02`, ... One block each: the claim in one
   sentence with its conditions; the quote; `path:line` (a `paper.txt` line, or a collect file line when the
   collector reused a library quote); its standing: `proven` (in the literature, quoted), `measured here`
   (a library record of kind fact with status measured), or `hypothesis`. A claim about model sessions is a
   hypothesis unless something here measured it.
2. `R:w1-report.md` in the format of `R:ROUND.md` "The report": the answer in at most ten lines; the table
   (conclusion; where it comes from; measured gain and conditions; what the refuter left, to be filled at step 4,
   write "pending"; what is still a guess for model sessions; what it would change in our rule or our tree); the
   architecture proposed for our case, ranked by expected gain, each part marked proven / measured here /
   hypothesis, with the measurement that would set its numbers and its behaviour for 2 writers and for 16, for a
   small file and a very large one; what was not found and not opened, with what was searched. Every sentence of
   the report that states a fact names its claim id.
3. The report must settle the four points under "What the report must settle" in `R:lane-writers.md`: the frame
   (right, wrong, missing a failure or a means); per means the largest measured gain and whether it survives for
   model sessions; what the harness can and cannot enforce today; the ranked architecture replacing the two-way
   switch. Prefer laws in ratios over thresholds (r57-0028). Name a missing number as a measurement; never guess
   one (r57-0001, r57-0002). Say how each conclusion was reached (r57-0027).

## Done returns (at most ten lines)

The two paths; the count of claims by standing; the answer in three lines; anything a collector missed that the
report needs.
