# Items to classify, file 3: ideas of themes PAR, TOK

### PAR-01 (idea, theme PAR, In use)
name: Per-checkout isolation of worktree, port and database
problem it is meant to solve: Parallel sessions collided on branches, ports and test databases; two runs of one checkout dropped each other's test database.
how: Each checkout gets its own worktree, branch, compose project, port and path-hashed database; a second check of it is refused.
where it stands: In use (testbed): supported 432 commits and 65 merges in eight working days [M]. A recorded failure: 115 errors [M]; 19 worktrees exist [M]; one database container per checkout.

### PAR-02 (idea, theme PAR, In use)
name: Lane sessions: one phase, own worktree, run together
problem it is meant to solve: Version 8 ran one phase at a time, so for twelve days [M] no code phase started, because each waited behind my first phase.
how: Each lane is one Opus-led session in its own worktree off origin/main; one phase, one draft PR titled with the phase id.
where it stands: In use in FixFlow: eight lane sessions started 2026-11-13 [M], and PRs #187-#192 opened that day [M]. RAM, not CPU, sets the ceiling [M]; the wave plan has four waves [E].

### PAR-03 (idea, theme PAR, In use)
name: Build ahead by classifying each Entry clause
problem it is meant to solve: Entry lines mixed code, value, deploy and evidence conditions, so every code phase waited for my work even when it could be built.
how: Class each Entry clause: code, value, deploy or evidence. Only code delays a build, and the lane stacks on the other phase's reviewed tip.
where it stands: In use in FixFlow: four phases built ahead on 2026-11-13 (P7a, P6a, P9-0a, P12a) [M]; none merged yet. It could free the queue behind P0a for 15+ code phases [E].

### PAR-04 (idea, theme PAR, In use)
name: Waves of parallel slices from the plan
problem it is meant to solve: We need slices to run in parallel safely, never by guess, in an order that empties the queue, without migration or port collisions and within RAM.
how: Waves follow the plan's dependency graph: slice-owned apps and migration numbers, frozen shared vocabulary, own database and port per branch, root holding merge order.
where it stands: In use: clinic testbed waves 0-5 (S00 on 3 Nov, waves 3-4 done 4 Nov, wrap-up 10 Nov) [M], no serial comparison. FixFlow wave A started eight sessions on 2026-11-13 [M].

### PAR-05 (idea, theme PAR, In use)
name: File ownership per lane with named shared files
problem it is meant to solve: Parallel lanes editing the same files in the same wave cause rebase conflicts and lost work.
how: A table gives each lane its folders. No two lanes edit one file in a wave, except listed shared files, each with a conflict rule.
where it stands: In use: in force for wave A; review findings added shared files such as CLAUDE.md, config.py, conftest.py and specs.py. No conflict count recorded yet.

### PAR-06 (idea, theme PAR, In use)
name: Cross-lane contracts fixed in advance
problem it is meant to solve: Lanes that depend on each other's outputs would otherwise wait on each other or guess names, headers and fixtures.
how: The plan fixes shared values now: origin header, verdict fixture file, sorted telemetry events array, queue-discard and drain-manifest events, sampler event names.
where it stands: In use: the contract values are fixed in the ship plan, section 7.3. Not yet tested.

### PAR-07 (idea, theme PAR, In use)
name: Migration-numbering rule across parallel slices
problem it is meant to solve: Parallel slices pick the same database migration number and collide.
how: One slice session at a time writes an app's migrations; a second branch regenerates after the merge; a graph test enforces one head.
where it stands: In use in the testbed; it serialises per app. No collision count was recorded, so we have no measured effect.

### PAR-08 (idea, theme PAR, In use)
name: Flow limits for loops and work in progress
problem it is meant to solve: Automated loops can flood review with parallel PRs, overrun review capacity, or touch unsafe areas.
how: One open PR per loop; actors limited to safe directories with batch caps; widen frequency or batch only after clean review.
where it stands: In use: the Dex Horthy sweep’s assessment found our work-in-progress bounds already in the ship plan and orchestration rules. We run no scheduled agent loops, so the one-PR-per-loop rule waits until we do. No measurement defined.

