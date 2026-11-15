# Engine benches, interleaved (protocol addendum 5 section C; addendum 4 items 18 to 20)

Generated 2026-11-13T07:40:27.621Z from 4 complete units (p1-frozen, p1-tune, p2-frozen, p2-tune). **PROOF RUN (10 seeds, 2 passes): these numbers only show that the driver works and are discarded.**

Every time is in milliseconds (ms). A cell "a ±s / c ±t" = median over passes of the wall time ± spread between passes (largest minus smallest pass value) / the same for CPU time of the process that does the work (all its threads; for the cold rows the fresh process). Inputs are TUNE seeds and the frozen-commit graph only (plan.json).

Settings: {"plan_hash":"d185eb59a0999064","seeds":10,"passes":2,"chunk":20,"reps":1,"cold_n":3,"cold_chunk":5,"update_n":5,"update_chunk":10,"update_check":10,"calib":10,"calib_reps":3,"noop_n":50,"builds_per_pass":2,"max_repeats":3,"load_frac":0.5,"host_wait_s":20,"best_within":0.03}.

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

## Load on the host while the blocks ran

176 kept blocks; 78 repeats because other work used more than half of the host CPUs; 16 blocks kept and flagged after 3 repeats. "Other work" = host processes outside the Docker VM plus VM work outside this container, in CPUs (the host has 24 logical CPUs).

| engine | kept blocks | repeats | kept flagged | other work, median CPUs | other work, max CPUs | VM steal, median CPUs |
|---|---|---|---|---|---|---|
| SQLite | 56 | 22 | 4 | 2.08 | 16.6 | 0.000 |
| LadybugDB | 76 | 32 | 7 | 2.37 | 16.2 | 0.000 |
| DuckDB+DuckPGQ | 44 | 24 | 5 | 2.25 | 16.0 | 0.000 |

Blocks judged without the host timeline (VM side only): 0.

## Thread calibration (once, before the passes; calibration seeds disjoint from the measured ones)

Rule: fewest threads whose median warm wall time over the calibration items x 3 repetitions is within 3 % of the lowest. Candidates: 1, 2, 4, 6 threads.

- DuckDB+DuckPGQ / tune: primary [1: 50.4 ms wall, 50.6 ms CPU; 2: 57.9 ms wall, 67.4 ms CPU; 4: 63.1 ms wall, 80.8 ms CPU; 6: 63.0 ms wall, 86.5 ms CPU] best 1; S1 [1: 36.7 ms wall, 36.3 ms CPU; 2: 43.2 ms wall, 51.9 ms CPU; 4: 42.7 ms wall, 50.4 ms CPU; 6: 51.4 ms wall, 78.1 ms CPU] best 1; base [1: 32.6 ms wall, 32.8 ms CPU; 2: 39.0 ms wall, 41.2 ms CPU; 4: 44.2 ms wall, 51.5 ms CPU; 6: 48.8 ms wall, 69.8 ms CPU] best 1
- SQLite / tune: primary [1: 13.8 ms wall, 14.7 ms CPU; 2: 13.5 ms wall, 13.6 ms CPU; 4: 13.6 ms wall, 13.7 ms CPU; 6: 13.1 ms wall, 13.2 ms CPU] best 6; S1 [1: 104 ms wall, 104 ms CPU; 2: 123 ms wall, 123 ms CPU; 4: 109 ms wall, 109 ms CPU; 6: 107 ms wall, 107 ms CPU] best 1; base [1: 97.5 ms wall, 97.8 ms CPU; 2: 101 ms wall, 101 ms CPU; 4: 99.4 ms wall, 99.5 ms CPU; 6: 115 ms wall, 115 ms CPU] best 1
- LadybugDB / tune: primary [1: 44.2 ms wall, 47.1 ms CPU; 2: 37.8 ms wall, 52.8 ms CPU; 4: 36.3 ms wall, 54.6 ms CPU; 6: 38.4 ms wall, 59.8 ms CPU] best 4; S1 [1: 17.2 ms wall, 17.9 ms CPU; 2: 18.0 ms wall, 24.0 ms CPU; 4: 19.3 ms wall, 25.7 ms CPU; 6: 21.2 ms wall, 29.0 ms CPU] best 1; base [1: 5.15 ms wall, 5.15 ms CPU; 2: 6.62 ms wall, 9.52 ms CPU; 4: 9.96 ms wall, 13.2 ms CPU; 6: 11.0 ms wall, 14.7 ms CPU] best 1; S2 [1: 42.1 ms wall, 44.1 ms CPU; 2: 43.2 ms wall, 58.3 ms CPU; 4: 44.5 ms wall, 65.4 ms CPU; 6: 46.2 ms wall, 69.6 ms CPU] best 1
- DuckDB+DuckPGQ / frozen: primary [1: 90.2 ms wall, 91.3 ms CPU; 2: 107 ms wall, 125 ms CPU; 4: 105 ms wall, 129 ms CPU; 6: 113 ms wall, 156 ms CPU] best 1; S1 [1: 45.7 ms wall, 45.7 ms CPU; 2: 52.4 ms wall, 59.1 ms CPU; 4: 62.6 ms wall, 74.1 ms CPU; 6: 61.8 ms wall, 96.8 ms CPU] best 1; base [1: 44.6 ms wall, 44.6 ms CPU; 2: 53.8 ms wall, 57.8 ms CPU; 4: 62.5 ms wall, 70.5 ms CPU; 6: 68.7 ms wall, 109 ms CPU] best 1; tq [1: 12.3 ms wall, 12.3 ms CPU; 2: 9.63 ms wall, 10.9 ms CPU; 4: 9.62 ms wall, 12.2 ms CPU; 6: 9.82 ms wall, 13.1 ms CPU] best 2
- SQLite / frozen: primary [1: 36.8 ms wall, 36.8 ms CPU; 2: 32.6 ms wall, 32.2 ms CPU; 4: 31.3 ms wall, 31.3 ms CPU; 6: 31.7 ms wall, 31.7 ms CPU] best 4; S1 [1: 226 ms wall, 226 ms CPU; 2: 221 ms wall, 220 ms CPU; 4: 227 ms wall, 227 ms CPU; 6: 227 ms wall, 229 ms CPU] best 1; base [1: 241 ms wall, 241 ms CPU; 2: 223 ms wall, 223 ms CPU; 4: 237 ms wall, 237 ms CPU; 6: 243 ms wall, 243 ms CPU] best 2; tq [1: 0.234 ms wall, 0.236 ms CPU; 2: 0.336 ms wall, 0.349 ms CPU; 4: 0.211 ms wall, 0.218 ms CPU; 6: 0.245 ms wall, 0.247 ms CPU] best 4
- LadybugDB / frozen: primary [1: 74.0 ms wall, 73.3 ms CPU; 2: 64.4 ms wall, 86.3 ms CPU; 4: 66.1 ms wall, 101 ms CPU; 6: 66.3 ms wall, 107 ms CPU] best 2; S1 [1: 9.30 ms wall, 9.44 ms CPU; 2: 10.8 ms wall, 15.3 ms CPU; 4: 13.9 ms wall, 18.6 ms CPU; 6: 16.1 ms wall, 21.3 ms CPU] best 1; base [1: 7.28 ms wall, 7.29 ms CPU; 2: 12.0 ms wall, 16.5 ms CPU; 4: 13.6 ms wall, 18.9 ms CPU; 6: 13.7 ms wall, 18.8 ms CPU] best 1; S2 [1: 94.4 ms wall, 97.8 ms CPU; 2: 82.8 ms wall, 109 ms CPU; 4: 88.6 ms wall, 132 ms CPU; 6: 93.3 ms wall, 141 ms CPU] best 2; tq [1: 1.89 ms wall, 2.01 ms CPU; 2: 6.14 ms wall, 12.0 ms CPU; 4: 9.93 ms wall, 17.3 ms CPU; 6: 11.9 ms wall, 19.8 ms CPU] best 1

## Query classes on the tune graph (7b3a74528189, 2450 nodes, 7077 edges; 2 passes)

