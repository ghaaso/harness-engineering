# The plan of the search for the model design, written before the first thought

Written 2026-11-25 by the top session. Standing: the owner's order r58-0027 ("run the model as a real graph of
thoughts"); the rule is the last section of `docs/program/RESEARCH-METHOD-RULES-2026-11-25.md`. What the method's
operations can and cannot do: `docs/program/learning/MECHANISMS-REASONING.md` (entries `R x.y`). This file is not
changed after the first thought exists: the check compares its age with theirs. Anything that has to depart from it is
written to `PLAN-DEVIATIONS.md` in this folder, with the time and the reason, and is said to the owner first.

What is searched for: the architectures, the models and the pipeline to build, train and compare on about four large
rented cards for about eight hours, for one model that answers "which files" for task words, for a change and for an
error, and works on a repository it never trained on. The data it reads is the data design
(`../DATA-HYPOTHESIS-2026-11-26.md`), taken as given; it is not yet passed by the owner.

## 1. What of the method is run here, and what cannot be

Run as published: a plan fixed before the run (R 2.1); a split into parts (R 3.1); several thoughts per part from
separate, context-isolated runs (R 4.1); a score for every thought before it is used, intermediate ones included
(R 1.3, R 5.1); keeping the best few (R 6.1); several attempts at combining, each scored (R 7.2); improvement loops
with a stop rule (R 8.3); a new thought replaces what it was made from only if it scores better (R 6.2); the record
of every thought, score and selection (R 2.2).

Not run as published, said to the owner before the start:
- **No exact check.** Three of the paper's four cases score a thought by a program (R 5.2). A design cannot be
  checked so before it is trained. The score here is the top session's reading against the criteria sheet and the
  learning files: levels with reasons and entries. Generator and judge are the same kind of mind (R 5.4).
- **One reading per thought.** Where the paper has only a judgement it asks three times and averages (R 5.3). Here
  each thought is read once, by one reader. What is kept from R 5.3: the qualities are judged separately (eight
  profiles) and none makes up for another (the weakest decides).
- **No comparison with a known right answer at the end** (R 9.1). That is the comparison on the cards, after the
  owner's pass.
- **The judge is not independent.** The top session wrote the criteria sheet, and its own notes of 2026-11-25 enter
  as thoughts that it then scores. They are marked `top session` in the record.
- **The parts constrain each other.** The paper's cases split into parts of one kind that do not (R 3.1). Parts made
  side by side ignore their dependencies (R 3.1, the counterexample). So the parts are generated in waves along the
  dependencies, every thought states what it needs from other parts, and fitting the parts together is the
  combination runs' job. This ordering is this plan's addition, not the paper's.
- The material does not show that the method yields a correct design (R 11). It organises the search and makes it
  inspectable.

## 2. The parts and their dependencies

Level 1, the model: A1 to A8. Level 2, the pipeline around the designs left standing: A9 and A10. The exact question
of each part is in `BRIEF-PART.md`.

| Part | Settles | Depends on | Wave | Profiles it bears on |
|---|---|---|---|---|
| A1 | what the model reads | the data design | 1 | M3, M4, M6, M7 |
| A2 | how the question enters; a candidate relative to it | A1 | 1 | M1, M3, M7 |
| A3 | how history is aggregated | A1, A2 | 1 | M2, M4, M7 |
| A4 | kinds of link and direction | A1 | 1 | M5, M7 |
| A5 | time | A1, A3 | 1 | M4, M2 |
| A6 | reach to far files | A1, A2, A4 | 2 | M6, M7, M1 |
| A7 | score, loss, negatives, weights | A2, A6 | 2 | M7, M2, M5 |
| A8 | one model for three questions, or linked parts | A2, A6, A7 | 2 | M1, M7, M3 |
| A9 | training at scale, the plan for the cards | the designs left standing | 5 | M7 |
| A10 | the comparison | the designs left standing, A9 | 5 | M8 |

Parts of wave 1 are generated without seeing each other. Wave 2 is generated after the selections of wave 1 and reads
the kept thoughts of A1 to A5. A9 and A10 are generated after the model designs are combined, improved and selected,
and read the designs left standing.

## 3. Generating

- **Who.** Per part three separate runs (helpers on Opus, kind "analyse"), named a, b and c. No run sees another
  run's thoughts of the same part. A run answers one part and never writes a whole design.
- **What.** Each run writes two options that differ in mechanism; a third only if it differs from both. One option is
  one thought: one file of at most 500 words in the form of `BRIEF-PART.md`, under `thoughts/`, named
  `<part>.<run>.<n>.md`. So a part gets six to nine thoughts from separate runs.
- **Starting points.** The same request repeated tends to return the same answer (R 4.3), so each run has a different
  lens. Option 1 is argued from the lens, option 2 departs from it.
  - Parts A1 to A7: a = graph first (the model computes on the typed neighbourhood, with the question as a node);
    b = language model first (a large pretrained model of text and code does the main work, the graph enters around or
    inside it); c = exact relational computation first (what can be computed exactly from the store relative to the
    question is computed, and a learned ranker reads it).
  - A8: a = one shared model; b = linked specialists, a pipeline of parts each trained for its job; c = one backbone
    with a small part per question.
  - A9: a = one model trained end to end on all the cards; b = staged (compute and store first what is exact or
    frozen, then train the learned part); c = large first, then shrink (a large form on the cards teaches a small one
    for the 12 GB card).
  - A10: a = a ladder (each arm removes one decision of the fullest design); b = rival designs side by side; c =
    predictions first (start from what would refute each decision and build the arms that can show it).
