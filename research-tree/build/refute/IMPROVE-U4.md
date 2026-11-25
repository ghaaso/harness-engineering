# Refuter verdict on unit U4 (D4: training blocks, features, B3 EASE, B2 LambdaMART), before its held-out ranking files, 2026-11-24

Kind refute, Opus, one blind pass (`improve/units/REFUTE-BRIEF.md`), started over after the first check died in the 13:22 UTC shutdown.
- **What I read:** the code under `improve/code/U4/` and the outputs under `CR/improve/U4/` (CR = `C:/Users/User/Documents/projects/card-run-2026-11/`). I opened `units/U4/READY.md` only after my own checks were done.
- **How it ran:** every check ran in Docker (`d2-embed-gpu:3`, `--network none`, CPU only, no `--gpus`). U4's code, U4's outputs and the card run's data were mounted read-only.
- **What I did not touch:** the card, held-out truth, held-out scoring and U4's code.
- **My tests:** in `improve/code/R-U4/`. Run them with `run.sh <script.py> [args]`; logs and JSON go to `R-U4/out/`.

**Answer first: there are no breaking findings.** U4 can write its held-out ranking files of B2 and B3 as built.
- Re-running U4's code reproduces every tuning number in READY.md exactly.
- B2 LambdaMART: FixFlow 0.2439 at 750 trees, the clinic 0.1520 at 620, zulip 0.1163 at 50.
- Pooled, on tuning: 0.138 against 0.124 for the best untrained arm, +0.013 [+0.010, +0.017].
- No fact from at or after a block's cutoff reaches a feature or a label, and no tuning block is in training.
- No file under `CR/improve/U4/` is cut short.

## Breaking findings

None.

## What was checked, in the brief's order, with the result

1. **Leakage in time: none found.**
   - **Future removed, not altered** (`leak.py`, my own variant beside U4's `poisoned()` test). For each block I made a copy of the repository in which every commit at or after the block's `hend` is emptied: no events and no message. The block's own task commits are the exception: they keep only their M events of files alive at the cutoff.
     - The base features of that copy equal the cached `cache/<repo>/<k>.npz` bit for bit: all 30 columns.
     - EASE at the frozen setting equals `<k>.ease.npy` to 7e-12 or less.
     - The tasks come out the same.
     - Blocks covered: FixFlow all 16, the clinic all 16, zulip 8 (training 1000, 1033, 1066, 1099; tuning 0 and 9; held-out 10 and 34).
   - **Training blocks before tuning** (same script):
     - Training task commits at or after the tuning start: 0 of 60, 0 of 60 and 0 of 2,000.
     - Training blocks with a history fact at or after their cutoff: 0.
     - The training tables hold only training blocks, and none of their commits is a tuning or held-out task. The largest training commit is below the smallest tuning commit: 92 < 95, 152 < 157, 70,820 < 70,823.
   - **Content snapshots.** Every block's snapshot `hend` is at or before its own `hend`, and training snapshots come before the tuning start (U4's test, re-run). `extract_train.mjs` refuses a snapshot whose commit has an ancestor at or after the cutoff; the zulip log shows 0 late ancestors.
   - **No in-sample scores in the ranker's inputs.**
     - EASE is fitted per block on that block's history only.
     - The content vectors come from a frozen, pretrained model.
     - LambdaMART is fitted on the training blocks only.
2. **Held-out untouched: yes.**
   - **No labels in held-out outputs.** Held-out caches carry no `label` array, and every row of the held-out tables has an empty `label`. Checked on all 12 FixFlow and clinic held-out blocks and 3 zulip ones (`recompute.py`).
   - **No choice made on held-out.** Every choice reads tuning tables only: the EASE sweep, the rank sweep, early stopping, the pool check and the tuning report.
   - **No held-out ranking file exists yet** (`CR/improve/U4/heldout/` is absent).
   - See non-breaking item 6 for held-out truth held in memory.
3. **Scorer and query sets equal the card run's; the untrained arms reproduce.**
   - U4's own `test_u4.py`, re-run read-only through my runner, passes 9 of 9 (`out/test_u4-rerun.log`). That includes the card data being byte-identical and all 14 untrained arms from the tables equalling `CR/d4/out/choices.json` to 1e-12.
   - The tuning report's best untrained arms match the card: PC 0.2117, RRF 0.1166, INV365 0.1101.
   - The tuning and held-out tables hold every candidate: rows = tasks x (N - 1) in every checked block. FixFlow has 52,090 tuning and 179,418 held-out rows; the clinic 89,427 and 157,572.
