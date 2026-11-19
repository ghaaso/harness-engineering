# The decision rule, version 2 (decided 2026-11-19, its refutation folded in)

**Status: decided by the top session, and still a hypothesis. Nothing was run, measured or tuned. No number is set.**
Task r57-0515. `B:` = `docs/program/evidence/bottleneck-2026-11-18/`, `R:` = `docs/program/evidence/round3-2026-11-18/`,
`D:` = this folder. Version 1 (`B:DECISION-RULE.md`) is not edited: it stays as the record of how the rule began.

**What "decided" means here.** The draft `R:RULE-V2-DRAFT.md`, with its two checks folded in, is version 2 of the rule,
read with the changes of section 2 below. Where the draft and this file differ, this file decides. The draft's body
(its table of 38 conclusions, the rule step by step, the sizes, the 36 measurements Q01 to Q36, the build order, the
"not found" lists) is not copied here. This file holds what the top session added: a position on every point where a
lane of round 3 contradicted version 1, how each was reached, and what is still a guess.

**This file was itself refuted once** (`D:decide-refute.md`, a fresh Opus session; 21 points: 4 confirmed, 15 held in
part, 1 refuted, 1 could not be checked). It is written here as narrowed; no verdict was raised. Section 9 lists what
changed. The refuter's line numbers refer to the file as first written, commit `be65559`.

**What was read for it.** The draft in full; version 1 in full; `R:v2-refute.md` in full; the 41 draft records
(`library/journal/2026-11-19/v2.jsonl`); the answer of each lane report; the owner's rulings and the three version 1
records in the library; the intake rows of the three proposed corrections of those records; lane claims A74 and A82
with their refuter's lines. Not read by the top session: the lane reports beyond their answers, the collect files,
the papers. The five statements the draft's refuter could not check were checked by four readers (section 6).

**Marks**, as in the draft (r57-0010): `proven in the literature` (for its own field), `measured here`, `hypothesis`.
Every transfer to model sessions is a hypothesis. A company's own figure is self-reported (r57-0030).

## 1. The answer

1. **Version 2 is the draft as folded, with two changes of substance by the top session** (section 2), both narrowed
   by their refuter: capping starts at an even rate is not the standing answer for a token window, and a unit's model
   stays the one its kind of job is routed to.
