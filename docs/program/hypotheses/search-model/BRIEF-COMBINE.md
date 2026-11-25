# Brief: combine the kept thoughts into one whole model design (2026-11-25)

owner: r58-0027 (the model side is run as a real graph of thoughts), with r58-0017 and r58-0021 (the order for the
two hypotheses), r58-0011, r58-0012, r58-0014 (scope and method) and r58-0113 (the rented cards). His words are in
those records and outrank this brief: `bash library/lookup.sh -f <id>` for each.

His earlier instructions on approach, paraphrased by the top session: when sizes of one architecture score the same,
evaluate other formulations, pipelines of specialised parts and graph plus language-model designs, not more sizes;
reach the result with a large model or pipeline first and shrink it afterwards; do not shrink the design to the PC's
card.

## What this is

The model design is being searched as a graph of thoughts. The design was split into parts A1 to A8. For each part
separate runs proposed options, each option was scored against a sheet fixed beforehand, and two or three per part
were kept. You are one of four runs that each combine kept thoughts into ONE whole model. Your prompt fixes your
starting pairing for parts A1 and A2; you choose the rest. Your design is then scored on the profiles M1 to M7 and
against every veto of the sheet, and compared with the other three. The training plan for the cards and the
comparison (parts A9 and A10) come later and are not yours; you do say what your design costs.

The goal the design serves: one model that answers "which files" for task words, for a change and for an error, and
works on a repository it never trained on. Compute for training: three RTX PRO 6000 cards (taken as 96 GB of memory
each; to be confirmed on the machine) for about eight hours. Where another file says "about four large rented
cards", read this. A smaller form must later run on a 12 GB card. Any pretrained part must have a training cut-off no
later than the test cut-off date of the data.

## Read first, in one message, each in full

1. `docs/program/learning/MECHANISMS-NEURAL.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-DATA.md` the same way.
3. `docs/program/hypotheses/search-model/CRITERIA.md` (the sheet your design is scored by).
4. `docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md` (what was built and measured; facts only).
5. `docs/program/hypotheses/search-model/DATA-CHOICES.md` (what the data gives the model; taken as given).
6. The 24 kept thoughts, in `docs/program/hypotheses/search-model/thoughts/`:
   A1.a.1.md, A1.b.1.md, A1.c.1.md (what the model reads);
   A2.a.1.md, A2.a.2.md, A2.b.1.md (how the question enters);
   A3.c.1.md, A3.c.2.md, A3.a.3.md (how history is aggregated);
   A4.a.1.md, A4.c.1.md, A4.b.1.md (kinds of link and direction);
   A5.c.1.md, A5.b.1.md, A5.c.3.md (time);
   A6.c.1.md, A6.a.3.md, A6.b.1.md (reach to far files);
   A7.c.1.md, A7.a.2.md, A7.c.3.md (the score, the loss, the negatives, the weights);
   A8.c.1.md, A8.c.2.md, A8.b.3.md (one model for three questions, or linked parts).

You may open the records the facts sheet names, to check a fact.

## Do not open

Any other file in `docs/program/hypotheses/search-model/thoughts/` (dropped thoughts, other runs' designs) and
anything else under `docs/program/hypotheses/` (`GRAPH-PLAN.md`, `COMBINE-ASSIGNMENTS.md`, `scores/`,
`thoughts.jsonl`, `candidates/` and `search-data/` included);
`docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`; `research-tree/build/TOP-REVIEW-STATE.md`; in
`research-tree/build/improve/` the files whose names start with `DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`,
`FAILURE-`, `GRAPH-TRANSFORMER`, `APPROACHES`, and the folder `review-page`. Reading one makes your run worthless as an
independent one. No web. No install, no download, no training, no run of any pipeline. Write only the file named in
your prompt.

## What you write

One file, at the exact path given in your prompt, with ONE Write-tool call that names the full path. At most 2,200
words. In this form:

```
# C<n>: <a name of at most eight words>
Starting pairing: <the two thoughts fixed by your prompt>.
Parents: <exactly eight ids, one kept thought per part A1 to A8, comma-separated>

## The design, part by part
In the order A1, A2, A3, A4, A5, A6, A7, A8. For each part:
**A<k>, taken from <id>.** What of it is kept, with the formula that makes it exact.
**Changed to fit.** Every change you made so that it fits the parts already chosen, each with its reason (an entry,
or a stated need of another part). A piece that is in no parent is marked "added". "None" if none.

## One question, end to end
From the question to a rank for every file alive, for each of the three questions (a change, task words, an error).
What is computed exactly, what is learned, where each parent acts.

## What is trained and what it costs
The trained parts and their size class. What is computed once. Memory and time argued from the mechanism, for three
96 GB cards and eight hours. What must be counted first. The smaller form for a 12 GB card, in two sentences.

## Against the sheet
For each of M1 to M7: the level you claim (by construction; open on a named count or test; in part; not met) and the
reason, with entries. Then the vetoes (W1 to W13) the design comes nearest to and why it does not fall under them.

## Cannot
What the whole design cannot do, each with its counterexample. Include every "Cannot" of a parent that the
combination did not remove.

## Refuted if
The observations that would show the design wrong, each tied to the decision it tests.
```

## Rules

- Exactly one kept thought per part. Where your fixed pairing makes a kept thought of a later part unusable as
  written, say so and take the one that fits with the fewest changes.
- Add no mechanism that is in no parent, except what is needed to make the parents fit. List each such piece under
  "Changed to fit" and mark it "added".
- Where two parents contradict each other, say so and resolve it by the learning entries, never by preference.
- Every claim names what it rests on: an entry (`N x.y`, `D x.y`), `record: <path>`, `assumption` (with its
  reasoning) or `count first: <what>`. Cite an entry only for what it says. A published gain is never a reason; no
  "X beat Y"; no sweep over forms or over a library's settings in place of an argument.
- A design that leans on a pretrained model says what it needs from it (what it was trained on, its size class, the
  cut-off rule). It does not name a product chosen by reputation.
- Plain words, short sentences, no filler. Formulas where they make a mechanism exact.

## Budget and hand-back

About 10 tool calls: one message that reads everything, then your file. Your last message: the path of your file,
your eight parents, and three lines on the design. Nothing else.
