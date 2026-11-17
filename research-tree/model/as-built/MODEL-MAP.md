# Map of model.mjs (as-built copy, byte-equal to model/model.mjs as of 2026-11-17)

Line numbers refer to `model/as-built/model.mjs` (581 lines) and `check.mjs` (256 lines). On the day of
copying they are the same as the originals. "Oracle" means that the mechanism acts in one atomic step on
the true global state, where the script as built reads files, a process list or a clock, and can be
interleaved. Lines marked *inferred* were read in the code but not checked by a run.

## 1. State variables

Global (`initial` :65-68, `clone` :72-80, `encode`/`decode` :125-180):

| Var | Meaning | Written at |
|---|---|---|
| `ce` | coordinator epoch in coord.json | 367 (handover) |
| `ws` | a stale watcher.lock was left behind | 364, 559 (set); 383 (broken) |
| `syn` | synthesis done, the run ends (no successors, :486) | 373 |
| `to` | **dead**: only ever set to 0 (367, 397), never to 1 | — |
| `seq` | ledger head | 471; renumbered in canon :114 |
| `ack` | acked_seq | 397; canon resets it to 0 after renumbering :114 |
| `B` | remaining budget per kind (k + the FAULTS + h, d) | `spend` :91 |
| `T[f]` | task rows | below |
| `S[]` | child sessions/processes | below |
| `W[]` | watchers `{par, ph (always 1), lk (holds watcher.lock), gap (pause seen, no-lock ablation only)}` | 384, 388, 450, 472, 553 |
| `A[]` | live alarms, each the index of its coordinator | 395, 539 (push); 236, 532, 373, 560 (remove) |
| `E[]` | ledger events `{f, ep, cls, seq}` | 471; canon keeps only those that are unacked and current :110 |
| `C[i]` | coordinators `{ce, wk (pending wakes, saturates at 3, :89), boot (first turn, immune to a lost wake :544), dr (draining), rd (seq read at turn start), pc (remaining planned ops or null = idle)}` | 522, 537-542 |

Task row `T[f]` (:67, cloneT :70): `st` P/A/C/F (:17); `ep` epoch; `step` NONE/FENCED/STOPPED/ADMITTED/RUN
(:18); `rs` restarts charged to R; `hv` planned hand-overs used; `fail` the row is on the limit path;
`cut` the staging cut in cards (0/1); `ctn` the restored checkpoint holds cards written after the fence;
`ncr` COMMIT creations (0..3); `cmE` the epoch the COMMIT record names (-1 = none); `rsn` the reason of
the last fence (:20); `wep`/`cs`/`hs`/`rep` the watcher.json counters (the epoch they belong to, the
stall count, the hang ticks, and whether this epoch was reported).

Session `S[]` (`mkSession` :88, cloneS :71): `f, ep`; `m` the mode OK/STUCK/LOOPS/LOOPV/DEAD (:19); `p`
the progress 0, 1 (card) or 2 (READY); `pf` a card written after its fence; `tc` the checkpoint holds
post-fence cards (from `ctn`); `al` alive; `z` stop unconfirmed (zombie, escalated); `mv` progress since
the last tick; `nc` calls since the tick with no fall in V; `sig` same-signature repeats; `pu` paused since
the last tick; `par` the coordinator that started it; `hb` survived a host reset (the host class); `hd`
the READY has been handled.

Derived: `cur` :83 (the session of the current epoch), `liveCount` :84 (`al && p<2`), `quiescent` :85,
`readyToHandOver` :87, `admitCount` :241-248, `eligibleHO` :192-195, `actionable` :425-438,
`tickEnabled` :439-446.

## 2. Actions (all in `successors` :484-565)

| Action | Lines | proc (fairness id) |
|---|---|---|
| Child makes progress (card, or READY at p=2, which wakes its parent) | 495-500 | 7+f*6+min(ep,5) |
| Stuck child returns from its slow call | 501-503 | 31 (environment, never forced) |
| LOOPV child: a call with no fall in V | 504-506 | child |
| LOOPS child: the same call again (**unreachable**, see D7) | 507-509 | child |
| Fault: child stuck / loops (V) / crashes | 511-518 | child |
| Owner ends an escalated zombie | 521 | 6 |
| Owner starts the fresh coordinator after a hand-over | 522 | 6 |
| Owner wakes the current coordinator (no wake source alive) | 523-526 | 6, edge flagged `ow` |
| Watcher tick (`tick` :447-477): stale-ce exit 31; READY exit 10; stall/hang/loop to the ledger, exit 20; act-due (M3) | 528-530 | 4 (shared by all watchers) |
| Alarm fires (only while its coordinator is idle) | 532 | 5 (shared by all alarms) |
| Coordinator turn start: consume a wake, reconcile, read seq, [M2 arm], plan, run ops | 535-543 | i (u = untimed) |
| Fault: a wake is lost | 544 | i |
| Coordinator continues its turn after a yield | 546 | i (u) |
| Fault: PC sleeps (sets `pu` on live children) | 550-555 | 30 |
| Fault: host reset | 556-563 | 30 |

