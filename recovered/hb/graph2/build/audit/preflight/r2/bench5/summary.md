# Engine benches (protocol addendum 4, section E)

Generated 2026-11-12T21:39:29.466Z from relational, ladybug, duckpgq. **SMOKE RUN (5 seeds per class): these numbers only prove the scripts work and are discarded.**

Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.

## Labels that go with every number here (addendum 4, item 20)

- DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).
- LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).
- SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).

## Run

- Seeds per class: 5 (warm), cold samples per class and thread setting: 5, timed repetitions per seed: 3, store builds per graph: 3, calibration seeds: 5, no-op samples: 500, thread candidates: 1, 2, 4, 6.
- Container CPUs allowed: 12,14,16,18,20,22 (Node sees 6); load average at start of each engine: relational 0.92 0.82 0.70 1/783 19; ladybug 1.09 1.13 0.94 1/780 19; duckpgq 1.05 1.17 0.99 2/784 19.
- Graphs: tune = 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (2450 nodes, 7077 edges; the largest TUNE parent), frozen = a31924a3818f4ac94b695906d107c72c912792b2 (5464 nodes, 16462 edges).
- Configurations: primary 95e990307da3b42b, S1 6b70cc1222745385, base 8067b9cf65e59b2f, S2 f233ae069bdba0ce; plus the 20 TUNE question lookups (TQ) on the frozen graph.

## Store build and size

| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |
|---|---|---|---|---|
| relational | tune | 311 (3 runs: 313, 304, 311) | 77.0 | 4509696 (4.3) |
| relational | frozen | 2274 (3 runs: 1464, 2274, 2565) | 1426 | 11243520 (10.7) |
| ladybug | tune | 1940 (3 runs: 1940, 2163, 1918) | 77.4 | 15450194 (14.7) |
| ladybug | frozen | 2625 (3 runs: 2625, 3017, 2314) | 165 | 19144878 (18.3) |
| duckpgq | tune | 537 (3 runs: 533, 760, 537) | 74.3 | 16003072 (15.3) |
| duckpgq | frozen | 509 (3 runs: 506, 522, 509) | 164 | 17051648 (16.3) |

## Latency per query class

warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 38.4 / 55.8 | 41.9 / 62.0 | 32.4 / 39.5 | 4.55 / 4.81 | 22.4 / 41.0 | 1.82 / 6.54 | 49 | 0.05 | 19 / 2475 / 43 | 2068 |
| ladybug | 1 | 46.2 / 66.3 | 36.2 / 40.5 | 93.1 / 99.4 | 24.9 / 25.5 | 34.3 / 35.9 | 4.50 / 5.41 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| ladybug | 2 (best) | 35.6 / 40.3 | 39.1 / 45.2 | 97.0 / 168 | 24.5 / 37.2 | 32.2 / 33.3 | 4.15 / 5.09 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| duckpgq | 1 (best) | 42.8 / 49.9 | 41.9 / 47.0 | 157 / 161 | 79.2 / 87.9 | 55.7 / 62.2 | 0.32 / 0.43 | 22 | 7.28 | 16 / 3242 / 33 | 2068 |

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 182 / 208 | 330 / 409 | 349 / 378 | 4.71 / 6.36 | 264 / 336 | 2.00 / 5.21 | 272 | 0.26 | 21 / 2952 / 53 | 1119 |
| ladybug | 1 (best) | 16.1 / 20.7 | 27.6 / 36.9 | 92.3 / 102 | 24.2 / 26.1 | 12.8 / 17.5 | 3.86 / 5.21 | 2 | 0.01 | 2 / 471 / 2 | 1119 |
| duckpgq | 1 (best) | 29.0 / 32.0 | 32.2 / 34.6 | 141 / 145 | 76.3 / 79.7 | 29.4 / 31.4 | 0.14 / 0.33 | 12 | 3.74 | 13 / 2680 / 39 | 1119 |

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 318 / 343 | 339 / 404 | 189 / 201 | 3.71 / 4.77 | 177 / 207 | 1.71 / 2.36 | 272 | 0.27 | 21 / 2952 / 53 | 210 |
| ladybug | 1 (best) | 3.67 / 5.33 | 17.5 / 29.5 | 81.7 / 127 | 24.2 / 35.5 | 1.50 / 2.70 | 1.95 / 2.64 | 2 | 0.01 | 2 / 471 / 2 | 210 |
| duckpgq | 1 (best) | 26.0 / 26.8 | 28.4 / 29.6 | 142 / 148 | 80.1 / 91.0 | 26.0 / 27.5 | 0.12 / 0.17 | 12 | 3.90 | 13 / 2680 / 39 | 210 |

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 (best) | 42.5 / 45.6 | 65.9 / 68.2 | 130 / 134 | 23.7 / 24.9 | 34.3 / 36.7 | 6.90 / 9.54 | 4 | 0.03 | 4 / 576 / 4 | 2068 |

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 61.7 / 66.5 | 53.0 / 70.6 | 89.3 / 119 | 7.68 / 15.7 | 51.9 / 82.4 | 6.77 / 7.74 | 53 | 0.04 | 19 / 2475 / 43 | 4990 |
| relational | 6 (best) | 100 / 121 | 82.6 / 129 | 116 / 144 | 7.52 / 7.80 | 92.8 / 135 | 8.10 / 18.3 | 53 | 0.06 | 19 / 2475 / 43 | 4990 |
| ladybug | 1 | 127 / 161 | 68.2 / 71.4 | 140 / 146 | 24.1 / 26.0 | 58.7 / 75.2 | 11.6 / 16.4 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| ladybug | 2 (best) | 83.5 / 112 | 112 / 124 | 133 / 133 | 24.3 / 24.6 | 52.3 / 101 | 9.14 / 13.7 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| duckpgq | 1 (best) | 80.7 / 91.7 | 82.1 / 86.0 | 205 / 218 | 87.2 / 89.4 | 80.3 / 88.4 | 0.60 / 1.11 | 24 | 7.68 | 15 / 3207 / 32 | 4990 |

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 430 / 464 | 819 / 941 | 747 / 777 | 7.70 / 7.88 | 730 / 747 | 2.70 / 9.70 | 271 | 0.27 | 21 / 2952 / 53 | 899 |
| relational | 4 (best) | 455 / 529 | 710 / 910 | 467 / 1066 | 7.95 / 7.97 | 730 / 749 | 2.47 / 11.8 | 271 | 0.26 | 21 / 2952 / 53 | 899 |
| ladybug | 1 | 11.7 / 33.6 | 48.1 / 68.8 | 125 / 159 | 24.3 / 28.9 | 5.50 / 23.9 | 8.94 / 14.9 | 2 | 0.01 | 2 / 471 / 2 | 899 |
| ladybug | 2 (best) | 14.2 / 30.9 | 46.2 / 61.0 | 144 / 166 | 24.4 / 35.2 | 6.55 / 22.0 | 9.15 / 13.7 | 2 | 0.01 | 2 / 471 / 2 | 899 |
| duckpgq | 1 (best) | 43.6 / 53.1 | 47.8 / 56.6 | 162 / 166 | 79.1 / 95.9 | 45.2 / 51.7 | 0.20 / 0.27 | 12 | 3.99 | 12 / 2645 / 38 | 899 |

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 436 / 510 | 765 / 899 | 535 / 806 | 7.83 / 8.42 | 747 / 807 | 1.25 / 2.06 | 271 | 0.31 | 21 / 2952 / 53 | 29 |
| ladybug | 1 | 6.83 / 10.6 | 38.8 / 42.4 | 108 / 111 | 23.5 / 23.9 | 1.09 / 2.02 | 5.58 / 5.86 | 2 | 0.01 | 2 / 471 / 2 | 29 |
| ladybug | 2 (best) | 7.76 / 8.77 | 37.0 / 39.8 | 110 / 121 | 26.4 / 33.6 | 4.24 / 4.70 | 7.54 / 9.68 | 2 | 0.02 | 2 / 471 / 2 | 29 |
| duckpgq | 1 (best) | 40.1 / 41.4 | 45.1 / 47.2 | 159 / 163 | 80.6 / 88.0 | 44.0 / 46.1 | 0.14 / 0.15 | 12 | 4.24 | 12 / 2645 / 38 | 29 |

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 | 92.7 / 98.7 | 120 / 124 | 205 / 209 | 24.3 / 32.7 | 119 / 152 | 30.3 / 38.2 | 4 | 0.04 | 4 / 576 / 4 | 4990 |
| ladybug | 6 (best) | 80.5 / 90.3 | 244 / 264 | 200 / 211 | 25.0 / 25.9 | 71.1 / 115 | 28.0 / 35.0 | 4 | 0.03 | 4 / 576 / 4 | 4990 |

