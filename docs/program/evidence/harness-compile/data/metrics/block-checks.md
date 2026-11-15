# Dossier: block "checks" (mechanisms: check_capacity)

8 bottlenecks and 18 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### B06 · The check is slow on Windows
family check; state: Partly closed: Container run built, not the gate; waits on D09; package WP2a; metrics: time, throughput (primary time)
what: On Windows the test runner reaches the database through Docker Desktop's published port, so workers wait on that network hop instead of using the CPU.
evidence: 0.63 ms vs 0.13 ms per trivial query; workers about 40 % busy [M]. Whole check 367.2 s on Windows vs 230.1 s in the Linux container, 1.6x [M].
what fixing it unlocks: A median gate near 230 s [T], about 1.6x faster than the Windows gate [M], with Linux parity (B18) in the same move.
first step: Decide D09: make the container run the gate; run Windows only when Windows-side tools change.

### B07 · Checks queue behind each other
family check; state: Open: Memory guard only; harness v2 phase 2; package WP2a; metrics: throughput, time (primary throughput)
what: Check capacity is slots divided by run time; past that, lanes queue. The second slot opens only with 8 GiB free, so in practice there is one.
evidence: 19 recorded waits: median 409 s, longest 2,030 s [M]. 8 GiB never free in about 980 samples [M]. Two slots measured at 1.8-1.9x throughput [M].
what fixing it unlocks: Median wait under a minute [T]; a second slot open on at least half the polls [T]; up to 1.8-1.9x check throughput [M].
first step: Measure one check's peak memory, set slots from it, add a fair queue with a printed position.

### B09 · A check hung with no named cause
family check; state: Open: Bounded by watchdog; not reproduced; v2 phase 2; package WP2a; metrics: time, quality (primary time)
what: A parallel check pass stalled and the watchdog killed it, with no signal naming the running test. The stall has not been reproduced.
evidence: Stall limit 600 s [S]. The one real stall was killed after 961 s, whole check 1,116 s [M]. A 754 s run was a planted dying-worker demo, not a second hang [M].
what fixing it unlocks: The next stall names its test and cause; the stall limit can drop to about 120 s [T] once 20 loaded runs [T] show no false kills.
first step: Make the heartbeat record the running test, dump worker stacks on a stall, check Windows sleep/wake records.

### LIB-KS-RUNCHECKS · Stored checks cannot run safely on Windows
family check; state: Open: Designed, not built; Docker gate is KS-6a; package WP6b; metrics: hallucination, quality (primary hallucination)
what: The knowledge store's stored checks need a sandbox: Claude Code's sandbox does nothing on native Windows, backend tests TRUNCATE any given database, and Docker does not auto-start.
evidence: A Docker verify would add 1-5 minutes of wall time [E]. Without Docker, test-id and database checks usually come back 'inconclusive'.
what fixing it unlocks: Executable checks for code defects once the Docker gate exists; until then, v1's realistic value is the configuration-trap class.
first step: Build the declarative probes first; start KS-6a's Docker gate only after KS-5 says go, with Docker running.

### MC-NETPOOL · Docker network address pools exhausted
family check; state: Closed: Gates share the database container's network; package WP2b; metrics: throughput (primary throughput)
what: Another project's networks used up Docker's predefined subnets, so creating a gate network failed and the original gate design could not run.
evidence: 29 networks from another project filled the predefined address pools [M]; 'docker network create' failed.
what fixing it unlocks: Parallel per-lane gates without touching or pruning another project's networks.
first step: Give anything that needs a real network an explicit subnet inside 10.77.0.0/16.

### MC-QUEUE · Gate queue let later arrivals go first
family check; state: Closed: Ticket queue built; waits not re-measured; package WP2b; metrics: time, throughput (primary time)
what: Random retries let later arrivals jump the gate queue, and exclusive Android builds at the head held up short runs. This is FixFlow's version of B07.
evidence: One lane waited 20 minutes while later arrivals were served; two exclusive Android builds held eight short runs for most of an hour [M].
what fixing it unlocks: Predictable first-come waits for every lane; a heavy job cannot starve once it has waited 900 s [S].
first step: Measure gate waits per lane under the new ticket queue.

