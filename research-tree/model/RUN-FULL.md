# Full run of the model: command, coverage, cost

The owner's rule: a limit on memory and cores may slow the work down, never make it smaller. So the
runner limits how much runs at once. Every configuration is still explored completely. A part that
does not fit is reported as BOUNDED. It is never cut down to fit.

## The command

From `model/` (Node 24, no packages):

```
node run-resumable.mjs > results/run-full.out 2> results/run-full.err
```

These are the defaults, written out in full:

```
node run-resumable.mjs --configs full --workers 4 --mem-mb 1500 --big-mem-mb 8000 --floor-mb 4000 --big-at rank --results results --spawn-gap-ms 250 --batch-max-est 81 --batch-parts 100
```

- **Gentle starts.** The runner starts at most one process per 250 ms (`--spawn-gap-ms`). The 3,750
  smallest parts (estimate at most 81, all of them at 2 fields outside A-FENCE-CE: every 2-fault part,
  3-fault parts with at most one child fault, 4-fault parts with none) do not get a process each: they run in *hosts*, one long-lived process per
  worker slot that runs such parts one after another, each in a fresh worker thread with its own heap
  limit of `--mem-mb`. A host counts as one worker of `--mem-mb` for `--workers` and admission, and is
  replaced after 100 parts (`--batch-parts`). Big parts never run in a host. `--batch-max-est 0` gives
  every part its own process.

- **After a reset**, run the same command again. Every part whose `results/<config>/<part>.json` says
  `complete` is skipped. A part bounded at a size below 8000 MB goes straight to the big queue. A part
  that was running at the reset has no file, so it runs again.
- **Progress** can be read at any time in `results/SUMMARY.md` and `results/SUMMARY.json`. Both are
  rewritten after every finished part and every start.
- **Plan without running:** `node run-resumable.mjs --plan` lists the configurations in run order with
  their part counts and how many are already final.
- **Exit code:** 0 only when all 9,154 parts are complete; 1 when any part is BOUNDED or a run failed;
  2 on a set-up error (including a second runner on the same `results/`); 3 when interrupted.
- **One subset:** `--only DF3-K3-*` or `--exclude '*-K4F-*'` (comma lists; `*` matches anything).

## What it covers: 77 configurations, 9,154 parts

`configs-full.mjs` imports `configs.mjs` and appends the 41 configurations that `configs.mjs` lacks.
It changes and removes nothing. Each `check.mjs` child is started with
`--import ./configs-full.mjs`, so `check.mjs` finds the new ids. The parts are run-all.mjs's own: the
runner reads `maximalMultisets`, `partArg` and `weight` out of `run-all.mjs`'s source and evaluates
them. It refuses to start if that code has changed shape. Before running, it also checks that the parts
cover every fault multiset of each budget.

| Group (run order) | Configurations | Parts |
|---|---|---|
| 1. 2 fields, 2 faults | all 14 A-\* except A-FENCE-CE, all 6 X-\*, D2-K2-R1 (new), D2-K2-R2 (new), DF2-K2-R1, DF2-K2-R2 (new), DFPLUS-RECHECK, D2-K2-R1-NOKILLWAKE: 26 | 26 x 43 = 1,118 |
| 2. A-FENCE-CE as in configs.mjs (1 fault) | 1 | 9 |
| 3. 2 fields, 3 faults | the 20 ablations again at K3 (`<id>-K3`, new), D2-K3-R1/R2, DF2-K3-R1/R2: 24 | 24 x 140 = 3,360 |
| 4. 3 fields, 2 faults | D3-K2-R1, D3-K2-R2 (new), DF3-K2-R1, DF3-K2-R2: 4 | 4 x 43 = 172 |
| 5. 2 fields, 4 faults (K4 of configs.mjs: at most one of each kind) | D2-K4-R1/R2, DF2-K4-R1/R2: 4 | 4 x 126 = 504 |
| 6. A-FENCE-CE with 2 faults | A-FENCE-CE-K2 (new): 1 | 43 |
| 7. 2 fields, 4 faults, two of a kind allowed (K4F) | D2-K4F-R1/R2, DF2-K4F-R1/R2 (new): 4 | 4 x 343 = 1,372 |
| 8. 3 fields, 3 faults | D3-K3-R1/R2, DF3-K3-R2 (new), DF3-K3-R1: 4 | 4 x 140 = 560 |
| 9. 3 fields, 4 faults (K4) | D3-K4-R1/R2, DF3-K4-R1/R2 (new): 4 | 4 x 126 = 504 |
| 10. A-FENCE-CE with 3 faults | A-FENCE-CE-K3 (new): 1 | 140 |
| 11. 3 fields, 4 faults (K4F) | D3-K4F-R1/R2, DF3-K4F-R1/R2 (new): 4 | 4 x 343 = 1,372 |
| **Total** | **77** | **9,154** |

