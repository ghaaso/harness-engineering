# REDO result (FX-REDO: a missing ledger line after a death)

- **Branch** `u/REDO`, **final commit `a2346a92`** (base ec3b04fd; 2e62cbec the code and tests, a2346a92 the spec).
- **What is built** (FIX-fence section 5): each mode's own repeat completes a ledger line a death left missing,
  only at the exact post-state, inside the mode's hold, rebuilt from the row with `data.redo: true`, exit 0
  `repeat` with `result.redo`: `replace fence` (row at E+1, fenced, same reason, `attempts[E].cut`; checked
  before every refusal, any later step keeps 65), `replace start` (admit), `replace bind` (same session),
  `status --reconcile` (started), `stop request` (stop-request; at stopped the confirmed stop), `stop verify`
  (confirmed stop, under the lock only when the line looks missing). Fsck: anomaly `ledger-line-missing`
  (`<task>-e<epoch>:<kind>`). Render: with a redo line in the set, a task starts at its bind/started line of the
  lowest epoch. Spec sections in replace, stop, status, fsck, render.
- **Tests**, through MAIN's lane at 2e62cbec, from the worktree's `research-tree/` (skipped = needs-app tests):
  - `REDO-redo`: redo.test.mjs (new): 5 tests (1 test, 4 subtests), 5 pass, 0 fail, 0 not-run (6.4 s).
  - `REDO-replace-stop-render`: replace.test.mjs + stop.test.mjs + render.test.mjs (T28 new): 154 tests, 146 pass,
    0 fail, 8 not-run.
  - `REDO-status-fsck-redo`: status.test.mjs + fsck.test.mjs + redo.test.mjs: 57 tests, 55 pass, 0 fail, 2 not-run.
  - a2346a92 changes only `spec/`; not rerun.
- **Departures:** `research-tree/build/departures/REDO.md` (9 items; among them: the test in its own file plus
  render's T28, 2 tests not 1; replace.test.mjs T9's second concurrent fence now has another reason, since an
  identical one is a repeat; `stop request` at stopped also completes the stop line; start's death not driven
  through the seam).
- **Not done:** the death of `replace start` through the seam (needs the admission world); fsck cannot see a
  `started` or `stop-request` line missing after the row moved on; `first` fences, no-attempt cuts, the `limit`
  incident and the cut's `overflow` line are outside F5's table. No refuter of its own (combined review B1-4).
- **Tokens:** build-invariant: REDO ledger line after a death | calls 89 | tokens 17.24 M | context now 317.4 K
