# Harness bottlenecks: what the testbed built, what is unsolved, what needs research (2026-11-11)

**Status: findings only.** Nothing here is adopted, installed or changed in either repository. This file and its evidence folder are **not committed**: they hold details of the clinic testbed (a repository with no remote, by the owner's choice) and of the owner's PC, so whether they go to GitHub is the owner's call. Raw outputs: `docs/program/evidence/harness-bottlenecks/` with a sha256 manifest.

**What was asked (owner, 2026-11-11).** The clinic testbed build ended with 21 unsolved bottlenecks (B01–B21, verbatim in `evidence/harness-bottlenecks/bottlenecks.md`). Do they need more research? Compile, without missing anything, what the testbed already did for speed, token efficiency, recall and parallel work, including "a SQLite graph-based library for a self-evolving repository". Would Tree, Forest or Graph of Thoughts help? Would spatial and temporal topology in recall from graphs save tokens? The ideas from Dex Horthy's work (PR #186) and BAML (PR #184) are already compiled and are cited here by id, not repeated.

**Method.** Three workflows and the main session's own checks, 23 agents, about 3.6M subagent tokens: a read-only sweep of the testbed (eight Sonnet readers and an Opus critic; 158 mechanism cards), six Sonnet research lanes with fetched sources, then four Opus mappers, two Opus verdicts and an Opus refuter (23 attacks; 4 reclassifications). The main session read this PC's event log, Docker state and app settings, and re-measured the November token use from the transcripts. Limits are in §8.

---

## 0. For the owner (one page)

**Do these need more research? Almost none of them.** Of the 21, none needs literature research. Seven are owner decisions, six are known engineering, four are diagnoses that a measurement on this PC settles, and four are trials: a remedy is plausible and nobody has measured it, here or anywhere. The reading is done; what is missing is measurement on our own record, which already holds the baselines.

**Five facts measured today change what to fix.**

| The list says | What the record shows |
| --- | --- |
| B05: two unclean shutdowns, memory suspected | **24 unexpected shutdowns since 7 October.** 23 wrote no crash code (power loss, hard hang or hard reset). 4 show the power button held; 5 happened around sleep. No hardware-error records. The only two out-of-memory events all month name photo-editing applications, on 1 November, near no shutdown. Windows does not power off when memory runs out. |
| B03: a usage limit halted everything on 6 November | **The PC powered off at 14:58:23 that day**, 31 seconds after the last commit. The root transcript's records stop in that hour and hold no limit message on 6 November (limit messages appear on 1 and 3 November only). Nothing restarts after a reboot: Docker's start-at-sign-in is off and every clinic container has restart policy "no". |
| B04: the one orchestrator is where the context goes | The root compacted **four** times (574k, 974k, 967k, 970k tokens). But it took **15 % of November's tokens. Slice sessions took 66 %**, at about 306k tokens of context on each of 9,342 calls. |
| B07: the second check slot opens with 8 GB free | 8 GiB was **never** free in about 980 samples on build days, so there was one slot. The 34-minute wait is real: 2,030 s on 9 November, when every session resumed at once. |
| B16: subagents cannot write files | They can. A background subagent wrote and read back a file here with no prompt. Read-only agent types, a tools list without Write, or an unanswered prompt in default mode cause the refusal. |

**What the testbed already built.** Its measured wins are in the check, not in memory: the parallel check went from 855 s to 284 s (3.0×), and the Linux container run is 230 s against 367 s on Windows (1.6×) but is not the gate. Every trial of context machinery came back null or worse: the context system used 6–17 % more tokens for the same recall, and the with-and-without trial showed identical results. **There is no SQLite graph library in the testbed**, on any branch. The closest things are in §2.6; the best match to that description is this repository's unbuilt knowledge-store design (PR #183).

**Tree, Forest, Graph of Thoughts: no, with one narrow exception worth a replay.** Their measured gains are on puzzles with a 2023 model; at equal compute plain sampling matches them. The one form with coding evidence is several candidate fixes chosen by an executed test. Nobody has shown it stops fixes creating defects. Test it first on the recorded defect chains, at near-zero cost (§5).

**Spatial and temporal recall: yes in two small deterministic forms, no as a graph.** "What is true now" for slices, verdicts and findings as a generated view, and "what does this fix touch" as a scripted list of callers and co-changed files. Not a model-extracted knowledge graph, not a graph server, not embeddings (§6).

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
| B17 | Executed proofs and drills ran at every gate. The real gaps: no human reads anything, and the final head often merged unread: 4 of 5 merges on 10 November, and the real-data switch on 11 November, whose first root check then failed 2 of 2,570 tests. | card A2-08; mapper M4 |
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

Already written in this repository and cited, not repeated: the ship plan's reviewer rule (head SHA, fail-before and pass-after per finding), Horthy adopts G2-F015, G4-F073, G2-F104 and trials G4-F089, G4-F088, G4-F140, G2-F183; BAML trials T-08 and D-13.

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

The measured levers, in order of size: (1) slice-session windows, 66 % of tokens at about 306k per call: one phase per session, an earlier compaction setting, a smaller mandatory pre-read; (2) the fixed 70k per agent: fewer connectors and skills in agent sessions, fewer tiny fan-outs; (3) the root, 15 %. A budget in subagent tokens per window before any launch, lanes two at a time, state on disk. Rerun the October forensics script on November to get per-slice figures.

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

**Where recall does not help:** reports passing through the root (an output contract and files cut those); the root reading diffs (moving the read to a reviewer cuts that); the fixed 70k per agent; slice-session windows, the largest sink.

**What "self-evolving" can honestly mean:** entries written at solve time with the files they depend on; invalidated by code change, never by age; a recurring lesson promoted into a deterministic check after review; hit and miss counts deciding what is kept. Not a repository that rewrites its own rules, and not any gain that has not been measured.

**Do not build:** a model-extracted knowledge graph; a graph database server on a memory-short PC; embeddings; a memory layer that pushes context into sessions; time-based expiry. Before building any map or store, run the validation contract the testbed froze and never ran (A6-10): sealed references, equal budgets, blind scoring, and "fewer tokens with a missing prerequisite is not a win".

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
| `manifest.sha256` | Digests of every file above |
