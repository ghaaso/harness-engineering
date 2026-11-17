# Library board: what is true now (version 1)
Rebuilt by hand on 2026-11-18 from `journal/*/*.jsonl`. Line = `id [how it is known] claim, with its number`. Full record: `bash library/lookup.sh -f <id>`.
Words: `GLOSSARY.md`. Rules and how to add records: `README.md`. Not on this board = "not recorded"; see "Known gaps".
## Before you do this, look this up (one record answers it first)
| You are about to | Look up | In short |
|---|---|---|
| Ask the owner how something should work, or which option | r57-0001 | Do not; derive, compute or measure |
| Set a limit, a timeout, a threshold or a budget | r57-0002 | Computed against the objective, not his preference |
| Start a helper or a child session | r57-0150 | Routes from kind of job to model; the hook refuses the rest |
| Start work nobody asked for | r57-0007 | Not without his word |
| Run a test, a review or a model run | r57-0004 | Only if the result changes what is done next |
| Use a rule from a design document | r57-0010 | Proven, measured here, or hypothesis; say which |
| Choose how a rule is enforced | r57-0011 | Hooks or scripts, whichever works best, or both |
| Plan writers working at the same time | r57-0012 | "One writer per file" is rejected |
| Choose a method from one measurement | r57-0015 | The bottleneck depends on the workload |
| Cite a figure from a paper | r57-0014 | Quote it from the paper, not a summary |
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
- r57-0022 [owner] Test the library's structure with a dummy Sonnet session first (test 1 done, test 2 open).
- r57-0023 [owner] Later: parallelism inside the tree, node by node.
- r57-0024 [owner] End your processes before reporting; report resource use unasked.
- r57-0025 [owner] Tier routes are enforced, not only written; Haiku is used where the guide puts it.
- r57-0026 [owner] Every folder a session starts in carries the tier hook; check before starting.
## Facts about this project and this PC
- r57-0101 [measured] Tree scripts (tcb) built: 965 tests pass, 0 fail, 53 skipped (need the real app); end-to-end 232 of 232.
- r57-0102 [measured] 13 fixes and 0b are designed, none built; no pilot, no run of the tree.
- r57-0103 [measured] One suite run: 596 s, one file at a time, 494 MB working set (overstates), 3 of 24 threads (whole PC).
- r57-0104 [measured] Lane queue, 778 commands: 355 min running, 177 min waiting.
- r57-0105 [observed] A hook refused a write and a helper's model, also with permissions bypassed (one session, Haiku, app 2.1.325).
- r57-0106 [observed] A hook is told ids and the tool input, never the context size; about 37 ms per start.
- r57-0107 [measured] Before the tier hook nothing refused a call; one setting, autoCompactWindow 400000, Opus only.
- r57-0108 [summary] The caller's model value beats an agent definition's (documented, never tried here).
- r57-0109 [observed] When a session may start a session; backslash folders; login only in the desktop app.
- r57-0110 [observed] Read a paper: curl --ssl-no-revoke, check %PDF-, pdftotext.
- r57-0111 [measured] Collisions: 3 fixes at once by file, 7 by function, 20 shared places; counts move with grouping.
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
- r57-0122 [observed] tools/ensure-tier-hook.sh <folder> checks the hook and installs it inside this repository.
- r57-0123 [measured] In 25 episodes the limit changed by job: queue 8, program starts 6, memory 4, tokens 4, processor 3.
- r57-0150 [quoted] Tier routes: haiku locates and extracts; sonnet reads, collects, runs, builds; opus builds invariants, analyses, refutes, orchestrates.
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
## Published results (read in the papers unless marked)
- r57-0301 [quoted] Locking wins when resources are scarce, optimistic when plentiful (crossover 10 to 25 units); no conflict-rate crossover.
- r57-0302 [quoted] diff3 merges cleanly only under stated conditions (two replicas).
- r57-0303 [quoted] 10 of 12 TPC-C invariants need no coordination.
- r57-0304 [quoted] Operational transformation: all five algorithms fail with 3 or more sites.
- r57-0305 [quoted] Human teams: 16 % textual conflicts, 1 % build and 6 % test failures of all merges.
- r57-0306 [quoted] Test selection and merge queues: Facebook, Ekstazi, Google, Uber figures (replays, not trials).
- r57-0307 [quoted] Scalability law peak N* = sqrt((1 - alpha) / beta); needs a first measurement.
- r57-0308 [summary] AI agents in parallel: 19.8 to 41.7 % conflicts, 21 % faster to 39 % slower; summaries only.
## Hypotheses (all untested)
- r57-0401 [reasoned] Untested: skeleton change, then several fixes on own copies, one script merges.
- r57-0402 [reasoned] Untested: enforcement as a mix of script, hook, check and audit.
- r57-0403 [reasoned] Untested: suite files side by side, 596 s down to about 270 s.
- r57-0404 [designed-only] Untested: hand over at about 133,000 tokens (coordinator), 115,000 to 155,000 (child).
## Open, in the order of work (a line is blocked by what it names)
1. NEXT r57-0508 [open] Run recall test 2 on library version 1. Blocked by: nothing.
2. r57-0501 [open] Fill the library from the evidence files. Blocked by: 1.
3. r57-0502 [open] Bottleneck research and the table from bottleneck to method. Blocked by: 2. Under way: r57-0509 [open] two Opus orchestrators on the literature.
4. r57-0503 [open] Several-writers options as a decision rule. Blocked by: 3.
5. r57-0504 [open] How the algorithms are built into the harness and the tree. Blocked by: 4.
6. r57-0505 [open] Parallelism inside the tree. Blocked by: 3.
7. r57-0506 [open] The small tests. Blocked by: the owner's word for each.
8. r57-0507 [open] The build: 13 fixes and 0b, the R57 model check, the pilot. Blocked by: 4 and the owner seeing the decision rule.
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
## Known gaps: the library does not hold
- Token cost of building one fix: not recorded (r57-0114 is design and checking, not building).
- Whether a deny rule works here: not tried (r57-0108 is documentation only).
- Whether test files can run side by side: not tested (r57-0403).
- What a hook sees for the Edit tool, a time-out, or a compacted session: not tested (r57-0105).
- Whether an agent started with no model keeps its definition's model: not tried (r57-0106).
- The effort each past helper ran at, or any smaller-against-larger model comparison: no record (r57-0201).
- Memory or tokens of any run but one suite run; the processor share of one job: not measured (r57-0123).
- Time and tokens of the attack rounds of the R57 round: no record.
- Whether the tier hook fires in sessions started in other folders: not tested (r57-0120, r57-0122).
