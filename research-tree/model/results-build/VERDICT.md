SEND BACK: FX-W6: AgeCapReachesOwner (AGE-B)

# S2.4 verdict: the model check of the code as built (task r57-0507, slice 2)

Written 2026-11-20. The first S2.4 helper classified every failure (`build/units/S2.4/checkpoint.md`) and asked for three
reruns (`units/S2.4/reruns.md`). Its successor (`analyse: S2.4 model verdict successor`) read those reruns and wrote
this file. Code: `build` e5c9c4f8. Model: S2.2's `model-build.mjs` (MB), 448e7392. The S2.4 variant (00de3310) is used
only where this file says so. Results: S2.3's 28 runs (`build/facts/S2.3.md`) and the three reruns in `rerun/`.
Abbreviations (AW, AF, FF, FW, RC, S17) are as in `build/branches.md`.

**Answer.** One fix goes back: FX-W6, for the age cap. Every other failing property is one of three things: a model
artefact, a gap already decided, or a fact the pilot must measure. None of them changes a decision. The reruns show
nothing new: R1 and R2 are complete and as expected, and R3 (75 parts) fails only where the decided gaps say it
will. S2.2's model should take the S2.4 variant's line 1015 (section 6).

## 1. The fix sent back: FX-W6, W6 item 6 (class a, a fault of the code)

The failing runs:
- AGE-B whole (k=1): AgeCapReachesOwner F 16 and AlwaysCanResolve F 3.
- AGE-B k=2,m=1,o=1: AgeCapReachesOwner F 16, EventuallyResolves F 16 (the same cycle) and AlwaysCanResolve F 3.

AlwaysCanResolve F 3 has the same cause: once child f0e1 imitates activity, no ordinary act can commit or fail f0.
The record said in advance that this property fails by construction and goes back to FX-W6 (refute/W4.md:116-118;
STATE.md:152, 662).

The trace in `AGE-B.json`, walked against the code on build:
- 0: an owner-typed first turn admits, starts and binds f0 and f1 (coordinator.md:120-138; the start tool).
- 1: fault m. Child f0e1 imitates activity. New records reset `hang_ticks` (watch.mjs:337), its calls vary, and its
  kind is not idle. No detector fires and no READY comes.
- 3, 8, 11: endturn acknowledges the seq read at the start of the turn (coordinator.md:163-176).
- 6: each counted tick at `bound` adds to `age_ticks` (watch.mjs:339). Once `age_ticks - age_base >=
  attempt_max_ticks`, the act-due `age-cap` is pushed (watch.mjs:1205-1206). That is an event line, so the watcher
  exits 10 and wakes the coordinator.
- 10: the turn reads the event. The brief has no line for age-cap or idle-child (no match in
  `tcb/briefs/coordinator.md`; refute/W4.md:119-125), so the turn plans nothing and acknowledges it at endturn.
- 12: the next tick finds the key's event at or below `acked_seq` and sets `age_base = age_ticks` (watch.mjs:1199-1204;
  the assignment is at 1203). The condition is no longer pushed and leaves the present set.
  - The re-raise pass (watch.mjs:1250-1271) rebuilds `reraise` and `stuck` from the present set only. Its count
    starts again at 0 and never reaches the stuck limit.
  - The dead-man's only cause for this case is watcher.json `stuck` (status.mjs:70, 956, 992), so no alert is sent.
- 15: after another `attempt_max_ticks` the cap is raised again, and the cycle repeats. The owner is never told and
  the attempt never ends.

**Smallest change: stop re-arming on a bare acknowledgement.** Delete the `age_base = age_ticks` of
watch.mjs:1199-1204. The condition then stays present, FX-W5 raises it again and counts it towards `stuck`
(watch.mjs:1250-1271), and FX-W4 alerts the owner (status.mjs:956, 992).

Measured: AGE-STUCK models that leg, and it holds AgeCapReachesOwner and AlwaysCanResolve. The whole run has 476,122
states; at k=2,m=1,o=1 (162,074 states) every property holds.

The record says two more things belong with this change, and neither is in the model:
- a brief line for age-cap and idle-child (refute/W4.md:119-125);
- an act that lets the owner's "continue" re-arm the cap. No script has one today (refute/W4.md:113-115).

## 2. The three reruns: what each showed and what it decides

