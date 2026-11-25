# Round 8 prototypes: the designer's notes

Saved by the prototype session from the designer's hand-back (Fable, high effort, kind `design`, 2026-11-24), unchanged
in substance: the app refuses a helper's findings file. Spend by the transcript count (all four usage fields, once per
message id): designer 5.63 M of its 7 M limit.

## Files
- Now: `now.mjs`, `now.html`, `now.png` (Tue 24 Nov 03:33), `now-1303.html`, `now-1303.png` (13:03)
- History: `history.mjs`, `history.html`, `history.png`
- Operate: `operate.mjs` (imports the page from `now.mjs`), `operate.html`, `operate.png` (03:29)
- `shot.sh`: the Edge screenshot line. Rebuild: `node now.mjs; node operate.mjs; node history.mjs; sh shot.sh now` etc.

All three share one frame: light, 1870 x 1050, grey for everything normal, red = failed, amber = refused, blue = him
(his messages, a session that waits for him). Each trouble mark also has its own shape.

## Two facts about the data that change what was drawn
1. **Nothing starts at 12:18 in this data.** The quiet stretch is 11:34 to 12:59. One build helper of "Big run third
   coordinator" runs through it (11:26 to 14:03). At 12:59 "Session monitor build" resumes after his message and at
   13:00 "Big run, fourth coordinator" starts. During that stretch Monitor build waited for his answer (asked 11:33,
   answered 12:59). So the second Now state is 13:03. Why his page showed 12:18 was not checked.
2. **The crowd is smaller than the brief says.** At 03:29: 3 sessions working, 1 waiting, 2 quiet, 5 helpers running.
   The hundreds of helpers are finished ones. Eight working sessions at once is not tested.

## 1. Now (03:33, and 13:03)
- Left rail: one strip per session, ordered waiting, working, quiet, ended. A working strip: tag, title, current plan
  step, running helpers as pills by kind, finished helpers as small grey squares, tokens, a 30-minute spend trace.
- Board: every real part by name in a fixed place: 10 hooks, 12 helper kinds with model, 6 commands, tests and git,
  12 scripts, stores and settings, 17 documents. A part in use is white with a black border and carries the tags of the
  sessions on it.
- Trouble on the hook: at 03:33 Window ceiling and Owner report are outlined red with the tags of the sessions hit;
  Tier hook shows refusals (UX x3, BR1, BR2, T9B x2). Journal watch is dashed: it never fired.
- Top band: the last two hours (how many ran, trouble ticks, his messages as blue dots, "you 03:25"). Bottom of the
  rail: who started whom as a small tree of tags. At 13:03 the band shows a bracket "1 h 25 min", then the rise.
- Sources: fixed board with tags in the part, d1 finding 1 and idea 1; grey with colour only for trouble, d1 finding 2;
  shape with colour, d1 finding 8; helpers packed in their session, d1 finding 7, idea 2, d3 finding 5; marks stay until
  seen, d1 finding 14; a long helper's age, d1 finding 3; top band, d2 findings 1, 2; bracket with its length, d2
  finding 7.
- Critique (Nielsen 0 to 4 each): 25 of 40; cognitive load 2 of 8 failed (chunking, working memory). Weakest:
  (1) "since he left" is carried only by small things (the band, the blue dots, marks that stayed); it does not say
  when a mark happened or what was refused. (2) Tags must be matched between rail and board, and rule-made initials
  (HAP, RPM, GAR) mean little; the grey dots on hooks mean nothing to a newcomer, and all hooks light whenever anything
  runs.
- Stranger test: "One session in blue waits for you, two are working (step, helpers, tokens), the rest are quiet or
  ended. On a board of named hooks, helper kinds, commands, scripts, stores and documents, black tags say which session
  is on which part; Window ceiling and Owner report are red with the sessions they hit." Passes for what runs now, which
  parts are at work, what broke in which part for which session. **Fails in part: what happened since he left.** The
  13:03 state passes for the gap and the start.

## 2. History (Wed 18 to Tue 24; window on Tue 24 00:00 to 14:06)
- Seven day-strips, never cut, white where nothing ran, trouble ticks above, his messages as blue dots below. A window
  on Tuesday funnels down to the lanes.
- 20 session lanes, indented as a tree in the label gutter: dark bars for turns, helpers packed under it in thin
  sub-rows, red and amber ticks at the moment of trouble, a blue line where it waited for him (04:26 to 10:32, 11:33 to
  12:59).
- The empty stretch 05:46 to 10:33 folded into a hatched band "4 h 47 min"; shorter quiet stretches keep true width
  with a bracket and their length (23 min, 56 min, 21 min, 22 min, 1 h 25 min).
