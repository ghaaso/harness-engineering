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

## 2. The decisions

### D1. Rebuild the data from scratch; do not repair the current set

**Alternatives.** (a) Keep the current data and add inputs. (b) Re-extract the same three repositories with content
added. (c) Rebuild: a new store and a new collection, with the three old repositories passed through the same new
pipeline.

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

**Alternatives.** (a) A table of pairs of files that changed together. (b) Lists of files per commit (what is stored
now). (c) A relational store: repository; change (time, author, message, parents, and the pull request it belongs to
where the host records one); file (an identity that survives renames); file version (which change, which file, added,
modified or deleted, the lines changed, the content at that point by its content hash); symbol (defined in which file
version); reference (which file version names which symbol or imports which file); task text and error text, each
with its own time; and the link from a task or an error to the change that resolved it.

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

**Alternatives.** (a) Filter while collecting, as now: no merges, 2 to 50 code files, seven file endings. (b) Collect
every change and every file, store the attributes a filter would use (number of files, merge or not, bulk edit or
not, kind of file), and apply any filter later, per question, as a stated rule.

**Choice.** (b).

**Why.** A filter at collection caps what can be recorded, like a survey that allows three names: afterwards the cap
looks like a property of the world. Teams package work differently (squashed, mixed, bulk edits), so one fixed cap
means different things in different repositories. Keeping the raw record and the attributes lets each question state
its own rule, lets the rule be varied, and makes its effect measurable.

**Rests on.** D 1.1; D 1.2; D 2.7; record: research-tree/build/runbig/card/d4/README.md

**Refuted if.** It removes a hidden choice, so no score refutes it. It is shown unnecessary if results on held-out
repositories do not move when the size rule is varied between sensible settings; the rule can then be fixed.

### D4. A designed sample of repositories, with whole repositories held out

**Alternatives.** (a) The three we have. (b) The most popular public repositories. (c) A sample drawn over stated
groups (length of history; main language; application, library or tool; how the team packages changes), a fixed
number per group, each repository's group recorded.

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

**Alternatives.** (a) History only. (b) Imports and folders (now). (c) The symbols a file defines and the names it
refers to, by one parser that works the same way across languages; a name that cannot be resolved is kept as a name
match, a kind of link of its own. (d) A full call graph from each language's own tooling.

**Choice.** (c).

**Why.** A share of the right files has never changed with the asked-about file, and local steps reach only as far
as there are links, so the links have to exist in the data. (b) reaches little of that share on our own counts; in
our one probe the identifiers of a change matched against other files' content reached a good part of it. (d) needs
a working build for every repository and language, which a sample of hundreds cannot have. (c) is uniform and cheap,
and it is honest about what it is: a name match is a different kind of link from a resolved import and is stored as
a different kind, so a model can learn how far to trust each.

**Rests on.** N 5.5; N 11.2; N 13.1; D 9.3; record: research-tree/build/improve/units/T1/report.md;
record: research-tree/build/improve/units/T2/report.md; count first: on the first draw, the share of the right files
that each kind of link reaches

**Refuted if.** On the first draw, name and symbol links reach no more of the never-co-changed right files than
imports and folders already do.

### D6. Every view is "as of" the moment of the question

**Alternatives.** (a) Inputs computed once per split. (b) Inputs recomputed per block of changes (now, for history).
(c) Every fact carries its time, and the inputs for a question asked at time t are built from rows dated before t
at the moment the example is loaded.

**Choice.** (c).

**Why.** A task is an entity, a label and a time, and only what precedes that time may be read. (a) is what left a
content input empty for most training rows. (b) is sound and coarse. (c) makes the rule a property of the loader and
not of each input's author, so a new input cannot leak by being written carelessly, and the same file correctly has
a different neighbourhood at every question.

**Rests on.** D 6.1; D 6.2; D 6.4; D 9.1; D 9.4; N 13.9

**Refuted if.** The leak test of D10 finds an input that changes when the facts dated at or after the question are
removed.
