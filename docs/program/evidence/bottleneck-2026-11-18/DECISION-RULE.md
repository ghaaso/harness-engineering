# From the current bottleneck to the method: the decision rule (2026-11-18)

**Status: a hypothesis. Nothing here was run on this PC.** Written by the top session from four sources:

- `o1-report.md`: how a system finds its bottleneck and switches method. 32 papers read in full. A refuter
  narrowed all 8 of its claims to their papers' conditions; none was refuted.
- `o2-report.md`: scheduling when several resources are scarce. 47 papers. The refuter confirmed 4 of its 8
  claims and narrowed 4; none was refuted.
- `own-data.md`: which resource limited which of 25 past jobs of ours.
- The earlier reading on several writers of one file: library records r57-0301 to r57-0306.

Library records for this page: r57-0406 to r57-0408 (the rule), r57-0511 (the measurements it needs),
r57-0705 (where it is). Objective, as ruled (r57-0003): quality first, then the least time, memory and tokens.

Two words used below. A **unit** is one piece of work that is started at one moment: an agent's piece, a
run of the test suite, a model run, a build. The **width** of a resource is how many units it can carry at
once, right now.

## The answer first

1. **Scheduling needs no switch.** One calculation does both jobs. For each resource, work out its width.
   Run at the smallest width. The resource that gives the smallest width is the bottleneck at that moment.
2. **The calculation is repeated at every start and every finish of a unit.** When the bottleneck moves,
   the rule follows it. Nothing is switched, so nothing can flip back and forth.
3. **Act only at the gate:** hold new units back. Running work is stopped in one case only: memory at its
   floor, because memory fails as a cliff and not as a slope.
4. **Which unit starts next:** the one that fits what is free on every resource at once. Short check jobs
   go before long ones.
5. **One thing is a real switch:** how several writers share one file. Either each works on its own copy
   and the copies are merged, or one owner writes at a time. It switches per file, on a count of
   conflicts, with a margin before switching back, and only between units.
6. **Which of the two is right depends on what is scarce.** Redoing work burns tokens and check time.
   Waiting burns clock time. Tokens or the check scarce: one owner wherever a conflict is likely. Neither
   scarce: own copies.
7. **Every number is computed here.** The papers' thresholds were tuned on work that lasts microseconds and
   comes in thousands. Only the shape of each rule carries over (r57-0002).
8. **Three parts have no paper behind them** and are reasoning only: the token allowance (weekly and
   5-hour), a check shared by separate programs, and units that last minutes with a handful of workers.

## What limited us so far (25 episodes of our own work, r57-0129)

| Limit | Episodes that name it |
|---|---|
| The queue in front of heavy commands (the check) | 9 |
| Program starts blocked by the PC | 7 |
| Memory | 4 |
| Token allowance | 4 |
| Processor | 3 |
| Nothing | 1 |

Five episodes name two limits, and two have none recorded, so the counts add up to 28. No single limit dominates, which is the owner's point. Blocked program
starts are a fault of the PC, not a scarce resource: no method below applies, and they stay with the PC
diagnosis (`docs/program/evidence/pc-freezes-2026-11-17/`).

## The rule, step by step

**Step 0. Measure each class of unit first.** Classes: agent piece, suite run, model run, build. Keep from
finished units: busy threads, peak private memory, time in the check, time outside it, tokens. A new class
runs alone until its figures are steady. (Suleman's training run; r57-0307: the scaling law needs a first
measurement before it predicts.)

**Step 1. Work out each width.**

