# Brief: one rival design for the data side (2026-11-25)

owner: r58-0024 (the order: r58-0017 and r58-0021). His words are in those records in full and outrank this brief:
`bash library/lookup.sh -f r58-0017` and `bash library/lookup.sh -f r58-0021`.

## What you make

One whole design for the data that a model will be trained and tested on. The goal: one model that answers "which
files" for task words, for a change and for an error, and works on a repository it never trained on. The design must
say what is wrong with the data we have now, weigh repairing it against starting over, and lay out what to build.

You are one of several separate runs. Each starts from a different starting point, given in your prompt; none sees
another. A judge then holds every design against the criteria and the teaching material and merges the strong parts.
Your design is worth most where it is argued from the material and honest about its own limits.

## Read first, each in full, in this order

1. `docs/program/learning/MECHANISMS-DATA.md` with the Read tool, no offset and no limit.
2. `docs/program/learning/MECHANISMS-NEURAL.md` the same way.
3. `docs/program/hypotheses/search-data/CRITERIA.md` (how your design will be judged).
4. `docs/program/hypotheses/search-data/FACTS-CURRENT-DATA.md` (the data we have; facts only).
5. His words: the two lookups above.

You may open the records the facts sheet names, to check a fact or find more.

## Do not open

Any other file under `docs/program/hypotheses/` (the other runs write there); `docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`;
`research-tree/build/TOP-REVIEW-STATE.md`; in `research-tree/build/improve/`: the files whose names start with
`DATA-`, `ARCHITECTURE`, `reasoning-graph`, `WHY-`, `FAILURE-`, and the folder `review-page`. They hold another
design. Reading one would make your run worthless as an independent one. No web. No install, no download, no run of
any pipeline. Write only your one file.

## Rules of reasoning

- Every choice names what it rests on: entries (`D x.y`, `N x.y`), a record path, or the mark `assumption` (with its
  own reasoning) or `count first: <what is to be counted>`. Cite an entry only for what it says. No published results,
  no "X beat Y".
- Your starting point is where you begin and what you argue hardest for. It is not a conclusion you must reach. Where
  the material forces you off it, say where and why, and follow the material.
- At each component weigh real alternatives, the opposite of your starting point included, and say what each can and
  cannot do for this goal.
- For every choice say what it cannot do.
- Plan for the compute in the facts sheet; do not shrink the design to the PC.
- Plain words, short sentences, no filler.

## The form of your file (fixed, so that designs can be compared part by part)

1. **The design in ten lines.**
2. **What is wrong with the data we have.** Each fault: the fact, the entries.
3. **Repair or rebuild**, with the reason.
4. **Components.** One block for each of these, and any of your own:
   C1 what is stored and in which shape; C2 which repositories, drawn how, how many, which held out; C3 what is taken
   from the code itself; C4 time and leaks; C5 the examples and labels of each of the three questions; C6 how examples
   are drawn and weighted; C7 splits, tests of generalisation, baselines, measures; C8 checks on the data; C9 what is
   handed to a model.
   Each block has these labelled parts: **Choice.** **Depends on.** (other blocks) **Alternatives weighed.** (each
   with why it lost, with entries) **Rests on.** **Cannot.** **Refuted if.**
5. **Your own profile** against P1 to P7 of the criteria: the level you claim and why; your weakest profile named.
6. **Cost.** Downloads (source, rough size), disk, time, what needs the owner's word.
7. **Counts to make first.**
8. **Coverage.** The `D` entries you used; the `D` entries you set aside, one line each with the reason.

Keep it under about 5,000 words.

## Budget and hand-back

About 30 tool calls. Write your file once you have read everything, then improve it. Your last message: the path of
your file, your weakest profile, and the counts you ask for first, in five lines at most.