2. **The frame of version 1 stands**: one calculation at every start and finish, the smallest width over all
   resources, acting only at the gate. Round 3 adds one width (the parent's window), makes the token row one row per
   window, and adds a second stop.
3. **Eight points where a lane contradicted version 1 are decided** (K1 to K8, section 3). Of twelve more that the
   draft's refuter found hidden, six are settled and six stay open, each with the measurement that settles it.
4. **Against version 1**: of 38 conclusions 8 are kept, 9 corrected, 2 replaced and 19 new. Replaced: the per-file
   switch between own copies and one owner (now seven ranked parts, with no owner by default), and the model rule.
5. **What the checks left of the draft**: of 145 numbered statements 86 confirmed, 53 held in part and were narrowed,
   1 was refuted and left the rule (dropping a whole-file CRDT on one preprint), 5 could not be checked then and are
   checked now (section 6).
6. **Nothing is proven for model sessions.** Every part is a mechanism proven elsewhere (databases, queues, job
   schedulers, ad budgets) or measured once, carried over by reasoning. Fifteen points are open, each with what the
   rule does until it is measured (section 5).
7. **No number is set.** The rule is in ratios. The 36 measurements are listed in the draft's section 5; none starts
   without the owner's word (section 8).

## 2. What the top session changed in the draft, and why

The draft was written and checked by child sessions while the top session's intake of round 3 ran beside them. They did
not have the intake's decisions, and their briefs did not name the owner's rulings on models.

**Change 1. An even-rate cap is not the standing answer for a token window (K1).**
- The draft: from the moment a window's used share runs ahead of its time share (u > s), the window caps starts at
  (1 − u)/(1 − s) of the even rate, while demand exceeds that rate (V2-004, V2-005, both "holds in part").
- What decides otherwise: the top session's adjudication r57-0813 of the same day, on the same lane claim (a1-0514):
  "Right about what the published pacing rules do, but their measured gain comes from spreading spend over a day; with
  equal value per token, spending at once finishes the same units sooner." The replacement the intake drafted kept the
  limit from u > s only "when demand exceeds a window and units differ in value".
- This session's reasoning, and what its refuter left of each step:
  1. *For waiting work of equal value, spending at once finishes each unit sooner and the same units by the reset.*
     Holds in part: only if no running unit is cut off at the limit, and apart from the two token costs of side-by-side
     work that version 1 names (a redo after a conflict, a waiting session's re-read). An allowance spent at once ends
     before its reset; a unit that overruns its expected usage then stalls until the reset or is redone, where even
     spending would have let the fresh window take the overrun. The last-two predictions run short often enough to
     matter (V2-022).
  2. *Where waiting units differ in value, the gain is in their order.* Stands: the large published gain, Yahoo's cost
     per click down 67 to 79 % (self-reported, three campaigns), came from ranking by value on a baseline that also
     paced. It was first credited here to spreading spend; that was wrong.
  3. *Holding starts back gains only for demand that has not arrived yet.* Holds in part. Such demand is of two kinds.
     Certain: the other clients on the same windows, and units that must not stall; a reserved share answers it and
     needs no value per unit (v2-0410). Possibly worth more: a price answers it, a unit starting only if its value per
     token is at least what a token is expected to buy later in the window (the bid-price form). Yahoo's even
     re-planning carries no value and answers neither.
  4. *An even-rate cap also slows a burst whose total would have fitted the window.* Added after the refutation; not
     checked by anyone.
- Decided, as the standing answer until Q33:
  (a) **Fit, always.** A unit starts only if its usage fits in what every window it draws on has left, above the
  reserve. Until usage per unit is measured the reserve is the caps of the running units, as the draft's own
  measurement table says, so that with caps enforced (the second stop) no running unit is cut off at the limit.
  (b) **Order.** When the waiting work is more than a window can pay for before its reset, the highest value per token
  goes first; with equal values, the fewest expected tokens.
  (c) **Held back.** A reserved share for units that must not stall and for the other clients on the same windows;
  it has no number yet. Once units have values, a price.
  (d) **Not adopted:** capping starts at (1 − u)/(1 − s) of the even rate from u > s. It stays an arm of Q33.
  This differs from the text the intake drafted for the same record: there the u > s limit stayed for "demand exceeds a
  window and units differ in value"; here that case is answered by order and by price.
- Mark: (a) `proven in the literature` for meters that know a cost on arrival, `hypothesis` for expected usage and
  caps; (b) `proven in the literature` as one company's account, `hypothesis` here; (c) and (d) `hypothesis`.
- It changes in the draft: answer 2; table rows 4, 5 and 9; Step 1 "each token window"; Step 4 point 2, whose
  condition becomes "while a window cannot pay for all the waiting work"; K1; the lines named under change 4.

**Change 2. The model of a unit is the one its kind of job is routed to (part of K7).**
- The draft: the model with the highest value minus the summed window price times its window usage, a redo counted;
  "until pass rates exist (Q16), the better model runs" (V2-015, "holds in part"; lane claim A74, PARTIALLY).
- What decides otherwise: the owner's rulings. The smallest model that gives the same output (r57-0005); the routes
  from kind of job to model are enforced, not only written (r57-0025); the routes themselves (r57-0150). No file of
  the lane, the draft or its refuter names them (the refuter of this file confirmed that by search).
- What the refuter left of this change (holds in part):
  1. The routes rest on the ruling, not on a measurement. No record compares a smaller model with a larger one;
     r57-0201 is the one run of the orchestration design, in which nothing failed on record.
  2. So this departs from version 1's sentence as well ("the cheaper model only where its gap was measured small"):
     the routes put smaller models on kinds of work where no gap was measured. The ruling carries that, and it is said
     here so that nobody reads the routes as measured.
  3. "At the same output the smaller model wins" holds only if it charges less window usage. The models' weights in
     the windows are not known (Q10).
  4. The rule cannot move a unit off its route. A move is an edit of the routes file, which is outside the rule.
- Decided. A unit runs on its route's model; "the better model until Q16" is not adopted. The draft's formula stays a
  hypothesis about what measured pass rates (Q16) and measured weights (Q10) would justify changing in the routes.
  The token window does not choose the model.
- Mark: `hypothesis`; no source read applies a window price to the choice of a model, and no saving read is in tokens
  on code.
- It changes in the draft: answer 3 (last sentence), table row 8, Step 4 point 5, K7, the until-column of Q16, B10.

**Change 3. A narrowing that went too far is corrected (V2-001).** Confirmed by the refuter. The draft says version 1
"kept tokens a budget, not a width", so that the windows join the minimum "only by lane a1's inference". Version 1's
width table has a token row: "the units the window can still pay for, above a reserve" (`B:DECISION-RULE.md`, Step 1;
r57-0408). What round 3 adds is one row per window, fit in every one of them, and what the reserve is.

**Change 4. Lines of the draft's sections 5 and 6 that follow from changes 1 and 2 and from K7.**
- Q33 (pacing at tens of units, a simulation) gains the arm "spend at once with the reserve at the caps", counts
  units cut off at a limit, and is swept over how work arrives. It is not swept over values: no method gives a value
  per unit yet (Q17), so that sweep could change nothing done next (r57-0004).
- Until-columns: Q01 "version 1's order", not "first come, first served"; Q10 "admission by fit above the reserve";
  Q13 "no early finish; spends at once"; Q16 "the route's model"; Q17 "equal values: fewest expected tokens first
  while a window cannot pay for all"; Q33 "no even-rate cap".
- B2 and B10: the re-planned rate is built inert; B10 builds fit and the reserve per window.

**Three points the draft left open, and what the record gives for each.**
- *The form of the second stop (K6).* The draft's "commit what the unit has and end" is kept. The owner's ruling on
  handing over through files (r57-0008) supports it by likeness only: that ruling is about a session at its context
  ceiling passing its work to a fresh child. For a unit stopped at a cap the rest of its work must also pass to a
  successor through files, which the draft does not spell out. No source gives the form; it is untested. An
  unenforced ceiling was overrun here (r57-0604: a coordinator at 404,000 tokens, later 527,000).
- *One owner (K9).* No file gets one owner by default. Confirmed: the owner rejected "one writer per file" as the
  coarsest lock (r57-0012), and lane claim W20 gives the mechanism (one wrong escalation stops every writer of the
  file), as an argument with no measurement.
- *A leaf that outgrows its window (K17).* Not decided. The file as first written said the tree's design hands over;
  the refuter showed that the design's own rules disagree (R50 and D3-12 hand over; R49 and D3-01 split;
  `research-tree/FAULTS-AND-FIXES.md` says so). The choice stays open, as the draft's refuter left it. Nothing new is
  built for it until Q30.

## 3. Each point where a lane contradicted version 1: how it was reached, what is decided

K1 to K8 are the points the draft settled; K9 to K20 are those its refuter found hidden. "Checks" = what the lane's
refuter, the draft's refuter and this file's refuter left. Company figures are self-reported.

| K | Point | Version 1 said | Round 3 found, and in what kind of source | What the checks left | Decided | Still a guess; settled by |
|---|---|---|---|---|---|---|
| K1 | When a token window limits | Only when it is nearly spent; a budget, not a rate | Lane a1: the published pacers act from u > s. Yahoo re-plans the rest over the rest; LinkedIn steps a rate each minute (both company accounts); a price form in theory | The inference holds only while demand exceeds the rate. The intake: with equal value per token, spending at once finishes the same units sooner. This file's refuter: only if no running unit is cut off at the limit | Change 1: fit above a reserve at the running units' caps; order by value per token when the window cannot pay for all; a reserved share and a price for what has not arrived; no even-rate cap | Whether any pacer gains for us (Q09, Q14, Q33); a value per unit (Q17); the size of the reserved share |
| K2 | How several windows combine | One token row; the lane's first frame: the dearer price binds | Fit in every bucket: ATM's rule (a specification; RFC 2698 marks a packet and still passes it). Price = the sum of the prices of all capacity used: revenue management, bandits with knapsacks (theory) | Fit is proven only where a cost is known on arrival. The sum is exact only for additive costs, not shown for windows that count the same tokens. Published for limits of one kind only (r57-0814) | A unit starts only if it fits in every window it draws on; its price is the sum | Which windows a unit draws on (Q11); sizes, and whether windows count alike (Q10) |
| K3 | Fixing the order of writes before work | Place by place, from the change list, before work | Lane w1: a fixed order needs every unit's read and write sets first (Calvin; Aria: 2.4 times Calvin at low contention, 39 % of itself at extreme skew). Sessions learn theirs while working. A plan ordered by dependencies helped in one preprint (56.8 to 68.1 %, one model) | Confirmed | Only what a plan declares is ordered before work, its claims in one fixed order. A place found while working is claimed in resource order, by wait-die, or validated at landing | Whether a plan's file list matches what a session touches (Q07); which of the three for found places (Q08) |
| K4 | Worker cap of a check with several slots | Slots × (time outside + inside) / inside, "a textbook bound, reasoned" | Lane c1: N = c(S + Z)/S. Published for one slot (Denning and Buzen 1978; Lazowska 1984). For c slots no source states it: computed on the exact model in 16 cases, and derived from two bounds that hold for any distribution | Confirmed. Lane w1's "the check binds when T < 10N minutes" is the same bound with one slot and a worker that goes on. That changes wait below the cap holds in part: the wait figures are the exponential model's | One formula: the check binds when N·S/c reaches the worker's cycle (S + Z if it waits, Z if it goes on). Changes already wait below the cap | That S and Z do not change with N; whether two runs side by side keep full speed (Q20); Z (Q06) |
| K5 | Which kind of tree for which size | No tree. The tree design: three levels, never more | Lane t1: by leaves against children per parent (L against b), and realised over estimated work against 1/f. Database index results; agent hierarchies from two studies | In part: the schemes differ under extreme contention (K18); no new keys arrive during a run (K19) | Small job: the bulk-loaded two-level tree as built. Very large job: more coordinator epochs or an inner level, whichever costs fewer tokens. A leaf that overflows: K17 | The tree never ran. Tokens per wake, summary size (Q03, Q04) |
| K6 | When running work is stopped | Only at the memory floor | Lane t1: the tree's budget cut already stops running work. Lane a1: a reservation promises a start time only if units end at their caps; EASY kills at the stated length and loses the work (supercomputer schedulers) | In part: "commit and end" has no source, and the ruling on hand-overs supports it by likeness only | A second stop: a unit at its own cap commits what it has and ends, the rest of its work passing to a successor through files. A window's limit adds no stop of ours | The form itself; work lost since the last commit (Q02); the spend rate that turns a token cap into a time (Q01) |
| K7 | What starts next, and on which model | Shortest expected check first, then oldest, an age cap; the cheaper model only where its gap was measured small | Lane a1: a reservation for the oldest unit that does not fit, shorter ones backfilled (EASY++ against EASY: wait −23 %, bounded slowdown −37 %, four real logs replayed in a simulator, 100 to 1,152 processors); value per token while a window limits (Yahoo, its own account); the model by price | Reservation: confirmed, as a transfer. For units that need only a worker it reduces to first come, first served, which is not evidence that this order is good: shortest first lowered waits. Model: no source applies it. Value per token against the reservation: not ranked by any claim | Reservation and backfill where a unit needs a share of something not free, together with K6's stop. Where every unit needs only a worker, version 1's order stays, age cap included. The model: change 2 | Whether it holds at 3 to 16 workers, and the order for one-worker units (Q34); which of value per token and the reservation goes first when a window is the thing not free (Q34 with Q17); pass rates by kind and model (Q16) |
| K8 | Wait, or redo, on a shared place | One owner where a conflict is likely, when tokens or the check are scarce | Lane w1: no general direction is published. With locks, waiting beat no-wait as transactions grew; in Silo no-wait won | Settled in part: one source agrees with version 1 in direction, another rules out a general rule; a bound the lane had claimed was refuted | Version 1's product stays, per pair and with no direction given: wait when the chance of a conflict times the tokens of a redo exceeds the cost of the wait | The crossover in tokens (Q02, Q25) |
| K9 | One owner of a file | One owner wherever a conflict is likely, and for 11 of our 20 shared places one owner at a time or a split into separate entries first | An owned store won 1.54 times with no crossing and lost to optimistic control from about 20 % crossing (Silo). One wrong escalation stops every writer | In part: the crossover lies between the two and is not located; Silo's owner is a partitioned store, not one writer at a time | No owner by default (r57-0012; W20). One owner survives as waiting for a known hot pair, and of a whole file only where a measurement shows it pays. Reshaping takes over the ordered sequences where it applies | Where an owner pays (Q07, Q08 with one writer at a time as an arm) |
| K10 | Who writes the tree's run-state files | (no tree) | Lane t1: one script step under the run lock. Lanes w1 and t1: the task table is written today by compare-and-set on its revision | In part | A script step, never a session (cost: seconds of file work against minutes and a window re-read). Lock or compare-and-set: open; compare-and-set stays as built until Q31 | Splits per hour, seconds per posting (Q31) |
| K11 | What a part is chosen against | Quality first, then the least time, memory and tokens | Lane t1: measured tokens, memory the hard limit | In part: the token figures show where tokens go, not that tokens bind first | The ruled objective (r57-0003). Memory stays the hard limit | Whether tokens bind ahead of memory (Q09, Q10, Q19) |
| K12 | Units of minutes with 3 to 16 workers | "No paper among those read" | No real system found. Two near cases: a 1977 simulation of units of minutes, about 10 sharing one I/O path; one CI project with few concurrent builds | Corrected to this | Stated as found: no real system, two near cases. Every published size is for other scales | That the shapes carry to sessions (all measurements) |
| K13 | Whether a paper's numbers carry | Only the shape carries | One reading put a number in: "about 10 coarse granules suffice" (the 1977 simulation) | The draft's refuter left it unsettled; the fold took the number out, on version 1 and three lane claims that say only shapes carry | Only the shape carries; every constant is a measurement | Every constant |
| K14 | A window's price while it is under its line | (no price) | Lane a1 as first written: zero while u ≤ s | Corrected: under the price form it stays positive after a lull, and a burst of large units raises it | The corrections stand | Sizes (Q10); values (Q17) |
| K15 | How much is redone after a refused write | A whole unit | STORM's design: one write, re-planned from a diff. The lane's refuter: a refusal for a changed read also undoes the steps built on that read | Both, by case | One write when the refusal concerns that file alone; the steps built on the read when a read changed. Which dominates: open | Q02 |
| K16 | The grain of a claim below the file | (per file) | Coarse granules sufficed in the 1977 simulation; in another study coarse locks held to the end of 10-step units deadlocked | Not settled | Open. The grain is measured; until then file grain, own copies | k and F per file (Q07); the replay (Q08) |
| K17 | Split, or hand over, a leaf that outgrows its window | (no tree) | Lane t1 first proposed a split of the unstarted keys in the B-link form | The decision was refuted and the choice left open: the B-link reading gives a split's mechanism, not the choice. The tree's own rules disagree (R50 and D3-12 hand over; R49 and D3-01 split) | Open. Nothing new is built: the split (piece B17) waits for Q30. A split, if chosen, takes the B-link form | A hand-over's reload against a new leaf's start cost (Q30) |
| K18 | When the index schemes are alike | (no tree) | When one resource binds | Except under extreme contention (one processor, one disk, heavy appends), where a pessimistic scheme won | The exception stands | None for the small case |
| K19 | New keys during a run | (no tree) | The lane counted them as a third feature | Keys are frozen during a run (R46) | None arrive; a leaf overflows only from estimate error | The spread of the estimate (Q29) |
| K20 | Which lever of the check comes first | "Makes the check wider or shorter" | Lane c1 ranked: shorten, batch, test ahead, let a waiting worker go on. Shorter runs: 32 % on average, 54 % on long suites (Ekstazi). Batching: 41 to 72 % fewer runs (Ericsson data, simulated) | The ranking failed: the one shortening open at our gate (test files side by side) is untested, and the one study with few builds points both ways for us | Open. Making the queue visible comes first because every other lever and their measurements need it | Q21 (do the test files run side by side), Q05 (check time, failure rate), Q07 (changes that touch `lib`) |

Two more, outside the K rows. **A CRDT of a whole file** is neither used nor ruled out: the draft dropped it on one
preprint, and the refuter showed that the same preprint's per-character figures favour the parallel mode in 5 of 6
tasks; one preprint does not rule a family of methods out (Q36). **Version 1's "three parts have no paper"** is
withdrawn: round 3 read papers on a refilling allowance and on a shared check; nested windows that count the same
tokens still have none read.

## 4. The rule in short

Version 2 keeps version 1's steps. In order:

0. **Measure each class of unit first.** A length and a usage are predicted as the mean of the last two finished
   units of the class and model, raised to the cap when a unit outruns them; the cap is a limit, never the prediction.
1. **A width per resource.** Memory (the hard limit), processor, memory bandwidth and ready work as version 1 has
   them. The check: it binds when N·S/c reaches a worker's cycle. Each token window: fit above the reserve (change 1).
   The parent's window: how many children one parent can hold between two of its hand-overs.
2. **Run at the smallest width**, recomputed at every start and finish.
3. **Act only at the gate. Two stops**: the least important unit at the memory floor; a unit at its own cap commits,
   hands the rest over and ends. The token limit is enforced at the gate and also shown in the prompt.
4. **The next unit.** Fit is a filter. When a window cannot pay for all the waiting work, the highest value per token
   first. Where a unit needs a share of something not free, a reservation for the oldest unit that does not fit,
   shorter units behind it only if they do not delay it. Which of those two goes first when a window is the thing not
   free is open. Where every unit needs only a worker: the shortest expected check first, then the oldest, with a cap
   on age so that none starves. The model: its route's (change 2).
5. **Cross-check with the wait at the check**; 6. **a slow outer check** of throughput against workers.
7. **The check's levers**, in no order of gain: shorten the run; batch what waits, capped by the failure rate; test
   ahead on the success path; let a waiting worker go on, with a cap. First, make the queue visible.
8. **Several writers**, seven parts ranked by expected gain: reshape shared places so that writes commute or land at
   integration; version-checked writes; claims below the file; wait for a known hot pair (one writer at a time on
   it); checkpoints; every landing through the check in one order; structured merge. No file gets one owner by
   default; an owner of a whole file is the last resort inside part 3. The floor: own copies, and every merge passes
   the check.
9. **The tree**: the two-level tree for a small job; fewer parent wakes as the largest expected gain; fill computed
   from the spread of the estimate; epochs or an inner level, by tokens, for a very large job. Split or hand over for
   a leaf that overflows: open.

The full wording, the sources and the mark of each step are the draft's section 3, read with section 2 above.

## 5. What is still a guess, and what the rule does until it is measured

Everything is untested for model sessions; the tree never ran, and no gate exists yet. No number is set. The open
points, each with its standing answer:

| Open point | Until it is measured the rule | Settled by |
|---|---|---|
| Whether any pacer gains for us | Caps no starts at an even rate; admits by fit above the running units' caps | Q09 (arrivals), Q14 (forecast error), Q33 (the simulation, widened) |
| The reserved share for units that must not stall and for other clients | Holds none: it has no number | Q01 (reruns), Q09 and Q10 (other clients' use); no lane names a measurement for the share itself |
| A price for work worth more | All values equal: fewest expected tokens first when a window cannot pay for all | Q17: no lane says how a value per unit is measured |
| A smaller model for a kind of job | Uses the route's model | Q16 (pass rate, usage and redo by kind and model), Q10 (weights) |
| The order for units that need only a worker | Shortest expected check first, then the oldest, with a cap on age | Q34 |
| Value per token against the reservation when a window is the thing not free | Ranks by value per token among the units a reservation lets start | Q34 with Q17 |
| The form of the second stop | Commits, hands the rest over through files, ends | Q02, and the pilot |
| Where one owner pays | No owner | Q07, Q08 |
| The grain of a claim | File grain, own copies | Q07, Q08 |
| How much a refused write undoes | Gives wait-or-redo no direction | Q02 |
| Split or hand over | Builds no split; the tree as built | Q30 |
| Run lock or compare-and-set | Compare-and-set, as built | Q31 |
| Which lever of the check first | No lever; two slots, one file at a time | Q21, Q05, Q07 |
| A whole-file CRDT | Own copies; neither used nor ruled out | Q36 |
| Whether tokens bind ahead of memory | Memory is the hard limit | Q09, Q10, Q19 |

The 36 measurements, by kind (the draft's section 5): 6 are counts over files that exist and need no run (Q01, Q02,
Q05, Q06, Q07, Q09); 6 are readings of the usage meter (Q10 to Q15); 4 are simulations (Q08, Q33 to Q35); 13 are runs
(Q19 to Q30, Q36: on the PC, in the pilot, or one probe); 6 are counts once the data exist (Q03, Q04, Q16, Q18, Q31,
Q32); for 1 no method is known (Q17). The three that set the most numbers are Q01, Q05 and Q10.

## 6. The five statements that had not been checked

V2-108 to V2-112 are the draft's lists of what no lane found and of the papers not opened (its section 7). The
draft's refuter was not shown the lane reports they rest on. Four readers (Sonnet, kind read, one per lane, brief
`D:brief-notfound-check.md`) compared each item with the lane's report, its collect files, its claims and its refute
file. Their files are `D:notfound-check-c1.md`, `-w1.md`, `-t1.md`, `-a1.md`; the top session read all four.

**Result: no "not found" is contradicted by a source the lane itself held. One statement holds; four hold in part,
because the draft words some items wider than the lane's report does.** No conclusion of the rule changes.

| Statement | Verdict | What fails |
|---|---|---|
| V2-108 (the check) | holds in part | Three items lost their limit. "A paper on splitting a suite over machines" is, in the report, a paper whose subject is that; one paper read measures machine count against feedback time by replay. "A measured gain of drum-buffer-rope" is "against a plain release rule", and one candidate was read as an abstract only. "A before-and-after of batching in production" covers the six accounts read. The item on batch service rests on a paper that was paywalled and not read |
| V2-109 (several writers) | holds in part | Two items are wider than the report: one preprint (CodeCRDT) does give a 60-run inspection of semantic conflicts, whose figures do not reconcile, and a spread over repeated runs. Four items of the report are missing from the draft (a conflict rate for Google's trunk; how often Figma or Google Docs drops an edit; a first-hand text on Meta's rebase; a migration forced by write contention). The "fake restart" assumption of Agrawal, Carey and Livny is in the lane's own report, not only in its refuter's |
| V2-110 (the tree) | holds | All four items stand in the report's sense, "not found in the papers read". For three the search words are not stated, and the law for structure changes per insert may sit in a paper that was not opened (Baeza-Yates 1989) |
| V2-111 (the allowance) | holds in part | Two items were never searched for, so they are "not searched", not "not found" (r57-0029): a team's account of hitting a usage limit, and project scheduling with rough durations. Cache weight is partly known: on claude.ai projects cached content counts less; nothing is stated for Claude Code. One item of the report is missing (throttling against bid shading on one workload) |
| V2-112 (papers not opened) | holds in part | The lists match the reports, and each paper's reason stands in a collect file. Three are filed wrongly as sign-in cases: the ICSME 2021 paper (its downloads failed; a retry may open it), Mu'alem and Feitelson 2001 (needs OCR), and for Balseiro, Kim, Mahdian and Mirrokni the recorded failure is a missing file, the 403 being the other Balseiro paper's. Four of the tree's are paywalled or sold. Missing from the list: Mohan 1990 and Stonebraker 2007 (both refused with 403) and the 1987 sagas paper (no text layer) |

What this changes: the board's "Known gaps" (the two items not searched, the cache weight, the three missing papers,
the papers that are not sign-in cases). Limits of the check: one reader per lane, no second reader; the papers
themselves were not opened (they are not in the repository).

