# How to run the as-built copy of the model (round 3)

This folder is a working copy of the Layer 1 model. On 2026-11-17 these files were copied byte-equal from `model/`:
`model.mjs`, `check.mjs`, `configs.mjs`, `configs-full.mjs` and `show.mjs` (`check.mjs` imports only
`./model.mjs` and `./configs.mjs`). `rss-at-exit.mjs` is new and measures memory only. The copy runs
alone from this folder. It writes only to stdout and stderr, never into `model/results` or `model/work`.
The originals in `model/` are owned by the live full run (runner pid 40648) and must not change.

All commands below run from BUILD (`.../scratchpad/tcb-build`), one at a time, through the lane.

## The commands

One configuration, the whole fault budget in one process, one result file:

```
node tools/lane.mjs --label r3-<what> --timeout-s 140 --wait-s 20 -- node model/as-built/check.mjs DF2-K2-R1 --mem-mb 400 > model/results-as-built/<dir>/DF2-K2-R1.json 2> model/results-as-built/<dir>/DF2-K2-R1.err
```

With the peak resident memory and wall time written to stderr as one `[rss] max_rss_mb=N wall_s=S` line:

```
node tools/lane.mjs --label r3-<what> --timeout-s 140 --wait-s 20 -- node --import ./model/as-built/rss-at-exit.mjs model/as-built/check.mjs <ID> --mem-mb 400 > <out>.json 2> <out>.err
```

The ids that only `configs-full.mjs` defines are D2-K2-R1, D2-K2-R2, DF2-K2-R2, D3-K2-R2, DF3-K2-R2,
A-FENCE-CE-K2 and every `*-K3`/`K4F` id. For these, also load the copy's `configs-full.mjs` (it pushes
into the same CONFIGS array):

```
node tools/lane.mjs ... -- node --import ./model/as-built/rss-at-exit.mjs --import ./model/as-built/configs-full.mjs model/as-built/check.mjs D2-K2-R1 --mem-mb 400 > ...
```

One part, which is one maximal fault multiset. Use this when a whole configuration does not fit:

```
node tools/lane.mjs ... -- node model/as-built/check.mjs DF2-K2-R1 --bud k=2,cd=1,x=1 --mem-mb 400 > <out>/DF2-K2-R1__k=2,cd=1,x=1.json
```

`--deadline <epoch-ms>` stops the BFS at that time and reports the run as BOUNDED (`check.mjs:28,93`).
Exit code: 0 in all normal cases, BOUNDED included. 2 means an unknown id. The verdict is in the JSON.
A lane exit of 75 means the lane was busy, so try again. A lane exit of 124 means the lane timed out, and
that is not a result. Under the load note (the full run uses about 15 workers from 15:40 to 18:00), rerun
it with Bash `run_in_background` and `--timeout-s` up to 900, one run at a time.

## Configurations and parts

- `configs.mjs` lists the configurations: `id`, `over` (overrides of `makeParams`, `model.mjs:28-62`) and
  `base` (the configuration an ablation is compared with). `D*` is the adopted design and `DF*` is the
  design with the six `FIX_*`. `A-<X>` is DF with one design mechanism removed (`configs.mjs:37-55`).
  `X-<fix>` is DF with one fix removed (`:60`). Then DFPLUS-RECHECK and D2-K2-R1-NOKILLWAKE (`:56-58`).
  `configs-full.mjs` adds the full 77-configuration matrix.
- The budget `BUD` holds k faults in total plus caps per kind. K2 (`configs.mjs:8`) allows two faults,
  at most two of cs, cv, cd, z, p, l and x, at most one of t and r, plus the planned events h=1 and d=1.
- A part is one maximal multiset of fault kinds (`run-all.mjs:30-43`); `--bud k=2,cd=1,x=1` zeroes the
  other kinds (`check.mjs:23-25`). The parts cover the configuration exactly. A safety property holds
  for the configuration if and only if it holds in every part. The shortest trace is the minimum over the
  parts. The ordinary edges are the same in every part, so the liveness answers agree too
  (`run-all.mjs:3-9`). A whole-configuration run (no `--bud`) explores one graph whose states also carry
  the remaining budget. Its state count is therefore not the sum over the parts: DF2-K2-R1 has 2,608,525
  states whole, against 3,659,461 summed over 43 parts. The verdicts and the shortest trace lengths agree
  (checked below).

## Memory and the BOUNDED outcome

- `--mem-mb N` bounds the checker's own count, `used()` = its typed arrays + V8 `heapUsed`
  (`check.mjs:33-42`). It does not bound the RSS. At 400 MB the RSS was 455-498 MB.
