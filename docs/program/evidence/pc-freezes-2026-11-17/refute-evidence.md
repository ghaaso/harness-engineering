# Refuting EVIDENCE.md from the data (refute:evidence)

Written by the "evidence" refuter, 2026-11-17, about 16:30 to 17:10 local time (UTC+5). All times are local.
I recomputed every figure I could from the raw records:

- the recorder log;
- the lane log and the lane's source;
- the model run's result files;
- every transcript written on 11-17 and on 11-06;
- the System and Application logs, read with 3 PowerShell calls of the 8 allowed (all logged in `ps-calls.log`).

My scripts and their outputs are in `refute-evidence-work/`:

| File | What it does |
|---|---|
| `rec.mjs` | Parses the recorder log |
| `chk.mjs`, `chk2.mjs`, `corr.mjs`, `minute.mjs` | Analysis scripts |
| `tx.cjs` / `tx.json`, `tx06.cjs` / `tx06.json` | Tool calls taken from the transcripts |
| `q1-out.json`, `q2-out.json`, `q3-out.json` | Event-log exports |

Nothing on the machine was changed.

"Verified" means I recomputed it from raw data. "Inferred" means it is my reading of verified data. "Not checked" means I could not check it.

## 1. Numbers: what reproduces and what does not

### Reproduces (verified)

**The 360 service's working set (`top=`)**

- 412 MB at 04:01:14, 1,588 MB at 05:04:19, and missing from the top three after 05:04:31.
- One small correction: the series is not monotone. It dips from 578 MB (04:10) to 567 MB (04:15) before reaching 609 MB (04:20).
- The service was above 1 GB from 04:37:53 to 05:04:19, which is 26 minutes, and work went on normally throughout.

**The growth rates "19 to 27 MB a minute"** reproduce, but only as averages:

| Window | MB a minute |
|---|---|
| 04:01:14 to 05:04:19 | 18.6 |
| 04:25 to 05:00 | 26.7 |
| 04:01 to 04:25 | 8.9 |
| 04:35 to 04:40 | 43.8 |
| The last 4 minutes before the death (05:00:01 to 05:04:19) | 7.0 |

The rate varies about fivefold, and the service died during its slowest growth.

**The three service deaths (SCM 7034)**

- 2026-11-06 13:42:32.
- 2026-11-17 05:04:19.
- 2026-11-17 15:20:33.
- A fourth at 16:24:39 is the owner's uninstall.
- Each was followed by SecurityCenter 15 "ON" within 6 to 7 s where logged: 05:04:26 and 15:20:39.

**Unclean restarts (Kernel-Power 41)**

- 11-06 at 00:18:04, 15:13:10 and 20:14:04.
- 11-17 at 01:44:07, 02:55:53, 07:44:47 and 15:45:56.

**Interruption 4 (15:43)**

- cpu 86 to 93 % per minute from 15:38 to 15:42.
- Least free memory 14,187 to 17,161 MB.
- `15:43:23 cpu=87%` and `15:43:43 cpu=3%`.
- Last recorder line at 15:45:34.
- Parts finished per minute: 139, 117, 105, 117 for 15:39 to 15:42.
- No System or Application event between 15:41:54 and the boot (15:45:56). This holds.
- Perflib 1008 at 15:31:21 is present.

**Interruption 3 (about 05:12)**

- "Work went on from 05:04 to 05:12": holds. From 05:04 to 05:14 the process count rose 109 times (+463) and fell 90 times (-450). cpu was 4 to 16 %, node 4 to 14.
- From 05:13:04, cpu is 1 to 3 %.
- The node count falls by one at 05:28:41, 05:35:50 and 05:56:15.

**The lane log**

- Starts at 05:11:19 (`fix-U2`) and 05:11:58 (`fix-U1-full-admit-stop`).
- `timeout` at 05:16:19 and 05:16:58.
- No `end` line for either.
- `busy` at 05:27:04 with `waited_s: 900`, for the lane process started at 05:12:04.

**The source**

- `lane.mjs` line 88 does call `spawnSync(taskkill, ...)` with no timeout, inside the timer callback.

### Does not reproduce, or is wrong as written (verified)

