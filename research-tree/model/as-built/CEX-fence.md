# CEX-fence: the fence group modelled as built, and its counterexamples (round 3, helper MA, 2026-11-17)

Label `asbuilt-fence`. Code: `model/as-built/model.mjs` (flags `AB_*`), `configs.mjs` (ids `AB-*`), the
sequential driver `run-seq.mjs`. Results: `model/results-as-built/asbuilt-fence/<ID>.json` (+ `.err`).
Script citations are `tcb/<file>:<line>` as given in `SEM-fence.md` (I did not re-read every line; where I
read a line myself it says so). "INFERRED" = reasoned, not run.

## 0. Results in one table (two fields, K2 = two faults, R = 1, all six fixes on, `--mem-mb 400`)

`F n` = fails, shortest trace n steps; `H` = holds (complete run); `B` = BOUNDED, not refuted;
`NC` = not checked (the graph analyses needed about 103-111 MB more than 400 MB left; the BFS was
BOUNDED anyway); `-` = not run. All runs whole-configuration BFS unless "43 parts".

| Property | DF2-K2-R1 (rerun) | A-READY (rerun) | AB-READY-SPLIT (43 parts) | AB-TRANSCRIPT-LAG | AB-START-UNFENCED | AB-COMMIT-CLOSE | AB-NO-COMMIT-RECONCILE | **AB-FENCE-ALL** |
|---|---|---|---|---|---|---|---|---|
| states | 2,608,525 complete | 2,558,288 complete | 8,026,033 summed, 43/43 complete | 3,027,210 B | 2,910,886 B | 2,948,455 complete | 2,613,121 complete | 2,936,143 B |
| NoStaleAccepted | H | H | H | B | B | H | H | B |
| AtMostOneCommit | H | H | H | B | B | H | H | B |
| Slots | H | H | H | **F 3** | **F 9** | H | H | **F 6** |
| RestartLimit | H | H | H | B | B | H | H | B |
| TwoCoordinatorsAct | H | H | H | B | **F 7** | H | H | **F 8** |
| SingleWatcher | H | H | H | B | B | H | H | B |
| FailedTaskStopped | H | H | H | B | B | H | H | B |
| OneSessionPerAttempt | H | H | H | **F 3** | **F 8** | H | H | **F 5** |
| ReadyNotDiscarded | H | **F 6** | **F 6** | B | B | H | H | **F 7** |
| NoFalseSuspicion | H | H | H | B | B | H | H | B |
| NoDeadlock | H | H | H | NC | NC | H | H | **F 8** * |
| AlwaysCanResolve | H | H | H | NC | NC | **F 5** | H | **F 7** * |
| NoBusyLoop | H | H | H | NC | NC | H | H | B * |
| EventuallyResolves | H | H | H | NC | NC | **F 12** | H | **F 7** * (artefact, 4.2) |

\* AB-FENCE-ALL was run twice. The second run (after the zombie fix of section 2, the code as it stands) had
the same safety verdicts and trace lengths, but its liveness analysis was NC (108 MB short). The liveness
column is from the first run (2,935,625 states, BOUNDED). It stays valid for the current code because the
fix only adds owner edges from states that hold a READY zombie, and none of the three liveness traces passes
through such a state. An ordinary edge cannot create a zombie, so the region after each failing state is
unchanged. That run's file is kept as `AB-FENCE-ALL.pre-zombie-fix.json`. The AB-COMMIT-CLOSE column is the
run after the fix; the run before it is `AB-COMMIT-CLOSE.pre-zombie-fix.json` (EventuallyResolves F 11 there,
through the artefact).

