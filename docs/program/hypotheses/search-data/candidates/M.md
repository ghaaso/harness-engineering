# Candidate M: the data side, from the population (2026-11-26)

Starting point M: begin from "a repository it never trained on", ask which repositories that means, from what list they
can be drawn, by what design, what may then be claimed, and how wide against how deep. `D x.y` and `N x.y` are entries
of `MECHANISMS-DATA.md` and `MECHANISMS-NEURAL.md`; `P1`-`P7` and `V1`-`V9` are in `CRITERIA.md`.

## 1. The design in ten lines

1. The unit of every claim is the repository, so the repository is what is sampled, held out and averaged over (D 3.2; N 8.1).
2. The population: public git repositories with real multi-file development in a stated window; the list: every repository with a push in that window in the public GitHub event archive, clustered so that forks and copies are one project (D 1.2, D 2.6).
3. The draw: stratified random sampling of project clusters with known inclusion probabilities (size, activity, team size, language, creation date), small repositories over-sampled so the owner's kind lies inside the strata (D 2.9, D 3.2).
4. Test and validation clusters are drawn first and removed; training is drawn from the rest; the owner's two private repositories are never trained on and are reported apart, without a population claim (V4, V5).
5. Two phases: a wide tier (thousands of repositories, history and file lists only) and a deep tier (a few hundred, drawn from the wide tier with known probability: content, symbols, diffs, pull requests, issues, errors). How many of each is computed from a pilot's between-repository and within-repository variance, not chosen.
6. The store is the git objects themselves plus a relational entity store of irreducible, timed facts; nothing capped at collection; eligibility rules are views (D 1.1, D 4.4, D 9.3).
7. Every fact carries the time it became visible on the main line, not only its commit time; inputs are cut at loading (D 9.4).
8. Three questions, each with its own label source and its own sub-population: change (a pull request's first commit asks for the rest), task words (an issue as first written asks for the files of its fix), error (a traceback or failing check asks for the files of its fix).
9. A calendar cut T0: training facts before T0, test questions after T0 in held-out repositories; repositories created after the cut-off of any pretrained text encoder form their own stratum.
10. Scores per repository, then weighted by one over inclusion probability; recall at k and rank of the first right file against all files; naive baselines and segments beside every result.

## 2. What is wrong with the data we have

- **W1. No population, no frame, no design.** Three repositories "taken because they were at hand" (facts sheet). Nothing they stand for can be stated (D 2.6, D 3.1; V5). A result on them is a result about three repositories.
- **W2. No repository is held out.** All three are trained and tested, split by time inside each (facts sheet). The goal's condition is never tested (V4; N 8.1).
- **W3. The pooled score is a score of zulip.** Zulip is 82 % of the pooled result. Pooling over commits weights each repository by its number of eligible commits, an inclusion probability nobody chose (D 3.2; D 7.3).
- **W4. Caps at collection.** No merge commits; seven file endings; commits of 2 to 50 code files only; messages cut to 600 characters (facts sheet; `research-tree/build/runbig/card/d4/README.md`). Each is a recording limit that cannot now be told from the world (D 1.1; V2). Dropping merges also removes when a branch's commits reached the main line (see C4).
- **W5. A lossy projection was stored.** Kept: time, message, file list. Not kept: what changed inside a file, content and symbols at that time, author, pull request, issue (facts sheet). What was aggregated away cannot be recovered by any model (D 4.3, D 9.2; V1).
- **W6. Missing by accident.** The content input was empty for 88 to 99 % of the training cells of two repositories (`research-tree/build/improve/APPROACHES-2026-11-25.md`). Missingness that follows collection, not the world, is a pattern a model learns and the test does not share (D 5.3; P6).
- **W7. The error question has no data at all** (facts sheet; P1).
- **W8. The task text is unchecked.** Whether issue texts or commit messages served is not known (facts sheet). A commit message is written after the answer was known (D 6.1; V7).
- **W9. The asked-about thing of the change question is invented.** A starting file is one file of a commit; the order of files inside a commit is not recorded, so "known at asking time" is not defined (D 9.1). A commit of n files gives n correlated examples.
- **W10. Nothing stated, nothing tested.** No keys, no automatic leak test, no description of each repository (facts sheet; D 4.2, D 4.5, D 6.3).
- **W11. A capped measure.** P@10 cannot exceed |truth|/10, about a quarter on tuning (`research-tree/build/improve/units/T1/report.md`); it does not rank the right files against all others (P7; N 13.6).
- **W12. A found-by-trial weight.** One over the number of files per commit carries much of counting's strength and was found by trial (facts sheet). The size of an event was never kept as a fact a model can use; it was baked into a weight (D 9.2).
- **W13. Links are thin.** Imports and folders only: 8.5, 45 and 11 points of right files within two hops (`research-tree/build/improve/CANDIDATES.md` line 24). No references, no test relations (P5, P6).

## 3. Repair or rebuild

**Rebuild the collection; keep the three repositories in new roles.** W1 to W3 are not faults of rows but of where the
rows came from: no amount of re-extraction turns a convenience set of three into a sample of a population (D 3.1, D 3.2).
W4 and W5 are caps and projections; repairing them means re-extracting from raw git anyway. What survives: the rename-
tracking file identity in `extract.mjs` and the leak rule of strict cut-offs, re-implemented in the loader. Zulip stays a
public repository like any other: it enters the frame and is in a sample only if drawn; it is also kept as a fixed
check of the new pipeline against the old numbers (one comparison, to catch an extraction fault). The owner's two
repositories become the "owner's case": held out entirely, never trained on, scored apart, on his PC only (V8).

Where the starting point does not reach: a rebuild does not by itself give the error question labels (C5) or content
(C3); those are depth, and depth is paid per repository.

## 4. Components

### C2 which repositories, drawn how, how many, which held out (the base; first because the rest follows from it)

**Choice.**
- *Target population.* Public git repositories whose main line receives multi-file changes during a 12-month window
  W ending at T0, with at least a stated minimum of history at T0 (for example 200 commits and 50 files of any kind;
  `count first: the frame's distribution on these two numbers`, then the minimum is set where the owner's two
  repositories lie well above it). The minimum is part of the population's definition, recorded, not a cap on records.
- *Frame (list).* The public GitHub event archive for W: every repository with at least one push event. One streaming
  pass keeps only repository name, push count, distinct pushers and the archive's fork flag. This is the nearest thing
  to a census available for "active public repositories" (D 1.1); it is still a sample of the truth (D 1.2): it misses
  other forges, private code, and repositories that push rarely enough to fall outside W.
- *Entity resolution.* Clusters, not repositories, are the sampling units: forks, mirrors and copies share a root
  commit or most of their file blobs. Cluster by the archive's fork link, then by shared root commit, then (after
  cloning) by share of identical blobs; clusters found after cloning are merged across splits before any test is
  run (D 1.2, "entity resolution"; V4).
