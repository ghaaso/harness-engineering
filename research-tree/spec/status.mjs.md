# status.mjs (unit U1b)

## Purpose
Builds `run/status.json`, the coordinator's only state (R6, R12, R20), as a pure function of files.
`--reconcile` records starts the coordinator made but did not bind (R3). `--endturn` writes the
acknowledged ledger seq and checks that the two wake sources run (R6). `intent`, `owner` and `meter`
put the owner's word, intents and meter readings into the ledger (§8 decision 25).

## Command line
```
node tcb/status.mjs --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/status.mjs --reconcile [--arm-nonces X] --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/status.mjs --endturn --acked-seq K --root R --ce N [--now ISO] [--dry-run]
node tcb/status.mjs intent open --key KEY --subject S [--text-file P] --root R --ce N
node tcb/status.mjs intent done --key KEY --root R --ce N
node tcb/status.mjs owner --act approve|accept|resume|drop|ruling --subject S --quote-file P --root R --ce N
node tcb/status.mjs owner --act closed --subject SID --quote-file P --root R --ce N   (FX-CGATE: SID the CLI
  session id, a lowercase UUID, else 66; in the hold the owner line, then run/close/done/<SID>.json {kind:
  'close-done', session, outcome: 'owner', by: null} by an exclusive create, a record already there kept)
node tcb/status.mjs meter --pct P --root R --ce N
node tcb/status.mjs --deadman --root R [--now ISO] [--boot B] [--dry-run]   (FX-W4: the scheduled task's
  form is `--deadman --root R` only; no ce, the ce is coord.json's)
```
Modes `intent` (sub-mode `open|done`), `owner`, `meter`; the default and the two flags otherwise.
`--reconcile` and `--endturn` together → 66. `--arm-nonces X[,X2]` (FX-W2) only with `--reconcile`
(else 66): the nonces of this turn's ensures (branch S1: one), each 32 lowercase hex, comma-separated,
else 66 before any write; a later reconcile of the same turn passes none. `--deadman` (FX-W4) with `--ce`,
`--reconcile`, `--endturn`, `--acked-seq` or `--arm-nonces` → 66; its root must be absolute (else 66). `--pct` an integer 0..100; `--key` the intent-key
pattern (CONTRACT §1.5); `--quote-file`/`--text-file` must resolve under `<root>/plan/notes/`
(`isUnder`; the coordinator's only writable place for them) → else 66 `path-outside-root`.

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `run/acked.json`, `run/watcher.json`,
`run/watcher.lock`, `run/alarm.json`, `run/arm/` (the exit markers and slot files, FX-W1; the nonce
files, FX-W2), `run/turn.json` (FX-W2), `run/intents/`, `tcb/thresholds.json` (FX-W2 also `alarm_slots`,
`release_ms`, `arm_confirm_ms`), `store/commits/`,
`store/status/card_status.jsonl`, `wt/*/outcome/` (the READY of an epoch, FX-OUT; a bad log is anomaly
`outcome-tamper`), `wt/*/staging/READY.json` (zombie-write telemetry only), transcripts (spend, windows,
reconcile), the process list (slots, wake sources). The build also reads `run/deadman.json` (FX-W4, the
anomaly `deadman-nowake`); `--deadman` reads only what the FX-W4 section names.

## Writes
`run/status.json` (writeAtomic under the run lock), `run/acked.json` (endturn), `run/tasks.json`
(reconcile: `step` started, `attempts[].session`), `run/intents/<key>.json` and `.done` (exclusive
create), ledger lines `started` {session}, `owner` {act, subject, quote}, `intent-open` {key},
`intent-done` {key}, `meter` {pct, self_reported: true}. Reconcile removes `run/arm/exited-*.json`
markers that nothing names (hold 2, FX-W1). Reconcile writes `run/turn.json` (FX-W2: in the main hold
after `status.json`, and again in hold 2; CONTRACT §3.9 [turn]) and `run/arm/<nonce>.json` {state:
'abandoned'} for a given nonce still absent or `started` (hold 2; [arm-nonce]). `--deadman` writes only
`run/deadman.json` (FX-W4: writeAtomic, its one writer, no lock; a dry run writes nothing).

## Steps
**Build (default; also the last step of `--reconcile`).** 1 Facts outside the lock: `proc.list()`
(failure → every not-confirmed attempt counted `unknown`, anomaly `proc-unavailable`), spend per
attempt, windows. 2 Under `withRunLock(ce)`: read every file, compute [status] §3.8:
- `ce`, `tcb_commit` from coord; `rev`; `ledger {seq, head}`; `acked_seq` (0 when no acked.json);
  `events_pending` = seqs of `event` lines with seq > acked_seq.
- `slots` = `slotCount` + `max` N_max; `memory` {free_mb, reserve_mb, peak_mb}; `budget` {B,
  reservation, r, spent_total} from lib `reservation`.
- `halted`, `draining` = `lib.runFlags(lines, ce)` (the one definition admit and handover use).
- per row {task, state, step, epoch, V (`lib.variant`), spent, e_task, soft ⌊soft_frac·e⌋, hard
  ⌊hard_frac·e⌋, window, next}. `next` (first match): failed, `limit` true, or an attempt with
  zombie spend over Z → `owner`; planned/none → `replace-fence`; active|parked/stopped →
  `replace-start` (both `none` while halted or draining); fenced, or committed at bound →
  `stop-request`; stop-requested with the target's `stop` none|requested → `stop-session`;
  stop-requested with `stop` unconfirmed, or a stop sample present (`run/stop-sample/<task>-e<k>
  .json`, k the target attempt: e − 1, or e for a committed row, as stop.mjs names it) →
  `stop-verify`; admitted →
  `start-session`; started → `bind`; bound with a READY of this epoch for a step without a commit
  record → `audit` when no `audit` line of this task+epoch is newer than its last `intake` line,
  else `commit`; else `none`.
- `watcher` {alive, ce, last_tick_at, ticks_total}; `alarm` {alive, ce}. **alive is tri-state (FX-W1
  step 1):** true, false or null (unknown) from `lib.liveness` with the exit markers. The two records
  are read before the process list is taken (`readWake`, outside every lock) and judged after it
  (`judgeWake`), so a record names a process the list shows if it lives; inside the hold each is read
  again (`sourceNow`): an exit marker, an absent or a corrupt record → false; bytes unchanged → the
  verdict; bytes changed → null (that record was in no list). A corrupt `watcher.json` or `alarm.json`
  (unparseable, UTF-16, not an object) is the anomaly `state-corrupt` {file}, never 67 (FX-W1 step 4);
  `watcher-dead` / `alarm-dead` only when false, never when null; `open_intents` (`.json` without `.done`); `not_run` = (check, subject)
  whose last `check` line has result not_run, plus (`fsck`, `store`) when the last `fsck` line is
  not_run; `anomalies`: `proc-unavailable`, `ledger-torn`,
  `watcher-dead`, `alarm-dead`, `state-corrupt`, `watcher-stale-ce`, `lock-orphan` (`*.orphan` files),
  `several-sessions`, `zombie-write`, `outcome-tamper`.
3 Validate against [status] and write. Same inputs → same file except `generated_at`.

**--reconcile.** For each row active at step `admitted` (epoch e): `transcriptsForFolder(folder)`;
exactly one session → `updateRow(steps ['admitted'], epoch e)`: step `started`,
`attemptOf(row, e).session`; append `started` {session}. Two or more sessions → no change, anomaly
`several-sessions`. For every attempt not current with `session` null and folder transcripts: set
that attempt's `session` (no step change, no line). Then build. **Then the arm (FX-W2, FIX-wake FX-W2
steps 5-7, branch S1; it replaces M2's `alarm-missing` check, CONTRACT decision 40):** call 1 of each
turn runs the ensure `watch.mjs --alarm --ensure --nonce X` as a background command and this reconcile
with `--arm-nonces X`. r1, before the process list: the bytes of `slot-1` .. `slot-<alarm_slots>`,
judged after the list with the exit markers (`lib.liveness`; unknown when the list is unavailable,
FX-W1 D1). The main hold, after `status.json`: `turn.json` {ce, turn_seq: the previous + 1 (never
reset), read_seq: the ledger head `status.json` reflects, arm, slots, unarmed_turns: the previous},
arm `unconfirmed` with slots [] unless no nonce is given and the previous record is of this ce and
`confirmed` (a second reconcile of the turn keeps it, B1.4); an absent or corrupt `turn.json` counts as
absent and is rewritten. Then, outside every lock and only with nonces, the wait (step 6): read the
nonce files every 200 ms until none is absent or `started` and `release_ms` has passed, or until
`arm_confirm_ms`. Hold 2, one hold of the run lock with the ce re-checked, files only (step 7): each
given nonce still absent, corrupt or `started` is written `abandoned` (under the lock the ensure's
hold 1 also takes, so a `registered` is never overwritten); when `turn.json` is no longer the record
the main hold wrote, nothing is written and the exit is 1 `arm-unconfirmed` {why: `turn-moved`}.
Otherwise slot k is live when its record is of this ce, has no exit marker now, was not judged dead
in r1 with its bytes unchanged, and either was registered by a given nonce (its record carries the
nonce and the nonce file says `registered` with its k and pid) or was judged alive or unknown in r1
with its bytes unchanged. Live slots ≥ `alarm_slots`: arm `confirmed`, slots the live ones,
unarmed_turns 0, exit 0; otherwise arm `unconfirmed`, unarmed_turns + 1, exit 1 `arm-unconfirmed`
{ce, live, need, slots: [{k, state, pid}]} (state absent, corrupt, other-ce, exited, dead,
registered, alive, unknown or unjudged). Nonces carry no weight of their own: a reused nonce whose
alarm has exited confirms nothing. The status is still built and written and the rows reconciled;
`result` adds `arm`, `turn_seq`, `slots`. A dry run computes the same and writes none of it.
Reconcile starts and kills nothing; endturn's `acked.json` write re-arms a live alarm (M1).

**--endturn.** 1 Under `withRunLock(ce)` (FX-W3 A3, built; FIX-JOIN 2b row 9): `run/turn.json` absent,
unreadable or of another ce → exit 1 `turn-stale` {ce, turn_ce}, nothing written; K > ledger head seq → exit
1 `acked-ahead`; K > turn.json's `read_seq` (or no integer read_seq) → exit 1 `acked-ahead` {acked_seq,
read_seq}; turn.json of this ce is rewritten `arm: 'spent'` in every case, a refused K included; step 2's
report follows a refusal too (N2: reasons the refusal first, then the sources'; exit 1; result `acked_seq`
null, `written` false); K < the
stored acked_seq → exit 1 `acked-backwards`; write `acked.json` {ce, acked_seq: K, at: now}.
2 Wake sources (FX-W1 step 3; R6-b), outside every lock: the records are read first (loosely: a
corrupt one counts as absent, not 67), then the process list is taken. watcher = `watcher.json` of
this ce whose pid and start_time `watcher.lock` holds; alarm = `alarm.json` of this ce; each judged
by `lib.liveness` with the exit markers, and a record that fails those file checks is `dead`.
`result.sources` = {watcher, alarm}, each `alive`, `dead` or `unknown`; `result.watcher` and
`result.alarm` are true only for `alive`. 3 Exit 1 when any source is dead, with `watcher-missing`
and/or `alarm-missing` {ce, pid, state: `dead`} (and `proc-unavailable` {unknown: [names]} when the
other is unknown); exit 2 `proc-unavailable` {unknown: [names]} only when none is dead and some is
unknown; else exit 0. The `acked.json` of step 1 stands in every case. On a dead watcher the coordinator
starts `watch.mjs` (and on a dead alarm `watch.mjs --alarm`) as a background command; on unknown it
starts nothing. Endturn starts and kills
nothing (decision 5). The `acked.json` write of step 1 is also the alarm's arm token (M1, CONTRACT
§3.9): a live alarm reads it and sleeps another period, so endturn never replaces a live alarm.

