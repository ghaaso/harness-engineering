# Wturn-2 (S0.1c, second measure)
Scripts (new, first measure's files untouched): `S0.1c/scan2.mjs`, `S0.1c/runall2.sh`, `S0.1c/merge2.mjs`; output `S0.1c/out2/`. Run: `bash runall2.sh` (9 s), then `node merge2.mjs` [m]. Same 92 coordinator sessions (main files with an Agent, Task or `mcp__ccd_session__start_session` tool_use); same turn starts (a `user` line that is not a tool result). Turns: 3,176 (first measure 3,172; the 4 extra were not traced).
Method [m]: a turn ends at its last `assistant` or tool-result `user` line; metadata lines are ignored. Gaps are between consecutive such lines in file order (only gaps over 5 min were kept). Cause of a gap = tool calls issued but not yet answered at the earlier line (tool name; Agent/Task marked fg/bg by `run_in_background`), else "idle" (no pending call). Permission prompts are not marked in the lines, so a wait on a permission prompt shows as a wait on its tool call; not separable here.

## Span of a turn, last working line minus first line [m]
- Median 0.68, Q3 3.14, p95 25.05, max 4,511.2 min; over 30 min: 139; over 60 min: 89 (first measure: median 4.3, p95 116.9, 409 and 253).
- With waits on one foreground tool call longer than 30 min taken out (only gaps >30 min with exactly one call pending, not a background Agent): median 0.68, Q3 3.12, p95 24.05, max 4,511.2; over 30: 131; over 60: 81.
- Gaps over 30 min: 66 in all; 12 on one Bash call (12 turns), 2 on AskUserQuestion, 52 idle (no call pending; 51 turns have one). No gap over 30 min was a wait on an Agent or Task call (foreground Agent calls in these sessions answer fast or the wait is not a gap between lines).
- Of the 131 turns over 30 min after the wait-removal: 51 contain an idle gap over 30 min; 80 do not, and 74 of those 80 have no gap over 30 min at all (continuous work, many tool calls with gaps under 30 min, typically Bash calls of 5-10 min each).
- Also taking out idle gaps over 30 min (not asked for; shown for the split): max 356.7 min; over 30: 86; over 60: 40.

## The 10 longest by span (session, start UTC, minutes, starter, largest gap and cause)
1. df1db0b9-27eb-4eb3-9746-26d4aaeaa7c1, 2026-11-06T08:53:14Z, 4,511.2, notice, 4,444.8 idle
2. 96abd742-0df4-432f-af10-fdd02106ff9f, 2026-11-06T08:55:26Z, 4,509.3, notice, 4,447.4 one Bash call (adjusted 61.9)
3. 2d86c828-3f8a-40f1-9ad0-49a7a4779554, 2026-11-06T09:03:59Z, 4,500.6, notice, 4,445.5 idle
4. 7b3031d3-2a92-413b-9858-440b5218de16, 2026-11-06T09:21:20Z, 4,483.3, notice, 4,454.1 one Bash call (adjusted 29.2)
5. bf76944e-b487-4618-ab86-df785d2ed496, 2026-11-06T09:49:31Z, 4,454.8, task-notification, 4,454.8 idle
6. 76a82af8-1866-4804-9882-3f126399360c, 2026-11-13T22:48:08Z, 587.8, typed, 397.5 idle
7. e24f17dc-4aea-4914-a9d1-280a723d620e, 2026-11-16T21:57:08Z, 543.1, typed, 411.5 one Bash call (adjusted 131.6)
8. e24f17dc-4aea-4914-a9d1-280a723d620e, 2026-11-17T15:30:41Z, 529.2, typed, 529.0 idle
9. a7a94981-922e-4638-843d-cae1caa03ea5, 2026-11-17T15:30:27Z, 528.7, typed, 528.7 idle
10. 733bc52b-80e5-4346-a3a0-537ec7b7ed33, 2026-11-03T20:28:34Z, 454.6, typed, 454.6 idle
("notice" = a system-reminder-wrapped user line.) Idle gaps this long are most likely the PC asleep or the app closed (rule in CLAUDE.md: sleep after 15 idle min); inferred, not shown by the lines.

## The longest after removing waits on one foreground call and idle gaps over 30 min (working turns)
df1db0b9 2026-11-05T19:21Z 356.7 min (notice; 21 gaps of 5-10 min on Bash calls, none over 30); 2d86c828 2026-11-06T04:22Z 262.6 (typed); 7b3031d3 2026-11-06T06:00Z 196.7; a7a94981 2026-11-17T07:05Z 175.5; 2d86c828 2026-11-05T15:52Z 174.3.

## Verdict
Longest working turn: 356.7 min with idle gaps over 30 min taken out (11.9 times 60 min; 4,511 min unadjusted, which is mostly idle); 81 turns pass 60 min and 131 pass 30 min after taking out only the waits on one foreground call. Reason other than one long tool call: 51 of the 131 pass 30 min because of idle gaps (no call pending; probably sleep); the other 80 (74 with no gap over 30 min) pass it by continuous work of many calls, and 37 of the 81 over 60 min have no idle gap over 30 min (max 356.7 min). So FX-W2's premise (b) (every turn under 0.5 x alarm_ms) is false even for working turns, and branch S2 (turns pass 1 x alarm_ms) is reached by working turns, not only by idle time. Not tested: whether these long working turns were a coordinator waiting on helpers (background Agent results arrive as notices, so a coordinator's wait does not show as a turn); tokens not read.
