# Engine benches (protocol addendum 4, section E)

Generated 2026-11-12T20:15:42.465Z from relational, ladybug, duckpgq. **SMOKE RUN (5 seeds per class): these numbers only prove the scripts work and are discarded.**

Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.

## Labels that go with every number here (addendum 4, item 20)

- DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).
- LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).
- SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).

## Run

- Seeds per class: 5 (warm), cold samples per class and thread setting: 5, timed repetitions per seed: 3, store builds per graph: 3, calibration seeds: 5, no-op samples: 500, thread candidates: 1, 2, 4, 6.
- Container CPUs allowed: 12,14,16,18,20,22 (Node sees 6); load average at start of each engine: relational 0.35 0.43 0.53 1/783 19; ladybug 0.91 0.62 0.59 1/783 19; duckpgq 1.01 0.78 0.65 1/781 19.
- Graphs: tune = 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (2450 nodes, 7077 edges; the largest TUNE parent), frozen = a31924a3818f4ac94b695906d107c72c912792b2 (5464 nodes, 16462 edges).
- Configurations: primary 95e990307da3b42b, S1 6b70cc1222745385, base 8067b9cf65e59b2f, S2 f233ae069bdba0ce; plus the 20 TUNE question lookups (TQ) on the frozen graph.

## Store build and size

| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |
|---|---|---|---|---|
| relational | tune | 318 (3 runs: 309, 318, 327) | 146 | 4509696 (4.3) |
| relational | frozen | 806 (3 runs: 803, 809, 806) | 239 | 11243520 (10.7) |
| ladybug | tune | 2018 (3 runs: 2018, 2088, 2001) | 133 | 15450187 (14.7) |
| ladybug | frozen | 2384 (3 runs: 2399, 2384, 2304) | 234 | 19144879 (18.3) |
| duckpgq | tune | 421 (3 runs: 436, 407, 421) | 139 | 16003072 (15.3) |
| duckpgq | frozen | 495 (3 runs: 490, 495, 499) | 231 | 17051648 (16.3) |

## Latency per query class

warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 13.9 / 14.4 | 12.7 / 14.7 | 20.0 / 20.9 | 2.33 / 2.41 | 11.7 / 11.7 | 1.10 / 1.78 | 49 | 0.03 | 19 / 2475 / 43 | 2068 |
| relational | 2 (best) | 15.1 / 15.2 | 13.8 / 16.9 | 20.5 / 21.0 | 2.35 / 2.44 | 11.9 / 12.1 | 1.11 / 1.52 | 49 | 0.03 | 19 / 2475 / 43 | 2068 |
| ladybug | 1 (best) | 37.6 / 38.8 | 38.3 / 43.7 | 92.5 / 97.1 | 24.2 / 25.1 | 32.6 / 42.0 | 5.07 / 12.0 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| duckpgq | 1 (best) | 43.4 / 52.9 | 42.9 / 48.0 | 162 / 175 | 85.2 / 89.6 | 43.7 / 49.9 | 0.22 / 0.36 | 22 | 7.31 | 16 / 3242 / 33 | 2068 |

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 101 / 104 | 115 / 119 | 119 / 120 | 2.42 / 3.21 | 99.3 / 102 | 1.26 / 2.45 | 272 | 0.15 | 21 / 2952 / 53 | 1119 |
| relational | 4 (best) | 101 / 103 | 111 / 117 | 119 / 125 | 2.68 / 3.35 | 100 / 103 | 1.20 / 2.40 | 272 | 0.15 | 21 / 2952 / 53 | 1119 |
| ladybug | 1 (best) | 16.7 / 24.6 | 29.7 / 36.4 | 99.6 / 105 | 25.0 / 30.1 | 11.2 / 18.0 | 4.04 / 5.35 | 2 | 0.01 | 2 / 471 / 2 | 1119 |
| duckpgq | 1 (best) | 33.9 / 36.7 | 35.8 / 39.0 | 156 / 168 | 84.6 / 95.9 | 29.2 / 33.7 | 0.15 / 0.34 | 12 | 4.01 | 13 / 2680 / 39 | 1119 |

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 97.3 / 98.3 | 108 / 114 | 113 / 120 | 2.54 / 3.06 | 96.2 / 101 | 0.88 / 1.40 | 272 | 0.15 | 21 / 2952 / 53 | 210 |
| relational | 2 (best) | 96.1 / 99.2 | 108 / 113 | 121 / 132 | 2.67 / 3.42 | 103 / 110 | 0.85 / 1.08 | 272 | 0.17 | 21 / 2952 / 53 | 210 |
| ladybug | 1 (best) | 3.68 / 4.55 | 17.8 / 18.4 | 78.6 / 86.7 | 24.3 / 24.8 | 1.81 / 2.32 | 1.93 / 2.68 | 2 | 0.01 | 2 / 471 / 2 | 210 |
| duckpgq | 1 (best) | 27.3 / 28.0 | 29.1 / 29.7 | 147 / 169 | 88.4 / 101 | 30.3 / 35.0 | 0.17 / 0.24 | 12 | 4.11 | 13 / 2680 / 39 | 210 |

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 (best) | 45.0 / 48.6 | 57.4 / 66.6 | 129 / 138 | 23.7 / 25.3 | 34.5 / 35.9 | 6.18 / 8.24 | 4 | 0.03 | 4 / 576 / 4 | 2068 |

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 33.0 / 34.4 | 32.1 / 34.6 | 43.9 / 46.1 | 4.05 / 4.18 | 30.1 / 32.2 | 5.15 / 5.66 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| relational | 4 (best) | 35.0 / 36.5 | 31.7 / 38.5 | 47.0 / 48.4 | 4.19 / 4.57 | 29.6 / 34.1 | 5.08 / 5.33 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| ladybug | 1 | 78.0 / 86.0 | 69.8 / 76.4 | 139 / 152 | 24.8 / 26.7 | 61.7 / 69.0 | 11.2 / 16.7 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| ladybug | 2 (best) | 71.3 / 73.5 | 63.8 / 68.7 | 136 / 150 | 25.2 / 27.1 | 52.1 / 53.7 | 11.0 / 15.8 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| duckpgq | 1 (best) | 83.7 / 88.3 | 79.7 / 86.5 | 214 / 234 | 93.5 / 96.7 | 83.6 / 93.4 | 0.50 / 0.61 | 24 | 7.81 | 15 / 3207 / 32 | 4990 |

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 230 / 253 | 262 / 285 | 279 / 307 | 4.17 / 4.74 | 239 / 251 | 1.50 / 1.89 | 271 | 0.14 | 21 / 2952 / 53 | 899 |
| ladybug | 1 (best) | 13.1 / 36.3 | 50.9 / 78.4 | 118 / 149 | 25.6 / 26.3 | 5.45 / 23.4 | 6.75 / 9.34 | 2 | 0.01 | 2 / 471 / 2 | 899 |
| duckpgq | 1 (best) | 44.2 / 52.1 | 57.0 / 79.1 | 196 / 201 | 96.9 / 110 | 46.4 / 53.1 | 0.21 / 0.25 | 12 | 4.28 | 12 / 2645 / 38 | 899 |

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 229 / 248 | 254 / 275 | 269 / 274 | 4.27 / 4.89 | 230 / 245 | 0.86 / 0.98 | 271 | 0.16 | 21 / 2952 / 53 | 29 |
| relational | 2 (best) | 227 / 239 | 258 / 271 | 261 / 265 | 4.28 / 5.00 | 223 / 241 | 0.89 / 1.25 | 271 | 0.15 | 21 / 2952 / 53 | 29 |
| ladybug | 1 (best) | 6.74 / 7.62 | 39.8 / 42.1 | 107 / 114 | 24.5 / 26.3 | 1.17 / 1.86 | 4.82 / 6.06 | 2 | 0.01 | 2 / 471 / 2 | 29 |
| duckpgq | 1 (best) | 44.3 / 47.2 | 46.1 / 50.4 | 163 / 172 | 88.4 / 106 | 41.7 / 49.1 | 0.10 / 0.14 | 12 | 4.30 | 12 / 2645 / 38 | 29 |

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 | 87.8 / 97.9 | 119 / 121 | 205 / 221 | 25.4 / 33.3 | 67.1 / 69.5 | 18.4 / 22.7 | 4 | 0.03 | 4 / 576 / 4 | 4990 |
| ladybug | 2 (best) | 83.6 / 90.3 | 110 / 125 | 202 / 210 | 24.7 / 29.9 | 64.9 / 69.7 | 19.3 / 24.8 | 4 | 0.03 | 4 / 576 / 4 | 4990 |

