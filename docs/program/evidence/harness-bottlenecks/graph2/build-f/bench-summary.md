# Engine benches, interleaved (protocol addendum 5 section C; addendum 4 items 18 to 20)

Generated 2026-11-13T11:22:15.530Z from 10 complete units (p1-frozen, p1-tune, p2-frozen, p2-tune, p3-frozen, p3-tune, p4-frozen, p4-tune, p5-frozen, p5-tune). 

Every time is in milliseconds (ms). A cell "a ±s / c ±t" = median over passes of the wall time ± spread between passes (largest minus smallest pass value) / the same for CPU time of the process that does the work (all its threads; for the cold rows the fresh process). Inputs are TUNE seeds and the frozen-commit graph only (plan.json).

Settings: {"plan_hash":"d185eb59a0999064","seeds":200,"passes":5,"chunk":20,"reps":1,"cold_n":20,"cold_chunk":5,"update_n":50,"update_chunk":10,"update_check":10,"calib":20,"calib_reps":3,"noop_n":50,"builds_per_pass":1,"max_repeats":3,"load_frac":0.5,"host_wait_s":20,"best_within":0.03}.

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

## Load on the host while the blocks ran

2000 kept blocks; 148 repeats because other work used more than half of the host CPUs; 6 blocks kept and flagged after 3 repeats. "Other work" = host processes outside the Docker VM plus VM work outside this container, in CPUs (the host has 24 logical CPUs).

| engine | kept blocks | repeats | kept flagged | other work, median CPUs | other work, max CPUs | VM steal, median CPUs |
|---|---|---|---|---|---|---|
| SQLite | 530 | 45 | 3 | 5.91 | 14.7 | 0.000 |
| LadybugDB | 965 | 78 | 3 | 5.76 | 20.0 | 0.000 |
| DuckDB+DuckPGQ | 505 | 25 | 0 | 5.87 | 11.9 | 0.000 |

Blocks judged without the host timeline (VM side only): 0.

## Thread calibration (once, before the passes; calibration seeds disjoint from the measured ones)

Rule: fewest threads whose median warm wall time over the calibration items x 3 repetitions is within 3 % of the lowest. Candidates: 1, 2, 4, 6 threads.

- DuckDB+DuckPGQ / tune: primary [1: 59.8 ms wall, 60.0 ms CPU; 2: 64.9 ms wall, 74.1 ms CPU; 4: 66.4 ms wall, 83.4 ms CPU; 6: 67.4 ms wall, 95.7 ms CPU] best 1; S1 [1: 38.8 ms wall, 38.9 ms CPU; 2: 40.5 ms wall, 46.4 ms CPU; 4: 42.8 ms wall, 50.4 ms CPU; 6: 50.1 ms wall, 77.9 ms CPU] best 1; base [1: 46.1 ms wall, 46.3 ms CPU; 2: 51.9 ms wall, 61.4 ms CPU; 4: 55.2 ms wall, 67.2 ms CPU; 6: 55.5 ms wall, 86.8 ms CPU] best 1
- SQLite / tune: primary [1: 13.4 ms wall, 13.5 ms CPU; 2: 14.1 ms wall, 14.2 ms CPU; 4: 14.0 ms wall, 14.1 ms CPU; 6: 13.2 ms wall, 13.2 ms CPU] best 1; S1 [1: 103 ms wall, 103 ms CPU; 2: 104 ms wall, 104 ms CPU; 4: 106 ms wall, 106 ms CPU; 6: 105 ms wall, 106 ms CPU] best 1; base [1: 115 ms wall, 115 ms CPU; 2: 118 ms wall, 118 ms CPU; 4: 117 ms wall, 117 ms CPU; 6: 125 ms wall, 125 ms CPU] best 1
- LadybugDB / tune: primary [1: 38.4 ms wall, 41.1 ms CPU; 2: 35.9 ms wall, 50.0 ms CPU; 4: 35.9 ms wall, 53.6 ms CPU; 6: 45.0 ms wall, 73.8 ms CPU] best 2; S1 [1: 22.7 ms wall, 23.2 ms CPU; 2: 21.6 ms wall, 27.9 ms CPU; 4: 21.5 ms wall, 28.7 ms CPU; 6: 23.4 ms wall, 32.3 ms CPU] best 2; base [1: 5.21 ms wall, 5.22 ms CPU; 2: 8.19 ms wall, 11.9 ms CPU; 4: 12.6 ms wall, 17.1 ms CPU; 6: 14.3 ms wall, 19.5 ms CPU] best 1; S2 [1: 52.5 ms wall, 56.3 ms CPU; 2: 54.9 ms wall, 77.1 ms CPU; 4: 54.6 ms wall, 85.9 ms CPU; 6: 56.9 ms wall, 92.7 ms CPU] best 1
- DuckDB+DuckPGQ / frozen: primary [1: 122 ms wall, 122 ms CPU; 2: 148 ms wall, 170 ms CPU; 4: 153 ms wall, 192 ms CPU; 6: 167 ms wall, 229 ms CPU] best 1; S1 [1: 67.7 ms wall, 68.2 ms CPU; 2: 72.8 ms wall, 84.7 ms CPU; 4: 75.4 ms wall, 87.4 ms CPU; 6: 77.5 ms wall, 106 ms CPU] best 1; base [1: 55.0 ms wall, 55.0 ms CPU; 2: 60.1 ms wall, 65.1 ms CPU; 4: 63.8 ms wall, 72.0 ms CPU; 6: 67.0 ms wall, 103 ms CPU] best 1; tq [1: 9.43 ms wall, 9.41 ms CPU; 2: 10.2 ms wall, 11.7 ms CPU; 4: 9.46 ms wall, 12.8 ms CPU; 6: 10.2 ms wall, 13.2 ms CPU] best 1
- LadybugDB / frozen: primary [1: 94.0 ms wall, 94.1 ms CPU; 2: 85.9 ms wall, 124 ms CPU; 4: 74.6 ms wall, 121 ms CPU; 6: 91.1 ms wall, 152 ms CPU] best 4; S1 [1: 23.7 ms wall, 24.3 ms CPU; 2: 24.0 ms wall, 32.4 ms CPU; 4: 27.2 ms wall, 37.3 ms CPU; 6: 28.1 ms wall, 40.3 ms CPU] best 1; base [1: 7.62 ms wall, 7.63 ms CPU; 2: 10.9 ms wall, 15.3 ms CPU; 4: 14.2 ms wall, 18.9 ms CPU; 6: 16.7 ms wall, 22.6 ms CPU] best 1; S2 [1: 93.3 ms wall, 94.7 ms CPU; 2: 87.9 ms wall, 119 ms CPU; 4: 90.5 ms wall, 147 ms CPU; 6: 94.5 ms wall, 156 ms CPU] best 2; tq [1: 2.23 ms wall, 2.25 ms CPU; 2: 6.62 ms wall, 12.9 ms CPU; 4: 11.1 ms wall, 18.6 ms CPU; 6: 11.3 ms wall, 18.7 ms CPU] best 1
- SQLite / frozen: primary [1: 33.2 ms wall, 33.2 ms CPU; 2: 33.4 ms wall, 33.5 ms CPU; 4: 34.3 ms wall, 34.4 ms CPU; 6: 37.9 ms wall, 37.9 ms CPU] best 1; S1 [1: 266 ms wall, 266 ms CPU; 2: 272 ms wall, 271 ms CPU; 4: 274 ms wall, 274 ms CPU; 6: 268 ms wall, 268 ms CPU] best 1; base [1: 242 ms wall, 242 ms CPU; 2: 250 ms wall, 250 ms CPU; 4: 250 ms wall, 250 ms CPU; 6: 248 ms wall, 247 ms CPU] best 1; tq [1: 0.261 ms wall, 0.263 ms CPU; 2: 0.290 ms wall, 0.292 ms CPU; 4: 0.234 ms wall, 0.236 ms CPU; 6: 0.237 ms wall, 0.238 ms CPU] best 4

