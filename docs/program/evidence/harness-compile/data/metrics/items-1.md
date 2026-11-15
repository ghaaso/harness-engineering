# Items to classify, file 1: ideas of themes MAC, CHK

### MAC-01 (idea, theme MAC, In use)
name: Checkpoint and resume by dependency hash
problem it is meant to solve: After a stop, an agent cannot tell which files it relied on have changed, so it trusts a stale handoff or re-reads everything.
how: A stdlib Python tool hashes the task file, a context packet and chosen source files; resume re-hashes and lists changed or deleted dependencies.
where it stands: In use in the testbed: stale dependency rejected, fresh and unrelated changes accepted; 29 behaviour tests pass [M]. Eight red-team defects still open [M]; whole-file granularity.

### MAC-02 (idea, theme MAC, In use)
name: Resume-safe long runs and sleep prevention
problem it is meant to solve: A Windows sleep or a usage-limit stop in mid-run produced false timeouts and lost progress.
how: Save run state around each step with a continue entry; keep the PC awake during runs; check long log gaps against sleep records.
where it stands: In use in the testbed drivers: wall time 16,888.984 s [M] vs 2,661.859 s awake [M]; sleep gap 14,227.125 s [M]. Two arms hit the account limit mid-compaction and resumed in-session [M].

### MAC-03 (idea, theme MAC, In use)
name: Files-first outputs and resume-from-disk rules
problem it is meant to solve: Session limits stopped lane agents, a resumed workflow re-ran agents that had already edited files, and summaries drifted from the sources.
how: Agents write outputs to files; a state file makes resume from disk idempotent; model-written summaries are re-verified.
where it stands: In use in the testbed: rules after the incidents; recovery manual. Six interruptions [M]; six of eight lanes stopped in run 1 [M]; 133 queries of aborted agents recovered from transcripts [M].

### MAC-04 (idea, theme MAC, In use)
name: Parked starts released later by message
problem it is meant to solve: New sessions can start only on a turn I begin, so work stops while I am away; messages reach a busy lane only at turn end.
how: On my turn, pre-create dependent sessions with a parked-start brief; release each later by message when a dependency merges.
where it stands: In use in the testbed: used 6 Nov for three parked sessions [M]; it did not prevent the 6 to 9 Nov halt. Releasing all at once on 9 Nov caused a 2,030 s [M] queue.

### MAC-05 (idea, theme MAC, In use)
name: Dead locks after a boot; commit and push at every green checkpoint
problem it is meant to solve: The PC lost power for 28 minutes [M] on 13 November and cut off eight [M] lanes. We want stale locks never to block the lanes afterwards.
how: Locks older than the last boot are dead. Lanes commit and push at each green checkpoint; the coordinator restarts Docker, then wakes each lane.
where it stands: In use: implemented in the slot and gate scripts after the event. After the 28-minute [M] outage, all eight [M] lanes resumed from their worktrees.

### MAC-06 (idea, theme MAC, In use)
name: Shared-machine etiquette and session ceiling
problem it is meant to solve: Another project's containers share this PC, so touching Docker could break them, and too many sessions would use up the memory.
how: FixFlow sessions remove only fixflow-* containers, never restart Docker or WSL, never prune networks, and swap shared scripts atomically. Eight [S] sessions at most.
where it stands: In force (rated adopt). With eight lane sessions, 5.5 to 7.7 GB [M] was free of 31 GB [M], and commit was 35 to 41.5 GB [M] of 50.1 GB [M].

### MAC-07 (idea, theme MAC, In use)
name: Leave the antivirus alone; unpack from official archives
problem it is meant to solve: The antivirus scanner blocks one emulator file, which makes Google's package tool abandon the package. We want the lab to work without changing any antivirus setting.
how: Unpack from Google's named archives, verify every file's name and size, leave the blocked DLL absent, and use host or software GPU mode.
where it stands: In use: all installed files match the official archives except the one blocked DLL [M]. FixFlow never changes an antivirus setting.

### MAC-08 (idea, theme MAC, In use)
name: Windows-host traps recorded as lessons
problem it is meant to solve: Windows shell quirks gave us false passes and extra rounds, and we want each one to be known before an agent hits it.
how: Each trap is a written lesson: grep -c on carriage returns lies, Python writes CRLF, heredoc EOF failures, shared temp logs, Hyper-V gotchas.
where it stands: In use in the testbed as notes only; no check enforces them. One rerun cost a 16-minute [M] check; each Hyper-V trap cost 10 to 40 minutes [M].

### MAC-09 (idea, theme MAC, In use)
name: Concurrency cap and load rules after two shutdowns
problem it is meant to solve: The PC shut down uncleanly on 5 and 6 November under concurrent full test runs, two of the 24 [M] power-offs we later counted; the cause is still open.
how: At most three or four children and one full check at a time, enforced by a lock; slots replaced the lock on 6 Nov.
where it stands: In use in the testbed as a mitigation, not a diagnosis; cause never found. Free memory 0.0-0.8 GiB at lows with two checks beside six sessions, 2-6 GiB with one [M].

