# Candidate N: the data side, from the code as it stands (2026-11-26)

Starting point given: begin from the repository as it stands at one moment (its files, their text, names and
structure); history is one signal among several. Read in full before writing: `MECHANISMS-DATA.md`,
`MECHANISMS-NEURAL.md`, `CRITERIA.md`, `FACTS-CURRENT-DATA.md`, records r58-0017 and r58-0021. Records opened to
check facts: `research-tree/build/runbig/card/d4/extract.mjs`, `.../d4/README.md`,
`research-tree/build/improve/units/T1/report.md`, `research-tree/build/improve/CANDIDATES.md` lines 20-30.

Where the material forced me off the starting point, it is said in the block (mainly C5 and C3): labels cannot come
from a snapshot, and on two of three repositories history reaches more right files than code structure does.

## 1. The design in ten lines

1. Store each repository as what git already is: content-addressed blobs and trees, every commit with its full change,
   nothing filtered; beside it, separate tables for pull requests, issues, error texts and the facts parsed from each
   blob. Lossless by construction (D 4.3, D 4.4, D 9.3).
2. The input of every question is the snapshot at asking time t: every file's content, names, symbols, references,
   imports, tests and folders, as a typed graph; history before t enters as event nodes, one input among several.
3. Labels come from events (D 9.1): files of a unit of work (pull request, else commit) for the change question;
   files of the pull request that closed an issue opened before work began, for task words; for errors, issue
   tracebacks linked to a fix, then real fixes re-run in containers, then mutations of a snapshot, each a marked tier.
4. Repositories are drawn at random from a stated frame, stratified by size and by history length, small and short
   histories over-drawn with known probabilities and weighted back (D 3.2).
5. Whole repositories are held out; forks and copies are merged into one entity first (D 1.2). The owner's two
   repositories are test only, never trained on. One more held-out stratum: repositories created after the text
   encoder's training cut-off.
6. Time: every fact carries the time it became known; the loader builds each input from facts dated before t and
   asserts it (D 9.4); everything learned from data is learned on training repositories only (D 6.4).
7. One unit of work weighs one; its n examples weigh 1/n each; each repository weighs by its inclusion weight.
8. Scores are ranks of the right files against all files of the snapshot, per repository then averaged, per stratum
   and per segment (with or without earlier co-change; with or without a structural link), beside naive baselines.
9. Keys and dependencies are stated and tested on every load; a planted future fact tests for leaks.
10. Model input: the question, the snapshot graph with relative positions to the question's anchor files, raw content
    for an encoder trained on the cards, repository descriptors; no stored file or repository identity.

## 2. What is wrong with the data we have

- **F1. Three repositories, at hand, also used to test.** Taken by convenience; all three in training and testing,
  split by time inside each; zulip is 82 % of the pooled score. Nothing can be said about a repository never trained
  on. (FACTS; D 1.2, D 2.6, D 3.1; N 8.1, N 8.4; vetoes V4, V5)
- **F2. The code as it stands is not in the data.** No file content, no symbols, no references, no test links; only
  imports and folders. A content embedding was empty for 88 to 99 % of training cells in two repositories: present by
  accident of collection. Right files with no earlier co-change (30 / 66 / 21 %) can only be reached by these. (FACTS;
  D 5.3, D 9.2; N 5.5, N 9.10)
- **F3. The message is the subject line only.** `extract.mjs` asks git for `%s`, which is the subject line; the body
  is never read, and the 600-character cut then applies to the subject. The facts sheet's "cut to 600 characters"
  understates the loss. (record: `extract.mjs` line `--format=%x01%H%x02%ct%x02%s%x03`; D 1.1, D 9.2)
- **F4. Records capped and dropped at collection.** Commits with fewer than 2 or more than 50 modified code files are
  not questions; merges are dropped; files outside seven endings are invisible (templates, styles, configuration,
  migrations in other forms, documentation). Whether a right file was outside the endings can no longer be told from
  the world. (FACTS; D 1.1, the "up to three colleagues" case; V2)
