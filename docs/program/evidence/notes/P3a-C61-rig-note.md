# P3a C61 (runbook 153edd0): what L4's rig needs for this text

From the P3a lane, for the rig lane. The patch is `P3a-C61-rig-patch.diff`, in this folder. It is not in the PR, and the rig is not mine to change.

## Runs (main's rig unless noted; results in `C:/Users/User/.fixflow-cache/lab/l4/<run>/`)

| Run | Ref | Rig | Verdicts |
| --- | --- | --- | --- |
| 20261114T064857Z-restore | l4-main-6f430ce | main | DONE 51, AMBIGUOUS 2 (6.4 x2), NRH 9, N/A 1 |
| 20261114T070015Z-restore | claude/p3a-followup-5 @ 153edd0 | main 6f430ce | DONE 49, FAILED 1 (selftest), AMBIGUOUS 2 (6.4), MOVED 1 (6.12), NRH 9, N/A 1 |
| 20261114T071030Z-train | claude/p3a-followup-5 @ 153edd0 | main 6f430ce | DONE 72, FAILED 1 (selftest), AMBIGUOUS 2, MOVED 1 (6.12), NRH 8, N/A 5; 11.13 DONE |
| 20261114T071326Z-restore | claude/p3a-followup-5 @ 153edd0 | main + patch (4 files uncommitted) | DONE 53, NRH 9, N/A 1 |

## What main's rig does on this text, and why

- **selftest FAILED.** `selftest-runbook.py` uses 6.12's up line as the subject of its line cases (`StopIteration`). C61 dropped that line.
  - The patch moves the line cases to 6.13's `set_pin --report`.
- **6.12 MOVED, and WT2 MOVED x8.** There is no up line to type.
  - The patch types none when the `6.12-fence` anchor exists.
  - WT2 takes the same command from 8.6.
- **6.4 AMBIGUOUS.** The rig compares a literal head; the text now reads `<rev> (head)`.
  - The patch accepts that form when exactly one `(head)` line is printed.
- **The wrong turns after WT2 run on a live host.** WT2 writes the sign-off and restarts the backend. So the live test stops 6.7 in WT3, WT5, WT6, WT14 and BACK before their own guard is reached. BACK reads "FAILED as written".
  - The patch puts the host in the state 6.1 leaves (backend stopped, no sign-off) from WT5 on, and again at WT13.
  - WT3 still meets the live test (same verdict). Moving the state block above WT3 would fix that; that move is untested.
- **WT13 (b) did not model its own description** ("the backend started by hand").
  - The patch writes the sign-off by hand and starts the backend, as an owner would have to (WT1).
  - It then also shows (b2): the sign-off removed and the backend still running.
- **WT16 and WT13 (b) now read "stopped by the DROP line's own test: STOP: nothing dropped (...this database is live...)"**, and the fix column reads "no: scripted (ruling C61 ...)".