Coordinator ops (`runOp` :251-404, sequenced by `macro` :409-421). A turn yields to the other
processes only before a fence (F) or an endturn (E), and right after a fence (:415). The fault x can hit
before any op (:416). Plans: `plans` :198-227.

| Op | Script | Lines |
|---|---|---|
| F replace (first start / a fence with a reason) | replace.mjs | 264-291 |
| S stop | stop.mjs | 292-313 |
| A admit | admit.mjs | 314-326 |
| T start-session | session tool (not a script) | 327-333 |
| B bind | replace --step bound | 334-337 |
| M commit | commit.mjs | 338-356 |
| D drain | coord.json | 357-360 |
| H handover | handover.mjs | 361-370 |
| Y synthesis | — | 371-376 |
| E endturn | status --endturn, plus the starts of the watcher and the alarm | 377-402 |

## 3. Fault kinds and what "two faults" bounds

`FAULTS` :24 = cs (child stuck, 513-516), cv (loops with no progress, same), cd (crashes, 515), z (a stop
unconfirmed, 302), p (PC sleep, 550), l (lost wake, 544), x (coordinator turn dies, 416), t (torn commit:
the script dies after COMMIT and before the table update, 353), r (host reset, 556). Planned events are
budgeted apart and are not faults (`spend` :91): h (task hand-over, 279-280, also at most `HMAX_TASK`=1
per task through `hv`) and d (coordinator hand-over, 358-359).

Each event is charged once, when its action runs (`has`/`spend` :90-91). K2 (`configs.mjs:8`) = at most
**two such events in the whole run**, at most 2 of each of cs, cv, cd, z, p, l and x, at most 1 of t and r,
plus h=1 and d=1 in total. A fault's duration is free:
- A stuck child may stay stuck for ever, and its return is free (501-503).
- One pause freezes every live child.
- One reset kills everything.
- One z leaves a zombie until the owner ends it.

Everything else is free and unbounded: owner actions, alarms, watcher ticks, child progress, and wakes
dropped during a running turn (`wake` :89 drops a wake when `pc !== null`, with no charge; *inferred* to
be harmless only because every plan is re-made at the next wake).

## 4. Properties

Safety (`check.mjs:80`). The invariants (`model.mjs:568-576`) are checked on every new state. The
per-transition `viol` entries are checked on every edge.

| Property | Where raised |
|---|---|
| Slots | 570: `liveCount > NMAX` |
| RestartLimit | 571: `rs > R` |
| AtMostOneCommit | 572: `ncr > 1` |
| SingleWatcher | 573: more than one watcher with ph=1 |
| FailedTaskStopped | 574: a failed row with a live child that is not a zombie |
| NoStaleAccepted | 351: a commit whose checkpoint is tainted or whose epoch is stale |
| TwoCoordinatorsAct | 262: an op run by a stale coordinator |
| OneSessionPerAttempt | 331: a second start of the same attempt |
| ReadyNotDiscarded | 275: a fence over a current READY |
| NoFalseSuspicion | 465: an event on an OK child |

Liveness and progress (`check.mjs:143-245`) use only **allowed edges** (`:139`). Fault edges are
excluded. An owner wake counts only when `ownerLegit` (`model.mjs:578-581`) holds: at least two lost
wakes or dead turns (l + x spent), or a host reset.
- NoDeadlock (`:145-153`): no state with an unresolved field and no allowed edge.
- AlwaysCanResolve (`:155-171`): AG EF of field f being committed or failed, by backward reachability.
- NoBusyLoop (`:215-222`): no SCC of untimed ordinary edges, that is, only the coordinator's own steps.
- EventuallyResolves (`:225-244`): no fair SCC in which field f stays unresolved.

**Fairness** of EventuallyResolves is weak fairness per proc id. An SCC is a fair counterexample when
every proc that is enabled (by an allowed edge) in *all* its states also takes an edge inside it
(`req & ~took == 0`, `:233-239`). The ids are listed at `model.mjs:481-482`. Their consequences:
- All watchers share one id (4), all alarms share one (5), and every owner action shares one (6).
  Fairness therefore forces "some watcher tick", not a given watcher's.