- The BFS stops at 78 % of the budget (`STOP_FRAC`, `:88,94`). The result is then `complete:false` with
  `bounded_why`. A safety property that was not refuted reads `"not refuted (bounded)"`. In the liveness
  analyses, states that were not expanded are assumed able to resolve (`:166`) and are left out of the
  SCCs (`:184`), so a BOUNDED run can only miss failures. Report it as BOUNDED, never as "holds".
- After the BFS, the graph analyses need about `N*26 + E*4` bytes more (`:248-250`). When that is not
  free, the four liveness properties read `"not checked: analyses need about X MB more than the budget
  leaves"`, even if the BFS was complete. This happened to **D2-K2-R1 at 400 MB**: complete BFS of
  3,394,587 states, the safety results valid, the liveness results not checked (121 MB short). At 400 MB
  a whole configuration fits up to about 3.1 M states (A-RECONCILE, 3,039,233, fitted). Above that, run
  it by parts.
- The lane caps the V8 heap through NODE_OPTIONS (`--heap`, default 1024 MB). The typed arrays are off
  the heap.

## Measured at 400 MB (2026-11-17, before the load note, whole configurations, one at a time)

| Config | States | Transitions | check s | peak_mb (counted) | max RSS MB | Failing (trace steps) | SUMMARY.md |
|---|---|---|---|---|---|---|---|
| DF2-K2-R1 | 2,608,525 | 7,745,683 | 15.4 | 280 | 455 | none | none |
| A-RECONCILE | 3,039,233 | 9,117,495 | 19.4 | 344 | 493 | Slots(3) OneSessionPerAttempt(3) | same |
| A-READY | 2,558,288 | 7,625,635 | 15.6 | 279 | 456 | ReadyNotDiscarded(6) | same |
| X-PAUSE-DISCOUNT | 2,775,044 | 8,201,345 | 17.1 | 313 | 469 | NoFalseSuspicion(6) | same |
| X-ARM-AT-START | 2,365,754 | 6,384,323 | 13.3 | 265 | 457 | NoDeadlock(2) AlwaysCanResolve(2) | same |
| D2-K2-R1 (extra) | 3,394,587 | 9,544,159 | 18.5 | 297 | 498 | Slots(6) ReadyNotDiscarded(6) NoFalseSuspicion(6); liveness **not checked** (memory) | liveness fails there |

Results: `model/results-as-built/baseline/<ID>.json` (stdout) and `<ID>.err` (stderr). Each lane call took
about 1 s longer than the check's own seconds. Under the load note, expect several times longer.

## Printing a counterexample trace

The trace is in the JSON at `props.<Property>.trace`, one label per step. A label joins with " | " the
ops of one coordinator turn that ran without interleaving. To print it readably:

```
node tools/lane.mjs --label r3-show --timeout-s 30 --wait-s 20 -- node model/as-built/show.mjs < model/results-as-built/baseline/A-READY.json
```

`--brief` lists the verdicts only. The trace is the BFS-shortest one: the labels come from replaying
`successors(..., L=true)` along the parent chain (`check.mjs:121-136`). A liveness trace is a prefix,
then a marker line, then the cycle (`:221,241`).

## Adding a flag and a configuration in the copy

1. Flag: add it with its default to `base` in `makeParams` (`model.mjs:29-60`). Keep the default equal
   to today's behaviour, so every existing configuration keeps its verdicts. Read it as `P.<FLAG>` where
   the mechanism acts.
2. New state: add it to `initial` (`:65-68`), `cloneT`/`cloneS`/`clone` (`:70-80`), `canon` if it can
   be forgotten (`:94-120`), and to **both** `encode` and `decode` (`:125-180`). Every value must be
   < 256, and the bit fields are packed by hand: check the free bits before you add one. Two states that
   differ only in a field the encoding drops are merged silently.
3. New action: push it in `successors` (`:484-565`) with a `proc` id for fairness (`:481-482`; ids
   30 and 31 are environment and never forced). Set `fault:true` and charge it with `has`/`spend`
   (`:90-91`) when it is a fault. Set `u:true` only for untimed coordinator steps. To make it a new fault
   kind, add the kind to `FAULTS` (`:24`) **and** a nibble to encode/decode (`:129,158`), and give it a
   cap in the budgets of `configs.mjs`.
4. New property: an invariant goes in `invariants` (`:568-576`). A per-transition property goes in a
   `viol` entry of the action. Then add the name to `SAFETY` in `check.mjs:80`, or the checker never
   reports it.
5. Configuration: append to `CONFIGS` in the copy's `configs.mjs`, for example
   `{ id: 'AB-…', title: '…', over: { ...FIXES, BUD: K2, R: 1, MYFLAG: true }, base: 'DF2-K2-R1' }`.
   Keep K2 and R=1 for this round. Before you trust a new flag at its default, rerun DF2-K2-R1 and check
   that the result is unchanged (2,608,525 states, nothing failing).
