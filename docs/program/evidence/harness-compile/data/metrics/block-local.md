# Dossier: block "local" (mechanisms: machine, human_wait)

17 bottlenecks and 44 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### B05 · The PC powers off without warning
family machine; state: Open: Join done; logger awaits my install; v2 phase 1; package WP1; metrics: throughput, time (primary throughput)
what: The PC shuts down unexpectedly and stops all agent work. Most events leave no crash code and many came with no Claude activity; the cause is not yet found.
evidence: 24 since 7 Oct, 23 without crash code [M] (compile); 25 since 1 Oct, 15 with no Claude call ten minutes before [M] (phase 1). 13 Nov: off 28 minutes, eight lanes cut [M].
what fixing it unlocks: The next event leaves a trace naming its cause; zero sleep-related events in 14 days [T]; push checkpoints make every stop cheap to recover.
first step: Turn off sleep on mains, add a temperature, power and memory logger, decode the 7 Oct dump, note mains cuts.

### B08 · Memory is short on this PC
family machine; state: Open: Open in clinic; FixFlow capped at eight sessions; package WP2a; metrics: throughput, efficiency (primary throughput)
what: RAM, not CPU, sets how many check slots, sessions and lanes can run at once; nobody has yet split memory use by process group during a build.
evidence: Clinic: 2-6 GiB available, lows 0.0-0.8 GiB with two checks [M]; browser 6.1, WSL2 5.2, Claude 3.2 GB [M]. FixFlow, 13 Nov: 5.5-7.7 of 31 GB free, eight lanes [M].
what fixing it unlocks: A table of who holds memory when under 2 GB [T] is free, so slots, caps and lane counts come from evidence.
first step: Run one build day with a per-process-group memory sampler, then choose a shared test database, a WSL2 cap, or closing apps.

### B10 · Docker and databases need a manual start after a reboot
family machine; state: Open: D03 answered 'not now' (11 Nov); package WP1; metrics: time, throughput (primary time)
what: After a restart, Docker and the databases stay down until started by hand; in FixFlow a stopped Docker engine blocks every backend gate and dump restore.
evidence: Docker AutoStart off; 31 of 34 containers have restart policy 'no' [M]. Restarted by hand on 9 Nov (clinic) and 13 Nov (FixFlow, after the power loss).
what fixing it unlocks: Databases healthy within 3 minutes [T] of sign-in with no command; backend gates and restores no longer wait on a person.
first step: Revisit D03: start Docker at sign-in; unless-stopped on at most two in-use databases until power-offs are diagnosed.

### B11 · The work exists only on this PC
family machine; state: Open: D02 chose encrypted drive; copy not yet made; package WP1; metrics: quality (primary quality)
what: The clinic repository has no remote and no off-machine copy, and parts of its work are uncommitted; the planned knowledge store would also start on one disk.
evidence: 432 commits, 19 worktrees, 36 branches, 55 MB packed, no remote, only drive C: [M]. Six untracked paths a bundle would miss [M]. No second drive attached (11 Nov).
what fixing it unlocks: Work survives losing the PC: a clone from the copy shows the same heads, and the copy is under 24 hours old [T].
first step: Attach the encrypted drive; make and verify a git bundle of every branch; nightly copy including uncommitted work.

### B15 · Worktrees and containers pile up
family machine; state: Open: Waits on D10; harness v2 phase 2; package WP2a; metrics: efficiency, throughput (primary efficiency)
what: Leftover worktrees, branches, sessions and containers use disk and memory. Clean-up waits for my rule, after one archive hit a session still in use.
evidence: Clinic: 19 worktrees, 36 branches, 34 containers, 25 of 26 databases stopped [M]. The app's auto-archive settings are off [M].
what fixing it unlocks: Worktree and container counts return to the active slices plus one after each merge [T]; no session lost to clean-up.
first step: I set the archive rule (D10); build a dry-run reaper listing merged, clean worktrees and their containers.

### MC-FS · Windows file-system traps for shared stores
family machine; state: Open: Fixes F1-F3 designed; store not built; package WP1; metrics: quality, efficiency (primary quality)
what: Shared stores on Windows hit traps: rename-over-existing fails, AppData can be virtualised for processes the Claude desktop app starts (see AppData virtualisation), SQLite reports busy under many writers, and CLI versions skew across worktrees.
evidence: Plain rename: 99-126 failures per 8 x 1,000 identical events [M]. SQLite: 2-4 busy failures per 1,200 writes at 8+ writers [M]. Content was never torn.
what fixing it unlocks: A journal that never loses or duplicates a write, shared safely across every worktree.
first step: Keep the store home at the profile root; test the publisher that never renames over an existing file with 8-16 concurrent writers.

### MC-DOCKERCACHE · Docker VM page cache holds on to RAM
family machine; state: Closed: Cache dropped at start and end of backend runs; package WP1; metrics: throughput, efficiency (primary throughput)
what: The WSL2 virtual machine that runs Docker kept disk cache it was not using while the host was short of memory.
evidence: Docker VM held 8.3 GB, 4.4 GB of it unused cache, with eight lanes [M]. Later 6.9 GB of cache against 0.4-0.5 GB per gate stack [M].
what fixing it unlocks: Memory returned to the host at once: 2.2 GB on the first drop [M], leaving more room for lanes and slots.
first step: Extend the cache drop to other heavy job kinds if memory runs short again.

