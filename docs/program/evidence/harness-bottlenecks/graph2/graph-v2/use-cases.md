# Graph v2, lane "real use cases": what agents on this repository actually look up (2026-11-13)

This lane answers one question before any graph design choice: which questions do agents working on this repository
actually ask, how many tokens does each kind cost today, and which of them a graph of relations could answer. The
result is a ranked list of competency questions. A competency question is the term from ontology engineering for a
question a knowledge model must be able to answer; Grüninger and Fox (1995) define a model's requirements as such
questions first and then evaluate the finished model by whether it answers them (section 9). Everything here was
measured from local session transcripts by scripts. No transcript content left the machine.

Strength of the evidence in this file: **medium for the program and document work** (1,343 transcripts, several weeks),
**weak to medium for product-code work** (109 transcripts, all from one day, 2026-11-13, 13 main sessions with code
edits). The question forms are assigned by rules; a manual check found the rules right on about 3 in 4 calls (section
2.4). Read every number as an order of magnitude with that error, not as a precise share.

## 1. Short answer

1. **Product-code work spends its lookup tokens on orientation, not on relations.** Of the tokens that lookup results
   occupy in later calls (242 million "carried" tokens, defined in 2.3), reading code to learn how a subsystem works
   and looking up definitions take 38 %; documents (the phase assignment, design notes, defect registers, invariants,
   runbooks) take 18 %; relational questions (who uses X, the other half of a contract, which tests cover X, what a
   change set changes, what changed recently, which table or setting) take 20 %; run outputs, logs, instructions and
   other non-graph reads take 24 %.
2. **The single most expensive moment is the start of a session.** In the 13 main product sessions, the lookups made
   before the first product-code edit fetched 47 % of all lookup tokens and caused 55 % of all carried lookup tokens
   (86 of 157 million). They read the same plan sections, design notes and defect-register entries again and again:
   the design notes were read in 46 product transcripts, the gate document's defect IDs in 40.
3. **Program and document work, kept apart, is dominated by documents.** Of 1,147 million carried tokens, 45 % are
   reads of what an earlier lane, round or agent produced, 16 % reads of plan and design document sections, 6 % reads
   of invariant and runbook text. Past-session transcripts (5 %) and web pages (4 %) follow. Code questions are small.
4. **Agents rarely fail to find things; they read too much and carry it too long.** Searches that returned nothing:
   0.4 % of product lookups, 0.5 % of program lookups. Re-reads of the same file range inside one window: 2.2 % and
   2.6 %. What is large is volume: orientation reads average about 5,000 tokens per call, and a result fetched at the
   start of a session is carried by 100 to 160 later calls.
5. **The agents batch.** 86 % of product lookups are shell commands, and 61 % of those chain two or more lookups
   (`grep ...; sed -n ...; cat ...`) in one call. A graph tool competes with that batched call, not with one grep.
6. **What v1 was tested on is a small use case.** v1's held-out target, "which other files did this commit change"
   (co-change), corresponds to the question "what changed here recently and why", which is 1.8 % of product carried
   tokens and 1.2 % of program carried tokens. The questions that cost most were never in its test.

## 2. Data and method

### 2.1 Sources

- Transcripts: every `.jsonl` under `C:/Users/User/.claude/projects/` in folders whose name contains `EMS-workshop1`
  (main checkout plus 17 worktree folders), including subagent transcripts: **1,452 transcripts, 28,229 model calls**.
- Repository file list from `git ls-files` (main checkout and `origin/main`) to resolve relative paths.
- Scripts (all local, Node 24): `parse.js`, `episodes.js`, `forms.js`, `qf.js`, `dump2.js`, `check.js` in
  `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/usecases/`;
  outputs in its `out/` folder (`qf.json` holds every table in this file).

### 2.2 Separating product-code work from program work

A transcript is **product work** if it edits product code, tests or product configuration at least as often as it
edits program documents and memory (28 transcripts: 13 main worktree sessions of the ship plan, 15 of their test-writer
subagents), or if it makes no such edits but at least 40 % of its lookup output, and over 20,000 characters, comes from
product files (81 transcripts, mostly the binding and self-check PR reviewers). Everything else is **program work**
(1,343 transcripts: design, research, measurement, page building). One main-checkout session of 2026-10-31 that made 10
product edits but 64 program and memory edits counts as program work.

| Class | Transcripts | Context tokens of all calls | Lookup calls | Episodes |
|---|---|---|---|---|
| Product work | 109 | 1,040 million | 3,124 | 1,069 |
| Program work | 1,343 | 4,018 million | 19,024 | 3,763 |

