# RUN-BUILD: the run list of the model as built (S2.2 for S2.3, task r57-0507 slice 2)

Final, S2.2 successor 2, 2026-11-20: 28 runs in sections 1-8, each measured or estimated well below 1,400 s.
FX-W6 fix round, 2026-11-20: section 9, seven runs on the model as it now is; sections 1-8 are the record S2.3 ran.

**How to run.** From the S2.2 worktree's `research-tree/` folder (or `build` after the landing), one run per call,
through MAIN's lane, each under 1,400 s:

```
node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.3-<ID> --timeout-s 1450 --wait-s 30 -- node model/as-built/check-build.mjs <ID> [--bud <part>] [--set F=1] --mem-mb <M> > model/results-build/<ID>__<part>.json
```

A row marked **parts** runs `node model/as-built/run-seq-build.mjs <ID> --out model/results-build/<ID>-parts.json --parts --mem-mb <M> --wall-s 1350`
in the same lane form; exit 3 means "more to do": the same command again resumes. `--mem-mb` is the checker's own
budget; the share is of the free memory F the root reads before the run (the process peaks at about 1.1 x the flag).
Sizes marked "est." come from the ratio -B / R57 at the k=1 parts measured here (1.3-1.7; 17 for the close group).

## 0. One run per branch S0.3 changed (branches.md line 63 and its rows)

Q5 (row 1): section 3. L1 (row 3), S1 (row 4) and P1 (row 10, the re-alert): FXW-4R-B. B1 (row 5): FXW-6-B. R1 (row 6):
FXW-5-B. E1 with N2 (row 11): FN-N2-B. FX-CGATE without `FX_Q5B` (row 1): every fence-group `-B` run. H4 (row 8, alerts
go to the owner): the dead-man alert sets the owner's typing (`om`) in every run with the Q5 rule. Rows 2, 7, 9, 12-17
change no actor the model has (thresholds, the untimed pace, RL not modelled: ABLATION-wake.md:196).

## 1. Regression: flags off, the R57 model

| ID | part | M (share of F) | expected | output |
|---|---|---|---|---|
| FN-R5 | k=2,cd=2 | 800 (4 %) | 4,724,454 states, 34 s, every property holds, as `results-as-built/final/FN-R5.json` | `FN-R5__k=2,cd=2.json` |

The other final-pass ids are in `configs-build.mjs` unchanged; check-build gave check.mjs's states and verdicts on
FN-N2 k=1,u=1 (363,706), FN-R5 k=1,cd=1 (867,362), FN-R5 k=1,cs=1 (778,987), SMOKE (132,761). One full-size run is enough.

## 2. The R57 final pass as built (`-B`: the Q5 rule; the fence group also --if-unclaimed, the id gap, verify by records)

| ID | part | M (share) | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| FN-R5-B | k=2,cd=2 | 1500 (7 %) | est. 6.5-7.5 M / 60 s | every property holds (holds at k=0, k=1,cs=1, k=1,cd=1) | `FN-R5-B__k=2,cd=2.json` |
| FN-OUT-CLOSE-K2-B | **parts** | 2500 (12 %) | k=0 99,748; k=1,cd=1 1,049,518 (8 s); k=2 parts est. 10-30 M each | holds at the k=1 parts measured; k=2 parts may end BOUNDED (say which) | `FN-OUT-CLOSE-K2-B-parts.json` |
| FXW-4R-B | **parts** | 1500 (7 %) | est. 5 M summed (R57 2.9 M x 1.7) | as R57's FXW-4R parts: WakeSourceAlive F 9, NoSilenceAfterFirstCall F 9, EventuallyResolves F 10 at k=1,u=1 (measured here, identical to FXW-4R: the hand-over exit-2 path that N2 closes) | `FXW-4R-B-parts.json` |
| FXW-5-B | whole | 4500 (20 %) | est. 10.6 M / 70 s | as FXW-5 (k=1,o=1 holds in both, 20,117 states) | `FXW-5-B.json` |
| FXW-6-B | whole | 2500 (12 %) | est. 18.5 M / 130 s | as FXW-6 (k=1,cs=1: EventuallyResolves F 10 in both models) | `FXW-6-B.json` |
| FN-N2-B | k=1,u=1 | 800 (4 %) | 623,250 / 6 s (measured) | EventuallyResolves F 9, as FN-N2 at this part (the u artefact, ABLATION-wake.md:55) | `FN-N2-B__k=1,u=1.json` |

