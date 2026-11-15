# Lane: strongest architecture for a knowledge layer (notes, 2026-11-13)

Scope. Design the strongest honest form of a knowledge layer for this repository and this agent harness, so that the next test does not handicap the idea; say which parts graphify and a temporal-graph library provide as shipped and which would be built here; name the arms of a fair wider test, what the finished test can lend it, and what is still open.

Method. I read the five research lanes of this round (`widen/lane-graphify.md`, `lane-temporal.md`, `lane-graphrag.md`, `lane-agents.md`, `lane-evaluation.md`), the finished test's record (`graph2/protocol.md`, `protocol-addendum-6.md`, `build-b/facts-NOTES.md`, `build-e/result.json`), the owner's goal documents (`docs/program/TOKEN-BOTTLENECK-2026-11.md`, `HARNESS-BOTTLENECKS-2026-11.md` §6 and §9, `LIBRARY-PATHWAYS-2026-11.md`), the repository `CLAUDE.md`, and the owner's earlier knowledge-store design (`docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md` at commit 6fba000, v1.3.1, read from git because it is not on this branch). I measured a few sizes in the repository myself; those are marked "my measurement". Arithmetic of mine is marked "my arithmetic". I did no web research of my own in this lane: every outside claim below comes from the five lane notes, which give the URL and how it was measured, and I repeat their strength rating. I ran nothing, installed nothing and changed no file except this one.

Strength labels as in the lanes: strong (independent, controlled), medium, weak (self-reported, anecdote, marketing).

---

## 0. The short answer, for a reader with no context

