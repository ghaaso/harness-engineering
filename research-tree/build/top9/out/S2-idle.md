# S2-idle: helpers idle past the five-minute cache (top session 9, 2026-11-24)

Gist: of 296 helper lapses 5-10 min after the previous request (46.2 M fresh tokens), 195 calls (35.0 M) followed a
shell call (long command, sleep, default timeout), so a brief line can reach at most about three quarters of that
block. A new template file carries the line. A check is worth proposing but cannot see long generation or queue waits.

## 1. What the idle gaps were

Source: `research-tree/build/replays/replay-L24/flagged.json` (404 helper lapses) plus `reclassified.json` (112 more,
once age is measured request to request; `RESULT.md` "How it was counted"): 516 helper lapses, 87.91 M [measured;
matches `summary.txt` "k:helper ... lapse 87.9"]. For each I read the transcript lines between `prevLine` and `line`
(`C:/Users/User/.claude/projects/...`) and took the tool calls in that span (script in my scratchpad, not kept in the
repo). The cause is read from the last tool call, not from a record of why the helper waited: the classification is
[measured], the reason behind it is [hypothesis].

| cause (last call before the gap) | 5-10 min: calls / M | 10-30 min | 30 min and over |
|---|---|---|---|
| shell, foreground, no timeout set (default 120 s) | 71 / 11.16 | 46 / 8.36 | 41 / 7.60 |
| shell, foreground, timeout 300 s or more | 59 / 9.33 | 10 / 2.05 | 1 / 0.15 |
| shell with a `sleep` in the command | 64 / 14.22 | 34 / 7.10 | 3 / 0.36 |
| shell, started in background | 1 / 0.30 | 0 | 0 |
| waiting on own helpers (Agent call) | 41 / 2.35 | 9 / 0.67 | 0 |
| other tool (Read, Write, Grep): long generation or a permission wait | 39 / 4.45 | 10 / 1.59 | 8 / 1.31 |
| no tool call in the span (queue, message, resume) | 15 / 3.37 | 23 / 4.73 | 32 / 7.31 |
| transcript unreadable now | 6 / 1.01 | 3 / 0.48 | 0 |
| total | 296 / 46.19 | 135 / 25.0 | 85 / 16.7 |

What the counts say:
- Waiting on a long command is the main cause. In the 5-10 min block shell calls are 195 of 296 calls (35.0 M of
  46.2 M, 76 %) [measured].
- On the 206 helper lapses of `flagged.json` that were 5-30 min after the previous request and followed a shell call,
  209 of 214 had a tool that ran 270 s or longer (tool call to result): the command itself took the time [measured].
  (Same-file rows: 5-30 min only; the 112 reclassified rows were not timed.)
- Of 274 foreground shell calls (5 min and over, `flagged.json`), 146 set `timeout` to 300000 or more, exactly the
  cache's life [measured]; 107 set none, so the 120 s default applied; 41 results said the command "was moved to the
  background" and the helper then waited [measured, result text].
- The `sleep` rows hold 106 sleeps, 105 of them under 200 s and 1 of 200-270 s [measured]. A single short sleep does not
  explain a gap over 300 s; I did not resolve whether several ran one after another or a long command followed a sleep
  in the same call [Not read].
- Waiting on own helpers: 41 calls, 2.35 M in 5-10 min, 3.0 M in all. Small; helpers are told to start none.
- No tool call in the span: 15 calls (3.4 M) in 5-10 min, 70 (15.4 M) in all bands; a queue, a message, or a resume
  after hours (the 30 min and over rows). A brief cannot prevent these.
- A lock or the user: the transcripts have no lock marker; I found no tool name for one [Not read beyond tool names].

Reachable by a line: the shell rows, where the helper chooses timeout, sleep and background. In the 5-10 min block 195
calls, 35.0 M at most [hypothesis: only where the command can be polled in steps under 240 s; see section 4]. Not
reachable by a line in that block: 101 calls, 11.2 M.

## 2. Where briefs come from, and the line added

