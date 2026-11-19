# gather:audit - where our own code starts PowerShell and other Windows helpers

Static reading of the frozen copy `scratchpad/tcb-build-vc/` (tcb/*.mjs, tcb/lib.mjs, tcb/test/*.test.mjs, tools/lane.mjs,
e2e/run-e2e.mjs, model/run-resumable.mjs, model/run-all.mjs). Nothing was run: no PowerShell call, no test, no process
started except a few file-existence checks and two read-only `reg query` calls through Bash. Every number below that
says "estimate" is counted from code, not measured. The measured profile of the suite is made elsewhere.

Short answer first: there is exactly **one** place that starts `powershell.exe` from library code
(`tcb/lib.mjs:2757`, `realProc`), but it is reached by about 25 scripts and by about 22 of 26 test files, and the test
files add their own direct PowerShell calls (about 45 starts in the suite, none through the library). No change of
code structure alone ends the starts; the smallest change that does is to change what `realProc` runs.

## 1. Every call site

### 1.1 PowerShell

| # | File:line | Program and command | Purpose |
|---|---|---|---|
| P1 | `tcb/lib.mjs:2757` (`run` inside `realProc`), texts at 2735-2744 | `powershell.exe -NoProfile -NonInteractive -Command <text>` by `execFileSync`, timeout 30 s | the only library site. Three texts: `PS_LIST` (all of `Win32_Process`: ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine, CreationDate, plus `LastBootUpTime`), `psOne(pid)` (CreationDate of one pid, or `NONE`/`NOSTART`), `PS_BOOT` (`LastBootUpTime`) |
| P2 | `tcb/test/*.test.mjs`, helper `holdLock` in 15 files (audit, certify, check-queue, commit, compare, fsck, gate, harvest, promote, protocol-freeze, render, seed, tms; plus the same shape as `spawnSleeper` in snap and witness) | `powershell.exe ... Get-CimInstance Win32_Process -Filter "ProcessId=<child>"` .CreationDate | read the start time of a `node -e setInterval` sleeper the test spawned, to write a believable `run.lock` |
| P3 | `spawnSleeper` in admit (:96), replace (:95), stop (:96), lib (:117); `psStart` in handover (:55), status (:63), watch (:71); `ownStartTime` in selftest.test (:801); one more in lib.test T89b (:2522, two calls) | same CIM query | same purpose; T89b checks the failure behaviour of the library's texts |
| P4 | `probes/*.mjs` (inspect-sessions, process-probe, spawn-kill, tie-sessions, timing) | `powershell` | one-off probes, not part of any test or script run |
| P5 | `tools/recorder.ps1` | one long-lived PowerShell loop, `[Diagnostics.Process]::GetProcesses()` every 2 s; `Get-CimInstance Win32_Process` + `Stop-Process` only when its governor trips (by a looser rule: any node/powershell whose command line matches `tcb-build`) | the machine recorder. One process, not per call. Its governor kills by name match, not by proven identity; noted, outside this task |

`tcb/scripts/selftest.mjs` and `tcb/scripts/guard-hook.mjs` are leftover copies of the old layout (the tests assert that
`tcb/scripts/<n>.mjs` is not the grammar any more). They have the same call sites (selftest 666, 890, 1117) and are
never run in the flat layout; they only double the grep counts.

### 1.2 Other Windows helper programs

| # | File:line | Program | When |
|---|---|---|---|
| T1 | `tcb/lib.mjs:2893,2919` (`killOwnTree`) | `C:/Windows/System32/taskkill.exe /PID n /F` (absolute path, never `/T`), by `spawnSync` | only for a verified own child, leaf first. Reached by `tcb/selftest.mjs:730` (`killCase`, only when a case exceeds `--case-timeout-ms`) and by lib.test T87/T88 |
| T2 | `tools/lane.mjs:88` | `taskkill.exe /PID <child> /T /F` by `spawnSync`, **no timeout** | at a lane command's timeout, in the timer callback |
| T3 | `model/run-all.mjs:140` | bare `taskkill /PID n /F` by `spawnSync`, no timeout | in the 2-second guard tick, for every live part that outlived `WALL_MS + 10 s`; repeated every tick until the child is gone |
| T4 | `model/run-resumable.mjs:317` | `tasklist /FO CSV /NH /FI "IMAGENAME eq node.exe"` by `execFile`, timeout 15 s | every `POLL_MS` = 5 s while workers run (12 starts a minute for hours); reads working sets of its own children. Measured in the evidence file (87 ms each, no growth of the 360 service) |
| T5 | `model/run-resumable.mjs:298` | `tasklist /FI "PID eq n"` | once at start, only when the runner lock names a live pid |
| T6 | `tcb/fsck.mjs:333`, `tcb/selftest.mjs:662`, tests `commit`/`fsck` | `git` | git is measured as harmless in the evidence file; listed for completeness |
| T7 | `tcb/watch.mjs:686,844`, `e2e/run-e2e.mjs:76`, all test runners | `node` | harmless in the evidence file |

`wmic`, `cmd /c`, `net`, `wevtutil` and `systeminfo` are not started anywhere in the frozen copy.

Observation on T2 (not asked, but it matches interruption 3): the 05:11:19 and 05:11:58 lane commands logged `timeout`
at 300 s and **no `end`**. `lane.mjs:88` runs `taskkill` with `spawnSync` and no timeout inside the timer callback; if
process creation stalls, the lane's event loop blocks there and never writes `end`. That is consistent with the log, not
proof. A `timeout:` on that call (and on T3) is a one-line change.

## 2. Which exported functions reach P1, and who calls them with the real reader

Library (tcb/lib.mjs), by line:

- `realProc()` 2755: the factory. `.list()` 2762 -> text PS_LIST; `.alive(pid, start)` 2790 -> `psOne`; `.boot()` 2803 ->
  PS_BOOT (cached; `list()` also fills the cache, so list-then-boot is one start).
- `acquireLock` 1282 / `withRunLock` 1463 (also `watcher.lock`): call `proc.alive` at 1321 only after the same holder was
  seen unchanged `min(LOCK_JUDGE_AFTER = 50, retries)` times (about 5 s at default retries, retries+1 sightings in the
  tests that set 3). A free lock, or a lock released within about 5 s, costs **no** start. One verdict per holder per call.
- `killOwnTree` 2892: `proc.list()` 2899, then `proc.alive` 2915 once per process before each `taskkill` (n + 1 starts
  for n processes, plus the caller's own list).
- `edgeFacts` 407: `proc.boot()` only when a `proc` is passed (only `replace.mjs:1046`, modes `fence`/`bind`, and only
  without `--boot`).
- `selfInfo` 1171: no start (own clock since the 03:50 "lib:harden"). `slotCount`, `attemptProcesses`, `descendants`,
  `aliveFromQuery`, `sameStartTime`: pure, they only consume a list.

Scripts that build `lib.realProc({exe: th.get('proc_exe')})` (the real reader; the exe comes from `thresholds.json`
`proc_exe` = the real powershell.exe in the shipped file and in the fixtures of 16 test files):

| Script (line) | When it really starts PowerShell | Starts per run |
|---|---|---|
| admit.mjs 561-562 | `check`, after the task lookup and `readTasks` (errors before that cost none) | 1 |
| status.mjs 560 / 613 / 669 | list at :200 (build, `--reconcile`, `--endturn` at :616); `meter`, `owner`, `intent` take only the lock | 1 or 0 |
| replace.mjs 247 | list at :849 in `start`; boot at :1046 in `fence`/`bind` without `--boot` | 1 or 0 (tests always pass `--boot`) |
| stop.mjs 524 | list at :407 in `verify`, only when it gets past "waiting" (step 6) | 1 or 0 |
| handover.mjs 190, 263, 397 | list at :272 in `raise` once a drain line exists; `init`, `bind`: lock only | 1 or 0 |
| watch.mjs 711, 756, 858 | per tick: `alive(intake)` :574 when an intake pid is recorded; `spawnIntake` :695 lists to learn the new child's start time; the `--intake` run starts `status.mjs` (1 start) as one of its steps | 0 to 3 per tick; 0 with `--no-intake` |
| selftest.mjs 985, 1247 (killCase 712-730) | only when a case times out: 1 list + 1 alive per process + `taskkill` | 0 normally |
| audit 87, certify 296, check-queue 475, commit 919, compare 756, cost 989, fsck 657, gate 558, harvest 206, promote 371, protocol-freeze 474, render 130, seed 276, snap 726, tms 564, witness 409 | lock only: one `alive` when another live process holds `run.lock` | 0 (1 under contention) |
| e2e/run-e2e.mjs | runs the scripts above: admit 7, replace start 7, status 7, stop verify about 7, handover raise 1, selftest run 1 (one admit fixture) | about 30 per full run (static, from `e2e/last-run.log`) |

Test files that call the library's reader in-process: `lib.test.mjs` (T36d no start by design; T36f one; T85-T88 many),
`cost.test.mjs:789,882`.

## 3. Estimated real PowerShell starts per test file (static)

How counted: (a) test-side starts = number of call sites of the helper in P2/P3 (each call is one start); (b) script-side
starts = number of spawned script runs that reach a start in section 2 (a `run()`/`check()`/`build()` call, minus the
ones that the code shows stop earlier), each counted once; (c) lock-busy tests = one `alive` per script run
(`lock_retries` 3 makes the last sighting the judging one; waits of 3-4 s with 200-400 retries are counted 0, because
about 5 s of unchanged sightings are needed). Consistency check against the lane log: the fastest passing whole-file run
of each file (wall seconds) against `estimate x 2.1 s`. It agrees within about 25 % for lib, replace, stop, handover,
fsck, tms, cost; it does not prove the counts, because node start-up and sleeps are in the wall time too.

| Test file | Estimate | How | Fastest lane run |
|---|---|---|---|
| status | 45 (about 40 + 4) | 20 `build` + 11 `reconcile` + 11 `endturn` calls reach `list`; 3 sleepers + 1 `psStart`; held-lock test 1 | 110 s |
| replace | 30 | 17 `started()` calls (mode `start` lists) + T23 `start` 1; T24 four modes: 4 sleepers + 4 `alive` + 1 `list`; fence/bind use `--boot` (0) | 72 s |
| lib | 32 | T85 6 (1 list + 5 alive; boot is cached), T85b 2, T86 about 4, T87 about 11, T88 4, T89b 2, T36f 1, one more sleeper 1; T89 has no PowerShell (missing exe); T36d none by design | 70 s |
| handover | 20 | `raise` after a drain line: about 9 lists; T6 sleepers 2 + `psStart` 2 + 2; T13 two sleepers + 3 `alive` | 38 s |
| stop | 20 (12 to 30) | up to 21 `verify` runs, those that pass "waiting" list; 4 sleepers; T24-style busy test 2 sleepers + 2 `alive` | 40 s |
| admit | 14 to 23 | 22 `check()` calls, one list each unless the call fails before it (no-task, bad table, bad id); 1 sleeper | 30 s |
| watch | 11 | T18: three ticks without `--no-intake` = list, alive, alive + list = 4; 3 sleepers (2 via `psStart`); T16 busy 1 + dead holder 1; the `--intake` runs use stubs | 44 s |
| selftest | 6 | T5 timeout: 1 list + 2 alive; T14 `ownStartTime` 1 + 1 `alive`; the shipped fixtures list once (admit `good-check-empty`); the long wall time (270 s) is node starts, not PowerShell | 270 s |
| cost | 4 to 10 | busy-lock test: this process holds the lock, script judges it 1; concurrency test (:882) loops `withRunLock` against the script's own lock: one `alive` per failed acquire | 12 s |
| fsck | 5 | 4 `holdLock` + 1 script `alive` (only the retries 3 case judges) | 12 s |
| compare | 4 | 2 `holdLock` + score and anon each 1 `alive` under retries 3 | 19 s |
| audit | 3 | 2 `holdLock` + 1 judged run | 13 s |
| gate | 3 | 1 `holdLock` + 1 to 2 runs | 23 s |
| render | 3 | 2 `holdLock` + 1 judged run | 16 s |
| tms | 3 | 2 `holdLock` + 1 judged run | 10 s |
| certify, check-queue, commit, harvest, promote, protocol-freeze, seed, snap, witness | 2 each | 1 sleeper/`holdLock` + 1 script `alive` | 6-14 s |
| guard-hook, main-guard | 0 | no process reader | - |
| **Sum** | about 235 (range 215-265) | | |

Of these, about 45 are the tests' own direct PowerShell starts (P2, P3), which a change inside `realProc` does not touch;
about 25 are script-side `alive` verdicts on a live sleeper (identity needs a start time); about 25-30 are the real-reader
tests in lib.test; the rest are `list` calls inside script runs (admit, status, replace, stop, handover, watch, e2e).

### 3.1 What the lane log adds to claim C4 (static, counts are lower bounds)

`lane/log.jsonl` records every lane command with its command line (cut at 400 characters, so long multi-file commands
are under-counted; commands with `--test-name-pattern` are not counted at all). Applying the table above to whole-file test
runs only:

| Window (local) | Whole-file runs | PowerShell starts, at least | What the 360 service did |
|---|---|---|---|
| 04:01 - 05:04:19 | 122 | about 763 (12 a minute) | 412 -> 1,588 MB (about 1,176 MB) |
| 07:45 - 15:20:33 | 112 + 9 e2e | about 1,226 (2.6 a minute) | died at 15:20:33 |
| 05:11:19 - 05:16:58 | `commit/harvest/fsck/tms/...` and `admit + stop` started at 05:11:19 and 05:11:58 | admit + stop alone about 40 within 80 s | both ended `timeout` with no `end` |
| 15:40:03 - 16:15:13 | **none** (last lane command ended 15:40:03) | 0 from the lane | interruption 4 at 15:43:23 |

Reading, with the limits stated: the lane's own test runs would explain the 04:01-05:04 growth only if each start kept
about 1.5 MB; the post-reboot measurement gave 0.12 to 0.27 MB per start (1.1 at most in the evidence's own range). At
0.27 MB the lane starts account for about 200 MB of 1,176 MB (18 %), at 1.1 MB for about 840 MB (71 %). So "our scripts and
tests start PowerShell often enough" (C4) holds only at the top of the measured range, or with the starts the lane log
cannot see (PowerShell tool calls of the sessions and helpers, which the evidence says are numerous: `ps=15-16` alive).
For interruption 4 the lane log shows nothing running at 15:43, so there the starts cannot have come from the lane's
test runs; the model run and other sessions were not through the lane. This does not refute C4; it says the evidence for
"our tests" is partial for #4 and quantitatively thin for #3.

## 4. What each PowerShell call needs to learn

| Query | Fields | Used for |
|---|---|---|
| `list()` | per process: pid, ppid, name, exe, **cmdline**, **start_time**; plus boot | `slotCount`/`attemptProcesses` (cmdline contains the attempt folder or session id, then descendants by ppid, a child counts only when its start is not before its parent's); `status` `aliveIn` for the recorded watcher and alarm (pid + start); `stop verify` survivors (report only, kills nothing); `handover raise` quiescence; `killOwnTree` (find the child, verify start, descend); `spawnIntake` (only the new child's start) |
| `alive(pid, start)` | one process's creation time, or none | lock-holder staleness (the only guarantee against a reused pid), watch intake liveness, `killOwnTree` per-process re-match |
| `boot()` | LastBootUpTime | `replace fence/bind` boot identity (equality across calls) |

`name` and `exe` are only reported (stop's survivor line); no decision reads them. `cmdline` is what no cheap source has.
Kills happen in exactly one script path (selftest case timeout), never in stop, watch or status.

## 5. Options

Cost figures: PowerShell 2.1-2.4 s a start (evidence); a CIM query inside a running PowerShell 87 ms (evidence); anything
else is "not measured".

### (a) One long-lived PowerShell answering over stdin/stdout

- Per script run: the scripts that reach a start do it once (admit, status, replace start, stop verify, handover raise), so
  a per-run helper still costs one start (2.1 s) and gains nothing for them. It gains only for multi-query runs: `killOwnTree`
  (n + 1 -> 1), watcher ticks, lib.test T85-T88, selftest kills. Per machine: zero starts per script after the first, query
  about 90 ms.
- Changes: `realProc` gets a child process, a line protocol, a timeout and restart, an exit hook that must kill the helper
  (otherwise an orphan PowerShell per crashed script); per machine it also needs a discovery file or named pipe, an owner
  to start it after every reboot, and a fallback when it is gone. `lib.test` T85-T89b, T36m and the `PS_SCRIPTS` export change.
- Weakens: nothing about identity if the reply is fresh per query. A per-machine service that answers from a cached
  snapshot would weaken the "verified before a kill" window (Windows reuses pids fast); keep the kill path on a fresh query.
- Risk: a new long-lived process that can hang or leak, a lifecycle problem in a PC whose fault we are chasing; per-run mode
  helps almost nothing for the common single-query run.

### (b) tasklist or another program that did not grow the service

- Measured harmless: `tasklist` (87 ms), `taskkill`, `cmd`, `git`, `bash`, `node`.
- tasklist gives image name, pid, session, memory, status, user, CPU time, window title. **No start time, no parent, no
  command line.** So it can answer "a process with this pid and image exists" and nothing about identity or attempt
  matching. Since all lock holders are `node.exe`, a reused pid that is another `node.exe` passes: that **weakens the central
  guarantee** and cannot replace `list()`.
- `wmic.exe` is **absent** on this machine (checked: `C:/Windows/System32/wbem/WMIC.exe` does not exist).
- Two programs that are present and not measured: `cscript.exe` with a JScript file doing the same `Win32_Process` WMI
  query (all of pid, ppid, name, path, cmdline, creation date, plus `Win32_OperatingSystem.LastBootUpTime`; Windows Script
  Host is not disabled by policy: no `Enabled=0` under HKLM/HKCU Script Host settings), and `typeperf` on the Process
  counters (pid, creating pid, elapsed time, so start = now - elapsed; no command line).
- Cost: a WMI query is about 90 ms inside PowerShell; a cscript start is not measured (expected well under 0.5 s). Risk:
  cscript is a script host and an antivirus may treat it like PowerShell; that is exactly the open question of C4, so it
  needs the same 30-call measurement before adoption. Same data, same guarantees, same JSON shape if the script prints it.
- Changes in `tcb/lib.mjs`: `run()` and the three texts (`PS_LIST`, `psOne`, `PS_BOOT`) become one `.js` query file and an
  argument; parse WMI's `yyyymmddHHMMSS.ffffff+mmm` into the existing `...0000000Z` seven-digit form; keep exit non-zero on
  a failed query (LR-1: never print NONE or an empty list on failure); escape every non-ASCII character as `\uXXXX` so the
  console code page cannot corrupt a command line (T85b). The `proc_exe` threshold keeps its role as the seam.

### (c) Node itself

- `process.kill(pid, 0)`: liveness only. On Windows libuv answers ESRCH when no such process exists or it has exited
  (the exit code is checked), EPERM when it exists but cannot be opened. ESRCH is as exact as the PowerShell `NONE` answer.
  It cannot give start time, parent or command line, so identity ("is this the original holder or a reused pid") cannot be
  decided: **EPERM or success must still go to a real query.**
- What Node can do exactly: its own start time (already used), the start of a child it spawned (the spawner's own clock at
  spawn, later than creation by milliseconds, which the one-sided `aliveFromQuery` rule already accepts), killing its own
  child by handle (`child.kill()`, immune to pid reuse; `selftest.mjs` already falls back to it).
- Cannot: another process's start time, ppid, command line; therefore not `list()`, not `slotCount`.
- Changes: `alive()` gets an ESRCH pre-filter (a dead holder, the common case in `waitDead` loops and in intake ticks, costs
  no start); `spawnIntake` records its own clock instead of calling `list()`; test helpers P2/P3 record
  the spawn time instead of a CIM query. Weakens nothing (ESRCH is exact; the others keep today's query).
- The comment at `lib.mjs:2789` ("No process.kill(pid, 0) shortcut") was written about an `alive` of `false` while
  PowerShell is unavailable. An ESRCH-based `false` does not depend on PowerShell, so it does not contradict that reason,
  but that test (T89: `alive` is `null` with an unrunnable exe) must be kept for a **live** pid.

### (d) A small native helper

- No C or Rust compiler is installed (no gcc, cl, clang, rustc, go, dotnet SDK). The Windows .NET Framework compiler
  `csc.exe` exists (`C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe`), so a managed helper (P/Invoke:
  `CreateToolhelp32Snapshot`, `OpenProcess`+`GetProcessTimes`, `NtQueryInformationProcess` for the command line, boot time
  from `NtQuerySystemInformation`) could be built without installing anything. It would be a new binary in the trusted
  tree (hashed, rebuilt, its source reviewed).
- Cost per call: a .NET Framework start, not measured (expected tens of ms). Risk: `powershell.exe` is itself a .NET
  Framework host; if the service's growth follows CLR/AMSI starts and not PowerShell as such, this helper has the same
  problem, so it needs the same 30-call measurement. Same-user processes only for the command line (elevated or protected
  processes return access denied); an unreadable command line must read as "unknown", never "absent", to keep the slot
  count fail-safe. Antivirus may also flag an unsigned exe.
- Changes: as (b) plus a build step and a pinned hash; `proc_exe` would point at the helper and its output shape would be
  the JSON `realProc` already parses.

### Guarantees to preserve, per option

| Guarantee | (a) | (b) tasklist | (b) cscript/WMI | (c) Node | (d) helper |
|---|---|---|---|---|---|
| start time distinguishes a reused pid | kept | **lost** | kept | only for ESRCH | kept |
| stop never ends a stranger (re-match before kill) | kept if the query is fresh | **lost** | kept | child-by-handle stronger; descendants need a query | kept |
| all fields for slot counts and survivors | kept | **lost** (no cmdline, ppid) | kept | **lost** | kept (same-user cmdline) |
| unknown stays unknown (query failure -> null / proc-unavailable 2) | kept | kept | kept (exit non-zero on failure) | kept | kept |

## 6. Recommendation

**Change what `realProc` runs: replace `powershell.exe` by a `cscript.exe` JScript WMI query behind the existing
`proc_exe` seam, with the three free reductions of option (c), and gate the swap on one measurement.**

Reasons:

1. It is the only option that removes the per-call start for **all** the reads that need command lines and start times
   (about 130 of the 235 suite starts, and every real script run), not only for liveness.
2. It reads the same `Win32_Process` data that `Get-CimInstance` reads, so nothing about identity, the 2-second one-sided
   start comparison, `descendants` or `slotCount` changes. Parsing and failure rules are all in `realProc`.
3. It needs no daemon, no binary, no install, and no shared state between runs. (a) needs a process lifecycle in a machine
   that is already freezing; (b) tasklist loses identity; (d) is a build step with the same CLR question as PowerShell.
4. The three reductions need no measurement and cost nothing: ESRCH pre-filter in `alive`, own-clock start in
   `spawnIntake`, own-clock start in the test helpers. Together they remove about 55 of the 235 suite starts (the 45
   direct test-helper starts and about 10 from dead-holder loops and ticks) whatever happens to the swap.

Condition (not a detail): **the swap is not adopted until a 30-call run of the cscript query shows no growth of the 360
service**, with the same protocol as the evidence file's table (pause 4-5 s, read private bytes and handles, one run each,
then a 20-call repeat). If it grows like PowerShell, the fallback is a snapshot written by the already running recorder
(one long-lived PowerShell, once per machine): `list()` and `alive()` read the file and return unknown (proc-unavailable 2,
null) when it is older than a few seconds; the kill path in selftest stays on a fresh query or on `child.kill()`.

What this does not fix: the PowerShell tool calls of Claude sessions and helpers, the model run's `tasklist` every 5 s
(harmless by measurement), and any cause other than the antivirus service. It also says nothing about memory; the audit
did not look at memory.

### Tests that would have to change

Free reductions (independent of the swap): the direct start-time reads in the helpers `holdLock` (audit, certify,
check-queue, commit, compare, fsck, gate, harvest, promote, protocol-freeze, render, seed, tms), `spawnSleeper` (admit,
replace, stop, lib, handover, status, watch), `psStart` (handover, status, watch), the sleeper reads in snap and witness,
`ownStartTime` in selftest.test; lib.test `waitDead` loops (T86, T87) keep a real `alive` for the live case only.

For the swap: `lib.test.mjs` T36m (asserts the three PowerShell texts start with `$ErrorActionPreference='Stop'`),
T85, T85b, T86, T87, T88 (real reader against real processes: still valid, now through the new query),
T89 (unrunnable exe -> `list` throws `proc-unavailable` 2, `alive`/`boot` null: keep), T89b (a failed CIM query must exit
non-zero: rewrite for the new script's failure path), T36d/T36e/T36f (no subprocess on the free path; judged-after-N;
real stale lock: keep). The `proc_exe` value is hard-coded as the real powershell.exe in the threshold objects of audit,
certify, check-queue, commit, compare, fsck, gate, harvest, promote, protocol-freeze, render, seed, snap, tms, witness
(`proc_exe: PS_EXE`), in the copies made by admit/replace/stop/handover/status/watch from `tcb/thresholds.json`, in
`tcb/thresholds.json` itself, and in `cost.test.mjs:789,882`; `stop.test.mjs:644` (`no-such-powershell.exe`) stays valid.
If `realProc` picks the query by the basename of `proc_exe`, the old values keep working and the files can move over one at a
time. `selftest.test.mjs` T5 (timeout kill) and `lib.test` T87/T88 (`taskkill` order, absolute path, never `/T`) do not
change; their listings only get faster. Delete `tcb/scripts/selftest.mjs` and `guard-hook.mjs` (old layout) so they stop
appearing in audits.

## 7. Not checked

- No run, no measurement of cscript, typeperf or any .NET helper; their cost and their effect on the 360 service are open.
- Whether `cscript.exe` is blocked by 360 or by AppLocker-style policy beyond the registry keys read.
- Whether `process.kill(pid, 0)` on this Node/Windows build returns ESRCH exactly as libuv's source says (read from
  knowledge of libuv, not tested here).
- The per-file counts are from code; where a test's loop count depends on data they are ranges. The lane-log windows use
  whole-file runs only and command lines cut at 400 characters.
- Whether other sessions' PowerShell tool calls, not visible in any file I read, are the larger source.