### MC-AV · Antivirus blocks toolchain files
family machine; state: Partly closed: Worked around; the block is left alone; package WP1; metrics: time (primary time)
what: The active antivirus blocks one emulator DLL every time, and once blocked a JDK DLL, so Google's sdkmanager (the Android SDK’s package installer) abandons the package.
evidence: One emulator file permanently absent; the rest of the 8.6 GB toolchain installed and checked against official archives [M].
what fixing it unlocks: No Android work is blocked today; allowing the folder, my decision, would only matter if an ANGLE GPU mode were needed.
first step: Keep the emulator in -gpu host or swiftshader_indirect mode; never change an antivirus setting.

### MC-TOOLS · Missing local tools on the PC
family machine; state: Partly closed: Android tools installed 13 Nov; gates use Docker; package WP1; metrics: quality, time (primary quality)
what: No Python on PATH and no installed node_modules, so backend gates run only in Docker and native questions are answered from cached sources.
evidence: Backend gates were blocked at G1 until Docker ran [M]. A Python exists only at the Codex runtime path.
what fixing it unlocks: CI-equivalent gates locally, and native questions answered without Docker-only workarounds.
first step: Finish the P0a item 10 tool check and record which tools exist and where.

### MC-CPU · CPU contention from parallel sessions
family machine; state: Partly closed: GPU route in use for side jobs; package WP1; metrics: time, throughput (primary time)
what: When other sessions run test suites on all cores, CPU side jobs slow sharply; GPU work was the one thing not slowed.
evidence: Under that load, CPU transcription ran at 2.7x real time vs 19-45x on the GPU [M].
what fixing it unlocks: Heavy side jobs moved to the otherwise idle GPU, leaving the cores for gates.
first step: Route transcription and similar heavy side jobs to the GPU by default.

### MC-ENGINE · Graph engines hard to run here
family machine; state: Partly closed: Linux image built; timing redesigned; package WP7; metrics: time, quality (primary time)
what: Graph engines were hard to run on Windows: LadybugDB's algorithm extension would not load, Docker is off by default, sessions died, and CPU contention spoiled timing.
evidence: Fixed with a 1.26 GB Linux image [M]; 172 MB of Windows copies sit unused [M]. Timing aborted twice under CPU load; the session died twice.
what fixing it unlocks: Every engine arm on identical footing, and usable timings even on a busy PC.
first step: Run interleaved timing blocks, alternating engines, with host load logged per block.

### MC-NOEMU · No Android emulator inside Docker
family check; state: Closed: Native emulator boots under WHPX (13 Nov); package WP9; metrics: quality, time (primary quality)
what: The Docker VM has no /dev/kvm, so the device lab must run its emulator natively on the Windows Hypervisor Platform.
evidence: 0 svm flags in the Docker VM [M]. A native emulator booted Android 14 on 13 Nov, holding 3.8 GB of host RAM [M].
what fixing it unlocks: A device lab on this PC, using an RTX 5070 that has no other job in the program.
first step: Measure whether a second emulator fits in RAM before running two at once.

### MC-HEREDOC · Shell tool alters long scripts
family orchestrator; state: Partly closed: Worked around: scripts written with the file tool; package WP10a; metrics: efficiency, token_count, time (primary efficiency)
what: The Bash tool here collapses doubled backslashes inside heredocs and silently cuts commands over about 8 KB, which breaks long generated scripts.
evidence: One review run's first pass lost its families to a mangled regex: 1.38M tokens and 15 minutes [M].
what fixing it unlocks: No more runs lost to tooling, and long scripts that arrive intact.
first step: Keep the rule: write scripts with the file tool, in parts under about 6 KB, then check the tail.

### B03 · Work waits for me when I am away
family owner-process; state: Open: D06 answered; harness v2 phase 1 not built; package WP1; metrics: throughput, time (primary throughput)
what: Restarts wait for me: Docker and sessions stay down after a power-off, parked sessions wait for my message, and a resumed session can drift from its record.
evidence: About three days idle after the 6 Nov power-off at 14:58 [M]; no commits 7-8 Nov [M]; three more power-offs followed [M]. A 1 Oct limit stall lasted 3 h 06 min [M].
what fixing it unlocks: Idle time between 'could resume' and the next commit falls from about three days [M] to under three hours [T].
first step: Build the restart chain and a resume list at sign-in; release sessions two at a time.

### B14 · I cannot see progress
family owner-process; state: Open: Harness v2 phase 2; not built; package WP2a; metrics: time, efficiency (primary time)
what: During long calls I get no sign whether work is waiting, running or stalled, nor its queue position or the test running.
evidence: A check may wait up to 2,700 s [S] for a slot before a 5-18 minute run; one 49-minute foreground polling loop is on record [M].
what fixing it unlocks: The longest gap between heartbeats under 60 s [T]; I see waiting, running or stalled at a glance.
first step: The check writes a heartbeat file with queue position; checks run in the background, never polled in the foreground.

