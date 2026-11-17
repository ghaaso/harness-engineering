# SEM-wake: the wake machinery as built (helper W, round 3, 2026-11-17)

Reader's note. This is what `tcb/watch.mjs`, `tcb/status.mjs` and the parts of `tcb/lib.mjs` they
call do today, step by step, for a modeller replacing the model's wake oracles. Paths are relative to
BUILD. `W:` = `tcb/watch.mjs`, `S:` = `tcb/status.mjs`, `L:` = `tcb/lib.mjs`, `M:` = `model/model.mjs`.
"Inferred" marks what I reasoned and did not check by running anything. No script was run for this
note.

## 0. Facts every section uses

- **Who can wake the coordinator.** Only the exit of a background command the coordinator session
  started, a child session's turn-end note, or the owner (HARNESS-FACTS 1-2). A script cannot start,
  message or stop a session. An exit that arrives while the coordinator is in a turn is delivered at
  its next tool call, inside that turn (observed, HARNESS-FACTS 2). Whether a background command
  survives a crash of the session's own `claude.exe` is **not known** (HARNESS-FACTS is silent;
  CONTRACT §7 item 5 marks "a background command's exit reaches the coordinator" as needs-app).
- **Every exit wakes**, whatever its code: 30 (alarm), 0 (superseded alarm, `--once` quiet), 64
  (stale ce), 75 (lock busy), 67, 70, and the watcher's 10-27 classes. CONTRACT decision 5 (lines
  1052-1057) relies on this ("the previous alarm ... exits 0 superseded").
- **Two wake sources**: the watcher (`watch.mjs`, default mode, one process holding
  `run/watcher.lock` for its life) and the alarm (`watch.mjs --alarm`, registered in
  `run/alarm.json`). Neither is ever started or killed by a script (S:11, S:589-592, CONTRACT
  decisions 5, 29). The coordinator starts both, each by its own background tool call.
- **The process list** is one PowerShell `Get-CimInstance Win32_Process` per call, about 2 s, timeout
  30 s (L:2755-2787). `list()` throws `proc-unavailable` on any failure or unparseable output
  (L:2765-2773); `alive(pid, start)` returns `null` on failure (L:2797-2800), `false` for `NONE`, and
  a one-sided start-time match otherwise (L:1202-1214). "Unknown" therefore reaches the callers as
  `procList === null` (status) or `alive === null` (lock breaking).
- **The run lock** (`run/run.lock`) is an exclusive-create file; `acquireLock` is synchronous, retries
  `lock_retries` = 300 times about 100 ms apart (about 30 s), judges a holder only after 50 unchanged
  sightings, and breaks it only when `proc.alive` says `false`; `null` counts as alive
  (L:1282-1381, L:1315-1328). `withRunLock` re-checks the ce inside the lock (L:1463-1472).
  Consequence used below: **with the process list unavailable, a stale lock is never broken**, and
  every writer that needs that lock exits 75 after about 30 s.
- **Thresholds** (`tcb/thresholds.json`): `delta_ms` 60000 (line 4), `coalesce_ticks` 2 (5),
  `hang_ticks` 10 (7), `stop_verify_deltas` 2 (13), `N_max` 2 (14), `alarm_ms` 3600000 (22),
  `lock_retries` 300 (56).

## 1. The watcher: tick loop and `--once` (W:707-748, evaluate W:309-681)

### 1.1 Steps in order

| # | Step | file:line | Lock |
|---|---|---|---|
| 1 | `checkCe(root, ce)`; stale → 64 | W:709, L:1475-1490 | none |
| 2 | thresholds, `realProc`, Δ = `--interval-ms` or `delta_ms`, edge facts | W:710-713 | none |
| 3 | `acquireLock('watcher.lock')`: held for the watcher's whole life | W:714 | watcher.lock |
| 4 | `loadWatcherState` (absent → fresh; corrupt → 67); set ce, pid, start_time | W:716-720 | watcher.lock |
| 5a | default mode: one **uncounted** evaluation (R6: a new watcher re-evaluates everything) | W:729 | watcher.lock |
| 5b | loop while exit 0: `sleep(Δ)` (setTimeout), `ticks_total += 1`, fresh edge facts (`now`, `freeMb`), counted evaluation | W:730-734 | watcher.lock |
| 5c | `--once`: `ticks_total += 1`, one counted evaluation, return | W:724-726 | watcher.lock |
| 6 | release watcher.lock in `finally`; exit with the class | W:741-747 | — |

One **evaluation** (W:309-681), in order:

| # | Step | file:line | Lock |
|---|---|---|---|
| e1 | `checkCe` (a newer ce → 64, no write) | W:315 | watcher.lock only |
| e2 | read coord.json, tasks.json, ledger, acked.json (`ackedSeq`), runFlags | W:316-321 | none (four separate whole-file reads, no snapshot) |
| e3 | `verifyLedger`; broken → class 27 | W:325-326 | |
| e4 | M5 `paused` computed from `now − state.last_tick_at` | W:342-345 | |
| e5 | per row active at started/bound: parse transcripts incrementally, new calls, V, stall, **hang**, READY, soft/hard, window | W:347-433 | |
| e6 | zombies (older attempts), class 25 | W:436-460 | |
| e7 | memory 24, common cause 26 (+ `halt` append), coordinator window 16/15 (+ `drain` append), tamper 27 / reopened 10 above acked_seq, checker batch 14 | W:462-541 | |
| e8 | **M3 act-due 17** (section 4) | W:545-567 | |
| e9 | intake spawn (detached, never awaited) | W:570-580 | |
| e10 | orphan events above acked_seq → 17 `events` | W:587-597 | |
| e11 | keys: an ident already in `state.active` keeps its key, else new key `ident|tick` and one `event` append queued | W:599-624 | |
| e12 | **all ledger appends in one run-lock hold**, ce re-checked inside | W:627-642 | run.lock |
| e13 | due = keys whose event seq > `ackedSeq` (the value read at e2); urgent (20-27) exit now; non-urgent (incl. 17) go to `pending` and exit once `tick − first_tick ≥ coalesce_ticks` | W:645-663 | none |
| e14 | `last_tick_at = now`; `assertHeld(watcher.lock)`; `writeAtomic(watcher.json)` | W:666-668 | watcher.lock |