### tune / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (primary): SQLite: unbounded walk and degree-normalised spreading in SQL, one statement per BFS level, level loop in application code; LadybugDB: arcs and out-degrees fetched by Cypher; the degree-normalised spreading runs in application code (JavaScript): not in the engine; DuckDB+DuckPGQ: reach by iterativelength() over a CSR built in the statement; spreading in SQL, one statement per BFS level, level loop in application code.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 13.6 ±0.193 / 13.7 ±0.393 | 15.4 ±1.30 / 16.5 ±0.942 | 14.8 ±0.635 / 14.6 ±1.16 | 19.4 ±0.022 / 21.7 ±0.063 | 2.35 ±0.177 / 2.36 ±0.178 | 13.2 ±2.72 / 13.4 ±3.04 | 1.86 ±1.34 / 1.80 ±1.32 | 0.049 ±0.000 / 0.074 ±0.049 | 13.1 ±2.72 / 13.3 ±2.99 | 49.0 | 19 / 2475 / 43 | 4 (0, 0) |
| SQLite | best 6 | 16.1 ±4.09 / 16.2 ±4.04 | 18.4 ±4.68 / 24.2 ±1.22 | 14.3 ±2.36 / 14.5 ±2.61 | 21.1 ±2.07 / 22.3 ±0.112 | 2.43 ±0.100 / 2.42 ±0.129 | 12.3 ±0.811 / 12.3 ±0.817 | 1.19 ±0.205 / 1.13 ±0.195 | 0.049 ±0.000 / 0.074 ±0.049 | 12.2 ±0.810 / 12.3 ±0.767 | 49.0 | 19 / 2475 / 43 | 4 (0, 0) |
| LadybugDB | 1 | 36.7 ±4.36 / 38.7 ±2.44 | 41.6 ±6.23 / 48.4 ±10.6 | 38.5 ±7.18 / 40.5 ±8.06 | 95.0 ±8.96 / 109 ±7.48 | 24.9 ±3.03 / 26.1 ±2.99 | 34.1 ±5.23 / 35.7 ±5.70 | 4.20 ±1.92 / 4.19 ±1.91 | 0.016 ±0.000 / 0.019 ±0.002 | 34.1 ±5.23 / 35.7 ±5.70 | 2.00 | 2 / 471 / 2 | 4 (0, 0) |
| LadybugDB | best 4 | 35.8 ±1.25 / 53.1 ±4.23 | 40.4 ±0.009 / 68.9 ±2.50 | 35.2 ±1.34 / 53.4 ±4.31 | 93.0 ±2.66 / 134 ±4.36 | 24.7 ±0.150 / 27.2 ±0.127 | 30.6 ±0.303 / 48.2 ±2.09 | 3.79 ±0.069 / 3.79 ±0.071 | 0.018 ±0.008 / 0.021 ±0.010 | 30.6 ±0.311 / 48.1 ±2.10 | 2.00 | 2 / 471 / 2 | 4 (0, 0) |
| DuckDB+DuckPGQ | 1 | 51.7 ±8.48 / 52.2 ±9.13 | 60.7 ±2.46 / 63.3 ±4.25 | 54.3 ±11.8 / 54.7 ±11.6 | 167 ±12.0 / 187 ±8.58 | 87.4 ±1.10 / 90.5 ±0.979 | 54.4 ±10.0 / 54.9 ±10.3 | 0.396 ±0.018 / 0.283 ±0.008 | 8.68 ±3.06 / 8.47 ±2.86 | 45.6 ±6.58 / 46.5 ±7.32 | 22.0 | 16 / 3242 / 33 | 4 (0, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":5,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"4"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S1): SQLite: 4-hop reach by a recursive CTE; personalised PageRank in SQL, about 270 statements per ranking (one per iteration step, loop in application code) over TEMP transition tables; LadybugDB: 4-hop reach by the native recursive pattern; personalised PageRank, 40 iterations in application code (JavaScript) over a transition CSR fetched by one Cypher query and cached in application code; DuckDB+DuckPGQ: 4-hop reach by a recursive SQL statement (no bounded graph operator in DuckPGQ); personalised PageRank as one recursive SQL statement (40 steps) over TEMP transition tables.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 102 ±2.68 / 102 ±2.75 | 111 ±8.41 / 111 ±8.41 | 113 ±5.92 / 113 ±3.23 | 116 ±3.55 / 117 ±4.09 | 2.46 ±0.042 / 2.46 ±0.033 | 109 ±17.9 / 109 ±18.0 | 2.21 ±0.879 / 1.98 ±1.08 | 0.272 ±0.000 / 0.408 ±0.272 | 109 ±17.9 / 109 ±17.7 | 272 | 21 / 2952 / 53 | 4 (0, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 16.3 ±1.50 / 16.9 ±1.86 | 22.9 ±1.10 / 25.1 ±1.81 | 30.2 ±2.71 / 31.4 ±4.01 | 101 ±6.24 / 130 ±2.95 | 25.7 ±1.30 / 26.9 ±1.51 | 12.8 ±2.22 / 13.6 ±2.90 | 3.67 ±1.16 / 3.72 ±1.26 | 0.016 ±0.008 / 0.019 ±0.006 | 12.8 ±2.21 / 13.6 ±2.90 | 2.00 | 2 / 471 / 2 | 4 (0, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 35.1 ±6.38 / 35.5 ±7.16 | 38.3 ±6.71 / 41.7 ±12.0 | 39.0 ±3.87 / 39.2 ±4.29 | 152 ±10.8 / 189 ±38.3 | 84.0 ±9.51 / 120 ±35.9 | 40.4 ±7.83 / 40.6 ±8.24 | 0.367 ±0.137 / 0.261 ±0.076 | 4.53 ±0.276 / 4.46 ±0.276 | 35.8 ±8.10 / 36.2 ±8.51 | 12.0 | 13 / 2682 / 39 | 4 (0, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (base): SQLite: as S1 with 2 hops; LadybugDB: as S1 with 2 hops; DuckDB+DuckPGQ: as S1 with 2 hops.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 101 ±8.36 / 101 ±8.25 | 111 ±8.95 / 112 ±9.45 | 111 ±8.42 / 111 ±9.01 | 111 ±5.74 / 111 ±5.67 | 2.38 ±0.039 / 2.36 ±0.002 | 96.6 ±4.73 / 97.1 ±4.84 | 1.52 ±0.173 / 1.16 ±0.139 | 0.272 ±0.000 / 0.544 ±0.000 | 96.4 ±4.73 / 96.5 ±4.84 | 272 | 21 / 2952 / 53 | 4 (0, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 4.02 ±0.098 / 4.28 ±0.236 | 5.25 ±0.433 / 6.96 ±3.40 | 18.0 ±0.227 / 18.6 ±0.823 | 78.6 ±3.08 / 98.4 ±5.78 | 24.5 ±0.070 / 25.8 ±0.290 | 1.67 ±0.029 / 1.82 ±0.297 | 2.03 ±0.057 / 2.03 ±0.056 | 0.017 ±0.006 / 0.020 ±0.004 | 1.65 ±0.036 / 1.80 ±0.302 | 2.00 | 2 / 471 / 2 | 4 (0, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 28.5 ±3.75 / 28.7 ±3.58 | 31.0 ±4.79 / 31.3 ±4.19 | 34.1 ±7.60 / 34.2 ±7.50 | 159 ±34.1 / 186 ±29.6 | 96.8 ±24.1 / 122 ±20.2 | 29.1 ±3.99 / 29.7 ±3.54 | 0.195 ±0.027 / 0.145 ±0.027 | 4.46 ±1.07 / 4.39 ±1.03 | 24.7 ±2.93 / 25.3 ±2.51 | 12.0 | 13 / 2682 / 39 | 4 (0, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### tune / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S2): LadybugDB: unbounded reach by the native recursive pattern; personalised PageRank in application code (as S1) fused with the community prior stored in the database (native Louvain at build, grouping read from the stored prior file).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LadybugDB | 1 | 44.5 ±5.54 / 48.2 ±6.28 | 59.6 ±24.3 / 61.9 ±25.3 | 58.7 ±9.72 / 62.1 ±11.5 | 128 ±0.274 / 167 ±8.79 | 24.4 ±0.158 / 25.5 ±0.167 | 35.3 ±3.42 / 37.0 ±4.28 | 6.92 ±1.46 / 6.90 ±1.47 | 0.028 ±0.000 / 0.032 ±0.000 | 35.3 ±3.42 / 36.9 ±4.28 | 4.00 | 4 / 576 / 4 | 4 (0, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}.

## Query classes on the frozen graph (a31924a3818f, 5464 nodes, 16462 edges; 2 passes)

### frozen / primary (95e990307da3b42b): typed primary (relational, LadybugDB, DuckPGQ)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (primary): SQLite: unbounded walk and degree-normalised spreading in SQL, one statement per BFS level, level loop in application code; LadybugDB: arcs and out-degrees fetched by Cypher; the degree-normalised spreading runs in application code (JavaScript): not in the engine; DuckDB+DuckPGQ: reach by iterativelength() over a CSR built in the statement; spreading in SQL, one statement per BFS level, level loop in application code.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 32.0 ±2.55 / 32.1 ±2.48 | 42.8 ±18.8 / 43.9 ±16.7 | 32.4 ±2.91 / 32.4 ±2.92 | 45.1 ±0.658 / 47.9 ±1.55 | 4.15 ±0.175 / 4.15 ±0.156 | 34.2 ±12.7 / 34.3 ±12.7 | 3.42 ±1.46 / 3.34 ±1.41 | 0.053 ±0.000 / 0.106 ±0.000 | 34.1 ±12.7 / 34.2 ±12.7 | 53.0 | 19 / 2475 / 43 | 4 (3, 1) |
| SQLite | best 4 | 33.7 ±2.87 / 34.0 ±3.49 | 40.4 ±2.30 / 41.7 ±4.88 | 34.1 ±2.44 / 34.5 ±2.10 | 54.3 ±20.0 / 57.5 ±19.2 | 4.69 ±1.40 / 4.69 ±1.41 | 28.9 ±0.880 / 29.0 ±0.919 | 3.06 ±0.089 / 3.00 ±0.076 | 0.053 ±0.000 / 0.080 ±0.053 | 28.9 ±0.883 / 28.9 ±0.868 | 53.0 | 19 / 2475 / 43 | 4 (0, 0) |
| LadybugDB | 1 | 73.4 ±1.54 / 75.1 ±1.21 | 88.2 ±5.24 / 115 ±27.5 | 78.9 ±17.7 / 81.2 ±24.8 | 140 ±14.7 / 181 ±23.9 | 25.4 ±2.08 / 26.6 ±2.08 | 60.9 ±0.523 / 59.6 ±2.68 | 10.1 ±1.57 / 10.1 ±1.57 | 0.015 ±0.002 / 0.018 ±0.000 | 60.9 ±0.526 / 59.6 ±2.68 | 2.00 | 2 / 471 / 2 | 4 (0, 0) |
| LadybugDB | best 2 | 66.0 ±4.57 / 86.7 ±9.13 | 75.5 ±1.69 / 120 ±22.2 | 76.7 ±28.5 / 100 ±39.2 | 133 ±2.82 / 198 ±3.65 | 24.0 ±0.252 / 26.4 ±0.190 | 56.4 ±5.52 / 78.2 ±12.0 | 12.4 ±2.61 / 12.6 ±3.06 | 0.014 ±0.004 / 0.017 ±0.006 | 56.4 ±5.51 / 78.1 ±12.0 | 2.00 | 2 / 471 / 2 | 4 (3, 0) |
| DuckDB+DuckPGQ | 1 | 91.4 ±17.5 / 92.8 ±16.3 | 110 ±33.7 / 111 ±36.3 | 96.9 ±25.0 / 97.3 ±24.8 | 232 ±74.3 / 351 ±171 | 105 ±40.1 / 192 ±130 | 92.2 ±16.3 / 93.7 ±13.8 | 0.632 ±0.134 / 0.520 ±0.105 | 10.7 ±4.25 / 10.4 ±4.06 | 81.2 ±11.7 / 82.9 ±9.40 | 24.0 | 15 / 3207 / 32 | 4 (3, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":3,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"2"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / S1 (6b70cc1222745385): S1, the selection rule as first written (hops=4, PPR)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S1): SQLite: 4-hop reach by a recursive CTE; personalised PageRank in SQL, about 270 statements per ranking (one per iteration step, loop in application code) over TEMP transition tables; LadybugDB: 4-hop reach by the native recursive pattern; personalised PageRank, 40 iterations in application code (JavaScript) over a transition CSR fetched by one Cypher query and cached in application code; DuckDB+DuckPGQ: 4-hop reach by a recursive SQL statement (no bounded graph operator in DuckPGQ); personalised PageRank as one recursive SQL statement (40 steps) over TEMP transition tables.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 240 ±19.3 / 240 ±19.2 | 302 ±107 / 303 ±104 | 278 ±1.74 / 278 ±1.67 | 255 ±3.54 / 257 ±3.43 | 4.11 ±0.181 / 4.11 ±0.169 | 243 ±28.1 / 245 ±30.6 | 1.93 ±0.091 / 1.55 ±0.046 | 0.271 ±0.000 / 0.407 ±0.271 | 243 ±28.1 / 245 ±30.8 | 271 | 21 / 2952 / 53 | 4 (2, 0) |
| SQLite | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| LadybugDB | 1 | 14.9 ±4.34 / 18.6 ±0.902 | 36.9 ±2.75 / 45.4 ±5.26 | 63.5 ±21.0 / 65.9 ±22.5 | 118 ±12.9 / 165 ±23.6 | 25.4 ±1.29 / 26.6 ±1.25 | 6.49 ±1.85 / 7.76 ±0.654 | 7.48 ±0.192 / 7.98 ±0.822 | 0.014 ±0.004 / 0.017 ±0.002 | 6.48 ±1.86 / 7.74 ±0.652 | 2.00 | 2 / 471 / 2 | 4 (3, 0) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 53.2 ±18.3 / 53.1 ±17.1 | 67.6 ±32.0 / 69.9 ±33.3 | 55.5 ±13.6 / 55.7 ±13.2 | 187 ±35.9 / 224 ±32.4 | 96.3 ±20.0 / 135 ±6.51 | 47.8 ±8.86 / 47.9 ±8.78 | 0.242 ±0.010 / 0.181 ±0.004 | 5.03 ±0.960 / 4.97 ±1.01 | 42.8 ±7.90 / 42.9 ±7.77 | 12.0 | 12 / 2647 / 38 | 4 (3, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":0,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / base (8067b9cf65e59b2f): the 2-hop base configuration (stage-1 BASE of every typed arm)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (base): SQLite: as S1 with 2 hops; LadybugDB: as S1 with 2 hops; DuckDB+DuckPGQ: as S1 with 2 hops.

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 231 ±23.2 / 232 ±23.1 | 286 ±99.8 / 286 ±99.8 | 266 ±36.5 / 266 ±36.5 | 262 ±6.19 / 262 ±6.33 | 4.28 ±0.286 / 4.28 ±0.267 | 260 ±66.6 / 260 ±66.6 | 1.65 ±0.554 / 1.24 ±0.441 | 0.271 ±0.000 / 0.542 ±0.000 | 260 ±66.6 / 260 ±66.6 | 271 | 21 / 2952 / 53 | 4 (2, 0) |
| SQLite | best 2 | 237 ±30.3 / 237 ±30.2 | 312 ±168 / 316 ±160 | 255 ±31.2 / 255 ±30.9 | 325 ±148 / 325 ±148 | 4.24 ±0.310 / 4.23 ±0.301 | 231 ±24.4 / 232 ±24.2 | 1.55 ±0.013 / 1.27 ±0.155 | 0.271 ±0.000 / 0.542 ±0.000 | 231 ±24.4 / 231 ±24.2 | 271 | 21 / 2952 / 53 | 4 (1, 0) |
| LadybugDB | 1 | 7.57 ±3.09 / 8.12 ±3.94 | 12.9 ±11.0 / 19.4 ±23.9 | 47.1 ±18.9 / 48.1 ±17.1 | 108 ±16.8 / 159 ±31.7 | 26.1 ±6.14 / 27.3 ±6.18 | 1.55 ±1.25 / 1.59 ±1.19 | 6.43 ±3.70 / 6.49 ±3.84 | 0.016 ±0.004 / 0.019 ±0.006 | 1.53 ±1.24 / 1.57 ±1.18 | 2.00 | 2 / 471 / 2 | 4 (3, 1) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 45.6 ±11.9 / 45.6 ±12.0 | 49.5 ±10.3 / 49.7 ±9.88 | 50.5 ±9.89 / 50.8 ±10.6 | 167 ±24.9 / 199 ±45.5 | 93.6 ±20.2 / 118 ±39.3 | 49.5 ±18.6 / 49.5 ±18.6 | 0.206 ±0.048 / 0.152 ±0.038 | 4.88 ±1.45 / 4.72 ±1.40 | 44.6 ±17.2 / 44.8 ±17.2 | 12.0 | 12 / 2647 / 38 | 4 (3, 0) |
| DuckDB+DuckPGQ | best = 1 | same as the 1-thread row | | | | | | | | | | | |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":1,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":1,"memory_limit":"1.8 GiB"}.

### frozen / S2 (f233ae069bdba0ce): LadybugDB S2 (PPR fused with the stored community prior; native engine mode)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (S2): LadybugDB: unbounded reach by the native recursive pattern; personalised PageRank in application code (as S1) fused with the community prior stored in the database (native Louvain at build, grouping read from the stored prior file).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LadybugDB | 1 | 105 ±44.5 / 109 ±48.2 | 117 ±51.8 / 126 ±55.0 | 148 ±62.2 / 154 ±65.6 | 231 ±59.2 / 300 ±86.3 | 26.0 ±1.29 / 27.2 ±1.32 | 82.4 ±31.6 / 80.4 ±33.2 | 20.5 ±6.76 / 21.0 ±7.91 | 0.034 ±0.012 / 0.040 ±0.016 | 82.3 ±31.6 / 80.4 ±33.1 | 4.00 | 4 / 576 / 4 | 4 (6, 2) |
| LadybugDB | best 2 | 94.9 ±31.8 / 124 ±39.7 | 112 ±43.5 / 179 ±71.4 | 140 ±56.4 / 186 ±72.6 | 247 ±95.4 / 366 ±144 | 29.4 ±7.18 / 32.0 ±6.92 | 73.7 ±27.1 / 103 ±37.5 | 23.0 ±4.72 / 23.7 ±3.25 | 0.046 ±0.012 / 0.052 ±0.008 | 73.6 ±27.2 / 103 ±37.5 | 4.00 | 4 / 576 / 4 | 4 (6, 2) |

Seeds per pass: 10 (warm, uncached, instrumented), 3 (cold). Thread read-back: LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"2"}]}.

