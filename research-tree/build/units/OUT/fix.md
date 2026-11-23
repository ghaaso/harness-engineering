# OUT fix round (FX-OUT): the fence test after REDO landed (2026-11-20)

- **Cause: the test's setup, not a conflict.** The landing of `u/OUT` 558797e4 failed FX-OUT 3's subtest "a fence of a
  running attempt writes one fenced slot, then the CAS" (replace.test.mjs:704): its second call was the same fence
  as the first (`--epoch 1 --reason stall`, only the tick differed). With REDO in the merge, `modeFence` runs
  `fenceRedo` first in the hold. The row was at the exact post-state (epoch 2, step `fenced`, reason `stall`,
  `attempts[1].cut` set), so the call answered 0 `repeat`, as REDO designed (departures/REDO.md item 8, its T9
  change). The test expected 65 `stale-epoch`.
- **Why the two designs do not conflict** (FIX-fence 1 and 5; FIX-JOIN 2b row 5): the fence writes the slot, then
  the tombstone, then the CAS, then the line.
  - A death before the CAS leaves the slot with the row still at E. That is never REDO's post-state, so FX-OUT's
    retry path completes it, and only with its own reason.
  - A death after the CAS leaves the row at E+1 with the line missing. Only REDO's repeat answers there, and it
    writes only the line. OUT's steps never run at that point: their step 3 would have refused 65 with no write.
  - So each death point has exactly one runner, and no code change or departure was needed.
- **Change** (commit `6b5c48da` on `u/OUT`, parent 558797e4; worktree `.claude/worktrees/OUT`):
  - The subtest still runs the fence first: one fenced slot, then the CAS.
  - It then drops the fence line, which is the state a death after the CAS leaves.
  - A fence of another reason (`hang`) now exits 65 `fence-pending` {reason `stall`} and writes nothing (the tree
    hash is unchanged).
  - The same fence is the repeat: exit 0, `repeat` and `redo` true, one `fence` line with `redo: true`, still only
    `0.json` in the log, and the ledger verifies.
  - The FX-OUT tests bullet in `spec/replace.mjs.md` now says this.
  - REDO's file is untouched. `departures/OUT.md` is unchanged: there is no departure.
- **Tests:** one lane call, label `OUTfix-replace-redo` (TAP, T 55, W 90, from the worktree's `research-tree/`),
  `node --test tcb/test/replace.test.mjs tcb/test/redo.test.mjs`: lane exit 0, `# tests 96`, `# pass 94`,
  `# fail 0`, `# skipped 2`, 26.5 s.
  - replace.test.mjs: 89 tests, 87 pass, 0 fail, 2 not run (NA1, NA2 need the app).
  - redo.test.mjs: 7 tests, 7 pass.
  - Log (not in the repository):
    `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad/OUTfix/lane-1.log`.
  - OUT's other test files were not run; the landing runs them.
- **Tokens:** `build-invariant: OUT fix of its fence test with REDO | calls 28 | tokens 3.06 M | context now 144.8 K`
  (expected about 2.5 M, limit 4 M). There was no WARNING line, so the counter read this transcript.
