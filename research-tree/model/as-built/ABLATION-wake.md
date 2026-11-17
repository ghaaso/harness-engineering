# ABLATION-wake: the wake fixes in the as-built model (round 3, helper MB2b, label fixes-wake, 2026-11-17)

Inputs: `FIX-wake.md` rev 4 ("For the modeller"), `FIX-JOIN.md` (2a-2c, point 1), `CEX-wake.md`, `FIDELITY-3.md`,
`ABLATION-fence.md`. Model: the working copy `model/as-built/model.mjs`, `check.mjs`, `configs.mjs`, `run-seq.mjs`
(frozen copies untouched). Results: `model/results-as-built/fixes-wake/`, the provenance rerun in
`model/results-as-built/provenance/`. Every run: two fields, K2W (two faults; u, o, y as faults, s = one planned slow
call), R = 1, one at a time through the lane.

The fixes are designs; no script changed. "holds" = complete run, every property holds; "F n" = fails with an n-step
trace (a real trace of the model even in a BOUNDED run); "B" = BOUNDED, never "holds"; "NC" = liveness not checked
(memory).

**Budget outcome, said plainly.** Of the seven fixes, five are modelled (FX-W1, FX-W2, FX-W4, FX-W5, FX-W6). **FX-W3
(arm gate) and FX-W7 (watcher lock under the run lock) are not modelled**, nor the join's two targeted checks (d), the
B2/R2/L2/RL branches, nor any sub-flag. Section 7 lists every item not reached.

**Provenance.** `check.mjs` and `run-seq.mjs` write `sha256` of `model.mjs` and `configs.mjs`, read at the run's
start, into every result file written after the coordinator's request. Final model `d527b879...`, final configs
`3e818cb8...` (configs changes after `53d4e387` only appended the FXW-4R-S2/-B1 ids).

| Files | Hash (model / configs) | Written before |
|---|---|---|
| `BASELINE-AB-WAKE-ALL`, `FXW-12`, `FXW-12-S2`, `FXW-12-X1`, `FXW-12-X2`, `FXW-4`, `FXW-5`, `FXW-5__o1cs1`, `FXW-6`, `FXW-6-X` | none | the hash change. `FXW-12` also predates premise (b) (one alarm firing per turn; `FXW-12-S2`/`-X1` were rerun after it); all of them predate premise (c) (dead-man counting) and the p0 tag of a crash before call 1. The FXW-12/FXW-6-X/FXW-5__o1cs1 rows are quoted only where those edits cannot change them: FXW-12 configurations have no dead-man and no hard kill; FXW-5/6 configurations use none of FX-W1/W2/W4 (the extra state is off, `XB` false) |
| `FXW-4-3000`, `FXW-4-parts`, `FXW-4-X-parts`, `FXW-4-X1-parts`, `FXW-4-X2-parts`, `FXW-4-S2-parts` | `f9fa86fd` / `c1906012` | the p0 re-tag of a crash before call 1 and `CAND_REALERT`. Their NoSilenceAfterFirstCall F 1 (hard kill before call 1, then tagged p6) is excluded on the final model; their liveness verdicts do not depend on the tag |
| `FXW-4R*-parts`, `FXW-5-3000`, `FXW-6-3000`, `FXW-ALL`, all of `provenance/` | `d527b879` / `53d4e387` or `3e818cb8` | final model |

## 0. Flags off = unchanged (the proof run)

| Run | Recorded (CEX-wake) | Working copy, every new flag off | File |
|---|---|---|---|
| AB-WAKE-ALL part k=1,x=1 | 301,865 states, complete; WakeSourceAlive F 1, NoDeadlock F 2, AlwaysCanResolve F 2, NoFalseSuspicion F 7, rest holds | 301,865 states, complete; the same four failures with the same lengths, rest holds | `BASELINE-AB-WAKE-ALL.json` |

Every new state write is gated: the extra state bytes (`n.x`, `n.y`) are encoded only when FX-W1, FX-W2 or FX-W4 is on.

## 1. Per fix

Configurations are in the copy's `configs.mjs` (section "wake-group FIXES"). `WA` = design + the six old fixes + D7
observers + AB_PROCLIST + AB_ALARM_SUPERSEDE + AB_ALARM_MIDTURN + AB_ARM_SPLIT + AB_ENDTURN_SPLIT + AB_FAIR_IDS +
WAKE_PROPS + WFX_PROPS, budget K2W. **No whole wake configuration with FX-W2 completes**: FXW-4 at 3000 MB stopped
BOUNDED at 23,229,448 states (`FXW-4-3000.json`). The per-fix verdicts for FX-W1, FX-W2 and FX-W4 are therefore from
**five complete maximal parts** each (k=1,x=1; k=1,u=1; k=2,u=1,x=1; k=2,x=2; k=2,u=1,l=1: the faults these defects
need), never "holds" for the configuration. FX-W5 and FX-W6 completed whole at 3000 MB.

