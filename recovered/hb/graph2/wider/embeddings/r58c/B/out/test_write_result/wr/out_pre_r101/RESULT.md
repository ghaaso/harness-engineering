# Embedding arms on the code graph: result (addendum 8)

Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)
fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;
item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals). TEST OUTPUT.

## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)

| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word | builder reading (53), sensitivity, no word | pilot-shared commits (56), sensitivity, no word |
|---|---|---|---|---|---|---|---|---|---|
| E1 | +0.017 [+0.008, +0.025] | cannot tell (no evidence either way at this size) | [+0.006, +0.030] at 0.9900 | -0.047 [-0.072, -0.024] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | +0.006 [+0.003, +0.009] | +0.019 [+0.011, +0.028] |
| E2 | +0.047 [+0.032, +0.061] | adds | [+0.029, +0.067] at 0.9875 | +0.048 [+0.021, +0.079] | adds | +0.000 [-0.000, +0.000] | matches | +0.021 [+0.014, +0.029] | +0.048 [+0.033, +0.064] |
| E3 | +0.018 [+0.010, +0.028] | cannot tell (no evidence either way at this size) | [+0.009, +0.030] at 0.9833 | -0.048 [-0.073, -0.025] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | +0.006 [+0.002, +0.009] | +0.020 [+0.012, +0.030] |
| E4 | -0.001 [-0.003, +0.002] | matches | [-0.003, +0.002] at 0.9500 | -0.126 [-0.164, -0.097] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | -0.001 [-0.003, +0.002] | -0.000 [-0.003, +0.003] |
| E5 | -0.003 [-0.005, -0.000] | matches | [-0.006, +0.000] at 0.9750 | -0.126 [-0.161, -0.100] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | -0.003 [-0.005, -0.000] | -0.003 [-0.005, +0.000] |
| PLACEBO | -0.002 [-0.004, -0.000] | matches | n/a (not an embedding arm) | -0.127 [-0.164, -0.099] | cannot tell (no evidence either way at this size) (lower) | -0.006 [-0.009, -0.001] | matches | -0.002 [-0.005, +0.001] | -0.002 [-0.004, +0.000] |

Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02); the Holm column gives percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).

Placebo (harness check, ruling 54; harness_check.ok = True): primary word "matches"; fixed-w pool P@10 minus RRF: w0.25 -0.002 [-0.004, -0.000], w0.5 -0.005 [-0.010, -0.001], w1 -0.011 [-0.020, -0.004].

## All metrics, late 50 (item 23; seed means; arm cells: alone / fused)

| list | pool P@10 | pool R@10 | pool R@20 | pool MRR | unres P@10 | unres R@10 | unres R@20 | unres MRR |
|---|---|---|---|---|---|---|---|---|
| E1 | 0.203 / 0.266 | 0.410 / 0.558 | 0.555 / 0.661 | 0.658 / 0.656 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E2 | 0.298 / 0.296 | 0.604 / 0.623 | 0.707 / 0.708 | 0.852 / 0.757 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E3 | 0.201 / 0.268 | 0.414 / 0.560 | 0.562 / 0.658 | 0.671 / 0.673 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E4 | 0.123 / 0.249 | 0.250 / 0.530 | 0.420 / 0.629 | 0.276 / 0.594 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E5 | 0.123 / 0.247 | 0.249 / 0.520 | 0.427 / 0.630 | 0.284 / 0.590 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| PLACEBO | 0.122 / 0.247 | 0.249 / 0.521 | 0.416 / 0.630 | 0.261 / 0.595 | 0.022 / 0.246 | 0.042 / 0.521 | 0.088 / 0.655 | 0.079 / 0.572 |
| RRF | 0.249 | 0.531 | 0.630 | 0.610 | 0.251 | 0.541 | 0.665 | 0.613 |
| PPR | 0.215 | 0.450 | 0.586 | 0.538 | 0.217 | 0.461 | 0.604 | 0.541 |
| CO | 0.214 | 0.453 | 0.575 | 0.497 | 0.174 | 0.376 | 0.416 | 0.428 |
| DIR | 0.208 | 0.453 | 0.589 | 0.463 | 0.173 | 0.362 | 0.485 | 0.371 |
| RANDOM | 0.119 | 0.234 | 0.419 | 0.276 | 0.026 | 0.066 | 0.123 | 0.105 |

