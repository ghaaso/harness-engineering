# Protocol addendum 8 — knowledge-graph embeddings and a graph-neural encoder against the simple ranker

Written 2026-11-14, before PyKEEN was installed and before any model was trained or any score of
this step existed. The owner approved installing PyKEEN and PyTorch (CPU) in a test container only
(2026-11-14). The position under test, neither defended nor attacked: "embeddings and graph neural
models do not pay at this size". protocol.md and addenda 1 to 7 stand otherwise.

## A. Install and machine

1. A new image `graphtest-kge:1` built on `graphtest:1`: PyKEEN (latest release on PyPI) and PyTorch
   CPU with their dependencies, by the addendum 7 pattern: wheels downloaded in a throwaway container
   (the only time the network is on), every wheel's sha256 compared with the value PyPI publishes,
   a `--require-hashes` lock, `docker build --network none`. `embeddings/INSTALL.md` lists every
   package with version, wheel bytes and sha256, and the image size.
2. Every training, scoring and smoke run uses `--network none`, `--cpus 6`, a memory cap of at most
   4 GB (set from free RAM; at most two of this lane's containers at once), inputs mounted read-only.
   No package is installed on the host. Nothing about the project goes into a web query.
3. Long steps write a progress file and resume from it; a finished unit is never rerun.

## B. The task and the comparators (fixed)

4. Ranking task of the pilot (`graph-v2/lane-ranking.md` section 5): the 65 T1 tuning commits; each
   existing changed file is a seed once (388 seeds); truth is the commit's other modified (not added)
   code files; the snapshot is the facts cache at the commit's parent.
5. Pool: code files within 2 hops on the file-collapsed graph, plus every co-change neighbour
   (pilot definition). Unrestricted: every code file that exists at the parent, seed excluded.
6. Comparators, implemented once in the shared evaluation code with random tie-breaking (fixed seed):
   PPR = rooted PageRank, restart 0.15, 25 iterations, pilot graph; CO = co-change confidence;
   RRF = reciprocal-rank fusion of PPR and CO, k = 60; DIR = shared leading path segments with the
   seed; RANDOM. Gate: before any embedding score is computed, this code must reproduce the pilot on
   the late 50 (P@10 RRF 0.233, PPR 0.204, CO 0.199, random 0.118) within 0.005. If it does not, the
   step stops and the difference is explained first.
7. On held-out, the stored arms are shown as they are (typed graph 0.700, scripted search 0.625,
   changed-together floor 0.638, same-folder floor 0.549; 8,000-token answer recall, 75 commits).
   Nothing of theirs is rerun.

## C. Arms (each alone, and each fused with the simple ranker)

8. Training graph per checkpoint: all nodes and all edge kinds the shared loader
   (`arms/common/facts.js`, addendum 2 item 15) yields at that parent, `co_changed` included, one
   triple per (kind, source, target), with a reciprocal relation for every kind. The embedding score
   of a candidate c for seed s is the model's score of (s, co_changed, c).
9. E1 RotatE (Sun et al., ICLR 2019, arXiv 1902.10197): stochastic local closed world, self-adversarial
   negative sampling loss with margin, Adam.
10. E2 ComplEx with the N3 regulariser (Lacroix et al., ICML 2018, arXiv 1806.07297): reciprocal
    relations, 1-vs-all cross-entropy (PyKEEN LCWA), N3 = Lp regulariser with p = 3, Adagrad or Adam.
11. E3 TransE (Bordes et al., NeurIPS 2013) as the translational baseline, trained with the same
    self-adversarial negatives as E1 (shown to help TransE by Sun et al. 2019).
12. E4 graph-neural encoder: CompGCN as PyKEEN ships it (Vashishth et al., ICLR 2020,
    arXiv 1911.03082). If it cannot finish a stage-A run within 60 minutes or 4 GB, R-GCN as PyKEEN
    ships it (Schlichtkrull et al., 2018) replaces it; if neither trains, E4 is reported "not trained"
    with the reason.
13. E5 routed relation specialists, the owner's CureFound form: one RotatE specialist per area
    (backend, mobile app, web, other), each trained on the edges with at least one endpoint in its
    area; a router picks two areas for a seed (the seed's own area, then the area holding most of the
    seed's other 1-hop neighbours at the parent); each specialist ranks the candidates it knows; the
    aggregator merges their percentiles by mean; a candidate known to neither is unscored.
14. Fusion: weighted RRF of PPR, CO and the embedding score, k = 60, embedding weight w in
    {0.25, 0.5, 1}. A PLACEBO arm (a fixed random score fused the same way, same w choices, same
    selection) checks the harness: it must not reach "adds".
15. Choices are cited to the paper or the PyKEEN documentation that recommends them, in
    `embeddings/RESULT.md`. Arm settings are the published recipes for small graphs (WN18RR is the
    nearest published size), scaled to CPU.

## D. Leak rule

16. A model used for a task at parent P is trained only on the facts cache at a checkpoint parent C,
    where C equals P or C is an ancestor of P (C's sha is listed in P's `commits.jsonl`, or is P).
    The latest such checkpoint is used. Checkpoints are every s-th distinct task parent in date order
    (tuning and held-out separately, the first task parent always a checkpoint); s is the smallest of
    1, 3, 6, 10 for which stage B's projected time at the measured smoke speed is under 30 hours, and
    is written to the run log before stage B starts. s is chosen from timing only, never from a score.
17. Entities present at P but not at C (new files, symbols, routes) get the mean of the final
    representations of their 1-hop neighbours at P that exist at C (fold-in); with no such neighbour
    they are unscored by the embedding. An unscored candidate adds no embedding term to the fusion and
    is ranked after all scored candidates (random order among them) in an arm alone. An unscored seed
    leaves the fused arm equal to RRF and the arm alone in random order. Counts of folded-in and
    unscored entities are reported.
18. The training graph never contains the task commit, anything after P, or a reference answer. The
    tuning truth is derived from git for tuning commits only; held-out references are read only by the
    grader. The audit checks the leak rule on every checkpoint used.

## E. Tuning (the 65 tuning commits only)

19. Stage A, the authors' way: per arm 16 configurations, written before training (dimension,
    margin or regulariser weight, learning rate, adversarial temperature, layers), one seed, trained on
    the checkpoint graph at the last parent of the first 15 tuning commits, with 10 % of its
    `co_changed` triples held out; early stopping and selection by filtered MRR of
    (h, co_changed, ?) on those triples. No task truth is used. The top 3 configurations go on.
20. Stage B, rolling origin with an inner split: the 3 configurations x 3 seeds x every checkpoint,
    each scored on all 65 commits under the leak rule. Commits in date order; the first 15 are inner
    only; the late 50 form 5 blocks of 10. For each block, the (configuration, w) is chosen on all
    earlier commits by fused pool P@10 (seed-averaged), the simplest within one standard error of the
    best; the block is then scored with that choice. The arm alone uses the same configuration.
21. Equal effort: every embedding arm gets 16 stage-A configurations and 9 stage-B choices. The
    simple ranker has no tuned parameter (k = 60 was shown robust from 10 to 120). Reported as such.
22. Before an arm is called weak: its stage-A MRR is compared with PPR's and CO's on the same held-out
    triples, its loss curve is checked for convergence, and its score direction and use of the
    reciprocal relation are checked against PyKEEN's own prediction call on 20 queries.

## F. Metrics and statistics

23. On the late 50 tuning commits: P@10, R@10, R@20 and MRR, on the pool and unrestricted (R against
    all truth). Per seed, then the mean of the three seeds per task, then per commit, then over
    commits. Paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals.
24. Answer level: the shared `packer.js` and `score.js` at 8,000 tokens (signature form, file
    granularity, the frozen typed primary's packer options), the arm's unrestricted ranked list as
    input, scored by a grader on the late 50 tuning commits, with RRF, PPR, CO and DIR the same way.
25. Seeds: each of the three seeds is also shown alone.

## G. Verdict words (per arm, primary contrast fused-arm minus RRF, pool P@10, late 50)

26. "adds": the paired 95 % interval lies above zero and the difference is at least +0.02.
    "matches": the whole interval lies within -0.02 and +0.02. Otherwise "cannot tell"; an interval
    wholly below zero is reported as "cannot tell (lower)". The same words are given unrestricted
    and for the arm alone against RRF, as secondary. Five arms are tested; Holm-adjusted intervals are
    shown beside the unadjusted ones and the verdict uses the unadjusted one.

## H. Held-out (spent; descriptive only)

27. Selected arm: the highest seed-averaged fused pool P@10 over all 65 tuning commits (ties: the
    simplest). Its configuration and w are chosen on all 65 by the item 20 rule and frozen with a
    hash before any held-out task runs. Exactly one run, 3 seeds, of that arm alone and fused, plus
    RRF, PPR, CO and DIR, on the 75 held-out commits; rank metrics and the answer-level measure,
    scored by the grader. No word of section G is applied to held-out.

## I. Limits declared in advance

28. One repository, about 233 commits of history, about 5,400 nodes and 19,000 edges: about 7 facts
    per entity. A null here says nothing about larger or denser graphs.
29. Not tested: temporal knowledge-graph models, inductive models (NodePiece, NBFNet), text or code
    embeddings, GPUs and large dimensions, rule learners (AnyBURL), a longer history.
30. The truth is what a commit changed, at file level; context a change needed but did not edit is
    not scored. No agent is run.
31. With 50 evaluation commits the smallest detectable difference is several hundredths; "cannot
    tell" is a likely outcome and is reported as "no evidence either way at this size".

## J. Rulings after the evaluation-core gate, before any model was trained on project data

32. Date order means author timestamp. The late 50 is the 50 latest tuning commits by that order
    (`late50` in `evalcore.py`). The pilot ordered by day only; its set shares 46 of 50 commits and
    reproduced within tie noise (RRF 0.233, PPR 0.204, CO 0.195 to 0.199). Verdicts are given on
    `late50`; the pilot's set is shown as a sensitivity row.
33. The history branches, so ancestry is not time order. Any parent that has no checkpoint equal to
    it or among its ancestors under stride s becomes a checkpoint itself. The leak test is unchanged
    (C == P or C in P's `commits.jsonl`).
34. Item 8 is read with minConf 0: the training graph holds every fact the comparators read (the
    pilot graph and co-change use the raw facts unfiltered), so an embedding never sees less than
    PPR and CO. Confidence is not a training weight.
35. Disclosure: while building the evaluation core, one builder's look at a temp file showed the
    names of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it;
    tuning truth came from git for the June commits only. The audit records it.

## K. Rulings after timing, before stage B and before any task-level embedding score (2026-11-14)

36. Stage B has no validation split (the whole checkpoint graph trains), so each configuration
    trains for a fixed number of epochs: the epoch at which its stage-A validation MRR peaked,
    rounded up to the evaluation interval (at least 20). This is the usual practice for a refit.
37. The stride projection is redone with those epoch counts and the selected configurations'
    dimensions (`train/proj.py`). s is the smallest of 1, 3, 6, 10 under 30 hours; if none fits,
    s = 10 and the longer run is accepted. Timing at the declared settings gave 41 to 1,464 hours at
    100 epochs to max epochs, so the projection depends on timing alone; no task score is read.
38. Consequence declared now: with s > 1 an embedding can be up to s task parents older than the
    parent, while PPR and CO read the parent itself. Fold-in (item 17) covers new entities, not new
    edges between known ones. The number of parents of lag per task is reported, and the result is
    worded with it.
39. Stage A's held-out set is small: the stage-A graph has 162 co_changed pairs, so 16 pairs
    (32 queries) are held out. Its top-3 filter is noisy; the binding selection is stage B's nested
    task-level choice. Reported as a limit. Stage A is not restarted (its count, not its scores,
    prompted this).
40. Builder fixes accepted as the papers' forms: RotatE with the L1 sum of complex moduli (PyKEEN
    1.11.1 uses L2 regardless of p); N3 on complex moduli in a 1-vs-all loop per triple (Lacroix);
    tails-only corruption with reciprocals and the authors' subsampling weights for E1, E3, E5;
    tanh in CompGCN (the paper's). Listed in `train/RUNLOG.md`.

## L. The graphics card for stage B and held-out (accepted by the coordinator 2026-11-14, ruling-67-70 file; read 46 with 67 and 68)

Written 2026-11-14 after stage A finished and its selection scores (validation MRR on stage A's
held-out pairs) were seen, and before any stage-B unit ran or any task-level embedding score existed.
The owner approved the card in chat on 2026-11-14 ("Yes, use the GPU"); the image is
`embeddings/INSTALL-GPU.md`. Amended the same day from the coordinator's release gate
(`orchestrator/release-gate.json`, findings `draft-rulings-*`), before any stage-B unit ran.

41. Device. Stage B and the one held-out run train on the RTX 5070 (12 GB) in image
    `graphtest-kge-gpu:1` (torch 2.15.0+cu132; `embeddings/INSTALL-GPU.md`). After training, the final
    representations are copied to the CPU, so every evaluation, ranking tie and task score is computed
    on the CPU, as in stage A. Stage A stays as it ran: on the CPU, with kge.py before the device edit
    (its last unit finished at 09:46Z; the edit began at 09:59Z). Its table and its top-3 choices are
    not remade from a card run. The item-27 record of ruling 57 also carries the device (`cuda`) and the
    image id of `graphtest-kge-gpu:1` (sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7).
42. Unchanged: configurations, dimensions, batch sizes, negative counts, optimisers, float32, the epoch
    rule of ruling 36, the evaluation code and ranking ties. E1, E2, E3 and E5 draw every random number
    (negatives, permutations, hold-out) from the same CPU generators as on the CPU. E4's initial weights
    also come from the CPU generator, but that took one code change (train/kge.py 408-423: the model
    stays on the CPU through PyKEEN's size probe and final reset, then moves to the card), shown
    bit-identical to the CPU for c12, seeds 1-3 (c13 and c16: recorded in RUNLOG before launch).
    Changed, and disclosed: E4's dropout draws from the card's generator, so its later batch order may
    also differ from a CPU run; floating-point sums differ. Precision: no mixed precision and no
    `torch.compile`. TF32 is forced off for matmul and cuDNN (the image's cuDNN default is on). The
    device comes from one environment variable, `KGE_DEVICE`, default `cpu`. With it unset, the
    training path is bit-identical to stage A's for E1, E2, E3 and E5, and for E4 at one thread; at six
    threads CompGCN's CPU scatter already varied from run to run before the edit. Scoring code changed
    after stage A only as rulings 55 and 65 require. A unit that fails on the card is redone unchanged.
    No model setting, batch size, epoch count or item 12 fallback changes in stage B or held-out; a unit
    that cannot finish is reported to the coordinator.
43. Item 2 reads: every training, scoring and smoke run uses `--network none`, `--cpus 6`, a memory cap
    of at most 4 GB (stage B and held-out: 2560m; 2g was the lowest cap that ran every arm), and
    `--gpus all` for card runs. One lane container at a time unless the coordinator rules otherwise
    under ruling 66; a container starts only when three samples 30 s apart show host free RAM of at
    least 4.5 GB and commit charge under 40 GB, and is stopped (its unit redone) after three samples
    under 2.5 GB free or over 43 GB commit (below the ship coordinator's own alarm at 2 GB / 44 GB).
    Stage B and held-out keep at most 5 GB on disk. A run's model file is deleted once its scores are
    written and read back. The representation file ruling 61 keeps per arm is stage A's (CPU;
    `train/stageA/<arm>/<config>/reps.pt`).
44. Stride. s (item 16, ruling 37) is set from the card's timing alone, by the same rule: the smallest
    of 1, 3, 6, 10 whose projected stage B is under 30 hours, else 10. Value: s = 1, from the card's
    timing of the selected configurations at ruling 36's epochs (`gpu/stride-gpu-lanes1.json`):
    projected 14.4 h with one training process (s = 3: 4.8 h; 6: 2.3 h; 10: 1.6 h); 53 tuning
    checkpoints, 2,385 units, lag 0 for all 388 tasks. No task score was read. On the CPU, ruling 37's
    projection was not redone after stage A. The CPU timing before stage A gave 375 to 1,464 hours at
    s = 1 and 41 to 159 hours at s = 10 (`train/stride.json`), so on the CPU no stride fitted 30 hours
    and s would have been 10 under ruling 37. The card therefore sets s, and with it the lag of ruling
    38 (0 for every task). Rulings 49-52 and item 17's fold-in do not act at s = 1 (rulings 48 and 65).
    The s > 1 rows predate rulings 49-51 (the plan gives 19, 10 and 7 checkpoints); they do not change
    s. The number of processes follows ruling 66 (one by default; two or three in one container reached
    the 4 GB cap, an E4 process was killed at three, for a gain of 1.3 to 1.66 times).
45. Item 29's "GPUs" limit now reads: "the card was used to shorten wall time, and that allowed
    s = 1, so every stage-B embedding is trained at the task's own parent (ruling 44); large dimensions
    and card-scale models were still not tested".
46. Nondeterminism. Card kernels may differ from run to run, and floating-point sums differ from the
    CPU's. Before any card timing was trusted, three checks ran. The shared checks passed on the card.
    Scores of one trained model agreed between CPU and card within 1.6e-5 on 20 queries per arm, top 10
    identical 20 of 20. Each arm's stage-A best configuration was retrained on the card with stage A's
    split and seed; validation MRR, CPU to card: E1 0.730/0.730, E2 0.752/0.752, E3 0.741/0.723 (same
    best epoch, 32 queries), E5 0.402/0.401. E4 gave 0.209 under the patience rule and 0.555 at its peak
    without it, before ruling 42's initialisation fix. After the fix, at a fixed 95 epochs, seeds 1-3:
    CPU 0.729, 0.657, 0.596 (mean 0.661), card 0.704, 0.648, 0.698 (mean 0.683), read as seed and
    trajectory variance. These are sanity checks, never a selection input. Seeds are reported per run;
    a rerun on the card may differ, at validation level by a few hundredths on 32 queries.
47. When the choice was made: the owner approved the card at 08:35Z on 2026-11-14, with 76 of 80
    stage-A units finished (E5 c13-c16, none later in E5's top 3, still running); this section was
    written after stage A finished. Stage A's selection scores (validation MRR on its held-out pairs;
    they decide only which three configurations go on, item 19) had been seen. No stage-B unit and no
    task-level embedding score existed then or when this section was accepted. The device was chosen
    for wall time, and s from the card's timing alone (ruling 44), not from any score. Disclosed: E4's
    initialisation fix (ruling 42) followed the card sanity runs that showed E4 at 0.209 and 0.555. The
    fix was kept because it makes E4's initial weights bit-identical to the CPU's, which variant A did
    not. The validation MRRs of both variants (means 0.626 and 0.683; CPU 0.661) were seen before it was
    kept.

## M. Coordinator rulings after the independent pre-run review of stage B (copied word for word from `orchestrator/coordinator-rulings-48-62.md`, sha256 78bd016f466285f22e6a982fb649cb6cb77de4937216b61c7f95063fafcdbf6b)

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_48_62`). Stage A was complete; no stage-B unit had run and no task-level embedding score
existed. Seen before ruling: stage A's selection MRR per configuration, and the placebo numbers of the
plumbing tests. Source: `orchestrator/prerun-review.json` (four lenses, a sceptic for three of them:
27 findings plus 3 added by sceptics). These go into `protocol-addendum-8.md` as section M, word for
word. Where a ruling changes how a frozen item is read, the reason is given.

48. Stride. Item 16 stands: s is the smallest of 1, 3, 6, 10 whose projected stage-B time is under
    30 hours, from timing only. With s = 1 every task parent is its own checkpoint (C = P, lag 0), and
    rulings 49 to 52 have nothing to act on in that split. (The lane's card timing projects 14.4 hours
    at s = 1 with one training process; that figure is checked at the coordinator's gate.)

49. Ancestry for s > 1 (amends the parenthesis of item 16 and the leak test of ruling 33). A checkpoint C
    may serve a task at parent P when C = P, or when both hold: C is a git ancestor of P, and every commit
    in C's facts history (its `ancestors.txt`) is also in P's. Reason: the frozen test ("C's sha is listed
    in P's commits.jsonl") was meant to say "ancestor", but that list is built with `--no-merges` and
    without dropped commits, so a merge-commit parent (34 of the 53 tuning parents) is never listed and
    could serve only its own tasks. At s = 10 that put 98 of 388 tuning tasks on a checkpoint with no
    co_changed fact. The subset condition is the leak guard: it rejects a checkpoint whose history holds
    a commit that P's facts dropped. In the data all 802 git-ancestor pairs the old test missed pass it,
    none fails, and no listed pair is a non-ancestor. The plan asserts both conditions for every
    assignment in both splits; the audit re-checks them from the raw facts.

50. Date order of parents is author time, then committer time, then sha (ruling 32 applied to parents).
    "Latest" in item 16 uses that order.

51. A parent whose latest valid checkpoint has no co_changed fact, while its own graph has at least one,
    becomes a checkpoint itself (as in ruling 33). A task whose own parent graph has no co_changed fact
    stays unscored by item 17 and is counted.

52. Lag (ruling 38) of a task at P served by C is the number of task parents of the same split that are
    P or git ancestors of P and are neither C nor git ancestors of C. It is 0 when C = P.

53. "Simplest" in item 20 (the word was not defined). Simplicity is model size only: smaller embedding
    dimension, then fewer layers. The fusion weight is not part of it. The band is every candidate whose
    seed-averaged fused pool P@10 on the earlier commits is within one standard error of the best
    candidate's, the standard error being that of the best candidate's per-commit values (as built). The
    choice is the smallest model in the band; among candidates of equal size, the higher mean; then the
    lower configuration id; then the smaller w. Reason: the builder's reading also ranked a smaller w as
    simpler and broke ties by name. With a band about 0.025 to 0.04 wide, that fixes the choice at
    w = 0.25 unless a larger weight wins by more than the "adds" threshold, which holds the fused arm at
    the baseline by construction. The nested rolling origin already keeps a block's score honest, so the
    extra pull is not needed for validity and it handicaps the arm under test. The builder's reading is
    kept as a labelled sensitivity row and never decides a verdict.

54. Placebo. Three independent pseudo-configurations (different hash salts) with the three weights, so
    it faces the same nine-way choice as a real arm under the same rule. Its fused-minus-RRF contrast is
    also shown at each fixed w (0.25, 0.5, 1).

55. E5 at stage B follows item 13 and the form its stage-A selection used: a specialist scores only
    entities in its own known set. Item 17's fold-in applies only to an entity absent from the whole
    checkpoint graph at C. A candidate that no routed specialist knows is unscored. Counts are per
    candidate and keep the two cases apart. (The code folded in any entity a specialist did not know,
    so most E5 scores in the score test came from averaged neighbour vectors.)

56. The pilot-set sensitivity row (ruling 32) is shown on the commits that set shares with late50. The
    four pilot-only commits are inner commits with no out-of-sample choice and are left out. No verdict
    word is printed for that row.

57. Item 27 mechanics. An arm's figure is the all-65 mean of the candidate that ruling 53's rule chooses
    on all 65 commits. Ties between arms to four decimals go to the smaller model, then to the arm order
    E3, E1, E2, E4, E5. A script computes this and writes the chosen arm, configuration, w, epochs, s and
    the code hashes with a sha256 before any held-out unit runs.

58. Order of work. `selectB.py` and `report.py` are not run on real stage-B output until these exist,
    pass their plumbing tests on tuning data and have their sha256 in RUNLOG: the item-27 script; the
    held-out driver (held-out truth stays with the grader); the item-24 answer-level adapter (the shared
    `packer.js` and `score.js`, the frozen typed primary's options, 8,000 tokens; every arm alone and
    fused, PLACEBO, RRF, PPR, CO, DIR; aggregated as item 23); the leak audit script. Stage B's training
    and scoring may run before that, because it writes tables, not verdicts.

59. Stale parts. Stage B starts with empty `stageB/parts` and `stageB/tables` (test outputs moved aside).
    `plan.json` carries a hash of s, the device, the ancestry rule and the code; every part records it;
    assemble refuses a part with another hash and asserts that every tuning task appears exactly once
    per arm, configuration, seed and scope, from its planned checkpoint.

60. Leak audit (item 18). For every checkpoint used in either split and every task assigned to it: the
    task commit is not in the checkpoint's history; ruling 49's conditions hold, read from the raw facts
    cache; C is not later than P in ruling 50's order; no truth file is mounted in a training or scoring
    container. The table goes into AUDIT.md with ruling 35's disclosure.

61. Item 22, before an arm is called weak: the stage-A MRR of its three selected configurations beside
    PPR's and CO's; the ratio of mean training loss over the last tenth of epochs to the tenth before it,
    for the stage-A and stage-B runs of the selected configurations (a reported number, not a pass mark,
    because ruling 36 stops at the validation peak); and `check.py`'s comparison with PyKEEN's own
    prediction call on 20 queries for one selected configuration per arm (one representation file per
    arm is kept for it).

62. Wording and counts. Item 17's counts are given for the chosen configuration, as distinct entities
    and as task-candidate occurrences. The Holm rows are called "percentile intervals at Holm-adjusted
    levels". The N3 weights are stated in the paper's convention (weight / 3) after the authors' code
    has been read. The E5 router's single-area case (all neighbours in the seed's own area) is recorded
    as the reading of item 13.

Rulings 63 to 66 (copied word for word from `orchestrator/coordinator-rulings-63-66.md`, sha256 6eb15bc3834c63e8f52386117db9a28f6c1c5f65f514d9738e1ee5597bd91c41):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_63_66`), after the lane reported the GPU steps and the fixes for rulings 49 to 59, and before
any stage-B unit had run. No task-level embedding score existed. These go into
`protocol-addendum-8.md` at the end of section M, word for word.

63. For s > 1 a valid checkpoint must also be no later than P in ruling 50's order. This is stricter
    than ancestry needs (an ancestor can carry a later author date), it drops 1 tuning and 2 held-out
    pairs, and it keeps the plan and the audit of ruling 60 on one test. It has no effect at s = 1.

64. Exact tie for the best mean (ruling 53 did not cover it). The band is measured from that mean with
    the largest standard error among the tied candidates. The choice then follows ruling 53. The result
    does not depend on the order in which candidates are listed.

65. Fold-in at s = 1. With C = P no seed or candidate can be absent from its checkpoint graph, so item
    17's fold-in and ruling 55's fold-in rule cannot fire and stay untested. The run enforces this: any
    non-zero folded count in a part at s = 1 stops that unit as failed, in both splits.

66. Processes and runner. The number of training processes and the way units are executed are not part
    of the plan hash, because they must not change any result. The default is one process. Each part
    records the runner and the number of processes that produced it. Changing either during the run is
    allowed only after an equality test between the new way and one-at-a-time training (same units,
    same seeds) has passed and its record is in RUNLOG with the coordinator's acceptance.

Rulings 67 to 70 (copied word for word from `orchestrator/coordinator-rulings-67-70.md`, sha256 4e8cf0c39bcafb79ab6fb5ea03e2a32b4f2e9b2b1255df8a19df34bf383ddee6):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_67_70`), after the release gate (`orchestrator/release-gate.json`) and the two-container
measurement (`orchestrator/two-container-result.json`; raw files in `orchestrator/parwork/`), and before
any stage-B unit had run. No task-level embedding score existed. Seen before ruling: stage A's selection
MRR, the placebo numbers of the plumbing tests, and losses, timings and hashes of the measurement's
golden units (no task metric was computed from them). These go to the end of section M word for word.

Section L (rulings 41 to 47, as amended from the gate's findings; file sha256
8dbf1dd9190cad1744ca4159c69ab4c027c64451dc4d26312ab235972922fda3) is ACCEPTED and in force, with
ruling 46 read together with rulings 67 and 68 below. Its heading loses the word DRAFT.

67. Deterministic E4. Every stage-B and held-out E4 unit (c12, c13, c16; seeds 1 to 3; every
    checkpoint, every redo and every reference run) trains with PyTorch's deterministic algorithms
    (`torch.use_deterministic_algorithms(True)`, warn_only off) and `CUBLAS_WORKSPACE_CONFIG=:4096:8`.
    Reason, measured on the card on 2026-11-14: without them E4 gives different losses from epoch 1 and
    different score tables on two runs alone, so no E4 result could ever be checked by a re-run; with
    them E4 repeats byte for byte alone and beside another container, at 8 to 20 % more seconds per
    epoch. The model, its settings, seeds and data are unchanged; only the order of additions on the
    card is fixed. The flags are set by a launcher wrapper, not in hashed code; every E4 part records
    them in its runner field, and assemble refuses an E4 part without them. If a deterministic kernel is
    missing for c13 or c16, E4 runs in its earlier form, alone, and that is reported with the result.

68. What "unchanged" means when units run side by side (ruling 66). For E1, E2, E3 and deterministic
    E4: byte-identity of the loss list, every representation tensor, both score tables and the counts,
    against the same unit trained alone. For E5: identical score tables and counts. E5's representations
    and losses drift in the last bit from about epoch 29 on some graphs even when it trains alone (four
    alone runs all differed; the score tables were identical in all ten runs), so byte-identity of its
    representations cannot be shown for it alone or side by side. Reported as a limit: E5 is not
    bit-reproducible on the card. A setting that turns out not to repeat alone is held to E5's
    criterion and named in the result.

69. Two containers, accepted under ruling 66 with conditions. Measured: deterministic E4 beside E1
    1.50 times, E1 beside E5 1.23 times, E3 beside E2 1.63 times, with ruling 68's equality on every
    finished unit (199 units: 5 of the 15 settings, seed 1, two checkpoints). Stage B starts in one
    container (B) in the order E1, E5, E2, E3, E4. A second container (A) may take E4 over, before any
    E4 unit has run, once all of these hold: (i) a two-container guard exists and passes its tests;
    (ii) on the real tree, deterministic E4 c12, c13 and c16 have each trained the smallest checkpoint
    at seed 1 twice with ruling 68's equality; (iii) the coordinator has written
    `orchestrator/equality-accepted.json`. From then on each model type belongs to exactly one
    container, B is relaunched without E4, and each container writes its own progress file. Container A
    starts only after three samples with at least 6 GB free RAM and commit under 38 GB, and it gives way
    first: it is stopped after three samples with commit over 41 GB or free RAM under 4 GB, while B
    keeps ruling 43's lines. For each setting, one finished unit is re-run and compared under ruling 68
    during the run; a mismatch stops side-by-side running for that model type at once and its parts
    made side by side are redone alone. If A never starts, B trains E4 last, deterministic, alone.

70. Disk. The stage-B guard starts with at least 15 GB free on drive C: and stops under 10 GB (in place
    of 20 GB). Reason: the run writes about 0.5 GB; on 2026-11-14 the drive fell from 28.9 to 18.7 GB in
    three and a half hours through other work (602 dangling Docker volumes from gate runs), and a 20 GB
    line would keep the run from starting at all. A stop for disk loses nothing.

Rulings 71 to 77 (copied word for word from `orchestrator/coordinator-rulings-71-77.md`, sha256 899d92aa326b1d70eaf244901a3d2be1294e03dfb019d7a6277a3eb7b661232f):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_71_77`), while stage B was training and before `selectB.py`, `report.py` or any other step had
read a stage-B score. No task-level embedding score existed. These go to the end of section M word for
word.

71. Item 24 on the tuning split stands as written. The packs built from each arm's unrestricted ranked
    list are scored by the grader with the full references (files and definitions), exactly as on
    held-out; the lane hands the packs over and never reads the definition references. The lane's
    file-only recall within 8,000 tokens (references from `tune_tasks.jsonl`) may be shown beside it
    under its own label. It is not item 24's measure.

72. Ruling 60, mounts. Held-out truth mounted in any training or scoring container fails the audit.
    Tuning truth inside the mounted `eval` folder is allowed for stage B and is listed in AUDIT.md file
    by file, with the code lines that show training and scoring take only task id, seed and candidates.
    Stage B was already running with that mount when this was ruled.

73. Ruling 60, first check on held-out. The lane does not know the held-out task commits, so it checks
    the stronger form: every commit in the checkpoint's history is P or an ancestor of P. The grader,
    which knows the task commits, also runs the literal check when it scores.

74. Ruling 61 for E4. CompGCN's stored representations cannot be loaded back into a model, so E4's
    comparison with PyKEEN's own prediction call uses a fresh model of the selected configuration. It
    tests the scoring path, not the stored model, and is reported so.

75. Ruling 61, loss ratio. Stage A is shown both over the run as recorded and up to the selection epoch.

76. Ruling 62, "distinct entities" is reported two ways: distinct paths, and distinct
    (checkpoint, path) pairs.

77. Ruling 57 is read as written: ties at four decimals; "smaller" means dimension, then layers; then
    the arm order E3, E1, E2, E4, E5.

Rulings 78 to 80 (copied word for word from `orchestrator/coordinator-rulings-78-80.md`, sha256 371178ee04722c4f7ee3af17be1280bc472b52140f9cbd431dcd72906deecb1e):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_78_80`), while stage B was training and before any stage-B or held-out score had been read.
Source: `orchestrator/scoring-scripts-review.json` (four lenses and a sceptic). These go to the end of
section M word for word.

78. Held-out mounts (ruling 72 applied). The held-out container mounts the facts and the source store
    of the 70 held-out parents only. Nothing from a later commit is mounted: a later commit's history
    lists the files the held-out commits changed, and that is held-out truth. The leak audit compares
    the container's mount list with the plan's 70 parents and fails on anything else.

79. Held-out memory. The held-out container's cap is 4 GB (item 2's maximum) for every arm, and it
    starts only after three samples with at least 6 GB free RAM and commit under 38 GB. Before the
    freeze, and after stage B has left the card, the three selected settings of each arm are trained
    once for 3 epochs on a synthetic graph with the entity, relation and triple counts of the largest
    held-out graph, and the peak memory is recorded. No held-out graph is trained or read before the
    freeze beyond its size counts. A peak above 3.5 GB is reported to the coordinator before the freeze.

80. One held-out run, enforced by code. In real mode `item27.py` and `heldout.py` refuse every path
    override. The freeze record carries a digest of the tables it was computed from. At the freeze the
    coordinator writes the record's sha256 and time into `progress.jsonl`; `heldout.py` refuses to start
    unless the record matches that value, and refuses a second run once a hand-off exists. A test mode
    never reads a real table and never writes under `train/stageB`, `train/selectB` or `train/heldout`.

Rulings 81 to 88 (copied word for word from `orchestrator/coordinator-rulings-81-88.md`, sha256 b76cf1bd29e90f70528175d73f8ee9c9954ec8daa1ce2f22110290b271fd69fa):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_81_88`), while stage B was training and before any stage-B or held-out score had been read
(`train/selectB` and `train/heldout` did not exist). Source: `orchestrator/scoring-delta-review.json`
(four lenses, a refuter for each, an independent re-run of the tests, a critic; verdict "ready with
conditions"). These go to the end of section M word for word.

81. Held-out mounts, ruling 78 corrected. The second sentence of ruling 78 ("Nothing from a later
    commit is mounted ...") is withdrawn: it cannot hold when one container serves all 70 held-out
    parents, because the graph and the facts of a later held-out parent hold the changes of earlier
    held-out task commits (54 of the 70 exported histories name another held-out parent). In its place:
    the held-out container mounts only an exact list of (host folder, destination) pairs written in
    `leak_audit.py`: the lane's code and freeze record, `export/`, the staged facts and source store of
    the 70 held-out parents, the shared harness code, the frozen primary's options record and the task
    list. The audit fails on any other mount, on a mount of a folder that contains an allowed one, and
    on a per-commit folder under a mount that is named for a commit that is neither a tuning parent nor
    a held-out parent of the plan. The protection against truth from a later parent is per task, not per
    mount: a task is served only by the model trained on its own parent's graph (s = 1); candidates,
    comparators and packs are keyed by the task's own parent; and the audit shows for every task that
    the checkpoint used is its parent (ruling 60), that nothing was folded in (ruling 65) and, through
    the grader, that the task commit is not in that checkpoint's history (ruling 73). One container per
    parent is not built: that driver path would run for the first time in the single held-out run.
    AUDIT.md states all of this, with the count of histories that name another held-out parent, beside
    the sibling-seed disclosure (the task rows of one parent together list most of that commit's
    changed files; ranking a task reads only its own row).

82. The digest of the tables (ruling 80 and must-fix 4, which the current digest does not meet: it
    covers only `_meta.json`). The digest is the sha256 over, in a fixed order, the bytes of `plan.json`
    and, for every planned (arm, configuration, seed), the decompressed bytes of its pool table and of
    its unrestricted table and the bytes of its counts file. The end-of-run procedure assembles every
    set again from its parts before the digest is taken (no set is skipped because it was assembled
    before) and writes the digest into its PASS line. `selectB.py`, `report.py`, `answer_level.py`,
    `item27.py` and `heldout.py` compute it again from the files they are about to read or rely on and
    refuse on a difference; `choices.json`, `tune.json` and the freeze record carry it.

83. The ruling-58 guard also covers `selectB.py` and `report.py` themselves. Neither runs on real
    tables unless RUNLOG holds the sha256 of its current bytes and, after that line, a PASS line for its
    own tests on those bytes. Their outputs record the script's sha256, the plan hash and the digest of
    ruling 82; the freeze record's code list includes `report.py`; `write_result.py` refuses an input
    that lacks these fields or carries a test flag.

84. Freeze pins and path overrides. The freeze record pins by sha256 every file the held-out training
    and ranking read besides the graphs and facts: the code list, `train/stageA_configs.json`,
    `eval/evalcore.py`, the task list (ruling 80), the shared harness files and the primary's options
    record; `heldout.py` checks them at every start. It also carries the sha256 of the tuning inputs its
    figures came from (`eval/tune_tasks.jsonl`, the comparator tables and the candidate files). In real
    mode `selectB.py`, `report.py`, `item27.py`, `answer_level.py`, `heldout.py`, `leak_audit.py` and
    `write_result.py` refuse an `EMB_ROOT` that is not the lane's own folder and every other environment
    override of an input or output path.

85. Order of work and the code freeze. The lane writes one numbered order,
    `orchestrator/END-ORDER.md`, and follows it step by step; the coordinator accepts it before stage B
    ends. It holds at least, in this order: (1) the end-of-run procedure; (2) the card window of ruling
    86 and any fix it forces, then every test rerun on the final bytes, then the interface rehearsal:
    the lane's test hand-offs (tuning form and held-out form, built from tuning data, test flag set) go
    to the grader in test mode and its returns go through `write_result.py` in test mode; (3) the code
    freeze: the lane lists the sha256 of every script, test and input file a later step reads, and the
    coordinator writes the sha256 of that list into `progress.jsonl`; from then on no listed file
    changes without a coordinator ruling recorded there; (4) `selectB.py`, then `report.py`; (5) the
    tuning hand-off and the grader's tuning check of ruling 88, with its answer back; (6) `item27.py`
    and the coordinator's anchor line (ruling 80); (7) the staging and its check, then the single
    held-out run; (8) the hand-off's hashes to the coordinator, who passes them to the grader; the
    grader's scoring; (9) the leak audit with the containers' mount records, item 22, `write_result.py`,
    AUDIT.md and CLAIMS.md; (10) the independent audit and the refuter. If the held-out run stops on a
    code defect after the freeze, the lane changes nothing and reports. The coordinator may then rule a
    fix; the record is written again with the same arm, configuration, w, epochs and tables digest, the
    coordinator anchors it naming the record it replaces, both records and every log are kept, and the
    result says so. A change of the chosen arm, configuration, w or epochs after the first anchor is
    never allowed.

86. The card window (rulings 79 and 67 applied; it comes after stage B has left the card and before the
    code freeze). (a) The ruling-79 probe runs on the card under the 4 GB cap and records, for each of
    the fifteen settings, the container's peak memory, the process's peak memory and the card's peak
    reserved memory against its total. One further probe process runs the whole unit path (train, score,
    assemble, rank, pack) on synthetic tasks for the setting with the highest peak. A container peak
    above 3.5 GB or a card peak above 10 GB is reported to the coordinator before anything else runs.
    (b) A rehearsal of the held-out driver in test mode: three tuning parents (the smallest, one without
    a co_changed fact, the largest), the GPU image, the card, the 4 GB cap, test records for E4 (c13 or
    c16, deterministic), for E5 and for one of E1 to E3, a `docker stop` in the middle of a unit followed
    by a relaunch, and a stopped leftover container before a launch. It writes only under a scratch
    folder and reads no real table and no held-out graph. Its logs are kept and listed in AUDIT.md,
    which also names what it cannot cover: the real record and anchor, the 70 real graphs, wall time.

87. Deterministic E4 for c13 and c16. Ruling 67's premise was measured for c12 only; c13 and c16 have
    run on the card for three epochs, never with the deterministic flags. Before stage B reaches E4,
    c13 and c16 each train the smallest tuning checkpoint at seed 1 twice on the card with ruling 67's
    flags, in one test container named `kge-P1` (the guard gives way to it and relaunches stage B when
    it is gone), for at most 15 minutes, writing only under a scratch folder. A missing deterministic
    kernel, or two runs of one setting that differ, is reported to the coordinator at once, because the
    first would stop every E4 unit and neither assemble nor the held-out driver has a path for E4 in its
    earlier form. If both settings repeat byte for byte, the last sentence of ruling 67 lapses and E4 is
    deterministic everywhere.

88. The grader. (a) Its scorer is written and tested, and the sha256 of its files is recorded by the
    coordinator, before any real hand-off exists. (b) The tuning hand-off also carries every variant's
    pool ranked list. Before the item-27 freeze the grader, with truth it derives itself by item 4's
    rule, computes the late-50 tuning rank metrics from the hand-off (per seed, seed mean and
    comparators, both scopes, four metrics) and the coordinator compares them with the lane's
    `tune.json` to 1e-9; a difference stops the work until it is explained. (c) The resampling unit on
    held-out is the task commit (75), taken from the grader's sealed records, as on tuning. (d) On
    held-out the grader also returns, as description and without any word of section G, the paired
    difference with its 95 % percentile interval (by commit, 10,000 resamples) of the arm fused minus
    RRF and of the arm alone minus RRF, seed mean, for P@10 on both scopes and for the answer-level
    measure. (e) The grader takes the freeze hash and the hand-off's hashes from the coordinator, not
    from a file the lane can write, and refuses a hand-off that differs. (f) One naming for the seed
    mean in both splits: `<ARM>_<KIND>_mean`. The grader writes its returns (aggregates only, finite
    numbers, no per-task figure and no reference content) under the lane's `grader-returns/` folder,
    which only the grader writes. (g) Beside item 7's stored figures the result says that the embedding
    lists rank code files only and were packed by an adapter, so those figures are context and not a
    like-for-like comparison; the like-for-like comparison is with RRF, PPR, CO and DIR packed the same
    way.

Ruling 89 (copied word for word from `orchestrator/coordinator-rulings-89.md`, sha256 ce8df273dd6d2b403d77ef8c23a4b451c96de5e06e3bf9bf77a344415ec2350f):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_89`), while stage B was training and before any stage-B or held-out score had been read. Found
by the coordinator when capturing the live container's mount record. It goes to the end of section M
word for word.

89. Ruling 72's first sentence, corrected as ruling 81 corrected ruling 78. The stage-B container
    mounts `eval/` and `export/` read-only and `train/` (its `docker inspect` record taken on
    2026-11-14 at 19:09Z is `orchestrator/kge-B1-inspect-20261114T190928Z.json`, sha256
    052cbfa0ec863e3bb9e2069e99eb97b58a358cb53ded44f803d73dde8d4235e6; the guard's run line is the same
    for every launch). `export/` also holds the exported graphs of the 70 held-out parents, and those
    graphs contain the changes of held-out task commits. So held-out material was mounted in a training
    container from the first stage-B unit on. That cannot be undone, and moving the folders during the
    run would put the run at risk for a protection that could only be partial. The rule that holds is
    per use: stage B loads a graph only for a checkpoint of the plan; every part's meta names its
    checkpoint; the audit fails if any of the 2,385 parts names a checkpoint that is not one of the
    plan's 53 tuning checkpoints, or if the frozen stage-B code opens a graph folder by any other key.
    The same rule covers every later scoring container that mounts `export/`. AUDIT.md states this
    beside ruling 81's disclosure, as a limit of the isolation and not as a clean pass, and the
    independent audit checks it from the parts and from the code.

Rulings 90 and 91 (copied word for word from `orchestrator/coordinator-rulings-90-91.md`, sha256 ff65ed637766a74efc171a4c74e31e2a0e6c1a4a3fd95ca2443735a635550cfc):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_90_91`), while stage B was training and before any stage-B or held-out score had been read.
The coordinator read `train/stageB.py` lines 126-181 and `export/checkpoints.py` lines 96-175 before
ruling 90. These go to the end of section M word for word.

90. Ruling 89's last condition, narrowed. The frozen stage-B code opens the held-out parents' folders
    in one place: when the plan is written, `make_plan` calls `checkpoints.assignment_m('heldout', ...)`,
    which reads each held-out parent's `ancestors.txt` (the commit ids in its facts history) and
    `sizes.json` (counts) to put the held-out assignment and lag into the plan under rulings 49 to 52.
    That is by design: the plan hash then fixes the held-out assignment before any unit trains. It ran
    once (`make_plan` returns the stored plan when `plan.json` exists). No triple, path or co-change
    pair is read there, and no training or scoring path of stage B opens a held-out parent's folder.
    The audit lists this site by file and line under its own name and does not fail on it; it fails on
    any other read of a graph folder that is not keyed by a checkpoint of the plan.

91. Tasks absent from a table (must-fix MF-13, made exact). For the fused variants and for RRF, PPR and
    DIR every late-50 task must have rows in the table, and `answer_level.py` refuses otherwise. For CO
    and for an arm alone a task may be absent only when the method scored no candidate for it: for CO
    when the comparator's own candidate file shows no co-change candidate, for an arm alone when the
    set's counts file shows no scored candidate for that task. A task that is absent although its
    counts show a scored candidate is refused. Such a task is ranked by the fixed tie-break alone, as
    the evaluation code does everywhere. The number of absent tasks per variant is written into the
    hand-off and shown in the result beside that variant's figures.

Ruling 92 (copied word for word from `orchestrator/coordinator-rulings-92.md`, sha256 50fa2ab89f64366d144fd525b4d80f8f0e0ce5b0faefd51af91bedf30a327275):

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_92`), while stage B was training and before any stage-B or held-out score had been read. It
goes to the end of section M word for word.

92. Disk lines (ruling 70 amended). Measured on 2026-11-14: free space on drive C: fell from 25 GB at
    15:24Z to 17.1 GB at 20:48Z, about 1.5 GB an hour, while the files written under the user's
    folders in the last three hours add up to under 1 GB, Docker's data file did not grow and the
    stage-B folder holds 31 MB. The loss is outside this measurement and outside what this session can
    see or stop (it has no administrator rights). At that rate the 10 GB stop line is reached about
    five hours before stage B ends, and a stop there protects nothing: the run writes almost nothing,
    so stopping it frees no space. The stage-B guard therefore starts with at least 6 GB free and
    stops under 5 GB, and the container's own line (`STAGEB_MIN_FREE_GB`) is 5. The lane restarts the
    guard once with these values; the unit in flight is redone and nothing finished is lost. Under
    5 GB the run still stops before a full disk can tear a file, and every part is validated before
    it is reused. The held-out run and every later step keep ruling 70's lines unless the coordinator
    rules again.

Ruling 93 (copied word for word from `orchestrator/coordinator-rulings-93.md`, sha256 9cc47d22d97d082becb99e6d978114ecefb9700c70576d9c74642e3dbb2c5feb):

Ruled by the coordinator on 2026-11-14 at about 22:10Z (03:10 local on 15 November; file hash and exact
time are in `progress.jsonl`, line `rulings_93`), after a hard reset of the PC, while stage B was
stopped by that reset, and before any stage-B or held-out score had been read. It goes to the end of
section M word for word.

93. Ruling 92 is withdrawn on the owner's instruction. He freed space on 2026-11-14 at about 21:40Z
    (drive C: has 141 GB free) and wrote after the reset that the lowered disk floor and the other
    measures taken for the shortage are no longer needed. Stage B restarts under the original guard,
    `orchestrator/guard-stageB.sh` (sha256
    59d3fb8e0eecf35d1490b10405ccafa12a35a101e37d0c3349ed89c0884a41e3), with ruling 70's lines: launch
    at 15 GB free or more, stop under 10 GB, and 10 GB inside the container. The switch back costs
    nothing, because the reset stopped everything. The units trained under the ruling-92 guard between
    20:57Z and 21:41Z on 2026-11-14 stand: the guard's disk lines touch no result, and image, cap,
    mounts and runner string were the same. The request to keep test outputs small is lifted as well.
    For the record, Windows' own log names what took the space: shadow copies of drive C: (Volsnap
    event 33 at 21:29:27Z, "the oldest shadow copy of volume C: was deleted to keep disk space usage
    for shadow copies below the user defined limit").

Ruling 94 (copied word for word from `orchestrator/coordinator-rulings-94.md`, sha256 bdb02aac7d7c6201ffb7457452a72ad6e074f954535cfb7c2b77d77b640a50a3):

Ruled by the coordinator on 2026-11-14 at about 23:05Z (file hash and exact time are in `progress.jsonl`,
line `rulings_94`), while stage B was training and before any stage-B or held-out score had been read.
Source: `orchestrator/end-order-review.json` (finding rulings:F1, confirmed by its refuter). It goes to the
end of section M word for word.

94. Mounts of the end sequence's containers (ruling 72 applied to END-ORDER.md). As written, the launcher
    of the real steps mounts the whole repository, with its history, and the whole facts cache into every
    container. The history and the later facts hold what the held-out commits changed. Unlike `export/` in
    stage B (ruling 89) this has not happened yet and can still be done right. So: (a) the containers of
    the card window and of steps 4 to 8 (the probe, the rehearsal, the re-run check, selectB, report, the
    tuning hand-off, item27, the held-out run and both pre-checks) mount neither the repository nor the
    whole facts cache. (b) The tuning hand-off mounts a staging of the facts and the source store of the
    late-50 tuning parents only, built and hashed before the code freeze like the held-out staging; its
    manifest is in the freeze list and is verified before use. (c) Only containers that run after the
    grader has returned the held-out result may mount the repository's history and the whole facts cache,
    and only the leak audit does: it has to read history to do its work. The result writer and the
    audit writer mount the deliverable folder and the protocol file, not the repository. (d) Each step
    has a fixed list of allowed (host folder, destination) pairs in the launcher. (e) The mount record
    (`docker inspect`) of every container of every step, tests excluded, is saved, passed to the leak
    audit and listed in AUDIT.md; the audit fails if a container of the card window or of steps 4 to 8
    has a mount outside its step's list. (f) `export/` stays mounted where a step needs the graphs, under
    ruling 89's per-use rule, and AUDIT.md says so.

Ruling 95 (copied word for word from `orchestrator/coordinator-rulings-95.md`, sha256 b66c5cf662e1791281acd8c94cffae98e84389f1d652cfabdb2d0f4d01ef500c):

Ruled by the coordinator on 2026-11-15 at about 01:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_95`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane (`r58c/B/CONFLICTS.md`, note 9). It goes to the end of section M word for word.

95. Ruling 94(e), made exact. The leak audit runs before item 22, the result writer and the audit
    writer, and its output is an input of the last two, so their mount records cannot exist when it
    runs. Point (e) therefore reads: the mount record (`docker inspect`) of every container of the end
    sequence, tests excluded, is saved. The records of the containers that ran before the leak audit
    (the card window and steps 4 to 8) are passed to it, and the audit fails if one of them is missing
    or shows a mount outside its step's list. The records of the containers that run after it (item 22,
    the result writer, the audit writer) are saved in the same way and listed with their sha256 in
    AUDIT.md by the audit writer, except its own, whose record and launcher line the coordinator's
    independent audit of step 10 checks against the launcher's fixed list. The fail clause of ruling 94
    is unchanged.

Ruling 96 (copied word for word from `orchestrator/coordinator-rulings-96.md`, sha256 1342ccfb127189b0ccc113f34d5548796228c7bd2ec72807da12e0b765b5d994):

Ruled by the coordinator on 2026-11-15 at about 03:00Z (file hash and exact time are in `progress.jsonl`,
line `rulings_96`), while stage B was training and before any stage-B or held-out score had been read.
Raised by a grader-side check of the answer seeds (`build/sealed/grader/embeddings/coordinator/seed-precheck.json`).
It goes to the end of section M word for word.

96. Kinds seen only in held-out graphs. This is an exception to ruling 79's "beyond its size counts",
    made by the coordinator and limited to names: from the exported graphs the coordinator read only
    the sets of relation names and of node-kind, area and code-flag values per parent, no triple and no
    path. Result: the held-out parents' graphs hold one relation type and two node kinds that no tuning
    checkpoint has, in 69 of the 70 parents (37 relation types against 36); the area and code-flag
    values are the same. A model or a ranking step that meets a relation or a node kind it has never
    been run on could fail in the single held-out run, where a code fix has no path after the freeze.
    Therefore: (a) the rehearsal of ruling 86(b) also trains and ranks, for every arm's selected
    settings, on a copy of a tuning graph into which one relation type and two node kinds with made-up
    names are injected (non-code nodes of area `other`, tied to existing code entities by the new
    relation), and the ruling-79 probe's synthetic graph carries 37 relation types; (b) the lane is
    told that such kinds exist and how many, not their names, and reads no held-out graph for this;
    (c) the result names it as a difference between the splits: the held-out graphs carry a layer the
    tuning graphs lack, so the settings were chosen on graphs without it.

Ruling 97 (copied word for word from `orchestrator/coordinator-rulings-97.md`, sha256 4a3efb27e8063fe138d425ce9fb2a6e7b11217e1fb6fc212730bc2cc15d7d33b):

Ruled by the coordinator on 2026-11-15 at about 03:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_97`), while stage B was training and before any stage-B or held-out score had been read.
Source: `r58c/closed-lists/FINDINGS.md` (sha256 c3e6211e0ea7091f627e1c3ca4d86d23d9941dba82e192083e6f1341beacbf8f).
It goes to the end of section M word for word.

97. The new layer of the held-out graphs: what was read, and what follows.
    (a) Ruling 96's exception is extended by one step, again by the coordinator only: per held-out
    parent, the number of triples of the new relation and the kinds of their two ends, as counts by
    kind; no path and no pair. Found: between 0 and 90 such triples a parent (median 46; one parent has
    none); each runs from a new node to an existing entity, four in five of them to a file and the rest
    to symbol-level and other non-file entities; every new node carries a path, a file at the
    repository root outside the three code areas, so its area is `other` and it is not a code file. The
    relation's name has no tab or newline and does not end in `__inv`. The lane gets these counts and
    kinds and no name.
    (b) No frozen stage-B code changes. The audit found no closed list of relations or kinds and no
    crash on a new one; what changes on held-out is E5's routing as coded: a file seed tied to the new
    nodes can get the `other` specialist as its second one, and that specialist is skipped where it has
    no co_changed fact. This is item 13's rule applied to a graph with a new layer, not a defect. If E5
    is the arm frozen for held-out, the audit reports, computed after the run with `kge.py`'s own
    routing function, on how many held-out tasks the second specialist was `other` and on how many a
    specialist was skipped; RESULT.md's limits name it in either case.
    (c) The ruling-79 probe draws its 37th relation as edges from non-code `other` nodes to code
    entities, mostly files, with the counts of (a), not as random pairs.
    (d) On held-out the candidate pool and the simple rankers run on a file-collapsed graph in which
    the new nodes are merged into one non-code file node that links the files they point to. Pools on
    held-out are therefore wider, for every method alike. RESULT.md says so and shows the median pool
    size of the late 50 beside that of the held-out tasks.
    (e) The injected graph of ruling 96(a) follows (a): new nodes with a root-level non-code path, area
    `other`, tied mostly to files and partly to symbol-level and non-file entities, about fifty edges;
    one of the rehearsal's graphs has a checkpoint whose `other` specialist has no co_changed fact.

Ruling 98 (copied word for word from `orchestrator/coordinator-rulings-98.md`, sha256 5e4faaa012841796a51991b8056a114c2e9997d3290125f75916f24df8d8362f):

Ruled by the coordinator on 2026-11-15 at about 06:10Z (file hash and exact time are in `progress.jsonl`,
line `rulings_98`), while stage B was training (2,107 of 2,385 units done, 279 left, all of them E4 c13
and c16) and before any stage-B or held-out score had been read. It goes to the end of section M word for
word.

98. The cap of the remaining stage-B units is 4 GB (item 2's maximum; ruling 43's 2560m is amended for
    them). Measured on 2026-11-15: the container ran E4 c12 (159 units) and the first 39 units of c13 in
    one process and was then killed by the kernel at the 2560m cap (exit 137) at 05:55:39Z; each
    relaunch since has finished exactly one unit and been killed about twenty seconds into the next
    (05:59:07Z, 06:02:32Z), because the process still holds the first model's memory when the second is
    built on the larger checkpoints. At one unit per launch the 279 units left would take about sixteen
    hours, and a launch that finished none would stop the guard. The cap changes no result: it limits
    memory, not arithmetic; E4 is deterministic (rulings 67 and 87), and the re-run check of the end
    order trains one c13 and one c16 unit again in a fresh process and compares them byte for byte with
    the parts made under either cap. The guard script is not edited: its cap is read from the
    environment, so the same file (sha256 59d3fb8e...) is started with the cap set to 4g, and its start
    line records it. The guard's memory and disk lines are unchanged. AUDIT.md lists which units ran
    under which cap, from the guard log, and the result's limits carry this ruling beside ruling 43.
    If the container is still killed under 4 GB, the lane reports and changes nothing further.

Ruling 99 (copied word for word from `orchestrator/coordinator-rulings-99.md`, sha256 6813a1e87857a2f08c5ff7f00f24396f0ab4544c7146efa31f1639fb15540e35):

Ruled by the coordinator on 2026-11-15 at about 06:20Z (file hash and exact time are in `progress.jsonl`,
line `rulings_99`), while stage B was training and before any stage-B or held-out score had been read.
The lane's agent A found the discrepancy. It goes to the end of section M word for word.

99. Correction. Rulings 96 and 97 give the relation types as "37 against 36". The right figures are 36
    against 35, the changed-together relation included in both: the tuning checkpoints hold 35 relation
    types between them, the held-out parents 36 (69 graphs hold 36 and one holds 35), and the largest
    held-out graph holds 36, as its size file says. The coordinator's count read the header line of the
    triples files as one more relation name. The coordinator's note to the lane that the size file
    leaves the changed-together relation out was also wrong; it counts it. Nothing else in rulings 96
    and 97 changes: one relation type and two node kinds exist only in held-out graphs, in 69 of the 70
    parents; the counts of that relation's triples and of the kinds at their ends were taken per line
    and are not affected. Where ruling 96 says the probe's synthetic graph carries 37 relation types,
    read 36.

Ruling 100 (copied word for word from `orchestrator/coordinator-rulings-100.md`, sha256 b9ef4de768f204960e2bd2ae1ef38e797227c3bcca694bccebb6827fdde8cde5):

Ruled by the coordinator on 2026-11-15 at about 07:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_100`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane. It goes to the end of section M word for word.

100. The container of the re-run check (END-ORDER step 2c, `kge-R1`) runs under a 4 GB cap and starts
     under ruling 79's rule (three samples, 6 GB free, commit under 38 GB). Reason: ruling 98. The last
     stage-B units of E4 c13 and every unit of c16 were made under 4 GB, and no c16 unit has ever run
     under 2560m, so a kill there would stop the check for a reason that has nothing to do with what it
     tests. Each picked unit still trains in a fresh process, E4 deterministic, and the check compares
     bytes, which a memory cap cannot change. The card window has no other training container beside it.

Ruling 101 (copied word for word from `orchestrator/coordinator-rulings-101.md`, sha256 bb53d64974aeb6082e74b8d037f6455e5180550cc22e2c266a219444316fc450):

Ruled by the coordinator on 2026-11-15 at about 07:45Z (file hash and exact time are in `progress.jsonl`,
line `rulings_101`), while stage B was training (about 150 units left) and before any stage-B or held-out
score had been read. Source: `orchestrator/final-reread.json` (five lenses, a refuter for each, a critic;
advice "accept after changes"; its changes C1 to C17). It goes to the end of section M word for word.

101. Five decisions the last re-read needed.
     (a) Graph files for three steps (ruling 94(f) applied). The tuning hand-off (ktest-r4) and its
     pre-check (ktest-r8) read graph files of the late-50 tuning parents, and the pre-check of the
     held-out hand-off (ktest-r9) reads graph files of the 70 held-out parents and the task list. Each
     of the three mounts, read-only, only the files it reads, named in its mount list and in the leak
     audit's allow-list; none mounts `export/` whole. For ktest-r9 this is after the held-out run and
     is a check of the hand-off, not training or ranking. The time and peak memory of the tuning
     hand-off are measured again under ktest-r4's exact list.
     (b) The leak audit classifies the mounts of the containers it has to judge and of the listed truth
     locations, and lists every other mount row by name without walking it.
     (c) A container of the held-out run or of the re-run check that is killed for memory (exit 137)
     is a stop that is not a code defect: the same command is run again and finished units are kept.
     A launch that finishes no unit is reported to the coordinator before another try. The ruling-79
     probe also trains three units in a row in one process for the setting with the highest peak,
     since stage B showed that memory builds up across units of E4.
     (d) If the end-of-run procedure finds a quarantined unit, the lane restarts the guard through
     `orchestrator/start-guard-r98.sh` (the 4 GB cap of ruling 98), and the guard's start line must
     read "cap 4g".
     (e) The container of the end-of-run procedure gets a mount list like every other step's and its
     mount record is saved before it is removed. The stage-B container's second mount record, taken by
     the coordinator under the 4 GB cap (`orchestrator/kge-B1-inspect-20261115T073116Z.json`, sha256
     cfc3cb7d79d20236f7d08a335a7771b6aea402de3267c12cca6afffbfb72f990), joins the first in the freeze
     list and in the audit's inputs.

Ruling 102 (copied word for word from `orchestrator/coordinator-rulings-102.md`, sha256 155e3282c938245507c6db8f50df65e76417d0e15d066d6e4dbefaaed7015c4b):

Ruled by the coordinator on 2026-11-15 at about 08:05Z (file hash and exact time are in `progress.jsonl`,
line `rulings_102`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane (`r58c/B/CONFLICTS.md`, note 31). It goes to the end of section M word for word.

102. Ruling 101(a), amended. One mount row per file does not fit the Windows command line (its limit is
     32,767 characters; 210 rows for the held-out pre-check come to about 60,000). The three steps
     therefore mount, read-only, one row per parent folder, `export/graphs/<P>`, for the parents the
     step concerns and no others: the late-50 tuning parents for the tuning hand-off (ktest-r4) and its
     pre-check (ktest-r8), and the 70 held-out parents, with the task list, for the pre-check of the
     held-out hand-off (ktest-r9). The other files of such a folder (that parent's own list of
     ancestors, its sizes and its triples) belong to the same parent and are not read by these steps.
     None of the three mounts `export/` or `export/graphs` whole, so the tuning hand-off never has a
     held-out parent's folder. The parent set of a real step comes from the plan (the late-50 tuning
     parents; the plan's held-out assignment), never from the hand-off being checked; the leak audit
     compares each saved mount record with those sets. A test run of the same step uses the same
     generator over its test set's parents and is marked as a test.

Ruling 103 (copied word for word from `orchestrator/coordinator-rulings-103.md`, sha256 bf8eb944fd524e2bf206d09442897e25175a8d9c47c1111d36fcefefca7e0c86):

Ruled by the coordinator on 2026-11-15 at about 09:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_103`), after stage B ended (2,385 of 2,385 units, none failed) and before the end-of-run
procedure, any selection, any report and any held-out score. Raised by the lane (`r58c/B/CONFLICTS.md`,
notes 32, 33 and 34) and by the coordinator's own read of END-ORDER revision 2a287f0f. It goes to the end
of section M word for word.

103. Four decisions.
     (a) The memory line of the re-run check (note 32). In the container of the re-run check
     (`kge-R1`) a container reading above 3.5 GB is written to the log and reported to the coordinator
     after the check ends; it no longer stops the container. The 4 GB cap, the 10 GB card line, the
     time limit and three low host samples still stop it. Reason: the 3.5 GB line of ruling 86 was a
     report line for the probe, a warning about the held-out run's cap. Stage B's training log shows
     E4's process reaching a peak of 3,199 MB (in c13, and unchanged through every c16 unit, all under
     the 4 GB cap), and a fresh c13 process starting near 2,050 MB; c16 was never measured in a fresh
     process. A container that holds such a unit, the driver and file cache can read above 3.5 GB
     without being near a kill, because the kernel drops file cache first. The cap bounds the container
     whatever the line does, and the check compares bytes, which no memory line can change. The probe's
     own report line (ruling 86(a)) is unchanged.
     (b) The test runs of the three graph steps (note 33; the last sentence of ruling 102 is amended
     for `ktest-r9`). A test mounts file may differ from the step's real entry only in the rows named
     here, and the test's log prints the difference row by row. For `ktest-r4`: the fake stage folder
     read-only and one writable test folder outside the real output folders, in place of the step's
     real writable row. For `ktest-r8` and `ktest-r9`: the test hand-off folder read-only. For
     `ktest-r9`: graph rows of tuning checkpoints only, seventy of them (the 53 folders of
     `export/graphs` and 17 of `export/graphs0`), so that the test line has the real line's row count
     and length. No test mounts a held-out parent's folder, and no test mounts or creates a real output
     folder. The real `ktest-r9` list is also built once on the host before the freeze (the flag
     builder alone, no container; the list has no writable row) and its length is logged.
     (c) The end-of-run container and the leak audit (note 34). The leak audit judges the mount record
     of the end-of-run container (step 1) as it judges those of the card window and of steps 4 to 8: a
     missing record, or a mount outside its list, fails the audit; if step 1 ran more than once, every
     kept record is judged. Reason: that container writes the tables every later step reads.
     (d) No test creates a real output folder. On 2026-11-15 at 08:13:01Z a test path created the
     empty folder `train/selectB`: the flag builder (`r58c/B/mounts.js`) creates every writable source
     when it builds a step's flags, also when a test asks for them. The folder held no file at either
     time the coordinator looked (09:04Z and 09:14Z). The lane removes it with `rmdir`, which refuses a
     folder with content, and records that. From now on a writable source is created only by a real
     launch. A test that asks for a step's list gets no folder created, and a row whose source does not
     exist is left out of the test container and named in its log. The freeze-list script refuses when
     a real output of steps 4 to 9 already exists: `train/selectB`, `train/heldout`,
     `train/leak_audit`, `train/report/answer_level`, `train/report/e5_route`,
     `train/report/tune.json`, `train/report/item22.json`, or a real grader return.

Ruling 104 (copied word for word from `orchestrator/coordinator-rulings-104.md`, sha256 37e9653816754bbc03c76be6ac40f424eaf9286571ae0aac7c42ec356e2b4829):

Ruled by the coordinator on 2026-11-15 at about 09:54Z (file hash and exact time are in `progress.jsonl`,
line `rulings_104`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Source: `orchestrator/precheck-result.json` (five lenses over a copy of the lane's
code, order and tests taken at 09:24:35Z, a refuter for each, a critic; advice "accept after changes";
seven changes that must be made and twelve smaller ones), each of the seven checked by the coordinator
against the bytes. It goes to the end of section M word for word, before the code freeze.

104. Seven decisions.
     (a) The tuning staging comes earlier. Items 4 and 5 of END-ORDER 2f (the tuning staging and its
     check) run after the card window and before the test run of `ktest-r4` in 2d. That test run mounts
     the staging read-only through the step's own two rows; it is the only use of the tuning staging
     before step 5. Reason: otherwise the staged facts and code are first read in a container after the
     freeze, where a gap in the staging has no legal repair. The staging holds tuning data only. If
     `train/heldout_inputs.js` or a file of the shared harness changes after it was built, the staging
     is moved aside and built again.
     (b) Correction to ruling 103(b). The test line of `ktest-r9` has at least the real line's row count
     and length, not exactly them: it carries one row more, and a `graphs0` row is one character longer.
     (c) Memory stops of the held-out run (step 7), under ruling 101(c). Three forms are a stop that is
     not a code defect: the run's rc file reads 137 (the trainer was killed by the kernel); it reads 2
     with the line "N unit(s) failed" and the error of every failed unit in the run's log is an
     out-of-memory error of the card; it reads 1 and the run's log ends with the packer's failure and
     no error text (the packer was killed). The lane reports each with the log lines, then runs the
     same command again; finished units are kept, and a launch that finishes no unit is reported before
     another try. Any other rc that is not 0, and any failed unit with another error, stops the line
     and waits for the coordinator (ruling 85).
     (d) Ruling 101(d), amended. If the end-of-run procedure finds a quarantined unit, the lane reports
     to the coordinator before it restarts the guard. The coordinator takes the mount record of the new
     stage-B container while it runs and rules how it joins the audit's inputs.
     (e) The medians of ruling 97(d). Each median is taken over the tasks that have a pool count; the
     number of tasks without one (an unscored seed, or no candidate) is recorded per split beside it.
     (f) The lane's `progress.jsonl` between the two writers. From the start of step 9.3 to the end of
     step 9.4 nobody appends a line to it, the coordinator included: the result writer records the
     file's hash and the audit writer checks it. If a line is appended in between, step 9.3 runs again
     before step 9.4.
     (g) The coordinator's own audit (step 10) checks the mount records of the leak audit's container
     and of the three containers that run after it (item 22, the route audit, the result writer)
     against their lists, as it does for the audit writer's. The leak audit does not judge its own
     record, and ruling 95 only lists the other three.

Ruling 105 (copied word for word from `orchestrator/coordinator-rulings-105.md`, sha256 f983f0dfa82a12d24338605a40fd7151d71e1cbad3d0453f5bab30eaf89c4515):

Ruled by the coordinator on 2026-11-15 at about 09:58Z (file hash and exact time are in `progress.jsonl`,
line `rulings_105`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Raised by the coordinator: no script of the lane checks that a loss or a score is
a finite number, and a model whose training diverged would give rankings in an arbitrary order without
any step failing. It goes to the end of section M word for word, before the code freeze.

105. Values that are not finite numbers.
     (a) What was looked at. On 2026-11-15 the coordinator scanned the loss list in every stage-B part
     (2,385 parts; training losses only, no score): no loss is anything but a finite number, no list ends
     above one and a half times its start, and the 45 parts without a list are the untrained ones (the
     checkpoint with no co_changed fact, three seeds, fifteen settings).
     (b) Tuning. After step 1 and before the freeze the coordinator counts, in the assembled stage-B
     tables, the score rows whose score is not a finite number. It is a count per table; no score value
     is read out or kept. A count that is not zero stops the line until the coordinator has ruled.
     (c) Held-out. After the held-out run, and before the hashes go to the grader, the coordinator takes
     the same count over the held-out parts and tables and over the loss lists of the held-out units. A
     count that is not zero changes nothing in the run: the ranking stands as the frozen code made it,
     the grader gets the hand-off as it is, and the result states the count with the seeds and parents
     it touches. This is fixed now so that it is not decided after a result is known.

Ruling 106 (copied word for word from `orchestrator/coordinator-rulings-106.md`, sha256 7de7c8a8029f97ec18698cee0a167fd5ab74d549295c767b21df419aeaf24fc5):

Ruled by the coordinator on 2026-11-15 at about 11:39Z (file hash and exact time are in `progress.jsonl`,
line `rulings_106`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Source: `orchestrator/delta-check-result.json` (four lenses over the bytes changed
between 09:24:35Z and the lane's revision of 11:14Z, END-ORDER ad45731a; a refuter for each, a critic;
advice "accept after changes"), the lane's notes 35 to 38, and what the coordinator found itself. END-ORDER
ad45731a is not accepted. It goes to the end of section M word for word, before the code freeze.

106. Six decisions.
     (a) Three more tests before the freeze (the lane's note 35(a)). Step 2d also runs
     `fixes/tests/test_r53_58_unit.py`, `fixes/tests/test_r64.py` and `fixes/tests/test_e5_equiv.py`
     once more on the final bytes. They test code that a later step runs: the selection script, edited
     on 2026-11-15, at step 4, and the scoring of the model code at step 7. The other test files that
     the lane's listing leaves out stay out for the reasons it gives.
     (b) What ruling 103(b) covers. Its sentence "no test mounts a held-out parent's folder" is about
     the test runs of the step launcher (`ktest-r4`, `ktest-r8` and `ktest-r9` run as tests). The
     ordinary test containers of both agents mount what they have mounted in every round: the export
     folder whole, the facts cache and, for agent B's, the repository, all read-only, and never
     anything under `build/sealed`. Ruling 89's per-use rule covers them: no test reads a held-out
     parent's graph or facts (ruling 96(b)), and the coordinator's audit (step 10) reads the test code
     for such a read. The gate of the step launcher's test runs refuses exact spellings only.
     Therefore, before recording the code freeze, the coordinator checks every saved record of a test
     run of the step launcher: none may show a held-out parent's folder, or a writable mount at, under
     or above a real output folder.
     (c) A log line can be lost. On this machine an append to a file from a shell loop failed 7 times
     in 233 on 2026-11-15 ("Device or resource busy"), and the lines were lost without an error. The
     lane's launchers append their log lines in the same way. Where the order names a line of such a
     log as evidence and the line is missing while the files it stands for exist, the lane reports to
     the coordinator and changes nothing: it does not interpret the log, does not run a finished real
     step again and does not write the line by hand. The coordinator decides on the files and records
     the decision. Step 1 is the exception: if its PASS line is missing from the run log, step 1 runs
     again.
     (d) No container of the order runs on without its saved mount record. A record that cannot be
     saved is tried again. If it still cannot be saved, a card check fails and nothing is launched,
     and a run that has started is stopped at once and resumed by the same command. Reason: the leak
     audit fails on a missing record, and after the held-out run that could not be repaired.
     (e) The cap at step 8. The coordinator checks that every start line of the held-out launch log
     shows the 4 GB cap, or the cap that a ruling recorded before the freeze names.
     (f) What CLAIMS.md maps. The order's sentence that CLAIMS.md maps every claim of RESULT.md is too
     wide. The lines with the held-out differences to RRF and their intervals, the literal check and
     the grader's totals are carried as text, without a pointer into the grader's return. The order
     says so, and the coordinator's audit compares those lines with the grader's return itself. No
     claim row is added now: a new locator that has only seen the rehearsal's shapes is itself a risk
     at step 9.4.

Ruling 107 (copied word for word from `orchestrator/coordinator-rulings-107.md`, sha256 b81037b7cf4dd1ffcf6525ff9ce5385f24099f3889df74d1a3f0e90e6c8add32):

Ruled by the coordinator on 2026-11-15 at about 12:31Z (file hash and exact time are in `progress.jsonl`,
line `rulings_107`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Raised by the lane (`r58c/B/CONFLICTS.md`, notes 39 and 40) with its revision of
12:26Z (END-ORDER 9d779b5d); the coordinator read the test, its log and the guard. END-ORDER 9d779b5d is
not accepted: its list of step 2d names a test that cannot pass. It goes to the end of section M word for
word, before the code freeze.

107. Two decisions.
     (a) Note 40; ruling 106(a) is amended. One of the three tests that ruling 106(a) added,
     `fixes/tests/test_r53_58_unit.py`, fails on the final bytes in one of its four cases. That case
     writes run-log lines that name made-up files, with no PASS line, and expects the selection
     script's guard to accept them. Since ruling 83 the guard requires each line to name the role's own
     file and a later PASS line whose log shows the same hash, so it refuses that case, as it should.
     The test states the guard as it was before ruling 83; the selection script is not at fault. Step
     2d therefore does not run this test. Its three other cases, which test ruling 53's choice rule,
     passed on the current bytes of the selection script (sha256 d54cb864e38f...b885) in the test
     container ktest-b112, and that log (sha256 a3392c75a594...9d15) is the record; the guard itself is
     tested on the final bytes by the tests of 2d that were written for it. If the selection script
     changes before the freeze, the lane reports to the coordinator before 2d. The other two tests of
     ruling 106(a) stay in 2d.
     (b) Note 39. The step launcher keeps an older mount record under a name made from that record's
     own time to the second, and adds no counter when the name is taken. No change: the launcher waits
     for three memory samples thirty seconds apart before every start, so two records of one container
     cannot carry the same second.

Ruling 108 (copied word for word from `orchestrator/coordinator-rulings-108.md`, sha256 be540fb9147bd188406237826cb9b90118561a1fa54974bd7e7cdb9bc8ee40c1):

Ruled by the coordinator on 2026-11-15 at about 12:53Z (file hash and exact time are in `progress.jsonl`,
line `rulings_108`), after step 1 of the accepted end order (END-ORDER 1c849061) and the first probe of
step 2a, and before the rehearsal, the code freeze, any selection, any report and any held-out score.
Source: `train/probe/probe.json` of the first probe (sha256 0c59c50a...c616; container `kge-H1P`,
12:46Z to 12:50Z under a 4 GB cap, exit 3), read by the coordinator. It goes to the end of section M word
for word, before the code freeze.

108. The cap of the held-out launcher's containers is 6 GB.
     (a) What the probe showed. One E4 unit on a graph of the size of the largest held-out graph needs
     3,509 MB in its own process (c13; c16 needs 3,382 MB; every other setting stays under 2.3 GB), and
     the process still holds 2,092 MB after the unit. The second unit in the same process was killed at
     the 4 GB cap. The card is not the limit: at most 2,638 MB of its 12,199 MB were reserved. Under
     4 GB a held-out run of E4, which trains 210 units in one process, would be killed at every second
     unit.
     (b) The decision. The three containers the held-out launcher starts (the probe, the rehearsal and
     the held-out run) run under a 6 GB cap, for every arm. This amends item 2's maximum and ruling
     79's cap for these three containers only. The re-run check keeps the 4 GB of ruling 100, and every
     other step keeps its own cap. Reason: a memory cap cannot change a result. Every unit is seeded,
     E4 runs deterministically, and the re-run check compares a unit trained in a fresh process with
     its part made in a long one. The cap is there to protect the host, which had 11.6 GB free and
     34.2 GB committed when this was ruled.
     (c) The host. Before each launch under this cap the lane takes one memory sample and starts only
     with at least 10 GB free. The launcher's own start rule and stop rule stay as they are. Below
     10 GB free the lane waits, and reports after ten minutes.
     (d) The probe is repeated under the new cap. The first probe's folder is kept, moved aside under a
     name that says what it is, and its two container records stay where the launcher keeps them. If
     the three units in a row finish, the rehearsal may start once the coordinator has seen the rows;
     if a unit is killed again, the coordinator rules again.
     (e) Where the cap is stated. The start lines of the launch logs and the saved container records
     show it, the coordinator checks it at step 8 (ruling 106(e)), and the coordinator's report states
     it. RESULT.md's limits do not name it: the result writer reads no text for it, and no listed file
     changes for this ruling.

Ruling 109 (copied word for word from `orchestrator/coordinator-rulings-109.md`, sha256 60dbdceb3ab867f148615e7382d01cc2021abba9a0a37f6b7b01a3ab3638f624):

Ruled by the coordinator on 2026-11-15 at about 14:37Z (file hash and exact time are in `progress.jsonl`,
line `rulings_109`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane: the host test
`r58c/B/tests/test_pass_paths.sh` printed RESULT FAIL in one of six checks; the coordinator read the test
and its terminal copy (sha256 18599acb...7dee). It goes to the end of section M word for word, before the
code freeze.

109. A test that fails on the machine's refusal of its own scratch file.
     (a) What happened. The test writes the output of the script under test into its own scratch file
     and then reads it. The machine refused that write ("Device or resource busy", at line 32 of the
     test), so the check read a file the script had not written, and failed. The script under test did
     not fail. The same refusal cost step 1's summary three lines and left a scratch file behind in one
     more test of 2d, which passed.
     (b) The rule, for the tests of step 2d. Where a test fails or ends with an error, and its terminal
     output shows "Device or resource busy" on the test's own scratch file or log at the failing point,
     the lane keeps the failed run's terminal copy and log, removes that test's own scratch folder, and
     runs the same test again, unchanged, up to two more times. A run that then passes counts, and the
     run log names every run with its hash. A test that fails without that message, or fails three
     times, stops 2d and is reported to the coordinator.
     (c) What does not change. No file of the order changes for this, and the rule does not reach a
     real step: a real step that fails is reported as the order says.

Ruling 110 (copied word for word from `orchestrator/coordinator-rulings-110.md`, sha256 76cd97c101fdbc4a7996adcb4ea94f5c9d681fcf8c1c491c15f5b5905d3c6c0e):

Ruled by the coordinator on 2026-11-15 at about 15:00Z (file hash and exact time are in `progress.jsonl`,
line `rulings_110`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane after the second run of
`r58c/A/test_rehearse_stop.sh`; the coordinator read the script, the test and both logs, and read every
other launcher of the order for the same form. It goes to the end of section M word for word, before the
code freeze.

110. A known defect of the rehearsal script, left as it is.
     (a) The defect. `r58c/A/rehearse.sh` writes its notes through a helper that appends each note to
     its summary file, and in two places (lines 46 and 63) the note's own success decides what happens
     next. When the machine refuses the append ("Device or resource busy", ruling 106(c)), line 46
     marks the arm as failed although the launcher did remove the leftover, and line 63 prints a FAIL
     line after the PASS line. The defect can turn a pass into a failure, or add a stray FAIL line. It
     cannot turn a failure into a pass, and the script's exit code follows its own count of failures.
     (b) What it touched. The stand-in test of this script failed once in step 2d (13:36Z to 13:38Z),
     with every expected note printed and no cause in its output, and passed when it was run again
     with nothing else running (14:56Z to 14:57Z). The second run printed both result lines, which is
     this defect at line 63. That the first failure was the same defect at line 46 fits what was
     printed; it is not proved, because the test deletes its scratch folder. The real rehearsal of step
     2b is not touched: its summary has one result line, PASS, its lines are those of its terminal
     copy, and the script exited 0.
     (c) The decision. No change. The script has done its work in step 2b and runs in no later step; a
     fix would change a listed file and reopen 2b. The coordinator read every other launcher of the
     order for the same form: in none does a log call's own success decide a branch, none stops by
     itself on a failed command, and every function whose result is tested returns its own value. The
     coordinator's report names this defect. AUDIT.md cannot: its writer reads no text for it.

Ruling 111 (copied word for word from `orchestrator/coordinator-rulings-111.md`, sha256 49325aa2422767fff5cd99e91bc5404670518b1ae0b3ab12f35458383a2f0366):

Ruled by the coordinator on 2026-11-15 at about 15:17Z (file hash and exact time are in `progress.jsonl`,
line `rulings_111`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane: `r58c/B/eor/test_end_of_run.sh`
printed RESULT FAIL (15 of 43 checks); the coordinator read the test, its fixture, both runs' output and
the state of the real lane. It goes to the end of section M word for word, before the code freeze.

111. The end-of-run test after step 1.
     (a) What happened. The test of the end-of-run script copies the lane's real run log into each of
     its trial lanes and counts the PASS lines there. Since step 1 the real run log holds step 1's own
     PASS line, so 15 of the test's 43 checks count one line too many, or read two log names where they
     expect one (step 2d, 14:59Z to 15:14Z). Every check of an exit code and of what the script did
     passed. The same bytes of the script, of the check script and of the test passed all 43 checks at
     10:44Z, before step 1, and the script's real run in step 1 passed. The failed run left the real
     lane as it was: one PASS line in the run log, the same tables digest, the same sixteen records.
     (b) The decision. The test cannot pass as it is once step 1 has run, and neither the test nor its
     fixture is changed. For step 2d it is run once more from a copy kept outside the lane's test
     files, identical except that the fixture leaves step 1's PASS line out of the trial lanes' run
     logs. If that run passes all 43 checks, it stands as step 2d's evidence for this test, together
     with the run of 10:44Z and step 1's real run. If it does not, the lane reports.
     (c) What it means later. The end-of-run script runs again only if step 1 has to be repeated before
     the freeze. The coordinator's report names this limit of the test.