New property (flag `WFX_PROPS`): **NoSilenceAfterFirstCall** = WakeSourceAlive except a death before the turn's first
tool call (tag `p0`, FX-W2's stated scope: "Does not cover a turn that dies before call 1"), the host reset and the
owner's two-loss case. WakeSourceAlive itself stays checked; it fails at 1 step in every configuration below (the first
turn dies before call 1), which FX-W2 says FX-W4 covers.

### FX-W4 (the dead-man), and a design gap found in it

| Item | Value |
|---|---|
| C_X | WA + FX-W1 + FX-W2 + AB_X_KILLS_BG (the hard-kill branch) + FIX_DEADMAN (`FXW-4`) |
| Run | 5 parts complete at 400 MB (1,786,607 states summed); whole BOUNDED at 3000 MB (23.2 M) |
| Verdict | **NoDeadlock F 8, AlwaysCanResolve F 7 (one fault, x)**: a **design gap** of FX-W4. Trace: coord0 arms, drains, hands over (the hand-over kills its alarm); the dead-man sees no alarm of ce 1 for two runs and alerts; the owner starts coord1; coord1's first turn dies before call 1. The cause (no alarm) never cleared, so "alert once per onset" (FX-W4 step 3, B4.5) never alerts again: silence for ever. Same gap in the joint run (NoDeadlock F 7: the alert's wake is consumed mid-turn, then the turn dies). EventuallyResolves F 10 is an artefact (the process list never returns: the u recovery is an environment step, never forced) |
| Ablation (C_X - FIX_DEADMAN) | `FXW-4-X`: **NoDeadlock F 2, AlwaysCanResolve F 2** (part k=1,x=1, complete): the first turn dies before call 1, nothing else can wake anyone |
| With the modeller's candidate | `CAND_REALERT` (NOT in the design, used only to isolate FX-W1/W2): while the cause persists two runs after an alert, alert again. `FXW-4R`: **NoDeadlock and AlwaysCanResolve hold in all 5 complete parts** (2,940,572 states summed); EventuallyResolves F 10 is the same u artefact. The design decision (re-alert or not, and at what pace) is the owner's; the model says once-per-onset alone is not enough at one fault |
| Files | `FXW-4-parts.json`, `FXW-4-X-parts.json`, `FXW-4R-parts.json`, `FXW-4-3000.json` (BOUNDED, safety only) |

### FX-W2 (arm first)

