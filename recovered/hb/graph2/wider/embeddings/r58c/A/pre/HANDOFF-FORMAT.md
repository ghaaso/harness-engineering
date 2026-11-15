# Hand-off format: what the embeddings lane hands the grader, and what comes back

For the grader session. Two hand-offs: tuning (item 24, ruling 71) and held-out (item 27). Neither holds
truth; the grader holds the references. Every file is listed with its sha256 in its folder's `HANDOFF.json`.

## 1. One naming for both splits (answer-level-6)

- A **variant** is `<ARM>_<KIND>_s<SEED>` or a comparator. ARM is `E1`..`E5` or `PLACEBO` (tuning only).
  KIND is `alone` or `fused`; SEED is 1, 2 or 3. Comparators are `RRF`, `PPR`, `CO` and `DIR`, with no seed.
- `HANDOFF.json` lists every variant with explicit fields, so names never need parsing:
  - tuning: `variant`, `name`, `label` (`<ARM>_<KIND>` or the comparator), `seed`, `arm`, `kind`, `source`, `source_sha256`;
  - held-out: `name`, `arm`, `kind`, `seed`.
- A **seed-mean row** the grader returns is named `<ARM>_<KIND>_mean`, or `<ARM>_<KIND>` in the tuning `labels`.
  The seed mean is item 23's: the mean of the three seeds per task, then per commit, then over commits.
- Scopes are `pool` and `unrestricted`. Only `unrestricted` lists are packed.
- `config_hash` `95e990307da3b42b` inside every answer is the frozen typed primary's **packing options** record.
  It is not an arm. Group answers by the `arm` field, which holds the variant name.

## 2. Files

### Tuning: `train/report/answer_level/handoff/` (answer_level.py tune)

| file | content |
|---|---|
| `HANDOFF.json` | `item` 24, `split` tune, `set` T1, `tasks`, `commits`, `seeds`, `variants` (above), `task_file`, `options` (record, granularity file, form signature, pad none, budgets 2,000/4,000/8,000/16,000, primary 8,000), `packs` (packed, config_hash, ranked_paths_without_file_node = 0), `test`, `note`, `truth_keys_checked`, `files` {path: sha256} |
| `tasks.jsonl` | build/tasks rows: `id`, `parent`, `seed` {path, symbol}, `set` T1, `split` tune; late 50 only |
| `ranked/<variant>_unrestricted.jsonl.gz` | one row per task: `id`, `variant`, `ranked` (paths, best first) |
| `answers/<variant>.jsonl.gz` | one shared-harness answer record per task (`H.answer`; `arm` = the variant name) |

There are 40 variants: 4 comparators, plus 6 arms × alone/fused × 3 seeds.

### Held-out: `train/heldout/` (heldout.py run, one run only)

| file | content |
|---|---|
| `HANDOFF.json` | `format`, `split` heldout, `written`, `freeze` item27.json, `freeze_sha256`, `chosen` {arm, config_id, cfg, w, epochs, ...}, `tasks` (418), `parents` (70), `checkpoints`, `seeds`, `tasks_file_sha256` (pinned), `test` false, `scopes`, `variants` (above), `grading` {evalcore_sha256, truth_rule, aggregation, metrics, answer_level}, `note`, `packs`, `files` {path: sha256} |
| `tasks_used.jsonl` | the 418 build/tasks held-out rows: `id`, `parent`, `seed`, `set`, `split` |
| `tables/<KIND>_<scope>_s<seed>.tsv.gz`, `tables/<COMP>_<scope>.tsv.gz` | score tables: header, then `task_id \t candidate \t score` |
| `tables/counts.json` | per seed, per task: unscored and folded counts (ruling 65) |
| `ranked/<variant>_<scope>.jsonl.gz` | one row per task: `id`, `variant`, `scope`, `ranked` (both scopes) |
| `answers/<variant>.jsonl.gz` | as for tuning (unrestricted lists) |

There are 10 held-out variants: the frozen arm alone and fused for seeds 1 to 3, plus RRF, PPR, CO and DIR.

### The freeze anchor (ruling 80)

At the freeze the coordinator appends one line to the lane's `progress.jsonl`. `heldout.py` reads only
the last such line:

`{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json", "sha256": "<64 hex: sha256 of item27.json>", "t": "<ISO 8601 UTC>"}`

## 3. What the grader returns

### Rank metrics (item 23's definitions)

- Truth: the commit's other modified, not added, code files per `evalcore.CODE` (item 4). R is computed
  against all truth.
- Aggregation: the seed mean per task, then the mean per commit, then the mean over commits.

### Tuning, item 24

A JSON object `{"handoff_sha256": <sha256 of the tuning HANDOFF.json>, "labels": {...}}`.

- `labels` maps `<ARM>_<KIND>` or a comparator to `{"mean": {"primary": x}, "vs_RRF": {"primary": {"diff", "lo", "hi", "p"}}}`.
- `primary` is recall within 8,000 tokens against the full references (files and definitions).
- `vs_RRF` is a paired bootstrap by commit: 10,000 resamples, 95 % percentile interval. RRF itself has none.
- `write_result.py --answer-graded` reads it.

### Held-out, item 27

`write_result.py --heldout` refuses any of the following:

- a different freeze or hand-off hash;
- a test flag on a real run;
- another arm;
- a missing cell.

```
{"split": "heldout", "arm": "<frozen arm>", "test": false,
 "freeze_sha256": "<sha256 of train/heldout/item27.json>", "handoff_sha256": "<sha256 of HANDOFF.json>",
 "commits": 75, "tasks": 418,
 "rank": {"<v>": {"pool": {"P@10": x, "R@10": x, "R@20": x, "MRR": x}, "unrestricted": {...}}},
 "answer_level": {"<v>": x},
 "scorer": {"file": "...", "sha256": "..."}}
```

`<v>` takes 12 values:

- `<ARM>_alone_s1`, `_s2`, `_s3` and `<ARM>_alone_mean`;
- the same four for `fused`;
- `RRF`, `PPR`, `CO` and `DIR`.

`answer_level` is item 24's primary on the held-out references. Return no verdict word (item 27).