| Resource | Read on this PC | Width | Source, and what the refuter left of it | Logged today |
|---|---|---|---|---|
| Memory capacity | Free memory; each class's peak private memory | The units whose peaks fit in free memory above a reserve. A hard cap | Denning 1968: collapse, a reserve (analytic; narrowed). Borg: kill for memory (confirmed). Autopilot: caps from measured use | Free memory yes, every 2 s. Per-unit peak no |
| Processor | Busy threads per class; work ready to run above 24 threads | The units whose expected busy threads sum to at most 24 | Johnson 2010: kept 85 % of peak at twice the load (narrowed: spin locks, one server). Borg: throttle, never kill (confirmed) | Whole-PC share yes. Ready-queue length no |
| The check | Time of one check (596 s, one run); time a unit spends outside it; the lane's slots (2 today); the wait | Case A, one task split into pieces that each pass one check: the square root of (time outside / time inside). Case B, one check per change: slots x (time outside + time inside) / time inside; past that, workers only queue | Suleman 2008: within 1 % of the best count (narrowed: a simulator, a section inside one program). Case B: a textbook queueing bound, reasoned | Wait yes. Time outside the check no |
| Memory bandwidth | A bus or cache-miss counter | 100 / the bus share of one worker; pair heavy with light | Suleman; Merkel: 2.7 to 3.9 times slower (confirmed, chips of 2010) | No. No sign our commands are bound by it |
| Shared files | Conflicts per file or function; claims held | See "Several writers" below | MOCC, Moenkeberg-Weikum (both narrowed) | No |
| Token allowance | Share of the week and of the 5-hour window used; tokens per unit by class | The units the window can still pay for, above a reserve. A budget, not a rate: see the note under this table | Quota per period (narrowed), token bucket (quoted). The mapping to our windows is reasoning: no paper | Week share yes. Tokens per unit no |
| Ready work | Units ready to start | Their number | | Yes |

**Tokens are a budget, not a rate (reasoned, not measured).** Units that run side by side cost the same
tokens in total as the same units one after another. So the allowance does not limit how many run at once
until a window is nearly spent; our four token episodes were such moments. What it decides is how many
units can be done before the reset, and on which model. Side-by-side work costs extra tokens in two ways
only: work that is redone after a conflict, and a waiting session that re-reads its context. It saves some:
a coordinator that gets several helpers back in one turn pays for fewer turns.

**Step 2. Width = the smallest of these.** Two resources within one unit of each other count as two at once.
If "ready work" is the smallest, capacity is idle: start more work (r57-0006). The minimum is argued by
Suleman for two limits; no program he tested had both.

**Step 3. Gate only.** Start a unit while fewer than the width are running. Never stop a running unit,
except the least important one when memory reaches its floor. An agent's unit is minutes of work; the
papers shed waiters that cost nothing to stop.

**Step 4. Choose the next unit.** The one whose needs best match what is free on all resources (dot
product; dominant share when fairness matters). Short check jobs first. A unit queued for the check holds
nothing else. The cheaper model does a unit only where its quality gap on that kind of work was measured
small (confirmed for chat, instructions and multiple choice; never tested on code).

**Step 5. Cross-check with the wait.** If the shortest wait at the check over a window stays above zero,
a standing queue exists and the check is the bottleneck, whatever the processor shows. High processor use
alone is not the signal. A shared serial step needs its own signal: its own queue, its own share of time.

**Step 6. A slow outer check.** Throughput against the number of workers, after about 100 finished units.
At agent speed that is hours, so it can only confirm the rule, not drive it.

## By bottleneck: what the rule does

| Bottleneck now | What the rule does | Measured in the literature | Mark |
|---|---|---|---|
| Processor | Holds new units; shares and slows; kills nothing | 85 % of peak kept at twice the load; 3 % slowdown from sharing at Google | Quoted, narrowed to its systems |
| Memory | Admits only what fits with a reserve; counts paused agents; at the floor stops the least important unit | Collapse is analytic. Caps from measured use: slack 23 to 31 % against 46 to 60 % by hand | Quoted |
| The check | Keeps it busy; short jobs first; starts no worker past the check's width; makes the check wider or shorter | Widths within 1 % of best in a simulator. Test selection: r57-0306. Suite files side by side: untested (r57-0403) | Quoted for the width; the rest untested here |
| Shared files | Per file: own copies, or one owner (below) | 1.5 times better mean response than the best fixed level, one bank trace | Quoted, narrowed |
| Token allowance | Charges every token to its unit; admits only what the window can still pay for; cheaper model where the gap is small; one owner where a conflict is likely, so nothing is redone | Nothing for a window of hours or days | Reasoned |
| Two at once | Smallest width; next unit by fit on all resources. Never "share whatever is the bottleneck now" | That rule gave 75 Mbps against 160 in one run with two flows | Quoted, one run |
| None | Starts one more unit per event until a width binds | | Quoted (additive increase) |
| PC blocks program starts | Outside the rule | | |

