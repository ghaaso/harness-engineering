# GATE: result (2026-11-19)

Kind build-invariant, Opus (agent a51f711b83ba1931d). Brief: `research-tree/build/briefs/GATE.md`. Nothing committed.

## Files

| File | What |
|---|---|
| `research-tree/build/plan.json` (new) | 42 rows: 27 units (S0.1a-d, S0.3, PROBE, S0.4, S0.6, S0.5, L1, the 13 fixes, S2.1, S2.2, S2.3, S2.4) and 15 refuters, each with batch, kind, model, deps, done form, expected and limit tokens; 8 batches with width, max and the batches each comes after; `gate.count_running` true, `gate.pending_s` 60 |
| `.claude/hooks/plan-gate.mjs` (new) | PreToolUse gate on Agent; PostToolUse start log; SubagentStop end log; `--end` for a helper killed without an end |
| `.claude/hooks/plan-gate.test.mjs` (new) | 27 cases, `node --test .claude/hooks/plan-gate.test.mjs`, about 17 s, temporary folders only |
| `.claude/settings.json` (hooks section only) | the gate added to PreToolUse (matcher `Agent\|Task`), PostToolUse (`Agent\|Task`) and SubagentStop |
| `research-tree/build/briefs/GATE-USE.md` (new) | the root's section: description form, refusals, done forms, running, widths, failures, what is not checked |

## Each check and its test (27 pass, 0 fail, 0 not-run; run twice, the last after every edit)

| Check | Failing case (refused) | Passing case (allowed) |
|---|---|---|
| 1. kind or model differs | `build: W1` on sonnet; `build-invariant: W1` on sonnet and with no model; `extract: S0.1a` on sonnet; `refute: W6` (reviewed only in `refute: W4`); `W1+OUT` in one helper; `refute: S0.1a` (no refuter) | kind and model as the row; an alias (`FX-OUT`) and a full model name |
| 2. something needed is not done | S0.5 before S0.4 landed (no branch, then an unmerged branch); W1 before B0b, then before PROBE; S0.3 before all four fact files; `refute: W1` before W1's result; the combined review before W6, REDO, CLOSE landed; a done form it cannot check (fails closed) | each of these once it is done; W1's result found in its worktree |
| 3. same unit and role running | a second W1 builder while the first runs; a second start before the first call returned; a second refuter of W1; a second combined review | the successor once the first ended (LIMIT); a pending start older than 60 s; a call that returned finished (foreground); the refuter beside its builder; after `--end` |
| 4. width | a fourth B1-1 builder at width 3; at width 4 from STATE.md, a fifth; STATE.md lines without a measurement or above max ignored; four starts at once give three allows; two starts of one unit at once give one | the fourth once one ends; refuters not counted; a valid STATE.md line raising the width |
| unreadable plan.json | a planned id refused (ids read from the text, or the id forms when the text holds none) | unrelated descriptions pass; no plan.json: everything passes, nothing logged |
| start and end hooks | | always exit 0, silent; start logs tool_use_id and agent id (object or string response), end logs agent id |
| the lock | | a check waits while the lock is held; a stale lock (crashed check) is broken at once and released |
| plan.json itself | | ids at most 7 characters, one row per unit and role, batches and deps exist, batch order acyclic, every kind and model allowed by `tier-routes.json`, expected at most the limit, done forms by kind, 15 refuters, 17 build-invariant units, widths within max, no P0 or GATE |

