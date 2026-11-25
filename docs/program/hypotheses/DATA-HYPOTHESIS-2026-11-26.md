# Data hypothesis: what is wrong with the current data, and the data to build instead (2026-11-26)

Standing: a hypothesis for the owner to pass or correct (journal r58-0017, r58-0021, r58-0024). Nothing was built,
collected, downloaded or run for it. It replaces the draft of 2026-11-25, which was one line of reasoning and is now
candidate F of the search below. References: `N x.y` is an entry of `docs/program/learning/MECHANISMS-NEURAL.md`,
`D x.y` of `MECHANISMS-DATA.md`; `record:` is a file of our own record. Where the material is silent an item is
marked `assumption` or `count first`. P1 to P7 and V1 to V9 are the profiles and vetoes of
`docs/program/hypotheses/search-data/CRITERIA.md`; K, L, M, N and F are the five candidate designs.

Not reached by a graph of thoughts: five whole designs (four separate runs and the judge's own draft) were scored once and merged once, by the judge, in a single pass. Section 2 says what was and was not done.

## The answer in short

1. The current data cannot carry the goal, and most of the fault lies in what was collected, so repair is not enough.
   Three repositories that were at hand; the history cut down to file lists and then to pairs; commit messages
   reduced to their first line; no content; commit messages used as "task words"; nothing for the error question.
2. Rebuild the collection. Repositories are drawn at random, by a stated design, from a list of all public
   repositories active in a stated year; whole repositories are held out; the owner's two are never trained on.
3. Keep the raw record (the clone and the host's answers) and derive from it a store of single, time-stamped facts.
   Every input and every label is built from that store as of the moment of the question.
4. Three questions, three kinds of example, each in tiers by how real its question is. The error question is the
   weakest part of any design: real error texts tied to a fix exist only where projects report them or keep tests
   that run. How many there are is the first count.
5. Before any training: seven counts, the first three on the repositories we already have, with no download.

## 1. What is wrong with the current data

Each fault with the fact and the entries. Faults 3, 4, 8 and 9 were found by the rival runs in the extraction code and
checked there by the judge (`search-data/search.jsonl`, records `factcheck`).

1. **Three repositories, taken because they were at hand, all three in training and in test.** One is 82 % of the
   pooled score. Nothing can be said about a repository never trained on. (D 1.2, D 2.6, D 3.1; N 8.1, N 8.4)
2. **A commit is stored as a list of paths.** No diff, no content, no symbols, no author, no pull request, no issue.
   What was not recorded no model can recover. (D 9.2, D 4.3)
3. **The message is the first line only.** The extraction asks git for the subject line and cuts that to 600
   characters; the body is never read. (D 1.1; record: `research-tree/build/runbig/card/d4/extract.mjs`)
4. **Records are capped and dropped while collecting.** No merges; seven file endings; only commits of 2 to 50 code
   files; an added file is never a right file. Afterwards a cap cannot be told from the world. Leaving files out by
   their ending is also a node sample of the repository's graph: links to left-out files are never seen. (D 1.1,
   D 2.1)
5. **Models were fed pairs and yes-or-no facts.** From pairs the changes cannot be rebuilt. (D 4.3, D 4.8; N 9.5)
6. **A content input was empty for 88 to 99 % of the training cells of two repositories.** A gap made by collection
   is a pattern a model learns and the test does not share. (D 5.3, D 3.3)
7. **Too little reach.** 30, 66 and 21 % of the right files never changed with the starting file before; imports
   reach 25, 18 and 25 % of right files, folders 29, 18 and 37 %, names 6 to 9 %. No references, no test relations.
   (N 5.5; record: `research-tree/build/improve/units/T1/report.md`)
8. **The "task words" were commit messages**, written after the change, with the edited paths removed by script.
   That is a text written after the answer was known. (D 6.1; record:
   `research-tree/build/runbig/card/d2/README.md`)
9. **Links are recorded with silent gaps.** Imports come from a line pattern; what it cannot resolve is dropped, and a
   failed search leaves an empty list with no mark. A missing link cannot be told from an absent one. (D 1.1, D 5.3)
10. **Time is the commit time of a flattened history.** A commit made on a branch counts as history from its own
    date, although nobody on the main line could see it before the merge. How often this happens is a count.
    (D 9.4, D 4.4)
11. **The cut-off is per block of 10 or 20 commits, not per question.** Not a leak; a gap that real use does not
    have. (D 7.1)
12. **A commit of n files gives n examples, and the largest repository gives most of them.** The one-over-n weight
    was found by trial; it is the correction for sampling by events and should have been derived. (D 2.2, D 3.2)
13. **The yardstick has a ceiling of about a quarter** and is read pooled. (D 7.3; N 13.6)
14. **Nothing is stated or tested.** No keys, no automatic leak test, no description of each repository. (D 4.2,
    D 4.5, D 6.3)
15. **The error question has no data at all.**

What is sound and kept as rules: a strict "before" cut in time, a file identity that survives renames, naive
baselines beside every model, results per repository. (D 6.1, D 1.2, D 7.2, D 7.3)

## 2. How this was reached

This was not a graph of thoughts, although it was first reported to the owner as graph thinking (his correction and
the session's own judgement: r58-0027). What was done is listed here; what was not done follows the list. The records
are in `docs/program/hypotheses/search-data/`.

1. **The yardstick first.** `CRITERIA.md` was written before any rival design existed: seven profiles (the six
   demands of the problem read as demands on data, and "the data can be trusted"), four levels, nine vetoes taken
   from "cannot" entries, and the stop rule. No averages and no votes.
2. **Five whole designs.** Four separate runs, each from an assigned starting point and blind to the others: K keep
   and repair; L from the three questions back; M from the population of repositories; N from the code as it stands.
   Each read both learning files in full and a sheet of facts about our data that held no conclusions. The fifth, F,
   is the judge's own draft of 25 November.
3. **Judging.** Each design was read in full against the learning files; 35 verdicts (five designs, seven profiles),
   each with its entries. Five facts the runs reported about our extraction were checked in the code; all five hold.
4. **What was removed.** F, the judge's own design, is at least matched on every profile and beaten on several by K,
   by L and by N. It was removed as a whole. Its pull-request description as "task words" was struck under V7.
   Ordering history by commit time alone (F, K, N) was replaced.
5. **Merge.** K, L, M and N survive; none is at least as good as another everywhere. L leads on the three questions,
   M on the sample and on time, N on kinds and on content; K alone has three useful parts. The decisions below take
   each part from where it is strongest and name the source.
6. **Entry-by-entry pass.** Every entry of the data file was held against the merged design (section 9). It added
   what no run had: the owner's two repositories have already been tuned on; the cut-off date tied to the cut-off of
   any pretrained part; authors as an entity and as personal data; bots; all issues kept, not only linked ones.

What was not done. The problem was not split into parts with several answers generated for each part: every run
wrote a whole design. The parts were never scored one by one. The merge of step 5 was made once, by the judge, in a
single pass; no rival merge existed to hold it against, and the merged design was not scored by the recorded steps
used for the five designs. Where the designs disagreed, the judge chose in that pass or put the point off (section
6). Step 6 and the two passes after it were re-readings by the same session, not rounds in which new designs were
generated and scored. So the weak spot of this hypothesis is the merge, and above all the points of section 6.

Three more limits, stated plainly. The rival runs were given the yardstick, which already demands a lossless store, a
designed sample and time-correct inputs; that all five agree on those points repeats the yardstick and is not
independent evidence. The runs were worth having for what they added beyond it. Hiding the designs' letters from the
judge was pointless here (the starting points show, and one design is the judge's own), so every verdict is recorded
with its entries instead. And the process cannot prove the design right; it gives the best-argued one and the counts
that remain.

## 3. The graph of decisions

An arrow reads "has to be settled before".

    diagnosis --> D1 rebuild --> D2 population, list, draw --> D4 depth per repository --> D9, D10 text questions
                                 D2 --> D7 the cuts --> D12 tests and measures
                  D1 --> D3 the store --> D5 from the code --> D14 what a model is handed
                         D3 --> D6 time --> D7
                         D3, D6 --> D8, D9, D10 the three questions --> D11 weights --> D12
                         D3, D6, D8-D10 --> D13 checks
                  D2, D12 --> D15 the repositories we have

It is a graph, not a tree: D2 (the draw) and D6 (time) each feed several later decisions, and D7 hands a constraint
forward to the model hypothesis (the cut-off date bounds which pretrained parts may be used).

## 4. The decisions

### D1. Rebuild the collection and the store; keep the rules and reuse the old code where it fits

**Depends on.** The diagnosis (section 1); P1 to P7.

**Alternatives.** (a) Keep the data and add inputs. (b) Repair the extractor and extract the same three repositories
again. (c) Rebuild the collection and the store; carry the sound parts over as rules and, where it fits, as code.

**Ruled out.** (a): what was never recorded cannot be recovered, and three at hand stay three (D 9.2, D 1.1, D 3.1).
(b): it mends rows, not where the rows came from; a sample whose inclusion probabilities are unknown cannot be
weighted into a sound one (D 3.2, D 2.9).

**Choice.** (c). The old data stays frozen as a record. The three old repositories pass through the new pipeline in
the roles of D15.

**Why.** K was assigned to argue for keeping and still ended at rebuilding the sample, the text source and the error
data, while keeping the extractor's core (the replay of history with stable file identities, the "before" cut).
L, M and N rebuild and keep the same things as rules. So the five designs differ here only in how much old code is
reused, which the material does not decide; the replay is reused where it fits.

**Rests on.** D 1.1; D 9.2; D 3.1; D 3.2; D 2.9; record: docs/program/hypotheses/search-data/candidates/K.md;
record: research-tree/build/runbig/card/d4/extract.mjs

**Refuted if.** The new pipeline, run on the three old repositories with the old filters applied as a loading rule,
does not reproduce the old examples and the old counting figures. One of the two is then wrong, and nothing is built
on the new one until the difference is explained.

### D2. The population, the list and the draw

**Depends on.** D1; P3.

**Alternatives.** (a) The three at hand. (b) Popular repositories, a curated list or a ready benchmark set. (c) A
crawl outward from known repositories. (d) The host's search, sliced until every slice is complete (K). (e) A plain
random draw from a list. (f) A stratified random draw, in two phases, of clusters of repositories from the public
archive of the host's events (M).

**Ruled out.** (a): a convenience sample (D 1.2, D 3.1; V5). (b): chosen on a trait tied to the outcome, large and
team-made, the opposite of the owner's kind; a set chosen by others by unknown rules (D 2.8, D 1.1; N 8.4). (c):
exploration over-samples the well connected and makes samples look alike whatever the truth (D 2.3, D 2.8). (d): not
ruled out by an entry; set aside because a search index is a recording of unknown reach and its completeness cannot
be checked (D 1.1); kept as a cross-check on the pilot. (e): sound but wasteful: most draws are tiny or dead, and the
kinds that must be read alone get too few (D 2.7).

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

**Why.** The repository is the unit of the claim, so it is the unit that is sampled, held out and averaged over. The
entries on sampling speak of the nodes of one graph; they are applied here, by extension, to repositories drawn from
a population. M is the only design whose list is a census of what it defines, which is what makes a random draw
possible at all. Strata
are limited to what the draw must control; a team's habits (how it links issues, how it packages changes) are
measured per repository and used to read results, since more strata leave cells that cannot be filled. The five
designs' planning numbers range from 400 to 3,000 because none could compute them: they follow from the pilot.

**Rests on.** D 1.2; D 2.3; D 2.6; D 2.7; D 2.8; D 2.9; D 3.1; D 3.2; N 8.1; N 8.4; assumption; count first: the
size of the list and its spread by activity, size, people and language; count first: a pilot of 30 drawn
repositories; record: docs/program/hypotheses/search-data/candidates/M.md

**Refuted if.** The pilot shows scores differ little between repositories beside their spread inside one (a few
repositories processed deeply would then do); or the owner's two lie outside every stratum; or clustering after
cloning joins so many clusters across the split that the weights lose their meaning.

### D3. What is stored: the raw record, and beside it a store of single facts

**Depends on.** D1; P2.

**Alternatives.** (a) File lists per commit (now). (b) One wide table of examples with features. (c) A graph of files
with joint-change edges. (d) A store of yes-or-no facts. (e) Two layers: the raw clone and the host's answers kept
untouched; a derived store, one fact per row, rebuilt from the raw layer by code.

**Ruled out.** (a), (b), (c), (d): each is a projection from which the recorded changes cannot be rebuilt, and (c)
turns the change, an event with its own time, size and text, into an edge (D 4.3, D 4.8, D 9.2, D 9.3; V1).

**Choice.** (e). The derived store follows git's own form (N): content by its hash; the tree of each commit; each
commit with its parents, both of its times and its full message; each change with old and new content and lines
added and removed, merges included, nothing filtered. Beside these: when a commit reached the main line; the facts
parsed from a piece of content, keyed by that content alone; their resolution, keyed by the tree; pull requests with
their commits in order; issues with every version of their text; links between them with kind and time; error texts
with their source; the repository with its cluster, stratum and probability. Rules about which commits count
(endings, sizes, merges) are views, each written down. Authors are resolved (one person, several names) and stored
as a keyed code per repository, never as text. Changes made by bots and generated files are flagged.

**Why.** The raw layer makes "nothing was lost" a test, not a claim: the store must be rebuildable from it. Facts
that become known at different times sit in different tables, so none waits for another. Keying parsed facts by
content alone, and their resolution by tree, keeps each dependency inside one table, where a key enforces it for
free. Authors are personal data and an entity that needs resolving; bots are the recording system acting on itself.

**Rests on.** D 4.1; D 4.3; D 4.4; D 4.7; D 4.8; D 4.9; D 9.2; D 9.3; D 1.1; D 1.2; N 13.9; record:
docs/program/hypotheses/search-data/candidates/N.md

**Refuted if.** A diff rebuilt from the store differs from git's for any sampled commit, or a derived table cannot
be rebuilt from the raw layer by its code.

### D4. How deeply each repository is processed

**Depends on.** D2; D3; P6.

**Alternatives.** (a) Everything for every repository. (b) Two tiers (M): thousands with history and file lists only,
a few hundred with everything. (c) Depth by what is dear: everything that comes from git for every sampled
repository; the host's records for a sub-sample drawn with known probability; re-run tests for a sub-sample of that.

**Ruled out.** (a): not ruled out by the material; the host limits requests per hour and re-running tests costs
hours per repository, so it is ruled out by cost, which is a count. (b): not ruled out; it leaves most repositories
without content, so a model that reads content cannot learn from them (D 5.3; P6). Kept as the fallback if the summed
size of the clones forces it.

**Choice.** (c). The second sub-sample over-draws repositories that link issues to fixes, with the probability kept.
That habit can be estimated from the clone alone (merge messages and closing words), before any request to the host.

**Why.** M's idea stands: depth is paid per repository, so it is a sub-sample with a known probability, and results
can still be weighted back. What is dear is not git: a clone gives content, structure and history at once. The dear
parts are the host's records and running other people's tests.

**Rests on.** D 3.2; D 5.3; D 2.9; assumption; count first: the summed size of the clones of the pilot; count first:
requests needed per repository for its issues, pull requests and checks

**Refuted if.** The clone sizes of the pilot put full content for the whole sample out of reach of the disk that can
be rented; then (b) is taken, and content is read as present for a tier or absent for it.

### D5. What is taken from the code itself

**Depends on.** D3; P5; P6.

**Alternatives.** (a) History only. (b) Imports and folders by a line pattern (now). (c) A parser per language over
every piece of content, with resolution per tree. (d) A language server per snapshot. (e) Stored text embeddings in
place of content.

**Ruled out.** (a), (b): a model reaches only as far as there are links, and on our own counts these reach a minority
of the right files (N 5.5; record: research-tree/build/improve/units/T1/report.md). (e): a learned projection fixed
before any split; a learned step belongs to the model's pipeline and is fitted on training data only (D 6.4, D 9.2).
(d): not ruled out; it needs each project's dependencies installed per snapshot. Kept for a subset if the count
shows the parser leaves much unresolved.

**Choice.** (c). Per piece of content: what it defines, the names it uses, its imports as written, strings that look
like paths or routes, comments; its size and language. Per tree: imports and uses resolved to files, each failure
kept with its reason. Test links of two kinds, by import and by name, each with its rule. Folders. A name that
matches but cannot be resolved is a kind of link of its own. Every kind of file is kept; how deeply it could be
parsed is recorded. The diff of every change is kept.

**Why.** Each kind of link keeps the rule that made it, because what counts as a link depends on how it is found. A
failure with its reason is a value; a silent gap is not. N reports honestly that on two of our three repositories
structure reaches fewer right files than history does, so structure is the base only where history is short. How
far references and test links reach has never been counted here.

**Rests on.** N 5.5; N 9.10; N 11.1; N 12.5; N 13.1; D 1.1; D 2.1; D 5.3; D 6.4; count first: on the three
repositories we have, the share of right files each kind of link reaches, with and without earlier joint change

**Refuted if.** Over the right files with no earlier joint change, all code links together reach no more than
imports and folders already do.

### D6. Time: when a fact became visible, and the moment of asking

**Depends on.** D3; P4.

**Alternatives.** (a) Commit time in a flattened history (now). (b) Author time. (c) A cut per block (now). (d) Every
fact carries the time it became visible; the loader serves a question only facts visible strictly before its asking
time.

**Ruled out.** (a), (b): a branch commit dated before the question can reach the main line after it; (b) is the
same fault, larger (D 9.4, D 4.4; V3). (c): not a leak; a gap real use does not have (D 7.1).

**Choice.** (d). A commit's content and changes are visible from the time it reached the main line; an issue text
from the time of that version; both commit times are kept, and a rewritten history is flagged where they disagree.
The asking time is defined per question (D8 to D10). The loader asserts, per example, that nothing served is dated
at or after it. Whatever is learned from data (word weights, scalers, any tuning of an encoder) is learned on
training repositories and training times only.

**Why.** The time a fact was recorded and the time it could be known are two facts and belong apart. Putting the cut
in the loader makes it a property of the data path, not of each input's author.

**Rests on.** D 4.4; D 6.1; D 6.2; D 6.4; D 9.1; D 9.4; N 13.9; count first: the share of commits whose commit time
and arrival on the main line differ, on the three repositories we have and on the pilot

**Refuted if.** The planted-fact test of D13 passes a later fact into any input.

### D7. The cuts: by repository and by date

**Depends on.** D2; D6; P4.

**Alternatives.** (a) A split in time inside each repository (now). (b) A split by repository alone, each held-out
repository asked over its whole span (N, L). (c) A split by repository and a cut-off date together (M).

**Ruled out.** (a): no repository is unseen (V4). (b): not ruled out; a model trained on later years of other
repositories answers earlier questions, which is knowledge of the future in the plain sense of D 6.1. N's objection
is that a date cut throws questions away. Kept as a second, marked reading.

**Choice.** (c) for the main reading, with three stretches of time: training facts; then validation questions, on
which every setting is chosen; then, after the cut-off date, test questions. A gap as long as one change usually
lives separates the stretches, so that one piece of work never straddles a boundary. The cut-off date is set no
earlier than the training cut-off of any pretrained part the model uses: no such part can then have read the answers
of the main reading. Test repositories with no question after the cut-off are counted and reported.

**Why.** It is how the model would be used: trained up to a date, then met with a repository it has not seen. The
two readings are both computed, and their difference measures what the later knowledge was worth; so the
disagreement between M and N is settled by a number, not by preference.

**Rests on.** D 6.1; D 6.2; D 7.1; D 7.4; N 8.1; assumption; count first: questions per test repository after
candidate cut-off dates

**Refuted if.** The two readings agree within their intervals in every stratum; the whole-span reading, which has
more questions, then serves as the main one.

### D8. The change question

**Depends on.** D3; D6; P1.

**Alternatives.** (a) One changed file asks for the others of its commit, by path only (now). (b) The same with the
file's own diff as input. (c) The first commit of a pull request asks for the files its later commits touch.

**Ruled out.** (a): the question holds no change; it is a path (D 9.2).

**Choice.** (c) as the first tier and (b) as the second, marked. The unit of work is the merged pull request, else
the commit. Asking time: the first commit, read against the main line before it. "First" is by author time, since
rewriting a branch resets commit times; a rewritten pull request is flagged. Right files: the remaining files of
the unit; an added file is a label of its own kind ("a new file belongs here"), a deleted one likewise. The order
of commits inside a pull request is kept, so the question can be put in one step or step by step.

**Why.** In (c) the moment of asking is real: the first commit existed before the rest. In (b) which file was
touched first is not recorded, so "known at asking time" is a convention; it is kept because repositories that
squash or push single commits give nothing else, and it is read apart. L, M and N reached (c) independently.

**Rests on.** D 9.1; D 6.1; D 8.2; N 13.6; count first: the share of merged pull requests with two or more commits
whose first commit touches fewer files than the whole

**Refuted if.** The first tier is too rare on the pilot to score per repository; the change question then rests on
the second tier and its claim says so.

### D9. The task-words question

**Depends on.** D3; D4; D6; P1.

**Alternatives.** (a) Commit messages (now). (b) Pull-request descriptions. (c) Issue texts as first written, linked
to the change that closed them. (d) Labels by matching texts to later commits by words or dates.

**Ruled out.** (a), (b) as the question: (a) is written after the change, (b) with it (D 6.1; V7). (d): the label
would depend on the same text the model reads (D 6.1).

**Choice.** (c) is the question: title and body of the issue as first written; asking time its creation; right files
those of the change that closed it; the kind of link stored. (b) and (a) are kept as two marked tiers, never pooled
with it. All issues are kept in the raw record, linked or not, so that the linked ones can be described against the
rest.

**Why.** An issue body is often edited after the fix; reading today's text is reading the future, so versions are
stored and only the first is the question. Keeping only linked issues would record routes between chosen ends and
show a picture of issues that is not theirs (D 2.4, applied by extension from routes in a network to the links from
an issue to its fix). For the owner's clinic repository, which has no host, only the
commit-message tier exists: on that repository the question can be scored only in its weakest tier.

**Rests on.** D 6.1; D 9.1; D 4.4; D 2.4; D 3.3; count first: per repository of the pilot, issues closed by a linked
change, and the share whose first text predates the change's first commit; count first: the share of issue bodies
edited later, and whether the host gives the versions

**Refuted if.** First-written issue texts with a linked fix are too few on the pilot to hold out whole repositories;
the question's claim is then cut to the repositories that have them.

### D10. The error question

**Depends on.** D3; D4; D6; P1.

**Alternatives.** (a) Error words in commit messages. (b) Issues whose first text holds a trace or an error message,
linked to their fix. (c) A failing check on a pull request followed by a passing one. (d) A fix's tests run against
the code before the fix, in a container with the network off. (e) Faults planted in a function, tests run. (f)
Labelled sets that already exist publicly.

**Ruled out.** (a): written after the fix (V7). (e) as a test: where the fault sits is chosen by us, and real errors
often surface far from their cause; it is our own recording, not the world (D 1.2).

**Choice.** Tiers, each marked and never pooled. Real, reported: (b). Real, recorded: (c), inside the time the host
keeps logs. Real, re-run: (d). For training only: (e). An extra test with its claim cut to those repositories: (f),
whose repositories enter the clusters of D2 so that none sits on both sides. Right files: the fix's files, tests
marked apart. The files a trace names are an input and a baseline, never hidden. The order of work: count (b) and
(c) first; take (f) before building (d), because such sets come with their environments solved; build (d) only if
the counts show the need.

**Why.** Every one of the five designs names this question as its weakest part, for the same reason: real error
texts tied to a fix exist only where projects report them or keep tests that run. That is a limit of the world. So
the honest form is tiers, each with its own population, and a claim per tier. (d) runs other people's code and must
fetch their dependencies first; it is the dearest and riskiest step and needs the owner's word each time.

**Rests on.** D 9.1; D 6.1; D 1.2; D 7.4; assumption; count first: the share of linked issues with an error text in
their first version; count first: the share of pull requests with a failing then passing check whose logs still
exist; count first: per existing labelled set, its repositories, examples, languages and licence

**Refuted if.** The real tiers together give too few held-out repositories with any error question; the error
question is then reported per example on the few that have them, and not claimed in general.

### D11. How examples are drawn and weighted

**Depends on.** D2; D8; D9; D10.

**Alternatives.** (a) Every example weight one (now). (b) One unit of work weighs one, split over its examples;
scores per repository, then weighted by one over the inclusion probability. (c) Dropping large or bulk changes.

**Ruled out.** (a): drawing by events over-represents what takes part in many, so a change's share grows with its
size and a repository's with its length (D 2.2, D 2.8). (c): a cap that cannot afterwards be told from the world
(D 1.1; V2).

**Choice.** (b). In training every repository carries the same total weight, with a bound on the weight of a single
example so that a tiny repository's few questions do not dominate; the bound is set on validation repositories. The
size of a change is stored as a fact a model can read, not only baked into a weight. Bulk changes are flagged and
read apart. Candidates are all files alive at the asking time; negatives used in training are drawn by a stated
design, with the probabilities kept, and are never a right file of the same question.

**Why.** The inclusion probabilities are known exactly, so the correction is derived, not found: one over the number
of examples a unit gives. The material gives the weight for an average; for training it is silent, which is why the
bound is an assumption with a test. A file that was needed but not changed is counted as wrong: a "negative" may be
a missed answer, and that gap is not random.

**Rests on.** D 2.2; D 2.8; D 2.9; D 3.2; D 3.3; D 1.1; N 13.6; assumption

**Refuted if.** With the weights, validation scores are lower in every stratum than without them.

### D12. Tests of generalisation, baselines and measures

**Depends on.** D2; D7; D11; P7.

**Alternatives.** (a) One pooled score of hits in the top ten over ten (now). (b) Several readings kept apart, each
per repository and per segment, with measures that rank the right files against all others.

**Ruled out.** (a): a pooled figure hides segments and is mostly one repository; its ceiling is about a quarter
(D 7.3; record: research-tree/build/improve/units/T1/report.md).

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

**Why.** The owner's condition is the first reading; a model can pass the second and fail the first, so one figure
cannot stand for both. Cold start is where the owner's small repositories live.

**Rests on.** D 3.2; D 7.1; D 7.2; D 7.3; D 7.4; N 8.1; N 8.4; N 13.6

**Refuted if.** A measuring design is not refuted by a score. It is shown wasteful if two readings always agree; one
of them is then dropped.

### D13. Checks on the data

**Depends on.** D3; D6; D8; D9; D10.

**Alternatives.** (a) Trust the extraction and read its code (now). (b) State what must hold, test it on every
build, and plant faults that the tests must catch.

**Ruled out.** (a): a leak is silent, and a rule nobody wrote down cannot be refuted by any data (D 6.3, D 4.2).

**Choice.** (b). Keys and dependencies, reduced to a smallest set, tested and never called proved. A loss test:
diffs rebuilt from the store. Leak tests: the loader's assertion; inputs built from the store cut at the asking time
must equal inputs built from the whole store; a planted later fact must never arrive; a model given shuffled labels
must fall to chance. A description of every repository (sizes of changes, merges, bulk changes, squashing, issue
use, languages, tests). A table of missing values per column and repository with the cause, compared between
training and test; no row is dropped for a gap. The sample held against its list. Content shared across the split.
The regression check of D1.

**Why.** A dependency can be refuted by data and never proved by it, so the useful act is to state it and keep
trying to refute it. The description is also the first step of the model's design: which patterns the data has.
Writing down how each kind of link and each source of labels was observed is what would let the observing itself be
modelled later, should the counts show that a habit (such as linking issues) skews a question (D 3.4).

**Rests on.** D 4.2; D 4.5; D 4.6; D 4.7; D 4.8; D 5.1; D 5.2; D 5.3; D 6.3; D 1.2; D 3.4

**Refuted if.** A fault is found later that a stated check would have caught but did not; the check is wrong and the
data built since is rebuilt.

### D14. What is handed to a model

**Depends on.** D3; D5; D6; D8; D9; D10; P1; P5.

**Alternatives.** (a) Pairs and yes-or-no facts (now). (b) Only a flat table of features per question and candidate.
(c) The whole repository as one graph or one text. (d) Per question, a typed neighbourhood cut at its asking time.

**Ruled out.** (a): projections; a yes-or-no fact cannot count (V1; N 9.5). (b) as the only form: features chosen
beforehand, and what was summed away is gone (D 9.2). (c): the largest do not fit, and it is blind to time unless
cut per question (D 9.4; N 14.1).

**Choice.** (d). The question as a node (text, diff or error text); the files it starts from, linked to it by kind:
"in the change", "named in the text", "in the trace"; candidate files with their raw content at that time; events
(units of work, commits) as nodes with their size and their time relative to the question; typed, directed links.
Amounts relative to the repository's own scale, with the repository's description beside them. Flags for missing
values. No stored identity of a file or a repository. The flat table of (b) is derived from the same neighbourhood
at loading, for a tree ranker and for the baselines. Where a neighbourhood must be sampled, how it was sampled is
recorded.

**Why.** Events as nodes let a model sum and count; the links from the question to the files it names give a text
question something to be relative to; relative amounts keep a new repository inside the range the model saw. A
neighbourhood per question records one node's surroundings; because the store is whole, how two neighbourhoods
overlap can always be recovered. What a model does with it is the second hypothesis.

**Rests on.** D 2.5; D 2.10; D 7.5; D 8.1; D 9.2; D 9.3; D 9.4; N 2.1; N 2.2; N 7.1; N 9.5; N 9.7; N 9.10; N 10.5; N 12.7;
N 13.1; N 13.7; N 13.9

**Refuted if.** The same model scores no better on the neighbourhood than on the flat table, on validation
repositories; the extra structure then carries nothing the table lacks.

### D15. The repositories we have

**Depends on.** D2; D12.

**Alternatives.** (a) All three as training and test (now). (b) The owner's two as unseen tests, the public one as
an extra test (N). (c) The owner's two as tests on their unopened stretches only; the public one for building the
pipeline and for the regression check.

**Ruled out.** (a): V4. (b): all three were used to choose designs and settings in the earlier work, so none is
unseen in the plain sense of D 6.1 and D 6.2; a repository used to build and debug the pipeline cannot be a clean
test.

**Choice.** (c). The owner's two are never trained on and never leave his PC; the model comes to them. Their clean
reading is on questions from stretches never opened: the old held-out part, and what was committed since. The public
one may be drawn into training like any other; it is never counted in a test figure. Our reading of the standing
rule "held-out truth stays on his PC": it binds his two repositories and the old held-out sets. The truth of public
test repositories is public history; it is kept from training by the split and the loader, and checked by D13.

**Why.** No candidate saw that the owner's two have already been tuned on; the entry pass did. They cannot stand
for private repositories in general either, being two: they are the owner's case, read alone.

**Rests on.** D 6.1; D 6.2; D 3.1; N 8.4; assumption

**Refuted if.** The owner rules that the truth of public test repositories must also stay on his PC; they are then
processed and scored there, which bounds how many can be held out.

## 5. Consistency across the decisions

Each pair of decisions that touch was held together.

- **D2 with D7.** The window that defines the population ends at the cut-off date; test questions come after it. A
  repository active in the window may be silent afterwards. So the test speaks for repositories that stayed active,
  and the share that did not is reported.
- **D4 with D9 and D10.** The text questions exist only where the host's records were fetched. Each records its own
  population, and its scores are weighted by the product of both phases' probabilities.
- **D4 with D5.** Content and structure come from the clone, so they are present for every row of every sampled
  repository. If the fallback of D4 is taken, they are present for a tier or absent for it, never by accident.
- **D6 with D8 to D10.** Every asking time is read against the main line as it stood then, so a question never sees a
  commit that had not arrived.
- **D7 with the model hypothesis.** The cut-off date bounds which pretrained parts may be used, and the owner's two
  are scored on his PC, so the model or a smaller form of it must run there. Both are handed forward as constraints.
- **D11 with D3.** Keeping every change, the very large ones included, would let bulk changes flood the examples. It
  does not: a unit weighs one whatever its size, and bulk changes are read apart.
- **D12 with D15.** The old score (hits in the top ten over ten) is computed only for the regression check.
- **D10 with the standing rules.** Re-running tests means fetching other projects' dependencies and running their
  code; each such step is a download and a run that needs the owner's word, in a container, network off while it
  runs.
- **One tension that stays.** D3 keeps full clones and D5 parses every piece of content. Whether that fits the disk
  and the time for the whole sample is not known; it is the count of D4, with its fallback.

## 6. What stays open, and what settles each

Where the designs disagreed and argument did not settle it, the disagreement is kept with the count or test that
does.

| Open | Settled by |
|---|---|
| Thousands of repositories with history only (M), or content for every sampled one (L, N) | the pilot: spread between repositories against inside one; summed clone sizes |
| A cut-off date (M), or the whole span of held-out repositories (N, L) | both readings computed; their difference |
| Equal weight per repository, or a bounded one | validation repositories, per stratum |
| Planted faults as training data for the error question | a model with them against one without, on real error texts; part of the comparison on the cards |
| The parser's own resolution, or a language server | the share of uses the parser leaves unresolved |
| The event archive as the list, or the host's search | both on one slice of the pilot |

## 7. Counts to make first, and what needs the owner's word

In this order. The first three need no download.

1. On the three repositories we have: how many right files each kind of link reaches, with and without earlier joint
   change. (D5)
2. On the same: the share of changed files outside the seven endings; of right files that are new files; of commits
   outside 2 to 50 files; of commits whose commit time and arrival on the main line differ. (D3, D6, D8)
3. On the same: the number of distinct pieces of content and their size (what parsing and reading content cost); the
   share of uses a parser leaves unresolved. Whether the owner's hosted repository has issues and pull requests on
   its host. (D4, D5, D9)
4. The list: its size, and the spread of activity, size, people and language. (D2)
5. A pilot of about 30 drawn repositories: spread of baseline scores between and inside repositories; clone sizes.
   (D2, D4)
6. On the pilot: issues closed by a linked change and first written before it; error texts among them; failing then
   passing checks whose logs still exist; pull requests of several commits. (D8, D9, D10)
7. Per existing labelled set: repositories, examples, languages, licence. (D10)

His word is needed, each named with source and size at that moment, for: the pass over the public event archive;
the host's descriptions and records (through its public interface, limited per hour; an access token of his own);
the clones (on a rented machine: the PC has 32 GB free); a parser library with its grammars (a small install); any
existing labelled set; and, later and separately, running other projects' tests. One ruling is his alone: whether
the list is limited by licence (D2). Nothing here trains a model. The
rented cards are not used by the data side except, with his yes, as the machine that holds the public collection.

## 8. What would show the whole hypothesis wrong

- The regression check fails (D1): the new pipeline does not reproduce the old examples under the old filters.
- The pilot puts the owner's two repositories outside the range of the public sample on what matters (sizes of
  changes, reach of each kind of link, length of history). Transfer is proved only inside one family (N 8.4); the
  population would be redefined before anything is trained.
- The counts show real questions for task words and for errors in too few repositories to hold any out. Those two
  questions would then be claimed only for the repositories that have them, and the goal as stated is reached for
  the change question alone.
- A stated key fails for a reason that is not a fault of the extraction (D13).

## 9. Coverage of the data entries

Every entry of `MECHANISMS-DATA.md`, with the decision that uses it. None is set aside.

| Entry | Used in | Entry | Used in | Entry | Used in |
|---|---|---|---|---|---|
| D 1.1 | D1, D2, D3, D5, D11 | D 4.1 | D3 | D 6.3 | D13 |
| D 1.2 | D2, D3, D10, D13 | D 4.2 | D13 | D 6.4 | D5, D6 |
| D 2.1 | D5 (file endings) | D 4.3 | D3 | D 7.1 | D6, D7, D12 |
| D 2.2 | D11 | D 4.4 | D3, D6, D9 | D 7.2 | D12 |
| D 2.3 | D2 | D 4.5 | D13 | D 7.3 | D12 |
| D 2.4 | D9 (linked issues) | D 4.6 | D13 | D 7.4 | D7, D10, D12 |
| D 2.5 | D14 | D 4.7 | D3, D13 | D 7.5 | D14 (the flat table) |
| D 2.6 | D2 | D 4.8 | D3, D13 | D 8.1 | D14 (relative amounts) |
| D 2.7 | D2 | D 4.9 | D3 | D 8.2 | D8 (order of commits) |
| D 2.8 | D2, D11 | D 5.1 | D13 | D 9.1 | D6, D8, D9, D10 |
| D 2.9 | D1, D2, D4, D11 | D 5.2 | D13 | D 9.2 | D1, D3, D5, D8, D14 |
| D 2.10 | D14 | D 5.3 | D4, D5, D13 | D 9.3 | D3, D14 |
| D 3.1 | D1, D2, D15 | D 6.1 | D6, D7, D8, D9, D10, D15 | D 9.4 | D6, D14 |
| D 3.2 | D1, D2, D4, D11, D12 | D 6.2 | D6, D7, D15 | | |
| D 3.3 | D9, D11 | | | | |
| D 3.4 | D13 (how each kind is observed is recorded, so the observation can be modelled later) | | | | |

The model-file entries that bear on data (N 2.1, N 2.2, N 5.5, N 7.1, N 8.1, N 8.4, N 9.5, N 9.7, N 9.10, N 10.5,
N 11.1, N 12.5, N 12.7, N 13.1, N 13.6, N 13.7, N 13.9, N 14.1) are used in the decisions above; the rest belong to
the model hypothesis, whose own pass covers the whole model file.
