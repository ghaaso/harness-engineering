# S0.4 (0b) result

- Branch `u/S0.4` (worktree `.claude/worktrees/S0.4`); final commit **f76dd314** (code and tests 11684589, specs and
  CONTRACT f76dd314).
- Tests (lane, only this unit's files):
  - `tcb/test/lib.test.mjs`, label `S0.4-lib-hook` (run with guard-hook in one call): 191 pass, 0 fail, 2 skipped
    (new T22b, T22c pass).
  - `tcb/test/guard-hook.test.mjs`, label `S0.4-hook-outside`, run in a detached checkout of u/S0.4 (11684589) at a
    path outside `.claude/`, removed after: 17 pass, 0 fail, 3 skipped (new T15 passes). In the worktree itself
    (label `S0.4-lib-hook`) T2, T3, T4, T11 and T13 fail: every write path there has a `.claude` segment, so the
    hook denies it `write-claude`. That is the location, not this change (the code that decides it is untouched);
    a refuter's scratch worktree under `.claude/worktrees/` meets the same.
  - `tcb/test/selftest.test.mjs`, label `S0.4-selftest-shards`, the 4 shards of `shards.cmds` in one lane call
    (logs in the worktree's `.s04-logs/`, not committed): 29 pass, 0 fail, 2 skipped (T1, T11, T12, T13 extended;
    the names keep their shard prefixes).
- Departures: `research-tree/build/departures/S0.4.md` (7 items: exit codes the design left open, the budget's
  reach, the clock's start, `hookCreate`/`hookWrite`, the probe's form and when it runs, CONTRACT 1.1 and 4.3, R13).
- Tokens: `build-invariant: S0.4 0b strict writes, link check | calls 81 | tokens 15.68 M | context now 320.7 K`
  (over the expected 11.7 M, under the limit 29.2 M).
- Not done: no hook step writes yet (FX-OUT, FX-CLAIM, FX-CGATE add the calls through `hookCreate`, B4); R13's
  sentence in the protocol document (outside this unit's files); the full suite (the root's).