- *Design.* Two-phase stratified random sampling of clusters. Strata: code files at T0 (four bands), commit rate (two
  bands), distinct committers (1, 2-5, more), main language (Python, JavaScript/TypeScript, other), created before or
  after the pretraining cut-off of any text encoder used (C9). Small, low-team strata are over-sampled. Within each
  stratum, simple random. Every cluster carries its inclusion probability pi (D 3.2). Phase 1 (wide tier) draws from
  the frame; phase 2 (deep tier) draws from phase 1, again stratified, so the deep tier's probability is the product
  of the two and known.
- *Held out.* Test and validation clusters are drawn first, from every stratum, and removed from the frame before
  training is drawn. The owner's repositories are a fourth group, never trained on.
- *How many: wide against deep.* The population mean of a per-repository score has variance about
  sigma_b^2 / n + sigma_w^2 / (n m) for n repositories and m questions each (standard two-stage cluster sampling;
  `assumption`: the material gives Horvitz-Thompson for one stage, D 3.2, not the two-stage variance; the formula is
  the textbook one and is checked on the pilot). Past m of about sigma_w^2 / sigma_b^2 questions per repository, more
  questions buy almost nothing and only more repositories help; with costs, the best m is
  sqrt((cost per repository / cost per question) x (sigma_w^2 / sigma_b^2)). So the split between wide and deep is
  computed, from a pilot of about 30 frame-drawn repositories (`count first`). Planning numbers until then
  (`assumption`, to be replaced): test 150 clusters (about 8 per stratum cell that is read on its own, D 7.3),
  validation 60, wide training 3,000, deep training 400 drawn from them.