### MAC-10 (idea, theme MAC, In use)
name: Memory headroom guard on the second check slot
problem it is meant to solve: Two simultaneous checks drove free memory to 0.0-0.8 GB [M], the suspected cause of unclean shutdowns.
how: The second slot opens only while 8.0 GiB of physical memory is free, re-read at every poll; unreadable means closed.
where it stands: In use in the testbed but collapses to one slot: in about 980 samples [M], 8 GiB [S] was never free (2.1-6.2 GiB [M]). Waits 647, 3, 256, 614 s [M].

### MAC-11 (idea, theme MAC, In use)
name: Drop Docker's page cache after each backend run
problem it is meant to solve: The Docker virtual machine hoards disk cache it is not using, starving Windows of RAM while lanes run.
how: The gate script runs a privileged container that drops the page cache at the start and end of every backend run; no data touched.
where it stands: In use in the gate script. The first drop gave back 2.2 GB [M]; the VM held 8.3 GB [M], 4.4 GB [M] of it unused cache.

### MAC-12 (idea, theme MAC, In use)
name: Write scripts with the file tool; give Workflows paths
problem it is meant to solve: The shell tool collapses doubled backslashes in heredocs, which altered two regular expressions, and Workflow scripts cannot read files.
how: Write every script with the file-writing tool, and give Workflow scripts file paths so agents read the content themselves.
where it stands: In use, adopted from the review addendum. Before the fix, the first attempt of one review run cost 1.38M tokens [M] and 15 minutes [M].

### MAC-13 (idea, theme MAC, Tested)
name: Shutdown diagnosis and always-on sensor logger
problem it is meant to solve: The PC switched itself off unexpectedly about two dozen times [M] since early October and we do not know why; agent work stops without warning.
how: Join shutdown times to commit and Claude logs; run an always-on temperature, power and memory logger; decode the 7 October dump; note mains cuts.
where it stands: Join done (harness v2 phase 1): 25 shutdowns since 1 October [M], 24 of them between 7 October and 10 November; 15 had no Claude call in the ten minutes before [M]. Logger and debugger allowed, not yet installed; cause not found.

### MAC-14 (idea, theme MAC, Built)
name: One Linux image for every engine arm
problem it is meant to solve: A Windows build would have handicapped one graph engine, whose algorithm extension would not load. We want every arm on identical footing.
how: A 1.26 GB [M] Docker image holds both graph engines, their algorithm libraries and the runner, and is rebuilt from a Dockerfile recipe.
where it stands: Built and used in the graph test. PageRank, Louvain, connected components and k-core (see Connected components / k-core) ran natively and PageRank matched DuckDB [M]. Docker had to be restarted twice; the image stayed intact.

### MAC-15 (idea, theme MAC, Designed)
name: Never let the PC sleep on mains power
problem it is meant to solve: We think 11 of 25 shutdowns [M] point to the sleep path or an idle hang, and the PC sleeps after 900 s [S] on mains.
how: Set Windows sleep when plugged in to Never, so a sleeping or idle-hung PC cannot cut agent sessions off.
where it stands: Adopted: I said yes (D04) but have not yet applied the Windows setting. Current setting read: sleep after 900 s [S], hybrid sleep on, hibernate never. Target: zero sleep-related events in 14 days [T].

### MAC-16 (idea, theme MAC, Designed)
name: Off-machine copy of the work
problem it is meant to solve: The work exists only on this PC: the clinic repository has no remote and six folders [M] are in no commit, so a single failure of this PC would take the only copy.
how: A verified git bundle of every branch copied off the PC, plus a nightly copy of uncommitted work, transcripts and evidence, logged.
where it stands: Designed in harness v2 phase 1; not yet run. Clinic repository: 432 commits, 19 worktrees, no remote [M]; git integrity check (fsck) clean, 55 MB packed [M]. Target: copy under 24 h old [T].

### MAC-17 (idea, theme MAC, Designed)
name: Resume list at sign-in, two sessions released at a time
problem it is meant to solve: Work pauses when I am away or the PC reboots; idle time from 'could resume' to the next commit was about three days [M].
how: At sign-in, list mid-work sessions and where each branch stands; after one message from me the root releases two sessions at a time.
where it stands: Designed in harness v2 phase 1; not yet built, and the script needs a session in the clinic repository. Idle time now about three days [M]; target under three hours [T].

### MAC-18 (idea, theme MAC, Designed)
name: Stop on resume when record and branch disagree
problem it is meant to solve: After many power-offs a session's record and branch can drift apart, and a released session may start fresh, duplicating or discarding committed work.
how: On resume, if the record is missing or the branch holds uncovered commits, list them and ask; a match resumes with no wait.
where it stands: Adopted in PR #186 for FixFlow and designed into harness v2; not yet tested. Plan: replay the 9 November mass resume; zero mismatched sessions means unproven and the guard stays dormant.