FN-N2-B after the FX-W6 fix round (line 1015 from the S2.4 variant): 619,856 states at k=1,u=1, section 9.

The whole FN-OUT-CLOSE-K2-B does not fit: its k=1,cd=1 part alone is 17 times FN-OUT-CLOSE-K2's (60,948), since every
close now waits for the owner's relayed `closed` and every start for an owner-typed turn. **Uncovered**: the k=2
mixed parts that end BOUNDED.

## 3. Q5 (branches row 1; refute/S0.3.md:58): starts only on a turn the owner typed

| ID | part | M | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| BQ5-NOSJ | k=3,q=3 | 800 | 321,318 / 3 | every property holds (a refused start writes nothing) | `BQ5-NOSJ__k=3,q=3.json` |
| BQ5-SJ | k=3,q=3 | 800 | 1,076,426 / 9 | **RefusedStartNotCharged F 26**: the third no-start fence of refused starts is charged (branches.md:70, "a charge without a fault") | `BQ5-SJ__k=3,q=3.json` |
| BQ5-SJ | k=3,q=2,cd=1 | 2500 | 9,970,441 / 81 | RefusedStartNotCharged F 20 | `BQ5-SJ__k=3,q=2,cd=1.json` |
| BQ5-X (ablation) | k=1,q=1 | 600 | 63,205 / 1 | AlwaysCanResolve F 8: without the owner typing no start comes | `BQ5-X__k=1,q=1.json` |
| FN-R5-B `--weak-owner` (ablation) | k=1,cs=1 | 1500 | 1,044,505 / 9 | EventuallyResolves F 22: under weak fairness the watcher's wake cycle keeps the coordinator from being idle when the owner would type | `FN-R5-B-weak__k=1,cs=1.json` |

## 4. The lease act (refute/CLAIM.md:52): `--if-unclaimed`, its window, the closing order

Reading (ii) of the lease (FX_LEASE_NOBOUND: the lease may run out while the session lives unclaimed), one field, no
fault: under reading (i) the window cannot be reached. Bounded by memory at every size (13 M states fill 1,800 MB at
two fields), so a "holds" here is "not refuted (bounded)".

| ID | part | M | expected | output |
|---|---|---|---|---|
| LEASE-B | k=0 | 1800 (8 %) | ~12 M states BOUNDED / 105 s; **LeaseFenceClaimed F 6** (the window) | `LEASE-B__k=0.json` |
| LEASE-ORDER | k=0 | 1800 | LeaseFenceClaimed not refuted | `LEASE-ORDER__k=0.json` |
| LEASE-NOWIN (ablation) | k=0 | 1800 | LeaseFenceClaimed not refuted (the check and the tombstone in one instant) | `LEASE-NOWIN__k=0.json` |
| LEASE-X (ablation) | k=0 | 1800 | LeaseFenceClaimed F 7 (no --if-unclaimed) | `LEASE-X__k=0.json` |

All four also fail Slots (F 21), FailedTaskStopped (F 33-37) and NoChargeWithoutFault (F 6-26): reading (ii)'s own
failures (ABLATION-fence.md:71 for the first and the last), with or without the lease act. **Uncovered**: two fields.

## 5. CLOSE's id gap (departures/CLOSE.md:10-23): every close through the owner's relayed `closed`

| ID | part | M | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| IDGAP-X (ablation) | k=1,cd=1 | 600 | 75,971 / 1 | every property holds | `IDGAP-X__k=1,cd=1.json` |
| IDGAP-W | k=1,w=1 | 800 | 443,247 / 4 | **Slots F 19** (SlotsProc 19, SlotsR10 18), AlwaysCanResolve F 18, EventuallyResolves F 25: a false relay frees the slot of a session that lives | `IDGAP-W__k=1,w=1.json` |
| IDGAP-WZ | k=2,z=1,w=1 | 800 | 378,638 / 4 | AlwaysCanResolve F 15, EventuallyResolves F 25: the false relay gives the zombie a counted record, so `closesMissing` is false (lib.mjs:4229-4230) and the owner act never comes, while the verify sees growth for good; only FX-W5's `stuck` path, not in this group, would reach the owner | `IDGAP-WZ__k=2,z=1,w=1.json` |
| FN-OUT-CLOSE-K2-B `--set BLD_VERIFY_RECORDS=0` (ablation) | k=1,cd=1 | 600 | 75,971 | every property holds; with the flag 1,049,518 | `CLOSE-NOREC__k=1,cd=1.json` |