- Procs 30 (pause, reset) and 31 (a stuck child's return) are environment (`ENV`, `check.mjs:141`) and
  never forced. A stuck child may stay stuck, and only the hang detection gets it out.
- Timeliness is built in, not assumed through fairness. `tickEnabled` (:439-446) disables every tick
  until each healthy, unpaused, current child has made a call. This is the h/c assumption, and it is
  what makes NoFalseSuspicion hold (D5).
- An alarm fires only while its coordinator is idle (:532): the alarm period is longer than any turn.
- A wake that arrives mid-turn is dropped (:89). The kills inside endturn and handover set `pc = null`
  first (:392, :363), so their exits start a new turn.

## 5. The mechanisms of this round

The **Oracle?** column was checked against `done/model-fidelity.json` (it agrees, and the additions are
marked).

| Id | Flag (default) | Lines | Oracle? | Why |
|---|---|---|---|---|
| M1 arm by write | FIX_ARM_BY_WRITE (off in D, on in DF) | 52, 394-395; the handover kill 366; killAlarmsOf 234-239 | **half-modelled** | With a live alarm of i, endturn does nothing. There is no token, no superseded-alarm exit (exit 0 that wakes), and no exit 64 on a newer ce. The handover kills the alarm at once and wakes the coordinator (366, under KILL_WAKES) instead of "exits 64 on its next check". The alarm has no period. |
| M2 arm at start | FIX_ARM_AT_START | 53, 539 | **oracle** | The alarm is pushed in the same atomic step as the wake and reconcile, guarded by `!A.includes(i)` on true process existence. As built, reconcile exits 1 alarm-missing and the coordinator starts the alarm by a separate tool call. The turn can die between the two (the x fault cannot reach that gap here), and "process list unavailable" also reads as missing (D1, not modelled). |
| M3 act due | FIX_WATCHER_ACTIONABLE | 57-58, 425-438, 469 | **close to an oracle** | The watcher evaluates the planner's predicate on the true state (slots by `admitCount` on true liveness, `c.dr`, the unacked ledger). It has no key and no acknowledgement: it exits on every tick while the predicate holds (469), whereas class 17 as built is keyed and quiet once acked, and uses lib.slotCount with an empty process list. Any disagreement between watch.mjs and status.mjs is not modelled. |
| M4 reservation | FIX_ADMIT_RESERVE | 56, 241-248, used at 318, 430 | **mechanism on true liveness** | Counts live processes + admitted rows with no session. There is no "unknown" class (process list failed, transcript only), and a READY-but-alive child takes no slot (`p<2`). As built, slotCount also counts started/bound attempts with no process and the last attempt of a committed row (R10 amended). |
| M5 pause discount | FIX_PAUSE_DISCOUNT | 54, 461 (`pu` set 552, cleared 467) | **oracle** | The tick reads a flag that the pause fault itself sets, so every pause, however short, is discounted. As built it is a one-sided wall gap > 2Δ since the last evaluation, so short pauses still count (r3 pause-short). |
| M6 READY re-check | READY_WINS (on) + FIX_READY_ALL | 41, 55, 273-276 | **oracle** | The re-check reads `s.p===2` inside the same atomic replace op as the fence. The child cannot write READY between the two, since there is no yield inside an op (415). As built, the child writes READY.json without the lock (r3 ready-race). On ready-wins the model just skips and the turn continues (274). |
| RC reconcile | RECONCILE (on) | 45, 183-190, called at 539 | **oracle** | 187: "transcript ⇒ started" reads `cur(n,f)`, and the session exists in the same atomic step as the start (330), so there is no transcript lag (r3 transcript-lag). 188: "COMMIT ⇒ committed" is a branch the contract does not have, and it masks COMMIT_WX. No unknown class. |
| CE fence | FENCE_CE (on) | 35; 200 (a stale coordinator plans nothing); 261 (every op refused, exit 64, **including OP.T**); 538-539 (no reconcile when stale); 450 (a stale watcher exits 31 and wakes); 224 (drain only when current) | **oracle** | The session-tool start is fenced as if it were a script (D3), and a stale coordinator obeys R6 by construction (200). As built only the scripts carry `--ce`. |

Also oracles (fidelity): the host class reads `s.hb`, a flag set by the reset (558), and does not compare
boot ids. Endturn starts the watcher and the alarm itself, in one step (377-396), whereas as built they
are separate tool calls.

## 6. Two-fault configurations (K2)

Configurations in `configs.mjs` (whole 43-part sets):
- DF2-K2-R1, the base;
- the 14 ablations of `A-*` other than A-FENCE-CE: CUT, FENCE-EPOCH, WX, WX+RECONCILE, PROGRESS,
  WATCHER-LOCK, ALARM, ACK, READY, STOP-LIMIT, ADMIT-LIVE, RECONCILE, RESTART-LIMIT, DRAIN;
- the 6 fix ablations `X-*`: ARM-BY-WRITE, ARM-AT-START, PAUSE-DISCOUNT, ADMIT-RESERVE, READY-ALL,
  WATCHER-ACTIONABLE;
- DFPLUS-RECHECK, D2-K2-R1-NOKILLWAKE, D3-K2-R1 and DF3-K2-R1.

Added by `configs-full.mjs`: D2-K2-R1, D2-K2-R2, DF2-K2-R2, D3-K2-R2, DF3-K2-R2 and A-FENCE-CE-K2.

That is 31 in all. A-FENCE-CE itself runs at k=1 (one fault), and SMOKE runs at k=1.

## 7. D7: why each named property is weak, and what a non-vacuous form must observe

1. **RestartLimit**. 571 reads `rs`, the counter the mechanism keeps. At 283-286, `rs` grows only while
   `rs < R` (otherwise the limit path is taken), so `rs ≤ R` holds by construction whenever
   RESTART_LIMIT is on. Freeze the counter and it still holds (r3 rl-uncounted). *Non-vacuous:* keep a
   ghost count of the fences a task has with a failure reason (rsn ∈ {stall, hang, loop}, not host, not
   HO), counted from the epochs at 287 and independent of `rs`. Assert that no attempt is admitted or
   started (318-323, 330) after R such fences. Read from the epochs, it fails in 9 parts within 16 steps
   when the counter is frozen (r3 rl-uncounted-epochs).
2. **TwoCoordinatorsAct**. It is raised only at 262, for an op that a stale coordinator runs. Under
   FENCE_CE, 261 refuses every such op first, and 200 gives a stale coordinator an empty plan, so the
   property can fail only when the fence is removed: it restates the fence. *Non-vacuous:* the stale
   coordinator must plan as it would as built (drop the short cut at 200; R6 is a rule the session
   follows). Only the scripts refuse (F, S, A, B, M, D, H, E). The session-tool start (T) runs. The
   property then observes effects: no session is started (330) and no row is written by a coordinator
   with `ce < n.ce` at that moment. That is the "r4 stale-tool-start" form, which fails Slots and
   OneSessionPerAttempt within 4 steps with one fault.
3. **AtMostOneCommit**. 572 counts `ncr`, which only 350 increments. Its mechanism (COMMIT_WX, 344-349) is
   never reached: after a torn commit (353), reconcile 188 marks the row committed from `cmE`, so no
   second commit is ever planned. A-WX gives the same graph as DF (3,659,461 states summed over parts in
   SUMMARY.md, both rows). The count also treats an identical rewrite (same epoch) as a second commit.
   *Non-vacuous:* remove 188, because the contract records only starts, and observe the COMMIT record:
   once `cmE ≥ 0` it never changes to another epoch, and an identical replay is not a violation. Without
   188, WX is load-bearing (RV-WX-ONLY fails in 6 steps).
4. **Slots**. 570 counts `liveCount` = `al && p<2` (84), so a child that wrote READY but whose process
   still lives takes no slot. The model also has no close or stop-verify step for committed children: a
   READY child just stops acting. That makes the property weaker than R10 (amended), where the slots are:
   - every attempt that is stop-unconfirmed;
   - every attempt with a live process;
   - the current attempt of an active row at admitted, started or bound;
   - the last attempt of a committed row;
   - any attempt with a transcript.

   *Non-vacuous:* model process existence apart from progress (`al` stays 1 after READY until a close
   step plus stop-verify), and assert both "live processes of any p ≤ N_max" and "R10 slots ≤ N_max".
   With the slot held until the close (r3 ready-holds-slot), liveness fails in every part.
5. **A-FENCE-CE infinite state space**. Without the fence, a stale and drained coordinator re-plans the
   tail H (222). Its handover (361-369) checks only `c.dr` and quiescence, never `c.ce === n.ce`, so `ce`
   grows (367). Its own kills wake it (364-366), and the owner keeps starting new coordinators (522,
   `C.length <= ce`). `ce` is one byte (128), so it would wrap at 256. No budget completes the run.
   *Non-vacuous (inferred):*
   - model handover.mjs as built, a CAS on the ce it read, which is a script check independent of the
     `--ce` fence;
   - and/or abstract `ce` to current/stale per coordinator, with the coordinator count bounded by d+1;
   - then the property observes double starts and rows written by stale coordinators (as in item 2).
6. **R5's loop rule never exercised**. MODE.LOOPS is set nowhere. The faults set only STUCK, LOOPV and
   DEAD (512), so 507-509 and the `sig >= LOOP` class at 463 are unreachable. *Non-vacuous:* a fault (or
   a split of cv) that enters LOOPS, and a property that observes the event class: a same-signature loop
   is reported with cls LOOP within LOOP calls, and is never left unreported.

Related, but listed under D5: NoFalseSuspicion is largely assumed through `tickEnabled` (:439-446).
Without it, the property fails in every part within 4 steps (r3 no-timeliness).
