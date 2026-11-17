# Library board: what is true now

Built by hand on 2026-11-18 from `journal/2026-11-18/r57.jsonl`. One line per current record. For the
full record: `grep -rh '"id":"<id>"' journal`. How records work: `README.md`. If something is not here,
it is "not recorded".

## Before you do this, look this up

| You are about to | Records |
|---|---|
| Ask the owner how something should work, or which option | r57-0001, r57-0002, r57-0601 |
| Set a limit, a timeout, a threshold or a budget | r57-0002, r57-0015 |
| Start a helper or a child session | r57-0005, r57-0006, r57-0109, r57-0603 |
| Start work nobody asked for | r57-0007 |
| Run a test, a review or a model run | r57-0004 |
| Use a rule from a design document | r57-0010, r57-0201, r57-0202, r57-0203, r57-0602 |
| Choose how a rule is enforced | r57-0011, r57-0105, r57-0106, r57-0107, r57-0402 |
| Plan writers working at the same time | r57-0012, r57-0015, r57-0111, r57-0401 |
| Choose a method from one measurement | r57-0015, r57-0605 |
| Cite a figure from a paper | r57-0014, r57-0110, r57-0606 |
| Save a finding | r57-0016, and `README.md` rules 1 to 5 |
| Write a skill or anything every session loads | r57-0019, r57-0607 |
| Report to the owner | r57-0017, r57-0018, r57-0608 |
| Carry on past a large context | r57-0008, r57-0404, r57-0604 |

## The owner's rulings

- r57-0001 No design questions to the owner; derive, compute or measure.
- r57-0002 Parameters are optimisation results, not his preference.
- r57-0003 The objective: quality first, then least time, memory, tokens; seven measures.
- r57-0004 A test runs only if its result changes what is done next.
- r57-0005 Smallest model that gives the same output; tiers are in the orchestration design, section 3.
- r57-0006 Parallel by default.
- r57-0007 No round he has not asked for.
- r57-0008 One session, one purpose; hand over through files.
- r57-0009 Open the record from files; never work from memory.
- r57-0010 Nothing reused blindly: proven, measured here, or hypothesis.
- r57-0011 Hooks or scripts: whichever works best, or both.
- r57-0012 "One writer per file" is rejected.
- r57-0013 Use the core concurrency literature, not only agent papers.
- r57-0014 Strong literature, read in full, figures quoted.
- r57-0015 The bottleneck depends on the workload: a rule by bottleneck.
- r57-0016 Store as structured records, not prose.
- r57-0017 Reports: short, what is and is not.
- r57-0018 Say what you understand and intend before acting.
- r57-0019 Skills only at source quality; the tree skill was discarded.
- r57-0020 Harness work lives in this repository, never in the product's.
- r57-0021 Wide literature work: Opus orchestrator sessions; the top session decides corrections.
- r57-0022 The library's structure is tested by a dummy session first.
- r57-0023 Later: parallelism inside the tree, node by node.
- r57-0024 End your processes; report resource use.

## Facts about this project and this PC

- r57-0101 The tree's scripts are built: 965 tests pass, end-to-end 232 of 232.
- r57-0102 Thirteen fixes and 0b are designed, none built; no pilot, no run.
- r57-0103 One suite run: 596 s, 494 MB, one test file at a time, about 3 of 24 threads.
- r57-0104 Heavy commands queue one at a time: 355 min running, 177 min waiting.
- r57-0105 A hook does refuse a call in this app (observed).
- r57-0106 What a hook is told; not the context size; 37 ms per call.
- r57-0107 Nothing enforces any rule today.
- r57-0108 An agent definition's model can be overridden by the caller (documented).
- r57-0109 When a session can start a session; folder spelling; where the login is.
- r57-0110 How to read a paper PDF on this PC.
- r57-0111 Collision points: 3 fixes at once by file, 7 by function; 20 shared places.
- r57-0112 Build size: 14 units, 12 scripts, 52 tests, 21 app facts.
- r57-0113 The fixes against the recorded selections: none differs, five are variants.
- r57-0114 What the R57 round cost.
- r57-0115 Five Sonnet readers at once: 767,000 tokens, four minutes.
- r57-0116 The PC: 12 cores, 31 GB; what used the memory.
- r57-0117 Usage on 2026-11-18: 43 % of the week.
- r57-0118 The app restarted three times and killed running helpers.
- r57-0119 A session loads the instructions of the folder it starts in.

## How far the method documents were tested

- r57-0201 Orchestration design: ran once; 12 rules worked, 11 failed or changed, 24 never ran.
- r57-0202 Harness v2 design: designed only.
- r57-0203 Horthy sweep: no controlled result; file layout not settled; nothing tried here.
- r57-0204 What "38 of 71" really counts.
- r57-0205 "Hooks stay off" was never ruled.

## Published results (read in the papers unless marked)

- r57-0301 Optimistic control against locking turns on which resource is scarce.
- r57-0302 When a three-way merge is guaranteed clean.
- r57-0303 Which changes merge without coordination.
- r57-0304 Operational transformation fails beyond two writers.
- r57-0305 Measured merge conflict and test failure rates.
- r57-0306 Shortening the serial check: test selection, merge queues.
- r57-0307 The scalability law and its peak; needs a first measurement.
- r57-0308 Studies of AI agents in parallel (summaries only).

## Hypotheses, not tested

- r57-0401 Several writers on one file: skeleton, own copies, script gate.
- r57-0402 Enforcement as a mix of workflow script, hook, script and audit.
- r57-0403 Test files side by side: about 270 s per run.
- r57-0404 Hand-over windows: 133,000 tokens for a coordinator.

## Open

- r57-0501 Fill the library from the evidence files.
- r57-0502 Bottleneck research and the table from bottleneck to method.
- r57-0503 Rewrite the several-writers options as a decision rule.
- r57-0504 How the algorithms are built into the harness and the tree.
- r57-0505 Parallelism inside the tree.
- r57-0506 Small tests not yet run.
- r57-0507 Build the fixes, the R57 check, the pilot.

## Mistakes, each with the situation it happens in

- r57-0601 Asking the owner design questions.
- r57-0602 Taking a derived document for the source.
- r57-0603 Helpers on the wrong model, one after another.
- r57-0604 A coordinator running on past its window.
- r57-0605 Designing from one measured run.
- r57-0606 Reporting figures from summaries.
- r57-0607 One page for everything; rules as a prose skill.
- r57-0608 A count without saying what it counts.
- r57-0609 Quoting documents not read at the place quoted.

## Where things are

- r57-0701 The evidence folder of 2026-11-18.
- r57-0702 The research tree's files.
- r57-0703 The method documents.
- r57-0704 The decision sheet that must not be used.
