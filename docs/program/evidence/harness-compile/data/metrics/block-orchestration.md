# Dossier: block "orchestration" (mechanisms: serial_gate, parallelism, usage_limit)

11 bottlenecks and 33 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### B3-LOOP · Usage limits stop every lane at once
family machine; state: Partly closed: FixFlow has breaker and resume; governor not built; package WP5; metrics: throughput, token_cost, efficiency, time (primary throughput)
what: When the account hits its usage or session limit, every lane stops together; agents stop mid-run, and work must be resumed or paid for again.
evidence: 14 limit episodes, 6-20 Oct [M]; subagents made 91 of 104 limit errors [M]. Ten lanes were stopped by the limit within about 15 minutes [M]. 7 of 101 refuters lost on 1 Nov [M].
what fixing it unlocks: A governor that slows lanes so the window lasts, instead of a limit stopping them all; resumes that never pay again for finished agents.
first step: Write a token budget per window and a governor; release lanes two at a time; resume with knownDead.

### PR-DRAIN · Drain branch could absorb unrelated work
family review; state: Partly closed: Fixed in plan; cut not yet made or verified; package WP3; metrics: quality (primary quality)
what: A drain branch cut at P1's squash assumed nothing merged first; build-ahead lanes could put unreviewed work into the drain image.
evidence: 1 blocker [M].
what fixing it unlocks: A reviewed drain image.
first step: Cut release/drain at a31924a, cherry-pick P1, P2b-2 and P3a, then verify the log.

### B04 · One orchestrator is the serial gate
family orchestrator; state: Open: Harness v2 phase 3; gate workflow not built; package WP3; metrics: throughput, token_count, quality, time (primary throughput)
what: One root session reviews, merges, edits the board and runs checks, so it caps how fast work leaves, and its window keeps overflowing and being summarised.
evidence: Root compacted at 574k, 974k, 967k and 970k tokens [M]; a second count of the same transcripts finds three compactions [M]. Root is 15.3 % of November tokens, about 499k per call [M].
what fixing it unlocks: No compaction across a wave of five gates [T]; the gain is bounded because the root is 15.3 % of tokens [M].
first step: Move review into a gate workflow with a typed verdict naming the head SHA; merge through a locked local queue.

### B13 · Shared documents have one writer
family orchestrator; state: Open: Harness v2 phase 3; not built; package WP3; metrics: throughput, efficiency (primary throughput)
what: The root hand-edits one large board at every merge, and routing documents and model-written state files go stale.
evidence: Board 829 lines, 219,111 bytes at sweep time; 838 lines on 11 Nov; 221 KB in the compile [M]. AGENTS.md grew from 6,709 to 10,698 bytes [M].
what fixing it unlocks: Board under 20 KB [T] and zero root edits at merge [T], from per-slice state fragments and a generated board.
first step: Write per-slice state fragments, a board generator, and a merge script that applies the generated board diff.

### B16 · Agent reports flow through the orchestrator
family orchestrator; state: Open: Premise corrected; harness v2 phase 3; D13 pending; package WP3; metrics: token_count, token_cost, quality (primary token_count)
what: Subagents' full reports return into the root's context instead of files, so the root fills; the 'subagents cannot write' belief was itself an unchecked report.
evidence: Root runs about 499k tokens of context per call [M]. Subagents made 82.4 % of 4,155 October calls [M]. A probe showed a subagent writes and reads back a file [M].
what fixing it unlocks: Zero refused writes over 20 runs [T]; a smaller root window, and gate decisions that fit in it.
first step: Agents write full reports to an allowed folder and return a path, hash and short summary (about 2,500 characters [S]).

### R4 · The pile-up after a stop
family orchestrator; state: Open: Designed in harness v2; not built; package WP4; metrics: time, throughput (primary time)
what: A waiting lane keeps holding its context; after a stop every lane is released at once and all queue again for the same check slot.
evidence: Every session was released together on 9 Nov; one check then waited 2,030 s [M].
what fixing it unlocks: Lanes released two at a time with waits parked outside sessions, so a restart no longer recreates the queue.
first step: A scheduler that releases sessions two at a time and parks waiting work outside any session.

