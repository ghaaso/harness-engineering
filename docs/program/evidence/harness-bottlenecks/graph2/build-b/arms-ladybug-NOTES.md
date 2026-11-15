# Graph arm on LadybugDB 0.22.3 (arms/ladybug)

The graph arm of the controlled comparison. It answers every algorithm of `arms/common/SPEC.md`
from a LadybugDB store, natively where the engine can, and adds the engine-native modes as separate
configurations (SPEC 9.4). Everything here was run inside `graphtest:1` with `--cpus 6 --memory 4g`;
stores live on the named volume `gt-ladybug` (`/store/ladybug`), never on `/build`.

## Files

| file | what it is |
|---|---|
| `store.js` | builds one store per (parent commit, removed documents) from `exportCanon` (its own sha256 of the files must equal the canonical hash), and opens it |
| `lb.js` | `LbGraph`: every SPEC algorithm plus the native modes, as Cypher over the store |
| `pattern.js` | the metapath as native typed path patterns (`traversal.variant = "pattern"`) |
| `arm.js` | the registry entry `open(G, opts)`; by default one child process per open store (`child.js`) |
| `child.js` | the child that holds one store and answers rank and tq over IPC |
| `tq.js` | one Cypher query function per TQ kind; `node tq.js` writes `results/tq/ladybug.tune.jsonl` |
| `sweep.js` | the stage-1 list: exactly 40 configurations (base is entry 1), plus `complexity()` |
| `crosscheck.js` | cross-check beyond the relational list: 10 seeded random configurations, the 13 `crosscheck_extra` combinations, the pattern variant, the in-engine PageRank, this arm's own spec entries |
| `priors.js` | core-number distribution and the Louvain spread over 5 runs (diagnostic, read before any score) |
| `bench.js` | engine measures (load, bytes, memory, cold and warm latency, one-file update against a fresh build, EXPLAIN plans, lines of query code) |
| `dk.sh` | host helper that runs a command in `graphtest:1` with the required flags, mounts and volume |

## How to run (from the host, in the build root)

```
bash arms/ladybug/dk.sh "cd /build && node arms/common/sweep.js --arms reference,ladybug --list relational --stage 1 --sets T1,T2 --out /build/results/ladybug/xcheck"
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/crosscheck.js --engine-ppr-tasks 40 --out /build/results/ladybug/xcheck"
bash arms/ladybug/dk.sh "cd /build && node arms/common/sweep.js --arms ladybug --stage 1 --sets T1,T1x,T2 --out /build/results/ladybug/stage1"
bash arms/ladybug/dk.sh "cd /build && node arms/common/run.js tq --arm ladybug --split tune && node arms/ladybug/tq.js --split tune"
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/bench.js"        # results/ladybug/engine.json, query_plans.txt
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/priors.js"       # results/ladybug/priors.json
```

Environment switches: `LB_THREADS` (engine threads per query, default 1), `LB_PPR` (`app` or `engine`,
where the 40 PageRank iterations run), `LB_INPROC=1` (no child process), `LB_PREPARE=0` (no prepared
statements). Only one process may hold a store at a time (the engine locks the file), so the runs
above go one after another.

## Store schema

- `N`: one node table with the canonical columns plus precomputed properties: `dl` (BM25 document
  length), `transport`, `pi_<class>` (production in-degree per class), `prank` (global PageRank),
  `core` (k-core number), `comm` (Louvain community), and `p`, `q`, `W` (scratch columns of the
  in-engine PageRank).
- `f_<type>` / `r_<type>`: one relationship table per edge type (the kind, or `contains_m` for
  membership containment), in the stored direction and reversed; `co_changed` has only `f_`, holding
  both orientations. Used by the typed path patterns and by TQ.
- `A`: the arc table. Every edge once in its stored direction (`sym 0, prim 1`) plus the mirror row of
  every `co_changed` edge (`sym 1, prim 0`), with `w, n, kid, cls, sym, prim, cost`. "both" is
  `(u)-[A]-(v)` restricted to `sym = 0 OR prim = 1`, which gives exactly one arc per SPEC 4 rule.
- `EV`: evidence rows (path, line, op) for TQ. `T` / `HAS`: the term graph for BM25.
- Everything derived (term graph, `dl`, `pi_*`, `transport`, the native priors) is computed by Cypher
  inside the engine at build time.

## What is native, what is a query, what is application code