### 2.3 Episodes and token measures

- A **lookup call** is a Read, Grep or Glob tool call, a WebFetch or WebSearch, or a shell command whose purpose is to
  read, search, list or inspect history or state (`cat`, `sed -n`, `grep`, `rg`, `ls`, `find`, `git log/show/diff/blame`,
  `gh pr view`, ...). Shell commands that write files (`cat >`, `sed -i`, redirections), poll in a loop, or run tests,
  builds or scripts are not lookups.
- A **lookup episode** is a maximal run of consecutive model calls that issue only lookup calls; it ends at the first
  call that edits, runs, delegates or answers. Product episodes: median 1 lookup call, 90th percentile 7. Program
  episodes: median 3, 90th percentile 11.
- **Fetched tokens**: characters of the tool result divided by 2.42. That ratio was measured, not assumed: across 4,938
  pairs of consecutive calls whose results exceeded 8,000 characters, the growth in context tokens (minus the previous
  call's output) per character of result had median 2.42 characters per token (quartiles 2.24 and 2.58; Read 2.47,
  Bash 2.42, Grep 2.08). It includes whatever small overhead the harness adds with each result.
- **Carried tokens**: fetched tokens multiplied by the number of later model calls in the same window (until the
  transcript ends or the context is compacted). This is what the result costs in re-reads. It is the ranking measure.
- **Lookup-step context**: the full context size of each call that issued only lookups, split equally over its lookup
  calls. It is what the step itself costs. It overlaps carried tokens (a step's context contains earlier results), so
  the two are never added.
- **Waste markers**: search returned nothing; tool error; the same file and range read again in the same window; the
  same search repeated in the same window; the same read repeated in a different transcript (exact command match, so an
  undercount); and "never named again", meaning the file's name never appears in a later model text or tool input in
  the transcript. The last is a weak proxy: only 9 % of model calls carry visible text, so a file can be used without
  being named.

### 2.4 Question forms and their accuracy

Each lookup call is assigned one question form by rules on the tool, the target path's zone (code, test, schema,
configuration, product document, invariants file, program document, program evidence, scratch, transcripts, web,
third-party source) and the search pattern (definition patterns, route and client patterns, setting names, item IDs,
`file:line` citations, line ranges). A shell call that chains several lookups gets the form of its most specific part.
To learn the forms, 45 cost-weighted product episodes and 28 program episodes were read in full (`out/dump-prod.txt`,
`out/dump-prog.txt`). To check the rules, uniform random samples were read call by call: **product 31 to 32 of 40
right, program 22 to 24 of 30 right**. The errors fall between neighbouring document forms (a program document read
labelled as a rule, an ID search labelled as a plan read) and between "operations output" and a lookup; no error moved a
call between code forms and document forms. The program-side "earlier lane's findings" form is the noisiest: it also
absorbs reads of the agent's own scratch files.

## 3. Product-code work

### 3.1 Question forms ranked by carried tokens

Columns: calls; episodes; transcripts; fetched tokens (thousands); carried tokens (millions) and share of the 242
million; lookup-step context (millions); mean fetched tokens per call; share of reads never named again (weak proxy).

