# D4: the ranker retest, each family's best form (TRACK-PLAN.md section 3.6)

Scoring and design, fixed before any arm ran (do not change after a result is seen).

## Task and scoring
- Repositories: FixFlow (EMS_workshop1, remote), the clinic (no remote; read-only git), zulip/zulip (CR/repos/zulip).
- Code files: .py .js .jsx .ts .tsx .mjs .cjs, excluding node_modules, vendor, third, .min.js. File identity survives
  renames (git -M).
- Commit size for co-change = code files added or modified (pairs count only for 2 to 50 files; pairs of files alive at the cutoff). Commits: no merges, ordered by committer time (stable). A commit is eligible if it modifies (M, or rename with edits) 2 to 50 code files.
- Task: one seed = one modified code file alive at the block cutoff; truth = the other modified code files alive at the
  block cutoff; at least one truth file. Candidates = all code files alive at the cutoff except the seed (unrestricted).
- Leak-free split by date: eligible commits are cut into blocks of 10 consecutive commits (zulip 20). A block's arms see only commits
  with committer time strictly before the block's first commit, and only the file set, paths and imports at that
  point. All arms of a block see exactly the same history. Splits per repository: FixFlow and the clinic: first 40 % of
  eligible commits history only, next 25 % tuning, last 35 % held-out; zulip: last 500 eligible = held-out, the 200
  before = tuning, everything earlier history.
- Metrics: P@10 = hits in top ten / 10; recall@10 = hits / |truth| (top ten); per commit = mean over its seeds; a
  commit is the unit. Each arm alone, unrestricted. Ties in score broken by a random key fixed per (task, seed 7).
- Intervals: paired bootstrap over commits, 10,000 resamples, 95 %. A learned arm "adds" if its P@10 exceeds the best
  untrained arm's by >= 0.02 (interval lower end above 0 reported; the verdict word uses the point gain and the
  interval). The best untrained arm per repository is chosen on tuning P@10; the gate is judged pooled over the three
  repositories and per repository.
- Held-out is scored once, with every choice frozen from tuning (decay, d, N3 weight, fusion weight, pairs or triples).

## Arms
Untrained (history only): plain pair counting (PC); decay (half-life 7/30/90/180/365 days or none; chosen per repo); the
1/|e| commit weight (w = 1/|files|, with or without decay); TARMAQ (single-file query: its rules s -> f ranked by
confidence equal pair counting by construction, so it is reported as PC and not as a separate arm); commit-text match
(cosine of tf-idf profiles of the messages of earlier commits that touched the seed and the candidate); RRF ranker
(rooted PageRank on the import/folder graph fused with co-change confidence, k = 60; a reconstruction, since the earlier
typed graph is not on disk; reported on all three repositories, the plan only needs FixFlow).
Learned: ComplEx-N3 (1-vs-all cross-entropy, reciprocal relations, N3 0.05 or 0.1, Adagrad, rank 512/1000/2000) and RotatE
(256 filtered uniform negatives, self-adversarial loss, gamma 9, Adam) with d / N3 chosen on filtered MRR of held-out
co-change pairs (5 %) on the first tuning block's graph per repository; AnyBURL 23-1x (learn, then apply to tails of the seed).
Fusion: weighted RRF (k = 60) of the best untrained arm and one learned arm, one weight chosen on pooled tuning P@10
from {0.25, 0.5, 1, 2, 4}.
Graph forms: pairs (co_changed only) or triples (co_changed + imports + in_folder + folder_parent). Triples on the clinic
and zulip only if triples beat pairs on FixFlow in the pre-tests (rule below).

## Pre-tests (first)
1. Surprise index on tuning tasks: share of truth files with no earlier co-change with the seed (what pair counting cannot
   reach), and, of those, the share reachable within two hops in the typed graph (imports/folder): triples have "room" if
   this share is >= 0.05 of all truth.
2. Triples against pairs on FixFlow: ComplEx-N3 alone, tuning P@10; triples chosen where they exceed pairs by >= 0.01.
3. First-run timing and memory of the KGE and AnyBURL runs (sets AnyBURL's container memory and the card hours).
GraIL is run only if pre-test 1 shows room and the owner is told of its missing licence; it is not built here.

## Correction, 2026-11-24 (after the blind check CARD-D4; scoring rules above unchanged)
- B1, RotatE. Read in the paper itself (Sun et al., ICLR 2019, arXiv 1902.10197, appendix H, Table 12): for FB15k-237 the
  line is "FB15k-237  1000  1024  256  1.0  9" (embedding dimension 1000, batch 1024, 256 negatives, temperature 1.0,
  margin 9). The paper (text of the PDF, checked for "learning", "lr", "epoch", "steps", "1e-") gives NO learning rate and
  NO number of steps; it says only "We use Adam". The checker's 5e-5 is therefore not in the source, and the code's 1e-3 cannot be
  called published. Not guessing: RotatE is left out of the full run (D4_ROTATE off in kge_run.py and evaluate.py) and out of
  the closure wording; the earlier RotatE tuning numbers are not reported. Open: RotatE at the authors' released settings
  (their repository, not read here) was not tested.
- B2, AnyBURL. The 16 tune folders learned at 20 s on 6 threads had their done files removed; full.sh relearns them at
  60 s on 8 threads, the setting held-out uses.
- N3 grid edge. ComplEx grid extended with N3 0.025 (and 0.01 only if 0.025 wins) on every selection block. The _chosen entry
  was removed from every select-*.json and every ComplEx .npy under kge/{fixflow,clinic,zulip} deleted, so no old matrix is
  reused. Fusion weight grid unchanged.
