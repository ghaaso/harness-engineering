# w1 step 4: fold (opus, analyse): verdicts into the report; the lane's records

Read first: `R:w1-brief-common.md`; `library/README.md` whole (the record schema and its rules); `R:ROUND.md`
sections "The report" and "Library records". Then `R:w1-report.md`, `R:w1-claims.md`, `R:w1-gate.md`,
`R:w1-refute.md`. Follow a citation into a `paper.txt` only where gate and refuter disagree or a verdict is unclear.

## 1. The final report `R:w1-report.md`

- Give every claim one verdict: `confirmed` (gate STANDS or MOVED, refuter CONFIRMED), `holds in part` (refuter
  PARTIALLY, or gate NUMBER-ABSENT: use the corrected claim), `refuted`, or `cannot be checked` (gate ABSENT or
  NO-FILE, or refuter UNVERIFIABLE). A claim not confirmed is never called supported. A hypothesis stays a
  hypothesis whatever the refuter said; record what the refuter found against it.
- Rewrite the report so every conclusion rests only on what survived; fill the table's column "what the refuter
  left of it"; re-rank the architecture if a verdict moves it; add the refuter's "Missing" items, each with what
  would settle it. Add a short section "Verdicts" (counts, and one line per claim not confirmed).
- Keep the four points of `R:lane-writers.md` "What the report must settle" answered, each under its own heading.
- Mark the report final at the top with the date 2026-11-19.

## 2. The lane's records `library/journal/2026-11-19/w1.jsonl`

`mkdir -p library/journal/2026-11-19`. Write only this file. Follow `library/README.md` exactly: one JSON object
per line, the fields in its order, ids `w1-<kind range>` (results 0300 to 0399, hypotheses 0400 to 0499, facts
0100 to 0199, open 0500 to 0599, pointers 0700 to 0799), `"date":"2026-11-19"`, `"by":"w1"`.
- One `result` (status `quoted`) per confirmed or holds-in-part claim from a paper that the decision rule or the
  architecture rests on; the claim carries its conditions and, for holds in part, the corrected wording.
- One `hypothesis` (status `reasoned`) per part of the proposed architecture, with the measurement that would set
  its number in the claim.
- A `fact` only for something true of our harness that BUILD-IN.md or a b1 record shows; cite it.
- One `pointer` to the final report. One `open` per measurement the architecture needs.
- Where a finding contradicts an existing record (for example r57-0406, r57-0308, r57-0301 to r57-0306), write
  your finding and an `open` record whose claim begins "proposed correction of <id>". Never supersede another
  writer's record.
- `evidence` names sources only: a path in this repository with a line or section (the collect file and line,
  `docs/program/evidence/round3-2026-11-18/w1-report.md#<section>`), and the paper's URL. The `papers/` folder is
  not committed: do not cite a `paper.txt` path alone.
- Check by command: `node -e` that every line parses and that keys come in the README's order.

## Done returns (at most ten lines)

Counts by verdict; the answer in three lines; the count of records by kind; the proposed corrections by id.
