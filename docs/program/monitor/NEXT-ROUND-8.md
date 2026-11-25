# Session monitor, round 8: goals first, then research, then prototypes

Started 2026-11-24 by a fresh session. **His words below are the task.** They outrank every summary, this file's own
text included. Earlier words: `NEXT-ROUND-6.md` section 2, (a) to (e); `NEXT-ROUND-7-BUILD.md` section 1, (f) to (h).

## 1. His words on the round 7 monitor (2026-11-24, about 12:20 local), unedited

**(i)**

> Even now, this is still not. I'm not satisfied. The UI. You have four separate cards. Basically, you've basically copied the structure and visual from the harness architecture diagram, or I would say we made and just made a visual representation of that, I suppose. What would have been this still doesn't give a very good picture. Like, I'm seeing that the work part has written hook failed to context when what hooker is being talked about, what is failed, and the solution to that is not writing it down as pros and under it or stuff like that. A visual representation is better, would be better, and the visual updating of this panel itself is laggy. It's not smooth. It's not constantly updating properly. It has a lot of issues. I think you need I think you haven't really looked into how to thoroughly improve the UI UX from our goals perspective. I hope the goals are clear for you. Do confirm that if they're not, and research and figure out ideas accordingly, etc., etc. Because even this, as it is right now, is not as helpful. Like 11:33 to 12:18, nothing ran between that segment, and when 12:18 came, something started running, something happened, big run 3, monitor build, etc., and stuff like that. And a lot of this page, you have 4 cards, and the rest is just empty gray space. So the visual balance and the coloring and the structure of the all of it is pretty is not good at all either. So I don't like that either. So like I really let's how about if we started a new session, we gave it the information, we told it to first of all clear out the goals we're working on, and then use probably Sonnet researchers to look into actual proper UI breakthrough ideas. Then we start experimenting and make prototypes before building the whole damn thing. So like something like that. Because even right now, this isn't a very good, helpful, usable tool, and it's very limited to the harness architecture that we've made. Plan, admit, work, check, land. It doesn't. It fills information and gives representations within the constraints of this stuff and this architecture, instead of being a current state of what's going on type of representation. Understood? So that's the problem. Do you understand what I'm talking about here?

**(j) On the first draft of the goals** (2026-11-24, sent instead of answering the goals and cap questions), unedited:

> No, that's the thing. Not just this, the hooks, the skills, not just an abstract column. Oh, this is harness, this is that, plan this, whatever. That is too abstract. That doesn't showcase the actual working components that are playing a role in the whole process, etc.

**(k) Right after (j)**, unedited:

> Also, this tool should work as a human facing uh, interface for the Claude Code or whatever, so that instead of working around in the harness, looking up chats and session, etc., etc., all that messed up stuff, we can like just give the prompts, get out of there, and operate everything on the tool itself. And I could even, let's suppose if there is a session node made there, I click it and it would take me to that session. That would make my going to some places very easier. Like for example, a hook is there, I can just double click on that hook and just go there instead of finding it or asking the LLM to fetch it for me, find it for me, and all that. Like, so we're trying to make it. Are you understanding what I'm getting here? Ask more questions if you need.

**(l) His answers to the third draft** (2026-11-24), unedited. On the goals:

> Yes, and we can have separate pages on it for like viewing the past history and viewing the current state of what's going on at the moment right now, which is constantly updating. And the visual representation, the UI, UX, the user interface, and the user experience have to be very good. So I hope you understand where I'm getting at now. That if still things are not clear, let me know. But you have to research on making this very good. And I've heard that Fable is very good at this sort of stuff. So uh, yeah, use Fable High. And moreover, I'll actually attach some good UI UX skills so to help it with this.

On the cap: "25 M". On where a double-clicked hook or file opens:

> should be an option the user can freely select to open it either in vs code or the apps file pane, like user settings type stuff

## 2. The round as he set it

1. Clear out the goals first, and confirm them with him.
2. Sonnet researchers look into real UI breakthrough ideas.
3. Experiment with prototypes before building anything; nothing is built in full until he approves one.

## 3. The goals, approved 2026-11-24 with his additions (l); drafts 1 and 2 took the harness as abstract steps and left out operating from the tool

