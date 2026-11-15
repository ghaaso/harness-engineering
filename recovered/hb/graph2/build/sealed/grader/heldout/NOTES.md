# sealed/grader/heldout: grader lane, HELD-OUT scoring (2026-11-13)

Grader only. Everything here is the one-time held-out grading. No arm was started, nothing was re-run,
no arm code, configuration or answer file was changed. Reference content and per-task scores stay in
this folder (sealed/). The only file written outside it is the marker `results/heldout/SCORING_STARTED`
(`2026-11-13T06:43:27Z`, UTC from the shell), written after the inventory check and before any held-out
answer was opened for scoring. One slip: a compact table of aggregate rows (no reference content, no
per-task score) was written by mistake to `build/tmp/grader_perarm.json` and moved here
(`perarm_compact.json`) within a minute; no arm process ran at any time after the marker.

## 1. Inventory check (before the marker; `verify_inventory.js` -> `verify_inventory.json`)

- `results/frozen/PLAN.json`: 85 set runs + 4 question runs = 89. `results/heldout/runs.jsonl`: 89 lines,
  all `exit ok`, all `repeat 0` (no repeat happened, so none needs explaining), one line per planned
  output path, none for an unplanned one. Each line's arm, hash, set, draw and task count equal the plan,
  and each line's code hash equals the frozen record (`results/frozen/<arm>/<hash>.json` or `tq.json`).
- `INVENTORY.json`: 89 files, the same 89 paths. The sha256 and byte size of every answer file on disk
  equal the inventory; every file has the expected number of lines (T1 418, T1x 82, T2 237, T3 25, T4 8,
  questions 30). No `.part` file or running marker is left; no other file is under `results/heldout/`.
- The runner's input hashes (tasks, questions, facts) before and after the run are byte-identical to the
  audit's record (`tmp/runner/input_hashes*.json`, addendum 5 item 9).
- Problems found: none.

## 2. Scoring (same code as TUNE)

- `score_heldout.js`: `arms/common/score.js`, rule content, against `refs_heldout.jsonl` (the held-out
  lines of `sealed/references.jsonl` for T1, T1x, T2, T3, T4; T5 was not run). 0 missing references,
  0 zero-unit references in every file. The reference arm is not scored (addendum 4 item 5).
  Outputs: `scores.json` (one row per arm, role, set, draw, with the TUNE primary of the same
  configuration beside it), `clusters.jsonl` and `tasks.jsonl.gz` (per commit and per task).
- Clusters, as score.js defines them: the commit for T1, T1x, T2 (75, 9 and 49 commits); the fix commit
  for T4 (4); the task for T3 (25 tasks; the T3 references carry no commit field, and they come from only
  4 parent commits and 3 documents, so T3 intervals are probably too narrow).
- `handcheck.js` -> `handcheck.json`: 7 answers (relational T1 x3, search T1 x2, floor-co T2, LadybugDB s2
  T3) re-scored with independent code: 7 of 7 equal to score.js.
- `compare_heldout.js`: `arms/common/compare.js` paired cluster bootstrap, 10,000 resamples, seed
  20261112; questions with `arms/common/tq_score.js`, paired bootstrap over questions (same generator,
  10,000, same seed). `finalize_h4.js` applies the wording rule to the questions.
- Judgement items for the held-out questions (`judgement_heldout.json`, the 7 of the 12 shared ones that
  fall on held-out questions, from `sealed/tq_agreement.txt`): Q21 `device`; Q25
  `JobService._money_rates`; Q31 L239, L243, L246; Q39 L224, L199. All 7 are items both readers left
  OUT, so "without" removes them from answers only.

## 3. Tables (T1 primary = recall of reference files and definitions inside the 8,000-token answer,
mean over commits; tokens = answer tokens; lookups = median per answer)

