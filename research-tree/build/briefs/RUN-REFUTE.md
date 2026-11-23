# Brief: blind review of the research run's briefs (helper of top session 5; kind refute, Opus)

Refute the files that will govern the research run, about 1 B tokens: a Fable coordinator opened by the owner with one
typed go, seven Opus field helpers each running its own helpers, and three more helpers (problem sheet, planted copy,
closing). They were written by other helpers from `H:research-tree/build/briefs/RUN-COORD.md`, `RUN-FIELD.md` and
`RUN-TOOLS.md`, all following `H:research-tree/build/briefs/RUN-INTERFACE.md`. `H:` =
`C:/Users/User/Documents/projects/harness-engineering/`; `RUN:` = `C:/research-runs/2026-11-harness-leads/`. The owner
approved the run as `H:research-tree/build/NEXT-STEP.md` describes, with a cap of 1.2 B tokens, the preparation
included (r57-0046). Nothing of the run has started. Write your verdict to `H:research-tree/build/refute/RUN-BRIEFS.md`;
change no other file and start nothing.

## What you review
`RUN:CLAUDE.md`, `RUN:briefs/COORDINATOR.md`, `RUN:briefs/FIELD.md`, `RUN:briefs/field/*.md`, `RUN:briefs/SHEET.md`,
`PLANTED.md`, `CLOSING.md`, `RUN:run/config.json`, `RUN:GO.md`, `RUN:DOWNLOADS.md`, `RUN:.claude/settings.json`, the
interface file, and `RUN:tools/` only as far as check 5 asks.

## Check, each against its source (not against the files' own wording)
1. **The approved plan kept**: against NEXT-STEP.md, `COMPLEXITY.md` v2 section 5 (and sections 2, 6), `ROUTER.md` v2
   sections 4, 6, 7, `UNATTENDED.md` v2 sections 0, 3, 5, `FAULTS.md` v2 section 0, `PILOT-PLAN.md` v2 section 3 (all
   in `H:research-tree/build/`): is any step, check, model, effort, width, limit, cap or start time changed without a
   source? Is a check the plan keeps missing (the quote gate, a fresh refuter per field, the blind scorer, the recall
   test, both arms of his review idea), or a check dropped beyond the plan's list? Is each "Fill" sourced?
2. **It runs without him**: walk `COORDINATOR.md` from his go to his page, in both forms of `GO.md`: each step's
   trigger, wait, safety wake, return, failure (a usage limit, an app restart, a refused start, a silent or stalled
   helper, Auto mode going back to prompts), restart and stop at the cap. Is there a point where the run waits for a
   typed turn the plan says it does not need, or one it needs and does not say? Does any line make a session start a
   session, act for him, or go round the app's controls (r57-0042, `UNATTENDED.md` section 4)? Could a restarted helper
   and the old one write the same files?
3. **Tokens**: recompute the coordinator's and one field's expected tokens and windows from COMPLEXITY section 2's
   figures and what the briefs make each read and do (orientation, waits, polls, returns); check every expected and
   limit in `config.json` (r57-0038: measured expected plus a buffer) and that the limits at their fences, with the
   preparation, are set against the cap (mistake r57-0614); check the gate rule against PILOT-PLAN section 3 and
   r57-0414. Name any token sink the router lists (separate count calls, long returns, a manager reading what its
   helpers should read, scripts that print much, a Fable coordinator reading design documents).
4. **Quality guards**: the field's steps against `H:docs/program/evidence/round3-2026-11-18/ROUND.md` and
   `H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`: the quote gate, the refuter's fresh context, the scorer
   blind (arm names stripped, the key sealed), both arms on the same planted files in the same fixed form, library
   records reused only when quoted from a paper read in full (r57-0130), every record checked, refuted claims kept
   out of results; and against the direction's rules for every lane (`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md`
   section 5: lens, best form, generality, build on what exists, his own ideas, sources checked, privacy, no installs).
5. **One interface**: do the coordinator's and the field helper's briefs, the templates and `config.json` agree on
   paths, descriptions (kind and unit), the one-line prompt, limits, returns and done-files? Do the briefs call the
   scripts exactly as `RUN:tools/README.md` gives them? Run `node --test` on `RUN:tools/` once and read `gate.mjs`
   against the interface's gate rule; say whether it holds a start it should and passes one it should.
6. **His files**: is the go his to type, in his words; are the downloads named with source and size (H: CLAUDE.md
   rule 3) and the rule-3 exception exact; is every setting his, each with its cost (`UNATTENDED.md` section 3); plain
   words, the answer first; no design question to him (H: CLAUDE.md rule 7); nothing decided for him.
7. **`RUN:CLAUDE.md`**: at source quality (r57-0019), each rule from a source; does it make the efforts apply (the
   Agent tool's own text on its `effort` parameter); is it short enough for every helper to load.
8. **Marks and sources**: [m], [r] (path:line), [c] with the formula, [e] with a range, as each line claims; nothing
   quoted from a fetch summary as a reading (r57-0606); nothing of the project in any web request (H: CLAUDE.md rule 4).

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding, the most harmful first: the file and line,
what it says, what the source says (path and line), the correction, and whether it is **breaking** (the run would stop,
waste more than 1 % of the cap, lose a check the plan keeps, or act without his word) or not. Then what you checked and
found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0fedf9f2-6bb0-4fa4-bcd6-133df5bb66ca/scratchpad/run-refute/`.
No web request, no session, helper, workflow, schedule or wake, no commit, no setting changed, no command over 150 s.
Tokens: expected about 10.6 M, limit 18.5 M (refuters, r57-0173, n = 16). Your counter:
`node H:research-tree/build/tools/tokens-self.mjs "run briefs review"` every 10 calls from call 30. At about 330 K
context or at the limit, write the verdict as it stands, mark what you did not check, and return LIMIT. Return at most
ten lines: the first line of the verdict, the breaking findings in one line each, your token count.
