# Harness v2 design: status of every part (extraction, 2026-11-18)

Extraction only. No verdict. D = `docs/program/HARNESS-V2-DESIGN-2026-11.md` (L = line). B = `HARNESS-BOTTLENECKS-2026-11.md`. A = `harness-v2/architecture.json`. N = `evidence/harness-v2-design/numbers.md`. RA = `evidence/harness-v2-design/refute-architecture.md`. ADJ = `refute-adjudication.md`.
Status words: MEASURED-HERE = the design tags it [M]; the record is the clinic testbed's or this PC's, never v2 running. BUILT-AND-USED = a thing that exists and ran. DESIGNED-ONLY = never run. TRIAL-PROPOSED = the document says trial, unproven or design. GUESS = [E], [I] or called a guess. TARGET = [T].
Short answer on running: no part of v2 was built or run. Only read-only measurements (token tally, shutdown join) and the model page exist.

## 1. The document's own status and limits (quoted)

- L3: "Plan accepted on 11 November. Phase 1 has started with read-only work. Nothing is installed, wired or committed."
- L17: "Which limit comes first depends on rates that are only partly measured today."
- L64: "This is a model of how the machine behaves, not a forecast. Its output is illustrative." "Guessed: work, review and merge minutes, checks per round, the size of the token window, the library's costs."
- L77: "Several of the times behind this chart are guesses, so read which limits exist and how the controllers move them, not the figures."
- L118 (Limits of the architecture): "Which limit comes first depends on guessed times and on the size of the token window, which nobody knows." "The library is unproven." "The sample plan is made up. The testbed's slices were never laid out with footprints, so there is no real plan to replay yet." "How cache reads count against the plan's limits is unknown."
- L388: "Every proof on this page is a proposal. Nothing here was run against the testbed except the token tally and the PC's own logs."
- L389: "The record does not say how many sessions were released at once on 9 November."
- L392: "The high-risk list (money, stock, access, import, restore) is a proposal."
- L393: "Not yet named: which files count as the gate's own settings. Not yet checked: whether the reviewer briefs for the seven known misses still exist."
- L394: "What fills the session windows is estimated from the transcripts, not counted directly."
- L395: "Effort figures are the mappers' estimates from the compile's evidence, added up here. They are guesses."
- L396: "The compile was made by models reading records."
- ADJ "What neither pass could check": "Neither refuter opened the clinic repository. Every claim rests on the compile's evidence files."

## 2. Status table

### 2a. The eight parts (L21-30; A.parts[].proof holds each part's pass mark, not a result)
| Part | Where | Status | Quote |
| --- | --- | --- | --- |
| Planner | L23, L66-77 | DESIGNED-ONLY | "Works out, before any work starts, which slices can run side by side and how many lanes are worth running." No script on record |
| Scheduler | L24 | DESIGNED-ONLY | "Turns the wave plan into running sessions, and brings them back after a stop." Resume list "Not started" L141 |
| Governor | L25 | DESIGNED-ONLY | A: "Learns the window's size from every limit message ... Nobody knows that size today." RA: "the governor exists to prevent" stops, "nothing lowers" lanes in the first model |
| Lanes | L26 | DESIGNED-ONLY | "Each lane is a session that asks before it explores and leaves its results on disk." Reports-on-disk probe not run (B L289) |
| Gate | L27 | DESIGNED-ONLY | Container gate: D09 owner answer blank (L308). The testbed's container run is "built, optional, not the gate" (B L65) |
| Merge queue | L28 | DESIGNED-ONLY | "It is a script, so the serial part is short." Mechanism 6 only "Record-only" planned (L289) |
| Library | L29 | DESIGNED-ONLY, TRIAL-PROPOSED | L85: "Standing: unproven. Nothing like it has been tried" |
| Machine | L30 | DESIGNED-ONLY | Copy, restart, logger all waiting on owner or not started (L137-141) |
| Stock-and-flow model (page) | L46-64 | BUILT-AND-USED, output GUESS | Refuter ran it in node (RA L3). L64: "Its output is illustrative." |

