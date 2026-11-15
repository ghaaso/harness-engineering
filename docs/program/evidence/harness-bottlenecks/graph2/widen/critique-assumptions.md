# Assumptions audit of the finished graph test (2026-11-13)

Lane: assumptions audit. Read-only on the repository except this file. Nothing installed, nothing run except reading files and one web page.

## 0. What I read and how

- Protocol and amendments: `graph2/protocol.md`, `graph2/brief.md`, `graph2/sec6-status.md`, `graph2/protocol-addendum-1.md` to `-6.md` (all read in full).
- Pre-run research warnings: `graph2/research/critic.txt` and `graph2/research/verify.txt` (read in full). I also searched `research/lane-*.txt` for model extraction, summaries, time, caching.
- Result: `graph2/build-e/result.json`. I read in full the grader's headline, limits, question rows, draws and per-arm T1 rows, and all three refuters' verdicts, must-not-claim lists, defects and mismatches.
- Program context: `docs/program/TOKEN-BOTTLENECK-2026-11.md` (read in full) and `docs/program/HARNESS-BOTTLENECKS-2026-11.md` §6 (lines 210 to 263, read).
- The five widening lanes in `graph2/widen/lane-*.md`. I used their structured summaries and searched their text. I did not re-derive their outside figures.
- One outside check of my own: https://github.com/ohta-rh/graphify-bench README, fetched 2026-11-13 through a fetch tool that summarises pages with a small model. It confirms the lane figures, with two differences. The page itself gives both 65 and 105 for the task count. On doc-and-code tasks, Haiku 4.5 scored 75 % with graphify against 80 % without it, so the accuracy gain there is for Sonnet 5 only.

Status words used below:
- **supported**: evidence backs the assumption.
- **weakly supported**: there is evidence, but it is small, self-reported or indirect.
- **untested**: nothing in the test or the research measured it.
- **contradicted**: the evidence goes against it.

## 1. The owner's charge, in one paragraph

**The owner is right that the test was narrow, and the narrowing happened before any arm was built.**
- He asked about three things:
  - meaning stored as relations ("semantic relations and actual connections that will or won't break with changes");
  - time and caching ("spatial and temporal topology … caching … invalidation");
  - fetching small pieces fast instead of searching.
- The brief and protocol turned that into one task: recall of the files a commit changed, inside a fixed 8,000-token answer, with no agent in the loop, from deterministic parser facts at one snapshot per commit.
- The headline axis became the storage engine. Its answer was known in advance: addendum 3 item 21 and addendum 4 item 22 predicted, before the held-out run, that it would be exactly zero.
- Five warnings from before the run were not acted on (§3): an agent pilot, labels for context a change needed but did not edit, an embedding arm, community summaries, and scoring the store as an addition to grep.

**He is not right on three points.**
1. **"Our experiments are all failing" is false.** The typed graph store beat scripted search, the same-folder floor and the co-change floor on T1: +0.076 recall against search, interval [+0.036, +0.118]. The win is narrow (mobile-app seeds only), but it is a win, not a failure.
2. **Graphify's "good results" are mostly not controlled evidence of effect.**
   - The 71.5x headline is a size ratio against reading the whole corpus, with no correctness check. On code alone it is 8.8x, and it was never re-run.
   - 146,932 stars measure adoption, not effect.
   - The independent controlled runs on code with a strong model are null or negative.
3. **Graph type does not separate wins from losses in any source found.** Graphify is not a temporal knowledge graph, and its code layer is the same family as ours: a parser-built typed graph, entered by lexical match and expanded breadth-first. I found no source showing that choosing "graph" versus "knowledge graph" versus "temporal knowledge graph" decides an outcome (`widen/lane-agents.md` line 185).

## 2. Assumptions, one by one

Each entry gives: where the assumption sits, its status, why, what follows for the result, and the fix.

### A1. "Graph against relational" is a contest of storage engines