Every arm-minus-RRF interval for every metric and scope, the sensitivity rows (53, 56) and the comparators are in result.json. Grader's tuning rank check (ruling 88b): 416 cells of tune-rank.json (per seed, seed mean, comparators; both scopes; four metrics) equal tune.json within 1e-9 (largest difference 0.0e+00).

## Seeds alone (item 25): fused minus RRF, pool P@10, per seed

- E1: s1 +0.017 [+0.007, +0.026]; s2 +0.019 [+0.009, +0.028]; s3 +0.015 [+0.005, +0.027]
- E2: s1 +0.049 [+0.034, +0.066]; s2 +0.047 [+0.031, +0.063]; s3 +0.044 [+0.029, +0.059]
- E3: s1 +0.019 [+0.009, +0.029]; s2 +0.015 [+0.006, +0.026]; s3 +0.022 [+0.013, +0.031]
- E4: s1 -0.001 [-0.004, +0.001]; s2 -0.001 [-0.003, +0.002]; s3 +0.000 [-0.004, +0.005]
- E5: s1 -0.003 [-0.006, -0.000]; s2 -0.002 [-0.005, +0.001]; s3 -0.004 [-0.007, -0.000]
- PLACEBO: s1 -0.000 [-0.002, +0.002]; s2 -0.003 [-0.006, +0.000]; s3 -0.003 [-0.007, -0.000]

## Answer level (item 24; tuning split, late 50)

Item 24 is scored by the grader with its full references (files and definitions), as on held-out (ruling 71). The lane handed over ranked lists and packs (shared packer, frozen typed primary options 95e990307da3b42b: paths form, file granularity, pad False; 8,000 tokens): handoff/HANDOFF.json, 388 tasks, 50 commits, 40 ranked lists.

### Item 24 (grader, tune-item24.json), with the lane's figure beside it under its own label: file recall within 8,000 tokens, lane-computed

Computed by the lane against git's files only (git files); a separate figure, not item 24. Arm cells: alone / fused. Tasks absent from a table (ruling 91): none for a fused variant and for RRF, PPR and DIR; for CO and an arm alone only a task the method scored no candidate for, ranked by the fixed tie-break alone; counts pool/unrestricted, per seed s1, s2, s3, from the hand-off's absent_tasks.

| ranked list | item 24 (grader) | minus RRF [95 %] | file recall within 8,000 tokens, lane-computed | minus RRF [95 %] | tasks absent pool/unrestricted (ruling 91) |
|---|---|---|---|---|---|
| E1 | 0.400 / 0.410 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 0/0, 0/0, 0/0 ; 0/0, 0/0, 0/0 |
| E2 | 0.420 / 0.430 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 0/0, 0/0, 0/0 ; 0/0, 0/0, 0/0 |
| E3 | 0.440 / 0.450 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 0/0, 0/0, 0/0 ; 0/0, 0/0, 0/0 |
| E4 | 0.460 / 0.470 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 0/0, 0/0, 0/0 ; 0/0, 0/0, 0/0 |
| E5 | 0.480 / 0.490 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 2/1, 2/1, 2/1 ; 0/0, 0/0, 0/0 |
| PLACEBO | 0.500 / 0.510 | +0.020 [-0.010, +0.050] / +0.020 [-0.010, +0.050] | 0.500 / 0.500 | +0.010 [-0.020, +0.040] / +0.010 [-0.020, +0.040] | 0/0, 0/0, 0/0 ; 0/0, 0/0, 0/0 |
| RRF | 0.520 | reference | 0.500 | reference | 0/0 |
| PPR | 0.530 | +0.020 [-0.010, +0.050] | 0.500 | +0.010 [-0.020, +0.040] | 0/0 |
| CO | 0.540 | +0.020 [-0.010, +0.050] | 0.500 | +0.010 [-0.020, +0.040] | 3/2 |
| DIR | 0.550 | +0.020 [-0.010, +0.050] | 0.500 | +0.010 [-0.020, +0.040] | 0/0 |

## Item 22 (ruling 61): before an arm is called weak

Stage-A held-out triples (32 queries at cd806c80): PPR MRR 0.282, CO MRR 0.002 (all entities).

