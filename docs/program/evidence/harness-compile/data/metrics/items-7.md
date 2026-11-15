# Items to classify, file 7: bottlenecks from the register

### B05 (bottleneck, family machine, Open: Join done; logger awaits my install; v2 phase 1)
name: The PC powers off without warning
what happens: The PC shuts down unexpectedly and stops all agent work. Most events leave no crash code and many came with no Claude activity; the cause is not yet found.
evidence: 24 since 7 Oct, 23 without crash code [M] (compile); 25 since 1 Oct, 15 with no Claude call ten minutes before [M] (phase 1). 13 Nov: off 28 minutes, eight lanes cut [M].
what fixing it unlocks: The next event leaves a trace naming its cause; zero sleep-related events in 14 days [T]; push checkpoints make every stop cheap to recover.

### B08 (bottleneck, family machine, Open: Open in clinic; FixFlow capped at eight sessions)
name: Memory is short on this PC
what happens: RAM, not CPU, sets how many check slots, sessions and lanes can run at once; nobody has yet split memory use by process group during a build.
evidence: Clinic: 2-6 GiB available, lows 0.0-0.8 GiB with two checks [M]; browser 6.1, WSL2 5.2, Claude 3.2 GB [M]. FixFlow, 13 Nov: 5.5-7.7 of 31 GB free, eight lanes [M].
what fixing it unlocks: A table of who holds memory when under 2 GB [T] is free, so slots, caps and lane counts come from evidence.

### B10 (bottleneck, family machine, Open: D03 answered 'not now' (11 Nov))
name: Docker and databases need a manual start after a reboot
what happens: After a restart, Docker and the databases stay down until started by hand; in FixFlow a stopped Docker engine blocks every backend gate and dump restore.
evidence: Docker AutoStart off; 31 of 34 containers have restart policy 'no' [M]. Restarted by hand on 9 Nov (clinic) and 13 Nov (FixFlow, after the power loss).
what fixing it unlocks: Databases healthy within 3 minutes [T] of sign-in with no command; backend gates and restores no longer wait on a person.

### B11 (bottleneck, family machine, Open: D02 chose encrypted drive; copy not yet made)
name: The work exists only on this PC
what happens: The clinic repository has no remote and no off-machine copy, and parts of its work are uncommitted; the planned knowledge store would also start on one disk.
evidence: 432 commits, 19 worktrees, 36 branches, 55 MB packed, no remote, only drive C: [M]. Six untracked paths a bundle would miss [M]. No second drive attached (11 Nov).
what fixing it unlocks: Work survives losing the PC: a clone from the copy shows the same heads, and the copy is under 24 hours old [T].

### B15 (bottleneck, family machine, Open: Waits on D10; harness v2 phase 2)
name: Worktrees and containers pile up
what happens: Leftover worktrees, branches, sessions and containers use disk and memory. Clean-up waits for my rule, after one archive hit a session still in use.
evidence: Clinic: 19 worktrees, 36 branches, 34 containers, 25 of 26 databases stopped [M]. The app's auto-archive settings are off [M].
what fixing it unlocks: Worktree and container counts return to the active slices plus one after each merge [T]; no session lost to clean-up.

### B3-LOOP (bottleneck, family machine, Partly closed: FixFlow has breaker and resume; governor not …)
name: Usage limits stop every lane at once
what happens: When the account hits its usage or session limit, every lane stops together; agents stop mid-run, and work must be resumed or paid for again.
evidence: 14 limit episodes, 6-20 Oct [M]; subagents made 91 of 104 limit errors [M]. Ten lanes were stopped by the limit within about 15 minutes [M]. 7 of 101 refuters lost on 1 Nov [M].
what fixing it unlocks: A governor that slows lanes so the window lasts, instead of a limit stopping them all; resumes that never pay again for finished agents.

