# Coordinator rulings 81 to 88, after the second review of the scoring scripts

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
