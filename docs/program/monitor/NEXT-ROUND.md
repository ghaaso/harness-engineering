# Session monitor, round 3: the whole harness in the picture (brief for a fresh session)

Written 2026-11-24 by the session that built rounds 1 and 2, at 294 K of its window (warn 310 K, line 362 K), so
that the next round starts fresh from files. Read `README.md` in this folder first: it holds what exists, how to
rebuild it, the measured facts and the stand-ins. **The owner confirmed the understanding below on 2026-11-24 ("Yes, that's it") and agreed a cap of 30 M tokens
for this round** (asked as a "cap:" question; rounds 1 and 2 took 10.1 M in one session of 93 calls; the weekly
meter stood at 37 % for all models and 15 % for Fable, reset 2026-11-30). Stop at the cap and report what is
finished.

## What the owner said about round 2 (2026-11-24, his words, shortened)
- "This is good. This is much better." The timeline works: "you managed to create a good solution for the
  timeline thing".
- How far back to look "really depends on the task and the project at hand"; "there should be options to select
  that". (Present: three buttons and a draggable frame. Keep; no fixed default is right.)
- "This could be much better... be creative... be the judge how you can make this more usable. What features
  could you introduce... me being able to be more armed and more spark and creativity to improve the pipeline,
  spot problems in the pipeline, and catch problems before it's too late or too much tokens are wasted."
- "There are sessions, there are documents. For example we have the orchestration document, a session using it,
  calling it, what's being enforced, what isn't being enforced. That has to be somehow represented in this
  diagram model. So everything is in place, including the hooks, the harness."
- "It's like a network diagram, but I'm not seeing the whole picture here, the harness... the hooks, being able
  to get a good view such that it also arms me, gives me more ideas."
- "Focus on this response and try to understand what I'm getting at before going forward."

## Understanding put to him (to be confirmed or corrected)
Round 2 shows the actors over time. It does not show the system they act in. He wants one model in which every
kind of thing has its place and the lines between them are drawn:

| Kind of node | Examples | Where it can be read from |
|---|---|---|
| Session, helper | as in round 2 | transcripts, `subagents/` |
| Document | orchestration document, plan, briefs, state files, the board, protocol, CLAUDE.md | Read / Write / Edit paths, paths in shell calls, paths in a helper's or child's prompt |
| Rule | CLAUDE.md rules 1 to 7, the board's "before you do this" rows | `research-tree/build/ENFORCEMENT-TABLE.md` (prose today; needs to become data) |
| Enforcer | the nine hooks, `tools/check-commit.mjs`, the journal tool | `.claude/settings.json`, `.claude/logs/*.jsonl` |
| Store | journal, evidence, run folder, memory | writes seen in transcripts and the journal tool's log |

Lines: session reads / writes / is pointed at a document; a document carries a rule; a rule is enforced by an
enforcer or by nothing; an enforcer checked (or refused) a session's call; a session wrote a state file and the
next session started from it; a session started a session.

Two linked views of that one model: **over time** (round 2, kept) and **the harness** (new). The harness view is
the designed system, with each part lit by real use in the stretch shown: used, idle, bypassed, and for a rule:
enforced by a hook, checked by a script, or written only. A click on a session traces its path through the
harness, with the parts it should have touched and did not. A click on a part shows who read it, who wrote it,
which rule it carries, what enforces it and which sessions skipped it.

Base for the harness view: the owner's own diagram, `docs/program/pipeline-diagram/` (system map of 19
pipelines, `harness-map.png`; text in `build/content.mjs`; part lists with sources in `parts/`). Use his boxes and
names; do not invent a second architecture. His rulings on diagrams apply (memory notes: pipelines not flat
boxes; a tree is nodes and lines; plain wording; glance, not tables).

## Measured for this round (one reading, 2026-11-24, 33 sessions with their helpers)
Probe: read paths, write paths, paths named in shell calls and in prompts, per session.
- Document use is readable from the transcripts: 5,669 distinct documents touched.
- The board: read or named by 28 sessions. The orchestration document (`research-tree/ORCHESTRATION.md`): read by
  11, named by 14, written by 2. The plan (`research-tree/build/plan.json`): 6. Tier routes: 20.
- 700 brief files touched by 16 sessions.
- 96 markdown documents were written and never read, named or pointed at afterwards (many in the run folder).
- Limits: a path in a shell call is a text match (a bare file name loses its folder); CLAUDE.md and the board at
  start are loaded by the app or a hook, not by a Read call, so they are under-counted by this probe.

## Features, in the order judged most useful (the judgement is ours, per CLAUDE.md rule 7; show, do not ask)
See the whole
1. The harness view, lit by use and enforcement (above), linked to the time view by selection.
2. Built but untouched: parts nothing used in the stretch shown (documents never read, hooks that never fired,
   rules nothing enforces, agent types never started).
Catch it early
3. Designed against actual: the plan of the orchestration document beside what really started; a departure is
   marked at the first step. The field to borrow from is process mining (discovery, conformance, performance);
   read a source before citing anything from it.
4. Forecast: for each working session, when it reaches its window limit and its token cap at the present rate
   (the hooks' logs carry the limit, the cap and the spend); the verdict turns before the limit, and a Windows
   notification reaches him when he is away (he catches up; he is not watching).
Improve it
5. Where the tokens went: one flow from the total into the coordinator re-reading its window, helpers by kind of
   job, redone work, refused calls.
6. Change markers: each change to the harness (a hook built, a rule added) as a flag on the time strip, with
   before and after of the number it was meant to move.
7. Notes: an idea pinned to any part or session, saved to a file.

## Constraints carried over
- One screen, no page scroll, readable on his second screen (checked at 1920 x 1080 by headless Edge; recipe in
  the memory note on local pages). State as colour; numbers only where one figure answers the question.
- The page reads files and calls no model. No install, no download.
- Traps met: the record guard refuses a shell command that names the journal together with a path in a variable
  (use literal paths); backslashes collapse in heredocs (write patch scripts with the Write tool); the browser
  pane refuses local files over 512 KiB (the page is about 320 KB).
- Kind of job and model for helpers and child sessions by the tier routes; read the plan's usage and agree a cap
  before any fan-out.
- Nothing in this folder is committed. No library record was written for rounds 1 to 3.
