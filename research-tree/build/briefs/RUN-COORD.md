# Brief: the research run's instructions, its coordinator's brief, its three other helpers' briefs, the go and the downloads (helper of top session 5; kind analyse, Opus)

The owner approved the research run on 2026-11-20 (r57-0046: "Yes, 1.2 B" to `approve:` the run as
`H:research-tree/build/NEXT-STEP.md` describes, `cap:` 1.2 B tokens, the preparation included). You write the files a
Fable coordinator needs so that he opens it with one typed go and the run needs no typed turn from him unless it stops.
At the same time helper B writes the field helper's brief and helper C builds the run's scripts; all three follow
`H:research-tree/build/briefs/RUN-INTERFACE.md` (read it first: paths, units, tags, prefixes, returns, the scripts,
`config.json`). `H:` = `C:/Users/User/Documents/projects/harness-engineering/`; `RUN:` =
`C:/research-runs/2026-11-harness-leads/`. A blind review of your files follows; write so a reviewer can check each
line against its source.

## Read, from the files (r57-0009), the parts you need
- `H:CLAUDE.md`; the board `H:library/INDEX.md`; `H:library/README.md` (record schema); `H:.claude/hooks/tier-routes.json`.
- The approved plan and its parts: `H:research-tree/build/NEXT-STEP.md`; `COMPLEXITY.md` version 2 sections 0, 2 (the
  figures per unit and window), 3 (path e2), 5 (the plan, steps 1-6, his review idea, what it loses), 6;
  `ROUTER.md` version 2 sections 0, 4, 6, 7; `UNATTENDED.md` version 2 sections 0, 3, 4 (item 9), 5, 6; `FAULTS.md`
  version 2 section 0; `PILOT-PLAN.md` version 2 section 3 (the gate). All in `H:research-tree/build/`.
