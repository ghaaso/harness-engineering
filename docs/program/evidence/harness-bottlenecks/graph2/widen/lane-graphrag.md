# Lane notes: summary-based graph retrieval (GraphRAG and relatives)

Written 2026-11-13. Read-only research lane. All sources were read on the web on that date; nothing was installed or downloaded. No detail of the owner's project was sent to any outside service (searches used only public tool and paper names).

Strength labels used below:
- strong = independent authors, controlled comparison, stated metric and baseline, reasonable sample.
- medium = a real comparison but small, single dataset, LLM judge, or authors with a stake in the result.
- weak = self-reported by the tool's author, anecdote, marketing, or I could only see a summary of it.

A star count is adoption (how many people bookmarked a repository). It says nothing about whether the tool improves answers.

IMPORTANT METHOD NOTE. The web-fetch tool I used returns a small model's summary of a page, not the raw page. Numbers below are as that summary reported them from the page text. Where two fetches of the same site disagreed, I say so. Anything I could only see through a search-result summary is marked "snippet only".

---

## 0. The short version for a reader with no context

1. Graph-plus-summary retrieval was designed for "whole-corpus" questions ("what are the main themes across these 1 million tokens?"), where plain top-k retrieval cannot work because no small set of passages holds the answer. On those questions the original authors' evidence shows large win rates over plain retrieval, judged by a language model, on two corpora of about 1 million tokens. Independent work finds that this judging method is biased, and that on ordinary question answering the graph methods roughly tie or lose to plain retrieval.
2. The gains, where real, are in answer quality on multi-hop, temporal, summarisation and whole-corpus questions. Tokens usually go UP at query time, and indexing costs 10 to 1000 times more than plain retrieval. A few methods (HippoRAG 2, LazyGraphRAG) get most of the benefit at near-plain-retrieval cost.
3. For coding agents there is NO rigorous evidence that community detection plus LLM-written summaries helps. The evidence that exists is for parser-built structural graphs (call, import, inherit edges) as extra tools for an agent: it helps small models a lot, helps a frontier model somewhat, and ties plain grep in two small tests.
4. For code specifically, the evidence favours parser-built graphs over model-extracted graphs, but the evidence is thin on the model-extracted side. The one study the finished test relied on is weaker than it looks AND its LLM-extracted graph was a weak design. Stronger evidence exists only for the narrower question of call graphs (static analysers beat language models). Nobody I found has run a fair, large comparison.
5. The tool the owner mentioned (Graphify, about 147,000 stars) builds its CODE graph with a deterministic parser, not a language model. Its model-based extraction is for documents, images and audio. So its popularity is not evidence that model-extracted code graphs work. Its headline "71.5x fewer tokens" compares a query against reading every raw file in a 52-file corpus; on a 6-file corpus the same README reports about 1x.

---

## 1. System by system

### 1.1 Microsoft GraphRAG (Edge et al., "From Local to Global", arXiv 2404.16130)
Source: https://arxiv.org/html/2404.16130 (read by me through the fetch tool).
What it is: an LLM extracts entities and relations from every text chunk, builds a graph, runs Leiden community detection hierarchically, has an LLM write a summary for every community. Global search = each community summary produces a partial answer, partial answers are merged.
How measured (by the authors themselves, i.e. self-reported): two datasets of about 1 million tokens each (podcast transcripts: 1,669 chunks of 600 tokens; news articles: 3,197 chunks, about 1.7 million tokens). 125 generated "global sensemaking" questions per dataset. A language model judged pairs of answers on comprehensiveness, diversity, empowerment and directness; each pair was judged 5 times. Baseline "SS" = vector retrieval; "TS" = map-reduce summarisation of the raw text with no graph.
Results:
- Graph methods beat vector retrieval on comprehensiveness about 72 to 83 percent of the time (podcast) and 72 to 80 percent (news), and on diversity 62 to 82 percent. Vector retrieval won on directness, as expected. Empowerment was mixed.
- Against the no-graph map-reduce baseline (TS) the graph summaries gave "small, consistent gains", except at the root level. So the graph is not what produced most of the lift; summarise-everything does most of it.
- Cost claim: root-level community summaries used about 2.3 to 2.6 percent of the tokens that map-reduce over source text needed per query. That is relative to TS (read everything), NOT relative to vector retrieval. Query-time tokens are not compared to vector retrieval in that table.
- Indexing: about 281 minutes for the podcast set, with gpt-4-turbo. Graph size 8,564 nodes and 20,691 edges (podcast), 15,754 nodes and 19,520 edges (news).
Authors' stated limits: only two corpora of about 1 million tokens; fabrication rate not measured.
Strength: medium (own benchmark, own judge, large effect, no human judges). The judging method is the problem; see section 2.4.