1. **"one line per 30 s"** (interruption 3 section). The recorder writes every 2 s. There are 14,306 lines, and the largest gap is 31 s, at the 15:30:50 restart of the recorder. The evidence's own machine section says every 2 s.
2. **"node 17 to 21"** for the 15:38 to 15:42 minute means. The per-minute values span 6 to 21; from 15:39 they span 16 to 21.
3. **"total processes 332 to 377"**. The minimum in 15:38 to 15:42 is 312.
4. **"65 in 15:43"**. 62 result files carry 15:43 times (63 output lines).
5. **"52 in 75 days"**. The System log reaches back only to 2026-09-22 19:56, so this is 52 in 56 days.
6. **"No crash dump exists" / "nothing was logged"**.
   - The 07:44:47 restart was a bugcheck: Kernel-Power 41 carries BugcheckCode 160 (0xA0, INTERNAL_POWER_ERROR, parameters 0xF0, 0, 0x36).
   - volmgr 162 says "Dump file generation succeeded" at 07:44:47, and WER logged a BlueScreen report at 07:45:08.
   - Interruption 3 also left a Windows trace from 05:15 on (item 3 under section 2).
7. **"PC reset about 07:35 to 07:44"**. It was not a hard reset.
   - A sleep transition began at 07:34:27 (Kernel-Power 566, reason SxTransition). The recorder's last old-format line is 07:34, and EventLog 6008 gives 07:36:08.
   - The transition hung, and the machine bugchecked (0xA0) and rebooted at 07:44:47.
8. **"None of the others has a 360 service death in the 90 minutes before it"**. Only one restart has a death within 90 minutes before it: 15:45:56, 25 minutes after the 15:20:33 death.
   - 11-06 15:13:10 comes 90.6 minutes after its death.
   - 07:44:47 comes 160 minutes after its death.
9. **The 15:34 "owner ended those programs to free memory"**. Windows logged Application Hang 1002 for ChatGPT.exe (15:34:13), chrome.exe (15:34:23) and SystemSettings.exe (15:34:31), and WER logged AppHangB1/MoAppHang reports, including one for the Codex app.
   - These windows were judged not responding when closed. That is my reading of event 1002; I did not verify it independently.
   - There are only 6 Application Hang events in the whole log, and 3 are these.

### Cannot be re-checked

- "No WMI-Activity event 05:00 to 05:20" and "821 events 15:15 to 15:46": the WMI-Activity log has rolled over, and my queries returned none.
- The PE header facts (32-bit, no large-address flag) and the coordinator's own counter measurements: not re-read by me.

## 2. Data that contradicts the chain

1. **At 05:12 only one program family was working.**
   - From 04:30 to 05:30 the transcripts show one session: the coordinating session and its helpers, all in one CLI process.
   - Its four Bash calls that never returned started at 05:08:44, 05:11:13, 05:11:58 and 05:12:03.
   - I found no unrelated program that stopped at the same moment. So the "across unrelated programs at once" signature of C1 is not shown at 05:12.
2. **Process creation did not stop at 05:12.**
   - The 05:12:03 Bash call started a node lane process at 05:12:04. Its event loop ran and it wrote `busy` at 05:27:04.
   - `review-tmp/fix-U1/full-admit-stop.log` was last written at 05:28:40. Its last line is a passed sub-test of 2.6 s, so that test process made progress at about 05:28:37 to 05:28:40, then a node process ended at 05:28:41. When it was stuck before that is not knowable (no per-line times).
   - From 05:14 to 07:34 the process count rose 84 times (+87) and fell 37 times (-37), a net +50. So processes were still being created, and few ended.
   - This fits process starts that hang half-made, or that complete only after many minutes. It does not fit a machine on which nothing can be created. (Inferred.)
3. **The morning stop has a Windows trace.**
   - Software Protection began its usual cycle at 05:12:37 (16394). The normal "scheduled" (16384) that follows about 30 s later (for example 15:25:59 then 15:26:32) never came.
   - Instead there is 16385, "Failed to schedule ... Error Code: 0x80070005" (access denied), at 05:15:29. It then repeats every 2 min 50 s until 07:38:41: 33 failures.
   - **In the whole log there are 38 such failures:**
     - those 33;
     - 5 on 2026-10-07, from 15:38:30 to 16:01:30.
4. **2026-10-07 is the same ending without a 360 death.**
   - 360 was installed on 2026-10-05 05:46 (folder birth time; SCM 7045 for its drivers and services).
   - On 10-07:
     - SPP access-denied failures from 15:38:30;
     - Windows Search filter hosts "did not respond and [were] forcibly terminated" at 15:39:06 and 15:49:36;
     - a sleep transition at 15:53:40;
     - Mobile Hotspot service "failed to start: Access is denied" at 15:57:37;
     - then Kernel-Power 41 at 16:04:00 with the same bugcheck, 0xA0 (0xF0, 0, 0x36), and a dump written.
   - No SCM 7034 that day. The only two bugchecks in 56 days are this one and 11-17 07:44. Both followed this exact sequence: access-denied run, then a sleep transition, then 0xA0. Only one had a 360 death before it.