## 7. Records

Written to `library/journal/2026-11-19/r57.jsonl` after the refutation, so that no record carries a claim that failed:
- r57-0414 replaces r57-0408 (the rule: frame, stops, tokens) and the draft records v2-0400 and v2-0402. Its text is
  this file's, not the text the intake had drafted under the same number.
- r57-0415 replaces r57-0409 (the next unit, the model) and the draft record v2-0405.
- r57-0410 replaces r57-0406 (several writers: the ranked parts, no owner by default).
- r57-0841 to r57-0845: the decisions (version 2 as a whole; K1; the model; several writers; the five statements).
- r57-0141 closes task r57-0515. r57-0516 replaces r57-0513 (the measurements, now Q01 to Q36).
- r57-0612: the mistake behind changes 1 and 2 (a brief that did not name the rulings that bind the content).
  r57-0613: the top session's own mistake, the overstatements of section 9.
- r57-0710 and r57-0711: where the rule and the owner's page are.
The other 38 draft records (v2-0401, v2-0403, v2-0404, v2-0406 to v2-0440) stand as the rule's hypotheses.

## 8. What comes next

Nothing starts without the owner's word (r57-0007; rule 3 of this repository). In the order r57-0515 set: the six
counts over transcripts, the lane log and history that already exist on the owner's PC; then the simulations swept
over project sizes, so that no number is tuned to one repository (r57-0028); then the runs. The papers that need the
owner's sign-in are listed in the draft's section 7 and on the board under "Known gaps".

