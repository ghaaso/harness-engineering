# Draft work-package cards (owner's voice), for the work-division critic

Waves: "Start now" = WP1, WP6, WP7, WP8, WP10, WP11. "After the machine" = WP2 (hard on WP1), WP5 (soft on WP1: the token baseline is saved in phase 1). "After the check" = WP3 (soft on WP2), WP9 (hard on WP2: the first-use walk runs inside the container gate), WP4 (soft on WP2 and WP8: it needs measured rates).
Standing rule: the FixFlow ship plan comes first. Harness work takes neither the Docker gate nor agent lanes while a FixFlow phase is running or waiting on its reviewer.

## WP1 Machine and recovery
- Goal: No power-off can cost us work or a day, and the PC brings itself back. Harness v2 phase 1.
- First deliverable: a verified copy of every branch on the encrypted drive, and the always-on logger running.
- Done when: the copy is verified, one real reboot comes back with no command, and the logger is running [T].
- Good fit for: Windows administration, PowerShell or bash scripting, git.
- Size: one to two days of one session [E], plus my decisions.
- Waiting on me: switch off sleep on mains power; plug in the drive and switch on its encryption; install the sensor logger and debugger; list the days the house lost power.

## WP2 The check
- Goal: one fast, fair, visible check: the Linux container run as the gate, sized by measured memory, with a heartbeat. Harness v2 phase 2 and FixFlow's gate harness.
- First deliverable: the container run as the gate, with one check's peak memory measured and written down.
- Done when: median gate near 230 s [T], heartbeat gaps under 60 s [T], and a second slot opens only when the measured peak allows it.
- Good fit for: Docker and Linux, test runners (pytest, Vitest, Jest), queues.
- Size: three to four days of one session [E]. Needs WP1 first.
- Waiting on me: D09 (container run as the gate), D10 (clean-up rule), later D11 (who gives up memory).

## WP3 Gate, review and merge
- Goal: move the mechanical part of review and merging out of the orchestrating session into scripts that spend no tokens and are proven on our own record. Harness v2 phase 3, the eleven mechanisms.
- First deliverable: the sealed replay and the verdict script, each passing its stated test on the recorded fix chains.
- Done when: each of the six scripts passes its stated test, and the merge queue has run record-only over the 65 recorded merges [M].
- Good fit for: scripting, git internals, test tooling, careful diff reading.
- Size: about a week of one session for the scripts [E]. Easier after WP2.
- Waiting on me: D12 to D16 as each mechanism reaches me.

## WP4 Planner and lanes
- Goal: know before a wave starts which slices can run side by side, how many lanes are worth it, and where they would collide. The planner, scheduler and plan check of harness v2, and FixFlow's ship plan section 7 lanes.
- First deliverable: the plan check run on one recorded wave: footprints, collision graph, and the lane count it would have chosen.
- Done when: for the next real wave the plan check sets the lane count and no two lanes collide on a shared file.
- Good fit for: graphs and scheduling, scripting, a feel for queues.
- Size: to be set from the first replay [G]. Easier after WP2 and WP8.

## WP5 Token budget
- Goal: put the four token levers to work and give every wave a written budget. Harness v2 phase 5 and the token report's levers.
- First deliverable: the per-slice token baseline for November, and lever 2 measured: one agent's fixed start with and without deferred tool schemas and connectors.
- Done when: every wave launches with a written budget, and each lever has a before-and-after number.
- Good fit for: data analysis on transcripts (JSON), Claude Code settings.
- Size: about an hour for the tally [E]; a day or two per lever [G]. Uses WP1's saved baseline.
- Waiting on me: D07 (token budget per window), D22 (compaction-window trial).

## WP6 Memory
- Goal: give the harness a memory that is written at the moment something becomes true and asked, never pushed: the library of harness v2 and the knowledge store of PR #183.
- First deliverable: the library's limitation list agreed with me, and the knowledge store's D1 audit run.
- Done when: a pilot measures, on held-out work, whether a session that asks the library first reads less and gets more right.
- Good fit for: information retrieval, data modelling, evaluation design.
- Size: not sized yet [G].
- Waiting on me: agree the limitation list; the knowledge store's D1 and D1b.

## WP7 Retrieval and graphs
- Goal: give sessions a fast, trustworthy answer to "what does this change touch?": indexes, the typed code store, the touch list and a "what is true now" board.
- First deliverable: the index replay at zero tokens on recorded windows (harness v2 phase 3), and the agent-in-the-loop arm of the graph test.
- Done when: a tested answer to whether an agent with the typed store finds the touched files faster and with fewer tokens than the same agent with search alone.
- Good fit for: static analysis, graph databases, evaluation statistics.
- Waiting on me: the graph-engine install.

## WP8 Measurement and fair tests
- Goal: keep the numbers the planner and every package depend on: token tallies, check and review rates, the system-dynamics model, and the rules for fair tests.
- First deliverable: a rate sheet from the record: check run time, peak memory, review rounds, send-back share, lane collisions, each with its tag.
- Done when: every package's "done when" has a measured before and after, and the planner reads its rates from the sheet.
- Good fit for: statistics, simulation (Monte Carlo), Python or JavaScript.

## WP9 First use and real hosts
- Goal: find the last-day gaps on day one: a zero-seed walk in every gate, a rehearsal on a real host, and real Android builds for FixFlow.
- First deliverable: the zero-seed walk as a step of the container gate.
- Done when: the walk fails on the commit before the 11 November merge and passes after it [T], and the first-deploy checklist has run once on a real host.
- Good fit for: DevOps, Android builds (Gradle, EAS), load testing.
- Size: two to three days of one session [E]. Needs WP2 first.
- Waiting on me: D21 (rehearse on a real host).

## WP10 Method, skills and agents
- Goal: brief and run agents well: briefs and schemas, model tiers, saved workflows, and the 13 skill packages and 11 project agents of PR #185, each with a small fixed start.
- First deliverable: PR #185 reviewed and merged with its stray file removed, and each agent's fixed start measured.
- Done when: every agent type has a measured fixed start, and look-ups run on the cheapest model that passes.
- Good fit for: prompt writing, Claude Code configuration.

## WP11 Decisions and owner pages
- Goal: keep me deciding quickly and seeing clearly: one decision board for every open decision, visual pages I can read on my screen, and this compile kept current.
- First deliverable: one decision board listing every open decision with its options and what it unblocks.
- Done when: no package waits more than a day on a decision of mine.
- Good fit for: front-end and data visualisation, clear writing.
