# Engine benches (protocol addendum 4, section E)

Generated 2026-11-12T22:18:24.621Z from relational, ladybug, duckpgq. **SMOKE RUN (5 seeds per class): these numbers only prove the scripts work and are discarded.**

Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.

## Labels that go with every number here (addendum 4, item 20)

- DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).
- LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).
- SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
- Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

## Run

- Seeds per class: 5 (warm), cold samples per class and thread setting: 5, timed repetitions per seed: 3, store builds per graph: 3, calibration seeds: 5, no-op samples: 500, thread candidates: 1, 2, 4, 6.
- Container CPUs allowed: 12,14,16,18,20,22 (Node sees 6); load average at start of each engine: relational 0.55 0.56 0.56 1/786 19; ladybug 1.17 0.79 0.64 1/782 19; duckpgq 1.16 1.04 0.77 1/781 19.
- Graphs: tune = 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (2450 nodes, 7077 edges; the largest TUNE parent), frozen = a31924a3818f4ac94b695906d107c72c912792b2 (5464 nodes, 16462 edges).
- Configurations: primary 95e990307da3b42b, S1 6b70cc1222745385, base 8067b9cf65e59b2f, S2 f233ae069bdba0ce; plus the 20 TUNE question lookups (TQ) on the frozen graph.

## Store build and size

| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |
|---|---|---|---|---|
| relational | tune | 293 (3 runs: 293, 293, 308) | 79.5 | 4509696 (4.3) |
| relational | frozen | 752 (3 runs: 730, 763, 752) | 151 | 11243520 (10.7) |
| ladybug | tune | 1954 (3 runs: 2024, 1954, 1932) | 81.1 | 15450186 (14.7) |
| ladybug | frozen | 2292 (3 runs: 2269, 2292, 2300) | 161 | 19144878 (18.3) |
| duckpgq | tune | 404 (3 runs: 417, 400, 404) | 77.7 | 16003072 (15.3) |
| duckpgq | frozen | 514 (3 runs: 544, 495, 514) | 152 | 17051648 (16.3) |

## Latency per query class

warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 13.5 / 14.0 | 12.4 / 13.1 | 19.7 / 20.6 | 3.03 / 3.12 | 11.8 / 12.1 | 1.22 / 1.78 | 49 | 0.03 | 19 / 2475 / 43 | 2068 |
| ladybug | 1 (best) | 36.9 / 39.5 | 35.6 / 40.0 | 87.6 / 92.0 | 22.8 / 24.2 | 31.6 / 33.1 | 3.44 / 4.25 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| duckpgq | 1 (best) | 45.6 / 50.3 | 48.5 / 50.9 | 160 / 191 | 79.1 / 105 | 45.2 / 51.2 | 0.24 / 0.34 | 22 | 7.64 | 16 / 3242 / 33 | 2068 |

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 101 / 107 | 110 / 113 | 115 / 119 | 2.91 / 3.23 | 100 / 104 | 1.23 / 1.74 | 272 | 0.14 | 21 / 2952 / 53 | 1119 |
| ladybug | 1 (best) | 14.1 / 23.0 | 27.1 / 33.3 | 85.9 / 98.8 | 22.2 / 22.6 | 9.91 / 17.3 | 3.44 / 5.82 | 2 | 0.01 | 2 / 471 / 2 | 1119 |
| duckpgq | 1 (best) | 29.2 / 31.8 | 32.4 / 37.7 | 152 / 166 | 86.6 / 95.3 | 31.6 / 35.6 | 0.18 / 0.31 | 12 | 3.98 | 13 / 2680 / 39 | 1119 |

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 95.2 / 95.9 | 104 / 107 | 108 / 113 | 2.98 / 3.29 | 92.3 / 92.6 | 0.71 / 1.31 | 272 | 0.14 | 21 / 2952 / 53 | 210 |
| ladybug | 1 (best) | 3.54 / 4.28 | 16.7 / 18.2 | 75.4 / 76.1 | 22.5 / 23.7 | 1.48 / 2.57 | 2.07 / 3.18 | 2 | 0.01 | 2 / 471 / 2 | 210 |
| duckpgq | 1 (best) | 27.5 / 29.2 | 32.8 / 33.8 | 136 / 142 | 78.2 / 81.9 | 26.0 / 27.3 | 0.14 / 0.15 | 12 | 3.83 | 13 / 2680 / 39 | 210 |

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 (best) | 40.5 / 45.5 | 55.4 / 70.0 | 121 / 125 | 22.8 / 23.9 | 33.8 / 35.7 | 6.66 / 10.2 | 4 | 0.03 | 4 / 576 / 4 | 2068 |

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 32.5 / 34.0 | 31.3 / 33.7 | 43.0 / 46.0 | 5.04 / 5.26 | 29.6 / 31.5 | 6.46 / 7.42 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| relational | 2 (best) | 32.9 / 34.1 | 31.4 / 34.4 | 44.0 / 53.6 | 4.39 / 5.00 | 28.6 / 30.4 | 5.23 / 6.99 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| ladybug | 1 | 73.9 / 77.5 | 67.3 / 72.2 | 132 / 143 | 24.9 / 33.0 | 57.2 / 59.3 | 8.79 / 15.0 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| ladybug | 2 (best) | 67.7 / 72.3 | 60.0 / 64.7 | 131 / 134 | 24.1 / 24.9 | 51.6 / 52.4 | 10.8 / 17.0 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| duckpgq | 1 (best) | 83.4 / 86.3 | 80.3 / 89.6 | 202 / 225 | 82.3 / 83.2 | 78.9 / 93.1 | 0.42 / 1.08 | 24 | 9.97 | 15 / 3207 / 32 | 4990 |

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 228 / 247 | 240 / 258 | 254 / 272 | 4.93 / 5.00 | 217 / 238 | 1.37 / 1.77 | 271 | 0.15 | 21 / 2952 / 53 | 899 |
| ladybug | 1 (best) | 11.5 / 32.4 | 46.0 / 65.3 | 111 / 138 | 23.7 / 24.3 | 5.03 / 24.5 | 8.57 / 12.8 | 2 | 0.01 | 2 / 471 / 2 | 899 |
| duckpgq | 1 (best) | 44.0 / 53.7 | 48.2 / 55.9 | 167 / 174 | 85.6 / 94.3 | 47.5 / 52.3 | 0.20 / 0.29 | 12 | 3.87 | 12 / 2645 / 38 | 899 |

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 219 / 228 | 242 / 250 | 245 / 260 | 4.43 / 4.88 | 218 / 227 | 0.62 / 1.05 | 271 | 0.14 | 21 / 2952 / 53 | 29 |
| relational | 2 (best) | 225 / 228 | 249 / 256 | 249 / 260 | 4.63 / 5.35 | 220 / 231 | 0.69 / 1.01 | 271 | 0.14 | 21 / 2952 / 53 | 29 |
| ladybug | 1 (best) | 6.43 / 7.51 | 38.3 / 40.1 | 100.0 / 104 | 23.1 / 23.4 | 1.25 / 1.85 | 5.02 / 5.37 | 2 | 0.01 | 2 / 471 / 2 | 29 |
| duckpgq | 1 (best) | 42.2 / 43.9 | 46.4 / 48.6 | 151 / 167 | 79.9 / 86.8 | 39.3 / 40.1 | 0.11 / 0.12 | 12 | 3.99 | 12 / 2645 / 38 | 29 |

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 | 86.2 / 94.5 | 113 / 116 | 197 / 198 | 23.4 / 24.5 | 65.8 / 66.6 | 17.2 / 19.6 | 4 | 0.03 | 4 / 576 / 4 | 4990 |
| ladybug | 2 (best) | 80.8 / 88.0 | 105 / 118 | 196 / 202 | 23.4 / 24.8 | 56.6 / 59.1 | 18.2 / 22.2 | 4 | 0.03 | 4 / 576 / 4 | 4990 |

### frozen / tq: the 20 TUNE question lookups (frozen commit)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 0.27 / 0.65 | 0.29 / 0.63 | 5.80 / 161 | 4.67 / 5.52 | 0.25 / 0.58 | 0.05 / 0.07 | 3 | 0.00 | 8 / 3022 / 72 | 133 |
| ladybug | 1 (best) | 2.62 / 5.29 | 2.15 / 4.81 | 81.2 / 214 | 23.3 / 24.8 | 2.11 / 4.72 | 0.08 / 0.23 | 4 | 0.03 | 15 / 2902 / 21 | 133 |
| duckpgq | 1 | 10.2 / 71.4 | 11.0 / 73.7 | 190 / 297 | 84.7 / 90.2 | 10.9 / 71.9 | 0.07 / 0.11 | 1 | 0.35 | 7 / 3530 / 35 | 133 |
| duckpgq | 6 (best) | 10.2 / 69.3 | 9.96 / 72.4 | 209 / 301 | 88.2 / 105 | 9.06 / 68.0 | 0.05 / 0.08 | 1 | 0.40 | 7 / 3530 / 35 | 133 |

## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)

