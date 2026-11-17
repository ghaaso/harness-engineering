# REFUTE-wake-3: third pass, revision 3 delta only (label `refute-wake-3`, 2026-11-17)

Checked against the revised steps of `model/as-built/FIX-wake.md` revision 3 (443 lines; `FX:` =
its lines) and against `tcb/`. `W:` = watch.mjs, `R:` = replace.mjs, `G:` = guard-hook.mjs. No
command or model was run. "Inferred" = reasoned, not checked.

## 1. The seven changes

### FX-W1: exit marker and flag denial

**Closed as specified?** The marker is closed as specified (FX:79-80). The flag list is **not**
closed.

**Exit marker.**
- **A hard kill:** no marker. That is the open item, and correctly classed.
- **A marker written while the process is still alive for a moment:** readers judge the alarm dead
  and an ensure may register a new one in that slot, while the old one is already exiting. No second
  lasting alarm, so no break.
- **A marker from an earlier run:** the marker is keyed by (pid, start_time), which never recurs.
  No break.
- **New, small:** `run/arm/` is pruned after a day. A marker pruned while a slot record still names
  its pid lets an L1 reader under u judge that fired alarm `unknown` → alive. Smallest change: prune
  a marker only when no slot record names it.

**Flag list: still breakable with 0 faults.** A session need not follow its brief. The regex
(FX:89) misses three test-only entry points that reach the same effects:

1. **`watch.mjs --once`.** It is not denied, and SEM §1.3 says nothing in production calls it. With
   no watcher running (endturn says watcher-missing), the coordinator runs `--once` ten times in a
   turn. Each call is a counted tick, and calls less than 2Δ apart are never discounted (W:342-345,
   W:724-726). Every active child reaches `model_ticks` and gets a charged hang fence. Each call also
   advances `ticks_total`, so it drives every attempt toward FX-W6's age cap and FX-W5's intervals.
   This has the same effect as `--interval-ms 0`.
2. **`--boot`.** It is a flag of watch.mjs (W:47) and of replace.mjs (R:44, R:1049). In a fence for
   a failure reason, `att.boot !== boot` makes it a host fence (R:463), which is the fence group's
   uncharged path. A forged `--boot` on `replace fence` therefore evades the restart charge, so
   **RestartLimit falls** (inferred: that the host path is uncharged comes from the fence group's
   notes).
3. **`replace --tick`** (R:1040) feeds stop-verify ticks (inferred from the usage check).

Smallest change: deny every flag the scripts mark test-only (`--once`, `--boot`, `--tick`, `--now`,
`--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake`) by an **allow-list of flags per script**
for the coordinator role, not a deny-list.

**Other routes.**
- Environment variables cannot reach the scripts: the tcb-node grammar refuses `$` and any first
  token other than `node` (G:319-336), and the scripts read no `process.env` (grep).
- Child profiles all have `"bash": "none"` (FX:89-90 checked by the designer; consistent with
  profiles/).
- **Open:** helpers started through the coordinator's Agent tool (checker, mapper) run their own
  profiles. Not checked here.

### FX-W2: count live unmarked slots

**Closed as specified?** Yes: B2.2 by reading only script-written files, B2.3 by the 10 s query and
the 45 s deadline (FX:136-147), and B1.4 (FX:136-138).

**Two faults:**
- **A turn that dies right after the count:** the counted slot is still pending, which is the point,
  so no break.
- **A hard kill after r1 and before hold 2:** the slot has no marker and r1 said alive, so it is
  counted. This is the hard-kill item again: FX-W4's `runs_no_alarm`.
- The keep-`confirmed` rule also keeps a dead turn's `confirmed` when the next turn passes no
  nonces, but step 7 re-counts, so no break.

