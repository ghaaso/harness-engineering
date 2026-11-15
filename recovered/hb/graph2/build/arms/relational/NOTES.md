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
- **tq.js**: async; it goes through `openArm`. `run.js tq` writes the SPEC 12 answers file (the
  diagnostic file location changed in the next revision, below).
- **bench.js**: updated for the new schema and paths; it only had a syntax check. It was not re-run,
  so the engine figures in the previous revision are stale.
- **db/**: the stores here predate loader L5 and are stale. A new build replaces them, keyed by tag.

Changes in the harness-fix2 revision (2026-11-12, addendum 3):
- **queries.js `degnorm_od`** (A.1): when a DAG source has no arc under the configured direction,
  classes and minConf (metapath mode only), its out-degree is the number of reach-DAG arcs leaving
  it (`COUNT(*)` over the per-query `dag` table, which holds each (u, v, kind, orientation) once).
  Before, SQLite's division by zero gave NULL and `SUM` dropped the term.
- **Absent steps** (A.4): `mp_ok` is built from the (kind, class) pairs present at the commit, so a
  metapath step whose kinds are all absent matches no edge and reaches nothing; no error. Checked in
  `common/selftest.js` section 13 and in the random cross-check.
- **rel.js**: `checkModes` replaces `specOnly`. Every `variant` is refused; an `x_` mode is refused
  unless registered in `EXT_TRAVERSAL` / `EXT_RANK` (none yet). A stage-2 `x_` mode written in SQL is
  added there with a written definition and a toy-graph hand check (D.9); an `x_` traversal fills
  the hop and dag tables, an `x_` rank fills sc and orders like degnorm unless given its own order.
- **tq.js**: the diagnostic file moved to results/relational/tq_diagnostic/relational.<split>.diag.jsonl;
  the only answer file is results/tq/relational.<split>.answers.jsonl (written by common/run.js tq).
- The stores did not need a rebuild (the schema and loader did not change); the re-run reused the
  stores on the named volume gt-relational.

## Stage 2 (tuner lane, 2026-11-12 evening; protocol addendum 3 section D)

Proposed from this arm's own stage-1 TUNE score table only (results/tuner/relational.stage1.*; no
other arm's table, no per-task data, no references). Nothing was scored, selected or frozen; no
HELD-OUT task or question was run (the lock refused a held-out attempt in the run log).

**What stage 1 said (T1, primary = recall of reference files and definitions inside the 8,000-token
answer, signature form).** Base (2 hops, PPR) 0.664 (standard error 0.033 over 65 commits). Reach was
the big factor: hops 3 / 4 / 6 / unbounded gave 0.727 / 0.768 / 0.780 / 0.784 (se 0.025 at
unbounded, the best). Padding at 2 hops: DIR 0.764, CO 0.771. Membership edges +0.028 (0.692).
Rankings at 2 hops were flat (0.651 to 0.666) because the whole 2-hop reach fits in 8,000 tokens
(median 5,010 tokens used; recall at 16,000 tokens is 0.680 for every ranking). Hub cuts lost reach
(in-degree > 5: 0.599, > 10: 0.635; transport neutral 0.665). Symbol granularity (0.518) and snippet
form (0.363) lost. minConf 0: 0.666, minConf 1: 0.636. Budget B1 0.779 and the metapath 0.615 brought
nothing over plain unbounded k-hop. What the best lacks: at unbounded reach the answer is full (median
7,999 tokens) and recall at 16,000 tokens is 0.870 against 0.784 at 8,000, so the remaining prize is
the ORDER of a large reach, which stage 1 never tested (all its rankings ran at 2 hops). Stage 2 is
therefore built around U = base with unbounded hops (complexity 2), plus cheaper shallow-reach +
padding combinations that could tie it at complexity 1 or 2 (addendum 3 item 10).

**The 20 (arms/relational/stage2.json, list hash 52b3f69b93f01360; cx = addendum-3 complexity).**
Written by tmp/tune-relational/make_stage2.js; arms/reference/stage2.json is an identical copy.

| # | name (prefix `s2: `) | cx | reason |
|---|---|---|---|
| 1 | hops=null rank=cochange | 2 | co-changed files first inside the unbounded reach (CO alone is a strong floor); the simplest ordering that could close the 8k-vs-16k gap |
| 2 | hops=null rank=degnorm | 2 | degnorm had the best 2k recall at 2 hops (0.499) and costs about 1 ms; tests local spreading activation on a large reach |
| 3 | hops=null rank=ppr r0.50 | 2 | a higher restart keeps PageRank mass near the seed, which only matters when the reach is large |
| 4 | hops=null rank=ppr w3 | 2 | co-change edges weighted 3x inside PageRank; flat at 2 hops where order could not matter, retested where it does |
| 5 | hops=null rank=hybrid ppr+cochange | 3 | fuses the structural and the historical signal, which should err on different files |
| 6 | hops=null rank=hybrid ppr+text | 3 | the best top-10 file share and MRR at 2 hops (0.550, 0.612); retested where order decides the primary |
| 7 | hops=null rank=hybrid degnorm+cochange | 3 | the cheap pair of the two best early-recall rankings |
| 8 | hops=null rank=x_wsp (SQL) | 3 | the graph arms' native weighted-shortest-path ranking, written in SQL so this arm is not denied an algorithm the engines run (new mode, below) |
| 9 | hops=null classes=base+membership | 2 | membership was the largest class gain (+0.028); under PageRank it spreads mass to slice siblings, an in-graph analogue of DIR padding |
| 10 | hops=null classes=base+capability+docs+membership | 2 | the stage-1 best class set at the best depth |
| 11 | hops=null minConf=0 | 2 | low-confidence edges carried some signal at 2 hops (0.666 vs 0.636 at minConf 1); at unbounded reach they also add reach |
| 12 | hops=null hub=transport | 3 | neutral at 2 hops; at unbounded reach blocking shared plumbing may stop mass and reach leaking through hubs |
| 13 | hops=null hub=indeg>15 | 3 | a looser in-degree cut than stage 1's 5 and 10: with unbounded hops lost reach may come back by other paths while hubs stop flooding the order |
| 14 | hops=null pad=CO | 3 | CO was the best tail (0.771); at unbounded reach it only fills answers whose reach is under 8,000 tokens (isolated seeds) |
| 15 | hops=null gran=symbol | 3 | symbol granularity lost at 2 hops because its reach was small (median 2,651 tokens); at unbounded reach one line per definition may be more token-efficient than whole-file signature lists |
| 16 | hops=3 pad=CO | 2 | hops 3 (0.727, cx 1) left budget unused on some tasks; the CO tail fills it: a cx-2 rival to the cx-2 best |
| 17 | hops=3 rank=cochange | 1 | the only cx-1 candidate: if co-change order recovers enough at 3 hops it wins on parsimony |
| 18 | hops=4 pad=CO | 3 | hops 4 (0.768) and pad CO (0.771) were each near the best; tests whether they add |
| 19 | hops=2 classes=base+membership pad=CO | 2 | the two best cheap factors at the base depth (membership +0.028, CO +0.107) together |
| 20 | hops=null rank=ppr w3 classes=base+membership | 2 | interaction of the two ranking-side changes (co-change weight, slice spreading) at the best depth |

19 entries follow the shared specification and were cross-checked against the reference arm; entry
8 is an arm extension (`x_` mode), run on this arm only.

### New mode `x_wsp` (arm extension, rel.js `EXT_RANK.x_wsp`, queries.js `wsp_*`)

Definition (the LadybugDB definition of addendum 3 A.2, class costs copied from
arms/ladybug/store.js `CLASS_COST`): the cost of an arc = class cost / max(confidence, 0.05), with
structure 1, membership 4, imports 1, calls 1, http 1, tests 1, data 1.5, config 1.5, capability 3,
docs 3, history 2, experimental 3 (any other class 3). Arcs follow SPEC 4 under the configuration's
direction, classes and minConf (co_changed gives one arc from each end). A node blocked by the hub
cut may end a path but is never expanded; seeds are never blocked. Path length is unbounded (not
limited by `hops`). Candidates are the traversal's reach. Score = 1 / (1 + the minimum cost from any
seed), rounded to 12 decimals; order score desc, hop asc, id asc (the degnorm order). In SQL: a
temp table wd(node, cost, round); one set-based relaxation statement per round (an INSERT ... SELECT
over the arcs leaving the nodes improved in the previous round, GROUP BY target with MIN, upsert that
keeps the smaller cost), repeated by a thin loop until a round changes nothing (Bellman-Ford in
rounds; at most 21 rounds on the real tasks). Everything except the loop runs in the engine.

Hand check (arms/relational/wspcheck.js, part A; the expected values are worked out in its header):
a six-node toy graph with calls, imports, reads_table and co_changed edges at confidences 1, 0.5,
0.8 and 0.4. Five cases, all equal to the hand values: (1) both directions, minConf 0.5: b 0.5,
c 1/3, f 1/3, d 1/3.5, e 1/6 in that order; (2) dependencies: f unreachable; (3) minConf 0: the
0.4-confidence arc makes e cost 2.5 and it ranks before d (same score, lower hop); (4) in-degree hub
cut k = 2: d is blocked, so e (cost 5 through d) is not reached; (5) dependents from a node with no
incoming edge: nothing. Plus x_wsp inside a hybrid. 7 of 7 checks pass, in graphtest:1.
Large check (part B, `--real`): 106 TUNE T1/T2 tasks (2 per parent, 53 parents), 6 configurations
(the stage-2 entry; dependents; dependencies; in-degree > 10 cut; transport cut; minConf 0 with all
classes at 4 hops) = 636 ranked lists, 671,390 candidate scores: 0 scores differ from an independent
JavaScript Dijkstra (written in wspcheck.js over the reference arm's arcs and hub predicate) by more
than 1e-9; 0 reach-set, hop or explanation-path differences against the reference arm's k-hop reach;
0 order violations; 4,425 of the scores were for hub-blocked candidates. 11 of 11 checks pass; 38 s.
The reference arm does not implement `x_` modes, so this hand and Dijkstra check replaces the strict
cross-check for entry 8 only.

### Stage-2 run (inside graphtest:1, TUNE only, 6 CPUs and 4 GB, stores on the named volume gt-relational, reused)

Script tmp/tune-relational/run_stage2.sh; three sweep processes (T1, T1x, T2) plus the x_wsp check at
the same time, so the times below are not quiet-machine engine measures.
- Self-test 69 of 69 pass; held-out lock refused.
- Cross-check relational vs reference (strict, byte for byte, plus E.19 equivalence), the 19
  specified entries on every TUNE task: T1 7,372 (task, configuration) pairs, T1x 2,736, T2 4,560 =
  14,668 pairs, 0 equivalence failures, 0 ranked-list differences, 0 packed-answer differences.
  The x_wsp entry ran on relational only (388 + 144 + 240 = 772 runs skipped on reference, by design).
- Answer files (tmp/tune-relational/verify_stage2.js, 0 problems): 20 relational files per set and
  19 reference files per set; every configuration present for every task (T1 388 tasks, T1x 144,
  T2 240), no duplicate, extra or held-out id; no answer over any budget (2,000 / 4,000 / 8,000 /
  16,000 tokens); token accounting recomputed equal; lookups = 1 + padding lookups, meta null.
- Wall: T1 966 s, T1x 363 s, T2 680 s. Summed rank wall time over the three sets: relational
  1,404 s, reference 306 s. Median engine time per query (relational / reference, over 772 tasks):
  PPR at unbounded hops about 107 / 23 ms; hybrid ppr+text 141 / 27 ms; membership classes 120 / 27 ms;
  cochange 10.5 / 3.9 ms; degnorm 14 / 4.8 ms; hybrid degnorm+cochange 17 / 6.6 ms; x_wsp 17 ms
  (95th percentile 41 ms); hops=3 cochange 2.3 / 0.6 ms.
- Where: relational answers in results/relational/tune/<hash>.<set>.jsonl.gz (60 new files, 180 in
  all); run records in results/relational/stage2/ (sweep summaries, configs, empty mismatch files,
  list-hash logs, verify_stage2.json, wspcheck.json and .log, selftest.log, run_stage2.log).
  Reference answers stay in tmp/tune-relational/out_<set>/reference/tune/ (57 files).

Design, unchanged:
- integer ids;
- WITHOUT ROWID tables;
- FTS5 (unicode61) over the shared node text;
- stored rank columns;
- recursive CTEs with UNION and a depth cap;
- CROSS JOIN where the planner would otherwise scan;
- hub sets and PageRank transitions cached per connection and configuration;
- switchable closure, CTE and level-wise query paths for the cross-check.
