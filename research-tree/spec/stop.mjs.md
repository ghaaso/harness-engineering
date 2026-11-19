# stop.mjs (unit U1a)

## Purpose
Fence-first stop (R9, CONTRACT §3.6). `request` records that the target attempt must be stopped;
after the coordinator has stopped the session with its own tool, `verify` checks over
`stop_verify_deltas` watcher ticks that no transcript of that session or its helpers grows, reports
(never kills) processes that name the attempt, counts zombie spend, and on a confirmed stop sets the
row's terminal disposition. It never stops a session, never kills, never sleeps (§6, decisions 29, 30).

## Command line
```
node tcb/stop.mjs request --root R --ce N --task T --epoch E [--now ISO] [--dry-run]
node tcb/stop.mjs verify  --root R --ce N --task T --epoch E [--now ISO] [--dry-run]
```
`--epoch` is the row's current epoch. The **target attempt** (CONTRACT §3.6) is
`lib.attemptOf(row, E−1)` for a row at step fenced / stop-requested after a fence, and
`lib.attemptOf(row, E)` for a committed row (CONTRACT §3.6 committed row, decision 17).

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `run/watcher.json` (`ticks_total`),
`run/stop-sample/<task>-e<k>.json`, `tcb/thresholds.json` (stop_verify_deltas, Z_frac,
transcripts_root, proc_exe), the target attempt's transcripts (`sessionTranscripts` for its session,
plus `transcriptsForFolder` for its folder), the process list (realProc, outside the lock).

## Writes
`run/tasks.json` (stop owns `attempts[].stop`, `step` stop-requested/stopped and the state a
confirmed stop sets; a session found only from a folder transcript is named in the ledger line and
used, never written to the row, whose `attempts[].session` belongs to `status --reconcile`);
`run/stop-sample/<task>-e<k>.json` [stop-sample] (writeAtomic, under the lock); ledger lines
`stop-request` {session}, `stop` {session, confirmed, grew[], survivors[{pid, start_time, name}],
zombie_tokens}, `overflow` {ids[], tokens, reason} on a confirmed `cut`, `incident`
{class: refusal|not-run} on exits 1 and 2. Kills nothing.

## Steps
**request.** 1 Under `withRunLock(ce)`: row with epoch E at step `fenced`, or state `committed` at
step `bound`. Step already `stop-requested`/`stopped` for E → exit 0, nothing written. Other step →
65. 2 The target's session: its `session`, else the first session among
`transcriptsForFolder(folder)` (a session started but never bound). 3 Session found → step
`stop-requested`, target `stop` = requested, `stop-request` line {session}. No session and no
transcript, but the target was admitted (it has a `manifest`) and its stop is not already
confirmed → the same as a found session with session null (review U1-F5, R9/R10: a session the
coordinator started may not show a transcript yet, so verify observes the folder's transcripts and
processes over `stop_verify_deltas` ticks). No session, no transcript and never admitted (no
`manifest`) → step `stopped`, target `stop` = confirmed, `stop` line {session: null, confirmed:
true, grew: [], survivors: [], zombie_tokens: 0}, then the disposition (below).

**verify.** 1 Pre-check without the lock: row epoch E, step `stop-requested` (else 65; `stopped`
with this epoch → exit 0, nothing written). 2 Sizes now: byte size of every transcript file of the
target (main, every `agent-*.jsonl` helper, folder transcripts), keyed by posix path relative to
`transcripts_root`. 3 Read `run/watcher.json` `ticks_total` (absent → exit 2 `no-watcher`, nothing
written). 4 No sample file, or one for another target → under `withRunLock(ce)` (re-check epoch and
step, 65 on a change) write the sample {task, epoch: k, target, tick: ticks_total, sizes}, stderr
`[stop] sample-a`, exit 6 `sampling`. 5 Sample present and `ticks_total` < sample.tick +
`stop_verify_deltas` → exit 6 `waiting` (nothing written). 6 Otherwise compare: `grew` = files whose
size rose against the sample plus files absent from it. `proc.list()` (failure → `incident`
not-run, exit 2 `proc-unavailable`, row unchanged); `survivors` = `attemptProcesses(list, {folder,
sessionId}).matched` as {pid, start_time, name}. `confirmed` = `grew` and `survivors` both empty.
7 Under `withRunLock(ce)`: re-check epoch and step (65 on a change). zombie_tokens = max(0,
spendOf(target transcripts).total − target `spend_at_fence`) (0 for a committed row). Confirmed →
step `stopped`, target `stop` = confirmed, disposition, sample file removed; not confirmed → step
unchanged, target `stop` = unconfirmed, the sample replaced by the current sizes and tick (the next
verify compares against it). Append `stop`. 8 Exit 0 confirmed; 1 `stop-unconfirmed` (reasons also
carry `survivors` when non-empty and `zombie-over-z` when zombie_tokens > Z_frac × e_task).

**Disposition on reaching stopped** (either call; not for a committed row, whose state stays
committed): `limit` true → state `failed`; reason `cut` → state `cut` and an `overflow` line {ids:
`lib.variant(root, row, {f5Given}).uncovered`, tokens: total spend of every attempt of the row,
reason: "cut"}; `drop` → `dropped`; `memory` → `parked`; otherwise state stays `active`, awaiting
`replace start`.

## Exit codes
0 ok / confirmed / idempotent; 1 `stop-unconfirmed`, `no-task`; 2 `proc-unavailable`, `missing`,
`no-watcher`; 3 `run-from-attempt`; 6 `sampling`, `waiting`; 64; 65 `stale-epoch`/`wrong-step`/
`rev-moved`; 66; 67; 70; 75.

