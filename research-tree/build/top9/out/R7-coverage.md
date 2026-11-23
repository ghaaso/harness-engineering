# R7-coverage: what the research run did not cover, the local card, measurement, solvers
Reader R7 (Sonnet), top session 9, 2026-11-24. `RUN:` = C:/research-runs/2026-11-harness-leads/.
Short names: NC = NOT-COVERED.md, KEYS = KEYS.md; f6, f8, f5 = `RUN:fields/6-localcard/f6-report.md`, `RUN:fields/8-measurement/f8-report.md`, `RUN:fields/5-neurosymbolic/f5-report.md`.
Marks: [quoted] = a published source as the file quotes it (mostly makers' own); [observed] = seen in the record; [hypothesis] = reasoned, untested. Each of f5, f6, f8 states that nothing was measured or tested in the run, so no figure below is a result on our harness. Where the file gives no mark I use [quoted] for paper figures and [hypothesis] for effects on our harness.
Token-saving items (router, cascades, caches, KV reuse, semantic cache, compaction) belong to the teammate: one line each, not digested.

## 1. What was built, run or measured (by the sources; nothing by this run)

### 1a. The three maps (graphs f2m, encoders f3m, memory f4m)
- `fields/2m-graphs/KEYS.md`, table: 34 keys, 24 owned by f2, 10 cross-references. Only ranks 1-20 were read; 21-34 are in NC [observed].
- `fields/3m-encoders/KEYS.md`: 20 keys; "Only ranks 1-10 of the owned keys are read in this run" ("Rank basis"); 11-20 in NC [observed].
- `fields/4m-memory/KEYS.md`: 19 keys; ranks 1-10 read; 11-19 in NC [observed].
- Reader effort: f3m "three readers, 17 papers read in part (about 40 to 60 percent each, by grep and line ranges)" ("Not read"); f4m "three readers read 15 papers"; f2m "No paper was closed: every reader opened what it tried".

### 1b. f6, the local card (f6, "The answer", "The leads")
All [quoted], mostly makers' own; none measured on a 12 GB card or in our meter's units (f6, "The answer" 7).
- 4-bit 8B model = 4.58 GiB on disk and in RAM (C59, confirmed); with grouped-query attention ~7 GB spare on 12 GB holds ~56K tokens of fp16 cache (C66, holds in part: runtime buffers and other processes unbudgeted) (f6 "The answer" 1).
- L1 local reader under a cloud planner (MinionS): cloud dollars 18.0 % (8B) / 16.6 % (3B) of remote-only at 97.9 % / 93.4 % of accuracy; latency at most 5x (analytic bounds). Long documents, not code; baseline resends whole documents uncached, so our saving would be smaller. `card: fits 12 GB`.
- L2 local code embedder plus 4B+/7B reranker: SWE-Bench-Lite function top-5 50.0 -> 67.5; the 0.6B reranker is below its embedder on code (73.42 vs 75.41), 4B/8B reach ~81.2. 274 tasks, public Python repos maybe seen in pre-training; tokens, calls, latency not measured. `fits 12 GB`.
- L4 small-encoder prompt compression (355M, 2.1 GB peak, `fits 12 GB`): 2x-5x; trained on meeting transcripts; no code.
- L5 quantisation: 8B Q4_K_M 71.93 t/s (card not named); W4A16 ~99 % of academic averages, 98.9 % HumanEval pass@1, but the 99 % figures come from vendors of quantised serving (C60).
- L6 local 7B executor with a cloud expert on call: 42.4 % (Opus 4.1 expert) / 41.0 % (Sonnet 4.5) on SWE-bench Verified; expert tokens 11.9 %. Training `needs more` (8 x 80 GB); 4-bit inference fits 12 GB only by reasoning.
- L8 fine-tuning on one repository: SymPy specialist 21.2 vs 13.6 % (7B, ~4.7 vs 3 of 22 tasks); file paths EM up to 91 %, 59 % on PyTorch; `needs more` to train.
- Negatives: L9 static text routers lose to the zero router on code; L10 whole-session swap to a 753B local model: fix-commit ratio 45.9 % -> 74.9 % (one monorepo, one developer, 28 days, client changed too); L11 tuning on own recorded sessions 67.64 vs 65.27 (p = .084).
- L3 cascade with our check as judge, L7 agentic router (62.50 % vs always-Opus 57.14 %): routing, the teammate's.

### 1c. f8, measurement
All [quoted]; "No figure below was measured here"; all sources run hosted models, so `card: none` unless noted.
- Run-to-run spread: single runs move 2.2-6.0 points on 500 tasks (C01); 2 points need ~9 runs per arm, 1 point ~36 (C01-C02); runs grow as (sd/gap)^2 (f8 "The answer" 1; M1).
- Our cost of a test [hypothesis; C115 corrected]: a 2-point test on 100 tasks ~9,000 task-runs, ~28.8 B tokens, ~15x this run's cap (f8 "The answer" 2).
- Between repositories: resolve under 10 % to over 50 % by repository (C44); same agent 43.20 % on Verified vs 19.25 % on fresh tasks (C48, one run); with leaked/weak tasks removed 12.47 -> 3.97 %, 0.55 % on fresh issues (C39, independent audit, abstract only) (M4, N5).
- Fixed context tools flip sign by repository: RTK alone raised cost in 12 of 30 cells, RepoMap in 15 (C63) (N2).
- Harness size: Claude Code vs PI.DEV prefix 12-15x, cost per success 5-30x at comparable success, 24 small tasks, open models via a gateway (C80, narrowed); mini-SWE-agent vs Claude Code with Opus 5: same 14 solved, 3.2x wall-clock, 2.8x cost (C97) (L1).
- Per-repository learned cost control -18.4 to -30.9 %, needs 5+ earlier tasks (C64-C65); skills -7.88 to -41.73 % (C95); graph-guided planning 0.32-0.76x tokens where significant (C77-C78); all makers' own, Python, one run per instance (L2, L3).
- Silent failure: GPT-5 submitted 100 %, resolved 44 %; silent failures 68-80 % of failing runs; guard prompts did not close it (C33-C36; independent of model makers, one scaffold, 50 Verified tasks) (L8, N4).
- Effort: higher effort equal or lower accuracy in 21 of 36 combinations (C72); Sonnet 5 12 -> 19 of 25 low to high (C119, cannot be checked) (L4).
- Shortening old tool output: at a 20,480-token window F2PF 28 -> 49 %; at 262,144 tokens Verified -0.3 points, FeatureBench 23.9 -> 30.7 % (task-paired p = 0.00022, repository-level p = 0.096) (C99, C15) (L6).

### 1d. f5, solvers and exact queries
All [quoted]; "No test, measurement or download was made".
- Exact index: turns 36.2 -> 28.3, resolve 41.9 -> 50.4 % (80 paired instances, Opus 4.7, one harness), per-cell cost null (p = 0.73) (C01-C02, maker's own) (f5 "The answer" 1, L1).
- Independent pre-registered study (500 SWE-bench tasks, 12 Python repos, 0.6B-32B, localization only): Acc@10 +0.06 to +0.10 up to 14B, +0.03 at 32B, +0.007 on unseen tasks; text embeddings carried the gain, not graph edges; the graph on top significantly negative at 0.6B (C06-C11, C09).
- Graph tools can raise cost: RepoGraph +$0.13 to +$0.16 per task (C22); flattened 2-hop context 26.00 %, below baseline (C23) (N1).
- Lint gate 15.0 -> 18.0 % (C29, one run per arm); checker in loop cut type errors the tool itself introduced by 84.2 % (C38, annotation errors only); type step after the fact fixed 29 of 762 failed patches, 3.8 % (C43) (L3, L4).
- A passed check is not a correct result: Dafny alone 100 % false positives on adversarial versions (C51); 7.8 % of grader-passing patches wrong (C68); SAST gating 12.5 -> 20.8 % latent degradation (C69) (N3).
- Decoding-time constraints need logits, so cannot run on hosted Opus (C34, C90) (L9). Solvers help only where a task translates into logic (C53, C56) (N4).
- Our repository: call edges exact, rebuild ~5 s (C71, via our earlier record); test reach missing (route and overrides edges not built, C88) (f5, L2, "Our earlier work" G2).

## 2. Results that decide a choice, and what must not be ruled out

### 2a. Graphs and the embeddings test
- The embeddings null stands as a null about one form on one repository (f8 "Our earlier work" F1, C105 confirmed). Its resolution was coarse: "a gain of +0.006 (C105) is far below what 313 tasks can resolve"; the null holds for gains above the test's resolution, "not for the family" [hypothesis; C113 holds in part: our own spread is needed] (f8, assumption 6).
- The three reports against the embeddings test's seven assumptions (each report's section of that name). They disagree in places; do not average them:
  - Target: all three say ranking without an agent does not stand for the effect (f5: acc@5 +40.2 points vs +8.5 for resolve, C01; f8: tokens, time, cost do not track quality, C58).
  - Model class: f6 and f5 contradicted (pretrained code-text embedders plus 7B reranker transfer, C24; text embeddings carried the gain); f8 "none of the sources read bears on it".
  - Scale: f6 the test left most of the card unused; f5 exact indexes cover 2.1M nodes in 3 min on an Apple M3 Pro, CPU (C15).
  - Signal: f6 and f5 contradicted (code text, definitions, types, tests); f8 not bearing.
  - Fusion: f5 "agreed with, not contradicted" (low-precision additions harmed, C08, C26; flattened 2-hop hurt, C23); f6 "contradicted in part" (learned 7B reranker 50.0 -> 67.5).
  - Evidence base: f8 "contradicted, most directly" (repos differ by over 40 points, C44); f6 "share it in part"; f5 "nothing contradicts it".
  - Use: f6 and f5 contradicted (reading, compression, routing, expert-asking, tuning, checking, planning are measured uses).
- Graph structure vs text embeddings: structure added little or nothing in the strongest independent study (f5, C06-C11; and `2m-graphs/KEYS.md` key 3: "Bellam v2: ET minus E on canonical Acc@10 -0.022 to +0.036 over nine models; after Holm only Qwen3-14B gains, Qwen3-0.6B significantly negative") [quoted]. The gain shrinks as the model gets stronger up to 32B; "Whether Opus gains on our repositories is still to be measured" (f5 "The answer" 2).
- Graph-guided planning is the one graph form with a token cut in a deployed agent: 0.32-0.76x tokens where significant (f8 L3, C78, self-reported, Python and C/C++, Claude Code, two models of one provider, one run per instance).
- Graph or index tools "can raise cost or leave it flat"; "form of delivery decides" was refuted (f5, C85).
- Must NOT be ruled out (the reports say "Not found does not mean 'does not work'"):
  - Learned encoders scoring unseen nodes: "No paper read measures an encoder on an agent's tokens, steps or time on code"; nearest are G-Retriever (tokens, hallucination; not code) and LocAgent (cost; a tuned agent) (`3m-encoders/KEYS.md`, "Not read"). Every code localization number read is SWE-bench Lite or the makers' own Python benchmarks.
  - The crossover (graph size, history, training repositories where a learned encoder beats PageRank or BM25): key 13, never read (`3m-encoders/NOT-COVERED.md`).
  - Untried forms: learned fusion, temporal graph models, hypergraph change-set encoders, rule learners, best-form KG embeddings (NC keys 11, 12, 14, 15, 16). Key 16 asks specifically whether best-form KG embeddings change the embeddings null (x09-0306) [hypothesis: open forms].
  - f8: a null at n = 1 "excludes only effects larger than the spread" (F5, C10).

### 2b. The tree's quality mechanism
- "Done" is often wrong: GPT-5 submitted 100 %, resolved 44 %; guard prompts did not close it (f8 L8, N4). Proposed measure: count "claimed done, check fails" per helper against gate and refuter verdicts from records, no model tokens (f8 L8, C121 "cannot be checked", a proposed measure) [hypothesis].
- A passed check is not correctness: Dafny false positives 100 % on adversarial versions; 22.7 % of verified specs without a postcondition; verified code can cheat; 7.8 % of grader-passing patches wrong (f5 N3, C51, C57, C59, C68) [quoted]. Bears on any gate or refuter design.
- Checks in the loop help in the small: lint gate 15.0 -> 18.0 % (one run per arm); type step 3.8 % of failed patches (f5 L3, L4). "No paper ran one agent with and without a checker on repository tasks" (f5, "Not found").
- MAST: the Verifier role did not help with GPT-4 (p = 0.4), did with GPT-4o (p = 0.03); also in the record book as x39-0366 (f5 "Our earlier work" B3) [quoted].
- Hallucinations: f8 found no measure beyond C33-C36 and C40-C41 (f8 "Not found"). f6 L4 cites the sheet's S5 as 0 wrong of 2,727 checkable claims (`RUN:sheet/SHEET.md`, not opened by me). Type-directed context mitigated 63.2 % of hallucinated-API failures (C49, GPT-3.5, 12 JavaScript projects, makers' own) (f5 L6). The key "does graph context cut fabricated symbols and APIs" (graph-grounding-halluc, rank 21) was never read (`2m-graphs/NOT-COVERED.md`).
- Effort and model: higher effort gave equal or lower accuracy in 21 of 36 combinations; the direction depends on the model (f8 L4, N3).