### MC-FS (bottleneck, family machine, Open: Fixes F1-F3 designed; store not built)
name: Windows file-system traps for shared stores
what happens: Shared stores on Windows hit traps: rename-over-existing fails, AppData can be virtualised for processes the Claude desktop app starts (see AppData virtualisation), SQLite reports busy under many writers, and CLI versions skew across worktrees.
evidence: Plain rename: 99-126 failures per 8 x 1,000 identical events [M]. SQLite: 2-4 busy failures per 1,200 writes at 8+ writers [M]. Content was never torn.
what fixing it unlocks: A journal that never loses or duplicates a write, shared safely across every worktree.

### MC-DOCKERCACHE (bottleneck, family machine, Closed: Cache dropped at start and end of backend runs)
name: Docker VM page cache holds on to RAM
what happens: The WSL2 virtual machine that runs Docker kept disk cache it was not using while the host was short of memory.
evidence: Docker VM held 8.3 GB, 4.4 GB of it unused cache, with eight lanes [M]. Later 6.9 GB of cache against 0.4-0.5 GB per gate stack [M].
what fixing it unlocks: Memory returned to the host at once: 2.2 GB on the first drop [M], leaving more room for lanes and slots.

### MC-AV (bottleneck, family machine, Partly closed: Worked around; the block is left alone)
name: Antivirus blocks toolchain files
what happens: The active antivirus blocks one emulator DLL every time, and once blocked a JDK DLL, so Google's sdkmanager (the Android SDK’s package installer) abandons the package.
evidence: One emulator file permanently absent; the rest of the 8.6 GB toolchain installed and checked against official archives [M].
what fixing it unlocks: No Android work is blocked today; allowing the folder, my decision, would only matter if an ANGLE GPU mode were needed.

### MC-TOOLS (bottleneck, family machine, Partly closed: Android tools installed 13 Nov; gates use Doc…)
name: Missing local tools on the PC
what happens: No Python on PATH and no installed node_modules, so backend gates run only in Docker and native questions are answered from cached sources.
evidence: Backend gates were blocked at G1 until Docker ran [M]. A Python exists only at the Codex runtime path.
what fixing it unlocks: CI-equivalent gates locally, and native questions answered without Docker-only workarounds.

### MC-PREBUILD (bottleneck, family machine, Closed: Forbidden in agent rules; L2 builds in container)
name: Native prebuild would pollute the repo
what happens: Running Expo prebuild in the repository would create an untracked technician-app/android folder that is not gitignored and changes how EAS treats the project.
evidence: Not sized. The folder would make EAS treat the app as bare and skip its config plugins (see Bare app / config plugins).
what fixing it unlocks: Safe native builds: prebuild runs only inside the L2 container, never in the repository.

### MC-INJECT (bottleneck, family machine, Open: Canary trial designed, not run)
name: Agents without approval prompts work near stored credentials
what happens: Subagents run in bypass mode while Railway and GitHub CLI credentials sit in the user profile, so a prompt injection could reach private data.
evidence: Not quantified. Credentials in the profile plus bypass-mode subagents form the exposure.
what fixing it unlocks: Cutting the private-data leg removes this whole risk class for research agents.

### MC-CPU (bottleneck, family machine, Partly closed: GPU route in use for side jobs)
name: CPU contention from parallel sessions
what happens: When other sessions run test suites on all cores, CPU side jobs slow sharply; GPU work was the one thing not slowed.
evidence: Under that load, CPU transcription ran at 2.7x real time vs 19-45x on the GPU [M].
what fixing it unlocks: Heavy side jobs moved to the otherwise idle GPU, leaving the cores for gates.

### MC-ENGINE (bottleneck, family machine, Partly closed: Linux image built; timing redesigned)
name: Graph engines hard to run here
what happens: Graph engines were hard to run on Windows: LadybugDB's algorithm extension would not load, Docker is off by default, sessions died, and CPU contention spoiled timing.
evidence: Fixed with a 1.26 GB Linux image [M]; 172 MB of Windows copies sit unused [M]. Timing aborted twice under CPU load; the session died twice.
what fixing it unlocks: Every engine arm on identical footing, and usable timings even on a busy PC.