### MAC-19 (idea, theme MAC, Designed)
name: Resume a run from its journal; retry last
problem it is meant to solve: A session limit can kill a run midway; re-running everything wastes tokens, and a cached failure could be served as a result.
how: Stable agent labels and fixed call order; finished agents replay from the journal, dead ones replay null; retries go at the tail.
where it stands: Designed in the orchestration design (section 4.3) with a skeleton script; not yet tested.

### MAC-20 (idea, theme MAC, Designed)
name: Docker engine up first; agents never start it
problem it is meant to solve: Our backend checks run only in Docker, and an agent that tried to start or reconfigure Docker could damage the machine and the other project's containers.
how: I start Docker Desktop before the first wave. Every Docker agent runs docker info first; on failure it returns DOCKER_ENGINE_DOWN and stops.
where it stands: Designed in the orchestration design; not yet tested. The Docker engine was down when the design was written.

### MAC-21 (idea, theme MAC, Designed)
name: Secret-safe scans: fingerprint, never value
problem it is meant to solve: Every agent output is saved in the run journal, so a pasted secret would be stored there. We want scans that can never leak one.
how: The dependency and secret scan returns file, pattern, line number, first commit and a hash fingerprint, never the value or a quoted line.
where it stands: Designed in the orchestration design; not yet tested. The output schema enforces the rule. Added after the second external review.

### MAC-22 (idea, theme MAC, Designed)
name: Deny railway up and run in permissions
problem it is meant to solve: Running railway up from the repo root rebuilt the API as the web app and caused a production outage; the trap lives only as prose.
how: A deny block in the project settings covers the shell forms of railway up and railway run, and optionally a forced git push.
where it stands: Adopt, not yet tested. It does nothing for the self-reported compliance problem, but it matters during the Railway drain window.

### MAC-23 (idea, theme MAC, Designed)
name: Keep-work-safe bundle applied to CureFound training
problem it is meant to solve: Unexpected power-offs interrupt agent work, and CureFound training on Colab or Kaggle (free hosted notebooks with GPU time limits) faces similar interruptions. We want work to survive a stop.
how: Keep a copy off the machine, a resume list, and a restart chain; for Colab or Kaggle training, one checkpoint per disease area.
where it stands: Designed; no result yet. 25 [M] unexpected power-offs since 1 October; build load explains at most 6 [M]; 15 [M] came with no Claude call in the prior ten minutes; cause not found.

### MAC-24 (idea, theme MAC, Designed)
name: Separate Postgres 17 restore stack for evidence
problem it is meant to solve: Restoring a production dump into the test database, or into an older Postgres, could mix evidence with test state or simply fail.
how: A production dump is restored into its own Postgres 17 container, never the test database; exact table counts and fixed read-only queries verify it.
where it stands: Designed; not yet tested. Added after the second external review. Used only if the first wave produces a dump.

### MAC-25 (idea, theme MAC, Designed)
name: Memory table of who holds RAM when short
problem it is meant to solve: Memory runs short during builds and we do not know who holds it, which limits check slots and rules out a graph server.
how: Run one build day with a per-process-group memory sampler, read who holds memory, then choose: shared test database, WSL2 memory cap, or closing apps.
where it stands: Designed in harness v2 phase 2; waits on the always-on logger. No-build reading: browser 6.1 GB, WSL2 VM 5.2 GB, Claude 3.2 GB [M]. Target: a table when under 2 GB is free [T].

### MAC-26 (idea, theme MAC, Designed)
name: Archive policy and reaper for worktrees and containers
problem it is meant to solve: Worktrees, sessions and containers pile up (19 worktrees, 34 containers [M]) and eat memory.
how: A written archive rule and a list-only reaper for merged, clean worktrees and containers, skipping anything written in the last 24 hours.
where it stands: Designed in harness v2 phase 2; list-only. 34 containers, 25 of 26 clinic databases stopped, 19 worktrees [M]. Target: counts back to active slices plus one after each merge [T].

### MAC-27 (idea, theme MAC, Designed)
name: Circuit breaker on session limit
problem it is meant to solve: When the account session limit hits, issuing more agents only produces nulls and hides what did not run.
how: Readers run in slices of five; two fresh nulls in one slice stop issuing and list every unstarted id as not started.
where it stands: Designed in the orchestration design, hardened in version 3 with a not-started list; not yet tested.

### MAC-28 (idea, theme MAC, Designed)
name: Never run expo prebuild in place
problem it is meant to solve: Generating the native Android folder in the app directory would make the build service treat the project as bare and skip its config plugins.
how: Agents may not run expo prebuild or expo run:android in the app directory; native questions are answered from cached package sources instead.
where it stands: Stated as a hard constraint in the orchestration design; not yet tested.

