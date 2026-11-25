# Rules for research on something we build (2026-11-25)

The owner set these on 2026-11-25 (journal, prefix r58: his agreement to the four working rules and his order to
write the mistakes of that week into an enforced rule set). His words: "for these kind of research tasks, we should
not be reading research papers and seeing this beats that, so this beats this ... Since we're actually experimenting
and trying to build something new here." They are rule 9 of `CLAUDE.md`. What went wrong, with the evidence:
`research-tree/build/improve/WHY-RESEARCH-FAILED-2026-11-25.md`.

## The rules

1. **Mechanisms, not scoreboards.** From every source keep only what a mechanism or a data step can and cannot do,
   and the counterexample that shows the limit. Leaderboard tables and "X beat Y" are not collected and are never a
   reason to choose a form. Teaching material comes first: courses, lecture decks, textbook chapters, the method
   section of a paper. A paper's result table comes last, and only to check a prediction already written down.
2. **The session that designs reads the material itself, in full.** Helpers may find, fetch and extract text and
   check citations. A helper's summary is never the basis of a design choice. Where this meets rule 5 of `CLAUDE.md`
   ("the coordinating session only coordinates"), reading for a design is the designer's own work.
3. **A written hypothesis before any build, training or card run.** It states the structure of the problem; for each
   design decision the alternatives, the strengths and weaknesses of each for our use case, and why the choice
   follows; and what it predicts, including the result that would refute it. The owner sees it first. No hypothesis,
   no run. The bar is a hypothesis logically strong enough to justify its test; "reasoning cannot promise results"
   is not an answer to that bar.
4. **No combination-trying.** A sweep over forms, sizes or settings is not a way to find a design. A library default
   is a decision and needs its reason like any other. A test runs only to separate hypotheses that survived the
   argument, and its expected result is written before it runs.
5. **Built to transfer.** A model is designed to work on a repository it was not trained on and is tested on one,
   unless the owner says otherwise for that piece of work.
6. **The learning is kept and used.** What was learned about mechanisms and data steps lives in
   `docs/program/learning/` (`MECHANISMS-NEURAL.md`, `MECHANISMS-DATA.md`). A design cites the entries it rests on;
   a new session reads both files in full before it designs or judges a model.
7. **For the owner: the view and the argument.** What is being built, how, and why each choice follows. Test results
   are inputs to that, not the report.

## The mistakes behind them (each one called out by the owner in the week of 2026-11-23)

| mistake | what it cost | rule |
|---|---|---|
| The research run collected quoted results from papers (about 1.5 B tokens); the words for the governing limits (1-WL, the labeling trick, over-squashing) occur 0 times in it | no design judgment came out of it | 1 |
| Coordinators were barred from reading sources; readers returned ten lines | the session that chose designs never held the understanding | 2 |
| Forms were ranked by published gain and a guessed chance, then built | a graph network that averages (cannot count), one vector per file (no pair fact), a 20 to 32 event window on 342,722 events, easy negatives: all textbook faults | 1, 3 |
| Library defaults were taken as given (`as DyGLib defines them`); "historical negatives" was run although it labels past co-change as false | card days spent rediscovering what a lecture deck states | 4 |
| "Simple is enough" after one form per family; "the limit is the signal"; "new information is the only thing that moves the score": a fact about weak models turned into a view of the problem | wrong direction three times | 3 |
| "A relational graph transformer is worth one fair test later", with no design argument | a hedge in place of a decision | 3 |
| Everything was trained and tested on the same three repositories | nothing shown to work elsewhere | 5 |
| Reports to the owner were findings one by one | he lost the view of what was being built | 7 |

## What enforces them

- `CLAUDE.md` rule 9 is loaded by every session of this repository.
- A guard that refuses a training or card start without a hypothesis file the owner has seen, and a research helper
  without the mechanism lens in its brief, is to be added to `.claude/hooks/` when the round now running on the card
  has ended (a new guard on helper starts must not stall it). Until then the rule binds by being read.

---

## The standard a hypothesis must meet before it is passed (the owner, 2026-11-25; journal r58-0017)

His words: "any assumption or and any proposal, anything that you're seeing should have solid reasoning on why that
assumption is how it is and why that proposal is how it is, and is it logically and factually consistent with what is
in the learning we've done and in the files we've read ... Only then will it be passed." And: "note down these
standards and use a hook so that these standards are enforced and we don't mistakenly hallucinate and ignore these
and forget to read".

1. **Every assumption and every proposal shows three things**: its reasoning; the places it rests on (an entry of
   the two learning files, a named file of our own record, or a named passage of a source); and that it agrees with
   them.
2. **Where the material is silent, say so.** The item is then marked `assumption`, with its own reasoning, or
   `count first`, naming the count on our data that has to be made before the decision stands. It is never presented
   as established.
3. **Read before writing.** A hypothesis is written or changed only by a session that has read both learning files
   in full since its last compaction.
4. **Compute.** Designs are planned for the rented cards (about four large cards for about eight hours), not shrunk
   to our own card. Nothing is sent to a rented machine without his yes at that moment.
5. **Passed by him only.** A pass is his words, recorded in the journal. Any change to the document after the pass
   voids the pass.
6. **Nothing of the new work runs before the pass**: no build, no training, no rented-card step.

### The form (what the hook reads)

- A hypothesis is a file `docs/program/hypotheses/*-HYPOTHESIS-*.md`.
- Each decision is a block that begins with a heading `### D1. Title` (D for data, M for the model) and holds five
  labelled paragraphs, each beginning with its label at the start of a line: `**Alternatives.**`, `**Choice.**`,
  `**Why.**`, `**Rests on.**`, `**Refuted if.**`.
