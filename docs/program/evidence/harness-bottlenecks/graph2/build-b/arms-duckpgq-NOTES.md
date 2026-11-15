# arms/duckpgq

This is the graph arm on DuckDB 2.0.0 with the DuckPGQ community extension (extension version
9c11bc192a), run from Node 24 through `@duckdb/node-api` inside the image graphtest:1. The contract it
implements is ../common/SPEC.md. Every number below was measured inside the image with 6 CPUs and 4 GB,
on 2026-11-12. Latencies are indicative only: one machine, one run, other agents' containers running at
the same time.

## Files

| File | What it is |
| --- | --- |
| arm.js | Harness entry: `open(G, opts)` builds the store if missing, attaches it, returns `rank`, `tq`, `close`. |
| store.js | Builds one DuckDB file per (parent commit, removed document) from `exportCanon` CSV files (the shared loader). |
| pgq.js | Every SPEC algorithm and the native options (class `PgqGraph`). |
| tq.js | One TQ query per question kind as typed path patterns (GRAPH_TABLE ... MATCH). |
| sweep.js | This arm's stage-1 list: exactly 40 configurations, list hash 480f97f2c88b36f5. |
| crosscheck_random.js | 10 seeded random specified configurations (seed 2026) against the reference arm, plus the MATCH form of k-hop. |
| bench.js | Engine measures, mirroring arms/relational/bench.js. |
| stores_report.js | Build time and size of every store in the store folder. |
| probe/probe1..9.js | Engine probes (logs in build/tmp/duckpgq/probe*.log). |
| dev/try1.js, try2.js, wsp_check.js, answer_diff.js | Development checks (logs in build/tmp/duckpgq). |

## Store