### frozen / tq: the 20 TUNE question lookups (frozen commit)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the ranking runs (tq): SQLite: in the engine: SQL per question (statements re-prepared on every call, as the arm does); LadybugDB: in the engine: Cypher per question (prepared statements kept); DuckDB+DuckPGQ: in the engine: SQL per question (literals inlined).

| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SQLite | 1 | 0.248 ±0.006 / 0.250 ±0.007 | 0.429 ±0.032 / 0.431 ±0.032 | 0.263 ±0.055 / 0.265 ±0.056 | 6.19 ±1.36 / 6.21 ±1.37 | 4.31 ±0.538 / 4.31 ±0.555 | 0.191 ±0.017 / 0.199 ±0.011 | 0.060 ±0.012 / 0.049 ±0.006 | 0.003 ±0.000 / 0.006 ±0.000 | 0.188 ±0.017 / 0.193 ±0.011 | 3.00 | 13 / 5512 / 117 | 4 (6, 2) |
| SQLite | best 4 | 0.294 ±0.124 / 0.307 ±0.102 | 0.642 ±0.381 / 0.716 ±0.242 | 0.258 ±0.096 / 0.260 ±0.096 | 7.69 ±4.61 / 7.68 ±4.56 | 4.50 ±0.984 / 4.50 ±0.971 | 0.190 ±0.045 / 0.196 ±0.049 | 0.055 ±0.009 / 0.049 ±0.006 | 0.003 ±0.000 / 0.003 ±0.000 | 0.186 ±0.045 / 0.193 ±0.049 | 3.00 | 13 / 5512 / 117 | 4 (5, 1) |
| LadybugDB | 1 | 2.38 ±1.38 / 2.38 ±1.38 | 7.86 ±4.42 / 8.78 ±6.15 | 2.05 ±0.656 / 2.14 ±0.496 | 68.3 ±20.2 / 69.9 ±20.2 | 27.3 ±6.32 / 28.5 ±6.38 | 2.03 ±0.925 / 2.04 ±0.928 | 0.075 ±0.020 / 0.065 ±0.017 | 0.024 ±0.012 / 0.027 ±0.012 | 1.99 ±0.910 / 2.00 ±0.913 | 3.00 | 21 / 4658 / 32 | 4 (4, 1) |
| LadybugDB | best = 1 | same as the 1-thread row | | | | | | | | | | | |
| DuckDB+DuckPGQ | 1 | 9.09 ±5.44 / 9.07 ±5.42 | 40.9 ±13.1 / 40.9 ±13.0 | 9.21 ±4.01 / 9.14 ±3.91 | 223 ±66.5 / 308 ±189 | 101 ±40.2 / 182 ±156 | 9.41 ±1.81 / 9.46 ±1.67 | 0.070 ±0.027 / 0.060 ±0.020 | 0.438 ±0.177 / 0.429 ±0.172 | 8.23 ±1.55 / 8.30 ±1.42 | 1.00 | 29 / 13935 / 136 | 4 (6, 2) |
| DuckDB+DuckPGQ | best 2 | 10.1 ±3.44 / 11.6 ±4.23 | 42.1 ±13.7 / 51.6 ±6.83 | 10.4 ±4.68 / 12.6 ±4.85 | 233 ±80.8 / 418 ±229 | 105 ±40.4 / 192 ±155 | 8.87 ±3.24 / 10.2 ±4.17 | 0.055 ±0.003 / 0.049 ±0.004 | 0.447 ±0.188 / 0.461 ±0.204 | 7.96 ±3.45 / 9.17 ±3.91 | 1.00 | 29 / 13935 / 136 | 4 (6, 2) |

