# Verdict of the coordinator on the freezes of 2026-11-17

Written at about 17:00 local time on 2026-11-17, after the seven-agent check (run `wf_79489f84-bc6`,
1.41 million tokens, 424 tool calls). It replaces the chain C1 to C6 of `EVIDENCE.md` where they differ.
The readers' own notes are beside this file: `gather-history.md`, `gather-applogs.md`, `gather-web.md`,
`gather-audit.md`, `build-watch.md`, `refute-evidence.md`, `refute-internals.md`, `suite-profile.txt`.

## What is established

1. **It is not a memory shortage.** At all four interruptions of 2026-11-17 the app's own samples and the
   recorder show 11.8 to 19.3 GB free; commit was at most 37 %; no resource-exhaustion event precedes any
   of the 52 unclean restarts of the last 56 days.
2. **What fails is starting a new program.** At each of the four interruptions every session's transcript
   stops within seconds; the first call that never returned was a short Bash command (a program start) in
   three of them; calls answered inside the app (Read, Edit) kept returning for 1 to 3 seconds; programs
   already running went on for minutes to hours; the process count climbed and did not fall (316 to 367
   from 05:13 to 07:34; 320 to 343 from 15:43:23 to 15:45:24). The app's main process is itself stuck in a
   program start (its stall detector names `spawn:git` and `spawn:taskkill`), which is the "not
   responding" window. Twice a stuck start returned after 25 to 63 minutes as "access denied"
   (`spawn EPERM`: 2026-11-14 and 2026-11-17 05:37:31).
3. **The same block occurred on other days**, found in the app's log
   (`%LOCALAPPDATA%\Claude\logs\main.log` and its rotations): 2026-11-02 15:44, 11-06, 11-13 20:51 to 22:58
   (a `taskkill` start blocked 7,560 s and then cleared by itself, no restart), 11-14 16:10 to 17:13,
   11-15 02:44, and four times on 11-17 (01:26, 02:50, 05:12, 15:43).
4. **360 Total Security slowed every PowerShell start thirteen-fold**: 2,070 to 2,180 ms with it, 151 to
   160 ms minutes after its removal. Tests that judge other processes ran three to four times faster.
5. **Its service grew and died.** About 1.45 to 1.5 GB was freed at each of the deaths of 05:04:19 and
   15:20:33 (steps in free memory). Windows' leak detector flagged it on 2026-11-01. It is a 32-bit program
   without the large-address flag. Why it died is not recorded (no error report at those deaths).

## What fell

- **"PowerShell starts feed the service" (C4): refuted as the main feeder.** Its growth follows node and
  test activity (correlation 0.68 with new node processes, 0.33 with new PowerShell; in the measured test
  run +114 MB with almost no handle growth). PowerShell explains at most about a quarter.
- **"The block follows the service's death" (C5): the death is not the trigger.** At least 6 of 9 blocks
  happened with no death; after the two deaths of 2026-11-17 work ran normally for 8 and 23 minutes.
- **"Removing 360 prevents the freeze" (C6): not shown.** It is a justified, cheap experiment, not a
  proven fix.
- Errors of fact in `EVIDENCE.md`: a crash file does exist for interruption 3
  (`C:\Windows\Minidump\111726-16468-01.dmp`, bugcheck 0xA0, parameter 0xF0, written 07:44:54); that
  restart was Windows failing on the way into sleep (transition began 07:34:27), not a reset by the owner;
  the logs reach back 56 days, not 75; the recorder writes every 2 s; the 15:34 program closures were
  logged by Windows as hangs.

## What is still open

- **Leading suspect: a security hook that holds a program start and then refuses it.** Holding for a long
  time and then answering "access denied" is how a product's process-creation callback or file filter
  behaves when its user-mode half does not answer. 360 was the only third-party security product
  (installed 2026-10-05) and was present in every block since. No record places a 360 driver in the
  wait.
