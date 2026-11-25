# U1 READY (D2: tuning split, A7, A8, A3, A2), 2026-11-24

Answer first: on the tuning split, A2 (LambdaMART over every signal) has macro Acc@10 **0.919** and A3 (convex fusion) **0.909**. The card's BM25 has **0.713** on the same 217 queries, so A2 is +20.6 points (interval +14.0 to +27.8, from the card's score.py). Both numbers are in-sample because their settings were chosen on these queries. A3's five-fold estimate inside tuning is 0.886. Held-out data has not been opened or scored.

Code: `research-tree/build/improve/code/U1/`. Outputs: `CR/improve/U1/` (CR = `C:/Users/User/Documents/projects/card-run-2026-11`).

## 1. The split (section 2 of CANDIDATES.md), `split.py`

- History: `main`, non-merge commits. Candidates come from the card's `prep.candidates`: the same filters, extension-less names (B2), and docs handling. The card's `prep.py` is imported read-only, and the held-out t0 and cutoff are re-derived and asserted equal to the card's meta.
- **Tuning**: the last min(int(30 %), 150) pre-cutoff candidates. All of them are scored against one snapshot (the last commit with ct < t_tune), the same rule held-out uses. Truth is the edited files that exist in that snapshot. A commit with no such file is dropped.
- **Training**: up to 1,000 candidates with ct < t_tune, cut from the end into blocks the size of the tuning split. Each block is scored against the snapshot just before its first candidate. Votes, co-change, edit counts and age for a block read only commits with ct < the block's start.

| repo | pre-cutoff | tuning: candidates / queries (dropped) | tuning snapshot, span | training blocks: queries | training queries | held-out queries |
|---|---|---|---|---|---|---|
| FixFlow | 132 | 39 / 34 (5) | 2026-06-26; 06-29 .. 07-08 | train0 9, train1 28, train2 35 | 72 (of 93 candidates) | 69 |
| clinic | 189 | 56 / 37 (19) | 2026-11-04; 11-04 .. 11-06 | train0 12, train1 40, train2 35 | 87 (of 133) | 80 |
| zulip | 59,875 | 151 / 146 (5) | 2026-10-02; 10-03 .. 10-16 | train0..6: 94, 129, 138, 144, 143, 121, 139 | 908 (of 1,000) | 242 |

Per block (snapshot, span, files, docs-only counts): `CR/improve/U1/<repo>/split.json`. Clinic's tuning split covers only 2 days (11-04 to 11-06) and 10 of its 37 queries are docs-only. FixFlow's training covers 06-02 to 06-26.

## 2. Arms on tuning (card scorer `d2/score.py` on the card's format; `bm25` is the card's own `bm25.mjs`)

Acc@10 / P@2 per repository; the macro Acc@10 has its bootstrap interval in brackets.

| arm | macro Acc@10 | macro P@2 | FixFlow (34) | clinic (37) | zulip (146) |
|---|---|---|---|---|---|
| BM25 (card) | 0.713 [0.635, 0.787] | 0.256 | 0.647 / 0.206 | 0.649 / 0.203 | 0.842 / 0.360 |
| A7 BM25F + path | 0.833 [0.766, 0.893] | 0.342 | 0.824 / 0.324 | 0.784 / 0.297 | 0.890 / 0.404 |
| A7 chunk (frozen A7) | 0.833 [0.766, 0.894] | 0.318 | 0.765 / 0.294 | 0.838 / 0.243 | 0.897 / 0.418 |
| A7 RM3 (variant) | 0.795 | 0.339 | 0.794 / 0.382 | 0.784 / 0.324 | 0.808 / 0.312 |
| A8 commit vote | 0.706 [0.633, 0.775] | 0.210 | 0.853 / 0.162 | 0.595 / 0.216 | 0.671 / 0.253 |
| Qwen3-Emb-0.6B | 0.777 [0.706, 0.843] | 0.341 | 0.853 / 0.368 | 0.568 / 0.176 | 0.911 / 0.479 |
| SweRankEmbed-Small | 0.749 [0.682, 0.814] | 0.316 | 0.882 / 0.353 | 0.459 / 0.122 | 0.904 / 0.473 |
| **A3 fusion** (in-sample) | 0.909 [0.853, 0.958] | 0.429 | 0.882 / 0.441 | 0.865 / 0.311 | 0.979 / 0.534 |
| A3, five-fold inside tuning | 0.886 | 0.405 | 0.853 / 0.412 | 0.838 / 0.270 | 0.966 / 0.534 |
| A3 RRF variant (k 30, pooled) | 0.838 | 0.378 | 0.853 / 0.412 | 0.703 / 0.203 | 0.959 / 0.521 |
| **A2 LambdaMART** (in-sample) | **0.919 [0.867, 0.964]** | **0.497** | 0.912 / 0.500 | 0.865 / 0.446 | 0.979 / 0.545 |

- The gain over BM25 in macro Acc@10, with its interval: A2 +0.206 [0.140, 0.278]; A3 +0.196 [0.131, 0.268]; BM25F +0.120 [0.066, 0.183]. Every one of these passes the +0.06 line on tuning.
- The RM3 row comes from `tune_text.log`. The scorer did not score RM3 as its own file because it lost to chunk.
- A Python copy of the card's BM25 (`bm25py`) gives the same numbers as `bm25.mjs` to three decimals, which checks the text index.
- Dense is weak on clinic (0.568 and 0.459), and fusion weights it low there.
- Scores file: `CR/improve/U1/tune/score-tuning.json`. Rankings: `CR/improve/U1/cardfmt/<repo>/rank_<arm>.jsonl`.