Together these give:

- the adopted design (D) and the design with all fixes (DF), each with 2 and 3 fields, 2, 3 and 4
  faults, and R=1 and R=2 (24 combinations each);
- every ablation (14 A-\*, 6 X-\*) with two and with three faults. A-FENCE-CE also keeps the 1-fault
  run that configs.mjs has.

The ablation K3 runs use the base `DF2-K3-R1`.

**Four faults.** `configs.mjs` defines K4 as at most one fault of each kind. It does this because the
15-minute run could not hold more, and that is exactly the kind of shrinking the owner's rule
forbids. So `configs-full.mjs` adds K4F: k=4 with the caps of K2 and K3 (two each of
cs, cv, cd, z, p, l, x; one each of t, r).

Every K4 part lies inside a K4F part, so K4F subsumes K4. K4 stays in the matrix because it is much
cheaper and its results arrive days earlier. If time matters more than the earlier answer, add
`--exclude '*-K4-*'` to drop K4.

## Order: cheapest first

The runner orders configurations by estimated cost: run-all.mjs's `weight()` summed over the parts.
A-FENCE-CE\* gets a factor of 100 (`COST_FACTOR` in configs-full.mjs), because without the --ce
fence one 1-fault part already has more than 2.1 million states.

Within a configuration, parts run smallest first. With `--big-at rank`, a part that has to be rerun
alone at 8000 MB runs before the first part of any more expensive configuration starts. So each
configuration finishes completely, big parts included, in the order of the table above. That order
is the run order `--plan` prints.

## How it runs

**Normal parts.**
- At most 4 worker processes run at once: `check.mjs` processes and hosts together. Each runs one
  part at a time.
- A part in its own process gets `--max-old-space-size=1500` and `--mem-mb 1460`, which is
  run-all.mjs's own split. A part in a host gets a worker thread with a heap limit of 1500 MB and the
  same `--mem-mb 1460`. The host's own heap is capped at 256 MB.
- Process starts are at least 250 ms apart.
- Children run at below-normal priority.
- None gets a `--deadline`, so there is no wall-clock limit anywhere.

**Big parts.**
- A part is rerun alone at 8000 MB in any of these cases:
  - its BFS stopped at the memory share;
  - its BFS completed but the graph analyses were skipped for memory, which `check.mjs` reports as
    "complete" with four properties "not checked";
  - its process died without a result.
- At 8000 MB the part runs with nothing else beside it.

**Admission.** A worker of size S starts only while this holds:

```
os.freemem() - (what running workers may still grow into) - (S + 150 + S/10) > 4000 MB
```

- If it does not hold, the runner waits 5 s and looks again. It logs this once a minute.
- A worker's flags do not cap its memory. `--max-old-space-size` caps only the JS heap, and
  `check.mjs`'s state store lives in typed arrays outside it. `check.mjs` copies a typed array when it
  grows it, and keeps the old one until a garbage collection. Measured peak working sets of bounded
  A-FENCE-CE parts:
  - 550 MB at size 400 (`check.mjs` counted 281 MB);
  - 1198 MB at size 1000;
  - 2254 MB at size 2000.

  So a worker of size S is reserved S + 150 + S/10: 590, 1250 and 2350 MB at those sizes, 1800 MB at
  1500, and 8950 MB at 8000. The 8000 MB figure is an extrapolation: nothing above 2000 MB was
  measured. The first big parts' `max_rss_mb` in their result files will show the real figure; the
  working set is sampled every 5 s.
