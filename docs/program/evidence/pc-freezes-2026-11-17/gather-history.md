# gather:history - unclean restarts, 2026-09-22 to 2026-11-17

Made on 2026-11-17 from the Windows System and Application logs. Read-only. Raw exports: history-raw-System.json (13,084 events), history-raw-Application.json (410 events); reach files history-reach-*.json; per-restart data in history-table.json. Analysis ran in Node. Three PowerShell calls were made (System export, Application export, one count of all records by month); the PowerShell scripts are kept as export-events.ps1.txt and reach-detail.ps1.txt. Times are local (UTC+5).

## 1. How far back the logs really reach

- The request was 75 days (to 2026-09-03). **Both logs hold nothing from 2026 before 2026-09-22.** First 2026 System event 2026-09-22 19:56:21, first 2026 Application event 2026-09-22 18:50:30 (checked by counting all 38,087 System and 10,826 Application records by month). The real window is **56 days**, not 75.
- Both logs also hold an older block stamped 2024-04-01 (536 System, 100 Application records, from record id 1: Windows setup, OOBE, time-zone events). Nothing lies between 2024-04-01 and 2026-09-22. Record id 1 is still present, so the logs have not wrapped (inferred), and restarts in the window are not hidden by truncation. The System log is circular, 19.99 of 20 MB used, so it is close to full now and will soon start to drop its oldest records.
- The clock was wrong at the start: a Kernel-General 1 event at 2026-09-23 09:14:15 moves the time from 2024-04-01 to 2026-09-23, and a backward step of about 15 h is logged at 2026-09-22 18:50. **Time stamps before 2026-09-23 09:14 are not reliable.** Restarts 1 and 2 are stamped inside that period.
- Oldest event of some kinds: Kernel-Power 41 2026-09-22 19:56; Service Control Manager 7034 (any service) 2026-10-04; Tcpip 4231 2026-10-14. Service deaths before 2026-10-04 would be unlogged or not present; the 360 count of 3 is therefore sure only from 2026-10-04 on.
- Also in the System log: 12,086 disk 51 events ("error detected on device Harddisk1 DR12 during a paging operation"), all stamped 2026-09-29 16:02:51, preceded by Ntfs 140 at 16:02:44 (failed to flush; volume D:, "a device which does not exist was specified"). One disk dropped away in one second; no restart followed that day. They are about a third of the System log.

## 2. The 52 restarts (Kernel-Power 41)