### MAC-29 (idea, theme MAC, Idea)
name: Secrets and private data kept out of agents' reach
problem it is meant to solve: Sessions holding production credentials could leak secrets or obey injected text; subagents in bypass mode can reach Railway and GitHub credentials in the user profile.
how: Pass secrets by variable name only, never read .env, and use a restricted research agent (no shell) with deny rules for credential folders.
where it stands: Trial for FixFlow only; not yet tested here. The testbed holds no production credentials and records no leak. The first check is a ten-minute canary (a small trial run) in a bypass-mode workflow.

### MAC-30 (idea, theme MAC, Idea)
name: Codex session folders and skill sourcing review
problem it is meant to solve: We want to know where my Codex sessions leave their work, so none of it is lost.
how: 16 [M] Codex session folders exist; one FixFlow skill sourcing review was run by three subagents.
where it stands: An observation, not yet a built mechanism: the session folders are mostly empty and nothing is measured yet.

### MAC-31 (idea, theme MAC, Idea)
name: Proposed: one shared database container
problem it is meant to solve: One database container per worktree eats memory on a PC where RAM is short.
how: One shared database container with a separate database per checkout, instead of one container per worktree.
where it stands: Idea only: not built or tested. It is also one of the three options in the memory-table choice.

### MAC-32 (idea, theme MAC, Idea)
name: Proposed: expiry list and progress file
problem it is meant to solve: Idle worktrees and containers pile up, and I cannot see progress while sessions run. We want both cleaned up and visible.
how: An automatic expiry list of finished worktrees and containers, plus a short progress file that each session writes every N minutes.
where it stands: Idea only; not built and not yet tested. It came from a transfer note on a clinic testbed card.

### MAC-33 (idea, theme MAC, Parked)
name: Restart chain for Docker and databases after reboot
problem it is meant to solve: After a reboot nothing restarts by itself: Docker Desktop and the database containers are started by hand, so work idles until I return.
how: Docker starts at sign-in; used databases restart themselves (two at most); the check starts its own database if missing.
where it stands: Parked (D03, 11 Nov): Docker's start at sign-in stays off. 31 of 34 containers have restart policy no [M]; target is databases healthy within 3 minutes of reboot [T].

### MAC-34 (idea, theme MAC, Parked)
name: Doctor script for tool checks
problem it is meant to solve: We wanted to confirm the machine has the tools the harness needs.
how: A script would check which tools are installed on the machine.
where it stands: Parked for FixFlow: item 10 of my P0a setup list covers tools instead. One fact was corrected: a Python 3 interpreter exists at the Codex runtime path.

### MAC-35 (idea, theme MAC, Parked)
name: Scripted worktree setup checklist
problem it is meant to solve: A new git worktree is only useful if its setup is repeatable and leaves shared state untouched.
how: One repo-defined setup script would copy env and settings, install dependencies and launch the implement command, cleaning up if setup fails.
where it stands: Parked after refutation: FixFlow has no untracked env to copy, and a shared-state guard and per-phase worktree checklist already exist. The source evidence was one anecdote.

### CHK-01 (idea, theme CHK, In use)
name: Parallel check with one database per worker
problem it is meant to solve: The full run took about 14 minutes [M], so every gate and review round waited on it, and one session's wait held up everyone behind it.
how: Six pytest-xdist workers, one PostgreSQL test database each, plus a serial pass for race tests. A script proves every test ran exactly once.
where it stands: In use in the testbed: 855.2 s [M] became a mean of 283.8 s [M] over 12 runs (range 268.3 to 298.3 s [M]), about 3.0x faster. Eight workers gain only 3% [M].

### CHK-02 (idea, theme CHK, In use)
name: Machine-wide check lock with two slots
problem it is meant to solve: Several sessions running full checks at once coincided with unexpected power-offs and slowed each other, then queued behind one another.
how: An OS file lock shared by all worktrees, two slot files, one check per checkout. The second slot opens only with 8 GiB [S] free.
where it stands: In use: two overlapping checks took 435 s [M] each against 389 to 418 s [M] alone, 1.8 to 1.9x [M] throughput. The 8 GiB gate never opened in about 980 samples [M].

### CHK-03 (idea, theme CHK, In use)
name: Stall watchdog, heartbeat and queue position
problem it is meant to solve: A check that hangs silently costs minutes and holds up the queue, and I cannot see progress while a check waits or a loop runs long.
how: A plugin writes a heartbeat on each test event; 600 s [S] of silence kills the process tree. Planned: waiting/running/stalled states, stack dumps.
where it stands: Watchdog in use in the testbed; one real hang was killed after 961 s [M], cause never found. Heartbeat states, stack dump and queue position are designed; hooks stay off (D17).

