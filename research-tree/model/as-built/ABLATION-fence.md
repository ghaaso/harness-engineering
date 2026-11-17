# ABLATION-fence: the six fence fixes in the as-built model (round 3, helper MB2a, label fixes-fence, 2026-11-17)

Inputs: `FIX-fence.md` rev 4 (section 12 for the flags and the fourteen schedules), `FIX-JOIN.md`, `CEX-fence.md`,
`FIDELITY-3.md`. Model: the working copy `model/as-built/model.mjs`, `check.mjs`, `configs.mjs` (the frozen copies are
untouched). Results: `model/results-as-built/fixes-fence/`. Every run: two fields, K2 (two faults), R = 1, design + the six
old `FIX_*` (FIXES), D7 observers (RestartLimitGhost, StaleWrites, CommitRecordStable) and the two new properties
(FX_PROPS: OneWriterPerAttempt, NoChargeWithoutFault), one run at a time through the lane.

The fixes are designs: the scripts are unchanged and still have every defect. "Holds" below means "needed and sufficient
in the model"; soundness is the refuters' and the fidelity review's call (charter note 7).

## 0. Flags off = unchanged (the proof run)

| Run | Recorded (frozen model) | Working copy, every new flag off | File |
|---|---|---|---|
| AB-COMMIT-CLOSE whole | 2,948,455 states, complete; AlwaysCanResolve F 5, EventuallyResolves F 12 | 2,948,455 states, complete; AlwaysCanResolve F 5, EventuallyResolves F 12; all else holds | `BASELINE-AB-COMMIT-CLOSE.json` |

Same states, same properties, same trace lengths. It completed at 700 MB, not 400: the copy's state record carries one
more byte per row (the snapshot epoch `se`), so the same graph needs more memory. Cap per run is in each table.

## 1. Per fix

Verdict words: **holds** = complete run, every property holds (old forms, D7 forms, FX_PROPS, the four liveness
properties); **F n** = fails with an n-step trace (a real trace of the model even in a BOUNDED run); **BOUNDED** = never
"holds".

### FX-OUT (the outcome log), with FX-PLAN step 1

| Item | Value |
|---|---|
| C_X | FIXES + AB_READY_SPLIT (D4a) + FX_OUT + **FX_PLAN** (dependency, see below) + D7 obs + FX_PROPS (`FX-OUT-PLAN`) |
| Run | complete at 2500 MB (BOUNDED at 400: 2.91 M states, 2.59 M expanded); 5,682,597 states, 41.5 s, peak 705 MB |
| Verdict | **holds** (ReadyNotDiscarded, NoStaleAccepted, all D7 forms, both FX_PROPS, all liveness) |
| Ablation (C_X - FX_OUT) | `FX-OUT-X`: **ReadyNotDiscarded F 6** (BOUNDED run, real trace) = the recorded AB-READY-SPLIT CEX (ReadyNotDiscarded 6, 43/43 parts) |
| Dependency shown | `FX-OUT` (FX_OUT without FX_PLAN): **AlwaysCanResolve F 8, EventuallyResolves F 17** (BOUNDED at 400): a planned hand-over fence dies after its fenced slot and before the CAS (torn); with no step-1 retry nothing moves the row (the READY hook now refuses on the fenced slot). FX-OUT needs FX-PLAN step 1 |
| Branches | Q6 (a) check in `lib.fence` / (b) in replace: one lock hold either way, so one model step; one run covers both |
| Files | `FX-OUT-PLAN-2500.json`, `FX-OUT-X.json`, `FX-OUT.json` |

### FX-CLOSE (releasing a finished child's slot), on the corrected stop verify

