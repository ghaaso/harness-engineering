# Refuter notes: how Windows works (refute:internals)

Written 2026-11-17, local time (UTC+5). One of two independent refuters of EVIDENCE.md, claims C1-C6.

## How I checked

- One PowerShell call, logged in ps-calls.log. It pulled every event from every log except Security for 14 time windows, plus the file versions of the filter drivers. Output: `refute-internals-events.json` (108 logs, 8,895 events).
- Everything else was read from files:
  - files already in this folder;
  - the 2-second recorder log and the lane log;
  - the app's own logs (`%LOCALAPPDATA%\Claude\logs\main*.log`, read only);
  - two read-only registry queries (`reg query`) of the minifilter altitudes.
- The scripts are in `refute-internals-scripts/`:
  - `permin.js`: per-minute view of the recorder;
  - `growth.js`: growth regression;
  - `ev.js`: event lister;
  - `winsum.js`: per-window event summary;
  - `alt.js`: altitudes;
  - `before41.js`: what the app did before each unclean restart;
  - `stalls.js`: long app stalls and 360 deaths.
- "Verified" below means I read it in a log. "Inferred" means it is reasoning from those logs.
- No setting, process, service or file outside this folder was touched.

## Verdicts

### C1, the 15:43 stall: weakened

What holds (verified):
- The machine stayed alive.
- The recorder kept writing one line every 2 s (not every 30 s) until 15:45:34. It writes through a handle it holds open.
- Free memory was 16.6-19.3 GB.
- CPU fell from 83 % at 15:43:25 to 6 % at 15:43:31.
- The disk queue was 0.
- Event-log and WMI events (WMI-Activity 5858) kept being written until 15:45:06.

So this was not a memory shortage, not disk and not CPU.

What stopped was process creation:
- The process count was exactly 320 from 15:42:50 to 15:43:09.
- It rose by 6 at 15:43:23, the moment the Bash call hung, then by single steps to 343 at 15:45:24.
- It never fell again.
- node held at 17 and PowerShell at 15 throughout.
- So for 2 minutes 20 seconds new process objects appeared and none ran to an exit.
- In Windows a process becomes countable when it is inserted. That happens before the process-creation callbacks and before the new process loads its DLLs.
- So the hold is after insertion. That fits a creation callback, or a DLL load inside the new process. It does not fit a hold while the exe file is first opened (inferred).

What is not shown:
- "Across unrelated programs" is not shown. Everything seen to stop belongs to the Claude app's process tree: the sessions, their helpers, the model run and the app's main log.
- Chrome and ChatGPT had been closed at 15:34.
- That the stall was system-wide is therefore inferred, not observed.

### C2, the stall at about 05:12: holds

The 05:12 evidence is stronger than C1's (verified from the lane log and the recorder):
- A lane process was created at about 05:12:04. So creation still worked then.
- CPU fell at 05:13:04.
- The lane wrote its timeout lines at 05:16:19 and 05:16:58, each through a fresh file open.
- The taskkill it then started never logged an end.
- A busy line at 05:27:04, also through a fresh open, was followed by a process exit (node 14 to 13).

So file opens, directory work, opening a process and process exit all worked. Only creation did not finish:
- The process count rose from 316 to 367 between 05:13 and 07:34.
- The app fell silent at 05:12:48.
- At 05:37:31 it logged `spawn EPERM` for git: a creation that waited about 25 minutes and was then refused.

How it ended (verified):
- At 07:34:27.932 Kernel-Power 566 logged "transitioned from 4 to 6, Reason SxTransition": a sleep transition began.
- The recorder's last line is 07:34:27.
- About 10 minutes later bugcheck 0xA0 parameter 0xF0 struck, a power-transition timeout. WER bucket: `0xa0_f0_win32kbase!WmsgpSendPSPMessage`.
- The machine booted at 07:44:46.
- This was not a reset by the owner.

### C3, death at the 2 GB ceiling: not established (the size is plausible, the cause is unknown)