### PR-P0A · Code phases waited on my P0a
family owner-process; state: Partly closed: Section 7 lanes build ahead; P0a not started; package WP11; metrics: throughput, time (primary throughput)
what: Ship plan v8 ran one phase at a time and its first phase, P0a, was my own pre-flight, so every code phase queued behind it.
evidence: Twelve days after v8 no code phase had started [M], because each one waited behind P0a. On 13 Nov production still answered Railway's edge 404 [M]; 37 of 56 phases wait behind P0a [M].
what fixing it unlocks: Parallel lanes now build ahead: eight lanes ran on 13 Nov [M]. Finishing P0a unblocks all work that reaches a phone or host.
first step: I start P0a: the tools check (item 10) and the fleet hold notice (item 1), by hand.

### PR-OWNERWAIT · Agent work waits on my actions
family owner-process; state: Open: Open by design; package WP11; metrics: throughput, time (primary throughput)
what: By design, deploys, restores over live data, key rotation and installs are mine; design agents need my answers and rig fixes need my administrator prompt.
evidence: 2 decision forms planned [T]; one administrator prompt per test-rig start.
what fixing it unlocks: Agents prepare exact commands and I run them safely; drills can run unattended once prompts are cleared.
first step: Issue the decision forms at G1; I stay present for rig prompts.

## Ideas (most mature first)

### MAC-02 · Resume-safe long runs and sleep prevention
stage: In use; package WP1; metrics: time, throughput (primary time); answers: B03, B05, B10, B09
problem: A Windows sleep or a usage-limit stop in mid-run produced false timeouts and lost progress.
how: Save run state around each step with a continue entry; keep the PC awake during runs; check long log gaps against sleep records.
where it stands: In use in the testbed drivers: wall time 16,888.984 s [M] vs 2,661.859 s awake [M]; sleep gap 14,227.125 s [M]. Two arms hit the account limit mid-compaction and resumed in-session [M].
next: Check sleep and wake records before blaming the agent or network for a stall.
origin: Clinic testbed

### MAC-04 · Parked starts released later by message
stage: In use; package WP1; metrics: throughput, time (primary throughput); answers: B03, B04, B07, PR-DELIVERY
problem: New sessions can start only on a turn I begin, so work stops while I am away; messages reach a busy lane only at turn end.
how: On my turn, pre-create dependent sessions with a parked-start brief; release each later by message when a dependency merges.
where it stands: In use in the testbed: used 6 Nov for three parked sessions [M]; it did not prevent the 6 to 9 Nov halt. Releasing all at once on 9 Nov caused a 2,030 s [M] queue.
next: Keep it; release two sessions at a time, aiming at idle under three hours [T].
origin: Clinic testbed

### MAC-05 · Dead locks after a boot; commit and push at every green checkpoint
stage: In use; package WP1; metrics: throughput, time (primary throughput); answers: B05, B10, B11
problem: The PC lost power for 28 minutes [M] on 13 November and cut off eight [M] lanes. We want stale locks never to block the lanes afterwards.
how: Locks older than the last boot are dead. Lanes commit and push at each green checkpoint; the coordinator restarts Docker, then wakes each lane.
where it stands: In use: implemented in the slot and gate scripts after the event. After the 28-minute [M] outage, all eight [M] lanes resumed from their worktrees.
next: Add off-machine copies of unpushed work (suggested; not yet decided). That could make longer outages safe too.
origin: Ship plan §7 (13 November power loss)

### MAC-06 · Shared-machine etiquette and session ceiling
stage: In use; package WP1; metrics: throughput, efficiency (primary throughput); answers: B08
problem: Another project's containers share this PC, so touching Docker could break them, and too many sessions would use up the memory.
how: FixFlow sessions remove only fixflow-* containers, never restart Docker or WSL, never prune networks, and swap shared scripts atomically. Eight [S] sessions at most.
where it stands: In force (rated adopt). With eight lane sessions, 5.5 to 7.7 GB [M] was free of 31 GB [M], and commit was 35 to 41.5 GB [M] of 50.1 GB [M].
next: Raise the ceiling only after memory is measured free; lower it to about six [S] sessions when memory is tight.
origin: Ship plan §7

### MAC-07 · Leave the antivirus alone; unpack from official archives
stage: In use; package WP1; metrics: none (primary none); answers: MC-AV
problem: The antivirus scanner blocks one emulator file, which makes Google's package tool abandon the package. We want the lab to work without changing any antivirus setting.
how: Unpack from Google's named archives, verify every file's name and size, leave the blocked DLL absent, and use host or software GPU mode.
where it stands: In use: all installed files match the official archives except the one blocked DLL [M]. FixFlow never changes an antivirus setting.
next: Keep using it. I may allow the Android folder later; it is not needed today.
origin: Ship plan §7 (coordinator, 13 November)

