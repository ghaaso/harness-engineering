# Lane: code knowledge graphs with an agent in the loop (research notes, 2026-11-13)

Written for a reader with no context. Everything below was read on 2026-11-13 through a page-to-markdown fetch tool (so it is an extraction by a small model, not the raw page) unless marked "from earlier notes", which means it comes from the repository file `graph2/research/lane-agent-graphs.txt` (written 2026-11-12, same fetch method) and was re-checked here only where stated. No experiment was run, nothing was installed, nothing from the project was sent to any outside service.

Strength labels: strong = independent and controlled; medium = controlled but by the tool's authors or a single preprint, or independent but small; weak = self-reported, marketing, anecdote, or a size estimate rather than a measurement.

A star count is adoption (how many accounts clicked "star"). It is not a measurement of effect on tokens or success. graphify's own count read 146.9k on the fetched GitHub page; search snippets from other dates gave about 69k (June 2026), 75k, 77k, and 134k (October 2026), so it has roughly doubled in months. I could not establish why.

---

## 0. What the owner's question turns on

The owner asks: if our experiments failed, why does graphify show good results and have many stars, and are we using the wrong kind of graph (strict graph, knowledge graph, temporal knowledge graph)?

Short answer from this lane's evidence:

1. Graphify's headline numbers do not measure what our test measured. The famous "71.5x fewer tokens" is a size ratio against reading every file, with no model run and no answer checked. Its one agent-in-the-loop code result is +11.2 points of key-fact coverage at about 1.3x the tokens of a grep baseline, on 6 questions, graded by the authors' own harness.
2. The graph graphify builds for code is the same kind of object our test built: a deterministic tree-sitter property graph with typed edges (calls, imports, inherits). It is not a temporal knowledge graph. Our test's graph had more in it for code (route and table edges, git co-change, tests and docs links) than graphify's code graph. The extra thing graphify has is LLM-extracted concept nodes from documents, PDFs and images, plus Leiden communities, plus hooks that push the agent to query the graph.
3. The best controlled study found (170,500 episodes, pre-registered, with a placebo arm) says the gain came from the embedding index, not from the graph tools, in small open-weight models. That is the closest thing to an answer to "does the graph structure itself matter", and it points the same way as our result.
4. Where agent-level gains are reported for a frontier model, they are mostly token savings from fewer file reads (read displacement) with success about flat. That is the same mechanism as our "31 tokens versus 695 tokens" observation. So our test did find the effect the tools report; it did not measure it in an agent, which is where the owner is right.

---

## 1. Controlled evidence that a graph tool lowers agent tokens or raises success

### 1a. Independent or pre-registered (strongest available)

**Small open-weight agents with a placebo (arXiv 2610.33958).** https://arxiv.org/abs/2610.33958 and https://arxiv.org/html/2610.33958. Strength: medium to strong (pre-registered design, placebo arm, seeds, multiplicity correction; but small models only, Python SWE-bench only, and I do not know whether the authors have a competing tool; the page describes it as a "confirmatory successor" to an earlier exploratory preprint by the same author).
- Measured: 9 open-weight models (Qwen3 0.6B to 32B, Gemma 4 E2B to 12B), 170,500 episodes on 500 held-out SWE-bench tasks, 5 seeds per condition. Arms: grep-only (G), code-graph tools (T), embedding search (E), both (ET), and a placebo with identical tool names and format that returns random entities (PL). Metric: function-level localisation Acc@10.
- Result: tools raise Acc@10 by +0.06 to +0.10 for Qwen3 up to 14B and the two small Gemma models. At Qwen3-32B the gain is +0.026 (Holm-adjusted p = 0.056, "a near miss"); Gemma 4 12B shows none.
- Qwen3-4B Acc@10: G 0.114, E 0.218, T 0.191, ET 0.214. Qwen3-14B: G 0.282, E 0.318, T 0.309, ET 0.354. Qwen3-32B: G 0.289, E 0.321, T 0.306, ET 0.314.
- "The embedding arm E is never below the graph arm T." Graph tools added on top of embeddings gained significantly for one model only (Qwen3-14B, +0.036).
- Placebo: random tool output is not neutral. For the two smallest models it lowers accuracy (Qwen3-1.7B -0.020, Gemma 4 E2B -0.044). The information content of real tool output beats the placebo for 8 of 9 models.
- Tokens: for Qwen3-4B, grep-only 3.8k tokens and 15.1 steps per episode; with ET 3.5k tokens and 8.4 steps. So fewer steps, similar tokens.
- Not read by me: the final 11k characters, and the hop-distance stratified results (the page excerpt did not report them). Earlier notes (from an earlier version of this paper, 10 models, about 79k episodes) said each extra hop multiplies the odds of correct localisation by 0.47 to 0.55; I did not re-verify that figure in the current version and it should be treated as from a superseded version.
- Reading for the owner: structure is not what carries the gain in the tested regime; a lexical or embedding entry point does. This is a result about localisation by small models, not about a frontier agent doing end-to-end work.