### PAR-09 (idea, theme PAR, In use)
name: PR title as resume key, with a lane board
problem it is meant to solve: After a stop or crash we could not tell which session, branch and PR belong to which phase when branch names differ from the plan.
how: Each PR title starts with its phase id and the body names the branch; a lane board maps phase, session, branch, PR and state.
where it stands: In use: the lane board had 10 rows on 2026-11-13 [M], and all eight lanes resumed from their worktrees after the power loss [M].

### PAR-10 (idea, theme PAR, In use)
name: Bounded session tree: depth three, fan-out three
problem it is meant to solve: A large build needs structure so many sessions run without losing work, colliding on files, flooding the reviewing parent or exhausting the shared session limit.
how: Root holds the board; slice leads, children and subagents sit below; at most three running children per node; each node owns one file set.
where it stands: In use (testbed): 12 slices and about 20 follow-up branches merged in 8 days [M]. No comparison with another structure; root became a serial gate; board reached 219,111 bytes [M] at sweep time.

### PAR-11 (idea, theme PAR, Designed)
name: Merge-hold list for built-ahead PRs
problem it is meant to solve: Until P4c deploys main HEAD, merging is not deploying; building ahead could ship half-finished mobile or accounting work into the fleet APK or drain window.
how: A table names reviewed PRs kept draft and unmerged until a stated point, such as P4c done or every phone on v2.
where it stands: Designed in the ship plan; rule accepted, held PRs not yet reviewed, so not yet tested.

### PAR-12 (idea, theme PAR, Designed)
name: Lanes report; the coordinator writes program files
problem it is meant to solve: Many lanes editing the program documents at once would collide and bury my single view of progress.
how: A lane never edits the program folder or the OWNER-VIEW page. Its closing message carries its deploy-train row and any plan defect; the coordinator records both.
where it stands: Adopted in the ship plan and in force for all lanes; it replaces the earlier rule that a lane amends the file in its own PR. Not yet tested.

### PAR-13 (idea, theme PAR, Designed)
name: Planner that sizes lanes just below the knee
problem it is meant to solve: We chose how many parallel sessions to run by feel. Past the lowest limit, extra lanes only add queues, tokens and collisions, not speed.
how: Before work starts, set the knee at the lowest limit (check, review, merge, tokens, memory) divided by one lane's rate; run 0.8 [S] of it.
where it stands: Designed in harness v2; plan accepted 11 Nov, nothing installed. In the model, lanes past the knee only wait [I]. The testbed had about three lanes worth running [M] but ran six to nine [M].

### PAR-14 (idea, theme PAR, Designed)
name: Plan check with footprints and collision graphs
problem it is meant to solve: Nothing checked parallel slices for collisions; the first checks on merged main failed for the first two slices, from hand edits to shared documents.
how: Each slice declares its footprint and needs. We build needs and collides graphs, refuse two writers of one file, and feed real touches back.
where it stands: Designed in harness v2; the written spec has all 8 steps but has not been run on a real plan. The testbed never used footprints, so no real plan can be replayed; the sample plan is made up.

### PAR-15 (idea, theme PAR, Designed)
name: Scheduler that releases two sessions at a time
problem it is meant to solve: After a stop every session was released at once and waited together, holding context and burning tokens. One check waited 2,030 s [M].
how: Turn the wave plan into sessions, release two at a time, park waiting slices outside any session, and bring sessions back after a stop.
where it stands: Designed in harness v2 with the resume list; I answered D06. In the record, two at a time got further: 18 of 48 agents done [M], a lean run 30 of 31 [M].

### PAR-16 (idea, theme PAR, Designed)
name: No undeclared splits of a one-PR phase
problem it is meant to solve: Splitting a one-PR phase across lanes would touch the runbook and ci.yml ahead of their owners and make cherry-picks onto the release branch conflict.
how: One-PR phases stay one PR: P3a-2 is not started early, stub and heartbeat stay in P3a, P6a's web half keeps its own PR.
where it stands: Adopted in the ship plan; P3a-2 was never launched. Not yet tested beyond that.