### MAC-08 · Windows-host traps recorded as lessons
stage: In use; package WP1; metrics: efficiency, time (primary efficiency); answers: MC-FS, PR-FALSEGREEN
problem: Windows shell quirks gave us false passes and extra rounds, and we want each one to be known before an agent hits it.
how: Each trap is a written lesson: grep -c on carriage returns lies, Python writes CRLF, heredoc EOF failures, shared temp logs, Hyper-V gotchas.
where it stands: In use in the testbed as notes only; no check enforces them. One rerun cost a 16-minute [M] check; each Hyper-V trap cost 10 to 40 minutes [M].
next: Write logs to the scratchpad and check line endings with git ls-files --eol; turning notes into checks could unlock more.
origin: Clinic testbed

### MAC-09 · Concurrency cap and load rules after two shutdowns
stage: In use; package WP2a; metrics: throughput, time (primary throughput); answers: B05, B07, B08, B09
problem: The PC shut down uncleanly on 5 and 6 November under concurrent full test runs, two of the 24 [M] power-offs we later counted; the cause is still open.
how: At most three or four children and one full check at a time, enforced by a lock; slots replaced the lock on 6 Nov.
where it stands: In use in the testbed as a mitigation, not a diagnosis; cause never found. Free memory 0.0-0.8 GiB at lows with two checks beside six sessions, 2-6 GiB with one [M].
next: For FixFlow on the same PC, add a memory-aware slot gate and sample CPU and free memory every second.
origin: Clinic testbed

### MAC-11 · Drop Docker's page cache after each backend run
stage: In use; package WP2a; metrics: throughput, efficiency (primary throughput); answers: MC-DOCKERCACHE, B08
problem: The Docker virtual machine hoards disk cache it is not using, starving Windows of RAM while lanes run.
how: The gate script runs a privileged container that drops the page cache at the start and end of every backend run; no data touched.
where it stands: In use in the gate script. The first drop gave back 2.2 GB [M]; the VM held 8.3 GB [M], 4.4 GB [M] of it unused cache.
next: Keep using it.
origin: Ship plan §7; coordinator measurement

### CHK-07 · Retry for Windows loopback error 10055
stage: In use; package WP2a; metrics: quality, time (primary quality); answers: B09, B06
problem: The Windows socket error 10055 (no buffer space available) made checks fail spuriously: 2 of the first 22 full runs [M].
how: A helper retries only that error, 0.02 s [S] apart, up to five times [S]; a serial-pass retry fails the step, parallel retries are reported.
where it stands: In use in the testbed: no further failure in 17 full runs [M] after the retry. Port exhaustion was ruled out (TIME_WAIT peak 352 [M]); the cause is not found.
next: Use the same narrow bounded retry if FixFlow sees this refusal.
origin: Clinic testbed

### CHK-18 · Weighted machine-wide slot lock for heavy jobs
stage: In use; package WP2b; metrics: throughput, efficiency (primary throughput); answers: B08, B07
problem: We want eight lanes starting at once never to exhaust this PC's 31 GB [M] of RAM with stacks, test runs, builds and emulators.
how: ff-slot gives out 3 [S] slots (2 [S] while a Gradle lane runs). Backend stacks, Jest, Vitest and emulators take 1; a Gradle build is exclusive.
where it stands: In use: every gate run takes a slot. A backend stack used about 0.4-0.5 GB [M], not its 3 GB [S] cap; free RAM with eight sessions was 5.5-7.7 GB [M].
next: Raise the slot count only after more free RAM is measured.
origin: Ship plan §7

### CHK-19 · Gates share the database container's network
stage: In use; package WP2b; metrics: throughput (primary throughput); answers: MC-NETPOOL
problem: We want gates to run when another project's 29 [M] networks have used up Docker's address pools, which stopped the first gate design.
how: Gates join the database container's network, so the database is at localhost as in CI. A real network takes an explicit subnet in 10.77.0.0/16 [S].
where it stands: In use, fixed in commit be2e27a. The address-pool error was measured on 2026-11-13 [M] and no longer blocks gates. Design Appendix C still cannot run as written.
next: Use the working dump script for dumps. Keep; FixFlow never prunes networks it did not create.
origin: Ship plan §7, found by running the first gate draft

### PAR-03 · Build ahead by classifying each Entry clause
stage: In use; package WP4; metrics: throughput, time (primary throughput); answers: PR-P0A
problem: Entry lines mixed code, value, deploy and evidence conditions, so every code phase waited for my work even when it could be built.
how: Class each Entry clause: code, value, deploy or evidence. Only code delays a build, and the lane stacks on the other phase's reviewed tip.
where it stands: In use in FixFlow: four phases built ahead on 2026-11-13 (P7a, P6a, P9-0a, P12a) [M]; none merged yet. It could free the queue behind P0a for 15+ code phases [E].
next: Rebase stacks with git rebase --onto origin/main after each squash merge.
origin: Ship plan §7

### SKL-01 · Local GPU speech-to-text for blocked recordings
stage: In use; package WP10a; metrics: time, throughput (primary time); answers: MC-ACCESS
problem: YouTube blocks caption requests from this machine's address, so talks cannot be read from captions.
how: Download audio-only streams and transcribe them with faster-whisper distil-large-v3 in a throwaway uv environment on the RTX 5070. Nothing is installed system-wide.
where it stands: In use: 9 recordings, about 7 hours, 172 MB [M], transcribed in about 12 minutes [M] on GPU at 19-45x real time [M]; CPU with other sessions loading managed 2.7x [M].
next: Reuse it for the 12-Factor Factories talk when published.
origin: Dex Horthy sweep, using faster-whisper