- relational / tune: primary [1:13.6 2:13.6 4:13.9 6:13.4] best 1; S1 [1:101 2:99.9 4:99.9 6:99.0] best 1; base [1:94.6 2:94.1 4:93.3 6:93.3] best 1. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- relational / frozen: primary [1:31.7 2:31.2 4:30.5 6:31.1] best 2; S1 [1:238 2:234 4:234 6:235] best 1; base [1:233 2:226 4:223 6:225] best 2; tq [1:0.25 2:0.28 4:0.25 6:0.31] best 1. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- ladybug / tune: primary [1:37.2 2:37.7 4:38.3 6:41.3] best 1; S1 [1:17.5 2:19.1 4:20.7 6:20.0] best 1; base [1:4.38 2:6.40 4:10.3 6:10.0] best 1; S2 [1:41.7 2:40.5 4:41.0 6:45.0] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- ladybug / frozen: primary [1:69.1 2:63.3 4:67.3 6:69.1] best 2; S1 [1:23.9 2:24.6 4:27.1 6:29.4] best 1; base [1:6.79 2:9.10 4:12.5 6:14.2] best 1; S2 [1:84.0 2:80.7 4:80.3 6:81.8] best 2; tq [1:2.95 2:6.79 4:9.14 6:13.2] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- duckpgq / tune: primary [1:45.1 2:52.6 4:54.9 6:57.1] best 1; S1 [1:32.6 2:34.3 4:42.3 6:41.0] best 1; base [1:28.0 2:30.3 4:31.3 6:35.3] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).
- duckpgq / frozen: primary [1:79.1 2:89.1 4:91.9 6:92.6] best 1; S1 [1:49.7 2:53.3 4:55.9 6:59.2] best 1; base [1:42.0 2:44.7 4:45.2 6:50.7] best 1; tq [1:10.7 2:10.4 4:10.3 6:9.15] best 6. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).

## Caches held or keyed by application code (addendum 4, item e)

- relational: **PageRank transition tables (trcN, trucN)**: SQLite TEMP tables in the engine, created and keyed per (direction, classes, co-change weight, hub set) by application code (RelGraph.cache); classes: S1, base; dropped in "uncached": yes.
- relational: **hub sets (hcN)**: SQLite TEMP tables keyed by application code; classes: none timed; dropped in "uncached": yes (no timed class uses a hub cut).
- relational: **prepared-statement cache (RelGraph.stmts)**: application code (statement handles; the plans live in the engine); classes: primary, S1, base; dropped in "uncached": no (kept in warm_uncached; empty only in a cold sample).
- relational: **SQLite page cache (64 MiB)**: engine; classes: all; dropped in "uncached": no (engine-internal; empty only in a cold sample).
- ladybug: **PageRank transition CSR (cache key tr|...)**: application code (JavaScript arrays in LbGraph.cache), filled by one Cypher query per (direction, classes, co-change weight, hub); classes: S1, base, S2; dropped in "uncached": yes.
- ladybug: **blocked-node sets (cache key blk|...)**: application code (LbGraph.cache); classes: none timed; dropped in "uncached": yes (no timed class uses a hub cut).
- ladybug: **prepared statements (LbGraph.ps, at most 48 texts)**: application code holds the handles; each pins buffer-pool pages in the engine; classes: all; dropped in "uncached": no (kept in warm_uncached (dropping them would pin more pool pages per re-prepare); empty only in a cold sample).
- ladybug: **buffer pool (1 GiB)**: engine; classes: all; dropped in "uncached": no (engine-internal; empty only in a cold sample).
- ladybug: **stored community prior (N.comm, from arms/ladybug/priors/<canonical hash>.json)**: stored in the database at build time (not a runtime cache); classes: S2; dropped in "uncached": no.
- duckpgq: **PageRank transition tables (trN)**: DuckDB TEMP tables in the engine, keyed per (direction, classes, co-change weight, hub set) by application code (PgqGraph.cache); classes: S1, base; dropped in "uncached": yes.
- duckpgq: **hub sets, native pagerank / WCC results (hbN, gprN, wcN)**: DuckDB TEMP tables keyed by application code; classes: none timed; dropped in "uncached": yes (no timed class uses them).
- duckpgq: **rowid map, kinds, meta (read at open)**: application code (PgqGraph fields); classes: all; dropped in "uncached": no (part of open; empty only in a cold sample).
- duckpgq: **DuckDB buffer manager (memory_limit 2GB)**: engine; classes: all; dropped in "uncached": no (engine-internal; empty only in a cold sample).

## LadybugDB as the harness runs it (child process per store, one IPC round trip per ranking; 1 thread)