- **F5. Imports are resolved partly and silently.** Bare JavaScript specifiers (packages, path aliases) are dropped;
  a Python module name that matches two paths is dropped; multi-line imports are missed by a line regex; a failing
  `git grep` gives an empty edge list with no mark. Missing edges cannot be told from absent ones. (record:
  `extract.mjs` `resolveImports` and the `catch` that sets `edges = []`; D 1.1, D 5.3)
- **F6. Events stored as projections.** A commit is stored as a list of file events; its content change is gone, and
  the models were given pairs and yes-or-no facts derived from it. A pair table cannot be joined back to the commits
  (D 4.3 counterexample, D 4.8); the commit, an event, became an edge (D 9.3 says it is a node). (FACTS; V1)
- **F7. No unit of work above the commit.** No pull request, no issue. A pull request of five commits is five
  unrelated questions; the right files of one task are split across them. (FACTS; D 1.2 entity resolution)
- **F8. Task words are not defined.** Which texts served as task texts is unchecked; commit messages are written after
  the change. (FACTS; D 6.1; V7)
- **F9. The error question has no data.** (FACTS; P1)
- **F10. New files are never right files.** Truth is the other *modified* files; an added file is never a label. The
  share of real work this hides is unknown. (record: `d4/README.md`, task definition; D 1.1)
- **F11. Weighting found by trial.** 1/n per commit carries much of counting's strength, but it was found, not
  derived. It is the inclusion correction for incident sampling: a commit of n files is sampled n times (D 2.2,
  D 3.2). (FACTS)
- **F12. No stated keys, no automatic leak test, no description of each repository.** The leak rule holds by reading
  the code. (FACTS; D 4.2, D 4.5, D 6.3, D 7.3)
- **F13. Committer time orders events.** A rebase rewrites committer time; author time and push time are not kept.
  Order is right for what was in the branch, not always for when work happened. (record: `extract.mjs`, `ct`;
  D 1.1, D 9.1)

What it does well and is kept: the strict per-block cut-off (D 6.1, D 9.4); a file lineage across renames (D 1.2);
naive baselines beside each model (D 7.2); a ceiling-aware view of the score.

## 3. Repair or rebuild

**Rebuild the store and the collection; keep the leak rule, the lineage logic and the baselines.**

Reason: the faults that matter are losses at collection (F2, F3, F4, F6, F7, F9, F10). By D 9.2 what was aggregated
away cannot be recovered by any model, and by D 1.1 a cap cannot be undone afterwards. A repair would re-collect
anyway. F1 needs new repositories in any case. The cost of rebuilding is small beside the cost of the drawn sample
(section 6), because the new store is git's own object model plus parsed tables, not a new invention. The three
current repositories go through the new pipeline: the owner's two as held-out test repositories, zulip as an extra
named test repository outside the frame (it was not drawn, so it is reported apart; D 3.1).

What a rebuild cannot do: it cannot make the old scores comparable with the new; the old numbers stay as their own
record.

## 4. Components

### C1. What is stored and in which shape

**Choice.** A relational store where each table states one kind of fact, split by the time the fact becomes known
(D 4.4):
- `blob(hash -> bytes)`, `tree_entry(tree, path -> blob, mode)`: git's content-addressed form. A snapshot at any
  commit is a key, not a copy; only changed blobs cost space.
- `commit(sha -> tree, parents, author_time, committer_time, full message)`; `change(commit, parent, old_path,
  new_path, status, old_blob, new_blob, lines_added, lines_removed)`: every change, merges included, no filter.
- `blob_fact(blob, parser_version -> language, parse_status, symbols defined, identifiers used, import specifiers,
  docstrings)`: a function of the blob alone, computed once per blob.
- `resolved(tree, path, specifier -> target path | unresolved reason)`: depends on the tree, kept apart from
  `blob_fact` so that each dependency lives inside one table (D 4.9).
