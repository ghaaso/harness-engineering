# Brief: write the whole pipeline design from the designs left standing (2026-11-25)

owner: r58-0027 (the model side is run as a real graph of thoughts), with r58-0017 and r58-0021 (the order for the
two hypotheses), r58-0011, r58-0012, r58-0014 (scope and method) and r58-0113 (the rented cards). His words are in
those records and outrank this brief: `bash library/lookup.sh -f <id>` for each.

His earlier instructions on approach, paraphrased by the top session: when sizes of one architecture score the same,
evaluate other formulations, pipelines of specialised parts and graph plus language-model designs, not more sizes;
reach the result with a large model or pipeline first and shrink it afterwards; do not shrink the design to the PC's
card.

## What this is

The model design is being searched as a graph of thoughts. Two whole model designs are left standing. For the two
parts around them, training at scale (A9) and the comparison (A10), separate runs proposed options and two of each
were kept. You are one of two runs that each write ONE whole pipeline design: what is built, how it is trained on the
cards, and how the designs are compared. Your prompt names the kept thought of A9 and the kept thought of A10 you
start from. Your design is scored on all eight profiles (M1 to M8) and against every veto of the sheet; the better
of the two becomes the final thought of the search, from which the hypothesis for the owner is written.

The goal: one model that answers "which files" for task words, for a change and for an error, and works on a
repository it never trained on. Compute for training: three RTX PRO 6000 cards (taken as 96 GB of memory each; to be
confirmed on the machine) for about eight hours. Where another file says "about four large rented cards", read this.
A smaller form must later run on a 12 GB card. Any pretrained part must have a training cut-off no later than the
test cut-off date of the data. Nothing is installed, downloaded, trained or sent to a rented machine without the
owner's word; your design says what he would be asked to allow, named with source and size class.

## Read first, in one message, each in full

1. `docs/program/learning/MECHANISMS-NEURAL.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-DATA.md` the same way.
3. `docs/program/hypotheses/search-model/CRITERIA.md` (the sheet).
4. `docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md` (what was built and measured; facts only).
5. `docs/program/hypotheses/search-model/DATA-CHOICES.md` (what the data gives the model; taken as given).
6. The two designs left standing and the two kept thoughts named in your prompt, in
   `docs/program/hypotheses/search-model/thoughts/`.

You may open the records the facts sheet names, to check a fact.

## Do not open

Any other file in `docs/program/hypotheses/search-model/thoughts/` and anything else under
`docs/program/hypotheses/` (`GRAPH-PLAN.md`, `COMBINE-ASSIGNMENTS.md`, `scores/`, `thoughts.jsonl`, `candidates/`
and `search-data/` included); `docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`;
`research-tree/build/TOP-REVIEW-STATE.md`; in `research-tree/build/improve/` the files whose names start with
`DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`, `FAILURE-`, `GRAPH-TRANSFORMER`, `APPROACHES`, and the folder
`review-page`. No web. No install, no download, no training, no run of any pipeline. Write only the file named in
your prompt.

## What you write

One file, at the exact path given in your prompt, with ONE Write-tool call that names the full path. At most 2,500
words. In this form:

```
# F<n>: <a name of at most eight words>
Parents: <the two designs, the A9 thought and the A10 thought you used, comma-separated; exactly the thoughts used>

## What is built
The architectures to compare: each design left standing in five or six sentences (what is exact, what is learned,
what differs between the two), and what the two share and is built once.

## What is computed once and stored
From the store to what training reads. What runs on processors, what on the cards, what is saved.

## The plan for the three cards, hour by hour
From your A9 thought, fitted to both designs: what is sampled and by which design, memory and time argued from the
mechanism, what is saved and when, what happens if a step runs long. **Changed to fit:** every change you made to
the A9 thought, with its reason.

## The comparison
From your A10 thought, fitted to the plan: the arms trained side by side and the one decision each differs in; the
baselines on the same examples; a prediction per arm that can fail; how results are read (per repository, per
segment). **Changed to fit:** every change you made to the A10 thought, with its reason.

## The smaller form for a 12 GB card
## What must be counted before any run
The counts the designs leave open, in the order they are needed, each with what it decides.
## What the owner is asked to allow
Each download named with source kind and size class; what is sent to the rented machine and what never leaves his PC.
## Against the sheet
For each of M1 to M8: the level you claim (by construction; open on a named count or test; in part; not met) and
the reason, with entries. Then the vetoes (W1 to W13) the pipeline comes nearest to and why it does not fall under
them.
## Cannot
## Refuted if
```

## Rules

- Do not redesign the two models; take them as they are. Where the plan for the cards cannot train both as written,
  say so and say what is cut and why.
- Add no mechanism that is in none of your parents, except what is needed to make them fit; mark it "added".
- The arms must fit the compute together. An arm that cannot be trained in the plan is not an arm.
- Every claim names what it rests on: an entry (`N x.y`, `D x.y`), `record: <path>`, `assumption` (with its
  reasoning) or `count first: <what>`. A published gain is never a reason; no "X beat Y"; no sweep over forms or over
  a library's settings in place of an argument.
- Plain words, short sentences, no filler.

## Budget and hand-back

About 10 tool calls: one message that reads everything, then your file. Your last message: the path of your file,
its parents, and three lines on the design. Nothing else.