| Item | Value |
|---|---|
| C_X | FIXES + AB_COMMIT_CLOSE (D4c) + AB_NO_COMMIT_RECONCILE + **AB_STOP_HELD** (FIDELITY-3 gap 1) + D7_SLOTS + FX_CLOSE + FX_CGATE (close records) + FX_PLAN (step 3, owner rule) + D7 obs + FX_PROPS (`FX-CLOSE`) |
| Run | complete at 1500 MB (BOUNDED at 400: 2.91 M, 2.74 M expanded); 4,151,883 states, 28.9 s, peak 531 MB |
| Verdict | **holds**, including SlotsProc and SlotsR10 on the as-built close |
| Ablation (C_X - FX_CLOSE) | `FX-CLOSE-X`: **AlwaysCanResolve F 5**, EventuallyResolves F 17 (complete, 3,968,248 states, 1500 MB). The D4c trace: x before bind, READY, reconcile `started`, drain, commit at `started`; stop request refuses wrong-step (stop.mjs:278) for ever |
| Sub-flag (FX_PLAN_OWNEREND off, schedule 2) | `FX-CLOSE-NOOWNEREND`: **AlwaysCanResolve F 7**, EventuallyResolves F 28 (complete, 4,090,782 states): one z (a close that does not end the session), three unconfirmed verifies, vr = 3, the owner ends the zombie, and the row stays the owner's for ever |
| Why AB_NO_COMMIT_RECONCILE | the first FX-CLOSE run without it failed AlwaysCanResolve 5 / EventuallyResolves 15 (`FX-CLOSE-with-reconcile-oracle.json`): a torn commit (t), then the design model's reconcile branch "COMMIT record => committed" (which no script has, SEM-fence) sets the row committed with no close state, so the READY child is never closed and the hand-over never quiesces. **Model gap, not design**: the branch is the design model's; as built the coordinator re-runs commit, whose identical repeat sets the close state |

### FX-CGATE (the coordinator's hook), on the corrected stale read

| Item | Value |
|---|---|
| C_X | FIXES + AB_START_UNFENCED (D3) + **AB_STALE_SNAPSHOT** (FIDELITY-3 gap 2) + FX_CGATE + D7 obs (StaleWrites) + FX_PROPS (`FX-CGATE`), branch Q5a (the coordinator has the session tools) |
| Run | complete at 2000 MB (BOUNDED at 400: 2.91 M, 2.52 M expanded); 8,290,758 states, 67.9 s, peak 1063 MB |
| Verdict | **holds** (TwoCoordinatorsAct, StaleWrites, Slots, OneSessionPerAttempt, all liveness) |
| Ablation (C_X - FX_CGATE) = the D3 rerun with the snapshot | `FX-CGATE-X` (BOUNDED at 400, real traces): **TwoCoordinatorsAct F 7, StaleWrites F 7, OneSessionPerAttempt F 8, Slots F 9, OneWriterPerAttempt F 10**. The trace is now the longer real form FIDELITY-3 named: drain, x; alarm; hand-over (ce -> 1); owner starts coord1; coord1 admits f0 **and then runs `status`** (status.json shows f0 admitted); the stale coord0 (woken by the kill of its watcher) reads status.json and starts wt/f0-e1. Same length as the recorded 7 because the status build is merged into the admit step as an alternative outcome |
| Q5b | see section 2 |
| Files | `FX-CGATE-2000.json`, `FX-CGATE.json` (400), `FX-CGATE-X.json` |

### FX-CLAIM (one claim per attempt), with FX-CGATE and FX-PLAN

