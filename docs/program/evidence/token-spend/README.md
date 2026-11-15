# Token-spend evidence (2026-11-12)

Record: `docs/program/TOKEN-BOTTLENECK-2026-11.md`.

- `parse.js.txt` → one row per API call (dedupe by message id) + sessions; `aggregate.js.txt` → per-repo aggregates; `average.js.txt` → per-repo shares, equal-weight mean, pooled (pooled column has the weighting defect the refuter found; use `bottleneck.json` for pooled token buckets); `bottleneck.js.txt` → bucket sizes, cost by token type with the 5m/1h split, cost by role; `build.js.txt` → the comparison page (`comparison-page.html`, a byproduct, not the deliverable).
- `pricing.json` — list rates from the claude-api skill; the harness's own cost-state reproduces them to the cent (`coststate/`).
- `indep/` — independent re-measurement by a second agent (totals, inventory with work-type classes, tool mix). `refute/` — refuter checks 1–7. `coststate/` — why the harness totals are a lower bound. `fill-*/` — the prior reviewed "what fills the windows" method run over each repo, all time.
- Scripts are saved as `.js.txt`; run with `node - < file.js.txt` from their folder, or rename.
