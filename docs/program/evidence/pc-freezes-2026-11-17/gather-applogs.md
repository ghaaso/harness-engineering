# gather:applogs: what the Claude desktop app and its sessions recorded around the four interruptions

Written 2026-11-17 (afternoon), read-only work. All times local (UTC+5). "Verified" means I read it in a
file myself; "inference" means I drew it from what I read. No PowerShell was started for this task (not
needed): everything was done with Bash and Node. Nothing was changed, stopped or installed.

## 1. Where the app's own logs are (verified)

The desktop app is the Microsoft Store (MSIX) build. Its logs are NOT under Roaming; they are here:

| File (under `%LOCALAPPDATA%\Claude\logs\`) | Size | Last written | What it holds |
|---|---|---|---|
| `main.log` | 9.4 MB | 11-17 16:15 | The Electron main process: starts, sessions, git work, memory sampler, event-loop stall detector, bridge connection. Covers 2026-11-13 19:53 to now. |
| `main1.log`, `main2.log`, `main3.log` | 10.5 MB each | 11-13 19:53, 11-06 00:39, 10-26 22:19 | Older rotations of `main.log` (it rolls at 10 MB). Back to 2026-10-04. |
| `claude.ai-web.log` | 1.0 MB | 11-17 16:12 | The web view; warnings only, nothing around the freezes. |
| `remote-control.log` | 0.7 MB | 11-17 15:47 | Writes only on change; nothing useful. Last lines before the restarts: 00:56, 02:45, 04:57, 15:00. |
| `cowork_vm_node.log`, `ssh.log` | 25 KB, 9 KB | 11-17 15:46 | One line per app start. They give the exact start times: 01:44:50, 02:56:38, 11:59:59, 15:46:25. |
| `in-app-browser.log` | 38 KB | 11-11 | Not relevant. `mcp.log` is empty. |
| `C:\ProgramData\Claude\Logs\cowork-service.log` | 213 KB | 11-17 15:46 | The log of the app's Windows service (`CoworkVMService`, started at boot). Its start lines give boot times; it logs when the app's pipe connection ends. See below. |

Also checked: `%APPDATA%\Claude` (only a marker file), the package-local copy under `%LOCALAPPDATA%\Packages\Claude_*\LocalCache`
(no app logs; only an old staging-rig folder), `Claude-Data\...\logs` (empty), `Claude-Data\...\Crashpad\reports` (empty; the
folder was touched 15:56). No Chromium crash dump, no GPU-process-gone, no
render-process-gone, no "unresponsive", no out-of-memory line in `main.log` from 11-14 to 11-17 (searched).

`cowork-service.log` on 11-17 (verified; the service starts with Windows, so its start line is the boot):
`01:44:22 Starting CoworkVMService`, `02:56:09`, `07:45:03`, `15:46:12`. These are 15 to 16 s after the four Kernel-Power 41 times
(01:44:07, 02:55:53, 07:44:47, 15:45:56), so **the boots were at 01:44, 02:55, 07:44 and 15:45, not at 01:42** (the owner's "reset 01:42" in the evidence table is about 2 min earlier than the boot; take it as his estimate).
Only one line between a client connecting and the next boot: `07:34:27 [Server] Persistent RPC: connection ended: failed to read length: EOF`, then
"no active connections, idle timeout starts". That is the app's pipe handle closing 10 min before the reset (see interruption 3). For
interruptions 1, 2 and 4 there is no such line: the app's connection was still open when the machine went down.

**Found by listing, not opened (Windows, outside this task):** `C:\Windows\Minidump\111726-16468-01.dmp`,
6.6 MB, written **2026-11-17 07:44:54**, the only file in that folder. That is 7 s after Kernel-Power 41 at 07:44:47, so
it looks like the dump of the interruption-3 reset. Opening it needs elevation (EPERM), which I did not try to get.
EVIDENCE.md says "no crash dump exists"; this file contradicts that for interruption 3. The System-log event 1001
(BugCheck) would show its code. Not checked.

The app has two built-in detectors that matter here, both in `main.log`:
- `[process-memory]` every 55 to 64 s: process-tree memory, number of child processes, and `sys_free=` (free RAM).
- `[event-loop-stall] main process blocked for N ms (task <what>)` when the main process's own loop is blocked.
  The `task` names what the loop was inside, for example `spawn:git`, `spawn:taskkill`, `spawn:reg`.

## 2. App log around each interruption (main.log; every line below is quoted, with paths shortened)

Cadence: before each gap the log shows a `process-memory` line about once a minute, and PR/git refresh lines about every 30 s.

### Interruption 1 (owner: stall about 01:20, reset 01:42; Kernel-Power 01:44:07)
Last lines before the gap (gap = 01:26:39 to 01:44:48, **18 min 9 s with no line**; the next `process-memory` was due about 01:27:14):
```
01:10:08 to 01:10:41  14 x [warn] [event-loop-stall] main process blocked for 561..2014ms (13 x task spawn:git, 1 x spawn:taskkill)   (+ 8 "git status/ls-files timed out" errors at 01:10:35)
01:20:12  [gitDiff] fetchWorkingTreeDiff timing: metadata=4475ms diff=1486ms total=5962ms     (01:20:13: metadata=5860ms)
01:25:11  [process-memory] interval tree_rss_sum=4996MB children(55)=2521MB ... sys_free=11801MB/31860MB
01:26:00  [EventLogging] Flushing 2 events
01:26:14  [process-memory] interval tree_rss_sum=5018MB children(56)=2527MB ... sys_free=11781MB/31860MB
01:26:39  [WorktreePool] untracked-dir GC: 20 untracked dir(s), 0 past min age, 0 removed        <- last line
```
First lines after: `01:44:48 [info] Starting app { appVersion: '5.11492.5' ...}`; `01:45:01 [CCD] session spawn on required_version:2.1.325`;
`01:45:48 [process-memory] tree_rss_sum=2734MB children(5)=391MB sys_free=19224MB`.
No "Windows session ending" line before the start (the app's clean-shutdown marker), so it was not a clean shutdown.

### Interruption 2 (owner: "everything crawled" from 02:34; restart 02:55; Kernel-Power 02:55:53)
Gap = 02:50:51 to 02:56:36 (5 min 45 s). Before it:
```
02:34:11  [process-memory] interval tree_rss_sum=3226MB children(37)=1198MB ... sys_free=18349MB/31860MB    (children were 11 at 02:33:12)
02:34:11 to 02:50:11  17 more [process-memory] lines, one a minute; children 37 falling to 33, sys_free 18.5 to 18.7 GB
02:49:57  [remote-tools-device] rotation due; "served get_device_info"; "credential re-verified in-band"    (the app answered a request from the bridge)
02:50:11  [process-memory] interval tree_rss_sum=2973MB children(33)=971MB ... sys_free=18614MB/31860MB
02:50:51  [oauth-v2] lookup orgId=... using cached token                                               <- last line
```
No `event-loop-stall` line between 02:34 and the gap. First lines after: `02:56:36 Starting app`; `02:57:36 [process-memory] tree_rss_sum=2691MB children(5)`;
`02:58:37 [event-loop-stall] blocked for 512ms (task spawn:git=637ms)`.
The `process-memory` line at 02:34:11 shows 26 more child processes (11 to 37) and 680 MB more than a minute before: the helpers had just started their test runs when the transcripts stop (02:34:03).

### Interruption 3 (about 05:12; PC reset 07:35 to 07:44; Kernel-Power 07:44:47; the 360 service died 05:04:19)
Gap = 05:12:48 to 05:37:31 (**24 min 43 s**), then one line, then nothing until 11:59:57 (the app was not started again after the reset until then).
```
05:04:01  [process-memory] interval tree_rss_sum=3260MB children(30)=1006MB ... sys_free=17311MB/31860MB
05:12:07  [process-memory] interval tree_rss_sum=3663MB children(38)=1409MB ... sys_free=18385MB/31860MB
05:12:15 to 05:12:48  PR/git refresh every ~30 s; "fetchWorkingTreeDiff timing: metadata=156..288ms" (normal speed)
05:12:48  [gitDiff] fetchWorkingTreeDiff timing: metadata=228ms diff=273ms total=501ms                 <- last line before the gap
05:37:31  [warn] [git] heavy-work gitRun failed: Failed to spawn <Git>\cmd\git.exe: spawn EPERM          <- the only line until 11:59:57
11:59:57  [info] Starting app { appVersion: '5.11492.5' ...}
```
The git refresh due at about 05:13:20 and the memory sampler due about 05:13:07 never logged. The first thing the main process
wrote after 24 minutes was a **failed process start (EPERM) of git**, with **no** `event-loop-stall` line and **no** "tick arrived N s late" line.
So at 05:37 the main loop was not reported blocked; it was probably waiting for a child. Mechanism not observed.
`cowork-service.log`: the app's pipe connection ended at **07:34:27** (EOF). So the app process existed until 07:34:27 (the owner closing it, or it ending), about 2 h after its
own log went quiet at 05:37:31 and 10 min before the reset (boot 07:44; service start 07:45:03). The app log has nothing between 05:37:31 and 11:59:57, so the app's
closing at 07:34:27 left no line either (not explained; the app's own log writer may have been the thing that was stuck).

### Interruption 4 (15:43; Kernel-Power 15:45:56; restart 15:46:22)
Gap = 15:44:36 to 15:46:22 (1 min 46 s). Before it, the main process was alive and doing network work for 73 s after the first stuck call:
```
15:16:26  [warn] [event-loop-stall] main process blocked for 6571ms [likely sleep: duration_heuristic] (task ccd:spawn_query:until_spawned=6673ms)
15:43:28  LocalSessions.getPrReviewComments / getPrChecks ...                       (5 s after the stuck Bash)
15:43:42  [remote-tools-device] socket closed: 1006      15:43:42 reconnect #1 in 1543ms
15:43:44  [remote-tools-device] connecting wss://bridge...; socket open; authenticated        (network and TLS from the app worked)
15:43:48  [process-memory] interval tree_rss_sum=6890MB children(63)=4408MB ... sys_free=19315MB/31860MB
15:44:26  [WarmLifecycle:preview] Starting idle timeout for local_d67d...: 1800s
15:44:36  getPrChecks / getPrReviewComments; [WarmLifecycle:preview] Warming up session local_d67d...   <- last line
```
Expected `process-memory` at about 15:44:48 and a refresh at about 15:45:06 never logged. A socket close 1006 occurs several times a day
(11-17: 00:10, 01:48, 13:05, 13:15, 14:19, 15:43), so it is not a marker. First lines after: `15:46:22 Starting app`; `15:47:24 [process-memory] children(5) sys_free=18806MB`.
**New, right after the reboot** (fresh 360 service): the main loop was blocked inside a program start again and again, each time tagged by the app itself
"[likely sleep: duration_heuristic]" although the PC was awake:
`15:48:42 8510 ms spawn:git`, `15:53:39 21367 ms spawn:git`, `15:54:11 17473 ms spawn:taskkill`, `15:56:04 11748 ms spawn:git`, `15:56:36 17381 ms spawn:taskkill`.
Before the reboot, on 11-17, the biggest spawn stall was 2364 ms (00:26), and from 01:10:41 to 15:16 none above 1.3 s.

Free RAM in the last `process-memory` line before each gap: 11,781 MB (01:26), 18,614 MB (02:50), 18,385 MB (05:12), 19,315 MB (15:43), of 31,860 MB.
No app log line shows a memory shortage at any of the four.

## 3. Session transcripts

Method: all transcripts modified on 11-17 (155 files, `journal.jsonl` excluded; 103 of them in the EMS project folder, the rest in other
project folders; main sessions and `subagents/` helpers), read line by line with Node; only the timestamp, tool name, tool-use id and the
first 80 characters of a command were kept (paths shortened). 5,933 tool calls and 5,925 results between 00:00 and 17:00.
"Pending" = a tool call with no result written before the restart. The coordinating session's pending call carries a synthetic result
"Tool call interrupted" written 7 to 15 s after the app restarted (01:45:03, 02:56:44, 12:00:16, 15:46:30): that is the harness cleaning up on restart, not an answer.
Sub-agent calls got no such marker (their transcripts simply end).

Time of the last tool result that arrived, **any session in any project folder**:

| # | Last result (any session) | What it was | Next thing written anywhere | Calls with no result |
|---|---|---|---|---|
| 1 | 01:25:27.934 | Bash (helper a1b2a3) | 01:25:27.946 a model request (`api-request`) by that helper; **no reply ever written** | 3 |
| 2 | 02:34:02.649 | **Read** (helper add769) | 02:34:02.667 a model request by that helper, 02:34:02.994 a Bash issued by another helper | 6 |
| 3 | 05:12:00.804 | **Edit** (helper ad1211) | 05:12:03.990 a Bash issued by the same helper | 4 |
| 4 | 15:43:26.523 | **Read** (helper a20b86 of session 7abf9f82) | 15:43:28.210 a bookkeeping line (`deferred_tools_record`) in that helper; nothing else | 1 |

Pending calls (issue time, session, tool, first 80 characters, paths shortened):

**1** (restart 01:44:48)
- 01:18:51 coordinator, Bash: `B="<e24f17dc.../...>" W="<workflows/wf_990...` (a wait/poll command; interrupted marker 01:45:03)
- 01:20:28 helper a1b62f, Bash: `cd "<tmp/u3b-run>" && timeout 900 node --test --test-reporter=spec tcb/test/self...` (may legitimately run up to 15 min)
- 01:22:59 helper a5b8bd, Bash: `cd "<scratchpad>" && sed -i "s| if (k.spec. |...` (a short command; this helper's Bash calls had returned in 0.5 to 1.3 s every few seconds up to 01:22:55; its next one never returned. Another helper's Bash issued 01:23:12 returned in 0.6 s, and one issued 01:23:26 returned at 01:25:27.)

**2** (restart 02:56:36)
- 02:27:44 coordinator, Bash: `bash "<coord/tcb_tick.sh>" 570` (a 9.5 min wait; interrupted marker 02:56:44)
- 02:33:31 a009ef Bash: `cd <scratchpad/u3b-smoke> && node --check ../tcb-build/tcb/selftest.mjs && node ...`
- 02:33:47 aa4904 Bash: `cd <model-review/r3>; node mk.mjs contract-watch && node mk.mjs contract-watch-n...`
- 02:33:56 a06a9b Bash: `cd <tcb-build/tcb> && mkdir -p ../tmp ../tmp/u2a-logs && time node --test test/h...`
- 02:34:01 a032b7 Bash: `cd <tcb-build/tcb> && export NODE_OPTIONS=--max-old-space-size=1024 && time node...`
- 02:34:02.994 af36ac Bash: `cd "<tcb-build/tcb>" && for f in test/replace.test.mjs test/admit.test.mjs test/...`
  (most are test runs that can take minutes, so "pending" alone does not show a hang; what shows the stop is that nothing at all came back after 02:34:02.649)

**3** (reset 07:44; app restart 11:59:57)
- 05:08:44 coordinator, Bash: `B="<e24f17dc.../...>" T="<projects/harness...` (interrupted marker 12:00:16)
- 05:11:13 a32eef Bash: `cd <scratchpad/tcb-build> && node tools/lane.mjs --label fix-U2 --timeout-s 300 ...` (lane log: `timeout` at 05:16:19, no `end`)
- 05:11:58 aba4b1 Bash: `cd <scratchpad/tcb-build> && node tools/lane.mjs --label fix-U1-full-admit-stop ...` (lane log: `timeout` at 05:16:58, no `end`)
- 05:12:03.990 ad1211 Bash: `B=<scratchpad/tcb-build>; grep -n "MUTATION" $B/tcb/*.mjs; cd $B/tcb && node $B/...` (a short grep, then a node run)

**4** (restart 15:46:22)
- 15:43:23.254 coordinator (this session), Bash: `PAD="<e24f17dc.../scratchpad>"; T="$PAD/tcb-build/tcb";` (the `grep` over a few files; marker 15:46:30)

Lane log cross-check (the coordinator's own log, `scratchpad/tcb-build/lane/log.jsonl`, read only): for interruption 3, the two lane
processes that were running logged `timeout` after 300 s at 05:16:19 and 05:16:58, so **node programs already running were still running and
writing files 4 to 5 minutes after the last tool result**; the timeout handler's `taskkill` (a new program) wrote no `end` line; a third lane
process wrote `busy fix-U3-st-canary` at 05:27:04. This is the coordinator's evidence file's own item, re-read, not new.

Model-reply latency in these transcripts on 11-17 (4,248 request-then-reply pairs): median 3.2 s, 90th percentile 17.8 s, 99th 110 s, maximum 528 s.

## 4. What this shows about the order of events (verified facts, then inference)

Verified:
1. At every interruption the transcripts of **all active sessions stop within a few seconds of each other** (interruption 4: last results at
   15:43:23.9, 24.3 (a Bash), 24.5, 26.0 and 26.5 in three helpers of one session, and the coordinator's Bash stuck at 15:43:23.254; interruption 2: the last lines of 11 sessions
   fall between 02:33:31 and 02:34:03). In no case does any session write a result or issue a call again until the restart.
2. The **first call that never came back is a Bash** in interruptions 1 (a short `sed -i`), 3 (a short grep-then-node, at 05:12:03.990) and 4 (a short `grep`).
   In 2 the pending Bash calls are mostly long test runs, so the first is not identifiable.
3. **Calls answered inside the app still worked after a Bash was stuck**, but only for seconds: interruption 4, Bash stuck at 15:43:23.254, then Read 23.9, Edit 24.5, Read 26.0, Read 26.5
   returned; interruption 2, a Bash issued 02:34:01.184 never returned, a Read issued 02:34:02.610 returned in 39 ms. Another Bash issued 0.3 s before the stuck one at 15:43:22.947
   returned in 1.3 s, and one issued 0.3 s after the stuck one at 02:33:56.856 returned in 0.3 s. So a start can fail while its neighbours succeed.
4. After the last tool result, the sessions' next step is a **model request** (`api-request` lines at 15:43:24.3 and 15:43:26.0; 01:25:27.9; 02:34:02.7 and others). No reply was ever recorded for them before the restart (3 min in 4, 19 min in 1, 22 min in 2), against a normal 99th percentile of 110 s.
   So not only program starts stopped; the sessions' own request/reply loop stopped too, within about 3 s of the first stuck Bash.
5. **The app's main process kept running after the sessions stopped**, for 47 s (3), 70 s (4), 71 s (1) and 16 min 48 s (2). In 2 it kept sampling memory every minute and answered a bridge request at 02:49:57; in 4 it reconnected and re-authenticated its web socket at 15:43:44.
   Then its own log stopped (01:26:39, 02:50:51, 05:12:48, 15:44:36), 1 to 25 minutes before the restart. In 3 its next line was a failed `git` start (`spawn EPERM`) 24 min 43 s later. The sessions are children of this app.
6. Memory was not short (free 11.8 to 19.3 GB at the last sample before each gap), and neither the app log nor the transcripts show an error from the model or the network side.

Inference (not observed):
- The pattern "sessions stop first, within seconds; the app's main process runs on, then stops later; the first call to fail is a program start" fits a **blocked process creation** (a start that
  never returns, from a filter or a lock in the kernel) better than a memory or processor shortage. It would explain why the many `node` child sessions, each of which starts programs and writes files with synchronous calls, all stop together, while the main process, which starts a program only when it refreshes git or PRs, lasts until its next start.
- It does not explain why the sessions' model replies also stopped; a session whose loop is stuck inside a synchronous start would not process a reply either. I did not see this proven.
- Interruptions 1 and 2 have the same transcript signature as 3 and 4, so C2's "same signature" holds for the transcripts. Whether the 360 service's memory was involved in 1 and 2 is not answered by any app or transcript record.

## 5. The same signature on earlier days, in the same `main.log` (new, not asked for)

The stall detector recorded the main process blocked inside **one program start for a very long time**, then resuming, **without a restart of the PC**:
- 2026-11-13 22:58:03 `[event-loop-stall] main process blocked for 7560034ms [likely sleep: duration_heuristic] (task spawn:taskkill=7560030ms ...)`, the log silent 20:51:48 to 22:58:03 (126 min), then "git config --list exited without an exit code", "timed out after 120000ms", and "Timer fired 7532s late **with no resume event**".
- 2026-11-14 17:13:33 `blocked for 3779918ms [likely sleep: duration_heuristic] (task spawn:git=3780021ms)`, the log silent 16:10:25 to 17:13:33 (63 min); in the same second a `spawn EPERM` for git and "Timer fired 3757s late with no resume event"; at 17:29:38 four sessions logged "timed out after 960s of inactivity"; the PC booted at 18:05 (service log 18:05:26). Here the app's whole loop was held (late timers), unlike 11-17 05:37 where no late timer was logged.
- 2026-11-16 02:38:12 and 22:56:38 were **real sleeps** (the app says `[likely sleep: power_event]`), different from the two above.
- `spawn EPERM` (process start refused) appears exactly twice in the four rotated logs (back to 2026-10-04): 11-14 17:13:33 and 11-17 05:37:31. Both come right after a long silence in the log. EPERM on starting `git.exe` is what a program-start refusal by a filter driver would look like; I did not see which component refused it.
The app's "likely sleep" label is a duration guess; no power event was logged for these two. Whether the PC was asleep on 11-13 and 11-14 was not checked here (Windows power log).

## 6. Limits of this reading

- The app log shows only what the main process wrote; the sessions' CLI processes have no log of their own on disk (only the transcripts).
- A transcript shows a call issued and a result written; it cannot show whether a pending call ever started. Long test runs (up to 900 s) are among the "pending" ones.
- The last-result times are the last **written** results. A result that arrived while the transcript write was itself blocked would be missing; no transcript write was seen failing.
- Interruptions 1 and 2 are covered by the app log and transcripts only; there is no recorder, no per-process counter.
- No way here to tell why the main log stopped 1 to 25 minutes before each restart (blocked loop, blocked file write, or the machine itself stopped). The Windows side is the coordinator's.
- `main.log` contains the owner's paths and session ids; I quoted only shortened lines and no message text.

Scripts used (scratch, not copied here): `C:\Users\User\AppData\Local\Temp\claude\192654871f6b1294\e24f17dc-4aea-4914-a9d1-280a723d620e\scratchpad\applogs\` (`extract.js`, `analyze.js`, `alllines.js`, `lastline.js`, `tail.js`, `lat.js`, `lane.js`, `gaps2.js`, `pm.js`).