| algorithm (SPEC) | how it runs | label |
|---|---|---|
| k-hop reach and hop | `-[p:A* SHORTEST 1..H (r, n \| WHERE class, weight, direction, hub)]-` | native |
| unbounded reach | the same with `1..10000` (`var_length_extend_max_depth` raised from 30) | native |
| reach DAG, blocked end nodes, out-degrees | one Cypher query for the arcs out of every expanded node | engine query |
| parents, `npar`, explanation paths | application code over those rows | application |
| hub cuts (indeg, transport) | node predicates on precomputed `pi_*` / `transport` inside the recursive filter | native |
| per-edge-class budgets | one Cypher expansion query per BFS level; the mixed-radix state machine in application code | engine query + application |
| ordered metapath (spec) | as budgets: per-level Cypher, the automaton in application code | engine query + application |
| ordered metapath (variant `pattern`) | typed path patterns over `f_`/`r_` tables, two aggregate queries per step (`pattern.js`) | native |
| degree-normalised | arcs and out-degrees by Cypher; the activation spreading in application code | engine query + application |
| personalised PageRank (default) | transition arcs by Cypher (cached per configuration); 40 iterations in application code, timed inside `engine_ms` with the data fetch | engine query + application |
| personalised PageRank (`LB_PPR=engine`) | every iteration as Cypher writes on node properties; same output (cross-checked) | engine query |
| co-change | one Cypher join on the candidate's file | engine query |
| text (BM25) | Cypher over the term graph `T`/`HAS` (the FTS extension is not installed in the image) | engine query |
| hybrid (RRF) | application code over the part rankings | application |
| TQ | one Cypher function per kind; `screen_tables` stage 1 is one Cypher query per BFS level (see limits) | engine query |

Why the budget and metapath state machines are not one recursive pattern: a recursive pattern's
filter sees one relationship and one node at a time, cannot read path state (per-class counters or
the automaton state), and cannot take parameters. The typed-path-pattern form of the metapath
(`variant: "pattern"`) does express the automaton natively, as a fixed sequence of typed segments,
and is cross-checked equal to the specified algorithm.

## Native configuration modes (SPEC 9.4), with their definitions

All read the same store; none is cross-checked against the reference (they are not SPEC algorithms),
except `pattern`, which is.

- **`rank: {mode: "ppr", variant: "gds"}`**: the engine's `GDS_PPR` on a projected graph of `A`
  restricted to the configuration's classes (each edge once). Sources are the seeds (by offset),
  `dampingFactor = 1 - restart`. The engine's algorithm is undirected and unweighted and has its own
  stopping rule; `direction`, `minConf`, `cochange_w` and the hub rule do not enter it. Scores are
  the engine's, rounded to 12 places. Reach set and hops come from the configuration's traversal.
- **`rank: {mode: "x_wsp"}`**: weighted shortest path. Each arc costs `CLASS_COST[class] / max(w,
  0.05)` with `CLASS_COST` = structure 1, imports 1, calls 1, http 1, tests 1, data 1.5, config 1.5,
  history 2, capability 3, docs 3, experimental 3, membership 4 (fixed before any score). Score =
  `1 / (1 + min cost from any seed)` by `WSHORTEST(cost)` under the configuration's direction,
  classes and `minConf`; the hub rule is not applied to the cost path. Ties: hop, then id.
- **`rank: {mode: "x_comm"}`** (used in a hybrid with PPR): 1 when the candidate's Louvain community
  holds a seed, else 0. Louvain runs once at build on the code graph (structure, imports, calls,
  http, tests, data, config, history; each edge once; the engine treats it as undirected).
- **`rank: {mode: "x_prank"}`** (used in a hybrid with PPR): the engine's global `page_rank` on the
  same code graph (engine defaults: damping 0.85).
- **`traversal: {mode: "x_core", hops, k}`**: k-hop traversal with the hub cut "core number > k"
  (engine `k_core_decomposition` of the code graph); seeds exempt; a blocked node is reached, never
  expanded, as in SPEC 5. k = 4 blocks about 10 to 12 % of nodes, k = 6 about 2 to 4 % (priors.js,
  5 parents).
- **`traversal: {mode: "metapath", variant: "pattern"}`**: the ordered metapath as native typed path
  patterns. Walk semantics equal the BFS over (node, automaton state); spec-equivalent.

Louvain spread: `louvain()` takes no seed. Over 5 runs on 5 TUNE parents, at 1 and at 6 threads,
every run gave the same partition as the stored one (adjusted Rand index 1.0; 28, 21, 15, 24 and 26
communities). It depends on the store's physical order, though: separate builds of the frozen graph
gave 48, 50 and 55 communities, and the one-file update moved the partition (adjusted Rand index
0.92 and 0.67 in two runs). So the stored community is one draw per store build.

