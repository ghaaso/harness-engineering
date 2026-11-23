# T8-BASIS result (top session 8, 2026-11-24)

Brief: `briefs/TOP8-BASIS.md`. Tokens: about 6.2 M at hand-back, against a 12 M limit and 8 M expected (r57-0165).

## What was built
- `.claude/hooks/fanout-gate.mjs`: a new PreToolUse hook on Agent and Task. It is built in its own file, and
  `plan-gate.mjs` is not touched. It was built in `fanout-gate.next.mjs` and moved into place after its tests passed.
- `.claude/hooks/fanout-gate.test.mjs`: 33 cases. Each one sends real PreToolUse JSON to the hook and uses a small
  fake transcript, journal and state file in a temporary folder.

## What it refuses (exit 2, one line)
1. **A limit without a measured basis (r57-0038, r57-0617, t7-0602).** The start writes one line, in its prompt or in
   the first brief the prompt names (a `.md` file in a folder called `briefs`):
   `token limit 12 M (expected about 8 M, basis r57-0165)`. The units can be K, M or B. The first such line counts.
   The hook refuses the start when:
   - the line has no expected figure;
   - the limit is not above the expected figure (r57-0038 says never equal);
   - the line cites no record id;
   - a cited id is not in `library/journal`;
   - none of the cited records has the status measured or observed.
   Other documents that a prompt names are not read, so their stories about limits do not trip the hook.
2. **Helper limits that add up past the cap (r57-0614).** The cap comes from the session's state file. That file is
   the `research-tree/build/*.md` that holds the words "Session <first 8 characters of the session id>". If several
   files do, the one changed most recently counts. The cap is the file's last line that begins "Cap" and holds
   "<n> M tokens". Every session that the file names in the same way counts against the cap, so a successor session
   is included.
   - The check: tokens spent + the unused part of each running helper's limit + this start's limit must stay at or
     under the cap. Tokens spent are counted from every transcript of those sessions and their helpers (input, cache
     creation, cache read and output, once per message id, the way r57-0170 counted).
   - Why the state file and not the journal: a cap ruling in the journal does not say which session it binds. The
     state file names the session.
   - A start with no limit at all:
     - when a cap is in force, it is refused, because the sum cannot be kept without its limit (r57-0614);
     - when there is no cap, it passes. r57-0038 says how a limit is set; it does not require a limit where no cap
       was agreed.
   - Running or ended: a helper counts as running until the app writes `"finished": true` in its `.meta.json`, or
     until the count gate's manual end marks it (`node .claude/hooks/count-gate.mjs --end <id> <why>`), which covers
     a helper killed by a restart (r57-0118). A start that has no helper file and no answer yet (an earlier start in
     the same message) is counted at its whole limit.
3. **A fan-out without a meter reading (rule 5, r57-0615).** The caller's own transcript must show a get_usage
   result. For a helper this is its own file under `<session>/subagents/`. The reading must:
   - come from an assistant message earlier than the one that makes the start;
   - be called after the previous wave of starts (a start that was refused is not a wave);
   - be no older than 26 minutes;
   - if the state file has a line `Meter line: N %` (or `Fable meter line: N %`): be under that line, with the
     reading plus what the meter could have moved since the reading.

   The 26 minutes come from r57-0183: the meter went from 85 % to 88 % in 105 minutes. With whole-percent readings
   that is at most 4 points, so the meter can move one point (its resolution) in 105 / 4 = 26.25 minutes. That is
   the fastest of the recorded intervals: r57-0170 gives at most 17 points in 906 minutes, and r57-0165 gives at most
   3 points in 101 minutes.

   If the start's own call is not in the transcript yet and nothing written after the reading proves that a new
   message began, the start is refused with "try the start again in its own message".

## Checks on real data (read-only)
- The build root of 2026-11-19 (105 MB of transcripts): the hook counted 751.4 M spent, against r57-0170's 750.2 M
  (111.9 M for root 1 plus 638.3 M for its helpers). The run took 0.5 s.
- This session, for a refuter start (limit 14 M, expected 10.6 M, basis r57-0173): the meter check refuses it,
  because the last reading came before the wave that started T8-BASIS and T8-REPORT. With the meter check left out
  (a scratch copy), the cap check passes it: 23.1 M spent + 54.0 M left on 5 running helpers + 14 M = 91.1 M, under
  110 M.
- The real T8-CEIL start prompt ("Your token limit is 15 M (expected about 10 M).") is refused: no basis on the line
  (case L2).

## Tests
`node .claude/hooks/fanout-gate.test.mjs`: 33 of 33 pass (12 limit, 13 meter, 5 cap, 3 pass-through or fail-open).
Every "deny" case passed before this hook existed.

## What it cannot see
- A cost that the plan left out (t7-0602): a cited role can fit on paper while nobody priced a step.
- Whether the cited record is about similar work.
- The coordinator's own tokens still to come.
- The owner's own use since the reading.
- A wave that is heavy on Fable, which moves the meter faster than the measured mixes (r57-0175).
- Child sessions (start_session is not matched) and helpers that Workflow scripts start.
- A reading the owner typed.

If the hook itself fails (an error, or a transcript it cannot find), it logs the failure and lets the start through.
Log: `.claude/logs/fanout-gate.jsonl`. Each line holds the limit, expected figure, ids, cap, spent, reserve and
decision.

## Settings entry to add (in "PreToolUse")
    { "matcher": "Agent|Task", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/fanout-gate.mjs\"" } ] }

## Seeing it work live
After you wire it, in the top session:
1. Start any helper without reading the meter first. The hook refuses: "read the meter (get_usage) in a message
   before this start".
2. Call get_usage. In the next message, start a helper whose prompt holds
   `token limit 1 M (expected about 0.5 M, basis r57-0173)`. It passes.
3. Start the same helper with `basis r57-0038`. It is refused: not measured or observed.
4. Read the last lines of `.claude/logs/fanout-gate.jsonl` to see the cap, spent and reserve figures.
