# Items to classify (a sample across all themes and the register)

### MAC-04 (idea, theme MAC, In use)
name: Parked starts released later by message
problem it is meant to solve: New sessions can start only on a turn I begin, so work stops while I am away; messages reach a busy lane only at turn end.
how: On my turn, pre-create dependent sessions with a parked-start brief; release each later by message when a dependency merges.
where it stands: In use in the testbed: used 6 Nov for three parked sessions [M]; it did not prevent the 6 to 9 Nov halt. Releasing all at once on 9 Nov caused a 2,030 s [M] queue.

### MAC-10 (idea, theme MAC, In use)
name: Memory headroom guard on the second check slot
problem it is meant to solve: Two simultaneous checks drove free memory to 0.0-0.8 GB [M], the suspected cause of unclean shutdowns.
how: The second slot opens only while 8.0 GiB of physical memory is free, re-read at every poll; unreadable means closed.
where it stands: In use in the testbed but collapses to one slot: in about 980 samples [M], 8 GiB [S] was never free (2.1-6.2 GiB [M]). Waits 647, 3, 256, 614 s [M].

### MAC-16 (idea, theme MAC, Designed)
name: Off-machine copy of the work
problem it is meant to solve: The work exists only on this PC: the clinic repository has no remote and six folders [M] are in no commit, so a single failure of this PC would take the only copy.
how: A verified git bundle of every branch copied off the PC, plus a nightly copy of uncommitted work, transcripts and evidence, logged.
where it stands: Designed in harness v2 phase 1; not yet run. Clinic repository: 432 commits, 19 worktrees, no remote [M]; git integrity check (fsck) clean, 55 MB packed [M]. Target: copy under 24 h old [T].

### MAC-22 (idea, theme MAC, Designed)
name: Deny railway up and run in permissions
problem it is meant to solve: Running railway up from the repo root rebuilt the API as the web app and caused a production outage; the trap lives only as prose.
how: A deny block in the project settings covers the shell forms of railway up and railway run, and optionally a forced git push.
where it stands: Adopt, not yet tested. It does nothing for the self-reported compliance problem, but it matters during the Railway drain window.

### MAC-28 (idea, theme MAC, Designed)
name: Never run expo prebuild in place
problem it is meant to solve: Generating the native Android folder in the app directory would make the build service treat the project as bare and skip its config plugins.
how: Agents may not run expo prebuild or expo run:android in the app directory; native questions are answered from cached package sources instead.
where it stands: Stated as a hard constraint in the orchestration design; not yet tested.

### MAC-34 (idea, theme MAC, Parked)
name: Doctor script for tool checks
problem it is meant to solve: We wanted to confirm the machine has the tools the harness needs.
how: A script would check which tools are installed on the machine.
where it stands: Parked for FixFlow: item 10 of my P0a setup list covers tools instead. One fact was corrected: a Python 3 interpreter exists at the Codex runtime path.

### CHK-05 (idea, theme CHK, In use)
name: Race tests decide blocked from the database
problem it is meant to solve: Under load a slow second call looked blocked after 0.6 s, so a race test could pass with a broken lock; timing-based race tests are flaky.
how: A helper polls pg_stat_activity (the Postgres list of open sessions) up to 15 s [S] for a session waiting on a lock, with the first call among the blockers.
where it stands: In use: 59 blocked assertions in 13 files migrated [M]; 159 race tests pass in 189 s [M]. It does not show which lock, and serial pass cost is unchanged.

### CHK-11 (idea, theme CHK, In use)
name: Fair first-come queue with heavy-job patience
problem it is meant to solve: Waiters retried at random: one lane waited 20 minutes [M] while later arrivals were served; two Android builds stalled eight short runs for about an hour [M].
how: Tickets give arrival order. A light job may pass a heavy one that waited under 900 s [S]; after that the heavy job blocks.
where it stands: In use in FixFlow's slot script, rewritten after those failures. Waits since the change are not yet measured.

### CHK-17 (idea, theme CHK, In use)
name: Pass counts are not the success signal
problem it is meant to solve: We want a plain pass count never to stand in for proof, because it can hide regressions.
how: CI runs every suite per PR; phases close only on green gates; reviewers name a test that fails on base and passes on head.
where it stands: In use: already how FixFlow works. It would be reopened only if a regression escaped the full CI suite after merge.

### CHK-23 (idea, theme CHK, Tested)
name: Non-durable test-database settings
problem it is meant to solve: We wanted to know whether the test database's disk writes were slowing the check.
how: The dev and test Postgres container runs with fsync, synchronous commit and full-page writes switched off, in the compose file only; deploy files untouched.
where it stands: Tested in the testbed: 316 s to 297 s [M] on single runs, inside the noise. The check is CPU-bound, not flush-bound, so the gain is unproven.

### CHK-29 (idea, theme CHK, Designed)
name: Re-run Node failures under Node 22
problem it is meant to solve: This PC has Node 24 while CI pins Node 22, so a failure could be a machine artifact rather than a repo defect.
how: A Jest or React Native failure on Node 24 is re-run once in a node:22 container before it is called a defect.
where it stands: Designed in the orchestration design and ship plan; not seen in the gate script. Not yet tested.

### CHK-35 (idea, theme CHK, Designed)
name: Import rules for the mobile app
problem it is meant to solve: We want the rule that no mobile write bypasses the outbox enforced by a check, because today it is only prose.
how: dependency-cruiser mirrors the backend import rules in the mobile app: screens cannot import write functions; raw fetch stays in two files; runs in CI.
where it stands: Adopted in the harness review as the better alternative to a code-graph tool; scheduled as phase P5b-2. Not built or tested yet.

### CHK-41 (idea, theme CHK, Parked)
name: Slop and complexity detectors as a gate
problem it is meant to solve: We want to stop agent code getting messier over time, with some gate that scores it.
how: Run slop-rule or complexity and duplication scripts as a gate on agent code.
where it stands: Parked: such detectors flag most code (77.75% to 94.25% [S] of lines across models) and can be gamed, so they give no clear bad-code verdict.