- `pr(id -> created, base_sha, head_sha, merged_at, merge_sha, title, body_at_creation | body_now, edited_flag)`,
  `pr_commit(pr, sha)`, `issue(id -> created, closed, title, body_first, body_now, labels)`, `issue_link(issue, pr,
  how_linked, link_time)`, `comment(issue|pr, time, text)`.
- `error(id -> text, source tier, time, snapshot tree, producing run)`, `error_fix(error, unit of work)`.
- `lineage(path at commit -> lineage id, rule, similarity)`: a derived table, rebuildable, never a model input.
- `repo(id -> frame, stratum, inclusion probability, root commit hashes, fork-group, licence, created)`.
**Depends on.** C2 (which repositories), C4 (time columns).
**Alternatives weighed.**
- *Per-commit file lists (today).* Lost: content, diffs, units of work; a projection (D 4.3, D 9.2; V1).
- *A feature table per (question, candidate).* Fast to train on; "features chosen arbitrarily", "issues with
  point-in-time correctness" (D 9.2); every new feature needs re-collection.
- *A graph database of files and co-change edges.* Makes the commit an edge and loses its attributes (D 9.3); the
  multiset of events behind an edge is gone, which a sum aggregation needs (N 9.5).
- *Full snapshot copies per question.* Lossless but grows with questions times repository size; content addressing
  gives the same with deduplication.
**Rests on.** D 4.3, D 4.4, D 4.7 (a dependency as a key costs nothing; `blob -> facts` is a key), D 4.8, D 4.9,
D 9.3; N 13.9.
**Cannot.** Store what git never recorded: local edits, abandoned work, the order of edits inside a commit, who read
which file. Pull-request and issue bodies edited later keep only their present text unless the edit history is
obtained (count first: share of issue bodies edited after the linked PR was opened). A parser version change makes
`blob_fact` a new set; old rows are kept by version.
**Refuted if.** A join of `change` and `tree_entry` fails to rebuild `git diff` for a sampled set of commits; or the
store per repository exceeds the bare clone by more than a small factor (count first: ratio on the three current
repositories).

### C2. Which repositories, drawn how, how many, which held out

**Choice.** A random draw from a stated frame: public repositories with at least one file in the target languages
and at least one change after a date, listed from a public archive index (source and size named at the owner's step,
section 6). Strata: file count (four bands from tens to tens of thousands) crossed with history length (commits
before the latest snapshot: under 100, 100-1,000, over 1,000). Small and short strata are over-drawn on purpose
(the owner's kind; the starting point's target), with the inclusion probability of each repository kept, so that
any average can be weighted back to the frame (D 3.2). Forks and mirrors are grouped by shared root commit and by
shared blob share before drawing; a group is one entity (D 1.2). Held out: about one fifth of repositories, whole,
drawn within each stratum; plus the owner's two repositories; plus a stratum of repositories created after the text
encoder's cut-off (no pretrained model can have read them).
How many: set by a computation, not chosen. From a pilot, the spread of per-repository scores of a naive baseline
gives the number of held-out repositories per stratum needed for an interval of a stated width (count first). As an
assumption until then: about 1,500 training and 300 held-out repositories, which the compute in section 6 allows.
**Depends on.** C1, C7.
**Alternatives weighed.**
- *Repositories at hand (today).* Convenience; cannot stand for anything (V5; D 3.1).
- *Snowball through dependencies or stars.* Reaches high-degree, popular repositories (D 2.3, D 2.8); the owner's
  kind (small, private) is what it under-reaches.
- *A ready benchmark set.* Chosen by others by unknown rules (D 1.1, "how the data is actually obtained"); likely in
  pretrained encoders' training data.
- *Uniform random from the frame.* Unbiased for the frame, but most public repositories are tiny with no history;
  too few examples of mid-sized work. Stratified with known probabilities keeps unbiasedness (D 3.2) and puts
  examples where needed.