Found: `research-tree/build/top9/briefs/COMMON.md` (this session's common brief), `top9/briefs/R-COMMON.md`,
`research-tree/build/briefs/TOP8-COMMON.md` (top session 8's; line 24 "under about 2 minutes", no reason), and the
per-unit briefs under `research-tree/build/briefs/`. No script that generates briefs turned up in `research-tree/build/`
[Not read: the rest of the repository; a repository-wide search for `COMMON.md` did not finish in 2 minutes].
Already in top9 `COMMON.md` line 12: "Keep tool calls short (under 3 minutes each); do not sit idle waiting (the helper
cache lives five minutes)". Right in aim, but the counts show helpers set 300000 themselves, and it gives no polling form.

I did not edit `COMMON.md` (live for the other helpers of this session) or the finished session-8 file. New template
file beside the earlier ones: `research-tree/build/briefs/COMMON-WAITS.md`. Line added (diff against nothing):

```diff
+- A helper's prompt cache lives 5 minutes (r57-0176). Any gap over 300 s between two of your model calls (a shell
+  call that runs long, a sleep, a wait for another helper) rewrites your whole context at full price, about 160 K
+  tokens a time. Keep every shell call under 240 s: set `timeout` to 240000 or less (never 300000); start anything
+  that may run longer in the background, writing to a log file, and read the log in calls that each end within 240 s.
+  Do not run a foreground command with no timeout if it may pass 120 s (it is moved to the background and you wait).
```

Proposed replacement of top9 `COMMON.md` line 12, for the coordinator to apply:

```diff
-- Keep tool calls short (under 3 minutes each); do not sit idle waiting (the helper cache lives five minutes).
+- Keep every shell call under 240 s (`timeout` at most 240000, never 300000); put anything longer in the background
+  with a log and read the log in calls under 240 s. A gap over 300 s between your calls rewrites your whole context
+  (about 160 K tokens; r57-0176). Do not sit idle waiting.
```

Why 240: the cache age is counted from request to request, so a call's generation time adds to the wait
(`replay-L24/RESULT.md`, amendment). The 60 s margin is not sized by the replay's records [hypothesis].

## 3. Proposal for a check (not built)

A PreToolUse hook on Bash and PowerShell, helpers only. It would test: `tool_input.timeout` over 270000; no timeout
with a command matching a known long one from the build (for example the suite whose longest file runs 270 s,
`research-tree/build/briefs/LANE.md` line 8); `sleep N` with N over 240. It refuses with one line naming the form
(timeout 240000, background with a log). Worth it on the counts: 70 calls with a timeout of 300 s or more (11.5 M, all
bands) and 71 default-timeout calls (11.2 M, 5-10 min) it would turn into a log poll. It cannot see: how long a command
really runs; long generation (39 calls, 4.5 M in 5-10 min); queue or resume waits; whether the helper then polls sensibly
(100 quick polls cost as much as the lapse, section 4); whether the context is large enough for a lapse to matter. When
built, r57-0011 applies (hooks or scripts, look at each scenario).

## 4. What cannot be kept under the mark, and the saving

Cannot be kept: a command that itself runs over 5 minutes and prints nothing until it ends (the helper's cache lapses
once unless it polls a log the command writes); a wait on a queue or on the coordinator; a resume after hours; a long
generation. The line does not touch these.

Saving per avoided lapse [measured figures; weights fresh/5-min write 1, read 0.01 from `replay-L24/RESULT.md`]:
- Tokens re-written per 5-10 min helper lapse: 46.2 M / 296 = about 156 K (median 164.5 K on the 206 of
  `flagged.json`). Saved on the meter: about 0.99 of it, about 154 K (read at 0.01 instead of written at 1).
- Of that, the fixed prefix is about 58 K per helper (`JUDGE-REPLAYS.md` section 2, L2); the rest is conversation.
- One poll that refreshes the cache reads the same context at 0.01, about 1.6 K, so a poll costs about 1 % of the lapse:
  break-even about 100 polls per avoided lapse [reasoned from the same weights].
- Ceiling for the line: 195 shell calls of the 5-10 min block x 154 K = about 30 M, about 3.2 % of the 927 M fresh
  tokens counted and about 2.5 % of the 1,208 M meter (`ka.txt`) [hypothesis: the share that can poll cleanly is
  unknown, and a command that truly runs past 300 s caps it lower]. The 10-30 min and longer shell rows (about 25 M)
  are not counted: part of them are the same long commands, part are resumes.

## Not read
- Why each helper waited (only the last tool call of the span, not the helper's reason or its text).
- 9 helper transcripts that could not be opened now (1.5 M).
- The sleep rows beyond the sleep time; the no-tool rows beyond the absence of a call.
- Tree scripts and any brief generator beyond a name search in `build/`; the hooks in `.claude/hooks/`.
- Whether a helper can poll with a foreground wait at all (the shell tool may block long foreground `sleep`): not
  tested, no run made.
- The 1-hour write weight and whether any keep-alive exists (open items of replay-L24).