Left untried, with the reason: `GDS_LEIDEN` and label propagation (another community prior beside
Louvain would test the same idea twice before any score says the first one helps), Katz, betweenness,
eigenvector (global centralities like `x_prank`, one is enough for stage 1), closeness (fails on a
disconnected graph), node2vec (an embedding needs a similarity layer this protocol does not have),
WCC/SCC (a component is a coarser grouping than a Louvain community, which is already tried), `TRAIL` / `ACYCLIC` path semantics (the
same reach as `SHORTEST` for reachability, at a higher cost), full-text and vector indexes (the
extensions are not in the image and installing is forbidden).

## Results (TUNE only; HELD-OUT never run; no scores were seen)

**Cross-check against the reference arm** (equivalence rule `common/equiv.js`, all 628 TUNE T1 and
T2 tasks, 53 parents), 0 failures in every group:

| group | comparisons | equivalence failures | byte-identical rankings |
|---|---|---|---|
| relational stage-1 list (40 configurations, `common/sweep.js`) | 25,120 | 0 | 25,120 (packed answers identical too) |
| 10 seeded random configurations (seed 20261112) | 6,280 | 0 | 6,280 |
| the 13 `crosscheck_extra` combinations | 8,164 | 0 | 8,164 |
| metapath configurations run as native typed path patterns | 5,652 | 0 | 4,174 |
| in-engine PageRank iterations, 35 configurations on the first 40 tasks | 1,400 | 0 | 1,400 |
| this arm's own spec entry (the pattern metapath) | 628 | 0 | 388 |

Where the pattern form is equivalent but not byte-identical, only the explanation path differs (any
valid shortest explanation is allowed). Wall times: 616 s for the relational list, 5,391 s for the
rest (the second run shared the host with the stage-1 sweep and another lane). Files:
`results/ladybug/xcheck/sweep/summary.json`, `results/ladybug/xcheck/crosscheck/crosscheck_ladybug.json`.

Mismatches found on the way and fixed (each now 0): the pattern variant's hub rule on segment end
nodes (7 failures in the first 25 tasks; see limits).

**Stage-1 sweep**: list hash `62916d71ad487af9`, 40 configurations on 772 TUNE tasks (T1 388, T1x 144,
T2 240; 53 parents) = 30,880 answers in `results/ladybug/stage1/ladybug/tune/` (120 files, 30 MB);
wall time 1,524 s. Ranking p50 / p95 wall time (ms, including IPC): base 4.2 / 36.9, hops=1 3.1 /
6.9, hops=null 37.6 / 55.1, budget B1 47.0 / 106.5, budget B2 63.0 / 227.0, metapath (spec) 5.7 / 20.5,
hub indeg>5 5.6 / 17.4, text 3.6 / 34.1, x_wsp 16.2 / 77.2, ppr gds 663.9 / 1,428.0, x_core k4 4.9 /
7.4, pattern metapath 662.8 / 1,271.8.

**Stores**: 53 TUNE stores, build 866 to 2,778 ms (p50 1,661 ms), 7.4 to 15.4 MB each (p50 13.4 MB,
716 MB in all). Frozen commit (5,464 nodes, 16,462 edges, 37 edge types): 3 builds of 2,224, 2,252
and 2,251 ms (load 1,592 to 1,625 ms, derived properties 244 to 254 ms, native priors 284 to 313 ms),
19.1 MB; facts load 258 to 264 ms.

**TQ**: 20 TUNE questions, 0 errors (`results/tq/ladybug.tune.answers.jsonl` via `run.js tq`,
diagnostics in `results/tq/ladybug.tune.jsonl`). All 20 answers are identical to the relational
arm's SQL answers (compared in process; the reference answers were never read).

**Bench** (`results/ladybug/engine.json`, one run, indicative; it ran beside the extra cross-check):
warm p50 / cold p50 in ms on 30 seeds at the frozen commit: name lookup 1.2 / 18.3, k-hop 1 0.9 /
20.7, k-hop 3 8.3 / 28.2, k-hop 6 61.6 / 88.5, unbounded 88.3 / 112.2, budget B1 132.0 / 147.4,
metapath (spec) 4.5 / 21.9, metapath (native pattern) 5,039 / 6,280, base PPR 7.1 / 60.8, PPR as
Cypher writes 1,318 / 1,376 (8 seeds), GDS_PPR 1,306 / 1,381, text 3.6 / 28.0, x_wsp 37.7 / 61.1,
TQ 1.6 / 28.4. Cold = a fresh Database and Connection in a fresh process, through the first answer.
Memory: RSS 86 MB after open, 165 MB with the facts loaded, 640 MB after all query classes (buffer
pool 1 GB reserved). One-file update (`backend/app/features/jobs/service.py`: 67 nodes, 668 edges):
1,112 ms (delete 59, batched insert 939, term graph 47, degrees and transport 67) plus 312 ms for
the global priors; every table equals a fresh build except the native priors: `page_rank` scales by
0.98789 (deleted slots counted) and the Louvain partition moves (adjusted Rand index 0.92 in this
run, 0.67 in an earlier one). Lines of query code per algorithm are in `engine.json`
(`lines_of_query_code`: Cypher lines are lines of string literals holding a Cypher clause; the rest
of each method is application lines). EXPLAIN plans: `results/ladybug/query_plans.txt` (each plan cut
at 4,000 characters).

