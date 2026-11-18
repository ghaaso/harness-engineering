# w1 collect: merge (structure-aware merge, semantic-conflict detection, several AI agents in one repository)

Date: 2026-11-19. Collector: sonnet, topic `merge`. `R:` = `docs/program/evidence/round3-2026-11-18/`. Paper texts are under
`R:papers/w1/<short-name>/paper.txt` (made with `pdftotext -layout`; two-column pages interleave, so a quoted
sentence can be split across a line; the line given is where it starts). `E:` = `docs/program/evidence/harness-method-status-2026-11-18/`.

Counts: read in full (`quoted`) 10 papers; reused from library as `quoted` (not fetched again) 4 papers
(Apel 2011, Apel 2012, Cavalcanti 2017, Cavalcanti 2019); `summary` 0; `not opened` 1 (IntelliMerge 2019).

Library records reused: x04-0216, x04-0217, x04-0375 to x04-0381, x04-0384 to x04-0386, x04-0388, x04-0389,
x04-0391, x04-0392, x04-0393, x04-0602, x04-0603 (read at `E:concurrency-lit-3-coordination-free.md` lines 184 to 200,
which quote the papers); r57-0302 and x04-0214 (Khanna and others, diff3); r57-0305, x06-0356, x06-0360 (human merges:
build and test failures after a clean merge); r57-0308 (upgraded below: its source papers are now read in full);
x07-0207 (no study with speed-up against number of agents including merge cost); x07-0330, x15-0340 (CodeCRDT, upgraded
below); r57-0013 (owner's ruling: same problem as shared memory); r57-0110 (read the paper itself).
Library look-up for Spork, IntelliMerge, RefMerge, SafeMerge: "not recorded".

## Part A. Merging by structure

### A1. Apel, Liebig, Brandl, Lengauer, Kastner. Semistructured Merge. ESEC/FSE 2011
Status: `quoted` through the library (x04-0375, x04-0376, x04-0377, x04-0378), not fetched again. Source of the quotes:
`E:concurrency-lit-3-coordination-free.md:184-186` (that file read the paper in full and quotes its PDF pages).
- **Problem.** Line merge reports conflicts that a structure-aware tool would not (member reorder).
- **Mechanism.** Parse classes to method level, match nodes by name and kind (superimposition), merge method bodies as text.
- **Measured gain.** "can reduce the number of conflicts in 60 % of the sample merge scenarios by 34±21 % (the number of
  conflicting lines of code is reduced in 82 % of the sample merge scenarios by 61±22 %; the number of conflicting files is
  reduced in 72 % ... by 28±12 %)" (`E:...:184`, paper p7). Baseline: unstructured (line) merge. Workload: 180 sample merge
  scenarios (Java). Contention: real merge scenarios, no contention level controlled. Also worse: "in 26 percent (46 of 180) of
  scenarios, semistructured merge increases the number of conflicts by 109±170 %" (`E:...:185`). Combined with line merge: a
  further 35 % fewer conflicts than pure line merge (`E:...:186`).
- **Assumes.** Code parses; matching by name (a rename breaks it: "superimposition relies on nominal equality", `E:...:185`);
  a parser per language.
- **For model-session writers.** `reasoned`: parses is true almost always at commit time, but a session's half-done edit may not
  parse; a model often renames or moves code while editing, which is the case this tool is worst at.
- **Frame.** Means (4). Also bears on the failure the frame calls write skew: the paper reports more conflicts in a quarter of
  scenarios, so structure is not a monotone gain.

### A2. Apel, Lessenich, Lengauer. Structured merge with auto-tuning (JDime). ASE 2012
Status: `quoted` through the library (x04-0388, x04-0389, x04-0391, x04-0392, x04-0393). Source: `E:concurrency-lit-3-coordination-free.md:197-200`.
- **Problem.** Full tree merge is too slow; line merge produces spurious conflicts.
- **Mechanism.** Try line merge first; switch to tree merge only where a conflict appears.
- **Measured gain.** "structured merge with auto-tuning is up to 12 times faster than purely structured merge, 5 times on
  average" (`E:...:197`); 8 Java projects, 72 merge scenarios, "over 17 million lines of code". "structured merge reports 39 % of
  the number of conflicts and 24 % of the number of conflicting lines of unstructured merge" (`E:...:198`), mostly ordering
  conflicts. "Unstructured merge is up to 71 times faster than structured merge, 15 times on average" (`E:...:199`). "21 % of the
  changed files cannot be merged with unstructured merge ... With structured merge, this fraction can be decreased to 15 %"
  (`E:...:200`). Library correction x04-0602: an earlier note said 92 times and 10 times; that is wrong for this paper.