### MC-HOOKCOST (bottleneck, family machine, Open: Not measured on FixFlow)
name: Hook and proxy overhead is unmeasured
what happens: Added hooks and proxies are new moving parts whose cost has been measured in the clinic testbed but not on FixFlow's setup.
evidence: Clinic testbed: hook launch about 2.1 s native, 243 ms via the Windows wrapper, 4.9 ms in-process [M]. Not yet measured on FixFlow.
what fixing it unlocks: Knowing the cost before adding per-event hooks avoids a hidden tax on every tool call.

### B06 (bottleneck, family check, Partly closed: Container run built, not the gate; waits on D…)
name: The check is slow on Windows
what happens: On Windows the test runner reaches the database through Docker Desktop's published port, so workers wait on that network hop instead of using the CPU.
evidence: 0.63 ms vs 0.13 ms per trivial query; workers about 40 % busy [M]. Whole check 367.2 s on Windows vs 230.1 s in the Linux container, 1.6x [M].
what fixing it unlocks: A median gate near 230 s [T], about 1.6x faster than the Windows gate [M], with Linux parity (B18) in the same move.

### B07 (bottleneck, family check, Open: Memory guard only; harness v2 phase 2)
name: Checks queue behind each other
what happens: Check capacity is slots divided by run time; past that, lanes queue. The second slot opens only with 8 GiB free, so in practice there is one.
evidence: 19 recorded waits: median 409 s, longest 2,030 s [M]. 8 GiB never free in about 980 samples [M]. Two slots measured at 1.8-1.9x throughput [M].
what fixing it unlocks: Median wait under a minute [T]; a second slot open on at least half the polls [T]; up to 1.8-1.9x check throughput [M].

### B09 (bottleneck, family check, Open: Bounded by watchdog; not reproduced; v2 phase 2)
name: A check hung with no named cause
what happens: A parallel check pass stalled and the watchdog killed it, with no signal naming the running test. The stall has not been reproduced.
evidence: Stall limit 600 s [S]. The one real stall was killed after 961 s, whole check 1,116 s [M]. A 754 s run was a planted dying-worker demo, not a second hang [M].
what fixing it unlocks: The next stall names its test and cause; the stall limit can drop to about 120 s [T] once 20 loaded runs [T] show no false kills.

### B18 (bottleneck, family check, Partly closed: Linux run built, not the gate; waits on D09)
name: Tests ran only on Windows
what happens: Production runs on Linux but the gate check runs on Windows, so Linux-only failures can reach main. It is the same decision as B06.
evidence: 2 of 2,472 tests failed only on Linux, in POSIX code never exercised on this PC [M]. Linux run 230.1 s vs Windows 367.2 s [M].
what fixing it unlocks: Zero Linux-only failures on main [T], with a faster gate in the same move.

### B20 (bottleneck, family check, Open: Not started; harness v2 phase 4)
name: Load test not rerun after the fix
what happens: After the query fix, single-client page speed was re-measured, but the 12-clerk concurrent load drill with backups was not rerun.
evidence: At 75,016 documents pages ran p50 109-468 ms, none above 524 ms p95 [M]. The last 12-clerk run predates the fix: posting p50 3.4-7.5 s, p95 up to 16 s [M].
what fixing it unlocks: A regression signal now; proof of the capacity envelope on a rented host; a stock ledger at 250,000 movements [T].

### LIB-KS-RUNCHECKS (bottleneck, family check, Open: Designed, not built; Docker gate is KS-6a)
name: Stored checks cannot run safely on Windows
what happens: The knowledge store's stored checks need a sandbox: Claude Code's sandbox does nothing on native Windows, backend tests TRUNCATE any given database, and Docker does not auto-start.
evidence: A Docker verify would add 1-5 minutes of wall time [E]. Without Docker, test-id and database checks usually come back 'inconclusive'.
what fixing it unlocks: Executable checks for code defects once the Docker gate exists; until then, v1's realistic value is the configuration-trap class.

### MC-NETPOOL (bottleneck, family check, Closed: Gates share the database container's network)
name: Docker network address pools exhausted
what happens: Another project's networks used up Docker's predefined subnets, so creating a gate network failed and the original gate design could not run.
evidence: 29 networks from another project filled the predefined address pools [M]; 'docker network create' failed.
what fixing it unlocks: Parallel per-lane gates without touching or pruning another project's networks.

