# T8-COUNT: how many helpers run at once, gated (2026-11-24)

Brief: `research-tree/build/briefs/TOP8-COUNT.md`. Status: built and self-tested; not wired, not seen live.

## What was built
- `.claude/hooks/count-gate.mjs` (new hook, beside the plan gate; the plan gate is unchanged, since it is active only
  while `plan.json` exists and the count must hold in every session). PreToolUse on Agent, Task and SendMessage.
  It counts the helpers running now in the session, helpers of helpers included, and refuses (exit 2, one line) a
  start, or a SendMessage that would revive an ended helper, when (1) running + admitted-but-not-yet-shown + 1 would
  pass the app's limit (20, or `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` when set), or (2) a width or hold declared in
  `research-tree/build/WIDTHS.md` would be passed. Commands: `--status <session id>` (what it counts), `--end <agent>
  <why>` (end a stale entry by hand). Log: `.claude/logs/count-gate.jsonl`.
- `.claude/hooks/count-gate.test.mjs`: 19 cases, `node .claude/hooks/count-gate.test.mjs`.
- `research-tree/build/WIDTHS.md`: the file and format a plan uses to declare a width (no declaration in force).
- `measure-silence.mjs`, `replay-limit.mjs` here: the two measurements below (read-only over transcripts and logs).

## Where the count comes from
The app's own files: `<project>/<session>/subagents/agent-<id>.meta.json` (description, toolUseId, parentAgentId,
spawnDepth, and `"finished": true` written when the helper stops) and `agent-<id>.jsonl`. The folder comes from the
hook input's `transcript_path` (a helper's own transcript lies in that folder, so both forms work). A helper runs
when its meta has no `finished`, or its transcript was written more than 1 s after the meta (revived), and when it
or a helper below it wrote within T_quiet. Parallel calls in one message are serialized by a lock and an admitted
start counts as pending until its meta shows (by toolUseId) or for 16.7 s.