Seeds per pass: 20 (warm, uncached, instrumented), 3 (cold). Thread read-back: SQLite one {"pragma_threads":0,"pragma_cache_size":-65536}; SQLite best {"pragma_threads":3,"pragma_cache_size":-65536}; LadybugDB one {"threads":[{"threads":"1"}]}; LadybugDB best {"threads":[{"threads":"1"}]}; DuckDB+DuckPGQ one {"threads":1,"memory_limit":"1.8 GiB"}; DuckDB+DuckPGQ best {"threads":2,"memory_limit":"1.8 GiB"}.

## Store build (fresh process per build) and size on disk

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| engine | graph | builds | build wall / CPU (median over passes ± spread) | store bytes (MiB), median | blocks flagged |
|---|---|---|---|---|---|
| SQLite | tune | 4 | 315 ±23.8 / 321 ±23.6 | 4509696 (4.3) | 0 |
| LadybugDB | tune | 4 | 2245 ±188 / 1975 ±112 | 15450187 (14.7) | 0 |
| DuckDB+DuckPGQ | tune | 4 | 448 ±23.0 / 612 ±26.9 | 16003072 (15.3) | 0 |
| SQLite | frozen | 4 | 862 ±117 / 883 ±118 | 11243520 (10.7) | 0 |
| LadybugDB | frozen | 4 | 3393 ±1444 / 3146 ±555 | 19144878.75 (18.3) | 0 |
| DuckDB+DuckPGQ | frozen | 4 | 679 ±302 / 990 ±379 | 17051648 (16.3) | 1 |

## One-file update (bench/update.js steps; re-ingest one seed file into an existing store, local and global refresh)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| engine | graph | files per pass | update wall / CPU per file, median over files (median over passes ± spread) | p95 over files | fingerprint differences | answers differing after the updates |
|---|---|---|---|---|---|---|
| SQLite | tune | 5 | 198 ±3.71 / 191 ±3.43 | 209 ±10.9 / 200 ±6.38 | 0 | 0 |
| LadybugDB | tune | 5 | 444 ±65.3 / 618 ±73.4 | 660 ±136 / 916 ±171 | 0 | 0 |
| DuckDB+DuckPGQ | tune | 5 | 182 ±14.0 / 271 ±18.4 | 205 ±10.2 / 296 ±12.8 | 0 | 0 |
| SQLite | frozen | 5 | 305 ±35.5 / 287 ±10.2 | 497 ±9.57 / 475 ±17.7 | 0 | 0 |
| LadybugDB | frozen | 5 | 632 ±19.6 / 920 ±65.7 | 784 ±22.7 / 1166 ±87.4 | 0 | 0 |
| DuckDB+DuckPGQ | frozen | 5 | 153 ±37.4 / 224 ±42.5 | 209 ±15.5 / 308 ±9.55 | 0 | 0 |

## LadybugDB as the harness runs it (store in a child process, one IPC round trip per ranking, 1 thread)

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

| graph | class | harness wall | child rank time | IPC round trip | CPU of the child process | CPU of the calling process |
|---|---|---|---|---|---|---|
| tune | primary | 39.8 ±0.672 | 37.4 ±0.301 | 2.64 ±0.234 | 41.5 ±0.127 | 2.57 ±0.107 |
| tune | S1 | 18.6 ±0.601 | 17.0 ±0.756 | 1.49 ±0.066 | 19.5 ±0.052 | 1.67 ±0.152 |
| tune | base | 4.41 ±0.692 | 4.03 ±0.653 | 0.342 ±0.125 | 4.29 ±0.895 | 0.869 ±0.197 |
| tune | S2 | 46.9 ±1.62 | 44.3 ±2.43 | 2.51 ±0.160 | 50.4 ±2.48 | 2.50 ±0.217 |
| frozen | primary | 91.9 ±5.84 | 82.6 ±3.60 | 7.66 ±0.367 | 90.5 ±2.57 | 5.08 ±0.220 |
| frozen | S1 | 16.4 ±9.18 | 15.6 ±8.88 | 1.08 ±0.627 | 20.2 ±6.85 | 1.61 ±0.657 |
| frozen | base | 6.40 ±0.397 | 6.17 ±0.361 | 0.216 ±0.053 | 6.55 ±0.016 | 0.925 ±0.031 |
| frozen | S2 | 111 ±38.2 | 101 ±33.8 | 7.34 ±1.37 | 108 ±34.4 | 5.10 ±0.897 |

## Differences between engines

A difference **holds** when it has the same direction in wall time and in CPU time and is larger than the spread between passes of both engines in both. Everything else is inside the noise. With fewer than five passes this list is not a finding.

Labels (addendum 4 item 20): DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement). LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration). SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).
Where the rankings run: Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.

### Differences that hold