## Rules implemented
R1, R2 (stop is after the fence, so it need not be trusted), R3 (steps), R8 (limit path: failed
only after the confirmed stop; the slot frees then), R9 (non-growth over 2Δ = `stop_verify_deltas`
ticks, processes naming the folder or session reported, zombie spend, Z to the owner), R10
(unconfirmed counts as a slot), R11 (cut → overflow record), R58. §8 decisions 13, 14, 17, 29, 30.
Model findings F5 (stop before failed), N4 (orphans: reported as survivors).

## Behaviours (tests)
Transcripts come from `fakeTranscript` under the test's `transcripts_root`; processes are the
test's own `spawnSleeper` children; ticks are moved by the test writing `run/watcher.json`
`ticks_total` between two verify calls (no timer races).
- T1 request on a fenced row (epoch 2) whose attempt 1 has a session → step `stop-requested`,
  `attemptOf(row,1).stop` "requested", one `stop-request` line, exit 0; a repeat → exit 0, no new
  line.
- T2 request on a fenced row whose attempt was never admitted (no manifest, no session, no folder
  transcript) → step `stopped`, stop "confirmed", a `stop` line with `confirmed:true`, state active.
- T2b request on a fenced row whose attempt was admitted (manifest) but shows no session and no
  folder transcript → step `stop-requested`, `stop-request` {session: null}; verify samples, then
  confirms after `stop_verify_deltas` ticks; a live process naming the folder → `stop-unconfirmed`.
- T3 request on a fenced row with no session but a folder transcript naming the folder as `cwd` →
  step `stop-requested`, the `stop-request` line names that session, `attemptOf(row,1).session` stays
  null; a later verify samples that session's transcripts.
- T4 request on a row at step `bound` that is not committed → exit 65, nothing written.
- T5 verify twice: the first writes the sample, prints `[stop] sample-a` on stderr, exits 6
  `sampling`; with `ticks_total` unchanged a second call exits 6 `waiting`; after the test raises
  `ticks_total` by `stop_verify_deltas`, no growth, no matching process → step `stopped`, stop
  "confirmed", `stop` line `{confirmed:true, grew:[], survivors:[]}`, exit 0, sample removed.
- T6 verify where the test appends one line to the main transcript between the sampling call and the
  comparing call → stop "unconfirmed", step unchanged, `grew` names the file, exit 1
  `stop-unconfirmed`; after raising the ticks again with no growth → confirmed, exit 0.
- T7 a new helper file `agent-x.jsonl` appearing between the two calls is counted in `grew`.
- T8 verify with a sleeper whose command line contains the attempt folder (`spawnSleeper({args:
  [folder]})`) → nothing is killed, `survivors` names the sleeper, it is still alive afterwards,
  exit 1; a sleeper whose command line holds `wt/<task>-e10` while the folder is `wt/<task>-e1` is
  not a survivor. The test kills its sleepers itself.
- T9 zombie spend: `spend_at_fence` 1000, transcript total now 1600 → `zombie_tokens` 600; with
  e_task 5000, Z_frac 0.1 and growth → reasons include `zombie-over-z`.
- T10 confirmed stop of a row with `limit:true` → state `failed`; with reason `memory` → `parked`;
  with reason `drop` → `dropped`; with reason `handover` → `active`.
- T11 confirmed stop of a row fenced with reason `cut`, question_ids [a,b,c], a stored witnessed card
  of the task covering b → state `cut`, an `overflow` line `{ids:[a,c], reason:"cut"}` with the
  row's total tokens; the ledger verifies.
- T12 verify with `--epoch` ≠ the row's → 65; the row fenced again (test bumps the epoch through lib)
  between the sampling and the comparing call → 65 inside the lock, no `stop` line.
- T13 verify when the process list fails (threshold `proc_exe` set to a missing file) → exit 2
  `proc-unavailable`, one `incident` not-run line, row unchanged; no `watcher.json` → exit 2
  `no-watcher`.
- T14 request and verify on a committed row at step bound (decision 17) → step `stopped`, state stays
  `committed`, stop confirmed, no `overflow`, zombie_tokens 0.
- T15 any mode with stale `--ce` → 64, nothing written; `--dry-run` → no write, result as the real
  run; `tasks.json` corrupt → 67; `run.lock` busy → 75; stdout one §1.3 line each time.

## Cannot be tested without the app
Whether the coordinator's stop ends a real session's turn and helpers; whether a real `claude.exe`
command line names its folder or session id so `attemptProcesses` reports it (§7 item 4); real
transcript flush timing within `stop_verify_deltas` ticks.

## FX-REDO: a missing ledger line after a death (FIX-fence section 5)

The row is written before its line, so a death between the two leaves the row moved and the line missing. The mode's own repeat is the redo, from the row (the after-image): only at the exact post-state, inside the mode's hold, the missing line is appended with `data.redo: true` and the answer is exit 0 with `result.repeat` true and `result.redo` (true when a line was written; a dry run writes nothing). Elsewhere the old answer stands.

- `request` at stop-requested: the `stop-request` line (the target attempt's session, else the folder session). At stopped (both modes): the confirmed `stop` line of the target attempt (`stop` confirmed), `zombie_tokens` null (0 for a committed row). `verify` at stopped takes the run lock only when that line looks missing, and reads the row again under it.
- Test: `tcb/test/redo.test.mjs`.
