# Probe: do hooks refuse in this app (observed 2026-11-18)

The first attempt used the stand-alone command-line program. It has no login on this PC (the login lives
in the desktop app), so nothing ran. The second attempt, recorded here, is one normal session of the
desktop app (Claude Code 2.1.325, model Haiku) started in `research-tree/probes/hook-probe/`, whose
project settings wired `hook.mjs` to five hook events. The raw log is `probe-hooks-log.jsonl` (22 lines:
key names, lengths and short ids only).

The session was given four steps: (a) write a file in `inside/`; (b) write a file in `outside/`;
(c) start a helper on the model haiku that writes a file in `inside/`; (d) start a helper on the model opus.

| # | Question | Observed | Evidence |
|---|---|---|---|
| 1 | Does PreToolUse fire for Write | YES | log lines 4 and 8 |
| 2 | Does hook input carry `session_id` | YES | every line; keys of line 4 |
| 3 | Does it carry `transcript_path` | YES | every line |
| 4 | Does it carry `tool_use_id` | YES | keys of line 4 |
| 5 | Does Write's input carry `file_path` and the full `content` | YES | `content_len` 16 for the 16 characters asked |
| 6 | Does exit 2 refuse the call | YES | step (b): `outside/` is empty; the session was told "PreToolUse:Write hook error: ... probe hook: writes are allowed only under inside/" |
| 7 | Does an allowed call go through | YES | `inside/ok.txt` exists |
| 8 | Name of the tool that starts a helper, and what its input carries | `Agent`; `description`, `prompt`, `subagent_type`, `model` | line 11 |
| 9 | Can a hook refuse a helper by its model | YES | step (d): decision deny on `model: opus`; `inside/never.txt` does not exist |
| 10 | Do hooks fire for tool calls made inside a helper | YES | lines 13 and 14: the helper's Write, with `agent_id` and `agent_type: general-purpose` |
| 11 | Does a helper share the session's `session_id` | YES | same short id on the helper's lines; `agent_id` tells the helper apart |
| 12 | Does PostToolUse fire and carry `tool_response` | YES | lines 3, 5, 12, 14 |
| 13 | Do SubagentStop, Stop and SessionStart fire | YES | lines 15, 16, 22 and 1 |
| 14 | Does the matcher `*` cover connector (MCP) tools | YES | `mcp__ccd_turn__update_plan` is logged |
| 15 | Does a refusal hold when the session runs with permissions bypassed | YES | `permission_mode: bypassPermissions` on the refused lines |
| 16 | Is the context size given to a hook | NO | no such key in any event |
| 17 | Cost of a hook | about 37 ms per start of the script on this PC (20 bare starts, median); the script's own work under 1 ms | first attempt's timing; `ms` in the log |

Top-level keys seen on PreToolUse: `session_id`, `transcript_path`, `cwd`, `scratchpad_dir`, `prompt_id`,
`permission_mode`, `effort`, `hook_event_name`, `tool_name`, `tool_input`, `tool_use_id`; inside a helper
also `agent_id` and `agent_type`. On SessionStart: `session_id`, `transcript_path`, `cwd`,
`scratchpad_dir`, `hook_event_name`, `source`.

What this settles for the tree's designs (their "app facts"): the hook input carries the session id; a
helper's tool calls run the hook and carry the same session id; Write carries its full content; a tool-use
id is present; PostToolUse exists and carries the response; a hook can deny. FX-CLAIM and FX-CGATE lean on
the first of these.

Limits: one session, one model, one app version. A helper started with no `model` value shows no model to
the hook, so the refusal by model works only when the value is passed. Not tested: a hook that times out
or crashes, a hook on a session that was compacted or resumed, the Edit tool, writes done through shell
commands, and what a hook sees for the session tools.