## 9. What the refutation of this decision changed

`D:decide-refute.md`: 21 points; confirmed 4 (change 3; no owner by default; the rest of section 3; the counts), held
in part 15, refuted 1, could not be checked 1 (the records of section 7 were not yet written). The fold raised no
verdict.

1. **Change 1 was too strong.** As first written: "the window buys the same units by the reset whether spent at once
   or evenly". That fails where a running unit is cut off at the limit, and it leaves out the token costs of
   side-by-side work. Narrowed: the reserve is the running units' caps; the two conditions are stated.
2. **The tool for holding back was wrong.** As first written, starts were held back "at the re-planned rate" for
   later work worth more. Yahoo's re-planning carries no value. Replaced by a reserved share for certain demand and a
   price for work worth more.
3. **A figure was credited wrongly.** Yahoo's cost per click was listed among the gains of spreading spend; it came
   from ranking by value. And r57-0813's condition, "equal value per token", had been reworded as "work that already
   waits" and still put in its mouth. Both corrected.
4. **The reserved share** (v2-0410) had been called a form of pacing that waits for a value per unit. It needs none,
   and it stands as its own part with no number.
5. **Change 2 lost its support from a run.** "The routes ran and worked once" rested on a record about another
   design, in which no model was compared with another. The routes now rest on the ruling alone, and the departure
   from version 1's "only where the gap was measured" is said. "The smaller model wins at any price" got its
   condition (it must charge less window usage). The window no longer chooses the model in change 1.
6. **The hand-over was not the record's answer.** The tree's own rules disagree. K17 is open again; nothing is built.
7. **The second stop's form** rests on the ruling by likeness only, and the rest of a stopped unit's work has to go
   somewhere. Said, and listed as open.
8. **Refuted: the age cap had been dropped** from the order for units that need only a worker. It is back; without a
   reservation it is the only guard against a unit that never starts.
9. **Two orders for one case.** When a window is the thing not free, value per token and the reservation both
   apply, and no claim ranks them. Listed as open.
10. **Checks columns that said more than the checks**: K8 ("confirmed" became "settled in part"), K13 (the draft's
    refuter left it unsettled), K4 (the waits below the cap hold for the exponential model), K9 (version 1's "or
    split first"). "An owner last" in the answer was an eighth rung that the list of seven did not have.
11. **Lines of the draft left disagreeing** with the changes are now named in change 4 (Q01, Q10, Q13, Q16, Q17,
    Q33, B2), and Q33 is no longer swept over values that nothing can measure yet.

Not checked by anyone: step 4 of change 1 (an even-rate cap slows a burst that would have fitted), which was added in
the fold; this section; and section 6 beyond its one reader per lane.