**Rests on.** D 1.2, D 2.6 (a frame is needed for random selection), D 2.7 (the goal, an average over repositories,
decides the design), D 3.1, D 3.2; N 8.1, N 8.4 (transfer is proved only inside one family: the frame defines the
family we may claim).
**Cannot.** Include private repositories: the owner's kind is inside the frame by size and history only, not by
being private (stated limit, P3). Say anything outside the frame's languages. Weights correct averages and totals
only (D 3.2), not every statistic. A public frame is itself "a biased convenience sample" of all code (D 1.2).
**Refuted if.** The owner's two repositories score outside the spread of held-out repositories of their stratum by
more than the interval: then the frame does not contain his kind.

### C3. What is taken from the code itself

**Choice.** For every blob: a full parse (a grammar parser per language), giving definitions, identifiers used,
imports with their raw specifier, string literals that look like paths or routes, docstrings and comments, size,
language, parse status. For every snapshot: resolution of imports and of identifier uses to defining files, with
the reason when unresolved (package, alias, ambiguous, dynamic); test-to-code links by import and by name
convention, each marked by rule; folder tree; file path tokens. All file kinds are kept; parse depth differs by kind
and is recorded (a template is text plus path; a Python file is fully parsed).
Where the material moves me: the measured reach of structure is below history on two of three repositories
(imports 25 / 18 / 25 %, folder 29 / 18 / 37 %, names 6-9 %, history 70 / 34 / 79 %; T1 report). So code structure
is not the base everywhere. It is the base where history is short (the clinic: history 34 %) and the only base for a
repository with no history; history stays an input (C9). Reference-level reach has never been measured: count first.
**Depends on.** C1, C4.
**Alternatives weighed.**
- *Imports and folders only (today).* Silent drops (F5); reach measured as low.
- *A language server per snapshot.* More precise resolution; needs each project's dependencies installed and per
  snapshot run; cost grows with snapshots times repositories. Kept for a subset only if the count shows that grammar
  resolution misses much (count first: share of uses unresolved by the grammar method).
- *Text only (embeddings of files, no parse).* Covers every file kind; loses the edges a model needs to place a file
  relative to the question (N 9.7, N 10.5); position is not recoverable from text.
**Rests on.** N 5.5 and N 11.1 (a model sees only what its inputs and reach give it); N 9.10 (structure-aware inputs
are inductive); N 12.5; D 1.1 (what counts as a link differs by source, so each link kind keeps its rule); D 5.3.
**Cannot.** See links made at run time: dependency injection, dynamic imports, string-keyed registries, HTTP routes
between front end and back end, database tables shared by two files. These are where co-change history knows what
code does not. Resolution is a heuristic; an edge is "not yet refuted", never proved (D 4.2).
**Refuted if.** Over the right files with no earlier co-change, the union reach of all code links (references,
tests, path literals, names) at two hops is not above the imports-and-folders reach by a margin that matters (count
first). Then code structure adds candidates no better than folders, and the starting point weakens to "content
text only".

### C4. Time and leaks