| run | expected (reruns.md) | found | decides |
|---|---|---|---|
| R1 FXW-6-B whole, S2.2's model | complete at about 18.5-20 M; NoFalseSuspicion holds; WakeSourceAlive F 4, NoDeadlock F 6, AlwaysCanResolve F 5, EventuallyResolves F 5 | complete: 18,638,479 states, 145.6 s, peak 2,520 MB. NoFalseSuspicion holds. The four failures are as expected, and each trace is byte-equal to S2.3's FXW-5-B and to R57's whole `FXW-6-3000.json` | B1 holds as built under the Q5 rule, as far as the model checks it: there is no false suspicion. The four failures come from the hand-over exit-2 path under u, not from FX-W6 (section 3, row 6) |
| R2 FN-OUT-CLOSE-K2-B k=2,cv=1,r=1 | complete at about 19-21 M; every property holds | complete: 21,932,370 states, 217.1 s, peak 2,752 MB. Every property holds | the close group as built holds in all 43 of its k=2 parts (199,541,045 states summed) |
| R3 FN-N2-B by parts, variant | 75 parts complete, about 95-100 M; failures only in x parts (F 1, F 2), u parts (EventuallyResolves) and some u parts with a second fault | 75 of 75 complete in one round: 97,554,176 states, 947.7 s, peak 1,103 MB. Failures: the 12 x parts (WakeSourceAlive F 1 = p0, NoSilenceAfterFirstCall F 2 = p6); 11 u parts (EventuallyResolves F 9); k=2,r=1,u=1 (EventuallyResolves F 10); k=2,l=1,u=1 (WakeSourceAlive F 23, NoSilence F 23, EventuallyResolves F 9). NoDeadlock and AlwaysCanResolve hold in all 75. The first helper's variant parts reproduce state for state (cv=2, l=2, u=2, x=2, l=1,u=1, cv=1,o=1) | the wake group as built (N2 is in the brief) fails nowhere beyond the decided gaps |

Notes on the reruns:
- **One new trace.** R3's k=2,r=1,u=1 fails EventuallyResolves in 10 steps, a form already recorded at
  ABLATION-wake.md:140. The process list never comes back, and a host reset leaves `run.lock` behind; no list can
  judge its holder. Every call then exits 75, and the owner is woken again and again in a cycle. This is the
  "environment never forced" artefact: class b.
- **Also measured here, each run under 30 s on the variant.** These used the first helper's FXW-5-B closure flags,
  set over the configuration: N2, FX-W1, FX-W2, FX-W4 and the re-alert. Those flags reproduce that closure exactly
  (1,722,894 states). With them, FXW-6-B at k=1,u=1 (1,255,219 states) and at k=2,u=1,l=1 (3,449,039 states) fails
  only EventuallyResolves F 9, which is the u artefact. NoFalseSuspicion holds in both.
- **Where the outputs are.** This file's own runs (these and the two FN-N2 runs of section 6) are in
  `build/units/S2.4/succ-runs/`. The flags were `--set FIX_ENDTURN_ALWAYS=1,FIX_ARM_FIRST=1,FIX_ALARM_MARKER=1,
  FIX_DEADMAN=1,CAND_REALERT=1`, and each run went through MAIN's lane.

## 3. Every other failing property

Classes: (b) a model artefact, (c) a gap already decided, (d) a fact for the pilot. None of these changes a decision.

