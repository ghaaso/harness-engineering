# D4 builder: READY (code runs end to end on a small slice)

Status: READY for the refuter. Code: `research-tree/build/runbig/card/d4/`. Scoring is fixed in `README.md` there.
CR = `C:/Users/User/Documents/projects/card-run-2026-11`; data `CR/d4/data/<repo>` (extract.mjs), outputs `CR/d4/out`.

## What the refuter should run and read (the code only, against section 3.6's scoring rules)
- `d4/extract.mjs`: commit history (committer-time order), eligible commits, blocks, per-block alive files and import edges.
- `d4/d4lib.py`: leak-free history per block (assertion that every history commit is strictly earlier than the block's
  first task), tasks (seed = modified alive file, truth = other modified alive files), random tie-breaking (`rnd`,
  fixed per task and shared by all arms), P@10 / recall@10 per commit, weighted-RRF fusion, bootstrap, verdict word.
- `d4/kge.py`, `d4/kge_run.py` (ComplEx-N3 and RotatE, selection on filtered MRR of held-out pairs, run per block),
  `d4/anyburl.py` + `anyburl.sh` (AnyBURL), `d4/evaluate.py` (tuning choices, frozen held-out, verdict), `d4/full.sh` (order).
- Tests: `d4/dpy.sh test_d4.py` (prints "all D4 tests passed"; leak, truth/seed, ties, fusion, valid split, verdict words).
- Slice already run: tuning blocks of FixFlow and the clinic, both graph forms, ComplEx, RotatE, AnyBURL (20 s) and the untrained arms:
  `d4/dpy.sh evaluate.py tune fixflow clinic` (5 s). Held-out has not been run or looked at by any arm.
- Points worth a blind look: (1) AnyBURL's filter of known answers is avoided by renaming the head relation (anyburl.py
  docstring, anyburl.sh); (2) a block's candidates and truth are files alive at the block cutoff (stale by up to one block);
  (3) TARMAQ with a single-file query equals pair counting by construction (reported as PC); (4) the RRF ranker is a
  reconstruction (structural graph + co-change), the earlier typed graph is not on disk; (5) fusion weight edge: 0.25 was chosen
  on the first tuning run (the grid's lowest value).

## Measured so far (tuning only)
- Graph sizes at the last block (co-change facts both directions / entities): FixFlow 15,646 pairs, 17,106 with imports and
  folders, 529 files; clinic 14,486 / 18,218, 583 files; zulip 211,774 / 225,526, 2,745 files. Commits over 50 code files
  dropped from co-change: FixFlow 2, clinic 1, zulip 152 (over 30: 6, 3, 284). The cut is 50 (plan: 2 to 50 files).
- Surprise index on tuning tasks (truth with no earlier co-change with the seed; of those, reachable within 2 hops in the
  import/folder graph): FixFlow 30 % of truth are new, 9 points of truth reachable; clinic 66 % new, 45 points reachable;
  zulip 21 % new, 11 points reachable (`CR/d4/out/pretest1.json`).
- Seconds on the card (selection runs, filtered-MRR early stopping, one model): FixFlow ComplEx 2 s (d 512 to 2000), RotatE
  d512 12 s, d2000 43 s; clinic ComplEx 4-11 s, RotatE d512 19 s, d2000 65 s; zulip ComplEx d512 about 9 s per epoch
  (194k train facts, 25-30 epochs, 269 s including evaluation), peak card memory 150 MB (ComplEx), 2.7 GB (RotatE d2000, FixFlow).
- Checkpoints: one long-lived container per repository, form and split loops over blocks (no container per checkpoint,
  overhead per block is graph build plus training only); block size 10 commits (zulip 20) is the stride.
  Stride pre-test (s=1 against s=10 on 38 tuning commits for FixFlow and the clinic, 60 for zulip; `d4/stride.py`) is
  queued behind the card lock: data prepared (`CR/d4/data/*-s1`, `*-s10`), results to `CR/d4/out/stride-*.json`.
  Warm start is not yet timed.

## Card projection for the whole schedule [hypothesis from the numbers above, to be replaced by the zulip slice]
- FixFlow and the clinic, both forms, tuning and held-out, ComplEx + RotatE: under 0.5 h each.
- Zulip, one form: ComplEx 35 blocks x about 3-12 min (d 512 to 2000) = 2-7 h; RotatE d512 35 blocks x about 3 min = 2 h;
  held-out alone 25 of the 35 blocks. Both forms would about double it. Whole schedule about 5-12 h of card, wall time about
  the same plus AnyBURL on 8 threads (60 s learn + apply per block, about 36 min per repository-form per 35 blocks).
- No single job is projected past 6 hours except possibly zulip's held-out ComplEx at d = 2000; I will cut it into per-block
  restartable pieces (already the case: finished blocks are skipped) and report the first-block time before it starts.
- Zulip selection (grid of 9 configs on one block) is running now and gives the per-epoch time at d 512/1000/2000 for ComplEx and RotatE.

## Zulip selection, measured (pairs, first tuning block; replaces the guesses above)
Chosen: ComplEx-N3 d2000 N3 0.05 (valid MRR 0.205; d512/1000 0.203), RotatE d512 (0.169; d1000 0.128, d2000 0.050).
Train time of the grid entry (with early-stop evaluation): ComplEx 269-319 s for 35 epochs at d512-2000 (about 8-9 s per
epoch, d-independent, so overhead-bound), RotatE d512 699 s, d1000 974 s, d2000 2,340 s. Card memory 0.4 GB (ComplEx), 2.9 GB (RotatE).
Per block at the chosen settings: ComplEx about 25 epochs x 9 s = 4 min; RotatE d512 about 15 epochs x 30 s = 8 min.
Zulip held-out (25 blocks): ComplEx about 1.7 h, RotatE about 3.3 h per graph form; tuning (10 blocks) 0.7 h and 1.3 h.
Whole schedule with both forms: about 14 h of card [computed], largest single job about 3.3 h (under 6 h).
