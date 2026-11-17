# The ladder run: groups 1 to 5 with every core in use

Written on 2026-11-17 by the session that ran it. `RUN-FULL.md` describes the runner and the whole matrix;
this file describes only how groups 1 to 5 were run faster with the same runner, unchanged.

## Why

The owner decided on 2026-11-17 to stop the full run after group 5 (the model changes next, and the larger
groups would have to be run again) and to use as much of the machine as it has.

The runner admits a worker only while free memory, less what the running workers may still grow into, less
the new worker's reservation, stays above a floor. A worker of size S is reserved S + 150 + S/10 MB. At the
default size of 1,500 MB that is 1,800 MB, so with about 15 GB free and a floor of 4,000 MB only six workers
run, on a processor with 12 cores. Most parts need far less than 1,500 MB: in group 1 the largest used
171 MB.

## What the ladder does

It runs the same parts in tiers of growing size. A small size lets many workers run at once; the few parts
that do not fit are run again at the next size with fewer workers.

| Tier | Size of a worker | Reserved per worker | Workers that fit (19 GB free, floor 4,000 MB) |
|---|---|---|---|
| 1 | 500 MB | 700 MB | 16 (the cap: about 16 saturate the 12 cores) |
| 2 | 1,150 MB | 1,415 MB | about 10 |
| 3 | 2,600 MB | 3,010 MB | about 5 |
| 4 | 6,000 MB | 6,750 MB | 2 |

Two properties of the runner make this work without changing it:

- With `--big-mem-mb` equal to `--mem-mb`, a part that does not fit is final for that run (`BOUNDED` at
  that size); it is not rerun alone.
- A part with no result file runs in the normal pool. So between two tiers `ladder-move.mjs` takes the
  results that stopped at the smaller size out of `results/` and puts them under
  `results-ladder/at-<size>/<configuration>/`. Nothing is deleted: those files are the record of the
  attempt at that size. The next tier then runs these parts several at once.

A part's final result is therefore either `complete` at the size where it fitted, or `BOUNDED` at
6,000 MB. No part is cut down and none is skipped. Results are reused across sizes because the runner's
fingerprint covers the model, the checker, the configuration, the part and its parameters, not the size.

## How to run it

```
bash ladder2.sh
```

It works in its own folder and can be run again after any stop: finished parts are skipped. It writes
`results/ladder.log` (one line per tier, and one JSON line per move), `results/run-tier-<size>.out` and
`.err`, and the runner's own `results/SUMMARY.md`. `ladder.sh` is the first version, kept for the record:
it fixed the number of workers per tier and took a runner that was stopped from outside for a finished
tier; `ladder2.sh` leaves the number to the runner's admission and checks with `--plan` that a tier has
nothing left before it moves on.

## What it leaves out

Groups 6 to 11 of `RUN-FULL.md` (A-FENCE-CE with 2 and 3 faults, 2 fields with two faults of a kind,
3 fields with 3 and 4 faults). They are excluded by name in the script and can be run later with the
runner as `RUN-FULL.md` says; the results of groups 1 to 5 will be reused.

## What to know before running it on this PC

- It loads every core for an hour or more. The recorder (`tools/recorder.ps1`) must then be started with
  `-HotSamples 0`, or its rule "97 % CPU for 30 s" stops the run. Its memory and process-count rules stay.
- The runner starts a process for every part that is not tiny. On 2026-11-17 this PC blocked the start of
  new programs four times (see `docs/program/evidence/pc-freezes-2026-11-17/VERDICT.md` in the harness
  repository); the ladder was cut by such a block at 15:43 and picked up after the restart without loss.