## 6. The unrecorded close facts, the other value (stop_session interrupts only, archive_session waits for approval)

| ID | part | M | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| CLOSE-APPROVAL | k=1,cd=1 | 2500 | 1,725,799 / 16 | every property holds | `CLOSE-APPROVAL__k=1,cd=1.json` |
| CLOSE-APPROVAL-R5 | k=0 | 800 | 167,145 / 2 | **Slots F 16**: the fence group has no FX-CLOSE (the R57 split), so its verify confirms on no growth while the interrupted session lives and its slot is reused. On `build` FX-CLOSE's verify waits for a close-done record, so this is the split's, unless the hook records a close for a stop that only interrupts (not recorded: a pilot fact) | `CLOSE-APPROVAL-R5__k=0.json` |

## 7. W6 item 6 (refute/W4.md:100-125): the age cap as built; an acknowledgement is a continue

The FXW-5-B group (FX-W5 with the act-due keys, the Q5 rule) with the age cap and fault m, a child at bound that
imitates activity. AgeCapReachesOwner fails in AGE-B by construction: that gap goes back to FX-W6 (S2.4). AGE-STUCK, the
design's second leg (not built), is the run that shows the property is not vacuous. This was the model before the FX-W6
fix round; for the model now (AGE-B fixed, AGE-STUCK the same, the ablation AGE-REARM), section 9.

| ID | part | M (share) | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| AGE-B | whole (k=1) | 800 (4 %) | 434,359 / 3 | **AgeCapReachesOwner F 16** (raised, read, acknowledged, re-armed, raised again: the owner is never told), AlwaysCanResolve F 3; EventuallyResolves F 5, as AGE-STUCK's below (at k=1,m=1 it is F 16, the age cap's own) | `AGE-B.json` |
| AGE-B | k=2,m=1,o=1 | 600 (3 %) | 62,123 / 1 | AgeCapReachesOwner F 16, EventuallyResolves F 16, AlwaysCanResolve F 3 | `AGE-B__k=2,m=1,o=1.json` |
| AGE-STUCK (the design leg) | whole (k=1) | 800 (4 %) | 476,122 / 3 | AgeCapReachesOwner holds; EventuallyResolves F 5, also at k=2,m=1,u=1 (294,544 states) and not at k=2,m=1,o=1: fault u's process-list artefact (ABLATION-wake.md:55), not the age cap (its trace not read) | `AGE-STUCK.json` |
| AGE-STUCK | k=2,m=1,o=1 | 600 (3 %) | 162,074 / 1 | every property holds: a turn that skips its acts still acknowledges, and the stuck path still reaches the owner | `AGE-STUCK__k=2,m=1,o=1.json` |

Measured at k=1,m=1 (model-build.test.mjs): AGE-B 23,819 states, AGE-STUCK 65,582. **Uncovered**: three faults with m.

## 8. REDO (refute/W4.md:126-137): a started line lost by a dying reconcile, and FX-REDO

FN-OUT-CLOSE-K2-B (the close group, where a row may be committed at started) with fault g. Fault x is needed too:
without it a row is bound in the turn that starts it, no reconcile moves it, and k=2,g=2 stays at k=0's 99,748 states.

| ID | part | M (share) | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| REDO-B | k=3,x=1,g=2 | 2500 (12 %) | 795,051 / 7 | every property holds; StartedLineRecorded holds because each act follows, in its own turn, a reconcile that completed, whose FX-REDO writes the line first | `REDO-B__k=3,x=1,g=2.json` |
| REDO-X (ablation) | k=2,x=1,g=1 | 1500 (7 %) | 673,945 / 6 | **StartedLineRecorded F 6**: with no FX-REDO the next turn binds the row with its line missing | `REDO-X__k=2,x=1,g=1.json` |

REDO-B at k=2,x=1,g=1: 574,250 states, every property holds. **Uncovered**: g with the close group's other faults
(cd, z, t) at three faults.

## 9. The FX-W6 fix round (S2.4 VERDICT sections 1 and 6; `build/briefs/FX-W6.md` part 5)