### OWN-01 · One-page view for me beside agent packets
stage: In use; package WP11; metrics: time, efficiency (primary time); answers: B14, B13
problem: I cannot see program progress without reading the whole plan, and agents need small task-specific context rather than my page.
how: One page with a diagram, derived from the plan and refreshed at each phase close, beside small task-specific packets for agents.
where it stands: In use in the clinic testbed: AGENTS.md is 10,698 bytes [M] against a 6,709-byte baseline [M], with no productivity or token saving shown. Adopted for FixFlow as OWNER-VIEW.md, not yet tested.
next: Refresh each phase close; tie routing documents to code with a hash or CI check so they cannot drift.
origin: My idea; Harness review; Clinic testbed

### OWN-02 · Decision cards D01 to D23 for me
stage: In use; package WP11; metrics: time, throughput (primary time); answers: B03, B05, B11
problem: I need to see exactly what I must decide, by when, and which way the design leans, without reading the whole design.
how: Each of 23 cards shows options, the design's lean in bold, bottlenecks touched and my answer; only six are needed to start.
where it stands: In harness v2 design: D01 to D06 were answered on 11 Nov (phase 1 yes, encrypted drive, logger allowed, resume list); D07 to D23 are still open.
next: Answer D07 before the first replay.
origin: Harness v2 design

### OWN-03 · Numbered decision form for me, issued at a gate
stage: In use; package WP11; metrics: token_cost, quality (primary token_cost); answers: PR-OWNERWAIT
problem: Design agents on Odoo and self-hosting cannot be right without my answers, and spending Opus before I answer is spending on a guess.
how: At gate G1 each design task gets a numbered question form; my answers become parameters, not assumptions. Tasks O-07 and O-08 wait on them.
where it stands: In use: issued at G1 as two forms, Odoo and self-host. My answers are still pending, so the forms have not yet fed a design.
next: I answer the form; R-02 answers the plan question first.
origin: Orchestration design; G1 gate

### OWN-04 · W0-results.md as the single working board
stage: In use; package WP11; metrics: efficiency, time (primary efficiency); answers: B14, PR-OWNERWAIT
problem: The coordinator and I need one compiled place to see what is done, what is open and who is doing what.
how: One file holds P0a steps, my decisions with defaults, deploy train, lane board and notes. Unknowns are written 'unknown, because ...', never 0.
where it stands: In use in FixFlow: on 2026-11-13 the lane board had 10 rows [M], recording 8 running lanes [M] and 2 done phases [M].
next: I fill the answers column or accept the defaults on my decisions table.
origin: Ship plan §7

### OWN-05 · I delegate merges and phase starts to the coordinator
stage: In use; package WP11; metrics: throughput, time (primary throughput); answers: B03, B04
problem: Waiting for me to approve every merge and next-slice start would slow a parallel program and stall work while I am away.
how: Coordinator squash-merges when CI is green, its binding review passed that commit, no hold applies and the predecessor is merged. Merging deploys nothing.
where it stands: In use in the clinic testbed, without numbers; a usage limit plus the start-on-my-turn rule halted work for three days [M]. In FixFlow the coordinator has merged under it since 13 November.
next: Merge the first review-passed PR; write the authority as a standing instruction with explicit exclusions.
origin: My idea; Clinic testbed; Ship plan §7

### OWN-06 · I review design and plan; models check research
stage: In use; package WP11; metrics: quality, hallucination (primary quality); answers: -
problem: My reading time is limited, so I spend it where a mistake costs most.
how: My effort goes to plan critiques, the decisions journal and OWNER-VIEW.md; Sonnet citation checks and capped Opus refuters check research output.
where it stands: Already in use. The 3x multipliers in the source are asserted, not measured.
next: Count post-merge defects traced to discovery output after the early phases.
origin: Dex Horthy sweep

### OWN-08 · Archiving and progress-visibility rules
stage: In use; package WP11; metrics: time, efficiency (primary time); answers: B13, B14, B15
problem: I rely on one large board file, and sessions pile up with no live view of their status.
how: The root archives nothing without my word. Each slice gets a board row, and a task file holds status and next action.
where it stands: In use in the clinic testbed: the board is 219,111 bytes [M] at sweep time with 19 worktrees [M]; no live status mechanism was found.
next: Add an automatic expiry list and a short progress file.
origin: Clinic testbed

### MAC-13 · Shutdown diagnosis and always-on sensor logger
stage: Tested; package WP1; metrics: throughput, time (primary throughput); answers: B05, B03
problem: The PC switched itself off unexpectedly about two dozen times [M] since early October and we do not know why; agent work stops without warning.
how: Join shutdown times to commit and Claude logs; run an always-on temperature, power and memory logger; decode the 7 October dump; note mains cuts.
where it stands: Join done (harness v2 phase 1): 25 shutdowns since 1 October [M], 24 of them between 7 October and 10 November; 15 had no Claude call in the ten minutes before [M]. Logger and debugger allowed, not yet installed; cause not found.
next: Install the logger and debugger; I supply the days the house lost power. The next shutdown then has a trace.
origin: Bottleneck compile; Harness v2 design

