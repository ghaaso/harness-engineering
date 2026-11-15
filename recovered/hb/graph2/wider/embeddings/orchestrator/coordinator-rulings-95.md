# Coordinator ruling 95, amending point (e) of ruling 94

Ruled by the coordinator on 2026-11-15 at about 01:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_95`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane (`r58c/B/CONFLICTS.md`, note 9). It goes to the end of section M word for word.

95. Ruling 94(e), made exact. The leak audit runs before item 22, the result writer and the audit
    writer, and its output is an input of the last two, so their mount records cannot exist when it
    runs. Point (e) therefore reads: the mount record (`docker inspect`) of every container of the end
    sequence, tests excluded, is saved. The records of the containers that ran before the leak audit
    (the card window and steps 4 to 8) are passed to it, and the audit fails if one of them is missing
    or shows a mount outside its step's list. The records of the containers that run after it (item 22,
    the result writer, the audit writer) are saved in the same way and listed with their sha256 in
    AUDIT.md by the audit writer, except its own, whose record and launcher line the coordinator's
    independent audit of step 10 checks against the launcher's fixed list. The fail clause of ruling 94
    is unchanged.