What went wrong in round 7, in one line: it drew his abstract harness steps (Plan, Admit, Work, Check, Land, Learn) and
filled them with data, in four fixed time cards. He wants a picture of what is actually happening, made of the real
working parts.

**What the tool is for.** His own front end to Claude Code. He gives the prompts there and leaves; he sees there, without
reading, what is happening and what happened, so he catches waste and failures early and improves his harness; and he
goes from it straight to any session or part, instead of hunting through chats and sessions or asking a model to find
things for him. (k), (i), section 1 of NEXT-ROUND-6

**What he must see by looking**
1. **The real working parts, not abstract steps:** each hook by name (tier hook, record guard, window ceiling, creep
   gate and the rest), the skills and commands, the helper kinds and their models, the scripts (journal tool, record
   book look-up), the tests, git; each seen when it acts, on which session, and with what result: let through, refused,
   failed, not switched on. (j), (i)
2. **Now:** which sessions and helpers are running at this moment, what each is doing, which parts it is touching, and
   how much it spends. (i)
3. **Time, unbroken:** when each piece of work started, ran and stopped, so a gap (nothing ran 11:33 to 12:18) and a
   start (Big run 3 and Monitor build at 12:18) are plain at once; no fixed slots. (i), (a)
4. **Where the work went and is heading:** who started whom, where the tokens went, what is growing, what has stalled
   or is going round in loops. (a), section 1 of NEXT-ROUND-6
5. **What broke, as a picture:** which session, which hook or part, what it failed or stopped on, and when; seen in
   place, not as words like "hook failed" under a box. (i)
