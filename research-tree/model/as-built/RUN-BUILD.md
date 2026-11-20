# RUN-BUILD: the run list of the model as built (S2.2 for S2.3, task r57-0507 slice 2)

Draft by S2.2 successor 1, 2026-11-20. Items W6-6 (age cap) and REDO are not built yet: their runs are missing (section 7).

**How to run.** From the S2.2 worktree's `research-tree/` folder (or `build` after the landing), one run per call,
through MAIN's lane, each under 1,400 s:

```
node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.3-<ID> --timeout-s 1450 --wait-s 30 -- node model/as-built/check-build.mjs <ID> [--bud <part>] [--set F=1] --mem-mb <M> > model/results-build/<ID>__<part>.json
```

A row marked **parts** runs `node model/as-built/run-seq-build.mjs <ID> --out model/results-build/<ID>-parts.json --parts --mem-mb <M> --wall-s 1350`
in the same lane form; exit 3 means "more to do": the same command again resumes. `--mem-mb` is the checker's own
budget; the share is of the free memory F the root reads before the run (the process peaks at about 1.1 x the flag).
Sizes marked "est." come from the ratio -B / R57 at the k=1 parts measured here (1.3-1.7; 17 for the close group).

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
| IDGAP-WZ | k=2,z=1,w=1 | 800 | 378,638 / 4 | AlwaysCanResolve F 15, EventuallyResolves F 25 (a zombie with a false relay; trace not read yet) | `IDGAP-WZ__k=2,z=1,w=1.json` |
| FN-OUT-CLOSE-K2-B `--set BLD_VERIFY_RECORDS=0` (ablation) | k=1,cd=1 | 600 | 75,971 | every property holds; with the flag 1,049,518 | `CLOSE-NOREC__k=1,cd=1.json` |

## 6. The unrecorded close facts, the other value (stop_session interrupts only, archive_session waits for approval)

| ID | part | M | expected states / s | expected outcome | output |
|---|---|---|---|---|---|
| CLOSE-APPROVAL | k=1,cd=1 | 2500 | 1,725,799 / 16 | every property holds | `CLOSE-APPROVAL__k=1,cd=1.json` |
| CLOSE-APPROVAL-R5 | k=0 | 800 | 167,145 / 2 | **Slots F 16**: the fence group's verify has no close records (no FX-CLOSE), so it confirms while the interrupted session lives (trace not read yet) | `CLOSE-APPROVAL-R5__k=0.json` |

## 7. Not in this draft

W6 item 6 (an acknowledgement is a continue and re-arms the age cap; property "an attempt whose coordinator only
acknowledges reaches the owner"), REDO (a row committed at `started` gets no started redo; property
StartedLineRecorded), and one run per branch S0.3 changed beyond rows 1 (Q5) and 6 (R1, FXW-5-B).
