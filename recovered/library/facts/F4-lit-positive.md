# F4 fact sheet: the strongest published evidence that reusing stored reasoning makes agents cheaper, faster, better

Stage: fact gathering. No argument either way. Every figure was read at the source page named. Labels: measured = reported by the paper's own experiment; target/estimate = stated as such. "Not reported" means the source is silent. Money figures are quoted only where the paper gives no token count; ratios are fine.

## 1. Per-source facts

### Agentic Plan Caching (APC), Zhang, Wornow, Wan, Olukotun, NeurIPS 2025
https://arxiv.org/html/2506.14852v2 (v2, Jan 2026; v1 title was "Cost-Efficient Serving of LLM Agents via Test-Time Plan Caching")
- Tasks: FinanceBench, QASPER, TabMWP, AIME 2024/25, GAIA. Cache is filled at test time from the served workload. Per-benchmark repetition rate is not reported. The paper says GAIA task descriptions "rarely recur."
- Models: GPT-4o large planner; LLaMA-3.1-8B small planner/actor; GPT-4o-mini for keyword extraction and template generation.
- Measured, averages: cost down 50.31%; latency down 27.28%; 96.61% of the accuracy-optimal (always-large-planner) accuracy kept. Cache overhead 1.04% of cost on average; 1.31% when nothing hits.
- Measured, GAIA (Open Deep Research): cost 69.02 to 16.27 dollars (-76.42%), accuracy 37.58% to 36.97%.
- Measured, FinanceBench: APC 85.50% accuracy vs full-history caching 72.00%. Latency for 100 queries at 46% hit rate: 1959 s (always large), 1005 s (always small), 1425 s (APC).
- Hit rate vs cache size: 2% at size 1, 46% at size 100. Cold start: 14.29% hit rate at the 20th percentile of queries, 48% at the 100th.
- Baselines: always-large, always-small, semantic caching at 80/85/90% thresholds (many false hits, big accuracy loss), full-history caching. At fuzzy threshold 0.6 accuracy fell to 77%.
- Weaker model using stronger model's plans: this is the design. A miss runs the large planner and its plan becomes a template; a hit has the small planner adapt it. The paper does not separately test "small model without the cache" against "small model with large-model templates" beyond the cost-optimal baseline.
- Transfer across tasks/domains: not evaluated. Matching is by keyword inside one workload.
- Build/maintain cost: keyword extraction about 0.005 dollars per FinanceBench run; template generation about 0.0163 per run and about 3.99 s per entry. Pre-warming is suggested, not tested.

### ReasoningBank, Ouyang et al. (Google), ICLR 2026
https://arxiv.org/html/2509.25140v1 and https://arxiv.org/abs/2509.25140
- Tasks: WebArena (684 tasks), Mind2Web (1,341), SWE-Bench-Verified (500), streamed one by one. Whether tasks repeat is not stated.
- Models: Gemini-2.5-Flash, Gemini-2.5-Pro, Claude-3.7-Sonnet. Same model is agent, memory extractor and judge.
- Measured, WebArena success, no memory to ReasoningBank: Flash 40.5 to 48.8; Pro 46.7 to 53.9; Claude 41.7 to 46.3. Steps: Flash 9.7 to 8.3; Pro 8.8 to 7.4; Claude 8.0 to 7.3.
- Measured, SWE-Bench-Verified resolve rate: Flash 34.2 to 38.8 (steps 30.3 to 27.5); Pro 54.0 to 57.4 (steps 21.1 to 19.8).
- Mind2Web task success is tiny in absolute terms (cross-task Flash 3.3 to 4.8; cross-domain 1.0 to 1.6).
- Parallel test-time scaling with memory (WebArena Shopping, Flash, k=5): 55.1 vs 52.4 without memory-aware scaling.
- Retrieving more hurt: k=1 gave 49.7; k=2/3/4 gave 46.0/45.5/44.4.
- Failed trajectories as memory helped: 46.5 (success only) to 49.7.
- Weaker model with stronger model's memory: not tested.
- Memory build cost: not quantified (up to 3 items per trajectory, LLM judge).

