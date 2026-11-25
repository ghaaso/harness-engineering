# Candidate K: keep and repair (data side, 2026-11-26)

Owner's order: r58-0017, r58-0021; process r58-0024. Starting point given: keep the data and pipeline that exist,
change the least the material forces, add what is missing, rebuild only where repair cannot reach. Entries: `D x.y` in
`docs/program/learning/MECHANISMS-DATA.md`, `N x.y` in `MECHANISMS-NEURAL.md`. Records checked: the D4 extractor
`research-tree/build/runbig/card/d4/extract.mjs` and README, the D2 README `research-tree/build/runbig/card/d2/README.md`,
`research-tree/build/improve/CANDIDATES.md` lines 15-26, `research-tree/build/improve/units/T1/report.md`.

## 1. The design in ten lines

1. Keep git as the store of record. Each repository is a pinned clone. Every table we build is a view keyed by
   commit hash, path and blob hash, so it joins back to git exactly and can be rebuilt from it (D 4.3, D 4.8).
2. Keep the existing extractor's core: the replay with a file identity that survives renames, committer-time order,
   per-question cut-off, the import resolver, the baselines and per-commit scoring.
3. Repair the collection: drop nothing at collection. Merges, all file kinds, full messages, sizes are stored and
   flagged. Filters move to the drawing of examples, where each one leaves a count (D 1.1).
4. Add what is missing: the diff of each file in each commit, file content per blob, symbols per blob, the author,
   the pull request and issue a commit belongs to, error texts.
5. Store facts by when they become known: a blob's content and symbols never change, so they are keyed by blob hash;
   which blob a path holds is keyed by commit. Issue texts are kept with their edit history (D 4.4).
6. Three questions, one form: (asked-about thing, asking time, repository state at that time, right files).
7. Rebuild the one part repair cannot reach: the sample of repositories. It is drawn at random by strata from a stated
   frame of public repositories; whole repositories are held out. The owner's two repositories become held-out test
   repositories only (D 3.2, D 2.9).
8. Rebuild the text source of the task-words question: issue texts written before the fix, not commit messages.
   Commit messages stay as a separate, marked tier (V7).
9. Leaks are tested by a differential check: rebuild any example from a clone cut at its asking time and compare
   (D 6.3, D 9.4).
10. A model is handed a time-filtered typed graph in which a commit is a node, not a pair count. The tree ranker's
    features stay as a derived view computed at load (D 9.3, N 9.5, N 13.9).

## 2. What is wrong with the data we have

- **F1. The repositories are a convenience sample.** Three, "taken because they were at hand"; zulip is 82 % of the
  pooled result. A convenience sample read as repositories in general is what D 1.2, D 2.7 and D 3.1 warn against.
  Their inclusion probabilities are unknown, so no weighting can undo it (D 3.2; D 2.9 "Cannot").
- **F2. No repository is held out.** All three serve training and test, split by time inside each. The goal is a
  repository never trained on (N 8.1, N 8.4; V4).
- **F3. Caps at collection.** `git log --no-merges`; only seven endings; message cut to 600 characters. A change whose
  right files include a template, a config or a migration in another language has those files removed from its truth
  set. The cap then reads as a fact of the world (D 1.1, the "name up to three" case; V2). Merges are the only record of
  which commits came in together.
- **F4. A commit is reduced to a list of paths.** No diff, no content, no symbols, no author, no pull request, no
  issue. Information aggregated away cannot be recovered by any model (D 9.2, D 4.3). The change question has no change
  in it: the seed is a path, not an edit.
- **F5. Models were given aggregates.** Co-change pairs, binary facts ("pairs" or "triples"), decayed counts. A binary
  fact loses how many times; a mean loses how many (N 9.5). Pair edges flatten the commit, the event, into its
  projections. D 4.8 shows such a projection joined back adds rows that never existed. D 9.3 keeps the event as a node.
- **F6. The task-words texts were commit messages.** D2's query is the cleaned commit message, written after the
  change was made (D2 README line 13). That is a text written after the answer was known, used as the question (D 6.1;
  V7). D2 also scored every held-out commit against one cut-off snapshot (its own stated limit), and drew commits of 1
  to 15 files where D4 drew 2 to 50. That gives two pipelines with two definitions of an example.
