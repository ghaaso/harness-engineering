# REFUTE-wake-2: second pass on FIX-wake revision 2 (label `refute-wake-2`, round 3, 2026-11-17)

Subject: `model/as-built/FIX-wake.md` revision 2 (585 lines), checked against its revised steps, not
its change log, and against `tcb/`. `W:` = `tcb/watch.mjs`, `S:` = `tcb/status.mjs`, `L:` =
`tcb/lib.mjs`, `G:` = `tcb/guard-hook.mjs`, `FX:` = line of the revised FIX-wake.md. No script or
model was run. "Inferred" = reasoned, not checked.

Script facts newly checked for this pass:

- **The coordinator chooses every flag of every tcb script it runs.** The coordinator profile allows
  Bash/PowerShell in the `tcb-node` grammar (`tcb/profiles/coordinator.json`, `"bash": "tcb-node"`);
  that grammar checks only `node`, the script path and shell metacharacters (G:315-352). It does not
  filter arguments. So the coordinator can pass the test flags `--now ISO`, `--sleep-ms`,
  `--interval-ms`, `--free-mb` (W:2-4, W:42-43, W:879-880).
- **`--now` fixes the clock for the whole process.** `edgeFacts` returns `flags.now` when it is given
  (L:407-411), and the watcher re-reads `edgeFacts(flags)` each tick (W:725-733). So `now` is the same
  constant on every tick, and `last_tick_at` stays frozen.
- The coordinator cannot write under `run/`: its `write_prefixes` are all under `plan/`
  (profiles/coordinator.json). `run/turn.json` and `run/arm/*` can therefore be written only by the
  scripts it runs.
- No alarm marks its record when it exits (W:775-795): the record of a fired, superseded or 64 alarm
  stays as it was.

---

## 1. Earlier points, checked against the revised steps

| Point | Now | Why (revised step) |
|---|---|---|
| A1.1 PowerShell in hold 1 | **closed** | FX-W1 step 1 and FX-W2 steps 3-4 judge liveness outside the lock and re-read the bytes inside (FX:77-81, 148-154). |
| A1.2 lease vs R5 / suspend | **closed (L1), partly (L2)** | L1 uses no lease. L2's R5 sentence (FX:49-57) states the suspend effect. Still open: the `--now` forgery (B2.6). |
| A1.3 renewal skipped → hook denies | **closed** | The hook reads `turn.json`, not a lease (FX:238-241). |
| A1.4 stale wake sooner | **designer right; residual small** | See section 3. |
| A1.6 | answered | — |
| A1.7 smallest | closed | Beats only in L2. |
| A2.1 nonce reuse | **partly** | Reusing a *confirmed* nonce now fails. Reusing a nonce whose outcome was **never confirmed** (the earlier turn died before reconcile) is still confirmed by reconcile step 6 (FX:160-163): B2.2. |
| A2.2 late present chain | **mostly closed** | Retry cut; abandoned ensures exit only into the next turn's reconcile or after `alarm_ms` (FX:168-171). A new timing hole: B2.3. |
| A2.3 lock contention | closed | Holds are file-only. |
| A2.6 three ordered acts | **partly** | Revocation is now free. A turn that never confirms creates no work, and nobody tells the owner when an alarm is still alive (B3.2). |
| A3.1 guard blocks stops | **closed** | Revocations are never gated (FX:245). The model property RevocationNeverGated is to be checked. |
| A3.2 hook/script divergence | **closed** | One file predicate. |
| A3.3 lock hold growth | closed | — |
| A3.4 transcript-tail boundary | **closed by withdrawal** | The turn is the `turn.json` bracket. The bracket has its own hole: B1.1. |
| A3.5 K and ce | closed | `turn-stale`, K = `read_seq` (FX:246). The two-reconcile limit is stated. B1.4 adds a new effect. |
| A3.7 fence interaction | closed | FX:267-270. |
| A4.1 watcher counted fresh | **closed** | The dead-man judges "an alarm of this ce alive" (FX:301-303). |
| A4.2 PC sleeps first | **still open** | The onset argument misreads H7: B4.1. |
| A4.3 alert reach | open (unverified) | NotifyIcon from a scheduled process is still unchecked. |
| A4.4 common mode | open (recorded) | — |
| A4.6 thresholds | closed | Runs counted, one watcher lease. |
| A5.1 cap | **closed** | `min(15·2^b, 60)` ticks, `b ≤ 2` (FX:373-375). |
| A5.2 owner rows | **closed** | `rowAct` null for zombie-over (FX:369-371). |
| A5.3 re-raise vs guard | partly | Hourly turns that cannot act. The FX-W4 alert claimed for this state (FX:385) does not fire while an alarm lives (B3.2). |
| A6.1 idle ping loop | **closed** | Ping withdrawn, `idle_ticks` 30. A new cost: B5.3. |
| A6.2 ping disturbs | closed | Withdrawn. |
| A6.3 never-suspected waiter / imitation | **partly** | Every kind is finite. A child can hold a slot with about one call per `bg_ticks` (60 ticks), six times looser than as built (10): B5.2. |
| A6.4 never fenced without ping | **closed** | No precondition. |
| A6.5 refunds unbounded | **closed** | Cap 1; RestartLimit restated as a count (FX:431-434, 445-447). |
| A6.6 resume → common cause | closed | Counted in ticks. |
| A6.7 H5 | answered | Falls back to `model`. |
| A7.1 assertHeld not a fence | **closed** | Break and check+write share the run lock (FX:478-486). |
| A7.2 wall lease on resume | closed (L1), stated (L2) | — |
| A7.3 thresholds | closed | — |
| A7.4 who restarts | **closed as a stated latency** | L1 is alarm-paced, with an FX-W4 alert. |
| X1-X4 | closed | X4: "armed" is one predicate, but it is not "a wake is pending" (B1.1). |