- Built from the canonical graph only (`exportCanon` CSV files plus the evidence rows of the same loaded
  graph), bulk loaded with `read_csv`, then checked against the graph: per edge kind the count and the
  sums of source id, destination id, weight and evidence count; node count, id sum, text and sid bytes,
  test count; and vertex rowid = id - 1 (DuckPGQ's CSR functions address vertices by rowid).
- Tables: node, edge (each canonical edge once, `sym` marks co_changed), edge_ev, deg (production
  in-degree per class), term and df (BM25 postings), cochange (both orientations), ekind, eclass, meta,
  and one typed label table per (edge kind, class), named `l_<kind>` (`contains` is split into
  `l_contains_structure` and `l_contains_membership`).
- Location: GT_STORE/duckpgq, which in every reported run is the named Docker volume gt-duckpgq mounted at
  /store. Nothing database-like is written to /build.
- 54 stores were built (53 TUNE parents plus the frozen commit; no TUNE task removes a document, so there
  is one store per parent). Build time per store (CSV export, bulk load and derived tables, label tables,
  load check): median 195.7 ms, 95th percentile 260.8 ms, maximum 338.1 ms, 10.7 s for all 54. Size per
  store: median 12.3 MB, maximum 15.2 MB, 673 MB for all 54 (results/duckpgq/stores.json).
- A read-only attached file cannot hold a property graph, so each connection declares its property graphs
  over the attached tables (an in-memory DuckDB per open, `ATTACH ... (READ_ONLY)`).

## Which layer answers each algorithm

"PGQ" means a GRAPH_TABLE ... MATCH pattern or a DuckPGQ graph function; "SQL" means plain DuckDB SQL, a
fallback that is itself a finding; "application code" means JavaScript outside the engine.

| Algorithm | Layer | How |
| --- | --- | --- |
| Projection (direction, classes, minConf, hub cut) | SQL + PGQ | One edge table per configuration, declared as the single label of a property graph. DuckPGQ needs this because a quantified edge takes exactly one label, has no label alternation and no edge filter. |
| khop: hop of every reached node | PGQ (native function) | `iterativelength()` over a CSR built with `create_csr_vertex`/`create_csr_edge` in the same statement. This is exactly what `MATCH (a)-[e:L]->{1,H}(b)` compiles to; calling it directly puts the seed filter on the source scan. |
| khop: reach DAG | PGQ | One-edge pattern `(a)-[e:L]->(b)` joined to the hop table. |
| khop: explanation (SPEC 7 parent rule) | SQL | Smallest (u, kind id) DAG parent, chained back by a recursive CTE. |
| khop, MATCH form (`khopImpl = 'match'`) | PGQ | `p = ANY SHORTEST (a WHERE a.id IN seeds)-[e:L]->{1,H}(b)`, `path_length(p)`. Same results (240 comparisons, 0 failures); about 3.3 times slower warm on the frozen graph than the 1- and 3-hop direct calls (bench). Not used by default. |
| budget (per-class budgets) | SQL | Recursive CTE `USING KEY (node, state)` with a first-visit check against the recurring table. A counter per class is not a regular path pattern, so the property-graph layer cannot express it. |
| metapath (ordered) | PGQ + application code + SQL | Application code enumerates every automaton prefix (step counts within the repeat ranges and the hop cap) and writes one fixed-length typed WALK pattern per prefix, one label per step, joined by UNION ALL. DuckPGQ cannot chain two quantified segments in one MATCH, cannot point a quantified edge left, and has no edge filter, so the repeat ranges are unrolled. State parents, DAG and explanations: SQL. |
| hub cuts (indeg, transport) | SQL | Node sets; their outgoing arcs are left out of the projection (seeds re-added inside the query's transaction). |
| rank bfs order | SQL | ORDER BY. |
| rank degnorm | SQL + application code | One INSERT per hop level, issued by a JavaScript loop. |
| rank ppr | SQL | One recursive CTE of 40 power-iteration steps, restart and dangling mass to the seeds. DuckPGQ's `pagerank()` is global, unweighted, damping 0.85 with a tolerance stop, so it cannot be the specified personalised algorithm. |
| rank cochange | SQL | Sum of co-change weights to the seed files. |
| rank text (BM25) | SQL | BM25 over the term/df tables with the shared normalisation; the fts extension is not in the image. |
| rank hybrid (RRF) and final ordering | SQL + application code | One statement per part (a JavaScript loop), then a fused ORDER BY. |
| native: `pagerank()` variant | PGQ (native) | `rank.variant = "duckpgq_global"`; global PageRank over the projection, scores of the candidates. |
| native: weighted shortest path (`x_wsp`) | PGQ (native) | `cheapest_path_length()` over a weighted CSR (cost per edge class, optionally per edge kind); score = 1 / (1 + cost). Checked against a JavaScript Dijkstra: 5,290 node scores on 20 tasks, 0 differences. |
| native: community prior (`x_wcc_prior`) | PGQ (native) + SQL | `weakly_connected_component()` over a hub-free projection; PPR plus 1 when a candidate shares a component with a seed. |
| native: PageRank hub cut (`x_khop_prcut`) | PGQ (native) | The top-N nodes of `pagerank()` are reached but not expanded. |
| TQ (all kinds) | PGQ + SQL | Typed path patterns over per-kind labels; multi-kind repeated steps are temp union labels (reversed for upstream walks, interior filter baked in); evidence-line logic (enclosing definition, `upgrade()` bodies) is SQL. |

## Departures from SPEC and why

- None in results: every specified algorithm passes the SPEC 11 equivalence (see Cross-check).
- khop calls `iterativelength()` directly instead of writing `MATCH ... ->{1,H}`. The MATCH form with a
  path variable materialises every path and, when the seed filter is written in the outer WHERE, is not
  pushed down: 37,950 ms for one query on the frozen graph, against 230 ms with the filter inside the
  vertex element and about 20 ms for the direct call (probe5, probe7). The direct call is what the
  extension's own MATCH rewrite emits, so it is still the property-graph engine answering.
- Explanation paths follow the SPEC 7 rule exactly (khop parents; state parents for budget and metapath),
  so packed answers match the reference byte for byte apart from 12th-digit rounding (see Cross-check).
- Scores are rounded in SQL with `floor(x * 1e12 + 0.5) / 1e12` (1e9 for text). DuckDB's parallel
  aggregation can sum in a different order than JavaScript, which moves a score across a rounding
  boundary in rare cases (2 of 628 answers, 1e-12).

## Cross-check (results/duckpgq/crosscheck*)

- Relational stage-1 list (hash 5efda93e9c470eb9, 40 configurations) on all 628 TUNE T1 and T2 tasks
  (53 parents), DuckPGQ against the reference arm: 25,120 comparisons, 0 equivalence failures, 1,337 s.
  Packed answers differed in 258 of 25,120 (equivalence allows it): 256 in the metapath configuration (a
  different but valid explanation, `via`; or only the ranked-list hash, from paths outside the packed
  head) and 4 from 12th-digit rounding. The metapath explanation was then changed to the SPEC 7
  state-parent rule and the metapath configuration re-run on all 628 tasks: 0 equivalence failures and 2
  answer differences, both the 1e-12 rounding case (results/duckpgq/crosscheck_metapath_fix). The other
  39 configurations do not use the changed code.
- 10 seeded random specified configurations (seed 2026; khop, budget and metapath in turn, random class
  sets, directions, minConf, hub cuts, rank modes, metapath emit end and kind steps) on the same 628
  tasks: 6,280 comparisons, 0 equivalence failures, 0 packed-answer differences, 263 s
  (crosscheck/random.json). A run before the metapath fix had 0 failures and 371 answer differences, all
  in its 2 metapath configurations (random.before-metapath-fix.json).
- The MATCH form of khop on the first 60 tasks, 4 configurations: 240 comparisons, 0 failures.
- Extensions (`x_*`) and the native variant are not cross-checked (SPEC 9.4); the weighted shortest path
  was checked against Dijkstra instead.

## Stage-1 sweep (results/duckpgq/tune, results/duckpgq/stage1/sweep)

- List: base (= the relational BASE), hops 1/3/4/null, budget B1, the shared metapath, both single
  directions, 4 class sets, minConf 0 and 1, rank bfs/degnorm/ppr r0.15/ppr r0.50/ppr w3/cochange/text/
  hybrid ppr+text, hub indeg>5/indeg>10/transport, pad DIR/CO, symbol granularity, forms paths/snippet,
  and 9 native options (pagerank variant, PPR lifted by pagerank^0.5, weighted shortest path with class
  costs A and with kind costs B, hybrid PPR + weighted shortest path, WCC prior, PageRank top-50 cut, two
  own metapaths: defs>code0-1>http1-2>code0-1 and defs>code1>history0-1). Written before any score; this
  lane receives no scores.
- The WCC prior's parameters were chosen from component sizes only (probe8 on the frozen graph): every
  class set and hub cut leaves one giant component, so the prior separates little; calls+http+data with an
  in-degree > 3 cut is the most fragmented (largest component 2,573 of 5,464 nodes).
- Run: 772 TUNE tasks (T1 388, T1x 144, T2 240) x 40 configurations = 30,880 answers in 120 files,
  1,348 s wall. 35 distinct rankings per task (pad, granularity and form reuse a ranking). Engine time
  per ranking, median over 772 tasks: 27 ms (bfs) to 81 ms (hybrid PPR + weighted shortest path); base
  45 ms; budget B1 73 ms.

## TQ (results/tq/duckpgq.tune.answers.jsonl, diagnostic results/tq/duckpgq.tune.jsonl)

- 20 TUNE questions, 0 errors. Each answer equals the relational arm's diagnostic answer for the same
  question (a consistency check of the reading, not a score). Per question 2 to 143 ms.
- Quantified steps are WALK reach patterns without a path variable (`(a WHERE ...)-[e:L]->{0,12}(x)`),
  which compile to `iterativelength` BETWEEN 0 AND 12. screen_tables is two statements: the first form
  filtered the start vertices in the outer WHERE, which DuckPGQ does not push below the path function, so
  the handler ids found by the first statement are inlined into the vertex filter of the second.

## Engine measures (results/duckpgq/engine/duckpgq.json, query_plans.txt), frozen commit, run once

- Graph: 5,464 nodes, 16,462 canonical edges, 18,875 evidence rows.
- Load (facts already loaded): 425, 395 and 391 ms for three builds; file 15.2 MB (58 blocks of
  256 KiB).
- Memory (RSS of the Node process): 82 MB before open, 133 MB after open, 205 MB after loading the facts,
  495 MB after all query classes on 30 seeds; DuckDB memory limit 2 GB, 4 threads.
- Open (new in-memory DuckDB, load the extension, attach): median 44 ms.
- Latency over the 30 relational bench seeds, warm median / 95th percentile, ms: name lookup 5.1/8.3;
  k-hop 1 52/62; k-hop 3 55/68; k-hop 6 73/89; unbounded 82/106; k-hop 3 dependents 42/54; k-hop 2
  MATCH form 180/275; budget B1 118/187; metapath 40/54; hub indeg>10 62/73; degnorm 59/74; PPR base
  91/107; PPR unbounded 112/133; co-change 51/66; text 58/70; hybrid 98/117; pagerank variant 50/61;
  weighted shortest path 178/477; WCC prior 93/109; PageRank cut 99/126; TQ 12/82. Cold (fresh
  connection, projection and property graph built inside the first query) adds about 30 to 65 ms.
- One-file update (backend/app/features/jobs/service.py, 67 nodes rewritten in place, 668 edges
  replaced, derived rows repaired): 401 ms. All 46 tables equal a fresh build, rowid = id - 1 kept, and
  90 rankings (3 configurations x 30 seeds) equal those on the fresh build. A change that adds or removes
  nodes renumbers the canonical ids, so it needs a full rebuild (about 0.4 s).
- Lines of query code per algorithm (non-empty JavaScript lines of the method that holds the SQL/PGQ):
  khop 34, budget 33, metapath 51, projection 20, hub cuts 12, degnorm 11, PPR 44, co-change 5, text 12,
  hybrid and ordering 22, pagerank variant 9, weighted shortest path 19, WCC 12; TQ 1 to 10 lines per
  query. pgq.js 423 lines, store.js 119, tq.js 160, arm.js 25.

## Engine limits found (probes 1 to 9)

- One label per edge pattern; no label alternation (`a|b`); an unlabeled edge is rejected.
- No edge-property filter inside a quantified segment; edge columns are not reachable in it.
- A left-pointing quantified segment (`<-[e]-{..}`) is not implemented.
- Only one quantified segment per MATCH (two give a binder error "duplicate alias"); a fixed edge
  followed by a quantified segment works.
- ANY SHORTEST works; ALL SHORTEST, SHORTEST k and CHEAPEST are not parsed. A quantifier lower bound
  filters by shortest length; it does not find walks of exactly that length.
- Unbounded WALK reach (`->+` without a path variable) errors; the bounded form works.
- A seed filter in the outer WHERE is not pushed below the path function (165 times slower than the same
  filter inside the vertex element on the frozen graph).
- No ALTER PROPERTY GRAPH; a property graph cannot be built over a view; it cannot be stored in a file
  opened read-only.
- CSR lifetime: a CSR is freed after the path call that reads it; `iterativelength` accepts only CSR id 0;
  `cheapest_path_length` cannot read a weighted CSR built in its own statement (built in a separate
  statement under a fresh id instead); planning (EXPLAIN) a `cheapest_path_length` statement frees the CSR.
- `iterativelength2` and `iterativelengthbidirectional` crash the database ("dereference unique_ptr
  NULL"), after which the database is invalidated. Not used.
- `pagerank()` is global and unweighted (damping 0.85, tolerance 1e-6); there is no personalised PageRank,
  no Louvain or Leiden, no k-core; `weakly_connected_component()` and `local_clustering_coefficient()`
  exist.
- The fts extension is not installed; with the duckpgq grammar active, `ilike any([...])` does not parse.

## Harness handicaps

- One rank call issues 10 to 20 statements through the asynchronous Node client; `engine_ms` includes
  those round trips. The relational arm uses the synchronous node:sqlite client.
- Per-connection projections, hub sets, PageRank transitions and property graphs are built on the first
  query that needs them (cached afterwards), because a read-only attached store cannot hold them.
- DuckDB runs with 4 threads per process (GT_DUCKDB_THREADS) under a 6-CPU container limit.

## How to run (inside graphtest:1, store volume gt-duckpgq at /store)

    export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_TMP=/build/tmp/duckpgq; cd /build
    node arms/common/sweep.js --arms reference,duckpgq --list relational --sets T1,T2 --out /build/results/duckpgq/crosscheck
    node arms/duckpgq/crosscheck_random.js --seed 2026 --match-limit 60
    node arms/common/sweep.js --arms duckpgq --sets T1,T1x,T2 --out /build/results/duckpgq/stage1
      (then move results/duckpgq/stage1/duckpgq/tune/* to results/duckpgq/tune/)
    node arms/common/run.js tq --arm duckpgq --split tune
    node arms/duckpgq/tq.js --split tune
    node arms/duckpgq/bench.js
    node arms/duckpgq/stores_report.js
