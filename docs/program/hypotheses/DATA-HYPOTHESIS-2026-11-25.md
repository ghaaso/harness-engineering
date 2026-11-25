# Data hypothesis: what is wrong with the current data, and the data to build instead (2026-11-25)

By the top session, which read the learning files itself. Standing: a hypothesis for the owner to pass or correct
(journal r58-0017). Nothing was built, collected or run for it. References: `N x.y` is an entry of
`docs/program/learning/MECHANISMS-NEURAL.md`, `D x.y` of `MECHANISMS-DATA.md`; `record:` is a file of our own record.
Where the material is silent an item is marked `assumption` or `count first`.

## The answer in short

1. The current data cannot carry the goal. Three repositories that were at hand, a history flattened to pairs, no
   content of the changes, nothing for the error question. Most of this is a fault of what was collected, so repair
   is not enough.
2. Rebuild it: one relational store of irreducible, time-stamped facts, with the change as an entity of its own,
   collected from a designed sample of many public repositories. The owner's two private repositories go through the
   same pipeline on his PC and are used only as repositories the model has never seen.
3. Every input and every label is a view of that store as of the moment of the question. The three questions are
   three tables of examples over the same facts.
4. The store is profiled and leak-tested before any model reads it.

## 1. What is wrong with the current data

- **I1. Three repositories is no sample.** The repository is the unit that has to generalise. We have three, chosen
  because they were at hand; all three are in training and in test; one makes up four fifths of the pooled score.
  (D 1.2; D 2.7; D 7.3; N 8.1; N 8.4; record: research-tree/build/improve/CANDIDATES.md)
- **I2. What is stored lacks what two of the three questions need.** The extraction keeps each commit with its time,
  a message cut to 600 characters and the list of files touched. It does not keep what changed inside a file, the
  file's content or symbols at that time, the author, the pull request or issue a change belongs to, or any error
  text. (D 9.1; record: research-tree/build/runbig/card/d4/extract.mjs)
- **I3. Models were fed a projection.** Pairs of files, and for the embedding models yes-or-no facts. From pairs
  one cannot tell one change of three files from three changes of two; what was aggregated away no model can
  recover. (D 4.3; D 4.8; D 9.2; record: research-tree/build/runbig/card/d4/README.md)
- **I4. The link is partly our own making.** Only commits of 2 to 50 code files, no merges, seven file endings,
  decided at collection, where it can be neither undone nor varied. (D 1.1; D 1.2)
- **I5. Too little reach.** 30, 66 and 21 % of the right files have never changed with the asked-about file, and
  the only other links in the data are imports and folders: no symbols, references or test relations.
  (N 5.5; N 11.2; record: research-tree/build/improve/units/T1/report.md)
- **I6. An input missing for most training rows.** A content input was empty for 88 to 99 % of the training cells
  of two repositories. (D 3.3; D 5.3; record: research-tree/build/improve/APPROACHES-2026-11-25.md)
- **I7. Large changes dominate the examples.** A change of n files gives n starting files; the correction was found
  by trial, not derived. (D 2.2; D 2.8; D 2.9; D 3.2)
- **I8. The yardstick has a low ceiling and hides segments.** Precision in the top ten cannot exceed the number of
  right files over ten, about a quarter on our tuning data, and the pooled figure is mostly one repository.
  (D 7.3; N 13.6; record: research-tree/build/improve/units/T1/report.md)
- **I9. The task texts may tell too much.** A text written after the change, such as a commit message, is not what
  is known when a task is asked. Which texts our task set used in each repository is a count to make.
  (D 6.1; D 9.1)
- **I10. Nothing was profiled.** No stated keys, no test that every label file exists at the moment of the
  question, no automatic leak test. The leak rule itself (a strict cut-off per block) is sound, but it lives in
  code review. (D 4.5; D 4.6; D 6.3)

What holds and is carried over as rules: splits that follow time with a strict cut-off, file identity through
renames, naive baselines beside every model, results per repository. (D 6.1; D 7.1; D 1.2; D 7.2)