- **Assumes.** Same as A1, plus patience: tree matching has at least cubic time in the worst case (x04-0394).
- **For model-session writers.** `reasoned`: merge time of seconds is small beside a unit of minutes and a 596 s test run, so the
  speed cost does not matter; the false negatives (A3) do.
- **Frame.** Means (4).

### A3. Cavalcanti, Borba, Accioly (OOPSLA 2017) and Cavalcanti, Borba, Seibt, Apel (2019): what structure misses
Status: `quoted` through the library (x04-0379 to x04-0381, x04-0384 to x04-0386). Source: `E:concurrency-lit-3-coordination-free.md:187-188`.
- **Measured.** 2017: 34,030 scenarios from 50 Java projects, 19,238 conflicts with line merge and 14,544 with semistructured merge,
  "a semistructured merge reduction of approximately 24%" (`E:...:188`). "we find no evidence that semistructured merge leads to fewer
  false negatives" (`E:...:188`; false negative = clean merge that is wrong); additional false negatives are 20.60 ± 21.30 % for
  semistructured against 9.62 ± 16.29 % for line merge, an upper bound the file calls overestimated. 2019: 43,509 scenarios,
  508 projects; semistructured and structured differ in 24 % of scenarios with conflicts but only 0.58 % (253) of all scenarios;
  false negatives 39 (structured) against 5 (semistructured), false positives 4 against 36 (`E:...:187`).
- **Frame.** The structure-aware means cuts the conflicts a tool reports (about 24 % in the large study, not 60 %), and the
  quotes show it does not cut the wrong clean merges. So means (4) leaves the failure the frame calls write skew in place.

### A4. Larsen, Falleri, Baudry, Monperrus. Spork: structured merge for Java with formatting preservation. IEEE TSE 2022
Fetched `https://arxiv.org/pdf/2202.05329` (542 KB). Status `quoted` (read the text, `R:papers/w1/spork/paper.txt`).
- **Problem.** Structured merge changes formatting and can take very long.
- **Mechanism.** The 3DM tree-merge algorithm for ordered trees plus Java rules (duplicate statements allowed, member order
  insignificant); keeps original text when printing.
- **Measured gain.** Baselines are JDime and AutoMergePTM (two structured tools), not git: "replaying 1740 real-world file merges
  collected from 119 open-source projects" (`spork/paper.txt:19`). Conflicts: "performs better than JDIME and on par with
  AUTOMERGEPTM" (`:1297`). Time: median 1.17 s against JDime 1.32 s and AutoMergePTM 1.48 s (`:1116-1118`); Spork maximum 11.9 s
  (`:1132`); timeout 300 s per file merge (`:808`); JDime had 16 timeouts, AutoMergePTM 7, Spork none (`:1111`). No figure
  against line merge is given in this paper (`not measured`).
- **Assumes.** Java; revisions build (the dataset keeps merges whose revisions build, around `:740-745`).
- **Limit that bears on lost updates.** "SPORK ignores so-called delete/edit conflicts ... such a deletion silently overrides any
  edits in the subtree" (`:1278-1281`, inherited from 3DM): one side deletes a subtree, the other edits it, and the merge keeps
  the delete without a conflict, which is a lost update by a tool's design.
- **For model-session writers.** `reasoned`: speed holds (seconds); the silent delete-over-edit matters because a session that
  tidies a file by deleting a function while another session edits it is the case the tool does not flag.
- **Frame.** Means (4). Names a failure the frame lacks: delete-versus-edit, which is lost update without any two writes to the
  same text.

### A5. Shen, Zhang, Zhao, Liang. IntelliMerge: a refactoring-aware software merging technique. OOPSLA 2019
Status: `not opened` (ACM page only; no open copy found by the search; the arXiv copy found is the 2021 comparison paper, A6).
Search snippet only: 1,070 scenarios, 10 Java projects, "58.90 %" fewer conflicts than GitMerge (`summary`, not used). Its behaviour
is read in A6 from a paper that re-ran it.

