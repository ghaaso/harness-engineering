TOTALS: 59 configurations, 5163 parts: 5154 complete, 9 cut off, 0 failed, 0 not run; 3.43 G states; 53447 cpu-s

| Configuration | What it is | Parts | States | Outcome | Properties that fail (shortest trace, steps) |
|---|---|---|---|---|---|
| D2-K2-R1 | adopted design, 2 fields, 2 faults, R=1 | 43 | 4.5 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| D2-K2-R1-NOKILLWAKE | adopted design, 2 fields, 2 faults, R=1, reading: a killed background command does not wake its session | 43 | 3.1 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), EventuallyResolves(12) |
| D2-K2-R2 | adopted design, 2 fields, 2 faults, R=2 | 43 | 4.6 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| DF2-K2-R1 | design + fixes, 2 fields, 2 faults, R=1 (base of the ablations) | 43 | 3.7 M | complete | none |
| DF2-K2-R2 | design + fixes, 2 fields, 2 faults, R=2 | 43 | 3.7 M | complete | none |
| DFPLUS-RECHECK | design + fixes + FIX_ENDTURN_RECHECK (2 faults, R=1): is the extra fix needed? | 43 | 3.3 M | complete | none |
| D2-K3-R1 | adopted design, 2 fields, 3 faults, R=1 | 140 | 79.6 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| D2-K3-R2 | adopted design, 2 fields, 3 faults, R=2 | 140 | 83.0 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| DF2-K3-R1 | design + fixes, 2 fields, 3 faults, R=1 | 140 | 57.7 M | complete | none |
| DF2-K3-R2 | design + fixes, 2 fields, 3 faults, R=2 | 140 | 59.7 M | complete | none |
| D3-K2-R1 | adopted design, 3 fields, 2 faults, R=1 | 43 | 29.4 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(7), EventuallyResolves(12) |
| D3-K2-R2 | adopted design, 3 fields, 2 faults, R=2 | 43 | 29.7 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(7), EventuallyResolves(12) |
| DF3-K2-R1 | design + fixes, 3 fields, 2 faults, R=1 | 43 | 22.9 M | complete | none |
| DF3-K2-R2 | design + fixes, 3 fields, 2 faults, R=2 | 43 | 23.0 M | complete | none |
| D2-K4-R1 | adopted design, 2 fields, 4 faults, R=1 | 126 | 372.7 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(8), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| D2-K4-R2 | adopted design, 2 fields, 4 faults, R=2 | 126 | 391.5 M | complete | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(8), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) |
| DF2-K4-R1 | design + fixes, 2 fields, 4 faults, R=1 | 126 | 266.7 M | complete | none |
| DF2-K4-R2 | design + fixes, 2 fields, 4 faults, R=2 | 126 | 278.5 M | complete | none |

| Safeguard removed | What it is | With 2 faults: fails | With 3 faults: fails | Cut off |
|---|---|---|---|---|
| A-ACK | endturn writes acked_seq = ledger head at endturn | AlwaysCanResolve(8), EventuallyResolves(10) | AlwaysCanResolve(8), EventuallyResolves(10) | none |
| A-ADMIT-LIVE | admission counts table rows, not live processes | Slots(6) | Slots(6) | none |
| A-ALARM | no alarm (the watcher is the only wake source) | NoDeadlock(2), AlwaysCanResolve(2) | NoDeadlock(2), AlwaysCanResolve(2) | none |
| A-CUT | restore reads the whole staging (no cut at the fence) | NoStaleAccepted(10) | NoStaleAccepted(10) | none |
| A-DRAIN | no drain: failure restarts go on while draining, and the hand-over waits only until the table shows nothing running (zombies ignored) | nothing | nothing | none |
| A-FENCE-EPOCH | commit.mjs does not compare epochs; the coordinator commits the READY a note names | NoStaleAccepted(8), AlwaysCanResolve(13), EventuallyResolves(18) | NoStaleAccepted(8), AlwaysCanResolve(11), EventuallyResolves(12) | none |
| A-PROGRESS | suspicion by liveness, not by progress V | EventuallyResolves(9) | EventuallyResolves(9) | none |
| A-READY | replace does not re-check for a READY of the current epoch | ReadyNotDiscarded(6) | ReadyNotDiscarded(6) | none |
| A-RECONCILE | no status --reconcile at turn start | Slots(3), OneSessionPerAttempt(3) | Slots(3), OneSessionPerAttempt(3), AlwaysCanResolve(8), EventuallyResolves(15) | none |
| A-RESTART-LIMIT | replace.mjs never takes the limit path (restarts are not counted against R) | RestartLimit(16) | RestartLimit(15) | none |
| A-STOP-LIMIT | limit path exits before the fence and the stop | FailedTaskStopped(16) | FailedTaskStopped(15), AlwaysCanResolve(14), EventuallyResolves(21) | none |
| A-WATCHER-LOCK | no watcher.lock; endturn starts a watcher when none of its ce has a fresh tick | SingleWatcher(6), NoFalseSuspicion(11) | SingleWatcher(6), NoFalseSuspicion(11) | none |
| A-WX | COMMIT written without exclusive create | nothing | nothing | none |
| A-WX+RECONCILE | COMMIT without exclusive create and no reconcile | AtMostOneCommit(6), Slots(3), OneSessionPerAttempt(3) | AtMostOneCommit(6), Slots(3), OneSessionPerAttempt(3), AlwaysCanResolve(8), EventuallyResolves(15) | none |
| X-ADMIT-RESERVE | the fix FIX_ADMIT_RESERVE taken out | Slots(6) | Slots(6) | none |
| X-ARM-AT-START | the fix FIX_ARM_AT_START taken out | NoDeadlock(2), AlwaysCanResolve(2) | NoDeadlock(2), AlwaysCanResolve(2) | none |
| X-ARM-BY-WRITE | the fix FIX_ARM_BY_WRITE taken out | NoBusyLoop(5) | NoBusyLoop(5) | none |
| X-PAUSE-DISCOUNT | the fix FIX_PAUSE_DISCOUNT taken out | NoFalseSuspicion(6) | NoFalseSuspicion(6) | none |
| X-READY-ALL | the fix FIX_READY_ALL taken out | ReadyNotDiscarded(6) | ReadyNotDiscarded(6) | none |
| X-WATCHER-ACTIONABLE | the fix FIX_WATCHER_ACTIONABLE taken out | AlwaysCanResolve(11), EventuallyResolves(13) | AlwaysCanResolve(10), EventuallyResolves(12) | none |
| A-FENCE-CE | no --ce check (scripts and the turn-start check); 1 fault (the break needs none) | Slots(12), TwoCoordinatorsAct(2), OneSessionPerAttempt(12) (not decided: 11) | not in the matrix | A-FENCE-CE: 9 of 9 |

ABLATIONS THAT FAIL NOTHING: A-DRAIN, A-WX, A-DRAIN-K3, A-WX-K3
DESIGN WITH FIXES, rows that are not 'complete, none fail': none