## 2. The graph of decisions

How this hypothesis was reached (the owner's word, journal r58-0021): not in one pass. The decisions were laid out in
dependency order; at each one the alternatives were written out, including those expected to fail; each rejected one
is kept below with what rules it out; section 4 checks the choices against each other; an independent checker then
attacks the whole, and the answers go into section 7.

What the data has to deliver comes from the six demands on any model (R1 to R6, argued in
`docs/program/learning/COMPARISON-WITH-OUR-WORK-2026-11-25.md`, section 1), read as demands on data:

| Demand on the model | What it demands of the data | Decided in |
|---|---|---|
| R1 the answer is relative to the question | each question's entity, what is known when it is asked, and the links between entities | D2, D7, D11 |
| R2 counts must survive | every event kept, never a summary of events | D2, D3 |
| R3 unseen repositories, own scale | many repositories drawn by design; a description of each, from which relative scales are taken | D4, D10 |
| R4 only what was known then | a time on every fact; inputs built as of the asking time | D6 |
| R5 kinds of link mean different things | links typed where they are collected | D2, D5, D11 |
| R6 reach beyond history | content and code structure collected, for every version | D2, D5 |
| (the data's own) it can be trusted and compared with the old | stated keys, a leak test, a bridge to the old baselines | D1, D10 |

Order of dependence (an arrow reads "has to be settled before"):

    demands R1-R6 --> D1 rebuild or repair --> D2 what fact is stored --> D3 no filter at collection
                                               D2 --> D5 code structure --> D11 the store read as a graph
                                               D2 --> D6 as-of views ----> D7 three tables of examples
    demand R3 ------> D4 the sample of repositories -----> D8 weights --> D9 tests and measures
                                               D7 --> D8        D2, D6, D7 --> D10 profiling and leak test

It is a graph and not a tree: D2 feeds four later decisions, and the model's demand R6 reaches back into what is
collected (D5).

## 3. The decisions

### D1. Rebuild the data from scratch; do not repair the current set

**Depends on.** The six demands (section 2) and the diagnosis (section 1).

**Alternatives.** (a) Keep the current data and add inputs. (b) Re-extract the same three repositories with content
added. (c) Rebuild: a new store and a new collection, with the three old repositories passed through the same new
pipeline.

**Ruled out.** (a): adding inputs changes neither the sample of three nor what was never collected (D 1.2; D 2.7). (b): the sample stays at three, and transfer is learned from many graphs and is worst for small ones (N 8.1; N 8.4).

**Choice.** (c).

**Why.** The faults that block the goal are in what was collected: three repositories, no content, links censored
at collection. Neither (a) nor (b) changes the first; (b) repairs content and shape for three repositories and leaves
the sample at three. The extraction has to run again in any case, because the content of the changes is not on disk,
and a store that keeps the change as an entity has a different shape from the present one. The sound parts of the old
data are rules, not files, and are carried over as rules. The three old repositories stay in with their old held-out
change lists, so that the old baselines can be recomputed on the new store and compared one to one.

**Rests on.** D 1.2; D 2.7; D 4.3; D 9.2; N 8.1; N 8.4; record: research-tree/build/runbig/card/d4/README.md;
record: research-tree/build/runbig/card/d4/extract.mjs

**Refuted if.** Counting recomputed from the new store on the three old repositories does not reproduce the old
counting baseline on the same held-out changes. The new extraction then differs from the old in a way that was not
intended, and it is wrong until the difference is explained.

### D2. The stored fact is the irreducible one, each kind in its own table, each with its time

**Depends on.** D1; demands R1, R2, R5 and R6.

**Alternatives.** (a) A table of pairs of files that changed together. (b) Lists of files per commit (what is stored
now). (c) A relational store: repository; change (time, author, message, parents, and the pull request it belongs to
where the host records one); file (an identity that survives renames); file version (which change, which file, added,
modified or deleted, the lines changed, the content at that point by its content hash); symbol (defined in which file
version); reference (which file version names which symbol or imports which file); task text and error text, each
with its own time; and the link from a task or an error to the change that resolved it.

**Ruled out.** (a): the join of the pairs does not give the changes back (D 4.3; D 4.8). (b): it holds no content, and no model recovers what was never stored (D 9.2).

**Choice.** (c).

**Why.** A projection onto pairs cannot be joined back to the changes, so (a) loses the grouping and everything that
depends on a change as a whole: its size, its text, which files moved as a set. (b) keeps the grouping and loses the
content, which the change question and every content-based link need. In (c) each row states one fact. Facts that
become known at different times (a change, the issue it later closes, an error it fixes) sit in different tables, so
none waits for another or is padded with blanks. Content is stored once per content hash, so a text input is computed
once and is valid exactly while that version is the file's current one: it cannot be present for some rows and
missing for others.

**Rests on.** D 4.3; D 4.4; D 4.8; D 9.2; D 9.3; D 5.3; N 13.9

**Refuted if.** Profiling shows the facts are not irreducible as stated (a change-and-file pair that occurs twice, a
version whose content cannot be recovered), or a count shows that changes of three or more files are so rare in the
sample that pairs and changes carry the same information.

### D3. Nothing is filtered at collection; a filter is a recorded choice made when examples are built

**Depends on.** D2; demand R2.

**Alternatives.** (a) Filter while collecting, as now: no merges, 2 to 50 code files, seven file endings. (b) Collect
every change and every file, store the attributes a filter would use (number of files, merge or not, bulk edit or
not, kind of file), and apply any filter later, per question, as a stated rule.

**Ruled out.** (a): a cap set while recording cannot afterwards be told from a property of the world (D 1.1).

**Choice.** (b).

**Why.** A filter at collection caps what can be recorded, like a survey that allows three names: afterwards the cap
looks like a property of the world. Teams package work differently (squashed, mixed, bulk edits), so one fixed cap
means different things in different repositories. Keeping the raw record and the attributes lets each question state
its own rule, lets the rule be varied, and makes its effect measurable.

**Rests on.** D 1.1; D 1.2; D 2.7; record: research-tree/build/runbig/card/d4/README.md

**Refuted if.** It removes a hidden choice, so no score refutes it. It is shown unnecessary if results on held-out
repositories do not move when the size rule is varied between sensible settings; the rule can then be fixed.

### D4. A designed sample of repositories, with whole repositories held out

**Depends on.** D1; demand R3.

**Alternatives.** (a) The three we have. (b) The most popular public repositories. (c) A sample drawn over stated
groups (length of history; main language; application, library or tool; how the team packages changes), a fixed
number per group, each repository's group recorded.

**Ruled out.** (a): three at hand is a convenience sample, and transfer is learned from many graphs (D 1.2; N 8.1). (b): drawing by popularity over-samples the largest, while small graphs, like the owner's two, transfer worst (D 2.8; N 8.4).

**Choice.** (c), with a share of every group held out whole, and the owner's two private repositories never trained
on.

**Why.** The model has to work on a repository it has not seen, so the repository is the unit that is sampled and
the unit over which results are averaged. (a) is no sample. (b) samples in proportion to popularity and so
over-represents the largest and most orderly projects, the opposite of the owner's two small ones. Transfer is proved
only inside one family of graphs and is worse for small graphs, so small repositories have to be in the sample on
purpose. With groups and known numbers per group, an average over repositories can be weighted back to any mix, which
a convenience sample never allows. Repositories that share history (forks, copies) are one entity and go to the same
side of every split. How many repositories is not in the material. My assumption is about 250 to train on and 50
held out, reasoned so: three lengths by four languages by two packaging habits is 24 groups, and I would not read a
group's figure from fewer than eight repositories trained on and two held out. The first draw revises it.

**Rests on.** D 1.2; D 2.7; D 2.8; D 3.2; D 7.3; N 8.1; N 8.4; assumption; count first: from a first draw of about
twenty repositories, how many each group can supply and their size on disk

**Refuted if.** Held-out results differ between groups by more than they differ from the baselines (the groups are
then different families and one model for all is the wrong aim), or the first draw shows the groups cannot be filled.

### D5. Code structure is extracted as symbols and names, for every version

**Depends on.** D2; demand R6.

**Alternatives.** (a) History only. (b) Imports and folders (now). (c) The symbols a file defines and the names it
refers to, by one parser that works the same way across languages; a name that cannot be resolved is kept as a name
match, a kind of link of its own. (d) A full call graph from each language's own tooling.

**Ruled out.** (a) and (b): local steps reach only as far as there are links, and on our own counts a large share of the right files has no link of those kinds (N 5.5; record: research-tree/build/improve/units/T1/report.md). (d) is not ruled out by the material. It is ruled out by D4: it needs a working build of every repository, which a sample of hundreds cannot have. That is my assumption about what such tooling needs.

**Choice.** (c).

**Why.** A share of the right files has never changed with the asked-about file, and local steps reach only as far
as there are links, so the links have to exist in the data. (b) reaches little of that share on our own counts; in
our one probe the identifiers of a change matched against other files' content reached a good part of it. (d) needs
a working build for every repository and language, which a sample of hundreds cannot have. (c) is uniform and cheap,
and it is honest about what it is: a name match is a different kind of link from a resolved import and is stored as
a different kind, so a model can learn how far to trust each.

**Rests on.** N 5.5; N 11.2; N 13.1; D 9.3; record: research-tree/build/improve/units/T1/report.md;
record: research-tree/build/improve/units/T2/report.md; assumption; count first: on the first draw, the share of the right files
that each kind of link reaches

**Refuted if.** On the first draw, name and symbol links reach no more of the never-co-changed right files than
imports and folders already do.

### D6. Every view is "as of" the moment of the question

**Depends on.** D2; demand R4.

**Alternatives.** (a) Inputs computed once per split. (b) Inputs recomputed per block of changes (now, for history).
(c) Every fact carries its time, and the inputs for a question asked at time t are built from rows dated before t
at the moment the example is loaded.

**Ruled out.** (a): an input computed once per split is either from the future or missing for most earlier rows (D 6.2; D 5.3). (b) is not ruled out; (c) contains it and takes the care out of the hands of each input's author.

**Choice.** (c).

**Why.** A task is an entity, a label and a time, and only what precedes that time may be read. (a) is what left a
content input empty for most training rows. (b) is sound and coarse. (c) makes the rule a property of the loader and
not of each input's author, so a new input cannot leak by being written carelessly, and the same file correctly has
a different neighbourhood at every question.

**Rests on.** D 6.1; D 6.2; D 6.4; D 9.1; D 9.4; N 13.9

**Refuted if.** The leak test of D10 finds an input that changes when the facts dated at or after the question are
removed.

### D7. Three questions, three tables of examples over the same facts

**Depends on.** D2; D6; demand R1.

**Alternatives.** (a) One mixed set of examples. (b) One table per question, each stating its entity, what is known
at the moment of asking, the label and the time.

**Ruled out.** (a): the three questions differ in what is known and in which time bounds the inputs, and a mixed set
has one rule for all (D 9.1).

**Choice.** (b). Change question: the entity is a change and one of its files; known are that file and what changed
in it; the label is the other files of the change; the time is the change. Task question: the entity is a task text
written before the work (an issue or a pull-request description); the label is the files of the change that resolved
it; the time is when the text was written, not when it was resolved. Error question: the entity is an error text (a
failing run's output, or a trace quoted in an issue); the label is the non-test files of the change that fixed it;
the time is when the error occurred.

**Why.** What is known at the moment of asking differs between the three, and the time that bounds the inputs is the
asking time. A commit message is written after the change and often names what was changed, so as a task text it
tells the model something it would not have at asking time; where only commit messages exist they form a separate,
marked tier. That the error question's label is "the non-test files of the fixing change" is my assumption: the file
at fault is the one that had to change, and tests change alongside without being at fault. We hold no error examples
at all, and whether hosts' records of failing runs and issue traces give enough is unknown.

**Rests on.** D 9.1; D 6.1; D 7.1; assumption; count first: per repository of the first draw, the number of task
texts tied to a resolving change and of error texts tied to a fixing change

**Refuted if.** The first draw yields too few error examples to train or even to test on. The error question is
then answered through the task-text path and reported as untested, not claimed.

### D8. Examples are weighted by design: one unit of weight per change, equal weight per repository

**Depends on.** D4; D7.

**Alternatives.** (a) Every file of every change a starting file, unweighted (now). (b) One starting file drawn per
change per pass. (c) Every starting file used, each change's examples sharing one unit of weight; repositories
weighted equally, or by the sample's group weights, in training and in every reported average.

**Ruled out.** (a): drawing by events over-represents what takes part in many events, so a change's share grows with
its size and a repository's with its length (D 2.2; D 2.8). (b) is not ruled out; it is the same correction with more
noise, so (c) is preferred.

**Choice.** (c).

**Why.** The inclusion probabilities are known exactly here: a change of n files yields n starting files. A known
inclusion bias is undone by weighting each unit by one over its probability. The same reasoning fixes the unit of
every reported figure: the repository, then the group.

**Rests on.** D 2.2; D 2.8; D 2.9; D 3.2; D 7.3

**Refuted if.** With the weights, results on small changes fall below the unweighted run's while large changes do
not gain: the weights would then be removing signal, not bias.

### D9. Three separate tests of generalisation, and measures without a low ceiling

**Depends on.** D4; D7; D8.

**Alternatives.** (a) One pooled time split scored by precision in the top ten (now). (b) Three tests, each read per
repository and per group: the future of repositories seen in training; repositories never seen (their own earlier
history is input, their examples never touch the weights); the owner's two private repositories, scored on his PC.
Measures that rank the right files against all others: the share of right files found in the top k and the
reciprocal of the first right file's rank. Precision in the top ten is kept only on the three old repositories, for
the bridge of D1.

**Ruled out.** (a): an aggregate hides segments (D 7.3), and precision in the top ten cannot exceed the number of
right files over ten, about a quarter on our tuning data (record: research-tree/build/improve/units/T1/report.md).

**Choice.** (b).

**Why.** The owner's condition is the second test. A model can pass the first and fail the second, so one figure
cannot stand for both. Each test is also read for right files with and without earlier history with the asked-about
file. Splits follow time, the validation stretch matches what is predicted (the next changes), and the naive
baselines are recomputed on the same examples.

**Rests on.** D 7.1; D 7.2; D 7.3; D 7.4; N 13.6; N 8.4; record: research-tree/build/improve/units/T1/report.md

**Refuted if.** A design for measuring is not refuted by a score. It is shown wasteful if the three tests always
agree; one then suffices.

### D10. The store is profiled and leak-tested before any model reads it

**Depends on.** D2; D6; D7.

**Alternatives.** (a) Trust the extraction and review its code (now). (b) State the keys and dependencies the store
must satisfy and test them on the data; print a description of every repository; run an automatic leak test.

**Ruled out.** (a): leakage is subtle and silently inflates results (D 6.3), and a rule nobody wrote down cannot be
refuted by any data (D 4.2).

**Choice.** (b). Keys: a change is unique in its repository; a change-and-file pair is unique; a path at a time names
one file identity. Inclusion: every version's change exists; every label file is alive at the asking time. The
description, per repository: sizes of changes, share of merges and bulk edits, how much of the right answer each kind
of link reaches. The leak test: for a sample of examples, rebuild the inputs with every fact dated at or after the
asking time removed, and require them to be identical.

**Why.** A dependency can be refuted by data and never proved by it, so the useful act is to state what must hold and
try to refute it at every load. And the first step of a design is to see which patterns the data has: the
description is the input to the model's choices and to D4's groups.

**Rests on.** D 4.2; D 4.5; D 4.6; D 4.9; D 6.3; D 9.2; N 13.8

**Refuted if.** A stated key or inclusion fails on real repositories in a way that is not a fault of the extraction.
The schema is then wrong and is changed before anything is built on it.

### D11. What reaches the models is the store read as a graph, with the change as a node

**Depends on.** D2; D5; demands R1 and R5.

**Alternatives.** (a) A file-to-file graph weighted by counts. (b) The relational entity graph: files, changes,
symbols, task texts and error texts as kinds of node; "touched", "defines", "refers to", "imports", "in folder",
"resolved by" as kinds of link, each with its attributes and its time; no identities.

**Ruled out.** (a): it is the projection again; the join does not give the changes back (D 4.3).

**Choice.** (b).

**Why.** Rows read as nodes and key matches as links lose nothing and leave aggregation to the model. The change
sits between its files as the sale sits between user and product, carrying its own time, size and text. Kinds of
link that mean different things stay different kinds.

**Rests on.** D 9.3; D 4.3; N 13.9; N 13.1; N 13.3

**Refuted if.** The model comparison shows no difference between a model reading (b) and the same model reading (a)
with the same other inputs.

## 4. Consistency across the decisions

Each pair of decisions that touch was checked for contradiction.

- **D3 with D8.** Keeping every change, the very large ones included, would let bulk edits flood the examples. It
  does not: D8 gives a change one unit of weight whatever its size, and D3's attributes let a question leave bulk
  edits out by a stated rule.
- **D2 with D6.** Content stored once per content hash is valid from the change that made that version to the next
  change of the file, so an input built from it is as-of by construction.
- **D5 with D6.** Symbols and references are extracted per version and are dated like everything else.
- **D4 with the owner's privacy rule.** Public repositories can be collected on a rented machine. The two private
  repositories never leave his PC and go through the same pipeline there: the model goes to them, they do not go to
  the model. This also makes them the cleanest never-seen test.
- **D4 with D9.** Repositories are held out before anything is fitted, forks on the same side, so the second test is
  a true test of the owner's condition.
- **D7 with D9.** The task question's time is the asking time, so its time split is made on asking times, not on
  resolving times. It is stated here so that the two are built alike.
- **D1 with D9.** The bridge needs precision in the top ten on the three old repositories; D9 keeps it there and
  only there.
- **D10 with D4.** The per-repository description is what D4's groups are drawn from. That fixes the order of work:
  first draw, description, then the full sample.
- **One tension that stays.** D2 stores content for every version of every file of hundreds of repositories. Whether
  that fits the disk and the time is not known; it is part of the count D4 asks for. If it does not fit, the fallback
  is to keep full content only for the versions that an example or a link actually reads, which loses nothing an
  example uses.

## 5. What it needs from the owner, and the counts to make first

Counts, none of which trains anything:

1. A first draw of about twenty public repositories across the groups: how many each group can supply, their size on
   disk, the time to process them. (D4)
2. On that draw, how much of the right answer each kind of link reaches. (D5, D10)
3. On that draw, how many task texts and error texts are tied to a resolving change. (D7)
4. On our own three repositories, which texts the old task set used. (I9)

His word is needed for: the first draw (a download from public code hosts; its size is what count 1 measures, and the
source and an upper bound are named before it starts); a symbol parser (a small install, named with source and size
when asked); access to the hosts' records of issues and failing runs (an access token of his own, if the public
interface needs one); and later, sending the pipeline's code to the rented machine for the full draw, because this
PC's link is too slow for it.

## 6. What would show the whole hypothesis wrong

- The bridge fails (D1): the new store does not reproduce the old counting baseline on the old held-out changes.
- The first draw's description puts the owner's two repositories outside the range of the public sample on the
  patterns that matter (sizes of changes, reach of each kind of link). Transfer is proved only inside one family
  (N 8.4), so the sample's design would change before any training.
- A stated key fails for a reason that is not a fault of the extraction (D10).

## 7. The independent attack and the answers

(Filled when the checker has reported.)
