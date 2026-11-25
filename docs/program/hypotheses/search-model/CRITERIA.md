# Model side: the criteria, fixed before any rival design was seen (2026-11-25, 20:01 UTC by the clock)

Standing: step 1 of the process the owner approved (journal r58-0024; his order r58-0017 and r58-0021), for the second
hypothesis: the architectures, the models and the pipeline to train and compare on the rented cards. Written by the
top session when the only model design in existence was its own working notes. It is not changed after candidates are
read. A fault found in it later is recorded as a correction with its reason, and every candidate is judged again.

The goal: one model that answers "which files" for task words, for a change and for an error, and works on a
repository it never trained on. `N x.y` is an entry of `docs/program/learning/MECHANISMS-NEURAL.md`, `D x.y` of
`MECHANISMS-DATA.md`. The data it reads is the data hypothesis, taken as given.

## 1. Eight profiles

Six are the demands of the problem. The last two are the pipeline's own.

| | A model design must | Entries |
|---|---|---|
| M1 | **Make the answer relative to the question.** For each of the three questions it names the mechanism by which a candidate file is described relative to the asked-about thing, and shows that two candidates with the same surroundings can get different scores for different questions. | N 9.4, N 9.7, N 9.8, N 9.10, N 10.5, N 12.7 |
| M2 | **Let multiplicities survive every stage.** How often, how recently and in how large a change must pass through aggregation, attention, normalisation by kind and any sampling. The test: the decayed, size-weighted count of earlier joint changes is a function the design can compute exactly. | N 9.5, N 12.6, N 13.2, N 13.9, N 14.2; D 2.10 |
| M3 | **Use no identities and work in the repository's own scale.** What is trained is coefficients that do not depend on the graph; amounts are relative to the repository; position information stays valid on a new graph; depth and width stay where transfer can be expected. | N 3.1, N 6, N 7.1, N 7.3, N 8.1, N 8.4, N 9.10, N 10.3, N 10.5, N 10.7, N 13.7; D 8.1 |
| M4 | **Read only what was known at the moment of the question.** The computation, the messages and the sampling of neighbours depend on the asking time; time itself is an input. | N 13.9; D 9.1, D 9.4, D 6.2 |
| M5 | **Treat kinds of link as different, with direction,** at a number of parameters that does not grow out of hand with the number of kinds; a scoring rule is chosen for the kinds of relation the data has. | N 2.2, N 13.1, N 13.2, N 13.3, N 13.4, N 13.8 |
| M6 | **Reach beyond history.** Content and structure are inputs; a right file with no path of history to the asked-about thing can still be found, by a direct path or by being retrieved first; nothing is left to long chains of local steps. | N 5.5, N 11.1, N 11.2, N 11.3, N 12.3, N 12.4, N 12.5 |
| M7 | **Be trainable on the whole sample of repositories with the stated compute** (about four large rented cards for about eight hours): memory and time argued from the mechanism; what is sampled inside training is sampled by a known design; the loss ranks the right files against the others; negatives are never real answers; examples are weighted by design. | N 12.1, N 12.2, N 12.3, N 14.1, N 14.2, N 14.3, N 14.4, N 13.6; D 3.2 |
| M8 | **Come with a comparison that can tell something.** The architectures to train side by side differ from each other in one argued decision each; the naive baselines are computed on the same examples; each arm carries a prediction that can fail; results are read per repository and per segment. No sweep over forms or over a library's defaults stands in for an argument. | N 1.1; D 7.2, D 7.3; `CLAUDE.md` rule 9 |

## 2. Levels

As on the data side (`docs/program/hypotheses/search-data/CRITERIA.md`, section 2): by construction; open on a count
or a test the design itself names; in part (which questions, which kinds of right file); not met. Two candidates at a
middle level are compared in words: one is better only if what it lacks is a part of what the other lacks. Levels are
never added, averaged or counted across profiles.

## 3. Vetoes

A component is struck when it does what an entry says cannot work for this goal. What depends on it falls with it,
unless it can be re-based on another candidate's component.

- **W1.** The score of a question and a candidate comes only from two vectors, each computed without reference to the
  other (N 9.4, N 9.8; a position task, N 9.7).
- **W2.** Mean, max or a normalised attention is the only way history is aggregated, so that counts cannot pass
  (N 9.5, N 12.6, N 13.2).
- **W3.** A learned vector or a one-hot code per file or per repository (N 9.10, N 13.7).
- **W4.** A fixed short window of the most recent events is the model's only view of the history (N 14.2; D 2.10;
  record: `research-tree/build/improve/units/T3/report.md`).
- **W5.** Reach to far files is left to stacked local steps alone (N 5.5, N 11.1), or to depth and width beyond what
  transfer allows (N 8.4, N 7.3).
- **W6.** Attention over all pairs of files of a whole repository (N 12.1, N 12.3: "practical only when n is
  sufficiently small"). Allowed over a retrieved set.
- **W7.** Tokens or node features alone with nothing that carries the graph (N 12.6: "we completely lose adjacency
  info").
- **W8.** A scoring rule that provably cannot represent a kind of relation the data has (N 13.8).
- **W9.** Negatives that are real answers (N 13.6); anything fitted or selected on the test period or on held-out
  repositories (D 6.1, D 6.2).
- **W10.** A tree model on raw amounts, for repositories outside the range it saw (D 8.1). Allowed on amounts
  expressed relative to the repository.
- **W11.** Eigenvector positions used with arbitrary signs (N 10.3, N 10.6).
- **W12.** A form chosen because of a published gain, or a design found by a sweep over forms or defaults
  (`CLAUDE.md` rule 9; N 1.1: "a larger class is not better").
- **W13.** The standing rules: the owner's two private repositories and all held-out truth stay on his PC; training
  fits the stated compute; no install or download without his word, named with source and size.

## 4. Comparison and stop rule

The same as on the data side (sections 4 and 5 of its criteria): read each candidate in full with both learning files
open; a level per profile with reason and entries; removal of a whole candidate only by a struck base component or by
another candidate at least as good everywhere and better somewhere; the weakest profile decides an order; merge per
component with constraints passed along the "depends on" links; an entry-by-entry pass over both learning files; at
most three rounds; two designs that cannot be ordered are both kept with the test that separates them, and that test
then belongs in the comparison on the cards.

## 5. What this process cannot do

As on the data side (its section 6). One more limit here: whether a design that meets every profile also scores well
is not decided by argument. The profiles say what a design can represent; the comparison on the cards says what it
learns. So the hypothesis must end in predictions that can fail.