### Agent Workflow Memory (AWM), Wang, Mao, Fried, Neubig, 2024
https://arxiv.org/html/2409.07429v1
- Tasks: WebArena (online) and Mind2Web (offline and online). Many tasks come from shared templates; the paper built a cross-template subset to test that.
- Measured, WebArena, GPT-4: success 35.5 vs 23.5 BrowserGym baseline (51.1% relative); steps 5.9 vs 7.9 baseline (about 2 fewer). Human-written-workflow system SteP scored 33.0. Cross-template subset: AWM 33.2 vs 20.5 baseline. Most gain appeared within about 40 examples.
- Mind2Web cross-task, GPT-4, step success 45.1 vs 36.2; task success 4.8 vs 2.0. Online mode did best on unseen domains (step success 35.5 vs 18.6 baseline).
- Same model induces workflows and acts. Strong-induces-for-weak: not tested. Induction cost and tokens: not reported.
- Internal inconsistency: abstract says 24.6% relative gain on Mind2Web; section 3.2.1 gives 4.0-8.9%.

### ExpeL, Zhao et al., AAAI 2024
https://arxiv.org/html/2308.10144v3
- Tasks: ALFWorld, HotpotQA, WebShop, FEVER (transfer). Task templates repeat in ALFWorld by construction.
- Measured: ALFWorld 40.0 (ReAct) to 59.0; HotpotQA 28.0 to 39.0; WebShop reward 0.666 to 0.701.
- Design fact: insights were extracted by gpt-4-0613; the acting agent was gpt-3.5-turbo-0613. So the stronger-writes, weaker-reads setup is the default design. No separate "gpt-3.5 wrote its own insights" comparison was read in the part I fetched.
- Transfer HotpotQA to FEVER, success: ReAct 63; ExpeL transfer 70 (65 without task demos).
- Cost: not in dollars. Tokens per HotpotQA trajectory about 4,310 for ExpeL vs 1,320 for ReAct (more tokens, not fewer).

### Dynamic Cheatsheet (DC), Suzgun et al., 2025
https://arxiv.org/html/2504.07952 and https://arxiv.org/abs/2504.07952
- Tasks: AIME 2020-25, GPQA-Diamond, Game of 24, Math Equation Balancer, MMLU-Pro. Game of 24 and Equation Balancer are one repeated template.
- Measured: GPT-4o Game of 24 10.0 to 99.0 (reusing a stored Python solution); Equation Balancer Claude 44.8 to 100. AIME 2024 Claude 3.5 Sonnet 23.3 to 50.0. GPQA-Diamond Claude 59.6 to 68.7.
- Weaker models, measured: Claude 3.5 Haiku AIME 2024 10.0 to 36.7 (best variant), GPQA 43.4 to 49.0, but AIME 2025 drops under one variant. GPT-4o-mini gains small or negative (GPQA 34.3 to 32.3). The paper says small models "struggle to fully leverage" the memory.
- Strong curator feeding a weak model: not tested. Same model writes and reads.
- Cost: tokens per answer on AIME 2024 rose from 370 (baseline) to 1,035 to 1,831 (memory variants). No latency given. R1-style reasoning models showed minimal or inconsistent gains. Wrong heuristics can persist.

### ACE (Agentic Context Engineering), Zhang et al., ICLR 2026
https://arxiv.org/html/2510.04618v2
- Tasks: AppWorld, FiNER, Formula (finance). Repetition not analysed.
- Model: DeepSeek-V3.1 in all roles. Measured AppWorld average 59.4 vs 42.4 ReAct base (+17.0); online 59.5. Roughly ties the IBM CUGA agent (60.3, GPT-4.1 based) on average; ahead by 8.4 points TGC on test-challenge (online).
- Adaptation cost vs other adaptive methods (not vs no memory): AppWorld latency down 82.3% and rollouts down 75.1% vs GEPA; FiNER latency down 91.5% and token cost down 83.6% vs Dynamic Cheatsheet.
- Without labels: AppWorld still 57.2; finance online FiNER fell 3.4 points below base.
- Weaker-model test: none. The paper says it needs a reasonably strong reflector.

### Agent KB, Tang et al., 2025
https://arxiv.org/html/2507.06229v5
- Tasks: GAIA (165), HLE bio/chem (149), GPQA (198), SWE-bench Lite (300).
- Measured, GAIA, smolagents GPT-4.1: 55.2 baseline pass@1; 61.2 at pass@1, 73.9 at pass@3. The authors note baselines are pass@1 only, so the fair gain is +6.1 points. SWE-bench Lite OpenHands GPT-4.1 (100 iterations): 28.7 baseline; 45.7 at pass@3.
- Cross-domain transfer, measured and asymmetric: reasoning-derived experience gave 37.0 on SWE-bench Lite; SWE-derived experience gave 56.4 on GAIA (below the 61.2 pass@1 with the full KB; baseline pass@1 is 55.2).
- Strong-to-weak: not tested.
- Build cost: about 10.88 dollars one-off (5.1M prompt, 768K completion tokens); seed of 80 human-written trajectories; about 9,500 experiences. Retrieval adds about 0.27 on an 86.0 run (GAIA); about 0.004 per SWE issue.

