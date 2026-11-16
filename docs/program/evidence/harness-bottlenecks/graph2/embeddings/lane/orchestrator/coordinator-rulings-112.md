# Coordinator ruling 112, on a machine sleep during the held-out run

Ruled by the coordinator on 2026-11-15 at about 22:28Z (file hash and exact time are in `progress.jsonl`,
line `rulings_112`), after the held-out run of step 7 had ended and before its hand-off went to the grader
(step 8). Raised by the coordinator from the run's own progress file, after the lane reported the run's
length. It is made after the code freeze: it lives in this file and in `progress.jsonl`, and goes to the end
of the protocol's section M word for word once step 9.4 has finished.

112. A machine sleep during the held-out run.
     (a) What happened. The owner's machine went to sleep on its idle timer (15 minutes; Windows system
     log, Kernel-Power 42, "Sleep Reason: System Idle") on 2026-11-15 at 19:38:17Z and was woken at
     21:38:12Z (Power-Troubleshooter 1, wake source a USB device). The container `kge-H1` was frozen for
     that time and went on by itself after the wake. One unit was in training when the machine slept:
     E1, c04, seed 3, checkpoint f57288f1f9a1 (four tasks, T1-0557 to T1-0560). Its progress line gives
     7,237.7 s of wall time; the trainer's own clock gives 42.6 s. The run then finished all 210 units
     with exit 0, no failed line and one start line (no relaunch); the launch took 4 h 43 min in all.
     (b) What was checked. The unit has its 70 epochs and 70 losses, all finite. After epoch 5 its loss
     curve stays within 0.012 of each sibling seed's on the same checkpoint (the two siblings differ by
     0.013 from each other), and it shows no jump (largest rise between two epochs 0.009; the siblings
     0.007 and 0.012). Its 434 pool scores are finite, and their order agrees with the siblings' about as
     the siblings agree with each other (Spearman 0.917 and 0.921, against 0.944; five other checkpoints
     give 0.73 to 0.96). The coordinator's count over the whole run finds no score row and no loss that
     is not a finite number (2,268,424 score rows, 210 loss lists).
     (c) The decision. The run stands as it is and goes to the grader. A sleep freezes a process and its
     memory; it is not one of the stops of step 7, and no unit failed. The unit is not trained again:
     item 27 allows exactly one held-out run, the frozen driver refuses a second one, and the figures of
     section H are descriptive. That the unit's bytes equal those of an uninterrupted run is likely and
     not proved.
     (d) What it means later. The coordinator's report names the sleep, the unit and this limit;
     RESULT.md and AUDIT.md cannot (their writers read no text for it). The independent audit of step 10
     is given this ruling. From now on the coordinator's session asks the app to keep the machine awake
     while it works, and the lane runs each remaining step inside an open turn or asks the same.