### 2b. Loops, "In v2" entry (L36-44)
| Loop | Status | The "In v2" entry and what stands behind it |
| --- | --- | --- |
| R1 fix spiral | TRIAL-PROPOSED | "Two rounds at most, revert instead of patching, and a test for every way new state ends." Testbed: 64 % [M], 2.8 [M] rounds. B01 class "trial" (L256) |
| B1 check capacity | 230 s MEASURED-HERE; second slot DESIGNED-ONLY | "The container run takes 230 s [M]. A second slot opens once the check's peak memory is measured." B L78: "A check's own peak memory was never measured." |
| B2 serial gate | DESIGNED-ONLY | "Reviews run in a gate workflow, one gate at a time, outside the root." ADJ: gate workflow "was assumed but never built"; now a phase 3 build after a probe |
| B3 limit stop | DESIGNED-ONLY | "The governor slows the lanes so the window lasts." Testbed: 14 [M] episodes, ten lanes about 15 minutes [M] |
| R2 context growth | TRIAL-PROPOSED, GUESS | "A ceiling near 367k on every model, and one phase per session." L40: "That gap is a comparison across models, not a trial." 0.72 factor tagged [E] (A.params.ctxCap) |
| R4 pile-up | DESIGNED-ONLY | "Two at a time, and waiting happens parked, outside any session." Testbed 2,030 s [M] wait after 9 Nov mass release |
| R3 library compounds | TRIAL-PROPOSED | "Pull-only lookups, counted one by one. Unproven until measured." |
| B4 staleness | DESIGNED-ONLY, GUESS | "Entries are tied to the files they depend on." Stale share 0.03 per merge is [I] (A.params.staleShare) |
| B5 lanes at the knee | DESIGNED-ONLY, GUESS | "The plan check runs a little below the knee." Margin 0.8 is [S]; knee rests on guessed times (L77) |