### REV-04 (idea, theme REV, In use)
name: Dated audits by parallel automated reviewers
problem it is meant to solve: We want stale guidance and missing evidence found before we build on a repo, and a clear boundary on what a recall tool puts in context.
how: Three parallel automated reviewers plus an integration review audit a repo, separating hash-verified preservation from substantive review; a static fit audit reads tool code.
where it stands: In use in the testbed, done once: 61 files reviewed [M], 14 findings [M], 641 cached members re-hashed with no failures [M], 5 peer-review corrections closed [M]. Cost not recorded.

### REV-10 (idea, theme REV, In use)
name: Verified register, open-risks list and refuted list
problem it is meant to solve: A single pass or fail list loses unsettled claims and hides refutations; every finding needs a uniform record of how well it is verified.
how: From verdicts, a script derives a verified register, an open-risks list and a refuted list; each finding has a severity and status code.
where it stands: In use at gate G2 as the verified findings register: 139 [M] findings; a P0 on the open list blocks work on its area. The deriving script is not yet built.

### REV-16 (idea, theme REV, In use)
name: Two refuters per claim: repository and operations
problem it is meant to solve: We want every recommendation's premises checked before we build on it, including facts about real hosts and phones that a code-only reader misses.
how: Each falsifiable claim is attacked by two fresh Opus refuters, one reading the repository, one operations, defaulting to refuted and needing executed counter-evidence.
where it stands: In use: 45 panel claims attacked; several premises were refuted or unmeasured and narrowed before the plan [M]. Knowledge store: 1 confirmed, 21 narrowed, 8 refuted [M]; second pass 6 narrowed [M].

### REV-22 (idea, theme REV, Tested)
name: Delta check of a plan revision by fresh critics
problem it is meant to solve: Each plan revision can bring in new defects, so I want a fresh read of what changed before the revision is trusted.
how: Fresh Opus critics read only a plan's changes; Sonnet re-locates blocker and major citations; findings are tabled and folded into the next version.
where it stands: Tested: the v6-to-v8 delta check found 1 blocker, 20 major, 20 minor [M]; the section 7 amendment critic found 1 blocker, 7 major, 12 minor [M]; 19 accepted, 1 open ruling.

### REV-28 (idea, theme REV, Designed)
name: Review as a gate workflow with typed verdict
problem it is meant to solve: One root session is our serial gate for briefing, reading, checking and board edits, so nothing leaves faster than the root.
how: Reviewers run in a saved workflow, one gate at a time, and return a typed verdict naming the commit they read; the root keeps judgment.
where it stands: Designed in harness v2 phase 3; not yet run. Gain is bounded: the root is 15.3 % [M] of tokens. Target: no root compaction across five gates [T].

### REV-34 (idea, theme REV, Designed)
name: Break-even rule for extra review legs
problem it is meant to solve: Different models may catch different defects, and we need a rule for when the extra review legs are worth their time.
how: Claude plans and implements, Codex reviews read-only, a human decides, Claude repairs; each leg judged by a break-even formula.
where it stands: Designed from a pasted routine; never trialled. An outside study reports 91.4 vs 82.8 percent on 116 tasks [S]. Break-even inputs F=120, o=12, s=5/25/60 minutes are illustrative [I].

### REV-40 (idea, theme REV, Designed)
name: Diff-restricted register check with one-hop rule
problem it is meant to solve: Re-auditing every old register item is expensive, but 'unchanged' can be wrong when an imported file changed.
how: An item is unchanged only if neither its cited files nor files one import hop away changed; otherwise it is checked in depth.
where it stands: Designed in orchestration design v3 as a Sonnet high task; not yet tested.

### REV-46 (idea, theme REV, Idea)
name: Second model-family review pass
problem it is meant to solve: Code that Opus writes and reviews may share blind spots; a different vendor's model might catch what a same-model reviewer misses.
how: One Codex review pass and one fresh Opus pass at the frozen commits of known misses, scored on misses caught; needs the replay seal.
where it stands: Deferred under decision D19: code would leave my machine and six to seven [M] known misses give only an exploratory result. Never tested; no Codex CLI here.

### REV-52 (idea, theme REV, Idea)
name: Audit the phase routine's seven obligations
problem it is meant to solve: Compliance with the phase routine is self-reported, so skipped steps look the same as done ones.
how: A fresh Opus auditor sees only artifacts (PR, git log, edit history, results, OWNER-VIEW page, closing message) and scores 7 binary obligations per phase.
where it stands: Trial over P1 and P2a; not yet tested. The source evidence was one confounded anecdote, and a count-and-split version was refuted.

### REV-58 (idea, theme REV, Parked)
name: Six-claim cap per analyst
problem it is meant to solve: We did not want caps on what analysts report to hide omissions.
how: Version 2 capped each analyst at six claims; version 3 replaced it with a backlog field and kept only the verification cap.
where it stands: Parked: superseded in orchestration design v3 by the backlog field, after an external reviewer's objection that six findings per analyst hide omissions.

### PAR-04 (idea, theme PAR, In use)
name: Waves of parallel slices from the plan
problem it is meant to solve: We need slices to run in parallel safely, never by guess, in an order that empties the queue, without migration or port collisions and within RAM.
how: Waves follow the plan's dependency graph: slice-owned apps and migration numbers, frozen shared vocabulary, own database and port per branch, root holding merge order.
where it stands: In use: clinic testbed waves 0-5 (S00 on 3 Nov, waves 3-4 done 4 Nov, wrap-up 10 Nov) [M], no serial comparison. FixFlow wave A started eight sessions on 2026-11-13 [M].

### PAR-10 (idea, theme PAR, In use)
name: Bounded session tree: depth three, fan-out three
problem it is meant to solve: A large build needs structure so many sessions run without losing work, colliding on files, flooding the reviewing parent or exhausting the shared session limit.
how: Root holds the board; slice leads, children and subagents sit below; at most three running children per node; each node owns one file set.
where it stands: In use (testbed): 12 slices and about 20 follow-up branches merged in 8 days [M]. No comparison with another structure; root became a serial gate; board reached 219,111 bytes [M] at sweep time.

### PAR-16 (idea, theme PAR, Designed)
name: No undeclared splits of a one-PR phase
problem it is meant to solve: Splitting a one-PR phase across lanes would touch the runbook and ci.yml ahead of their owners and make cherry-picks onto the release branch conflict.
how: One-PR phases stay one PR: P3a-2 is not started early, stub and heartbeat stay in P3a, P6a's web half keeps its own PR.
where it stands: Adopted in the ship plan; P3a-2 was never launched. Not yet tested beyond that.