- **F7. The error question has no data.** Nothing collected (P1).
- **F8. A content input was empty for 88 to 99 % of training cells** in two repositories. A missing pattern that comes
  from how the data was collected is information, and it can shift between training and test (D 5.3). P6 asks for
  present for all rows or for none.
- **F9. Nothing is stated or tested.** No keys, no dependencies, no automatic leak test, no description of each
  repository. The leak rule is kept by reading code (D 4.2, D 4.5, D 6.3).
- **F10. The weighting was found by trial.** One over the number of files works. D 3.2 says why: a commit of n files
  contributes n examples and n(n-1) pairs, so its inclusion is proportional to its size. One over n is a
  Horvitz-Thompson correction. Because it was never stated, nothing else is corrected the same way, for example the
  pooling over repositories.
- **F11. The main measure is capped by the data.** Hits in the top ten over ten cannot exceed the number of right files
  over ten, about a quarter on tuning (T1 report). An aggregate can hide segments (D 7.3). N 13.6 ranks the right
  item against all others.
- **F12. Links are recorded with gaps that are not described.** Imports come from a regex. Python is resolved only
  when the module suffix is unique, JavaScript only for relative paths (extract.mjs `resolveImports`). Rename
  identity uses git's similarity guess at its default threshold. That is entity resolution, and its errors are not
  counted (D 1.1, D 1.2).
- **F13. The time cut is per block, not per question.** A block of 10 or 20 sees history up to its first commit, so
  later questions in the block miss up to 19 commits. D 7.1 allows a gap only when deployment has one, and ours has
  none. Not a leak, but a mismatch with deployment.

What is sound and kept: committer-time order with a strict "before" cut (D 6.1, D 7.1); held-out scored once; naive
baselines beside every model (D 7.2); per-commit unit; per-repository reporting; the rename-surviving identity as a
store key.

## 3. Repair or rebuild

Repair, except in three places.

The extractor already replays git into events with stable identities and cuts by time. F3, F4, F5, F8, F9, F12 and F13 are faults of what it kept or of what was layered on top. The repair keeps more and makes every view a keyed join on git, a lossless, content-addressed store (D 4.3: a split is safe when each part keeps the key). A rebuild gains nothing here and would discard the tested replay and leak rule.

Repair cannot reach three things.
- **The repository sample (F1, F2).** A convenience sample cannot be weighted into a representative one, because the
  inclusion probabilities are unknown (D 3.2, D 2.9 "Cannot"). Adding repositories by the same habit adds bias
  (D 2.3, D 2.8). So the sample is drawn again by a stated design. The three existing repositories stay as development
  repositories and, for the owner's two, as held-out targets.
- **The task-words text (F6).** No cleaning turns a commit message into a text written before the fix. A new source
  is needed.
- **The error question (F7).** There is nothing to repair.

## 4. Components

### C1. What is stored and in which shape

**Choice.** Four layers.
- (a) The pinned clone of each repository: the record, never edited.
- (b) Event tables, one fact per row. Keys:
  - `commit(sha)`: parents, author, author time, committer, committer time, full message, merge flag.
  - `touch(sha, path)`: status, old path, rename similarity, lines added and removed, old and new blob, file kind,
    vendored flag.
  - `tree(sha, path) -> blob`, stored only where it changes.
  - `blob(hash)`: size, binary flag, language.
  - `symbol(blob, name, kind, span)` and `ref(blob, name)`.
  - `import(blob, target spec)` plus a resolution table `resolve(sha, blob, spec) -> path | unresolved(reason)`.
  - `pr(id)`: opened, merged, base sha, head commits.
  - `issue(id)`: opened, closed.
  - `issue_text_version(id, time, text)`: every version of every issue text.
  - `link(pr, issue, kind)`.
  - `error_report(id, source, time, text)`.
  - `identity(file_id, sha, path)`.
- (c) Views: examples and features, each a query over (b) with a written definition. They are rebuilt, never edited.
- (d) A per-repository profile (C8).

