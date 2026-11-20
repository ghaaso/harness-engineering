# watch.mjs (unit U1b)

## Purpose
The coordinator's event loop (R4-R6, R11, R50). One background process per ce reads files and
transcripts each tick, keeps per-task counters, appends `event` lines and wakes the coordinator by
exiting with the most urgent class (CONTRACT §1.4). Also the alarm (a long sleep, then exit 30) and
the intake runner it spawns without waiting.

## Command line
```
node tcb/watch.mjs --root R --ce N [--interval-ms MS] [--no-intake] [--now ISO] [--free-mb M]
node tcb/watch.mjs --once  --root R --ce N [--no-intake] [--now ISO] [--free-mb M]
node tcb/watch.mjs --alarm --ensure --nonce X --root R --ce N [--sleep-ms MS] [--now ISO]
node tcb/watch.mjs --intake --root R --ce N
```
No positional mode (stdout `mode: null`; `result.run` is watcher|once|alarm|intake). `--once`,
`--alarm`, `--intake` are exclusive (two → 66). FX-W2: the alarm starts only as the ensure, so
`--alarm` needs `--ensure` and `--nonce X` (32 lowercase hex, a new nonce each turn, the one the turn
then gives status's reconcile as its arm nonce); `--alarm` without either, a malformed nonce, or
`--ensure`/`--nonce` without `--alarm` → 66 before anything is written. `--interval-ms` overrides Δ (`delta_ms`);
`--no-intake` (test seam) never spawns intake. In the loop, `main()` reads the edge facts (now,
free memory) once per tick (CONTRACT §1.2); `--now`/`--free-mb` fix them. The coordinator starts
every mode as a background command.

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `run/acked.json`, `run/watcher.json`,
`run/alarm.json`, `tcb/thresholds.json` (delta_ms, coalesce_ticks, stall_calls, hang_ticks, loop_k,
W_cc_ticks, Z_frac, reserve_mb, soft_frac, hard_frac, W_star_coord, W_quality, W_star_child,
batch_size, f5_given, transcripts_root), `wt/<task>-e<k>/staging/READY.json`, `store/commits/`,
`store/status/card_status.jsonl`, `store/witness.jsonl`, `store/qualification.json`,
`queue/*/batch.json`, transcripts (lib parser, incrementally from the stored `end_byte`), process
list. The ensure (FX-W2) also reads `run/arm/slot-<k>.json`, `run/arm/<nonce>.json`, the exit
markers `run/arm/exited-*.json`, `run/turn.json` (`turn_seq`) and the thresholds `alarm_ms`,
`alarm_slots`, `ensure_query_ms`, `proc_exe`.

## Writes
`run/watcher.lock` (wx, held for life), `run/watcher.json` (writeAtomic, `assertHeld` first),
`run/alarm.json` (alarm mode, under the run lock), `run/arm/<nonce>.json` (the ensure, FX-W2: {state:
'started', pid} by exclusive create, then {state: 'registered', k, pid} or {state: 'present', pid}
under the run lock; CONTRACT §3.9 [arm-nonce]), `run/arm/slot-<k>.json` {ce, pid, start_time, nonce}
(the ensure's hold 1, under the run lock; [arm-slot]), `run/arm/exited-<pt>.json` {ce, exit, at} (alarm
mode, FX-W1: a lock-free exclusive create, CONTRACT §3.9 [arm-exited]), ledger lines `event` {class, code, urgent,
detail, key}, `zombie-write` {epoch_seen, tokens}, `drain` {window, w_star}, `halt` {reason,
fails[]}, `incident` (intake steps) — every append through `withRunLock(ce)`, so the ce is
re-checked inside the lock before each append (R4). Transcripts are parsed before the lock (§2.1).

## Watcher steps (default and `--once`)
1 `checkCe` (stale → 64 at once). 2 `acquireLock(watcher.lock)`: a live holder → 75 after retries;
a dead holder is broken by lib, under the run lock (FX-W7). 3 Read `watcher.json` (absent → fresh counters; corrupt → quarantined, fresh counters, FX-W7);
counters of every task continue from any earlier watcher (R5); set ce, pid, start_time.
4 Default mode: one **start evaluation** with no tick counted (a new watcher re-evaluates everything,
R6); then loop: sleep Δ, `ticks_total += 1`, evaluate. `--once`: `ticks_total += 1`, evaluate once.
**Evaluate** (in this order; the ce check is the first act):
a. coord ce > own → exit 64 (no write). Table corrupt → exit 67. `verifyLedger` fails → class 27.
b. Per row active at step started|bound (current attempt e): parse its transcripts (session +
   helpers, else folder transcripts) from each file's stored `parse-state` (CONTRACT §3.10: from
   `end_byte`, `lastCall` merged, a shrunk file re-parsed from 0); `calls` = distinct model calls.
   New calls = calls − stored calls; a new epoch resets that task's counters. V =
   `lib.variant(root, row, {f5Given})`.V.
   - V null (design-check) → no stall counter. Else V < V_min → V_min = V, stall_calls = 0; else
     stall_calls += new calls. ≥ `stall_calls` → 20.
   - **Hang by per-kind deadlines in ticks (FX-W6, branch B1).** The first tick of an epoch counts
     nothing (step 1; `ticks_total` still advances). After it, a new conversation record in any transcript
     of the attempt (a new call, a tool result, a prompt: the transcript's `tail.n` grew, or it was
     re-parsed) sets hang_ticks to 0; else a counted tick adds 1. The kind is the main transcript's tail
     (`lib.parseTranscript` `kind`, kept in its parse-state with `tail`; none read counts as `model`);
     its deadline: `tool` = ⌈largest declared timeout of the pending tool uses / Δ⌉ + `tool_slack_ticks`;
     `bg-wait` = `bg_wait_ticks`; `model` = `model_ticks`; `idle` = none. hang_ticks ≥ the deadline → 21
     `{hang_ticks, kind, deadline}`, charged as before. An `idle` child is never a hang: at hang_ticks ≥
     `idle_ticks` step j raises act-due `idle-child`. `age_ticks` adds 1 on every counted tick at step
     bound after the first (a paused one too); age_ticks − age_base ≥ `attempt_max_ticks` → act-due
     `age-cap` (step j; age_base stays 0: no script sets it). `hang_ticks` (the threshold) is read no more. **Pause
     discount (M5, CONTRACT §1.2):** a counted tick whose gap `now − last_tick_at` (the stored
     value of the previous evaluation, any watcher) exceeds 2Δ is *paused*: hang_ticks is left as
     it is (new calls still reset it). This is the watcher's only use of a clock difference and it
     can only withhold a hang count; an unparseable or missing `last_tick_at` counts the tick.
   - `loopRun` of the main transcript's tool uses: run ≥ `loop_k` → 22; stored as `loop {sig, run}`.
   - READY of epoch e (FX-OUT): an uncommitted ready slot in the outcome log (`lib.outcomeState`, R-b; a
     fenced or unreadable log has none) → 11 (detail step: the latest such slot); else a repair marker in
     `staging/READY.json` (it takes no slot) → 12. Either
     voids 20, 21, 22 for that epoch (R5, finding A4).
   - spend (current attempt) ≥ ⌊soft_frac·e_task⌋ → 13; ≥ ⌊hard_frac·e_task⌋ → 23.
   - window = `last_context`; `W_star_child` a gate and window ≥ it → 15.
