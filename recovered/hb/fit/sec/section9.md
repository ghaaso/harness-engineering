## 9. How the Horthy and BAML ideas fit the bottlenecks

**Added on 2026-11-11 after the owner's check.** The first version of this file cited eleven idea ids and stopped. That left the two idea sweeps unprocessed. Both sweeps had scored every idea against the FixFlow ship plan's weaknesses, never against these 21 bottlenecks, so their verdicts could not simply be carried over. This section maps every idea the sweeps kept, re-screens every idea they dropped, and says what each adds to the first steps in §3.

**Method.** Three workflows, 19 agents, about 2.3M subagent tokens. Three Opus mappers placed the 78 Horthy ideas PR #186 kept, and one placed the 9 BAML items PR #184 kept. Five Sonnet readers screened the 783 Horthy families that PR dropped, and the BAML mapper screened its 85 dropped cards. Three Opus adjudicators then ruled on the 142 that were flagged (default: stays dropped). Two Opus refuters attacked the 51 claimed fits (default: no fit), one checked the 36 exclusions for misses, and one consolidated what survived. A last pass checked this section against its own evidence. A script checked every id against the PR lists. The full lists are `evidence/harness-bottlenecks/fit/FIT-LIST.md` and `DROPPED-RESCREEN.md`.

### 9.1 The answer

| | Count |
| --- | --- |
| Ideas the two sweeps kept (Horthy 24 adopt and 54 trial; BAML 4 trials and 5 borrows) | 87 |
| … that fit a bottleneck after the refuters | **29**: 2 direct, 27 supporting |
| … that stay useful to FixFlow's ship plan only | 58 |
| Ideas the two sweeps dropped (Horthy 783; BAML 85) | 868 |
| … flagged by the re-screen as bearing on a bottleneck | 142 |
| … that restate a first step in §3, or an idea already kept | 91 |
| … promoted | **1** (R-05) |
| … that stay dropped | 50 |

**The two lists sharpen three bottlenecks, touch seven more, and reach nothing on the machine.** No idea replaces a first step in §3. Of the 30 that fit, 20 bear on fix rounds (B01), overstated reports (B12) or review (B17). There they turn the first steps from prose into scripts that can fail. Eleven bottlenecks get nothing: the first-use gap, power, the check queue, memory, the stall, restart, the off-machine copy, progress display, the Linux gate and the load test. A body of work about prompts, context and review does not reach a power cut or a database hop. **So the order of the first moves in §0 does not change.** The ideas enter at the gate and review work, after the machine is stable.

**Six things the lists add that §3 did not have at all:**

1. A seal on every replay, so a replay cannot pass by reading the later fix (mechanism 1 below).
2. A stub run of the new gate and merge scripts at zero tokens, before they are trusted (mechanism 5).
3. A stricter fail-before test: only an assertion failure counts, and a "pre-existing" claim is rerun at the base commit (mechanism 2).
4. A human reader on the record for high-risk merges (mechanism 10). It is the only idea that puts a person in B17.
5. A rule that an environment fact is checked by one command before it becomes a harness rule (mechanism 7). The bottleneck list itself carried five facts that §1 overturned.
6. A number for the compaction lever in §3.6, measured in §9.4.

**What the re-screen of "already done" showed.** Of the 142 flagged ideas, the testbed had practised the mechanism in 71. It worked in 33 and failed in 38. Brief contracts with evidence tags, model re-checks of claims, vertical slices and state in the repository were all in use. Twenty-plus overstated reports and the last-day gaps happened anyway. Much of Horthy's advice, in its prose form, had already been tried here. That is the strongest support in the record for the script-first rule in §7: the same idea as a brief line failed, and as a script it has not been tried.

### 9.2 By bottleneck

"Direct" means the idea would move the number in that bottleneck's Proof column in §3. "Supporting" means it makes a step of the first move cheaper, safer or checkable.