### TOK-01 (idea, theme TOK, In use)
name: One phase per new session, state in repo
problem it is meant to solve: Late calls in long sessions re-read everything before them, up to 944k [M] tokens per call, and the main window is our largest token cost.
how: Each phase starts in a fresh session; state lives in the repo and draft PR body; lead sessions compact earlier.
where it stands: In use in part: the ruling is in force and state lives in the repo; the 150-200k [T] cap is not yet applied. Slice sessions hold 66.4% [M] of tokens; saving untested.

### TOK-07 (idea, theme TOK, In use)
name: Lead implements the Opus work itself
problem it is meant to solve: A long-lived orchestrator window that only briefs others was the largest measured token cost of the program, and every hand-off loses context.
how: In a lane, the Opus lead implements the Opus-owned work; Sonnet subagents get tests, screens, read models, infra files and runbooks.
where it stands: In use: applied to every lane started 2026-11-13. Its reason is measured (largest token cost [M]); the effect of the change itself is untested.

### TOK-13 (idea, theme TOK, Tested)
name: Plain-file immutable snapshot storage
problem it is meant to solve: Memory tools often need a database; we wanted durable snapshots with no dependency and with tamper evidence.
how: One immutable checksummed file per snapshot, meta file written last as the commit point, recall by linear scan with no index or database.
where it stands: Clinic testbed: scan of 115 MB in about 1 s [M]; multi-process stress gave 464 events and 464 snapshots, exact [M]. No cost curve at larger sizes was found.

### TOK-19 (idea, theme TOK, Designed)
name: Reports on disk: path, hash and short summary
problem it is meant to solve: Long subagent reports pass through the orchestrator's context, which averaged about 499k [M] per call; we want that window smaller.
how: After a 15-minute write probe, agents write full reports to one allowed folder and return a path, hash and short summary.
where it stands: Designed in harness v2 phase 3. A background subagent wrote and read back a file with no prompt [M]. Target: zero refused writes over 20 [T] runs. Not tested at volume.

### TOK-25 (idea, theme TOK, Idea)
name: Batch lookups into one command
problem it is meant to solve: 58% [M] of our calls only read or search, and each one re-reads the whole window.
how: Put two or more reads or searches in one command or one parallel tool-call block, so one re-read serves several lookups.
where it stands: Idea from the token report, ranked third; untested. Batching two lookups would remove about a third of all calls [E] and a third of their re-reads [E].

### TOK-31 (idea, theme TOK, Idea)
name: Trim skill and agent descriptions to 400 characters
problem it is meant to solve: About 24k characters [E] of skill and agent descriptions load into every session's context, using tokens we want for work.
how: Trim each of the 13 skill and 11 agent descriptions to at most 400 characters [T]: key use case first, one do-not clause.
where it stands: Trial, not yet run. The disable-flag half was refuted because it blocks subagent preload. Target: combined skill and agent lines fall by at least 50% [T] with nothing mis-triggering.

### TOK-37 (idea, theme TOK, Parked)
name: Project admission contract and ledger
problem it is meant to solve: Runs refilled the window from about 700k [S] to 800k [S] after a state file and new chat; saved state does not control what tools admit.
how: Split resident input from tool admission; keep a ledger of bytes entering by route; planned test: 3 arms, 3 resumes, 2 repetitions [S].
where it stands: Parked: the clinic research's framing was withdrawn on 2026-10-09 and replaced by the context-system research. The 700k and 800k figures are user-reported; nothing was measured.

### TOK-43 (idea, theme TOK, Parked)
name: Standing per-stage token and cost tracking
problem it is meant to solve: We cannot see spend per stage, agent and model, so it is hard to find where tokens are wasted.
how: Attribute tokens and cost per stage, agent and model from recorded counts at pinned rates; use tokens per solve as a codebase-health signal.
where it stands: Parked: the evidence was vendor claims, one anecdote and a hypothesis. It would also reopen the skipped measurement pipeline, and per-agent data already sits in workflow transcripts.

### MEM-06 (idea, theme MEM, Tested)
name: Short disciplined notes file as context memory
problem it is meant to solve: We want to keep what matters across compaction and restarts without heavy machinery or a restore system.
how: A short notes file, blank at start and under 3 KiB, kept current by the agent; it survives compaction and is read to resume.
where it stands: Tested as the control arm of a small, interrupted clinic study: recall 15 of 15 [M] and task 100 % [M], the same as the adapter and native arms; the adapter used 6.1 % [M] more input.

### MEM-12 (idea, theme MEM, Built)
name: Pathway map: graph of states, trees as views
problem it is meant to solve: One walked pathway is not a diversity of cases; I wanted the library's pathways mapped and measured before any fix is chosen.
how: A graph of 40 [M] states and 83 [M] branches; three ways of working run on the same work; trees show every route.
where it stands: Built; numbers reproduce on a fresh check. A model, not a forecast: 51 [M] of 60 [M] drawn unknowns are guesses [G]. Only much-comes-back, high-reach, good-entries beats the ladder.

### MEM-18 (idea, theme MEM, Designed)
name: Reasoning-cache library for cheaper models
problem it is meant to solve: Most of our tokens run on costly models, and sessions re-solve solved problems. I want equal output from a cheaper model by reusing earlier solutions.
how: Verified solutions sit in a SQLite index over a git journal. A cheap model adapts a match; unsolved problems climb the ladder.
where it stands: Designed, never built; model outputs from guessed inputs: cost 1.03 [G] and wrong rate 1.01 [G] of the ladder's at middle values, 0.75 [G] and 0.67 [G] at all-good.

### MEM-24 (idea, theme MEM, Designed)
name: Stale by code change, never by age
problem it is meant to solve: A stored fix goes stale when the code it relies on changes. Age is a poor stand-in, and our libraries fill with things no longer true.
how: Each entry lists its dependencies (file hashes, config keys, versions). A change marks it suspect and re-runs its check; if valid, it is re-stamped.
where it stands: Designed in the store design and harness v2; not tested. Whole-file hashes first, symbol-level spans later. The board carried 183 [M] minor findings with no status.