### frozen / tq: the 20 TUNE question lookups (frozen commit)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 0.28 / 0.63 | 0.32 / 0.75 | 5.66 / 6.34 | 4.12 / 4.53 | 0.21 / 0.61 | 0.05 / 0.07 | 3 | 0.00 | 8 / 3022 / 72 | 133 |
| relational | 2 (best) | 0.24 / 0.62 | 0.23 / 0.74 | 5.83 / 5.96 | 4.06 / 4.93 | 0.21 / 0.59 | 0.05 / 0.07 | 3 | 0.00 | 8 / 3022 / 72 | 133 |
| ladybug | 1 (best) | 2.32 / 4.94 | 2.35 / 5.50 | 53.8 / 74.1 | 24.3 / 25.3 | 2.24 / 4.98 | 0.05 / 0.14 | 4 | 0.03 | 15 / 2862 / 21 | 133 |
| duckpgq | 1 (best) | 11.6 / 87.7 | 10.9 / 86.7 | 113 / 185 | 79.6 / 94.3 | 10.6 / 97.3 | 0.05 / 0.10 | 1 | 0.36 | 7 / 3530 / 35 | 133 |

## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)

- relational / tune: primary [1:14.5 2:14.1 4:14.2 6:14.1] best 2; S1 [1:104 2:104 4:102 6:100] best 4; base [1:97.4 2:96.8 4:94.5 6:94.2] best 2. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- relational / frozen: primary [1:32.3 2:31.8 4:30.8 6:32.5] best 4; S1 [1:241 2:235 4:240 6:235] best 1; base [1:234 2:228 4:232 6:225] best 2; tq [1:0.26 2:0.23 4:0.25 6:0.24] best 2. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- ladybug / tune: primary [1:39.9 2:42.8 4:42.1 6:43.2] best 1; S1 [1:18.3 2:20.1 4:22.1 6:23.4] best 1; base [1:4.52 2:8.14 4:14.0 6:12.1] best 1; S2 [1:44.9 2:45.7 4:47.6 6:47.5] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- ladybug / frozen: primary [1:75.0 2:71.8 4:72.1 6:77.5] best 2; S1 [1:24.8 2:26.8 4:28.5 6:29.8] best 1; base [1:6.86 2:9.89 4:12.8 6:14.9] best 1; S2 [1:86.8 2:81.2 4:87.8 6:89.2] best 2; tq [1:3.25 2:7.95 4:11.4 6:14.2] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- duckpgq / tune: primary [1:47.5 2:52.8 4:54.2 6:57.4] best 1; S1 [1:32.8 2:34.3 4:38.9 6:40.5] best 1; base [1:30.0 2:36.6 4:33.1 6:40.2] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).
- duckpgq / frozen: primary [1:88.0 2:85.6 4:89.4 6:95.8] best 1; S1 [1:53.0 2:53.9 4:55.0 6:60.0] best 1; base [1:43.4 2:43.6 4:44.3 6:47.9] best 1; tq [1:10.4 2:11.2 4:10.5 6:11.5] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).

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
| tune | primary | 39.4 / 45.1 | 36.5 / 41.4 | 3.17 / 4.55 |
| tune | S1 | 17.3 / 24.0 | 16.3 / 21.8 | 0.98 / 2.18 |
| tune | base | 4.02 / 5.48 | 3.67 / 5.02 | 0.35 / 1.21 |
| tune | S2 | 45.0 / 48.9 | 42.1 / 46.8 | 2.16 / 3.22 |
| frozen | primary | 77.8 / 87.1 | 71.9 / 77.7 | 6.72 / 9.32 |
| frozen | S1 | 13.0 / 41.9 | 11.8 / 37.0 | 1.23 / 4.88 |
| frozen | base | 8.11 / 10.0 | 6.94 / 9.58 | 0.36 / 2.08 |
| frozen | S2 | 98.5 / 106 | 89.2 / 100 | 5.46 / 9.31 |

