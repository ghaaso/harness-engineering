# SEM-fence: fencing, replacement and admission as the scripts build them (2026-11-17)

Helper F (`sem-fence`), round 3. Reader only: no command run, no script changed. Every claim on a
script cites `file:line` under `BUILD/tcb/`; claims on the model cite `model/model.mjs` (the
original, not the as-built copy). "INFERRED" marks what I reasoned and did not run or test.

Paths below: `BUILD` = the tcb-build folder of the charter. `tasks.json` = `run/tasks.json`.

## 0. Primitives every mechanism rests on

| Primitive | Where | Atomicity as built |
|---|---|---|
| run lock | `lib.acquireLock` lib.mjs:1282-1381, `withRunLock` 1463-1472 | `openSync(file,'wx')` exclusive create (1300). Held for one script call. Busy: `retries` waits (default 300 x ~100 ms) then `lock-busy` 75 (1377). A holder is judged only after 50 unchanged sightings (1221, 1366); `proc.alive` null (PowerShell failed) counts as alive (1327), so a dead holder's lock is never broken while the process list is unavailable: every script then exits 75 (INFERRED liveness hole, see D1). Unreadable lock bytes are broken only if unchanged for a whole budget of >= 50 retries (1370-1374, LR-4). Break = rename + re-check + wx (1388-1439). |
| ce check | `lib.checkCe` lib.mjs:1475-1490 | Reads `run/coord.json`: missing -> `no-coordinator` 2, unparseable/no integer ce -> `table-corrupt` 67, other ce -> `stale-ce` 64. `withRunLock` calls it after acquiring, before `fn` (1467): check and act share one lock hold. |
| table write | `writeTasks` lib.mjs:1665-1694, `updateRow` 1705-1730 | CAS on `rev` (1684), `handle.assertHeld()` (1690) re-reads the lock file's nonce, then copy to `.prev` and `writeAtomic` (temp `wx` + fsync + rename, 770-799; rename is atomic on NTFS, HARNESS-FACTS 9). A death leaves the old or the new table, plus a temp file. |
| exclusive create | `exclusiveWrite` lib.mjs:659-710, `createExclusive` 817-822 | temp `wx` + fsync + `linkSync(tmp, file)` (671): atomic create-if-absent; EEXIST -> compare bytes: `identical` or `different` (693-695). Fallback without hard links: plain `wx` (676-688), not crash-atomic (NTFS has links, so not taken there; INFERRED). |
| ledger line | `appendLedger` lib.mjs:1522 | under the run lock (handle), hash-chained; written AFTER the row in every script below, so a death between them leaves a row change with no ledger line (INFERRED: nothing re-adds it). |

## 1. The epoch fence of an attempt

**What it is on disk.** `tasks.json` row `{epoch, state, step}` (+ `attempts[e].cut`, `.stop`). An
attempt e lives in its own folder `wt/<task>-e<e>/` (lib.mjs:1733); the next attempt never writes
there and reads the old staging only up to the cut recorded at the fence (`readCutPrefix`,
lib.mjs:1844; replace.mjs:662-680).

**Who writes it.** `lib.fence` (lib.mjs:1740-1820, via `updateRow` CAS on `expectEpoch`) called
only from `replace.mjs fence` (replace.mjs:481) under the run lock with ce checked.

**Who reads it, when.**

| Reader | When | Lock | Effect |
|---|---|---|---|
| guard-hook (child roles) | before EVERY child tool call, harness PreToolUse hook | none (plain read of tasks.json) guard-hook.mjs:394-409 | `row.epoch !== epoch` or not active/admitted/started/bound -> deny `stale-epoch` |
| commit.mjs | intake and record | in lock, commit.mjs:929-939 | other epoch -> 65 + `zombie-write` ledger line |
| replace start / bind | in lock | replace.mjs:865, 982 | 65 `stale-epoch` |
| stop request / verify | in lock | stop.mjs:273, 365 | 65 |
| status --reconcile | `updateRow` with epoch | in lock, status.mjs:289, 302 | 65 -> skipped (312) |
| watcher | each evaluation | no run lock | reports only started/bound rows (watch.mjs:329) |
| READY itself | carries `epoch` | - | replace `readyValid` replace.mjs:199, commit record commit.mjs:692 |