### PR-PHASESIZE · Phases too big for one session
family orchestrator; state: Closed: Split into P5b-1/2, P9-0a/b, P5 spike; package WP4; metrics: throughput, time (primary throughput)
what: A delta check found phases too large to finish in one session.
evidence: 3 phases: P5b, P9-0 and P1's CI check [M].
what fixing it unlocks: Predictable, session-sized phases.
first step: Have Opus critics test session fit at each major revision.

### PR-CONFLICTS · Parallel lanes edit the same files
family orchestrator; state: Partly closed: Managed by shared-file rules; package WP4; metrics: throughput, time, efficiency (primary throughput)
what: Several lanes touch the same files: CLAUDE.md, config.py, conftest.py, the mobile contracts folder, specs.py and the attendance constants.
evidence: 6 shared-file groups listed in ship plan section 7 [M].
what fixing it unlocks: Conflicts resolved at rebase instead of by waiting.
first step: P6a rebases after P1.

### PR-DELIVERY · Corrections cannot interrupt a busy lane
family orchestrator; state: Open: Accepted platform behaviour; package WP4; metrics: time, efficiency, quality (primary time)
what: A message to a lane arrives only when its current turn ends, so a correction cannot interrupt a lane mid-turn.
evidence: Not measured.
what fixing it unlocks: Corrections that land in time, delivered early as follow-up turns.
first step: Send corrections early.

### TK-LIMITACCT · How the usage limit counts tokens
family tokens; state: Open: unmeasured; caveat kept beside every token table; package WP8; metrics: throughput, token_cost (primary throughput)
what: We do not yet know how cache-read tokens count against the five-hour usage limit, so no token cut can yet be promised to reduce limit stops.
evidence: 14 [M] limit episodes in October; subagents caused 91 of 104 [M] limit errors. The counting rule itself is unmeasured.
what fixing it unlocks: Knowing which token cuts actually reduce stops, so we spend effort on the levers that keep lanes running.
first step: Rerun the October limit forensics on November transcripts and set limit stops against cache-read volume.

### TK-BUDGET · Remedies and side tracks share one budget
family tokens; state: Open: KS yield rule designed; shared budget not set; package WP5; metrics: throughput, token_cost (primary throughput)
what: Adopting every remedy at once would recreate the usage-limit stops, and side tracks like the knowledge store compete with ship phases for Opus quota and my attention.
evidence: A measured ceiling of two lanes at a time [M]. The knowledge store needs about six sessions to its go/stop point, half on Opus, then five more [E].
what fixing it unlocks: One shared budget across remedies keeps the ship plan unblocked while improvements still land.
first step: Set one budget across all remedies; start knowledge-store sessions only when no ship phase waits on Opus.

## Ideas (most mature first)

### PAR-01 · Per-checkout isolation of worktree, port and database
stage: In use; package WP2a; metrics: efficiency, throughput, quality (primary efficiency); answers: B15, B08, MC-SHAREDDB, B07
problem: Parallel sessions collided on branches, ports and test databases; two runs of one checkout dropped each other's test database.
how: Each checkout gets its own worktree, branch, compose project, port and path-hashed database; a second check of it is refused.
where it stands: In use (testbed): supported 432 commits and 65 merges in eight working days [M]. A recorded failure: 115 errors [M]; 19 worktrees exist [M]; one database container per checkout.
next: Consider one shared database container with per-checkout databases; add a dry-run reaper for finished checkouts.
origin: Clinic testbed

### PAR-02 · Lane sessions: one phase, own worktree, run together
stage: In use; package WP4; metrics: throughput, time (primary throughput); answers: PR-P0A, B08
problem: Version 8 ran one phase at a time, so for twelve days [M] no code phase started, because each waited behind my first phase.
how: Each lane is one Opus-led session in its own worktree off origin/main; one phase, one draft PR titled with the phase id.
where it stands: In use in FixFlow: eight lane sessions started 2026-11-13 [M], and PRs #187-#192 opened that day [M]. RAM, not CPU, sets the ceiling [M]; the wave plan has four waves [E].
next: Start wave B as soon as a wave-A PR is review-passed.
origin: Ship plan §7

