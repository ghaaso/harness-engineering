# Excerpt: Claude Code documentation, sub-agents page (fork mode and nesting)

Source: https://code.claude.com/docs/en/sub-agents.md, fetched raw with curl on 2026-11-19 by the r57-0517 check (saved in a session scratchpad, 116327 bytes, 1190caa9852cc0dd...). Lines quoted as they stand; kept here because the scratchpad is temporary.

## Lines 936-947

```text
#### Which subagents run in the background

With nothing configured, a subagent that Claude spawns from your main conversation starts in the background.

* **`claude -p` and the Agent SDK**: Claude can wait, on its own judgment or when you ask.
* **Interactive terminal session, VS Code, and desktop app sessions on your machine**: to let Claude wait for a subagent, [turn off fork mode](#let-claude-wait-for-a-subagent), which is [on by default](#turn-fork-mode-on-or-off).

For a skill with `context: fork`, Claude Code follows the rules in [Run skills in a subagent](https://code.claude.com/docs/en/skills.md#run-skills-in-a-subagent) instead, whether or not fork mode is on.

#### Let Claude wait for a subagent

1. Turn [fork mode](#turn-fork-mode-on-or-off) off by setting `CLAUDE_CODE_FORK_SUBAGENT` to `0`, for example in [`settings.json`](https://code.claude.com/docs/en/settings):
```

## Lines 1077-1084

```text
By default, a subagent can spawn subagents of its own, up to three layers below the main conversation. At the depth limit, Claude Code withholds the `Agent` tool from every subagent except a [fork](#fork-the-current-conversation), so a subagent at the limit does its delegated work itself and returns one summary. A fork at the limit keeps `Agent` in its inherited tool list, but the tool returns an error instead of spawning.

Nested subagents suit a delegated task that itself splits into parallel subtasks, such as a reviewer subagent that dispatches a verifier per finding. By default the spawning subagent waits for each nested subagent's report:

* **Interactive terminal session**: only the top-level subagent's summary returns to you, because a subagent that launches background subagents waits for their results before it finishes.
* **`claude -p` and the Agent SDK**: the spawning subagent waits while [fork mode](#turn-fork-mode-on-or-off) is on. If you turn fork mode off, nested subagents start in the [background](#run-subagents-in-foreground-or-background) instead. The spawning subagent doesn't wait for a background nested subagent, which reports to your main conversation if it outlasts the spawning subagent.

To change the limit, set [`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`](https://code.claude.com/docs/en/env-vars) to the number of subagent layers you want below your main conversation. For example, this entry in [`settings.json`](https://code.claude.com/docs/en/settings) caps nesting at two layers:
```

## Lines 1102-1104

```text
Two limits control subagent use, each with its own variable: this one stops Claude from spawning more subagents while too many are running, and the [depth limit](#let-subagents-spawn-their-own-subagents) caps how deeply subagents nest. There's no limit on the total number of subagents Claude can spawn over a session.

By default, when 20 subagents are running in a session, spawning another with the Agent tool fails with `Concurrent subagent limit reached`, and the error tells Claude not to retry. Spawning succeeds again when the running count drops below the limit. To change the limit, set [`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`](https://code.claude.com/docs/en/env-vars) to any positive whole number. Sessions with [ultracode](https://code.claude.com/docs/en/model-config.md#adjust-effort-level) active are exempt: the limit isn't enforced there. Requires Claude Code v2.1.217 or later.
```

## Lines 1292-1299

```text
### Turn fork mode off

Fork mode lets Claude start a fork on its own. To stop Claude from starting forks:

* **Stop forks only**: add `"Agent(fork)"` to `permissions.deny` in your [settings](#disable-specific-subagents).
* **Turn fork mode off**: set `CLAUDE_CODE_FORK_SUBAGENT` to `0`, following the steps in [Let Claude wait for a subagent](#let-claude-wait-for-a-subagent).

While fork mode is on, Claude also can't [wait for a subagent](#run-subagents-in-foreground-or-background) in interactive terminal, VS Code, or desktop sessions on your machine. Fork mode is on by default from Claude Code v2.1.302, and in an interactive terminal session from v2.1.232.
```

