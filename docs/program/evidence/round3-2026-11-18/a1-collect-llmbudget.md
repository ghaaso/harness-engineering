# a1 collect llmbudget: model work under a token or cost budget

All paths below are under `docs/program/evidence/round3-2026-11-18/papers/budget/<short>/`. Each folder holds `paper.pdf`,
`paper.txt` (pdftotext -layout; two-column papers come out interleaved) and `raw.txt` (pdftotext without -layout, one
paragraph per line). Every "line N" names the file it is in. Fetched 2026-11-19. Searched: titles and topic words only.

## Gate summary
1. Snell 2024: compute-optimal allocation by difficulty, "up to 4x less test-time compute" than best-of-N on MATH, PaLM 2-S* (paper.txt 111-114, 321); quoted. Difficulty came from an oracle check (raw.txt 179).
2. TALE: 67 % fewer output tokens, 59 % lower expense, under 3 points of accuracy lost, GPT-4o-mini, MathBench-style sets, baseline vanilla CoT (paper.txt 95-97, 494-495); quoted.
3. s1: a thinking-token cap is exact on the low side, flattens on the high side: AIME24 50 % to 57 %, flat after about 6 times (raw.txt 9, 395, 728); quoted.
4. AutoMix: "reducing computational cost by over 50% for comparable performance", five models, five datasets, fixed cost ratios 1:60 to 1:200 (raw.txt 7, 224, 467); quoted.
5. BATS / Budget Tracker: a tool-call budget shown to the agent; same accuracy at 10 vs 100 budget, 31.3 % lower cost, Gemini-2.5-Pro, BrowseComp (raw.txt 124, 187); quoted.
6. INTENT: an agent told its price still broke a hard budget in 32.8 % of tasks (GPT 4.1 mini); a planner enforces it (raw.txt 339); quoted.
7. ITBC (dual budget, VOI score): "positive aggregate gains", small and stated by cell (raw.txt 3, 20); quoted for the abstract and setup only.
8. Anthropic multi-agent research post (self-reported): agents about 4x and multi-agent about 15x the tokens of chat; token use explains 80 % of variance on BrowseComp (page.txt 36-37); quoted, company's own figure.
9. No source read paces work against a refilling allowance (window share left against time share left). Marked: not found in these sources.

## From the library
- o2-0320 (Hybrid LLM, quoted): 20 % / 40 % to the small model for at most 1 % / 4 % loss with a medium gap, 10.3 % loss at 40 % with a large gap. Used as the reference for AutoMix.
- o2-0321 (RouteLLM, quoted): 3.66 times cheaper at 95 % of GPT-4 on MT Bench, 1.41 times on MMLU, 1.49 on GSM8K; chat-only routers no better than random on MMLU. Not collected again.
- o2-0322 (FrugalGPT, quoted): 59 to 98 % lower cost in dollars at the best single model's quality. Not collected again.
- o2-0323 (mixture-of-thought cascades, quoted): 0.929 against 0.931 at 40 % of the cost, no trained scorer. Not collected again.
- o2-0407 (hypothesis, reasoned): cheaper model only where its measured gap is small, count tokens not money. The papers below support the tokens-not-money point (AutoMix and TALE count tokens or token-priced cost; FrugalGPT counts dollars).
- r57-0409, r57-0408 (hypotheses): the allowance enters as one more width; it is a budget, not a rate. Nothing below tests this.
- Not recorded: Snell, TALE, s1, AutoMix, BATS, INTENT, ITBC, the Anthropic post (a lookup of `cheaper`, `RouteLLM`, `FrugalGPT`, `Hybrid`, `budget` found none).

## Papers

