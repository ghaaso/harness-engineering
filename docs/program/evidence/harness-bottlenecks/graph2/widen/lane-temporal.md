# Lane: temporal knowledge graphs (notes, written 2026-11-13)

Scope: what a temporal knowledge graph (TKG) adds for an agent that works on a codebase, and what the evidence is. Read-only research. Nothing was installed or downloaded. Searches used the public tools' and papers' own names only; nothing about the owner's project was sent out.

Strength labels: STRONG = independent and controlled; MEDIUM = independent but small, or controlled but by an interested party; WEAK = self-reported by the vendor, a single-author preprint, or an anecdote. A GitHub star count is adoption (people who clicked a button), not evidence of any effect.

How each source was read: "read" means I fetched the paper or page body and the numbers below come from it. "snippet" means I only saw a search-result summary; those are marked and should be re-read before anyone relies on them.

---------------------------------------------------------------------------------------------------

## 0. The short answer

1. A temporal graph gives an agent nothing that one snapshot per commit cannot answer about a past state: the snapshot at commit K is, by construction, the "as of K" view. What an interval store adds is (a) economy (a fact stored once with a from-commit and a to-commit instead of once per snapshot), (b) cross-time questions in one traversal ("since when has this edge existed", "which edges changed in this window", "how long has this been stable"), and (c) the one primitive that makes cached conclusions safe: a derived fact that carries the set of base facts it rests on, and is valid exactly until one of those base facts changes. Points (a) and (b) are small at this repository's size (see section 6). Point (c) is the real prize, and it is the well-understood idea from build systems, not a novelty of knowledge graphs.
2. The token saving a TKG is supposed to bring comes from two things: not re-deriving a conclusion whose inputs have not changed, and fetching a small fact instead of the files it was derived from. The strongest measured evidence for the second is the finished test itself (about 31 tokens for a typed query against about 695 tokens for scripted search, on the same questions). The published evidence for the first, on code, is thin and mostly negative: when stored experience or summaries were injected into coding agents, 11 of 12 memory-system and solver pairings did not beat no memory (VibeMemBench), and LLM-written repository context files raised cost by about 20 % with no significant gain (ETH AGENTS.md study). I found no controlled study that caches LLM-produced conclusions about code, invalidates them by dependency, and measures an agent's tokens and success.
3. The owner is right on one point that matters: the finished test did not include the cached-conclusion idea, because its facts were parser-extracted and cost no model tokens to produce, so there was nothing expensive to cache. Caching a deterministic extraction saves seconds, not tokens (a full build takes about 5 s per commit here). Whether caching conclusions pays depends entirely on conclusions that are expensive to derive, and that has not been tested by anyone I could find, including by the finished test. The owner is not right that published temporal-graph results are evidence for the code case: they are on conversation memory, against a full-context baseline, mostly self-reported, and the one independent benchmark of knowledge updates (MemoryAgentBench) scores Zep lowest of all methods tried.
4. The smallest honest test is a zero-model replay on the 190 per-commit snapshots the finished test already has. It measures, for the 50 structured questions plus cheap new ones, how often a cached answer stays valid under a dependency-tracked policy, and how often a policy serves a stale answer. It prices the savings with token costs already measured. Only if the hit rate times derivation cost is large does a model-in-the-loop pilot make sense. Design in section 5.

---------------------------------------------------------------------------------------------------

## 1. What a temporal graph can do that one snapshot per commit cannot

### 1.1 What the temporal designs are (read)