---

## 2. Attacks on what is new

### B1 `run/turn.json` and the gate (FX-W2 step 5-6, FX-W3)

- **B1.1 A stale `confirmed` from a dead turn arms the next turn (2 faults).** Only endturn turns
  `confirmed` into `spent` (FX:240-241). Schedule:
  1. T1 confirms (alarm A registered) and dies before endturn (x).
  2. A fires, which wakes T2 and consumes A (S1).
  3. T2 skips the ensure and reconcile. A session need not follow its brief, so this is free.
  4. T2 runs `replace start`: the gate reads T1's `confirmed` and allows it (FX:238-239).
  5. T2 ends without endturn, or dies (x).

  Result: work created and no alarm. If the watcher had exited, there is no wake source at all
  (NoDeadlock). The bracket "reconcile..endturn" is not the turn when a turn dies inside it. The
  designer's "confirmed proves that a registration or a present alarm was seen this turn" (FX:256-258)
  is false here: it was seen in T1.
- **B1.2 `confirmed` does not mean an alarm is pending, even within the turn.**
  - The coordinator can start the ensure with `--sleep-ms 0` (B2.6). It registers, the reconcile
    confirms, and the alarm exits 30 at once, inside the turn.
  - Branch L1 during a list outage: the record of an alarm that already fired (no tombstone, see the
    script facts) is judged `unknown` → alive, so the ensure says `present` and the turn is confirmed.
    This happens after **every** alarm firing during an outage, with one fault (u). The run then has
    no alarm until the list returns or FX-W4's `runs_no_list ≥ 3` alert.
- **B1.3 The hook and the script read at different moments.** The script reads under the lock; the
  hook reads before the session-start call. With parallel tool calls in one message (endturn and the
  session start together), the order is undefined. This is benign: either reading is a real state of
  the bracket. No break.
- **B1.4 A second reconcile in one turn disarms the turn.** Hold 1 always writes `arm: unconfirmed`
  (FX:157). The re-check of its nonces then sees `confirmed`, which counts as "reused" and fails
  (FX:162). With no `--arm-nonces`, the slot count stays short. Either way a refresh of status.json in
  mid-turn, which is a natural coordinator act after `replace`, turns the rest of the turn's
  work-creating acts into exit 6. This is not a safety break, but a stall trap the brief must name. The
  smaller fix: hold 1 keeps an existing `confirmed` of the same ce whose nonces it is not given.
