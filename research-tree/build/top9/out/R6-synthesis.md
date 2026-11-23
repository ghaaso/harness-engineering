# R6-synthesis: digest of the research run's synthesis and the four wave-2 parts

Places: `SYN:n` = `RUN:closing/SYNTHESIS.md` line n (RUN = `C:/research-runs/2026-11-harness-leads/`). `f2e`, `f3c`, `f3d`,
`f4c` = `RUN:fields/<2e-graphs|3c-encoders|3d-encoders|4c-memory>/f<part>-report.md`; I cite by lead row or section because the
tables are one line a row. Marks: the run measured nothing itself (SYN:11-12; each part report's header), so every effect below is
[quoted] from a published source as the report quotes it, except [observed] (our own earlier measurement as the report names it)
and [hypothesis]. Run units: A = one agent task-run, about 3.2 M tokens [computed, SYN:17-18, not measured on ours]; R = one replay
helper, 4.7 M tokens [judgment, SYN:19].

## 1. What was built, run or measured

The run is a literature and design run: no experiment, install or download (SYN:11-12; f4c header). Output: leads L1-L58 and
negatives N1-N15 (wave 1, SYN:68-565), L59-L75 and N16-N23 (wave 2 block, SYN end), designs D1-D3 (SYN:630-690) and D4 (wave 2).
All twelve wave-1 reports and the four wave-2 parts ended DONE (SYN:4; wave 2 block).

Our own harness figures named in the synthesis [observed, earlier measurements] (SYN:12-14):
- Token sinks: 96.8 % of calls re-read the window (S10); fixed prefix 27 % (S12); own output carried 26 % (S13); fetched content
  26 % (S14); read-only calls 64 % / 52 % of calls (S15); plans below spend 2.3x (S18) (SYN:51-59).
- Quality sinks: mistakes after a compaction 0.58 -> 1.35 per 100 calls (S1); at least 5 P1 + 10 P2 defects created by fixes (S2);
  summary behind its hand-over 63.2 %, 74 of 117 hand-overs (S3); 20-plus overstated reports (S4); false claims 0 of 2,727
  checkable (S5) (SYN:42-46, 233).
- Fact-level invalidation replay: 0.00 % stale vs 6.49 % file level vs 12.00 % at a 20-commit time-to-live (SYN:455-460); never
  invalidating served 32.70 % stale (f4c answer 3).
- Cross-runtime pairs: 158 of the 160 co-changed pairs the import graph cannot reach are cross-runtime, 158 of 1,028 pairs, one
  repository (SYN:246-249).
- Our typed store +0.076 recall over scripted search, but +0.024 [-0.023, +0.075] outside the mobile app (f2e L5, folded F1).
- Embeddings null x09-0306: largest gain +0.0032 over all code files (f2e F4); our RRF ranker P@10 0.2493 (SYN:266); fixed fusion
  held co-change candidates at the top in 224-226 of 226 tasks (f3c L6; f3d ranked note); E2 held-out co-change MRR already
  0.68-0.75 (f3d L2).
- Import graph rebuild 0.40-0.49 s (f2e L1); repository about 477 files, about 230 commits (f2e F1; f4c L1).

Wave-1 leads that bear on the owner's track (effect [quoted]; evidence: own = makers' own, ind = independent):
- Quality tree. L1 test-filtered selection among candidates: Agentless 77 -> 96 of 300 (32.00 %) with regression plus reproduction
  tests; Trae N=3 random 53.40 %, selected 62.27 %, oracle 66.20 %; own, five groups; refuter: holds, pass@k figures are oracle
  selectors (SYN:68-80). L6 a checker above workers that sees several versions: with one faulty agent hierarchical -5.51 vs flat
  -10.54 vs linear -23.72 points; small tasks; holds in part (SYN:134-143). L8 lint/type gate: resolve 15.0 -> 18.0 %, own, one
  run per arm (SYN:155-164). L11 claims checked by execution: GPT-5 submitted 100 % and resolved 44 %, silent failures 68-80 % of
  failing runs, ind (SYN:186-196). L9 code-to-test impact map: test-level regressions 6.08 -> 1.82 % but resolution 31 -> 29 %,
  empty patches 14 -> 26 %, own (SYN:166-174).