**Claude Code with Haiku 4.5, five map-based MCP servers (arXiv 2611.07286).** https://arxiv.org/html/2611.07286. Strength: medium (controlled, same harness and model, but one run per task, no significance tests, authors built the servers, steering hook confound). Re-read here.
- Harness: Claude Code, claude-haiku-4-5 at low effort, built-in tools pinned to Read, Edit, Write, Bash, Grep, Glob; baseline attaches no MCP server.
- Arms: AST skeleton, call graph, file import graph, docs (BM25 over doc comments, no graph edges), hybrid (call + deps + contains). Structural servers seed with SQLite FTS5 BM25, expand along edges, rank with random walk with restart.
- Tasks: LinuxFLBench n=152 (file recall@10), SWE-bench Pro n=253 (resolved), SWT-bench n=161 (test generation), SecBench n=166 (patching). Each instance run once.
- Results (baseline then arms), average tokens per task and success:
  - LinuxFLBench recall@10: 0.717 baseline; 0.757 to 0.829 arms (hybrid best). Tokens 1,008,163 baseline; 610,910 to 754,768 arms (-25 % to -39 %).
  - SWE-bench Pro resolved: 49.0 % baseline; AST 50.6, callgraph 46.2, deps 49.4, docs 44.3, hybrid 50.6. Tokens 3,116,193 baseline; 2,310,653 to 2,590,046 arms (-17 % to -26 %). With n=253 one standard error is about 3 points, so these resolved-rate differences are inside noise.
  - SWT-bench: tokens and wall time up for every arm (baseline 1,671,772; arms 1,687,094 to 1,871,848).
  - SecBench resolved: baseline 28.9 %; callgraph 34.3 %, AST 25.3 %.
- Tool calls per task: baseline 25.4 native calls on LinuxFLBench versus 8.5 to 13.1 MCP calls in arms; SWE-bench Pro 44.5 versus 3.4 to 5.2.
- The "docs" arm (BM25, no graph) ties the call graph on LinuxFLBench (0.770) and is second best on SWT-bench; there is no ablation isolating BM25 from graph expansion.
- Confound stated by the authors: a pre-tool-use hook forces one map query before native reads on repair, so the effect combines "representation content, availability, and a map-first workflow".
- Token counts exclude map-construction cost.

**CodeCompass, graph navigation (arXiv 2602.20048).** https://arxiv.org/html/2602.20048. Strength: weak to medium (single author, one small repo, prompt changed between conditions, internal inconsistencies noted below).
- Claude Sonnet 4.5 in Claude Code; 30 tasks x 3 conditions x 3 runs (258 completed of 270); repo is the FastAPI RealWorld example app, about 3,500 lines, 71 nodes and 255 edges. Metric: Architectural Coverage Score (fraction of required files the agent read or edited), which measures navigation, not working code. No tokens or cost reported.
- ACS by task group (vanilla / BM25 / graph): semantic 90.0 / 100.0 / 88.9; structural 79.7 / 85.1 / 76.4; hidden-dependency 76.2 / 78.2 / 99.4.
- The graph helped only on the "hidden dependency" group and was below vanilla on semantic and structural groups. BM25 beat the graph on two of three groups.
- 51 of 88 graph-condition trials (58 %) made no graph call despite being told to; those trials averaged 80.2 % ACS versus 99.5 % for the 37 that used it. A checklist at the end of the prompt raised adoption on the hidden group from 85.7 % to 100 %, but the paper changed the prompt for that group only, so conditions were not identical.
- The paper contradicts itself on adoption (42 %, 38 %, 61 % in places) and on the gain (20 versus 23.2 points).

**Codebase-Memory (arXiv 2603.27277).** https://arxiv.org/abs/2603.27277. Strength: medium (preprint by the tool's authors; first author grades per earlier notes).
- Tree-sitter property graph in SQLite served over 14 MCP tools; 31 repositories, one per language, 12 question categories.
- Abstract: 83 % answer quality versus 92 % for a file-exploration agent, about 10x fewer tokens and 2.1x fewer tool calls (earlier notes: about 1,000 versus 10,000 tokens per question, 2.3 versus 4.8 tool calls, Claude Opus 4.6 for both arms).
- The graph lost 9 quality points. The graph arm won hub detection and caller ranking on 19 of 31 languages; the explorer won full-source-context questions.