### PAR-17 (idea, theme PAR, Designed)
name: Gates in their own phase, long agents first
problem it is meant to solve: Test and build gates run 25 to 40 minutes [E] and must not block or collide with the reader agents.
how: Long gates issue first in a separate Gates phase readers do not wait on; their writes are disjoint from what readers read.
where it stands: Designed in the orchestration design as part of the first workflow's contract; not yet tested.

### PAR-18 (idea, theme PAR, Designed)
name: READY signal: gh pr ready plus coordinator watcher
problem it is meant to solve: The coordinator needs to know a lane is done without polling sessions or being messaged mid-turn, since messages arrive only when a lane's turn ends.
how: A lane that reports READY also marks its PR ready for review; a coordinator watcher polls that flag and wakes the binding review.
where it stands: Designed as a rule in the ship plan; no READY has been recorded yet, so not yet tested.

### PAR-19 (idea, theme PAR, Designed)
name: Governor that slows lanes to last the window
problem it is meant to solve: At the five-hour window's limit every lane stops at once; we had 14 limit episodes in October [M].
how: Share = what the window can still carry ÷ what lanes would burn, from measured tokens per lane-hour; lanes slow instead of stopping.
where it stands: Designed in harness v2, to be built in phase 5 after the baseline. One window covered about 3.4 million subagent tokens [M]; subagents caused 91 of 104 limit errors [M].

### PAR-20 (idea, theme PAR, Designed)
name: Knowledge-store phases yield to ship phases
problem it is meant to solve: Knowledge-store sessions would compete with ship phases for Opus usage and for my attention, and I want no store phase to delay shipping.
how: A store session starts only when no ship phase waits on Opus, or I spend spare quota; one that hits a usage limit yields.
where it stands: Designed in the knowledge-store design, as a rule for every store phase; not yet tested. KS-6a and KS-6b share the one Docker-gate slot.

### PAR-21 (idea, theme PAR, Designed)
name: Pipelined verification as each analyst finishes
problem it is meant to solve: Waiting for all analysts before checking leaves wall-clock time idle, and we want the same checks to finish sooner.
how: Citation checks start as each analyst finishes, not after all are done; the fleet drain analyst runs pipelined after an earlier one.
where it stands: Designed in the orchestration design as part of the second workflow script's shape; not yet tested.

### TOK-01 (idea, theme TOK, In use)
name: One phase per new session, state in repo
problem it is meant to solve: Late calls in long sessions re-read everything before them, up to 944k [M] tokens per call, and the main window is our largest token cost.
how: Each phase starts in a fresh session; state lives in the repo and draft PR body; lead sessions compact earlier.
where it stands: In use in part: the ruling is in force and state lives in the repo; the 150-200k [T] cap is not yet applied. Slice sessions hold 66.4% [M] of tokens; saving untested.

### TOK-02 (idea, theme TOK, In use)
name: Earlier auto-compact window of 400,000 tokens
problem it is meant to solve: Long sessions carry huge contexts: 39.8% [M] of November's cache-read tokens were in calls past 400k, and we want later calls smaller.
how: Set autoCompactWindow to 400,000 [S] so compaction fires near 367k [S]; trial it on one wave of Sonnet slice sessions and check one summary.
where it stands: In use for Opus, whose sessions compact near 367k: 38 of 48 [M] compactions came at 366-387k, all on Opus. Sonnet ran to 963k [M] and is not set. What a compaction loses is unmeasured.

### TOK-03 (idea, theme TOK, In use)
name: Short, capped agent hand-backs
problem it is meant to solve: The main session fills with whole-document reads and long subagent reports, and we believed subagent writes were refused, so reports had to pass through it.
how: Agents return capped text, about 2,500 [S] characters with path:line evidence; noisy output goes to files; drops are logged, never silent.
where it stands: In use in the clinic testbed as a returns-as-text rule; the hygiene rules file is built but not installed. No token figures. Partly replaced by reports on disk.

