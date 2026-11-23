# FP1b-FP2 (S0.1a)
## F-P1b: session_id format
- Log lines read: 23 [m: `wc -l` and JSON parse of probe-hooks-log.jsonl; probe-hooks.md says 22]; lines with a session_id: 23 [m: `session` field on every line; key `session_id` listed in `keys` on all 23]; distinct values: 1 [m]; verbatim: "0b62640d" [r: log line 1 `session`]
- Lengths seen: 8 [m]; characters seen: 0 2 4 6 b d [m]
- Match /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/: 0 of 23 (the log stores only the 8-character prefix); match /^[0-9a-f]{8}$/: 23 of 23 [m]
- agent_id in the log: field `agent_id`, 4 lines non-null [r: lines 13, 14, 15, 23]; values "a9dac399" (lines 13-15), "a62b90fd" (line 23); lengths 8; characters hex [m]
- Second source (file names): session files 140 [m: top-level *.jsonl under the 2 levels of C:/Users/User/.claude/projects/]; matching the regex 140 [m]; agent files 3503 [m: find of `agent-*.jsonl` under projects/]; one pattern that matches all: ^agent-[0-9a-f]+\.jsonl$, matching 3503 of 3503 [m]. Probe session file: `0b62640d-98ed-43af-923f-8a77ef65ef56.jsonl`, its helper file `subagents/agent-a9dac3999a588cda7.jsonl` (its `.meta.json` description "Hook probe helper haiku write gamma") [m]. Log agent_id "a62b90fd": no file name starts with it [m: find `agent-a62b90fd*`, empty].
- Verdict F-P1b: the session_id is a lowercase UUID, 8-4-4-4-12 hex. The second source shows it: 140 of 140 session file names match the regex, and the probe session's full id 0b62640d-98ed-43af-923f-8a77ef65ef56 starts with the log's 8-character value. The log alone does not show the full form (only the prefix), and that the hook receives the same string as the file name is inferred.

## F-P2: Write input carries the full content
- Write calls in the log: 3 [m: PreToolUse lines 4, 8, 13; PostToolUse for two of them, lines 5 and 14; line 8 denied, no PostToolUse]; field names in their tool_input: file_path, content [r: `input_keys`, lines 4, 5, 8, 13, 14]; with `content`: 3 of 3 PreToolUse calls [m]
- Content length against the written file: ok.txt content_len 16 (line 4) against 16 bytes [m: `ls -l` inside/ok.txt]; from-helper.txt content_len 5 (line 13) against 5 bytes [m: `ls -l` inside/from-helper.txt]; blocked.txt content_len 4 (line 8), not written (denied; outside/ empty) [m]. The log holds lengths, not the content text, so "full" is inferred from the length matching the file.
- Edit / MultiEdit calls, field names: none in the log [m: no tool name containing "Edit"]
- Verdict F-P2: true (inferred from the length match on the two allowed writes; the log records no text of the content)
