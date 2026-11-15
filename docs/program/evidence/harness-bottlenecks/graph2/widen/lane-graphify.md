# Lane: graphify itself (what it is, what its numbers measure)

Written 2026-11-13. Read-only research; nothing was installed or downloaded, no package was run. All repository facts were read from the live source (branch `v8`, version 0.9.108 released 2026-11-12) through the GitHub API and raw file URLs. No project detail was sent to any outside service; searches used only the tool's public name and generic words.

Strength labels: STRONG = independent and controlled, MEDIUM = independent but small or uncontrolled, or maintainer-run with a stated protocol, WEAK = self-reported, marketing, anecdote.

A note on names. The repository the owner called safishamsi/graphify now lives at https://github.com/Graphify-Labs/graphify (the old address redirects). The PyPI package is `graphifyy` (double y), the command is `graphify`. The founder account `safishamsi` is still the main committer (1,309 contributions of the top five listed by the API). Source: https://api.github.com/repos/Graphify-Labs/graphify and /contributors.

---

## 0. Short answer

1. Graphify is not a temporal knowledge graph and not a graph database. It is a NetworkX multigraph saved as one JSON file (`graph.json`), built in two layers: (a) a deterministic code layer from tree-sitter parsers (files, classes, functions, methods, imports, calls, inheritance, SQL tables and foreign keys, config keys), and (b) an optional model-read layer over documents, papers and images, where a language model writes concept nodes, edges and short rationale text. Nothing in the graph is dated or invalidated. It stores no summaries (summaries exist only as an unmerged proposal).
2. The code layer is the same kind of object the owner's finished test used (a typed property graph from parsers). What graphify adds beyond that is the model-read document layer, Leiden community clusters with a report file, and an always-on instruction and hook that tells the agent to query first. What the owner's graph has that graphify lacks is git co-change history, route-to-call edges, and table read/write edges (graphify has a co-change analysis only as an open, unmerged pull request, #4544).
3. The 71.5x headline is a ratio between two estimates: the size of the whole 52-file corpus put in the context window (about 123,488 tokens, estimated as characters or words times a constant) against the average size of one graph-traversal answer (about 1,726 tokens) for five generic questions. No answer was checked for correctness. It was measured once, on 2026-04-04, by the maintainer, on a corpus that is mostly five research papers. A later contributor fix (merged in v0.9.87) changed how the answer side is counted and the contributor states the 71.5x was not re-run. The current README no longer leads with it; it still appears in `docs/how-it-works.md`.
4. The numbers the current README leads with (recall@10 0.497, QA accuracy 45.3%) are for conversational memory (LOCOMO, LongMemEval), a different task from code navigation, and the benchmark arm uses a local embedding model and hybrid retrieval while the README says "no embeddings". The one code result (ERPNext, 6 questions, 82.0% against 70.8%) has no confidence interval and the harness that produced it is not in the public repository.
5. Independent controlled measurements on code agents show mostly no accuracy gain and no clear token saving on a strong model; the one place they show a gain is documents-versus-code questions (the layer the owner's test did not include). Details in section 4.
6. 146,932 stars is attention and adoption in about seven months (created 2026-04-03). It is not evidence of an effect on agent cost or accuracy. I did not investigate whether the star count is organic; I found no evidence either way.

---

## 1. What kind of graph it builds

Sources read: `ARCHITECTURE.md`, `docs/how-it-works.md`, `graphify/skills/claude/references/extraction-spec.md`, `graphify/validate.py` (via ARCHITECTURE), `graphify/analyze.py` and `affected.py` heads, all at https://github.com/Graphify-Labs/graphify/tree/v8 .

Graph object: a NetworkX graph stored as node-link JSON. The file says `"directed": false`, but every link keeps arc order, and the loader restores direction from `_src`/`_tgt` markers (ARCHITECTURE.md section "Edge direction in graph.json"). Hyperedges (a relation among three or more nodes, for example "all functions in an authentication flow") are stored in a separate list on the graph, with a limit of 3 per extraction chunk. It is therefore a property graph with typed edges, not RDF, not a quad store, not a temporal graph.

Node fields: `id`, `label`, `file_type` (one of code, document, paper, image, rationale, concept), `source_file`, `source_location` (a line, often null for document nodes), optional `rationale`, `source_url`, `author`, `contributor`, `captured_at` (the last is the capture date of a fetched web page, not a validity time). Community id is added after clustering.

Edge fields: `source`, `target`, `relation`, `confidence` (EXTRACTED, INFERRED or AMBIGUOUS), `confidence_score`, `source_file`, `source_location`, `weight`, and `also_seen` for merged duplicates.

Edge relation names seen in the source and docs: `calls`, `indirect_call`, `imports`, `imports_from`, `dynamic_import`, `re_exports`, `inherits`, `extends`, `implements`, `mixes_in`, `embeds`, `defines`, `method`, `uses`, `references`, `requires` (from the blast-radius default list in `affected.py`); from the model layer: `cites`, `conceptually_related_to`, `shares_data_with`, `semantically_similar_to`, `rationale_for`, `participate_in`, `implement`, `form` (extraction-spec.md).

What comes from parsers and what from a model:

| Layer | Source | Model used | Cost in model tokens |
|---|---|---|---|
| Code: files, classes, functions, methods, imports, calls, inheritance | tree-sitter AST, about 40 languages (33 grammars plus 7 built-in parsers per how-it-works.md), cross-file resolution passes | none | 0 |
| SQL: tables, views, foreign keys, JOINs | deterministic parser (optional `sql` extra); live Postgres introspection optional | none | 0 |
| Rationale from code comments (`# NOTE:`, `# WHY:`, ADR or RFC citations) | parser | none | 0 |
| Documents (markdown), PDFs, images, transcripts | model "subagents" read each file and emit JSON nodes and edges | the host assistant's model, or Gemini, Kimi, Claude, OpenAI, DeepSeek, Bedrock, Ollama if configured | yes, reads every uncached non-code file |
| Audio and video | local faster-whisper transcription, then treated as documents | local speech model, then the document path | transcription local, extraction yes |

Code files are deliberately not sent to the model extractor in the normal pipeline ("Code files are not sent to the LLM semantic extractor in the normal pipeline", how-it-works.md). So the "knowledge graph" label applies to the document layer; the code layer is a code property graph.

Confidence labels (how-it-works.md, extraction-spec.md): EXTRACTED = stated in source, score 1.0. INFERRED = a deduction, scored on a five-value rubric (0.95, 0.85, 0.75, 0.65, 0.55). AMBIGUOUS = flagged for human review, score 0.1 to 0.3. For cross-file code edges produced by the parser's resolver (for example method calls resolved through declared types) the tag is INFERRED even though no model is involved, so INFERRED does not mean "model-guessed". A path's confidence is the confidence of its weakest edge (README "See it in action"). The maintainer's own audit of INFERRED code edges is 12 edges, all correct, on one FastAPI extraction dated 2026-10-05 (BENCHMARKS.md), a spot check, not a rate.

Temporal: none inside the graph. Searched `serve.py`, `report.py`, `ARCHITECTURE.md`, `README.md`, `how-it-works.md` for valid-from, valid-to, as-of, bitemporal, invalidation: only cache-invalidation comments matched. What exists is (a) a `graph_diff(G_old, G_new)` helper in `analyze.py`, (b) the benchmark's "temporal" sub-suite, which is 689 separate weekly AST snapshots of one repository (2011 to 2026) each built independently, with only node and edge counts reported (BENCHMARKS.md), and (c) git hooks that rebuild after a commit. There is no query that asks "what was true at time T" and no edge validity interval.

Summaries: none stored. `docs/node-summaries-rfc.md` proposes optional file-level one-sentence summaries; it states "Do not emit summaries by default until the storage model is agreed on", so it is a proposal. What the graph does hold in text form is the `rationale` attribute that the model writes on document concept nodes, plus node labels.

---

## 2. The whole pipeline

Source: ARCHITECTURE.md pipeline line and module table; `skill.md` steps; README.

Pipeline: `detect()` finds and classifies files, counts words, honours .gitignore and `.graphifyignore` -> `extract()` (parsers in parallel with a process pool; model subagents for documents in parallel batches of about 20 to 25 files, capped near 6,000 lines each) -> `build()` merges extractions into the graph (fuzzy deduplication of nodes is on by default) -> `cluster()` -> analysis helpers (god nodes, surprising cross-community connections, suggested questions, import cycles, graph diff) -> `report.generate()` -> exporters (`graph.json`, `graph.html`, Obsidian vault, wiki, GraphML, Cypher for Neo4j or FalkorDB, SVG).

Clustering: Leiden community detection (graspologic, with a native Rust call on Python 3.13+), silently falling back to networkx Louvain if the `leiden` extra is missing; oversized communities are split; cohesion scores are returned (module docstring of `cluster.py`; README "Labeling and rendering limits" warns that switching algorithm reshuffles every community). Community names are written by a model in batches of 100 communities per call, or hub-derived names if that fails. How-it-works.md says communities are found "by edge density" and that model-written `semantically_similar_to` edges influence community shape.

Report file `GRAPH_REPORT.md` (sections seen in the maintainer's worked example for 285 nodes, 17 KB): corpus check (file and word counts, a verdict whether the corpus is large enough for a graph), summary (node, edge, community counts, percentage EXTRACTED and INFERRED, build token cost), god nodes (top 10 by degree), surprising connections (cross-community edges), the list of communities with cohesion and members, knowledge gaps, suggested questions. About 17,416 bytes for 285 nodes, which is roughly 4,300 tokens at the project's own four-characters-per-token rule.

Query interface an agent uses:
- CLI: `graphify query "<question>"` (BFS by default, `--dfs`, `--budget N`, `--depth N`, default budget 2,000 tokens), `graphify path A B`, `graphify explain X`, plus `affected` (reverse blast-radius traversal over call, import, inherit, reference edges), `graphify prs` tools. Exit codes: 0 answer, 3 ambiguous name, 4 no match.
- How `query` works (read in `serve.py`, functions `_score_query`, `_pick_seeds`, `_bfs`, `_subgraph_to_text`): the question is split into terms; every node is scored by case-folded substring, exact-name, label-token, trigram prefilter and inverse-document-frequency match on its label and source path (the reference file says in so many words: "no stemming, no synonyms, no cross-language match inside the binary"); the top few nodes become seeds; breadth-first (or depth-first) expansion runs to the given depth; the visited nodes and edges are printed as text and cut at the token budget. So retrieval is lexical seed-finding followed by graph expansion. No embeddings in the query path, no learned ranking, no personalised PageRank.
- The skill instructs the agent to do a "constrained query expansion" first: it reads a dump of the graph's vocabulary (`.vocab.txt`) and picks up to 12 words from it that match the question, then queries with those words (query.md, Step 0). So a model does the synonym matching that the engine does not.
- MCP stdio or HTTP server (`graphifyy[mcp]`): tools `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs`; resources for the report, stats, god nodes, surprises, audit, questions (serve.py tool list).
- Hooks and instructions (see section 7).

Caching and incremental update:
- Parser results are cached per file by SHA-256 of content in `graphify-out/cache/`, with an AST cache schema number that retires old entries when resolver rules change (ARCHITECTURE.md mentions schemas 7 to 51).
- Model results are cached per file by content hash and also keyed to a hash of the extraction prompt, so a prompt change forces re-extraction (skill.md Step B0).
- `graphify update .` and the post-commit hook (`graphify hook install`) re-parse only the changed code files (found with `git diff HEAD~1`) and rebuild `graph.json` and `GRAPH_REPORT.md`; document and image changes are ignored by the hook and need a manual `/graphify --update`, which re-runs model extraction on the changed files (hooks.md).
- Known defects in the update path, from the public tracker (all open at the time of reading): #3004 (re-extracting a document produced 0% to 12% node-id retention and 37 versus 26 nodes on two runs of the same six files, because model extraction is non-deterministic and replace-on-re-extract deletes the old nodes first); #3328 (after `--update` re-extracts a file, edges from cached files can point at ids that no longer exist). Source: https://github.com/Graphify-Labs/graphify/issues/3004 and /3328. These are user reports, not maintainer measurements.
- What is re-read when files change: for code, the changed file only; for documents, the changed document is read again in full by a model. Nothing is invalidated through the graph (no dependency-based invalidation of neighbours).

---

## 3. Every headline number

### 3.1 "71.5x fewer tokens per query" (and its siblings)

Where it appears: `worked/karpathy-repos/README.md` and `review.md` (dated 2026-04-04), `docs/how-it-works.md` ("Token benchmark" section), the 0.1.x README, many blogs. It is not in the current README or BENCHMARKS.md. Source files: https://github.com/Graphify-Labs/graphify/blob/v8/worked/karpathy-repos/review.md and https://github.com/Graphify-Labs/graphify/blob/v8/docs/how-it-works.md .

Exact corpus: three public repositories (nanoGPT, minGPT, micrograd; 29 Python files), 14 documentation files, five arXiv PDFs, four images; 52 files, about 92,616 words.

Exact baseline: "corpus tokens (naive full-context)" of about 123,488 tokens, meaning all 52 files placed into the model's context. The code that computes it (`graphify/benchmark.py`) is `corpus_words * 100 // 75` (a words-to-tokens constant of 4/3). If the word count is not supplied it is invented as `number_of_nodes * 50`.

Exact numerator: the average size of a graph query answer for five questions, about 1,726 tokens, estimated as characters divided by four. Per question: 126.7x ("what connects micrograd to nanoGPT"), 100.8x, 68.6x, 68.6x, 43.5x.

Metric: ratio of the two estimates. No agent ran. No answer was graded. There is no question whose correct answer is known. There is no baseline of "an agent that searches and reads selectively", which is how people actually work.

Same document, same corpus, code only: 8.8x (16,997 corpus tokens against 1,929 per query). The maintainer's table in how-it-works.md also lists 5.4x for a 4-file corpus and "~1x" for a 6-file synthetic library, and says "Six files already fits in a context window". The 71.5x is therefore mostly the cost of five PDFs that a code question never needs: the ratio falls from 71.5x to 8.8x when the PDFs are removed.

Who measured: the maintainer, once. The `httpx` review in the same folder is labelled "Evaluator: Claude Sonnet 4.6 (analytical simulation - Bash execution unavailable)", i.e. a model estimated the numbers from the code without running it. The Karpathy review does not state who ran it.

Independent reproduction: none found. The contributor who fixed the benchmark code wrote "The '71.5x fewer tokens per query' in docs/how-it-works.md was measured with the old count; I did not re-run it because the corpus is not in the repo" (pull request 4348, https://github.com/Graphify-Labs/graphify/pull/4348, shipped in v0.9.87 per the maintainer's comment, 2026-10-12). That fix changed the answer side to count the real `query_graph` answer (cut at the 2,000-token budget) instead of an unbudgeted traversal; on four repositories the benchmark's own output moved from 10.2x to 32.4x (requests), 10.8x to 113.3x (flask), 78.7x to 153.6x (pytest), 11.0x to 1,893.5x (django). The corpus side was left as the 4/3 constant. This shows the ratio is driven by how the numerator is capped, and that it grows with corpus size by construction (a fixed 2,000-token answer divided by a growing corpus).

Strength: WEAK (self-reported, no correctness, naive baseline).

Independent re-computations with the same formula: a blog test on a 140-file pure-Python FastAPI project got 7.3x (about 154k corpus tokens against about 21k per query, five generic questions, 936 nodes), and says correctness was not measured and that about 52% of edges were INFERRED at a blanket 0.5 score in that older version. https://exchangepedia.com/articles/graphify-honest-benchmark-real-codebase.html . MEDIUM-WEAK (one person, formula-only).

### 3.2 "79x fewer tokens on a 496K-token codebase"

On graphify.com `llms.txt`, credited to a community member and explicitly "not run by Graphify"; no method given. https://www.graphify.com/llms.txt . WEAK.

### 3.3 "80% fewer tokens" / "Cut agent token spend by 80%"

README banner and the Graphify Cloud section. It is for the paid hosted product, no method, corpus or baseline is stated anywhere I read (README, llms.txt). WEAK (marketing). Source: README lines about Graphify Cloud.

### 3.4 LOCOMO and LongMemEval (the README's lead numbers)

Source: https://github.com/Graphify-Labs/graphify/blob/v8/BENCHMARKS.md (last updated 2026-07-05).

- Task: conversational long-term memory question answering, not code. LOCOMO n=300 questions; LongMemEval-S n=50.
- Metric: recall@10 and question-answering accuracy graded by a model (Kimi K2.6) against atomic key facts, coverage = (covered + 0.5 times partial) / total; the grader was checked against a second model on a sample, 90.6% agreement, Cohen's kappa 0.81.
- Results: graphify 45.3% QA, recall@10 0.497; hybrid retrieval 43.3%; dense retrieval 41.3%; BM25 31.3%; mem0 27.3%; supermemory 49.7% (higher than graphify). LongMemEval-S: graphify 76%, dense retrieval 76%, hybrid 74%, BM25 70%, mem0 70%.
- What this says about the graph: the document states a seed-only ablation (no graph expansion) scores 42.7%, so graph expansion is worth about +2.6 points on 300 questions. By my arithmetic the binomial standard error of an accuracy near 45% on n=300 is about 2.9 points, so +2.6 is within one standard error (a paired test could be tighter, but none is reported). The headline gain over BM25 comes from the seed retrieval, not the graph step. This matches the owner's own finding of +0.015 for the graph-native step.
- Inconsistency to flag: README says "No embeddings, no vector store"; BENCHMARKS.md says the arm uses "a local embedder" (BGE-m3) and "hybrid retrieval", and builds the index "AST-only with no LLM". I could not determine what the graph consists of when the corpus is conversation text.
- Who measured: the maintainers, on their own harness, with competitors run as adapters inside it. The harness directories (`memory/`, `crosstool/`) named in the file are not in the public repository tree (1,311 entries read at v8, none match). So it cannot be reproduced from the repo. Strength: WEAK to MEDIUM (stated protocol, shared grader, competitor adapters, but self-run, unreleased harness, one repetition).

### 3.5 ERPNext cross-tool (the only code-agent number)

Same file. A fixed coding agent (Claude Opus 4.8 per the file, at most 14 turns, grep, read and list tools plus one graph tool) answered 6 graded questions on ERPNext (about 1 million lines). Key-fact coverage 82.0% with the graph tool against 70.8% for the grep-and-read baseline, "at about 140K tokens per query". The same file claims stuffing the whole repo into context costs "roughly 20x the tokens for lower coverage". n=6 questions, no interval, no baseline token figure given, harness not public. Correctness WAS measured here (key-fact coverage), unlike 3.1. Difference of 11.2 points on 6 questions: by my arithmetic one question flipping changes the score by a similar amount. Strength: WEAK.

### 3.6 Zero model credits to build

True for code: parsers only. The same sentence in BENCHMARKS.md covers a corpus with documents only when they are excluded ("Graphs build AST-only with no LLM"). For documents the cost is real; see section 5.

### 3.7 Whether answer correctness was measured at all

Not for 71.5x, 79x, 80%. Yes for LOCOMO, LongMemEval, ERPNext (by the maintainers). The maintainer's own tracker has an open feature request titled "`graphify benchmark` measures answer size but never whether the answer is right" (issue 4341, 2026-10-11, still open). So the project's built-in benchmark command still measures size only.

---

## 4. Independent write-ups and measurements, with their own numbers

All dated 2026; read directly unless marked.

A. SWE-bench Lite retrieval check, inside the project's own tracker. Issue 4341, https://github.com/Graphify-Labs/graphify/issues/4341 , by contributor rohit-jsfreaky, graphify 0.9.85. 177 SWE-bench Lite issues across nine Python repositories, each repository built at the commit the issue was filed against, the issue title as the question, the files the real fix changed as the right answer; `query_graph` at its defaults (BFS, depth 3, about 2,000 tokens). Right file shown first: 25%; in the first 3: 34%; in the first 5: 38%; anywhere in the answer: 62%. BM25 over the repository's .py files: 32% first, 56% in first 3, 64% in first 5, 92% in the top 50. Strength: MEDIUM (independent contributor, public benchmark with known answers, but one person, the question is an issue title, and it measures file localisation not agent success). It is evidence that graph traversal answers were worse than plain BM25 at finding the file, on that set.

B. Two-agent comparison. Issues 3307 and 3308, https://github.com/Graphify-Labs/graphify/issues/3307 , graphify 0.9.53, by user lamsoon-work: two fresh agents answered 5 cross-file questions on two repositories, one with `graphify query`, one with Read/Grep/Glob only. Tokens with graphify against without: 79.6k against 53.1k (556-node graph) and 83.5k against 62.1k (1,059-node graph); tool calls 13 against 10 and 14 against 12. Cause the author gives: the graph answer lacked a citable line, so the agent re-read the files anyway; 82% of edges and nodes on the small graph had no `source_location`; one agent fabricated a line citation. Strength: WEAK-MEDIUM (n=2 per repository, one run each, self-reported by the agents).

C. graphify-bench, https://github.com/ohta-rh/graphify-bench (README read in full, repository created 2026-09-02, last push 2026-11-10, 0 stars). Real headless Claude Code runs on one LLM-generated multi-tenant SaaS (477 code files, 40,944 lines; 139 markdown design documents, 261k words, 12 planted document-versus-code contradictions), 105 tasks in six sets, answers scored by set-F1 against a key, a blind model judge, or hidden tests; 940 runs, one repetition per task, bootstrap intervals that resample tasks; about 183 US dollars. Graphify arm is exactly what `graphify install --project` produces (CLAUDE.md block, hooks, skill, a prebuilt graph; v1 = code-only graph of 2,545 nodes and 10,202 edges built in 4.6 s with no model; v2 adds model extraction of the documents, 3,245 nodes, 13,014 edges, 1,429 document-to-code edges, about 7 US dollars of Sonnet subagent calls).
 - Sonnet 5, 45 code tasks: tokens +32k [-8k, +75k] (crosses zero) against plain baseline; accuracy 78% against 84%. Against a baseline with subagents disabled: +107k [+38k, +180k] tokens, +0.066 US dollars [+0.037, +0.101], accuracy 78% against 84%.
 - Haiku 4.5, 45 code tasks: -119k tokens [-245k, -12k], accuracy 82% against 80%.
 - Sonnet 5, 20 document-and-code tasks (graph v2): -129k tokens [-325k, +33k], cost -0.084 [-0.180, -0.005], accuracy 80% against 70%. Haiku 4.5 same set: -161k tokens [-317k, -25k], accuracy 75% against 80%.
 - The document-versus-code contradiction hunt (4 domain tasks): graphify 4 of 4 found, mean F1 0.94; without graphify 2 of 4, F1 0.68; cost -29% with an interval excluding zero. The author calls it "the only category where Sonnet's accuracy moved".
 - Author's stated limits: one corpus, one repetition per task (run-to-run noise not measured), the usage counter covers only the main session so subagent tokens are missed (which inflates graphify's apparent token cost by about 290% on code tasks "purely from the metric"), the graphify features `affected`, `god-nodes`, `save-result`, `reflect` were called zero times, and the strict first-read block "never fired in 45 runs". Other graph tools in the same harness (code-graph-rag, an AST graph in Memgraph; MemPalace, embeddings plus BM25) were not better than baseline on code.
 - Strength: MEDIUM to STRONG for what it covers (independent, controlled arms, intervals, all transcripts published), but one synthetic corpus, one repetition, and the author's own caveats. It is the most informative public comparison I found. The author's verdict: "For Sonnet 5 on a code-only corpus, graphify changes nothing measurable. It starts paying off when the explorer is weak (Haiku 4.5) or when the questions span documentation and code, and it is clearly counter-productive when a literal grep would do."

D. Production feature work, KubeBlogs, https://www.kubeblogs.com/graphify-claims-71-5x-fewer-tokens-we-tested-it-on-real-production-work/ . A multi-service production codebase, three rounds, one session per arm per round (six sessions), feature implementation. Total cost graphify against no graphify: round 1 $60.28 against $47.83; round 2 $25.60 against $27.06; round 3 $10.55 against $12.85 (the article's wording on which figure belongs to which arm is ambiguous; the reader of the page inferred this mapping). Blind quality totals 44/50 against 45/50. Grep calls 46 against 18 graphify calls in round 2; agents kept grepping even when told to prefer graphify. Authors' verdict: per-query savings did not show up as a session-level saving. Strength: WEAK-MEDIUM (n=1 per arm per round, directional by the authors' own words).

E. Hands-on audit, https://rentierdigital.xyz/blog/claude-code-knowledge-graph-audit-failed . Two production projects (about 290 and 387 files), 14 days, 60 Claude Code sessions: about 1,500 hook reminders, 0 `graphify query/path/explain` calls and 0 MCP tool calls, 1 read of the report. The 49x to 71x figure cited came from other published benchmarks, not measured. Strength: WEAK (anecdote, one developer), but it is a direct measurement of whether the advisory instruction changes agent behaviour, and it did not.

F. A graphify-versus-grep question set in a personal repository, https://github.com/quaesitor-scientiam/graphify/pull/100 : the V standard library, 8 questions (3 grep-friendly, 4 graph-friendly, 1 neutral), a 69-item answer key, two runs per tool, blind grading. Items found 67.5 of 69 against 68.5; weighted input tokens 361k against 414k (about 13% lower with graphify); tool calls 47.5 against 36; time 228 s against 283 s. WEAK-MEDIUM (tiny, authored with an AI assistant, but the key and script are published). Note: it shows modest cost saving and equal completeness on questions chosen partly to suit the graph.

G. Related work on a different tool (not graphify): Codebase-Memory, arXiv 2603.27277 (28 March 2026, v1 preprint), a tree-sitter graph served over MCP; answer quality 83% against 92% for a file-exploration agent, about 10x fewer tokens, 2.1x fewer tool calls, 31 repositories. Included only because it is the same design family; number of questions not stated on the page I read. MEDIUM (preprint by the tool's authors).

H. Promotional or non-measuring write-ups: themenonlab.blog (states 71.5x as "the headline number" with no method, author did not run it; mentions 7,311 stars four days after the first commit), claudelog.com (repeats 71.5x as the project's own figure and notes ~1x on six files). WEAK.

No independent reproduction of 71.5x, no independent SWE-bench-scale agent result, and no independent test of a temporal feature (none exists) was found.

---

## 5. Stars, age, cadence, license, size, data, build cost

Source: https://api.github.com/repos/Graphify-Labs/graphify , releases and PyPI JSON read 2026-11-13.

- Stars 146,932; forks 14,093; watchers (subscribers) 423; open issues and pull requests 1,639. A star count is adoption and attention; it records that people clicked a button, not that anything was measured. Created 2026-04-03; first commit 2026-04-04; about seven months old. The repository carries a Trendshift badge, the founder sells a book on the design ("The Memory Layer"), the organisation advertises a Y Combinator S26 batch and a paid hosted product, "Graphify Cloud". Treat the README as marketing for that product in part (it carries banners saying "Cut agent token spend by 80%").
- Release cadence: version 0.9.108 on 2026-11-12, 0.9.107 on 11-11, 0.9.106 on 11-10, 0.9.105 on 11-09; roughly one release per day; 276 releases on PyPI. Fast-moving: README and behaviour change weekly (the headline benchmark and the benchmark code itself changed in October).
- License: Apache-2.0 (LICENSE-MIT and NOTICE files also ship; the metadata declares Apache-2.0).
- Install: Python 3.10 to 3.14; `uv tool install graphifyy`; wheel 1.9 MB, source archive 3.4 MB (PyPI). Core dependencies: networkx, numpy, rapidfuzz, pyyaml, tree-sitter plus about 25 language grammar packages. Extras for PDF, Office, video (faster-whisper), MCP, Leiden, Neo4j, FalkorDB, LLM backends. I did not measure installed size on disk.
- Data leaving the machine: code files never leave (tree-sitter, local). Documents, PDFs and images go to whichever model the host assistant uses, or to a configured backend (Gemini, Kimi (servers in China per the README), Claude, OpenAI, DeepSeek, Azure, Bedrock, Ollama, the `claude` CLI); `GRAPHIFY_BACKEND=none` disables all model calls, `ollama` keeps it local. Audio and video are transcribed locally. README: "No telemetry". A local query log at `~/.cache/graphify-queries.log` (timestamps, question text, counts) unless disabled. Graphify Cloud and its MCP service are hosted by the vendor (graph of the user's repositories on their servers). I did not audit the code for undisclosed network calls.
- Token cost of building the graph for a repository of about 1,000 files: not published by the project. What can be derived:
 - Code files: 0 model tokens. Measured by the graphify-bench author: 477 files, 40,944 lines, 2,545 nodes, 10,202 edges, 4.6 s, no model.
 - Non-code files: every uncached document, PDF and image is read in full by a model (one subagent per 20 to 25 files). Measured data points: 139 markdown files, 261k words, about 7 US dollars of Sonnet subagent calls (graphify-bench; my reading of those words as roughly 350k input tokens is an estimate); a blog author reports about 240k tokens (range 200k to 280k, 7 subagents) for a 140-file project and about 40k for a 3-file update with one subagent, and notes that graphify's own cost tracker reported zero because subagent usage is not captured (exchangepedia, MEDIUM-WEAK, older version). The skill itself warns that semantic extraction "can cost minutes and tens of thousands of tokens".
 - So for 1,000 files the cost is roughly zero if all are code and rises roughly linearly with the number and length of non-code files; I cannot give a measured figure for a 1,000-file mixed repository. The maintainer's own report for the Karpathy corpus says "Token cost: 6,000 input, 3,500 output" for 52 files with five PDFs, which looks too low to be the real cost of reading five papers; I could not verify it and the blog author found the tracker under-counts.

---

## 6. How it differs from a deterministic typed code graph, and what it adds

Same as a deterministic code property graph with typed edges: tree-sitter parsing; nodes for files, classes, functions, methods; edges for imports, calls, inheritance, definitions; cross-file resolution of calls through types; SQL tables, foreign keys and joins; deterministic and cacheable; and a blast-radius traversal (`affected`) that is the same operation as "given a changed file, which files and definitions are affected".

What graphify adds that a parser-only typed graph lacks:
1. Model-read meaning over non-code files: concept nodes, rationale text, citations, `semantically_similar_to` and `conceptually_related_to` edges, cross-document and document-to-code links (graphify-bench: 1,429 document-to-code edges on 139 documents). This is the only layer where an independent controlled test found an accuracy gain (section 4C).
2. Community clusters (Leiden) with model-written names and a report file of god nodes, surprising cross-community links, knowledge gaps and suggested questions; an HTML and Obsidian view; a markdown wiki per community.
3. An always-on pointer: a CLAUDE.md or AGENTS.md block and, on Claude Code, hooks that fire before search and read tool calls (section 7).
4. Confidence labels on every edge, and an agent-side vocabulary expansion step; MCP server; pull-request impact tools.

What a typed code graph can have that graphify lacks (relevant to the owner's finished test): git co-change edges (graphify: open pull request 4544 only), route-to-call edges and table read/write edges as separate relation types (graphify's SQL support is schema-level tables, foreign keys and joins; I did not verify code-to-table read/write edges), any time dimension, and graph-native ranking (graphify ranks lexically then expands breadth-first; no personalised PageRank).

What graphify does not do, which the owner's questions assumed: store summaries, track validity or history in the graph, invalidate through the graph (cache invalidation is per file by content hash), or traverse with a learned or probabilistic ranking.

---

## 7. What an agent does differently with it installed

Source: `graphify/always_on/claude-md.md`, `references/hooks.md`, README "Make your assistant always use the graph".

Installed text (CLAUDE.md block): when `graphify-out/graph.json` exists, run `graphify query "<question>"` before the first grep, search or source-file read for a codebase question, and put that rule in every subagent prompt that explores code; read raw files only for lines the graph or an earlier read already located; use `path` for relationships and `explain` for one concept; read `GRAPH_REPORT.md` only for broad architecture review or when query, path and explain do not surface enough; after modifying code run `graphify update .`.

Hooks (Claude Code and Gemini CLI): a `PreToolUse` hook on search-style calls (Grep, `grep` and `rg` in Bash, Glob) and, on Claude Code, on Read and on `cat`, `head`, `tail`, `sed -n` reads, that nudges the agent toward the graph. Soft nudges are capped at 5 per session; `--strict` mode denies the first raw Read or Grep once per session unless a recent graph query (30 minutes) oriented the agent. Other platforms (Codex, Cursor, others) get an instruction file only. The hook fails open and is advisory by default.

What it is supposed to stop reading: raw source files and grep output for orientation questions, and the full report (the skill steers to scoped queries over the report). What it does not stop: it never replaces reading the code once the file is located.

What was measured about behaviour (sections 4B, 4C, 4D, 4E): agents often ignored the advisory text (0 graph calls in 60 sessions; grep calls outnumbered graph calls 46 to 18; the strict first-read block never fired in 45 runs; the author does not say why and I do not know), and when they did use it they often re-read the located files because graph answers carried no citable line (82% null source_location on one document-heavy graph).

---

## 8. What I could not verify

- The `memory/` and `crosstool/` harnesses behind the README numbers are not in the public repository; the datasets are not redistributed. I could not read the ERPNext questions, the answer keys, or the baseline token counts, so the 82.0% against 70.8% result is unreproducible from public material.
- What the graph consists of in the LOCOMO and LongMemEval arms, and why a local embedder is used when the README says there are no embeddings.
- Whether any independent party reproduced the 71.5x on the original Karpathy corpus. I found none; the maintainer's later benchmark fix says the old figure was not re-run.
- Whether the star count is organic. No evidence either way; not investigated.
- Whether code-to-table read and write edges exist (graphify advertises SQL schema extraction, foreign keys and joins).
- Installed size on disk; actual model-token cost of a 1,000-file mixed repository; behaviour of the hosted Graphify Cloud (closed source, no method published for "80%").
- The dev.to review of graphify returned 404; one search summary quoted a "tester estimated 5x to 10x on structural queries", which I traced to the exchangepedia author's expectation, not an independent measurement.
- Several independent write-ups (graphify-bench, KubeBlogs, exchangepedia) mention model names and versions I could not confirm (for example "Sonnet 5", "Opus 5.5"); I report them as the authors wrote them.
- I did not run graphify; every number above is a reading, not my measurement, except the arithmetic noted as mine (standard error near 2.9 points for n=300, the 6-question sensitivity, token approximations from words).

## 9. Implications for the owner's question (kept to what the evidence says)

- "Our experiments all fail, yet graphify shows good results": the two sets of results are not about the same thing. Graphify's lead numbers are (a) whole-corpus-in-context versus one capped graph answer with no correctness check, (b) conversational memory, (c) six code questions on one repository. None is a controlled agent test on code navigation against a selective-search baseline. The independent controlled tests (4A, 4C) found no accuracy gain and no clear token saving on code for a strong model, which is consistent with the owner's finished result (a typed store slightly better than scripted search; the graph-native algorithm adding +0.015 with an interval including zero).
- Where the owner is right: the finished test had no model-read layer, no document-to-code semantic edges, no agent in the loop, and no always-on pointer; those are exactly what graphify adds and exactly where the one independent positive result sits (document-versus-code questions, section 4C). The code-only test cannot speak to that layer.
- Where graphify's own evidence does not help the owner's case: its code layer is the same kind of object as the one tested; its retrieval is lexical seed-finding plus breadth-first expansion (a published check on 177 issues found the right file first in 25% of cases against 32% for BM25); it is not temporal and not a TKG, so it provides no evidence about temporal knowledge graphs at all.
