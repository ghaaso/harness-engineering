# Hand-off format, version 2: what the embeddings lane hands the grader, and what comes back

**Version 2, revision 1** (2026-11-14; revision 1 adds two keys, `absent_tasks` (ruling 91) and `test_set`, names the
grader's fixed test sets and the TEST tuning hand-off's 10 variants, and describes the lane's pre-check; nothing of
revision 0 changes. Revision 0 was sha256 `e5b3c45d2ddee36dd7b4f8c607b19fcc96ad34fda41b07531f53229272c69b21`; the `format` string in
every `HANDOFF.json` stays `train/HANDOFF-FORMAT.md version 2`). Replaces version 1 (sha256 `bbd0107e3544b14a337573da4152c123b5208bf018299f5d76eea014ed2036e2`).
Binding source: `orchestrator/grader-interface-v2.md` (sha256 `e707a87889c6fa63f84cf318a103412ae6f76527c91b0cb0c6caad465187e878`),
ruling 88, and `critic.format_changes_for_grader` of `orchestrator/scoring-delta-review.json`. Where this file and the
interface file differ, the interface file wins; this file repeats it key for key and adds only the lane's file layout.

For the grader session. Two hand-offs: tuning (item 24 and the ruling-88b cross-check, ruling 71) and held-out
(item 27). Neither holds truth; the grader holds the references. Every file is listed with its sha256 in its folder's
`HANDOFF.json` `files`.

## 0. Changes against version 1

1. Rules paragraph (section 3.1): the metric, aggregation, tie and bootstrap rules cited line by line from
   `eval/evalcore.py` (sha256 `4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff`).
2. Ranking: the grader ranks from the ranked lists exactly as given and never re-sorts (interface 3).
3. Resampling unit: the task commit, from the grader's sealed records, never the parent (interface 4).
4. Seed mean: `<ARM>_<KIND>_mean` in both splits (interface 1); version 1's bare `<ARM>_<KIND>` tuning label is gone.
5. Tuning hand-off: `ranked/<variant>_pool.jsonl.gz` for all 40 variants beside the unrestricted lists (interface 2);
   `HANDOFF.json` names `train/report/tune.json` as the 1e-9 cross-check target and gives the truth rule (`cross_check`).
6. Held-out hand-off: `HANDOFF.json` carries the coordinator's `item27_freeze` line verbatim (`anchor_line`); the
   grader takes the freeze hash and the hand-off hash from the coordinator and refuses a difference (interface 7).
7. Returns: three files `tune-rank.json`, `tune-item24.json`, `heldout.json` under `LANE/grader-returns/`
   (test runs under `LANE/grader-returns/test/`), with their exact keys; `heldout.json` gains `vs_RRF` (ruling 88d)
   and `literal_check` (ruling 73).
8. Number rules: metrics finite in [0, 1], differences and interval bounds finite in [-1, 1]; aggregates only.
9. Caveats (section 5): candidate universe = code files only; item 7's stored figures are context, not like-for-like
   (ruling 88g).
10. Revision 1 (ruling 91): both `HANDOFF.json` files carry `absent_tasks` = `{<variant name>: {"pool": n,
    "unrestricted": n}}` for every variant (0 included): the number of the hand-off's tasks with no row in that
    variant's score table. Such a task is ranked by the fixed tie-break alone (its ranked list is still there). Only
    an arm alone and CO can be absent: on tuning, `answer_level.py` refuses a fused, RRF, PPR or DIR table missing a
    late-50 task, a CO absence where `evalcore.co_scores` finds a co-change candidate, and an alone absence whose
    stage-B counts show a scored candidate. The grader may ignore the key; agent B's result shows it beside the
    variant's figures.
11. Revision 1: TEST hand-offs use the grader's fixed test set `pick8` or `late50` (`HANDOFF.json` `test_set`) and a
    TEST tuning hand-off carries 10 variants (section 2, "Test hand-offs"); the lane pre-checks every hand-off with
    the grader's refusals 1 to 9 (section 2, "The lane's pre-check").

