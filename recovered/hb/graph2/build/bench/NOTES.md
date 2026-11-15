# bench/ — engine benches of protocol addendum 4, section E (H5)

Written 2026-11-13 by the bench-writing lane. These scripts time the three typed stores (SQLite for
the relational arm, LadybugDB, DuckDB with DuckPGQ) on TUNE inputs only. They live outside the arm
folders (addendum 4 item 16), import the arms' own code unchanged and never edit it, so the frozen
code hashes are not touched. **Numbers produced so far are smoke numbers and are to be discarded**;
the real measurement is a later, single run on a quiet machine (section "How to run" below).

**Pre-flight fix round 2 (2026-11-13).** One label added to `LABELS` in `lib.js` (it appears in every
engine JSON and in `summary.md`): where the frozen primary's ranking runs. LadybugDB fetches arcs and
out-degrees by Cypher and spreads the degree-normalised activation in application code (JavaScript),
so for LadybugDB that ranking is "not in the engine" (addendum 2 item 20); SQLite and DuckPGQ spread it
in SQL, one statement per BFS level, with the level loop in application code, and SQLite's unbounded
walk is likewise a level loop in application code. No bench was run in this round. The question code of
the arms changed (`arms/ladybug/tq.js`, `arms/common/tqtarget.js`), but none of the 20 TUNE question
answers did, so the bench's TQ answer hashes are unaffected.

## Interleaved bench for a busy machine (addendum 5 section C) — USE THIS ONE

Written 2026-11-13 by the bench-rewrite lane. The sequential bench below (`run_all.sh`, one engine per
container, needs a quiet machine) is kept but superseded: this PC is never quiet. The interleaved driver
measures the same things on the same plan (`plan.json`, `plan_hash` d185eb59a0999064: same seeds, query
classes, labels, answer checks) and tolerates load. No held-out task or question is read or run.

**One command** (host, Git Bash): `bash bench/run_interleaved.sh [RUN]` -> `results/bench/RUN/`
(default RUN = `interleaved`). Re-run the same command with the same settings to resume after an
interruption. `bash bench/run_interleaved.sh RUN summary` only redoes the check and the summary.

| file | role |
|---|---|
| `run_interleaved.sh` | Host script: starts the host sampler, then ONE container (`gt-ibench-RUN`; graphtest:1, CPU set 12,14,16,18,20,22, `--cpus 6`, `--memory 6g`, tmpfs over `/build/sealed` and `/build/audit`, repo read-only, stores on the container filesystem `/benchstore`, priors and source store copied into the container) that runs `prep.js` (if `plan.json` is missing), `interleaved.js`, `icheck.js`, `isummary.js`; records the clock offset host - container every 5 min (`clock.jsonl`); stops the sampler at the end. Refuses to start while `gt-ibench-RUN` still runs. |
| `hostload_live.ps1` | Host CPU timeline, one JSON line per second (`host_load.jsonl`): `total_cpus` (Processor(_Total) x 24 / 100), `vm_cpus` (vmmem*, vmwp*), `other_cpus` = total - vm, every 30 s the five busiest host processes. One continuous counter query (cheap); stops on the stop file, or when the run's heartbeat is 30 min old. |
| `interleaved.js` | The driver (in the container). |
| `iworker.js` | Worker process: persistent (warm blocks, calibration, update) or one-shot (build, cold, LadybugDB harness IPC). |
| `icheck.js` | Equivalence of every timed answer: against the reference arm (primary, S1, base), cold against warm, TQ across engines, S2 across thread settings and passes, update fingerprints and answers. |
| `isummary.js` | `summary.md` and `summary.json`. |
| `relational.js`, `ladybug.js`, `duckpgq.js` | Unchanged adapters plus one method `setThreads(T)` (PRAGMA threads / CALL threads / SET threads). |

**Why one container for all three engines.** Alternation in short blocks needs warm processes that stay
open between blocks; a block of one engine and the next block of another engine follow each other within
milliseconds. In one container all workers share the same CPU set, memory limit and cgroup, and idle
workers wait on their IPC channel and use no CPU, so only the engine whose block runs does work. One
container per engine would add a control channel between containers and different cgroups for no gain.
6 GB is enough: three warm workers use about 0.3 to 0.5 GB each.