| # | run (part) | property, F n | class and reason |
|---|---|---|---|
| 1 | FXW-4R-B x parts; R3 x parts | WakeSourceAlive F 1 (p0: the first turn dies before call 1); NoSilenceAfterFirstCall F 2 (p6: a crash after the ensure kills the alarm and leaves no marker) | (c) FX-W2's stated scope and the hard-kill branch, which FX-W4 covers (ABLATION-wake.md:46-47, 65; section 6 item 3; branches.md "two choices", R6). Same as R57's N1-FXW-4R |
| 2 | FXW-4R-B u parts | WakeSourceAlive and NoSilence F 9 (F 5 with l); EventuallyResolves F 9-11 | (c) hand-over exit 2 with no endturn (R57 section 6 item 2), which N2 closes (branches row 11; coordinator.md:165). (b) EventuallyResolves is the u artefact: the list's recovery is an environment step that is never forced (ABLATION-wake.md:55). With N2 (R3), only EventuallyResolves remains |
| 3 | FXW-4R-B cv and l parts | WakeSourceAlive and NoSilence F 16-19 | (b) This group has no N2, and MB:1015 ends a refused hand-over's turn with no endturn even under N2. The draining plan ends with the hand-over (MB:612). On build, the hand-over refuses with exit 6 and writes nothing except a refusal incident (handover.mjs:274, 287, 323-353, 393-402); the brief makes endturn every turn's last call (coordinator.md:163-166). With that line made to do what the code does (the variant), R3's cv and l parts hold |
| 4 | R3 k=2,l=1,u=1 | WakeSourceAlive F 23, NoSilence F 23 | (c) Under u, coord1's first endturn exits 2 and starts nothing (B2, coordinator.md:178). The alarm fires and its wake is lost, so there is silence until FX-W4's list window alerts the owner. Covered by branches row 3 (L1) and the B2 choice. It needs two faults, and liveness holds. B2 was chosen because R57's five parts showed no difference (AW:123); this silence does not change the choice, since B1 would start a second watcher while the first may still be alive (D1, SingleWatcher) |
| 5 | FXW-5-B whole | WakeSourceAlive F 4, NoDeadlock F 6, AlwaysCanResolve F 5, EventuallyResolves F 5 (= R57's FXW-5-3000) | (c) ABLATION-wake.md section 6 item 4: hand-over exit 2 under u, with no FX-W4 in this group ("not a wake-fix question"), plus N2 (row 11). Measured on its parts: k=2,u=1,l=1 reproduces all four (73,391 states). With N2 alone, AlwaysCanResolve F 9 remains (the act-due goes to `stuck` and this group has no dead-man). With N2 and FX-W1/W2/W4, only EventuallyResolves F 13 remains (the u artefact) |
| 6 | FXW-6-B whole (R1) | the same four, with byte-equal traces | (c) as row 5. With N2 and FX-W1/W2/W4, only the u artefact remains (section 2) |
| 7 | AGE-B whole, AGE-STUCK whole | EventuallyResolves F 5 | (c) the cycle of row 5: under u, a draining turn's hand-over exits 2 and the turn ends with no endturn, the alarm fires, and the cycle repeats |
| 8 | FN-N2-B k=1,u=1; R3 u parts | EventuallyResolves F 9 (k=2,r=1,u=1: F 10) | (b) the u artefact: three list failures, a dead-man ALERT, and again. The F 10 form is ABLATION-wake.md:140 |
| 9 | BQ5-SJ k=3,q=3; k=3,q=2,cd=1 | RefusedStartNotCharged F 26; F 20 | (c) branches thin item 1 and the End-list item: refused starts leave `start.json`, the lease runs out, and the third no-start fence is charged (lib.mjs:1863-1870, H_nostart 2). It takes three refused starts on one row, each a breach of coordinator.md:129-131 (or two and a crash before the claim). (d) Does the PreToolUse hook write `start.json` before the app refuses a start on a turn the owner did not type? BQ5-NOSJ, the other value, holds |
| 10 | BQ5-X k=1,q=1 | AlwaysCanResolve F 8, EventuallyResolves F 22 | the ablation, in which the owner never types. One cause: "start-session left due". S2.3's mismatch is the second form of that cause |
| 11 | FN-R5-B --weak-owner | EventuallyResolves F 22 | the ablation of strong fairness, as expected |
| 12 | LEASE-B (k=0, BOUNDED) | LeaseFenceClaimed F 6, NoChargeWithoutFault F 6, Slots F 21, FailedTaskStopped F 33 | (c) branches row 16. Under PROBE 5 reading (i) the start lease is set above both delays and this window cannot be reached (MAP-build, BLD_LEASE_WINDOW). Reading (ii) fails Slots and NoChargeWithoutFault (AF:141), and `--if-unclaimed` does not remove that (FF:1011-1017); also the End list's CLAIM window. FailedTaskStopped F 33 is a third failure of reading (ii) and strengthens row 16. (d) PROBE 5: the transcript lag after a start and the time to a child's first tool call, which the lease must exceed. LEASE-ORDER and LEASE-NOWIN (complete, 7,455,650 states) hold LeaseFenceClaimed; their Slots F 21, FailedTaskStopped F 33 and NoChargeWithoutFault F 24 belong to reading (ii). LEASE-X (F 7) is the ablation |
| 13 | IDGAP-W k=1,w=1 | Slots F 19, SlotsProc F 19, SlotsR10 F 18, AlwaysCanResolve F 18, EventuallyResolves F 25 | Fault w: the coordinator writes `closed` without the owner's words, a breach of coordinator.md:110-111. (c) departures/CLOSE.md item 1: the id gap stays open and every close goes through the relay. (d) The map from the app's `local_<uuid>` to the CLI id: measure it on one live session, then build it with a test. IDGAP-X holds every property (75,971 states). This run measures what the relay costs: one false relay frees a live session's slot |
| 14 | IDGAP-WZ k=2,z=1,w=1 | AlwaysCanResolve F 15, EventuallyResolves F 25 | as row 13, with w on a zombie. The close group has no FX-W5 `stuck` path (the R57 split) |
| 15 | CLOSE-APPROVAL-R5 k=0 | Slots F 16 | (b) The FN-R5 group has no FX-CLOSE. verifyFenced's VER = FX_CLOSE && FX_CGATE (MB:707) is off there, so a live interrupted session passes. On build, stop verify needs a counted close record for every nameable session (stop.mjs:538, lib.mjs:4222-4230). CLOSE-APPROVAL, which has FX-CLOSE and the same close facts, holds (1,725,799 states). (d) branches thin item 2: stop_session only interrupts; archive_session waits for approval |
| 16 | REDO-X k=2,x=1,g=1 | StartedLineRecorded F 6 | the ablation, as expected |

S2.3's mismatches, settled:
- **FXW-4R-B.** RUN-BUILD's 5 M states was R57's five parts; run-seq-build ran all 75 (98.7 M). Its cv, l and x
  failures are rows 1-3.
- **FXW-5-B.** RUN-BUILD stated no failing set. Its four failures are R57's FXW-5-3000 exactly (row 5).
- **FXW-6-B.** It is now complete (R1). RUN-BUILD's "EventuallyResolves F 10" is the length in the k=1,cs=1 part
  (RUN-BUILD.md:41). The whole run's trace has 5 steps, the same as R57's whole run.
- **BQ5-X.** See row 10.
- **FN-OUT-CLOSE-K2-B.** The part sizes were estimates, and a k=2 part includes its k=0 and k=1 states. Its one
  BOUNDED part is now complete (R2).

## 4. Vacuity: for each property that holds, the run that fails it without its mechanism

| property | ablation run that fails it |
|---|---|
| NoStaleAccepted | A-FENCE-EPOCH F 8 |
| AtMostOneCommit; CommitRecordStable | A-WX+RECONCILE F 6; D7-COMMIT-NOFENCE F 13 |
| Slots; SlotsProc, SlotsR10 | A-RECONCILE F 3 (here also CLOSE-APPROVAL-R5 F 16, IDGAP-W F 19, LEASE-* F 21); D7-SLOTS F 7 |
| RestartLimit; RestartLimitGhost | A-RESTART-LIMIT F 16; D7-RESTART F 17 |
| TwoCoordinatorsAct; StaleWrites | A-FENCE-CE F 2; D7-STALE F 4, FX-CGATE-X F 7 |
| SingleWatcher | A-WATCHER-LOCK F 6 |
| FailedTaskStopped | A-STOP-LIMIT F 16 (here also LEASE-* F 33) |
| OneSessionPerAttempt | A-RECONCILE F 3 |
| ReadyNotDiscarded | A-READY F 6 |
| NoFalseSuspicion (holds in FXW-6-B complete, R1) | X-PAUSE-DISCOUNT F 6, FXW-6-X F 6 |
| OneWriterPerAttempt | FX-CGATE-X F 10 |
| NoChargeWithoutFault | FX-CLAIM-II F 8 (here also LEASE-B F 6) |
| WakeChainBounded; AlarmsBounded | AB-WAKE-ALL F 9; F 8 |
| WakeSourceAlive, NoSilenceAfterFirstCall (hold in parts without x, except l+u) | FXW-4R-X2 F 1 (they also fail here at p0, p6) |
| NoDeadlock, AlwaysCanResolve (all 75 R3 parts) | X-ARM-AT-START F 2, FXW-4-X F 2, BQ5-X F 8 |
| NoBusyLoop | X-ARM-BY-WRITE F 5 |
| EventuallyResolves | AB-W-ACT-DUE F 13, FN-R5-B --weak-owner F 22 |
| RefusedStartNotCharged | BQ5-SJ F 26 (holds in BQ5-NOSJ) |
| LeaseFenceClaimed | LEASE-X F 7 (holds in LEASE-ORDER and LEASE-NOWIN) |
| StartedLineRecorded | REDO-X F 6 (holds in REDO-B) |
| AgeCapReachesOwner | fails as built (AGE-B F 16) and holds in AGE-STUCK |

The A-*, X-* and D7-* runs are R57's (`model/results`, `results-as-built`), on `model.mjs` rather than
`model-build.mjs`; the property code is the same in both.

Two mechanisms have the opposite status: no property rests on them. Verify by records and the id gap each have an
ablation, CLOSE-NOREC and IDGAP-X, that holds every property at k=1,cd=1. They are modelled for fidelity, and they
cost liveness: 17 times the states, and every close goes through the owner.

## 5. What the check does not cover

- **Joint groups.**
  - FX-CLAIM (FN-R5-B) never runs together with FX-CLOSE and FX-OUT (FN-OUT-CLOSE-K2-B).
  - FX-W5 and FX-W6 run with FX-W1/W2/W4 and N2 only in a few parts on the variant: FX-W5 at k=1,u=1, k=2,u=1,l=1
    and k=2,u=1,x=1; FX-W6 at k=1,u=1 and k=2,u=1,l=1. FXW-ALL was BOUNDED in R57.
  - The age cap runs only on FXW-5's flags, without FX-W6's deadlines and without the wake fixes.
- **The wake group with N2 at k=2 runs on the variant only (R3).** On S2.2's model, the MB:1015 artefact stays
  until the line is taken (section 6).
- **BOUNDED runs:** LEASE-B and LEASE-X, whole at k=0 (reading ii). Both found failures. R1 and R2 are now complete.
- **Sizes.** At most two faults (three only in BQ5 and REDO-B), two fields (one in LEASE), and R = 1. Not checked:
  the lease at two fields, m with three faults, and g with cd, z or t at three faults.
- **S2.2's departures.**
  - FX-W3 and FX-W7 are not modelled (the dead-man's unarmed and busy causes).
  - The owner is a premise and is strongly fair.
  - Facts that are not recorded are run both ways.
  - W6 item 6 and REDO are modelled in their smallest form.
  - FXW-4R-B has no N2.
- **Fidelity notes.**
  - In the wake group, a successful hand-over kills the old ce's watcher and alarm (AB_HANDOVER_NOKILL is off there).
    On build, handover.mjs:290-297 only reports them and never touches them. Not measured.
  - After a successful raise, the model ends the old turn with no endturn (MB:1025). On build, that endturn exits 64
    `stale-ce` at its first check (status.mjs:1115; lib.mjs:1565). The two agree.
- **Pilot facts (d).**
  - Whether a refused start leaves `start.json` (row 9).
  - PROBE 5's two delays (row 12).
  - The `local_<uuid>` to CLI id map (row 13).
  - What stop_session and archive_session do (row 15).
  - B1's kind deadlines, `idle_ticks` and `attempt_max_ticks`, which are marked guesses (branches row 5).

## 6. The S2.4 variant (units/S2.4/variant/, model-build.mjs line 1015): S2.2's model should take that line

**The change.** S2.2's MB:1015 ends the turn with no endturn (`c.pc = null`) when the hand-over is refused, either
because the run is not draining or because it is not quiescent, even under FIX_ENDTURN_ALWAYS. The variant sends that
turn to endturn under FIX_ENDTURN_ALWAYS, which is what MB:1014 already does for exit 2.

**Why: the code on build does what the variant does.**
- handover.mjs refuses with exit 6 in four places: `no-drain` at 274 and 323, and `not-quiescent` at 287 and 337;
  the last two return at 353. Each refusal comes before the raise (the `ce-raise` line at 349) and records only a
  `refusal` incident (393-402, 339-344).
- The watcher raises only tamper incidents (watch.mjs:663), so the refusal brings no wake.
- The turn goes on, and coordinator.md:163-166 makes endturn its last call.

**Measured.**
- The line acts only where FIX_ENDTURN_ALWAYS is on, which is FN-N2 (configs.mjs:154) and FN-N2-B
  (configs-build.mjs:28).
- R57's FN-N2 regression at k=1,u=1 is unchanged on the variant: 363,706 states, EventuallyResolves F 9, and a trace
  byte-equal to `results-as-built/final/N2-FN-N2.json`. So the rule that the final pass reproduces with every S2.2
  flag off still holds.
- FN-N2-B at k=1,u=1 goes from 623,250 states to 619,856, with the same failing property and a byte-equal trace.
- At k=2 (R3), the line removes the false WakeSourceAlive F 19 and NoSilenceAfterFirstCall F 19 at k=2,l=2 (132,782
  states on S2.2's model) and adds no failure outside the decided gaps.

**If S2.2's model takes the line:**
- R3 becomes FN-N2-B's k=2 result (its file already carries the variant's hash).
- RUN-BUILD's FN-N2-B row becomes 619,856 states.
- The label should cite handover.mjs:274, 287 and 353 and coordinator.md:163-166 instead of "S2.4 variant".