## 1. One naming for both splits

- A **variant** is `<ARM>_<KIND>_s<SEED>` or a comparator. ARM is `E1`..`E5` or `PLACEBO` (tuning only).
  KIND is `alone` or `fused`; SEED is 1, 2 or 3. Comparators are `RRF`, `PPR`, `CO` and `DIR`, with no seed.
- The **seed-mean row** of an arm is `<ARM>_<KIND>_mean` in both splits and in every return. Comparators keep
  their bare names. The seed mean is item 23's: the mean of the three seeds per task, then per commit, then over
  commits.
- `HANDOFF.json` lists every variant with explicit fields, so names never need parsing:
  - tuning: `variant`, `name`, `label` (`<ARM>_<KIND>` or the comparator), `mean_row` (`<ARM>_<KIND>_mean` or the
    comparator), `seed`, `arm`, `kind`, `source`, `source_sha256`, `pool_source`, `pool_source_sha256`;
  - held-out: `name`, `arm`, `kind`, `seed`, `mean_row`.
- Scopes are `pool` and `unrestricted`. Only `unrestricted` lists are packed.
- `config_hash` `95e990307da3b42b` inside every answer is the frozen typed primary's **packing options** record.
  It is not an arm. Group answers by the `arm` field, which holds the variant name.

## 2. Files

### Tuning: `train/report/answer_level/handoff/` (answer_level.py tune)

| file | content |
|---|---|
| `HANDOFF.json` | `format` (this file, version 2), `item` 24, `split` tune, `set` T1, `tasks`, `commits`, `seeds`, `variants` (above), `mean_rows`, `task_file`, `options` (record, granularity file, form signature, pad none, budgets 2,000/4,000/8,000/16,000, primary 8,000), `packs` (packed, config_hash, ranked_paths_without_file_node = 0), `cross_check` (below), `plan_hash`, `tables_digest`, `test`, `test_set` and `absent_tasks` (revision 1), `note`, `truth_keys_checked`, `files` {path: sha256} |
| `tasks.jsonl` | build/tasks rows: `id`, `parent`, `seed` {path, symbol}, `set` T1, `split` tune; late 50 only |
| `ranked/<variant>_pool.jsonl.gz` | one row per task: `id`, `variant`, `ranked` (paths, best first), the pool scope |
| `ranked/<variant>_unrestricted.jsonl.gz` | the same shape, the unrestricted scope |
| `answers/<variant>.jsonl.gz` | one shared-harness answer record per task (`H.answer`; `arm` = the variant name) |

There are 40 variants: 4 comparators, plus 6 arms × alone/fused × 3 seeds, each with both ranked files.

`cross_check` (ruling 88b): `target` `train/report/tune.json`; `set` `late50`; the paths in that file the grader's
`tune-rank.json` `rank` is compared with to 1e-9 by the coordinator, both scopes, the four metrics:
- `<ARM>_<KIND>_mean` ↔ `arms.late50.<scope>.<ARM>_<KIND>.seed_mean.<metric>`;
- `<ARM>_<KIND>_s<k>` ↔ `arms.late50.<scope>.<ARM>_<KIND>.per_seed.<k>.<metric>`;
- a comparator `<C>` ↔ `comparators.late50.<scope>.<C>.<metric>`;
- `truth_rule`: item 4, the commit's other modified (not added) code files per `evalcore.CODE`; the lane's tuning
  truth is the `truth` field of `eval/tune_tasks.jsonl` (its sha256 is in `cross_check.lane_truth_sha256`; no truth
  is in the hand-off).

### Held-out: `train/heldout/` (heldout.py run, one run only)