| Item | Value |
|---|---|
| C_X | as FX-W4 (FX-W2 depends on FX-W4 for a death before call 1, and on FX-W1's markers for "an alarm that has not exited"); judged in `FXW-4R` so that the FX-W4 gap does not mask it |
| Verdict | `FXW-4R`, 5 complete parts: liveness holds (above); NoSilenceAfterFirstCall **F 2**: the hard-kill branch (a crash after the ensure kills the alarm, no marker: tag p6), which FX-W2 does not cover by design ("an alarm killed hard ... FX-W4") |
| Ablation (C_X - FIX_ARM_FIRST) | `FXW-4R-X2`: **NoSilenceAfterFirstCall F 1** = the recorded M2 gap (reconcile exits 1 alarm-missing, the turn dies before start-alarm: CEX-wake 4.1 / D6 p1-p2). Liveness still holds there because the dead-man recovers it. Without the dead-man, `FXW-12-X2` (BOUNDED, real traces): **NoDeadlock F 2, AlwaysCanResolve F 2, EventuallyResolves F 5** |
| What FX-W2 alone does not give | `FXW-12-S2` (no dead-man, BOUNDED): NoDeadlock F 2 = a death before call 1 (p0). So FX-W2 needs FX-W4, as its text says |
| Files | `FXW-4R-parts.json`, `FXW-4R-X2-parts.json`, `FXW-12-X2.json`, `FXW-12-S2.json` |

### FX-W1 (tri-state liveness, exit markers)

| Item | Value |
|---|---|
| C_X | as FX-W2 (`FXW-4R`) |
| Verdict | as FX-W2. In part k=1,u=1 the shortest silence with FX-W1 needs 9 steps and comes from a **join gap** (section 2) |
| Ablation (C_X - FIX_ALARM_MARKER) | `FXW-4R-X1`, part k=1,u=1 (complete, one fault u): **NoSilenceAfterFirstCall F 5** = schedule W3: the list fails, the alarm fires mid-turn with no marker, endturn reads its record as unknown and exits 2 (S:652-654), branch B2 starts nothing: silence. Liveness holds there (the dead-man's list window alerts), so FX-W1's load is on silence, not on liveness, once FX-W4 is in. D1 (WakeChainBounded, AlarmsBounded) holds with either FX-W1 or FX-W2 alone: FX-W1's tri-state stops "alarm-missing on unknown"; FX-W2's ensure registers only into a free slot |
| Not modelled | `FIX_FLAG_ALLOWLIST` (W5, W6), `FIX_MARKER_PRUNE`, branch L2 |
| Files | `FXW-4R-X1-parts.json` |

### FX-W5 (re-raise while due), branch R1

| Item | Value |
|---|---|
| C_X | AB-W-ACT-DUE's flags + FIX_ACT_RERAISE (`FXW-5`) |
| Run | **complete at 3000 MB, 7,005,647 states** (BOUNDED at 400: 2.91 M) |
| Verdict | every safety property holds, NoBusyLoop holds; **NoDeadlock F 6, AlwaysCanResolve F 5, EventuallyResolves F 5, WakeSourceAlive F 4**, all by the fence group's handover path with u (drain, `handover raise` exits 2 with no list, the turn ends with no endturn, then a lost wake or a list that never returns: CEX-wake 4.7's AB_PROCLIST finding). No tick appears in these traces: not caused by FX-W5 and not closed by it (FX-W4 is not in this configuration) |
| Ablation | recorded: AB-W-ACT-DUE part k=2,o=1,cs=1, **EventuallyResolves F 13** (CEX-wake 4.6). The same part with the fix: **complete, 119,202 states, every property holds** (`FXW-5__o1cs1.json`) |
| Files | `FXW-5-3000.json`, `FXW-5__o1cs1.json` |

### FX-W6 (per-kind deadlines), branch B1

| Item | Value |
|---|---|
| C_X | AB-W-HANG-CALLS's flags + FIX_OP_DEADLINE (`FXW-6`) |
| Run | **complete at 3000 MB, 13,993,281 states** |
| Verdict | **NoFalseSuspicion holds**; the same four liveness/WakeSourceAlive failures as FXW-5, same cause (handover path with u), not touching the tick |
| Ablation (C_X - FIX_OP_DEADLINE) = AB-W-HANG-CALLS | **NoFalseSuspicion F 6** (BOUNDED at 400, real trace): a healthy child in a long call, the first counted tick of the epoch adds one, the second fires hang (= CEX-wake 4.5) |
| Branch B2 | not modelled (no refund) |
| Files | `FXW-6-3000.json`, `FXW-6-X.json` |

### FX-W3 (arm gate) and FX-W7 (watcher lock under the run lock)

**Not modelled** (budget, priority order). FX-W3 needs `turn.json`'s arm state, the gate on admit/first-fence/session
start, `spent` at endturn and the `unarmed` records; FX-W7 needs a run-lock holder that can hang (`hung-lock`), the
tick copy and `busy_ticks`. No flag, no run.

## 2. A join gap found on the way (FX-W1/W2 with the fence group's hand-over)

`FXW-4R` part k=1,u=1 (one fault u), NoSilenceAfterFirstCall F 9: the coordinator drains; its turn's last act is
`handover raise`, which exits 2 with no process list (handover.mjs:271-276) and the turn **ends without endturn**; the
next turn's ensure says `present` (the slot is unknown), the alarm fires mid-turn (marked), reconcile says
arm-unconfirmed, the plan is again only `handover`, which exits 2: the turn ends with no endturn, so nobody re-ensures
the marked slot: silence. FIX-JOIN 2b assumes every turn ends at row 9 (endturn); the hand-over path does not. The
dead-man recovers liveness (list window), so the cost is silence until the alert. S2 removes it (section 3). Gap in the
join (whose rule ends a turn after a failed raise), not in the model; the brief act "on exit 2 from handover, run endturn"
would be the smallest change (INFERRED, not run).

## 3. Owner branches

| Branch | Run | Result |
|---|---|---|
| S1 / S2 (FX-W2) | `FXW-4R` vs `FXW-4R-S2` (4 parts complete, k=2,u=1,x=1 BOUNDED) | S2 removes the k=1,u=1 silence (no failure in that part). S2 adds a new p6 silence: a hard kill between the two ensures (NoSilenceAfterFirstCall F 1, hard-kill branch only). Liveness holds in both |
| B1 / B2 (endturn exit 2) | `FXW-4R` (B2) vs `FXW-4R-B1` (2 parts complete, 3 BOUNDED at 400) | no verdict change in the complete parts; B1 does not remove the 9-step silence (that turn has no endturn) |
| L1 / L2 (FX-W1) | L1 only | L2 (leases) not modelled; W4 (hard kill under u) therefore not shown either way |
| D5: B1 / B2 (FX-W6) | B1 only | B1 holds NoFalseSuspicion **only under the stated bound** (a healthy call ends within its kind's deadline, modelled as a premise). B2 (refund) not modelled |
| R1 / R2 (FX-W5) | R1 = FXW-5; R2 = as built = the recorded ablation | R1 holds, R2 fails EventuallyResolves 13 |
| Re-raise (FX-W5) | — | the design has no re-raise-or-not branch beyond R1/R2 |

## 4. The joint run

`FXW-ALL` = every as-built flag of both groups + D7 observers + FX_PROPS + AB_STOP_HELD + AB_STALE_SNAPSHOT +
AB_GP_RESTART + the five fence fixes modelled (FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE, FX-PLAN) + the five wake fixes
modelled (FX-W1, W2, W4, W5, W6). FX-REDO, FX-W3 and FX-W7 are not in the model, so this is 10 of 13. 400 MB:
**BOUNDED, 2,579,912 states (1,350,125 expanded)**, 8,205,402 transitions. Failing, each with a real trace:

| Property | Steps | Cause | Interaction between fixes? |
|---|---|---|---|
| NoFalseSuspicion | 14 | two short suspends counted as ticks (timer branch b, M5 gap) | no: open by design (W15) |
| NoDeadlock / AlwaysCanResolve | 7 / 7 | the dead-man's once-per-onset alert, its wake consumed mid-turn, then the turn dies | no: the FX-W4 gap of section 1 |
| EventuallyResolves | 9 | list never returns + a reset leaves run.lock | no: artefact (environment never forced) |
| WakeSourceAlive | 1 | first turn dies before call 1 (p0) | no: FX-W4's case by design |
| NoSilenceAfterFirstCall | 2 | hard kill after the ensure (p6) | no: the hard-kill branch, open by design |

Every fence-group property (NoStaleAccepted, Slots, OneSessionPerAttempt, ReadyNotDiscarded, TwoCoordinatorsAct,
OneWriterPerAttempt, NoChargeWithoutFault, StaleWrites, CommitRecordStable, RestartLimitGhost, ...) is **not refuted
within the bound**, never "holds". No failure shows an interaction between the two groups' fixes within 2.58 M states.

## 5. The eighteen schedules (FIX-wake, final table; W1-W18 in FIX-JOIN numbering)

| # | Schedule | Covered by | Result / reason |
|---|---|---|---|
| W1 | Stale confirmed (x, o) | not expressible | FX-W3 not modelled (no `turn.json` arm, no gate) |
| W2 | Reused outcome (x, o) | partly FXW-4 | nonces are not modelled: the ensure is one step that reads slots and markers only (the rev-3 point that nothing the session passes is trusted). A fired alarm carries its marker, so it is never counted live; covered as far as markers go |
| W3 | L1 fired alarm under u | FXW-4 vs FXW-4-X1 (and FXW-12 vs FXW-12-X1) | see section 1, FX-W1 |
| W4 | Hard kill under u (L1) | FXW-4 (AB_X_KILLS_BG + u) | **expected to fail (open, L1)**: see section 1, FX-W4; L2 not modelled |
| W5 | Forged ticks (`--once`, `delta0`) | not expressible | the model has no flags and no forged watcher; FIX_FLAG_ALLOWLIST not modelled |
| W6 | Forged boot | not expressible | no `--boot`; host class is the reset flag (FIDELITY-3 gap 5) |
| W7 | Never reconciles (o) | not expressible | FIX_UNARMED_REC (FX-W3) not modelled; fault o skips acts, not the reconcile |
| W8 | Confirm deadline vs slow query | not expressible | the ensure's query and hold 1 are one step and reconcile's hold 2 runs after it (the fix's ordering assumed, not checked); no `slow` |
| W9 | Second reconcile | not expressible | one reconcile per turn in the model |
| W10 | Sleep before alert (x, asleep) | not expressible | no `asleep` bit; WakeToRun assumed (the dead-man step is always enabled) |
| W11 | Stuck run lock (hung-lock) | not expressible | no hung-lock fault; FX-W7 not modelled |
| W12 | Flapping list | partly FXW-4 | the window is a saturating counter (+1 per failed run, -1 per answered run), not 3 of the last 5; at two faults u happens once, so flapping cannot be expressed |
| W13 | Honest long task (age cap) | not expressible | no age cap, no attempt age |
| W14 | Idle child | not expressible | no `idle` kind in the model |
| W15 | Short suspends (ss, branch b) | not run | needs AB_PAUSE_GAP with FX-W6; expected to fail in timer branch b (open). In the model one short suspend counts one tick (AB-W-PAUSE-GAP, NoFalseSuspicion F 6 with two). Not run: its verdict is known and changes nothing |
| W16 | SingleWatcher (u, sp, L2) | not expressible | L2 and FX-W7 not modelled |
| W17 | RevocationNeverGated | not expressible | FX-W3 not modelled (no gate exists, so it holds trivially) |
| W18 | Skipped-tick state | not expressible | FX-W7 not modelled |

## 6. What stays open

1. **FX-W4 once-per-onset alert (design gap, one fault).** An alerted turn that dies before call 1 leaves the cause in
   place and nothing alerts again (FXW-4 NoDeadlock F 8; FXW-ALL F 7). A re-alert while the cause persists
   (`CAND_REALERT`, the modeller's candidate, not the design) closes it in all five parts. The pace and form are the
   owner's call.
2. **Hand-over without endturn (join gap).** `handover raise` exiting 2 ends a turn with no endturn, against FIX-JOIN
   2b's premise (section 2). Silence of 9 steps at one fault u with FX-W1/W2/W4 on; S2 removes it.
3. **The hard-kill branch** (p6 / x kills background): FX-W2 and FX-W1 do not cover it by design; NoSilenceAfterFirstCall
   F 2 (S1) and F 1 (S2: a kill between the two ensures). FX-W4 recovers liveness; L2 (not modelled) is the design's
   answer under u.
4. **Hand-over exit 2 under u** (AB_PROCLIST, fence group): the four liveness failures of FXW-5 and FXW-6 (no FX-W4 in
   those configurations). Not a wake-fix question; recorded in CEX-wake 4.7.
5. **Short suspends** (W15, timer branch b): NoFalseSuspicion F 14 in FXW-ALL; open by design.
6. **Three timing premises** (section 8): (a) no alarm firing between its ensure and the same turn's reconcile, (b) at
   most one current alarm firing per turn, (c) the dead-man does not count while a wake is pending. Each is a rule the
   design must state (an untimed model refutes the fixes without them); none is a mechanism.
7. **FX-W6's B1 bound** is a premise on the environment (a healthy call ends within its kind's deadline).
8. FX-W3, FX-W7 and the join's targeted checks (d): not modelled.

## 7. Deliberately not run

- FX-W3 and FX-W7: no model (budget; last in priority). Hence no C_X, no ablation, no branch for them, and schedules
  W1, W7, W9, W11, W16, W17, W18 not expressible.
- (d) the two FIX-JOIN targeted checks: need FX-W3's brief, the JOIN_HOOK_ORDER hook order and the watcher-death lease.
- Branches L2, B2 (FX-W6 refund), RL, R2-as-fix; sub-flags FIX_FLAG_ALLOWLIST, FIX_MARKER_PRUNE, FIX_UNARMED_REC.
- Whole-configuration runs of FXW-4/FXW-4R beyond the one BOUNDED 3000 MB run (23.2 M states, not completing); the
  per-fix verdicts rest on the five maximal parts instead.
- FXW-4R-B1's three BOUNDED parts at higher memory; FXW-4R-S2 part k=2,u=1,x=1 at higher memory.
- The joint run above 400 MB (it is BOUNDED; a larger run would only raise the bound).
- W15 with FX-W6 (its verdict is known: fails in branch b).
- `FIX_DEADMAN` with the hard kill off (the FX-W4 gap does not need it).
- FX-W5/FX-W6 combined with FX-W4 outside FXW-ALL.

## 8. Fidelity, by the modeller

Per fix: what I merged into one step and why, and what still reads true state.

- **FX-W2 (`FIX_ARM_FIRST`, `ALARM_SLOTS`).** Ops `EN` (ensure) and `RC` (reconcile), in that order, are the turn's first
  calls; the wake step itself does no tool call, so a death before `EN` (tag `p0`) is "a death before call 1". Merged in
  `EN`: the nonce file create (step 2), the query outside the lock (step 3) and hold 1 (step 4). Safe for this model
  because the process list can change only by fault u, and a u between query and hold makes the slot `unknown` either
  way. Merged in `RC`: r1-r13, `turn.json`, the wait and hold 2. A **yield before `RC`** lets the alarm and every other
  actor move between the two calls. Not modelled: nonces, the `abandoned` path (step 8), `turn.json`'s fields other than
  confirmation, the `slow` query (W8). Two **timing premises**, each a stated rule and not a mechanism: (a) an alarm cannot
  fire between its own ensure and the reconcile of the same turn (alarm byte bit 5); without it FXW-12 failed
  NoSilenceAfterFirstCall at 3 steps by an alarm (period 1 h) expiring between two consecutive calls; (b) at most one
  current alarm of a coordinator fires inside one of its turns (a turn is shorter than the alarm period; S2's second slot
  has period 1.5 x). Without (b), FXW-12-S2 failed at 6 with both slots firing inside one short turn. A turn longer than
  the alarm period would make (b) false; that case is not covered.
- **FX-W1 (`FIX_ALARM_MARKER`).** The marker and the exit are one step (the design: the exit follows within ms). Reader =
  `slotVerdict`, tri-state; used by the ensure, by reconcile's count, by endturn, and (without FX-W2) by the as-built
  armAtStart, which then asks for an alarm only on `dead`. Exit 67 on an unreadable alarm.json is gone under FX-W1 (an
  anomaly). The allow-list (`FIX_FLAG_ALLOWLIST`) and `FIX_MARKER_PRUNE` are not modelled: no actor forges flags, and
  markers are never pruned (a marker lives until its slot is re-registered or the ce changes).
- **FX-W4 (`FIX_DEADMAN`).** One run = one step of proc 3 (weakly fair: the scheduled task with wake-to-run, assumed
  installed and working). The alert and the owner's wake of the current coordinator are merged (H4 branch A or B: the
  owner acts). `runs_no_alarm` counts any alarm process of the current ce (the list sees processes, superseded ones
  included). The list window is a saturating counter, not 3 of 5. `stuck`, `busy_ticks`, `unarmed_turns`, the `unarmed`
  records and the join's `runs_no_watcher` are **not** inputs (their mechanisms FX-W3/W5's count/W7 are not modelled).
  Timing premise (c): a pending wake starts a turn whose call 1 runs within seconds, so the dead-man does not count an
  alarm-less state while the current coordinator has a pending wake; without it the untimed model let two dead-man runs
  alert before the first turn's ensure.
- **FX-W5 (`FIX_ACT_RERAISE`).** Re-raise at **every** tick while acked and still due (the capped interval
  `min(15 x 2^b, 60)` is untimed); hang/stall/loop events are re-appended when acked and still true. `stuck_count` and
  step 1's owner exclusion are not modelled. Reads: the watcher's own counters (as built), not true state.
- **FX-W6 (`FIX_OP_DEADLINE`, branch B1).** Step 1 (the fresh tick counts nothing) is exact. The per-kind deadline is
  modelled only as its consequence under B1: a **healthy** slow child's hang count is capped one below the threshold.
  This reads the child's true mode (SLOW vs STUCK): it is the B1 premise "a healthy operation ends within its kind's
  deadline", an environment bound the owner must state, not something the watcher computes. `idle`, the age cap and B2's
  refund are not modelled. The `tickEnabled` timeliness oracle for healthy children making calls (FIDELITY-3 gap 1)
  remains and is the same B1 premise for the `model` kind.
- **Still reads true state** (unchanged from the as-built model): `tickEnabled`, `eligibleHO`, reconcile's session
  existence in configs without AB_TRANSCRIPT_LAG, admission by true liveness in configs without AB_SLOTCOUNT
  (every C_X here except the joint run), the observers (by design).

FIDELITY-3 gaps under the wake fixes, one line each:

| Gap | State |
|---|---|
| 1 `tickEnabled` timeliness | open; under FX-W6 it is the B1 premise, named as such |
| 9 true liveness / session existence in wake configs | **open in every C_X** (none runs AB_SLOTCOUNT/AB_TRANSCRIPT_LAG: memory); on only in the joint run FXW-ALL. No wake fix reads admission or session existence, so a C_X verdict about wake sources does not rest on it; it could hide a Slots failure, which no wake fix acts on |
| 12 `gp` across a watcher restart | **closed behind `AB_GP_RESTART`** (a new watcher clears `gp`); on only in FXW-ALL (no C_X runs AB_PAUSE_GAP) |
| D6 p1 "never runs reconcile" | open (needs FX-W3's brief/gate) |
| D6 p3/p3b alarm expiring inside its own turn | partly closed under FX-W2 by premise (a) and (b) |
| D6 p6 (crash kills background) | modelled as the hard-kill branch in FXW-4 |
| 11 endturn without a list counts any watcher.lock holder | open (unchanged in the fixed endturn path) |

## 9. For the next modeller

- Flags live in `makeParams`; the extra state bytes `n.x`/`n.y` are encoded only when `XB` (FX-W1, W2 or W4) is on,
  which is why the fence configurations and the baseline reproduce exactly. Keep that gate.
- `partsumm.mjs <file> [prop]` prints failing properties per part and a named trace.
- The wake configurations do not complete whole even at 3000 MB once FX-W2 is on; use the five maximal parts
  (k=1,x=1; k=1,u=1; k=2,u=1,x=1; k=2,x=2; k=2,u=1,l=1), and report BOUNDED parts as such.
- To model FX-W3 next: add `turn.json` arm state to the coordinator byte, gate admit/first fence on it, and end every
  turn (including the hand-over exit-2 path) through endturn; that also decides the join gap of section 2.
- Check for interactions only in FXW-ALL; the C_X configurations deliberately leave the other group's flags out.

## 10. Provenance rerun (final model, every wake flag off)

| Configuration | Memory | Recorded (`fixes-fence/`) | Rerun (`provenance/`) | Equal? |
|---|---|---|---|---|
| FX-OUT-PLAN | 2500 MB | 5,682,597 states, complete, every property holds | 5,682,597 states, complete, every property holds | equal (states, transitions and every verdict) |
| FX-CLOSE | 1500 MB | 4,151,883 states, complete, holds | 4,151,883 states, complete, holds | equal |
| FX-CGATE (Q5a) | 2000 MB | 8,290,758 states, complete, holds | 8,290,758 states, complete, holds | equal |
| FX-CLAIM, r parts | 3000 MB | k=2,cs=1,r=1 11,799,897; k=2,cv=1,r=1 17,317,214; k=2,cd=1,r=1 14,114,426; all complete, holds | 11,799,897; 17,317,214; 14,114,426; all complete, every property holds | equal |

Rerun hash: model `d527b879...`, configs `3e818cb8...`. Equality checked on states, transitions, completeness and each
property's verdict and trace length.
All four are equal: no edit of this round changes the fence-group state space when the wake-fix flags are off.

## Final pass (label fixes-final, 2026-11-17)

Results in `model/results-as-built/final/`. Final model `ceea34f3...`, configs `9bf08cf0...`. `FN-R5*.json` ran on
model `67c4dec4...` (before the N2 edit, which is behind `FIX_ENDTURN_ALWAYS`, off there); the other files on the final
model, some with configs `98ef2c30...` (before FN-N2/FN-JOIN-WSTART-1F/FN-OUT-CLOSE-K2 were appended). New flags, all off
by default: `FX_R5_DEADCOUNT`, `FX_R5_ORPHAN` (FIX-fence rev 5 point 1), `FIX_ENDTURN_ALWAYS` (FIX-wake rev 5 N2).

### F1. FX-W3 and FX-W7: not expressible in this model (three lines each)

- **FX-W3.** Its ablation must fail on W1, a turn that creates work on a stale `confirmed` without its own arm calls.
  In this model, under FX-W2, every turn runs ensure and reconcile before any act, and fault o skips only acts, so the
  arm is always read fresh at reconcile; no state reaches the gate with a stale arm. Expressing it needs `turn.json`'s
  arm state and an o that skips the arm calls: a new fault semantics, not the fix.
- **FX-W7.** Its ablation must fail SingleWatcher (W16) or NoBusyLoop (W11); both hold in every as-built configuration
  (CEX-wake table). The model's watcher tick is one atomic step that never takes the run lock, run.lock is held only by
  a dead holder (`rl`), and there is no live hung holder and no L2 lease bit. The defect FX-W7 fixes must be modelled
  first (a split tick under a hung run lock, the exit-75 wake loop); that is new mechanism, not reached.

### F2. The two FIX-JOIN checks

| Check | Configuration | Result |
|---|---|---|
| (i) dead watcher, its restart, the start lease (L1, list known) | `FN-JOIN-WSTART` = C_D4B (FX-CLAIM + FX-CGATE + FX-PLAN, lease expiring at watcher ticks) + C_W4R (FX-W1, W2, W4 with the re-alert, hard-kill branch); part k=2, x=1, cd=1: a coordinator crash kills the watcher and the alarm, a child dies before its claim | two fields: **BOUNDED** at 3000 MB (21.7 M states); design FX-W4 (`-D`) BOUNDED at 1500 MB. One field (`FN-JOIN-WSTART-1F`): **complete, 393,461 states: EventuallyResolves, NoDeadlock, AlwaysCanResolve and every safety property hold**; WakeSourceAlive F 1 (p0) and NoSilenceAfterFirstCall F 2 (the hard kill), both known. The restart is the model's endturn watcher start (FX-W1's tri-state endturn, then SW): the lease expires at the restarted watcher's ticks |
| (i') the restart act omitted, `FIX_NOWATCHER_ALERT` | — | **not expressible**: fault o exists only with AB_ACT_DUE and goes straight to endturn, and endturn itself restarts the watcher, so the model has no turn that omits the restart. `runs_no_watcher` not modelled |
| L2 branch | — | not modelled (no lease bits) |
| (ii) `JOIN_HOOK_ORDER` reversed | — | **not expressible**: the order is between FX-W3's armed check and FX-CGATE's `start.json` create in one hook pass; FX-W3 is not modelled (F1), so no armed check exists to deny after the create |

### F3. Fence side (FIX-fence "Revision 5 notes")

| Check | Configuration | Result |
|---|---|---|
| (a) point 1, the dead session that never claimed, **without** the rule | `FN-R5-DEAD` = C_D4B + `FX_R5_DEADCOUNT` (step 7 counts a visible session with no done record, alive or dead); part k=2, cd=2 | complete, 4,796,168 states: **AlwaysCanResolve F 7**: both children's transcripts appear, both die before their first tool call; the two dead visible sessions are counted for ever and fill N_max = 2. EventuallyResolves F 15 (same cause, through the tombstone's at-once confirm) |
| (a) **with** the rule | `FN-R5` = FN-R5-DEAD + `FX_R5_ORPHAN`: a tombstone confirms at once only with no visible folder session left; a dead visible session gets its done record from the close's "no such session" (H3, list answers; merged into the stop step) | complete, 4,724,454 states: **every property holds** |
| (b) point 3, FX-OUT without the commit oracle | `FN-OUT-CLOSE` = C_CLOSE (AB_COMMIT_CLOSE: a committed child holds its slot until stop request + verify; FX-CLOSE, FX-CGATE, FX-PLAN, the held stop verify AB_STOP_HELD, D7_SLOTS) + AB_READY_SPLIT + FX_OUT | one fault: complete, 401,036 states; **two faults (K2): complete, 8,225,714 states; every property holds**, AlwaysCanResolve and SlotsProc included |
| (b) ablation, FX_CLOSE off | `FN-OUT-CLOSE-X`, one fault | complete, 552,329 states: **AlwaysCanResolve F 6**, EventuallyResolves F 18 |

Not modelled for (a): the `close-session` planner act for sessions that appear after a confirmation (no such late
session arises in this schedule), and point 2's `--if-unclaimed` (its own check (b), not asked here).

### F4. Wake side (FIX-wake "Revision 5 notes")

| Note | Check | Result |
|---|---|---|
| N1 re-alert (`FIX_REALERT` = the model's `CAND_REALERT`) | C_X = FXW-4, part k=1, x=1, off and on | off: **NoDeadlock F 8, AlwaysCanResolve F 7** (complete, 63,270 states); on (`FXW-4R`): **both hold** (complete, 91,370 states). WakeSourceAlive F 1 (p0) and NoSilenceAfterFirstCall F 2 (hard kill) either way, both outside the notes' claims. P1/P2 are one untimed model |
| N2 every turn ends with endturn (`FIX_ENDTURN_ALWAYS`: the hand-over exit 2 and reconcile's exit 75 go to endturn, which acts on its exit 1 once) | FXW-4R, part k=1, u=1, off and on | off: **NoSilenceAfterFirstCall F 9** and WakeSourceAlive F 9 (complete, 363,670 states, the section 2 trace); on (`FN-N2`): **NoSilenceAfterFirstCall and WakeSourceAlive hold** (complete, 363,706 states). EventuallyResolves F 9 remains: the list never returns (environment never forced), the known artefact |
| N2 branch E2 (defer once) | — | not modelled (a new mechanism; its check needs fault o on endturn, which the model does not have) |
| N3 premises | — | no run: the verdicts above name premises (a), (b), (c) and the B1 bound as premises, not properties of the fixes |

### F5. Deliberately not run in the final pass

- FX-W3, FX-W7 and the hook-order check (F1, F2): not expressible without new mechanism.
- `FIX_NOWATCHER_ALERT`, the L2 branch, E2: not expressible or not modelled.
- `FN-JOIN-WSTART` with two fields beyond 3000 MB (BOUNDED); the one-field run decides the schedule.
- FN-OUT-CLOSE-X at two faults (the one-fault failure is the ablation's verdict).
- FIX-fence rev 5 point 2 checks (a) and (b), the `close-session` act.
- Rule deviation: one `node -e 1` was started outside the lane during the final pass (a no-op left in a shell
  pipeline by mistake; it ran no model).
