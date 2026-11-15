# Engine benches (protocol addendum 4, section E)

Generated 2026-11-12T20:59:53.892Z from . Full run.

Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.

## Labels that go with every number here (addendum 4, item 20)

- DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).
- LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).
- SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).

## Run

- Graphs: tune = 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (2450 nodes, 7077 edges; the largest TUNE parent), frozen = a31924a3818f4ac94b695906d107c72c912792b2 (5464 nodes, 16462 edges).
- Configurations: primary 95e990307da3b42b, S1 6b70cc1222745385, base 8067b9cf65e59b2f, S2 f233ae069bdba0ce; plus the 20 TUNE question lookups (TQ) on the frozen graph.

## Store build and size

| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |
|---|---|---|---|---|

## Latency per query class

warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.

## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)


## Caches held or keyed by application code (addendum 4, item e)


## One-file update (bench/update.js): re-ingest one seed file into an existing store, local and global refresh

| engine | graph | files | update | delete | insert | local refresh | global refresh | answers differing | fingerprint differences |
|---|---|---|---|---|---|---|---|---|---|
| relational | tune | 99 | 228 / 432 | 1.67 / 2.80 | 0.36 / 1.07 | 0.91 / 2.20 | 160 / 237 | 0 | 0 |
| relational | frozen | 200 | 541 / 981 | 2.46 / 4.99 | 0.25 / 1.53 | 0.62 / 4.20 | 438 / 520 | 0 | 0 |
| ladybug | tune | 99 | 404 / 1053 | 10.9 / 36.3 | 42.3 / 183 | 57.2 / 98.4 | 286 / 775 | 0 | 0 |
| ladybug | frozen | 200 | 717 / 1497 | 8.93 / 23.0 | 56.7 / 150 | 62.1 / 83.8 | 562 / 1216 | 0 | 0 |
| duckpgq | tune | 99 | 271 / 579 | 70.4 / 118 | 96.4 / 167 | 16.6 / 27.6 | 0.00 / 0.00 | 0 | 0 |
| duckpgq | frozen | 200 | 456 / 754 | 73.1 / 153 | 119 / 267 | 24.6 / 52.5 | 0.00 / 0.00 | 0 | 0 |

Each update is timed over its parts (other parts: SQLite closure and commit; LadybugDB commit; DuckDB commit, node-table reorder and checkpoint). Known engine effects (not failures): ladybug: LadybugDB page_rank counts deleted node slots (see bench/update.js KNOWN); no timed class reads the stored prank column.

## Equivalence of the timed answers

check.json missing (bench/check.js not run).

## The three unrelated host containers (docker stats --no-stream, before and after each engine)

No host_stats.jsonl (run_all.sh writes it).

## What makes a number not comparable across engines

- All engines: "cold" starts a fresh process and connection, but the operating-system file cache stays warm (dropping it needs privileges the container does not have); store files sit on the container filesystem.
- All engines: the CPU set is pinned inside the Docker Desktop WSL2 virtual machine; Hyper-V may still move those virtual CPUs between physical cores.
- All engines: builds run at each engine's default thread count (SQLite one thread); only queries are timed at 1 and at the best setting.
- All engines: store contents differ (each arm stores what its queries need: SQLite a closure table, FTS5 and a global PageRank column; LadybugDB typed and arc relationship tables, a term graph and native priors; DuckDB label tables, an arc table, BM25 postings and two stored property graphs), so bytes on disk compare designs, not engines alone.
- tune seeds come from TUNE T1 tasks of many parents, mapped onto the largest TUNE parent by path and symbol (plan.json says how many come from that parent's own tasks).