- "What running workers may still grow into" is each worker's reservation less its sampled working
  set.

**Result files.**
- Each finished part writes `results/<config>/<part>.json`: written to a temporary file, flushed to
  disk, then renamed.
- The file holds:
  - the part's budget;
  - states and transitions;
  - complete, bounded or failed, and why;
  - every failing property with its shortest trace;
  - seconds;
  - check.mjs's peak, the sampled working set and the heap limit;
  - every attempt;
  - a fingerprint.
- A result is reused only when the fingerprint matches: the same `model.mjs` and `check.mjs`, the same
  id and part, and the same resolved parameters. A change to the model reruns everything it touches;
  stale results are never trusted.

**Safety.**
- A lock file stops a second runner on the same `results/`.
- Each child carries a watchdog thread that ends it when the runner is gone, so a killed runner leaves
  no orphans.

**Result integrity.** `check.mjs` stores record offsets in a Uint32Array. Beyond 2^32 bytes of
records the store would be silently wrong. That limit is about 93 million states at 2 fields (45-46
bytes a record) and about 83 million at 3 fields (51 bytes).
- The runner marks any part past that line as a FAILED run ("unsound"), never as complete.
- At `--big-mem-mb 8000` the BFS stops by memory, at about 50 million states, long before that line.
- Raising B above about 10,000 can reach the line.

## Estimates from the results that exist

Sources:
- `model-review/rerun/results/final.json`: the last run-all, 22 workers, stopped at 12.5 min;
- `model-review/k3-*.jsonl` and `k4*.jsonl`;
- `model-review/big.json`, `df3k2.json` and `guard.json`;
- `inputs/model-findings-2.json`;
- this task's tests.

Cost is about 10-14 microseconds of one core per state: 11.6 measured here, 14.0 in k4c and 9.7 in
k4d. Memory is about 90-150 bytes per state including edges.

**Measured** at 2 fields:
- K2: 0.4-6.2 M states per configuration;
- DF2-K3: 57.7 M states, about 1,390 cpu-s, largest part 3.2 M states and 360 MB;
- A-DRAIN-K3: 43.8 M;
- DF3-K2: 22.9-23.0 M, largest part 254 MB;
- DF2-K4 (126 parts): about 250 M states, about 4,200 cpu-s, largest part 18.5 M states and 1.9-2.0 GB;
- A-FENCE-CE at 1 fault: 9 parts of more than 2.1 M states each, all bounded at 225 MB;
- A-FENCE-CE at 2 faults: more than 93.7 M states, bounded.

**Scaled** estimates: 3 fields is about 6.3 times 2 fields (DF3-K2 / DF2-K2); K4F at 2 fields is
configs.mjs's own estimate of about 17,000 cpu-s per configuration.