**Choice.** Every row carries the time it became known: author time and committer time for commits, creation time
for issues and pull requests, first-body and present-body separately, run time for errors. The asking time t of a
question is defined per question (C5). The loader builds every input from rows with time strictly before t and from
the snapshot of the stated commit, never from anything later; it asserts this per example and fails loudly (D 9.4).
Every statistic learned from data (vocabulary, idf weights, normalisers, the encoder's fine-tuning) is learned on
training repositories, and inside a training repository on its training period only (D 6.2, D 6.4). Commits ordered
by the graph (parents first), committer time as tie-breaker; rebased branches flagged where author and committer
times disagree by much (F13).
A leak specific to this starting point: a pretrained code encoder may have read the public held-out repositories,
fixes included. Held out therefore includes a stratum created after the encoder's cut-off, and the owner's two
repositories, which no outside model has seen.
**Depends on.** C1, C5.
**Alternatives weighed.**
- *A cut per block of 10-20 commits (today).* Correct by reading code; tied to one repository's commit order; no
  per-example assertion (F12).
- *A global date cut across all repositories.* Simple; mixes repositories of different ages and needlessly discards
  old repositories; the held-out-repository split already separates train and test.
**Rests on.** D 6.1, D 6.2, D 6.3, D 6.4, D 9.1, D 9.4; N 13.9 ("computation graph for each node is
time-dependent").
**Cannot.** Prevent what a pretrained encoder knows of public code from before its cut-off; only the late stratum
and the private repositories measure it. Know when a developer actually read an issue.
**Refuted if.** The planted-fact test (C8) passes a token dated after t into any input; or the late-created stratum
scores clearly below the earlier held-out repositories of the same size and history (memory, not skill).

### C5. The examples and labels of each question

The material forces the main move off the starting point here: a label is (entity, time, label) and comes from an
event (D 9.1). A snapshot alone gives no right files. So every label comes from history or from a run; the snapshot
gives the inputs.

**Unit of work.** A merged pull request; where none exists, a commit. Units with pure renames, formatting-only or
vendored changes are kept and marked by measured attributes (share of renamed paths, whitespace-only lines, files
changed), not dropped (V2).

**Q-change.** Question: a partial change. t = the time of the unit's first commit; snapshot = its parent; input = the
diff of that first commit (a multi-commit pull request) or of a drawn subset of files (single commit; assumption: a
developer has edited some files and asks for the rest). Right files: the other files the unit changed, added files
included as a separate label kind ("a new file belongs in folder X"; F10), deleted files as their own kind.
**Q-words.** Tier 1: an issue opened before the linked pull request's first commit; text = title and first body;
t = issue creation; snapshot = the default branch at t; right files = the files the pull request changed. Tier 2,
marked (V7): pull-request title and first body, written by the person who made the change. Tier 3, marked: commit
messages. For repositories without issues, a code-only pretext tier: a function's docstring as the query, its file as
the answer, with the docstring removed from the snapshot; marked as pretraining, never scored as task words.
**Q-error.** Tier 1: an issue whose first body holds an error text or traceback, linked to a fixing pull request; t,
snapshot and right files as for Q-words. Tier 2: a historical fix whose tests fail at its parent: rebuild the
parent in a container with the network off, run the tests the fix touched, capture the error text; right files =
the fix's files. Tier 3, marked: a mutation of one function in a snapshot, tests run, error captured, right file =
the mutated file. The files named in an error text are an input and a baseline, never hidden.
**Depends on.** C1, C3, C4.
**Alternatives weighed.**
- *Seed file to other files of the commit (today).* One question kind; no content of the change; the commit splits
  a task (F7).
- *Commit messages as task words.* Written after the answer was known (V7); kept only as tier 3.
- *Code-only labels (mutation, docstrings) as the main source.* My starting point's strongest form: labels for
  repositories with no history at all. Lost because a mutation's file is where the fault was planted, which is not
  how real errors spread, and a docstring is written with the answer in hand; both are other distributions (D 1.2,
  D 7.4). Kept as marked tiers for pretraining and for coverage of empty-history repositories.
**Rests on.** D 9.1, D 6.1, D 1.2, D 7.4; N 13.6 (the split of message and supervision edges: the question's own
diff is input, the rest supervision).
**Cannot.** Know which files a developer looked at without changing (reading is never recorded); right files are
files changed, an under-count of files needed. Tier-2 errors need runnable tests, so they cover only repositories
that build. Issues opened after work started are not questions (count first: share of linked issues opened before
the first commit).
**Refuted if.** Tier-1 Q-words or Q-error examples number too few per repository to score (count first), or models
trained on tier 3 do no better on tier 1 than models without it.

### C6. How examples are drawn and weighted

**Choice.** Weight one unit of work as one; its k examples (drawn subsets, files left out) weigh 1/k each; a
repository's contribution is scaled by its inclusion weight from C2 and capped so no repository dominates training
(zulip's 82 % is the failure to avoid). The 1/n of today is thereby derived: a commit of n files is n times as likely
to be drawn by "one example per modified file", which is incident sampling (D 2.2), and the inverse inclusion weight
removes it (D 3.2). Negatives: every file of the snapshot is a candidate at scoring; in training, negatives are drawn
from the snapshot by a stated mix of uniform and structurally near files, with the drawing probabilities kept.
**Depends on.** C2, C5.
**Alternatives weighed.**
- *Every modified file as a seed, unweighted.* Over-weights big commits; same as today minus the found weight.
- *Hard negatives from counting only.* Measured to hurt (T1, item 6), in one network on three repositories; set
  aside as the only source, kept as a share of the mix.
- *Equal weight per example across all repositories.* The largest repository dominates (F1).
**Rests on.** D 2.2, D 3.2, D 2.10 (sampling inside training is a sampling problem too); N 13.6 (negatives are not
real edges).
**Cannot.** Correct anything but averages and totals (D 3.2). Know whether a non-changed file was in fact also
needed; a "negative" may be a missed positive (D 3.3: not missing at random).
**Refuted if.** Weighted training scores lower on held-out repositories, per stratum, than unweighted training.

### C7. Splits, tests of generalisation, baselines, measures

**Choice.** Three tests.
1. Main: held-out repositories, whole, by stratum; plus the late-created stratum; plus the owner's two and zulip
   reported apart. Validation repositories are a separate held-out slice of training strata.
2. Inside each held-out repository the question time runs over its whole history; history before t is input, not
   training. A gap of one unit of work between input history and question is kept (D 7.1).
3. Cold start: held-out repositories evaluated as if history were cut to its first 10, 100, 1,000 commits: what the
   model gives when the repository has little history (the starting point's claim).
Baselines on every question (D 7.2): weighted co-change counting; recently changed files; same folder; files named
in the question (paths or identifiers in the text, files in a traceback); text search over the snapshot (trained on
the repository's own snapshot only); import neighbours of the anchor files.
Measures: rank of every right file among all files of the snapshot; recall at 1, 5, 10, 20 and the reciprocal rank;
hits at ten over min(10, right files), so that the ceiling is one. Averaged per repository first, then over
repositories with inclusion weights; reported per stratum, per question tier, per segment (right file with or without
earlier co-change, with or without a code link, new file) (D 7.3). Paired intervals over repositories.
**Depends on.** C2, C4, C5.
**Alternatives weighed.**
- *Time split inside the same repositories (today).* Tests the future of a known repository, not an unseen one
  (V4).
- *Random split of questions across repositories.* Leaks time and identity (V3).
- *P@10 over 10.* Its ceiling is about a quarter (FACTS); hides gains.
**Rests on.** D 7.1, D 7.2, D 7.3, D 7.4, D 3.2; N 8.1, N 13.6.
**Cannot.** Measure what a developer needed but did not change. Interval width depends on the count of held-out
repositories; a small stratum gives a wide one.
**Refuted if.** A naive baseline matches the model in every stratum; then the data gives the model nothing beyond
the baseline's input.

### C8. Checks on the data

**Choice.** Stated and tested on every load, never assumed (D 4.2, V9):
- Keys: `blob` by hash; `(tree, path)`; `(commit)`; `(pr)`; each `change.old_blob` exists in the parent tree.
- Dependencies stated by the domain and tested: `blob -> blob_fact` (same bytes, same facts per parser version);
  `commit -> tree`; `lineage` rebuildable from `change`. A violation is a fault, a pass is "not refuted".
- Loss test: rebuild `git diff` from `change` and `tree_entry` for a sample of commits.
- Leak test: plant a marker row dated after t in a copy and check that no input contains it; assert max fact time
  below t per example (D 6.3).
- Copies: shared blob hashes between training and held-out repositories above a stated share flag a copy (D 1.2);
  vendored folders found by hash, marked, not dropped.
- Missingness: parse failures, unresolved imports, empty bodies kept as values with reasons; their rates per language
  and per stratum are reported and given to the model (D 5.3).
- A description of each repository: files, commits, units of work, share of merges, of bulk edits, of rebased
  commits, language mix, test presence, history length (P3, D 7.3).
**Depends on.** C1 to C5.
**Alternatives weighed.** *Profiling for dependencies from the data* (D 4.5): finds candidates only, exponential;
used to propose, not to prove. *Checks by reading code (today):* not repeatable (F12).
**Rests on.** D 4.2, D 4.5, D 4.6, D 5.3, D 6.3, D 1.2.
**Cannot.** Prove any dependency (D 4.2); detect a leak through a pretrained model's memory (C4 handles it by
stratum).
**Refuted if.** A check is found that would have caught a later-discovered fault but was not run: added, and the
data rebuilt.

### C9. What is handed to a model

**Choice.** For each question: (a) the question as text or diff or error text; (b) the snapshot at t as a typed
graph: kinds file, symbol, folder, test, and, for history before t, event nodes (unit of work, commit) with their
time relative to t, linked to the files they changed (an event is a node, D 9.3); edges by kind with direction:
contains, defines, references, imports, tests, changed-in (N 2.2, N 13.1); (c) per file: raw content in chunks and
path tokens, for an encoder trained on the cards, present for every file (no cache that is empty by accident; F2);
(d) position relative to the question: distances from the anchor files (files in the diff, named in the text or in
the traceback), as anchor-distance features (N 10.5) and root marks (N 9.10); (e) repository descriptors so amounts
can be read relative to the repository (counts over the repository's typical unit size, ages over its commit rate)
(N 2.1, N 7.1, D 8.1); (f) missingness flags. No file or repository identity (V6; N 9.10, N 13.7).
For snapshots too large for one pass: candidate files beyond the anchors' reach are still all scored by a light
path (content and path only), and the graph read is a sampled subgraph that keeps connectivity (D 2.10; N 14.3),
with the sampling recorded.
**Depends on.** C1, C3, C4, C5.
**Alternatives weighed.**
- *Pair counts and yes-or-no facts (today).* Projections (V1); mean or binary forms lose counts (N 9.5).
- *Flat feature table per (question, candidate).* Good for a tree ranker; arbitrary aggregates and windows (D 9.2);
  cannot extrapolate across repository sizes unless features are relative (D 8.1). Kept as a derived view for the
  baseline ranker, built from the store, never as the store.
- *Whole repository text into a long-context language model.* Context is limited (N 13.9, S12 slide 21); no
  structure.
**Rests on.** D 9.3, D 9.4, D 2.10, D 8.1; N 2.2, N 9.5, N 9.7, N 9.10, N 10.5, N 12.7, N 13.1, N 13.9, N 14.3.
**Cannot.** Give positional information that is not relative to some anchor; a question with no named file has no
anchor except the text match, so position falls back to text-derived anchors (weaker). Cannot tell which kinds of
link a model will use; that is the model hypothesis's work.
**Refuted if.** The same model scores no better with (d) than without on questions whose right files have no earlier
co-change.

## 5. Own profile against P1 to P7

- **P1, three questions as tasks: in part.** Q-change by construction. Q-words tier 1 and Q-error tiers 1-2 hold
  only for repositories with linked issues or runnable tests; their counts are not known. The rest is marked tiers.
  **This is my weakest profile**, Q-error most of all.
- **P2, every event as itself: by construction.** Git's own objects plus tables of one fact each; nothing dropped or
  capped; pull-request and issue text edits held only as far as the present text and the first text are obtainable
  (open on a count).
- **P3, unseen repository: open on a count.** Whole repositories held out from a stated, stratified frame with
  weights; copies grouped; descriptors; no identities. Open: the number per stratum (count), and private repositories
  are inside the frame only by size and history.
- **P4, only what was known: by construction** for the store and loader (assertion per example); in part for the
  pretrained encoder's memory, measured by the late stratum.
- **P5, kinds apart: by construction.** Each link kind with its rule, direction and unresolved reasons.
- **P6, beyond history: by construction** for presence (content and structure for every file at every t); open on a
  count for how much they reach (C3's count).
- **P7, trustworthy: by construction** for keys, loss and leak tests, missingness and baselines; dependencies only
  "not refuted" by nature.

## 6. Cost

- **Frame list:** a public archive index of repositories (for example a public event archive or a software archive's
  repository list). Rough size: assumption, tens of gigabytes for a one-year slice of events; to be stated exactly
  from the source before the owner's word. Only public names leave nothing of ours.
- **Clones:** about 1,800 public repositories, bare clones. Assumption: median well under 100 MB, a long tail of a
  few GB; total in the order of 200-500 GB. On a rented machine, with the owner's yes at that moment; never on the PC
  (32 GB free).
- **Issues and pull requests:** through the public host's interface; rate-limited (time, not bytes): count first per
  repository; order of days at one token.
- **Parsing:** per distinct blob, CPU only; dominated by blob count (count first). Snapshots cost only the changed
  blobs.
- **Error tier 2:** containers per repository, network off after dependencies are fetched once; only a subset of
  repositories that build; hours to days of CPU. Needs the owner's word, since it runs foreign code.
- **Held-out truth on the PC:** labels of held-out repositories are computed on the PC from their clones (small and
  medium strata fit; large ones scored by question inputs sent without labels and predictions scored on the PC).
  The owner's two repositories and their truth never leave the PC.
- **Cards:** content encoding of distinct blobs plus training fits about four large cards for about eight hours if the
  token volume of distinct blobs is within budget (count first); otherwise the largest strata are sub-sampled by
  units of work with known probability (D 3.2), not by dropping files.
- **Owner's word needed for:** the frame download, the rented machine, the clones, the issue harvest, running foreign
  tests in containers, the encoder download.

## 7. Counts to make first

In order; the first three need no download (the three repositories are on the PC).
1. On the three current repositories: reach of code-only links at t (resolved references, test links, path
   literals, name matches) over right files with and without earlier co-change, beside imports, folders and
   history; the union reach. Decides how much of C3's base stands.
2. On the same: share of changed files outside the seven endings; share of right files that are added files; share
   of commits outside 2-50 files; share of rebased commits (author and committer time far apart).
3. On the same: distinct blobs and their tokens across the whole history (the cost of snapshot content), and the
   share of uses the grammar resolution leaves unresolved.
4. On a pilot of about 50 drawn public repositories (after the owner's word): share of merged pull requests linked to
   an issue opened before the first commit; share of those issues with an error text; share of issue bodies edited
   after; share of repositories whose tests build in a container.
5. From the pilot: spread of per-repository baseline scores per stratum, to compute the number of held-out
   repositories per stratum.

## 8. Coverage

Used: D 1.1, D 1.2, D 2.2, D 2.3, D 2.6, D 2.7, D 2.8, D 2.10, D 3.1, D 3.2, D 3.3, D 4.2, D 4.3, D 4.4, D 4.5,
D 4.6, D 4.7, D 4.8, D 4.9, D 5.3, D 6.1, D 6.2, D 6.3, D 6.4, D 7.1, D 7.2, D 7.3, D 7.4, D 8.1, D 9.1, D 9.2,
D 9.3, D 9.4.

Set aside:
- D 2.1 induced-subgraph sampling: no node-sampled graph is built; the file graph of a snapshot is taken whole (the
  warning holds for C9's subgraph reading, covered by D 2.10).
- D 2.4 path tracing: no route-based collection is used.
- D 2.5 ego designs: neighbourhoods are computed from whole snapshots, not recorded per node.
- D 2.9 random-walk re-weighting: no walk-based collection; repositories are drawn from a frame.
- D 3.4 modelling the observation process: left to the model hypothesis; the data side records the observation rules
  per link kind so such a model is possible.
- D 4.1 update anomalies: covered by C1's one-fact tables; no separate step.
- D 5.1, D 5.2 dropping or imputing missing values: nothing is dropped or imputed; missingness is kept as a value.
- D 7.5 engineered features: the store keeps raw facts; feature choice belongs to the model side (relative
  descriptors in C9 are the one data-side part).
- D 8.2 multi-step forecasting: no question predicts several steps ahead.