### A6. Ellis, Nadi, Dig. Operation-based refactoring-aware merging: an empirical evaluation (RefMerge versus IntelliMerge and Git). arXiv 2112.10370v2 (2022)
Fetched `https://arxiv.org/pdf/2112.10370v2` (1.6 MB). Status `quoted`.
- **Problem.** Line merge conflicts when one writer renames or moves code and another edits it.
- **Mechanism.** RefMerge: undo each refactoring on both sides, merge with git, replay the refactoring. IntelliMerge: merge program-element graphs.
- **Measured gain.** Workload: 2,001 merge scenarios, 20 projects, all chosen because git reported a refactoring-related conflict
  (`refmerge/paper.txt:14`). "RefMerge resolves or reduces conflicts in 497 (25%) merge scenarios while increasing conflicting LOC
  in only 214 (11%) scenarios"; "IntelliMerge resolves or reduces conflicts in 478 (24%) ... but increases conflicting LOC in
  597 (30%)" (`:15-17`). Time: 15 min timeout (`:534`); RefMerge timed out on 382 scenarios, IntelliMerge on 870 (`:598-600`).
  Hand-checked sample of 50 scenarios: Git 243 false positives and 5 false negatives, IntelliMerge 707 and 71, RefMerge 188 and
  0 (`:895-899`).
- **Assumes.** Refactorings are detectable by a refactoring detector (99.7 % precision as quoted, `:226`); Java.
- **For model-session writers.** `reasoned`: renames are common in agent edits, so the problem is real; but the gain is on a
  pre-filtered set of conflicts and a quarter of them, and large merges (median 1,000 to 1,236 changed files where tools timed out, `:608-612`) time
  out, which a model session's change (a few files) would not hit.
- **Frame.** Means (4). Shows the frame's "merge by structure" is several tools with different false negative rates, and
  that no tool reports both few false positives and no false negatives.

### A7. Khanna, Kunal, Pierce. A formal investigation of diff3. FSTTCS 2007
Status: `quoted` through the library (r57-0302, x04-0372 to x04-0374), not fetched again. Held result: diff3 is clean only when the
edited regions satisfy stated conditions; with several edited regions the guarantee fails, and diff3 is not idempotent and not
stable. **Frame.** The line merge that git runs has no guarantee beyond two replicas with separated edits.

## Part B. Catching the wrong clean merge (semantic conflicts)

### B1. Sousa, Dillig, Lahiri. Verified three-way program merge (SafeMerge). OOPSLA 2018
Fetched `https://www.microsoft.com/en-us/research/wp-content/uploads/2018/11/verified-merge-oopsla-18.pdf` (the UT Austin copy was damaged, a second copy was taken). Status `quoted`.
- **Problem.** A textually clean merge can contain a bug no tool reports.
- **Mechanism.** Define semantic conflict-freedom (merged program does not give a behaviour that disagrees with both variants where they agree with base); prove it with a 4-way AST difference and relational verification (Z3).
- **Measured gain.** 52 real merge scenarios from GitHub, filtered to remove trivially conflict-free ones (`safemerge/paper.txt:1015`).
  SafeMerge verified 39, warned on 13; of the 13, eleven were real semantic conflicts, two false positives, "false positive rate
  around 15%" and "an average of 0.5 second to verify each benchmark" (`:1059-1098`). Against kdiff3: 33 benchmarks clean
  and verified, and "five benchmarks for which kdiff3 generates a textual merge that is semantically incorrect", of which 3 are
  true (two are the false positives) (`:1156-1160`). "SafeMerge can automatically verify 75% of the merge scenarios that occur in the wild" (`:1172`).
- **Assumes.** Java subset; the merge is on one method body at a time; a loop-invariant inference that works; the notion of
  "conflict-free" as a sufficient, not necessary, condition (`safemerge/paper.txt:463`).
- **For model-session writers.** `reasoned`: formal verification is out of reach for a whole repository in a language mix; but
  the definition is useful, and 0.5 s per merge is cheap. What a harness can use is the definition, not the tool.
- **Frame.** The frame's write skew ("a clean merge that fails"): the paper measures it as 5 of 52 textual merges (3 after
  removing its own false positives), on a pre-filtered set. Not a rate for all merges.

