# Probe: one run of the research-tree test suite (time and memory)

Measured 2026-11-18, 01:23 to 01:33 local. Windows 11, Ryzen 9 7900X (24 threads), 31 GB.

## The command
Run from `research-tree/`, through the queue script:

    node tools/lane.mjs --label probe-suite-memory --timeout-s 1500 --wait-s 300 -- \
      node --test --test-concurrency=1 --test-reporter=tap tcb/test/*.test.mjs

- The last full suite in `lane/log.jsonl` (labels `mg-suite-*`, 2026-11-17) ran file by file, each with
  `--test-concurrency=1` and the tap reporter. The 18 `mg-suite-*` runs summed to 768 s (selftest alone 270 s).
  The queue log has no single command for the whole folder, so this run is the same flags over all 26 files at once.
- The runner's parallel setting: `--test-concurrency=1` (one test file at a time). The README says
  `--test-concurrency=4` is possible; not used. Heap cap from the queue script: 1024 MB per Node process (default).
- Run 1 did not start the tests: I passed the folder `tcb/test/` and Node 24 tried to load it as a module
  (MODULE_NOT_FOUND, 5 s, no figures). Run 2 used the glob above. Two runs in all.
- The queue: slot-0 held an owner file from a dead process (pid 29828, 2026-11-17 16:51); the script treats that as stale
  and took the slot. Waited 2 ms.

## Figures (run 2; 678 samples, one about every 0.9 s)
| Figure | Value |
|---|---|
| Wall time | 596.4 s (9 min 56 s), exit 0 |
| Tests | 1018 total: 965 pass, 0 fail, 53 skipped (needs-app), 0 cancelled |
| Working set of the run's tree: peak / average | 493.9 MB / 201.2 MB |
| Private memory of the tree: peak / average | 332.0 MB / 109.3 MB |
| Peak processes in the tree | 12 |
| Lowest free memory of the system | 14,811 MB |
| Free memory at start of run | 15,019 MB (first sample; 15,204 MB just before) |
| Processor use, whole system: average / peak | 12.8 % / 50.2 % |
| Threads busy of 24: average / peak | 3.1 / 12.0 |

Processor use is the total for the PC, not only the run. Another helper and other programs ran at the same time, so
the run's own share is lower than these figures. Node processes on the PC before and after: 3 and 3 (not mine).

## Arithmetic (no recommendation)
Memory free at start: 15,019 MB. Memory for runs: 31 GB less 8 GB = 23 GB = 23,552 MB.
| Basis | Per run | In 15,019 MB | In 23,552 MB |
|---|---|---|---|
| Peak working set | 493.9 MB | 15,019 / 493.9 = 30.4, so 30 | 23,552 / 493.9 = 47.7, so 47 |
| Peak private memory | 332.0 MB | 15,019 / 332.0 = 45.2, so 45 | 23,552 / 332.0 = 70.9, so 70 |
Processor: average 3.1 threads per run gives 24 / 3.1 = 7.7 runs; peak 12.0 threads gives 24 / 12.0 = 2.0 runs
(system-wide figures, so these are upper bounds on one run's share).
Time: one run is 596 s. The 18 per-file runs of 2026-11-17 summed to 768 s, which includes the queue's start-up for each.

## Files this run changed
- `research-tree/lane/log.jsonl`: two lines added (start and end of `probe-suite-memory`; the failed run 1 left no line in the log I read).
- `research-tree/lane/slot-0/owner.json`: deleted by the queue script when it released the slot. It was already
  modified (stale owner) before my run.
- `research-tree/lane/recorder.log`: was modified before my run, and kept growing (another process writes it).
- Not mine: `concurrency-literature.md`, `probe-hooks.md` (the other helper), `pc-freezes-2026-11-17/`, `tools/av-watch.ps1`.
- Mine: this file and `probe-suite-memory.csv`. Nothing committed. No sampler or run process left.

## Limits of one run
- One run, one machine state, one test order; the 53 skipped tests need the real app and did not run.
- Samples every 0.9 s: a process that lives under 0.9 s can be missed, so peaks are lower bounds. The 12 processes peak is the highest seen.
- Working set counts shared pages (the Node binary) in every process, so the sum overstates real use; private memory understates shared use.
- `--test-concurrency=1` only. Four at a time would raise memory and processor use; not measured.
- Memory of the test children's own children (git, fixtures) is included only when they lived at a sample time.
- The CSV is the sampler's raw output; elapsed seconds are from the start of the sampler.
