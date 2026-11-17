# What Claude Code itself can enforce: hooks, permission rules, settings, scripts

Collected on 2026-11-18 by a documentation helper. Source: the Claude Code documentation pages listed at
the end, read through a fetch tool that returns a summary of each page. Nothing here was tried on this
PC. Items marked "not verified" were not in the pages read. Treat every row as "documented", not as
"observed here".

Short answer of the helper: hooks and permission rules are the only mechanisms that act at the moment of
an action. Everything else either configures a session (and can be overridden) or runs after the fact.
The documentation gives no hook field for context size, and no documented way to force a compaction, end
a session from a hook, or cap tokens per interactive session.

## 1. Hooks

Configured under `hooks` in `~/.claude/settings.json`, `.claude/settings.json`,
`.claude/settings.local.json`, managed settings, plugins, or the frontmatter of a skill or subagent [H].

| Event | When | What it receives | What it can do | Limits |
|---|---|---|---|---|
| PreToolUse | Before each tool call, also calls made inside subagents | `tool_name`, `tool_input`, `tool_use_id`; `agent_id` and `agent_type` for subagent calls | Exit 2 or `permissionDecision: deny` blocks; `allow`, `ask`, `defer`; `updatedInput` replaces the whole input | A timeout does not block unless `onFailure: "block"`; the `if` filter is best-effort; `allow` cannot override a deny rule |
| PostToolUse, PostToolUseFailure | After the call | The same plus `tool_response` | `additionalContext`; `decision: "block"` as feedback | Cannot undo the action |
| PostToolBatch | After a parallel batch, before the next model call | `tool_calls[]` (name, input, id, response) | `additionalContext`; `decision: "block"` or `continue: false` stops the loop | No matcher |
| UserPromptSubmit | Before a prompt is processed | The prompt | Exit 2 or block; add context | Sees the prompt only |
| Stop, SubagentStop | A turn or a subagent ends | `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons` | Exit 2 or `decision: "block"` forces continuation, capped at 8 in a row | Must check `stop_hook_active` to avoid loops |
| PreCompact, PostCompact | Around compaction | `trigger` (manual or auto), `custom_instructions` | Exit 2 blocks a compaction | Cannot force one |
| SessionStart, SessionEnd | Start or resume; exit | `source`, sometimes `model`; on resume `context_tokens`; `reason` | Add context; clean up | SessionEnd default timeout 1.5 s |

- Agent tool under PreToolUse: the input lists `prompt`, `description`, `subagent_type` and `model`. A
  hook can deny the call or rewrite its input. `effort`, `run_in_background`, `name`, `isolation`: not verified.
- Context size is not a hook field. Every event has `transcript_path`; the transcript may lag the live
  conversation. The status line receives `context_window.used_percentage` but cannot block anything.
- The same hooks fire for tool calls inside subagents; `agent_id` and `agent_type` tell them apart.
  Hooks in a subagent's frontmatter run only while that subagent runs.
- Matching hooks run in parallel. Default timeouts: 600 s for `command` and `http`, 60 s `agent`, 30 s `prompt`.

## 2. Permission rules [P][SR]

- Order: deny, then ask, then allow. First match wins.
- `"deny": ["Agent(Explore)"]` removes one subagent type, custom ones included. `"deny": ["Agent"]` removes delegation.
- Parameter rules such as `Agent(model:opus)` match a literal field. An omitted parameter never matches.
- Bash: prefix and wildcard patterns. They miss a program called by path or inside `sh -c`; pair with the
  sandbox when a restriction must hold.
- Files: `Edit(path)` covers Write and NotebookEdit. `Read` deny is best-effort for Grep and Glob.
- Modes: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` (allow rules ignored, deny rules still apply).

## 3. Agent definitions and model control [S]

- Frontmatter: `model` (alias, full id or `inherit`), `effort`, `tools`, `disallowedTools`,
  `permissionMode`, `maxTurns`, `autoCompactWindow` (100000 to 1000000), `hooks`, `isolation`, `background`.
- Which model a helper gets, in order: the per-call `model` parameter, then the frontmatter, then
  `CLAUDE_CODE_SUBAGENT_MODEL`, then the parent's model. So a caller CAN override a definition's model.
- `CLAUDE_CODE_SUBAGENT_MODEL` with `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` ignores both: one model for
  every helper, not a tier per role.

## 4. Session bounds

- `autoCompactWindow` in settings, also per model under `modelSettings`; `/autocompact <tokens>`.
- `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20); `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default 3).
- `maxTurns` per subagent. `--max-budget-usd` only with `-p`.
- No session-wide token or context cap is documented.

## 5. Scripts that decide, and scripts in the middle of a session

- **Workflow scripts** [W]: the script, not the model, decides which `agent()` calls run, in `parallel()`
  or `pipeline()`, with a model and a schema per call. 16 agents at once by default
  (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`, up to 256), 1,000 per run. The script has no file or
  shell access itself.