### CHK-04 (idea, theme CHK, In use)
name: Exactly-once proof and planted-fault demos
problem it is meant to solve: A faster gate must not be weaker: never drop a test or print PASS wrongly, and a passing test does not prove its guard works.
how: Judge the split by test ids: parallel ids equal the serial pass's left-out ids, no overlap. Skips fail. Planted faults must fail the check.
where it stands: In use in the testbed: 1,844 parallel plus 128 serial test ids [M] in the run that proved the split, none in both. Six planted faults gave CHECK FAILED [M]. Not yet in FixFlow CI.

### CHK-05 (idea, theme CHK, In use)
name: Race tests decide blocked from the database
problem it is meant to solve: Under load a slow second call looked blocked after 0.6 s, so a race test could pass with a broken lock; timing-based race tests are flaky.
how: A helper polls pg_stat_activity (the Postgres list of open sessions) up to 15 s [S] for a session waiting on a lock, with the first call among the blockers.
where it stands: In use: 59 blocked assertions in 13 files migrated [M]; 159 race tests pass in 189 s [M]. It does not show which lock, and serial pass cost is unchanged.

### CHK-06 (idea, theme CHK, In use)
name: Random-tag flaky tests fixed after parallel runs
problem it is meant to solve: Parallel runs exposed chance failures from random digit-bearing test data, which made the gate unreliable.
how: A letters-only random_tag() and without_identifiers() replaced 33 uses [M] in 21 files [M], plus a layout test that fails if the old hex-tag forms return.
where it stands: In use in the testbed: about 3 failures in about 40 full runs [M] before; seven consecutive green runs [M] after. Small sample; random values elsewhere may recur.

### CHK-07 (idea, theme CHK, In use)
name: Retry for Windows loopback error 10055
problem it is meant to solve: The Windows socket error 10055 (no buffer space available) made checks fail spuriously: 2 of the first 22 full runs [M].
how: A helper retries only that error, 0.02 s [S] apart, up to five times [S]; a serial-pass retry fails the step, parallel retries are reported.
where it stands: In use in the testbed: no further failure in 17 full runs [M] after the retry. Port exhaustion was ruled out (TIME_WAIT peak 352 [M]); the cause is not found.

### CHK-08 (idea, theme CHK, In use)
name: Start-up cost found by tracing
problem it is meant to solve: Even a 16-test run paid a large fixed start-up cost that no test caused.
how: Tracebacks from Python’s faulthandler (which prints where a stuck process is) showed pytest's base-temp step (setting up its temporary-folder root) taking about 32 s [M] via symlink on Windows; --basetemp fixed it.
where it stands: In use in the testbed: 43 s to 11.5 s [M] on a 16-test run. Windows-specific; why the symlink was slow is not explained.

### CHK-09 (idea, theme CHK, In use)
name: Native Windows stays the gate, Linux optional
problem it is meant to solve: Native and container modes cover different code, so we need to decide which run counts as the gate.
how: Only native exercises Windows branches (job object, file lock, socket retry), so it stays the gate, run when devtools change or as canary.
where it stands: Decision in force in the testbed. No measurement of its own; it forgoes about 230 s [M] against about 367 s [M]. Harness v2 proposes the container as gate instead (D09).

### CHK-10 (idea, theme CHK, In use)
name: Pre-commit hook running the workflow verify command
problem it is meant to solve: We want broken links, bad JSON and failing workflow tests caught at commit time, not found later, because nothing was checking at that moment.
how: A hook runs one verify command at commit: links, JSON, provenance hashes, instruction contracts, workflow tests. Local and bypassable.
where it stands: In use in the testbed: 227 [M] tracked files matched their commits, 29 [M] workflow tests pass, bad commits rejected. Skipped for FixFlow: it read the working tree and let an all-skipped suite pass.

### CHK-11 (idea, theme CHK, In use)
name: Fair first-come queue with heavy-job patience
problem it is meant to solve: Waiters retried at random: one lane waited 20 minutes [M] while later arrivals were served; two Android builds stalled eight short runs for about an hour [M].
how: Tickets give arrival order. A light job may pass a heavy one that waited under 900 s [S]; after that the heavy job blocks.
where it stands: In use in FixFlow's slot script, rewritten after those failures. Waits since the change are not yet measured.

### CHK-12 (idea, theme CHK, In use)
name: Per-lane gate harness with Docker recipe
problem it is meant to solve: A gate script reporting only the last exit code hides which gate failed, and allowing one backend gate at a time blocked parallel lanes.
how: ff-gates.sh runs each gate in a lane-named container with its own database, a read-only source copy, per-gate logs, exit-code lines and a summary.
where it stands: In use by every FixFlow lane, and measured: backend 757 tests [M] in 7 min 23 s [M] cold; web 106 tests in 33 s [M]; mobile 334 tests in 29 s [M].