- Ten hook rows on the same clock: pale where calls passed, a tick at each refusal or failure, a notch where the hook
  was installed (00:30), a dashed row for Journal watch. Owner report's row is red all day.
- Sources: day-strips with a brushed window, d2 idea 1, findings 1, 2, 3, 9; helpers packed, d2 finding 12; child under
  parent without lines, d2 findings 10, 16; hook rows, d2 idea 2, findings 5, 20; tick on the bar, d2 findings 17, 19;
  fold with its length, week kept whole, d2 idea 3, finding 7 (8 as the thing to avoid).
- Critique: 25 of 40; cognitive load 2 of 8 failed. Weakest: (1) a red tick on a lane is tied to its hook row only by
  vertical position, up to 500 px apart (a built page needs a crosshair on hover). (2) Lane titles cut short, helper bars
  at 3 px carry no kind, the token figures at the right are close to a column of numbers.
- Stranger test: "A week of work per day, white where nothing ran. Tuesday opened below: each session a bar over time
  with helpers under it, red and amber ticks where something broke, blue where it waited for him, a cut of 4 h 47 min.
  The rows at the bottom repeat the ticks per hook." Passes; "which part" is there but small.

## 3. Operate (03:29; UX asked at 03:28)
- The Now page with the operating layer. The waiting session on top of the rail, pushed out of line, blue, a pause
  sign, "waits for you · 1 min", the first sentence of its closing report, Answer / Open session / Stop on the strip.
- The dock at the bottom, always in the same place: "To UX | Answer…" with Send, Queue, Stop; on the Now page the same
  dock reads "Prompt a new session…" with Start. Ended sessions carry a "done" tick box and an unread dot. A "Parts open
  in: VS Code | File pane" switch at the dock's right. One hover drawn on Owner report: its real path and "File pane".
- Sources: one loud mark with the answer on it, d3 idea 1, findings 1, 2; rail ordered by need, pushed out of line,
  unread dot and done tick, d3 idea 2, findings 6, 7; dock that speaks to the selection, d3 idea 3, finding 4; what the
  app allows, c4 (File pane selected because VS Code is not installed; answering or stopping a session started inside
  the app is not possible today as documented, so these buttons show the aim, not a working route).
- Critique: 25 of 40; cognitive load 2 of 8 failed (chunking; six actions visible at once). Weakest: (1) the data holds
  the closing report, not the question; he may still have to open the session to answer. (2) Stop appears twice
  (strip and dock) with no confirm, and only one session waits in the data, so "ordered by need" is shown once.
- Stranger test: "UX waits for you; answer it, open it or stop it here; the box at the bottom is addressed to UX."
  Passes.

## Derived, and invented
- Derived, unchecked: waits for him = the last closing report has its ask flag set and he has not written since; parts
  a session is on now = parts whose pipeline step matches a visit or touch in the last 10 minutes; unseen mark = later
  than his last message to that session, within 3 hours; hook dots = sessions working now in a folder with that hook on,
  not hook-log events; pale traces in History = turns of sessions with the hook on after its install time (creep gate
  from its first mark); tags = a rule on the title; tokens = the session plus its helpers.
- Added or invented: the Creep gate tile (from the folders' hook lists, not in the parts file); helper kinds test,
  build-invariant, orchestrate, design (from the helpers; model = the most frequent in the data); the hover on Owner
  report, the Queue button, the done ticks, and which side of the "Parts open in" switch is selected. No answer choices
  or question text were invented.

## Motion rules (written, not built; d1 findings 13, 14)
- Every strip, tag, tile and mark is keyed by its id and moved, never rebuilt. Only transform and opacity animate.
- A tag slides from part to part in about 200 ms. A part pulses once when touched, then a faint afterglow fades over
  about a minute.
- A trouble mark appears in place with one short pulse and stays until he has opened that session or clicked the mark.
  Nothing blinks.
- Time bands slide left at constant speed by a transform; the path is not redrawn per tick.
- At most one or two things move at once; rail re-ordering waits until the pointer is off the rail. Reduced motion: no
  slides, state changes only.

## Not done
- Skills, slash commands and git itself are not in the data, so not on the board; "Tests and git" holds only Hook tests
  and Commit check. Short of goal 1.
- Zoom (goal 9), live updating (goal 10) and the clicks (goal 7) not shown beyond the one hover.
- Limits not exercised: the rail fits about seven working strips; a hook tile about three rows of marks; a part tile
  three or four tags, then "+n".
- No dark theme, no keyboard or screen-reader pass.
- Skills read: `ux-designer` SKILL.md in full and its references' headings only; `ui-ux-pro-max` chart and guideline
  rows; `web-design-guidelines` rules; Impeccable's rubric and distill.
- One fix round (lane overlap, hook marks overflowing their tile, hidden message dots, the "you" label); the weak points
  above are left as listed.
