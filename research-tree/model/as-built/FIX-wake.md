# FIX-wake: the smallest fixes for the wake group (helper W, round 3, 2026-11-17, revision 4, final)

## Status after three refuter passes

| Fix | Verdict (REFUTE-wake-3 §3) | Last change | Last change attacked? |
|---|---|---|---|
| FX-W1 | stands with a change | rev 4: a **per-script flag allow-list** for the coordinator, replacing the deny-list; exit markers pruned only when no slot names them | **no** |
| FX-W2 | **stands**; modelled: holds only with FX-W4 | rev 5: premises (a) and (b) stated, plus "correct only with FX-W4" (Revision 5 notes N3); the endturn-closes-every-turn rule (N2) | **no** (rev 5); rev 3 attacked in pass 3 |
| FX-W3 | stands with a change | rev 5: brief rule "every turn ends with endturn, also after handover exit 2 and exit 75" (N2); rev 4: the `unarmed` record | **no** |
| FX-W4 | stands with a change; modelled: **hole** in once-per-onset | rev 5: re-alert while the cause holds, pace P1/P2 (N1); premise (c) stated | **no** |
| FX-W5 | **stands**; modelled | rev 3: the stuck counter | yes (pass 3) |
| FX-W6 | stands with a change; modelled: holds under B1 only | rev 5: the B1 premise stated (N3); rev 4: the age cap asks the coordinator, uncharged | **no** |
| FX-W7 | stands with a change | rev 4: each tick evaluates a copy of the state, adopted only after a successful hold | **no** |

The owner ruled (charter, section "The owner's ruling on testing") that there is no further attack round. Each rev-4 change gets at most one targeted check, the schedule named for it in "For the modeller".

Read with `SEM-wake.md` (as-built behaviour, SEM §n), `REFUTE-wake.md` (A1.1-A7.5, X1-X4), `REFUTE-wake-2.md` (B1.1-B6.2) and `REFUTE-wake-3.md` (third pass, final schedules 1-18). The change log is at the end, followed by "For the modeller". Paths are relative to BUILD:
- `W:` watch.mjs
- `S:` status.mjs
- `L:` lib.mjs
- `G:` guard-hook.mjs
- `R:` replace.mjs
- `M:` model.mjs

No script was changed and no Node command was run. "Inferred" means reasoned, not checked.

## What stays open after revision 5

Rev-5 rows come first. Their changes are in "Revision 5 notes" at the end and have not been attacked.

| Open defect | Why it is open | What would close it | Whose decision |
|---|---|---|---|
| A coordinator that omits endturn anyway (N2 residue) | The rule "every turn ends with endturn" lives in the brief only | E1: FX-W4 recovers. E2: the alarm defers its exit once while a turn is open | Owner: E1 or E2 |
| The re-alert pace (N1) | Liveness needs repeated alerts; their pace costs nagging | P1 (every 30 min) or P2 (backoff to 2 h) | Owner: P1 or P2 |
| Premise (b) under S2: every turn shorter than 0.5 × `alarm_ms` (N3) | Unmeasured | Probe: the longest recorded coordinator turn; else slot 2's period becomes 2 × `alarm_ms` | Probe, then the owner |
| Premises (a) and (c) (N3) | Stated; each fails only toward the safe side (an unconfirmed turn, a spurious alert) | — | Stated |

The table below is carried over from revision 4.

