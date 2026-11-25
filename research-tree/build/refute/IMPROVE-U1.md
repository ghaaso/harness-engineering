# Refuter verdict on unit U1 (D2: split, A7, A8, A3, A2), before its held-out ranking files, 2026-11-24

Kind refute, Opus, one blind pass (`improve/units/REFUTE-BRIEF.md`). I read the code under `improve/code/U1/` and the outputs under `CR/improve/U1/` (CR = `C:/Users/User/Documents/projects/card-run-2026-11/`). I did not open `units/U1/READY.md` until my own checks were done. Every check ran in Docker (`d2-embed-gpu:3`, `--network none`, CPU only). U1's code and all outputs were mounted read-only. The card was not needed and not taken. Held-out truth was never opened. My tests are in `improve/code/R-U1/` and run with `rr.sh <scratch dir> python <script> ...`.

**Answer first: there are no breaking findings.** U1 can write its held-out ranking files as built. Every tuning number it claims comes out exactly the same when its code is re-run.

## Breaking findings

None.

## What was checked, in the brief's order, with the result

1. **Leakage in time: none found.**
   - **The split, rebuilt from git** (`check_split.py`, FAILS 0 on all three repositories). The code is my own; it imports only the card's `prep.py` rules. It rebuilds:
     - the tuning split (the last min(int(30 %), 150) pre-cutoff candidates);
     - the training pool and the training blocks;
     - every block's snapshot (the last commit in log order before the block start);
     - every query's text and truth.
   - The rebuild matches U1 exactly on all three repositories. Further facts it confirmed:
     - No snapshot's ancestry reaches its block start.
     - No training commit is at or after t_tune.
     - No commit is in both tuning and training.
     - The history is exactly the main-line commits with ct < t0.
     - The training labels end before the tuning snapshot.
   - **The signals under a cut history** (`check_signals.py`, FAILS 0). I recomputed every signal of a block from two cut inputs:
     - a history holding only the commits before the block start;
     - a text index built from that block's own snapshot only.

     Every array (BM25, BM25F, chunk, A8 vote, co-change at all three decays, edit count, age, kind) equals the stored `sig_<block>.npz`. So nothing at or after a block's start, and no other snapshot's files, reaches a signal. Blocks covered: FixFlow all 5, clinic all 5, zulip tune, train0, train6 and heldout. Zulip train1 to train5 were not run; they use the same code path.
   - **Side branches** (`offsnap.py`). For each history commit a block reads that is not an ancestor of its snapshot, I took the latest committer time in that commit's ancestry. None reaches the block start. Details in non-breaking item 2.
   - **No in-sample stacking.** A2 is trained on training-query labels only. It takes no fitted score as a feature: no A3 output, no learned score.
2. **Held-out untouched.**
   - Held-out truth is read in one place only: `u1lib.load_heldout_queries`, which drops it while parsing.
   - Every other use of truth is restricted to tuning or training (grep of the code).
   - There was no `CR/improve/U1/heldout/` folder: nothing was written or scored on held-out.
   - U1's held-out rows carry `truth: null`, and the table's held-out labels are empty.
3. **Scorer and query sets equal the card run's.**
   - U1's held-out queries (qid, commit, ct, text) equal the card's `CR/d2/<repo>/queries.jsonl` one for one. The held-out snapshot equals the card's index.
   - The tuning scores come from the card's own `score.py`, unchanged. Its BM25 is the card's own `bm25.mjs`.
   - The card's untrained arms, reproduced on the held-out queries (`heldout_arms.py compare`, top-10 lists only, no truth):

     | arm | FixFlow | clinic | zulip |
     |---|---|---|---|
     | Qwen3, identical top-10 | 69/69 | 80/80 | 242/242 |
     | SweRank, identical top-10 | 69/69 | 79/80 | 241/242 |
     | BM25, identical top-10 | 60/69 (set overlap 0.997) | 80/80 | 241/242 |

     The top-1 is identical everywhere.
4. **The ranker is fitted and early-stopped as the brief says.**
   - LightGBM lambdarank is trained on the training-query rows and early-stopped on tuning NDCG@10 (patience 100, at least 100 trees, at most 1,000).
   - The grid is leaves 7/15/31, learning rate 0.02/0.05/0.1, pooled or per repository, selected on tuning.
   - The saved model `models/a2/pooled.txt` (184 trees) reproduces the scored tuning ranking exactly: max absolute difference 0.0 (`repro.py ltr`).
5. **Held-out rows are built by the same code path.**
   - All three table CSVs on disk equal a fresh rebuild from the signal files with U1's own `features.block_rows`, value for value (`check_table.py`). That includes the FixFlow signals recomputed after the shutdown.
   - No feature column is empty on any split.
   - A dry run of `heldout.py` on a scratch copy finished and wrote A7, A8, A3 and A2 for every held-out query (69 / 80 / 242), all scores finite (`heldout_arms.py dryrun`). Those files were deleted and never scored.