**New:** under heavy load the 10 s query can time out on a healthy host (inferred: the ~2 s query
becomes slower under load, see the charter's load note). The result is `unknown`, so L1 counts a
hard-killed slot as live more often. This only widens the known open item.

### FX-W3: "armed" needs no marker on the confirmed slots

**B1.1 closed?** **Yes when the alarm fired** (its marker refuses T2). With a hard kill it stays open
and goes to FX-W4.

**S2 cost:** one fired slot of two refuses work while the other still pends. This is conservative,
not a hole.

**The owner signal (B3.2): partly.** Both inputs need a script to run:
- `unarmed_turns` is written only by reconcile;
- `stuck` is written only by the watcher.

If the coordinator never runs reconcile and no watcher runs, the alarm still wakes it every hour
and nothing counts. The designer classes this as an accepted limit. I disagree: see section 2.

### FX-W4: wake-to-run, corrected timing, one alert per onset

**Closed as specified?** Yes for B4.1 (FX:229-231) and B4.5.

**New breaks:**
- **The dead-man reads the busy count from the wrong file.** Its step 2 reads
  `watcher.json.busy_ticks` (FX:233), but FX-W7 writes the busy count to `run/watcher-busy.json`
  precisely because `watcher.json` cannot be written on a busy tick (FX:318-320). As written, the
  stuck-run-lock alert (schedule 11) never fires. Smallest change: read `watcher-busy.json`.
- **Counters need consecutive runs.** A list that fails on two runs out of three resets
  `runs_no_list` each time and never alerts, while every reader often sees `unknown`. Smallest
  change: count failures in a window of runs (say 3 of the last 5), not a consecutive run.
- **The `stuck` path takes about 4.75 h to alert** (15 + 30 + 60 ticks to reach the cap, then 3 × 60).
  Bounded; state it in R6's bound.

### FX-W5: stuck counter

**Closed as specified?** Yes (FX:262-264). No break beyond the latency above.

### FX-W6: idle becomes an act-due; attempt-age cap

**Idle closed?** Yes for B5.3 (FX:281-282): no charged fence from idleness alone.

**New break: the age cap is a charged hang on an honest long task, and it repeats.**
`attempt_max_ticks` (240 counted ticks, about 4 h) fences with class 21 `age`, charged (FX:283-285).
A healthy task that needs more than the cap is fenced. The restart begins at age 0, needs the same
time and is fenced again. After R + 1 fences the task is failed. This is deterministic, with **zero
faults**, so HealthyNotFailed fails for every honest task longer than the cap. B2's refund does not
apply, because the fence is not "later shown false".

Against the restart limit the cap is sound: each attempt is bounded, and restarts stay counted.

Smallest change: at the cap, raise an act-due or owner question (uncharged, as idle now does) and
fence only on the owner's word or on a second, larger cap. Or count the age since the attempt's last
progress mark rather than since bind.

**Second break: `--once` spam drives the age cap** (section FX-W1).

### FX-W7: a busy run lock skips the tick

**Closed as specified?** B6.1's wake loop is closed: no exit on a busy lock (FX:316-321).

**Against the hang count:**
- The step says a skipped tick "does not count; the next evaluation reloads the old state". As
  built, the state is in memory across ticks, and `ticks_total` is incremented before `evaluate`
  (W:730-733). The `evaluate` mutations (`hang_ticks`, transcript `end_byte`, new keys) are not undone
  unless the loop really reloads from disk or works on a copy. The step must say which. Otherwise a
  skipped tick still counts a hang tick in memory (inferred), and that tick is persisted at the next
  successful hold.
- With a true reload, the next counted tick sees a gap above 2Δ and is "paused" by M5, so one tick
  of hang is lost. That is one-sided, so no break.

**Against a run lock that is never released:** the watcher skips forever and the `busy_ticks` alert
fires only if FX-W4 reads the right file (see FX-W4). The alarm fires hourly, each turn's scripts exit
75 and retry nothing, and once the alarm has fired with no new registration, `runs_no_alarm` alerts.
So no busy loop. The run is silent apart from the alerts. Acceptable.

## 2. The 11 open items

**Wrongly classed:**
- **"The test-flag denial rests on the hook (H2)":** the hook dependency is fine to keep open, but
  the denial is also **incomplete** (`--once`, `--boot`, `--tick`). That is a defect to fix, not an
  open fact.
- **"No watcher and a coordinator that never runs reconcile":** this is fixable cheaply by a script
  that does run. On exit 30 the alarm reads `turn.json.turn_seq`. If it has not changed since the
  alarm's registration (no reconcile in a whole alarm period), the alarm writes
  `run/arm/unarmed-<pid>.json` before its marker, and the dead-man alerts on it.

**Left out:**
- The age cap fails honest long tasks with zero faults (FX-W6).
- The dead-man reads `busy_ticks` from the wrong file (FX-W4).
- Consecutive-run counters miss a flapping list (FX-W4).
- Marker pruning (FX-W1).
- Whether a skipped tick's in-memory state is really discarded (FX-W7).
- The helpers' profiles under the coordinator's Agent tool (flag reach).

## 3. Final verdicts

| Fix | Verdict | Smallest change |
|---|---|---|
| FX-W1 | stands with a change | a per-script flag allow-list for the coordinator, covering at least `--once`, `--boot` and `--tick`; prune markers only when unreferenced |
| FX-W2 | stands | — |
| FX-W3 | stands with a change | the alarm's own `unarmed` record, so the "never reconciles" residue reaches the owner |
| FX-W4 | stands with a change | read `watcher-busy.json`; count failures in a window of runs |
| FX-W5 | stands | — |
| FX-W6 | stands with a change | the age cap raises an uncharged act-due or owner question, not a charged fence; or the age counts from the last progress mark |
| FX-W7 | stands with a change | state, and implement, that a skipped tick discards the evaluation's in-memory changes |

## 4. Final fault schedules for the modeller

1. **Stale confirmed.** T1 confirms, dies before endturn (x) → alarm fires (marker) → T2 omits arming
   and runs `replace start`. Must be refused with the marker check; NoDeadlock fails without it.
2. **Reused outcome.** T1's ensure registers, T1 dies before reconcile (x) → the alarm fires → T2
   reuses the nonce. Must stay unconfirmed: NoDeadlock.
3. **L1 fired alarm under u.** u → alarm fires → ensure. Marker ⇒ a free slot ⇒ registered. Ablate
   the marker: NoDeadlock fails.
4. **Hard kill under u (L1 vs L2).** u → kill the alarm (no marker) → turns confirm on `unknown`.
   NoDeadlock fails in L1 until the owner; holds in L2. NoSilentDeadlock via `runs_no_list`.
5. **Forged ticks.** No watcher → the coordinator runs `--once` repeatedly (or `--interval-ms 0`).
   NoFalseSuspicion and BoundedAttempt; must hold only with the allow-list.
6. **Forged boot.** A failure fence with `--boot X` → host path. RestartLimit; must hold only with
   the allow-list.
7. **Never reconciles.** No watcher, an alarm alive, the coordinator omits reconcile every turn.
   NoSilentDeadlock (needs the alarm's `unarmed` record).
8. **Confirm deadline vs slow query (B2.3).** The query times out at 10 s; the deadline is 45 s.
   Admission eventually confirms.
9. **Second reconcile.** confirm → acts → reconcile again → replace start allowed (design check).
10. **Sleep before alert.** x leaves no alarm → the PC sleeps 5 min after the turn → wake-to-run runs
    → alert. NoSilentDeadlock.
11. **Stuck run lock.** A live hung holder → the watcher skips → `busy_ticks` from `watcher-busy.json`
    → alert. NoBusyLoop and NoSilentDeadlock; fails if the dead-man reads `watcher.json`.
12. **Flapping list.** The list fails on alternate runs → alert within the window. NoSilentDeadlock.
13. **Honest long task.** A healthy child that needs more than `attempt_max_ticks`. HealthyNotFailed;
    fails with a charged age fence.
14. **Idle child.** A healthy child idle past `idle_ticks` → act-due, no charged fence.
    NoFalseSuspicion.
15. **Short suspends (open, timer branch b).** Repeated suspends shorter than 2Δ during a `model`
    wait. NoFalseSuspicion; HealthyNotFailed under B2 after two episodes.
16. **SingleWatcher.** Pause the old watcher, u, an L2 break under the run lock, the old one resumes.
    No second writer.
17. **RevocationNeverGated.** Unarmed for ever; every fence of a running attempt and every stop step
    stays enabled.
18. **Skipped-tick state.** A busy lock on tick t while a child is silent; then free. The hang count
    over t must not advance, and nothing appends twice.