**Depends on.** Nothing; C1, C4, C6, C7 follow from it.

**Alternatives weighed.**
- *Popular repositories by stars or a curated list.* Cheap and clean. Lost: a list ranked by popularity is a selection
  on an outcome-linked trait; its claim shrinks to "popular repositories" (V5). Popular repositories are large and
  team-made, the opposite of the owner's kind (P3).
- *Crawl outward from seeds (dependencies, contributors, forks).* Lost: snowball and walks over-sample high-degree units
  and can make the sample look heavy-tailed whatever the truth (D 2.3, D 2.8); repositories reached share contributors
  and code, so training and test leak through people and copies.
- *Search-interface sampling.* Lost: result caps and the service's own ordering are a recording method that limits what
  can be recorded (D 1.1), with inclusion probabilities that cannot be known (D 2.9 "cannot").
- *Uniform random repositories with no strata.* Gives an unbiased mean but most draws are tiny or inactive; the owner's
  kind and the large kind get too few draws to be read apart (D 2.7: the goal decides the design; here the goals are a
  population mean and per-segment readings, hence strata).
- *Hours of the archive sampled instead of a full pass* (cheaper). Kept as the fallback: a repository's chance of
  appearing then rises with how often it pushes, a known bias undone by weighting with one over that chance (D 2.9),
  with pi computed from its own push history after cloning (`assumption`: commit times approximate push times; count
  first: the gap on the pilot).
- *Few repositories, deeply* (the current form, the opposite of M). It wins on everything depth gives (C3, C5) and
  cannot say anything about the next repository: between-repository variance is unmeasured with three, and N 8.4 says
  transfer is proved only inside one family; a family is learned only from many members (N 8.1). Depth is kept, but as
  a probability sub-sample of the wide tier, not instead of it.
- *Software Heritage's archive as frame* (covers more forges). Lost on cost for now: far larger than the GitHub archive
  (`count first: size of its origin list`); kept as the way to widen the claim later.

**Rests on.** D 1.1, D 1.2, D 2.3, D 2.6, D 2.7, D 2.8, D 2.9, D 3.1, D 3.2, D 7.3; N 8.1, N 8.4; V4, V5.

**Cannot.** Say anything about private repositories: they are outside every public frame. The owner's kind is "inside
what was sampled" only by its described traits (size, activity, team, language), not by membership; that private code
behaves like public code of the same traits is an `assumption` that only the owner's case can check, two repositories
deep. Cannot cover other forges or repositories inactive in W. Cannot make the sample a census (D 1.2): the archive
records only what GitHub chose to emit.

**Refuted if.** The pilot shows sigma_b^2 small beside sigma_w^2 / m at practical m (then repositories are
interchangeable and depth on few would do); or the owner's repositories fall outside every stratum's range on the
stratum variables; or the post-cloning blob clustering merges so many clusters across test and training that the
design weights must be recomputed past usefulness.

### C1 what is stored and in which shape

**Choice.** Two layers. (a) The raw record: the full git repository (deep tier) or a clone with history and trees but
no file contents (wide tier), plus the raw API responses for pull requests, issues, issue edits, checks, stored as
received. (b) A relational entity store derived from (a) by code, one irreducible fact per row (D 4.4, D 9.3), each with
the time it became visible. Tables (keys in brackets): repository [repo]; cluster [cluster] with stratum and pi;
commit [repo, sha] with author time, committer time, parents, full message; main-line arrival [repo, sha] with the
time the commit became reachable from the default branch; file identity [repo, file_id]; path at time
[repo, file_id, valid_from]; change [repo, sha, file_id] with status, lines added and removed, hunks; blob
[blob_hash] with size and language; file version [repo, file_id, valid_from] to blob; symbol definition and reference
[blob_hash, ...]; import and test link [repo, file_id, valid_from, target]; pull request [repo, pr] with open, merge
times and commit list; issue [repo, issue]; issue text version [repo, issue, edited_at]; link closes [pr or sha,
issue] with its time; error event [repo, error_id] with text, source, time. Eligibility rules (endings, sizes, merges,
bulk edits) are views over the store, each written down.

