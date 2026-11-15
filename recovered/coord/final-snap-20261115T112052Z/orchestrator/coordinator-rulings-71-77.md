# Coordinator rulings 71 to 77, on the seven readings the lane raised with the ruling-58 scripts

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