### frozen / tq: the 20 TUNE question lookups (frozen commit)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 0.35 / 0.90 | 0.37 / 1.06 | 8.58 / 8.71 | 6.89 / 7.77 | 0.29 / 0.91 | 0.09 / 0.11 | 3 | 0.00 | 8 / 3022 / 72 | 133 |
| relational | 4 (best) | 0.46 / 0.94 | 0.35 / 0.89 | 9.02 / 11.9 | 7.80 / 10.1 | 0.30 / 0.90 | 0.07 / 0.09 | 3 | 0.00 | 8 / 3022 / 72 | 133 |
| ladybug | 1 (best) | 2.13 / 4.74 | 2.24 / 4.65 | 53.8 / 113 | 24.2 / 39.3 | 2.17 / 4.50 | 0.05 / 0.19 | 4 | 0.03 | 15 / 2862 / 21 | 133 |
| duckpgq | 1 (best) | 10.7 / 86.1 | 10.0 / 81.1 | 106 / 184 | 81.8 / 87.6 | 9.80 / 80.3 | 0.05 / 0.08 | 1 | 0.34 | 7 / 3530 / 35 | 133 |

## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)

- relational / tune: primary [1:14.7 2:14.6 4:23.8 6:39.5] best 1; S1 [1:116 2:209 4:180 6:336] best 1; base [1:97.6 2:310 4:194 6:304] best 1. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- relational / frozen: primary [1:121 2:98.4 4:92.5 6:78.1] best 6; S1 [1:737 2:719 4:425 6:677] best 4; base [1:402 2:706 4:728 6:629] best 1; tq [1:0.38 2:0.38 4:0.33 6:0.33] best 4. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- ladybug / tune: primary [1:59.9 2:37.8 4:41.5 6:44.0] best 2; S1 [1:17.9 2:18.1 4:23.0 6:22.4] best 1; base [1:4.58 2:7.24 4:15.4 6:10.3] best 1; S2 [1:42.6 2:41.8 4:41.5 6:47.2] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- ladybug / frozen: primary [1:79.0 2:66.3 4:70.1 6:77.5] best 2; S1 [1:35.0 2:24.9 4:26.8 6:29.9] best 2; base [1:10.8 2:9.87 4:12.0 6:14.2] best 2; S2 [1:88.6 2:150 4:85.7 6:82.2] best 6; tq [1:3.02 2:7.72 4:11.6 6:12.9] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- duckpgq / tune: primary [1:47.2 2:51.8 4:55.5 6:54.5] best 1; S1 [1:31.3 2:34.4 4:38.2 6:39.3] best 1; base [1:28.0 2:29.4 4:31.0 6:37.0] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).
- duckpgq / frozen: primary [1:79.7 2:84.5 4:88.3 6:91.8] best 1; S1 [1:48.8 2:52.3 4:54.0 6:58.1] best 1; base [1:38.9 2:44.3 4:44.9 6:46.5] best 1; tq [1:9.48 2:10.8 4:10.2 6:10.8] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).

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
| tune | primary | 39.5 / 51.0 | 37.2 / 48.6 | 2.57 / 2.93 |
| tune | S1 | 14.7 / 25.3 | 13.7 / 22.1 | 1.10 / 3.20 |
| tune | base | 4.27 / 5.62 | 3.88 / 5.16 | 0.27 / 1.01 |
| tune | S2 | 42.3 / 50.4 | 40.2 / 47.6 | 1.86 / 2.78 |
| frozen | primary | 83.9 / 90.0 | 76.1 / 82.6 | 7.42 / 9.16 |
| frozen | S1 | 11.9 / 38.3 | 11.2 / 33.6 | 1.26 / 4.73 |
| frozen | base | 8.17 / 10.1 | 7.26 / 9.73 | 0.36 / 1.60 |
| frozen | S2 | 95.9 / 134 | 86.8 / 119 | 8.93 / 15.4 |

## One-file update (bench/update.js): re-ingest one seed file into an existing store, local and global refresh

| engine | graph | files | update | delete | insert | local refresh | global refresh | answers differing | fingerprint differences |
|---|---|---|---|---|---|---|---|---|---|
| relational | tune | 5 | 199 / 223 | 1.63 / 1.70 | 0.47 / 0.58 | 1.17 / 1.22 | 103 / 120 | 0 | 0 |
| relational | frozen | 5 | 317 / 490 | 1.70 / 2.27 | 0.17 / 0.60 | 0.36 / 1.70 | 240 / 258 | 0 | 0 |
| ladybug | tune | 5 | 453 / 867 | 14.2 / 17.9 | 63.7 / 87.3 | 55.8 / 258 | 307 / 480 | 0 | 0 |
| ladybug | frozen | 5 | 923 / 1122 | 12.1 / 16.3 | 88.9 / 102 | 127 / 146 | 646 / 884 | 0 | 0 |
| duckpgq | tune | 5 | 163 / 172 | 49.9 / 54.6 | 73.6 / 77.3 | 11.8 / 12.7 | 0.00 / 0.00 | 0 | 0 |
| duckpgq | frozen | 5 | 121 / 184 | 25.2 / 54.6 | 44.6 / 80.2 | 10.3 / 12.0 | 0.00 / 0.00 | 0 | 0 |

