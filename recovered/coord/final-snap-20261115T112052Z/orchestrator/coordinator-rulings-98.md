# Coordinator ruling 98, on the memory cap of the remaining stage-B units

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
