# T8-COUNT: how many helpers run at once, gated (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first.

## The rule and how it was broken
How many helpers, sessions or heavy commands run at once is a computed number per resource, run at the smallest
(r57-0414 version 2, r57-0710; how it is built in: r57-0707, b1-0401 to b1-0423; o2-0401, o2-0403). Broken on
2026-11-23 (`research-tree/build/TOP-STATE.md`, section "Top session 7"; records t7-06xx): the run's plan
`RUN:run/WAVE2.md` said to start no part while the replays ran; the session started three parts beside two replay
units; the app allows 20 helpers at once in a session, helpers of helpers counted (observed, board "Open" line
under r57-0531); one part's reader starts were refused by the app and it was restarted. No gate counted.

## What exists
`.claude/hooks/plan-gate.mjs` (version 2, r57-0164; its tests `plan-gate.test.mjs`, 37 cases) runs on PreToolUse and
PostToolUse of Agent, Task and SendMessage, and on SubagentStart and SubagentStop; it logs starts and ends. Read it
and its review `research-tree/build/refute/P0-GATE.md` first.

## What to build
A count of helpers running now in this session (helpers of helpers counted, as the app counts them), from the start
and end events, robust to a missed end (a helper killed by an app restart, r57-0118; decide how a stale entry
expires, from a measured duration in the record, and say which), and a refusal of a new Agent/Task start when:
1. the count would pass the app's limit of 20 (observed), and
2. the count would pass the computed width of r57-0414 where one is computable now. Read r57-0414 and the decision
   rule `docs/program/evidence/round3-2026-11-18/DECISION-RULE-v2.md` (or wherever r57-0710 points) and decide
   which of its widths can be computed today from what a hook can read (for example a width declared by the run's
   plan file, the parent's window from the transcript, free memory); say plainly which cannot and why. A width a
   plan states (like "no part while the replays run") must be enforceable: decide the file and the format a plan
   uses to declare it, small and plain.
Count child sessions too if start_session can be counted (the tier hook sees it); else say so.
Keep every existing plan-gate test passing; add tests for the count, a stale entry, the limit, a declared width.

Files: `.claude/hooks/plan-gate.mjs` (in place, via a copy), `.claude/hooks/plan-gate.test.mjs`, or a new hook file
beside it if that is cleaner. Limit 15 M tokens.
