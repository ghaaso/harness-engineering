# build:watch2 - the extended watcher (pc-watch.ps1), 2026-11-17 17:23 to 17:45

Script: `watch/pc-watch.ps1` (Windows PowerShell 5.1, ASCII, 0 parse errors). Built from `av-watch.ps1`, which is
untouched and still running as pid 24244. Test logs: `watch/test-build-watch2/{smoke,a,b,cg,f}/pc-watch.log`.
All timings were taken while two other sessions ran a heavy model run (cpu=79 to 100 % on every line).

## What changed against av-watch.ps1

- **One system snapshot per period, no process opened.** All process and thread data now come from one
  `NtQuerySystemInformation(SystemProcessInformation)` call (class 5) in the compiled C# class, parsed with
  `SYSTEM_PROCESS_INFORMATION` (256 bytes) and `SYSTEM_THREAD_INFORMATION` (80 bytes); both sizes are checked
  at every call and printed in the START line (`spi=256 sti=80`). This is the call `Process.GetProcesses()` makes
  inside, but it also gives the parent id and the creation time without opening a process. The main loop no
  longer touches `System.Diagnostics.Process` at all. Cost under load: query_ms 14 to 15 (once 70).
- **-WatchName** (default empty) replaces the fixed antivirus name. Empty: no `av=`/`av_vm=` fields, no AV-* event,
  no warning file. Set: the old av fields and events; the warning file is now `WATCH-WARNING.txt` with neutral text.
- **Line** gains `thr=` and `hdl=` (threads and handles of all programs, from the same snapshot).
- **NEW line** after the period line when programs appeared since the previous snapshot (key: pid and creation
  time, so a reused pid counts as new): `NEW: <name>:<pid><<ppid>:<parent name> ...`, oldest first, at most 30,
  then `+<n> more`. Parent name `?` = parent not listed (exited) or created after the child (pid reuse). The
  watcher's own descendants (probe programs and their conhost) are left out.
