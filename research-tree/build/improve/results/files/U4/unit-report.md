<!-- Saved unchanged by the coordinator (session 807f5dc3) from the final reply of helper U4-HO (run/Sonnet), 2026-11-24 about 14:00 UTC; the app refuses a helper's Write of report.md. -->
U4 held-out ranking files of B3 and B2 are written, and U4's report text is below. Nothing was scored, and held-out truth was not opened. Files, arms and counts, as READY.md says it should be, were checked. One format point (B3 seed cell) is flagged in the checks section.

## Held-out ranking files
- **What I ran:** U4's code as it is, with the frozen choices, CPU only, Docker `d2-embed-gpu:3` with `--network none`, and no graphics card. The two commands were `run_cpu.sh py ease.py heldout` and `run_cpu.sh py rank.py heldout --tag B2`; both exited 0.
- **B2 refit check:** the B2 writer refits each repository's frozen setting and asserts the same tuning P@10 and tree count before it writes. It passed.
- **Where:** `C:/Users/User/Documents/projects/card-run-2026-11/improve/U4/heldout/<arm>/<repo>/<k>.npy`, with arm B2 or B3 and repo fixflow, clinic or zulip.
- **Format:** one float32 `[tasks, files]` score matrix per held-out block, as the card's .npy files. U4 names no JSONL format.
- **Counts:** FixFlow 6 files per arm (blocks 4 to 9), clinic 6 per arm (blocks 4 to 9), zulip 25 per arm (blocks 10 to 34). That is 37 files per arm, and each equals the number of held-out tables.
- **B2 off-table cells:** cells off the candidate list hold -inf.
- **B3 files:** these are copies of the cached EASE matrices, which are finite on every alive column.

## Checks I ran
- **Files against tables:** for every file, I compared the number of finite cells with the rows of the same block's held-out table (rows = tasks x (N-1)).
  - B2: equal in all 37 blocks, with no NaN.
  - B3: finite cells exceed the table rows by exactly the number of tasks. That is the seed cell, which is finite in the cache. The card scorer `d4lib.per_commit` sets the seed cell to -inf itself (`d4lib.py:215`), so it is harmless there. A scorer that does not mask the seed would need to do so.
- **Format as stated:** U4 states the seed cell as -inf in READY.md, but only the B2 files follow it.
- **Lines that parse:** this applies to the held-out files only as .npy matrices, and all 74 files load. There are no JSONL ranking files.

## Report text (save as `units/U4/report.md`)

### U4 report: D4 training blocks, features, B3 EASE, B2 LambdaMART

**What was built.** Training blocks cut before the tuning split under the rule at `d4lib.py:70`. A per-block feature table. B3 (EASE) and B2 (LambdaMART). A refit script. Tests: 9 of 9 pass, with a plain runner because no image has pytest.
- The replayed history, the card's tuning blocks and its held-out blocks equal the card's files byte for byte.
- The 14 untrained arms come out of the tables equal to `CR/d4/out/choices.json`.

**Blocks and cutoffs** (CR = `C:/Users/User/Documents/projects/card-run-2026-11`; data in `CR/improve/U4/data/<repo>/`).
- **Training blocks:** ids 1000 and up, split `train`, with their own `hend` and cutoff. They are cut backwards from the tuning start, 10 commits per block (zulip 20).
- **Training counts:**
  - FixFlow: 6 blocks, 303 tasks, cutoffs 2026-06-02 to 06-10.
  - Clinic: 6 blocks, 214 tasks, cutoffs 2026-11-03 to 11-04.
  - Zulip: 100 of 1,044 possible blocks (the latest), 7,989 tasks, cutoffs 2025-05-18 to 2026-05-18. Four segments of 25 blocks each have their own content snapshot.
- **Card blocks keep their ids:**
  - Tuning: FixFlow 34 commits, clinic 34, zulip 192; 260 pooled.
  - Held-out: FixFlow blocks 4 to 9, clinic 4 to 9, zulip 10 to 34.
- **Early training history:** FixFlow's first training block has 2 history commits, the clinic's 17.

**Feature tables** (`CR/improve/U4/tables/<repo>/<split>/<k>.csv.gz`).
- **Layout:** one row per (task, candidate), seed excluded. Columns: `k, commit, task, seed, cand, tie, label`, the features, then the empty columns `B4_GNN, B5_DYGFORMER, B5_TGN`.
- **Where U5 and U6 add scores:**
  - Their empty columns are the last three of every table, in training, tuning and held-out.
  - Score matrices for `rank.py` go in `DIR/<repo>/<k>.npy` as `[tasks, files]`, merged with `--extra B4_GNN=/improve/U5/...`.
- **Features:**
  - Co-change counts: PC, DEC7 to 365, INV, INV7 to 365.
  - Confidence: CONF_SC, CONF_CS.
  - Ages and counts: LAST_CO_DAYS, CAND_NCHG, CAND_AGE_DAYS, CAND_LAST_DAYS, SEED_NCHG.
  - Names and structure: SAME_STEM, TEST_PAIR, FOLDER_DIST, IMP_SC, IMP_CS.
  - Card scores: PPR, TEXT, RRF.
  - CONTENT_COS (Qwen3-Embedding-0.6B file vectors, one snapshot per split start).
  - EASE.
