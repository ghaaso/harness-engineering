# U1 report (D2 text search: split, A7, A8, A3, A2), 2026-11-24

CR = `C:/Users/User/Documents/projects/card-run-2026-11`. Full detail is in `READY.md` (unchanged).

## What U1 built, and its tuning results

- Code is in `research-tree/build/improve/code/U1/`. Outputs are in `CR/improve/U1/`.
- It builds a time-ordered split with tuning and training blocks per repository, and the A7 text arm (function chunks, frozen on tuning). It also builds A8 (commit vote), A3 (convex fusion per repository) and A2 (LambdaMART, pooled, 15 leaves, 184 trees).
- On the 217 tuning queries, macro Acc@10 is:

| arm | macro Acc@10 |
|---|---|
| card BM25 | 0.713 |
| A7 | 0.833 |
| A8 | 0.706 |
| A3 | 0.909 in-sample; 0.886 five-fold inside tuning |
| A2 | 0.919 in-sample |

- A2 beats BM25 by +20.6 points (interval +14.0 to +27.8).
- A3 beats BM25 by +19.6 points.
- Both gains pass the +0.06 line on tuning. All settings were chosen on tuning only.

## Held-out files written (not scored, truth not opened)

Command: `code/U1/run_all.sh heldout`. It ran in Docker with `--network none` on `d2-embed-gpu:3`, on CPU only. It exited 0. The card and its lock were not used.

Folder: `CR/improve/U1/heldout/<repo>/rank_{a7,a8,a3,a2}.jsonl`.

`heldout.py` asserts that every held-out query of the card's set has a line in each of the four files. I also checked the line counts against the card's `d2/<repo>/queries.jsonl`.

| repo | queries | lines in each of the 4 files |
|---|---|---|
| fixflow | 69 | 69 |
| clinic | 80 | 80 |
| zulip | 242 | 242 |

## Blind check (refuter, Opus, `refute/IMPROVE-U1.md`)

- No breaking findings. The split, the signals under a cut history and the held-out untouched rule all held. The tuning numbers reproduce exactly (A3 0.9089 and 0.8855, A2 0.9187, 18 of 18 tests pass).
- A dry run of the held-out step passed before the real run.

## Non-breaking points that later units need

- **U7 must fit its own model.** `ltr.py` fits on training rows and refuses columns empty there. A5 scores are barred from training queries, and U7 fits A1 on tuning. U7 can reuse `derive`, `groups`, `train_one` and `Universe`.
- **U7 must place the card's own files beside the held-out files.** Put the card's `files.jsonl`, `queries.jsonl` and `rank_bm25.jsonl` unchanged in each `heldout/<repo>/` folder, or `score.py` cannot score it.
- **Clinic's history includes side branches.** Some history commits come from branches merged into main later, all made before t0. They are 14.8 % of the history held-out reads (36 of 243), against 6.2 % on tuning. None carries content from after the cutoff, but held-out sees more of it than tuning did.
- **A2 against A3, like with like.** The five-fold estimate inside tuning is 0.916 for A2 and 0.886 for A3. A2's in-sample optimism is about 0.3 points.
- **Smaller points:**
  - A3's FixFlow weights are partly a tie-break.
  - BM25F's k1 sits at the top of its grid (6.0).
  - The Python BM25 feature differs from `bm25.mjs` by up to 0.65 % on FixFlow held-out.
  - Tests use unittest, not pytest.
- **Not checked:** zulip train1 to train5 in the cut-history recomputation, and the five-fold A2 estimate for the per-repository scope.