## Equivalence of the timed answers

Reference arm against each engine (seeds with equal order / equal scores at 1e-9 / exactly equal):

- relational: tune/primary@1 5/5/5 of 5; tune/primary@2 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/S1@4 5/5/5 of 5; tune/base@1 5/5/5 of 5; tune/base@2 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@4 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5; frozen/base@2 5/5/5 of 5
- ladybug: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/primary@2 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- duckpgq: tune/primary@1 5/5/5 of 5; tune/S1@1 5/5/5 of 5; tune/base@1 5/5/5 of 5; frozen/primary@1 5/5/5 of 5; frozen/S1@1 5/5/5 of 5; frozen/base@1 5/5/5 of 5
- TQ: 5 questions, answers equal across relational, ladybug, duckpgq: true.
- LadybugDB S2 on tune: equal across thread settings 1: true; cold equal to warm: true.
- LadybugDB S2 on frozen: equal across thread settings 1, 2: true; cold equal to warm: true.
- Problems: none.

## The three unrelated host containers (docker stats --no-stream, before and after each engine)

| when | engine | container | CPU % | memory |
|---|---|---|---|---|
| before | relational | postiz | 1.04% | 1.263GiB / 15.18GiB |
| before | relational | postiz-postgres | 0.00% | 40.14MiB / 15.18GiB |
| before | relational | postiz-redis | 0.11% | 10.97MiB / 15.18GiB |
| after | relational | postiz | 0.34% | 1.262GiB / 15.18GiB |
| after | relational | postiz-postgres | 0.00% | 40.4MiB / 15.18GiB |
| after | relational | postiz-redis | 0.12% | 9.426MiB / 15.18GiB |
| before | ladybug | postiz | 0.28% | 1.263GiB / 15.18GiB |
| before | ladybug | postiz-postgres | 0.01% | 41.27MiB / 15.18GiB |
| before | ladybug | postiz-redis | 0.11% | 9.859MiB / 15.18GiB |
| after | ladybug | postiz | 0.27% | 1.262GiB / 15.18GiB |
| after | ladybug | postiz-postgres | 0.00% | 39.86MiB / 15.18GiB |
| after | ladybug | postiz-redis | 0.10% | 9.91MiB / 15.18GiB |
| before | duckpgq | postiz | 0.30% | 1.262GiB / 15.18GiB |
| before | duckpgq | postiz-postgres | 0.00% | 39.86MiB / 15.18GiB |
| before | duckpgq | postiz-redis | 0.11% | 9.891MiB / 15.18GiB |
| after | duckpgq | postiz | 0.27% | 1.262GiB / 15.18GiB |
| after | duckpgq | postiz-postgres | 2.45% | 41.09MiB / 15.18GiB |
| after | duckpgq | postiz-redis | 0.08% | 9.199MiB / 15.18GiB |

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

