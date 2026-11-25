# Brief: improve one whole model design at the points its score names (2026-11-25)

owner: r58-0027 (the model side is run as a real graph of thoughts), with r58-0017 and r58-0021 (the order for the
two hypotheses), r58-0011, r58-0012, r58-0014 (scope and method) and r58-0113 (the rented cards). His words are in
those records and outrank this brief: `bash library/lookup.sh -f <id>` for each.

His earlier instructions on approach, paraphrased by the top session: when sizes of one architecture score the same,
evaluate other formulations, pipelines of specialised parts and graph plus language-model designs, not more sizes;
reach the result with a large model or pipeline first and shrink it afterwards; do not shrink the design to the PC's
card.

## What this is

The model design is being searched as a graph of thoughts. Parts were proposed by separate runs, scored against a
sheet fixed beforehand, the best kept, and four runs combined kept thoughts into whole designs. The design named in
your prompt is one of two left standing. Your prompt carries its score: a level per profile and, in words, what the
design lacks. You write the whole design again, improved at those points, without making any other profile worse.
Your design is scored again by the same sheet. It replaces the design you were given only if on no profile it lacks
more than before and on at least one it lacks less. Otherwise the design you were given stands.

The goal the design serves: one model that answers "which files" for task words, for a change and for an error, and
works on a repository it never trained on. Compute for training: three RTX PRO 6000 cards (taken as 96 GB of memory
each; to be confirmed on the machine) for about eight hours. Where another file says "about four large rented
cards", read this. A smaller form must later run on a 12 GB card. Any pretrained part must have a training cut-off no
later than the test cut-off date of the data.

## Read first, in one message, each in full

1. `docs/program/learning/MECHANISMS-NEURAL.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-DATA.md` the same way.
3. `docs/program/hypotheses/search-model/CRITERIA.md` (the sheet).
4. `docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md` (what was built and measured; facts only).
5. `docs/program/hypotheses/search-model/DATA-CHOICES.md` (what the data gives the model; taken as given).
6. The design named in your prompt, in `docs/program/hypotheses/search-model/thoughts/`.
7. The 24 kept thoughts in the same folder; you may take a piece from any of them:
   A1.a.1.md, A1.b.1.md, A1.c.1.md; A2.a.1.md, A2.a.2.md, A2.b.1.md; A3.c.1.md, A3.c.2.md, A3.a.3.md;
   A4.a.1.md, A4.c.1.md, A4.b.1.md; A5.c.1.md, A5.b.1.md, A5.c.3.md; A6.c.1.md, A6.a.3.md, A6.b.1.md;
   A7.c.1.md, A7.a.2.md, A7.c.3.md; A8.c.1.md, A8.c.2.md, A8.b.3.md.

You may open the records the facts sheet names, to check a fact.

## Do not open

Any other file in `docs/program/hypotheses/search-model/thoughts/` (dropped thoughts, the other designs) and
anything else under `docs/program/hypotheses/` (`GRAPH-PLAN.md`, `COMBINE-ASSIGNMENTS.md`, `scores/`,
`thoughts.jsonl`, `candidates/` and `search-data/` included);
`docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`; `research-tree/build/TOP-REVIEW-STATE.md`; in
`research-tree/build/improve/` the files whose names start with `DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`,
`FAILURE-`, `GRAPH-TRANSFORMER`, `APPROACHES`, and the folder `review-page`. No web. No install, no download, no
training, no run of any pipeline. Write only the file named in your prompt.

## What you write

One file, at the exact path given in your prompt, with ONE Write-tool call that names the full path. At most 3,300
words by a raw count. In this form:

```
# <id of your file>: <a name of at most eight words>
Improves: <the design you were given>.
Parents: <the design you were given>, then every kept thought a new piece is taken from, comma-separated.

## What changed
A numbered list. For each change: what is changed; the profile and the lack, as named in your prompt, that it
answers; the entry or the kept thought it rests on; and why no other profile is lowered by it. Cost counts: say what
the change adds in memory and time and why the design still fits three 96 GB cards for eight hours.
Then: the lacks named in your prompt that you did not answer, each with the reason (it cannot be answered by
argument and waits on a count; or answering it would lower another profile, and which).
```

Then the whole design again, with the same sections as the design you were given: The design, part by part; One
question, end to end; What is trained and what it costs; Against the sheet; Cannot; Refuted if. Text that does not
change is kept as it is: do not reword it. Where a part changes, say so in the part ("Changed in this pass: ...").

## Rules

- Change only what answers a lack named in your prompt. A piece taken from a kept thought names that thought. Add
  no mechanism that is in no kept thought, except what is needed to make the pieces fit; mark it "added".
- A level in "Against the sheet" may rise only where the mechanism now meets the profile's demand; a count that is
  still to be made keeps a profile open.
- Every claim names what it rests on: an entry (`N x.y`, `D x.y`), `record: <path>`, `assumption` (with its
  reasoning) or `count first: <what>`. Cite an entry only for what it says. A published gain is never a reason; no
  "X beat Y"; no sweep over forms or over a library's settings in place of an argument.
- A design that leans on a pretrained model says what it needs from it (what it was trained on, its size class, the
  cut-off rule). It does not name a product chosen by reputation.
- Plain words, short sentences, no filler. Formulas where they make a mechanism exact.

## Budget and hand-back

About 10 tool calls: one message that reads everything, then your file. Your last message: the path of your file,
its parents, and one line per change. Nothing else.