The size, verified from the recorder:
- Free memory jumped by 1,508 MB at 05:04:19-21 and by 1,451 MB at 15:20:31-33, the two death times.
- So about 1.45-1.5 GB of private memory was freed at each death. That includes 15:20, which EVIDENCE calls unknown.

The address space, inferred:
- build-watch saw 675 MB virtual at 274 MB private, so about 400 MB is not private.
- Virtual size at death was then about 1.85-1.9 GB of a 2 GB space.
- That is near the ceiling.

The cause, not recorded:
- There is no Application Error 1000 or WER report for 05:04, 15:20 or 11-06.
- The 360 crash during the uninstall at 16:24:15 did leave an Application Error 1000. So an ordinary unhandled crash of this service does get logged. Its absence at the three deaths suggests a deliberate exit or a kill (inferred).
- SCM 7034, rather than 7031, says only that the process ended without reporting "stopped" and that no SCM recovery action was set. QHWatchdog restarted the service within about 6 s.
- These all fit what was logged:
  - a watchdog kill at a size or heartbeat threshold;
  - a self-exit after a failed allocation;
  - a self-update or restart;
  - a crash handled by 360's own CrashReport.dll.
- 360's dump folders left with the uninstall, so this is no longer testable.

Background (verified): Windows' own leak detector (RADAR_PRE_LEAK_WOW64) flagged the service on 11-01 at 01:46.

### C4, PowerShell starts drive the growth: weakened, and its numbers do not reproduce

From the recorder, 04:02-05:04 (63 minutes, +1,165 MB, verified):

| Growth per minute against | Correlation |
| --- | --- |
| New PowerShell | 0.33 |
| New node | 0.68 |
| All new processes | 0.59 |

- Least squares, per minute: growth = -1.01 × (new PowerShell) + 1.60 × (new node) + 0.83 MB.
- With node in the model, the PowerShell term is negative.
- 04:13-04:22: many long PowerShell runs, and only 30 MB of growth in 10 minutes.
- 04:33-04:38: growth of 37-64 MB/min, with at most about 8 PowerShell starts a minute. At C4's 1.06 MB a start, that explains at most about 9 MB/min.
- An upper bound over the window: about 815 start-samples × 1.06 MB = about 864 MB, or about 220 MB at 0.27 MB.

The measurement:
- It was one run per step, in a fixed order, on a freshly started service.
- The steps were 1-3 MB, near the noise.
- Growth per start fell with repetition: 0.27, then 0.16, then 0.12 MB. That looks like a cache filling, not a fixed leak per start.

Handles:
- They rose a steady 15.7-18.3 per PowerShell start and did not fall with repetition. That is real.
- cmd also creates a console and kept only +9 handles over 400 starts, so console creation is not the driver.
- Handles are not what ends a 32-bit process. Address space is.

The coordinator's own suite:
- It grew the service by 114 MB in 9 minutes while handles rose only 193.
- So something other than PowerShell starts grows it.

"Never released" cannot be judged. The only drop seen (271 to 172 MB) came during the uninstall at 16:24:04-06.

### C5, the block follows the service's death: weakened

The same signature appears in the app log with no 360 death before it. The signature is a spawn that does not return for many minutes, an app that falls silent, and a machine that stays up.

Without a death (verified unless marked):
- 11-02 15:44-15:46: git calls time out; silence for 34 minutes; restart by the power button at 16:26.
- 11-13 20:51-22:58: a taskkill spawn blocked for 7,560 s (126 minutes), then it returned by itself. No restart and no sleep.
- 11-14 16:10-17:13: a git spawn blocked for 3,780 s, then `spawn EPERM`. Restart at 18:05.
- 11-15 02:44: a git timeout, then silence until the boot at 03:03.
- 11-17 01:26 and 02:50: interruptions 1 and 2, as EVIDENCE describes them. No long-spawn line was logged, so the signature there is weaker.

With a death in the 85 minutes before:
- 11-06: death 13:42, git timeouts 15:00-15:02, restart 15:13.
- 11-17 05:12: death 05:04.
- 11-17 15:43: death 15:20.

