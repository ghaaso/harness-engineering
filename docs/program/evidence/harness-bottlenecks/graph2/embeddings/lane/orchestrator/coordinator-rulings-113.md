# Coordinator ruling 113, on a byte check of the unit that spanned the machine sleep

Ruled by the coordinator on 2026-11-15 at about 23:13Z (file hash and exact time are in `progress.jsonl`,
line `rulings_113`), after step 9.4 had finished and while the independent audit of step 10 was running.
Raised by that audit: its reader of the held-out run and its process refuter. It is made after the code
freeze: it lives in this file and in `progress.jsonl`, and goes to the end of the protocol's section M word
for word after the audit has ended.

113. A byte check of the unit that spanned the machine sleep.
     (a) Why. Ruling 112(c) left it "likely and not proved" that the unit E1, c04, seed 3 at checkpoint
     f57288f1f9a1 has the bytes of an uninterrupted run. The audit's reader of the held-out run found one
     task of that unit (T1-0557, the arm alone, pool) whose top ten for seed 3 differs from both sibling
     seeds in six places while the siblings differ from each other in one: the only such case among the
     run's 1,254 seed-task cases. The process refuter noted that a byte check was possible and was not
     made. The frozen arm repeats byte for byte on the one tuning unit that step 2c trained again.
     (b) What is run, once each, each unit in a fresh process, on the card:
     (i) a control on tuning data: the stage-B unit E1/c04/s2/02b9557c6bee, to show that the way of
     running used here repeats a part that is known to repeat;
     (ii) the three units E1/c04/s1, s2 and s3 at the held-out checkpoint
     f57288f1f9a18e41171b0c5be0b0f20674fb4c42. Seeds 1 and 2 did not sleep: they are the control that a
     held-out unit repeats. Seed 3 is the unit in question.
     (c) How. The training and scoring path is the frozen one: `kge.train` with the record's settings
     (c04, 70 epochs, no early stopping), then the scoring and part writing of stage B, in the order
     `heldout.py` runs them. The lane chooses the way that changes no frozen file: the frozen driver in
     test mode with a test record that names E1, c04, w 1 and 70 epochs, or a small new script that calls
     the same frozen functions. Either way everything new lives in one new folder, `r58c/sleep-check/`
     (scripts, a test record and its own progress file if needed, the mount list, the mount record, logs
     and the re-run parts). Nothing is written to `train/`, `r58c/mounts/`, the lane's `progress.jsonl`
     or the deliverable folder, and no file of the freeze list changes: the freeze check is run before
     and after and must stay silent.
     (d) The container. One container at a time, name `kge-S1`, the frozen card image, no network, no
     pull, 6 GB (as ruling 108), the lane lock held, the memory sample of ruling 108 before it starts.
     It mounts, read-only, what the unit needs (the code, the one held-out parent's staged inputs and
     graph folder, and for the tuning control that checkpoint's) and, writable, only
     `r58c/sleep-check/out`. Its mount list and its saved mount record are kept in `r58c/sleep-check/`.
     It mounts nothing under `build/sealed`, no other held-out parent, and not `train/heldout` writable.
     (e) The comparison is the coordinator's, by ruling 68's rule for E1: the loss list, both score
     tables (gunzipped) and `counts.json` of each re-run part against the part of the real run, byte for
     byte. The lane sends the paths and the exit lines, not a judgment.
     (f) What each outcome means. All four equal: the sleep did not change the unit, and T1-0557's
     pattern is that seed's own. The controls equal and seed 3 different: the sleep changed the unit;
     the report says so and gives the audit's bound on its effect (at most 0.0013 on a held-out
     seed-mean P@10, at most 0.0044 on the answer level); nothing is graded again (item 27 allows one
     run, and the grader refuses a second grading). A control different: the check says nothing about
     the sleep, and the report says that.
     (g) What it is not. It is not a second held-out run: no hand-off is made, nothing goes to the
     grader, no figure is computed from it, and RESULT.md, AUDIT.md and CLAIMS.md stay as they are. It
     trains on one held-out parent's graph after the single grading has ended.