c. Per attempt k < e of any row, and per attempt fenced but not `stop: confirmed`: a READY with
   `epoch` k → one `zombie-write` line per (task, k) {epoch_seen: k, tokens: spend − spend_at_fence};
   zombie_tokens > Z_frac·e_task → 25.
d. freeMb < reserve_mb → 24 (R10: the coordinator parks the newest session).
e. Non-host `fails` entries across rows with ticks_total − tick < W_cc_ticks, count ≥ 2 → 26 and,
   unless already halted, one `halt` line {reason: "common-cause", fails}. A cluster whose fails
   (task, epoch, class, tick) are all named by an earlier `halt` line writes no new halt line, so an
   owner resume takes effect while those fails are still inside W_cc_ticks; a fail no halt line has
   named yet halts again (review U1-F4).
f. Coordinator window (coord.session's main transcript `last_context`, parsed incrementally through
   `coord_file`): ≥ W_star_coord → 16 and one `drain` line per ce {window, w_star}; ≥ W_quality →
   15. A child's window ≥ `W_star_child` when that is a gate → 15 (b).
g. Tamper → 27: `verifyLedger` fails (a), or an `incident` line with `detail.tamper` true and seq >
   acked_seq (CONTRACT §1.4). Reopened dismissal → 10: a `check` line of check `tms` carrying a
   `reopened` reason with seq > acked_seq (one instance per such line).
