## Parts
(Docs: BN = HARNESS-BOTTLENECKS, GT = GRAPH-TEST-RESULT, GV = GRAPH-V2-DESIGN, ER = embeddings COORDINATOR-REPORT, RD = RESEARCH-DIRECTION, MEM = memory notes)

### (a) Graph construction
1. Code-fact extractor (script, no model) | reads the repo's tracked files and writes typed facts (who imports/calls/defines what) | in: tracked source files at one commit | out: typed facts into the store | when: built ahead of time, per commit; BN says rebuild per worktree at query time (5 s for ~2,500 symbols) | status: built and measured | src: BN s6; GT "What was tested"
2. Parser name / language tooling | which parser is used is NOT STATED (BN says "a script with no model"; GV K asks owner to approve one Python and one TypeScript indexer for an extraction audit, not installed) | status: indexers designed only | src: GV K
3. First file-level connection graph | 618 files, 1,119 file-to-file code links (imports, 55 test mocks), 1,086 doc citations; 197 KB; 0.2 s build | in: FixFlow repo | out: JSON, one answer (~560 tokens for one file) | when: built once | status: built and measured, verdict WITHDRAWN by owner (weakest query, no ranking, no hops) | src: BN s6
4. Typed graph / typed store (v1 test) | ~2,500 symbols and 19+ edge kinds, rebuilt in 5 s, held as SQLite tables | in: parsed facts + git history | out: queried by ranker | when: built ahead / on rebuild | status: built and measured | src: BN s6; GT
5. Node kinds (v2 design) | runtime, slice, file, definition, test, fixture, entry point, table, column, setting, migration; plus module variables and exported object members (current graph has no node for them) | status: designed (partly built) | src: GV C
6. Edge kinds named across docs | imports/call edges (0 of 4,886 call edges by name were resolved: a defect), test mocks, doc citations, co-changed, route-to-client, outbox kind to handler, setting key, migration chain, table/column, constrains (rule to file), invariant/invariant_group; 35 relation types in tuning graphs, 36 in held-out. Full list NOT STATED | status: built | src: GV J(a); BN s6; project-harness-bottlenecks tail (rulings 96-99)
7. Contract layer | links where two runtimes must agree: route and client calls, outbox kind and handler, string keys, schema fields | in: code in 3 runtimes (backend, web, mobile) | out: edges for "what could this change break" | when: ahead | status: partly built (route/URL edges exist: 4,604 of 18,875 edges are routes, URLs, tables, settings, mocks); contract layer = trial | src: GV C, F; GT K
8. Document extractor + meaning layer, deterministic | turns plan/design docs into sections, items, rules, decisions keyed by heading path and content hash (not line number) | in: documents | out: document/section/item/rule nodes | when: ahead | status: designed only (build) | src: GV C, F
9. Change set as hyperedge | one node per commit/PR with its message; changed-together counts become a view of these sets | in: git history | out: change-set nodes | status: designed (build) | src: GV C, F
10. Model-read meaning layer (graphify's document layer) | a language model reads documents and extracts meaning | status: NOT run; "do not build model-extracted knowledge graph" | src: GT K, M; BN s6
11. Conclusion ledger | stores a conclusion with the premises (evidence, source) it rests on | status: designed only (build after the premise measure) | src: GV C, F
12. Citation resolution fact | checks that a file:line citation in a document still says what it claims | status: designed only | src: GV B, F
13. Identity over time | stable keys, rename/move lineage | status: designed only | src: GV C, F
14. Graphify (popular tool, code layer v0.9.108) | third-party code graph, run as an arm in a no-network container | status: tested, worse than typed store (-0.137 recall) | src: GT M
15. Corpus map (older testbed) | typed-edge map of 11 planning files in JSON lines, hash-based refresh, 3,361 records | status: built; validation never run; extraction recall 0.52 | src: BN 2.4
16. Context system (older testbed) | compaction steering, declared-state restore, lexical recall over transcripts; JSON, no graph | status: built, never installed/run live; 85 tests | src: BN 2.4
17. SQLite knowledge-store design (PR #183) | SQLite as rebuildable index over an append-only journal, validity by code state | status: designed only, unbuilt | src: BN 2.6, s6
18. Graph engines compared: SQLite (relational), LadybugDB (graph), DuckDB graph layer | alternative storage/query engines for the same facts | status: built and measured: identical answers | src: GT
19. Graph database server / Neo4j-style | do not build at this size | status: dropped | src: BN s6; GV G

### (b) What is embedded
20. KG embedding RotatE (E1) | learns a vector per graph node and relation from the graph's triples; used to score links | in: graph facts at a commit | out: scores fused with ranker | when: trained ahead per snapshot | status: tested, no gain | src: ER s2-3
21. ComplEx-N3 (E2) | same idea, different scoring form | status: tested, no gain (lower alone over all files) | src: ER
22. TransE (E3) | same, simplest form | status: tested, no gain | src: ER
23. CompGCN (E4, graph-neural encoder) | a neural net passes messages across graph neighbours to make vectors | status: tested, no gain | src: ER
24. Routed RotatE specialists (E5, owner's CureFound form) | one model per area (folders), a router picks two, results merged | status: tested, lower | src: ER s2, 4, 7
25. Placebo arm | random score fused same way, checks the harness | status: built (control) | src: ER
26. Text/code embeddings, embedding-search arm | vectors of source text | status: NOT tested (idea only; needs a model download, owner decision) | src: ER s7; GT next tests
27. Embedding index in outside studies | one 2026 study credits it over the graph | status: outside evidence only | src: BN s6

### (c) What is trained
28. KGE training (Stage A and B) | stage A: choose settings on held-out co-change pairs (MRR 0.68-0.75 vs PPR 0.28); stage B: 2,385 training units over 5 arms x settings x seeds | data: each tuning-parent commit's graph (largest 2,450 nodes, 7,585 facts, 116 commits; ~6 facts/node); held-out 70 parents (123 checkpoints) | hardware: RTX 5070 12 GB card, models <=512 dims used 0.3-2.6 GB, in Linux containers capped 2.5-4 GB (6 GB for held-out) | objective: link prediction on graph facts (mainly co-change); frozen choice E1, 256 dims, weight 1, 70 epochs; library PyKEEN 1.11.1 | status: built and measured | src: ER s2-6, 8; MEM tail
29. Learned rankers / rule miners | TLogic, AnyBURL, many-feature learned rankers | status: dropped/deferred (about 230 commits; 25 features tie 2) | src: GV G
30. Fine-tuned retrievers, pretraining across repos, graph adapters into an LLM, small local models (retrieval, rerank, compress, route, summarise) on the 12 GB card, fine-tune on recorded sessions | status: idea only (research lanes 3, 6) | src: RD s4

### (d) Ranking and fusion
31. Personalised (rooted) PageRank (PPR) | scores files by random-walk closeness to the changed seed file | status: built and measured | src: BN s6; ER
32. Co-change confidence (CO) | how regularly two files changed together in git history | status: built and measured | src: ER
33. Two-stage ranker / reciprocal-rank fusion (RRF, k=60) of PPR and CO | merges two ranked lists | status: built (simple ranker); "build last" in design | src: ER s2; GV F
34. Community prior (stored grouping added to PPR) | groups files in communities, adds prior | status: tested, no gain (+0.015) | src: GT 2
35. Hop-depth traversal + 2-hop order | hop count tested 1-6; unbounded hops best | status: built and measured | src: BN s6; GT 4
36. Value-density selection with stop; level of detail per node; since-view | pack the answer by value per token, stop early | status: trial | src: GV F
37. Token-budgeted answer packer (8,000 tokens) | fills answer to budget | status: built | src: GT
38. Keyword search arm (names, paths, headings) | strongest index-only arm; the one to beat | status: measured | src: GV B
39. Scripted search, changed-together floor, same-folder floor | baselines | status: built | src: GT
40. Leiden communities, GraphRAG community summaries, exact Steiner tree, PCST, reachability indexes (GRAIL), vertex reordering, incremental Datalog | status: dropped/cut/deferred at this size | src: GV F, G

### (e) How an agent queries it
41. Tool form: CLI (owner decision pending); output pulled as a tool result, never pushed into system prompt/CLAUDE.md | status: designed | src: GV K; BN s6
42. Session-start brief (brief operation) + competitors (orchestrator brief; heading/ID extraction) | one-shot orientation before first edit (55% of lookup tokens occur before first edit) | status: designed only | src: GV F, B
43. Edit-time warning hook | warns at edit time about impact | status: designed only | src: GV F
44. Task-context store (degree of interest) | keeps what the task has touched | status: designed only | src: GV F
45. Competency-question registry (CQ registry as data), quality card per build | list of questions the graph must answer; per-build report | status: designed (build first) | src: GV F
46. Query answers | e.g. impact of one file: ~560 tokens (18 direct dependants); typed answer final median 31 tokens | src: BN s6; GT 5
47. Description budget, output format | cap on text per node | status: measured here / designed | src: GV F
48. Model-written query languages, LLM-driven traversal | status: dropped | src: GV G
49. Touch-list (spatial list for a fix: changed functions, callers, importers, co-changed files, tests) | a script list attached to the reviewer's brief | status: idea only; unproven (drop if <6 of 10 cases fall inside, or list >15 files) | src: BN s6
50. Index replay (zero-token) | build import-and-caller index at each window's start commit, count lookup-only calls it answers | status: designed only | src: BN s6

### (f) Time
51. Temporal view of work state | slice status, verdicts, open findings, each with commit it became true and commit that superseded it, written by tools from git | status: designed only (generated files first, SQLite table later) | src: BN s6
52. Validity over the commit graph (code) / content hashes (documents), validity sets on stable keys | status: designed | src: GV C, G
53. Temporal knowledge graph for conversations (outside study) | cut context 115k to 1.6k tokens vs FULL context | status: outside evidence, not adopted | src: BN s6
54. Bitemporal stores, TLogic | status: dropped (pays at ~100x history) | src: GV G
55. Time-based expiry | status: dropped; invalidate by code change, never age | src: BN s6

### (g) Caching and invalidation
56. Memo of snapshots / validity sets / overlay | status: designed (infrastructure) | src: GV F
57. Deterministic-answer cache with 11 invalidation rules (none, TTL 5/20, file level, fact level with/without "nothing else" patterns, fields-read, early cutoff) | status: built and measured (replay 40,880 lookups) | src: GT L; GV E
58. Dependency recording with negative dependencies ("nothing else matches") | record what was absent, so a new relation invalidates | status: designed (build after premise measure) | src: GV F
59. Ledger revalidation | re-check model conclusions via recorded premises | status: designed only | src: GV F
60. Traversal cache | status: dropped (rebuild 25 ms vs 5.3 s extraction; cache conclusions instead) | src: GV G; BN s6
61. Self-evolving entries | written at solve time with the files they depend on; invalidated by code change; recurring lesson promoted to a check; hit/miss counts | status: idea only | src: BN s6
62. Reasoning-cache library (similarity-based reuse of solved problems) | owner's idea; reviewed in LIBRARY-PATHWAYS (not read) | status: idea only | src: MEM feedback-test-the-best-form
63. Model-made conclusion caching | status: NOT tested | src: GT K

### Research lanes (RD s4, all: designed only, no start without owner's go)
64. Lane 1 Where tokens/time/errors go | 65. Lane 2 Graphs and knowledge graphs in coding agents | 66. Lane 3 Learned encoders in strongest form | 67. Lane 4 Memory, knowledge layer, time, caching | 68. Lane 5 Neuro-symbolic methods | 69. Lane 6 Local card as cost lever | 70. Lane 7 Orchestration structure | 71. Lane 8 How to measure in general. (Each: designed only; src RD s4.)
72. Agent pilot (about 40 tasks) | the end-to-end test with an agent in the loop | status: designed only; needs 20-33% saving to detect | src: GV I, K; GT
73. Test set of real lookups | 4,829 recorded lookups, 10.6% replayable without leak | status: measured/built | src: GV B

## Flow
1. Build and keep fresh: repo (tracked files + git history) -> extractor script (no model) -> typed facts per commit (nodes/edges, contract edges) -> relational store (SQLite) -> graph rebuilt per worktree at query time (5 s) -> optional offline KGE training per snapshot (tested, not used) -> change by code edit invalidates cached answers at fact level (designed) -> documents indexed by content hash (designed).
2. Query: agent names a seed file/definition -> keyword/path entry -> typed traversal (hops, per-edge budget) -> rank (PPR + co-change, RRF) -> pack into 8,000-token answer -> returned as tool result -> if cached and fact-level rule says valid, reuse, else recompute. Agent-in-loop version NOT run.

## Loops
- Change in code -> fact-level compare -> cached answer kept or dropped (fact level: 0.0% wrong served).
- Tuning (65 commits) -> chosen settings -> frozen -> one held-out run (75 commits) -> verdict; hop depth moved recall 0.346.
- Self-evolving (designed): hit/miss counts decide what entries stay; recurring lesson -> deterministic check.
- Selection loop in embeddings: pick simplest model within one standard error; weights 0.25/0.5/1.
- Research: lanes -> leads -> test designs -> owner decision.

## Jargon
- Co-change: files edited together in the same commits.
- Personalised PageRank: random-walk score of closeness to a chosen start file.
- Reciprocal-rank fusion: merging ranked lists by adding 1/(k+rank) scores.
- Knowledge-graph embedding: vectors learned for nodes/relations so linked things score high.
- Temporal knowledge graph: graph where each fact has a time window of validity.
- Typed edge: a link with a named kind (imports, calls, route-to-client).
- Hop: one link step in a graph traversal.
- Recall: share of truly changed files the tool showed.
- P@10: share of top ten results that are correct.
- Held-out: test commits kept unseen until one final scoring.
- Placebo arm: random score used to check the test machinery.
- Fact-level invalidation: drop a cached answer only if a fact it read changed.
- Hyperedge: one link joining many nodes (a whole commit).
- Seed: the starting file of a query.
- Rooted: ranking walk restarted from the seed.
- RotatE/ComplEx/TransE: families of embedding models for link prediction.
- GNN (CompGCN): neural network that mixes neighbour information.
- Graphify: third-party code-knowledge-graph tool.

## Unclear
- Which parser builds the graph: NOT STATED.
- Full edge-kind list: not in one place ("19+" in BN; 35/36 relation types in memory notes).
- BN s6 says "no embeddings" while GV lists embeddings as "trial"; both cite the same null result.
- GV A5 counts "cut 5, deferred 3, trial 6" but part 44-names differ in GV F lists; counts match 43 parts only loosely.
- The temporal view is "designed only"; no validity-time fields are measured except the cache replay.
- Graph size inconsistent: ER s6 point 8 says head ~5,400 nodes/19,000 edges; verdicts used 2,450 nodes; BN says ~2,500 symbols.
- Library (reasoning cache) mechanism: how similarity matching works NOT STATED in my documents.
- Not covered by tests: an agent using any tool (none run); tokens in a session; other repositories; model-read documents; time validity of facts; model-made cached conclusions; text/code embeddings; temporal or inductive models; larger dimensions; longer history; routing on a graph too large for one model; context a change needed but did not edit (truth is files edited, not files read).
- Measured numbers: typed store vs scripted search +0.076 [+0.036,+0.118] recall at 8,000 tokens (mobile +0.151, rest +0.024); engines 0.000 diff; community prior +0.015; graphify 0.564 vs typed 0.700; embeddings best +0.0023 P@10 vs +0.02 asked; held-out simple ranker 0.2155 vs E1 fused 0.2181; cached answers: file-level 6.5% wrong vs fact-level 0.0%, 87.6% served; first test covered 1.8% of product lookup cost; fetched content ~27% of context tokens; hot files: 72 paths = half of fetched tokens.