### B2. Da Silva, Borba, Maciel, Mahmood, Berger and others. Detecting semantic conflicts with unit tests (SAM). arXiv 2310.02395 (2023; journal extension of the ICSME 2020 paper)
Fetched `https://arxiv.org/pdf/2310.02395` (908 KB). Status `quoted`. The ICSME 2020 paper itself was not opened (this one is its extension and cites it).
- **Problem.** Find a semantic conflict by running generated tests on merge, left, right and base builds.
- **Mechanism.** Generate unit tests (EvoSuite, Randoop and variants) for the changed class elements, run them on four builds, report a conflict when behaviour on the merge differs from both parents under interference heuristics.
- **Measured gain.** Not a gain over a baseline; a detection rate. "nine detected conflicts out of 28" in the best configuration
  (Differential EvoSuite plus EvoSuite plus testability transformations) (`sam/paper.txt:43`, `:1971`); 51 merge scenarios, 80 or more pairs
  of changes (`:32`); 5 minutes of test generation per tool (`:864`). "Despite the low rate of true positives, the generated tests lead
  to only a few cases of false positives" and "developers cannot rely solely on such semantic merge tools" (`:175-180`).
- **Assumes.** Buildable Java with generatable tests for the touched class elements; a ground-truth set that is hand made.
- **For model-session writers.** `reasoned`: a session already writes and runs tests; but this says that generated tests found about a
  third of known interferences, so the project's own suite stays the last judge and is not replaced.
- **Frame.** Failure "write skew": a measured detection rate of 32 % for tests generated per change.

## Part C. Several AI agents in one repository (r57-0308 upgraded: read in full)

### C1. Xu, Subramanian, Karthik. AI agent pull requests on GitHub: frequency, structure and merge conflict rates. arXiv 2607.04697v2 (July 2026)
Fetched `https://arxiv.org/pdf/2607.04697`. Status `quoted`. Preprint, not peer reviewed (`reasoned`).
- **Problem.** How often do PRs by AI agents to one repo overlap in time, and how often do such pairs conflict.
- **Mechanism.** Dataset AIDev-pop (33,596 PRs, 2,807 repos); time-overlap ("co-active") pairs; replay 747 pairs (one pair per repo, two strata) with `git merge-tree` three-way merge on the PR heads and merge base.
- **Measured.** Textual conflict "19.8% (119/601, 95% CI [16.8%, 23.2%])" for same-agent pairs and "41.7% (48/115, 95% CI [33.1%, 50.9%])" for
  cross-agent pairs (`agentpr/paper.txt:190-194`). Cross-agent pairs are only "2,896 of 580,913 co-active pairs ... 0.50%", in 122 of 2,807 repos
  (`:161-163`); 84.4 % of conflicted files are source code; about 42 % of conflicts are modify/delete or add/add (`:24-27`, `:336-338`).
  Baseline for "gain": none (a rate). Contention: pairs with 0 to 7 day overlap window; merge-base is the shared ancestor, so the pair may differ in age by days.
- **Not measured.** "no tracking is done for deeper build or semantic conflicts" so rates are "a conservative lower bound" (`:326-331`).
  No speed, no tokens.
- **Assumes.** Co-activity as a proxy for concurrent work; PRs were each made against a repo with human work going on too.
- **For model-session writers.** `reasoned`: these are PRs of hours to days written against a moving main, not sessions of minutes in a
  shared checkout; the rate is a rate for two PRs, not for 3 to 16 writers. For 16 writers the number of pairs is 120.
- **Frame.** Gives the textual-conflict rate between two agents' units: 20 to 42 %. Library said "19.8 to 41.7 %": confirmed from the text.
  The frame's "phantom" (add/add, a new item in the same place) is measured here as the structural share, about 42 % of conflicts.

### C2. Ogenrwot, Businge. AgenticFlict: a large-scale dataset of merge conflicts in AI coding agent pull requests. arXiv 2604.03551v2 (AIware 2026)
Fetched `https://arxiv.org/pdf/2604.03551` (3.7 MB). Status `quoted`.
- **Problem.** Merge-conflict rate of agent PRs against their target branch.
- **Mechanism.** For each PR, `git merge --no-commit --no-ff <head>` on the base (for closed unmerged PRs the base at closing time is rebuilt) (`agenticflict/paper.txt:138-153`).
- **Measured.** 142,652 PRs from 59,412 repos, 107,026 simulated, 29,609 conflicting, "conflict rate of 27.67%", 336,380 conflict regions
  (`:66-70`). By agent (text, `:306`): lowest 15.43 % (Copilot), Cursor 20.06 %; the table at `:338-345` gives 15.24, 19.75, 22.85, 25.93, 31.85
  (the text and the table differ in the second decimal; both are read here). By size: PRs with a median churn of 2 lines have about 9.9 %, of 25 lines nearly 30 %, and 32-33 %
  for 46 to 185 lines (`:315-325`).
