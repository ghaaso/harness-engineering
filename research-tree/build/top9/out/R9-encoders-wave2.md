# R9-encoders-wave2: f3a, f3b, wave-2 synthesis and its refuter, "Not covered" lists

Places: `f3a:n` = `RUN:fields/3a-encoders/f3a-report.md` line n; `f3b:n` = `RUN:fields/3b-encoders/f3b-report.md` line n;
`W2:n` = `RUN:closing/wave2/SYNTHESIS-wave2.md` line n; `W2R:n` = `RUN:closing/wave2/SYNTHESIS-wave2-refute.md` line n
(r-numbers are its rows); `HB:n` = `RUN:closing/HAND-BACK.md` line n. Cn / Ln / Nn = the claim, lead or negative ids of that file.
Marks: [quoted] = a published source as the file reports it; [hypothesis] = reasoned, untested; [computed] = arithmetic marked
as such by the source (kept, never upgraded). Nothing below was measured by me or, per the reports, by the run (f3a:6, f3b:6-8,
W2:10). All sources: public benchmarks, mostly Python; none measures the seven measures on our harness (f3a:6, f3b:6-8).
Already digested in R5, R6, R7: the embeddings-null framing, the seven assumptions, D4 outline, N16-N23 one-liners; only
what is new or differs is added. Token-saving items (hybrid index L3 as a token cut, semantic caches, KV reuse, L25, L65 as a
token lead) are a teammate's: one line each in section 4 only.

## 1. What was built, run or measured

No experiment was run in any of these parts (f3a:6; f3b:6-8; W2:10, W2R:22 r2). They are literature reads with claim checks:
- f3a: 66 claims, confirmed 34, holds in part 19, refuted 1 (C19), cannot be checked 12 (f3a:21-23). f3b: 100 claims, confirmed 43,
  holds in part 49, refuted 4 (C20, C24, C71, C90), cannot be checked 4 (f3b:26-30). Wave 2: 94 rows checked, holds 66, wrong 9,
  overstated 17, uncited 2 (W2R:12). [quoted]
