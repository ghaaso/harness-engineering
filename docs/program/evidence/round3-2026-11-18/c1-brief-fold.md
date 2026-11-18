# c1 step 4 brief: fold (Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Read
`R:ROUND.md` ("The report", "Library records"), `R:lane-check.md` ("What the report must settle"),
`library/README.md` (all: the record schema and rules), `R:c1-claims.md`, `R:c1-gate.md`, `R:c1-refute.md`,
`R:c1-report.md` (the draft). Open a paper text only to settle a disagreement between gate and refuter.

## Fold
Each claim gets one final verdict: `confirmed` (gate STANDS and refuter CONFIRMED), `holds in part` (use the
refuter's corrected claim), `refuted`, `cannot be checked` (say what would settle it). A gate fault (MOVED,
ALTERED, NOT FOUND) is fixed to the true text if the meaning holds, else the claim drops to `cannot be checked`.
A claim not confirmed is never called supported. Rewrite `R:c1-report.md` as final: fill the column "what the
refuter left", change every conclusion that rested on a refuted or partial claim, add a short section "Verdicts"
with the counts and one line per claim not confirmed. Keep the format of ROUND.md and the five points of the lane
file. Keep the answer at most ten lines, first.

## Library records: `library/journal/2026-11-19/c1.jsonl` (new file; prefix `c1`, `by` "c1", `date` "2026-11-19")
Follow `library/README.md` exactly: one JSON object per line, fields in the README's order, empty fields left
out, ids in the range of their kind. Write:
- one `result` (status `quoted`) per confirmed or holds-in-part published finding the report's conclusions rest
  on (evidence: `R:c1-collect-<topic>.md` with the paper's URL; claim carries unit and condition);
- one `hypothesis` (status `reasoned`) per part of the proposed architecture, with the measurement that sets it;
- one `fact` per thing true of our lane or tree that the report states (evidence: the b1 record's place);
- one `status` record: what this round read (papers read in full, not opened) for the check;
- for each existing record the findings contradict: your own `result` plus an `open` record whose claim begins
  "proposed correction of <id>", with `see` naming both. Supersede nothing; do not edit `library/INDEX.md`.
Each record must be understood alone. Then validate: `node -e` that each line parses and ids are unique.

## Rules
Reading and writing only. Write only `R:c1-report.md` and `library/journal/2026-11-19/c1.jsonl`. No git writes.

## Return (at most ten lines)
Counts by verdict; the answer in three lines; record count by kind; the proposed corrections by id.
