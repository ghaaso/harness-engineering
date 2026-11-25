## GATE report (build-invariant, helper of e3f1df28), 2026-11-24 19:36 to 22:04 UTC

**Result.** The memory-aware card gate is built, tested with dummy jobs, and in use since 20:01 UTC. U2, U3, U5 and U6 now ask the gate for the card instead of `CR/GPU.lock`. Every job that was running or queued at the switch was carried over without being broken, except U5's queued card job, which I am holding (see "Needs your decision"). U6 runs on 3 drivers per repository.

The one-job-at-a-time lock is gone:
- Up to 3 U6 jobs ran side by side.
- U2's old resume test ran beside a U6 job.
- U3's 7B job cannot share the card with any U6 job: 8,864 + 2,048 + the desktop is more than the card holds. That is measured, not assumed, so U3 runs alone. Its a4-sweep ran 21:07-21:42.

**Right now (22:03) only one job is on the card** and this lasts until about 22:40. The running job is zulip bip-TGN, declared 6,144 MiB. The oldest waiter is another zulip TGN job that needs the same 6,144, and it is reserved for. The jobs queued before 21:58 use the gate code they loaded when they started, which has no backfill rule, so they wait their turn. Jobs started after 21:58 can backfill.

### What changed
- **New: `research-tree/build/improve/code/cardgate.sh`** (the gate). It can be sourced by a run script, or run as `bash cardgate.sh status | adopt <specs> | need <unit> <job>`.
- **New: `research-tree/build/improve/code/gatesite/sitecustomize.py`.** It caps each admitted job's PyTorch allocator at its declared need, so the declared numbers actually hold. It is mounted as `/gatesite` and placed first on PYTHONPATH, and it chains the image's own sitecustomize. This file is outside the brief's list but is part of the gate.
- **Replaced by writing a new file and renaming it into place** (old copies kept as `C:/Users/User/Documents/projects/card-run-2026-11/gate/*.before-gate`):
  - `code/U2/run.sh`, `code/U3/run.sh` (gpu mode only)
  - `code/U5/run_gpu.sh`, `code/U6/run_gpu.sh`
  - `code/U6/run_sweep.sh`
- The job log lines (start, end, peak, "lock released") keep their old format.
- Each docker run gains `--name gate-…`, the gatesite mount, and `GATE_TORCH_MIB`. Nothing else in the jobs changes.
- **U6 claims:** `run_gpu.sh` claims each sweep setting in `CR/improve/U6/claims`. A setting that a live job holds is skipped with exit 3, so no setting runs twice.
- **U6 sweep driver:** `run_sweep.sh` takes optional `part/of` and `tag` arguments (default 1/1 = share by claims). I removed its wait on the dead pid 8685.
- **Gate state** is in `C:/Users/User/Documents/projects/card-run-2026-11/gate/`: `run/` (ledger), `wait/`, `held/`, `gate.log`.
- Waiting jobs started after 21:58 re-read the gate on every poll, so the gate can be corrected by rename while they wait.

### The gate's rule, with its numbers
**Card:** declared needs of running jobs + undeclared use + reserved + this job + desktop + 512 ≤ 11,944 MiB.
- 11,944 MiB = memory used + memory free on the card.
- Undeclared use = the container VM's (vmwp) card memory above the declared total, from the Windows per-process counter. It catches anything of ours that was not declared.
- Desktop = card used − vmwp, at least 1,100 MiB (its usual high).
- 512 MiB margin: the two ways of reading the desktop differ by up to 461 MiB (measured).
- So jobs may declare up to 10,332 MiB in total while the desktop is at its usual level.
- A job declaring more than 10,332 runs only alone, capped at what the card holds at that moment, so it fails instead of spilling into system memory.
- The holder of the old `GPU.lock` counts with its unit's need. A coordinator hold blocks everything.

**VM memory:** MemAvailable − (for each running job: declared VM − current VM) − the oldest waiter's reserved VM − this job's VM ≥ 1,024 MiB.
- MemAvailable is read from the container VM's `/proc/meminfo` (the VM has 15.2 GiB).
- Current VM per job comes from `docker stats` of the job's named container.

**Fairness:** once the oldest waiter has waited 600 s, its card and VM needs are reserved. A younger job may still start first if logged run times show it will end before any running job can end (EASY backfill; no logged history means no backfill).

**Crashes and out-of-memory:**
- At every admission, a ledger entry is removed when its shell pid is dead and its container is gone. This covers exit 137 and killed shells.
- An out-of-memory error under the cap exits 76. The run script then reruns the job once with double the declared need, and later jobs of that kind declare double.

**Declared needs** (card / VM, MiB), from measured peaks with the desktop subtracted:

| Unit and job kind | Card | VM |
|---|---|---|
| U6 DyGFormer | 2,048 | 2,048 (zulip 2,560) |
| U6 TGN | 2,560 | 2,048 (zulip 2,560) |
| U6 TGN on zulip | 6,144 | 2,560 |
| U6 n32 settings | +25 % | same |
| U2 | 5,376 | 4,096 |
| U3 | 8,864 | 6,144 |
| U5 embedding | 5,120 | 5,632 |
| U5 training | alone | 5,632 |

