# Brief b1/fold (Opus, kind analyse): fold the verdicts in, write the records

Repo root: C:\Users\User\Documents\projects\harness-engineering. F = docs/program/evidence/bottleneck-2026-11-18/.
Write only F/BUILD-IN.md and library/journal/2026-11-18/b1.jsonl. Do not edit library/INDEX.md or any other record file.
Read F/BUILD-IN.md, F/b1-claims.md, F/b1-gate.md, F/b1-refute.md, library/README.md.
1. Fold into BUILD-IN.md. Fix every claim the gate or the refuter changed. A claim that was not confirmed is never
   called supported: mark it holds in part, refuted (and removed or replaced), or cannot be checked. Add a section
   "Verdicts" with the counts and, for each refuted or narrowed item, what changed. Keep the ten-line answer true.
2. Write library/journal/2026-11-18/b1.jsonl exactly as library/README.md says (field order; one object per line;
   "by":"b1", "date":"2026-11-18"): each design decision a hypothesis (b1-04xx, status reasoned); each confirmed code
   fact a fact (b1-01xx, status observed, evidence path#line); each contradiction of an existing record a fact or
   result plus an open record whose claim begins "proposed correction of <id>" (b1-05xx); one pointer b1-0701 to
   BUILD-IN.md. Supersede nobody's record.
3. Check with node that every line parses, ids are unique, and fields come in the README's order.
Final reply: counts of records by kind, and the three biggest changes the refuter forced, in at most 5 lines.
