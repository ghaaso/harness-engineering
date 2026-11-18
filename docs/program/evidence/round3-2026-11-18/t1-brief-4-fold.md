# t1 step 4: brief for the fold (kind analyse, Opus)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root.

## Read
`R:t1-claims.md`, `R:t1-report.md` (the draft), `R:t1-gate.md`, `R:t1-refute.md`, `R:lane-tree.md` ("What the
report must settle"), `R:ROUND.md` ("The report", "Library records"), `library/README.md` (the record schema
and rules). Where gate and refuter disagree with the claims file, open the cited place yourself.

## Fold
Give every claim one verdict: `confirmed` (gate LOCATED or MOVED and refuter CONFIRMED), `holds in part`
(refuter PARTIALLY, or gate ALTERED: use the corrected claim), `refuted` (refuter REFUTED, or gate
DEAD_CITATION with no other place found), `cannot be checked` (UNVERIFIABLE or NOT_CHECKABLE). A claim not
confirmed is never called supported. Rewrite `R:t1-report.md` as final: the answer in at most ten lines, then
"Counts by verdict", then the table with the column "what the refuter left" filled, then the four headings the
lane file asks for, then the architecture ranked by expected gain (each part proven / measured here /
hypothesis, the measurement that would set its numbers, small to very large), then "Not found, not opened".
Drop or rewrite every conclusion that rested on a refuted claim; say so in one line where it was. Append a
section "Claim verdicts" to `R:t1-claims.md` (id | verdict | one-line reason).

## Library records
Write `library/journal/2026-11-19/t1.jsonl` (new file; you are its only writer), exactly in the schema and
field order of `library/README.md`, `"by":"t1"`, `"date":"2026-11-19"`:
- one `result` (status `quoted`) per confirmed or held-in-part published finding the conclusions rest on,
  ids from t1-0300; one `fact` per finding about our tree or our record (status `observed` or `quoted`), ids
  from t1-0100; one `hypothesis` (status `reasoned`) per part of the proposed architecture and per answer for
  the three cases, ids from t1-0400; one `open` per measurement the architecture needs, ids from t1-0500.
- If a finding contradicts an existing record (look it up with `bash library/lookup.sh <words>`), write your
  record and an `open` record whose claim begins "proposed correction of <id>". Never supersede another
  writer's record; never edit `library/INDEX.md` or another journal file.
- Each record understood alone; numbers with unit and condition; `evidence` names sources only (`R:` written
  out as the full path, with `#line N`); `see` names records; `handles` gives search words.
Check each line parses: `node -e "require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').forEach((l,i)=>{try{JSON.parse(l)}catch(e){console.log(i+1,e.message)}})" <file>`.

Return at most ten lines: the paths, the counts by verdict, the record counts by kind, the answer in three lines.
