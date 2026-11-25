# Unit PT report

Branch u/PT (worktree MAIN/.claude/worktrees/PT), final commit 8ccb0734 (one commit on build tip bc86a10c).

## Part A: tcb/thresholds.json
B_tokens 172000000, r_tokens 15300000, s2_allowed true, f5_given true; units keep the old meaning and name PILOT-PLAN.md s2/s4.
Source field is `measured`, not `computed`: thresholds.schema.json allows only mapping:*|owner|guess|measured|coordinator (PC also used `measured` for attempt_max_ticks).
Tests fixed (asserted the old placeholder): cost.test.mjs TH1 (nulls list no longer has B_tokens, r_tokens); replace.test.mjs T20 (setThr f5_given:false, since gate A now applies with F5 on).

## Tests (lane labels PT-a..PT-h; counts pass/fail)
admit, audit (outside .claude, detached checkout: 24/0, 4 skipped; inside .claude 3 fail on protected-write, the known .claude artifact), certify, check-queue, commit, compare: 159 pass + audit 3 artifact fails (rerun clean as above)
cost, fsck, gate, harvest, lib, promote, protocol-freeze: 338/1 before fix (TH1), cost+lib after fix 228/0 (4 skipped)
render, seed, snap, tms, witness, stop, replace: 328/1 before fix (T20), T20 after fix 4/0
status, watch, handover: 150/0
Not run: selftest, guard-hook (no change reads the keys), e2e, full suite.

## Part B: PLAN
- tasks-plan.json: tiers now kinds (analyse, orchestrate, refute); added rows control and canary (stage design-check, field null, roles control / canary, tier test, step review, e_task 1900000 / 2300000), first in the file.
- f9-single-1/2: PC added no new role; its single-session role is `control` itself (departures/PC.md 1: profile now has WebSearch/WebFetch fetch any, no Agent). The rows already had role control, so only their tier changed (analyse).
- our-work/problems.md written: replace.mjs:785 requires it for the mapper; gate.mjs requires hazards for P1-P21 and G1-G12; table taken from protocol s9 (33 rows).
- Seed check: 16 seed ids + must_read 2310.01798, 2402.08115 + plant 2606.22030, each one curl of arxiv.org/abs/<id>: all titles match the papers named. No id changed.
- Validation (lib.checkFormat against build's schemas): tasks-plan, protocol, analysis-plan, thresholds ok. plants-candidates/f9.draft.json does not pass plant-candidates schema (note, k, section, no against_hope); it is a draft, untouched.
- cost.mjs predict: not rerun (it does not read tasks-plan.json).

## Departures
Source `measured` instead of `computed`; control/canary rows use stage design-check (no frozen protocol or gate needed; replace copies the cut into their in/).