| Group | Est. states | Est. cpu-s | Parts expected to need 8000 MB alone | Expected outcome at 8000 MB |
|---|---|---|---|---|
| 1 | ~105 M (measured) | ~1,300 | none (largest part 150 MB) | complete |
| 2 | 20-60 M | 300-800 | up to all 9 | probably complete |
| 3 | ~1.4 G | ~17,000 | 0-10 (A-CUT-K3, A-FENCE-EPOCH-K3, A-WATCHER-LOCK-K3 parts with cs,cv,r) | complete |
| 4 | ~92 M | ~1,100 | none (254 MB) | complete |
| 5 | ~1 G (measured for DF) | 13,000-18,000 | 3-4 per configuration, about 14 in all: cs,cv,cd,r / cs,cv,p,r / cs,cv,x,r (1.2-2.0 GB measured) | complete (largest about 2 GB) |
| 6 | 0.2-0.5 G | 3,000-6,000 | most of 43 | some may stay BOUNDED |
| 7 | ~5.6 G | ~68,000 | many (parts with two of a kind of cs/cv/cd) | some may stay BOUNDED |
| 8 | ~1.45 G | 17,000-20,000 | about 60-120 (largest about 20 M states, about 2.3 GB) | complete |
| 9 | ~6.3 G | ~75,000 | nearly all 504 | about 30-40 BOUNDED (those whose 2-field twin used more than about 1 GB) |
| 10 | more than 2 G | unknown | nearly all 140 | mostly BOUNDED |
| 11 | ~40 G+ | ~440,000 | nearly all 1,372 | mostly BOUNDED; the largest parts exceed what check.mjs can store on any machine |

**Wall time with 4 workers.** Normal parts take cpu-s / 4. Big parts run one at a time. These are
rough figures, good to a factor of about 2 for groups 3-9 and worse for 6, 7, 10 and 11:

- Groups 1-5, everything at 2 fields plus 3 fields with 2 faults: **about 4 h**. This is the first
  point where D/DF at 2, 3 and 4 faults, both R, and all ablations at 2 and 3 faults are complete.
- Group 6: + 1-2 h.
- Group 7: + 8-12 h. Big parts alone dominate.
- Group 8 (3 fields, 3 faults): + 6-9 h.
- Group 9 (3 fields, K4): + about 1 day, almost all of it single-core big parts.
- Group 10: + 0.5-2 days.
- Group 11 (3 fields, K4F): + 10-15 days, and it ends mostly BOUNDED.
- **Whole matrix: about 2.5-3 weeks**, of which groups 1-9 take about 2-2.5 days.

**Peak memory of the run.**
- In the normal phase: up to 4 x 1800 MB (the reservation), about 7.2 GB.
- In a big phase: one child of up to about 8950 MB, about 9 GB. This is extrapolated from
  measurements at 2000 MB and below.
- The runner itself: about 50 MB. Every 5 s it also runs one short `tasklist` to sample its workers'
  memory.

The admission rule keeps at least 4 GB free on top of the reservations. A big part therefore starts
only when about 13 GB are free (8950 + 4000 MB). The machine has 32 GB; 16-19 GB were free
during this task.

## Known limits (decisions for the coordinator)

1. **Some parts will be BOUNDED at 8000 MB:** groups 9-11, and possibly 6 and 7. The runner reports
   them as BOUNDED in the table and the exit code. It never shrinks them.
   - Bounded parts are not rerun at the same B.
   - Rerunning with `--big-mem-mb 10000` (keep the 4 GB floor) picks up only the bounded parts, alone.
     Above about 10,000 MB a part can cross check.mjs's 32-bit record store. The runner then reports a
     FAILED run ("unsound"), not a result.
   - Completing group 11, and some of 9 and 10, needs a change to `check.mjs` (64-bit offsets, or a
     disk-backed store) or a larger machine. That is outside this task.
2. **Big parts run alone, so they serialise.** With 16-19 GB free and a 4 GB floor, two 8 GB parts
   could not run together anyway. The tail of groups 7-11 is single-core time.
3. **The estimates for groups 6, 7, 10 and 11 are extrapolations.** No complete run of A-FENCE-CE at 2
   or more faults, of K4F, or of 3 fields with 3 or 4 faults exists for the current model. The first
   finished parts in `results/SUMMARY.md` will correct them.
4. **The D (adopted design) configurations other than D2-K2-R1 have no measurements.** They are
   assumed to cost about what DF costs (3.39 M vs 3.26-3.66 M states at K2).

## Test evidence of the check (2026-11-17, after the host and spawn-gap change)

All of it was run through the lane, with `--workers 2` and at most `--mem-mb 400`. Folders and outputs
are in `tmp/model-check/`.

