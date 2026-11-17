# CEX-wake: the wake group modelled as built, D7's property forms, and the counterexamples (round 3, helper MB1, 2026-11-17)

Label `asbuilt-wake`. Code: `model/as-built/model.mjs` (flags `AB_*` of the wake group at model.mjs:93-111,
`WAKE_PROPS`, `D7_*` at model.mjs:113-122), `check.mjs` (property lists by flag, the `D6:*` diagnostics, BFS level
sizes), `configs.mjs:66-85` (ids `AB-W-*`, `AB-WAKE-ALL*`, `AB-ALL`, `D7-*`), driver `run-seq.mjs`, printer
`showd.mjs`. Results: `model/results-as-built/asbuilt-wake/<ID>[__<part>].json`, stderr of every run in
`_stderr.log`. Script citations are `W:` = tcb/watch.mjs, `S:` = tcb/status.mjs, `L:` = tcb/lib.mjs **as given in
SEM-wake.md**; I did not re-read the scripts. "INFERRED" = reasoned, not run.

## 0. Results in one table (two fields, R = 1, all six fixes on, `--mem-mb 400`)

Budget `K2W` = K2 plus `u:2` (process list unavailable), `o:2` (fault: the turn goes to endturn without its planned
acts), `y:1` (fault: alarm.json unreadable), `s:1` (planned, not a fault: one healthy slow call), total still k = 2.
`F n` = fails, shortest trace n steps; `H` = holds (complete run); `B` = BOUNDED, not refuted; `NC` = not checked
(the graph analyses need about 104-113 MB more than 400 MB leaves); `-` = not in that configuration.

| Property | DF2-K2-R1, new code, flags off | AB-WAKE-ALL whole | part k=1,x=1 | part k=1,u=1 | part k=2,o=2 | part k=2,o=1,x=1 | AB-WAKE-ALL-B1 part k=1,u=1 | **AB-ALL** (fence + wake) |
|---|---|---|---|---|---|---|---|---|
| states | 2,608,525 complete | 2,933,921 B | 301,865 complete | 1,001,430 complete | 282,997 complete | 849,868 complete | 2,841,685 B | 2,858,368 B |
| NoStaleAccepted | H | B | H | H | H | H | B | B |
| AtMostOneCommit | H | B | H | H | H | H | B | B |
| Slots | H | B | H | H | H | H | B | **F 6** |
| RestartLimit | H | B | H | H | H | H | B | B |
| TwoCoordinatorsAct | H | B | H | H | H | H | B | **F 8** |
| SingleWatcher | H | B | H | H | H | H | B | B |
| FailedTaskStopped | H | B | H | H | H | H | B | B |
| OneSessionPerAttempt | H | B | H | H | H | H | B | **F 5** |
| ReadyNotDiscarded | H | B | H | H | H | H | B | **F 7** |
| NoFalseSuspicion | H | **F 6** | **F 7** | **F 7** | **F 7** | **F 7** | **F 7** | **F 8** |
| WakeSourceAlive | - | **F 1** | **F 1** | **F 4** | H | **F 1** | B | **F 1** |
| WakeChainBounded (D1, counted) | - | **F 9** | H | **F 12** | H | H | **F 6** | **F 13** |
| AlarmsBounded | - | **F 8** | H | **F 10** | H | H | **F 5** | **F 12** |
| RestartLimitGhost (D7) | - | B | H | H | H | H | B | B |
| StaleWrites (D7) | - | B | H | H | H | H | B | **F 8** |
| CommitRecordStable (D7) | - | B | H | H | H | H | B | B |
| NoDeadlock | H | NC | **F 2** | **F 6** | H | **F 2** | NC | NC |
| AlwaysCanResolve | H | NC | **F 2** | **F 5** | H | **F 2** | NC | NC |
| NoBusyLoop | H | NC | H | H | H | H | NC | NC |
| EventuallyResolves | H | NC | H | **F 6** | **F 13** (part artefact, 4.6) | **F 11** | NC | NC |

The per-part columns are from complete parts and are verdicts **of that part only** (one fault multiset); a part's
H is not a configuration's H. AB-WAKE-ALL was run whole (BOUNDED) and four of its maximal parts; the other parts
were not run (section 6).

