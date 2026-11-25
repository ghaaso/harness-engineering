# The data design, as handed to the model side: the Choice of each of its 15 decisions

Copied by script (the heading and the paragraph labelled Choice of every decision block, wording unchanged) from `docs/program/hypotheses/DATA-HYPOTHESIS-2026-11-26.md` on 2026-11-25. Open that file for the alternatives, the reasons and what would refute each choice. Letters such as (c) name options listed there. It is taken as given by the model side; it is not yet passed by the owner.


### D1. Rebuild the collection and the store; keep the rules and reuse the old code where it fits
**Choice.** (c). The old data stays frozen as a record. The three old repositories pass through the new pipeline in
the roles of D15.


### D2. The population, the list and the draw
**Choice.** (f).
- *Population.* Public repositories whose main line received changes of several files during a 12-month window ending
  at a cut-off date, with a stated minimum of history. The minimum is set after the list's spread is seen, with the
  owner's two well above it. It defines the population; it is not a cap on records.
- *List.* Every repository with a push in that window in the public archive of the host's events.
- *Unit.* A cluster: forks and copies are one project (fork link, shared first commit, shared content after cloning).
- *Draw.* Phase one at random from the list by what the archive shows (activity, number of people pushing). For that
  draw the host's public description is fetched. Phase two is drawn from phase one by size, length of history, main
  language and date of creation. Small repositories and short histories are over-drawn. Every cluster keeps its
  probability of inclusion.
- *Held out.* Test and validation clusters are drawn first, from every stratum, and removed before training is drawn.
- *How many.* Computed from a pilot of about 30 drawn repositories: the spread of a baseline's score between
  repositories against its spread inside one. Until then, for planning only: about 150 test and 60 validation
  clusters, and between 400 and 1,500 for training.
- *Licence.* Recorded per repository. Nothing collected is passed on to anyone. Whether the list is limited to
  licences that plainly allow this use is the owner's ruling; until he rules, no repository is left out for it.


### D3. What is stored: the raw record, and beside it a store of single facts
**Choice.** (e). The derived store follows git's own form (N): content by its hash; the tree of each commit; each
commit with its parents, both of its times and its full message; each change with old and new content and lines
added and removed, merges included, nothing filtered. Beside these: when a commit reached the main line; the facts
parsed from a piece of content, keyed by that content alone; their resolution, keyed by the tree; pull requests with
their commits in order; issues with every version of their text; links between them with kind and time; error texts
with their source; the repository with its cluster, stratum and probability. Rules about which commits count
(endings, sizes, merges) are views, each written down. Authors are resolved (one person, several names) and stored
as a keyed code per repository, never as text. Changes made by bots and generated files are flagged.


### D4. How deeply each repository is processed
**Choice.** (c). The second sub-sample over-draws repositories that link issues to fixes, with the probability kept.
That habit can be estimated from the clone alone (merge messages and closing words), before any request to the host.


### D5. What is taken from the code itself
**Choice.** (c). Per piece of content: what it defines, the names it uses, its imports as written, strings that look
like paths or routes, comments; its size and language. Per tree: imports and uses resolved to files, each failure
kept with its reason. Test links of two kinds, by import and by name, each with its rule. Folders. A name that
matches but cannot be resolved is a kind of link of its own. Every kind of file is kept; how deeply it could be
parsed is recorded. The diff of every change is kept.


### D6. Time: when a fact became visible, and the moment of asking
**Choice.** (d). A commit's content and changes are visible from the time it reached the main line; an issue text
from the time of that version; both commit times are kept, and a rewritten history is flagged where they disagree.
The asking time is defined per question (D8 to D10). The loader asserts, per example, that nothing served is dated
at or after it. Whatever is learned from data (word weights, scalers, any tuning of an encoder) is learned on
training repositories and training times only.


### D7. The cuts: by repository and by date
**Choice.** (c) for the main reading, with three stretches of time: training facts; then validation questions, on
which every setting is chosen; then, after the cut-off date, test questions. A gap as long as one change usually
lives separates the stretches, so that one piece of work never straddles a boundary. The cut-off date is set no
earlier than the training cut-off of any pretrained part the model uses: no such part can then have read the answers
of the main reading. Test repositories with no question after the cut-off are counted and reported.


