# Brief: gate on the claims of version 2 (step 2a, kind run, Sonnet)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` means
`docs/program/evidence/round3-2026-11-18/`.

## Task

`R:v2-claims.md` numbers the statements of the draft `R:RULE-V2-DRAFT.md` as `V2-001`, `V2-002`, ... Each row cites
one or more lane claim ids (lanes c1, w1, t1, a1) and states the verdict each carries, word for word, and whether the
draft uses it in full or in part.

For every row, and for every claim id the row cites:
1. Does the id exist in that lane's claims file (`R:c1-claims.md`, `R:w1-claims.md`, `R:t1-claims.md`,
   `R:a1-claims.md`)? Search for it exactly.
2. Does it carry the verdict the row states? Take the verdict from the claims file; if the claims file gives none,
   from the lane's refute file(s) (`R:c1-refute.md`, `R:w1-refute.md`, `R:t1-refute.md`, `R:a1-refute-1.md`,
   `R:a1-refute-2.md`). Say which file it came from.
3. If the row says the draft uses the claim "in full" but the verdict is anything short of fully held (held in part,
   weakened, refuted, cannot be checked, or the lane's own words for these), flag it.

Then two cross-checks between the files: every `V2-` id that appears in `R:RULE-V2-DRAFT.md` has a row in
`R:v2-claims.md`, and every row in `R:v2-claims.md` appears in the draft. List any that do not.

## Write

`R:v2-gate.md`: one table, a row per (V2 id, claim id): exists (yes/no); verdict stated; verdict found and its file;
match (yes/no); flag. Then the cross-check lists. Then counts: rows checked, ids missing, verdict mismatches, flags.
Mechanical work: do not judge whether a statement follows from its claim; another helper does that.

## Limits

Reading and writing only. Write only `R:v2-gate.md`. Do not edit any other file, do not commit, no test, install,
download or web search. Do not touch `R:intake-*`, `library/INDEX-draft.md`, `library/tests/`.

## Return (ten lines or fewer)

The path; the counts; the ids that are missing or mismatched, by V2 id (at most five lines; the rest is in the file).