| Id | From the two lists | Ideas | What they add to the first step in §3 |
| --- | --- | --- | --- |
| B01 | Supporting | G2-F051, G2-F044, G4-F086, G2-F015, G2-F114, G2-F183, G1-F170, G4-F081, G4-F088 | The replay is sealed. Fail-before must be an assertion failure. After two failed fixes a fresh agent takes over and a third failure goes to re-plan. A finding blocks only if it states a failing condition. None changes the fix-induced defect rate by itself |
| B02 | Nothing | – | The gap was missing production creation paths behind a synthetic seeder. Vertical slices and assumption checks were practised and did not find it. The zero-seed walk in §3.5 does |
| B03 | Supporting | G2-F054 | One guard at resume: a released session whose branch holds commits its record does not cover parks itself instead of starting fresh. Nothing in the lists restarts Docker or a session after a power-off |
| B04 | Supporting | G2-F114, G2-F041, S-3, G1-F157 | G2-F114 and G2-F041 are the gate workflow and merge queue §3.4 already names. S-3 tests them with stubs. G1-F157 trims the fixed cost of their subagents. The root is 15 % of tokens |
| B05 | Nothing | – | 24 power-offs with no crash code. No idea diagnoses a mains cut or a thermal trip |
| B06 | Nothing | – | The cost is the Docker Desktop network hop. No idea touches the check's transport |
| B07 | Nothing | – | Slots depend on a check's peak memory. Two ideas add reruns to the queue, which is a conflict (§9.5), not a remedy |
| B08 | Nothing | – | The memory holders are the browser, the WSL2 machine and Claude processes |
| B09 | Nothing | – | A stall needs a heartbeat naming the running test. No idea reaches the test runner |
| B10 | Nothing | – | Machine settings: Docker start at sign-in and restart policies |
| B11 | Nothing | – | A custody decision and a git bundle |
| B12 | Supporting | T-08, G4-F086, G1-F085, G2-F051 | The claims script runs record-only with an allow-list and no retry. A "pre-existing" red test is rerun at the base commit. The proof still rests on §3.4's own script |
| B13 | Supporting | G2-F041, G3-F074, R-05 | The merge script applies the generated board diff. A transcript tally counts the root's edits at merge, which is the baseline for "root edits at merge: zero". The generator reports rows received, kept and dropped |
| B14 | Nothing | – | The cause was a long foreground call. The remedy is the heartbeat in §3.4. No kept idea is a progress signal |
| B15 | Supporting | G4-F068 | A clean-worktree check at merge, so the dry-run reaper meets no surprise. The archive rule stays the owner's |
| B16 | Supporting | G2-F180 | It would have stopped the false "subagents cannot write" rule forming from an unchecked agent report. It does not move the refused-writes count |
| B17 | **Direct** | G2-F118, G4-F140; supporting: G4-F232, G1-F196, G2-F183, G2-F023, G4-F073, G4-F086, G2-F114, G2-F051, G2-F044, G4-F023, S-3, G4-F084 | G2-F118 refuses a merge whose verdict does not name the merged head. G4-F140 adds the owner as a reader of marked hunks on high-risk merges. Both move "5 of 6 unread". The rest make the merge record checkable against the transcript |
| B18 | Nothing | – | A decision to make the Linux container run the gate |
| B19 | Supporting | G4-F152 | Each first-deploy step carries its command, its expected result and a negative run. A real host is still needed |
| B20 | Nothing | – | Rerun the 12-user drill. Nothing about prompts or review reaches load testing |
| B21 | Supporting | D-13, S-2, R-05 | One written P0 to P3 scale and one status table that the parser is generated from, so an unmapped status fails the parse and dropped rows are counted. The owner's expiry rule remains the step |

### 9.3 The eleven mechanisms the ideas reduce to, in order

Thirty ideas collapse into eleven artefacts. Six are scripts that spend no tokens. Order: scripts that guard the replays in §4 first, anything that adds agents or owner time last. Mechanisms 7 and 8 are free clauses and can go in at once.