The tally:
- 360 died only 3 times in 56 days (SCM 7034 on 11-06 13:42, 11-17 05:04 and 11-17 15:20).
- So at least 6 of 9 blocks had no death before them.
- The death can be a co-symptom or an aggravator. It is not shown to be the trigger.

Spawn stalls after the 15:45 reboot:
- The app logged stalls of 8.5-21 s from 15:48 to 15:56 (git and taskkill).
- 360 was still installed and freshly restarted then, with no death and no growth.
- No stall of 5 s or more is logged from 15:57 to 16:42, which includes the first 18 minutes after the uninstall. That is too short to mean anything.

### C6, the recommendation: partly justified

- "Removing 360 would prevent this freeze" is a fair and cheap test, but it is not shown.
  - What fits: a creation held for minutes and then refused with access denied (EPERM) is how a security product's process-creation callback or filter behaves when it waits on its own user-mode service and then fails closed (inferred). 360 was the only third-party antivirus.
  - What is missing: nothing yet puts a 360 driver on a stuck stack.
  - The uninstall was done without a restart. 360FsFlt, 360netmon and disproc are still loaded, so the test only starts at the next restart.
- "Not starting PowerShell in bulk would prevent it" is not justified. The growth does not track PowerShell, and the blocks happen without the deaths.
- The disclaimer about the other restarts is right, and it can be made sharper (verified from the app log and Kernel-Power 41 data). Several restarts were power transitions that never finished:
  - two 0xA0 power-watchdog bugchecks with one shared bucket, one of them on 10-07 with no 360 death;
  - restarts with sleep or connected standby in progress;
  - shutdowns the app saw begin, ended hours later by the power button (10-06, 11-03 08:31).
  - The 18 restarts from 09-22 to 09-30 predate the app logs.
  - These are separate classes until shown otherwise.

## The alternatives for "new work stops, running programs and the recorder go on"

| Explanation | Fits | Against | Telling observation versus C5 | Rating |
| --- | --- | --- | --- | --- |
| A security product's kernel creation callback or filter waits on its user-mode service, without the service having died | Only creation stops; the process count climbs; EPERM after 25-63 minutes; 360 was the only third-party antivirus | Nothing yet shows a 360 driver on a stuck stack | The blocks happen with and without a 360 death (6 of 9 without). The minidump's stacks, and whether blocks continue once a restart unloads the 360 drivers | High |
| The app's main process blocked on a synchronous spawn, so the user sees "everything stopped" | The app's last line is a spawn; libuv's spawn blocks the main thread; the hang dialog | It is the spreader, not the cause: why the spawn does not return still needs a cause | The app's stall lines name the stuck task (spawn:taskkill, spawn:git) | Medium, as a contributor |
| Hung WMI | — | 5858 events were answered during 15:43-15:45; the recorder uses no WMI; spawn does not touch WMI | WMI answered while creation was stuck | Low |
| Desktop heap, handle table, port range or job-object limits | Port exhaustion (4231) once inside the 11-13 block | These fail fast with an error, they do not hang for an hour; exits still worked; no 2004 event | A wait, then EPERM, is not an exhaustion error | Low |
| csrss or conhost | Console processes are created; the end bugcheck is in win32k | cmd's console creation did not grow handles; consoles of running programs kept working | win32k shows up only at the power transition at the end | Low to medium |
| Paging or commit stall | — | 16-19 GB free; commit 33-37 %; the recorder kept going; no 2004 event | Free memory stayed high during both stalls | Low |
| Driver deadlock unrelated to the antivirus (Hyper-V/WSL, UnionFS, wesp, network) | Several such drivers are loaded; 0xA0 on 10-07 had no 360 death | A deadlock does not end by itself after 2 hours (11-13), nor turn into a refusal | The same minidump stacks | Medium-low |
| Hardware fault | Some of the 52 restarts have no precursor | The machine stayed alive and coherent through these stalls; no WHEA | A hardware fault does not single out process creation | Low for these stalls |
| The work simply ended | — | Timeouts with no end line; EPERM; the owner saw a hang dialog; the process count kept rising | Processes stuck in creation are not finished work | Low |

