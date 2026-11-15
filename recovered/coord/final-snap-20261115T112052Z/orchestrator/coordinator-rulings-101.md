# Coordinator ruling 101, after the last re-read of the end order and the final scripts

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
