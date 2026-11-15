# Coordinator rulings 78 to 80, after the review of the scoring scripts

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
