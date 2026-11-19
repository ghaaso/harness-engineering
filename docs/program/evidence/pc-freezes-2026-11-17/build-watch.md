# build:watch - the antivirus watcher (av-watch.ps1), 2026-11-17 16:19 to 16:29

Script: `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build/tools/av-watch.ps1`
(Windows PowerShell 5.1, ASCII, parses with no errors). Test logs: `watch-test/a`, `bc`, `de`, `f`, `g`, `h` beside this file.

## Read this first: the 360 service crashed during test (d/e), at 274 MB

Verified from the event logs and the watcher's own lines:

- 16:24:04 the service (pid 4764) had 274 MB private, 296 MB working set, 3,157 handles, 675 MB virtual size.
  16:24:06: 173 MB private (a drop of 100 MB between two lines 2 s apart).
- 16:24:10 System, Kernel-General 16: the access history of the hive `...\360\Total Security\ipc\filecache\FileCache.dat` was cleared.
- 16:24:15 Application Error 1000: `QHActiveDefense.exe` 10.0.0.1230, faulting module `CrashReport.dll` 7.0.0.1080,
  exception 0xc0000005, fault offset 0x00011427, process id 0x129C (= 4764).
- From 16:24:16 a second `QHActiveDefense` process (40312) is listed; WerFault (16340) was running.
- 16:24:34 to 16:24:38 System 7040: Windows changed the start type of the Defender services to auto/boot start;
  16:24:35 on, SecurityCenter 15: Windows Defender ON.
- 16:24:39 Service Control Manager 7034: the 360 Total Security service terminated unexpectedly.
- At 16:25:12 and 16:27:55 the only `QHActiveDefense` listed was 40312 with 0 threads and 0 handles (exited).
  At 16:29:08 (tasklist) no `QHActiveDefense`, `QHWatchdog` or `QHSafeTray` runs at all; `MsMpEng` (Defender) runs.
  So the 360 service has not come back, unlike at 05:04 and 15:20 when it was back within 6 to 7 s. Not touched by me.

What this does to the claims (inference, for the coordinator to weigh):
- C3 says the service terminated because it reached its 2 GB ceiling. This termination came at 274 MB private /
  675 MB virtual, through an access violation inside 360's own crash-report module. So at least one death of the
  service today was not at a memory ceiling.
- A search of the Application log (75 days, ids 1000/1001/1002/1026, message matching `QHActiveDefense|360`)
  found an Application Error 1000 for `QHActiveDefense.exe` only at 16:24:15. The deaths at 05:04:19 and 15:20:33
  today and on 2026-11-06 left no Application Error event (how they ended is not recorded there).
- The same search found WER 1001 `RADAR_PRE_LEAK_WOW64` for `QHActiveDefense.exe` 10.0.0.1230 on
  **2026-11-01 01:46:05**: Windows' own leak detector flagged the service as leaking memory.
- Whether my test caused the crash: not shown. In the 15 s before it my test had started one powershell.exe
  (16:24:00), the watcher's cmd.exe probe every 2 s, one 35-s file probe, and a second in-process copy at 16:24:08.
  The coordinator's measured test-suite run was going at the same time.

## What the watcher does

One PowerShell process; no Start-Job, no child PowerShell, no WMI/CIM, no PerformanceCounter, no elevation; it stops or
changes nothing. Free memory and commit from `GlobalMemoryStatusEx`, processor from `GetSystemTimes` (kernel32), process
counts and the antivirus counters from one `[Diagnostics.Process]::GetProcesses()` snapshot per period (the data
Get-Process returns; the antivirus process is never opened). The two probes run on .NET background threads in a small
C# class compiled once at start with Add-Type (one csc.exe run). Lock: `<log>.lock` held open for writing for the whole
run, holding the pid; Windows drops the handle if the process dies, so a stale lock file never blocks.

Line, every period (default 5 s), written with FileOptions.WriteThrough:

    HH:mm:ss lag=<ms> free=<MB> commit=<%> cpu=<%> procs=<n> node=<n> ps=<n> wer=<n> av=<pid>/<privMB>/<wsMB>/<handles> av_vm=<MB> start_ms=<v> file_ms=<v>