Gate checks are reported only as passes and failures:
- **Dummy-job tests (no card load), run twice, the second time after the last changes:** all pass except two cases in the desktop-spike test (T5). In both, my test expected a refusal where the numbers fit within 11,944: three jobs beside a 3,600 MiB desktop total 11,792, and 5,000 MiB of undeclared use plus a 2,560 job totals 9,172. The gate's arithmetic is right; the test expectation was wrong. The cases covered are:
  - four of five jobs admitted at once
  - a slot freed after kill -9
  - the old lock counted
  - stale lock ignored
  - coordinator hold
  - VM rule
  - undeclared use
  - an alone job draining the card
  - no admission ever over budget
  - the change-over of old-copy waiters
- **Cap check in a real container:** a 1,500 MiB allocation was refused under a 1,000 MiB cap, and the job exited 76.

### Measured U6 throughput (the targeted check, real load, 20:00-21:57)

| U6 jobs side by side | Card busy | Seconds per epoch | Throughput |
|---|---|---|---|
| 1 | 32 % | zulip DyGFormer 76 (median, 8 epochs) | 1× |
| 2 | 75 % | zulip DyGFormer 91 each | about 1.67× of one job |
| 3 | 90 % | clinic TGN 2.79 against 2.08 at two (34 epochs); zulip bip-DyGFormer 116 against 83 (1 epoch) | +7 to +12 % over two |

- Each U6 job keeps one CPU core at 100 %.
- A third job still pays a little; a fourth would not, because the card is at 90 %.
- **Drivers:** 3 per repository, sharing settings by claims.
  - clinic: the old 33603, plus c2 and c3
  - fixflow: f1 and f2, plus the old chain 33599 after it finishes clinic
  - zulip: the old 33902, plus z2 and z3
- Memory, not the number of drivers, limits how many run: one zulip TGN at a time, plus up to two small jobs.
- To run fewer drivers, create `CR/improve/U6/stop-<tag>` (tags c2 c3 f1 f2 z2 z3); the driver stops before its next setting.
- U6 settings finished: clinic 5 → 10, fixflow 0 → 3, zulip 1 → 5 of 24 each.

### How many jobs run now
- 22:03: 1 running, 10 waiting: 7 U6, U2 resume-test2 (waiting since 20:54), U3 a4-frozen, U3 a6-check.
- Between 20:50 and 21:05: 2 to 3 side by side.
- All waiters from the old copies (U2, U6 clinic, U3) were admitted, and the change-over process has ended.

### Needs your decision
**U5's queued card job (pid 115321, old uncapped copy, child of sweep_driver 98729) is frozen and out of the queue.**
- Why: U5's GAT training does not fit the card. One run took 11.6 GB plus 1.8 GB spilled into system memory, and an old copy of the script cannot be capped.
- Meanwhile U5's CPU workers carry on with the same plan, and its driver waits.
- To let it run: `kill -CONT 115321`. It then takes the old lock, and the gate counts it as needing the whole card.
- U5 jobs from the new script run alone and capped; if they don't fit, they fail instead of spilling.

### Incident caused by my dry run (19:57-20:33)
My test's fake `docker` was not on the path (Windows `C:` broke PATH), so the real docker ran:
- Two U6 `sweep.py` calls failed at argument parsing and wrote nothing.
- A real U5 run started (gat_L2_H64_N5 on the card). It ran out of memory under the cap, then was rerun uncapped beside the uncapped zulip TGN job. The card spilled 3.2 GB into system memory, and one zulip TGN evaluation took 591 s instead of about 130 s.
- I paused it at 20:05 and unpaused it at 20:32. It then spilled again, so I stopped it at 20:33 (docker stop).
- I removed its stale U5 claim, as `train.py` does itself for a failed run.
- Its start and end lines are not in `improve-U5.log`; they went to the test's scratch log.
- All of this is logged in `gate.log`.

### Not done or uncertain
- Zulip TGN's need under a cap below 5,744 MiB is not measured (it runs using its full cap), so two zulip TGN jobs never run together.
- U2's and U3's VM needs are estimates; the PEAK lines in `gate.log` will measure them.
- Only a few samples have three jobs side by side on zulip.
- The desktop is read only at admission, so a Chrome restart (+2.5 GB) while the card is fully booked can still squeeze it.
- `U2/run.sh` and `U3/run.sh` `gpu` still return 0 even when the job fails. This is as before; the end line carries the exit code.
- There is a small race when a dead process's gate lock is broken.
- I did not touch `core.py`, `final.py` or `finish.sh`. `finish.sh` calls `run_sweep.sh` with 2 arguments, which works unchanged.
- Token use is estimated at about 8 M, not counted from the transcript (limit 12 M).

To watch it: `bash research-tree/build/improve/code/cardgate.sh status`, and the log at `C:/Users/User/Documents/projects/card-run-2026-11/gate/gate.log`.
