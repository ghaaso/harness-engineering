# REFUTE: P0 and the plan gate, one blind review (2026-11-19)

Kind refute, Opus. A fresh context: you did not build these and must try to break them. Commit nothing; do not
edit the hooks or the settings; write only `research-tree/build/refute/P0-GATE.md` and scratch files outside the
repository.

**What was asked.** `research-tree/build/briefs/P0.md` and `research-tree/build/briefs/GATE.md`. What the builders
say they did: `research-tree/build/units/P0/result.md` and `research-tree/build/units/GATE/result.md` (read them
last, after the code). The code: `.claude/hooks/record-guard.mjs`, `.claude/hooks/selftest.mjs`,
`tools/check-commit.mjs`, `tools/git-hooks/pre-commit`, `research-tree/tools/lane.mjs` and its test, the old copies
in `research-tree/build/units/P0/old/`; `.claude/hooks/plan-gate.mjs`, `.claude/hooks/plan-gate.test.mjs`,
`research-tree/build/plan.json`, `research-tree/build/briefs/GATE-USE.md`; `.claude/settings.json` (the gate is
registered; the record guard's wider matcher "Write|Edit|MultiEdit|NotebookEdit|AskUserQuestion|Bash|PowerShell"
is not yet: test that part by running the script on hook inputs).

**Try to break, in this order.**
1. A write to archived evidence or a non-append write to the journal (CLAUDE.md rule 1; `library/README.md`) that
   the guard lets through: path forms, worktrees inside and outside `.claude/worktrees/`, Bash and PowerShell
   commands (redirections, `sed -i`, `mv`, `rm`, `cp`, `tee`, node or PowerShell one-liners), MultiEdit. Say
   which of these a hook can and cannot see.
2. A false refusal that would stop the build: ordinary commands of a builder or the root (git, node --test, the
   lane, worktree add, writing `research-tree/build/` files, appending to the journal).
3. The gate: a start it lets through that `plan.json` forbids, or refuses that the plan allows; `plan.json` against
   `research-tree/ORCHESTRATION.md` sections 2, 3, 6, 13 and `research-tree/BUILD-PLAN.md` section 2 (units,
   kinds, models, dependencies, widths, done forms); several starts in one message; a helper killed without an end.
4. A crash or a hang of any hook on odd input (empty, huge, malformed JSON, missing fields), and what the app does
   then.
5. For each invariant, one mutation of the code that its tests must catch; name any invariant no test guards.

**Verdict** in `research-tree/build/refute/P0-GATE.md`: "pass", or each breaking finding with the input that shows
it and the smallest fix; then a list of non-breaking items. A finding breaks only if it lets a forbidden write or
start through, or would stop the build. Every Bash call under 150 s. **Tokens (r57-0038):** two refuter units,
expected 10.8 M, limit 31.2 M (ORCHESTRATION.md section 3, refuter row, twice); at about 330 K context write what
you have and return "LIMIT". Return at most 10 lines.
