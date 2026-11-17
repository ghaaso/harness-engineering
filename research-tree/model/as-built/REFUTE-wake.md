# REFUTE-wake: blind refutation of FX-W1 to FX-W7 (label `refute-wake`, round 3, 2026-11-17)

Subject: `model/as-built/FIX-wake.md` (the fixes), read against `model/as-built/SEM-wake.md`,
`inputs/HARNESS-FACTS.md`, the top table of `model/as-built/FIX-fence.md` and the scripts in `tcb/`.
Paths are relative to BUILD. `W:` = `tcb/watch.mjs`, `S:` = `tcb/status.mjs`, `L:` = `tcb/lib.mjs`,
`FX:` = line in FIX-wake.md. No script or model was run. "Inferred" = reasoned, not checked.

Order kept: section 1 was written from the fixes' steps and who-runs-them only (FX: 1-34, 53-108,
115-118, 126-135, 160-208, 216-222, 246-273, 281-288, 310-350, 357-362, 382-405, 415-418,
445-500, 509-518, 536-570). The designer's arguments (the classical problem, why enough, ablation,
does not cover, notes) were read after it, for section 2. (The session was cut by a PC freeze at
15:43 after the reading and before writing; the attack list was formed before the arguments were
read and is written here unchanged in substance.)

Script facts the attacks lean on (checked):

- `proc.alive` and `proc.list` are synchronous `execFileSync` PowerShell calls with a **30 s
  timeout** each (L:2755-2759, L:2793-2800). "About 2 s" is the healthy case; the failure that makes
  the list unavailable is often the 30 s timeout.
- `acquireLock` waits at most about 30 s (300 retries x about 100 ms, L:1282, L:1376-1378) and then
  throws 75; a holder is judged only after 50 unchanged sightings and broken only on `alive === false`
  (L:1315-1328, L:1366).
- `assertHeld` re-reads the lock file and compares the nonce (L:1242-1247); it is a check, not a
  fence: nothing stops a break between it and the next write.
- The watcher writes `last_tick_at` from the edge clock right before `assertHeld` and the
  `watcher.json` write (W:665-668). Its evaluation calls `proc.alive` for the intake (W:574): one
  more 30 s call per tick when PowerShell hangs.
- Every exit of a background command wakes (SEM §0); a session message to a child starts a child
  turn when the child is idle (HARNESS-FACTS 1-2, inferred for "message to an idle session").

---

## 1. Attack list (written before reading the designer's arguments)

### FX-W1 leased, heartbeating alarm with `--ensure`

- **A1.1 PowerShell inside the run lock.** Step 3 calls `proc.alive` per occupied slot inside run-lock
  hold 1 (FX:61-70). In D1's own condition (PowerShell failing by timeout) each call costs 30 s
  (L:2759), so hold 1 lasts 30-60 s. Every other run-lock user (reconcile r8, endturn t5, replace,
  stop, commit, the watcher's e12 appends, the other alarm's renewals) waits about 30 s and exits
  75 (L:1376-1378). Interleaving: u (list hangs) → turn: ensure (hold 1, 60 s at S2) ∥ reconcile
  (call 2 of FX-W2, lock wait 30 s) → reconcile exits 75 → no confirmation → step 3 of FX-W2 retries
  → same. The fix designed to close D1 converts D1's trigger into a run-lock starvation that FX-W7
  branch L-no leaves to the owner. Safety (no busy loop) holds only if the 75s are rate-limited by
  the turn; liveness of every writer is lost while u lasts. **Breaks a property that held before**
  (the as-built ensure-less alarm calls no PowerShell, W:752-773).
- **A1.2 Lease in wall time against R5.** The lease is `now − renewed_at ≤ lease_ms` (FX:63-64): a
  wall-clock counter, where R5 says counters run in ticks. Suspend branch (b) or (a): on resume the
  wall clock has jumped, every lease looks expired at once while every alarm lives. With the list
  unavailable at resume (PowerShell is a fresh process start right after resume), the ensure judges
  every slot dead and overwrites it; each old alarm exits `superseded` within one beat (FX:73-74):
  one extra wake per slot per resume. Bounded (no chain, since the new alarm renews), so not a
  safety break; but `alarm_slots` wakes per resume of a dozing PC, each a full coordinator turn.