**Independent practitioner replication of a code-graph tool (CodeGraph on Hono).** https://dev.to/harrisonsec/i-tested-codegraph-on-hono-the-tool-call-savings-reproduce-the-cost-savings-dont-389p. Strength: weak to medium (one person, one repo, 40 valid runs, but a careful method including discarding runs where the tool never connected).
- Hono (TypeScript, about 280 source files), Claude Code with Opus 4.8, 5 questions x 4 repeats x 2 arms.
- Tool calls 14.0 to 6.3 (-55 %); latency 70.8 s to 56.4 s (-20 %); tokens 9,385 to 7,261 (-22.6 %); cost $0.338 to $0.361 (+6.8 %, i.e. more expensive). Answers identical on all questions by manual check.
- The only question where cost fell was broad cross-runtime navigation (tool calls 35.2 to 7.0). On a control question the agent never called the tool.
- First run silently never connected the tool (missing flag) and Claude Code carried on with grep; every result in that run was really the baseline. The author retracted a claimed win from it.
- The tool's own README claims -71 % tool calls, -35 % cost; the replication got -55 % and +6.8 %.

**Independent users of graphify (GitHub issue 985).** https://github.com/safishamsi/graphify/issues/985. Strength: weak (anecdotes from issue comments), but they are the only third-party agent-level reports found.
- One user: corpus of 1,484 files (about 790k words), 10,202 nodes, 17,610 edges; each graphify query about 2k tokens; a 3 to 4 query workflow reaches 8k+; "similar grep/find/ripgrep workflows in Claude Code often used fewer tokens".
- A second user: Copilot CLI on a large .NET monorepo, same model and task, graphify through MCP cost about 1.6 to 1.9x a code-only agent, higher peak context, weaker partial answers.
- Maintainers did not answer the token concern in the thread; a contributor linked five commits touching query seeding and symbol search on Oct 16.
- A single-lookup test on a small repo (httpx, about 17,750 lines) found 628 tokens for a graph "explain" versus 13,659 tokens for reading the file directly, which the author labels one lookup, not a session: https://hackernoon.com/i-tested-graphify-on-a-real-python-repo-heres-what-happened (weak).

### 1b. Self-reported by the tool's authors