### TOK-04 (idea, theme TOK, In use)
name: Run small tasks inline before spawning agents
problem it is meant to solve: Every subagent pays about 7.5k [E] tokens of project instructions before working, so tiny tasks and per-claim agents cost more than they return.
how: Counts, greps, hashes and git logs run inline and pass to agents as arguments; claims batch per verifier; discovery agents return facts, not verdicts.
where it stands: In use in the clinic testbed (cap sizes never quantified) and applied in the orchestration design v2. The overhead figure is approximate; no token figures yet.

### TOK-05 (idea, theme TOK, In use)
name: One token budget: two lanes at a time
problem it is meant to solve: Adding fresh reviewers, gate workflows and replays could recreate limit stops; a 10-lane run hit the five-hour limit in about 15 [M] minutes.
how: Budget subagent tokens per window before launch; run two lanes at a time; write every step to disk; stop after the first empty result, which can signal a usage limit.
where it stands: In use in the clinic; harness v2 applies it from phase 1. One window covered about 3.4M [M] subagent tokens, about 14% [M] of the weekly limit. Budget figure not yet set.

### TOK-06 (idea, theme TOK, In use)
name: No PreCompact hook; keep idle compaction on
problem it is meant to solve: We had to decide how much compaction machinery to add, if any.
how: Add no PreCompact hook and no context-system install; leave Claude Code's idle compaction (default on, 200k threshold [S]) as it is.
where it stands: In use as a binding ruling: a PreCompact hook can only block a compaction, and custom compaction instructions are not applied to automatic compaction. Idle compaction took 34 ms [M] and dropped one open loop (an unfinished thread of work).

### TOK-07 (idea, theme TOK, In use)
name: Lead implements the Opus work itself
problem it is meant to solve: A long-lived orchestrator window that only briefs others was the largest measured token cost of the program, and every hand-off loses context.
how: In a lane, the Opus lead implements the Opus-owned work; Sonnet subagents get tests, screens, read models, infra files and runbooks.
where it stands: In use: applied to every lane started 2026-11-13. Its reason is measured (largest token cost [M]); the effect of the change itself is untested.

### TOK-08 (idea, theme TOK, Tested)
name: Session-local file read cache
problem it is meant to solve: We wondered whether agents re-open files they already read in the same window and so waste tokens.
how: Cache file reads inside a session so a repeat read returns the earlier content instead of a new copy.
where it stands: Tested against the token record, not built: exact repeats are 0.00 % [M], and content seen before in the window is 0.5-1.5 % [M]. ‘Opened again’ is mostly a different range of the same file.

### TOK-09 (idea, theme TOK, Tested)
name: Route by model tier, window and price
problem it is meant to solve: A cheaper model with a bigger window can cost more tokens through larger re-read contexts, and routing alone does not cut the token count.
how: Pick the model by window size as well as by its token rate; spend Opus at xhigh only where evidence is thin; verify only where it moves a decision.
where it stands: Measured: Opus 65% [M] of calls and 52% [M] of tokens; Fable 6.5% [M] and 16% [M]; Sonnet 28% [M] and 32% [M]. Routing changes the rate, not the count.

### TOK-10 (idea, theme TOK, Tested)
name: Compact context packet for fresh agents
problem it is meant to solve: We hand fresh agents large documents and want to know whether a smaller, fact-checked packet gives the same result with fewer bytes and faster work.
how: Freeze the required facts, build a smaller packet, count bytes at delivery including preparation, and require that a deliberately removed fact is rejected.
where it stands: Clinic testbed, small synthetic cases: bytes 10,010 to 7,947 [M], 20.6% fewer [M], 24 of 24 facts kept [M]; same acceptance, 193.1 vs 194.7 min [M]; no gain shown.

### TOK-11 (idea, theme TOK, Tested)
name: Compaction audit and count
problem it is meant to solve: I feared compaction silently loses data and wastes tokens, and we did not know how often the orchestrator window overflowed.
how: An Opus audit of a live transcript measures each compaction; a search for compaction records counts them in the clinic root session.
where it stands: Review session: 971k to 22k in 131 s, 580k to 12k in 34 ms [M]; nothing lost caused rework. Clinic root: 3 compactions at 573,774, 974,246 and 967,210 tokens [M].