### MC-QUEUE (bottleneck, family check, Closed: Ticket queue built; waits not re-measured)
name: Gate queue let later arrivals go first
what happens: Random retries let later arrivals jump the gate queue, and exclusive Android builds at the head held up short runs. This is FixFlow's version of B07.
evidence: One lane waited 20 minutes while later arrivals were served; two exclusive Android builds held eight short runs for most of an hour [M].
what fixing it unlocks: Predictable first-come waits for every lane; a heavy job cannot starve once it has waited 900 s [S].

### MC-GATETIME (bottleneck, family check, Partly closed: Accepted; inner runs limited by arguments)
name: Gate runs take minutes
what happens: The backend gate stack is the slowest check a lane runs, and it queues for a slot; gates also set the elapsed time of discovery workflow W1.
evidence: Backend 7 min 23 s cold with 757 tests; web 33 s; mobile 29 s warm [M]. W1 gate wall-clock estimated at 25-40 min [E].
what fixing it unlocks: Short inner loops that run only the tests in hand, with full gate runs kept for merge-readiness.

### MC-NATIVE (bottleneck, family check, Open: Lab lane L2 under way since 13 Nov)
name: No native Android compile gate
what happens: CI's expo export bundles JavaScript only, so Gradle and native breaks are caught nowhere and the EAS queue is slow; the app has no testIDs for device checks.
evidence: Native compile time not yet measured. 0 testID or accessibilityLabel hits in technician-app/src [M].
what fixing it unlocks: A compile check in minutes instead of an EAS queue, answering the SDK 52 background-location build question before any phone is involved.

### MC-NOEMU (bottleneck, family check, Closed: Native emulator boots under WHPX (13 Nov))
name: No Android emulator inside Docker
what happens: The Docker VM has no /dev/kvm, so the device lab must run its emulator natively on the Windows Hypervisor Platform.
evidence: 0 svm flags in the Docker VM [M]. A native emulator booted Android 14 on 13 Nov, holding 3.8 GB of host RAM [M].
what fixing it unlocks: A device lab on this PC, using an RTX 5070 that has no other job in the program.

### MC-SHAREDDB (bottleneck, family check, Closed: Per-lane lock; refused second run proved (exit 4))
name: Two test runs could share a database
what happens: A second pytest run against one database deadlocks; a check-then-remove race let two runs for one lane touch the same containers.
evidence: One major refuter finding on 13 Nov [M]; the handoff (§2.4) records the deadlock.
what fixing it unlocks: Reliable gates: never a second pytest against one database, enforced per lane.

### MC-ENVSKEW (bottleneck, family check, Partly closed: node:22 reruns in use; P3a moves to 17)
name: Local gates differ from CI and production
what happens: Gate results can differ from CI and production: this PC runs Node 24 while CI pins 22, the backend has no lockfile, and CI tests Postgres 16 against production's 17.
evidence: Node 24 here vs 22 in CI [M]. Open dependency ranges and no backend lockfile. CI tests on Postgres 16; production runs 17.
what fixing it unlocks: Fewer false defects, and gates that reproduce what production actually ran.

### MC-TIMEOUT (bottleneck, family check, Closed: Rule plus fixed names make second starts fail)
name: Re-issuing a command after a timeout
what happens: Re-issuing a mutating command after the tool times out can duplicate its effects.
evidence: Tool timeout 600,000 ms per command [S].
what fixing it unlocks: Safe retries after a timeout, with no duplicated containers, writes or runs.

### PR-SCRIPTTEST (bottleneck, family check, Open: Contract fixed; stub harness S-3 proposed)
name: Workflow-script bugs found only by review
what happens: Nothing runs a workflow gate script without a model, so its bookkeeping defects were found by review, not by tests.
evidence: 3 bookkeeping defects found by review [M]: not_started on HALT, a swallowed catch, a cached null re-served.
what fixing it unlocks: A stub harness tests the script body at zero model spend, making resume reliable.