## The claimed tuning numbers against what the code produces (217 tuning queries: 34 / 37 / 146)

| claim | re-run here | how |
|---|---|---|
| BM25 (card) 0.713 macro Acc@10 | 0.713 (P@2 0.256), file equal | `repro.py score`: card `score.py` over `CR/improve/U1/cardfmt` |
| A3 0.909 in-sample | 0.9089, the same frozen weights per repository | `repro.py fusion`, from `sig_tune.npz` |
| A3 0.886 five-fold | 0.8855 (the other three families also match) | as above |
| A2 0.919 | 0.9187 (P@2 0.4968); the same choice (pooled, 15 leaves, lr 0.05, 184 trees) and the same 18-point grid | `repro.py ltr`, re-run on a copy of the table |
| U1's own tests | 18 of 18 pass | `python -m unittest test_u1`, outputs read-only |

**Not in the claims: A2 by five folds inside tuning.** I ran a five-fold estimate (`repro.py ltrcv`):
- Folds are contiguous in time. The pooled grid is selected and early-stopped on four folds and scored on the fifth.
- Result: **0.916** macro Acc@10, P@2 0.486 (FixFlow 0.912, clinic 0.865, zulip 0.973).
- So A2's in-sample optimism is about 0.3 points. Compared like with like on tuning, A2 is 0.916 against A3's 0.886.
- The per-repository scope was left out of this estimate; it was worse in-sample at every grid point (best 0.880).

## Non-breaking findings

1. **A2's 0.919 is in-sample.** The settings and the early stop were both chosen on the same 217 queries. READY.md says so. The five-fold figure above (0.916) is the comparable number.
2. **Clinic: history from side branches.** Some history commits the clinic's signals read are not ancestors of the block's snapshot. They were made before t0 on branches merged into main later:

   | clinic block | such commits | share of history read |
   |---|---|---|
   | held-out | 36 of 243 | 14.8 % |
   | tuning | 11 of 176 | 6.2 % |
   | train1 | 1 of 27 | 3.7 % |

   - None of them has an ancestor at or after the block start, so none carries content from after the cutoff.
   - This is the card's time rule (ct < t0), and FixFlow and zulip have none.
   - The clinic's held-out signals see more branch history than its tuning signals did.
3. **U1's Python copy of the card's BM25 (`s_bm25`, an A2 feature) is not exact on FixFlow.**
   - It differs from `bm25.mjs` by up to 0.65 % in score on FixFlow held-out (`bm25diff.py`; no float32 ties are involved, so the cause is tokenizing).
   - On tuning the two give identical numbers.
   - The held-out baseline is the card's own file, so only the feature is affected, and it is the same on tuning and held-out.
4. **`ltr.py` cannot serve as U7's refit script for A1.**
   - It fits on the training rows and refuses any column that is empty there.
   - U2's brief forbids A5 scores on training queries, and U7's brief fits A1 on tuning by grouped cross-validation.
   - So U7 needs its own fit-on-tuning loop. It can reuse `derive`, `groups`, `train_one` and `Universe`.
5. **A3's per-repository weights are partly a tie-break.** On FixFlow, 129 of the 201 configurations are within one query of the best in-sample (clinic 63, zulip 20). The frozen FixFlow weights (min-max, 0.2 / 0.8 / 0) are the first of those near-ties in grid order. The five-fold 0.886 already includes this noise.
6. **BM25F's k1 sits at the edge of its grid.** It is 6.0, the top of a grid widened twice, and the score was still rising there (0.833 at 6 against 0.817 at 4). BM25F is an A2 feature, not the frozen A7 form.
7. **One RM3 term count uses later snapshots.** In the RM3 sweep, `len(qt)` counts query terms in the repository-wide vocabulary, which includes later snapshots. This scales the original-term weight slightly. RM3 lost and feeds no frozen arm or feature.
8. **U1's held-out folder will not be scorable on its own.** `CR/improve/U1/heldout/<repo>/` will hold only `rank_{a7,a8,a3,a2}.jsonl`. The card's `score.py` needs `files.jsonl`, `queries.jsonl` and `rank_bm25.jsonl` in the same folder. U7 must place the card's own files beside them, unchanged.
9. **The shutdown left the clinic's Qwen3 file intact.** That file (written 11:07 UTC by the job the shutdown killed) loads, equals the clinic signal files block for block, and matches the card's Qwen3 held-out top-10 on 80 of 80 queries.
10. **The tests use unittest, not pytest.** pytest is not in the image, so the brief's "pytest" became unittest. They run and pass.

## Not checked

- Zulip train1 to train5 in the cut-history recomputation (train0, train6, tune and heldout were checked; same code).
- The five-fold A2 estimate for the per-repository scope.
- P@2 figures of the five-fold A3 row (Acc@10 checked).
- The card's grep and RRF arms on tuning (not needed: the gate is against BM25).
