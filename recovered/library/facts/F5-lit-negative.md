# F5. Published evidence of limits and failures of memory, experience reuse and knowledge stores

Stage: fact gathering only. No argument. Each item gives source, number, conditions, authors' stated limits. All numbers are MEASURED by the cited authors unless marked. "Opened" means I read the primary paper page or HTML. "Unconfirmed" means I only saw a search summary. Token counts are used where the source gives them; no money figures. Searches used generic terms only.

Note on the owner's list of names: I corrected or narrowed several from memory (see Gaps).

## (a) Memory reuse hurting agents

**A1. Experience-following and error propagation.** Xiong et al., "How Memory Management Impacts LLM Agents" (arXiv 2505.16067, v2 Oct 2025). https://arxiv.org/html/2505.16067v2 (opened)
- Agents copy past outputs when the new input resembles a stored input. In one synthetic task (RegAgent) the input-similarity to output-similarity correlation is about 1 (Pearson r near 1) at large memory.
- Adding every run to memory ("add-all") lowered scores versus a fixed 100-item memory: RegAgent 55.48 vs 67.53 success; EHR 13.05 vs 16.75 accuracy; AgentDriver 32.32 vs 40.11; CIC-IoT 59.90 vs 71.50.
- Strict admission (only checked-good runs) beat both: 70.95 / 38.50 / 51.00 / 85.40. Deleting by history helped on two of four tasks and was hurt or neutral on others.
- Conditions: mainly GPT-4o-mini as the agent; four agents; evaluators were LLMs, and results flipped with the evaluator choice. Memory of 100 to 180 items at start.
- Authors' limits: only add and delete studied; synthetic task; human check simulated by ground truth; no theory; uncalibrated LLM evaluators gave inconsistent results. The paper's own Tables 1 and 2 disagree slightly on one cell.
- Note: "Misaligned replay": records judged correct but retained gave only 44.1 to 54.8 % correct on EHR, versus 32.1 to 48.2 % for deleted ones, depending on the evaluator. Retained records still were often wrong.

**A2. Memory injection (poisoning).** MINJA, "Memory Injection Attacks on LLM Agents via Query-Only Interaction" (arXiv 2503.03704; authors not captured). https://arxiv.org/html/2503.03704v5 (opened)
- Injection success 98.2 %, attack success 76.8 % on average, using only normal queries to a shared memory bank. Models: GPT-4, GPT-4o. Prompt-level detection by GPT-4o caught 0 of 135 and 0 of 90 on two agents with the targeted prompt.
- Authors' limits: assumes a shared memory bank; large variance across victim-target pairs; prior legitimate memory lowers attack success by about 6 to 20 points.
- Independent replication, arXiv 2601.05504 https://arxiv.org/abs/2601.05504 (opened, abstract level): the high rates hold under idealised conditions; with pre-existing legitimate memories the attack "dramatically" weakens (no exact figure on the page). Their sanitiser needed careful trust thresholds: too strict blocks everything, too loose misses subtle attacks.
- AgentPoison (>80 % attack success, needs write access to the memory): number seen only through a search summary. Unconfirmed at source.

**A3. Reuse without a way to judge fit.** SWE-Exp (arXiv 2507.23361v2). https://arxiv.org/html/2507.23361v2 (opened)
- Experience bank built from earlier agent runs on SWE-bench Verified. DeepSeek-V3-0324: 37.8 % without experience, 42.0 % with (Section 6.2 says 37.2 %; the paper contradicts itself). Claude-4 Sonnet: 73.0 % with experience; no no-experience figure for that model.
- Tokens (DeepSeek): average 189.1K (baseline agent) vs 203.3K (SWE-Exp). Wall time 12m37s vs 15m49s. Retrieval plus rerank 37.5 s.
- Authors' limits: the agent has no robust way to judge whether a past experience applies, so it may reuse it wrongly; poor matches can degrade results; Python only; one underlying model; bank built from the same benchmark (same-repository and later runs excluded; training-data overlap cannot be ruled out).

## (b) Repository context files (AGENTS.md style)

