# f{n} fold (kind analyse, Opus, medium)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`
(read only); `F:` = `RUN:fields/{n}-{slug}/`. Description `analyse: f{n} fold`. From round 3's fold brief
(`H:docs/program/evidence/round3-2026-11-18/t1-brief-4-fold.md`) and `ROUND.md` "Library records" and "Keeping the
library clean" (lines 90-110).

## Read
`F:claims.md`, `F:f{n}-report.md` (the draft), `F:gate.md`, `F:refute.md` (and `F:refute-2.md` if present), the field's row
of FIELD.md (`grep -m1 -F '| f{n} |' RUN:briefs/FIELD.md`), `H:library/README.md` (sections "A record" and "Rules").
Where gate and refuter disagree with the claims, open the cited place yourself. Not the reviews or the score.

## Fold
Every claim gets one verdict: `confirmed` (gate LOCATED or MOVED and refuter CONFIRMED), `holds in part` (refuter
PARTIALLY, or gate ALTERED: use the corrected claim), `refuted` (refuter REFUTED, or gate DEAD_CITATION with no other
place found), `cannot be checked` (UNVERIFIABLE or NOT_CHECKABLE, or no refuter verdict: a claim no refuter reached is
never confirmed, whatever the gate says). A claim not confirmed is never called supported.
Rewrite `F:f{n}-report.md` as final: the answer in at most ten lines; "Counts by verdict"; the leads table with "what the
refuter left" filled; the ranked leads; the embeddings test's assumptions contradicted; our earlier work folded in;
"Not found, not opened". Drop or rewrite every lead that rested on a refuted claim, and say so in one line where it
was. Append "Claim verdicts" to `F:claims.md` (id | verdict | one-line reason).

## Records: `RUN:journal/2026-11-23/{prefix}.jsonl` (new file; you are its only writer; never `H:library/`)
Exactly the schema and field order of `H:library/README.md`; `"by":"{prefix}"`; `"date"`: today's UTC date.
- one `status` record (`{prefix}-0200`): the counts by verdict and each refuted claim with its reason, so it is not
  proposed again (ROUND.md line 104);
- one `result` (status `quoted`) per confirmed or held-in-part published finding the leads rest on, in its narrowed
  form, from `{prefix}-0300`; a maker's own figure says "self-reported";
- one `fact` (status `observed` or `quoted`) per finding about our work, from `{prefix}-0100`;
- one `hypothesis` (status `reasoned`) per lead as ranked, with the sink it acts on, from `{prefix}-0400`;
- one `open` per measurement or test a lead needs, from `{prefix}-0500`; where a finding contradicts a record of
  `H:library` (`bash H:library/lookup.sh <words>`), your record and an `open` whose claim begins "proposed correction
  of <id>". Never supersede another writer's record.
Each record is understood alone; numbers with unit and condition; `evidence` names sources only, written out
(`C:/research-runs/2026-11-harness-leads/papers/f{n}/<short>/paper.txt#line N` or `.../page.txt#line N`, and the
paper's or page's URL); `see` names
records; `handles` gives search words. Check each line parses: `node -e "require('fs').readFileSync(process.argv[1],
'utf8').trim().split('\n').forEach((l,i)=>{try{JSON.parse(l)}catch(e){console.log(i+1,e.message)}})" <file>`.

## Window and finish
After reading, and again after the report, run `node RUN:briefs/field/self.mjs "<your description>"`. At about 330 K
context (`H:research-tree/ORCHESTRATION.md` line 28) finish the file you are on, write `CHECKPOINT: <what is left>` as
the last line of `F:f{n}-report.md`, run the self.mjs command, and write `F:done/fold.checkpoint`, one line `checkpoint
<what is left> | <its line>`, not the done file; return with line 1 `CHECKPOINT <what is left> tokens <x> M`. Your
field helper starts the rest (`analyse: f{n} fold rest`, prompt `rest: <what is left>`): it reads what that work needs
from the files above, does only what is left in the same files (the journal file appended, ids going on), deletes the
CHECKPOINT line, and checkpoints again the same way at about 330 K. Write `F:done/fold.done` last, only when nothing
is left. Limit 15.6 M tokens (a rest: the one in its prompt). Return at most ten lines (line 1 `CHECKPOINT <what is
left> tokens <x> M` at a checkpoint): the paths, the counts by verdict, the record counts by kind, the answer in three
lines.

## Changes after the review (2026-11-21)
- 2: a claim without a refuter verdict is `cannot be checked`; a checkpoint is a file and line 1 of the return, not the
  done file; a rest does what is left.
- 5: evidence may be a raw page's `page.txt`.
