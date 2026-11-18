# B1 map: what the hook machinery can carry for the decision rule (2026-11-18)

Read-only map. OBS = observed here (probe or log on this PC). DOC = documented only (Claude Code docs as
recorded in E:app-enforcement-mechanisms.md, never run here). E = docs/program/evidence/harness-method-status-2026-11-18/.
Format: claim | where | quote (at most 15 words) | OBS/DOC.

## 1. tier-hook.mjs (74 lines)
F1. One event handled: PreToolUse only; every other event exits 0 | tier-hook.mjs:27 | "if (j.hook_event_name !== 'PreToolUse') process.exit(0);" | OBS (code; log shows it ran)
F2. Wired with matcher "*" for PreToolUse only; no other event in settings | .claude/settings.json:3-4 | "matcher": "*" | OBS (file; fired in a real session, r57-0120)
F3. Starts it recognises: tool Agent or Task (helper), tool name ending start_session (child session); all else exits 0 at once | tier-hook.mjs:29-31 | "const isSession = /start_session$/.test(tool);" | OBS for helpers (21 log records); session path DOC only (no session line in log)
F4. Fields read: hook_event_name, tool_name, session_id, agent_id, tool_input.description (helper), .title (session), .model, .initiation, .proposal_id | tier-hook.mjs:27-52,60 | "ti.initiation === 'offer' || ti.proposal_id" | OBS for description and model; session fields DOC only
F5. Refusal = log, then exit 2 with the reason on stderr (deny at line 20) | tier-hook.mjs:20 | "process.stderr.write(why + '\n'); process.exit(2);" | OBS (4 deny records; probe row 6)
F6. Checks in order: routes readable; "kind:" prefix; kind known; model passed; model not in "never"; model in the kind's list | tier-hook.mjs:42-73 | "start the ${where} with the kind of job and a colon" | OBS (log: 17 allow, 4 deny)
F7. A card or approved proposal (initiation offer, or proposal_id) is allowed unchecked | tier-hook.mjs:49 | "a card or an approved proposal, not checked" | DOC only (no such log line)
F8. Logs one JSON line per start to .claude/logs/tier-hook.jsonl: t, session (8 chars), agent_id, what, kind, model, decision, plus why/label/note | tier-hook.mjs:13-20,34-39 | "appendFileSync(resolve(here, '..', 'logs', 'tier-hook.jsonl')" | OBS (line 1: allow extract haiku; line 2: deny label "say OK")
F9. Log: wc -l says 20, 21 records (last line has no newline); all what=helper | .claude/logs/tier-hook.jsonl | "wc -l 20" | OBS
F10. Routes are read and parsed on every call from tier-routes.json beside the script (no cache); data: kinds{models,for}, never[] | tier-hook.mjs:42; tier-routes.json | "never": ["fable", "mythos"] | OBS
F11. Routes file missing or bad: deny (fails closed) | tier-hook.mjs:42-44 | "cannot be read. Nothing is started until it is fixed." | DOC only (code read; not triggered)
F12. Unreadable stdin: logs a note and exits 0 (fails open) | tier-hook.mjs:23-26 | "hook input unreadable" | DOC only (code; r57-0120 names it)
F13. Effort is not checked; a job given the wrong kind is invisible | tier-hook.mjs:7; tier-routes.json:4 | "Effort levels are not checked yet." | OBS (code text)
F14. Tests: 17 self-tests known only from commit 3829507e's message (test folder empty); 6 real steps (2 started, 4 refused) | r57-0120 | "17 self-tests passed and a real session gave the expected result" | 6 steps OBS (log); 17 DOC only

## 2. Events when a unit starts or finishes
F15. PreToolUse fires before every tool call incl. Write, Agent, MCP tools (matcher "*"), also inside helpers with agent_id | E:probe-hooks.md rows 1,8,10,14 | "Do hooks fire for tool calls made inside a helper | YES" | OBS (one session, Haiku, app 2.1.325)
F16. Agent start: PreToolUse tool "Agent" carries description, prompt, subagent_type, model (model only when passed) | E:probe-hooks.md row 8; r57-0106 | "`Agent`; `description`, `prompt`, `subagent_type`, `model`" | OBS
F17. A Bash command start would be PreToolUse tool "Bash"; the probe did not run Bash. A command behind "sh -c" or a path is not seen | E:app-enforcement-mechanisms.md:94 | "Commands behind `sh -c` or a path" | DOC only
F18. Session start: SessionStart fired; keys session_id, transcript_path, cwd, scratchpad_dir, hook_event_name, source | E:probe-hooks.md row 13 | "Do SubagentStop, Stop and SessionStart hooks fire | YES" | OBS
F19. Start by session tool (start_session): handled in code; "what a hook sees for the session tools" is listed as not tested | E:probe-hooks.md Limits; tier-hook.mjs:30 | "what a hook sees for the session tools" | DOC only
F20. Finish: PostToolUse fires and carries tool_response | E:probe-hooks.md row 12 | "Does PostToolUse fire and carry `tool_response` | YES" | OBS
F21. Finish: SubagentStop and Stop fired (probe lines 15, 16); contents (stop_hook_active, last_assistant_message) | E:probe-hooks.md row 13; E:app-enforcement-mechanisms.md:24 | "`stop_hook_active`, `last_assistant_message`, `background_tasks`" | fired OBS; contents DOC only
F22. PostToolBatch (after a parallel batch, tool_calls[]), SessionEnd (1.5 s default timeout), Pre/PostCompact, UserPromptSubmit | E:app-enforcement-mechanisms.md:18-26 | "After a parallel batch, before the next model call" | DOC only
F23. Stop/SubagentStop may force continuation, capped at 8 in a row | E:app-enforcement-mechanisms.md:24 | "capped at 8 in a row" | DOC only