**Atomicity.** The fence is checked at the child's GATE (the hook), not at the resource (the file
system). Hook decision and the tool's write are two acts of the harness: a tool call whose hook ran
before the fence completes after it. Safe for NoStaleAccepted (the late write lands in the old
folder, past the cut), lossy for a late READY (D4a).

## 2. M6: replace's READY re-check, and how READY is written

### 2.1 Steps, in order

`replace.mjs fence --task T --epoch E --reason r --ce N`:

1. Early ce check, no lock: replace.mjs:1053 (64 first).
2. Outside the lock: read table, spend of attempt E (transcript parse), tick: replace.mjs:440-448.
3. `withRunLock` (lib.mjs:1463): wx create of `run/run.lock`; `checkCe` in lock (1467).
4. In lock: read table (454), row lookup, drop's owner line (457-461), attempt dir (464),
   `stagingCut(dir)` (466; READY.json excluded, lib.mjs:1836).
5. In lock, M6: `running` = row.epoch E and active/{bound,started,admitted} or parked/stopped
   (473-474); for every reason except `first` and `tainted`: `readyValid` (183-201) true ->
   `ready-wins` 5, no change (475-477).
6. In lock: `lib.fence` (481): `updateRow` CAS -> inside the mutate, for FAILURE reasons except
   tainted it calls `readyCheck()` AGAIN (lib.mjs:1774-1776); H_max (1779); restarts/limit
   (1785-1796); cut + spend recorded (1797-1810); epoch E+1, step `fenced` (1811-1815); writeTasks.
7. In lock: `overflow` line for a no-attempt cut (494-498), `fence` ledger line (500), limit incident.
8. Release (lib.mjs:1470).

Steps 3-8 are ONE lock hold of one process. A death between 6 and 7 leaves a fenced row with no
`fence` ledger line (INFERRED; the retry gets `stale-epoch` 65 and writes nothing).

### 2.2 Who writes READY

The child session itself, with its harness `Write` (or `Edit`) tool, at
`wt/<T>-e<E>/staging/READY.json` (briefs/child.md:41, briefs/fmea.md:21, stpa.md:21, mapper.md:23,
fresh-reviewer.md:23; CONTRACT 3.12, CONTRACT.md:440). The child profile denies Bash and PowerShell
(profiles/child.json), so no script is on this path and no lock is taken. The only check is the
guard-hook (guard-hook.mjs:394-409 epoch/step, then the write prefix `{attempt}/staging/`), run
before the tool call and without the run lock. Atomicity of the harness `Write` tool (rename or
truncate-and-write) is not known: HARNESS-FACTS says nothing (INFERRED risk: a reader can see an
empty or half-written file).

### 2.3 Atomicity boundaries and deaths

| Act | Process | Lock |
|---|---|---|
| child hook check (reads row) | hook process (harness) | none |
| child READY write | the harness tool, child session | none |
| replace re-check + CAS + ledger | replace.mjs | one run-lock hold |

Interleaving that loses work (D4a): hook(E) passes -> replace locks, `readyValid` false, fence
E -> E+1 -> READY of E lands. Also: READY lands between step 5 and step 6's write (same outcome;
indistinguishable from "after the CAS" for every other observer, since all writers serialise on the
lock and unlocked readers only report). The READY of E is then zombie telemetry
(commit 65 + `zombie-write`).

### 2.4 Unknown cases

| Case | Code | Result |
|---|---|---|
| READY missing | replace.mjs:186 | false -> fence proceeds |
| READY a link / not a file / nlink > 1 | 187-192 | false -> fence proceeds |
| READY unparseable (torn write in progress) | 194-198 | false -> fence proceeds (unknown treated as absent) |
| READY schema-invalid, other task/epoch | 199-200, 208-231 | false |
| schema loader internal error | 210, 216 | rethrown 70 |
| lock busy / holder liveness unknown | lib.mjs:1327, 1377 | exit 75, nothing done |
| coord.json missing / corrupt / other ce | lib.mjs:1475-1490 | 2 / 67 / 64, nothing done |
| `lib.fence` re-check | lib.mjs:1774 | only for failure reasons; the wider check is replace's own (open question 6) |

