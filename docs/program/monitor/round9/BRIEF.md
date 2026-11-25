# Round 9 of the owner's session tool: a proof of concept, static pictures only

Written 2026-11-24 by the coordinating session for one designer (kind `design`, Fable, high effort). **His words
below are the task. They outrank this brief and every file it points at.**

Deliverable: docs/program/monitor/round9/index.html (screenshots of levels 0 to 3), with MAPPING.md and NOTES.md.

## 1. His words on round 8's final (2026-11-24), in full and unedited (also in `round8/clickable/final/FEEDBACK.md`)

He looked at the History page of `round8/clickable/final/index.html` (Tue 24 Nov, 00:00 to 14:45: the week strips, the
day's session lanes, the hook rows below) and wrote:

> You see this page, it's absolutely unintelligible. I'm starting to see that, okay, you fixed a few things. Some things are better, but you're failing to understand the user, the human understandability and readability of this. Your concept of what is understandable at a glance and the full picture is very fuzzy and blurry. It's not. It's very. It's not good at all. It's like absolutely horrible. But that's I'm looking at these representations of yours are not helpful at all. One idea that I would give you is like the abstract representations in multiple domains of computer science that we make to understand difficult, complex concepts. Let's suppose in parallel computing or distributed systems, especially, and database engineering, AI, neural networks, AI, agentic AI, all of these domains, you could repurpose those representations and translate them into this use case of ours, so that a form of familiarity comes and it's easier to get on board with the representation that you've made, because this how it is right now is absolutely too difficult to understand. It's absolutely horrible to deal with, and this is ridiculous. And we could make another optimization by like keeping a simple overview, and then the user having the option to expand that by his choice, like, okay, now show me the hooks, now show me the harness, now show me the sessions, this session, now also add the history into it, etc, etc, like some sort of that way, so that at the start, from the surface level, it's easier to understand, and over time the user can pick up the load and put more stuff in. But in the end, that is also only possible if the abstract representations and the visualizations actually even remotely make sense for the user, which for now, as I identified at the start of this prompt and I pointed out, is absolutely very bad. It's not intelligible at all.

His cap for this round: **12 M tokens** in all (he chose it over 8 M: "room for the overview plus two or three layers").
Your share: **9 M**; stop at it and report what is done.

## 2. Read, in this order (open the files; do not work from this summary)

1. `docs/program/monitor/NEXT-ROUND-8.md` sections 1 and 3: his earlier words (i) to (l) and the goals he approved.
   Section 3 ends with **the stranger test**: someone who has never seen it looks for ten seconds, with no legend, and
   can say what is running now, which parts are at work, what happened since he left, what broke and where.
2. What round 8 built and why it failed: `round8/clickable/review/index.html` (four prototypes, open their PNGs in
   `review/shots/`), `round8/clickable/final/NOTES.md`, and the page he rejected: `round8/clickable/final/shots/history.png`
   and `now-0329.png`. Look at these images before drawing anything.
3. The record of real tools that solve neighbouring problems: `round8/research/d1/findings.md` (maps of parts),
   `d2/findings.md` (time), `d3/findings.md` (agent and session tools), `c4/findings.md`, `monitor/UX-RESEARCH.md`.
   The PNGs beside them are real screenshots of those tools.
4. The data: `round8/clickable/shared/DATA.md`, then `shared/data.js` (real names, real times, Tue 24 Nov; what is
   invented is marked `dummy: true`). Draw only from this data.
5. `CLAUDE.md` rules 6 to 8 and these memory notes of his (in `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`):
   `feedback-glance-not-tables.md`, `feedback-plain-wording.md`, `feedback-readable-without-removing.md`,
   `feedback-proof-of-concept-before-build.md`, `feedback-diagrams-pipelines-not-flat-boxes.md`,
   `feedback-tree-is-nodes-and-lines.md`, `feedback-big-picture-not-figures.md`.

## 3. What to deliver (all under `docs/program/monitor/round9/`, nothing else written, nothing committed)

**A. `MAPPING.md`, one page at most.** For each domain he named (distributed systems, parallel computing, databases,
neural networks, agentic AI): the standard picture people already know (for example a tracing waterfall, a service map,
a task DAG, a process-state diagram, a wait-for or lock graph, a layer diagram, an agent graph, a query plan, a network
diagram), what it would show of his sessions, helpers, hooks and parts, **which assumption of that picture fails for
LLM sessions**, and how it scores on the stranger test. Then the one base picture you choose and why, in a few lines.
The layers must be the same picture with more added, so one base representation carries them all. Choose from the
record and the test; do not ask him design questions (rule 7).

**B. One proof of concept: a sequence of static pictures, each the previous one plus one layer**, drawn from
`shared/data.js` at one real moment (Tue 24 Nov; 03:29 is the crowded one with UX waiting, 13:03 follows the 4 h 40 min
gap; pick the moment that shows the most, and say which):
- **0. The simple overview:** what is running, what waits for him, what broke; nothing more.
- **1. + the hooks** (the real hooks by name, where each acted, let through, refused, failed, not on).
- **2. + one session opened** (its helpers, their kinds and models, the parts they touched).
- **3. + the history** of the day (when work ran and stopped, gaps, where it broke). History was the worst page; it
  must read at a glance in the same familiar picture, not as lanes, ticks, hook rows or week strips.

Build 0 and 1 first, take the screenshots, look at them yourself, then do 2 and 3 if the budget allows. Each is one
self-contained HTML file (`level0.html` ...) that reads `../round8/clickable/shared/data.js` and draws one fixed state;
no buttons, no replay, no animation. Plus `index.html` showing the four screenshots in order with one plain line each.

**C. Real screenshots** at 1870 px wide, light theme, in `round9/shots/`. Recipe: headless Edge, as in
`round8/clickable/ux-designer/shots/shoot.sh` (own `--user-data-dir` in the scratchpad, forward slashes). Open each PNG
with the Read tool and look at it before you call it done; fix what a stranger could not read.

## 4. Rules for the picture
- The picture first; plain words; no legend needed; real names (session tags and titles, hook names) on the picture.
- A glance, not tables; a handful of numbers at most; no text that explains; no cards on empty grey.
- Readable at about 1870 px, light; nothing dropped to make it fit.
- No dense timelines: no lanes of ticks, no hook rows, no week strips (what he rejected).
- Lines show who started whom and what touches what; no mesh of lines (the busiest hour has 4 sessions and 13 helpers).
- No install, no download, no web request (the record above is enough; rule 4 forbids project names in searches).
- The UI/UX skills he attached (`ux-designer`, `ui-ux-pro-max`, `web-design-guidelines`) are there; use one only where it
  changes the picture.
- One check where a fault would change what is done next; no review panels, no repair rounds beyond one (rule 8).

## 5. Report (under 15 lines)
The base picture chosen and the one-line reason; the files and screenshot paths; what is not done or not checked;
tokens used. Leave the same as `round9/NOTES.md`.