- **A1.3 Renewal skipped under contention.** Renewal "skips the beat" on a busy lock (FX:73). Three
  skipped beats (A1.1, A3.3) lapse a live alarm's lease. With list unknown: superseded (one wake).
  With FX-W3's hook (lease only, no list): **the hook denies the session tools although the alarm
  lives**, and an ensure finds the slot alive by the OS answer and exits `present` without renewing
  it, so the hook keeps denying until the alarm's own next successful renewal (up to one beat, longer
  under contention). See A3.2.
- **A1.4 Superseded/64 exits now come within one beat, waking the *stale* coordinator.** After
  `handover raise` the old coordinator's alarm notices the new ce at step 5 within `beat_ms` (FX:72)
  instead of an hour: the stale session is woken about 12x sooner, and the stale session is exactly
  D3's actor (a session start with no `--ce` fence). Safe only if the fence group's FX-CGATE (or
  equivalent) is in; with FX-W1 alone D3's exposure grows.
- **A1.5 Check-then-act in the ensure.** The slot judgement and the write are in one run-lock hold:
  sound against a second ensure. But a slot judged "dead" by `proc.alive === false` at a pid reuse
  (start-time one-sided match, L:1202-1214) is fine. No break found here.
- **A1.6 Unreadable `acked.json` resets `quiet`.** Token null ≠ last token resets `quiet` (FX:76):
  a flapping read error postpones exit 30 indefinitely. Same direction as built (SEM §2.2); delay only.
- **A1.7 Smallest?** The schema v2, the `run/arm/` outcome files and the slot machinery serve FX-W2;
  the D1 fix proper is "lease decides when the list is unknown + no second registration while a
  lease is valid". The slots are an owner branch (S1 makes them dead weight).

### FX-W2 arm first, confirmed

- **A2.1 Nonce chosen by the untrusted session.** X1 is "a fresh token the coordinator makes up"
  (FX:162-163). A language model readily reuses the same string. Reuse → reconcile reads
  `run/arm/X.json` left by an earlier turn's ensure (pruned only after a day, FX:221) and confirms
  `registered/present` while this turn's ensure never started. The confirmation then proves nothing:
  the M2 window is back, invisibly. Death schedule: alarm wake (S1) → turn skips call 1 but runs
  reconcile with an old nonce → exit 0 → turn dies → no source.
- **A2.2 A late `present` exit is a new wake, and slow program starts make it the norm.** The fix
  needs every `present` exit to land before the turn's last tool call (FX:170-172, 198-201). If Node
  starts are slow (the start of a background command is blocked or delayed for longer than
  `arm_confirm_ms` = 30 s, or than the rest of the turn), reconcile reports `arm-unconfirmed`, the
  turn ends, the ensure then runs, finds the slot present, exits 0 → wakes a new turn → that turn's
  ensure is slow again → … A chain where each turn manufactures the next wake: **an untimed busy loop
  over coordinator turns** for as long as starts stay slow (NoBusyLoop fails). Step 3's retry doubles
  the ensures per turn. Not covered by the "inferred negligible" (FX:200).
- **A2.3 Ensure and reconcile contend for the run lock by design** (calls 1 and 2 back to back). With
  A1.1 the reconcile loses whenever PowerShell is slow.
- **A2.4 Death before call 1** (S1, after an alarm wake): no source. Admitted; goes to FX-W4.
- **A2.5 S2 both alarms re-armed by one token** → in a quiet run they fire close together unless slot 2
  gets 1.5x; with 1.5x the second fire is only 0.5 `alarm_ms` behind, fine. Two consecutive x go to
  the owner (as `ownerLegit`). No break beyond the stated one.
- **A2.6 What the session must do is three tool calls in fixed order** with no trusted runner except
  FX-W3's guard; a session that ends its turn on reconcile's exit 1 (arm-unconfirmed, "the turn goes
  on", FX:173-174) leaves a run with no alarm and a guard that now refuses everything (A3.1).

### FX-W3 no write without a pending wake; K from turn record; brief

- **A3.1 The guard blocks the stops.** `requireArmed` is put on stop (stop.mjs:220) and the
  coordinator's session tools (FX:250). State: the alarm cannot be registered (Node start blocked,
  A2.2; run lock stuck with list unknown, FX-W7 L-no; ensure 64/67 on a damaged `coord.json`) while
  a child must be stopped (fenced for hang, a runaway spender, a failed task). Every stop exits 6
  `not-armed`. **Safety "a failed task is stopped" now depends on the wake machinery**; before
  FX-W3 a stop needed only the run lock. Who gets the run out: nobody in the tree; FX-W4 only if it
  alerts (A4.1 says it may not).