**graphify (https://github.com/safishamsi/graphify; BENCHMARKS.md at https://raw.githubusercontent.com/safishamsi/graphify/v8/BENCHMARKS.md, last updated 2026-07-05).** Strength: weak (self-reported, tiny code sample).
- What is in the graph: tree-sitter AST for about 40 languages, no LLM, for code; nodes are "concepts" (functions, classes, files, and also NOTE/WHY comments and ADR/RFC citations); edges tagged EXTRACTED (explicit) or INFERRED (resolved) such as calls, imports, inherits, mixes_in. Documents, PDFs, images, audio/video go through an LLM semantic pass. Clustering by Leiden (Louvain fallback). Outputs graph.json, graph.html, GRAPH_REPORT.md.
- How the agent queries it: CLI `graphify query "<question>"`, `graphify path A B`, `graphify explain`; optional MCP server; hooks for Claude Code and Gemini CLI that fire before search-style tool calls and nudge toward the graph; instruction files (AGENTS.md, cursor rules) for others. Defaults: query budget 2000 tokens, depth 2.
- Code benchmark: ERPNext (about 1M lines of Python, "frappe/erpnext"), a fixed agent (Claude Opus 4.8 per the benchmark page), at most 14 turns, grep/read/list tools plus one code-intelligence tool, n = 6 questions, metric key-fact coverage judged against atomic key facts. Result 82.0 % with graphify versus 70.8 % for the grep/read baseline, "about 140K tokens per query". A secondary write-up (https://www.besthub.dev/articles/graphify-code-knowledge-graphs-without-vectors-boost-agent-accuracy-11-cf064078ed96) states other retrieval tools scored 79.1 % to 80.5 %, graphify used about 1.3x the baseline tokens, and per-task cost was about the same ($0.320 versus $0.322). The benchmark page itself gives no per-arm token or turn counts. The page says packing the whole repo into every turn costs about 20x tokens for lower coverage (no coverage number).
- Memory benchmarks (not code): LOCOMO (n=300 conversational QA), graphify 45.3 % QA accuracy versus supermemory 49.7 %, hybrid RRF 43.3 %, dense RAG 41.3 %, BM25 31.3 %, mem0 27.3 %. A seed-only ablation without graph expansion scored 42.7 %. My arithmetic: at n=300 and about 45 % accuracy one standard error is about 2.9 points, so the 2.6-point gap between graph expansion and seed-only, and the gap to hybrid RRF, are inside noise. LongMemEval-S (n=50): graphify 76 %, dense RAG 76 %, hybrid RRF 74 %, BM25 70 %.
- Temporal sub-suite: 689 weekly AST checkpoints of ERPNext from 2011 to 2026 (3,069 nodes / 2,900 edges to 22,620 nodes / 48,710 edges). No question-answering results are given for it, so the temporal part is a build demonstration, not an evaluation.
- Judge validation: agreement 90.6 % with a second judge (kappa 0.81) on a sample.
- Maintainers ran it, no independent party named; date inconsistencies noted on the page.

**graphify "71.5x fewer tokens per query".** Strength: weak (a size estimate).
- Source: graphify README worked-examples table (52 files: three repositories, five papers, four diagrams: 71.5x; a 4-file mixed corpus: 5.4x; a 6-file httpx example: about 1x). Analyses: https://pantheon-org.github.io/agentic-context/analysis/graphify/ , https://pantheon-org.github.io/agentic-context/benchmarks/graphify/ , https://graphify.com/blog/what-the-graphify-benchmark-measures .
- How it is computed: corpus size estimated from word count (about 123k tokens) divided by the average size of graph query answers to 5 fixed questions (about 1.7k tokens, characters divided by 4). No model call, no check of answer correctness, baseline is "read all raw files", which graphify's own page calls not what any agent does. Extraction cost for LLM-built parts is excluded. The projects' own text says the 6-file example shows "structural clarity, not compression" and that corpora under about 50,000 words may not benefit.
- The commercial "Graphify Cloud" claim of "cut agent token spend by 80 %" has no method given on the page I read.

**CodeGraph (https://github.com/colbymchenry/codegraph).** Strength: weak (self-reported, 7 questions, 4 runs per arm, median).
- SQLite graph with FTS5, Rust tree-sitter kernel, 20 languages; a single MCP tool `codegraph_explore` returning symbols' verbatim source grouped by file plus call paths and a blast-radius summary. Claude Opus 4.8 headless.
- Headline "88 % fewer tool calls, 53 % faster, 62 % fewer tokens, 44 % cheaper", file reads to zero on all 7 repos. Per repo token reductions 41 % (Django) to 84 % (Excalidraw); cost change from about even (Gin) to 78 % cheaper. The README admits responses leave about 80 % more retrieval context resident at end of session (67k versus 18k tokens on VS Code) and that in an unblocked test the baseline agent reached the tool through Bash in 26 of 28 runs.
- Independent replication above (Hono) reproduced direction but not the cost saving.

**code-review-graph (tirth8205/code-review-graph).** Strength: weak. Claims range from 6.8x (project's own PyPI page average for code review; per repo httpx 27.3x, FastAPI 6.3x, Next.js 4.9x) to 49x on a monorepo, to 65x median and 82x in third-party posts; these are token-count ratios of "files the review would read" versus "graph answer", not measured agent sessions as far as I could tell from the search summaries. I did not open the primary repository. One writeup (https://instagit.com/tirth8205/code-review-graph/what-is-token-savings-estimate-accuracy/) is titled as explaining how the 65x is "calculated and verified"; I did not read it.

**GitNexus.** Strength: weak and unverified. A directory site cites a vendor benchmark ("Akon Labs", 113 tasks, 89 projects) with 68.4 % solved with the graph versus 37.0 % without; I could not find the primary report. Do not use.

**Augment Context Engine (vendor).** https://www.augmentcode.com/blog/auggie-beats-claude-code-on-cost-and-quality (via search summary only). SWE-Bench Pro, Opus 4.7: pass rate 61.8 % versus 59.9 %, cost $1,449 versus $1,870 (-23 %), tokens 1.65B versus 2.35B (-30 %) for their agent against Claude Code. Not a graph tool (semantic index, per their pages); different agent harness from the baseline, so tool and harness are confounded. Augment attributes the gap mainly to cache reads. Strength: weak to medium.

**Cursor semantic search.** https://cursor.com/blog/semsearch. Strength: medium (vendor, but includes a live A/B on real traffic with the same model). Offline Context Bench: average answer accuracy +12.5 % (range 6.5 % to 23.5 % by model). Online A/B: code retention +0.3 % overall, +2.6 % on codebases with 1,000+ files; 2.2 % more dissatisfied follow-ups without semantic search. Grep was the control; the conclusion is that grep plus semantic search together is best. This is an embedding index, not a graph.

### 1c. Localisation systems on SWE-bench (papers; from earlier notes, re-checked abstracts here)

| System | In the graph | Agent queries it how | Measured result | Strength |
|---|---|---|---|---|
| RepoGraph (arXiv 2410.14684) | line-level definition/reference nodes, contain/invoke edges, Python | 1-hop or 2-hop ego-graph text injected into Agentless, AutoCodeRover, SWE-agent | Lite resolved: Agentless 27.33 to 29.67 %, SWE-agent 18.33 to 20.33 %. Tokens went up in every case (Agentless 42,376 to 47,323). 2-hop flattened was 26.00 %, below the 27.33 % baseline, at 10,505 graph tokens. | medium (authors' paper, n=300, one run) |
| LocAgent (2503.09089) | dir/file/class/function nodes; contain/import/invoke/inherit; Python | SearchEntity, TraverseGraph, RetrieveEntity tools | Abstract: file-level up to 92.7 %, issue resolution +12 % Pass@10, fine-tuned 32B at about 86 % lower cost. Ablation (7B fine-tuned, from earlier notes): removing SearchEntity costs 19 points file Acc@5, removing TraverseGraph about 2. | medium (authors; ablation inside their own system) |
| CodexGraph (2408.03910) | Python schema in Neo4j; no call edges | LLM writes Cypher | Tokens per SWE-bench sample: BM25 14.76k, AutoCodeRover 76.01k, CodexGraph 102.25k (+35 % over AutoCodeRover); SWE-bench Lite equal to AutoCodeRover (22.96 %) on 257 tasks; with Qwen2-72B 1.95 % versus 9.34 %. | medium |
| KGCompass (2503.21710) | knowledge graph linking issues, pull requests, files, classes, functions | multi-hop paths to pick 20 candidate functions, then an LLM writes the patch | Abstract: 58.3 % Lite repair, function localisation 56.0 %, about $0.20 per repair; says 89.7 % of localised bugs have no location hint in the issue. This is the one system with natural-language artifact nodes. No independent check found; earlier notes record another harness (ARISE) listing it at 15.3 % in its own setting. | weak to medium (abstract only, headline unverified) |
| Code Graph Model, CGM (2505.16901) | repository code graph fed into the LLM attention (a trained model) | agentless graph RAG | 43.00 % Lite with Qwen2.5-72B; no ablation seen in the abstract | medium (trained model; a different approach from a tool) |
| Aider repo map | file-level graph, edge referencer to definer; personalised PageRank; token budget default 1k | injected into the prompt automatically; full files on request | https://aider.chat/docs/repomap.html publishes no measured effect of the map on success or tokens | none (design only) |
| ARISE (2605.03117, from earlier notes) | statement-level data-flow graph | tools incl. bounded BFS slice, bundle capped at 8,000 tokens | Lite 17.3 to 22.0 % with a 32B model; tokens 510k to 560k; the coarse graph came within 0.01 of the fine one | medium |
| SeeRepo (2606.14061, earlier notes) | AST graph rendered as an image | beside text tools | tokens -25 % input for one model, +5 % for another; used at the repair stage it cost 5.0 points | medium |

Takeaway for 1: for frontier models, the best-controlled agent-level evidence (2611.07286, Codebase-Memory, the Hono replication, graphify's own n=6) shows fewer tool calls and usually lower tokens, with success flat or slightly lower. For small models the one pre-registered study shows localisation gains that the embedding index explains better than the graph. No source found shows a graph tool raising a frontier agent's end-to-end task success by a margin clearly outside noise, with a placebo or retrieval-only control. Several show it lowering success on some task types (SWT-bench tokens up; CodeCompass structural group below vanilla; Codebase-Memory quality -9 points; callgraph arm 46.2 % versus 49.0 % on SWE-bench Pro).

---

## 2. Where the saving comes from when it exists

1. **Read displacement.** 2611.07286 attributes most fewer-token runs to the map returning code bodies inline, so the agent skips native Read calls (for the call-graph arm on LinuxFLBench, 109 of 109 fewer-token runs are read-displacement cases). Tool calls fell from about 25 to about 8 to 13, or 44.5 to 3.4 to 5.2.
2. **Fewer wrong turns and fewer steps.** Small-model study: grep-only 15.1 steps versus 8.4 with tools (Qwen3-4B), tokens about the same.
3. **Smaller tool outputs, one shot.** CodeGraph (one call returns verbatim source plus paths), Codebase-Memory (relationships only, no source), graphify (query budget 2,000 tokens). This matches our own measured 31 versus about 695 tokens.
4. **A short orientation read first (steering).** The effect of the hook or skill file is confounded with the graph in 2611.07286 and in TDAD (shortening a skill file from 107 to 20 lines moved resolution from 12 % to 50 % on 10 tasks, from earlier notes). The AGENTS.md study (arXiv 2602.11988, abstract only, earlier notes) found repository overview files do not generally raise success and raise inference cost over 20 %.
5. **Adoption is a precondition.** CodeCompass: 58 % of graph-condition trials made no graph call; Hono replication: a control question never called the tool, and a first run silently never connected; graphify needs `graphify claude install` hooks or the agent has a graph but no reason to use it (graphify's own blog, seen only as a search summary: https://graphify.com/blog/measuring-token-spend-per-task-in-claude-code).
6. **A cost that can go the other way.** CodeGraph's own README: more retrieval context stays resident (67k versus 18k tokens on VS Code); Hono replication: cost +6.8 % despite -22.6 % tokens (the cache-heavy pricing means tokens and dollars diverge); graphify issue 985: 1.6 to 1.9x.
7. **A vendor-reported route not related to graphs:** Augment attributes its -30 % tokens to fewer cache reads because only the relevant slice is sent each turn instead of re-sending candidates. Cognition (SWE-grep): trajectories in their products spent over 60 % of the first turn retrieving context; they train a small fast subagent to return file paths with line ranges and favour precision (F-beta 0.5) because polluted context hurt more than missing context. FastContext: an explorer subagent cut main-agent tokens 26 % on SWE-bench Multilingual (457k to 338k) while raising resolved from 71.7 to 74.7 (GPT-5.4), measured by the authors.

Non-graph levers that save as much or more (important for ranking next steps):
- FlowPlan (arXiv 2611.13241, https://arxiv.org/html/2611.13241v1, medium, 158 to 218 tasks, McNemar tests): abstraction-guided planning cut total tokens to 0.32x to 0.76x of baseline on SWE-bench Verified and Pro with Haiku 4.5 and Sonnet 5 with resolved rates not significantly different. For comparison the map servers gave 0.61x to 0.83x.
- Explorer subagents (FastContext), trained search agents (CodeScout, SWE-grep), bash-only agents (2609.20804 found bash-only cut Nemotron-550B cost about 53 % on SWE-bench).

---

## 3. What share of an agent's tokens are file reads and searches, in published traces

Different papers count different things, so the shares are not additive or comparable.

| Source | Agent, model, data | Share | How counted | Strength |
|---|---|---|---|---|
| SWE-Pruner, arXiv 2601.16746 (https://arxiv.org/html/2601.16746v1) | Mini SWE Agent, Claude Sonnet 4.5, SWE-bench Verified, trajectory count not stated | read 76.1 %, execute 12.1 %, edit 11.8 %. A second model (GLM-4.6): read 67.5 % | tokens "consumed in each agent round"; unclear whether re-sent context is counted | medium |
| FastContext, arXiv 2606.14066 (https://arxiv.org/html/2606.14066v3) | Mini-SWE-Agent, GPT-5.4-high, 300 trajectories of SWE-bench Multilingual | reading and searching = 56.2 % of tool-use turns (9.96 of 17.72) and 46.5 % of the main agent's tokens | text says "total tokens", figure caption says "prompt-token usage"; turn and token counts split across tools when several are called in one turn | medium |
| FlowPlan, arXiv 2611.13241 | Claude Haiku 4.5, SWE-bench Pro and Verified | about two-thirds of tokens come after the first edit (re-reading, diff inspection, tests); cache reads are 96 % to 98 % of baseline tokens | token counts include cache reads | medium |
| Token consumption study, arXiv 2604.22750 (https://arxiv.org/html/2604.22750v2) | OpenHands, 8 models, 500 SWE-bench Verified problems, 4 runs each | cache reads dominate token volume and cost in every phase; input tokens drive cost; input spikes come from tool results such as file views and test output; exact category shares not given in the text I got. Another summary reports the Explore phase as 30.37 % in a table (not verified by me) | | medium |
| SHERLOC, arXiv 2606.24820 (search summary only) | Qwen3-235B-A22B-Thinking, SWE-bench Verified | reasoning about 19.5k tokens, tool outputs 9.0k, input messages 4.5k: reasoning is the majority | thinking tokens counted | weak (summary only) |
| Cognition (vendor) | their Windsurf and Devin trajectories | over 60 % of the first turn spent retrieving context | "first turn", not whole task | weak |

Run-to-run spread is large: the token consumption study says runs on the same task can differ by up to 30x in total tokens in the abstract (about 2x on average per model in the body; the two statements are inconsistent in the text I read), and accuracy peaks at intermediate cost.

How this compares with the owner's own measurement (fetched content about 27 % of context tokens; long-lived orchestrator window 59 %): published read shares of 46 % to 76 % come from short single-task SWE-bench episodes with bash-style agents, where the first half of the run is exploration. The owner's numbers come from a long multi-turn orchestrator, where re-sent accumulated context is the larger part. FlowPlan's cache-read share (96 % to 98 %) and the 2604.22750 finding that cache reads dominate say the same thing from the other side: most counted tokens are the same context re-read on every turn. A graph tool that removes a file read removes the read and also the later re-reads of that file, which is why published token savings can be larger than the raw read share; I did not find a paper that decomposes this. I could not verify why the owner's share is lower beyond this difference in agent shape.

---

## 4. Design choices that recur in tools that report gains

Recurring (and what supports each):
1. **Deterministic parser extraction, not an LLM** (graphify, CodeGraph, Codebase-Memory, 2611.07286, LocAgent, RepoGraph). Support: a Java graph-RAG study (arXiv 2601.08773, earlier notes, medium, 3 repos, 15 questions each) found parser graphs matched or beat LLM-extracted graphs at about a tenth of the build cost (22 s and $0.09 versus 215 s and $0.79). No tool that builds code structure with an LLM reports a clear gain over parsers.
2. **A lexical entry point before any traversal** (FTS5 BM25 in 2611.07286, Codebase-Memory, CodeGraph; SearchEntity in LocAgent; exact-name resolution in graphify with a refusal on ambiguous names). LocAgent ablation: removing the search tool costs far more than removing graph traversal. The pre-registered small-model study: embedding or lexical entry matters more than graph tools.
3. **Shallow expansion, usually 1 hop, capped** (RepoGraph 1-hop good, 2-hop flattened worse than none; graphify depth 2 and 2,000-token budget; Aider 1k-token map budget; ARISE 8,000-token bundle cap).
4. **A hard cap on returned tokens and returning paths, signatures and relation lines rather than whole files** (Aider, Codebase-Memory, graphify, FastContext/SWE-grep file-and-line outputs). Cognition's precision-first scoring.
5. **Exposed as a few on-demand tools beside grep and read, not replacing them** (2611.07286, graphify, Serena, Cursor: grep plus semantic search is best). Claude Code's builder (Cherny, https://www.latent.space/p/claude-code) said early versions used a vector index, and they moved to glob and grep because the index drifts out of sync with the code, hosting an index has a security cost, and agentic search "outperformed everything. By a lot" on internal comparisons that were partly "vibes"; the cost admitted is latency and tokens. No numbers published. Strength: weak, but it is the vendor decision most relevant to the owner's setup.
6. **Steering so the agent actually uses the tool** (pre-tool-use hooks in graphify and 2611.07286; end-of-prompt checklist in CodeCompass; skill file). Where steering is absent, adoption fails (CodeCompass 58 % zero calls).
7. **Incremental update by file hash or mtime** (Aider mtime cache, Codebase-Memory about 1.2 s re-index, graphify 1.6 s incremental on a small repo).
8. **Lightweight, in-process stores** (SQLite with recursive CTE or FTS5: Codebase-Memory, CodeGraph, 2611.07286; NetworkX: Aider, TDAD). The only graph database in the agent-evaluation papers is CodexGraph's Neo4j, which went out of memory on 43 sympy tasks and used the most tokens. graphify lists a SurrealDB engine variant scoring 43.3 % versus 45.3 % for its default on LOCOMO (inside noise). No source varies the engine while holding facts and algorithm fixed, so our identical-answers result on three engines is a result nobody else published, and not a failed experiment.
9. **Benefit concentrated on task types that are navigation or cross-file questions** (impact analysis, callers, "how does X reach Y"), larger repos and weaker models; the reported null or negative cases are edit-heavy tasks, test generation, and small repositories (graphify itself: little benefit under about 50,000 words; Cursor +2.6 % only at 1,000+ files; small-model gain shrinks to +0.026 at 32B).

Not recurring, or absent: temporal modelling. I searched for evidence that time-aware graphs help coding agents and found none measured: Git2KG (arXiv 2611.15509) mines temporal knowledge graphs from git for socio-technical analysis, not agent tasks; GREPO (2602.13921) uses temporal anchors and co-edit windows for graph-neural-network bug localisation, not for LLM agents (earlier notes); AgenticSZZ (2602.02934) uses a temporal knowledge graph for finding bug-inducing commits, a different task; Axon (a tool) adds git change-coupling edges and has no evaluation. Graphiti/Zep is a temporal knowledge graph for conversational agent memory; its LongMemEval and DMR scores are self-reported and I found no independent reproduction (a vendor dispute over LoCoMo between Zep and Mem0 is documented only in a secondary page). So the claim "temporal knowledge graphs help coding agents" is open in both directions.

---

## 5. Is the owner right that we were narrow?

Where the owner is right:
- Our test had no agent in the loop. Every tool that reports gains reports them end to end (tokens per task, turns, coverage or resolution), and the mechanisms that produce the gains (read displacement, steering, tool adoption, what the agent does with a smaller output) only exist inside an agent. Our recall-of-changed-files task is closest to "localisation", which is the one place the literature does find graph value, but it was scored for a one-shot ranked list, not for an agent that chooses what to ask next.
- We tested one repository of one shape, with deterministic extraction only. Several tools and one paper (KGCompass) put natural-language nodes (issues, pull requests, documents, rationale comments) into the graph; we did not, and that is where "knowledge graph" in the sense of the owner's question differs from a code property graph. Whether that helps code questions is unmeasured (graphify's document-side gains are on conversation-memory benchmarks, inside noise in the LOCOMO ablation).
- We did not test a lexical or embedding arm beside the graph; the only pre-registered study found that arm explains the gain.

Where the evidence does not support the owner's reading:
- "All our experiments failed" does not match the record: on questions, a typed query returned an answer in about 31 tokens where scripted search read about 695, which is the same mechanism and about the same size of effect as the tools' own reports (CodeGraph -22.6 % to -77 % tokens by independent and self-report; Codebase-Memory about 10x; graphify about 1.7k tokens per query).
- Graphify's "good results" are not an effect size we failed to reproduce. The headline is a size ratio against a baseline no agent uses. Its agent-level code result is n=6 and costs more tokens than the baseline. Independent users reported equal or higher token use. Star count says it is popular, not that it works better.
- No source found shows that a different graph type (strict graph, knowledge graph, temporal knowledge graph) is what separates a winning from a losing result. The variables that separate them in the literature are: entry point, output cap and format, steering, model size, and task type.

---

## 6. What this means for designing the next test (from this lane only)

1. Put an agent in the loop, hold model and harness fixed, and measure per task: total tokens (cumulative and uncached separately), turns, tool calls, success against a checked answer, and wall time. Count build, update and tool-description tokens.
2. Arms at minimum: grep and read only; lexical/BM25 symbol search returning the same capped format; embedding search; typed graph tool; graph plus lexical; and a placebo that returns plausible but wrong entities. This is the control missing from every code-graph paper except 2610.33958.
3. Verify the tool is reached in every run (a per-run check that the server connected and a tool was called); two independent sources lost whole runs to silent non-connection.
4. Include a steering condition separately (hook or short orientation file) so graph effect and steering effect can be separated.
5. Report per task type: cross-file navigation, impact analysis, edit, test writing. Expect no gain or a loss on edit and test tasks.
6. Repeat each condition several times; treat differences under 3 to 5 points as noise at 100 to 300 tasks.
7. Keep the graph deterministic first; add natural-language nodes (docs, commit messages, issues) and a temporal layer as separately switchable arms so the owner's "knowledge graph versus TKG" question is a measured contrast rather than an argument.

---

## 7. What I could not verify

- graphify BENCHMARKS.md per-arm token and turn data: the page does not give them. The ERPNext figures of 79.1 % to 80.5 % for other tools and 1.3x tokens come from a secondary write-up of the benchmark, not the primary page.
- The graphify README "ERPNext" table and the "Graphify Cloud 80 %" claim: read through the fetch tool; the raw README fetch did not show the ERPNext table, the GitHub page fetch did. Version differences between README snapshots are possible.
- Serena: its documentation describes an evaluation where agents graded their own experience across five agent runs; no token or call totals were in the pages I read. No independent measurement found.
- Language-server and SCIP tools: no agent-level measurement found (earlier notes).
- GitNexus 68.4 % versus 37.0 %: primary report not found.
- code-review-graph: primary repository and reproduction guide not opened; numbers are from search summaries and posts.
- The "Orbit" graph token-usage benchmark pages (orbit-website-3zi.pages.dev, v2/v4) returned 404; a search summary reported graph-only 90 % versus no-graph 97 % accuracy for a different tool. Not used for any conclusion.
- Token definitions in 2611.07286, SWE-Pruner and FastContext (cumulative processed versus unique) were not stated clearly in what I read.
- 2608.13867 ("Engineering Reliable Coding Agents"): only the contents list and abstract reached me; its chapter headed "Build a typed index only when someone will maintain it" was not read, so I cannot report its evidence.
- KGCompass: abstract only; no independent reproduction found; the repair model behind 58.3 % is not named in the abstract.
- GitHub star counts: read as stated by the fetch tool; no history series obtained.
- The cause of graphify's rapid star growth: not established.
- Full text of the small-model study's final section, its hop-stratified results, and whether its author is independent of any tool.
- I did not run or install any tool.