h. Checker batch → 14 when the count of `lib.intakeCandidates(root)` not `in_flight` (the cards
   check-queue's intake mode would take) is ≥ batch_size, or > 0 while no row is at started|bound
   (R4: full, or the only thing blocking).
j. **Act due → 17 (M3, CONTRACT decision 40): the planner's own predicate**, so that a live watcher
   cannot stay silent while work waits. Slots used = live + unknown + unconfirmed of
   `lib.slotCount(rows, [], transcripts_root, {root})` (an empty process list: no PowerShell per
   tick); a slot is free when that is < `N_max`; blocked = `runFlags` halted or draining. Per row,
   the act of status's `next` (status.mjs.md), one condition per row keyed `17|<task>:<act>|<e>`:
   planned/none → `replace-fence` and active|parked/stopped → `replace-start`, both only when a
   slot is free and not blocked; fenced, or committed at bound → `stop-request`; stop-requested
   (target attempt k = e − 1, or e for a committed row) with no sample `run/stop-sample/<task>-e<k>
   .json` → `stop-session` while the target's `stop` is none|requested, `stop-verify@-` when it is
   unconfirmed; with a sample → `stop-verify@<sample.tick>` only once ticks_total ≥ sample.tick +
   `stop_verify_deltas` (earlier the verify can only defer); admitted → `start-session`, or `bind`
   when the attempt folder already has a transcript (the reconcile at the next turn start will make
   it started). After the row acts (FX-W6, not row acts, uncharged, no fence): per row at started|bound
   without a READY of the epoch (class 11 or 12), `<task>:idle-child` while its kind is `idle` and
   hang_ticks ≥ `idle_ticks`, and `<task>:age-cap` while age_ticks − age_base ≥ `attempt_max_ticks`. An
   acknowledgement of the age-cap event line (seq ≤ acked_seq) does not re-arm the cap: the condition
   stays, so FX-W5 raises it again at its interval and counts it towards `stuck`, which FX-W4's dead-man
   reads. No script sets age_base (0 from the epoch's fresh state): it is where an explicit "continue"
   act would re-arm the cap, and none is built. Failed rows, `limit` rows and rows whose `next` is `owner`, `none`, `audit` or
   `commit` raise nothing here (READY is class 11). Run level: a `drain` line of this ce with no
   slot used → `-:handover`; a non-empty table whose rows are all committed|cut|failed|dropped and
   none has a row act → `-:run-terminal`; an `event` line with seq > acked_seq whose key is not in
   `active` (its condition has cleared, so its own key no longer wakes) → `-:events`. Like every
   class it is keyed by onset and acknowledged through `acked_seq`, so an act the coordinator
   acknowledged and could not take (admission deferred, say) stays quiet until its condition
   clears and returns.
i. Intake: unless `--no-intake`, no intake alive (`watcher.json.intake` and `proc.alive` not true),
   and some row at started|bound → spawn `process.execPath <root>/tcb/watch.mjs --intake
   --root R --ce N` detached, `stdio: 'ignore'`, `windowsHide: true`, `cwd: root`, unref; record
   `intake {pid, start_time}`. Never awaited.
5 Events (CONTRACT §3.10): each present condition has a key `<class>|<task or ->|<epoch or ->|
<onset_tick>`, the onset kept in `active` while the condition stays present and dropped the first
tick it is absent. Append one `event` line per new key. A key causes an exit only while its line's
seq > `acked_seq`; an acknowledged key stays quiet while the condition persists, and a condition
that clears and returns gets a new onset, a new line and a new exit. Urgent classes (20-27) exit this
tick. Non-urgent ones (10-16) enter `pending` with `first_tick` and exit once ticks_total −
first_tick ≥ coalesce_ticks, together with anything else present. 6 Write `watcher.json`
(`last_tick_at` = now, information only). 7 Exit with
the first present class in §1.4's precedence (64, 27, 26, 25, 24, 23, 22, 21, 20, 11, 12, 10, 13,
15, 16, 14, 17), `result {classes: [...], ticks_total, pending, paused}` (`paused`: the last tick was
a paused one, M5); `--once` with nothing due → exit 0. Step j is evaluated after h and before i.
Release the watcher lock on every exit; an uncaught error exits 70 ("restart the watcher").

## Alarm steps
The alarm is started only as **the ensure** (FX-W2, FIX-wake.md FX-W2; branch S1: `alarm_slots` 1, one
ensure per turn, no second nonce). 1 `checkCe` → 64. 1a (FX-W2 step 2) `lib.createExclusive` of
`run/arm/<nonce>.json` {state: 'started', pid} (it makes `run/arm/`): the name exists (a reused
nonce, or one that reconcile abandoned first) → exit 0 `nonce-reused`, nothing else written. 1b
(step 3, outside every lock) Read the bytes of `slot-1` .. `slot-<alarm_slots>` first, then the exit
markers, then, only when a slot of this ce has no marker, one process list
(`lib.realProc({timeoutMs: ensure_query_ms})`); a list that fails or is cut by the timeout is
unknown, never dead. Each slot's verdict is `lib.liveness`; a record without an integer pid > 0 and
a string start_time is corrupt. 2 Previous `alarm.json`: record it in `result.previous`; kill nothing (decision
5: it exits 0 `superseded` when it wakes). 2b Read the **arm token** (M1, CONTRACT §3.9): the
sha256 of `run/acked.json`'s bytes, null when absent. 3 **Hold 1**, under `withRunLock(ce)` (steps 4
and 8 of FX-W2): re-read the nonce file (did reconcile write `abandoned`?) and `run/turn.json`'s
`turn_seq`; slot k (the first wins) is free when absent, corrupt, of another ce, named by an exit
marker, or judged dead in 1b with its bytes unchanged. A free slot: `alarmSlotTurnSeq` (FX-W3), then
`alarmRegisterSlot` writes `slot-<k>.json` {ce, pid, start_time, nonce} (from this write on the
alarm is registered: every later exit leaves its marker, step 6) and the nonce file {state:
'registered', k, pid}; then `alarm.json` {pid, start_time, ce, armed_at, sleep_ms}. Under S1 the
slot and `alarm.json` are written in the same hold, so they always name the same alarm, and step 5's
`superseded` still reads `alarm.json`. No free slot and not abandoned: the nonce file {state:
'present', pid}, exit 0 `present`, `result.slots` the verdicts of 1b; no marker. 3a (FX-W2 step 8)
Abandoned and no free slot: after the hold, read `turn.json` every 2 s (`checkCe` each time → 64)
and exit 0 `abandoned` once its `turn_seq` exceeds the one read in hold 1 (`why: 'turn'`: the next
turn's reconcile ran, so the exit arrives in that turn), or after the alarm period (`why:
'alarm_ms'`); nothing written, no marker. An abandoned ensure that finds a free slot registers as
above. 4 Sleep `--sleep-ms` (default `alarm_ms`). 5 coord ce >
own → exit 64; `alarm.json` names another pid → exit 0 `superseded`; the token differs from the
one last read → the alarm was re-armed: keep the new token, `rearms += 1`, and go back to 4 (no
write, no clock read); else exit 30 `alarm`, `result {ensure: 'registered', nonce, k, previous,
armed, superseded, rearms}`. So the
alarm fires only after a whole period in which no endturn ran, and nobody ever kills it (the
model's busy loop came from killing the alarm at each endturn, whose exit then woke the
coordinator). 6 **The exit marker (FX-W1 step 2).** Every exit after the registration of step 3 (30, 0
`superseded`, 64, and an error exit: 67 or 70 in the sleep loop, or the registration hold failing
after the slot was written, its lock lost at the release included) first creates `run/arm/exited-<pt>.json` {ce, exit, at} by
`lib.createExclusive` (not strict: `run/arm/` is made when absent; `<pt>` = `lib.markerKey(pid,
start_time)` of this process; `at` from the edge facts, so `--now` fixes it). The create takes no lock; a failure writes one stderr line and leaves
the exit code as it was (readers then judge this alarm by the process list alone). An exit before
registration (64 at step 1, 75 for a busy lock, `nonce-reused`, `present`, `abandoned`) writes none;
a hard kill writes none.

## Intake steps
`checkCe` → 64. Run each as a child process (`process.execPath`, `cwd: root`, `shell: false`,
`windowsHide: true`) awaited in order, `--root R --ce N` added: per row at started|bound of its
current epoch `harvest.mjs --task --epoch`, `commit.mjs intake --task --epoch`; then `snap.mjs
--new` (only if `f5_given`), `witness.mjs`, `promote.mjs --from witness`, `tms.mjs`, `status.mjs`.
A step's exit: 0, 1, 6 or 10 → no incident (a definite outcome; the step's own ledger lines carry
it, and tms's reopen is a `check` reason, g); 2 or 70 → one `incident` line {class: not-run, detail:
{script, exit}}, intake continues; 64 or 3 ends intake with that code (a 3 has already written its
tamper incident). Each step runs with a `spawnSync` timeout of threshold `intake_step_timeout_ms`
(missing from thresholds.json → 1800000, i.e. 30 min; review U1-F6): a step that does not exit by
then is ended (only that child) and counts as exit 70 with `timeout: true` in its step entry and in
its `incident` detail {script, exit: 70, timeout: true}; intake continues. Result `{steps: [{script,
args, exit, timeout?}]}`; exit 0.

## Exit codes
0 (`--once` quiet, alarm superseded, the ensure `nonce-reused`, `present` or `abandoned`, intake
done), 10-17, 20-27, 30, 3 (`run-from-attempt`, tamper
in intake), 64, 66, 67, 70, 75.

## Raised again while the condition holds (FX-W5, round 3, branch R1)
FIX-wake.md FX-W5; `build/branches.md` row 6. Fills the skeleton's `ownerOrNone` and `reraiseStuck`.
- Step 1: `rowAct` raises nothing for a planned act `owner` or `none` (`ownerOrNone`), so such a row is
  never raised again nor `stuck`. The act is `planAct`'s once FX-PLAN fills `rowActPlanned`, whose
  facts bring zombie-over (FIX-JOIN point 11); until then `planned` is undefined and today's filters decide.
- Classes raised again: every act-due (17) but `run-terminal` (its condition never clears), and stall,
  hang and loop (20-22), the set the model checked R1 with (ABLATION-wake.md:234-235). Others are
  raised once per onset as before.
- Step 2, in evaluate after the present set is keyed by ident and before the active keys are renewed:
  a present ident of those classes whose key's `event` line is acknowledged (seq ≤ `acked_seq`) and
  whose last raise (the key's tick) is at least `min(15 × 2^b, 60)` ticks old, b = min(n, 2) after n
  raises, is raised again: its key leaves `active`, so step 5 gives it a new key `<ident>|<tick>` and
  one new `event` line with `detail.reraise` = n + 1, which exits like any new key (17 after
  coalescing, 20-22 at once). An unacknowledged key is due anyway and is not raised again. 15 and 60
  are marked guesses in the code (slice 1 writes no thresholds.json key).
- Step 3: `stuck_count` = the raises made once b was at its cap, n − 3 (the raises at 15, 30 and 60
  ticks reach it). At `stuck_raises` (thresholds.json, 3; missing or not a positive integer: 3) the
  ident is in `stuck`: 15 + 30 + 60, then 3 × 60 = 285 ticks after the onset (about 4.75 h at Δ 60 s,
  FIX-wake.md:54). FX-W4's dead-man reads it.
- `watcher.json` gains `reraise: {<ident>: n ≥ 1}` and `stuck: [<ident>]` (sorted), rebuilt from the
  present idents at each evaluation: an ident leaving the active set leaves both.
- Tests: **W5 re-raise** (a planned row's `replace-fence`, acknowledged: quiet one tick short of each
  interval, raised at 15, 30, 60 and 60 ticks with a new key and `detail.reraise`; `stuck_raises` 1 puts
  it in `stuck` at the 4th raise, not the 3rd; left unacknowledged it exits 17 and is not raised again);
  **W5 stuck** (an acknowledged hang raised again and exiting 21 at once, six times; in `stuck` only at
  the 6th, 285 ticks after the onset; a new call clears the hang and empties `stuck` and `reraise`);
  **W5 stuck stays** (once stuck at the 4th raise, the acknowledged act-due stays in `stuck` at quiet
  ticks 1 and 59 ticks later, where FX-W4 reads it at its own times; nothing is raised there).

## Rules implemented
R1, R4 (reads, decides, exits; watcher.lock; ce first and inside the lock; intake spawned, not
awaited; no deadline exit), R5 (V, stall by calls, hang by ticks, loop, READY voids suspicion),
R6 (alarm), R8 (W_cc in ticks, halt), R10 (memory), R11 (soft/hard, overflow via cut), R12/R50
(drain at W*_coord), R40, R58; decisions 2, 3, 5, 15, 40. Model findings F2, F3, F4, A4-A6; second
model check M1 (alarm re-armed by token, never killed), M3 (act-due), M5 (pause discount).

## Behaviours (tests)
All with `--once` or `--interval-ms 50` and `--no-intake` unless stated; fake transcripts.
- T1 `--once` on a quiet root → exit 0, `watcher.json` `ticks_total` 1, ce, pid; watcher.lock gone.
- T2 stall: stall_calls 3; transcript gains 3 calls, V unchanged → exit 20, one `event` line
  `{class:"stall", urgent:true}`; with V falling during those calls → no stall.
- T3 hang: hang_ticks 2; two `--once` ticks without a new call → second exits 21; a call in between
  resets the count. The start evaluation of a default-mode watcher does not count a hang tick.
- T4 counters continue: tick 1 (watcher A, `--once`), tick 2 (watcher B) reach the threshold together.
- T5 loop: three equal tool-use signatures at the end → exit 22, `loop.run` 3.
- T6 READY of the current epoch with a stall present → exit 11 not 20 (coalesce_ticks 0); with
  coalesce_ticks 2 → exit 0 at its first tick, `pending` holds it, exit 11 two ticks later.
- T7 READY in `wt/<task>-e1` while the row is at epoch 2 → one `zombie-write` line `{epoch_seen:1}`
  and no class 11; a second tick adds no second line.
- T8 soft (13) and hard (23) at ⌊0.8·e⌋ and ⌊0.9·e⌋; hard wins by precedence.
- T9 `--free-mb` below reserve → exit 24.
- T10 two non-host fails 5 ticks apart, W_cc_ticks 30 → exit 26 and one `halt` line; 40 ticks apart
  → nothing; a host fail is not counted; fails at ticks 10 and 15 with ticks_total 100 → nothing
  (the window is measured against ticks_total); after a halt and an owner resume the same fails
  write no second halt line, a new fail in the window does.
- T11 coordinator window above W_star_coord (coord.session's fake transcript) → exit 16, one `drain`
  line for this ce; a second watcher of the same ce writes no second line.
- T12 an edited middle ledger line → exit 27; an `incident {class: refusal, detail: {tamper:
  true}}` line above acked_seq → exit 27; the same line at or below acked_seq → no exit. A `check`
  line of check `tms` with a `reopened` reason above acked_seq → class 10.
- T13 precedence: memory and stall together → 24; ready and soft limit → 11.
- T14 onset keys: a condition acknowledged (`acked.json` acked_seq ≥ its line's seq) and still
  present → no new line and no exit; the condition absent for one tick and then present again → a
  new key (new onset_tick), one new `event` line carrying it, and an exit.
- T15 coord ce raised before the tick → exit 64, no ledger line, no `watcher.json` change. A
  default-mode watcher (`--interval-ms 50 --no-intake`, the test's own child, killed by the test if
  it does not end) whose coord ce is raised after its first tick → exit 64, `watcher.lock` released,
  at most one `watcher.json` write after the raise (review U1-F3).
- T16 a second watcher while the first holds `watcher.lock` → 75; a lock whose holder is dead is
  broken and the watcher runs.
- T17 `watcher.json` unparseable → quarantined, exit 0 from fresh counters (FX-W7); `tasks.json` unparseable → 67.
- T18 intake spawn (without `--no-intake`; test reads `watcher.json.intake.pid`, waits for that
  process to end and asserts it was a `--intake` run): spawned once; a second tick while it is alive
  spawns none.
- T19 `--intake` on a root whose step scripts are stubs in the test's own `tcb/` that exit
  0, 2, 0 → exit 0, one `incident` line naming the exit-2 step; stubs exiting 1, 6 and 10 → no
  incident; a stub exiting 70 → one incident; a stub exiting 64 ends it with 64; a stub that does
  not exit within `intake_step_timeout_ms` (1500 in the test) → ended, step exit 70 `timeout: true`,
  one incident, the later steps run.
- T20 `--alarm --ensure --nonce X --sleep-ms 100` → `alarm.json` written, `slot-1.json` {ce: 1, pid,
  start_time, nonce: X} and `X.json` {state: 'registered', k: 1, pid}, exit 30; a coord ce raised
  during the sleep → 64; a second ensure while the first sleeps (slot 1 live) → exit 0 `present`,
  `result.slots` [{k: 1, state: 'alive'}], its nonce file `present`, slot 1 and `alarm.json`
  unchanged; with slot 1 removed a third ensure registers: the first is not signalled, exits 0
  `superseded` when it wakes, and `alarm.json` names the third.
- FX-W2 usage: `--alarm` alone, without `--ensure` or `--nonce`, with an upper-case, short or
  path-like nonce, and `--ensure`/`--nonce` without `--alarm` → 66 each; no `run/arm/`, no
  `alarm.json`, no ledger.
- FX-W2 reused nonce (FIX-wake FX-W2, schedule 2): X registers and fires (exit 30, its marker); X
  again → exit 0 `nonce-reused` and no file changes or appears; `status --reconcile --arm-nonces X`
  → exit 1 `arm-unconfirmed` (slot 1 `exited`), `X.json` still `registered`; a new Y (sleeping)
  registers in the freed slot; reconcile Y → exit 0, `arm` confirmed, turn.json {turn_seq 2,
  confirmed, unarmed_turns 0}, X's marker pruned.
- FX-W2 confirm deadline: the shipped `arm_confirm_ms` ≥ `ensure_query_ms` + `lock_retries` × 100 +
  5000 and `alarm_slots` 1; `lib.realProc({timeoutMs: 1}).list()` throws `proc-unavailable` with
  why `ETIMEDOUT`; a dead slot of this ce without a marker: with `ensure_query_ms` 1 the ensure is
  `present` (verdict unknown), with 10000 it registers (exit 30); reconcile given a nonce no ensure
  ran waits `arm_confirm_ms` (1500) and writes it `abandoned` (exit 1), and a late ensure of it is
  `nonce-reused`; an ensure held off hold 1 by a live `run.lock` holder while its nonce file is set
  `abandoned`, with slot 1 live, exits 0 `abandoned` (why `turn`) once `turn.json`'s `turn_seq`
  grows, slot 1 untaken, no marker.
- FX-W1 alarm exit marker: exit 30 (`--sleep-ms 50`) leaves `run/arm/exited-<pt>.json` {ce: 1, exit:
  30, at: the `--now`}; with `--sleep-ms 1500` there is no marker while the alarm sleeps, and then
  `alarm.json` naming another pid → exit 0 and marker {exit: 0}; coord ce 2 → 64 and {exit: 64}; a torn
  `coord.json` → 67 and {exit: 67}; `lib.exitMarkers` then holds exactly that alarm's key.
- T21 every exit prints one §1.3 line; every ledger written verifies.
- T22 incremental parse: a 50 MB fake transcript parsed at tick 1; tick 2 after 3 calls are appended
  reads only the new bytes (`files[path].end_byte` advances; a spy on the read count or the elapsed
  time under the tick budget) and counts 3 new calls; a call split across the boundary (`lastCall`)
  is counted once; the file truncated → re-parsed from 0.

- M1 alarm re-armed by the token: an alarm (`--sleep-ms 1500`) is running; `status --endturn`
  rewrites `acked.json` during its sleep → the alarm does not exit after the first period; it exits
  30 after the next quiet period with `result.rearms` 1, `alarm.json` still naming it, and endturn
  having killed and started nothing. Without the token it exits 30 after one period, `rearms` 0.
- M3 act due: a row at planned/none with N_max 2 and no slot used → exit 17 at the tick that
  passes coalesce, one `event` line {class `act-due`, detail.act `replace-fence`}; once
  acknowledged (acked_seq ≥ its seq) it stays quiet while present; with the slots full (two
  admitted rows) the planned row raises nothing. A fenced row → `stop-request`. A row at
  stop-requested whose sample is younger than `stop_verify_deltas` ticks → no 17; old enough →
  `stop-verify@<tick>`. An admitted row → `start-session`; its folder gaining a transcript → a new
  key `bind` and a new exit. A `drain` line of this ce and no slot used → `handover`. An `event`
  line above acked_seq whose condition has cleared → `events`. A row at `failed` or `limit` → none.
- W6a per-kind deadline: a pending Bash tool use with timeout 120000 (Δ 60 s, tool_slack_ticks 1) →
  deadline 3, hang_ticks 0 after the first tick; no 21 at 2 ticks (model_ticks 2); 21 `{kind: tool,
  deadline: 3}` at 3; its tool result restarts the count, kind `model`. In process: `parseTranscript`
  kinds `model` (a prompt; a call with stop_reason null), `tool`, `bg-wait` (a background launch, then
  end_turn; system and api-request records change nothing), `idle` after its task notification, after
  a TaskStop of a Monitor task, after an interrupt; an incremental parse with the carried `tail` equals
  the whole parse.
- W6b idle child: end_turn, idle_ticks 2, model_ticks 1 → no 21; act-due `idle-child` at 2 ticks; a
  user message (the answer) → kind `model`, hang_ticks 0, the key gone.
- W6c age cap: attempt_max_ticks 2 → act-due `age-cap` at age 2 (tick 3), no 21; acknowledged → age_base
  stays 0 and the key stays active, quiet inside FX-W5's interval; raised again at tick 18 (15 ticks
  after the onset) with `detail.reraise` 1 and a second event line.
- W6d age cap stuck: a coordinator that only acknowledges → the cap is raised again 15, 30, 60, 60, 60
  and 60 ticks apart; the 6th raise (285 ticks after the onset, stuck_raises 3) puts `17|<task>:age-cap|1`
  in watcher.json.stuck, and it stays there at an acknowledged quiet tick after; age_base stays 0.
- M5 pause discount (after the epoch's first tick): model_ticks 2; tick 1 at T, tick 2 at T + 10 min (Δ 60 s) → no exit 21,
  hang_ticks still 1, `result.paused` true; tick 3 at T + 11 min → exit 21. Without the discount
  tick 2 exits 21.

## Cannot be tested without the app
A background command's exit reaching the coordinator's turn, also during sleep or after a ce
change (§7 item 5); Node timers and the PC across suspend (item 6: one sleep of Δ = one tick);
real transcripts matching the parser (item 7); a real session's window in its transcript.

## Round-3 skeleton (S0.5)
- `rowAct`: 1 `rowActPlanned(root, tr, row, facts)` (FX-PLAN; undefined); 2 `ownerOrNone(planned)` gives
  null (FX-W5 step 1; false); then today's filters and act (FIX-JOIN point 11).
- `evaluate`: `actDueIdleAgeCap(env, state, conds, {rows, tick})` after the row acts (FX-W6);
  `reraiseStuck(env, state, present, tick)` before the active keys are renewed (FX-W5); `adoptState(env,
  state)` after watcher.json is written (FX-W7).
- FX-W7 (built). `evaluateCopy(env, flags, counted)` evaluates `structuredClone(env.state)` (`ticks_total
  += 1` when counted); `holdTick` takes the run lock with about `watcher_lock_try_ms` of retries (100 ms
  apart) and runs, in that one hold, `assertHeld` of watcher.lock, the appends, the due and pending
  steps, the `watcher.json` write and `adoptState` (`env.state` = the copy; a non-zero busy count
  written back to 0). A busy run lock: the copy is dropped except its `intake` record, `assertHeld`
  outside the hold, `run/watcher-busy.json` `{ce, busy_ticks}` + 1; the loop sleeps Δ and evaluates
  again (a dropped start evaluation stays uncounted), `--once` exits 75 `lock-busy`. Step 3: an
  unparseable `watcher.json` is renamed to `watcher.json.<pid>.<nonce8>.corrupt` (`result.quarantined`)
  and the counters start fresh; T17's first half now expects that. Test W7b: two busy `--once` ticks
  with class 24 present → 75, busy 1 then 2, no `watcher.json`, no event; a default-mode watcher stays
  up through busy ticks; after the release it exits 24 with one event line, `ticks_total` 0, busy 0;
  a following `--once` → 24, no second line, `ticks_total` 1. Reads also `watcher_lock_try_ms`.
- The alarm: in the registration hold, before alarm.json, `alarmSlotTurnSeq(reg)` (FX-W3), then
  `alarmRegisterSlot(reg)` (FX-W2). Every exit after registration passes `alarmExit(reg, out or exit
  code)`: `alarmUnarmedRecord` (FX-W3, exit 30 only), then `alarmExitMarker` (FX-W1); an error is rethrown.
  FX-W3 built: `alarmSlotTurnSeq` adds `turn_seq_at_reg` to the slot record (turn.json's turn_seq as
  `ensureHold1` read it in the same hold; 0 when turn.json is absent or unreadable). `alarmUnarmedRecord`, on
  exit 30, before the marker and without a lock: when turn.json's turn_seq still equals the slot record's
  `turn_seq_at_reg` (no reconcile in a whole alarm period), strict-create `run/arm/unarmed-<pt>.json`
  {ce, turn_seq}; a failure is one stderr line and leaves the exit. Tested in `tcb/test/watch.test.mjs`
  (FX-W3 unarmed record; T20 alarm).
  FX-W1 built: `alarmExitMarker` (alarm step 6). FX-W2 built: the ensure (alarm steps 1a, 1b, 3, 3a:
  `ensureStarted`, `ensureSlots`, `ensureHold1`, `ensureAbandoned`) and `alarmRegisterSlot`;
  `reg.registered` is set at the slot write (FX-W1 set it after the `alarm.json` write), so a
  registration hold that throws after the slot names this alarm (the `alarm.json` write, or a 75 at
  the release) also passes `alarmExit`.

## FX-PLAN (round 3): the planner
`next` (status) and the row act (watch) are `lib.planAct` over `lib.planFacts` (CONTRACT, "FX-PLAN (round 3)"):
the transcript-visible branch is gone (the claim decides); acts with arguments are strings
(`replace-fence --reason <r>`, `replace-fence --reason crash --if-unclaimed`, `close-session <sid>`). The watcher
keeps its filters: the first fence and `replace-start` wait for a free slot and neither halted nor draining;
`audit`/`commit` are class 11's; `stop-verify` waits for its sample's age; `owner`/`none` raise nothing. Its
facts: its tick, wall time, an empty process list, the step-7 sessions of its own slotCount, and the rows of class
25 as zombie-over. Tests: status T3; watch "FX-PLAN act due", "FX-PLAN: a zombie-over row"; lib FX-PLAN T1-T3.