- Graph and embeddings. L3 hybrid index (vector + BM25 + call graph) beside grep, Opus 4.7: resolve 50.4 vs 41.9 % (p = 0.003),
  turns -22 %, tokens -9 %, per-cell cost null; gain mostly Go; own, one model (SYN:97-109). L35 text embedding index over
  definitions, "the arm a graph must beat": +0.058 to +0.101 Acc@10 over grep for Qwen3 0.6B-14B; graph on top of embeddings
  -0.022 to +0.036 post hoc; ind, pre-registered, 500 tasks, 12 Python repositories (SYN:434-443). L28 map tools in the agent's own
  calls: tokens -25 to -39 % on kernel localisation, but +1 to +12 % on test writing; an optional graph tool went uncalled in 58 %
  of trials (SYN:369-382). L34 tuned issue-to-code retriever: Function Acc@10 74.45 (137M) and 82.12 (7B) vs BM25 36.86; seed
  injection -7 % tokens at top-2 precision 0.445 but +21 % at 0.375 (SYN:421-432). L15 typed traversal tool: Acc@10 71.53 vs 66.06
  but tokens rise; the one pre-registered hop study is negative, -0.004 to -0.007 (SYN:235-244). L16 cross-runtime edges: no agent
  measure anywhere (SYN:246-257). L47 learned graph ranking: GREPO Hit@5 31.51-32.47 vs 21.32 (no BM25 row); ULTRA zero-shot
  0.435 vs 0.342 inductive but 0.312 vs 0.348 transductive; AnyBURL good after 10 s CPU (SYN section 1.5, row L47).
- Hand-over and memory items (S1, S3: L12, L13, L14) act on quality; the record book's store itself is the teammate's.

## 2. Results that decide a choice

The embeddings test against the sources (SYN:589-615; f3c and f3d "seven assumptions"):
- x09-0306 "holds as a result about one form" (f3d folded; f2e F4). The reports split on what it rules out:
  - Contradicted as a verdict on the family: model class (gain comes from a pretrained text embedder over definitions, SYN:595-598,
    and from training on hundreds to thousands of repositories, f3c L8, N3); signal (text and history carry most gains,
    SYN:601-603); fusion (one tuned convex weight beat RRF on every dataset, 0.454 vs 0.425 NDCG@1000, ind, f3c L6); use; target
    (measured effects sit in tokens, turns and calls at about equal success, SYN:590-593).
  - Not contradicted: scale and evidence base. No source sweeps graph or repository size inside one study (SYN:599-601; f3c
    assumption 3). Benchmarks are 6-17x our entities and 11-64x our facts, and best forms use d 1000-4000 vs x09's at most 512 and
    always the smallest (f3d assumption 3).
- f3d, KG embeddings [quoted, benchmark link prediction only]: training form decides as much as model (ComplEx FB15K-237 24.7 ->
  34.8 % MRR across studies, f3d L1). x09's E2 already had 1-vs-all cross-entropy, reciprocals, N3, Adagrad; E1 the
  self-adversarial form (f3d answer 2, L3 withdrawn). It departed on N3 weight (published 0.05-0.1), dimension and the selection
  signal (P@10 standard error 0.022 vs differences of at most 0.015). No source sizes the gain left; the draft "+0.06 to +0.10 MRR"
  was REFUTED (f3d C65). So the premise "its arms were the family's best form" is contradicted only in part.
- Rule learners: the one family member x09 never tried; AnyBURL at state of the art after 100-1000 s on CPU vs 1-300 h for
  embeddings (ind, Rossi); ComplEx-N3 the only embedding level with it on five benchmarks (f3d L7; f3c L13). Gain on a
  few-relation code graph unknown (f3c L13).