| Open defect | Why it is open | What would close it | Whose decision |
|---|---|---|---|
| A hard-killed alarm (no exit marker) during a process-list outage, branch L1 (D1 recovery) | The exit marker (FX-W1) is written only by an alarm that runs its exit code. With no lease, nothing can tell a killed alarm from a sleeping one while the list is unknown. | Branch L2 (a lease), or the owner acting on FX-W4's `runs_no_list` alert | Owner: L1 or L2 |
| Suspends shorter than 2Δ counted as ticks (the M5 gap, timer branch b; refuter B5.6) | The power-log reader is withdrawn: H6 (what Windows logs for a suspend) is unchecked | Check H6, then a reader that counts the suspended time out of a tick | Owner: run the H6 check; the property that fails is below |
| Whether timers count while the PC sleeps (H7 b; refuter B4.2) | Not in HARNESS-FACTS; it decides whether a pending alarm is a wake in real time | One measured suspend with a running alarm | Owner (a fact to measure) |
| Alert reach: does a toast from a scheduled task show? Is anyone there to read it? (A4.3, B4.4) | Unverified; branch A (an app-level scheduled session) is not in HARNESS-FACTS | One test toast; the owner's word on branch A | Owner |
| One failure shared by every program start (A4.4) | The dead-man is itself a program start | An alert channel outside this PC (for example a heartbeat service) | Owner |
| The dead-man task itself is missing or disabled (B4.3) | Only a status anomaly, read by the coordinator, shows it | Same as the row above | Owner |
| A child that imitates activity (B5.2) | The child writes its own transcript records. Since rev 4 the age cap only asks; it does not fence | The coordinator, or the owner by FX-W5's `stuck` path, answers the `age-cap` act-due | Coordinator / owner, per task |
| A healthy operation longer than its kind's deadline (D5 in branch B1) | The ping was withdrawn | A stated bound (B1), or a refund (B2) | Owner: B1 or B2 |
| The script cannot know which status.json the model read (K after two reconciles) | Limit of a file interface | None | Accepted |
| Every flag denial rests on the hook (H2 is believed, not observed) | Needs-app item 1 in CONTRACT §7. The **incomplete list** was a defect and is fixed in rev 4 by the allow-list (not attacked) | Observe the hook denying a call once | Owner (a fact to observe) |
| Helpers started through the coordinator's Agent tool (checker, mapper) | Their profiles, and whether a test flag can reach a script through them, were not checked (REFUTE-wake-3 §1) | Read their profiles' `bash` grammar | Next reader (a check) |
| The allow-list's content | A new artefact, not attacked: a production flag left off blocks the coordinator; a test flag left on reopens a forgery | One check against each script's spec of production calls | Implementer + one targeted check |
| The `stuck` alert takes about 4.75 h (15 + 30 + 60 ticks to reach the cap, then 3 × 60) | Bounded by the FX-W5 cap | A shorter cap, at the cost of more re-raised turns | Owner (stated in R6's bound) |
| The 10 s process query times out under load on a healthy host | It makes the L1 hard-kill row more frequent | L2, or a longer timeout with a longer deadline | Owner, with L1/L2 |

## Summary table

| Fix | Mechanism (classical name) | Defects closed | Scripts touched | Depends on / owner branch |
|---|---|---|---|---|
| FX-W1 | Tri-state liveness, judged outside every lock. An alarm writes an **exit marker** before it exits. The hook **allows only production flags, per script** (rev 4). (Unreliable failure detector; leases in L2) | D1 (except a hard kill under L1), M1's superseded exits, endturn exit 2 hiding a dead alarm, reconcile exit 67 on a corrupt alarm or watcher file, test-flag forgery | lib `liveness`, watch.mjs `runAlarm`, status.mjs, guard-hook `checkTcbNode` | **L1/L2** |
| FX-W2 | The arm comes first, through an idempotent `--ensure`. The arm counts as confirmed when a **slot holds an alarm that has not exited**, whoever registered it. (Lost wake-up; redundancy) | M2 window; D6 paths 2, 3 and 4; B2.2; B2.3; B1.4 | watch.mjs (`--ensure`), status.mjs (`--reconcile`, `run/turn.json`), lib (`realProc` timeout argument) | H1; **S1/S2** |
| FX-W3 | Acts that create work need "armed" = a confirmed `turn.json` **and** its slots without an exit marker. Revocation is never gated. (Reference monitor) | D2 (an enforcer for each act); B1.1; B1.2 | lib `withRunLock` option, replace.mjs, guard-hook, status.mjs endturn, handover, new coordinator brief | H2 |
| FX-W4 | A dead-man check outside the tree, with **wake-to-run required**. It also alerts on a stuck act or a busy run lock, and alerts once per onset. (Watchdog) | D6 paths 1, 5, 6 and 7; B3.2; B4.1; B4.5; B6.1's alert | status.mjs `--deadman`, task template | **H4 A/B** |
| FX-W5 | Act-due is raised again while its condition holds, at a capped interval. Rows that status gives to the owner are excluded. Repeated raises are counted as `stuck`. (At-least-once delivery) | M3 gap; feeds B3.2's alert | watch.mjs | **R1/R2** |
| FX-W6 | Per-kind deadlines in ticks; a first-tick fix; idle becomes an act-due, never a charged hang; an **attempt age cap that asks the coordinator, uncharged** (rev 4); the refund in B2 is capped at 1. (◇P, operation deadlines) | D5 (slow call, waiting child, first tick of an epoch); B5.2 bounded; B5.3 | watch.mjs, lib `parseTranscript`, stop.mjs (B2) | H5; **B1/B2** |
| FX-W7 | The watcher lock is broken only under the run lock. The watcher evaluates **a copy of its state** and keeps it only after a successful hold; on a busy run lock it drops the copy and reports the busy ticks. A corrupt state file is quarantined. (Lock fencing) | D1b; the restart loop on exit 67; two writers of watcher state; B6.1 | lib `acquireLock`, watch.mjs | L1/L2; **RL-yes/RL-no** |

Harness facts (HARNESS-FACTS numbers):
- **H1** is fact 2: a background exit reaches a session that is in a turn at its next tool call (observed).
- **H2** is fact 4: PreToolUse hooks (believed).
- **H4**: by facts 1-2, only the owner, a child's turn-end note, or the exit of the session's own background command can wake a session.
- **H5** is fact 5: the kinds of transcript record (believed).
- **H7** is fact 8, quoted from `inputs/HARNESS-FACTS.md:34-36`: "The PC goes to sleep after 15 idle minutes unless a session is in a turn or holds a keep-awake request, which lapses about five minutes after the session goes idle."

### R5 and the leases

R5 (protocol lines 124-125): "A tick counts at most once per Δ. No clock reads elapsed wall time."

| Lease / deadline | Counted in | Reads wall time? |
|---|---|---|
| FX-W1 L1 (no lease; the exit marker) | — | no |
| FX-W1 L2 alarm lease `lease_ms` | wall time: `now − renewed_at` | **yes** |
| FX-W7 L2 watcher lease | wall time: `now − last_tick_at` | **yes** |
| FX-W7 RL-yes run-lock lease | wall time: `now − acquired_at` | **yes** |
| FX-W6 deadlines per kind, the age cap | the watcher's counted ticks | no |
| FX-W5 re-raise interval and the `stuck` count | the watcher's ticks | no |
| FX-W7 busy-tick count | the watcher's ticks | no |
| FX-W4 dead-man counters | its own runs | no |
| FX-W2 `arm_confirm_ms` and the ensure's query timeout | wall time, but **only bounding one call inside one turn**: a timeout that cuts a wait short, as `lock_retries` already does. It counts nothing. | timeout only |

The amended R5 sentence applies **only in branch L2** and replaces "No clock reads elapsed wall time":

> "No counter of this rule reads elapsed wall time, except when the process list cannot answer. Then an alarm whose `renewed_at` is older than `lease_ms`, a watcher whose `last_tick_at` is older than `watcher_lease_ticks × Δ`, and (branch RL-yes) a run lock held longer than `run_lock_lease_ms` are judged dead. A suspend makes every such lease look expired at resume, until its holder's next renewal. A judgement in that window can register a second alarm (the first exits superseded at its next beat: one wake per slot per resume) or break a live watcher's lock (the old watcher's next check fails and it exits 75: one wake)."

Because the hook denies `--now`, the clock these leases read is the real clock (refuter B2.6). In branch L1, R5 is unchanged.

---

## FX-W1: tri-state liveness, exit markers, no test flags

**Classical problem.** An unreliable failure detector: "unknown" must never be read as "dead" (S:596 does so today). There are two parts:
- An **exit marker**, the "I am leaving" message of a crash-recovery model. A process that leaves cleanly announces it, so only a crash is left to suspicion.
- **Complete mediation** of the arguments: a test hook must not be reachable in production. Test flags are the classic debug backdoor.

**Classical assumption that fails.** The assumption is that a detector's subject is either up or crashed. An alarm that already fired is "gone" but leaves its record behind (REFUTE-wake-2, script facts; W:775-795). The marker turns that case from "crashed" into "announced". The sleep before the exit cannot be interrupted, so the marker is written only after the sleep.

**Steps.**
1. `lib.liveness(rec, proc, markers)` returns `dead` when an exit marker exists for (rec.pid, rec.start_time). Otherwise it uses `proc.alive`: true is `alive`, false is `dead`, null is `unknown`. In L2, unknown with a lease younger than `lease_ms` counts as alive, and older as dead. It is **never called inside a run-lock hold**. Inside a hold, the reader re-reads the record's bytes and uses the verdict only if they are unchanged.
2. **Exit marker.** Every alarm, just before its exit (30, 0 superseded, 64, and any error exit after registration), exclusively creates `run/arm/exited-<pid>-<start_time>.json {ce, exit, at}`. This is **lock-free**: an exclusive create of a name only it can own. A death between the marker and the exit: the exit is already under way, and its wake is delivered (inferred: the exit follows within milliseconds). A hard kill writes no marker; FX-W4 and branch L2 cover it. **Pruning (rev 4):** the daily prune of `run/arm/` removes a marker only when no slot record names its (pid, start_time).
3. Endturn (S:643-658) reports each source as `alive`, `dead` or `unknown`:
   - exit 1 when any source is dead;
   - exit 2 only when none is dead and some is unknown;
   - exit 0 otherwise.
4. `computeStatus` reads `watcher.json` and the alarm records with `readLoose` (S:353-354). A corrupt one is the anomaly `state-corrupt`, not exit 67.
5. **The hook allows only production flags (rev 4, not attacked).** In the coordinator role, `checkTcbNode` (G:315-353) carries a table: for each script name, the flags and mode combinations its production calls use, taken from each script's spec. Any other `--` token is refused with the reason `flag not allowed`. For the wake scripts the entries are:
   - `watch.mjs`: the default watcher `--root --ce`, and `--alarm --ensure --nonce --root --ce`.
   - `status.mjs`: `--reconcile` with `--arm-nonces`, `--endturn` with its production flags, and `--deadman`.

   `--once`, `--boot`, `--tick`, `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb` and `--no-intake` are therefore refused for every script. Checked against the scripts:
   - `--once` is a counted tick that is never discounted when two calls come close together (W:724-726, W:342-345).
   - `--boot` reaches `edgeFacts` (L:415) and `replace.mjs` (R:44, R:1049). A failure fence becomes the host path when `att.boot !== boot` (R:463). That path being uncharged is inferred from the fence group.
   - `--tick` feeds `replace.mjs` (R:446, R:1040).

   Revision 3's deny-list missed all three. Further checks for the earlier list:
   - `tcb-node` is the coordinator's grammar only (`profiles/coordinator.json:46`; every other profile has `"bash": "none"`).
   - These flags exist in watch.mjs (W:2-4, W:42-46).
   - `--now` exists in audit, admit, certify, commit and cost (grep).
   - The tests call scripts directly, not through the hook (inferred).
   - **New finding, missed by both passes:** `--interval-ms 0` is accepted (W:879-881 checks only `≥ 0`) and becomes Δ (W:712). The watcher then ticks without sleeping, and every tick counts toward hang (the M5 test at W:344-345 compares against the same Δ). That gives a false hang fence of every active child within seconds. Step 5 closes it.
6. Branch L2 only: the alarm wakes every `beat_ms` and renews `renewed_at` in a short, file-only hold. A busy lock skips that beat. Exit 30 comes after enough quiet beats.

**Lock holds and crash points.** Step 2 needs no lock. Step 5 runs in the hook, before the call.

**Who runs it.** The alarm (the marker), the hook (the flags), and every reader. The hook's denial stops the call.

**Property and trace.**
- **AlarmsBounded:** at most `alarm_slots + 1` alarm processes of one ce. The as-built chain (SEM §2) breaks it.
- **NoDeadlock under u:** schedule 3 (an alarm that already fired is judged alive) fails without the marker.
- **NoFalseSuspicion with a forged Δ:** with step 5 ablated, the coordinator runs the watcher with `--interval-ms 0`, the tick count reaches `hang_ticks`, and a healthy child is fenced (2-3 steps). The same holds for repeated `--once` calls (schedule 5).
- **RestartLimit with a forged boot:** with step 5 ablated, failure fences carry `--boot X` and take the host path (schedule 6).

**Changes.**
- lib `liveness` (beside L:1202).
- watch.mjs `runAlarm` exits (W:776-795).
- status.mjs `runEndturn` and `computeStatus`.
- guard-hook `checkTcbNode` (G:315-353).
- CONTRACT: §1.4, §3.9 (exit markers), and §1.2 in L2 only. `.gitignore` gains `run/arm/`.

**Does not cover.** A hard kill under L1 during u (open, top table). A run lock that stays stuck (FX-W7).

---

## FX-W2: arm first; confirmed by an alarm that has not exited

**Classical problem.** The lost wake-up: register before testing, with an idempotent register. Redundancy for sources that are consumed when they fire.

**Classical assumption that fails.** The cure assumes an atomic "register and sleep", and a client that follows the protocol. The session may skip calls and reuse arguments. So in revision 3, confirmation does **not** trust anything the session passes. It reads only what the scripts wrote: slot records and exit markers. A reused or old nonce therefore has no power (this answers B2.2 at its root).

**Files.**
- `run/arm/slot-<k>.json`: `{ce, pid, start_time, nonce}`.
- `run/arm/<nonce>.json`: the ensure's outcome.
- `run/arm/exited-*.json`: exit markers (FX-W1).
- `run/turn.json`: `{ce, turn_seq, read_seq, arm, slots: [{k, pid, start_time}], unarmed_turns}`.

**Steps** (each coordinator turn).
1. **Tool call 1** (background): `watch.mjs --alarm --ensure --nonce X --root R --ce N`. Under S2 there is a second ensure with nonce X2.
2. **Ensure, start:** `checkCe`, which exits 64 on a newer ce. Then an exclusive create of `run/arm/X.json {started}`. If the file exists, exit 0 `nonce-reused`; this is harmless now.
3. **Ensure, outside any lock:** read the slots and the markers. For each slot that has no marker, run **one** `proc.list` with the timeout `ensure_query_ms` (10 s). This needs a timeout argument on `realProc` (L:2755-2759, today fixed at 30 s). A timeout means `unknown`.
4. **Ensure hold 1** (run lock, ce re-checked). Re-read `X.json`; if it says `abandoned`, go to step 8. A slot is **free** when it is absent, of another ce, corrupt, marked as exited, or judged dead with unchanged bytes.
   - A free slot: write the slot record and `X.json = registered{k}`, release, then sleep as the alarm.
   - No free slot: `X.json = present`, release, exit 0 `present`.
5. **Tool call 2** (foreground): `status.mjs --reconcile [--arm-nonces X,X2]`. Steps r1-r13 run as built. The r1 list (S:198-205, outside the lock) also gives a verdict for each slot. In the r8-r13 hold it writes `turn.json`:
   - `turn_seq` + 1;
   - `read_seq`;
   - `arm: unconfirmed`, **unless** the existing `turn.json` has the same ce and `confirmed` and was written in this turn. This is the case when `--arm-nonces` is absent and the previous write has no `endturn` after it (B1.4). Then it keeps `confirmed` and still re-checks the slots in step 7.
6. **Wait.** Reconcile polls the given nonces' files every 200 ms. The wait lasts at least `release_ms` (3 s) and at most `arm_confirm_ms` = `ensure_query_ms` + the lock wait (30 s) + 5 s = **45 s**, so it is longer than the ensure's worst step 3 plus step 4 (B2.3). Then it writes `abandoned` into every nonce file still `started` (or creates it as `abandoned` if absent).
7. **Reconcile hold 2** (file-only). Counting the slots of this ce that are **live** gives `n`. A slot is live when all of these hold:
   - it has **no exit marker**;
   - it is not judged dead by the r1 list with unchanged bytes;
   - it was either registered after r1 by a nonce of this call (its `X.json` says `registered{k}` with the same pid), or it was judged alive or unknown by r1.

   If `n ≥ alarm_slots`, then `arm: confirmed`, `slots`, and `unarmed_turns = 0`. Otherwise `arm: unconfirmed`, `unarmed_turns += 1`, and exit 1 `arm-unconfirmed`.
8. **An abandoned ensure.** It registers if a slot is free. Otherwise it polls `turn.json` every 2 s and exits 0 `abandoned` when `turn_seq` grows past the value it saw, or after `alarm_ms`.

**Slots (owner branch).**
- **S1:** a single death right after an alarm wake leaves no source; FX-W4 covers it.
- **S2:** two slots; the period of slot 2 is 1.5 × `alarm_ms`.

**Crash points.**
- A death before call 1: earlier slots remain; under S1, after the alarm's wake, FX-W4.
- A death between the two calls: the ensure finishes on its own.
- An ensure that dies after step 2: `started`, which turns into `abandoned`.
- A reconcile that dies between its holds: `unconfirmed` (B1.1 is answered by FX-W3's marker check, not by this).

**Who runs it.** The coordinator (calls 1 and 2), the ensure, and reconcile. If it fails, FX-W3 refuses acts that create work, and FX-W4 alerts on no alarm or on a stuck act.

**Property and trace.**
- NoDeadlock: the r3 mutant `arm-start-can-die` (2 steps).
- Schedule 2 (a reused, never-confirmed outcome) must hold with the fix: the fired alarm has its marker, so it is not live.
- Schedule 6: `arm_confirm_ms` below the query time leaves admission never confirmed while u holds.
- Schedule 7: a second reconcile keeps the turn armed (a design check).

**Changes.**
- watch.mjs flags `--ensure` and `--nonce`, and `runAlarm`.
- status.mjs `--arm-nonces` and `runBuild` (both holds); `armAtStart` (S:593-602) is removed.
- lib `realProc` timeout argument.
- thresholds `ensure_query_ms`, `release_ms`, `arm_confirm_ms`, `alarm_slots`.
- CONTRACT §1.4, §3.9, R6 and decision 41.

**Does not cover.** A turn that dies before call 1 under S1; the first turn of a new coordinator (FX-W4).

---

## FX-W3: acts that create work need a live confirmed arm

**Classical problem.** The reference monitor: complete mediation of the guarded operations, with the precondition computed by the trusted base.

**Classical assumption that fails.** The assumption is a client whose turns are atomic. Here a turn can die inside the reconcile..endturn bracket (B1.1). So "armed" is not a fact about a turn. It is a fact about **the alarm that is pending now**, read from files.

**"Armed"** (one file predicate for the script and the hook, with no PowerShell) requires all of:
- `run/turn.json` has ce equal to the caller's ce;
- `arm = confirmed`;
- **no exit marker exists** for any pid and start time in `turn.json.slots`.

Each case of the refuter:
- **B1.1:** T1's confirmation followed by A firing leaves A's marker, so T2 is not armed.
- **B1.2:** `--sleep-ms 0` is denied, and an alarm that fires has a marker.
- If T2 was woken by something else while A is still pending, T2 may create work. That is right: a wake is pending.

| R6 act | Enforced by | How |
|---|---|---|
| A1 arm, A2 reconcile | scripts and hook | `withRunLock(..., {requireArmed: true})` on `replace start` and on a fence with reason `first`. Not armed gives exit 6 `not-armed`. The hook denies the session-start tool on the same predicate. **Never gated:** fences of running attempts, `stop`, `commit`, session stop and session message. |
| A3 endturn's K | script | K is `turn.json.read_seq`, with the ce checked. Then `arm = spent`. |
| A4 to A6 | brief | As in revision 2. On exit 75 from any script: end the turn, retry nothing. |

**A signal to the owner when no work can be created (B3.2).** This is FX-W5's `stuck` count, read by FX-W4. It is caused by an act-due re-raised at the capped interval `stuck_raises` (3) times with no change. That covers every cause:
- an arm that cannot be confirmed;
- a coordinator that skips the act;
- refused admissions.

`turn.json.unarmed_turns ≥ 3` is a second input to the same alert.

**The alarm's own record (rev 4, not attacked).** It covers a coordinator that never runs reconcile while no watcher runs. Steps:
1. The ensure's hold 1 writes `turn_seq_at_reg` (the current `turn.json.turn_seq`) into the slot record.
2. When the alarm fires (exit 30), it reads `turn.json.turn_seq` (a file read). If the value is still equal, no reconcile ran in a whole alarm period. The alarm then exclusively creates `run/arm/unarmed-<pid>-<start_time>.json {ce, turn_seq}`. This happens before its exit marker and needs no lock.
3. The dead-man alerts when two `unarmed` records of the current ce carry the same `turn_seq`, meaning no reconcile across two alarm periods. One record alone is a single skipped turn.

If the coordinator also skips the ensure, the chain of alarms ends, and `runs_no_alarm` alerts instead.

**Interaction with the fence group.** FX-CGATE's checks run in the same hook. Both are file reads, and the call is denied if either denies.

**Property.** NoDeadlock: schedule 1 must hold with the marker check and fail without it. **RevocationNeverGated** (schedule 13) must hold.

**Changes.**
- lib `withRunLock` (L:1463-1472).
- replace.mjs `underLock` (271-277).
- the guard-hook coordinator branch.
- status.mjs endturn.
- handover `briefLine` (351-354).
- new `tcb/briefs/coordinator.md`.
- CONTRACT §1.4, §3.9, R6 and decision 41.

**Does not cover.** An alarm killed hard after it was confirmed (FX-W4).

---

## FX-W4: the dead-man check

**Classical problem.** A watchdog or dead-man's switch outside the failure domain.

**Classical assumption that fails.** The assumption is that the watchdog can reset its subject and shares none of its failure modes. Here it can only alert (H4). It is itself a program start (open).

**Steps.**
1. The owner installs a scheduled task with these settings:
   - period 5 min;
   - "run only when the user is logged on";
   - **"wake the computer to run this task", required**, with wake timers allowed in the power plan. An install without it is incomplete, and the status view flags it as anomaly `deadman-nowake`.

   The task also runs at logon.
2. `status.mjs --deadman --root R`. It is read-only and takes no lock. It runs one `proc.list` (30 s) and writes only `run/deadman.json` (single writer). It counts, in its own runs:
   - `runs_no_alarm`: the list answers, and no alarm of the current ce is alive and without an exit marker;
   - `list_hist`: the last 5 runs, one bit each for whether the list failed (rev 4: a window, not consecutive runs);
   - it reads `watcher.json.stuck`, **`run/watcher-busy.json.busy_ticks`** (rev 4: the file FX-W7 writes), `turn.json.unarmed_turns`, and the `unarmed-*` records (FX-W3).
3. It alerts when any of these holds:
   - `runs_no_alarm ≥ 2`;
   - **at least 3 of the last 5 runs** saw the list fail;
   - `stuck` is non-empty;
   - `busy_ticks ≥ busy_alert_ticks` (10);
   - `unarmed_turns ≥ 3`;
   - two `unarmed` records share a `turn_seq`.

   R6's bound states that the `stuck` path takes about 4.75 h. **It alerts once per onset:** it records `alerted: {cause}` and alerts again only after that cause cleared for one run (B4.5).
   - **Branch B:** a toast (unverified).
   - **Branch A:** an app-level scheduled session messages the coordinator (not in HARNESS-FACTS).

**The timing argument, corrected (B4.1).** By H7 (`HARNESS-FACTS.md:34-36`), the PC stays awake only while a turn runs, plus about 5 minutes. So the PC can sleep before the second run, and revision 2's claim that the alert fires before the sleep was wrong. With wake-to-run, each run wakes the PC, so the second run comes 5-10 minutes after the onset whether the PC sleeps or not. On wake every process resumes (fact 8). The cost: the PC wakes every 5 minutes for a few seconds, for as long as the task is installed (inferred). If timers stop while the PC sleeps (H7 b, open), these wakes are also what lets a pending alarm advance.

**Who runs it.** Windows Task Scheduler. The owner acts (B), or the app does (A).

**Property.** **NoSilentDeadlock:** every state with no live alarm, a stuck act, or a stuck run lock leads to an owner alert. It must fail in schedules 5, 8 and 11 when the corresponding cause is ablated.

**Changes.** status.mjs mode `deadman`; `tcb/settings/deadman-task.xml` (WakeToRun true); CONTRACT §2.1, R6 and decision 41.

**Does not cover.** The open rows of the top table: reach, common mode, a missing task, and H7 b.

---

## FX-W5: act-due raised again while its condition holds

**Classical problem.** At-least-once delivery with a visibility timeout and capped backoff.

**Classical assumption that fails.** The assumption is a consumer that acks after processing. The coordinator acks at endturn whatever it did. So the trigger to raise again is "the condition still holds", not "no ack".

**Steps** (unchanged from revision 2, plus one step).
1. `rowAct` returns null for rows that status gives to the owner, zombie-over included (S:523).
2. When the condition still holds, raise again at the interval `min(15 × 2^b, 60)` ticks, with `b ≤ 2`.
3. When `b` is at its cap and the same ident is raised again with its condition unchanged, increment `stuck_count`. At `stuck_raises` (3) the ident goes into `watcher.json.stuck`. The ident leaving the active set removes it.

**Property.** PromptResponse (branch R1). Schedule 5 feeds NoSilentDeadlock.

**Owner branch.**
- **R1:** this fix.
- **R2:** as built.

---

## FX-W6: hang by per-kind deadlines in ticks

**Classical problem.** ◇P under partial synchrony (Chandra-Toueg; Dwork-Lynch-Stockmeyer), using per-operation deadlines, plus an **overall deadline** (a request's total budget) against slow progress.

**Classical assumption that fails.** The assumption is that silence means a crash or a delay. Here the subject writes its own evidence (B5.1). So every kind has a finite deadline, and the age cap bounds the whole attempt.

**Steps.**
1. **First tick of an epoch:** when `fresh`, nothing is counted on that tick.
2. **The kind** is read from the transcript tail: `tool`, `bg-wait`, `model` or `idle`. A transcript that cannot be read counts as `model`.
3. **The deadline per kind, in counted ticks:**
   - `tool`: the declared timeout + slack (12);
   - `bg-wait`: 60;
   - `model`: 10.

   On reaching it: class 21 `hang`, charged, as today.
4. **`idle` is never a charged hang (B5.3).** At `idle_ticks` (30), the watcher raises act-due `idle-child` for the coordinator (FX-W5 raises it again). The coordinator answers the child or stops it. No automatic fence.
5. **Attempt age cap (B5.2; rev 4, not attacked).** `age_ticks` counts the counted ticks since the attempt was bound. At `attempt_max_ticks` (a gate; 240 as a placeholder), the watcher raises the act-due `age-cap` for the coordinator. It is **uncharged** and there is **no automatic fence**: the coordinator lets the attempt continue (which re-arms the cap for another `attempt_max_ticks`) or stops it. FX-W5 raises it again, and its `stuck` path reaches the owner. An honest long task is no longer failed by the cap (schedule 13). The bound on imitation now rests on the coordinator's or the owner's answer (top table). The "progress mark" alternative was not chosen: the scripts define no progress mark (inferred from the absence of one in `parseTranscript`), so it would be a new mechanism.
6. **Branch B2:** one refund per task for a fence later shown false, with RestartLimit restated as a count of R + 1.

**Suspend.** Ticks as built, with M5's 2Δ discount. A suspend shorter than 2Δ in timer branch b still counts (open, top table). The property it breaks: **NoFalseSuspicion** after `model_ticks` such cycles during a model wait (30 cycles for an idle act-due, which is harmless now; 60 for bg-wait). It also breaks HealthyNotFailed under B2 after two episodes.

**Owner branches.**
- **B1:** a stated bound per kind and for the age cap.
- **B2:** one refund.

**Property.**
- NoFalseSuspicion: the r3 mutant `no-timeliness`.
- Schedule 9: an idle child charged as a hang must fail without step 4.
- Without step 5 the coordinator is never asked, which breaks **BoundedAttemptAsked**. It replaces BoundedAttempt in rev 4: every attempt older than `attempt_max_ticks` counted ticks has an `age-cap` act-due raised. With a charged fence instead, HealthyNotFailed fails (schedule 13).

**Changes.** watch.mjs `evaluate` (W:347-421) and `freshTaskState`; lib `parseTranscript` tail; thresholds `idle_ticks` and `attempt_max_ticks`; stop.mjs (B2 only); CONTRACT §1.4 and §3.20; R5.

---

## FX-W7: the watcher lock under the run lock; a busy run lock skips the tick

**Classical problem.** Lock leases plus fencing (Chubby). Graceful degradation under contention: shed the work, do not die (B6.1).

**Steps.**
1. **The waiter for `watcher.lock`.** It judges the holder outside any lock. In L1 an unknown holder is never broken. If the holder is judged dead, the waiter takes the run lock, re-reads the lock and state bytes, and breaks the lock only if they are unchanged.
2. **The watcher, each evaluation:**
   - It tries the run lock with a **short wait** (`watcher_lock_try_ms`, 5 s).
   - Once held, it does `assertHeld(watcher.lock)`, its appends and its `watcher.json` write, then releases.
   - **How a skipped tick is thrown away (rev 4, not attacked).** As built, the state lives in memory across ticks: `ticks_total` is incremented before `evaluate` (W:730-733, and W:725 for `--once`), and `evaluate` mutates `state` in place (hang counters, transcript `end_byte`, keys). The fix: each tick evaluates `next = structuredClone(state)`, with `next.ticks_total += 1`. Only after the hold succeeds and `watcher.json` is written does the loop set `state = next`.
   - **On a busy lock:** `next` is dropped, so the tick does **not count** and the transcripts are re-read from the old `end_byte` at the next tick. Appends are keyed, so a re-read appends nothing twice. `busy_ticks += 1` goes into `run/watcher-busy.json`. The next counted tick may see a gap above 2Δ and be discounted by M5: one hang tick lost, which errs only toward suspecting less. That file is a single writer (the holder of `watcher.lock`) and is written without the run lock. A successful hold resets the count.
   - It exits 75 only on a lost `watcher.lock`, found by `assertHeld` inside the hold, or outside it on a busy tick.
   - Result: a stuck run lock costs no wake loop, and FX-W4 alerts at `busy_ticks ≥ 10`.
3. **Quarantine** of a corrupt `watcher.json`, as in revision 2.
4. **A shared value:** one `watcher_lease_ticks` (L2).
5. **Branch RL-yes / RL-no** for a stuck run lock while the list is unknown, as in revision 2. In both, the FX-W4 alert now fires.

**Who restarts a dead watcher while the list is unknown?**
- **L1:** nobody, so latency is alarm-paced, and FX-W4 alerts.
- **L2:** endturn reports the watcher dead after its lease, and step 1 breaks the lock.

**Property.**
- SingleWatcher: schedule 12.
- **NoBusyLoop** must hold in schedule 11 with step 2's skip, and fail with revision 2's exit 75.

**Changes.** lib `acquireLock` (L:1315-1328, L:1366-1369) for `watcher.lock`; watch.mjs `evaluate` (W:627-668) and `loadWatcherState`; thresholds `watcher_lock_try_ms` and `busy_alert_ticks`; CONTRACT §3.10 and §4.

---

## Change log

### Revision 2 (per point of REFUTE-wake)

| Point | My check | Change |
|---|---|---|
| A1.1 | Right: L:2755-2759 | Liveness judged outside the holds |
| A1.2, X1 | Right | Lease made branch L2; the R5 sentence |
| A1.3 | Right | One file predicate |
| A1.4 | **Partly wrong**: W:315, W:730-733 | Second pass agrees (REFUTE-wake-2 §3) |
| A1.6, A2.4, A2.5, A3.6, A4.5, A5.4, A6.7, A7.5 | Answered | none |
| A1.7, A6.8 | Right | Smaller |
| A2.1 | Right | Nonce made exclusive (revision 3 removes its power) |
| A2.2 | Right | Retry cut; abandoned ensures |
| A2.3, A3.3, X2 | Right | No PowerShell in any hold |
| A2.6, X3 | Partly | Only acts that create work are gated |
| A3.1 | Right | Revocations are never gated |
| A3.2, X4 | Right | One predicate |
| A3.4 | Right | Turn boundary from the tail withdrawn |
| A3.5 | Right | ce carried in `turn.json` |
| A3.7 | Not answered before | Section added |
| A4.1 | Right | "Fresh" means a live alarm |
| A4.2 | Right | Timing (corrected again in revision 3) |
| A4.3, A4.4 | Right | Recorded as open |
| A4.6, A7.3 | Right | One value |
| A5.1 | Right | The interval is capped |
| A5.2 | Right | zombie-over excluded |
| A5.3 | Right | Stated (alert added in revision 3) |
| A6.1, A6.2, A6.4 | Right | Ping withdrawn |
| A6.3 | Partly | Finite deadlines (age cap added in revision 3) |
| A6.5 | Right | Refund cap 1 |
| A6.6 | Right | Ticks |
| A7.1 | Right | Run-lock fencing |
| A7.2 | Right | R5 sentence |
| A7.4 | Right | L1/L2 |

### Revision 3 (per point of REFUTE-wake-2)

| Point | My check against the scripts | Change |
|---|---|---|
| Script fact: hook does not filter arguments | **Right**: G:315-353 checks only `node`, the path and metacharacters. Only the coordinator has `tcb-node` (profiles grep). | FX-W1 step 5: the hook denies the four test flags |
| Script fact: `--now` freezes the clock | Right: W:712, W:721-733 re-read flags | Same denial |
| (new, mine) `--interval-ms 0` | W:879-881 accepts 0; W:712 makes it Δ; W:344-345 | Same denial; recorded in FX-W1 |
| Script fact: no record on alarm exit | Right: W:775-795 | FX-W1 step 2: exit marker |
| B1.1 stale `confirmed` | **Right** | FX-W3: armed requires no exit marker on the confirmed slots |
| B1.2 confirmed ≠ pending | Right | Marker plus flag denial |
| B1.3 | Benign (agree) | none |
| B1.4 second reconcile disarms | Right | Hold 1 keeps `confirmed` within the turn; step 7 recounts the slots |
| B1.5 | Agree | none |
| B2.1, B2.4, B2.5 | Agree, benign | none |
| B2.2 reused never-confirmed outcome | Right | Confirmation counts slots that have not exited, not nonces; reuse has no power |
| B2.3 deadline vs query | **Right**: 30 s per query (L:2755-2759) against `arm_confirm_ms` 30 s | One query with a 10 s timeout; deadline 45 s |
| B2.6 test flags | Right | Hook denial |
| B2.7 old-ce abandoned exit | Agree, one bounded wake | none |
| B3.1 draining holds | Agree | RevocationNeverGated kept as schedule 13 |
| B3.2 nobody tells the owner | **Right** | FX-W5 `stuck`, `unarmed_turns`, FX-W4 alert; residue recorded |
| B4.1 timing misreads H7 | **Right**: `HARNESS-FACTS.md:34-36` | Wake-to-run required; argument rewritten |
| B4.2 timers frozen in sleep | Right, unknown | Open (H7 b); the wakes partly cover it |
| B4.3, B4.4 | Right | Open |
| B4.5 nagging | Right | Alert once per onset |
| B5.1 | Agree | Age cap |
| B5.2 imitation 6× looser | Right | Attempt age cap (BoundedAttempt) |
| B5.3 idle charged | **Right** | Idle becomes an act-due, never a charged hang |
| B5.4, B5.5 | Agree | none |
| B5.6 M5 gap | Right | Open, with the failing property stated |
| B6.1 stuck run lock loop | **Right**: revision 2's step 2 exits 75 on every busy tick | Skip the tick, count it, alert; exit only on a lost `watcher.lock` |
| B6.2 | Agree | none |
| §3 A1.4 | Agreement | none |
| §4 withdrawn table | Agree | Rows carried into the top table (D5 by B1/B2, M5, D1 under L1). D2 now covers only acts that create work; revocations rest on the fence group |

### Revision 4 (per point of REFUTE-wake-3; no change below has been attacked)

| Point | My check against the scripts | Change |
|---|---|---|
| FX-W1 marker prune | Right (the prune of `run/arm/` is mine, rev 2) | Prune only markers no slot names |
| FX-W1 `--once` | **Right**: W:724-726 counts a tick on every call; W:342-345 discounts only a gap above 2Δ | Allow-list (step 5) |
| FX-W1 `--boot` | **Right**: L:415, R:44, R:1049, R:463. "Uncharged" is inferred, as the refuter says | Allow-list |
| FX-W1 `--tick` | Right: R:446, R:1040 | Allow-list |
| FX-W1 env / other profiles | Agree: grammar G:319-336 | Helpers' profiles added as open |
| FX-W2 load note | Agree: it widens the hard-kill row | Open row added |
| FX-W3 never reconciles | **Right**: both inputs needed a script that runs | The alarm's `unarmed` record |
| FX-W4 wrong file | **Right**: my rev 3 named both files | Reads `watcher-busy.json` |
| FX-W4 consecutive runs | Right | 3 of the last 5 runs |
| FX-W4 4.75 h | Right | Stated; open row |
| FX-W6 age cap charged | **Right**: deterministic, zero faults | Uncharged act-due; property BoundedAttemptAsked |
| FX-W7 in-memory state | **Right**: W:725, W:730-733 | Evaluate a clone; adopt it after the hold |
| §2 misclassed rows | Right on both | Hook row split; the "never reconciles" row removed (fixed) |
| §2 six missing | Five are fixed by the changes above; the helpers' profiles row is added as open | Table |

---

## For the modeller

The work order. One `OP` per numbered action. "Atomic" means one model step: the same lock hold, or one exclusive create. A death (`x`) can fall between any two steps unless the steps are joined.

**Under the owner's ruling (charter):** two fields and two faults; one run with everything as built and all fixes on; one ablation per fix with its main flag off; a sub-flag ablation only where a refuter finding would break the fix (marked "sub" below). A schedule that needs three faults is not run (marked).

### Flags, the property each must fail when off

Main flags and the sub-flags added in rev 4 (the "Schedules" column of this table uses the REFUTE-wake-2 numbering; the final mapping is the next table):
- `FIX_HOOK_TESTFLAGS` becomes **`FIX_FLAG_ALLOWLIST`**. Its actions when off: `sleep0`, `nowPast`, `delta0`, **`once`** (an extra counted WATCHER_TICK with no wait) and **`boot`** (a failure fence that takes the host path).
- **Sub-flags, rev 4:**
  - `FIX_MARKER_PRUNE` under `FIX_ALARM_MARKER`;
  - `FIX_UNARMED_REC` under `FIX_ARM_GATE`;
  - `FIX_BUSY_FILE` and `FIX_LIST_WINDOW` under `FIX_DEADMAN`;
  - `FIX_AGE_ASK` under `FIX_AGE_CAP`: off means a charged fence;
  - `FIX_TICK_COPY` under `FIX_BUSY_SKIP`.

| Flag (suggested) | Actions | Must fail when off | Schedules |
|---|---|---|---|
| `FIX_ALARM_MARKER` | ALARM_EXIT = {create marker} then {exit, wake} as two steps; the reader treats a marked slot as dead | NoDeadlock (L1, u) | 3 |
| `FIX_HOOK_TESTFLAGS` | Off: the coordinator may issue an ensure with `sleep0`, an ensure with `nowPast`, and a watcher with `delta0` | AlarmsBounded / NoBusyLoop (L2 + u); NoFalseSuspicion (`delta0`); NoDeadlock (`sleep0`) | 4 |
| `FIX_ARM_FIRST` (replaces `FIX_ARM_AT_START`) | ENSURE_START (exclusive create) · ENSURE_QUERY (outside the lock; may be `slow` ≤ deadline) · ENSURE_HOLD (atomic: re-read, register or present) · RECONCILE_HOLD1 (atomic, writes `turn.json`) · RECONCILE_WAIT (enabled until every nonce is final or the deadline) · RECONCILE_HOLD2 (atomic: abandon and count live slots) · ABANDONED_EXIT (enabled once `turn_seq` grows, or the alarm period) | NoDeadlock (`arm-start-can-die`); with `slow > deadline` admission is never confirmed | 2, 6, 7 |
| `FIX_ARM_GATE` | The guard on ADMIT, START and FENCE_FIRST reads `turn.json.arm` and the markers of its slots in the same step as the write | NoDeadlock | 1; RevocationNeverGated must hold always: 13 |
| `FIX_DEADMAN` | DEADMAN_RUN (environment, periodic; wakes the PC with WakeToRun) updates counters; OWNER_ALERT is enabled once a counter reaches its threshold, once per onset | NoSilentDeadlock | 5, 8, 11 |
| `FIX_ACT_RERAISE` | RERAISE inside WATCHER_TICK when acked and the condition holds and the interval has passed; the `stuck` counter | PromptResponse; NoSilentDeadlock (via 5) | 5 |
| `FIX_OP_DEADLINE` (with `FIX_EPOCH_TICK`) | the kind as a child variable; the hang threshold per kind | NoFalseSuspicion (`no-timeliness`) | — |
| `FIX_IDLE_ACT` | idle at its threshold raises an act-due, not a fence | NoFalseSuspicion (B1) / HealthyNotFailed (B2) | 9 |
| `FIX_AGE_CAP` | AGE_ASK at `attempt_max_ticks`: an uncharged act-due (rev 4; AGE_FENCE is the `FIX_AGE_ASK`-off form) | BoundedAttemptAsked; with `FIX_AGE_ASK` off, HealthyNotFailed | (imitation: a child that makes one call per `bg` threshold) |
| `FIX_WLOCK_UNDER_RUN` | BREAK_WLOCK atomic with the run lock; WATCHER_TICK = {assertHeld, appends, state write} atomic | SingleWatcher | 12 |
| `FIX_BUSY_SKIP` | WATCHER_TICK with the run lock busy: no write, not counted, `busy += 1` | NoBusyLoop | 11 |
| `FIX_PAUSE_DISCOUNT` (exists, M:461) | as built | NoFalseSuspicion (`pause-short`) | 10 (open: timer branch b) |

### Time in the untimed model

- **Ticks:** a WATCHER_TICK step. Counted thresholds are small parameters (H=2), all in ticks.
- **The alarm period:** ALARM_FIRE is enabled at any time while the alarm sleeps (untimed).
- **Leases in L2:** a bit per holder, `missed`, set by the environment when the holder has not stepped since its last renewal and the list is unknown. A **suspend fault `sp`** (budgeted) sets `missed` for every holder at once. A holder's next step clears its own bit. In L1 there are no lease bits.
- **`arm_confirm_ms` and the query timeout:** a nondeterministic `slow` on ENSURE_QUERY. With the fix, slow finishes before RECONCILE_HOLD2 (the deadline is above the query time). The ablation lets RECONCILE_HOLD2 run first.
- **The PC sleeping:** an environment bit `asleep`. While it is set only DEADMAN_RUN is enabled (with WakeToRun, which clears it), and the PC falls asleep only when no turn is in progress. Timer branches:
  - (a): ALARM_FIRE is disabled while asleep.
  - (b): enabled.
- **Short suspend (the M5 gap):** a fault `ss` makes the next WATCHER_TICK count with no child step in between. Branch b only.

### Faults

`x` (death), `u` (list unknown), `o` (an act omitted), `sp`, `ss`, `slow`, `hung-lock` (a run-lock holder alive and never releasing). All are budgeted.

### Owner branches to run both ways

L1/L2, S1/S2, B1/B2, R1/R2, RL-yes/RL-no, and H7 a/b (a fact, not a ruling). H4 A/B does not change the model: the alert is OWNER_ALERT either way.

### The eighteen final schedules (REFUTE-wake-3 §4) mapped to fixes

"Expected" is the result with all fixes on. **fails (open)** means a point stays open by design (top table).

| # | Schedule | Faults | Fix / flag tested | Property | Expected |
|---|---|---|---|---|---|
| 1 | Stale confirmed | x, o | FX-W3 `FIX_ARM_GATE` | NoDeadlock | holds; fails with the flag off |
| 2 | Reused outcome | x, o | FX-W2 `FIX_ARM_FIRST` with markers | NoDeadlock | holds |
| 3 | L1 fired alarm under u | u | FX-W1 `FIX_ALARM_MARKER` | NoDeadlock | holds; fails with the flag off |
| 4 | Hard kill under u | u, x | FX-W1 L1 vs L2; FX-W4 | NoDeadlock / NoSilentDeadlock | **fails in L1 (open)** until OWNER_ALERT; holds in L2 |
| 5 | Forged ticks (`--once`, `delta0`) | o (none needed) | FX-W1 `FIX_FLAG_ALLOWLIST` | NoFalseSuspicion | holds; fails with the flag off (sub-check, rev 4) |
| 6 | Forged boot | none | FX-W1 `FIX_FLAG_ALLOWLIST` | RestartLimit | holds; fails with the flag off (sub-check, rev 4) |
| 7 | Never reconciles | o | FX-W3 `FIX_UNARMED_REC` | NoSilentDeadlock | holds; fails with the sub-flag off (rev 4) |
| 8 | Confirm deadline vs slow query | slow | FX-W2 | admission eventually confirms | holds |
| 9 | Second reconcile | none | FX-W2 step 5 | design check: start allowed | holds |
| 10 | Sleep before alert | x, asleep | FX-W4 `FIX_DEADMAN` | NoSilentDeadlock | holds; fails with the flag off |
| 11 | Stuck run lock | hung-lock | FX-W7 `FIX_BUSY_SKIP`; FX-W4 `FIX_BUSY_FILE` | NoBusyLoop, NoSilentDeadlock | holds; NoSilentDeadlock fails with `FIX_BUSY_FILE` off (rev 4) |
| 12 | Flapping list | u (intermittent) | FX-W4 `FIX_LIST_WINDOW` | NoSilentDeadlock | holds; fails with the sub-flag off (rev 4) |
| 13 | Honest long task | none | FX-W6 `FIX_AGE_ASK` | HealthyNotFailed | holds; fails with the sub-flag off (rev 4) |
| 14 | Idle child | none | FX-W6 `FIX_IDLE_ACT` | NoFalseSuspicion | holds |
| 15 | Short suspends | ss (repeated) | FX-W6 / M5 | NoFalseSuspicion; HealthyNotFailed under B2 | **fails in timer branch b (open)**; holds in a |
| 16 | SingleWatcher | u, sp (L2) | FX-W7 `FIX_WLOCK_UNDER_RUN` | SingleWatcher | holds |
| 17 | RevocationNeverGated | o | FX-W3 | RevocationNeverGated | holds |
| 18 | Skipped-tick state | hung-lock (transient) | FX-W7 `FIX_TICK_COPY` | NoFalseSuspicion; no duplicate append | holds; the hang count advances with the sub-flag off (rev 4) |

Not run, under the ruling: schedule 4 with an extra `sp` (three faults); schedule 15 combined with B2's second episode beyond two faults; every "each flag alone" matrix.

---

## Revision 5 notes (answers to `ABLATION-wake.md`; nothing below is attacked)

### N1. FX-W4 alerts once per onset; an alerted turn that dies before call 1 leaves silence

**Verdict: a hole in the design.** I took "once per onset" from REFUTE-wake-2 B4.5 in rev 3. An alert is a wake the owner acts on, and an alerted turn can die like any other (one x). After that the cause still holds, and no source reports it again (`ABLATION-wake.md` §1 and §6.1: FXW-4 NoDeadlock F 8; FXW-ALL F 7). Classical name: a watchdog must keep barking while the fault persists. "Alert once" is the shape of notification deduplication. It is not the shape of a watchdog.

**Smallest change** (FX-W4 step 3; the modeller's `CAND_REALERT` becomes the design):
- After an alert, while the same cause holds, alert again every `realert_runs` runs, counted in the dead-man's own runs.
- The cause clearing for one run ends the onset, as now.

**Owner ruling, the pace.** Both branches give liveness, because alerts recur infinitely often while the cause holds:
- **P1 constant:** `realert_runs` = 6 (every 30 min).
- **P2 backoff:** 6, 12, 24 runs, then capped at 24 (every 2 h).

B4.5's cost (nagging) is the price either way. P2 nags less and waits longer.

**Targeted check.** Configuration C_X (WA + FX-W1 + FX-W2 + the hard-kill branch + `FIX_DEADMAN`), part k=1, x=1. Schedule: no alarm, so the dead-man alerts and the owner wakes the coordinator; that turn dies before call 1 (x).
- NoDeadlock and AlwaysCanResolve must **fail** with `FIX_REALERT` off. This is the FXW-4 run as done.
- They must **hold** with it on (FXW-4R reproduces this).
- The pace is untimed, so P1 and P2 are one model.

### N2. A turn that ends without endturn (hand-over exit 2) leaves its fired alarm un-replaced

**Verdict: a hole in the design, partly mine.** I checked the scripts and FIX-JOIN:
- `handover raise` exits 2 when the process list fails (handover.mjs:271-276).
- FIX-JOIN 2b row 8 ends the turn on exit 75 and retries nothing. That rule came from my FX-W3 brief (rev 3, A4-A6).
- The fence group's rule ends the turn after a failed raise.

So two of the system's own instructions end a turn without row 9 (endturn). The tri-state check in endturn (FX-W1 step 3: exit 1 on a marked slot, after which the coordinator ensures again) is exactly what would replace an alarm that fired mid-turn. FX-W2 cut the in-turn retry (rev 2) on the premise that endturn closes every turn. The modeller found it does not (`ABLATION-wake.md` §2: NoSilenceAfterFirstCall F 9 at one fault u).

**Smallest change with one slot.** A rule of the brief and of FIX-JOIN 2b, in place of "end the turn": **"Every turn's last call is `status --endturn`, also after `handover` exit 2 and after any exit 75. Act on its exit 1 once (ensure again or start the watcher), then end the turn. If endturn itself exits 75, end the turn."** For a compliant coordinator this closes the gap with S1. It is smaller than S2 because it adds no process and no slot. The modeller named the same change (INFERRED, not run).

**What it does not cover.** A coordinator that omits endturn anyway. A brief alone is a wish (my own D2 principle). There are two owner branches for that residue:
- **E1 (brief only):** the omission is recovered by FX-W4 at the next dead-man alert. Silence lasts until then (5-10 min with WakeToRun).
- **E2 (brief + enforced backstop, "defer once"):** an alarm whose period ends while a turn of its ce is open defers its exit **once**, by one more `alarm_ms`, and exits at the next end whatever it finds. "Open" means `turn.json.turn_seq` is newer than the slot's `turn_seq_at_reg` and `arm` is not `spent`. Its wake would be consumed mid-turn anyway. The single deferral bounds the cost when the open turn died before endturn: one extra alarm period of latency, never silence. Who runs it: the alarm, with a file read and no lock. It changes premise (b) below: a deferred alarm fires at most once more, at 2 × `alarm_ms`. E2 is a new mechanism, so it needs its own check before it is adopted.

**Probe:** none for E1. E2 needs the check below run with E2 on.

**Targeted check.** Configuration FXW-4R (WA + FX-W1 + FX-W2 + FX-W4, S1), part k=1, u=1. Schedule: draining; `handover raise` exits 2 (u); the next turn's ensure says `present`; the old alarm fires mid-turn (marked); reconcile says `arm-unconfirmed`; `handover` exits 2 again.
- NoSilenceAfterFirstCall must **fail** with the turn ending after exit 2 (as modelled).
- It must **hold** when every turn's last act is endturn with its exit-1 act. Model this as: the hand-over exit-2 path and the exit-75 path go to endturn.
- E2 only: the same schedule with endturn omitted (fault o) must hold NoSilenceAfterFirstCall's liveness form (NoDeadlock) without FX-W4's alert.

### N3. What the design must state: FX-W2 needs FX-W4; FX-W6 holds only under B1; three timing premises

**Verdict: assumptions to state. None is the model's reading alone.** Sentences to add (rev 5):

- **FX-W2, "Does not cover":** "FX-W2 is correct only together with FX-W4. Without the dead-man, a death before call 1 leaves no source (FXW-12-S2: NoDeadlock F 2). FX-W2 shortens and bounds the M2 window; it does not close the p0 path."
- **FX-W6, "Owner branches":** "The modelled result (NoFalseSuspicion holds) is for branch B1 only. It rests on the environment bound 'a healthy operation of kind k ends within its kind's deadline', which the watcher does not compute. B2 (the refund) is not modelled; in B2, NoFalseSuspicion may fail once per task by design."
- **Timing premise (a), FX-W2:** "An alarm does not fire between its own ensure and the same turn's reconcile hold 2." It holds because `alarm_ms` (1 h) far exceeds the time from call 1 to the end of hold 2 (at most `arm_confirm_ms` = 45 s after call 2, which the coordinator issues next). It can fail only if the PC sleeps between the two calls while timers keep counting (H7 b, open). Then the turn is `unconfirmed`, which is the safe side: no work is created, and the alarm's exit wakes. **Probe: none.**
- **Timing premise (b), FX-W2:** "At most one current alarm of a coordinator fires inside one of its turns." Under S1 there is one current slot, so (b) holds trivially. Under S2 both slots are registered together and fire at 1 × and 1.5 × `alarm_ms`, so (b) needs **every coordinator turn to be shorter than 0.5 × `alarm_ms`** (30 min). Under E2 add one deferral (2 × `alarm_ms`). **Probe:** the longest coordinator turn in the recorded transcripts (a read-only measurement). **Owner ruling if it can exceed 30 min:** either the S2 period of slot 2 rises to 2 × `alarm_ms` (the premise becomes "turn < 1 × `alarm_ms`"), or the case is stated as not covered.
- **Timing premise (c), FX-W4:** "A pending wake starts the coordinator's call 1 within one `deadman_period` (5 min)." If it is violated (a blocked program start, a sleeping PC), the dead-man may alert while a wake is pending. That is a spurious alert, the safe direction: a cost, not a hole. **Probe:** none, although the owner's PC record of blocked program starts (memory: program-start blocks) makes violations likely to be seen.

**Targeted check:** none new. The premises are already encoded in the model (alarm byte bit 5 for a; one firing per turn for b; no counting while a wake is pending for c). The check is that the modeller names them in its verdict lines as premises, not as properties of the fixes.
