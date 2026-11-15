# Coordinator rulings 63 to 66, on the four points the lane raised with its pre-run report

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
