# S0.6 result: the landing script (2026-11-19)

- **Branch** `u/S0.6` (worktree `MAIN/.claude/worktrees/S0.6`), **final commit 245641e0**: `research-tree/tools/land.mjs`
  and `research-tree/tools/land.test.mjs`.
- **Tests** (unit's own file only, through MAIN's lane from the worktree's `research-tree/`):
  - `tools/land.test.mjs`, label `S0.6-land`, run 1: 1 pass, 6 fail, 0 not-run (22 s). Cause: `NODE_TEST_CONTEXT`
    from the outer `node --test` made nested runs report nothing and exit 0; fixed (departure 7).
  - `tools/land.test.mjs`, label `S0.6-land`, run 2 on the final code: **7 pass, 0 fail, 0 not-run, 41.0 s**
    (log: worktree `research-tree/tools/land-test-run2.log`, not committed). L1 pass and record (worktree made, main
    checkout and `.claude` refused, lock, exit 6, unchanged file skipped by key); L2 **a failing test file undoes the
    merge** (build back at pre, line with the failing test, exit 1); L3 conflict (aborted, exit 2); L4 re-check of a
    merge with no line (by its `Land-Files`; by the given files; none named: exit 3; failing at the tip: undone, exit 4);
    L5 flaky; L6 shards plus the rest run; L7 lane 124 and 75 are not results (undone, exit 5). All in scratch
    repositories in the OS temp folder, each with its own lane copy.
- **Departures**: `research-tree/build/departures/S0.6.md` (13 rows; row 1 is the root's `hb` default).
- **Tokens**: `build-invariant: S0.6 landing script | calls 31 | tokens 4.96 M | context now 269.9 K` (before this file).
- **Use**: `node <land.mjs> <unit> <test files relative to research-tree/>`; defaults MAIN from the script's repository,
  build worktree `C:/Users/User/Documents/projects/hb` (made if missing), MAIN's lane, `MAIN/research-tree/build/
  landings.jsonl`, logs in `MAIN/research-tree/build/landings/`. Exit 0 landed, 1 fail (undone), 2 conflict, 3 a merge
  with no line names no files, 4 its re-check failed, 5 no result (undone), 6 nothing to merge, 64 setup, 70 internal.
  A landing may make several lane calls: run it in the background or with a long timeout. For S0.4: T comes out
  106 s, W 39 s (lib 36.4 s and guard-hook 14.9 s from alone.txt, selftest's shards 70.2 s from shard4.txt).
- **For the hand landing of S0.6**: the line must carry the merge's hash under `merge` (full, or 7+ hex characters),
  or land.mjs's first run reports that merge (exit 3) until `node land.mjs S0.6 tools/land.test.mjs` checks it. T for
  `tools/land.test.mjs`: 62 s (1.5 x 41), W 83 s.
- **Not done or not tested**: no run against this repository (S0.6 lands by hand first); the real `shards.cmds` is
  parsed only by reading (the test uses a scratch shards file); no test for the 30 s floor of T, the `dirtied` put-back,
  a failing re-check below the tip (revert path), breaking a stale lock, the TAP-summary guard, or `git worktree add`
  failures.