- Untrained history forms are the baseline x09 lacked (all makers' own): time decay up to +80 % MAP (one Java project); TARMAQ unseen
  queries a correct file in top 10 65 % vs ROSE 0 %; commit-text match Hit@10 0.322 -> 0.403 (f3c L3-L5). A learned ranker over
  co-change + code features beat the count 4.3-10.2 % relative (NDCG@5 0.8399 vs 0.8023, 150 Java projects, academic, f3c L7);
  CodeBERT adds only 0.0008 NDCG (SYN:262-263). The claim that this predicts our null was refuted (f3c C47).
- Text retriever beats BM25 on wording gaps: file Acc@1 72.63 vs 43.43 (f3c L2, own), but its start CodeRankEmbed already has 58.76
  (SYN wave 2, "L34 changed").
- Null or negative, with conditions (SYN:542-562 and wave 2):
  - N8 graph-navigation agents vs strong grep 59.5 vs 83.2 % Func@5; structure on the same reads +2.34 points at +11.7 % tokens.
  - N9 model-written graphs 19.75-45.64x cost vs parsed 2.13-2.25x; parsed is already our practice (L58).
  - N11 static call graphs miss 24-30 % of edges.
  - N16 a PR-history graph over flat search +0.8 pp (4 of 500 tasks, one run, f2e L11).
  - N18 a 15B LLM judging co-change NDCG@5 0.6727 vs 0.8023 for the count (f3c N2).
  - N19 cross-project training for a label-poor repository: negative transfer in 9.5-30.2 % of pairs, direction agreement 44-54 % (f3c N3).
  - N20 retriever tuned on unfiltered pairs falls below its start (f3c N4).
  - N23 KG-embedding knobs x09 had, KBGAN, scale-only methods (f3d L3, L5, L9-L11).
- Graph and hallucination (f2e): fabricated API names fall most with project dependency context plus an existence check or mask
  (MARIN MaHR -73.56 % relative vs RAG; AST check recall 0.876 at precision 1.0 on only 39 clean of 200 samples; Python/Java;
  1.3-34B local models; no agent in any; f2e L1, own). Real-but-wrong symbols pass the check (f2e answer 3). Pinned-version
  documentation: three groups agree in direction, +10-20 points exact match with the right text GIVEN; ungated retrieval cost GPT-4o
  -39.02 points on known APIs (f2e L2, L13). A model-built graph trades abstention (91.36 -> 81.06) for comparison (56.31 -> 66.59)
  and temporal (25.73 -> 58.49) answers, so graph context can add unsupported answers (f2e L12).
- Incremental, temporal, cross-repository (f2e): incremental upkeep cuts tokens only for model-written graphs (633K vs more than
  14.7M tokens, Acc@1 down 2.7-3.3 points, own, L7). Exact deletion without model calls: 14 s, 0 calls for 1,140 of 11,402 passages
  vs 2,187 calls and 3.7 h (one author, prose QA, L4); store side only, not answer-level invalidation. Temporal commit graph for the
  causing commit F1 0.669 vs 0.563 at about 45k input tokens a case (own, L9). Library graph joined to the repository graph +4.1
  Pass@1 over version-doc retrieval at 2.12x tokens over Hydra, build 1,198.94 s a repository, Python only (own, L6). Nothing
  outside Python.
- Quality-mechanism evidence (SYN:544-545, 604-606): independent tests find every multi-agent form 2.1-14.9 % below one agent at
  matched tokens (N1); debate no better than self-consistency (N2); search over thoughts no gain at equal budget in an independent
  rerun (L21). Single runs move 2.2-6.0 points; repositories differ by over 40 points and methods flip sign between them (N14).

Must NOT be ruled out yet (one null is not a verdict):
- Learned encoder families at their best form on code: none measured on a code graph, file ranking or agent tokens (f3d "not found").
- Rule learners, temporal GNNs (EdgeBank wins on some sets; at low surprise 0.108 learned models still beat it; on commit streams
  seven temporal GNNs Hit@5 21.65-25.39 under GREPO's 31.51, no counting arm), hypergraph walk weight w/|e|, learned fusion, a
  small tuned localiser (f3c L8, L10, L12-L15). No source tests graph size against data need (f3c C89 refuted).
- Graph vs no graph on code hallucination with all else equal; a bitemporal code graph on an agent task; an inductive link
  predictor on a code or co-change graph; a graph arm vs an embedding arm in a frontier-model agent with tokens (f2e "not found";
  SYN:691-722).
- Recall gains pass to resolve at only 0.16-0.26 points per point (SYN:590-593); the "tenfold shrink" claim was refuted (f3c C52).

## 3. Open faults, open questions, missing measurements

Replays first (SYN:619-629) [no model run, no install, ten replays, 47 M tokens, cap 108 M]. Owner's-track ones: invented project
symbols (L10: count names absent from the repository in recorded diffs); DONE claims vs gate and refuter verdicts (L11);
cross-runtime pairs offline (L16: hand-checked precision on a sample, a few hours of scripting, SYN:254-257); lint/type replay of
S2's fix commits (L8). Cache, wake, prefix and read items are the teammate's. Wave 2 adds five replays, 23.5 M tokens, cap 54.1 M,
no install, no card; I did not read which five.

Missing measurements, each with what it needs:
- f (share of S2 defects that are nonexistent names, imports, signatures not caught in the agent's own run) and v (share that are
  version errors): replay of the clinic-build transcripts; sets the shares of f2e L1, L2. Needs an approve: of the replay.
- m (share of post-compaction mistakes that re-learn a stated fact) over the hand-overs behind S1 (f2e L3). The sources say 116
  (f2e) and 117 (SYN:233) hand-overs; not resolved.
- Share of cached conclusions whose premises span several files (f2e L4); repeat rate of equivalent prompts (f4c L3, L5): teammate's.
- Today's commit count for the sign of commit-history memory (f2e L10: RepoMem -13.1 on a pool under 10K commits, 46 examples; ours
  about 230). Symbol and call resolution time of a parser graph never timed (f2e L7).
- D2 Phase A: Acc@10 of finally edited files vs BM25, grep and our RRF ranker (P@10 0.2493); gate 6 or more points over BM25 and
  top-2 precision 0.68 or more for seed injection (SYN:658-662). Embedder weights 0.55 GB (137M) or about 1.2 GB (0.6B), an
  embedding runtime, tree-sitter, SQLite FTS5 and a search tool: sources and sizes not in the reports; each a measurement first, then
  the owner's word (SYN:668-672; CLAUDE.md rule 3).
- Sinks with no lead: S6 (halts) and S9 (memory leaves one check slot) (SYN:47, 50).
- Open questions in SYN:691-722: no frontier-model graph arm vs embedding arm with tokens; no size sweep; no replication of LARGER,
  KGCompass, SemNav, SeeRepo; no agent measure of cross-runtime edges; no node count at which a graph database pays; no learned
  encoder measured on a strong agent's tokens or mistakes; no inductive link predictor on code; no share of invented symbols a check
  removes; no agent run with and without a type checker; no equal-token test of one agent vs untrained sub-agents; no depth vs
  fan-out at equal work; no test of a split at a window share (the owner's 40 %); no local-plus-cloud run on one 12 GB card; no
  12 GB fine-tuning run; no independent replication of any cost figure; run-to-run variance of token counts not searched.
- Faults in the record: L3's cost p = 0.73 unsettled between per-cell and per-solved-task (SYN:99-101); f3a read SweRank's table
  one row off (SYN wave 2); f4b tags HAFix 16B "needs 24 GB" though 31 GB of weights do not fit (SYN:277-278); the owner's note
  behind the 24 GB option and his message behind C75 were not opened.
- Hallucinations: unscriptable hallucinations stay unknown (SYN:714-716); invented project symbols are about 11 % of hand-labelled
  code hallucinations, upper bound 25 % (SYN:179-180); a graph's own hallucination effect on code is not found (f2e).

## 4. Costs, with basis

- A = 3.2 M tokens per task-run [computed from f8:15, 28.8 B for 9,000 task-runs, not measured on ours; vanilla Claude Code 3.7 M
  tokens an issue, 98 % cache reads, f8:39]. R = 4.7 M, under 1 h [judgment, SYN:19-20]. Hours 77-93 M tokens an hour with up to 12
  helpers [estimate, CL:61]; SYN says at most three children (DIR:104) while CLAUDE.md now says the number is computed by r57-0414,
  so hour figures are rough, likely low. Cap factor 2.3x [computed: parts priced at 397 M used 907.7 M, S:24].
- P (paired agent pilot): 20 tasks (7 FixFlow, 7 clinic, 6 public) x 2 arms x 3 runs = 120 A = 384 M, 4.1-5.0 h [computed]; sees
  only gross effects (40 tasks see per-task savings of 18.4-33.4 % or more, f2c:29).
- D1 test-filtered selection: Phase A 15 R = 70.5 M; Phase B 80 A = 256 M; 326.5 M, 3.5-4.2 h, cap 751 M; card none; three pools would
  make Phase B 768 M; a public task set is the owner's download, size a measurement; containers per repository about 10 h manual
  work each where none exist (SYN:645-651).
- D2 hybrid index beside grep: Phase A 1 R = 4.7 M plus card hours (a measurement); Phase B 384 M; 388.7 M, 4.2-5.0 h, cap 894 M;
  third arm (typed store as traversal and closure tool) +192 M, 2.1-2.5 h; fits 12 GB (SYN:652-675).
- D3 7B retriever plus 7B listwise reranker: 388.7 M, 4.2-5.0 h, cap 894 M plus university card hours; needs 24 GB at least (14.2
  GB + about 14 GB, one at a time; 100 candidates ran on an A100-80GB, so a 24 GB fit is not shown), possibly more (SYN:676-690).
- Owner approve: list (SYN:724-741): ten replays 47 M cap 108 M; D1; D2; D3; a test-selection tool for the check (L22) 1 R, cap 11 M.
  All five 1,155.6 M expected, 2,658 M at caps [computed]. With wave 2: 1,197.9 M expected, 2,755.3 M at caps without L65's arm
  (192 M joined to Phase B, 384 M alone); D4 ranker test 18.8 M [judgment], cap 43.2 M, fits 12 GB. Tests are outside the run
  (rule 3) and need their own go and cap.
- Memory and time by lead: KG embeddings 0.16 GB at d = 2000 on 2,450 nodes; 10^5 nodes at d = 2000 about 6.4 GB with Adam-type
  state; 10^6 nodes at d = 500 about 16 GB (24 GB tier); a 1-vs-all loss needs at least 2 x batch x entities x 4 bytes, so sampled
  negatives near 10^6 (all computed, f3d C69). 100x our size (about 2.5 x 10^5 nodes) at d = 2000 complex about 16 GB with Adam-type
  state, about 8 GB with Adagrad or d = 1000 (f3d F8). Ali: 24,804 GPU hours for 21 models x 4 sets; Ruffinelli about 30
  configurations per type x loss (f3d L1). ULTRA 12.87 GB at batch 64 (needs 24 GB as measured); GraIL fits 12 GB; HYPER 25.30 GB
  (f3c L12). GREPO trained on one RTX 4090 24 GB (f3c L8). 8B Q4_K_M 4.58 GiB, 71.93 t/s; KV pool on 12 GB about 11,000-30,000
  tokens, below a 119,000-token median prefix (SYN:326-327; f4c L6). Model-added cross-runtime edges: 24 GB, 2.81 M tokens, 12.86 h
  a project (SYN:252-253). Library graph build 1,198.94 s a repository on CPU, 0.0403 GB (f2e L6).
- Training: no 12 GB fine-tuning run exists in the record (SYN:710). Repository fine-tune needs more (SymPy specialist 21.2 vs 13.6 %,
  7B, L53); learned compaction training above 441 GB (L56); Memory-R1 32 H100 three days (f4c L11); SweRank 8 GH200 (f3c L2). A
  small tuned localiser needs a few hundred successful trajectories (768 in the source); our count is not in the record (f3c L10).

## 5. Steps the record already proposes next for this track

1. Approve the replays (47 M, cap 108 M, no install, no card). Owner-track items inside: invented symbols, DONE vs verdicts,
   cross-runtime pairs, lint/type.
2. D1: if the selected pick closes half or more of the pool gap and Phase A catches a third or more of the defects [judgment], slice
   fixes get candidates and test gates; if the pool holds no more fixes than one run, N stays 1 and the tree's spend moves to L6, L8,
   L11 (SYN:650-651). Needs the owner's go, cap 751 M, a task-set download, per-repository containers.
3. D2 Phase A gate, then Phase B. Below the gate learned retrievers are dropped and the graph stays on CPU; no fall in calls or tokens
   confines index tools to large repositories (L52); a fall at equal resolve makes the index standing and opens D3 (SYN:673-675).
   Needs weights and tools named with source and size.
4. D3 at the university after D2 (the 7B + 7B pairing has no published figure; Phase A measures it).
5. D4 (wave 2): the ranker test with each family's best form: rule learner, KG embedding at published form (N3 weight 0.05-0.1, rank
   1000-2000, selection on held-out MRR), commit as one hyperedge weight w/|e|, one tuned convex fusion weight, untrained history
   forms; each arm scored alone and unrestricted because fixed fusion capped x09; n set by power (SYN wave 2 "Tests added"; f3d
   and f3c ranked lists). f3d's order: rule learner; E2 at published N3 weight and rank 1000-2000 chosen on held-out MRR; dimension;
   filtered hard negatives for E1/E3 only. f3c's order: ranked candidate list to the agent; history baseline (decay, TARMAQ, commit
   text) that any learned arm must beat; tuned weight; learning to rank. Script pre-tests before any 12 GB model: surprise index of
   our history (bounds pair counting, f3c L14), triples vs pairs, the 1/|e| weight.