**Baseline proof.** `DF2-K2-R1` with every new flag off, on the final code: 2,608,525 states, 7,745,683 transitions,
complete, all 14 properties hold, the same numbers as before this round (`DF2-K2-R1.json`). RSS was 497 MB while the
counted budget stayed under 400 MB (the counted figure is what `--mem-mb` limits).

Single flags, only to attribute (section 4.7):

| Run | states | Result |
|---|---|---|
| AB-W-PAUSE-GAP (whole) | 2,911,241 B | NoFalseSuspicion **F 6** (short suspends, M5), WakeSourceAlive **F 4** (caused by AB_PROCLIST's handover exit 2, not by M5); the rest B / NC |
| AB-W-ACT-DUE part k=2,o=1,cs=1 | 119,490 complete | EventuallyResolves **F 13** (M3 alone); AlwaysCanResolve H; every safety property H |

D6 path tags reached in AB-WAKE-ALL whole (diagnostics, not properties; shortest trace): p1 1, p2 3, p3 3, p3b 4,
p4 3, p5 2, p6 1, p7 1, lost 3, other 2. Every one of the seven SEM-wake paths (§8 D6) is reachable in the model.

## 1. The flags (all default off; all off = the model before this round)

| Flag | One line | Script |
|---|---|---|
| `AB_ALARM_SUPERSEDE` | M1: a new alarm of a coordinator that has one supersedes it (no kill); a superseded alarm exits 0 at the end of its own sleep, and that exit wakes. Chain counter `ch` (saturates at 3); at most 3 alarm processes per coordinator kept | W:778-788 |
| `AB_ALARM_MIDTURN` | the current alarm may exit during a turn; the exit is consumed by that turn | SEM-wake 2.2, HARNESS-FACTS 2 |
| `AB_ARM_SPLIT` | M2: reconcile says alarm-missing by its own view (no record of this ce, or no process list), and the start is a separate op `AR` first in the plan, which fault x can precede; reconcile exits 75 (stale run.lock, no list) or 67 (alarm.json unreadable, fault y) with no arm request | S:586, S:593-602, S:354, L:1327 |
| `AB_ENDTURN_SPLIT` | endturn only checks and acks; starts are later ops `SW`/`SA`; no list and a record present → exit 2, which reports nothing; 75 on a stale run.lock with no list; 67 after the ack when alarm.json is unreadable | S:606-659, S:652-654 |
| `AB_EXIT2_START` | owner branch B1 for exit 2: start both sources anyway (off = B2, start nothing) | D2 (no brief says) |
| `AB_ACT_DUE` | M3: class 17 per row act, raised once per onset or act change, silent after the coordinator's ack; acts computed from the table with the empty-list slot count; fault `o` lets a turn omit its acts | W:543-567, W:132-168, W:583-585 |
| `AB_PAUSE_GAP` | M5: the discount reads the wall gap the watcher saw (`gp`), not the fault; a pause is long (gap seen) or short (missed; timer branch b) | W:339-345, W:399 |
| `AB_HANG_CALLS` | D5: a tick may run while a healthy child is in its one slow call (`s`); the first counted tick of a new epoch adds a hang tick | W:375, W:398-399 |
| `AB_X_KILLS_BG` | unknown fact branch: a coordinator crash also kills its background watcher and alarms | SEM-wake §0 (unknown) |
| `AB_FAIR_IDS` | weak fairness per process: watcher ids `19+par`, current alarm `23+par`, superseded alarm `27+par` | — |
| `WAKE_PROPS` | check WakeSourceAlive, WakeChainBounded, AlarmsBounded; report the `D6:*` path tags | — |
| `D7_RESTART` | RestartLimitGhost: failure fences counted from the epochs (`gf`), no admission after more than R | — |
| `D7_FREEZE_RS` | mutation for the demonstration only: replace never increments the restart counter | — |
| `D7_STALE` | StaleWrites: a step of a coordinator whose ce is stale changes the table or the sessions (field-wise diff) | — |
| `D7_HANDOVER_CAS` | handover.mjs's CAS on the ce it read, plus the session cap, so A-FENCE-CE's space is finite | handover.mjs (SEM-fence) |
| `D7_COMMIT` | CommitRecordStable: once a COMMIT record names an epoch it never names another | — |
| `D7_SLOTS` | SlotsProc / SlotsR10: a READY child's process lives until a close; count processes of any progress | R10 |
| `D7_LOOPS` | fault cv may also enter LOOPS (same call); LoopReported: reported by the first tick after LOOP same calls | R5 |
| `D7_NO_LOOP_RULE` | mutation for the demonstration only: the loop class is never assigned | — |

`PLU(P)` (the process-list fault `u` is enabled) is true under `AB_PROCLIST`, `AB_ARM_SPLIT` or `AB_ENDTURN_SPLIT`.
Every single-flag config `AB-W-<flag>` adds `AB_PROCLIST` and `WAKE_PROPS` (configs.mjs:72), because the wake
group's unknown case is the same process list as admission's.

## 2. What was merged, and why it is safe

Each merge follows SEM-wake §9 unless it says otherwise.

1. **Alarm start and its registration (a6) are one step.** Registration lag only adds one more superseded alarm,
   i.e. one more wake; superseded alarms are modelled, and AlarmsBounded/WakeChainBounded already fail on the u
   path. It removes no silence (a wake is added, never removed).
2. **Re-arm by token**: kept as "the current alarm may fire whenever its coordinator is idle (or mid-turn under
   MIDTURN)". The token only delays a firing; firing earlier over-approximates wakes: sound for safety, optimistic
   for NoDeadlock (SEM-wake 2.3).