### P1. Snell, Lee, Xu, Kumar, "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters", arXiv 2408.03314, 2024. Read from: https://arxiv.org/pdf/2408.03314. Saved: snell/paper.txt. Read: abstract, introduction, sections 3 to 7 by search (not every appendix).
- Problem: with a fixed inference budget, how to spend extra tokens on a prompt (parallel samples, revisions, search against a verifier).
- Mechanism: classify each prompt into a difficulty bin from the model's own pass@1; per bin pick the method and the split between parallel and sequential compute that does best at that budget. Easy prompts: sequential revision; hard prompts: parallel or search.
- Result: "we can improve the efficiency of test-time compute scaling by more than 4x compared to a best-of-N baseline" (paper.txt 22-23). "in a FLOPs-matched evaluation, we find that on problems where a smaller base model attains somewhat non-trivial success rates, test-time compute can be used to outperform a 14x larger model" (paper.txt 24-25). "with the most challenging questions, we observe very little benefits from scaling up test-time compute" (paper.txt 163-164, as extracted: "with the most challenging questions, we observe very little benefits").
- Measured gain: up to 4x less test-time compute than best-of-N at equal accuracy (paper.txt 111-114, 321, 551); baseline best-of-N; workload MATH, PaLM 2-S* (Codey) base model (paper.txt 323); revisions and PRM search.
- Assumes: question difficulty known; "assessing a question's difficulty as described above assumes oracle access to a ground-truth correctness checking function, which is of course not available upon deployment" (raw.txt 179); a verifier of useful quality; one benchmark of maths problems; a single model family.
- With model sessions (reasoned): our units are coding or research units with no cheap correctness check, so the oracle difficulty bin is not available; a unit's difficulty must be estimated from earlier runs of the same kind. The result is a sizing rule for repeated samples, not for a refilling window. A rerun is not the same run, which is what makes best-of-N work here and also what makes a redo cost tokens again.
- Needs to know before use: pass rate per kind of work and model (measured), the verifier's accuracy, tokens per sample.
- Status: quoted.

### P2. Han, Wang, Xu and others, "Token-Budget-Aware LLM Reasoning" (TALE), arXiv 2412.18547, v6. Read from: https://arxiv.org/pdf/2412.18547. Saved: tale/paper.txt. Read: abstract, method, main tables by search.
- Problem: chain-of-thought output is longer than needed and costs tokens.
- Mechanism: ask the model (or a trained estimator) for a per-question token budget and put "use less than N tokens" in the prompt (TALE-EP); or train the model to hold to budgets (TALE-PT). Observed "token elasticity": too small a budget makes the cost rise again (paper.txt 303-306).
- Result: "On average, TALE-EP achieves a 67% reduction in token usage while maintaining accuracy with less than a 3% decrease. TALE-PT cuts token usage by around 50% compared to Vanilla CoT" (paper.txt 94-99). "TALE-EP reduces output token costs by 67%, lowers expenses by 59%, and maintains competitive performance compared to the vanilla CoT approach" (paper.txt 494-495).
- Measured gain: 67 % fewer output tokens, 59 % lower expense, accuracy 80.22 % average, baseline vanilla CoT, GPT-4o-mini, MathBench sets plus GSM8K-type sets (paper.txt 492-494). On one set TALE-EP 81.03 % against vanilla CoT 83.75 % (raw.txt 627).
- Assumes: an "implicit monotonicity assumption" that a budget that works stays working when raised, stated as "may not strictly hold in every instance" (raw.txt 167); maths word problems; the model obeys a stated budget.
- With model sessions (reasoned): the 67 % applies to the model's own reasoning text in short answers; a unit of tens of minutes is mostly tool output and file reads, which a prompt budget does not shrink. The elasticity result (a too-small budget costs more) matches the owner's "rerun is not the same run".
- Needs to know before use: the output share of a unit's tokens, per kind of work (measured from transcripts).
- Status: quoted.

### P3. Muennighoff and others, "s1: Simple test-time scaling", arXiv 2501.19393. Read from: https://arxiv.org/pdf/2501.19393. Saved: s1/paper.txt. Read: abstract, budget forcing, limits.
- Problem: control the thinking tokens of a reasoning model.
- Mechanism: past a cap, force the end-of-thinking delimiter; to spend more, suppress it and append "Wait".
- Result: "scaling s1-32B with budget forcing allows extrapolating beyond its performance without test-time intervention: from 50% to 57% on AIME24" (raw.txt 9). "it eventually flattens out at six times. Suppressing the end-of-thinking token delimiter too often can lead the model into repetitive loops" (raw.txt 395). "for 12 out of the 30 evaluation questions the model generates a response that exceeds the context window leading to a large performance drop" (raw.txt 733).
- Measured gain: 50 % to 57 % on AIME24 (30 questions), Qwen2.5-32B-Instruct fine-tuned on 1,000 examples; the cap is also used as a stop to avoid loops (raw.txt 398).
- Assumes: a trained reasoning model, maths, sequential thinking within one context window.
- With model sessions (reasoned): a hard cap that ends a unit and asks for a best answer is the mechanism that bounds a unit's tokens; the flat tail means more tokens beyond a point buy little. 30 questions is a small sample.
- Needs to know before use: the cap per kind of work; where the curve flattens (measured).
- Status: quoted.