### 1.2 Atomicity and death points

- The watcher is one process; nothing it does is a coordinator tool call. Only e12 is under the run
  lock. Reads at e2 are not a snapshot: a write between two of them (an endturn rewriting acked.json,
  a replace changing tasks.json) is seen half-applied. Effect (inferred): at worst one spurious or one
  late exit, because the next tick re-reads.
- `ackedSeq` is read at e2 but used at e13: an endturn that lands in between makes the watcher exit
  for an event just acknowledged. One spurious wake (inferred).
- **Death between e12 and e14** (crash, 70, PC reset): the event lines exist but `watcher.json`
  still has the old `active` and the old `ticks_total`. The next watcher's start evaluation runs with
  `tick` = the old `ticks_total`, finds the ident absent from `active`, mints `ident|old_tick`
  (different from the dead key `ident|old_tick+1`) and appends a **second event line for the same
  condition**. Harmless duplicate (inferred from W:611-614, W:725/732).
- **Death while holding watcher.lock**: the lock file stays (no `finally` on a kill). A later
  watcher breaks it only if `proc.alive` answers `false`; with PowerShell failing it answers `null`,
  so the new watcher exits **75 after about 30 s** (L:1327, L:1377). That exit is a wake (section 8,
  D1b).
- Any exception in e5 is uncaught: `advanceFile` calls `lib.parseTranscript` with no `try`
  (W:202), so a transcript read error other than a vanished file (a sharing violation, say) ends the
  watcher with 70 "restart the watcher" (inferred; CONTRACT exit table line 103). The exit wakes the
  coordinator.

### 1.3 `--once`

Same lock, same evaluation, always counted (W:724-726), exits 0 when nothing is due. CONTRACT line
962 and spec line 12 give it to tests. While a watcher runs, `--once` cannot get watcher.lock and
exits 75 after about 30 s. Its tick obeys the M5 gap rule against the stored `last_tick_at`: two
`--once` calls less than 2Δ apart each count a hang tick however close together they are, and calls
more than 2Δ apart never count one. Nothing in production calls `--once` (grep of tcb and briefs);
the model need not carry it.

### 1.4 The model today

`tick()` M:447-477 is one atomic step: no keys, no acknowledgement of classes, the watcher exits (and
is removed, M:472) on any event, READY included, and wakes its parent. `tickEnabled` M:439-446
blocks a tick until every healthy current child has made a call (the timeliness assumption). No
`--once`, no coalescing, no start evaluation, no 70/75 exits.

## 2. The alarm, M1 (W:752-804)

### 2.1 Steps in order

| # | Step | file:line | Lock |
|---|---|---|---|
| a1 | `checkCe` → 64 | W:754 | none |
| a2 | thresholds, `realProc`, `sleepMs` = `--sleep-ms` or `alarm_ms` (1 h) | W:755-758 | none |
| a3 | read previous `alarm.json` (only reported, never acted on: nothing is killed) | W:759-764 | none |
| a4 | `selfInfo`: own pid and start time from its own clock (no PowerShell) | W:765, L:1171-1174 | none |
| a5 | **arm token** = sha256 of `run/acked.json` bytes, `null` when unreadable or absent; read **before** a6 | W:768, W:798-804 | none |
| a6 | `withRunLock` (ce re-checked inside): `writeAtomic(alarm.json {pid, start_time, ce, armed_at, sleep_ms})` | W:770-773 | run.lock |
| a7 | loop: `sleep(sleepMs)` | W:776 | none |
| a8 | `checkCe` → **64** (a newer ce) | W:777 | none |
| a9 | read alarm.json; not naming this pid+start (or unreadable) → **exit 0 `superseded`** | W:778-788 | none |
| a10 | token now = sha256(acked.json); equal to the last one → break → **exit 30** | W:789-790, W:794 | none |
| a11 | else keep the new token, `rearms += 1`, back to a7 (no write, no clock read) | W:791-792 | none |

`status --endturn` rewrites acked.json under the run lock with a new `at` (S:631), so every endturn
that is not refused changes the token. The alarm therefore exits 30 between one and two periods after
the last endturn. A refused endturn (`acked-ahead`, `acked-backwards`, S:627-628) and a `--dry-run`
endturn write nothing and do not re-arm.

### 2.2 Atomicity and death points

- The alarm is one background process started by one coordinator tool call. Only a6 is under the
  run lock. Between the tool call and a6 there is Node start-up plus a lock wait of up to about 30 s:
  during that window `alarm.json` still names the previous alarm (or nothing).
- An alarm that fails before a6 (64, 67, 75 lock busy) exits within seconds; the exit is a wake and
  the next reconcile asks again (self-healing as long as exits wake).
- Two alarms can coexist: the one whose a6 ran last is current; every other one exits 0 `superseded`
  at the end of **its own full sleep** (a9 runs only after a7), not when it is superseded. **Each
  superseded alarm is therefore one future wake, up to `alarm_ms` later.** The superseded check (a9)
  comes before the token check (a10), so a superseded alarm never re-arms.
- a9 treats an unreadable alarm.json (`cur = null`) as superseded (W:779-787): a transient read error
  ends a live alarm with exit 0. The exit wakes the coordinator, whose reconcile then finds alarm.json
  naming a dead pid and asks for a new alarm (inferred; self-healing).