## 3. Open faults, open questions, missing measurements, and what each needs

### 3a. What the research did not cover ("never read")
Graphs (`2m-graphs/NOT-COVERED.md`, KEYS "Not read"):
- Ranks 21-34 unread: graph-grounding hallucination; incremental/deletion text GraphRAG; temporal and bitemporal code graphs; cross-repository graphs; cross-refs (temporal KG memory, graph cache invalidation, library-entry graphs, GNN code encoders, graph-LLM adapters, Datalog code queries, small-model graph tools, repo-model freshness, repo-scale benchmarks, pathway graphs).
- Within ranks 1-20, covered by no reader: production symbol indexes and language-server tools for agents (key 11); change impact and test selection (key 14); cross-runtime and polyglot linking (16); text-to-Cypher and graph stores (20); KG reasoning agents such as Think-on-Graph (17); graph algorithms and non-neural graph learning (13); GNNs trained on code graphs.
- Named, not read: CoSIL, OrcaLoca, GREPO, SeeRepo, LARGER, CodeCompass, RepoNavigator, RepoAtlas, GraphCodeAgent (2504.10046), GraphRAG-Bench (2506.02404), deletion in GraphRAG (preprints.org 202511.1058), TG-RAG (2510.13590); Merkle/zoekt indexing; Salsa and incremental Datalog; incremental code property graphs.
- Read only through our earlier lane file (a fetch tool's copy): 2611.07286, Codebase-Memory, FastContext, SWE-grep, Cursor and Augment figures, the AGENTS.md study, Aider's repo map. Six graph-v2 lane files (2,409 lines) not read line by line.
- Gaps all readers named: no independent replication of RepoGraph, CodexGraph, CGM or LocAgent; no paper on an agent's tokens or success after a graph update against a stale graph; none isolating a code graph's token effect in a free-running agent on a large repository.
Encoders (`3m-encoders/NOT-COVERED.md`, "Not read"):
- Ranks 11-20 unread: learned fusion and learned change-impact prediction; temporal graph models; data-scale crossover; hypergraph encoders; rule learners (AnyBURL, AMIE); best-form KG embeddings; cross-refs.
- Not opened: CGM (2505.16901, named only); SEAL, GraIL, NBFNet (from the writer's knowledge); cross-repository contrastive encoders and UniXcoder; RepoCoder, ReACC, SWE-Fixer, other code rerankers.
- The retrievers reader ran no web search (ids from memory); table rows in several papers came from scrambled two-column text, "summary-grade".
Memory (teammate's, but keys 14-16 and 19 touch the owner's track; `4m-memory/NOT-COVERED.md`):
- Ranks 11-19 unread: memory systems beyond keys 1 and 4; semantic cache; KV-cache reuse; neural/parametric memory (14); incremental graph maintenance (15, xref f2); stable code-entity identity (16, xref f2); prompt compression; sub-agents; self-correction without outside checks (19, xref f5).
- No reader read: compaction in coding agents, caching of tool/test results, memory measured on code repositories (VibeMemBench, SWE Context Bench, ETH Zurich context-file study, RepoMem, HAFixAgent), memory poisoning/error spread, temporal databases and historical graph stores, independent comparisons of memory systems (`4m-memory/KEYS.md`, "Not read"). Our own files unopened by the memory reader: KNOWLEDGE-STORE-DESIGN, TOKEN-BOTTLENECK, AFTER-COMPACTION, HARNESS-IDEAS-HORTHY, recall-test-4.

### 3b. Open questions and missing measurements
- No source measures any f6 method "on a 12 GB card, on our step kinds, or in our meter's units" (f6 "The answer" 7). Not found: local-plus-cloud on one 12 GB card against a repository agent; a measured 12 GB fine-tuning run; a K-quant quality table for code; independent replication of LLMLingua-2 on code; measured MinionS latency (f6 "Not found").
- 24 GB: f6 says the option "rests on the owner's note as quoted (C74, cannot be checked)" and "needs his word or the note opened" (f6 "Our earlier work" F5). Needs an owner statement or the note opened.
- Our own run spread is unknown: "our SD needed" (f8 M1, C113); S2 as the only spread estimate "is too few" (f8 F6, C107). Needs a measurement (pilot of repeats).
- Token tables have no task or pass/fail column, so cost per solved task "cannot yet be computed"; the headline total weighs token fields equally while sources price output ~80x a cache read (f8 "Our earlier work" F2, C103, C74). Needs a script, no model tokens.
- Replay tests with no card and no model tokens, all [hypothesis]: S2 fix commits through tsc and mypy (f5 L3); affected tests vs failed tests after building route and overrides edges (f5 L2, C88); whether Claude Code diagnostics are already active (f5 L4, C87); how often Opus with grep alone opens the changed files (f5 L1 step a, the C11 predictor); prefix per role from transcripts; repeated calls across tasks of one repository; tokens of helpers that returned LIMIT against DONE; tokens of old tool results in late-window calls (f8 L1, L2, L5, L6).
- Not found in f8: cost or tokens by repository size within one benchmark; a hallucination measure beyond C33-C36, C40-C41; "Lawrence 2026"; METR-style time-horizon sampling and variance of token counts across runs not searched.
- Cannot-be-checked claims: f6 C73, C74, C78; f8 C114, C119, C121, C122; f5 C90.
- f8 input defect D1: the testbeds second attempt is a copy of the cost-reporting one; SWE-bench-java downloaded, no surviving reader text.

## 4. Costs
- No figure of any run is a measurement of this run. Stated hardware limit: 12 GB card.
- Tests (f8 [hypothesis], C115 corrected): 2-point test on 100 tasks ~9,000 task-runs, ~28.8 B tokens, ~15x this run's cap. 9 runs per arm for 2 points rests on 500 tasks and open models (C01-C02). Pilot: 2 arms x 3 runs x tasks x tokens per task, "a measurement".
- Installs or downloads the reports name (all need the owner's word, rule 3; none done):
  - one 4-bit 3-8B model plus a runtime; 8B Q4_K_M 4.9 GB (4.58 GiB), source named only as the quantised-model papers (f6 L1, L5);
  - a code embedder (137M) and a 4B+ reranker, sizes beyond parameter counts "not in the record" (f6 L2);
  - a 355M compressor, 2.1 GB peak (f6 L4);
  - a public multi-repository set (Pro, rebench, Live) "through the owner's download decision" (f8 M4);
  - language servers or checkers (mypy, tsc, rustc, flake8); Claude Code LSP diagnostics need a per-language plugin and server binary, "not checked here" (f5 L3, L4, C87).
- Beyond 12 GB (kept and tagged, not offered): 7B executor training 8 x A100/H100 80 GB; repo fine-tune 6.7B full 67.2 GB on 8 A100, file paths 2 A100 80 GB; 753B / 465 GB on 4 B200; Pro open models 8 x H100; run-spread replication 8 x A100 80 GB; type-constrained decoding A100 80 GB (f6 L6, L8, L10; f8 M1, M4; f5 L9). Reasoned to fit 12 GB: MGD 350M-2B (C90, cannot be checked), 0.8B router core.
- Building a testbed: per-repository containers ~10 hours manual work each (C55); an install recipe worked for one task in 31 % of repositories (C52); SWE-Gym 200 annotation hours and 6 TB (C56) (f8 M4) [quoted].
- Time: MinionS latency at most 5x, 4.75x for 8B on an RTX 4090 (analytic bounds); decoding constraints +39-52 % time (C33), decoding +83.16 % (C36); adequacy tool 1.4-2.2x time (C58).
- Memory: 4.58 GiB for 8B Q4_K_M; ~7 GB spare for ~56K tokens fp16 cache (C66 holds in part); LLaMA-7B cache 64.0 GB fp16 vs 16.0 GB at 4 bit at 128K (f6 L5).
- To cover the unread map keys (NC files; basis `units.f2a/f3a/f4a` of `run/config.json`, not opened by me): graphs 4 keys, 1 part, 98.0 M expected, 150.1 M at most; encoders 6 keys, 2 parts, 196.0 M, 300.2 M; memory 4 keys, 1 part, 98.0 M, 150.1 M.

## 5. Steps the record already proposes next (all [hypothesis]; none authorised)
From f8:
1. Pilot to measure our own run spread: 2 arms x 3 runs; runs = 16 (sd/gap)^2, at least three repeats; aim tests at large effects or pair arms on tasks that differ (M1, M2, C123); pin and log model id, interleave arms (M5).
2. A multi-repository testbed with a per-repository cap, fresh tasks, checked grader: a small set from our own repositories (hours a measurement) or a public set via the owner's download decision (M4).
3. Add task id and pass/fail to the token count; keep token classes apart with a dated price (M3, F2).
From f5 (no card, no model tokens):
4. Replay S2 fix commits through tsc and mypy; build route and overrides edges, then replay commits against failed tests (f5 "ranked" 2-4).
5. For graphs: from recorded sessions how often Opus with grep alone opens the changed files; then paired runs with and without a query tool over our typed graph counting read-only calls, turns, tokens, S2 defects (f5 "ranked" 1).
6. Script check plus independent re-derivation of reports, scored on recorded overstated reports (f5 L5, f8 L8).
From f6 (local card; all need downloads):
7. L1: the cloud model writes narrow questions, a 4-bit 8B answers, count cloud fresh tokens and wrong extracts against cloud-only on recorded read steps; L2: recall at k of finally edited files against our ranker on the same commits, then files opened with and without (f6 "ranked" 1, 2).
8. Cascade pass-rate table by kind (a1-0507): routing, teammate's.
Maps: cover the unread keys at the NC costs in section 4; these are the record's figures, not a proposal.

## 6. Not read
- `RUN:fields/4m-memory/KEYS.md`: I printed only the first ~700 characters of each table row; the full "sources" columns and the ranking paragraph were not read; "Not read" read in full. The three NC files, f6, f8, f5 and the other two KEYS were read in full.
- `RUN:fields/{6,8,5}-*/claims.md` (claim texts and verdicts), gates, refuters, collect files: not opened; claim ids are used as the reports use them.
- Not opened: `RUN:sheet/SHEET.md` (sink ids and shares S5, S12, S14 are second-hand), `RUN:journal/2026-11-23/d5.jsonl, d6.jsonl, d8.jsonl`, `RUN:briefs/FIELD.md`, `run/config.json`.
- No paper opened; all paper figures are as the reports quote them (mostly makers' own, some abstract-level or from flattened table text).
- Named by the reports and not opened by them: f6 (three edge-cloud surveys, 2610.09021, 2604.08588, 2603.21489, 2610.02353, 2609.33182, Devstral); f8 (MemTrace 2610.04838, SWE-Serve 2609.26777, Terminal-Bench 2.0 paper, SWE-bench test-weakness papers); f5 (LHC ICSE 2025, Dataflow-Guided type inference, TypyBench, Pyrefly post, Commit0, REDO).
- Named but missing: the owner's memory note behind C74 (24 GB option); "Lawrence 2026" (not found); Llama-3.1-8B config behind C66's correction.
