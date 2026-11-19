# D. What the Claude Code documentation says (r57-0517, 2026-11-19)

A `collect` helper (claude-code-guide, Sonnet) answered from web-fetch summaries; the rows marked "raw" were then
read in the pages themselves (curl of `https://code.claude.com/docs/en/<page>.md`, 2026-11-19), the rest are summaries.

| Question | Answer | Source |
|---|---|---|
| Hide a project skill without editing its file | `skillOverrides` in settings: `"off"` hides it from Claude and the `/` menu; `"user-invocable-only"` hides it from Claude only; plugin skills are not affected | raw: skills.md lines 921-951 |
| Stop a project agent | `permissions.deny` with `Agent(<name>)`; works for built-in and custom agents. The app announced the 12 denied agents "no longer available" at once (seen here) | raw: sub-agents.md lines 748-763; permissions.md lines 602-606 |
| Do a session's hooks fire inside helpers | Yes, PreToolUse and PostToolUse fire as in the main conversation, with agent_id and agent_type (seen here for the tier hook, hc1-0103) | summary: hooks.md; sub-agents.md |
| Where a helper's worktree comes from | `.claude/worktrees/`, branched from the default branch unless `worktree.baseRef` is `"head"`; removed when unchanged (seen here: base 48660877, hc1-0102) | raw: worktrees.md lines 138, 170-188 |
| Can a helper start a helper | Yes, up to three layers below the main conversation (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`); seen here once, and the inner helper ran in the foreground (hc1-0103, hc1-0112) | raw: sub-agents.md line 1077 |
| Helpers at once | 20 running helpers per session (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`) | raw: sub-agents.md line 1104 |
| When settings changes apply | Live for permissions and hooks; skills and agents reload live except a new top-level folder | summary: settings.md, skills.md |
| SessionStart matchers | startup, resume, clear, compact, fork (seen here after a compaction, r57-0154) | summary: hooks.md |
| Bash timeout | 120 s by default, 600 s at most | summary: env-vars.md |
| Autocompaction window | `autoCompactWindow` (100,000 or more); the percentage override can only lower it | summary: env-vars.md, settings-reference.md |
| A session in a subfolder | Skills and agents are found up to the repository root; settings come from the start folder only | summary: skills.md, settings.md |
