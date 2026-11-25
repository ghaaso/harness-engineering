# Round 9 build, stage 2: the second half of the session tool

Written 2026-11-24 by the coordinating session for one fresh builder (kind `design`, Fable, high effort).
**His words are the task. They outrank this brief and every file it points at.**

Deliverable: docs/program/monitor/round9/tool/index.html with Now and History, file links, operating and the live feed,
with tool/NOTES.md updated and screenshots in tool/shots/.

## 1. Where it stands
- He approved the picture (`round9/FEEDBACK.md`, his words in full: live arrows, wider or narrower down to files and
  their links, each level on its own view, clean, so he need not open the app).
- Stage 1 is built: `round9/tool/index.html`, from `tool/src/` (`node src/build.mjs`; shots by `node src/shoot.mjs
  <scratch folder>`); what it does and its limits: `tool/NOTES.md`; its shots: `tool/shots/`. He saw the four views and
  the three arrow frames and answered "Yes, go on" (approve:, 2026-11-24, about 17:15) to: how the files link to each
  other (clickable), the History page, answering and stopping sessions from the tool, and feeding it from his live
  sessions.
- Read also: `BUILD-BRIEF.md` (the round's brief, section 3 is this stage), `round8/clickable/final/FEEDBACK.md`,
  `NEXT-ROUND-8.md` sections 1 and 3 (goals, stranger test), `CLAUDE.md` rules 6 to 8.

## 2. What to build, in this order
1. **Fits any window.** Opened in the app's browser pane at its own width (about 800 px) the picture draws tiny and
   cannot be read. Goal 13 asks for the app and any browser window. Make it readable there without dropping anything
   (the narrower views exist for this).
2. **History page**: the same tree with the clock down the side, as in the proof of concept's level 3
   (`round9/shots/level3.png`, `level3-1303.png`), quiet stretches folded with their length, failures in place, the same
   wider-or-narrower views, and the arrows replayed when he plays a stretch back. No lanes, ticks, hook rows or week
   strips (what he rejected).
3. **Files and their links**: in the files view, which files a session reads and which it writes, and the links between
   files (markdown links, imports, paths named in a file), each link clickable (to that file on the picture, and a
   double-click opens the file in VS Code or the file pane by his setting). The data is being measured now by a separate
   helper into `tool/data/links.json` and `tool/data/rw.json` (its notes: `tool/data/README.md`). If they are not there
   yet, do 4 and 5 first.
4. **Operating**: carry over from the round 8 final (`round8/clickable/final/app.js`, `NOTES.md`): answer a waiting
   session in place, stop with undo, open a session, open a part (VS Code or file pane by his setting), jump search.
5. **Live**: feed the same page from his sessions instead of the replay. The round 7 reader exists:
   `monitor/app/server.mjs` and `monitor/build/snapshot.mjs` (watches the session files, re-reads at most every 30 s,
   pushes to the page) and the hook logs in `.claude/logs/*.jsonl`. Do not edit those; write what you need under
   `tool/` (for example `tool/server.mjs` that reuses them). Say what delay remains between a hook call and its arrow.
   Run any server in the background; a foreground command over about 180 s stalls a helper.

## 3. Rules
- Write only under `docs/program/monitor/round9/tool/` (scratch in the scratchpad). Commit nothing. No install, no
  download, no web request. Node v24 is on the path; Python is not; the shell is Git Bash.
- Keep `index.html` under 500,000 bytes (the browser pane refuses larger local files).
- Plain words, the picture first, real names, no legend needed, no tables, a handful of numbers at most; readable at
  about 1870 px light and in the pane; nothing dropped to make it fit. Smooth: no frame over about 34 ms.
- Look at your own screenshots (1870 x 1050 and 800 x 600) before reporting. One check where a fault would change what
  is done next; no review panels; one repair round at most (rule 8).
- His cap for the round is 25 M; about 10.5 M is spent. Your share: 10 M; stop at it and report in under 15 lines
  (what works, shots, what is not done or not checked, tokens), also in `tool/NOTES.md`.