3. **A reconcile that exits 67 or 75 gets plan `[]`** (the turn ends with no act). The code writes no status.json in
   those cases, so a coordinator has nothing to act on; INFERRED that it then ends the turn. Path tag p5.
4. **D5's "slow call" and "waits on its own background job" are one mode `SLOW`.** Both give "no new assistant
   message for a while" to the watcher (W:375); the watcher cannot tell them apart.
5. **The act-due key of a row and the READY key share the per-row ack state `aks`.** Both are acked by the same K
   and raised by the same row; separating them changes no ack outcome (one K acks every seq ≤ K, S:627-631).
6. **Lock breaking is approximated**: reconcile with a list breaks a stale run.lock in its own step; with no list the
   lock cannot be judged and reconcile/endturn exit 75; a new watcher with a stale lock and no list is "doomed"
   (it exits 75 at once, which wakes). The 30 s lock wait is untimed.
7. **`n.to` is dead** (always 0). Kept for the encoding only; harmless.
8. **The hand-over's alarm kill** is the fence group's `AB_HANDOVER_NOKILL` (MA); not re-modelled here.
9. **Mid-turn wakes are still dropped** (the turn consumes the notification, M:89), but a silence that this creates
   is now observed by WakeSourceAlive (path p4).
10. **Fairness**: the old shared ids made one fair alarm/watcher id stand for all of them; `AB_FAIR_IDS` splits them.
    Off in single-flag runs, on in AB-WAKE-ALL.
11. **The timeliness oracle** (`tickEnabled`, SEM-wake 5.3) is relaxed for exactly one budgeted slow call (`s`), as
    §9 recommends; a tick otherwise still waits for healthy children (an under-approximation of D5 beyond one call).
12. **The M3 ack is modelled** as the coordinator's endturn with K = the seq read at turn start (ACK_READ on, a fix).
    With ACK_READ off every raised key is cleared by the ack.
13. **Not modelled (omission, not a merge)**: the process list taken *before* the lock and before reading alarm.json
    (S:198-205 vs S:593-602). The model's reconcile reads the true alarm record and `pl` in one step. The race in
    SEM-wake 3.3 (an alarm started earlier in the same turn not yet listed) costs one superseded alarm, i.e. one wake
    (INFERRED, bounded); it would add AlarmsBounded traces, not remove any.
14. **Coalescing of class 17** (2 ticks) and the `events` orphan act: untimed / covered by the existing "events above
    ack" check (§9).

Unsafe merges avoided (SEM-wake §9 last paragraph): reconcile with AR (would hide p1/p2), endturn with its starts
(would hide p3), M3 on true state (hides the empty-list count), M5 on the fault bit.

## 3. The six wake fidelity points (my reading: the "The model today" gaps of SEM-wake §2.3, 3.5, 4.4, 5.3, 6.3, 7.3)

| Point | Before | Now | Flag |
|---|---|---|---|
| alarm fires only while idle | M:532 | may fire mid-turn | AB_ALARM_MIDTURN |
| arm in the wake step on true state | M:539 | reconcile's view + separate AR | AB_ARM_SPLIT |
| endturn starts the sources itself | M:393-396 | check + ack, then SW/SA; exit 2/67/75 | AB_ENDTURN_SPLIT |
| watcher actionable on true state, level-triggered | M:425-438 | keyed, once per onset, ack-silenced, empty-list count | AB_ACT_DUE |
| pause discount reads the fault | M:461 | reads the gap; short pauses missed | AB_PAUSE_GAP |
| tick waits for healthy children | M:439-446 | one healthy slow call is not waited for | AB_HANG_CALLS |