### 2c. Equation inputs (L47-60; list at L64 and A.model.params)
| Input | Tag and value | Source |
| --- | --- | --- |
| Check time Windows 6.1 min, container 3.8, container two at once 4.4, Windows two at once 7.3 | [M] 367 s, 230 s, 266-267 s, 435 s | N L34-37; B L65-66 |
| Rounds per slice 2.8; checks at a merge 2; slices 11; calls per session 519 | [M] | A.params |
| Context factor under a ceiling 0.72; share re-read by lookup-only calls 0.436 | [E] | A.params ("A comparison across models, not a trial") |
| Work between checks 20 min; checks per round 3; review 20 min; root merge 30 min; script merge 3 min | [I] "a guess" | A.params |
| Waiting lane burns 0.3 of a working one; token window 30 lane-hours; width 12 | [I] "a guess" | A.params ("how re-read tokens count against the limit is unknown") |
| Library: hit-rate top 0.25; half point 20 entries; 4 entries per slice; lookup cost 0.02 | [I] "a guess; nobody has measured it" | A.params |
| Planner margin 0.8; library answer 860 tokens | [S] | A.params (860 from the knowledge-store design's cap) |
| Rounds with the contract 2 | [T] | A.params |
| Window also stated as "about 2.5 lane-hours [E]" (L64) against the slider start of 30 [I] | [E] and [I] | L64; A.params.budget |

### 2d. The plan check (L66-75)
| Step | Status | Quote |
| --- | --- | --- |
| Declarations (footprint, reads, needs, shared things, risk, size) | DESIGNED-ONLY | "Every slice declares: The files it will write: its footprint." The testbed never laid slices out with footprints (L118) |
| 1 Refuse no footprint | DESIGNED-ONLY | "Refuse a slice that declares no footprint." |
| 2 Two graphs | DESIGNED-ONLY, GUESS for co-change | "The library adds files that have changed together before." L88: "Files that changed together are the weak half, with only 432 commits [M] to learn from." |
| 3 Shortest finish | DESIGNED-ONLY | "The longest chain of needs, weighted by size, is the floor." |
| 4 Lanes from four limits and memory | DESIGNED-ONLY, GUESS | "run a little below the knee." Knee inputs partly [I] (2c) |
| 5 Name what limits the plan | DESIGNED-ONLY | "Name what limits the plan, and the one change that would lift it." |
| 6 Refuse two writers of one file | DESIGNED-ONLY | "Refuse a plan with two writers of one file, or more lanes than that." |
| 7 Start on merge, lower of planner and governor | DESIGNED-ONLY | "The lanes running are the lower of the planner's count and the governor's." RA item 7: which controller wins "missing" in the first draft |
| 8 Gate refuses footprint breach; write-back | DESIGNED-ONLY | "a branch that changed files outside its footprint is refused until the plan is amended." Touch-list test ("six of ten [T]") never run: no record |
| Predicted speed-up | GUESS | L77: "about three lanes were worth running, and the build ran six to nine [M]" from guessed times |

### 2e. The library (L79-93)
| Item | Status | Quote |
| --- | --- | --- |
| Whole library | TRIAL-PROPOSED | "Standing: unproven. Nothing like it has been tried: the testbed never tested an index or a graph." |
| Tables (journal, entry/handle/footprint_item, state, edge, rate, lookup) | DESIGNED-ONLY | L83. No file or schema on record |
| Exposures | GUESS [E] | "about 27 to 28.5 % [E] of context"; "43.6 % [E]"; "Neither is a saving and neither is a ceiling." 54.7 % [M] of calls only read or search |
| Where it could pay | GUESS [E] | "Re-reading inside a window is only 0.5 to 1.5 % [E]"; "Nothing has shown that a shorter digest can stand in for the lines." |
| Index replay (first test) | DESIGNED-ONLY | "Its first test spends no tokens: replay the recorded windows." Pass marks "3 % of tokens and a recall of 0.8 [T]" suggested by a refuter, D23 open. Run: no record |
| Worth, in the knowledge-store's terms | not measured | "None of those is measured yet." (L93) |

### 2f. Token methods and their Standing column (L101-112)
| Method | Status | Standing, and the figure |
| --- | --- | --- |
| Context ceiling | TRIAL-PROPOSED; 39.8 % [M] past 400k, 38 of 48 [M] compactions at 367k | "Trial. What a compaction loses is unmeasured." |
| Route by window | MEASURED-HERE, confounded | "A comparison across models, not a trial." 1,452 million vs 1,306 million [M] |
| One phase per session | DESIGNED-ONLY; 519 [M] calls | "Design." |
| Small standing context | DESIGNED-ONLY; 221 KB, 34k, 70,000 [M] | "Build, with a with-and-without test." |
| Ask, do not read | TRIAL-PROPOSED, GUESS | "Unproven. A zero-token index replay first." |
| Results on disk | DESIGNED-ONLY; 499k [M] | "Build." |
| No waiting inside a session | DESIGNED-ONLY; 409 s median, 2,030 s [M] | "Build." |
| Fewer rounds | TRIAL-PROPOSED; 2.8 [M] | "Trial: the fix-round contract." |
| Scripts before agents | DESIGNED-ONLY; "38 of 71 [M] practised ideas failed as prose" | "Build." |
| Lanes at the knee | DESIGNED-ONLY; ten lanes about 15 minutes [M] | "Design: the plan check." |

### 2g. The eleven mechanisms (L282-294). Test run for each: no record (L388)
| # | Accepted by | Its test, short | Run? |
| --- | --- | --- | --- |
| 1 Sealed replay | a replay on the record | sealed clone: "zero opens of the later fix, the finding tables or the board" | no record |
| 2 Verdict script | a replay on the record | score "20-plus [M] recorded overstatements. False flags under 10 % [T]" | no record |
| 3 Transcript audit | a replay on the record | find "the unread final heads by itself" in 10 and 11 Nov merges | no record |
| 4 Finding table | a replay on the record | "zero unmapped statuses ... an open count over the 183 [M] P3 ids" | no record |
| 5 Dry run, stand-ins | planted cases, not a replay | "None may reach merge." | no record |
| 6 Merge queue | a replay on the record | record-only over "65 [M] recorded merges" | no record |
| 7 One fact, one command | a baseline count, not a pass or fail | count checkable environment facts | no record |
| 8 Resume check | a replay on the record | "Zero means unproven: the check stays dormant." | no record |
| 9 Fix-round clauses | a replay on the record | five late P1 fix commits | no record |
| 10 You read the marked lines | a live trial on three merges | merge record names you and the commit | no record |
| 11 Short tool list | a with-and-without test, not a replay | "20 runs [T] with zero refused writes" | no record |
Owner decisions: D14, D15, D16, D18 are "later"; owner answer column blank for D07 to D23 (L306-322). Only D01 to D06 answered (11 Nov).

### 2h. One budget (L326-353)
| Item | Status | Quote |
| --- | --- | --- |
| Ceilings (L332-336) | MEASURED-HERE | see section 3 below; all from October runs (B L84-86) |
| "about 48 [I] agents" | GUESS | "arithmetic for scale only" (N L145) |
| Ledger of what v2 adds (L338-347) | GUESS [E] for run counts | "about 14 [E] reviewer runs for the review replay" |
| Rule: scripts first; one agent-adding change per window; written token budget; two lanes; state on disk; stop after first empty result; no harness agents while FixFlow phase runs | DESIGNED-ONLY | L351. The budget figure is D07, no answer (L306) |
| "Unknown" | stated | "So this budget keeps v2 from adding stops. It does not promise fewer." |

## 3. Numbers that bear on how many agents or sessions run at once

| Number | Tag | Source and quote |
| --- | --- | --- |
| Fixed cost per agent about 70,000 tokens (tools 34k, connectors 17k, skills 9k, system prompt 8k, memory 2k) | [M] | B L85 (CR-11, October). Later: TOKEN-BOTTLENECK L44: "about 60k tokens, roughly 50k of it tool and connector schemas" (FixFlow) |
| One five-hour window about 3.4 million subagent tokens | [M] | B L86; sweep card CR-04: "Measured on the Pro plan in October with a Workflow-tool script, not with the November session tree" |
| Ten lanes at once about 15 minutes | [M] | B L86; card: "stopped by the 5-hour limit after about 15 minutes at 2.44M subagent tokens; 2 of 19 agents finished". RA item 14: "October workflow subagent lanes, not slice sessions" |
| Two at a time: 18 of 48 agents finished; lean run 30 of 31 | [M] | card: "Resume with lanes 2 at a time: 30 minutes, 3.4M subagent tokens, 48 agents, 18 finished" |
| 14 limit episodes; subagents 91 of 104 errors | [M] | B L84; "The limit typically arrived about 75 minutes into a five-hour window" (not in D; RA item 1 uses it) |
| Build ran six to nine sessions; about three lanes worth running | [M] / from guesses | D L77. RA item 14: nine "counts sessions in other projects too" |
| Window size in the model: 30 lane-hours start; about 2.5 lane-hours "October's runs fitted" | [I] / [E] | A.params.budget; D L64 |
| Check: 367 s Windows, 230 s container, 284 s Windows parallel mean (855 s before) | [M] | N L34-35; B L64-65 |
| Two checks at once: 266 s and 267 s container (220 s alone that day); 435 s Windows | [M] | N L36-37 |
| Loaded day: 319-360 s container against 476 s Windows | [M] | B L65 |
| Waits: median 409 s over 19 recorded; min 3 s; max 2,030 s | [M] | N L42-46 |
| Memory: this PC 31 GB | repo CLAUDE.md | "31 GB of memory"; "three at a time at most" for child sessions |
| Memory: free 2.1 to 6.2 GiB in about 980 one-second samples; 8 GiB "was never free" | [M] | N L40-41; B L22 |
| Memory guard 8 GiB | [S] | "a safety margin, not a measured requirement" (N L39) |
| Least free 5.3 GB with two container checks running | [M] | N L38 |
| Stalled run: free memory under 1 GB | [M] | N L125 |
| A check's peak memory | no record | B L78: "A check's own peak memory was never measured." |
| Token context: slices about 306k per call; root about 499k; Opus never past 367k; Sonnet to 963k | [M] | L40, L108 |
| How cache reads count against the limit | unknown | L353, TOKEN-BOTTLENECK L64 |
| Sessions released at once on 9 Nov | no record | L389 |

## 4. What the refuter and later documents say is wrong or unproven

RA (refuter on the architecture and its model; ADJ says every item was "Taken" or "Partly", with the design changed). Still on the page as limits:
- Item 1: "The token window is not calibrated against the only measurement of it, and that reverses the headline." With the 75-minute figure "the binding limit then becomes tokens, with the knee at 2.1 lanes today and 2.5 in v2, which matches the record's two lanes."
- Item 2: "'All 11 merged' ... never reaches steady state"; "Five to twelve lanes give an identical 29.9 h."
- Item 4: "A deterministic fluid model has no queue below capacity."
- Item 5: "Only B1, B2, B3 and R3 are in the code." Staleness was "expiry by age, which the page and the record both forbid."
- Item 6: "main was not broken" (the "merges broke main" claim was wrong).
- Item 7: the sample re-split "does not shorten the plan"; "The 'shared things' and 'size' ... used by no rule"; "Co-change edges. They are unvalidated for planning."
- Item 8: ctxCap 0.72, fill shares and explore were tagged [M], should be [E].
- Item 10: "The model has no memory term, yet B08 records that the 8 GiB needed for the second slot was never free."
- Item 11: review modelled with unlimited servers; revert rework "not modelled, so the contract helps by assumption."
- Item 12: library "contradicts KS decisions"; "'Stale by code change' names no writer"; "the defect stops arriving overclaims".
- Item 13: residency bars "overstate the case for 'ask'".
- Missing (RA end): "The owner and the machine's availability as stocks"; "How the governor works when it cannot see how re-reads count against the limit. That unknown has to be measured before a governor can be built."; "Failure and re-plan paths"; pass bars and kill criteria.
- RA coverage: "(a) ... partly"; "(b) ... partly"; "(d) ... partly".
Fidelity and soundness passes (ADJ): 27 findings and 23 attacks, "Taken" except notes; "The gate workflow was assumed but never built"; "Replays and probes were uncounted" (now ledgered). Items "Partly": candidate-fix replay (now D20), not-built list incomplete.
Later documents:
- FINDINGS (phase 1) section 2: "The record's Opus-against-Sonnet difference is a comparison across models doing different work, not a trial." The 400k window "was never applied, but the effect was there for every Opus session ... 38 times."
- FINDINGS section 3: "Build load can explain six at most. Eleven point at the sleep path or at a PC that hung while idle."
- TOKEN-BOTTLENECK caveats: "How cache reads count against the five-hour limit is unknown, so lever 2 ... cannot yet be promised to reduce limit stops." "'What the windows hold' is estimated ... 5-8 % stays unclassified."
- SPLIT-RULE (14 Nov): the owner said yes to "one trial wave at the 300k line" (the design says 400k [S]). "The record does not settle which is ahead on tokens." "A script cannot score the trial's fidelity." Trial result: no record.
- SUMMARY-CHECK: "0 wrong of 2,727 claims ... and 74 of the 117 (63.2 %) whose last sections ... call something pending that the kept tail had already done." Bears on the compaction row ("What a compaction loses is unmeasured").
- GRAPH-TEST-RESULT: typed store "+0.076 [+0.036, +0.118]" over scripted search, "Mobile-app seeds +0.151 ... outside ... +0.024 [-0.023, +0.075]". "Not tested. Whether an agent finishes work faster or with fewer mistakes with any of these tools." Not the design's index replay.
- Embeddings report (16 Nov): "No arm adds to the simple ranker on this repository." Bears on any later graph or embedding add-on; the design already excludes embeddings (L371).
- B section 8 limits: "The sweep read the testbed's records, not its code." "The subagent write test ran in bypass mode." B 9.7: "Nothing here was run against the testbed except the token tally."

## 5. What the design says it does not solve (L373, L118, L353)

- L373: "Switching the PC on and signing in while you are away"; "The cause of the power-offs, until the diagnosis runs. If it is the mains, the fix is hardware and a later decision"; "How re-read tokens count against the plan's limit"; "A human reviewer other than you"; "Proof of the load limits without a real host."
- L223: "No promise is made that fewer tokens means fewer stops. That link is unknown."
- L64 (not in the model): "the PC powering off, you being away, memory, the cost of a revert, a lane that fails."

## 6. Build order and how far it got (L116, L130-141)

| Step | Status |
| --- | --- |
| 1 Machine (copy, restart, logger, resume list) "Phase 1, under way" | Read-only parts done: token baseline of 184 [M] transcript files; shutdown join (15 of 25 [M] with no session active); clinic repo check (fsck clean, 55 MB); compaction count 38 of 48. Not done: copy (drive not plugged in), sleep setting, logger and debugger install, power-cut notes, resume list, nightly copy ("Not started"). D03: "Not now. Docker's start at sign-in stays off" |
| 2 Check (container gate, slots, heartbeat) | DESIGNED-ONLY; D09 to D11 unanswered |
| 3 Gate, merge queue, plan check, index replay | DESIGNED-ONLY; no script on record |
| 4 First use, real host | DESIGNED-ONLY; D21 unanswered |
| 5 Governor, rest of library, compaction trial | DESIGNED-ONLY. Trial moved to 300k by the owner on 14 Nov; no result on record |
After 11 Nov: no record in the files read of any harness v2 build commit. Repo history shows research-tree work only.

## 7. Could not find

- Any result of a phase 1 install, a copy, a resume list or a logger run after 11 Nov: no record.
- Any run of an index replay, touch-list test, sealed replay or other mechanism test: no record.
- The compaction-window trial result: no record.
