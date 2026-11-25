# Session monitor, round 7: build the approved picture as a tool that opens inside Claude Code (brief for a fresh session)

Written 2026-11-24 by the round 5 session, on the owner's "Yes, start it". **Read these before anything else, in this
order:**

1. `NEXT-ROUND-6.md`, all of it. Its section 2 is the owner's own words, unedited, from five messages. Sections 1, 3
   and 4 say what the monitor is for and why five rounds failed.
2. Section 1 below: his words since then, unedited.
3. `round6/README.md` and the proof-of-concept picture in `round6/poc/`: the design he approved. Look at the picture.
4. `round5/v5-3h.png`: what he rejected ("congested mesh of waves"). Do not drift back toward it.

**His words are the task. They outrank this brief and every summary.** Earlier sessions failed him by working from a
shortened version; he has ruled that a brief carries his words in full (memory note "A brief carries his words in full").

## 1. His words since the round 6 brief, unedited

**(f) On the proof of concept** (as the round 6 session recorded it in `round6/README.md`; I did not see the message):

> Yes, approve it

**(g) Before the build was started:**

> Before starting, I want it to be a kind of a openable window inside Claude Code instead of a separate HTML file or something in Chrome. Like it, I'm not sure how the Claude Code stuff works, whether it will be a plugin or whatever. So like, think into this and let me know. Like I want it to be like a tool for a repo in Claude Code, etc., etc.

**(h) His word to start**, answering "Start the build at a 4 M cap, with a tiny in-app proof as its first step?":

> Yes, start it

And his ruling of the same day, quoted in full in `NEXT-ROUND-6.md` section 2 (e): a proof of concept is shown and
approved before anything is built, because building every idea in full wastes the weekly tokens.

## 2. What is built

The picture he approved, as a live tool of this repository that opens inside the Claude Code desktop app: he opens it
in the app, it shows where the work went, where it is now and where it broke for the stretch he picks, and it follows
the session files as they change. The value and the point are in `NEXT-ROUND-6.md` section 1. It is still a UI/UX
problem first: what he judges is the screen.

## 3. How it opens inside the app (what the product's documentation says, and what it does not)

Source: the official documentation under `code.claude.com/docs/en/` (desktop, plugin components, mods overview,
artifacts, mcp), read by a Sonnet helper on 2026-11-24. The last part of the desktop page and part of the mcp page
were not read. Treat every line as a lead that the first step confirms on this PC.

- **The route: the app's Browser pane and the repository's launch file.** `.claude/launch.json` at the root of the
  session's folder names a local server; the app shows it in its Browser pane. Documented fields per configuration:
  `name`, `runtimeExecutable`, `runtimeArgs`, `port` (default 3000), `cwd`, `env`, `autoPort`, `program` (a script run
  with node), `args`, `url`; top level `version`, `configurations`, `autoVerify`. A localhost `url` is the origin only
  and its port matches `port`. The user opens the pane with the Browser button or Ctrl+Shift+B and starts or stops
  servers from the "Dev servers" menu in the pane's header. Panes can be dragged, resized and popped into their own
  window to use across screens (the documentation names the diff and the terminal).
- **Not documented, so tested first:** whether the Dev servers menu lists our entry before Claude has started it once;
  whether the Browser pane itself pops out to a second screen; whether a server starts again by itself in a new
  session; whether the pane carries server-sent events or web sockets (if not, the page polls).
- **A plugin that draws its own pane ("mod"):** a pane beside the transcript with tabs, buttons, text fields and SVG,
  scoped to a project, in the Code tab from version 2.1.286. Nothing read says it can hold a web page or a zoomable
  canvas. Not part of this build. If the Browser pane route fails, say so and show a tiny proof of this one first.
- **A published artifact:** hosted, static, cannot reach a program on the PC. Not used.
- The same local address opens in any browser window, which covers the second screen whatever the pane can do.

## 4. The steps; each is shown to him before the next

**Step 1: a tiny in-app proof.** A minimal local program (Node built-ins only, nothing installed) that serves one
almost empty page saying it is the monitor, with something that visibly changes by itself (so "live" is seen). The
launch file entry. One command for this repository that opens it (`/monitor`). Open it in the Browser pane on this PC
and settle the four untested points above. Show him that it opens inside the app and tell him exactly what to click.
**Stop and wait for his yes.** This is the proof of concept for the in-app route.

**Step 2: the approved picture as the page.** Start from `round6/poc/poc.mjs` and the design in `round6/README.md`.
Take up the limits it lists (the quiet stretch, commits that landed on Land, who started whom). His words (a) ask for
something flexible, a canvas where you see all the nodes and zoom in and out, not a fixed window. Show him the first
working screen early: the crowded hours of Tuesday 24 November, about 01:00 to 04:00 local, and a quiet stretch.
Before showing it, do the stranger test from `NEXT-ROUND-6.md` section 5: legend covered, two lines on what the
picture says; if it is not "where the work went, where it is now, where it broke", say so plainly instead of
presenting a flaw as a side note. Go on from what he says.

**Step 3: live.** The program follows the session files and the page updates by itself.

Nothing he has not asked for: no extra panels, no features from `NEXT-ROUND.md`, no spec, no review rounds.

## 5. What exists

- `round6/`: the findings page, the approved proof of concept and its script.
- `build/snapshot.mjs`: the read step (it changed after round 5; read its current state) and `build/data.json`: the
  last data read. The event log and its fields are described in `NEXT-ROUND-6.md` section 6. The places are inference
  and unchecked; his ruling: the picture first.
- `build/template.html` and `session-monitor.html`: round 5's rejected page. Keep the template aside under a new name
  for the record before replacing it; reuse nothing of its drawing.
- `README.md`: the history and the rebuild command. Add a short section for this round at the end.
- Screenshots of a local page: the headless Edge command in `NEXT-ROUND-6.md` section 6.

## 6. Rules for the round

- **Tokens:** 4 M, agreed by him on 2026-11-24. Read the plan's usage before any helper. Step 1 is a small share of
  it. Stop at the cap and say so; never go past it silently. Keep the window small; if it grows, hand over through
  files.
- **Where:** `docs/program/monitor/` (the program lives here), plus two small files in the repository's `.claude/`
  folder: the launch file and the `/monitor` command. He was told exactly that. Do not touch `.claude/hooks/` or the
  settings files. Note: this repository's settings switch off the archived skills under `.claude/skills/` (library
  record r57-0036), so a new skill there may not load; find the form of command that works without changing those
  settings, and if none does, say so instead of changing them.
- **No install, no download** (CLAUDE.md rule 3). Commit nothing.
- **Who does what:** the design and the screen are the session's own work, with its eyes on real screenshots. No
  review helpers, no refuters, no repair rounds (the creep gate enforces this).
- **Privacy** (CLAUDE.md rule 4): no project name, path, session title or code in any outside request. The program
  listens on the local machine only.
- **To him:** the picture first, plain words, the answer first, short, a handful of numbers, no file paths in the
  closing message. Only "approve:", "cap:" and "fact:" questions; no design questions.

## 7. Done when

He opens the monitor inside the Claude Code app on his PC, it shows the approved picture, live, for the stretch he
picks, and he has looked at it and said yes or no.
