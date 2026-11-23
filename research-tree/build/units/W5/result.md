# W5 result (FX-W5: act-due raised again while its condition holds; branch R1)

- **Branch** `u/W5`, **final commit `34e49baa`** (parent ec3b04fd). Files: `tcb/watch.mjs` (`ownerOrNone`,
  `reraiseStuck` and its call line), `tcb/test/watch.test.mjs` (2 tests), `tcb/schemas/watcher.schema.json`
  (`reraise`, `stuck`), `spec/watch.mjs.md` (new section "Raised again while the condition holds").
- **Tests**, through MAIN's lane from the worktree's `research-tree/`:
  - `W5-new`: watch.test.mjs `--test-name-pattern="^W5 "`: 2 tests, 2 pass, 0 fail, 0 not-run (2.8 s).
  - `W5-watch`: watch.test.mjs whole: 71 tests, 67 pass, 0 fail, 4 not-run (the needs-app NA1-NA4) (53.1 s).
  - No other script changed; guard-hook not touched, so not run. The schema change was checked once with
    `lib.validate` on a sample (accepts the fields, refuses a count of 0); no test reads that schema.
- **What is built.** Step 1: `ownerOrNone(planned)` is true for `owner` and `none`. Steps 2-3: an
  acknowledged, still-present act-due (17 but `run-terminal`) or stall/hang/loop (20-22) is raised again
  after 15, 30, 60, then 60 ticks as a new key and one new `event` line (`detail.reraise` n); `stuck_count`
  = n − 3; at `stuck_raises` (3) the ident is in `watcher.json.stuck` (285 ticks after the onset);
  `reraise` and `stuck` are rebuilt from the present idents, so an ident leaving the active set leaves both.
- **Departures:** `research-tree/build/departures/W5.md` (5 items: the step's fifth argument; the classes
  raised again, `run-terminal` left out; the reading of step 3 that gives FW:54's 285 ticks; the interval
  constants as guesses in code and the `stuck_raises` fallback; a re-raise is a new key, CONTRACT 3.10 and
  decision 40 left to S2.1).
- **Not done:** step 1 acts only once FX-PLAN fills `rowActPlanned` (B1-2): until then a zombie-over row can
  still raise its row act (as built) and is now raised again, the A5.2 cost; CONTRACT 3.10 / decision 40 text
  (departure 5); the full suite is the root's.
- **Tokens:** build-invariant: W5 watcher evaluate steps | calls 78 | tokens 15.18 M | context now 313.5 K