| arm, role | T1 primary +- se | r@2k | r@4k | r@16k | AUC | med tokens | med lookups | share reaching 80 % / median tokens to 80 % | TUNE T1 primary |
|---|---|---|---|---|---|---|---|---|---|
| relational = LadybugDB = DuckPGQ, primary | 0.700 +- 0.022 | 0.416 | 0.560 | 0.832 | 0.628 | 7,999 | 1 | 0.66 / 7,152 | 0.785 |
| same, s1 (hops=4) | 0.711 +- 0.023 | 0.402 | 0.560 | 0.828 | 0.629 | 7,999 | 1 | 0.62 / 6,857 | 0.768 |
| LadybugDB s2, stored draw | 0.716 +- 0.023 | 0.422 | 0.570 | 0.838 | 0.637 | 7,999 | 1 | 0.66 / 7,220 | 0.786 |
| search primary | 0.625 +- 0.031 | 0.346 | 0.458 | 0.764 | 0.554 | 7,999 | 6 | 0.52 / 7,014 | 0.759 |
| search s2 | 0.634 +- 0.031 | 0.360 | 0.476 | 0.768 | 0.564 | 7,999 | 8 | 0.53 / 6,643 | 0.764 |
| floor-dir | 0.549 +- 0.031 | 0.338 | 0.435 | 0.720 | 0.510 | 7,999 | 1 | 0.47 / 7,617 | 0.719 |
| floor-co | 0.638 +- 0.033 | 0.362 | 0.475 | 0.772 | 0.566 | 7,999 | 2 | 0.56 / 6,283 | 0.752 |

T2, T3, T1x, T4 and the four further draws are in `scores.json` and `report_data.json`.
T2 primary: typed 0.629, s1 0.643, LadybugDB s2 0.592, search 0.596, search s2 0.600, floor-dir 0.340,
floor-co 0.602. T3: typed 0.643, s1 0.682, LadybugDB s2 0.670, search 0.480, search s2 0.533, floor-dir
0.423, floor-co 0.473. T1x (descriptive, 9 commits): every arm 0.49 to 0.54. T4 (descriptive, 8 tasks,
4 fix commits): typed 0.702, search 0.489, floor-co 0.457, floor-dir 0.288.

## 4. Comparisons (difference A - B on the T1 primary, 95 % interval; verdict by addendum 3 item 18)

- **H1** LadybugDB primary - relational primary, T1: 0 [0, 0]: **equivalent**. The answers score
  identically on every commit of every set: the difference is exactly zero by construction (same
  specification, same parameters). It shows the engines give the same answer quality for this shared
  configuration; it does not show that no engine-native configuration could add quality (that is H1b),
  and it says nothing about engine cost (H5). (Relational's ranked list differs from the other two on
  2 T1, 1 T1x and 2 T2 tasks in the hash of the ranked list only; the shown items are identical.)
- **H2** LadybugDB and DuckPGQ each - relational, T1, T2, T3: all exactly 0: **equivalent**, same reading.
- **H1b** LadybugDB s2 (stored draw) - relational primary: T1 +0.015 [-0.010, 0.042]; T2 -0.037
  [-0.083, 0.007]; T3 +0.027 [-0.020, 0.093]: **equivalent** (decided by: the whole T1 interval lies
  within +-0.05; it includes zero, so "better" was not reached). T1 primary over the five community draws:
  0.716, 0.732, 0.719, 0.709, 0.716 (sd 0.008); differences against relational +0.009 to +0.032; draw 1
  alone excludes zero (+0.032 [0.004, 0.061]). At 2,000 and 4,000 tokens: +0.006 and +0.010, both
  intervals include zero.