### MC-GATETIME · Gate runs take minutes
family check; state: Partly closed: Accepted; inner runs limited by arguments; package WP2b; metrics: time, throughput (primary time)
what: The backend gate stack is the slowest check a lane runs, and it queues for a slot; gates also set the elapsed time of discovery workflow W1.
evidence: Backend 7 min 23 s cold with 757 tests; web 33 s; mobile 29 s warm [M]. W1 gate wall-clock estimated at 25-40 min [E].
what fixing it unlocks: Short inner loops that run only the tests in hand, with full gate runs kept for merge-readiness.
first step: Pass pytest arguments for the tests being worked on; record a warm backend time for comparison.

### MC-SHAREDDB · Two test runs could share a database
family check; state: Closed: Per-lane lock; refused second run proved (exit 4); package WP2b; metrics: quality, throughput (primary quality)
what: A second pytest run against one database deadlocks; a check-then-remove race let two runs for one lane touch the same containers.
evidence: One major refuter finding on 13 Nov [M]; the handoff (§2.4) records the deadlock.
what fixing it unlocks: Reliable gates: never a second pytest against one database, enforced per lane.
first step: Keep the per-lane lock first in every gate kind; re-prove it after any harness change.

## Ideas (most mature first)

### MAC-10 · Memory headroom guard on the second check slot
stage: In use; package WP2a; metrics: time, throughput (primary time); answers: B08, B07, B05
problem: Two simultaneous checks drove free memory to 0.0-0.8 GB [M], the suspected cause of unclean shutdowns.
how: The second slot opens only while 8.0 GiB of physical memory is free, re-read at every poll; unreadable means closed.
where it stands: In use in the testbed but collapses to one slot: in about 980 samples [M], 8 GiB [S] was never free (2.1-6.2 GiB [M]). Waits 647, 3, 256, 614 s [M].
next: Measure the per-check memory footprint first; a guard on idle-session or container count may matter more than free RAM.
origin: Clinic testbed

### CHK-01 · Parallel check with one database per worker
stage: In use; package WP2a; metrics: time, throughput (primary time); answers: B06, B07, B18
problem: The full run took about 14 minutes [M], so every gate and review round waited on it, and one session's wait held up everyone behind it.
how: Six pytest-xdist workers, one PostgreSQL test database each, plus a serial pass for race tests. A script proves every test ran exactly once.
where it stands: In use in the testbed: 855.2 s [M] became a mean of 283.8 s [M] over 12 runs (range 268.3 to 298.3 s [M]), about 3.0x faster. Eight workers gain only 3% [M].
next: Keep as the speed baseline; re-measure the worker count for FixFlow's backend, which needs per-worker databases.
origin: Clinic testbed; my request

### CHK-02 · Machine-wide check lock with two slots
stage: In use; package WP2a; metrics: throughput, time (primary throughput); answers: B07, B08, B05
problem: Several sessions running full checks at once coincided with unexpected power-offs and slowed each other, then queued behind one another.
how: An OS file lock shared by all worktrees, two slot files, one check per checkout. The second slot opens only with 8 GiB [S] free.
where it stands: In use: two overlapping checks took 435 s [M] each against 389 to 418 s [M] alone, 1.8 to 1.9x [M] throughput. The 8 GiB gate never opened in about 980 samples [M].
next: Measure one check's peak memory, set the slot count from it, and add a fair queue with a printed position.
origin: Clinic testbed

### CHK-03 · Stall watchdog, heartbeat and queue position
stage: In use; package WP2a; metrics: time, efficiency (primary time); answers: B09, B14
problem: A check that hangs silently costs minutes and holds up the queue, and I cannot see progress while a check waits or a loop runs long.
how: A plugin writes a heartbeat on each test event; 600 s [S] of silence kills the process tree. Planned: waiting/running/stalled states, stack dumps.
where it stands: Watchdog in use in the testbed; one real hang was killed after 961 s [M], cause never found. Heartbeat states, stack dump and queue position are designed; hooks stay off (D17).
next: Record the last started test, dump worker stacks on a stall, then lower the limit toward 120 s [T].
origin: Clinic testbed; Bottleneck compile; Harness v2 design

### CHK-08 · Start-up cost found by tracing
stage: In use; package WP2a; metrics: time (primary time); answers: B06
problem: Even a 16-test run paid a large fixed start-up cost that no test caused.
how: Tracebacks from Python’s faulthandler (which prints where a stuck process is) showed pytest's base-temp step (setting up its temporary-folder root) taking about 32 s [M] via symlink on Windows; --basetemp fixed it.
where it stands: In use in the testbed: 43 s to 11.5 s [M] on a 16-test run. Windows-specific; why the symlink was slow is not explained.
next: Pass --basetemp or avoid tmp_path in FixFlow runs on this PC; it would likely hit the same cost.
origin: Clinic testbed

