# S2.1 fix: N2 tests run raise's real exit 2

Commit c970fc03 on u/S2.1 (on 2687415f). Test file only: tcb/test/status.test.mjs.

## Changes
1. "S2.1 N2 after handover exit 2" replaced. After a reconcile (live watcher and alarm) it adds a drain line of ce 1,
   points proc_exe at NO_LIST, and runs a real `handover raise --ce 1` (no dry run): asserts exit 2 with reason
   proc-unavailable and the whole tree unchanged (snapshotTree), coord.json still ce 1, no acked.json. Then endturn
   with K: exit 2, no turn-stale/acked-*/no-coordinator, proc-unavailable, sources unknown, acked_seq = K, arm spent.
2. C5: the exit-75 test's `hasReason(j, ...)` now `hasReason(j.json, ...)` (live); the old exit-2 test's dead ones went with it.

## Counts and lane labels
- S2.1fix-n2b: status --test-name-pattern S2.1: 3 pass, 1 todo (dead-man, W4 not landed), 0 fail. (S2.1fix-n2 was a syntax slip, fixed.)
- S2.1fix-both: status + handover files: 68 tests, 62 pass, 0 fail, 5 skipped, 1 todo.

## C4 result
Scratch copy (scratchpad/S2.1-fix/rt, handover.mjs raise writes coord.json at ce+1 before its proc-unavailable exit 2),
lane S2.1fix-c4: the new test FAILS ("raise exit 2 wrote nothing"); the brief and exit-75 tests pass. C4 caught. The worktree
was never mutated.

## Tokens
`build: S2.1 N2 test fix | calls 13 | tokens 1.12 M | context now 98.6 K` (before this file).
