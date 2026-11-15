# Coordinator ruling 110, on a known defect of the rehearsal script that is left as it is

Ruled by the coordinator on 2026-11-15 at about 15:00Z (file hash and exact time are in `progress.jsonl`,
line `rulings_110`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane after the second run of
`r58c/A/test_rehearse_stop.sh`; the coordinator read the script, the test and both logs, and read every
other launcher of the order for the same form. It goes to the end of section M word for word, before the
code freeze.

110. A known defect of the rehearsal script, left as it is.
     (a) The defect. `r58c/A/rehearse.sh` writes its notes through a helper that appends each note to
     its summary file, and in two places (lines 46 and 63) the note's own success decides what happens
     next. When the machine refuses the append ("Device or resource busy", ruling 106(c)), line 46
     marks the arm as failed although the launcher did remove the leftover, and line 63 prints a FAIL
     line after the PASS line. The defect can turn a pass into a failure, or add a stray FAIL line. It
     cannot turn a failure into a pass, and the script's exit code follows its own count of failures.
     (b) What it touched. The stand-in test of this script failed once in step 2d (13:36Z to 13:38Z),
     with every expected note printed and no cause in its output, and passed when it was run again
     with nothing else running (14:56Z to 14:57Z). The second run printed both result lines, which is
     this defect at line 63. That the first failure was the same defect at line 46 fits what was
     printed; it is not proved, because the test deletes its scratch folder. The real rehearsal of step
     2b is not touched: its summary has one result line, PASS, its lines are those of its terminal
     copy, and the script exited 0.
     (c) The decision. No change. The script has done its work in step 2b and runs in no later step; a
     fix would change a listed file and reopen 2b. The coordinator read every other launcher of the
     order for the same form: in none does a log call's own success decide a branch, none stops by
     itself on a failed command, and every function whose result is tested returns its own value. The
     coordinator's report names this defect. AUDIT.md cannot: its writer reads no text for it.