6. Evaluation guards for every KG test (f3d L8): random tie-breaking, leak-free commit split, filtered ranking only for the
   link-prediction selection metric, not the P@10 target (ConvKB .396 -> .243 under random ties; KBAT .518 -> .157 after a leak fix).
7. Third arm of D2 (typed store as traversal and closure tool) only if "on" beats "off".
8. Hallucination mechanism: replay S2 for f and v first; if f is not near zero, project dependency context plus an existence check
   (card none, parser index in seconds) and a pinned-version doc index are the forms the record names (f2e ranked 1-2).
9. Teammate's, one line: cache, wake and prefix replays; record-book store (L12, L13, L38); router (L40, L48); caching trials
   (L24, L25, L46, L64, L74).

Ranking rule in the synthesis: tiers by the sink a lead acts on (quality, time, memory, tokens); inside a tier measured gain first,
independent before makers' own (SYN:32-35, 580-587). Quality tier order: independent L2 (curated compact files, +16.6 points), L6,
L11; makers' own L1, L3, L4, L5, L8, L10, L12-L14, L18-L20; no or mixed L7, L9, L16, L17, L21. Wave 2: L59 first, then L60-L62,
L65, L66-L70 [judgment].

## 6. Not read

- `RUN:closing/wave2/SYNTHESIS-wave2.md` and its refute: only the "Wave 2 additions" block of SYNTHESIS.md was read. D4's text, the
  five replays' names, L59-L75 rows beyond one-line summaries, and N16-N23 beyond the part reports are second-hand.