- **Partition.** `--plan-parts` against run-all.mjs's own recorded spawns: equal part lists for
  A-ALARM (43), DF2-K3-R2 (140) and D3-K4F-R2 (343) (`ra3.log`), and for all 77 configurations, 9,154
  parts (`fake-runall.log`). No part is missing and none appears twice.
- **Uninterrupted** (`r-full`): A-ALARM and DF2-K2-R1 with `--batch-max-est 27`, 74 parts in 4 hosts and
  12 in their own processes. 4,073,127 states and 11,491,895 transitions, run-all's figures. Exit 0.
- **Killed midway, twice:**
  - `r-kill`: the lane ended the whole process tree at 8 s, after 65 parts. The restart reused those 65
    and ran the other 21.
  - `r-final`, with `--batch-parts 5`: ended at 6 s after 53 parts, then restarted.

  Both gave 0 per-part differences from `r-full` in status, states, transitions, and each property's
  verdict and trace length.
- **Damaged files** (`r-torn`): five parts were damaged. One file was torn. One was missing, with a
  complete temporary file beside it. One had a wrong fingerprint. One held another part's result. One
  was marked bounded.
  - Exactly the first four ran again, and the temporary file was removed.
  - The bounded part was reported as BOUNDED (exit 1) and not rerun.
  - `--rerun-bounded` ran it, giving exit 0 and 0 differences.
- **Hosts and processes:** A-ALARM in 2 hosts and in 43 single processes gave 0 differences.
- **Bounded parts** (`r-bnd`, `--mem-mb 56 --big-mem-mb 58`):
  - All 43 parts were bounded, retried alone in their own processes, and stayed BOUNDED (exit 1).
  - A second start reran nothing.
  - `--big-mem-mb 400` reran them alone, one at a time with no overlap, and the totals came back to
    413,666.
- **Admission** (`r-floor`): with `--floor-mb 25000` and about 18 GB free, nothing started in 15 s and
  the wait was logged. With 12000 on the same folder, it ran to completion.
- **Gentle starts:** the smallest gap between two process starts was 250-262 ms in every run. Two
  parts ran at once at most (`overlap.mjs`).

## Test evidence of the build (process per part, before the host change)

All result folders and outputs are in `tmp/model-test/`.

**Reference.** run-all.mjs on A-ALARM, DF2-K2-R1, A-CUT, A-PROGRESS and X-READY-ALL, limited to 3
workers of 500 MB by the test-only preload `limit-run-all.mjs`:
- 215 parts, 16,977,874 states (`runall-ref5.json`).

**Uninterrupted** `run-resumable.mjs` on the same five configurations (`r-full`):
- the same 215 parts, 16,977,874 states, 49,221,400 transitions;
- the same verdicts and shortest-trace lengths for every property;
- exit 0.

**Killed midway** (`r-kill2`, final code; an earlier run with pre-final code, `r-kill`, gave the same
result):
- The runner was killed with `taskkill /F` after 111 parts.
- Its 3 children were gone 7 s later, ended by the watchdog.
- On restart it reported "111 final from earlier runs" and ran only the other 104.
- Afterwards, `compare.mjs r-full r-kill2 runall-ref5.json` found 0 differences per part. Every
  configuration's totals and verdicts were EQUAL to run-all.mjs.

**Damaged files** (`r-torn`):
- A torn result file, a leftover temporary file and a result with a wrong fingerprint were detected.
- Exactly those 2 parts ran again, and the temporary file was removed.

**Bounded parts.**
- With `--mem-mb 70 --big-mem-mb 75`, 7 parts stayed BOUNDED (exit 1, all properties shown `?`).
- A second start did not rerun them.
- `--big-mem-mb 300` reran only those 7, alone, and the totals came back to 3,659,461.
- In `r-rank`, the 14 big parts did not overlap any other part in time. The big parts of A-CUT ran
  before X-READY-ALL started.

**Other checks.**
- A second runner on the same folder is refused (exit 2).
- With a floor that cannot be met, the runner waits and starts nothing.