**Depends on.** C3 fills symbols and refs; C4 sets the times; C2 sets which clones.

**Alternatives weighed.**
- Keep the current `commits.jsonl` plus per-block JSON. It lost because it is a projection: no content, no diff, caps
  applied (D 4.3, D 9.2; V1, V2).
- One wide table per example with features. It lost on redundancy and update anomalies (D 4.1). It is the
  hand-built single table of D 9.2. Facts known at different times sit in one row (D 4.4).
- A full content snapshot per question. Lossless, but n questions times m files of storage. Keying by blob gives the
  same facts once each, because a blob is immutable (D 4.4, D 4.7: put the fact where its key makes it free).

**Rests on.** D 4.3, D 4.4, D 4.7, D 4.8, D 9.2, D 9.3, D 1.1.

**Cannot.**
- Record what git does not: work squashed or rebased away, and the order of edits inside a commit.
- Know true event times when committer time was rewritten by a rebase (C4).
- Keep issue text versions where the host does not give the edit history (`count first`, C4).

**Refuted if.** A view rebuilt from (a) and (b) differs from the stored view, or a fact needed by a question in C5
cannot be expressed as a query over (b).

### C2. Which repositories, drawn how, how many, which held out

**Choice.** Rebuilt.
- **Frame.** Public, non-fork, non-archived repositories on GitHub. Main language Python, JavaScript or TypeScript,
  the languages of the owner's two. At least 200 commits on the default branch; at least one year of history. The
  frame is listed by search queries sliced by creation date and size until every slice is under the search cap. Each
  slice is recorded, so the listing is a census of the frame and not a crawl (D 2.6; D 1.1: the per-query cap of the
  search would otherwise censor the frame).
- **Strata.** Size (files at the last commit, four bands), language, and whether issues are used (share of PRs that
  link an issue, from the listing where available).
- **Draw.** Uniform at random within each stratum, with known inclusion probabilities. Small repositories are drawn at
  a higher rate, because the owner's kind is small and private (P3). Population figures are re-weighted by one over
  the inclusion probability (D 3.2).
- **Copies.** Entity resolution before drawing: same root commit, a large shared blob set, or a declared mirror makes
  one entity (D 1.2). Copies never sit on two sides.
- **How many.** `assumption` to be replaced by a count: about 600 drawn.
  - About 400 for training.
  - About 100 held out for choosing settings.
  - About 100 held out for the final test, at least 20 per size band so that a segment has an interval over
    repositories.
  - The owner's FixFlow and clinic: held-out test targets only, on his PC.
  - Zulip: a development repository for building the pipeline. If the draw picks it, it is used where the draw puts
    it.

  Reasoning: the repository is the unit of the claim, so the test needs enough repositories per segment for an
  interval. The number is set by the spread of per-repository baseline scores (`count first`, section 7).

**Depends on.** C7 uses the held-out sets; C8 profiles each repository.

**Alternatives weighed.**
- Keep the three. Lost: convenience sample, no held-out repository (D 3.1; V4, V5).
- Add more by popularity (most stars) or by a crawl from known projects. Lost: popularity and exploration over-sample
  hubs and well-run projects (D 2.8). Their inclusion probability is unknown (D 3.2).
- An existing benchmark list of repositories. Lost: its selection rule is someone else's convenience. Allowed only as
  an extra test with its claim cut down (V5).
- Weight training examples per repository versus pooling. See C6.

**Rests on.** D 1.2, D 2.6, D 2.7, D 2.8, D 2.9, D 3.1, D 3.2; N 8.1, N 8.4.

**Cannot.**
- Sample private repositories. The owner's kind is inside the frame only as far as small public repositories resemble
  small private ones (`assumption`, tested only on his two).
- Say anything about languages outside the three.
- Remove GitHub's own selection: which projects are public at all (D 1.2, "all of a biased convenience sample").
- N 8.4: transfer is proved only within one family. A random draw makes the claim "repositories of this frame", no
  wider.