**intent open.** Under the lock: create `run/intents/<key>.json` {key, ce, subject, text_sha (sha256
of the text file, or of the empty string), created_at}. Existing with equal key, subject and
text_sha → exit 0, no line; different → exit 1 `intent-differs`. Append `intent-open` {key}.
**intent done.** No `.json` → exit 2 `missing`; create `.done` {key, done_at}; existing → exit 0;
append `intent-done` {key} once.
**owner.** Quote = the file's text, 1..500 characters (else 66 `quote-length`); `drop` needs a
subject that is a task in the table (else 1 `no-task`); append `owner` {act, subject, quote}.
**meter.** Append `meter` {pct, self_reported: true}.

## Exit codes
0; 1 `turn-stale`, `acked-ahead`, `acked-backwards`, `watcher-missing`, `alarm-missing` (endturn),
`arm-unconfirmed` (reconcile, FX-W2), `intent-differs`, `no-task`, `deadman-alert` (FX-W4); 2 `proc-unavailable` (endturn: none dead, some unknown), `missing`, `schema-version`, `no-coordinator` (also `--deadman`); 3 `run-from-attempt`; 64;
65 (reconcile CAS); 66; 67 (tasks, coord, acked or an intent file corrupt; a corrupt watcher or alarm
record is the anomaly `state-corrupt`, FX-W1); 70; 75.

