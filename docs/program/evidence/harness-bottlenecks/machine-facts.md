# Facts read from this PC by the main session on 2026-11-11 (read-only; nothing changed)

These bear on bottlenecks B03, B05, B08, B10, B15 and B16. They are observations, with the inference marked.

## B05 — the unexpected shutdowns (Windows System event log, last 35 days)

- **24 Kernel-Power Event 41 records since 2026-10-07**, each paired with an EventLog 6008 ("previous system shutdown was unexpected"). The bottleneck list says "two unclean PC shutdowns under load"; the log shows a series: Oct 7, 11, 13, 15, 18, 23, 27, 29; Nov 2; Nov 3 (three); Nov 4 (four: previous-shutdown times 01:28, 14:21, 15:58, 18:41); Nov 5; Nov 6 (three: 00:01, 14:58, 18:11); Nov 7; Nov 8; Nov 10 (two: 15:08, 15:25).
- **23 of the 24 have BugcheckCode = 0** (no crash code written, no dump). Microsoft documents that combination as power loss, a hard hang or a hard reset, not a recorded stop error.
- **4 carry a non-zero PowerButtonTimestamp** (Oct 13, Oct 27, Nov 2, Nov 3 08:31): the power button was held, i.e. someone forced the machine off, which is what a frozen machine gets.
- **5 have SleepInProgress = 4** (Oct 23, Nov 5, Nov 6 20:14, Nov 8, Nov 10 18:40): the shutdown happened around a sleep or resume transition, so those were not under build load.
- **One real bugcheck**: 2026-10-07, 0x000000A0 INTERNAL_POWER_ERROR (parameter 1 = 0xF0) with SleepInProgress = 1; minidump C:\Windows\Minidump\100726-15281-01.dmp (6 MB). A power-state failure during sleep.
- **No WHEA-Logger hardware-error events** in the period.
- **Commit exhaustion was logged only twice**, both on 2026-11-01 01:14 (Resource-Exhaustion-Detector 2004), naming Topaz Photo AI (about 97 GB of virtual memory) and Lightroom, not the development tools. No 2004 event sits next to any shutdown.
- Pagefile is system-managed (17 GB allocated, peak use 91 MB); commit limit 48.1 GB; 14.9 GB of commit and 7.4 GB of physical memory free at the time of reading.
- **Inference (main session):** the record does not support "memory pressure" as the cause. Windows reports memory exhaustion as Event 2004 and failing allocations; it does not power off. What the log is consistent with: mains power loss (no UPS), a thermal or power-supply trip under sustained all-core load (three to four shutdowns a day on Nov 3, 4 and 6, the heaviest build days, fit this), a hard hang ended by the power button, and a separate sleep/resume fault. Which of these only the owner and a temperature/power log can say. Research is not what this needs; a diagnosis run is: log temperatures and power draw during a full parallel check, note whether the house lost power at the logged times, decode the Oct 7 minidump, and stop the PC sleeping while sessions hold work.

## B08 / B10 — Docker and memory (docker CLI, Task Manager figures)

- 34 containers exist, **4 running** at the time of reading: `clinic-dev-db-1` (241 MiB), and an unrelated stack `postiz` (app 1.5 GiB, its Postgres 47 MiB, Redis 13 MiB). 26 containers use the image `postgres:17.11-bookworm`, one per compose project `clinic-<slice>` (clinic-s01 … clinic-s11, clinic-ui, clinic-fastcheck, clinic-linuxtests, …); 25 of them are stopped now.
- Restart policy: **31 containers `no`, 3 `always`** (the postiz stack). Docker Desktop **`AutoStart: false`**. So after a reboot nothing of the clinic comes back by itself: two settings, both known.
- **No `.wslconfig`**: WSL2 runs on defaults (memory limit 50 % of RAM = 15.18 GiB as `docker stats` shows; swap 25 % of that). `vmmemWSL` held 5.2 GB.
- Memory by process group at the time of reading (31.1 GB total, 7.3 GB free): Chrome 6.1 GB (30 processes), vmmemWSL 5.2 GB, Claude 3.2 GB (14–15 processes), ChatGPT/Codex 1.4 GB, python 1.1 GB (18 processes), Memory Compression 1.1 GB. WSL 2.7.14.

## B03 / B15 — the desktop app's settings (read with the app's settings tool)

- `keep_awake_while_working`: **On** (prevents idle sleep while a session works; a closed lid still sleeps).
- `auto_archive_on_pr_close`: **Off**; `auto_archive_inactive_days`: **0 (never)**. Both are owner settings; either would stop sessions piling up without an agent deciding to archive.
- Default permission mode: `default` (no settings tier sets one). Sessions started by a root session inherit the root's mode.
- Notifications for task completion, questions and permission requests: banners (default).

## B16 — can a subagent write a file

- Tested twice in this session (bypass-permissions mode): a `general-purpose` subagent reported a Write tool in its list, and a background workflow subagent **wrote and read back a file with no permission prompt** (`scratchpad/hb/subagent-write-probe.txt`).
- The Claude Code documentation lane found: Explore and Plan agent types are read-only; `general-purpose` has every tool; a custom agent follows its `tools:` list; the parent's bypass, acceptEdits or auto mode overrides the subagent's own; a background permission prompt surfaces in the parent session. So "subagents cannot write files" is true only for a read-only agent type, a `tools:` list without Write, or a session mode in which the background prompt is never answered.

## B11 — the clinic repository

- `git remote -v` prints nothing; 432 commits on `main`; 19 worktrees; the index holds staged, uncommitted work (the real-data switch) at the time of reading.