| Question form (plain words) | Calls | Episodes | Transcripts | Fetched k | Carried M (share) | Step ctx M | Mean/call | Never named |
|---|---|---|---|---|---|---|---|---|
| How does this subsystem work now (orientation read of whole files or ranges of 150+ lines) | 173 | 81 | 53 | 877 | 50.0 (20.7 %) | 15.4 | 5,069 | 55 % |
| Where is X defined and what does its body say | 619 | 303 | 76 | 789 | 37.7 (15.6 %) | 88.1 | 1,274 | 42 % |
| (not a graph question) run output, logs, CI and git state, PR text | 512 | 354 | 59 | 430 | 22.9 (9.5 %) | 98.8 | 841 | 31 % |
| Which rule in the invariants, handoff or runbook text applies here | 277 | 127 | 56 | 714 | 21.0 (8.7 %) | 32.8 | 2,579 | 39 % |
| What is my assignment and what did the plan, design notes and defect register decide | 245 | 139 | 51 | 407 | 20.4 (8.4 %) | 37.2 | 1,661 | 48 % |
| What do the build, CI, ops or lab scripts do | 264 | 182 | 53 | 337 | 17.7 (7.3 %) | 44.1 | 1,277 | 24 % |
| What does this change set (diff, commit, PR) change | 165 | 87 | 33 | 431 | 17.6 (7.3 %) | 26.2 | 2,611 | 38 % |
| Which tests and fixtures exercise X, and how are they set up | 154 | 122 | 32 | 250 | 11.3 (4.7 %) | 28.7 | 1,625 | 18 % |
| Who uses, calls or references X (impact of a change) | 210 | 126 | 64 | 275 | 10.2 (4.2 %) | 27.3 | 1,310 | 60 % |
| (not a graph question) what do my skill and agent instruction files say | 72 | 38 | 22 | 231 | 10.0 (4.1 %) | 6.3 | 3,211 | 44 % |
| (not a graph question) what happened in a past session | 13 | 11 | 8 | 85 | 5.5 (2.3 %) | 1.6 | 6,510 | 69 % |
| Which files exist here, where is the file for X | 59 | 47 | 28 | 82 | 4.6 (1.9 %) | 7.3 | 1,387 | 49 % |
| What changed here recently and why | 151 | 110 | 38 | 195 | 4.3 (1.8 %) | 22.4 | 1,291 | 43 % |
| Where is the other half of a contract (route and client, payload, key) | 58 | 49 | 23 | 44 | 2.4 (1.0 %) | 10.6 | 762 | 39 % |
| What data model, migration or setting is behind X | 61 | 50 | 29 | 66 | 2.1 (0.9 %) | 9.9 | 1,086 | 52 % |
| What did an earlier agent or review conclude | 8 | 8 | 7 | 22 | 0.9 | 1.9 | 2,717 | 75 % |
| Where is item ID X defined or cited | 18 | 14 | 13 | 33 | 0.8 | 1.9 | 1,835 | 55 % |
| What sections does this document have | 9 | 8 | 8 | 14 | 0.7 | 0.8 | 1,532 | 33 % |
| (not a graph question) web pages; third-party library source | 48 | 23 | 15 | 61 | 1.4 | 5.6 | | |
| Does this file:line citation still say what the document claims | 8 | 5 | 5 | 8 | 0.2 | 1.0 | 1,016 | 88 % |

Totals: 3,124 lookup calls; 5.35 million fetched tokens; 242 million carried tokens (23 % of all 1,040 million context
tokens of product work); 468 million tokens of lookup-step context (45 %, overlapping).

### 3.2 The session start is where the tokens go

Per main product session (worktree folder, lookups made before the first product-code edit, fetched tokens before,
carried tokens before, then the same for the whole session):

| Session | Lookups before | Fetched before | Carried before | Fetched all | Carried all |
|---|---|---|---|---|---|
| brave-euclid | 42 | 68k | 8.4M | 119k | 10.1M |
| compassionate-wu | 21 | 76k | 7.9M | 107k | 8.8M |
| l2-android-compile-gate | 5 | 14k | 2.3M | 65k | 5.3M |
| l3a-device-lab | 25 | 46k | 7.5M | 166k | 17.9M |
| magical-lederberg | 18 | 56k | 6.5M | 212k | 22.6M |
| p1-backend-boot-gate | 19 | 54k | 6.6M | 65k | 7.1M |
| p12a-web-payment-idempotency | 0 | 0 | 0 | 96k | 9.8M |
| p2a-mobile-engine-honesty | 25 | 94k | 10.1M | 172k | 14.8M |
| p6a-attendance-truth | 20 | 58k | 6.3M | 103k | 9.2M |
| p7a-authz-money-guards | 30 | 86k | 12.0M | 154k | 17.0M |
| p90a-week-export-script | 13 | 50k | 6.8M | 138k | 13.0M |
| pensive-vaughan | 32 | 126k | 3.9M | 199k | 7.6M |
| silly-kowalevski | 31 | 109k | 7.8M | 197k | 14.1M |
| **Sum** | | **837k** | **86.1M** | **1,793k** | **157.3M** |

The pattern, read in the episodes: the session first reads the plan's section 0 and its phase section, then the
register and appendix ranges, then the design note for its area in full, then greps the gate document for its list
of defect IDs (for example eleven IDs in one regular expression), then reads the subsystem's code file by file with
`cat -n`. Across product transcripts, by command text:

| Repeated orientation read | Calls | Transcripts | Fetched | Carried |
|---|---|---|---|---|
| Design notes of the second wave (one per area) | 106 | 46 | 293k | 15.3M |
| Gate document defect IDs | 83 | 40 | 148k | 7.8M |
| Open-work handoff document | 53 | 22 | 127k | 3.2M |
| Plan section 0 (one fixed line range) | 15 | 15 | 55k | 6.1M |
| Invariants file (CLAUDE.md) | 50 | 22 | 56k | 1.2M |
| Plan register and appendix range | 8 | 8 | 43k | 5.8M |