**Depends on.** C2 (which repositories), C4 (the visibility time).

**Alternatives weighed.** A flat table of examples with features (the current form): lost, V1 and D 9.2. A
knowledge-graph triple store of yes-or-no facts: lost, it drops amounts and times (counts were what the learned arms
lacked; `CANDIDATES.md` G1) and N 13.7 ties it to stored identities. Git alone, no derived store: lossless but every
question would re-derive history; the derived store is a cache with lineage, rebuildable from (a).

**Rests on.** D 4.1, D 4.3, D 4.4, D 4.7, D 4.8, D 9.2, D 9.3; N 13.1, N 13.9.

**Cannot.** Recover what the forge never emitted (deleted issues, force-pushed history, CI logs past retention). Prove
its own keys (D 4.2): they are stated and tested (C8).

**Refuted if.** A derived table cannot be rebuilt from the raw layer bit for bit by its code (lineage broken).

### C3 what is taken from the code itself

**Choice.** Deep tier only, for every file version alive at any asking time: content (by blob hash, stored once),
size, language, definitions and references from a parser per language, imports, test-to-source links (imports from
test files plus name conventions, kept as two separate kinds), and the diff hunks of every change. Parsed per distinct
blob, so cost grows with distinct blobs, not with versions times files (`count first: distinct blobs per repository`).
Wide tier: paths, sizes from trees, change lists, line counts; no content, by design and for every row.

**Depends on.** C1, C2 (which tier), C4 (version current at asking time).

**Alternatives weighed.** Content only at the newest version (cheap): lost, it gives files their future content at
past asking times (V3). Content for all tiers: affordable in disk only on a rented machine, and parse cost multiplies;
kept as an option if the pilot shows the wide tier's history-only questions are weak. Text embeddings stored in place of
content: lost, a projection (V1); embeddings are computed at loading (C9).

**Rests on.** N 5.5, N 11.1 (reach beyond history needs content links, not hops); N 9.10 (structure features are
inductive); D 5.3; P6; `research-tree/build/improve/CANDIDATES.md` line 24 (reach of the thin graph).

**Cannot.** Resolve references exactly in dynamic languages; a parser reports what is written, not what runs. Cover
languages without a built parser: those repositories get content and imports by pattern only, a marked segment.

**Refuted if.** In the pilot, references and test links add almost no right files beyond history and imports (`count
first: reach per kind`).

### C4 time and leaks

**Choice.** Every fact has a visibility time: for a commit's content and changes, the time it reached the main line
(from first-parent history and merge commits, which is why merges are kept); for an issue text, its edit time; for a
pull request's commits, their push time if recorded, else their committer time, marked. A question has an asking time
(C5). The loader serves only facts visible strictly before it (D 9.4). Two cuts on top: a calendar cut T0 between
training and test (training questions and every statistic learned from data before T0 minus a gap; D 6.4, D 7.1), and
the repository cut of C2. Cross-repository leaks: blobs shared between a test and a training cluster are counted; a
test cluster sharing more than a stated share is merged (C2). A pretrained text encoder may have read a public test
repository; repositories created after its cut-off are their own stratum and are the clean reading for anything that
uses it.

**Depends on.** C1, C2.

**Alternatives weighed.** Committer time only (current): lost, a branch commit dated before the cut-off can reach the
main line after it, so the loader would give a question code that was not on the main line yet (D 4.4: facts known at
different times belong apart). Random splits: "Never" (D 6.2). A repository cut with no calendar cut: lost, training
repositories' futures can carry shared libraries and copied code forward past test asking times.

**Rests on.** D 4.4, D 6.1, D 6.2, D 6.4, D 7.1, D 9.1, D 9.4; V3.