### 2.5 The model today

- Fence: `runOp` OP.F model.mjs:264-291. READY re-check model.mjs:273-276 reads `s.p === 2` in the
  same atomic step as the CAS; `READY_WINS` (failure reasons) and `FIX_READY_ALL` (planned
  hand-over). The code re-checks for every reason but first/tainted, so READY_WINS+FIX_READY_ALL
  together match the CHECK.
- READY write: one atomic child step, successors model.mjs:496-500 (`y.p++` to 2).
- Gap (model-fidelity.json `model_errors` "The READY re-check reads the child's state in the same
  atomic step as the CAS fence..."; `fixes_modelled_as_oracles` FIX_READY_ALL; r3 `ready-race`:
  ReadyNotDiscarded fails 43/43 parts within 5 steps): the child's write has a gate (hook) and a
  landing that are separate, and an in-progress write reads as absent. Also missing: fence from
  ADMITTED (code allows it, model only from RUN, model.mjs:270), reasons memory/cut/drop/tainted
  (tainted is the one reason a READY never wins), and the ledger-after-row death.

### 2.6 Smallest faithful abstraction

- Keep the fence ONE step (re-check + CAS + ledger: one lock hold; every other writer serialises
  on the same lock). Merging the ledger line is safe while no property reads the ledger's fence
  lines.
- Split the child's READY into two steps with one bit per session, `rh` (READY hook passed):
  (a) `hook`: enabled when the row's epoch equals the session's and the step is running; sets
  `rh = 1`; (b) `land`: `rh = 1` -> `p = 2`, unconditional (the hook is not re-run). A torn write is
  the state `rh = 1, p < 2` and needs no third step. Property ReadyNotDiscarded: a non-tainted
  fence of E while the current session of E has `rh = 1 or p = 2`.
- Cost: one bit and one extra step per READY. The hook read can stay atomic with setting `rh`
  (one atomic file read; nothing the hook does depends on a second read).

## 3. CE: the coordinator-epoch fence

### 3.1 Steps

| Script (takes `--ce`) | Where it compares | Same lock hold as the act? |
|---|---|---|
| replace (plan, fence, start, bind) | early replace.mjs:1053 (no lock); in lock via `withRunLock` lib.mjs:1467 | yes |
| stop (request, verify) | stop.mjs:533 early; in lock stop.mjs:220 | yes |
| commit (intake, record) | lock opts carry ce, commit.mjs:915-921, 990; dry 979 | yes |
| status (build, reconcile, endturn, intent, owner, meter) | status.mjs:557, 610, 665 early; locks 575, 638, 671 with ce | yes |
| watch (watcher, --once, --alarm, --intake) | watch.mjs:709, 315 (every evaluation, no run lock), 754 and 777 (alarm: before writing alarm.json and after each sleep), 824; ledger appends under the run lock with ce | the watcher's check is per evaluation; its writes are under the lock |
| handover raise / bind | handover.mjs:258 early; lock 313 with ce N | yes |
| admit check, guard-hook | no `--ce` at all | read-only / gate |

**handover raise** (handover.mjs:252-347): (1) no lock: `checkCe` (258); drain flag in the ledger
(266); process list (271-276; failure -> `proc-unavailable` 2); `slotCount` > 0 -> refuse 6
(277-281); old wake sources reported, never killed (284-297). (2) one lock hold of ce N (313):
drain re-read; table re-check: any row at admitted/started/bound whose current attempt's stop is
not `confirmed` -> refuse `not-quiescent` (318-330); else ledger `ce-raise` (341), `assertHeld`
(342), `writeAtomic` coord.json with ce N+1 (343). Every later script of ce N gets 64 inside its
own lock hold: the raise and every scripted act are totally ordered by the run lock. This part of
the CE fence is a sound fencing token checked at the resource.

**Old watcher and alarm.** No kill (handover.mjs:283 "reported and never touched"). The watcher
exits 64 at its next evaluation (watch.mjs:315, within one Delta). The alarm checks ce only after
its sleep (watch.mjs:776-777): it exits 64 up to `alarm_ms` after the raise. Each exit is a wake of
the OLD coordinator (HARNESS-FACTS 2).

### 3.2 What the fence does not cover