### REL-06 · User-folder Android toolchain, verified on disk
stage: Built; package WP9; metrics: time, throughput (primary time); answers: MC-TOOLS, MC-NOEMU, PR-FALSEGREEN
problem: The device lab and the first-use device step need a JDK, adb, apksigner, an emulator and a system image on this PC without changing system settings.
how: Install into a user folder, loaded per terminal, nothing on PATH; the installer reports success only for files found on disk.
where it stands: Built; installed 13 November, 8.6 GB [M] on disk: JDK 17.0.21, adb 1.0.41, build-tools 37.0.0, emulator 37.2.13, Android 14 image, one virtual device [M]. WHPX reported usable [M]. One emulator DLL stays absent: the antivirus blocks it, and BLOCKED-FILES.txt lists it.
next: Reuse the recorded emulator boot (plan section 7.5) for device lab L3 and P0a item 10.
origin: Ship plan §7; My yes on 13 November

### OWN-10 · My P0a pre-flight kit
stage: Built; package WP11; metrics: throughput, time (primary throughput); answers: PR-P0A
problem: My P0a was the critical path and nothing could reach a phone or host without it; the steps were scattered and risky.
how: Five Git Bash scripts I run in order; each has --dry-run, writes outside the repo, reads keys from the environment, never opens the app.
where it stands: Built: self-tested on an empty stand-in database, which produced a 131 KB dump [M]. I have not run it on real data, so real items are unknown.
next: I run tools-check, then r2-archive and supabase-dump; this unlocks P3b and the Odoo decision once item 4 is done.
origin: Ship plan §7

### OWN-12 · Six interactive demos on my harness v2 page
stage: Built; package WP11; metrics: time, quality (primary time); answers: B14
problem: I read mechanisms better by moving sliders than by reading prose.
how: Six demos on my harness v2 page: power-off, check queue, fix round, merge nobody read, where tokens went, root as only gate.
where it stands: Built in my harness v2 page. Each demo explains a mechanism and lists its assumptions; none is a result.
next: None recorded.
origin: Harness v2 design; me

### MAC-15 · Never let the PC sleep on mains power
stage: Designed; package WP1; metrics: throughput, time (primary throughput); answers: B05, B03
problem: We think 11 of 25 shutdowns [M] point to the sleep path or an idle hang, and the PC sleeps after 900 s [S] on mains.
how: Set Windows sleep when plugged in to Never, so a sleeping or idle-hung PC cannot cut agent sessions off.
where it stands: Adopted: I said yes (D04) but have not yet applied the Windows setting. Current setting read: sleep after 900 s [S], hybrid sleep on, hibernate never. Target: zero sleep-related events in 14 days [T].
next: I switch the Windows setting to Never, then watch 14 days [T] for sleep-related shutdowns.
origin: Harness v2 design

### MAC-16 · Off-machine copy of the work
stage: Designed; package WP1; metrics: throughput, quality (primary throughput); answers: B11
problem: The work exists only on this PC: the clinic repository has no remote and six folders [M] are in no commit, so a single failure of this PC would take the only copy.
how: A verified git bundle of every branch copied off the PC, plus a nightly copy of uncommitted work, transcripts and evidence, logged.
where it stands: Designed in harness v2 phase 1; not yet run. Clinic repository: 432 commits, 19 worktrees, no remote [M]; git integrity check (fsck) clean, 55 MB packed [M]. Target: copy under 24 h old [T].
next: I plug in the encrypted drive and switch on encryption; then run the first bundle and a clone check.
origin: Bottleneck compile; Harness v2 design

### MAC-17 · Resume list at sign-in, two sessions released at a time
stage: Designed; package WP1; metrics: time, throughput (primary time); answers: B03, B10, B14
problem: Work pauses when I am away or the PC reboots; idle time from 'could resume' to the next commit was about three days [M].
how: At sign-in, list mid-work sessions and where each branch stands; after one message from me the root releases two sessions at a time.
where it stands: Designed in harness v2 phase 1; not yet built, and the script needs a session in the clinic repository. Idle time now about three days [M]; target under three hours [T].
next: Build it on my word (D06); idle time could fall from about three days [M] to under three hours [T].
origin: Harness v2 design; Bottleneck compile

### MAC-20 · Docker engine up first; agents never start it
stage: Designed; package WP1; metrics: throughput, quality (primary throughput); answers: B10
problem: Our backend checks run only in Docker, and an agent that tried to start or reconfigure Docker could damage the machine and the other project's containers.
how: I start Docker Desktop before the first wave. Every Docker agent runs docker info first; on failure it returns DOCKER_ENGINE_DOWN and stops.
where it stands: Designed in the orchestration design; not yet tested. The Docker engine was down when the design was written.
next: I start Docker Desktop; then the first Docker agent proves the docker info stop works.
origin: Orchestration design