**Baseline proof (all new flags off = today's model).** DF2-K2-R1 rerun in the copy: 2,608,525 states,
complete, all 14 hold, the same as `results-as-built/baseline/DF2-K2-R1.json`. A-READY
rerun: 2,558,288 states, complete; the verdicts of all 14 properties and the ReadyNotDiscarded trace are
byte-identical to `baseline/A-READY.json` (compared with whitespace removed). The later changes (session cap,
zombie end) act only under AB_* flags.

**Verdict lines.**
- D4a (READY races the fence) is **real** as built: ReadyNotDiscarded fails in 6 steps with every fix on
  (AB-READY-SPLIT, complete over all 43 parts), with one fault.
- D4b (late transcript, double start) is **real**: Slots and OneSessionPerAttempt fail in 3 steps with the
  transcript lag alone (one fault x, or x + a crash).
- D3 (stale coordinator starts a session) is **real** if the coordinator may use the session tools:
  TwoCoordinatorsAct fails in 7 steps, and OneSessionPerAttempt in 8, with the unfenced start alone. Killing
  or not killing the old wake sources at the hand-over does not matter.
- D4c (a row committed at `started` can never be stopped) is **real**: AlwaysCanResolve fails in 5 steps and
  EventuallyResolves in 12, with the commit/close mechanism alone (complete run).
- With the as-built reconcile (no "COMMIT ⇒ committed" branch), all 14 properties hold (complete). The graph
  differs from DF's (2,613,121 against 2,608,525 states), so the reconcile branch did hide paths. Whether the
  exclusive create is now load-bearing was not run (section 6).
- M4 unknown: no failure of its own. The NoDeadlock trace with the process list down is a wake-group
  question (D2/D6, 4.2). The EventuallyResolves trace with a permanent outage is an artefact of my fairness
  choice.
- No new failure of NoStaleAccepted, AtMostOneCommit, RestartLimit, SingleWatcher, FailedTaskStopped or
  NoFalseSuspicion was found. Where a run was BOUNDED, that is "not refuted", not "holds".

## 1. The flags (all default off; all off = the model before this round)

Prefix `AB_` = "as built". They are independent booleans in `makeParams` (model.mjs, after
`FIX_ENDTURN_RECHECK`). The wake group (SEM-wake) is meant to add its own `AB_*` flags beside them; two
pieces are shared on purpose so that both groups combine:

- the global bit `n.pl` (process list available) and the fault kind `u` (`FAULTS`, budget `BUD.u`,
  default 0; configs use `K2U = {...K2, u: 2}`), with the recovery step as an environment step (proc 31,
  never forced). This is the `pl`/`u` of SEM-wake section 9, so M1/M2/D1 can read the same bit.
- `slotCountAB(n, P)` (lib.slotCount as built), which `admitCount` returns whenever `AB_SLOTCOUNT` or
  `AB_COMMIT_CLOSE` is on. `actionable` (M3) calls `admitCount`, so a wake-group M3 that wants "the
  empty-list slot count from the table" gets it from here.

New state (encoded; all constant when the flags are off): global `pl` (bit 3 of byte 1), `B.u` (high
nibble of the `B.d` byte); per row one new byte `cl | bn<<2`; per session bit 7 of byte 0 = `rh` and one
new byte `tv | bd<<1 | sc<<2`; a sixth session mode `IDLE` (5). New ops `SR`, `SV`.

| Flag | Mechanism | Script lines it stands for | What the model now does |
|---|---|---|---|
| `AB_READY_SPLIT` | M6 as built | READY written by the child's Write tool, no lock (briefs/child.md:41, CONTRACT.md:440); hook check guard-hook.mjs:394-409; replace's re-check replace.mjs:183-201,473-477 in one lock hold with the fence (lib.mjs:1740-1820) | the READY is two child steps: **hook** (enabled only while the row is active at admitted/started/bound and its epoch is the session's; sets `rh`) and **land** (`p=2`, unconditional, wakes the parent). Replace still reads `p===2` (a READY in flight reads as absent, replace.mjs:186-198). `ReadyNotDiscarded` is also raised by a fence that passes over `rh=1, p<2` of a live session |
| `AB_START_UNFENCED` | D3 / CE gap | session tool takes no `--ce` (settings/coordinator.json:64, SEM-fence 3.2); `replace start` on admitted answers repeat 0 (replace.mjs:867-873); hook checks only the epoch (guard-hook.mjs:406) | a stale coordinator's turn either obeys R6 (empty plan) or plans `start-session` for each row it reads at admitted; only script ops are refused 64; the start carries the epoch the coordinator read; one yield point before every start; a start on a folder whose row is no longer open at that epoch makes an `IDLE` session (every tool call denied, process lives) |
| `AB_TRANSCRIPT_LAG` | D4b, start/bind apart | transcript found only once it has a cwd record (lib.mjs:2334-2363); reconcile status.mjs:263-317 (0: stays admitted; >1: several-sessions, no change); stop verify stop.mjs:402-426; bind needs the SID from the turn (replace.mjs:999-1007) | a session starts with `tv=0`; a child step (its own proc, so weakly fair) makes it visible, and any progress does too. Reconcile marks `started` only with exactly one visible transcript. A session started by a current coordinator has `bd=1` (SID known); a turn death (fault x) before its bind clears it. The fenced attempt's stop: a session with `bd=0, tv=0` is not closed, its stop is confirmed (sc) and it lives on |
| `AB_SLOTCOUNT` | M4 as built | lib.mjs:3063-3102, admit.mjs:226-232,470; handover.mjs:277-281,318-330 | admission and the hand-over count slots per attempt once per epoch: stop not confirmed and (unconfirmed, current attempt of an open row, last attempt of a committed row, or a transcript); a process line never matches (worst reading of HARNESS-FACTS 10). Hand-over needs a count of 0 |
| `AB_COMMIT_CLOSE` | D4c | status.mjs:526 / watch.mjs:141-166 (stop-request only for committed+bound, `bind` for started); stop.mjs:268-301 (request), 278 (wrong-step for committed/started), 375-461 (verify); replace.mjs:987 (bind refuses a committed row); commit.mjs:843 (commit at started or bound) | a committed row keeps its last attempt's slot (`cl`) until `stop-request` then `stop-verify` (two coordinator ops, a turn death possible between them); a row committed at `started` (`bn=0`) gets `cl=3` and is never released; a row at `started` is planned `bind` (and, with a READY, both orders "commit" and "bind, commit"). Implies the as-built slot count |
| `AB_HANDOVER_NOKILL` | old wake sources | handover.mjs:283-297 (reported, never killed); watch.mjs:315 (watcher exits 64 at its next evaluation), 776-777 (alarm checks ce only after its sleep) | the raise kills nothing and wakes nobody; the old watcher exits at its next tick (model.mjs `tick`, stale-ce branch, wakes the old coordinator); the old alarm stays and wakes the old coordinator when it fires |
| `AB_NO_COMMIT_RECONCILE` | WX exercised | status --reconcile records starts only (status.mjs:263-317); commit record by exclusive create commit.mjs:826-828 | the reconcile branch "COMMIT record ⇒ committed" is not taken; after a torn commit only an identical commit retry (same epoch) completes the row; another epoch gets "commit-differs" |
| `AB_PROCLIST` | M4 unknown | replace.mjs:847-852 + admit.mjs:226,470 (slots-unknown, exit 6); handover.mjs:271-276 (exit 2); stop.mjs:405-418 (exit 2) | fault `u` sets `pl=0`; an environment step restores it. While `pl=0`: nothing is admitted, the hand-over raise exits 2 (turn ends), a fence's stop verify exits 2 (row stays fenced, the closes happen), a committed row's stop verify exits 2 |

## 2. What was merged, and why it is safe

| Mechanism | Merged | Why safe (or what it may hide) |
|---|---|---|
| M6 | replace's re-check + CAS + ledger line = one step | one run-lock hold (lib.mjs:1463-1472); every writer serialises on it; no property reads the ledger's fence lines |
| M6 | the hook's read and setting `rh` | one atomic file read; nothing the hook does depends on a second read |
| M6 | a torn READY = `rh=1, p<2`; a writer that dies mid-write clears `rh` (canon) | replace.mjs:194-198 reads an unparseable READY as absent; a READY that never lands is not a "READY discarded" |
| D3 | the stale coordinator's plan = [] or one `start-session` per row it reads at admitted, nothing else | every other op it could take is a script that exits 64 and ends the turn (lib.mjs:1475-1490), or (Read, helpers, plan/ writes) changes nothing the model has; the plan reads the true table at the turn's start, not an older status.json (INFERRED: an older status.json only adds starts at epochs the yield already reaches) |
| D3 | one yield point before a start, none before a bind | SEM-fence 3.5; the turn death before bind is still there through fault x |
| D3 | a start at a non-open epoch = an `IDLE` session, no writes | the hook denies every tool call of it (guard-hook.mjs:394-409); its process is real and counts in Slots |
| D4b | the transcript appears by the child's own step (weakly fair) or with its first progress | the lag is unbounded but finite; a child that writes anything has a transcript with a cwd record |
| D4b | stop request + session close + stop verify of a FENCED attempt stay one op (`stop`); a session is closed iff `bd` or `tv` | INFERRED: with `tv=1` but `bd=0` (a duplicate whose SID the table does not hold) the as-built coordinator may not close it; stop verify would then see growth and not confirm. The merge closes it, so it may hide a leak of a visible duplicate |
| D4c | the session-tool close of a committed child is dropped; stop verify confirms at once | in the worst reading of HARNESS-FACTS 10 verify confirms on "no growth, no matched process" (stop.mjs:426) whether the session was closed or not, and a committed child idles; canon forgets READY children of committed rows and no property reads them (Slots counts `p<2` only). Verify's wait for `stop_verify_deltas` ticks is dropped: it only frees a slot later, so dropping it can only hide liveness failures, not create them |
| D4c | the owner's end of a zombie + the re-verify (`stop-verify@-`, watch.mjs:153) = one step | otherwise an ended zombie's attempt would keep a slot only because the model has no re-verify op |
| M4 | lock-busy (exit 75) not modelled | it only delays (SEM-fence 5.4) |
| M4 | the process-list outage is one fault `u` that lasts until an environment step | SEM-wake section 9 uses the same bit; the recovery is never forced, so a cycle with `pl=0` for ever is a fair cycle (see the judgement of each liveness trace) |
| D3/D4b | at most N_max+1 = 3 sessions per attempt; a further start is reported (OneSessionPerAttempt) and not added (active only under AB_START_UNFENCED / AB_TRANSCRIPT_LAG) | without the cap the state space is infinite: with no fault at all, a stale coordinator woken by each duplicate's READY starts duplicates for ever while the current coordinator sits at its yield point (probe, `probe.mjs`, sessions grew by one every 4 BFS levels). Three live sessions of one attempt already break Slots, and two break OneSessionPerAttempt, so no counterexample is lost. It can hide only a property about the fourth session, and none of the 14 is one |
| D4c | the owner's end of an escalated zombie also reaches a zombie that wrote READY (only with slot counting) | without it, a zombie with p = 2 kept its attempt's slot for ever (stop unconfirmed, nothing re-verified). That gave an artefact EventuallyResolves trace in AB-COMMIT-CLOSE (11 steps, `AB-COMMIT-CLOSE.pre-zombie-fix.json`). As built, the owner ends it and `stop-verify@-` (watch.mjs:153) confirms |
| handover | the old watcher/alarm keep their current behaviour (exit at next tick/firing, wake the old coordinator) | watch.mjs:315,776-777; the alarm's period is not modelled (it fires only while its coordinator is idle, as before) |

Properties: none is weakened. `ReadyNotDiscarded` gains one more trigger (the in-flight READY of
`AB_READY_SPLIT`), which is the as-built form of the same requirement (SEM-fence 2.6). `Slots` is unchanged
(true processes `al && p<2`), so a READY-but-alive child is still not counted (D7 item 4 stays open).

## 4. Counterexamples, step by step

Each trace is the BFS-shortest over all parts (`run-seq.mjs` keeps the shortest; the part named is where
it was found). A step joins with " | " the ops one coordinator turn ran without a yield. Script lines per
step; the verdict "real" means the scripts as built can do it; "artefact" means only the abstraction can.

### 4.1 AB-READY-SPLIT — ReadyNotDiscarded, 6 steps (part k=2,cs=1,x=1; uses one fault, x)

| # | Model step | Script lines |
|---|---|---|
| 1 | coord0: reconcile, plan; `replace start f0` -> admitted e1; session-tool start of f0e1; **fault x**: the turn dies before `bind` | status.mjs:263-317; replace.mjs:847-933; session tool (no script); replace.mjs:999-1007 never runs |
| 2 | child f0e1 journals a card | child Write under staging/, hook guard-hook.mjs:394-409 |
| 3 | child calls Write READY.json: hook passes (row e1 open), the write is in flight (`rh=1`) | guard-hook.mjs:394-409 then the harness Write tool, no run lock (SEM-fence 2.2) |
| 4 | coord0's alarm fires, wakes coord0 | watch.mjs:752-804 |
| 5 | coord0: reconcile marks f0 started (its transcript is visible); plan: planned hand-over of f0 | status.mjs:287-300; R5/R7 hand-over plan |
| 6 | coord0 `replace fence f0 --reason handover`: the READY re-check reads READY.json as absent (not landed), fence e1 -> e2; the READY of e1 then lands in the fenced attempt | replace.mjs:466-477 (readyValid 183-201: missing/unparseable -> false), lib.mjs:1740-1820 |

Verdict: **real** (D4a). Every step is a separate act as built; nothing orders the child's Write after
replace's lock hold. The fault x in step 1 only makes the shortest path; it is not needed (the same window
exists in any turn that plans a fence while the child is mid-Write; INFERRED, the model's first-found path
uses x because an alarm wake is the cheapest way to start a planning turn while the child is at p=1).
FIX_READY_ALL (the re-check for the planned hand-over) is on, so this is not the A-READY ablation: the
re-check runs and cannot see a READY whose write has not landed.

### 4.2 AB-FENCE-ALL (every fence flag, all six fixes on, K2 + u=2, R=1; whole run, BOUNDED at 2,935,625 states)

The run is BFS: every failure below is the shortest one in the whole two-fault configuration up to the
depth the run reached (the bound cut it after 2,026,712 expanded states; all traces here are 5-8 steps,
far inside that depth). Properties not refuted are BOUNDED, never "holds".

**Slots, 6 steps (D4b)**

| # | Model step | Script lines |
|---|---|---|
| 1 | coord0 turn: `replace start f0` -> admitted e1 | replace.mjs:847-933 |
| 2 | session-tool start of f0e1; **fault x**: turn dies before `bind` (the SID is lost) | session tool; replace.mjs:999-1007 never runs |
| 3 | coord0's alarm fires | watch.mjs:752-804 |
| 4 | coord0: reconcile finds no transcript with a cwd yet -> row stays admitted; status lists `start-session` | status.mjs:263-317 (0 found: no change), lib.mjs:2357-2358; watch.mjs:166 (`found.length ? 'bind' : 'start-session'`, read myself) |
| 5 | second session-tool start of f0e1 (replace start would say repeat, replace.mjs:867-873); bind; `replace start f1`: slot count 1 (f0's attempt counted once per epoch) < 2 -> admitted | lib.mjs:3063-3102 (once per epoch, 3071-3076) |
| 6 | session-tool start of f1e1 (the second x in the label is incidental: the state already has 3 live processes) | — |

Verdict: **real**. Three live child processes with N_max = 2: lib.slotCount counts the attempt f0e1
once although two processes run in it, so admission cannot see the duplicate. Cause: the transcript lag
(AB_TRANSCRIPT_LAG; see 4.3 for the single-flag run).

**OneSessionPerAttempt, 5 steps (D4b)**: steps 1-2 as above; 3: fault cd, the first f0e1 session crashes
(its turn-end note wakes coord0) before its transcript is visible; 4-5: reconcile sees no transcript, the
coordinator starts f0e1 again. **Real** (same lines). Note the crash is only the cheapest wake; with an
alarm wake the same happens in 6 steps (the Slots trace, step 5).

**TwoCoordinatorsAct, 8 steps (D3)**

| # | Model step | Script lines |
|---|---|---|
| 1 | coord0: drain (W*_coord), its starts refused; fault x ends the turn | coord.json drain; R12 |
| 2 | coord0's alarm (armed at turn start, fix M2) fires | watch.mjs:752-804 |
| 3 | coord0: `handover raise` (slot count 0, table quiescent) -> ce 1; its watcher and alarm are reported, not killed | handover.mjs:252-347, 283-297 |
| 4 | owner starts coord1 | — |
| 5 | coord0's old alarm fires (it checks ce only after its sleep) and wakes coord0 | watch.mjs:776-777 |
| 6 | coord1: reconcile, plan; `replace start f0` -> admitted e1; yields before its session-tool start | replace.mjs:847-933 |
| 7 | coord0 (stale) wakes; its reconcile would exit 64; it reads status.json: f0 admitted; plans the session-tool start | status.mjs:557 (64); coordinator Read of run/status.json |
| 8 | coord0 starts a session in wt/f0-e1/ (no --ce on the session tool) | settings/coordinator.json:64; guard-hook.mjs:406 (the child is admitted by epoch only) |

Verdict: **real** if the session tools are allowed to the coordinator (open question "session tool
prefixes"); today profiles/coordinator.json lists none, so no session can be started at all (SEM-fence 4).
Coord1 then starts f0e1 too: a double start of one attempt by two coordinators. The x in step 1 is not
needed (without it the hand-over turn has extra yield points and the trace is as long).

**ReadyNotDiscarded, 7 steps (D4a)**: as 4.1, with one more op in step 6 (`bind` of the row reconcile
marked `started`, watch.mjs:166). **Real.**

**NoDeadlock, 8 steps (M4 unknown + the wake group)**

| # | Model step | Script lines |
|---|---|---|
| 1-2 | coord0 drains; its starts are refused; yields before each start | R12 |
| 3 | **fault u**: the process list becomes unavailable | proc.list (PowerShell) fails |
| 4 | coord0: `handover raise` exits 2 (proc-unavailable); the turn ends without endturn | handover.mjs:271-276 |
| 5 | the alarm armed at turn start fires | watch.mjs:752-804 |
| 6 | **fault l**: that wake is lost | HARNESS-FACTS 2 |
| 7 | the process list works again | — |
| 8 | nothing is enabled: no watcher (endturn never ran), no alarm, no child; the owner's wake is not yet legitimate (one loss) | — |

Verdict: **real as modelled, but caused by the wake group, not the fence**: whether a turn whose hand-over
exits 2 still runs `status --endturn` (and so starts a watcher and arms the alarm) is a brief question (D2);
the model's turn ends at a failed hand-over as it always did (model.mjs OP.H). With the proc list available,
the base's failed hand-over happens only while children live, and they wake the coordinator; with `pl = 0`
it happens with no child. Hand to the wake group (SEM-wake D1/D6).

**AlwaysCanResolve, 7 steps (D4c, the row committed at `started`)**

| # | Model step | Script lines |
|---|---|---|
| 1-2 | `replace start f0`; session-tool start; fault x before `bind` | as above |
| 3-5 | child f0e1: a card; Write READY.json (hook passes); the write lands, wakes coord0 | guard-hook.mjs:394-409 |
| 6 | coord0: reconcile marks f0 `started` (transcript now visible); plan: drain, commit f0 (before bind, an order the status list allows: READY is class 11, `bind` is the row's act); `commit record` at step `started` -> committed; fault x ends the turn (incidental) | status.mjs:287-300; commit.mjs:843,937 (accepts started); 826 |
| 7 | from here f1 can never be resolved: draining blocks its first start (R12); the hand-over needs slot count 0, but the committed row's last attempt holds a slot for ever: `stop request` on committed accepts only `bound` (stop.mjs:278), `bind` refuses a committed row (replace.mjs:987) | lib.mjs:3086,3094; handover.mjs:277-281,318-330 |

Verdict: **real** (SEM-fence 6, "new finding"), given that the coordinator may commit before it binds a
`started` row. The model allows both orders because the as-built list gives the row's act (`bind`) and the
READY (class 11) separately and nothing orders them (INFERRED from watch.mjs:130-170, which I read).

**EventuallyResolves, 7 steps (fairness choice)**: drain, x, then fault u and the process list never comes
back; the fair cycle is "watcher tick: no event". **Artefact of a modelling choice**: I made the recovery of
the process list an environment step that fairness never forces (as SEM-wake section 9 proposes), so
"unavailable for ever" is a fair path, and with no list nothing can ever be admitted (admit.mjs:226). A
permanent outage of the process list is not a protocol defect a design can fix; the real liveness failure
of this configuration is the AlwaysCanResolve one above (an AG EF failure implies a resolution-free SCC,
so EventuallyResolves would fail by D4c too even with a forced recovery; INFERRED, not run).

### 4.3 Single-flag runs (only to say which mechanism causes a failure)

**AB-TRANSCRIPT-LAG: Slots, 3 steps, and OneSessionPerAttempt, 3 steps (D4b, one mechanism)**
1. coord0's turn admits f0 and starts it, binds it, admits f1 and starts f1e1. **Fault x** ends the turn
   before `bind f1`. (replace.mjs:847-933; the session tool; replace.mjs:999-1007)
2. The alarm wakes coord0. (watch.mjs:752-804)
3. Reconcile finds no transcript of f1e1 that has a cwd record yet, so the row stays admitted
   (status.mjs:263-317, lib.mjs:2357-2358). The coordinator starts f1e1 a second time. Three processes now
   run, f0e1 and f1e1 twice, against N_max = 2.

The OneSessionPerAttempt trace is the same with a crash of the first session as the wake (fault cd).
**Real.** With the lag alone the yield point before a start is absent, which is why it is shorter than
in AB-FENCE-ALL.

**AB-START-UNFENCED: TwoCoordinatorsAct 7, OneSessionPerAttempt 8, Slots 9 (D3, one mechanism)**
The hand-over here kills the old watcher and alarm, as the old model did. The kill's own exit is a wake of
coord0 (KILL_WAKES, HARNESS-FACTS 2), and coord0's turn may start at any later time.
1. Drain; fault x.
2. The alarm wakes coord0.
3. `handover` (ce becomes 1; the old sources are killed and the kills wake coord0).
4. The owner starts coord1.
5. coord1 admits f0 and yields before its start.
6. coord0 (stale) takes the pending wake, reads f0 at admitted and plans the start.
7. coord0 starts f0e1 with no --ce. TwoCoordinatorsAct fails here.
8. coord1 starts f0e1 too. OneSessionPerAttempt fails here.
9. coord1 starts f1e1. Slots fails here.

**Real**, under the same session-tool proviso as 4.2. It follows that AB_HANDOVER_NOKILL is not needed for
D3: the stale coordinator needs only one wake after the raise, and either hand-over form gives it one.

**AB-COMMIT-CLOSE: AlwaysCanResolve 5, EventuallyResolves 12 (D4c, one mechanism; complete run)**
AlwaysCanResolve is the 4.2 trace without the READY split:
1. f0 is admitted and started; fault x before its bind.
2. f0e1 writes a card.
3. f0e1 writes READY.
4. The coordinator drains and commits f0 at `started`.
5. f1 can never start.

EventuallyResolves:
1. f0e1 and f1e1 are started; f1 is not bound (fault x).
2-4. The children write cards; f1e1 writes READY.
5-6. A planned hand-over fences f0 (e1 to e2).
7. Fault x before stop(f0).
8. The fenced f0e1's READY lands, which is harmless (its epoch is stale).
9. The coordinator drains and commits f1 at `started`.
10-12. The fair cycle "watcher tick: no event". f0 is stopped and can never be admitted: the drain blocks
it, and the hand-over is never quiescent, because f1's committed attempt holds a slot that stop.mjs:278
will not release.

**Real.** Two faults (x, x), plus the planned events h and d.

**AB-NO-COMMIT-RECONCILE: all 14 hold (complete).**

## 5. What I could not run, or ran only BOUNDED

- AB-FENCE-ALL, AB-TRANSCRIPT-LAG and AB-START-UNFENCED do not fit whole at 400 MB (BOUNDED near 2.9-3.0 M
  states). Their failing properties are valid, because BFS-shortest traces within the explored depth are
  real counterexamples. Their other properties are "not refuted (bounded)", and for the two single-flag runs
  the liveness was not checked (about 105 MB short). A parts run of START-UNFENCED showed every part BOUNDED
  near 2.9 M states as well (13 parts tried, before the session cap; not repeated after the cap). Parts do
  not make these configurations fit at 400 MB.
- At about 18:00 my first two parts chains were stopped by me (TaskStop), once for each defect found (the
  unbounded state space, then the size). One lane command (pid 7332, label `r3-asbuilt-fence`) therefore has
  a `start` line in `lane/log.jsonl` and no `end` line. Its slot was left with a dead owner, which the lane
  treats as stale.
- A one-fault smoke run of AB-FENCE-ALL (`--bud k=1,x=1`) went to `%TEMP%\abf-smoke.json`, outside BUILD.
  It was used only to read traces and is not a result.

## 6. Deliberately not run (owner's ruling, 2026-11-17)

- AB-SLOTCOUNT alone: no failure in AB-FENCE-ALL needs it for attribution (the D4c traces are reproduced by
  AB-COMMIT-CLOSE, which includes it).
- AB-HANDOVER-NOKILL alone: AB-START-UNFENCED shows D3 without it, so it causes no failure on its own (as
  modelled).
- AB-PROCLIST alone: its two traces in AB-FENCE-ALL name the process list directly, and one is a fairness
  artefact. A run would change no decision.
- The parts runs (43-53 parts each) of every configuration: whole runs give the shortest counterexamples,
  and parts BOUNDED too at 400 MB. Roughly 30-50 min each for verdicts that would still read "BOUNDED".
- AB-FENCE-ALL with a weakly fair process-list recovery: AlwaysCanResolve already fails by D4c, which implies
  an EventuallyResolves failure (INFERRED). It would change no fix.
- A-WX together with AB_NO_COMMIT_RECONCILE (is the exclusive create now load-bearing): already answered
  outside this round (RV-WX-ONLY fails in 6 steps without the reconcile branch, model-fidelity.json). No new
  decision.
- Ablations of fixes, three faults, R = 2, three fields: excluded by the ruling. No fix was designed here.