### Memento, Zhou et al., 2025
https://arxiv.org/html/2508.16153v2
- Models: GPT-4.1 planner, o4-mini executor (o3 for GAIA). Measured: GAIA validation 87.88% pass@3, test 79.40%; DeepResearcher F1 66.6 vs 51.8 prior best.
- Case bank, K=4 retrieved: 64.5 F1 vs 59.9 at K=0. More cases did not help. Bank saturates (about 33k examples).
- Out-of-distribution (trained on four QA sets, tested on three others): +4.7 to +9.6 points.
- Caveats from the paper: GAIA validation memory was built on the validation set; suspected contamination on DeepResearcher. Weak-model reuse: not tested. Cost: token counts per GAIA level (about 26k to 121k input), no savings claim.

### SWE-Exp, Chen et al., 2025
https://arxiv.org/html/2507.23361v2
- Task: SWE-bench Verified (500). Bank built by running an agent on the same benchmark. Same-repo experience excluded (or only later same-repo ones; the paper states both rules).
- Measured Pass@1: DeepSeek-V3-0324 42.0 vs about 37.2-37.8 without experience (paper gives both); Claude-4 Sonnet 73.0 vs 70.4-70.8 for the best other frameworks.
- Cost, measured on DeepSeek: tokens 189.1K to 203.3K per instance (up 7.5%); wall time 12m37s to 15m49s; retrieval 37.5 s. So tokens and time rose.
- Bank size: gains level off at about 300 experiences; more than 1 retrieved experience lowered score (42.0 at 1, 39.8 at 2, 39.0 at 4).
- Strong-to-weak and build cost: not reported.

### Voyager, Wang et al., 2023
https://arxiv.org/abs/2305.16291
- Minecraft, GPT-4 via API. Measured vs prior best: 3.3x unique items, 2.3x distance, up to 15.3x faster tech-tree milestones. Skill library carries to a new world. One domain; not software.

### Sleep-time compute, Lin et al., 2025
https://arxiv.org/html/2504.13171
- Measured: about 5x less test-time compute for the same accuracy (Stateful GSM-Symbolic, Stateful AIME); up to 13% and 18% accuracy gain with more sleep-time compute; 2.5x lower cost per query across 10 queries on one context (assumes test-time tokens cost 10x sleep-time tokens, so this is a modelled figure).
- Efficacy tracks how predictable the query is. Agentic SWE case study: 33 PRs, about 1.5x fewer test-time tokens at low budgets; at high budgets standard compute scored better.

### Semantic caching of LLM calls
- GPT Semantic Cache https://arxiv.org/abs/2411.05276: API calls down up to 68.8%; hit rates 61.6-68.8%; positive-hit accuracy above 97% (abstract only; dataset not read, repeated-query test set per the search summary).
- MeanCache https://arxiv.org/pdf/2403.02694 (read via search summary only, unconfirmed at source): on 250 queries that should all miss, GPTCache gave 54 false hits, MeanCache 3. Vendor-style comparison.
- Practitioner blogs (not peer reviewed, unconfirmed): 20-45% production hit rates; false positives rise as the threshold drops.
- GPTCache's "10x cost, 100x speed" is marketing, no paper.

### Teacher-to-student memory (the closest match to E3)
- AgentBrew https://arxiv.org/html/2607.16851 (2026): teacher DeepSeek-Chat-v3.1, student Qwen3-14B. Student baseline to student with memory: MATH 71.66 to 75.96; MBPP 51.02 to 61.22; AppWorld normal 22.00 to 31.55 (challenge 11.30 to 15.35). Terminal-Bench 2.0 (64 tasks): student 45.3, teacher 50.0, student with memory 51.6; cost 0.04 vs 0.06 dollars per task. One-time build about 116 dollars. Limits: most drafted notes fail validation; a 3-round Reflexion beat it on math (80.06 vs 75.96 MATH); on AppWorld the student reached 31.55 against 46.4 for the stronger DeepSeek student. Gains were small where the student could not execute.
- Agent Memory Distillation https://arxiv.org/abs/2608.07169 (abstract only): teacher GPT-5-mini; four 4B-8B students; average gains +27.2 (AppWorld), +11.2 (BFCL V3), +3.4 (ToolSandbox) points. Gap to teacher and cost: not in the abstract.
- ExpGraph https://arxiv.org/abs/2605.30712 (abstract only): frozen executors; +12.1% (smaller) / +4.5% (larger) on static tasks and +21.4% / +12.7% on agentic tasks over the strongest baseline; interaction steps down up to 21.6%.