- The twelve wave-1 reports, SHEET.md, claims.md files, gate and refute files, collect files, papers: not opened; their places are
  cited as the synthesis cites them.
- f2e, f3c, f3d, f4c read in full; their claim ids cited as reported, not checked. I give f4c only a few lines (memory, caches, KV
  reuse are mostly the teammate's): its key findings are semantic caches need output checks (L4, L5), prefix reuse is provider-side
  and its misses follow idle gaps over 5 minutes (L7, 95.7 % hits, 7.4x amplification at 5 minutes), an exactly chosen related-task
  summary +8.08 points while a freely retrieved one falls below none (L1), and 12 GB holds only about 11,000-30,000 tokens of an 8B
  model's KV (L6).
- Named but missing: HAFix, Jigsaw-LightRAG, GitTemporalAI, QwalKeko report, SANER papers, VersiCode, CodeUpdateArena, VersionExec,
  RustEvo2 (f2e); Ye et al. FSE 2014, AmaLgam, TARMAQ EMSE 2018 version, Rolfsnes thesis, GREPO curve below 77 repositories,
  SweRank data-size figure (f3c); Ruffinelli OpenReview, Ali appendices, Rossi sections 3-4 (f3d); MemoryOS, Cognee, Nemori,
  MemGovern, MemCoder, several KV and parametric-memory papers (f4c). The hand-back "Not covered" list (CL:107-119) not read.
