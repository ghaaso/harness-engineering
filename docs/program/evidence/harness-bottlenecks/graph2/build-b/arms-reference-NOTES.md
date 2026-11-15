# arms/reference

ref.js is arm (d): the algorithms in ../common/SPEC.md, run on in-memory adjacency arrays. It shares no
code with the relational arm and loads the same canonical graph. Its output must match the relational
arm's for the same parameters, and any difference is a defect. BM25 is reimplemented to match FTS5
exactly. Scores are rounded the same way (12 decimals, 9 for BM25), so ties break identically.

Changes in the 2026-11-12 harness fix:
- Symmetric co_changed edges give one arc from each end in every direction.
- minConf is applied as SPEC 4 and 8 state.
- The ordered metapath automaton works in states (j, c), with emit all or end.
- Budget and metapath explanations follow state parents.
- `explainChecker(seedIds, cfg)` is used by common/equiv.js to validate any arm's explanation paths.
- `specOnly` refuses `x_` extensions and native variants.
- arm.js (new): `open(G)` returns {rank (with engine_ms), close, ref}.
- sweep.js (new): re-exports arms/relational/sweep.js, so this arm mirrors the relational stage-1 list.

How to run it, and the cross-check results (0 mismatches over 800 smoke comparisons and 260 extra
ones), are in ../common/NOTES.md.
