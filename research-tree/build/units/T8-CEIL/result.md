# T8-CEIL: the window ceiling as a hook (2026-11-24)

## Built
- `.claude/hooks/window-ceiling.mjs`: a PreToolUse hook on every tool (matcher `*`). It reads the context of the
  session's last call from its transcript, computes the session's line, lets calls through, adds a notice, or refuses.
- `.claude/hooks/window-ceiling.test.mjs`: 89 cases, `node .claude/hooks/window-ceiling.test.mjs` → 89 passed, 0 failed
  (about 3 s). Every case pipes real PreToolUse JSON into the hook as its own process, using transcripts built in a
  temporary folder. Logs go to that folder and never to `.claude/logs`. Five mutations of the hook were each caught (9,
  30, 4, 1 and 1 failing cases): margin set to 0, every call treated as a hand-over call, helper lines counted in the
  main session, compaction ignored, and the test scale applied to the wrong helper.
- No live file was replaced. The hook is new, and it binds nothing until it is added to the settings.

## What it reads (measured)
- The context of a call is input + cache creation + cache read + output on the last `"type":"assistant"` line that
  has `message.usage`. Lines with the same message id count as one call. Sidechain lines and `<synthetic>` lines are
  skipped. The hook reads only the bytes added since its last run (offset and running totals are cached in
  `.claude/logs/window-ceiling-state/`). One run takes 78-95 ms, Node's start included, on a 5.8 MB transcript.
- Helpers: SubagentStop's input carries both `transcript_path` and `agent_transcript_path` (plan-gate log), so in a
  helper `transcript_path` is the parent's. The hook therefore judges a helper by its own file,
  `<dir>/<session>/subagents/agent-<agent_id>.jsonl`. This session uses that layout. If `transcript_path` is already
  the helper's own file, the hook uses it as given. If no own file is found, the call passes and is logged as
  `src: none`. Each log line says `own`, `derived` or `none`, so the first live helper call settles which case holds.

## The line, derived (ORCHESTRATION.md section 5; r57-0171)
- W* = F + sqrt(2 R g). R is this session's context summed over its first 17 calls, the successor being expected to
  orient the same way (r57-0171: 17 calls, 2.33 M). Before call 17, R = 2.33 M. F is the context at call 17 of the
  current segment (a compaction starts a new segment, as r57-0171 did). g is the growth per work call since then.
- Re-measured today on five Opus roots: their first 17 calls summed to 2.23-2.48 M and F was 166-183 K. Both agree
  with r57-0171. The tests reproduce r57-0171's 247 and 273 K.
- Warning line = W* (section 5: hand over at the first quiet point after W*). Hard line = W* + 10 calls at the
  session's own g. Both are held 10 calls under autocompaction, which is 92 % of the window: 368 K for Opus from the
  settings' 400 K, 920 K for Fable and Sonnet (1M). The 10 calls are section 5's room to reach a quiet point and write
  a checkpoint. A model with no known window gets W* only.
- Helpers do not hand over at W* (section 5, "not adopted"). Their hard line is the checkpoint, 368 K minus 10 calls
  at their own g (330 K at 3.8 K a call). Their warning comes 10 calls before that.
- Replayed on past sessions: top session 7 (Fable, which ran to 353 K) would have had its notice from 289 K and been
  refused from 309 K. Root 2 (ran to 347 K): 263 / 285 K. Root 3 (ran to 328 K): 282 / 308 K. Top session 8 now:
  notice at about 228 K and line at about 245 K, at 149 K after 20 calls. Its g is not settled yet, so the line will
  move. This helper's checkpoint is 336 K.

## Decisions
- Below the warning line, every call passes silently. Between the two lines, every call passes with a short notice
  (`hookSpecificOutput.additionalContext`, which the hooks documentation lists for PreToolUse).
- At or above the line, only these pass:
  - Writes and edits to `research-tree/build/*STATE.md` (STATE, TOP-STATE, TOP8-STATE), `research-tree/build/briefs/*.md`,
    `research-tree/build/units/**`, the shared notes folder `…/Claude-Data/*/side-session-notes/**`, and the session's
    own scratchpad (for a commit message file).
  - Read of those same files.
  - Bash or PowerShell commands built only from `cd`, `git status|add|commit|rev-parse|log`, `node tools/journal.mjs`,
    `date`, `head`/`tail` behind a pipe, and `node .claude/hooks/window-ceiling.mjs --test-off|--show`. A here-document
    or here-string is accepted only as a git commit message. `$(`, backticks and redirections are refused.
  - start_session, hand_off_to_session, wrap_up, update_plan, SubagentHandback, TaskStop, ToolSearch (start_session is
    a deferred tool) and AskUserQuestion (the record guard still limits its form).
  - SendMessage only when it tells a helper to stop, checkpoint or hand over, so that running helpers can end cleanly.
- Everything else is refused with exit 2 and one line that names the context, the line and the hand-over. That
  includes Agent, Task, Grep, Glob, other reads and writes, and other commands.
- Every decision is logged to `.claude/logs/window-ceiling.jsonl` with the context, both lines, g, W*, the model and
  the decision. An error or an unreadable input lets the call pass and is logged.

## What it cannot see
- A session that keeps talking without tool calls. The hook acts only on tool calls.
- The current call itself. The transcript holds calls up to the one that issued this tool use; the app's own figure
  ran about 5 K higher.
- Quiet points: whether helpers are still out is not known to it.
- It cannot start the successor. A start needs a turn the owner typed (r57-0109); the refusal says to tell the owner
  and stop.
- R, 17 and 10 were measured or computed on Opus roots. R for Fable and for helpers is not in the record (section 11).
- A model with no window in the settings and none in the family table (Haiku) gets no compaction cap.
- Reading a hand-over file through `cat` is refused; the Read tool must be used.
- A message to a helper is matched by its words.
- There is no owner override. The test file can only lower a line.

## Settings entry (the top session adds it under "PreToolUse")
{ "matcher": "*", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/window-ceiling.mjs\"" } ] }

## Seeing it live without filling a window
1. `node .claude/hooks/window-ceiling.mjs --show "C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/6d4e3fd7-92ad-45a8-a031-10eb6ba92103.jsonl"`
   prints the session's context, W*, warning and line.
2. `node .claude/hooks/window-ceiling.mjs --test 6d4e3fd7-92ad-45a8-a031-10eb6ba92103 <scale> 10` scales both lines
   by `<scale>` (0 to 1) for this session only, for 10 minutes. Choose the scale so that the line falls just under
   the present context, for example 0.5. Each use is logged with `"test"`. The file is ignored for any other session,
   for helpers unless one is named as a fifth argument, after it expires, and when its scale is 1 or more.
3. Then: a Grep is refused in one line; a Write to `research-tree/build/TOP8-STATE.md` and `git status` pass; a scale
   that puts the context between the two lines shows the notice.
4. `node .claude/hooks/window-ceiling.mjs --test-off` ends the check. That command passes even above the line.
5. Watch `.claude/logs/window-ceiling.jsonl`. On the first call a helper makes, `src` shows whether `transcript_path`
   pointed at the helper's own file (`own`) or at the parent's (`derived`).
