# MAP-build: the model as built, flag by flag (S2.2, task r57-0507 slice 2)

Draft by S2.2 successor 1, 2026-11-20. Model lines are `model-build.mjs` (MB) and `check-build.mjs` (CB) at the
commit this file lands with; code lines are on `build` (48811a8f) unless marked. Every flag defaults to off, so every
R57 id keeps its states and verdicts (RUN-BUILD.md section 1). The state bytes of the new fields are encoded only
when a `BQ5_*` or `BLD_*` flag is on (`BX`, MB:45).

## 1. Flags and mechanisms

| Flag / mechanism | Model lines | Code on `build` | Source | Oracle kept, and why |
|---|---|---|---|---|
| `BQ5_OWNER_TURN`: a start only on a turn the owner typed; `om` (owner message waiting) and `ot` (this turn owner-typed) per coordinator | flag MB:211; gate MB:897-905; turn start sets `ot` from `om` (`cc.ot`, the coordinator turn step); `om` set at boot, successor, owner wake, dead-man alert, owner `closed` | `tcb/briefs/coordinator.md:129-131` (do not call the tool, leave it due) | branches.md row 1 (Q5a, the app's rule) | the owner's typing is a premise (branches row 1: "liveness rests on the owner typing"), not code |
| owner types (process OT = 29, **strongly fair**) | MB:1421-1426 (step), MB:1295 (`PROC.OT`); CB:256-286 (Emerson-Lei refinement; `--weak-owner` is the ablation) | none: a person | branches row 1; FIDELITY-3.md:641-642 (the owner answers) | strong, not weak: the watcher's wake cycle leaves the coordinator idle only between turns, and the owner types at one of those idle points (weak fairness lets the cycle starve him: RUN-BUILD 3, `--weak-owner`) |
| under a drain the owner still answers an admitted row's start | MB:1421-1423 | `lib.mjs:4103-4104` (only replace-fence and replace-start wait while blocked), `lib.mjs:4121-4127` (admitted: start-session, no drain test); `admit.mjs:260-262` (the drain refuses admission) | found by this unit (the first draft's `!c.dr` deadlocked FN-R5-B) | none |
| fault q, `BQ5_REFUSED_SJ`: a start called on a turn the app refuses; the hook may have run first and left `start.json` | MB:899-904; ghost `t.rq`; property RefusedStartNotCharged MB:794 | the no-start fence `lib.mjs:1863-1870` (uncharged while nostart < H_nostart = 2) | refute/S0.3.md:58; branches thin item 1 (unrecorded: both values are configurations) | which value holds is not recorded: BQ5-SJ and BQ5-NOSJ |
| `BQ5_NO_OWNER` (ablation) | MB:1420 | | | |
| `BLD_IF_UNCLAIMED`: the lease act's `--if-unclaimed` | MB:746 | `replace.mjs:438` (`fenceIfUnclaimed`, first in the hold), `replace.mjs:543-547`; planner `lib.mjs:4125` | departures/CLAIM.md 1; refute/CLAIM.md:48 | none |
| `BLD_LEASE_WINDOW`: a claim lands after the check and before the tombstone | MB:748-756 (the window re-runs the fence with `op[4] = 1`) | `replace.mjs:438-440` (check, then OUT's steps, then `fenceTombstone`) | refute/CLAIM.md:48-52 | reached only under lease reading (ii) (`FX_LEASE_NOBOUND`): under reading (i) the lease waits for every live unclaimed session (MB tick block "FX-CLAIM lease") |
| `BLD_LEASE_ORDER`: refusals, tombstone, slot (the tombstone create meets the claim) | MB:753 | not built (a proposal: refute/CLAIM.md:52) | | |
| property LeaseFenceClaimed (`BLD_PROPS`) | MB:793 | | the window's cost | |
| `BLD_CLOSE_IDGAP`: no close record counts (written under the app's id); the owner's relayed `closed` is the only count | coordinator closes set no `dn` (MB:701-706, 847-858, the tombstone stop); owner act `closed` MB:1430-1437; fault w MB:1437 | departures/CLOSE.md:10-23; units/CLOSE/result.md:76; the owner act `status.mjs owner --act closed` (`tcb/briefs/coordinator.md:110`) | brief point 3 | the relay is merged with the owner's act (the premise of a true relay); fault w breaks it |
| owner `closed` eligibility: a record the verify needs at verify_rounds >= 1 (`needsRecord`, MB:476), or an uncounted orphan (`orphanUncounted`, MB:480-485) | MB:480-485, 1431 | `lib.mjs:4152-4165` (`orphanAct`: a step-7 session with an uncounted done -> `owner`) | found by this unit: without it a dead folder session of a tombstoned attempt held its slot for good (FN-R5-B k=1,cd=1) | |
| `BLD_VERIFY_RECORDS`: verify needs a counted record for every nameable session, dead ones too | `verifyFenced` MB:677-690 (`s.al || BLD_VERIFY_RECORDS`); the commit verify (OP.SV); `ownerRow` MB:487-493; `needsRecord` | stop verify by close records (`stop.mjs:538`, `lib.mjs:4222-4230`) | FIDELITY-3.md section 2 (verify read true state) | none |
| a dead nameable session's stop: "no such session", recorded by the hook (counted only without the id gap) | MB:697-702 (fenced stop), MB:701 (commit close `closeCommitted`) | FX-CGATE step 6(b) (FIX-fence.md) | found by this unit: without it IDGAP-X never confirmed a crashed child's stop | |
| the owner rule reads `closesMissing` only at stop-requested; `verify_rounds` is reset only by a fence | `ownerRow` MB:490-492 | `lib.mjs:4097`, `lib.mjs:4222` (closesMissing only for stop-requested), `lib.mjs:1906` (reset at the fence) | found by this unit: a stale count of 3 from the earlier attempt's stop made the committed row wait for an owner act that had nothing to close | |
| `BLD_STOP_INTERRUPT_ONLY` + `BLD_ARCHIVE_APPROVAL`: the close leaves the session alive (stop interrupts, the archive waits for an approval not given) | MB:706, 847 ("close deferred" branch) | the stop tool names (branches thin item 2; refute/S0.3.md row 1 (d)) | brief point 3, unrecorded facts | both values: the `-B` configurations take the first, CLOSE-APPROVAL* the second |
| check-build `--set F=v` | CB:30-33 | | diagnosis and ablations (model-build.test.mjs) | |

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
`n.cj` tests at about MB:1043 and 1481-1485); the exit-67 path (about MB:1058) is the pre-FX-W1 one. Left to the
successor: W6 item 6 (age cap), REDO.

## 4. Disagreements with the round's own files (listed, not edited there)

- FIDELITY-3.md:643 says the owner's other acts stay on the never-forced environment line. Under the Q5 rule a start
  needs the owner, so the owner's typing is a fair process here (strongly fair, section 1).
- RUN-BUILD's lease runs need reading (ii); the R57 round ran reading (ii) only as FX-CLAIM-II (BOUNDED at 400 MB,
  ABLATION-fence.md:71), and its Slots and NoChargeWithoutFault failures recur in every lease variant.
- FIX-JOIN 2b row 8 against N2 (`refute/S2.1.md:108`): not read yet.