### CHK-13 (idea, theme CHK, In use)
name: Skip-aware integration gate
problem it is meant to solve: A test run can look green while integration tests were silently skipped because the database variable was unset, proving nothing about the real database.
how: pytest's junit report (an XML file of test results) lists skip reasons; a script fails the gate on any skipped integration test. Mobile CI no longer passes with no tests.
where it stands: In use in every FixFlow backend gate run. Baseline: 0 integration tests skipped of 757 [M].

### CHK-14 (idea, theme CHK, In use)
name: Checks must be able to fail (red-team lessons)
problem it is meant to solve: Gates go green without testing anything: accepted rows beside failed checks, bare asserts, boot tests in a dirty environment, unknown recorded as zero.
how: Plan rules, no machinery: no accepted row beside a failed check, if/raise not assert, clean-environment boot tests, unknown never recorded as zero.
where it stands: Carried as plan rules in the harness; the BAML sweep confirmed they were already held. Not otherwise tested.

### CHK-15 (idea, theme CHK, In use)
name: Merge-readiness labels on gate summaries
problem it is meant to solve: Gates test the working tree but label the result with HEAD, and extra arguments can deselect tests, so a green summary could mislead a merge decision.
how: The summary prints tree=dirty for uncommitted files and RUN partial for extra pytest arguments. Merge-readiness needs a clean tree and no extra arguments.
where it stands: In use: printed in every FixFlow gate summary. Not yet tested against a real misleading case.

### CHK-16 (idea, theme CHK, In use)
name: Named exit-coded gates per runtime
problem it is meant to solve: We want agents to hand off only after the typecheck, format and tests ran together, not after a partial or noisy run.
how: Each runtime has a named exit-coded gate: backend in Appendix A, web and mobile as CLAUDE.md chains. A cross-runtime aggregate was weighed.
where it stands: In use per runtime (backend gate, web and mobile chains). A cross-runtime aggregate does not fit a backend gated in Docker on Windows; no verdict on it.

### CHK-17 (idea, theme CHK, In use)
name: Pass counts are not the success signal
problem it is meant to solve: We want a plain pass count never to stand in for proof, because it can hide regressions.
how: CI runs every suite per PR; phases close only on green gates; reviewers name a test that fails on base and passes on head.
where it stands: In use: already how FixFlow works. It would be reopened only if a regression escaped the full CI suite after merge.

### CHK-18 (idea, theme CHK, In use)
name: Weighted machine-wide slot lock for heavy jobs
problem it is meant to solve: We want eight lanes starting at once never to exhaust this PC's 31 GB [M] of RAM with stacks, test runs, builds and emulators.
how: ff-slot gives out 3 [S] slots (2 [S] while a Gradle lane runs). Backend stacks, Jest, Vitest and emulators take 1; a Gradle build is exclusive.
where it stands: In use: every gate run takes a slot. A backend stack used about 0.4-0.5 GB [M], not its 3 GB [S] cap; free RAM with eight sessions was 5.5-7.7 GB [M].

### CHK-19 (idea, theme CHK, In use)
name: Gates share the database container's network
problem it is meant to solve: We want gates to run when another project's 29 [M] networks have used up Docker's address pools, which stopped the first gate design.
how: Gates join the database container's network, so the database is at localhost as in CI. A real network takes an explicit subnet in 10.77.0.0/16 [S].
where it stands: In use, fixed in commit be2e27a. The address-pool error was measured on 2026-11-13 [M] and no longer blocks gates. Design Appendix C still cannot run as written.

### CHK-20 (idea, theme CHK, In use)
name: Architecture rules file plus CI boundary checks
problem it is meant to solve: We want agents not to drift from the architecture, so we keep durable rules and enforce the slice boundaries mechanically.
how: CLAUDE.md invariants state the rules, and import-linter and ESLint boundary checks in CI enforce them.
where it stands: In use in FixFlow: the rules file plus import-linter and ESLint checks already run in CI. An outside team's report confirmed the same shape.

### CHK-21 (idea, theme CHK, In use)
name: Before and after file manifests
problem it is meant to solve: We want edits not to touch files that were not meant to change, and a way to audit what a session touched.
how: Each task writes a hash manifest of all tracked files before editing, then compares after, so every changed file is accounted for.
where it stands: In use in the testbed: 247 [M] baseline files all accounted for, six [M] declared documents changed, 23 [M] protected source paths unchanged. It catches unintended change, not wrong change; no timing cost recorded.

### CHK-22 (idea, theme CHK, Tested)
name: Two container checks at once
problem it is meant to solve: Checks queued behind each other for up to 34 minutes even though one check does not use the whole machine.
how: Run two container checks at the same time on the PC, since each needs less than the whole machine.
where it stands: Measured, not used: 266 s and 267 s [M] together against about 440 s [M] in a row; least free memory 5.3 GB [M].