## 3. What a hook cannot see, and cost
F24. Context size is in no event | E:probe-hooks.md row 16; r57-0106; x13-0115 | "no such key in any event" | OBS
F25. PreToolUse keys include effort and permission_mode (key present; its value was not tabulated or used) | E:probe-hooks.md key list | "`permission_mode`, `effort`, `hook_event_name`" | OBS (key present)
F26. Caller's model: no key; a helper started without model shows none, so a model refusal works only when it is passed | E:probe-hooks.md Limits | "shows no model to the hook" | OBS
F27. Whether Agent input carries effort, run_in_background, name, isolation: not verified | E:app-enforcement-mechanisms.md:106 | "Whether hook input carries `effort`, `run_in_background`" | DOC only (open)
F28. Free memory is not in hook input; a hook script could measure it itself but none was built or timed | inference from F4, F8; no record | (none) | not tested
F29. Context size could only be estimated from transcript_path, which may lag | E:app-enforcement-mechanisms.md:10,30; x01-0312 | "transcript_path, which may lag the live conversation" | DOC only
F30. Cost: about 37 ms per start of the script (median of 20 bare starts); own work under 1 ms. Matcher "*" starts it on every tool call, not only on starts | E:probe-hooks.md row 17; settings.json:4 | "about 37 ms per start of the script on this PC" | OBS (first-attempt timing)

## 4. Could a hook read a state file and refuse a start (a gate)?
F31. This hook already reads a file on each call and denies on it | tier-hook.mjs:42-44 | "readFileSync(resolve(here, 'tier-routes.json'), 'utf8')" | OBS for a static file; a state that changes between calls was not exercised
F32. Refusal observed: 4 helper starts refused in the log; in the probe an Agent call on model opus and a Write outside inside/ were refused | tier-hook.jsonl; E:probe-hooks.md rows 6,9 | "step (d): decision deny on `model: opus`" | OBS
F33. Refusal holds with permissions bypassed | E:probe-hooks.md row 15 | "`permission_mode: bypassPermissions` on the refused lines" | OBS (probe session); tier-hook's own log does not record the mode
F34. research-tree/tcb/guard-hook.mjs: PreToolUse only, role-based, every own failure is a deny, reads files, writes nothing | guard-hook.mjs:3-9,224 | "Every failure of its own ... is a deny" | DOC only (script, not observed in the app here)
F35. Exit 1 does not block, only exit 2; a stalled PreToolUse hook lets the call through unless onFailure "block"; output cap 10,000 chars | E:app-enforcement-mechanisms.md:99-100 | "Exit 1 does not block; only exit 2 does." | DOC only; timeout or crash not tested
F36. Not tested: writes by shell commands, the Edit tool, resumed or compacted sessions | E:probe-hooks.md Limits | "writes done through shell commands" | DOC only
F37. Matching hooks run in parallel, so a gate that counts running units races without a lock; a lock-and-deny hook is named, never built | E:app-enforcement-mechanisms.md:34,94 | "A PreToolUse hook that takes a lock and denies when full" | DOC only

## 5. tools/ensure-tier-hook.sh (23 lines)
F38. Checks whether tier-hook.mjs is named in <folder>/.claude/settings.json or settings.local.json; "present", exit 0 | ensure-tier-hook.sh:13 | `grep -qs "tier-hook.mjs"` | OBS (code; r57-0122 records its use; not re-run by me)
F39. Refuses: exit 2 no such folder; exit 3 folder outside the repo unless --force; exit 4 settings file exists without the hook (never overwritten) | ensure-tier-hook.sh:4-6,11,16-19 | "settings file exists without the hook (not overwritten)" | OBS (code); run history DOC only
F40. Installs a settings.json with one PreToolUse "*" entry pointing at the repo's hook (absolute path), only inside the repo and with no settings file | ensure-tier-hook.sh:20-22 | "installs it when the folder is inside this repository" | DOC only (r57-0122)
F41. Check is text presence of the file name only; not event, not valid JSON | ensure-tier-hook.sh:13 | (grep only) | OBS (code)

## 6. Workflow scripts
F42. By construction the script, not the model, decides which agent() calls run, in parallel() or pipeline(), model and schema per call; 16 concurrent by default, 1,000 per run | E:app-enforcement-mechanisms.md:64-67 | "the script, not the model, decides which `agent()` calls run" | DOC only
F43. "Helper on the right model": a workflow sets it per agent; "independent work starts together": only by construction in parallel() | E:README.md:32,34 | "Only by construction, in a workflow script" | DOC only
F44. The script has no file or shell access itself, so a state-file gate must live in a hook or a helper | E:app-enforcement-mechanisms.md:67 | "The script has no file or shell access itself" | DOC only
F45. No Workflow probe in E:; only trace is user settings keys enableWorkflows, skipWorkflowUsageWarning | E:enforcement-evidence.md:75 | "`enableWorkflows`, `modelSettings`, `skipWorkflowUsageWarning`" | keys OBS; behaviour DOC only
F46. Workflow resume re-runs finished agents when call order shifts (memory note, not in E:) | MEMORY.md, reference-workflow-resume-is-positional | "resumeFromRunId re-runs finished agents once call order shifts" | OBS in earlier work, not re-checked

## Limits that matter for a gate
- Proven: a PreToolUse hook on Agent can refuse a start by exit 2, reading a file, with permissions bypassed (one session, Haiku, app 2.1.325).
- Not proven: a gate on Bash starts, on start_session, a hook that times out or crashes, concurrent starts, resumed sessions.
- Blind: context size and free memory are not hook fields (a script must measure them); the model shows only if passed.
- Cost 37 ms per call with matcher "*"; a state-reading gate adds its own file read.
