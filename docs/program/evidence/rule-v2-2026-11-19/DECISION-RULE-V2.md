# The decision rule, version 2 (decided 2026-11-19)

**Status: decided by the top session, and still a hypothesis. Nothing was run, measured or tuned. No number is set.**
Task r57-0515. `B:` = `docs/program/evidence/bottleneck-2026-11-18/`, `R:` = `docs/program/evidence/round3-2026-11-18/`,
`D:` = this folder. Version 1 (`B:DECISION-RULE.md`) is not edited: it stays as the record of how the rule began.

**What "decided" means here.** The draft `R:RULE-V2-DRAFT.md`, with its two checks folded in, is version 2 of the rule,
read with the changes of section 2 below. Where the draft and this file differ, this file decides. The draft's body
(its table of 38 conclusions, the rule step by step, the sizes, the 36 measurements Q01 to Q36, the build order, the
"not found" lists) is not copied here. This file holds what the top session added: a position on every point where a
lane of round 3 contradicted version 1, how each was reached, and what is still a guess.

**What was read for it.** The draft in full; version 1 in full; `R:v2-refute.md` in full; the 41 draft records
(`library/journal/2026-11-19/v2.jsonl`); the answer of each lane report; the owner's rulings and the three version 1
records in the library; the intake rows of the three proposed corrections of those records; lane claims A74 and A82
with their refuter's lines. Not read by the top session: the lane reports beyond their answers, the collect files,
the papers. The five statements the draft's refuter could not check were checked by four readers (section 6).

**Marks**, as in the draft (r57-0010): `proven in the literature` (for its own field), `measured here`, `hypothesis`.
Every transfer to model sessions is a hypothesis. A company's own figure is self-reported (r57-0030).

## 1. The answer

1. **Version 2 is the draft as folded, with two changes of substance by the top session** (section 2): tokens are not
   paced by default, and a unit's model stays the one its kind of job is routed to.
2. **The frame of version 1 stands**: one calculation at every start and finish, the smallest width over all
   resources, acting only at the gate. Round 3 adds one width (the parent's window), makes the token row one row per
   window, and adds a second stop.
3. **Eight points where a lane contradicted version 1 are decided** (K1 to K8, section 3). Twelve more that the
   draft's refuter found hidden are decided or left open with the measurement that settles each (K9 to K20).
4. **Against version 1**: of 38 conclusions 8 are kept, 9 corrected, 2 replaced and 19 new. Replaced: the per-file
   switch between own copies and one owner (now seven ranked parts, an owner last), and the model rule.
5. **What the checks left of the draft**: of 145 numbered statements 86 confirmed, 53 held in part and were narrowed,
   1 was refuted and left the rule (dropping a whole-file CRDT on one preprint), 5 could not be checked then and are
   checked now (section 6).
6. **Nothing is proven for model sessions.** Every part is a mechanism proven elsewhere (databases, queues, job
   schedulers, ad budgets) or measured once, carried over by reasoning. Twelve points are open, each with its
   measurement and with what the rule does until then (section 5).
7. **No number is set.** The rule is in ratios. The 36 measurements are listed in the draft's section 5; none starts
   without the owner's word (section 8).

## 2. What the top session changed in the draft, and why

The draft was written and checked by child sessions while the top session's intake of round 3 ran beside them. They did
not have the intake's decisions, and their briefs did not ask them to weigh the owner's rulings on models.

**Change 1. Tokens are not paced by default (K1).**
- The draft: from the moment a window's used share runs ahead of its time share (u > s), the window caps starts at
  (1 − u)/(1 − s) of the even rate, while demand exceeds that rate (V2-004, V2-005, both "holds in part").
- What decides otherwise: the top session's adjudication r57-0813 of 2026-11-19, on the same lane claim (a1-0514). The
  pacing rules are read correctly, but their measured gain (campaign life, reach, cost per click: Yahoo and LinkedIn,
  self-reported) comes from spreading spend over a day in which better chances to spend keep arriving. For work that
  already waits, the allowance buys the same units by the reset whether it is spent at once or evenly, and spent at
  once each unit finishes sooner. Time comes second in the ruled objective, after quality (r57-0003).
- One step further, the top session's reasoning: when waiting units differ in value, the answer is their order (the
  highest value per token first, V2-017), not holding starts back. Holding back gains only for work that has not
  arrived yet and is expected to be worth more per token than what waits. That is the case the pacers were built for,
  and nothing here measures it.