### CHK-23 (idea, theme CHK, Tested)
name: Non-durable test-database settings
problem it is meant to solve: We wanted to know whether the test database's disk writes were slowing the check.
how: The dev and test Postgres container runs with fsync, synchronous commit and full-page writes switched off, in the compose file only; deploy files untouched.
where it stands: Tested in the testbed: 316 s to 297 s [M] on single runs, inside the noise. The check is CPU-bound, not flush-bound, so the gain is unproven.

### CHK-24 (idea, theme CHK, Tested)
name: Queue-wait measurement for the test lock
problem it is meant to solve: We want to know how much of a gate's cost is queueing rather than testing.
how: Collect waits from printed lock-holder messages and check logs across single, paired and gated runs; log each merge's check size and duration.
where it stands: Measured in the testbed: 15 [M] recorded waits, 3 s to 726 s [M]. A check of about 5 minutes [E] cost 10-18 minutes [E] with two to four sessions.

### CHK-25 (idea, theme CHK, Tested)
name: Per-lane run lock and fixed container names
problem it is meant to solve: Two gate runs against one database deadlock or drop each other's database, and re-issuing a command after a timeout can duplicate its effects.
how: A lane-and-kind lock refuses a second run (exit 4). Fixed container names fail a second start. Never re-issue a mutating command after a timeout.
where it stands: Tested: a second run was refused with exit 4 [M]. The lock is reclaimed if older than the last boot or its process is gone. The container-name rule is designed only.

### CHK-26 (idea, theme CHK, Built)
name: Linux container check, proposed as the gate
problem it is meant to solve: Tests ran only on Windows while production is Linux, and the Windows-to-Docker database path made the check slow and hid Linux-only failures.
how: A pinned Debian 12 container beside the database, 12 workers [S], a hash-verified copy of the tree, and no fallback to native.
where it stands: Built in the testbed, optional: mean 230.1 s [M] against 367.2 s [M] native, about 1.6x faster. The Linux run found 2 failures [M] in 2,472 tests that Windows missed.

### CHK-27 (idea, theme CHK, Built)
name: Mirror CI environment in the gate
problem it is meant to solve: A gate with a different environment than CI could pass or fail differently, especially once the backend refuses to boot outside dev or test.
how: The gate reads the environment setting from the worktree's own CI file and passes it on; an older worktree gets none, as CI did.
where it stands: Built into the FixFlow gate script. Not yet tested.

### CHK-28 (idea, theme CHK, Designed)
name: Check slots sized from one measured memory number
problem it is meant to solve: Checks wait 6 to 34 minutes behind each other: one slot open, longest wait 2,030 s [M].
how: Measure one check's peak memory, size the slots from it, run a fair queue printing each place, and run one full gate per round.
where it stands: Designed in harness v2 phase 2, not yet run; peak-memory table still to take. Target: second slot open on at least half of polls, median wait under a minute [T].

### CHK-29 (idea, theme CHK, Designed)
name: Re-run Node failures under Node 22
problem it is meant to solve: This PC has Node 24 while CI pins Node 22, so a failure could be a machine artifact rather than a repo defect.
how: A Jest or React Native failure on Node 24 is re-run once in a node:22 container before it is called a defect.
where it stands: Designed in the orchestration design and ship plan; not seen in the gate script. Not yet tested.

### CHK-30 (idea, theme CHK, Designed)
name: CI checks for known prose traps
problem it is meant to solve: We want FixFlow's costly written warnings to fail a build, not rely on an agent reading CLAUDE.md.
how: A Ruff rule bans hmac.compare_digest outside the security module; one check rejects an empty eas.json env value; another rejects the Sentry plugin in app.json.
where it stands: Adopt for the three history-backed checks, with a railway deny rule and a skill-frontmatter lint also adopt, narrowed. Proposal only, nothing installed. FixFlow-only: no testbed number would move.

### CHK-31 (idea, theme CHK, Designed)
name: Stop after three identical CI failures
problem it is meant to solve: We want an agent never to keep re-pushing and re-running until CI turns green, which could hide a real failure.
how: Rule line: if the same CI job fails on 3 [S] pushes running after green local gates, stop, journal it, hand it to me.
where it stands: Adopted as a rule line, flaky-rerun allowance dropped; PR Auto-fix stays off. Not yet tested.

### CHK-32 (idea, theme CHK, Designed)
name: Stub run of gate scripts with no model
problem it is meant to solve: We want to know a new gate script never reads a reviewer that returned nothing as a clean one, without spending model tokens.
how: Run a gate script under node with stand-in agents that return nothing, crash or refute; every id must appear once; none may reach merge.
where it stands: Designed in harness v2 (mechanism 5). Feasibility proven in one stub run (the script ran with stand-in agents, reported two live results [M] and named the missing one). Not yet tested against the three recorded defects.