Graphiti / Zep (paper: https://arxiv.org/abs/2501.13956, read via the arXiv HTML; README: https://github.com/getzep/graphiti, read; source: https://raw.githubusercontent.com/getzep/graphiti/main/graphiti_core/utils/maintenance/edge_operations.py, read).
- Two timelines. T is event time. T' is transaction (ingestion) time. Four timestamps per fact: created and expired (when the system learned and retired it) and valid and invalid (when the fact held in the world).
- Episodes are the raw inputs (message, text or JSON). Each derived entity and fact traces back to its source episodes. The README says the old fact is marked invalid, not deleted, so history stays queryable.
- Retrieval is hybrid: cosine similarity on embeddings, Okapi BM25 full text, and breadth-first search over the graph; reranking by reciprocal rank fusion, maximal marginal relevance, node distance, episode mentions, or a cross-encoder. The paper retrieved 20 edges and entity nodes per question.
- Invalidation is decided by a language model, not by a rule. In the current source, a new fact is embedded; two searches find candidate old facts (same two endpoints for duplicates; any semantically close edge in the group, with no endpoint restriction, for contradiction candidates); a call to a "small" model returns index lists of duplicate and contradicted facts; the code then sets invalid_at on the older fact to the new fact's valid_at, only when the two validity windows overlap and the older one started earlier; a candidate with a missing date is skipped; out-of-range indices from the model are logged and ignored. Within that file nothing checks that a claimed contradiction is semantically sound.

Mem0 and its graph variant Mem0g (paper: https://arxiv.org/abs/2504.19413, HTML read). An LLM extracts candidate facts; for each, the 10 most similar memories are retrieved and an LLM picks ADD, UPDATE, DELETE or NOOP. In the graph variant an LLM "update resolver" marks obsolete relationships invalid instead of deleting them.

MemStrata (https://arxiv.org/abs/2606.26511 and https://arxiv.org/abs/2608.20685, abstracts read). A deterministic rule instead of a model: facts are (subject, relation, object) triples; a newer fact for the same subject and relation supersedes the older one in a bi-temporal ledger. Single author.

### 1.2 Snapshot per commit versus interval store (my reasoning, not a measured result)

| Question | One snapshot per commit | Interval store (fact valid from commit A to commit B) |
|---|---|---|
| What was true at commit K | Open snapshot K. Exact. | Filter intervals containing K. Exact. Same answer. |
| What changed between K and L | Diff two snapshots. | Intervals opened or closed in the window. Same answer, one pass. |
| Since when has this edge existed | Scan snapshots backwards until it is absent: cost grows with history length. | Read the interval. |
| Storage | The finished test's cache is 778 MB for 190 builds, about 4.1 MB per commit (build-b/facts-NOTES.md). Full rebuild about 5 s. | Roughly one copy of each fact plus its changes. |
| Identity of a node across time | Not needed: each snapshot is self-contained. | Required. A rename or move must be recognised as the same entity or the interval splits. This is the hard part and is where git's rename detection is heuristic. |
| Time axis | Commits are a DAG (branches, merges). A snapshot is addressed by commit, so branches are free. | A linear from/to interval does not fit a DAG. Validity must be "reachable from commit A and not from commit B", which is a set, not an interval. Graphiti's model assumes linear timestamps. |
| The agent's real working state | The uncommitted working tree matches no snapshot. | Same problem. Cursor and ContextSniper handle it by hashing or diffing the working tree against the index (sections 3.4 and 3.5). |
| Derived conclusions | Cache one conclusion per snapshot; reuse requires a separate comparison of inputs. | A conclusion can carry its dependency set and an interval that closes the moment any dependency closes. This is the only capability that is genuinely new, and it is the build-system idea. |

Two statements here are inference from how the structures work; the evidence in sections 2 and 3 is what supports or does not support using them.

### 1.3 What the literature on temporal knowledge graphs adds beyond that (read where marked)

Most of the TKG literature (forecasting future facts, link prediction over time) is not about retrieval for agents and I did not review it. What bears on agents: bi-temporal modelling (the Zep design above), and a survey of agent memory (https://arxiv.org/html/2602.05665v1, snippet only, not read) that distinguishes valid time from transaction time. A 2026 survey of persistent agent memory (https://arxiv.org/html/2606.30306v1, snippet only, not read) is reported to argue that a codebase is versioned state whose commit graph gives a natural rollback notion. I did not verify either claim.

The only code-specific temporal-graph work I found, read at abstract level:
- AgenticSZZ (https://arxiv.org/abs/2602.02934; Shi, Li, Adams, Hassan; Feb 2026): a temporal graph of commits; an agent traverses file history backward to find the bug-inducing commit. F1 0.47 to 0.79 across three datasets, up to 34 % better than prior methods. Task is history forensics, not coding-context retrieval, and no token numbers are in the abstract. MEDIUM/WEAK.
- KCoEvo (https://arxiv.org/pdf/2603.07581, snippet only): a graph of library version transitions (rename, relocate, deprecate) for migrating code across library versions. Not an agent working on its own repository. Not verified.
- VersionRAG (https://arxiv.org/abs/2510.08109, abstract read): a graph of document versions and changes. On the authors' own 100-question benchmark over 34 versioned documents it scored 90 % against 58 % for plain RAG and 64 % for GraphRAG, and 60 % on undocumented changes where baselines scored 0 to 10 %; indexing used 97 % fewer tokens than GraphRAG. WEAK/MEDIUM (authors' own small benchmark, no replication seen).
- MemStrata on code (https://arxiv.org/abs/2608.20685, abstract read; single author, preprint, 21 Aug 2026): 130 "clean atomic state transitions" mined from 707 SWE-bench Lite and Verified issues; answer accuracy 0.91 against 0.57 to 0.59 for plain RAG; when forced to answer, RAG served the superseded value 36 to 38 % of the time, MemStrata about 0 %; retrieval latency about 2.1 s against about 18 s for an LLM reranker. Only about 18 % of real fixes were clean transitions of that kind. Statements are rendered "marker-free" and the facts are already in triple form, so extraction, the hard part, is excluded. WEAK.

---------------------------------------------------------------------------------------------------

## 2. Where the token saving is supposed to come from, and the strongest measured evidence

Two mechanisms: (A) do not re-derive a conclusion whose inputs have not changed; (B) fetch a small derived fact instead of the files it was derived from.

### 2.1 Conversation-memory evidence (what the published TKG numbers actually are)

| Claim | Numbers | Baseline | Measured by | Strength |
|---|---|---|---|---|
| Zep, LongMemEval (about 115k tokens per conversation) | Average context 1.6k tokens against 115k (about 72 times fewer). Accuracy 63.8 % against 55.4 % (gpt-4o-mini) and 71.2 % against 60.2 % (gpt-4o), i.e. +8.4 and +11.0 points; the paper's "15.2 %" and "18.5 %" are relative gains. Latency 3.20 s against 31.3 s and 2.58 s against 28.9 s. | Full conversation placed in context. The paper's table has no plain vector-RAG row. | Zep's own authors (arXiv 2501.13956, read). Latency includes a network hop from a laptop to AWS us-west-2 that the baseline did not have, as the paper says. | WEAK to MEDIUM: vendor, but the baseline and numbers are specified. |
| Zep, same table, the question type closest to invalidation ("knowledge-update") | 76.9 % to 74.4 % (gpt-4o-mini, a drop) and 78.2 % to 83.3 % (gpt-4o). From the percentages the question count looks like 78 (my inference). Single-session-assistant fell 9.1 and 17.7 % relative. | Same | Same | The invalidation-specific category shows no clear gain in the vendor's own table. |
| Zep, DMR | 94.8 % (gpt-4-turbo) against MemGPT 93.4 % and full conversation 94.4 %; 98.2 % against full conversation 98.0 % (gpt-4o-mini). The authors themselves call DMR inadequate: about 60 messages per conversation fit easily in context. | Full conversation; MemGPT | Same | WEAK; the authors disown the benchmark's power. |
| Mem0 paper, LoCoMo (about 26,031 tokens per conversation) | Judge score overall: full context 72.90; Mem0g 68.44 (3,616 context tokens); Mem0 66.88 (1,764 tokens); Zep 65.99 (3,911 tokens); best plain RAG 60.97; A-Mem 48.38. p95 total latency: Mem0 1.44 s, Zep 2.93 s, full context 17.1 s. Mem0 reports a stored Zep graph of over 600k tokens per conversation against a 26k raw conversation (Zep caches a summary on every node). | Full context; plain RAG at several chunk sizes | Mem0's authors (arXiv 2504.19413, read). Run 10 times, mean and standard deviation reported. | WEAK to MEDIUM. Even this vendor-favourable table shows memory buys tokens and latency at a cost of 4 to 7 judge points against full context. |
| Zep's reply on the same benchmark | Corrected Zep score 75.14 +/- 0.17 against Mem0g 68.44 (about 10 % relative); Zep says Mem0 mis-ran Zep (user role, timestamps put in message text instead of created_at, sequential searches). It also says a full-context baseline scores about 73 %, above Mem0's best. Zep says the first Zep figure (84 %) was its own calculation error. | | Zep blog https://www.getzep.com/blog/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/ (read). Mem0's re-run put Zep at 58.44 % (secondary reports; not read at source). | WEAK: two vendors disputing each other. I found no resolution. |
| Letta, "is a filesystem all you need" | A gpt-4o-mini agent with grep, search_files, open, close scored 74.0 % on LoCoMo against 68.5 % that Mem0 reported for its best graph variant. | Mem0's own reported number | Letta (a competing memory vendor), https://www.letta.com/blog/benchmarking-ai-agent-memory (read). The authors say the benchmark measures retrieval and that cross-framework comparisons are apples to oranges. | WEAK, but relevant: a grep-style agent matched or beat the graph memories on their own benchmark. |

Criticisms of these benchmarks (all read, all from parties with some interest):
- LoCoMo audit (https://penfieldlabs.substack.com/p/we-audited-locomo-64-of-the-answer and https://github.com/dial481/locomo-audit): 99 of 1,540 answer-key entries (6.4 %) are wrong, so a perfect system tops out near 93.6 %. The published judge (gpt-4o-mini) accepted 62.81 % of deliberately vague, on-topic wrong answers and 10.61 % of specific wrong answers. The audit also alleges one system's token cost was understated (2,298 claimed against 6,669 in the system's own table). Author is unnamed; no independent confirmation found. WEAK-MEDIUM.
- Both LoCoMo (about 16 to 26k tokens) and LongMemEval (about 115k) fit in current context windows, which is why a full-context baseline is competitive (Zep's own blog and the Mem0 paper's own table agree on this).

### 2.2 Independent evidence on updates and on memory systems for code

MemoryAgentBench (UC San Diego, ICLR 2026 poster; https://arxiv.org/html/2507.05257v2, read). Built to test four competencies, including selective forgetting (what to do when a newer fact contradicts an older one). The FactConsolidation task takes counterfactual edits, numbers each fact, places the rewritten fact after the original with a higher serial number, tells the agent the newer fact wins, and uses contexts of 6k to 262k tokens, 100 questions per variant. Accuracy (percent), single-hop / multi-hop:

| Method | Single-hop | Multi-hop |
|---|---|---|
| GPT-4o, long context | 60 | 5 |
| HippoRAG-v2 | 54 | 5 |
| BM25 plain retrieval | 48 | 3 |
| Cognee | 28 | 3 |
| MemGPT | 28 | 3 |
| Mem0 | 18 | 2 |
| GraphRAG | 14 | 2 |
| Zep | 7 | 3 |

The authors conclude that every method fails on multi-hop (at most 7 %). Caveats I could not resolve: recency is encoded as a serial number in the text, not as the timestamp field Zep's design expects; the authors say they used one chunk size for all memory agents (4,096 tokens; their appendix is internally inconsistent about it); they do not explain the memory agents' low scores. So this is real independent evidence that a memory system with LLM-decided invalidation did not handle contradictory updates well under this setup, but it is not proof that a correctly configured Zep could not. MEDIUM.

VibeMemBench (https://arxiv.org/html/2609.23570, read; Sep 2026). 111 coding targets from 90 repositories, 3,634 history trajectories, executable tests decide success, matched memory-off baselines. Four memory systems (Mem0, SimpleMem, MemoryOS, A-MEM) built experience from the same history; 11 of 12 solver and system pairings did not beat memory off. Examples: deepseek-v4-pro 67.1 % memory off; Mem0 62.8 % (-4.3 points), A-MEM 63.1 % (-4.0); glm-5 55.0 % off, Mem0 49.5 % (-5.5). The one gain (MemoryOS on glm-5, +2.0) has an interval crossing zero. Direct injection of verified experience did help on 4 of 5 solvers (+1.1 to 4.5 points). Authors' diagnosis: 160 of 231 failing pairings broke at the form of the stored record (raw transcripts carrying instruction-like text, over-general fix patterns, schemas with no slot for the fix), not at retrieval. Limits: 111 targets, mostly Python, no proprietary frontier solvers, retrieval happens before the run rather than online, and the paper does not address staleness. Not a test of a temporal graph; a test of cached conclusions as the field builds them. MEDIUM.

ETH Zurich AGENTS.md study (https://arxiv.org/html/2602.11988, read; Feb 2026). 138 instances from 12 repositories plus 300 SWE-bench Lite tasks; four agent and model pairs. LLM-written repository context files changed resolution by -0.5 % (SWE-bench Lite) and -2 % (their 138-instance set), neither significant, and raised cost by about 20 % and 23 % (significant). Developer-written files: +2.4 %, not significant. Repository overviews did not help agents reach the files the fix touched. The paper does not study outdated content. This is the closest controlled evidence on "an LLM's conclusions about the repo, cached and shown to an agent": it costs more and does not help on average. MEDIUM-STRONG (controlled, four agents, but Python only, one sample per instance).

SWE Context Bench (https://arxiv.org/html/2602.08316v1, read; 99 related tasks). Resolution: no experience 26.26 %; free experience reuse 26.26 %; oracle full-trajectory reuse 27.27 %; free summary reuse 22.22 % (below baseline); oracle summary reuse 34.34 %. Average cost per instance: oracle summary $0.77, none $0.79, free summary $0.85, free experience $0.98. Summaries average 204.5 words against 24,765 words for full trajectories (an automated summary of the search results gave these as tokens; the paper reports words). Reading: a perfectly chosen small summary helped accuracy and saved about 2.5 % cost; an unfiltered or wrongly chosen one hurt. It does not discuss staleness. MEDIUM.

DreamBench-SWE (https://arxiv.org/abs/2608.20664, abstract read; single author, 67 pages, Aug 2026). Multi-session tasks where later work depends on earlier evidence. Passes out of 180: no external memory 21; deterministic verbatim event memory 82; typed-plus-raw probe 83; one pinned hosted Mem0 configuration 97. The author calls literal-storage against verbatim nonconfirmatory and not significant, and says six registered comparisons were unavailable. Reading: any memory beat none by a lot; a plain verbatim log was close to the commercial memory. WEAK-MEDIUM; the stale-suppression design is described in the title but I did not read the body.

ContextSniper (https://arxiv.org/html/2607.01916v1, read; Huawei and academic authors, Jul 2026). A code memory layer that is an index plus graph (imports, calls, containment), hybrid retrieval, and a gate that shortens long outputs. On 50 SWE-bench Lite tasks per host agent: OpenClaw tokens 1.36M to 0.66M per task (-51.5 %), cost -36.4 %, resolution 26.0 % to 24.0 %; Claude Code tokens -38.9 %, cost $15.09 to $10.97 (-27.3 %), resolution 32.0 % to 30.0 %. No confidence intervals; the authors say conclusions about repair success are not firm. Not temporal. Kept fresh by hooks after the agent's own reads and edits and by reconciling the index with the working tree through repository diffs at each task. The closest published "graph for coding agents saves tokens" number, and it comes with a 2-point drop in resolution that its own sample cannot resolve. WEAK-MEDIUM.

### 2.3 The one number in this repository

The finished test's structured-question arm: a typed query returned the answer in about 31 tokens where scripted text search read about 695 tokens to give an answer of the same size (from the task description; per-kind numbers in graph2/build-e/result.json were not re-read in this lane). That is mechanism (B) measured, on a snapshot, without any temporal structure and without any model-written conclusions. Mechanism (A) was not tested.

### 2.4 Where mechanism (A) is already proven (build systems and incremental computation)

These are about compute time, not tokens, but they are the settled theory of "cache a derived value and invalidate it correctly".
- Build Systems a la Carte (Mokhov, Mitchell, Peyton Jones; ICFP 2018 and JFP 2020; https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems-a-la-carte.pdf). I could not read the PDF text (compressed streams); the description below comes from Neil Mitchell's slides (https://www.sambuz.com/doc/build-systems-ppt-presentation-809664, read) and the authors' blog, which names but does not define the terms. A dirty-bit rebuilder marks a rule dirty if anything it depends on is dirty, so dirtiness cannot stop at a rebuild that produced the same output; a verifying trace stores a hash of the inputs and reruns only if the trace differs; Shake uses an optimised verifying trace; a constructive trace stores the outputs so they can be fetched instead of rebuilt; a deterministic constructive trace does not support early cutoff. Early cutoff means that when a rule reruns and its output is unchanged, nothing downstream reruns.
- Bazel Skyframe (https://bazel.build/reference/skyframe, read): bottom-up invalidation of transitive dependents of changed files; "change pruning" resurrects dependents when a rebuilt node's value equals the old one; functions must obtain all inputs by requesting nodes; reading data directly creates an unregistered dependency and can produce incorrect incremental builds; functions must be deterministic.
- Salsa (rust-analyzer's engine, https://salsa-rs.github.io/salsa/reference/algorithm.html, read): each input records the revision it last changed; a memoised function records its dependencies and the revisions they changed; if a dependency re-executes and returns the same value its changed-revision is not advanced ("backdating"); durability levels skip walking edges that cannot have changed.
- rustc red-green (https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html, read): a query is green if all inputs are green; if an input is red the query re-executes and is marked green anyway if its result hash is unchanged, stopping propagation; the order of reads is recorded because control flow may depend on earlier reads.
- Meta's Glean (https://glean.software/blog/incremental, read): facts are labelled with a "unit" (for example a file name); an incremental database is stacked on a base and hides the units that changed; ownership propagates through the fact graph so no visible fact points to a hidden one; a derived fact is visible only when everything it derives from is visible. Measured by Meta: about 2 to 3 % indexing overhead for Python (within noise for Hack), about 7 % larger database, typical queries under 10 % slower after caching work, search-heavy queries up to about 3 times slower. The post says incremental derivation (derived facts computed in time proportional to the change) works only for some query kinds and generalising it is hard. This is the nearest existing production design to "facts valid from commit A to B, with derived facts carrying their dependencies" on code. STRONG as an engineering description from a production system; it reports no agent-token measurements.

---------------------------------------------------------------------------------------------------

## 3. Failure modes (with the evidence for each)

### 3.1 Stale facts served as true
- Plain retrieval has this problem and the field knows it: MemStrata's authors report that cosine similarity separates a contradicted fact from a duplicate with an area under the curve of 0.59 (near chance) and that plain RAG served the superseded value 15 to 40 % of the time when forced to answer (single author, WEAK). Zep's own paper presents no test of how often invalidation is right: the independent review at https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-arxiv-2501.13956-zep.md (read) notes there is no measured precision or recall for contradiction detection and no stale-leak test.
- Eventual consistency: the Mem0 paper reports that, right after adding memories to Zep, retrieval often failed and later runs were better, attributed to asynchronous background LLM processing. In a coding session an agent that edits a file and asks again immediately would hit this. A parser-based extractor does not have it.
- The working tree is not a commit. An agent's edits are uncommitted; any cache keyed to commits is stale the moment the agent changes a file. Cursor, Aider and ContextSniper solve this by hashing or stat-ing files (below).
- Stale cached summaries in the agent's context can cost more than they save (AGENTS.md study; SWE Context Bench: unfiltered or wrongly chosen experience gave 22.22 % against 26.26 % baseline).

### 3.2 Invalidation too coarse or too fine
- Too coarse: invalidate everything on any commit (no reuse), or invalidate a conclusion when any file in its dependency closure changes by content hash (a comment edit invalidates it). Build systems without early cutoff behave this way: a dirty bit propagates through a rebuild that produced the same output. The cure is to compare the recomputed value and stop propagation when equal (Skyframe change pruning, Salsa backdating, rustc red-green).
- Too fine: a conclusion that silently depends on something not recorded as a dependency (the order of definitions, a global config, a negative fact like "no other caller exists", which depends on every file that could have added one). Skyframe documents this directly: an unregistered dependency causes incorrect incremental builds. For a code graph the equivalent of a negative dependency is a query of the form "which functions call X": it depends on the absence of edges anywhere, so its dependency set is the whole call-edge table unless an index is itself a tracked node.
- For derived conclusions that cross levels (a prose summary of a function), the right dependency is the function's interface plus whatever the summary mentions, not the file text. GHC and rustc use interface or result hashes for the same reason; I did not fetch GHC's documentation, so I cite only rustc's red-green description above.
- Aider's tag cache (https://raw.githubusercontent.com/Aider-AI/aider/main/aider/repomap.py, read) shows the cheap version: cache per file keyed on path with a stored mtime, reparse on mismatch, cache directory versioned by parser setup. Its ranked-map cache is keyed on chat files, other files, token budget, and for "auto" refresh also mentioned names, and is read only if the last generation took over 1.0 s. Mtime is a weaker validity test than a content hash (a touched file reparses; a restored file with an old mtime is trusted).

### 3.3 Extraction errors that persist
- With a language model doing extraction and invalidation, an error is written once and then served as a durable fact, and later facts attach to it. Graphiti's pipeline relies on model judgments for entity extraction, deduplication, edge resolution and contradiction detection (README and source, read). The README warns that smaller or local models may cause ingestion failures. MemoryAgentBench's low FactConsolidation scores for Zep, Mem0 and Cognee are consistent with this but do not isolate the cause.
- VibeMemBench found 160 of 231 failures were in the form of the stored record (extraction schemas with no slot for the fix, transcripts carrying instruction-like text), not in retrieval.
- With a parser-based extractor errors persist too, but they are reproducible: the finished test keys its facts cache on the commit and an extractor version (sha256 of the five extractor sources, build-b/facts-NOTES.md), so a fixed extractor rebuilds everything. A cache of LLM conclusions needs the same key (model, prompt, extractor version) or it keeps the old error.
- Identity errors: a rename recognised wrongly splits or merges a fact's history. Not measured by anyone I found for code.

### 3.4 Other failure modes found
- Cost of building the temporal structure. Mem0 reports Zep's stored graph at over 600k tokens per conversation against 26k raw (a competitor's measurement; see the 2.1 table). Graphiti's README warns of low default concurrency (a limit of 10) to avoid model rate limits and requires an LLM provider with structured output. For a repository parsed deterministically this cost does not arise.
- Documentation staleness is a large effect in this very repository: the earlier research recorded 517 of 1,268 backticked file names in the docs that do not resolve (graph2/research/critic.txt, "Stale docs"). A validity interval on doc-to-file citation edges, closed when the target file is removed or renamed, is a deterministic check and would catch this class without a model. For prose claims (not names) the literature is mixed: CoCC (https://arxiv.org/abs/2403.00251, snippet) reports over 90 % precision detecting outdated code comments from commits, and DocPrism (https://arxiv.org/pdf/2511.00215v1, snippet) says plain LLM use gives unacceptably high false positives; both are search-result summaries, not read.
- Benchmarks are the weakest link of the whole field: vendor-authored, answer-key errors, lenient judges, full-context baselines that fit in the window, and results that other groups could not reproduce (EverMemOS and Mem0 reproduction issues, per the LoCoMo audit, secondary).

---------------------------------------------------------------------------------------------------

## 4. Adoption versus evidence (stars)

- Graphiti: 32.8k stars, 3.4k forks, Apache-2.0 (README as fetched on 2026-11-13). Its own README states no benchmark for its retrieval speed ("depends on your setup"). Its coding-specific use is community projects (Synapse, memex) with no independent evaluation found; one search-result summary says adoption is mainly in customer-facing agent apps.
- graphify (https://github.com/safishamsi/graphify, README read): 146.9k stars as fetched. It is not a temporal graph: the README describes no validity or history model. Code is parsed by tree-sitter (deterministic, no model); documents, PDFs and images go through a model; edges are tagged EXTRACTED or INFERRED; there is incremental re-extraction of changed files (`--update`), git hooks and a watch mode. Its own benchmarks, as stated in the README: LoCoMo (n=300) recall at 10 of 0.497 against Mem0 0.048 and Supermemory 0.149; LongMemEval-S (n=50) 76 % QA accuracy "tied with dense RAG"; ERPNext (n=6) 82.0 % key-fact coverage against 70.8 % for a grep and read baseline. The "80 %" token figure appears in marketing for its cloud product with no baseline given. These are self-reported on small samples and on conversation benchmarks rather than on code agents; I did not read BENCHMARKS.md. A star count measures popularity. (The graphify lane in graph2/widen/lane-graphify.md covers this in depth.)
- So the owner's question "how does it show good results and have many stars" has this answer in my lane: the temporal graph projects with star counts have self-reported benchmarks, mostly on conversation memory against a full-context baseline, and the independent benchmarks I found (MemoryAgentBench, VibeMemBench) do not show those systems helping on updates or on repository tasks.

---------------------------------------------------------------------------------------------------

## 5. The smallest honest test of "cached conclusions with invalidation on a code graph"

Principle: first test the invalidation logic with no model at all, because for deterministic derived facts the ground truth is free (recompute at the new commit). Only then spend model tokens, and only on the part where tokens are at stake.

### 5.1 What is reused from the finished test
- 190 per-parent fact snapshots, byte-reproducible, keyed by commit and extractor version (build-b/facts-NOTES.md: median 10,847 edges per build, 5.3 s per build at three concurrent builds, 4.5 to 7 s alone).
- The query programs behind the 50 structured questions (8 kinds), run identically in the three engines and the plain in-memory reference, with hand-verified answers at the frozen commit.
- The same paired, commit-level statistics.

### 5.2 Test 1: invalidation correctness and hit rate (no model, no agent, hours not days)
Definitions. A conclusion = (query program, arguments, answer, dependency set), where the dependency set is every node and edge the program read, recorded by instrumenting the in-memory reference implementation (including the "scan of the call-edge table" for negative queries, so a no-caller answer depends on all call edges).

Replay. Walk consecutive snapshots (parent P to child C, first-parent order). For each of the 50 questions plus about 200 cheap extra questions generated mechanically from the same query kinds over many arguments, compute the answer at P (this is the cache). At C, apply each policy and compare with the answer recomputed at C (the ground truth):

| Policy | Rule | Build-system analogue |
|---|---|---|
| P0 no cache | recompute always | |
| P1 coarse | invalidate everything when any file changed | dirty bit on the whole repo |
| P2 file-level | invalidate if any file in the dependency set has a different content hash | verifying trace on files |
| P3 fact-level | invalidate if any recorded node or edge in the dependency set was added, removed or changed | verifying trace on facts |
| P4 early cutoff | on invalidation recompute and compare; if equal, keep the old answer and do not invalidate conclusions that read this one | Skyframe change pruning, Salsa backdating, rustc red-green |
| P5 mtime-style | as Aider's tag cache | for contrast |

Report, with commit-level intervals:
- stale-served rate: cached answer served although the recomputed answer differs. The one error that matters; target zero. A policy with any nonzero value is rejected whatever else it saves. (Expected: P3 and P4 zero by construction if the dependency recording is complete; P5 and any policy missing negative dependencies will show nonzero. Finding a nonzero here is a result, not a failure of the test.)
- avoidable-recompute rate: recomputed although the answer did not change.
- hit rate by question kind and by how many commits since the conclusion was computed (a decay curve).
- compute avoided: recompute cost times hit rate. Plus tokens: each hit is priced at the tokens the scripted search would have read to re-derive it (about 695 per answer in the finished test) minus the tokens of the cached answer (about 31).
- fraction of invalidations caused by non-code files (docs, tests), to see how coarse the file-level policy is.

Add a deliberate stress set: pick commits that rename or move files, change only comments, change only tests, and change a signature, and check each class separately, because identity and negative-dependency errors will concentrate there.

Decision rule decided before running: if the best policy's hit rate on structured questions is under about 50 % beyond the one-commit horizon, or any safe policy gives up most of the hits, stop and record "caching conclusions does not pay at this repository's change rate". If it is high, go to Test 2.

### 5.3 Test 2: is any of it worth model tokens? (counterfactual accounting, still no model)
Using the 75 held-out commits, for each commit take the lookups the structured question kinds would need for the changed file (the same seed as the recall task) and ask, under policy P4, what fraction would have been cache hits from the previous 5 and 20 commits' conclusions. Multiply by per-lookup tokens. That gives an upper bound on saving. If the upper bound is a few hundred tokens per task against an agent session that spends hundreds of thousands, the idea cannot matter, whatever the hit rate (the harness research already measured long-lived window cost, not file reads, as the dominant token cost; see TOKEN-BOTTLENECK-2026-11.md).

### 5.4 Test 3, only if 5.2 and 5.3 are positive: a small agent pilot
Replay 24 to 30 past fix commits that carry tests (the previous research already counted 24 to 30), with matched arms: (a) agent with grep and file reading; (b) agent plus typed queries on the current snapshot with no cache; (c) agent plus cached conclusions invalidated by P4; (d) agent plus the same cached conclusions served with no invalidation, as the stale control. Seed arm (c) and (d) with conclusions computed several commits before the task. Measure tests passed, total tokens including the prompt-prefix re-reads, tool calls, and how often a stale conclusion was used. This copies the matched memory-off design of VibeMemBench. With n of about 30 the smallest detectable effect is large; report it as a pilot with intervals, not a verdict.

### 5.5 Rules to keep it honest (each from a failure in this section's evidence)
- The cache key includes extractor version, query-program version and, for any model-made conclusion, model and prompt version.
- Score stale returns as wrong, never as "found".
- The baseline is grep with the same budget, not full context (Zep and Mem0's choice) and not "no tool".
- Include the form of what the agent receives: VibeMemBench found most failures were in the form of the record.
- State the change rate: this repository's history is mostly June to August 2026 product work, 233 non-merge commits on main; a cache's value depends on how often inputs change, so say how many commits per week and report the hit-rate curve against age.
- Do not read the result as evidence about temporal graphs in general: it tests dependency-tracked caching on this repository.

---------------------------------------------------------------------------------------------------

## 6. What the finished test did and did not cover, as it bears on the owner's challenge

(Facts about the finished test come from the task description and from build-b/facts-NOTES.md; I did not re-run or re-read the result files.)
- It did use time: parent-commit snapshots (so no future leakage) and co-change edges from ancestor commits with a recency weight. It did not use validity intervals, a derived-fact cache, or any model-made conclusion.
- Its facts were deterministic, so none of the failure modes that dominate the TKG literature (LLM extraction errors, LLM contradiction calls, asynchronous ingestion) could appear, and none of the token costs of building a temporal graph.
- A full rebuild is cheap here (about 5 s, 4.1 MB per snapshot), so the engineering economy of an interval store (section 1.2) is also negligible at this size. It would matter at a repository thousands of times larger, which is Glean's case, not this one's.
- The strongest case for a temporal layer is the cached-conclusion primitive. That is untested here and untested in the published literature on code.

---------------------------------------------------------------------------------------------------

## 7. What I could not verify

- The Build Systems a la Carte paper text (PDF unreadable through the fetch tool). Definitions of early cutoff and trace types rest on the authors' slides and on Bazel, Salsa and rustc documentation. I did not read GHC's recompilation-avoidance documentation.
- The Mem0 re-run of Zep at 58.44 % and the original GitHub issue; both seen only in search-result summaries.
- Whether MemoryAgentBench's Zep, Mem0 and Cognee runs were configured as their vendors recommend; the paper does not say, and its recency encoding (serial numbers in the text) is not Zep's native timestamp path.
- The bodies of: DreamBench-SWE (stale-suppression design), KCoEvo, the two agent-memory surveys, CoCC, DocPrism, RepoAgent and DocAgent. Cited from abstracts or search summaries only.
- The VibeMemBench authors' independence from the four systems' vendors (not stated in what I read) and its remaining 19k characters.
- The star counts of the other tools at any date but today; star numbers in search results disagreed with the fetched README (graphify: 3.7k, 41.6k, 88k and 146.9k in different sources), so I report only the README figure as fetched.
- Any independent evaluation of Graphiti or Zep as a coding-agent memory. I searched once and found none; absence of search results is not proof of absence.
- Any controlled study that caches LLM-produced conclusions about code, invalidates by dependency, and measures agent tokens and success. I searched twice (extended mode) and found closest neighbours only (RepoAgent, DocAgent, ContextSniper, SWE Context Bench); I did not read RepoAgent's or DocAgent's invalidation logic.
- Per-kind token numbers of the finished test's structured questions (31 against 695 tokens is from the task description).
- Whether the instrumented dependency recording in section 5.2 is feasible in all three engines; it is specified for the in-memory reference only.
