# Candidate L: the data side, reasoned from the three questions back (2026-11-26)

Starting point: begin at the three questions the model must answer, define one example of each (what is asked, what
is known at that moment, the right files, the time), find where real labels can come from, and collect only what a
label or an input reads. Entries: `D x.y` in `docs/program/learning/MECHANISMS-DATA.md`, `N x.y` in
`MECHANISMS-NEURAL.md`. Facts: `FACTS-CURRENT-DATA.md` and the records it names.

## 1. The design in ten lines

1. Three question tables, one per question, each row = (asking time, snapshot commit, the asked-about thing, the
   right files, the tier of the text), D 9.1.
2. Labels come from one source for all three: the change that resolved the thing asked about, found by an explicit
   link (issue to pull request to commits), or by a reproduced failing run, never by a guess written after the fact.
3. The store is the raw record itself (the git clone and a tracker export, kept untouched) plus keyed, time-stamped
   tables derived from it by a script that can be re-run; examples are a view rebuilt by joins, D 4.3, D 4.8.
4. Every recorded change is kept as an event with all its files, kinds and sizes; no ending filter, no 2-to-50 rule at
   collection; restrictions are applied at loading and counted, D 1.1.
5. Content, symbols, imports and tests are taken from the snapshot at each asking time for every row, D 9.4; N 5.5.
6. The repository is the unit: drawn at random by strata from a stated frame of public repositories, copies grouped,
   whole repositories held out; the owner's two stay on his PC as a private test only, D 1.2, D 3.2; N 8.4.
7. Time: what is known at t is the default branch's first-parent state at t; inputs are cut where data is loaded;
   every learned statistic is fitted on training repositories and on facts before t, D 6.2, D 6.4, D 9.4.
8. Error question: real tier from pre-fix issue texts with traces and from reproduced fail-before tests; a synthetic
   tier from injected faults, kept separate and marked.
9. Each change counts once (its weight is split across the examples it gives); each repository's total weight is
   bounded; scores are averaged per repository, then across repositories, per segment, against naive baselines.
10. Rebuild the collection; keep the old data frozen as a record and as one regression check.

## 2. What is wrong with the data we have

- **W1. A convenience sample of three, read as general.** Three repositories "taken because they were at hand",
  zulip 82 % of the pooled score. Nothing can be said about repositories in general from it (D 1.2, D 2.7, D 3.1;
  veto V5). A pooled score is mostly one repository's score (D 7.3).
- **W2. No repository is held out.** All three are trained and tested, split only by time (facts sheet). The goal is
  a repository never trained on; a time split inside a seen repository tests the next weeks of a known graph, not a
  new one (N 8.1, N 8.4; V4).
- **W3. Caps at collection.** Only seven file endings are recorded; changes to templates, styles, configuration,
  migrations in other forms, documentation and tests in other languages vanish from both events and labels. A commit
  enters only with 2 to 50 modified code files; merges are dropped. These are the "name up to three colleagues"
  censoring of D 1.1: a right file outside the endings cannot be told from no right file (V2). Added files never
  appear in a label (only modified files are truth, `runbig/card/d4/extract.mjs`, the `eligible` and README task
  lines), although a task often needs a new file.
- **W4. The text is cut to its first line.** `extract.mjs` asks git for `%s`, which is the subject line only, and
  then cuts it to 600 characters. The body of every commit message is lost at collection (D 1.1; P2).
- **W5. Nothing inside the files.** No diff, no content at the time, no symbols, no test relation (facts sheet).
  Everything a model gets is a projection from which the change cannot be rebuilt (D 4.3, D 9.2; V1). The content
  input that was added later was empty for 88 to 99 % of training cells in two repositories: a missing pattern made
  by collection, not by the world, which a model learns as if it meant something (D 5.3, D 3.3).
- **W6. The task-words question has no question.** No issue, no pull request, no link from either to commits. Which
  texts served as task texts is unchecked; if they were commit messages, the text was written after the answer was
  known (D 6.1; V7).