### CHK-33 (idea, theme CHK, Designed)
name: Caller-pin test in repository CI
problem it is meant to solve: We want a new file minting a login token without the lock check to fail the merge, since no store lookup can see that second door.
how: A backend pytest using Python's ast module pins the only allowed callers of verify_pin and create_access_token to the login function.
where it stands: Designed (decision KS-D17: yes, one PR per probe). Needs no store, so it can land any time before ship phase P7b-1. Not yet tested.

### CHK-34 (idea, theme CHK, Designed)
name: CI check that CLAUDE.md facts match the code
problem it is meant to solve: We want the instruction file never to drift from the code, such as a wrong migration head, so agents never trust a wrong fact.
how: CI fails if CLAUDE.md's migration head differs from the end of the down_revision chain; a second check warns on paths that no longer resolve.
where it stands: Adopted as a phase P1 deliverable. The path check is a warning only until P13c, so it does not fail on first run. Not yet built or tested.

### CHK-35 (idea, theme CHK, Designed)
name: Import rules for the mobile app
problem it is meant to solve: We want the rule that no mobile write bypasses the outbox enforced by a check, because today it is only prose.
how: dependency-cruiser mirrors the backend import rules in the mobile app: screens cannot import write functions; raw fetch stays in two files; runs in CI.
where it stands: Adopted in the harness review as the better alternative to a code-graph tool; scheduled as phase P5b-2. Not built or tested yet.

### CHK-36 (idea, theme CHK, Idea)
name: Verifying command and negative run per tick
problem it is meant to solve: Checklist boxes for CI gates, docs and deploy steps can be ticked without proof that the check works.
how: Each tick records the exact verifying command and expected result; for a gate box, a negative run showing the gate fails when it should.
where it stands: Trial in P1 and the next two code phases; not yet tested.

### CHK-37 (idea, theme CHK, Idea)
name: One-off tsc unused-code check on mobile
problem it is meant to solve: We want to know whether agents leave unused code in the mobile app that no gate flags.
how: Run tsc with the noUnusedLocals flag once on the mobile app; set it in tsconfig only if it finds real unused code.
where it stands: Trial: the one new idea to survive the Horthy addendum cap review, after 15 [M] other families fell. Mobile parity only, no new tooling. Not yet run.

### CHK-38 (idea, theme CHK, Idea)
name: Close-time clean worktree and manifest check
problem it is meant to solve: We want intended files, such as a review-input tool, never left uncommitted at phase close.
how: At phase close, run git status and compare a file listing of the evidence folder with its manifest; each entry is committed or excluded.
where it stands: Trial over the next 5 [T] phase closes. It costs nothing to run; the slop-scoring part of the source idea was dropped. Not yet tested.

### CHK-39 (idea, theme CHK, Idea)
name: Red-team of the workflow gates and repair plan
problem it is meant to solve: We want to know the workflow's own gates can fail, since they could pass while checking nothing.
how: A nine-perspective review of the testbed's gates found nine defects, each with a reproduction and closure condition; a repair plan ordered the fixes.
where it stands: Deferred: it found 3 P1, 5 P2 and 1 P3 defects [M], eight still open; an all-skipped suite passed with exit 0 [M]. No code repair was made, as the build moved on.

### CHK-40 (idea, theme CHK, Parked)
name: Stop hook that re-runs the CI checks
problem it is meant to solve: We want an agent never to end its turn with a red tree, without waiting for CI to tell us.
how: When an agent tries to finish, a hook runs the same quality and typecheck commands as CI and blocks with only the errors.
where it stands: Parked: first pass left it deferred with no verdict; the addendum ruled skip. It reopens the pre-commit skip, and backend gates take minutes in Docker. Not tested.

### CHK-41 (idea, theme CHK, Parked)
name: Slop and complexity detectors as a gate
problem it is meant to solve: We want to stop agent code getting messier over time, with some gate that scores it.
how: Run slop-rule or complexity and duplication scripts as a gate on agent code.
where it stands: Parked: such detectors flag most code (77.75% to 94.25% [S] of lines across models) and can be gamed, so they give no clear bad-code verdict.

### CHK-42 (idea, theme CHK, Parked)
name: CI-driven fix agents per failure stage
problem it is meant to solve: We want agents not to wait a long time running the full suite in their own sandbox.
how: CI and a review bot trigger fresh follow-up fix agents at each failure stage, instead of agents running the full suite themselves.
where it stands: Parked: FixFlow CI runs the suite in about 3 minutes [E]; dropping the local run would leave release and drain branches ungated. The source saw waits fall from 15-20 to 2-4 minutes [S].

### CHK-43 (idea, theme CHK, Parked)
name: Tiered verification and rework-rate metric
problem it is meant to solve: We want less time spent on full suites each session, and a health measure for review rework.
how: Run a relevant test subset per phase with cheap proxies, the full suite at close; track the share of a diff changed after review.
where it stands: Parked: full gates at close already exist, Docker setup cost does not shrink with a subset, and squash merges break the metric. Its 5% [G] bar is an unmeasured rule of thumb.

