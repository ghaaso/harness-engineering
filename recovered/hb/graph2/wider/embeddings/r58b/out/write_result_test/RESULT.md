# Embedding arms on the code graph: result (addendum 8)

Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)
fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;
item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals). TEST OUTPUT.

## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)

| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word | builder reading (53), sensitivity, no word | pilot-shared commits (56), sensitivity, no word |
|---|---|---|---|---|---|---|---|---|---|
| E1 | +0.019 [+0.011, +0.029] | cannot tell (no evidence either way at this size) | [+0.008, +0.033] at 0.9900 | -0.046 [-0.070, -0.022] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | +0.005 [+0.003, +0.008] | +0.020 [+0.011, +0.030] |
| E2 | +0.047 [+0.032, +0.062] | adds | [+0.028, +0.068] at 0.9875 | +0.054 [+0.026, +0.085] | adds | +0.000 [-0.000, +0.000] | matches | +0.020 [+0.013, +0.029] | +0.049 [+0.033, +0.064] |
| E3 | +0.020 [+0.012, +0.030] | cannot tell (no evidence either way at this size) | [+0.010, +0.032] at 0.9833 | -0.048 [-0.069, -0.026] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | +0.005 [+0.002, +0.008] | +0.020 [+0.012, +0.030] |
| E4 | -0.003 [-0.006, -0.000] | matches | [-0.007, -0.000] at 0.9750 | -0.122 [-0.150, -0.095] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | -0.003 [-0.006, -0.000] | -0.002 [-0.005, +0.000] |
| E5 | -0.003 [-0.006, +0.000] | matches | [-0.006, +0.000] at 0.9500 | -0.125 [-0.155, -0.097] | cannot tell (no evidence either way at this size) (lower) | +0.000 [-0.000, +0.000] | matches | -0.003 [-0.006, +0.000] | -0.003 [-0.006, +0.001] |
| PLACEBO | -0.002 [-0.004, -0.000] | matches | n/a (not an embedding arm) | -0.127 [-0.158, -0.099] | cannot tell (no evidence either way at this size) (lower) | -0.006 [-0.010, -0.001] | matches | -0.002 [-0.006, +0.001] | -0.002 [-0.004, +0.000] |

Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02). The Holm column
gives percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).

Placebo (harness check, ruling 54; harness_check.ok = True): primary word "matches"; fixed-w pool P@10 minus RRF: w0.25 -0.002 [-0.004, -0.000], w0.5 -0.005 [-0.010, -0.000], w1 -0.011 [-0.019, -0.004].

## All metrics, late 50 (item 23; seed means; arm cells: alone / fused)

| list | pool P@10 | pool R@10 | pool R@20 | pool MRR | unres P@10 | unres R@10 | unres R@20 | unres MRR |
|---|---|---|---|---|---|---|---|---|
| E1 | 0.203 / 0.269 | 0.411 / 0.562 | 0.568 / 0.665 | 0.677 / 0.668 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E2 | 0.303 / 0.296 | 0.615 / 0.624 | 0.711 / 0.715 | 0.858 / 0.760 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E3 | 0.201 / 0.269 | 0.405 / 0.574 | 0.558 / 0.663 | 0.631 / 0.660 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E4 | 0.127 / 0.246 | 0.260 / 0.525 | 0.438 / 0.631 | 0.283 / 0.596 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| E5 | 0.124 / 0.247 | 0.262 / 0.521 | 0.448 / 0.631 | 0.270 / 0.590 | 0.026 / 0.251 | 0.066 / 0.541 | 0.123 / 0.665 | 0.105 / 0.613 |
| PLACEBO | 0.122 / 0.247 | 0.249 / 0.521 | 0.416 / 0.630 | 0.261 / 0.595 | 0.022 / 0.246 | 0.042 / 0.521 | 0.088 / 0.655 | 0.079 / 0.572 |
| RRF | 0.249 | 0.531 | 0.630 | 0.610 | 0.251 | 0.541 | 0.665 | 0.613 |
| PPR | 0.215 | 0.450 | 0.586 | 0.538 | 0.217 | 0.461 | 0.604 | 0.541 |
| CO | 0.214 | 0.453 | 0.575 | 0.497 | 0.174 | 0.376 | 0.416 | 0.428 |
| DIR | 0.208 | 0.453 | 0.589 | 0.463 | 0.173 | 0.362 | 0.485 | 0.371 |
| RANDOM | 0.119 | 0.234 | 0.419 | 0.276 | 0.026 | 0.066 | 0.123 | 0.105 |