- **A3.2 Hook and script judge "armed" differently.** Hook: lease only (FX:250); script: OS answer
  first. Alive alarm with lapsed lease (A1.3) → hook denies session-start/message, script allows
  writes. Session messages are what FX-W6's ping and the fence group's FX-CLOSE ("close by an
  act-due prompt") need, so both stall until the alarm renews. Bounded by one renewal if the lock
  frees; unbounded under A1.1 contention.
- **A3.3 Run-lock holds grow.** `requireArmed` evaluates `liveness` inside every writer's hold: one
  PowerShell per slot, 2-60 s. Same starvation as A1.1, now on every write path, and it starves the
  alarm's own renewals (A1.3) — the fixes feed each other.
- **A3.4 Turn boundary from the transcript tail (H2-yes).** "Turn start = the last user record that
  is not a tool result" (FX:251). A background exit delivered mid-turn arrives as a notification
  record (HARNESS-FACTS 2); if it is a user-type record that is not a tool result (record format
  unknown, needs-app 7), the hook sees a **new turn** and denies everything but ensure+reconcile. The
  ensure's own `present` exit is such a notification → after it the hook demands ensure+reconcile
  again → a new `present` exit → … The coordinator can never get past its first two calls: an
  in-turn livelock created by the fix's own exits (inferred; depends on the record format).
- **A3.5 K from `turn.json`.** Sound direction (never ahead of a status the script wrote). Gaps:
  `turn.json` must carry and be checked against the ce (a stale coordinator's turn.json after a
  handover); a turn that ran reconcile twice (FX-W2 step 3) acks the second head, which the session
  may never have read — the script can only know what it wrote, not what the model read.
- **A3.6 H3 (turn-end hook) is not in HARNESS-FACTS.** In branch H3-no, A4 is brief-only and rests on
  the alarm; fine with FX-W2.
- **A3.7 Fence group interaction.** FX-CGATE also adds a coordinator hook check on session tools;
  two deny rules in one hook with different inputs (identity token, lease) must be ordered and both
  PowerShell-free (hook deadline). FX-OUT/FX-CLAIM take no run lock: unaffected. FX-REDO's repeat
  call is gated by `requireArmed`: a missing ledger line cannot be completed while unarmed.

### FX-W4 dead-man check

- **A4.1 "Fresh source" counts the watcher.** Fresh = alarm lease *or* watcher `last_tick_at`
  within 3Δ (FX:322-324). State from A3.1: watcher alive and ticking, alarm unregisterable, every write
  refused `not-armed`. The dead-man sees a fresh source and **never alerts**; FX-W5 re-raises
  act-due hourly, each turn fails the same way: a live-looking, permanently stuck run with no owner
  alert. The dead-man's predicate is not FX-W3's predicate.
- **A4.2 The PC sleeps before the dead-man fires.** HARNESS-FACTS 8: the PC sleeps after 15 idle
  minutes when no session is in a turn. "No wake source" is precisely "no session in a turn". The
  grace is 2 x lease = 30 min (FX:325) > 15 min: the PC sleeps first; a scheduled task without
  "wake the computer to run this task" never runs while asleep ("nothing is missed", FX:343, is true
  only for the frozen processes, not for the stalled run). The alert waits until the owner touches
  the PC anyway.
- **A4.3 The alert may not reach anyone.** A balloon via `NotifyIcon` from a short-lived PowerShell
  run by Task Scheduler (FX:328-330, "inferred feasible"): a task set to "run whether the user is
  logged on or not" has no desktop; the icon vanishes when the process ends. Unverified; with the
  owner away, a local toast is unseen anyway (owner "not continuously present", HARNESS-FACTS 12).
- **A4.4 Common mode.** The dead-man is a Node start plus PowerShell, the same mechanisms whose
  failure (list unavailable, blocked starts) is D1's trigger and A2.2's. It is least likely to run in
  the state it exists for (inferred).
- **A4.5 Who notices it is gone.** `status` shows `deadman-ran.json` age as an anomaly (FX:348-349):
  read only by the coordinator, the thing that may be dead; an anomaly wakes nobody. Admitted as the
  outermost layer.
- **A4.6 Freshness thresholds disagree.** Watcher fresh within 3Δ here, stale for lock breaking at
  5Δ (FX-W7 step 1), alarm lease 3 beats = 15 min: three lease definitions for one notion.

### FX-W5 act-due re-raise

- **A5.1 The cap is ambiguous.** "`reraise_ticks × 2^backoff` (…, cap at `alarm_ms / delta_ms` =
  60)" and "`backoff = min(backoff + 1, cap)`" (FX:386-388) cap the **exponent** at 60 as written:
  after four re-raises the interval is 240 ticks, then effectively never (2^60). The R1 bound
  "re-raised within `reraise_ticks × 2^cap`" (FX:402) is then not a bound. Intended reading (interval
  capped at 60 ticks) must be written.