- `**Rests on.**` lists references separated by semicolons. Allowed kinds: `N 9.5` or `D 4.3` (an entry of
  `MECHANISMS-NEURAL.md` or `MECHANISMS-DATA.md`; `N 11` names a whole section); `record: <path>` (a file of this
  repository, which must exist); `assumption` (its reasoning is then in `**Why.**`); `count first: <what>`.
- Every reference of the form `N x.y` or `D x.y` anywhere in the file must exist in the learning files.
- The pass is a file beside the hypothesis, `<same name>.pass.json`, holding the journal id of his ruling, the
  SHA-256 of the hypothesis file at that moment and his words. It counts only while the hash still matches and the
  ruling is in the journal as an owner ruling.

### What enforces it

`.claude/hooks/hypothesis-gate.mjs` (brief: `research-tree/build/briefs/HYPOTHESIS-GATE.md`). It refuses: writing a
hypothesis without the reading; a hypothesis whose blocks lack a part or whose references do not exist; and any
build, training or rented-machine step under the new work's roots (`research-tree/build/data2/`,
`research-tree/build/model2/`, `C:/research-runs/data2/`, `C:/research-runs/model2/`) without the passes (the data
pipeline needs the data hypothesis passed; the model needs both). It does not touch the improvement round that was
approved earlier. What no hook can do is judge whether the reasoning is right: that is a separate check of each cited
passage against what the hypothesis claims, and his own pass.

### Added the same day, on his word about how a hypothesis is reached (journal r58-0021)

A hypothesis is not written in one pass. It is reached through a graph of decisions in dependency order, with the
alternatives at each decision written out, the rejected ones kept with what rules them out, a consistency pass across
the decisions, and an attack by independent checkers before it is put to him. So the form has two more required
labels in every block, `**Depends on.**` (the demands and the earlier decisions this one rests on) and
`**Ruled out.**` (each rejected alternative with the entry, the record or the count that rules it out), making seven
in this order: Depends on, Alternatives, Ruled out, Choice, Why, Rests on, Refuted if. And the document holds a
`## ` heading containing the words "graph of decisions" before the first block and a `## ` heading containing
"Consistency across the decisions" after the last.

## Graph of thoughts means the method, run in the open (the owner, 2026-11-25; journal r58-0027)

His words: "when I say graph of thoughts, do graph of thoughts and make it clear that you're doing graph of thoughts.
Like nothing behind the scenes and ... no lying". What broke it twice that day: a decision graph drawn after reasoning
in one line was called graph thinking; then four separate drafts were merged once by the session itself, and two
re-readings of its own text were reported to him as rounds.

When he asks for a graph of thoughts (also "graph thinking", a "tree" or a "forest" of thoughts) for a piece of
reasoning:

1. **Say first what can be run.** Before starting, the session states which parts of the method it will run and which
   it cannot, and why. It never starts on a weaker form silently.
2. **The plan before the first thought.** A file `GRAPH-PLAN.md` in the folder of the search: the parts the problem is
   split into and which depends on which; per part how many thoughts are generated and by which separate runs; the
   scoring rule (a criteria sheet fixed beforehand); how many are kept per part; how many whole combinations are made
   and by whom; the improvement loop and its stop rule; the budget in tokens.
3. **Every thought is a record.** `thoughts.jsonl` in the same folder, one line each:
   - a thought: `{"t":"thought","id","op","part","parents","by","file","at"}`. `op` is `generate`, `aggregate` or
     `refine`; `parents` lists thought ids and is empty only for `generate`; `by` is the id of the separate run that
     wrote it, or `top session`; `file` holds its text; `at` is the clock time.
   - a score: `{"t":"score","thought","by","levels","vetoes","entries","at"}`, `levels` giving a level per profile of
     the criteria sheet.
   - a selection: `{"t":"keep","part","kept","dropped","at"}`, each dropped thought with its reason.
   - the result: `{"t":"final","thought"}`.
4. **What makes it a graph, checked by script** (`node tools/check-got.mjs <folder>`): the plan is older than every
   thought; at least two parts; per part at least three generated thoughts; every thought has a score before it is
   kept, dropped or made the parent of another; a selection keeps more than one thought of a part, or says why only
   one could be kept; at least three thoughts of `op` aggregate with different sets of parents, each scored; at least
   one refine whose parent is an aggregate, scored after it; the final thought is an aggregate or a refine. A thought
   that names a separate run must in fact have been written by that run (its transcript holds the write); one that
   cannot be confirmed is listed as unverified.
5. **The account of what was done comes from the records.** The same script prints a ledger: the parts, the thoughts
   per part and who wrote them, the scores, what was kept and dropped and why, the combinations, the refinements, what
   could not be verified, and in its first lines every minimum of point 4 that was not met. The hypothesis carries
   that ledger word for word under a heading containing "What was actually done", and the owner's page shows it.
   Nothing is claimed about the process that the ledger does not show. A round is a pass in which new thoughts were
   generated and scored; a re-reading is called a re-reading.
6. **A shortfall is said, not hidden.** Work that misses a minimum may still be shown to him, as what it is: the
   ledger says so first.

A hypothesis written from now on carries one of two lines near its top: `Search: <folder>` (the folder of its plan and
thought records), or `Not reached by a graph of thoughts: <what was done instead>`.

What enforces it: `tools/check-got.mjs` (the check and the ledger); `.claude/hooks/hypothesis-gate.mjs` refuses a
hypothesis that has neither line, or whose "What was actually done" section differs from the ledger of the folder it
names; `.claude/hooks/got-reminder.mjs` puts this rule in front of the session whenever his message names the method.
What no hook can do: judge whether a thought is good or a score is fair. That stays the session's own reading against
the learning files, recorded per thought with the entries it rests on.