| arm | config: stage-A MRR (loss ratio as run / to the selection epoch) | stage-B loss ratio median (units) | predict_target check |
|---|---|---|---|
| E1 | c04 0.730 (n/a / 1.014); c15 0.724 (n/a / 1.023); c12 0.722 (n/a / 1.014) | c04 n/a (0); c12 n/a (0); c15 n/a (0) | c04: 20/20 orders identical, max abs diff 0.0e+00 |
| E2 | c11 0.752 (n/a / 0.992); c07 0.746 (n/a / 0.991); c10 0.727 (n/a / 0.995) | c07 n/a (0); c10 n/a (0); c11 n/a (0) | c11: 20/20 orders identical, max abs diff n/a |
| E3 | c11 0.741 (n/a / 1.031); c03 0.740 (n/a / 1.019); c13 0.740 (n/a / 1.030) | c03 n/a (0); c11 n/a (0); c13 n/a (0) | c11: 20/20 orders identical, max abs diff 1.0e-07 |
| E4 | c12 0.729 (n/a / 0.903); c13 0.685 (n/a / 0.925); c16 0.681 (n/a / 0.907) | c12 n/a (0); c13 n/a (0); c16 n/a (0) | c12: injection FAILED (the kept representations could not be written back; no comparison) |
| E5 | c03 0.402 (n/a / 0.993); c11 0.400 (n/a / 0.987); c09 0.393 (n/a / 0.985) | c03 n/a (0); c09 n/a (0); c11 n/a (0) | FAILED (0 specialist(s) compared); per specialist:  |

The loss ratio is a reported number, not a pass mark (ruling 36 stops at the validation peak). E4 (ruling 74): It tests the scoring path, not the stored model, and is reported so. The reciprocal relation is item22.py's description of each model, not a check.

## Item 17 counts for the chosen configuration (ruling 62)

- E1 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates, 0 distinct (checkpoint, path) pairs); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct, 0 (checkpoint, path) pairs), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E2 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates, 0 distinct (checkpoint, path) pairs); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct, 0 (checkpoint, path) pairs), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E3 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates, 0 distinct (checkpoint, path) pairs); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct, 0 (checkpoint, path) pairs), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E4 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates, 0 distinct (checkpoint, path) pairs); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct, 0 (checkpoint, path) pairs), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E5 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates, 0 distinct (checkpoint, path) pairs); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct, 0 (checkpoint, path) pairs), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.

## Held-out (item 27; spent, descriptive only, no section-G word)

Frozen before any held-out unit (2026-11-15T11:09:28): E2 c07, w 1, 20 epochs, s 1, device cpu; all-65 figure 0.2915; tie group E2.
Stored arms of item 7, shown as they are (8,000-token answer recall, 75 commits; nothing of theirs is rerun): typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549.
The embedding lists rank code files only and were packed by an adapter, so item 7's figures are context and not a like-for-like comparison; the like-for-like comparison is with RRF, PPR, CO and DIR packed the same way (ruling 88g).
Grader aggregates (heldout.json; 75 commits, 418 tasks; item 23 aggregation; descriptive only):

| variant | pool P@10 | pool R@10 | pool R@20 | pool MRR | unres P@10 | unres R@10 | unres R@20 | unres MRR | answer level (item 24) | tasks absent pool/unrestricted (ruling 91) |
|---|---|---|---|---|---|---|---|---|---|---|
| E2_alone_s1 | 0.100 | 0.101 | 0.102 | 0.103 | 0.100 | 0.101 | 0.102 | 0.103 | 0.500 | 0/0 |
| E2_alone_s2 | 0.110 | 0.111 | 0.112 | 0.113 | 0.110 | 0.111 | 0.112 | 0.113 | 0.510 | 0/0 |
| E2_alone_s3 | 0.120 | 0.121 | 0.122 | 0.123 | 0.120 | 0.121 | 0.122 | 0.123 | 0.520 | 0/0 |
| E2_alone_mean | 0.130 | 0.131 | 0.132 | 0.133 | 0.130 | 0.131 | 0.132 | 0.133 | 0.530 | 0/0, 0/0, 0/0 |
| E2_fused_s1 | 0.140 | 0.141 | 0.142 | 0.143 | 0.140 | 0.141 | 0.142 | 0.143 | 0.540 | 0/0 |
| E2_fused_s2 | 0.150 | 0.151 | 0.152 | 0.153 | 0.150 | 0.151 | 0.152 | 0.153 | 0.550 | 0/0 |
| E2_fused_s3 | 0.160 | 0.161 | 0.162 | 0.163 | 0.160 | 0.161 | 0.162 | 0.163 | 0.560 | 0/0 |
| E2_fused_mean | 0.170 | 0.171 | 0.172 | 0.173 | 0.170 | 0.171 | 0.172 | 0.173 | 0.570 | 0/0, 0/0, 0/0 |
| RRF | 0.180 | 0.181 | 0.182 | 0.183 | 0.180 | 0.181 | 0.182 | 0.183 | 0.580 | 0/0 |
| PPR | 0.190 | 0.191 | 0.192 | 0.193 | 0.190 | 0.191 | 0.192 | 0.193 | 0.590 | 0/0 |
| CO | 0.200 | 0.201 | 0.202 | 0.203 | 0.200 | 0.201 | 0.202 | 0.203 | 0.600 | 1/1 |
| DIR | 0.210 | 0.211 | 0.212 | 0.213 | 0.210 | 0.211 | 0.212 | 0.213 | 0.610 | 0/0 |

