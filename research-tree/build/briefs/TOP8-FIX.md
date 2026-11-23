# T8-FIX: the review's breaking findings (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first, then `research-tree/build/refute/TOP8.md` (the review: B1 to B4 with file, line,
reproduction and the smallest fix; probe scripts in `research-tree/build/units/T8-REFUTE/`). Each fix gets a test
that fails on the current code (r57-0164's practice). Run every hook's self-tests once at the end.

Fix:
- B1 window-ceiling: early large jumps put the line below the context. Use the recorded growth until the session or
  segment has its own 17 calls (ORCHESTRATION.md section 5); check against the reviewer's replay (459 helpers).
- B2 fanout-gate with count-gate: the first try of every start is refused because the start's own message is not in
  the transcript yet at PreToolUse (seen live twice in the top session), and the count gate has meanwhile counted
  that refused start as pending. Fix the cause in the fan-out gate (tell "the reading is in an earlier message" from
  what the transcript holds at PreToolUse without needing the start's own line; prove it on the top session's real
  transcript, `~/.claude/projects/C--Users-User-Documents-projects-harness-engineering/6d4e3fd7-92ad-45a8-a031-10eb6ba92103.jsonl`,
  whose refuter start was refused once and passed once), and make the count gate drop a pending start that a later
  hook refused (or count only the latest allow per tool_use / description, whichever the record supports).
- B3 window-ceiling: W* only for a coordinating session; every other session and helper gets the checkpoint form
  (section 5's 330 K at 3.8 K a call, from its autocompaction point). Decide how a hook knows a session coordinates
  (for example a state file naming its session id and "kind orchestrate", as `research-tree/build/TOP8-STATE.md`
  does); the owner's own sessions must not get the coordinator's line unless they name themselves so.
- B4 count-gate's 10.8 min, 1 s, 16.7 s and the lock times (count-gate 5 s and 4 s, journal-rules 60 s, journal-watch
  3 s): each number either from a journal record of its measurement (add the measurement records yourself through
  `node tools/journal.mjs`, prefix t8, kind fact, status measured, evidence the result file or script) or computed
  from one already recorded (r57-0181: index.lock waits 162-198 ms), with the record id beside it in the code.
- Two faults the top session saw live in count-gate's refusal text: the reason's last word is cut ("0 helpers" shown
  as "0 "); it proposes `--end <id>` for a helper that is running and was active 0.2 min ago (name only one past the
  expiry, or none).
Do not take the non-breaking items unless a fix above touches the same lines.
token limit 16 M (expected about 11.7 M, basis r57-0164)