### 3.3 Did the agent find it, and how much did it over-read

- Empty searches: 13 of 3,124 lookups (0.4 %). Tool errors: about 25 (0.8 %), mostly in operations commands.
- Same file and range re-read in the same window: 69 (2.2 %); 20 of them were definition lookups, 17 phase-document
  reads.
- Reads never named again (weak proxy): 55 % of orientation reads, 42 % of definition reads, 60 % of usage searches.
- The over-read is structural: an orientation call returns about 5,000 tokens because it prints whole files, and the
  later edit touches a few functions. The transcripts cannot say exactly which lines were used, so the size of that gap
  is not measured here; it is the first thing the tuning test below must measure.

### 3.4 Real examples, reduced to their form

- How does it work: "print queue, sync and punch modules of the attendance feature in full"; "print the outbox and its
  sync module, the classification module and the API client"; reviewers "print the new gate module and its constants".
- Definition: "list every function and error raise in the jobs service, then print lines 726 to 1520"; "show the
  function that maps a completion, with 22 lines after"; "find each queue's size cap constant".
- Phase: "print plan lines 24 to 115 and 1557 to 1793; grep the gate document for these eleven defect IDs; print the
  design notes for areas 5, 6 and 7".
- Rule: "print sections of the open-work handoff by line range"; "grep the self-host runbook for schema statements";
  "print the invariants file's lines for the outbox rules".
- Change set: "diff base..head for the backend and the retired-settings test"; "show a file as of a commit".
- Uses: "where is the 'current status' message string used across both clients"; "every call of the enqueue function
  outside tests"; "every storage key literal in the mobile app".
- Contract: "which response model does the jobs router declare, and which web provider function consumes it"; "which
  API paths does the phone call for media upload, and what fields does it send".
- Tests: "how do existing integration tests set up an unassigned carry-in job and post a payment".
- Build and lab: "which UI texts and navigation targets do the screens have" (to script the device lab), "what the
  compile-gate script does".

## 4. Program and document work (kept apart)

| Question form | Calls | Episodes | Transcripts | Fetched k | Carried M (share of 1,147) | Mean/call | Cross-session duplicate reads (tokens) |
|---|---|---|---|---|---|---|---|
| What did an earlier lane, round or agent find (evidence, notes, outputs; noisiest label) | 6,332 | 2,210 | 906 | 20,683 | 521.3 (45 %) | 3,266 | 1,282 (7.2M) |
| What does section Y of plan or design document X say | 1,802 | 884 | 687 | 8,597 | 181.7 (16 %) | 4,771 | 601 (4.8M) |
| Which rule in invariants, handoff, runbook or other product documents applies | 1,143 | 640 | 444 | 3,136 | 72.0 (6 %) | 2,744 | 23 |
| (not graph) what happened in a past session (transcripts) | 322 | 182 | 142 | 1,896 | 57.0 (5 %) | 5,887 | |
| (not graph) web pages and literature | 3,944 | 255 | 178 | 3,482 | 48.6 (4 %) | 883 | |
| How does this code work (orientation) | 304 | 161 | 132 | 1,777 | 45.4 (4 %) | 5,844 | |
| Where is X defined | 951 | 572 | 357 | 1,674 | 37.5 (3 %) | 1,760 | |
| (not graph) skill and agent instruction files | 321 | 180 | 108 | 864 | 28.5 | 2,691 | |
| Which files exist | 502 | 397 | 261 | 674 | 27.9 | 1,343 | |
| Build, CI, scripts | 540 | 397 | 320 | 1,190 | 21.0 | 2,204 | |
| (not graph) run output, state | 439 | 346 | 183 | 505 | 17.3 | 1,150 | |
| Change set | 306 | 191 | 97 | 490 | 14.9 | 1,603 | |
| What changed recently and why | 460 | 317 | 192 | 505 | 13.3 | 1,097 | |
| (not graph) memory notes, artifacts | 118 | 75 | 31 | 199 | 13.0 | 1,684 | |
| Who uses X | 437 | 264 | 187 | 442 | 9.2 | 1,011 | |
| Where is item ID X defined or cited, and what does it say | 454 | 336 | 308 | 689 | 9.2 | 1,517 | |
| Tests | 102 | 87 | 63 | 250 | 8.9 | 2,454 | |
| (not graph) third-party library source | 146 | 51 | 38 | 267 | 6.5 | 1,832 | |
| What sections does this document have (heading map) | 133 | 114 | 106 | 191 | 6.3 | 1,438 | |
| Contract | 99 | 81 | 51 | 95 | 2.9 | 963 | |
| Does this file:line citation still hold | 67 | 53 | 43 | 119 | 2.6 | 1,771 | |
| Data model, setting | 102 | 92 | 82 | 140 | 2.3 | 1,373 | |