- **B1.5 Can the coordinator write `turn.json` itself?** Not directly: `run/` is outside its write
  prefixes. Indirectly yes: through reconcile with chosen nonces and flags (B2.2, B2.6).

### B2 The nonce file and abandoned ensures

- **B2.1 Who can create `run/arm/X.json`:** only an ensure process, by exclusive create (FX:145-147).
  A turn that dies after creating it: the ensure finishes alone, and the file stays
  `registered`/`present`, never confirmed.
- **B2.2 That unconfirmed file can be confirmed later by a reused nonce (2 faults).** Schedule:
  1. T1's ensure X registers alarm A; T1 dies before reconcile (x).
  2. A fires, which wakes T2 and consumes A.
  3. T2 starts the ensure with the same X, which exits `nonce-reused`.
  4. T2's reconcile with X finds `registered`, with ce equal, and confirms it (FX:160-161).
  5. T2 works, ends, and the watcher dies (x).

  Result: no source. Exclusive create stops a second *registration*, not a second *confirmation*.
- **B2.3 The confirmation deadline is shorter than one process query.** The ensure queries
  PowerShell before hold 1 (step 3), up to 30 s per occupied slot (L:2755-2759): 60 s at S2.
  `arm_confirm_ms` is 30 s (FX:160). Exactly when the list hangs (D1's condition), every ensure is
  still in step 3 at the deadline, so every turn is `arm-unconfirmed` and no work is created for the
  whole outage. This holds in L2 too, where the lease could decide without PowerShell. It is a liveness
  degradation, alerted only through `runs_no_list`.
- **B2.4 The released abandoned exit races `release_ms`.** An abandoned ensure polls every 2 s and
  should exit while the next reconcile waits `release_ms` (3 s) (FX:174-177). If it exits after that
  reconcile returns, H1 still delivers it at the turn's next call (endturn), so this is benign. If that
  turn dies after reconcile (x), the exit wakes an idle coordinator: an extra wake, not a lost one.
  Bounded. No break.
- **B2.5 Abandoned against a lost wake:** an abandoned ensure registers when a slot is free (FX:168),
  so abandonment never loses a registration it could have made. No break.
- **B2.6 Test flags are open to the coordinator.**
  - `--sleep-ms 0` makes a confirmed alarm vanish (B1.2).
  - In L2, `--now <past>` on the ensure writes `renewed_at` from a fixed clock at every renewal (L:407-411).
    The lease then always looks expired, so each list-unknown turn's ensure judges the slot dead and
    supersedes it, and the superseded one exits within a beat. This is **D1's chain again, with period
    `beat_ms`**, for as long as the coordinator keeps passing `--now` (for example a model copying a
    spec test line).
  - `--now` on a watcher freezes `last_tick_at` (FX-W7 L2: its lock is always "expired") and gives
    gap 0 to M5 (never paused).
- **B2.7 Abandoned ensure of an old ce.** It is released by a `turn.json` written by the *new*
  coordinator, and exits into the *old* coordinator's session, a stale wake (see section 3). Bounded:
  one per abandoned ensure.

### B3 Gate on work-creating acts when the alarm cannot be started

- **B3.1 Does the run drain?** Yes. Fences, stops, commits and session stop/message are never gated
  (FX:245). Running attempts finish or are revoked, and planned rows stay planned. **Draining holds**
  (RevocationNeverGated is to be checked).
- **B3.2 Who tells the owner? Nobody, when an older alarm is still alive.** States where every turn
  is unconfirmed while some alarm of this ce lives:
  - the ensure's Node start is blocked or late every turn;
  - a list hang (B2.3) in L2;
  - the coordinator persistently skips the ensure, which is free for a session.

  The dead-man sees an alarm alive and the list answering, so it does not alert. FX-W5 re-raises
  `replace-start` hourly, and each turn fails the same way. The run is stuck creating no work, with
  no alert. FX:385's "FX-W4 alerts in that state" is true only when no alarm lives.

### B4 The 5-minute dead-man

- **B4.1 The onset argument misreads H7.** FX:323-326 says the PC "stays awake at least the 15 idle
  minutes" after a turn ends. HARNESS-FACTS 8: the PC sleeps after 15 idle minutes **unless a session
  is in a turn or holds a keep-awake request, which lapses about five minutes after the session goes
  idle**. With the owner away for hours, the user-idle 15 minutes ran out long ago. The PC is held
  awake only by the turn, plus about 5 minutes. So it can sleep about 5 minutes after the turn ends,
  before the second run at 5-10 minutes (inferred from fact 8's wording; unverified). Without D-wake
  the alert is shown only at the owner's next wake. D-wake must therefore be the design, not a branch.
- **B4.2 A sleeping PC also freezes the alarm.** Whether timers count asleep time is unknown (SEM
  §6.2). In branch (a), a pending one-hour alarm never fires while the PC sleeps. "A pending wake
  source" is then not liveness in real time. NoDeadlock in the model assumes an awake host: record it
  as an open harness fact (H7). FX-W4 with D-wake partly covers this, since each run wakes the PC
  briefly.
- **B4.3 Task missing:** the only sign is a status anomaly read by the coordinator (FX:335-337), which
  has no channel to the owner except its turn report. Accepted as the outermost layer; still open.
- **B4.4 An alert nobody reads:** the toast is unverified, and the owner away is the common case.
  Branch A is not in HARNESS-FACTS. Open.
- **B4.5 `runs_no_list ≥ 3` nags every 5 minutes for a whole outage** (inferred: no once-per-onset
  rule is stated). This is a cost, and alert fatigue.

### B5 Per-operation deadlines (FX-W6 reduced)

- **B5.1 Who classifies, from what input:** the watcher, from the child's transcript tail (H5). The
  harness writes the records, but the child chooses their contents (declared timeouts,
  `run_in_background`, when to end its turn). So the child chooses its own deadline among {12, 60, 30,
  10} ticks.
- **B5.2 Imitation:** a child can start a background `sleep` and end its turn (`bg-wait`, 60 ticks),
  then make one call on the notification, and repeat. It holds its slot at about one call per hour,
  where as built it needed one call per 10 ticks. That is six times looser. Stall detection counts
  calls, so at one call an hour it trips only after many hours (inferred). No per-attempt age cap in
  ticks is stated.
- **B5.3 `idle` charges the child for its parent's latency.** A child that ended its turn waiting for
  the coordinator (a question, or a READY not yet written because it waits for an answer) is fenced
  for `hang` after 30 ticks, and that fence charges a restart. The coordinator is alarm-paced: an
  answer can take 1-2 alarm periods when the turn-end note was consumed or lost. In B1 this is a false
  suspicion of a healthy child. In B2 a second occurrence fails the task (refund cap 1).
- **B5.4 A truly hung child in a long class:** `bg-wait` whose job never completes is fenced at 60
  ticks; `tool` whose harness never writes the result is fenced at 12. All finite. No break.
- **B5.5 First tick of a new epoch:** fixed (FX:418-419). A quarantine (FX-W7 step 3) makes every row
  fresh again: one free tick each, harmless.
- **B5.6 M5 gap open: which property fails in which suspend pattern.** Timer branch (b) (a timer
  counts suspend time): a suspend shorter than 2Δ inside one sleep is counted as a tick, although the
  child had almost no awake time.
  - A PC that dozes and wakes repeatedly while a child waits on a model call gives NoFalseSuspicion
    failing (B1) after `model_ticks` = 10 such cycles.
  - With `idle` that is 30 cycles, with `bg-wait` 60.
  - Under B2, two such episodes in one task fail HealthyNotFailed (refund cap 1).
  - A suspend that straddles two evaluations splits its gap and is counted twice.

  Branch (a): harmless.

### B6 FX-W7's per-tick run-lock hold

- **B6.1 The watcher now exits on any busy run lock, every tick.** Step 2 puts the `watcher.json`
  write, which happens every tick, inside a run-lock hold, and a busy lock exits 75 (FX:483-486). As
  built, only ticks with appends took the lock (W:627-642). With a run lock stuck by a live but hung
  holder (`alive === true`, never broken, L:1327), or RL-no with the list unknown, the loop is:
  1. The watcher exits 75 within about 30 s and wakes the coordinator.
  2. The turn's ensure, reconcile and endturn all exit 75.
  3. The brief starts the watcher again, which exits 75 after about 30 s.

  A loop with a 30-second period. The lock wait is not a tick, so **NoBusyLoop fails**. With the list
  answering and an alarm alive, FX-W4 never alerts. This is new relative to as built.
- **B6.2 The break under the run lock is otherwise sound.** It is non-blocking on watcher.lock, so no
  lock-order deadlock (inferred from FX:478-482).

---

## 3. The designer's answer on A1.4

**The designer is right on the script.** `evaluate` calls `lib.checkCe(root, ce)` as its first act
(W:315). `checkCe` throws 64 on a newer ce (L:1488). `evaluate` runs every Δ in the loop (W:730-733),
and the throw ends the watcher, which releases its lock in `finally` (W:741-747). An old watcher
therefore wakes the old coordinator within about one Δ after `handover raise`, as built. My A1.4
("woken about 12x sooner") overstated the change.

What remains:
- With no watcher running, an L2 alarm adds one stale wake within `beat_ms` instead of `alarm_ms`.
- An abandoned ensure of the old ce exits into the old session when the new coordinator's `turn.json`
  appears (B2.7).

Both are bounded single wakes. D3 itself is the fence group's.

---

## 4. Verdicts

- **FX-W1: stands with a change.**
  - Each alarm writes an **exit tombstone** into its own slot record (one short run-lock hold, file
    only) before exit 30, superseded or 64. Readers treat a tombstoned slot as dead with no process
    list. This closes B1.2's L1 case (a fired alarm judged alive) at no PowerShell cost; a hard kill
    remains FX-W4's.
  - The coordinator's guard denies the test flags `--now`, `--sleep-ms`, `--interval-ms`,
    `--free-mb` (G:315-352). This closes the L2 forgery B2.6.
- **FX-W2: stands with a change.**
  - Reconcile confirms an outcome only when the slot it names is untombstoned, and still names that
    nonce or the present alarm (closes B2.2).
  - `arm_confirm_ms` must exceed the ensure's worst step 3 (`alarm_slots` × 30 s + lock wait), or step
    3 uses a shorter PowerShell timeout (B2.3).
  - Hold 1 does not overwrite a `confirmed` of the same ce for nonces it is not given (B1.4).
- **FX-W3: stands with a change.**
  - "Armed" = `turn.json` confirmed **and** the confirmed slot untombstoned (file-only). This closes
    B1.1 and B1.2.
  - An owner-visible signal when work waits and the arm stays unconfirmed for k turns: a watcher class,
    or a third dead-man counter read from `turn.json` (B3.2).
- **FX-W4: stands with a change.**
  - D-wake is required, not a branch, or the alert fires on the first "no alarm" run (B4.1).
  - Add the counter of B3.2.
  - Alert once per onset.
  - Open: H7 (alarms frozen while the PC sleeps), NotifyIcon, common mode.
- **FX-W5: stands.**
- **FX-W6 (reduced): stands with a change.**
  - `idle` past its deadline raises an act-due for the coordinator, or fences **uncharged**. It must not
    take the charged hang path (B5.3).
  - A per-attempt cap in ticks against imitation (B5.2).
- **FX-W7: stands with a change.** The watcher's per-tick hold skips its write on a busy run lock, as
  the L2 renewal does. It exits 75 only on a lost watcher.lock, or after k consecutive busy ticks
  (B6.1).

### Withdrawn parts and the defect each reopens

| Withdrawn | Reopens |
|---|---|
| Ping and confirm stage | D5 for a healthy operation longer than its kind's bound (B1 assumption); B5.3's idle case |
| Power-log reader | M5 gap (D5's suspend part): B5.6 |
| Transcript-tail turn boundary | D2's "reconcile before acts" is now enforced only for work-creating acts. Revocations without a fresh status are allowed (the fence group's FX-REDO and FX-CLAIM carry them) |
| Alarm heartbeat in L1 | D1's recovery when an alarm dies during a list outage (owner via FX-W4). With the tombstone, only hard kills remain |
| Retry in FX-W2 | none (an unconfirmed turn creates no work); cost B3.2 |
| PowerShell in holds | none |

---

## 5. Fault schedules for the modeller (replace the earlier list)

1. **Stale confirmed (B1.1).** T1 confirms, x before endturn → the alarm fires and wakes T2 → T2 omits
   the ensure and reconcile (free) → replace start allowed → T2 ends, watcher gone. NoDeadlock;
   AlwaysCanResolve.
2. **Unconfirmed outcome reused (B2.2).** T1's ensure registers, x before reconcile → the alarm fires,
   T2 → ensure with the same nonce (`nonce-reused`), reconcile confirms the old `registered` → T2
   works and ends, watcher x. NoDeadlock.
3. **L1 fired alarm judged alive (B1.2).** u → the alarm fires → T: the ensure finds the slot
   `unknown` = alive, `present`, confirmed → T ends → no alarm. AlarmsBounded holds; NoDeadlock fails
   without the owner. Compare with the tombstone.
4. **`--sleep-ms 0` / `--now` (B2.6).** The ensure with `--sleep-ms 0` registers and exits in the turn
   → confirmed → the turn ends with no alarm. L2 + u + an ensure with `--now` in the past at each turn
   → supersede chain with period `beat_ms`. NoBusyLoop over turns and alarm exits; AlarmsBounded.
5. **Unconfirmable arm while an alarm lives (B3.2).** An old alarm is alive; every turn's ensure is
   late or omitted → every turn unconfirmed, FX-W5 re-raises hourly, the dead-man is silent.
   NoSilentDeadlock generalised to "no work creatable for k turns".
6. **Confirm deadline vs PowerShell (B2.3).** u realised as a 30 s timeout per query; S2 → the ensure
   is in step 3 at the 30 s deadline in every turn. Liveness of admission while u holds.
7. **Second reconcile (B1.4).** confirm → acts → reconcile again → the next replace start is refused.
   Read whether the turn can still create work (a design check).
8. **Sleep before the alert (B4.1).** x leaves no alarm → an environment step "PC sleeps about 5 min
   after the turn" before the second dead-man run → no alert without D-wake. NoSilentDeadlock.
9. **Idle child charged (B5.3).** A healthy child ends its turn awaiting the coordinator → the
   coordinator's answer is delayed past `idle_ticks` (an alarm-paced wake) → hang fence, charged →
   repeat → B2 cap reached → task failed. NoFalseSuspicion (B1), HealthyNotFailed (B2).
10. **Short suspends (B5.6).** Timer branch (b), repeated suspends shorter than 2Δ during a `model`
    wait → false hang. NoFalseSuspicion; twice in a task → HealthyNotFailed under B2.
11. **Stuck run lock loop (B6.1).** A live hung run-lock holder (or RL-no + u) → the watcher exits 75
    at its next tick → turn: everything 75 → the watcher started again → 75 … NoBusyLoop; the
    dead-man is silent while an alarm lives.
12. **SingleWatcher (A7.1, kept).** Pause the old watcher, u, L2 lease break under the run lock, the
    old one resumes. Expect no second writer (closed by FX-W7 step 2).
13. **RevocationNeverGated (B3.1).** Unarmed for ever; every fence of a running attempt and every stop
    step stays enabled. Expect to hold.
