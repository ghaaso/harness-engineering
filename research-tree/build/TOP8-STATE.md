# Top session 8: state (enforce the method, r57-0532)

Session 6d4e3fd7 (app local id from the start note), Opus, kind orchestrate. Brief: `briefs/TOP8-ENFORCEMENT.md`.
A successor reads this file first, then the board.

## Facts so far
- Meter 2026-11-24 at start: weekly all models 33 %, Fable 13 %, reset 2026-11-30 12:00 UTC.
- Cap agreed with the owner (cap: line, answered "Approve 110 M"): 110 M tokens for this whole piece; expected about 80 M.
- Measured here: a hook's `transcript_path` lets it read the last call's usage. This session at its 16th call:
  input 2 + cache creation 3,839 + cache read 118,753 + output 456 = 123,050 tokens; the app's own reading a
  moment later: 127,926 of a 400,000 window, autocompaction at 92 % (368 K). r57-0106 said a hook is never told the
  context size: true of its input, but the transcript it is pointed at holds the size.
- This session started with about 100 K of fixed load (tools 25.6 K, MCP tools 13.8 K, system 11.4 K, skills 6.3 K,
  memory 4.9 K) plus the board; its working room to a hand-over point is small.

## Plan and limits (expected from measured roles: r57-0165 hook builders and fixers 8.6-11.9 M; r57-0173 refuter 10.6 M, analyser 9.1 M)
| Unit | Kind, model | Brief | Expected | Limit |
|---|---|---|---|---|
| T8-CEIL window ceiling hook | build-invariant, opus | briefs/TOP8-CEIL.md | 10 M | 15 M |
| T8-COUNT helpers at once | build-invariant, opus | briefs/TOP8-COUNT.md | 10 M | 15 M |
| T8-JOURNAL journal tool, guard closed | build-invariant, opus | briefs/TOP8-JOURNAL.md | 12 M | 18 M |
| T8-TABLE every rule and its enforcement | analyse, opus | briefs/TOP8-TABLE.md | 9 M | 14 M |
| T8-REFUTE one blind review | refute, opus | (after the four) | 10.6 M | 14 M |
| fixes of breaking findings | build-invariant, opus | (after) | up to 12 M | |
| this session | | | about 15 M | |

The four first units touch different files; none edits `.claude/settings.json` (this session wires the hooks).

## Progress
- Started the four units at once as background helpers of this session (2026-11-24), each told to write
  `research-tree/build/units/<UNIT>/result.md`. Next: wire their settings entries, live checks, the blind review.
- T8-TABLE done: `research-tree/build/ENFORCEMENT-TABLE.md` (every rule; 10 ranked proposals). From its proposals 1-3,
  two more units started after a meter reading of 33 % (context then 143 K): T8-BASIS (briefs/TOP8-BASIS.md, a
  limit cites a measured basis and the meter is read before a fan-out; expected 8 M, limit 12 M) and T8-REPORT
  (briefs/TOP8-REPORT.md, no internal labels in what reaches the owner; expected 8 M, limit 12 M). Expected total now
  about 95 M under the 110 M cap.
- T8-CEIL done (89 self-tests). Wired in `.claude/settings.json` (PreToolUse, first). Seen live in this session:
  it read 152 K from the transcript and logged allow; under a 10-minute test scale of 0.5 (line 120 K) a Grep was
  refused with the hand-over reason, and this edit of the state file passed. Unscaled line here: notice ~230 K, hard ~247 K.
- T8-COUNT done: new `.claude/hooks/count-gate.mjs` (19 tests; plan gate 37 still pass), widths file
  `research-tree/build/WIDTHS.md`. Wired (PreToolUse Agent|Task|SendMessage). Seen live: --status counted the 3
  running helpers right; a declared width 0 refused a Haiku probe start (log line, deny). Faults seen for the fix
  round: the refusal cuts the reason's last word ("0 helpers" -> "0 "); it proposes `--end` on a running helper
  silent only 0.2 min (it should name only a helper past the 10.8-minute expiry, or none).
