# Brief: fold the verdicts into version 2 and record its decisions (step 3, kind analyse, Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` means
`docs/program/evidence/round3-2026-11-18/`. `B:` means `docs/program/evidence/bottleneck-2026-11-18/`.

## What exists

`R:RULE-V2-DRAFT.md` is the draft of version 2 of the decision rule; `R:v2-claims.md` numbers its statements
(`V2-001`, ...) against lane claim ids. Two checks ran on it: `R:v2-gate.md` (does each cited claim id exist and carry
the stated verdict) and `R:v2-refute.md` (a fresh-context refuter's verdict per statement: confirmed, holds in part,
refuted, cannot be checked). Version 1 is `B:DECISION-RULE.md`; the draft's brief is `R:v2-brief-draft.md`.

## Task

1. Read the draft, `R:v2-claims.md`, `R:v2-gate.md` and `R:v2-refute.md` in full. Open a lane claims or refute file
   only to settle a point the refuter or the gate raised.
2. Fold the verdicts into `R:RULE-V2-DRAFT.md`:
   - Every `V2-` statement carries its verdict beside it: `confirmed`, `holds in part`, `refuted`, `cannot be checked`.
   - A statement not confirmed is never called supported, sound or established. Narrow a `holds in part` statement to
     the part that held, or say which part failed. A `refuted` statement leaves the rule: replace it with what the
     refuter showed, or mark the point open and name the measurement or reading that would settle it. Never fill a
     gap with a guessed number (r57-0001, r57-0002).
   - Fix every claim id or verdict the gate found wrong, in the draft and in `R:v2-claims.md` (add a verdict column to
     `R:v2-claims.md` with the refuter's verdict).
   - Where the refuter found a contradiction between lanes that the draft hid, the draft says so and takes a position
     only if a lane claim decides it; otherwise it names the measurement that would.
   - Update the answer at the top, the table and the measurements list so they match the folded rule.
   - Add a section "Verdicts" at the end: counts by verdict; a short list of what changed in the fold and why; what
     stays open.
3. Write the draft's design decisions as records in `library/journal/2026-11-19/v2.jsonl`. Read `library/README.md`
   first and follow it exactly: field order, id ranges, the prefix `v2`, evidence as path and section. Every record
   has the type the README gives for a hypothesis (each decision of the draft is a hypothesis until the top session
   decides and a measurement sets its numbers). One record per decision of the rule, not per statement; a decision
   whose statements were refuted is not recorded as a decision. Do not supersede any record. Look at one existing file
   in `library/journal/2026-11-19/` (for example `a1.jsonl`, first lines only) to match the form.

## Points from the checks (added after step 2)

- The fold never raises a verdict itself. `V2-108` to `V2-112` stay `cannot be checked` (the refuter was not shown the
  report sections they rest on); say so in "Verdicts" and name what a later check would read.
- The gate flagged `V2-004`: it uses a1:A05, found PARTIALLY, "in full". Narrow it.
- The refuter lists hidden contradictions inside single lanes as well as between lanes; treat both the same way.

## Limits

Reading and writing only. Write only `R:RULE-V2-DRAFT.md`, `R:v2-claims.md` and `library/journal/2026-11-19/v2.jsonl`.
Do not edit `B:DECISION-RULE.md` (version 1 stays until the top session decides), `B:BUILD-IN.md`, any lane file,
`library/INDEX.md`, or the sibling session's files (`R:intake-*`, `library/INDEX-draft.md`, `library/tests/`). No
test, install, download or web search, no change to a script, hook or settings file, no commit. Plain words.

## Return (ten lines or fewer)

Counts by verdict after the fold; how many statements were narrowed, replaced, or left open; the number of records in
`v2.jsonl` and their id range; what changed against version 1 in two lines; where two lanes disagreed and how the
folded draft settles it, one line each, at most three.