### Counter-evidence a proponent should know (same lane: coding agents)
- Evaluating AGENTS.md (Gloaguen et al., ICLR 2026) https://arxiv.org/abs/2602.11988: repository context files do not generally raise success and add over 20% inference cost on average. This is static context, not retrieved solved-problem entries.
- SWE-Bench-CL https://arxiv.org/abs/2507.00014: a benchmark for continual learning in coding agents; no results found for memory vs no memory.

## 2. What I could not confirm
- No source tests a strong model's stored experience against a weak model alone with a matched Opus-vs-Sonnet style comparison on real software work and reports parity.
- No source reports cross-repository coding transfer with numbers (SWE-Exp claims it, shows no ablation).
- No 2026 evaluation of vendor memory tools or team knowledge bases for coding agents with cost numbers.

## 3. Best-case numbers an honest proponent could cite

E1 (fewer tokens). APC: cost down 50.31% on average, 76.42% on GAIA, accuracy kept at 96.61% (measured, two-tier GPT-4o/small-model planners, keyword-matched plan templates inside one workload). AgentBrew: cost per Terminal-Bench task 0.04 vs 0.06 (33% lower) once the student replaced the teacher (measured). ACE: 83.6% lower token cost than Dynamic Cheatsheet on FiNER (this compares memory methods, not memory vs none). Conditions: the 50% figure depends on the hit rate (46% at 100 entries) and a repeated workload. Counter: ExpeL and SWE-Exp used more tokens, not fewer, and DC tokens rose 2.8-5x per answer.

E2 (faster). APC latency down 27.28% on average (measured). AWM WebArena steps 5.9 vs 7.9 (about 25% fewer; measured). ReasoningBank steps down 6-15% on WebArena. Sleep-time compute about 5x less test-time compute on predictable queries (measured), 1.5x fewer tokens in a 33-item SWE case. Voyager up to 15.3x faster milestones (Minecraft). Conditions: web or tool tasks with repeated structure. SWE-Exp wall time rose 25%.

E3 (weak model matches strong). Best: AgentBrew Qwen3-14B-class student with a teacher's notes reached 51.6 vs teacher 50.0 on Terminal-Bench 2.0 (64 tasks, measured, student/teacher are DeepSeek flash vs pro). Agent Memory Distillation: 4B-8B students up 27.2 points on AppWorld (gap to teacher not read). ExpeL: GPT-4 insights read by GPT-3.5 raised ALFWorld 40 to 59. APC: small planner reached 96.61% of large-planner accuracy. Conditions: tool-use and web tasks, one benchmark family at a time, teacher gap smaller than Sonnet vs Opus is unknown. Counter: AppWorld student 31.55 vs strong student 46.4; DC small models gain unreliably; no paper ran Sonnet vs Opus.

E4 (reuse across projects, zero to 100). Best: Agent KB shared experience across frameworks and domains (GAIA 55.2 to 61.2 pass@1; 37.0 on SWE-bench from reasoning experience); Memento out-of-distribution +4.7 to +9.6 points; ExpeL HotpotQA to FEVER 63 to 70; AWM cross-domain step success 35.5 vs 18.6; Voyager skills carry to a new world. Conditions: neighbouring benchmarks of the same type. Counter: transfer was asymmetric in Agent KB; SWE-derived experience gave no gain on GAIA; APC did not test transfer; no cross-repository coding result with numbers.

E5 (accurate, efficient lookup). APC: semantic caching at 80-90% thresholds lost large accuracy; keyword matching kept 96.61%. GPT Semantic Cache: hit rates 61.6-68.8% and above 97% correct hits (abstract). Retrieval cost small: Agent KB 0.27 added on an 86.0 run; APC overhead 1.04%. Retrieval precision limits: ReasoningBank, Memento and SWE-Exp all got worse with more than 1-4 retrieved items; hit rates were 2% to 46% depending on cache size.