- **SNAPSHOT block** when the start probe is BLOCKED for 15 s, at 60 s into the same block, and at its UNBLOCK
  (each block can give three; at most `-MaxSnapshotsPerHour` 12, after which `EVENT: SNAPSHOT-SKIPPED ... cap=12/h`,
  my addition to bound the log). It is built from the same snapshot as the period line, after the line is written,
  in one `Write` call, with a 500 ms build budget (`truncated=time` if hit) and a 250-line cap. Sections:
  (a) `self` + one line per watcher thread (`main`, `probe-start`, `probe-file` marked);
  (b) `probe start phase=... child=... create_ms=... tid=...`, `probe file running=...`, then one `child` line per
  descendant of the watcher (all threads up to 20, `probe-child` marks the probe's own program);
  (c) `recent` lines, programs created in the last 10 minutes, newest first, first three threads, as many as fit;
  (d) `sys <name> n= thr=` with a count per state/wait reason for csrss, lsass, services, MsMpEng, NisSrv,
  explorer, conhost, svchost, claude; (e) `totals`. Followed by `EVENT: SNAPSHOT-COST query_ms build_ms write_ms bytes`.
- **Probe phase.** The start probe records `in-start` before `Process.Start` (CreateProcess), `wait-exit` once it
  returned (with the child pid and `create_ms`, the time Process.Start took), `done`/`error`. BLOCK lines for the
  start probe now carry `phase=` and `child=`; UNBLOCK carries `create_ms=`. A real blocked start should read
  `phase=in-start child=-1`; a started program that does not end reads `phase=wait-exit child=<pid>`.
- **SLOW**: `EVENT: SLOW start=<ms> create_ms=<ms> slow_ms=2000` when a start probe took over -SlowMs and was not
  blocked, at most once a minute.
- Stop file `pc-watch.stop`, probe folder `pc-watch-probe`, lock `<log>.lock`: different names from av-watch, so
  the two can run side by side in the same folder.
- New probes are started after the period's writes (so an UNBLOCK snapshot describes the probe that ended).

Kept: one PowerShell process, no child PowerShell, no WMI/CIM/PerformanceCounter, no elevation, stops or changes
nothing, WriteThrough + AutoFlush per line, probes on background threads, the lock, the stop file, -Hours, LATE.

## Tests (what I ran and saw)

PowerShell processes I started: 7 (1 parse check, 1 smoke run of 22 s, 5 test watchers a, d, b, cg, f).
At most 3 of mine ran at once (f, a, d).

**(a) 90 s at -PeriodSeconds 2** (17:28:09 to 17:29:41): 45 period lines, 35 NEW lines, lag 3 to 25 ms (median 12),
start_ms 35 to 59 (median 41). First and last:
`17:28:11 lag=12 free=14893 commit=45 cpu=90 procs=390 thr=8242 hdl=170894 node=22 ps=6 wer=0 start_ms=- file_ms=-`,
`17:29:39 lag=24 free=14436 commit=46 cpu=85 procs=391 thr=8295 hdl=171363 node=22 ps=6 wer=0 start_ms=44 file_ms=3`,
then `EVENT: STOP reason=hours pid=1656 t=17:29:41`. A NEW line from it:
`NEW: node:26784<18124:node conhost:28948<26784:node tasklist:36164<18124:node conhost:30168<36164:tasklist ...`
(up to 18 entries per line in this run; the model run starts node workers every few seconds). No av fields, no
WATCH-WARNING.txt in a, b or f.

**(b) block** (probe `PING.EXE -n 75 127.0.0.1`, period 2, 17:29:52 to 17:31:35; -n 75 rather than 40 so that the
60-s snapshot also fires):
`EVENT: BLOCK start since=15s phase=wait-exit child=11988 t=17:30:09`, SNAPSHOT block15 at 17:30:09, block60 at
17:30:55, `EVENT: UNBLOCK start after 75.0s create_ms=9 t=17:31:09` + SNAPSHOT unblock, and a second block15 at
17:31:25 for the next probe. First block, shortened:

    SNAPSHOT begin reason=block15 t=17:30:09 query_ms=15
    self powershell:24268 thr=26 hdl=621
      self tid=10216 Wait/UserRequest            (23 more Wait lines)
      self tid=7160 Run main
      self tid=27408 Wait/UserRequest probe-start
    probe start phase=wait-exit phase_s=16.0 run_s=16.0 child=11988 create_ms=9 tid=27408 exe=PING.EXE
    probe file running=no
      child PING:11988 parent=24268:powershell probe-child age=15s thr=5 hdl=112 threads=29252:Wait/Delay,12596:Wait/WrQueue,11880:Wait/WrQueue,6628:Wait/WrQueue,21588:Wait/WrQueue
      child conhost:9344 parent=11988:PING age=15s thr=3 hdl=99 threads=10028:Wait/UserRequest,3956:Wait/UserRequest,18820:Wait/WrQueue
    recent node:11536 parent=18124:node age=0s thr=13 first=6268:Run,8664:Wait/WrQueue,8652:Wait/WrQueue,+10   (69 recent lines)
    sys csrss n=2 thr=34 Wait/WrLpcReceive=18 Wait/WrUserRequest=6 Wait/UserRequest=4 Wait/Executive=2 Wait/WrLpcReply=2 Wait/WrQueue=2
    sys MsMpEng n=1 thr=96 Wait/WrQueue=87 Wait/UserRequest=7 Wait/WrAlertByThreadId=1 Wait/WrUserRequest=1
    sys svchost n=86 thr=595 Wait/WrQueue=295 Wait/UserRequest=280 ...
    totals procs=389 thr=8219 hdl=170297 commit=44% free=17254MB
    SNAPSHOT end lines=112 build_ms=7 recent=69/69
    EVENT: SNAPSHOT-COST reason=block15 query_ms=15 build_ms=7 write_ms=4 bytes=10248 t=17:30:09

The child (PING 11988) is listed with its threads, its conhost below it, and the probe thread (27408) is marked.
Cost of a snapshot: build 7 ms the first time (JIT), 1 ms after; write 4 ms then 0 ms; 8.8 to 10.2 KB each; the
query (14 to 15 ms, once 70) is the period's own. Lines stayed on schedule: 51 lines, lag 2 to 17 ms; the lines
after the snapshots: `17:30:11 lag=7`, `17:30:57 lag=2`, `17:31:11 lag=16`. The unblock snapshot shows
`probe start phase=done ... last_s=75.0 child=11988` and `child none listed` (ping had ended).

**(c) SLOW** (probe `PING.EXE -n 4 127.0.0.1`, about 3.1 s; period 2; 17:31:56 to 17:34:07; 32 probes of 3,063 to
3,113 ms): `EVENT: SLOW start=3104 create_ms=7 slow_ms=2000 t=17:32:01`, then `EVENT: SLOW start=3090 create_ms=4 slow_ms=2000 t=17:33:05`
and no others (rate limit holds). No BLOCK event.

**(d) second copy**, started 10 s into (a) on the same log: printed
`pc-watch: another live copy (pid 1656) already writes <log>; this copy (pid 12444) exits.` and returned after
802 ms (most of it PowerShell's own start); (a)'s log has no line from 12444.

**(e) stop file**: run f (default settings, -Hours 1) was ended by writing `pc-watch.stop` at 17:40:02.6; it logged
`EVENT: STOP reason=stop-file pid=9548 t=17:40:07` (the next 5-s tick), exited at 17:40:07.6, and removed both the
stop file and its lock file (folder holds only the log and the empty probe folder).

**(f) bytes per hour at the default period (5 s)**, measured run 17:28:07 to 17:40:07 (12 min, under the model run):
57,758 bytes = **289 KB/h, about 48 MB for 168 h**. Of it, 144 period lines = 16,494 bytes (115 bytes/line, 82 KB/h
alone, about 14 MB a week) and 142 NEW lines = 40,555 bytes (1,765 entries, about 12 new programs per 5 s, mostly
node workers of the model run, some from my other test watchers). With the model run off the NEW share should be
far smaller (not measured). A snapshot adds about 9 to 10 KB each; at the cap of 12 an hour, at most about 120 KB/h.
The watcher's memory: 98.5 MB (tasklist, 17:35, 7 min in), the same as av-watch (99 MB).

**(g) -WatchName explorer** (same run as c): every line carries the fields, for example
`17:31:57 lag=11 ... av=9700/238/284/4874 av_vm=2104468 start_ms=- file_ms=-`; AV-WARN fired on `on=vm` (a
64-bit process has about 2 TB virtual size, as in the first build) at 17:31:57, 17:32:59, 17:33:59 (once a minute)
and WATCH-WARNING.txt was written in that test folder only.

**Left running: nothing of mine.** tasklist at 17:40:22: none of the test pids 5436, 1656, 12444, 24268, 12964,
9548 runs; no PING.EXE runs; the parse-check PowerShell ended with its foreground call. av-watch (24244) still
writes (`17:40:24 lag=29 ...`); I did not touch it, its log or its script.

## Start command (for the coordinator)

From Windows PowerShell:

    Start-Process -WindowStyle Hidden -FilePath powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','"C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\pc-freezes-2026-11-17\watch\pc-watch.ps1"','-Log','"C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\pc-freezes-2026-11-17\watch\pc-watch.log"','-Hours','168'

Stop: create `watch\pc-watch.stop` (ends within one period). av-watch and pc-watch use different stop, lock and
probe names, so they can overlap during the swap.

## Findings and limits

- **`phase=in-start` is untested.** A real blocked CreateProcess cannot be produced without changing the system;
  the hook tests only the `wait-exit` branch (a program that started and runs long). The code path differs only
  in which phase string is set before `Process.Start`.
- **Kernel stacks are not visible.** The snapshot gives each thread's state and wait reason, not what it waits on
  (no driver name, no object). If a start is stuck inside a security callback the probe thread should read
  something like `Wait/Executive` or `Wait/UserRequest` with `phase=in-start`, and the new child (if the kernel
  already lists it) shows with 0 or 1 thread in `Init` or `Wait`. Naming the driver needs a kernel dump or ETW stacks
  (both need administrator rights).
- **Short-lived programs between periods are not in NEW.** At 5 s, a program that starts and ends between two
  snapshots is never seen. A stuck one stays listed, so it will be seen.
- **If the system snapshot itself hangs during a block, the main loop stalls** and nothing is written until it
  returns (then a LATE line). The same call sat under av-watch's `GetProcesses()`; the 15:43 recorder counted
  processes through a block, which suggests enumeration keeps working, but that is not tested here.
- **Add-Type runs csc.exe once at start.** If the watcher is (re)started during a block, it will hang there before
  its first line. Starting it while starts work avoids this.
- **`start_ms=BLOCKED:<s>` below 15 s** is inherited from av-watch: a probe still running at line time shows
  `BLOCKED:1` even for a 3-s program (seen in c). Only the BLOCK event (at 15 s) means a block. Left as it was.
- **Snapshot count is capped** at 12 an hour; a block of hours gives three (15 s, 60 s, unblock). Long blocks keep
  their BLOCK lines every 15 s and the NEW lines every period.
- The `recent` section under this model run held 62 to 69 programs, mostly node workers and bash; at 250 lines it
  would cut the oldest with `recent +<n> more`.