## Measured (this unit, 2026-11-24, from files on disk; no run)
1. **The app counts what runs between SubagentStart and SubagentStop, whole session, any depth.** Replayed from
   `.claude/logs/plan-gate.jsonl` for session ad4e59df (top session 7, 2026-11-23): at each of the app's 26
   "Concurrent subagent limit reached" refusals 20 were running, counting the starts of the same batch the app
   admitted (13 + 7 at 17:01:28: replay-L6b's batch of 16, 7 started, 9 refused); before each of its 178 successful
   starts 19 or fewer. The refusal text: "You can run 20 subagents at once ... increase
   CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS". A helper that waits on a background task has stopped (SubagentStop fires)
   and is revived by the notice; it does not count while it waits. (`replay-limit.mjs`.)
2. **The meta file follows that state.** Over 450 finished helpers of this repository the transcript's last write
   is at most 0.1 s after the meta's, including helpers revived several times; so "finished, transcript not newer"
   is exactly "stopped". Unfinished metas on disk: 1 old one (session 3f32429e, 2026-11-18, a helper killed by an
   app restart: r57-0118) and the running helpers of this session. (`measure-silence.mjs`.)
3. **Stale entries: T_quiet = 10.8 min.** The longest silence of a running helper (gaps between its transcript lines
   while it ran, periods after a SubagentStop left out) over the 314 helpers of 2026-11-19 to 23: median 1.1 min,
   p90 3.4, p99 8.2, max 10.8 (an orchestrating helper while its 18 helpers worked); counting the writes of its own
   helpers, max 9.4. A first pass that did not leave out the stopped periods gave 46.5, 30.0 and 24.3 min: each was a
   helper that had stopped and was later revived by a message or a background notice, not a running silence. Same
   form and nearly the same figure as WIDEN.md D6 (10.9 min in 262). The gate uses the helper's and its helpers'
   writes, so the margin over the 9.4 min it measures is 1.4 min; a helper silent longer than every one of 314 is
   dropped from the count (about 1 in 315 if the sample holds), which errs toward the app's own limit refusing, the
   behaviour before this gate. A dead helper holds a slot at most 10.8 min, or until `--end`.
4. **Pending: 16.7 s.** From PreToolUse to the Agent call's return over the 72 admitted starts in the plan gate's
   log: median 0.32 s, max 16.7 s.
5. **Cost:** counting 172 meta files (top session 7's folder) took 6 ms; a whole hook call about 40-50 ms (node start).

## Which widths of r57-0414 a hook can compute today
- **The app's 20 a session: yes**, enforced (measured above).
- **A width the plan states: yes**, enforced through WIDTHS.md (`width "<pattern>" <n>: <reason>` and `hold
  "<pattern>" while "<pattern>": <reason>`; the reason carries a number, r57-0002; a line that does not parse refuses
  every start, so a declared width is never silently off). The 2026-11-23 break would have been the line
  `hold "orchestrate: wave2 *" while "*replay-*": ...`; its test case refuses the part and passes the rest.
- **Memory: no.** Helpers have no process of their own (ORCHESTRATION.md section 6, [m]); a helper's memory is not
  separable or measured. Free memory is readable, but with no per-helper peak there is no width to divide it into.
- **Processor, bandwidth: no** per-helper figure exists. **The check (lane): not a helper resource**; lane.mjs holds it.
- **Token windows: no.** The meter is read by hand in the app (BUILD-IN C26); no hook can read it. (T8-BASIS's gate
  sums transcripts against an agreed cap, a different rule.)
- **The parent's window: not yet.** Its width b <= (room to the line)/s_summary needs s_summary, which is not measured
  (r57-0835; t1-0500 open, a count over transcripts), and the line, which T8-CEIL's hook computes and enforces by
  refusing every start above it. Once t1-0500 is counted, a term can be added that reads the ceiling hook's log.
- **Ready work: no**; it is in the coordinator's plan, which states it through WIDTHS.md if it binds.

## Child sessions
start_session is seen by PreToolUse (the tier hook has logged 68 of them), so starts can be counted. A running count
cannot: no end event of a child session reaches this session, and a session's silences are unmeasured (a root waited
hours for the owner's typed turn, r57-0171). Child sessions are not in the app's 20 (that limit is per session).
So the gate does not handle start_session; the tier hook's log holds the starts.

## What it cannot see
- Helpers started by a workflow script, or with `isolation: "worktree"`: whether their meta files land in this
  folder, and whether the app counts them in the 20, is not observed.
- Other sessions and child sessions (above); helpers of other projects.
- A helper silent longer than 10.8 min with no writing helper below it is dropped from the count (point 3).
- An admitted start that another hook then refuses holds a pending slot for up to 16.7 s.
- If counting fails (an unreadable folder, a lock not taken in 4 s) the start passes and the log says so.
- A plan width that nobody copies into WIDTHS.md; a pattern that matches the wrong descriptions.

## Tests
`node .claude/hooks/count-gate.test.mjs`: 19 of 19 pass (count with nested and finished helpers; the limit at 20 and
19; the env limit; stale at 11 and 10 min; a silent parent with a writing child; revived and finished; pending and
its expiry; the 2026-11-23 batch replayed: 7 pass, 9 refused, as the app did; the old hooks let the 21st start
through; a declared hold and width; four malformed declarations; `--end`; SendMessage to a running, an ended and a
named helper; the input inside a helper; odd input and an 800-character pattern; the repository's WIDTHS.md and its
examples; `--status`). Five mutants (no expiry, no lock, no pending, no revival, no subtree) each fail at least one
case; the lock's case sends the 16 inputs at once after the processes start. `node --test
.claude/hooks/plan-gate.test.mjs`: 37 of 37 (unchanged).

## Settings entry (for the top session to add to `.claude/settings.json`, in "PreToolUse")
```json
{ "matcher": "Agent|Task|SendMessage", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/count-gate.mjs\"" } ] }
```
(or the same command added to the existing plan-gate group's "hooks" list). No PostToolUse, SubagentStart or
SubagentStop entry is needed.

## How to see it work live
1. `node .claude/hooks/count-gate.mjs --status <this session id>`: the running helpers, with depth and silence
   (at writing it listed this session's four running T8 helpers).
2. Add to WIDTHS.md: `width "extract: count-probe*" 0: live check of T8-COUNT on 2026-11-24` and start one helper
   "extract: count-probe A" on haiku: refused with the count gate's line; `.claude/logs/count-gate.jsonl` has the deny.
3. Replace it by `hold "extract: count-probe b*" while "extract: count-probe a*": live check of T8-COUNT on
   2026-11-24`; start "extract: count-probe A" in the background (a task of a minute or two), then "extract:
   count-probe B": B is refused while A runs and passes after A's finish notice. Remove the line afterwards.
The limit itself is seen only by starting 20; the replay case stands in for that.

## Records to add (through the journal tool, by the top session)
- fact, measured: the app's limit counts helpers between SubagentStart and SubagentStop, whole session, any depth;
  26 of 26 refusals at 20, 178 starts at 19 or fewer (point 1); the env variable's name; a helper waiting on a
  background task is not counted.
- fact, measured: the meta's `finished` follows stop and revival (450 of 450, point 2).
- fact, measured: longest silence of a running helper 10.8 min in 314 (9.4 with its helpers' writes); the 46.5,
  30.0 and 24.3 min silences were stopped helpers later revived (point 3; agrees with WIDEN.md D6, which already
  called its 46.5 and 21.7 min cases resumed).
- pointer: the count gate, WIDTHS.md and their tests; what it cannot see (above).