- Decided. A window limits in three ways. (a) Always, by fit: a unit starts only if its expected usage fits in what
  every window it draws on has left, above the reserve for the running units. This is version 1's "nearly spent",
  made exact. (b) It decides how many units are done before the reset, in which order and on which model, as version 1
  said: when the waiting work is more than the window can pay for, the highest value per token goes first. (c) It
  holds starts back from u > s, at the re-planned rate, only for work expected later in the same window that is worth
  more per token than what waits. Until units have a value and arrivals are counted (Q17, Q09), (c) does nothing: the
  rule spends at once and keeps the reserve. The reserved share for units that must not stall (v2-0410) is the
  simplest form of (c) and has no number either.
- Mark: (a) `proven in the literature` for meters that know a cost on arrival, `hypothesis` for expected usage; (b)
  and (c) `hypothesis`, the top session's reasoning on quoted pacing rules.
- It changes: draft answer 2, table rows 4 and 5, Step 1 "each token window", K1, Q33 and build piece B10 (below).

**Change 2. The model of a unit is the one its kind of job is routed to (part of K7).**
- The draft: the model with the highest value minus the summed window price times its window usage, a redo counted;
  "until pass rates exist (Q16), the better model runs" (V2-015, "holds in part"; lane claim A74, PARTIALLY).
- What decides otherwise: the owner's rulings. The smallest model that gives the same output (r57-0005); the routes
  from kind of job to model are enforced, not only written (r57-0025); the routes themselves (r57-0150), whose tier
  rows ran and worked once (r57-0201). Neither the lane, the draft nor its refuter weighed them: no file of theirs
  names them.
- Decided. Until pass rates by kind and model exist (Q16), a unit runs on its route's model, not on "the better
  model". The draft's formula is the ruling's own test written in tokens: at the same output the smaller model wins
  at any price, and where outputs differ the redo is counted. It moves a kind of job to a smaller model only where a
  pass rate for that kind was measured, and never to a model the routes refuse.
- Mark: `hypothesis`; no source read applies a window price to the choice of a model, and no saving read is in tokens
  on code.
- It changes: draft answer 3 (last sentence), table row 8, Step 4 point 5, K7, the "until" column of Q16, B10.

**Change 3. A narrowing that went too far is corrected (V2-001).** The draft says version 1 "kept tokens a budget, not
a width", so that the windows join the minimum "only by lane a1's inference". Version 1's width table has a token row:
"the units the window can still pay for, above a reserve" (`B:DECISION-RULE.md`, Step 1; r57-0408). What round 3 adds
is one row per window (the 5-hour period, the week, on some plans a week for one model), fit in every one of them,
and what the reserve is: the expected remaining usage of the running units.

**Change 4. One measurement is widened, one build piece narrowed.** Q33 (pacing at tens of units, a simulation) gains
the arm "spend at once with the reserve" beside re-planning and the price form, and is swept over how work arrives
and how far values differ, since change 1 makes those two decide whether pacing gains at all. B10 builds fit and the
reserve per window; its re-planned rate stays inert until a value per unit exists.

**Three open points get their standing answer from the record, not from a new choice.**
- The second stop's form (K6) is "commit what the unit has and end". The owner already ruled that a session at its
  ceiling hands over through files (r57-0008), a kill loses the work (EASY), and an unenforced ceiling was overrun
  once here (r57-0604: a coordinator at 404,000 tokens). The form has no published source and is untested.
- No file gets one owner by default (K9): the owner rejected "one writer per file" as the coarsest lock (r57-0012),
  and lane claim W20 gives the mechanism (one wrong escalation stops every writer of the file).
- A leaf that outgrows its window is handed over, not split (K17), as the tree's recorded design says (R50; D3-12: a
  field is not split in the middle of its research). A split is built only if Q30 shows it costs fewer tokens.

## 3. Each point where a lane contradicted version 1: how it was reached, what is decided

K1 to K8 are the points the draft settled; K9 to K20 are those its refuter found hidden. "Checks" = what the lane's
refuter and the draft's refuter left. Company figures are self-reported.

