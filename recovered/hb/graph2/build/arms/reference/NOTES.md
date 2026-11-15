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

Changes in the harness-fix2 revision (2026-11-12, addendum 3):
- degnorm (A.1): when a DAG source has no arc under the configured direction, classes and minConf
  (metapath mode only), `od(u)` = the number of reach-DAG arcs leaving it. Before, the division by
  zero gave an infinite activation. `stats.degnorm_od0` counts how often the fallback was used
  (diagnostic only, never in an answer).
- Absent steps (A.4): a metapath step whose kinds and classes have no edge at the commit matches no
  arc, so it reaches nothing (checked in `common/selftest.js` section 13).
- It still refuses every `x_` mode and `variant` (`specOnly`); a sweep over a shared list runs such
  entries only on the list's own arm.

How to run it, and the cross-check results (0 mismatches over 800 smoke comparisons and 260 extra
ones), are in ../common/NOTES.md.

Stage 2 (tuner lane, 2026-11-12 evening): stage2.json is an identical copy of
arms/relational/stage2.json (list hash 52b3f69b93f01360). The cross-check runs it as the relational
list (`sweep.js --arms relational,reference --list relational --stage 2`); its one `x_wsp` entry is an
arm extension that this arm refuses by design and that the shared sweep runs on relational only.
19 specified entries x every TUNE T1, T1x and T2 task: 14,668 pairs, 0 mismatches (arms/relational/NOTES.md).
