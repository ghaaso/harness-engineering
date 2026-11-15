# Coordinator ruling 89, on what the stage-B container mounts

Ruled by the coordinator on 2026-11-14 (file hash and exact time are in `progress.jsonl`, line
`rulings_89`), while stage B was training and before any stage-B or held-out score had been read. Found
by the coordinator when capturing the live container's mount record. It goes to the end of section M
word for word.

89. Ruling 72's first sentence, corrected as ruling 81 corrected ruling 78. The stage-B container
    mounts `eval/` and `export/` read-only and `train/` (its `docker inspect` record taken on
    2026-11-14 at 19:09Z is `orchestrator/kge-B1-inspect-20261114T190928Z.json`, sha256
    052cbfa0ec863e3bb9e2069e99eb97b58a358cb53ded44f803d73dde8d4235e6; the guard's run line is the same
    for every launch). `export/` also holds the exported graphs of the 70 held-out parents, and those
    graphs contain the changes of held-out task commits. So held-out material was mounted in a training
    container from the first stage-B unit on. That cannot be undone, and moving the folders during the
    run would put the run at risk for a protection that could only be partial. The rule that holds is
    per use: stage B loads a graph only for a checkpoint of the plan; every part's meta names its
    checkpoint; the audit fails if any of the 2,385 parts names a checkpoint that is not one of the
    plan's 53 tuning checkpoints, or if the frozen stage-B code opens a graph folder by any other key.
    The same rule covers every later scoring container that mounts `export/`. AUDIT.md states this
    beside ruling 81's disclosure, as a limit of the isolation and not as a clean pass, and the
    independent audit checks it from the parts and from the code.
