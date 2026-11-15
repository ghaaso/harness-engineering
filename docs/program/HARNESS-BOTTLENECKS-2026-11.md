# Harness bottlenecks: what the testbed built, what is unsolved, what needs research (2026-11-11)

**Status: findings only.** Nothing here is adopted, installed or changed in either repository. This file and its evidence folder are **not committed**: they hold details of the clinic testbed (a repository with no remote, by the owner's choice) and of the owner's PC, so whether they go to GitHub is the owner's call. Raw outputs: `docs/program/evidence/harness-bottlenecks/` with a sha256 manifest.

**What was asked (owner, 2026-11-11).** The clinic testbed build ended with 21 unsolved bottlenecks (B01–B21, verbatim in `evidence/harness-bottlenecks/bottlenecks.md`). Do they need more research? Compile, without missing anything, what the testbed already did for speed, token efficiency, recall and parallel work, including "a SQLite graph-based library for a self-evolving repository". Would Tree, Forest or Graph of Thoughts help? Would spatial and temporal topology in recall from graphs save tokens? The ideas from Dex Horthy's work (PR #186) and BAML (PR #184) are already compiled; §9 maps every one of them onto the bottlenecks.

**Method.** Three workflows and the main session's own checks, 23 agents, about 3.6M subagent tokens: a read-only sweep of the testbed (eight Sonnet readers and an Opus critic; 158 mechanism cards), six Sonnet research lanes with fetched sources, then four Opus mappers, two Opus verdicts and an Opus refuter (23 attacks; 4 reclassifications). The main session read this PC's event log, Docker state and app settings, and re-measured the November token use from the transcripts. Limits are in §8. §9 was added later the same day, at the owner's request, by three further workflows; its method and limits are in §9 itself.

---

## 0. For the owner (one page)

**Do these need more research? Almost none of them.** Of the 21, none needs literature research. Seven are owner decisions, seven are known engineering, three are diagnoses that a measurement on this PC settles, and four are trials: a remedy is plausible and nobody has measured it, here or anywhere. The reading is done; what is missing is measurement on our own record, which already holds the baselines.

**Five facts measured today change what to fix.**

| The list says | What the record shows |
| --- | --- |
| B05: two unclean shutdowns, memory suspected | **24 unexpected shutdowns since 7 October.** 23 wrote no crash code (power loss, hard hang or hard reset). 4 show the power button held; 5 happened around sleep. No hardware-error records. The only two out-of-memory events all month name photo-editing applications, on 1 November, near no shutdown. Windows does not power off when memory runs out. |
| B03: a usage limit halted everything on 6 November | **The PC powered off at 14:58:23 that day**, 31 seconds after the last commit. The root transcript's records stop in that hour and hold no limit message on 6 November (limit messages appear on 1 and 3 November only). Nothing restarts after a reboot: Docker's start-at-sign-in is off and every clinic container has restart policy "no". |
| B04: the one orchestrator is where the context goes | The root compacted **four** times (574k, 974k, 967k, 970k tokens). But it took **15 % of November's tokens. Slice sessions took 66 %**, at about 306k tokens of context on each of 9,342 calls. |
| B07: the second check slot opens with 8 GB free | 8 GiB was **never** free in about 980 samples on build days, so there was one slot. The 34-minute wait is real: 2,030 s on 9 November, when every session resumed at once. |
| B16: subagents cannot write files | They can. A background subagent wrote and read back a file here with no prompt. Read-only agent types, a tools list without Write, or an unanswered prompt in default mode cause the refusal. |

**What the testbed already built.** Its measured wins are in the check, not in memory: the parallel check went from 855 s to 284 s (3.0×), and the Linux container run is 230 s against 367 s on Windows (1.6×) but is not the gate. Every trial of context machinery came back null or worse: a Codex adapter that snapshots before compaction and restores after, tried on another project, used 6–17 % more tokens for the same recall, and the with-and-without trial showed identical results. None of these trials tested an index or a graph. **There is no SQLite graph library in the testbed**, on any branch. The closest things are in §2.6; the best match to that description is this repository's unbuilt knowledge-store design (PR #183).

**Tree, Forest, Graph of Thoughts: no, with one narrow exception worth a replay.** Their measured gains are on puzzles with a 2023 model; at equal compute plain sampling matches them. The one form with coding evidence is several candidate fixes chosen by an executed test. Nobody has shown it stops fixes creating defects. Test it first on the recorded defect chains, at near-zero cost (§5).

**Spatial and temporal recall: yes in two small deterministic forms, no as a graph.** "What is true now" for slices, verdicts and findings as a generated view, and "what does this fix touch" as a scripted list of callers and co-changed files. Not a model-extracted knowledge graph, not a graph server, not embeddings (§6). Content fetched by reading and searching is about 27 % of November's context tokens, and calls that only read or search re-read 43.6 % of them: two exposures for an index, neither of them a saving. A connection graph of the FixFlow repo was then built by script and tested (12 November): it is small and cheap, but of 200 real searches from the testbed sessions it would have fully answered one and saved no step. The owner rejected that test the same day and a research round confirmed its defects (the weakest query, no real graph engine, no ranking or hop tuning), so its verdict is withdrawn; a replacement test is frozen in the evidence folder and under way (§6).

**What the Horthy and BAML ideas add (§9).** Every idea from both sweeps was run against the 21 bottlenecks. Of the 87 ideas the sweeps kept, 29 fit a bottleneck, and one dropped idea was promoted. They sharpen fix rounds, overstated reports and review, by turning those first steps into scripts that can fail. They reach nothing on the machine: eleven bottlenecks get no idea at all, so the first moves below do not change. One measurement came out of it: about four in ten of November's tokens were in calls whose context had passed 400k. The testbed had already chosen a 400k compaction window and never switched it on (§9.4).

**The first moves, in order.** (1) An off-machine copy of the clinic repository today, and Docker's start-at-sign-in on. (2) Diagnose the shutdowns before adding load: the owner says whether the house lost power at the logged times; a sensor log and the 7 October crash dump settle the rest. (3) Make the Linux container run the gate and size the check slots from one measured number. (4) The fix-round contract, replayed on the recorded chains before any live use. (5) A script-first gate: claims a script can resolve, a generated board, reports on disk. (6) A zero-seed first-use walk in every gate. (7) A token budget aimed at slice-session windows.

---

## 1. Corrections to the list, with their evidence

| Id | Correction | Evidence |
| --- | --- | --- |
| B02 | Half closed since the list was written: the real-data switch and the money-setup command merged on 11 November (`fb55599`). The clean-install walk is still unrun, and the testbed's "clean machine" drill seeds synthetic data (`deploy/drills/a_first_deploy.sh:37-38`). | mapper M1; refuter |
| B03 | The three-day halt began with a power-off, not a limit (table above). After the reboot the PC idle-slept and powered off three more times (6 Nov 18:11, 7 Nov 16:40, 8 Nov 11:47). | Windows System log, read today; root transcript, grep today; `machine-facts.md` |
| B04 | Four compactions, not "more than once"; and the root is the smaller token sink (§2.3). | main session's tally, `tally.js.txt` |
| B05 | 24 events, not two; memory is the least supported cause. Three to four a day on 3, 4 and 6 November fit a thermal or power-supply trip under all-core load, or mains cuts; eight came in October before the build. | `machine-facts.md` |
| B06 | The slow path is the network hop through Docker Desktop's published port (0.63 ms against 0.13 ms per trivial query; workers about 40 % busy), not files. Moving the checkout into the WSL2 filesystem targets a boundary neither mode crosses at test time. | card A3-10 |
| B07 | Waits ran from 3 s to 2,030 s. The largest came from releasing every parked session at once. | refuter (root transcript, 9 Nov 12:52Z); card A3-08 |
| B08 | Idle sessions and containers are not shown to be the main consumers. On a no-build reading: browser 6.1 GB, the WSL2 VM 5.2 GB with four containers running, Claude 3.2 GB over 15 processes. 25 of the 26 clinic databases are stopped. | `machine-facts.md` |
| B14 | Most likely one long foreground call, not a frozen display: a check may wait 2,700 s for a slot before a 5–18 minute run, and one 49-minute foreground polling loop is on record. | mapper M3 |
| B16 | Not a platform limit (table above). The rule came from two agents' unchecked report, which makes it an instance of B12. | probe today; research lane B5 |
| B17 | Executed proofs and drills ran at every gate. The real gaps: no human reads anything, and the final head often merged unread: 4 of 5 merges on 10 November, and the real-data switch on 11 November, whose first root check then failed 2 of 2,570 tests. The 10 November merges followed the owner's wrap-up instruction (card A2-11), so part of this was a decision. | cards A2-08, A2-11; mapper M4 |
| B19 | Several items are unbuilt, not merely untested: no certificate script, nothing pushes backups off the host, no alert channel, no ssh hardening in provisioning. | S12 first-deploy checklist, via mapper M4 |
| B21 | Not dozens: 111 P3 findings in round 1 alone across ten slices, and 183 distinct P3 ids on the board with no status column, so no open count exists. | card A2-09; refuter |

---

## 2. What the testbed already built (the compile)

158 cards in `evidence/harness-bottlenecks/sweep-cards.txt`; one line per card in `sweep-index.txt`; every timing in `sweep-tables.txt`.

### 2.1 Measured wins

| What | Result | Status |
| --- | --- | --- |
| Parallel check: pytest-xdist, 6 workers, one database per worker, a serial pass for race tests, proof that every test runs exactly once (A3-01, A3-12) | 855.2 s → 268–298 s over 12 runs, mean 283.8 s (3.0×) | in use |
| Linux container beside the database, 12 workers (A3-11, A4-01) | 230.1 s mean against 367.2 s native on the same tree; 319–360 s against 476 s on a loaded day | built, optional, **not the gate** |
| Two container checks at once (A4-05) | 266 s and 267 s, against about 440 s in a row; least free memory 5.3 GB | measured, not used |
| Start-up cost found by tracing (A3-04) | 43 s → 11.5 s on a 16-test run | in use |
| Worker sweep (A3-02, A4-05) | Native: 8 workers gain 3 % over 6. Container: knee between 6 and 12 | in use |
| Race tests decide "blocked" from the database, not from elapsed time (A3-15) | 159 race tests, 189 s | in use |
| Page speed at volume (A4-09) | 9–13 s → 0.1–0.5 s at 75,016 documents; queries on one page 29,346 → 28 | in use; the 12-user load run was not repeated |
| Local staging rig and drills a–o (A4-06) | Fresh VM serving in 109 s; 781,505 rows restored in 14 s | in use; needs an administrator prompt per VM start |
| Throughput of the build (A8-04) | 432 commits and 65 merges in eight working days; 150 commits on the peak day | record |

Tried with no clear gain: non-durable test-database settings (inside the noise, A3-03).

### 2.2 Machine guards

A machine-wide check lock outside the checkouts, two slots, a per-checkout lock (A3-06, A3-07); a memory guard that opens the second slot only at 8 GiB free, which was "a safety margin, not a measured requirement" (A3-08); a 600 s stall watchdog with a heartbeat and a process-tree guard (A3-09); a retry for the Windows loopback socket error 10055 (A3-16); per-checkout isolation: own worktree, branch, port, database and compose project (A8-08). A check's own peak memory was never measured.

### 2.3 Where the tokens went

| Measurement | Result |
| --- | --- |
| October (6–20 Oct), 259 transcripts (CR-03) | About 778M tokens, 94 % of them cache reads. 14 usage-limit episodes. Subagents made 82.4 % of 4,155 calls and 91 of 104 limit errors; one burst gave 40 limit errors in 78 s. The limit typically arrived about 75 minutes into a five-hour window. |
| Fixed cost per agent (CR-11) | About 70,000 tokens before any work: tool definitions 34k, connector definitions 17k, skills 9k, system prompt 8k, memory 2k. |
| One window, October plan (CR-04) | About 3.4M subagent tokens. Ten parallel lanes died in 15 minutes; two at a time, with state on disk, finished. |
| **November, measured today** (`tally.js.txt`; 184 transcripts, 557 MB) | 4.25 billion cache-read tokens. Slice sessions 66.4 % (9,342 calls, about 306k context per call). Root sessions 15.3 % (1,335 calls, about 499k per call). Subagents of both 18.3 % (about 153k per call). |
| Root orchestrator (CR-05, updated) | Four automatic compactions at 573,774, 974,246, 967,210 and 969,988 tokens. |

How cache-read tokens count against the five-hour limit is unknown (CR-03), so no token cut can yet be promised to reduce limit stops.

### 2.4 Context and recall work: built, measured, no gain

| Work | What it is | Result |
| --- | --- | --- |
| Context system (`tools/context_system`; A5-01..A5-07) | Compaction steering, declared-state restore, exact lexical recall over transcripts; JSON files, no SQLite, no graph | 85 tests; never installed, never run live |
| Codex adapter and its three evaluations (A5-10..A5-14) | Snapshot before compaction, restore after | Same recall (15 of 15) and task success in all arms; the adapter used **+6.1 %** tokens over a plain notes file and **+17.0 %** over native compaction. Final audit: "context gain proven: false" |
| With-and-without trial of a compact context packet (A7-06) | Two isolated clones, real agents, frozen oracle | Identical acceptance, near-identical time |
| Synthetic packet pilot (A7-03) | Six fixtures | 20.6 % fewer bytes delivered; no outcome measured |
| Corpus map (A6-01..A6-13) | A typed-edge map of 11 planning files stored as JSON lines, with a coverage ledger and a hash-based refresh | 3,361 records for a 167 KB corpus; extraction recall 0.52 against an earlier reading; **its validation contract was frozen and never run** |
| Survey of about 20 external context tools (A6-14..A6-19, A5-09) | Hooks, proxies, memory stores | None adopted |
| Measurement system (A7-09..A7-12) | Ledger, identities, gates G0–G8 | Designed, not built; owner ruled it low priority |

The transferable result is the negative one: a disciplined short notes file matched the heavier machinery, and nothing here was shown to save tokens.

### 2.5 Orchestration and verification practice in use

Four tiers with model and effort stated on every start (A1-01). A session tree of depth three and fan-out three, one file set per node (A1-02). State in the repository: one task record per node, parents judge by diff (A1-03). Root as the only writer of shared documents (A1-04). A brief contract (A1-05). Two-level gates with Opus refute-reviewers and findings tables per round (A1-06, A2-01). Lock-removal experiments for race tests (A2-06). Failure demonstrations and "nothing weaker" proofs for the check (A8-10). Parked starts: sessions created on the owner's turn and released later by message (CR-02). The root's lesson memory: 15 files written after failures (CR-01). Tests that assert documents against code (CR-06). A migration-numbering rule across parallel slices (CR-07). A screenshot-and-rubric pipeline for screens (CR-08). Checkpoint and resume by hash of declared dependencies; a verify command and pre-commit hook, with eight red-team defects still open, including "verify passes when every test is skipped" (A7-02, A7-04, A7-13).

### 2.6 What was not found

No SQLite graph library, no `.sqlite` or `.db` file, no graph code, nothing that updates itself, on `main` or any branch, in the worktrees, or in the Codex folders (critic, confirmed by three independent searches). The four nearest things are the corpus map, the context system, the root's lesson memory, and research notes on external SQLite or graph memory tools, one of which was vendored as evidence. A different project on this PC (`28_Misc_Ideas/scheduler-system--main`) holds a Graphiti knowledge-graph client. The description fits this repository's knowledge-store design best: SQLite as a rebuildable index over an append-only journal, lookups a cheap agent can verify. That design is unbuilt.

---

## 3. The 21 bottlenecks: what is left

Classes: **Build** (remedy known, hours to days), **Decide** (the owner's choice), **Diagnose** (a measurement here finds the cause), **Trial** (plausible, unmeasured; name the experiment). Classes are the mappers' with the refuter's four changes applied. Full text per item: `map-full.txt`; attacks: `refute.txt`.

### 3.1 Power and restart (B03, B05, B10, B11)

| Id | Class | First step | Proof |
| --- | --- | --- | --- |
| B05 | Diagnose | Join the 24 event times to commits and check logs; the owner notes mains outages; a sensor log of temperature, power and memory by process group; decode the 7 October dump; stop the PC sleeping while sessions hold work | The next event has a trace that ends at it; zero sleep-related events in 14 days |
| B11 | Decide | The owner picks custody: a private remote or an encrypted bundle. Then `git bundle create --all`, verify, copy off the PC; nightly copy that also captures uncommitted work | A clone from the copy shows the same heads; copy age under 24 h |
| B10 | Decide | Docker start-at-sign-in on; `unless-stopped` only on the databases in use; the check starts its own database when it is missing | After a reboot and sign-in, databases healthy within 3 minutes with no command |
| B03 | Decide | A restart chain (the three rows above) plus a resume list at sign-in; release sessions **two at a time**; run gates as workflows; keep parked starts as the default | Idle hours between "could resume" and the next commit: from about three days to under three hours |

Per the Claude Code documentation lane, not verified on this install: an open interactive session can wait out a usage limit and continue; workflows pause and resume at a limit but not inside scheduled or background sessions; scheduled-task prompts cannot act as approval. One afternoon probe settles what a scheduled task may start here.

### 3.2 The check (B06, B07, B08, B09, B15, B18)

| Id | Class | First step | Proof |
| --- | --- | --- | --- |
| B06, B18 | Decide | The container run becomes the gate; the Windows run triggers only when host tooling changes. Expect one fix-up round for order-dependent tests | Median gate near 230 s; zero Linux-only failures on main |
| B07 | Build | Measure one check's peak memory; set slots from it; a fair queue with a printed position; one full gate per review round | Second slot open on at least half the polls; median wait under a minute |
| B08 | Diagnose | One build day with a per-group memory sampler, then choose among: one shared test database, a cap on the WSL2 VM, closing other applications | A table of who holds memory when less than 2 GB is free |
| B09 | Diagnose | The heartbeat records the running test; on a stall, dump every worker's stack; lower the stall limit to about 120 s | The next stall names its test and cause class |
| B15 | Decide | A written archive policy; a dry-run reaper for merged, clean worktrees and their compose projects, skipping any session written to in 24 h | Worktree and container counts return to active slices plus one after each merge |

### 3.3 Fix rounds and review (B01, B17, B21)

What the record shows: 9 of 11 slice gates took three rounds, and round three was the root reading the diff alone. 19 P1 findings in round one; at least 5 more P1 and 10 P2 created by fixes, clustered in fixes that add state (a hold, a lock, a marker, a cutoff). The build stopped on the owner's instruction.

| Id | Class | First step | Proof |
| --- | --- | --- | --- |
| B01 | Trial | A fix-round contract: a reproduction test per finding that fails before and passes after; the full gate before the fix commit, **revert instead of patching a patch**; a fresh reviewer for the re-read; at most two rounds; a table of every way new state ends, with a test per row; a scripted blast-radius list. First replay it on the recorded chains at their frozen commits | Would the table and the list have demanded the tests the five late P1s needed? Then live: fix-induced P1 and P2 per fixed finding against the testbed's rate |
| B17 | Trial | A finding closes only on a harness-run test; each merge records who read the final head, and a high-risk branch cannot merge on "none" or "own"; a replay of seven known misses with a second model family against a fresh same-model reviewer | High-risk merges with an unread final head: from 5 of 6 to zero. The replay result is exploratory |
| B21 | Build | Parse the board's finding tables with a script into records with id, severity, status, closing commit and file footprint; an owner rule for expiry and for re-triage of anything on money, stock, access, import or restore | An open count exists; the pilot-critical subset has a verdict per row |

How the Horthy and BAML ideas attach to these three rows is in §9.2 and §9.3: the replay seal, the gate-round verdict script, the fix-round clauses, the merge refusal and the finding table. The ship plan's reviewer rule (head SHA, fail-before and pass-after per finding) already exists in this repository.

### 3.4 Reports, shared documents, the orchestrator (B12, B13, B14, B16, B04)

| Id | Class | First step | Proof |
| --- | --- | --- | --- |
| B12 | Trial | Each slice commits a claims file; a script checks that every cited test exists, ran, and fails when its guard is removed. Run it in the root's gate first. First replay it over the recorded gates | Share of the 20-plus recorded overstatements it flags; false flags under 10 % |
| B13 | Build | Each slice writes a small state fragment; a generator builds a short board; the diff of the generated board is a step of the local check; tests assert routing documents against the plan | Board state from 221 KB to under 20 KB; root edits at merge: zero |
| B16 | Build | General-purpose or Write-enabled agents write the full report to a pre-allowed folder and return a path, a hash and a short summary | Refused writes: zero over 20 runs in the clinic's permission mode |
| B14 | Build | The check writes a heartbeat (waiting with queue position, running, stalled); checks run in the background, never in a foreground polling loop | Longest gap between heartbeats under 60 s |
| B04 | Trial | Move review into a gate workflow that returns a typed verdict naming the head SHA; move merging into a local queue under a lock that tests the merged result; keep the root for judgment | No compaction across a wave of five gates. Bounded gain: the root is 15 % of tokens |

Two of these reach for hooks (a stop hook that blocks on a failed claim check; a heartbeat fed by tool events). The harness review skipped hooks for named reasons. Re-opening that is an owner decision; the root-gate versions need no hook.

### 3.5 First use and the real host (B02, B19, B20)

| Id | Class | First step | Proof |
| --- | --- | --- | --- |
| B02 | Build | A zero-seed journey against a fresh container database in every gate: install, first user, tills and accounts, a real-shaped import, one transaction, close of day. A static test that every model the seeder writes has a production creation path | It fails on the commit before the 11 November merge and passes after |
| B19 | Decide | Free steps first with the owner present for one administrator prompt: the fresh-VM restore, the first-deploy checklist end to end, an off-site push and an alert with a planted failure. Then a one-day rented host | Each checklist gap has a result file from a real host |
| B20 | Build | Rerun the 12-user load drill on current main; a bulk generator to reach 250,000 stock movements; rerun on the rented host | A regression signal now; proof of the envelope only on the host |

### 3.6 Token budget (cuts across B03, B04)

The measured levers, in order of size: (1) slice-session windows, 66 % of tokens at about 306k per call: one phase per session, an earlier compaction setting, a smaller mandatory pre-read; (2) the fixed 70k per agent: fewer connectors and skills in agent sessions, fewer tiny fan-outs; (3) the root, 15 %. Measured later: content fetched by reading and searching is about 27 % of context tokens, and calls that only read or search re-read 43.6 % of them. Both are exposures for an index or for batching lookups, not savings (§6). A budget in subagent tokens per window before any launch, lanes two at a time, state on disk. Rerun the October forensics script on November to get per-slice figures. Lever (1) now has an exposure figure: 39.8 % of November's tokens were in calls whose context had passed 400k (26.8 points in slice sessions, 12.4 in the root). The testbed's own 400k compaction window was never in force. What switching it on would save is unmeasured (§9.4).

**A warning from the refuter.** Summed, the remedies above add a fresh reviewer per fix round, gate workflows, a final-head reviewer and several replays. Against a measured ceiling of two lanes at a time, adopting them all at once recreates the stops. They need one budget.

---

## 4. What needs research

**By reading: nothing.** The six lanes found documented remedies or documented absences for every item.

**By measurement here (the four trials and the open questions under them):**

1. Does the fix-round contract lower the rate of fix-induced defects? Replay on the recorded chains first.
2. Does a script-resolved claims file catch the recorded overstatements?
3. Does a second model family or a fresh reviewer catch the late P1s the first round missed?
4. Does a typed-verdict gate plus a local merge queue shrink the root without losing findings?
5. What does one check cost in memory at its peak? One number sizes the slots.
6. Per-slice tokens and limit events for November.

**Unknown and outside our control:** how cache reads count against plan limits; what a scheduled task may start in the desktop app; whether tree-style prompting adds anything on current reasoning models (no controlled study was found).

---

## 5. Tree, Forest and Graph of Thoughts

**What they are.** Tree of Thoughts has the model write several partial answers, score them and extend the promising ones. Forest of Thought runs several such trees and settles by consensus. Graph of Thoughts lets partial answers be merged and refined as nodes of a graph.

**What is established.** Tree of Thoughts: 4 % → 74 % on a number puzzle with GPT-4 in 2023, at several times the compute. Graph of Thoughts: measured on sorting. Forest of Thought: only its abstract could be read; it gives no number. At matched compute, plain sampling with a vote often equals or beats the elaborate structures, and debate can get worse as the budget grows (2024, math and question answering). No controlled study re-tests these on 2025–2026 reasoning models.

**The one form with coding evidence** is sampling several patches and choosing by executed tests: on SWE-bench Lite a vote alone resolved 25.7 %, adding a regression-test filter 27.0 %, adding a generated reproduction test 32.0 %, at 40 candidates per issue. The selector was the weak link: 94 of 213 generated tests were valid. No study measures several candidate fixes per review finding with regression as the outcome.

**Verdict for this harness.** Not as named methods, and not as a standing practice: they multiply calls against the usage limit and checks against the queue, and a model scoring model-written branches is the overstating problem again. The harness already uses the useful form at design time: independent proposals, judged and attacked. The untested place is the fix step. Because a live trial at this defect rate would be too small to show anything, **replay first**: at the frozen commits before each recorded fix-induced defect, generate three candidate fixes and see whether a frozen, pre-written test plus a guard-removal check rejects the candidate that made the defect. Run a live trial only if the replay shows the selector works. Keep the cheap half regardless: a frozen fail-before test and a scripted guard removal for a single fix.

**Do not build:** a tree, forest or graph layer in prompts; a tree-search agent with a model judge; a vote over reviewers' findings (keep the union: most real defects are found by one reviewer); debate loops; model aggregation for merging slices or documents; one full check per candidate.

---

## 6. Spatial and temporal topology in recall

**Terms.** Spatial: the neighbourhood of a thing, in the code (imports, callers, files changed together) and in the work (slices and their dependencies). Temporal: when a fact was true (valid from one commit until superseded) and when it was recorded.

**What is established.** A temporal knowledge graph for conversations cut context from 115k to 1.6k tokens with better accuracy, but against the *full* context, not against a flat indexed table; the benchmark is disputed, and a plain file-reading agent matched graph memory in one comparison. Deterministic code graphs give a measured localisation gain of about four points over strong agents at equal cost; history adds about five, but repositories under 10,000 commits lost 13 points, and the testbed has 432. Model-extracted graphs cost about a thousand times vector indexing and often underperform plain retrieval. Claude Code itself moved from indexes to search on demand. The testbed's own trials measured no gain or a loss (§2.4).

**Verdict.** Two small forms are worth having, both deterministic and both cheap:

- **Temporal, as a view.** Slice status, gate verdicts, open findings and decisions, each with the commit it became true at and the commit that superseded it, written only by tools from git and typed verdicts, never by a model reading prose. Start as generated files (the §3.4 fragments and board). A SQLite table with recursive queries is enough if a query ever needs more; the knowledge-store design already has the journal, the index and validity by code state, and lacks only these work-state tables.
- **Spatial, as a list.** For a fix: the changed functions, their callers and importers, the files that change with them, and the tests that touch them. A script, seconds to run, attached to the reviewer's brief. Its value is unproven: test it at zero tokens by asking whether the later defect's files fall inside the list for the ten recorded cases. Drop it if fewer than six do, or if the list exceeds about fifteen files.

**Where recall does not help:** reports passing through the root (an output contract and files cut those); the root reading diffs (moving the read to a reviewer cuts that); the fixed 70k per agent. What recall could touch inside the windows is measured below.

**What fills the windows, measured (added 2026-11-11 after the owner questioned this section; checked the same day by two refuters and an independent re-measurement).** The first version said recall cannot help slice-session windows. That was too strong: nobody had measured what fills them.

- **Content.** Of November's 4.33 billion context tokens, **about 27 to 28.5 % was content the sessions fetched by reading and searching** (26.9 % as first run; 28.5 % with a stricter shell classifier; 26.8 % if log reads are left out; an independent method with its own definitions gave 22.3 %, range 20.6 to 32.2). By group: 26.0 % of slice main sessions, 14.8 % of the root, 40.1 % of subagents. About 32 % was the model's own earlier output carried forward: thinking, commands and the code it wrote. About 29 % was the start of each window, re-read on every call: the system prompt, tool definitions and instructions, and after a compaction the summary. The rest is messages, test output and small items.
- **Carrying.** The fetched content entered the windows once as about 19 million tokens and was then processed about 950 million times, some 50 passes per token. The cost of a read is that it stays.
- **Steps.** 8,701 of the 15,921 calls (54.7 %) issued nothing but read or search tools, and those calls re-read 43.6 % of all context tokens (slice main sessions 42.4 %, subagents 70.9 %). Calls that only searched or listed re-read 5 % under a strict definition and 15 % under a loose one. So an index could save in two ways: less fetched content, and fewer lookup steps, each of which re-reads the whole window. **Both figures are exposures, not savings, and they overlap.**
- **Repeats.** Inside one window re-reading is small. 7.0 points are a file opened again, but nearly all of that is another part of the same file. Content genuinely seen earlier in the window is about 0.5 to 1.5 %, and identical repeat commands are zero. A cache of files already read in the session would save almost nothing.
- **Hot files.** Across windows the reads are concentrated: 72 paths (3.3 %) hold half the fetched tokens, the 30 most-read hold 22 to 29 % of them by method, and 294 paths read in five or more windows hold 73 %. No single file is above 0.6 % of all tokens. So the form that could pay is one that lasts across sessions and returns something shorter than the lines. Nothing has shown that a shorter digest can stand in for the lines.
- **Needed or not.** Unmeasured. 74 % of fetched tokens went to files the window did not edit. That is not proof of waste: callers, contracts and tests are read in order to change something else.
- **Reading style.** In slice main sessions range reads and search hits (8.8 + 4.9) outweigh whole-file reads (7.4). In subagents it reverses: whole files 16.8 against 14.5.
- **First test, zero tokens.** Replay the recorded windows: build an import-and-caller index at each window's start commit, count the lookup-only calls it would have answered, and check whether its list holds the files the window went on to edit. Decide from that whether an index earns a live trial. Co-change history is the weak half at 432 commits.

These are shares of context tokens, not of a bill: output tokens are left out, and how cache reads count against the plan's limits is unknown. They are estimates: context growth between calls, shared out by character count where several things arrived together, and weighted by later re-reads. The path key is the last two segments, and the first run counted some heredoc writes and `sed -i` as reads. The 66.4 % for slice sessions elsewhere in this compile is of cache-read tokens; of all context tokens slice main sessions are 66.0 %, and 75.3 % with their own subagents The 9,342 slice calls counted there include 15 zero-usage placeholder lines; 9,327 are real calls (`fill/window-fill-output.txt`, `fill/verify/check.txt`).

**A connection graph, built and tested (added 2026-11-12 after the owner asked whether a graph database with a cache on top would carry a lot in a small size; checked the same day by an edge-accuracy check, a refuter and two independent classifiers).**

- **Built.** A script with no model built a file-level graph of the FixFlow repo: 618 tracked files, 1,119 file-to-file code links (2,033 import edges by imported name, 55 test mocks) and 1,086 citations of files in docs. It is 197 KB as JSON, 32 KB compressed, and takes 0.2 s to build. Its import links matched an independent method exactly (441 of 441 Python pairs, 678 of 678 JS and TS pairs). Two doc citations point at the wrong file.
- **Size and store.** The graph is small because it stores connections, not contents. The same edges in a SQLite table take the same space and return the same answer in 0.05 ms a query; in memory it is 0.002 ms. At a hundred times a function-level graph of this repo (250,000 nodes) a full reverse walk takes 8 ms in memory and under 1 s in SQLite. A graph database, server or embedded, gains nothing at this size, and a server would add 1 to 2 GB of memory use.
- **Cache.** A cache over traversal has nothing to save: all 477 "what depends on this file" queries take about 1 ms together. Three other things about caching do matter. Graph output must be pulled as a tool result, never pushed into the system prompt or `CLAUDE.md`, where every commit would invalidate the cached start of every window. The graph must be built per worktree at query time, because agents work in five worktrees with uncommitted and untracked files. And the re-reading the transcripts show is across sessions (the same helper bodies read again by different sessions), which is the knowledge store's ground, not a graph's.
- **Tokens.** For one file the graph's answer (18 direct dependants, 30 in all, the names imported, the doc lines) is about 560 tokens. One search already lists the 18 direct dependants in about 200 tokens, so the graph compresses nothing. What it can save is steps: reaching every dependant by search takes a median of 3 rounds and 15 at the 90th percentile. The first comparison given to the owner, against reading all 18 files at about 70,000 tokens, was a read no session does.
- **Do sessions ask such questions?** In a fixed sample of 200 of the 8,303 tool calls in November's testbed sessions that contain a search command, two independent readers agreed closely (same class on 166, same verdict on a saved step on 195). 13 to 14 were connection questions (about 7 %). 28 to 29 looked up a definition and read its body in the same command. 88 to 90 wanted content. 50 to 60 were not searches at all (a grep filtering the output of a run). The index would have fully answered one, and neither reader judged a single call likely to save a step. Sessions already find and read in one batched command (151 of 200 chain two or more lookups). The connection questions that were asked concerned model fields, string codes and templates, which an import-and-caller graph does not hold.
- **Reach.** Most files have few dependants (median 2; 389 of 477 have 15 or fewer), but the files that change are the hubs: 42 % of code-file changes and 73 % of code commits touch a file whose reach is over 15. A raw list of everything downstream is too long for most real changes; it needs a depth limit and grouping.
- **What the idea adds that the plan lacks.** The connections that break silently are not imports. They are contracts across the three runtimes and in configuration: client calls to backend routes (a script matched 65 of 73 client URL literals to the 77 route decorators), settings keys (46), the migration chain (46 links), the slice contracts in the import linter, the outbox kinds and their handlers, and the invariants `CLAUDE.md` ties to named files. Neither a search for imports nor an import graph sees these, and a script can extract most of them. Their use would be in the check (what could this change break), not in saving tokens. That is unproven; it belongs with the touch-list test, which so far covers only imports, callers and co-change.
- **Verdict.** No graph database and no traversal cache. On this evidence a connection index would save few tokens in sessions like the testbed's. The part worth testing is a scripted contract map as an input to review, at zero tokens, on the recorded defect chains.

Limits: the graph is of FixFlow and the search sample is from the testbed, a different codebase. The 200 items were judged from the first 420 characters of each command and the two calls that followed, under an instruction to be strict. A share of 7 % from 200 has a range of about 4 to 11 %, and none in 200 puts the true rate of saved steps under about 1.5 % of search-bearing calls. Token figures are characters divided by four. Docs can be wrong, and a graph built from their claims inherits that. The index replay (§6 above) remains the proper test (`graph/`, `graph/verify/check.txt`).

**The first test was rejected and replaced (2026-11-12, later the same day). The verdict above is withdrawn.** The owner's objections: no real graph engine was tried; the graph was naive (file-level imports, no ranking, no hop tuning, no typed edges across runtimes); one query was scored; the search sample came from another project. A research round (six lanes, three verifiers, a critic; `graph2/research/`) confirmed them and measured on this repo:

- **The first test used the weakest query.** "Everything that depends on a file" tops out at a recall of 0.25 against the files that really changed together. Import neighbours in both directions reach 0.38 at 1 hop with 9 files, 0.72 at 2 hops with 45 and 0.87 at 3 hops with 90, while precision falls from 0.32 to 0.11 to 0.06. So hop count matters, and one global limit is the wrong control.
- **Ranking matters more than hop count.** In a list of ten, 2-hop traversal order gives a precision of 0.19, personalised PageRank 0.24, co-change 0.26 and the two combined 0.28 (the same directory, as a set, 0.22). With 45 test commits the top four are inside each other's intervals.
- **A typed graph answers what a flat list cannot.** For this repo it has about 2,500 symbols and 19 or more kinds of edge, and rebuilds in 5 s. A phone screen to the tables it ends up writing is 7 to 9 typed hops: a typed path returns 4 tables where an untyped search returns 254 nodes.
- **The engine does not change the answer.** Given the same facts and the same algorithm, a graph engine and a relational engine return the same result. The engine changes which algorithms are native, the effort to write a query, speed and size. In published comparisons relational engines tie or win at 1 to 2 hops and native graph engines win at 3 or more hops on large graphs; size depends on the system, not the family.
- **Outside results on graphs for coding agents are mixed.** Gains of a few points, often with more tokens; a raw 2-hop dump did worse than no graph; the search entry point mattered more than traversal; the largest 2026 study credits the embedding index, not the graph; one study on Claude Code cut tokens 17 to 39 % with success unchanged on two benchmarks and raised them on a third.

The replacement test is frozen in `graph2/protocol.md`: facts, algorithm, output form and engine varied separately; sealed tasks from this repo's history (140 commits, 65 to tune and 75 held out) and 50 questions answered by reading the code; hops swept 1 to 6 with budgets per edge kind; a search baseline; SQLite as the relational arm; an established graph engine once the owner chooses one to install. With 75 held-out commits a difference under about 0.09 in recall cannot be detected, so "inconclusive" is a likely outcome and will be reported as that.

**What "self-evolving" can honestly mean:** entries written at solve time with the files they depend on; invalidated by code change, never by age; a recurring lesson promoted into a deterministic check after review; hit and miss counts deciding what is kept. Not a repository that rewrites its own rules, and not any gain that has not been measured.

**Do not build:** a model-extracted knowledge graph; a graph database server on a memory-short PC (an embedded graph engine is under test, §6); embeddings; a memory layer that pushes context into sessions; time-based expiry. Before building any map or store, run the validation contract the testbed froze and never ran (A6-10): sealed references, equal budgets, blind scoring, and "fewer tokens with a missing prerequisite is not a win".

---

## 7. Cross-cutting mechanisms

| Mechanism | Answers |
| --- | --- |
| Power and restart chain: diagnose, restart Docker and databases at sign-in, off-machine copy, staggered resume list | B03, B05, B10, B11, B14 |
| Container gate, slots sized from a measured peak, one shared test database, teardown on merge | B06, B07, B08, B09, B15, B18 |
| Executed acceptance, model discovery: a finding closes only on a harness-run test with a positive control | B01, B12, B17, B21 |
| One slice-written, script-checked record: claims file, state fragment, heartbeat, reports on disk | B12, B13, B14, B16, B04 |
| Gate as a workflow with a typed verdict naming the head SHA and who read the final head | B01, B04, B16, B17 |
| Zero-seed journey, early deploy rehearsal, rent before buying | B02, B19, B20 |
| One always-on machine sampler | B05, B07, B08, B09 |
| Transcript forensics rerun, then one token budget | B03, B04 |
| A seal on every replay and a stub run of every new gate script before either is trusted (§9.3, mechanisms 1 and 5) | B01, B04, B12, B17 |

---

## 8. Limits of this compile

- The research lanes read pages through a summarising fetch; several claims rest on abstracts only (marked in `research.txt`). Claude Code facts come from its documentation and were not verified on this install.
- The sweep read the testbed's records, not its code. Unread: the per-slice task records and decision records except through the board; most of the October research deck; the vendored third-party tools; the Codex state files.
- The subagent write test ran in bypass mode. The clinic sessions' default mode needs its own 15-minute probe.
- The shutdown inference separates what the log shows from what it cannot: it cannot tell a mains cut from a thermal trip.
- Whether any token cut reduces limit stops depends on how cache reads are counted, which is unknown.
- Two Horthy ids the mappers cited as open trials (G4-F154, G4-F156) are recorded in PR #186 as refuted; they are not listed here as answers.
- The knowledge store's journal is mirrored only to the VPS by its own rule, and the VPS does not exist yet: a store built on it would have no off-machine copy.
- Rig-based remedies need an administrator prompt, so they cannot run while the owner is away.

---

## 9. How the Horthy and BAML ideas fit the bottlenecks

**Added on 2026-11-11 after the owner's check.** The first version of this file cited eleven idea ids and stopped. That left the two idea sweeps unprocessed. Both sweeps had scored every idea against the FixFlow ship plan's weaknesses, never against these 21 bottlenecks, so their verdicts could not simply be carried over. This section maps every idea the sweeps kept, re-screens every idea they dropped, and says what each adds to the first steps in §3.

**Method.** Three workflows, 19 agents, about 2.2M subagent tokens. Three Opus mappers placed the 78 Horthy ideas PR #186 kept, and one placed the 9 BAML items PR #184 kept. Five Sonnet readers screened the 783 Horthy families that PR dropped, and the BAML mapper screened its 85 dropped cards. Three Opus adjudicators then ruled on the 142 that were flagged (default: stays dropped). Two Opus refuters attacked the 51 claimed fits (default: no fit), one checked the 36 exclusions for misses, and one consolidated what survived. A last pass of three agents recomputed this section's numbers from the raw data, attacked §9.4, and confirmed the compaction setting in Claude Code's documentation. Its corrections are applied and its output is `fit/check.txt`. A script checked every id against the PR lists. The full lists are `evidence/harness-bottlenecks/fit/FIT-LIST.md` and `DROPPED-RESCREEN.md`.

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

**The two lists sharpen three bottlenecks, touch seven more, and reach nothing on the machine.** No idea replaces a first step in §3. Of the 30 that fit, 20 bear on fix rounds (B01), overstated reports (B12) or review (B17). There they turn the first steps from prose into scripts that can fail. Eleven bottlenecks get nothing: the first-use gap, power, the slow check path, the check queue, memory, the stall, restart, the off-machine copy, progress display, the Linux gate and the load test. A body of work about prompts, context and review does not reach a power cut or a database hop. **So the order of the first moves in §0 does not change.** The ideas enter at the gate and review work, after the machine is stable.

**Six things the lists add that §3 did not have at all:**

1. A seal on every replay, so a replay cannot pass by reading the later fix (mechanism 1 below).
2. A stub run of the new gate and merge scripts at zero tokens, before they are trusted (mechanism 5).
3. A stricter fail-before test: only an assertion failure counts, and a "pre-existing" claim is rerun at the base commit (mechanism 2).
4. A human reader on the record for high-risk merges (mechanism 10). It is the only idea that puts a person in B17.
5. A rule that an environment fact is checked by one command before it becomes a harness rule (mechanism 7). The bottleneck list itself carried five facts that §1 overturned.
6. A measurement of the compaction lever in §3.6, and the finding that the testbed had built that lever and never switched it on (§9.4).

**What the re-screen of the dropped ideas showed.** Of the 142 flagged (84 that PR #186 called already done, 40 it skipped, 18 BAML cards), the testbed had practised the mechanism in 71. It worked in 33 and failed in 38. Brief contracts with evidence tags, model re-checks of claims, vertical slices and state in the repository were all in use. Twenty-plus overstated reports and the last-day gaps happened anyway. Much of Horthy's advice, in its prose form, had already been tried here. That is the strongest support in the record for the script-first rule in §7: these ideas failed mostly as brief lines and model re-checks. A few had a script form and failed too, such as the verify tool's provenance check.

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

Twenty-nine of the 30 fitting ideas collapse into eleven artefacts. The thirtieth, G4-F084, is not taken now (§9.6). Six are scripts that spend no tokens. Order: scripts that guard the replays in §4 first, anything that adds agents or owner time last. Mechanisms 7 and 8 are free clauses and can go in at once.

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
| 9 | **Fix-round brief clauses** (B01) | G1-F170, G4-F081, G4-F088 | §3 has the two-round cap, revert, a fresh reviewer and the state-ending table. Adds what happens after round two, a failing condition as the price of blocking, and a line naming the authoritative source of any new stored state, which is the weaker half of §3.3's state-ending table | One agent per finding that fails twice, taken as §3's fresh reviewer, not an extra one | – | Under the seal, on the five late P1 fix commits: how many does the state-source line name? How many round-two findings state no failing condition? |
| 10 | **Owner read of marked hunks** (B17) | G4-F140 | The only idea that puts a human reader on the record. Bounded to hunks the reviewer marks, on high-risk merges, recorded against the merged head. A trial on three merges | Owner time at merge | Whether to give that time, and to let those merges wait | The merge record names the owner and the head read, against 5 of 6 unread. Log the owner wait against B03's idle hours |
| 11 | **Tool allow-list for gate subagents** (B04) | G1-F157 | §3.6 names connectors and skills, not tool definitions, which are 34k of the 70k fixed cost per agent. Keep Write for report folders | A config line, after an A/B | Adopting a restricted agent type | One context reading with and without the list; 20 runs with zero refused writes |

### 9.4 The compaction lever: built here, never switched on, now measured

The largest token lever in §3.6 includes "an earlier compaction setting". This pass found two things about it.

**The testbed had already chosen the number and never applied it.** Its context system, which was never installed, set the auto-compact window to 400,000 tokens (cards A5-01, A5-07, A8-12). The root's own compaction record notes that this lever was not in force (CR-05). The root compacted at 974k and 967k, and the largest slice call was 963k. On 7 November 2026 Horthy described the same figure as his own habit: he lets a session compact automatically at 400k and compacts by hand between 200k and 400k. PR #186 records that post as anecdotal, with no numbers, and files it as already done for FixFlow. So the number is the testbed's own. His post agrees with it and adds no evidence.

**What the November transcripts say it would touch.** Shares are of cache-read tokens, 4,253M in all.

| Session type | Share of November's tokens | In calls whose context had passed 400k | In calls of 200k to 400k |
| --- | --- | --- | --- |
| Slice sessions | 66.4 % | 26.8 % | 29.9 % |
| Root | 15.3 % | 12.4 % | 2.3 % |
| Subagents | 18.3 % | 0.6 % | 5.9 % |
| **All** | 100 % | **39.8 %** | 38.1 % |

Four in ten of November's tokens were in calls whose context had passed 400k. The context above 400k in those calls adds up to 608M tokens, which equals 14.3 % of the cache-read total. **This is an exposure figure, not a saving.** A compacted session falls far below the line, so later calls shrink by more than that. Each extra compaction also pays for a full-context summary call, a cache rewrite and re-reads of recent files. Nobody has measured either effect. Source: `fit/tally-buckets-output.txt`, same transcripts and counting as §2.3.

**What cuts against it, and what is unknown:**

- A 400,000 window triggers near 367k and can overshoot. It is a trigger, not a ceiling (A5-07).
- One vendor-reported benchmark scored a native-compact-first arm at 48.7 against 69.3 for full history (A5-09). It was three runs and is not reproducible here.
- No trial in the testbed compared thresholds. The planned arm was never run (A5-15). The one recall result, 15 of 15 planted facts kept through compaction, is from Codex sessions in an interrupted cohort (A5-13). Nothing tests Claude Code at an earlier window on real slice work.
- The setting exists. Claude Code documents `/autocompact <tokens>`, an `autoCompactWindow` settings key (100,000 to 1,000,000) and the same field per subagent (documentation fetched on 2026-11-11, in `fit/check.txt`). Whether a project setting reaches the desktop app's sessions was not traced (A5-07).
- Whether cache reads count against plan limits is unknown (§4), and the stops were power-offs. A token cut may not cut a single stop.

**Class: Trial, and a weak one.** First compute November's per-slice baseline (§4 item 6). Set the window for one wave. Confirm that it took effect: the compaction records should show about 367k. Charge the compaction calls to the trial's side. Check one compaction summary against the slice's task record for what it dropped. One wave against a different month cannot separate the setting from slice difficulty, so the result will be anecdotal.

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
- **The eleven ids the first version cited.** Seven hold: G2-F015, G4-F073, G4-F088, G4-F140, G2-F183, T-08, D-13. Two do not: G2-F104, and G4-F089, whose seven defect shapes are FixFlow's own; the testbed's list has to come from its own findings, which is §3.3's state-ending table. G4-F154 (already done in PR #186) and G4-F156 (skipped there) stay dropped after adjudication.
- **The 58 FixFlow-only ideas keep their standing.** This section changes no disposition in PR #186 or PR #184. It adds a second column: fit to the testbed's bottlenecks.
- **Three corrections to the record.** (a) The application check already fails on an added skip (A7-05, A8-10). The open defect "passes when every test is skipped" (A7-13) is in the workflow verify tool, not in the gate. (b) The four unread merges of 10 November followed the owner's instruction to wrap up and merge on the sessions' reports (A2-11). Part of "5 of 6 unread" was a decision, not an oversight. A script that refuses an unread head would have refused merges the owner had asked for, which is why mechanism 6 is an owner decision. (c) The October limit errors were all five-hour-window limits (CR-03).

### 9.7 Limits of this section

- The mapping, the attack and the adjudication are models reading two idea documents and this file. Nothing here was run against the testbed except the token tally. Every proof in §9.3 is a proposal.
- The screen of the 783 dropped Horthy families was one Sonnet pass. An idea it missed stays missed. The 36 exclusions were checked once.
- Mechanism 3 depends on transcripts surviving cleanup. The retention setting is unverified.
- Not yet named: the testbed's gate-config file set and its high-risk list. Whether the reviewer briefs for the seven known misses survive is unchecked. Flaky tests (A3-14) can fail a base rerun for the wrong reason, so mechanism 2 needs a rerun rule.
- Neither list offers a cheaper verifier to pay for the review it adds. The one-budget warning in §3.6 stands unchanged.
- §9.4 is the main session's own measurement. A refuter narrowed its first wording: the 400k figure was the testbed's, and the percentages are exposure, not savings (`fit/check.txt`).

---

## Appendix — evidence index

| File under `evidence/harness-bottlenecks/` | Contents |
| --- | --- |
| `bottlenecks.md` | The 21 bottlenecks verbatim, with ids, and the owner's questions |
| `machine-facts.md` | Event log, Docker, memory, app settings and the write probe, read by the main session |
| `sweep.json`, `sweep-cards.txt`, `sweep-index.txt`, `sweep-tables.txt`, `sweep-notes.txt`, `sweep-critic.txt` | The testbed sweep: 158 cards, data tables, what was not found and not read |
| `research.json`, `research.txt` | Six research lanes with sources marked fetched or snippet-only |
| `map.json`, `map-full.txt`, `verdicts.txt`, `refute.txt` | The four maps, the two verdicts, the refuter's 23 attacks |
| `tally.js.txt`, `tally-output.txt` | The November token tally and its output |
| `*.workflow.js.txt` | The three workflow scripts as run |
| `fit/FIT-LIST.md`, `fit/DROPPED-RESCREEN.md` | §9: every kept idea with its final fit; every re-screened dropped idea with its verdict |
| `fit/map.json`, `fit/map.txt`, `fit/review.json`, `fit/review.txt`, `fit/fit-final.json`, `fit/check.json`, `fit/check.txt` | §9: the mapping, the review, the final list and the last check, raw and rendered |
| `fit/in/`, `fit/in2/` | §9: the brief and the lane files the agents read, built from the two PRs by script |
| `fit/tally-buckets.js.txt`, `fit/tally-buckets-output.txt` | §9.4: November tokens by per-call context size |
| `fit/*.js.txt` | §9: the build, render and workflow scripts as run |
| `fill/window-fill-output.txt`, `fill/fill-result.json`, `fill/*.js.txt` | §6: what fills the session windows, by kind of content, and the scripts as run |
| `fill/verify/` | §6: the four checks of that measurement (method refuter, independent re-measurement, fidelity, claims refuter), their reports and scripts |
| `graph/build.js.txt`, `graph/query.js.txt`, `graph/graph.json`, `graph/answer.txt`, `graph/*-output.txt` | §6: the connection graph of the FixFlow repo, one answer, and the size and timing figures |
| `graph/extract.js.txt`, `graph/sample.json` | §6: the searches the November testbed sessions ran, and the fixed sample of 200 |
| `graph/verify/` | §6: the four checks (edge accuracy, claims refuter, two search classifiers), rendered in `check.txt`, with their reports and scripts |
| `graph2/protocol.md`, `graph2/brief.md` | §6: the frozen protocol of the replacement test, and the brief the research agents worked from |
| `graph2/research/` | §6: the research round (six lanes, three verifiers, a critic): `result.json` raw, `lane-*.txt`, `verify.txt` and `critic.txt` rendered, and the lanes' scripts and outputs |
| `manifest.sha256` | Digests of every file above |