- **A5.2 Re-raise of acts status calls the owner's.** The watcher's predicate ignores zombie-over
  (status says `owner`, S:523; SEM §4.1 difference 1). FX-W5 re-raises it forever, hourly: one
  coordinator turn per hour per such row, each told "owner" by status. No quiescence while the owner
  is away; a timed cycle, so NoBusyLoop (untimed) passes, but the cost is unbounded.
- **A5.3 Re-raise against an act refused by the guard** (A3.1): hourly turns that cannot act; same
  shape as A5.2.
- **A5.4 Quarantine (FX-W7 step 3) or a watcher restart drops `active`**: every present ident
  re-raises at once (one burst). Harmless.
- **A5.5 Smallest?** Yes, if the owner picks R1.

### FX-W6 hang by declared deadlines, confirmed

- **A6.1 `idle` deadline + ping = a ping loop.** `idle` → deadline 2 ticks (FX:458-459). A child that
  ended its turn waiting for the coordinator (it asked a question), or for anything not recorded as a
  background tool_use, is suspected after 2 ticks → hang-suspect → coordinator turn → ping (a session
  message, which **starts a child turn**) → the child answers "alive" (a new call, clears) → it is
  idle again → 2 ticks → … one coordinator turn and one child turn about every 4-5 minutes, forever.
  Timed, so not an untimed busy loop, but unbounded token cost and never quiescent.
- **A6.2 The ping revives what should stay down and disturbs the work.** A message to an idle child
  starts its turn: a child about to be fenced is given a fresh turn in which it can write READY
  (FX-OUT then decides), spend, or change course on an injected instruction. To a child mid-turn
  the message is injected into its context (inferred). Neither cost is stated.