The coordinator's acts that are not scripts: Read of `run/status.json` and `views/` (coordinator
profile read prefixes), Write under `plan/` (including `plan/tasks-plan.json`, which `replace plan`
of the new ce consumes; INFERRED risk), `Agent` helpers (checker, mapper), and the session tools
(start, message, stop, close). The coordinator's guard-hook takes no `--ce`
(settings/coordinator.json:64) and skips the epoch step for plain roles (guard-hook.mjs:26, 394).
R6's "a stale ce ends the turn" is a rule the session follows, enforced by nothing.

### 3.3 Unknown cases

coord.json missing 2, corrupt 67 (lib.mjs:1481-1487); lock unreadable or holder unknown -> 75 after
the budget. A stale coordinator whose scripts all exit 64 still wakes on each old watcher/alarm exit.

### 3.4 The model today and the gap

- `plans` model.mjs:200: a stale coordinator plans nothing (oracle: it obeys R6 by construction).
- `runOp` model.mjs:261: every op of a stale coordinator, OP.T (session-tool start) included, is
  refused with 64 (oracle: the tool has no ce).
- `turn start` model.mjs:538-539: reconcile and arm only when current.
- Handover OP.H model.mjs:361-370 kills the watcher and the alarm (`killAlarmsOf`); as built nothing
  is killed and the alarm lingers until its period ends.
- model-fidelity.json `model_errors` (FENCE_CE covers the tool start) and `extra_flaws[0]`
  (r4 stale-tool-start: Slots and OneSessionPerAttempt fail in 9 parts within 4 steps, one fault;
  r4 stale-tool-start-yield: fail with no fault, 22 finished parts); A-FENCE-CE infinite state space
  (ce is unbounded: `n.ce++` model.mjs:367, encoded in one byte, model.mjs:128, so it would wrap at 256).

### 3.5 Smallest faithful abstraction

- Keep the scripted ce check folded into each script step (one lock hold). Keep `runOp`'s 64 for
  script ops (model.mjs:261) but exclude OP.T (and a future session-close op).
- Replace `plans` model.mjs:200 by: a stale coordinator plans from what it can read (status.json is
  the last one a current coordinator wrote), so its plan may contain OP.T for an admitted row; its
  script ops then fail 64 and end the turn. One yield point before OP.T is enough to expose D3
  (r4 stale-tool-start-yield); do not add yields elsewhere.
- Handover: do not kill; the old alarm stays in `n.A` and wakes the old coordinator when it fires;
  the old watcher exits at its next tick (already model.mjs:450).
- Bound the state space: only "current" vs "stale" matters to every check, so encode a coordinator's
  ce as {current, stale} and let the owner start at most one successor per budgeted hand-over (the
  `d` budget already bounds hand-overs; the unbounded growth came from A-FENCE-CE's unfenced
  hand-overs, which an as-built model never needs: handover.mjs itself is fenced).

## 4. D3: the session-tool start

**Which act starts a child.** A tool call of the coordinator session (HARNESS-FACTS 1: only a session
can start a session), naming the folder `wt/<T>-e<E>/`, the brief and the tier that `replace start`
prepared (CONTRACT.md:344). It runs between `replace start` (one script call) and `replace bind`
(another), as separate tool calls of one turn.

**What on disk records it.** Nothing the coordinator writes. Evidence appears only from the child:
its transcript `<transcripts_root>/<project-dir>/<sid>.jsonl`, found by its first record's `cwd`
(`transcriptsForFolder` lib.mjs:2334-2363; a transcript with no `cwd` record yet is not found,
2357-2358); the child's tool calls through guard-hook (which records nothing and ignores the hook
input's session id). Then `status --reconcile` writes `started` + session (status.mjs:287-300,
ledger `started`) or `replace bind --session SID` writes `bound` (replace.mjs:999-1007), where SID
is known only from the tool's result in the coordinator's context.