### PR-EVFORMAT (bottleneck, family check, Open: Allow-list not written (card T-08))
name: Evidence-format checks misfire
what happens: A naive 'path:line — quote' regex flags many legitimate evidence strings (library paths, commands, web forms), so the check script needs an allow-list.
evidence: 174 of 707 W2 evidence strings flagged, mostly legitimate [M].
what fixing it unlocks: A tuned record-only check that finds real format violations at zero tokens.

### PR-FALSEGREEN (bottleneck, family check, Partly closed: Lab gates fixed; CI change scoped to P1)
name: Green checks that test nothing
what happens: A check can pass while testing nothing: backend integration tests all skip without a database URL, mobile CI passes with no tests, and an installer reported false success.
evidence: conftest skips every integration test when FIXFLOW_TEST_DATABASE_URL is unset [M]. One installer printed 'INSTALL OK' with nothing installed [M].
what fixing it unlocks: Green that means something: the lab baseline already shows 757 tests, 0 integration tests skipped [M].

### PR-MOBILEBOUNDARY (bottleneck, family check, Open: Planned: dependency-cruiser in P5b-2)
name: Mobile code boundaries not enforced
what happens: The mobile app has no import contract, so the rule that writes go only through the outbox exists only in prose.
evidence: 1 of 3 runtimes has no boundary enforcement [M]; the repository is about 56k lines.
what fixing it unlocks: The 'writes only through the outbox' invariant enforced by CI instead of by memory.

### PR-SCREENTEST (bottleneck, family check, Open: Worked around with pure functions)
name: No screen tests for the mobile app
what happens: The mobile app has no screen-test harness, so UI logic is kept in pure functions and device smoke tests are the only route to the screens.
evidence: Not measured. No @testing-library/react-native or react-test-renderer; 0 testIDs in technician-app/src [M].
what fixing it unlocks: An automated arrival-flow smoke test on a device or the lab emulator.

### B01 (bottleneck, family review, Open: Harness v2 phase 3; replay not run)
name: Fix rounds that create new defects
what happens: Our fixes added new stored state (a hold, lock, marker or cutoff) whose endings nobody tested, so each fix round produced fresh P1s and the rounds did not converge.
evidence: Round one: 19 P1 [M]; fixes then made at least 5 more P1 and 10 P2 [M]. 64 % of reviews sent a slice back, 2.8 rounds per slice [M].
what fixing it unlocks: Review rounds that converge under a stop rule, shown as fewer fix-made defects per fixed finding than the testbed's rate.

### B12 (bottleneck, family review, Open: Harness v2 phase 3; claims script not built)
name: Agent reports overstate what was done
what happens: Session and agent reports claimed tests, evidence or runs that did not exist or did not match, and model re-checks did not stop it.
evidence: 20-plus recorded overstatements, with no denominator [M]. S11 round 2 had two claims its cited evidence did not support [M]. My reviews corrected model counts three times [M].
what fixing it unlocks: Claims anyone can recheck by script, flagging recorded overstatements with false flags under 10 % [T], so the root stops re-verifying by hand.

### B17 (bottleneck, family review, Open: Harness v2 phase 3; FixFlow reviews bind head SHA)
name: Final commits not yet read by a person
what happens: All review is a model reading a model's code, and most high-risk branches merged before anyone had read their final head commit.
evidence: 4 of 5 merges on 10 Nov unread [M]; 5 of 6 high-risk final heads unread [M]. Round three was the root alone in 9 of 11 gates [M].
what fixing it unlocks: Unread high-risk merges cut from 5 of 6 [M] to zero [T].

### B21 (bottleneck, family review, Open: Harness v2 phase 3; waits on D12)
name: Minor findings pile up uncounted
what happens: Low-priority P3 findings were carried forward with no status column, so nobody can count how many are still open.
evidence: 111 P3 findings in round one across ten slices [M]; 183 distinct P3 ids on the board with no status [M]. The original list said 'dozens'.
what fixing it unlocks: An open count exists, and every pilot-critical finding has a verdict.