- **A6.3 A child that waits forever is never suspected.** `bg-wait` deadline 60 min; a ping reply
  is a new call that resets `silent_ms`; a background job that never finishes gives a child that is
  pinged hourly, replies, and holds its slot for ever. A dishonest child can do the same on purpose
  (start a background `sleep`, declare long tool timeouts, keep a helper transcript growing: "no
  deadline while its helper transcript grows", FX:456). Before the fix, any call reset the hang
  count too, so imitation was already possible; the new holes are the ping-reset and the open-ended
  Agent state.
- **A6.4 The ping precondition is the coordinator's own claim.** `status ping` writes the ledger line
  "after sending the message" (FX:470-472): no script can see that a message was sent. The precondition
  checks a statement by the untrusted party it is meant to constrain. Conversely, a coordinator that
  never pings (or whose message tool is denied by FX-W3's hook, A3.2) makes every hang fence exit 6
  `hang-unconfirmed`: **a truly hung child is never fenced**, a regression from as built (21 → fence
  needed no extra act). Liveness of that row now rests on two more model acts.
- **A6.5 B2 refund breaks the restart limit.** A refund on "a new call or tool result written after the
  fence time" (FX:473-477): the harness writes the record of the suspended call when it finally
  returns, typically after the fence. A child stuck in a model call that returns late is refunded
  every time; restarts never reach R. Deadlines double, so the time per cycle grows, but **RestartLimit
  (a count) fails**. A dishonest child gets a refund by doing anything after the fence before stop
  verify. Unbounded refunds need their own cap.
- **A6.6 Wall-clock `silent_ms` against R5 and M5.** `silent_ms` is awake wall time; the subtraction
  needs H6 (Power-Troubleshooter event 1 readable). H6-no falls back to the 2Δ gap rule, which SEM
  §6.2 shows misses suspends up to 2Δ (branch b). Worse than before in one way: after a resume, several
  rows in `model` pass their deadline in the same tick → common-cause 26 → **halt** (R8) instead of
  single false suspicions. Also a fourth PowerShell call per tick (up to 30 s on failure).
- **A6.7 H5 (tail record kinds) is unverified**; the whole operation state machine rests on it. The
  fallback (single bound) is D5 again.
- **A6.8 Smallest?** No. Step 1 (epoch tick) and per-state deadlines answer D5's named cases; the
  ping, the ledger precondition, the power-log reader and the B2 refund are four further mechanisms,
  three of which open new holes above.

### FX-W7 leases for lock breaking; quarantine

- **A7.1 `assertHeld` is a check, not a fence.** Break of `watcher.lock` happens in the waiter's
  acquire loop, outside the run lock. A resumed old watcher can pass `assertHeld` (FX:542) and then
  be broken before its run-locked append, or between `assertHeld` and `writeAtomic(watcher.json)`
  (W:666-668). Effect: duplicate event lines (harmless) and the old watcher overwriting the new
  watcher's `watcher.json` with its own pid and a fresh `last_tick_at`, which also renews the *old*
  holder's lease in the eyes of the next waiter (FX-W7's own evidence). Single-watcher safety holds
  only up to one tick of overlap; the Chubby answer (a fencing token checked by the store) is not
  borrowed whole.
- **A7.2 Wall-clock lease, again.** Resume after a suspend: `last_tick_at` looks 5Δ old for a live
  watcher; with list unknown, a coordinator-started watcher breaks it; the old exits 75 (a wake). One
  extra wake per resume: bounded.
- **A7.3 Inconsistent thresholds** with FX-W4 (3Δ) and FX-W1 endturn liveness of the watcher (not
  defined: FX-W1 defines leases for alarms only). If endturn calls the watcher dead at 3Δ and the lock
  breaks only at 5Δ, the D1b loop (start → 75 after 30 s → wake → start) runs for up to 2Δ before the
  lease lets a waiter in. Bounded, but it is the loop FX-W7 is meant to close.
- **A7.4 Who starts the second watcher** while the list is unknown? FX-W3's brief says "start nothing
  for an unknown watcher" (FX:255). Then D1b's dead-watcher-with-lock is never retried by the session
  and FX-W7's break never runs: the watcher stays down until the list returns or FX-W4 (A4.1: the
  dead-man counts the alarm as fresh, so a missing watcher alone never alerts). Liveness rests on the
  alarm only (1-2 h per act) while u lasts.
- **A7.5 Quarantine** is the smallest fix for the 67 loop; counters restart, spends re-parse from byte
  0 (W:286-291, files {}). No break.

### Cross-cutting

- **X1 Three wall-clock leases** (alarm, watcher, run lock in L-yes) and one wall-clock silence
  (FX-W6) where R5 asks for ticks; CONTRACT §1.2 must list each and state one-sidedness. The alarm
  lease is not one-sided in effect: an expired lease of a live alarm *causes* a supersede (an act),
  not only a withheld suspicion.
- **X2 PowerShell inside run-lock holds** (A1.1, A3.3): new in FX-W1/W3, absent today.
- **X3 Writes now depend on wake liveness** (A3.1): the safety acts (stop, fence) must not.
- **X4 One "a wake is pending" predicate** is used by FX-W2, W3, W4 with three different readings.

---

## 2. Attacks against the designer's arguments (read after section 1)

