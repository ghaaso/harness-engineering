# Coordinator ruling 93, withdrawing ruling 92

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