### MEM-30 (idea, theme MEM, Designed)
name: Store home at profile root, with doctor check
problem it is meant to solve: Windows can give the Claude desktop app’s processes a private copy of an AppData folder, so they and my own shell would silently write to two different stores.
how: The store sits in a profile-root folder outside the repo, OneDrive and AppData; ks doctor refuses other places and dead locks; a never-do list.
where it stands: Designed; to be built in phase KS-1. Stress test: 2 to 4 SQLITE_BUSY (database busy) failures per 1,200 writes at 8+ writers [M]; no corruption in about 18,300 writes [M].

### MEM-36 (idea, theme MEM, Designed)
name: Do-not-apply entries with a proposed-change check
problem it is meant to solve: A rule like 'a locked account must refuse even a correct PIN' needs a check that fires before the forbidden change lands.
how: A check run on a proposed change has four outcomes: applies, protection changed, protection disabled, or inconclusive. The prohibition text is never withheld.
where it stands: Designed; not yet tested. 3 of 3 past edits to the protective files were legitimate [M], so stops go to the reviewer, never to an automatic verdict.

### MEM-42 (idea, theme MEM, Designed)
name: Measure compliance: escalations made without a lookup
problem it is meant to solve: With a pull-only store, 'useless' and 'never consulted' look the same from outside, so we cannot tell which one we have.
how: Closing messages report escalations made without a lookup; ks close checks a diff lookup exists at the final head; reviewers log unwarned forbidden merges.
where it stands: Designed; not yet tested. Self-reported and cross-checked against dispatch records; no hook in the first version.

### MEM-48 (idea, theme MEM, Designed)
name: Docker test-id gate and Jest/Vitest phase signal
problem it is meant to solve: Entries whose cause lives in code behaviour need a runnable check, and a setup failure must not look like a failing test.
how: A sandbox with locked dependencies, no network and a per-run database runs named tests; Jest or Vitest hook failures never read as test failures.
where it stands: Designed; not yet tested. Conditional on a pilot go and uses the single Docker gate slot. It would give runnable checks for four examples but largely duplicates CI for several.

### MEM-54 (idea, theme MEM, Idea)
name: Plan templates and cross-project design decisions
problem it is meant to solve: We re-derive recurring slice shapes, design 'no' decisions, research claims and stack or machine traps each time they come up.
how: Store plan templates for recurring slice shapes, design decisions with their reasons, research claims, and stack and machine traps.
where it stands: Idea; no fix agreed. Seen working through today's documents, not a library: a design 'no' held five [M] months; a later design reused one that cost about 15M [M] helper tokens.

### MEM-60 (idea, theme MEM, Idea)
name: Thin MCP wrapper over lookup verbs
problem it is meant to solve: Agents might misuse the command-line tool, and we want a safer route if they do.
how: A small stdio MCP server wrapping the lookup and show commands.
where it stands: Deferred in the knowledge-store design (KS-D15): the answer is no for now. Add it only if the lookup log shows misuse. Not yet tested.

### MEM-66 (idea, theme MEM, Idea)
name: Scheduler-system knowledge graph (Pulse)
problem it is meant to solve: A candidate source of my recollection of a graph-based memory; we wanted to see whether it is the one.
how: A scheduling assistant writes structured JSON episodes into a temporal graph (Graphiti on Neo4j), skipping model extraction at write time.
where it stands: Idea only: a README-level look at a different project of mine; no benchmark found and not tested.

### RET-01 (idea, theme RET, In use)
name: Existing code maps: import contracts, CODE-MAP, Haiku locator
problem it is meant to solve: Agents need to find where a feature lives without a call-graph tool.
how: Import-boundary contracts (import-linter on the backend, ESLint on the web), a hand-written code map document and a Haiku locator agent.
where it stands: In use in FixFlow. Not measured. Mobile code has no boundary enforcement yet.

### RET-07 (idea, theme RET, Tested)
name: Co-change floor (files that changed together)
problem it is meant to solve: We need a cheap baseline for what else changes with this file, taken only from git history, that any graph must beat.
how: From earlier commits only, count files changed together, rank by support (how often the two files changed together), confidence (the share of the seed file’s commits that also changed the other) and recency, and return the top files within the token budget.
where it stands: Measured on held-out commits: recall 0.638 [M] (tuning split 0.752 [M]). Typed graph beats it by +0.063 [M], but only on mobile seeds; on backend seeds co-change 0.709 [M] vs typed 0.699 [M].

### RET-13 (idea, theme RET, Tested)
name: LadybugDB embedded graph engine arm
problem it is meant to solve: We want to test an established embedded graph engine with native typed paths and ranking, rather than compare graph and relational designs through code we wrote ourselves.
how: The same facts loaded in LadybugDB 0.22.3 (a maintained Kuzu fork), queried with Cypher and its PageRank and Louvain extension, inside a Linux image.
where it stands: Tested: 0 mismatches in 47,244 [M] comparisons against the reference; recall 0.700 [M] on held-out, equal to the relational arm. Native ranking slow, about 0.7 s [M]. About 16 MB [S] install.

### RET-19 (idea, theme RET, Built)
name: Context packet query with frontier and gap lists
problem it is meant to solve: We want to give a fresh agent a small, cited evidence packet by named start, not whole documents.
how: Breadth-first expansion from a named start within a token budget; each record carries a quote and file lines, plus unresolved, frontier and coverage lines.
where it stands: Built in the clinic testbed; never compared with routed reading, so delivered tokens and task quality are unknown. Extraction recall 0.523 [M] exact, 0.588 [M] loose.

### RET-25 (idea, theme RET, Idea)
name: Neo4j and other server graph engines
problem it is meant to solve: We want to know whether the market-standard graph database is a better home for the repo graph and its algorithms.
how: Neo4j Community, FalkorDB or Postgres with Apache AGE run through Docker, loaded with the same typed facts.
where it stands: Deferred: not installed, not tested. A server adds 1 to 2 GB [E] of memory on a PC short of memory, and I chose embedded engines instead.

### MTH-01 (idea, theme MTH, In use)
name: Root as the only writer of shared documents
problem it is meant to solve: Several sessions editing the same shared documents conflict and give us divergent truth. We want one source for each.
how: Only the root edits shared documents. Slices propose changes in their own record as exact old and new text; registry files are append-only.
where it stands: In use in the clinic build, and it became a bottleneck itself: board state 221 KB [M], root edits caused failing checks at two slices, and docs were stale at wrap-up.

