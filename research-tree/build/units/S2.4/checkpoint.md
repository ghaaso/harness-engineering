# S2.4 checkpoint (analyse: S2.4 model verdict), 2026-11-20, written before the reruns

State: every failing property of S2.3's 28 runs is classified below; three reruns are pending (`reruns.md` here,
R1-R3). Tokens at this point: about 17 M of the 18.6 M limit, context about 300 K. To finish: read the three rerun
outputs under `MAIN/research-tree/model/results-build/rerun/` (scratch helpers `summ.js`, `tr.js` in
`.../scratchpad/S2.4-analyse/`: `node summ.js <file>`, `node tr.js <file> <part|-> <Prop> 300`), classify any failure
beyond the expected ones, then write `MAIN/research-tree/model/results-build/VERDICT.md` from sections 1-5 (first line
section 1), and return in at most 8 lines. MB = `model-build.mjs`, code lines on `build` e5c9c4f8 (`.../projects/hb`).

## 1. Planned first line

`SEND BACK: FX-W6: AgeCapReachesOwner (AGE-B)` (one line; add a line only if R1-R3 show a fault of the code).

## 2. The send-back, (a): FX-W6, W6 item 6

Runs: AGE-B whole (k=1) AgeCapReachesOwner F 16, AlwaysCanResolve F 3; AGE-B k=2,m=1,o=1 AgeCapReachesOwner F 16,
EventuallyResolves F 16 (same cycle). The trace against the code:
- 0: an owner-typed first turn admits, starts and binds f0, f1 (coordinator.md:120-138; the start tool).
- 1: fault m, f0e1 imitates: new records reset hang_ticks (watch.mjs:337 `moved`), calls vary (no loop), the kind is
  not idle: no detector fires and no READY comes.
- 3, 8, 11: endturn acknowledges the seq read at turn start (coordinator.md:163-176).
- 6: a counted tick at bound adds to age_ticks (watch.mjs:339); age_ticks - age_base >= attempt_max_ticks pushes the
  act-due `age-cap` (watch.mjs:1205-1206): an event line, the watcher exits 10 and wakes the coordinator.
- 10: the turn reads it; the brief has no line for age-cap or idle-child (no match in tcb/briefs/coordinator.md;
  departures/W6.md), so it plans nothing and acknowledges at endturn (place 9).
- 12: the next tick finds the key's line at or below acked_seq and sets age_base = age_ticks (watch.mjs:1199-1203);
  the condition is not pushed (1205), the ident leaves the present set, and reraiseStuck (watch.mjs:1252-1271)
  rebuilds `reraise` and `stuck` from the present set only: the raise count restarts at 0 and never reaches
  stuck_raises. The dead-man's only cause for this is watcher.json `stuck` (status.mjs:70, 956, 992): no alert.
