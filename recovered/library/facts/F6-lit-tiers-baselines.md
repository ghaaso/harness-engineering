# F6 Fact sheet: model tiers and moving baselines

Stage: fact gathering only. No argument for or against E1 to E5. Labels: [measured], [estimated], [target], [guess], as the source says. "Vendor-reported" means the vendor ran it and no outside party checked. I did not read the repository for this lane. Every claim below was opened at its source on 2026-11-12 unless marked unconfirmed.

## (i) Can a weaker model match a strong one using the strong model's retrieved or written knowledge?

**AgentBrew** (arXiv 2607.16851, submitted 18 Jul 2026). A strong teacher agent turns the student's failures into validated notes. The notes sit in an external memory. No weight updates, and no teacher access at test time. Source: https://arxiv.org/abs/2607.16851 and full text https://arxiv.org/html/2607.16851
- Default pair: teacher deepseek-chat-v3.1, student Qwen3-14B. Student without memory, then with memory [measured, authors' runs]: MATH 71.66 to 75.96; GSM8K 86.12 to 88.17; MBPP 51.02 to 61.22; MBPP+ 68.83 to 71.43; AppWorld normal 22.00 to 31.55; AppWorld challenge 11.30 to 15.35.
- Terminal-Bench 2.0 (a different pair: teacher deepseek-v4-pro, student deepseek-v4-flash): student alone 45.3%, student with memory 51.6%, teacher alone 50.0% [measured]. Only 64 test tasks. Cost per task $0.04 against $0.06 for the teacher (33% lower). One-time brewing cost about $116.
- This is the one source I found where the student with memory reaches the teacher. It is a single benchmark with 64 tasks and one pair. On the other benchmarks the teacher-alone score is not reported, so the remaining gap is unknown.
- Transfer: notes did not carry well to a different student. Notes brewed on a strong surrogate student gave 74.92 on MATH for Qwen3-14B, against 75.96 for notes brewed on that student. The authors argue notes must be validated per student. Notes carry across tasks inside one benchmark (one note was used on 1,200 test tasks, 55.6% success when applied).
- Reflexion with extra test-time trials beat AgentBrew on math.

**Agent Memory Distillation** (arXiv 2608.07169). Training-free transfer from a teacher agent (GPT-5-mini) to 4B to 8B students through workflow, subtask and function memory. Average accuracy gain [measured]: AppWorld +27.2 points, BFCL V3 +11.2, ToolSandbox +3.4. Teacher effectiveness depends on the teacher's compatibility with the student. The abstract does not give the teacher-alone score, so the gap left is not stated. Source: https://arxiv.org/abs/2608.07169

**SkillsBench** (arXiv 2602.12670, NeurIPS 2026). Human-curated skill files raised average pass rate from 33.9% to 50.5% (+16.6 points) over 87 tasks in 8 domains and 18 model-harness setups; per-setup gains ran +4.1 to +25.7 [measured]. Source: https://arxiv.org/abs/2602.12670. Secondary reports (not confirmed at the paper): self-written skills net about -1.3 points; software engineering gain only about +4.5 points against +51.9 in healthcare. Source: https://www.theregister.com/2026/02/19/ai_agents_cant_teach_themselves/ . Meaning: knowledge written by a person helped; knowledge a model wrote for itself did not, in that benchmark.

**Repository context files** (arXiv 2602.11988, ICLR 2026). Context files did not generally improve coding task success and raised inference cost by over 20% on average [measured]; repository overviews did not help; files pay off when they state non-standard practices. Source: https://arxiv.org/abs/2602.11988

**Where the weaker model falls short.** Sonnet 5.5 vs Opus 5.5 gaps today (vendor-reported, no memory involved) are under (iii). I found no study that gives a student-with-retrieved-teacher-reasoning against teacher gap on real repository bug fixing (SWE-bench class). I found no study of cross-project reuse of such knowledge.

## (ii) Routing, cascades, and knowing when to escalate

**FrugalGPT** (arXiv 2305.05176, 2023). Authors report it can match the best single model (GPT-4) with up to 98% cost reduction, or beat GPT-4 by 4% at equal cost [measured, authors, 2023 models, abstract only; I could not see the conditions]. Source: https://arxiv.org/abs/2305.05176

**RouteLLM** (arXiv 2406.18665, ICLR 2025). Two-model routing (GPT-4 vs Mixtral-8x7B). Best router with data augmentation [measured]:
- MT-Bench: 13.4% of calls to GPT-4 gives 95% of GPT-4 quality; cost 3.66x lower than random routing.
- MMLU: 35.4% of calls gives 92% of GPT-4; 1.41x.
- GSM8K: 33.64% of calls gives 87% of GPT-4; 1.49x.
- Routers trained only on Arena preference data were near random on MMLU and GSM8K; they needed augmentation or in-domain data. Only two models tested. Authors flag that the benchmarks may not match real traffic. Source: https://arxiv.org/html/2406.18665v3 (abstract says "over 2 times" in some cases: https://arxiv.org/abs/2406.18665)
- The router learns difficulty from preference labels (human Arena votes, GPT-4 judge labels), not from the model's own view.

**SWE-Router** (arXiv 2607.00053, ICML 2026 workshop). The cheap model runs a few turns; a learned value head reads the partial trajectory and decides whether to restart on the strong model. Authors say it keeps most of the strong model's performance at much lower cost. The abstract page gives no numbers. A secondary read says weak models gpt-5-mini or deepseek-v3.2 and strong gemini-3-pro-preview, with route-AUC 0.627 (no partial trajectory) to 0.750 (3 turns): unconfirmed. The same read says weak and strong solve different subsets of tasks. Source: https://arxiv.org/abs/2607.00053 . Note: the escalation signal is a trained head on the trajectory, not the model's words.

**Self-knowledge of difficulty.** "Agentic Uncertainty Reveals Agentic Overconfidence" (arXiv 2602.06948): some agents that succeed 22% of the time predict 77% success; asking the agent to hunt for bugs gave the best calibration; judging before running often discriminated better than judging after [measured, abstract]. Source: https://arxiv.org/abs/2602.06948 . A secondary summary (not opened at source) adds an average post-run estimate of 73% against a 35% base rate, and a 2026 escalation study finding LLMs miscalibrated and inconsistent: https://arxiv.org/pdf/2604.08588 (unconfirmed). I found no benchmark of escalation thresholds on coding agents beyond SWE-Router.

## (iii) Release cadence: does the next mid tier match the previous top tier?

All dates and numbers from Anthropic announcements I opened. SWE-bench Verified (SWE-V) is cited only where the page gave a number; the benchmark and harness change between pages, so cross-row comparison is weak.

| Mid-tier release | Previous top-tier model | Gap in time | What the pages say |
|---|---|---|---|
| Sonnet 3.5, 21 Jun 2024 | Opus 3 (Mar 2024; date not opened) | about 3 months [estimated, date not verified] | Internal agentic coding eval: 64% vs 38% for Opus 3 [vendor-reported]. https://www.anthropic.com/news/claude-3-5-sonnet |
| Sonnet 4, 22 May 2025 | Opus 4 same day | 0 | SWE-V 72.7% vs Opus 4 72.5% [vendor-reported]. https://www.anthropic.com/news/claude-4 |
| Sonnet 4.5, 29 Sep 2025 | Opus 4.1, 5 Aug 2025 (SWE-V 74.5%) | about 2 months | Sonnet 4.5 SWE-V 77.2% [vendor-reported, 10-trial average]. https://www.anthropic.com/news/claude-sonnet-4-5 ; https://www.anthropic.com/news/claude-opus-4-1 |
| Sonnet 4.6, 17 Feb 2026 | Opus 4.5, 24 Nov 2025 | about 3 months | Claude Code users preferred Sonnet 4.6 over Opus 4.5 about 59% of the time; SWE-V 80.2% only with a prompt change, base score not given. https://www.anthropic.com/news/claude-sonnet-4-6 ; https://www.anthropic.com/news/claude-opus-4-5 |
| Sonnet 5, 30 Jun 2026 | Opus 4.8, 28 May 2026 | about 1 month | Anthropic says "close to" Opus 4.8; no number in the text. https://www.anthropic.com/news/claude-sonnet-5 ; https://www.anthropic.com/news/claude-opus-4-8 |
| Sonnet 5.5, 28 Sep 2026 | Opus 5.5, 22 Sep 2026 | 6 days | Terminal-Bench 4.0: Sonnet 5.5 70.6% vs Opus 5.5 66.4% (xhigh). FrontierCode 1.1: 46.2% vs 54.4%. CursorBench 4.0: 55.5% vs 57.8%. Anthropic says Opus 5.5 is still stronger on open-ended work. https://www.anthropic.com/news/claude-sonnet-5-5 ; https://www.anthropic.com/news/claude-opus-5-5 |

- Reading the table as facts: in every row the mid tier either matched or came within a few points of the top tier released in the previous months. The gap in time shrank from about 3 months to days.
- Sonnet 5.5 against Sonnet 5 [vendor-reported]: Terminal-Bench 4.0 10.3% to 70.6%; CursorBench 34.1% to 55.5%. These two Terminal-Bench numbers sit on a benchmark version the earlier Sonnet 5 release did not publish, so I treat the 10.3% as unverified in meaning.
- Opus 4.5 vs Sonnet 4.5 (same page): at medium effort Opus 4.5 matched Sonnet 4.5's best result with 76% fewer output tokens. https://www.anthropic.com/news/claude-opus-4-5
- Earlier anchors [vendor-reported SWE-V]: Sonnet 3.5 (Oct 2024) 49.0%, https://www.anthropic.com/news/3-5-models-and-computer-use ; Sonnet 3.7 (24 Feb 2025) 63.7% without scaffold, https://www.anthropic.com/news/claude-3-7-sonnet . I did not find a clean SWE-V number for Opus 4.5, 4.6, 4.8 or 5.x on the pages I opened (charts are images).
- Benchmarks themselves move: SWE-V is no longer quoted on the 2026 pages I opened; they use Terminal-Bench 4.0, FrontierCode, CursorBench.

**Other vendor (OpenAI).** Search snippets say GPT-5 scored 74.9% SWE-V against o3's 69.1% (o3 released 16 Apr 2025, GPT-5 mini 7 Aug 2025); the OpenAI page returned 403, so this is unconfirmed at source. GPT-6 Sol (22 Sep 2026, "mid-tier") and GPT-6.1 Sol (29 Sep 2026, $2 in / $10 out, a fifth of GPT-6 Astra's price): sources are secondary blogs, figures conflict (DeepSWE 65.3 to 68.8 for Sol; 75.2 for Sol 6.1 vs 73.2 to 74.1 for Astra), one says OpenAI published no SWE-bench for them: all unconfirmed. Opus 5.5's page lists GPT-6 Astra at 57.9% and GPT-5.6 Sol at 37.3% on Terminal-Bench 4.0 (Anthropic's table) https://www.anthropic.com/news/claude-opus-5-5 . Independent: Terminal-Bench 4.0 56.1% for GPT-6.1 Sol vs 59.1% for Astra, $1.82 vs $8.50 per task (secondary, unconfirmed): https://thenewstack.io/openai-gpt-6-1-sol/