**What fences it.** Nothing at the start. The child's own tool calls are gated by the epoch only
(guard-hook.mjs:406): any session in an admitted/started/bound folder of the current epoch passes,
however many there are and whoever started them. `replace start` on an already admitted row returns
`repeat: true` with exit 0 (replace.mjs:867-873), so it does not stop a second start either.
Today the coordinator profile lists no session tools (profiles/coordinator.json `tools_allow`), so
the guard-hook refuses them `tool-not-allowed` (spec/guard-hook.mjs.md:83; open question "session
tool prefixes"): as configured, no session can be started at all.

**Trace (INFERRED, matches r4 stale-tool-start-yield).** Coord ce1 drains; quiescent; `handover
raise` -> ce2. Coord ce2: `replace start f0` -> admitted, writes status.json. Old alarm of ce1
fires -> ce1 wakes; it Reads status.json (no ce check), sees f0 admitted, calls the session tool for
`wt/f0-e1`; its `replace bind` exits 64 but the session runs. Coord ce2 starts f0 too. Two sessions,
both pass the hook.

## 5. M4: slot counting and admission

### 5.1 `lib.slotCount(rows, procList, transcriptsRoot, opts)` lib.mjs:3063-3102

For every row not planned, every attempt (once per epoch, 3071-3076) whose `stop !== 'confirmed'`,
in this order: `stop === 'unconfirmed'` -> unconfirmed (3077-3080); `procList` null -> unknown
(3081-3084); a process whose command line names the folder or the session id (or a descendant,
`attemptProcesses` 2849-2884) -> live (3089-3093); the current attempt of an active row at
admitted/started/bound, or the last attempt of a committed row -> unknown (3094-3097); a transcript
by session id or folder -> unknown (3098); else 0. Note: admit calls it without `opts.root`
(admit.mjs:470), so a relative folder is matched as written.

Consequence (INFERRED): `live` and `unknown` count alike in `decide` (admit.mjs:228-232), so the
process list matters only for an attempt that is not current-open, not last-committed and has no
visible transcript: a fenced attempt whose stop is not yet confirmed and whose transcript lags.
Whether `claude.exe`'s command line names the folder or session id is unknown (HARNESS-FACTS 10).
If it does not, a late session of a fenced attempt counts 0.

### 5.2 Admission (`replace start`) and "no process list"

1. Outside the lock: `proc.list()`; any failure -> `procList = null` (replace.mjs:847-852); every
   attempt's spend from transcripts (853-854); user-file hashes (855-856).
2. One lock hold: table, row, epoch (865), repeat on admitted (867-873), step `stopped` (874-876);
   `gatherFacts` (880) with the outside-lock `procList`: null -> `slots = null` (admit.mjs:470) ->
   `decide` adds `slots-unknown` (admit.mjs:226) -> exit 6, incident `deferred` (replace.mjs:882-884).
   Memory: with no list every admitted/started row is a pending peak (admit.mjs:474-476).
   Otherwise cap = min(N_max, N_ceiling, 3) (231-232).
3. Same hold: remove a torn folder (893), build the attempt (898-911; on failure the folder is
   removed), `updateRow` stopped -> admitted with manifest (915-921), ledger `admit` (926-933).

So "no process list" refuses every admission (fail-safe), and `handover raise` exits 2
(handover.mjs:271-276), and `stop verify` exits 2 and stays `stop-requested` (stop.mjs:405-418).
`admit check` exits 2 when the only reason is `slots-unknown` (admit.mjs:526-530).

Staleness: the process list and transcripts are read before the lock; the table terms are read in
it. A session started after the list was taken is still counted (its row is admitted). A death in
step 3 between the folder build and `updateRow` leaves a folder and a `stopped` row: the next start
removes and rebuilds it (idempotent). A death after `updateRow`, before the `admit` line: the next
start answers `repeat` and never writes the line (INFERRED).

### 5.3 The model and the gap

`admitCount` model.mjs:241-248 counts true live sessions (`liveCount` 84: `s.al && s.p < 2`, so a
READY-but-alive child counts 0) plus admitted rows with no session (FIX_ADMIT_RESERVE). No unknown
case, no transcript lag, no `stop` state per attempt (OP.S model.mjs:292-313 is one atomic step that
confirms or makes a zombie). model-fidelity.json: "Admission and Slots read true process liveness";
`fixes_modelled_as_oracles` FIX_ADMIT_RESERVE.

### 5.4 Smallest faithful abstraction

Per session add `tv` (transcript visible; set by an environment step any time after the start, so
lag is unbounded but finite) and keep `al`. Per attempt `stop` in {none, requested, unconfirmed,
confirmed} (two bits). Slots as built = attempts with stop != confirmed that are current-open, or
last-committed, or unconfirmed, or `tv`, or process-visible. Process visibility: model the reading
"the command line never names the folder" (term always false; the worst case) as the default and the
other reading as a configuration. Process list unavailable: one budgeted environment fault `pl`
that sets a global bit for a while (admit refuses, stop verify and handover exit 2); a second fault
kind is not needed. Do not model lock-busy separately: it only delays (INFERRED; it matters for D1's
wake loop, not here).

## 6. The row step machine (admit, start, bind, commit, close)

| Transition | Writer | Lock | Separate from the previous step? | Death between this and the next |
|---|---|---|---|---|
| planned/none -> active/stopped e1 (`fence first`) | replace fence | one hold | - | row stopped, nothing runs |
| active/stopped -> admitted | replace start | one hold (folder + row + ledger) | separate script call | admitted, folder ready, no session |
| admitted -> (session runs) | coordinator session tool | none; nothing written | separate tool call | **session may run, nothing on disk until its transcript gets a cwd** |
| admitted -> bound | replace bind --session SID | one hold | separate script call; SID only in the coordinator's context | if the turn dies before bind, SID is lost |
| admitted -> started (+session) | status --reconcile (pre-read outside the lock status.mjs:234-247, apply in lock 263-317) | one hold | at the next turn start | 0 transcripts: stays admitted (D4b); >1: `several-sessions` anomaly, no change (266-268) |
| started -> bound | replace bind | one hold | separate call | - |
| bound/started -> committed | commit record per step | one hold (record wx, row, ledger) commit.mjs:808-866 | per step, after `audit` | see section 7 |
| committed/bound -> stop-requested | stop request | one hold stop.mjs:268-301 | separate call | **committed at `started` is refused `wrong-step` (stop.mjs:278)** |
| (session closed) | coordinator session tool | none | separate tool call | session alive, stop-requested |
| stop-requested -> stopped, attempt stop confirmed | stop verify (sample in lock 375-389; wait >= `stop_verify_deltas` ticks 393-399; compare transcript sizes and processes outside the lock 402-426; record in lock 434-461) | three phases | repeated calls over ticks | stays stop-requested; proc list unavailable -> exit 2 |

New finding (VERIFIED in code, reachability INFERRED): `commit record` accepts steps `started` and
`bound` (commit.mjs:843, 937), but `stop request` on a committed row accepts only `bound`
(stop.mjs:278), and `bind` refuses a committed row (replace.mjs:987). A row committed while at
`started` (reconcile marked it, the turn died before bind, READY came) can never be stopped: its last
attempt holds a slot for ever (slotCount lib.mjs:3086, 3094) and `handover raise` stays
`not-quiescent` for ever (handover.mjs:321-330). This is a sharper form of D4c.

Also INFERRED (depends on HARNESS-FACTS 10): a READY child that idles makes no transcript growth; if
its process is not matched by command line, `stop verify` confirms without any close (stop.mjs:426),
freeing the slot while the session lives.

## 7. The commit point (WX, AtMostOneCommit)

Steps of `commit record --task T --epoch E --step s` (commit.mjs:872-994):

1. Outside the lock: table, transcripts, untrusted staging read (894-906).
2. One lock hold (990): row exists, epoch E (929-935, else 65 + `zombie-write`), state
   active/committed and step started/bound (936-939), step listed; intake pass (945-949: new
   objects -> exit 6 `intake-new`).
3. Same hold, `recordPass`: READY lstat + parse (674-694: missing/unparseable -> 2 `no-ready`;
   link -> 3), step order (697-699), fresh fsck and clean audit (702-712), outputs from intake lines
   (715-739), pack/review rules (741-806).
4. Same hold: record `{task, step, epoch, step_key = sha(manifest), outputs, outputs_sha}`
   (809-820); `createExclusive(store/commits/<T>.<s>.json)` (826): created / identical (no-op) /
   different -> exit 1 `commit-differs` (828).
5. Same hold: `updateRow` (840-849) steps started/bound, states active/committed: sets
   `commits[s]`, state `committed` when every step has one.
6. Same hold: `commit` ledger line once per (task, step, outputs_sha) (854-866).

A death after 4: record present, row not marked; the retry (same epoch, same bytes) gets `identical`
and completes 5-6. Nothing else marks the row committed: `status --reconcile` records only starts
(status.mjs:263-317). A retry from another epoch has other bytes (epoch, step_key) and gets
`commit-differs` for ever; the fence does not look for an existing record, only for READY
(INFERRED liveness edge: after a torn commit, a `tainted` fence, or a READY edited away, the step can
never be committed again).

The model: OP.M model.mjs:338-356 (record + row, torn fault `t` at 353); `reconcile` model.mjs:188
marks a row committed from the record, which no script does, and masks WX completely
(model-fidelity.json `model_errors`, `vacuous_or_weak` AtMostOneCommit: A-WX graph equals DF's;
RV-WX-ONLY fails in 6 steps without that branch). Abstraction: delete model.mjs:188; keep record +
row as one step with the torn fault between them (one lock hold, so nothing else interleaves); keep
the identical-retry no-op (346). Count AtMostOneCommit over records with different bytes (epoch),
not over identical retries.

## 8. Defect D4 as built

- **(a) READY races the fence.** Section 2.3. The check is in the lock, its source is written outside
  it, and a torn READY reads as absent (replace.mjs:194-198).
- **(b) A late transcript leads to a double start.** Turn: `replace start` -> session tool -> turn
  dies before `bind`. Next turn: reconcile finds 0 transcripts (no cwd record yet) -> row stays
  admitted (status.mjs:270) -> the plan for an admitted row is "start the session, bind" -> `replace
  start` says `repeat` (replace.mjs:867) -> second session; both pass the hook; reconcile later sees 2
  and only reports `several-sessions` (status.mjs:266-268). Variant through a fence (INFERRED): the
  admitted row is fenced (allowed from admitted, replace.mjs:474), `stop request` -> stop-requested
  because a manifest exists (stop.mjs:289), `stop verify` sees no transcript and no matched process
  -> confirmed (stop.mjs:426) -> e2 starts while the e1 session comes up late and counts 0 slots.
- **(c) A committed child holds its slot until a close only a session performs.** Section 6: slot
  freed only by `stop verify` confirmed after `stop request` and a session-tool close; the
  coordinator must do two script calls and one tool call; `committed/started` can never be stopped.

## 9. Where the model must split, and where it may merge (summary for the modeller)

| Keep as separate steps | Why |
|---|---|
| child READY: hook, then land (`rh` bit) | D4a lives between them |
| coordinator: session-tool start, then bind (SID kept only within the turn) | D4b, D3 |
| transcript becomes visible (environment, `tv` bit) | reconcile, slotCount and stop verify read it |
| a yield before OP.T for a stale coordinator | D3 needs no fault once the stale turn can act |
| commit: record, then row (fault `t` already) | WX only matters for a torn commit |
| committed close: stop request, session close (tool), stop verify | D4c; a death between request and close |
| old alarm lives after the raise until it fires | the stale coordinator's wake |

| May merge | Why safe |
|---|---|
| fence re-check + CAS + ledger line | one lock hold; all writers serialise on it |
| ce check + scripted act | one lock hold (lib.mjs:1467) |
| replace start: admit decision + folder build + row | one lock hold; a torn build is undone by the next start |
| stop verify's sample/wait/compare | can be one step that needs a tick since the request, PROVIDED it reads `tv` and growth as built (not true liveness) |
| hook read + `rh` set | one atomic file read |

Cost estimate (INFERRED): three bits per session (`rh`, `tv`, SID-known-in-turn), two bits per
attempt (`stop`), one global bit (`pl`) and one fault kind; the ce field shrinks to current/stale.

## 10. Candidate fixes (one line each; the full design comes later)

- **D3** — problem: a deposed leader acting through an unfenced resource (distributed systems,
  fencing tokens, Kleppmann 2016 / Chubby sequencers). Borrow: the token checked AT THE RESOURCE.
  Branch (a), session-tool prefixes named: the coordinator's PreToolUse hook gets `--ce` and, for the
  session-start tool, checks ce against coord.json and the row's step under the run lock and creates
  `wt/<T>-e<E>/start.json {ce, nonce}` by exclusive create (refuse if present); plus (b)'s claim,
  because hook-pass and tool-start are still two acts. Branch (b), not named: session tools stay
  refused and nothing can start (the protocol cannot run); the only fix point is the child: its hook,
  at its first tool call, claims the attempt by exclusive create of `wt/<T>-e<E>/session.claim`
  holding the hook input's session id; any other session id is denied every tool (test-and-set at
  the resource). LLM assumption that fails: the deposed leader is not fail-stop and obeys R6 only
  by choice.
