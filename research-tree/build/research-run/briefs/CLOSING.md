# CLOSING: the closing helper's brief (kind orchestrate, Opus, high)

The coordinator starts you as `orchestrate: closing intake and synthesis` with the prompt `Read and follow
C:/research-runs/2026-11-harness-leads/briefs/CLOSING.md for unit closing; your limit is <L> M tokens`, once every field
has returned. `RUN:CLAUDE.md` binds. `RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` =
`C:/Users/User/Documents/projects/harness-engineering/` (read only); `K:` = `RUN:closing/`, your folder. You read
sections 0-6 of this file; sections S, R, F and P are the briefs of four of your helpers, who read their own section.
The plan: COMPLEXITY v2 section 5 step 4 (`H:research-tree/build/COMPLEXITY.md` lines 228-230); round 3's intake
(`H:docs/program/evidence/round3-2026-11-18/intake-state.md`); what comes back (research direction section 6).

## 0. What you do
Run two branches at once: the intake (samples, folds in two-field packets, the draft board, the recall test) and the
synthesis (writer, fresh refuter, fold); then the page and the records. You only coordinate: you read this file,
`K:STATE.md`, each field's `RETURN.md`, the first 12 lines of each field's report, your helpers' returns and
wait.mjs's lines; never a record file, a whole report, a collect file or a paper.

## 1. Before the steps
1. `ls RUN:fields/*/RETURN.md RUN:fields/*/DONE.md RUN:sheet/DONE.md`: note each field's line 1 (DONE, LIMIT, FAILED,
   HELD). A field without records is left out of the samples and named in the synthesis as missing.
2. `K:STATE.md` exists: you are a restart: go through the steps in order and redo only the helpers whose done file is
   missing (as `RUN:briefs/FIELD.md` section 5).