## (iv) Price and cache ratios today (Anthropic docs, 2026-11-12)

Source: https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/models/overview . Per token, ratios only.

- Current lineup input price: Fable 5.2 : Opus 5.5 : Sonnet 5.5 : Haiku 5.5 = 8 : 4 : 2 : 0.1 (Haiku 0.5 above 100k-token prompts). Output follows the same shape (40 : 20 : 10 : 0.5), so output is 5x input in every tier.
- Top to mid: Fable 5.2 is 4x Sonnet 5.5; Opus 5.5 is 2x Sonnet 5.5; Sonnet 5.5 is 20x Haiku 5.5 on input.
- Earlier generation: Opus 4.1/4 was 15 in / 75 out vs Sonnet 4 at 3 / 15 (5x). Opus 4.5 to 4.8 at 5 / 25 vs Sonnet 4.6 at 3 / 15 (1.67x).
- Cache read vs fresh input: 0.1x for most models; 0.05x for Opus 5.5 and Sonnet 5.5; 0.025x for Fable/Mythos 5.1 and 5.2. Cache read vs output: Sonnet 5.5 read is $0.10 vs $10 output, 1:100.
- Cache write: 1.25x input (5-minute life), 2x (1-hour life). A cache read refreshes the life at no cost.
- Batch is 50% off. Cache miss on a changed prefix means a full-price re-read plus a write.
- A cached prefix sits in the order tools, system, messages; a change at one level invalidates it and all later levels; matching is exact. Min cacheable prompt: 512 tokens on 5.x current models. Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Memory tool and Fable 5.2 pricing show prices fell within a generation: Sonnet 5.5 input is 2/3 of Sonnet 4.6's.