| file | content |
|---|---|
| `HANDOFF.json` | `format` (this file, version 2), `split` heldout, `written`, `freeze` item27.json, `freeze_sha256`, `anchor_line` (the coordinator's line, verbatim), `chosen` {arm, config_id, cfg, w, epochs, ...}, `tasks` (418), `parents` (70), `checkpoints`, `seeds`, `tasks_file_sha256` (pinned), `test` (false in the real run; `test_set`, revision 1, null in the real run; a TEST hand-off built on tuning parents keeps `split` heldout and sets `test` true and an `anchor_line` marked `"test": true`), `scopes`, `variants` (above), `mean_rows`, `absent_tasks` (revision 1), `grading` {evalcore_sha256, truth_rule, aggregation, metrics, answer_level, ranking, resampling_unit}, `note`, `packs`, `files` {path: sha256} |
| `tasks_used.jsonl` | the 418 build/tasks held-out rows: `id`, `parent`, `seed`, `set`, `split` |
| `tables/<KIND>_<scope>_s<seed>.tsv.gz`, `tables/<COMP>_<scope>.tsv.gz` | score tables (reference material only): header, then `task_id \t candidate \t score` |
| `tables/counts.json` | per seed, per task: unscored and folded counts (ruling 65) |
| `ranked/<variant>_<scope>.jsonl.gz` | one row per task: `id`, `variant`, `scope`, `ranked` (both scopes) |
| `answers/<variant>.jsonl.gz` | as for tuning (unrestricted lists) |

There are 10 held-out variants: the frozen arm alone and fused for seeds 1 to 3, plus RRF, PPR, CO and DIR.

### Test hand-offs (revision 1)

A TEST hand-off has `test` true and uses one of the grader's two fixed test task sets, named in `HANDOFF.json`
`test_set` (`null` in the real hand-offs) and made by `answer_level.test_set_ids` (`--test-set` of `answer_level.py
tune --test` and of `heldout.py run --test`):
- `pick8`: the late-50 tuning commits of `eval/tune_commits.jsonl` sorted by `date_order`, positions 0, 6, 12, 18,
  24, 30, 36, 42 (0-based): `ec1b5dfb5af0`, `d26c2b056044`, `e31123233553`, `1e345dead615`, `08e829bef3cb`,
  `245e299d403a`, `83b3ef8f4c8e`, `ec2076cfdb35` (date_order 16 to 58 in steps of 6), 37 tasks;
- `late50`: all 50 late-50 commits, 313 tasks.
The tuning form runs on these tasks; the held-out form runs on the same tasks at their own parents (8 for pick8),
with a TEST item-27 record and a TEST anchor line (`"test": true`). A TEST tuning hand-off carries 10 variants: the
4 comparators and ONE arm alone and fused for seeds 1 to 3 (the real tuning hand-off carries 40). Every other key,
file and row shape is the real one's, `cross_check.lane_truth_sha256` included.

### The lane's pre-check (`r58c/A/precheck_handoff.py`)

Before a hand-off goes out the lane runs the grader's refusals 1 to 9 on it (`--dir D --split tune|heldout [--test]
--expect-sha256 H [--freeze F]`): (1) the HANDOFF.json sha256, `test` and `split`; (2) held-out `anchor_line` naming
`train/heldout/item27.json` with the freeze sha256; (3) every listed file present, equal, not a link, inside the
folder; (4) tuning `cross_check.lane_truth_sha256`; (5) the variant set, `label`, `mean_row`; (6) the task set;
(7) the ranked lists (every task once, `variant`/`scope`, no repeated path, code files of the parent only, never the
seed, an unrestricted list holding every code file of the parent but the seed); (8) the answers (the head of the
variant's unrestricted list, parent and first seed, the 8,000 budget adding up); (9) held-out `tables/counts.json`
listed with s1..s3 and every task at a 40-hex checkpoint in every seed.

### The freeze anchor (rulings 80, 88e)

At the freeze the coordinator appends one line to the lane's `progress.jsonl`:

`{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json", "sha256": "<64 hex: sha256 of item27.json>", "t": "<ISO 8601 UTC>"}`

`heldout.py` refuses unless exactly one such line exists and its `file` is `train/heldout/item27.json`, and copies it
verbatim into `HANDOFF.json` `anchor_line`. The grader never takes the freeze hash or the hand-off hash from a file
the lane can write: the coordinator gives it the expected sha256 of `HANDOFF.json` and, for held-out, the freeze
sha256, and the grader refuses a difference.

## 3. What the grader returns

### 3.1 Rules (item 23; `eval/evalcore.py`, line numbers of sha256 `4054976c...`)

- **Ranking.** The grader ranks from the ranked lists exactly as given and never re-sorts. Score tables are
  reference material. (The lane's lists were made by `evalcore.rank`, lines 192-199: scored candidates by score
  descending, ties and the unscored block in the order of `tiebreak`, lines 187-189 =
  blake2b(`TIE_SEED|task_id|candidate`), `TIE_SEED` = 20261114 at line 29; NaN counts as unscored, line 196.)
- **Truth** (item 4): the commit's other modified, not added, code files per `evalcore.CODE` (line 26).
- **Metrics**, `evalcore.task_metrics` (lines 202-210) exactly:
  - P@10 = hits in the first ten places / 10, always (h10 at line 206, `h10 / 10.0` at line 210), also when the list
    is shorter than ten;
  - R@10 and R@20 = hits in the first 10 or 20 / max(|truth|, 1) (line 205, `n = max(len(T), 1)`; line 210);
  - MRR = 1 / rank of the first truth file over the WHOLE list, 0 without a hit (lines 207-209);
  - a task with empty truth stays in the means (scores 0; nothing filters it: `evaluate_table` lines 217-221,
    `mean_over_seeds` lines 224-228, `per_commit` lines 231-238).
- **Aggregation**: the mean of the three seeds per task (`mean_over_seeds`, lines 224-228), then the mean per
  commit (`per_commit`, lines 231-238), then the mean over commits (`summary`, lines 241-244).
- **Resampling unit**: the task commit, from the grader's sealed records, never the parent (70 held-out parents
  carry 75 commits; on tuning `per_commit` groups by `t['commit']`, line 236).
- **Intervals**: `evalcore.paired` (lines 260-265) on per-commit differences, through `evalcore.bootstrap`
  (lines 248-257) as written: `np.random.default_rng(seed)` with seed 0 (lines 248, 251); B = 10,000 resamples
  (line 248); `r.integers(0, n, (B, n))`, one (B, n) draw of commit indices (line 252); the resample means
  (line 253); `np.percentile` with its default linear method at 2.5 and 97.5 (lines 254-255; level 0.95);
  p = min(1, 2 × min(share of means ≤ 0, share ≥ 0)) (line 256). The same for the rank metrics and the
  answer-level measure.

### 3.2 Where and how

The grader writes its returns under `LANE/grader-returns/` (test runs under `LANE/grader-returns/test/`), a folder
only the grader writes. JSON; finite numbers only; metrics in [0, 1]; differences and interval bounds (`diff`, `lo`,
`hi`) in [-1, 1]; `p` in [0, 1]. Aggregates only: no per-task figure, no reference content.

`scorer` = `{"files_sha256": <sha256 of the grader's HASHES.txt>, "evalcore_sha256": ..., "score_js_sha256": ...}`.

### 3.3 Tuning rank check, `tune-rank.json` (ruling 88b)

```
{"split": "tune", "test": bool, "handoff_sha256": s, "tasks": n, "commits": n,
 "rank": {"<variant or _mean row>": {"pool": {"P@10": x, "R@10": x, "R@20": x, "MRR": x}, "unrestricted": {...}}},
 "truth": {"rule": "item 4", "tasks_checked": n, "equal_to_lane": n},
 "scorer": {...}}
```

`rank` keys: the 40 variants of the hand-off plus the 12 rows `<ARM>_<KIND>_mean`. The coordinator compares `rank`
with `cross_check`'s paths in the lane's `tune.json` (late 50: per seed, seed mean, comparators; both scopes; four
metrics) to 1e-9 before the item-27 freeze; a difference stops the work until it is explained.

### 3.4 Tuning item 24, `tune-item24.json`

```
{"split": "tune", "test": bool, "handoff_sha256": s, "tasks": n, "commits": n,
 "labels": {"<ARM>_<KIND>_mean or comparator": {"mean": {"primary": x},
   "per_seed": {"s1": x, "s2": x, "s3": x}, "vs_RRF": {"primary": {"diff": x, "lo": x, "hi": x, "p": x}}}},
 "scorer": {...}}
```

16 labels: 6 arms × alone/fused (`<ARM>_<KIND>_mean`), plus the 4 comparators. `RRF` has no `vs_RRF`; comparators
have no `per_seed`. `primary` is recall within 8,000 tokens against the full references (files and definitions).
`vs_RRF` is the paired bootstrap by commit of section 3.1. `write_result.py --answer-graded` reads it.

### 3.5 Held-out, item 27, `heldout.json`

```
{"split": "heldout", "arm": "<frozen arm>", "test": false,
 "freeze_sha256": "<sha256 of train/heldout/item27.json>", "handoff_sha256": "<sha256 of HANDOFF.json>",
 "commits": 75, "tasks": 418,
 "rank": {"<v>": {"pool": {"P@10": x, "R@10": x, "R@20": x, "MRR": x}, "unrestricted": {...}}},
 "answer_level": {"<v>": x},
 "vs_RRF": {"<ARM>_fused_mean": {"pool_P@10": {"diff": x, "lo": x, "hi": x},
                                  "unrestricted_P@10": {...}, "answer_level": {...}},
            "<ARM>_alone_mean": {...}},
 "literal_check": {"tasks": 418, "task_commit_in_checkpoint_history": 0, "parent_mismatch": 0},
 "scorer": {...}}
```

`<v>` takes 12 values: `<ARM>_alone_s1`, `_s2`, `_s3` and `<ARM>_alone_mean`; the same four for `fused`; `RRF`,
`PPR`, `CO` and `DIR`. `answer_level` is item 24's primary on the held-out references. `vs_RRF` (ruling 88d) is the
paired difference, seed mean, of the arm fused minus RRF and of the arm alone minus RRF, by commit, 10,000 resamples,
95 % percentile interval (section 3.1), for pool P@10, unrestricted P@10 and the answer-level measure; it is
description only. Return no verdict word (item 27, section G). `literal_check` is ruling 73's check from the grader's
sealed records.

## 4. Refusals

- The grader (interface 7). In real mode it receives from the coordinator the expected sha256 of the hand-off's
  `HANDOFF.json` and, for held-out, the freeze sha256; it refuses a difference, verifies every file hash
  `HANDOFF.json` lists, refuses a hand-off whose test flag is set, refuses a variant set or task set other than the
  expected one, and refuses to grade the held-out split a second time. Test mode refuses a hand-off whose test flag
  is not set.
- `write_result.py` (interface 8) checks, for each return it reads: `split`; `test` false in real mode;
  `handoff_sha256` equal to the hand-off the lane wrote; for held-out `freeze_sha256` equal to the anchored record;
  `tasks` and `commits` (418 and 75 on held-out); the exact key sets (no missing and no extra variant, metric or
  scope); every number finite and in [0, 1] (differences and interval bounds in [-1, 1]); the `scorer` block present.

## 5. Caveats the result states

- The candidate universe is code files only: `evalcore.CODE` (line 26), `^(backend|src|technician-app)/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$`.
  Every embedding list ranks code files only.
- Ruling 88g: beside item 7's stored figures the result says that the embedding lists rank code files only and were
  packed by an adapter (`train/answer_level.js`), so those figures are context and not a like-for-like comparison;
  the like-for-like comparison is with RRF, PPR, CO and DIR packed the same way.
