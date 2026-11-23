# f{n} report writer, then R_same in the same window (kind analyse, Opus, high)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`
(read only); `F:` = `RUN:fields/{n}-{slug}/`. Your description is `analyse: f{n} report`. This file is your whole brief
beside `RUN:CLAUDE.md`. From round 3's analyst brief (`H:docs/program/evidence/round3-2026-11-18/t1-brief-2-analyse.md`),
`ROUND.md` "The report" (lines 81-88) and `H:research-tree/build/COMPLEXITY.md` section 5 step 3.

## Part 1: the report
Read: the five `F:collect-*.md` (with any "## Second attempt"); the field's row of FIELD.md (`grep -m1 -F '| f{n} |'
RUN:briefs/FIELD.md`); `RUN:sheet/SHEET.md` (the sinks, ranked); `H:docs/program/RESEARCH-DIRECTION-2026-11-16.md`
lines 19-44 (the embeddings test's seven assumptions; what counts as a lead) and 63-79 (rules for every lane). When a
claim rests on a paper, open `RUN:papers/f{n}/<short>/paper.txt` (a raw page: `page.txt`) at the cited line and read around it (grep; never the
whole text). Our files only at the lines the `prior` file cites. At the end of claims.md, after the last claim,
under `## Files read`, list every file you opened beyond the five collect files, FIELD.md, SHEET.md and the direction,
one line each: `<path> lines <a>-<b>, <c>-<d>` (the ranges you read).

1. `F:claims.md`: every claim the report rests on, C01, C02, ...: the claim in one sentence; its mark (`proven` =
   quoted from a paper read in full; `measured here`; `observed` in our files; `hypothesis` = reasoned; `summary`,
   never used to decide); the quote; its place (`RUN:papers/f{n}/<short>/paper.txt line N`, `.../page.txt line N`
   or `path:line`). A claim
   about our harness that rests on a paper is two claims: the paper's result (proven) and the transfer (hypothesis,
   with the assumption it needs).
2. `F:f{n}-report.md` (draft), in this order:
   - The answer in at most ten lines.
   - The leads, one table: `| L | mechanism | source (claim ids) | measure and effect (size, baseline) | conditions
     (task, repository size, model) | evidence (replicated / independent / maker's own) | sink of SHEET.md it acts on
     (its id) and the share of it the effect would remove if it carried over (hypothesis) | strongest form needs
     (data, compute, card memory) | cost to try here (tokens, hours, card) | result that would show it does not work
     for us | what the refuter left |` (write "pending" in the last column). A negative result is a row too, with its
     conditions; "not found" is not "does not work" (direction lines 37-44).
   - The leads ranked by expected gain on the sinks, each marked proven / measured here / hypothesis, with the
     measurement or test that would set its numbers and how it behaves from small to very large projects (r57-0028).
   - Which of the embeddings test's seven assumptions the sources contradict, by number, with claim ids, or "none of
     the sources read bears on it".
   - Our earlier work folded in (from the `prior` file): what holds, what the sources contradict, which lens it was
     scored against (direction rule 4).
   - Not found and not opened, with what was searched.
   Rules: no test, measurement or download; a number not in the record is named as a measurement, never guessed;
   laws in ratios before thresholds; say plainly where you are not sure.
3. When both files are complete, write `F:done/report.done`, one line: `claims <count>`. Your field helper then starts
   the gate and the refuter on claims.md: change neither file after this.

## Part 2: R_same, the review in your window (protocol v2 section 11, comparison 2)
1. `node RUN:briefs/field/self.mjs "analyse: f{n} report"`; write its line into `F:f1-tokens-same.md` as `start: <line>`.
2. If the context it prints is 296 K or more (R_same adds up to 72 K; Opus compacts at 368 K: COMPLEXITY.md section 2),
   write `not run: the report ended at <x> K`, then `F:done/same.done`, and return.
3. Else review the files `RUN:planted/INDEX.md` lists for f{n} (read its part for f{n}; the files under `RUN:planted/`)
   from what your window holds. You may reopen a paper text you already read, at a line, to quote it; read nothing
   else new: no web, no other file. Write `F:review-same.md` exactly in the form `F:briefs/review-form.md`.
4. If your context is compacted during the review (a summary of earlier work stands where it was), the window no
   longer holds the field: overwrite `F:review-same.md` (if begun) with the one line `not run: compacted during the review`, then the
   done file, and return.
5. At the end, the same command again; write `end: <line>` into f1-tokens-same.md (R_same's tokens = end less start).
   Then write `F:done/same.done` last.

Limit: the report 16.3 M; R_same its window (it starts only under 296 K); the helper 32.9 M (`RUN:briefs/FIELD.md`
section 3). No other count calls. Return at most ten lines: the paths; claims by mark; the leads (count) and the top
three; R_same run or not (why) with its tokens; your tokens.

## Changes after the review (2026-11-21)
- 1: claims.md ends with `## Files read`, each file opened beyond the inputs with the line ranges read.
- 5: a raw page's `page.txt` is opened and cited like a paper text.