Totals: 19,024 lookup calls; 47.9 million fetched tokens; 1,147 million carried (29 % of 4,018 million context tokens);
1,893 million lookup-step context (47 %, overlapping). Waste: empty searches about 0.5 %; same-window re-reads about
2.6 %; exact cross-session duplicate reads of evidence and design sections: about 12 million fetched tokens, a quarter
of all program fetched tokens (an undercount, exact command text only).

Examples, reduced: "read the knowledge-store design in five chunks of 9 to 18 thousand tokens"; "grep the bottleneck
compile for nine bottleneck IDs and print each card's block"; "print the glossary and part 4 of the compiled text";
"read the past session transcript file (15 to 26 thousand tokens per read)"; "print lines 151, 154, 158 ... of the
invariants file and the cited lines of five source files to check a document's citations".

## 5. Competency questions, ranked by what they cost today

Ranking key: carried tokens, product plus program (product first where the graph is meant for code). "Graph?" says
whether a graph of relations answers the question, only locates the text to read, or does not help.

| # | Competency question (form) | Product: calls / carried | Program: calls / carried | Graph? |
|---|---|---|---|---|
| CQ1 | What did an earlier lane, round, agent or review conclude about X, and does it still hold? | 8 / 0.9M | 6,332 / 521M (noisy) | Yes, as a conclusion layer: claim nodes with evidence, source, date and validity; the graph decides only "still holds" |
| CQ2 | What does the plan or design say about my assignment: which phase, which findings, which decisions? | 245 / 20.4M | 1,802 / 182M | Yes for the structure (phase, finding ID, decision, section, supersedes); the text is still read, but only the cited sections |
| CQ3 | How does subsystem S work now: which files, entry points, state and flows make it up? | 173 / 50.0M | 304 / 45.4M | Partly: the graph gives the map and the exact spans; understanding still needs the bodies |
| CQ4 | Which rule (invariant, open defect, runbook step) constrains the code I am changing, and why? | 277 / 21.0M | 1,143 / 72.0M | Yes: rule nodes with `constrains` edges to symbols, tables, settings, routes |
| CQ5 | Where is X defined, with what signature, and what does its body say? | 619 / 37.7M | 951 / 37.5M | Symbol index, not a graph: name to span is a lookup table |
| CQ6 | What does this change set change, and what outside it depends on what it changed? | 165 / 17.6M | 306 / 14.9M | The diff text no; "changed symbols with users or clients outside the diff" yes, on two versions |
| CQ7 | Which tests and fixtures exercise X, and how are similar tests set up? | 154 / 11.3M | 102 / 8.9M | Yes: test to symbol and test to route edges, fixtures |
| CQ8 | Who uses, calls or references X, including by string literal; what breaks if it changes? | 210 / 10.2M | 437 / 9.2M | Yes: the core graph question (reverse reachability) |
| CQ9 | Where is item ID X (finding, ruling, card, limitation) defined and where is it cited? | 18 / 0.8M | 454 / 9.2M | Yes: ID entity nodes with `defines` and `cites` |
| CQ10 | What changed here recently and why (commits, PRs, rulings)? | 151 / 4.3M | 460 / 13.3M | Yes, temporal: commit and PR nodes, `touches` at symbol level |
| CQ11 | Which files exist here; where is the file for X? | 59 / 4.6M | 502 / 27.9M | File tree index; a graph adds nothing |
| CQ12 | What sections does document X have? | 9 / 0.7M | 133 / 6.3M | Document outline index; trivially a tree |
| CQ13 | Where is the other half of a contract: route and client call, payload schema and client type, outbox kind and handler, storage key and reader? | 58 / 2.4M | 99 / 2.9M | Yes: cross-runtime edges (v1 already has route-to-URL links) |
| CQ14 | Does this file:line citation in a document still say what the document claims? | 8 / 0.2M | 67 / 2.6M | Yes: citation edges carrying the cited span's hash at citing time |
| CQ15 | What table, migration or setting is behind X? | 61 / 2.1M | 102 / 2.3M | Yes: table and setting nodes, reads and writes edges |
| CQ16 | What do the build, CI, ops and lab scripts do and invoke? | 264 / 17.7M | 540 / 21.0M | Mostly reading; a small graph of CI job to script to test command helps locate |