Every arm-minus-RRF interval for every metric and scope, the sensitivity rows (53, 56) and the comparators are in result.json.

## Seeds alone (item 25): fused minus RRF, pool P@10, per seed

- E1: s1 +0.021 [+0.011, +0.033]; s2 +0.021 [+0.009, +0.034]; s3 +0.016 [+0.008, +0.024]
- E2: s1 +0.048 [+0.033, +0.064]; s2 +0.049 [+0.034, +0.065]; s3 +0.043 [+0.029, +0.059]
- E3: s1 +0.018 [+0.009, +0.029]; s2 +0.021 [+0.012, +0.031]; s3 +0.020 [+0.010, +0.032]
- E4: s1 -0.004 [-0.007, -0.001]; s2 -0.004 [-0.007, -0.000]; s3 -0.002 [-0.006, +0.001]
- E5: s1 -0.002 [-0.006, +0.001]; s2 -0.002 [-0.006, +0.002]; s3 -0.004 [-0.009, +0.000]
- PLACEBO: s1 -0.000 [-0.002, +0.002]; s2 -0.003 [-0.006, +0.000]; s3 -0.003 [-0.007, -0.000]

## Answer level (item 24; tuning split, late 50)

Item 24 is scored by the grader with its full references (files and definitions), as on held-out (ruling 71). The lane handed over ranked lists and packs (shared packer, frozen typed primary options 95e990307da3b42b.json: signature form, file granularity, pad none; 8,000 tokens): handoff/HANDOFF.json, 3 tasks, 3 commits, 40 ranked lists.
Item 24 (grader): not graded yet.

### File recall within 8,000 tokens, lane-computed (not item 24's measure; ruling 71)

Computed by the lane against git's files only (tune truth from git (files of the commit other than the seed, existing at the parent); defs empty); a separate figure, not item 24. Arm cells: alone / fused.

| ranked list | file recall within 8,000 tokens, lane-computed | minus RRF [95 %] |
|---|---|---|
| E1 | 0.204 / 0.732 | -0.528 [-0.750, -0.333] / +0.000 [+0.000, +0.000] |
| E2 | 0.204 / 0.732 | -0.528 [-0.750, -0.333] / +0.000 [+0.000, +0.000] |
| E3 | 0.204 / 0.732 | -0.528 [-0.750, -0.333] / +0.000 [+0.000, +0.000] |
| E4 | 0.204 / 0.732 | -0.528 [-0.750, -0.333] / +0.000 [+0.000, +0.000] |
| E5 | 0.204 / 0.732 | -0.528 [-0.750, -0.333] / +0.000 [+0.000, +0.000] |
| PLACEBO | 0.286 / 0.652 | -0.446 [-0.750, -0.254] / -0.080 [-0.167, -0.032] |
| RRF | 0.732 | reference |
| PPR | 0.732 | +0.000 [+0.000, +0.000] |
| CO | 0.335 | -0.397 [-0.500, -0.190] |
| DIR | 0.679 | -0.054 [-0.286, +0.125] |

## Item 22 (ruling 61): before an arm is called weak

Stage-A held-out triples (32 queries at cd806c80): PPR MRR 0.282, CO MRR 0.002 (all entities).

| arm | config: stage-A MRR (loss ratio as run / to the selection epoch) | stage-B loss ratio median (units) | predict_target check |
|---|---|---|---|
| E1 | c04 0.730 (1.011 / 1.014); c15 0.724 (1.018 / 1.023); c12 0.722 (1.028 / 1.014) | c04 0.853 (2); c12 n/a (0); c15 n/a (0) | c04: 20/20 orders identical, max |diff| 0.0e+00 |
| E2 | c11 0.752 (0.996 / 0.992); c07 0.746 (0.997 / 0.991); c10 0.727 (0.997 / 0.995) | c07 n/a (0); c10 n/a (0); c11 n/a (0) | c11: 14/20 orders identical, max |diff| 2.9e-06 |
| E3 | c11 0.741 (1.044 / 1.031); c03 0.740 (1.042 / 1.019); c13 0.740 (1.033 / 1.030) | c03 n/a (0); c11 n/a (0); c13 n/a (0) | c11: 20/20 orders identical, max |diff| 0.0e+00 |
| E4 | c12 0.729 (0.903 / 0.903); c13 0.685 (0.936 / 0.925); c16 0.681 (0.922 / 0.907) | c12 n/a (0); c13 n/a (0); c16 n/a (0) | c12: 16/20 orders identical, max |diff| 3.8e-06 (fresh model) |
| E5 | c03 0.402 (1.000 / 0.993); c11 0.400 (1.001 / 0.987); c09 0.393 (0.993 / 0.985) | c03 n/a (0); c09 n/a (0); c11 n/a (0) | per specialist: backend 5/5 identical, mobile 5/5 identical, other 5/5 identical, web 5/5 identical |

