# PA2: report (written by the coordinator, session 69517214, from the builder's returned text; the app refused the builder's own write)

- Branch u/PA2, unit commit 27ac0cf41e19176597041679f36c09696714d34e; worktree MAIN/.claude/worktrees/PA2 (where the earlier units' worktrees are).
- Landed: build f32dbdd6678b65e5478ddad24f1ec2a305b601ae (pre de7ea70e); land.mjs exit 0. Files: research-tree/tcb/guard-hook.mjs (+19), research-tree/tcb/test/guard-hook.test.mjs (+30).
- Fix (refute/FX-PILOT-PA.md B1): the guard hook's agent branch runs `helperRouteProblem` whenever tier-routes.json can be read; it refuses with `bad-route` a helper type with no route, a description whose kind is not the type's route, or a model that is not that kind's model.
- Test REFUTE-PA-1: the refuter's 4 wrong starts and 4 more refused; one right start of each type allowed.
- Tests: guard-hook.test.mjs 32 pass, 0 fail, 3 skipped (lane label PA2-guard-tier, and again at the landing); selftest.test.mjs at the landing 31 pass, 0 fail, 2 skipped. tier-hook.mjs unchanged (no test file); lib.mjs untouched.
- Left: the refuter's four non-breaking items. No departures.