### TOK-12 (idea, theme TOK, Tested)
name: Codex adapter for snapshot and restore
problem it is meant to solve: After the window is summarised, details are lost; we tried heavier machinery on a Codex-based project to see whether it beats native compaction.
how: Hooks save a checksummed snapshot before compaction and restore it after, with a search journal, under byte budgets; failure falls back to native.
where it stands: Tested in the clinic testbed: recall 15 of 15 and task success equal in all arms; tokens +6.1% over a notes file and +17.0% over native [M]. Nothing showed a saving.

### TOK-13 (idea, theme TOK, Tested)
name: Plain-file immutable snapshot storage
problem it is meant to solve: Memory tools often need a database; we wanted durable snapshots with no dependency and with tamper evidence.
how: One immutable checksummed file per snapshot, meta file written last as the commit point, recall by linear scan with no index or database.
where it stands: Clinic testbed: scan of 115 MB in about 1 s [M]; multi-process stress gave 464 events and 464 snapshots, exact [M]. No cost curve at larger sizes was found.

### TOK-14 (idea, theme TOK, Built)
name: Reading rules: grep first, then ranged reads
problem it is meant to solve: Agents read whole large files and cite facts they never saw, so spend is invisible and evidence is second-hand.
how: Never read a file over 300 [S] lines whole: grep the symbol, then read a range; follow imports one hop and list extra files read.
where it stands: Built into the Android analyst, appsec, migration and explorer agent definitions; the design rule came in v3. Not yet tested.

### TOK-15 (idea, theme TOK, Built)
name: Read admission: first page plus outline
problem it is meant to solve: Reading a whole large file into the window costs tokens that stay there for the rest of the session.
how: A hook rewrites a Read over 30,000 [S] bytes to the first 16 KB [S] plus an outline of up to 60 [S] entries.
where it stands: Built in the clinic testbed and unit-tested only; not installed, so no measured effect. Forensics show most window growth is the model's own output, which this gate does not touch.

### TOK-16 (idea, theme TOK, Built)
name: Compaction snapshot, restore and recall hooks
problem it is meant to solve: Long sessions grow past 700k tokens [E], and their summaries can drop decisions; we want 300-400k [T] active tokens to carry an 800k [T] history.
how: Python hooks lower the trigger to 400k [S], snapshot declared task sections before compaction, restore them verbatim after, and offer exact-text recall over transcripts.
where it stands: Built in the clinic testbed, never run live: 85 offline tests [M], 53 defects fixed [M], recall over 115 MB in about 1 s [M]. Restore quality not measured.

### TOK-17 (idea, theme TOK, Built)
name: Cached Expo package sources instead of npm install
problem it is meant to solve: To answer native Android questions we would otherwise need an install or a network fetch, and the branch head is not the pinned version.
how: Pinned Expo sources are cached on disk; fall back to npm pack of the exact version, then unpkg; never the branch head.
where it stands: Built in the orchestration design: the doc says the sources are already cached. Not yet tested. No install or native prebuild is needed or allowed for these questions.

### TOK-18 (idea, theme TOK, Designed)
name: Pull-only lookups with a 2,000-character cap
problem it is meant to solve: Fetched content is about 27-28.5% [E] of context and gets re-read many times; always-loaded lessons tax every call.
how: Nothing is pushed into context; a lookup returns one lead and one candidate within 2,000 characters [S], mid-window so the prompt cache survives.
where it stands: Designed in the knowledge store (KS-2); untested. 2,000 characters cost about 860 tokens [M]. Prompt caching already works: in the design’s sample, 98.2% [M] of context was cache reads.

