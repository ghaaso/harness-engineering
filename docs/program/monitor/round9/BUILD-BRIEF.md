# Round 9 build: the owner's session tool on the approved picture

Written 2026-11-24 by the coordinating session for one builder (kind `design`, Fable, high effort).
**His words are the task. They outrank this brief and every file it points at.**

Deliverable: docs/program/monitor/round9/tool/index.html (the Now and History pages), first shown to him at the first
working screen (stage 1 below), with tool/NOTES.md.

## 1. Read, in this order (open the files; do not work from this summary)
1. `round9/FEEDBACK.md`: his words of today on the proof of concept, in full. He approved the picture and asked for
   live arrows, a smooth wider-or-narrower view down to files and their links, each level on its own view, clean.
2. `round8/clickable/final/FEEDBACK.md` (his words on round 8) and `NEXT-ROUND-8.md` sections 1 and 3 (his earlier words
   and the approved goals, ending with the stranger test).
3. The approved picture: `round9/shots/level0.png` to `level3-1303.png`, `round9/MAPPING.md`, `round9/NOTES.md`. Its
   drawing code: `round9/src/draw.js` and `build.mjs` (each `level*.html` carries the same code). Start from it.
4. What already exists to reuse, not rebuild: the round 8 final's operating parts (`round8/clickable/final/app.js`,
   `NOTES.md`: answer a waiting session in place, stop with undo, open a session, open a part in VS Code or the file
   pane by his setting, jump search); the replay data `round8/clickable/shared/data.js` and `DATA.md`; the round 7 live
   reader `monitor/app/server.mjs` with `monitor/build/snapshot.mjs` (watches the session files, re-reads at most every
   30 s, pushes to the page) and the hook logs in `.claude/logs/*.jsonl`.
5. `CLAUDE.md` rules 6 to 8; his memory notes in
   `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`:
   `feedback-glance-not-tables.md`, `feedback-plain-wording.md`, `feedback-readable-without-removing.md`,
   `feedback-no-procedural-creep.md`, `feedback-big-picture-not-figures.md`.

## 2. Stage 1: the first working screen (show it, then stop and wait)
The Now page on the approved picture, driven by the replay of Tue 24 Nov from `data.js` (real names, real times):
- **Live arrows.** When a session calls a hook, an arrow travels from the session to that hook, the hook shows the
  result (let through, refused, failed) and the arrow fades. Never crowded: compute how many may move at once from the
  busiest minute of the data, and fold the rest (for example a count on the hook). Smooth: no frame slower than about
  34 ms (round 8's measure), no jumps.
- **Wider or narrower, smoothly.** From the whole picture, to the hooks, to one session (its helpers), to that
  session's files. Each level its own view; the deeper level opens only when he goes there; the way back is one step.
  The mechanism comes from the record (`MAPPING.md`, `round8/research/d1` and `d2` findings), not from questions to him.
- Screenshots at 1870 x 1050, light, in `round9/tool/shots/`: each level, and three frames of one arrow from a session
  to a hook (leaving, arriving, the result shown). Look at each one yourself before reporting.
Report stage 1 to the coordinator in under 15 lines, then wait. Stage 1 should come in at about 8 M tokens.

## 3. Stage 2: only after his look at stage 1
- **Files and their links.** For one session: the files it reads and writes, where it writes, and how those files link
  to each other (markdown links, imports, paths named in a file), each link clickable. The links are a missing fact:
  measure them from the repository with a node script; do not guess.
- **History**: the same tree with the clock, as in level 3, with the same wider-or-narrower views.
- **Operating** from the tool: the round 8 final's parts carried over (answer, stop, open a session, open a part).
- **Live**: the same page fed by the round 7 reader (or the hook logs) instead of the replay; say what delay remains.

## 4. Rules
- Write only under `docs/program/monitor/round9/tool/` (scratch in the scratchpad). Commit nothing. No install, no
  download, no web request. Node v24 is on the path; Python is not; the shell is Git Bash.
- Screenshots: headless Edge as in `round9/src/shoot.sh` (own `--user-data-dir`, forward slashes). A page opened from
  disk in the app's browser pane must stay under 500,000 bytes.
- Plain words, the picture first, real names, no legend needed, no tables, a handful of numbers at most; readable at
  about 1870 px, light; nothing dropped to make it fit.
- One check where a fault would change what is done next; no review panels; one repair round at most (rule 8).
- His cap for the round is 25 M tokens; your share is 21 M; stop at it and report.
