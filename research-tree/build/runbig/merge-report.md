# Merge of `build` into `top9/track-plan` (2026-11-24)

- Merge commit: 958566861aa9a1f10c69df0e3ee1d9cf6c4b50dd (793 files; not pushed). Author Muhammad Bilal.
- Moved aside: 681 byte-equal untracked files (of 721 untracked under research-tree/build and model; 0 differed, 40 not on build stay) to C:/Users/User/Documents/projects/harness-engineering-aside-2026-11-24/, relative paths kept.
- Merge blocker: none. RUN-BIG-STATE.md (modified by another session) was not touched by the merge; other sessions' edits left unstaged.
- Reconciliations:
  - TOP-STATE.md: working branch's 554-line note kept, then a one-line separator and build's 21-line older note (diff vs HEAD: +26 lines; vs build: +559).
  - units/P0/check-commit.test.mjs: took the working branch's hunk (T8: a hand-appended record is refused, journal.mjs append commits), dropped build's hand-append lines. Diff vs HEAD: none; vs build: +6/-4. Test alone: 20 pass, 0 fail.
- Suite (research-tree/build/tools/suite.sh, 4 selftest shards): wall 185.5 s. Others 1088 tests, 1035 pass, 2 fail (one test, FX-CLOSE T1 (c), reported at two levels), 51 skipped; shards 31 tests, 28 pass, 0 fail, 3 skipped. FX-CLOSE T1 alone: 5 of 5 pass.
- Worktrees: NOT removed. The auto-mode permission check denied `git worktree remove` for the 21 `.claude/worktrees/*` unit worktrees (CGATE CLAIM CLOSE OUT PLAN REDO S0.4 S0.5 S0.6 S2.1 S2.2 W1 W2 W2m W3 W3m W4 W5 W6 W7). `hb` (branch build) kept.

## Second merge

- Merge commit: 06ba3103e82658b1b1644b8ee378e7ce4441f059 (build tip de7ea70e into top9/track-plan; not pushed). Author Muhammad Bilal.
- Files: 38 (34 modified, 4 added), all under research-tree/tcb and research-tree/spec.
- Moved aside: none needed. Conflicts: none. Other sessions' changes left unstaged.
- Tests through MAIN's lane (not the full suite): guard-hook.test.mjs 34 tests, 31 pass, 0 fail, 3 skipped; lib.test.mjs 206 tests, 204 pass, 0 fail, 2 skipped.

## Third merge

- Merge commit: 11288a0cdd9579cc7b4a4db65b5baf74d987fe17 (build tip 2662bb99 into top9/track-plan; not pushed). Author Muhammad Bilal.
- Files: 7 (all modified, none added), all under research-tree/tcb (briefs/coordinator.md, fixtures/watch/_testdata.json, guard-hook.mjs, test/guard-hook.test.mjs, test/watch.test.mjs, thresholds.json, watch.mjs).
- Moved aside: none needed. Conflicts: none. Other sessions' changes left unstaged.
- Tests (run directly with node --test, not the lane): guard-hook.test.mjs 35 tests, 32 pass, 0 fail, 3 skipped; lib.test.mjs 206 tests, 204 pass, 0 fail, 2 skipped; watch.test.mjs 87 tests, 83 pass, 0 fail, 4 skipped.