Each update is timed over its parts (other parts: SQLite closure and commit; LadybugDB commit; DuckDB commit, node-table reorder and checkpoint). Known engine effects (not failures): ladybug: LadybugDB page_rank counts deleted node slots (see bench/update.js KNOWN); no timed class reads the stored prank column.

## Equivalence of the timed answers

Reference arm against each engine (seeds with equal order / equal scores at 1e-9 / exactly equal):

- relational: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@6 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/S1@4 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- ladybug: tune/primary@1 5/5/5 of 5; tune/primary@2 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@2 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/S1@2 5/5/5 of 5; frozen/base@1 5/5/5 of 5; frozen/base@2 5/5/5 of 5
- duckpgq: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- TQ: 5 questions, answers equal across relational, ladybug, duckpgq: true.
- LadybugDB S2 on tune: equal across thread settings 1: true; cold equal to warm: true.
- LadybugDB S2 on frozen: equal across thread settings 1, 6: true; cold equal to warm: true.
- Problems: none.

## The three unrelated host containers (docker stats --no-stream, before and after each engine)

| when | engine | container | CPU % | memory |
|---|---|---|---|---|
| before | relational | postiz | 0.22% | 1.263GiB / 15.18GiB |
| before | relational | postiz-postgres | 0.00% | 41.27MiB / 15.18GiB |
| before | relational | postiz-redis | 2.20% | 10.1MiB / 15.18GiB |
| after | relational | postiz | 0.35% | 1.264GiB / 15.18GiB |
| after | relational | postiz-postgres | 0.00% | 41.54MiB / 15.18GiB |
| after | relational | postiz-redis | 0.07% | 10.41MiB / 15.18GiB |
| before | update-relational | postiz | 0.33% | 1.264GiB / 15.18GiB |
| before | update-relational | postiz-postgres | 0.00% | 42.05MiB / 15.18GiB |
| before | update-relational | postiz-redis | 3.32% | 11MiB / 15.18GiB |
| after | update-relational | postiz | 0.21% | 1.264GiB / 15.18GiB |
| after | update-relational | postiz-postgres | 0.00% | 40.78MiB / 15.18GiB |
| after | update-relational | postiz-redis | 0.11% | 9.605MiB / 15.18GiB |
| before | ladybug | postiz | 0.37% | 1.264GiB / 15.18GiB |
| before | ladybug | postiz-postgres | 0.00% | 40.78MiB / 15.18GiB |
| before | ladybug | postiz-redis | 0.09% | 9.57MiB / 15.18GiB |
| after | ladybug | postiz | 0.27% | 1.264GiB / 15.18GiB |
| after | ladybug | postiz-postgres | 0.00% | 40.14MiB / 15.18GiB |
| after | ladybug | postiz-redis | 0.10% | 9.312MiB / 15.18GiB |
| before | update-ladybug | postiz | 0.41% | 1.264GiB / 15.18GiB |
| before | update-ladybug | postiz-postgres | 0.00% | 41.21MiB / 15.18GiB |
| before | update-ladybug | postiz-redis | 0.08% | 10.36MiB / 15.18GiB |
| after | update-ladybug | postiz | 0.35% | 1.264GiB / 15.18GiB |
| after | update-ladybug | postiz-postgres | 0.00% | 40.9MiB / 15.18GiB |
| after | update-ladybug | postiz-redis | 0.11% | 9.719MiB / 15.18GiB |
| before | duckpgq | postiz | 0.28% | 1.264GiB / 15.18GiB |
| before | duckpgq | postiz-postgres | 0.00% | 40.9MiB / 15.18GiB |
| before | duckpgq | postiz-redis | 0.10% | 9.719MiB / 15.18GiB |
| after | duckpgq | postiz | 0.34% | 1.264GiB / 15.18GiB |
| after | duckpgq | postiz-postgres | 0.00% | 40.1MiB / 15.18GiB |
| after | duckpgq | postiz-redis | 0.10% | 9.047MiB / 15.18GiB |
| before | update-duckpgq | postiz | 0.27% | 1.264GiB / 15.18GiB |
| before | update-duckpgq | postiz-postgres | 0.00% | 40.87MiB / 15.18GiB |
| before | update-duckpgq | postiz-redis | 0.09% | 9.527MiB / 15.18GiB |
| after | update-duckpgq | postiz | 0.29% | 1.264GiB / 15.18GiB |
| after | update-duckpgq | postiz-postgres | 2.50% | 40.98MiB / 15.18GiB |
| after | update-duckpgq | postiz-redis | 0.11% | 9.254MiB / 15.18GiB |

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