### MAC-23 · Keep-work-safe bundle applied to CureFound training
stage: Designed; package WP1; metrics: throughput, efficiency (primary throughput); answers: B05, B11
problem: Unexpected power-offs interrupt agent work, and CureFound training on Colab or Kaggle (free hosted notebooks with GPU time limits) faces similar interruptions. We want work to survive a stop.
how: Keep a copy off the machine, a resume list, and a restart chain; for Colab or Kaggle training, one checkpoint per disease area.
where it stands: Designed; no result yet. 25 [M] unexpected power-offs since 1 October; build load explains at most 6 [M]; 15 [M] came with no Claude call in the prior ten minutes; cause not found.
next: Set up the resume list and an off-machine copy; this protects CureFound runs too.
origin: Bottleneck compile (CureFound mapping)

### MAC-26 · Archive policy and reaper for worktrees and containers
stage: Designed; package WP2a; metrics: efficiency, throughput (primary efficiency); answers: B15, B08
problem: Worktrees, sessions and containers pile up (19 worktrees, 34 containers [M]) and eat memory.
how: A written archive rule and a list-only reaper for merged, clean worktrees and containers, skipping anything written in the last 24 hours.
where it stands: Designed in harness v2 phase 2; list-only. 34 containers, 25 of 26 clinic databases stopped, 19 worktrees [M]. Target: counts back to active slices plus one after each merge [T].
next: Write the archive policy (D10) in phase 2, then run the reaper in dry-run mode.
origin: Bottleneck compile; Harness v2 design

### REV-33 · I read marked hunks on high-risk merges
stage: Designed; package WP3; metrics: quality, time (primary quality); answers: B17, L3
problem: High-risk merges (money, stock, access, import, restore) went in with no human or fresh reader of the final head, and I cannot read every line.
how: Opus reviewer marks invariant-touching hunks; on high-risk merges I read only those, at the same head commit; the record names me and the commit.
where it stands: Designed as a live trial on three merges in harness v2 phase 3; not yet run. About 3 hours [E] of my reading. Direct fit to the 5-of-6 [M] unread number.
next: Pick three high-risk merges and have the reviewer mark the hunks; log any wait against my idle hours.
origin: Dex Horthy sweep, Harness v2 design

### MEM-22 · Journal of event files plus SQLite index
stage: Designed; package WP6b; metrics: efficiency, quality (primary efficiency); answers: MC-FS, B13
problem: Several sessions, worktrees and hosts must share one store safely, with full history and no lost writes, on Windows with no database server.
how: Immutable sha256-named event files in a private git store are the truth; a disposable per-host SQLite file is rebuilt from them. A publisher writes each event as a new file and never renames over an existing one.
where it stands: Designed, not built. Measured here: renaming over an existing file failed 99-126 [M] times per 8x1,000 events; freshness check 23-35 ms [M] at 5,000 events; 18,300 [M] test writes, no corruption.
next: Build as phase KS-1 after the audit and my KS-D1b yes; test with 8+ processes and 1,000+ writes.
origin: Knowledge-store design, after Fossil, git-bug and Beads (version control and issue trackers that keep their records inside a repository)

### MEM-29 · Knowledge store copied off the machine to my VPS
stage: Designed; package WP6b; metrics: none (primary none); answers: B11, LIB-KS-PRIVACY
problem: The store sits on one disk, so a lost PC means lost lessons, and no code or defect data may reach a third party.
how: The journal lives in a private repo, pushed over SSH to a bare git repo on my VPS; a code allow-list refuses github.com.
where it stands: Designed; not yet tested. Needs phase P3b (the VPS) first; stage one is a one-way backup. Backup under 4 writers kept integrity [M]; restore-drill digests must match [T].
next: Run ks init and ks doctor in KS-1; set up SSH once the VPS exists (about ten minutes [E]).
origin: Knowledge-store design; judge-panel graft

### MEM-30 · Store home at profile root, with doctor check
stage: Designed; package WP6b; metrics: quality (primary quality); answers: MC-FS
problem: Windows can give the Claude desktop app’s processes a private copy of an AppData folder, so they and my own shell would silently write to two different stores.
how: The store sits in a profile-root folder outside the repo, OneDrive and AppData; ks doctor refuses other places and dead locks; a never-do list.
where it stands: Designed; to be built in phase KS-1. Stress test: 2 to 4 SQLITE_BUSY (database busy) failures per 1,200 writes at 8+ writers [M]; no corruption in about 18,300 writes [M].
next: Write the doctor tests in KS-1; they should catch silent split-file failures.
origin: Knowledge-store design (refuter finding)

### MEM-31 · SQLite via node:sqlite as the store engine
stage: Designed; package WP6b; metrics: efficiency (primary efficiency); answers: -
problem: We need a store engine with no install, daemon or telemetry that runs on this Windows PC and a Linux VPS for a few hundred rows.
how: SQLite built into Node 24 (FTS5, JSON, WAL), one file per host outside all worktrees; other engines stay in reserve behind an abstraction layer.
where it stands: Designed; a bounded engine trial was rejected because no two candidates were close. 4 writer processes, 12,000 rows [M], integrity ok; graph-style lineage queries 0.07-95 ms [M].
next: Use node:sqlite in the KS-1 core.
origin: Knowledge-store design (eleven engine lanes)

