# Layer 1 model, version 2 (rules R1-R12 with the adopted fixes as designs)

Plain Node 24, no packages. Files:

- `model.mjs`: the protocol. Task rows with the R3 step machine (fenced, stopped, admitted, run),
  epochs and the staging cut recorded at the fence (R2), restore of the prefix at or below the cut
  (R7), stall and hang counted in model calls and watcher ticks kept per task in `watcher.json`
  (R5, no clock), the READY rule (R5, R7), the watcher with `watcher.lock` taken with wx (R4), two
  wake sources started at endturn and `acked_seq` in `coord.json` (R6), the limit path fence, stop,
  then failed (R8), admission counting live processes including unconfirmed stops (R10), the drain
  before a coordinator hand-over (R12), `status --reconcile` at every turn start (R3), the --ce
  fence (R2, R6). Faults are actions charged to the budget when they run.
- `check.mjs`: one configuration (or one part of it) per process; compact byte-encoded states in
  typed arrays, counted against `--mem-mb`; safety on every state and transition, then deadlock,
  AG EF, busy loop (cycles of untimed steps) and AF under weak fairness per process (SCCs).
- `configs.mjs`: every configuration. `run-all.mjs`: splits each configuration into its maximal
  fault-kind multisets (an exact partition, see the header of run-all.mjs) and runs the parts on
  `os.availableParallelism() - 2` workers, each with `--max-old-space-size` = 60 % of free memory
  divided by the number of workers.

Run: `node run-all.mjs` (all), `node run-all.mjs --only DF2-K3-R1`, or one part:
`node check.mjs DF2-K3-R1 --bud k=3,cs=1,cv=1,cd=1 --mem-mb 300 | node show.mjs`.

Names: `D*` = the adopted design as written, `DF*` = design + the candidate fixes (`FIX_*`),
`A-*` = one mechanism of the design removed from DF, `X-*` = one candidate fix removed from DF.
`D2-K3-R1` = 2 fields, 3 faults, restart limit R=1.

Readings the design does not settle (each is a parameter):

- A background command's exit wakes the session that started it, also when it was killed
  (`KILL_WAKES`, fact 2). A notification that arrives between two tool calls of a turn is consumed
  by that turn; one that arrives during or after the last call starts a new turn.
- The alarm's period is longer than any turn, so it never fires mid-turn.
- A healthy child makes a model call between two watcher ticks (the c and h timeliness); a child
  stuck in a slow call (fault cs) may come back at any time, and is not forced to by fairness.
- The owner ends an escalated zombie and starts the fresh coordinator (both weakly fair) and wakes
  the tree only when no wake source of the current ce is alive; liveness counts that wake only after
  two wake losses (lost wakes plus dead turns) or a host reset.
