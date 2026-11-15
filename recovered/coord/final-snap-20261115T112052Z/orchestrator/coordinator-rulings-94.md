# Coordinator ruling 94, on what the containers of the end sequence mount

Ruled by the coordinator on 2026-11-14 at about 23:05Z (file hash and exact time are in `progress.jsonl`,
line `rulings_94`), while stage B was training and before any stage-B or held-out score had been read.
Source: `orchestrator/end-order-review.json` (finding rulings:F1, confirmed by its refuter). It goes to the
end of section M word for word.

94. Mounts of the end sequence's containers (ruling 72 applied to END-ORDER.md). As written, the launcher
    of the real steps mounts the whole repository, with its history, and the whole facts cache into every
    container. The history and the later facts hold what the held-out commits changed. Unlike `export/` in
    stage B (ruling 89) this has not happened yet and can still be done right. So: (a) the containers of
    the card window and of steps 4 to 8 (the probe, the rehearsal, the re-run check, selectB, report, the
    tuning hand-off, item27, the held-out run and both pre-checks) mount neither the repository nor the
    whole facts cache. (b) The tuning hand-off mounts a staging of the facts and the source store of the
    late-50 tuning parents only, built and hashed before the code freeze like the held-out staging; its
    manifest is in the freeze list and is verified before use. (c) Only containers that run after the
    grader has returned the held-out result may mount the repository's history and the whole facts cache,
    and only the leak audit does: it has to read history to do its work. The result writer and the
    audit writer mount the deliverable folder and the protocol file, not the repository. (d) Each step
    has a fixed list of allowed (host folder, destination) pairs in the launcher. (e) The mount record
    (`docker inspect`) of every container of every step, tests excluded, is saved, passed to the leak
    audit and listed in AUDIT.md; the audit fails if a container of the card window or of steps 4 to 8
    has a mount outside its step's list. (f) `export/` stays mounted where a step needs the graphs, under
    ruling 89's per-use rule, and AUDIT.md says so.