What each needs (nodes, relations, properties), in the order of the table:

- **CQ1 conclusions**: nodes `claim` (text, author agent, date, strength), `evidence` (file, line span, content hash),
  `source`; edges `supports`, `refutes`, `supersedes`, `rests_on` (to code spans, document sections, commits). Property:
  validity (holds, stale, refuted) computed from the hashes of what it rests on. This is the knowledge-store design's
  entry plus the dependency record the cache replay (K0) already showed gives zero stale answers.
- **CQ2 plan structure**: nodes `phase`, `finding` (register ID), `decision` or ruling (date), `document section`
  (heading path, line span, hash); edges `phase_covers_finding`, `finding_described_in_section`,
  `finding_anchored_at` (code span), `decision_supersedes`. Time: valid-from and valid-to per decision.
- **CQ3 subsystem map**: nodes `slice` (feature folder per runtime), `file`, `symbol` (kind, signature, first doc line,
  span), `entry point` (route, screen, scheduler job, background task), `queue` and `storage key`; edges `contains`,
  `defines`, `imports`, `calls`, `reads_key`, `writes_key`, `enqueues`. Output is a card plus spans, not files.
- **CQ4 rules**: nodes `rule` (invariants-file item, handoff defect, runbook step: id, text span, hash, rationale);
  edges `constrains` (to symbol, table, setting, route, outbox kind), `justified_by` (to defect, PR, incident).
- **CQ5 definitions**: a name index with aliases, kind, file, span, signature. A graph is not needed.
- **CQ6 change sets**: two snapshots or a version property on nodes and edges; a symbol-level diff; then CQ8 and CQ13
  over the changed symbols.
- **CQ7 tests**: nodes `test`, `fixture`, `seed`; edges `test_calls` (symbol), `test_requests` (route), `uses_fixture`.
- **CQ8 uses**: `calls`, `imports`, `references`, and **string-literal references** (status texts that clients match by
  regular expression, storage keys, setting names, outbox kinds), which import and call graphs miss.
- **CQ9 IDs**: nodes for every ID pattern in program documents, `defined_in` and `cited_in` section edges.
- **CQ10 history**: `commit`, `PR`, `ruling` nodes; `touches` edges to symbols; date.
- **CQ13 contracts**: route nodes with method and path; client call sites resolved to routes; schema-to-type links.
- **CQ14 citations**: `cites` edges from a document section to a code span, with the span's hash when cited.
- **CQ15 data**: table, column, migration and setting nodes; `reads`, `writes`, `migrates`, `reads_setting`.

## 6. What is not a graph question

- **Reading for understanding.** Once the right span is known, understanding it means reading it. A graph narrows what
  is read (CQ3, CQ2) but does not replace the reading. The orientation reads are the largest product cost, and the part
  a graph can remove is the over-read around the needed spans, not the needed spans.
- **Operations output**: test and gate logs, background job output, CI status, `git status`, PR bodies being drafted,
  lab device dumps. Product: 512 calls, 22.9 million carried tokens and the largest lookup-step context (98.8 million),
  because these are many small polling steps. The lever there is fewer steps and shorter output, not retrieval.
- **Following instructions**: skill and agent instruction files (product 10.0 million, program 28.5 million carried).
  These are prompt content the agent is told to read.
- **Checking a number or a string** in a known place (`grep -c`, `wc -l`, one line by number).
- **Past-session transcripts** (program 57 million carried): measurement work on raw logs.
- **Web pages and third-party library source** (program 48.6 and 6.5 million): outside the repository.
- **Definitions (CQ5)** and **file location (CQ11)**: answered by an index; calling it a graph adds nothing.

## 7. What the earlier rounds got wrong or skipped in this lane

1. **The "about 7 % of searches are connection questions" figure was from the other codebase** (200 sampled searches
   of the clinic testbed, `HARNESS-BOTTLENECKS-2026-11.md` §6), and the widen round already flagged it. In this
   repository's product work, the relational forms (CQ6, CQ7, CQ8, CQ10, CQ13, CQ15) are 799 of 3,124 lookup calls
   (26 %) and 47.9 million of 242 million carried tokens (20 %). Not rare, not dominant.
