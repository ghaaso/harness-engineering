# arms/relational

This is the SQLite store and SQL for arm (b). The specification is ../common/SPEC.md. How to run it,
the results and the deviations are in ../common/NOTES.md. This note lists the design and what changed
in the 2026-11-12 harness fix.

- **arm.js** (new): `open(G, opts)` builds or opens `opts.store/<sha>-<tag>.sqlite`.
  - The store folder is GT_STORE/relational when GT_STORE is set, else db/.
  - `rank` returns {ranked, engine_ms}; `tq(question)` answers one TQ question; `close` closes the
    database.
- **sweep.js** (new): BASE, METAPATH and STAGE1, exactly 40 configurations, list hash
  5efda93e9c470eb9. The reference arm re-exports this list.
- **schema.sql**: edges carry `sym`.
  - A symmetric (co_changed) edge is stored once with `sym = 1`, plus a second-orientation row, so
    both ends traverse it.
  - Reverse-direction queries read only rows with `sym = 0`, which keeps a symmetric edge from being
    counted twice.
  - `edge_rev(dst, ekid, src, cid, w, sym)`.
- **db.js**:
  - Loads loader-L5 graphs; cochange is stored in both orientations.
  - The closure table is built only over edges with weight >= closure_minc (0.5, the default
    minConf).
  - meta records closure_minc and loader_version.
- **queries.js**:
  - minConf applies in every unweighted traversal, the reach DAG and the degnorm out-degree.
  - New ordered-metapath queries: state table, moves, step match, accepting states, recursive CTE,
    hop, DAG, emit-end candidates.
  - State-parent explanation queries for the budget and metapath modes (SPEC 7).
- **rel.js**:
  - The closure path is used only when the configuration's minConf equals closure_minc.
  - It refuses `x_` extensions and native variants (specification only).
- **tq.js**: async; it goes through `openArm`. It still writes the diagnostic file
  results/tq/relational.<split>.jsonl. `run.js tq` writes the SPEC 12 answers file.
- **bench.js**: updated for the new schema and paths; it only had a syntax check. It was not re-run,
  so the engine figures in the previous revision are stale.
- **db/**: the stores here predate loader L5 and are stale. A new build replaces them, keyed by tag.

Design, unchanged:
- integer ids;
- WITHOUT ROWID tables;
- FTS5 (unicode61) over the shared node text;
- stored rank columns;
- recursive CTEs with UNION and a depth cap;
- CROSS JOIN where the planner would otherwise scan;
- hub sets and PageRank transitions cached per connection and configuration;
- switchable closure, CTE and level-wise query paths for the cross-check.