The model now follows the fixed code. `BLD_AGE_CAP` explores the age cap as built on `u/W6`: an acknowledgement does
not re-arm it, FX-W5 raises it again, after `AGE_STUCK` re-raises it is `stuck` and the dead-man reaches the owner
(the leg `BLD_AGE_STUCK` modelled before; that flag is gone). The deleted re-arm is the ablation `AB_AGE_REARM`, off
by default, in the configuration AGE-REARM. **AGE-B and AGE-STUCK now have the same flags and explore the same
states**; both ids stay runnable because the record names them, and one of the two runs is enough. AGE-REARM explores
exactly what AGE-B explored before the round (S2.3's AGE-B figures), and the new AGE-B what AGE-STUCK explored.
Line 1015 is the S2.4 variant's line: a refused hand-over (handover exit 6) goes to endturn under FIX_ENDTURN_ALWAYS.

**FN-N2-B reads no flag this round changed besides line 1015**: it sets neither `BLD_AGE_CAP` nor `AB_AGE_REARM`, and
every line the round touched in the age cap and the dead-man's `stuck` step runs only under `BLD_AGE_CAP`. So R3
(`results-build/rerun/FN-N2-B-V-parts.json`, 75 parts on the variant, whose only difference was line 1015) stands as
FN-N2-B's k=2 result; only its k=1,u=1 row is run again here.

From the W6 worktree's `research-tree/` folder (or `build` after the landing), one run per call, each a background
command through MAIN's lane, the output folder made first:

```
mkdir -p model/results-build/fx-w6 && node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label FXW6-<ID>[-<part>] --timeout-s 1450 --wait-s 30 -- node model/as-built/check-build.mjs <ID> [--bud <part>] --mem-mb <M> > model/results-build/fx-w6/<ID>[__<part>].json
```

| ID | part (`--bud`) | M (share of F) | expected states / s | expected outcome | output (`model/results-build/fx-w6/`) |
|---|---|---|---|---|---|
| AGE-B | whole (k=1; no `--bud`) | 800 (4 %) | 476,122 / 3 (S2.3's AGE-STUCK) | AgeCapReachesOwner holds, AlwaysCanResolve holds; EventuallyResolves F 5, fault u's process-list artefact (ABLATION-wake.md:55), as S2.3's AGE-STUCK | `AGE-B.json` |
| AGE-B | k=2,m=1,o=1 | 600 (3 %) | 162,074 / 1 (S2.3's AGE-STUCK) | every property holds | `AGE-B__k=2,m=1,o=1.json` |
| AGE-STUCK | whole (k=1; no `--bud`) | 800 (4 %) | 476,122 / 3, the same states as AGE-B | as AGE-B | `AGE-STUCK.json` |
| AGE-STUCK | k=2,m=1,o=1 | 600 (3 %) | 162,074 / 1, the same states as AGE-B | every property holds | `AGE-STUCK__k=2,m=1,o=1.json` |
| AGE-REARM (ablation) | whole (k=1; no `--bud`) | 800 (4 %) | 434,359 / 3 (S2.3's AGE-B) | **AgeCapReachesOwner F 16** (raised, read, acknowledged, re-armed, raised again: the owner is never told), AlwaysCanResolve F 3, EventuallyResolves F 5 | `AGE-REARM.json` |
| AGE-REARM (ablation) | k=2,m=1,o=1 | 600 (3 %) | 62,123 / 1 (S2.3's AGE-B) | AgeCapReachesOwner F 16, EventuallyResolves F 16, AlwaysCanResolve F 3 | `AGE-REARM__k=2,m=1,o=1.json` |
| FN-N2-B | k=1,u=1 | 800 (4 %) | 619,856 / 6 (measured here: 5.5 s) | EventuallyResolves F 9, the u artefact, as FN-N2 at this part; the trace as the variant's (S2.4 VERDICT section 6) | `FN-N2-B__k=1,u=1.json` |

Measured here at k=1,m=1 (lane `W6-fix-model-small`; model-build.test.mjs pins them): AGE-B 65,582 states and
AGE-STUCK 65,582, every property holds; AGE-REARM 23,819, AgeCapReachesOwner F 16, EventuallyResolves F 16,
AlwaysCanResolve F 3. **Uncovered**: as section 7 (three faults with m); the coordinator's stop of an age-capped
attempt (place 7b of the brief) is not modelled, its coordinator only acknowledges.