| K | Point | Version 1 said | Round 3 found, and in what kind of source | What the checks left | Decided | Still a guess; settled by |
|---|---|---|---|---|---|---|
| K1 | When a token window limits | Only when it is nearly spent; a budget, not a rate | Lane a1: the published pacers act from u > s. Yahoo re-plans the rest over the rest; LinkedIn steps a rate each minute (both company accounts); a price form in theory | The inference holds only while demand exceeds the rate. The intake: the gain is from spreading spend over a day; for waiting work, spending at once finishes sooner | Change 1: fit always; order by value per token when the window cannot pay for all; holding back only for later work worth more | Whether our demand exceeds the windows (Q09, Q10); a value per unit (Q17); pacing against spending at once (Q33) |
| K2 | How several windows combine | One token row; the lane's first frame: the dearer price binds | Fit in every bucket: ATM's rule (a specification; RFC 2698 marks a packet and still passes it). Price = the sum of the prices of all capacity used: revenue management, bandits with knapsacks (theory) | Fit is proven only where a cost is known on arrival. The sum is exact only for additive costs, not shown for windows that count the same tokens. Published for limits of one kind only (r57-0814) | A unit starts only if it fits in every window it draws on; its price is the sum | Which windows a unit draws on (Q11); sizes, and whether windows count alike (Q10) |
| K3 | Fixing the order of writes before work | Place by place, from the change list, before work | Lane w1: a fixed order needs every unit's read and write sets first (Calvin; Aria: 2.4 times Calvin at low contention, 39 % of itself at extreme skew). Sessions learn theirs while working. A plan ordered by dependencies helped in one preprint (56.8 to 68.1 %, one model) | Confirmed | Only what a plan declares is ordered before work, its claims in one fixed order. A place found while working is claimed in resource order, by wait-die, or validated at landing | Whether a plan's file list matches what a session touches (Q07); which of the three for found places (Q08) |
| K4 | Worker cap of a check with several slots | Slots × (time outside + inside) / inside, "a textbook bound, reasoned" | Lane c1: N = c(S + Z)/S. Published for one slot (Denning and Buzen 1978; Lazowska 1984). For c slots no source states it: computed on the exact model in 16 cases, and derived from two bounds that hold for any distribution | Confirmed. Lane w1's "the check binds when T < 10N minutes" is the same bound with one slot and a worker that goes on | One formula: the check binds when N·S/c reaches the worker's cycle (S + Z if it waits, Z if it goes on). Changes already wait below the cap | That S and Z do not change with N; whether two runs side by side keep full speed (Q20); Z (Q06) |
| K5 | Which kind of tree for which size | No tree. The tree design: three levels, never more | Lane t1: by leaves against children per parent (L against b), and realised over estimated work against 1/f. Database index results; agent hierarchies from two studies | In part: the schemes differ under extreme contention (K18); no new keys arrive during a run (K19) | Small job: the bulk-loaded two-level tree as built. Very large job: more coordinator epochs or an inner level, whichever costs fewer tokens. A leaf that overflows: K17 | The tree never ran. Tokens per wake, summary size (Q03, Q04) |
| K6 | When running work is stopped | Only at the memory floor | Lane t1: the tree's budget cut already stops running work. Lane a1: a reservation promises a start time only if units end at their caps; EASY kills at the stated length and loses the work (supercomputer schedulers) | In part: "commit and end" has no source | A second stop: a unit at its own cap commits what it has and ends (section 2). A window's limit adds no stop of ours | Work lost since the last commit (Q02); the spend rate that turns a token cap into a time (Q01) |
| K7 | What starts next, and on which model | Shortest expected check first, then oldest, an age cap; the cheaper model only where its gap was measured small | Lane a1: a reservation for the oldest unit that does not fit, shorter ones backfilled (EASY++ against EASY: wait −23 %, bounded slowdown −37 %, four real logs replayed in a simulator, 100 to 1,152 processors); value per token while a window limits (Yahoo); the model by price | Reservation: confirmed, as a transfer. For units that need only a worker it reduces to first come, first served, which is not evidence that this order is good: shortest first lowered waits. Model: no source applies it | Reservation and backfill where a unit needs a share of something not free, together with K6's stop. Where every unit needs only a worker, version 1's order stays. The model: change 2 | Whether it holds at 3 to 16 workers, and the order for one-worker units (Q34); pass rates by kind and model (Q16) |
| K8 | Wait, or redo, on a shared place | One owner where a conflict is likely, when tokens or the check are scarce | Lane w1: no general direction is published. With locks, waiting beat no-wait as transactions grew; in Silo no-wait won | Confirmed | Version 1's product stays, per pair and with no direction given: wait when the chance of a conflict times the tokens of a redo exceeds the cost of the wait | The crossover in tokens (Q02, Q25) |
| K9 | One owner of a file | One owner wherever a conflict is likely, and for 11 of our 20 shared places | An owned store won 1.54 times with no crossing and lost to optimistic control from about 20 % crossing (Silo). One wrong escalation stops every writer | In part: the crossover lies between the two and is not located; Silo's owner is a partitioned store, not one writer at a time | No owner by default (r57-0012; W20). An owner is the last rung, only where a measurement shows it pays. Reshaping takes over the ordered sequences where it applies | Where an owner pays (Q07, Q08 with one writer at a time as an arm) |
| K10 | Who writes the tree's run-state files | (no tree) | Lane t1: one script step under the run lock. Lanes w1 and t1: the task table is written today by compare-and-set on its revision | In part | A script step, never a session (cost: seconds of file work against minutes and a window re-read). Compare-and-set stays as built; a run lock for every write only if Q31 shows the step queues | Splits per hour, seconds per posting (Q31) |
| K11 | What a part is chosen against | Quality first, then the least time, memory and tokens | Lane t1: measured tokens, memory the hard limit | In part: the token figures show where tokens go, not that tokens bind first | The ruled objective (r57-0003). Memory stays the hard limit | Whether tokens bind ahead of memory (Q09, Q10, Q19) |
| K12 | Units of minutes with 3 to 16 workers | "No paper among those read" | No real system found. Two near cases: a 1977 simulation of units of minutes, about 10 sharing one I/O path; one CI project with few concurrent builds | Corrected to this | Stated as found: no real system, two near cases. Every published size is for other scales | That the shapes carry to sessions (all measurements) |
| K13 | Whether a paper's numbers carry | Only the shape carries | One reading put a number in: "about 10 coarse granules suffice" (the 1977 simulation) | The number leaves the rule | Only the shape carries; every constant is a measurement | Every constant |
| K14 | A window's price while it is under its line | (no price) | Lane a1 as first written: zero while u ≤ s | Corrected: under the price form it stays positive after a lull, and a burst of large units raises it | The corrections stand. With change 1 a price is what one more token in that window would buy before the reset | Sizes (Q10); values (Q17) |
| K15 | How much is redone after a refused write | A whole unit | STORM's design: one write, re-planned from a diff. The lane's refuter: a refusal for a changed read also undoes the steps built on that read | Both, by case | One write when the refusal concerns that file alone; the steps built on the read when a read changed | Which case dominates (Q02) |
| K16 | The grain of a claim below the file | (per file) | Coarse granules sufficed in the 1977 simulation; in another study coarse locks held to the end of 10-step units deadlocked | Not settled | The grain is measured. Until then: file grain, own copies | k and F per file (Q07); the replay (Q08) |
| K17 | Split, or hand over, a leaf that outgrows its window | (no tree) | Lane t1 first proposed a split of the unstarted keys in the B-link form | Refuted as a decision: the B-link reading gives a split's mechanism, not the choice. The tree's design hands over (R50) and forbids a mid-research split (D3-12) | The hand-over stays, as designed. A split, in the B-link form, only if Q30 shows it costs fewer tokens | A hand-over's reload against a new leaf's start cost (Q30) |
| K18 | When the index schemes are alike | (no tree) | When one resource binds | Except under extreme contention (one processor, one disk, heavy appends), where a pessimistic scheme won | The exception stands | None for the small case |
| K19 | New keys during a run | (no tree) | The lane counted them as a third feature | Keys are frozen during a run (R46) | None arrive; a leaf overflows only from estimate error | The spread of the estimate (Q29) |
| K20 | Which lever of the check comes first | "Makes the check wider or shorter" | Lane c1 ranked: shorten, batch, test ahead, let a waiting worker go on. Shorter runs: 32 % on average, 54 % on long suites (Ekstazi). Batching: 41 to 72 % fewer runs (Ericsson, simulated) | The ranking failed: the one shortening open at our gate (test files side by side) is untested, and the one study with few builds points both ways for us | No order of gain is decided. Making the queue visible comes first because every other lever and their measurements need it | Q21 (do the test files run side by side), Q05 (check time, failure rate), Q07 (changes that touch `lib`) |

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
3. **Act only at the gate. Two stops**: the least important unit at the memory floor; a unit at its own cap commits
   and ends. The token limit is enforced at the gate and also shown in the prompt.