## 3. Frozen choices (all on tuning only)

- **A7** (pooled; 350 BM25F, 70 chunk and 8 RM3 settings swept): the form is the function chunk index (tree-sitter; file score = best chunk), k1 3.0, b 0.6, Lucene idf. BM25F (the file form, used as a feature): k1 6.0, b 0.6, path weight 2.0, Lucene idf; k1 6.0 is the top of the grid. RM3 lost (best: 10 documents, 20 terms, lambda 0.7). `tune/frozen_text.json`, `tune/a7_sweep.json`.
- **A8**: K 10, half-life 365 days (30 settings: K 3 to 100, half-life 30 days to none). `tune/a8_sweep.json`.
- **Dense**: the card's `dense.py`, read-only (chunks of about 1,500 characters with the path, best-chunk cosine, fp16), run on every block.
- **A3**: convex, per repository (chosen by five-fold contiguous cross-validation: convex per-repo 0.886 > convex pooled 0.874 > RRF per-repo 0.840 > RRF pooled 0.829). Arms are the frozen A7, Qwen3 and SweRank. FixFlow: min-max, weights 0.2 / 0.8 / 0.0. Clinic: z-score, 0.7 / 0.3 / 0.0. Zulip: theoretical min-max, 0.1 / 0.4 / 0.5. `tune/a3.json`.
- **A2**: pooled, 15 leaves, learning rate 0.05, 184 trees (early-stopped on tuning NDCG@10, between 100 and 1,000 trees). Grid: leaves 7/15/31, learning rate 0.02/0.05/0.1, pooled vs per repository. Per repository was worse every time (best 0.880). Columns: s_bm25, s_bm25f, s_chunk, s_qwen3, s_swerank, s_a8, co_inv, co_d90, co_d365, n_edits, age_days, kind, po_count, po_frac, name_count. Each score column also gets a per-query rank and a share of the maximum. s_a7 is left out because it is a copy of s_chunk. Models: `CR/improve/U1/models/a2/pooled.txt`; record `tune/a2.json`.

## 4. Feature table and refit (`features.py`, `ltr.py`)

- `CR/improve/U1/table/{train,tune,heldout}.csv.gz`, one row per query and candidate:

  | split | rows | queries |
  |---|---|---|
  | train | 281,529 | 1,067 |
  | tune | 54,499 | 217 |
  | heldout | 101,969 | 391 |

- Candidates are the union of the top 100 of each signal. An edited file is among the candidates for 97 to 100 % of queries (`table/recall.json`).
- The held-out label column is empty.
- Empty columns for later units: `s_a4_rerank`, `s_a5_qwen3ft`, `s_a5_swerankft`, `s_a6_swerank_large`.
- Refit with any set of columns (U7 for A1): `python ltr.py --name a1 --columns c1,c2,... [--scopes pooled,per_repo]`. It refuses a column that is empty on the training or tuning rows. `ltr.predict(name, split)` applies the frozen models.

## 5. Tests (`test_u1.py`, 18, all pass)

Run with `run.sh cpu python -B -m unittest -v test_u1`. pytest is not in `d2-embed-gpu:3`, so the tests use unittest, which pytest would also collect.

| group | what it checks |
|---|---|
| Split, synthetic | sizes; tuning and training before held-out and disjoint (no tuning commit in training); a snapshot holds nothing from its block or later; truth is in the snapshot and not in the query; votes, co-change and edits read only earlier commits; history stops before held-out |
| Split, real outputs | the same rules on the three repositories' split.json and sig files; table labels by split |
| Scorer | the fast order equals the card's rank_files and metrics; the card's BM25 formula; function chunks |
| Fusion | simplex; normalisations; a corner weight equals the single arm; RRF rewards agreement; pooled vs per repository fit; folds |
| Ranker | derived columns and query groups; train and predict shapes |

## 6. How to run

`code/U1/run_all.sh [split|dense|text|signals|table|fusion|ltr|score|tests|heldout]`. Every step runs in Docker with `--network none` on image `d2-embed-gpu:3`. `run.sh gpu` takes and releases `CR/GPU.lock` and logs to `CR/logs/improve-U1.log`. `heldout` (the A7, A8, A3 and A2 ranking files, not scored) runs only after the refuter.

## 7. Card time, and what the shutdown changed

- **Card time**: 94 s (FixFlow) + about 17 min lost to the PC shutdown at 11:22 UTC + 1,290 s (resume). That is about 0.66 card hours, against an estimate of 1.
- **Shutdown damage**: files written in the minutes before it were truncated: `tune/frozen_text.json` and FixFlow's five `sig_*.npz`. Every output was checked by parsing it.
  - `frozen_text.json` was rebuilt from the intact sweep files (same values as `tune_text.log`).
  - The sig files were recomputed.
  - `u1lib.wrjson`/`wrjsonl` now fsync.
- **Two fixes made after first runs**:
  - A2 dropped the duplicate s_a7 column.
  - The 100-tree minimum was not applied, because LightGBM drops the trees after the best one. Fixed with `keep_training_booster=True`. The chosen model did not change.
- **Not done yet**: the held-out ranking files and `report.md` (after the refuter's findings). A2's tuning score has no fold estimate, only the in-sample one.
