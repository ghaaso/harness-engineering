# arms/duckpgq

This is the graph arm on DuckDB 2.0.0 with the DuckPGQ community extension (extension version
9c11bc192a), run from Node 24 through `@duckdb/node-api` inside the image graphtest:1. The contract it
implements is ../common/SPEC.md. Revision of 2026-11-12, evening: the phase B audit fixes of protocol
addendum 3 (sections A, B, C). Every number below was measured inside the image with 6 CPUs and 4 GB on
2026-11-12, TUNE tasks only; nothing was scored, selected or frozen; HELD-OUT was never run; sealed/ and
audit/ were never opened. Latencies are indicative only: other lanes' containers ran at the same time,
and this lane ran two of its own containers at once. Final engine timings are a later quiet-machine run.

## Stage 2 (protocol addendum 3, section D), 2026-11-12 night

Proposed by this arm's tuner from this arm's own stage-1 TUNE score table only (results/tuner/duckpgq.stage1.*;
no other arm's table, no per-task score, no reference was read). Run once on TUNE T1, T1x and T2; this arm
receives no stage-2 scores. HELD-OUT was not run; sealed/ and audit/ were not opened.

### What the stage-1 table said (T1 primary = recall of reference files and definitions in the 8,000-token answer, signature form)

- Reach is the factor that matters. The base (k-hop 2, PPR) scored 0.664 (standard error 0.033) and used a
  median of only 5,010 of its 8,000 tokens: the reach ran out before the budget. Every change that adds reach
  gained about 0.06 to 0.12: hops=3 0.727, hops=4 0.768, hops=null 0.784 (best, standard error 0.025),
  budget B1 0.779, pad=CO 0.771, pad=DIR 0.764. Everything that removes reach lost: hops=1 0.438, one
  direction 0.449 / 0.460, fewer classes 0.599 to 0.609, hub cuts 0.599 to 0.635, symbol granularity 0.518
  (median 2,651 tokens), snippet form 0.363.
- Ranking changed the primary by at most 0.015 at hops 2 (well inside one standard error), because the whole
  reach usually fitted. The rankings did differ where the budget binds: recall at 2,000 tokens ranged from
  0.465 (PPR restart 0.15) to 0.499 (degnorm) and 0.500 (PPR lifted by native PageRank); the hybrid PPR+text
  had the best share of reference files in the top 10 (0.550 against 0.512) and the best nDCG@10 (0.476).
- What the base lacks: reach. Once reach exceeds 8,000 tokens (hops >= 3: median 7,998 to 7,999 tokens), the
  ranking decides what is cut, so the stage-1 ranking differences measured at hops 2 had no chance to show.
  Within one standard error of the best (0.784 - 0.025 = 0.759): hops=null, budget B1, pad=CO, hops=4, pad=DIR
  (complexity 2 to 3); hops=3 (complexity 1) is 0.057 below.

### The 20 configurations (arms/duckpgq/stage2.json, list hash 06ca0b6d351fdcf1)

All keep the base otherwise (signature form, file granularity, both directions, the eight base classes,
minConf 0.5, no hub cut, PPR restart 0.30, co-change weight 1). cx = complexity of addendum 3 item 10.
Generator: build/tmp/tune-duckpgq/make_stage2.js.

| # | name | hash | cx | reason (one line) |
|---|---|---|---|---|
| 1 | s2: hops=3 + pad=CO | e522875a0003cdeb | 2 | Simplest way to reach hops=null's level: 3 hops already fill the budget on most tasks, the CO tail covers the rest. |
| 2 | s2: hops=4 + pad=CO | 32881337421137ea | 3 | The same interaction one hop further (hops=4 0.768 and pad=CO 0.771 each alone). |
| 3 | s2: hops=null + pad=CO | 4df330a9016ea710 | 3 | Stage-1 best reach plus the tail for seeds in small components (on T1x pad=CO 0.603 beat hops=null 0.592). |
| 4 | s2: hops=3 + rank=degnorm | 7b7210fddacacc9f | 1 | At hops 3 order decides the cut; degnorm had the best ranking recall at 2,000 tokens (0.499 against 0.478). |
| 5 | s2: hops=3 + rank=cochange | fd4b5c538dc5d7ac | 1 | Co-changed files first, then by hop; cochange had a high top-10 file share (0.527) and is the cheapest ranking. |
| 6 | s2: hops=3 + rank=ppr r0.50 | 04becb78fa235274 | 1 | A more local PPR for a larger reach (restart 0.50 had recall 0.491 at 2,000 tokens against 0.478). |
| 7 | s2: hops=3 + rank=hybrid ppr+text | 98287cee52829862 | 2 | The hybrid had the best top-10 share (0.550) and nDCG@10 (0.476) at hops 2; tests it where order binds. |
| 8 | s2: hops=3 + rank=cochange + pad=CO | 99b9e1bfbcf01617 | 2 | History in both places: co-change order inside the reach, co-change tail after it. |
| 9 | s2: hops=null + rank=bfs | 977d275497caebe4 | 2 | Does plain closest-first order suffice when the reach is the whole component (bfs 0.490 at 2,000 tokens)? |
| 10 | s2: hops=null + rank=degnorm | 95e990307da3b42b | 2 | Best stage-1 early-recall ranking on the best reach. |
| 11 | s2: hops=null + rank=cochange | 0ebb7395f767c324 | 2 | Co-changed files are all within one hop (history class), so this is "CO floor order, then graph by hop". |
| 12 | s2: hops=null + rank=ppr r0.50 | a4f37a07b9b92794 | 2 | Keeps PPR mass near the seeds when reach spans about 1,660 nodes (median). |
| 13 | s2: hops=null + rank=hybrid ppr+cochange | 7444700f8c7c43e7 | 3 | Fuses the graph-walk order with the co-change order (the two strongest single signals). |
| 14 | s2: hops=null + rank=hybrid ppr+text | 0d295639c01f2793 | 3 | The best stage-1 top-10 ranking on the best reach. |
| 15 | s2: hops=null + hub=transport | 6c04453d37f7468a | 3 | With surplus reach a hub cut can no longer starve the answer; transport cut stops walks through framework nodes. |
| 16 | s2: hops=null + hub=indeg>10 | 2551c952df7d9717 | 3 | Hop limit with hub cut: in-degree cut at 10 lost reach at hops 2 (0.635) but may focus PPR at unbounded reach. |
| 17 | s2: hops=null + hub=indeg>15 | 4497e8f88d35d12d | 3 | A milder cut at 15, the protocol's third level, so the hub curve has two points. |
| 18 | s2: hops=null + gran=symbol | 263361e5b250e8ea | 3 | Symbol granularity was reach-starved at hops 2 (2,651 tokens); unbounded reach fills 8,000 tokens with definitions. |
| 19 | s2: native: hops=null + rank=x_wsp | 6fdb3cc99ab61346 | 3 | The engine's cheapest-path order where order binds (at hops 2 it could not matter); native cheapest_path_length. |
| 20 | s2: native: hops=null + rank=ppr lifted by pagerank^0.5 | c8de0bae9537e745 | 3 | Native-PageRank lift had the best recall at 2,000 tokens (0.500); tested on the best reach. |

Left out on purpose: minConf and class-set variants (flat at stage 1: within 0.003 of the base, or worse),
direction variants, budget and metapath traversals (budget B1 equal to hops=null at higher complexity; the
three metapaths lost reach), snippet and range forms, the WCC prior and the PageRank cut (both lost at stage 1).

### Which layer answers (property graph where it can express the step)

- Unbounded k-hop (entries 3 and 9 to 20): PGQ native, `iterativelength()` over a CSR of the projected arcs.
- Bounded k-hop (entries 1, 2, 4 to 8): **plain SQL** (the bounded recursive statement, as in stage 1), labelled
  as a fallback. The PGQ form (one one-edge GRAPH_TABLE pattern per level, `khopImpl = 'levels'`) gives the
  identical ranked list: checked on every second TUNE T1 task (194 tasks) for the 6 distinct rankings of these
  7 entries, 1,164 comparisons, 0 differences; median engine time 50.1 ms (SQL) against 59.4 ms (PGQ levels)
  (results/duckpgq/stage2_sweep/levels_check.json, script build/tmp/tune-duckpgq/levels_check.js). The SQL form
  stays the default so that stage-1 and stage-2 answers come from one code path.
- Reach DAG: PGQ (one-edge pattern over the stored `arc` label). Hub cuts: SQL node sets used inside the PGQ
  edge filter.
- Rankings bfs, degnorm, PPR, cochange, text, hybrid: **plain SQL** (DuckPGQ has no personalised PageRank,
  no BM25 and no degree-normalised spreading). x_wsp: PGQ native `cheapest_path_length()`. PPR lift: SQL PPR
  times native `pagerank()`.

### New modes

None added. The catalogue modes this arm lacks are LadybugDB's Louvain community prior (x_comm), its core-number
hub cut and its engine personalised PageRank. DuckPGQ (extension 9c11bc192a, the installed one) has no Louvain,
Leiden, k-core or personalised PageRank routine (probes 1 to 10), so none can run in this engine's own language;
the stored global PageRank prior already exists here as the native `pagerank()` (entry 20, and the stage-1
variant). Nothing was added that could not be hand-checked.

### Run (inside graphtest:1, 6 CPUs, 4 GB, store on the gt-duckpgq volume; other lanes' containers ran at the same time)

- T1 + T2 with the reference arm (cross-check): `sweep.js --arms reference,duckpgq --list duckpgq --stage 2
  --sets T1,T2`, 628 tasks, 1,312 s wall (21 min 53 s). T1x, this arm only: 144 tasks, 205 s wall.
- Equivalence against the reference arm: the 18 entries that follow the shared specification x 628 TUNE T1 and
  T2 tasks = 11,304 comparisons: 0 equivalence failures, 0 ranked lists not byte-identical, 0 packed answers
  different (crosscheck_mismatches.stage2.jsonl is empty). The 2 native entries (19, 20) are extensions and are
  not cross-checked (SPEC 9.4); x_wsp was checked against a JavaScript Dijkstra earlier (see "Cross-check").
- Answer files (dev/verify_answers.js with VERIFY_STAGE=2, results/duckpgq/stage2_sweep/verify.json): 0 problems.
  20 configurations x 3 sets = 60 files, 15,440 answers; every configuration present for every task of every set
  (T1 388, T1x 144, T2 240), no duplicate, extra or held-out id; 0 of 61,760 budget checks over budget; `used`,
  head/tail tokens and unit counts consistent; lookups = 1 + padding lookups; list hash logged = recomputed.
- Engine time per query, median over T1 tasks (95th percentile in brackets; shared machine, not engine
  measures; results/duckpgq/stage2_sweep/timing.json): hops=3 entries 31 ms (cochange) to 66 ms (hybrid);
  hops=null 46 ms (bfs), 48 ms (cochange), 67 ms (PPR), 85 ms (degnorm), 80 to 84 ms (hybrids), 72 to 73 ms (hub
  cuts), 70 ms (PPR lift), x_wsp 319 ms (1,246 ms). Median reach: 309 nodes at hops 3, 568 at hops 4, 1,660 at
  hops=null (1,593 with the in-degree cut at 10). Entries with the same ranking (differing only in pad or
  granularity) share one rank call, so they show the same time.
- Files: answers in results/duckpgq/tune/<hash>.<set>.jsonl.gz beside stage 1 (180 files in all); sweep logs in
  results/duckpgq/stage2_sweep/T1_T2_crosscheck/ and T1x/ (summary.stage2.json, configs.stage2.json,
  crosscheck_mismatches.stage2.jsonl, lists.jsonl, run.log). The reference arm's answers from the cross-check
  run were deleted (they belong to no result of this arm).

## What changed in this revision (addendum 3)

| Audit item | Before | Now |
| --- | --- | --- |
| a. Degree-normalised ranking, out-degree 0 (A.1) | A node with no arc under the configured direction was dropped from the activation join (its term lost) | od(u) = the number of reach-DAG arcs leaving u, each (u, v, kind, orientation) once, when u has no arc (SPEC 8.1). Exercised in 19 of the 300 random pairs, 0 differences. |
| b. k-hop computed path lengths beyond the hop limit (C.6) | `iterativelength()` ran the BFS from every seed to the end of the graph, then lengths above H were deleted | Bounded k-hop never expands a node at depth H. DuckPGQ has no bounded shortest-path routine (`iterativelength` runs to the end; the `{1,H}` quantifier filters afterwards), so the bound is written by hand in two equivalent forms: a level-synchronous recursive SQL statement (`USING KEY (v)`, first visit wins, stops at depth H; the default) and a PGQ form, one one-edge pattern per level from the frontier (`khopImpl = 'levels'`). Unbounded k-hop (hops null) still uses `iterativelength()` (there is no limit to exceed). The two bounded forms gave identical ranked lists in 42 random pairs and 20 smoke-test runs. |
| c. Metapath step whose kinds are all absent (A.4) | Produced the SQL fragment `AND ()` and an error | Such a step matches no arc (predicate FALSE); a prefix through it is left out of the walk patterns. Exercised in 39 of the 300 random pairs (25 of them reached nothing), 0 differences, 0 errors. |
| d. Property graph built on every connection (C.6) | Each open built an in-memory DuckDB, attached the store read-only, and declared a property graph (plus a projection table) per configuration on first use; that time sat inside the first query's engine time | Two property graphs are STORED in the store file at build time: `g` (vertex table `node`, edge table `arc`) and `gtq` (the TQ labels). A configuration's projection is no longer a table: it is a predicate on the stored `arc` label, written as an edge-element filter of a fixed-length pattern (`-[e:arc WHERE ...]->`) or as the filtered row source of a CSR. Nothing is declared per connection. Threads: `os.availableParallelism()` = 6 in the container (was 4). |
| e. x_wsp definition (A.2) | Own cost tables (class costs A, kind costs B) and no confidence term | The LadybugDB definition: arc cost = class cost / max(confidence, 0.05), class costs from arms/ladybug/store.js `CLASS_COST` (structure 1, imports 1, calls 1, http 1, tests 1, data 1.5, config 1.5, history 2, capability 3, docs 3, experimental 3, membership 4, any other 3); a hub-blocked node keeps no out-arc, so no path passes through it (seeds exempt); under the configuration's direction, classes and minConf; score = 1 / (1 + the minimum cost from any seed). The table was read from LadybugDB's source file (its NOTES.md still says its hub rule is not applied; see "For other lanes"). The stage-1 entry `{rank: {mode: 'x_wsp'}}` and the hybrid `ppr + x_wsp` now have the same configuration hashes as LadybugDB's entries. |
| f. MP_HTTP, MP_HIST labelled native | Named "native: metapath=..." | Named `metapath=defs>code0-1>http1-2>code0-1` and `metapath=defs>code1>history0-1`: ordinary specified ordered metapaths (SPEC 6.3), cross-checkable. Their configuration hashes did not change. |

### Why a property graph is stored this way (probe10, `probe/probe10.js`)

- A property graph created in a database file and checkpointed is usable after reopening, both read-write
  and READ_ONLY, when the file is the MAIN database. Through `ATTACH ... (READ_ONLY)` (the old setup) it is
  not found ("Property graph g does not exist"), with or without `USE`.
- A read-only database cannot create a property graph (DuckPGQ writes its definition into the table
  `__duckpgq_internal`), but TEMP tables work. So per-configuration graphs are impossible on a read-only
  store; per-configuration edge filters on one stored label replace them.
- Edge-element filters work in fixed-length patterns (not in quantified ones, as before), and subqueries
  work in vertex and edge element filters (used for the frontier, the hub cut and the seed exemption).
- The stored graph records the database name, which is the file name without its extension, so a store is
  built under its final file name in a side folder (`.building/`) and then moved; a copy keeps its name.

## Files

| File | What it is |
| --- | --- |
| arm.js | Harness entry: `open(G, opts)` builds the store if missing, opens it READ_ONLY with one DuckDB thread per container CPU, returns `rank`, `tq`, `close`. |
| store.js | Builds one DuckDB file per (parent commit, removed document) from `exportCanon` CSV files; store version D2: adds the `arc` table, the TQ label tables and the two stored property graphs. |
| pgq.js | Every SPEC algorithm and the native options (class `PgqGraph`). |
| tq.js | One TQ query per question kind as typed path patterns over the stored graph `gtq`. Its diagnostic file is now results/duckpgq/tq_diagnostic/duckpgq.tune.jsonl. |
| sweep.js | This arm's stage-1 list: exactly 40 configurations, list hash 0cef37d35583a845 (was 480f97f2c88b36f5). |
| stage2.json | This arm's stage-2 list: exactly 20 configurations, list hash 06ca0b6d351fdcf1 (see "Stage 2"). |
| crosscheck_random.js | 300 seeded random (configuration, task) pairs against the reference arm (rewritten: uses the harness's own `drawConfig`). |
| bench.js | Engine measures (updated for the stored graphs, the bounded k-hop forms and the new x_wsp). |
| stores_report.js | Build time and size of every store. |
| dk.sh | Host helper: runs a command in graphtest:1 with the limits, mounts and the gt-duckpgq volume. |
| probe/probe1..10.js | Engine probes (probe10 is the stored-graph probe of this revision). |
| dev/smoke3.js, wsp_check.js, verify_answers.js, compare_xcheck.js, build_stores.js | Development checks of this revision (see below). Older: try1.js, try2.js, answer_diff.js. |

## Store (store version D2)

- Built from the canonical graph only (`exportCanon` CSV files plus the evidence rows of the same loaded
  graph), bulk loaded with `read_csv`, then checked against the graph: per edge kind the count and sums of
  source id, destination id, weight and evidence count; node count, id sum, text and sid bytes, test count;
  vertex rowid = id - 1 (DuckPGQ's CSR functions address vertices by rowid); arc count = 2 x edges, reverse
  arcs = directed edges, symmetric arcs = 2 x co-change edges; the two stored graphs present.
- Tables: node, edge (each canonical edge once, `sym` marks co_changed), arc (every SPEC 4 arc once:
  forward o = 0 and reverse o = 1 for a directed edge, two o = 0 rows for a co-change edge, with kind,
  class, confidence and the x_wsp cost), edge_ev, deg, term and df (BM25 postings), cochange, ekind, eclass,
  meta, the per-kind label tables `l_<kind>`, the TQ label tables tq_client, tq_exec, tq_up_tests,
  tq_up_prod, tq_up_entry, and DuckPGQ's `__duckpgq_internal` (the stored graph definitions).
- Location: GT_STORE/duckpgq = the named Docker volume gt-duckpgq at /store. Nothing database-like is
  written to /build. The 54 D1 stores of the previous revision were deleted.
- 54 stores (53 TUNE parents plus the frozen commit): build time per store (CSV export, bulk load and
  derived tables, label tables, arc table and stored graphs, load check) median 325 ms, 95th percentile
  395 ms, maximum 484 ms, 17.8 s for all 54; size per store median 14.2 MB, maximum 17.1 MB, 772 MB for all
  54 (results/duckpgq/stores.json).

## Which layer answers each algorithm

"PGQ" = a GRAPH_TABLE ... MATCH pattern over the stored graph or a DuckPGQ graph function; "SQL" = plain
DuckDB SQL; "application code" = JavaScript outside the engine.

| Algorithm | Layer | How |
| --- | --- | --- |
| Projection (direction, classes, minConf, hub cut) | SQL predicate in PGQ | An edge-element filter on the stored `arc` label (orientation, class, confidence; a blocked source only when it is a seed), or the filtered row source of a CSR. No per-configuration table or graph. |
| khop, bounded: hop of every reached node | SQL (default) or PGQ | Recursive statement bounded at H (default); or `khopImpl = 'levels'`: one one-edge pattern per level `(a WHERE a.id IN frontier)-[e:arc WHERE ...]->(b)`. |
| khop, unbounded | PGQ (native function) | `iterativelength()` over a CSR built in the same statement from the filtered arcs. |
| khop: reach DAG | PGQ | One-edge pattern over the filtered arc label, joined to the hop table. |
| explanation (SPEC 7) | SQL | Smallest (u, kind id) DAG parent chained back; state parents for budget and metapath. |
| budget | SQL | Recursive CTE `USING KEY (node, state)`; per-class counters are not a regular path pattern. |
| metapath (ordered) | PGQ + application code + SQL | One fixed-length pattern per automaton prefix, one filtered `arc` edge per step (repeat ranges unrolled: one quantified segment per MATCH, no filter in it), UNION ALL; state DAG in SQL. |
| hub cuts | SQL | Cached node sets (TEMP tables), used inside the projection filter. |
| rank bfs, degnorm, cochange, text (BM25), hybrid (RRF) | SQL (+ a JavaScript loop over levels for degnorm and over parts for hybrid) | |
| rank ppr | SQL | One recursive CTE of 40 power-iteration steps over cached transitions. DuckPGQ's `pagerank()` is global, unweighted, damping 0.85 with a tolerance stop. |
| native: `pagerank()` variant, PPR lift, PageRank cut | PGQ (native) | Scalar `pagerank(csr, rowid)` over a CSR of the projected arcs (what the table function compiles to; the stage-1 answers of all three entries are unchanged from the table-function version, 0 of 2,316 ranked lists changed). |
| native: x_wsp | PGQ (native) | `cheapest_path_length()` over a weighted CSR (separate statement, fresh CSR id, freed afterwards). Checked against an independent JavaScript Dijkstra over the canonical graph: 29,498 node scores on 60 tasks in 6 configurations (both stage-1 x_wsp entries, two hub cuts, dependents with minConf 0, dependencies with all classes), 0 differences. |
| native: WCC prior | PGQ (native) | Scalar `weakly_connected_component(csr, rowid)` over a hub-free CSR (stage-1 answers unchanged). |
| TQ | PGQ + SQL | Typed path patterns over the stored graph `gtq`; evidence-line logic in SQL. |

Connection caches (DuckDB TEMP tables, the same kinds as the relational arm's): hub sets, PPR transitions,
native PageRank / WCC results, the PageRank cut. Their build time is counted in the engine time of the
query that first needs them, as in the relational arm, and is reported apart in each answer's
`meta.setup_ms`. Open (new DuckDB instance on the file, extension load, rowid map) is not in any query's
engine time.

## Departures from SPEC and why

- None in results: every specified algorithm passes the SPEC 11 equivalence.
- Scores are rounded in SQL with `floor(x * 1e12 + 0.5) / 1e12` (1e9 for text). DuckDB's parallel
  aggregation can sum in a different order from JavaScript, which moves a score across a rounding boundary
  in rare cases: in this revision 4 of 25,120 cross-check answers (one seed, T1-0345 / T2-0210, a PPR score
  of 0.019925463236 against the reference's 0.019925463235, in two configurations); order unaffected.
- The MATCH form of k-hop (`ANY SHORTEST` with a path variable over a per-configuration label) was removed:
  it needs a per-configuration property graph, which a read-only store cannot create, and it was 3.3 times
  slower than the direct call and unbounded inside.

## Cross-check (results/duckpgq/crosscheck, results/duckpgq/crosscheck_random)

- Relational stage-1 list (hash 5efda93e9c470eb9, 40 configurations) on all 628 TUNE T1 and T2 tasks (53
  parents), DuckPGQ against the reference arm: 25,120 comparisons, 0 equivalence failures, 0 entries in
  crosscheck_mismatches.jsonl, 1,702 s wall. Answer by answer, ignoring arm, timing and meta
  (dev/compare_xcheck.js, compare_answers.json): 25,116 identical, 4 differ by the 1e-12 rounding above.
  (The common sweep's own `answers_differ` reports 25,120 because it compares the `meta` field, which only
  this arm fills; see "For other lanes".)
- 300 seeded random pairs (crosscheck_random.js, seed 20261112; T1 140, T1x 68, T2 92 tasks over the
  TUNE parents): 162 from 3 cycles of the harness's stratified draw (every traversal mode x direction x
  ranking) and 138 from its focused draw (metapath, dependents or dependencies, degnorm alone or in a
  hybrid, steps against the direction and rare kinds). Metapath with degnorm: dependents 38, dependencies
  38, both 3 pairs; metapath with a hybrid: 37, 37, 3. Results: 0 equivalence failures, 0 ranked lists
  not byte-identical, 0 packed answers different, 0 errors; the out-degree-0 rule used in 19 pairs; a step
  with all kinds absent in 39 pairs (25 reached nothing); 87 pairs reached nothing at all; the PGQ level form
  of bounded k-hop equal to the default in all 42 bounded k-hop pairs. 29 s wall.
- x_wsp against JavaScript Dijkstra: see the table above (results/duckpgq/crosscheck_random/wsp_check.log).
- Extensions (`x_*`) and the native variant are not cross-checked against the reference (SPEC 9.4).

## Stage-1 sweep (the one current set: results/duckpgq/tune/, summary in results/duckpgq/stage1_sweep/)

- List hash 0cef37d35583a845 (logged in stage1_sweep/lists.jsonl). 33 specified entries and 7 native ones
  (pagerank variant, PPR lifted by pagerank^0.5, x_wsp, x_wsp with kind costs B, hybrid ppr + x_wsp, WCC
  prior, PageRank top-50 cut).
- 772 TUNE tasks (T1 388, T1x 144, T2 240) x 40 = 30,880 answers in 120 files, 1,694 s wall (beside the
  cross-check and other lanes). Engine time per ranking, median over 772 tasks: 27 ms (bfs) to 104 ms
  (budget B1); base 52 ms; hops=null 72 ms; metapath 71 ms; x_wsp 66 ms; hybrid ppr + x_wsp 101 ms. Not
  engine measures.
- Answer-file checks (dev/verify_answers.js, stage1_sweep/verify.json): every configuration present for
  every task of every set, no duplicate, extra or held-out id, config_hash equal to the file's hash; 0 of
  123,520 budget checks over budget; `used` recomputed from the items equal at every budget; head and tail
  tokens and unit counts consistent; lookups = 1 + the padding lookups in every answer; meta present; the
  logged list hash equals the recomputed one. (verify.json lists one "problem", "list hash": the script was
  pointed at the wrong folder for lists.jsonl; the logged hash in stage1_sweep/lists.jsonl is
  0cef37d35583a845, equal to the recomputed one.)
- Against the previous stage-1 answers (kept in build/tmp/duckpgq/old_results/tune): of 30,880 answers,
  2,236 ranked lists changed: 2,232 in the three x_wsp entries, whose definition changed (771, 691 and 770 of
  772 tasks), and 4 by the 1e-12 rounding (metapath and classes=code entries, tasks T1-0345 and T2-0210). The
  other 35 entries, including the pagerank variant, the PPR lift, the WCC prior and the PageRank cut now
  computed by the scalar functions over a CSR, gave byte-identical ranked lists. The degnorm and k-hop fixes
  changed nothing on this list because no stage-1 entry combines degnorm with a metapath and the bound only
  removes work.
- Older copies were moved out of results/: build/tmp/duckpgq/old_results/ holds the previous tune/,
  stage1/, crosscheck/, crosscheck_metapath_fix/, engine/ and TQ files.

## TQ (results/tq/duckpgq.tune.answers.jsonl; diagnostic results/duckpgq/tq_diagnostic/duckpgq.tune.jsonl)

- 20 TUNE questions, 0 errors; all 20 answers identical to this arm's previous answers and to the relational
  arm's answers (a consistency check, not a score). 3 to 110 ms per question (the first includes opening).

## Engine measures (results/duckpgq/engine/duckpgq.json, query_plans.txt): bench.js run once

This run proves the script works after the changes; its timings are NOT the final ones (the machine was
shared with other lanes). It completed with exit code 0 and no error lines (log build/tmp/duckpgq/bench2.log).
Commit a31924a3818f, 6 DuckDB threads, store file 17,051,648 bytes, 5,464 nodes, 16,462 edges.

- Open (new DuckDB instance on the READ_ONLY store, extension load, rowid map, kinds, meta): median 42.8 ms,
  95th percentile 58.5 ms over 660 opens. Nothing is declared per connection any more.
- Median warm latency (150 runs per class): name lookup 4.8 ms; bounded k-hop by recursive CTE 19.9 ms (1
  hop), 25.8 ms (3), 49.4 ms (6); the PGQ level form 19.2 ms, 32.0 ms, 59.5 ms; unbounded iterativelength
  97.6 ms; budget B1 110.5 ms; metapath defs>code1-2>tests 36.4 ms; degnorm 29.8 ms; PPR 2 hops 55.9 ms;
  native pagerank variant 21.6 ms; x_wsp 131.2 ms (95th percentile 446.3 ms); WCC prior 58.2 ms; PageRank cut
  59.3 ms; TQ 10.3 ms. Connection-cache setup, cold, median: PPR transitions 7.3 ms, native pagerank 22.7 ms,
  WCC 28.2 ms, PageRank cut 31.4 ms, hub set 2.3 ms; 0 ms for the k-hop classes (no per-connection graph).
- Memory: resident set 131 MB after open, 531 MB after all query classes.
- One-file update (backend/app/features/jobs/service.py): 330.7 ms in total; all 53 tables equal to a fresh
  build of the updated graph; 90 of 90 rankings equal; rowid identity kept; the stored graphs need no change.

## Engine limits found (probes 1 to 10)

- One label per edge pattern; no label alternation; an unlabeled edge is rejected.
- No edge filter inside a quantified segment; a fixed-length edge takes a filter, including subqueries.
- A left-pointing quantified segment is not implemented; only one quantified segment per MATCH.
- ANY SHORTEST works; ALL SHORTEST, SHORTEST k and CHEAPEST are not parsed.
- No bounded shortest-path or BFS routine: `iterativelength()` runs to the end; `{1,H}` filters after.
- Unbounded WALK reach (`->+` without a path variable) errors; the bounded form works.
- A seed filter in the outer WHERE is not pushed below the path function.
- No ALTER PROPERTY GRAPH; no graph over a view. A stored graph is readable only when its file is the main
  database (not through ATTACH); a read-only database cannot create one; the graph records the file name.
- CSR lifetime: freed after the path call that reads it; `iterativelength` accepts only CSR id 0 in-statement;
  `cheapest_path_length` cannot read a weighted CSR built in its own statement.
- `iterativelength2` and `iterativelengthbidirectional` crash the database. Not used.
- `pagerank()` is global and unweighted (damping 0.85, tolerance 1e-6); no personalised PageRank, Louvain,
  Leiden or k-core; `weakly_connected_component()` and `local_clustering_coefficient()` exist.
- The fts extension is not installed.

## Harness handicaps

- One rank call issues 10 to 20 statements through the asynchronous Node client; `engine_ms` includes those
  round trips (the relational arm uses the synchronous node:sqlite client).

## How to run (from the host, in the build root; `dk.sh` adds the limits, mounts and volume)

    bash arms/duckpgq/dk.sh "cd /build && node arms/duckpgq/dev/build_stores.js && node arms/duckpgq/stores_report.js"
    bash arms/duckpgq/dk.sh "cd /build && node arms/common/sweep.js --arms reference,duckpgq --list relational --sets T1,T2 --out /build/results/duckpgq/crosscheck && node arms/duckpgq/dev/compare_xcheck.js /build/results/duckpgq/crosscheck"
    bash arms/duckpgq/dk.sh "cd /build && node arms/duckpgq/crosscheck_random.js --pairs 300 --seed 20261112 --out /build/results/duckpgq/crosscheck_random && node arms/duckpgq/dev/wsp_check.js 60"
    bash arms/duckpgq/dk.sh "cd /build && node arms/common/sweep.js --arms duckpgq --sets T1,T1x,T2 --out /build/tmp/duckpgq/stage1run"
      (then move tmp/duckpgq/stage1run/duckpgq/tune/* to results/duckpgq/tune/ and its sweep/ files to results/duckpgq/stage1_sweep/)
    bash arms/duckpgq/dk.sh "cd /build && node arms/duckpgq/dev/verify_answers.js /build/results /build/results/duckpgq/stage1_sweep/.."
    bash arms/duckpgq/dk.sh "cd /build && node arms/common/run.js tq --arm duckpgq --split tune && node arms/duckpgq/tq.js --split tune"
    bash arms/duckpgq/dk.sh "cd /build && node arms/duckpgq/bench.js"
    # stage 2 (list arms/duckpgq/stage2.json, made by tmp/tune-duckpgq/make_stage2.js)
    bash arms/duckpgq/dk.sh "cd /build && node arms/common/sweep.js --arms reference,duckpgq --list duckpgq --stage 2 --sets T1,T2 --out /build/tmp/tune-duckpgq/s2xc"
    bash arms/duckpgq/dk.sh "cd /build && node arms/common/sweep.js --arms duckpgq --stage 2 --sets T1x --out /build/tmp/tune-duckpgq/s2x"
      (then move both duckpgq/tune/* to results/duckpgq/tune/ and the sweep/ files to results/duckpgq/stage2_sweep/)
    bash arms/duckpgq/dk.sh "cd /build && VERIFY_STAGE=2 node arms/duckpgq/dev/verify_answers.js /build/results <folder holding sweep/lists.jsonl>"
    bash arms/duckpgq/dk.sh "cd /build && node tmp/tune-duckpgq/levels_check.js 2 && node tmp/tune-duckpgq/timing.js /build/results"

Environment: GT_DUCKDB_THREADS overrides the thread count (default: the container's CPUs).

## For other lanes

- LadybugDB lane: addendum 3 A.2 says a hub-blocked node cannot be passed through on the x_wsp cost path;
  arms/ladybug/NOTES.md (dated before this revision) says its hub rule is not applied there. With both arms
  on one definition, the x_wsp entries with equal configuration hashes (`{rank: {mode: 'x_wsp'}}` and the
  hybrid with the base PPR) can be compared across engines.
- Harness lane: common/sweep.js counts `answers_differ` with the `meta` field included, so a graph arm that
  returns meta shows every answer as different from the reference arm; strip `meta` there as
  crosscheck_random.js does.
