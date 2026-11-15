# Engine benches (protocol addendum 4, section E)

Generated 2026-11-12T19:32:49.554Z from relational, ladybug, duckpgq. **SMOKE RUN (10 seeds per class): these numbers only prove the scripts work and are discarded.**

Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.

## Labels that go with every number here (addendum 4, item 20)

- DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).
- LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).
- SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).

## Run

- Seeds per class: 10 (warm), cold samples per class and thread setting: 10, timed repetitions per seed: 3, store builds per graph: 3, calibration seeds: 10, no-op samples: 500, thread candidates: 1, 2, 4, 6.
- Container CPUs allowed: 12,14,16,18,20,22 (Node sees 6); load average at start of each engine: relational 2.82 1.15 0.84 3/898 17; ladybug 1.15 1.53 1.10 1/790 17; duckpgq 1.02 1.58 1.23 1/778 17.
- Docker host: 29.9.2 Docker Desktop NCPU=24 Mem=16294539264; CPU set 12,14,16,18,20,22; running containers at start: gt-lock-reg gt-lock-dry postiz postiz-postgres postiz-redis ; **NOT QUIET: other containers ran (gt-lock-reg gt-lock-dry), quiet-machine guard overridden (BENCH_ALLOW_BUSY=1)**.
- Graphs: tune = 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4 (2450 nodes, 7077 edges; the largest TUNE parent), frozen = a31924a3818f4ac94b695906d107c72c912792b2 (5464 nodes, 16462 edges).
- Configurations: primary 95e990307da3b42b, S1 6b70cc1222745385, base 8067b9cf65e59b2f, S2 f233ae069bdba0ce; plus the 20 TUNE question lookups (TQ) on the frozen graph.

## Store build and size

| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |
|---|---|---|---|---|
| relational | tune | 385 (3 runs: 389, 376, 385) | 191 | 4509696 (4.3) |
| relational | frozen | 963 (3 runs: 951, 963, 1092) | 333 | 11243520 (10.7) |
| ladybug | tune | 2282 (3 runs: 2226, 2282, 2350) | 167 | 15450187 (14.7) |
| ladybug | frozen | 2556 (3 runs: 2556, 2524, 2558) | 272 | 19144879 (18.3) |
| duckpgq | tune | 418 (3 runs: 416, 418, 427) | 148 | 16003072 (15.3) |
| duckpgq | frozen | 586 (3 runs: 573, 586, 605) | 269 | 17051648 (16.3) |

## Latency per query class

warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 15.6 / 17.1 | 15.2 / 18.7 | 27.0 / 35.4 | 3.24 / 4.19 | 13.9 / 19.8 | 2.27 / 2.75 | 49 | 0.03 | 19 / 2475 / 43 | 2068 |
| relational | 4 (best) | 16.0 / 18.1 | 15.1 / 20.4 | 23.3 / 25.9 | 3.05 / 4.30 | 14.1 / 16.4 | 2.24 / 2.84 | 49 | 0.05 | 19 / 2475 / 43 | 2068 |
| ladybug | 1 | 39.9 / 47.0 | 39.8 / 46.5 | 94.5 / 108 | 25.3 / 29.3 | 37.1 / 39.0 | 3.68 / 7.50 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| ladybug | 2 (best) | 36.6 / 44.0 | 37.1 / 44.4 | 103 / 109 | 27.0 / 29.2 | 33.9 / 36.4 | 4.92 / 8.66 | 2 | 0.01 | 2 / 471 / 2 | 2068 |
| duckpgq | 1 (best) | 51.6 / 59.1 | 56.8 / 69.8 | 172 / 188 | 88.6 / 98.3 | 54.0 / 60.5 | 0.36 / 0.62 | 22 | 8.02 | 16 / 3242 / 33 | 2068 |

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 132 / 136 | 147 / 168 | 142 / 175 | 2.79 / 5.21 | 135 / 154 | 1.71 / 3.15 | 272 | 0.36 | 21 / 2952 / 53 | 1227 |
| ladybug | 1 (best) | 18.2 / 24.3 | 32.6 / 41.0 | 105 / 112 | 26.4 / 29.2 | 14.0 / 27.6 | 4.08 / 6.03 | 2 | 0.01 | 2 / 471 / 2 | 1227 |
| duckpgq | 1 (best) | 34.0 / 36.6 | 46.0 / 54.0 | 153 / 164 | 83.7 / 93.1 | 33.4 / 37.4 | 0.20 / 0.31 | 12 | 4.33 | 13 / 2682 / 39 | 1227 |

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 (best) | 116 / 121 | 133 / 150 | 137 / 165 | 2.65 / 3.78 | 125 / 144 | 1.62 / 2.00 | 272 | 0.17 | 21 / 2952 / 53 | 236 |
| ladybug | 1 (best) | 4.99 / 6.32 | 19.8 / 21.9 | 86.5 / 99.9 | 25.4 / 30.8 | 1.90 / 3.30 | 2.13 / 3.96 | 2 | 0.01 | 2 / 471 / 2 | 236 |
| duckpgq | 1 (best) | 31.9 / 34.3 | 37.9 / 44.2 | 151 / 193 | 87.3 / 109 | 29.5 / 33.7 | 0.14 / 0.22 | 12 | 4.17 | 13 / 2682 / 39 | 236 |

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 (best) | 45.3 / 51.9 | 58.9 / 66.9 | 137 / 150 | 26.2 / 30.3 | 35.5 / 39.5 | 7.36 / 15.7 | 4 | 0.03 | 4 / 576 / 4 | 2068 |

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 36.2 / 39.3 | 34.4 / 43.3 | 47.7 / 54.8 | 4.09 / 5.42 | 29.8 / 42.0 | 3.49 / 4.11 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| relational | 4 (best) | 36.4 / 39.4 | 31.9 / 38.1 | 51.8 / 54.8 | 4.46 / 5.51 | 31.2 / 36.1 | 3.80 / 4.31 | 53 | 0.03 | 19 / 2475 / 43 | 4990 |
| ladybug | 1 | 77.9 / 84.0 | 74.2 / 79.6 | 145 / 153 | 26.2 / 29.0 | 62.9 / 66.0 | 10.5 / 28.7 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| ladybug | 2 (best) | 69.6 / 78.3 | 68.0 / 75.6 | 149 / 176 | 27.4 / 40.0 | 54.6 / 56.2 | 12.1 / 20.2 | 2 | 0.01 | 2 / 471 / 2 | 4990 |
| duckpgq | 1 (best) | 110 / 121 | 110 / 135 | 255 / 290 | 101 / 110 | 110 / 129 | 0.68 / 0.87 | 24 | 11.7 | 15 / 3207 / 32 | 4990 |

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 243 / 258 | 284 / 311 | 286 / 296 | 4.32 / 5.29 | 245 / 280 | 1.54 / 2.59 | 271 | 0.15 | 21 / 2952 / 53 | 730 |
| relational | 6 (best) | 231 / 265 | 265 / 298 | 276 / 307 | 4.37 / 5.20 | 243 / 277 | 1.78 / 3.93 | 271 | 0.15 | 21 / 2952 / 53 | 730 |
| ladybug | 1 (best) | 13.6 / 36.6 | 49.5 / 69.0 | 125 / 152 | 26.6 / 28.0 | 5.83 / 24.5 | 7.67 / 11.6 | 2 | 0.01 | 2 / 471 / 2 | 730 |
| duckpgq | 1 (best) | 56.9 / 67.1 | 61.1 / 80.3 | 199 / 225 | 98.7 / 105 | 56.0 / 70.5 | 0.26 / 0.33 | 12 | 4.77 | 12 / 2647 / 38 | 730 |

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 236 / 247 | 252 / 304 | 264 / 305 | 4.71 / 5.73 | 242 / 254 | 1.52 / 1.88 | 271 | 0.16 | 21 / 2952 / 53 | 25.5 |
| relational | 2 (best) | 241 / 254 | 271 / 318 | 283 / 300 | 4.45 / 7.44 | 231 / 250 | 0.94 / 1.44 | 271 | 0.17 | 21 / 2952 / 53 | 25.5 |
| ladybug | 1 (best) | 7.35 / 8.87 | 42.4 / 45.5 | 119 / 124 | 27.1 / 29.0 | 1.32 / 2.40 | 5.61 / 9.11 | 2 | 0.01 | 2 / 471 / 2 | 25.5 |
| duckpgq | 1 (best) | 51.2 / 58.3 | 60.2 / 68.4 | 191 / 211 | 96.1 / 109 | 55.8 / 67.9 | 0.21 / 0.39 | 12 | 4.36 | 12 / 2647 / 38 | 25.5 |

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ladybug | 1 | 85.7 / 92.8 | 118 / 120 | 213 / 222 | 24.4 / 26.9 | 67.1 / 74.0 | 19.5 / 27.4 | 4 | 0.02 | 4 / 576 / 4 | 4990 |
| ladybug | 2 (best) | 83.5 / 88.3 | 114 / 126 | 213 / 232 | 26.6 / 29.7 | 62.3 / 64.9 | 20.9 / 32.1 | 4 | 0.03 | 4 / 576 / 4 | 4990 |

