# W4 result (FX-W4, the dead-man), 2026-11-20

- **Branch** `u/W4`, final commit **439a50c6** (worktree `MAIN/.claude/worktrees/W4`). `build` tip cc6df491
  (S2.1 landed) is merged in, without conflicts.
- **Built.** `tcb/status.mjs`:
  - `status --deadman --root R` reads the ce from coord.json. It has 7 causes and re-alerts every
    `realert_runs` runs (P1), and writes `run/deadman.json` without a lock.
  - The status view's anomaly `deadman-nowake` reports `no-run`, `unreadable`, `stale` or `gap`.
- **Also written.**
  - `tcb/settings/deadman-task.xml`: a file only. Nothing is installed, registered or scheduled.
  - The four tests, and the two test values in the status fixture.
  - spec/status.mjs.md.
  - CONTRACT: 1.4, 2.1, 3.8, 3.9 [deadman] and decision 41.
  - Coordinator brief 0c, the FX-W4 line of spec/briefs.md, and the deadman entry of lib `RUNTIME_FILES`.
  - S2.1's `todo` test is adapted to the built fields and its `todo` dropped.
- **Tests** (MAIN's lane):
  - `W4-status2`, status.test.mjs at 439a50c6 after the merge: 49 tests, 47 pass, 0 fail, 2 skipped (NA1,
    NA2), 0 todo.
  - Before the merge: `W4-dm` (the four FX-W4 tests) 4 of 4 pass; `W4-status` 45 tests, 43 pass, 2 skipped.
  - `W4-guard`, guard-hook.test.mjs from the detached checkout `hx-W4` outside `.claude/`: 31 tests, 28 pass,
    0 fail, 3 skipped. T16 accepts the new Command line.
- **e2e** (`W4-e2e`, the same checkout at 439a50c6): 239/239 steps ok, 0 FAIL.
- **Departures:** `research-tree/build/departures/W4.md` (10 items).
- **W2's open gap** (N3: S1's single death right after an alarm wake) is now covered by the `no-alarm` cause.
  Two runs (5-10 min) with no live alarm of the ce alert the owner. Shown in "FX-W4 dead-man, the list
  answering" and in S2.1's test.
- **Tokens:**
  - builder 1: `calls 80 | tokens 15.23 M | context 312.6 K` (at its checkpoint);
  - successor: `build-invariant: W4 dead-man successor | calls 82 | tokens 12.67 M | context now 214.4 K`,
    plus this file;
  - unit total about 27.9 M, under the 29.2 M limit.
- **Not done or not verified:**
  - The task file has never been imported. Not known: whether the toast reaches the owner, and whether a
    console flashes at each run.
  - lib.test.mjs and selftest.test.mjs were not run. The only lib.mjs change is the deadman entry's
    `writer`/`fields` strings, which the test does not read.
  - The hook still admits `status --deadman` for the coordinator. Brief 0c forbids it (departure 7).