- tune/primary 1 thread warm median: SQLite lower than LadybugDB by 23.1 ms wall and 25.0 ms CPU (spreads wall 0.193 / 4.36, CPU 0.393 / 2.44; 2 of 2 passes agree in both)
- tune/primary 1 thread warm p95: SQLite lower than LadybugDB by 26.2 ms wall and 31.9 ms CPU (spreads wall 1.30 / 6.23, CPU 0.942 / 10.6; 2 of 2 passes agree in both)
- tune/primary 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 23.7 ms wall and 25.9 ms CPU (spreads wall 0.635 / 7.18, CPU 1.16 / 8.06; 2 of 2 passes agree in both)
- tune/primary 1 thread cold (open + first call): SQLite lower than LadybugDB by 75.6 ms wall and 87.4 ms CPU (spreads wall 0.022 / 8.96, CPU 0.063 / 7.48; 2 of 2 passes agree in both)
- tune/primary 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 38.1 ms wall and 38.5 ms CPU (spreads wall 0.193 / 8.48, CPU 0.393 / 9.13; 2 of 2 passes agree in both)
- tune/primary 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 45.3 ms wall and 46.8 ms CPU (spreads wall 1.30 / 2.46, CPU 0.942 / 4.25; 2 of 2 passes agree in both)
- tune/primary 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 39.5 ms wall and 40.1 ms CPU (spreads wall 0.635 / 11.8, CPU 1.16 / 11.6; 2 of 2 passes agree in both)
- tune/primary 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 148 ms wall and 165 ms CPU (spreads wall 0.022 / 12.0, CPU 0.063 / 8.58; 2 of 2 passes agree in both)
- tune/primary 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 15.0 ms wall and 13.5 ms CPU (spreads wall 4.36 / 8.48, CPU 2.44 / 9.13; 2 of 2 passes agree in both)
- tune/primary 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 19.1 ms wall and 14.9 ms CPU (spreads wall 6.23 / 2.46, CPU 10.6 / 4.25; 2 of 2 passes agree in both)
- tune/primary 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 15.8 ms wall and 14.2 ms CPU (spreads wall 7.18 / 11.8, CPU 8.06 / 11.6; 2 of 2 passes agree in both)
- tune/primary 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 72.1 ms wall and 77.7 ms CPU (spreads wall 8.96 / 12.0, CPU 7.48 / 8.58; 2 of 2 passes agree in both)
- tune/primary best threads warm median: SQLite lower than LadybugDB by 19.7 ms wall and 36.9 ms CPU (spreads wall 4.09 / 1.25, CPU 4.04 / 4.23; 2 of 2 passes agree in both)
- tune/primary best threads warm p95: SQLite lower than LadybugDB by 22.0 ms wall and 44.7 ms CPU (spreads wall 4.68 / 0.009, CPU 1.22 / 2.50; 2 of 2 passes agree in both)
- tune/primary best threads warm, application caches dropped: SQLite lower than LadybugDB by 20.9 ms wall and 38.9 ms CPU (spreads wall 2.36 / 1.34, CPU 2.61 / 4.31; 2 of 2 passes agree in both)
- tune/primary best threads cold (open + first call): SQLite lower than LadybugDB by 71.9 ms wall and 112 ms CPU (spreads wall 2.07 / 2.66, CPU 0.112 / 4.36; 2 of 2 passes agree in both)
- tune/primary best threads warm median: SQLite lower than DuckDB+DuckPGQ by 35.6 ms wall and 36.0 ms CPU (spreads wall 4.09 / 8.48, CPU 4.04 / 9.13; 2 of 2 passes agree in both)
- tune/primary best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 42.3 ms wall and 39.1 ms CPU (spreads wall 4.68 / 2.46, CPU 1.22 / 4.25; 2 of 2 passes agree in both)
- tune/primary best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 40.0 ms wall and 40.2 ms CPU (spreads wall 2.36 / 11.8, CPU 2.61 / 11.6; 2 of 2 passes agree in both)
- tune/primary best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 146 ms wall and 165 ms CPU (spreads wall 2.07 / 12.0, CPU 0.112 / 8.58; 2 of 2 passes agree in both)
- tune/primary best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 74.1 ms wall and 52.9 ms CPU (spreads wall 2.66 / 12.0, CPU 4.36 / 8.58; 2 of 2 passes agree in both)
- tune/S1 1 thread warm median: LadybugDB lower than SQLite by 85.5 ms wall and 85.2 ms CPU (spreads wall 2.68 / 1.50, CPU 2.75 / 1.86; 2 of 2 passes agree in both)
- tune/S1 1 thread warm p95: LadybugDB lower than SQLite by 87.8 ms wall and 85.6 ms CPU (spreads wall 8.41 / 1.10, CPU 8.41 / 1.81; 2 of 2 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 82.8 ms wall and 81.5 ms CPU (spreads wall 5.92 / 2.71, CPU 3.23 / 4.01; 2 of 2 passes agree in both)
- tune/S1 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 66.7 ms wall and 66.6 ms CPU (spreads wall 2.68 / 6.38, CPU 2.75 / 7.16; 2 of 2 passes agree in both)
- tune/S1 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 72.4 ms wall and 69.0 ms CPU (spreads wall 8.41 / 6.71, CPU 8.41 / 12.0; 2 of 2 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 74.1 ms wall and 73.7 ms CPU (spreads wall 5.92 / 3.87, CPU 3.23 / 4.29; 2 of 2 passes agree in both)
- tune/S1 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 36.7 ms wall and 72.1 ms CPU (spreads wall 3.55 / 10.8, CPU 4.09 / 38.3; 2 of 2 passes agree in both)
- tune/S1 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 18.8 ms wall and 18.6 ms CPU (spreads wall 1.50 / 6.38, CPU 1.86 / 7.16; 2 of 2 passes agree in both)
- tune/S1 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 15.4 ms wall and 16.6 ms CPU (spreads wall 1.10 / 6.71, CPU 1.81 / 12.0; 2 of 2 passes agree in both)
- tune/S1 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 8.76 ms wall and 7.82 ms CPU (spreads wall 2.71 / 3.87, CPU 4.01 / 4.29; 2 of 2 passes agree in both)
- tune/S1 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 50.8 ms wall and 59.4 ms CPU (spreads wall 6.24 / 10.8, CPU 2.95 / 38.3; 2 of 2 passes agree in both)
- tune/S1 best threads warm median: LadybugDB lower than SQLite by 85.5 ms wall and 85.2 ms CPU (spreads wall 2.68 / 1.50, CPU 2.75 / 1.86; 2 of 2 passes agree in both)
- tune/S1 best threads warm p95: LadybugDB lower than SQLite by 87.8 ms wall and 85.6 ms CPU (spreads wall 8.41 / 1.10, CPU 8.41 / 1.81; 2 of 2 passes agree in both)
- tune/S1 best threads warm, application caches dropped: LadybugDB lower than SQLite by 82.8 ms wall and 81.5 ms CPU (spreads wall 5.92 / 2.71, CPU 3.23 / 4.01; 2 of 2 passes agree in both)
- tune/S1 best threads warm median: DuckDB+DuckPGQ lower than SQLite by 66.7 ms wall and 66.6 ms CPU (spreads wall 2.68 / 6.38, CPU 2.75 / 7.16; 2 of 2 passes agree in both)
- tune/S1 best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 72.4 ms wall and 69.0 ms CPU (spreads wall 8.41 / 6.71, CPU 8.41 / 12.0; 2 of 2 passes agree in both)
- tune/S1 best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 74.1 ms wall and 73.7 ms CPU (spreads wall 5.92 / 3.87, CPU 3.23 / 4.29; 2 of 2 passes agree in both)
- tune/S1 best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 36.7 ms wall and 72.1 ms CPU (spreads wall 3.55 / 10.8, CPU 4.09 / 38.3; 2 of 2 passes agree in both)
- tune/S1 best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 18.8 ms wall and 18.6 ms CPU (spreads wall 1.50 / 6.38, CPU 1.86 / 7.16; 2 of 2 passes agree in both)
- tune/S1 best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 15.4 ms wall and 16.6 ms CPU (spreads wall 1.10 / 6.71, CPU 1.81 / 12.0; 2 of 2 passes agree in both)
- tune/S1 best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 8.76 ms wall and 7.82 ms CPU (spreads wall 2.71 / 3.87, CPU 4.01 / 4.29; 2 of 2 passes agree in both)
- tune/S1 best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 50.8 ms wall and 59.4 ms CPU (spreads wall 6.24 / 10.8, CPU 2.95 / 38.3; 2 of 2 passes agree in both)
- tune/base 1 thread warm median: LadybugDB lower than SQLite by 96.5 ms wall and 96.3 ms CPU (spreads wall 8.36 / 0.098, CPU 8.25 / 0.236; 2 of 2 passes agree in both)
- tune/base 1 thread warm p95: LadybugDB lower than SQLite by 106 ms wall and 105 ms CPU (spreads wall 8.95 / 0.433, CPU 9.45 / 3.40; 2 of 2 passes agree in both)
- tune/base 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 93.4 ms wall and 92.6 ms CPU (spreads wall 8.42 / 0.227, CPU 9.01 / 0.823; 2 of 2 passes agree in both)
- tune/base 1 thread cold (open + first call): LadybugDB lower than SQLite by 32.3 ms wall and 12.7 ms CPU (spreads wall 5.74 / 3.08, CPU 5.67 / 5.78; 2 of 2 passes agree in both)
- tune/base 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 72.0 ms wall and 71.9 ms CPU (spreads wall 8.36 / 3.75, CPU 8.25 / 3.58; 2 of 2 passes agree in both)
- tune/base 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 80.2 ms wall and 80.3 ms CPU (spreads wall 8.95 / 4.79, CPU 9.45 / 4.19; 2 of 2 passes agree in both)
- tune/base 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 77.3 ms wall and 76.9 ms CPU (spreads wall 8.42 / 7.60, CPU 9.01 / 7.50; 2 of 2 passes agree in both)
- tune/base 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 48.2 ms wall and 74.7 ms CPU (spreads wall 5.74 / 34.1, CPU 5.67 / 29.6; 2 of 2 passes agree in both)
- tune/base 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 24.5 ms wall and 24.4 ms CPU (spreads wall 0.098 / 3.75, CPU 0.236 / 3.58; 2 of 2 passes agree in both)
- tune/base 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 25.8 ms wall and 24.3 ms CPU (spreads wall 0.433 / 4.79, CPU 3.40 / 4.19; 2 of 2 passes agree in both)
- tune/base 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 16.0 ms wall and 15.6 ms CPU (spreads wall 0.227 / 7.60, CPU 0.823 / 7.50; 2 of 2 passes agree in both)
- tune/base 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 80.5 ms wall and 87.4 ms CPU (spreads wall 3.08 / 34.1, CPU 5.78 / 29.6; 2 of 2 passes agree in both)
- tune/base best threads warm median: LadybugDB lower than SQLite by 96.5 ms wall and 96.3 ms CPU (spreads wall 8.36 / 0.098, CPU 8.25 / 0.236; 2 of 2 passes agree in both)
- tune/base best threads warm p95: LadybugDB lower than SQLite by 106 ms wall and 105 ms CPU (spreads wall 8.95 / 0.433, CPU 9.45 / 3.40; 2 of 2 passes agree in both)
- tune/base best threads warm, application caches dropped: LadybugDB lower than SQLite by 93.4 ms wall and 92.6 ms CPU (spreads wall 8.42 / 0.227, CPU 9.01 / 0.823; 2 of 2 passes agree in both)
- tune/base best threads cold (open + first call): LadybugDB lower than SQLite by 32.3 ms wall and 12.7 ms CPU (spreads wall 5.74 / 3.08, CPU 5.67 / 5.78; 2 of 2 passes agree in both)
- tune/base best threads warm median: DuckDB+DuckPGQ lower than SQLite by 72.0 ms wall and 71.9 ms CPU (spreads wall 8.36 / 3.75, CPU 8.25 / 3.58; 2 of 2 passes agree in both)
- tune/base best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 80.2 ms wall and 80.3 ms CPU (spreads wall 8.95 / 4.79, CPU 9.45 / 4.19; 2 of 2 passes agree in both)
- tune/base best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 77.3 ms wall and 76.9 ms CPU (spreads wall 8.42 / 7.60, CPU 9.01 / 7.50; 2 of 2 passes agree in both)
- tune/base best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 48.2 ms wall and 74.7 ms CPU (spreads wall 5.74 / 34.1, CPU 5.67 / 29.6; 2 of 2 passes agree in both)
- tune/base best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 24.5 ms wall and 24.4 ms CPU (spreads wall 0.098 / 3.75, CPU 0.236 / 3.58; 2 of 2 passes agree in both)
- tune/base best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 25.8 ms wall and 24.3 ms CPU (spreads wall 0.433 / 4.79, CPU 3.40 / 4.19; 2 of 2 passes agree in both)
- tune/base best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 16.0 ms wall and 15.6 ms CPU (spreads wall 0.227 / 7.60, CPU 0.823 / 7.50; 2 of 2 passes agree in both)
- tune/base best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 80.5 ms wall and 87.4 ms CPU (spreads wall 3.08 / 34.1, CPU 5.78 / 29.6; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm median: SQLite lower than LadybugDB by 41.4 ms wall and 43.0 ms CPU (spreads wall 2.55 / 1.54, CPU 2.48 / 1.21; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm p95: SQLite lower than LadybugDB by 45.4 ms wall and 71.4 ms CPU (spreads wall 18.8 / 5.24, CPU 16.7 / 27.5; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 46.4 ms wall and 48.8 ms CPU (spreads wall 2.91 / 17.7, CPU 2.92 / 24.8; 2 of 2 passes agree in both)
- frozen/primary 1 thread cold (open + first call): SQLite lower than LadybugDB by 94.7 ms wall and 133 ms CPU (spreads wall 0.658 / 14.7, CPU 1.55 / 23.9; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 59.4 ms wall and 60.6 ms CPU (spreads wall 2.55 / 17.5, CPU 2.48 / 16.3; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 67.1 ms wall and 67.5 ms CPU (spreads wall 18.8 / 33.7, CPU 16.7 / 36.3; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 64.5 ms wall and 64.9 ms CPU (spreads wall 2.91 / 25.0, CPU 2.92 / 24.8; 2 of 2 passes agree in both)
- frozen/primary 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 187 ms wall and 303 ms CPU (spreads wall 0.658 / 74.3, CPU 1.55 / 171; 2 of 2 passes agree in both)
- frozen/primary 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 18.0 ms wall and 17.7 ms CPU (spreads wall 1.54 / 17.5, CPU 1.21 / 16.3; 2 of 2 passes agree in both)
- frozen/primary best threads warm median: SQLite lower than LadybugDB by 32.3 ms wall and 52.7 ms CPU (spreads wall 2.87 / 4.57, CPU 3.49 / 9.13; 2 of 2 passes agree in both)
- frozen/primary best threads warm p95: SQLite lower than LadybugDB by 35.1 ms wall and 78.6 ms CPU (spreads wall 2.30 / 1.69, CPU 4.88 / 22.2; 2 of 2 passes agree in both)
- frozen/primary best threads warm, application caches dropped: SQLite lower than LadybugDB by 42.7 ms wall and 65.5 ms CPU (spreads wall 2.44 / 28.5, CPU 2.10 / 39.2; 2 of 2 passes agree in both)
- frozen/primary best threads cold (open + first call): SQLite lower than LadybugDB by 78.7 ms wall and 141 ms CPU (spreads wall 20.0 / 2.82, CPU 19.2 / 3.65; 2 of 2 passes agree in both)
- frozen/primary best threads warm median: SQLite lower than DuckDB+DuckPGQ by 57.7 ms wall and 58.7 ms CPU (spreads wall 2.87 / 17.5, CPU 3.49 / 16.3; 2 of 2 passes agree in both)
- frozen/primary best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 69.5 ms wall and 69.7 ms CPU (spreads wall 2.30 / 33.7, CPU 4.88 / 36.3; 2 of 2 passes agree in both)
- frozen/primary best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 62.8 ms wall and 62.8 ms CPU (spreads wall 2.44 / 25.0, CPU 2.10 / 24.8; 2 of 2 passes agree in both)
- frozen/primary best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 178 ms wall and 294 ms CPU (spreads wall 20.0 / 74.3, CPU 19.2 / 171; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm median: LadybugDB lower than SQLite by 225 ms wall and 222 ms CPU (spreads wall 19.3 / 4.34, CPU 19.2 / 0.902; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm p95: LadybugDB lower than SQLite by 265 ms wall and 258 ms CPU (spreads wall 107 / 2.75, CPU 104 / 5.26; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 215 ms wall and 212 ms CPU (spreads wall 1.74 / 21.0, CPU 1.67 / 22.5; 2 of 2 passes agree in both)
- frozen/S1 1 thread cold (open + first call): LadybugDB lower than SQLite by 137 ms wall and 91.6 ms CPU (spreads wall 3.54 / 12.9, CPU 3.43 / 23.6; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 187 ms wall and 187 ms CPU (spreads wall 19.3 / 18.3, CPU 19.2 / 17.1; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 234 ms wall and 233 ms CPU (spreads wall 107 / 32.0, CPU 104 / 33.3; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 223 ms wall and 223 ms CPU (spreads wall 1.74 / 13.6, CPU 1.67 / 13.2; 2 of 2 passes agree in both)
- frozen/S1 1 thread cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 68.4 ms wall and 33.0 ms CPU (spreads wall 3.54 / 35.9, CPU 3.43 / 32.4; 2 of 2 passes agree in both)
- frozen/S1 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 38.3 ms wall and 34.5 ms CPU (spreads wall 4.34 / 18.3, CPU 0.902 / 17.1; 2 of 2 passes agree in both)
- frozen/S1 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 68.8 ms wall and 58.6 ms CPU (spreads wall 12.9 / 35.9, CPU 23.6 / 32.4; 2 of 2 passes agree in both)
- frozen/S1 best threads warm median: LadybugDB lower than SQLite by 225 ms wall and 222 ms CPU (spreads wall 19.3 / 4.34, CPU 19.2 / 0.902; 2 of 2 passes agree in both)
- frozen/S1 best threads warm p95: LadybugDB lower than SQLite by 265 ms wall and 258 ms CPU (spreads wall 107 / 2.75, CPU 104 / 5.26; 2 of 2 passes agree in both)
- frozen/S1 best threads warm, application caches dropped: LadybugDB lower than SQLite by 215 ms wall and 212 ms CPU (spreads wall 1.74 / 21.0, CPU 1.67 / 22.5; 2 of 2 passes agree in both)
- frozen/S1 best threads cold (open + first call): LadybugDB lower than SQLite by 137 ms wall and 91.6 ms CPU (spreads wall 3.54 / 12.9, CPU 3.43 / 23.6; 2 of 2 passes agree in both)
- frozen/S1 best threads warm median: DuckDB+DuckPGQ lower than SQLite by 187 ms wall and 187 ms CPU (spreads wall 19.3 / 18.3, CPU 19.2 / 17.1; 2 of 2 passes agree in both)
- frozen/S1 best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 234 ms wall and 233 ms CPU (spreads wall 107 / 32.0, CPU 104 / 33.3; 2 of 2 passes agree in both)
- frozen/S1 best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 223 ms wall and 223 ms CPU (spreads wall 1.74 / 13.6, CPU 1.67 / 13.2; 2 of 2 passes agree in both)
- frozen/S1 best threads cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 68.4 ms wall and 33.0 ms CPU (spreads wall 3.54 / 35.9, CPU 3.43 / 32.4; 2 of 2 passes agree in both)
- frozen/S1 best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 38.3 ms wall and 34.5 ms CPU (spreads wall 4.34 / 18.3, CPU 0.902 / 17.1; 2 of 2 passes agree in both)
- frozen/S1 best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 68.8 ms wall and 58.6 ms CPU (spreads wall 12.9 / 35.9, CPU 23.6 / 32.4; 2 of 2 passes agree in both)
- frozen/base 1 thread warm median: LadybugDB lower than SQLite by 224 ms wall and 223 ms CPU (spreads wall 23.2 / 3.09, CPU 23.1 / 3.94; 2 of 2 passes agree in both)
- frozen/base 1 thread warm p95: LadybugDB lower than SQLite by 273 ms wall and 266 ms CPU (spreads wall 99.8 / 11.0, CPU 99.8 / 23.9; 2 of 2 passes agree in both)
- frozen/base 1 thread warm, application caches dropped: LadybugDB lower than SQLite by 218 ms wall and 217 ms CPU (spreads wall 36.5 / 18.9, CPU 36.5 / 17.1; 2 of 2 passes agree in both)
- frozen/base 1 thread cold (open + first call): LadybugDB lower than SQLite by 154 ms wall and 103 ms CPU (spreads wall 6.19 / 16.8, CPU 6.33 / 31.7; 2 of 2 passes agree in both)
- frozen/base 1 thread warm median: DuckDB+DuckPGQ lower than SQLite by 186 ms wall and 186 ms CPU (spreads wall 23.2 / 11.9, CPU 23.1 / 12.0; 2 of 2 passes agree in both)
- frozen/base 1 thread warm p95: DuckDB+DuckPGQ lower than SQLite by 236 ms wall and 236 ms CPU (spreads wall 99.8 / 10.3, CPU 99.8 / 9.88; 2 of 2 passes agree in both)
- frozen/base 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 215 ms wall and 215 ms CPU (spreads wall 36.5 / 9.89, CPU 36.5 / 10.6; 2 of 2 passes agree in both)
- frozen/base 1 thread cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 94.6 ms wall and 62.4 ms CPU (spreads wall 6.19 / 24.9, CPU 6.33 / 45.5; 2 of 2 passes agree in both)
- frozen/base 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 38.0 ms wall and 37.5 ms CPU (spreads wall 3.09 / 11.9, CPU 3.94 / 12.0; 2 of 2 passes agree in both)
- frozen/base 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 36.6 ms wall and 30.3 ms CPU (spreads wall 11.0 / 10.3, CPU 23.9 / 9.88; 2 of 2 passes agree in both)
- frozen/base best threads warm median: LadybugDB lower than SQLite by 229 ms wall and 229 ms CPU (spreads wall 30.3 / 3.09, CPU 30.2 / 3.94; 2 of 2 passes agree in both)
- frozen/base best threads warm p95: LadybugDB lower than SQLite by 299 ms wall and 296 ms CPU (spreads wall 168 / 11.0, CPU 160 / 23.9; 2 of 2 passes agree in both)
- frozen/base best threads warm, application caches dropped: LadybugDB lower than SQLite by 208 ms wall and 207 ms CPU (spreads wall 31.2 / 18.9, CPU 30.9 / 17.1; 2 of 2 passes agree in both)
- frozen/base best threads cold (open + first call): LadybugDB lower than SQLite by 217 ms wall and 166 ms CPU (spreads wall 148 / 16.8, CPU 148 / 31.7; 2 of 2 passes agree in both)
- frozen/base best threads warm median: DuckDB+DuckPGQ lower than SQLite by 191 ms wall and 191 ms CPU (spreads wall 30.3 / 11.9, CPU 30.2 / 12.0; 2 of 2 passes agree in both)
- frozen/base best threads warm p95: DuckDB+DuckPGQ lower than SQLite by 262 ms wall and 266 ms CPU (spreads wall 168 / 10.3, CPU 160 / 9.88; 2 of 2 passes agree in both)
- frozen/base best threads warm, application caches dropped: DuckDB+DuckPGQ lower than SQLite by 204 ms wall and 204 ms CPU (spreads wall 31.2 / 9.89, CPU 30.9 / 10.6; 2 of 2 passes agree in both)
- frozen/base best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 38.0 ms wall and 37.5 ms CPU (spreads wall 3.09 / 11.9, CPU 3.94 / 12.0; 2 of 2 passes agree in both)
- frozen/base best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 36.6 ms wall and 30.3 ms CPU (spreads wall 11.0 / 10.3, CPU 23.9 / 9.88; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm median: SQLite lower than LadybugDB by 2.13 ms wall and 2.13 ms CPU (spreads wall 0.006 / 1.38, CPU 0.007 / 1.38; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm p95: SQLite lower than LadybugDB by 7.43 ms wall and 8.35 ms CPU (spreads wall 0.032 / 4.42, CPU 0.032 / 6.15; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm, application caches dropped: SQLite lower than LadybugDB by 1.79 ms wall and 1.87 ms CPU (spreads wall 0.055 / 0.656, CPU 0.056 / 0.496; 2 of 2 passes agree in both)
- frozen/tq 1 thread cold (open + first call): SQLite lower than LadybugDB by 62.1 ms wall and 63.7 ms CPU (spreads wall 1.36 / 20.2, CPU 1.37 / 20.2; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm median: SQLite lower than DuckDB+DuckPGQ by 8.84 ms wall and 8.82 ms CPU (spreads wall 0.006 / 5.44, CPU 0.007 / 5.42; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm p95: SQLite lower than DuckDB+DuckPGQ by 40.5 ms wall and 40.5 ms CPU (spreads wall 0.032 / 13.1, CPU 0.032 / 13.0; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 8.95 ms wall and 8.87 ms CPU (spreads wall 0.055 / 4.01, CPU 0.056 / 3.91; 2 of 2 passes agree in both)
- frozen/tq 1 thread cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 217 ms wall and 302 ms CPU (spreads wall 1.36 / 66.5, CPU 1.37 / 189; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm median: LadybugDB lower than DuckDB+DuckPGQ by 6.71 ms wall and 6.69 ms CPU (spreads wall 1.38 / 5.44, CPU 1.38 / 5.42; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 33.1 ms wall and 32.2 ms CPU (spreads wall 4.42 / 13.1, CPU 6.15 / 13.0; 2 of 2 passes agree in both)
- frozen/tq 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 7.16 ms wall and 7.00 ms CPU (spreads wall 0.656 / 4.01, CPU 0.496 / 3.91; 2 of 2 passes agree in both)
- frozen/tq 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 155 ms wall and 238 ms CPU (spreads wall 20.2 / 66.5, CPU 20.2 / 189; 2 of 2 passes agree in both)
- frozen/tq best threads warm median: SQLite lower than LadybugDB by 2.08 ms wall and 2.07 ms CPU (spreads wall 0.124 / 1.38, CPU 0.102 / 1.38; 2 of 2 passes agree in both)
- frozen/tq best threads warm p95: SQLite lower than LadybugDB by 7.21 ms wall and 8.07 ms CPU (spreads wall 0.381 / 4.42, CPU 0.242 / 6.15; 2 of 2 passes agree in both)
- frozen/tq best threads warm, application caches dropped: SQLite lower than LadybugDB by 1.80 ms wall and 1.88 ms CPU (spreads wall 0.096 / 0.656, CPU 0.096 / 0.496; 2 of 2 passes agree in both)
- frozen/tq best threads cold (open + first call): SQLite lower than LadybugDB by 60.6 ms wall and 62.2 ms CPU (spreads wall 4.61 / 20.2, CPU 4.56 / 20.2; 2 of 2 passes agree in both)
- frozen/tq best threads warm median: SQLite lower than DuckDB+DuckPGQ by 9.81 ms wall and 11.2 ms CPU (spreads wall 0.124 / 3.44, CPU 0.102 / 4.23; 2 of 2 passes agree in both)
- frozen/tq best threads warm p95: SQLite lower than DuckDB+DuckPGQ by 41.5 ms wall and 50.8 ms CPU (spreads wall 0.381 / 13.7, CPU 0.242 / 6.83; 2 of 2 passes agree in both)
- frozen/tq best threads warm, application caches dropped: SQLite lower than DuckDB+DuckPGQ by 10.2 ms wall and 12.4 ms CPU (spreads wall 0.096 / 4.68, CPU 0.096 / 4.85; 2 of 2 passes agree in both)
- frozen/tq best threads cold (open + first call): SQLite lower than DuckDB+DuckPGQ by 225 ms wall and 410 ms CPU (spreads wall 4.61 / 80.8, CPU 4.56 / 229; 2 of 2 passes agree in both)
- frozen/tq best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 7.73 ms wall and 9.17 ms CPU (spreads wall 1.38 / 3.44, CPU 1.38 / 4.23; 2 of 2 passes agree in both)
- frozen/tq best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 34.2 ms wall and 42.8 ms CPU (spreads wall 4.42 / 13.7, CPU 6.15 / 6.83; 2 of 2 passes agree in both)
- frozen/tq best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 8.37 ms wall and 10.5 ms CPU (spreads wall 0.656 / 4.68, CPU 0.496 / 4.85; 2 of 2 passes agree in both)
- frozen/tq best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 165 ms wall and 348 ms CPU (spreads wall 20.2 / 80.8, CPU 20.2 / 229; 2 of 2 passes agree in both)
- tune store build: SQLite lower than LadybugDB by 1930 ms wall and 1655 ms CPU (spreads wall 23.8 / 188, CPU 23.6 / 112; 2 of 2 passes agree in both)
- tune store build: SQLite lower than DuckDB+DuckPGQ by 133 ms wall and 291 ms CPU (spreads wall 23.8 / 23.0, CPU 23.6 / 26.9; 2 of 2 passes agree in both)
- tune store build: DuckDB+DuckPGQ lower than LadybugDB by 1797 ms wall and 1363 ms CPU (spreads wall 188 / 23.0, CPU 112 / 26.9; 2 of 2 passes agree in both)
- frozen store build: SQLite lower than LadybugDB by 2531 ms wall and 2262 ms CPU (spreads wall 117 / 1444, CPU 118 / 555; 2 of 2 passes agree in both)
- frozen store build: DuckDB+DuckPGQ lower than LadybugDB by 2714 ms wall and 2156 ms CPU (spreads wall 1444 / 302, CPU 555 / 379; 2 of 2 passes agree in both)
- tune one-file update: SQLite lower than LadybugDB by 246 ms wall and 426 ms CPU (spreads wall 3.71 / 65.3, CPU 3.43 / 73.4; 2 of 2 passes agree in both)
- tune one-file update: DuckDB+DuckPGQ lower than LadybugDB by 262 ms wall and 347 ms CPU (spreads wall 65.3 / 14.0, CPU 73.4 / 18.4; 2 of 2 passes agree in both)
- frozen one-file update: SQLite lower than LadybugDB by 327 ms wall and 634 ms CPU (spreads wall 35.5 / 19.6, CPU 10.2 / 65.7; 2 of 2 passes agree in both)
- frozen one-file update: DuckDB+DuckPGQ lower than SQLite by 152 ms wall and 62.3 ms CPU (spreads wall 35.5 / 37.4, CPU 10.2 / 42.5; 2 of 2 passes agree in both)
- frozen one-file update: DuckDB+DuckPGQ lower than LadybugDB by 479 ms wall and 696 ms CPU (spreads wall 19.6 / 37.4, CPU 65.7 / 42.5; 2 of 2 passes agree in both)

### Differences inside the noise

- tune/primary best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 15.9 ms wall and -0.912 ms CPU (spreads wall 1.25 / 8.48, CPU 4.23 / 9.13; 1 of 2 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- tune/primary best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 20.3 ms wall and -5.61 ms CPU (spreads wall 0.009 / 2.46, CPU 2.50 / 4.25; 0 of 2 passes agree in both) [wall and CPU disagree in direction]
- tune/primary best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 19.1 ms wall and 1.26 ms CPU (spreads wall 1.34 / 11.8, CPU 4.31 / 11.6; 1 of 2 passes agree in both) [not larger than the spread]
- tune/S1 1 thread cold (open + first call): LadybugDB lower than SQLite by 14.2 ms wall and -12.7 ms CPU (spreads wall 3.55 / 6.24, CPU 4.09 / 2.95; 0 of 2 passes agree in both) [wall and CPU disagree in direction]
- tune/S1 best threads cold (open + first call): LadybugDB lower than SQLite by 14.2 ms wall and -12.7 ms CPU (spreads wall 3.55 / 6.24, CPU 4.09 / 2.95; 0 of 2 passes agree in both) [wall and CPU disagree in direction]
- frozen/primary 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 21.8 ms wall and -3.84 ms CPU (spreads wall 5.24 / 33.7, CPU 27.5 / 36.3; 1 of 2 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 18.0 ms wall and 16.1 ms CPU (spreads wall 17.7 / 25.0, CPU 24.8 / 24.8; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/primary 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 92.4 ms wall and 170 ms CPU (spreads wall 14.7 / 74.3, CPU 23.9 / 171; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/primary best threads warm median: LadybugDB lower than DuckDB+DuckPGQ by 25.4 ms wall and 6.04 ms CPU (spreads wall 4.57 / 17.5, CPU 9.13 / 16.3; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/primary best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 34.5 ms wall and -8.88 ms CPU (spreads wall 1.69 / 33.7, CPU 22.2 / 36.3; 1 of 2 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 20.2 ms wall and -2.77 ms CPU (spreads wall 28.5 / 25.0, CPU 39.2 / 24.8; 1 of 2 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- frozen/primary best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 99.2 ms wall and 153 ms CPU (spreads wall 2.82 / 74.3, CPU 3.65 / 171; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/S1 1 thread warm p95: LadybugDB lower than DuckDB+DuckPGQ by 30.7 ms wall and 24.5 ms CPU (spreads wall 2.75 / 32.0, CPU 5.26 / 33.3; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/S1 1 thread warm, application caches dropped: DuckDB+DuckPGQ lower than LadybugDB by 7.94 ms wall and 10.2 ms CPU (spreads wall 21.0 / 13.6, CPU 22.5 / 13.2; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/S1 best threads warm p95: LadybugDB lower than DuckDB+DuckPGQ by 30.7 ms wall and 24.5 ms CPU (spreads wall 2.75 / 32.0, CPU 5.26 / 33.3; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/S1 best threads warm, application caches dropped: DuckDB+DuckPGQ lower than LadybugDB by 7.94 ms wall and 10.2 ms CPU (spreads wall 21.0 / 13.6, CPU 22.5 / 13.2; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/base 1 thread warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 3.37 ms wall and 2.75 ms CPU (spreads wall 18.9 / 9.89, CPU 17.1 / 10.6; 1 of 2 passes agree in both) [not larger than the spread]
- frozen/base 1 thread cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 58.9 ms wall and 40.5 ms CPU (spreads wall 16.8 / 24.9, CPU 31.7 / 45.5; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/base best threads cold (open + first call): DuckDB+DuckPGQ lower than SQLite by 158 ms wall and 126 ms CPU (spreads wall 148 / 24.9, CPU 148 / 45.5; 2 of 2 passes agree in both) [not larger than the spread]
- frozen/base best threads warm, application caches dropped: LadybugDB lower than DuckDB+DuckPGQ by 3.37 ms wall and 2.75 ms CPU (spreads wall 18.9 / 9.89, CPU 17.1 / 10.6; 1 of 2 passes agree in both) [not larger than the spread]
- frozen/base best threads cold (open + first call): LadybugDB lower than DuckDB+DuckPGQ by 58.9 ms wall and 40.5 ms CPU (spreads wall 16.8 / 24.9, CPU 31.7 / 45.5; 2 of 2 passes agree in both) [not larger than the spread]
- frozen store build: DuckDB+DuckPGQ lower than SQLite by 183 ms wall and -107 ms CPU (spreads wall 117 / 302, CPU 118 / 379; 1 of 2 passes agree in both) [wall and CPU disagree in direction] [not larger than the spread]
- tune one-file update: DuckDB+DuckPGQ lower than SQLite by 16.1 ms wall and -80.0 ms CPU (spreads wall 3.71 / 14.0, CPU 3.43 / 18.4; 0 of 2 passes agree in both) [wall and CPU disagree in direction]

## Equivalence of the timed answers (bench/icheck.js)

- SQLite against the reference arm: tune/primary@T1 20/20; tune/primary@T6 20/20; tune/S1@T1 20/20; tune/base@T1 20/20; frozen/primary@T4 20/20; frozen/primary@T1 20/20; frozen/S1@T1 20/20; frozen/base@T1 20/20; frozen/base@T2 20/20 (answers equal at 1e-9 / answers compared, all passes).
- LadybugDB against the reference arm: tune/primary@T1 20/20; tune/primary@T4 20/20; tune/S1@T1 20/20; tune/base@T1 20/20; frozen/primary@T2 20/20; frozen/primary@T1 20/20; frozen/S1@T1 20/20; frozen/base@T1 20/20 (answers equal at 1e-9 / answers compared, all passes).
- DuckDB+DuckPGQ against the reference arm: tune/primary@T1 20/20; tune/S1@T1 20/20; tune/base@T1 20/20; frozen/primary@T1 20/20; frozen/S1@T1 20/20; frozen/base@T1 20/20 (answers equal at 1e-9 / answers compared, all passes).
- Cold against warm: 186 of 186 equal.
- TQ: 200 answers to 20 questions from SQLite, LadybugDB, DuckDB+DuckPGQ; 0 differ.
- LadybugDB S2 on tune: 20 answers over passes and thread settings; 0 differ.
- LadybugDB S2 on frozen: 40 answers over passes and thread settings; 0 differ.
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

