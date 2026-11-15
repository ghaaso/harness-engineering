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

## Deviations

- The list is in `configs.js`, not `sweep.js`: the harness refuses a stage-1 list that is not
  exactly 40 entries, and a floor has 8. `sweep.js` therefore cannot run a floor; `run.js` runs one
  configuration at a time. A harness option for a fixed floor list was requested.
- The co-change order uses only the commits the facts extractor kept in `commits.jsonl` (same-PR
  siblings of the task commit are absent there, addendum 2 D.13 and D.14).