### W2 (bottleneck, family review, Open: No hooks by choice; measurement designed)
name: Agents' compliance is self-reported
what happens: With no hooks, 'routine skipped', 'store never consulted' and 'store useless' look the same from outside; analysts' extra reads are self-listed and unaudited.
evidence: 148 idea families and 339 cards bear on it; the first pass kept 10 adopt and 19 trial [M]. Missed-store counts are only a lower bound; reads not yet measured.
what fixing it unlocks: An outside check of compliance without hooks: transcript tallies, a PR-body CI check, reviewer-brief clauses and a read audit.

### L3 (bottleneck, family review, Open: One adopt and nine narrowed trials)
name: Verifiers not yet shown to catch defects
what happens: Outputs are capped and refuters run first, but no reviewer, gate or verifier has yet been shown to catch defects that slipped through before.
evidence: 95 idea families and 255 cards bear on it; the first pass kept 1 adopt and 9 trials [M].
what fixing it unlocks: Stronger sensors and reviewer briefs that catch our recurring defect shapes, proven on known misses.

### LIB-KS-DIFF (bottleneck, family review, Open: Designed; handles on over ~5 % of commits refused)
name: Forbidden changes merge silently
what happens: A refuted fix or known defect pattern raises no error and can merge silently; a warning joined on file paths alone fires too often to read.
evidence: For ex4, distinctive handles warned on 13 of 154 past commits; a file-level join would fire on 47 [M]. The v1.3 rule would warn on 48.7 % [M].
what fixing it unlocks: Do-not-apply entries that stop known-wrong changes before review, with warnings rare enough to read.

### LIB-KS-BLIND (bottleneck, family review, Partly closed: Action handles, KS-D17 test, review lookup; h…)
name: Changes the store's warnings cannot see
what happens: Some risky changes leave no git diff (a Railway env flip, a hand cursor reset, a snapshot restore); others escape through new code paths or shell edits.
evidence: Not sized yet.
what fixing it unlocks: Guarding against a permanent mass message to customers and keeping the correct-PIN lock invariant intact.

### LIB-KS-POLICY (bottleneck, family review, Open: Accepted for now; KS-D20 optional)
name: Store safeguards are policy, not locks
what happens: The journal is plain JSON on disk and writer ids are self-declared, so withheld fixes and 'approver is not author' rest on policy and review.
evidence: Not sized.
what fixing it unlocks: Gated fixes and stronger curation control, if writer ids are later bound to transcripts.

### PR-VERIFYBUDGET (bottleneck, family review, Partly closed: Budget-by-priority adopted as a lesson)
name: Verification budget spent first-come
what happens: The skeptic cap was used up by the first analysts to finish, so plan-critical claims (geofence, security, drain) overflowed unchecked.
evidence: 12 Opus skeptics, the cap, for 139 findings in G2 [M]; all twelve went to the first four analysts [M].
what fixing it unlocks: Allocating by priority keeps plan-critical claims checked while spend stays bounded, with any overflow carried as a named risk.

### PR-SEVERITY (bottleneck, family review, Open: Inertia mitigated by judgement-free discovery rule)
name: Severity labels drift between stages
what happens: Output schemas carry no descriptions, so P0-P3 are undefined to the model; a cheap first impression can harden into a priority, and skeptics often lowered severities.
evidence: 8 of 12 skeptic verdicts in G2 lowered a severity [M].
what fixing it unlocks: Defining each value once could raise analyst-skeptic agreement and give cleaner priorities.

### PR-CAPS (bottleneck, family review, Closed: Closed in v3 by backlog and open-risks list)
name: Silent caps hid findings
what happens: Per-analyst caps and truncation made omitted findings invisible.
evidence: The v2 design capped each analyst at 6 findings [S].
what fixing it unlocks: Every claim either visible or logged, so nothing is dropped unseen.

### PR-BRIEFTEST (bottleneck, family review, Open: Parked; no brief edit has flipped a verdict)
name: Brief edits cannot be tested cheaply
what happens: A brief's inputs are the live repo and the web, so regression-testing a brief edit costs many Opus runs, our scarcest resource.
evidence: 60-180 agent runs per brief edit [E].
what fixing it unlocks: A cheap regression path, so we can edit briefs with confidence.