- E2_fused minus RRF (seed mean; by commit, 10,000 resamples, 95 % percentile interval; ruling 88d, description only): pool P@10 +0.010 [-0.030, +0.050]; unrestricted P@10 +0.010 [-0.030, +0.050]; answer level +0.010 [-0.030, +0.050].
- E2_alone minus RRF (seed mean; by commit, 10,000 resamples, 95 % percentile interval; ruling 88d, description only): pool P@10 +0.010 [-0.030, +0.050]; unrestricted P@10 +0.010 [-0.030, +0.050]; answer level +0.010 [-0.030, +0.050].
Checked: the aggregates carry sha256(item27.json) and HANDOFF.json's hash; arm E2 is the frozen arm; the grader's literal check (ruling 73): 418 tasks, task commit in the checkpoint's history 0, parent mismatch 0.

## Lag and leak audit

- Stride s = 1; lag (ruling 52) over late-50 tasks {'0': 313}, over all tune tasks {'0': 388}.
- Leak audit (ruling 60): PASS; checkpoints and tasks per split {"tune": [53, 388], "heldout": [70, 418]}; failures 0; container mounts listed 3 (table in AUDIT.md, with ruling 35's disclosure). RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values. (leak_audit.json ruling92.text; check ok = True)

## Readings recorded

- N3 weights in the paper's convention (weight / 3; the authors' code read, kge.py docstring): c11 0.02 / 3 = 0.006667; c07 0.1 / 3 = 0.03333; c10 0.005 / 3 = 0.001667.
- E5 router (item 13): when every 1-hop neighbour of the seed is in the seed's own area, the seed is routed to that one specialist only; this single-area case is the reading of item 13 (kge.route, report.py _route).
- Item 17 counts are for the chosen configuration (per late-50 block; all 65 for the final choice), seed 1, as distinct paths, as distinct (checkpoint, path) pairs (ruling 76) and as task-candidate occurrences; candidates of unscored seeds, tasks on checkpoints without co_changed and the two ruling-55 cases among scored seeds are separate figures.
- E4 (rulings 67, 87): every planned stage-B E4 part ran with det=1 (assemble_checks: 477 of 477, planned 477); c13 and c16 trained twice alone on the card and repeated byte for byte (progress.jsonl preflight_e4_det: accepted: E4 c13 and c16 repeat byte for byte); c12 was measured to repeat alone in ruling 67, so E4 is deterministic everywhere. Ruling 68: E5 is held to identical score tables and counts (not bit-reproducible on the card); no other setting was found not to repeat alone.