| graph | class | harness wall | child rank | IPC round trip |
|---|---|---|---|---|
| tune | primary | 38.2 / 43.1 | 35.6 / 40.8 | 2.62 / 3.00 |
| tune | S1 | 14.1 / 22.6 | 13.2 / 20.1 | 0.89 / 2.49 |
| tune | base | 4.21 / 5.98 | 3.86 / 5.50 | 0.26 / 0.77 |
| tune | S2 | 42.1 / 44.8 | 40.1 / 42.8 | 2.00 / 2.39 |
| frozen | primary | 79.3 / 90.7 | 71.0 / 80.8 | 6.27 / 9.96 |
| frozen | S1 | 12.1 / 33.7 | 10.8 / 31.6 | 1.26 / 2.79 |
| frozen | base | 6.30 / 8.37 | 6.15 / 7.61 | 0.15 / 1.59 |
| frozen | S2 | 94.4 / 99.9 | 86.0 / 92.5 | 8.40 / 9.12 |

## One-file update (bench/update.js): re-ingest one seed file into an existing store, local and global refresh

| engine | graph | files | update | delete | insert | local refresh | global refresh | answers differing | fingerprint differences |
|---|---|---|---|---|---|---|---|---|---|
| relational | tune | 5 | 194 / 205 | 1.60 / 1.64 | 0.40 / 0.56 | 1.03 / 1.29 | 97.8 / 101 | 0 | 0 |
| relational | frozen | 5 | 286 / 485 | 1.66 / 2.42 | 0.15 / 0.56 | 0.32 / 1.56 | 226 / 244 | 0 | 0 |
| ladybug | tune | 5 | 420 / 732 | 13.8 / 18.4 | 62.8 / 101 | 55.0 / 128 | 288 / 413 | 0 | 0 |
| ladybug | frozen | 5 | 613 / 745 | 9.00 / 15.2 | 55.1 / 93.9 | 61.6 / 134 | 465 / 536 | 0 | 0 |
| duckpgq | tune | 5 | 168 / 181 | 51.8 / 56.4 | 74.5 / 83.5 | 11.6 / 12.4 | 0.00 / 0.00 | 0 | 0 |
| duckpgq | frozen | 5 | 124 / 189 | 26.2 / 57.6 | 46.0 / 83.5 | 10.9 / 11.8 | 0.00 / 0.00 | 0 | 0 |

Each update is timed over its parts (other parts: SQLite closure and commit; LadybugDB commit; DuckDB commit, node-table reorder and checkpoint). Known engine effects (not failures): ladybug: LadybugDB page_rank counts deleted node slots (see bench/update.js KNOWN); no timed class reads the stored prank column.

## Equivalence of the timed answers

Reference arm against each engine (seeds with equal order / equal scores at 1e-9 / exactly equal):

- relational: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@2 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5; frozen/base@2 5/5/5 of 5
- ladybug: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@2 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- duckpgq: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- TQ: 5 questions, answers equal across relational, ladybug, duckpgq: true.
- LadybugDB S2 on tune: equal across thread settings 1: true; cold equal to warm: true.
- LadybugDB S2 on frozen: equal across thread settings 1, 2: true; cold equal to warm: true.
- Problems: none.

## The three unrelated host containers (docker stats --no-stream, before and after each engine)

