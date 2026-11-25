# The final clickable session tool (round 8, Opus, 2026-11-24)

Open `index.html` from the disk (it loads `../shared/data.js`; no server, no fetch, nothing from the web). States for
looking: `?paused=1&t=03:29` (crowded, UX waits), `?paused=1&t=13:03` (after the 4 h 40 min gap), `&page=history`,
`&focus=answer`, `&stop=1`, `&jump=journal`. The review that chose these parts: `../review/index.html`.

## What it is, and which prototype each part came from (his yes, 2026-11-24)
Base: the Impeccable page (files copied, then changed here; the four prototype folders are untouched).
- **The parts as one map** (Impeccable): helper kinds, commands, tests and git, scripts, stores, skills, documents as
  stops on lines; a working session lights the stops it touches. **Changed:** each lit stop now carries the tags of its
  sessions (1 or 2, then "+n"), so no colour matching (the Vercel prototype's tags; Impeccable's own critique P1).
- **Each hook as a row on the sessions' clock** (UI UX Pro Max): let through (green), refused (diamond), failed
  (triangle), not on (dashed ring); tags of the sessions on it now; counts or "never fired" at the right. Hooks left the
  map for these rows. Click a row: its card; double-click: opens it (VS Code or file pane, by the setting). Click a mark:
  which session, Open the session, Open the hook, Seen.
- **The whole day as one strip** (UX Designer): from 00:00 to now; starts as tag flags (click opens the session); a
  quiet stretch of an hour or more, once over, folds to a hatched block with its length and "nothing ran"; "you away
  6 h 21 min" bands and his messages on a You row; a blue dashed line where he last wrote. The scale holds still within
  the hour and eases to the new one (no jump). Click the strip to go back to that minute.
- **The waiting session answered in place** (UI UX Pro Max): full report and question, an answer box, Go on / Hold on /
  Show me first, Answer; Stop asks in place ("Stop UX? Yes, stop / Keep it"), then a toast with Undo (UX Designer). The
  replay holds still while he types an answer.
- **Header** (UX Designer): "UX waits for you · Answer" on both pages (takes him to the answer box); jump search
  (press /) to any session or part.
- **Since you left** (Vercel): one line at the top of the list, started / finished / refused / failed since he last
  wrote; each one lights where it happened.
- **History**: Impeccable's page plus "peak 4 · 13 helpers" per day (Pro Max) and Previous / Next trouble (Vercel).

## How the skills were followed here
The four builders read their skills in full and recorded what each rule said (their `NOTES.md`); I read those notes,
`ux-audit` and `design-review` (`SKILL.md` in full; ux-audit's references not read). The picked parts keep the rules
their builders applied: Impeccable's refuse list (no cards, no gradients, blue only for him, shapes beside colour),
Pro Max's `color-not-only`, persistent errors, confirm destructive actions in place; UX Designer's recognition over recall
(real names, no legend), Doherty (no lag), Zeigarnik (the waiting card stays until answered); Vercel's undo for a
destructive action, Escape closes, the URL carries the state. Not done: a fresh read of each skill's references for the
final (it would have cost about 2 M tokens a skill), axe-core, a dark theme.

## Checked
- Replay: 239 frames in 4 s, none slower than 34 ms (same as the four prototypes). No console errors.
- Clicked by script at 03:29: empty Answer nudges, typed answer sent (0 wait after), new prompt starts N1, a session
  opens, both "open in" settings, double-click a part opens the file pane, History opens with peak labels.
- **Not checked by script:** Stop then Undo, the quick answers, jump search, hook-row double-click, Previous / Next
  trouble (the second test run failed in my script, not in the page). Looked at: Now at 03:29 and 13:03 (1870 px).
  Taken, not looked at: `shots/now-1440.png`, `shots/history.png`.

## Known weak spots
Hook rows are 16 px high (readable, tight); tags crowd the Stores row (one tag each there); 8 sessions at once untested
(the data has at most 4); skills, git and four helper kinds are dummy parts.

## Tokens
About 9.6 M of 11 M for review and final together (count by `tok.mjs`, 8.1 M before this note).