### PAR-04 · Waves of parallel slices from the plan
stage: In use; package WP4; metrics: throughput, efficiency (primary throughput); answers: PR-P0A, B08, B04, B07
problem: We need slices to run in parallel safely, never by guess, in an order that empties the queue, without migration or port collisions and within RAM.
how: Waves follow the plan's dependency graph: slice-owned apps and migration numbers, frozen shared vocabulary, own database and port per branch, root holding merge order.
where it stands: In use: clinic testbed waves 0-5 (S00 on 3 Nov, waves 3-4 done 4 Nov, wrap-up 10 Nov) [M], no serial comparison. FixFlow wave A started eight sessions on 2026-11-13 [M].
next: Start wave B when a wave-A PR is review-passed; keep a database per branch and frozen contracts before fan-out.
origin: Clinic testbed; Ship plan §7

### PAR-05 · File ownership per lane with named shared files
stage: In use; package WP4; metrics: efficiency, throughput (primary efficiency); answers: PR-CONFLICTS
problem: Parallel lanes editing the same files in the same wave cause rebase conflicts and lost work.
how: A table gives each lane its folders. No two lanes edit one file in a wave, except listed shared files, each with a conflict rule.
where it stands: In use: in force for wave A; review findings added shared files such as CLAUDE.md, config.py, conftest.py and specs.py. No conflict count recorded yet.
next: Watch the first rebases of P6a after P1.
origin: Ship plan §7

### PAR-06 · Cross-lane contracts fixed in advance
stage: In use; package WP4; metrics: throughput, efficiency (primary throughput); answers: -
problem: Lanes that depend on each other's outputs would otherwise wait on each other or guess names, headers and fixtures.
how: The plan fixes shared values now: origin header, verdict fixture file, sorted telemetry events array, queue-discard and drain-manifest events, sampler event names.
where it stands: In use: the contract values are fixed in the ship plan, section 7.3. Not yet tested.
next: P6a creates the shared contract files; P5a and P6b-2 then consume them.
origin: Ship plan §7

### PAR-07 · Migration-numbering rule across parallel slices
stage: In use; package WP4; metrics: efficiency, throughput (primary efficiency); answers: PR-CONFLICTS
problem: Parallel slices pick the same database migration number and collide.
how: One slice session at a time writes an app's migrations; a second branch regenerates after the merge; a graph test enforces one head.
where it stands: In use in the testbed; it serialises per app. No collision count was recorded, so we have no measured effect.
next: One writer per wave; keep the single-head test. FixFlow's next free slot is 0047.
origin: Clinic testbed

### PAR-08 · Flow limits for loops and work in progress
stage: In use; package WP4; metrics: quality, efficiency (primary quality); answers: -
problem: Automated loops can flood review with parallel PRs, overrun review capacity, or touch unsafe areas.
how: One open PR per loop; actors limited to safe directories with batch caps; widen frequency or batch only after clean review.
where it stands: In use: the Dex Horthy sweep’s assessment found our work-in-progress bounds already in the ship plan and orchestration rules. We run no scheduled agent loops, so the one-PR-per-loop rule waits until we do. No measurement defined.
next: Keep the existing bounds; apply the one-PR-per-loop rule if we add scheduled loops.
origin: Dex Horthy sweep

### PAR-10 · Bounded session tree: depth three, fan-out three
stage: In use; package WP4; metrics: throughput, efficiency (primary throughput); answers: PR-CONFLICTS, B04, B13, B16, B3-LOOP, B08
problem: A large build needs structure so many sessions run without losing work, colliding on files, flooding the reviewing parent or exhausting the shared session limit.
how: Root holds the board; slice leads, children and subagents sit below; at most three running children per node; each node owns one file set.
where it stands: In use (testbed): 12 slices and about 20 follow-up branches merged in 8 days [M]. No comparison with another structure; root became a serial gate; board reached 219,111 bytes [M] at sweep time.
next: Move the board off one 219 KB file; reuse file-disjoint ownership and merge-upward order for FixFlow lanes.
origin: Clinic testbed; adapted from FixFlow's tier guide