**Refuted if.** The held-out repositories' baseline scores fall outside the spread of the training repositories'. That
would mean the draw or the strata missed a kind. Or the owner's two sit outside every stratum on the profile of C8.

### C3. What is taken from the code itself

**Choice.**
- For every blob of a code or text file: language, size, binary flag.
- From a parser per language: the symbols defined (name, kind, span) and the names referenced.
- Import statements, resolved against the tree of the commit at which a question is asked.
- Test relation: a file under a test path, or one whose name pairs with another file's name, is linked to it. This is
  stored as a heuristic kind with its rule.
- Folder membership.

All are computed once per blob (immutable) and once per tree for resolution, so a snapshot at any asking time is a
join, not a re-parse. The current regex import resolver is kept as a fallback. Every import it or the parser cannot
resolve is stored as unresolved, with the reason.

**Depends on.** C1 (blob keys), C4 (which tree a question sees).

**Alternatives weighed.**
- Imports and folders only (now). Lost: they reach 18 to 25 % (imports) and 18 to 37 % (folders) of right files (T1
  report). The rest needs other kinds (P6). Content and names give the model what history cannot: 21 to 66 % of right
  files never changed with the seed (facts sheet).
- Text embeddings per file, frozen, as content. Not stored as the record: an embedding is a learned projection, and a
  learned step belongs to the model's pipeline, fitted on training data only (D 6.4). It can be computed at load from
  the stored content.
- A language server: better resolution, but a build environment per repository and commit. A later upgrade where the parser's unresolved share is high (`count first`).

**Rests on.** D 9.2, D 6.4, D 1.1; N 9.10 (structure features), N 12.5, N 5.5 (what is not in the graph cannot be
reached).

**Cannot.**
- Resolve dynamic imports, string-built paths, dependency injection or framework conventions such as URL tables and
  templates.
- Parse files in languages outside the parsers; those keep content only.
- The test heuristic will miss and add links; its error is counted, not assumed.

**Refuted if.** On the pilot, symbols and references add no reach beyond imports and folders for the right files that
history misses.

### C4. Time and leaks

**Choice.**
- Every fact carries the time it became known: author and committer time for commits; opened, merged and closed for
  PRs and issues; a time per issue text version.
- Order and cut-off use committer time, as now. Author time is stored to detect rebases: author time far before
  committer time, or committer times not increasing along first parents.
- The asking time and the state a question may read:
  - Change question: the asking time is the commit. The model may read the first parent's tree, history strictly
    before the commit, and the seed's own diff.
  - Task-words question: the asking time is the issue's opening. The model may read the issue text version at
    opening, and the default-branch tree and history at the last commit before that time.
  - Error question: the asking time is the error report's time, read the same way.
- The cut is applied per question where the data is loaded, not per block (D 9.4; F13).
- Anything learned from data (vocabularies, scalers, idf, embeddings fine-tuned) is fitted on training repositories
  and training times only (D 6.4, D 6.2).

**Depends on.** C1, C5, C9.

**Alternatives weighed.**
- Keep blocks of 10 or 20. Lost: a gap the deployment does not have (D 7.1). Per-question cuts are cheap once the
  store is keyed by commit.
- Author time as the order. Lost: author time can lie far in the past for rebased or cherry-picked work, so a commit
  could be placed before history it built on.
- The current issue text from the API. Lost: an issue body is often edited after the fix. Reading the current body is
  reading the future (D 6.1; V3, V7). Only the version at opening is the question. Where no edit history exists, the
  issue is marked `text possibly edited` and kept as a separate tier.

**Rests on.** D 6.1, D 6.2, D 6.4, D 7.1, D 9.1, D 9.4; N 13.9.

**Cannot.**
- Know when a developer actually started a change; the asking time for the change question is a convention.
- Undo rebase-rewritten times. They are flagged, not corrected.
- Guarantee that a PR's base commit is what the developer saw. We take the last default-branch commit before the
  asking time.

**Refuted if.** The differential leak test (C8) finds any example whose inputs change when the clone is cut at its
asking time.

### C5. The examples and labels of each question

**Choice.** One form: (repository, question kind, asked-about thing, asking time, state reference, right files,
tier).