Method. For each 41 the boot is the Kernel-General 12 at or just before it. The window is the 180 min before that boot, but not before the previous boot. "since prev start" is boot minus previous boot, so it includes the time the machine stood dead or hung. "41 fields" are read from the event itself: sleepInProg (SleepInProgress, raw value; what 1, 4 and 6 mean is not checked), connStandby (ConnectedStandbyInProgress true), powerBtn (PowerButtonTimestamp not 0). The "previous shutdown" time in EventLog 6008 is kept in the JSON but **not used**: for the first restarts it sits about 12 h before the boot, and for restart 52 it is 34 min before the real last sign of life (the evidence file's own point). I judge it unreliable.

| # | boot (local) | hr | since prev start (min) | 41 fields | logged precursors in the 180 min before | group |
|---|---|---|---|---|---|---|
| 1 | 2026-09-22 19:56:21 (clock unreliable) | 19 |  | sleepInProg=6 | none | G4 |
| 2 | 2026-09-22 20:29:05 (clock unreliable) | 20 | 32 | sleepInProg=6 powerBtn | none | G4 |
| 3 | 2026-09-23 11:45:29 | 11 | 916 | connStandby | none | G4 |
| 4 | 2026-09-26 15:58:49 | 15 | 4573 | sleepInProg=6 | none | G4 |
| 5 | 2026-09-26 16:02:45 | 16 | 4 | - | none | G6 |
| 6 | 2026-09-26 16:49:52 | 16 | 47 | - | none | G6 |
| 7 | 2026-09-26 20:35:03 | 20 | 225 | - | none | G6 |
| 8 | 2026-09-26 23:25:25 | 23 | 170 | connStandby | sleep x1, resume x1 | G4 |
| 9 | 2026-09-27 13:38:54 | 13 | 853 | sleepInProg=6 powerBtn | none | G4 |
| 10 | 2026-09-27 22:28:44 | 22 | 527 | sleepInProg=6 powerBtn | none | G4 |
| 11 | 2026-09-27 23:41:02 | 23 | 72 | connStandby | none | G4 |
| 12 | 2026-09-28 15:23:18 | 15 | 264 | sleepInProg=4 | none | G4 |
| 13 | 2026-09-28 23:54:55 | 23 | 512 | - | none | G6 |
| 14 | 2026-09-29 00:32:03 | 00 | 37 | - | none | G6 |
| 15 | 2026-09-30 01:52:38 | 01 | 448 | - | none | G6 |
| 16 | 2026-09-30 17:26:55 | 17 | 934 | - | none | G6 |
| 17 | 2026-09-30 19:21:28 | 19 | 115 | - | none | G6 |
| 18 | 2026-09-30 19:39:21 | 19 | 18 | - | none | G6 |
| 19 | 2026-10-06 17:04:11 | 17 | 4340 | powerBtn | app crash: RDR2.exe; sleep x1, resume x1 | G3 |
| 20 | 2026-10-07 16:03:59 | 16 | 1380 | sleepInProg=1 | bugcheck 0x000000a0; sleep x1, resume x1 | G2 |
| 21 | 2026-10-11 07:32:03 | 07 | 5248 | - | none | G6 |
| 22 | 2026-10-13 10:38:21 | 10 | 1598 | powerBtn | none | G5 |
| 23 | 2026-10-15 18:06:12 | 18 | 4 | - | none | G6 |
| 24 | 2026-10-18 20:43:17 | 20 | 2635 | connStandby | none | G4 |
| 25 | 2026-10-23 23:08:36 | 23 | 3146 | sleepInProg=4 | none | G4 |
| 26 | 2026-10-27 11:47:57 | 11 | 5079 | powerBtn | none | G5 |
| 27 | 2026-10-29 00:46:59 | 00 | 331 | - | sleep x1, resume x1 | G6 |
| 28 | 2026-11-02 16:26:31 | 16 | 6700 | powerBtn | none | G5 |
| 29 | 2026-11-03 08:31:13 | 08 | 965 | powerBtn | none | G5 |
| 30 | 2026-11-03 18:42:57 | 18 | 612 | connStandby | none | G4 |
| 31 | 2026-11-03 20:08:38 | 20 | 86 | - | none | G6 |
| 32 | 2026-11-04 09:01:10 | 09 | 773 | connStandby | none | G4 |
| 33 | 2026-11-04 15:18:05 | 15 | 377 | - | none | G6 |
| 34 | 2026-11-04 17:21:08 | 17 | 123 | connStandby | none | G4 |
| 35 | 2026-11-04 20:01:31 | 20 | 160 | - | none | G6 |
| 36 | 2026-11-05 16:01:03 | 16 | 1200 | sleepInProg=4 | none | G4 |
| 37 | 2026-11-06 00:18:02 | 00 | 497 | - | none | G6 |
| 38 | 2026-11-06 15:13:09 | 15 | 895 | - | 360 service died 11-06 13:42; 1074 clean restart request 15:12 | G1 |
| 39 | 2026-11-06 20:14:02 | 20 | 301 | sleepInProg=4 | none | G4 |
| 40 | 2026-11-07 19:41:23 | 19 | 1407 | - | none | G6 |
| 41 | 2026-11-08 20:26:49 | 20 | 1485 | sleepInProg=4 | none | G4 |
| 42 | 2026-11-10 15:25:31 | 15 | 2579 | - | none | G6 |
| 43 | 2026-11-10 18:40:55 | 18 | 195 | sleepInProg=4 | none | G4 |
| 44 | 2026-11-13 10:44:36 | 10 | 3844 | - | none | G6 |
| 45 | 2026-11-13 13:53:36 | 13 | 189 | - | none | G6 |
| 46 | 2026-11-14 01:03:52 | 01 | 670 | powerBtn | none | G5 |
| 47 | 2026-11-14 18:05:08 | 18 | 663 | - | tcp4231 x1 | G3 |
| 48 | 2026-11-15 03:03:16 | 03 | 538 | - | none | G6 |
| 49 | 2026-11-17 01:44:05 | 01 | 2801 | - | none | G6 |
| 50 | 2026-11-17 02:55:51 | 02 | 72 | - | none | G6 |
| 51 | 2026-11-17 07:44:46 | 07 | 289 | sleepInProg=1 | 360 service died 11-17 05:04; bugcheck 0x000000a0 | G1 |
| 52 | 2026-11-17 15:45:55 | 15 | 481 | - | 360 service died 11-17 15:20; hangs: ChatGPT.exe/chrome.exe/SystemSettings.exe | G1 |

## 3. Groups (each restart in one group, first matching rule from the top)

| group | n | restarts (#) |
|---|---|---|
| G1 360 service terminated in the 180 min before | 3 | 38, 51, 52 |
| G2 bugcheck without a 360 death | 1 | 20 |
| G3 other logged precursor | 2 | 19, 47 |
| G4 no logged precursor; the 41 says sleep or connected standby in progress | 18 | 1, 2, 3, 4, 8, 9, 10, 11, 12, 24, 25, 30, 32, 34, 36, 39, 41, 43 |
| G5 no logged precursor; owner held the power button | 5 | 22, 26, 28, 29, 46 |
| G6 no logged precursor, no other marker | 23 | 5, 6, 7, 13, 14, 15, 16, 17, 18, 21, 23, 27, 31, 33, 35, 37, 40, 42, 44, 45, 48, 49, 50 |

Counts that do not depend on the order:

- **No logged precursor of any kind** (no hang, service termination, resource exhaustion, TCP port exhaustion, disk/storage/WHEA event, bugcheck, clean-restart request or application crash in the window): **46 of 52**. Only restarts 19, 20, 38, 47, 51, 52 have one. No WHEA event exists in the 56 days.
- **360 Total Security service terminated in the 180 min before: 3 of 52.** #38 (2026-11-06 13:42:32, 91 min before the 15:13 boot; a clean-restart request 1074 at 15:12:07 lies between), #51 (2026-11-17 05:04:19, 160 min before the 07:44 boot) and #52 (2026-11-17 15:20:33, 25 min before the 15:45 boot). These are all three 360 deaths in the log, and each is followed by a restart within 160 min. The other 49 restarts have none. (The evidence file's 90-minute window misses #38 by half a minute.)
- Rough size of that overlap (my own figure): three 180-min windows cover about 0.7 % of the 56 days; 52 restarts placed at random would put about 0.35 inside them, and seeing 3 has a chance of about 0.5 % (Poisson). Restarts cluster (28 distinct days; 7 days with three or more), which weakens this, so it is suggestive only. The reverse also stands: 49 of 52 restarts happened with no 360 death, so 360 cannot explain most of them.
- Two restarts logged a **bugcheck 0xA0** (INTERNAL_POWER_ERROR): #20 2026-10-07 16:04 and #51 2026-11-17 07:44. Both have the same parameters (0xF0, 0x0, 0x36, a pointer) and both show SleepInProgress=1 in the 41. #51 is the restart after interruption 3 (about 05:12). Its minidump C:\Windows\Minidump\111726-16468-01.dmp (6.6 MB, written 07:44:54) exists; the 2026-10-07 one is gone. A web search summary (not a full reading of the page) says parameter 1 = 0xF0 means a power transition, probably suspend, did not finish in time; I did not verify that and did not open the dump. If true, interruption 3's restart was the kernel's own timeout on a power transition, not a hang of 360.
- **41 fields**: 13 restarts have SleepInProgress not 0 (value 6 on 5, value 4 on 6, value 1 on 2), 7 have connected standby true, 20 have at least one of these, 9 have a power-button timestamp (the owner forced the reset). Sleep is common here (191 sleep and 191 resume events in 56 days, reason System Idle), so this alone is not rare; only 4 restarts have a sleep or resume event inside their own window. Whether a sleep transition caused any restart is not shown here.
- **Hour of boot** (local): 15 to 20 h hold 29 of 52 (15 h: 6, 16 h: 5, 17 h: 3, 18 h: 4, 19 h: 4, 20 h: 7); 23 to 03 h hold 12; 07 to 11 h hold 8. Median time since the previous start 527 min; 10 restarts came within 120 min of the previous start, 3 within 30 min (#5 after 4 min, #23 after 4 min, #18 after 18 min).
- **Memory.** No Resource-Exhaustion-Detector 2004 event precedes any of the 52 restarts. There are exactly two such events in the 56 days, both 2026-11-01 01:14 (one episode: Topaz Photo AI 97 GB of virtual memory, Lightroom 13 GB). Services and programs crashed then (Winmgmt, WLAN, OneDrive, chrome, Cloudflare WARP) and the machine did **not** restart. This fits the owner's remark that plain memory shortage does not explain the restarts. It does not say what arrangements were made earlier (not checked). A hard freeze may log nothing, so absence is weak evidence.
- **TCP port exhaustion** (Tcpip 4231): 15 events in 56 days, first 2026-10-14. Only one lies in a restart window: #47 (event 2026-11-14 18:01:54, boot 18:05). No 4227 events.
- **Disk or storage events inside a window**: none. Two restarts (#15, #18) are followed 11 s after boot by disk 153 (an I/O retry at block 0 on Disk 1); that is after the restart, not a cause. No 129, no volmgr 161, no Ntfs 55.
- **Clean shutdown request (1074)** in a window: #38 only (restart request 15:12:07, one minute before the 15:13 boot). The 1074 events of 2026-11-14 morning (TrustedInstaller, MoUsoCoreWorker: Windows update) are planned restarts.
- **Application crash** in a window: #19 (RDR2.exe crashed three times, 16:16, 16:27, 16:45 on 2026-10-06; boot 17:04).
- **Other services that terminated** in the 56 days: ProtonVPN (5), Claude, ChatGPT, QMEmulatorService, AMD uploader, Windows Installer, WMI and WLAN (11-01), and 360 (3). None lies within 180 min before a 41 except the 360 ones.

## 4. Application Hang clusters

Only six Application Hang (1002) events exist in 56 days, so there is little to cluster.

- **2026-11-17 15:34:13 to 15:34:31**: ChatGPT.exe, chrome.exe, SystemSettings.exe (3 programs in 18 s). The evidence file says the owner ended these himself to free memory. Restart #52 at 15:45:55 is 11 min later. It is the only cluster of three or more.
- 2026-10-10 18:50:09 calibre.exe and 18:51:25 explorer.exe (2 programs in 76 s). No restart follows within 180 min (next 41: 2026-10-11 07:32).
- 2026-10-02 14:10:25 WebViewHost.exe alone (it also crashed at 14:09:36). No restart near.

A hang event is written only when a program is closed after it stopped answering. A machine that stalls completely may write none, so the lack of hang clusters before the other 51 restarts does not show that programs kept answering.

## 5. What this does and does not show

- Verified from the logs: the counts, times, groups and precursor lists; the log reach; the two bugchecks; the 360 deaths and their gaps to the next restart.
- Inferred: that the logs have not wrapped; that the 41 fields mean what their names say; the Poisson figure; that the 6008 time is unreliable.
- Not checked: the meaning of SleepInProgress 1, 4, 6; the content of the minidump; what earlier arrangements about memory were; anything before 2026-09-22 (the logs do not reach it); what the owner saw at each restart.
- For C6: the logs give no precursor for 46 of 52 restarts, and a 360 death precedes 3. The 360 explanation can at most cover those 3; the rest need another cause or evidence the logs do not hold (the recorder, running only since 2026-11-17, is the only other source).