5. **Stalls of the same kind without any 360 death** (transcript signature from the earlier gathering; Windows events read by me in `q2-out.json`):
   - **11-13**: a 126-minute spawn block that recovered with no restart; Tcpip 4231 (ports exhausted) at 21:17:58.
   - **11-14**: a 63-minute block with spawn EPERM; WMI Performance Adapter "failed to start ... Access is denied" at 17:19:33; Tcpip 4231 at 18:01:54; unclean restart 18:05:10.
   - **11-02**: git timeouts; no error in the System or Application log; unclean restart 16:26:33.
   - **11-15**: git timeouts; a HamLkd hang report for the Settings app at 02:46:45; unclean restart 03:03:17.
6. **The 15:43 drop is not the model run finishing or waiting.**
   - Its last "waiting for memory" line is before 15:38:00.
   - About 595 of 3,131 parts were done, so it was not the end of a stage.
   - It stopped mid-stream at 15:43:26.
7. **What else was pending at 15:43.**
   - The coordinator's Bash at 15:43:23 never returned.
   - Session 7abf9f82 last wrote at 15:43:28; its last open item was a model request with no reply.
   - The other three sessions had been idle since 15:37:54 to 15:40:21 (end of turn).
   - The app's websocket closed abnormally (1006) at 15:43:42.
   - So the 15:43 evidence for "unrelated programs" is:
     - a Bash call;
     - the model run, whose runner starts `tasklist` every 5 s and new host processes, so it also depends on process starts;
     - one model request that may simply have been in flight.
8. **Degradation before 15:43.** Three GUI apps were hung at 15:34 (item 9 under section 1), 14 minutes after the death and 9 minutes before the stop.
9. **11-06 does not match the 8 to 23 minute pattern.**
   - The service died at 13:42:32.
   - The owner unlocked the session at 14:00:19 and 15:03:34.
   - Work stopped about 75 minutes after the death.
   - At 15:12:07 the owner asked for a restart from the Start menu (User32 1074). The shutdown did not complete, and Kernel-Power 41 followed at 15:13:10.
   - Memory was tight that day (from the earlier gathering).
10. **Unclean restarts do not track the antivirus.** Kernel-Power 41 counts:

    | Period | Unclean restarts | Days | Per day |
    |---|---|---|---|
    | 09-22 to 10-04, before 360 | 18 | 12.4 | 1.45 |
    | 10-05 to 10-31, with 360 | 9 | 26.8 | 0.34 |
    | 11-01 to 11-17, with 360 | 25 | 16.7 | 1.50 |

    49 of the 52 have no 360 death before them. The rate follows the period, and plausibly the owner's workload, more than the antivirus. (Inferred: I did not measure workload per day.)
11. **PowerShell starts cannot explain the morning growth.**
    - Recorder-seen PowerShell starts from 04:00 to 05:05: at least 266.
    - At the coordinator's worst measured cost (1.06 MB per start, for Get-CimInstance starts), that is at most 282 MB of the 1,176 MB growth (24 %). At the plain-start cost (0.12 to 0.27 MB), it is 4 to 6 %.
    - The 04:00 to 04:05 bucket grew 107 MB with 3 PowerShell starts.
    - The coordinator made no PowerShell tool calls from 04:00 to 05:05.
    - The addendum's own suite run grew the service +114 MB with +193 handles: growth without PowerShell starts.
12. **Not memory, not disk** (agreeing with the owner for interruptions 3 and 4).
    - 04:00 to 05:30: commit at most 37 % (34 % at 05:12), free memory at least 17,105 MB, disk queue at most 1 from 05:10 to 05:20.
    - 15:38 to 15:45: free memory at least 14,187 MB.
13. **The earlier "memory issue" was real but different.**
    - 2026-11-01 01:14: "Out of Virtual Memory". Resource-Exhaustion 2004 names an image program at 97 GB of virtual memory.
    - That night (01:46) Windows' leak detector flagged QHActiveDefense.exe (RADAR_PRE_LEAK_WOW64), but the service did not die on 11-01.
    - RADAR flags are common: 27 in the log, for many programs.
14. **Nothing points to desktop-heap exhaustion.** There is no failed-process-start popup (0xC0000142) in the whole log; the 12 Application Popup events are unrelated. Win32k events are not in the System log, so desktop-heap events could not be checked.
15. **The 360 service's own logs are gone.** The program folder keeps 42 binaries and a config file; the data folders hold only web caches. 360's web-view leftovers were still writing at 16:34, after the uninstall.

