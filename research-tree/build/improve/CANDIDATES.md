# Improvement round: the forms chosen to beat the two card-run baselines (analysis, 2026-11-24)

The owner's words are at the top of `../IMPROVE-STATE.md` (r57-0076); they outrank this file.

Sources:
- The card run: `../runbig/d4-report.md`, `../runbig/d2-report.md`, `../refute/CARD-D4.md`, `../refute/CARD-D2.md`.
- The research: `../JUDGE-HANDBACK.md`, `../top9/out/R6-synthesis.md`, `../TRACK-PLAN.md` sections 3.6, 3.7 and 5.
- The research run's field reports, cited by claim id. RUN = `C:/research-runs/2026-11-harness-leads/fields/` (f3a, f3b, f3c, f3d).
- CR = `C:/Users/User/Documents/projects/card-run-2026-11/`.

Marks: [c] I computed it here; [j] my judgment. Every other figure is quoted as the record holds it. No held-out ranking file was opened for this analysis.

## 0. What the baselines leave open

**D2** (BM25 Acc@10 macro 0.653; the gate is +6 points):
- **F1, the swing.** Qwen3 scored +23.2 / -13.8 / -0.8 and SweRank +14.5 / -11.3 / +1.7 (FixFlow / clinic / zulip). Taking the reported better arm in each repository would give +8.3 macro [c].
- **F2, top-2 precision.** Every arm is under the 0.45 line.
- **F3, history.** History entered only through a fixed RRF, which scored -14.5 on FixFlow.
- **F4, shelf settings.** Line-window chunks, untuned embedders, BM25 at its defaults.
- **F5, no tuning split.** There are 132 / 189 / 59,876 pre-cutoff candidates to cut one from (`CR/d2/*/meta.json`).

**D4** (pooled best untrained P@10 0.120; the gate is +0.02):
- **G1, counts.** The learned arms saw binary facts. They lose on the order among known partners (CARD-D4, non-breaking item 1).
- **G2, surprise.** 30 / 66 / 21 % of truth files have no earlier co-change with the seed. Of all truth files, 8.5 / 45 / 11 points are within two hops of the typed graph (`CR/d4/out/pretest1.json`).
- **G3, fusion.** One fixed RRF weight, at the edge of its grid.
- **G4, zulip.** Zulip is 82 % of the pooled gate.

## 1. Ranked candidates

Card hours are worked out from the logged times:
- Qwen3-0.6B embedded 28,341 chunks in 446 s and SweRankEmbed-Small in 337 s (`CR/logs/d2-dense2.log`, `d2-swerank.log`).
- A zulip ComplEx block took 41-93 s; the whole D4 run used about 2 h of card.

"Coll." means the item is listed in `TO-COLLECT.md`. The chance is my judgment that the form, as one arm, clears its gate on held-out.