- **Assumes / limits.** Conflict is against the base branch, which includes human work, not agent against agent. Textual only.
- **For model-session writers.** `reasoned`: the size effect (9.9 % at 2 lines, about 30 % at 25 lines) is the only measured link between
  size of a unit and conflict chance here; it argues for small units but is a PR-level, confounded figure.
- **Frame.** Rates of 15 to 32 % by agent; the library number 27.67 % is not a pair rate but a PR-against-base rate (the record
  r57-0308 mixes them in one sentence).

### C3. Pugachev. CodeCRDT: observation-driven coordination for multi-agent LLM code generation. arXiv 2510.18893v1 (Oct 2025)
Fetched `https://arxiv.org/pdf/2510.18893` (1.0 MB). Status `quoted`. One author, preprint.
- **Problem.** Parallel LLM agents rarely get speed-up because of coordination cost.
- **Mechanism.** All agents edit one shared document as a CRDT (Yjs); each agent works on TODO markers, watches the shared state and skips done work; an evaluator agent fixes errors after.
- **Measured.** 600 trials: 6 TypeScript/React tasks, 50 runs per mode, Claude Sonnet 4.5, "up to 5 parallel agents" (`codecrdt/paper.txt:269-270`).
  Overall "Parallel 13.1% slower overall ... ranging from -21.1% speedup (Tic-Tac-Toe) to +39.4% slowdown (Algorithm Visualizer)" (`:280-282`);
  Tic-Tac-Toe 45.47 s sequential against 35.89 s (`:354`). Code volume 82 to 189 % larger in parallel for complex tasks (`:14-15`, `:46`, `:290`). "preliminary
  inspection suggests 5-10% semantic conflicts" from "Manual inspection of 60/600 runs", with "20% for simple tasks, 80% for complex tasks" (`:258-260`).
  Quality by LLM judge: -7.7 % (`:20-22`, abstract). 13.8 % of timing points removed as outliers (`:277`).
- **Not measured.** Table 6 "speculative projections beyond N=5" (`:409`): speed-up peak at N=3 (2.05x) is a projection; the paper's own limit.
  Its claim "git-style branching defers 15-30% conflicts" (`:33`) has no source in the text.
- **Assumes.** Edits go to a shared document with character-level merge; agents "back off when editing regions overlap" (`:231`).
- **For model-session writers.** `reasoned`: this is the nearest to our case (Claude, shared state), and it says the abstract's 21.1 %
  speed-up is the best task and the average is 13.1 % slower, with 5 to 80 % wrong-in-combination results. A real CRDT of a file is not
  something the Edit tool gives (b1 records say nothing about it): `reasoned`, not tested.
- **Frame.** Means (3) (commuting writes: here they commute at character level and the semantics fail: duplicate declarations, type
  mismatches). The frame's failure list lacks this: writes that merge cleanly and are wrong, caught only by a checker.

### C4. Yang, Nie and others. When parallelism pays off: cohesion-aware task partitioning for multi-agent coding (Co-Coder). arXiv 2606.00953v1 (May 2026)
Fetched `https://arxiv.org/pdf/2606.00953` (637 KB). Status `quoted`. Preprint.
- **Problem.** Parallel coding agents on one repository cost more and break interfaces when work is cut across dependencies.
- **Mechanism.** Static-analysis dependency graph; isolate hub files; community detection to partition; a dependency-aware scheduler releases a file for generation once upstream files are done.
- **Measured.** Greenfield generation from a specification, not edits to an existing repository (the "repository interface blueprint", `cocoder/paper.txt:458`):
  DevEval 10 Python projects (3.1 files, 243 lines on average) and CodeProjectEval 18 projects (11.9 files, 2,371 lines) (`:402-408`); base model gpt-5-mini (`:468`).
  DevEval: pass rate 56.8 % to 68.1 %, 1.81x speed-up, 28 % lower cost (`:104-105`). CodeProjectEval: pass rate 34.1 % against 20.1 % sequential (points, not percent), latency
  1315 s against 2756 s, cost $0.67 against $1.03 (`:490-493`). Baselines: file-per-agent parallel, which on DevEval was no better (57.7 %) and 44 % dearer; and
  Claude Code with Agent Teams, "the lowest latency (680 s) and cost ($0.38)" on CodeProjectEval but pass rate 16.3 %, "below even the sequential baseline" (`:546-549`, `:575-578`).
  Edge density correlates with gain (Pearson 0.65, 16 projects, `:567-569`).
