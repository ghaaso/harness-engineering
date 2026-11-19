# Brief: refute the top session's decision of rule version 2 (kind refute, Opus, fresh context)

Repository root: the folder you start in. `B:` = `docs/program/evidence/bottleneck-2026-11-18/`, `R:` =
`docs/program/evidence/round3-2026-11-18/`, `D:` = `docs/program/evidence/rule-v2-2026-11-19/`.

## What exists

`R:RULE-V2-DRAFT.md` is the draft of version 2 of a decision rule (how many units of agent work run at once, which
starts next, how several writers share a file, how a tree of sessions is shaped). It was checked twice
(`R:v2-gate.md`, `R:v2-refute.md`) and the checks were folded in. The top session has now decided version 2 in
`D:DECISION-RULE-V2.md`. That file adds to the draft: four changes (its section 2), three standing answers taken from
the record (end of section 2), a position on each contradiction K1 to K20 (section 3), a short form of the rule
(section 4) and a table of what is still open (section 5). Nothing else in it is new. The draft itself is not yours to
re-check: only what the top session added or changed.

## Read

`D:DECISION-RULE-V2.md` in full. Then, to test it: `B:DECISION-RULE.md` (version 1) in full; of the draft, its
section 1, the "Contradictions" table (K1 to K20) and section 5; `R:v2-refute.md`, the section "Contradictions between
lanes" and any row you need. Library records by id with `bash library/lookup.sh -f <id>` (lines are long; this prints
the whole record): r57-0003, r57-0005, r57-0008, r57-0012, r57-0025, r57-0150, r57-0201, r57-0408, r57-0409, r57-0604,
r57-0813, r57-0814, r57-0838, v2-0402, v2-0405, v2-0410. Lane claims and their refuters' lines by grep for the id (A11,
A14, A69, A74, A76, A82 in `R:a1-claims.md`, `R:a1-refute-1.md`, `R:a1-refute-2.md`; W20, W26 in `R:w1-claims.md`,
`R:w1-refute.md`; C90, C114 in `R:t1-claims.md`, `R:t1-refute.md`). The intake rows on the three version 1 records:
`R:intake-corrections-c1-a1.md` rows 19 and 20 (from line 470), `R:intake-corrections-w1-t1.md` from line 96.

## Try to break each of these (a verdict for each: confirmed, holds in part, refuted, cannot be checked)

1. **Change 1, pacing.** (a) Is "for work that already waits, the allowance buys the same units by the reset whether
   spent at once or evenly, and spent at once each unit finishes sooner" true? Look for a case in the lane's own claims
   where it fails: a unit cut off at a limit, an unspent part lost at a reset, the 5-hour period inside the week,
   units of very different size, a redo. (b) Is the further step right: with waiting units of different value the
   answer is their order, and holding starts back gains only for work not yet arrived that is worth more per token?
   (c) Does the decided text misstate A82, A11, A14, A69 or r57-0813? (d) Is "until Q17 and Q09 exist, (c) does
   nothing" consistent with the rest of the draft (the reserve, the reserved share v2-0410, Step 4 point 2)?
2. **Change 2, the model.** Do r57-0005, r57-0025 and r57-0150 say what the file says they say? Does "a unit runs on
   its route's model until Q16" contradict A74 as corrected, version 1 (r57-0409: the cheaper model only where its gap
   was measured small), or the ruling itself? Is it true that no file of the lane, the draft or its refuter names
   these rulings (grep `R:a1-report.md`, `R:a1-claims.md`, `R:RULE-V2-DRAFT.md`, `R:v2-refute.md`, `R:lane-budget.md`)?
3. **Change 3.** Does version 1's width table hold a token row with those words?
4. **Change 4.** Does widening Q33 and narrowing B10 follow from change 1, and does anything else in the draft's
   sections 5 and 6 now disagree with changes 1 and 2 and is not named?
5. **The three standing answers.** Does r57-0008 with r57-0604 support "commit and end" as the form of the second
   stop? Does r57-0012 with W20 support "no owner by default, an owner only as the last rung"? Do R50 and D3-12 (grep
   `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` and `research-tree/FAULTS-AND-FIXES.md`) say what the file
   says, so that a hand-over is the design's answer for a leaf that outgrows its window?
6. **Section 3, row by row.** Against the draft's K table and `R:v2-refute.md`: any figure, attribution or verdict
   stated wrongly; any row whose "Decided" goes past what its "checks" column allows; any place where a company's own
   figure is not marked so.
7. **Sections 1, 4 and 5.** The counts (38 conclusions; 145 statements; 36 measurements by kind) against the draft.
   Any step of section 4 that disagrees with section 2 or 3. Any open point of the draft missing from section 5.
8. **Anything the decision contradicts without saying so**: an owner's ruling on the board (`library/INDEX.md`, "The
   owner's rulings"), or a statement of the draft it leaves standing.

Section 6 of the file (the five statements) was checked by others; leave it.

## Write

One file, `D:decide-refute.md`, at most 90 lines: a table with a row per point above (split 1 into a to d; in 6 and 7
one row per fault found, plus one row "the rest stands"), columns: point, verdict, what fails, evidence as
`path:line` or record id. Then at most ten lines: the worst three faults, and what you could not check.

## Limits

Reading only, plus that one file. No web search, download, install, test or run of a project script; no edit of any
other file; no commit. Judge the file as written; do not rewrite it. Plain words, short sentences.

## Return (eight lines or fewer)

The path; counts by verdict; the worst three faults, one line each.