| # | task | family | form | attacks | published gain as recorded | sweep on tuning | 12 GB | card h | to install / download | licence | chance, why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | D2 | learned fusion, **primary** | Final stack: LambdaMART over A2's features plus the scores of A4, A5 and A6 | F1-F4 | its parts | feature groups, leaves 7/15/31, trees 100-1000, lr, pooled or per repository | CPU | 0.2 | LightGBM (coll.) | MIT, to confirm | **60 %**: keeps BM25 on the clinic and dense on FixFlow, then adds history and a reranker |
| A2 | D2 | learning to rank, text and history | LambdaMART over BM25 (file and best chunk), the Qwen3 and SweRank cosines, A8's vote, co-change from the top-3 text seeds (decay, 1/\|e\|), each file's edit count and last-edit age, path-token overlap, file kind | F1, F3 | NDCG@5 0.8399 vs 0.8023 for the count, NDCG@1 +10.2 % (f3c L7, C42; co-change, Java). Issue-to-file learning to rank (Ye, FSE 2014): named, not opened; not in the record | as A1 | CPU | 0 | LightGBM | as A1 | **55 %**: co-change gets a learned weight instead of the fixed RRF |
| A3 | D2 | hybrid text search | Convex fusion of normalised BM25, Qwen3 and SweRank scores; RRF k 10/30/60 as a variant | F1 | Convex 0.454 vs RRF 0.425 NDCG@1000, settles on under 5 % of the data (f3c L6, C38-C41). Hybrid beats the best single run on 3 of 4 tasks (f3a C30). Hybrid 92 vs dense 78 vs BM25 74 % (f3a C32) | simplex step 0.1; normalisation; per repository or pooled | as run | 1 | none | - | **50 %**: about 40 / 57 / 150 tuning queries may set the clinic's weight wrong |
| A4 | D2 | transformer reranker | SweRankLLM-Small (7B listwise, tuned on code localisation) at 4-bit, over the top 30 of U1's frozen arm | F2, F1 | Top-10 59.1 to 73.7 with a tuned reranker; 82.12 to 88.69 over the 7B retriever with a 32B reranker (f3a L2, C15-C17). Off-the-shelf rerankers are not reliably positive (C18, C20). The 4-bit loss is a measurement | depth 20/30; window 10/20; 256 or 512 tokens a file | 7-8 GB [c] | 2-4 [c, 5 s a window assumed] | weights, bitsandbytes, accelerate (coll.) | coll. (sibling cc-by-nc-4.0) | **45 %**: the strongest published lever on top-2; 4-bit and Python training are the risks |
| A5 | D2 | neural retriever tuned on our history | SweRankEmbed-Small in full and Qwen3-Embedding-0.6B with LoRA, train split only. Positives: the function chunks a commit edited, file text at its parent. Hard negatives from BM25. Consistency filter | F4, F1 | 74.45 vs its start 58.76 Function Acc@10 (f3a L1, C01-C07). Tuned rows +6.1 to +22.6 NDCG@10 over BM25 (C09). Unfiltered tuning falls below the start (C03, C04). Own-history tuning: not in the record | lr; epochs 1/2; negatives 3/7; filter; own or pooled data | about 5 / 7 GB [c] | 5-7 [c: about 80k chunk passes an epoch at a third of the inference rate; zulip capped at 20k commits] | peft, tree-sitter (coll.) | Apache-2.0; cc-by-nc-4.0 | **30 %**: zulip has about 60k pairs, the clinic 189 |
| A6 | D2 | large neural retriever | SweRankEmbed-Large (7B) at 4-bit, function chunks | F4 | Function Acc@10 82.12 (7B) vs 74.45 (137M) vs BM25 36.86 (f3a L1) | chunk form; aggregation | 6-8 GB [c] | 3-5 [c: 2 snapshots at about 1/13 of the 0.6B rate] | weights, bitsandbytes (coll.) | coll. | **25 %**: the same family lost 11.3 points on the clinic |
| A7 | D2 | text search, best form | BM25F with path weight, k1 and b, RM3 query expansion, a function-chunk index | F4 | not in the record | k1 0.9-2; b 0.4-1; path 1/2/5; RM3 | CPU | 0 | tree-sitter (approved r57-0065, not fetched) | MIT | **10 %**; it is a feature of A2 |
| A8 | D2 | history search | Past commits most like the query (BM25) vote for the files they edited; weight = similarity x 1/\|files\| x decay | F3 | Commit-text match Hit@10 0.322 to 0.403 (f3c L5, C32; co-change task). Issue-to-file form: not in the record | K 10/30/100; half-life | CPU | 0 | none | - | **10 %**; it is a feature of A2 |
| A9 | D2 | not chosen | Query rewriting by a local 7B (HyDE) | F4 | not in the record | - | 6-8 GB | 2-3 | a 7B | - | 5 %: A4 is a better use of the card |
| B1 | D4 | learned fusion, **primary** | Final stack: LambdaMART over B2's features plus the scores of B3, B4 and B5 | G1-G4 | its parts | as B2 | CPU | 0.2 | LightGBM | as A1 | **35 %**: +0.02 is about +17 % relative on zulip |
| B2 | D4 | learning to rank | LambdaMART over raw, 1/\|e\| and decayed counts (7-365 d); confidence both ways; age of the last co-change; the candidate's own change count and age; same stem, test-source name pair, folder distance; import edge; PPR; TEXT; seed-candidate content cosine (Qwen3 file embeddings at each split start). Trained on history blocks with their own cutoffs; scores every candidate | G1-G3 | NDCG@5 0.8399 vs 0.8023, NDCG@1 +10.2 %, count importance 0.38 (f3c L7, C42-C44) | features; leaves; trees; lr; span; pooled or per repository | CPU | 0.3 | LightGBM | as A1 | **30 %**: the source's +4.7 % is short of the need, but the name and content features reach the 21 % of zulip truth files with no earlier co-change |
| B3 | D4 | hypergraph, learned item model | EASE: a closed-form item-item ridge model on the commit x file incidence matrix; rows weighted by 1/\|e\| and decay | G1: learns which co-changes the others explain; discounts files that change with everything | not in the record (Steck, WWW 2019). The w/\|e\| walk (f3c L15, C76) | lambda over 6 values; row weights | CPU | 0 | none | - | **15 %**: strong at basket completion in its field, untested on co-change |
| B4 | D4 | graph neural network with text | An inductive GraphSAGE or GAT link predictor in plain torch. Edges: co-change weighted by decayed count, imports, folders. Nodes: frozen Qwen3 or SweRank file embeddings. A pair head with count features. Trained on history seed-to-truth pairs | G1, G2 (the clinic's 45-point two-hop room) | GREPO GAT Hit@5 31.51 vs 21.32; 19.13 without history, 30.16 without text (f3a L8, C34-C36). LM node features 78.51 vs 71.79 (f3a L10, C44) | layers; hidden; edge weights; features; negatives | under 2 GB [c] | 1-3 [j] | none | - | **15 %**: most likely to move the clinic; zulip has 11 points of room |
| B5 | D4 | temporal graph transformer | DyGFormer and TGN (DyGLib) on the co-change event stream; memory from history only | G1, G4 | Temporal GNNs Hit@5 21.65-25.39 on commit streams, no counting arm. EdgeBank (counting) beats them on some sets; learned models win at surprise 0.108 (f3c L14, C23, C71-C75) | model; neighbours 20/32; lr; epochs | under 6 GB [j; C72: three of seven out of memory on large streams] | 3-6 [j] | DyGLib (coll.) | coll. | **10 %**: zulip's surprise is 0.21 |
| B6 | D4 | not chosen | ULTRA zero-shot and fine-tuned, batch 8-16, count buckets as relations | G2 | 0.395 vs 0.344 MRR; transductive 0.312 vs 0.348; fine-tuned 0.422 (f3b L5, C50-C51) | - | 12.87 GB at batch 64 | 2-4 | code, checkpoints, PyG, a JIT kernel (coll.) | coll. | 7 %: ours is mostly the transductive case, where it trails |
| B7 | D4 | not chosen | ComplEx-N3 given counts | G1 | 24.7 to 34.8 % MRR by training form (f3d L1) | - | 0.3 GB | 1-2 | none | - | 5 %: fused ComplEx added 0.000; B2 and B4 carry the counts |
| B8 | D4 | not chosen | GraIL reranking the top 50 | G2 | +1.5 % and +0.62 %, none on FB15k-237 (f3c L12, C64) | - | fits (C64) | 2-4 | code (coll.) | **none declared** | 5 %: about 4 M subgraphs on zulip held-out [c], so it can only rerank |
| B9 | D4 | not chosen | Hypergraph network (HGNN, AllSet) | G1 | gains little where pairs say the same (f3c C77-C78) | - | - | - | - | - | 5 %: B3 covers it |
| B10 | D4 | not chosen | RotatE at its released settings | - | .297 to .338 MRR (f3d L3) vs ComplEx to 34.8 % | - | - | 1 | best_config.sh (coll.) | - | 2 %: ComplEx-N3 was 0.053 below |

## 2. The set for this round

**Primary arms, named now:** A1 and B1. Every other arm is reported, and the best of them is not picked after the fact (CARD-D4, item 6).

**What stays and what is new.** Held-out sets, scorers and gates are unchanged. The tuning splits are new:
- **D2:** the last min(30 %, 150) pre-cutoff candidates, scored against the snapshot just before them.
  - The ranker's training queries are up to 1,000 earlier candidates, against an earlier snapshot.
  - Fine-tuning uses only commits before the tuning split.
- **D4:** the existing tuning blocks. Training blocks are cut from history under the rule at `d4lib.py:70`.

Units write held-out ranking files; only U7 scores them, once.

**Wave 0.** A collect helper writes the sizes and licences into `TO-COLLECT.md`. Then one approve line goes to the owner (rule 3).

**Wave 1.** U1 (D2: split, A7, A8, A3, A2) and U4 (D4: training blocks, features, B3, B2) run side by side.
- Each stops at READY for one refuter (R-D2, R-D4). Only breaking findings go back to the builder.
- About 1.5 card hours.

**Wave 2.** Each unit adds its scores to the frozen harness:
- U5: B4. U2: A5. U6: B5. U3: A6, then A4.
- Card jobs run shortest first, under CR/GPU.lock.

**Wave 3.**
- R-train: one refuter checks the training cut-offs of wave 2.
- U7: fits A1 and B1 on tuning, freezes them, and scores every new arm on held-out once, per repository and pooled.
- The report.

**Card time.** About 16-27 hours, one job at a time [c]: U1 1, U4 0.3, U5 1-3, U2 5-7, U6 3-6, U3 5-9, U7 0.5.
- Watching the card costs about 0.65 M tokens an hour, measured on the D4 builder; that is inside the units' figures.

**Left out this round.** This sets priorities; it closes nothing.
- ULTRA: the transductive case, and a kernel build.
- GraIL: it has no licence (the owner is told, as the D4 README requires), and it can only rerank.
- ComplEx with counts and RotatE: the counts reach learned forms through B2 and B4.
- HGNN: covered by B3.
- HyDE: no figure in the record.

**If a primary arm misses its gate,** the next forms are SweRankLLM unquantised on 24 GB, then ULTRA.

## 3. Tokens

The figures were counted here from the big run's transcripts: once per message id, cached reads included (the basis of r57-0170). RUN-BIG-STATE.md holds only session totals and limits.

| unit | kind / model | expected M | limit M | basis |
|---|---|---|---|---|
| collect | collect / Sonnet | 1.0 | 2.6 | measured "collect: installs list" 1.0 M |
| U1, U4 harnesses | build-invariant / Opus | 18.5 each | 38.0 each | r57-0173 builder-unit quartiles. The measured card builders are below them (D2 7.4 M, D4 13.2 M), but these units are larger and leak-sensitive |
| R-D2, R-D4, R-train | refute / Opus | 5.8 each | 18.5 each | measured CARD-D4 refuter 5.8 M (1.7 + 4.1) and CARD-D2 3.4 M; limit as in RUN-BIG-STATE |
| U2, U3, U5, U6 | build / Sonnet | 13.2 each | 38.0 each | measured D4 card builder 13.2 M (10.7 + 2.5), card watch included; r57-0173 Q3 |
| U7 | build / Sonnet | 7.4 | 38.0 | measured D2 card builder 7.4 M (3.0 + 4.0 + 0.4) |
| report | analyse / Opus | 9.1 | 18.6 | r57-0173 analyser S0.3 |
| coordinator | orchestrate / Opus | 31.2 | 62.4 | measured: about 73 M of the big run's coordinators over 28 helpers (178 M less 104.8 M of helpers) is 2.6 M a helper; 12 helpers here; limit twice that [j] |
| **total** | | **155.9** | **405.1** | |

**Meter.** r57-0070 gives 418 M as 8.0-9.5 points, which is 44.0-52.3 M a point.
- Expected: 3.0-3.5 points, from 47 % to about 50 %.
- At every limit: 7.7-9.2 points, to 54.7-56.2 %, under the 57 % line.
- Not counted: this analysis. At the limits, the pilot would not fit in the same week.