## Limits (section I, and the rulings reported as limits)
- Item 28. One repository, about 233 commits of history, about 5,400 nodes and 19,000 edges: about 7 facts per entity. A null here says nothing about larger or denser graphs.
- Item 29. Not tested: temporal knowledge-graph models, inductive models (NodePiece, NBFNet), text or code embeddings, GPUs and large dimensions, rule learners (AnyBURL), a longer history.
- Item 30. The truth is what a commit changed, at file level; context a change needed but did not edit is not scored. No agent is run.
- Item 31. With 50 evaluation commits the smallest detectable difference is several hundredths; "cannot tell" is a likely outcome and is reported as "no evidence either way at this size".
- Ruling 35. Disclosure: while building the evaluation core, one builder's look at a temp file showed the names of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came from git for the June commits only. The audit records it.
- Ruling 39. Stage A's held-out set is small: the stage-A graph has 162 co_changed pairs, so 16 pairs (32 queries) are held out. Its top-3 filter is noisy; the binding selection is stage B's nested task-level choice. Reported as a limit. Stage A is not restarted (its count, not its scores, prompted this).
- Ruling 44. Stride. s (item 16, ruling 37) is set from the card's timing alone, by the same rule: the smallest of 1, 3, 6, 10 whose projected stage B is under 30 hours, else 10. Value: s = 1, from the card's timing of the selected configurations at ruling 36's epochs (`gpu/stride-gpu-lanes1.json`): projected 14.4 h with one training process (s = 3: 4.8 h; 6: 2.3 h; 10: 1.6 h); 53 tuning checkpoints, 2,385 units, lag 0 for all 388 tasks. No task score was read. On the CPU, ruling 37's projection was not redone after stage A. The CPU timing before stage A gave 375 to 1,464 hours at s = 1 and 41 to 159 hours at s = 10 (`train/stride.json`), so on the CPU no stride fitted 30 hours and s would have been 10 under ruling 37. The card therefore sets s, and with it the lag of ruling 38 (0 for every task). Rulings 49-52 and item 17's fold-in do not act at s = 1 (rulings 48 and 65). The s > 1 rows predate rulings 49-51 (the plan gives 19, 10 and 7 checkpoints); they do not change s. The number of processes follows ruling 66 (one by default; two or three in one container reached the 4 GB cap, an E4 process was killed at three, for a gain of 1.3 to 1.66 times).
- Ruling 45. Item 29's "GPUs" limit now reads: "the card was used to shorten wall time, and that allowed s = 1, so every stage-B embedding is trained at the task's own parent (ruling 44); large dimensions and card-scale models were still not tested".
- Ruling 46. Nondeterminism. Card kernels may differ from run to run, and floating-point sums differ from the CPU's. Before any card timing was trusted, three checks ran. The shared checks passed on the card. Scores of one trained model agreed between CPU and card within 1.6e-5 on 20 queries per arm, top 10 identical 20 of 20. Each arm's stage-A best configuration was retrained on the card with stage A's split and seed; validation MRR, CPU to card: E1 0.730/0.730, E2 0.752/0.752, E3 0.741/0.723 (same best epoch, 32 queries), E5 0.402/0.401. E4 gave 0.209 under the patience rule and 0.555 at its peak without it, before ruling 42's initialisation fix. After the fix, at a fixed 95 epochs, seeds 1-3: CPU 0.729, 0.657, 0.596 (mean 0.661), card 0.704, 0.648, 0.698 (mean 0.683), read as seed and trajectory variance. These are sanity checks, never a selection input. Seeds are reported per run; a rerun on the card may differ, at validation level by a few hundredths on 32 queries.
- Ruling 47. When the choice was made: the owner approved the card at 08:35Z on 2026-11-14, with 76 of 80 stage-A units finished (E5 c13-c16, none later in E5's top 3, still running); this section was written after stage A finished. Stage A's selection scores (validation MRR on its held-out pairs; they decide only which three configurations go on, item 19) had been seen. No stage-B unit and no task-level embedding score existed then or when this section was accepted. The device was chosen for wall time, and s from the card's timing alone (ruling 44), not from any score. Disclosed: E4's initialisation fix (ruling 42) followed the card sanity runs that showed E4 at 0.209 and 0.555. The fix was kept because it makes E4's initial weights bit-identical to the CPU's, which variant A did not. The validation MRRs of both variants (means 0.626 and 0.683; CPU 0.661) were seen before it was kept.
- Ruling 67. Deterministic E4. Every stage-B and held-out E4 unit (c12, c13, c16; seeds 1 to 3; every checkpoint, every redo and every reference run) trains with PyTorch's deterministic algorithms (`torch.use_deterministic_algorithms(True)`, warn_only off) and `CUBLAS_WORKSPACE_CONFIG=:4096:8`. Reason, measured on the card on 2026-11-14: without them E4 gives different losses from epoch 1 and different score tables on two runs alone, so no E4 result could ever be checked by a re-run; with them E4 repeats byte for byte alone and beside another container, at 8 to 20 % more seconds per epoch. The model, its settings, seeds and data are unchanged; only the order of additions on the card is fixed. The flags are set by a launcher wrapper, not in hashed code; every E4 part records them in its runner field, and assemble refuses an E4 part without them. If a deterministic kernel is missing for c13 or c16, E4 runs in its earlier form, alone, and that is reported with the result.
- Ruling 68. What "unchanged" means when units run side by side (ruling 66). For E1, E2, E3 and deterministic E4: byte-identity of the loss list, every representation tensor, both score tables and the counts, against the same unit trained alone. For E5: identical score tables and counts. E5's representations and losses drift in the last bit from about epoch 29 on some graphs even when it trains alone (four alone runs all differed; the score tables were identical in all ten runs), so byte-identity of its representations cannot be shown for it alone or side by side. Reported as a limit: E5 is not bit-reproducible on the card. A setting that turns out not to repeat alone is held to E5's criterion and named in the result.
- Ruling 43. Item 2 reads: every training, scoring and smoke run uses `--network none`, `--cpus 6`, a memory cap of at most 4 GB (stage B and held-out: 2560m; 2g was the lowest cap that ran every arm), and `--gpus all` for card runs. One lane container at a time unless the coordinator rules otherwise under ruling 66; a container starts only when three samples 30 s apart show host free RAM of at least 4.5 GB and commit charge under 40 GB, and is stopped (its unit redone) after three samples under 2.5 GB free or over 43 GB commit (below the ship coordinator's own alarm at 2 GB / 44 GB). Stage B and held-out keep at most 5 GB on disk. A run's model file is deleted once its scores are written and read back. The representation file ruling 61 keeps per arm is stage A's (CPU; `train/stageA/<arm>/<config>/reps.pt`). Ruling 98. The cap of the remaining stage-B units is 4 GB (item 2's maximum; ruling 43's 2560m is amended for them). Measured on 2026-11-15: the container ran E4 c12 (159 units) and the first 39 units of c13 in one process and was then killed by the kernel at the 2560m cap (exit 137) at 05:55:39Z; each relaunch since has finished exactly one unit and been killed about twenty seconds into the next (05:59:07Z, 06:02:32Z), because the process still holds the first model's memory when the second is built on the larger checkpoints. At one unit per launch the 279 units left would take about sixteen hours, and a launch that finished none would stop the guard. The cap changes no result: it limits memory, not arithmetic; E4 is deterministic (rulings 67 and 87), and the re-run check of the end order trains one c13 and one c16 unit again in a fresh process and compares them byte for byte with the parts made under either cap. The guard script is not edited: its cap is read from the environment, so the same file (sha256 59d3fb8e...) is started with the cap set to 4g, and its start line records it. The guard's memory and disk lines are unchanged. AUDIT.md lists which units ran under which cap, from the guard log, and the result's limits carry this ruling beside ruling 43. If the container is still killed under 4 GB, the lane reports and changes nothing further.
- Ruling 96 (c), a difference between the splits: the held-out graphs carry a layer the tuning graphs lack, so the settings were chosen on graphs without it; they hold one relation type and two node kinds that no tuning checkpoint has, in 69 of the 70 parents (37 relation types against 36).
- Ruling 97 (b), E5's routing on held-out: a file seed tied to the new nodes can get the `other` specialist as its second one, and that specialist is skipped where it has no co_changed fact; This is item 13's rule applied to a graph with a new layer, not a defect. In this run: frozen arm E5: on 23 of 418 held-out tasks the second specialist was `other`; on 9 a routed specialist was skipped (kge.route; e5_route.json). Ruling 97 (d): On held-out the candidate pool and the simple rankers run on a file-collapsed graph in which the new nodes are merged into one non-code file node that links the files they point to. Pools on held-out are therefore wider, for every method alike; median pool size: late 50 41 (313 tasks), held-out 57.5 (418 tasks) (from the parts' and the stage-B counts). Under ruling 97 (d), D1 (r58c/closed-lists/FINDINGS-common.md): On held-out, the PPR comparator and the PPR half of every fused variant walk through the new hub. Their orders, and with them what each budget packs, therefore change on graphs the settings never saw, alike for every arm's fused form.

## Sources

ac_log `assemble_checks.log` 1f1174f81515; anchor `progress.jsonl` 6a8ce0afe451; answer `answer_level.json` 420f1878c308; answer_graded `tune-item24.json` 1a16593d3044; handoff `HANDOFF.json` db7323cbd47e; heldout `heldout.json` 2fa0b8f43d2b; item22 `item22.json` 7f12156e2a46; item27 `item27.json` 3dcd3bdda09a; leak `leak_audit.json` 0b6086c1a678; plan `plan.json` cbc238fe9cb6; protocol `protocol-addendum-8.md` 5ccc042c4fba; route `e5_route.json` 4f674992ef9b; tune `tune.json` 79774be5a0bc; tune_rank `tune-rank.json` 5aa2fd733359; write_result.py 53b629d176b8
