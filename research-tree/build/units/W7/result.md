# W7 result (FX-W7: the watcher lock under the run lock; a busy run lock skips the tick)

- **Branch** `u/W7` (worktree `.claude/worktrees/W7`, cut from `build` ec3b04fd), **final commit `bb0295bb`**.
- **Built.**
  - lib `acquireLock` (step 1): `watcher.json` is read right before a watcher.lock holder is judged;
    a holder judged dead is broken in `breakStep` only under the run lock, and only while watcher.lock
    and `watcher.json` are byte-for-byte as at the judgement. A change means `progress`: the verdict is
    dropped and the holder is judged again. Unknown is never broken (L1). The unreadable-lock rule is
    kept (LR-4 (b)).
  - watch (step 2): `evaluateCopy` evaluates `structuredClone` of the kept state. `holdTick` waits
    about `watcher_lock_try_ms` for the run lock, then runs in one hold: `assertHeld`, the appends,
    due/pending, the `watcher.json` write and `adoptState`. On a busy run lock the copy is dropped
    (only its `intake` record is kept), `assertHeld` runs outside the hold, and
    `run/watcher-busy.json` gets one more busy tick. The loop does not exit on it (B6.1); `--once`
    exits 75 `lock-busy`.
  - Step 3: an unparseable `watcher.json` is quarantined (`watcher.json.<pid>.<nonce8>.corrupt`,
    `result.quarantined`) instead of exiting 67.
  - No `watcher_lease_ticks` (L1); no `run_lock_lease_ms` (RL-no).
  - CONTRACT 3.10 and 4.4, spec/lib.md, spec/watch.mjs.md.
- **Tests**, through MAIN's lane from the worktree's `research-tree/`, label `W7-lib-watch`, on the code
  of bb0295bb (`node --test tcb/test/lib.test.mjs tcb/test/watch.test.mjs`, one call, 53.1 s):
  - Both files together: 265 tests, 259 pass, 0 fail, 6 not-run (the needs-app tests).
  - Split per file, derived: watch.test.mjs 70 (S0.5's 69 + W7b), 66 pass, 4 not-run; lib.test.mjs
    195, 193 pass, 2 not-run.
  - New: W7a (lib: break only under the run lock, not on a busy run lock, not after the holder wrote
    `watcher.json`) and W7b (watch: busy ticks drop the copy, nothing written, not counted,
    `busy_ticks` 1, 2, ...; the loop stays up; after the release one event line, `ticks_total` 0, busy
    0; a following `--once` adds no second line). Both pass.
  - Changed: T17's first half now expects the quarantine (step 3).
  - guard-hook.test.mjs not run (guard-hook untouched). The full suite is the root's.
- **Departures:** `research-tree/build/departures/W7.md` (9 items: the dropped copy keeps its intake
  record; `--once` busy exits 75; a dropped start evaluation stays uncounted; `breakStep(c, doBreak)` and
  `progress`; the quarantine's name and report and T17; the busy count across watchers; the short try
  as retries; the fixture key; L1, RL-no and LR-4 (b) kept).
- **Tokens:** build-invariant: W7 lock and watcher state | calls 78 | tokens 14.92 M | context now 285.5 K
  (expected 11.7 M, limit 29.2 M; no checkpoint needed).
- **Not done:**
  - Departure 1 (intake record kept on a busy tick) has no test.
  - FX-W4's reading of `watcher-busy.json` and its alert at `busy_alert_ticks` belong to FX-W4.
  - CONTRACT §2.1's single-writer table does not list `run/watcher-busy.json`; §3.10 names its writer.
  - FX-W7 is in no model (branches.md thin item 6).
  - The worktree's `research-tree/tmp/w7/run1.log` (the lane log) is not committed.