- Source figures the digest needs (all [quoted], makers' own unless stated, one run per cell, public Python benchmarks):
  - Tuned issue-to-function retriever (SweRank): function Acc@10 74.45 (137M) and 82.12 (7B) vs BM25 36.86 and CodeRankEmbed
    58.76, SWE-Bench-Lite (f3a:31; W2:194-201). Unfiltered fine-tuning falls below the start (f3a:31, C04; W2:237 N20).
  - CORE-Bench (other authors): tuned rows lead BM25 by 6.1-22.6 NDCG@10 points in all four repository-size regimes (f3a:31).
    Transfer to nine languages: 44.02 vs 74.45 on Python (f3a:31).
  - Tuned listwise reranker: function Top-10 59.1 to 73.7; with the 7B retriever 82.12 to 88.69 (32B reranker); one group
    (CoRNStack and SweRank share makers). Off-the-shelf rerankers not reliably positive on code (f3a:32).
  - Hybrid index beside grep, Claude Opus 4.7, 91 instances, 3 seeds: resolve 50.4 vs 41.9 %, turns -22 %, tokens -9 % (f3a:33;
    gain mostly Go: 47.1 vs 29.9; Python 47.6 vs 45.5). Makers' own, one model, vector part not isolated.
  - Seed injection (CodeGrep): top-2 file precision 0.445 gave -7 % tokens, 0.375 gave +21 %; three points, one 30B open model,
    one run (f3a:34).
  - Trained GNN over a repository graph (GREPO): Hit@5 31.51 (GAT) vs 21.32 for untrained Agentless (this row is Agentless, not
    CF-RAG: f3b:41, f3b:146-148); without history anchors 19.13, below Agentless. No BM25, PageRank or tuned-retriever row
    (f3a:38; f3b:41). The 21.32 label is corrected in f3b; f3a's text still carries "CF-RAG" at f3a:38 (and its C34).
  - Ground a draft against the project's symbol index (De-Hallucinator): exact API matches +23.9-61.0 % relative from a low start
    (4.8-8.3 %), wrong-first completions, best of k, 11 Python projects, models up to 15.5B; maker's own (f3b:38).
    Strictly project-symbol hallucinations are about 11 % of hand-labelled code hallucinations, upper bound 25 % (f3b:12, :38).
  - Learned co-change ranker (CoRanker): NDCG@5 0.8394 (f3b:43) or 0.8399 vs 0.8023 for plain counting (W2:99); gain 1.05-1.10x
    per project, 150 Java projects, trained per project; CodeBERT features add 0.0008 NDCG (f3b:43). Makers' own.
  - Program-graph bug checkers keep 0.24-0.38 of synthetic accuracy on real bugs; BugLab flags at least 98 % false on mature
    packages (f3b:44, :19-20). A hint, not a gate.
  - Zero-shot structure-only link prediction (ULTRA): inductive MRR 0.435 vs 0.342 per-graph supervised (27 graphs); transductive
    0.312 vs 0.348 (13 graphs, below); no software graph (f3b:42).
  - Wave 2 additions in my files: MARIN (project dependency context + decoding mask) hallucinated-API rate -73.56 % relative vs RAG;
    AST existence check recall 0.876 at precision 1.0 on 200 snippets, only 39 clean samples; no agent in any (W2:28-31).
    Real-but-wrong symbols pass an existence check (W2:33-34). Project APIs made up 85 % vs library APIs 13 % on four small
    2023 models and one company project (W2R:28 r8). Time-decayed and set-rule history forms: decay MAP up to +80 % (one Java
    project); TARMAQ top-10 hit 65 % of unseen queries vs ROSE 0 %; GitCF Hit@10 0.322 to 0.403, file level (W2:151-157).
    One tuned convex fusion weight 0.454 vs RRF 0.425 NDCG@1000 (MS MARCO, independent re-test), our k = 60 fusion held co-change
    on top in 224-226 of 226 tasks (W2:162-165, :309). Rule learners (AnyBURL) at embedding level after 100-1000 s CPU vs
    1 to 200-300 h of embedding training (W2:167-173). KG embedding: ComplEx on FB15K-237 24.7 to 34.8 % MRR across studies, so
    training form decides as much as model (W2:175-186). Our E2 had 1-vs-all, reciprocals, N3 and Adagrad; it lacked N3 at the
    published weight (0.05-0.1), rank above 512 and a selection that separates settings; E2 reached 0.68-0.75 held-out MRR; no source
    sizes the gain left (C65 refuted) (W2:177-180). Temporal GNNs on commit streams Hit@5 21.65-25.39, under GREPO's 31.51 (W2:210-211).

## 2. Results that decide a choice (new or differing from R5-R7)

Won, for its form (all [quoted] unless marked):
- Text retrievers fine-tuned on issue-to-edited-code pairs from many repositories are the strongest, partly independent evidence
  that learned encoders beat BM25 on issue localization: 1.4-2.8 times BM25 (f3a:11-12, :72-73 [computed ratio]). A 137M one fits 12 GB
  (f3a:12). Condition: filtered training data, Python-heavy, no agent, no tokens (f3a:31).
- A grounding check on invented project symbols is the one training-free quality lead with a size attached (f3b:12-13, :38), but
  context gives the larger part of the gain, not the existence check (C101 refuted: W2:33; R5 already says so) and the strictly
  addressable share is about 11 % (25 % at most) (f3b:12).
- A learned ranker over history features beats counting 1.05-1.10x per project; semantics add almost nothing; history carries it
  (f3b:43, :21-22). This is a different model class from our identity embeddings, so it neither agrees with nor contradicts our
  null (f3b:104-106; C94 corrected).

Null, negative or weak (with condition):
- Off-the-shelf rerankers not net-positive across CoReB tasks (f3a:32). Specialised link predictors lose their edge against tuned
  plain GNNs under hard negatives (f3b:46 L9). Cross-project training for a label-poor repository: negative transfer in 9.5-30.2 %
  of pairs, one seed (W2:236 N19; f3a:41 L11). Learned vulnerability detectors fall from 73.26 F1 balanced to 27.25 at 10 %
  vulnerable (f3b:45). A 15B LLM judging co-change NDCG@5 0.6727 vs 0.8023 for counting, not like for like (W2:235 N18).
- Graph adapters into an LLM need open weights and 2 to 64 A100-class cards; gain shrinks 1.46x to 1.12x once LoRA-tuned
  (f3b:47). Out of tier for a Claude session (soft tokens cannot be sent: f3b:47).
- GREPO's GNN margin rests on history anchors; the claim "77 training repositories comparable to 86" is read from a figure, not held
  out (f3a:38; f3b:41; W2:209-211).

Wave-2 changes that matter to this track:
- SweRank figures: f3c, and R6 (which repeats "file Acc@1 72.63 vs 43.43", R6-synthesis.md line 76), read the paper's table one row off.
  Right reading: 137M file Acc@1 66.42 vs BM25 38.69 vs start 52.55; function Acc@10 74.45 vs 36.86 vs 58.76; 72.63 is the 7B's
  (W2:194-201; W2R:62 r42, r43). Direction stands: part of the gain is the pretrained start. The three records carrying the shifted
  figures are d3c-0300, x115-0327, x117-0330 (corrections proposed d10-0504 to 0506, not applied: HB:1296+ "Open", item 7).
  R6's line 76 should read 66.42/38.69.
- L47 ULTRA: 12.87 GB at batch 64, so `needs 24 GB` as measured, where the wave-1 table said `fits 12 GB`; GraIL fits 12 GB;
  NBFNet needs more (W2:208-209). f3b L5 says ULTRA inference `fits 12 GB` computed from 177k parameters (f3b:42): two tags for
  two things (inference computed vs batch-64 measured run); not reconciled in the files.
- L69 (KG embedding at best form) fits 12 GB: about 0.16 GB at d = 2000 on 2,450 nodes, 6.4 GB at 10^5 nodes, assuming Adam-type
  state (a high figure for Adagrad); 24 GB from about 10^6 nodes at d = 500 [computed] (W2:181-182, W2R:60 r40).
- Rank moves by the run's rule: L13 up to "measured gain, independent" (oracle choice only), L12 down to "no or mixed gain"
  (W2:80-83, :270-274; W2R:41, :39). L12 and L13 are memory-store leads; teammate's tier.
- Correct reading of the 12 GB KV pool, L23: 11,000-30,000 tokens against a 119,000-token median prefix [teammate's].

Must NOT be ruled out yet (one null is not a verdict) (each as the files say):
- The embeddings null x09-0306 "holds as a result about one form" (W2:294-297). For identity KG embeddings it is contradicted only on
  N3 weight, dimension, selection and the untested rule learner (f3d:96-98 via W2:294-296); for the wider encoder family the
  model-class premise is contradicted for text, transfer and inductive forms (W2R:90 r70). Both parts are stated; do not shrink the second.
- Not found in any source read (so open, not negative): an embedding-only on/off inside a strong-model agent with tokens counted;
  any GNN against BM25, PageRank or a tuned retriever; any inductive link predictor on a co-change, call or import graph (six
  searches); any learned encoder measured on tokens, turns, time or mistakes of an agent with a closed strong model; an
  independent replication of GREPO, SweRank, GNN-RAG, CGM or ULTRA; a crossover curve over graph size, history length or number of
  training repositories; hallucination rates by retriever; any result on a private or very large repository (f3a:124-134;
  f3b:131-140; W2:256-267).
- Wave-2 keys read empty: learned fusion, temporal GNNs, hypergraphs or rule learners against counting on code; KG embeddings
  at best form on code; size crossover (encoder-data-scale, empty); graph vs no graph on code hallucination (W2:256-267).
- Scale: not decided for code. Off-the-shelf dense falls behind BM25 on large text corpora (0.78 to 0.59 over a 450-fold corpus;
  text, one benchmark), but an untuned-for-the-task 0.5B code embedder keeps its lead over BM25 in the large CORE-Bench regimes
  (21.1 vs 12.4, 23.3 vs 14.4); the earlier "larger indexes favour BM25" is withdrawn for code (f3a:42, :86-88). Wave 2 adds dense
  below BM25 at every size on text QA (29.9 vs 50.5, independent), still not code (W2:247-248).
- Seed precision threshold (0.45 to 0.68) and "hurts below 0.45" are three points and an extrapolation (f3a:34).

Rule for every ranking test (new, f3d via W2:308-311): random tie-breaking; leak-free splits; filtered ranking only for the
link-prediction selection metric, not for P@10; every arm scored alone and unrestricted. Ranking gain alone sets no effect on
resolve: recall rises 0.16-0.26 resolve points per localization point, and a recall gain can lower resolve (f3a:45, :79-80).

## 3. Open faults, open questions, missing measurements

- Faults in the record (run records, none corrected in place; library rule 1): d3c-0300, x115-0327, x117-0330 carry SweRank
  figures one row off (W2:200-201; HB open item 7). GREPO's 21.32 labelled CF-RAG in f3a:38 (C34), d3a-0326, x55-0301; corrections
  d3b-0512, d3b-0513 proposed (f3b:146-148). Proposed corrections open in d10.jsonl, for the top session: d10-0540 to 0548, 0550-0552,
  0554 (HB:1296+, item 7). x120-0400..0424: 25 result records numbered in the hypothesis range, needs a ruling (item 1). f3d counts
  156 vs 123 (item 2). 22 f4c records kept though not passed (item 3, teammate's field). 14 f3c records cite a number not within
  3 lines; d3c-0403, d3c-0407 cite removed records (item 4; W2:358).
- Wave-2 synthesis faults found by its refuter and fixed there: SweRank row shift; "no source measured a graph or cache in our
  units" is false for code-task tokens elsewhere (CrossCoder 2.12x input tokens, 1.51x time; commit graph about 45k tokens a case),
  true for our repositories (W2R:82 r62); N23 overstated; D4's n and cost (below) (W2R:101-103, :103 r83).
- Claims that cannot be checked and so decide nothing: C10, C33 (Cursor blog, page not kept), C37, C50 summaries; C59-C66 computed or
  reasoned (f3a:23); f3b C88, C89, C100 second-hand through earlier files; C99 reasoned (f3b:27).
- Missing measurements, each with what it needs:
  - Count of invented project symbols in our recorded edits and fix rounds (script, no model; hours); sets whether the 11 % share
    applies at all (f3b:57-60). Wave 2 widens it into replay (a), 1 R: nonexistent names, same-turn catches, real-but-wrong symbols,
    version errors, causing-commit need, today's commit count (W2:304-306). Needs an approve: (W2:366-367).
  - Top-2 file precision of a candidate retriever on our closed tasks, no agent tokens, before any seed injection (f3a:34).
  - Ranking test of a released 137M or 0.6B code retriever vs BM25 and our ranker on our closed commits with issue-like text; one
    embedding pass per repository on the 12 GB card (hours: a measurement) (f3a:31). Weights named in DOWNLOADS.md first (rule 3).
  - Our per-commit P@10 spread: the commit count behind x09's SE 0.022 is not in the reports (C55 gives the SE; C56 puts verdict
    graphs over 116 commits); n for D4 depends on it (W2:334-340).
  - Whether ULTRA zero-shot beats our RRF ranker (P@10 0.2493) on a 50-commit test with a new-file arm (f3b:42, :66-68).
  - Whether the agent's own runs already catch invented names in the same turn (f2e via W2:38-39).
  - Hallucination measure for retrievers: only citation accuracy exists (92 % hybrid vs 78 % dense vs 74 % BM25, single author,
    f3a:33, :133).
- Bar and cost questions on D4 (W2R:100-103): the +0.02 P@10 bar against the best untrained arm is a judgment; at 242 held-out
  commits a true +0.02 would be seen about half the time; 80 % power needs about 474 [computed]; paired arms lower it by an unknown
  amount; the 18.8 M cost has no measured part (W2:334-345).
- GREPO-style GNN: its margin rests on history anchors our ranker already has; its task (issue to files) is not ours (f3b:71-72).
- Not tested here, in the sources' own words: any source run at our sizes on our repositories (W2:264-267). No Claude model was the
  main agent in any f3b source except SpIDER's free-agent appendix (f3b:7-8). Free-agent graph expansion gain is +0.46 to +2.74
  points in single runs (about 18 instances = 7 points) and tokens not given (f3b:39).

## 4. Costs (token, time, memory, installs; basis marked)

Units used by the wave-2 file: R = 4.7 M tokens a replay helper [judgment, borrowed from a closing sample reader], A = 3.2 M a task
run [computed], caps 2.3x [computed] (W2:10-11; W2R:23 r3). Their basis is a guess, not measured in this run.
- Five replays (3.0 a-e), no model run, no install, no card: 5 R = 23.5 M expected, cap 54.1 M, each under 1 h (W2:304-307). The refuter's
  count gives 4 R = 18.8 M, cap 43.2 M for four replays, and notes L61's replay (1 R, 4.7 M, cap 10.8 M) was missing from the sums
  (W2R:92 r72, :114 r94). W2's final text carries five.
- D4 (ranker test, each family's best form): 4 R = 18.8 M [judgment, no measured part], cap 43.2 M [computed on that guess], under 4 h of
  helper time plus card hours from E2's wall times x d ratio (a measurement) (W2:341-345). Card fits 12 GB at our size
  (0.16-6.4 GB; 24 GB near 10^6 nodes). Installs, sources and sizes a measurement: AnyBURL, the public repository's clone, x09's
  runtime if absent; a copy of x09's code in a container, never the recovered files (rule 1) (W2:345-349).
- Tuned retrievers: 137M 0.55 GB fp32, 0.6B fits 12 GB, 7B 14.2 GB weights needs 24 GB [all computed, f3a:31, :66]; training needs
  8 GH200 (SweRank), reranker 7B needs 24 GB, 32B needs more, a 4B reranker over long prompts not shown to fit 12 GB; about 19 LLM
  passes a query over 100 candidates (f3a:32). CGM 4 x A100-80GB inference, 64 A100 to train (f3a:43). GREPO's GNN ran on one RTX
  4090 (24 GB); its anchors need an 8B embedder (needs 24 GB) (f3b:41). ULTRA 12.87 GB at batch 64 (W2:208); pretraining 2 A100-40GB
  (f3b:42). GNN-RAG "single 24GB GPU"; SubgraphRAG retriever 434M fits 12 GB [computed]; GFM-RAG 8M fits to run, 8 A100-80G to train
  (f3b:40). Program-graph GNNs run on 11-16 GB cards; training 12 h to 1.5 weeks (f3b:44). Frozen embedder + GNN fits 12 GB
  (Sentence-BERT 1.30 GB; DeBERTa fine-tune 12.53 GB at the border) (f3a:40).
- Index build and refresh time per repository, query latency: all "a measurement" (f3a:33; f3b:60-61).
- Installs or downloads named as needed, none done: released SweRank or CoRNStack weights; GREPO benchmark; ULTRA checkpoint; released
  program-graph model per language; AnyBURL; public repository clone (each "to be named in DOWNLOADS.md", sizes not stated)
  (f3a:31; f3b:41-44; W2:347-349).
- Teammate's, one line each: hybrid index tool ON/OFF (-9 % tokens, f3a:33); L65 BM25 candidate list at task start (full scale 101K vs
  895K tokens, text QA, W2:131-137: costed 192 M joined, 384 M alone); semantic caches, KV reuse (W2:114-137).

## 5. Steps the record already proposes next for this track

Test order given by the owner's idea O4: 12 GB first, 24 GB methods after (f3a:50, :120-121). Ranked in the files [hypothesis]:
1. Wave 2's D4: learned arm vs best untrained history arms (decay, TARMAQ, commit-text match, 1/|e| weight), rule learner (AnyBURL),
   KG embedding at published training form, one tuned fusion weight; held-out later commits of FixFlow, clinic and a public
   repository; no agent; 18.8 M [judgment], cap 43.2 M, under 4 h plus card hours; needs an approve: with n set from x09's
   per-commit spread (W2:322-352, :367-370). Decision it changes: no learned arm above the best untrained arm by +0.02 closes the
   encoder family for this ranker at our size, with the forms named; a learned arm above it joins D2's index; an untrained form
   above the co-change term replaces it (W2:350-352).
2. The five replays (a-e), 23.5 M, cap 54.1 M, no install, no card; a needs an approve: (W2:366). In particular (a) counts invented
   project symbols, same-turn catches, version errors, today's commit count.
3. Ranking of a released tuned retriever (137M, 0.6B) on our closed commits, then as the vector part of D2's index or as seed with
   the precision gate (inject only above 0.68) (f3a:52-59). D2 Phase A gate: 6 points over BM25 (W2:277-278 per the refuter, W2R:94
   r74 notes Phase A scores issue-like text but history forms take changed files as queries; the design omits a seed rule). The wave-2 text
   keeps D2 Phase A as in wave 1 and puts history forms in D4 (W2:313-316).
4. Agent arms: index ON/OFF with Opus or Fable, tasks x 2 arms x 3 seeds, counting turns, tokens, success and tool-call share
   (f3a:52-56) [measurement; not in the sums].
5. ULTRA zero-shot and a history-feature ranker (CoRanker kind) against our RRF ranker, our 50-commit test plus a new-file arm; CPU or
   12 GB (f3b:64-68). Learned fusion with PR-level truth (f3b:64-65).
6. Tuned reranker 7B on the university card (24 GB) after the 12 GB results; whether a 4B or quantised 7B fits 12 GB is a
   measurement (f3a:62-64).
7. GREPO-style GNN, text-feature GNN: co-change test with a new-file arm and a history arm against the simple ranker (f3a:66-67).
8. Cheaper forms listed as inputs: commit-size weight w/|e| (f3b:51; W2:188-192), small checker as a hint after the symbol count
   (f3b:74).
Stated stop rules: result that would show it does not work for us is named per lead (f3a:31-46; f3b:38-52); examples: tuned retriever
not 6 points above BM25 or grep on our tasks; seed top-2 precision under 0.45; invented project symbols under about 1 % of our edits.
Wave-2 run totals, for the owner's cap: wave 2 adds 42.3 M expected in W2's final text; with wave 1's 1,155.6 M that is 1,197.9 M
expected, 2,755.3 M at caps (W2:373-375); the refuter's version has 37.6 M and 1,193.2 M for four replays (W2R:114). Tests outside
the sums: L13, L60, L64, L72 (W2:362).

## 6. Not read

- Not read by me: R5, R6, R7 beyond section 2 and a grep (done as brief said); the underlying claims.md, gate.md, refute.md, journal
  records of f3a/f3b and f2e/f3c/f3d/f4c reports; `RUN:papers/`; `closing/SYNTHESIS.md` (wave 1) except as cited. HAND-BACK read at
  "Not covered" (1193-1230) and "after wave 2" (1296+) only.
- Named but not opened by the run (public route untried or not trusted): HiLoRM; CS-TAG; HeTGB; PatchRecall; SWE-Spot; C2C;
  Verilog reranking; hallucination taxonomy 2409.20550; SpIDER appendix A.8 (f3a:135-136). Ries 2026 thesis (broken file); FCP2Vec;
  GraphTranslator and LLaGA tables; TEA-GLM, GraphAdapter, GraphLLM, GRACE, Neo-GNN, temporal NBFNet, ATHENA; co-change entropy
  2504.18511; link prediction survey 2312.04997 (f3b:141-144). TARMAQ (EMSE 2018), Ye et al. FSE 2014, AmaLgam; Ruffinelli
  OpenReview, Ali appendices 13-16, Lacroix, Sun et al., Rossi sections 3-4; Jigsaw-LightRAG (behind a bot check, for the owner to
  save), GitTemporalAI, VersiCode, CodeUpdateArena, VersionExec (HB open item 6).
- Vendor pages only: Voyage-Code-3, Qodo-Embed, Nomic-Embed-Code, Semble, sverklo, Morph (f3a:138). Downloaded, not used: RankZephyr, RLCoder,
  BiGTex (f3a:140). SemanticForge (C22) unreliable, not used (f3b:145).
- Not covered keys (HB:1193-1230, owner field in the table): 34 keys outside parts; those wave 2 read are listed at HB:1296+.
  Left unread for field 3 as written: tuned-agent-localizer (owned by f6, small model on recorded trajectories: wave 2's L72), repo-graph-tools
  (f2), learned-compression (f6), learned-memory-index (f4); for field 2: graph-cache-invalidation, library-entry-graphs,
  small-model-graph-tools, repo-model-freshness, repo-scale-benchmarks, pathway-graphs, datalog-code-queries, gnn-code-encoders
  and graph-llm-adapters (xref f3, read in f3a/f3b), temporal-kg-memory (f4). All 14 keys of the wave-2 parts were read
  (W2:256-257; HB:1296-1311), with the empties in section 2. Datalog and exact program-analysis queries as a replacement for reading
  remain unread (HB, key 30, owner f5).
- Found named but missing: the commit count behind x09's SE 0.022 (not in the reports; W2:336-337); the source and size of AnyBURL, the
  public repository, x09's runtime (W2:347-348); source and size for every released model above (DOWNLOADS.md entries do not yet
  exist in what I read).
- Note for the plan: HB:1296+ item 7's corrections are proposals, not applied; the top session decides. The digest should use the
  corrected SweRank numbers (66.42 / 38.69 / 52.55 file Acc@1; 74.45 / 36.86 / 58.76 function Acc@10).
