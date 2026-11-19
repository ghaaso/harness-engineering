# Research tree: the owner's rulings

Open this to report to the owner or to check how he has ruled the work is done. The board is `research-tree/START-HERE.md`.

## How the owner has ruled this is worked

Rules 1 to 7 of `CLAUDE.md` apply. These are the ones that were broken, in his words where quoted.

- **The objective is given.** Quality first, then the least time, memory and tokens: the seven
  measures. "As little as possible while maximizing the quality of output."
- **Do not put design questions to the owner.** "How would my opinion weigh more than proven
  algorithms and cs theory?" A mechanism comes from the recorded research. A parameter is computed
  from measurements against the objective: "the optimal parameters are not decided by what my
  favorite one is". A missing fact is measured. He is shown results and reasoning, not choices.
- **Use the algorithm that fits best, from what is already researched.** "You're not just supposed
  to use a goddamn algorithm out of the blue."
- **Open the record at the start.** "Properly document and fetch the right things and save them,
  not go by session memory." A compaction is not an excuse.
- **The right model for the job.** Use the smaller model wherever "the bigger model and smaller
  model output is the same".
- **Parallel by default.** "Just use subagents": work that is reading and writing is split and run
  at the same time. He should never have to ask whether parallelism is maximized.
- **A test runs only if its result can change what we do next** (protocol version 2, section 16
  point 12, with the four cuts he approved).
- **No round of work he has not asked for.**
- **One session, one purpose.** When it is achieved, a fresh child session carries on from files.
- **Be honest about what is not sure.** Say "not sure" with the reason, and measure.
- **Clean up.** End every process a session started before it reports.

## How the work is run

- Section 3 of `docs/ORCHESTRATION-DESIGN-2026-10.md` is the FixFlow tier guide; the routes in force are `.claude/hooks/tier-routes.json` as changed by r57-0035, and where they differ the routes and the rulings win. What of that method was run and what is only designed is in `docs/program/evidence/harness-method-status-2026-11-18/README.md`. The skill and agent types written on 2026-11-18 were discarded on the owner's order.
- Independent pieces start in one message. One writer per file was this session's rule; the owner rejected it on 2026-11-18 as the coarsest lock there is. See `docs/program/evidence/harness-method-status-2026-11-18/README.md`, section 7a.
- How many sessions run at once is computed, not set: the smallest width over memory, processor, bandwidth, ready work, the check, each token window and the parent's context window (r57-0414). The build's widths are in `research-tree/ORCHESTRATION.md`, section 6.
- Read the plan's usage before a fan-out and name a cap.
- **The ceiling is a derived figure, not a feeling.** The build's hand-over point is computed in `research-tree/ORCHESTRATION.md`, section 5 (root about 129 K, Opus helpers checkpoint at about 330 K); r57-0404's 133 K for a coordinator and 115,000 to 155,000 for a research child were a hypothesis, untested. The R57 coordinator ran to 404,000 and then to 527,000. Hand over at the computed point.
- Heavy commands, such as a test suite or a model check, go through `research-tree/tools/lane.mjs`; its slots are set in `research-tree/lane/capacity.txt` (r57-0127); the build's value and why are in `research-tree/ORCHESTRATION.md`, section 6.
- A session ends by updating the table "Where it stands" on the board and committing.
- Measured on 2026-11-18: five Sonnet readers at once, 767,000 tokens together, four minutes, less
  than one point of the week's usage.

## What is enforced, and what is not

Four things are enforced by hooks and a check, seen working live (r57-0151, r57-0154; `library/README.md`, "What enforces these rules"): the tier hook (the kind and model of every helper and child), the record guard (archived evidence, journal appends, the form of a question to the owner), the start hook (the board is put into every start) and the commit check. The build adds a plan gate (`.claude/hooks/plan-gate.mjs`, being built). Everything else on the board is text that a session has to follow, and the R57 round shows that text gets ignored. The tree's own agent types in `research-tree/tcb/agents/` are not used by the build.

## What went wrong in the R57 round

- The round was proposed by the build session. The owner had not asked for it.
- It was run from a session started in the product folder, which loads the product's instructions,
  skills and agents and not this repository's `CLAUDE.md`.
- 13 of its 14 helpers ran on the most expensive helper model, and they ran in sequence where they
  could have run together.
- Its coordinator ran to about 404,000 tokens after a refused hand-over.
- Three attack passes ran where the owner's ruling says one.
- It never opened the foundations folder. Every open branch between two variants of a fix was written
  down as "the owner's choice", and 29 of them were put to him on a page. He rejected that.
- Cost: about 7.7 million helper tokens. The week's usage went from 26 % to 39 % in those seven hours,
  all sessions together. No script was changed.
- The session took a derived skill for the orchestration document and never opened
  `docs/ORCHESTRATION-DESIGN-2026-10.md` or `docs/program/HARNESS-V2-DESIGN-2026-11.md`.
- It put everything on one page that every session would read.
- It proposed hooks, although the harness design says hooks stay off and enforcement is by scripts.
