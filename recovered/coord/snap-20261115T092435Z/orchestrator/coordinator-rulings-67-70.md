# Coordinator rulings 67 to 70: section L accepted; deterministic E4; side-by-side running; disk

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
