# MAP-build: the model as built, flag by flag (S2.2, task r57-0507 slice 2)

Final, S2.2 (the builder and successors 1 and 2), 2026-11-20. Model lines are `model-build.mjs` (MB) and `check-build.mjs` (CB) at the
commit this file lands with; code lines are on `build` (48811a8f) unless marked. Every flag defaults to off, so every
R57 id keeps its states and verdicts (RUN-BUILD.md section 1). The state bytes of the new fields are encoded only
when a `BQ5_*` or `BLD_*` flag is on (`BX`, MB:45).

## 1. Flags and mechanisms

| Flag / mechanism | Model lines | Code on `build` | Source | Oracle kept, and why |
|---|---|---|---|---|
| `BQ5_OWNER_TURN`: a start only on a turn the owner typed; `om` (owner message waiting) and `ot` (this turn owner-typed) per coordinator | flag MB:211; gate MB:925-933; turn start sets `ot` from `om` (`cc.ot`, the coordinator turn step); `om` set at boot, successor, owner wake, dead-man alert, owner `closed` | `tcb/briefs/coordinator.md:129-131` (do not call the tool, leave it due) | branches.md row 1 (Q5a, the app's rule) | the owner's typing is a premise (branches row 1: "liveness rests on the owner typing"), not code |
| owner types (process OT = 29, **strongly fair**) | MB:1466-1471 (step), MB:1337 (`PROC.OT`); CB:259-292 (Emerson-Lei refinement; `--weak-owner` is the ablation) | none: a person | branches row 1; FIDELITY-3.md:641-642 (the owner answers) | strong, not weak: the watcher's wake cycle leaves the coordinator idle only between turns, and the owner types at one of those idle points (weak fairness lets the cycle starve him: RUN-BUILD 3, `--weak-owner`) |
| under a drain the owner still answers an admitted row's start | MB:1466-1468 | `lib.mjs:4103-4104` (only replace-fence and replace-start wait while blocked), `lib.mjs:4121-4127` (admitted: start-session, no drain test); `admit.mjs:260-262` (the drain refuses admission) | found by this unit (the first draft's `!c.dr` deadlocked FN-R5-B) | none |
| fault q, `BQ5_REFUSED_SJ`: a start called on a turn the app refuses; the hook may have run first and left `start.json` | MB:927-932; ghost `t.rq`; property RefusedStartNotCharged MB:822 | the no-start fence `lib.mjs:1863-1870` (uncharged while nostart < H_nostart = 2) | refute/S0.3.md:58; branches thin item 1 (unrecorded: both values are configurations) | which value holds is not recorded: BQ5-SJ and BQ5-NOSJ |
| `BQ5_NO_OWNER` (ablation) | MB:1465 | | | |
| `BLD_IF_UNCLAIMED`: the lease act's `--if-unclaimed` | MB:774 | `replace.mjs:438` (`fenceIfUnclaimed`, first in the hold), `replace.mjs:543-547`; planner `lib.mjs:4125` | departures/CLAIM.md 1; refute/CLAIM.md:48 | none |
| `BLD_LEASE_WINDOW`: a claim lands after the check and before the tombstone | MB:776-784 (the window re-runs the fence with `op[4] = 1`) | `replace.mjs:438-440` (check, then OUT's steps, then `fenceTombstone`) | refute/CLAIM.md:48-52 | reached only under lease reading (ii) (`FX_LEASE_NOBOUND`): under reading (i) the lease waits for every live unclaimed session (MB tick block "FX-CLAIM lease") |
| `BLD_LEASE_ORDER`: refusals, tombstone, slot (the tombstone create meets the claim) | MB:781 | not built (a proposal: refute/CLAIM.md:52) | | |
| property LeaseFenceClaimed (`BLD_PROPS`) | MB:821 | | the window's cost | |
| `BLD_CLOSE_IDGAP`: no close record counts (written under the app's id); the owner's relayed `closed` is the only count | coordinator closes set no `dn` (MB:729-734, 847-858, the tombstone stop); owner act `closed` MB:1475-1482; fault w MB:1482 | departures/CLOSE.md:10-23; units/CLOSE/result.md:76; the owner act `status.mjs owner --act closed` (`tcb/briefs/coordinator.md:110`) | brief point 3 | the relay is merged with the owner's act (the premise of a true relay); fault w breaks it |
| owner `closed` eligibility: a record the verify needs at verify_rounds >= 1 (`needsRecord`, MB:504), or an uncounted orphan (`orphanUncounted`, MB:508-513) | MB:508-513, 1431 | `lib.mjs:4152-4165` (`orphanAct`: a step-7 session with an uncounted done -> `owner`) | found by this unit: without it a dead folder session of a tombstoned attempt held its slot for good (FN-R5-B k=1,cd=1) | |
| `BLD_VERIFY_RECORDS`: verify needs a counted record for every nameable session, dead ones too | `verifyFenced` MB:705-718 (`s.al || BLD_VERIFY_RECORDS`); the commit verify (OP.SV); `ownerRow` MB:515-521; `needsRecord` | stop verify by close records (`stop.mjs:538`, `lib.mjs:4222-4230`) | FIDELITY-3.md section 2 (verify read true state) | none |
| a dead nameable session's stop: "no such session", recorded by the hook (counted only without the id gap) | MB:725-730 (fenced stop), MB:729 (commit close `closeCommitted`) | FX-CGATE step 6(b) (FIX-fence.md) | found by this unit: without it IDGAP-X never confirmed a crashed child's stop | |
| the owner rule reads `closesMissing` only at stop-requested; `verify_rounds` is reset only by a fence | `ownerRow` MB:518-520 | `lib.mjs:4097`, `lib.mjs:4222` (closesMissing only for stop-requested), `lib.mjs:1906` (reset at the fence) | found by this unit: a stale count of 3 from the earlier attempt's stop made the committed row wait for an owner act that had nothing to close | |
| `BLD_STOP_INTERRUPT_ONLY` + `BLD_ARCHIVE_APPROVAL`: the close leaves the session alive (stop interrupts, the archive waits for an approval not given) | MB:734, 847 ("close deferred" branch) | the stop tool names (branches thin item 2; refute/S0.3.md row 1 (d)) | brief point 3, unrecorded facts | both values: the `-B` configurations take the first, CLOSE-APPROVAL* the second |
| `BLD_AGE_CAP`: W6 item 6, FX-W6 step 5's act-due `age-cap` as built. Fault m (mode IMIT, MB:24, 32): a child at bound imitates activity, so no detector fires (its records read as a move, MB:1265) and no READY comes. Per field `ag`: 0 armed, 1 raised (due), 2 read by a turn, 3 acknowledged; since the FX-W6 fix round an acknowledgement does not re-arm it: FX-W5 raises it again (the owner-leg row below) | flag MB:236; fault MB:1409-1411; the cap MB:1310-1323; read MB:1121, 1542; acknowledged MB:692; due MB:1324 | `watch.mjs:339` (age_ticks counts at bound), `watch.mjs:1177-1205` on u/W6 (age_ticks − age_base ≥ attempt_max_ticks; no script sets age_base, so an acknowledged cap stays present; the re-arm of build d655547f, its watch.mjs:1198-1204, is deleted), `watch.mjs:1238-1267` (FX-W5's re-raise and `stuck` over the present set, the cap among them) | refute/W4.md:100-125; brief point 3 | none: the cap is one tick (untimed), and only an imitating child reaches it (the premise that attempt_max_ticks is above any healthy attempt) |
| property AgeCapReachesOwner (with `BLD_AGE_CAP`): no fair cycle in which a field keeps an imitating child and has not reached the owner (`ax` = 0) | `imitating`, `waitsOwner` MB:313-315; CB:123 (region bits 5-7); CB:261-299 (`fairCycle`: the EventuallyResolves search with another region) | | brief point 3 ("an attempt whose coordinator only acknowledges reaches the owner") | |
| The owner leg, part of `BLD_AGE_CAP` since the FX-W6 fix round (before it the design leg `BLD_AGE_STUCK`, then not built), and `AGE_STUCK` = 2: FX-W5 raises the acknowledged cap again (`ac` counts the raises), after AGE_STUCK raises it is in watcher.json `stuck` (`ax`); the dead-man's alert merged with the owner's answer: he ends the imitating session and types to the coordinator. `AB_AGE_REARM` (ablation, off by default; configuration AGE-REARM): the re-arm the round deleted, the tick after the acknowledgement clears the cap (`ag`, `ac`, `ax` 0) | flags MB:236-241; MB:1318-1320; owner MB:1483-1490 | `watch.mjs:1225-1267` on u/W6 (reraiseStuck, stuckCount: 6 raises at the capped interval), `status.mjs:956, 992` (the dead-man's `stuck` cause) | FIX-wake.md's B5.2 row (the second leg); refute/W4.md:116-117 | the alert and the answer are one owner step (a delivered toast and an owner who answers); his other answers (drop, resume) are not modelled |
| `BLD_REDO`: fault g, a reconcile dies after a row's `started` write and before its `started` line (ghost `sl`); FX-REDO at every later reconcile that completes; property StartedLineRecorded (no row leaves started with its line missing) | flag MB:242; `reconcile(n, P, die)` MB:458-477; `redoDeaths` MB:478-487; the turn start MB:1559-1567; OP.RC MB:1118; invariant MB:1630; CB:100 | `status.mjs:341-353` (updateRow, then appendLedger), `status.mjs:370-391` (reconcileRedo: only rows active at started) | refute/W4.md:126-137; brief point 3 | a status run that dies writes no status.json: the turn acts on nothing and goes to endturn, its last call after any failed call (`tcb/briefs/coordinator.md:172-180`, built), whatever FIX_ENDTURN_ALWAYS says |
| `BLD_REDO_OFF` (ablation: no FX-REDO) | MB:476 | | | |
| check-build `--set F=v` | CB:32-35 | | diagnosis and ablations (model-build.test.mjs) | |

## 2. Fixed choices where the code settles it

- FX-CLAIM step 7 counts a visible folder session with no counted record, alive or dead, and a tombstone's stop closes
  every folder session first: `FX_R5_DEADCOUNT` and `FX_R5_ORPHAN` are on in every fence-group `-B` configuration
  (the final pass's FN-R5 readings).
- W4 item 6, re-alert period 6 (the code) against the model's 2: dead-man steps are untimed and weakly fair, so the
  period changes no verdict; the model keeps 2 (checkpoint 1, decided by the first helper).

- W4 item 2 (a run whose alarm records are absent, of another ce, corrupt or marked counts with the process list
  down): the model's dead-man does not count such a run, so it alerts later or not at all: pessimistic for liveness
  (a liveness verdict that holds carries over), no effect on safety (the dead-man only alerts).
- W4 item 4 (the dead-man's counts restart at a new ce): a later alert in an untimed, weakly fair model changes no verdict.
- PLAN item 4 (close-session's place in the first match): the orphan's close is merged into the tombstone stop
  (`FX_R5_ORPHAN`, MB tombstone block of OP.S) and its `owner` fallback into `orphanUncounted`; revocations, bind and
  commit are not held up by it in the model either.
- PLAN item 7 (the watcher's zombieOver is a sum; the torn-fence retry and the lease act wait for no slot): the
  model's fence op checks no slot, and an owner row gets no coordinator act (`ownerRow` in the plan).

## 3. Not modelled (say why in departures/S2.2.md)

FX-W3 and FX-W7 are in no model (branches.md thin item 6). W1 item 9 (a corrupt `alarm.json` is the anomaly
`state-corrupt` and a dead source, not exit 67) is already the model's FX-W1 reading: with `FIX_ALARM_MARKER` (on in
FXW-4R and so in FXW-4R-B) fault y's unreadable file counts as a dead source and is re-armed (MB endturn block, the
`n.cj` tests at about MB:1071 and MB:1535-1539); the exit-67 path (about MB:1086) is the pre-FX-W1 one.

**What the smallest forms of W6 item 6 and REDO leave out.**
- W6 item 6: the 240 counted ticks (one tick reaches the cap; age_base stays 0 since the fix round); a cap
  reached by a healthy attempt (excluded by the premise above); idle-child, FX-W6 step 4 (its condition holds until
  the child moves, so FX-W5's `stuck` path reaches the owner: refute/W4.md:121); a coordinator that answers the cap by
  stopping the attempt (the brief's place 7b since the fix round; the model's coordinator only acknowledges); FX-W5's
  re-raise interval (untimed, as in FXW-5); the
  dead-man as its own process (FX-W4 is not in the FXW-5 group: its alert is merged with the owner's answer).
- REDO: the start death through the seam (`replace start` writes the row and its admit line in one hold,
  replace.mjs:994-1007; refute/W4.md:128-130), the `admit` and `stop-request` lines, fsck (it warns only at the current
  step: the property is the record gap itself) and render (the only reader of the line).
- What REDO's result means: REDO-B holds at k=3,x=1,g=2. Every act follows, in its own turn, a reconcile that
  completed, and that reconcile's FX-REDO writes the line first. The corner of refute/W4.md:135-137 (a row committed at
  started with its line lost) needs an act after a failed reconcile, which the brief forbids (places 8 and 9: retry
  nothing, then endturn). Without FX-REDO (REDO-X) the bind moves the row with the line missing.

## 4. Disagreements with the round's own files (listed, not edited there)

- FIDELITY-3.md:643 says the owner's other acts stay on the never-forced environment line. Under the Q5 rule a start
  needs the owner, so the owner's typing is a fair process here (strongly fair, section 1).
- RUN-BUILD's lease runs need reading (ii); the R57 round ran reading (ii) only as FX-CLAIM-II (BOUNDED at 400 MB,
  ABLATION-fence.md:71), and its Slots and NoChargeWithoutFault failures recur in every lease variant.
- FIX-JOIN 2b row 8 (FIX-JOIN.md:337) says "End the turn; retry nothing" for any exit 75 (`refute/S2.1.md:108`). The
  built brief says: retry nothing, then endturn, and end the turn only when endturn itself exits 75
  (`tcb/briefs/coordinator.md:172-175`; N2, branches row 11). The model follows the brief where N2 is on: OP.RC's 75 and
  67 go to endturn under FIX_ENDTURN_ALWAYS (MB:1116-1125; FN-N2-B), and so does a refused hand-over, exit 6
  (MB:1015; handover.mjs:274, 287, 353; S2.4 VERDICT section 6). The turn-start path without FX-W2 ends the turn
  (row 8's reading, the R57 model), and no configuration with N2 takes it. Fault g goes to endturn in every
  configuration. FXW-4R-B keeps the R57 id's flags without N2; FN-N2-B is the one with N2, as built.
- AgeCapReachesOwner failed by construction in AGE-B before the FX-W6 fix round (refute/W4.md:116-117; S2.4 VERDICT
  section 1). Since the round AGE-B models the fixed code and holds it; AGE-STUCK has AGE-B's flags and explores the
  same states; the ablation AGE-REARM (the deleted re-arm) fails it, so the check is not vacuous.