### PR-DOCDRIFT (bottleneck, family review, Partly closed: Head check in P1 scope; memory pointer-only)
name: Docs and memory drift from the code
what happens: CLAUDE.md facts, prose docs, design lines and memory drift from the code and each other; for example, HANDOFF A2 prescribes what CLAUDE.md forbids.
evidence: 517 of 1,268 backticked file names in docs do not resolve [M]. The knowledge-store seed (121 rows) found 4 contradictions; its later contradiction list names 7 [M].
what fixing it unlocks: Agents trust current facts, and we gain a cleaned, checkable seed corpus for the knowledge store.

### PR-PLANLOSS (bottleneck, family review, Closed: Verify-by-content rule adopted)
name: Plan rewrites can lose content
what happens: A plan rewrite was reported from its commit message rather than its content, and content was lost.
evidence: One recorded state loss, commit 093b793 [M]; the programme's only one.
what fixing it unlocks: Plan changes we can trust.

### PR-PLANDEFECTS (bottleneck, family review, Closed: Delta check on every major revision)
name: Plan revisions carry defects
what happens: Major plan revisions carried defects; the v6 delta's blocker would have stripped every crossing of its coordinates.
evidence: The v6 delta check found 1 blocker, 20 major, 20 minor, 7 notes [M]. The v9.1 refuter found 1 blocker, 7 major, 12 minor [M].
what fixing it unlocks: A plan that survives review before work starts.

### PR-AUTHORBRIEF (bottleneck, family review, Closed: Coordinator owns binding review; P1 passed it)
name: Author wrote its own reviewer's brief
what happens: When the implementing lead decides what its binding reviewer attacks, the review can miss the author's blind spots.
evidence: 1 major refuter finding [M].
what fixing it unlocks: Independent binding review of every PR.

### PR-DRAIN (bottleneck, family review, Partly closed: Fixed in plan; cut not yet made or verified)
name: Drain branch could absorb unrelated work
what happens: A drain branch cut at P1's squash assumed nothing merged first; build-ahead lanes could put unreviewed work into the drain image.
evidence: 1 blocker [M].
what fixing it unlocks: A reviewed drain image.

### PR-OUTSIDEEVIDENCE (bottleneck, family review, Partly closed: Ideas narrowed; trials designed)
name: Outside harness ideas have weak evidence
what happens: Most claims in outside harness material are anecdotal or simply asserted, so few ideas can be adopted on evidence alone.
evidence: Of 311 addendum cards: 37 measured, 141 anecdotal, 128 asserted, 5 marketing [M].
what fixing it unlocks: Fair experiments turn outside claims into tested ideas.

### B04 (bottleneck, family orchestrator, Open: Harness v2 phase 3; gate workflow not built)
name: One orchestrator is the serial gate
what happens: One root session reviews, merges, edits the board and runs checks, so it caps how fast work leaves, and its window keeps overflowing and being summarised.
evidence: Root compacted at 574k, 974k, 967k and 970k tokens [M]; a second count of the same transcripts finds three compactions [M]. Root is 15.3 % of November tokens, about 499k per call [M].
what fixing it unlocks: No compaction across a wave of five gates [T]; the gain is bounded because the root is 15.3 % of tokens [M].

### B13 (bottleneck, family orchestrator, Open: Harness v2 phase 3; not built)
name: Shared documents have one writer
what happens: The root hand-edits one large board at every merge, and routing documents and model-written state files go stale.
evidence: Board 829 lines, 219,111 bytes at sweep time; 838 lines on 11 Nov; 221 KB in the compile [M]. AGENTS.md grew from 6,709 to 10,698 bytes [M].
what fixing it unlocks: Board under 20 KB [T] and zero root edits at merge [T], from per-slice state fragments and a generated board.

