# handover.mjs (unit U1b)

## Purpose
Coordinator epochs (R12, R28). `init` creates the run root's missing folders and the first
`coord.json` (ce 1) with the owner's approved tcb commit. `raise` ends a coordinator after its drain:
when no child process of any epoch is live, it raises ce and prints the one-line brief for the
successor; the old watcher and alarm are left to end themselves on the newer ce (exit 64, decision
29). `bind` records the successor's session id. It starts, kills and messages nothing (§6).

## Command line
```
node tcb/handover.mjs init  --root R --tcb-commit SHA40 [--session SID] [--now ISO] [--dry-run]
node tcb/handover.mjs raise --root R --ce N [--now ISO] [--dry-run]
node tcb/handover.mjs bind  --root R --ce N --nonce X [--now ISO] [--dry-run]
```
`--tcb-commit` must be 40 lowercase hex, `--session` 36 characters of `[0-9a-f-]` → else 66. `init`
takes no `--ce` (it creates the first one, §1.1).

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl` (`drain` lines), `run/watcher.lock`,
`run/watcher.json`, `run/alarm.json`, `tcb/thresholds.json` (transcripts_root, N_max), transcripts
(slot `unknown`), the process list.

## Writes
`init`: the §2 folders that are missing (`tcb/` excepted: the owner's), `<root>/.gitignore` (only if
absent; lines `wt/`, `.snapshots/`, `sealed/`, `tmp/`, `run/*.lock`, `run/alarm.json`,
`run/watcher.json`, `run/*.stale`, `run/*.orphan`, `*.tmp`), `<root>/.gitattributes` (only if absent;
`* -text`), the empty task table `{schema_version, rev: 0, tasks: []}` through `lib.writeTasks` (only
when `tasks.json` and `tasks.json.prev` are both absent, CONTRACT §2.1), `run/coord.json`
{schema_version, ce: 1, session?, started_at, tcb_commit}. `raise`: `run/coord.json` {ce: N+1,
session: null, started_at, tcb_commit copied}. `bind`: `run/coord.json` with `session`. Ledger
`coord-init` {tcb_commit}, `ce-raise` {from, to}, `coord-bind` {session}, `incident` on refusals.
No kills.

## Steps
**init.** 1 `<root>` must exist and contain `tcb/` (else exit 2 `missing`). The resolved root
longer than 40 characters → reason `root-long` {length} in the result (a warning; the exit is not
changed by it). 2 Create the missing folders, `.gitignore` and `.gitattributes`. 3 Under
`withRunLock` (no ce): the empty task table when neither `tasks.json` nor `.prev` exists;
`coord.json` absent → write it, append `coord-init`; present with the same `tcb_commit` → exit 0,
nothing written; present with another → exit 1 `coord-exists`; corrupt → 67. The first ledger line
of a run is this one (seq 1 unless a `lock-break`/`torn-tail` line precedes it).

**raise.** 1 Read-only pre-checks: `checkCe(N)` (64); a `drain` line with `ce` N exists, else exit
6 `no-drain` (R12: the drain is the default hand-over; `lib.runFlags`' draining); quiescence =
`slotCount` gives live + unknown + unconfirmed = 0 over every attempt of every epoch (R12: "no live
child process of any epoch"; an admitted, started or bound current attempt always counts, CONTRACT
§4.10), else exit 6 `not-quiescent` with the counts; `proc.list()` failure → exit 2
`proc-unavailable`. 2 Wake sources: note the watcher (`watcher.lock`/`watcher.json`) and alarm
(`alarm.json`) records whose `proc.alive` is true; they are reported, not touched: each exits 64 at
its next ce check. 3 Under `withRunLock(N)`: re-check ce = N (64), the `drain` line, and that no
row reached step admitted/started/bound with stop ≠ confirmed since step 1 (else exit 6
`not-quiescent`, nothing written); write `coord.json` {ce: N+1, session: null, started_at: now,
tcb_commit: unchanged}; append `ce-raise` {from: N, to: N+1} (line `ce` N). 4 Result `{from, to,
stale_wake_sources: [{which: watcher|alarm, pid, start_time}], brief}` where `brief` is one line:
`Coordinator ce <N+1> for run <root>, tcb <tcb_commit>: run node <root>/tcb/status.mjs
--root <root> --ce <N+1> and act on run/status.json.` (R12, R28: the brief echoes the commit).

**bind (FX-CGATE).** `--nonce` 32 lowercase hex, else 66; `--session` → 66 (the guard hook names the session:
its bind step strict-creates `run/coord-session-<N>.json` {session_id} before this call runs). Under
`withRunLock(N)`: coord.json without `successor_nonce` → exit 0 unchanged when its `session` equals the session
file's, else exit 1 `no-nonce`; a nonce other than coord.json's `successor_nonce` → exit 1 `nonce-mismatch` and an
`incident` line; the session file missing or its `session_id` not a lowercase UUID → exit 1 `not-bound` and an
`incident` line; else `coord-bind` {session} and coord.json with that `session` and without `successor_nonce`.
`init` (when it creates coord.json) and `raise` (in the hold) write a fresh `successor_nonce`
(`crypto.randomBytes(16)` hex) and return `result.brief` ending ` Before any other call: node
<tcb>/handover.mjs bind --root <root> --ce <ce> --nonce <X>.` (forward slashes; a path with a blank quoted); a
dry run names no nonce. `init` also makes `run/close`, `run/close/intent`, `run/close/done`.

## Exit codes
0; 1 `coord-exists`, `session-differs`; 2 `missing`, `proc-unavailable`, `no-coordinator` (raise or
bind without coord.json); 3 `run-from-attempt`; 6 `no-drain`, `not-quiescent`; 64; 66; 67; 70; 75.

## Rules implemented
R1 (ce raised under the run lock, finding E1), R4/R6 (watcher and alarm of the old ce exit 64 at
their next check), R12 (drain, quiescence over live processes of any epoch, raise, one-line brief),
R28 (tcb commit recorded at init, copied at each raise), R58; decisions 4, 5, 21, 29. Model findings
A2 (the old watcher cannot act: every write re-checks ce), A3 (quiescence counts zombies), "two
coordinators act" (the ce fence). Second model check (CONTRACT decision 40): no change here. M1
holds already (raise kills no wake source; an old alarm, re-armed or not, ends with 64 at its next
check after a sleep); M3's `handover` act is raised by the watcher (class 17) when a `drain` line of
this ce exists and no slot is used, which is this script's quiescence over the table.

## Behaviours (tests)
- T1 init on a root with only `tcb/` → every §2 folder exists, `.gitignore` has the ten lines,
  `.gitattributes` is `* -text`, `run/tasks.json` is `{schema_version, rev: 0, tasks: []}` and
  validates, `coord.json` {ce:1, tcb_commit, session absent or null}, one `coord-init` line, exit 0;
  the ledger verifies; the temp root is longer than 40 characters, so `result.reasons` holds
  `root-long` and the exit is still 0.
- T2 init again with the same commit → exit 0, coord and ledger byte-identical; with another commit
  → exit 1 `coord-exists`, unchanged; an existing `.gitignore`, `.gitattributes` or `tasks.json` is
  never rewritten (a root with only `tasks.json.prev` gets no new table either).
- T3 init with `--tcb-commit abc` → 66; on a root without `tcb/` → exit 2 `missing`.
- T4 raise without a `drain` line of ce 1 → exit 6 `no-drain`, coord unchanged, one `incident` line.
- T5 raise with a `drain` line and a row whose attempt has `stop: unconfirmed` → exit 6
  `not-quiescent` with `{unconfirmed:1}`; with a bound attempt that has a transcript and no process
  → `not-quiescent` (`unknown:1`).
- T6 raise, quiescent, with a live watcher (a `spawnSleeper` child, its record in `watcher.lock`)
  and a live alarm (likewise, in `alarm.json`) → both still alive afterwards and listed in
  `stale_wake_sources`, `coord.json` ce 2 with the same tcb_commit and session null, one `ce-raise`
  {from:1, to:2}, `result.brief` names ce 2 and the commit, exit 0; the test ends its sleepers.
- T7 a row at step admitted with no process and no transcript → `not-quiescent` (`unknown:1`).
- T7b the in-lock re-check (step 3): a row moved to admitted after the pre-checks and before the
  lock → exit 6 `not-quiescent`, coord unchanged, one `incident` line. Test seam (review U1-F8):
  handover.mjs exports `doRaise(ctx, root, flags, dry, hooks)`, whose `hooks.beforeLock` runs after
  the pre-checks; `main` runs only when the file is the process's entry script, and the command line
  never passes hooks.
- T9 raise `--ce 1` when coord is already at 2 → 64, nothing written; a second raise right after a
  successful one with `--ce 1` → 64.
- T10 raise `--dry-run` → result with `to:2`, coord unchanged.
- T11 bind `--ce 2 --session <uuid>` → coord.session set, one `coord-bind` line; again → exit 0, no
  line; another uuid → exit 1 `session-differs`; `--ce 1` → 64.
- T12 `coord.json` unparseable → raise and bind exit 67; init exits 67.
- T13 `run.lock` held by a live sleeper record → 75 for every mode; every stdout one §1.3 line.

## Cannot be tested without the app
That the old coordinator, woken by any late exit after the raise, is refused by every writing
script and ends its turn (§7 item 5); that the owner starts the successor from the brief; that the
old watcher and alarm, left alive, reach their next ce check and exit 64.

## Round-3 skeleton (S0.5)
- `briefLine(root, ce, tcbCommit, nonce = null)`: today's line, then `briefNoncePart(nonce, root, ce)` (FX-CGATE
  step 1) and `briefPathPart(root)` (FX-W3: the path of `tcb/briefs/coordinator.md`), both '' until
  filled, so the line is unchanged.

## FX-CLAIM (round 3)

`slotCount` gets `{root}` (FX-CLAIM step 7).