**B1. Evaluating AGENTS.md.** Gloaguen, Mündler-Sasahara, Müller, Raychev, Vechev, arXiv 2602.11988 (v3 Sep 2026). https://arxiv.org/html/2602.11988v3 (opened)
- Success change versus no context file, in percentage points: SWE-bench Lite with LLM-written file: Sonnet-4.5 -1.2, GPT-5.2 -2.2, GPT-5.1 mini -0.1, Qwen3-30B +1.3 (average about -0.5). Their own benchmark (CTXbench, 138 instances, 12 repos): LLM-written file -8.0, +2.9, -3.6, +1.4 (about -2); developer-written file -2.9, +2.9, +1.5, +7.9 (about +2.4).
- Not statistically significant versus no file (p = 0.87, 0.37, 0.21). Developer vs LLM-written on CTXbench: p = 0.038.
- Cost rises: about +20 % (SWE-bench, LLM file) and +23 % (CTXbench, LLM file); developer file +6 % to +42 % by model. Extra steps per task: about +2.5 to +3.9.
- Abstract: instructions in the files are followed, but repository overviews are not helpful.
- Authors' limits: Python only; each agent run once per task; only task resolution measured; small sets (300 and 138). The text and table disagree on a cost figure ("at most 19 %" vs a +42 % cell).

**B2. Opposite result, small sample.** Lulla et al., arXiv 2601.20404. https://arxiv.org/abs/2601.20404 (found via search; numbers from search summary, unconfirmed at the paper)
- 124 pull requests, 10 repos, one agent (Codex). Median runtime -28.64 %; median output tokens 2,925 to 2,440 (-16.58 %). Task completion "comparable". Correctness not assessed. Five-page paper, no sign of peer review.

## (c) Weaker models and over-trust, anchoring

**C1. Retrieved content overriding correct knowledge.** ClashEval, Wu, Wu, Zou, arXiv 2404.10198. https://arxiv.org/abs/2404.10198 (opened, abstract)
- Models adopted wrong retrieved content over their own correct prior more than 60 % of the time. Six top models, over 1,200 questions, six domains. Less confident models adopt more; more absurd errors are adopted less.
- Page gives no per-model figures or limits.

**C2. Small models may not use what they retrieve.** Pandey, arXiv 2603.11513 (Mar 2026, single author, not peer reviewed). https://arxiv.org/abs/2603.11513 (opened, abstract)
- Five sizes, 360M to 8B (SmolLM2, Qwen2.5, Llama 3.1). Even with an oracle passage, models of 7B or less fail to extract the answer 85 to 100 % of the time on questions they could not answer alone. Adding retrieval destroys 42 to 100 % of answers they previously knew. Author calls RAG at this scale a possible net negative.
- Scope: small open models, not Sonnet-class. The source is silent on Sonnet-class models.

**C3. Strong-model memory transferred raw to a weaker model.** MemCollab, arXiv 2603.23234. https://arxiv.org/html/2603.23234 (opened)
- Memory built from Qwen2.5-32B trajectories, used by Qwen2.5-7B: average 57.1 (no memory) to 55.0 (raw 32B memory); HumanEval 42.7 to 34.1; MATH500 52.2 to 50.6.
- Same memory used by LLaMA-3-8B: average 41.7 to 36.3; GSM8K 73.0 to 56.6; MATH500 27.4 to 18.8.
- The authors' own method (contrastive filtering of model-specific traits) gave 71.6 and 53.9 averages. It needs a correctness signal when building memory (math and code with checkers). Memory building took 38.3 s vs 13.35 s for self-memory (one setting).
- The paper contains unexplained internal table mismatches (e.g. 57.6 vs 50.8 on one cell).
- Direct bearing: weaker model plus stronger model's raw memory sometimes fell below the no-memory baseline. Both models are open-weight; no Opus or Sonnet in the study.

**C4. Anchoring on a handed hint.** Lou and Sun, arXiv 2412.06593. https://arxiv.org/abs/2412.06593 (opened, abstract)
- Responses shift with biased hints; chain-of-thought, "ignore the hint" prompts, and reflection are "not sufficient". Page does not name models or compare strong with weak. A search summary says stronger models were also biased; unconfirmed at source.