### TOK-19 (idea, theme TOK, Designed)
name: Reports on disk: path, hash and short summary
problem it is meant to solve: Long subagent reports pass through the orchestrator's context, which averaged about 499k [M] per call; we want that window smaller.
how: After a 15-minute write probe, agents write full reports to one allowed folder and return a path, hash and short summary.
where it stands: Designed in harness v2 phase 3. A background subagent wrote and read back a file with no prompt [M]. Target: zero refused writes over 20 [T] runs. Not tested at volume.

### TOK-20 (idea, theme TOK, Designed)
name: No waiting inside a session
problem it is meant to solve: A waiting lane keeps its context and burns tokens; recorded waits had a median of 409 s [M] and a longest of 2,030 s [M].
how: Park a waiting slice, and run the check in the background instead of a foreground polling loop.
where it stands: Designed in harness v2 phase 2; not yet tested. A parked lane would burn nothing in the model [I].

### TOK-21 (idea, theme TOK, Designed)
name: Keep Haiku prompts under about 100k tokens
problem it is meant to solve: Past a certain input size Haiku's price steps up, which removes its cost advantage on large dumps.
how: Keep each Haiku extraction prompt under about 100k [S] input tokens and split large dumps; use Haiku only for literal extraction into typed schemas.
where it stands: Designed as a rule in the orchestration design's tier table; not yet tested.

### TOK-22 (idea, theme TOK, Designed)
name: Net-zero CLAUDE.md edit, then trim
problem it is meant to solve: CLAUDE.md is loaded by every agent every session and must stay honest, yet the knowledge store adds a runtime that CLAUDE.md's own rule says to document.
how: Rewrite CI row in place, adding no line; after the pilot, keep each rule sentence plus a store id and move diagnostics to entries.
where it stands: Designed in the knowledge-store design; not run. Trim waits for a pilot go, one verified entry at a time. Line counts before and after go in the trim's PR body.

### TOK-23 (idea, theme TOK, Designed)
name: Strip fixed prefix with a short tool list
problem it is meant to solve: Every agent pays about 70,000 tokens [M] before any work, re-read on every call; fan-out multiplies this prefix, not the work.
how: Short tool list that always keeps Write, deferred tool schemas, fewer connectors and no skills for gate agents; adopt only after a with-and-without test.
where it stands: Designed in harness v2 phase 5; not run. Tool definitions are 34k [M] of the 70,000 [M] each agent pays. Pass bar: 20 runs [T], zero refused writes.

### TOK-24 (idea, theme TOK, Designed)
name: Cost envelope by stage
problem it is meant to solve: Running many agents multiplies tokens, so we want an order-of-magnitude spend expectation before we start.
how: A table of agents per stage and tier mix, from sixteen [S] first-wave agents down to none at gates.
where it stands: Designed in the orchestration design: orders of magnitude only, no actual spend recorded. The second-wave analysts are stated to be the main spend.

### TOK-25 (idea, theme TOK, Idea)
name: Batch lookups into one command
problem it is meant to solve: 58% [M] of our calls only read or search, and each one re-reads the whole window.
how: Put two or more reads or searches in one command or one parallel tool-call block, so one re-read serves several lookups.
where it stands: Idea from the token report, ranked third; untested. Batching two lookups would remove about a third of all calls [E] and a third of their re-reads [E].

### TOK-26 (idea, theme TOK, Idea)
name: Write big files by script; compact after writing
problem it is meant to solve: The model's thinking, echoed commands and written files stay in the window and are re-read on every call: 31% [E] of clinic tokens.
how: Write large files through a script instead of inline tool content, and compact after a write-heavy phase so written text stops riding along.
where it stands: Idea from the token report, ranked fourth; untested. Own earlier output is 26% [E] of all context tokens, and 31% [E] in the clinic.

### TOK-27 (idea, theme TOK, Idea)
name: Quiet gate wrapper for web and mobile
problem it is meant to solve: Verbose lint, test and build output floods an agent's window; the backend gate is already quiet but web and mobile are not.
how: Extend the backend wrapper (log to file, one EXIT line, counts) to web and mobile gates if one green run shows output worth cutting.
where it stands: Not yet tried for web and mobile: the backend wrapper is in use, and the extension is a trial planned over the first two code phases. FixFlow only; the clinic check already has a wrapper.