- **Assumes.** A dependency graph known before work starts (static analysis); unit-sized files.
- **For model-session writers.** `reasoned`: a dependency-aware plan before the writers start is the "order first" means (2) in a
  form that already ran with LLMs; the wall-clock figure holds for generation, not for edits whose time is spent on reading and a long test.
- **Frame.** Means (2) and (1) (claim units by cohesion, not by file). Contradicts the idea that more writers help: file-per-agent
  parallelism was worse than one agent.

### C5. Liu, Chen, Xu, Jiang, Dong. Multi-agent collaboration with state management (STORM). arXiv 2605.20563v1 (May 2026)
Fetched `https://arxiv.org/pdf/2605.20563` (read in full). Status `quoted`. Preprint, authors' own benchmark runs.
- **Problem.** Agents in git worktrees defer all conflicts to a late, costly merge.
- **Mechanism.** The database remedy applied directly: all agents share one workspace; each file has a version counter; a write must
  declare the version read, and the write is rejected if the target file or any file the agent read has a newer version ("optimistic
  concurrency control (Kung and Robinson, 1981)", `storm/paper.txt:146-178`); on rejection the agent gets the current file and a diff and
  retries; a short reservation prevents ping-pong (`:185`); intent comments mark semantic regions (`:190`).
- **Measured.** Baselines: single agent, "GitWorktree" (isolated worktrees merged after), and a soft-isolation (prompt only).
  Sonnet 4.6, Commit0-Lite, 4 engineers: STORM macro pass rate 82.5 % against 63.8 % GitWorktree (+18.7 points, `:23`, `:76-77`),
  weighted 46.2 against 24.6 (`:392-406`); time-efficiency 16.8 against 20.9; cost-efficiency 6.3 against 8.6 (`:392-393`). PaperBench Code-Dev, 2 engineers: 74.1 against 72.7 (`:78-79`).
  Scaling engineers 2, 4, 8: overall pass 38.2 to 69.7 %; cost "$199, $292, $429" while wall-clock "roughly constant (13 hours total)" (`:366-381`).
  Contention: manager assigns disjoint file sets; "21.7 % of first-round tasks overlap another's file scope" at 4 engineers and 35.1 % at 8; first-round overlap
  correlates with the rate of rejected reviews (r = 0.78 within k=8): "additional engineers create contention faster than useful parallel work" (`:488-495`).
- **Assumes.** Edits go through its file_editor; known file sets; retry is cheap. Its own limits (`:1125-1137`): bash writes bypass
  it; "File-level granularity. Two agents editing different functions in the same file trigger a false-positive rejection"; heavily
  shared files become a serial point.
- **For model-session writers.** `reasoned`: the one paper that tests the engine remedy (version-checked write plus read-set validation) with Claude
  sessions; a retry costs one re-plan with a diff, not a rerun; 4 to 8 writers; wall-clock gain is not shown (time-efficiency is minutes per score point, with the
  manager included). Whether the Edit tool or a hook of ours can do a version check is for the b1 records, not for this file.
- **Frame.** Directly tests the frame row "write skew: track what each change read, validate when it lands": it works at file grain. Also shows
  a missing means: "a manager that cuts the work into disjoint file sets" is the contention control, and its failure shows in the numbers.

### C6. Geng, Neubig. Effective strategies for asynchronous software engineering agents (CAID). arXiv 2603.21489v1 (March 2026)
Fetched `https://arxiv.org/pdf/2603.21489` (second try; the first copy was damaged). Status `quoted`. Preprint.
- **Problem.** Long tasks with dependent subtasks; concurrent edits interfere.
- **Mechanism.** A manager builds a dependency graph, up to N engineers work in isolated git worktrees, each runs its tests and commits; the manager merges; the engineer who produced a conflicting commit resolves it (`caid/paper.txt:158-192`).
- **Measured.** Claude Sonnet 4.5 and two other models, Commit0-Lite 4 engineers, PaperBench Code-Dev 2 engineers. Abstract "26.7% absolute on
  paper reproduction tasks (PaperBench) and 14.3% on Python library development tasks" (`:27`); the figure shows +26.6 and +14.7 (`:356`) (the abstract and the figure differ,
  both stand). Table 2 (`:312-326`): Commit0-Lite Claude 4.5 single agent 53.1 % in 692.6 s for $1.9, CAID 59.1 % in 1583.2 s for $8.1
  (so wall-clock 2.3 times longer and cost 4.3 times); PaperBench Claude 4.5 57.2 % in 1803.5 s for $3.3 against 63.3 % in 2080.4 s for $9.3.
  Worktree against shared workspace: Commit0-Lite 59.1 against 56.1; PaperBench 63.3 against 55.5, below the single agent 57.2 (`:420-430`).
  Engineers: "performance improves when increasing engineers from 2 to 4 ... but decreases when expanding to 8 engineers" (`:450`).