- **W7. The error question has no data at all** (facts sheet).
- **W8. The change question is simulated, and weighted by accident.** A commit of n files gives n examples with the
  same truth, so big commits weigh n times more unless corrected; the 1-over-n correction "was found by trial"
  (facts sheet). It is the inclusion-probability weight of D 3.2 and should be a design rule. The seed is any one
  modified file; which file was touched first, and what was changed in it, is not known (W5).
- **W9. Time is the committer time of a linearised history.** Merges are dropped and commits are sorted by committer
  time. A commit made on a branch and merged weeks later sits in "history" from its committer time on, although it
  was not on the main line until the merge. `count first:` share of commits whose committer-time position differs
  from their first-parent merge position. If large, history inputs see changes nobody on the main line could see
  (D 6.1, D 9.1, D 9.4).
- **W10. Aggregates before the model.** Pair facts as yes-or-no, decayed counts with a chosen half-life, a window of
  the 20 to 32 latest events. Each is an arbitrary aggregation chosen before the model (D 9.2); a yes-or-no fact
  cannot count (N 9.5).
- **W11. Identities as inputs.** The embedding models learned one vector per file of one repository: by construction
  nothing for a file, or a repository, not in the lookup (N 13.7, N 9.10; V6).
- **W12. Nothing stated, nothing tested.** No keys, no automatic leak test, no description of each repository
  (sizes, merges, bulk edits). The leak rule is kept by reading the code (D 4.2, D 4.5, D 6.3).
- **W13. The headline measure hides its own ceiling.** Hits in the top ten over ten cannot pass the number of right
  files over ten (about a quarter on tuning); pooled, not per repository (D 7.3; P7).

## 3. Repair or rebuild