- a10 with acked.json transiently unreadable gives token `null` ≠ last token: counted as a re-arm,
  the alarm sleeps one more period (W:800-803). It can only delay the alarm, never fire it early.
- An alarm can exit (30, 64 or superseded) **while the coordinator is in a turn**: the exit is then
  consumed by that turn as a notification (HARNESS-FACTS 2). If that turn dies before its endturn,
  the alarm is gone although the turn's reconcile saw it alive (section 3). This is one of the D6
  paths.
- After `handover.mjs raise` the old alarm notices the new ce only after its sleep (a8): it wakes the
  old coordinator up to one period later (D3's entry point, not this note's subject).
- Node timers across PC suspend: not known (CONTRACT §7 item 6). Either the period stretches by the
  suspend or the timer fires at resume; both only change when exit 30 comes.

### 2.3 The model today

`ALARM` and `FIX_ARM_BY_WRITE`: endturn (M:393-396) keeps a live alarm ("re-arms the live alarm by
writing its token") or else kills and starts one, inside the endturn step. `n.A` holds at most one
alarm per coordinator index. An alarm fires only while its coordinator is idle (M:532, "the alarm
period is longer than any turn") and is then removed. Not modelled: the start as the coordinator's own
tool call, registration (a6) as a separate step, **superseded alarms and their wake**, exit 64 on a
newer ce (handover kills the alarm instead, M:366), an alarm exiting mid-turn, start-up failures. The
token itself is abstracted to "may fire whenever the coordinator is idle", which over-approximates
wakes (sound for safety, optimistic for NoDeadlock).

## 3. `status --reconcile` (RC) and M2

### 3.1 RC steps in order (S:555-602; `main` S:758-789)

| # | Step | file:line | Lock |
|---|---|---|---|
| r1 | parse flags; `--reconcile` with `--endturn` → 66 | S:774-789 | none |
| r2 | `checkCe` → 64 / 67 / 2 no-coordinator | S:557 | none |
| r3 | thresholds, edge facts (`now`, `freeMb`), `realProc` | S:558-560 | none |
| r4 | `readTasks` → table0 | S:561 | none |
| r5 | **`proc.list()`** once; failure → `procList = null` + anomaly `proc-unavailable` | S:198-205 | none |
| r6 | parse every attempt's transcripts (spend, window) | S:220-232 | none |
| r7 | reconcile facts: for each row active/admitted, sessions found by **folder transcripts**; for older attempts with no session, likewise | S:235-247, S:251-259 | none |
| r8 | `withRunLock`: acquire run.lock (≤ ~30 s; a stale holder broken only if `alive === false`; a break appends `lock-break` and orphan incidents), ce re-checked inside | S:575, L:1463-1467 | run.lock |
| r9 | `applyReconcile`: per entry, >1 session → anomaly only; 1 session → `updateRow` CAS (current: expects step `admitted` at that epoch → `started` + session; older: sets `attempts[k].session`), then `appendLedger('started')`; a 65 (row moved) skips that row | S:263-317 | run.lock |
| r10 | `readTasks` again | S:578 | run.lock |
| r11 | `computeStatus`: coord.json (missing → 2, corrupt → 67), ledger, acked.json, **watcher.json and alarm.json via `readState` (corrupt → 67)**, `slotCount(pre.procList)`, reservation, variant, READY, `next` per row, wake-source liveness from **pre.procList**, orphans, intents, not_run | S:345-517 | run.lock |
| r12 | `checkFormat`; `assertHeld`; `writeAtomic(status.json)` | S:580-582 | run.lock |
| r13 | release run.lock | S:584, L:1470 | — |
| r14 | **`armAtStart`**: `readLoose(alarm.json)` (corrupt or absent → null); alive = (alarm.ce === ce) ? `aliveIn(pre.procList, alarm)` : false; `alive === true` → exit 0, else **exit 1 `alarm-missing`**, `result.arm = "alarm"` | S:586, S:593-602 | none |

`aliveIn` (S:126-132) returns `null` when the list is null, else whether a listed process has the
pid and a start time no later than the recorded one plus tolerance. The `--dry-run` form skips the
lock and every write but still ends in `armAtStart` (S:564-571).

### 3.2 M2: who starts the alarm, when, by what act

Nobody but the coordinator, by a **separate background tool call** `node tcb/watch.mjs --alarm
--root R --ce N` after it reads exit 1 / `result.arm = "alarm"` (S:589-592; spec status lines 68-75;
CONTRACT decision 40, lines 1146-1149). Endturn's `alarm-missing` asks the same (S:657). No script
starts it, by design (decision 5). The first turn of a coordinator is driven by the brief the owner
pastes: the only brief text that exists, `handover.mjs` `briefLine` (handover.mjs:351-354), says "run
`status.mjs --root R --ce N` and act on run/status.json": the **default build, not `--reconcile`**, so
M2's check never runs unless the coordinator knows better (D2).

The coordinator-level sequence of M2 is therefore four separate things:

1. tool call: `status --reconcile` (process; r1-r14);
2. the model reads exit 1 and decides (no tool);
3. tool call: start `watch.mjs --alarm` in the background;
4. the alarm process reaches a6 (asynchronous, seconds to ~30 s later).

### 3.3 Atomicity and death points

- r1-r7 and r14 run outside the lock; r8-r13 are one lock hold. The process list (r5) is taken
  **before** the lock wait and before r14's read of alarm.json, so the two can disagree. If an alarm
  started earlier in the same turn has written alarm.json but was not yet in the r5 list, or has not
  yet written alarm.json, reconcile says alarm-missing and a second alarm gets started; the first
  becomes superseded and costs one wake about `alarm_ms` later (inferred; bounded).
- Death inside r9 between `updateRow` and `appendLedger('started')`: the row is `started` with no
  `started` line, and no later reconcile writes one (it only looks at `admitted` rows). A ledger gap,
  no wake effect.
- Death after r12 and before the exit is read: status.json is new, the coordinator never saw the
  arm request; it is dead anyway.
- **Death between step 1 and step 3** of 3.2 (the turn ends, errors, or the model simply does not
  make the call): no alarm. If the watcher has exited too (it usually has: its exit is what started
  the turn), **no wake source is left**. This is the M2 gap (r3 `arm-start-can-die`: NoDeadlock and
  AlwaysCanResolve fail in 9 of 43 parts within 2 steps, `model-review/r3/sum-arm-start-can-die.json`).
- A first turn that dies before its first tool call, or a coordinator that never runs reconcile
  (D2), leaves the same state.

### 3.4 Unknown and missing cases

| Case | What the code does | Where |
|---|---|---|
| process list unavailable | `procList = null`; slots counted unknown; `watcher.alive`, `alarm.alive` false; **always exit 1 alarm-missing** | S:198-205, S:596 |
| alarm.json absent | exit 1 alarm-missing | S:594-600 |
| alarm.json of another ce | exit 1 | S:595 |
| alarm.json corrupt | **r11 throws 67 under the lock: reconcile exits 67, status.json not written, the arm request never issued** (r14 alone would have said missing) | S:354, S:105 |
| watcher.json corrupt | same: 67 at r11 | S:353 |
| coord.json missing / corrupt | 2 / 67 at r2 | S:557 |
| run.lock held by a dead holder and process list unavailable | the holder cannot be judged dead (`alive` null); **75 after ~30 s, no arm request** | L:1327, L:1377 |
| several transcripts for one admitted folder | anomaly `several-sessions`, row left admitted | S:266-269 |
| transcript not yet on disk (lag) | row left admitted; next act `start-session` → a second start possible (D4b, not this note) | S:238-239 |

### 3.5 The model today

`reconcile()` M:183-190 runs inside the wake step (M:539), reads true session existence (`cur(n,f)`),
and has a COMMIT branch the code lacks (M:188, flagged in `done/model-fidelity.json` model_errors).
M2 is `FIX_ARM_AT_START` at M:539: `n0.A.push(i)` in the same atomic step as the wake, when no alarm of
index i is in `n.A` (true state, no process list). Gaps: (a) the arm is a separate tool call that a
dying turn can miss; (b) unknown liveness always asks for an alarm (D1); (c) the alarm registers
asynchronously; (d) superseded alarms wake; (e) the arm request is lost on 67/75; (f) the check runs
only at turn start, so an alarm that expires during the turn is not replaced until endturn.

## 4. Watcher class 17 act-due, M3 (W:543-567, rowAct W:132-168)

### 4.1 The predicate and what it reads

Slots: `used = live + unknown + unconfirmed` of `lib.slotCount(rows, [], tr, {root})` with an
**empty process list** (W:546-553). With `[]` no process ever matches, so the current attempt of an
active row at admitted/started/bound and the last attempt of a committed row count as `unknown`, an
attempt with stop `unconfirmed` counts, and any other not-confirmed attempt counts only if a
transcript of it exists (L:3063-3101). `slotFree = used < N_max`; on an exception `used = ∞`.
`blocked` = runFlags halted or draining (W:555).

Per row (`rowAct`, W:135-168), first match:

| Row | Act raised |
|---|---|
| failed, or `limit` | none (owner's) |
| planned/none | `replace-fence` if slotFree and not blocked |
| active or parked / stopped | `replace-start` if slotFree and not blocked |
| fenced, or committed/bound | `stop-request` |
| stop-requested | target k = e (committed) or e−1; a sample file `run/stop-sample/<task>-e<k>.json` with integer tick → `stop-verify@<tick>` only once `tick ≥ sample.tick + stop_verify_deltas`, else none; no sample: stop `unconfirmed` → `stop-verify@-`; `none`/`requested` → `stop-session` |
| admitted | `bind` if `transcriptsForFolder` finds a transcript, else `start-session` |
| started | `bind` |
| otherwise | none (READY is class 11) |

Run level: draining and `used === 0` → `handover` (W:564); a non-empty table, all rows terminal, no
row act → `run-terminal` (W:565-567); an `event` line above acked_seq whose ident is no longer present
→ `events` with the seqs (W:587-597).

Reads: tasks.json, the ledger (runFlags, event lines), acked.json, `run/stop-sample/*`, the
transcripts root (folder search), thresholds `N_max`, `stop_verify_deltas`. It does **not** read
`zombieOver` (status's `nextOf` returns `owner` for it, S:523), status.json, the real process list, or
memory.

Differences from status's `nextOf` (S:520-551), all inferred from reading both: (1) zombie spend over
Z: status says `owner`, the watcher may still raise a row act; (2) `replace-*` needs a free slot by
the empty-list count, status's needs none; (3) stop-verify waits for `stop_verify_deltas` ticks in
the watcher only; (4) `admitted` with a transcript is `bind` here, `start-session` in status (reconcile
makes it `started` first). CONTRACT decision 40 states (2)'s direction: "it can only find a slot free
too early, which costs one acknowledged wake" (line 1157-1158).

### 4.2 Raising and acknowledgement

Each condition's key is `17|<task or ->:<act>|<epoch or ->|<onset_tick>` (W:583-585, CONTRACT §3.10
lines 418-427). New ident → one `event` line (class `act-due`, non-urgent) appended under the run
lock (W:612-620, W:627-637). The key is **due** while its event seq > acked_seq (W:645-649). 17 is
non-urgent, so it waits in `pending` until `tick − first_tick ≥ coalesce_ticks` (2 ticks, about
2 min), unless an urgent class is due in the same tick (W:650-663). Exit 17 is last in precedence
(W:24).

Acknowledgement is `status --endturn --acked-seq K` (S:606-659): under the run lock, K must lie
within [stored, head] (S:627-628) and `acked.json` is rewritten (S:631). K is **chosen by the
coordinator**; nothing checks that K is the seq it read at the start of the turn (R6's ACK_READ). One
K acknowledges **every** event ≤ K, urgent ones included. After the ack the key stays in `active`
while the condition persists and is silent; it raises again only if the condition is absent for one
evaluation (new onset) or the act changes (new ident). A new watcher's start evaluation drops acked
keys from `pending` (W:649-659) and exits at once for ripe unacked ones.

### 4.3 Acknowledged and then dead before acting

The ack is the endturn, which is the turn's last act, so "ack then die before acting" means one of:

1. **The turn reaches endturn without having done the act** (the model skipped it, an act refused
   with 75 lock-busy or `proc-unavailable`, admission deferred for memory). The act-due key is now
   acked and silent while the condition lasts. The watcher, once restarted, stays quiet about it.
   The only remaining wake is the alarm, which this endturn just re-armed: it fires **one to two
   `alarm_ms` later** (1-2 h); the next turn reads status.json `next` and acts. Liveness then rests on
   a live alarm.
2. **The turn dies after endturn and before starting the watcher (and the alarm if missing)**. Same
   as 1 for the condition; if the alarm was also missing (endturn said so) there is **no wake
   source** (D6).
3. **The turn dies before endturn**: nothing is acked; the watcher that woke it has exited; the alarm,
   if alive, fires after one to two periods; the next turn's endturn says watcher-missing; the new
   watcher's start evaluation exits at once on the ripe unacked keys. Live, slowly.

So M3 guarantees a wake for an **unacknowledged** act; an acknowledged act that was not taken waits
for the alarm, and with no live alarm it waits for the owner.

### 4.4 The model today

`FIX_WATCHER_ACTIONABLE` (M:57, M:425-438, used at M:469): `actionable(n, P)` is evaluated on the
true global state, with `admitCount` reading true process liveness (M:241-248), at every tick; it is
**level-triggered**: no keys, no onset, no ack silences it (only ledger events have an ack). A row
the coordinator could not act on would make the watcher exit at every tick; the model never shows the
code's silence after an ack. The model's plans (M:198-227) always contain every due act, so "the turn
skipped an act" does not exist there; an op refused for lock-busy does not exist either. Coalescing
is not modelled (untimed: harmless).

## 5. The hang counter, suspicion and D5 (W:339-421)

### 5.1 Steps (per row active at started or bound, each evaluation)

1. `ts` = stored task state; missing or another epoch → `freshTaskState`, `fresh = true` (W:349-355).
2. Transcript set: session main + helpers, else folder transcripts (W:234-266); each file advanced
   from its stored `end_byte` (W:192-227). A **call** = a distinct assistant `message.id`
   (L:2481-2589); a call split across the parse boundary is `continued` and not new (W:206-212).
   File growth that adds no new message id (a streamed continuation, tool-result lines, progress
   records) adds **no** call.
3. `newCalls = fresh ? 0 : max(0, calls − ts.calls)` (W:375).
4. `newCalls > 0` → `hang_ticks = 0`; else if counted and not paused → `hang_ticks += 1`
   (W:398-399). Note: on a fresh state `newCalls` is forced to 0, so **the first counted tick of every
   new epoch adds one hang tick** whatever the child did (inferred bug; it costs one tick of h).
5. READY of this epoch (class 11 or 12) voids 20, 21 and 22 for the row (W:404-422).
6. `hang_ticks ≥ hang_ticks` (10) → class **21, urgent**: exits this tick (W:420).

With Δ = 60 s and h = 10, any stretch of about 10 minutes of wall time with no new assistant message
in the attempt's transcripts is a hang.

### 5.2 D5: healthy calls suspected

Cases the code suspects although the child is healthy (inferred from the steps above and
HARNESS-FACTS 2, 5):

- one long tool call (a Bash command can run 10 min, a build, a test suite) plus the model call
  around it;
- one long model call (long output or thinking), recorded only when the message is complete;
- **a child that ends its turn waiting for its own background command or helper**: it makes no call
  at all until the notification arrives;
- harness retries or rate-limit waits (no record written);
- transcripts not found (the folder-to-project naming is a needs-app item, CONTRACT §7 item 7): every
  attempt hangs after h ticks;
- a pause the M5 rule misses (section 6).

The cost: a suspicion leads to a fence for reason `hang`, which charges one restart; with R = 1 the
second false suspicion takes the limit path and the task fails (CONTRACT §3.6; fidelity extra_flaws).

### 5.3 The model today

`tick()` M:458-465: `s.mv` (a card) or `s.nc` (calls) reset `hs`; otherwise `hs += 1` unless
`FIX_PAUSE_DISCOUNT && s.pu`; `hs ≥ H_HANG` (2) → event, `NoFalseSuspicion` if the child is `MODE.OK`.
`tickEnabled` (M:439-446) forbids a tick until every healthy current child has moved or called, which
removes D5 by assumption. Without it NoFalseSuspicion fails in 43 of 43 parts within 4 steps (r3
`no-timeliness`: 26 parts complete, 17 BOUNDED, `model-review/r3/sum-no-timeliness.json`). A slow
healthy child exists only as fault `cs` (MODE.STUCK), so it is charged to the fault budget.

## 6. The pause discount, M5 (W:339-345, W:399; CONTRACT §1.2 lines 59-64)

### 6.1 Steps

`prevMs` = `Date.parse(state.last_tick_at)` (the stored `now` of the **previous evaluation**, any
watcher, counted or not); `nowMs` = this evaluation's edge `now` (read once per tick, W:733);
`paused = counted && both finite && Δ finite && nowMs − prevMs > 2Δ` (W:342-345). A paused tick leaves
`hang_ticks` unchanged; new calls still reset it; `ticks_total` and every other counter still advance
(W:398-399). `last_tick_at` is written at the end of each evaluation (W:666).

### 6.2 Exactly which pauses it misses

The gap is `Δ + (evaluation time) + (whatever the suspend adds to the sleep)`. What the suspend adds
depends on how a Node `setTimeout` behaves across a Windows suspend, which is **not known** (CONTRACT
§7 item 6). Both branches:

- **(a) the timer counts only awake time**: the sleep after resume still runs its remaining awake
  time, so the gap ≈ Δ + suspend. A suspend `s > Δ` is discounted; **a suspend `s ≤ Δ` (about 1 min) is
  missed**. But in this branch the child also had about Δ of awake time between the two ticks, so a
  missed short pause does no harm (inferred).
- **(b) the timer counts suspend time too** (fires at resume when overdue): the gap ≈ max(Δ, time
  since the previous evaluation). A suspend `s` that falls inside one sleep gives a gap of about
  max(Δ, s + awake part): **a suspend of up to about 2Δ (2 min) is missed while the child had as little
  as zero awake time in the window**. This is the harmful miss (r3 `pause-short`: NoFalseSuspicion
  fails in 2 of 43 parts within 6 steps, `model-review/r3/sum-pause-short.json`).

Also missed or mishandled, in either branch:

- **several short suspends**, each under the threshold, in consecutive ticks: each counts; ten of
  them make a hang (an idle laptop that dozes and is nudged awake);
- a suspend that **straddles two evaluations** splits its length over two gaps, each possibly under
  2Δ;
- a **freeze of the child alone** (Windows efficiency mode or throttling of `claude.exe`, the network
  down, the API stalled) while the watcher runs: no gap at all;
- the very first counted tick after a missing or unparseable `last_tick_at`: counted;
- a **wall-clock step forward** of more than 2Δ (time sync) on a normal tick: discounted although
  nothing paused (one-sided, by design: it can only withhold);
- a step backward: negative gap, counted (by design).

### 6.3 The model today

The pause fault (M:550-555) sets `s.pu = 1` on every live child; the tick discounts exactly those
children's hang (M:461) and clears `pu` (M:467). The model detects every pause of any length, by
reading the fault itself: an oracle (fidelity `fixes_modelled_as_oracles`).

## 7. `status --endturn` (S:606-659)

### 7.1 Steps in order

| # | Step | file:line | Lock |
|---|---|---|---|
| t1 | `--acked-seq K` must be an integer ≥ 0 → else 66 | S:608-609 | none |
| t2 | `checkCe` → 64 | S:610 | none |
| t3 | thresholds, facts, `realProc` | S:611-613 | none |
| t4 | **`proc.list()`** once; failure → null | S:614-620 | none |
| t5 | `withRunLock` (ce re-checked): read ledger head and stored acked_seq; K > head → refusal `acked-ahead`; K < stored → `acked-backwards`; else `assertHeld` and **`writeAtomic(acked.json {ce, acked_seq: K, at: now})`** (this is the alarm's arm token) | S:622-638 | run.lock |
| t6 | a refusal → exit 1, nothing written, no wake check | S:639-641 | none |
| t7 | read watcher.json and alarm.json with `readState` (**corrupt → 67, after acked.json was already written**), watcher.lock with `readLoose` | S:644-646 | none |
| t8 | watcher counted only if watcher.json ce = ce **and** watcher.lock names the same pid and start time; alarm counted if alarm.json ce = ce; liveness via `aliveIn(t4 list)` | S:647-650 | none |
| t9 | either liveness `null` (list unavailable and the record present) → **exit 2 `proc-unavailable`** | S:652-654 | none |
| t10 | else exit 0 when both alive, else 1 with `watcher-missing` and/or `alarm-missing` | S:655-658 | none |

### 7.2 Atomicity, death points, unknown cases

- Only t5 is under the lock; the wake check (t7-t10) reads files after the release and uses a list
  taken before the lock. Endturn starts and kills nothing (S:11; decision 5): starting the watcher
  and/or the alarm is again the coordinator's own **later tool calls**. A turn that dies after t5 and
  before those calls has acked its events and started nothing.
- **Exit 2 hides `alarm-missing`**: when the watcher record matches (or the alarm record exists) and
  the list is unavailable, t9 returns before t10, so a missing alarm (absent alarm.json) is not
  reported (S:652-654; inferred consequence). What the coordinator should do on exit 2 is written
  nowhere (D2).
- When the list is unavailable and **both** records are absent or mismatched, liveness is `false`, not
  `null`, and the exit is 1 with both reasons (S:649-650).
- A watcher that ended normally removes watcher.lock (W:743), so `wFiles` is false: watcher-missing,
  correctly. A watcher killed hard leaves watcher.lock: with a list, judged dead → missing; without
  one → exit 2.
- K is the coordinator's choice; the script checks only its range (S:627-628).

### 7.3 The model today

`OP.E` (M:377-401): one atomic step that starts the watcher itself (under WATCHER_LOCK: only if no
holder) and keeps or starts the alarm, then sets `n.ack = c.rd` (ACK_READ) and ends the turn. Gaps
(fidelity model_errors 6): endturn only checks; the starts are later tool calls a dying turn can miss;
exit 2; K chosen by the coordinator; a corrupt state file (67) after the ack.

## 8. The open defects

### D1: wake loop when the process list is unavailable (S:198-205, S:593-601, W:776-788)

Mechanism as built. While PowerShell fails, every reconcile exits 1 alarm-missing (`aliveIn(null, …)`
is null, S:128, and `alive === true` is false, S:596). Each turn, if the coordinator obeys, starts a
new alarm; each new alarm registers and supersedes the last; **every superseded alarm exits 0 at the
end of its own full sleep, and that exit is a wake**; the turn it starts reconciles, still sees no
list, and starts another alarm. So:

- it is **not an untimed busy loop**: each link waits `alarm_ms` (1 h). NoBusyLoop as defined (a cycle
  of untimed coordinator steps) would not catch it;
- it never quiesces while the list stays unavailable: there is always at least one pending wake
  per `alarm_ms`, even with nothing to do, each turn costing a full coordinator read of its window
  (inferred cost);
- every *other* wake (a watcher exit, a child's note) also starts an alarm, so the number of live
  alarm processes grows with the turn rate: about (turns per hour) alarms alive at once, each a Node
  process (inferred; memory not measured);
- when the list comes back, reconcile sees the newest alarm alive and asks for none; the outstanding
  superseded alarms each exit once more and the chain drains: **finite after recovery**.

D1b, a sibling (inferred, depends on the brief): with the list unavailable, a watcher killed hard
leaves watcher.lock, which no one can break (`alive` null). Endturn exits 2; if the coordinator then
starts a watcher, it exits 75 after about 30 s, which wakes the coordinator, whose endturn exits 2
again: a loop with a period of about 30 s plus a turn. Likewise a stale run.lock makes reconcile,
endturn and the alarm all exit 75 (section 0).

The model has no process-list state and no superseded alarm, so D1 cannot appear (fidelity
`fixes_modelled_as_oracles`, FIX_ARM_BY_WRITE "only half modelled").

### D2: no brief carries R6's acts

`tcb/briefs/` holds checker, child, fmea, fresh-reviewer, mapper, reader, scorer and stpa briefs: no
coordinator brief. `tcb/agents/` holds checker and reader. A grep of both (and of `spec/briefs.md`) for
`reconcile`, `alarm`, `endturn`, `act-due`, `exit 17` and `--once` finds nothing. The one coordinator instruction the scripts emit is
`handover.mjs` `briefLine` (handover.mjs:351-354): "run `status.mjs` (default build) and act on
run/status.json". So today nothing tells a coordinator to (1) run `--reconcile` first, (2) start the
alarm on exit 1 / `result.arm`, (3) start the watcher and/or alarm on endturn's missing reasons, (4)
what to do on endturn exit 2, (5) which K to pass (the seq read at turn start), (6) act on
status.json when the watcher exits 17. Every M1-M3 guarantee above assumes these acts; the model
assumes them by construction (plans always run reconcile, M:539; endturn arms, M:393-396).

### D5: see section 5.2. D6: one dead turn leaves no wake source

Paths that leave no live watcher and no live alarm, all with one fault or one model omission:

1. a first turn that dies before reconcile (or never runs it, D2);
2. death between reconcile's exit 1 and the alarm start (3.3);
3. death between endturn and the watcher/alarm starts when the alarm was missing (7.2);
4. the alarm exits (30) during a turn, the turn dies before endturn (2.2);
5. D1 or a stale lock making reconcile exit 67/75 instead of asking (3.4);
6. the session's `claude.exe` crashing, if its background commands die with it (unknown, section 0);
7. a host reset (every process dies; HARNESS-FACTS 8 sleep is different: processes resume).

Nothing outside the tree notices; the owner is the only recovery (`ownerLegit`, M:578-581, counts an
owner wake only after two lost wakes or a reset).

## 9. Recommended abstraction for the as-built model

The checker is explicit-state, so I keep a step separate only where a death, a fault or another
process between the two parts changes an outcome the properties see.

| Mechanism | Keep as separate steps | Merge safely | Why |
|---|---|---|---|
| M2 arm | (1) wake + reconcile + plan (existing step) returning `arm` (alarm missing by the **reconcile's view**: `!A.includes(i) || pl === 0`); (2) a new op `ARM` placed first in the plan, before which fault x may fire (macro M:416 already tries x before every op, no new yield point needed) | the alarm process start and its a6 registration | the death window is the defect; registration lag only adds an extra superseded alarm, which (3) below covers |
| Alarm records | `A` as a list of `{par, sup}`; starting an alarm while one of `par` exists marks the old one `sup = 1`; a `sup` alarm's only step is "exits 0, wakes par" (allowed mid-turn: the turn consumes it, M:89) | re-arm by token: keep "a current alarm may fire only while its coordinator is idle" (M:532) | the token only delays firing; over-approximating firing is sound for safety. Cap: a new safety property **AlarmsBounded** (at most 2 alarm processes per ce); the first violation stops the path, so the list never exceeds 3 and the space stays finite. D1 then shows as a finite counterexample |
| Process list | one global bit `pl` (1 = available) and a budgeted fault `u` that sets it to 0, plus a recovery step (environment, not weakly fair) that sets it back | lock-breaking effects of `pl = 0` (stale locks unbreakable) can be left out in a first cut; add later as "a dead watcher's lock blocks the next watcher: it exits 75 (a wake)" | reconcile (always `arm`), endturn (exit 2) and admission (R10: nothing admitted with no list) are what D1 and M4 need |
| Endturn | `E` = check + ack (`ack = c.rd`) + the reasons; then ops `SW` (start watcher) and `SA` (start alarm), each only if E said missing, each preceded by the x fault | the start of a watcher and its lock take | the watcher's start evaluation re-reads everything, so nothing between E and SW changes an outcome except the death; exit 2: two config branches (B1 treat as missing, B2 start nothing) until D2 rules (the owner's question) |
| M3 | per row a 3-bit `ad` = the act last raised (0 none), plus one bit each for `handover`, `run-terminal`; tick: condition present and `ad ≠ act` → append an event (`seq++`), `ad = act`, exit; condition absent → `ad = 0`; the act's predicate computed from the **table** (rows + `z` flags) with the empty-list slot count, not `liveCount` | coalescing; the separate `events` orphan act (the existing "events after ack" check covers it) | this restores edge-triggering and ack-silence, which is where "acked, not acted, alarm-only" lives; a skipped act needs the plan generator to allow omitting a due act (budgeted as fault `o`, "the model omits an act") |
| M5 | the pause fault in two kinds: long (sets `w.gap = 1` on every watcher and `pu` on children; the tick discounts when `w.gap`) and short (sets `pu` only; the tick counts). Branch (a)/(b) of 6.2 = short kind off/on | the discount as a property of the watcher (`w.gap`), not of the child (`s.pu`) | the discount must read only what the watcher can see |
| D5 | a healthy `SLOW` child mode (planned budget `s`, not a fault): a tick may run while the child is slow; it returns to OK by an environment step | — | removes the timeliness oracle for exactly one budgeted slow call per run, keeping the space finite (no-timeliness without a budget was BOUNDED in 17 parts) |
| Watcher crash / 70 / duplicate events | leave out | — | they add wakes or duplicate lines, never remove one |
| `--once` | leave out | — | test only |

Merges that are **not** safe: reconcile with ARM (hides D6 path 2), endturn with its starts (hides
path 3), M3 on true state (hides the empty-list error and the zombie difference), M5 on `s.pu`.

## 10. Candidate fixes (one line each; notes for a later design)

- **D1** — an *unreliable failure detector* used to drive a non-idempotent act (start another
  process). Borrow **leases** (Gray and Cheriton 1989): the alarm records `armed_at` and renews a
  `renewed_at` at each period; reconcile treats an alarm as alive when the list says so or, with the
  list unknown, while `now < renewed_at + sleep_ms + slack` (a one-sided wall-clock use like M5), and
  never asks for a second alarm while a lease is valid; plus a hard cap (`alarm.lock` held for life,
  like watcher.lock) so at most one alarm per ce can register.
- **D5** — *timeout-based suspicion of slow but correct processes* (Chandra and Toueg's ◇P;
  heartbeat and φ-accrual detectors, Hayashibara 2004). Borrow a **heartbeat on any progress
  evidence** (transcript bytes, a tool-use or tool-result record, a helper transcript) plus an
  **adaptive timeout** that doubles h after each suspicion later shown false (the standard ◇P
  construction), and a declared wait lease when a child ends its turn awaiting its own background job.
- **D6** — a missing *watchdog / dead-man's switch* outside the supervised system (the hardware
  watchdog; Erlang/OTP heart). Borrow an **external watchdog**: a Windows scheduled task (not a
  session, not in the tree) reads `watcher.json last_tick_at`, `alarm.json` and its lease every
  15 min and alerts the owner when neither wake source is fresh. The classical assumption that fails:
  the watchdog cannot restart the supervised process (only a session can wake a session), so its
  action is an alert, and R6's bound must count the time to the owner.
- **M2 gap** — the *lost wake-up* problem (check-then-arm is not atomic, as in sleep/wakeup without a
  condition variable). Borrow the condition variable's **atomic wait-and-release**, as near as the
  harness allows: make the arm the turn's first tool call, unconditionally (`watch.mjs --alarm` as
  the very first background command; the newer alarm supersedes), and make a superseded alarm notice
  within seconds (poll alarm.json), so its exit lands inside the current turn and is consumed; the
  window shrinks to "dies before the first tool call", which D6 covers. Inferred risk: a turn shorter
  than the poll period turns that exit into a new wake.
- **M3 gap** — *at-most-once delivery*: the ack can precede the act and then silences it. Borrow
  **at-least-once delivery with a visibility timeout** (message queues): an acked act-due whose
  condition still holds after `T` ticks is raised again with a new key, and the ack names the keys
  acted on rather than a global seq.
- **M5 gap** — a *threshold timeout used as a pause detector*. Borrow **suspend-aware clocks**: compare
  a clock that runs through suspend with one that does not (Windows `QueryInterruptTime` against
  `QueryUnbiasedInterruptTime`; Linux `CLOCK_BOOTTIME` against `CLOCK_MONOTONIC`), or read the
  Kernel-Power suspend and resume events for the tick's window, and count hang in awake time; no
  threshold, so short and repeated suspends are measured, not guessed.

### Notes for myself (design round)

- D1 and M2's fixes interact: an unconditional first-call arm makes D1's "each turn starts an alarm"
  the normal case, so it is only safe with the fast superseded exit. Check under the model that the
  fast exit is always consumed (needs a timing assumption: turn length > poll period; state it as R6
  text and as a model reading, both branches).
- Who runs each: reconcile and the alarm are scripts (the lease rule needs `alarm.json` schema +1 and
  a renewal write under the run lock each period); the watchdog is the owner's scheduled task
  (installing it needs the owner's word, HARNESS-FACTS 12); the arm act and the K choice are the
  coordinator brief (D2), and nothing stops the work if the brief is ignored except the watchdog.
- The first-tick-of-epoch hang increment (5.1 step 4) is a one-line fix (`if (fresh) skip`); report it
  with D5.
- Endturn exit 2 hiding alarm-missing (7.2) and reconcile 67 on a corrupt alarm.json before the arm
  check (3.4) are small script defects to list for the script-change table.
