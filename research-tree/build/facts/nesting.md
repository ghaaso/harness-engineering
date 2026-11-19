# Nesting probe: a helper's own helpers, fork mode off (2026-11-19)

Done for task r57-0517 by a Sonnet test session, as `research-tree/build/briefs/PROBE.md` says: one Haiku helper ("parent") started two Haiku
helpers of its own ("child one", "child two"). One run, so everything here is observed once. Claude Code 2.1.325 in
the desktop app (5.11492.5), `general-purpose` helpers. Times are UTC on 2026-11-19; U = Unix seconds. Evidence: the
transcripts and `.meta.json` files under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/ecf55882-e497-4c81-b9d9-ec607f479568/subagents/`,
this session's own transcript beside it, and `.claude/logs/tier-hook.jsonl`. Nothing was committed; no other file was edited.

## Answer

**Yes: the parent's own helpers started in the background and the parent was not blocked.** With
`CLAUDE_CODE_FORK_SUBAGENT=0` and `run_in_background: true` on both nested Agent calls, the calls returned in 1.1 s and
0.7 s ("Async agent launched successfully"), both `.meta.json` files say `requestShape: "background"`, `spawnDepth: 2`,
`parentAgentId` = the parent, and each child's reply came back to the parent, not to the main session. The earlier
nested start (hc1-0103, fork mode on, the flag left out: read from its transcript today) had `requestShape: "foreground"`
and its Agent call waited for the inner helper's report (3.9 s). So a middle orchestrator can start children and keep working.

**Not separated.** The earlier run differed from this one in two things at once: fork mode (on, then off) and the flag
(left out, then `true`). Whether leaving the flag out with fork off also gives "background" (what the documentation says)
was not tried. Until it is, a brief for an orchestrator should say both: fork off in `.claude/settings.json` and
`run_in_background: true` in every nested start.

**Four things this run showed that the orchestration document has to account for** (each seen once):
1. `sleep 40` and `sleep 100` as commands on their own are refused by the shell tool (its own rule, stated in its
   description; no hook of this repository does it), so PROBE.md's child
   prompts cannot run as written. Not refused: `sleep 20; date +%s` (17 times in the parent), `date +%s; sleep 3; date +%s`
   (this session), and a foreground `until [ … ]; do sleep 2; done` loop (child two, 100 s, one call, 150 s timeout).
   Both children changed their wait, so the 40 s / 100 s timing the probe was built around did not happen (see b, c).
2. A helper that ends its turn while its own Monitor is still running is **not woken by it**: child one's Monitor ended
   normally at 15:03:35 (`WAIT DONE 1795100615`, exit 0), yet child one's transcript got no record after its hand-back at
   15:03:10.8 and the parent got no second notice. The notice had said it "may resume on its own". It did not.
3. A reply reaches a waiting helper only at its next tool boundary: 3.9 s and 19.2 s after it was queued, because the
   parent sat inside a 20 s Bash call each time.
4. Waiting by polling costs a whole context re-read per poll: the parent's 21 calls in 6.4 minutes (17 of them polls)
   were 1.30 M tokens, 95 % of them cache reads (see f).

## What I saw

- **Env.** `echo "fork=$CLAUDE_CODE_FORK_SUBAGENT"` in the main session printed `fork=0`; `.claude/settings.json` sets
  `env.CLAUDE_CODE_FORK_SUBAGENT` to `"0"`. The helpers did not print their own environment; fork off for them is
  inferred from this value and from `requestShape: "background"`.
- **Agent tool, main session.** Parameters: `description`, `prompt`, `subagent_type`, `model` (`sonnet`, `opus`, `haiku`,
  `fable`), `effort`, `run_in_background` (boolean; the text says agents run in the background by default), `isolation`
  (`worktree` or `remote`). Agent types listed: `claude`, `claude-code-guide`, `Explore`, `general-purpose`, `Plan`,
  `statusline-setup`, `web-fetch`. No `fork` type is offered; the word occurs once, in the `model` text ("Ignored for
  subagent_type: fork").
- **Agent tool, nested parent** (from its first request in its transcript): the same seven parameter names, the same
  `run_in_background` text, the same seven agent types. So a depth-1 helper has the tool and the flag.
- **How a helper reports.** Every helper is told to end with a `SubagentHandback` call, which "ends your run"; plain
  text at the end is not delivered. When child one ended in plain text the harness injected `[handback-send-enforce] Your
  report has not been delivered…` and it then handed back. `Monitor` is deferred inside a helper: child one loaded it with
  `ToolSearch` (0.1 s).
- **How the main session waited.** It sent no message to any helper and did not read their output files. While the
  probe ran it only waited on file state (a script, no model calls) and read the transcripts to build the analysis. The
  only call of the main session that touched the run was the Agent call that started the parent.
- **All helper `.meta.json` files** in this project's transcript folder when counted (143 files): 142 say `background`;
  the one `foreground` is hc1-0103's nested "inner echo".

## The helpers (one row each)

All three: `agentType` general-purpose, `isBuiltIn` true, `requestNonInteractive` true, `model` haiku,
`pickedEffortModel` claude-sonnet-5-5, `requestShape` background, `finished` true (the key appeared once they had ended).

| helper | id | spawned by | depth | first record | last record | seconds | lines |
|---|---|---|---|---|---|---|---|
| `test: nesting parent` | a3993bae | the main session (no `parentAgentId`) | 1 | 15:02:44.084 (U 1795100564.1) | 15:09:06.543 (U 1795100946.5) | 382.5 | 99 |
| `test: nesting child one` | a247caac | a3993bae | 2 | 15:02:50.914 (U 1795100570.9) | 15:03:10.782 (U 1795100590.8) | 19.9 | 49 |
| `test: nesting child two` | a1c18d6e | a3993bae | 2 | 15:02:50.922 (U 1795100570.9) | 15:04:43.577 (U 1795100683.6) | 112.7 | 34 |

## What happened, in order

| UTC | who | what |
|---|---|---|
| 15:02:44.0 | main → parent | my Agent call (`test: nesting parent`, haiku, `run_in_background: true`); tier hook: allow |
| 15:02:48.1 | parent | T0 = 1795100568 |
| 15:02:49.8, :50.3 | parent | two Agent calls in ONE message (same message id), `run_in_background: true`; tier hook: allow twice, logged with the parent's id |
| 15:02:50.9 | children | both start, 8 ms apart |
| 15:02:50.98 | parent | both Agent calls return: "Async agent launched successfully", the child's id, "You will be notified automatically when it completes", an output-file path |
| 15:02:52.5 | parent | T1 = 1795100572; then polls with `sleep 20; date +%s` |
| 15:02:55.1, :55.5 | child two, child one | `sleep 100` and `sleep 40` refused at once by the shell tool ("Blocked: standalone sleep N … use Monitor with an until-loop … run_in_background: true. Do not chain shorter sleeps to work around this block.") |
| 15:03:00.4 | child two | foreground loop `until … sleep 2 … done` for 100 s |
| 15:03:02.0 | child one | starts a Monitor on its own (until-loop to first time + 40 s) |
| 15:03:10.3 | child one | `SubagentHandback`: "Not complete …" (second `date` read only 9 s into the wait; no CHILD ONE DONE) |
| 15:03:10.788 | parent | task notice for child one queued: completed, "waiting on its own background work … may resume" |
| 15:03:14.651 | parent | child one's message shown (its running `sleep 20` returned at :14.645) |
| 15:03:35 | child one's Monitor | prints `WAIT DONE 1795100615`, exit 0; nobody is woken |
| 15:04:40.9 | child two | loop ends, end time U 1795100680; `SubagentHandback` at :42.8 (Start 1795100573, End 1795100680, Elapsed 107 s, CHILD TWO DONE) |
| 15:04:43.580 | parent | task notice for child two queued |
| 15:05:02.746 | parent | child two's message shown (its running `sleep 20` returned at :02.740) |
| 15:08:48 | parent | T0 + 360 s limit passes; it keeps polling to its last poll, which returns 15:09:02.3 (U 1795100942) |
| 15:09:06.4 | parent | `SubagentHandback` (U 1795100946, 378 s after T0). The main session gets the message at 15:09:06.539 and the notice at 15:09:06.549 |

## The six answers

**(a) Did the parent's Agent calls return before the children ended?** Yes. Issued 15:02:49.841 and 15:02:50.316,
both returned 15:02:50.983 (1.1 s, 0.7 s). Child one ended at 15:03:10.8, child two at 15:04:43.6.

**(b) Did the two children run at the same time?** Yes. They started 8 ms apart and were both working until child
one's hand-back (19.9 s overlap; their calls interleave: `date` at 15:02:53.8 (two) and :54.2 (one), the refused
sleeps at :55.1 (two) and :55.5 (one), then child two's loop from 15:03:00.4 and child one's Monitor at 15:03:02.0). The
planned overlap (child one 40 s, child two 100 s) did not happen: child one stopped after 19.9 s.

**(c) Did the parent receive child one's reply while child two still ran?** Yes, but it was an interim one ("Not
complete"); CHILD ONE DONE never came. Child one's reply was queued in the parent at 15:03:10.788 and shown at
15:03:14.651; child two ran until 15:04:43.6. Child two's reply (CHILD TWO DONE) was queued at 15:04:43.580 and shown at 15:05:02.746.

**(d) How did the parent wait, did it end before both replies came, where did each reply go?** It waited with 17 Bash
calls `sleep 20; date +%s` (about 20.5 s each, none refused) from 15:02:54 to 15:09:02. It did not end early: with
child one's final reply missing it ran past its own 6-minute limit and handed back 378 s after T0. Each child's reply
went to the parent only: a `SubagentHandback` is delivered to the caller as a task notice (queued 3–6 ms after the
hand-back) and an `<agent-message>` (shown at the caller's next tool boundary). The main session received only the
parent's message and notice, both at 15:09:06.5; no message from a child ever reached it (its transcript checked at
15:11 and 15:13). The parent's own report matches the transcripts.

**(e) Any stall, error or refusal by a hook?** No hook refused anything. The tier hook logged three decisions for
this session, all `allow` (kind `test`, model `haiku`): the parent's start (no agent id) and the two nested starts,
logged with the parent's id. The other two hooks (`record-guard` on Write/Edit, `library-start` at session start)
logged nothing for the helpers. Other events: the two refused sleeps (the shell tool's own rule, not a hook); the
`[handback-send-enforce]` nudge; the stall of child one (item 2 above); the delay of each reply to the parent's next tool
boundary (item 3). Cleanup: no probe process was left. Child one's Monitor and child two's loop had ended on their own
(exit 0) and the helpers' `sleep` calls had returned; the `sleep` and `until` processes on the PC afterwards belonged to
other sessions (a lane-measure wait, `sleep 5` loops), and were left alone.

**(f) Tokens.** Rule from the brief: per helper, assistant lines grouped by message id (the largest value of each
field per id), summed as input + cache creation + cache read + output. This session counted over its own transcript up
to 15:13:41 (25 calls, table below). It keeps growing: each further call of this session re-reads about 0.2 M tokens of
context; at 15:16:33, after 28 calls, it was 3,862,322 and the probe's total 5,807,870.

| | API calls | input | cache creation | cache read | output | total |
|---|---|---|---|---|---|---|
| parent | 21 | 42 | 63,638 | 1,229,027 | 3,467 | 1,296,174 |
| child one | 7 | 18 | 22,804 | 394,077 | 2,420 | 419,319 |
| child two | 4 | 8 | 18,903 | 209,642 | 1,502 | 230,055 |
| the three helpers | 32 | 68 | 105,345 | 1,832,746 | 7,389 | 1,945,548 |
| this session (to 15:13:41) | 25 | 50 | 130,275 | 3,041,104 | 66,584 | 3,238,013 |
| **the probe in total** | 57 | 118 | 235,620 | 4,873,850 | 73,973 | **5,183,561** |

94 % of the total is cache read (a context read again at each call). Each helper's first call already carried about
55,000 tokens of context (55,445 for the parent, all new; 55,063 for each child, of which 39,582 were read from the
cache); the parent's 21 calls averaged 61,557. The `subagent_tokens` in the task notices (64,438, 62,827,
58,714) are close to each helper's last call's context plus its output, not the sum of its calls, so they understate
the work by about 20 times for the parent.

## Not tested

- Fork off with the flag **left out**, and fork on with the flag `true` (the two cases that would separate the two settings).
- A child that outlives its parent (the documentation says it then reports to the main conversation): here both children
  had ended before the parent handed back, and child one never finished.
- A helper that hands back while a child still runs; three layers; many children at once (documentation: three layers,
  20 running helpers); an Opus or Fable parent; children that run for tens of minutes.
- Whether a helper that stays in its turn (does not hand back) is woken by its own Monitor.
- Haiku only, one run, one repository and one machine.