| Attack | Answered? | Where / why |
|---|---|---|
| A1.1 PowerShell in hold 1 | **not answered** | FX:69-70 "two at most, inferred acceptable" assumes 2 s; notes FX:597-598 see it but keep it; the 30 s timeout (L:2759) in the very u condition is not considered |
| A1.2 lease vs R5 / suspend | partly | FX:47-51 and 104-107: one wake per resume, bounded; R5 conflict listed for CONTRACT §1.2 (FX:130-131) but the "one-sided" claim is wrong for the supersede act (X1) |
| A1.3 renewal skipped → hook denies | not answered | hook vs script divergence not discussed |
| A1.4 stale coordinator woken sooner | not answered | FX:72 presents the faster 64 as a gain only |
| A1.6 token flapping | answered | as built, delay only |
| A1.7 smallest | partly | FX:20-21 explains the shared lease; slots are owner's |
| A2.1 nonce reuse | **not answered** | nonce trusted to be fresh (FX:163) |
| A2.2 late `present` exit chain | partly | FX:198-201, 594-595 name the risk as "negligible", and H3 as the cure; slow starts not considered |
| A2.3 ensure/reconcile lock contention | not answered | |
| A2.4 death before call 1 | answered | FX:226-227 → FX-W4 |
| A2.6 three ordered acts | partly | FX:205-207: FX-W3 refusal; but see A3.1 |
| A3.1 guard blocks stops | **not answered** | FX:274-278 argues only liveness after a write; "a failed task is stopped" not considered |
| A3.2 hook/script divergence | partly | FX:263-264 covers the hook-allows/script-refuses direction only |
| A3.3 lock hold growth | not answered | |
| A3.4 turn boundary from tail | partly | FX:266-267: fallback when the boundary is "not recognisable"; a mis-recognised boundary (notification records) not considered |
| A3.5 K and ce | partly | FX:252 "only fewer events acked"; ce check of turn.json not stated |
| A3.7 fence interaction | not answered | |
| A4.1 watcher counted as fresh | **not answered** | |
| A4.2 PC sleeps first | **not answered** | FX:343 "nothing is missed" |
| A4.3 alert reach | partly | branch A/B; NotifyIcon "inferred feasible" |
| A4.4 common mode | not answered | |
| A4.5 dead-man gone | answered (as a limit) | FX:345-349 |
| A5.1 cap ambiguity | not answered | wording error |
| A5.2 zombie-over re-raise | partly | FX:421-422 lists it as not covered; re-raise makes it periodic, not stated |
| A5.3 re-raise vs guard | not answered | |
| A6.1 idle ping loop | **not answered** | |
| A6.2 ping revives/disturbs | partly | FX:483-486 on queued pings only |
| A6.3 never-suspected waiter / imitation | partly | FX:520-521 "that is stall, by V" — V only catches a child that spends without progress; a silent waiter does not spend |
| A6.4 ping claim untrusted; no ping → never fenced | **not answered** | FX:481-483 covers death after ping only; FX:599-600 offers the cheaper no-ping form |
| A6.5 refunds unbounded | **not answered** | FX:497-499 claims "finitely often per task, by doubling": finitely often per unit of time, not in count |
| A6.6 resume → common cause halt | not answered | FX:490-492 mentions common cause only for a frozen child |
| A6.7 H5 | answered (as dependency) | FX:488-490 |
| A7.1 assertHeld not a fence | partly | FX:532-535 admits the resume-then-append case and answers with two checks; the window between check and write remains |
| A7.3/A7.4 thresholds, who restarts | not answered | |
| X1-X4 | partly | X1 in CONTRACT changes; X2-X4 not discussed |

---

## 3. Verdicts

- **FX-W1: stands with a change.** Take the PowerShell verdicts **outside** the run lock: query
  `proc.alive` for each slot first, then inside hold 1 re-read the slot bytes and use the verdict only
  if they are unchanged (the `breakStale` re-read pattern, L:1388-1392), else treat as unknown (lease). Same
  for FX-W3's `requireArmed`. Write the alarm lease's effect honestly in CONTRACT §1.2 (it can cause a
  supersede: one wake per resume per slot).
- **FX-W2: stands with a change.** The nonce must not come from the session's choice alone: the ensure
  creates `run/arm/X.json` by exclusive create (`wx`) and exits `nonce-reused` without registering
  if it exists, and reconcile accepts an outcome only with `at` ≥ its own start. Plus a rate limit on
  late exits: reconcile writes `abandoned` to `run/arm/X.json` at its deadline (exclusive create); an
  ensure that finds its nonce abandoned and the slots present sleeps one `alarm_ms` before exiting, so a
  slow-start chain (A2.2) has period `alarm_ms`, not a turn.
- **FX-W3: stands with a change.** (1) Exempt the revocation acts from `requireArmed`: replace's fence,
  stop (request, session, verify) and the session-stop tool; gate only acts that create work (admit,
  start-session, replace-start, commit). (2) `requireArmed` inside the lock reads the lease only (as
  the hook does), so hook and script agree and no PowerShell enters a hold. (3) H2-yes turn boundary
  from a prompt-submit marker or with background-notification records excluded; else brief only.
  (4) `turn.json` is checked for ce.
