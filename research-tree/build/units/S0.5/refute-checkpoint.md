# S0.5 refute checkpoint (refuter 1 stopped at the token limit)

Counter at stop: `refute: S0.5 skeleton blind review | calls 87 | tokens 15.43 M | context now 287.4 K` (limit 15.6 M).
No verdict written. Builder's branch untouched (u/S0.5 = 42fb2d76).

## Done

1. **Read**: brief B0b (S0.5, common, Refuters); result.md; departures (9 items); the whole diff build...u/S0.5 (code,
   thresholds, cost-inputs, task-row schema, the new lib test, CONTRACT, spec sections, tcb/briefs/coordinator.md);
   designs: BUILD-SIZE 43-59 and section 3; r3-changes 83-112; FIX-JOIN points 6, 9, 10, 11, parts 2b and 2c;
   FIX-fence 95-135, 250-300, 380-440, 505-530; FIX-wake 100-110, 160-200, 246; write-collision-points table B;
   build/branches.md; build/check/B-documents rows 1, 2, 8; ORCHESTRATION section 9 row 5.
2. **Read-checks that hold**:
   - No path reaches a stub: the 7 throwing exports have no caller in `research-tree/tcb` or `tools` (grep).
     `armedCheck` runs only on `requireArmed === true`, which `armedFor` (false) never gives; `breakStep` returns
     `doBreak()`; `kind` is set by `hidden` (res had no `kind`, one return path).
   - Each empty step is a no-op. guard-hook: step 6 moved into `checkAccess(pass)` uses only root, attempt, toolName,
     toolInput, cwd, io, profile (all in `pass`); no early return before step 7. replace: hold vars defined before `hold`;
     `requireArmed` reaches withRunLock only when true. status: flags `{}`, `reconcileHold2` returns `res`,
     `deadmanRun` null. watch: rows, tick, present defined where used; runAlarm rewrite equivalent (superseded -> break;
     error -> alarmExit then the same `e` rethrown). handover parts ''.
   - Threshold `source` is read by no script; gate.mjs reads only params with `line`; cost.mjs tags only give
     `stand_in` (already true: 22 G tags); thresholds.schema accepts the new keys.
   - Signatures and formats match the designs, departures 1-9 as written. 17 keys = B17's 18 minus the 4 branches.md
     drops plus 3 kind deadlines; all `source: guess`; values equal the designs where given (H_nostart 2, 10000, 3000,
     45000, alarm_slots 1, realert_runs 6, stuck_raises 3, idle 30, age cap 240, 12/60/10, 5000, busy 10).
   - Order: guard-hook = J point 9 / 2c (child: epoch gate, claim, profile and prefix, READY slot; coordinator: grammar,
     allow-list, bind, current session, armed, row at admitted, start.json, stop intent); fence hold = J point 11;
     rowAct = J point 11; evaluate W6, W5, W7; alarm: unarmed record before the marker (W:246).
3. **Mutations run** (lane label `rS0.5-mut-lib`, in `.claude/worktrees/rS0.5` at 42fb2d76, each restored):
   L1 outcomeAppend arity 2: S0.5 test fails. L2 liveness returns: fails. L4 RUNTIME_FILES helper renamed: fails.
   **L5 paths().claim -> 'claims.json': survives** (the test checks only `typeof` of each helper). L6 kind enumerable:
   fails. L7 kind 'model': fails. L8 markerKey keeps ':': fails. L9 realert_runs source measured: S0.5 fails (TH1
   passes). **L12 cost-inputs N_cap tag back to M: survives** (cost.test.mjs 24 pass, 2 skipped). L13 breakStep skips
   the break: T30, T31 fail.

## Findings so far