**Cannot.** See pushes the forge did not record; rebased or squashed history has lost its true times. Cannot rule out
pretraining exposure for repositories created before an encoder's cut-off.

**Refuted if.** The injected-leak test (C8) passes unnoticed; or the gap between committer time and main-line arrival is
negligible in the pilot (then the extra table is cost without gain, `count first`).

### C5 the examples and labels of each of the three questions

**Choice.** One table of questions (entity, time, label; D 9.1), with the question kind and a tier mark.
- *Change.* Asked-about: the files and diffs of a pull request's first commit (or first k commits); asking time: that
  commit's push time; right files: files changed by the pull request's later commits and not by the first; candidates:
  every file alive at asking time. Second tier, marked: inside one commit, one file and its diff as the seed, the other
  files as truth (the current form; order unknown). Pull requests come from merge commits' second parents in the wide
  tier, from the forge's records in the deep tier.
- *Task words.* Asked-about: an issue's title and body as first written (from its edit history; where none is
  retrievable, the current body, marked); asking time: issue creation; right files: the files changed by the pull
  requests or commits that close it. Commit messages and pull request descriptions as task text: a separate marked
  tier (V7).
- *Error.* Asked-about: an error text known before the fix. Three sources, each its own tier: (a) issues whose text
  holds a traceback or compiler message, right files from the closing change; (b) failing checks on a pull request
  followed by a passing one, right files from the change between them (only inside the forge's log retention); (c) in
  the deep tier, generated: run the tests of a fix commit against its parent in an offline container; the failure text
  is the question, the fix's non-test files the answer. (c) needs dependencies installed, so it waits for the owner's
  word and runs on a subset.
- Every question records its sub-population: the repositories in which its label source exists at all.

**Depends on.** C1, C3, C4.

**Alternatives weighed.** Synthetic errors by injecting faults: exact labels, but a distribution of faults no developer
made; allowed only as a marked tier for training, never for the claim. Error text from commit messages ("fix
TypeError ..."): written after the fix (V7). Using only the first-commit form for change: loses repositories that squash
or push single commits; hence the second tier, read apart.

**Rests on.** D 6.1, D 9.1; N 9.7, N 10.5, N 12.7 (the asked-about thing is linked to candidates, so candidates can be
described relative to it); P1; V7.

**Cannot.** Draw questions where the forge holds no links: repositories without issue use or that squash every pull
request contribute to fewer questions, so each question's claim covers its own sub-population only. The error
question's sources (a) and (b) are self-selected by projects that report tracebacks; (c) covers only failures that a
test catches.

**Refuted if.** `count first`: in the pilot, fewer than about a fifth of repositories have any error question from (a)
or (b); then the error question needs (c) as its main source and the claim for errors narrows to "failures tests catch".

### C6 how examples are drawn and weighted

**Choice.** Inside a repository, questions are the units of an event sample: drawn as events, they over-represent files
that change often (D 2.2, incident sampling), which is the deployment distribution and is kept. Each question counts
once: a question with several possible seeds uses one, drawn at random, or all at weight 1/n. The size of each event
is stored as a fact and given to the model (C9) instead of being fixed as a weight (W12). Across repositories, each
training repository's questions sum to the same total weight, scaled by stratum so that the training mix matches the
population on the stratum variables (D 3.2); no repository dominates (W3). Bulk edits stay in, as a segment, never
dropped. Negatives: every non-right file alive at asking time; where sampled for cost, never a right file of the same
question (N 13.6).

**Depends on.** C2, C5.

**Alternatives weighed.** Weight by number of questions (pooling): lost, W3. Equal weight per question across all
repositories: same fault. Dropping bulk edits: a cap (V2).

**Rests on.** D 2.2, D 2.10, D 3.2, D 7.4 (rare kinds kept so they are not memorised from two examples); N 13.6.

**Cannot.** Fix the training mix for the owner's kind exactly; it matches the population on described traits only.

**Refuted if.** Equal repository weights make validation per-repository scores worse in every stratum than question-
count weights (then the population's large repositories carry learnable signal the small ones need).

### C7 splits, tests of generalisation, baselines, measures

**Choice.** Three readings, never pooled together: (1) unseen repository and future time: test clusters, questions after
T0, each using its own history before its asking time; (2) seen repository, future time: training repositories after
T0, to separate "new repository" from "new time"; (3) the owner's case, two repositories, read alone. Validation
clusters choose every setting; test is scored once. Baselines, computed per repository from its own past: co-change
counting with and without the 1/size weight, recency, the last change's files, import and test neighbours, text search
over paths and content. Measures: recall at 1, 5, 10, 20 and the rank of the first right file, over all files alive;
per repository first, then the population mean weighted by 1/pi with intervals by bootstrap over clusters within strata.
Segments: stratum, history length at asking time, share of right files never co-changed with the seed, question tier,
language.

**Depends on.** C2, C4, C5.

**Alternatives weighed.** Time split inside each repository only (current): lost, V4. Repository split without time:
lost, C4. Leave-one-repository-out over many: equivalent in claim, costlier; kept for the deep tier if test clusters are
few. P@10: kept as a reading, never the measure (W11).

**Rests on.** D 3.2, D 6.2, D 7.1, D 7.2, D 7.3, D 7.4; N 8.1, N 8.4, N 13.6.

**Cannot.** Claim beyond the frame and window (C2). Cannot say the model survives drift beyond the test window (D 7.4).

**Refuted if.** Baselines' per-repository spread is so wide that 150 test clusters give intervals wider than the
differences of interest (then n is raised by the C2 formula).

### C8 checks on the data

**Choice.** Stated keys and dependencies per table (C1), reduced to a canonical cover and enforced as keys where the
tables are split that way (D 4.6, D 4.7); every load tests them and reports violations, never "proves" them (D 4.2).
Inclusion dependencies (every change's commit exists; every closing link's issue exists). A time assertion in the loader:
no served fact visible at or after the asking time. An injected leak: one deliberately future-dated fact per run, which
the check must catch (D 6.3). A description of every repository (sizes of changes, share of merges, bulk edits,
squashing, issue use, language mix). A missingness table per column and repository, with its cause (D 5.3); no row is dropped for a gap (D 5.1). The sample
against the frame on the stratum variables. Duplicate blobs across splits.

**Depends on.** C1, C2, C4.

**Alternatives weighed.** Reading the code for the leak rule (current): lost, D 6.3. Profiling dependencies from the
data: useful to find candidates, never a proof (D 4.5; V9).

**Rests on.** D 4.2, D 4.5, D 4.6, D 4.7, D 4.9, D 5.1, D 5.3, D 6.3.

**Cannot.** Find a leak of a kind nobody wrote a check for.

**Refuted if.** A leak is later found that the injected test would have missed.

### C9 what is handed to a model

**Choice.** Per question, a time-cut neighbourhood of its own repository's entity graph (D 9.3, D 9.4): the question
node; the anchor files (seed files, files named in an error, none for task words) linked to it; candidate files with
features of their version (text-encoder vector computed at load, size, language, age, symbols); event nodes (commits,
pull requests) with size and time, not collapsed into edges; typed, directed links (changed-in, imports, references,
tests, folder, closes). All amounts are relative to the repository's own scale (counts over its commit total, ages in
units of its commit rate) so that a new repository's values fall inside the training range (N 2.1, N 7.1; D 8.1). No
stored identity per file or repository (V6; N 9.10, N 13.7). A flat table for a tree ranker is derived from the same
neighbourhood at load, inside the training fold (D 6.4).

**Depends on.** C1, C3, C4, C5.

**Alternatives weighed.** Fixed pairs or triples (current): lost, V1 and G1 in `CANDIDATES.md`. Whole-repository graphs:
the largest repositories do not fit, and a sampled subgraph biases gradients (D 2.10, N 14.3); the per-question
neighbourhood is an ego design whose overlaps stay recoverable because the store is whole (D 2.5).

**Rests on.** D 2.5, D 2.10, D 8.1, D 9.3, D 9.4; N 9.10, N 10.5, N 12.7, N 13.9.

**Cannot.** Give the model what the neighbourhood's radius leaves out (N 5.5); wide-tier questions carry no content.

**Refuted if.** Relative amounts do worse on unseen repositories than raw ones in validation.

## 5. Own profile

- **P1 in part.** Change and task words by construction where pull request and issue links exist; error open on a count
  (C5). The commit-message tier is marked, not the question.
- **P2 by construction.** Raw git and raw responses kept; one fact per row; no cap; eligibility as views.
- **P3 by construction for the public frame; in part for the owner's kind.** Clusters drawn by a stated design with
  known pi, held out whole. Private repositories lie outside the frame; covered only in described traits, checked on two.
- **P4 by construction, one count open.** Loader cut, calendar cut, injected leak; main-line arrival time open on a count.
- **P5 by construction for git-derived kinds; in part for references** (parser per language).
- **P6 in part.** Deep tier by construction, present for every row; wide tier has no content for any row, by design.
- **P7 by construction.** Inclusion probabilities, stated keys, missingness tables, baselines, segments, full-rank
  measures.

**Weakest: P1, the error question.** Its labels exist only in a self-selected sub-population, and the clean source (c)
needs the owner's word and running other people's tests.

## 6. Cost

- **Downloads (each needs the owner's word, on a rented machine).** Public GitHub event archive for 12 months: streamed,
  only names and counts kept (`count first: its size`; `assumption`: hundreds of GB compressed, never stored whole).
  Pilot: 30 repositories in full, a few GB. Wide tier: about 3,000 clones without file contents (`assumption`: 50 to
  300 GB). Deep tier: about 400 full clones (`assumption`: 50 to 150 GB). Forge records for pull requests, issues, edits
  and checks through the public interface, rate-limited: `count first: requests needed`; days, not hours.
- **Disk.** The PC has 32 GB free: collection and the store live on the rented machine or an added disk; only
  the owner's case and held-out truth stay on the PC (V8).
- **Time.** Frame pass and pilot: one to two days. Wide tier: days of cloning in parallel. Deep tier parsing: per
  distinct blob. Training fits the four cards for eight hours because the store is cut per question at load.
- **Owner's word.** Each download, the rented machine, the forge requests, running tests for error source (c).

## 7. Counts to make first

1. The frame: number of clusters meeting the minimum, their distribution on size, rate, team, language; the archive's
   size for the window.
2. Pilot of 30 frame-drawn repositories: between-repository and within-repository variance of the baselines' recall at
   10, which fixes n and m (wide against deep).
3. Error labels: share of repositories with traceback issues, with failing-then-passing checks inside log retention.
4. Change and task labels: share of pull requests with more than one commit touching different files; share of issues
   with a closing link; share with retrievable first text.
5. Reach per kind of link (history, imports, references, tests, text) for right files, on the pilot.
6. Gap between committer time and main-line arrival; shared blobs across clusters.
7. The owner's two repositories on the stratum variables (on his PC).

## 8. Coverage

Used: D 1.1, D 1.2, D 2.2, D 2.3, D 2.5, D 2.6, D 2.7, D 2.8, D 2.9, D 2.10, D 3.1, D 3.2, D 4.1, D 4.2, D 4.3,
D 4.4, D 4.5, D 4.6, D 4.7, D 4.8, D 4.9, D 5.1, D 5.3, D 6.1, D 6.2, D 6.3, D 6.4, D 7.1, D 7.2, D 7.3, D 7.4, D 8.1,
D 9.1, D 9.2, D 9.3, D 9.4.

Set aside:
- D 2.1 (induced subgraph): no node sample of a repository's graph is taken; the store keeps each graph whole.
- D 2.4 (path tracing): no step records only routes between chosen points.
- D 3.3 (imputation): unseen parts are not imputed; they are marked missing with their cause (C8).
- D 3.4 (model the observation): the sample is designed so that design weights suffice; kept for the archive's own
  recording bias if the pilot shows it matters.
- D 5.2 (options for missing values): no row or column is dropped; the choice of a model that accepts gaps belongs to
  the model side.
- D 7.5 (feature engineering): a model-side question; the store gives the raw facts any feature is built from.
- D 8.2 (multi-step forecasting): one ranking per question, no steps ahead.