### frozen / tq: the 20 TUNE question lookups (frozen commit)

| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| relational | 1 | 0.31 / 0.71 | 0.28 / 0.61 | 6.08 / 7.67 | 4.50 / 5.45 | 0.22 / 0.58 | 0.05 / 0.09 | 3 | 0.00 | 13 / 5512 / 117 | 158.5 |
| relational | 6 (best) | 0.34 / 0.69 | 0.27 / 0.77 | 6.13 / 7.40 | 4.75 / 5.28 | 0.27 / 0.59 | 0.05 / 0.09 | 3 | 0.00 | 13 / 5512 / 117 | 158.5 |
| ladybug | 1 (best) | 2.16 / 4.83 | 2.12 / 4.98 | 54.5 / 75.5 | 26.4 / 31.2 | 2.08 / 5.17 | 0.05 / 0.19 | 4 | 0.03 | 21 / 4618 / 32 | 158.5 |
| duckpgq | 1 | 14.2 / 94.5 | 12.9 / 92.7 | 136 / 197 | 97.3 / 115 | 13.8 / 89.4 | 0.08 / 0.11 | 1.5 | 0.58 | 15 / 7178 / 71 | 158.5 |
| duckpgq | 2 (best) | 13.9 / 102 | 12.3 / 92.3 | 141 / 235 | 105 / 128 | 13.0 / 91.7 | 0.07 / 0.11 | 1.5 | 0.68 | 15 / 7178 / 71 | 158.5 |

## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)

- relational / tune: primary [1:16.4 2:15.8 4:15.1 6:16.1] best 4; S1 [1:117 2:120 4:115 6:120] best 1; base [1:111 2:113 4:112 6:118] best 1. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- relational / frozen: primary [1:35.6 2:36.7 4:32.6 6:34.5] best 4; S1 [1:263 2:248 4:232 6:219] best 6; base [1:272 2:226 4:221 6:226] best 2; tq [1:0.30 2:0.27 4:0.31 6:0.26] best 6. Knob: PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.
- ladybug / tune: primary [1:43.5 2:42.0 4:41.2 6:45.0] best 2; S1 [1:19.4 2:18.9 4:21.3 6:23.4] best 1; base [1:5.74 2:7.49 4:10.9 6:12.3] best 1; S2 [1:45.9 2:46.2 4:46.5 6:48.9] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- ladybug / frozen: primary [1:78.0 2:67.3 4:71.1 6:74.5] best 2; S1 [1:9.21 2:11.7 4:15.5 6:17.7] best 1; base [1:7.91 2:9.82 4:14.2 6:16.0] best 1; S2 [1:93.1 2:86.4 4:89.9 6:88.9] best 2; tq [1:2.36 2:7.35 4:10.4 6:12.2] best 1. Knob: CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting('threads'). The arm runs 1 thread per query by default (LB_THREADS).
- duckpgq / tune: primary [1:53.1 2:61.3 4:59.0 6:61.4] best 1; S1 [1:37.2 2:40.0 4:42.4 6:45.0] best 1; base [1:31.5 2:34.5 4:37.8 6:46.0] best 1. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).
- duckpgq / frozen: primary [1:108 2:112 4:111 6:119] best 1; S1 [1:57.1 2:59.0 4:60.9 6:66.7] best 1; base [1:53.1 2:53.5 4:53.4 6:60.2] best 1; tq [1:13.8 2:12.4 4:12.6 6:14.0] best 2. Knob: DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting('threads'). The arm default is the container CPU count (os.availableParallelism()).

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
| tune | primary | 48.9 / 56.6 | 45.1 / 49.5 | 3.56 / 8.61 |
| tune | S1 | 22.4 / 27.4 | 21.0 / 25.5 | 1.59 / 3.79 |
| tune | base | 6.04 / 9.95 | 5.48 / 9.38 | 0.55 / 1.95 |
| tune | S2 | 55.8 / 64.5 | 51.1 / 59.8 | 3.14 / 7.74 |
| frozen | primary | 82.1 / 96.7 | 74.8 / 91.5 | 6.40 / 11.6 |
| frozen | S1 | 12.9 / 38.9 | 12.0 / 36.0 | 0.90 / 2.94 |
| frozen | base | 7.20 / 8.51 | 7.00 / 7.93 | 0.23 / 0.91 |
| frozen | S2 | 98.9 / 112 | 92.1 / 104 | 5.79 / 8.34 |