| # | Mechanism | Ideas absorbed | What the ideas add beyond §3 | Cost | Owner decides | Proof on the testbed record |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Replay seal and read log** (B01, B12, B17) | G2-F051, G2-F044, G4-F023 | §3 names replays at frozen commits but no seal. Adds: a clone with no later refs; an answer key hashed first and committed only after judging; a read log from the replay agent's transcript; one head and one hashed brief per arm, else "not comparable" | Script | – | Run one recorded fix chain in a sealed clone and in a plain worktree. The read log must show zero opens of the later fix, the finding tables or the board |
| 2 | **Gate-round verdict script** (B01, B12, B17, B04) | G4-F086, G1-F085, G2-F015, G4-F073, T-08, G2-F114 | §3 has the claims file and fail-before, pass-after. Adds: only an assertion failure counts as fail-before; base and head tests are compared for weakened expectations; a "pre-existing" red is rerun at base; a diff grep lists new skips, suppressions and check-config edits; record-only, no retry, an allow-list; lines not run are marked "read, not run"; a typed verdict naming the head | Script, plus check-slot time | Whether the typed verdict replaces the root's own diff read | For each closed P1 that cites a test, run it at the fix's parent: count assertion failures against collection errors. Score the 20-plus recorded overstatements; false flags under 10 % |
| 3 | **Transcript audit at merge** (B17, B01, B13) | G2-F183, G2-F023, G3-F074 | §3's merge record is self-reported, and B12 shows such fields get filled falsely. Adds an independent source: the harness's own tool-call records say whether a reviewer read the final head, whether the gate ran before each fix commit, and how many root edits touched shared files. Records only; no hook | Script | – | Run it over the 10 and 11 November merges. It must find the unread final heads on its own and give a root-edit count per merge |
| 4 | **Finding table and parser** (B21, B13) | D-13, S-2, R-05 | §3 has a parser. Adds: P0 to P3 and every status written once; the parser's allowed values generated from that table; rows received, kept and dropped reported, and no open count when a drop is unexplained | Script | The P0 to P3 wording; the expiry and re-triage rule | Parse the board: zero unmapped statuses, every dropped row explained, an open count over the 183 P3 ids |
| 5 | **Stub harness for the gate and merge scripts** (B04, B17) | S-3 | Not in §3. Runs the new scripts under node with stub agents that return nothing, throw, or refute. A dead reviewer must never read as a clean one | Script | – | Planted cases only, since the testbed had no gate script: a null reviewer, a throw, a refuted verdict, a reader of "none" on a high-risk branch. None may reach merge |
| 6 | **Local merge queue that refuses on a wrong head** (B17, B04, B13, B15) | G2-F118, G4-F232, G1-F196, G2-F041, G4-F068 | Little that is new: §3 already names the queue, the lock and the reader field. Adds a record-only first mode, so it is replayed over the 65 recorded merges before it may refuse anything, and a clean-worktree flag at close | Script | Letting a script refuse a merge; naming the high-risk list | Record-only over the 65 merges it must flag the unread heads of 10 and 11 November. Live: unread high-risk final heads from 5 of 6 to zero |
| 7 | **Command-backed facts and checklist steps** (B16, B19) | G2-F180, G4-F152 | §8 names one write probe. This makes it a rule: an agent-reported or owner-stated environment fact is checked by one command before it becomes a harness rule. Each first-deploy step carries a command, an expected result and a negative run | A brief line | – | Count the environment facts in the root's 15 lessons and the 21 statements that one command could check, and how many §1 found wrong |
| 8 | **Resume mismatch guard** (B03) | G2-F054 | §3's resume list does not check that a session's record matches its branch. After 24 power-offs they can drift | A brief line | – | For the 9 November mass resume, count sessions whose record disagreed with their branch head. Zero means unproven: keep it dormant |
| 9 | **Fix-round brief clauses** (B01) | G1-F170, G4-F081, G4-F088 | §3 has the two-round cap, revert, a fresh reviewer and the state-ending table. Adds what happens after round two, a failing condition as the price of blocking, and a line naming the authoritative source of any new stored state | A brief line; the fresh agent is §3's fresh reviewer, not an extra one | – | Under the seal, on the five late P1 fix commits: how many does the state-source line name? How many round-two findings state no failing condition? |
| 10 | **Owner read of marked hunks** (B17) | G4-F140 | The only idea that puts a human reader on the record. Bounded to hunks the reviewer marks, on high-risk merges, recorded against the merged head. A trial on three merges | Owner time at merge | Whether to give that time, and to let those merges wait | The merge record names the owner and the head read, against 5 of 6 unread. Log the owner wait against B03's idle hours |
| 11 | **Tool allow-list for gate subagents** (B04) | G1-F157 | §3.6 names connectors and skills, not tool definitions, which are 34k of the 70k fixed cost per agent. Keep Write for report folders | A config line, after an A/B | Adopting a restricted agent type | One context reading with and without the list; 20 runs with zero refused writes |

### 9.4 The token lever: Horthy's compaction line, measured

One of his statements never reached the mapping, because PR #186 filed it under ideas FixFlow already follows (G1-F081, G1-F165, G1-F099). On 7 November 2026 he wrote that he lets a session compact automatically at 400k tokens and compacts by hand between 200k and 400k. The clinic sessions ran to the native threshold of about 967k (card A5-07). §3.6 already lists "an earlier compaction setting" as part of the largest lever and gives it no number. His line gives one, and the November transcripts say what it would touch.

| Session type | Share of November's tokens | Read in calls over 400k of context | Read in calls of 200k to 400k |
| --- | --- | --- | --- |
| Slice sessions | 66.4 % | 26.8 % | 29.9 % |
| Root | 15.3 % | 12.4 % | 2.3 % |
| Subagents | 18.3 % | 0.6 % | 5.9 % |
| **All** | 100 % | **39.8 %** | 38.1 % |

Four in ten of November's tokens were read in calls above his 400k line. The part of those calls that sits above the line is 14.3 % of all tokens (608M of 4,253M). Above a 200k line it is 38.3 %. That is the size of the prize before the cost of compacting more often, which nobody has measured here. Source: `fit/tally-buckets-output.txt`, same transcripts and counting as §2.3.

What limits it:

