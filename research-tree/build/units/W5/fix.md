# W5 fix round (FX-W5 after `refute/W5.md`, BREAKING on the merge with W6; branch R1)

- **Branch** `u/W5`, **final commit `94b732db`**. Merge commit **`f03772db`**: `build` 35647885 (W6 and REDO landed)
  into u/W5 at 34e49baa, textually clean, no conflict. Then `35fd2e20` (tests) and `94b732db` (one spec line).
- **What changed: no code** (`tcb/watch.mjs` is the merge's). The re-raise works under FX-W6's hang; only W5's
  test setup was stale.
  - `tcb/test/watch.test.mjs`, **W5 stuck**: `model_ticks: 2` in place of `hang_ticks: 2` (read by no script since
    FX-W6), one more quiet tick for the epoch's first tick, onset at tick 3, `at - 3 === 285`.
  - New test **W5 stuck stays** (for M18): a planned row's act-due with `stuck_raises` 1 is stuck at its 4th raise;
    acknowledged, then quiet ticks 1 and 59 after that raise: exit 0, `stuck` still `[ident]`, `reraise` 4, nothing
    raised (FIX-wake.md:318; FX-W4 reads `stuck` at its own times, FIX-wake.md:284-288).
  - `spec/watch.mjs.md`: the new test in the section's test list. `departures/W5.md`: items 6 and 7.
- **Tests**, through MAIN's lane:
  - `W5fix-w5` (worktree, the bytes committed as 35fd2e20): `--test-name-pattern="^W5 "`: 3 tests, 3 pass,
    0 fail, 0 not-run (3.1 s).
  - `W5fix-M18` (scratch copy, not committed: `git archive` of 35fd2e20's `research-tree/tcb` in the scratchpad,
    M18 applied by moving the `stuck` push inside the raise block; removed after): 3 tests, 2 pass, **1 fail**:
    W5 stuck stays, "still stuck 1 ticks after the raise", actual `[]`, expected
    `['17|f1-research:replace-fence|0']`. W5 re-raise and W5 stuck pass under M18, as the refuter found.
  - `W5fix-watch` (worktree at 35fd2e20; 94b732db differs only in the spec): the whole `tcb/test/watch.test.mjs`:
    75 tests, 71 pass, 0 fail, 4 not-run (the needs-app NA1-NA4) (61.0 s). W5 stuck stays passes there.
- **Not done:** the other survivors (M1, M8, M9, M10, M14) are on the root's end list; the refuter's small items
  (FX-W6 re-arms `age-cap` at its acknowledgement, so B5.2 has no `stuck` path; the 225/285 reading; CONTRACT 3.10
  and decision 40) stay with W6's review and S2.1; the full suite is the root's.
- **Tokens:** build-invariant: W5 fix round for the merge with W6 | calls 29 | tokens 2.64 M | context now 110.5 K
  (before this file).
