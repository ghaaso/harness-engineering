# status.mjs (unit U1b)

## Purpose
Builds `run/status.json`, the coordinator's only state (R6, R12, R20), as a pure function of files.
`--reconcile` records starts the coordinator made but did not bind (R3). `--endturn` writes the
acknowledged ledger seq and checks that the two wake sources run (R6). `intent`, `owner` and `meter`
put the owner's word, intents and meter readings into the ledger (§8 decision 25).

## Command line
```
node tcb/status.mjs --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/status.mjs --reconcile --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/status.mjs --endturn --acked-seq K --root R --ce N [--now ISO] [--dry-run]
node tcb/status.mjs intent open --key KEY --subject S [--text-file P] --root R --ce N
node tcb/status.mjs intent done --key KEY --root R --ce N
node tcb/status.mjs owner --act approve|accept|resume|drop|ruling --subject S --quote-file P --root R --ce N
node tcb/status.mjs meter --pct P --root R --ce N
```
Modes `intent` (sub-mode `open|done`), `owner`, `meter`; the default and the two flags otherwise.
`--reconcile` and `--endturn` together → 66. `--pct` an integer 0..100; `--key` the intent-key
pattern (CONTRACT §1.5); `--quote-file`/`--text-file` must resolve under `<root>/plan/notes/`
(`isUnder`; the coordinator's only writable place for them) → else 66 `path-outside-root`.

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `run/acked.json`, `run/watcher.json`,
`run/watcher.lock`, `run/alarm.json`, `run/arm/` (the exit markers and slot files, FX-W1), `run/intents/`, `tcb/thresholds.json`, `store/commits/`,
`store/status/card_status.jsonl`, `wt/*/staging/READY.json`, transcripts (spend, windows,
reconcile), the process list (slots, wake sources).

## Writes
`run/status.json` (writeAtomic under the run lock), `run/acked.json` (endturn), `run/tasks.json`
(reconcile: `step` started, `attempts[].session`), `run/intents/<key>.json` and `.done` (exclusive
create), ledger lines `started` {session}, `owner` {act, subject, quote}, `intent-open` {key},
`intent-done` {key}, `meter` {pct, self_reported: true}. Reconcile removes `run/arm/exited-*.json`
markers that nothing names (hold 2, FX-W1).

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
  `several-sessions`, `zombie-write`, `ready-unparseable`.
3 Validate against [status] and write. Same inputs → same file except `generated_at`.

**--reconcile.** For each row active at step `admitted` (epoch e): `transcriptsForFolder(folder)`;
exactly one session → `updateRow(steps ['admitted'], epoch e)`: step `started`,
`attemptOf(row, e).session`; append `started` {session}. Two or more sessions → no change, anomaly
`several-sessions`. For every attempt not current with `session` null and folder transcripts: set
that attempt's `session` (no step change, no line). Then build. **Then the alarm (M2, CONTRACT
decision 40):** reconcile is the first act of every turn, so it checks the wake source a dying
turn would otherwise leave missing: alarm = `alarm.json` of this ce whose `lib.liveness` (with the
exit markers, over the list taken before the lock) is not dead. **FX-W1 (D1 at S:596):** unknown (the
list unavailable) asks nothing. When it is dead (absent, corrupt, another ce, an exit marker, or gone
from the list), exit 1 with reason `alarm-missing` {ce, pid, alive: false, state: `dead`} (the status
is still built and written, the rows still reconciled; `result.arm` = `"alarm"`); the coordinator starts `watch.mjs --alarm` as a background
command before anything else in the turn. A live alarm is left as it is (endturn's `acked.json`
write re-arms it, M1). Reconcile starts and kills nothing.