### TOK-28 (idea, theme TOK, Idea)
name: CLAUDE.md names noisy commands and quiet wrappers
problem it is meant to solve: Raw noisy commands flood the window, and a bare prohibition gives the agent no alternative.
how: CLAUDE.md lists the noisy raw commands as off-limits and pairs each with its quiet wrapper.
where it stands: Deferred: it sat over the per-group cap, so no refuter verdict; reviewers split between trial and skip, and it would lengthen CLAUDE.md. No measurement defined yet.

### TOK-29 (idea, theme TOK, Idea)
name: Model-keyed window for the Fable session
problem it is meant to solve: My 400,000 [S] window names only the Opus model, so it does not apply to the Fable session.
how: If a phase session passes 500k [S], add autoCompactWindow 500000 [S] for the Fable model beside the Opus entry in user settings.
where it stands: Deferred: not set now; set only if a phase session passes 500k [S]. The setting mismatch is confirmed [M]; the effect of a Fable setting is untested.

### TOK-30 (idea, theme TOK, Idea)
name: Resume-pointer hook after compaction
problem it is meant to solve: After a mid-phase compaction the session may not know its branch, recent commits or where to resume.
how: A SessionStart hook with matcher compact prints the branch, short sha, resume pointer and last three commits into context.
where it stands: Deferred: not tested. One phase per session makes compaction rare, so the exact settings text is kept for later. Open checks: path expansion on Windows; it also fires after subagent compactions.

### TOK-31 (idea, theme TOK, Idea)
name: Trim skill and agent descriptions to 400 characters
problem it is meant to solve: About 24k characters [E] of skill and agent descriptions load into every session's context, using tokens we want for work.
how: Trim each of the 13 skill and 11 agent descriptions to at most 400 characters [T]: key use case first, one do-not clause.
where it stands: Trial, not yet run. The disable-flag half was refuted because it blocks subagent preload. Target: combined skill and agent lines fall by at least 50% [T] with nothing mis-triggering.

### TOK-32 (idea, theme TOK, Idea)
name: Shape CLAUDE.md and skill descriptions
problem it is meant to solve: FixFlow's CLAUDE.md and about 24k characters [E] of skill and agent descriptions may load more than needed or contradict each other.
how: Narrow triggers on conditional CLAUDE.md blocks; directory files for single-runtime rules; trimmed descriptions with a routing check; a contradiction sweep; model-change adherence tests.
where it stands: Trial, FixFlow only; not yet tested. The testbed's context trials were null, and no bottleneck is about the instructions file being missed.

### TOK-33 (idea, theme TOK, Idea)
name: Cross-session digests of hot, often-read files
problem it is meant to solve: About a quarter of our tokens are fetched file content, and a small set of files is re-read across sessions while questions rarely repeat.
how: Keep a durable short digest of the most-read files that stands in for reading their lines, lasting across sessions.
where it stands: Idea; digest untested. 72 paths (3.3% [E]) hold half the fetched tokens; paths read in 5+ windows hold 73% [E]. Estimated saving 5-24% [E] after refuters cut a 42% claim.

### TOK-34 (idea, theme TOK, Idea)
name: Log context use at phase close
problem it is meant to solve: The 500k [T] context trigger has no sensor, and we do not know whether a fuller orchestrator window degrades its judgements; the advice to keep context under about 40 % of the window is anecdotal.
how: Log tokens, percent and compactions at phase close, checked against one transcript; over 5 phases [T] add peak context and correction positions.
where it stands: Trial; not yet run. A near-free instrument that grounds the context ceiling in data, starting with a usage line (tokens, percent, compactions) on the first 4 [T] phase sessions.

### TOK-35 (idea, theme TOK, Idea)
name: Library as a session's external memory
problem it is meant to solve: Huge windows and lossy summaries both cost: the long-lived window is over half of all tokens [M], and compaction losses are unmeasured.
how: Keep what a session learned in the library and fetch it on demand, instead of carrying it in the window or a summary.
where it stands: An idea and use case from the library review; not measured and no fix agreed. Compaction dropped a fetched entry in 1 [M] case, while 4 [M] went the other way.

