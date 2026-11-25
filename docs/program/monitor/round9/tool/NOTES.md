# Round 9 tool, stage 2: Now and History, file links, operating, live (designer, 2026-11-24)

His words are in `../FEEDBACK.md`; the brief is `../STAGE2-BRIEF.md`. Stage 1 (the Now page on the replay, the arrows, the
four views) is described at the end; it is unchanged except where this note says so.

## What there is
- `index.html`: one self-contained page, 355,530 bytes (under the pane's 500,000). Opened from the disk it runs on the
  replay of Tue 24 Nov. Served by `server.mjs` it runs on his live sessions.
- `server.mjs`, `live/convert.mjs`, `live/NOTES.md`: the live feed (built by a Sonnet helper to my brief). Run
  `node server.mjs`, open `http://127.0.0.1:7419/`. It listens on this machine only.
- `data/links.json`, `data/rw.json`, `data/README.md`: the measured links and reads/writes (another helper's).
- `src/`: `draw.js` (layout), `app.js` (page), `style.css`, `build.mjs` (`node src/build.mjs` writes `index.html` and
  runs 64 layouts in node), `shoot.mjs` (`node src/shoot.mjs <empty scratch folder> [main|pane|ops|checks|live]`).
- States for looking: `?paused=1&t=03:29&level=2&open=BR1`, `&page=history`, `&sel=doc:briefs&level=3`, `&dry=1`
  (a double-click only says what it would open).

## 1. Fits any window
- The picture is never drawn under 0.95 of full size (smallest text about 12 px). When it would be, the drawing
  changes instead of shrinking, and what is left over scrolls:
  - the session tree turns into **rails**: one row per session, its line at the left as in a commit log graph, its box
    to the right of all lines (same start order downward, same who-started-whom);
  - the hooks wrap into rows by their groups; the helpers go on two rows (finished above running); the parts and the
    file folders wrap.
- The header goes to two rows and short names under 1150 px. With the picture larger than the window the wheel moves
  it; wider and narrower stay on the buttons, a click, Esc, and Ctrl with the wheel.
- Measured at 800 x 600 (the pane's size, headless Edge): every view at full size, 1.0; no sideways scroll in the 16
  narrow layouts the build runs. Not opened in the app's own pane.

## 2. History
- The same tree with the clock down the side: every session of the day (ended ones as pills), each row's start time,
  his absences ("you away 6 h 21 min"), a quiet stretch of 30 minutes or more folded into one band with its length and
  who waited ("05:45 to 10:33 nothing ran for 4 h 48 min, M6 waited for you"), "now" at the foot.
- Failures in place: a session a hook failed on earlier keeps a red outline and a hollow triangle; the Hooks view adds
  a "failed earlier" row with those sessions on each hook.
- The same four views. A click on a time in the margin or on a band plays back from there at 10 times real pace, and
  the arrows fly as on Now; the bar at the foot moves through the day.
- At the end of this day the tree is too wide for 1870 px, so History shows it as rails there (and scrolls a little:
  about 1090 px of picture on 946). At 13:03 it is still the wide tree of the proof of concept.
- No lanes, ticks, hook rows or week strips.

## 3. Files and their links (the Files view)
- Each file says **reads**, **writes** or both (a pencil on a file written, and on the folder: where it writes). Counts
  are in the tooltip. They are for the whole day, not timed.
- Click a file: lines go to the files it names (solid) and from the files that name it (dashed), the rest dims, the
  title says "Briefs: names 33 files, 6 name it". Linked files this session has not used appear in their own dashed
  panel. A click on a linked file moves on to that file; a double-click opens it.
- The limits are written under the files, as the coordinator asked: counted from tool calls over the whole day; a read
  by a shell command is not counted; a path built while a script runs is not seen; a link is one file naming another by
  its path (617 found, all of that kind; no markdown link or import between parts).
- A part that stands for many files (Briefs is 30) opens its first file.

## 4. Operating
- **Answer in place**: the blue chip in the header ("UX waits for you, Answer") or the Answer button beside the opened
  session: its report in full, a box, Go on / Hold on / Show me first, Answer (Ctrl+Enter). The replay holds while the
  box is open. **Stop** asks in place, then a notice with Undo for 8 seconds.
- **Open a part**: a double-click on a hook, a part or a file, in VS Code or the file pane by the setting at the foot
  (kept in the browser). **Jump**: press `/`, type a session, a hook or a file.
- **What is real and what is not.** On the replay, answer and stop change the picture only and say so. On the live page
  they are written to `live/outbox.jsonl` and the notice says nothing carries them into the app yet: sending a message
  to a session or stopping one from here needs a session with the app's own tools reading that file, and his word.
  "Open in the app" is not connected (no way from a page into the app was found). VS Code: from the disk by a
  `vscode://` link, live by the server starting `code -g`; neither was fired in a test (it would open a window on his
  screen). The file pane works from the disk only (a `file:///` tab); on the live page it says it is not connected.

## 5. Live
- `server.mjs` tails the hook logs and pushes each new line to the page; the page sends the arrow off at once.
  **Delay from a hook call to its arrow: the log line reaches the page in about 5 ms (measured 3 to 5 ms at the server,
  a 500 ms poll as fallback), the arrow then flies 0.9 s.** Seen running: 31 sessions, 6,586 calls of the day loaded,
  new calls arriving while the page was open.
- The session tree (who runs, waits, ended; helpers) comes from the round 7 read step, at most every 30 s, 7 to 9 s a
  read: **up to about 40 s old**. A failure shows on its session with the next read, not with the arrow.
- Limits of the live data (details in `live/NOTES.md`): 10 sessions "wait for you" because any unanswered closing
  report of the last 24 hours counts, child sessions' too; that makes the live Now page about 3,400 px tall at 1870.
  Which waits are his to answer is not decided here. Helpers' parts are not in the read step, so "Parts they touch" is
  empty live. Reads, writes and links are the measurement of Tue 24 Nov at 17:17, not live.

## Checked
- Looked at (1870 x 1050 unless said): `history-day`, `history-1303-hooks`, `level3-file-links` (before the lines were
  thinned and cut to the session's own files; not looked at again), `answer-in-place`, `live-now` (before the waiting
  labels were joined into one; retaken, not looked at again), and at 800 x 600 `pane-level0`, `pane-level2`,
  `pane-answer`. Taken, not looked at: the other 22 of this stage in `shots/`.
- By script: click a session twice, click a file, double-click it with both settings, Esc, double-click a hook,
  History, a click in the margin (plays from 10:33), back to Now (returns to 03:29), jump to a hook and to a session,
  answer (waiting count 1 to 0), stop (3 working to 2), undo (back to 3). No page error.
- Frames: Now at 10x through four changes of view 546 frames, slowest 16.8 ms; History played back at 60x 329 frames,
  slowest 16.8 ms; none over 34 ms. At 800 x 600 only 92 frames were counted in the same time (not explained), none
  over 34 ms. Headless Edge, graphics card off.
- One repair round: the tree centred in the narrow form, the link lines tidied, the waiting labels joined.

## Not done, not checked
- Not opened in the app's pane; no person put through the stranger test; no dark theme.
- Stage 1 shots not retaken: `level1-hooks-1303`, `level2-one-session-1303`, `arrow-level0-result`,
  `busiest-minute-60x`, `moving-mid`.
- More than 4 sessions at once is now seen live (19 open): readable but long; no folding of old waiting sessions.
- A live run across midnight, and a day with no session, are untested.
- Nothing committed, nothing installed, no web request. The server was stopped after the test.

## Stage 1 in short (unchanged)
Arrows: a call grows from the session to its hook in 0.9 s, the hook takes the result's colour with a label ("BR2
refused"), holds 1.7 s, fades. At most as many arrows at once as sessions called a hook within the busiest minute (4 on
the replay, 9 live today); the same call repeated joins as a count; the rest fold into "+n" on the hook. A "let
through" on the replay is a count per 5 minutes spread evenly; live each call has its own time. The data does not say
which helper made a call.

## Tokens
Stage 2: about 10 M by my estimate from the size of this session (not read from the meter), the helper's 0.25 M in it.

## Two fixes after stage 2 (designer, 2026-11-24, about 17:55)
What sections 3 and 5 above say about the link lines and about "10 sessions wait for you" is replaced by this.

**1. One file's links are no longer a mesh (`src/draw.js`, `src/app.js`).**
- At most **4 lines** at once. The number is computed from the view: a line runs only in the gaps (beside a column of
  files, under the folders it passes), on a track of its own, 5 px clear of a file and of a folder's border and 7 px from
  the next track; the 44 px gap between two columns holds 4 such tracks (`LMAX` in the code, it follows the sizes).
  The 4 are the links with the most mentions. Lines have square corners, leave the picked file at their own heights and
  are ordered so that none crosses a file or another line (solid = it names that file, dashed = that file names it).
- Every other linked file is outlined and says how it is linked where its path stood ("named by Briefs", "names Briefs ·
  named by it"); the path stays in the tooltip. Files not linked dim as before.
- Linked files the session has not used are folded into one chip with the count ("17 more linked files are not used by
  BR1 · show them"); a click unfolds them into their dashed panel, a click on "Fold the 17..." folds them again, picking
  another file folds them again. A click on any linked file still goes to it; a double-click still opens it.
- On the replay, Briefs in BR1: 33 linked files (all 6 that name it are also named by it), 4 with lines, 12 outlined,
  17 folded. The title says it: "Lines go to the 4 files linked most often. The other 12 are outlined and say how they
  are linked."
- Not drawn: a line to a file in another row of folders (narrow windows) or to an unfolded file; those are outlined only.

**2. Who waits for him (`live/asks.mjs` new, `live/convert.mjs`, `server.mjs`; monitor/app and monitor/build untouched).**
- A session waits for him only when its last turn ended by asking: its last closing report carries an `ask` or
  `blocked: true`, or a question tool call has no answer yet. A closing report with no question is finished.
- Measured from the transcripts: `live/asks.mjs` reads the last 2 MB of each session's transcript of the last 48 hours
  (32 files in 0.23 s, kept by file size between reads). Earlier reports of the day use the read step's own ask flag
  (it does not keep `blocked`), so History's "who waited" follows the same rule.
- Result: on the read of 17:41, **10 waited before, 1 after** (BR5: "Open the pilot's Fable coordinator now?"). Live at
  17:53: **2 wait** (BR5, 2 h 31 min; BR3b, 1 min, an unanswered question call about the cap). The live Now page went
  from about 3,400 px to 1,572 px tall at 1870; the other sessions show as ended or quiet.
- The waiting list now carries the session's own question; the invented "Shall I go on with ...?" is used only when a
  report is blocked without a question.
- Not seen: a question written only in the text of a report with no `ask`; an ask older than the last 2 MB of a
  transcript; a child session's ask is counted like any other (whose answer it needs is not told apart).

**Checked.** `node src/build.mjs`: all 64 layouts clean; page 361,937 bytes. Retaken and looked at:
`shots/level3-file-links.png`, `shots/level3-file-links-unfolded.png` (new, `node src/shoot.mjs <folder> links`),
`shots/live-now.png`. Retaken, not looked at: `live-hooks`, `live-history`, `live-pane`. Not retaken: the other shots
(the Files view with a file picked looks different from `history` and `pane` shots only where a file is picked).
Not checked: the 800 x 600 pane with a file picked (several rows of folders; by script only), a click on the fold chip
by hand. The server was stopped. Nothing committed, nothing installed, no web request.

**Tokens.** About 2.3 M by my estimate from the size of this session (not read from the meter), nearly all of it cached
re-reads of the window: over the 1.8 M share; I stopped here.

## Five changes after his words of the evening (designer, 2026-11-24, about 19:10)
His words are in `../FEEDBACK-2.md` (both messages). What section 4 above says about a double-click opening VS Code or the
file pane, and the "opens in" setting at the foot, is replaced by this. History itself is unchanged.

**1. A failure tag opens what failed.** A click on "Owner report failed" under a session (card or pill), on a session's tag
in a hook's "failed", "failed earlier" or "refused" row, or on the red chip in the header opens the side panel with: the
hook and its file, the session, when (and how many times so far), what it failed on, and the hook's file below with line
numbers. The words of the failure come from the tool's server (`GET /fail`): the error the app recorded from that hook in
the session's transcript, the hook's own log for a refusal, the window numbers for a window past its line. Seen on the
replay for UX: "Your last message goes to the owner and shows file paths (...). Rewrite it once in plain words ...".

**2. Files, hooks and parts open in one side panel.** A click on a hook or a part, a double-click on a file: it opens at
the side, markdown as text with its headings, anything else as code with line numbers. A new click switches the panel
(with the panel open, one click on a file is enough). **Keep** holds a pane and the next click opens beside it, stacked; as
many as fit at about 230 px each (4 at 1870 x 1050). VS Code and File pane are buttons in the pane; Esc closes the pane
that is not kept. The page cannot read files, so the server does (`GET /file`): read-only, at most 300 KB, only inside
the repository by its real path, never `.git` or env files, and only for the page itself. Checked: a path with `..`, a
`C:/Windows` path, `.git/config` and a request from another site are all refused. Opened from the disk the panel says so
and gives the two lines to start the server (`http://127.0.0.1:7419/?replay` is the same replay with files readable).
Beside the panel the picture has 1,233 px at 1870: the tree turns to rails and the hooks wrap, as in any narrow window.

**3. The wheel goes where the cursor is; a remembered session is never used.** In the picture's own units (1 unit is 1 px
at 1870, up to 1.3 px when a small picture is enlarged): on a session, or within **26** of it (the gap the layout leaves
between two cards), that session. Further than that from every session: All sessions goes to Hooks, Hooks stays and says
how to point. Seen: 16 px beside BR2 opens BR2; back at All sessions, a turn at the far right edge goes to Hooks, not BR2.
The `+` key and the Narrower button follow the same rule.

**4. Between two sessions: both.** The cursor outside both, the two nearest sessions on opposite sides of it (more than
120 degrees apart) and neither further than **52** (two gaps): the view opens both. No two zones overlap: one rule gives
one answer for every point.

**5. A dragged box.** Press and drag anywhere, on empty space too (nothing pans by dragging: a large picture moves by the
wheel and the scroll bars). The box names what it covers while it is dragged ("4 sessions: BR1, HAP, UX, BR2") and
outlines them; on release two or more open together, one opens alone, none says so. A box with hooks and no session
takes the sessions marked on those hooks now.

**The several-sessions view (4 and 5) is the one-session view grown** (`cfg.group` in `src/draw.js`, no second picture):
the chosen sessions as cards in the same tree with the sessions above them, so the lines say who started whom; the hooks
once, with the sessions' tags in their rows (two sessions get every line to a hook, three or more only refusals and
failures); one line that says how they relate ("HAP and UX: both started by RPM · both called Window ceiling, Owner
report · no part in common"); each session's helpers in its own row; the parts their helpers touch drawn once with the
sessions' tags, shared ones first and outlined. A click on one of the cards narrows to that session. "Its files" is off
in this view.

**Checked.** `node src/build.mjs`: 88 layouts clean, 24 of them several-sessions (wide, beside the panel, narrow, Now and
History); page 392,030 bytes. `node src/shoot.mjs <folder> side` on the served replay, real mouse events: every step above
gave the state written there. Frames with the panel open, the replay at 10x through all views: 656 frames, slowest
16.8 ms, none over 34. Looked at (1870 x 1050): `panel-file`, `panel-failure`, `panel-two-kept`, `wheel-0-where`,
`wheel-1-near-one`, `wheel-2-between-two`, `wheel-3-far`, `box-1-dragging`, `box-2-view`, `box-3-view-with-panel`.
Two faults found and repaired in the one round: a name clash that stopped the page at load, and a frame that fails now
shows its error and the next frame still runs (before, one fault stopped the page for good).
The first `panel-from-disk` showed a half-moved picture; run alone (`... disk`) the numbers are right 1.3 s after the click
(stage 1,233 px, no sideways scroll, hooks in 2 rows): headless Edge makes no frame after a change of window size until a
screenshot asks for one, which also explains the "92 frames at 800 x 600" above.

**Not done, not checked.**
- Not looked at: `panel-hook`, `pane-panel` (800 x 600, taken right after a size change), `panel-from-disk` and
  `panel-failure-from-disk` as retaken (checked by numbers and by the panel's text only).
- No shot of several sessions in History: the test box covered the rail dots, which do not count as the session, so it
  chose none; only the layouts ran. Whether a dot should count is open.
- With one session open, a wheel turn away from every session still goes to that session's files (it is the whole picture).
  The step button "One session" still opens the last or the first session; only the wheel, `+` and Narrower were changed.
- The live page was not run this round: the panel and the failure words were exercised on the served replay only.
- A box over hooks only, and a box over very many sessions (no upper limit), were not exercised.
- Beside the panel the hooks wrap to two rows and an arrow's result label can sit over the row above (`box-3-view-with-panel`).
- The older shots were not retaken; they show the old foot ("opens in"). The `checks` group of `shoot.mjs` was edited to
  follow the panel but not run. Not opened in the app's pane; no person put through it.
- Nothing committed, nothing installed, no web request. The server was stopped (nothing listens on 7419).

**Tokens.** Not read from the meter. The coordinator counted about 6.5 M for all five changes at the crash of 18:22; from
the resume about 3 M more by my estimate from the size of this session (ten calls at about 0.3 M of cached window each):
at the 3 M stop, so I end here.

## Three fixes after his "Yes, fix them" (designer, 2026-11-24, late evening)
The three open points of the section above (the wheel with one session open, the step button, the labels beside the panel).

**1. The wheel with one session open follows the same rule (`src/app.js`, `zoomIn`).** On the open session or within 26 of
it: its files. On or near another session on the picture: that session. Between two: both. Away from every session: it
stays, and says "Point at BR1 to go on to its files, or at another session to open that one." The `+` key follows the
cursor in the same way. The Narrower button is at no place on the picture, so with one session on show it still goes one
step on, to the files of that session, as the step beside it says ("Files of BR1").

**2. The steps "One session" and "Its files" never pick a session.** With no session on show a click asks: "Click a
session on the picture to open it", and every session is outlined in blue for 1.8 s; the same words are the button's
tooltip. Asking was chosen over a greyed-out button because a grey button does not say how to turn it on. Leaving for
All sessions or Hooks now forgets the session that was open (`open` is emptied; `pickDefault` is gone), so nothing can
reopen it: not the steps, not the wheel, not a page opened with `level=2` and no session named (that opens Hooks).

**3. Result labels never sit on a label, a hook or a session (`src/app.js` `drawArrows`, `src/draw.js`).** A label takes a
place only when it is clear of every session, every hook, the "Hooks" heading, the captions under the hooks and the labels
already placed: beside the arrow's landing point just above its hook, on the side the arrow came from, else the other
side, else one row higher. Older labels are placed first and a label keeps its place while that stays clear. With no
clear place it goes into the count on the hook. Labels sit 4 higher than before (clear of the count). When the hooks
wrap, the rows are 24 further apart (32 in All sessions), so a label fits between a row's caption and the next row; with
the hooks in one row nothing moved.

**Checked.** `node src/build.mjs`: 88 layouts clean; page 395,539 bytes. `node src/shoot.mjs <folder> fix` (new group, the
served replay, real mouse and key events): 36 checks, all as wanted. The wheel far away, on a hook and low on the page
with BR1 open: stays at BR1; 16 from BR1 and `+` on BR1: its files; back at All sessions the wheel far away goes to Hooks
with no session kept. The steps: asked at All sessions and at Hooks after BR1 and UX had been open; with UX on show they
go to UX's files and back. Labels: the replay stopped at each of the 90 minutes an arrow lands, at 60x (most labels on
show, up to 7 at once), in All sessions, Hooks, one session, four sessions and History, panel closed and open (hooks in 1,
2 and 3 rows): about 1,980 label sightings, each tested against every session, hook and other label as drawn: 0 overlaps.
Frames at 60x with labels on show: slowest 16.8 ms, none over 34.
Looked at: `step-1-asks-to-pick`, `wheel-5-one-open-far`, `labels-hooks-panel-open`, `labels-four-sessions-panel-closed`,
and `box-3-view-with-panel` as first retaken (the two labels now in the gap between the rows).

**Not checked.**
- Taken, not looked at: `wheel-4-one-open-where`, `wheel-6-one-open-near`, `step-2-one-session-chosen`, `labels-hooks-panel-closed`,
  `labels-all-sessions-panel-closed`, `labels-all-sessions-panel-open`, and the last retake of `box-3-view-with-panel` (it is
  now taken scrolled down to the hooks).
- How often a label finds no clear place and goes into the count was not counted.
- A label may still lie over an arrow's line or the "waits for your answer" line; only labels, hooks, sessions, the heading
  and the captions are kept clear. The test reads sessions and hooks from the page; captions are kept clear by the rule only.
- The 800 x 600 pane, the live page, and the other groups of `shoot.mjs` were not run; the older shots were not retaken.
- Nothing committed, nothing installed, no web request. The server was stopped (nothing listens on 7419).

**Tokens.** Not read from the meter. About 2 M by my estimate from the size of this session (some 40 calls on a window of
40 to 110 thousand), nearly all cached re-reads: at my 2 M share, so I end here.