- **The top session's own notes** (`candidates/S.md`, written 2026-11-25 before any rival design) enter as generated
  thoughts, split by part with the wording unchanged, named `<part>.s.1.md`, recorded `by: top session`.
- **What a run reads:** both learning files in full, `CRITERIA.md`, `FACTS-MODELS-SO-FAR.md`, `DATA-CHOICES.md`,
  `BRIEF-PART.md`, and from wave 2 on the kept thoughts named in its prompt. Not this plan, not other thoughts.

## 4. Scoring

- By the top session, one score record per thought, before the thought is kept, dropped or made a parent.
- The sheet is `CRITERIA.md` (profiles M1 to M8, vetoes W1 to W13), fixed on 2026-11-25 before any rival design.
- A level per profile: `construction` (met by construction), `open` (open on a count or test the thought names),
  `part` (met in part), `not met`, or `-` (the part does not bear on this profile; for a thought of one part most
  profiles are `-`). Levels are never added or averaged. `vetoes` lists each veto the thought falls under with its
  reason; `entries` the learning entries the score rests on; `note` the reason in a sentence or two.
- A whole design (a combination, an improvement, a final) is scored on every profile and against every veto.

## 5. Selecting per part

A thought under a veto is struck. Among the rest the order is by the profiles the part bears on, the weakest level
deciding. Two are kept that differ in mechanism; a third is kept when it differs in mechanism from both and is not
struck. Of two thoughts with the same mechanism the one with fewer unmet points stays. Every dropped thought gets its
reason. If fewer than two remain, what remains is kept with the reason, and one more run is started for that part,
told what was struck and why (R 6.3).

## 6. Combining

- Four separate runs. Each writes one whole model (A1 to A8) from the kept thoughts, taking one kept thought per part
  as its parents, going through the parts in the order of their dependencies, and saying per part which thought it
  took and every change it made to fit the others. At most 2,200 words, `thoughts/C<n>.md`.
- So that the four differ: the two parts whose kept thoughts differ most in mechanism are the pivots; the four runs
  get the four pairings of their kept thoughts as fixed starting points and choose the rest. With three kept thoughts
  on a pivot, the pairings are drawn so that every kept thought of the pivots is used at least once. The pivots and
  the pairings are written to `COMBINE-ASSIGNMENTS.md` when the selections exist.
- Each combination is scored on M1 to M7 and against every veto (M8 belongs to A10).
- **Going back.** A combination struck by a veto on one of its parts returns to that part: one new run rebuilds it
  with the next-best thought of the part (kept ones first, then dropped ones in their order), at most twice per
  combination.
- **Selecting.** Order by the weakest profile. The best two are the designs left standing; three if they cannot be
  ordered (each lacks something the other has), with the test that would separate them.

## 7. Improving

For each design left standing, a separate run is given the design and its score record and improves its weakest
profile without lowering another. It writes the whole design again with a list of what changed, `thoughts/C<n>.r<k>.md`.
It is scored again. The improved design replaces its parent only if no profile is lower and at least one is higher;
otherwise the parent stands (R 6.2). Stop when a pass changes no level, or when no profile is below `open`, or after
three passes (R 8.3).

## 8. The pipeline parts, and the final thought

- A9 and A10: three runs each as in section 3, reading the designs left standing; scored; two kept per part.
- Two separate runs each write the whole pipeline design: the designs left standing as the architectures to compare,
  one kept thought of A9 and one of A10, fitted together; `thoughts/F<n>.md`, at most 2,500 words. Run F1 starts from
  the first kept thought of A9 and of A10, run F2 from the second; each names as parents exactly the thoughts it used.
- Both are scored on all eight profiles and every veto. The better is kept. If one of its profiles is below `open`,
  one improvement pass as in section 7.
- The final record names that thought. The hypothesis is then written by the top session from it, in the form the
  hypothesis gate checks. A change of substance made while writing is itself a thought (an improvement by the top
  session), recorded and scored like any other.

## 9. Records

`thoughts.jsonl` in this folder, appended only through `rec.cjs`: a thought record per file (its time is the file's
last-write time; its writer is the run whose transcript holds the write), a score record per thought, a selection
record per part and for the combinations and the pipeline designs, one final record. The check and the ledger:
`node tools/check-got.mjs docs/program/hypotheses/search-model [--ledger]`. The hypothesis carries the ledger word for
word. A pass in which new thoughts were generated and scored is a round; a re-reading is called a re-reading.

## 10. Budget

- Runs: 24 for A1 to A8, 4 combinations (up to 8 more when going back), up to 9 improvements, 6 for A9 and A10, 2
  pipeline designs and at most 1 improvement of the final: 37 at the least, 54 at the most, about 42 expected.
- Tokens: a part run about 0.5 M (limit 1.5 M); a combination, improvement or pipeline run about 0.9 M (limit 2.5 M).
  Expected about 26 M for the runs, inside the counted cap of 840 M (r58-0022).
- The top session: about 40 calls of its own, kept few and large.
- The meter: 93 % of the week, all models, at 20:47 UTC; the owner's stop line is 95 % (r58-0026). Usage is read
  before every wave. At 94.5 % no further run is started and the owner is told where the search stands.

## 11. What this search cannot do

It cannot prove a design right; it gives the best-argued designs and the predictions that can fail. Its scores are
one reader's judgement (section 1). The runs were given the criteria sheet, so their agreement on what the sheet
demands is not independent evidence; they earn their place by what they add beyond it. The runs are on a different
model from the scorer.