## Equivalence of the timed answers

Reference arm against each engine (seeds with equal order / equal scores at 1e-9 / exactly equal):

- relational: tune/primary@1 10/10/10 of 10; tune/primary@4 10/10/10 of 10; tune/S1@1 10/10/10 of 10; tune/base@1 10/10/10 of 10; frozen/primary@1 10/10/10 of 10; frozen/primary@4 10/10/10 of 10; frozen/S1@1 10/10/10 of 10; frozen/S1@6 10/10/10 of 10; frozen/base@1 10/10/10 of 10; frozen/base@2 10/10/10 of 10
- ladybug: tune/primary@1 10/10/10 of 10; tune/primary@2 10/10/10 of 10; tune/S1@1 10/10/10 of 10; tune/base@1 10/10/10 of 10; frozen/primary@1 10/10/10 of 10; frozen/primary@2 10/10/10 of 10; frozen/S1@1 10/10/10 of 10; frozen/base@1 10/10/10 of 10
- duckpgq: tune/primary@1 10/10/10 of 10; tune/S1@1 10/10/10 of 10; tune/base@1 10/10/10 of 10; frozen/primary@1 10/10/10 of 10; frozen/S1@1 10/10/10 of 10; frozen/base@1 10/10/10 of 10
- TQ: 10 questions, answers equal across relational, ladybug, duckpgq: true.
- LadybugDB S2 on tune: equal across thread settings 1: true; cold equal to warm: true.
- LadybugDB S2 on frozen: equal across thread settings 1, 2: true; cold equal to warm: true.
- Problems: none.

## The three unrelated host containers (docker stats --no-stream, before and after each engine)

| when | engine | container | CPU % | memory |
|---|---|---|---|---|
| before | relational | postiz | 0.30% | 1.262GiB / 15.18GiB |
| before | relational | postiz-postgres | 0.00% | 40.05MiB / 15.18GiB |
| before | relational | postiz-redis | 0.11% | 9.188MiB / 15.18GiB |
| after | relational | postiz | 0.31% | 1.262GiB / 15.18GiB |
| after | relational | postiz-postgres | 0.00% | 40.41MiB / 15.18GiB |
| after | relational | postiz-redis | 0.11% | 9.84MiB / 15.18GiB |
| before | ladybug | postiz | 0.34% | 1.263GiB / 15.18GiB |
| before | ladybug | postiz-postgres | 0.00% | 41.15MiB / 15.18GiB |
| before | ladybug | postiz-redis | 0.13% | 10.36MiB / 15.18GiB |
| after | ladybug | postiz | 0.39% | 1.262GiB / 15.18GiB |
| after | ladybug | postiz-postgres | 2.68% | 45.63MiB / 15.18GiB |
| after | ladybug | postiz-redis | 0.12% | 8.766MiB / 15.18GiB |
| before | duckpgq | postiz | 0.37% | 1.262GiB / 15.18GiB |
| before | duckpgq | postiz-postgres | 0.00% | 41.3MiB / 15.18GiB |
| before | duckpgq | postiz-redis | 0.12% | 10.28MiB / 15.18GiB |
| after | duckpgq | postiz | 0.34% | 1.263GiB / 15.18GiB |
| after | duckpgq | postiz-postgres | 0.00% | 40.94MiB / 15.18GiB |
| after | duckpgq | postiz-redis | 0.13% | 9.465MiB / 15.18GiB |

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