### D8. The change question
**Choice.** (c) as the first tier and (b) as the second, marked. The unit of work is the merged pull request, else
the commit. Asking time: the first commit, read against the main line before it. "First" is by author time, since
rewriting a branch resets commit times; a rewritten pull request is flagged. Right files: the remaining files of
the unit; an added file is a label of its own kind ("a new file belongs here"), a deleted one likewise. The order
of commits inside a pull request is kept, so the question can be put in one step or step by step.


### D9. The task-words question
**Choice.** (c) is the question: title and body of the issue as first written; asking time its creation; right files
those of the change that closed it; the kind of link stored. (b) and (a) are kept as two marked tiers, never pooled
with it. All issues are kept in the raw record, linked or not, so that the linked ones can be described against the
rest.


### D10. The error question
**Choice.** Tiers, each marked and never pooled. Real, reported: (b). Real, recorded: (c), inside the time the host
keeps logs. Real, re-run: (d). For training only: (e). An extra test with its claim cut to those repositories: (f),
whose repositories enter the clusters of D2 so that none sits on both sides. Right files: the fix's files, tests
marked apart. The files a trace names are an input and a baseline, never hidden. The order of work: count (b) and
(c) first; take (f) before building (d), because such sets come with their environments solved; build (d) only if
the counts show the need.


### D11. How examples are drawn and weighted
**Choice.** (b). In training every repository carries the same total weight, with a bound on the weight of a single
example so that a tiny repository's few questions do not dominate; the bound is set on validation repositories. The
size of a change is stored as a fact a model can read, not only baked into a weight. Bulk changes are flagged and
read apart. Candidates are all files alive at the asking time; negatives used in training are drawn by a stated
design, with the probabilities kept, and are never a right file of the same question.


### D12. Tests of generalisation, baselines and measures
**Choice.** (b). Readings: an unseen repository after the cut-off date (the main claim); a repository seen in
training, after the cut-off; the owner's two (D15); cold start, a held-out repository with its history cut to its
first 10, 100 and 1,000 commits; the whole span of held-out repositories, marked. Baselines on the same examples:
for a change, counting with the one-over-n weight, recently changed, same folder, import neighbours; for task words,
text search over paths and content and the files the text names; for an error, the files in the trace. Measures: the
rank of each right file among all files alive; the share found in the top 1, 5, 10 and 20; the reciprocal rank of
the first; hits in the top ten over the smaller of ten and the number of right files. Per repository first, then
the mean weighted by one over the inclusion probability, with intervals by resampling clusters inside strata. Read
by stratum, tier, length of history, kind of file, whether the right file had earlier joint change or a code link,
and whether the repository was created after the cut-off of every pretrained part (nothing of such a repository can
have been read before). The test is scored once.


### D13. Checks on the data
**Choice.** (b). Keys and dependencies, reduced to a smallest set, tested and never called proved. A loss test:
diffs rebuilt from the store. Leak tests: the loader's assertion; inputs built from the store cut at the asking time
must equal inputs built from the whole store; a planted later fact must never arrive; a model given shuffled labels
must fall to chance. A description of every repository (sizes of changes, merges, bulk changes, squashing, issue
use, languages, tests). A table of missing values per column and repository with the cause, compared between
training and test; no row is dropped for a gap. The sample held against its list. Content shared across the split.
The regression check of D1.


### D14. What is handed to a model
**Choice.** (d). The question as a node (text, diff or error text); the files it starts from, linked to it by kind:
"in the change", "named in the text", "in the trace"; candidate files with their raw content at that time; events
(units of work, commits) as nodes with their size and their time relative to the question; typed, directed links.
Amounts relative to the repository's own scale, with the repository's description beside them. Flags for missing
values. No stored identity of a file or a repository. The flat table of (b) is derived from the same neighbourhood
at loading, for a tree ranker and for the baselines. Where a neighbourhood must be sampled, how it was sampled is
recorded.


### D15. The repositories we have
**Choice.** (c). The owner's two are never trained on and never leave his PC; the model comes to them. Their clean
reading is on questions from stretches never opened: the old held-out part, and what was committed since. The public
one may be drawn into training like any other; it is never counted in a test figure. Our reading of the standing
rule "held-out truth stays on his PC": it binds his two repositories and the old held-out sets. The truth of public
test repositories is public history; it is kept from training by the split and the loader, and checked by D13.

