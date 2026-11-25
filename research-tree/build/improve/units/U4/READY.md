# U4 READY: D4 training blocks, features, B3 (EASE) and B2 (LambdaMART)

**Status: READY for the refuter.** Everything in the brief's steps 1 to 5 is built and has run. The tests pass. Held-out has not been scored or opened: its tables carry no label, and no held-out ranking file has been written yet.

**Best tuning arm: B2 (LambdaMART).** Pooled tuning P@10 is **0.138** against **0.124** for the best untrained arm on the same 260 commits: +0.013, interval [+0.010, +0.017]. These are tuning numbers, and B2 was chosen and early-stopped on them, so they are optimistic.

Paths:
- Code: `research-tree/build/improve/code/U4/`.
- Outputs: `CR/improve/U4/`, where CR = `C:/Users/User/Documents/projects/card-run-2026-11`.
- Card log: `CR/logs/improve-U4.log`.

## What was built

### 1. Training blocks (`extract_train.mjs`, node and git in `graphtest-kge-gpu:1`, network off)

How the blocks are cut:
- The history is replayed from the pinned refs and must equal the card's `commits.jsonl` byte for byte. The refs are FixFlow 903787e, the clinic f4276ed and zulip a7af439.
- Every card block (tuning and held-out) is recomputed with the same code path and must equal the card's `blocks/<k>.json` byte for byte. All 10 + 10 + 35 do. This proves the training blocks are cut by the card's own rule.
- Eligible commits are those strictly before the tuning split's start (ct < the first tuning cutoff). They are cut into blocks of 10 (zulip 20) consecutive commits, backwards from that start.
- Each block gets its own `hend` and cutoff exactly as at `extract.mjs:129`. History is `commits[:hend]`, all strictly before the block's first task, as at `d4lib.py:70`.
- Alive files and imports are taken at that point. The import snapshot `commits[hend-1]` has no ancestor at or after the cutoff (the refuter's anc.mjs check, run per block).
- Block ids are 1000+ with split `train`. Card blocks keep their ids and their data unchanged. Output: `CR/improve/U4/data/<repo>/`.

| repository | eligible before tuning | blocks possible | blocks kept | task commits | tasks (seeds) | cutoffs |
|---|---|---|---|---|---|---|
| FixFlow | 62 | 6 | 6 (all) | 50 | 303 | 2026-06-02 to 06-10 (tuning starts 06-15) |
| clinic | 60 | 6 | 6 (all) | 41 | 214 | 2026-11-03 to 11-04 (tuning starts 11-04) |
| zulip | 20,890 | 1,044 | 100 (the latest) | 1,972 | 7,989 | 2025-05-18 to 2026-05-18 (tuning starts 05-27) |

Why zulip has 100 blocks:
- Each zulip training segment of 25 blocks needs its own content snapshot on the card. 25 is the number of held-out blocks under one snapshot, so training sees the same staleness.
- Four segments brought the unit's card use to 0.33 h, which is the card estimate.
- More blocks would need more snapshots.

### 2. Features (`u4lib.py`, `features.py`)

Every feature of a block comes from `commits[:hend]` and that block's alive set and imports. The columns:
- **Co-change counts:** PC; DEC7/30/90/180/365; INV; INV7/30/90/180/365. These are the card's own functions.
- **Confidence both ways:** CONF_SC and CONF_CS (pair count over each file's count of 2..50-file transactions).
- **Ages and counts:** LAST_CO_DAYS (age of the last co-change; empty when there is none); CAND_NCHG, CAND_AGE_DAYS and CAND_LAST_DAYS for the candidate; SEED_NCHG for the seed.
- **Names and structure:** SAME_STEM; TEST_PAIR (test and source share a name core); FOLDER_DIST (tree distance); IMP_SC and IMP_CS (import edges).
- **Card scores:** PPR, TEXT and RRF, the card's own functions.
- **CONTENT_COS:** the cosine of Qwen3-Embedding-0.6B file vectors (details below).
- **EASE:** B3's chosen score.

How CONTENT_COS is computed:
- File vectors use the card's d2 chunker unchanged (`dense.chunks`), fp16 and max length 512. A file's vector is the normalised mean of its chunk vectors.
- The vectors are taken at each split start: one snapshot per zulip training segment, one for FixFlow's and the clinic's training, one for tuning and one for held-out. Each snapshot is the tree of `commits[hend-1]` of the split's first block.
- The cosine is left empty (NaN) when either file is not in that snapshot.

The untrained arms come out unchanged:
- All 14 untrained arms of the card run, scored from the CSV tuning tables with the card's tie keys, give per-commit values equal to the card's `d4lib.per_commit`.
- Their means equal `CR/d4/out/choices.json` with a difference of 0.0, on all three repositories.

### 3. B3, EASE (`ease.py`)

The model:
- Steck's closed form on the commit x file incidence matrix of the block's history. Rows are the card's 2..50-file transactions, weighted by decay x (1/|e| or 1).
- The score is B[seed, candidate], with lambda = lambda_rel x mean(diag G).

The sweep, on tuning only:
- 6 lambdas: 0.2, 1, 5, 25, 125, 625.
- 8 row weights: half-life none/30/90/365, each with or without 1/|e|.
- The best setting per repository, frozen in `CR/improve/U4/ease/choice.json`: FixFlow 30 d / no 1/|e| / 625; the clinic the same; zulip 365 d / 1/|e| / 625.
- It is then used as a B2 feature, scored on every block (`cache/<repo>/<k>.ease.npy`).

### 4. B2, LambdaMART (`rank.py`, LightGBM 4.7.0 in `d2-embed-gpu:3`, CPU)

Training and stopping:
- Trained on the training tables only; one query per (block, seed).
- Early-stopped on tuning P@10: checked every 10 trees, patience 300, at most 1,000 trees.

The sweep has two stages; selection is per repository on its own tuning P@10, 40 models each:
- **Stage 1** (leaves 15, lr 0.05, all blocks): training source (pooled or own repository) x feature group (all / no content / no EASE / neither) x per-query normalisation (value / query max for PC, INV365, DEC90, TEXT, PPR and EASE; gap to the query max for CONTENT_COS).
- **Stage 2:** the best stage-1 setting x leaves 7/15/31 x lr 0.03/0.1 x span (all blocks / latest half).

### 5. Tables (`features.py tables`, `CR/improve/U4/tables/<repo>/<split>/<k>.csv.gz`)

Layout:
- One row per (task, candidate); the seed is excluded.
- Columns: `k, commit, task, seed, cand, tie, label`, then the features, then the empty columns `B4_GNN, B5_DYGFORMER, B5_TGN`.
- Tuning and held-out tables hold every candidate. Held-out `label` is empty.
- Parquet was not possible: no image has pyarrow.

Training lists:
- FixFlow and the clinic: complete lists.
- Zulip: a pool per task. It holds every truth file, the top 100 of PC, INV365, DEC90, TEXT, PPR, CONTENT_COS and EASE (scored only), and 100 random others; about 347 rows per task.

Rows per split:

| repository | train | tune | test |
|---|---|---|---|
| FixFlow | 59,086 | 52,090 | 179,418 |
| clinic | 53,903 | 89,427 | 157,572 |
| zulip | 2,770,924 | 1,634,921 | 5,280,856 |

One check of the zulip pool (`diag_pool.py`, `rank/diag-pool.json`):
- The same model was trained on the last 15 zulip blocks, once on the pooled rows and once on complete lists.
- Tuning P@10 was 0.1128 on the pool and 0.1138 on complete lists. The sample does not cap zulip.

### 6. Refit script for U7 (`rank.py refit` / `rank.py sweep --cols ... --tag B1`)

- It refits a LambdaMART on any column set, for example `--cols PC,...,B4_GNN`.
- Other units' score matrices (`DIR/<repo>/<k>.npy`, `[tasks, files]`, as the card's .npy) are merged with `--extra B4_GNN=/improve/U5/...`. CR/improve is mounted read-only at /improve.

### 7. Tests (`test_u4.py`, "all U4 tests passed", 9 of 9)

pytest is in no image and installing is not allowed. The functions are pytest-style, with a plain runner. The nine tests:
- Card data copied unchanged.
- The training-block rule:
  - The tasks are exactly the last eligible commits before tuning.
  - hend and cutoff are recomputed for each block.
  - All facts come before the cutoff.
  - All training labels come before the tuning start.
  - No tuning or held-out commit is in training, and Block() passes `d4lib.py:70`.
- **No fact at or after a cutoff:** every commit at or after `hend` is replaced with other files and messages, on 5 blocks per repository. Every base feature and EASE comes out bit-identical.
- Content snapshots are before every cutoff of their split, and training snapshots come before the tuning split.
- Tables and labels match the blocks, and held-out has no labels.
- The untrained arms match the card run, from the tables.
- The scorer gives an oracle its known value.
- EASE's eigen form equals the direct inverse.
- Ranker input is training blocks only, with contiguous queries and no shared queries with tuning.

## How to run

`code/U4/run_all.sh` lists the steps in order; each step skips finished outputs:
1. `run_cpu.sh extract <repo>`
2. `run_cpu.sh py features.py base`
3. `run_gpu.sh fixflow clinic zulip` (card, CR/GPU.lock)
4. `features.py content`
5. `ease.py sweep`, then `ease.py apply`
6. `features.py tables`
7. `rank.py sweep --tag B2`
8. `tune_report.py --tag B2`
9. `test_u4.py`

After the refuter only: `rank.py heldout --tag B2` and `ease.py heldout`.

## Tuning results

Each cell: P@10 / recall@10, then the difference to the best untrained arm on the same commits, with its 95 % interval (paired bootstrap over commits, 10,000 resamples, as the card).

The best untrained arm is the card's tuning pick: PC on FixFlow, RRF on the clinic, INV365 on zulip. Tuning commits: FixFlow 34, clinic 34, zulip 192, pooled 260. Full table: `CR/improve/U4/tune-report.json`.

| arm | FixFlow | clinic | zulip | pooled |
|---|---|---|---|---|
| best untrained | 0.212 / 0.538 | 0.117 / 0.316 | 0.110 / 0.680 | 0.124 / 0.614 |
| PC | 0.212 / 0.538 (+0.000) | 0.113 / 0.304 (-0.004 [-0.016, +0.009]) | 0.098 / 0.604 (-0.012) | 0.115 / 0.556 (-0.009) |
| INV365 | 0.205 / 0.524 (-0.007) | 0.116 / 0.323 (-0.001) | 0.110 / 0.680 (+0.000) | 0.123 / 0.613 (-0.001) |
| DEC90 | 0.207 / 0.526 (-0.005) | 0.115 / 0.311 (-0.002) | 0.098 / 0.598 (-0.012) | 0.114 / 0.551 (-0.010) |
| TEXT | 0.192 / 0.497 (-0.020) | 0.100 / 0.297 (-0.016) | 0.095 / 0.589 (-0.015) | 0.108 / 0.538 (-0.016) |
| RRF | 0.207 / 0.540 (-0.004) | 0.117 / 0.316 (+0.000) | 0.064 / 0.381 (-0.046) | 0.089 / 0.393 (-0.035) |
| PPR (feature) | 0.192 / 0.488 (-0.019) | 0.067 / 0.174 (-0.050) | 0.029 / 0.161 (-0.081) | 0.055 / 0.206 (-0.069) |
| content cosine (feature) | 0.196 / 0.476 (-0.016) | 0.072 / 0.149 (-0.044) | 0.092 / 0.579 (-0.018) | 0.103 / 0.509 (-0.021) |
| **B3 EASE** | 0.204 / 0.510 (-0.008 [-0.018, +0.001]) | 0.116 / 0.324 (-0.000 [-0.012, +0.012]) | 0.110 / 0.681 (+0.000 [-0.000, +0.001]) | 0.123 / 0.612 (-0.001 [-0.003, +0.001]) |
| **B2 LambdaMART** | **0.244 / 0.613 (+0.032 [+0.019, +0.047])** | **0.152 / 0.432 (+0.035 [+0.023, +0.049])** | **0.116 / 0.715 (+0.006 [+0.004, +0.009])** | **0.138 / 0.665 (+0.013 [+0.010, +0.017])** |

What the table shows:
- B3 matches the best untrained arm on tuning but does not beat it.
- B2 clears +0.02 on FixFlow and the clinic. On zulip it gains only +0.006, so the pooled gain is +0.013, under the +0.02 gate, on tuning.
- Zulip is 192 of the 260 pooled commits.

## Frozen choices

**B3:** see `ease/choice.json`.
- FixFlow and the clinic: half-life 30 d, no 1/|e|, lambda 625 x mean diag.
- Zulip: 365 d, 1/|e|, 625.
- Lambda is at the grid's top in every repository. That end is the weighted-count limit: as lambda grows, B[s,c] tends to G[s,c] times a small popularity factor, so a wider grid only converges to an untrained arm. The curve is flat from 125 to 625: 0.2024 to 0.2037, 0.1143 to 0.1161, 0.1103 to 0.1104.

**B2:** see `rank/B2/choice.json`. Every repository chose the **pooled** model with **all features** and **per-query normalisation**:

| repository | leaves | learning rate | span | trees | tuning P@10 |
|---|---|---|---|---|---|
| FixFlow | 15 | 0.03 | latest half | 750 | 0.2439 |
| clinic | 15 | 0.1 | all | 620 | 0.1520 |
| zulip | 15 | 0.1 | all | 50 | 0.1163 |

- Learning rate 0.1 is the top of its grid for the clinic and zulip. The other zulip rates are close: 0.1150 to 0.1156.
- Leaves are interior.
- The held-out writer refits the frozen setting (deterministic) and asserts the same tuning P@10 and tree count before it writes.

## Card and time

- **Card:** one job, 1,204 s = 0.33 h (estimate 0.3 h; the stop line is 0.6 h). It embedded 475 + 576 + 5,830 texts (1,732 + 3,730 + 68,102 chunks).
- **Peak card memory:** 1.57 GB allocated by torch; 5.6 GB used on the whole card (nvidia-smi, other use included). Logged in `CR/logs/improve-U4.log`.
- Everything else ran on the CPU. The B2 sweep took about 0.9 h of wall time for 56 fits.
- The machine went down at about 11:22 UTC, before the card job. Every output was checked on restart (all parsed, none truncated), and the card job ran from the start.

## For the refuter: places worth a blind look

1. **Training-block rule.** `extract_train.mjs`: the training tasks are the last eligible commits with ct < the tuning start, cut backwards. Training labels lie entirely before the tuning split. The test is `test_training_blocks_rule`.
2. **Content snapshots.** There is one per split start; zulip training has one per 25 blocks. The rule is the tree of `commits[hend-1]` of the segment's first block, and `content_cos` asserts that the segment's hend is at most the block's.
3. **Zulip training pool.** It includes every truth file, which is a training-only choice. Tuning and held-out are scored on complete lists. Query normalisation uses the pool's query maximum; the pool holds the top 100 of each normalised signal, so that maximum equals the complete list's.
4. **The tuning numbers of B2 and B3 are selected on tuning.** B2 has 40 models per repository and early stopping on the same tuning commits, so its tuning gain is optimistic. Only U7's held-out run can judge the gate.
5. **Per-repository selection of B2,** like the card's best untrained arm. All three chose the pooled model, at different leaves, learning rates, spans and tree counts.
6. **The tie key** is the card's (`b.rnd`), carried in each table's `tie` column. Held-out ranking files will be [tasks, files] score matrices like the card's .npy files, with the seed cell set to -inf.

## Not done, or limits

- Held-out ranking files of B2 and B3 are not written. That happens after the refuter's findings, as the brief says.
- pytest is not available in any image, so the tests use a plain runner.
- Parquet is not available, so the tables are CSV.gz.
- Zulip training uses 100 of the 1,044 possible blocks, as the card estimate allowed. FixFlow and the clinic have very short training histories: their first training block has 2 and 17 history commits.
- Not tested: query weights matched to the per-commit metric; a candidate's decayed change count; and B4 and B5, which come in later units through the empty columns.