1. **What was tested.** The finished test used a typed property graph of the code built by parsers and git, with a small deterministic layer over the documents (document, section and invariant nodes; citation, mention and "constrains" edges) and time only as one snapshot per parent commit plus co-change edges with a recency weight. In the vocabulary the owner used: it was a graph, and by the loose definition a knowledge graph (typed entities, typed relations, a schema), but it was **not** a model-built semantic knowledge graph and **not** a temporal knowledge graph. It also had no cached conclusions, no orientation layer and no agent in the loop. Source: `build-b/facts-NOTES.md` (node and edge kinds), `protocol-addendum-6.md` items 19 to 22 (what it did not show).
2. **What graphify is.** The same family of object as the tested graph for code (a tree-sitter property graph, no model, zero tokens to build), plus a model-read layer over documents, Leiden clusters with a report file, and an always-on instruction block with optional hooks. It is not temporal, stores no summaries, and ranks by lexical seed match followed by breadth-first expansion. Its headline 71.5x is a ratio of two size estimates against reading the whole corpus, with no correctness check; its one agent number on code is 6 questions. Independent controlled tests found no gain on code questions for a strong model and a gain on document-versus-code questions. Stars measure attention. Source: `lane-graphify.md` sections 1, 3, 4 (weak for its own numbers; medium for the independent ones).
3. **Where the owner is right.** The finished test was narrow. It left out exactly the layers where the idea could pay: model-read meaning linked to code, validity over time for that meaning, cached conclusions with invalidation (his library idea), orientation, and an agent whose tokens are counted. The one independent positive result for graphify sits in the layer the test left out.
4. **Where he is not.** The popular tool's numbers are not evidence of an effect on code. A graph database does not store connections more compactly or answer differently than a relational store given the same facts (the three engines returned identical answers on 770 of 770 held-out tasks). Fast traversal and a cache over traversal save nothing here (all 477 dependency queries take about 1 ms together). And published temporal-graph results are conversation-memory scores against putting the whole conversation in context.
5. **Where our own earlier assumptions were weak.** Six of them, in section 3.3. The most important: the test scored "files the commit changed", which gives no credit for context that was needed but not edited, and the hottest reads in this harness's own sessions are design documents, not product code, so a code-only graph was aimed at the smaller target.
6. **The strongest form** is seven layers (section 4): a working-tree overlay, the existing structure graph with four upgrades, a meaning layer whose model-made claims are bound to code by a deterministic resolver, a time layer that gives every fact and claim a validity defined by commit ancestry and drives invalidation from the structure, a store of cached conclusions served only while their dependencies hold (the owner's knowledge-store design, given graph footprints), an orientation layer that is pulled rather than pushed, and a small command-line tool surface whose answers cite lines.
7. **What it can save, at most.** In this harness 97 % of tokens are re-reads of a window already there; the content fetched by reads and searches is about 23 to 27 % of context tokens; the fixed prefix is 47 % of FixFlow's tokens. A knowledge layer can cut the fetched share, the number of lookup steps, the cost of re-deriving conclusions, and the pushed prefix. It can also add to the prefix and add steps. Section 2 puts numbers on each.
8. **The fair test** runs an agent, includes graphify as shipped in two forms, includes a placebo tool and a non-graph index, tests each of our layers as a separately switchable arm, and tests invalidation with no model first. Section 7.

---

## 1. Names: what each system is

| System | Graph type | Built by | Meaning layer | Time | Cached conclusions | Orientation | Source |
|---|---|---|---|---|---|---|---|
| Finished test (this repo) | Typed property graph: 25+ node kinds (function 1,236; test 1,128; file 514; doc_section 452; column 439; ... invariant 20), 35+ edge kinds (calls 4,886; defines 3,548; co_changed 1,896; mentions 1,380; ... constrains 90) at the frozen commit | Parsers (Python `ast`, TypeScript compiler API), a docs extractor and git; zero model tokens; 4.5 to 7 s per build alone | Deterministic only: doc, section and invariant nodes; cites, mentions, constrains edges; 19 of 20 CLAUDE.md invariant bullets anchored to code | One snapshot per parent commit (190 builds, about 4.1 MB each); co-change from ancestors with weight 0.5^(age in days/30) | None | None | `build-b/facts-NOTES.md` (own measurement, strong) |
| graphify v0.9.108 | NetworkX property multigraph, node-link JSON, hyperedges in a side list, confidence labels per edge | tree-sitter for code (no model); a model reads every non-code file | Yes: concept and rationale nodes, doc-to-code edges, `semantically_similar_to` and similar | None. Cache invalidation per file by content hash | None stored (summaries RFC unmerged); `save-result` and `reflect` commands exist but I could not read what they do (graphify-bench says they were called zero times) | Leiden clusters, `GRAPH_REPORT.md`, CLAUDE.md block, advisory or strict hooks | `lane-graphify.md` §1, §2, §7 (read from source; strong for what it is) |
| Graphiti / Zep | Temporal property graph, bitemporal edges (valid and invalid time; created and expired time), episodes as provenance | A model extracts entities and facts from text episodes; Neo4j, FalkorDB or Neptune (Kuzu driver deprecated) | Yes, model-extracted | Yes: a small model decides which older facts a new fact contradicts and closes them | No | No | `lane-temporal.md` §1.1 (read from source; strong for what it is) |
| Microsoft GraphRAG and relatives | Entity graph plus community summaries | A model reads all text | Yes | No | Community summaries, built once | Global search over summaries | `lane-graphrag.md` §1 |
| Owner's knowledge-store design v1.3.1 | Not a graph: an append-only event journal plus a SQLite index of entries, handles, footprints and lookups | Agents write entries after a hard solve; tools fold events | Entries are solved problems, traps and "do not apply" rules | Record time from the journal; "as of" by folding a journal commit; validity by footprint digests and commit ancestry | Yes: this is its purpose; lazy invalidation with early cutoff; no time-based expiry | No | `KNOWLEDGE-STORE-DESIGN-2026-11.md` §0, §3, §5 (design only, nothing built) |

Two corrections of terms. First, "TKG" in one of the graph-retrieval papers means "textual knowledge graph", not temporal (`lane-graphrag.md`, arXiv 2503.04338). Second, the task description gives about 5,400 nodes and 16,500 typed edges for the frozen commit; the facts notes give 5,464 nodes and 18,875 edge rows (rows, not unique pairs, including 1,896 co-change rows). I could not tell which count the task description used.

---

## 2. Where the tokens go, and what a knowledge layer can touch

The owner's real goal is fewer tokens in his agent sessions. The measured facts, all from `TOKEN-BOTTLENECK-2026-11.md` (every API call in the transcripts of this PC; FixFlow 14 sessions, 1,153 agent transcripts, 14,647 calls, 2.13 billion context tokens; an independent re-measurement agreed within 0.3 %; strong, own measurement) and `HARNESS-BOTTLENECKS-2026-11.md` §6 (the testbed repository, November, 15,921 calls):

| Quantity | Value | Meaning for a knowledge layer |
|---|---|---|
| Cache reads as a share of context tokens | 94.9 % (FixFlow), 97.6 % (Clinic) | Token use is calls times window size. Speed of a store (milliseconds) does not enter the bill. |
| Fixed prefix re-read every call | 47 % of FixFlow's tokens; about 60k tokens per agent window, about 50k of it tool and connector schemas | Anything a layer pushes into the prefix (tool schemas, a pointer file, a bigger CLAUDE.md) is paid on every call. Anything it lets us remove from the prefix is saved on every call. |
| Content fetched by reads and searches | 22.5 % of FixFlow's context tokens (fill method); 26.9 to 28.5 % in the testbed | The ceiling for "fetch less". |
| Carrying | Fetched content entered windows once as about 19 million tokens and was processed about 950 million times, some 50 passes per token (testbed) | A shorter answer saves its size times the remaining calls in the window. |
| Lookup-only calls | 54.7 % of calls issued only read or search tools and re-read 43.6 % of context tokens (testbed); 64 % of calls, 55 % of tokens (FixFlow) | The ceiling for "fewer steps". Exposure, overlapping with the row above, not a saving. |
| Re-reads inside one window | 0.5 to 1.5 % | A session-local cache saves almost nothing. The re-reading is across sessions. |
| Hottest reads in FixFlow | The 30 most-read paths hold 7.1 % of all FixFlow tokens; the 15 documents among them hold 4.9 %. The top paths are the harness's own design documents: the knowledge-store design (31.1M tokens over 63 windows), the ship plan (15.8M over 286 windows), the harness-bottlenecks file (5.4M over 25 windows). The first product-code files are `attendance/geofence.ts` (2.8M over 35 windows) and `attendance/pingtracker.ts` (2.6M over 29). | `docs/program/evidence/token-spend/fill-fixflow/summary-out.txt` and `fill-result.json` field `top` (strong, own measurement; tokens counted with later re-reads). **In this harness the most re-read content is planning and design prose, not product code.** |
| Connection questions in searches | 13 to 14 of 200 sampled search-bearing calls (about 7 %, range about 4 to 11 %); none judged likely to save a step | `HARNESS-BOTTLENECKS` §6, testbed sample, two readers. Medium; another codebase. |
| Re-derivation that was avoided | A later design reused a stored design that had cost about 15M helper tokens | `LIBRARY-PATHWAYS-2026-11.md` §6, case f07-4 [M]. One case, chosen, not a rate. |

My arithmetic on the prefix, using FixFlow's 14,647 calls and 4 characters per token (the convention of these records). These are exposures, not savings, and assume the file sat in every call at today's size, which I did not verify:

- `CLAUDE.md` is 29,605 bytes, about 7,400 tokens (my measurement). In every call: about 108 million tokens, about 5.1 % of FixFlow's context tokens. I have evidence that subagents receive it too: it is in this agent's own context.
- The memory index `MEMORY.md` is 5,156 bytes, about 1,300 tokens: about 19 million tokens, about 0.9 %.
- A 500-token pointer file costs about 7.3 million tokens, about 0.34 %. Each 1,000 tokens of tool schema added to every window costs about 14.6 million tokens, about 0.7 %. A tool server with ten tools at 150 to 300 tokens each (a guess; I measured no schema) would cost about 1 to 2 %.

**What follows.** A knowledge layer has four ways to save and three ways to cost:

| Saves by | Ceiling here | Costs by |
|---|---|---|
| (i) Returning fewer tokens than the read it replaces, which then rides along about 50 times | Fetched content 22.5 to 28.5 %; hot design documents 4.9 % | (v) Its own prefix: schemas and pointer, every call |
| (ii) Removing lookup-only steps, each a full window re-read | Exposure 43.6 to 55 %, overlapping (i) | (vi) Extra steps: query the graph, then still open the file. Independent tests saw this (`lane-graphify.md` §4: 82 % of nodes with no source line made agents re-read) |
| (iii) Not re-deriving a conclusion that is still valid | Unmeasured as a rate; single cases of millions of tokens | (vii) Stale or wrong answers that cause rework |
| (iv) Letting pushed text become pulled text | CLAUDE.md about 5 % (my arithmetic, exposure) | |

None of these touches the two largest levers in the token report, capping the orchestrator window (39 to 74 % of cache-read tokens sit in calls past 200k) and stripping the subagent prefix. A knowledge layer is at best the third or fourth lever. That should be said with any result.

---

## 3. The owner's challenge, point by point

### 3.1 Where he is right

- **The test was narrow in architecture.** No model-read meaning, no doc-to-code semantic edges beyond citations and identifier mentions, no cached conclusions, no orientation layer, no always-on pointer, no agent. Addendum 6 items 19 to 22 say so. The graphify lane (§6) lists exactly these as what graphify adds; the temporal lane (§6) says the cached-conclusion primitive is "untested here and untested in the published literature on code".
- **His library idea is the part with a mechanism for large savings.** Caching only pays when the thing cached is expensive to derive. The tested facts cost zero model tokens and about 5 s to rebuild, so there was nothing to cache. Model-derived conclusions can cost millions of tokens (f07-4 above).
- **The one independent positive result for graphify is in the untested layer.** graphify-bench (independent author, 940 Claude Code runs, 105 tasks, one synthetic codebase, transcripts published; medium): on document-and-code questions with Sonnet 5, 80 % against 70 %, cost lower by 0.084 USD [interval -0.180, -0.005]; in a planted doc-versus-code contradiction hunt, 4 of 4 found (F1 0.94) against 2 of 4 (0.68). On code-only tasks with the same model, no measurable change (tokens +32k [-8k, +75k]; accuracy 78 % against 84 %).
- **The data structure, hop count and algorithm matter.** They did, measurably: 1, 2 and 3 hops of import neighbours reach recall 0.38, 0.72 and 0.87 at precision 0.32, 0.11 and 0.06; ranking moved precision at ten from 0.19 to 0.28 (`HARNESS-BOTTLENECKS` §6, research round; medium, 45 test commits). The typed store beat scripted search by +0.076 recall [+0.036, +0.118] on 75 held-out commits (`build-e/result.json`, H3; strong as a measurement, scope noted below).

### 3.2 Where he is not

- **Stars are adoption.** graphify has 146,932 stars (GitHub API, 2026-11-13) and an organisation that sells a hosted product; none of that is an effect size. Its 71.5x divides an estimate of the whole 52-file corpus (about 123,488 tokens, mostly five PDFs) by the average size of five graph answers (about 1,726 tokens), with no grading; code-only on the same corpus it is 8.8x; a contributor's fix to the counting was never re-run on that corpus (`lane-graphify.md` §3.1; weak). On 177 SWE-bench Lite issues its query put the right file first in 25 % of cases against 32 % for BM25 (issue 4341; medium).
- **"A graph database stores semantic relations in a small size compared to relational."** Size comes from storing connections instead of contents, which any store does: the first test's file graph was 197 KB as JSON and the same edges in SQLite took the same space (`HARNESS-BOTTLENECKS` §6). Given the same facts and method, SQLite, LadybugDB and DuckDB with DuckPGQ returned identical shown answers on 770 of 770 held-out tasks (addendum 6 item 5; strong). The engine decides which algorithms are native and the effort to write them, not the answer. The timing run (H5) has not reported, so engine speed and size here are still unmeasured.
- **"Caching on top so we don't traverse unnecessary nodes."** Traversal is not the cost. All 477 "what depends on this file" queries took about 1 ms together (`HARNESS-BOTTLENECKS` §6). What costs is the tokens an answer adds to a window and the calls it takes to get it.
- **Temporal knowledge graphs as evidence.** The Zep paper's 115k-to-1.6k context cut is against the whole conversation in context, by the vendor (weak to medium); the vendors dispute each other's numbers; the one independent benchmark of contradictory updates, MemoryAgentBench, put Zep last on single-hop fact consolidation (7 %, against 60 % for GPT-4o with the whole context; medium, with configuration caveats). No study of temporal graphs for coding agents was found by any lane.
- **"Our experiments are all failing."** The finished test did not fail. It answered narrow questions: engine does not change the answer (equivalent); a stored community prior on personalised PageRank gave +0.015 [-0.010, +0.042] (no gain of 0.05 or more); a typed store beat scripted search on change completion (better, but only on mobile-app seeds, +0.151; not distinguishable from zero on backend and web seeds). On code-reading questions the typed answer was about 31 tokens against about 695 read by scripted search, F1 0.745 against 0.645, interval [-0.060, +0.257], inconclusive by the pre-declared rule (`build-e/result.json` grade:heldout `tq`, `headline`). Addendum 6 item 9 forbids reporting this as "graphs add nothing".

### 3.3 Where our own earlier assumptions were weak

1. **The label.** T1 scored recall of the files and definitions the commit changed. Context that was needed but not edited (the caller that must not break, the contract, the invariant) earned nothing. The evaluation lane notes that agents' own logged reads miss all gold files on 27 to 35 % of samples, so reads are a poor label too; it proposes five label sources (`lane-evaluation.md` D1 layer 2).
2. **The target.** The structure graph was aimed at product code. The measured hottest reads in FixFlow sessions are design and planning documents (section 2). The testbed's recorded lookups were 106 of 181 programme documents against 26 product code (`lane-evaluation.md` D3).
3. **The question side's own cost was uncounted.** The 31-token answers came from per-kind query programs written by people; an agent must discover the schema and write the query. Addendum 6 item 14 names this as not counted.
4. **The verdict on the first quick test assumed connection questions are rare.** About 7 % of sampled searches were connection questions, and that sample came from the other codebase (`HARNESS-BOTTLENECKS` §6). It is a reason to be modest about the structure layer alone, not about meaning or cached conclusions.
5. **"Do not build a model-extracted knowledge graph" was carried forward from code-graph evidence.** That evidence (parsers beat models on call graphs; LLM graphs cost about a thousand times vector indexing on prose) is about syntactic relations and whole-corpus extraction. It says nothing about model-read invariants, decisions and rationale bound to code by a resolver, which no parser can produce (`lane-graphrag.md`, finding on arXiv 2601.08773: the excluding study is 45 questions, one author, one repository carrying the whole effect; weak).
6. **The containers mounted the live working tree with full git history.** Arm code exported the parent only, and a re-check on 10 tasks found no leak, but the control was code discipline, not isolation (addendum 6 item 7). A model-built layer would be far more exposed to this.

---

## 4. The architecture, layer by layer

The idea in one paragraph. Keep facts deterministic wherever a parser or git can produce them. Let a model read only what a parser cannot (prose, decisions, reasons, rules), and bind every model-made claim to code through a deterministic resolver, so a claim without a resolved anchor is visibly unanchored. Give every fact, claim and conclusion a validity defined by commit ancestry and by the hashes of what it rests on, so invalidation is driven by the structure, never by age and never by a model judging freshness. Cache only what is expensive to derive. Pull, do not push, except a small stable pointer and event-driven warnings. Every answer cites `path:line` so the agent reads only located lines.

```
           agent (Claude Code session or subagent)
               |  pointer file (pushed, stable, <= ~500 tokens)
               v
   L6 tools:  find  neighbors  impact  rules  explain  changed  recall  record   (one CLI via Bash)
               |
   L5 orientation: slice cards, invariant index, diff-triggered warnings (pulled or event-pushed)
   L4 cached conclusions: entries with footprints, served while valid (knowledge-store journal)
   L3 time: validity by ancestry + span hashes; structure diff drives invalidation; early cutoff
   L2 meaning: 2a deterministic doc layer (exists) | 2b model-read claims, resolver-bound to L1
   L1 structure: typed property graph (exists) + line anchors, span hashes, negative-dep index, lexical entry
   L0 substrate: facts per (commit, extractor version) + working-tree overlay (Glean-style stacking)
```

### L0. Substrate: snapshots and a working-tree overlay

- **Holds.** The facts of each commit, keyed by commit SHA and extractor version (already so: `build-b/facts-NOTES.md`, extractor version 59da7b753a4d908e, byte-identical rebuilds). Plus an overlay for the agent's uncommitted working tree: the changed and untracked files are re-extracted and their units hide the base's units, so nothing visible points into a hidden unit.
- **How built.** Git and the existing extractor. The overlay follows Meta's Glean "stacked database" design (facts labelled by unit, an incremental database hides changed units, ownership propagates; `lane-temporal.md` §2.4).
- **Saves.** Nothing by itself. It is what makes every other layer correct while an agent is editing. `HARNESS-BOTTLENECKS` §6 records that agents work in five worktrees with uncommitted and untracked files; a store keyed only to commits is stale the moment an agent edits.
- **Cost.** A full rebuild is 4.5 to 7 s alone, 5.3 s median at three concurrent; 4.1 MB per commit (own measurement). A per-file overlay is cheaper; not measured.
- **Evidence.** Glean: about 2 to 3 % indexing overhead for Python, about 7 % larger database, typical queries under 10 % slower (Meta's own figures; strong as engineering description, no agent tokens). Cursor re-embeds only chunks under changed Merkle branches (vendor post).
- **Risk.** Cross-runtime facts (a client URL literal to a backend route) join across programs; a one-file overlay must re-run the join, not only the file's parser. Rename identity (below, L3).

### L1. Structure: the typed code graph that exists, with four upgrades

- **Holds.** What it holds now: functions, methods, classes, tests, files, routes, tables, columns, settings, migrations, screens, outbox kinds, scheduled jobs, slices; calls, imports, defines, inherits, overrides, mocks, client-URL-to-route calls, test-to-route calls, table reads and writes, column writes, setting reads, foreign keys, migration order, enqueues and handlers, screen navigation, co-change. Upgrades for the strongest form:
  1. **A line anchor on every node and every edge** (`evidence_path`, `evidence_line` exist on edges; nodes have `line_start` and `line_end`). The answer format must print them. graphify's independent users re-read files because 82 % of nodes had no source line (`lane-graphify.md` §7).
  2. **A content hash per symbol span** (the knowledge-store design's `symbol_span` item, deferred there to its phase KS-6b). This is what lets L3 and L4 invalidate a conclusion when the function it rests on changes, and not when a comment elsewhere in the file changes.
  3. **A negative-dependency index.** An answer such as "nothing else writes table X" depends on the absence of edges anywhere. Record it as a dependency on an index node "in-edges of kind `writes_table` into X", so any added writer invalidates it (`lane-temporal.md` §3.2, citing Skyframe's warning that unregistered dependencies cause incorrect incremental builds).
  4. **A lexical entry point** (full-text search over names, signatures, docstrings and doc sections, with BM25 ranking, inside SQLite FTS5). The entry point mattered more than traversal in LocAgent's ablation (removing the search tool cost 19 points of file accuracy at 5, removing traversal about 2; medium) and in the 170,500-episode pre-registered study, where an embedding index carried the gain and graph tools added little on top (medium to strong; small open models, Python). An embedding entry point is a separate, switchable arm, because it needs a model download and the owner earlier listed embeddings under "do not build" (`HARNESS-BOTTLENECKS` §6).
- **Algorithms, by question kind.** Typed path queries for chains (a phone screen to the tables it ends up writing is 7 to 9 typed hops; a typed path returns 4 tables where an untyped search returns 254 nodes; `HARNESS-BOTTLENECKS` §6). Reverse reachability with a budget per edge kind for impact. Personalised PageRank seeded on the changed nodes with a co-change prior for ranking. Hop count chosen per edge kind, not one global limit. Clusters: the repository's own slices (twelve backend slices mirrored in web and mobile, `CLAUDE.md` "Where things live"), not Leiden; Leiden only as a diagnostic, because community detection can produce communities a degree-preserving null cannot tell from noise (`lane-graphrag.md`, phantom-communities repository; weak).
- **Store.** SQLite. The finished test showed three engines give identical answers on this repository's facts; the remaining engine question is speed and effort, which H5 has not reported.
- **Saves.** Steps and fetched tokens on connection, impact and chain questions: a typed answer of about 31 tokens (median; 40 on the 23 untouched questions) where scripted search read about 695 (819) tokens (`build-e/result.json`, `tq`). That is answer size, not session tokens.
- **Cost.** Zero model tokens. Seconds per build. The upgrades are extractor work.
- **Evidence.** Own: +0.076 recall over scripted search, mobile seeds only; question F1 inconclusive. Outside: a frontier agent with map-based tools cut tokens 17 to 39 % mainly by displacing file reads, with success about flat, and raised tokens on test writing (arXiv 2611.07286; medium; Haiku 4.5; a hook forced one map query before reads, so steering is confounded). Codebase-Memory: about 10x fewer tokens per question but quality 0.83 against 0.92 for a file-reading agent (authors grading; weak to medium). Frontier agent with agentic grep against an index: not significantly different (p = 0.08 to 0.09; vendor-authored; medium-weak).
- **Risk.** It answers questions sessions rarely ask (about 7 % of sampled searches). Hubs: 73 % of code commits touch a file whose reach is over 15 files, so impact lists need grouping and caps (`HARNESS-BOTTLENECKS` §6). 11.2 % of held-out reference definitions had no node (`build-e/result.json` limits).

### L2. Meaning: what the code is for and what must not break

Two sub-layers, because one exists and costs nothing and the other costs model tokens.

**L2a, deterministic (exists).** Doc, section and doc-id nodes; `cites` edges from markdown links and backticked paths (529); `mentions` of identifiers (1,380, of which 1,054 low confidence); invariant nodes for the 20 CLAUDE.md invariant bullets with 90 `constrains` anchors (`build-b/facts-NOTES.md`). Upgrade: a validity check on every citation, closed when its target no longer resolves. Today 517 of 1,268 backticked file names in the docs do not resolve (`graph2/research/critic.txt`), so a doc-linked layer would otherwise serve stale citations with confidence.

**L2b, model-read claims (new).**

- **Holds.** Typed claims read from prose: `invariant`, `decision`, `rationale` (the reason a decision was made), `rejected_alternative` (with its reason), `hazard` (a trap and its trigger), `contract` (a cross-runtime agreement such as the 409 `detail` text three clients parse), `procedure` (deploy steps), `open_defect` (for example the "KNOWN DEFECT, UNFIXED" outbox race in `CLAUDE.md`). Each claim has a statement of at most about 40 words, a polarity (must, must not, may), a scope (runtime, slice), its source span (section id, line range, blob hash), and anchors written as they appear in the text. Edges: `constrains` and `explains` (claim to code), `supersedes` and `contradicts` (claim to claim, as candidates), `rejected_because`.
- **How built.** A model reads each document section, commit message and pull-request body once, and returns the claims in a fixed schema (structured output). A **deterministic resolver** then binds each written anchor to a structure node, with the rules the docs extractor already uses for invariant tokens (generic names accepted only when the named files narrow them to one definition; owner-field forms; `facts-NOTES.md` §e). An anchor that does not resolve stays raw and is shown as unanchored. This is the repository's own "C7 raw plus resolved" pattern (`CLAUDE.md`: free-text intake stays in `*_raw` columns beside the resolved key). The model never creates a code edge on its own say-so. Cache key: section blob hash, model id, prompt hash. Claim ids are derived from the source span hash and the normalised statement, so a re-extraction does not churn every id (graphify's open issue #3004 reports 0 to 12 % node-id retention on re-extracting the same document, because extraction is non-deterministic and replacement deletes old nodes first; user report, weak).
- **Saves.** Two mechanisms. (a) "Which rule applies to what I am about to change, and why" answered in a few hundred tokens with cited lines, instead of reading a 41 KB handoff document or a 44 KB code map. (b) Pushed text can become pulled text: the "why" paragraphs of `CLAUDE.md` (about 7,400 tokens in every call, my arithmetic above) could be served by a `rules` tool while the one-line rules stay pushed. Mechanism (b) is the largest number in this whole design and also the riskiest (L5).
- **Cost.** One model read of the in-scope prose per build plus the prompt and output. My measurement: the 29 tracked markdown files outside `docs/program/` hold 73,398 words, about 98,000 tokens at four-thirds of a token per word; all commit messages hold 38,941 words, about 52,000 tokens. graphify-bench paid about 7 USD of Sonnet calls for 139 markdown files of 261k words (independent; medium); scaling by words gives roughly 2 USD for the product docs (my arithmetic; weak). After the first build only changed sections are re-read. The harness's own programme documents (`docs/program/`, where the hottest reads are) are much larger and partly untracked (121 untracked markdown files at this moment); including them is a scope decision, and their untracked state makes a commit-keyed build impossible for them today.
- **Evidence.** For: graphify-bench doc-and-code questions and contradiction hunt (above; medium). GraphRAG-style summaries help on whole-corpus sensemaking questions but the judging protocol is biased: a method compared with itself scored 90 % against 10 % by answer order, and corrected LightRAG gains fell from 66.70 % to 39.06 % (arXiv 2506.06331; medium to strong). Against: LLM-written repository context files changed SWE-bench resolution by -0.5 % and -2 % (not significant) and raised cost about 20 to 23 % (significant) (ETH study, arXiv 2602.11988; medium to strong); free reuse of model summaries scored 22.22 % against 26.26 % with no experience (SWE Context Bench; medium). Plain retrieval ties or beats graph methods on single-fact questions in every independent benchmark read (`lane-graphrag.md`; strong). Static analysers beat 24 LLMs on call-graph generation (arXiv 2410.00603; medium to strong), which is why L2b never makes code edges.
- **Risk.** Extraction errors persist once written and later claims attach to them (`lane-temporal.md` §3.3). Documents are partly wrong (517 stale citations). Prose describes later fixes, so a build from the live tree leaks answers into any replay (`lane-evaluation.md` L1). Push risk: an invariant moved out of the pushed file is only seen if something triggers a lookup (`LIBRARY-PATHWAYS` LIM-03, "nothing fails, so no lookup starts": 21 cases in 5 families, the most-cited limitation).

### L3. Time: validity by ancestry, invalidation driven by the structure

- **Holds.** For every structure fact and every L2b claim: the commit at which it appeared and the commit at which it stopped holding, by stable identity. For every claim and every L4 conclusion: a dependency set (node ids with their span hashes; edge-set digests for negative dependencies; the source span of the prose) and a status (valid, suspect, invalid). Two time axes: valid time (which commits it holds at) and record time (when the store learned it), as in Graphiti, with record time taken from the knowledge-store journal.
- **Why not intervals.** Commits form a graph with branches and merges, so "valid from A until B" is a set: holds at commit K when A is an ancestor of K and B is not. That is the knowledge-store design's `applies_while` rule (`git merge-base --is-ancestor`, with a `git patch-id` fallback for cherry-picks; KS design §3.2). Graphiti's linear timestamps do not fit this (`lane-temporal.md` §1.2).
- **How built.** By diffing consecutive snapshots' facts by stable id, with git rename detection plus signature similarity for identity across moves (heuristic; the hard part). No model. Invalidation policy is the build-systems one: when a dependency's hash changes, mark dependents suspect; re-run the cheap deterministic check (the anchor still resolves, the signature is unchanged, the structural query the conclusion cites returns the same answer); if equal, re-stamp and stop propagation (early cutoff, as in Bazel Skyframe change pruning, Salsa backdating and rustc red-green); if not, mark invalid until re-derived. For model-made claims, a changed anchor means suspect, never false: the claim may still hold.
- **Saves.** Directly, two things. (a) It is what lets L2b and L4 be served at all without serving stale content. (b) "What changed near X since commit K" lets a resuming agent read a delta instead of re-reading a document or a file whole. No source measured (b).
- **Cost.** No model tokens. Seconds per commit. Storage is smaller than 190 snapshots (778 MB) but at this size that economy is negligible (`lane-temporal.md` §6).
- **Evidence.** For the mechanism: build systems and Glean (strong as engineering; no token evidence). MemStrata's deterministic supersession on triples: accuracy 0.91 against 0.57 to 0.59 for plain retrieval, with plain retrieval serving the superseded value 36 to 38 % of the time (single author; facts already in triple form; weak). Against model-decided invalidation: MemoryAgentBench FactConsolidation multi-hop at most 7 % for every method, Zep 7 % single-hop (medium). Graphiti invalidation is a small model choosing contradictions among embedding-similar candidates, with no semantic check afterwards (read in source; strong for what it does, nothing on accuracy).
- **Risk.** Identity errors across renames split or merge histories; not measured for code by anyone found. Too-fine invalidation (a conclusion that silently depends on something unrecorded) serves stale answers; too-coarse invalidation throws away the hits. Dependency recording is specified only for the in-memory reference arm so far (`lane-temporal.md` could-not-verify).

### L4. Cached conclusions: the owner's library

- **Holds.** Verified answers and analyses, each stored with: the question in the words a searcher would use; the answer; the evidence spans; the dependency set from L3 (now graph-derived: the symbol spans it rests on, their typed neighbours that the conclusion's reasoning crossed, negative dependencies); the producer (model, prompt version, session); the tokens the original derivation cost; and a status. Kinds: solved problems, traps and "do not apply" rules (the knowledge-store design's kinds), plus impact analyses, explanations of how a flow works, design decisions with their reasons, and slice summaries.
- **How built.** Write-through at solve time by the strong model (the design's `ks record`), with a reviewer's refutation before an entry is served as a lead (design §0). Lazy invalidation with early cutoff at lookup and at phase close (design §5.2), now fed by graph footprints. Served only after its own check passes on the current code for actionable entries (design rule 2).
- **What the graph adds to the existing design.** The design states its own blind spot: "Semantic changes outside the footprint" are not detected, footprints are whole-file blobs until KS-6b, and a new reference to a guarded identifier is caught only when an author named that identifier (design §5.5). The structure layer gives symbol spans, typed neighbours and negative dependencies, which is exactly the "dependency case" the evaluation lane calls the only place a graph can earn its keep in caching: a claim whose answer changed while its own anchors did not (`lane-evaluation.md` D4).
- **Saves.** Mechanism (iii): a re-derivation not paid. The upper bound is the derivation cost of the entries that come back, which is unmeasured as a rate; single cases run to millions of tokens (f07-4: about 15M helper tokens). The library-pathways model, with mostly guessed inputs, puts the library at 1.03 times the cost of the cheap-model ladder at middle values, and 0.82 only when much work comes back, reach is high and entries are good (`LIBRARY-PATHWAYS` §3; [G], a model of the mechanism, not a forecast).
- **Cost.** About 10 to 20 minutes of the solving session per hard problem recorded (design §0, inferred); one command per lookup, capped at 2,000 characters; a reviewer pass.
- **Evidence.** Mostly negative or flat on code. VibeMemBench (111 targets, 90 repositories, executable tests): 11 of 12 pairings of solver and memory system did not beat memory off, and 160 of 231 failures were in the form of the stored record (medium to strong). SWE Context Bench (99 related tasks): oracle summary reuse 34.34 % against 26.26 % with none, free reuse 22.22 % (medium): selection is everything. The design's own 59 walked cases break most at match (26 breaks), use (31), check (38) and afterlife (29) (`LIBRARY-PATHWAYS` §4; chosen cases, not rates). No controlled study caches model-made conclusions about code, invalidates them by dependency, and measures tokens and success (`lane-temporal.md` summary).
- **Risk.** The trigger problem (LIM-03), entry quality (22 limitations), stale service. Staleness of a cached analysis that a later fix silently changed (LIM-60). Private details travelling with entries (LIM-68).

### L5. Orientation: what an agent sees before it asks

- **Holds.** (a) A pointer file, pushed, at most about 500 tokens, stable across commits: which tools exist, when to call them, and that answers cite lines. Nothing generated per commit goes in the pushed prefix, because a changed prefix invalidates the prompt cache of every window (`HARNESS-BOTTLENECKS` §6). (b) Slice cards, pulled: for each slice and runtime, its entry points, routes, tables, settings, outbox kinds, the invariants that constrain it, its strongest co-change partners and open defects, at most about 800 tokens. The skeleton is deterministic from L1 and L2a; an optional model paragraph is an L4 conclusion with its own footprint. (c) Event-driven warnings: when an agent's edit or diff touches a node that a `constrains` edge anchors, print that invariant's one line and its source line. This is the knowledge-store design's `ks lookup --diff`, moved to edit time.
- **How built.** Generators over L1 to L4. A hook for (c), on Claude Code's pre- or post-edit events.
- **Saves.** Mechanism (iv) and fewer orientation reads. The largest candidate is a restructured CLAUDE.md: keep the rules as one-liners in the pushed file and serve the reasons by `rules`. If half of its about 7,400 tokens moved, the exposure figure is about 54 million tokens, about 2.5 % of FixFlow's context tokens (my arithmetic, exposure, assuming every call carried it).
- **Evidence.** ETH: repository overviews did not help agents find files, and LLM-written context files raised cost about 20 % (medium to strong). graphify's report and always-on block: no independent measurement of their effect; agents ignored advisory text often (0 graph calls in one 60-session audit; grep outnumbered graph calls 46 to 18 in another; weak). Diff warnings: under the knowledge-store design's v1.3 rule 48.7 % of the 154 first-parent commits on main would have warned, which the refuters fixed with a narrower rule (KS design commit message 6fba000; own measurement).
- **Risk.** Moving rules from push to pull is the single biggest risk in the design: CLAUDE.md exists because its traps were each paid for, and an agent that does not know a rule exists does not ask for it. Changing CLAUDE.md is the owner's decision; in a test it is an arm, never a change to the file. A chatty hook trains agents to ignore it.

### L6. Tools: what an agent calls, and what each returns

One command-line program called through Bash, so its schema costs nothing in the prefix beyond the pointer; a tool server with schemas is a separate factor to test (section 2: each 1,000 tokens of schema in every window is about 0.7 % of FixFlow's tokens). Every answer: typed items with `path:line`, grouped, capped, with a "more available" count and an explicit "unknown" or "unanchored" where the store cannot answer. Caps are design targets, to be measured.

| Tool | Returns | Target cap (tokens) | Layers | Closest shipped analogue |
|---|---|---|---|---|
| `find <words>` | Ranked symbols, routes, tables, settings, doc sections with `path:line` and signature | 300 to 600 | L1, L2a | graphify `query` seeds; LocAgent SearchEntity |
| `neighbors <id> [kinds] [hops]` | Typed neighbours, ranked by personalised PageRank with co-change prior, per-kind budget | 500 to 1,500 | L1 | graphify `get_neighbors` (breadth-first, unranked) |
| `impact <files or diff>` | What else must change or may break: callers across contracts (routes, tables, settings, outbox kinds), the tests that touch them, the invariants anchored there, grouped by slice | 800 to 2,000 | L1, L2, L3 | graphify `affected` (call, import, inherit, reference edges only) |
| `rules <path, symbol or diff>` | Claims that constrain these nodes, with polarity, source line and status | 100 to 500 | L2, L3 | none |
| `explain <id>` | A valid L4 conclusion if one exists, else a deterministic card (signature, callers count, contracts, rules) | 200 to 800 | L1 to L4 | graphify `explain` |
| `changed <id or slice> --since <commit>` | Facts and claims opened or closed since that commit | 200 to 800 | L3 | none |
| `recall <symptom or action words>` | Library lookup, with the entry's check run first | 2,000 characters (design cap) | L4 | knowledge-store `ks lookup`, `ks verify` |
| `record ...` | Write-through of a conclusion with its evidence and footprint | n/a | L4 | `ks record` |

### Who provides which layer

| Layer | graphify as shipped | A temporal-graph library (Graphiti) | Owner's knowledge-store design | Built here |
|---|---|---|---|---|
| L0 overlay | Per-file content-hash cache; post-commit hook re-parses changed code; documents need a manual update | No | Working-tree blob hashes at lookup (design §5.2) | Unit-level overlay over the facts |
| L1 structure | Yes, about 40 languages; lacks co-change (open pull request only), route-call and setting edges as separate kinds; table read and write edges unverified | No | No | Exists; four upgrades |
| L2a deterministic doc layer | Citations and rationale comments by parser | No | Doc anchors with blob hashes | Exists; add citation validity |
| L2b model-read claims | Yes (concepts, rationale, doc-to-code edges) but model edges straight into the graph, ids churn on re-extraction | Yes (entities and facts from episodes) | Entries are written by agents, not extracted | Typed claims, resolver-bound |
| L3 time | No | Bitemporal model, linear time, model-decided invalidation | Ancestry validity, footprints, early cutoff, as-of by folding | Structure-driven invalidation over the DAG |
| L4 cached conclusions | No (summaries RFC unmerged; `save-result`, `reflect` unread) | No | Yes, specified in full, not built | Design plus graph footprints |
| L5 orientation | Report, communities, CLAUDE.md block, hooks | No | Pull-only by rule; diff check | Pointer, slice cards, edit-time warnings |
| L6 tools | CLI and a tool server with 10 tools | Python library, needs a graph database server and a model with structured output | `ks` CLI | One CLI |

Graphiti is not a good fit for this repository as a component: it needs a graph database server on a PC that is short of memory, its time model is linear, and its invalidation is a model judgment where this repository can get a deterministic one. Its data model (two time axes, episodes as provenance) is worth copying, and the knowledge-store journal already supplies most of it.

---

## 5. Rules that cut across the layers

1. Facts from parsers and git; models only for prose; a model's claim reaches code only through the resolver.
2. Every cached item carries its dependency set, including negative dependencies, and its producer key (extractor version, query-program version, model, prompt).
3. Invalidation by events, never by age; early cutoff by recomputing the cheap part and comparing.
4. A stale return counts as wrong, in production and in every test.
5. Pull by default; push only a stable pointer and event-driven one-line warnings.
6. Every answer cites lines and says "unknown" when it does not know; fewer tokens with a missing prerequisite is not a win (the A6-10 rule, `HARNESS-BOTTLENECKS` §6).
7. Build per parent from `git archive` with no history, sequentially for model-read layers, never from the live tree.

---

## 6. What the architecture predicts, so the test can refute it

Stated before any arm runs, so a result can contradict it:

- L1 alone: fewer lookup steps and fewer fetched tokens on connection and impact questions; little change on session tokens (connection questions are about 7 % of searches); possible loss on edit and test-writing tasks (published: tokens up on test generation).
- L2b plus `rules`: better on doc-versus-code and "which rule applies" questions; more invariants cited in change notes; this is where graphify-bench saw its gain.
- L3 plus L4: savings only on returning work; zero stale serves if dependency recording is complete; most hits lost if invalidation is file-level instead of span-level.
- L5 pointer versus CLAUDE.md restructure: a prefix saving that is real but small (a few percent of context tokens); a risk of missed rules that only a task with an invariant at stake can detect.

---

## 7. The arms of a fair wider test

Every arm uses the same agent model and harness version, pinned; the same parent-era `CLAUDE.md` unless the arm is about it; a single-commit export of the parent with no `.git`, no network for the agent, no mount of the live tree (`protocol-addendum-6.md` item 7; `lane-evaluation.md` L2). Every arm's own prefix (pointer, schemas) is counted in its tokens.

| Arm | What it is | What it isolates |
|---|---|---|
| A0 | Default tools (search and read) | Baseline |
| A0p | Placebo: a CLI with an equal-length pointer that returns plausible but uninformative output | Effect of any extra tool and its description (the control missing from almost every code-graph paper; `lane-agents.md`) |
| A0x | Non-graph index: capped lexical search over symbols, signatures and doc sections, same output format as A1 | "An index with capped, cited output" against "a graph" |
| A1 | Structure: `find`, `neighbors`, `impact` over L1 and L2a | The tested graph, now with an agent |
| A2 | A1 plus L2b claims, `rules`, slice cards | Model-read meaning |
| A3 | A2 plus L3 and L4: cached conclusions seeded by replaying earlier commits, served with invalidation | The owner's library |
| A3s | A3 with invalidation switched off | Stale control (value of invalidation) |
| G1 | graphify as shipped, code layer only (no model), its own instruction block and default hooks | The popular tool, as its users get it |
| G2 | graphify as shipped with document extraction | The popular tool's model-read layer, which is where its one independent gain sits |
| Factor S | On A2 and G2: advisory steering against a forced first query | Steering separated from content; published gains confound them |
| Factor P | On A2: rules pushed in full (today's CLAUDE.md) against one-liners pushed and reasons pulled | The push-to-pull lever and its risk |
| Optional E | A1 with an embedding entry point instead of lexical | The pre-registered study's finding; needs a model download, the owner's decision |
| Optional T | Graphiti as shipped, ingesting docs and commit messages as episodes, on the D4 invalidation test only | Model-decided against structure-decided invalidation; needs a graph database server, the owner's decision |

Task designs, from `lane-evaluation.md` section 2, each crediting a different layer:

- **D2, break oracle (no agent first).** 60 to 100 real and injected changes; the reference is what the repository's own checkers (tests, mypy strict, the TypeScript compiler, import-linter) flag when the change is applied at the parent. Credits L1 and L2 `impact`, with a reference no arm wrote. All arms that have an `impact` analogue (A1, A2, G1, G2) can be scored directly by script.
- **D4, invalidation replay (no model first).** The temporal lane's Test 1: walk consecutive snapshots, record each answer's dependency set, compare policies (no cache, whole-repo, file-hash, fact-level, fact-level with early cutoff, mtime-style) against the answer recomputed at the next commit; stale-served rate must be zero. Then, only if the dependency-case stratum exists, the claim version with blind readers. Credits L3 and L4.
- **D3, recorded lookups (screening only).** The 139 distinct recorded search-then-read pairs, split into programme documents (106 of 181) and product code (26). Says where to look; decides nothing.
- **D5, fresh questions with an agent.** 80 to 120 new questions of 8 to 12 kinds including doc-versus-code, "which invariant applies", "what is the other half of this rule", and 20 to 30 orientation questions with a rubric; two blind readers per reference. Credits L2 and L5; cheapest live design.
- **D1, replayed commits with a live agent.** Pilot 12 tasks x 4 arms x 3 runs (144 runs) to estimate run noise, the task-by-arm spread, adoption and the orientation share of tokens; then about 40 tasks x 3 arms x 3 runs (360 runs) plus placebo, which detects roughly a 12 to 16 % token change; success only as a non-inferiority guard (a +10 point change is out of reach here). Labels include needed-but-unchanged context from five sources. All sizing is the evaluation lane's own model, not a measurement.

Order: D2 and D4 first (scripts, no agent, all arms), D3 alongside, then D5 with all arms, then D1 with the best three or four arms plus A0 and A0p. Primary outcome in live designs: tokens to a correct result, in four buckets (uncached input, cache write, cache read, output), with success as a guard.

---

## 8. What the finished test lends the next one

All under `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/` unless another path is given. **That folder is a session scratchpad; whether it survives cleanup is unknown, and copying it somewhere durable is the owner's decision.**

- The facts extractor (`facts/build_facts.js`, `py_extract.py`, `ts_extract.js`, `docs_extract.js`, `git_extract.js`; version 59da7b753a4d908e; 28 of 28 self-tests) and the 190-parent cache (`facts/cache/`, 746 MiB on disk as I measured; 778 MB in the notes). L1 and L2a as they stand.
- The task sets: `tasks/tasks.jsonl`, `tasks/parents.txt`, `tasks/tq_questions.jsonl`; sealed references `sealed/references.jsonl`, `sealed/tq_reference.jsonl`, and the two-reader method (`sealed/tq_writer`, `tq_second`, `tq_resolve`, `tq_agreement.txt`). The 75 held-out commits and the 30 held-out questions are spent for their original claims; they are development material for new label kinds and question kinds, not a clean final set (`lane-evaluation.md` §5).
- The arm harness: `arms/common` (shared loader and output format; spec at `docs/program/evidence/harness-bottlenecks/graph2/build-b/arms-common-SPEC.md`), the SQLite arm as the store, the two floors (same directory, co-change) as cheap baselines, the scripted search as a non-agent baseline. The two graph-engine arms are no longer needed for answers (identical), only for the pending timing question.
- The grader and statistics: the held-out scoring scripts and cluster bootstrap (`sealed/grader/heldout/`, scripts named in `build-e/result.json`), the protocol discipline (hashes before the run, `SCORING_STARTED`, three refuters, must-not-claim lists).
- The Linux image: `docs/program/evidence/harness-bottlenecks/graph2/engines-linux/Dockerfile.txt`, with the mount fixed (export only, no live tree).
- Token accounting for live runs: the parsers in `docs/program/evidence/token-spend/` (four buckets, per call, counted once per message id).
- The layer-4 specification: `docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md` v1.3.1 (commit 6fba000), with its audit (KS-0) still unrun.

---

## 9. Open questions

1. Is the knowledge layer aimed at the right content? The measured hottest reads are the harness's own design documents. Should the meaning layer cover `docs/program/`, which is mostly untracked and changes daily, or only product docs and code? The answer decides most of L2b's cost and value.
2. How many tokens does each layer's own prefix cost (pointer, tool schemas), measured, and does a CLI through Bash keep agents using the tool as well as a tool server does?
3. Will agents call the tools without forcing? Independent tests saw adoption from 0 in 60 sessions to 42 % of trials. A forced first call confounds steering with content.
4. Can the repository's tests, mypy, tsc and import-linter run at old parents (needed for D1 and D2)? Not verified.
5. Does history hold enough "dependency case" changes (answer changed, own anchors unchanged) for D4 to say anything? Count first.
6. How many needed-but-unchanged labels per commit exist? If few, D1's premise fails, and that is a result.
7. How non-deterministic is the L2b build? Build twice on 10 parents and compare claims.
8. Is moving the reasons in CLAUDE.md from push to pull ever acceptable to the owner, given that each trap was paid for? If not, mechanism (iv) is off the table and the design's ceiling falls by a few percent of context tokens.
9. Does graphify parse this repository's stack fully and extract table read and write edges? Installing it is the owner's decision, as is the graph-engine install already pending.
10. Which agent model is the deployment target? Published structural-graph gains shrink with model size (17 to 21 points at 1.7 to 4B parameters, 4 to 5 at 32B; medium).
11. Do cache reads count against the plan's limits? Unknown; it decides whether a prefix saving is worth anything to the owner.
12. Where will fresh tasks come from? Product history on main runs from 2026-05-31 to 2026-08-03 (my measurement, `git log` dates), 391 commits; a prospective set may be needed.
13. Rename identity across commits: how often does it fail on this history, and does a failure split a claim's validity?

---

## 10. What I could not verify

- Every outside figure here is taken from the five lane notes, which were written from web pages read through a fetch tool that returns a small model's extraction; I did not re-open any outside source.
- That every FixFlow call carried `CLAUDE.md` and `MEMORY.md` at today's size: the prefix exposure figures are arithmetic on today's file sizes and the total call count, not a measurement of prefix content.
- What graphify's `save-result` and `reflect` commands do; whether it extracts code-to-table read and write edges; the token size of its tool schemas.
- The token size of any tool schema in this harness, and whether a tool server's schemas would land in subagent windows as deferred or loaded.
- Whether the scratchpad folder holding the finished test's build survives; I only listed it.
- The cost of an L2b build on this repository: the 2 USD figure is my scaling of one independent number by words.
- All caps and targets in sections 4 and 6 are design targets, not measurements.
