# Fixed claims in the compile's own text and charts (to be checked against the sources)

Each line: claim id | the claim as printed (tags in brackets) | where I believe it comes from. Paths are relative to the repository root C:/Users/User/Documents/projects/EMS_workshop1 unless absolute. Branch-only documents are extracted to C:/Users/User/AppData/Local/Temp/claude/19c00a033739b7a2/423aac92-9218-409f-aa40-f95c9fbfe131/scratchpad/compile/src/. Memory notes: C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/memory/.

## Tokens (docs/program/TOKEN-BOTTLENECK-2026-11.md)
- N01 | 35,834 calls [M] and 7.35 billion context tokens [M] over both projects (FixFlow 2.13 B, clinic testbed 5.23 B) | token report table
- N02 | 97 % [M] of all tokens are re-reads of a window already there; output is 0.75 % [M] of tokens processed | token report line 14
- N03 | Token use is calls × window size | token report
- N04 | What the windows hold (both / FixFlow / clinic), estimated [E]: fixed prefix 27/47/19; own earlier output 26/15/31; fetched content 26/23/27; compaction summaries 8/2/11; other 13/13/12 | token report table
- N05 | Clinic main sessions held 74 % [M] of its tokens at about 333k per call; FixFlow: 1,118 agent windows [M] of about 12 calls each; 56 % [E] of every agent's tokens was its fixed start, about 60k tokens, most of it tool and connector descriptions | token report lines 43-44
- N06 | Lever chart, share of each project's tokens (FixFlow, clinic): lever 1 tokens re-read in calls whose window had passed 200k: 39 %, 74 % [M]; lever 2 fixed start: 47 %, 19 % [E]; lever 3 tokens in calls that only read or search: 55 %, 41 % [M]; lever 4 own earlier output: 15 %, 31 % [E]; batching two lookups into one command removes about a third of calls | token report lines 26-28, 35-36, 50-53
- N07 | Ruled out: model mix; file reads (re-reading a file in the same window is 0.5-1.5 % [M]); any one file (the busiest is 1.5 % [M]); prompts (80 and 151 real prompts [M], each followed by about 162 calls) | token report lines 55-60
- N08 | An independent re-count agreed within 0.3 % [M] | token report line 5
- N09 | How re-read tokens count against the plan's five-hour limit is not published / unknown | token report caveats

## Machine and check (docs/program/HARNESS-BOTTLENECKS-2026-11.md, its evidence folder docs/program/evidence/harness-bottlenecks/ incl. machine-facts.md, and docs/program/HARNESS-V2-DESIGN-2026-11.md)
- N10 | The clinic testbed ran 432 commits and 65 merges in 8 days [M] | compile
- N11 | Parallel check 855.2 s -> 283.8 s, mean of 12 runs, 3.0x [M]; in use in the testbed | compile / machine-facts
- N12 | Linux container check 367.2 s native -> 230.1 s, 1.6x [M]; built, not yet the gate | compile / v2
- N13 | Test start-up after tracing 43 s -> 11.5 s on a 16-test run, 3.7x [M]; in use | compile / machine-facts
- N14 | A heavy page at 75,016 documents 9-13 s -> 0.1-0.5 s, about 40x (midpoints 11 s and 0.3 s) [M]; database queries on that page 29,346 -> 28 [M]; in use | compile / machine-facts
- N15 | 24 [M] unexpected shutdowns of the PC, 7 October to 10 November | compile; v2 §1
- N16 | Of 25 power-offs since 1 October, 15 happened with no session active [M] | docs/program/harness-v2/phase1/FINDINGS.md; v2 §1
- N17 | 2.8 [M] review rounds per slice; 64 % [M] of reviews sent the slice back | v2 loops table
- N18 | Longest wait for the one check slot 2,030 s [M]; one slot and 367 s per run on Windows | v2 loops table
- N19 | About 70k [M] tokens every agent re-reads before any work | v2 §6
- N20 | 14 [M] limit episodes in October; a run of ten lanes lasted about 15 minutes [M]; subagents caused 91 of 104 [M] limit errors | v2 §6
- N21 | Sessions on Sonnet ran to 963k tokens [M]; sessions on Opus compacted near 367k [M]; 38 of the 48 compactions came near 367k, all on Opus | v2 loops table and §1
- N22 | The board carried 183 [M] minor findings with no status; board 221 KB [M] | v2
- N23 | The first two merged slices failed their first check on hand edits to shared documents [M] | v2 loop B5 row
- N24 | Seven of the 21 wait on a decision, seven are builds, three need one measurement (diagnose), four are trials | v2 §1 and §3
- N25 | The bottleneck compile mapped 87 [M] kept outside ideas onto the 21; 29 [M] fit a bottleneck | v2 phase 3 text
- N26 | Our first list carried five facts that turned out wrong (one fact, one command) | v2 standing rules
- N27 | Harness v2: Speed = lanes x what one lane delivers, until the lowest limit; four limits: the check, the review, the merge, the token window | v2 §0
- N28 | The parts and loops table (planner, scheduler, governor, lanes, gate, merge queue, library, machine; loops R1-R4, B1-B5) as printed in Part 1 | v2 §0