The loss ratio is a reported number, not a pass mark (ruling 36 stops at the validation peak).

## Item 17 counts for the chosen configuration (ruling 62)

- E1 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E2 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E3 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E4 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.
- E5 (pool, late 50, block choices, seed 1; seeds equal: True; recomputed: True): 0 tasks; 0 with an unscored seed (0 candidate occurrences, 0 distinct candidates); scored seeds: 0 of 0 candidate occurrences unscored (0 distinct), absent at C 0, not in a routed specialist 0; tasks on a checkpoint without co_changed 0; folded 0.

## Held-out (item 27; spent, descriptive only, no section-G word)

Frozen before any held-out unit (2026-11-14T17:24:31): E2 c07, w 1, 20 epochs, s 1, device cpu; all-65 figure 0.2914; tie group E2.
Stored arms of item 7, shown as they are (8,000-token answer recall, 75 commits; nothing of theirs is rerun): typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549.
Not graded yet: the held-out ranked lists and packs go to the grader (truth stays there).

## Lag and leak audit

- Stride s = 1; lag (ruling 52) over late-50 tasks {'0': 313}, over all tune tasks {'0': 388}.
- Leak audit (ruling 60): FAIL; checkpoints and tasks per split {"tune": [53, 388], "heldout": [70, 418]}; failures 0; container mounts listed 19 (table in AUDIT.md, with ruling 35's disclosure).

## Readings recorded

- N3 weights in the paper's convention (weight / 3; the authors' code read, kge.py docstring): c11 0.02 / 3 = 0.006667; c07 0.1 / 3 = 0.03333; c10 0.005 / 3 = 0.001667.
- E5 router (item 13): when every 1-hop neighbour of the seed is in the seed's own area, the seed is routed to that one
  specialist only; this single-area case is the reading of item 13 (kge.route, report.py _route).
- Item 17 counts are for the chosen configuration (per late-50 block; all 65 for the final choice), seed 1, as distinct
  paths and as task-candidate occurrences; candidates of unscored seeds, tasks on checkpoints without co_changed and the
  two ruling-55 cases among scored seeds are separate figures.

## Limits (section I, and the rulings reported as limits)

- One repository (about 233 commits, 5,400 nodes, 19,000 edges): a null says nothing about larger or denser graphs.
- Not tested: temporal or inductive KGE models, text or code embeddings, rule learners, a longer history.
- Truth is what a commit changed, at file level; no agent was run. With 50 evaluation commits the smallest detectable
  difference is several hundredths; "cannot tell" is reported as "no evidence either way at this size".