## Rules implemented
Process list and transcript parses happen before the lock (CONTRACT §2.1).
R1 (status.json under the lock), R3 (reconcile: a transcript means the start happened), R6 (status
first; acked seq; two wake sources), R10 (slots, reservation never stored), R12 (status is the only
state), R20 (a view, rebuilt), R40 (`not_run`), R58; decisions 3, 4, 5, 17, 25, 40. Model findings F4
(endturn never starts a second watcher), A8 and "acked seq not persisted"; second model check M1
(endturn's acked.json is the arm token; nothing killed) and M2 (alarm armed at turn start; since
FX-W2 the ensure and reconcile's two arm holds).

## Behaviours (tests)
- T1 build on a root with two rows (one planned, one bound with a fake transcript of 3 calls, 1200
  tokens) → `status.json` validates against [status]; `tasks[1].spent` 1200; `next` `replace-fence`
  and `none`; exit 0; built twice with the same `--now` → byte-identical.
- T2 `events_pending` lists exactly the `event` seqs above `acked.json`'s acked_seq.
- T3 `next` for each step: planned/none → replace-fence, active/stopped → replace-start, fenced →
  stop-request, stop-requested (stop requested) → stop-session, stop-requested (stop unconfirmed) →
  stop-verify, admitted → start-session, started → bind, bound + READY of the epoch and no audit line
  → audit, the same with a newer audit line → commit, committed at bound → stop-request,
  `limit:true` → owner; a `halt` line → planned rows show `none` and `halted:true`; after
  `owner {act:resume}` → `halted:false`.
- T4 `watcher.alive` false for a `watcher.json` whose pid is a finished child, anomaly
  `watcher-dead`; true for the test's own `spawnSleeper` record.
- T5 `not_run` lists a (check, subject) whose last `check` line is not_run, not one later passed.
- T6 `tasks.json` corrupt → exit 67, `status.json` unchanged; `coord.json` absent → exit 2
  `no-coordinator`; stale `--ce` → 64, nothing written.
- T7 reconcile: admitted row whose folder has one fake transcript (cwd = folder) → step `started`,
  `attemptOf(row, e).session` set, one `started` line; a repeat → no line (exit 1 `arm-unconfirmed`
  in T7-T9 and T16, whose roots have no alarm slot; FX-W2).
- FX-W2 reconcile and the arm: no slot → exit 1 `arm-unconfirmed` {ce: 1, live: 0, need: 1, slots:
  [{k: 1, state: absent, pid: null}]}, `result.arm` "unconfirmed", status.json still written,
  turn.json {turn_seq 1, unconfirmed, slots [], unarmed_turns 1}; slot 1 naming a finished child →
  state `dead`; naming a live sleeper of another ce → `other-ce`, unarmed_turns 3; naming a live
  sleeper of this ce → exit 0, `arm` confirmed, `slots` [{k, pid, start_time}], turn.json {turn_seq 4,
  confirmed, unarmed_turns 0}; the sleeper is alive afterwards.
- FX-W2 B1.4: through an fs seam that fails hold 2's `turn.json` write (exit 70), the file shows the
  main hold's record: a second reconcile without nonces after a confirmed turn keeps `confirmed` and
  its slots (turn_seq 2); one given a nonce (its file `present`, kept) writes `unconfirmed`, slots [];
  without the seam hold 2 confirms by the live slot; after that alarm's exit marker hold 1 keeps
  confirmed and hold 2 writes `unconfirmed`, unarmed_turns 1 (exit 1, slot 1 `exited`).
- M1 endturn re-arms by writing: with a live alarm sleeper, endturn changes the sha256 of
  `acked.json` (the arm token), leaves `alarm.json` byte-identical and the sleeper alive.
- T8 reconcile with transcripts of two sessions for one folder → row unchanged, anomaly
  `several-sessions`; a transcript whose `cwd` is another folder is ignored.
- T9 reconcile on a row the coordinator fenced meanwhile (epoch moved) → that row skipped (65 from
  updateRow is caught per row), others reconciled, exit 0.
- T10 endturn K = head with a live watcher (sleeper record in `watcher.json` and `watcher.lock`, ce
  equal) and a live alarm → `acked.json` {acked_seq: K}, exit 0.
- T11 endturn with no alarm → exit 1 `alarm-missing`, `acked.json` still written; with a watcher
  record of an older ce → `watcher-missing`; with a live `watcher.json` of this ce but
  `watcher.lock` absent, or holding another live process → `watcher-missing` (review U1-F9).
- T12 endturn K above head → exit 1 `acked-ahead`; K below stored → `acked-backwards`; file unchanged.
- T13 intent open twice with the same subject → exit 0 once each, one `intent-open` line; with
  another subject → exit 1 `intent-differs`; done before open → exit 2; open then done → `.done`.
- T14 owner `--act drop --subject f1-research` with a quote file under `plan/notes/` → `owner` line
  with the quote; a quote of 501 characters → 66; a quote file outside `plan/notes/` → 66
  `path-outside-root`; drop of an unknown task → 1 `no-task`; a quote file with a UTF-8 BOM → the
  BOM is not part of the quote.
- T15 meter `--pct 42` → `meter` line `{pct:42, self_reported:true}`; `--pct 101` → 66.
- T16 `--dry-run` of build, reconcile and endturn → result as the real run, no file changed.
- T17 `run.lock` busy → 75; every stdout one §1.3 line; every ledger written verifies.
- FX-W1 endturn, list unavailable: live-looking records of this ce → exit 2, `sources` both
  `unknown`, reason `proc-unavailable` {unknown: [watcher, alarm]}, `acked.json` written; with the
  alarm's exit marker → exit 1, `sources.alarm` `dead`, reasons `alarm-missing` {ce, pid, state: dead}
  then `proc-unavailable` {unknown: [watcher]}.
- FX-W1 corrupt records: a torn `watcher.json` and a non-JSON `alarm.json` → build exit 0 with two
  `state-corrupt` anomalies {file} and both alive false; endturn exit 1 with both sources dead;
  reconcile exit 1 `arm-unconfirmed`. Never 67.
- FX-W1 reconcile, list unavailable: an unmarked alarm of this ce, also in slot 1 → exit 0 (`arm`
  confirmed: the slot unknown counts), status alive null for both, no `*-dead` anomaly,
  `proc-unavailable` present; with its exit marker → exit 1 `arm-unconfirmed` (slot 1 `exited`),
  `alarm.alive` false, anomaly `alarm-dead`, and the marker (named by `alarm.json`) is kept.
- FX-W1 prune: markers of `alarm.json`'s alarm, of a slot file's alarm and of an alarm nothing names,
  plus an `unarmed-*` record → `--dry-run` removes nothing; reconcile removes only the unnamed marker.

## Cannot be tested without the app
That a real session's transcript appears in `projectDirName(folder)` with that `cwd` soon after
start (§7 item 7); that the watcher's and alarm's exits reach the coordinator (item 5).

## Round-3 skeleton (S0.5)
- Reconcile after its main hold, in both paths (FX-W2 removed M2's `armAtStart`) (FIX-wake FX-W2 steps 6-7; FIX-JOIN
  point 6, part 2b row 3 and part 2c `turn.json`; collision point B11): `reconcileHold2({root, ce, th,
  flags, facts, proc, pre, dry}, res)` runs `hold2Wait(hold)` (FX-W2 step 6, the nonces' wait, outside
  every lock), then hold 2: `hold2Lock(hold, fn)` (FX-W2: one hold of the run lock with the ce re-checked;
  a dry run without it, as the main hold) runs
  `hold2ArmSlots(hold, handle)` (FX-W2 step 7: the live slots, `turn.json` arm and slots, `hold.slots`)
  and then `hold2PruneMarkers(hold, handle)` (FX-W1: reads `hold.slots` in the same hold, takes no lock
  of its own). Hold 2 is file-only: no process list inside it (FX-W1 step 1). Returns `hold.res`.
  FX-W1 built: `hold2PruneMarkers` lists `run/arm/` first, then reads what keeps a marker (`alarm.json`,
  every `slot-*.json`, `hold.slots`) and removes each `exited-*` marker none of them names, so a marker
  made after the listing is never touched; `unarmed-*` records stay; a dry run removes nothing.
- Flags of the default mode: `ARM_FLAGS` (FX-W2, `arm-nonces`, built) and `DEADMAN_FLAGS` (FX-W4, `deadman`, built).
- FX-W2 built: `armNonces`, `readArmSlots`/`judgeArmSlots` (r1), `turnHold1` (the main hold's
  `turn.json`), `hold2Wait`, `hold2Lock` (`lib.withRunLock` with `lockOpts`), `hold2ArmSlots`.
- `deadmanRun(ctx, flags, dry)` (FX-W4, built) runs right after the dry-run flag is read, before the ce
  check; null (no `--deadman`) goes on. `deadmanNowake` (FX-W4) is the build's anomaly.

## FX-CLAIM (round 3)

Reconcile (FX-CLAIM step 3): a session claim is the first source of `started`; other folder sessions → anomaly `duplicate-session`; a tombstone starts nothing; an invalid claim → anomaly `claim-invalid`; older attempts with a session claim and no transcript are reconciled too. `slotCount` gets `{root}`.

## FX-REDO: a missing ledger line after a death (FIX-fence section 5)

The row is written before its line, so a death between the two leaves the row moved and the line missing. The mode's own repeat is the redo, from the row (the after-image): only at the exact post-state, inside the mode's hold, the missing line is appended with `data.redo: true` and the answer is exit 0 with `result.repeat` true and `result.redo` (true when a line was written; a dry run writes nothing). Elsewhere the old answer stands.

- `--reconcile`: an active row at started whose attempt has a session (equal to the row's when that is set) and no `started` line gets one, at the end of the reconcile hold; rows this call moved are skipped; `reconciled` lists it with `redo: true`.
- Test: `tcb/test/redo.test.mjs`.

## FX-PLAN (round 3): the planner
`next` (status) and the row act (watch) are `lib.planAct` over `lib.planFacts` (CONTRACT, "FX-PLAN (round 3)"):
the transcript-visible branch is gone (the claim decides); acts with arguments are strings
(`replace-fence --reason <r>`, `replace-fence --reason crash --if-unclaimed`, `close-session <sid>`). The watcher
keeps its filters: the first fence and `replace-start` wait for a free slot and neither halted nor draining;
`audit`/`commit` are class 11's; `stop-verify` waits for its sample's age; `owner`/`none` raise nothing. Its
facts: its tick, wall time, an empty process list, the step-7 sessions of its own slotCount, and the rows of class
25 as zombie-over. Tests: status T3; watch "FX-PLAN act due", "FX-PLAN: a zombie-over row"; lib FX-PLAN T1-T3.

## FX-W4 (round 3): the dead-man
`status.mjs --deadman --root R` (FIX-wake FX-W4 steps 1-3, rev 5 N1; FIX-JOIN point 1.4; branches P1, H4 B, H7;
`departures/W4.md`). One run of the owner's scheduled task, `tcb/settings/deadman-task.xml` (every 5 min and at
logon, wake-to-run; a file: the build never installs it). Read-only but for its own file; no lock, no ledger line.
- **The ce** is `run/coord.json`'s: absent or without an integer ce >= 1 → 2 `no-coordinator`; corrupt → 67.
- **Before its one process list** (`realProc`, 30 s): `run/alarm.json`, `run/arm/slot-1..alarm_slots.json`,
  `run/watcher.json`, `run/watcher.lock`. After it: the exit markers (`lib.exitMarkers`). The alarm is `alive` when
  one record of this ce is alive and unmarked, else `unknown` when one is unknown, else `none` (absent, corrupt,
  another ce, marked or dead). The watcher likewise, its record valid as endturn judges it (watcher.json of this
  ce, watcher.lock naming the same pid and start).
- **Files, no lock:** `watcher.json.stuck` (FX-W5, any ce), `run/watcher-busy.json.busy_ticks` (FX-W7, per root),
  `run/turn.json` (`turn_seq` as the alarm reads it, `unarmed_turns`), `run/arm/unarmed-*.json` of this ce whose
  `turn_seq` is the current one (FX-W3).
- **Counts, in its own runs:** `runs_no_alarm`, `runs_no_watcher`: `none` +1, `alive` 0, `unknown` unchanged; both
  restart at 0 when the record's ce is not the current one. `list_hist`: the last 5 runs, true where the list failed.
- **Causes** (in this order): `no-alarm` (runs_no_alarm >= 2), `no-watcher` (runs_no_watcher >= 2), `list-failing`
  (3 of the last 5), `stuck` (non-empty), `run-lock-busy` (busy_ticks >= `busy_alert_ticks`, fallback 10),
  `unarmed-turns` (>= 3), `unarmed-records` (>= 2 of the current turn_seq).
- **Alerts (P1):** `alerted` {cause: runs since its last alert}. A cause alerts at its onset and again when
  `realert_runs` runs (fallback 6) have passed since its last alert; a cause absent for one run is dropped (its
  onset ends). Exit 1 `deadman-alert` {alerts, causes} when one alerts this run, else 0; result {ce, written,
  state fresh|continued|reset, runs, list answered|failed, alarm, watcher, the counts, stuck, busy_ticks,
  unarmed_turns, turn_seq, unarmed_same_turn, causes, alerts, alerted, gap}. The task toasts on every exit but 0.
- **Writes** `run/deadman.json` (CONTRACT §3.9 [deadman]) with writeAtomic, its one writer; `--dry-run` writes
  nothing. `boot` is `--boot`, else the boot of the list when it answered, else null. `gap`: the previous run of
  the same boot more than 2 periods (10 min) before this one, `{from, to, ms, boot, runs_since: 0}`, carried with
  runs_since + 1.
- **The status view** (build, every mode): anomaly `deadman-nowake` {why}: `no-run` (no file), `unreadable`, `stale`
  {at} (older than 3 periods, 15 min, at `--now`), `gap` {from, to, ms} while runs_since < max(1, ceil(2 x
  alarm_ms / 5 min)). The task's wake setting is judged by its effect: the runs keep coming through sleeps.
- Tests (`tcb/test/status.test.mjs`): "FX-W4 dead-man, the list answering", "FX-W4 dead-man, the list down",
  "FX-W4 dead-man re-alert (rev 5 N1, P1)", "FX-W4 status view" (with the task file read as text and its command
  parsed as PowerShell, never run).