## 3. Verdicts

| Claim | Verdict | Why (numbers) |
|---|---|---|
| C1. At 15:43:23 to 15:43:26 new work stopped across unrelated programs at once; machine alive; not memory, disk or cpu | **Weakened** | Alive, not memory (14 GB free) and not cpu: holds. "Unrelated programs at once" is weak: the stopped items all depend on process starts, or (one model request) may simply have been in flight. Three apps were already hung at 15:34. The process count kept rising (+11 from 15:43:44 to 15:45:34). |
| C2. Same signature about 05:12 | **Weakened** | Only one session was active. A node process started at 05:12:04 and ran. One test made progress at 05:28:37 to 05:28:40. Unlike 15:43, Windows logged access-denied failures from 05:15:29. It looks like slow or stuck process starts, not a stop across programs. |
| C3a. 32-bit, no large-address flag, about 2 GB ceiling | Not checked by me | Standard for a 32-bit image without that flag. Note that 2 GB limits virtual address space, not working set. |
| C3b. Grew to 1,588 MB that morning | **Holds** | 412 MB (04:01:14) to 1,588 MB (05:04:19). |
| C3c. Terminated because it reached the ceiling | **Not testable** | No dump and no WER crash record for any of the 3 deaths. Growth was slowest (7 MB a minute) just before the death. Its size before the 15:20 and 11-06 deaths is unknown. It was flagged large on 11-01 without dying. |
| C4a. A PowerShell start grows it about 0.1 to 1.1 MB and about 17 handles | Not re-checked (the coordinator's single-run measurement) | — |
| C4b. Our PowerShell starts explain the growth (19 to 27 MB a minute) | **Refuted** | At most 24 % at the worst per-start cost, typically 4 to 6 %. 107 MB in 5 minutes with 3 starts. The suite grows it without PowerShell starts (addendum). |
| C5. The block follows the death (8 and 23 minutes) | **Weakened** | Both gaps reproduce (05:04:19 to about 05:12/05:13; 15:20:33 to 15:43:23), but 11-06 is about 75 minutes. The same stall without a death happened on 11-13, 11-14, 11-02 and 11-15, and the identical 0xA0 ending without a death on 10-07. Work ran normally for 8 and 23 minutes after the deaths. |
| C6. Removing 360, or bulk PowerShell, would prevent this kind of freeze | **Not shown** | It rests on C4b (refuted) and C5 (weakened). It stays a reasonable cheap experiment (section 6), not a proven fix. |
| "Work went on normally 05:04 to 05:12" | **Holds** | Process churn +463/-450, cpu 4 to 16 %. |
| "The quiet from 05:13 is just the end of the work" | **Refuted** | Four Bash calls were pending; two tests ran past 300 s against 75 to 105 s normal; taskkill never ended; SPP was denied from 05:15. |
| "The 15:43 drop is a stage end or a memory wait" | **Refuted (both)** | No wait line after 15:38:00; about 595 of 3,131 parts done. |
| Interruptions 1 and 2 share the cause | **Not attributable** | No recorder and no 360 data. Kernel-Power 41 with bugcheck 0 at both. No 360 death since 11-06. Interruption 2 has zero System/Application events from 02:20 to the boot. Interruption 1 had git spawn stalls at 01:10. That transcript signature matches the non-360 episodes as well as interruptions 3 and 4. |

## 4. Base rates: what the coordinator may and may not quote

**May quote** (verified):

- "In the 43 days since 360 was installed (10-05 05:46 to 11-17 16:15) its service died 3 times. Each time the work stalled within 8 to about 75 minutes, and an unclean restart followed within 25 to 160 minutes."
- "49 of the 52 unclean restarts in the 56 days of log have no 360 death before them. 18 of the 52 happened before 360 was installed."
- "The only two bugchecks in 56 days (10-07 16:04, 11-17 07:44) are the same 0xA0 power error. Each came after a run of 'access denied' failures and a sleep transition. One had a 360 death before it, the other did not."
- "Free memory was at least 14 GB at both recorded stops."

**May not quote:**

- "2 of 2" or "3 of 3 deaths were followed by a block" as evidence of cause. The deaths were picked after the fact, and the same block occurred at least 4 times without a death.
- "52 in 75 days": it is 52 in 56 days.
- Any rate or ratio claiming fewer restarts without 360. There were more per day before 360 (1.45) than in October with it (0.34), and as many as in November (1.50).
- "Our PowerShell starts explain the growth."
- "Nothing was logged" or "no dump" for interruption 3.

## 5. Alternatives the data leaves open

| # | Explanation | Fits | Contradicted by | Telling observation | Rating |
|---|---|---|---|---|---|
| A1 | 360's kernel parts (file minifilters, process-protection driver) stall or deny operations while its user-mode service is dead, restarting or hung. A death is not needed; a hang is enough. | Slow PowerShell starts with 360 (2.1 s) against 0.15 s after; access denied (SPP; EPERM on 11-14; WMI adapter on 11-14; Hotspot on 10-07) in stall episodes; half-made processes accumulating; 360 present in every episode after 10-05. | 18 unclean restarts before 360 existed (cause unknown); nothing shows a 360 component holding a request. | Stalls, access-denied runs or 0xA0 after a reboot with no 360 driver loaded; or a 360 driver on the stack in the 07:44 dump. | Plausible; the leading one, and testable now |
| A2 | A system-wide hang of some other origin (kernel lock, driver, process-creation path); the 360 service's death is one more victim. | Same stall without a death (11-02, 11-13, 11-14, 11-15) and the same 0xA0 on 10-07; the 11-06 death 75 minutes before the stop; restarts before 360. | Work ran normally for 8 and 23 minutes after the two 11-17 deaths, so the death did not come in the middle of a stall there. | The same stalls after 360's drivers are gone. | Open |
| A3 | Platform or power instability after the September hardware change (0xA0 power bugcheck in win32kbase message sending). | Two identical 0xA0 bugchecks; 18 restarts in the first 12 days of the log. | Does not explain the link between stalls and process starts, or the sudden stop with an alive machine. | The 0xA0 dumps' stacks; restarts at idle. | Open for the restarts in general, weak for the 05:12/15:43 stops |
| A4 | Exhaustion of a non-RAM resource: TCP ephemeral ports, handles, or 32-bit address space in a security process. | Tcpip 4231 inside the 11-13 and 11-14 stalls (15 events since 10-14). | No 4231 on 11-17; commit at most 37 %. | 4231, or rising handle counts, at the next stall. | Weak for 11-17, open for 11-13/11-14 |
| A5 | Physical memory or commit shortage (the owner's earlier lead). | Real on 11-01 (an image program at 97 GB virtual). | At least 14 GB free and commit at most 37 % at both recorded stops. | — | Refuted for interruptions 3 and 4; not testable for 1 and 2 |
| A6 | The coordinator's own tooling wedged itself: the lane's synchronous taskkill held its slots, so later lane calls waited 900 s and the session looked frozen. | Explains why the session stayed stopped after 05:16. | Does not explain why the tests hung (more than 300 s against 75 to 105 s) and taskkill never ended, nor the cpu drop, the access-denied run and the 0xA0 hang. | — | Partial; an amplifier, not a cause |

## 6. The three checks that would most change my verdict

1. **Read the 07:44 dump** and the 10-07 one, if Windows kept it. This is the owner's step, offline, with a debugger.
   - Bugcheck 0xA0/0xF0 names the power request that timed out. Its stack, and the blocked process, show who did not answer.
   - A 360 driver (360FsFlt, 360AvFlt, 360Box64, disproc), or a thread waiting on one, would make A1 strong.
   - A clean stack with no third-party driver would weaken every 360 claim.
2. **Watch for recurrence after the next reboot, when the 360 drivers are finally unloaded.** The same work should be run with the recorder on:
   - several sessions;
   - the test suite;
   - the 16-worker model run.

   Count each of these:
   - spawn blocks or tool calls that never return;
   - SPP 16385 with 0x80070005;
   - clusters of Application Hang events;
   - unclean restarts or 0xA0.

   At November's rate (1.5 unclean restarts a day), five comparable days with none would be strong support (chance about 0.06 % if nothing changed). Any recurrence refutes C6.
3. **At the next stall, time one trivial process start from an already-running shell**, and read the process count and handle counts.
   - This separates "process creation blocked" (A1/A2) from "the sessions' own work blocked" (A6).
   - Also log Tcpip 4231, to test A4.
   - (360's own logs, my first choice for this slot, were removed by the uninstaller.)

## 7. Limits

- One reading of each window. Per-line times inside the test logs do not exist.
- The transcripts show tool calls, not what the processes did inside the kernel.
- The episode list for 11-02 to 11-15 comes from the earlier gathering's transcript signature. I read their Windows events, not their transcripts.
- The 06:22 owner presence and the 11-06 stop time (about 75 minutes after the death) come from my reading before the context break; they were not re-read in this pass.