- **Assumes.** A dependency graph and a test suite per subtask; merges resolved by an engineer, with a test gate.
- **For model-session writers.** `reasoned`: the closest to our current setup (worktrees, merge, test gate); its numbers say a gain in score,
  a loss in time and in tokens, in this benchmark (greenfield functions to fill in), not a wall-clock gain.
- **Frame.** Means (1) with isolation. Contradicts C5 on whether worktrees beat a shared workspace: CAID finds worktrees better
  (both datasets), STORM finds them no better than prompt-only isolation. Different harnesses, models and writer counts: the two cannot be
  put on one scale (`reasoned`).

## What the papers say about the frame (for the analyst, `reasoned` unless marked)

1. Means (4), merge by structure: gains are about 24 % fewer reported conflicts in the largest studies (A3, `quoted`), up to 61 % fewer in smaller ones (A2),
   and none on missed conflicts. Tools silently drop delete-versus-edit (A4). The frame's means (4) is sound as a reduction of spurious conflicts, not
   as a check for correctness.
2. A failure the frame lacks: delete versus edit, and the rename that makes two sides touch the same thing under different names (A1, A4, A6). Both
   look like lost update or phantom but are not caught by "a write applies only on the version it read" if the rename is in another file.
3. Write skew as a measured quantity: 5 of 52 clean textual merges wrong in the best-controlled test (B1); detection by generated tests about a third (B2);
   human projects 1 % build and 6 % test failures of all merges (r57-0305, x06-0356).
4. The only test of the database remedy on LLM sessions is STORM (C5): +18.7 pass points over worktrees, with its own limits: file grain, bash bypass, and
   a manager that has to keep scopes disjoint.
5. Library x07-0207 (no study measures speed-up against agent count with merge cost included) still holds after reading: CodeCRDT, Co-Coder, STORM and CAID give task-level figures; the only
   run with 2, 4, 8 engineers is STORM Figure 2 and CAID Figure 3 (both with a manager).
6. Time and tokens are reported in only three of the six agent papers (CAID, Co-Coder, STORM) and they disagree in sign with the score
   gains: CAID slower and 2 to 4 times dearer for a few points; Co-Coder faster and cheaper (different base model, greenfield).

## Not found

- A study of AI agents in one repository that measures speed-up against number of writers with the merge and the test run counted (searched the six papers read; x07-0207 says the same).
- Open copies for IntelliMerge 2019 (OOPSLA) and the ICSME 2020 semantic-conflict paper by da Silva and others (search words: "IntelliMerge refactoring-aware software merging technique pdf", "detecting semantic conflicts via automated behavior change detection generated tests"; found only publisher pages, a thesis page and the later arXiv paper).
- Refactoring-aware merge with LLM sessions: no paper found by these searches. The search was by topic words only.
- Any measured rate of semantic conflicts between two *model sessions* in one repository other than CodeCRDT's 60-run manual inspection (C3).

## Not opened

- IntelliMerge (Shen and others 2019): paywalled publisher page, no open copy seen; behaviour taken from A6, which re-ran it.
- Cavalcanti 2017 and 2019 originals, Apel 2011 and 2012 originals: not fetched again; their quotes come from library records marked `quoted` (r57-0130: no re-collecting).
- Skipped as changing no answer: further Spork-like variants (AutoMergePTM, FSTMerge variants), Mimram and Di Giusto (patch theory), Darcs (x04-0397, x04-0398 are `summary`).