3. The samples, by command (round 3's rule, intake-state.md lines 22-23): of `RUN:journal/2026-11-23/d<n>.jsonl`, the
   records of kind `result` or `fact` in line order, the 5th, 10th, 15th ...; of each of the field's extractor files
   (`x50`-`x84`, five a field, interface), lines 8, 16, 24 ...; the sheet's `d1.jsonl` the same way, added to f8's
   sample. One line a record (`id@file:line`) in `K:samples/f<n>.txt`. A scratch script in `K:work/`, never committed.
4. The recall questions: from each field's RETURN.md and `head -12` of its report, two questions a field, 14 in all
   (round 3's test had 14, r57-0140), each answerable from the run's records or rightly not recorded; no answers.
   Write `K:recall-questions.md` and commit it now, before the board exists.
5. Write `K:STATE.md` (as FIELD.md section 5: line 1 `closing L <L> M; tokens <x> M at <UTC>`, a line a step).

## 2. The steps
Every start: description as named; model and effort by `RUN:CLAUDE.md`'s table; the prompt below, filled. Limits: Q3
+ 1.5 IQR of the measured figure (PILOT-PLAN v2 lines 32-33); n = 1: 3 x expected. Done files in `K:done/`.

| Step | Helpers, at once | Kind, model, effort | Starts when | Writes | Expected M | Limit M |
|---|---|---|---|---|---|---|
| 1 | seven sample readers `read: closing sample of f<n>` (f8's with the sheet's) | read, sonnet, medium | section 1 done | `K:samples/f<n>-check.md`, `sample-f<n>.done` | 4.70 (4.51-4.77) each [m: COMPLEXITY line 162] | 5.2 [c: 4.77 + 1.5 x 0.26] |
| 1 | synthesis writer `analyse: closing synthesis` (section S) | analyse, opus, high | with step 1 | `K:SYNTHESIS.md`, `synthesis.done` | 8.05 [m: E 1a, n = 19] | 18.6 |
| 2 | four packet folds `analyse: closing fold <a> <b>`: f2 f3; f4 f5; f6 f7; f8 sheet | analyse, opus, medium | the seven sample done files | `K:fold-<a>-<b>.md`, `K:d9-<a>-<b>.jsonl`, `fold-<a>-<b>.done` | 10.59 (8.05-13.13) a packet, 3.5 packets [m: line 163] | 20.8 [c: 13.13 + 1.5 x 5.08] |
| 2 | synthesis refuter `refute: closing synthesis` (section R) | refute, opus, high | `synthesis.done` | `K:SYNTHESIS-refute.md`, `synthesis-refute.done` | 10.6 [m: refuters, n = 16, r57-0173] | 18.5 |
| 3 | synthesis fold `analyse: closing synthesis fold` (section F) | analyse, opus, medium | `synthesis-refute.done` | `K:SYNTHESIS.md` final, `K:d9-synthesis.jsonl`, `synthesis-fold.done` | 3.0 [r: ROUTER v2 row 18] | 9.0 [3 x 3.0] |
| 3 | draft board `analyse: closing draft board` | analyse, opus, high | the four fold done files | `K:BOARD-draft.md`, `board.done` | 5.5 [m, n = 1] | 16.5 |
| 4 | recall answerer `test: closing recall answers` | test, sonnet, medium | `board.done` | `K:recall-answers.md`, `recall-answers.done` | 0.75 [m, n = 1] | 2.3 |
| 5 | recall scorer `analyse: closing recall scoring` | analyse, opus, high | `recall-answers.done` | `K:recall-test.md`, `K:d9-recall.jsonl`, `recall-score.done` | 4.27 [m, n = 1] | 12.8 |
| 6 | page `build: closing page` (section P) | build, sonnet, medium | `synthesis-fold.done` and `recall-score.done` | `K:page.html`, `page.done` | 1.5 (1-2) [r: ROUTER row 19] | 3.5 |
| 7 | record check `run: closing record check` | run, sonnet, medium | step 6 and section 3's d9 file | `K:check.md`, `check.done` | 1.745 [m: round 3, n = 4] | 4.7 |
| you | the closing helper | orchestrate, opus, high | - | `K:STATE.md`, `RETURN.md`, `DONE.md` | 13.7 (11.5-16.0) [m+c: line 171] | inside L |
| all | | | | | 127.4 (100.1-154.0), 130-143 min [c: COMPLEXITY lines 171-172] | L |

Prompts (fill `<...>`; each ends `No git command that writes. Your limit is <limit> M tokens.`):
- Sample reader: `For each record in C:/research-runs/2026-11-harness-leads/closing/samples/f<n>.txt open the record and
  the place it cites (a paper text or our file, its line plus or minus 3) and judge it: holds, partly (which part),
  fails (why) or no place. Write closing/samples/f<n>-check.md, a row a record (id | judgment | why, at most 25 words |
  the place), then closing/done/sample-f<n>.done. Read nothing else. Return at most five lines: counts by judgment and
  the failing ids.`
- Packet fold: `Read closing/samples/<a>-check.md and <b>-check.md. For each record judged partly, fails or no place,
  open the record and its place and decide: keep (the reader erred), correct, or withdraw. Write closing/fold-<a>-<b>.md
  (id | decision | why | the place) and closing/d9-<a>-<b>.jsonl in the schema of H:library/README.md: for each
  correction or withdrawal one record of kind open, status open, its claim beginning "proposed correction of <id>: "
  then the correction or "withdraw", "see" naming the record, the place in "evidence" (library rule 3: the top
  session decides; never an adjudication, never "supersedes"), ids d9-<j> to d9-<j+9>. Then
  closing/done/fold-<a>-<b>.done. Return at most five lines.` Ranges, by packet in the order above: 0560, 0570, 0580,
  0590.
- Draft board: `Write closing/BOARD-draft.md: a board of this run's records in the form of the table in
  H:library/INDEX.md ("You are about to | Look up | In short"), at most 150 lines, from journal/2026-11-23/*.jsonl and
  closing/d9-*.jsonl, read by grep and ranges, with the folds' proposals applied and marked proposed (a record proposed for
  withdrawal left out, one proposed for correction by its correction); a refuted claim written as what is now true and marked; every id checked to exist.
  Never open closing/recall-questions.md. Then closing/done/board.done. Return at most five lines.`
- Recall answerer: `Answer each question of closing/recall-questions.md using only closing/BOARD-draft.md,
  H:library/README.md, and grep or ranged reads of journal/2026-11-23/ and closing/d9-*.jsonl. For each: the answer,
  the record ids, how sure (sure, partly, not), the words you looked up; "not recorded" where nothing holds it. Write
  closing/recall-answers.md, then closing/done/recall-answers.done. Read nothing else. Return at most three lines.`
- Recall scorer: `Score closing/recall-answers.md against closing/recall-questions.md, the records each answer cites
  and the field reports where a question needs them: sure and right, partly, wrong, or rightly not recorded. Then what
  made answers hard and the three changes to the board or the records that would help most. Write
  closing/recall-test.md, its facts as records in closing/d9-recall.jsonl (ids d9-0150 on; open d9-0550 to d9-0559), then
  closing/done/recall-score.done. Return at most five lines: the counts by class.`
- Synthesis writer, refuter, fold, page: `Read and follow section <S|R|F|P> of
  C:/research-runs/2026-11-harness-leads/briefs/CLOSING.md. Your limit is <limit> M tokens.`
- Record check: `Check every record of C:/research-runs/2026-11-harness-leads/journal/2026-11-23/d9.jsonl: the fields
  and order of H:library/README.md, unique ids in their kind's range, "supersedes" naming a record that exists, and
  the cited place holding the claim (line plus or minus 3). Write closing/check.md (id | holds or fails | why), then
  closing/done/check.done. Return at most five lines: held, failed, the failed ids.`

## 3. Limits, waits, failures
- Before each start: your tokens + the limits of your running helpers + the new limit stays at or under L, else cut
  the new limit to what is left (it goes in the prompt); below its expected, start nothing: "At L" (r57-0614).
- Wait only with `node C:/research-runs/2026-11-harness-leads/tools/wait.mjs closing 150 <done files>` (at most 150
  s); its line is your count. Expect 50-55 waits (COMPLEXITY line 172).
- A helper that returns without its done file, or writes none for 45 minutes: stop it if it runs (TaskStop, if held),
  start it once more; a second failure leaves its step out, named in RETURN.md, and the rest goes on.
- At L: start nothing, let the running helpers finish, commit what is checked, RETURN.md `closing LIMIT <step>`, no
  DONE.md, return. At about 330 K of context: STATE.md, return `closing LIMIT window`.
- The records: when steps 2, 3 and 5 are done, `cat K:d9-*.jsonl` into `RUN:journal/2026-11-23/d9.jsonl` with two
  records of your own (`d9-0280` the run's end: units done, failed, tokens; `d9-0700` a pointer to `K:page.html`),
  then step 7; remove the records it fails.

## 4. Commit and return
Commit (`RUN:CLAUDE.md` rule 7) `closing/` without `closing/work/`, and `journal/2026-11-23/d9.jsonl` once
`check.done` exists. `K:RETURN.md` and your return, the same lines, at most ten: line 1 `closing DONE|LIMIT|FAILED
<one reason>`; line 2 `tokens <x> M of limit <y> M` (`node C:/research-runs/2026-11-harness-leads/tools/tokens.mjs
closing`, once); the page's path; leads by evidence strength; test designs; F1 pooled (plants found with the right
reason, R_same against fresh, on the plants exposed for neither arm, the exposed apart); recall (counts by class, of 14); intake (sampled, failed, withdrawn); d9 records
written and removed; what is open. Order: RETURN.md, the commit, then `K:DONE.md` (`closing done <UTC>`) only on DONE.

## 5. Rules
`RUN:CLAUDE.md` binds. You write only `K:` and `journal/2026-11-23/d9.jsonl`. `RUN:sealed/` is read by sections S
and F only. No question to the owner: what he must decide goes into the synthesis as `approve:` or `cap:` items.

## 6. Fills
Sources in `RUN:briefs/COORDINATOR.md` section R3 (fills 21-23, 31).

## S. The synthesis writer (analyse, Opus, high)
Read: `RUN:sheet/SHEET.md`; each field's final `RUN:fields/<n>-<slug>/f<n>-report.md`, `score.md`, `f1-tokens-same.md`
and `f1-tokens-fresh.md`; `RUN:sealed/f<n>-arms.json` and `RUN:sealed/planted-key.json` (to unblind the scores);
`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` sections 2, 3 and 6. Write `RUN:closing/SYNTHESIS.md`, at most 40 KB:
1. **The map of leads**: per sink of SHEET.md, the leads the fields found: the mechanism; its source with the place;
   the measured effect with its baseline and conditions; evidence strength (replicated, independent, maker's own);
   the strongest form and what it needs (data, compute, card memory); the cost to try it here in tokens, computed;
   the result that would show it does not work for us (DIR section 3). Ranked by r57-0003 (quality, then time,
   memory, tokens). Each lead names its field and the report's place.
2. **The note on the embeddings test's assumptions**: each of DIR section 2's assumptions: what the fields' sources say
   (holds, contradicted, untested), with places.
3. **Two or three test designs**: the question; the strongest form against a like baseline; the scoring defined
   first; the parameters swept; tasks across more than one repository (field 8's testbed plan); n and why; the cost in
   tokens and hours computed from our measurements; what the card does (its part, card memory) and what it would
   install, with source and size, for the owner to decide (DIR section 5 rule 8, section 6 item 3); the result that
   would change what we do next (r57-0033).
4. **His review idea (F1)**, unblinded: per field and pooled over the plants `score.md` marks exposed for neither arm
   (the exposed ones reported apart, never pooled with them), plants found with the right reason by arm (R_same,
   fresh), named with a wrong reason, missed; citation failures; use outside conditions; uncited factual sentences;
   tokens per arm; the scorer's guesses against the arms (blinding failed above 80 %, protocol v2 line 733). What it
   can and cannot show: 7 fields, 21 plants less the exposed, one form, our files only, R2 not run (protocol v2 lines
   737-746).
5. **Not tested and open**: per field; the fields that ended without DONE.
6. **For the owner**: only `approve:` items (a test design with its cap, what it would install with source and size,
   the card's part and the hours) and `cap:` items, each with its numbers.
Every factual sentence cites a report's place or a source; the rest is marked judgment. Then
`RUN:closing/done/synthesis.done`. Return at most five lines.

## R. The synthesis refuter (refute, Opus, high, fresh)
Read `RUN:closing/SYNTHESIS.md` and the places it cites, nothing else. For each claim: holds; wrong (why, the place);
overstated (the source's condition); uncited. Try hardest on the rankings, the test designs' costs and the F1 reading.
Write `RUN:closing/SYNTHESIS-refute.md` (claim | verdict | why | place), then `RUN:closing/done/synthesis-refute.done`.
Return at most five lines: counts by verdict.

## F. The synthesis fold (analyse, Opus, medium)
Read `RUN:closing/SYNTHESIS.md`, `SYNTHESIS-refute.md` and the places in dispute. Rewrite SYNTHESIS.md: a wrong claim
removed or corrected, an overstated one bounded, an uncited one cited or marked judgment; a line per change at the end.
Write its records to `RUN:closing/d9-synthesis.jsonl` (schema of `H:library/README.md`): leads as results (d9-0300
on), test designs as hypotheses (d9-0400 on), the F1 numbers as facts (d9-0100 on), gaps as open (d9-0500 to d9-0549). Then
`RUN:closing/done/synthesis-fold.done`. Return at most five lines.

## P. The page (build, Sonnet, medium)
Read `RUN:closing/SYNTHESIS.md`, `recall-test.md`, the counts of `fold-*.md` and each field's `RETURN.md`. Write
`RUN:closing/page.html`: one self-contained file (inline CSS; no outside script, font or image), light background,
readable at about 1870 px wide; plain professional titles, numbers first, short plain sentences; every lead, test
design, the F1 table, the recall result, the intake counts and what failed: nothing dropped; his `approve:` and `cap:`
items last. Not published (an Artifact is an outside request, H: CLAUDE.md rule 4). Then `RUN:closing/done/page.done`.
Return at most three lines.

## Changes after the review (2026-11-21)
- 9: S.3 and S.6: each test design names what it would install with source and size, the card's part and the hours.
- 10: the packet folds write `open` "proposed correction of <id>" records (a withdrawal too), d9-0560 to d9-0599,
  never an adjudication or "supersedes" (library rule 3); the draft board marks their proposals; the synthesis
  fold's open ids end at d9-0549 and the recall scorer's at d9-0559, so the ranges do not meet.
- 1 (from Part F's fold): S.4 and the return report F1 on the plants `score.md` marks exposed for neither arm, the
  exposed apart, not pooled over all 21.