**--endturn.** 1 Under `withRunLock(ce)`: K > ledger head seq → exit 1 `acked-ahead`; K < the
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
0; 1 `acked-ahead`, `acked-backwards`, `watcher-missing`, `alarm-missing` (endturn; and
reconcile, M2), `intent-differs`, `no-task`; 2 `proc-unavailable` (endturn: none dead, some unknown), `missing`, `schema-version`; 3 `run-from-attempt`; 64;
65 (reconcile CAS); 66; 67 (tasks, coord, acked or an intent file corrupt; a corrupt watcher or alarm
record is the anomaly `state-corrupt`, FX-W1); 70; 75.

## Rules implemented
Process list and transcript parses happen before the lock (CONTRACT §2.1).
R1 (status.json under the lock), R3 (reconcile: a transcript means the start happened), R6 (status
first; acked seq; two wake sources), R10 (slots, reservation never stored), R12 (status is the only
state), R20 (a view, rebuilt), R40 (`not_run`), R58; decisions 3, 4, 5, 17, 25, 40. Model findings F4
(endturn never starts a second watcher), A8 and "acked seq not persisted"; second model check M1
(endturn's acked.json is the arm token; nothing killed) and M2 (alarm armed at turn start).

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
  `attemptOf(row, e).session` set, one `started` line; a repeat → no line (exit 1 `alarm-missing`
  in T7-T9 and T16, whose roots have no alarm; M2).
- M2 reconcile and the alarm: no `alarm.json` → exit 1 `alarm-missing`, `result.arm` "alarm",
  status.json still written; an `alarm.json` of this ce naming a live sleeper → exit 0; one naming a
  finished child, or of another ce → exit 1 `alarm-missing`; the sleeper is alive afterwards.
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
  reconcile exit 1 `alarm-missing`. Never 67.
- FX-W1 reconcile, list unavailable: an unmarked alarm of this ce → exit 0 (no `arm`), status alive
  null for both, no `*-dead` anomaly, `proc-unavailable` present; with its exit marker → exit 1
  `alarm-missing` {alive: false, state: dead}, `alarm.alive` false, anomaly `alarm-dead`, and the
  marker (named by `alarm.json`) is kept.
- FX-W1 prune: markers of `alarm.json`'s alarm, of a slot file's alarm and of an alarm nothing names,
  plus an `unarmed-*` record → `--dry-run` removes nothing; reconcile removes only the unnamed marker.

## Cannot be tested without the app
That a real session's transcript appears in `projectDirName(folder)` with that `cwd` soon after
start (§7 item 7); that the watcher's and alarm's exits reach the coordinator (item 5).

## Round-3 skeleton (S0.5)
- Reconcile after its main hold, in both paths before `armAtStart` (FIX-wake FX-W2 steps 6-7; FIX-JOIN
  point 6, part 2b row 3 and part 2c `turn.json`; collision point B11): `reconcileHold2({root, ce, th,
  flags, facts, proc, pre, dry}, res)` runs `hold2Wait(hold)` (FX-W2 step 6, the nonces' wait, outside
  every lock), then hold 2: `hold2Lock(hold, fn)` (FX-W2: one hold of the run lock with the ce re-checked;
  a dry run without it, as the main hold; until FX-W2 fills it, `fn(null)` without the lock) runs
  `hold2ArmSlots(hold, handle)` (FX-W2 step 7: the live slots, `turn.json` arm and slots, `hold.slots`)
  and then `hold2PruneMarkers(hold, handle)` (FX-W1: reads `hold.slots` in the same hold, takes no lock
  of its own). Hold 2 is file-only: no process list inside it (FX-W1 step 1). Returns `hold.res`.
  FX-W1 built: `hold2PruneMarkers` lists `run/arm/` first, then reads what keeps a marker (`alarm.json`,
  every `slot-*.json`, `hold.slots`) and removes each `exited-*` marker none of them names, so a marker
  made after the listing is never touched; `unarmed-*` records stay; a dry run removes nothing.
- Flags of the default mode: `ARM_FLAGS` (FX-W2, `arm-nonces`) and `DEADMAN_FLAGS` (FX-W4, `deadman`), empty.
- `deadmanRun(ctx, flags, dry)` (FX-W4) runs right after the dry-run flag is read, before the ce check;
  null goes on.