### 1.2 GraphRAG search modes and Microsoft's own cost work
Source: https://microsoft.github.io/graphrag/ (docs); DRIFT blog https://www.microsoft.com/en-us/research/blog/introducing-drift-search-combining-global-and-local-search-methods-to-improve-quality-and-efficiency/ ; dynamic selection blog https://www.microsoft.com/en-us/research/blog/graphrag-improving-global-search-via-dynamic-community-selection/
- The docs themselves say: use Global for whole-corpus questions, Local or DRIFT for questions about specific entities, and "Basic Search" (plain top-k vector retrieval) when baseline retrieval suits the query. So the vendor's own guidance is that graphs are not for single-fact lookup.
- DRIFT (local search primed with community reports): on 5,000+ AP news articles, 50 local questions, LLM judge, DRIFT beat Local Search 78 percent of the time on comprehensiveness and 81 percent on diversity. One small experiment, win rates only, no cost figures. Strength: weak to medium.
- Dynamic community selection: an LLM rates reports top-down and prunes irrelevant ones. Average token cost down 77 percent versus static global search at community level 1, with no statistically significant quality difference (win rate about 46 to 50 percent), on 50 questions, one dataset. At level 3 quality rose moderately for 29 queries and cost rose 34 percent. Strength: medium (self-reported, small).

### 1.3 LazyGraphRAG (Microsoft Research blog)
Source: https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/
What was done about indexing cost: no LLM at index time. Concepts are extracted with ordinary language-processing noun-phrase extraction, co-occurrences give a graph, a community hierarchy is built from graph statistics, no summaries are written in advance. The LLM works only at query time (refine the query into 3 to 5 subqueries, test chunks for relevance, extract claims, answer).
Claims: indexing cost "identical to vector RAG and 0.1% of the costs of full GraphRAG". Matches GraphRAG global-search quality at "more than 700 times lower query cost". At 4 percent of GraphRAG global search cost it beats all competitors on local and global queries.
How measured: 5,590 AP news articles, 100 synthetic queries (50 local, 50 global), LLM judge pairwise, competitors vector RAG (8K and 64K context), RAPTOR, GraphRAG local, DRIFT, global at levels 1 to 3. Win rates are only in a figure; no numbers in text.
Caveats (from the post): at the lowest budget it did NOT beat GraphRAG global on global queries; one news corpus; synthetic LLM-judged queries; the authors say it is not a replacement for full summary indexes.
Strength: weak to medium (vendor, single dataset, LLM judge).

### 1.4 BenchmarkQED (Microsoft, same group)
Source: https://www.microsoft.com/en-us/research/blog/benchmarkqed-automated-benchmarking-of-rag-systems/
Illustrative evaluation: AP News, 1,397 health articles, 200 synthetic queries in a 2x2 (data-driven vs activity-driven; local vs global scope), GPT-4.1 as judge, 6 trials per query. LazyGraphRAG won all 96 comparisons against vector RAG with 8K and 120K context (all but one significant); against a 1-million-token context window it still had higher win rates, except answer relevance for local queries (not significant).
Caveats stated or evident: same authors as LazyGraphRAG; LLM judge; synthetic queries; one dataset. Strength: weak to medium. Useful as the only vendor result that includes a 1M-token long-context baseline.