- **Against it:** 18 unclean restarts happened in the 13 days before 360 was installed. 20 of the 52
  restarts carry a "sleep or standby in progress" flag and two are 0xA0 power bugchecks (2026-10-07,
  2026-11-17 07:44). So at least one other problem exists (power transitions, after the September
  hardware change), and it may or may not be related.
- Interruptions 1 and 2 of 2026-11-17 show the same transcript signature (a program start that never
  returns) but have no recorder and cannot be attributed.

## The test, and what would settle it

1. Restart the PC, so the three 360 drivers that are still loaded (`360FsFlt`, `360netmon`, `disproc`)
   are gone. Until then the experiment has not started.
2. Run the usual heavy work for several days with the watcher on (`research-tree/tools/av-watch.ps1`: it
   times a program start and a file write every 5 s and logs when either is blocked).
3. Look daily in `main.log` for `[event-loop-stall]` lines with `spawn:` above 5 s, `spawn EPERM`,
   `timed out after`; in the System log for Kernel-Power 41 and bugchecks; in the watcher's log for
   `BLOCK` lines. Blocks occurred on 6 of the last 16 days and four times on 2026-11-17: a week of the
   same work with none supports 360 as the cause; one recurrence refutes it.
4. Optional and the owner's decision: open the 07:44 crash file in a kernel debugger (needs an install
   and administrator rights). It was written while a block was in effect and may name the driver.
5. For the next block: the watcher should also log the names and parents of new processes, so a stuck
   start names its creator.

## What this means for the harness

- A diagnosis is a lead until it has been attacked. Three causes were named to the owner on 2026-11-17
  and each was wrong or partial: the model checker's load (01:42), the coordinating session's full
  context (05:12), PowerShell feeding the antivirus (15:43).
- The app's own log is the first place to look after any "not responding": it names the stuck task.
- The per-call PowerShell process reader in `tcb/lib.mjs` is a speed matter now, not a stability one
  (`gather-audit.md` has the call sites and the options).

## The test has started (added 17:25 on 2026-11-17)

- The owner restarted the PC from the Start menu at 17:12:28 (clean shutdown); boot 17:13:00.
- After the boot: no 360 process; no 360 driver loaded (`360FsFlt` and `360netmon` are gone; `disproc` is
  still registered, Stopped, start mode Manual, its file `360disproc64.sys` still in the drivers folder;
  the 360 program folder is empty). Security Center lists only Windows Defender; real-time protection on.
- A PowerShell start takes 141 to 150 ms; `cmd /c exit` 7 to 13 ms.
- The watcher runs since 17:17:18 (process 24244) from `watch/av-watch.ps1` in this folder, log
  `watch/av-watch.log`, `-Hours 168`: start probe 16 to 22 ms, file probe 1 to 4 ms. It does not survive
  a restart of the PC: start it again with
  `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <this folder>/watch/av-watch.ps1 -Log <this folder>/watch/av-watch.log -Hours 168`
  (hidden, in the background).
- Both other sessions were told to continue at 17:20 (the model run and the as-built model work).
- Being built (run `wf_7bf167b5-ff4`): `watch/pc-watch.ps1`, which adds a snapshot of thread wait reasons
  at a blocked start, and `watch/stall-scan.mjs`, which lists blocks and unclean restarts for a period.
- The PC's automatic sleep is set to 15 minutes when plugged in (`powercfg`: Sleep after = 0x384 s);
  sleep states offered: S3, Hibernate, Fast Startup. 20 of the 52 unclean restarts carry a
  "sleep or standby in progress" flag.
- 17:38: the owner reported that he set automatic sleep to Never. `powercfg` does NOT confirm it: in the active plan "Sleep after" still reads 0x384 (900 s) when plugged in. Open until it reads 0. 17:41: confirmed: after the owner ran `powercfg -change -standby-timeout-ac 0`, "Sleep after" reads 0 (never) when plugged in; "Hibernate after" is 0 as well.