## Query classes on the tune graph (7b3a74528189, 2450 nodes, 7077 edges; 5 passes)

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (primary): SQLite: unbounded walk and degree-normalised spreading in SQL, one statement per BFS level, level loop in application code; LadybugDB: arcs and out-degrees fetched by Cypher; the degree-normalised spreading runs in application code (JavaScript): not in the engine; DuckDB+DuckPGQ: reach by iterativelength() over a CSR built in the statement; spreading in SQL, one statement per BFS level, level loop in application code.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 14.5 ±2.35 / 14.6 ±2.38 | 18.6 ±3.97 / 19.7 ±3.87 | 14.4 ±2.32 / 14.4 ±2.34 | 21.9 ±5.29 / 24.6 ±6.20 | 2.60 ±0.393 / 2.60 ±0.385 | 13.3 ±1.85 / 13.4 ±1.90 | 1.35 ±0.248 / 1.28 ±0.229 | 0.050 ±0.000 / 0.100 ±0.047 | 13.3 ±1.84 / 13.4 ±1.88 | 50.0 | 19 / 2475 / 43 | 70 (17, 1) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 41.5 ±8.85 / 44.3 ±10.0 | 53.3 ±17.6 / 58.4 ±17.0 | 41.2 ±7.95 / 43.7 ±8.95 | 105 ±21.7 / 124 ±24.4 | 27.2 ±3.48 / 28.5 ±3.79 | 37.3 ±8.09 / 39.9 ±8.51 | 3.70 ±0.721 / 3.69 ±0.717 | 0.012 ±0.002 / 0.015 ±0.002 | 37.3 ±8.08 / 39.8 ±8.50 | 2.00 | 2 / 471 / 2 | 70 (11, 0) |
| LadybugDB | best 2 | 40.5 ±10.8 / 57.5 ±14.6 | 55.0 ±19.9 / 79.9 ±25.8 | 41.7 ±9.13 / 59.7 ±12.7 | 107 ±17.8 / 144 ±28.2 | 27.9 ±4.30 / 30.4 ±4.63 | 37.3 ±5.55 / 54.0 ±7.48 | 3.81 ±0.706 / 3.80 ±0.671 | 0.012 ±0.002 / 0.016 ±0.001 | 37.3 ±5.55 / 54.0 ±7.48 | 2.00 | 2 / 471 / 2 | 70 (10, 0) |
| DuckDB+DuckPGQ | 1 | 70.3 ±27.4 / 70.3 ±28.1 | 94.5 ±32.0 / 94.4 ±32.1 | 71.7 ±29.0 / 71.7 ±29.4 | 192 ±38.1 / 227 ±48.9 | 93.0 ±19.0 / 114 ±25.0 | 70.0 ±25.0 / 70.1 ±25.2 | 0.512 ±0.278 / 0.326 ±0.121 | 11.2 ±4.51 / 10.9 ±4.49 | 57.8 ±19.2 / 58.4 ±20.2 | 22.0 | 23 / 3657 / 40 | 70 (7, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"2"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S1): SQLite: 4-hop reach by a recursive CTE; personalised PageRank in SQL, about 270 statements per ranking (one per iteration step, loop in application code) over TEMP transition tables; LadybugDB: 4-hop reach by the native recursive pattern; personalised PageRank, 40 iterations in application code (JavaScript) over a transition CSR fetched by one Cypher query and cached in application code; DuckDB+DuckPGQ: 4-hop reach by a recursive SQL statement (no bounded graph operator in DuckPGQ); personalised PageRank as one recursive SQL statement (40 steps) over TEMP transition tables.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 116 ±8.92 / 116 ±8.79 | 140 ±17.2 / 139 ±17.2 | 127 ±11.2 / 127 ±11.1 | 127 ±19.5 / 128 ±19.1 | 2.63 ±0.275 / 2.64 ±0.277 | 114 ±11.6 / 114 ±11.9 | 2.41 ±0.479 / 1.90 ±0.329 | 0.272 ±0.000 / 0.544 ±0.000 | 113 ±11.6 / 114 ±11.9 | 272 | 21 / 2952 / 53 | 70 (6, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 17.4 ±1.32 / 18.0 ±1.45 | 27.7 ±2.85 / 28.9 ±2.87 | 32.9 ±2.52 / 33.4 ±2.96 | 109 ±21.1 / 140 ±26.9 | 26.8 ±4.30 / 28.2 ±4.64 | 13.3 ±0.556 / 13.9 ±0.464 | 3.72 ±0.237 / 3.72 ±0.260 | 0.012 ±0.002 / 0.016 ±0.002 | 13.3 ±0.561 / 13.8 ±0.467 | 2.00 | 2 / 471 / 2 | 70 (5, 0) |
| LadybugDB | best 2 | 18.7 ±0.741 / 24.5 ±0.730 | 28.2 ±2.42 / 36.8 ±3.39 | 33.9 ±2.11 / 44.5 ±1.34 | 112 ±18.9 / 154 ±30.1 | 27.6 ±4.47 / 30.3 ±5.23 | 15.1 ±0.977 / 21.1 ±0.557 | 3.66 ±0.337 / 3.69 ±0.390 | 0.014 ±0.002 / 0.016 ±0.002 | 15.1 ±0.981 / 21.1 ±0.563 | 2.00 | 2 / 471 / 2 | 70 (5, 0) |
| DuckDB+DuckPGQ | 1 | 48.7 ±7.48 / 48.9 ±7.30 | 58.9 ±16.8 / 60.0 ±18.1 | 53.9 ±9.33 / 53.9 ±9.12 | 173 ±29.0 / 209 ±51.3 | 92.5 ±14.0 / 124 ±35.2 | 48.9 ±5.97 / 49.3 ±5.96 | 0.360 ±0.079 / 0.240 ±0.038 | 6.67 ±2.18 / 6.49 ±2.05 | 42.2 ±4.68 / 42.6 ±4.91 | 12.0 | 29 / 9256 / 154 | 70 (2, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"2"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (base): SQLite: as S1 with 2 hops; LadybugDB: as S1 with 2 hops; DuckDB+DuckPGQ: as S1 with 2 hops.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 111 ±12.0 / 111 ±12.5 | 131 ±27.5 / 131 ±27.7 | 122 ±12.9 / 122 ±12.7 | 116 ±18.0 / 116 ±18.1 | 2.55 ±0.373 / 2.56 ±0.375 | 108 ±9.46 / 108 ±9.60 | 1.75 ±0.430 / 1.31 ±0.315 | 0.272 ±0.000 / 0.544 ±0.132 | 107 ±9.46 / 108 ±9.55 | 272 | 21 / 2952 / 53 | 70 (10, 1) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 4.60 ±0.511 / 4.69 ±0.571 | 6.45 ±0.365 / 7.16 ±1.65 | 20.6 ±1.95 / 20.8 ±1.96 | 87.6 ±23.0 / 113 ±27.6 | 26.2 ±4.25 / 27.5 ±4.38 | 2.37 ±0.558 / 2.40 ±0.559 | 2.25 ±0.222 / 2.25 ±0.224 | 0.012 ±0.000 / 0.016 ±0.002 | 2.36 ±0.553 / 2.39 ±0.558 | 2.00 | 2 / 471 / 2 | 70 (14, 1) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 44.0 ±7.64 / 44.1 ±7.63 | 54.4 ±12.9 / 54.6 ±12.4 | 48.0 ±9.04 / 48.0 ±9.12 | 166 ±37.4 / 197 ±39.2 | 91.2 ±18.6 / 117 ±29.6 | 42.3 ±7.04 / 42.6 ±6.88 | 0.276 ±0.069 / 0.167 ±0.033 | 6.55 ±0.582 / 6.25 ±0.684 | 36.0 ±6.71 / 36.3 ±7.00 | 12.0 | 29 / 9264 / 154 | 70 (5, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S2): LadybugDB: unbounded reach by the native recursive pattern; personalised PageRank in application code (as S1) fused with the community prior stored in the database (native Louvain at build, grouping read from the stored prior file).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LadybugDB | 1 | 51.3 ±5.52 / 54.7 ±6.42 | 67.4 ±11.9 / 74.4 ±20.2 | 66.9 ±6.66 / 70.6 ±7.31 | 142 ±32.8 / 192 ±47.5 | 26.1 ±4.82 / 27.3 ±5.14 | 43.5 ±6.87 / 46.8 ±6.54 | 7.17 ±0.851 / 7.16 ±0.844 | 0.028 ±0.012 / 0.032 ±0.012 | 43.5 ±6.86 / 46.8 ±6.53 | 4.00 | 4 / 576 / 4 | 70 (15, 1) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}.

## Query classes on the frozen graph (a31924a3818f, 5464 nodes, 16462 edges; 5 passes)

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (primary): SQLite: unbounded walk and degree-normalised spreading in SQL, one statement per BFS level, level loop in application code; LadybugDB: arcs and out-degrees fetched by Cypher; the degree-normalised spreading runs in application code (JavaScript): not in the engine; DuckDB+DuckPGQ: reach by iterativelength() over a CSR built in the statement; spreading in SQL, one statement per BFS level, level loop in application code.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 32.7 ±7.69 / 32.7 ±7.70 | 38.1 ±14.4 / 44.2 ±17.5 | 32.4 ±7.11 / 32.4 ±7.48 | 47.2 ±10.0 / 50.9 ±12.6 | 4.23 ±0.797 / 4.24 ±0.795 | 29.1 ±5.10 / 29.2 ±5.10 | 3.17 ±0.703 / 3.09 ±0.672 | 0.053 ±0.000 / 0.106 ±0.051 | 29.0 ±5.11 / 29.1 ±5.09 | 53.0 | 19 / 2475 / 43 | 70 (0, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 71.2 ±15.1 / 71.7 ±16.9 | 94.9 ±27.0 / 106 ±35.5 | 72.5 ±16.3 / 72.6 ±17.9 | 154 ±26.1 / 204 ±42.2 | 26.6 ±4.32 / 27.9 ±4.33 | 61.5 ±11.1 / 60.1 ±12.2 | 9.74 ±3.42 / 9.74 ±3.44 | 0.014 ±0.002 / 0.016 ±0.001 | 61.5 ±11.1 / 60.1 ±12.2 | 2.00 | 2 / 471 / 2 | 70 (1, 0) |
| LadybugDB | best 4 | 67.4 ±13.9 / 108 ±27.7 | 91.8 ±33.4 / 145 ±59.7 | 65.6 ±16.2 / 105 ±30.3 | 150 ±29.9 / 256 ±54.3 | 27.2 ±3.57 / 30.1 ±3.72 | 54.1 ±11.9 / 90.1 ±22.8 | 9.72 ±3.19 / 9.71 ±3.19 | 0.012 ±0.002 / 0.016 ±0.000 | 54.1 ±11.9 / 90.1 ±22.8 | 2.00 | 2 / 471 / 2 | 70 (2, 0) |
| DuckDB+DuckPGQ | 1 | 98.7 ±36.0 / 99.6 ±35.6 | 121 ±60.0 / 121 ±60.4 | 94.5 ±34.5 / 95.1 ±35.4 | 243 ±62.8 / 291 ±77.3 | 96.5 ±20.9 / 109 ±28.1 | 98.9 ±36.5 / 99.7 ±37.0 | 0.687 ±0.335 / 0.486 ±0.165 | 10.3 ±4.80 / 10.2 ±4.50 | 88.7 ±32.4 / 89.7 ±33.3 | 24.0 | 15 / 3207 / 32 | 70 (0, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"4"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S1): SQLite: 4-hop reach by a recursive CTE; personalised PageRank in SQL, about 270 statements per ranking (one per iteration step, loop in application code) over TEMP transition tables; LadybugDB: 4-hop reach by the native recursive pattern; personalised PageRank, 40 iterations in application code (JavaScript) over a transition CSR fetched by one Cypher query and cached in application code; DuckDB+DuckPGQ: 4-hop reach by a recursive SQL statement (no bounded graph operator in DuckPGQ); personalised PageRank as one recursive SQL statement (40 steps) over TEMP transition tables.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 256 ±35.7 / 256 ±36.6 | 310 ±93.9 / 311 ±93.9 | 286 ±38.0 / 287 ±38.2 | 271 ±52.4 / 271 ±54.3 | 4.26 ±0.689 / 4.26 ±0.676 | 251 ±33.4 / 252 ±33.8 | 3.12 ±1.24 / 2.54 ±1.05 | 0.271 ±0.000 / 0.542 ±0.000 | 251 ±33.4 / 251 ±33.7 | 271 | 21 / 2952 / 53 | 70 (7, 1) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 17.1 ±2.91 / 17.6 ±2.70 | 39.2 ±8.75 / 41.7 ±11.1 | 51.1 ±7.76 / 52.4 ±7.29 | 126 ±25.9 / 181 ±39.3 | 25.5 ±5.27 / 26.7 ±5.35 | 10.8 ±1.28 / 11.1 ±1.23 | 6.58 ±0.596 / 6.62 ±0.703 | 0.014 ±0.002 / 0.016 ±0.002 | 10.7 ±1.28 / 11.1 ±1.23 | 2.00 | 2 / 471 / 2 | 70 (3, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 58.4 ±8.48 / 59.4 ±9.36 | 76.4 ±12.0 / 78.3 ±10.6 | 67.3 ±10.6 / 67.9 ±10.5 | 192 ±46.2 / 225 ±50.7 | 94.8 ±24.9 / 119 ±32.5 | 59.6 ±11.7 / 59.6 ±11.6 | 0.346 ±0.049 / 0.233 ±0.023 | 6.02 ±1.30 / 5.83 ±1.17 | 54.5 ±11.1 / 54.7 ±11.2 | 12.0 | 21 / 8806 / 146 | 70 (5, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (base): SQLite: as S1 with 2 hops; LadybugDB: as S1 with 2 hops; DuckDB+DuckPGQ: as S1 with 2 hops.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 265 ±61.7 / 265 ±61.7 | 323 ±105 / 323 ±105 | 294 ±59.2 / 293 ±59.5 | 262 ±52.9 / 261 ±53.0 | 4.35 ±0.741 / 4.35 ±0.729 | 263 ±49.0 / 264 ±50.1 | 2.71 ±1.89 / 2.07 ±1.51 | 0.271 ±0.000 / 0.542 ±0.271 | 263 ±49.0 / 263 ±49.9 | 271 | 21 / 2952 / 53 | 70 (1, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 6.76 ±2.11 / 6.87 ±2.26 | 9.56 ±3.32 / 10.3 ±3.90 | 41.9 ±8.90 / 42.3 ±9.32 | 109 ±22.0 / 153 ±37.6 | 24.7 ±4.47 / 25.9 ±4.84 | 1.56 ±0.781 / 1.60 ±0.774 | 4.93 ±1.21 / 4.93 ±1.21 | 0.012 ±0.002 / 0.015 ±0.002 | 1.54 ±0.778 / 1.57 ±0.771 | 2.00 | 2 / 471 / 2 | 70 (2, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 58.7 ±22.5 / 58.7 ±22.8 | 72.6 ±31.1 / 73.3 ±30.9 | 65.2 ±26.4 / 65.3 ±26.5 | 178 ±63.9 / 188 ±80.7 | 95.0 ±29.4 / 112 ±39.0 | 56.3 ±25.1 / 56.7 ±25.2 | 0.258 ±0.186 / 0.154 ±0.085 | 6.16 ±3.44 / 6.01 ±3.37 | 50.1 ±21.6 / 50.4 ±21.9 | 12.0 | 21 / 8814 / 146 | 70 (3, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S2): LadybugDB: unbounded reach by the native recursive pattern; personalised PageRank in application code (as S1) fused with the community prior stored in the database (native Louvain at build, grouping read from the stored prior file).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LadybugDB | 1 | 87.3 ±20.3 / 88.3 ±23.6 | 109 ±59.6 / 116 ±59.2 | 120 ±22.4 / 123 ±25.9 | 226 ±40.5 / 298 ±59.7 | 25.5 ±3.26 / 26.9 ±3.44 | 68.9 ±10.5 / 67.2 ±11.2 | 18.2 ±4.26 / 19.0 ±4.80 | 0.028 ±0.008 / 0.032 ±0.004 | 68.9 ±10.5 / 67.1 ±11.2 | 4.00 | 4 / 576 / 4 | 70 (1, 0) |
| LadybugDB | best 2 | 80.7 ±13.1 / 108 ±21.2 | 99.1 ±27.0 / 138 ±35.4 | 111 ±18.5 / 146 ±24.8 | 216 ±31.3 / 330 ±51.6 | 26.8 ±2.97 / 29.2 ±3.35 | 61.7 ±11.4 / 85.2 ±17.4 | 18.3 ±4.66 / 18.4 ±4.77 | 0.024 ±0.004 / 0.032 ±0.004 | 61.6 ±11.4 / 85.1 ±17.4 | 4.00 | 4 / 576 / 4 | 70 (1, 0) |

Seeds per pass: 200 (warm, uncached, instrumented), 20 (cold). Thread read-back: LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"2"}]}.

### frozen / tq: the 20 TUNE question lookups (frozen commit)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (tq): SQLite: in the engine: SQL per question (statements re-prepared on every call, as the arm does); LadybugDB: in the engine: Cypher per question (prepared statements kept); DuckDB+DuckPGQ: in the engine: SQL per question (literals inlined).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 0.296 ±0.145 / 0.300 ±0.145 | 0.593 ±0.315 / 0.605 ±1.98 | 0.257 ±0.086 / 0.275 ±0.086 | 5.90 ±2.54 / 5.83 ±1.91 | 4.36 ±0.647 / 4.36 ±0.630 | 0.211 ±0.048 / 0.220 ±0.057 | 0.060 ±0.017 / 0.053 ±0.015 | 0.003 ±0.000 / 0.006 ±0.003 | 0.208 ±0.048 / 0.214 ±0.054 | 3.00 | 13 / 5512 / 117 | 25 (0, 0) |
| SQLite | best 4 | 0.254 ±0.068 / 0.262 ±0.091 | 0.500 ±0.327 / 0.726 ±0.523 | 0.269 ±0.086 / 0.271 ±0.087 | 5.94 ±2.02 / 5.91 ±1.72 | 4.41 ±0.908 / 4.39 ±0.929 | 0.208 ±0.129 / 0.214 ±0.133 | 0.065 ±0.038 / 0.058 ±0.040 | 0.003 ±0.000 / 0.006 ±0.003 | 0.205 ±0.129 / 0.208 ±0.133 | 3.00 | 13 / 5512 / 117 | 25 (0, 0) |
| LadybugDB | 1 | 1.93 ±0.381 / 1.94 ±0.542 | 5.31 ±0.902 / 5.32 ±0.905 | 2.08 ±0.417 / 2.12 ±0.363 | 71.9 ±29.4 / 56.5 ±17.8 | 27.1 ±4.07 / 28.3 ±4.19 | 1.94 ±0.282 / 1.95 ±0.281 | 0.080 ±0.020 / 0.069 ±0.021 | 0.018 ±0.003 / 0.021 ±0.003 | 1.91 ±0.287 / 1.92 ±0.288 | 3.00 | 21 / 4658 / 32 | 25 (0, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 9.16 ±4.34 / 9.14 ±4.33 | 39.2 ±13.6 / 39.2 ±13.6 | 8.38 ±6.91 / 8.38 ±6.84 | 148 ±37.9 / 163 ±39.6 | 102 ±21.9 / 122 ±21.2 | 9.43 ±5.44 / 9.42 ±5.43 | 0.079 ±0.047 / 0.069 ±0.038 | 0.440 ±0.230 / 0.437 ±0.221 | 8.66 ±4.41 / 8.68 ±4.44 | 1.00 | 29 / 13935 / 136 | 25 (0, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 20 (warm, uncached, instrumented), 20 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":3,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

## Store build (fresh process per build) and size on disk

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| engine | graph | builds | build wall / CPU (median over passes ± spread) | store bytes (MiB), median | blocks flagged |
|---|---|---|---|---|---|
| SQLite | tune | 5 | 350 ±73.2 / 355 ±70.3 | 4509696 (4.3) | 0 |
| LadybugDB | tune | 5 | 3145 ±2217 / 2519 ±840 | 15450186 (14.7) | 0 |
| DuckDB+DuckPGQ | tune | 5 | 621 ±148 / 767 ±269 | 16003072 (15.3) | 0 |
| SQLite | frozen | 5 | 869 ±205 / 893 ±224 | 11243520 (10.7) | 0 |
| LadybugDB | frozen | 5 | 3710 ±2143 / 2954 ±911 | 19144878 (18.3) | 0 |
| DuckDB+DuckPGQ | frozen | 5 | 692 ±506 / 905 ±545 | 17051648 (16.3) | 0 |

## One-file update (bench/update.js steps; re-ingest one seed file into an existing store, local and global refresh)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| engine | graph | files per pass | update wall / CPU per file, median over files (median over passes ± spread) | p95 over files | fingerprint differences | answers differing after the updates |
|---|---|---|---|---|---|---|
| SQLite | tune | 50 | 224 ±36.1 / 200 ±26.3 | 278 ±292 / 267 ±29.1 | 0 | 0 |
| LadybugDB | tune | 50 | 518 ±125 / 771 ±171 | 748 ±190 / 1073 ±248 | 0 | 0 |
| DuckDB+DuckPGQ | tune | 50 | 237 ±68.1 / 352 ±94.8 | 318 ±101 / 444 ±135 | 0 | 0 |
| SQLite | frozen | 50 | 269 ±97.8 / 262 ±91.5 | 544 ±172 / 503 ±167 | 0 | 0 |
| LadybugDB | frozen | 50 | 633 ±240 / 1035 ±445 | 1398 ±693 / 1733 ±789 | 0 | 0 |
| DuckDB+DuckPGQ | frozen | 50 | 179 ±73.5 / 273 ±94.0 | 243 ±132 / 352 ±156 | 0 | 0 |

## LadybugDB as the harness runs it (store in a child process, one IPC round trip per ranking, 1 thread)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| graph | class | harness wall | child rank time | IPC round trip | CPU of the child process | CPU of the calling process |
|---|---|---|---|---|---|---|
| tune | primary | 46.5 ±4.97 | 43.5 ±4.44 | 2.64 ±0.334 | 48.1 ±5.52 | 1.96 ±0.191 |
| tune | S1 | 18.6 ±2.12 | 17.2 ±2.05 | 1.39 ±0.188 | 18.4 ±2.20 | 1.34 ±0.134 |
| tune | base | 5.01 ±1.01 | 4.56 ±0.848 | 0.471 ±0.175 | 4.78 ±0.948 | 0.810 ±0.179 |
| tune | S2 | 52.5 ±6.12 | 49.5 ±5.11 | 2.52 ±0.449 | 55.1 ±7.34 | 1.92 ±0.225 |
| frozen | primary | 81.3 ±89.9 | 75.0 ±85.9 | 5.76 ±4.50 | 78.1 ±86.7 | 3.67 ±2.37 |
| frozen | S1 | 19.3 ±4.16 | 17.9 ±3.39 | 1.42 ±0.220 | 19.8 ±4.18 | 1.37 ±0.177 |
| frozen | base | 7.06 ±1.90 | 6.65 ±1.65 | 0.403 ±0.257 | 6.82 ±1.99 | 0.815 ±0.192 |
| frozen | S2 | 104 ±21.8 | 96.4 ±20.5 | 6.75 ±2.18 | 106 ±22.4 | 3.90 ±0.551 |

## Differences between engines

A difference **holds** when it has the same direction in wall time and in CPU time and is larger than the spread between passes of both engines in both. Everything else is inside the noise. With fewer than five passes this list is not a finding.

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

### Differences that hold

- tune/primary 1 thread warm median: SQLite lower than LadybugDB by 27.0 ms wall and 29.8 ms CPU (spreads wall 2.35 / 8.85, CPU 2.38 / 10.0; 5 of 5 passes agree in both)
- tune/primary 1 thread warm p95: SQLite lower than LadybugDB by 34.7 ms wall and 38.7 ms CPU (spreads wall 3.97 / 17.6, CPU 3.87 / 17.0; 5 of 5 passes agree in both)
- tune/primary 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 26.8 ms wall and 29.3 ms CPU (spreads wall 2.32 / 7.95, CPU 2.34 / 8.95; 5 of 5 passes agree in both)
- tune/primary 1 thread cold (open + first call): SQLite lower than LadybugDB by 83.3 ms wall and 99.3 ms CPU (spreads wall 5.29 / 21.7, CPU 6.20 / 24.4; 5 of 5 passes agree in both)
- tune/primary 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 55.8 ms wall and 55.8 ms CPU (spreads wall 2.35 / 27.4, CPU 2.38 / 28.1; 5 of 5 passes agree in both)
- tune/primary 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 75.9 ms wall and 74.7 ms CPU (spreads wall 3.97 / 32.0, CPU 3.87 / 32.1; 5 of 5 passes agree in both)
- tune/primary 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 57.3 ms wall and 57.3 ms CPU (spreads wall 2.32 / 29.0, CPU 2.34 / 29.4; 5 of 5 passes agree in both)
- tune/primary 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 171 ms wall and 202 ms CPU (spreads wall 5.29 / 38.1, CPU 6.20 / 48.9; 5 of 5 passes agree in both)
- tune/primary 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 41.2 ms wall and 36.0 ms CPU (spreads wall 17.6 / 32.0, CPU 17.0 / 32.1; 5 of 5 passes agree in both)
- tune/primary 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 87.2 ms wall and 103 ms CPU (spreads wall 21.7 / 38.1, CPU 24.4 / 48.9; 5 of 5 passes agree in both)
- tune/primary best threads warm median: SQLite lower than LadybugDB by 26.0 ms wall and 43.0 ms CPU (spreads wall 2.35 / 10.8, CPU 2.38 / 14.6; 5 of 5 passes agree in both)
- tune/primary best threads warm p95: SQLite lower than LadybugDB by 36.4 ms wall and 60.3 ms CPU (spreads wall 3.97 / 19.9, CPU 3.87 / 25.8; 5 of 5 passes agree in both)
- tune/primary best threads warm, application caches dropped: SQLite lower than LadybugDB by 27.3 ms wall and 45.2 ms CPU (spreads wall 2.32 / 9.13, CPU 2.34 / 12.7; 5 of 5 passes agree in both)
- tune/primary best threads cold (open + first call): SQLite lower than LadybugDB by 84.8 ms wall and 120 ms CPU (spreads wall 5.29 / 17.8, CPU 6.20 / 28.2; 5 of 5 passes agree in both)
- tune/primary best threads warm median: SQLite lower than DuckDB+DuckPGQ by 55.8 ms wall and 55.8 ms CPU (spreads wall 2.35 / 27.4, CPU 2.38 / 28.1; 5 of 5 passes agree in both)
- tune/primary best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 75.9 ms wall and 74.7 ms CPU (spreads wall 3.97 / 32.0, CPU 3.87 / 32.1; 5 of 5 passes agree in both)
- tune/primary best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 57.3 ms wall and 57.3 ms CPU (spreads wall 2.32 / 29.0, CPU 2.34 / 29.4; 5 of 5 passes agree in both)
- tune/primary best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 171 ms wall and 202 ms CPU (spreads wall 5.29 / 38.1, CPU 6.20 / 48.9; 5 of 5 passes agree in both)
- tune/primary best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 85.8 ms wall and 82.2 ms CPU (spreads wall 17.8 / 38.1, CPU 28.2 / 48.9; 5 of 5 passes agree in both)
- tune/S1 1 thread warm median: LadybugDB lower than SQLite by 98.2 ms wall and 97.7 ms CPU (spreads wall 8.92 / 1.32, CPU 8.79 / 1.45; 5 of 5 passes agree in both)
- tune/S1 1 thread warm p95: LadybugDB lower than SQLite by 113 ms wall and 110 ms CPU (spreads wall 17.2 / 2.85, CPU 17.2 / 2.87; 5 of 5 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 94.4 ms wall and 94.0 ms CPU (spreads wall 11.2 / 2.52, CPU 11.1 / 2.96; 5 of 5 passes agree in both)
- tune/S1 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 66.9 ms wall and 66.8 ms CPU (spreads wall 8.92 / 7.48, CPU 8.79 / 7.30; 5 of 5 passes agree in both)
- tune/S1 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 81.3 ms wall and 79.0 ms CPU (spreads wall 17.2 / 16.8, CPU 17.2 / 18.1; 5 of 5 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 73.4 ms wall and 73.5 ms CPU (spreads wall 11.2 / 9.33, CPU 11.1 / 9.12; 5 of 5 passes agree in both)
- tune/S1 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 46.0 ms wall and 80.8 ms CPU (spreads wall 19.5 / 29.0, CPU 19.1 / 51.3; 5 of 5 passes agree in both)
- tune/S1 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 31.2 ms wall and 30.9 ms CPU (spreads wall 1.32 / 7.48, CPU 1.45 / 7.30; 5 of 5 passes agree in both)
- tune/S1 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 31.2 ms wall and 31.1 ms CPU (spreads wall 2.85 / 16.8, CPU 2.87 / 18.1; 5 of 5 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 21.0 ms wall and 20.4 ms CPU (spreads wall 2.52 / 9.33, CPU 2.96 / 9.12; 5 of 5 passes agree in both)
- tune/S1 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 63.7 ms wall and 69.6 ms CPU (spreads wall 21.1 / 29.0, CPU 26.9 / 51.3; 5 of 5 passes agree in both)
- tune/S1 best threads warm median: LadybugDB lower than SQLite by 96.9 ms wall and 91.2 ms CPU (spreads wall 8.92 / 0.741, CPU 8.79 / 0.730; 5 of 5 passes agree in both)
- tune/S1 best threads warm p95: LadybugDB lower than SQLite by 112 ms wall and 102 ms CPU (spreads wall 17.2 / 2.42, CPU 17.2 / 3.39; 5 of 5 passes agree in both)
- tune/S1 best threads warm, application caches dropped: LadybugDB lower than SQLite by 93.4 ms wall and 82.9 ms CPU (spreads wall 11.2 / 2.11, CPU 11.1 / 1.34; 5 of 5 passes agree in both)
- tune/S1 best threads warm median: DuckDB+DuckPGQ lower than SQLite by 66.9 ms wall and 66.8 ms CPU (spreads wall 8.92 / 7.48, CPU 8.79 / 7.30; 5 of 5 passes agree in both)
- tune/S1 best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 81.3 ms wall and 79.0 ms CPU (spreads wall 17.2 / 16.8, CPU 17.2 / 18.1; 5 of 5 passes agree in both)
- tune/S1 best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 73.4 ms wall and 73.5 ms CPU (spreads wall 11.2 / 9.33, CPU 11.1 / 9.12; 5 of 5 passes agree in both)
- tune/S1 best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 46.0 ms wall and 80.8 ms CPU (spreads wall 19.5 / 29.0, CPU 19.1 / 51.3; 5 of 5 passes agree in both)
- tune/S1 best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 30.0 ms wall and 24.3 ms CPU (spreads wall 0.741 / 7.48, CPU 0.730 / 7.30; 5 of 5 passes agree in both)
- tune/S1 best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 30.7 ms wall and 23.2 ms CPU (spreads wall 2.42 / 16.8, CPU 3.39 / 18.1; 5 of 5 passes agree in both)
- tune/S1 best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 20.0 ms wall and 9.37 ms CPU (spreads wall 2.11 / 9.33, CPU 1.34 / 9.12; 5 of 5 passes agree in both)
- tune/S1 best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 60.6 ms wall and 55.3 ms CPU (spreads wall 18.9 / 29.0, CPU 30.1 / 51.3; 5 of 5 passes agree in both)
- tune/base 1 thread warm median: LadybugDB lower than SQLite by 106 ms wall and 106 ms CPU (spreads wall 12.0 / 0.511, CPU 12.5 / 0.571; 5 of 5 passes agree in both)
- tune/base 1 thread warm p95: LadybugDB lower than SQLite by 125 ms wall and 124 ms CPU (spreads wall 27.5 / 0.365, CPU 27.7 / 1.65; 5 of 5 passes agree in both)
- tune/base 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 102 ms wall and 102 ms CPU (spreads wall 12.9 / 1.95, CPU 12.7 / 1.96; 5 of 5 passes agree in both)
- tune/base 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 66.9 ms wall and 66.7 ms CPU (spreads wall 12.0 / 7.64, CPU 12.5 / 7.63; 5 of 5 passes agree in both)
- tune/base 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 76.6 ms wall and 76.4 ms CPU (spreads wall 27.5 / 12.9, CPU 27.7 / 12.4; 5 of 5 passes agree in both)
- tune/base 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 74.5 ms wall and 74.5 ms CPU (spreads wall 12.9 / 9.04, CPU 12.7 / 9.12; 5 of 5 passes agree in both)
- tune/base 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 49.8 ms wall and 80.2 ms CPU (spreads wall 18.0 / 37.4, CPU 18.1 / 39.2; 5 of 5 passes agree in both)
- tune/base 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 39.4 ms wall and 39.5 ms CPU (spreads wall 0.511 / 7.64, CPU 0.571 / 7.63; 5 of 5 passes agree in both)
- tune/base 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 47.9 ms wall and 47.4 ms CPU (spreads wall 0.365 / 12.9, CPU 1.65 / 12.4; 5 of 5 passes agree in both)
- tune/base 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 27.4 ms wall and 27.2 ms CPU (spreads wall 1.95 / 9.04, CPU 1.96 / 9.12; 5 of 5 passes agree in both)
- tune/base 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 78.3 ms wall and 83.7 ms CPU (spreads wall 23.0 / 37.4, CPU 27.6 / 39.2; 5 of 5 passes agree in both)
- tune/base best threads warm median: LadybugDB lower than SQLite by 106 ms wall and 106 ms CPU (spreads wall 12.0 / 0.511, CPU 12.5 / 0.571; 5 of 5 passes agree in both)
- tune/base best threads warm p95: LadybugDB lower than SQLite by 125 ms wall and 124 ms CPU (spreads wall 27.5 / 0.365, CPU 27.7 / 1.65; 5 of 5 passes agree in both)
- tune/base best threads warm, application caches dropped: LadybugDB lower than SQLite by 102 ms wall and 102 ms CPU (spreads wall 12.9 / 1.95, CPU 12.7 / 1.96; 5 of 5 passes agree in both)
- tune/base best threads warm median: DuckDB+DuckPGQ lower than SQLite by 66.9 ms wall and 66.7 ms CPU (spreads wall 12.0 / 7.64, CPU 12.5 / 7.63; 5 of 5 passes agree in both)
- tune/base best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 76.6 ms wall and 76.4 ms CPU (spreads wall 27.5 / 12.9, CPU 27.7 / 12.4; 5 of 5 passes agree in both)
- tune/base best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 74.5 ms wall and 74.5 ms CPU (spreads wall 12.9 / 9.04, CPU 12.7 / 9.12; 5 of 5 passes agree in both)
- tune/base best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 49.8 ms wall and 80.2 ms CPU (spreads wall 18.0 / 37.4, CPU 18.1 / 39.2; 5 of 5 passes agree in both)
- tune/base best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 39.4 ms wall and 39.5 ms CPU (spreads wall 0.511 / 7.64, CPU 0.571 / 7.63; 5 of 5 passes agree in both)
- tune/base best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 47.9 ms wall and 47.4 ms CPU (spreads wall 0.365 / 12.9, CPU 1.65 / 12.4; 5 of 5 passes agree in both)
- tune/base best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 27.4 ms wall and 27.2 ms CPU (spreads wall 1.95 / 9.04, CPU 1.96 / 9.12; 5 of 5 passes agree in both)
- tune/base best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 78.3 ms wall and 83.7 ms CPU (spreads wall 23.0 / 37.4, CPU 27.6 / 39.2; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm median: SQLite lower than LadybugDB by 38.5 ms wall and 39.0 ms CPU (spreads wall 7.69 / 15.1, CPU 7.70 / 16.9; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm p95: SQLite lower than LadybugDB by 56.7 ms wall and 62.0 ms CPU (spreads wall 14.4 / 27.0, CPU 17.5 / 35.5; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 40.1 ms wall and 40.2 ms CPU (spreads wall 7.11 / 16.3, CPU 7.48 / 17.9; 5 of 5 passes agree in both)
- frozen/primary 1 thread cold (open + first call): SQLite lower than LadybugDB by 107 ms wall and 153 ms CPU (spreads wall 10.0 / 26.1, CPU 12.6 / 42.2; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 66.0 ms wall and 66.8 ms CPU (spreads wall 7.69 / 36.0, CPU 7.70 / 35.6; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 83.1 ms wall and 76.8 ms CPU (spreads wall 14.4 / 60.0, CPU 17.5 / 60.4; 5 of 5 passes agree in both)
- frozen/primary 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 62.1 ms wall and 62.7 ms CPU (spreads wall 7.11 / 34.5, CPU 7.48 / 35.4; 5 of 5 passes agree in both)
- frozen/primary 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 196 ms wall and 240 ms CPU (spreads wall 10.0 / 62.8, CPU 12.6 / 77.3; 5 of 5 passes agree in both)
- frozen/primary 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 89.4 ms wall and 87.6 ms CPU (spreads wall 26.1 / 62.8, CPU 42.2 / 77.3; 5 of 5 passes agree in both)
- frozen/primary best threads warm median: SQLite lower than LadybugDB by 34.7 ms wall and 75.6 ms CPU (spreads wall 7.69 / 13.9, CPU 7.70 / 27.7; 5 of 5 passes agree in both)
- frozen/primary best threads warm p95: SQLite lower than LadybugDB by 53.7 ms wall and 101 ms CPU (spreads wall 14.4 / 33.4, CPU 17.5 / 59.7; 5 of 5 passes agree in both)
- frozen/primary best threads warm, application caches dropped: SQLite lower than LadybugDB by 33.3 ms wall and 72.6 ms CPU (spreads wall 7.11 / 16.2, CPU 7.48 / 30.3; 5 of 5 passes agree in both)
- frozen/primary best threads cold (open + first call): SQLite lower than LadybugDB by 103 ms wall and 205 ms CPU (spreads wall 10.0 / 29.9, CPU 12.6 / 54.3; 5 of 5 passes agree in both)
- frozen/primary best threads warm median: SQLite lower than DuckDB+DuckPGQ by 66.0 ms wall and 66.8 ms CPU (spreads wall 7.69 / 36.0, CPU 7.70 / 35.6; 5 of 5 passes agree in both)
- frozen/primary best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 83.1 ms wall and 76.8 ms CPU (spreads wall 14.4 / 60.0, CPU 17.5 / 60.4; 5 of 5 passes agree in both)
- frozen/primary best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 62.1 ms wall and 62.7 ms CPU (spreads wall 7.11 / 34.5, CPU 7.48 / 35.4; 5 of 5 passes agree in both)
- frozen/primary best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 196 ms wall and 240 ms CPU (spreads wall 10.0 / 62.8, CPU 12.6 / 77.3; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm median: LadybugDB lower than SQLite by 239 ms wall and 239 ms CPU (spreads wall 35.7 / 2.91, CPU 36.6 / 2.70; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm p95: LadybugDB lower than SQLite by 270 ms wall and 270 ms CPU (spreads wall 93.9 / 8.75, CPU 93.9 / 11.1; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 235 ms wall and 234 ms CPU (spreads wall 38.0 / 7.76, CPU 38.2 / 7.29; 5 of 5 passes agree in both)
- frozen/S1 1 thread cold (open + first call): LadybugDB lower than SQLite by 145 ms wall and 90.3 ms CPU (spreads wall 52.4 / 25.9, CPU 54.3 / 39.3; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 197 ms wall and 197 ms CPU (spreads wall 35.7 / 8.48, CPU 36.6 / 9.36; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 233 ms wall and 233 ms CPU (spreads wall 93.9 / 12.0, CPU 93.9 / 10.6; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 218 ms wall and 219 ms CPU (spreads wall 38.0 / 10.6, CPU 38.2 / 10.5; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 41.3 ms wall and 41.8 ms CPU (spreads wall 2.91 / 8.48, CPU 2.70 / 9.36; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 37.2 ms wall and 36.5 ms CPU (spreads wall 8.75 / 12.0, CPU 11.1 / 10.6; 5 of 5 passes agree in both)
- frozen/S1 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 16.2 ms wall and 15.4 ms CPU (spreads wall 7.76 / 10.6, CPU 7.29 / 10.5; 5 of 5 passes agree in both)
- frozen/S1 best threads warm median: LadybugDB lower than SQLite by 239 ms wall and 239 ms CPU (spreads wall 35.7 / 2.91, CPU 36.6 / 2.70; 5 of 5 passes agree in both)
- frozen/S1 best threads warm p95: LadybugDB lower than SQLite by 270 ms wall and 270 ms CPU (spreads wall 93.9 / 8.75, CPU 93.9 / 11.1; 5 of 5 passes agree in both)
- frozen/S1 best threads warm, application caches dropped: LadybugDB lower than SQLite by 235 ms wall and 234 ms CPU (spreads wall 38.0 / 7.76, CPU 38.2 / 7.29; 5 of 5 passes agree in both)
- frozen/S1 best threads cold (open + first call): LadybugDB lower than SQLite by 145 ms wall and 90.3 ms CPU (spreads wall 52.4 / 25.9, CPU 54.3 / 39.3; 5 of 5 passes agree in both)
- frozen/S1 best threads warm median: DuckDB+DuckPGQ lower than SQLite by 197 ms wall and 197 ms CPU (spreads wall 35.7 / 8.48, CPU 36.6 / 9.36; 5 of 5 passes agree in both)
- frozen/S1 best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 233 ms wall and 233 ms CPU (spreads wall 93.9 / 12.0, CPU 93.9 / 10.6; 5 of 5 passes agree in both)
- frozen/S1 best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 218 ms wall and 219 ms CPU (spreads wall 38.0 / 10.6, CPU 38.2 / 10.5; 5 of 5 passes agree in both)
- frozen/S1 best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 41.3 ms wall and 41.8 ms CPU (spreads wall 2.91 / 8.48, CPU 2.70 / 9.36; 5 of 5 passes agree in both)
- frozen/S1 best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 37.2 ms wall and 36.5 ms CPU (spreads wall 8.75 / 12.0, CPU 11.1 / 10.6; 5 of 5 passes agree in both)
- frozen/S1 best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 16.2 ms wall and 15.4 ms CPU (spreads wall 7.76 / 10.6, CPU 7.29 / 10.5; 5 of 5 passes agree in both)
- frozen/base 1 thread warm median: LadybugDB lower than SQLite by 259 ms wall and 258 ms CPU (spreads wall 61.7 / 2.11, CPU 61.7 / 2.26; 5 of 5 passes agree in both)
- frozen/base 1 thread warm p95: LadybugDB lower than SQLite by 314 ms wall and 313 ms CPU (spreads wall 105 / 3.32, CPU 105 / 3.90; 5 of 5 passes agree in both)
- frozen/base 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 252 ms wall and 251 ms CPU (spreads wall 59.2 / 8.90, CPU 59.5 / 9.32; 5 of 5 passes agree in both)
- frozen/base 1 thread cold (open + first call): LadybugDB lower than SQLite by 153 ms wall and 108 ms CPU (spreads wall 52.9 / 22.0, CPU 53.0 / 37.6; 5 of 5 passes agree in both)
- frozen/base 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 207 ms wall and 207 ms CPU (spreads wall 61.7 / 22.5, CPU 61.7 / 22.8; 5 of 5 passes agree in both)
- frozen/base 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 251 ms wall and 250 ms CPU (spreads wall 105 / 31.1, CPU 105 / 30.9; 5 of 5 passes agree in both)
- frozen/base 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 228 ms wall and 228 ms CPU (spreads wall 59.2 / 26.4, CPU 59.5 / 26.5; 5 of 5 passes agree in both)
- frozen/base 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 52.0 ms wall and 51.8 ms CPU (spreads wall 2.11 / 22.5, CPU 2.26 / 22.8; 5 of 5 passes agree in both)
- frozen/base 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 63.0 ms wall and 63.0 ms CPU (spreads wall 3.32 / 31.1, CPU 3.90 / 30.9; 5 of 5 passes agree in both)
- frozen/base best threads warm median: LadybugDB lower than SQLite by 259 ms wall and 258 ms CPU (spreads wall 61.7 / 2.11, CPU 61.7 / 2.26; 5 of 5 passes agree in both)
- frozen/base best threads warm p95: LadybugDB lower than SQLite by 314 ms wall and 313 ms CPU (spreads wall 105 / 3.32, CPU 105 / 3.90; 5 of 5 passes agree in both)
- frozen/base best threads warm, application caches dropped: LadybugDB lower than SQLite by 252 ms wall and 251 ms CPU (spreads wall 59.2 / 8.90, CPU 59.5 / 9.32; 5 of 5 passes agree in both)
- frozen/base best threads cold (open + first call): LadybugDB lower than SQLite by 153 ms wall and 108 ms CPU (spreads wall 52.9 / 22.0, CPU 53.0 / 37.6; 5 of 5 passes agree in both)
- frozen/base best threads warm median: DuckDB+DuckPGQ lower than SQLite by 207 ms wall and 207 ms CPU (spreads wall 61.7 / 22.5, CPU 61.7 / 22.8; 5 of 5 passes agree in both)
- frozen/base best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 251 ms wall and 250 ms CPU (spreads wall 105 / 31.1, CPU 105 / 30.9; 5 of 5 passes agree in both)
- frozen/base best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 228 ms wall and 228 ms CPU (spreads wall 59.2 / 26.4, CPU 59.5 / 26.5; 5 of 5 passes agree in both)
- frozen/base best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 52.0 ms wall and 51.8 ms CPU (spreads wall 2.11 / 22.5, CPU 2.26 / 22.8; 5 of 5 passes agree in both)
- frozen/base best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 63.0 ms wall and 63.0 ms CPU (spreads wall 3.32 / 31.1, CPU 3.90 / 30.9; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm median: SQLite lower than LadybugDB by 1.64 ms wall and 1.64 ms CPU (spreads wall 0.145 / 0.381, CPU 0.145 / 0.542; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm p95: SQLite lower than LadybugDB by 4.72 ms wall and 4.71 ms CPU (spreads wall 0.315 / 0.902, CPU 1.98 / 0.905; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 1.83 ms wall and 1.85 ms CPU (spreads wall 0.086 / 0.417, CPU 0.086 / 0.363; 5 of 5 passes agree in both)
- frozen/tq 1 thread cold (open + first call): SQLite lower than LadybugDB by 66.0 ms wall and 50.7 ms CPU (spreads wall 2.54 / 29.4, CPU 1.91 / 17.8; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 8.86 ms wall and 8.84 ms CPU (spreads wall 0.145 / 4.34, CPU 0.145 / 4.33; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 38.6 ms wall and 38.6 ms CPU (spreads wall 0.315 / 13.6, CPU 1.98 / 13.6; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 8.12 ms wall and 8.10 ms CPU (spreads wall 0.086 / 6.91, CPU 0.086 / 6.84; 5 of 5 passes agree in both)
- frozen/tq 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 142 ms wall and 157 ms CPU (spreads wall 2.54 / 37.9, CPU 1.91 / 39.6; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 7.23 ms wall and 7.20 ms CPU (spreads wall 0.381 / 4.34, CPU 0.542 / 4.33; 5 of 5 passes agree in both)
- frozen/tq 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 33.9 ms wall and 33.9 ms CPU (spreads wall 0.902 / 13.6, CPU 0.905 / 13.6; 5 of 5 passes agree in both)
- frozen/tq 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 76.5 ms wall and 107 ms CPU (spreads wall 29.4 / 37.9, CPU 17.8 / 39.6; 5 of 5 passes agree in both)
- frozen/tq best threads warm median: SQLite lower than LadybugDB by 1.68 ms wall and 1.67 ms CPU (spreads wall 0.068 / 0.381, CPU 0.091 / 0.542; 5 of 5 passes agree in both)
- frozen/tq best threads warm p95: SQLite lower than LadybugDB by 4.81 ms wall and 4.59 ms CPU (spreads wall 0.327 / 0.902, CPU 0.523 / 0.905; 5 of 5 passes agree in both)
- frozen/tq best threads warm, application caches dropped: SQLite lower than LadybugDB by 1.82 ms wall and 1.85 ms CPU (spreads wall 0.086 / 0.417, CPU 0.087 / 0.363; 5 of 5 passes agree in both)
- frozen/tq best threads cold (open + first call): SQLite lower than LadybugDB by 65.9 ms wall and 50.6 ms CPU (spreads wall 2.02 / 29.4, CPU 1.72 / 17.8; 5 of 5 passes agree in both)
- frozen/tq best threads warm median: SQLite lower than DuckDB+DuckPGQ by 8.91 ms wall and 8.88 ms CPU (spreads wall 0.068 / 4.34, CPU 0.091 / 4.33; 5 of 5 passes agree in both)
- frozen/tq best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 38.7 ms wall and 38.5 ms CPU (spreads wall 0.327 / 13.6, CPU 0.523 / 13.6; 5 of 5 passes agree in both)
- frozen/tq best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 8.11 ms wall and 8.11 ms CPU (spreads wall 0.086 / 6.91, CPU 0.087 / 6.84; 5 of 5 passes agree in both)
- frozen/tq best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 142 ms wall and 157 ms CPU (spreads wall 2.02 / 37.9, CPU 1.72 / 39.6; 5 of 5 passes agree in both)
- frozen/tq best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 7.23 ms wall and 7.20 ms CPU (spreads wall 0.381 / 4.34, CPU 0.542 / 4.33; 5 of 5 passes agree in both)
- frozen/tq best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 33.9 ms wall and 33.9 ms CPU (spreads wall 0.902 / 13.6, CPU 0.905 / 13.6; 5 of 5 passes agree in both)
- frozen/tq best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 76.5 ms wall and 107 ms CPU (spreads wall 29.4 / 37.9, CPU 17.8 / 39.6; 5 of 5 passes agree in both)
- tune store build: SQLite lower than LadybugDB by 2795 ms wall and 2163 ms CPU (spreads wall 73.2 / 2217, CPU 70.3 / 840; 5 of 5 passes agree in both)
- tune store build: SQLite lower than DuckDB+DuckPGQ by 272 ms wall and 412 ms CPU (spreads wall 73.2 / 148, CPU 70.3 / 269; 5 of 5 passes agree in both)
- tune store build: DuckDB+DuckPGQ lower than LadybugDB by 2523 ms wall and 1751 ms CPU (spreads wall 2217 / 148, CPU 840 / 269; 5 of 5 passes agree in both)
- frozen store build: SQLite lower than LadybugDB by 2840 ms wall and 2061 ms CPU (spreads wall 205 / 2143, CPU 224 / 911; 5 of 5 passes agree in both)
- frozen store build: DuckDB+DuckPGQ lower than LadybugDB by 3017 ms wall and 2049 ms CPU (spreads wall 2143 / 506, CPU 911 / 545; 5 of 5 passes agree in both)
- tune one-file update: SQLite lower than LadybugDB by 294 ms wall and 571 ms CPU (spreads wall 36.1 / 125, CPU 26.3 / 171; 5 of 5 passes agree in both)
- tune one-file update: DuckDB+DuckPGQ lower than LadybugDB by 281 ms wall and 419 ms CPU (spreads wall 125 / 68.1, CPU 171 / 94.8; 5 of 5 passes agree in both)
- frozen one-file update: SQLite lower than LadybugDB by 364 ms wall and 772 ms CPU (spreads wall 97.8 / 240, CPU 91.5 / 445; 5 of 5 passes agree in both)
- frozen one-file update: DuckDB+DuckPGQ lower than LadybugDB by 454 ms wall and 761 ms CPU (spreads wall 240 / 73.5, CPU 445 / 94.0; 5 of 5 passes agree in both)

### Differences inside the noise

- tune/primary 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 28.8 ms wall and 26.0 ms CPU (spreads wall 8.85 / 27.4, CPU 10.0 / 28.1; 5 of 5 passes agree in both) [not larger than the spread]
- tune/primary 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 30.5 ms wall and 28.0 ms CPU (spreads wall 7.95 / 29.0, CPU 8.95 / 29.4; 5 of 5 passes agree in both) [not larger than the spread]
- tune/primary best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 29.8 ms wall and 12.8 ms CPU (spreads wall 10.8 / 27.4, CPU 14.6 / 28.1; 5 of 5 passes agree in both) [not larger than the spread]
- tune/primary best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 39.5 ms wall and 14.4 ms CPU (spreads wall 19.9 / 32.0, CPU 25.8 / 32.1; 5 of 5 passes agree in both) [not larger than the spread]
- tune/primary best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 30.0 ms wall and 12.0 ms CPU (spreads wall 9.13 / 29.0, CPU 12.7 / 29.4; 5 of 5 passes agree in both) [not larger than the spread]
- tune/S1 1 thread cold (open + first call): LadybugDB lower than SQLite by 17.8 ms wall and -11.2 ms CPU (spreads wall 19.5 / 21.1, CPU 19.1 / 26.9; 1 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- tune/S1 best threads cold (open + first call): LadybugDB lower than SQLite by 14.6 ms wall and -25.5 ms CPU (spreads wall 19.5 / 18.9, CPU 19.1 / 30.1; 0 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- tune/base 1 thread cold (open + first call): LadybugDB lower than SQLite by 28.5 ms wall and 3.44 ms CPU (spreads wall 18.0 / 23.0, CPU 18.1 / 27.6; 4 of 5 passes agree in both) [not larger than the spread]
- tune/base best threads cold (open + first call): LadybugDB lower than SQLite by 28.5 ms wall and 3.44 ms CPU (spreads wall 18.0 / 23.0, CPU 18.1 / 27.6; 4 of 5 passes agree in both) [not larger than the spread]
- frozen/primary 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 27.5 ms wall and 27.9 ms CPU (spreads wall 15.1 / 36.0, CPU 16.9 / 35.6; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/primary 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 26.3 ms wall and 14.8 ms CPU (spreads wall 27.0 / 60.0, CPU 35.5 / 60.4; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/primary 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 22.0 ms wall and 22.5 ms CPU (spreads wall 16.3 / 34.5, CPU 17.9 / 35.4; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/primary best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 31.3 ms wall and -8.80 ms CPU (spreads wall 13.9 / 36.0, CPU 27.7 / 35.6; 2 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 29.4 ms wall and -23.8 ms CPU (spreads wall 33.4 / 60.0, CPU 59.7 / 60.4; 1 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 28.9 ms wall and -9.92 ms CPU (spreads wall 16.2 / 34.5, CPU 30.3 / 35.4; 1 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 93.5 ms wall and 35.0 ms CPU (spreads wall 29.9 / 62.8, CPU 54.3 / 77.3; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/S1 1 thread cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 78.7 ms wall and 45.9 ms CPU (spreads wall 52.4 / 46.2, CPU 54.3 / 50.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/S1 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 66.2 ms wall and 44.3 ms CPU (spreads wall 25.9 / 46.2, CPU 39.3 / 50.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/S1 best threads cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 78.7 ms wall and 45.9 ms CPU (spreads wall 52.4 / 46.2, CPU 54.3 / 50.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/S1 best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 66.2 ms wall and 44.3 ms CPU (spreads wall 25.9 / 46.2, CPU 39.3 / 50.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base 1 thread cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 83.7 ms wall and 73.2 ms CPU (spreads wall 52.9 / 63.9, CPU 53.0 / 80.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 23.2 ms wall and 23.0 ms CPU (spreads wall 8.90 / 26.4, CPU 9.32 / 26.5; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 68.9 ms wall and 34.9 ms CPU (spreads wall 22.0 / 63.9, CPU 37.6 / 80.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base best threads cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 83.7 ms wall and 73.2 ms CPU (spreads wall 52.9 / 63.9, CPU 53.0 / 80.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 23.2 ms wall and 23.0 ms CPU (spreads wall 8.90 / 26.4, CPU 9.32 / 26.5; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/base best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 68.9 ms wall and 34.9 ms CPU (spreads wall 22.0 / 63.9, CPU 37.6 / 80.7; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/tq 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 6.29 ms wall and 6.26 ms CPU (spreads wall 0.417 / 6.91, CPU 0.363 / 6.84; 5 of 5 passes agree in both) [not larger than the spread]
- frozen/tq best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 6.29 ms wall and 6.26 ms CPU (spreads wall 0.417 / 6.91, CPU 0.363 / 6.84; 5 of 5 passes agree in both) [not larger than the spread]
- frozen store build: DuckDB+DuckPGQ lower than SQLite by 177 ms wall and -12.2 ms CPU (spreads wall 205 / 506, CPU 224 / 545; 1 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- tune one-file update: SQLite lower than DuckDB+DuckPGQ by 13.3 ms wall and 152 ms CPU (spreads wall 36.1 / 68.1, CPU 26.3 / 94.8; 5 of 5 passes agree in both) [not larger than the spread]
- frozen one-file update: DuckDB+DuckPGQ lower than SQLite by 89.9 ms wall and -11.0 ms CPU (spreads wall 97.8 / 73.5, CPU 91.5 / 94.0; 1 of 5 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]

## Equivalence of the timed answers (bench/icheck.js)

- DuckDB+DuckPGQ against the reference arm: tune/primary@T1 1000/1000; tune/S1@T1 1000/1000; tune/base@T1 1000/1000; frozen/primary@T1 1000/1000; frozen/S1@T1 1000/1000; frozen/base@T1 1000/1000 (answers equal at 1e-9 / answers compared, all passes).
- SQLite against the reference arm: tune/primary@T1 1000/1000; tune/S1@T1 1000/1000; tune/base@T1 1000/1000; frozen/primary@T1 1000/1000; frozen/S1@T1 1000/1000; frozen/base@T1 1000/1000 (answers equal at 1e-9 / answers compared, all passes).
- LadybugDB against the reference arm: tune/primary@T1 1000/1000; tune/primary@T2 1000/1000; tune/S1@T1 1000/1000; tune/S1@T2 1000/1000; tune/base@T1 1000/1000; frozen/primary@T1 1000/1000; frozen/primary@T4 1000/1000; frozen/S1@T1 1000/1000; frozen/base@T1 1000/1000 (answers equal at 1e-9 / answers compared, all passes).
- Cold against warm: 2800 of 2800 equal.
- TQ: 400 answers to 20 questions from DuckDB+DuckPGQ, SQLite, LadybugDB; 0 differ.
- LadybugDB S2 on tune: 1000 answers over passes and thread settings; 0 differ.
- LadybugDB S2 on frozen: 2000 answers over passes and thread settings; 0 differ.
- Problems: none.

## What makes a number not comparable across engines

- Client form: SQLite (node:sqlite) and LadybugDB are synchronous in-process calls; the DuckDB Node client is asynchronous, so each statement pays a promise and event-loop round trip. "Round trips (est.)" = statements x the median no-op statement through the same client path; it is an estimate (a no-op statement still parses and plans).
- Where the algorithm runs differs (see the labels): LadybugDB runs the PageRank and the degree-normalised spreading in application code, so its "engine API" time is not the algorithm time in the same sense as for SQLite and DuckDB.
- Thread knobs differ: SQLite PRAGMA threads only adds sorter helper threads (a recursive CTE runs on one thread); LadybugDB CALL threads is per connection; DuckDB SET threads is instance-wide. In the warm workers the setting is switched at run time between blocks and read back each block; cold processes open with it.
- CPU time is the CPU of the whole process doing the work (every thread). A multi-threaded engine can show more CPU than wall time; at one thread CPU is close to wall time unless the process waited.
- Store contents differ per arm (SQLite: closure table, FTS5, global PageRank column; LadybugDB: typed and arc relationship tables, term graph, native priors incl. page_rank, k-core and Louvain at build; DuckDB: label tables, arc table, BM25 postings, two stored property graphs), so build time, update time and bytes compare designs, not engines alone. Builds and updates run at each engine's default thread count.
- Memory settings are the arms' own: SQLite 64 MiB page cache, LadybugDB 1 GiB buffer pool, DuckDB memory limit 2 GB.
- Cold = fresh process and connection; the operating-system file cache stays warm (dropping it needs privileges the container lacks).
- Load: blocks alternate so load falls on all engines alike, but a short block (LadybugDB base, TQ) samples a shorter window than a long one (SQLite S1); the load table above shows how the load fell per engine. The host sampler resolves about 1 second; a block shorter than that is judged by the sample that contains it.
- Hyper-V schedules the VM's virtual CPUs on busy host cores; the CPU set pinned inside the VM cannot prevent that. CPU time counts only time the thread actually ran, so it is less affected by waiting than wall time, but not by slower execution (shared caches, a busy sibling hardware thread, clock speed).
- TQ code differs per arm (the relational arm re-prepares statements per question; LadybugDB keeps prepared statements; DuckDB inlines literals).
- tune seeds are TUNE T1 seeds of many June parents mapped onto the largest TUNE parent by path and symbol (plan.json).