Mutation check (scratch copies, nothing in the repository): 8 mutants of the hook, one per refusal and mechanism
(kind/model, deps, same unit, width, pending, lock, unreadable plan, refuter's need); each failed 2 to 12 cases. The
lock mutant first survived; the lock case was added and now kills it.

## The live hook check (this app, 2026-11-19, after registering)

- One Haiku helper, `test: gate live hook-field check`, background (`status: "async_launched"`). PostToolUse fired
  1.4 s after its PreToolUse with keys `session_id transcript_path cwd scratchpad_dir prompt_id permission_mode
  agent_id agent_type effort hook_event_name tool_name tool_input tool_response tool_use_id duration_ms`;
  `tool_response` keys `isAsync status agentId description resolvedModel prompt outputFile canReadOutputFile
  canContinueAgent`. **SubagentStop fired** 3.6 s later with keys `session_id transcript_path cwd scratchpad_dir
  prompt_id permission_mode agent_id agent_type effort hook_event_name stop_hook_active agent_transcript_path
  background_tasks session_crons`, and its `agent_id` equals the returned `agentId` (afa10198a0f9fd6a2). So checks
  3 and 4 stay on (`count_running` true). Log lines 3 and 5 of `.claude/logs/plan-gate.jsonl`.
- One refused start, `build-invariant: S0.5 live refusal check` on opus: the gate refused it live with its one-line
  reason (S0.4 not landed, B0a not done), so exit 2 holds for the Agent tool and git runs in the app's hook
  environment; no helper started (log line 4). Before that, the registered command was run by hand on four inputs.
- Seen in passing: this helper's own helper (depth 2) started in the background, with `CLAUDE_CODE_FORK_SUBAGENT` 0.
  One observation, for the probe's question (`facts/nesting.md`).

## Departures and readings

1. **Refuters.** The brief's "a refuter: its unit's builder result exists" is read as the refuter's start condition
   (`needs`); its own done is its verdict file `research-tree/build/refute/<id>.md` (ORCHESTRATION 3, R row), used
   only for the batch order. The combined review is the row `refute: W4` covering W6, REDO, CLOSE, W4, with deps on
   the three landed (ORCHESTRATION 10) and twice a refuter's tokens (10.8 M, limit 31.2 M) [c: two equivalents].
2. **Batch order enforced.** Each batch comes after the one before ("batches never overlap", ORCHESTRATION 8; the
   suite points, 7); PROBE is its own batch beside B0a and B1-1 comes after it (9 row 9). The suites themselves are
   not checked.
3. **S0.5 depends on S0.4 alone**, as BUILD-PLAN 2 states with its reason; ORCHESTRATION 2's "then S0.5" is read
   as compatible.
4. **Added beyond the brief, to make the four checks hold:** starts allowed but not yet returned count as running for
   60 s, under a lock, so several starts in one message cannot overshoot a width or start a unit twice (counting only
   returned calls would let a batch overshoot by its size less one, as b1-0405 noted); `--end` for a helper killed
   without an end (otherwise its unit would be held for good); the STATE.md width line read by the gate itself, with
   a cap per batch (B1-1 7, the collision count), so a width cannot change without its measurement; ids `FX-<id>`
   and `0b` read as the units.
5. **pending_s = 60** [c]: the launches seen returned in 1.4 s (here) and 0.1 s (probe-hooks, 11-18); 60 s covers
   them about 40 times; its cost is at most one refused retry within 60 s of a start that failed after the gate
   allowed it (rare: the plan's rows agree with the tier routes, a tested fact).
6. **Fail modes.** plan.json unreadable: refuse starts naming an id found in its text (or the id forms if it holds
   none), pass all others; any error while deciding a planned start refuses it; start and end hooks never block.
   The script crashing would fail open (the app takes exit 1 as a warning); the tests guard against that.
7. **Set here, not named in the plan:** S2.3's fact file `research-tree/build/facts/S2.3.md`; the L1 row (id `L1`,
   orchestrate, opus, after PROBE, not counted in the width; the gate cannot read whether the probe passed).
   Builders carry the row's 11.7 M / 29.2 M, not the size estimate [e].
8. **One extra live call** (the refused S0.5 start) beside the one Haiku helper the brief named.

## Tokens

From the transcripts (four usage fields, once per message id): this helper 7.97 M over 39 calls before this line,
context 275 K at the end (no checkpoint needed); its live-check helper 0.11 M (2 calls). About 8.1 M against an
expected 11.7 M and a limit of 29.2 M.