- 15: attempt_max_ticks later the cap is raised again: the cycle. The owner is never told; the attempt never ends.
Smallest change: stop re-arming on a bare acknowledgement (remove the age_base = age_ticks of watch.mjs:1199-1204),
so the condition stays present and FX-W5 re-raises it and counts it to `stuck` (watch.mjs:1252-1271), which FX-W4
alerts (status.mjs:956, 992); re-arm only on an explicit continue (the owner's answer: a new act); add the brief line
for age-cap and idle-child (refute/W4.md:119-125). AGE-STUCK (that design leg) holds AgeCapReachesOwner and
AlwaysCanResolve (whole 476,122 states; k=2,m=1,o=1 162,074, every property holds). End list (STATE.md, combined
review): "S2.4 sends it back if the owner is never reached" — he is not.

## 3. The other failures: (b) artefact, (c) decided, (d) pilot fact

1. FXW-4R-B (75 parts, the R57 flags without N2). Liveness (NoDeadlock, AlwaysCanResolve) holds in all 75.
   - x parts: WakeSourceAlive F 1 (p0: the first turn dies before call 1), NoSilenceAfterFirstCall F 2 (p6: a crash
     after the ensure kills the alarm, no marker). (c): FX-W2's stated scope and the hard-kill branch, FX-W4 covers
     (ABLATION-wake.md:46-47, 65; section 6 item 3; branches.md "two choices", R6). Same as R57's N1-FXW-4R.
   - u parts: WakeSourceAlive and NoSilence F 9 (F 5 with l), EventuallyResolves F 9-11: (c) the hand-over exit 2
     with no endturn (R57 section 6 item 2), closed by N2 (branches row 11; coordinator.md:165), and (b) the u
     artefact for EventuallyResolves (the list's recovery is an unforced environment step; ABLATION-wake.md:55).
   - cv and l parts: WakeSourceAlive and NoSilence F 16-19. (b): MB:612 ends a draining plan with handover, not
     endturn, and MB:1015 ends the turn with no endturn when the hand-over is not quiescent, even under
     FIX_ENDTURN_ALWAYS. Code: handover.mjs:286-287 refuses with exit 6 `not-quiescent` before touching anything;
     coordinator.md:163-166 makes endturn every turn's last call. Measured (variant = MB:1015 goes to endturn under
     N2; `units/S2.4/variant/`): FN-N2-B unchanged k=2,l=2 WakeSourceAlive F 19; variant k=2,l=2 holds (132,252),
     k=2,cv=2 holds (3,339,359), k=2,u=2 only EventuallyResolves F 9, k=2,x=2 only p0/p6, k=2,cv=1,o=1 holds,
     k=2,l=1,u=1 WakeSourceAlive and NoSilence F 23 plus EventuallyResolves F 9.
   - That F 23: coord1's first endturn under u exits 2 (no source dead, one unknown) and starts nothing (B2), the
     alarm fires, its wake is lost: silence until FX-W4's list window alerts. (c): branches row 3 (L1: "a dead
     watcher waits for the list, and FX-W4's list window alerts the owner"; F schedule 6 open by design) and the B2
     choice ("start nothing when liveness is unknown"). It needs two faults (u, l); liveness holds. The B2 choice's
     ground "the model's complete parts show no difference" (AW:123) was R57's five parts; this is a silence of B2 at
     u+l, which does not change the choice (B1 would start a second watcher while the first may live: D1, SingleWatcher).
2. FXW-5-B: WakeSourceAlive F 4, NoDeadlock F 6, AlwaysCanResolve F 5, EventuallyResolves F 5 = R57's FXW-5-3000
   exactly (S2.3 had not read it: a match). (c): ABLATION-wake.md section 6 item 4 (hand-over exit 2 under u, no
   FX-W4 in that group: "not a wake-fix question") and N2 (row 11). Measured on its parts (S2.4, complete):
   k=2,u=1,l=1 reproduces all four (73,391); with FIX_ENDTURN_ALWAYS WakeSourceAlive and NoDeadlock hold,
   AlwaysCanResolve F 9 stays (the act-due goes `stuck`, no dead-man in the group); with N2 + FX-W1/W2/W4 (re-alert)
   only EventuallyResolves F 13 (the u artefact: every turn "no process list -> slots-unknown"); k=2,u=1,x=1 the
   same plus WakeSourceAlive F 1 (p0); k=1,u=1 only EventuallyResolves F 13.
3. FXW-6-B: WakeSourceAlive F 4, BOUNDED (R1 pending): the same trace as FXW-5-B's.
4. AGE-B and AGE-STUCK EventuallyResolves F 5: the FXW-5-B group's hand-over exit-2 path under u (same trace): as 2.
5. FN-N2-B EventuallyResolves F 9: (b) the u artefact (cycle: list failures 3, dead-man ALERT, again).
6. BQ5-SJ RefusedStartNotCharged F 26 (q=3) and F 20 (q=2,cd=1): (c) branches thin item 1 and the End list item
   (refused starts leave start.json, the lease runs out, the third no-start fence is charged: lib.mjs:1863-1870,
   H_nostart 2) and (d) the pilot fact: does the PreToolUse hook write start.json before the app refuses a start on
   a turn the owner did not type. Needs three refused starts on one row, each a breach of coordinator.md:129-131
   (or two and a crash before the claim); BQ5-NOSJ (the other value) holds. Decision unchanged.
7. BQ5-X (ablation, the owner never types): AlwaysCanResolve F 8 and EventuallyResolves F 22 (cycle: "start-session
   left due: the owner did not type this turn"): one cause; S2.3's mismatch is its second face.
8. FN-R5-B --weak-owner: EventuallyResolves F 22, the ablation of strong fairness, as expected.
9. LEASE-B: LeaseFenceClaimed F 6 and NoChargeWithoutFault F 6 (the window: `--if-unclaimed` passes, the child's
   first call claims inside the hold, FENCE e1 -> e2 restarts=1; replace.mjs:438-440), Slots F 21, FailedTaskStopped
   F 33. (c): branches row 16 (PROBE 5 reading (i): the start lease above both delays; reading (ii) fails Slots and
   NoChargeWithoutFault, AF:141, and `--if-unclaimed` does not remove that, FF:1011-1017) and the End list's CLAIM
   window; (d) PROBE 5: transcript lag after a start and time to a child's first tool call, which the lease must
   exceed. Under (i) the window cannot be reached (MAP-build, BLD_LEASE_WINDOW row). LEASE-ORDER (refusals,
   tombstone, slot) and LEASE-NOWIN hold LeaseFenceClaimed, complete (7,455,650); LEASE-X fails it F 7.
   FailedTaskStopped F 33 is a third reading-(ii) failure (leases expire on live slow sessions until the LIMIT path
   fails the task while they live): it strengthens row 16. LEASE-ORDER, -NOWIN: Slots F 21, FailedTaskStopped F 33,
   NoChargeWithoutFault F 24, reading (ii)'s own. LEASE-X: the ablation.
10. IDGAP-W (k=1,w=1): Slots F 19, SlotsProc F 19, SlotsR10 F 18, AlwaysCanResolve F 18, EventuallyResolves F 25.
    Fault w = the coordinator writes `closed` without the owner's words, a breach of coordinator.md:110-111. (c):
    departures/CLOSE.md item 1 (the id gap stays open; every close goes through the relay); (d): the map from the
    app's `local_<uuid>` to the CLI id, measured on one live session, then built with a test. IDGAP-X (no id gap)
    holds every property (75,971). Decision unchanged; the run measures the relay's cost: one false relay frees a
    live session's slot (a hallucination becomes a Slots breach).
11. IDGAP-WZ: AlwaysCanResolve F 15, EventuallyResolves F 25: w on a zombie, as 10, and the close group has no FX-W5
    `stuck` path (the R57 split).
12. CLOSE-APPROVAL-R5 Slots F 16: (b) the FN-R5 group has no FX-CLOSE: verifyFenced's VER = FX_CLOSE && FX_CGATE
    (MB:707) is off, so a live interrupted session passes; on build stop verify needs a counted close record for
    every nameable session (stop.mjs:538, lib.mjs:4222-4230); CLOSE-APPROVAL (FX-CLOSE, the same close facts) holds
    (1,725,799). (d): branches thin item 2 (stop_session interrupts only; archive_session waits for approval).
13. REDO-X StartedLineRecorded F 6: the ablation, as expected.
S2.3's other mismatches: FXW-4R-B's states (98.7 M against 5 M) and FN-OUT-CLOSE-K2-B's part sizes are estimates
only (RUN-BUILD's 5 M was R57's five parts; run-seq-build ran all 75 parts); a k=2 part includes its k=0 and k=1 states.

## 4. Vacuity: the run that fails each property that holds

NoStaleAccepted A-FENCE-EPOCH F 8; AtMostOneCommit A-WX+RECONCILE F 6 (CommitRecordStable D7-COMMIT-NOFENCE F 13);
Slots A-RECONCILE F 3 and here CLOSE-APPROVAL-R5 F 16, IDGAP-W F 19, LEASE-* F 21 (SlotsProc, SlotsR10 D7-SLOTS F 7);
RestartLimit A-RESTART-LIMIT F 16 (RestartLimitGhost D7-RESTART F 17); TwoCoordinatorsAct A-FENCE-CE F 2 (StaleWrites
D7-STALE F 4, FX-CGATE-X F 7); SingleWatcher A-WATCHER-LOCK F 6; FailedTaskStopped A-STOP-LIMIT F 16 and LEASE-* F 33;
OneSessionPerAttempt A-RECONCILE F 3; ReadyNotDiscarded A-READY F 6; NoFalseSuspicion X-PAUSE-DISCOUNT F 6, FXW-6-X
F 6; OneWriterPerAttempt FX-CGATE-X F 10; NoChargeWithoutFault FX-CLAIM-II F 8, LEASE-B F 6; WakeChainBounded,
AlarmsBounded AB-WAKE-ALL F 9, F 8; WakeSourceAlive, NoSilenceAfterFirstCall fail here (p0), FXW-4R-X2 F 1;
NoDeadlock, AlwaysCanResolve X-ARM-AT-START F 2, FXW-4-X F 2, BQ5-X F 8; NoBusyLoop X-ARM-BY-WRITE F 5;
EventuallyResolves AB-W-ACT-DUE F 13, FN-R5-B --weak-owner F 22; RefusedStartNotCharged BQ5-SJ F 26 (holds in
BQ5-NOSJ); LeaseFenceClaimed LEASE-X F 7 (holds in LEASE-ORDER, -NOWIN); StartedLineRecorded REDO-X F 6 (holds in
REDO-B); AgeCapReachesOwner fails as built, holds in AGE-STUCK. The A-*, X-*, D7-* runs are R57's (model/results and
results-as-built), on model.mjs, not model-build.mjs; the property code is the same. Verify by records and the id
gap: their ablations (CLOSE-NOREC, IDGAP-X) hold every property at k=1,cd=1, so no property rests on them there:
they are modelled for fidelity (they cost liveness: 17 times the states, every close through the owner).

## 5. What the check does not cover

- Joint groups: no run has FX-CLAIM (FN-R5-B) with FX-CLOSE and FX-OUT (FN-OUT-CLOSE-K2-B), nor FX-W5 or FX-W6 with
  FX-W1/W2/W4 and N2 (the R57 split; FXW-ALL was BOUNDED). The wake group with N2 at k=2 only by the variant (R3).
- BOUNDED: FXW-6-B (R1), FN-OUT-CLOSE-K2-B k=2,cv=1,r=1 (R2), LEASE-B and LEASE-X (reading (ii); failures found).
- Sizes: two faults (three only in BQ5 and REDO-B), two fields (one in LEASE), R = 1; the lease at two fields; m with
  three faults; g with cd, z, t at three faults.
- S2.2's departures: FX-W3 and FX-W7 not modelled (the dead-man's unarmed and busy causes); the owner a premise,
  strongly fair; unrecorded facts run both ways; W6 item 6 and REDO in smallest form; FXW-4R-B without N2.
- Fidelity notes found here: MB:1015 (above); in the wake group a successful hand-over kills the old ce's watcher and
  alarm (AB_HANDOVER_NOKILL off there) while handover.mjs:290-297 reports them and never touches them.
