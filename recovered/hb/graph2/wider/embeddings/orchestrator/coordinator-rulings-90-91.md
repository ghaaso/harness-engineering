# Coordinator rulings 90 and 91, on two conflicts the lane held for a ruling

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