4. **The next unit.** Fit is a filter. When a window cannot pay for all the waiting work, the highest value per token
   first. Where a unit needs a share of something not free, a reservation for the oldest unit that does not fit,
   shorter units behind it only if they do not delay it. Where every unit needs only a worker, the shortest expected
   check first, then the oldest. The model: its route's (change 2).
5. **Cross-check with the wait at the check**; 6. **a slow outer check** of throughput against workers.
7. **The check's levers**, in no order of gain: shorten the run; batch what waits, capped by the failure rate; test
   ahead on the success path; let a waiting worker go on, with a cap. First, make the queue visible.
8. **Several writers**, ranked by expected gain: reshape shared places so that writes commute or land at
   integration; version-checked writes; claims below the file; wait for a known hot pair; checkpoints; every landing
   through the check in one order; structured merge. No owner by default. The floor: own copies, and every merge
   passes the check.
9. **The tree**: the two-level tree for a small job; fewer parent wakes as the largest expected gain; fill computed
   from the spread of the estimate; a hand-over for a leaf that overflows; epochs or an inner level, by tokens, for a
   very large job.

The full wording, the sources and the mark of each step are the draft's section 3, read with section 2 above.

## 5. What is still a guess, and what the rule does until it is measured

Everything is untested for model sessions; the tree never ran, and no gate exists yet. No number is set. The open
points, each with its standing answer:

| Open point | Until it is measured the rule | Settled by |
|---|---|---|
| Whether pacing gains for us at all | Spends at once, keeps the reserve for running units | Q09 (arrivals), Q17 (a value per unit), Q33 (the simulation, widened) |
| A smaller model for a kind of job | Uses the route's model | Q16 (pass rate, usage and redo by kind and model) |
| The order for units that need only a worker | Shortest expected check first, then the oldest | Q34 |
| Where one owner pays | No owner | Q07, Q08 |
| The grain of a claim | File grain, own copies | Q07, Q08 |
| How much a refused write undoes | Gives wait-or-redo no direction | Q02 |
| Split or hand over | Hands over | Q30 |
| Run lock or compare-and-set | Compare-and-set, as built | Q31 |
| Which lever of the check first | No lever; two slots, one file at a time | Q21, Q05, Q07 |
| A whole-file CRDT | Own copies; neither used nor ruled out | Q36 |
| Whether tokens bind ahead of memory | Memory is the hard limit | Q09, Q10, Q19 |
| A value per unit | All values equal | Q17: no lane says how it is measured |

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
| V2-112 (papers not opened) | holds in part | The lists match the reports, and each paper's reason stands in a collect file. Four are filed wrongly as sign-in cases: the ICSME 2021 paper (its downloads failed; a retry may open it), Mu'alem and Feitelson 2001 (needs OCR), and for Balseiro, Kim, Mahdian and Mirrokni the recorded failure is a missing file, the 403 being the other Balseiro paper's. Four of the tree's are paywalled or sold. Missing from the list: Mohan 1990 and Stonebraker 2007 (both refused with 403) and the 1987 sagas paper (no text layer) |

What this changes: the board's "Known gaps" (the two items not searched, the cache weight, the three missing papers,
the two that are not sign-in cases). Limits of the check: one reader per lane, no second reader; the papers
themselves were not opened (they are not in the repository).

## 7. Records

Written to `library/journal/2026-11-19/r57.jsonl`:
- r57-0414 replaces r57-0408 (the rule: frame, stops, tokens) and the draft records v2-0400 and v2-0402.
- r57-0415 replaces r57-0409 (the next unit, the model) and the draft record v2-0405.
- r57-0410 replaces r57-0406 (several writers: the ranked parts, no owner by default).
- r57-0841 to r57-0845: the decisions (version 2 as a whole; K1; the model; several writers; the five statements).
- r57-0141 closes task r57-0515. r57-0516 replaces r57-0513 (the measurements, now Q01 to Q36).
- r57-0710 and r57-0711: where the rule and the owner's page are.
The other 38 draft records (v2-0401, v2-0403, v2-0404, v2-0406 to v2-0440) stand as the rule's hypotheses.

## 8. What comes next

Nothing starts without the owner's word (r57-0007; rule 3 of this repository). In the order r57-0515 set: the six
counts over transcripts, the lane log and history that already exist on the owner's PC; then the simulations swept
over project sizes, so that no number is tuned to one repository (r57-0028); then the runs. The papers that need the
owner's sign-in are listed in the draft's section 7 and on the board under "Known gaps".