2. **The unit of analysis missed most lookups.** The earlier count of 366 search-then-read pairs (`widen/feasibility/
   NOTES.md` §4) counted only Read tool calls as reads. 86 % of product lookups are shell commands, and 61 % of those
   chain several lookups. A pair-based replay set (the planned D3 and R sets) under-represents orientation, documents
   and batched reads.
3. **v1's test target is a minor use case.** Co-change recall corresponds to CQ10, 1.8 % of product carried tokens.
   The forms that cost most (CQ1 to CQ4) were never scored, so v1's "tied a changed-together list" says little about
   the graph's value for the questions actually asked.
4. **Nobody measured the session start.** 55 % of carried product lookup tokens come from lookups before the first
   code edit, and they repeat across sessions. This is the clearest case for the owner's caching idea: the same
   sections are read by up to 46 sessions.
5. **"Is this document still true" was designed for but not measured as a question.** As an explicit lookup it is rare
   (75 calls, CQ14). Agents mostly trust a document and act on it, which is the failure the library pathways work
   calls "nothing fails, so no lookup starts". A graph that only answers when asked will not catch it; the check must
   be pushed at edit time (CQ4 as a warning, as `widen/architecture.md` proposes).
6. **String-literal relations were missing from the question list.** Usage searches in the episodes often look for a
   message text, a storage key or a setting name, not a function. The invariants file itself records three clients
   matching a server message by regular expression. An import and call graph does not hold these edges.
7. **Documents carry their own IDs.** Program agents grep for finding, card and ruling IDs 454 times (CQ9). The first
   round's schema work treated documents as text with citations to code, not as entities with identities.

## 8. Recommendations from this lane (for the design lanes to accept or refute)

Each item says what to build, which theory it comes from, what it replaces in v1, what to expect, how to show on
tuning data that it does not help, and what it needs installed.

**R1. Make the competency questions above the test set and the schema's requirement list.**
- Theory: competency-question-driven ontology design (Grüninger and Fox 1995, section 9): requirements first as
  questions, then formal terms, then evaluation by whether the model answers them.
- Replaces: v1's co-change recall target and its 60 hand-chosen configurations scored on it.
- Build: from the transcripts, instances of each CQ with the seed the agent had (its words or the identifier it
  searched) and the spans it went on to use (edited, cited in its answer, or quoted in its next text). Weight the test
  by the carried-token shares in sections 3 and 4.
- Expected: the design lanes' choices get scored on the questions that cost tokens.
- Falsifier on tuning data: if, for CQ1 to CQ4, the spans an agent later used cannot be identified from the transcript
  for at least half of the instances, the instance set cannot score those forms and they must be scored by an agent
  run instead.
- Installs: none (local scripts).

**R2. A document and conclusion layer before more code edges.**
- What: entities for phases, finding and ruling IDs, document sections (with line spans and hashes), rules and claims;
  edges `covers`, `defines`, `cites`, `constrains`, `supersedes`, `rests_on`; validity from the hashes of what each rests
  on (CQ1, CQ2, CQ4, CQ9, CQ12, CQ14).