`av=none`, or `none(<pid>:exited)` when only an exited QHActiveDefense is still listed; `+<n>more` when several live
ones exist. `<v>` = ms of the probe that finished since the previous line, `-`, `BLOCKED:<s>`, or `ERR:<type>`.
Events: `EVENT: <name> ... t=HH:mm:ss` for START, STOP, AV-RESTART old= new=, AV-GONE last=, AV-PROCS now= was=,
AV-WARN (private >= -WarnMb 1000, or virtual >= -WarnVmMb 1700; at most once a minute; also writes AV-WARNING.txt),
BLOCK <kind> since=<s>s (at 15 s and every 15 s after), UNBLOCK <kind> after <s>s, LATE, ERROR, STALE-STOP-FILE.

Fix made after the crash: the first version picked the exited process 40312 as the service and logged
`AV-RESTART old=4764 new=40312` with counters 0/0/0. A listed process with 0 threads or 0 handles is now treated as
exited, so that case gives AV-GONE (tested in g and h).

## Tests (10 powershell.exe started in all: 9 tool calls, 1 background copy in d/e)

(a) 60 s, period 2 (first version, before the wer/av_vm fields): 31 lines 16:20:05 to 16:21:04, lag 1 to 26 ms.
First `16:20:05 lag=6 free=17262 commit=39 cpu=38 procs=318 node=6 ps=5 av=4764/224/247/3100 start_ms=- file_ms=-`,
last `16:21:04 lag=11 free=17182 commit=40 cpu=10 procs=315 node=4 ps=6 av=4764/231/254/3109 start_ms=49 file_ms=1`.
WMI-Activity: 5858 events came only from client pid 34636 (svchost, NETWORK SERVICE), 37 in the 81 s before the run and
22 in the 62 s during it. A watcher that caused one per sample would have added about 31. The recorder's log has no
line after 15:45:34, yet the 5858 stream goes on (whether a recorder writes elsewhere: not checked).

(b) slow start probe (ping.exe -n 25) and slow file probe (+20 s), period 2: lines kept coming every 2 s, lag 1 to 15 ms:
`16:21:55 ... start_ms=BLOCKED:15 file_ms=BLOCKED:15`, `EVENT: BLOCK start since=15s t=16:21:55`,
`EVENT: BLOCK file since=15s t=16:21:55`, `16:22:01 ... file_ms=20005`, `EVENT: UNBLOCK file after 20.0s t=16:22:01`,
`16:22:05 ... start_ms=24343`, `EVENT: UNBLOCK start after 24.3s t=16:22:05`. Repeat at 30 s, from (d/e):
`EVENT: BLOCK file since=15s t=16:24:18`, `EVENT: BLOCK file since=31s t=16:24:34`, `EVENT: UNBLOCK file after 35.0s t=16:24:38`.

(c) -WarnMb 100: `EVENT: AV-WARN priv=239 ws=262 handles=3148 pid=4764 warn_mb=100 t=16:21:39`, again
`EVENT: AV-WARN priv=247 ... t=16:22:41` (62 s later, none in between); AV-WARNING.txt written (three sentences).

(d) second copy on the same log, run 8 s after the first (pid 38840) started: it returned in 42 ms with
`av-watch: another live copy (pid 38840) already writes ...\watch-test\de\av-watch.log; this copy (pid 39256) exits.`

(e) stop file written 16:24:42.573; the copy logged `EVENT: STOP reason=stop-file pid=38840 t=16:24:44` and had exited by
16:24:44.560. powershell.exe before: `13304 21924 22488 24308 33612 39256`; after: the same six (39256 was the tool
call itself). The lock file was left behind that time (deleting it failed silently; now retried for 3 s; f, g and h
show it removed). tasklist at 16:29:08: none of my pids, no PING.

(h) event logic, watching ping.exe in place of the service (-AvName PING, probe = ping -n 4):
`EVENT: AV-GONE last=41056`, `EVENT: AV-RESTART old=41056 new=37580`, `EVENT: AV-PROCS now=37580 was=-`,
`EVENT: AV-WARN ... on=vm ...`. (For a 64-bit process the virtual size is about 2 TB; for the 32-bit service it read
630 to 678 MB. That it equals the service's use of its 2 GB address space is not checked.)

Side observations (one sample each, conditions differ): start_ms was 47 to 67 ms with 360 running and 20 to 28 ms
after it was gone (Defender on). At 16:19 appending to a file the same call had just written failed with "being used by
another process" 10 times out of about 51 (one redirection, nine Out-File appends); cause not checked.