### P4. Aggarwal, Madaan and others, "AutoMix: Automatically Mixing Language Models", NeurIPS 2024, arXiv 2310.12963. Read from: https://arxiv.org/pdf/2310.12963. Saved: automix/paper.txt. Read: abstract, method, results by search.
- Problem: route to a bigger model only when the small model's answer looks unreliable.
- Mechanism: the small model checks its own answer by few-shot self-verification; a POMDP router decides to accept or escalate, with the noisy verifier as the observation. Scores with IBC, the slope of gain per extra cost against always-the-big-model.
- Result: "reducing computational cost by over 50% for comparable performance" (raw.txt 7). "AutoMix-POMDP is the only method that yields positive gains across all configurations ... best performance observed on the DIPLOMAT dataset, averaging 122% across all models" (raw.txt 467).
- Measured gain: over 50 % cost reduction at comparable performance; IBC up to 122 % on DIPLOMAT; baseline always-use-GPT-4, plus FrugalGPT and HybridLLM; GPT-3.5, Llama2-13B, Mistral-7B as small, GPT-4 as large; five datasets; accuracy range 30 % to 90 %, gap 8 % to 50 % (raw.txt 467).
- Assumes: cost is a fixed ratio between models (1:60 to 1:200, "we model fixed costs", raw.txt 224, 332), per query; short context-answer tasks.
- With model sessions (reasoned): the fixed cost ratio does not hold for a unit whose token count varies by run; a self-check by the small model costs another call. Whether it holds for coding units is not tested here (library o2-0407 says untested on coding).
- Needs to know before use: cost ratio in tokens by kind of work; the small model's self-check accuracy by kind.
- Status: quoted.

### P5. Liu and others (Google), "Budget-Aware Tool Use Enables Effective Agent Scaling" (BATS), arXiv 2511.17006 v2. Read from: https://arxiv.org/pdf/2511.17006. Saved: bats/paper.txt. Read: abstract, introduction, section 2, experiments by search.
- Problem: agents given a larger tool-call budget do not use it well: "agents lack budget awareness and quickly hit a performance ceiling" (raw.txt 5).
- Mechanism: a Budget Tracker inserts the remaining budget after each tool result; BATS adds planning and verification that deepen a lead or switch direction by what is left.
- Result: "Budget Tracker achieves comparable accuracy with less budget (10 vs. 100), while using 40.4% fewer search calls, 19.9% fewer browse calls, and reducing overall cost by 31.3%" (raw.txt 124, 187). Under 100 tool uses BATS "obtaining 24.6% on BrowseComp, 46.0% on BrowseComp-ZH and 27.0% on HLESearch using Gemini-2.5-Pro" (raw.txt 370).
- Measured gain: 31.3 % lower unified (token plus tool) cost at comparable accuracy; baseline ReAct at budget 100; BrowseComp (1,266 questions), Gemini-2.5-Pro (raw.txt 124, 363).
- Assumes: the budget is in tool calls, chosen because "pre-determining an accurate token budget for multi-step agentic tasks is often impractical" (raw.txt 65); budget fixed per question; search tasks.
- With model sessions (reasoned): the finding that a visible remaining budget changes behaviour is the nearest thing here to our case, but it is a per-unit budget and not a window that refills. Its own remark that a token budget is hard to set in advance matches our rough token counts.
- Needs to know before use: tokens per tool call by kind of work; a per-unit allowance.
- Status: quoted.

### P6. Liu and others, "Budget-Constrained Agentic Large Language Models: Intention-Based Planning for Costly Tool Use" (INTENT), arXiv 2602.11541. Read from: https://arxiv.org/pdf/2602.11541. Saved: intent/paper.txt. Read: abstract, setup, Table 1 text, robustness.
- Problem: an agent under a hard money budget with priced tools.
- Mechanism: a hierarchical world model predicts the next tool uses and risk-calibrated cost, and blocks a plan that would exceed the budget.
- Result: "providing explicit cost feedback (PROMPT) improves pass rate over RAW, it still violates budgets in a substantial fraction of tasks (a notable 32.8% for GPT 4.1 mini)" (raw.txt 339). INTENT "strictly enforces hard budget feasibility" (raw.txt 9, abstract).
- Measured gain: hard budget respected in all tasks against 32.8 % violations for the prompt-only baseline; the size of the success gain was not extracted here (see Table 1 at raw.txt 348). Cost-augmented StableToolBench, GPT 4.1 mini and GPT 5 nano.
- Assumes: tool prices known in advance; simulated tools.
- With model sessions (reasoned): shows a prompt that states the budget is not enough to hold it; enforcement has to sit outside the model (a gate), which is how our admission step is built.
- Needs to know before use: per-unit price estimates with an error margin.
- Status: quoted for the 32.8 % and the abstract; the success-gain number is not recorded.