C_D4B = FIXES + AB_TRANSCRIPT_LAG + AB_SLOTCOUNT (D4b) + **AB_STOP_HELD** + FX_CLAIM + FX_CGATE (start.json, on which the
lease rests) + FX_PLAN (the lease rule) + D7 obs + FX_PROPS. The three fixes depend on each other (FX-CLAIM's lease is
read by FX-PLAN from FX-CGATE's start record), so FX-CLAIM and FX-PLAN share this configuration.

| Item | Value |
|---|---|
| Run, reading (i) (`FX-CLAIM`) | by parts: 40 of 43 complete at 1500 MB, the three `r` parts (k=2,{cs,cv,cd}=1,r=1) BOUNDED there at 11.7 M and **complete at 3000 MB** (17.3 M, 17.3 M, 14.1 M states); about 148 M states summed. Complete over all 43 parts |
| Verdict (i) | **holds**: Slots, OneSessionPerAttempt, RestartLimit, NoChargeWithoutFault, OneWriterPerAttempt, D7 forms, all four liveness properties |
| Reading (ii) (`FX-CLAIM-II`, FX_LEASE_NOBOUND) | **Slots F 8, NoChargeWithoutFault F 8** (BOUNDED at 400, real traces). Slots: both leases expire at the first tick before either session's first tool call; the crash fence tombstones f0e1, the stop confirms at once, f0e2 is admitted while f0e1 lives with no transcript yet (step 7 counts only a visible session) -> 3 processes. NoChargeWithoutFault: the lease expires, the session claims, then the fence ordered from the expired lease finds the claim and charges a restart with no fault. Both are what FIX-fence's timing assumption (PROBE 5) says: without the bound, Slots holds only eventually. Design condition, not a model gap |
| Ablation (C_X - FX_CLAIM), reading (i) (`FX-CLAIM-X`) | **Slots F 16** (BOUNDED at 400, real trace): a stuck session (cs) with no claim does not hold the lease, the crash fence charges it, the stop cannot name it (no transcript yet: verify confirms while it lives), f0e2 is admitted -> 3 processes. With FX_CLAIM a session that can be stuck has already claimed |
| Previous runs kept as evidence | `FX-CLAIM-2500-tombstone-bug.json` (Slots F 21, my bug, fixed); `FX-CLAIM-2500-z-stopped-artefact.json` (AlwaysCanResolve F 16 without AB_STOP_HELD: a zombie's stop moved the row to `stopped`, the dead attempt stays counted for ever = FIDELITY-3 gap 1) |
| Files | `FX-CLAIM-parts.json` (43 parts at 1500 MB), `FX-CLAIM-rparts-3000.json` (the three r parts), `FX-CLAIM-II-400.json`, `FX-CLAIM-X-400.json` |

Not run: the reading-(ii) ablation `FX-CLAIM-II-X` (reading (ii) already fails with the fix on; the ablation cannot change
that verdict).

### FX-PLAN (one planner act per row)

| Item | Value |
|---|---|
| C_X | as FX-CLAIM (C_D4B); FX-PLAN also sits in C_OUT (step 1, required, section FX-OUT) and C_CLOSE (steps 0 and 3) |
| Verdict | **holds** in all three (FX-CLAIM reading (i), FX-OUT-PLAN, FX-CLOSE) |
| Ablation (C_D4B - FX_PLAN) (`FX-PLAN-X`) | **AlwaysCanResolve F 3**, EventuallyResolves F 10 (part k=2,cd=2 complete, 2,523,662 states, 2500 MB): the session crashes before its first tool call; the as-built planner orders start-session every turn, FX-CGATE's start hook denies start-issued, and nothing ever fences the row (no lease rule) |
| Sub-flag FX_PLAN_STARTWAIT off (schedule 3) (`FX-PLAN-NOSTARTWAIT`) | **AlwaysCanResolve F 4**, EventuallyResolves F 20 (part k=2,cd=2 complete, 4,683,570 states): the transcript appears, the session crashes before its claim, reconcile marks the row `started`, bind exits 6 not-claimed for ever. The design table names NoBusyLoop; in the model the loop is paced by watcher ticks, so NoBusyLoop holds and AlwaysCanResolve is the failing form |
| Sub-flag FX_PLAN_OWNEREND off (schedule 2) | `FX-CLOSE-NOOWNEREND`, AlwaysCanResolve F 7 (see FX-CLOSE) |
| Ablation of step 1 | `FX-OUT` (FX-OUT without FX-PLAN): AlwaysCanResolve F 8 (see FX-OUT) |
| Ablation of step 3 | `FX-CLOSE-X` keeps FX-PLAN but removes FX-CLOSE's script change: AlwaysCanResolve F 5. Step 3 alone without FX-CLOSE orders a stop the script refuses (planner says stop-request, stop.mjs:278 refuses): the two are one fix |
| Files | `FX-PLAN-X-cd2.json`, `FX-PLAN-NOSTARTWAIT-cd2.json`; the x=2 parts (`*-x2.json`) hold, and the 400 MB whole runs (`*-400.json`) found no safety failure |

### FX-REDO

Not modelled: the model has no ledger lines (FIX-fence section 5: "tested through the fs seam, lib.mjs:155"). No flag.

### The safe hook write (section 0b)

Merged into each hook step: every hook create is one atomic model step (exclusive create by hard link); a torn write
cannot be expressed. Its own failure mode (tamper, an unparsable record) is out of the model.

## 2. Open questions Q5 and Q6, both branches

Runs named `*-400`, `*-2500`, the "owner-once", "noclaim", "before", "with-reconcile-oracle", "drain-skip",
"h-recharged", "tombstone-bug" and "z-stopped-artefact" runs, and the logs, are kept verbatim inside
`SUPERSEDED-runs.json` (key = the original file name).

**Q6** (FX-OUT's ready check in `lib.fence` or in replace): both branches are inside replace's one lock hold, so the model
has one step for both; FX-OUT-PLAN covers both.

**Q5a** (the coordinator has session tools): FX-CGATE, **holds** (complete, 8,290,758 states, 2000 MB).

**Q5b** (no session tools: the owner starts an admitted row by hand; closes are the owner's, merged into the stop):
`FX-CGATE-Q5B` = C_CGATE + FX_Q5B + FX_PLAN + **FX_CLAIM** (dependency: without the claim the planner answers `owner` for
an admitted row even after the hand start, and nothing reaches the coordinator; the run without it failed
AlwaysCanResolve 5 after one lost wake, `FX-CGATE-Q5B-noclaim-2500.json`). **BOUNDED**: by parts at 1500 MB, 41 of 43
parts run in the 1700 s wall, 33 complete, 8 BOUNDED near 11.5 M states, about 190 M states summed. Real traces:

| Property | Trace | Judgement |
|---|---|---|
| NoDeadlock F 15, AlwaysCanResolve F 12 (part k=2,cd=1,l=1) | owner starts f0e1, it claims and crashes; its turn-end note goes to the owner's session (nobody's coordinator); coord0 drains, binds f0 from started, the hand-over is skipped (not quiescent) and the turn ends without endturn (no watcher started); the hand-started f1e1 writes READY, its note again reaches no coordinator; the alarm's wake is lost (l) | **design consequence of Q5b in the model**: hand-started children are not a wake source for the coordinator, so the design's second wake source is missing for them. Rests on the design model's `handover skipped: turn ends` (no endturn after a refused hand-over: INFERRED as built, not checked against handover.mjs here) |
| Slots F 13 (part k=2,z=1,r=1) | a reset kills the hand-started f0e1; f1's stop is unconfirmed (z) and the row goes to `stopped` (no AB_STOP_HELD in C_CGATE); f1e2 is admitted counting only live processes; the owner restarts f0e1 -> 3 processes | **model artefact**: C_CGATE uses the design model's admission (live processes, no AB_SLOTCOUNT) and z -> `stopped` (FIDELITY-3 gaps 9 and 1); the admitted f0 with a dead session is not counted. Not run with those closed (memory) |

The first Q5b model let the owner start once per attempt (`FX-CGATE-Q5B-owner-once-parts.json`: AlwaysCanResolve F 4 when
the hand start died before its claim); corrected so the owner answers every `owner` act (a row admitted, or started
without a claim and without start.json, with no live session). Q5b stays **open**: BOUNDED, one design-consequence
liveness failure, one artefact.

## 3. The fourteen schedules (FIX-fence section 12)

| # | Schedule | Covered by | Result |
|---|---|---|---|
| 1 | Parked fence (H1), FX_OUT_MANIFEST | not expressible | the model has no parked/memory fence and every fenced attempt has a manifest; FX_OUT_MANIFEST is not a flag here |
| 2 | Owner close, then nothing (P1) | FX-CLOSE vs FX-CLOSE-NOOWNEREND | holds with the sub-flag; off: AlwaysCanResolve F 7 |
| 3 | Started before the claim (P2) | FX-CLAIM vs FX-PLAN-NOSTARTWAIT | holds with the sub-flag; off: AlwaysCanResolve F 4 (NoBusyLoop holds: the loop is paced by ticks) |
| 4 | Close of a session the caller did not start (H3), FX_CLOSE_NOSUCH | not expressible | every modelled session is started by a coordinator of this run (or, Q5b, the owner, whose closes are merged); a dead session's "no such session" is merged with its close, so H3's two conditions always hold |
| 5 | Rollout: old watcher, new status (P4) | not expressible (expected to fail) | no version skew: one `planAct` serves planner and watcher. FIX-fence: open P4, NoBusyLoop expected to fail. Nothing run |
| 6 | Watcher dead during a lease (H2) | not expressible here (expected to fail) | the fence model has no watcher-death fault (wake group's); the lease advances only on ticks, so a dead watcher would freeze it (FIX-fence rev 4 H2: dependency on the wake group's dead-man fix). Nothing run |
| 7 | Torn tainted fence | partly: FX-OUT-PLAN | a torn fence of every modelled reason (stall, hang, loop, planned hand-over, crash) holds NoStaleAccepted; the tainted reason itself is not in the model |
| 8 | No-start loop; variant with hand-over | FX-CLAIM (H_NOSTART = 2) | RestartLimit and NoChargeWithoutFault hold. At two faults at most two crashes before a claim exist, so the cap's third (charged) no-start fence is not reached: the cap is exercised only up to its uncharged part |
| 9 | Bind to the loser | FX-CLAIM | not reachable: with FX-CGATE's start record no second session of an attempt can start in the model; the bind checks (exit 6, exit 1) are modelled, exit 1 is never reached |
| 10 | Late session past the lease | FX-CLAIM, FX-CLAIM-II | reading (i): Slots holds; reading (ii): Slots F 8 (and NoChargeWithoutFault F 8) |
| 11 | Forged done; success that is only a request | not expressible | no actor forges a record; the model's close is effective (PROBE 10(a) open, N8) |
| 12 | Hook repeated across a tick | not expressible | no hook repetition, no `tool_use_id` |
| 13 | Planner loops: (a) double start; (b) committed/started -> bind | (a) FX-CGATE, FX-CLAIM (holds: OneSessionPerAttempt); (b) FX-CLOSE vs FX-CLOSE-X | (b) off: AlwaysCanResolve F 5 (the D4c trace). (a) without FX-PLAN the start hook still refuses the second start (FX-PLAN-X shows the price: the row is never fenced, AlwaysCanResolve F 3) |
| 14 | Wrong first binder; helper variant | not expressible | the nonce bind is merged into the successor's start; no third session can bind it |

Schedules 5 and 6, expected to fail: neither is expressible in this model, so no failing property is shown; both stay
open as recorded in FIX-fence (P4; H2 as a dependency on the wake group).

## 4. FIDELITY-3 gaps, D7-SLOTS rerun

**D7-SLOTS-HELD** (FIXES + D7_SLOTS + AB_STOP_HELD, K2): complete at 1500 MB (BOUNDED at 400: 2.91 M, 2.87 M expanded),
3,093,274 states, 20.4 s. **SlotsProc holds, SlotsR10 holds**, every other property holds (liveness included). The
recorded D7-SLOTS failure (SlotsProc/SlotsR10 F 7: zombie stop, then `admit f0` e2) does not occur once an unconfirmed
verify keeps the row stop-requested: FIDELITY-3 called it an artefact and the corrected model agrees. Files
`D7-SLOTS-HELD-1500.json` (verdict), `D7-SLOTS-HELD.json` (the 400 MB BOUNDED run).

One line per FIDELITY-3 gap (section 2 numbering, plus section 7):

| Gap | State |
|---|---|
| 1 tickEnabled timeliness oracle | open: wake group's (FX-W6); touches no fence fix's verdict here |
| 2 eligibleHO reads true health | open: a planned hand-over is a free choice; it can only add fences, so safety verdicts stand; it may hide nothing a fence fix acts on |
| 3 stale coordinator reads the live table | **closed (AB_STALE_SNAPSHOT)**; on in C_CGATE and its ablation |
| 4 OP.B bind needs the session to truly exist | open in configs without FX_CLAIM; under FX_CLAIM bind reads the claim (the file), not the session |
| 5 host class from `hb` | open (not a fence-fix mechanism); could hide an over-charge after a reset, i.e. a RestartLimit failure; no fix acts on it |
| 6 OP.S request+close+verify in one step, z -> stopped, no ticks | **closed (AB_STOP_HELD)**: request + closes + sample, then a later verify that needs 2 watcher ticks; unconfirmed stays stop-requested and resamples. The sample is merged into the request (stop.mjs takes it at the first verify call, exit 6 `sampling`): this only removes one empty coordinator act. On in C_CLOSE, C_D4B, D7-SLOTS-HELD; **off in C_OUT and C_CGATE** (see section 5) |
| 7 SR/SV back to back, no ticks, SV always confirms | **closed (AB_STOP_HELD + FX_CLOSE)**: SV waits for 2 ticks after SR's sample; under FX-CLOSE it can be unconfirmed (z on the close) |
| 8 owner's zombie end merged with the re-verify | **closed under AB_STOP_HELD** (the end no longer confirms; the next verify does); under FX-PLAN the owner acts only on an `owner` row |
| 9 true liveness in admitCount/reconcile without AB_SLOTCOUNT/LAG | open in C_OUT and C_CGATE (both run without AB_SLOTCOUNT); closed in C_D4B and C_CLOSE (slot count from the table) |
| 10 macro atomicity between yields | open; one yield added before bind under FX_CLAIM (the claim lands between start and bind) |
| 11 endturn without a list | not in these configs (no u) |
| 12 `gp` across a watcher restart | not in these configs (no AB_PAUSE_GAP) |
| Start-session and bind merged in the wake configs (M3 act 5) | open: wake group's rowAct; FX-PLAN's planner is modelled in `plans()` and `actionable()`, not in `rowAct`, so a wake-config run with FX_PLAN would still use the merged act (could hide schedule 13(a)'s double start through the watcher) |

## 5. What stays open

- **Q5b** is BOUNDED (2 parts not run, 8 BOUNDED at 1500 MB) and fails NoDeadlock/AlwaysCanResolve after one lost wake
  (hand-started children wake no coordinator) plus a Slots artefact; finishing it needs the 10 parts at 3000 MB
  (about 25 min) and, for Slots, C_CGATE with AB_SLOTCOUNT and AB_STOP_HELD.
- **Reading (ii) of the lease** fails Slots and NoChargeWithoutFault with every fence fix on: the fixes are sound only
  under the start-lag bound (PROBE 5, to be measured). Owner's call.
- **C_OUT and C_CGATE run without AB_STOP_HELD** (to fit memory; FX-OUT and FX-CGATE do not touch the stop). Their
  liveness "holds" therefore rests on the old z -> `stopped` reading and a verify with no ticks (FIDELITY-3 gap 1),
  which is liveness-optimistic. What it could hide: a stall while an unconfirmed stop waits for the owner and a re-verify.
  C_CLOSE and C_D4B, which act on the stop, run with it.
- **Joint run of all fence fixes** (FX_OUT + FX_CLAIM + FX_CGATE + FX_CLOSE + FX_PLAN on AB-FENCE-ALL): not run. Each fix
  holds in its own configuration; their interaction (for example FX-OUT's commit of a child mid-write with the as-built
  close) is checked only pairwise (FX-OUT with FX-PLAN; FX-CLOSE with FX-CGATE and FX-PLAN; FX-CLAIM with FX-CGATE and
  FX-PLAN). AB-FENCE-ALL alone did not fit 400 MB (CEX-fence).
- **FX-OUT's commit of a child mid-write** relies on the base model's "the commit closes the child"; with the as-built
  close the child holds its slot until FX-CLOSE's stop; that combination is the joint run above.
- Schedules 1, 4, 5, 6, 9 (exit 1 path), 11, 12, 14 not expressible (section 3); P4 and H2 open in the design.
- FIDELITY-3 gaps 1-2 (tickEnabled, eligibleHO), 4, 5, 9 (in C_OUT/C_CGATE), 10, and the wake configs' merged
  start-session/bind act (section 4).
- FX-PLAN step 1's refusal branch (`owner`) is not modelled; FX-REDO is not modelled.
- Three faults: not run (round rule: two faults only).

## 6. Deliberately not run

- FX-CLAIM-II-X (reading (ii) without FX-CLAIM): reading (ii) already fails with the fix on.
- FX-PLAN-X and FX-PLAN-NOSTARTWAIT over all 43 parts: one complete part each already fails AlwaysCanResolve; the rest
  of the parts cannot change the ablation verdict (a failure in one complete part is a failure).
- FX-CGATE-X and FX-OUT-X, FX-CLAIM-X, FX-CLAIM-II above 400 MB: each already fails a safety property with a real
  trace; a complete run would only add liveness verdicts to an ablation.
- FX-OUT (without FX-PLAN) above 400 MB: it already fails AlwaysCanResolve.
- The joint run of every fence fix, and any run with AB_STOP_HELD added to C_OUT or C_CGATE (memory: C_CGATE alone is
  8.3 M states; the owner's ruling allows one change at a time and the coordinator's cap is 3000 MB).
- Three-fault runs (the round's rule).
- The rest of Q5b (2 parts not run, 8 BOUNDED parts at 3000 MB): it already fails a liveness property with a real trace,
  and its Slots failure is an artefact the rest of the parts cannot remove; the decision (Q5b open) does not change.
- AB-START-UNFENCED-SNAP without FX_PROPS: identical to FX-CGATE-X except the two observers, so not run.

## 7. Fidelity, by the modeller

Per fix: the steps merged, why the merge is safe, and what still reads true state.

- **FX-OUT.** Hook check + ready-slot create = one step (exclusive create linearises against the fence's fenced-slot
  create; the hook takes no lock either way). Fence: retry check, ready check, fenced slot, tombstone and CAS in one hold,
  with one death point between the slots and the CAS (the torn fence, charged x). READY.json landing stays a separate
  step. Q6 (a)/(b) are one hold, one step. True state read: ReadyNotDiscarded is still checked on the child's true
  `rh`/`p` (an observer, correct). **Merge added by me:** the base model's "the commit closes the committed child" now
  also closes the slot writer when it is still mid-write (C_OUT runs without the as-built close; the as-built close is
  FX-CLOSE's job, checked in C_CLOSE). Before it, FX-OUT failed AlwaysCanResolve 7 on a child that loops after its slot
  (`FX-OUT-before-commit-close-oracle.json`): a model gap of the base abstraction, not of FX-OUT.
- **FX-CLAIM.** The claim (or deny) is the session's own first step, atomic by the hard link; it sets mv/tv. Before a
  claim the only child fault is cd (a start that failed). A denied session idles alive (counted by Slots on true
  state, and by step 7 once its transcript is visible). One yield between start and bind. The lease is abstracted to
  one tick; reading (i) reads true child health ("no live healthy unclaimed session") as the timing bound PROBE 5 must
  justify; reading (ii) does not. Without AB_COMMIT_CLOSE the commit closes the attempt's denied duplicates (the same
  base abstraction as above).
- **FX-CGATE.** The start hook and the session tool's effect are one step (the allow-to-effect window stays as the yield
  before OP.T). The nonce bind is merged into the successor's start (schedule 14 not expressible). A close and its
  close-done record are one step (the Post hook). The stale coordinator's refusal ends its act at once.
- **FX-CLOSE.** Request + close + sample in one hold-and-call step; verify later after 2 ticks. A dead session is merged
  with its "no such session" record counting (only this coordinator's starts exist, so H3's condition always holds:
  FX_CLOSE_NOSUCH is not expressible). Re-closing a zombie is not tried (only the owner ends it).
- **FX-PLAN.** One `planAct` for the planner (`plans()`) and the watcher (`actionable()` under FIX_WATCHER_ACTIONABLE);
  the as-built `rowAct` (AB_ACT_DUE) is not rewired. Step 1's "predictFence refuses -> owner" branch is not modelled
  (no reason change is reachable once a slot is fenced, so the retry never refuses in these configs).
- **Model corrections made on the way (each only reachable with a new flag on; the baseline proof holds):**
  (1) the drain skip of a planned hand-over no longer blocks the *retry* of a torn hand-over fence (replace.mjs has no
  drain check; before it, FX-OUT-PLAN failed AlwaysCanResolve 9, `FX-OUT-PLAN-drain-skip.json`); (2) a torn hand-over
  fence spends the planned budget h once (before, the retry needed a second h: AlwaysCanResolve 10,
  `FX-OUT-PLAN-2500-h-recharged.json`); (3) my tombstone stop first marked every older attempt confirmed, including an
  unconfirmed zombie (Slots F 21, `FX-CLAIM-2500-tombstone-bug.json`); fixed to the tombstoned attempt only.
- **Still reads true state:** tickEnabled (timeliness); eligibleHO; the lease's reading (i); OneWriterPerAttempt,
  Slots, SlotsProc, SlotsR10 (observers, by design); the owner's zombie end is weakly fair (the owner learns of it).

## 8. For the next modeller

New flags (all default off, except the two rev-4 sub-flags, default on):
- `FX_OUT` the outcome log (slot by the READY hook; fence refuses exit 5 / retries exit 65; commit and watcher read it).
- `FX_CLAIM` claim.json / tombstone / nostart (H_NOSTART = 2), bind needs the claim, stop of a tombstone confirms at once, slotCount step 7.
- `FX_CGATE` stale coordinator may only Read; start hook + start.json (start-issued); close-done records (s.dn).
- `FX_CLOSE` stop-request at committed/started; verify needs close records; verify_rounds (t.vr).
- `FX_PLAN` one planner act (`planAct`): owner at vr >= 3, refence a torn fence, committed -> stop-request, lease rule.
- `FX_PLAN_STARTWAIT` (on) started-without-claim follows the lease rule; off = bind (exit 6).
- `FX_PLAN_OWNEREND` (on) the owner rule ends once every needed close is recorded; off = owner for ever.
- `FX_Q5B` branch Q5b: no session tools; the owner starts an admitted row by hand (par 3, no start.json).
- `FX_LEASE_NOBOUND` lease reading (ii): may expire before a healthy session's first tool call.
- `FX_PROPS` checks OneWriterPerAttempt (invariant on `s.wr`) and NoChargeWithoutFault (at the fence's charge).
- `AB_STOP_HELD` FIDELITY-3 gap 1 (held stop verify, `t.sq`, `t.vt`).
- `AB_STALE_SNAPSHOT` FIDELITY-3 gap 2 (stale coordinator reads `t.se`).
- New reason `RSN.CRASH` (5).

Traps I met:
- The state record is 2 bytes longer per state than the frozen copy's: a run that fitted 400 MB may now need ~700 MB.
- `run-seq.mjs` resumes from an existing result file with the same id and mode: write a rerun to a new file name.
- `run-seq.mjs` starts no part with under 60 s of wall left: `--wall-s` must exceed 60.
- Editing `model.mjs` or `configs.mjs` while a `--parts` run is going changes the later parts (each part spawns a fresh
  check.mjs): change nothing during a parts run.
- C_CLOSE needs AB_NO_COMMIT_RECONCILE: the design model's reconcile commits a row with no close state.
- Any fix that commits a child that is not READY (FX-OUT) meets the base model's "commit closes the child" assumption.
- In configs without AB_STOP_HELD, z -> `stopped` produces liveness failures that are artefacts (FX-CLAIM at 2500 MB:
  AlwaysCanResolve 16, `FX-CLAIM-2500-z-stopped-artefact.json`); turn AB_STOP_HELD on wherever a stop matters.
- An `rm` on a path built from shell variables is refused by the harness: move or rename instead.