- T8-BASIS done: `.claude/hooks/fanout-gate.mjs` (33 tests; counted 751.4 M on the build's transcripts against
  750.2 M in r57-0170). Wired (PreToolUse Agent|Task). Observed: a hook added to settings in the same message as a
  start did not run for that start (probe A went through unchecked, no log line); in the next message probe B was
  refused live (meter read before the previous wave). The pass path is to be seen with the refuter's start.
- T8-REPORT done: `.claude/hooks/owner-report.mjs` (23 tests; on 12 past transcripts 18 of 71 closing boxes would
  be refused). Wired: PreToolUse wrap_up|Artifact, PostToolUse wrap_up (figure warning), Stop. Seen live: a wrap_up
  recap "See r57-0056." refused. Stop path to be seen at this session's turn end (log owner-report.jsonl).
- T8-JOURNAL done: `tools/journal.mjs`, `tools/journal-rules.mjs`, record guard v3, `.claude/hooks/journal-watch.mjs`,
  check-commit v3 (tests 245, 22, 12, 20). Today's three hand-written lines adopted (r57-0056, r57-0532, t7-0608).
  Wired: journal-watch PostToolUse Bash|PowerShell; and all five new hooks also into `library/.claude/settings.json`.
  Seen live: `echo x >> library/journal/.../t7.jsonl` refused by the guard. Not done live: the watch's after-report
  (it would leave a real stray journal line that only a hand edit could remove); its 12 tests cover it. The ceiling
  told the T8-JOURNAL helper a checkpoint was due (seen live inside a helper; it wrote units/T8-JOURNAL/CHECKPOINT.md).
- Meter 34 %, context 182 K. Refuter started (fan-out gate pass path seen live). Fault for the fix round: the
  fan-out gate refused the first try with "reading may be in the same message" although get_usage was in the previous
  message (transcript not yet flushed); the retry in the next message passed.
- Plan to keep this window small: after the refuter, one Opus fixer; then one helper writes the records through the
  journal tool, the board lines, the README text and the page source; this session reviews and publishes.
- T8-REFUTE done: `refute/TOP8.md`, 4 breaking (B1 early-jump line below zero; B2 fan-out first-try refusal plus
  count-gate pending = false "number 21"; B3 the coordinator's W* on every session; B4 numbers citing no record), 13
  non-breaking. Meter 35 %, context 187 K. T8-FIX started (briefs/TOP8-FIX.md; first try refused again by B2,
  retry passed). Then T8-RECORD (briefs/TOP8-RECORD.md, Sonnet): records, board, README, page source; this session
  publishes the page, commits on the owner's word.
- T8-FIX done (`units/T8-FIX/result.md`): B1-B4 and both text faults fixed; records t8-0100 to t8-0106; tests
  ceiling 99, count 25, fan-out all, journal 23, others unchanged and passing. Seen live: the T8-RECORD start passed
  at the first try (B2 fix). Meter 35 %, context 195 K; this session's hand-over point 216 K, hard line 229 K.
- T8-RECORD started (Sonnet). Left for this session: publish `research-tree/build/page/top8-enforcement.html` (the
  report hook checks it), the closing box; commit only on the owner's word. If this session passes its line first,
  a successor does those two steps from this file.
- T8-RECORD done: records t8-0107 to t8-0117, t8-0500, t8-0501, t8-0700 (closes r57-0532; NEXT r57-0531 waits for
  the owner); README, INDEX, CLAUDE.md lines placed. Page published (it passed the report hook):
  https://claude.ai/artifact/NwBgz5wBEP3qHhgpmYLo8X. Stop path of the report hook seen live (3 allows at this
  session's turn ends). Cost about 82 M of the 110 M cap (expected 80 M); the fixer the one unit over its limit.
- Left: commit on the owner's word (this piece's files plus top session 7's uncommitted records and brief; never
  `docs/program/pipeline-diagram/`). Nothing pushed.
- Next (was): meter, then the refuter (briefs/TOP8-REFUTE.md), fixes (incl. the two count-gate message faults above), records
  through the journal tool, README text from units/T8-JOURNAL/result.md, board lines, the page.