### TOK-36 (idea, theme TOK, Parked)
name: Outside tools that cap tool output
problem it is meant to solve: We want a shipped tool that bounds what tool outputs add to the window, or trims repeated reads.
how: Static review of 19 [M] pinned outside repos: hooks that redirect reads, stub large outputs, rewrite results, or a proxy with a read lifecycle.
where it stands: Parked: none passed as a complete remedy and none installed; no efficacy measured. One maintainer claims about 50% [S] savings, not reproduced. Bypass list and stub-plus-retrieve design kept.

### TOK-37 (idea, theme TOK, Parked)
name: Project admission contract and ledger
problem it is meant to solve: Runs refilled the window from about 700k [S] to 800k [S] after a state file and new chat; saved state does not control what tools admit.
how: Split resident input from tool admission; keep a ledger of bytes entering by route; planned test: 3 arms, 3 resumes, 2 repetitions [S].
where it stands: Parked: the clinic research's framing was withdrawn on 2026-10-09 and replaced by the context-system research. The 700k and 800k figures are user-reported; nothing was measured.

### TOK-38 (idea, theme TOK, Parked)
name: Context-size limit, split prompts, trimmed MCP tools
problem it is meant to solve: Models seem to degrade in very long contexts, long prompts skip steps, and MCP tool definitions use context we want for work.
how: Restart at about 100k tokens [S]; split prompts of 50-85 instructions [S]; pick MCP tools per need; repeat key instructions at start and end.
where it stands: Parked: anecdotal. The author withdrew the flat 100k [S] figure in September 2026 and says experts go to 200-400k [S]. One MCP server costs about 5.7k tokens [S].

### TOK-39 (idea, theme TOK, Parked)
name: Compact Instructions section for the summarizer
problem it is meant to solve: Automatic compaction summaries can get the latest state wrong, and we hoped instructions to the summarizer would improve them.
how: Add a Compact Instructions section that tells the automatic summarizer what to keep.
where it stands: Parked: not tested. Native support for such a section is unverified and it adds per-agent overhead, so the harness review ruled to skip it.

### TOK-40 (idea, theme TOK, Parked)
name: Test CONTEXT-block variants against each other
problem it is meant to solve: We never tested whether the CONTEXT block given to every agent is longer than needed and wastes tokens.
how: Run one task with current and trimmed CONTEXT blocks, three runs each; trim if no worse and at least 15% [T] cheaper.
where it stands: Parked: refuted before running. The block is a few hundred tokens [E] against a start above 63k [M], so a 15% [T] saving cannot be reached.

### TOK-41 (idea, theme TOK, Parked)
name: Survey of outside memory and context tools
problem it is meant to solve: We wanted to know whether an existing hook, proxy or memory store could be adopted instead of building one.
how: A source-pinned audit of about 20 outside tools against one need (800k [T] history in a 300-400k [T] window); no installs or trials.
where it stands: Parked: none adopted; local hooks were built instead. Vendor figures only, not reproduced: MemTree 68.7 vs full history 69.3 vs native compact 48.7 [S].

### TOK-42 (idea, theme TOK, Parked)
name: Cairn: SQLite memory and tool paring
problem it is meant to solve: Carry memory across sessions and cut tool-definition overhead.
how: Each reply ends with a structured block that a hook stores in one SQLite file for later sessions; a proxy drops unused tool definitions.
where it stands: Parked: audited from source only; not adopted or trialled, nothing measured.

### TOK-43 (idea, theme TOK, Parked)
name: Standing per-stage token and cost tracking
problem it is meant to solve: We cannot see spend per stage, agent and model, so it is hard to find where tokens are wasted.
how: Attribute tokens and cost per stage, agent and model from recorded counts at pinned rates; use tokens per solve as a codebase-health signal.
where it stands: Parked: the evidence was vendor claims, one anecdote and a hypothesis. It would also reopen the skipped measurement pipeline, and per-agent data already sits in workflow transcripts.

