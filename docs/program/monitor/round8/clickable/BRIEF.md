# Clickable prototypes, one per skill: the common brief

Round 8 of the owner's session tool, 2026-11-24. Cap for this step: 35 M tokens, agreed by him (expected about 25 M).

## His words (2026-11-24, unedited). They are the task and outrank this brief.

After seeing the three static prototypes:

> It shouldn't be that hard to just give me a prototype type thing. Just gives me an idea and a sort of experience with
> the UI UX. It doesn't really have to be working in the sense that it can have dummy data operating on it. The whole
> point is for the UI UX being really good. So like I think you're just wasting tokens with this.

> Also, I need to know whether the skills that I told you to use were they properly utilized or not. The impeccable, the
> UI UX Pro Max, and the other ones, even the Versal one, were they utilized properly and were they followed in that
> regard? Because if they weren't, then we should have done that since I instructed you to do that. Take a check.

(The check found they were skimmed, not followed: `NEXT-ROUND-8.md` section 7.)

> If I hadn't pointed this out, we would have made that predictable prototype and had realized, okay, this is not good
> either, and then we'd have to go through it all over again. There's no need for a backend server, there's no need for
> APIs and all of that wastage of tokens and implementation and the time it would take to build those. So we just need a
> clickable prototype of front end to be able to finalize the UI UX, because that is the main problem to fix here.
> That's the thing we're working on. But I would recommend is send out helpers that, let's say, Sonnet 5.5 helper
> sessions that use possibly some sub agents, and with each armed with one of the 4 skills, and when they all return
> with what they've built, we can use Opus 5.5 extra to review them, aggregate them, see which ones are good. We can have
> an interactive conversation between me and that agent, see which skill produced what kind of the thing good. Then we
> can pick out the good stuff from each one, and then have Opus 5.5 like on extra or on high, use those skills and
> aggregate our results into one final good one. This workflow should possibly be a good direction on how we could
> achieve a good UI UX.

The goals he approved, and his earlier words, are in `docs/program/monitor/NEXT-ROUND-8.md` sections 1 and 3: read
both in full. They also outrank this brief. In short: his own front end to Claude Code; the real working parts by name
(each hook, skill, command, helper kind, script, test, git), not abstract steps; Now (constantly updating) and History
(the past) as two pages; time unbroken, gaps and starts plain at once; what broke as a picture, in place; click a
session to go to it, double-click a part to open it (a setting: VS Code or the app's file pane); give prompts, answer,
stop, from the tool; one picture on a canvas; smooth, no lag; the whole screen, good balance, light, readable at about
1870 px; no tables, no explaining text. Judged by a stranger who, in ten seconds with no legend, can say what runs now,
which parts are at work, what happened since he left, what broke where; and reaches any session or part in one click.

## What you make

**One clickable front-end prototype**, in your own folder only (`docs/program/monitor/round8/clickable/<your skill>/`):
plain HTML, CSS and JavaScript that opens from the disk (`file://`) in any browser and in the app's Browser pane.

- **Dummy data, front end only.** Load `../shared/data.js` with a `<script>` tag (it sets `window.TOOL_DATA`; its fields
  are in `../shared/DATA.md`). It holds the real names of the parts and sessions and a replay of Tuesday 24 November, so
  the page can move as if live. Add more dummy data in your folder if you need it.
- **No server, no fetch, no API, no build step, no npm or npx, no framework download, no installs.** Nothing from the
  web: fonts and icons inline or the system's.
- **Both pages:** Now (the replay runs, so it updates by itself, smoothly) and History (the week and a day). The
  operating parts are there and respond: a session that waits for him with its answer on it, Answer and Stop, one prompt
  box, click a session (a dummy "opens the session"), double-click a part (a dummy open, by a VS Code / file pane
  setting). Every click does something visible; nothing needs to be real.
- **Starting point, not a template:** the three static pictures of the first try and their weak points:
  `../../prototypes/now.png`, `history.png`, `operate.png`, `NOTES.md`. The research behind them:
  `../../research.html` and `../../research/*/findings.md` (the ranked ideas at the end of each). Your skill may lead
  you somewhere else; that is the point of the comparison.

## Your skill: read it in full and follow it

You are armed with **one** skill from `~/.claude/skills/` (named in your start message). Read its `SKILL.md` in full
and every file it points to that applies to making this page, in full, not headings. Follow it the way it says it is
used. Do not use the other three skills: the owner will compare what each skill produced. Never run a script from the
skill's folder, never `npx`, never log in, never fetch from the web; where the skill says to run something, do by hand
what it would do (read its data files, apply its rules).

## How you work

- Look at your own page: screenshot it with headless Edge at his width, light (and once at 1440 px):
  `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1870,1050 --virtual-time-budget=6000 --screenshot="<Windows path>\shot.png" "file:///C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/clickable/<your skill>/index.html"`
  A page state after a click can be shot by a query string your page reads (for example `index.html?page=history`).
  Judge the screenshot, not your intention.
- Few big steps (CLAUDE.md rule 8): build, look, one fix round where something breaks, stop. No reviewers, no spec.
- Helpers only if a part is large and independent; each costs tokens. Kind and model by the tier routes.
- Questions to the owner only as "approve:", "cap:" or "fact:"; no design questions (rule 7).
- Write only in your folder. Commit nothing. Change nothing outside it, `shared/` included.

## Tokens

Your limit is in your start message. Count your spend between steps with
`node /c/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/b2aba103-a82a-43ad-95f5-a9238a61936f/scratchpad/tok.mjs <your transcript>`
(your transcript: the `.jsonl` in `~/.claude/projects/C--Users-User-Documents-projects-harness-engineering/` whose
first lines hold the words "Builder skill: <your skill>"; `grep -l` finds it). At nine tenths of your limit, stop and
write your notes. The coordinator watches too and stops a session at its limit.

## Done when

`index.html` opens and every control responds; `NOTES.md` in your folder says, short and plain: what you built; for
each rule or chapter of your skill that shaped the page, what it said and where it shows on the page (this is how he
sees the skill was followed); what you could not do; the screenshots you took; your token spend. Then a three-line
report as your last message.