- **Where:** `brief.md` (the owner's own fairness objection, "self-made graph vs established relational engine"); `protocol.md` §1 and §5; addendum 3 E13 and E14 (H1 and H2 as the primary comparison).
- **Status:** weakly supported as a reading of the owner's objection; contradicted as a test of his question.
- **Why:**
  - `protocol.md` §1 already says that the same facts plus the same algorithm give the same answer in any engine, and that a mismatch is a bug.
  - `verify.txt` (verify-schema-scoring, error 9) says that this reduces store differences to latency, size, updates and ease of writing a query.
  - No coding-agent paper varies the engine (`research/lane-agent-graphs.txt` line 85).
  - The owner's fairness point was real for the first test, which used a JSON list against SQLite. But his question was about what is stored and how it is used, not which engine stores it.
- **Consequence:**
  - H1 and H2 are zero by construction.
  - All three typed arms are graph arms: SQLite held the same property graph.
  - So the headline "graph vs relational" comparison measured nothing about graphs.
  - The one informative contrast was "typed graph (any engine) vs scripted search".
- **Fix:**
  - Drop the engine from answer-quality comparisons. Keep it only for H5 (speed, size, update cost, effort).
  - Spend the test's variation on the representation: what facts exist (parser, model-extracted, document layer), whether conclusions are stored, and whether time validity is stored.

### A2. Identical answers from three engines say something about graphs

- **Where:** `build-e/result.json`, grade headline bullet 1 ("graph-versus-relational difference … exactly zero … 'equivalent'").
- **Status:** contradicted as evidence about graphs; supported as an implementation check.
- **Why:**
  - Identity is a property of the protocol (shared facts, shared specification, a cross-check arm), not of graphs.
  - Even the identity is qualified. The answers shown match on 770 of 770 tasks. The full ranked lists differ on 5 SQLite tasks and 3 DuckPGQ tasks (`refute:discipline`).
  - Addendum 6 item 9 already forbids "graphs add nothing".
- **Consequence:** the only graph-native algorithm actually tested is narrow:
  - It was a stored Louvain community prior added to personalised PageRank (H1b), and the PageRank iterations ran in application code.
  - Stored draw: +0.015 recall, interval [-0.010, +0.042]. Draw 1: +0.032 [+0.004, +0.061]. On T2: -0.037 [-0.084, +0.007] (`refute:claims`).
  - This is one prior on one repository. It says nothing about multi-seed PageRank, Steiner subgraphs, metapath explanations, or summaries per community.
- **Fix:**
  - Report identity as an implementation check only.
  - If graph-native algorithms are to be tested, test the ones the critic named as having no cheap SQL form: multi-seed personalised PageRank, Steiner or minimal connecting subgraphs, k-shortest typed paths returned as explanations and scored, and community summaries.
  - Score them on tasks where they could matter: tasks with several seeds, and "explain why" tasks.

### A3. Co-change is the right primary reference

- **Where:**
  - `protocol.md` §4 T1 and §7.
  - `research/lane-scoring.txt`.
  - Warned in `critic.txt` FAIRNESS ("Truth circularity").
  - Warned in `verify.txt` verify-schema-scoring error 7 and the [protocol] line: "Needed-but-unchanged context … which is what a graph is for, earns zero."
- **Status:** weakly supported as a proxy. It was warned about before the run and not acted on.
- **Why:**
  - The label is "other files the same commit changed", which is literally the co-change signal.
  - Before the run, only 62 % of targets had ever co-changed with the seed, and 21.8 % were test files (`verify.txt`).
  - The verifier proposed annotating 30 to 50 commits for needed-but-unchanged context (ContextBench-style). The protocol left this to a later model-in-the-loop step that was never run.
- **Consequence:**
  - The test rewards predicting edits, not supplying the context a change needs.
  - Half of the typed arm's credited recall (0.337 of 0.670 per task) came through paths that contain a co-change edge (`refute:claims`).
  - Outside mobile seeds, the typed store ties the co-change floor: +0.001, interval [-0.051, +0.055].
  - Callers, contracts and tests that are read but not edited, which is where a typed graph and the owner's "connections that will or won't break" should pay, earn zero.
- **Fix:** use labels that do not come from the shared extractor (`widen/lane-evaluation.md` D2 and the follow-up list), each kept as its own column:
  - tests that fail when the production diff is applied without the test edits (execution-derived);
  - invariants whose anchors the diff touches;
  - files touched by a later fix in the same area;
  - a sufficiency check by blind reading.

### A4. Model-extracted graphs can be excluded

- **Where:**
  - `research/lane-agent-graphs.txt` BUILD RECS: "Do NOT use: … LLM-extracted graphs".
  - `HARNESS-BOTTLENECKS-2026-11.md` §6: "Do not build: a model-extracted knowledge graph".
  - `protocol.md` §3: one deterministic extractor.
- **Status:** weakly supported for syntactic relations; untested for semantic relations.
- **Why:**
  - The direct study, arXiv 2601.08773, is weak. It has 45 questions, one author and one annotator. One repository carries the whole effect. Its model-built graph was a thin design: class nodes with one generic depends_on edge, files cut to 15,000 characters, 377 files skipped (`widen/lane-graphrag.md`).
  - There is stronger indirect evidence that parsers beat models on call graphs: 24 models lose to the static analysers PyCG and Jelly (arXiv 2410.00603, abstract only).
  - Neither speaks to relations a parser cannot produce: intent, rationale, doc-to-code claims, contracts stated in prose.
  - The only independent positive result for graphify sits exactly there, in graphify-bench (independent author; 940 runs; one repetition per task; one synthetic corpus of 477 code files and 139 design docs):
    - doc-and-code tasks with Sonnet 5: accuracy 80 % against 70 %, cost -0.084 USD, interval [-0.180, -0.005];
    - planted contradiction hunt: 4 of 4 found against 2 of 4, F1 0.94 against 0.68;
    - Haiku 4.5 on the same doc-and-code tasks: 75 % against 80 %.
    - Strength: medium.
- **Consequence:**
  - The finished test cannot say anything about the layer graphify adds.
  - This repo has much documentation: 87 markdown files, about 574k tokens by bytes/4 (`verify.txt`). About half is agent-written program docs, and 517 of 1,268 backticked file names in docs do not resolve.
  - That is where the owner's "lots of files and documents" point lands.
- **Fix:**
  - Add a model-extracted layer over docs and comments as a switchable arm: concepts, rationale, doc-to-code links, each with confidence and source line.
  - Count its build tokens.
  - Score it on doc-versus-code questions and planted contradictions, with an agent in the loop.
  - Keep code relations from the parser.

### A5. No summaries, reports or orientation layer are needed

- **Where:**
  - `protocol.md` §3: the node list has no summary node.
  - `critic.txt` MISSING (algorithms bullet: "community detection with cached per-community summaries (the 'cache' the owner asked about)"): not acted on.
- **Status:** untested here. Outside evidence is mixed and leans against summaries as a substitute for code.
- **Why:**
  - Evidence against summaries as a substitute:
    - Code summaries answered 4 of 45 behavioural questions against 27 of 45 for source (arXiv 2607.09691; abstract page only; `research/lane-algorithms.txt` line 94; medium to weak).
    - Repository context files written by models changed success by -0.5 % and -2 % (not significant) and raised cost by about 20 to 23 % (ETH AGENTS.md study, `widen/lane-temporal.md`; medium to strong).
    - Free summary reuse in SWE Context Bench fell below the no-experience baseline: 22.22 % against 26.26 %.
  - Evidence that could favour summaries as a pointer: RepoGraph's 2-hop summary held resolution (28.67 %, 1,229 tokens) where the flattened 2-hop dump hurt (26.00 %, 10,505 tokens, baseline 27.33 %).
  - The program's own measurement points the same way. Across windows, 294 paths read in five or more windows hold 73 % of fetched tokens (`HARNESS-BOTTLENECKS-2026-11.md` §6), and "nothing has shown that a shorter digest can stand in for the lines".
- **Consequence:** the orientation questions ("what is this slice, where is X handled, which doc governs this") were never asked. These are the questions where graphify's report and the owner's "small small" fetch would act.
- **Fix:**
  - Add an orientation-question set.
  - Compare four things on it: community summaries; role-aware file summaries used as an index (pointer, not substitute); plain retrieval; and map-reduce reading of everything.
  - Run a degree-preserving null test that the communities are real before paying for summaries.

### A6. Temporal validity, caching and invalidation can be left out

- **Where:**
  - `protocol.md` §3: one snapshot per parent; the cache is keyed by SHA as a build cache only.
  - `HARNESS-BOTTLENECKS-2026-11.md` §6: "Do not build: … time-based expiry".
  - The first test: "A cache over traversal has nothing to save" (§6, line 242).
- **Status:** untested. This is exactly what the owner asked about.
- **Why:**
  - A per-commit snapshot already gives an "as of commit K" view, so a temporal graph adds no knowledge about a past state (`widen/lane-temporal.md`).
  - What it does add is economy, plus one real primitive: a derived conclusion that carries the facts it rests on and stays valid until one of them changes. That is the build-system idea (Skyframe, Salsa, rustc red-green, Glean derived facts). It is strong as engineering description, with no token evidence.
  - The finished test could not show any value from it. Its facts cost zero model tokens and rebuild in about 5.3 s per commit (`build-b/facts-NOTES.md`), so there was nothing expensive to cache.
  - Published temporal-graph numbers do not transfer to code:
    - Zep's LongMemEval result is against the full conversation as baseline, run by the vendor (weak to medium).
    - Independent MemoryAgentBench FactConsolidation ranked Zep lowest (7 % single-hop, 3 % multi-hop) against 60 % and 5 % for GPT-4o long context (medium).
    - VibeMemBench: 11 of 12 solver and memory pairings did not beat memory-off on code.
- **Consequence:** "caching does not help" was shown only for traversal over cheap facts. Caching conclusions that cost tokens, invalidated when their dependencies change, has never been tested here or, as far as two lanes searched, anywhere controlled for code.
- **Fix:** `widen/lane-temporal.md` tests 1 and 2, then an agent pilot only if they are positive.
  - **Test 1:** replay the 190 per-commit snapshots. Record each answer's dependency set. Compare cache policies: none, whole-repo, file-hash, fact-level, and fact-level with early cutoff.
  - **Test 2:** report stale-served rate (must be 0), avoidable-recompute rate, and hit rate. Price the hits using measured lookup costs.
  - **Pilot:** grep; grep plus typed queries; plus cached conclusions with invalidation; plus the same conclusions with no invalidation as the stale control.
  - Close doc-to-file citation edges when the target file disappears.

### A7. A retrieval proxy can stand in for an agent

- **Where:**
  - `protocol.md` §8 (agent pilot left as an owner decision).
  - `critic.txt` MISSING "An end-to-end agent evaluation", whose fill was 24 to 30 fix commits with four tool sets: not acted on.
  - Addendum 6 D19.
  - I found no record in `graph2/` that the decision was put to the owner. The only other mention is `graph-test-report-f.workflow.js.txt` line 184, which lists it as a next step.
- **Status:** untested. Outside evidence says the proxy misses the main effect.
- **Why:** in published agent runs the dominant term is behaviour:
  - In CodeCompass, 58 % of graph-condition trials made no graph call (51 of 88).
  - Agents re-read files after a graph answer: 82 % of graphify nodes and edges had no source line (graphify issues 3307 and 3308, weak).
  - In graphify-bench, Sonnet 5 on code used +32k tokens [-8k, +75k], with accuracy 78 % against 84 %. Subagent tokens were not counted.
  - Map-based tools on Claude Code with Haiku 4.5 (arXiv 2611.07286, medium) cut tokens 17 to 39 % with success flat, mainly by displacing reads, and raised tokens on test writing.
  - Graph tools help small models more: +17 to 21 points at 1.7 to 4B, +2 to 5 at 32B (`widen/lane-graphrag.md`).
- **Consequence:** no claim about tokens, turns, success or mistakes can be made from the finished test. This is the largest gap against the owner's actual goal.
- **Fix:** run agent arms with model and harness fixed, using the deployment model.
  - Arms: grep and read only; plus BM25 symbol search; plus embeddings; plus the typed graph tool; plus graph and lexical; plus a placebo tool with a description of equal size.
  - Count tokens including subagents. Report cumulative and uncached tokens separately, plus tool-schema tokens.
  - Check in every run that the tool connected and was called.
  - Make steering its own condition.
  - Pilot 12 tasks x 4 arms x 3 runs, then about 40 x 3 x 3 (`widen/lane-evaluation.md`).

### A8. A scripted search is a fair baseline

- **Where:** `protocol.md` §5(a); addendum 6 item 13.
- **Status:** weakly supported.
- **Why:**
  - About half of the search arm's credited recall is co-change padding, and it does not beat the co-change floor: -0.013, interval [-0.032, +0.006] (`refute:claims`).
  - It is not an agent searching. Agents batch "find and read" in one command (151 of 200 sampled calls chained two or more lookups; another project's sessions; HARNESS §6).
  - The strongest non-graph baseline in the literature, embeddings, was left out (`verify.txt` LEAN bullet 1; `protocol.md` §8).
  - `critic.txt` FAIRNESS asked that both stores be scored "as additions to grep, not only against each other". The test scored them instead of grep, not added to it.
- **Consequence:** the T1 win over search is a win over a weak, padded baseline, mostly on mobile seeds. It does not show a win over how agents search today (`refute:claims` must-not-claim).
- **Fix:**
  - Use live agentic grep as the baseline.
  - Add a BM25 or FTS symbol-search arm with the same capped output format, and an embedding arm. An embedding arm needs a model download, which is the owner's decision.
  - Score the graph as an addition to grep.

### A9. A fixed 8,000-token budget measures token efficiency

- **Where:** `protocol.md` §7; addendum 2 A3; addendum 4 item 2; grade limits bullet 1.
- **Status:** contradicted.
- **Why:**
  - The median answer size was 7,999 tokens for every arm and every set, so the "no higher tokens" condition never decided a verdict.
  - Tokens to 80 % recall, where reached, were typed 7,152, search 7,014 and the co-change floor 6,283. The share of tasks reaching 80 % within 16,000 tokens was 66 %, 52 % and 56 %.
  - These medians are on different subsets and are not directly comparable. But nothing in them shows the typed store reaching the same recall in fewer tokens.
  - Precision at 8k was not re-checked by any refuter. Literature favours precision because polluted context hurts (Cognition, `widen/lane-agents.md`).
- **Consequence:** the test measured ranking quality at a fixed spend, not the owner's "fetch small pieces". About 0.70 recall for about 8,000 tokens per seed is not small.
- **Fix:**
  - Make the primary outcome tokens to sufficiency: the agent decides when it has enough, or a stop rule with a sufficiency check.
  - Report precision and recall at matched tokens.
  - Count the carry cost (see U1).

### A10. The session-lookup set (T5) can be dropped, and the seed can be given

- **Where:** addendum 4 item 7; `protocol.md` §4 (every task seeds from a known changed file and symbol; the commit message is excluded).
- **Status:** weakly supported as a fairness ruling; it creates a silent assumption that the agent already knows the entry node.
- **Why:**
  - The ruling is fair in itself: no text-to-seed step could be tuned, so an untuned one would have handicapped the typed arms.
  - But the literature says the entry point matters more than the traversal. In LocAgent's ablation, removing SearchEntity cost 19 points of file accuracy at 5, against about 2 for removing TraverseGraph (`verify.txt`).
  - The research itself recommended a lexical entry point (`research/lane-agent-graphs.txt` BUILD RECS).
  - Graphify's query path is lexical seed-finding followed by breadth-first expansion.
  - The only set built from real usage of this repo was dropped.
- **Consequence:** every arm was handed a perfect seed. The step a real query needs, from natural language to a node, and the step graphify performs, were never measured. This flatters typed lookup and leaves the decisive step untested.
- **Fix:**
  - Add natural-language entry tasks: issue text or the first prompt of a recorded session.
  - Give every arm the same lexical or embedding entry, tuned on its own tuning part.
  - Run D3 (replay the 139 recorded lookups) as screening.

### A11. Question kinds can be answered by programs written per kind

- **Where:** addendum 3 item 19; addendum 5 A2; addendum 6 item 14.
- **Status:** untested. The token comparison was misread.
- **Why:**
  - The typed side's costs were not counted: knowing the schema, and the query program written per question kind.
  - Final answers were the same size, 31 tokens typed against 29.5 for search. The 695 is what the scripted search read to get there (`refute:claims`).
  - Eight of 30 held-out questions needed handling changes after their text was read.
  - The typed arms answer question 40 empty, and H4 is inconclusive: F1 difference interval [-0.060, +0.257].
- **Consequence:** the 31-against-695 figure shows fewer steps and less reading for a caller that already holds the right query. It is not a measured session saving, and it is the same kind of number as graphify's ratio.
- **Fix:**
  - Expose one generic tool API from every backend: neighbors, impact, path, explain, search (`critic.txt` DESIGN).
  - Let the agent choose the call.
  - Count the tool-schema tokens in the prefix of every call.

### A12. One repository is enough

- **Where:** `protocol.md` §2; addendum 6 item 21.
- **Status:** untested for generality.
- **Why:**
  - The repo is small: 477 code files, about 5,400 nodes and 16,500 edges.
  - It is organised as vertical slices, so its folders already encode connections: same-folder padding alone scored 0.72 on TUNE (addendum 2 item 27).
  - Index gains are smaller at small scale (`research/lane-agent-graphs.txt` line 86). Graphify's own worked examples scale the same way: about 1x for 6 files, 5.4x for 4, 71.5x for 52 mixed files, 8.8x for that corpus as code only.
  - The mobile share of seeds moved from 17 % (TUNE) to 36 % (held-out), and the whole typed win sits there.
  - Every arm fell 0.06 to 0.17 from tuning to held-out.
- **Consequence:** the result can understate or overstate graph value elsewhere. Within this repo it depends on the runtime mix.
- **Fix:**
  - Stratify by runtime and report each stratum.
  - Use fresh commits after the freeze. The 75 held-out commits are spent.
  - If generality matters, add a second, larger, docs-heavy repository.

## 3. Assumptions nobody named yet

### U1. Token cost equals the size of a retrieval answer

- **Where:** `protocol.md` §7 (tokens = answer tokens); the 31/695 framing.
- **Status:** contradicted by the program's own measurement.
- **Why:**
  - Token usage is calls x window size. 97 % of context tokens are cache re-reads (`TOKEN-BOTTLENECK-2026-11.md`).
  - A fetched token is carried and re-processed about 50 times (HARNESS §6, "Carrying").
  - FixFlow's fixed prefix is 47 % of its tokens, about 60k per agent window, about 50k of it tool and connector schemas.
- **Consequence:** cuts both ways.
  - A smaller answer saves its size multiplied by the remaining calls in the window.
  - A new graph tool adds its schema to every call of every window.
  - Neither was measured.
- **Fix:** measure inside sessions. Report schema tokens and carried tokens per arm.

### U2. Fetched context is the bottleneck a graph should attack

- **Where:** the owner's first question; the brief.
- **Status:** weakly supported as a target, but bounded.
- **Why:**
  - Content fetched by reads and searches is 23 % (FixFlow) to 27 % (Clinic) of context tokens.
  - The larger levers are the orchestrator window, the fixed subagent prefix and the number of steps (`TOKEN-BOTTLENECK-2026-11.md`).
  - 74 % of fetched tokens went to files the window did not edit. Whether they were needed is unmeasured.
- **Consequence:** even perfect retrieval caps the saving at about a quarter of tokens before its own costs. Expectations of a large reduction need that bound stated.
- **Fix:** state the bound. Test the cross-session form (the hot paths in §6) where a store could act.

### U3. A single seed is the query shape

- **Where:** `protocol.md` §4.
- **Status:** untested.
- **Why:** `critic.txt` named multi-seed personalised PageRank and Steiner subgraphs as the graph-shaped candidates. They were not built.
- **Fix:** add tasks with several seeds.

### U4. "Connections that will or won't break" are scored by co-change recall

- **Where:** owner's second question; HARNESS §6, line 246 ("their use would be in the check").
- **Status:** untested.
- **Why:**
  - Contract, invariant and URL edges were built (constrains, contract, calls_url).
  - No task asked "what does this change break".
  - An execution-derived oracle exists in the literature: inject a change and see what fails (Musco et al.; `widen/lane-evaluation.md`).
- **Fix:** add a break-prediction task (lane-evaluation D2).

### U5. Tuning and held-out data are exchangeable

- **Where:** addendum 4 selection.
- **Status:** contradicted in part.
- **Why:**
  - All arms fell 0.06 to 0.17 from tuning to held-out.
  - The rejected configuration S1 (4 hops) scored +0.011 higher [-0.004, +0.026].
  - The mobile share of seeds doubled.
- **Fix:** rolling-origin splits, as `protocol.md` §7 already lists as a secondary; stratify.

### U6. Arm code is enough to keep the future out of reach

- **Where:** addendum 6 item 7.
- **Status:** held for parser arms (a re-check of 10 tasks found nothing); would fail for an agent.
- **Why:**
  - Every container mounted the live working tree with its full git history.
  - In outside audits, agents mined git history and the web for the fix: 63 % of successful runs in one audit of 731 runs (Cursor), and SWE-bench issue 465.
- **Fix:** for agent arms, mount a clean export or a bare clone limited to the parent commit; no network; blind transcript audit.

### U7. Model size does not matter

- **Where:** no model was named, because no agent was run.
- **Status:** contradicted by outside evidence. Gains shrink with model size: +17 to 21 points at 1.7 to 4B, 2 to 5 at 32B. A frontier model with agentic grep was not significantly beaten by an index (p 0.08 to 0.09).
- **Fix:** use the deployment model; report by model if more than one is used.

### U8 (the owner's). Stars and headline ratios are evidence of effect

- **Where:** the owner's latest message.
- **Status:** contradicted.
- **Evidence:**
  - Graphify has 146,932 stars in about 7 months (GitHub API, 2026-11-13). That is adoption.
  - The 71.5x is a ratio of two estimates: the whole 52-file corpus at about 123,488 tokens against about 1,726 tokens per answer. It used 5 generic questions, had no grading, and was run once by the maintainer. On code alone it is 8.8x, and it was not re-run after the v0.9.87 counting change (`widen/lane-graphify.md`, weak).
  - The code-agent result is 6 questions on ERPNext: 82.0 % against 70.8 % key-fact coverage, with no interval and a harness that is not public (weak).
  - Independent results:
    - SWE-bench Lite localisation (graphify issue 4341; medium): graphify ranked the right file first in 25 % of 177 issues against 32 % for BM25.
    - graphify-bench (medium): no measurable effect on code tasks with Sonnet 5; a positive on doc-and-code tasks.
- **Fix:**
  - Treat graphify as an arm, run as shipped (code layer, then with document extraction), scored for correctness.
  - Its `affected` command is the direct analogue of T1, and has no public measurement.

### U9 (the owner's). Graph type (graph / knowledge graph / temporal knowledge graph) is the deciding variable

- **Status:** contradicted.
- **What each one is:**
  - Our facts are a typed property graph with typed, evidence-carrying edges. In the schema sense that is a code knowledge graph, but it has no model-extracted meaning and no validity intervals.
  - Graphify is a NetworkX property graph with a model-extracted concept layer. It has no validity intervals and no history; its caching is per-file content hash. It is not a temporal graph.
  - In the unified-framework study, "TKG" means a textual knowledge graph, not a temporal one (`widen/lane-graphrag.md`).
- **Why it is not the deciding variable:** in the sources found, what separates wins from losses is the entry point, the output cap and format, steering, model size and task type (`widen/lane-agents.md` line 185).
- **Fix:** make each layer a switchable arm so the type becomes a measured contrast:
  - +model-extracted semantics;
  - +summaries;
  - +validity and cached conclusions.

## 4. Pre-run warnings: acted on or not

| Warning (source) | Acted on? |
| --- | --- |
| Lane reports missing (critic) | Yes: `lane-*.txt` written |
| Agent-graph literature (critic) | Yes: `lane-agent-graphs.txt` |
| Established graph engine run on the repo (critic) | Yes: LadybugDB 0.22.3, DuckDB with DuckPGQ (addendum 1) |
| Relational or Datalog fact stores (Glean, CodeQL, SCIP) as a third arm (critic) | No arm; discussed only |
| Serialisation and token cost of output forms (critic) | Partly: output forms swept; explanation paths not scored (addendum 2 item 24) |
| Missing typed edges (critic) | Mostly: inherits, mocks, contract, constrains, overrides; response-field-to-client was only attempted |
| Graph-shaped algorithms: multi-seed PageRank, Steiner, k-shortest explanations, community summaries, slicing (critic) | No: only a community prior on single-seed PageRank |
| End-to-end agent pilot, 24 to 30 commits (critic) | **No**: deferred as an owner decision; no record that it was put to him |
| Hand-checked structured questions (critic) | Yes: TQ, 50 questions |
| Leak-free build per parent (critic) | Yes; the live-tree mount remained (addendum 6 item 7) |
| Truth circularity / needed-but-unchanged labels (critic; verify-schema-scoring error 7; [protocol]) | **No**: co-change stayed the only label |
| Tuning on the test set (critic) | Yes: date split, sealed held-out |
| Low power (critic; verify) | Declared; T4 made descriptive |
| Unequal tuning effort (critic) | Yes: equal configuration counts, cross-check arm |
| "Wrong quantity: tokens per unit of relevance and agent success are the outcome" (critic) | **No**: answers filled a fixed budget; no agent |
| Score stores as additions to grep (critic) | **No**: scored instead of grep |
| Embedding arm (verify-agents-algorithms LEAN) | **No**: deferred as an owner decision |
| Search needs real queries: seed identifiers, routes (verify LEAN) | Yes for seed names and routes; the natural-language entry was never tested |
| Hops beyond 5 / metapaths (verify LEAN) | Yes: hops 1 to 6 plus unbounded; metapaths |
| URL ambiguity, test detection by path, pinned TypeScript stage (verify) | Yes (`protocol.md` §3) |
| T4 too small to carry a sign (verify) | Yes: descriptive only |
| "Changed-only gold rewards co-change for predicting its own signal" (verify) | No: same as the truth-circularity row |

## 5. What carries over to a wider test

Each finding below stands on its own measurement, whatever the owner's charge.

- **Engine equivalence.** With the same facts and the same algorithm, SQLite, LadybugDB and DuckPGQ give the same answers on this repo: shown content identical on 770 of 770 tasks. The engine is an operations choice; H5 timing is still unmeasured.
- **The fact layer.** A deterministic, leak-free fact build per commit:
  - about 5.3 s per build (with three running at once), about 4.1 MB per commit, byte-identical on rebuild;
  - 190 snapshots cached, with typed cross-runtime edges and fixed extractor defects.
  - It is the base for a temporal or cached-conclusion test at zero model tokens.
- **The typed store against scripted search, on co-change recall at 8,000 tokens.**
  - +0.076 [+0.036, +0.118] overall.
  - +0.151 on mobile seeds.
  - Outside mobile: +0.024 [-0.024, +0.074] against search, +0.001 [-0.051, +0.055] against the co-change floor.
  - It holds at 2k and 4k tokens.
- **Ranking and hops.** Ranking matters more than hop count. A stored community prior gave no gain of 0.05 or more (draws range +0.009 to +0.032). Unbounded traversal in both directions with degree-normalised ranking was selected; 4 hops did as well.
- **A strong baseline for any graph to beat.** In a vertical-slice repo, folder structure and co-change history are strong floors.
- **Questions.** A typed query reaches the answer to a structural question in one lookup against 2.13, and reads less to get there (search read 695 tokens). This is an exposure for saved steps, not a session saving. F1 was inconclusive.
- **Reusable apparatus:**
  - the sealed tasks and the 50 blind-checked questions, usable as development material for new label kinds;
  - the shared scorer and packer, the equivalence check, the held-out lock, the three-refuter process;
  - the removed-document path, which was checked to work.

## 6. What does not carry over

- Any statement about agent tokens, turns, success or mistakes.
- Any statement about model-extracted meaning, a document layer, summaries or orientation.
- Any statement about temporal validity, caching of conclusions, or invalidation.
- Any statement about context a change needed but did not edit, or about predicting what breaks.
- Any statement about the natural-language entry step, or against an embedding baseline.
- Token efficiency: every answer filled its budget.
- Other repositories or scales, and runtime mixes unlike the held-out one.
- The 75 held-out commits as a fresh test set: they are spent.

## 7. What I could not verify

- Whether the owner was ever asked to decide on the agent pilot or the embedding arm. I found no record in `graph2/`. It may exist elsewhere, for example in session transcripts I did not read.
- The outside figures in §2 and §3 come from the widening lanes' notes. I re-checked only the graphify-bench README, through a fetch tool that summarises with a small model.
- The per-kind token numbers behind 31 against 695. I used the grader rows and the refuter's 29.5-token figure and did not open `build-e/tq.json` per question.
- H5 timing is not reported anywhere yet.