- **F1 (I judge it BREAKING; B11).** `status.mjs` `reconcileHold2` and `spec/status.mjs.md` say hold 2 is "file-only
  and without the run lock". The designs make hold 2 a run-lock hold: FIX-JOIN point 6 ("status --reconcile in hold 2
  ... It already holds the run lock, reads every slot and marker, and writes turn.json.slots"), J 2c (`turn.json`
  "Written only under the run lock, by reconcile and endturn"), FIX-wake crash points ("dies between its holds").
  The skeleton also puts FX-W2 step 6's wait (outside every lock) into `hold2ArmSlots` (departure 8). So FX-W2 can
  take the lock only inside `hold2ArmSlots`, and FX-W1's `hold2PruneMarkers` runs after that hold ends: the prune is
  not in the hold that writes `turn.json.slots` (B11 "the prune reads the slots W2 writes in the same hold"; J point
  6's tightened condition guards schedule W1, stale confirmed). A unit that follows the skeleton prunes or writes
  outside the lock, or must rebuild the shared sequence; if W1 takes its own withRunLock inside W2's hold, run.lock
  is not re-entrant (75). No test can see it (empty steps). Fix without behaviour change: a wait step, then an empty
  wrapper `hold2Lock(hold, fn)` that runs both steps (FX-W2 fills it with withRunLock, as breakStep), and the comment
  and spec line corrected.
- **F2 (B19).** `tcb/briefs/coordinator.md` section 5 is one placeholder line "(empty until FX-OUT, FX-CLAIM,
  FX-CLOSE and FX-CGATE)"; section 0 names three fixes over one placeholder. Not one step per fix: two units filling
  that line conflict at landing. The designs' brief writers: W3, W1, W2, CGATE, PLAN (B19; BUILD-SIZE "Other files").
- Small: L5 and L12 survive (helper paths not checked against `RUNTIME_FILES.path`; N_cap tag not pinned); threshold
  values not pinned by a test; empty-step order untestable until filled (checked by reading); replace dry-run skips
  withRunLock, so no armed check in a dry run (design silent); `markerKey` drops '+'/'-' (offsets of opposite sign
  collide; start times here are all 'Z'); `coverage_floor` and `handover_measure` keep `source: owner` (outside the
  four the brief named).

## Left (next steps)

1. Run the rest through the lane with the driver (it applies one edit set, runs `node --test --test-reporter=tap` with
   the spec's name patterns from the research-tree folder, prints exit, pass, fail and failing names, restores bytes):
   `SP=C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad`
   - from `MAIN/.claude/worktrees/rS0.5/research-tree`: `node $SP/mutate.mjs "$PWD" $SP/spec.json R1,R2,R3,R4,S1,S2,S3,H1,H2`
     (--timeout-s 130 --wait-s 15) and `... W1,W2,W3,W4,W5,W6,W7,W8` (--timeout-s 120 --wait-s 25);
   - from `C:/Users/User/Documents/projects/hx-rS0.5/research-tree` (outside .claude): `... G1,G2,G3,G4,G5`
     (--timeout-s 100 --wait-s 45).
   Expected: each fails a test (a survivor = a step on no tested path); R4 (armedCheck throws alone) should survive,
   as claimed (unreachable today). If the scratchpad is gone, spec ids are: G1-G5 throw in stepClaim, stepAllowList,
   stepReadySlot, stepBind, stepStopIntent; R1/R2 throw in fenceOutcomeSteps/fenceTombstone; R3 armedFor true for
   start and fence first plus armedCheck throws; S1 hold2ArmSlots sets res.exit 1; S2 hold2PruneMarkers throws; S3
   deadmanRun returns {exit: 9}; W1 ownerOrNone true; W2-W8 throw in actDueIdleAgeCap, reraiseStuck, adoptState,
   alarmSlotTurnSeq, alarmExitMarker, alarmUnarmedRecord, alarmRegisterSlot; H1/H2 brief parts return ' MUT'.
2. Write `research-tree/build/refute/S0.5.md` (first line `PASS` or `BREAKING: ...`; then each invariant with its
   mutation and result; then small items), folding in F1, F2 and the small items above.
3. Remove both scratch worktrees (clean at 42fb2d76): `git -C MAIN worktree remove --force .claude/worktrees/rS0.5`
   and `git -C MAIN worktree remove --force C:/Users/User/Documents/projects/hx-rS0.5`.