## Second attempt (2026-11-19)

### IntelliMerge (Shen, Zhang, Zhao, Liang, Jing, Wang, Xiong. OOPSLA 2019, PACMPL 3, DOI 10.1145/3360596)
Result: `still closed` for the full text (publisher copy behind a bot check); the abstract is read. No `%PDF-` copy opened.

URLs tried and what each returned:
- `https://dl.acm.org/doi/pdf/10.1145/3360596`: HTTP 403, an HTML bot-check page (5.5 KB), not a PDF. Unpaywall and Semantic Scholar both name this as the only open copy (GOLD, CC BY-NC). Not worked round: it needs the owner's sign-in or a browser pass.
- `https://dl.acm.org/doi/epdf/10.1145/3360596`, `https://dl.acm.org/doi/10.1145/3360596`, `https://doi.org/10.1145/3360596`: HTTP 403 (same). WebFetch on the PDF URL: 403.
- `https://api.unpaywall.org/v2/10.1145/3360596`: 200; one location only (the ACM URL above); `has_repository_copy: false`.
- `https://api.semanticscholar.org/graph/v1/paper/DOI:10.1145/3360596?fields=openAccessPdf`: the same ACM URL only.
- `https://api.crossref.org/works/10.1145/3360596`: 200; metadata and abstract saved at `R:papers/w1/intellimerge/crossref.json` and `abstract.txt`.
- `https://2019.splashcon.org/details/splash-2019-oopsla/53/...`: 200, conference page, no PDF link seen.
- Guessed author-page paths (`cs.cmu.edu/~xindu/...`, `symbolk.github.io/assets/pdf/...`, a GitHub raw PDF): 404 or 301; the GitHub README (raw) lists no paper link.
- Web search by title with "pdf" (two searches): only the ACM record, the SPLASH page, a library catalogue, the 2021 arXiv comparison paper (2112.10370, read in A6) and a University of Alberta thesis page (Ellis; compares RefMerge with IntelliMerge; not the paper).
- Needs the owner's sign-in: the ACM copy.

Block (status `summary`: read in the abstract only, the publisher's metadata record; not the paper's body; no figure below is read in a table or section):
- **Citation.** Shen, Zhang, Zhao, Liang, Jing, Wang, Xiong. IntelliMerge. OOPSLA 2019. Abstract text from Crossref: `R:papers/w1/intellimerge/abstract.txt:1`.
- **Problem.** Git and tree-based merge are unaware of refactorings, so a rename or move on one side and an edit on the other conflict.
- **Mechanism.** A graph of program elements for each version; match nodes across versions using refactoring detection; merge by graph.
- **Measured gain (`summary`).** "evaluation on 1,070 merge scenarios from 10 popular open-source Java projects": "reduces the number of merge conflicts by 58.90% comparing with GitMerge ... and 11.84% comparing with jFSTMerge ... without sacrificing the auto-merging precision (88.48%) and recall (90.22%)"; "539 milliseconds to process one merge scenario on the median" (`abstract.txt:1`). Which precision and recall (of the auto-merged hunks, against what ground truth) is not in the abstract: not read. The conflict-reduction figures are on the authors' own scenario set, in which refactoring-related changes are included by selection (not read in the body: `not measured` here).
- **Cross-check (A6, `quoted`).** Ellis, Nadi, Dig re-ran IntelliMerge on 2,001 scenarios selected for refactoring conflicts: it resolved or reduced conflicts in 24 %, increased conflicting LOC in 30 %, timed out in 870, and on a hand-checked sample of 50 had 707 false positives and 71 false negatives (`R:w1-collect-merge.md` A6). The two sets differ, so 58.90 % and 24 % are not on one scale (`reasoned`).
- **Assumes.** Java; a working refactoring detector; revisions that parse.
- **For model-session writers (`reasoned`).** Speed is small (about half a second). Whether precision 88.48 % holds for edits by sessions is unknown; the number is for merges of human work.
- **Frame.** Means (4). Same standing as A1 to A3: fewer reported conflicts; the abstract gives no figure on wrong clean merges beyond precision and recall.