### P7. Fang and others, "Inference-Time Budget Control for LLM Search Agents", arXiv 2605.05701. Read from: https://arxiv.org/pdf/2605.05701. Saved: itbc/paper.txt. Read: abstract, introduction, method outline, results text.
- Problem: pick the next search action under a hard budget on tool calls and tokens together.
- Mechanism: rank actions by value of information per unit of remaining dual budget, with a penalty that grows as the budget shrinks; finalize conservatively.
- Result: "the method yields positive aggregate gains over four audited baselines under the same hard dual-budget protocol. Ablations show that search-time budget control, especially budget-dependent penalty, provides the main performance gain" (raw.txt 3). Gains "are smaller in some cells" on the stronger backbone (raw.txt 470).
- Measured gain: not a single headline number; four multi-hop QA sets, three backbones, four budget levels (raw.txt 3). I did not extract a number, so none is claimed.
- Assumes: multi-hop QA; a value score defined by the authors "not Shannon" information (raw.txt 181).
- With model sessions (reasoned): the closest in form to the frame "admit by value per token against a price that rises as the budget runs short" (a budget-dependent penalty), but only inside one question.
- Needs to know before use: value estimate per action.
- Status: quoted for what is cited; gains not numerically verified.

### P8. Anthropic engineering, "How we built our multi-agent research system", 2025. Read from: https://www.anthropic.com/engineering/multi-agent-research-system. Saved: anthropic-multiagent/page.txt (page.html is the raw page). Read: all (about 97 lines of text). Self-reported.
- What happened: a lead Opus 4 agent with Sonnet 4 subagents for web research; token use was a main driver of quality.
- Result (self-reported): "a multi-agent system with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval" (page.txt 35). "token usage by itself explains 80% of the variance" on BrowseComp, with tool calls and model choice the other factors (page.txt 36). "upgrading to Claude Sonnet 4 is a larger performance gain than doubling the token budget on Claude Sonnet 3.7" (page.txt 36). "agents typically use about 4x more tokens than chat interactions, and multi-agent systems use about 15x more tokens than chats" (page.txt 37). Effort rules written into the prompt: "1 agent with 3-10 tool calls ... 2-4 subagents with 10-15 calls each ... more than 10 subagents" by query complexity (page.txt 48).
- Scale and baseline: internal eval, single-agent Opus 4 as baseline; no matched-token baseline stated; no statement of rate limits or a refilling allowance on the page (the page has no hits for "refill", "rate limit" or "window" other than context windows).
- Assumes: breadth-first research tasks; the post itself says "most coding tasks involve fewer truly parallelizable tasks than research" (page.txt 37).
- With model sessions (reasoned): the 15x token multiple is the cost side of running many units side by side; value per token must exceed it. It reports a quality gain from spending more tokens and from a better model, which is the quality-per-token trade our model choice needs, but gives no figure by kind of work.
- Needs to know before use: our own token multiple per unit kind (measured from transcripts).
- Status: quoted (read from the page text; self-reported).

## Unknown
Topic 3 only; not applicable to this file.

## Could not open
None of the named papers failed. Not tried as a source: a separate paper on a team that hit rate limits and changed its design (only P8 covers that kind); "budget-aware" agent papers beyond P5 to P7 (a 2026 search result "AlloBench/AllocBench", arXiv 2607.23332, and a GitHub issue were seen in a search listing, not opened).

## Needs the owner's sign-in
None.

## What the sources say about pacing against a refilling allowance
Nothing read here paces work against a window that refills (share of allowance left against share of time left). All of P1 to P7 fix a budget per query or per task and spend it within that task; P8 gives only token multiples. This stays "no paper found in this sub-topic"; the pacing and allocation sources (sub-topics 1 and 2) are the ones that can speak to it.