## Several writers on one file (this replaces the single workflow of `E:several-writers-options.md`)

- **Before work starts, from the change list** (r57-0128: 20 shared places). The 9 places that are separate
  entries or keys: own copies, merged later. The 7 ordered sequences and 4 places where the same statements
  change: a conflict is certain, so one owner at a time, or split first into separate entries (the skeleton
  step of r57-0401).
- **While work runs, per file.** Count conflicts: a merge that fails, or a merged result that fails the
  check. Above a threshold the file gets one owner. It goes back to own copies only after a set number of
  quiet units, and only between units. (The shapes of MOCC, Lim and CormCC; their numbers do not carry.)
- **The threshold is computed, not borrowed.** Switch to one owner when the chance of a conflict times the
  cost of redoing a unit exceeds the cost of waiting for the owner. Cost is counted in whatever is scarce
  now: tokens and check time for redoing, clock time for waiting. So the threshold is low when tokens or the
  check are scarce, and high when neither is. This applies r57-0301 (locking wins when resources are scarce,
  optimistic control when they are plentiful) file by file. Reasoned.
- **Every merge passes the check.** A clean textual merge is not a correct one (r57-0302, r57-0305).
  Transformation of operations is out for more than two writers, and a merge done by a model is untested
  (r57-0304).

## Numbers to compute here, and the measurement each one needs

Each is small. Each is an experiment, so each needs the owner's word (rule 3 of this repository).

1. Per class of unit: peak private memory and busy threads over time.
2. Time a unit spends outside the check, per piece and per change.
3. Does one suite run slow down when a second runs beside it.
4. The suite with its test files side by side (r57-0403).
5. Conflict counts: a merge of dummy edits on our own neighbouring lines (r57-0506).
6. Tokens per unit by class and by model; whether the 5-hour window is fixed or rolling; how cached reads
   count.
7. The lane's wait with one slot against two. The log already holds both periods, so this is a count, not
   a run.
8. A memory-bandwidth counter: only if 1 to 3 show slowdowns that memory and threads do not explain.

## Where the sources differed, and what was decided

- **The lane.** Record r57-0104 said heavy commands run one at a time. The lane's file says 2, and the log
  shows two running at once for 41 of the 324 minutes in which any ran. Corrected: r57-0801, r57-0127.
- **The worst-case bound with several resources.** It first rested on a lemma for another problem
  (splitting jobs across machines). It now rests on a 1975 result read only as restated; the restating
  sentence was checked in that paper's text.
- **Switch or not.** One report recomputes the widths at every event; the other warns against switching to
  "whatever is the bottleneck now". They agree: the smallest width over all resources is one rule, not a
  switch. The one real switch, the file method, gets a margin.
- **Stopping work.** One report says only at the memory floor; the other, from Borg, says kill for memory
  and throttle for processor. The same rule.

## Not covered

- Tokens beside processor and memory, and any allowance that refills over hours or days.
- A serial step shared by separate programs: every paper's serial section lives inside one program.
- Units that last minutes with 3 to 16 workers: one worker is 6 to 33 % of the level, so steps are coarse.
- Program starts blocked by the PC.
- 14 papers on scheduling and 18 on detection were not opened (scans without text, no public copy, one
  replaced by an RFC); they are listed in the collect files and in `o1-report.md`. None of the scheduling
  papers needed a sign-in.
