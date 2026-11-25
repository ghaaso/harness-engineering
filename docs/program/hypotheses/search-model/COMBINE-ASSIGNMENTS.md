# The four combination runs: pivots and pairings

Written by the top session when the selections of all eight model parts existed (the plan, section 6).

**The pivots** are A1 (what the model reads) and A2 (how the question enters): the parts whose kept thoughts differ
most in mechanism. In A1 the model reads a typed graph with frozen text on its nodes (A1.a.1), or a tuned code model
reads text while amounts go round it (A1.b.1), or exact sums over typed paths are computed and a ranker reads them
(A1.c.1). In A2 the question is the root of a propagation (A2.a.1), or an exact record per pair of question and
candidate (A2.a.2), or one joint reading of question and candidate with relation tokens (A2.b.1). Every later part
has to fit whichever of these is chosen.

**The pairings.** Three kept thoughts on each pivot, four runs, every kept thought of the pivots used at least once:

| Run | A1 | A2 | In words |
|---|---|---|---|
| C1 | A1.a.1 | A2.a.1 | the graph spine: a question-rooted propagation on the typed graph |
| C2 | A1.b.1 | A2.b.1 | the language-model spine: a tuned code model reads question and candidate together |
| C3 | A1.c.1 | A2.a.2 | the table spine: everything exact is computed, a ranker reads the pair record |
| C4 | A1.b.1 | A2.a.1 | graph plus language model: the tuned code model's readings inside the question-rooted graph |

Each run chooses one kept thought for each of A3 to A8 and names its eight parents. The brief is `BRIEF-COMBINE.md`.
A run does not see this file, the other runs' designs or any dropped thought.

**Kept thoughts the runs choose from.** A3: c.1, c.2, a.3. A4: a.1, c.1, b.1. A5: c.1, b.1, c.3. A6: c.1, a.3, b.1.
A7: c.1, a.2, c.3. A8: c.1, c.2, b.3.
