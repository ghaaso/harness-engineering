# Hook probe, 2026-11-18: stopped at the login, hook cost measured

Result in one line: the hook behaviour points 1 to 11 were NOT REACHED. The command-line program on this PC
answered "Not logged in" in both tries, so no model call was made. Point 12 (cost of one hook call) was measured.
No log of a session exists, so there is no `probe-hooks-log.jsonl` beside this file.

## What was run

- Program: `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\claude-code\2.1.325\806e0a45e6f5\claude.exe`,
  version `2.1.325 (Claude Code)`. It is the program the desktop app itself runs. `where claude` finds nothing on PATH.
  It is the only version in that folder. There is no `C:\Users\User\.claude\local` and no npm global copy.
- Probe folder: `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/130bdd43-364d-4296-a128-30f93cd9f301/scratchpad/hook-probe`
  with `inside/`, `outside/`, `hook.mjs`, `probe-settings.json`, `prompt.txt`, `sample.json`.
- `hook.mjs` logs one JSON line per call and exits 2 for a Write or Edit outside `inside/`, or for a Task or
  Agent call whose `model` contains "opus". `probe-settings.json` runs it for PreToolUse and PostToolUse (matcher `*`),
  SubagentStop and Stop.
- Self test of the script with a sample input (no session): an input for a Write inside `inside/` gave exit 0 and
  one log line with `content_len` 5; the same input for `outside/` gave exit 2 and the reason on stderr. So the
  script decides as designed. This says nothing about what the app sends it.
- Command line of both tries, run from the probe folder, prompt (the one given in the brief) read from stdin:
  `claude.exe -p --settings <probe>/probe-settings.json --model haiku --output-format json --max-turns 12 --allowedTools "Write,Edit,Read,Agent,Task" < prompt.txt`
- Try 1: environment as inherited from the desktop session. Try 2: the same, with every variable whose name starts
  with CLAUDE, ANTHROPIC_BASE, USE_LOCAL or USE_STAGING removed, so that the program would fall back to the login
  file `C:\Users\User\.claude\.credentials.json`. Both ended in about one second:
  `"is_error":true,"terminal_reason":"api_error","result":"Not logged in · Please run /login"`,
  `duration_api_ms` 0, all token counts 0, `modelUsage` empty, `num_turns` 1.
- No hook line was written, no file was created in `inside/` or `outside/`. I did not log in and did not
  look for another route, as the brief says. The desktop session itself is logged in, but through the app's own
  host (the environment carries `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH`), which the stand-alone program does not use.
- That is 2 of the 3 headless runs used. Model asked for: haiku. Never reached. Tokens reported: 0 input, 0 output.

## The twelve observations

| # | Point | Result |
|---|---|---|
| 1 | PreToolUse fires for Write | NOT REACHED (no login) |
| 2 | Its input carries session_id | NOT REACHED |
| 3 | It carries transcript_path | NOT REACHED |
| 4 | tool_input carries file_path and full content | NOT REACHED |
| 5 | Exit 2 refused the write outside inside/ | NOT REACHED |
| 6 | The allowed write happened | NOT REACHED |
| 7 | PreToolUse fires for the helper tool; tool name; subagent_type and model present | NOT REACHED |
| 8 | The call with model opus was refused | NOT REACHED |
| 9 | Hooks fire inside the helper; agent_id, agent_type present | NOT REACHED |
| 10 | PostToolUse fires and carries tool_response | NOT REACHED |
| 11 | Stop and SubagentStop fire | NOT REACHED |
| 12 | Cost of one hook call | OBSERVED, see below |

## Point 12: cost of one hook call on this PC

20 bare starts of `node hook.mjs < sample.json`, started from a Node driver (`spawnSync`), wall time per start,
in milliseconds:

`37 36 35 38 38 37 36 37 40 39 40 37 39 37 40 40 37 34 36 41`

- Median 37.4 ms, largest 40.7 ms, smallest 33.5 ms.
- Time the script reports for itself (from process start to just before exit, in its log line): median 19.1 ms, largest 22.0 ms.
- This is the cost of the script alone. It leaves out how the app starts a hook (a shell may sit between the app and node)
  and any wait of the app itself. In a real session the figure per call is therefore at least this.
- The log file was written during these runs and deleted afterwards; it held only sample lines.

## Limits

- No observation of what the app sends to a hook or does with exit 2. The documentation summary in
  `app-enforcement-mechanisms.md` is untouched: every row there is still "documented, not observed".
- Even a working run would have been a headless run of the command-line program, not a session inside the
  desktop app, with one model (haiku, else sonnet) and one run per case.
- What is missing to finish: a login the stand-alone `claude.exe` accepts (for example the owner runs `/login`
  once in it, or a run is started from a session that passes the app's login on). Then the same three-run
  plan can be repeated from the probe folder; the files there are ready, and the third headless run is unspent.
