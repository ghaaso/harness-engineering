# arms/floor-co: the CO floor as an arm of its own (addendum 2, B.8)

Revision of 2026-11-12 (search-fix lane). Only TUNE tasks were run (smoke test, 20 tasks).

## What exists

| File | Role |
|---|---|
| `arm.js` | `open()` returns `rank()` with an EMPTY head (`{ranked: [], engine_ms: 0, lookups: 2}`), so the answer is exactly the shared padding tail `pad = CO` (`arms/common/padding.js`: files changed together with the seed file in the counted commits of the facts' `commits.jsonl`, by count, then recency weight, then path; then the DIR order). It refuses any configuration whose pad is not CO, or that carries a graph traversal, rank or search fields. |
| `configs.js` | The whole configuration list: granularity (file, symbol) x form (signature, snippet, paths, range), pad CO. 8 configurations; `node configs.js --write` writes them to `configs/*.json`. |
| `configs/` | The 8 configurations as JSON files for `run.js --config`. |

The floor has no sweep beyond form and granularity (budgets are packed for every answer: 2,000,
4,000, 8,000 and 16,000 tokens). Lookups = 2: one `git log` for the co-changed files and one
directory listing for the DIR rest.

## How to run (inside graphtest:1, as in arms/search/NOTES.md)

```
node /build/arms/common/run.js run --arm floor-co --config /build/arms/floor-co/configs/gran_file_form_signature.json --sets T1,T2 --split tune
```

## Smoke test

On the 20 smoke tasks, all 8 configurations gave answers identical to the built-in arm `none`
with pad CO (160 comparisons, 0 differences; fields arm, wall time, engine time and lookups
ignored).

## Harness-fix2 revision (2026-11-12, addendum 3 D.11 and D.12)

- `arm.js` now reports `lookups: 0` for its empty head. The harness adds the padding tail's lookups
  for every arm in one place (`arms/common/harness.js` PAD_LOOKUPS: CO = 2), so the answer record
  still shows `lookups` = 2 (`lookups_head` 0, `lookups_pad` 2).
- The harness accepts `configs.js` CONFIGS (exactly 8) as this arm's stage-1 list, so the floor runs
  through `sweep.js` on exactly the task set of the swept arms:
  `node arms/common/sweep.js --arms floor-dir,floor-co --sets T1`. `run.js run` also takes
  `--tasks id,id` or `--tasks-file <ids | sweep summary.json>`. A floor has no stage 2.
- The configuration hashes did not change. Re-run results: arms/common/NOTES.md, "Re-run".

## Deviations

- The co-change order uses only the commits the facts extractor kept in `commits.jsonl` (same-PR
  siblings of the task commit are absent there, addendum 2 D.13 and D.14).