**What one run does.**
1. Thread calibration, once (`calibration.json`): per graph, stores built, one warm worker per engine,
   per class every thread candidate (1, 2, 4, 6) on the 20 calibration seeds (TQ: the 20 questions) x 3
   repetitions, in alternating blocks; best = fewest threads within 3 % of the lowest median wall time.
2. Passes (`BENCH_PASSES`, default 5). A unit = (pass, graph); graph order alternates per pass; class
   order rotates per pass. Per unit, in order:
   - **build**: each engine's store built in a fresh process, `BENCH_BUILDS_PER_PASS` times (default
     ceil(3 / passes), so at least three builds in all); wall and CPU of the build, store bytes.
   - **warm**: one persistent worker per engine, opened at 1 thread. Rounds = (class, chunk of
     `BENCH_CHUNK` = 20 seeds); inside a round the engines run one after another in an order that cycles
     through all six permutations; each engine runs a block at 1 thread and, if different, a block at
     its best setting (thread setting switched at run time and read back). The first block of a class in
     a worker is preceded by an untimed pass over all seeds of that class; every block starts with one
     untimed call (the previous block's "uncached" pass dropped the configuration-keyed caches). Inside a
     block, per seed: one warm call (`BENCH_REPS` = 1 per pass; the passes are the repetition), one call
     with application caches dropped, one instrumented call (time and CPU inside the engine client calls,
     statements, statement texts), then 50 no-op statements for the round-trip estimate.
   - **ipc**: LadybugDB as the harness runs it (store in the arm's child process), per rank class, with
     the child's CPU from `/proc/<pid>/task/*/schedstat`.
   - **cold**: a fresh process per sample (open + first call), `BENCH_COLD_N` = 20 seeds per class and
     thread setting, in alternating blocks of `BENCH_COLD_CHUNK` = 5.
   - **update**: one update worker per engine, `BENCH_UPDATE_N` = 50 seed files per graph re-ingested
     (the steps of `update.js`), alternating blocks of 10 files; then fingerprints before/after and the
     answers of the first 10 seeds and the 20 questions after the updates against this pass's warm
     1-thread answers.
3. Every measure is taken in wall time and in CPU time of the process that does the work
   (`process.cpuUsage`, every thread of the process; LadybugDB's harness form: its child process).
4. Load per block: the driver samples the VM every second (`/proc/stat` busy and steal, minus this
   container's cgroup `cpu.stat`) and reads the host timeline; the block's load is the time-weighted mean
   over its window (host clock shifted by the measured offset). Other work = host processes outside the
   VM + VM work outside this container. Above half of the host's 24 logical CPUs the block is repeated,
   up to 3 times, then the last attempt is kept and flagged. Every attempt is a line of `blocks.jsonl`.
5. Restart: `units/p<k>-<graph>.json` is written when a unit is complete; a restart skips complete units,
   redoes an incomplete one from its start and reuses `calibration.json`. `run_config.json` pins the
   settings; a restart with other settings is refused.

**Summary rule** (`isummary.js`). Per engine, graph, class and thread setting each pass gives one value
per measure (median over seeds, 95th percentile, and so on); tables show the median over passes and the
spread between passes (largest minus smallest), in wall and CPU. A difference between two engines
**holds** only if it has the same direction in wall and CPU and is larger than both engines' spreads in
both (and there are at least 2 passes); everything else is listed as inside the noise. Item-20 labels and
the "where the ranking runs" label are printed with every table.

**Proof run (2026-11-13; numbers discarded).** `BENCH_SEEDS=10 BENCH_PASSES=2 BENCH_CALIB=10
BENCH_COLD_N=3 BENCH_UPDATE_N=5 bash bench/run_interleaved.sh proof` -> `results/bench/proof/`. Stopped
on purpose (`docker stop`) during unit p2-frozen after pass 1 was complete (log `tmp/bench/proof1.out`,
exit 137), then the same command resumed it (`tmp/bench/proof2.out`, exit 0): calibration reused, p1-tune
and p1-frozen skipped, p2-frozen redone, p2-tune run. A resume with `BENCH_SEEDS=11` was refused. Check:
0 problems (all answers equal to the reference arm at 1e-9, cold equal to warm, TQ equal across
engines, S2 equal across passes and threads, 0 fingerprint differences and 0 answers differing after the
updates). Load: units p1-tune, p1-frozen, p2-tune had no repeat; p2-frozen ran while other host work held
the CPUs and had 78 repeats, 16 blocks kept flagged (290 s against 105 s for p1-frozen). An earlier debug
run (4 seeds, 1 pass) ran its calibration while two host Python processes used about 22 of 24 CPUs: every
block was repeated 3 times and kept flagged, as designed (its output folder was deleted afterwards).

**Expected duration of the full run** (defaults: 200 seeds, 5 passes, 20 cold, 50 update files),
scaled from the proof: about 28 min per pass on a quiet host (frozen unit about 20 min, tune about 8 min),
calibration about 6 min, prep about 1 min: about 2.5 hours. Each flagged block runs up to 4 times, and
work under load is slower, so with the host busy most of the time expect 6 to 10 hours. A restart loses
at most the unit in progress (at most about 20 min of quiet work).

**Not comparable across engines (in addition to the list at the end of this file).** Thread knobs are
switched at run time in the warm workers (DuckDB `SET threads`, instance-wide, read back each block) but
set at open in cold processes. The thread calibration is taken once and under whatever load there is;
its 3 % rule can pick a noise winner (the debug run picked 6 threads for SQLite TQ at 0.377 against
0.400 ms). A short block (LadybugDB base, TQ) is judged by the one host sample that contains it, a long
one (SQLite S1) by the mean over several. CPU time excludes waiting for a CPU but not slower execution
on a contended core.

## Files

| file | role |
|---|---|
| `run_all.sh` | Host script (Git Bash). Refuses to start when any container other than the three unrelated `postiz*` ones runs (override `BENCH_ALLOW_BUSY=1`, recorded). Runs, each in its own container on the pinned CPU set: plan, relational, ladybug, duckpgq (one after another, never two at once), check, summary. Records `docker stats --no-stream` of postiz, postiz-postgres and postiz-redis plus the list of running containers before and after each engine (`host_stats.jsonl`) and the Docker host facts (`host_env.json`). Every container hides `sealed/` and `audit/` behind empty tmpfs mounts and mounts the repo read-only. |
| `prep.js` | Writes `plan.json` (deterministic): the two graphs, the seeds, the configurations found by hash in the arms' own lists, the query classes, the 20 TUNE questions. |
| `lib.js` | The shared driver: orchestrator, child processes, statistics, instrumentation, answer hashes, query-text measure, the item-20 labels. |
| `relational.js`, `ladybug.js`, `duckpgq.js` | One adapter per engine: how the arm's store is built and opened, the thread knob, the instrumentation wrapper, the caches it names, and what is not comparable. Run as `node bench/<engine>.js run`. |
| `check.js` | Equivalence of the timed answers: the reference arm (addendum 4 item 5, "equivalence check only") ranks the same seeds with primary, S1 and base; every engine's answers are compared by hash. TQ answers compared across engines; LadybugDB S2 across thread settings and cold/warm. |
| `summary.js` | Writes `summary.md` from the JSON files (since pre-flight round 1 also the one-file update table). |
| `update.js` | The one-file update measure (added in pre-flight fix round 1, section "One-file update" below). Run as `node bench/update.js <engine>`; `run_all.sh` runs it after each engine's query bench, in its own container. Writes `update_<engine>.json`. |

Outputs (in `results/bench/` for the real run, `results/bench/smoke/` for the smoke run):
`relational.json`, `ladybug.json`, `duckpgq.json` (one per engine), `plan.json`, `check.json`,
`host_env.json`, `host_stats.jsonl`, `summary.md`. While an engine runs, `<engine>.partial.json` is
rewritten after every class (deleted at the end), so a crash keeps what was measured.

## What is measured (addendum 4 items 17 to 20, task items a to g)

- **Graphs (b).** `tune` = the TUNE parent with the most canonical edges: 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4,
  2,450 nodes and 7,077 edges (of the 53 TUNE parents). `frozen` = a31924a3818f4ac94b695906d107c72c912792b2,
  5,464 nodes, 16,462 edges, 514 file nodes.
- **Seeds (b).** tune: distinct TUNE T1 task seeds (path plus symbol), shuffled with mulberry32 seed
  20261113, mapped onto the tune graph with the shared `seed.js mapSeed`; the first 200 mappable are
  measured, the next 20 are the thread-calibration seeds (disjoint). 2 drawn seeds were skipped because
  their file is not in that graph; 9 of the 200 come from tasks whose parent is that graph (the rest are
  files of other June parents that also exist there). frozen: 200 + 20 file nodes drawn with mulberry32
  seed 20261114; the seed is the file node alone. No task, held-out or not, is involved on the frozen graph.
- **Classes (c), found by hash in the arm lists:** primary `95e990307da3b42b` (unbounded k-hop, both
  directions, degree-normalised; relational/ladybug/duckpgq stage 2), S1 `6b70cc1222745385` (4 hops,
  PageRank r0.30; stage 1 `hops=4`), the 2-hop base `8067b9cf65e59b2f` (stage-1 `base`, PageRank r0.30),
  LadybugDB S2 `f233ae069bdba0ce` (unbounded, hybrid PPR + stored community prior; ladybug only), and
  the 20 TUNE question lookups (TQ, frozen graph only). The search (`e70177e5807f0252`, `950c029615d337c1`)
  and floor (`714a474060653c1f`, `c4d2f0a60a3d199c`) configurations are located and recorded in
  `plan.json` but not timed: they are not engines. Rank classes run on both graphs.
- **Per engine, class and thread setting (d):**
  - warm: one untimed warm-up pass over all seeds, then 3 timed passes; per seed the median of its 3;
    median and 95th percentile (nearest rank) over the 200 seeds.
  - warm_uncached (e): process and connection warm, every cache held or keyed by application code
    dropped before each call (one sample per seed).
  - cold: a fresh process and a fresh connection per sample (`child cold`), cold = open + first call;
    client-library load, the facts load (LadybugDB's LbGraph needs the canonical graph in memory) and
    process start are reported separately and not counted. One sample per seed (BENCH_COLD_N, default
    all 200).
  - breakdown: one instrumented call per seed: `engine_api` = time inside the engine client calls
    (statement execution plus fetching rows into JavaScript; SQLite prepare too), `app_code` = the rest,
    `statements` per ranking, `roundtrip_estimate` = statements x the median time of a no-op statement
    (`SELECT 1` / `RETURN 1`) through the same client path (500 samples).
  - query_text: the distinct statement texts the engine received for the class (numbers and number
    lists normalised to `?`): count, characters, lines.
  - also: thread read-back from the engine, result size, process memory (RSS), answer hashes.
- **Threads (d).** Candidates 1, 2, 4 and the container's CPU count (6). Per graph and class the warm
  median on the 20 calibration seeds (3 passes) is taken for each; best = the fewest threads within 3 %
  of the lowest. Measured at 1 thread and at the best (once when best = 1). TQ is calibrated on the 20
  questions themselves (there are no others). Knobs: SQLite `PRAGMA threads = T - 1` (auxiliary sorter
  threads only); LadybugDB `CALL threads=T` on the connection; DuckDB instance setting `threads=T`.
- **Store (d).** Built 3 times per graph, each in a fresh child, timed around the arm's own builder
  (`db.js buildDb`, `store.js build`, `store.js buildStore`) from the loaded canonical graph; bytes on
  disk of the last build (every file of the store). Stores live in `/benchstore` on the container
  filesystem, never on the `/build` bind mount, and vanish with the container.
- **LadybugDB as the harness runs it.** `harness_ipc`: the arm's default child-process form
  (`arms/ladybug/arm.js`), 1 thread; per ranking the parent's wall, the child's own time and the
  difference (the IPC round trip).
- **Labels (f).** The three sentences of addendum 4 item 20 are in every engine JSON (`labels`), printed
  on stderr at the start of each engine and at the top of `summary.md`.

## Caches in application code (e)

| engine | cache | where | classes | dropped in warm_uncached |
|---|---|---|---|---|
| SQLite | PageRank transition tables trcN/trucN | engine TEMP tables, created and keyed by `RelGraph.cache` | S1, base | yes |
| SQLite | prepared statements `RelGraph.stmts` | application handles | all | no (empty only when cold) |
| LadybugDB | PageRank transition CSR (`tr\|...`) | JavaScript arrays in `LbGraph.cache` | S1, base, S2 | yes |
| LadybugDB | prepared statements `LbGraph.ps` (at most 48) | application handles, pinning buffer-pool pages | all | no (dropping them pins more pages per re-prepare) |
| DuckDB | PageRank transition tables trN | engine TEMP tables keyed by `PgqGraph.cache` | S1, base | yes |
| DuckDB | rowid map, kinds, meta | `PgqGraph` fields, read at open | all | no (part of open) |
| all | hub sets / blocked sets | as above | none timed (no timed class cuts hubs) | yes |

## How to run (the measurement lane)

```
# quiet machine: no other container of this test may run (run_all.sh refuses otherwise)
bash bench/run_all.sh                       # 200 seeds, cold over all 200, writes results/bench/
CPUSET=12,14,16,18,20,22 bash bench/run_all.sh   # the default CPU set, shown explicitly
BENCH_COLD_N=50 bash bench/run_all.sh       # fewer cold samples if time is short (state it)
BENCH_SEEDS=10 BENCH_OUT_REL=results/bench/smoke BENCH_ALLOW_BUSY=1 bash bench/run_all.sh   # smoke
```

CPU set: `docker info` reports 24 CPUs (AMD Ryzen 9 7900X, 12 cores, 2 hardware threads each, inside
the Docker Desktop WSL2 VM). Inside the image, CPUs 2k and 2k+1 are hardware-thread siblings
(`thread_siblings_list`). The default set 12,14,16,18,20,22 takes one hardware thread on each of six
physical cores (cores 6 to 11, the second core complex), away from CPU 0 and with no two threads on one
core. Hyper-V can still move virtual CPUs between physical cores; that is outside the container's
control.

## Smoke run (proof that the scripts run end to end; numbers discarded)

Run on 2026-11-13 with `BENCH_SEEDS=10 BENCH_CALIB=10 BENCH_COLD_N=10 BENCH_OUT_REL=results/bench/smoke
BENCH_ALLOW_BUSY=1 bash bench/run_all.sh` (3 timed repetitions per seed, 3 store builds per graph, 500
no-op samples). Outputs are in `results/bench/smoke/`, the log in `tmp/bench/smoke.log`. Exit code 0.

- **Not quiet.** Two containers of another lane (`gt-lock-reg`, `gt-lock-dry`) were running, so the guard
  was overridden; `summary.md` says so. Load average inside the container at the start of each engine
  was about 1 to 2.8. The three unrelated containers used 0 to 0.4 % CPU (one reading of 2.68 % for
  postiz-postgres). These numbers are for proof only and are discarded.
- **Wall time.** relational 4 min, ladybug 3 min, duckpgq 2 min 13 s; about 10 min with plan, check and
  summary.
- **Equivalence (`check.json`).** 0 problems. Every engine at every thread setting matched the reference
  arm on 10 of 10 seeds for primary, S1 and base (order, scores at 1e-9 and exact scores); TQ answers
  equal across the three engines; LadybugDB S2 equal across thread settings and cold against warm.
- **Nothing written outside the bench folders**: the LadybugDB priors folder still holds 54 files, the
  source store 56 trees, and the repository status was unchanged.
- **Discarded smoke figures (to show the output has the expected shape).** Store build median: tune
  graph 385 ms (SQLite), 2,282 ms (LadybugDB), 418 ms (DuckDB); frozen graph 963 ms, 2,556 ms, 586 ms.
  Store size: tune 4.3 MiB, 14.7 MiB, 15.3 MiB; frozen 10.7 MiB, 18.3 MiB, 16.3 MiB. Frozen graph warm
  median at 1 thread (SQLite / LadybugDB / DuckDB): primary 36.2 / 77.9 / 110 ms; S1 243 / 13.6 / 56.9 ms;
  base 236 / 7.35 / 51.2 ms; TQ 0.31 / 2.16 / 14.2 ms per question; LadybugDB S2 85.7 ms. Statements per
  ranking: SQLite about 50 (primary), about 272 (S1, base), 3 (TQ); LadybugDB 2, 2, 4; DuckDB 22 to 24,
  12, 1.5. No-op statement: about 0.001 ms (SQLite), 0.007 ms (LadybugDB), 0.35 ms (DuckDB). LadybugDB
  frozen base with its CSR cache dropped: 42.4 ms against 7.35 ms warm. LadybugDB IPC round trip in the
  harness form: 0.2 to 6.4 ms median. Cold open: about 3 to 4.7 ms (SQLite), 25 ms (LadybugDB), 85 to
  105 ms (DuckDB).
- **Thread calibration was noisy** at 10 seeds; SQLite's knob only adds sorter helpers, so its "best"
  is noise. The full run uses 20 calibration seeds.
- **After the smoke run** `prep.js` was changed so that `plan.json` no longer contains facts-load times;
  two runs now give the same file (`plan_hash` d185eb59a0999064). The smoke `plan.json` predates that
  change and carries a different hash.

## One-file update (pre-flight fix round 1, 2026-11-13)

The pre-flight audit found no measure of "update time for a one-file change" (protocol section 7,
addendum 4 section E). `bench/update.js` adds it, and `run_all.sh` calls it for every engine.

- **What one update is (same for every engine).** For file F (every distinct seed file of the plan: 99
  on the tune graph, 200 on the frozen graph; `BENCH_UPDATE_N` limits it), in an existing store built
  by the arm's own builder: (1) delete every node whose path is F, every edge with an end among them
  and everything stored per node or edge for them; (2) insert them again from the canonical graph in the
  store's own layout; (3) local refresh of every stored value the changed rows can touch; (4) global
  refresh of every stored whole-graph value; (5) DuckDB only: rewrite the node table in id order. Per
  engine:
  - SQLite: node, fts, edge (both orientations of co_changed), edge_ev, cochange; deg, prod_in and
    transport for the touched nodes; the bounded closure for every source whose 3-hop walk can reach F
    (computed before and after the change); global PageRank column (`db.js globalPageRank`).
  - LadybugDB: DETACH DELETE, CREATE nodes, f_/r_ typed tables, A arc table, EV, HAS and the T term
    table; df, dl, pi_<class> and transport for the touched nodes; the native priors page_rank and k-core
    re-run, Louvain re-run (timed) with the community column read from the stored prior file.
  - DuckDB: node, edge, edge_ev, arc, every l_* and tq_* label table, cochange, term, df, deg, transport;
    then the node table rewritten in id order (DuckPGQ needs rowid = id - 1; a re-inserted row gets a new
    rowid) and CHECKPOINT.
- **The content is re-ingested unchanged,** so the result is checked exactly: a fingerprint of every
  table (counts and sums) must be equal before and after all updates, and the timed classes (primary,
  S1, base, LadybugDB S2) on the first 10 seeds (`BENCH_UPDATE_CHECK`) plus the 20 TUNE questions (frozen
  graph) must give the same answer hashes as before. Not exercised: a changed file that adds node ids.
- **Known engine effect, reported apart:** LadybugDB `page_rank` counts deleted node slots, so the stored
  `prank` column drifts after an in-place update (minimum rank 0.15/2450 on a fresh tune store, 0.15/2458
  after re-inserting 8 nodes; an unchanged re-run is identical; `tmp/bench/prank_probe.json`). No timed
  class reads `prank`.
- **Run over every seed file (2026-11-13), not quiet, no CPU pinning, numbers to be discarded:**
  `BENCH_UPDATE_N=100000 BENCH_UPDATE_CHECK=10 bash tmp/bench/update_smoke.sh` (TUNE plan
  `results/bench/smoke/plan.json`; outputs `results/bench/smoke-update/`, log
  `tmp/bench/update_smoke_full.log`). Every engine: exit 0, 0 fingerprint differences, 0 answers
  differing, on 99 tune files and 200 frozen files. Median / 95th percentile wall time per update, in
  milliseconds: SQLite 228 / 432 (tune), 541 / 981 (frozen), of which the global PageRank is 160 and
  438 (median); LadybugDB 404 / 1,053 and 717 / 1,497, of which the native priors are 286 and 562;
  DuckDB 271 / 579 and 456 / 754 (no global value; delete 70 to 73, insert 96 to 119, reorder 18 to 66,
  checkpoint 36 to 120). A file had a median of 9 nodes (tune) and 5 (frozen), at most 163 nodes and 668
  edges. The LadybugDB priors folder copy held 54 files before and after.
- **Priors and source store (minor defect "run_all.sh points at arms/").** Every bench container now
  copies `arms/ladybug/priors` to `/benchpriors` and `arms/common/srcstore` to `/benchsrc` and sets
  `LB_PRIORS_DIR` and `GT_SRCSTORE` to them, so nothing the bench does can write into `arms/`.
- Engine probes behind the design: `tmp/bench/update_probe.js` (what LadybugDB and DuckDB accept).

## Things that make a number not comparable across engines

- **Client form.** SQLite (node:sqlite) and LadybugDB are synchronous in-process calls; DuckDB's Node
  client is asynchronous, so each statement pays a promise and event-loop round trip (smoke: about 0.35
  ms per no-op statement against about 0.001 ms for SQLite and 0.007 ms for LadybugDB). Reported apart
  as `roundtrip_estimate`, which is an estimate (a no-op statement still parses and plans).
- **Where the algorithm runs.** LadybugDB's PageRank (S1, base, and the PageRank part of S2) iterates in
  application code over a CSR cached in application code (label of item 20); SQLite's and DuckDB's run
  in SQL (SQLite: about 270 statements per ranking, one loop step at a time; DuckDB: one recursive
  statement). LadybugDB's degree-normalised spreading (the primary) also runs in application code over
  rows the engine returns. So `engine_api` is not "the algorithm's time" in the same sense per engine.
- **Traversal operator.** DuckPGQ has no bounded traversal operator (bounded k-hop is recursive SQL;
  unbounded is `iterativelength()` over a CSR built in the statement); SQLite uses a recursive CTE
  (bounded) or a level-wise loop (unbounded); LadybugDB uses its native recursive `SHORTEST` pattern.
- **Thread knob semantics differ** (SQLite: sorter helpers only; LadybugDB: per connection; DuckDB:
  per instance). LadybugDB builds and DuckDB builds run at their engine default thread count.
- **Memory settings differ**: SQLite 64 MiB page cache; LadybugDB 1 GiB buffer pool; DuckDB memory
  limit 2 GB. The arms chose them; the bench keeps them.
- **Store contents differ** (closure table, FTS5 and global PageRank in SQLite; typed and arc tables,
  term graph and native priors in LadybugDB; label tables, arc table, postings and two stored property
  graphs in DuckDB), so build time and bytes compare designs, not engines alone. LadybugDB's build also
  runs page_rank, k-core and Louvain (the community grouping itself is read from the stored prior file).
- **TQ code differs per arm**: the relational arm re-prepares its statements on every question;
  LadybugDB keeps prepared statements; DuckDB inlines literals.
- **Cold** means a fresh process and connection; the operating-system file cache stays warm (dropping
  it needs privileges the container lacks).
- **LadybugDB in the harness** runs in a child process per store; the bench times it in process and
  reports the IPC round trip separately (`harness_ipc`).
- **DuckDB sums on several threads are not bit-stable** (addendum 4 item 21); `check.js` compares
  scores rounded to 1e-9 as well as exactly.
- **Seeds on the tune graph** are TUNE T1 seeds of many June parents mapped by path and symbol onto
  one parent; seeds whose file does not exist there are skipped (2).

## For other lanes

- Pre-flight fix round 1 (2026-11-13) edited arm files (see `arms/common/NOTES.md`, first section), so
  every frozen record is stale and the grader must re-freeze before the real bench and held-out runs.
  `bench/update.js` reads the arm stores with its own code and edits no arm file.

- Nothing in `arms/` was edited. One observation for the harness lane: `harness.loadArmList(arm, stage)`
  appends to `results/sweep/lists.jsonl` by default; the bench calls it with `log = false`.
