# f{n} refuter: first the fresh review, then the refutation (kind refute, Opus, high, fresh context)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `F:` = `RUN:fields/{n}-{slug}/`. Your prompt names your part:
`part 1 of 1`, `part 1 of 2` or `part 2 of 2`, and for two parts the claim ids of yours. Your description is
`refute: f{n} claims part 1` or `... part 2`. From round 3's refuter brief
(`H:docs/program/evidence/round3-2026-11-18/t1-brief-3-refute.md`) and `H:research-tree/build/COMPLEXITY.md` section 5
step 3 (`H:` = `C:/Users/User/Documents/projects/harness-engineering/`).

You see only the claims and their sources. Do not open `F:f{n}-report.md`, any `F:collect-*.md`, `F:review-same.md`,
`F:gate.md` or `F:f1-tokens-same.md`.

## Part A (part 1 only): the fresh review, before anything else
1. Read `F:claims.md` whole: it is your knowledge of the field. Read the files `RUN:planted/INDEX.md` lists for f{n}
   (its part for f{n}; the files under `RUN:planted/`). You may open a claim's cited place in a paper or page text
   (`RUN:papers/f{n}/...`) to quote it; a claim citing a file of ours under `H:` is quoted from `F:claims.md`, and that
   file is never opened in Part A; nothing else, no web.
2. Write `F:review-fresh.md` exactly in the form `F:briefs/review-form.md`.
3. `node RUN:briefs/field/self.mjs "refute: f{n} claims part 1"`; write its line into `F:f1-tokens-fresh.md` (these
   are the fresh review's tokens: it began at your first call). Then write `F:done/fresh.done`; after it, never change
   `F:review-fresh.md` (Part B may open our files).

## Part B: the refutation
Setting: the claims transfer published results to an AI coding agent harness: language-model sessions that read and
change code; every call costs tokens; a unit of work lasts minutes; a rerun is not the same run; a result must hold
across repositories, not on one (`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` lines 9-13, 63-68).

Goal: try to break every claim of your part. Default to refute: a claim stands only if the source says it, under the
conditions stated, and (for a transfer) the assumption it needs holds for coding agents. Attack especially: a figure
used outside its workload, scale, baseline or model; a result on one repository, one benchmark or one model stated as
general; a maker's own figure not marked self-reported; a mechanism whose assumption fails for agents; "no paper does X"
(search titles and authors on the web for one counterexample; never a path, a file name, "harness" or anything about
this machine in a search); a number of ours the cited file does not give.

Sources: the place each claim cites; read around it with grep and ranges, never a whole paper text; you may open
another part of the same paper to find a condition that limits the claim.

Write `F:refute.md` (part 2: `F:refute-2.md`): a header with the counts per verdict; one block per claim: id; verdict
`CONFIRMED` / `PARTIALLY` / `REFUTED` / `UNVERIFIABLE`; the corrected claim (PARTIALLY, REFUTED); the reasoning in at
most four lines with the line you read; for UNVERIFIABLE, what would settle it. Nothing else. No git command that writes.

Window: after every 20 claims run `node RUN:briefs/field/self.mjs "<your description>"`. At about 330 K context
(`H:research-tree/ORCHESTRATION.md` line 28) stop: write what you have, put `CHECKPOINT: first claim not done C<k>` at
the top of your refute file, run the self.mjs command, and write `F:done/refute.checkpoint` (part 2:
`F:done/refute-2.checkpoint`), one line `checkpoint C<k> | <its line>`, not the done file; return with line 1
`CHECKPOINT C<k> tokens <x> M`. Your field helper starts the rest.

## The rest (only when your prompt says `rest from C<k>`)
Your description ends in `rest`. Skip Part A. Read `F:claims.md` from C<k> to the last claim of your part and do Part
B on them. Append your blocks to the same refute file after its last block; then rewrite its header with the counts of
all its blocks and delete the CHECKPOINT line. At about 330 K, checkpoint again as above, from the first claim not done.

Write `F:done/refute.done` last (part 2: `F:done/refute-2.done`), only once every claim of your part has its block.
Limit: part 1 47.7 M (fresh review 22.2, refutation 25.5); part 2 25.5 M (`RUN:briefs/FIELD.md` section 3); a rest:
the one in its prompt. Return at most eight lines (line 1 `CHECKPOINT C<k> tokens <x> M` at a checkpoint): the paths,
the counts per verdict, the ids refuted, the claim whose fall would change the answer most, the fresh review written
or not (part 1).

## Changes after the review (2026-11-21)
- 1: in Part A a claim citing a file of ours under `H:` is quoted from claims.md, never opened; the fresh review is not
  changed after its done file.
- 2: a checkpoint is a file and line 1 of the return, not the done file; a rest goes on from C<k>.