Fairness per process (AB_FAIR_IDS) and the crash-kills-background branch (AB_X_KILLS_BG) are extra.

## 4. Counterexamples, step by step

Every trace is printed by `node model/as-built/showd.mjs <file> <Prop>` (through the lane). Labels are the model's.

### 4.1 D6 path 2, the M2 gap — WakeSourceAlive 1 (AB-WAKE-ALL whole; same in parts k=1,x=1 and k=2,o=1,x=1)

1. coord0 wakes, `status --reconcile` exits 1 alarm-missing (S:593-602: no alarm.json), plan `start-alarm(arm) >
   admit ... > endturn`; **FAULT x: the turn dies before start-alarm** (between SEM-wake 3.2 steps 1 and 3).

No watcher (none was ever started) and no alarm: no wake source. **Real** (SEM-wake 3.3 "Death between step 1 and
step 3"); the only recovery is the owner. In part k=1,x=1 the same step makes NoDeadlock and AlwaysCanResolve fail
in 2 (step 2: nothing enabled). These liveness failures are the old r3 `arm-start-can-die`, now from the split itself.

### 4.2 D1, the wake loop — WakeChainBounded 9 (AB-WAKE-ALL whole)

1. coord0 wakes, reconcile alarm-missing, AR starts the alarm, admits f0 and f1 (S:593-602, then W:752-773).
2. f0e1 journals a card. 3. f0e1 writes READY; its note wakes coord0.
4. **FAULT u**: the process list becomes unavailable (S:198-205).
5. coord0 reconcile exits 1 alarm-missing *because there is no list* (`aliveIn(null)`, S:128, S:596); AR starts an
   alarm that **supersedes** the live one (chain 1, 2 alarm processes); drain, commit f0e1, admit f1, handover
   raise → exit 2 proc-unavailable (handover.mjs:271-276, the fence group's).
6. The superseded alarm ends its own sleep, finds alarm.json naming another alarm: exits 0 (W:778-788); wakes coord0.
7. Reconcile again alarm-missing (no list); a new alarm supersedes (chain 2).
8. Superseded exit 0, wake. 9. Reconcile, new alarm (chain 3): **WakeChainBounded**.

**Real**, exactly SEM-wake §8 D1: each link waits a full `alarm_ms` (untimed here), so NoBusyLoop does not see it
(in the complete part k=1,u=1 NoBusyLoop **holds** while WakeChainBounded fails at 12): the counted form is what
catches D1. With one u the chain needs no second fault. INFERRED: finite after the list returns (the model's
recovery is environment, not forced, so the drain of the chain is not shown).

### 4.3 AlarmsBounded 8 (AB-WAKE-ALL whole)

Steps 1-4 as 4.2; 5. reconcile alarm-missing (no list) → a superseding alarm (2 processes); commit f0e1, start f1;
6-7. f1e1 journals and writes READY, wake; 8. reconcile alarm-missing (no list) → another alarm: **3 alarm
processes** for one coordinator. **Real** (SEM-wake D1: "about (turns per hour) alarms alive at once"): every
wake, not only superseded exits, starts an alarm while the list is down.

### 4.4 D6 path 3b, exit 2 hides alarm-missing — WakeSourceAlive 4, NoDeadlock 6 (part k=1,u=1, complete)

1. **FAULT u.**
2. coord0 reconcile alarm-missing (no list); AR starts the alarm; admits; plan ends in endturn.
3. The alarm exits **mid-turn** (MIDTURN); the running turn consumes the exit (SEM-wake 2.2 last-but-two bullet).
4. `status --endturn`: no list and an alarm.json record present → **exit 2 proc-unavailable** (S:652-654), which
   returns before the `alarm-missing` check (S:655-658); branch B2: the coordinator starts nothing; the turn ends.
   Silence.
5. (NoDeadlock) the list comes back. 6. Nothing is enabled.

**Real in kind**, for branch B2 (what a coordinator does on exit 2 is written nowhere, D2). The mid-turn exit is
untimed in the model; in the code the alarm's period (1 h) must end inside that turn, which needs a long turn or an
alarm started long before (INFERRED, rare but possible). With **B1** (`AB-WAKE-ALL-B1`, part k=1,u=1) WakeSourceAlive
is not refuted within 2,841,685 states (BOUNDED, not "holds"), and WakeChainBounded fails sooner (6) and
AlarmsBounded at 5: starting both on exit 2 removes this silence and feeds D1. This is input to the owner's D2
question, not a ruling.

### 4.5 D5 — NoFalseSuspicion 6 (AB-WAKE-ALL whole)

1. coord0 wakes, reconcile alarm-missing, AR, admits f0 and f1. 2. FAULT cs: f0e1 stuck (incidental).
3. **f1e1 healthy**, starts a long call / waits on its own background job (planned `s`, no new message, W:375).
4. endturn watcher-missing; the coordinator starts the watcher (SW).
5. Tick: no event (hang 1 each; the first counted tick of a new epoch adds one, W:375 + W:398-399).
6. Tick: hang f0e1 and **hang f1e1** → ledger, exit 20. f1e1 was healthy: **NoFalseSuspicion**.

**Real** (SEM-wake 5.2): the model's H_HANG is 2 (10 in the code), so "two ticks" stands for about ten minutes.
The cs fault is not needed (the 7-step part traces have only the slow call).

### 4.6 M3, acked and not acted — EventuallyResolves 13 (AB-W-ACT-DUE part k=2,o=1,cs=1, complete; M3 alone)

1. coord0 reconcile, admits f0 and f1. 2. **FAULT cs**: f0e1 stuck. 3-4. f1e1 journals, READY, wake.
5. endturn: starts the watcher, re-arms the alarm, acks the seq read at turn start.
6. Tick: READY f1e1 → exit 10. 7. Commit f1e1. 8. endturn as 5.
9. Tick: **hang f0e1** → ledger, exit 20.
10. coord0 wakes; **FAULT o**: it goes to endturn without the planned fence of f0.
11. endturn acks the hang event (K = seq read at turn start, S:627-631) and starts the watcher.
12-13. A fair cycle: the watcher ticks with no event; the hang key is acked and stays silent while the condition
lasts (SEM-wake 4.2, W:645-649). The trace shows only the tick; that alarm wakes in the cycle find an empty plan
is INFERRED from the planner, not printed.

**Real**, SEM-wake 4.3 case 1. That the planner (status `next`) proposes no fence for an acked hang is the model's
planner fencing only on unacked events: **INFERRED** for status.mjs (S:520-551 not re-read). AlwaysCanResolve holds,
so the owner (or a new event) can still resolve it.

The AB-WAKE-ALL part k=2,o=2 trace of the same length has the **slow healthy child** in f0's place: it never returns
because the environment step (proc 31) is not forced. That part's EventuallyResolves is therefore an **artefact**
(a slow call always ends); the cs form above is the real one.

### 4.7 Attribution runs

- **AB-W-PAUSE-GAP**, NoFalseSuspicion 6: admit both; endturn starts the watcher; **FAULT short suspend** (no
  wall gap over 2Δ, W:342-345); tick (hang 1 each); **FAULT short suspend**; tick: hang f0e1 and f1e1 → exit 20,
  both healthy. **Real** for timer branch (b) (SEM-wake 6.2); two ticks stand for ten (H_HANG = 2).
- **AB-W-PAUSE-GAP**, WakeSourceAlive 4: FAULT u; reconcile, drain, handover raise exits 2 with no list, so the turn
  ends without endturn and starts nothing; the alarm fires, wakes coord0; **FAULT l** (a lost wake). Caused by
  AB_PROCLIST (the fence group's handover exit 2, MA's finding), not by M5. Real in kind; needs two faults.
- **AB-W-ACT-DUE**: 4.6.

### 4.8 The other D6 paths (diagnostic tags, AB-WAKE-ALL whole)

| Tag | SEM-wake §8 D6 path | Steps | What happens | Judged |
|---|---|---|---|---|
| p1 | 1 and 2 (no record) | 1 | 4.1 | real |
| p2 | 2 (record of a dead alarm) | 3 | an alarm exits, the next turn's reconcile asks, the turn dies before AR | real |
| p3 | 3 | 3 | endturn says alarm-missing, the turn dies before SA; uses an alarm started in the same turn that expires mid-turn | real in kind; the expiry inside one turn is an untimed artefact |
| p3b | 3 via exit 2 | 4 | 4.4 | real for branch B2 |
| p4 | 4 | 3 | the alarm exits mid-turn, the turn dies before endturn | real |
| p5 | 5 | 2 | FAULT y (alarm.json unreadable), reconcile exits 67 (S:354): no status.json, no arm request | real |
| p6 | 6 | 1 | the coordinator crashes and (AB_X_KILLS_BG) its background processes die | real **only if** the unknown fact holds |
| p7 | 7 | 1 | host reset: every process dies; excluded from WakeSourceAlive (the owner's case, `ownerLegit`) | real, owner's |

## 5. D7: non-vacuous forms (the old forms stay checked beside them)

| Old property | Why weak | New form | Where the new form fails | Old form there | Result file |
|---|---|---|---|---|---|
| RestartLimit | reads the counter replace increments, so it cannot see a counter that is not kept | **RestartLimitGhost**: failure fences counted from the epochs (`gf`), no admission after more than R | D7-RESTART (mutation `D7_FREEZE_RS`): **F 17**: stall fence e1→e2, hang fence e2→e3, admission of e3 with 2 > R = 1 failure fences, counter still 0 | **H** (complete, 2,628,513) | D7-RESTART.json |
| TwoCoordinatorsAct | restates the `--ce` fence; under FENCE_CE it is unreachable | **StaleWrites**: a stale coordinator's step changes the table or the sessions (field-wise) | D7-STALE (FENCE_CE off, handover CAS, k = 1): **F 4**: coord0 drains, the owner starts coord1, coord1 admits f0, coord0 (stale) starts session f0e1 and binds it. Also AB-ALL **F 8** (D3, the unfenced session start) | F 4 as well; the new form names the write | D7-STALE.json, AB-ALL.json |
| A-FENCE-CE infinite | no fault, unbounded sessions | **finite form**: handover's CAS + the session cap | D7-STALE is **complete at 2,000,035 states**; also Slots 12, OneSessionPerAttempt 12; EventuallyResolves 12 is an ablation artefact (the stale coordinator's watcher exits 31 in a loop while coord1 is dead) | — | D7-STALE.json |
| AtMostOneCommit | the WX mechanism never exercised (A-WX = DF) | **CommitRecordStable**: once COMMIT names an epoch it never names another | D7-COMMIT-NOFENCE (WX off, FENCE_EPOCH off): **F 13**: planned hand-over fence of f0 e1→e2, the turn dies before stop, f0e1's READY lands after its fence, a later turn commits f0e1, f0e2 runs, writes READY, and its commit **overwrites** the record. In D7-COMMIT (WX off, epochs compared) the new form **H** (complete, 2,615,376) | D7-COMMIT: **F 6**, a false positive: an identical rewrite of e1 after a torn commit | D7-COMMIT*.json |
| Slots | excludes READY-but-alive children; weaker than R10 | **SlotsProc** (alive processes ≤ N_max) and **SlotsR10** (per attempt: alive, stop unconfirmed, or current admitted/running) | D7-SLOTS (design + fixes, complete 2,727,196): **F 7** each: planned hand-over fence of f0e1, f0e1 writes READY after the fence, stop unconfirmed (zombie), admission counts 0 by liveCount, f0e2 starts: 3 processes. As built, lib.slotCount would count the unconfirmed stop (INFERRED from SEM-fence; it is the design's liveCount that misses it) | **H** | D7-SLOTS.json |
| R5's loop rule never exercised | cv never reaches LOOPS | **LoopReported** with `D7_LOOPS` | D7-LOOPS (progress off, rule removed by mutation): **F 8**: f1e1 repeats the same call 3 times, the tick reports nothing. With the rule in place (D7-LOOPS-RULE) **not refuted within 2,910,399 states (BOUNDED)** | — | D7-LOOPS*.json |

RestartLimitGhost, StaleWrites and CommitRecordStable change no behaviour (observers, `D7_OBS`) and were on in
AB-WAKE-ALL and AB-ALL: B there except StaleWrites F 8 in AB-ALL.

## 6. Memory: what a complete AB-ALL would need

AB-ALL stopped at 2,858,368 states with 319 MB counted (about 112 B/state for the BFS; RSS 548 MB). Level sizes:
1, 15, 83, 231, 621, 1,752, 4,730, 11,613, 26,094, 54,704, 109,670, 213,402, 404,922; about 2.03 M in the open
level 13. Calibration: DF2-K2-R1 (complete) has 49 levels, a peak level of 168,772 at depth 23, total ≈ 15.5 × peak;
its level-to-level growth ratio falls by about 0.1 per level. AB-ALL's ratio is still 1.90 at level 12 and falls by
about 0.05 per level. A coarse extrapolation (the method is crude, INFERRED):

- if AB-ALL's ratio decays as DF2's does from here: about 110 M states, about 16 GB at about 150 B/state with the
  liveness analyses;
- at the observed slower decay: billions of states, hundreds of GB.

Either way out of reach at 400 MB, and splitting into parts does not help (MA found the same for AB-FENCE-ALL: one
part is as large as the whole). Liveness is not checkable above about 3 M states at this budget.

## 7. Deliberately not run (owner's ruling: a test runs only if its result can change what we do next)

- **The single-flag matrix** beyond the two attribution runs: every failure in AB-WAKE-ALL already names its
  mechanism in its trace labels (AR, SW/SA, superseded exit, exit 2, short suspend, acked hang). In particular
  AB-W-ARM-SPLIT and AB-W-ALARM-SUPERSEDE alone: the 4.1-4.3 traces name the ops.
- **Liveness of whole configurations** (AB-WAKE-ALL, AB-ALL): needs about 104-113 MB more than 400 MB leaves
  (section 6); the per-part liveness verdicts above answer the questions that matter.
- **AB-WAKE-ALL-B1 whole and its other parts**: the k=1,u=1 part is the one where B1 vs B2 differs (exit 2 needs u).
- **The remaining maximal parts of AB-WAKE-ALL**: each new fault combination would only reproduce traces already
  found (every safety failure has a 1-12 step trace).
- **AB-ALL by parts**: a part is about as large as the whole (MA).
- **Three faults, R = 2, three fields**: every failure here needs at most two faults, and memory is the limit.
- **A forced (fair) process-list recovery**: it would only show the D1 chain draining after the list returns, which
  SEM-wake already states and no decision waits on.
- **D7-STALE with k = 2**: the k = 1 run is complete and fails at 4.

## 8. For the next modeller

**Each flag in one line**: section 1.

**How to run** (from BUILD, through the lane, one at a time):

```
node tools/lane.mjs --label r3-<what> --timeout-s 900 --wait-s 20 -- node model/as-built/run-seq.mjs <ID> \
  --out model/results-as-built/asbuilt-wake/<ID>.json --mem-mb 400 [--parts | --only "k=1,u=1"] --wall-s 780
node tools/lane.mjs --label r3-show --timeout-s 140 --wait-s 20 -- node model/as-built/showd.mjs <file.json> [Prop1,Prop2]
```

`run-seq` exits 3 when parts are left: run the same command again. A whole run that hits the memory budget ends
BOUNDED with "not checked" liveness, never "holds".

**Traps**

- **Gate every new state write behind its flag.** An ungated write (I had `gf` and `ar`) changes the baseline's
  state count. Prove "flags off = unchanged" with DF2-K2-R1: 2,608,525 states, all 14 hold.
- **Compare states field-wise, not by `JSON.stringify`.** Decoded and cloned objects differ in key order: a
  stringify diff gave a false StaleWrites at 2 steps.
- **Any act-due key must carry the epoch.** Each `t.ep++` is followed by `t.ad = 0` (model.mjs, the three fence
  sites); without it an artefact EventuallyResolves (27 steps) appeared.
- **Alarm entries are bytes** `par | sup<<3`; read with `aPar`/`aSup`, count with `alarmsOf`; `killAlarmsOf`
  filters by `aPar`.
- **A doomed watcher** is a watcher entry with `ph = 0` whose only step is exit 75 (a wake); do not treat it as a
  live watcher in liveness reasoning.
- **Environment procs 30 and 31 are never forced** (the u recovery, the SLOW return): a "fair" cycle that waits on
  one of them is an artefact (4.6, second paragraph).
- **H_HANG = 2** stands for h = 10: lengths of hang traces are not wall times.
- **Above about 3 M states nothing is checked for liveness at 400 MB**; plan parts so each stays under that.
- The wake group shares `u`/`pl` with AB_PROCLIST; a WakeSourceAlive failure with u may come from the fence group's
  handover exit 2 (4.7), not from a wake flag.
