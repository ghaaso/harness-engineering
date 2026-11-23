# Brief: the seven replays (top session 7, 2026-11-23)

You run ONE of the seven replays the owner approved (library r57-0053). Your unit is named in your start message.
A replay is a measurement over records already on this PC. It answers one question: how large is, here, the thing
the lead acts on, and would the lead's mechanism have caught or saved it. It sizes a later pilot; it is not the pilot.

`H:` = `C:/Users/User/Documents/projects/harness-engineering/`. `RUN:` = `C:/research-runs/2026-11-harness-leads/`.

## Read first (only these, then what they point you to)
- `H:research-tree/build/JUDGE-HANDBACK.md` section 1 (your item), your lead's row in section 2, section 3.
- Your lead's block in `RUN:closing/HAND-BACK.md` (`## L<n>:` headings) and what it cites; `RUN:closing/SYNTHESIS.md`
  section 3.0 (measurements that come first) and the lines of your lead in 1.1 to 1.5.
- `RUN:sheet/SHEET.md`: the row of the sink your lead acts on, and the file and line that row cites for its count.
- The records: session transcripts under `C:/Users/User/.claude/projects/*/` (one `.jsonl` per session, helpers under
  `<session>/subagents/`); `RUN:tools/tokens.mjs` and `H:research-tree/build/tools/tokens-self.mjs` show how per-call
  usage is read; `RUN:tools/typed.mjs` finds the owner's typed turns; the build's records under `H:research-tree/build/`
  (STATE.md, refute/, usage.jsonl) and `RUN:run/`.

## Rules
1. Nothing is installed, downloaded or fetched. No web, no network. Use only what is on the PC now (`node` v24 is on
   the path; Python is not; look before assuming a tool is absent, and say what you could not run and why).
2. Records are read-only: transcripts, `recovered/`, `docs/program/evidence/`, the run folder, the library. Write only
   under `H:research-tree/build/replays/<unit>/`. No commit; the top session commits.
3. Write the scoring first: before any count, `SCORING.md` in your folder says what is counted, the unit of count, what
   decides a hit and a miss, which records are in and out, and what result would mean "do not pilot". Do not change it
   after seeing counts; if you must, keep the old line and say why.
4. Like with like, and both sides: a detection figure needs the false-alarm figure on records the lead should NOT fire
   on. A count says what it counts and its denominator. Give the spread across projects (this repository, the research
   run, the FixFlow product, the clinic) separately where the records allow: a result on one is a result on one.
5. Nothing from one project's code or names leaves the PC; none goes into any request.
6. Models by kind of job (the tier hook refuses the rest); a helper's description starts with its kind and a colon:
   `locate:` and `extract:` Haiku; `read:`, `run:`, `build:` Sonnet; `analyse:`, `refute:` Opus. Do not name a helper
   `<kind>: L<n> ...`; write `<kind>: replay-L<n> ...`. Scripts that scan transcripts are ordinary code: give them to a
   Sonnet `build:` or `run:` helper with a brief that points at files, or write them yourself if that is fewer tokens.
   Start helpers that can run together in one message. Keep any single foreground command under 150 s.
7. Tokens: your expected need and your limit are in your row below. Count yourself with
   `node H:research-tree/build/tools/tokens-self.mjs` (read its header for the arguments) after each large step. At
   the limit stop, write what is done and what is not, and return LIMIT. Hand your own window over before 250 K.
8. End your processes before you return.

## What you write (`H:research-tree/build/replays/<unit>/`)
- `SCORING.md` (rule 3), your scripts, their raw output.
- `RESULT.md`, at most 150 lines: the answer first (two or three lines with the figures); the table of counts by
  project; how each was counted; the lead's seven measures (throughput, efficiency, token count, token cost, time,
  quality, hallucinations): which this result bears on and by how much, in tokens not money; what was NOT tested; what
  the result changes next (pilot, adopt as is, drop, or measure something named first), with the reason.
- `records.md`: proposed library records (kind, status measured / observed / reasoned, claim with its number, evidence
  path and line), for the top session to write.

## What you return (your last message, at most 15 lines)
`DONE` or `LIMIT`; the two or three headline figures with denominators; what it changes next; what was not tested;
tokens used (and calls); the path of RESULT.md.

## The seven units

| unit | question | expected, limit |
|---|---|---|
| replay-L11 | Of helper and session reports that say "done" (or passed, fixed, verified), what share did a later executed check, gate or refuter verdict contradict? Would "accept done only against an executed check" have caught them, and how often would it have blocked a true "done"? Sink S4. | 4.7 M, 10 M |
| replay-L8 | First: do Claude Code's own diagnostics already run on edits here (look in transcripts for diagnostics returned after Edit or Write)? Then: replay the fix commits behind S2's defects (at least 5 P1 and 10 P2 made by fixes) through the type checker and linter that are already installed for those projects (tsc where a project has it; mypy only if it is already on this PC or in a container image already present): how many of the defects would a gate after each edit have flagged, and how many false flags on the fix commits that made no defect? | 4.7 M, 10 M |
| replay-L6 | On the recorded overstatements (S4, 20 or more) plus an equal number of reports the record shows were accurate: does a reviewer that reads two versions of a report flag the overstated ones more often than a reviewer that reads one? About 40 reviewer calls (`refute:` Opus, fresh, blind to the verdict, arms balanced). SCORING.md must say where each second version comes from (a version already on record first; if none exists for a report, say so and what generating one would cost, and do not generate past your limit). Report detection and false alarms per arm, with the counts. | 9.4 M, 20 M |
| replay-L24 | L24 with L25. Per call, from the usage fields: cache writes that no first call of a session or helper, no lapse of the cache's life, and no compaction explains (a broken prefix); gaps over 300 s (helpers) and over 3,600 s (sessions) followed by a write (a lapse); first-call writes of helpers whose prefix a sibling wrote within five minutes. Tokens of each class, as a share of fresh tokens and of all tokens, by project and by month. What a keep-alive or a stable prefix would save on the meter (a fresh token against a cached re-read at about 1 %, sink S17; the write weight of a 1-hour cache is not known here: give the result at 1.25x and 2x). | 4.7 M, 10 M |
| replay-L2 | L2 with L27. The fixed prefix per role and per helper start (tool schemas, system prompt, CLAUDE.md, memory index, skills, the brief): its size in tokens per role and model, how much of it is written fresh at each helper start against read from cache, its share of fresh tokens and of all tokens, by project (sink S12 gives 27 % of context tokens, about 70,000 per fresh agent: check it). Which parts are always loaded and never used in the session (for example skills and tools never called). The ceiling a lean prefix would save, on the meter. | 4.7 M, 10 M |
| replay-L5 | No model run. Reads (Read, Grep, search and command output holding file content) that a later Edit or Write to the same file made stale while still held in the window: their tokens as a share of held tokens; who made the edit (the same session, its helper, another session); how many later calls carried the stale read. Inside the same scan: reads never needed by a later edit (the source's 73.4 %), in-window re-fetches of the same content (L4's count, sink S14 0.5 to 1.5 %), and what dropping a held read would cost in cache rewrite after it (C130 of f4b). | 4.7 M, 10 M |
| replay-L38 | How often does a recorded conclusion return: questions or sub-tasks in the transcripts whose answer was already on record (the library's journal, the hand-overs, earlier reports) and was worked out again; their tokens. For the conclusions that did return, which premises (files, facts) their traces name and which they miss, so that invalidation by recorded dependencies could be judged (our own replay: 0.00 % stale at fact level against 6.49 % at file level; find it through the lead block). | 4.7 M, 10 M |