6. **How the harness behaves:** which parts carry the work, which cost tokens or time, which fail or never fire
   (repeated checks, loops, a window past its line, round 3's 30 M on checks), so he can change them. Section 1 of
   NEXT-ROUND-6

**What he can do from it** (k)
7. Click a session and be taken to that session in the app; double-click a part (a hook, a skill, a script, a file) and
   be taken to it.
8. Operate from it: give prompts, start sessions, answer what a session asks, stop one; without going round the app.
8a. Two pages: **Now**, the current state, constantly updating; and **History**, the past. (l)
8b. A setting of his choosing: a double-clicked part opens in VS Code or in the app's file pane. (l)

**How it must work**
9. One picture: the sessions, their helpers and the real parts together, on a canvas he can zoom in and out of. (a), (j)
10. Smooth, constant live updating; no lag, no jumps. (i)
11. Uses the whole screen with good balance, colour and structure; no cards on empty grey; readable at about 1870 px,
   light. (i), memory note "Readable without removing"
12. Stays readable in the busiest hours (8 sessions at once, hundreds of helpers); no mesh of lines. (d)
13. No tables and no text that explains; opens inside the Claude Code app and in any browser window. (a), (g)

**How it is judged.** Someone who has never seen it looks for ten seconds, with no legend, and can say what is running
now, which parts are at work, what happened since he left, and what broke, in which part, and where; and he reaches any
session or part in one click.

## 4. How the round runs (his words (l))

- Cap 25 M tokens, agreed. Weekly meter at 43 % at the start.
- The UI/UX research and the prototypes run on Fable at high effort, as he asked; the session orchestrates on Opus.
- He attaches UI/UX skills; the designer reads them before the prototypes.
- The UI and UX must be very good: that is what he judges.

## 5. The UI/UX skills (his word of 2026-11-24: "Use these skills to build it set them up for your helpers")

Downloaded on his approve: (files only, each skill's own folder from GitHub, no installer or npx run) into the user
skills folder `~/.claude/skills/`: `web-design-guidelines` (Vercel, 2 files), `ux-audit` and `design-review` (jezweb,
23 and 1 files), `ux-designer` (szilu, 33 files), `ui-ux-pro-max` (nextlevelbuilder, 81 files), `impeccable` (Paul
Bakaus, 63 files; `disable-model-invocation: true` added to its front matter, so it runs only when called by name).
They now load in every one of his sessions. The source he pasted gives each its use:
- **Designing the prototypes:** `ux-designer` (Nielsen, the laws of UX, information architecture, data visualisation)
  and `ui-ux-pro-max` used as a look-up of UX guidelines and chart types only, never its style catalogue. Its search
  scripts need Python, which this PC lacks: read its data tables directly.
- **After a build:** `web-design-guidelines` as a checklist; `ux-audit` (clicks and watches the live page before a
  verdict), then `design-review` (the visual pass). One review per deliverable (CLAUDE.md rule 8).
- **Impeccable:** only `critique` and `distill`, called by name.
- Helpers never run a script from these folders, never `npx`, never log in anywhere.

**(m) His words on "Impeccable runs only when called by name"** (2026-11-24), unedited:

> Wait, what do you mean only when we call it by name? Just process it and start using the skill, like assign the subagents that would be best for that skill. Like, how would I know when to call it by name?

So the session assigns each skill to the helper whose job fits, in that helper's brief; he never calls one. The
"only when called" flag on Impeccable (from the note he pasted) stops it loading by itself in every session; the
helpers read the parts they are assigned straight from its folder.

| Helper | Skills it reads and follows |
|---|---|
| Prototype designer (Fable, high) | `ux-designer` (visual design, information architecture, data visualisation, notifications, performance UX); `ui-ux-pro-max` tables of UX guidelines and chart types; `web-design-guidelines` as the checklist while drawing |
| The same designer, on its own prototypes before they are shown (no separate review helper, CLAUDE.md rule 8) | `impeccable` critique rubric and distill |
| After a build, once: usability, then the visual pass | `ux-audit`, then `design-review` |

## 6. Where the round stands (2026-11-24, about 13:45 local), and the brief for the prototypes

**Done:** the goals (section 3, approved with his additions); the research: `round8/research.html` (screenshot
`round8/research-page.png`), from four researchers' findings in `round8/research/d1` (Now), `d2` (History), `d3`
(Operate), `c4` (what the app allows), each with its pictures. Shown to him in the Browser pane.

**Tokens: 24.6 M of the 25 M cap, counted from the transcripts** (all four usage fields, once per message id): this
session 11.2 M, D1 6.7 M (past its 3.5 M limit: nobody read its spend while it ran), D2 2.8 M, D3 1.9 M, C4 1.4 M. The
session's own window reached about 230 K, so each of its calls cost about 0.25 M. The prototypes were not started.

**Lessons for the next step:** run the prototypes from a fresh, small window; read a helper's spend from its transcript
while it runs and stop it at its limit.

**Brief for the prototype step (a fresh session; his words in sections 1 and 3 outrank this):**
1. Read sections 1 to 5 of this file in full, then `round8/research.html` and the four `findings.md`.
2. One designer on Fable at high effort (kind `design`) makes **three prototypes from the real data**
   (`app/data.json`, read by `build/snapshot.mjs`): (a) **Now**: the fixed board of the real parts (each hook, script,
   skill, command, helper kind by name, in fixed places, all grey), sessions shown on the part they touch, trouble the
   only colour with a mark that stays until seen, helpers packed in their session; (b) **History**: the week as seven
   day-strips never cut, a window onto session lanes with helpers packed, one thin row per hook on the same clock, long
   quiet stretches folded into a band that carries its length in the zoomed view; (c) **Operate**: the "needs you"
   mark with its answer buttons on the session, the rail ordered by need, one prompt box in a fixed place. Each is a
   static picture or a tiny page, drawn on the crowded hours (Tue 24 Nov about 01:00 to 04:00) and on the 11:33 to
   12:18 gap and the 12:18 starts. Motion rules (finding 13 of d1) are written beside the picture, not built.
3. The designer follows the skills assigned in section 5 and checks its own pictures with Impeccable's critique rubric
   and the stranger test of `NEXT-ROUND-6.md` section 5 before they are shown; no separate review helper.
4. Show him the three pictures and stop. Nothing is built until he says yes to one.

## 7. The prototypes (2026-11-24, about 14:30 local)

**Made:** one designer (Fable, high effort, kind `design`) drew three prototypes from `app/data.json`, one frame for
all: Now (03:33, and 13:03 after the quiet stretch), History (the week, Tuesday opened), Operate (03:29, a session
waiting for him). Files, the designer's critique scores, stranger tests, motion rules and what was invented:
`round8/prototypes/NOTES.md`. Shown to him on `round8/prototypes/index.html` in the Browser pane.

**Tokens:** 8.4 M of the 12 M cap at the showing (this session 2.8 M, the designer 5.6 M of its 7 M limit; transcript
count, all four usage fields, once per message id). The watch on the designer's spend ran the whole time; it was not
needed.

**Found in the data, not checked further (his ruling: the picture first):**
- Nothing starts at 12:18. The quiet stretch is 11:34 to 12:59; Monitor build waited for his answer through it
  (asked 11:33, answered 12:59); Big run 4 starts at 13:00.
- The busiest moment drawn has 3 sessions working and 1 waiting; 8 at once is not tested.
- Skills, slash commands and git are not in the data, so they are not on the board (short of goal 1).

**The coordinator's look at the screenshots:** History reads at once (the week, the fold "4 h 47 min", ticks on the
lanes and on the hook rows). Now and Operate read: named parts in fixed places, trouble in colour on the part, the
waiting session loud with its buttons. Now fails the stranger test in part on "what happened since he left"; History
carries that.

**His answer (2026-11-24, to "approve: build the Operate picture (the Now page with Answer, Stop and the prompt box)
first, then History on the same frame?"):** "Yes, build Operate". Nothing is built yet: the build is the next step,
under its own cap, from a fresh session; its brief starts from this section and `round8/prototypes/NOTES.md`.

**His next words (2026-11-24), unedited:** "It shouldn't be that hard to just give me a prototype type thing. Just gives
me an idea and a sort of experience with the UI UX. It doesn't really have to be working in the sense that it can have
dummy data operating on it. The whole point is for the UI UX being really good. So like I think you're just wasting
tokens with this." Then: "Also, I need to know whether the skills that I told you to use were they properly utilized or
not. [...] Take a check."

**The check of the skills (from the designer's own transcript):** not followed properly. `ux-designer`: SKILL.md read;
of the five assigned chapters (04, 05, 17, 18, 22; 76 K characters) only headings and bold lines, about a tenth; 01
(Nielsen) and 02 (laws of UX), named in section 5, not opened. `ui-ux-pro-max`: about 8 rows of `charts.csv` and 16 of
`ux-guidelines.csv` found by keyword; `motion.csv` and its rules files not opened. `web-design-guidelines`: the rule list
skimmed, SKILL.md not read, no checklist pass on the pictures. `impeccable`: `critique-rubric.md` read nearly in full and
used for the scores; `critique.md` (how to run the critique, 28 K) not read; `distill.md` read, not applied. Cause, in
part: the brief told it to read selectively and spend well under 1 M tokens on the skills.

## 8. Clickable prototypes, one per skill (2026-11-24, his workflow)

His words in full (a front end only, dummy data, no server; four Sonnet sessions each armed with one skill; an Opus
session at extra effort reviews them, talks it through with him, then builds the final one with the skills):
`round8/clickable/BRIEF.md`, which is also the builders' brief; the Opus session's brief is `round8/clickable/REVIEW-BRIEF.md`.
Cap 35 M, agreed by him (expected about 25 M): data 1.5 M, four builders 5 M each, the Opus session 11 M, coordination
the rest. Weekly meter 46 % at the start. Spent before it: about 10.6 M of the 12 M of section 7's step.

**Cap raised (2026-11-24, his "Yes, 46 M"):** the four builders all reached 5 M unfinished (reading the skills in full
made each call dear) and were stopped; the round went from 35 M to 46 M, each builder to 7.5 M, and all four resumed.

**Limits raised again (2026-11-24, his words):** "if it stopped, just make it 9 million then. Like at least let it finish
when it's already done 7.5 million, so we can have a better comparison." Each builder to 9 M; the round at most about 52 M.

**The four builders finished (2026-11-24, about 16:00 local):** all four pages and NOTES.md written. Spend by transcript:
UX Designer 9.2 M, Vercel 10.7 M (its own review not run), Impeccable 11.4 M, UI UX Pro Max 12.4 M (not click-tested);
data 0.7 M; this coordinating session about 15 M in the round (each wake re-read a window past 250 K: the long
coordinator window again, as in the token-bottleneck finding). The round stands at about 59 M against about 52 M
allowed: past the cap. The builders ran past their limits because the watch polled every 30 s and stopped sessions ran
the queued messages next. The Opus review waits for his word.