| when | engine | container | CPU % | memory |
|---|---|---|---|---|
| before | relational | postiz | 0.25% | 1.264GiB / 15.18GiB |
| before | relational | postiz-postgres | 0.00% | 39.75MiB / 15.18GiB |
| before | relational | postiz-redis | 0.07% | 9.344MiB / 15.18GiB |
| after | relational | postiz | 0.27% | 1.264GiB / 15.18GiB |
| after | relational | postiz-postgres | 0.00% | 40.94MiB / 15.18GiB |
| after | relational | postiz-redis | 0.10% | 9.914MiB / 15.18GiB |
| before | update-relational | postiz | 0.21% | 1.264GiB / 15.18GiB |
| before | update-relational | postiz-postgres | 2.61% | 41.55MiB / 15.18GiB |
| before | update-relational | postiz-redis | 2.24% | 10.92MiB / 15.18GiB |
| after | update-relational | postiz | 0.23% | 1.264GiB / 15.18GiB |
| after | update-relational | postiz-postgres | 0.00% | 41.58MiB / 15.18GiB |
| after | update-relational | postiz-redis | 0.08% | 10.38MiB / 15.18GiB |
| before | ladybug | postiz | 0.29% | 1.264GiB / 15.18GiB |
| before | ladybug | postiz-postgres | 0.00% | 41.43MiB / 15.18GiB |
| before | ladybug | postiz-redis | 0.09% | 10.32MiB / 15.18GiB |
| after | ladybug | postiz | 0.26% | 1.264GiB / 15.18GiB |
| after | ladybug | postiz-postgres | 2.51% | 42.31MiB / 15.18GiB |
| after | ladybug | postiz-redis | 2.25% | 10.45MiB / 15.18GiB |
| before | update-ladybug | postiz | 0.24% | 1.264GiB / 15.18GiB |
| before | update-ladybug | postiz-postgres | 0.00% | 42.27MiB / 15.18GiB |
| before | update-ladybug | postiz-redis | 0.06% | 10.39MiB / 15.18GiB |
| after | update-ladybug | postiz | 0.35% | 1.264GiB / 15.18GiB |
| after | update-ladybug | postiz-postgres | 2.57% | 41.57MiB / 15.18GiB |
| after | update-ladybug | postiz-redis | 2.28% | 10.47MiB / 15.18GiB |
| before | duckpgq | postiz | 0.41% | 1.264GiB / 15.18GiB |
| before | duckpgq | postiz-postgres | 0.00% | 41.45MiB / 15.18GiB |
| before | duckpgq | postiz-redis | 0.09% | 10.46MiB / 15.18GiB |
| after | duckpgq | postiz | 0.24% | 1.264GiB / 15.18GiB |
| after | duckpgq | postiz-postgres | 0.00% | 40.31MiB / 15.18GiB |
| after | duckpgq | postiz-redis | 0.09% | 8.68MiB / 15.18GiB |
| before | update-duckpgq | postiz | 0.28% | 1.264GiB / 15.18GiB |
| before | update-duckpgq | postiz-postgres | 0.00% | 40.31MiB / 15.18GiB |
| before | update-duckpgq | postiz-redis | 0.10% | 8.637MiB / 15.18GiB |
| after | update-duckpgq | postiz | 0.28% | 1.264GiB / 15.18GiB |
| after | update-duckpgq | postiz-postgres | 0.00% | 40.45MiB / 15.18GiB |
| after | update-duckpgq | postiz-redis | 0.10% | 9.293MiB / 15.18GiB |

## What makes a number not comparable across engines

- relational: Synchronous in-process client: a statement round trip is a direct C call (no event-loop hop), unlike the DuckDB Node client.
- relational: The thread knob only adds sorter threads; a recursive CTE never runs on more than one thread.
- relational: Unbounded k-hop (the primary) is a level-wise loop of SQL statements driven by application code (rel.js), one statement per BFS level.
- ladybug: PageRank (S1, base and the PageRank part of S2) iterates in application code over a transition CSR cached in application code; the engine only supplies the arcs. warm_uncached drops that CSR before every call.
- ladybug: The harness runs this arm in a child process per store; the bench times it in process, and reports the IPC round trip per ranking of the harness form separately (harness_ipc).
- ladybug: The store build includes the native priors (page_rank, k-core, Louvain; the community grouping is then read from the stored prior file) and a CSV export of the canonical graph.
- ladybug: One thread per query is the arm default; small queries were slower with many threads (arms/ladybug/NOTES.md).
- duckpgq: Asynchronous client: every statement is a promise; the per-statement round trip (worker thread, promise, event loop) is inside engine_api and estimated apart (roundtrip_estimate).
- duckpgq: Bounded k-hop (S1, base) is a recursive SQL statement and unbounded k-hop (the primary) is iterativelength() over a CSR built inside the statement: DuckPGQ has no bounded graph traversal operator.
- duckpgq: Sums on several threads are not bit-stable (addendum 4 item 21); answers are compared with scores rounded to 1e-9 as well as exactly.
- duckpgq: The store build includes a CSV export of the canonical graph, the label tables, the arc table and two stored property graphs.
- All engines: "cold" starts a fresh process and connection, but the operating-system file cache stays warm (dropping it needs privileges the container does not have); store files sit on the container filesystem.
- All engines: the CPU set is pinned inside the Docker Desktop WSL2 virtual machine; Hyper-V may still move those virtual CPUs between physical cores.
- All engines: builds run at each engine's default thread count (SQLite one thread); only queries are timed at 1 and at the best setting.
- All engines: store contents differ (each arm stores what its queries need: SQLite a closure table, FTS5 and a global PageRank column; LadybugDB typed and arc relationship tables, a term graph and native priors; DuckDB label tables, an arc table, BM25 postings and two stored property graphs), so bytes on disk compare designs, not engines alone.
- tune seeds come from TUNE T1 tasks of many parents, mapped onto the largest TUNE parent by path and symbol (plan.json says how many come from that parent's own tasks).

