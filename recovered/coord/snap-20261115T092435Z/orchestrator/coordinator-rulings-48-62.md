# Coordinator rulings 48 to 62, after the independent pre-run review of stage B

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