4. **The ranker is fitted and early-stopped as the brief says** (`refit.py`, which uses U4's own `rank.fit`).
   - It is trained on the training tables only and stopped on tuning P@10 every 10 trees.
   - The frozen choice of each repository refits deterministically to the same tuning P@10 and tree count as `rank/B2/choice.json`: 0.24392731 / 750, 0.15201202 / 620, 0.11628478 / 50.
5. **Held-out rows built by the same code path as tuning.**
   - **Recomputed from today's code** (`recompute.py`). I recomputed with the code as it is now, after its edits at 16:14 to 16:42 local. The base features, content cosine and EASE equal the caches on all FixFlow and clinic blocks and 9 zulip blocks (3 training, 3 tuning, 3 held-out): base and content bit for bit, EASE to 7.3e-12.
   - **Tables match the caches.** Every feature column of every checked table equals its cache cell, and the zulip training rows are exactly `pool_mask`.
   - **The pool keeps each query's maximum.** It keeps every query's maximum of the query-normalised columns: 0 queries lost, in the 10 sampled training blocks of each repository.
   - **The held-out scoring path gives the same tuning numbers** (`refit.py`). Scores were stored as `rank.heldout` stores them (float32, -inf off the table) and scored by the card's `d4lib.per_commit`, which is how U7 will score held-out. P@10 equals U4's tuning scorer in all three repositories, and 0 of 260 commits change.
   - **Truncation: none** (`integrity.py`, `npycheck.py`, 866 files).
     - Every `.npz` passes its CRC.
     - Every `.npy` has the byte size its header states.
     - Every `csv.gz` decompresses whole, with the right header and field count on every row.
     - Every JSON and JSONL file parses, and no `.tmp` file is left.
     - The files written before the 11:22 UTC shutdown (`data/`, `snap/`, the cache `.npz` and `.ease.npy`, `ease/choice.json`) reproduce from the code, as above.

## Non-breaking

1. **Held-out scores are stored as float32.** `rank.py heldout` casts LightGBM's float64 scores to float32. On tuning this adds a few ties: zulip 482,535 to 482,629 tied cells, FixFlow 3,009 to 3,010, the clinic unchanged. It changes no commit's P@10 (`out/refit.json`). On held-out a near-tie could move one commit; the expected effect is nil. Storing float64 would remove the question.
2. **The content cosine is mostly missing in FixFlow's and the clinic's training rows.** One snapshot serves all six training blocks, taken at `hend` 2 (FixFlow) and 17 (the clinic), with 60 and 92 files. So CONTENT_COS is empty for 88 to 99 % of their training cells (blocks 1001 to 1005). It is empty for 1 to 71 % of tuning cells and 0 to 66 % of held-out cells; zulip is at 0 to 4 % everywhere (`out/recompute-*.json`). The feature's training distribution therefore differs from tuning and held-out in those two repositories, and the pooled model learns it mostly from zulip. Not a leak.
3. **EASE sits at the top of its lambda grid in every repository** (625 x mean diag G), so B3 is close to a weighted co-change count. On zulip it scores 0.1104 against 0.1101 for INV365. READY.md states this.
   - `logs/ease-sweep.log` is stale. It comes from an earlier grid: it shows lambdas 100 and 6.3, with 100 at that grid's edge. It is not the run that wrote `ease/choice.json` (16:11 local, grid 0.2 to 625). The choice file and the caches agree with today's code.
4. **EASE re-runs agree to about 7e-12, not bit for bit,** when the thread count differs: the float32 last bit. The B3 held-out files are copies of the cache, so they are unaffected. A re-run of `ease.py apply` under other threads could reorder near-ties.
5. **Selection optimism.** Each repository's B2 is the best of 40 models x up to 100 tree checkpoints, on 34, 34 and 192 tuning commits. The same pooled model is cut at 50 trees for zulip and 620 for the clinic. The +0.013 pooled gain is in-sample, as READY.md says. Only held-out can judge the +0.02 gate.
6. **Held-out truth is held in memory.** `d4lib.Block` computes held-out truth whenever a held-out block's features are built, as in the card run. U4's `test_features_ignore_the_future` also compares that truth between two copies of the repository. No choice uses it and no output carries it.
7. **The tests use a plain runner, not `python -m pytest`** (BRIEF-COMMON rule 5). No image has pytest. The functions are pytest-style.
8. **For U7.** `rank.py refit` trains on the training blocks only. Every `--extra` score directory must also hold a file for each training block, or `np.load` raises. A B1 "fitted on tuning" (CANDIDATES section 2) needs a fit path of its own, as R-D2 noted for U1.

## READY.md's numbers against what the code produces

Every number I could re-derive matches READY.md:
- **B2:** tuning P@10 and trees per repository.
- **Pooled:** 0.1376 against 0.1242, +0.0134 [+0.0100, +0.0171], from `tune-report.json`.
- **Untrained arms:** equal to the card's `choices.json`.
- **B3:** its frozen settings.
- **Rows:** per split, for all three repositories.
- **Models:** 40 per repository.
- **Pool check:** 0.1128 against 0.1138.
