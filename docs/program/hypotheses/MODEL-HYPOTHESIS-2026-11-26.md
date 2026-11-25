# Model hypothesis: the two models to build, how to train them on the cards, and how to compare them (2026-11-26)

Standing: a hypothesis for the owner to pass or correct (journal r58-0017, r58-0021, r58-0027). Nothing was built,
trained, downloaded or sent anywhere for it. It was reached by a graph of thoughts run in the open; the record of
every thought, score and selection is in the folder named below, and section 2 is the ledger printed from it.
References: `N x.y` is an entry of `docs/program/learning/MECHANISMS-NEURAL.md`, `D x.y` of `MECHANISMS-DATA.md`;
`record:` is a file of our own record; `assumption` and `count first` mark what the material does not settle. In the
ledger, M1 to M8 are the eight profiles of the yardstick and W1 to W13 its vetoes
(`docs/program/hypotheses/search-model/CRITERIA.md`); in sections 3 to 5, M1 to M12 are this document's decisions.
The data it reads is the data hypothesis, taken as given; that one is not yet passed. Compute: three RTX PRO 6000
cards (taken as 96 GB each, to be read from the machine) for about eight hours (journal r58-0113).

Search: docs/program/hypotheses/search-model

## The answer in short

1. **Two models are proposed, to be trained and compared side by side.** Both start from the same groundwork: for
   every file alive at the moment of the question, everything that can be counted exactly is computed, relative to
   the question and on the repository's own scale. They differ in what learns on top of it.
2. **Model A: trees plus a reader.** Boosted trees read the exact record and rank every file. A tuned language model
   then reads the question and each of the top files together, with the record beside it, and corrects the top of
   the list. Each stage is trained on what the stage before it gets wrong.
3. **Model B: a graph rooted at the question.** A linear stage over the same exact columns ranks every file. For the
   top files a small network passes sums along typed, directed links from the question's own files, weighing each
   earlier change by what it was about; the top sixteen also get a joint reading of question and file.
4. **Training.** Everything exact is built before the cards are rented, and the leak tests run on it then. On the
   cards three queues run that never wait for each other: one trains model A whole, one model B whole, the third the
   arms of the comparison.
5. **The comparison.** A floor of untrained baselines on the same questions; each model whole; from each a ladder
   of arms that each remove one decision; one bridge arm that puts B's graph on A's first stage, which is the single
   decision that separates the two. Every arm carries a prediction, named before the run, that can fail.
6. **What this is not.** Nothing here is measured. On the yardstick both models are met by construction on three
   profiles and open on four, and every open point waits on a count or a test that section 6 names. The search
   organised the reasoning and made it inspectable; it does not prove a design right.

## 1. Shortfalls and limits, said first

- **One reader, not independent.** Every thought was read once and scored by the top session, against a yardstick
  the same session wrote. The runs were given that yardstick, so their agreement on what it demands is not
  independent evidence. No exact check exists for a design before it is trained.
- **Departures from the plan** (twelve, each with its time and reason in the list of departures in the search folder):
  the search paused twice at the usage meter; the compute changed from four cards to three by the owner's word;
  most thoughts ran over their word limits and were scored as they stood; in two parts (how the three questions are
  served, and the training plan) every option stood at the same levels, so the selection was made in words; one
  improvement pass was run although the plan's stop rule already held; the choice between the two pipeline designs
  was made in words, and the final thought is a change by the top session, scored by itself.
- **Writers.** The check could confirm from the transcripts who wrote 68 of the 84
  run-written thoughts; 16 are listed as not confirmed (those runs wrote by a shell command that named
  only the file). The top session's own 10 thoughts cannot be confirmed by construction.
- **Two designs built round a large tuned language model were ordered below the two proposed.** Their part for
  reaching far files had no channel for a file tied only by a longer route of links or by similar earlier work. A
  joint reading by a tuned model is inside both proposed models, at the size the compute allows.
- **This file** was put together by a script: the text by the top session, the ledger of section 2 and the table of
  section 9 from the tools' own output, so that they are word for word. The gate's own check was then run on it.

## 2. What was actually done: the ledger printed from the records

Every minimum is met.

### Part `A1`

Generated:

- `A1.s.1` (file `thoughts/A1.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=-, M3=part, M4=not met, M5=-, M6=part, M7=not met, M8=-; vetoes: none; entries: N 7.1; N 13.3; D 8.1; D 6.2
- `A1.b.2` (file `thoughts/A1.b.2.md`), written by run `afbe842dcfaef8aad`: not confirmed
  - scored by `top session`: levels M1=part, M2=-, M3=construction, M4=construction, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 7.1; N 9.8; N 13.9; D 8.1; D 9.2
- `A1.c.1` (file `thoughts/A1.c.1.md`), written by run `a8dfd45817b39a312`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=construction, M6=part, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 13.9; D 8.1; D 9.2; D 9.4
- `A1.c.2` (file `thoughts/A1.c.2.md`), written by run `a8dfd45817b39a312`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=construction, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 8.4; N 9.5; N 9.10; N 11.1; N 13.9; D 9.2; D 9.3
- `A1.c.3` (file `thoughts/A1.c.3.md`), written by run `a8dfd45817b39a312`: confirmed
  - scored by `top session`: levels M1=construction, M2=part, M3=construction, M4=open, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 12.1; N 12.6; N 12.7; N 13.9; D 9.2
- `A1.b.1` (file `thoughts/A1.b.1.md`), written by run `afbe842dcfaef8aad`: not confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=open, M4=open, M5=part, M6=part, M7=open, M8=-; vetoes: none; entries: N 7.1; N 9.10; N 10.4; N 12.5; N 12.7; N 13.3; N 13.9; D 6.2; D 9.4
- `A1.a.2` (file `thoughts/A1.a.2.md`), written by run `a91dec64ec147f1be`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=construction, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.5; N 12.6; N 13.9; D 9.2; D 6.2; D 9.4
- `A1.a.1` (file `thoughts/A1.a.1.md`), written by run `a91dec64ec147f1be`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=part, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 10.3; N 10.4; N 13.3; N 13.9; D 6.2; D 8.1; D 9.4
- `A1.a.3` (file `thoughts/A1.a.3.md`), written by run `a91dec64ec147f1be`: not confirmed
  - scored by `top session`: levels M1=part, M2=-, M3=open, M4=construction, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.9; N 14.2; D 9.3

Selection: kept `A1.a.1`, `A1.b.1`, `A1.c.1`.
Dropped:
- `A1.s.1`: Contained in A1.a.1, which says the same two things and what keeps later content out, the structure features and the events.
- `A1.a.2`: Same mechanism as A1.c.1 for the exact aggregates, with fewer of them; its joint reading of text belongs to A2 and is kept there (A2.a.2).
- `A1.a.3`: Reach only through shared subwords, weaker on M6 than a pretrained encoder; its exact lexical score is a column of A1.c.1. Its one advantage, no encoder cut-off, is noted.
- `A1.b.2`: Same mechanism as the text columns of A1.c.1 (text as relevance amounts from frozen models); cannot learn what relevance means for the task.
- `A1.c.2`: Same mechanism as A1.a.1 with an encoder trained further, which adds an open point on transfer (M3). Its symbol nodes are not in A1.a.1.
- `A1.c.3`: M2 in part: the count reaches the score only as written tokens. A1.b.1 serves the same reader with the amounts kept exact beside it.

### Part `A10`

Generated:

- `A10.s.1` (file `thoughts/A10.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=not met, M8=part; vetoes: none; entries: N 1.1; D 7.2; D 7.3
- `A10.b.2` (file `thoughts/A10.b.2.md`), written by run `a2cf873ed9721fb92`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 9.5; N 13.9; N 14.4; D 6.2; D 7.3
- `A10.b.1` (file `thoughts/A10.b.1.md`), written by run `a2cf873ed9721fb92`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=construction; vetoes: none; entries: N 1.1; N 9.4; N 13.9; D 7.2; D 7.3; D 9.2
- `A10.c.1` (file `thoughts/A10.c.1.md`), written by run `ae824330c3120b2ce`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=construction; vetoes: none; entries: N 1.1; D 3.2; D 6.1; D 7.2; D 7.3
- `A10.c.2` (file `thoughts/A10.c.2.md`), written by run `ae824330c3120b2ce`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 9.4; D 3.2; D 7.2; D 7.3
- `A10.a.1` (file `thoughts/A10.a.1.md`), written by run `a3b22ce394b9be656`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=construction; vetoes: none; entries: N 1.1; D 3.2; D 7.2; D 7.3
- `A10.a.2` (file `thoughts/A10.a.2.md`), written by run `a3b22ce394b9be656`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; D 3.2; D 7.3

Selection: kept `A10.a.1`, `A10.b.1`.
Dropped:
- `A10.s.1`: M8 in part: written before any design existed; one of its arms is in neither design left standing, and it has no hours and no rule for reading results.
- `A10.a.2`: M8 in part: no arm is one decision away from another, and three-way effects hide in single ones. Not in a kept thought: a measured interaction between two decisions that each cost nothing alone.
- `A10.b.2`: M8 in part: credit depends on the order of the stages, and the two designs are never compared as wholes.
- `A10.c.1`: M8 by construction, but neither design is ever trained whole, so the run ends without the model the goal asks for. Not in a kept thought: the same reader with its encoder frozen against fully trained, one card each for equal hours.
- `A10.c.2`: M8 in part: the same ladders as A10.a.1 read upward, without the bridge arm that makes the difference between the two designs one decision.

### Part `A2`

Generated:

- `A2.s.1` (file `thoughts/A2.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=construction, M2=-, M3=construction, M4=-, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.7; N 9.8; N 9.10; N 10.5; N 12.7; N 13.7; N 14.2
- `A2.b.1` (file `thoughts/A2.b.1.md`), written by run `ad0064f3ae79623cf`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=part, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.4; N 9.8; N 12.6; N 12.7; N 13.2; N 13.9; D 6.4
- `A2.b.2` (file `thoughts/A2.b.2.md`), written by run `ad0064f3ae79623cf`: not confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=-, M5=construction, M6=part, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 9.7; N 9.8; N 9.10; N 10.5; N 12.2; N 13.2
- `A2.c.1` (file `thoughts/A2.c.1.md`), written by run `a4ce47edfa395a554`: not confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=construction, M5=part, M6=part, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 9.8; N 9.10; N 13.9; D 8.1; D 9.2; D 9.4
- `A2.a.3` (file `thoughts/A2.a.3.md`), written by run `ad6f387263786faee`: confirmed
  - scored by `top session`: levels M1=construction, M2=part, M3=construction, M4=-, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.5; N 11.3; N 12.3; N 12.6; N 12.7
- `A2.c.2` (file `thoughts/A2.c.2.md`), written by run `a4ce47edfa395a554`: not confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=construction, M5=construction, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.4; N 9.5; N 9.7; N 9.8; N 9.10; N 13.2; N 14.2
- `A2.c.3` (file `thoughts/A2.c.3.md`), written by run `a4ce47edfa395a554`: not confirmed
  - scored by `top session`: levels M1=construction, M2=part, M3=construction, M4=open, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.8; N 12.5; N 12.6; N 12.7; D 6.1
- `A2.a.1` (file `thoughts/A2.a.1.md`), written by run `ad6f387263786faee`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 5.4; N 9.4; N 9.5; N 9.8; N 9.10; N 10.5; N 11.3
- `A2.a.2` (file `thoughts/A2.a.2.md`), written by run `ad6f387263786faee`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 13.9; D 4.3; D 9.2; D 9.4

Selection: kept `A2.a.1`, `A2.a.2`, `A2.b.1`.
Dropped:
- `A2.s.1`: Names two mechanisms without their form; A2.a.1 states the first exactly, A2.a.3 the second.
- `A2.a.3`: M2 in part: counts reach a candidate's score only through a normalised attention weight (N 9.5, N 12.6). Three other mechanisms are kept, the limit of the plan. What it adds, candidates described relative to each other, is a matter of the scoring form (A7).
- `A2.b.2`: Same mechanism as A2.a.1; on the text side M1 only in part (one similarity of two vectors computed apart, N 9.8), where A2.a.1 reads question and content jointly. Its rank for every file alive at the cost of sparse passes is noted for A6.
- `A2.c.1`: Same mechanism as A2.a.2; on the text side M1 only in part (N 9.8). Its soft starting files for task words are not in A2.a.2.
- `A2.c.2`: Same mechanism as A2.a.1; M1 only in part: where the question names no file nothing marks the graph, and the text reaches a candidate only through a final pairing of two vectors.
- `A2.c.3`: Same mechanism as A2.b.1 with the facts in words: M2 in part, where A2.b.1 carries the exact amounts on a linear path.

### Part `A3`

Generated:

- `A3.s.1` (file `thoughts/A3.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=not met, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.3; N 9.5; N 10.4; N 10.5; N 12.6; N 14.2; N 14.4; D 2.10
- `A3.c.1` (file `thoughts/A3.c.1.md`), written by run `a06a237984f0763e8`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=part, M6=-, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 13.9; N 14.4; D 6.2; D 7.5; D 8.1; D 9.2; D 9.4
- `A3.c.2` (file `thoughts/A3.c.2.md`), written by run `a06a237984f0763e8`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=part, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.9; N 14.2; D 3.2; D 9.2; D 9.3
- `A3.b.2` (file `thoughts/A3.b.2.md`), written by run `ae86a4ad31a276805`: not confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=open, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.2; N 13.9; D 3.2; D 9.2; D 9.4
- `A3.b.1` (file `thoughts/A3.b.1.md`), written by run `ae86a4ad31a276805`: not confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 12.6; N 13.2; N 14.4; D 3.2; D 9.2; D 9.4
- `A3.a.1` (file `thoughts/A3.a.1.md`), written by run `a1ff8ea08ba814933`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 13.2; N 13.9; D 2.10; D 9.3; D 9.4
- `A3.a.2` (file `thoughts/A3.a.2.md`), written by run `a1ff8ea08ba814933`: confirmed
  - scored by `top session`: levels M1=-, M2=open, M3=construction, M4=construction, M5=-, M6=-, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 14.4; D 6.2; D 7.5; D 9.2; D 9.4
- `A3.a.3` (file `thoughts/A3.a.3.md`), written by run `a1ff8ea08ba814933`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=open, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.3; N 9.5; N 12.6; N 13.9; D 6.2

Selection: kept `A3.c.1`, `A3.c.2`, `A3.a.3`.
Dropped:
- `A3.s.1`: Contained in A3.c.1 and A3.c.2, which also say what keeps later facts out and how very many events are sampled.
- `A3.a.1`: Same mechanism as A3.c.2 (a learned sum through event nodes); weighs an event only by kind and flags and has no design for pairs with very many events.
- `A3.a.2`: Same mechanism as A3.c.1 with fewer statistics: one clock, no order, no second step; exact only on its grid (M2 open).
- `A3.b.1`: Its sums are the mechanism of A3.c.1; its text list of the heaviest events is a short view beside them. Weighing events by what they were about, relative to the question, is done without losing counts by A3.a.3.
- `A3.b.2`: Same mechanism as A3.c.2 without the sampling design for very many events (M7 open with no way named).

### Part `A4`

Generated:

- `A4.s.1` (file `thoughts/A4.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=part, M6=-, M7=not met, M8=-; vetoes: none; entries: N 2.2; N 13.1; N 13.2; N 13.3
- `A4.b.1` (file `thoughts/A4.b.1.md`), written by run `a24f048e355c8afe8`: not confirmed
  - scored by `top session`: levels M1=construction, M2=-, M3=construction, M4=-, M5=open, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.4; N 9.8; N 12.7; N 13.1; N 13.7; N 13.8
- `A4.b.2` (file `thoughts/A4.b.2.md`), written by run `a24f048e355c8afe8`: not confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 13.2; N 13.3; N 13.8
- `A4.b.3` (file `thoughts/A4.b.3.md`), written by run `a24f048e355c8afe8`: not confirmed
  - scored by `top session`: levels M1=construction, M2=part, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 12.3; N 12.6; N 12.7; N 13.4
- `A4.a.1` (file `thoughts/A4.a.1.md`), written by run `a03a63bb1bc6c7eb1`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 2.2; N 9.4; N 9.5; N 9.10; N 13.2; N 13.3; N 13.8; N 14.2; D 2.9
- `A4.a.2` (file `thoughts/A4.a.2.md`), written by run `a03a63bb1bc6c7eb1`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 2.3; N 9.5; N 9.10; N 13.8; N 14.4; D 4.3; D 8.1; D 9.2
- `A4.c.2` (file `thoughts/A4.c.2.md`), written by run `a21e217bbfabfa6e7`: not confirmed
  - scored by `top session`: levels M1=construction, M2=open, M3=construction, M4=-, M5=construction, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.5; N 9.10; N 11.1; N 13.2; N 13.3; N 13.9; N 14.2; D 2.10
- `A4.c.1` (file `thoughts/A4.c.1.md`), written by run `a21e217bbfabfa6e7`: not confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=construction, M6=part, M7=construction, M8=-; vetoes: none; entries: N 2.3; N 9.5; N 13.1; N 13.8; N 13.9; D 9.2

Selection: kept `A4.a.1`, `A4.c.1`, `A4.b.1`.
Dropped:
- `A4.s.1`: Contained in A4.a.1, which bounds the parameters by shared bases (N 13.2).
- `A4.a.2`: Same mechanism as A4.c.1, which also discounts paths through hubs and fixes the number of path types.
- `A4.b.2`: Same mechanism as A4.a.1 without the gate on an edge's own amounts.
- `A4.b.3`: M2 in part: the softmax loses counts, and a pair with no link is described by one shortest path of many (N 9.5, N 12.6).
- `A4.c.2`: Same mechanism as A4.a.1 with the exact count left open on a test. Its degree-per-kind input for hubs is not in A4.a.1.

### Part `A5`

Generated:

- `A5.s.1` (file `thoughts/A5.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=part, M3=-, M4=part, M5=-, M6=-, M7=-, M8=-; vetoes: none; entries: N 13.9
- `A5.a.1` (file `thoughts/A5.a.1.md`), written by run `a990c642cc079f2d8`: not confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=part, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.9; N 14.2; D 2.10; D 6.2; D 9.1; D 9.4
- `A5.a.2` (file `thoughts/A5.a.2.md`), written by run `a990c642cc079f2d8`: not confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.9; N 14.4; D 4.3; D 6.2; D 9.2; D 9.4
- `A5.b.1` (file `thoughts/A5.b.1.md`), written by run `ac3e5e86140e266d1`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=open, M5=-, M6=-, M7=-, M8=-; vetoes: none; entries: N 9.5; N 12.6; N 13.9; D 6.1; D 6.2; D 7.1; D 7.4; D 8.1; D 9.1; D 9.4
- `A5.b.2` (file `thoughts/A5.b.2.md`), written by run `ac3e5e86140e266d1`: confirmed
  - scored by `top session`: levels M1=-, M2=open, M3=construction, M4=construction, M5=-, M6=-, M7=-, M8=-; vetoes: none; entries: N 3.1; N 9.5; N 13.9; D 2.10; D 3.2; D 9.4
- `A5.c.1` (file `thoughts/A5.c.1.md`), written by run `af1c0ea3c579efa61`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=construction, M8=-; vetoes: none; entries: N 9.5; N 13.9; D 4.4; D 6.2; D 6.4; D 7.5; D 8.1; D 9.1; D 9.4
- `A5.c.2` (file `thoughts/A5.c.2.md`), written by run `af1c0ea3c579efa61`: confirmed
  - scored by `top session`: levels M1=-, M2=open, M3=open, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 12.6; N 13.9; N 14.2; D 3.2; D 8.1; D 9.4
- `A5.c.3` (file `thoughts/A5.c.3.md`), written by run `af1c0ea3c579efa61`: confirmed
  - scored by `top session`: levels M1=-, M2=open, M3=construction, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; D 3.2; D 6.4; D 7.4; D 9.1

Selection: kept `A5.c.1`, `A5.b.1`, `A5.c.3`.
Dropped:
- `A5.s.1`: An age embedding alone: M2 and M4 in part. Contained in A5.c.1 and A3.c.2.
- `A5.a.1`: Same mechanism as A5.c.1 (a fixed bank of decays on the repository's clocks, the mix learned), placed inside messages; its three locks give the same guarantee as A5.c.1's single access path.
- `A5.a.2`: Same mechanism as A5.c.1 computed by replay, on one clock and without the activity and order columns.
- `A5.b.2`: A learned time function inside summed messages with the fixed decays kept: the mechanism of the kept A3.c.2. M2 exact only in expectation where events are sampled.
- `A5.c.2`: Same as A5.b.2; M3 open: the learned part has no constraint at ages beyond those seen in training (D 8.1).

### Part `A6`

Generated:

- `A6.s.1` (file `thoughts/A6.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=-, M3=part, M4=-, M5=-, M6=part, M7=not met, M8=-; vetoes: none; entries: N 8.4; N 11.3; N 12.4
- `A6.a.1` (file `thoughts/A6.a.1.md`), written by run `a8a36f223a15423ca`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=construction, M7=construction, M8=-; vetoes: none; entries: N 2.3; N 9.8; N 11.3; N 12.5; N 14.4; D 2.8; D 2.9; D 9.4
- `A6.b.1` (file `thoughts/A6.b.1.md`), written by run `a4c178c4ce755671e`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=open, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.4; N 9.8; N 11.3; N 12.1; N 12.5; N 13.9; D 3.2; D 6.2
- `A6.c.1` (file `thoughts/A6.c.1.md`), written by run `a506687f72e89752f`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=construction, M7=construction, M8=-; vetoes: none; entries: N 2.3; N 9.5; N 10.5; N 11.3; N 14.2; N 14.4; D 2.8; D 2.9; D 9.4
- `A6.b.2` (file `thoughts/A6.b.2.md`), written by run `a4c178c4ce755671e`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=construction, M5=-, M6=open, M7=open, M8=-; vetoes: none; entries: N 2.3; N 10.5; N 11.1; N 14.2; N 14.4; D 2.8; D 2.9
- `A6.c.2` (file `thoughts/A6.c.2.md`), written by run `a506687f72e89752f`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=-, M5=-, M6=open, M7=open, M8=-; vetoes: none; entries: N 8.4; N 9.5; N 11.1; N 11.3; N 12.4; N 12.7
- `A6.a.2` (file `thoughts/A6.a.2.md`), written by run `a8a36f223a15423ca`: confirmed
  - scored by `top session`: levels M1=construction, M2=-, M3=open, M4=construction, M5=-, M6=part, M7=open, M8=-; vetoes: none; entries: N 9.8; N 12.5; D 2.8; D 6.2; D 6.4
- `A6.a.3` (file `thoughts/A6.a.3.md`), written by run `a8a36f223a15423ca`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=open, M7=construction, M8=-; vetoes: none; entries: N 5.4; N 9.5; N 11.2; N 11.3; N 12.4; D 9.4
- `A6.b.3` (file `thoughts/A6.b.3.md`), written by run `a4c178c4ce755671e`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=open, M5=-, M6=open, M7=open, M8=-; vetoes: none; entries: N 9.4; N 9.5; N 11.3; N 12.4; N 12.5; N 12.7; N 13.9

Selection: kept `A6.c.1`, `A6.a.3`, `A6.b.1`.
Dropped:
- `A6.s.1`: Names retrieval and attention without their form; A6.c.1 and A6.b.1 state them.
- `A6.a.1`: Same mechanism as A6.c.1 (restart walks from the question's files per relation group with the degree bias removed, content channels, a first-stage ranker for every file, the top set read jointly). A6.c.1 adds the hop distance, the echo through similar past units and the new-file entries. Not in A6.c.1: the candidate set as the union of each channel's top files.
- `A6.a.2`: Same mechanism as A6.b.1 (reach by content, structure only within two hops), with M7 open on the storage of a token-level index and M3 open on a tuned encoder's transfer. Its token-level matching is not in A6.b.1.
- `A6.b.2`: Same mechanism as A6.c.1; M1 in part: the question enters only through seeds found by text search, with no direct content path from the question to a file.
- `A6.b.3`: Same mechanism as A6.a.3 (a probability for every file by descent of the folder tree) with a language-model pass per folder: M7 open, and a beam that drops a folder leaves its files a coarse rank. Its joint reading of the question with each folder's listing is in A6.a.3 only at the top levels.
- `A6.c.2`: Same route as A6.a.3 (the folder tree as the hierarchy) by a learned attention over folder tokens: M3 open (layout conventions may not carry over, N 8.4) and M7 open; above a stated number of folders it brings a cut back.

### Part `A7`

Generated:

- `A7.s.1` (file `thoughts/A7.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=-, M7=part, M8=-; vetoes: none; entries: N 13.6; D 3.2
- `A7.b.1` (file `thoughts/A7.b.1.md`), written by run `aa44809cb23179a7e`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 13.6; N 13.9; N 14.2; D 2.9; D 2.10; D 3.2
- `A7.b.2` (file `thoughts/A7.b.2.md`), written by run `aa44809cb23179a7e`: confirmed
  - scored by `top session`: levels M1=part, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 1.1; N 13.9; D 3.2; D 6.4; D 8.1; D 9.2
- `A7.a.1` (file `thoughts/A7.a.1.md`), written by run `a4386f9662916a280`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=construction, M8=-; vetoes: none; entries: N 5.4; N 9.5; N 13.5; N 13.6; D 3.2
- `A7.a.2` (file `thoughts/A7.a.2.md`), written by run `a4386f9662916a280`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=construction, M8=-; vetoes: none; entries: N 13.6; N 13.9; D 3.2; D 8.1; D 9.2
- `A7.a.3` (file `thoughts/A7.a.3.md`), written by run `a4386f9662916a280`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 13.6; D 2.9; D 3.2; D 7.4
- `A7.b.3` (file `thoughts/A7.b.3.md`), written by run `aa44809cb23179a7e`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=part, M4=-, M5=construction, M6=-, M7=open, M8=-; vetoes: none; entries: N 13.6; N 14.2; D 2.9; D 3.2; D 7.3
- `A7.c.1` (file `thoughts/A7.c.1.md`), written by run `a06a8c15cdae07ca3`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=construction, M6=part, M7=construction, M8=part; vetoes: none; entries: N 9.5; N 13.6; D 3.2; D 6.2; D 7.2; D 8.1
- `A7.c.2` (file `thoughts/A7.c.2.md`), written by run `a06a8c15cdae07ca3`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=-, M4=-, M5=construction, M6=part, M7=open, M8=part; vetoes: none; entries: N 9.4; N 9.8; N 12.7; N 13.6; N 13.9; D 3.2; D 6.2
- `A7.c.3` (file `thoughts/A7.c.3.md`), written by run `a06a8c15cdae07ca3`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=construction, M6=-, M7=open, M8=part; vetoes: none; entries: N 13.6; D 3.2; D 6.2; D 6.4; D 8.1

Selection: kept `A7.c.1`, `A7.a.2`, `A7.c.3`.
Dropped:
- `A7.s.1`: Names the properties of the loss without its form; A7.c.1 states it.
- `A7.a.1`: Same mechanism as A7.c.1 (each right file against wrong files only, far negatives with known probabilities, corrected). A7.c.1 keeps the baseline of every kind of question as an offset, takes the related candidates whole and gives the slots features. Not in A7.c.1: the exact-count term held non-negative; slots as virtual nodes of a graph.
- `A7.b.1`: Same mechanism as A7.c.1; M7 open on tuned passes per question. Not in A7.c.1: every right file of the same unit of work kept out of the negatives; a list of their own for the new-file slots.
- `A7.a.3`: Same mechanism as A7.c.3 (a calibrated probability, an unbiased weighted cross-entropy, a base rate computed from the repository's own past). A7.c.3 takes the related candidates whole, which lowers the variance A7.a.3 names.
- `A7.b.3`: Same mechanism as A7.c.3; M3 in part: its base rate follows only the number of files, through a learned coefficient.
- `A7.b.2`: Same loss as A7.a.2 (pairs weighted by the change in the measure); M7 open: each stage is trained on half of the training repositories. Its point, a learned score fitted on other repositories than the ranker that reads it, is a matter of A8 and is kept there (A8.b.3, A8.c.2).
- `A7.c.2`: Same loss as A7.a.2 on a reader trained by gradient; M7 open: the loss is conditional on the retrieved set and has no known total. Its residual on a frozen first score is kept in A8.b.3. Not in a kept thought: negatives drawn from the files the first stage confuses, with known probability.

### Part `A8`

Generated:

- `A8.s.1` (file `thoughts/A8.s.1.md`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=part, M2=-, M3=-, M4=-, M5=-, M6=-, M7=not met, M8=-; vetoes: none; entries: D 7.4; N 5.2
- `A8.a.1` (file `thoughts/A8.a.1.md`), written by run `a211426b14bcbfebe`: confirmed
  - scored by `top session`: levels M1=construction, M2=-, M3=construction, M4=-, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 1.1; N 5.2; N 8.4; N 13.1; N 13.2; D 3.2; D 7.4
- `A8.c.1` (file `thoughts/A8.c.1.md`), written by run `a190eac6adcaece40`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=-, M6=part, M7=open, M8=part; vetoes: none; entries: N 5.2; N 8.4; N 9.10; N 13.2; D 6.4; D 7.4
- `A8.a.2` (file `thoughts/A8.a.2.md`), written by run `a211426b14bcbfebe`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 13.9; D 3.2; D 7.4; D 8.1; D 9.2
- `A8.c.2` (file `thoughts/A8.c.2.md`), written by run `a190eac6adcaece40`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 5.2; N 9.4; N 9.8; D 3.2; D 6.2; D 6.4
- `A8.b.1` (file `thoughts/A8.b.1.md`), written by run `a3223fc564755169e`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=part, M7=open, M8=construction; vetoes: none; entries: N 5.2; N 9.4; N 9.5; N 13.9; D 3.2; D 4.3; D 6.1; D 6.4; D 9.2
- `A8.a.3` (file `thoughts/A8.a.3.md`), written by run `a211426b14bcbfebe`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 9.5; N 9.10; N 13.9; D 7.4; D 9.2
- `A8.b.2` (file `thoughts/A8.b.2.md`), written by run `a3223fc564755169e`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=construction, M5=-, M6=part, M7=open, M8=part; vetoes: none; entries: N 5.2; N 9.5; N 9.10; N 13.2; N 13.9; D 9.2; D 9.4
- `A8.b.3` (file `thoughts/A8.b.3.md`), written by run `a3223fc564755169e`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=construction, M4=-, M5=-, M6=part, M7=open, M8=construction; vetoes: none; entries: N 5.4; N 9.5; N 13.9; D 3.2; D 6.4; D 7.2; D 9.2

Selection: kept `A8.c.1`, `A8.c.2`, `A8.b.3`. Why only one: Every run-written thought of A8 is at the same levels on the profiles the part bears on (M1 and M3 by construction, M7 open on the count of joint readings, which belongs to A9), so the order is in words. Three ways of serving the three questions are kept, one per mechanism: one shared model with a small part per question (A8.c.1), a separate ranker per question (A8.c.2), parts by kind of evidence trained in stages (A8.b.3).
Dropped:
- `A8.s.1`: An encoder per kind of question leaves the error question to train its own from few examples (D 7.4); nothing on stages or on how training mixes the questions.
- `A8.a.1`: Same mechanism as A8.c.1 with the part per question at zero: everything shared, the kind an input. A8.c.1 contains it as its limit and says what a kind with more data may add. Not in A8.c.1: retrieve and rank as one model run twice, the joint reader masked in the first pass.
- `A8.a.2`: Same mechanism as A8.c.1 (a pooled base and a residual per kind pulled to zero) in trees; a regularity learned on one kind reaches another only through the base ranker's splits.
- `A8.a.3`: One shared scorer, as A8.c.1; its part per kind is the step that turns a question into weighted starting files. Not in a kept thought: weighted seeds, with soft seeds from text search for task words and a depth curve for trace frames. Its limit: a right file tied to no seed rests on the reader alone.
- `A8.b.1`: Same class as A8.b.3 (parts by kind of evidence, trained apart, joined on scores from fits that did not see the example). It lacks more: every specialist is fitted on half of the training clusters, and the combiner sees only scalars (D 9.2, D 4.3). Not in A8.b.3: a combiner per kind of question.
- `A8.b.2`: Same mechanism as A8.a.1. Not in a kept thought: kinds drawn in proportion to the square root of their counts.

### Part `A9`

Generated:

- `A9.a.1` (file `thoughts/A9.a.1.md`), written by run `a011eaa2f6a876989`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=open, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 14.1; N 14.2; N 14.3; N 14.4; D 2.9; D 3.2; D 6.4; D 9.4
- `A9.c.3` (file `thoughts/A9.c.3.md`), written by run `a047a2a3da033eaaf`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=part, M7=open, M8=part; vetoes: none; entries: N 1.1; D 6.4
- `A9.a.2` (file `thoughts/A9.a.2.md`), written by run `a011eaa2f6a876989`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=construction, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 14.2; N 14.3; N 14.4; D 2.9; D 3.2; D 6.4; D 9.4
- `A9.c.1` (file `thoughts/A9.c.1.md`), written by run `a047a2a3da033eaaf`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=construction, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 8.4; N 13.6; N 14.1; N 14.2; D 3.2; D 6.2; D 6.4
- `A9.c.2` (file `thoughts/A9.c.2.md`), written by run `a047a2a3da033eaaf`: confirmed
  - scored by `top session`: levels M1=-, M2=-, M3=-, M4=-, M5=-, M6=part, M7=open, M8=construction; vetoes: none; entries: N 1.1; N 8.4; N 14.2; D 3.2; D 6.2; D 7.3
- `A9.b.1` (file `thoughts/A9.b.1.md`), written by run `ac10b5dece832967a`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=construction, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 14.2; N 14.4; D 2.10; D 3.2; D 6.4; D 9.4
- `A9.b.2` (file `thoughts/A9.b.2.md`), written by run `ac10b5dece832967a`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=open, M5=-, M6=-, M7=open, M8=-; vetoes: none; entries: N 9.5; N 14.2; N 14.3; D 2.9; D 2.10; D 6.4; D 9.4
- `A9.b.3` (file `thoughts/A9.b.3.md`), written by run `ac10b5dece832967a`: confirmed
  - scored by `top session`: levels M1=-, M2=construction, M3=-, M4=construction, M5=-, M6=-, M7=open, M8=part; vetoes: none; entries: N 1.1; N 14.4; D 6.4; D 9.4

Selection: kept `A9.a.2`, `A9.b.3`. Why only one: Every thought of A9 is open on M7 (step times, rows and tokens wait on counts), so the order is in words: which plan lets both designs, the baselines and the comparison's arms fit three cards for eight hours by its own count. Two mechanisms do: rows built once and stages trained apart (A9.a.2), and one reader shared by both designs (A9.b.3).
Dropped:
- `A9.a.1`: Training each design as one job across all cards leaves under an hour for the comparison's arms and cuts the second design's reader by two fifths; trees cannot join a joint step; one fault stops all three cards. Not in a kept thought: columns recomputed on the card behind a time mask, so nothing per pair is stored.
- `A9.b.1`: Same mechanism as A9.a.2. It lacks more: the first design's reader and propagation are also trained apart, and about 275 GB go to the rented machine. Not in A9.a.2: a watchdog per job.
- `A9.b.2`: It trains the first design as written but puts the second design's trees on one card and leaves no hour for the comparison's arms; its leak test runs only on samples. Not in a kept thought: fresh negatives each pass.
- `A9.c.1`: About two fifths of the card time goes to two teachers that each saw half the data; no reader arm fits; the first design loses its end-to-end reader. By its own count the large reader the compute allows would itself fit the small card.
- `A9.c.2`: It sizes both designs by the PC's 12 GB card. The owner's instruction, carried by the brief, is a large model first and no shrinking of the design to that card. Not in a kept thought: each design trained on two halves so the intervals include the variance of training.
- `A9.c.3`: All card time to the large forms: no arms and no repeats, and the small form's time per question may force a shorter shortlist (M6 in part).

### Part `C`

Generated:

- none

Selection: kept `C1`, `C3`. Why only one: Order by the weakest profile (the plan, section 6). C1 and C3 have no profile below open. C2 and C4 are in part on M6. C1 and C3 cannot be ordered against each other: C1 lacks a joint reading of content and a guard for validation questions, C3 lacks events weighed by what they were, a learned typed propagation and a part per question. The test that separates them belongs in the comparison on the cards: on the same examples, whether a learned question-rooted propagation over the top set adds to an exact record read by trees, among right files with a path of two links or fewer and among those without.
Dropped:
- `C2`: M6 in part: its reach to far files is by content and by names the decoder proposes; structure stops at two hops, and a right file tied only by a longer structural route or by a similar past unit of work has no channel. No veto. What it has that the two left standing lack: a tuned decoder of one to three billion parameters as the joint reader, with counts inside its reading as tokens; names the decoder proposes; the cut-off rule that guards validation.
- `C4`: M6 in part, for the same choice in the reach part. No veto. What it has that the two left standing lack: the tuned decoder's joint reading as each candidate's input inside the question-rooted graph. Its own cost count holds the decoder to about half a billion parameters.

### Part `C-improved`

Generated:

- none

Selection: kept `C1.r1`, `C3.r1`. Why only one: One improvement pass for each design left standing. No level changed, so the loop stops (the plan, section 7). Each improved design lacks, on M3, M4 and M6 or on M1, M4 and M7, a part of what its parent lacked, and on no profile more, so each replaces its parent (CRITERIA.md, section 2). The two still cannot be ordered against each other; the test that separates them is the one recorded with the combinations.
Dropped:
- `C1`: Replaced by C1.r1: the same design with a joint reading for the top files of the first stage, the cut-off rule that guards validation, propagated sums on the repository's own scale, the counted lag curve as columns and one score for every file.
- `C3`: Replaced by C3.r1: the same design with events also counted by what they were, a question gate in the reader's head, penalised parts per kind of question with a fallback, the cut-off rule that guards validation, and the reader's size taken from the compute.

### Part `F`

Generated:

- none

Selection: kept `F1`. Why only one: The plan keeps the better of the two pipeline designs (section 8). Both stand at the same levels on all eight profiles, so the choice is in words and is the reader's call. F1 trains the two designs left standing whole, keeps every stage reading scores from fits that did not see the example, runs the leak tests before any card hour and gives every arm a slot. What F2 lacks is not a part of what F1 lacks, nor the reverse; F1's lacks (a tree sample sized to the PC, uncounted disk) can be answered without a card hour, F2's (the designs no longer trained as they stand, heads reading in-sample vectors) cannot.
Dropped:
- `F2`: It no longer trains either design left standing as it stands, and its heads read the shared reader's vectors on the rows that reader was trained on (D 6.4). What it has that F1 lacks: the four pairings of the two separating decisions at full data, with a prediction for their interaction; trees fitted on all their rows; one reader about 1.7 times larger.

### Part `F-improved`

Generated:

- none

Selection: kept `F1.r1`. Why only one: A change of substance made while preparing the hypothesis is a thought of its own (the plan, section 8). F1.r1 is F1 with the tree sample no longer sized to the PC and the disk counted; it lacks a part of what F1 lacked and nothing more, so it replaces F1 and is the final thought.
Dropped:
- `F1`: Replaced by F1.r1: the same pipeline with the second design's trees fitted on all their rows and with the place of the work before the card window decided by a count.

### Aggregates

- `C3` (file `thoughts/C3.md`, part `C`, parents `A1.c.1`, `A2.a.2`, `A3.c.1`, `A4.c.1`, `A5.c.3`, `A6.c.1`, `A7.c.1`, `A8.b.3`), written by run `a30c765976ea19dcd`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=-; vetoes: none; entries: N 2.3; N 9.4; N 9.5; N 9.8; N 9.10; N 13.7; N 13.8; N 13.9; N 14.4; D 2.9; D 3.2; D 6.2; D 7.2; D 8.1; D 9.2; D 9.4
- `C2` (file `thoughts/C2.md`, part `C`, parents `A1.b.1`, `A2.b.1`, `A3.c.1`, `A4.c.1`, `A5.b.1`, `A6.b.1`, `A7.c.1`, `A8.b.3`), written by run `a252ee414359d7366`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=part, M7=open, M8=-; vetoes: none; entries: N 7.1; N 9.4; N 9.5; N 9.8; N 9.10; N 11.3; N 12.6; N 12.7; N 13.2; N 13.8; N 13.9; D 3.2; D 6.2; D 6.4; D 7.2; D 9.4
- `C4` (file `thoughts/C4.md`, part `C`, parents `A1.b.1`, `A2.a.1`, `A3.a.3`, `A4.a.1`, `A5.b.1`, `A6.b.1`, `A7.c.1`, `A8.c.1`), written by run `a4f7fadc2a723f1b9`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=part, M7=open, M8=-; vetoes: none; entries: N 5.5; N 8.4; N 9.3; N 9.4; N 9.5; N 9.8; N 9.10; N 10.4; N 11.3; N 12.6; N 13.2; N 13.3; N 13.8; N 14.4; D 2.9; D 3.2; D 6.4; D 7.5; D 9.4
- `C1` (file `thoughts/C1.md`, part `C`, parents `A1.a.1`, `A2.a.1`, `A3.a.3`, `A4.a.1`, `A5.c.1`, `A6.c.1`, `A7.c.1`, `A8.c.1`), written by run `a02f9597bceb7c084`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=-; vetoes: none; entries: N 5.4; N 7.1; N 8.4; N 9.4; N 9.5; N 9.8; N 9.10; N 10.4; N 10.5; N 11.3; N 13.2; N 13.3; N 13.8; N 14.2; N 14.4; D 2.9; D 3.2; D 6.2; D 8.1; D 9.4
- `F2` (file `thoughts/F2.md`, part `F`, parents `C1.r1`, `C3.r1`, `A9.b.3`, `A10.b.1`), written by run `a1fffaf7a08620f47`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=construction; vetoes: none; entries: N 1.1; N 9.4; N 9.5; N 9.8; N 9.10; N 13.2; N 13.6; N 13.8; N 14.4; D 2.10; D 3.2; D 6.2; D 6.4; D 7.2; D 7.3; D 9.4
- `F1` (file `thoughts/F1.md`, part `F`, parents `C1.r1`, `C3.r1`, `A9.a.2`, `A10.a.1`), written by run `a4be35c5160698333`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=construction; vetoes: none; entries: N 9.4; N 9.5; N 9.8; N 9.10; N 13.2; N 13.6; N 13.7; N 13.8; N 14.2; D 2.9; D 2.10; D 3.2; D 6.2; D 6.4; D 7.2; D 7.3; D 8.1; D 9.4

### Refinements

- `C1.r1` (file `thoughts/C1.r1.md`, part `C`, parents `C1`, `A2.b.1`, `A1.b.1`, `A5.b.1`, `A5.c.3`, `A8.b.3`), written by run `a8ce68439e99743f7`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=-; vetoes: none; entries: N 7.1; N 8.4; N 9.4; N 9.5; N 9.8; N 9.10; N 11.3; N 13.2; N 13.9; N 14.4; D 2.9; D 3.2; D 6.2; D 6.4; D 8.1; D 9.4
- `C3.r1` (file `thoughts/C3.r1.md`, part `C`, parents `C3`, `A3.c.2`, `A3.a.3`, `A8.c.1`, `A5.b.1`), written by run `aacc87cd680f1ddd6`: confirmed
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=-; vetoes: none; entries: N 9.3; N 9.4; N 9.5; N 9.8; N 12.6; N 13.8; N 13.9; D 3.2; D 6.2; D 6.4; D 7.4; D 8.1; D 9.2; D 9.4
- `F1.r1` (file `thoughts/F1.r1.md`, part `F`, parents `F1`), written by the top session (cannot be confirmed)
  - scored by `top session`: levels M1=construction, M2=construction, M3=open, M4=open, M5=construction, M6=open, M7=open, M8=construction; vetoes: none; entries: N 14.4; D 3.2; D 6.4; D 9.2; D 9.4

### Final thought

- `F1.r1` (refine, file `thoughts/F1.r1.md`)

### Writers not confirmed

- `A1.a.3`: by run `a91dec64ec147f1be`; its transcript holds no write to `thoughts/A1.a.3.md`
- `A1.b.1`: by run `afbe842dcfaef8aad`; its transcript holds no write to `thoughts/A1.b.1.md`
- `A1.b.2`: by run `afbe842dcfaef8aad`; its transcript holds no write to `thoughts/A1.b.2.md`
- `A1.s.1`: by the top session; never confirmed
- `A10.s.1`: by the top session; never confirmed
- `A2.b.2`: by run `ad0064f3ae79623cf`; its transcript holds no write to `thoughts/A2.b.2.md`
- `A2.c.1`: by run `a4ce47edfa395a554`; its transcript holds no write to `thoughts/A2.c.1.md`
- `A2.c.2`: by run `a4ce47edfa395a554`; its transcript holds no write to `thoughts/A2.c.2.md`
- `A2.c.3`: by run `a4ce47edfa395a554`; its transcript holds no write to `thoughts/A2.c.3.md`
- `A2.s.1`: by the top session; never confirmed
- `A3.b.1`: by run `ae86a4ad31a276805`; its transcript holds no write to `thoughts/A3.b.1.md`
- `A3.b.2`: by run `ae86a4ad31a276805`; its transcript holds no write to `thoughts/A3.b.2.md`
- `A3.s.1`: by the top session; never confirmed
- `A4.b.1`: by run `a24f048e355c8afe8`; its transcript holds no write to `thoughts/A4.b.1.md`
- `A4.b.2`: by run `a24f048e355c8afe8`; its transcript holds no write to `thoughts/A4.b.2.md`
- `A4.b.3`: by run `a24f048e355c8afe8`; its transcript holds no write to `thoughts/A4.b.3.md`
- `A4.c.1`: by run `a21e217bbfabfa6e7`; its transcript holds no write to `thoughts/A4.c.1.md`
- `A4.c.2`: by run `a21e217bbfabfa6e7`; its transcript holds no write to `thoughts/A4.c.2.md`
- `A4.s.1`: by the top session; never confirmed
- `A5.a.1`: by run `a990c642cc079f2d8`; its transcript holds no write to `thoughts/A5.a.1.md`
- `A5.a.2`: by run `a990c642cc079f2d8`; its transcript holds no write to `thoughts/A5.a.2.md`
- `A5.s.1`: by the top session; never confirmed
- `A6.s.1`: by the top session; never confirmed
- `A7.s.1`: by the top session; never confirmed
- `A8.s.1`: by the top session; never confirmed
- `F1.r1`: by the top session; never confirmed

## 3. The graph of decisions

Each decision names what it depends on. M1 to M8 are the eight parts of a model; M9 joins them into the two models;
M10 to M12 are the pipeline round them.

- M1 (the exact record) depends on the data design.
- M2 (how the question enters) depends on M1.
- M3 (history) depends on M1 and M2. M4 (kinds of link) depends on M1. M5 (time) depends on M1 and M3.
- M6 (reach to far files) depends on M1, M2 and M4.
- M7 (score, loss, negatives, weights) depends on M2 and M6. M8 (three questions) depends on M2, M6 and M7.
- M9 (the two models) depends on M1 to M8.
- M10 (training on the cards) depends on M9. M11 (the comparison) depends on M9 and M10. M12 (sizes and the small
  form) depends on M9 and M10.

## 4. The decisions

### M1. What is computed exactly for every file, before anything is learned

**Depends on.** The data design: the store cut at the asking time, events with their size and time, typed and
directed links, content kept by its hash.

**Alternatives.** (a) A typed graph with frozen text on its nodes, everything else learned on it. (b) A tuned code
model reads the text, while amounts go round it on an exact side path. (c) Exact sums over typed paths, exact name
and text matches, and a learned ranker that reads them. Six further options were the same three mechanisms with
more points unmet.

**Ruled out.** As the only form, (a) leaves every count to learned sums over sampled neighbours (N 14.2), and (b)
leaves it to a reader that reads digits badly and is not built to count (N 13.9). A learned vector per file or per
repository cannot say anything about a file it has no row for (N 13.7).

**Choice.** (c) as the groundwork of both models. For every file alive at the asking time: the decayed,
size-weighted counts of earlier joint changes; counts of typed links over one and two steps; reach along any path;
an echo through similar earlier units of work; exact matches of names, paths and words; the best similarity of
chunk vectors from one frozen encoder. Every amount enters as a logarithm, as its rank within the repository or the
question, and with a flag where it is missing (D 5.3). No file and no repository has an identity (N 9.10). Beside these, each file carries a description of its place in the code graph that does not depend on the question: the return probabilities of a random walk, and its degree per kind of link.

**Why.** A function the model is handed cannot be lost while learning, and the test of the yardstick is exactly
such a function: the decayed, size-weighted count (N 9.5). In our own record the count features alone scored the
same as a graph network built on them. Amounts on the repository's own scale are what lets coefficients learned on
one repository be read on another (N 1.2, N 7.1, N 8.1); a tree cannot extrapolate past the range it saw, which relative
amounts avoid (D 8.1). A hand-built table loses whatever it did not foresee (D 9.2, D 4.3); model B, which keeps events as nodes with nothing added up in advance (D 9.3), is there to test that. For a file's place in the graph no description is best on every graph (N 10.1); return probabilities are compact, the same under relabelling and free of arbitrary signs, and their one limit, that two files can share a signature (N 10.2, N 10.4), is what the marks of M2 answer.

**Rests on.** N 1.1; N 1.2; N 7.1; N 8.1; N 9.5; N 9.10; N 10.1; N 10.2; N 10.4; N 13.7; N 13.9; N 14.2; D 4.3; D 5.3; D 8.1; D 9.2;
D 9.3; D 9.4; record: research-tree/build/improve/units/T3/report.md

**Refuted if.** In the extreme size strata of unseen repositories, raw logarithms do as well as relative amounts;
or a learned relational model beats the record among right files that lie within two links.

### M2. How the question enters, and how a candidate is described relative to it

**Depends on.** M1.

**Alternatives.** (a) The question is a node; its own files are marked by kind (in the change, named in the text,
in the trace); a propagation starts from them. (b) An exact record per pair of question and candidate, over the
full list of typed paths, plus one joint reading of both texts. (c) One reader takes question and candidate as one
sequence, with a token per kind of relation: attention alone knows no graph, and tokens are one of the three places where a graph can enter it (N 12.6, N 12.7).

**Ruled out.** A score made only from two vectors, each computed without the other: two candidates with the same
surroundings then get the same score, whatever the question (N 9.4, N 9.8); and a position task cannot be done from
structure alone (N 9.7). Positions from eigenvectors with arbitrary signs (N 10.3, N 10.6). A random identity per file, averaged over draws, would also break the symmetry and still transfer (N 10.7); it is not taken, because the question's own marks do the same and cost nothing.

**Choice.** (b) in model A and (a) in model B; the joint reading of (c) acts inside both, on the top files only.
The marks are relative identities, so no table of files is learned (N 9.10), and the question's own files are an
anchor set that every question draws afresh (N 10.5). The score is read from the candidate's own vector by a fixed, shallow read-out (N 5.4).

**Why.** The earlier graph models described each file once, for all questions, and one of them ended up ranking by
how often a file changes at all. Marks and pair records make the description depend on the question by
construction. Reading two texts together costs one pass per pair, so it is spent on a shortlist (N 12.1).

**Rests on.** N 5.4; N 9.4; N 9.7; N 9.8; N 9.10; N 10.3; N 10.5; N 10.6; N 10.7; N 12.1; N 12.6; N 12.7; record: research-tree/build/improve/units/T3/report.md

**Refuted if.** Setting every mark to zero costs nothing; or rankings barely move between questions asked at the
same moment; or a constant in place of the joint reading leaves right files with no history link where they were.

### M3. History: from the events that link two files to what the scorer sees

**Depends on.** M1, M2.

**Alternatives.** (a) A fixed bank of exact sums: several size weights, several decay lengths, on two clocks of the
repository's own, with the order of the two changes kept. (b) A learned sum over event nodes, with the exact count
kept as a fixed channel. (c) A bounded gate per event that reads the question and what the event was about; with
the gate at rest the sum is the exact count.

**Ruled out.** A mean, a maximum or a normalised attention as the only aggregation: none of them can count (N 9.5,
N 12.6, N 13.2). A fixed window of the most recent events as the only view: counting restricted to the same window
scored below counting over all history (D 2.10).

**Choice.** (a) for every file, in both models. On top of it events are weighed by what they were: in model A the
bank is also summed apart by what was done to the candidate (edited, added, renamed, deleted) and by bulk and bot
flags, and the reader's head reads the gate of (c); in model B the gate of (c) sits on the event edges of the
propagation. Neighbours treated differently is what an edge gate adds over one kernel for all (N 9.3).

**Why.** A mass rename and a six-file feature of the same age weigh the same in any kernel; only something that
reads the event can tell them apart: the fact's own content has to be in its message (N 13.9). A fixed bank alone loses what it did not foresee; events kept as they are lose nothing (D 9.2, D 9.3). A gate that is bounded and per event, not a softmax over events, still counts.

**Rests on.** N 9.3; N 9.5; N 12.6; N 13.2; N 13.9; D 2.10; D 9.2; D 9.3; record: research-tree/build/improve/units/T3/report.md

**Refuted if.** Trees over the bank do no better per repository than the best single kernel; or the gate stays at
rest on validation repositories, or gains on training repositories only.

### M4. Kinds of link, and direction

**Depends on.** M1.

**Alternatives.** (a) A map per kind and direction, each a mix of a few shared matrices, with sums inside and
across kinds. (b) Every typed path of one or two links as an exact count of its own, with paths through hubs
discounted. (c) Paths written out as statements for a language model, direction as word order.

**Ruled out.** One full matrix per kind: the number of parameters grows with the kinds and overfits (N 13.2). A
shallow scoring rule over one learned vector per file: each such rule provably cannot represent some kind of
relation, and it has nothing to say about a file it never saw (N 13.7, N 13.8). Kinds merged into one are not ruled
out by argument (N 13.1): they are an arm of the comparison.

**Choice.** (b) in model A (at most 468 path types, a type with no support in training dropped) and (a) in model B
(28 directed relations on shared bases, with a two-stage sum, N 13.3). A count over two links is one product of the link tables; each product reaches one step further and no more (N 2.3).

**Why.** "A imports B" is not "B imports A" (N 2.2). Counts keep a kind and its reverse as separate facts with no
parameter per kind; shared bases keep the learned form at a few numbers per kind (N 13.4).

**Rests on.** N 2.2; N 2.3; N 13.1; N 13.2; N 13.3; N 13.4; N 13.7; N 13.8; record: docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md

**Refuted if.** Merging all kinds into one, with the kind as a plain feature, loses nothing in any segment.

### M5. Time

**Depends on.** M1, M3.

**Alternatives.** (a) One access path to the facts visible before the asking time; decay as a fixed bank whose mix
is learned; ages on the repository's own clocks. (b) Relative clocks only, and a rule for any pretrained part: its
training cut-off must come before the validation stretch, and every example is marked by it. (c) A decay curve
counted from the repository's own past at the asking time, shrunk towards a curve from the training repositories.

**Ruled out.** An age embedding alone. A learned time function with nothing fixed beside it: it has no constraint
at ages it never saw (D 8.1). Calendar dates as input: they lie outside the training range at test (D 7.1).

**Choice.** All three, each for what it alone does: (a) keeps later facts out by construction and gives the exact
bank; (c) gives each unseen repository its own curve, shapes that are not monotone included; (b) keeps what a
pretrained model has read out of every choice made on validation.

**Why.** "Only use information up to the time of label" has to hold where the data is loaded, not be hoped for
(D 9.1, D 9.4; N 13.9). A pretrained model has read public repositories up to its cut-off; the data design guards the test
against that, and (b) extends the guard to the questions on which settings are chosen (D 6.1, D 6.2). A leak of this kind is silent: it only makes the scores look better (D 6.3). Every step that learns from data learns on training repositories and times alone (D 6.4). Drift over calendar time is not modelled (D 7.4).

**Rests on.** N 13.9; D 6.1; D 6.2; D 6.3; D 6.4; D 7.1; D 7.4; D 8.1; D 9.1; D 9.4

**Refuted if.** The counted curves differ from the training curve no more than their own spread; or a leak test
finds a fact dated at or after the asking time; or a model's lead over the baselines is larger on repositories
created before the pretrained cut-off than after.

### M6. Reach to files that history does not connect

**Depends on.** M1, M2, M4.

**Alternatives.** (a) Exact reach columns for every file: restart walks from the question's files over each group
of links, with the walk's leaning towards well-connected files removed; distance in links to those files (N 10.5); the echo
through similar earlier work; content matches. (b) A probability for every file by walking down the folder tree, the repository's own hierarchy (N 12.4).
(c) Channels of a language model: similarity of vectors, and names the model proposes that must resolve in the
repository's own table of symbols.

**Ruled out.** Reach by stacking local steps: a network sees as far as its layers and no further, and what lies
far is squeezed into one vector on the way (N 5.5, N 11.1, N 11.2). Attention over all pairs of files of a
repository: practical only when the number is small (N 12.3). Depth and width beyond what transfer allows (N 8.4).

**Choice.** (a) in both models. One score ranks every file alive; the top files are read jointly, each over a direct edge from the question, which is what removes the long route (N 11.3, N 12.5).

**Why.** By repository, 30, 66 and 21 % of right files had never changed with the question's file before. A walk
computed once has no depth limit and nothing to learn (N 2.3, N 14.4): it is a linear filter whose coefficients do not depend on the graph, so it runs on any repository unchanged (N 3.1), on the degree-normalised form of the graph, a choice that matters where degrees differ a lot (N 2.1); it favours well-connected files by a known
amount, which is divided out (D 2.8, D 2.9). The four combined designs split on this decision: the two that took
(c) had no channel for a file tied only by a longer route or by similar earlier work.

**Rests on.** N 2.1; N 2.3; N 3.1; N 5.5; N 8.4; N 10.5; N 11.1; N 11.2; N 11.3; N 12.3; N 12.4; N 12.5; N 14.4; D 2.8; D 2.9;
record: docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md

**Refuted if.** Among right files with no joint history and no path of two links, the reach and echo columns do
not lift their rank over text search and vector similarity alone.

### M7. The score, the loss, the negatives, the weights

**Depends on.** M2, M6.

**Alternatives.** (a) The score is the untrained baseline of the kind of question plus a learned part; each right
file is ranked against the wrong files only; every candidate with any relation to the question is taken whole and
the rest are sampled with known probabilities and weighted back. (b) Trees with pairs weighted by how much a swap
changes the measure. (c) A calibrated probability per file, which can also say how many files to show.

**Ruled out.** Negatives that are real answers: in our record, labelling earlier real pairs as false took a score
from 0.141 to 0.007 (N 13.6). Samples whose probabilities are not kept, or a sample treated as if it were the whole (D 3.1): without them a total cannot be estimated
(D 3.2).

**Choice.** (a) for every trained stage of both models. A new file is a slot per folder, a virtual entry of its own (N 13.5). Every repository carries
the same total weight, with a bound per example; steps of one unit of work share one weight.

**Why.** With the learned part at zero the score is the baseline itself, on the same examples (D 7.2). No right
file sits in another's denominator, so a change with five right files does not push four of them down. Fewer sampled negatives mean more variance, which is why the related candidates are taken whole (N 14.2, D 2.10). (c) is not
taken: a loss on probability is not aimed at the order; what it would add, a stopping point, is given up for now.

**Rests on.** N 13.5; N 13.6; N 14.2; D 2.10; D 3.1; D 3.2; D 7.2

**Refuted if.** Per validation repository, uniform negatives with no correction score the same; or the learned
part adds nothing over the baseline on unseen repositories.

### M8. Three questions with one model

**Depends on.** M2, M6, M7.

**Alternatives.** (a) One backbone and a small part per kind of question, pulled towards zero. (b) A separate
ranker per question, with the error question composed from the other two. (c) Stages by kind of evidence, each
trained on the frozen scores of the stages before it, starting from the counted baseline.

**Ruled out.** An encoder of its own per kind of question: the error question has few examples, and a rare case
with its own model is memorised (D 7.4).

**Choice.** (c) is the structure of model A, with the scores a stage trains on always coming from fits that did
not see the example (D 6.4); (a) supplies the parts per question in both models. A kind owns only a few numbers on top of shared parts, so nothing grows with the kinds (N 13.2, N 8.4). Where a kind has too few
validation questions to set its penalty, its part is zero and it falls back on the shared model.

**Why.** The three questions are one task with different starting files; what is learned on changes also serves an
error's trace files, in the way a pattern seen around one node serves every place that looks the same (N 5.2).

**Rests on.** N 5.2; N 8.4; N 13.2; D 6.4; D 7.4

**Refuted if.** On unseen repositories a model trained on one kind alone matches the shared one on task words and
on errors; or the parts per kind move no rank beyond the intervals.

### M9. The two models to build

**Depends on.** M1, M2, M3, M4, M5, M6, M7, M8.

**Alternatives.** Four whole designs were combined from the kept parts: (a) a graph spine; (b) a cascade under a
large tuned code model; (c) the exact record, trees and a joint reader; (d) a question-rooted graph over a tuned
code model.

**Ruled out.** None by a veto. (b) and (d) were ordered below for the reach decision of M6.

**Choice.** Model A is (c) after its improvement pass, model B is (a) after its own. A: exact record; trees with
shallow trees per kind; in a shortlist a tuned reader whose head also reads the record and the question gate. B:
the same columns; a linear first stage; for the top files three layers of typed, gated sums rooted at the
question, the exact columns in each candidate's starting state, and a joint reading for the top sixteen; propagated
sums divided by one constant per repository. In both, one score ranks every file.

**Why.** The two cannot be ordered: A lacks a learned propagation over typed links, B lacks trees and the depth of
A's reader. Message passing has known limits on what it can tell apart (N 9.1, N 9.2, N 9.6, N 9.9); marks, exact
columns and a joint reading are the remedies the material names (N 9.10). In model B all mixing between files is done by the sums; the nonlinearity after them is what lets a network of stable sums still tell things apart (N 4.1, N 4.2), and several features per file come from a bank of such sums (N 5.3). A network with a symmetry learns from
fewer examples than one without (N 5.1, N 5.2); whether that outweighs an exact table read by trees is the
question the bridge arm of M11 puts: aggregation over neighbours is a learnable form of the hand-made table (N 13.9), and the table loses what it did not foresee (D 9.2).

**Rests on.** N 1.1; N 4.1; N 4.2; N 5.1; N 5.2; N 5.3; N 9.1; N 9.2; N 9.6; N 9.9; N 9.10; N 13.9; D 9.2; record: docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md

**Refuted if.** Neither model leads the untrained baseline beyond its interval on unseen repositories after the
cut-off date, while it does before it.

### M10. Training on the three cards

**Depends on.** M9.

**Alternatives.** (a) Each model as one job across all cards, with the exact columns recomputed on the card. (b)
Rows built once, stages trained apart, three jobs that never wait for each other. (c) One reader trained once and
shared by both models. (d) Two large readers teach a small one. (e) Both models trained at the size the 12 GB card
can run. (f) Train large and round the weights.

**Ruled out.** (e): it sizes the design by the PC's card, against the owner's standing word. (a) leaves under an
hour for the arms and cannot include trees in a joint step.

**Choice.** (b). Before the card window: one pass in time per repository writes the rows of every question with
both models' exact columns and the sampled negatives with their probabilities; the frozen encoder embeds each
chunk once per content; the first stage of each model is fitted on all its rows, on scores from fits that did not
see the example; shortlists are frozen; the baselines and first-stage arms are scored; the leak tests run on the
stored rows (D 6.4, D 9.4). In the window: card 1 trains model B whole (about five and a half hours), then the bridge arm; card 3
trains model A's reader whole (about five hours); card 2 runs the rungs of the ladders on a quarter of the data;
each card scores in its last hour. Every job saves its state every half hour, a watchdog restarts a silent job,
each slot has a hard end and arms are dropped in a fixed order.

**Why.** A computation that needs no learning is done once (N 14.4). Independent jobs lose one card to a fault,
not three. Files drawn one by one would arrive without their neighbours (N 14.1), so questions are batched per repository. What is sampled is sampled by a design whose probabilities are kept (N 14.2, D 3.2, D 2.10), and a subgraph
sample that drops links between groups would bias the gradient (N 14.3). Where memory is short the work goes
slower; the sample is not shrunk.

**Rests on.** N 14.1; N 14.2; N 14.3; N 14.4; D 2.10; D 3.2; D 6.4; D 9.4

**Refuted if.** The step times measured in each job's first fifteen minutes do not fit its slot; or the work
before the window does not finish in the days planned at the counted sizes.

### M11. The comparison

**Depends on.** M9, M10.

**Alternatives.** (a) Two ladders down to one floor, with a bridge between the models. (b) A fractional factorial
over the decisions. (c) A two-by-two of the two separating decisions above a shared reader. (d) One cascade with
inputs knocked out at the head. (e) A shared trunk with one swap per arm. (f) Each model as its own ladder of
stages.

**Ruled out.** A sweep over forms or over a library's settings in place of an argument (N 1.1). (e) never trains
either model whole. (c) and (d) no longer train the models as they stand.

**Choice.** (a). The floor, on the same questions: counting with the one-over-size weight, recently changed, same
folder, import neighbours, text search, named files, trace files, frozen similarity. First-stage arms on
processors: linear against trees on the same columns; trees without one block of columns at a time; raw logarithms
in place of relative amounts. Card arms on a quarter of the data, each beside its reference: model B without the
marks, without the exact columns in the starting state, without the gate, with kinds merged, without the joint
reading; model A without the record in the reader's head; one double removal. The bridge: B's propagation on A's
first stage and shortlist, against A's reader. Each arm has a prediction on a segment named before the run.
Results are read per repository first, then averaged with the sampling weights, with intervals from resampling
clusters (D 3.2); the test is scored once and never used to choose (D 6.1).

**Why.** If a model cannot beat the naive forms, something is wrong (D 7.2); an average can hide that a model is
good in one segment and bad in another (D 7.3). One decision per arm is what lets a result be attributed.

**Rests on.** N 1.1; D 3.2; D 6.1; D 7.2; D 7.3

**Refuted if.** A reference trained on a quarter differs from its whole model in the named segments, so the ladder
does not speak for the model; or the bridge leads, or trails, on both of its segments alike.

### M12. Sizes, and the form for the 12 GB card

**Depends on.** M9, M10.

**Alternatives.** (a) Sizes by habit or by reputation of a model. (b) Sizes found by a sweep. (c) Sizes computed
from the compute and the counts.

**Ruled out.** (a) and (b): a larger class fits its training data better and that says nothing about unseen data
(N 1.1); deeper and wider graph networks transfer worse (N 8.4); in our record retrievers of three sizes swung by
repository, not by size.

**Choice.** (c). The reader's size follows from the card-hours of its slot, the tokens per pair and the number of
pairs: about 120 million parameters at 50,000 questions on one card for five hours, about 590 million at 10,000;
the largest the count allows is taken. The frozen encoder's class (0.1 to 0.3 billion) follows from the counted
tokens. Model B's learned part stays small, three layers at a width of at most 256, with sums along links only, so that its cost grows with files and links and not with their pairs (N 12.2), where transfer can be
expected. The small form: the untrained and first stages run on processors, the reader at half precision on the
shortlist on the 12 GB card; a smaller reader is distilled on the PC only if the time per question is too long.

**Why.** The bounds for a network on a graph other than the one it was trained on grow with depth and width, and
hold only inside one family of graphs (N 7.3, N 8.2, N 8.3, N 8.4), and a network inherits the stability of its sums once per layer (N 7.2); a filter sharp enough to tell everything apart
is the one that transfers worst (N 3.2). Large first, then shrink: the large form is whatever the eight hours
allow, and the shrinking is done afterwards, on the PC.

**Rests on.** N 1.1; N 3.2; N 7.2; N 7.3; N 8.2; N 8.3; N 8.4; N 12.2; record: docs/program/hypotheses/search-model/FACTS-MODELS-SO-FAR.md

**Refuted if.** The small form of the chosen model falls below its form from the cards beyond the intervals; or a
reader several times larger, trained later on the same split, leads on unseen repositories.

## 5. Consistency across the decisions

- **One record, two readers of it.** M1's record is the input of model A's trees and of model B's linear stage and
  starting state, so the two models differ in what learns, not in what they are given. The first-stage arms of M11
  check that by training trees on B's columns too.
- **Counts never pass through something that cannot count.** M3's exact bank reaches every score as an offset
  (M7), as columns (M1) and as the resting point of every gate; sums in M4 are not divided by degree; what is
  sampled (M7's negatives, M10's neighbours) is weighted back by its probability.
- **Time is enforced in one place.** M5's cut is applied where rows are written (M10), so the leak tests run on
  stored rows before a card is rented; the cut-off rule covers the encoder of M1 and the reader of M9 alike.
- **Reach is computed, depth stays small.** M6 leaves nothing to stacked steps, which is what allows M12 to keep
  model B at three layers.
- **Every stage reads scores from fits that did not see the example** (M8, M10); the pipeline design that gave
  this up for a shared reader was not chosen.
- **Each decision has an arm.** The refutation written under M2, M3, M4 and M6 is a rung of M11's ladders.
- **One tension is left standing and said:** staging (M10) freezes the first stage, so a right file below the
  shortlist is never corrected by the second stage, in either model; and model B loses the joint loss over both of
  its stages that its design asked for.

## 6. What stays open, and what settles each

| Open | What settles it |
|---|---|
| Whether a learned propagation over typed links adds to an exact record read by trees | The bridge arm: model B's graph on model A's first stage and shortlist, against model A's reader, read on right files within two links and on those with no link and no history |
| Whether weighing each earlier change by what it was about adds to exact counts | The arms without the gate, in both models, on unseen repositories |
| Whether a tuned joint reading earns its card hours | Model B without it, and model A's reader against its first stage, on right files with no history link |
| How large a reader the eight hours allow | The count of questions per kind: the size is computed from it, not chosen |
| Whether amounts on the repository's own clock and scale transfer better than days and raw logarithms | The first-stage arm with raw logarithms, read in the extreme size strata |
| Whether a pretrained model recalls public repositories | Every reading split by repositories created before and after its cut-off |
| Whether the shortlists hold the right files at all | The share of right files inside each shortlist on validation, counted before the card window |
| Where the work before the card window runs | Free disk and memory on the PC against the counted sizes |

## 7. Counts to make first, and what needs the owner's word

Counts, in the order they are needed:

1. The pilot of about 30 repositories of the data design: the number of clusters, and with it every size below.
2. Distinct tokens of content and of events: the encoder's class and the days its pass takes.
3. Rows per question by repository: the upload, the processor hours, the time of the tree fits.
4. Questions per kind, the linked issues and the error tiers: the reader's size, and whether error segments can
   be read at all.
5. Links of the largest repository: whether model B fits one card.
6. The share of right files inside each shortlist on validation: whether a second stage can matter.
7. Validation questions per named segment: which predictions can be read.
8. Step time and memory in each job's first fifteen minutes.
9. Scoring time per arm.
10. Free disk and memory where the work before the window runs: on the PC, or on a rented machine without cards.

What needs his word:

- The data hypothesis passed or corrected first: this one stands on it.
- One frozen encoder of code and text from a public model hub, under 1 GB, and one reader of 0.5 to 2.5 GB, each
  with a training cut-off before the validation stretch. Named with source and exact size before any download.
- Sending to the rented machine: derived rows, graphs, vectors and token files of public repositories only, on
  the order of 200 GB, and the code. His yes at that moment.
- If count 10 says so: a rented machine without cards for the work before the card window.
- Never leaves his PC: his two private repositories and the old held-out sets. They are scored on the PC with the
  weights brought back.

## 8. What would show the whole hypothesis wrong

- On unseen repositories after the cut-off date, neither model leads counting with the one-over-size weight (for
  a change) or text search (for task words) beyond the intervals.
- The lead is there only on repositories created before the pretrained cut-off: memory, not mechanism.
- The share of right files inside the shortlists is so low that neither second stage can matter.
- The bridge arm and both ladders show no decision whose removal costs more than its interval: then what was
  argued here makes no measurable difference, and the plain record with trees is the model.

## 9. Coverage of the model entries

Every entry of `MECHANISMS-NEURAL.md`, with the decisions that use it. None is set aside. The table is made from the
decision blocks by script.

| Entry | Used in | Entry | Used in | Entry | Used in |
|---|---|---|---|---|---|
| N 1.1 | M1, M9, M11, M12 | N 9.1 | M9 | N 12.2 | M12 |
| N 1.2 | M1 | N 9.2 | M9 | N 12.3 | M6 |
| N 2.1 | M6 | N 9.3 | M3 | N 12.4 | M6 |
| N 2.2 | M4 | N 9.4 | M2 | N 12.5 | M6 |
| N 2.3 | M4, M6 | N 9.5 | M1, M3 | N 12.6 | M2, M3 |
| N 3.1 | M6 | N 9.6 | M9 | N 12.7 | M2 |
| N 3.2 | M12 | N 9.7 | M2 | N 13.1 | M4 |
| N 4.1 | M9 | N 9.8 | M2 | N 13.2 | M3, M4, M8 |
| N 4.2 | M9 | N 9.9 | M9 | N 13.3 | M4 |
| N 5.1 | M9 | N 9.10 | M1, M2, M9 | N 13.4 | M4 |
| N 5.2 | M8, M9 | N 10.1 | M1 | N 13.5 | M7 |
| N 5.3 | M9 | N 10.2 | M1 | N 13.6 | M7 |
| N 5.4 | M2 | N 10.3 | M2 | N 13.7 | M1, M4 |
| N 5.5 | M6 | N 10.4 | M1 | N 13.8 | M4 |
| N 7.1 | M1 | N 10.5 | M2, M6 | N 13.9 | M1, M3, M5, M9 |
| N 7.2 | M12 | N 10.6 | M2 | N 14.1 | M10 |
| N 7.3 | M12 | N 10.7 | M2 | N 14.2 | M1, M7, M10 |
| N 8.1 | M1 | N 11.1 | M6 | N 14.3 | M10 |
| N 8.2 | M12 | N 11.2 | M6 | N 14.4 | M6, M10 |
| N 8.3 | M12 | N 11.3 | M6 | | |
| N 8.4 | M6, M8, M12 | N 12.1 | M2 | | |
