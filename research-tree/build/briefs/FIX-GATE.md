# FIX-GATE: the review's breaking findings in the plan gate (2026-11-19)

Kind build-invariant, Opus. Asked by the top session: one blind review (`research-tree/build/refute/P0-GATE.md`)
found these break. Commit nothing.

**Fix, each with a test that fails on the current code and passes on yours** (read the verdict file first):
1. Finding 5: a unit is not done while a helper for it is running (started in the gate's log, no end), even when
   its done file exists; the same for a refuter's unit.
2. Finding 6: a helper continued with SendMessage after its SubagentStop runs again: count it as running for its
   unit (log the continuation as a start against the target agent id, ended again by its next SubagentStop), so
   the width and one-helper checks see it. If a hook registration must be added for SendMessage, add it to
   `.claude/settings.json`'s `hooks` section only, after the tests pass.
3. The verdict's invariants of the gate that no test guards: add a test for each.
Update `research-tree/build/briefs/GATE-USE.md` if what the root must do changes.

**Files you may change:** `.claude/hooks/plan-gate.mjs`, `.claude/hooks/plan-gate.test.mjs`,
`research-tree/build/briefs/GATE-USE.md`, the `hooks` section of `.claude/settings.json`. Another helper (FIX-GUARD)
is changing the record guard, the commit check and the record guard's matcher in the settings now: do not touch
them. The gate is live for every session: test a new version beside the old one, then swap it in. The build's root
session may be starting helpers while you work: do not clear or rewrite `.claude/logs/plan-gate.jsonl`.

**Done** = all tests pass (`node --test .claude/hooks/plan-gate.test.mjs`) and
`research-tree/build/units/FIX-GATE/result.md` lists each finding, its test, before and after, and your tokens.
Every Bash call under 150 s. **Tokens (r57-0038):** expected 10.9 M, limit 29.2 M; at about 330 K context write
`units/FIX-GATE/checkpoint.md` and return "LIMIT". Return at most 8 lines.