- **Rows (train / tune / test):**
  - FixFlow: 59,086 / 52,090 / 179,418.
  - Clinic: 53,903 / 89,427 / 157,572.
  - Zulip: 2,770,924 / 1,634,921 / 5,280,856.
- **Labels and lists:** held-out `label` is empty. Tuning and held-out hold every candidate. Zulip training holds a pool of about 347 rows per task. A pool check gave tuning P@10 of 0.1128 (pool) against 0.1138 (complete lists).

**How to run** (`research-tree/build/improve/code/U4/`).
- `run_all.sh` lists the steps in order, and each step skips finished outputs.
- Held-out files: `run_cpu.sh py ease.py heldout` and `run_cpu.sh py rank.py heldout --tag B2`.
- Refit with any column set: `run_cpu.sh py rank.py refit --cols ... --extra B4_GNN=/improve/U5/...`. Sweep a tag: `rank.py sweep --tag B1`.
- **Reproducibility:** the two heldout commands and the refit are deterministic at fixed threads. EASE re-runs agree to about 7e-12 across thread counts.

**Tuning P@10 / recall@10** (difference to the best untrained arm on the same commits, 95% interval from a paired bootstrap).

The best untrained arm is PC on FixFlow, RRF on the clinic and INV365 on zulip.

| arm | FixFlow (34) | clinic (34) | zulip (192) | pooled (260) |
|---|---|---|---|---|
| best untrained | 0.212 / 0.538 | 0.117 / 0.316 | 0.110 / 0.680 | 0.124 / 0.614 |
| B3 EASE | 0.204 / 0.510 (-0.008 [-0.018, +0.001]) | 0.116 / 0.324 (-0.000 [-0.012, +0.012]) | 0.110 / 0.681 (+0.000 [-0.000, +0.001]) | 0.123 / 0.612 (-0.001 [-0.003, +0.001]) |
| B2 LambdaMART | 0.244 / 0.613 (+0.032 [+0.019, +0.047]) | 0.152 / 0.432 (+0.035 [+0.023, +0.049]) | 0.116 / 0.715 (+0.006 [+0.004, +0.009]) | 0.138 / 0.665 (+0.013 [+0.010, +0.017]) |

- B3 matches the best untrained arm and does not beat it.
- B2's pooled gain is +0.013, below the +0.02 line. It is in-sample on tuning, so optimistic.
- The full table is in `CR/improve/U4/tune-report.json`.

**Frozen choices.**
- **B3** (`ease/choice.json`): FixFlow and the clinic use half-life 30 d, no 1/|e|, lambda 625 x mean diag. Zulip uses 365 d, 1/|e|, 625.
- **B2** (`rank/B2/choice.json`): every repository chose the pooled model, all features, per-query normalisation, leaves 15.

| repository | learning rate | span | trees | tuning P@10 |
|---|---|---|---|---|
| FixFlow | 0.03 | latest half | 750 | 0.2439 |
| clinic | 0.1 | all | 620 | 0.1520 |
| zulip | 0.1 | all | 50 | 0.1163 |

**Held-out files.** As listed above: 37 per arm, B2 and B3 each, under `CR/improve/U4/heldout/<arm>/<repo>/<k>.npy`. They are not scored.

**For U7, the refuter's non-breaking points** (`research-tree/build/refute/IMPROVE-U4.md`; there were no breaking findings).
1. Held-out scores are stored as float32, cast from LightGBM's float64. On tuning this added a few ties: zulip 482,535 to 482,629 tied cells, FixFlow 3,009 to 3,010, the clinic none. No commit's P@10 changed. A near-tie on held-out could move a commit. Float64 would remove the question.
2. CONTENT_COS is empty for most training cells of FixFlow and the clinic, 88 to 99% in blocks 1001 to 1005, because one snapshot serves all six blocks. It is empty for 1 to 71% of tuning cells and 0 to 66% of held-out cells. Zulip is at 0 to 4% everywhere. The pooled model therefore learns the feature mostly from zulip. This is not a leak.
3. EASE sits at the top of its lambda grid (625) in every repository, so B3 is close to a weighted co-change count.
4. B2's tuning gain is optimistic: it is the best of 40 models per repository, early-stopped on 34, 34 and 192 commits. The same pooled model is cut at 50 trees for zulip and 620 for the clinic. Only held-out can judge the +0.02 gate.
5. `rank.py refit` trains on the training blocks only. Every `--extra` score directory must also cover the training blocks (1000 and up), or `np.load` raises. A B1 "fitted on tuning" needs a fit path of its own.
6. Added by me: the B3 held-out files carry a finite seed cell (see checks). The card scorer masks it.
7. Added by me: the `logs/ease-sweep.log` is stale from an earlier grid. The frozen record is `ease/choice.json`.

**Not done or not tested.** Query weights matched to the per-commit metric. A candidate's decayed change count. B4 and B5, which later units add through the empty columns. Parquet (CSV.gz is used because no image has pyarrow). Zulip training uses 100 of the 1,044 possible blocks.

Card use: one job, 0.33 h, before the refuter. Today's two held-out commands ran on the CPU only.