### MEM-51 · One ruling: accept all defaults for my decisions
stage: Designed; package WP11; metrics: time, throughput (primary time); answers: TK-BUDGET
problem: Sixteen of the decisions for me were hard to read at a glance, and accepting every default would have started about four Opus-heavy build sessions without my noticing. I want to decide few things, at the right time.
how: 'Accept all defaults' means run the recurrence audit, then stop and ask; KS-D1b is a second yes before any build.
where it stands: Designed in the knowledge-store design: only KS-D1 is needed now. Starred decisions mark the real calls for me, and each phase close updates one OWNER-VIEW line. Not yet tested.
next: I answer KS-D1; the recurrence audit runs, then I am asked again before any build. Defaults never cover installs, hooks, permissions, deletes or anything leaving this PC.
origin: Knowledge-store design

### OWN-13 · My W0 pre-flight before agents spend tokens
stage: Designed; package WP11; metrics: token_cost, quality (primary token_cost); answers: PR-OWNERWAIT, B10
problem: Agents cannot learn facts only I can see (dashboards, devices, billing), and spending tokens on guesses uses our limited usage on unchecked inputs.
how: A short checklist for me (fleet notice, hostname control, APK signing, service status, workshop coordinates, Docker started) runs first; its outputs decide the G1 branch.
where it stands: Designed in the orchestration design: a ten-item checklist of about 30 minutes [E] that runs before any agent spends tokens. Not yet tested; later carried into FixFlow's P0a kit.
next: I work through the ten W0 items.
origin: Orchestration design, added after the Opus critics

### OWN-14 · Six-question phase-closing message
stage: Designed; package WP11; metrics: quality, time (primary quality); answers: B14
problem: I need a consistent, short account of what each phase did and what remains.
how: At phase close the message answers six questions: goal, fit, choice, before and after, evidence including skipped counts, and remaining work.
where it stands: Adopted as a message format, not a file. Not yet tested.
next: Use it at the close of P0a.
origin: Harness review; Clinic testbed

### OWN-15 · Report tokens only, lead with the mechanism
stage: Designed; package WP11; metrics: efficiency (primary efficiency); answers: -
problem: A repo-comparison page and dollar figures were a tangent from what I asked.
how: Answer a which-or-why spend question with the ranked mechanism and one table. Report in tokens, with no dollars and no comparison framing.
where it stands: Adopted and applied: the dollar figures were removed from the token record after my feedback on 2026-11-12.
next: Keep reports to mechanism, size and levers.
origin: My idea; Token report

### MAC-31 · Proposed: one shared database container
stage: Idea; package WP2a; metrics: throughput, efficiency (primary throughput); answers: B08, B15
problem: One database container per worktree eats memory on a PC where RAM is short.
how: One shared database container with a separate database per checkout, instead of one container per worktree.
where it stands: Idea only: not built or tested. It is also one of the three options in the memory-table choice.
next: Prototype it, after the memory table shows how much the containers cost.
origin: Clinic testbed

### MAC-32 · Proposed: expiry list and progress file
stage: Idea; package WP2a; metrics: time, efficiency (primary time); answers: B14, B15
problem: Idle worktrees and containers pile up, and I cannot see progress while sessions run. We want both cleaned up and visible.
how: An automatic expiry list of finished worktrees and containers, plus a short progress file that each session writes every N minutes.
where it stands: Idea only; not built and not yet tested. It came from a transfer note on a clinic testbed card.
next: Add the expiry list and progress file; it could clear clutter and give me a live progress view.
origin: Clinic testbed (sweep card transfer note)

### MAC-33 · Restart chain for Docker and databases after reboot
stage: Parked; package WP1; metrics: time, throughput (primary time); answers: B10, B03
problem: After a reboot nothing restarts by itself: Docker Desktop and the database containers are started by hand, so work idles until I return.
how: Docker starts at sign-in; used databases restart themselves (two at most); the check starts its own database if missing.
where it stands: Parked (D03, 11 Nov): Docker's start at sign-in stays off. 31 of 34 containers have restart policy no [M]; target is databases healthy within 3 minutes of reboot [T].
next: Meanwhile the resume list starts with 'start Docker'; add a restart policy and logon task if I reopen D03.
origin: Harness v2 design; Clinic testbed

### MAC-34 · Doctor script for tool checks
stage: Parked; package WP1; metrics: none (primary none); answers: MC-TOOLS
problem: We wanted to confirm the machine has the tools the harness needs.
how: A script would check which tools are installed on the machine.
where it stands: Parked for FixFlow: item 10 of my P0a setup list covers tools instead. One fact was corrected: a Python 3 interpreter exists at the Codex runtime path.
next: Would return if tool gaps start costing real time. For now, nothing.
origin: Harness review

### OWN-20 · Hold design docs to a stricter reading standard
stage: Parked; package WP11; metrics: quality, time (primary quality); answers: -
problem: Design docs can pile up faster than anyone reads them; reading capacity, not writing, becomes the limit.
how: Require that a design doc is actually read before it ships.
where it stands: Parked: my critique rounds are already the read gate, so no change was proposed. Not tested.
next: None; it would return only if critique rounds stop covering design docs.
origin: BAML sweep
