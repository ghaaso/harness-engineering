# replay-L11: "done" against later checks, gates and refuters (2026-11-23)

**Answer.** Most "done" claims that reached a later gate or refuter were contradicted: clinic 79 of 94 gate reviews
(84 %; 25 with a P1), this repository's build 7 of 20 unit results (35 %), FixFlow 6 of 50 PR reviews (12 %; 5 blocking).
The narrow rule, "accept done only against an executed check", would have caught almost none of them: the claims had
already passed their own executed checks. In the build all 7 of 7 contradicted units were backed by passing lane tests.
In the clinic 1 of 79 contradictions is one an existing check shows (a mypy step). The rest came from reading, mutations,
a model check, or tests run at the merged head. On the false-alarm side, the rule would have held 84 of 183 code-helper
DONE reports (46 %) that had no passing check after their last edit. Each hold costs at least one check run.
**Next: do not pilot the narrow form.** What caught the contradictions was a stronger check: the full suite at the merged
head, mutation of the claimed guard, or a model check. Measure that form first (below).

## Counts by project

| project | level | DONE claims with a later verdict | contradicted (P1 or blocker / below P1) | confirmed | caught by an existing executed check | claim backed by its own passing check |
|---|---|---|---|---|---|---|
| CL clinic build, 3-10 Nov | slice and fix-round done, Opus gate review | 94 | 79 (25 / 54), 84 % | 15 | 1 (a7f29a: the check's mypy step fails) | gate ran at every gate (HB:48); sessions: 17 of 38 with code edits ran a passing check after their last edit [m, regex] |
| H research-tree build, 19-20 Nov | unit result.md, blind refuter or model check | 20 | 7 (5 / 2), 35 % | 13 | 0 | 20 of 20 (each result cites lane runs) |
| H design documents | analysis report, refuter | 8 | 8 (7 "CORRECT: 11-16 findings"; WIDEN 3 breaking) | 0 | no executable check exists | n/a |
| FF PR reviews, 13-14 Nov | PR session done, binding or self-check review | 50 | 6 (5 / 1), 12 %; plus 17 PASS-WITH-FIXES (34 %) | 27 PASS + 17 PWF | 0 | CI green cited in the reviews; sessions: 8 of 42 ran a passing check by regex (misses `gh` CI) |
| RUN research run, 21-22 Nov | 45 report helpers (43 DONE), SubagentHandback | not linked | its refuters judge paper claims, not the helpers' DONE | n/a | n/a | 2 of 7 code DONE |

Helper-level backing (scan.mjs, all helpers, DONE reports of helpers that edited a non-`.md` file):

| project | code DONE | unbacked (rule would hold) | of which no check at all | last check failed but DONE said |
|---|---|---|---|---|
| H | 80 | 32 | 12 | 3 |
| FF | 67 | 37 | 12 | 7 |
| CL | 29 | 10 | 8 | 1 |
| RUN | 7 | 5 | 4 | 0 |
| all | 183 | 84 (46 %) | 36 | 11 |

The last column is the rule's one clear target: 11 helpers said DONE although their last check after their last edit
returned an error by the regex. These were not linked to a later verdict, and some are expected failures (for example a
test that fails before a fix). They are an upper bound until read.

## How each was counted (SCORING.md, written first)
- Verdict heads: `verdicts.mjs` lists every verifier helper's report head (`verifiers.jsonl`). I read each head, and
  read further in the 14 heads that the first 170 characters left unclear. Each was classed C1, C2, OK or PWF (FixFlow's
  PASS-WITH-FIXES) in `judged.jsonl` via `judged.mjs`. A gate review is a verdict on the done claim it was briefed with
  (a slice, a fix round, a PR head). In the clinic, "contradicted" means the review broke a claim or fix at P2 or worse.
  P3-only reviews count as confirmed.
- Build units: line 1 of `research-tree/build/refute/<unit>.md`, plus STATE.md for S0.5's first round (669, 705, 716) and
  W6's model check (48). Backing: each `units/<u>/result.md` cites its lane runs.
- Helper backing: `scan.mjs` (claims.jsonl) counts a run as an executed check when a Bash or PowerShell command matches
  a test, check, lint or type-check pattern after the helper's last code edit. "Passing" means no error flag and no
  failure count in the output. Session backing: `sessions.mjs` (sessions.jsonl).
- Departures from SCORING.md, kept as written there: (1) the script's own sibling linker was too loose. It tied
  reviewers of other slices to each other, so linking is by reading the briefed target in each review head. The linker
  output stays in claims.jsonl (`later`) and was not used for counts. (2) The clinic's slice done claims are made by
  child sessions, not helpers. The unit is therefore the gate review, whose denominator is reviews, not claims. One claim
  can have two reviews (for example kernel and screens). (3) The sample of 30 unverified DONE claims was not read, for
  lack of budget. The 11 "last check failed" helpers are the place to start.

## The seven measures
- Quality and hallucinations (the lead's target): the narrow rule's catch here is 1 of 92 contradicted code claims
  across CL, H and FF (about 1 %). The contradicted claims were overstated reports (S4) that had passed their own checks.
  What caught them: in H, the full suite at the merged head (W3, W5: 2 of 7), mutations (S2.1, S0.5: 2), a model check
  (W6: 1) and probes on copies (P0, GATE: 2). In CL, static reading by an Opus reviewer (78 of 79). Reading is a model
  re-check, and C73 of f7 says those often fail. Here they found the defects, but their false findings were not measured.
- Throughput and time: the rule would hold 84 of 183 code DONE reports for a check run. At the clinic's mean check of
  283.8 s (S7, HB:46), that is about 6.6 h of check time over these records, before any wait for a slot.
- Token count and efficiency: at least one extra tool call per hold, which is a re-read of that helper's window. Not
  metered here. The check output adds tokens too.
- Token cost: not computed. The holds' cache reads per call were not measured.

## What was not tested
- Whether a check at the merged head with mutation of the claimed guard would have caught the clinic's 79 contradictions.
  They were found by reading, so it is unknown whether any test could show them.
- The reviewers' own false findings: only their headline verdict was read, not whether each finding held.
- Contradictions the record does not show (claims never reviewed), the 30-claim sample of unlinked DONE reports, and
  RUN's report helpers. Report kinds have no executable check: the rule cannot be met there, and 8 of 8 refuted design
  documents in H sit there.
- Regex limits: CI runs through `gh` are not counted as checks, so FixFlow backing is undercounted. Expected failures
  count as "last check failed".
- One PC, three repositories, mostly Opus. This is a result about the narrow form only. It does not rule out the
  family: exact check plus independent reconstruction (f5:48) was not replayed.

## What it changes next
- Do not pilot "accept done only against an executed check" as a gate on helpers (SCORING rule 2): 0 of 7 contradicted
  build units and about 1 of 79 clinic contradictions were unbacked by a check. The rule would add about 84 holds
  (46 % of code DONE) for about 1 catch.
- Measure first, at no model cost: read the 11 helpers that said DONE after a failing last check. A real one is the
  rule's only clear catch. The rule would still be worth a small, cheap guard ("no DONE after a red last check"), not a
  gate on every DONE.
- The form that caught contradictions here is the stronger one: full suite at the merged head plus mutation of the
  claimed guard (H: 4 of 7 directly). It overlaps B12 (claims file, guard-removal check) and L8. Fold L11 into that
  test rather than piloting it alone. L6 (a reviewer reading two versions) is the lead that acts on the clinic's
  reading-found 78.