## Graph test (docs/program/evidence/harness-bottlenecks/graph2/, especially build-e/grader-heldout-NOTES.md, protocol.md, protocol-addendum-6.md, sec6-status.md; memory note project-harness-bottlenecks.md)
- N30 | Recall@8k on 75 [M] held-out commits: typed code store 0.700; files that changed together before (co-change floor) 0.638; scripted search 0.625; same folder 0.549 [M] | grader notes
- N31 | Typed store vs scripted search +0.076 [0.036, 0.118]; vs changed-together +0.063 [0.019, 0.110] (95 % intervals from resampling commits) [M] | grader notes
- N32 | Typed store vs search on mobile-app seeds +0.151 [M]; outside mobile +0.024 [-0.024, 0.074] [M] | grader notes
- N33 | Graph-only ranking (community prior + personalised PageRank) vs plain ranking +0.015 [-0.010, 0.042] [M] | grader notes
- N34 | Three engines (SQLite, LadybugDB, DuckDB) gave identical answers | grader notes / sec6-status
- N35 | Must not claim: never "graphs add nothing"; the search arm was a fixed script, not an agent; no agent was run in this test | memory note / addendum 6
- N36 | Code-reading questions F1 0.745 vs 0.645 (if stated; which arms?) | graph2 notes

## Library (docs/program/LIBRARY-PATHWAYS-2026-11.md §2)
- N40 | Funnel, of 100 pieces of work the cheap model would get wrong alone, last period (middle values / all-good): entry held 13.1/92.0; looked up 4.8/67.5; right entry 2.3/59.7; good entry 1.3/55.7; passes screen 1.1/55.0; in window 0.97/53.9; cheap attempt right 0.35/31.7 [G]; the 59 [M] real cases show where steps break, never how often
- N41 | "With good inputs the library rescues about 32 of the 100; at middle values the first two steps lose most of them" | funnel table

## Timeline and sources (git history and document headers)
- N50 | Orchestration design 31 Oct 2026; harness review with gates G1 and G2 1 Nov; knowledge-store design opened 2 Nov (PR #183); BAML and Dex Horthy sweeps and the skills packages 4 Nov (PR #184, #186, #185); Horthy addendum 9 Nov; bottleneck compile and harness v2 11 Nov; token measurement 12 Nov; library review 12-13 Nov; library pathway map, graph test held-out, ship plan section 7 lanes 13 Nov
- N51 | Dex Horthy of HumanLayer coined "12-factor agents" and popularised "context engineering" | HARNESS-IDEAS-HORTHY-2026-11.md (branch extract)
- N52 | BAML is BoundaryML's language for typed model calls | HARNESS-IDEAS-BAML-2026-11.md (branch extract)
- N53 | System dynamics: the method Jay Forrester began at MIT in the 1950s | general knowledge
- N54 | Claude Code is Anthropic's coding tool, which reads and edits code and runs commands | general knowledge
- N55 | FixFlow: a workshop management system for a home-appliance repair shop in Karachi; web app for the manager, Android app for technicians, FastAPI backend | CLAUDE.md
