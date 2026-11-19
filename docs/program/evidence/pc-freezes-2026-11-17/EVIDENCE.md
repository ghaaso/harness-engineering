# PC freezes of 2026-11-17: the evidence, and the chain of claims to attack

Written by the main coordinating session at about 16:15 local time (UTC+5) on 2026-11-17, right after the
fourth interruption of the day. Facts first, each with where it comes from. The claims are at the end.
Nothing here is settled: two readers are asked to refute it.

## The machine

- Windows 11 Pro 10.0.26200, Ryzen 9 7900X (12 cores, 24 threads), 31.9 GB RAM, Node 24, Windows PowerShell 5.1.
- Antivirus: 360 Total Security. Windows Defender is off.
  - Service `QHActiveDefense` ("360 Total Security"), program
    `C:\Program Files (x86)\360\Total Security\safemon\QHActiveDefense.exe`, file version 10,0,0,1230.
    PE header read directly: machine 0x014C (32-bit x86), large-address-aware flag **not** set.
  - Kernel drivers running: `360FsFlt` (360 Total Security), `360AvFlt` (file monitoring), `360Box64`,
    `360netmon`, `disproc` (`360disproc64.sys`, file protection, built 2021-10-15; Windows logs at boot
    that it "does not support bypass IO"). Stopped: `360AntiHacker`, `360Camera`, `360elam64`.
  - Other 360 processes: `QHSafeTray`, `QHWatchdog`.
