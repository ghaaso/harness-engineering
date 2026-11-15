# Coordinator ruling 102, making point (a) of ruling 101 workable

Ruled by the coordinator on 2026-11-15 at about 08:05Z (file hash and exact time are in `progress.jsonl`,
line `rulings_102`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane (`r58c/B/CONFLICTS.md`, note 31). It goes to the end of section M word for word.

102. Ruling 101(a), amended. One mount row per file does not fit the Windows command line (its limit is
     32,767 characters; 210 rows for the held-out pre-check come to about 60,000). The three steps
     therefore mount, read-only, one row per parent folder, `export/graphs/<P>`, for the parents the
     step concerns and no others: the late-50 tuning parents for the tuning hand-off (ktest-r4) and its
     pre-check (ktest-r8), and the 70 held-out parents, with the task list, for the pre-check of the
     held-out hand-off (ktest-r9). The other files of such a folder (that parent's own list of
     ancestors, its sizes and its triples) belong to the same parent and are not read by these steps.
     None of the three mounts `export/` or `export/graphs` whole, so the tuning hand-off never has a
     held-out parent's folder. The parent set of a real step comes from the plan (the late-50 tuning
     parents; the plan's held-out assignment), never from the hand-off being checked; the leak audit
     compares each saved mount record with those sets. A test run of the same step uses the same
     generator over its test set's parents and is marked as a test.