- **Change.**
  - Asked-about thing: one touched file of a commit together with its diff (the seed); the same seeds as now.
  - Right files: the other files the commit touched, all kinds of file. They are tagged code or non-code, and the
    score is reported for both.
  - Grouping: a commit, and a second tier grouped by PR (all commits of a PR), since a PR is the unit of one change in
    many projects.
  - Kept from now: every touched file is a seed in turn.
- **Task words.**
  - Asked-about thing: the issue text at opening.
  - Right files: the files changed by the PR that closes it (the "closes #n" link or the host's link). This is tier A.
  - Tier B, marked: commit messages, cleaned as D2 does, for repositories with no issues. This is the owner's case:
    the clinic has no remote. Tier B is never pooled with tier A, and it is never read as a question written before
    the answer (V7).
- **Error.**
  - Tier A: issue texts at opening that contain a stack trace or an error message (detected by pattern, the pattern
    stored). Right files: those of the closing PR.
  - Tier B: CI failure logs of a PR's run that precede a fixing commit in the same PR. Right files: the files changed
    between the failing run's commit and the first passing run's commit. This is `count first`, since logs expire on
    the host.
  - Tier C, marked as built: for repositories whose tests run in a container, run the tests at a commit's first
    parent and at the commit. A failure that the commit fixes gives an error text whose right files are the
    commit's. The cost is named in section 6. It runs only with the owner's word.
- **Kept with every example:** the number of right files, the repository, and whether each right file has earlier
  co-change with the seed, earlier import links, or is new.

**Depends on.** C1, C3, C4.

**Alternatives weighed.**
- Change only, as now. Lost: two of three questions have no data (P1).
- Commit messages as task words (now). Lost: written after the answer (V7). Kept only as tier B, because the owner's
  own repositories may have nothing else.
- For error: synthetic errors made by mutating code. Lost: what a mutation breaks is chosen by us, not drawn from how
  errors arise. The label then follows our rule (D 1.2, performativity in the small). Kept only as a later, marked tier, never pooled with drawn errors.
- Seed as path only (now). Lost: drops the change itself (D 9.2).

**Rests on.** D 9.1, D 6.1, D 1.1, D 1.2; N 13.6.

**Cannot.**
- Tier A of both text questions exists only in projects that use issues and link them. That is a selection, and its
  share is counted per stratum.
- Errors reported as issues are those users chose to report. Tier C covers only errors that tests show.
- A commit's file set is not always one task. Tangled commits add right files that are not right; they are not
  detected here (`count first` on the pilot, by commit size and message).

**Refuted if.** Tier A of the error question yields fewer than about 20 examples in most test repositories, or the
pilot counts show linked issues cover too few strata to hold a test. Then the error question needs tier C as its main
source, and P1 falls to "in part".

### C6. How examples are drawn and weighted

**Choice.**
- Every eligible example is drawn. Eligibility is a stated filter with a count of what it removed per repository:
  - merges excluded from change examples, but kept in the store;
  - commits above a size flagged as bulk;
  - vendored or generated files flagged.
- Weights, all stated as inclusion corrections (D 3.2):
  - one over the number of seeds per commit, so the commit is the unit, as the current scoring already does;
  - one over the number of examples per repository, so each repository counts once in training and in measures, with
    the alternative weighting by stratum inclusion probability for population figures;
  - one over the number of right files where a loss would otherwise favour big commits.
- 1/|e| is kept where it is used as a feature, now with its reason.
- Bulk commits are not dropped. They are a separate segment, scored separately, and their inclusion in training is
  a setting chosen on the held-out choosing set.

**Depends on.** C2, C5, C7.

**Alternatives weighed.**
- Pool all examples unweighted (now, in effect). Lost: zulip at 82 % decides the result (F1; D 7.3).
- Cap examples per repository by subsampling. Lost: it throws data away where a weight does the same without loss.
- Keep the 2-to-50 cap at collection. Lost: V2. As a drawing filter it is allowed, with its count.

**Rests on.** D 3.2, D 2.9, D 1.1, D 7.3.

**Cannot.**
- Correct for selection whose probability is unknown: projects that squash, rebase or never link issues.
- Equal repository weight gives a tiny repository's few examples the weight of a large one's thousands. The variance
  rises, which is why the size strata are reported apart.

**Refuted if.** Pooling and repository weighting order the baselines differently on the choosing set, and the pooled order is the one that holds on test: the repository would then be the wrong unit.

### C7. Splits, tests of generalisation, baselines, measures

**Choice.**
- Three disjoint sets of whole repositories: training, choosing, test (C2), plus the owner's two as final targets.
  On a held-out repository the model may read that repository's own history before each asking time. Reading it is
  input, not training.
- Inside training repositories a time split is kept for early stopping: the last stretch of each, matching the
  per-question horizon (D 7.1).
- Test is scored once.
- Baselines on every question and every segment (D 7.2):
  - change: plain counting, 1/|e| counting, recency, same folder, import neighbours;
  - task words and error: BM25 over content at the asking state, and path-name match;
  - for all: the history count from the files BM25 puts first.
- Measures:
  - rank of every right file against all candidates (mean reciprocal rank of the first right file);
  - recall at 1, 5, 10 and 50;
  - precision at 10, shown with its ceiling, the number of right files over ten (F11).
- Reported per repository, then averaged over repositories with intervals over repositories. Reported per segment:
  size band; seed with few or many earlier changes; right file with or without earlier co-change; new file; non-code
  right file; tier (D 7.3).

**Depends on.** C2, C5, C6.

**Alternatives weighed.**
- Time split inside each repository only (now). Lost: V4, and it says nothing of an unseen repository (N 8.1).
- Leave-one-repository-out over three. Lost: three repositories give no interval over repositories (D 3.1).
- Precision at 10 as the main measure (now). Lost: capped by the data (F11).

**Rests on.** D 6.1, D 7.1, D 7.2, D 7.3, D 7.4; N 13.6, N 8.1, N 8.4.

**Cannot.**
- Test repositories unlike the frame.
- Show drift past the end of the collected histories (D 7.4).
- Measure usefulness to an agent; it measures ranking only.

**Refuted if.** The choosing and test sets disagree on which baseline is best in more than one size band. Then the
held-out repositories are too few for the claim, and C2's numbers rise.

### C8. Checks on the data

**Choice.** Stated, then tested on every build; never assumed (D 4.2: a dependency can be refuted by data, never
proved).
- **Keys:** `sha`; `(sha, path)` in `touch`; `blob hash`; `(file_id, sha)` gives one path; `(id)` for PR and issue.
- **Dependencies:** blob hash determines content and symbols. `(sha, path)` determines the blob. An added path does
  not exist in the parent tree. A modified or deleted path does exist there (an inclusion dependency, D 4.5).
- **Join check:** every view, joined back on its keys, gives its source rows with none gained or lost (D 4.8).
- **Leak test, differential:** for a random sample of examples per repository, clone the repository cut at the asking
  time, rebuild the example and its inputs from that alone, and compare byte for byte. A second test plants a
  canary, a file created after the asking time, and asserts it never appears among candidates or inputs (D 6.3).
- **Profile per repository** (D 4.5, D 1.1):
  - commits, files, merge share, squash-merge share;
  - change-size distribution, bulk share;
  - rename share and similarity distribution;
  - unresolved import share;
  - share of PRs with linked issues, share of issue texts edited after the fix;
  - languages, age;
  - share of right files that are non-code.
- **Missing values:** a table per column per repository of what is missing and why: binary, unparsed language, no
  issue, edit history absent. Missing is a coded value, never a blank. Training and test patterns are compared
  (D 5.3; F8).

**Depends on.** C1 to C5.

**Alternatives weighed.**
- Reading code for leaks (now). Lost: a leak is silent (D 6.3).
- Profiling a sample of each repository. Lost here: the deck leaves sample profiling open (D 4.5). A full profile of
  one repository is cheap.

**Rests on.** D 4.2, D 4.5, D 4.6, D 4.8, D 5.1, D 5.3, D 6.3, D 1.1.

**Cannot.** Prove any dependency (D 4.2). The leak test covers sampled examples and what the clone holds. It cannot
see a leak through host data such as issue edits, which is why C4 stores versions.

**Refuted if.** A stated dependency is violated and the fix is not in the extractor. Then the stated model of the data
was wrong and the dependent views are rebuilt.

### C9. What is handed to a model

**Choice.** Per question, built at load from the store, cut at the asking time (D 9.4).
- **A typed graph.**
  - Nodes: the question (text or diff), files alive at the asking state, folders, symbols, and commits before the
    asking time, each commit a node with its time, size and author.
  - Edges, typed and directed: commit-touched-file (with status and lines), file-in-folder, file-imports-file,
    file-defines-symbol, file-references-symbol, test-of, question-mentions-name (a string match, stored with its
    rule).
- **Content** of each file at the asking state as text, for the model's own encoder.
- **A repository description** from C8, so amounts can be read relative to the repository (N 2.1, N 7.1).
- **Engineered features** (counts, 1/|e|, decay, ages), computed at load from the same cut, as a second, derived view.
- **No file or repository identity** as an input. Identities are store keys only (V6; N 9.10, N 13.7).

**Depends on.** C1, C3, C4, C5.

**Alternatives weighed.**
- Pair-count edges and binary facts (now). Lost: aggregates; a binary fact cannot count (N 9.5, D 9.2). With commits as
  nodes, a sum over a file's commits, each weighted by that commit's degree, recovers both the count and 1/|e|, and the
  model can learn other aggregates (N 13.9).
- Only the feature table, for the tree ranker. Lost as the only form: V1, D 9.2. Kept as the derived view, since it
  leads today (T1) and D 7.5 says such features carry much.
- The whole repository as one text for a language model. Lost as the only form: context is limited and order is
  lost (N 13.9, S12 slide 21). The content is still given, so a text model can read it.

**Rests on.** D 9.2, D 9.3, D 9.4, D 7.5; N 9.5, N 9.10, N 13.1, N 13.9, N 14.2.

**Cannot.**
- Bound the size of a question's graph in a large repository. Hub files and long histories need sampling inside
  training (D 2.10, N 14.2). How that is done belongs to the model design.
- Decide which kinds the model treats separately (N 13.1); the data keeps them apart so the model can choose.

**Refuted if.** A model given the graph cannot match the engineered-feature view on the choosing set after reasonable
effort. The data side is then not the limit; the model side is.

### C10 (own). The existing three repositories

**Choice.**
- FixFlow and the clinic: re-extracted with the repaired extractor on the owner's PC; test targets only, never
  training, never sent out (V8).
- Zulip: the development repository for building and checking the pipeline, re-extracted.
- The old D4 and D2 outputs are kept as records, and the new baselines are checked against them. Counting under the
  old filters must reproduce the old figures exactly, which tests the repair itself.

**Rests on.** CLAUDE.md rule 1; V8; D 7.2.

**Cannot.** Make the old results comparable to the new held-out ones; they answer a different split.

**Refuted if.** The repaired extractor under the old filters does not reproduce the old counting figures.

## 5. Own profile

- **P1, in part** (weakest). The change question is met by construction: the seed's diff and all right files, with
  times. Task words: tier A is open on a count (the share of PRs linked to an issue with an unedited opening text).
  For the owner's clinic only the marked tier B exists. The error question is open on counts for tiers A and B. Tier
  C exists only where tests run in a container. Which errors are reachable is decided by what gets reported or tested
  (C5 Cannot).
- **P2, by construction.** Git is the record; every view is keyed and rebuilt from it. Nothing is capped at
  collection; filters leave counts; facts known at different times sit in different tables. The one exception is issue
  text where the host gives no edit history, which is flagged.
- **P3, in part.** Public repositories of the frame are drawn by a stated stratified design with known inclusion
  probabilities. Whole repositories are held out and copies are merged. No identity is used. The owner's private kind
  is reached only through small public repositories and tested on his two.
- **P4, by construction for git facts; open on a count for host texts.** Per-question cut at load and a differential
  leak test. Issue edit history availability is to be counted.
- **P5, by construction.** Kinds and directions are kept, each with how it is obtained and what it misses (C3, C8).
- **P6, open on a count.** Content, symbols and names are present for every row at every asking state. Missing is
  coded with its reason. The reach of each kind is counted on the pilot before it is relied on.
- **P7, by construction for the checks; open on counts for the profile figures.**

Weakest: **P1**, the error question.

## 6. Cost

- **Listing the frame.** GitHub search API: some thousands of requests, tens of MB of metadata, a token, rate-limited
  over hours. No project name is in any query (generic filters only). Needs the owner's word (an outside request).
- **Clones.** Of about 600 repositories, full history. `assumption`: median tens of MB, a long tail to several GB;
  roughly 50 to 150 GB in total. `count first` from the listing's size field. On a rented machine with his yes, not on
  the PC, which has 32 GB free.
- **PR, issue and edit-history metadata.** GitHub API, a few GB of JSON, many hours under rate limits.
- **CI logs (error tier B).** GitHub API where not expired; size unknown, `count first`.
- **Parsers.** A parser library and three language grammars, tens of MB. This is an install, needing his word, named
  first.
- **Compute for extraction.**
  - Parsing is done once per distinct blob. `assumption`: millions of blobs, CPU hours, not card hours.
  - Per-question graph building happens at load during training.
  - Tier C of the error question: building and running tests per commit in containers. Hours per repository, so only
    on a drawn subset with his word.
- **Training.** Planned for about four large cards for about eight hours, not for the PC.
- **Needs his word.** Each download (listing, clones, metadata, logs) named with source and size first; the parser
  install; any use of the rented machine; tier C runs.

## 7. Counts to make first

In this order. The first two need no download and run on the three repositories at hand.
1. **Non-code and capped right files.** The share of right files removed by the seven-ending filter, by vendored
   exclusion, and by `--no-merges` grouping. The share of commits outside 2 to 50. Per repository. This sizes F3.
2. **Reach per kind** on the existing three, by repaired extraction: imports resolved by parser against regex,
   symbols and references, test relation, history, the PR group. Measured as the share of right files each kind
   reaches that history does not.
3. On a pilot of about 30 drawn repositories:
   - the share of PRs that close an issue;
   - the share of those issues whose text was edited after the PR opened, and whether edit history is available;
   - the share of issues containing an error text;
   - the share of PRs with retrievable CI logs.
   These decide whether P1 holds for the text questions.
4. Spread of per-repository baseline scores on the pilot. This sets the number of held-out repositories (C2).
5. Size distribution of the frame, from listing metadata. This sets the disk.
6. Copy overlap in the pilot (shared roots, shared blobs). This tests entity resolution.
7. Rebase signals: the share of commits whose committer times run backward along first parents.

## 8. Coverage

Used: D 1.1, D 1.2, D 2.3, D 2.6, D 2.7, D 2.8, D 2.9, D 2.10, D 3.1, D 3.2, D 4.1, D 4.2, D 4.3, D 4.4, D 4.5, D 4.6,
D 4.7, D 4.8, D 5.1, D 5.3, D 6.1, D 6.2, D 6.3, D 6.4, D 7.1, D 7.2, D 7.3, D 7.4, D 7.5, D 9.1, D 9.2, D 9.3, D 9.4.

Set aside:
- **D 2.1, D 2.2, D 2.4, D 2.5.** The graphs here are taken whole per repository (a census of git), not sampled from
  a larger graph. They bear only on sampling inside training (D 2.10, the model's side).
- **D 3.3.** No unseen part is imputed; missing is coded (C8).
- **D 3.4.** Modelling the observation process jointly is a model-side choice; the data keeps what it needs (the
  per-kind recording notes).
- **D 4.9.** Dependency preservation: our dependencies each sit within one table by the key choice in C1. Not needed
  as a separate step.
- **D 5.2.** Options for missing values belong to the model. The data side only codes missingness.
- **D 8.1, D 8.2.** Forecasting set-ups and tree extrapolation: model-side. Noted for C9's feature view, where counts
  grow with repository age, which is why the repository description is given.