- `H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, by its headings: what the problem sheet, the planted copy,
  R_same, the fresh arm, the fixed review form, F1, the scorer, the recall test with its board, the synthesis and the
  owner's page are, and what each guards against.
- `H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` (lane 1 is the problem sheet; sections 3, 5, 6);
  `H:docs/program/evidence/round3-2026-11-18/ROUND.md` (round 3's steps, standards for a paper, library rules).
- The app's tool texts you need (load with ToolSearch, call none): CronCreate, get_usage, TaskStop, SendMessage.

## Write (design only; in `RUN:`)
1. **`RUN:CLAUDE.md`**, at most about 5 KB, at source quality (r57-0019): what this folder is; the step table for path
   e2, each step's kind, model and effort as ROUTER.md section 4 gives them (coordinator Fable high; field helpers,
   sheet, planted, closing, report writers, refuters Opus high; readers, gates, checkers, scorers Sonnet medium; folds
   Opus medium; extraction Haiku low or medium), written as the owner's instruction, so that every Agent call here
   passes that `effort` (the Agent tool sets it only when the owner, CLAUDE.md or a skill explicitly asks); and the
   rules every session and helper here keeps: privacy (H: CLAUDE.md rule 4); questions to the owner start `approve:`,
   `cap:` or `fact:`; downloads only as `DOWNLOADS.md` names; no install and no experiment but the F1 comparison; quiet
   scripts (one line printed, the rest to a file); returns at most ten lines; no call over 150 s; files first and a
   commit in `RUN:`'s git after each step (an app restart kills helpers, r57-0118); `H:` read only and never
   `H:docs/program/pipeline-diagram/`; tokens counted only by `RUN:tools/`; plain words to the owner, the answer first.
2. **`RUN:briefs/COORDINATOR.md`**, the Fable coordinator's brief (kind orchestrate-deep): at the go, which form it is
   in (before the reset: one one-shot wake, UNATTENDED section 5 E2; at or after it: start); a small orientation (this
   brief, `run/config.json`, `run/STATE.md`, nothing else: it never reads the protocol or the design documents; Fable
   weighs 2.7-5.6 Opus per fresh token, ROUTER section 2); the gate before every start (`tools/gate.mjs` with the
   `get_usage` readings of the same turn); the order (sheet and planted first, then the fields at the width COMPLEXITY
   sections 5 and 6 give and how the first fan-out shows whether more fit, then closing); each start's description and
   one-line prompt (`Read and follow RUN:briefs/<file> for unit <unit>; your limit is <L> M tokens`); waiting
   (notices wake it; a safety timer under its one-hour cache lifetime, by a documented tool, with its cost, ROUTER rows
   5 and section 6); a return (read the ten lines, update `run/STATE.md`, commit); a failed or stopped helper (usage
   limit, app restart, error) and its restart from its files; the three checks path e2 drops (fencing a replaced
   helper, a restart limit, hang detection; FAULTS section 0): where a brief line can stand in at no token cost, write
   it, marked [reasoned], else say it is dropped; the cap (no new start past it; `cap:` to the owner with the numbers);
   what it tells the owner, when, in plain words; its own window (COMPLEXITY's expected end 153-246 K against the
   hand-over point 247-273 K, r57-0171) and what it does near it.
3. **`RUN:briefs/SHEET.md`, `PLANTED.md`, `CLOSING.md`**: the briefs of its other three helpers (COMPLEXITY section 5
   steps 2 and 4; the protocol for the planted copy, its key and the fixed form; the closing helper's samples, folds in
   two-field packets, draft board, recall test and scoring, synthesis with its fresh refuter and fold, and the owner's
   page): kinds and models by the routes, inputs, outputs at the interface's paths, records and prefixes, limit, return.
   `PLANTED.md` must say which of our files each field reviews (`planted/INDEX.md`) and how many plants (k) per field,
   with the source of k.
4. **`RUN:run/config.json`**: every value, its source given in a table in `COORDINATOR.md`; expected and limit per
   unit from COMPLEXITY's figures, a limit being the measured expected plus a buffer (r57-0038), formula shown;
   `preparation_M` left `null` (top session 5 fills it).
5. **`RUN:GO.md`**, for the owner, plain words, the answer first: the go text he pastes (his words: it opens the run
   as `briefs/COORDINATOR.md` says, approves the downloads `DOWNLOADS.md` names and the rule-3 exception, and the cap);
   where (a new Code session in `RUN:`; model Fable; effort as ROUTER says); the settings that are his (Auto mode in the
   mode picker; Remote Control on this session alone, with its cost; for form 2, Windows set not to sleep on mains
   power until the run ends); when (form 1 at the reset, Monday 23 November 17:00 his time, UTC+5; form 2 before it,
   one wake at 17:05 his time); what can stop it and what he does then (UNATTENDED sections 0 and 3); hours and tokens
   (NEXT-STEP).
6. **`RUN:DOWNLOADS.md`**, the downloads named with source and size (H: CLAUDE.md rule 3): public papers only, from
   open copies, at most 40 MB each, about 60 MB a field, about 420 MB in all (COMPLEXITY section 5 step 5), into
   `RUN:papers/`, read only through pdftotext, never opened or run otherwise; no clones, packages, models or datasets.
   Decide from the direction ("primary sources (papers, code, benchmarks)") and ROUND.md's standards whether a raw text
   page of public code or a benchmark is a download to name; if so, name it with its size bound. The rule-3 exception
   (the F1 comparison runs in the desktop app with the network on, outside a container; COMPLEXITY section 5 step 5):
   say exactly what runs, what it reads and writes, and why a container does not fit.

## Rules
Keep the approved plan: change nothing it decided (path e2, the models, the checks kept and dropped, the cap, the start
from the reset). Where it leaves a gap, fill it from the sources and list each fill, with its source, in a last section
"Fills" of `COORDINATOR.md`. Marks [m] measured (path), [r] read (path:line), [c] computed with the formula, [e]
estimate (range). A mechanism from the recorded research, a number computed (r57-0001, r57-0002); nothing asked of the
owner but `approve:`, `cap:` or `fact:`. No web request is needed; make none. Read-only everywhere except the files
above and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0fedf9f2-6bb0-4fa4-bcd6-133df5bb66ca/scratchpad/run-coord/`;
do not write `RUN:briefs/FIELD.md`, `RUN:briefs/field/` or `RUN:tools/`. Start no session, helper, workflow, schedule or
wake; change no setting; no commit; no command over 150 s (a call over about 180 s is moved to the background and you
can stall).

## Tokens and return
Expected about 8 M, limit 18.6 M (analyse on Opus, E 1a, n = 19). Your counter:
`node H:research-tree/build/tools/tokens-self.mjs "run coordinator brief"` every 10 calls from call 30. At about 330 K
context or at the limit, write the files as they stand with "Left to do" and return LIMIT. Return at most ten lines:
the files; the coordinator's expected tokens and window; the limits per unit; the number of fills; anything against the
interface; your token count.
