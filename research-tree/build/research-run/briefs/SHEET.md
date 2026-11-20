# SHEET: the problem sheet's brief (kind analyse, Opus, high)

The coordinator starts you as `analyse: sheet problem sheet` with the prompt `Read and follow
C:/research-runs/2026-11-harness-leads/briefs/SHEET.md for unit sheet; your limit is <L> M tokens`. `RUN:CLAUDE.md`
binds. `RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`
(read only). You are lane 1 of the research direction (`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` line 54):
where the tokens, time and errors go, from our own measurements, the sinks ranked. Every field scores its leads against
your sheet, and both reviewers of every field read it beside our planted files (`H:research-tree/build/COMPLEXITY.md`
v2 lines 175-177). If `RUN:sheet/SHEET.md` exists you are a restart: go on from the first missing output below.

## Read (headings first, then ranges; never a whole long file)
- Lane 1's five files in `H:docs/program/` (DIR line 54): `TOKEN-BOTTLENECK-2026-11.md`, `AFTER-COMPACTION-2026-11.md`,
  `SPLIT-RULE-2026-11.md`, `SUMMARY-CHECK-2026-11.md`, `HARNESS-BOTTLENECKS-2026-11.md` (72 KB: `grep -n "^#"` first,
  then the sections that hold measurements); the evidence a number cites, at its line, where you state the number.
- DIR section 2 (what our embeddings test does and does not tell us) and section 3 (what counts as a lead).
- Library records on these sinks: `bash H:library/lookup.sh <words>` (for example token window, compaction, cache,
  poll, orientation, hand-over, stall, citation, hallucinat); open the place a record cites before you rest on it when
  its id begins with `x` (r57-0130).
- Published cost breakdowns of agents (DIR line 54) only where our files or a library record quote them with a place;
  make no web request (COMPLEXITY lines 175-176: one analyser writing from our own measurements).

## Write
1. `RUN:sheet/SHEET.md`, at most 8 KB (every field's two reviews read it with our files; R_same's room is 32-72 K,
   COMPLEXITY lines 120-122):
   - line 1: the largest sink and its size, one sentence;
   - one table, a row a sink, ranked by r57-0003 (quality first, then time, memory, tokens): `| S<k> | sink | measure
     (throughput, efficiency, token count, token cost, time taken, quality or hallucinations) | size and unit |
     condition (task, repository, model, n) | source path:line | how known ([m], [r], [c], [e]) | not known |`;
   - per measure, the ids of its top sinks; then "Not known": the sinks we have no measure for.
   Each number equals its source's; a judgment says so. Nothing on what to build: the fields find the leads.
2. Records in `RUN:journal/2026-11-23/d1.jsonl`, one JSON object a line, fields and order of `H:library/README.md`
   (id, kind, status, claim, when, quote, evidence, see, note, handles, footprint, supersedes, date, by): a fact a
   sink (ids from `d1-0100`), an open record a gap of "Not known" (from `d1-0500`); `by` `sheet helper, research run
   2026-11-harness-leads`. The extractor file `x49` stays unused (you have no collect files).
3. The record check: one helper, description `run: sheet record check`, model sonnet, effort medium, prompt `Check
   every record of C:/research-runs/2026-11-harness-leads/journal/2026-11-23/d1.jsonl and every number of
   C:/research-runs/2026-11-harness-leads/sheet/SHEET.md against the place it cites (open it, the line plus or minus 3).
   Write sheet/check.md, a row each (id or S<k> | holds or fails | why, at most 20 words), then sheet/done/check.done.
   No git command that writes. Your limit is 4.7 M tokens. Return at most five lines: held, failed, the failed ids.`
   [limit c: FIELD.md step 8, 2.82 + 1.5 x 1.23]. Wait only with `node C:/research-runs/2026-11-harness-leads/tools/wait.mjs
   sheet 150 C:/research-runs/2026-11-harness-leads/sheet/done/check.done`. Remove failing records; correct or drop a
   failing number in SHEET.md.
4. Commit (`RUN:CLAUDE.md` rule 7): `sheet/SHEET.md sheet/check.md sheet/RETURN.md journal/2026-11-23/d1.jsonl`.
5. `RUN:sheet/RETURN.md` and your return, the same lines, at most ten: line 1 `sheet DONE|LIMIT|FAILED <one reason>`;
   line 2 `tokens <x> M of limit <y> M` (`node C:/research-runs/2026-11-harness-leads/tools/tokens.mjs sheet`, once); then
   the sheet's path and its count of sinks; the top three sinks (id, size); records written and removed by the check;
   what is open. Order: RETURN.md, the commit, then `RUN:sheet/DONE.md` (`sheet done <UTC>`) only when line 1 is DONE.

## Tokens
Expected 9.8 M (6.5-13.2): you 8.05 (4.94-10.39) [m: E 1a analyse/opus, n = 19] and the check 1.745 [m: round 3, n = 4]
(`RUN:briefs/COORDINATOR.md` section R1). Your limit is the L in your prompt (23.2 M at most). Before the check starts,
your tokens + 4.7 must stay under L, else start it with what is left. At L or at about 330 K of context: write what
stands, commit, RETURN.md with `sheet LIMIT <what is missing>`, no DONE.md, return.