### TOK-05 · One token budget: two lanes at a time
stage: In use; package WP5; metrics: throughput, token_cost, efficiency (primary throughput); answers: B3-LOOP, R4, TK-BUDGET
problem: Adding fresh reviewers, gate workflows and replays could recreate limit stops; a 10-lane run hit the five-hour limit in about 15 [M] minutes.
how: Budget subagent tokens per window before launch; run two lanes at a time; write every step to disk; stop after the first empty result, which can signal a usage limit.
where it stands: In use in the clinic; harness v2 applies it from phase 1. One window covered about 3.4M [M] subagent tokens, about 14% [M] of the weekly limit. Budget figure not yet set.
next: Set the written budget figure from the measured window (D07).
origin: Clinic testbed; Harness v2 design

### MTH-01 · Root as the only writer of shared documents
stage: In use; package WP3; metrics: throughput, quality (primary throughput); answers: B13, B04
problem: Several sessions editing the same shared documents conflict and give us divergent truth. We want one source for each.
how: Only the root edits shared documents. Slices propose changes in their own record as exact old and new text; registry files are append-only.
where it stands: In use in the clinic build, and it became a bottleneck itself: board state 221 KB [M], root edits caused failing checks at two slices, and docs were stale at wrap-up.
next: Replace with slice-written fragments and a generated board; add a test that fails when lock-step edits diverge.
origin: Clinic testbed

### MTH-04 · Coordinator session that never implements
stage: In use; package WP4; metrics: throughput, token_count (primary throughput); answers: PR-P0A, PR-DELIVERY
problem: With many sessions at once, we need one place that owns the plan, shared results and merge calls, kept free of implementation work and its token cost.
how: One session on the plan branch owns the ship plan, results file, OWNER-VIEW page, contracts and merge-ready calls. It dispatches reviews and never implements.
where it stands: In use since 2026-11-13. The coordinator woke and resumed eight [M] lane sessions after the power loss. It lets 8 [M] lanes run at once; no measured effect on speed yet.
next: Keep the lane board current; dispatch binding reviews as lanes report ready.
origin: Ship plan §7

### MTH-12 · Wave board as single current-state file
stage: In use; package WP10a; metrics: efficiency, quality (primary efficiency); answers: B13, B14, B03
problem: We want one authoritative place for what is built, in review and next, so any session can pick up the build.
how: One file holds the current-state table (slice, status, session, tier, gate), dated gate sections, wrap-up, next actions and open questions. Root edits only.
where it stands: In use to wrap-up in the clinic: 829 lines, 219,111 bytes [M] at sweep time. Append-only gate sections let earlier statements go stale, and nothing gave me a live progress view.
next: Split a short current-state file from an archive of gate sections.
origin: Clinic testbed

### MTH-13 · Parallel research agents each own one report
stage: In use; package WP10a; metrics: efficiency, throughput (primary efficiency); answers: B04, B16
problem: Delegated agents return unfocused or overlapping work. We want each worker with a clear question, its own file and a stop condition.
how: A delegation template names question, scope, ownership, return form and stop condition. Research agents each own one report file; four [S] workers at most.
where it stands: In use in the clinic testbed. Delegation cost was not measured; more workers is not evidence of better results. The root integrates and cross-checks, not by vote.
next: Verify in the FixFlow tool setup whether subagents can be given a writable path.
origin: Clinic testbed workflow templates

### CHK-25 · Per-lane run lock and fixed container names
stage: Tested; package WP2b; metrics: quality, efficiency (primary quality); answers: MC-SHAREDDB, MC-TIMEOUT
problem: Two gate runs against one database deadlock or drop each other's database, and re-issuing a command after a timeout can duplicate its effects.
how: A lane-and-kind lock refuses a second run (exit 4). Fixed container names fail a second start. Never re-issue a mutating command after a timeout.
where it stands: Tested: a second run was refused with exit 4 [M]. The lock is reclaimed if older than the last boot or its process is gone. The container-name rule is designed only.
next: Verify the container-name rule with a forced second start.
origin: Ship plan §7; Orchestration design