### B16 (bottleneck, family orchestrator, Open: Premise corrected; harness v2 phase 3; D13 pending)
name: Agent reports flow through the orchestrator
what happens: Subagents' full reports return into the root's context instead of files, so the root fills; the 'subagents cannot write' belief was itself an unchecked report.
evidence: Root runs about 499k tokens of context per call [M]. Subagents made 82.4 % of 4,155 October calls [M]. A probe showed a subagent writes and reads back a file [M].
what fixing it unlocks: Zero refused writes over 20 runs [T]; a smaller root window, and gate decisions that fit in it.

### R4 (bottleneck, family orchestrator, Open: Designed in harness v2; not built)
name: The pile-up after a stop
what happens: A waiting lane keeps holding its context; after a stop every lane is released at once and all queue again for the same check slot.
evidence: Every session was released together on 9 Nov; one check then waited 2,030 s [M].
what fixing it unlocks: Lanes released two at a time with waits parked outside sessions, so a restart no longer recreates the queue.

### W3 (bottleneck, family orchestrator, Partly closed: P1 trial 10/10; fault-injected resume not run)
name: Resuming from repo state, proven once
what happens: We needed proof that a fresh session can pick up a phase from the repository and PR body alone, without the chat that produced it.
evidence: P1's cold-resume trial on 13 Nov: a fresh Sonnet agent recovered 10 of 10 frozen facts [M]. 102 idea families and 266 cards bear on it [M].
what fixing it unlocks: Confidence that phases resume from repo state; the trial also exposed six plan defects we can now fix.

### W4 (bottleneck, family orchestrator, Partly closed: Packages on draft PR #185; checks not run)
name: Agents lack tested domain skills
what happens: Agents once had one custom agent (a Haiku locator) and no domain skills; the new packages still lack trigger, preload, size and retirement checks.
evidence: Design section 9 asked for 11 domain skills [M]; 13 skills and 11 agents are now packaged, about 24k characters of descriptions [E]. 72 families, 147 cards [M].
what fixing it unlocks: Every agent starts with the right domain rules; skills are verified, trimmed, and retired when unused.

### W5 (bottleneck, family orchestrator, Open: Save rule proposed, not adopted)
name: Workflows are not saved for reuse
what happens: Workflow scripts are written fresh for each task and not kept; no rule decides which proven shapes to save.
evidence: 29 idea families and 43 cards bear on it; none reached adopt or trial in the first pass [M].
what fixing it unlocks: A curated library of proven workflow shapes, so a new task starts from a script that already worked.

### LIB-KS-DUP (bottleneck, family orchestrator, Open: Claim table designed; expiry deferred)
name: Parallel sessions solve the same problem
what happens: Two sessions can miss on the same symptom and both escalate to the expensive model tier.
evidence: Not measured yet; the store's concurrent-misses view is designed to show it.
what fixing it unlocks: One session solves the problem while the other carries on with other work.

### MC-HEREDOC (bottleneck, family orchestrator, Partly closed: Worked around: scripts written with the file …)
name: Shell tool alters long scripts
what happens: The Bash tool here collapses doubled backslashes inside heredocs and silently cuts commands over about 8 KB, which breaks long generated scripts.
evidence: One review run's first pass lost its families to a mangled regex: 1.38M tokens and 15 minutes [M].
what fixing it unlocks: No more runs lost to tooling, and long scripts that arrive intact.

### PR-AGENTNULL (bottleneck, family orchestrator, Open: Open unknown; one probe away)
name: Agent failures look the same
what happens: agent() returns an object or null with no attempt count, so a schema-exhaustion failure looks the same as a usage-limit null.
evidence: Not sized; one open unknown.
what fixing it unlocks: Tagged results let the circuit breaker count only the nulls that really suggest a limit.

### PR-BRIEFFACTS (bottleneck, family orchestrator, Partly closed: Gate record first; commit-push-tag before bri…)
name: Agents start without the settled facts
what happens: Agents were briefed before settled facts existed: G2 analysts fell back on hypotheses, sweep assessors lacked design rules, and a lane could read uncommitted plan text.
evidence: One gate record missing at dispatch [M]. 8 of 24 assessment adopts were already programme law [M]. One minor refuter finding on uncommitted plan text [M].
what fixing it unlocks: Every analyst and lane starts from settled, committed facts, with fewer wasted assessment and refuter passes.