- Ruling 35. Disclosure: while building the evaluation core, one builder's look at a temp file showed the names of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came from git for the June commits only. The audit records it.
- Ruling 39. Stage A's held-out set is small: the stage-A graph has 162 co_changed pairs, so 16 pairs (32 queries) are held out. Its top-3 filter is noisy; the binding selection is stage B's nested task-level choice. Reported as a limit. Stage A is not restarted (its count, not its scores, prompted this).
- Ruling 44. Stride. s (item 16, ruling 37) is set from the card's timing alone, by the same rule: the smallest of 1, 3, 6, 10 whose projected stage B is under 30 hours, else 10. Value: s = 1, from the card's timing of the selected configurations at ruling 36's epochs (`gpu/stride-gpu-lanes1.json`): projected 14.4 h with one training process (s = 3: 4.8 h; 6: 2.3 h; 10: 1.6 h); 53 tuning checkpoints, 2,385 units, lag 0 for all 388 tasks. No task score was read. On the CPU, ruling 37's projection was not redone after stage A. The CPU timing before stage A gave 375 to 1,464 hours at s = 1 and 41 to 159 hours at s = 10 (`train/stride.json`), so on the CPU no stride fitted 30 hours and s would have been 10 under ruling 37. The card therefore sets s, and with it the lag of ruling 38 (0 for every task). Rulings 49-52 and item 17's fold-in do not act at s = 1 (rulings 48 and 65). The s > 1 rows predate rulings 49-51 (the plan gives 19, 10 and 7 checkpoints); they do not change s. The number of processes follows ruling 66 (one by default; two or three in one container reached the 4 GB cap, an E4 process was killed at three, for a gain of 1.3 to 1.66 times).
- Ruling 45. Item 29's "GPUs" limit now reads: "the card was used to shorten wall time, and that allowed s = 1, so every stage-B embedding is trained at the task's own parent (ruling 44); large dimensions and card-scale models were still not tested".
- Ruling 46. Nondeterminism. Card kernels may differ from run to run, and floating-point sums differ from the CPU's. Before any card timing was trusted, three checks ran. The shared checks passed on the card. Scores of one trained model agreed between CPU and card within 1.6e-5 on 20 queries per arm, top 10 identical 20 of 20. Each arm's stage-A best configuration was retrained on the card with stage A's split and seed; validation MRR, CPU to card: E1 0.730/0.730, E2 0.752/0.752, E3 0.741/0.723 (same best epoch, 32 queries), E5 0.402/0.401. E4 gave 0.209 under the patience rule and 0.555 at its peak without it, before ruling 42's initialisation fix. After the fix, at a fixed 95 epochs, seeds 1-3: CPU 0.729, 0.657, 0.596 (mean 0.661), card 0.704, 0.648, 0.698 (mean 0.683), read as seed and trajectory variance. These are sanity checks, never a selection input. Seeds are reported per run; a rerun on the card may differ, at validation level by a few hundredths on 32 queries.
- Ruling 47. When the choice was made: the owner approved the card at 08:35Z on 2026-11-14, with 76 of 80 stage-A units finished (E5 c13-c16, none later in E5's top 3, still running); this section was written after stage A finished. Stage A's selection scores (validation MRR on its held-out pairs; they decide only which three configurations go on, item 19) had been seen. No stage-B unit and no task-level embedding score existed then or when this section was accepted. The device was chosen for wall time, and s from the card's timing alone (ruling 44), not from any score. Disclosed: E4's initialisation fix (ruling 42) followed the card sanity runs that showed E4 at 0.209 and 0.555. The fix was kept because it makes E4's initial weights bit-identical to the CPU's, which variant A did not. The validation MRRs of both variants (means 0.626 and 0.683; CPU 0.661) were seen before it was kept.
- Ruling 67. Deterministic E4. Every stage-B and held-out E4 unit (c12, c13, c16; seeds 1 to 3; every checkpoint, every redo and every reference run) trains with PyTorch's deterministic algorithms (`torch.use_deterministic_algorithms(True)`, warn_only off) and `CUBLAS_WORKSPACE_CONFIG=:4096:8`. Reason, measured on the card on 2026-11-14: without them E4 gives different losses from epoch 1 and different score tables on two runs alone, so no E4 result could ever be checked by a re-run; with them E4 repeats byte for byte alone and beside another container, at 8 to 20 % more seconds per epoch. The model, its settings, seeds and data are unchanged; only the order of additions on the card is fixed. The flags are set by a launcher wrapper, not in hashed code; every E4 part records them in its runner field, and assemble refuses an E4 part without them. If a deterministic kernel is missing for c13 or c16, E4 runs in its earlier form, alone, and that is reported with the result.
- Ruling 68. What "unchanged" means when units run side by side (ruling 66). For E1, E2, E3 and deterministic E4: byte-identity of the loss list, every representation tensor, both score tables and the counts, against the same unit trained alone. For E5: identical score tables and counts. E5's representations and losses drift in the last bit from about epoch 29 on some graphs even when it trains alone (four alone runs all differed; the score tables were identical in all ten runs), so byte-identity of its representations cannot be shown for it alone or side by side. Reported as a limit: E5 is not bit-reproducible on the card. A setting that turns out not to repeat alone is held to E5's criterion and named in the result.

## Sources

answer `answer_level.json` 5141d9d97152; item22 `item22.json` fcc6f07dac02; item27 `item27.json` ac56692b041f; leak `leak_audit.json` 5a8c17ecf35a; plan `plan.json` cbc238fe9cb6; protocol `protocol-addendum-8.md` 9fdd43d594e6; tune `tune.json` 3eeb7871ac97