### MAC-19 · Resume a run from its journal; retry last
stage: Designed; package WP1; metrics: efficiency, token_count, hallucination (primary efficiency); answers: B3-LOOP, PR-SCRIPTTEST
problem: A session limit can kill a run midway; re-running everything wastes tokens, and a cached failure could be served as a result.
how: Stable agent labels and fixed call order; finished agents replay from the journal, dead ones replay null; retries go at the tail.
where it stands: Designed in the orchestration design (section 4.3) with a skeleton script; not yet tested.
next: Run the skeleton and test a forced halt and resume.
origin: Orchestration design

### MAC-27 · Circuit breaker on session limit
stage: Designed; package WP5; metrics: efficiency, hallucination (primary efficiency); answers: B3-LOOP, PR-AGENTNULL
problem: When the account session limit hits, issuing more agents only produces nulls and hides what did not run.
how: Readers run in slices of five; two fresh nulls in one slice stop issuing and list every unstarted id as not started.
where it stands: Designed in the orchestration design, hardened in version 3 with a not-started list; not yet tested.
next: Simulate two nulls in one slice to confirm it halts.
origin: Orchestration design

### REV-28 · Review as a gate workflow with typed verdict
stage: Designed; package WP3; metrics: throughput, time, token_count (primary throughput); answers: B04, B16, B17
problem: One root session is our serial gate for briefing, reading, checking and board edits, so nothing leaves faster than the root.
how: Reviewers run in a saved workflow, one gate at a time, and return a typed verdict naming the commit they read; the root keeps judgment.
where it stands: Designed in harness v2 phase 3; not yet run. Gain is bounded: the root is 15.3 % [M] of tokens. Target: no root compaction across five gates [T].
next: Probe that a workflow agent can run the check at all, then a dry run with stand-in agents.
origin: Harness v2 design, Bottleneck compile

### REV-29 · Merge queue that refuses a wrong head
stage: Designed; package WP3; metrics: quality, throughput, hallucination (primary quality); answers: B17, B04, B13
problem: High-risk merges went in with nobody reading the final head, 5 of 6 [M], and the root merged and edited the board by hand.
how: Local script merges one at a time under a lock, tests the merged result, checks the verdict names the head, requires a reader field.
where it stands: Designed in harness v2 phase 3; not yet run. Record-only first: replayed over the 65 [M] recorded merges it must flag the unread heads of 10 and 11 November.
next: Build record-only and replay it over the 65 recorded merges; refusal waits for decision D15.
origin: Dex Horthy sweep, Harness v2 design

### PAR-11 · Merge-hold list for built-ahead PRs
stage: Designed; package WP3; metrics: quality (primary quality); answers: -
problem: Until P4c deploys main HEAD, merging is not deploying; building ahead could ship half-finished mobile or accounting work into the fleet APK or drain window.
how: A table names reviewed PRs kept draft and unmerged until a stated point, such as P4c done or every phone on v2.
where it stands: Designed in the ship plan; rule accepted, held PRs not yet reviewed, so not yet tested.
next: Check each PR against the list before merging.
origin: Ship plan §7

### PAR-12 · Lanes report; the coordinator writes program files
stage: Designed; package WP3; metrics: efficiency, quality (primary efficiency); answers: B13, PR-CONFLICTS
problem: Many lanes editing the program documents at once would collide and bury my single view of progress.
how: A lane never edits the program folder or the OWNER-VIEW page. Its closing message carries its deploy-train row and any plan defect; the coordinator records both.
where it stands: Adopted in the ship plan and in force for all lanes; it replaces the earlier rule that a lane amends the file in its own PR. Not yet tested.
next: Check that the first lane closing message carries the deploy-train row.
origin: Ship plan §7