### MTH-07 (idea, theme MTH, In use)
name: Staged workflows with judging gates between them
problem it is meant to solve: We want cheap wide discovery, narrow expensive deep dives and a recorded decision between stages, so the plan is designed only after a verified picture exists.
how: Pre-flight, cheap discovery, gate, Opus deep-dive, gate, phase plan. The main session reads results by id at each gate and writes a record.
where it stands: Both gates written 2026-11-01. Discovery: 16/16 [M] areas, about 1.67M [M] tokens, 14 min [M]. Deep-dive: 8 [M] analysts, 139 [M] findings, about 3.3M [M] tokens, 23 min [M].

### MTH-13 (idea, theme MTH, In use)
name: Parallel research agents each own one report
problem it is meant to solve: Delegated agents return unfocused or overlapping work. We want each worker with a clear question, its own file and a stop condition.
how: A delegation template names question, scope, ownership, return form and stop condition. Research agents each own one report file; four [S] workers at most.
where it stands: In use in the clinic testbed. Delegation cost was not measured; more workers is not evidence of better results. The root integrates and cross-checks, not by vote.

### MTH-19 (idea, theme MTH, Built)
name: Map store with bounded chunk readers
problem it is meant to solve: We want relations extracted from a big document set without one agent reading everything or long reports passing through the orchestrator.
how: Chunk by heading (6,000 characters at most [S]); fresh reader per chunk writes a file; script validates; one writer ingests; resume from pending state.
where it stands: Built in the clinic testbed: 51 chunks over 11 files read and ingested [M]; 3,361 records [M]; 11 synthetic tests pass [M]. Tokens, time and build cost were not measured.

### MTH-25 (idea, theme MTH, Designed)
name: Knowledge-store log and CLAUDE.md trim
problem it is meant to solve: A store nobody consults helps nothing, and the always-loaded CLAUDE.md file stays long.
how: A prospective log with a checkpoint date in the OWNER-VIEW page, and a CLAUDE.md PR that swaps verified narratives for one-line rules.
where it stands: Designed in the knowledge-store design, conditional on a pilot go; not applied and not yet tested. Under go-minimal only declarative entries are wired in and trimmed.

### MTH-31 (idea, theme MTH, Designed)
name: Phase opening, precedence and journal rules bundle
problem it is meant to solve: Our phase routine can skip steps or trust the wrong document. I want small written rules so each phase opens, runs and closes the same way.
how: Small written rules: document precedence, explicit skill start, fetch before resume, pasted opening block, cause tags, three-push CI stop, live PR body fetch.
where it stands: Designed from the Dex Horthy sweep; not yet tested here. Umbrella over many single rules, eight adopt and the rest trial. FixFlow only; no bottleneck record names these skips.

### MTH-37 (idea, theme MTH, Designed)
name: Explicit effort on every reviewer and implementer launch
problem it is meant to solve: An agent launched with no effort setting silently inherits the orchestrator's effort, so reviewers may run at the wrong level and cost more.
how: One line in section 0: launch reviewers and implementers with an effort from the plan, via a Workflow agent call, never an inheriting path.
where it stands: Listed as adopt, narrowed, though both reviewers scored it trial; not yet tested. Check over the first 3 phase PRs that every launch shows explicit effort [T].

### MTH-43 (idea, theme MTH, Idea)
name: Gate-script hygiene: tagged results and clean inputs
problem it is meant to solve: A schema failure could look like a usage-limit null, a skeptic could get contaminated inputs, and a script could trust an agent's own list of reads.
how: Tag agent results null, error or value; build skeptic inputs by pure function; check self-listed reads against the transcript; rename 'reasoning' to 'explanation'.
where it stands: Trial, unrefuted and not yet tested. Refuters narrowed all four to FixFlow only: no dead reviewer read as clean and no contaminated reviewer is on the testbed record.

### MTH-49 (idea, theme MTH, Idea)
name: Script the mechanical phase-close sequence
problem it is meant to solve: Phase-close steps are done from memory and can be left out.
how: Script only the mechanical close steps (Plan @ line, OWNER-VIEW page updated, verdict names the commit); a cheap extractor counts omitted steps.
where it stands: Gated trial, not yet tested. Six mechanical close steps are counted after the first three phases [T]. A whole-phase driver was considered and set aside.

### MTH-55 (idea, theme MTH, Idea)
name: Verify facts I state, inline
problem it is meant to solve: A mid-phase correction from me about code or environment can be wrong, and agents may act on it unchecked or silently override it.
how: The orchestrator checks a checkable fact with a grep or command and journals verified or contradicted; contradictions return to me, no research agent.
where it stands: Trial over phases P1 to P3, not yet tested. The test target is that 100% [T] of checkable-fact entries carry a verified or contradicted line.

### MTH-61 (idea, theme MTH, Parked)
name: Brief lint and dry-run flag in scripts
problem it is meant to solve: I want hand-edits to a brief to be safe and reviewable before we spend: no dropped context block, no leaked tier word, no pasted raw schema.
how: A pure in-script check runs before any agent call, and a dry-run flag returns assembled prompts and schemas instead of calling agents.
where it stands: Parked after a refuter pass. The agent call already rejects bad schemas, one concatenation adds the context block, and diffing the saved script gives the text diff. No brief edit has broken anything on record.

### SKL-02 (idea, theme SKL, Built)
name: Recovery runbook skill and recovery operator agent
problem it is meant to solve: Production is down; we must find which database backups survive and prove a dump restores before rebuilding anything.
how: A runbook skill: dump inventory, paused-project restore policy, throwaway Postgres 17 restore with count and sequence checks; a Sonnet agent runs local steps only.
where it stands: Built: skill and Sonnet agent on draft PR #185, not merged. R2 listing and live restores stay with me. Not yet run.

### SKL-08 (idea, theme SKL, Built)
name: Skill package layout with provenance files
problem it is meant to solve: Skills copied from other repos must stay traceable, licensed and small enough to load, so a maintainer can tell what was taken, changed and rejected.
how: Each package has a SKILL.md, an UPSTREAM.md (repo, commit, paths, licence, taken/changed/rejected), the verbatim licence and references, kept under about 150 KB [S].
where it stands: Built: applied to all 13 packages [M] on draft PR #185, conventions written 2026-11-03/04. Not yet tested.