## (v) What is already built in, and what was measured

- **Provider prompt caching.** Vendor gives no latency percentage on its page. Independent preprint "Don't Break the Cache" (arXiv 2601.06007, Jan 2026): caching cut API cost 41 to 80% and first-token time 13 to 31% across OpenAI, Anthropic, Google, on one benchmark (DeepResearch Bench, over 500 sessions, 10k-token system prompts) [measured]. Caching the full context could raise latency; caching the system prompt only was the most consistent. Source: https://arxiv.org/abs/2601.06007
- **Memory tool** (client-side files under /memories, on all current models; the model views memory first, then writes progress). Vendor claim, Sep 2025: memory plus context editing +39% over baseline, context editing alone +29%, and 84% fewer tokens in a 100-turn web search test; internal evaluation, baseline and metric undefined [vendor-reported]. Source: https://claude.com/blog/context-management . Docs give a multisession coding pattern (progress log, feature checklist) https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool . I found no independent evaluation of the memory tool.
- **Skills** (curated files): SkillsBench above is the independent evidence. **Project memory files** (AGENTS.md style): independent result above, no gain in success, over 20% more cost.
- Anthropic's docs describe adaptive thinking and an effort setting on every current model, so a cheaper model can be run at lower effort without a library. Default effort: Fable 5.2 high, Opus 5.5 medium, Sonnet 5.5 high, Haiku 5.5 medium. Source: models overview above.

## What the sources are silent on

- No source measures a cross-model reuse library on real repository work with a teacher-student gap.
- No source reports hit rates for retrieved bug-fix conclusions across projects.
- Release gaps: Opus 3 date, and the Opus 4.6/4.7/5 dates, I did not open. Opus SWE-V numbers for 4.5 and later are not in page text.
- OpenAI and Google numbers: not confirmed at a primary page.

## Top facts for E1 to E5
See the structured list returned with this report.