### 1.5 LightRAG (Guo et al., arXiv 2410.05779)
Source: https://arxiv.org/html/2410.05779
LLM-built entity-relation graph with dual-level retrieval (specific and abstract keys) and incremental update.
Claimed: on 4 UltraDomain datasets (Agriculture 2.0M tokens, CS 2.3M, Legal 5.1M, Mix 0.6M; 125 questions each) beat NaiveRAG 60.0 to 84.8 percent, and GraphRAG 49.6 to 54.8 percent, by GPT-4o-mini pairwise judging with answer order alternated.
Cost claim (authors' estimate, Legal): GraphRAG retrieval about 610,000 tokens (610 level-2 communities of about 1,000 tokens) plus hundreds of API calls, versus fewer than 100 tokens and one call for LightRAG. This conflicts with the independent measurement in 2506.05690 below, where LightRAG used about 100,000 tokens per query.
Strength: weak to medium; contradicted by independent re-evaluations (section 2).

### 1.6 HippoRAG (Gutierrez et al., arXiv 2405.14831) and HippoRAG 2 (arXiv 2502.14802)
Sources: https://arxiv.org/html/2405.14831 ; https://arxiv.org/html/2502.14802
Design: LLM open information extraction builds a triple graph, passages are linked to it, retrieval = personalised PageRank from the entities in the query. This is the closest relative to the finished test's "personalised PageRank" step, but over an LLM-built entity graph rather than a parser-built code graph.
HippoRAG 1 (own benchmark, 1,000 validation questions per dataset): single-step recall at 5 on MuSiQue 51.9 vs ColBERTv2 49.2; 2Wiki 89.1 vs 68.2 (largest gain, about 20 points); HotpotQA 77.7 vs 79.3 (graph LOSES slightly). QA F1: 2Wiki 59.5 vs 43.3; HotpotQA 55.0 vs 57.7. Claims 10 to 30 times cheaper and 6 to 13 times faster than iterative retrieval (IRCoT) at query time (the abstract says 10 to 20, the body 10 to 30). Authors' limits: errors mostly from entity extraction and OpenIE; scalability untested well beyond benchmark size.
HippoRAG 2 (own benchmark): average F1 59.8 vs 57.0 for the 7B dense retriever NV-Embed-v2 (+2.8), vs HippoRAG 1 53.1, GraphRAG 49.6, RAPTOR 48.8, LightRAG 6.6 (the 6.6 is implausibly low and is probably a failed reproduction by the competing authors; treat the comparison to LightRAG as unreliable). Recall at 5 averages 78.2 vs 73.4. Indexing on a 11.6k-passage corpus: 9.2M input tokens vs 115.5M for GraphRAG and 68.5M for LightRAG; 99.5 minutes vs 12.1 for the dense retriever. Query time about 1.2 s vs 0.3 s. Needs a 70B model for extraction and filtering. No dedicated limitations section.
Independent check: HippoRAG 2 is the most consistent graph method in two independent benchmarks (section 2.1 and 2.2). It stays near plain-retrieval query cost (1,008 vs 879 tokens per query in 2506.05690).
Strength: HippoRAG 1/2 own results medium; independent confirmation medium to strong.

### 1.7 RAPTOR (Sarthi et al., arXiv 2401.18059)
Source: https://arxiv.org/html/2401.18059
Not a graph: a tree built by clustering chunk embeddings and summarising clusters recursively; retrieval over all tree levels. It is the cheapest summary structure to build.
Own results: QASPER F1 55.7 vs 53.0 (DPR) vs 50.2 (BM25) with GPT-4; QuALITY 82.6 percent test accuracy with GPT-4 vs 62.3 prior best (but that headline compares to older systems, not to a retrieval ablation). 18.5 to 57 percent of retrieved nodes come from upper (summary) layers. Build time and tokens scale linearly with document length (tested 12.5k to 78k tokens on a laptop only). Summary hallucination: about 4 percent of 150 sampled nodes.
Independent: RAPTOR is the best or near-best method in GraphRAG-Bench (Xiang) and in the unified framework study on specific QA, and ties plain RAG in others (section 2).
Strength: medium; independent runs agree on small gains.

---

## 2. Independent and negative comparisons

### 2.1 "RAG vs. GraphRAG: A Systematic Evaluation" (arXiv 2502.11371, v4)
Source: https://arxiv.org/html/2502.11371v4 (fetched; v4 mentions newer judge models, so it is a late revision).
One protocol for both families. Datasets: NQ (single-hop), HotpotQA, MultiHop-RAG (inference, comparison, null, temporal), NovelQA; summarisation SQuALITY, QMSum, ODSum. Reader Llama-3.1-8B unless stated.
- Single-hop and detail questions: plain RAG wins. NQ F1: RAG 64.78; Community-GraphRAG local 63.01; global 54.48; triple-only knowledge graph 34.28.
- Multi-hop: graph methods slightly ahead. MultiHop-RAG accuracy: RAG 67.02; Community local 69.01; HippoRAG2 70.27; RAPTOR 68.78. HotpotQA F1: RAG 60.04, HippoRAG2 63.01.
- Temporal questions are where graphs help most: RAG 30.70 vs Community local 50.60 and HippoRAG2 49.91. Null (unanswerable) questions: RAG 96.01 vs community global 19.27.
- Retrieval check: only about 65 percent of answer entities even appear in the built graph (HotpotQA and NQ). The graph is lossy.
- Summarisation: plain RAG and chunk-based methods match references better; Community-global is weakest by ROUGE-2 (QMSum 3.23 vs RAG 6.32).
- Token-matched control (70B reader): RAG given the same number of retrieved tokens scores 71.01 vs 71.17 for GraphRAG on MultiHop-RAG. The authors conclude the gap is largely explained by how many tokens were retrieved.
- Quality of the graph builder matters: graph built by GPT-4o scores 75.08 vs 71.17 (GPT-4o-mini) vs plain RAG 65.77; temporal 58.49 vs 49.06 vs 25.73.
- Cost (MultiHop-RAG): construction 135 s RAG, 5,560 s Community-GraphRAG, 7,702 s KG-GraphRAG. Retrieved tokens: Community 9,770 vs RAG 3,631 (MultiHop-RAG); 10,244 vs 2,279 (ODSum-story). Total tokens on LongBench-v2: RAG 32.9M, RAPTOR 85.9M, HippoRAG2 220.6M.
- Judge bias: the LLM judge strongly favours whichever answer is shown first (GPT-4o picked the first-shown summary 97 to 100 percent in some comparisons). Conclusions about Community-global flip depending on whether reference metrics or the original LLM-judge setup are used.
- A "selection or integration" router gains 1.1 and 6.4 percent over best single method (70B, MultiHop-RAG) but integration runs both systems every time.
Strength: strong (independent, one protocol, multiple datasets, explicit controls), with the caveat that Llama-3.1-8B and 70B readers were the main models.

### 2.2 "When to use Graphs in RAG" = GraphRAG-Bench (Xiang et al., arXiv 2506.05690, v3)
Source: https://arxiv.org/html/2506.05690v3 (only the first 100,000 of 182,504 characters read; the construction-cost appendix was not read).
Opens by stating that "recent studies report that GraphRAG frequently underperforms vanilla RAG on many real-world tasks".
Two corpora (novels; medical guidelines), four task levels, GPT-4o-mini. Answer accuracy (Novel): fact retrieval RAG with rerank 60.92 vs MS-GraphRAG 49.29, HippoRAG2 60.14; complex reasoning RAG 42.93 vs MS-GraphRAG 50.93, HippoRAG2 53.38; summarisation RAG 51.30 vs MS-GraphRAG 64.40, HippoRAG2 64.10. Medical: MS-GraphRAG is BELOW plain RAG on all of fact (38.63 vs 64.73), complex (47.04 vs 58.64) and summarisation (41.87 vs 65.75); HippoRAG2 is at or above plain RAG everywhere (66.28, 61.98, 63.08, 68.05 vs 64.73, 58.64, 65.75, 60.61).
Query-time tokens (average per query): vanilla RAG 879 (Novel); HippoRAG2 1,008; RAPTOR 3,441; Fast-GraphRAG 4,204; HippoRAG 7,208; MS-GraphRAG local 38,707; LightRAG 100,832; MS-GraphRAG global 331,375.
Conclusion: plain RAG is as good or better for simple fact retrieval; graphs lead on complex reasoning, summarisation and creative tasks, but only some graph methods, and the same method can win on one corpus and lose on another.
Strength: strong (independent, controlled, per-task, with token counts). Limit: two corpora, one reader model.

### 2.3 "GraphRAG-Bench" (Li et al., arXiv 2506.02404, v3) and "In-depth Analysis of Graph-based RAG in a Unified Framework" (arXiv 2503.04338)
Sources: https://arxiv.org/html/2506.02404v3 ; https://arxiv.org/html/2503.04338
- 2506.02404: college-textbook questions, 16 disciplines, 20 textbooks, nine graph methods. Average accuracy: BM-25 71.66, TF-IDF 71.71, no retrieval at all 70.68. RAPTOR 73.58 (+1.92), HippoRAG 72.64, GraphRAG 72.50, GFM-RAG 72.10, KGP 71.86, ToG 71.71, LightRAG 71.22 (-0.44), G-Retriever 69.84 (-1.82), DALK 69.30 (-2.36). Gains are under 2 points and half the methods are at or below plain keyword search. All graph methods hurt math. Construction tokens: RAPTOR 10.1M (lowest), KG methods about 33M, GraphRAG 79.9M, LightRAG 83.9M. Strength: strong on the headline (small, mostly null gains, with a no-retrieval floor), medium on generality.
- 2503.04338: 12 graph methods, 11 datasets. On specific QA some graph methods beat plain RAG (RAPTOR often best) but graph-structure-heavy ones (G-Retriever, ToG, DALK) often do worse; on abstract (summary-style) QA graph methods generally beat plain RAG. Construction token cost: tree about cheapest, knowledge graph middle, rich knowledge graph up to about 40 times a tree. GraphRAG global answers cost about 300K tokens per query on one dataset; their cheaper variant CheapRAG cuts that. Note: in this paper "TKG" means TEXTUAL knowledge graph and "RKG" means rich knowledge graph; it does NOT mean temporal knowledge graph. Strength: strong for the cost taxonomy; accuracy tables I did not read in full (cut off).

### 2.4 "How Significant Are the Real Performance Gains? An Unbiased Evaluation Framework for GraphRAG" (arXiv 2506.06331)
Source: https://arxiv.org/html/2506.06331
Critiques the evaluation style used by GraphRAG and LightRAG papers (LLM judge on LLM-generated questions). Findings: position bias (the same method compared with itself got 90 vs 10 percent depending on order), length bias (a 25-token length difference on answers averaging about 200 tokens shifted win rates by over 50 points), trial bias, and questions generated from passage summaries are often not answerable from the text. After correction LightRAG vs plain RAG on Agriculture falls from the paper-reported 66.70 percent to 39.06 percent; LightRAG vs MGRAG 56.38 to 32.33 percent. Remaining gains "moderate", relative win-rate gaps mostly under 8 percent with tie rates often above 20 percent.
Strength: medium to strong (a different group re-running; they built their own alternative framework, which they admit is imperfect).

### 2.5 A caution on two secondary sources
- https://github.com/umar-thedataguy/graphrag-phantom-communities (0 stars, unreviewed): says Leiden communities from GraphRAG's clusterer are often not statistically distinguishable from a degree-matched random graph (structureless control: 159 leaf communities and 197 billed summaries at p = 0.875; three novel character networks, 78 percent of billed summaries unsupported). Real corpora were only three novels with a regex extractor. Weak; it is a hypothesis worth testing on a code graph, not a result.
- The claim, repeated online, that plain map-reduce over raw text performs nearly as well as graph community summaries matches the original paper's own "small, consistent gains over TS" (section 1.1); I treat it as supported by that source, not by the blog posts repeating it.

---

## 3. Answers to the four questions

### (1) Which question types graphs with summaries help, and which they do not
Help (numbers above):
- Whole-corpus sensemaking ("what are the themes"). Evidence: GraphRAG paper (72 to 83 percent win rate on comprehensiveness vs vector retrieval, LLM judge, two 1M-token corpora); LazyGraphRAG and BenchmarkQED (vendor, one news corpus). Independent runs partly support it for abstract/summary-style QA (2503.04338) but find reference-metric summarisation worse than plain RAG (2502.11371). Net: real for the question type it was built for, but the size of the effect is inflated by biased judging.
- Temporal and comparison multi-hop questions (MultiHop-RAG temporal: plain RAG 30.70 vs graph methods about 50). Strong, one benchmark.
- Multi-hop recall with entity-graph PageRank (HippoRAG family): 2Wiki recall at 5 of 89.1 vs 68.2; MuSiQue modest; HotpotQA no gain. Own benchmarks plus independent confirmation for HippoRAG 2.
- Complex reasoning and summarisation over a corpus with explicit structure (GraphRAG-Bench Novel: +8 to +13 points for the better methods).
Do not help:
- Single-fact lookup: plain RAG ties or wins (NQ 64.78 vs 63.01; GraphRAG-Bench fact retrieval; Microsoft's own documentation recommends plain search for it).
- Detail-oriented and unanswerable ("null") questions: community-global collapses (19.27 vs 96.01 on null).
- Math, ethics, multiple-choice style questions in textbook QA (GraphRAG-Bench 2506.02404).
- Cases where the graph builder is weak: only about 65 percent of answer entities appear in the built graph; triple-only retrieval scored 34.28 on NQ.
Also note what none of these studies tested: structured, typed, parser-derived facts such as "which files import this one" or "which files changed together". These benchmarks are about prose.

### (2) Gains in answer quality, tokens, or both; against which baseline
Mostly quality, and mostly bought with MORE tokens:
- Query-time tokens: vanilla RAG 879 per query; HippoRAG2 1,008; MS-GraphRAG local 38,707; LightRAG 100,832; MS-GraphRAG global 331,375 (2506.05690). Retrieved tokens 9,770 vs 3,631 (2502.11371).
- Token-matched control wipes out most of the gain on MultiHop-RAG: 71.01 vs 71.17 (2502.11371).
- Indexing is the larger cost: plain RAG 135 s vs 5,560 s (Community-GraphRAG) on one corpus; 9.2M vs 115.5M input tokens (HippoRAG 2 vs GraphRAG) on an 11.6k-passage corpus; 10.1M to 83.9M tokens on textbooks (2506.02404).
- The "tokens down" claims exist but are against specific baselines: GraphRAG root summaries use about 2.5 percent of the tokens of map-reduce over raw text (not vs vector retrieval); LazyGraphRAG indexing equals vector RAG and answers at 4 percent or 0.1 percent of GraphRAG cost (vs GraphRAG, vendor figure); dynamic selection saves 77 percent vs static global search; HippoRAG is 10 to 30 times cheaper than iterative retrieval (IRCoT), not cheaper than single-step retrieval.
- Where tokens genuinely fall versus plain retrieval is in the code-agent studies of section 3(3), where the structural index reduced turns and tokens; those are parser-built, not summary-built.
Baseline matters: against "read everything" or against iterative retrieval, graphs save tokens; against single-step top-k retrieval, they usually spend more.

### (3) Has community detection plus summaries been shown to help a coding agent?
No. I found no controlled study that gives a coding agent community-detected, LLM-summarised code and compares it with the same agent without it. Closest evidence:
- Parser-built structural graph as agent tools, no summaries:
  - "Code Isn't Memory" (arXiv 2606.22417; https://arxiv.org/html/2606.22417): Claude Opus 4.7 in one fixed harness, 91 tasks from SWE-PolyBench Verified and SWE-bench Pro (Go, Java, Python), three seeds. A tree-sitter plus embeddings plus call-graph index. Localisation at 5: 84.5 percent with index vs 44.3 percent same harness without vs 75.3 percent for an agentic-grep tool (OpenCode). Resolve rate 50.4 vs 41.9 vs 45.3 percent. Index vs without: resolve p = 0.003, turns 28.3 vs 36.2 (p < 0.0001), per-task cost $1.15 vs $1.19 (p = 0.73, no difference). Index vs agentic grep: resolve p = 0.087 and localisation p = 0.080, NOT significant at the usual 0.05 level. Authors appear to be the makers of the tool under test (arm named SC-ON; link to a "supercoder-eval" repository; I could not confirm affiliations). Strength: medium (careful design, leak audit, but small n of 75 to 80 pairs, vendor-authored, single model).
  - "How Do Small Coding Agents Use Code Graphs and Embeddings?" (arXiv 2610.33958; https://arxiv.org/html/2610.33958v1): ten open-weight models, 0.6B to 32B, SWE-bench Verified, 79,000 episodes, deterministic parser graph (regular expressions and Python ast; nodes files, classes, functions; edges contain, import, invoke, inherit). Function Acc@10 over all 500 tasks: Qwen3-4B grep only 26.8 vs graph tools 37.1; Qwen3-8B 16.7 vs 27.4 (graph) and 30.3 (embeddings); Qwen3-32B 32.0 vs 34.0 (graph) and 35.7 (embeddings). The graph gain peaks at 17 to 21 points at 1.7 to 4B and shrinks to 4 to 5 points at 32B. The benefit comes mainly from exact-name lookup and one-hop expansion; each extra hop multiplies the odds of success by about 0.47 to 0.55 for every arm; small agents chain expansions in only 12 to 14 percent of episodes. Embedding search matched the graph on the larger models. Strength: medium to strong for what it measures (stat tests, McNemar, bootstrap, no multiple-comparison correction), but small models only, and localisation only.
  - LocAgent (ACL 2025, arXiv 2503.09089): parser-built heterogeneous graph; up to 92.7 percent file-level localisation; fine-tuned 32B model comparable to proprietary models at about 86 percent lower cost; issue resolution up 12 percent (Pass@10). Baselines were mostly non-agentic. I read only the abstract. Strength: medium.
  - RepoGraph (2410.14684), CodexGraph (2408.03910): abstracts only; both report gains without numbers on the abstract page. Not verified further.
  - Code Graph Model (arXiv 2505.16901): AST-built graph fed to a fine-tuned 72B model; 43.00 percent on SWE-bench Lite. The graph-vs-no-graph ablation numbers were in a part of the paper I could not read. Not comparable to an agent harness.
- Plain grep ties graph tools in a tiny test: https://github.com/soham504/gl-code-search (one author, 20 issues, one model unnamed): grep alone, grep plus Graphify, and grep plus the author's tool all scored 100 percent Acc@1 on SWE-bench Lite and 85 percent on fresh post-cutoff issues; the agent rarely called the extra tools (0.0 and 0.3 calls per run). Self-published. Strength: weak. Taken together with the 2606.22417 non-significance versus agentic grep, the honest reading is that frontier agents with grep are a strong baseline and graph tools add little on easy localisation.
- Summaries (not graphs) for code retrieval:
  - arXiv 2607.11046 (https://arxiv.org/html/2607.11046v1; first 100,000 of 124,271 characters read): five representations on Long Code Arena (150 tasks) and SWE-bench Verified (500 tasks). Role-aware LLM summaries improve Hit at 5 over bare file paths by up to 40 percent and are 10.4 to 20.9 times smaller than raw source, but raw source often beats them (especially with BM25 on SWE-bench). In the Agentless case study, Hit at 6 rose from 0.898 to 0.918 with summaries and 0.940 with LLM ranking. Summary generation cost about $1.47 to $1.82 per repository (GPT-OSS 20B). Strength: medium.
  - arXiv 2512.05908 (https://arxiv.org/html/2512.05908): hierarchical natural-language summaries (project, directory, file) for bug localisation in a proprietary 46-repository, 1.1M-line Java microservice system with 87 tickets. Pass at 10 of 0.82 vs 0.62 (GraphCodeBERT), 0.61 (Copilot), 0.57 (Cursor); removing directory-level filtering drops Pass at 10 to 0.67 and raises prompt tokens 44 percent. Cost about $80 once. Strength: weak to medium (one industrial system, 87 tickets, authors' own method, not reproducible).
  - Cursor blog (https://cursor.com/blog/semsearch): grep plus semantic (embedding) search vs grep only; average accuracy gain 12.5 percent (6.5 to 23.5 percent by model) on Cursor's own offline benchmark; online A/B code retention up 0.3 percent overall and 2.6 percent on codebases above 1,000 files. This is embeddings, not graphs or summaries; vendor-reported, no sample sizes or variance. Strength: weak to medium.
- Community detection on code: GraphRAG-CodeAudit (https://github.com/itsoumya-d/GraphRAG-CodeAudit, snippet only): hierarchical communities over a code repository; self-reported 64 of 100 questions beat flat vector RAG on a small synthetic harness. Weak.
Conclusion for (3): graph structure over parsed code helps agents modestly to strongly depending on model size and baseline; embeddings help similarly; LLM summaries help retrieval when the baseline is paths or weak lexical search; community-detection summaries for code are untested.

### (4) Model-extracted graphs versus parser-extracted graphs for code
The study the finished test excluded: Chinthareddy, arXiv 2601.08773 (https://arxiv.org/html/2601.08773v1). I read it. Facts: three Java repositories (Shopizer 1,210 files; ThingsBoard 4,521; OpenMRS Core 1,258), 15 questions each, 45 total, one author, Gemini through LangChain (version not named), single representative run reported, labels Correct/Partial/Incorrect by "human judgment" with a single annotator, no inter-rater agreement, no statistical tests.
Results (Correct/Partial/Incorrect, per repo): Shopizer no-graph 6/4/5, LLM graph 13/2/0, parser graph 15/0/0; ThingsBoard 14/1/0, 12/2/1, 14/1/0; OpenMRS 11/4/0, 13/1/1, 14/1/0. Totals: 31, 38, 43 of 45 correct. Cost end to end: Shopizer $0.04 / $0.79 (LLM graph) / $0.09 (parser graph); the two bigger repos $0.149 / $6.80 / $0.317. Time to build on Shopizer 2.81 s (parser) vs 200.14 s (LLM). Coverage: LLM extraction skipped or missed 377 files on Shopizer.
Why it is weaker than it looks:
- The no-graph baseline was already at 14 of 15 on ThingsBoard, so the whole parser-vs-no-graph gap comes from one repository (Shopizer, where the baseline scored 6 of 15).
- The LLM graph was a thin design: nodes are class names the model emitted, one generic "depends_on" edge type, files cut to 15,000 characters per batch, skipped files dropped. The parser graph had typed edges (injects, extends, implements). So the comparison is typed-structure vs untyped-structure as much as parser vs model.
- Parser graph was Java-only and misses reflection, dynamic dispatch (authors' own limitations).
Strength of the study: weak.
Stronger evidence, all indirect:
- Call-graph generation, 24 language models vs static analysers, Python and JavaScript (Venkatesh et al., EMSE; arXiv 2410.00603, https://arxiv.org/abs/2410.00603): static tools PyCG and Jelly "consistently outperform" the language models on call graphs, with models struggling on completeness and soundness; models beat static tools on Python type inference. I only saw the abstract page, not precision and recall figures. Strength: medium to strong for call edges specifically.
- Web-search summary (snippet only, not verified) of other call-graph studies listing redundancy, fabrication and missed calls as the dominant error types for model-built graphs, and one study reporting call-graph Jaccard similarity of 0.01 to 0.06 for model-built dataflow graphs. Treat as a warning, not a number.
- In HippoRAG 2 / GraphRAG-Bench the builder quality matters for prose: replacing GPT-4o-mini with GPT-4o as the graph builder moved MultiHop-RAG accuracy from 71.17 to 75.08 and temporal questions from 49.06 to 58.49 (2502.11371). So model-extracted graphs are sensitive to the extractor, and only about 65 percent of answer entities are in the graph.
- What models are good at in code, per the evidence: type inference (above), summaries and roles of files (2607.11046), and mentions in issues (LocAgent used GPT-4o to extract mentions; the small-agents study found mention extraction brittle: a strict extractor leaves 311 of 500 tasks without a mention).
- No one I found has benchmarked a MODEL-extracted code graph (relations such as "this module is responsible for billing", "business rule", "design intent") against a parser graph on questions where the relations are semantic, not syntactic. That is exactly where parsers cannot go, and it is the part the finished test did not cover.
Graphify (the owner's example): https://github.com/Graphify-Labs/graphify , about 146,900 stars and 14,100 forks as shown on the repository page on 2026-11-13. Its README states code is parsed locally with tree-sitter ("deterministic, no LLM"), documents, PDFs and media get a model pass, and each edge is tagged EXTRACTED or INFERRED. Clustering by Leiden (or Louvain fallback). The README's own worked examples report token reduction of 71.5x on a 52-file mixed corpus, 5.4x on 4 files, and about 1x on 6 files (httpx), where the baseline is reading the raw files. The README says the saving scales with corpus size and that small corpora fit in a context window anyway. The README states no accuracy evaluation of the graph itself. One of my fetches of the repository page also showed a benchmark table (LOCOMO n = 300; LongMemEval-S n = 50; an ERPNext cross-tool test with n = 6 and 82.0 vs 70.8 percent key-fact coverage against a grep baseline); a later fetch of the README on the main branch and of the folder listing showed no benchmark file, so I could not confirm that table and I do not rely on it. Strength of any Graphify effect claim: weak (self-reported, baseline is read-everything, tiny n where an n is given). Its star count is adoption.

---

## 4. What this means for the next test (my reading, labelled as such)

Where the owner is right:
- The finished test did not cover model-extracted meaning, summaries, community-summary retrieval, whole-corpus or orientation questions, or an agent in the loop. The GraphRAG literature mostly measures those. So the finished test cannot be read as a verdict on "graphs" in general; it is a verdict on parser-extracted typed facts for structural questions and for recall of co-changed files.
- A structural graph does help agents in the controlled code studies, especially small models and name lookup plus one hop. That is closer to what the finished test's typed queries did (about 31 tokens vs about 695) than to GraphRAG.
- The one study excluding model-extracted graphs is thin, as suspected.
Where the evidence does not support the owner's suspicion:
- Popularity (stars) of GraphRAG-type tools is not an effect size. Independent evaluations show small, inconsistent gains for graph methods on ordinary question answering; evaluation bias inflates the original claims; the token-matched control erased most of the gain in one benchmark.
- Graphify's own code graph is parser-built, so it does not demonstrate that model extraction beats parsing; it resembles the finished test's graph plus community detection.
- For single-fact lookup and detail questions, graphs lose or tie in every independent benchmark read here.
Candidate arms worth adding (each must be run at its strongest form, against a strong baseline, with a token-matched control and a no-retrieval floor):
1. Agentic grep plus the typed store as tools, in a real agent loop, scored on end-task success and total tokens. The only evidence on this comparison is two small, mixed studies; it is the question that matters.
2. Orientation questions ("what are the main areas of this repository and how do they relate") answered from community summaries vs from plain retrieval vs from read-everything map-reduce (TS). This is the use GraphRAG was built for and the finished test never asked. Include a community-validity control (does Leiden on this graph beat a degree-matched random graph?) given the unreviewed claim in 2.5.
3. HippoRAG 2 style personalised PageRank over a model-extracted entity graph of the docs and comments only, with the parser graph for code; compare with the parser-only PageRank. HippoRAG 2 is the most consistent graph method in the independent benchmarks and costs near plain retrieval at query time.
4. LazyGraphRAG-style no-LLM-at-index approach (noun-phrase graph plus query-time LLM) for the docs, because its index cost equals vector retrieval.
5. Summary representation (role-aware file summaries) as an added retrieval index, per 2607.11046; cost about $1.5 to $1.8 per repository there.
6. Use a no-retrieval floor and a token-matched plain retrieval control in every arm (2506.02404 and 2502.11371 both show these change the conclusion). Judge answers with a fixed, swapped-order, length-controlled procedure, or with ground-truth answers, not a single-order language-model judge (2506.06331).

---

## 5. What I could not verify

- Full text of 2606.22417 and 2607.11046 and 2610.33958 beyond what the fetch tool's summary returned (the PDF of 2606.22417 could not be decoded; the HTML summary was used). 2610.33958 and 2607.11046 were read only to about 100,000 characters out of 204,116 and 124,271.
- Whether the authors of 2606.22417 sell the tool they tested (strongly suggested by the arm name and linked repository, not confirmed).
- LocAgent, RepoGraph and CodexGraph numbers beyond their abstracts; the abstract pages did not contain the ablation tables.
- The CGM graph-vs-no-graph ablation (truncated).
- GraphRAG-Bench (Xiang) graph construction cost appendix (truncated) and the accuracy tables of the unified-framework paper (truncated).
- The Graphify benchmark table (conflicting fetches; no BENCHMARKS file found), and how its 71.5x is computed (the README does not say).
- DeepDiscovery (arXiv 2606.22906): PDF unreadable through the tool; contents unknown.
- HippoRAG 2's LightRAG F1 of 6.6 looks like a failed reproduction; I could not check.
- Anything on temporal knowledge graphs in the strict sense (graphs with time-stamped edges and validity intervals) as a retrieval structure for agents; this lane did not find a study, and the only "temporal" result here is about questions with time content (MultiHop-RAG), not about a temporal graph structure.
- Independent replication of LazyGraphRAG or BenchmarkQED numbers: none found; all results are from the same Microsoft group.