- **FX-W4: stands with a change.** Its "fresh" predicate must be FX-W3's "armed" (alarm slots of the
  current ce), not "alarm or watcher"; the task definition sets "wake the computer to run" and "run
  only when the user is logged on" (for a visible alert), or the grace drops below the 15-minute idle
  sleep. Unverified: NotifyIcon from a scheduled short-lived process; the common mode with Node and
  PowerShell starts.
- **FX-W5: stands with a change.** Write the cap as a cap on the interval (`min(reraise_ticks ×
  2^backoff, 60)` ticks); use status's `nextOf` exclusions (zombie-over → no re-raise).
- **FX-W6: falls as written.** A reduced form stands: step 1 (epoch tick) and step 3's per-state
  deadlines for `tool` and `model`, with `idle` not a hang (an idle child is a turn-end note the
  coordinator already receives); confirmation by waiting `confirm_ticks` more (the designer's own
  cheaper alternative, FX:599-600) instead of a ping and a ledger claim; B2 only with a cap on refunds
  per task (say 1) so RestartLimit stays a count; step 4 (power log) kept only if H6 is checked.
- **FX-W7: stands with a change.** Break `watcher.lock` only while holding the run lock, and have the
  watcher `assertHeld` inside its run-lock hold right before the appends and do the `watcher.json`
  write inside a run-lock hold too: check and act become atomic against a break (a real fence). One
  watcher lease value shared with FX-W1's endturn liveness and FX-W4.

---

## 4. Scenarios worth replaying in the model (fault schedules in words, K ≤ 2)

1. **A1.1 starvation.** u (list hangs; each liveness query costs a long step) → turn: ensure takes the
   run lock and queries two slots → reconcile's lock wait expires (75) → retry → expires. Property:
   every writer eventually acquires (needs a lock-wait budget in the model); expect failure while u
   holds, and pass with liveness judged outside the lock.
2. **A2.1 nonce reuse.** alarm fires (S1) → turn reuses an old nonce, skips the ensure → reconcile
   confirms from the old outcome file → x before endturn → NoDeadlock. Model the nonce as "fresh" or
   "reused" (an omission fault of the session).
3. **A2.2 late present exits.** environment event "start delay > turn" on every ensure (one budgeted
   kind, unbounded count) → each `present` exit lands after the turn's last call. NoBusyLoop over turns
   and ensure exits; expect a cycle without the `abandoned` rate limit.
4. **A3.1 guard vs stop.** a hang (or a failed task) needs a stop + ensure cannot register (u with a
   stuck run lock, or a blocked start) → every stop exits 6. New property: a task in `failed`/fenced
   is eventually stopped, or stop is refused only by the run lock.
5. **A3.4 boundary livelock.** H2-yes with notification records read as turn starts: ensure →
   `present` exit delivered mid-turn → hook resets → ensure … Property: a turn eventually makes a
   non-arm call.
6. **A4.1 silent stuck run.** watcher alive; alarm unregisterable; FX-W3 refuses writes; FX-W4 with
   "watcher counts as fresh" → no alert ever. NoSilentDeadlock (with "stuck" = no write possible).
7. **A4.2 sleep before alert.** x leaves no source → idle sleep after 15 min (environment step that
   disables the dead-man unless "wake to run") → no alert. NoSilentDeadlock.
8. **A5.2 re-raise of owner rows.** a zombie-over row + R1 → periodic wakes forever with no act.
   A cost reading (wakes per quiet hour), not a safety one.
9. **A6.1 idle ping loop.** a healthy child that ends its turn awaiting the coordinator → suspect →
   ping → reply → idle → suspect … Property: a healthy idle child causes finitely many wakes.
10. **A6.4 no ping, true hang.** child STUCK + the coordinator omits the ping (o) → every hang fence
    refused → the slot is never freed. EventuallyResolves.
11. **A6.5 refund loop.** child STUCK whose call record lands after each fence → refund each time →
    RestartLimit (count) with B2.
12. **A7.1 two watchers.** pause the old watcher after its `assertHeld`, u, a new watcher breaks the
    lease, old resumes and writes `watcher.json`. SingleWatcher (at most one writer of watcher state
    per tick) and the next waiter's lease reading.
13. **A1.4 stale wake.** handover raise → old alarm exits 64 within a beat → old coordinator turn →
    session start without the ce fence (only with FX-CGATE ablated). TwoCoordinatorsAct.
