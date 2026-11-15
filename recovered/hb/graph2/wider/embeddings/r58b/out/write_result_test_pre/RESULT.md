# Embedding arms on the code graph: result (addendum 8)

Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)
fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;
item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals). TEST OUTPUT.

## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)

| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word |
|---|---|---|---|---|---|---|---|
| E1 | +0.019 [+0.011, +0.029] | cannot tell | [+0.008, +0.033] at 0.9900 | -0.046 [-0.070, -0.022] | cannot tell (lower) | +0.000 [-0.000, +0.000] | matches |
| E2 | +0.047 [+0.032, +0.062] | adds | [+0.028, +0.068] at 0.9875 | +0.054 [+0.026, +0.085] | adds | +0.000 [-0.000, +0.000] | matches |
| E3 | +0.020 [+0.012, +0.030] | cannot tell | [+0.010, +0.032] at 0.9833 | -0.048 [-0.069, -0.026] | cannot tell (lower) | +0.000 [-0.000, +0.000] | matches |
| E4 | -0.003 [-0.006, -0.000] | matches | [-0.007, -0.000] at 0.9750 | -0.122 [-0.150, -0.095] | cannot tell (lower) | +0.000 [-0.000, +0.000] | matches |
| E5 | -0.003 [-0.006, +0.000] | matches | [-0.006, +0.000] at 0.9500 | -0.125 [-0.155, -0.097] | cannot tell (lower) | +0.000 [-0.000, +0.000] | matches |
| PLACEBO | -0.002 [-0.004, -0.000] | matches | n/a (not an embedding arm) | -0.127 [-0.158, -0.099] | cannot tell (lower) | -0.006 [-0.010, -0.001] | matches |

Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02). The Holm column
gives percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).

Placebo (harness check, ruling 54): primary word "matches"; fixed-w pool P@10 minus RRF: w0.25 -0.002 [-0.004, -0.000], w0.5 -0.005 [-0.010, -0.000], w1 -0.011 [-0.019, -0.004].

## Seeds alone (item 25): fused minus RRF, pool P@10, per seed

- E1: s1 +0.021 [+0.011, +0.033]; s2 +0.021 [+0.009, +0.034]; s3 +0.016 [+0.008, +0.024]
- E2: s1 +0.048 [+0.033, +0.064]; s2 +0.049 [+0.034, +0.065]; s3 +0.043 [+0.029, +0.059]
- E3: s1 +0.018 [+0.009, +0.029]; s2 +0.021 [+0.012, +0.031]; s3 +0.020 [+0.010, +0.032]
- E4: s1 -0.004 [-0.007, -0.001]; s2 -0.004 [-0.007, -0.000]; s3 -0.002 [-0.006, +0.001]
- E5: s1 -0.002 [-0.006, +0.001]; s2 -0.002 [-0.006, +0.002]; s3 -0.004 [-0.009, +0.000]
- PLACEBO: s1 -0.000 [-0.002, +0.002]; s2 -0.003 [-0.006, +0.000]; s3 -0.003 [-0.007, -0.000]

## Answer level (item 24; tuning split, late 50)

Shared packer and scorer, frozen typed primary options (95e990307da3b42b.json: signature form, file granularity, pad none), 8,000 tokens; references from git
(file half only: tune truth from git (files of the commit other than the seed, existing at the parent); defs empty). 3 tasks, 3 commits.

| ranked list | recall within 8,000 tokens | minus RRF [95 %] |
|---|---|---|
| CO | 0.335 | -0.397 [-0.500, -0.190] |
| DIR | 0.679 | -0.054 [-0.286, +0.125] |
| E1_alone | 0.204 | -0.528 [-0.750, -0.333] |
| E1_fused | 0.732 | +0.000 [+0.000, +0.000] |
| E2_alone | 0.204 | -0.528 [-0.750, -0.333] |
| E2_fused | 0.732 | +0.000 [+0.000, +0.000] |
| E3_alone | 0.204 | -0.528 [-0.750, -0.333] |
| E3_fused | 0.732 | +0.000 [+0.000, +0.000] |
| E4_alone | 0.204 | -0.528 [-0.750, -0.333] |
| E4_fused | 0.732 | +0.000 [+0.000, +0.000] |
| E5_alone | 0.204 | -0.528 [-0.750, -0.333] |
| E5_fused | 0.732 | +0.000 [+0.000, +0.000] |
| PLACEBO_alone | 0.286 | -0.446 [-0.750, -0.254] |
| PLACEBO_fused | 0.652 | -0.080 [-0.167, -0.032] |
| PPR | 0.732 | +0.000 [+0.000, +0.000] |
| RRF | 0.732 | reference |

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

## Limits (section I)

- One repository (about 233 commits, 5,400 nodes, 19,000 edges): a null says nothing about larger or denser graphs.
- Not tested: temporal or inductive KGE models, text or code embeddings, rule learners, a longer history.
- Truth is what a commit changed, at file level; no agent was run. With 50 commits only differences of several
  hundredths are detectable: "cannot tell" is not "no effect".

## Sources

- answer `answer_level.json` sha256 f118c41cdfd48224
- item22 `item22.json` sha256 fcc6f07dac023a0f
- item27 `item27.json` sha256 ac56692b041f9a2c
- leak `leak_audit.json` sha256 5a8c17ecf35a53cd
- plan `plan.json` sha256 cbc238fe9cb676ae
- tune `tune.json` sha256 3eeb7871ac971df1