- **D4a** — problem: TOCTOU between a revocation and an in-flight write (lease revocation; Chubby's
  lock-delay). Borrow: make the READY intent a test-and-set under the same lock as the fence: the
  child's hook, on a Write to `staging/READY.json`, takes the run lock, checks the epoch and records
  `ready_claim@E` in the row (CAS); the fence treats a claim of E as READY (ready-wins), and a claim
  whose READY has not landed within a lease of k ticks expires (classical lease expiry), so a dead
  writer cannot block the fence for ever. Open question 6: (a) widen `lib.fence` -> the claim check
  goes into its `readyCheck`; (b) keep -> replace's own re-check (replace.mjs:475) reads the claim;
  same lock either way. Torn READY: treat "file present, unparseable" as unknown -> refuse with a
  retryable code, not as absent.
- **D4b** — problem: at-most-once execution of a non-idempotent start (RPC with idempotency keys;
  two-phase intent). Borrow: write `start-requested {nonce}` in the row under the lock BEFORE the
  tool call; reconcile treats start-requested without a transcript as unknown (never "not started")
  until a start lease expires; on expiry fence to a new epoch rather than retry the same one (the
  late session then fails its hook); the D3 claim file is the resource-side backstop.
- **D4c** — problem: releasing a resource held by a finished worker that cannot be relied on to exit
  (lease expiry / failure-detector-driven release). Borrow: release by a script, not by a session:
  the watcher raises an act (class 17) for a committed attempt not yet stopped, and `stop request`
  accepts committed/started as well as committed/bound (fixes the permanent leak). Branch on the
  session-tool prefixes: named -> the coordinator closes, then verify confirms; not named -> no close
  is possible and only the owner can free the slot (so the slot rule needs a lease: a committed
  attempt idle for k ticks with READY in is counted unconfirmed, not unknown, and escalated).