- His line carries no measurement, and his own numbers have moved: the line was 100k in mid-2025.
- The testbed's context trials (§2.4) tested restore machinery on top of compaction, not an earlier threshold. They do show that native compaction kept recall: 15 of 15 in every arm (A5-13). That argues an earlier native compaction is safe. It does not measure it.
- Claude Code documents an auto-compact window that can be set per session and per subagent definition. That was read in its documentation and is not verified on this install.
- Whether cache reads count against plan limits is unknown (§4), and the stops were power-offs. A token cut may not cut a single stop.

**Class: Trial.** Run the next wave with the window at 400k. Compare tokens per merged slice with November's per-slice figures (§4 item 6), and gate rounds and findings as the quality check. It costs a setting. At one wave the result is exploratory.

### 9.5 Where the ideas pull against each other, or against a measured fact

| Tension | Resolution |
| --- | --- |
| Reruns at the base commit (G4-F086, G1-F085) against the one check slot, where waits reached 2,030 s | Rerun only the cited tests, inside the same lock hold as the round's one full gate. Never a second full check. Replays run outside build hours |
| Refusals and owner reads (G2-F118, G4-F140, G2-F054) against B03, which wants fewer owner waits | A refused merge or a mismatched resume parks only its own slice. Owner reads are batched at the owner's turn. Measure the wait on the three-merge trial |
| A tool allow-list (G1-F157) against B16, where a tools list without Write caused refused writes | The list always keeps Write for the report folder. Twenty runs with zero refused writes are part of its pass bar |
| A fresh agent after two failed fixes (G1-F170) against the one budget, at about 70k fixed per agent | That agent is §3's fresh reviewer, not an extra one. Nothing in either list offers a cheaper verifier to pay for more review |
| Non-blocking notes (G4-F081) against B21, where notes with no status became 183 carried findings | A note exists only as a finding record with a status from the one table |
| A reader field that is present (G1-F196) against B12, where such fields were filled falsely | The field must match the head in the typed verdict and the transcript audit |
| The advisory check (G4-F232) and the refusal (G2-F118) | The same check at two strengths. Record-only first; refusal after the owner decides |
| The allow-list against the null context trials in §2.4 | It cuts fixed overhead and restores nothing. Adopt only on a measured drop |

### 9.6 Not taken, downgraded, and what this pass corrected

- **Not now: G4-F084**, one Codex review pass. It adds nothing over §3.3's own replay arm, which already sets a second model family against a fresh same-model reviewer. Code would leave owner-controlled machines. Take it only after the replay seal exists and the owner approves the vendor.
- **Downgraded by the refuters, 22 of the 51 claimed fits:** G1-F036, G1-F042, G1-F159, G1-F183, G3-F088, G2-F104, G2-F024, G2-F077, G4-F025, G4-F031, G4-F034, G4-F089, G4-F157, G4-F181, G4-F186, G4-F203, G4-F225, I-13, P-10, S-1, S-4, S-5. Three reasons recur. The idea is bound to a FixFlow trial or file that has no counterpart in the testbed. The testbed already had the mechanism. Or the mapper had widened the idea to make it fit.
- **The eleven ids the first version cited.** Seven hold: G2-F015, G4-F073, G4-F088, G4-F140, G2-F183, T-08, D-13. Two do not: G2-F104, and G4-F089, whose seven defect shapes are FixFlow's own; the testbed's list has to come from its own findings, which is §3.3's state-ending table. G4-F154 and G4-F156 stay dropped, as §8 said.
- **The 58 FixFlow-only ideas keep their standing.** This section changes no disposition in PR #186 or PR #184. It adds a second column: fit to the testbed's bottlenecks.
- **Three corrections to the record.** (a) The application check already fails on an added skip (A7-05, A8-10). The open defect "passes when every test is skipped" (A7-13) is in the workflow verify tool, not in the gate. (b) The four unread merges of 10 November followed the owner's instruction to wrap up and merge on the sessions' reports (A2-11). Part of "5 of 6 unread" was a decision, not an oversight. A script that refuses an unread head would have refused merges the owner had asked for, which is why mechanism 6 is an owner decision. (c) The October limit errors were all five-hour-window limits (CR-03).

### 9.7 Limits of this section

- The mapping, the attack and the adjudication are models reading two idea documents and this file. Nothing here was run against the testbed except the token tally. Every proof in §9.3 is a proposal.
- The screen of the 783 dropped Horthy families was one Sonnet pass. An idea it missed stays missed. The 36 exclusions were checked once.
- Mechanism 3 depends on transcripts surviving cleanup. The retention setting is unverified.
- Not yet named: the testbed's gate-config file set and its high-risk list. Whether the reviewer briefs for the seven known misses survive is unchecked. Flaky tests (A3-14) can fail a base rerun for the wrong reason, so mechanism 2 needs a rerun rule.
- Neither list offers a cheaper verifier to pay for the review it adds. The one-budget warning in §3.6 stands unchanged.
- §9.4 is the main session's own measurement and reading.

---