- A recorder (`research-tree/tools/recorder.ps1`, one long-lived PowerShell) writes a line every 2 s,
  flushed to disk, to `<build folder>/lane/recorder.log`
  (build folder = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build`).
  - Old format (03:11 to 07:34): `HH:mm:ss free=<MB> commit=<%> cpu=<%> diskq=<n> procs=<n> node=<n> ps=<n> top=<name:MB,name:MB,name:MB>`
    (top three processes by working set).
  - New format (12:07 on): `HH:mm:ss free=<MB> cpu=<%> procs=<n> node=<n> ps=<n>`. No `top=` field.

## The four interruptions of 2026-11-17

| # | When | What the owner saw | Machine record |
|---|---|---|---|
| 1 | stall from about 01:20, reset 01:42 | PC stalled, hard reset | none (no recorder yet). Kernel-Power 41 at 01:44:07 |
| 2 | stall from 02:34, restart 02:55 | "every process crawled" for about 20 minutes | none. Kernel-Power 41 at 02:55:53 |
| 3 | about 05:12 | found in the morning: the coordinating session had stopped; PC reset about 07:35 to 07:44 | recorder ran throughout. Kernel-Power 41 at 07:44:47 |
| 4 | 15:43 | "Claude isn't responding ... end process or keep waiting"; restarted the PC | recorder ran to 15:45:34. Kernel-Power 41 at 15:45:56 |

## Interruption 4 (15:43), from the records

- Load before it: a model-checking run with 16 worker processes (node), two other sessions with helpers,
  this session's own checks. Recorder per-minute means: 15:38 to 15:42 cpu 86 to 93 %, least free memory
  14,187 to 17,161 MB, node 17 to 21, powershell 15 to 16, total processes 332 to 377.
- 15:43:23: this session issued a Bash tool call (a `grep` over a few files). It never returned; after
  the reboot the harness recorded "Tool call interrupted".
- 15:43:24: another session's helper wrote `model/as-built/model.mjs` (last file it wrote).
- 15:43:26: the model run wrote its last result file and its last summary. Parts finished per minute:
  139, 117, 105, 117 for 15:39 to 15:42, then 65 in 15:43, then none.
- Recorder: `15:43:23 cpu=87%`, `15:43:43 cpu=3%`, then 1 to 6 % until its last line
  `15:45:34 free=19281 cpu=5% procs=343 node=17 ps=15`. node stayed 17 and powershell 15 throughout;
  total processes rose slowly from 320 to 343; free memory rose to 19.3 GB.
- Windows System and Application logs hold **no event at all** between 15:43:00 and 15:45:50.
- `Microsoft-Windows-WMI-Activity/Operational`, 15:15 to 15:46: 821 events (5858 x 812, 5857 x 9). The
  5858 errors come about every 2 s from one client (process 37480, user NETWORK SERVICE) and continue
  through 15:45:06. `Perflib` 1008 at 15:31:21 ("WmiApRpl ... The device is not ready"), the second the
  recorder was restarted.
- Earlier the same afternoon: `Service Control Manager` 7034 at **15:20:33**: "The 360 Total Security
  service terminated unexpectedly. It has done this 1 time(s)." `SecurityCenter` 15 at 15:20:39: "Updated
  360 Total Security status successfully to SECURITY_PRODUCT_STATE_ON" (so it was running again 6 s later).
- `Application Hang` 1002 for ChatGPT.exe (15:34:13), chrome.exe (15:34:23), SystemSettings.exe (15:34:31):
  the owner ended those programs himself at that time to free memory.
- Boot: 15:45:54. Kernel-Power 41 (no bugcheck code). EventLog 6008 names 15:11:45 as the previous
  shutdown time, which is not the real time (the machine was demonstrably alive until 15:45:34).

## Interruption 3 (about 05:12), from the records

- Recorder, old format, one line per 30 s (all lines are in the log):
  `05:03:30 free=17235 cpu=6% procs=313 node=14 ps=2 top=QHActiveDefense:1562,claude:759,ChatGPT:625`,
  `05:04:01 ... top=QHActiveDefense:1580,...`, `05:04:31 free=18774 ... top=claude:783,ChatGPT:626,claude:426`.
- `Service Control Manager` 7034 at **05:04:19**: the 360 service terminated unexpectedly. `SecurityCenter`
  15 at 05:04:26: status ON again.
- The 360 service's working set in the `top=` field: not in the top three before 04:01; 412 MB at
  04:01:14; 520 (04:05), 578 (04:10), 609 (04:20), 624 (04:25), 728 (04:30), 865 (04:35), 1,084 (04:40),
  1,225 (04:45), 1,362 (04:50), 1,465 (04:55), 1,558 (05:00); **1,588 MB at 05:04:19**, its highest value
  and the second Windows logged its death. After 05:04:31 it is not in the top three again (so under about 430 MB).
- From 05:04 to 05:12 work went on (cpu 3 to 14 %, node 4 to 15). From `05:13:04` cpu is 1 to 3 % with
  node=14 constant; the node count then falls slowly (13, 12, 11 by 05:28, 05:35, 05:56).
- The lane log (`<build folder>/lane/log.jsonl`): commands started at 05:11:19 and 05:11:58; both logged
  `timeout` after 300 s (05:16:19, 05:16:58) and **no `end` line** (the lane's timeout handler starts
  `taskkill` synchronously and logs `end` when the child exits); a waiting lane process logged `busy`
  at 05:27:04.
- No `WMI-Activity` event between 05:00 and 05:20.

## The 360 service's deaths and the unclean restarts, last 75 days

- `Service Control Manager` 7034 for the 360 service: exactly three: 2026-11-06 13:42:32, 2026-11-17
  05:04:19, 2026-11-17 15:20:33.
- Kernel-Power 41 (unclean restart): 52 in 75 days. On 2026-11-06: 00:18:04, 15:13:10, 20:14:04.
  On 2026-11-17: 01:44:07, 02:55:53, 07:44:47, 15:45:56. None of the others has a 360 service death in
  the 90 minutes before it.

## Measurements made after the reboot (16:00 to 16:10), antivirus service freshly started

Each step was followed by a pause of 4 to 5 s before reading the service's counters (`Get-Process`,
private bytes, working set, handle count). One run each. Step-to-step noise is about +-2 MB.

| Step | Time | Private bytes | Handles |
|---|---|---|---|
| idle 10 s | 10 s | +0.1 MB | -1 |
| 400 x `cmd /c exit` | - | +0.3 MB | +9 |
| 100 x `node -e "0"` | 6 s | +0.0 MB | -4 |
| 40 x `powershell -NoProfile -NonInteractive -Command "1"` | 86 s (2.15 s each) | **+10.6 MB** | **+731** |
| 10 x `powershell -NoProfile -Command "Get-CimInstance Win32_Process"` | 24 s (2.4 s each) | **+10.6 MB** | **+168** |
| 400 new `.mjs` files, 20 KB each, all different | <1 s | +0.2 MB | 0 |
| 100 x `node <a different new file>` | 6 s | -0.5 MB | 0 |
| `git init`, `add`, `commit` of the 400 files | 1 s | +2.4 MB | -4 |
| 400 new `.txt` files | <1 s | +0.5 MB | 0 |
| delete all of it | 1 s | +0.0 MB | 0 |
| 30 x `cmd /c ver` | 0.9 s (31 ms each) | +1.41 MB | +2 |
| 30 x `tasklist /FO CSV /NH /FI "IMAGENAME eq node.exe"` | 2.6 s (87 ms each) | -0.55 MB | 0 |
| 30 x `tasklist /FO CSV /NH` | 8.8 s | -0.18 MB | 0 |
| 30 x `Get-CimInstance Win32_Process` inside one running PowerShell | 2.6 s | 0.00 MB | -5 |
| 30 x `Get-Process` inside one running PowerShell | 0.2 s | 0.00 MB | -1 |
| 30 x `bash -c true` | 1.1 s (37 ms each) | -2.21 MB | 0 |
| 30 x `git --version` | 1.5 s (49 ms each) | -0.18 MB | 0 |
| 10 x `taskkill /PID <none> /T /F` | 1.2 s | +1.30 MB | 0 |
| 20 x `powershell -NoProfile -NonInteractive -Command "1"` | 41.4 s (2.07 s each) | **+3.21 MB** | **+313** |
| 10 x `powershell -NoProfile -NonInteractive -NoLogo -Command "exit"` | 21.8 s (2.18 s each) | **+1.20 MB** | **+178** |

The service went from 124.0 MB private at the start to 150.7 MB at the end (same process id 4764), and
did not fall back between steps.

## Where our own work starts PowerShell

- `tcb/lib.mjs`: one PowerShell call site that runs `Get-CimInstance` (the process reader used to judge
  another process: alive, start time, descendants); also `taskkill`. `tcb/selftest.mjs`: one PowerShell
  call site. `tools/lane.mjs`: `taskkill` on a timeout. The model runner uses `tasklist` only.
- Every PowerShell tool call of a Claude session or helper starts a new `powershell.exe`.
- A first draft of the scripts called PowerShell on every script start (2.3 s each); that was removed
  at about 03:50 on 2026-11-17 ("lib:harden": 2,292 ms to 73 ms per start). Tests that judge other
  processes still call it.

## What is not known

- What exactly blocked at 15:43:23 and at about 05:12. No crash dump exists; nothing was logged.
- Whether the 360 service's memory was high before its death at 15:20:33 (the new recorder format has
  no `top=` field).
- Anything about the state of the antivirus before interruptions 1 and 2 (no recorder then).
- Whether a trivial PowerShell start is slow (2.1 s) because of the antivirus or for another reason.
- The cause of the other 48 unclean restarts of the last 75 days. An earlier diagnosis (2026-11-14)
  named memory over-commitment (many sessions, an uncapped WSL machine, an orphaned emulator) and TCP
  port exhaustion (Tcpip 4231) as leads.

## The chain of claims (attack these)

- **C1.** At 15:43:23 to 15:43:26 new work stopped across unrelated programs at once while the machine
  stayed alive. It was not a shortage of memory, not a dead disk, and not processor saturation at that moment.
- **C2.** The same signature occurred at about 05:12 the same day.
- **C3.** The 360 service is a 32-bit program without the large-address flag, so it cannot use more than
  about 2 GB. On the morning of 2026-11-17 it grew to 1,588 MB and terminated because it reached that ceiling.
- **C4.** What makes it grow on this machine is PowerShell process starts (about 0.1 to 1.1 MB and about 17
  handles kept per start, never released). Other program starts, file creation, git, tasklist, and process
  queries made inside an already running PowerShell do not. Our scripts, tests and tool calls start
  PowerShell often enough to explain the growth seen (about 19 to 27 MB a minute).
- **C5.** The system-wide block follows the service's death and restart (8 minutes after it at 05:04,
  23 minutes after it at 15:20). The mechanism of the block is not observed.
- **C6.** Therefore removing 360 Total Security, or no longer starting PowerShell in bulk, would prevent
  this kind of freeze. Interruptions 1 and 2 and the 48 other restarts are **not** shown to share this cause.

## Addendum, 16:27 on 2026-11-17: the owner uninstalled 360 Total Security during this check

Read this before judging C4 and C6. These facts were measured by the coordinator at 16:25 to 16:26.

- The owner ran the uninstaller at about 16:24, without restarting the PC (last boot is still 15:45:54).
  `Service Control Manager` 7034 at 16:24:39: the 360 service terminated. The services `QHActiveDefense` and
  `QHProtected` are now Stopped and Disabled. Still present until a restart: the kernel drivers `360FsFlt`
  (Running, its file path already empty), `360netmon` and `disproc` (Running); a process named
  `QHActiveDefense` with a new process id (40312) and five `WebViewHost64` processes from the 360 folder;
  42 files in the 360 program folder.
- Windows' own protection is on: Security Center lists only Windows Defender (state 0x61100);
  `Get-MpComputerStatus` reports the service enabled, antivirus enabled, real-time protection on,
  behaviour monitor on, running mode Normal.
- **A PowerShell start now takes 151 to 160 ms** (five starts of `powershell -NoProfile -NonInteractive
  -Command "1"`), against 2,070 to 2,180 ms measured half an hour earlier with 360 active.
- **The measured test run** (`suite-profile.txt` in this folder; the clean copy of the scripts, one test file
  at a time, the service's counters read by one PowerShell start after each file) ran from 16:15:10 until
  the uninstall cut it short. Over the 17 test files before the uninstall the service's private memory
  rose from 157.1 MB to 271.1 MB (+114 MB in under 9 minutes, about 6.7 MB per test file), while its handle
  count rose only from 2,936 to 3,129 (+193, about 11 per file, which is less than the one PowerShell start
  per file that the reading itself made, at about 17 handles each). Several test files added 4 to 6 MB with
  no handle change at all (certify, check-queue, cost). In the same minutes the agents of this check made
  9 logged PowerShell calls. **So the test suite makes the service grow by something other than PowerShell
  starts**, which C4 does not say; what it is was not identified before the antivirus was removed.
  The rate (about 13 MB a minute with one command at a time) is of the size seen that morning (19 to
  27 MB a minute with two commands at a time).
- After the uninstall the service's object of study is gone: C4 cannot be measured further on this PC.

## Addendum 2, 16:32: the measured test run ended; test durations with and without 360

`suite-profile.txt`: all 26 test files ended with exit 0. The uninstall began during `replace` (about 16:24).
Seconds per test file, same clean copy of the scripts, same lane, one file at a time:

| Test file | 15:07 run (360 active) | 16:15 run | Ran after the uninstall |
|---|---|---|---|
| status | 151 | 40 | yes |
| replace | 117 | 28 | during it |
| stop | 51 | 16 | yes |
| watch | 72 | 52 | yes |
| snap | 16 | 11 | yes |
| tms | 17 | 11 | yes |
| seed | 15 | 8 | yes |
| witness | 9 | 5 | yes |
| selftest | 275 | 258 | started as it began |
| the 17 files before it | 25 to 85 each | within 1 to 9 s of the first run | no |

The seven files that ran wholly after the uninstall took 393 s against 591 s. The tests that judge other
processes through PowerShell (status, stop, replace) became three to four times faster. One run each;
the 15:07 run had a 16-worker model run beside it from 15:29, the 16:15 run had the agents of this check.