- Theory: entity-and-relation knowledge graph with temporal validity (the widen round's temporal lane) plus dependency
  tracking for cached answers (K0, measured: 0 stale answers on 29,097 replayed lookups).
- Replaces in v1: document citations as plain edges from a document to code.
- Expected: these forms are 18 % of product and about 70 % of program carried tokens (program share includes the noisy
  CQ1). The saving comes from reading the cited section instead of the whole design note and from not re-deriving a
  conclusion whose inputs have not changed.
- Falsifier: on the tuning sessions, take the phase-start reads (section 3.2). If the sections the session later cited
  or acted on make up more than about half of what it read, a section-level answer saves less than half of 86 million
  carried tokens over 13 sessions, and the layer is a convenience, not a lever.
- Installs: none required beyond what v1 uses (SQLite or an in-memory graph); a graph database is not needed at this
  size (thousands of nodes).

**R3. A phase or slice card, selected from the graph under a token budget, served at session start.**
- What: for a phase or slice, the phase's findings and decisions with their sections (R2), the slice's entry points,
  queues, keys, routes, tables and settings, the rules that constrain them, and the spans of the functions the findings
  anchor to (CQ2, CQ3, CQ4), cut to a fixed budget.
- Theory: budgeted subgraph selection (covered by the selection lane of this round); the card is what the
  `widen/architecture.md` "slice cards, pulled" proposal describes.
- Replaces in v1: nothing; v1 answers only after a seed is given.
- Expected: it acts on the largest measured product cost (pre-edit lookups, 837 thousand fetched and 86 million carried
  tokens in 13 sessions). The upper bound is that cost; the realistic saving is what the card makes unnecessary.
- Falsifier: on the tuning sessions, if the card at the chosen budget does not contain the files and sections the
  session went on to edit or cite in at least, say, 70 % of sessions (threshold to be fixed before the run), or if
  sessions given the card in an agent run still read the same documents, it does not help.
- Installs: none.

**R4. Add string-literal and key edges to the code layer (CQ8, CQ13).**
- What: edges from code to the literal values it compares, stores or sends (message texts, storage keys, setting
  names, outbox kinds, route paths), resolved across runtimes.
- Replaces: nothing in v1; extends its 37 edge kinds.
- Expected: usage searches that today grep for a string across both clients become one lookup. Small in tokens (CQ8 is
  4.2 % of product carried tokens) but these are the relations that "break with changes", which is what the owner
  asked the graph to hold.
- Falsifier: on the recorded usage searches (210 product calls), if fewer than a third target a literal rather than a
  symbol, this is not worth an edge kind.
- Installs: none (parsers v1 already uses).

**R5. Return spans, batched, in one call.** Not a graph design choice but a constraint on any graph tool: because 61 %
of shell lookups already chain several reads, a tool answer that names files and then needs further reads adds steps.
Each answer should carry the exact spans (with line numbers) for up to a budget, as one result.

## 9. Literature used in this lane, and what could not be opened

- Grüninger, M. and Fox, M.S. (1995). "Methodology for the Design and Evaluation of Ontologies", IJCAI-95 Workshop on
  Basic Ontological Issues in Knowledge Sharing, Montreal. Opened only through the authors' laboratory page
  (https://eil.mie.utoronto.ca/theory/enterprise-modelling/entmethod), which lists the steps: informal competency
  questions, terminology in first-order logic, formal competency questions, axioms. The paper itself and the 1995
  chapter "The Role of Competency Questions in Enterprise Engineering" (Springer) could not be opened (redirect to
  login). Strength for this use: the method is a design discipline, not a measured effect; nothing here depends on an
  effect size from it.
- Sillito, J., Murphy, G.C. and De Volder, K. (2008). "Asking and Answering Questions during a Programming Change
  Task", IEEE Transactions on Software Engineering 34(4), DOI 10.1109/TSE.2008.26; conference version FSE 2006. Only
  bibliographic records could be read: a catalogue of 44 kinds of questions in four categories, two of which are named
  "finding a focus point" and "expanding a focus point", from two qualitative studies of newcomers and industrial
  programmers. The full text (category list, question list, tool findings) could not be opened, so it is not compared
  with the forms here. It is the human counterpart of this lane's list and should be compared when it can be read.
- Ko, A.J. et al. (2007), information needs of developers: the PDF downloaded but its text is compressed and could not
  be read without a PDF tool on this machine. Not used.

## 10. Scale

- This repository: about 480 code files, 5,400 graph nodes, 230 commits; 109 product-work transcripts from one day.
  At this size every question above is answerable by an in-memory index in milliseconds; the cost is tokens in the
  agent's window, not query time.
- At 10 times the code, orientation reads grow (more files per subsystem) and so does the value of a card and of span
  answers; at 100 times, the session start could not read a subsystem at all, and the map would be required rather
  than helpful. The document layer scales with the number of plans and findings, not code size; here it already has
  about 200 program documents and about 1.4 million tokens of them.
- The product sample is the weakest part: 13 main sessions, one plan, one day. The mix of forms may differ for bug
  fixing or feature work without a written plan. Re-run `qf.js` when more product sessions exist.

## 11. What could not be measured

- Which lines of a read the agent actually used. The transcripts record what was read, not what was attended to, and
  only 9 % of model calls carry visible text. "Never named again" is a weak proxy; the tuning test must establish use
  by edits and citations.
- What the agent was trying to find out, for episodes with no visible text (most subagent episodes). Their intent was
  inferred from the commands.
- The code version at session time (no commit SHA in transcript lines).
- Whether a different tool would have changed the calls. This is an observational count of what was done with search
  and read tools, not of what would be done with a graph tool; only an agent run can say that.
- Exact cross-session duplicates when the same section is read under a different variable name (undercounted).
- Question forms inside a single chained shell command: the call gets one form; a command that both greps for uses and
  prints a definition is counted once.