**Louvain spread**: 5 runs on the same store gave the same partition on 5 TUNE parents and on the
frozen commit, at 1 and at 6 threads (adjusted Rand index 1.0). Separate builds of the same frozen
graph gave 48, 50 and 55 communities: the result depends on the physical order the build leaves, so
`x_comm` is one draw per store.

## Departures from SPEC and the protocol

- The stage-1 list has 40 entries **including** base, not base plus 40: `common/harness.js` refuses
  any other size, and the relational list has the same shape.
- PageRank iterations run in application code by default (the 40 exact iterations over a CSR built
  from one Cypher query). The fully in-engine form exists (`LB_PPR=engine`), gives the same output on
  every cross-checked task, and costs about 0.3 to 1.6 s a ranking, so the sweep uses the first.
- The default arm runs each store in a child process (see limits). The harness's wall time therefore
  includes one IPC round trip per ranking (about 0.3 to 0.6 ms at p50 on 30 T1 tasks); `engine_ms`
  is measured inside the child and excludes it.
- Stage-1 list cuts against the relational list, to make room for 7 native entries, chosen before any
  score: hops 6, three class-ladder steps, `+membership`, hybrid bfs+cochange+text, and the two
  symbol-granularity form combinations.

## Engine limits found (each cost time; each is handled in the code)

- Parameters are not allowed inside a recursive pattern's filter or in its hop bounds; values go in
  as literals. A recursive filter may not mix the relationship and the node in one predicate.
- In walk (non-`SHORTEST`) variable-length patterns the recursive node filter did not keep blocked
  nodes off a segment's end node: the hub-cut metapath configurations reached up to 10 extra nodes
  (7 equivalence failures in the first 25 tasks). The hub rule is now repeated on every segment end
  node in the outer `WHERE`; after that, 0 failures. With `SHORTEST` the end node is filtered.
- The default maximum recursion depth is 30 (`CALL var_length_extend_max_depth=10000`); `SHORTEST`
  needs a lower bound of 1. Lists are 1-based. `table` is a reserved word as a parameter name.
- CSV loading needs explicit `quote='"', escape='"'` (quoted commas fail otherwise), `parallel=false`,
  and typed columns (an untyped load reads a weight as `DECIMAL(20,1)`).
- One relationship table for deep recursion: a union of 61 labels at depth 6 took 126 ms against
  18 ms for the single arc table `A` (unbounded: 388 ms against 27 to 40 ms).
- Every query result must be closed at once, or the buffer pool fills within seconds.
- Every prepared statement pins buffer-pool pages (about 2.3 MB for a recursive pattern) until the
  process ends; it has no `close()`, and garbage collection does not release it. So texts that carry
  per-task literals go through `querySync`, and at most 48 constant texts are prepared per store.
- A closed `Database` does not return its native memory to a live process: about 25 MB per store
  with plain queries and about 95 MB with prepared statements (15 stores measured). The 53-store
  sweep was killed at the 4 GB limit; one child process per store fixes it.
- Each `Database` reserves 8 TiB of address space by default; 60 tasks into a sweep (a handful of
  stores in one process) the next open failed ("Mmap for size 8796093022208 failed"); `maxDBSize` is set to 4 GiB.
- An interrupted build leaves a `.wal` that a rebuilt database of the same name refuses; the build
  now removes every sibling file first.
- `GDS_PPR` with `tolerance := 0` never returns. `GDS_*` take one relationship table, node offsets,
  and are undirected and unweighted; `GDS_CLOSENESS` fails on a disconnected graph.
- `louvain()` takes no seed; `page_rank` after deleting nodes counts the deleted slots (scores scale
  by live / allocated nodes, 0.98789 after the one-file update).
- With 24 threads, small queries were slower than with 1; every run here uses 1 thread per query.

## Harness handicaps (none changes an answer)

- Other lanes ran containers on the same host during these runs, and the stage-1 sweep (on its own
  copy of the stores) and the bench each ran beside the extra cross-check, so every latency here is
  indicative only.
- Only one process can hold a store, and a closed `Database` keeps its file lock inside a live
  process, so the bench runs every store-opening step in a child process.
- The child-process IPC round trip is in the harness's wall time (above).