**C5. Learnability gap in distillation.** Li et al., "Small Models Struggle to Learn from Strong Reasoners", arXiv 2502.12143 (ACL Findings 2025). https://arxiv.org/abs/2502.12143 (summary via search; unconfirmed at the paper body)
- Models of 3B or less do not reliably gain from long chain-of-thought data from larger teachers. This concerns fine-tuning, not in-context reuse; listed only because the mechanism is the same (small model and a strong model's reasoning text).

## (d) Semantic caches

**D1. vCache.** Schroeder et al., arXiv 2502.03771v5, ICLR 2026. https://arxiv.org/html/2502.03771v5 (opened)
- Static threshold (E5-large-v2, GPT-4o mini, 60,000 LM-Arena queries): threshold 0.99: error 2.5 %, hit 37 %; 0.98: 4.1 %, 53 %; 0.97: 5.2 %, 67 %.
- Search-queries set, threshold 0.99: error 1.7 % at 150k samples and still rising. Error had not converged, so these may understate.
- vCache with a user bound: bound 0.02 gave 0.5 % error and 41 % hits; 0.05 gave 2.0 % and 54 %. Headline: up to 12.5x more hits and 26x lower error than static baselines.
- Authors' limits: assumes i.i.d. data and a sigmoid model of correctness; guarantee may fail otherwise. Long answers need an LLM judge to check equivalence.
- Authors state correct and incorrect hits have overlapping similarity distributions.
- Scope: these are prompt-to-answer caches for chat and search queries, not code or reasoning notes. The source is silent on coding tasks.

**D2. MeanCache.** arXiv 2403.02694. https://arxiv.org/pdf/2403.02694 (search summary only; unconfirmed). On 700 unique queries, 89 false hits for MeanCache and 233 for GPTCache.

## (e) Retrieval and context growth

**E-1. Context Rot.** Hong, Troynikov, Huber, Chroma technical report, 14 Jul 2025. https://www.trychroma.com/research/context-rot (opened)
- 18 models; three task families. Performance falls with input length in all of them. A single distractor lowers results; four lower them more. Claude models abstained most; GPT models hallucinated most.
- LongMemEval, 306 prompts: about 113K tokens (full) vs about 300 tokens (focused). All models scored higher on the focused form.
- Authors' limits: tasks are deliberately simple (they expect real work to be worse); length not separated from task difficulty; mechanism unknown.

**E-2. Length alone hurts.** Du et al., arXiv 2510.05381. https://arxiv.org/html/2510.05381 (opened)
- Accuracy drops 13.9 to 85 % with longer input even with perfect retrieval. Llama-3.1-8B on MMLU: -24.2 % at 30K tokens of padding. Masking all distraction still cost at least 7.9 % at 30K. Closed models degraded less (GPT-4o -7.0 points on GSM8K at 30K; Gemini rose 6.2).
- Authors' limits: two open and three closed models, four tasks, one run each. Their fix (recite evidence first) needs perfect retrieval.

**E-3. Number of documents at fixed length.** Levy et al., arXiv 2503.04388. https://arxiv.org/abs/2503.04388 (opened, abstract). Up to 20 % drop as the document count grows with length held constant (a search summary said 10 %; I report the abstract). Qwen2.5 stayed stable.

**E-4. Corpus-size stress test.** M-RAG, arXiv 2603.26667 (search summary only; unconfirmed). A fixed-size dense retriever kept 54.7 % of its score on NarrativeQA as the candidate pool grew to the full set. One benchmark, in a method paper.

## (g) Code knowledge for coding agents

**G1. Navigation Paradox.** Paipuru, arXiv 2602.20048. https://arxiv.org/html/2602.20048v1 (opened)
- A graph tool for Claude Code (Sonnet 4.5), 270 planned trials, one small FastAPI app. Measures file coverage, not correct code. Overall coverage: no tool 82.0 %, BM25 87.1 %, graph 88.3 %.
- Semantic tasks: graph 88.9 vs 90.0 no tool vs 100 BM25. Structural tasks: graph 76.4 vs 79.7 vs 85.1. Hidden-dependency tasks: graph 99.4 vs 76.2. The agent used the graph on 42 % of trials (0 % on structural tasks).
- No token figures. Author limits: one codebase, one model, prompt-dependent, 12 of 270 trials lost to credit exhaustion. The paper has several internal number mismatches.

**G2. RepoGraph.** arXiv 2410.14684. https://arxiv.org/pdf/2410.14684 (search summary only; unconfirmed). +2.66 and +2.34 points resolve rate on SWE-bench Lite for RAG and Agentless; authors note larger cost increases when plugged into agent frameworks.

**G3. Graph raises token use 54 %.** A Zenodo paper reported by aiweekly.co (https://aiweekly.co/alerts/zenodo-paper-codebase-graphs-raise-llm-token-use-54). Page blocked (HTTP 403). UNCONFIRMED; do not cite as fact. Also see B1 (repository overviews not helpful; +20 % cost) and A3 (+14.2K tokens per task).

## (f) Case adaptation and knowledge decay

**F1. CBR for LLM agents (review).** Hatalis et al., arXiv 2504.06943. https://arxiv.org/pdf/2504.06943 (search summary only). Treats adaptation as the LLM generating a new solution from retrieved cases. Did not frame adaptation as a measured bottleneck in the snippets I saw. The classic CBR adaptation-knowledge problem: not found in a verified source.

**F2. Outdated documentation.** Tan, Wagner, Treude, arXiv 2212.01479 (EMSE 2024). https://arxiv.org/abs/2212.01479 (opened, abstract). Over 3,000 GitHub projects; "most" have at least one outdated code reference at some point. No exact share on the page. Documentation goes stale silently. The Aghajani et al. ICSE 2019 taxonomy (878 artefacts, 162 issue types) lists up-to-dateness; a "39 %" figure I had in mind could not be confirmed and is dropped.

**F3. ITSM known-error and knowledge-base decay.** I found only practitioner and vendor pages (Pluralsight, Knowmax, Helpfeel). They say records should be archived once a permanent fix exists, that decay is routine, and that agents skip articles when search is slower than fixing. No peer-reviewed measurement of KEDB decay rates found. These are opinion, not measurement.

## (h) Share of real work that repeats

**H1. Duplicate bug reports.** "Duplicate Bug Report Detection: How Far Are We?" (authors not captured on the page I read) arXiv 2212.00548. https://arxiv.org/html/2212.00548 (opened). Share of reports labelled duplicate, 2018 to 2020 window: Eclipse 5.2 % (1,447 of 27,583); Mozilla 10.4 % (20,189 of 193,587); Hadoop 2.7 %; Spark 3.7 %; Kibana 2.8 %; VSCode 7 % (4,386 of 62,092). Authors' limits: unmarked duplicates are missed, so true counts may be higher; six projects only. Other searched values (Firefox 20.5 %, from a different 2017 to 2022 sample) are unconfirmed.
- This measures user reports of the same bug, not an agent re-deriving a past fix.

**H2. Repeated fixes.** Zhong and Meng style studies; ICSME 2017 repeated-fix paper (https://people.cs.vt.edu/nm8247/publications/ruru-icsme-2017-camera-ready.pdf; PDF unreadable to my tool). From search summary only, UNCONFIRMED: 15 to 20 % of bugs involved repeated fixes across 341,856 fixes in Eclipse JDT, Firefox, LibreOffice; most repeated fixes were in code clones and the same package. A separate study: only 2.1 % and 3.2 % of new fixes could be built from one or several past fixes in the same project (5,735 fixes). Definitions differ, so the two figures are not comparable.

## Silences
- No source I opened measures a Sonnet-class model reusing an Opus-class model's stored reasoning on coding tasks, over time, with token counts. The closest are C3 (open 7B/8B models, math and code) and A3 (SWE-Exp).
- No source tests cross-project reuse of a problem-solution store for coding agents.
- No source gives an equivalent of the knowledge store's "applicability check" accuracy.
- No source measures semantic cache false hits on engineering or debugging queries.
- No measured decay rate for known-error databases (only vendor opinion).
