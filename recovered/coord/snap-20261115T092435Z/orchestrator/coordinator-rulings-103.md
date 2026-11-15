# Coordinator ruling 103, on the lane's notes 32 to 34 and on a folder a test created

Ruled by the coordinator on 2026-11-15 at about 09:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_103`), after stage B ended (2,385 of 2,385 units, none failed) and before the end-of-run
procedure, any selection, any report and any held-out score. Raised by the lane (`r58c/B/CONFLICTS.md`,
notes 32, 33 and 34) and by the coordinator's own read of END-ORDER revision 2a287f0f. It goes to the end
of section M word for word.

103. Four decisions.
     (a) The memory line of the re-run check (note 32). In the container of the re-run check
     (`kge-R1`) a container reading above 3.5 GB is written to the log and reported to the coordinator
     after the check ends; it no longer stops the container. The 4 GB cap, the 10 GB card line, the
     time limit and three low host samples still stop it. Reason: the 3.5 GB line of ruling 86 was a
     report line for the probe, a warning about the held-out run's cap. Stage B's training log shows
     E4's process reaching a peak of 3,199 MB (in c13, and unchanged through every c16 unit, all under
     the 4 GB cap), and a fresh c13 process starting near 2,050 MB; c16 was never measured in a fresh
     process. A container that holds such a unit, the driver and file cache can read above 3.5 GB
     without being near a kill, because the kernel drops file cache first. The cap bounds the container
     whatever the line does, and the check compares bytes, which no memory line can change. The probe's
     own report line (ruling 86(a)) is unchanged.
     (b) The test runs of the three graph steps (note 33; the last sentence of ruling 102 is amended
     for `ktest-r9`). A test mounts file may differ from the step's real entry only in the rows named
     here, and the test's log prints the difference row by row. For `ktest-r4`: the fake stage folder
     read-only and one writable test folder outside the real output folders, in place of the step's
     real writable row. For `ktest-r8` and `ktest-r9`: the test hand-off folder read-only. For
     `ktest-r9`: graph rows of tuning checkpoints only, seventy of them (the 53 folders of
     `export/graphs` and 17 of `export/graphs0`), so that the test line has the real line's row count
     and length. No test mounts a held-out parent's folder, and no test mounts or creates a real output
     folder. The real `ktest-r9` list is also built once on the host before the freeze (the flag
     builder alone, no container; the list has no writable row) and its length is logged.
     (c) The end-of-run container and the leak audit (note 34). The leak audit judges the mount record
     of the end-of-run container (step 1) as it judges those of the card window and of steps 4 to 8: a
     missing record, or a mount outside its list, fails the audit; if step 1 ran more than once, every
     kept record is judged. Reason: that container writes the tables every later step reads.
     (d) No test creates a real output folder. On 2026-11-15 at 08:13:01Z a test path created the
     empty folder `train/selectB`: the flag builder (`r58c/B/mounts.js`) creates every writable source
     when it builds a step's flags, also when a test asks for them. The folder held no file at either
     time the coordinator looked (09:04Z and 09:14Z). The lane removes it with `rmdir`, which refuses a
     folder with content, and records that. From now on a writable source is created only by a real
     launch. A test that asks for a step's list gets no folder created, and a row whose source does not
     exist is left out of the test container and named in its log. The freeze-list script refuses when
     a real output of steps 4 to 9 already exists: `train/selectB`, `train/heldout`,
     `train/leak_audit`, `train/report/answer_level`, `train/report/e5_route`,
     `train/report/tune.json`, `train/report/item22.json`, or a real grader return.
