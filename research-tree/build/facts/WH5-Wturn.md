# WH5-Wturn (S0.1c)
Scripts: `research-tree/build/facts/S0.1c/scan.mjs` (one project folder per call, writes `out/*.json`), `runall.sh`, `merge.mjs`. [m] = measured by them over every `*.jsonl` under `C:/Users/User/.claude/projects/` (68 folders), run 2026-11-19; whole scan about 100 s in the background, one `node scan.mjs <folder>` per folder.
## W-H5
- Files read: main 140, helper 3718 (walk as in `build/check/tokens.mjs:76-86`, including `subagents/workflows/`); lines: 765,242 non-blank; not JSON: 59 [m]
- Top-level types, count each [m]:

| type | n | type | n |
|---|---|---|---|
| assistant | 225,950 | custom-title | 18,437 |
| user | 144,987 | last-prompt | 18,091 |
| attachment | 98,373 | atis-latch | 17,999 |
| api-request | 97,974 | agent-name | 17,952 |
| api-request-blob | 70,868 | queue-operation | 11,725 |
| mode | 9,963 | pr-link | 7,380 |
| relocated | 5,904 | api-request-shape | 4,307 |
| file-history-delta | 3,201 | system | 3,170 |
| started | 2,963 | result | 2,706 |
| tools-used | 1,146 | file-history-snapshot | 1,036 |
| frame-link | 299 | launched | 215 |
| cost-state | 200 | failed | 167 |
| artifact-autoreact-ledger | 110 | artifact-comment-monitor | 55 |
| session-owner | 5 | | |

- App `version` carried on lines: yes, 11 values (2.1.288 to 2.1.325; most lines 2.1.309: 156,096; 2.1.321: 179,284; 2.1.325: 131,373; 2.1.317: 67,615). Lines of other types carry no version, so the sum is below the line count [m].
- Content-block types: assistant (message.content array): thinking 76,863, text 13,296, tool_use 135,791; user: string content 8,850, tool_result 135,745, text 554, image 13 [m]. No other block type seen.
- parseTranscript knows: `assistant` (`tcb/lib.mjs:2535`), `user` (`lib.mjs:2600`), `attachment` with `attachment.type === 'structured_output'` only (`lib.mjs:2624-2631`); every other record type is skipped (`lib.mjs:2633` comment); a line that is not JSON or not an object adds to `badLines` (`lib.mjs:2528-2530, 2644`). Block types it reads: `tool_use`, `text` (assistant), `tool_result` (user) (`lib.mjs:2543, 2557, 2606`). `spec/lib.md` mentions `parseTranscript` only at line 318 (T98); the contract signature is `CONTRACT.md:816`. It returns no "kind" field today (the "kind" of FX-W6 is planned: `notes/r3-changes.md:106, 110`).
  Seen but unknown to it: the 24 other top-level types (api-request, api-request-blob, api-request-shape, mode, custom-title, last-prompt, atis-latch, agent-name, queue-operation, pr-link, relocated, file-history-delta, file-history-snapshot, system, started, launched, result, tools-used, frame-link, cost-state, failed, artifact-autoreact-ledger, artifact-comment-monitor, session-owner; all skipped) and the `thinking` and `image` blocks (ignored, no error). `attachment` records of subtype other than `structured_output` are skipped.
  Known but never seen: none at top-level (all three seen). Not measured: whether any `attachment.type === 'structured_output'` line exists, nor the `StructuredOutput` tool name.
- Verdict W-H5: transcripts hold 27 top-level kinds (27 table rows), 3 of them (assistant, user, attachment) in `parseTranscript`'s list; the rest (about 39 % of lines: 765,242 minus 469,310) are skipped silently, not counted as `model`, because the function has no kind field yet; any "unreadable counts as model" rule for FX-W6 must therefore treat the 24 skipped kinds explicitly. Content blocks seen are covered (tool_use, text, tool_result read; thinking, image ignored).
## W-turn
- alarm_ms: 3,600,000 (`tcb/thresholds.json:22`, source "guess", gate false); coordinator sessions: 92 (main sessions with at least one Agent, Task or `mcp__ccd_session__start_session` tool_use); turns: 3,172 [m]
- Turn minutes [m] (turn = `user` line not a tool result to the line before the next such line; length = last minus first timestamp): median 4.3, Q3 13.7, p95 116.9, max 9,554.7; turns over 0.5 x alarm_ms (30 min): 409; over 1 x alarm_ms (60 min): 253
- Starters over all 3,172 turns: task-notification 1,490, typed 1,029, system-reminder-wrapped 563, interrupt 32, ci-monitor-event 12, command-message 18, local-command (caveat/name/stdout) 26, create-pr-command 2.
- The 5 longest (session id, start UTC, minutes, starter, Agent/start_session calls inside the turn):
  1. 69f5cc27-377b-4aee-a92e-35cf2eddd87f, 2026-11-04T09:10:51Z, 9554.7, typed, 0
  2. e24f17dc-4aea-4914-a9d1-280a723d620e, 2026-11-04T09:10:51Z, 9554.7, typed, 0 (same start as 1: a fork or resumed copy)
  3. df1db0b9-27eb-4eb3-9746-26d4aaeaa7c1, 2026-11-06T08:53:14Z, 4511.2, system-reminder-wrapped notice, 1
  4. 96abd742-0df4-432f-af10-fdd02106ff9f, 2026-11-06T08:55:26Z, 4509.3, system-reminder-wrapped notice, 1
  5. 2d86c828-3f8a-40f1-9ad0-49a7a4779554, 2026-11-06T09:03:59Z, 4500.6, system-reminder-wrapped notice, 1
  Helpers waited on: the count above is calls made inside the turn; I did not trace which helper results the turn waited on. These very long turns look like idle gaps (the next line is days later; 9,554 min is 6.6 days), not working time; not checked line by line.
- Verdict W-turn: the longest recorded turn (9,554.7 min) is 159 times 0.5 x alarm_ms (30 min); 409 of 3,172 turns (12.9 %) exceed 0.5 x alarm_ms and 253 (8.0 %) exceed 1 x alarm_ms, so FX-W2's premise (b) "every turn under 0.5 x alarm_ms" is false on the recorded turns as measured here (timestamp span, so it includes idle waits for the owner and resumed-session gaps; a turn limited to assistant activity was not measured).
- Not measured: turns split by working time versus idle gaps; the two top turns are probably one session forked; tokens not read (fewer than 30 tool calls).