### CHK-09 · Native Windows stays the gate, Linux optional
stage: In use; package WP2a; metrics: quality, time (primary quality); answers: B18, B06
problem: Native and container modes cover different code, so we need to decide which run counts as the gate.
how: Only native exercises Windows branches (job object, file lock, socket retry), so it stays the gate, run when devtools change or as canary.
where it stands: Decision in force in the testbed. No measurement of its own; it forgoes about 230 s [M] against about 367 s [M]. Harness v2 proposes the container as gate instead (D09).
next: Decide explicitly which mode is the gate (D09).
origin: Clinic testbed

### CHK-11 · Fair first-come queue with heavy-job patience
stage: In use; package WP2b; metrics: time, throughput (primary time); answers: MC-QUEUE, B07
problem: Waiters retried at random: one lane waited 20 minutes [M] while later arrivals were served; two Android builds stalled eight short runs for about an hour [M].
how: Tickets give arrival order. A light job may pass a heavy one that waited under 900 s [S]; after that the heavy job blocks.
where it stands: In use in FixFlow's slot script, rewritten after those failures. Waits since the change are not yet measured.
next: Measure waits after the change; it could confirm that short runs no longer starve.
origin: Ship plan §7; coordinator failures

### CHK-12 · Per-lane gate harness with Docker recipe
stage: In use; package WP2b; metrics: throughput, quality, time (primary throughput); answers: B07, MC-SHAREDDB, MC-GATETIME
problem: A gate script reporting only the last exit code hides which gate failed, and allowing one backend gate at a time blocked parallel lanes.
how: ff-gates.sh runs each gate in a lane-named container with its own database, a read-only source copy, per-gate logs, exit-code lines and a summary.
where it stands: In use by every FixFlow lane, and measured: backend 757 tests [M] in 7 min 23 s [M] cold; web 106 tests in 33 s [M]; mobile 334 tests in 29 s [M].
next: Lanes pass pytest arguments in the inner loop and keep full runs for merge-readiness.
origin: Orchestration design; Ship plan §7

### MSR-01 · Worker sweep and load sampler
stage: In use; package WP2a; metrics: time, throughput (primary time); answers: B07, B08, B05, B20
problem: We want worker and slot counts chosen from measurement, and memory and CPU visible during checks and drills.
how: Sweep workers (6, 9, 12, 16) while a sampler logs CPU and free memory to CSV; test a pair before approving a second slot.
where it stands: In use on checks: 6 workers 137.5 s [M], 12 workers 104.7-135.1 s [M]; knee between 6 and 12. Two container checks run together took 266-267 s [M] each, against 220 s [M] for one run alone in the same test.
next: Run the sampler on the Windows PC itself to diagnose shutdowns and idle-session memory.
origin: Clinic testbed

### CHK-22 · Two container checks at once
stage: Tested; package WP2a; metrics: time, throughput (primary time); answers: B07, B08
problem: Checks queued behind each other for up to 34 minutes even though one check does not use the whole machine.
how: Run two container checks at the same time on the PC, since each needs less than the whole machine.
where it stands: Measured, not used: 266 s and 267 s [M] together against about 440 s [M] in a row; least free memory 5.3 GB [M].
next: Measure one check's peak memory and size the slots from it; this could nearly halve queue waits.
origin: Clinic testbed

### CHK-23 · Non-durable test-database settings
stage: Tested; package WP2a; metrics: time (primary time); answers: B06
problem: We wanted to know whether the test database's disk writes were slowing the check.
how: The dev and test Postgres container runs with fsync, synchronous commit and full-page writes switched off, in the compose file only; deploy files untouched.
where it stands: Tested in the testbed: 316 s to 297 s [M] on single runs, inside the noise. The check is CPU-bound, not flush-bound, so the gain is unproven.
next: Cheap to copy for a local Postgres test container, kept out of production; a clean same-tree comparison would settle it.
origin: Clinic testbed