### SKL-14 (idea, theme SKL, Built)
name: Orchestration skill and repo-conventions skill
problem it is meant to solve: Every session's agents need identical briefs, and implementers need the deploy traps, migration numbering and slice boundaries put in front of them.
how: One project skill carries the context block, schemas, reading rules and routing table; a second packages CLAUDE.md and the deploy traps for implementation sessions.
where it stands: Built in part: the orchestration skill is authored on draft PR #185 (see the main-session contract skill). The repo-conventions skill is not confirmed built. Not yet tested.

### SKL-20 (idea, theme SKL, Designed)
name: CI check for skill and agent frontmatter
problem it is meant to solve: Skill files can rot silently: a missing name, a name that differs from its folder, a stale Alembic head number.
how: A Node CI step fails bad skill frontmatter (name equals folder, description under 1024 characters [S]) and agent fields; flags a stale head number.
where it stands: Adopted in the Horthy sweep, to be added to P1-ci or P1. Not yet built; a one-off version of the gate was run once.

### SKL-26 (idea, theme SKL, Parked)
name: A ks guide command printed from command definitions
problem it is meant to solve: We worried knowledge-store documentation could drift from the tool's real commands.
how: The guide command would print guidance from the same command definitions as the tool, with a test that every subcommand appears.
where it stands: Parked: the tool and its skill live in one repo and one commit, so version skew cannot arise; the store is also unbuilt. Not tested.

### MSR-05 (idea, theme MSR, In use)
name: Evaluation protocol with Amdahl bound
problem it is meant to solve: We had no agreed way to judge whether a workflow change is an improvement.
how: Measure accepted tasks per active human hour; freeze the baseline; change one mechanism at a time; randomise order; keep all attempts; apply Amdahl's bound.
where it stands: In use in the testbed; no 3x or 5x claim is established. 20 % avoidable effort gives at most 1.25x [I]; 8 [M] run records are schema-valid but carry null telemetry.

### MSR-11 (idea, theme MSR, Tested)
name: Pilot of the attested-only map on four files
problem it is meant to solve: We wanted to check whether a strictly sourced map recovers the dependency chain a human annotator saw.
how: Four frozen files read under the design by a skeptic and an independent annotator; counts compared, then re-applied under a revised design.
where it stands: Tested in the testbed: first design 427 attested edges [M], chain not reproduced; revised design 692 edges [M] with 1,166 dangling endpoints [M]. Links through a shared value cannot be joined.

### MSR-17 (idea, theme MSR, Designed)
name: Replay before live
problem it is meant to solve: A gate or review mechanism could refuse good work or miss defects, so we want proof on the record before it can block us.
how: Accept a mechanism by replaying it on the recorded history where possible, and run it record-only before it may refuse anything.
where it stands: Adopted as a standing rule of harness v2, to apply to mechanisms 1 to 6. No mechanism has yet run live under it.

### MSR-23 (idea, theme MSR, Designed)
name: Frozen validation contract for any map or store
problem it is meant to solve: We built maps and stores without testing whether they beat the routed reading we already have, so we want a fair A/B first.
how: Sealed: 5 [S] cases, 3 arms (map, routed reading, Graphify), 2 [S] runs each, blind scoring; better needs a 0.10 [T] gap in 4 of 5 cases.
where it stands: Designed and frozen in the testbed, never run: 30 runs [S], 16,000 tokens [S] per run; the runs folder is empty. Work moved to context-admission research.

### MSR-29 (idea, theme MSR, Designed)
name: Symmetric reading rule for single-run gaps
problem it is meant to solve: One benchmark run per setting cannot separate an effort effect from noise, so we risk over-reading small gaps.
how: A zero-cost reading rule: a single-run gap of a few strict passes counts as no detectable difference for either effort level; cost and task fit then decide.
where it stands: Adopted for this review's effort decisions only. Source: medium 28 against xhigh 25 of 196 [S] strict passes, one run each, read as no detectable difference.

### MSR-35 (idea, theme MSR, Idea)
name: Medium-effort verifiers via blind paired shadow runs
problem it is meant to solve: Most of our verifiers run at xhigh effort, which costs more, and one outside report says medium often matched or beat it.
how: A blind medium-effort shadow reruns each non-P0 verifier's brief; 30+ [T] pairs, pass bar set first, 3 repeats per arm, scored against final adjudication.
where it stands: Top trial 1 in the Dex Horthy sweep; not yet tested. Targets: agreement at least incumbent minus 1 [T], medium tokens at most 0.6x [T]. Outside evidence is weaker than first read.

### MSR-41 (idea, theme MSR, Idea)
name: Re-run CLAUDE.md probes on model change
problem it is meant to solve: A new model behind the Sonnet or Opus tier may follow CLAUDE.md rules differently, and nothing would show it.
how: At a recorded model change, run 10 [S] probes with the full CLAUDE.md on a frozen commit, old against new model, 3 [S] fresh sessions each.
where it stands: Trial from the Dex Horthy sweep, narrowed by the refuter; runs only after the first CLAUDE.md probe set has run once. Not yet tested.

### MSR-47 (idea, theme MSR, Parked)
name: Standing regression re-runs for briefs and models
problem it is meant to solve: Editing an agent brief or changing a model could silently change results, with no test to show it.
how: Run 10-30 [S] past inputs on old and new brief 3 times each, score with deterministic checks, review only disagreements; re-run on each model release.
where it stands: Parked: not now. Inputs are live repo and web, not fixed cases; cost about 60-180 [E] agent runs per brief edit; a standing re-run would rebuild the measurement pipeline we set aside.

### REL-05 (idea, theme REL, Built)
name: Real-data switch and money-setup command
problem it is meant to solve: A fresh install could not take real data or create accounts and tills, which is how the clean-install gap surfaced.
how: An append-only, default-off authorisation table that only the host console can switch (audited), plus a second command that creates accounts and tills.
where it stands: Built on a clinic testbed branch, unmerged and ungated: 39 files, 2,552 insertions, 71 deletions [M]; 2570 tests passed [M].

### REL-11 (idea, theme REL, Designed)
name: Local Android compile gate (L2)
problem it is meant to solve: No check catches native Android compile breaks, because the JavaScript-only export misses them and an EAS build queue is slow.
how: Docker container with JDK 17 [S] and Android SDK copies the app in, runs prebuild there (never in the repo), builds a release.
where it stands: Designed in ship plan section 7.5; the lane is running as PR #188. Not yet tested. It will also answer whether the background-geolocation library builds on SDK 52 / RN 0.76.9.

