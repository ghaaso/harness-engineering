# status.mjs (unit U1b)

## Purpose
Builds `run/status.json`, the coordinator's only state (R6, R12, R20), as a pure function of files.
`--reconcile` records starts the coordinator made but did not bind (R3). `--endturn` writes the
acknowledged ledger seq and checks that the two wake sources run (R6). `intent`, `owner` and `meter`
put the owner's word, intents and meter readings into the ledger (§8 decision 25).

## Command line
```
node tcb/scripts/status.mjs --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/scripts/status.mjs --reconcile --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
node tcb/scripts/status.mjs --endturn --acked-seq K --root R --ce N [--now ISO] [--dry-run]
node tcb/scripts/status.mjs intent open --key KEY --subject S [--text-file P] --root R --ce N
node tcb/scripts/status.mjs intent done --key KEY --root R --ce N
node tcb/scripts/status.mjs owner --act approve|accept|resume|drop|ruling --subject S --quote-file P --root R --ce N
node tcb/scripts/status.mjs meter --pct P --root R --ce N
```
Modes `intent` (sub-mode `open|done`), `owner`, `meter`; the default and the two flags otherwise.
`--reconcile` and `--endturn` together → 66. `--pct` an integer 0..100; `--key` the intent-key
pattern (CONTRACT §1.5); `--quote-file`/`--text-file` must resolve under `<root>/plan/notes/`
(`isUnder`; the coordinator's only writable place for them) → else 66 `path-outside-root`.

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `run/acked.json`, `run/watcher.json`,
`run/watcher.lock`, `run/alarm.json`, `run/intents/`, `tcb/thresholds.json`, `store/commits/`,
`store/status/card_status.jsonl`, `wt/*/staging/READY.json`, transcripts (spend, windows,
reconcile), the process list (slots, wake sources).

## Writes
`run/status.json` (writeAtomic under the run lock), `run/acked.json` (endturn), `run/tasks.json`
(reconcile: `step` started, `attempts[].session`), `run/intents/<key>.json` and `.done` (exclusive
create), ledger lines `started` {session}, `owner` {act, subject, quote}, `intent-open` {key},
`intent-done` {key}, `meter` {pct, self_reported: true}.

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
- `watcher` {alive: `proc.alive(pid, start_time) === true`, ce, last_tick_at, ticks_total};
  `alarm` {alive, ce}; `open_intents` (`.json` without `.done`); `not_run` = (check, subject)
  whose last `check` line has result not_run, plus (`fsck`, `store`) when the last `fsck` line is
  not_run; `anomalies`: `proc-unavailable`, `ledger-torn`,
  `watcher-dead`, `alarm-dead`, `watcher-stale-ce`, `lock-orphan` (`*.orphan` files),
  `several-sessions`, `zombie-write`, `ready-unparseable`.
3 Validate against [status] and write. Same inputs → same file except `generated_at`.

**--reconcile.** For each row active at step `admitted` (epoch e): `transcriptsForFolder(folder)`;
exactly one session → `updateRow(steps ['admitted'], epoch e)`: step `started`,
`attemptOf(row, e).session`; append `started` {session}. Two or more sessions → no change, anomaly
`several-sessions`. For every attempt not current with `session` null and folder transcripts: set
that attempt's `session` (no step change, no line). Then build. **Then the alarm (M2, CONTRACT
decision 40):** reconcile is the first act of every turn, so it checks the wake source a dying
turn would otherwise leave missing: alarm = `alarm.json` ce equals ce and `proc.alive` true. When
it is not (absent, another ce, dead, or the process list unavailable), exit 1 with reason
`alarm-missing` {ce, pid, alive} (the status is still built and written, the rows still
reconciled; `result.arm` = `"alarm"`); the coordinator starts `watch.mjs --alarm` as a background
command before anything else in the turn. A live alarm is left as it is (endturn's `acked.json`
write re-arms it, M1). Reconcile starts and kills nothing.

**--endturn.** 1 Under `withRunLock(ce)`: K > ledger head seq → exit 1 `acked-ahead`; K < the
stored acked_seq → exit 1 `acked-backwards`; write `acked.json` {ce, acked_seq: K, at: now}.
2 Wake sources: watcher = `watcher.json` ce equals ce, `watcher.lock` holds its pid and
start_time, and `proc.alive` is true; alarm = `alarm.json` ce equals ce and `proc.alive` true.
`proc.alive` null for either → exit 2 `proc-unavailable` (acked.json is still written). 3 Exit 0
when both run; else 1 with reasons `watcher-missing` and/or `alarm-missing` — the coordinator then
starts `watch.mjs` and/or `watch.mjs --alarm` as background commands. Endturn starts and kills
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
reconcile, M2), `intent-differs`, `no-task`; 2 `proc-unavailable` (endturn), `missing`, `schema-version`; 3 `run-from-attempt`; 64;
65 (reconcile CAS); 66; 67 (tasks, coord, acked, watcher, alarm or an intent file corrupt); 70; 75.

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
  record of an older ce → `watcher-missing`.
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

## Cannot be tested without the app
That a real session's transcript appears in `projectDirName(folder)` with that `cwd` soon after
start (§7 item 7); that the watcher's and alarm's exits reach the coordinator (item 5).
