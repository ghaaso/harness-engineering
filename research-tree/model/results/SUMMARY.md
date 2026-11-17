# Model run summary (in progress)

Updated 2026-11-17T09:58:11.068Z; runner pid 40648, started 2026-11-17T09:52:47.637Z, 323 s; 3 workers of 1500 MB, big parts alone at 6000 MB, floor 6000 MB free.

Parts: 1118 complete, 0 BOUNDED, 0 failed runs, 8036 still to run (3 running) of 9154. 98373117 states, 285577036 transitions, 686 cpu-s.

Running now: A-FENCE-CE k=1,t=1 (1500 MB, 3 s, rss 185 MB); A-FENCE-CE k=1,x=1 (1500 MB, 1 s, rss ? MB); A-FENCE-CE k=1,z=1 (1500 MB, 0 s, rss ? MB)

```
config                     parts  done        states    transitions    cpu-s peakMB  status; failing properties (trace steps)
A-ACK                         43    43       3449634        9992068       24     98  complete; fails: AlwaysCanResolve(8) EventuallyResolves(10)
A-ADMIT-LIVE                  43    43       3696601       10898032       26    133  complete; fails: Slots(6)
A-ALARM                       43    43        413666         831242        4     22  complete; fails: NoDeadlock(2) AlwaysCanResolve(2)
A-CUT                         43    43       6171304       18011453       40    171  complete; fails: NoStaleAccepted(10)
A-DRAIN                       43    43       3116133        9013886       23    137  complete; fails: none
A-FENCE-EPOCH                 43    43       6140056       18582438       40    128  complete; fails: NoStaleAccepted(8) AlwaysCanResolve(13) EventuallyResolves(18)
A-PROGRESS                    43    43       3092716        9099571       22    118  complete; fails: EventuallyResolves(9)
A-READY                       43    43       3599942       10520351       26    154  complete; fails: ReadyNotDiscarded(6)
A-RECONCILE                   43    43       4164106       12254975       29    135  complete; fails: Slots(3) OneSessionPerAttempt(3)
A-RESTART-LIMIT               43    43       3687727       10729163       26    133  complete; fails: RestartLimit(16)
A-STOP-LIMIT                  43    43       3664476       10674194       26    124  complete; fails: FailedTaskStopped(16)
A-WATCHER-LOCK                43    43       4755932       14612507       33    150  complete; fails: SingleWatcher(6) NoFalseSuspicion(11)
A-WX                          43    43       3659461       10660653       26    114  complete; fails: none
A-WX+RECONCILE                43    43       4167159       12260482       29    125  complete; fails: AtMostOneCommit(6) Slots(3) OneSessionPerAttempt(3)
D2-K2-R1                      43    43       4517525       12445699       30    138  complete; fails: Slots(6) ReadyNotDiscarded(6) NoFalseSuspicion(6) NoDeadlock(2) AlwaysCanResolve(2) NoBusyLoop(6) EventuallyResolves(12)
D2-K2-R1-NOKILLWAKE           43    43       3097294        7991838       21    109  complete; fails: Slots(6) ReadyNotDiscarded(6) NoFalseSuspicion(6) NoDeadlock(2) AlwaysCanResolve(2) EventuallyResolves(12)
D2-K2-R2                      43    43       4566929       12572777       29    123  complete; fails: Slots(6) ReadyNotDiscarded(6) NoFalseSuspicion(6) NoDeadlock(2) AlwaysCanResolve(2) NoBusyLoop(6) EventuallyResolves(12)
DF2-K2-R1                     43    43       3659461       10660653       26    130  complete; fails: none
DF2-K2-R2                     43    43       3687727       10729163       26    130  complete; fails: none
DFPLUS-RECHECK                43    43       3257396        9656271       24    143  complete; fails: none
X-ADMIT-RESERVE               43    43       3659833       10662341       25    116  complete; fails: Slots(6)
X-ARM-AT-START                43    43       3277291        8665201       22    131  complete; fails: NoDeadlock(2) AlwaysCanResolve(2)
X-ARM-BY-WRITE                43    43       3572731       11131197       28    133  complete; fails: NoBusyLoop(5)
X-PAUSE-DISCOUNT              43    43       3850396       11179323       29    166  complete; fails: NoFalseSuspicion(6)
X-READY-ALL                   43    43       3640727       10618481       28    133  complete; fails: ReadyNotDiscarded(6)
X-WATCHER-ACTIONABLE          43    43       3806894       11123077       27    118  complete; fails: AlwaysCanResolve(11) EventuallyResolves(13)
A-FENCE-CE                     9     0             0              0        0      0  INCOMPLETE 0/9 parts run; fails: none
A-ACK-K3                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-ADMIT-LIVE-K3              140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-ALARM-K3                   140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-CUT-K3                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-DRAIN-K3                   140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-FENCE-EPOCH-K3             140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-PROGRESS-K3                140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-READY-K3                   140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-RECONCILE-K3               140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-RESTART-LIMIT-K3           140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-STOP-LIMIT-K3              140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-WATCHER-LOCK-K3            140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-WX-K3                      140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
A-WX+RECONCILE-K3            140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D2-K3-R1                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D2-K3-R2                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
DF2-K3-R1                    140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
DF2-K3-R2                    140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-ADMIT-RESERVE-K3           140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-ARM-AT-START-K3            140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-ARM-BY-WRITE-K3            140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-PAUSE-DISCOUNT-K3          140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-READY-ALL-K3               140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
X-WATCHER-ACTIONABLE-K3      140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D3-K2-R1                      43     0             0              0        0      0  INCOMPLETE 0/43 parts run; fails: none
D3-K2-R2                      43     0             0              0        0      0  INCOMPLETE 0/43 parts run; fails: none
DF3-K2-R1                     43     0             0              0        0      0  INCOMPLETE 0/43 parts run; fails: none
DF3-K2-R2                     43     0             0              0        0      0  INCOMPLETE 0/43 parts run; fails: none
D2-K4-R1                     126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
D2-K4-R2                     126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
DF2-K4-R1                    126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
DF2-K4-R2                    126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
A-FENCE-CE-K2                 43     0             0              0        0      0  INCOMPLETE 0/43 parts run; fails: none
D2-K4F-R1                    343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
D2-K4F-R2                    343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
DF2-K4F-R1                   343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
DF2-K4F-R2                   343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
D3-K3-R1                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D3-K3-R2                     140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
DF3-K3-R1                    140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
DF3-K3-R2                    140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D3-K4-R1                     126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
D3-K4-R2                     126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
DF3-K4-R1                    126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
DF3-K4-R2                    126     0             0              0        0      0  INCOMPLETE 0/126 parts run; fails: none
A-FENCE-CE-K3                140     0             0              0        0      0  INCOMPLETE 0/140 parts run; fails: none
D3-K4F-R1                    343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
D3-K4F-R2                    343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
DF3-K4F-R1                   343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none
DF3-K4F-R2                   343     0             0              0        0      0  INCOMPLETE 0/343 parts run; fails: none

config                     NSA  AMOC S    RL   TCA  SW   FTS  OSPA RND  NFS  ND   ACR  NBL  ER  
A-ACK                      ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   FAIL
A-ADMIT-LIVE               ok   ok   FAIL ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
A-ALARM                    ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL FAIL ok   ok  
A-CUT                      FAIL ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
A-DRAIN                    ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
A-FENCE-EPOCH              FAIL ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   FAIL
A-PROGRESS                 ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL
A-READY                    ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   ok   ok   ok   ok  
A-RECONCILE                ok   ok   FAIL ok   ok   ok   ok   FAIL ok   ok   ok   ok   ok   ok  
A-RESTART-LIMIT            ok   ok   ok   FAIL ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
A-STOP-LIMIT               ok   ok   ok   ok   ok   ok   FAIL ok   ok   ok   ok   ok   ok   ok  
A-WATCHER-LOCK             ok   ok   ok   ok   ok   FAIL ok   ok   ok   FAIL ok   ok   ok   ok  
A-WX                       ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
A-WX+RECONCILE             ok   FAIL FAIL ok   ok   ok   ok   FAIL ok   ok   ok   ok   ok   ok  
D2-K2-R1                   ok   ok   FAIL ok   ok   ok   ok   ok   FAIL FAIL FAIL FAIL FAIL FAIL
D2-K2-R1-NOKILLWAKE        ok   ok   FAIL ok   ok   ok   ok   ok   FAIL FAIL FAIL FAIL ok   FAIL
D2-K2-R2                   ok   ok   FAIL ok   ok   ok   ok   ok   FAIL FAIL FAIL FAIL FAIL FAIL
DF2-K2-R1                  ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
DF2-K2-R2                  ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
DFPLUS-RECHECK             ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
X-ADMIT-RESERVE            ok   ok   FAIL ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok  
X-ARM-AT-START             ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL FAIL ok   ok  
X-ARM-BY-WRITE             ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok  
X-PAUSE-DISCOUNT           ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   ok   ok   ok  
X-READY-ALL                ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   ok   ok   ok   ok  
X-WATCHER-ACTIONABLE       ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   ok   FAIL ok   FAIL
A-FENCE-CE                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-ACK-K3                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-ADMIT-LIVE-K3            -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-ALARM-K3                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-CUT-K3                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-DRAIN-K3                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-FENCE-EPOCH-K3           -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-PROGRESS-K3              -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-READY-K3                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-RECONCILE-K3             -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-RESTART-LIMIT-K3         -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-STOP-LIMIT-K3            -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-WATCHER-LOCK-K3          -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-WX-K3                    -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-WX+RECONCILE-K3          -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K3-R1                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K3-R2                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K3-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K3-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-ADMIT-RESERVE-K3         -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-ARM-AT-START-K3          -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-ARM-BY-WRITE-K3          -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-PAUSE-DISCOUNT-K3        -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-READY-ALL-K3             -    -    -    -    -    -    -    -    -    -    -    -    -    -   
X-WATCHER-ACTIONABLE-K3    -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K2-R1                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K2-R2                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K2-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K2-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K4-R1                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K4-R2                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K4-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K4-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-FENCE-CE-K2              -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K4F-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D2-K4F-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K4F-R1                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF2-K4F-R2                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K3-R1                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K3-R2                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K3-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K3-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K4-R1                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K4-R2                   -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K4-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K4-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
A-FENCE-CE-K3              -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K4F-R1                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
D3-K4F-R2                  -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K4F-R1                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
DF3-K4F-R2                 -    -    -    -    -    -    -    -    -    -    -    -    -    -   
ok = holds in every part, all parts complete; FAIL = some part found a trace; ? = not decided (bounded or not checked); .. = parts still to run
legend: NSA=NoStaleAccepted, AMOC=AtMostOneCommit, S=Slots, RL=RestartLimit, TCA=TwoCoordinatorsAct, SW=SingleWatcher, FTS=FailedTaskStopped, OSPA=OneSessionPerAttempt, RND=ReadyNotDiscarded, NFS=NoFalseSuspicion, ND=NoDeadlock, ACR=AlwaysCanResolve, NBL=NoBusyLoop, ER=EventuallyResolves
```

Per-part results: results/<config>/<part>.json (status, budget, states, transitions, failing properties with shortest traces, seconds, memory).