### OWN-02 (idea, theme OWN, In use)
name: Decision cards D01 to D23 for me
problem it is meant to solve: I need to see exactly what I must decide, by when, and which way the design leans, without reading the whole design.
how: Each of 23 cards shows options, the design's lean in bold, bottlenecks touched and my answer; only six are needed to start.
where it stands: In harness v2 design: D01 to D06 were answered on 11 Nov (phase 1 yes, encrypted drive, logger allowed, resume list); D07 to D23 are still open.

### OWN-08 (idea, theme OWN, In use)
name: Archiving and progress-visibility rules
problem it is meant to solve: I rely on one large board file, and sessions pile up with no live view of their status.
how: The root archives nothing without my word. Each slice gets a board row, and a task file holds status and next action.
where it stands: In use in the clinic testbed: the board is 219,111 bytes [M] at sweep time with 19 worktrees [M]; no live status mechanism was found.

### OWN-14 (idea, theme OWN, Designed)
name: Six-question phase-closing message
problem it is meant to solve: I need a consistent, short account of what each phase did and what remains.
how: At phase close the message answers six questions: goal, fit, choice, before and after, evidence including skipped counts, and remaining work.
where it stands: Adopted as a message format, not a file. Not yet tested.

### OWN-20 (idea, theme OWN, Parked)
name: Hold design docs to a stricter reading standard
problem it is meant to solve: Design docs can pile up faster than anyone reads them; reading capacity, not writing, becomes the limit.
how: Require that a design doc is actually read before it ships.
where it stands: Parked: my critique rounds are already the read gate, so no change was proposed. Not tested.

### B3-LOOP (bottleneck, family machine, Partly closed: FixFlow has breaker and resume; governor not …)
name: Usage limits stop every lane at once
what happens: When the account hits its usage or session limit, every lane stops together; agents stop mid-run, and work must be resumed or paid for again.
evidence: 14 limit episodes, 6-20 Oct [M]; subagents made 91 of 104 limit errors [M]. Ten lanes were stopped by the limit within about 15 minutes [M]. 7 of 101 refuters lost on 1 Nov [M].
what fixing it unlocks: A governor that slows lanes so the window lasts, instead of a limit stopping them all; resumes that never pay again for finished agents.

### MC-INJECT (bottleneck, family machine, Open: Canary trial designed, not run)
name: Agents without approval prompts work near stored credentials
what happens: Subagents run in bypass mode while Railway and GitHub CLI credentials sit in the user profile, so a prompt injection could reach private data.
evidence: Not quantified. Credentials in the profile plus bypass-mode subagents form the exposure.
what fixing it unlocks: Cutting the private-data leg removes this whole risk class for research agents.

### B09 (bottleneck, family check, Open: Bounded by watchdog; not reproduced; v2 phase 2)
name: A check hung with no named cause
what happens: A parallel check pass stalled and the watchdog killed it, with no signal naming the running test. The stall has not been reproduced.
evidence: Stall limit 600 s [S]. The one real stall was killed after 961 s, whole check 1,116 s [M]. A 754 s run was a planted dying-worker demo, not a second hang [M].
what fixing it unlocks: The next stall names its test and cause; the stall limit can drop to about 120 s [T] once 20 loaded runs [T] show no false kills.

### MC-GATETIME (bottleneck, family check, Partly closed: Accepted; inner runs limited by arguments)
name: Gate runs take minutes
what happens: The backend gate stack is the slowest check a lane runs, and it queues for a slot; gates also set the elapsed time of discovery workflow W1.
evidence: Backend 7 min 23 s cold with 757 tests; web 33 s; mobile 29 s warm [M]. W1 gate wall-clock estimated at 25-40 min [E].
what fixing it unlocks: Short inner loops that run only the tests in hand, with full gate runs kept for merge-readiness.

### PR-SCRIPTTEST (bottleneck, family check, Open: Contract fixed; stub harness S-3 proposed)
name: Workflow-script bugs found only by review
what happens: Nothing runs a workflow gate script without a model, so its bookkeeping defects were found by review, not by tests.
evidence: 3 bookkeeping defects found by review [M]: not_started on HALT, a swallowed catch, a cached null re-served.
what fixing it unlocks: A stub harness tests the script body at zero model spend, making resume reliable.

### B12 (bottleneck, family review, Open: Harness v2 phase 3; claims script not built)
name: Agent reports overstate what was done
what happens: Session and agent reports claimed tests, evidence or runs that did not exist or did not match, and model re-checks did not stop it.
evidence: 20-plus recorded overstatements, with no denominator [M]. S11 round 2 had two claims its cited evidence did not support [M]. My reviews corrected model counts three times [M].
what fixing it unlocks: Claims anyone can recheck by script, flagging recorded overstatements with false flags under 10 % [T], so the root stops re-verifying by hand.

### LIB-KS-BLIND (bottleneck, family review, Partly closed: Action handles, KS-D17 test, review lookup; h…)
name: Changes the store's warnings cannot see
what happens: Some risky changes leave no git diff (a Railway env flip, a hand cursor reset, a snapshot restore); others escape through new code paths or shell edits.
evidence: Not sized yet.
what fixing it unlocks: Guarding against a permanent mass message to customers and keeping the correct-PIN lock invariant intact.

### PR-DOCDRIFT (bottleneck, family review, Partly closed: Head check in P1 scope; memory pointer-only)
name: Docs and memory drift from the code
what happens: CLAUDE.md facts, prose docs, design lines and memory drift from the code and each other; for example, HANDOFF A2 prescribes what CLAUDE.md forbids.
evidence: 517 of 1,268 backticked file names in docs do not resolve [M]. The knowledge-store seed (121 rows) found 4 contradictions; its later contradiction list names 7 [M].
what fixing it unlocks: Agents trust current facts, and we gain a cleaned, checkable seed corpus for the knowledge store.

