# R8-graph-parts: digest of the four wave-1 graph part reports (f2a, f2b, f2c, f2d)

Places: `RUN` = `C:/research-runs/2026-11-harness-leads/`. `f2a`..`f2d` = `RUN:fields/2a-graphs/f2a-report.md` ... `2d-graphs/f2d-report.md`
(tables are one line a row, so I cite section heading, lead row L and claim id C). Marks: the run measured nothing itself (each report's
header: "No test, measurement or download was made"), so every effect is [quoted] as the report gives it (after its quote gate and refuters);
[observed] = our earlier own measurement as the report names it; [hypothesis] = the report's own shares and transfers (all "cannot be
checked"). Already digested in `R5-handback.md` and `R6-synthesis.md` (not repeated): map servers and the Lin pilot (L1/L2), Bellam graph-over-embedding
null, L43 token bound, L58 parser over model, L16 cross-runtime, L44 closure, L47 learned ranking, the 13.6 / 22.0 % exposure. This file adds what is
new or differs. Each report ends with the embeddings test's seven assumptions; R6 section 2 has that, so only differences are given. Token-store and
caching items: one line each, the teammate's.

## 1. What was built, run or measured
No experiment here: all four are literature reports with quote-checked claims (f2a header; f2b "Counts by verdict"; f2c header; f2d header).
Verdict counts [quoted]: f2a 109 claims: 61 confirmed, 26 in part, 1 refuted (C06), 21 cannot be checked (f2a "Counts by verdict"); f2b 92: 47 / 30 /
3 refuted (C79, C80, C85) / 12; f2c 120: 83 / 21 / 2 refuted (C111, C114) / 14; f2d 110: 79 / 22 / 4 refuted (C44, C65, C105, C106) / 5.
Sources' measured figures NEW relative to R5/R6 (all [quoted]):
- Edit units only after localisation [independent, pre-registered, small N]: 25/70 resolved at 6,876 mean context tokens vs whole files 19/70 at 25,426
  (p=0.07, not significant); a skeleton of the rest 23/70 at 8,629, no better than dropping; 9 % of outcomes flip between identical runs; 70 SWE-bench Verified
  multi-file instances, oracle gold files, Sonnet 4.6, Python (f2b L8, C31-C33). The token cut is outside noise, the success gap is not.
- Generated overview or context files [independent]: no shorter path to the first gold file, cost over +20 %, +2.45 to +3.92 steps, resolve -0.5 and -2 (n.s.);
  developer-written +2.4 (n.s.) at up to +19 % cost; the extra cost comes from agents following the instructions (f2b L7, C27-C30).
