# PC: rebase check (onto build d226e934)

Branch u/PC, final commit 4c0f2cf7 (8559632d, 4c0f2cf7 on d226e934). No fix needed, nothing new committed; not landed.

What the rebase kept, checked against the diff d226e934..4c0f2cf7:
- PA: tcb/settings/control.json carries the tier hook PreToolUse entry (Agent|Task|mcp__ccd_session__start_session).
- PB2: control denies Agent and Task and allows no Agent rule, so nothing is shadowed; PB2's guard-hook T6 Task loop and
  T14 PB2 filter stay, PC's control cases sit beside them. spec/guard-hook.mjs.md keeps PB2's Task note and adds PC's.
- thresholds.json: PT's B_tokens, r_tokens, f5_given, s2_allowed unchanged; PC's W_quality 280000 and attempt_max_ticks 107 present.

Tests (all through MAIN's lane):
| file | pass | fail | skipped | lane label |
|---|---|---|---|---|
| replace, stop, lib, cost, watch (one call) | 454 | 0 | 13 (all needs-app) | PC-rebase-5files |
| guard-hook (detached checkout hx-PC, removed) | 31 | 0 | 3 | PC-rebase-guard-hook |
| selftest, 4 shards; PA-4 and PB2 added to shards 2 and 3 (missing from shards.cmds) | 31 | 0 | 2 (needs-app 11, 7) | PC-rebase-selftest-shards |

Test files for land.mjs: tcb/test/replace.test.mjs tcb/test/guard-hook.test.mjs tcb/test/selftest.test.mjs
tcb/test/watch.test.mjs tcb/test/stop.test.mjs tcb/test/lib.test.mjs tcb/test/cost.test.mjs
