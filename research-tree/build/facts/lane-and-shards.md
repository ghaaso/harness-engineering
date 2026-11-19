# Lane width and selftest shards (2026-11-19)

Run by a Sonnet helper, direct `node --test` (not the lane), nothing committed. Logs, scripts and processor/memory CSVs: `lane-measure/`.
Before each run 2 `node.exe` were present that were not mine (the app, not test runs); no other `node --test` ran. One run (A, k=4) started with 4 node.exe listed (not `node --test`).

## A. Four at once (k = 4)
Only 2 files take 40-90 s alone (status, watch). Used those plus the next two (lib, fsck, 34-36 s): deviation from the brief. t1 = one solo pass of all 26 files in a row (`alone.txt`); t4 = the 4 at once (`k4.txt`, `k4-perf.csv`).

| file | t1 s | t4 s | t4/t1 | result at k=4 |
|---|---|---|---|---|
| status | 41.6 | 45.0 | 1.08 | 1 fail (T1 "byte-identical status.json"), 29 pass; passes alone twice (30 pass, rerun after) |
| watch | 50.9 | 53.9 | 1.06 | pass |
| lib | 36.4 | 39.7 | 1.09 | pass |
| fsck | 34.2 | 39.4 | 1.15 | pass |

mean t1 40.8 s, mean t4 44.5 s, c_eff(4) = 4 x 40.8 / 44.5 = **3.67** (92 % of linear). Whole-PC processor at k=4: mean 25.9 %, peak 48.6 % (28 samples, 2 s); minimum available memory 13,088 MB. The status failure: cause not established (a determinism test that reads live inputs; other sessions were editing the repo, or a load race). Not rerun at k=4.

## B. Split selftest.test.mjs (31 top-level tests, 29 run + 2 `needs-app` skipped; 221 s alone)
Per-test times from the solo run, 4 shards balanced greedily (about 55 s each), each by `--test-name-pattern="^<name prefix>"` (list in `lane-measure/shards.cmds`; made by `mkshards.mjs`). All 4 at once:

| shard | tests | pass/fail/skip | wall s |
|---|---|---|---|
| 1 | 7 | 5/0/2 | 70.2 |
| 2 | 8 | 8/0/0 | 68.7 |
| 3 | 8 | 8/0/0 | 68.2 |
| 4 | 8 | 8/0/0 | 67.0 |

31 of 31 tests covered once; no shared-state failure (the tests use unique tmp folders). The file drops from 221 s to 70 s (3.2x). Processor mean 31.0 %, peak 45.1 %; min free memory 12,992 MB.

## C. Full suite: 25 other files (`--test-concurrency=8`, one process) beside the 4 selftest shards at once
Wall **120.4 s**, all pass: others 987 tests, 936 pass, 0 fail, 51 skipped (120.3 s); shards 7+8+8+8 tests, 0 fail (98-100 s). Processor mean 59.1 %, peak 93.4 %; min free memory 11,845 MB. Compare: sbs8 264 s (with selftest unsplit), sequential 596 s.

## Not measured
k=4 repeated (one pass each; the status failure unexplained); k above 4 or 5 to 8 shards; files of 60-90 s (none exist); the lane's overhead; effect on program starts / app stalls (CLAUDE.md block risk) of 12 concurrent processes; repeat runs for variance; solo times taken in one pass with other sessions' load unknown.