- **M6 gap** — problem: a check under a lock whose source is written outside it. Borrow: move the
  source under the lock (the D4a claim). Both branches of question 6 as in D4a.
- **CE gap** — problem: fencing covers only the scripted resources. Borrow: check the token at every
  resource the stale actor can still touch: the coordinator's hook with `--ce` (written into the
  successor's settings at its start; INFERRED mechanism) denies every tool except reading status
  when coord.json's ce differs. Depends on the prefixes question for the session tools; `plan/`
  writes and helpers are covered either way.
- **RC gap** — problem: inferring absence from missing evidence (an unknown read as "no"). Borrow:
  positive, synchronously written evidence: reconcile reads `start-requested` (D4b) and the
  `session.claim` file (D3) instead of only transcripts with a cwd record, and keeps "unknown" as its
  own outcome; the model's committed-from-COMMIT branch is deleted, since no script has it.

## 11. Notes for myself (if asked to design)

- The claim file, the ready claim and the start intent are three uses of one primitive: an
  exclusive-create or row CAS under the run lock, written by a hook (a script the harness runs), the
  only trusted runner on the child's side. Check whether a PreToolUse hook may take the run lock
  without deadlocking against a coordinator script (it holds it for milliseconds; the lock is
  per-call). Retries: the hook's own budget must be short, or a busy lock stalls every child call.
- Every lease needs a clock: use watcher ticks (the counter R5 already has), never wall time, except
  the M5 one-sided discount.
- Before writing the fix, confirm in the harness docs that PreToolUse input carries `session_id`
  (believed; guard-hook ignores it today) and whether the Write tool replaces the file atomically.
- Open in the code, not in my scope: the ledger line written after the row (fence, admit, bind):
  a death between them leaves no line and nothing re-adds it.