- **H3** typed primary (all three typed arms) against:
  - search primary: T1 +0.076 [0.036, 0.118], T2 +0.033 [-0.024, 0.091], T3 +0.163 [0.010, 0.327],
    questions +0.100: **better** (T1 interval excludes zero; median tokens 7,999 = 7,999; sign agrees on
    4 of 4).
  - floor-dir: T1 +0.151 [0.092, 0.207], T2 +0.289, T3 +0.220: **better** (3 of 3 signals; floors have no
    questions).
  - floor-co: T1 +0.063 [0.019, 0.110], T2 +0.027 [-0.045, 0.104], T3 +0.170: **better** (3 of 3).
  - search s2: T1 +0.066 [0.027, 0.108], T2 +0.028, T3 +0.110, questions +0.100: **better** (4 of 4).
  - At 2,000 / 4,000 tokens, and AUC, every one of these four intervals excludes zero (search +0.070 /
    +0.102, floor-dir +0.078 / +0.125, floor-co +0.054 / +0.085, search s2 +0.056 / +0.084).
  - s1 rows (no verdict): typed s1 - search +0.086 [0.050, 0.126], - floor-dir +0.161, - floor-co +0.073.
- **H4** questions, typed stores (relational; LadybugDB and DuckPGQ answered all 30 identically) -
  search, macro F1: all 30 +0.100 [-0.060, 0.257] (inconclusive); 23 untouched +0.189 [0.049, 0.346]
  ("better" on its own). Without the judgement items: 30 +0.078 [-0.076, 0.232]; 23 +0.159 [0.028,
  0.309]. Verdicts differ, so **H4 is inconclusive** (addendum 5 item 5). Precision 0.758 vs 0.654,
  recall 0.808 vs 0.789, micro F1 0.834 vs 0.460, median tokens 31 vs 695, median lookups 1 vs 2 (30
  questions). Touched questions (F1, each typed arm alike / search): 24 0 / 0; 27 1 / 1; 33 1 / 0.33;
  40 0 / 0; 41 1 / 1; 46 0 / 1; 47 0 / 1.
- **H5** is measured after this grading by another lane (addendum 5 section C).

## 5. Other checks

- Removed documents (T3, T4; whole paths, addendum 5 item 11): 34 answer files (every arm and role
  including the reference arm and the four draws), the removed path in shown items, beyond-budget
  sample, seeds or explanation edges: 0 times. 20 of the 25 T3 removals were no-ops (the document did not
  exist at the parent, by design).
- Definitions with no node (`nonode.js`; a definition has a node if a symbol node of its path starts on
  its first line, or has the same last name and contains that line): held-out T1 354 of 3,150 (11.2 %),
  of which variables and objects 252 (8.0 %); T2 79 of 338; T4 6 of 60; T3 0 of 39. With the same rule on
  TUNE T1: 364 of 4,162, variables and objects 212 (5.1 %); the audit's own method gave 182 (4.4 %).
- By runtime of the seed (T1): typed - search backend +0.012 [-0.038, 0.065] (45 commits), web +0.025
  [-0.055, 0.119] (7), mobile +0.151 [0.097, 0.207] (31). floor-co beats typed on backend seeds (0.709 vs
  0.699) and floor-dir on web seeds (0.773 vs 0.664), neither interval excludes zero.

## 6. What contradicts a simple summary

- Every row lost 0.06 to 0.17 T1 recall from TUNE to HELD-OUT (typed primary 0.085, search 0.135,
  floor-dir 0.170, floor-co 0.115, s1 0.058), and the gap between the typed arms and search
  grew from +0.026 (TUNE) to +0.076.
- The H3 win on T1 comes from mobile seeds; on backend and web seeds it is not distinguishable from zero.
- The rule as first written (s1, hops=4) scored higher on held-out than the amended choice (+0.011
  [-0.004, 0.026] on T1, higher on T2 and T3 as well).
- LadybugDB s2 is above relational on T1 and T3 but below on T2 and T4; the community draw moves T1 by
  as much as the effect.
- The typed arms lose 4 of the 7 touched questions outright; question 40 is still answered empty after
  the cut-back fix.
- Every answer fills its budget (median 7,999 tokens), so the tokens condition of the wording rule never
  decided a verdict.
