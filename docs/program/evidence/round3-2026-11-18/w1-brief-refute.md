# w1 step 3b: refute (opus, fresh context): try to break every claim

Read first: `R:w1-brief-common.md`. Then `R:w1-claims.md` and the paper texts under `R:papers/w1/*/paper.txt`.
Read nothing else of this lane: not the report, not the collect files, not `R:lane-writers.md`. You may look up
library records the claims name.

Default to refuting. For each claim `Wnn`, try to break it:
- the quote is cut so that it says more than the paper (a dropped condition, workload, scale, or baseline);
- the gain is the best case of a sweep, a different baseline, or a simulation, reported as general;
- the claim generalises past what was measured (cores to sessions, microseconds to minutes, cheap aborts to
  costly ones, a deterministic rerun to a non-deterministic one);
- a later paper or the same paper contradicts it;
- for a `hypothesis` about model sessions: the strongest reason it fails, and what would show it.

Write `R:w1-refute.md`: per claim a block with the fields of the VERDICT schema of section 5.2 of
`docs/ORCHESTRATION-DESIGN-2026-10.md` that apply here: `finding_id`, `verdict` (`CONFIRMED`, `PARTIALLY`,
`REFUTED`, `UNVERIFIABLE`), `corrected_claim` (on PARTIALLY or REFUTED), `reasoning` (two to four lines, with the
`paper.txt:line` you read), `what_would_settle_it` (on UNVERIFIABLE). End with the counts, then "Missing": claims
the report would need that are absent, and failures or means of parallelism the claims ignore.

Done returns (at most ten lines): the path; counts by verdict; the ids refuted, one line each.
