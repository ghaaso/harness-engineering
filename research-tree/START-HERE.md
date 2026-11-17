# Research tree: start here

Read this before any work on the research tree. It says where the work stands, what to open first,
how the owner has ruled the work is done, and what comes next.

Written on 2026-11-18 by the session that ran the R57 round, after the owner's corrections of that
night. Facts marked (record) come from the commit or document named beside them. Check them there
before leaning on them. Do not work from this page's summary alone, and never from a note index.

## Where it stands

| Piece | State | Where |
|---|---|---|
| The design of the tree | Version 2: "the 21 problems fixed with solved designs" (record: commit b869685e) | `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` |
| The research behind the design | Done on 2026-11-16 by a child session and saved: each problem mapped to its field, the designs chosen, the cost model, the first protocol model and its review, the attack on the result | `docs/program/evidence/research-tree/foundations-2026-11-16/` (`map/`, `design/`, `cost/`, `model/`, `model-review/`) and `attack-2026-11-16/` |
| The trusted scripts | Built in 31 stages. Suite 965 pass, 0 fail; end-to-end 232 of 232 (record: commit 78ce77f1). At stage 31, 53 tests needed the real app (record: commit 9fdaa2f7) | `research-tree/tcb/`; the build's record is section 16 of the protocol |
| The protocol model | Groups 1 to 5 run and finished (record: commit 1a82fe4e) | `research-tree/model/results/` |
| The R57 round | Found that the scripts as built do not behave the way that model assumes in six mechanisms. Real failure schedules. Thirteen fix designs. None built | `research-tree/notes/section17-draft-2026-11-17.md`, `research-tree/notes/r3-changes.md`, `research-tree/model/as-built/` |
| Not done | The thirteen fixes in the scripts; the checks that need the app; the pilot; a first run of the tree | |

So the tree's scripts exist and pass their tests. What does not exist yet is the repair of the faults
listed next, and a run.

## What the scripts get wrong today

Found by the R57 round. Each has a failing trace in `research-tree/model/as-built/CEX-fence.md` or
`CEX-wake.md`, and a fix design in `FIX-fence.md`, `FIX-wake.md` and `FIX-JOIN.md`.

1. A child's finished result can be thrown away by a fence that races it.
2. Two sessions can be started for one attempt: the transcript shows up late, and the planners can
   order a second start themselves.
3. A finished child can hold its slot for ever, so the tree stops admitting work.
4. A stale coordinator can start a session, if coordinators have the session tools.
5. One coordinator turn that dies can leave nothing to wake the tree.
6. A healthy slow call is taken for a hang and fenced.
7. A due act is raised once. A coordinator that ignores it leaves it unraised for ever.

Also: no coordinator brief exists; a row committed at `started` cannot be stopped; test flags of the
scripts can be reached by the coordinator.

## A warning about the thirteen fix designs

Each fix names a classical design it borrows. But the helpers of the R57 round chose those designs
inside the round. Nobody compared them with the selections already recorded in the foundations
folder. Do that comparison first. It is a reading job for a small model and gives one table. Where a
fix agrees with the recorded selection, build it. Where it differs, the recorded selection stands,
unless it cannot cover the defect.

## How the owner has ruled this is worked

Rules 1 to 7 of `CLAUDE.md` at the root apply. These are the ones that were broken, in his words
where quoted.

- **The objective is given.** Quality first, then the least time, memory and tokens: the seven
  measures. "As little as possible while maximizing the quality of output."
- **Do not put design questions to the owner.** "How would my opinion weigh more than proven
  algorithms and cs theory?" A mechanism comes from the recorded research. A parameter is computed
  from measurements against the objective: "the optimal parameters are not decided by what my
  favorite one is". A missing fact is measured. He is shown results and reasoning, not choices.
- **Use the algorithm that fits best, from what is already researched.** "You're not just supposed
  to use a goddamn algorithm out of the blue." Open the recorded selections before choosing.
- **Open the record at the start.** "Properly document and fetch the right things and save them,
  not go by session memory." A compaction is not an excuse.
- **The right model for the job.** Sonnet reads and extracts, Opus judges and refutes, the
  coordinating session only coordinates. Use the smaller model wherever "the bigger model and
  smaller model output is the same".
- **A test runs only if its result can change what we do next** (protocol version 2, section 16
  point 12, with the four cuts he approved).
- **No round of work he has not asked for.**
- **A coordinator stops at its context ceiling** and hands over through files. It does not run on.

## What went wrong in the R57 round

Recorded so that it is not repeated.

- The round was proposed by the build session. The owner had not asked for it.
- It was run from a session started in the product folder. Such a session loads the product's
  instructions, skills and agents, and not this repository's `CLAUDE.md`. Start work on the tree from
  a session whose folder is this repository.
- 13 of its 14 helpers ran on the most expensive helper model, reading and write-up jobs included.
- Its coordinator ran to about 404,000 tokens of context after a refused hand-over.
- Three attack passes ran where the owner's ruling says one.
- It never opened the foundations folder. Every open branch between two variants of a fix was
  written down as "the owner's choice", and 29 of them were put to him on a page. He rejected that.
- Cost: about 7.7 million helper tokens. The week's usage went from 26 % to 39 % in those seven
  hours, all sessions together. No script was changed.

## Next, in this order

This order is the R57 session's reading. Check it against the protocol's own plan (section 10 and
section 16) before starting.

1. Compare the thirteen fix designs with the recorded selections. Small model. One table.
2. Build the fixes into `research-tree/tcb/` with their tests, following `notes/r3-changes.md`. A
   probe of the app runs inside this step only if its answer changes the build.
3. Run the check R57 asks for once, after the build, at the sizes of the owner's ruling.
4. The pilot.

## Do not use

`research-tree/notes/r57-decision-sheet-2026-11-17.html` and its published page ask the owner 29
questions. He rejected being asked. The page is still a complete list of the open branches: treat
each one as something to derive or to measure.