**Rebuild the collection; keep the old data as a record.** Most faults sit at collection (W3, W4, W5, W6, W7, W9):
what was not recorded cannot be recovered from what was (D 9.2: "what was aggregated away cannot be recovered by any
model"; D 1.1). W1 and W2 are faults of the sample, not of any row, so no repair of rows fixes them. A repair would
add columns to a store whose keys and time are themselves in question (W9, W12).

What is kept from the old work: the rename-following file identity (`replay` in `extract.mjs`), the rule "a question
sees only facts strictly before it", the naive baselines and the finding that one-over-n weighting matters. The old
three-repository data stays frozen. One targeted check: the new pipeline, run on FixFlow with the old filters switched
on as a loading rule, must reproduce the old example count and truth sets exactly; a difference shows a fault in one
of the two before any model is trained.

Where the starting point was forced to move: "collect only what is read" sounds like collecting less. It is not. The
history input of every question reads every earlier event, and the label of a later question may read any file. So
the raw record is kept whole (P2), and the starting point governs only two things: what is materialised into
examples, and what is downloaded beyond the clone and the tracker (section 6).

## 4. Components

### C5 first: the examples and labels of the three questions

(Placed first because, from this starting point, every other block exists to serve it.)

**Choice.** Three tables with one shared form: `example(question, repo, asking_time, snapshot_sha, input_ref, tier,
label_change_ref)`, and `label(example, file_id_or_new_path, change_kind A/M/D/R, lines_changed, is_test,
file_kind)`.

*Q1, task words.* Asked: the text of a task. Known: that text as first written, the repository at the snapshot, all
history before. Right files: every file changed by the change that resolved the task, added files included (marked
`new`, unreachable as candidates and counted as such). Time: asking time = creation of the issue; snapshot = the
first-parent state of the default branch at the first commit of the resolving change (the code the developer started
from). Label source: an explicit link, issue to pull request to merged commits, by closing keyword or the tracker's
own link field; the link kind is stored. Tiers of text: A, written before the change (issue body as first written);
B, written with the change (pull request description); C, written after (commit message). Only A is the question;
B and C are separate, marked tiers (V7). `count first:` per repository, the number of issues closed by a linked
change, and the share whose first text predates the change's first commit.

*Q2, a change.* Asked: a change in progress. Known: the files touched so far and their diffs, the snapshot, history
before. Right files: the rest of the change's files. Two tiers. Real partial: in a pull request of several commits,
the first commit (by author time) is the partial change, the rest of the pull request is the label. Simulated partial:
inside one change, each touched file in turn is the seed, with its own diff as input, the rest is the label, and the
change's weight is split across its seeds (C6). Time: asking time = author time of the seed commit; snapshot = its
parent on the main line. `count first:` share of merged pull requests with two or more commits whose first commit
touches fewer files than the whole.

*Q3, an error.* Asked: an error text (a traceback, a failing test's output, a log line). Known: that text, the
snapshot, history. Right files: the files the fix changed, test files marked apart. Three tiers.
R1 real, reported: a pre-fix issue text (tier A of Q1) holding a traceback; label from its linked fix.
R2 real, reproduced: a fix change that adds or alters a test; in a network-off container the new test is run on the
fix's parent; if it fails, its output is the error, the fix's non-test files are the label.
S synthetic: in a training repository, a fault is injected into one function of one file at the snapshot, the
existing tests are run, the failure text is the input, the file is the label. Always marked; never pooled with R1 or
R2 in a score. `count first:` share of linked issues with a traceback in text A; share of test-adding fixes whose new
test fails on the parent in a container (a sample of 50 repositories).

**Depends on.** C1 (event tables, links), C3 (snapshot content and tests), C4 (asking times), C2 (which repositories
have trackers).

**Alternatives weighed.**
- *Keep the old example form (seed file, other modified files).* It serves Q2 only, has no text and no error; its
  seed has no diff (W5, W8). Lost on P1.
- *Commit messages as task texts for Q1.* Plentiful and free, but written after the answer (D 6.1, V7); the words
  name the files the author just edited. Kept only as tier C, a lower bound on what text can do, never as the test.
- *Labels from text similarity or heuristics (an issue matched to a later commit by words or dates).* More examples,
  but the label then depends on the same text the model reads: a test of the heuristic, not of the model (D 6.1). Lost.
- *Only synthetic errors for Q3.* Unlimited and exact labels, but the fault sits where the trace points by
  construction, while real errors often surface far from their cause. The synthetic distribution is our own
  recording system, the "diffusion" of D 1.2. Kept as a training tier, never the test.
- *Only real errors.* Faithful, but `count first`; likely few and drawn from projects that write tracebacks into
  issues and keep tests (D 1.2, a biased convenience sample of errors). Kept as the test tier.
- *Existing public labelled sets* (the kinds: issue-resolution sets built from resolved issues with a base commit, a
  fix and fail-before tests; older bug-report-to-fixed-file localisation sets, mostly for other languages; reproducible
  bug collections with a failing test and its fix). Can give R1/R2 examples at once, with environments already solved.
  Cannot stand for repositories in general: they are curated, few repositories, chosen for what made them easy to
  curate (D 1.2, V5), and public text models may have seen their fixes. Used as an extra test tier with its claim cut to
  those repositories, and their repositories are entered in the copy groups of C2 so none sits on both sides.
  `count first:` per set, repositories, examples, languages, licence, overlap with our frame.

**Rests on.** D 9.1 (entity, label, time), D 6.1, D 4.4 (texts known at different times kept apart), D 1.1, D 1.2;
N 12.7 (the question text and the error text are tokens a model can read).

**Cannot.** It cannot make Q1 or Q3 examples where a project links nothing; such repositories give Q2 only, and that
skews Q1 and Q3 towards projects with a link habit (measured as a stratum, not removed). It cannot know which file a
developer touched first inside one commit. A pull request's first commit is still the developer's choice of when to
commit, not the moment of asking. It cannot recover an issue's first text where the tracker keeps no edit history
(`count first:` share of edited issue bodies); such rows are tier B. It cannot reproduce errors in projects whose
environment will not build offline.

**Refuted if.** Text A of Q1 is present for under a few hundred examples across the frame, or R1 and R2 together give
too few held-out repositories with any Q3 example to average over (`count first`); then Q3 can only be reported per
example on a handful of repositories, and the claim is cut to that.

### C1 What is stored and in which shape

**Choice.** Two layers. The record: each repository's full clone (all refs, merges included) and an export of its
tracker (issues with edit history where offered, pull requests with base, head and commit lists, link fields,
timestamps), kept as downloaded and checksummed. The derived store: keyed tables, one fact per row, time on every row
(D 4.4, D 9.3): `repo`; `commit(sha, author_time, commit_time, parents, on_main_from)`; `file_identity(repo, id)` and
`path_interval(id, path, from_sha, to_sha)`; `change_event(commit, file_id, kind, lines_added, lines_removed,
hunks_ref, file_kind)`, the change as a node of its own carrying its sizes, as the sale in D 9.3; `issue_text(issue,
version_time, text)`; `link(issue, pr_or_commit, kind, source)`; `pr(id, opened, merged, base_sha, commits)`;
`run(id, time, sha, kind R1/R2/S, text)`; per snapshot, `import`, `symbol_def`, `symbol_ref`, `test_of` with validity
intervals; content by git blob hash, never copied. Examples (C5) are views over these.

**Depends on.** C3, C4.

**Alternatives weighed.**
- *One wide example table with features* (the old form). Fast to train on, but a projection; the join back to the
  events does not exist (D 4.3, D 4.8, D 9.2; V1). Allowed only as a derived view for tree models, rebuilt from the
  store.
- *Collect only the fields examples read* (my starting point taken literally). Smaller, but the history input reads
  every event, and a field omitted now cannot be added later without recollecting (D 1.1). Lost; the raw record is
  cheap beside the cost of a second collection.
- *A graph database of the whole as one graph.* Same content as the tables; adds a system and gains nothing the joins
  do not give (D 9.3 says the entity graph is exactly the key joins). Lost; the graph is built at loading.

**Rests on.** D 4.3, D 4.4, D 4.8 (each split shares a key: a commit, a file id, an issue id; so every join is
lossless), D 4.9 (path is kept with its interval in one table, so "a path names one file at a time" is checked inside
one table), D 9.3.

**Cannot.** It cannot keep what the host does not give: deleted issues, rewritten history, CI logs past their
retention. It cannot make the rename-following identity true; it is git's guess at a similarity threshold, an
entity-resolution step (D 1.2) that splits or merges files wrongly at the edges.

**Refuted if.** The regression check of section 3 fails to rebuild the old examples from the new tables (the store
then loses something), or a join of `change_event` with `commit` does not return every recorded change exactly once.

### C2 Which repositories, drawn how, how many, which held out

**Choice.** A stated frame: public repositories on one large host whose main languages are Python or JavaScript or
TypeScript, with a permissive licence, at least one year and some hundreds of commits of history, not archived
(`count first:` frame size per stratum). Strata: size (files), activity (commits per month), history length, and link
habit (share of merged pull requests linked to issues). Draw at random inside each stratum with known probabilities,
so a score can be weighted back to the frame (D 3.2). Copies: repositories that share root commits or a large share of
commit hashes, and forks, form one group; a group is one entity (D 1.2). Numbers (assumption, to be recomputed from the
counts): about 1,000 training repositories, 100 validation, 200 test, drawn by group; small repositories over-drawn so
the owner's kind is well inside the sample. The owner's two repositories are test only, on his PC, never trained on,
with their strata computed so it can be said where they sit in the frame. Zulip enters only if drawn.

**Depends on.** C5 (link habit as a stratum), C7.

**Alternatives weighed.**
- *Keep the three at hand.* V5 and V4; no claim beyond them (D 3.1).
- *Crawl from known repositories by dependency or star links.* Easy, but exploration over-draws the well-connected,
  popular projects (D 2.3, D 2.8), the opposite of the owner's small private kind.
- *Only repositories that link issues well* (what my starting point would pick, since they give the most labels).
  More Q1 and Q3 examples per download, but it cuts the frame to a habit and its claim with it (D 2.7). Kept as one
  stratum, over-drawn, with weights known.
- *Public labelled sets as the sample.* Same fault, smaller (C5).

**Rests on.** D 1.2, D 2.6 (we have a list, so random selection is available), D 2.7, D 3.1, D 3.2; N 8.1, N 8.4
(transfer is only claimed inside the family sampled; small graphs transfer worse, so small repositories need their own
stratum and scores).

**Cannot.** It cannot sample private repositories: the owner's kind is reached through small public ones and checked
on his two. It cannot cover languages outside the three. A host's search index is itself a recording system with its
own reach (D 1.1). Weights back to the frame correct averages only (D 3.2).

**Refuted if.** The owner's two repositories fall outside the sampled strata on size, history or change sizes, or a
model's score on them lies outside the spread of the test repositories of their stratum (then the frame does not
stand for his kind).

### C3 What is taken from the code itself

**Choice.** For every snapshot that some example uses: the content of every file (by blob hash, all files, with kind
and size), imports resolved per language, symbol definitions and references (a parser per language, run offline),
test-to-code relations (test file names, imports from tests), folder structure. Each fact keyed to the blobs it came
from, so unchanged files reuse earlier work. The diff of every change event (hunks) is kept for Q2 inputs and label
sizes.

**Depends on.** C1, C4.

**Alternatives weighed.**
- *History only* (the old inputs). Cannot reach right files that never changed with the seed: 30, 66 and 21 % of them
  (facts sheet). Lost on P6.
- *Content at the latest commit only.* Cheap, but content at a later time than the question (V3).
- *Text embeddings computed at collection.* Fixes the encoder before any split and stores an aggregate (D 6.4, D 9.2).
  Lost: raw content is stored; embedding is a step of the model pipeline, fitted or chosen on training repositories.

**Rests on.** N 5.5 and N 11.1 (a model cannot reach beyond its inputs), N 12.5 (graph retrieval and language-model
features), D 5.3 (content present for all rows or none, never by accident).

**Cannot.** Static imports and references miss dynamic dispatch, string-built imports, framework wiring, and links
between languages (a template and its view). Parsers fail on some files; each failure is a recorded row, not a gap.
How much of the right answer each kind reaches is not known until counted (`count first:` per kind of link, share of
right files within one and two hops of the seed or of files named in the question).

**Refuted if.** Content, symbols and tests together reach no more of the right files absent from history than imports
and folders reached (8.5, 45, 11 points); then the cost buys nothing for P6.

### C4 Time and leaks

**Choice.** Three times per change: author time, commit time, and the time it reached the main line (the merge time of
its first-parent ancestor). Facts known at t are those on the main line at t. Asking times as in C5. A loader
returns, for an example, only rows with time before its asking time, and the snapshot is the main-line commit at that
time (D 9.4). Per-repository statistics (word weights, normalisers, counts) are computed by the loader from facts
before t; anything learned across repositories (encoders, vocabularies, the model) is fitted on training repositories
only (D 6.4). Text encoders pretrained on public code may have seen a repository's future: the owner's private
repositories, which no outside model saw, are the check on that.

**Depends on.** C1.

**Alternatives weighed.**
- *Committer-time order over all commits* (the old rule). Simple; can show branch work before it was visible (W9).
- *Author time.* Earlier still; same fault, larger.
- *Precomputed time-decayed features.* Fixed windows chosen beforehand, and a leak if computed before the split
  (D 6.2, D 9.2). Lost.

**Rests on.** D 6.1, D 6.2, D 6.4, D 7.1, D 9.1, D 9.4; N 13.9 (sampling and aggregation are time-dependent).

**Cannot.** It cannot know what a developer saw on unmerged branches or in conversation. It cannot remove what a
pretrained encoder memorised; it can only measure the gap between public and private test repositories.

**Refuted if.** The automatic leak test (C8) finds any input row dated at or after its example's asking time, or the
private-against-public gap for text inputs exceeds the gap for history inputs by more than the spread between
repositories (a sign the encoder knows the public answers).

### C6 How examples are drawn and weighted

**Choice.** Each resolving change carries total weight one in its question table, split across the examples it gives
(a Q2 change of n files gives n seeds of weight 1/n each). Each training repository's total weight is bounded, so that
no repository dominates the gradient (bound computed on validation repositories against the seven measures; assumption
until computed). Bulk edits (formatting, renames, vendoring, mass changes; detected by share of files, share of
whitespace-only hunks) are kept and flagged; they enter labels only as a separate stratum. Candidates are all files at
the snapshot; negatives for training are drawn from them excluding every right file (N 13.6). Neighbours for graph
models are drawn per relation kind (C9).

**Depends on.** C5, C2.

**Alternatives weighed.**
- *Every seed weight one* (old form). Large commits count n times (W8).
- *Equal weight per repository.* Treats a repository of 50 changes like one of 50,000; reasonable for evaluation,
  noisy for training. Kept for evaluation (C7), not training.
- *Drop bulk edits.* Cleaner, but a cap the world cannot be told from (D 1.1). Flagged instead.
- *Hard negatives from a baseline's top list.* Measured to hurt on this data (`improve/units/T1/report.md`, item 6).
  Not chosen; may be revisited by the model hypothesis.

**Rests on.** D 3.2 (weight by inverse inclusion), D 2.9 (a known bias can be undone), N 13.6, the trial finding on
one-over-n (facts sheet).

**Cannot.** Weights correct averages, not everything else (D 3.2). The bound per repository is a parameter still to be
measured.

**Refuted if.** On validation, the one-over-n weight does not move the per-repository score relative to unit weight;
then the weighting is not the mechanism it was taken to be.

### C7 Splits, tests of generalisation, baselines, measures

**Choice.** Two axes together. Across repositories: train, validation and test repositories by copy group (C2). In
time: every example, in every repository, sees only its past (C4); within training repositories, the last stretch is
held for early stopping, with a gap the length of a typical change's life (D 7.1). Test repositories are scored on
their whole span, each question with its own history only, which includes the cold start: segments by history length
at asking time. Baselines per question (D 7.2): Q1, word search of the text over paths and content, files named in
the text; Q2, co-change counting with one-over-n weight, same folder, imports, recently changed; Q3, files in the
trace's frames, the innermost frame in project code, then counting. Measures: the rank of each right file among all
candidates, recall at 1, 5, 10 and 20, reciprocal rank of the first right file; averaged per example, per repository,
then over repositories (weighted back to the frame and unweighted). Segments (D 7.3): question tier, with or without
earlier co-change, file kind, repository stratum, history length, change size, new-file share.

**Depends on.** C2, C4, C5.

**Alternatives weighed.**
- *Time split inside each repository only* (old). Does not test the goal (W2).
- *Random split of examples.* Never (D 6.2; V3).
- *Hits in the top ten over ten.* Capped by the number of right files (W13); kept only beside recall.

**Rests on.** D 6.1, D 7.1, D 7.2, D 7.3, D 7.4 (drift: score by age of repository and period), N 13.6 (ranked against
all non-right candidates), N 8.4.

**Cannot.** A score on 200 test repositories stands for the frame, not for languages or hosts outside it. Rare
segments (few Q3 R1 examples) give wide intervals.

**Refuted if.** The ordering of methods on validation repositories does not hold on test repositories of the same
strata (the split then does not test generalisation stably).

### C8 Checks on the data

**Choice.** Stated keys and dependencies, each tested on every build and never called proved (D 4.2, V9): commit hash
unique per repository; at any commit a path names one file id (no overlapping intervals); every label file is alive
at the snapshot or marked `new`; every change event's commit is on the main line or marked; every link points to an
existing change. Leak tests by construction (D 6.3): (a) build each example's inputs from the store truncated at its
asking time and from the full store, and require identical inputs; (b) plant rows dated after the asking time and
require that none reaches the loader output; (c) a model given shuffled labels must fall to the random baseline.
Profiling per repository (D 4.5): sizes, change-size distribution, merge share, bulk share, link rate, parse failures,
the share of right files outside any candidate set. Missing values are recorded as indicators, and their pattern is
compared between training and test repositories (D 5.3). The regression check of section 3.

**Depends on.** C1, C4, C5.

**Alternatives weighed.**
- *Reading the code to keep the leak rule* (old). Silent failures are not found by reading (D 6.3).
- *Checks on a sample of rows.* Cheaper; a dependency checked on a sample is weaker still than one checked on the
  whole (D 4.5, the open questions on sampled profiling). Full checks are affordable on tables of this size.

**Rests on.** D 4.2, D 4.5, D 4.6 (a small canonical set of rules to enforce), D 4.7 (rules expressed as keys of their
own tables cost nothing), D 5.3, D 6.3.

**Cannot.** Find a leak through the world, such as a pretrained model's memory (C4). Prove a key.

**Refuted if.** Test (a) passes while a planted future row still changes a score; the test then does not cover what it
claims.

### C9 What is handed to a model

**Choice.** Per example, a typed subgraph at its asking time, built by the loader: the question node (text, seed files
with diffs, or error text), candidate file nodes with their content at the snapshot, change-event nodes with their
times and sizes (not aggregated), and typed directed links: imports, symbol references, tests, same folder, touched-by
event, mentioned-in-question (a path, file name or symbol in the text), in-trace (a frame names the file). No file or
repository identity as a feature; only content, structure, relations to the question and times relative to the asking
time (N 9.10, N 10.5). A flat feature table for tree rankers is a derived view of the same subgraph, rebuilt, never
stored as the record.

**Depends on.** C1, C3, C4, C5.

**Alternatives weighed.**
- *A precomputed feature table only.* Arbitrary aggregations (D 9.2; V1). Kept as a view.
- *The whole repository graph at once.* Simpler for small repositories; impossible for large ones and blind to time
  unless cut per example (D 9.4, N 14.1).
- *Identity embeddings.* Transductive (N 13.7; V6). Lost.

**Rests on.** D 9.3, D 9.4; N 9.5 (events as nodes so that a model can sum and count), N 13.1 and N 13.9 (kinds kept
apart, relation types stated), N 12.7, N 10.5 (relative position to the question node, not identity).

**Cannot.** Decide the model; it only states what the model may read. Neighbourhoods of large repositories still need
sampling, which biases what is seen (D 2.10, N 14.2, N 14.3).

**Refuted if.** A model reading this subgraph cannot beat the same model reading the flat view on validation
repositories; then the extra structure is not carrying information the view lacks.

## 5. Own profile

- **P1, three questions as tasks: open on a count.** All three have a defined example, asking time and label source
  by construction; whether Q1 tier A and Q3 R1/R2 give enough held-out repositories depends on link rates and
  reproduction rates (`count first`). D 9.1, D 6.1.
- **P2, every event as itself: by construction** for git and the tracker (raw record plus keyed tables, all file
  kinds, merges, sizes); **in part** for errors: CI logs past retention cannot be kept. D 1.1, D 4.3, D 4.4, D 9.3.
- **P3, an unseen repository: open on a count.** Stated frame, random draw by strata, copy groups, whole repositories
  held out; the owner's kind is reached through small public repositories and only checked on his two. D 2.6, D 3.2;
  N 8.4.
- **P4, only what was known: by construction** for repository facts (main-line time, loader cut, fitted on training);
  **in part** for texts edited later and for pretrained encoders' memory, which is measured, not removed. D 6.4, D 9.4.
- **P5, kinds apart: by construction.** Each table and link kind is collected apart, with direction, source and what
  it misses written in C3. N 13.1.
- **P6, beyond history: by construction** in presence (content and structure for every row at its time);
  reach is counted before it is relied on (C3).
- **P7, trustworthy: by construction** for the stated checks and leak tests; per-segment scores against baselines.
- **Weakest: P1 on the error question.** Real labelled errors are likely rare and drawn from projects that report
  tracebacks or keep runnable tests; the synthetic tier is plentiful but its errors are ours, not the world's (D 1.2).

## 6. Cost

- **Frame list.** Repository metadata from the host's public interface or a public archive of its events: `count
  first` size; on the order of gigabytes for an archive, much less through the interface. Needs his word, with source
  and size named.
- **Clones.** About 1,300 repositories at an assumed median of 100 MB packed: about 130 GB, plus the large tail
  (`count first:` packed sizes of the drawn repositories). On a rented machine with his yes, not on his PC (32 GB free).
- **Tracker exports.** Text only, small per repository; the limit is the host's request rate: `count first` time at
  that rate.
- **Content work.** Parsing and symbol extraction per distinct blob, reused across snapshots: `count first:` distinct
  blobs at all asking times. CPU work on the rented machine; hours, not card time.
- **Error tier R2.** Building environments and running tests in network-off containers: the costliest step, CPU hours
  per repository; start with a sample of 50 to count the success rate. Dependency packages would have to be fetched
  before the network goes off: each such fetch is a download needing his word.
- **Public labelled sets.** Each named with source and size before download, with his word.
- **Owner's two repositories.** Extracted on his PC by the same script; nothing leaves it; held-out truth stays there.
- **Training budget.** Four large cards for eight hours bounds the model work, not this collection; the example
  count is sized to it after the counts.
- **His word needed for:** the frame list, every download, the rented machine, the dependency fetches for R2.

## 7. Counts to make first

1. The frame: number of public Python/JS/TS repositories meeting the criteria, by size stratum, and their link rate
   (share of merged pull requests linked to an issue). This sets whether Q1 and Q3 can be held out by repository.
2. On a pilot of 50 drawn repositories: Q1 tier-A examples per repository (linked issues whose first text predates the
   change); Q3 R1 share (traceback in tier-A text); Q3 R2 share (new test fails on the parent in a container).
3. The owner's two repositories on the same strata (size, history, change sizes, link rate), on his PC.
4. On the old data: what served as task text; the share of right files dropped by the seven endings and by the 2-to-50
   rule; the share of commits whose committer-time order differs from main-line order (W9).
5. Distinct blobs at asking times per repository (content cost), and the reach of each link kind (C3).
6. Per public labelled set: repositories, examples, languages, licence, overlap with the frame.

## 8. Coverage

**Used:** D 1.1, D 1.2, D 2.3, D 2.6, D 2.7, D 2.8, D 2.9, D 2.10, D 3.1, D 3.2, D 4.2, D 4.3, D 4.4, D 4.5, D 4.6,
D 4.7, D 4.8, D 4.9, D 5.3, D 6.1, D 6.2, D 6.3, D 6.4, D 7.1, D 7.2, D 7.3, D 7.4, D 9.1, D 9.2, D 9.3, D 9.4.

**Set aside:**
- D 2.1, D 2.2, D 2.4, D 2.5: designs for sampling nodes and edges inside one graph; our sampled unit is the whole
  repository, recorded in full. They bear on neighbourhood sampling at loading, which is the model's side (N 14).
- D 3.3: modelling the unseen part as missing data; cited in W5 only as the warning that gaps are not random; no
  imputation is planned, since content is collected for every row.
- D 3.4: modelling the observation process jointly; worth it for the link-habit bias of Q1 and Q3, but it needs a
  model of linking that the counts must come first for.
- D 4.1: redundancy anomalies; the store holds one fact per row, so it does not arise.
- D 5.1, D 5.2: dropping or imputing incomplete rows; nothing is dropped, and missing inputs are indicators (C8).
- D 7.5: feature engineering as leverage; a model-side choice, and the store keeps the raw events from which any
  causal feature can be built.
- D 8.1, D 8.2: tree models' extrapolation and multi-step forecasting; model-side. D 8.1 does warn that a tree ranker
  on counts will not carry to repositories with longer histories than it trained on, which the history-length strata
  of C2 and C7 expose.
