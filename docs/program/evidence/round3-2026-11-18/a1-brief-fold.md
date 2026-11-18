# a1 step 4 brief: fold (Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Read
`R:ROUND.md` ("The report", "Library records", "Keeping the library clean"), `R:lane-budget.md` ("What the report
must settle"), `library/README.md` (all: the record schema and rules), `R:a1-claims.md`, `R:a1-gate.md`,
`R:a1-refute.md`, `R:a1-report.md` (the draft). Open a paper text only to settle a disagreement between gate and
refuter.

## Fold
Each claim gets one final verdict: `confirmed` (gate STANDS and refuter CONFIRMED), `holds in part` (use the
refuter's corrected claim), `refuted`, `cannot be checked` (say what would settle it). A gate fault (MOVED,
ALTERED, NOT FOUND) is fixed to the true text if the meaning holds, else the claim drops to `cannot be checked`.
A claim not confirmed is never called supported. Rewrite `R:a1-report.md` as final: fill the column "what the
refuter left", change every conclusion that rested on a refuted or partial claim, add a short section "Verdicts"
with the counts and one line per claim not confirmed. Keep the format of ROUND.md and the five points of the lane
file, each settled. Keep the answer at most ten lines, first.

## Library records: `library/journal/2026-11-19/a1.jsonl` (new file; prefix `a1`, `by` "a1", `date` "2026-11-19")
Follow `library/README.md` exactly: one JSON object per line, fields in the README's order, empty fields left
out, ids in the range of their kind. Write:
- one `result` (status `quoted`) per confirmed or holds-in-part published finding the report's conclusions rest
  on, in its narrowed form where the refuter narrowed it (evidence: `R:a1-collect-<topic>.md` with the source's
  URL; claim carries unit, baseline, workload, scale and condition; a company's figure says "self-reported"; a
  provider's documented behaviour of our allowance says its page and fetch date);
- one `hypothesis` (status `reasoned`) per part of the proposed rule or schedule, with the measurement that sets it;
- one `open` record per measurement the report names as missing (tokens per unit by kind and model, quality per
  token by kind, length estimate accuracy, whatever the documentation leaves unknown about our windows);
- one `status` record: what this lane read (sources read in full, not opened), the counts by verdict, and each
  refuted claim with the reason, so it is not proposed again;
- for each existing record the findings contradict (for example o2-0501): your own `result` plus an `open`
  record whose claim begins "proposed correction of <id>", with `see` naming both. Supersede nothing; do not edit
  `library/INDEX.md`; do not edit another writer's record. A refuted claim gives no `result`.
Each record must be understood alone. Then validate: `node -e` that each line parses and ids are unique.

## Rules
Reading and writing only. Write only `R:a1-report.md` and `library/journal/2026-11-19/a1.jsonl` (create the folder
if missing). No web, no git writes.

## Return (at most ten lines)
Counts by verdict; the answer in three lines; record count by kind; the proposed corrections by id.