### PAR-13 · Planner that sizes lanes just below the knee
stage: Designed; package WP4; metrics: efficiency, throughput, token_cost (primary efficiency); answers: PR-CONFLICTS, B3-LOOP, B04
problem: We chose how many parallel sessions to run by feel. Past the lowest limit, extra lanes only add queues, tokens and collisions, not speed.
how: Before work starts, set the knee at the lowest limit (check, review, merge, tokens, memory) divided by one lane's rate; run 0.8 [S] of it.
where it stands: Designed in harness v2; plan accepted 11 Nov, nothing installed. In the model, lanes past the knee only wait [I]. The testbed had about three lanes worth running [M] but ran six to nine [M].
next: Measure check and review times in phases 2-3; the planner then recomputes lane counts for each plan.
origin: Harness v2 design

### PAR-14 · Plan check with footprints and collision graphs
stage: Designed; package WP4; metrics: quality, efficiency (primary quality); answers: PR-CONFLICTS, B13, B04
problem: Nothing checked parallel slices for collisions; the first checks on merged main failed for the first two slices, from hand edits to shared documents.
how: Each slice declares its footprint and needs. We build needs and collides graphs, refuse two writers of one file, and feed real touches back.
where it stands: Designed in harness v2; the written spec has all 8 steps but has not been run on a real plan. The testbed never used footprints, so no real plan can be replayed; the sample plan is made up.
next: Add the plan-check section to the orchestration document when I say so; run the touch-list test on ten recorded cases.
origin: Harness v2 design

### PAR-15 · Scheduler that releases two sessions at a time
stage: Designed; package WP4; metrics: token_count, efficiency, time (primary token_count); answers: R4, B3-LOOP
problem: After a stop every session was released at once and waited together, holding context and burning tokens. One check waited 2,030 s [M].
how: Turn the wave plan into sessions, release two at a time, park waiting slices outside any session, and bring sessions back after a stop.
where it stands: Designed in harness v2 with the resume list; I answered D06. In the record, two at a time got further: 18 of 48 agents done [M], a lean run 30 of 31 [M].
next: Build it with the resume list in phase 1; a waiting lane then burns nothing in the model [I].
origin: Harness v2 design; answer to the 9 November mass release

### PAR-16 · No undeclared splits of a one-PR phase
stage: Designed; package WP4; metrics: quality, efficiency (primary quality); answers: PR-CONFLICTS
problem: Splitting a one-PR phase across lanes would touch the runbook and ci.yml ahead of their owners and make cherry-picks onto the release branch conflict.
how: One-PR phases stay one PR: P3a-2 is not started early, stub and heartbeat stay in P3a, P6a's web half keeps its own PR.
where it stands: Adopted in the ship plan; P3a-2 was never launched. Not yet tested beyond that.
next: State any split in the plan before a lane starts one.
origin: Ship plan §7

### PAR-18 · READY signal: gh pr ready plus coordinator watcher
stage: Designed; package WP4; metrics: time, efficiency (primary time); answers: PR-DELIVERY
problem: The coordinator needs to know a lane is done without polling sessions or being messaged mid-turn, since messages arrive only when a lane's turn ends.
how: A lane that reports READY also marks its PR ready for review; a coordinator watcher polls that flag and wakes the binding review.
where it stands: Designed as a rule in the ship plan; no READY has been recorded yet, so not yet tested.
next: Run the watcher when the first lane finishes.
origin: Ship plan §7

### PAR-19 · Governor that slows lanes to last the window
stage: Designed; package WP5; metrics: throughput, efficiency, token_cost (primary throughput); answers: B3-LOOP
problem: At the five-hour window's limit every lane stops at once; we had 14 limit episodes in October [M].
how: Share = what the window can still carry ÷ what lanes would burn, from measured tokens per lane-hour; lanes slow instead of stopping.
where it stands: Designed in harness v2, to be built in phase 5 after the baseline. One window covered about 3.4 million subagent tokens [M]; subagents caused 91 of 104 limit errors [M].
next: Set the written budget from the one measured window (D07), then rerun it on November's tally.
origin: Harness v2 design