### MSR-06 · Slow-path diagnosis: Windows to Docker port
stage: Tested; package WP2a; metrics: time, throughput (primary time); answers: B06, B07, B08
problem: Adding test workers stopped helping, and we wanted to find where the time actually went.
how: Measure machine, worker and VM CPU during a parallel pass, and per-query latency from Windows against inside the container.
where it stands: Testbed measurement: machine at 42 % [M] of 24 processors; six workers used 2.45 [M] cores; a trivial query took 0.63 ms [M] from Windows, 0.13 ms [M] in the container.
next: Check whether workers wait on a network hop before adding more; it points to running tests beside the database.
origin: Clinic testbed

### CHK-26 · Linux container check, proposed as the gate
stage: Built; package WP2a; metrics: time, quality (primary time); answers: B06, B18, B07
problem: Tests ran only on Windows while production is Linux, and the Windows-to-Docker database path made the check slow and hid Linux-only failures.
how: A pinned Debian 12 container beside the database, 12 workers [S], a hash-verified copy of the tree, and no fallback to native.
where it stands: Built in the testbed, optional: mean 230.1 s [M] against 367.2 s [M] native, about 1.6x faster. The Linux run found 2 failures [M] in 2,472 tests that Windows missed.
next: My decision D09 to make it the gate, then build in harness v2 phase 2; expect one fix-up round.
origin: Clinic testbed; Harness v2 design

### CHK-28 · Check slots sized from one measured memory number
stage: Designed; package WP2a; metrics: time, throughput (primary time); answers: B07, B08
problem: Checks wait 6 to 34 minutes behind each other: one slot open, longest wait 2,030 s [M].
how: Measure one check's peak memory, size the slots from it, run a fair queue printing each place, and run one full gate per round.
where it stands: Designed in harness v2 phase 2, not yet run; peak-memory table still to take. Target: second slot open on at least half of polls, median wait under a minute [T].
next: Take the peak-memory table, then decide D11; it could open the second slot safely.
origin: Harness v2 design; Bottleneck compile

### PAR-17 · Gates in their own phase, long agents first
stage: Designed; package WP4; metrics: time, throughput (primary time); answers: MC-GATETIME
problem: Test and build gates run 25 to 40 minutes [E] and must not block or collide with the reader agents.
how: Long gates issue first in a separate Gates phase readers do not wait on; their writes are disjoint from what readers read.
where it stands: Designed in the orchestration design as part of the first workflow's contract; not yet tested.
next: Time the gates alongside readers in that first workflow.
origin: Orchestration design

### MEM-48 · Docker test-id gate and Jest/Vitest phase signal
stage: Designed; package WP7; metrics: quality (primary quality); answers: LIB-KS-RUNCHECKS
problem: Entries whose cause lives in code behaviour need a runnable check, and a setup failure must not look like a failing test.
how: A sandbox with locked dependencies, no network and a per-run database runs named tests; Jest or Vitest hook failures never read as test failures.
where it stands: Designed; not yet tested. Conditional on a pilot go and uses the single Docker gate slot. It would give runnable checks for four examples but largely duplicates CI for several.
next: I start Docker Desktop at this phase's entry; free-form scripted checks stay off (KS-D18).
origin: Knowledge-store design, proposal safety grafts

### CHK-42 · CI-driven fix agents per failure stage
stage: Parked; package WP2b; metrics: time, throughput (primary time); answers: -
problem: We want agents not to wait a long time running the full suite in their own sandbox.
how: CI and a review bot trigger fresh follow-up fix agents at each failure stage, instead of agents running the full suite themselves.
where it stands: Parked: FixFlow CI runs the suite in about 3 minutes [E]; dropping the local run would leave release and drain branches ungated. The source saw waits fall from 15-20 to 2-4 minutes [S].
next: None; it would return if local runs became the slow step.
origin: Dex Horthy sweep (HumanLayer anecdote)

### CHK-43 · Tiered verification and rework-rate metric
stage: Parked; package WP8; metrics: time, efficiency, quality (primary time); answers: -
problem: We want less time spent on full suites each session, and a health measure for review rework.
how: Run a relevant test subset per phase with cheap proxies, the full suite at close; track the share of a diff changed after review.
where it stands: Parked: full gates at close already exist, Docker setup cost does not shrink with a subset, and squash merges break the metric. Its 5% [G] bar is an unmeasured rule of thumb.
next: None; no change planned.
origin: Dex Horthy sweep (HumanLayer talks)
