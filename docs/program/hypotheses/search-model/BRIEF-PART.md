# Brief: one part of the model design, answered with distinct options (2026-11-25)

owner: r58-0027 (the model side is run as a real graph of thoughts), with r58-0017 and r58-0021 (the order for the
two hypotheses) and r58-0011, r58-0012, r58-0014 (scope and method). His words are in those records and outrank this
brief: `bash library/lookup.sh -f <id>` for each.

His earlier instructions on approach, paraphrased by the top session: when sizes of one architecture score the same,
evaluate other formulations, pipelines of specialised parts and graph plus language-model designs, not more sizes;
reach the result with a large model or pipeline first and shrink it afterwards; do not shrink the design to the PC's
card.

## What this is

The model design is being searched as a graph of thoughts. The design is split into ten parts. For each part several
separate runs propose distinct options. Every option is scored against a sheet fixed beforehand. The best are kept
and later combined into whole designs by other runs. You are one run. You answer ONE part, named in your prompt, from
the starting point (your "lens") named in your prompt. You never write a whole design.

The goal the design serves: one model that answers "which files" for task words, for a change and for an error, and
works on a repository it never trained on. Compute for training: about four large rented cards for about eight hours.
A smaller form must later run on a 12 GB card. Any pretrained part must have a training cut-off no later than the
test cut-off date of the data.

## Read first, in one message, each in full

1. `docs/program/learning/MECHANISMS-NEURAL.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-DATA.md` the same way.
3. `docs/program/hypotheses/search-model/CRITERIA.md` (the sheet your options are scored by).
4. `docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md` (what was built and measured; facts only).
5. `docs/program/hypotheses/search-model/DATA-CHOICES.md` (what the data gives the model; taken as given; the reasons
   are in `docs/program/hypotheses/DATA-HYPOTHESIS-2026-11-26.md` if you need one).
6. Any further file your prompt names (thoughts kept for earlier parts, or surviving designs).

You may open the records the facts sheet names, to check a fact.

## Do not open

Anything else under `docs/program/hypotheses/` (other runs write there: `GRAPH-PLAN.md`, `thoughts/`, `candidates/`
and `search-data/` included, except files your prompt names);
`docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`; `research-tree/build/TOP-REVIEW-STATE.md`; in
`research-tree/build/improve/` the files whose names start with `DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`,
`FAILURE-`, `GRAPH-TRANSFORMER`, `APPROACHES`, and the folder `review-page`. Reading one makes your run worthless as an
independent one. No web. No install, no download, no training, no run of any pipeline. Write only the files named in
your prompt.

## The ten parts

| Part | The question it settles |
|---|---|
| A1 | **What the model reads.** For each kind of thing the data hands over (the question's text, diff or error text; a file's content at the asking time; an event with its size and age; a typed, directed link; an amount; the repository's description): the form in which it enters. Which encoder for text and code, and whether it is trained. How amounts are expressed. Which features of structure that do not depend on the question are computed. |
| A2 | **How the question enters, and how a candidate file is described relative to it,** for each of the three questions, so that two candidates with the same surroundings can get different scores for different questions. |
| A3 | **How history is aggregated:** from the events that link the starting files and a candidate (each with its size and age) to what the scorer sees. The test: the decayed, size-weighted count of earlier joint changes is computed exactly. |
| A4 | **Kinds of link and direction.** How the typed, directed links (in the change, named in the text, in the trace, import resolved or unresolved, use, test link by import or by name, folder, change events) are treated, at a number of parameters that stays bounded. What a scoring rule over relations can and cannot represent. |
| A5 | **Time.** How the asking time, ages and order enter the computation. What makes the model read only what was known at the asking time. Whether decay is fixed, learned or both. |
| A6 | **Reach to far files.** How a right file with no path of history to the starting files is found (content, structure, retrieval). Which candidates the scorer sees. How every file alive still gets a rank. |
| A7 | **The score, the loss, the negatives, the weights.** What the model outputs per candidate. The loss that ranks right files above the others (several right files; a new file that belongs somewhere). How negatives are drawn with known probabilities. How examples are weighted. |
| A8 | **One model for three questions, or linked parts.** What is shared and what is per question. How the error question, which has little data, is served. Whether stages (retrieve, then rank) are separate models. How training mixes the questions. |
| A9 | **Training at scale.** What is computed once beforehand. What is sampled, and by which design. Memory and time argued from the mechanism. The plan for the cards hour by hour, and what is saved. How the smaller form for a 12 GB card is obtained. |
| A10 | **The comparison.** Which arms are trained side by side and the one decision each differs in. The baselines on the same examples. A prediction per arm that can fail. How results are read. |

Stay inside your part. Where your option needs something from another part, say so under "Needs from other parts";
do not design that part.

## What you write

Two options for your part. A third only if its mechanism differs from both. Each option is one file, written with
the Write tool at the exact path given in your prompt, at most 500 words, in this form:

```
# <part> option <n>: <a name of at most six words>
Lens: <your lens>.
**Mechanism.** What is computed, exactly. A formula where it makes the mechanism exact.
**Needs from other parts.** What this option assumes the other parts supply.
**Can.** What it can represent or do for this goal. The profiles (M1 to M8) it serves and the level you claim for each.
**Cannot.** What it cannot do, with the counterexample. The veto (W1 to W13) it comes nearest to, and why it does not fall under it.
**Rests on.** Entries (`N x.y`, `D x.y`), `record: <path>`, `assumption` (with its reasoning), `count first: <what>`.
**Refuted if.** The observation that would show it wrong.
```

Option 1 is the strongest answer you can argue from your lens. Option 2 is the strongest answer that departs from
your lens; where the material forces you off your lens, say so and follow the material. Options differ in mechanism,
never in a setting (a size, a rate, a number of layers).

## Rules of reasoning

- Every claim names what it rests on. Cite an entry only for what it says. A published gain is never a reason; no
  "X beat Y"; no sweep over forms or over a library's settings in place of an argument.
- For every option say what it cannot do.
- Plain words, short sentences, no filler. Formulas where they make a mechanism exact.

## Budget and hand-back

About 8 tool calls: one message that reads everything, then your files. Your last message: the paths of your files
and one line on each, five lines at most. Nothing else.