### PAR-20 · Knowledge-store phases yield to ship phases
stage: Designed; package WP6b; metrics: throughput, token_cost (primary throughput); answers: TK-BUDGET
problem: Knowledge-store sessions would compete with ship phases for Opus usage and for my attention, and I want no store phase to delay shipping.
how: A store session starts only when no ship phase waits on Opus, or I spend spare quota; one that hits a usage limit yields.
where it stands: Designed in the knowledge-store design, as a rule for every store phase; not yet tested. KS-6a and KS-6b share the one Docker-gate slot.
next: Apply it at each store phase start.
origin: Knowledge-store design

### PAR-21 · Pipelined verification as each analyst finishes
stage: Designed; package WP10a; metrics: time, throughput (primary time); answers: MC-GATETIME
problem: Waiting for all analysts before checking leaves wall-clock time idle, and we want the same checks to finish sooner.
how: Citation checks start as each analyst finishes, not after all are done; the fleet drain analyst runs pipelined after an earlier one.
where it stands: Designed in the orchestration design as part of the second workflow script's shape; not yet tested.
next: Implement it in the second workflow script and time it.
origin: Orchestration design

### MEM-17 · Stampede control by advisory claim
stage: Designed; package WP4; metrics: efficiency, token_cost (primary efficiency); answers: LIB-KS-DUP
problem: Two parallel sessions can miss on the same symptom and both pay to solve it; we want to pay once.
how: First claim wins a sequence number in one write; a second session sees the solver and may wait or switch. Nothing blocks.
where it stands: Designed in the knowledge-store design; not yet tested. The solver's record carries the sequence as a fencing token. No renewal or expiry policy until a view shows the problem is real.
next: Build the claim table in phase KS-2.
origin: Knowledge-store design, after single-flight and fencing-token practice

### RET-22 · Slice fragments generate board and true-now view
stage: Designed; package WP3; metrics: token_count, efficiency, throughput (primary token_count); answers: B13, B21, B14, B04
problem: Slice status and findings go stale and get re-read; one writer edits an 800-line board by hand and sessions carry a 221 KB document.
how: Each slice writes a small state fragment; tools generate a short board and a true-now view; the board diff becomes a check step.
where it stands: Designed in harness v2 phase 3; nothing built. Target: board from 221 KB [M] to under 20 KB [T]; root edits at merge zero [T].
next: Write the fragment format and generator; add SQLite tables only if a query needs more.
origin: Harness v2 design; Bottleneck compile; knowledge-store design

### MTH-23 · Plan-check section in the orchestration document
stage: Designed; package WP4; metrics: throughput, quality (primary throughput); answers: PR-CONFLICTS
problem: The orchestration document has no dependency graph, footprint check or lane arithmetic, and states capacity facts as rules instead of measured limits.
how: Add a plan-check section, lane arithmetic in the cost section and machine limits in constraints; no plan runs before it passes.
where it stands: Designed in harness v2 section 0. Nothing has changed in the document yet; the edit belongs to the ship plan's PR.
next: I decide whether and when to write it.
origin: Harness v2 design

### MTH-41 · Machine-appliable patches for shared docs
stage: Idea; package WP3; metrics: throughput, time (primary throughput); answers: B13
problem: Only the root writes shared documents, and that makes the root a serial bottleneck we want to remove.
how: Children write their proposed shared-document edits as a patch that a script applies, so the root no longer rewrites each one.
where it stands: Idea only, suggested in a sweep card's transfer note. Not built, not tested.
next: Prototype it with tests that catch documentation drift.
origin: Clinic testbed sweep

### MSR-42 · Record weekly-window usage per phase
stage: Idea; package WP8; metrics: token_cost, throughput (primary token_cost); answers: L1, TK-LIMITACCT
problem: Outside dollar figures do not fit a flat subscription where weekly limits bind, so we do not know the verifier spend share.
how: At phase open and close, the closing evidence line records weekly-window percent from usage data, plus subagent tokens and agents lost to a usage limit.
where it stands: Trial from the Dex Horthy sweep, narrowed to phases 1 to 3; not yet tested. Its figure decides whether the high-effort refuter rerun runs (threshold 20% [T]).
next: Record at the next phase open.
origin: Dex Horthy sweep
