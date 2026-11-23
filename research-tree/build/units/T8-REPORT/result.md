# T8-REPORT result: a check on what reaches the owner (top session 8, 2026-11-24)

Brief: `research-tree/build/briefs/TOP8-REPORT.md`; ruling r57-0056; rule CLAUDE.md 6, r57-0017, r57-0027, the
owner's note "Big picture, not figures" (2026-11-23).

## Built
- `.claude/hooks/owner-report.mjs` (live file name; built as `owner-report.next.mjs`, moved in one step after its tests
  passed; not wired yet). It reads the three places the owner reads:
  - PreToolUse `mcp__ccd_turn__wrap_up`: recap, ask and button labels;
  - PreToolUse `Artifact` (publish only): every local text file the call publishes: the page (visible text, title/alt
    attributes, and the string literals of its scripts), supporting and data files (`files`, `file_paths`), and the
    description/title/label;
  - Stop with no agent_id: `last_assistant_message`.
- It refuses with exit 2 and one plain line: record ids (any writer prefix with a digit, e.g. r57-0056, x13-0117,
  d3c-0403, x120-0400, plus the journal's digitless writers such as bp); unit names read at each call from
  `research-tree/build/` (units, briefs, replays and their short names L2 to L38, plan.json units and batches; plain
  words like GATE or PLAN left out) plus the form T<n>-NAME; repository paths (absolute into the repository, Git Bash
  form, a path from a top-level folder with or without a short alias such as `H/`, a bare file name ending .md .mjs
  .cjs .json .jsonl .sh .ps1); money (a currency sign or code next to a number, r57-0003); "in no paper" and its forms
  (r57-0029, r57-0610). URLs are skipped. A file he opens himself (.drawio .pdf .png .svg .html .pptx .docx .xlsx .jpg)
  may be named: diagrams and the compile reach him as such files.
- `.claude/hooks/owner-report.test.mjs`: 23 cases, real hook JSON shapes (keys of the probe log of 2026-11-18), run
  in a temporary copy that mirrors this repository's names.

## Decisions, from the record
- Figures: no recorded number for "a handful" (`lookup.sh handful` holds none; r57-0002 forbids one by preference).
  So the count is a note, not a refusal: PostToolUse on wrap_up adds additionalContext "the box holds N figures..."
  when N > 0 (dates and clock times count as one each). Pages are not counted: the owner's note keeps the figures in
  the files and the page. A Stop refusal states the count; a clean last message gets no count (a Stop hook can only
  speak by refusing).
- No "record" section of ids on a page: CLAUDE.md rule 6 puts the record in the markdown behind the page. Tested.
- Stop is checked: t7-0608 and the note of 2026-11-23 were chat messages, not only boxes. Loop guard (x01-0308):
  when stop_hook_active is true the stop is let through and logged, so it asks once per stop. Helpers (agent_id) are
  not checked: their words go to their caller. Child sessions started in this repository are checked like the top.
- Write of a page file is not checked: publishing is the gate (drafts would be refused otherwise).

## Tests
`node .claude/hooks/owner-report.test.mjs`: 23 of 23 pass. The cases that fail on the old code (no hook: everything
passed) are top session 7's own box of 2026-11-23 with "L8" and "L6", its results page `page/top7-page.html`
(ids, unit names, paths) and a relayed helper return as the last message. Replayed over the last 12 transcripts: 18 of
71 closing boxes and 112 of 463 chat text blocks would have been refused; every hit read was a real label (L6, S2,
TOP6-WIDEN-RUN, r57-0047, TOP-STATE.md, GO.md...). One wrong hit found and fixed: a path in backticks to a .png.

## What it cannot see
Whether the picture comes first or the words are plain; whether a number matters; labels not in the files it reads
(claim and lead numbers such as C38 or L59, research-run parts such as f4c, field names); a label he asked for by
name (the second stop passes; boxes and pages must drop it or say what it is); text a page's script computes; a page
built from another artifact's copied files; the docs connector; a short name that is also a real term ("L2 cache"
would be refused as the replay L2). A hook input it cannot read, or its own error, lets the call through (logged to
`.claude/logs/owner-report.jsonl`). If the app stops sending last_assistant_message, the Stop check sees nothing.

## Settings entries to add (`.claude/settings.json`, under "hooks")
PreToolUse (add to the list):
  { "matcher": "mcp__ccd_turn__wrap_up|Artifact", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/owner-report.mjs\"" } ] }
PostToolUse (add to the list):
  { "matcher": "mcp__ccd_turn__wrap_up", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/owner-report.mjs\"" } ] }
Stop (new key):
  "Stop": [ { "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/owner-report.mjs\"" } ] } ]

## Seeing it work live
After wiring (a fresh session if the app does not pick up settings changes): (1) call wrap_up with recap "See r57-0056."
and see it refused with the reason; (2) publish a scratch page holding "t7-0608" and see "Page refused"; (3) end a turn
with a message naming `library/INDEX.md` and see the session told to rewrite once, then stop normally; (4) read
`.claude/logs/owner-report.jsonl` for the deny, note and "second stop let through" lines.