## Answers to the other questions

**(2) Does C3 follow?**

- 1,588 MB private in a 32-bit process without the large-address flag is near, but not at, a 2 GB virtual ceiling.
- Fragmentation and the roughly 400 MB of mappings that are not private bring the practical limit to about there.
- "Terminated at the ceiling" does not follow, because no allocation failure was recorded.
- SCM logs "terminated unexpectedly" for any exit that never reported "stopped": a kill by 360's own watchdog, a self-exit, a self-update, a fail-fast, or a crash that 360's own reporter handled.

**(3) Can C4's measurement be trusted?**

- Not for its rate. It had one run per step, a fixed order and a fresh service, with steps near the noise. Its per-start cost falls with repetition, and over the real workload the growth tracks node, not PowerShell.
- The handle counts add one true fact: about 17 handles kept per PowerShell start. That is not console creation, because cmd does not keep them.
- PowerShell's script scanning (AMSI) and .NET runtime loading are the candidates. Neither is separated from the other.
- Missing controls:
  - a non-PowerShell .NET program;
  - a script host without .NET (cscript, which still goes through AMSI);
  - repeats in random order;
  - virtual size and private bytes side by side.

**(4) What to measure next, in order of value, with no setting changes:**

1. The owner, with admin rights, opens the minidump of 11-17 (`C:\Windows\Minidump\111726-16468-01.dmp`), and the one from 10-07 if it is still there. Run `!analyze -v`, then list the processes and their threads. Look for which driver sits on the stacks of the threads stuck in creation and in the win32k power send. This needs WinDbg, an install only the owner can approve.
2. Restart, so that the remaining 360 drivers unload. Then keep the same workload for several days. Each day, search the app log for `spawn EPERM`, `timed out after 120000ms` and spawn stalls over 5 s, and keep the recorder running. A long block or an EPERM with 360 gone refutes the 360 story.
3. Let the recorder note the names, parents and start times of new processes, plus the commit charge again, which the new format dropped. Then a stuck creation names its creator and its image.
4. Identify the 7 PowerShell processes that appeared at 15:22-15:23 and stayed.
5. Only if 360 is ever reinstalled: the C4 controls above.

**(5) Is C6 justified?**

Removing 360 is a reasonable experiment, and it is already done. It is not a proven cure. The PowerShell half is not supported.

**For the owner:**

You are right that it is not a memory shortage. More than 16 GB stayed free.

What hangs is starting new programs: twice a start waited for minutes and then ended in an "access denied" refusal. That is the usual behaviour of a security program's hook. 360 was the only one installed, so removing it (done; it needs a restart to finish) is the right test. But the same hang also happened on days when 360 did not crash. So we will only know it was 360 if the hangs stop over the next days of the same work.

## Numbers in EVIDENCE.md that do not reproduce

- "Recorder: one line per 30 s". It writes every 2 s.
- "Last lane command ended 15:40:03" (gather-audit). The lane log's last line is 15:29:00.
- "No crash dump exists". `111726-16468-01.dmp` exists, and WER already gave its bucket.
- "PC reset about 07:35-07:44" by the owner. A sleep transition began at 07:34:27 and the power watchdog (0xA0/0xF0) restarted the machine. The boot was at 07:44:46.
- "Owner reset 01:42". The boot was at 01:44:05.
- "Our starts explain 19-27 MB/min". PowerShell starts explain at most about 9 MB/min in the fastest-growing minutes, and the fit is negative once node is counted.
- "Size at the 15:20 death unknown". Free memory rose 1,451 MB at 15:20:31-33.
- "Never released". This cannot be judged; the only drop came during the uninstall.
- The 90-minute look-back for 360 deaths misses restart #38. The 180-minute window in gather-history catches it.
