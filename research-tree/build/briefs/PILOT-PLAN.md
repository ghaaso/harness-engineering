# Brief: the pilot's plan and token cap (helper of top session 2; kind analyse, Opus)

You compute the plan and the token cap of the pilot (slice 3 of `research-tree/BUILD-PLAN.md`, lines 140-145;
library open record r57-0519) from what the build measured, and write them to
`research-tree/build/PILOT-PLAN.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`).
The top session turns your file into a page for the owner. You start nothing and change no other file.

## Rules that bind this work (read them in the files, not from this brief)
- `CLAUDE.md` rules 1-7. Above all rule 7 and library r57-0001, r57-0002: no design question goes to the owner.
  A mechanism comes from the recorded research, a parameter is computed from measurements against the seven
  measures, a missing fact is measured. The only things he is asked are approvals (`approve:`) and caps (`cap:`).
- r57-0038 (a limit is the measured expected need plus a buffer), r57-0035 (Fable orchestrates a session whose
  children have children), r57-0039, r57-0003 (quality first, then time, memory, tokens), r57-0007 (nothing he has
  not asked for), r57-0033 and r57-0417 (test only where the result changes what is done next), r57-0015 and
  r57-0028 (nothing tuned to one run or one repository: say what the numbers rest on).
- Look a record up with `bash library/lookup.sh -f <id>`; the board is `library/INDEX.md`.

## Read first
1. `research-tree/START-HERE.md` (where the tree stands; the chain of sessions it names for the pilot).
2. `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`: section 2 (the roles: coordinator, child, readers,
   checkers, reviewers, scorer, and who starts whom), section 10 (what must exist before the pilot), section 11
   (what it measures, its arms: T, S1, S2, R_same, R1, R2), section 12 (the owner's decisions and their defaults),
   sections 15 and 16. `research-tree/RULINGS.md`.
3. `research-tree/ORCHESTRATION.md` sections 0, 1, 3, 4, 5, 13: the method you reuse (expected = median of
   like-for-like measured work; limit = Q3 + 1.5 IQR; reserve pooled at the root as sqrt of summed squared spreads;
   cap = expected + the fully correlated overrun; the window gate with protected later demand; hand-over W*).
4. The build's results: `research-tree/build/reports/` (slice-0, slice-1, slice-2, fx-w6 `.md`), the
   "Departures" and "End list" sections of `research-tree/build/STATE.md`, and library records r57-0166 to
   r57-0173, r57-0519, r57-0521, r57-0522 (journal `library/journal/2026-11-20/r57.jsonl`).
5. The tree's own cost model as built: `C:/Users/User/Documents/projects/hb/research-tree/tcb/cost.mjs`,
   `cost-inputs.json`, `thresholds.json` (branch `build`, code 96bc34cc; the main checkout has the older copies).

## What is already measured (do not redo; cite the record)
- r57-0170: the build's window 2026-11-19 16:19 to 2026-11-20 07:25 UTC, 997.1 M tokens over all models and
  folders; the meter 64 % to 80 %: about 62 M tokens a point (59-66 M) on a mix of 96 % Opus by tokens; the Fable
  meter 49 % to 53 % on 22.8 M Fable tokens, about 5.7 M a Fable point (4.6-7.6 M, one interval); the owner's own
  two top sessions about 0.10 points an hour in that window (ORCHESTRATION's Q37 for 11-16 to 11-19: 0.21).
- r57-0173: per role against the plan (builder unit 32.3 M, refuter 10.6 M, analysers 9.1 and 26.9 M, a root call
  about 0.24 M, readers 0.4-1.1 M). Helper-by-helper rows: the subagent transcripts under
  `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/<session>/subagents/`
  for sessions 8a7db643, 0be12bcd, 873082b7 (each `.meta.json` holds the description).
- Now (2026-11-20 about 09:15 UTC): all models 80 %, Fable 53 %, both reset 2026-11-23 12:00 UTC. The build's stop
  line was 81 % (the owner's `cap:` answer).
- All 25 scripts of protocol section 10's list exist in `tcb/` on `build`; the model is
  `research-tree/model/as-built/`. Nothing is merged into the working branch; nothing has run for real.

## What to compute (each figure marked [m] measured, [r] read, [c] computed with the formula shown, [e] estimate)
1. **The pilot as it would run**: every node (P3.1, P3.2, the preconditions of section 10 "Files" and "Before the
   go" that do not exist yet, the coordinator, each arm, reviews, scorer, the comparisons), its role, kind and
   model under `.claude/hooks/tier-routes.json` and r57-0035, who starts it, and in which folder (the run root lives
   outside every repository, protocol v2). Say from which commit the scripts run, and whether the merge of `build`
   (r57-0520) is needed before the pilot. Which owner options of section 12 stay at their default.
2. **Expected tokens per node** from the nearest like-for-like measured work, with its source and n. Where the
   record has no like-for-like work (a research child, a single-session arm run to 300 K, a fresh review), measure
   it from past transcripts (round 3's lanes and readers of 2026-11-18 and 11-19 were research sessions; the
   counting rule is input + cache creation + cache read + output, once per message id, assistant lines with usage,
   as `research-tree/build/tools/tokens-self.mjs` does). Then limits, the pooled reserve, the fully correlated
   overrun and the cap, by section 3's method. Use the build's measured ratio of actual to plan where you have to
   start from a plan figure, and say so.
3. **Points**: all-models points at 62 M a point (59-66 M), the Fable meter for every Fable node at 5.7 M a Fable
   point (4.6-7.6 M); say plainly that per-model weights on the all-models meter are unknown and what a Fable root
   could cost there at the ends of what the record allows.
4. **When it fits**: the gate of ORCHESTRATION section 4 with today's meter: room this week = 100 - now - protected
   later demand to the reset (from the measured rates), against the pilot's expected use and its cap. Say which
   line (a meter percentage) the owner would have to allow to run it this week, and the alternative of starting at
   the reset; the time it takes ([e] from the build's measured minutes and the protocol's steps).
5. **Before the pilot or measured in it**: for each open item that touches the pilot (r57-0521's End list, r57-0522's
   three coordinator gaps, the flaky stop test, the pilot facts S2 left), decide from the record and the objective
   (quality first) whether it must be fixed before the pilot, and at what tokens, or is measured by it. No question
   to the owner.
6. **The owner's asks**: the exact `approve:` and `cap:` items the plan needs from him, each one line, nothing else.

## Write `research-tree/build/PILOT-PLAN.md`
Plain words, short sentences. Section 0 "The answer" first (at most 12 lines: what runs, tokens, points, the cap,
when it fits, the asks), then one table row per node, then the computation, then "Not known". Every number with its
mark and source. Write the file early (after your first reading) and keep it current, so nothing is lost if you are
stopped.

## Limits
- Your tokens: expected about 18 M (the build's two analysers, 9.1 and 26.9 M), limit 30 M. Read your own count
  with `node research-tree/build/tools/tokens-self.mjs "pilot plan and token cap"` at least every 10 calls from
  call 30. At about 330 K context or at the limit: finish the file as it stands, write what is left under a heading
  "Left to do", and return LIMIT.
- Read-only everywhere except your output file and scratch files in a folder of your own under the session
  scratchpad. No session start, no helper start, no command over 150 s, no install, no web request, no commit, no
  edit of any other file. Archived evidence is never edited (CLAUDE.md rule 1).
- Return: the path of your file, its section 0 as written, your token count, and anything you could not settle.
