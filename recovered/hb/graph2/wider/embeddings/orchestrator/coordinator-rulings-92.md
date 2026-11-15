# Coordinator ruling 92, on the disk lines of the stage-B guard

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_92`), while stage B was training and before any stage-B or held-out score had been read. It
goes to the end of section M word for word.

92. Disk lines (ruling 70 amended). Measured on 2026-11-14: free space on drive C: fell from 25 GB at
    15:24Z to 17.1 GB at 20:48Z, about 1.5 GB an hour, while the files written under the user's
    folders in the last three hours add up to under 1 GB, Docker's data file did not grow and the
    stage-B folder holds 31 MB. The loss is outside this measurement and outside what this session can
    see or stop (it has no administrator rights). At that rate the 10 GB stop line is reached about
    five hours before stage B ends, and a stop there protects nothing: the run writes almost nothing,
    so stopping it frees no space. The stage-B guard therefore starts with at least 6 GB free and
    stops under 5 GB, and the container's own line (`STAGEB_MIN_FREE_GB`) is 5. The lane restarts the
    guard once with these values; the unit in flight is redone and nothing finished is lost. Under
    5 GB the run still stops before a full disk can tear a file, and every part is validated before
    it is reused. The held-out run and every later step keep ruling 70's lines unless the coordinator
    rules again.
