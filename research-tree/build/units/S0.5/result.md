# S0.5 result (the skeleton)

- **Branch** `u/S0.5`, **final commit `42fb2d76`** (base f852145c; 07a09212 thresholds and cost-inputs,
  9fc7b5bb the scripts' skeleton, 42fb2d76 coordinator brief, CONTRACT, spec sections, the new test).
- **Tests**, all through MAIN's lane at 42fb2d76, from the worktree's `research-tree/` unless noted
  (skipped = the needs-app tests, as before; grouped files ran in one `node --test`, counts per call):
  - `S0.5-lib-cost-handover`: lib.test.mjs + cost.test.mjs + handover.test.mjs: 242 tests, 235 pass, 0 fail, 7 not-run (31.7 s).
  - `S0.5-replace-status`: replace.test.mjs + status.test.mjs: 113 tests, 109 pass, 0 fail, 4 not-run (36.7 s).
  - `S0.5-watch`: watch.test.mjs: 69 tests, 65 pass, 0 fail, 4 not-run (49.5 s).
  - `S0.5-guard-hook`: guard-hook.test.mjs from the detached checkout `C:/Users/User/Documents/projects/hx-S0.5`
    (outside `.claude/`, removed after): 20 tests, 17 pass, 0 fail, 3 not-run (15.9 s).
  - `S0.5-selftest-shards`: selftest.test.mjs as its 4 shards at once (shards.cmds; logs in the worktree's
    `research-tree/tmp/s05-shards/`): 31 tests, 29 pass, 0 fail, 2 not-run.
  - Behaviour unchanged: no existing test edited, all pass. One test added (lib.test.mjs "S0.5 round-3
    skeleton": the 17 keys marked guesses, the 7 stub signatures and `not-built`, the 13 runtime files and
    their path helpers, the hidden `kind`). It was also run once alone outside the lane (70 ms) before the
    lane runs: a small departure from the lane rule.
- **What is built:** lib (RUNTIME_FILES, markerKey, path helpers; stubs outcomeState, outcomeAppend, readClaim,
  claimRecord, tombstoneRecord, planAct, liveness; withRunLock requireArmed -> armedCheck; acquireLock
  breakStep; parseTranscript's hidden kind; TRANSCRIPT_RECORD_TYPES/KINDS; slotCount's {root} documented);
  guard-hook (pass context, stepClaim, step 6 as checkAccess, stepAllowList, step 7: stepReadySlot and the six
  coordinator steps); replace (underLock requireArmed, armedFor, fenceOutcomeSteps, fenceTombstone); status
  (reconcileHold2 with hold2ArmSlots, hold2PruneMarkers; ARM_FLAGS, DEADMAN_FLAGS; deadmanRun); watch
  (rowActPlanned, ownerOrNone; alarmSlotTurnSeq, alarmRegisterSlot, alarmExit with alarmUnarmedRecord and
  alarmExitMarker; actDueIdleAgeCap, reraiseStuck, adoptState); handover (briefLine nonce, briefNoncePart,
  briefPathPart); task-row schema (nostart, verify_rounds); tcb/briefs/coordinator.md; CONTRACT 1.4 row,
  3.20 N_max row, 3.23 and decision 41 headings; spec sections in lib, guard-hook, replace, status, watch,
  handover, briefs; thresholds 17 keys (guesses) and the owner-source and 3-children lines.
- **Departures:** `research-tree/build/departures/S0.5.md` (9 items: 17 keys not 18, no `computed` source,
  formats where the designs differ, arm marker names without ':', signatures left as built, names mine,
  guard-hook context and no PostToolUse step, watch/status step signatures, places that are not steps).
- **Not done:** every step is empty by design (each fix fills its own); FX-CGATE's PostToolUse step 6 has no
  skeleton step (departure 7); per-file counts inside the grouped lane calls were not split; the full suite is
  the root's.
- **Tokens** (the counter's lines; helper 1 stopped at its checkpoint, helper 2 finished):
  - build-invariant: S0.5 skeleton, signatures and steps | calls 70 | tokens 14.42 M | context now 314.3 K
  - build-invariant: S0.5 successor from checkpoint | calls 88 | tokens 13.45 M | context now 247.8 K

## Fix round (F1, F2)

- **F1 (B11): the refuter read the design right.** FIX-JOIN point 6 (line 150: hold 2 "already holds the run
  lock"), part 2b row 3 (line 332: the wait, then hold 2 with the prune), part 2c (line 362: `turn.json`
  "Written only under the run lock"), FIX-wake FX-W2 (line 206: `runBuild` "both holds"; line 194). "File-only"
  (W line 178) means no process list inside the hold (W lines 109, 131: a file-only hold a busy lock skips),
  not no lock. Changed in `status.mjs`: `reconcileHold2({root, ce, th, flags, facts, proc, pre, dry}, res)` runs
  `hold2Wait` (FX-W2 step 6, outside every lock), then `hold2Lock(hold, fn)` (FX-W2 fills it with
  `withRunLock`; `fn(null)` until then, so behaviour is unchanged) around `hold2ArmSlots(hold, handle)` and
  then `hold2PruneMarkers(hold, handle)`, which share `hold.slots`; `spec/status.mjs.md` corrected.
- **F2 (B19).** `tcb/briefs/coordinator.md` section 5 split into 5a FX-OUT and 5b FX-CLAIM (FIX-JOIN point 11's
  fence hold), 5c FX-CLOSE and 5d FX-CGATE (the close of a session, point 9's hook steps at FX-CLOSE step 4);
  section 0, which the refuter's F2 also named, into 0a FX-W1, 0b FX-W3, 0c FX-W4 (part 2b row 0);
  `spec/briefs.md` follows. Departure 10 added (the empty lock step; the act order inside section 5).
- **Commit `97281f7b`** on `u/S0.5` (parent 42fb2d76).
- **Tests:** `S0.5-fix-status`: status.test.mjs through MAIN's lane from the worktree's `research-tree/`:
  32 tests, 30 pass, 0 fail, 2 not-run (36.5 s). No other script changed; no test reads `coordinator.md`;
  guard-hook not touched, so not run.
- **Not done:** the refuter's small items (L5, L12 survivors and the rest) were not in this round.
- **Tokens:** build-invariant: S0.5 fix refuter findings F1 F2 | calls 41 | tokens 5.56 M | context now 208.1 K