- Prose summaries of code [independent]: 4/45 behaviour questions right from summaries vs 27/45 from source (f2b L9, C31); 31.63 % of 2024 code summaries had a wrong claim (f2c answer 4, C37).
- Test selection [makers' own, direction replicated, time-taken measure, no model tokens]: name-level reachability cut Python end-to-end test time 45.59 % (overhead in), safe on 99.6 % of commits,
  69.90 % of test files skipped; file level only 3.10 % of time (one test file imports 83 % of sources); Java class level 62.5 % of retest-all, unsafe on 0.2 % of revisions; cloud CI 76.0-79.7 % of
  build time; a learned filter 25.34 % / 21.44 % fewer tests (f2c L1, C62-C68).
- TDAD code-to-test map [makers' own, 100 Verified, Qwen3-Coder 30B 4-bit]: test-level regressions 6.08 -> 1.82 %, but instance-level regression 30.2 -> 33.3 %, resolution 31 -> 29 %,
  empty patches 14 -> 26 %; the cut came from Phase 1's graph setup, not the text-file skill; TDD instructions raised regressions to 9.94 %; a test-first guard left GPT-5 at 44.4 -> 44.0 % with 17.2 vs 10.5 steps (f2c L2, L16, C54-C59, C57, C70).
- Language-server tools [one author, 6 issues of one repository]: tokens to success vs grep Opus 4.8 +6 %, Sonnet 4.6 +118 %, Haiku 4.5 -26 %; Opus used the LSP 0 % when free to choose; references precision 1.00 vs 0.76 on noisy requests, no gain on clean ones, +19 % tokens (f2c L5, C01-C07).
- Dynamic slice from a failing test's trace [maker's own, Java Defects4J only]: 313 fixes vs 236 (+32.6 %), $0.029 and 23.28 min a bug (f2d L6, C71). Static slice lines lowered resolution 3.5 on average with GPT-5-mini, negative in 8 of 12 [independent] (f2d L5, C68).
- Typed project memory [maker's own, 835 records, GPT-5.x]: completeness 1.00, negation 0.98, supersession 0.98 vs mem0 0.18 / 0.06 / 0.27 and flat notes 0.08 / 0.00 / 0.12; set answers 78k-167k tokens vs about 35k (f2d L12, C62, C63).
  The store is the record book's (teammate's); it is a quality lead on S1 and S3, so one line here.
- Validators [makers' own]: a validator over extracted data-flow facts, false positives +245.45 % without it, precision 78.43 % on reported bugs (C/C++, Claude 3.5 Sonnet); a pre-execution Cypher gate: 5.6 ms, all parse, constraint and missing-name errors caught, chain recall 0.665 over all injected errors, 39 false flags on 683 valid queries, valid-but-wrong queries pass (f2d L7, C76, C77, C85, C87).
- Model-written graph queries: SWE-bench Lite 22.96 % = AutoCodeRover at 102.25k vs 76.01k tokens (1.35x); open 72B CrossCodeEval EM 5.00 vs BM25 15.50; out of memory on 43 sympy samples (f2d L8, C79-C82, C95).
- Co-change mining [several groups]: 66 % of queries answered, recall 33 %, precision 29 % (navigation); warning mode precision above 66 % but fires on about 3 % of missing items; MAP knee near 15,000 commits, decays with rule age (0.2185 at age 0, 0.1430 at 1,000); in iterative impact analysis no heuristic beat random in recall [independent] (f2c L10, C73-C83).
- Rule mining on knowledge graphs [AnyBURL replicated independently]: good after 10 s, state of the art after 100-1000 s vs 1 h to 200-300 h of embedding training; TLogic 180 s on 8 CPUs; never tested on code (f2c L12, C42-C46).
- Static graph gaps: PyCG recall 69.9 % on five small programs but 49 % of runtime call edges on 39 real projects (second-hand; f2c "Our earlier work", Lane row AL:98, C63, C99); Doop median 0.884 of reachable methods; Node.js 75.9 % of call edges (f2b L13, C49-C53). LLM call graphs 60.3 / 62.6 % vs PyCG 84.9 / 87.3 % complete / sound, 534 s vs 0.41 s (f2b L12, C50).
- Stale evidence [tiny independent study]: stale-only retrieval 13-15 of 17 obsolete calls vs 0/17; a path predictor named old paths in 78 of 100 renamed or deleted cases (f2b L14, C55-C57). Our fact-level invalidation 0 % wrong served vs 6.49 % file level [observed, zero by construction] (f2b L14, C71).
- Index upkeep: hash skip saves 0-49.2 % of re-embeddings (under 3 % in six of ten repositories); Codebase-Memory incremental 1.2 s; exact incremental Datalog in milliseconds; Cursor median start 7.87 s -> 525 ms (f2b L15, C58-C64). Our full import-graph rebuild 0.40-0.49 s [observed] (f2b L1, L15).
- Index services [makers' own]: zoekt shard 3.5x corpus, trigram index 18 % of Linux sources, Glean +7 % storage; no agent measure of SCIP, LSIF, Kythe, Glean or zoekt (f2c L6, C08-C14, "Not found").
- Embedding index for read-only questions [independent]: SWE-QA, 15 Python repositories, 65.2 % vs 46.2 % correct, $0.32 vs $0.74 per correct answer, but the ratio swings by model pair and grep matched on 1 of 15 repositories (f2b L4, C15, C91).
- RepoMem history as memory [makers' own]: Acc@5 71.6 -> 76.5, resolve 37.0 -> 40.4; low-history bucket (46 examples) -13.1 points; gains do not rise with history (f2c L11, C30, C84, C85).
- Router and graph RAG on prose [independent]: router 43.69 % vs best fixed 39.32 %, oracle 60.83 %; global search 57x time and 210x tokens a query; null-query accuracy RAG 96.01 vs global 19.27; 66-75 % fewer tokens at 3.1-3.6 points below hybrid (f2b L11, C39-C47). No code.

## 2. Results that decide a choice
Won or carried (for the form and conditions stated):
- Parser over model for building graphs: parsed 2.13-2.25x vector-only cost vs 19.75-45.64x; LLM graph skipped 377 of 1,210 files; correctness 15/15 vs 13/15 (one author, Java, three repositories) (f2b L12, C48; f2d L10, C60/C61 narrowed: the draft joined figures of different repositories; f2c L8, C29). New here: f2d L2 is the one exception, model-added boundary edges, 2.81 M tokens and 12.86 h per project, needs 24 GB.
- Sound test selection is the best-evidenced lead on time taken, S7, and depends on language: file level 3.10 % vs name level 45.59 % on Python (f2c answer 1, L1, C62). So library record c1-0403 (selection by changed files in the builder's pre-check) saves about 3 % if the suite is Python (f2c "Our earlier work", last line; open d2c-0502 asks which graph).
- The size-threshold "law" is dropped: C111 refuted (rests on two summaries); do not propose "code-intelligence tools cost below 400K lines" (f2c answer 6). f2b keeps the vendor numbers (-0.080 reward below 400K LOC, +0.259 at 400K-2M; Cursor +0.3 % overall, +2.6 % at 1,000+ files) as vendors' own; no study varies size (f2b L16, C65-C66, "Not found"). Unmeasured for us.
- "Co-change is weak at our 432 commits" is refuted (C114): our changed-together floor scored recall 0.638 at 8,000 tokens, above scripted search 0.625 [observed] (f2c answer 6, L10). Record x09-0418 ("the design calls it the weak half") gets a proposed correction d2c-0501 (f2c "Our earlier work" F9).
- Typed store +0.076 over scripted search is level with the changed-together floor outside the mobile app (+0.024 there, inconclusive) [observed] (f2c "Our earlier work" F1).

Lost or negative under their conditions:
- Graph-navigation agents lose to a strong grep agent under matched settings: LocAgent 59.5 vs 83.2 % Func@5 (Codex grep, n=274); LocBench Acc@5 CoSIL 68.2, LocAgent 65.3 vs Codex 74.1 (f2a L11, C07, C11, C14). They win over weak baselines.
- Structure added on top of the same reads: RepoGraph +2.34 points at +11.7 % tokens; ARISE +4.7 at 32B, +0.7 / -4.3 at 35B-A3B; RepoNav 1.97x tokens (f2a L12). Maps on writing tasks +1 to +12 % tokens (f2a L13, C55).
- Model-written graph queries: equal quality at 1.35x tokens, below BM25 with an open 72B (f2d L8). Graph database as store: relational orders of magnitude faster on most analytical queries, graph about 10x on cyclic patterns; our three engines gave identical answers [observed] (f2d L9, C88-C93).
- Static slice lines and data-flow tiers for frontier models: no gain (f2d L5, C66, C68). Test-first or TDD instructions: no help, more steps (f2c L16).
- Weak retrieval added by default to a strong agent: BM25 lowered a GPT-5 agent 88.5 -> 78.5 (text benchmark); BM25 injection +21 % tokens, -0.6 pp at 30B (f2b L17, C22, C68). The token rise is shown only below strong-model class (C90 corrected); no source for strong models.
- Generated overview files and prose summaries of code: negative (f2b L7, L9).
- Static graphs miss about 24-30 % of call edges and runtime links; whether S2's defects come from missed edges is unmeasured (f2b L13, C88 corrected).

Must NOT be ruled out yet (and why):
- Graph tools for Opus-class sessions: no source runs a frontier model in Claude Code with a graph arm against an embedding arm with tokens (f2a answer 7, "Not found"); whether gains shrink with stronger models is mixed (f2a answer 3, C101); f2d C106 refuted, so no backbone trend either way: GPT-4o lost 6.3 Pass@1 without its graph tool (C56), ARISE +4.7 at 32B vs +0.7 / -4.3 at 35B (f2d answer 3). Our embeddings null is about identity embeddings only (f2d "Our earlier work" F4; f2b assumption 2).
- Rule or path ranking (AnyBURL, TLogic, path ranking) is the untested neighbour of our embeddings null; evidence is benchmark-only (f2c answer 5, L12). The graph-algorithms reader got HTTP 429 and ran no web search, so "not found" is not "no paper" (f2c "Not found").
- Cross-runtime edges (R5 L16): f2d adds that no source measures URL-literal-to-route matching; own-backend and relative URLs were never measured (C02, C24 narrowed); no agent measure anywhere (C23); other tools reach 0.68 (best single) to 0.88 (union of three) endpoint recall on other tasks, not a bound (C03-C05). It is the one gap our own data shows (f2d ranked 1).
- Model-written cards (SemNav): -48.2 % localiser reading vs full source, -25.4 % counting card building, +4.8 % vs truncation (f2a L4; f2c L7); but f2c computes only about -1 % to 6.6 % of context tokens with card building (12.5 % if amortised; C112 corrected) and a 31.63 % wrong-claim rate for 2024 summaries (C37). A replay on recorded sessions is the proposed test; no result.
- Language-server tools for Opus: "a saving unshown, not ruled out" (f2c L5, C109); n=6, one repository.
- Co-change rules as a warning: precision above 66 % when it fires, fires on about 3 % of missing items (f2c L10, C74); untested on our held-out commits.
- Typed project memory: strong on structural questions at one maker; effect on S1 or S3 unmeasured (f2d answer 6, C107 narrowed).

## 3. Open faults, open questions, missing measurements
- Pilot power binds every agent test: 40 tasks detect only a per-task saving of 18.4-33.4 % or more (f2a L1, C92; f2c C95; f2d answer 7, C96). Lookup-level replays come first (f2c "Our earlier work" F7). Needs: paired tasks or more of them (a measurement).
- Missing numbers: the share of our total tokens spent in localisation-like work (f2a L1 sink cell, C103 as corrected); the lookup share of cross-runtime forms (route-and-client form is 1.0 % of product and 0.3 % of program lookup tokens in the design note's table, GV:42, f2d L1); the chained part of S15 (f2d L4); S4 has no rate per report (f2d L7); S2's rate per fixed finding is unknown (f2d L6).
- Which test-graph level fits our check's suite, its language split, and how much of the check (855.2 s once, 283.8 s mean, C101) is test execution (f2c L1). Needs: replay a selector over the check's past commits, recording time and every failure the full suite caught (CPU, no tokens). The selection tool is an install for the owner (rule 3).
- Which of the fix-created defects (at least 5 P1 and 10 P2, C102) an existing test fails on (f2c L2).
- Ripgrep time on our repositories before any index service (f2c L6); the overview share of our CLAUDE.md and briefs, no model (f2b L7); symbol slices vs whole-file reads in paired edit tasks (f2b L8); stale-fact causes read from our own errors (f2b rank 4).
- No agent test of anything graph-side on our repositories exists: "none measures our seven measures on our harness" (f2a, f2c, f2d headers).
- Missing in the literature (found by these reports): an independent replication of LARGER, KGCompass, GraphLocator, SemNav, SeeRepo or Codebase-Memory's 10x; a sweep of edge direction on code; a size sweep; an LLM-built graph from issues, PRs or documents scored by agent tokens or false claims; graph RAG on code with tokens or hallucination in an agent loop; hallucination effects of a repository map (f2a, f2b "Not found").
- Refuted draft claims that must not recur: f2b C79/C80 "graph-servable about 20.5 % of lookup tokens, about 5 % of context" and C85 "22 % fewer turns cut S10 by 22 %" (real: 2-8 %); f2d C105 (shares double-discounted), C106 (backbone trend), C44 (77.01 Acc@10 is the fine-tuned 32B's; the 7B's is 71.53 vs 66.06), C65 (3,200 tokens per extra fix is an arithmetic error, about 0.95 M); f2a C06; f2c C111, C114.
- Record flags: x09-0418 needs the d2c-0501 correction; c1-0403 has open d2c-0502 (f2c "Our earlier work").
- Cross-check against R5: R5 L15 hop-study -0.004 to -0.007 matches f2d L3 (C98); R5 L35 graph-on-embeddings -0.022 to +0.036 (post hoc) matches f2a L3 (f2a corrects C99 ratios to -0.19, -0.29, -0.04, -0.06, +0.49). No conflict found.

## 4. Costs
All [quoted] unless marked; none measured here.
- Model-built graph: 19.75-45.64x vector-only; KGGen 5.37 M tokens for a 1 M-character corpus; an extraction pass over our notes about 20x their tokens (corpus size a measurement; f2a L10, C105). KET-RAG low mode 18.3 % of others' indexing cost (different modes compared; C81).
- Model-added boundary edges: 2.81 M tokens and 12.86 h per project, 482.5 MB peak, RTX 3090 with 256 GB RAM stated (f2d L2, C18). Needs 24 GB.
- Cards: $80 first pass for 1.1 M lines (f2c L7, C32); a 4B builder fits 12 GB (reasoned, not a source figure).
- Embedder 0.6B about 1.2 GB; models 0.6B-4B fit 12 GB, 8B-14B need 24 GB, 32B more (computed from bf16 weights only, KV cache on top; f2a L3, C108). Bellam's B1-B7 took 60.4 GPU-hours on one 96 GB card (C05 in part).
- Trained forms: RL retrievers need 8 H100 or more (f2b L6); CodeScout 14B needs 24 GB (reasoned); language-server RL 8-16 A100-80G (f2c L5, C17); GCR 8B 85 GB, RoG planner 2 A100-80G for 38 h, CGM-style reader 64 A100s (f2d L4, L11); GCR 0.5B decoder 10 GB per GPU in training, fits 12 GB (f2d L4, C39).
- Offline tests cost CPU only and no model tokens: cross-runtime replay (a few hours of scripting, f2d L1); test-selection replay (f2c L1); token-bounded subgraph sweep (f2a L5); co-change warning precision (f2c L10); rule mining on the 75 held-out commits, 4 cores and 16 GB (f2c L12).
- Agent pilots: 80 task runs (2 arms x 40) times our mean per task, "a figure not in the record" (f2d L3). R5 gives 192 M tokens for the D2 arm [hypothesis]; not repeated.
- Graph builds: tree-sitter index 6 s at 49K nodes, about 3 min at 2.1 M nodes on an M3 Pro (f2b L1, C14); statement-level graph 1.7 s to 33 min, 134k nodes median (f2d L5, C54); a graph-database indexer ran out of memory on sympy (C82). Our import graph rebuild 0.40-0.49 s [observed].
- Installs named, none with source or size: language servers per language (pyright, tsserver; owner decides; f2c L5); a Java tracer (f2d L6); a test-selection tool (f2c L1); a map MCP server (f2a L1); indexers, zoekt, SCIP (f2c L6).

## 5. Steps the record already proposes next (graph side of this track)
All proposed, none started; any install or download needs the owner's word (rule 3).
1. Cross-runtime edge replay: the 1,028 recorded pairs plus a URL-to-route matcher; precision by hand on a sample; held-out recall at 8,000 tokens on backend and mobile seeds. Pass: at least half of the 158 unreached pairs linked at precision 0.9 or more, or recall up 0.05. Cost: 0 tokens, a few hours of scripting for three runtimes, no card. Agent pilot only if recall moves (f2d ranked 1, L1).
2. Closure tool inside the typed-traversal pilot, counting read/search calls per task, need 18 % or more fewer (f2d ranked 2 and 5, C96). Precondition: a 40-task two-arm pilot, with an embedding arm in every graph test (f2a L3).
3. Token-bounded subgraph sweep: typed-store answers at filled caps 512-8,000 tokens, depth and direction swept, recall per token on closed commits; fails if flat (f2a L5, ranked 4). Our earlier cap was not filled (C88).
4. Recorded-session replays: cards in place of source reads, tokens only (f2a L4); paths-plus-lines returns vs our readers' returns (f2a L8); symbol slices vs whole-file reads in paired edit tasks (f2b L8, ranked 1 there); overview share of CLAUDE.md and briefs (f2b L7).
5. Test-selection replay over the check's past commits (f2c L1, ranked 1 there): time and every missed failure; first count the suite's languages and test-execution share.
6. Fix-created defects vs existing tests, then an agent arm (f2c L2).
7. Co-change warning precision and firing rate on held-out commits (f2c L10); rule and path ranking on the 75 held-out commits, bar P@10 +0.02 over our PageRank plus co-change ranker (f2c L12, C92); the history signal first without a model (f2c L11).
8. Replay on the recorded overstatements (S4, 20-plus) with a fact checker, 0 model tokens (f2d L7); replay on the 117 recorded hand-overs for typed memory (f2d L12; teammate-adjacent).
9. Edit replay with and without revision checks for fact-level invalidation (f2b L14, no model).
10. Union of typed-store answer and keyword search on closed commits at equal tokens (f2a L9); regular-expression links from commit messages and PRs to files, ranked against our co-change arm (f2a L6).
11. A second, larger repository in the testbed (lane 8) to see whether gains grow with size (f2b L16).
Marked "not proposed": language-server tools beyond a pilot with use rate logged (f2c L5); dynamic slicing, needs a tracer install (f2d L6); data-flow slice tools, model-written queries, graph database (negatives); model-added boundary edges only if step 1 leaves many pairs unreached (f2d ranked 9).

## 6. Not read
- The claims, gate and refuter files of each part, the journals `RUN:journal/2026-11-23/d2c.jsonl` and `d2d.jsonl`, and `RUN:fields/2m-graphs/collect-prior.md`: I relied on the report folds.
- f2b: read in two pieces; the text of answer item 5 and the first lines of the L11 row were seen only in part. f2a, f2c, f2d read in full.
- `R5-handback.md` and `R6-synthesis.md`: only graph lines and the head (grep and head), as the brief allows.
- Named by the reports but not opened by them: Cho and Park 2026 (not found); Latent Space transcript, SWE-grep chart values, Unblocked blog, RepoMem and TDAD not searched (f2a); CodeScaleBench run results, Cursor Context Bench, Claude Code index-drop primary, TUM thesis, ContextBench 2602.05892 (f2b); TARMAQ SANER 2016, Kovalenko, Rolfsnes, Silent Regressions full paper, graphify ARCHITECTURE.md; folders `tarmaq-saner`, `kovalenko-zen`, `kovalenko-core` hold wrong downloads (f2c); Kotiranta et al. 2022 (bot filter), ToG-2, EffiQA, CypherBench (f2d). The graph-v2 lane files `graph2/graph-v2/lane-*.md` were not read by any of the four parts.
