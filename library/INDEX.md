# Library board: what is true now (version 1.1)
Rebuilt by hand on 2026-11-18 after fill 1 from `journal/*/*.jsonl`. Line = `id [how it is known] claim, with its number`. Full record: `bash library/lookup.sh -f <id>`.
Words: `GLOSSARY.md`. Rules and how to add records: `README.md`. This board lists the current records of the top session (`r57`) and what the two orchestrators concluded. The 2,524 extractor records (`x01` to `x24`) are not listed one by one: find them by word (`bash library/lookup.sh <word>`) or through "Journal files" below. Nothing found = "not recorded"; see "Known gaps".
## Before you do this, look this up (one record answers it first)
| You are about to | Look up | In short |
|---|---|---|
| Ask the owner how something should work, or which option | r57-0001 | Do not; derive, compute or measure |
| Set a limit, a timeout, a threshold or a budget | r57-0002 | Computed against the objective, not his preference |
| Start a helper or a child session | r57-0150 | Routes from kind of job to model; the hook refuses the rest |
| Choose or check the model of a helper | r57-0150, r57-0120, r57-0108 | The routes, the hook, what an agent definition does not fix |
| Decide how many helpers, sessions or heavy commands run at once | r57-0408, r57-0705, o2-0401, o2-0403 | A number per resource, run at the smallest; untested |
| Let two writers change one file | r57-0406, r57-0128 | Per file, by cost in what is scarce; untested |
| Decide what to do when a job is slow | r57-0408, r57-0129, o2-0401 (memory), o2-0403 (the check) | Find which resource gives the smallest number |
| Ask whether more work side by side uses more tokens | r57-0408, r57-0115, o2-0501 | A budget, not a rate; reasoned, one trial, no paper |
| Cite a figure on merges that are clean but wrong | r57-0305, x06-0356, x06-0360 | Human teams; shares of all merges, of clean merges, or of correct builds: say which |
| Stop a helper writing outside its files | r57-0105, r57-0402 | Seen working once |
| Start a session in a new folder | r57-0026, r57-0122 | Check the tier hook first |
| Start work nobody asked for | r57-0007 | Not without his word |
| Run a test, a review or a model run | r57-0004 | Only if the result changes what is done next |
| Use a rule from a design document | r57-0010 | Proven, measured here, or hypothesis; say which |
| Choose how a rule is enforced | r57-0011 | Hooks or scripts, whichever works best, or both |
| Choose a method from one measurement | r57-0015 | The bottleneck depends on the workload |
| Cite a figure from a paper | r57-0014 | Quote it from the paper, not a summary |
| Rest a decision on a record whose id begins with `x` | r57-0130 | Read the place it cites first: 71 % were checked by script only |
| Save a finding | r57-0016 | A structured record; steps in `README.md` |
| Write a skill or anything every session loads | r57-0019 | Only at source quality |
| Report to the owner | r57-0017 | Short; what is and is not; plainly not sure |
| Carry on past a large context | r57-0008 | Hand over to a fresh child session through files |
## The owner's rulings
- r57-0001 [owner] No design questions to the owner; derive from research, compute from measurements, measure what is missing.
- r57-0002 [owner] A parameter is an optimisation result against the objective, never his preference.
- r57-0003 [owner] Objective: quality first, then least time, memory, tokens; seven measures; report tokens, not money.
- r57-0004 [owner] A test, review or run only if its result can change what is done next; full suite once per change.
- r57-0005 [owner] Smallest model that gives the same output; routes in r57-0150, never-for in r57-0206.
- r57-0006 [owner] Work that can run together starts together.
- r57-0007 [owner] No round of work he has not asked for.
- r57-0008 [owner] One session, one purpose; hand over through files; no coordinator past its ceiling.
- r57-0009 [owner] Open the record from the files, not from session memory; compaction is no excuse.
- r57-0010 [owner] Nothing from a method document is reused blindly.
- r57-0011 [owner] Hooks or scripts: whichever works best, or both.
- r57-0012 [owner] "One writer per file" is rejected as the coarsest lock.
- r57-0013 [owner] Use the core concurrency literature, not only agent papers.
- r57-0014 [owner] Strong literature, read in full; blocked page: find the open copy; quote figures from the paper.
- r57-0015 [owner] The bottleneck depends on the workload; a decision rule routes to the method that fits.
- r57-0016 [owner] Store knowledge as structured records, not prose.
- r57-0017 [owner] Reports: short, what is and is not, plainly not sure.
- r57-0018 [owner] On a new instruction say what you understand and intend, then act on his go.
- r57-0019 [owner] Skills only at source quality; the derived tree skill was discarded.
- r57-0020 [owner] Harness work lives in this repository, never in the product's.
- r57-0021 [owner] Wide literature work: Opus orchestrator child sessions; the top session decides corrections.
- r57-0022 [owner] Test the library's structure with a dummy Sonnet session first (tests 1 and 2 run: r57-0121, r57-0124).
- r57-0023 [owner] Later: parallelism inside the tree, node by node.
- r57-0024 [owner] End your processes before reporting; report resource use unasked.
- r57-0025 [owner] Tier routes are enforced, not only written; Haiku is used where the guide puts it.
- r57-0026 [owner] Every folder a session starts in carries the tier hook; check before starting.
## Facts about this project and this PC
- r57-0101 [measured] Tree scripts (tcb) built: 965 tests pass, 0 fail, 53 skipped (need the real app); end-to-end 232 of 232.
- r57-0102 [measured] 13 fixes and 0b are designed, none built; no pilot, no run of the tree.
- r57-0103 [measured] One suite run: 596 s, one file at a time, 494 MB working set (overstates), 3 of 24 threads (whole PC).
- r57-0127 [measured] Lane queue: 2 slots, not 1; 780 commands ran 365 min and waited 177 min; two ran at once for 41 of 324 min.
- r57-0105 [observed] A hook refused a write and a helper's model, also with permissions bypassed (one session, Haiku, app 2.1.325).
- r57-0106 [observed] A hook is told ids and the tool input, never the context size; about 37 ms per start.
- r57-0107 [measured] Before the tier hook nothing refused a call; one setting, autoCompactWindow 400000, Opus only.
- r57-0108 [summary] The caller's model value beats an agent definition's (documented, never tried here).
- r57-0109 [observed] When a session may start a session; backslash folders; login only in the desktop app.
- r57-0110 [observed] Read a paper: curl --ssl-no-revoke, check %PDF-, pdftotext.
- r57-0128 [measured] Collisions: 3 fixes at once by file, 7 by function or block, 8 only by statement with 0b first; 20 shared places (9, 7, 4).
- r57-0112 [reasoned] Build size: 14 units, 12 scripts, 52 tests, 21 app facts (estimates).
- r57-0113 [reasoned] 9 fixes use the recorded design, 5 a variant of it; none differs.
- r57-0114 [measured] R57 round: 7.67 million helper tokens, coordinator 404,000, week 26 % to 39 %, no script changed.
- r57-0115 [measured] Five Sonnet readers together: 767,000 tokens, four minutes, under one point of the week.
- r57-0116 [measured] PC: 12 cores, 31 GB; 14.9 GB used idle; processor 86 to 93 % in one busy period.
- r57-0117 [measured] Week on 2026-11-18: 43 % all models, 35 % Fable; resets 2026-11-23 12:00 UTC.
- r57-0118 [observed] The app restarted three times and killed helpers; write files early, commit at once.
- r57-0119 [observed] A session loads the instructions of the folder it starts in.
- r57-0120 [observed] Tier hook at this repo's root: 17 self-tests, 6 of 6 steps; blind to a wrong kind and to effort.
- r57-0121 [measured] Recall test 1: of 14 questions 8 sure, 5 partly, 1 not recorded; ten changes asked.
- r57-0122 [observed] `tools/ensure-tier-hook.sh <folder>` checks the hook and installs it inside this repository; not outside it without `--force`.
- r57-0124 [measured] Recall test 2: 5 of 9 sure, 3 partly, 1 rightly "not recorded"; the format is judged ready to fill.
- r57-0125, r57-0126 [observed] Wave 1 of the bottleneck literature: ten collector files by Sonnet helpers under two Opus orchestrators; one reached 132,000 tokens after that wave and handed over through files.
- r57-0129 [measured] In 25 episodes the limit changed by job: queue 9, blocked program starts 7, memory 4, tokens 4, processor 3, nothing 1.
- r57-0130 [measured] Fill 1: 2,524 extractor records; all script-checked, 733 read by hand, 3 small corrections, none removed.
- r57-0131 [observed] The board is version 1.1: top-session records and a directory of journal files; extractor records are found by search.
- r57-0132 [measured] Recall test 3, on the filled library: of 10 questions 4 sure, 5 partly, 1 rightly "not recorded"; its fixes are in.
- r57-0150 [quoted] Tier routes: haiku locates and extracts; sonnet reads, collects, runs, builds; opus builds invariants, analyses, refutes, orchestrates.
- o1-0101 [observed] The lane's capacity file holds 2 (default 1, at most 4).
- o1-0102 [observed] Logged today: free memory and whole-PC processor share every 2 s, each heavy command's queue wait. Not logged: the ready queue, per-process memory, conflicts.
## How far the method documents were tested
- r57-0201 [measured] Orchestration design run once: 14 worked, 9 failed or changed, 25 never run; overhead 60,000 tokens, not 7,500.
- r57-0202 [designed-only] Harness v2 design: nothing built or run; lane counts rest on guesses.
- r57-0203 [measured] Horthy sweep: 78 of 861 kept, 9 with a measured figure, none controlled; nothing tried here.
- r57-0204 [quoted] "38 of 71": of 71 practised ideas 33 worked, 38 failed; not prose against scripts.
- r57-0205 [quoted] "Hooks stay off" was never ruled (D17, no owner answer).
- r57-0206 [designed-only] What each tier is never used for (copied from section 3).
- r57-0207 [designed-only] Effort levels per tier; only Opus high and xhigh ever ran.
- r57-0208 [measured] The 14 rules that ran and worked.
- r57-0209 [measured] The 9 rules that ran and failed or were changed.
- r57-0210 [measured] The 25 rules never run.
- o1-0201 [summary] Of 32 papers on detection, none switches method on a live machine by which resource binds, with a measured gain.
- o1-0202 [observed] The 8 claims on detection went through one refute round: all narrowed to their papers' conditions, none refuted.
## Published results (read in the papers unless marked)
- r57-0301 [quoted] Locking wins when resources are scarce, optimistic when plentiful (crossover 10 to 25 units); no conflict-rate crossover.
- r57-0302 [quoted] diff3 merges cleanly only under stated conditions (two replicas).
- r57-0303 [quoted] 10 of 12 TPC-C invariants need no coordination.
- r57-0304 [quoted] Operational transformation: all five algorithms fail with 3 or more sites.
- r57-0305 [quoted] Human teams: 16 % textual conflicts, 1 % build and 6 % test failures of all merges.
- r57-0306 [quoted] Test selection and merge queues: Facebook, Ekstazi, Google, Uber figures (replays, not trials).
- r57-0307 [quoted] Scalability law peak N* = sqrt((1 - alpha) / beta); needs a first measurement.
- r57-0308 [summary] AI agents in parallel: 19.8 to 41.7 % conflicts, 21 % faster to 39 % slower; summaries only.
- r57-0309 [quoted] Graham 1966: 4/3 - 1/(3n) is the bound of longest-first order with no precedence; any list stays at 2 - 1/n.
- o2-0300 [quoted] Denning 1968: one more program in a full memory collapses service (a model; it cites one measurement); two cures, a reserve and a shorter page transfer. The refuter added the second cure and the measurement.
- o1-0301 to o1-0319 [quoted] 19 results on finding the bottleneck and switching method (load control, feedback control, adaptive locking). Search by word.
- o2-0300 to o2-0331 [quoted] 32 results on scheduling when several resources are scarce (memory, multi-resource packing, quotas, cheaper models); nine reworded by a refuter. Search by word.
## Hypotheses (all untested)
- r57-0408 [reasoned] The decision rule: a number per resource at every start and finish, run at the smallest, act only at the gate; tokens are a budget, not a rate.
- r57-0406 [reasoned] Several writers on one file: per file, own copies or one owner, by the cost of redoing against waiting, counted in what is scarce.
- r57-0407 [reasoned] The next unit is the one that fits all free resources; short check jobs first; cheaper model where the gap is measured small.
- r57-0401 [reasoned] Skeleton change, then several fixes on own copies, one script merges: the case of r57-0406 in which tokens are scarce.
- r57-0402 [reasoned] Enforcement as a mix of script, hook, check and audit.
- r57-0403 [reasoned] Suite files side by side, 596 s down to about 270 s.
- r57-0404 [designed-only] Hand over at about 133,000 tokens (coordinator), 115,000 to 155,000 (child).
- o1-0401 to o1-0405 [reasoned] The detection side of the rule: the numbers per resource, the check's two cases, gate only, slow controllers only as an outer check, the papers' numbers do not carry over.
- o2-0400 to o2-0407 [reasoned] One rule per scarce resource: processor, memory, memory bandwidth, the check, tokens, two at once, a moving bottleneck, a cheaper model.
## Open, in the order of work (a line is blocked by what it names)
1. NEXT r57-0504 [open] How the chosen algorithms are built into the harness and the tree's scripts. Blocked by: nothing; start from r57-0705.
2. r57-0511 [open] The measurements that set the decision rule's numbers. Blocked by: the owner's word for each.
3. r57-0505 [open] Parallelism inside the tree, node by node. Blocked by: nothing.
4. r57-0506 [open] The small tests. Blocked by: the owner's word for each.
5. r57-0507 [open] The build: 13 fixes and 0b, the R57 model check, the pilot. Blocked by: 1, and the owner having seen the decision rule.
6. o2-0501 [open] No paper covers an allowance that refills over hours or days; whether our 5-hour window is fixed or rolling is unknown.
7. o2-0502 [open] Memory-bandwidth contention on this PC is unmeasured.
## Corrections decided by the top session
- r57-0801 [measured] o1-0501 is right: the lane has 2 slots; r57-0104 replaced by r57-0127.
- r57-0802 [measured] fill-0500 is right: 8 units at once only at statement level; r57-0111 replaced by r57-0128.
- r57-0803 [reasoned] o2-0500 is right on the wording of Graham's 4/3 bound; x05-0317 replaced by r57-0309.
## Mistakes, each with the situation it happens in
- r57-0601 [observed] 29 design questions put to the owner.
- r57-0602 [observed] A derived skill taken for the orchestration document; the sources not opened.
- r57-0603 [observed] Helpers on the most expensive model, one after another.
- r57-0604 [observed] A coordinator ran on past 404,000 tokens instead of handing over.
- r57-0605 [observed] A design chosen from one run ("mostly idle").
- r57-0606 [observed] Figures reported from fetch summaries (about 38 wrong; that count is in no file).
- r57-0607 [observed] One page for everything; rules as a prose skill.
- r57-0608 [observed] A count given without saying what it counts ("0 built").
- r57-0609 [observed] Four wrong claims stated to the owner.
## Where things are
- r57-0701 [measured] The evidence folder of 2026-11-18 (`E:`).
- r57-0702 [measured] The research tree's files.
- r57-0703 [measured] The method documents.
- r57-0704 [owner] The decision sheet that must not be used.
- r57-0705 [observed] The decision rule: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`, with the two literature reports beside it.
- r57-0706 [observed] The owner's page for the decision rule (a private Artifact) and its source `decision-rule.html`.
## Journal files (all in `journal/2026-11-18/`)
How the content of each `x` file is known, before you open the place a record cites: papers read in full
(x02 to x06); summaries only (x07); documentation, not observed here (x01); seen or measured on this PC
(x13, x14, x18); our own documents and records, restated (all others).

| File | Records | Written from | Search it for |
|---|---|---|---|
| `r57.jsonl`, `r57b.jsonl` | 90, 24 | The top session | Everything listed above |
| `o1.jsonl` | 29 | `bottleneck-2026-11-18/o1-report.md` | Finding the bottleneck, load and feedback control, switching method |
| `o2.jsonl` | 43 | `bottleneck-2026-11-18/o2-report.md` | Scheduling under scarce memory, processor, check, tokens; cheaper models |
| `fill.jsonl` | 1 | The fill's checker | A proposed correction, decided (r57-0802) |
| `x01.jsonl` | 53 | `E:app-enforcement-mechanisms.md` | Hooks, permission rules, settings, workflow scripts as documented |
| `x02.jsonl` | 131 | `E:concurrency-lit-1-databases.md` | Locking, optimistic control, snapshot isolation |
| `x03.jsonl` | 129 | `E:concurrency-lit-2-memory.md` | Transactional memory, lock-free structures |
| `x04.jsonl` | 153 | `E:concurrency-lit-3-coordination-free.md` | Merging without coordination, CRDTs, invariant confluence, OT |
| `x05.jsonl` | 108 | `E:concurrency-lit-4-scheduling.md` | Work and span, work stealing, list bounds, scalability law, queues |
| `x06.jsonl` | 149 | `E:concurrency-lit-5-integration.md` | Merge conflicts, merge queues, test selection |
| `x07.jsonl` | 60 | `E:concurrency-literature.md` | Studies of AI agents in one repository (summaries only) |
| `x08.jsonl` | 108 | `E:enforcement-evidence.md` | What our record shows on hooks, scripts and prose rules |
| `x09.jsonl` | 128 | `E:harness-v2-status.md` | Each part of the harness v2 design and whether it ran |
| `x10.jsonl` | 143 | `E:horthy-instruction-files.md` | Instruction files, hand-over, context fill |
| `x11.jsonl` | 169 | `E:horthy-proved-general.md` | The 78 kept Horthy ideas and what carries a result |
| `x12.jsonl` | 95 | `E:orchestration-design-status.md` | Each rule of the orchestration design against its one run |
| `x13.jsonl` | 32 | `E:probe-hooks.md` | The hook probe in a real session |
| `x14.jsonl` | 26 | `E:probe-suite-memory.md` | The suite run: time, memory, threads |
| `x15.jsonl` | 163 | `E:several-writers-options.md` | The options for several writers (a hypothesis) |
| `x16.jsonl` | 98 | `E:testing-evidence.md` | What checking cost and changed |
| `x17.jsonl` | 113 | `E:write-collision-points.md` | Which fixes touch which place |
| `x18.jsonl` | 76 | `bottleneck-2026-11-18/own-data.md` | The 25 episodes and their limits |
| `x19.jsonl`, `x24.jsonl` | 155, 3 | `research-tree/SELECTIONS-MAP.md` | The 103 recorded design selections |
| `x20.jsonl` | 187 | `research-tree/DESIGN-RECORD.md` | The tree's design decisions and their reasons |
| `x21.jsonl` | 145 | `research-tree/ATTACK-AND-COST-RECORD.md` | Attack rounds and cost figures |
| `x22.jsonl` | 60 | `research-tree/BUILD-SIZE.md` | The size of the build |
| `x23.jsonl` | 40 | `research-tree/FAULTS-AND-FIXES.md` | The faults and the 13 fixes |
## Known gaps: the library does not hold
- Token cost of building one fix: not recorded (r57-0114 is design and checking, not building).
- Whether a deny rule works here: not tried (r57-0108 is documentation only).
- Whether test files can run side by side: not tested (r57-0403).
- What a hook sees for the Edit tool, a time-out, or a compacted session: not tested (r57-0105).
- Whether an agent started with no model keeps its definition's model: not tried (r57-0106).
- The effort each past helper ran at, or any smaller-against-larger model comparison: no record (r57-0201).
- Memory of one agent session (a helper or a child session): not measured. The 494 MB of r57-0103 is a suite run, not a helper.
- Memory or tokens of any run but one suite run; the processor share of one job: not measured (r57-0129).
- Time and tokens of the attack rounds of the R57 round: no record.
- Whether the tier hook fires in sessions started in other folders: not tested (r57-0120, r57-0122).
- Any number of the decision rule (a reserve, a threshold, a count of quiet units): none is set; the measurements are r57-0511.
- A paper on an allowance that refills over hours or days, on a check shared by separate programs, or on work lasting minutes with few workers: none was found (r57-0705).
- By-hand reading of 1,791 of the 2,524 extractor records: not done (r57-0130).
