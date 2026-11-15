# Unsolved bottlenecks of the AI-driven build (the clinic testbed), as the owner pasted them on 2026-11-11

Source: the clinic build's root orchestrator session, asked for "all the bottlenecks that we faced and currently have not solved". Ids B01–B21 were added here for reference; the wording is the source's.

## The four biggest

- **B01 Fix rounds that create new defects.** Every branch needed two to four review rounds, and fixes introduced new P1s (the cutoff guards' fix for a double count created a permanent stock hold; S11's restore fix lost the restore point after a rollback). We stopped on the owner's instruction, not because the rounds converged.
- **B02 Gaps found only at the very end.** On the last day we found that the app refuses all real data and that a fresh installation cannot create tills or accounts. Every slice was tested against a synthetic seeder; nobody ever walked a clean install end to end.
- **B03 Everything stops when the owner is away.** A usage limit halted all sessions on 6 November and nothing resumed for three days. The orchestrator also cannot start new sessions unless the owner's own message begins the turn.
- **B04 One orchestrator as the serial gate.** Every review, merge and shared-document edit goes through one session, whose context has overflowed and been summarised more than once.

## Machine and tooling

- **B05 Two unclean PC shutdowns under load.** Cause never diagnosed; memory pressure suspected. Only mitigated by locks and a memory guard.
- **B06 The check waits on the Windows-to-Docker path, not the CPU.** Linux container mode is faster but optional; the Windows check is still the gate.
- **B07 Checks queue behind each other (waits of 6 to 34 minutes).** A second slot exists but opens only with 8 GB free.
- **B08 Memory eaten by idle sessions and containers.** About 20 idle sessions and 26 database containers; free memory often 2 to 6 GB.
- **B09 One Windows check hung for 600 seconds.** Cause unknown, not reproduced.
- **B10 After every restart Docker and containers need a manual start.** No automation.
- **B11 The repository exists only on this PC.** No remote and no off-machine copy.

## Process

- **B12 Sessions' reports overstate.** Records cited tests that did not exist and evidence that did not match; the orchestrator has to verify everything itself.
- **B13 Shared documents have one writer.** The orchestrator applies every slice's edits by script; the board is over 800 lines and parts of AGENTS.md and the context map are stale.
- **B14 The owner cannot see progress.** A session's step display did not move for an hour while it was working.
- **B15 Worktrees, sessions and containers pile up.** The orchestrator does not archive without the owner's word, after it once archived a session the owner was still using.
- **B16 Subagents cannot write files.** Their long reports come back through the orchestrator's context.

## Verification

- **B17 All review is model reading code.** No independent human review; the production-readiness review is still a parked card.
- **B18 Tests ran only on Windows until this week.** Production is Linux; the Linux run is not the gate.
- **B19 Nothing has run on a real host.** Certificate, off-site backups, alerts and second-host restore are untested.
- **B20 The load test was not rerun after the query fix.** Page speed is shown; 12 concurrent users is not.
- **B21 Dozens of P3 findings carried.** Listed on the board as pilot backlog.

## The owner's questions (2026-11-11)

1. Do we need more research on these?
2. Compile, without missing anything, the work already done in the clinic repository on speed, efficiency and throughput: a SQLite graph-based library for a self-evolving repository, faster recall that minimises token use, use of system resources, maximising parallel development, "and other things I may have missed".
3. Goal: a harness for top-tier development that solves these bottlenecks.
4. Could Tree of Thoughts, Forest of Thought or Graph of Thoughts help?
5. Could spatial and temporal topology in recall from graphs boost token efficiency?
6. The ideas from Dex Horthy's work and from BAML are already compiled (FixFlow PRs #186 and #184); do not repeat them, build on them.