- **Headless `claude -p`** [HL]: `--allowedTools`, `--permission-mode`, `--settings`, `--agents`,
  `--max-budget-usd`, `--output-format json`. `--bare` skips hooks. SIGTERM ends the run after SessionEnd hooks.
- **Background commands** [TR][HL]: a command the session starts keeps running. A Monitor watch feeds
  each output line into the conversation (default deadline 5 min, most 30 min). No documented way for a
  watcher outside the session to interrupt a turn.
- **Channels** [CH]: an MCP server can push messages into a running session; a research preview. Whether
  it can interrupt a turn is not documented.
- **A hook is itself a script** the app runs at an event. That is the documented way for a script to act
  inside a session at the moment of a tool call.
- **Status line** [SL]: a script the app runs on events and on a timer; it sees `context_window`
  (`used_percentage`, `total_input_tokens`), `model`, `cost`, `rate_limits`. Display only.
- **Skills** [SK]: `disable-model-invocation: true` and `disallowed-tools` are enforced; `allowed-tools`
  only pre-approves.
- **Managed settings** [MS]: cannot be overridden by user or project settings; can require managed hooks only.

## 6. Rule by rule

| Rule | Can be prevented by | Can only be detected by | Cannot be seen |
|---|---|---|---|
| A helper runs on a set model tier | A PreToolUse hook that denies or rewrites `model`; a deny rule `Agent(model:...)` for forbidden tiers; the force variable (one model for all) | PostToolUse on Agent reading `tool_input.model`; the transcript afterwards | The real model when the call omits it |
| The coordinator stays under N tokens | Nothing hard. `autoCompactWindow` compacts earlier. A UserPromptSubmit hook can block after summing the transcript | The status line's percentage | An exact size in hook input |
| Independent tasks start in one message | Only by construction: a workflow's `parallel()` | PostToolBatch shows what ran as one batch | Message boundaries |
| A helper writes only its named files | PreToolUse on Write, Edit, NotebookEdit against a list; `Edit(path)` rules; dropping Write and Edit from `tools` | A diff of changed files at SubagentStop or at commit | Writes done by Bash, without the sandbox |
| No questions to the user | A deny rule on `AskUserQuestion` | A Stop hook reading the last message | A question written as plain prose, unless a model judges it |
| No work outside the purpose | Coarse only: tool lists, deny rules, path rules | A Stop hook of type `prompt` or `agent` that judges the output | Intent |
| Named files are read before acting | A PreToolUse hook that checks a marker written by a PostToolUse hook on Read; preloading through a subagent's `skills` | A transcript scan | Reads done through Bash |
| Heavy commands go through K slots | A PreToolUse hook that takes a lock and denies when full | A process count | Commands behind `sh -c` or a path |

## 7. Risks of hooks, as documented

- A command hook runs shell commands with the user's permissions.
- A stalled PreToolUse hook lets the call through unless `onFailure: "block"` is set. Exit 1 does not block; only exit 2 does.
- Output is capped at 10,000 characters per hook. A background process must redirect its output or it can stall the call.
- The documentation says static instructions belong in CLAUDE.md and hooks are for dynamic state, and
  "Use the permission system for hard enforcement".

## 8. Not documented or uncertain

- Whether hook input carries `effort`, `run_in_background`, `name` or `isolation` for the Agent tool.
- Whether any hook can force a compaction or end a session.
- A token or budget cap for an interactive session.
- How an interactive session learns that a background command finished, and whether an outside watcher can interrupt a turn.
- The managed settings path on Windows.

## Sources

[H] code.claude.com/docs/en/hooks.md · [P] permissions.md · [PM] permission-modes.md · [S] sub-agents.md ·
[ST] settings.md · [SR] settings-reference.md · [MS] managed-settings.md · [SK] skills.md · [SL] statusline.md ·
[CW] context-window.md · [W] workflows.md · [HL] headless.md · [TR] tools-reference.md · [CH] channels.md
