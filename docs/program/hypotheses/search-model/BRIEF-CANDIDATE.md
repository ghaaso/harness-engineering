# Brief: one rival design for the model side (2026-11-25)

owner: r58-0024 (the order: r58-0017 and r58-0021; scope and method: r58-0011, r58-0012, r58-0014). His words are in
those records and outrank this brief: `bash library/lookup.sh -f <id>` for each.

His earlier instructions on approach, paraphrased by the top session: when sizes of one architecture score the same,
evaluate other formulations, pipelines of specialised parts and graph plus language-model designs, not more sizes;
reach the result with a large model or pipeline first and shrink it afterwards; do not shrink the design to the PC's
card.

## What you make

One whole design for the second hypothesis: the architectures, the models and the pipeline to build, train and
compare on about four large rented cards for about eight hours. The goal: one model that answers "which files" for
task words, for a change and for an error, and works on a repository it never trained on. The data it reads is the
data design named in your prompt; take it as given.

You are one of several separate runs. Each starts from a different starting point, given in your prompt; none sees
another. A judge then holds every design against the criteria and the teaching material and merges the strong parts.
Your design is worth most where it is argued from the material and honest about its own limits.

## Read first, each in full, in this order

1. `docs/program/learning/MECHANISMS-NEURAL.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-DATA.md` the same way.
3. `docs/program/hypotheses/search-model/CRITERIA.md` (how your design will be judged).
4. `docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md` (what was built and measured; facts only).
5. The data design named in your prompt.
6. His words: the lookups above.

You may open the records the facts sheet names, to check a fact or find more.

## Do not open

Any other file under `docs/program/hypotheses/` (the other runs write there); `docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`;
`research-tree/build/TOP-REVIEW-STATE.md`; in `research-tree/build/improve/`: the files whose names start with
`DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`, `FAILURE-`, `GRAPH-TRANSFORMER`, `APPROACHES`, and the folder
`review-page`. They hold other designs. Reading one would make your run worthless as an independent one. No web. No
install, no download, no training, no run of any pipeline. Write only your one file.

## Rules of reasoning

- Every choice names what it rests on: entries (`N x.y`, `D x.y`), a record path, or the mark `assumption` (with its
  own reasoning) or `count first: <what is to be counted or tested>`. Cite an entry only for what it says. A published
  gain is never a reason; no "X beat Y"; no sweep over forms or over a library's settings in place of an argument.
- Your starting point is where you begin and what you argue hardest for. It is not a conclusion you must reach. Where
  the material forces you off it, say where and why, and follow the material.
- At each component weigh real alternatives, the opposite of your starting point included, and say what each can and
  cannot represent for this goal, with the counterexample where the material gives one.
- For every choice say what it cannot do.
- Plain words, short sentences, no filler. Formulas where they make a mechanism exact.

## The form of your file (fixed, so that designs can be compared part by part)

1. **The design in ten lines.**
2. **Why the models built so far stalled**, from the facts sheet and the entries.
3. **Components.** One block for each of these, and any of your own:
   A1 what the model reads (inputs per kind of thing, text, amounts, encodings of structure or position);
   A2 how the question enters and how a candidate is described relative to it, for each of the three questions;
   A3 how history is aggregated; A4 kinds of link and direction; A5 time; A6 reach to far files;
   A7 the score, the loss, the negatives, the weights; A8 one model for three questions, or linked parts;
   A9 training at scale: what is sampled, memory, the plan for the cards hour by hour;
   A10 the comparison: which architectures are trained side by side, the one decision each differs in, the baselines,
   and for each arm a prediction that can fail.
   Each block has these labelled parts: **Choice.** **Depends on.** (other blocks) **Alternatives weighed.** (each
   with why it lost, with entries) **Rests on.** **Cannot.** **Refuted if.**
4. **Your own profile** against M1 to M8 of the criteria: the level you claim and why; your weakest profile named.
5. **Cost.** Installs and downloads (source, rough size), card hours, what needs the owner's word.
6. **Counts or small tests to make first.**
7. **Coverage.** The `N` entries you used; the `N` entries you set aside, one line each with the reason.

Keep it under about 6,000 words.

## Budget and hand-back

About 30 tool calls. Write your file once you have read everything, then improve it. Your last message: the path of
your file, your weakest profile, and what you ask to count or test first, in five lines at most.