### B04 (bottleneck, family orchestrator, Open: Harness v2 phase 3; gate workflow not built)
name: One orchestrator is the serial gate
what happens: One root session reviews, merges, edits the board and runs checks, so it caps how fast work leaves, and its window keeps overflowing and being summarised.
evidence: Root compacted at 574k, 974k, 967k and 970k tokens [M]; a second count of the same transcripts finds three compactions [M]. Root is 15.3 % of November tokens, about 499k per call [M].
what fixing it unlocks: No compaction across a wave of five gates [T]; the gain is bounded because the root is 15.3 % of tokens [M].

### W5 (bottleneck, family orchestrator, Open: Save rule proposed, not adopted)
name: Workflows are not saved for reuse
what happens: Workflow scripts are written fresh for each task and not kept; no rule decides which proven shapes to save.
evidence: 29 idea families and 43 cards bear on it; none reached adopt or trial in the first pass [M].
what fixing it unlocks: A curated library of proven workflow shapes, so a new task starts from a script that already worked.

### PR-TEMPOUT (bottleneck, family orchestrator, Closed: Evidence folder with sha256 manifest)
name: Raw workflow outputs lived only in temp
what happens: The raw W1/W2 workflow outputs that the register cites lived only in a temporary scratchpad folder.
evidence: All W1/W2 raw outputs were in %TEMP% [M].
what fixing it unlocks: Every register id traceable to a durable, hashed source.

### B14 (bottleneck, family owner-process, Open: Harness v2 phase 2; not built)
name: I cannot see progress
what happens: During long calls I get no sign whether work is waiting, running or stalled, nor its queue position or the test running.
evidence: A check may wait up to 2,700 s [S] for a slot before a 5-18 minute run; one 49-minute foreground polling loop is on record [M].
what fixing it unlocks: The longest gap between heartbeats under 60 s [T]; I see waiting, running or stalled at a glance.

### R2 (bottleneck, family tokens, Partly closed: one phase per session adopted (HR-C1); trial …)
name: Context growth in long sessions
what happens: Every call re-reads the whole window and adds to it, so our long-lived slice and orchestrator sessions run at very large windows. This is token lever 1.
evidence: Slice sessions took 66.4 % [M] of cache reads at about 306k [M] per call; 39 % [M] (FixFlow) and 74 % [M] (clinic) sat past 200k; Sonnet reached 963k [M].
what fixing it unlocks: A ceiling near the 367k [M] where Opus already stops, plus one phase per session; capping at 150-200k [T] targets our largest exposure.

### TK-SUMMARIES (bottleneck, family tokens, Open: measured; no change trialled yet)
name: Compaction summaries re-read every call
what happens: Each compaction leaves a summary in the window, and every later call re-reads it.
evidence: 8 % [E] of all tokens: 11 % clinic, 2 % FixFlow [E]. Main sessions compacted 48 [M] times in the clinic and 9 [M] in FixFlow.
what fixing it unlocks: Shorter or fewer summaries; a compaction adapter used 6-17 % [M] more tokens for the same recall, so plain notes are the bar to beat.

### TK-CACHEBREAK (bottleneck, family tokens, Partly closed: pull-only rule defined in the designs)
name: Pushed context breaks the prompt cache
what happens: Putting graph or memory output into the system prompt or CLAUDE.md changes every window's start, so each commit invalidates the cached start of all of them.
evidence: Not measured; identified in the graph build (2026-11-12) as a design hazard.
what fixing it unlocks: Pull-only tool results keep the prompt cache intact as we add retrieval.

### LIB-S2 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 2: nothing triggers a lookup
what happens: Nothing fails, so no lookup starts; a lookup can cost as much as the fix, comes after the failed call is paid, and the cause sits elsewhere.
evidence: Alone -5.3 % [G], last 68.0 % [G]; 6 [M] limitations; 24 of 59 [M] chosen cases break here, 11 [M] more unspecified by the design.
what fixing it unlocks: Up to 68.0 % [G] of the full fall: the third-largest step weight.

### LIB-S8 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 8: failure and the escalation ladder
what happens: Higher tiers lack the missing fact too, a higher tier was often not who caught the error, trade-offs between lessons end with me, and handoffs pollute windows.
evidence: Alone -3.6 % [G], last 8.8 % [G]; 7 [M] limitations; 21 [M] chosen cases break here and 23 [M] never reach it.
what fixing it unlocks: Up to 8.8 % [G]; most of its effect acts through the shared gate and ladder unknowns.

### LIB-RUN (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Condition: library running cost
what happens: What a lookup, a screen, carrying an entry and writing an entry each cost.
evidence: Alone 3.3 % [G], last 10.4 % [G]; 4 [M] library unknowns. A strict entry costs 0.4-3.8M [E] processed tokens to write.
what fixing it unlocks: Kept low, running cost holds the all-good cost ratio at 0.75 [G] instead of 0.92 [G] against the ladder.

### LIB-KS-VALUE (bottleneck, family library, Open: pilot planned; audit KS-0 waits on my KS-D1)
name: Knowledge store value not yet proven
what happens: No source shows hard defects recur here often enough for a symptom store to beat grep; avoided cost has no baseline, and few entries can lead without Docker.
evidence: Recurrence and avoided cost are unmeasured; every past fix was top-tier. Build: about six sessions to go/stop, five after [E]. 3 [M] worked examples can lead without Docker.
what fixing it unlocks: A pilot verdict with a kill criterion decides further investment; break-even is then measured going forward.

### LIB-GRAPH-CONTRACTS (bottleneck, family retrieval, Open: partly mapped by script; value unproven)
name: Cross-runtime contracts break silently
what happens: Client calls to routes, settings keys, the migration chain, slice contracts, outbox kinds and file-bound invariants are not imports, so search and import graphs miss them.
evidence: A script matched 65 of 73 [M] client URL literals to 77 [M] route decorators; 46 [M] settings keys; 46 [M] migration links.
what fixing it unlocks: A scripted contract map as a review input could show what a change might break; its value is unproven.

### LIB-EVAL (bottleneck, family retrieval, Open: held-out scored by script; no agent run)
name: Context aids never tested with an agent
what happens: No context aid (graph, map or recall journal) has run with an agent in the loop, so we do not know whether an agent finishes faster or with fewer mistakes.
evidence: 0 [M] agent runs; the held-out graph test (2026-11-13) used a fixed search script. A quality comparison was forecast at 156M-512M [E] tokens.
what fixing it unlocks: Answers my real question: whether a graph, map or recall layer saves an agent work.
