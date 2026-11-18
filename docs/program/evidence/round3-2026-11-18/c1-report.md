# c1 report (draft, step 2): one serial check shared by many workers

Lane `check`, research round 3, 2026-11-19. Draft for the gate and the refuter; the column "what the refuter left"
says "pending" until step 4. Claims C01 to C66 are in `R:c1-claims.md` (`R:` = `docs/program/evidence/round3-2026-11-18/`),
each with its quotation, its line and its mark; `P:` = `R:papers/check/`. S = time of one check run, Z = a worker's own time between checks,
c = check slots, N = workers, p = share of changes that fail the check, k = changes per run.

## 1. The answer

1. Workers sharing one check are the machine-repair queue. For one slot its saturation point (S + Z)/S is published
   (Kleinrock 1976 via Sztrik; Denning and Buzen 1978; Lazowska 1984: C02-C04). For c slots no source states it;
   arithmetic on the exact published c-slot model gives c (S + Z)/S (C07). Our rule's case B is right; 1 + cZ/S is not.
2. That point is where two bounds cross, not where waiting starts: there the check is already 79 to 92 % busy (C08).
3. More workers never move the cap; less check time per change does (C14, C15). Batching: up to 72 % fewer runs, 91 %
   fewer machines, 99 % less feedback time when few changes fail (C23, C25, C26). Shorter runs: 32 to 54 %, nothing
   under a minute (C38). The two multiply. Testing ahead costs 2 to 5 runs per change (C34).
4. For us, ranked: batch at the gate, split a failed batch one by one; shorter runs, full suite kept at the gate; a
   waiting worker starts its next unit; a visible queue; testing ahead last. Numbers wait on S and its spread, Z, p.

## 2. The table

| Conclusion | From | Measured gain and its conditions | Refuter left | Still a guess for model sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| One slot: N* = (S + Z)/S is the published saturation point | C01-C04, C09 (quoted) | None; analytic. Holds if S and Z do not change with N | pending | Z per change; whether a wait makes a worker redo work | Case B for c = 1 becomes "proven" (DECISION-RULE line 74) |
| c slots: N* = c (S + Z)/S; 1 + cZ/S is wrong | C06 (quoted model), C07 (computed), C05 | None; exact for exponential times, one queue, equal slots | pending | Whether two suite runs slow each other (measurement 3) | Case B stays as written; mark "computed on the exact model" |
| Waiting starts below N* | C08 (computed), C04, C09 | At N*: check 79-92 % busy, mean wait 0.16-2.15 check times (exponential times) | pending | Spread of S (a near-fixed suite waits less) | Rule keeps "past that, workers only queue"; Step 5's wait test covers the range below |
| The cap moves only with the serial step | C12-C15 | 16 -> 32 threads (simulated chip); 22 -> 48 threads (memcached) | pending | none beyond S and Z | Confirms the rule's lever "make the check wider or shorter" |
| Batching at the check | C18-C27 | 72 % fewer runs at 2.8 % failing, batch 9 (Ericsson, simulation); 41 % with flaky tests; 46-50 % at under 25 % failing (9 projects); 91 % fewer machines at 8.5 % failing (Chrome replay); 99 % less feedback time | pending | p for model changes; independence; whether a run over k changes costs one run | New: d (check time per change) replaces S; greedy batch with a one-by-one split |
| Testing ahead | C33-C37, C61 | P50 2.98x an oracle against 80x for one at a time, at 500 changes an hour; 1.2x with 500 build machines; 2-5 runs per change, halved by a success threshold | pending | Success odds of model changes; conflicts among 3-16 sessions | Only while slots idle; last in rank |
| A shorter check | C38-C45, C57, C58 | Ekstazi 32 % (54 % on long suites), slower under a minute; Facebook half the cost, 99.9 % of faulty changes still caught; Google 42-55 % with no miss; selection alone may miss 55 % | pending | A dependency map for our tests; whether our test files run side by side | Selection in the pre-check, full suite at the gate; side-by-side files (measurement 4) |
| Detach the waiting worker | C30, C56, C62 | 68 % (log-bound database, microsecond transactions) | pending | A second unit ready; cost of returning a failed change | Worker starts its next unit while its change waits |
| Our lane cannot see its own queue | C46-C53 | 177 minutes waited against 365 run (780 commands) | pending | none | Log slot count and queue; order waiters; hold limit above the longest check |

## 3. The five points

### (a) The model and its formula

How reached: the c = 1 form is quoted from three sources; for c > 1 no source was found after two searches, so the
published exact model (Sztrik's M/M/r//N formulas, C06) was evaluated in Node for 16 cases (C07, appendix of the claims
file); arithmetic on a model, not a measurement.

- **One slot, no batching:** N* = 1 + Z/S (C03: "the saturation number"; C02: Mb* = (R0 + Z)/VbSb). Proven.
- **c slots, no batching:** N* = c (1 + Z/S). Computed: the exact curve has T = S while N <= c (each worker has a slot)
  and approaches T = N S/c − Z for large N; the two lines cross at c (S + Z)/S in all 16 cases (C07). Factory physics
  gives the same by substitution (C09). The form 1 + cZ/S comes from treating c slots as one slot c times faster
  (C05, which itself calls that a "first-cut"); it makes a lone change take S/c, which is false.
- **With batching:** N* = c (S + Z)/d, with d the check time spent per change (C18, hypothesis). Under Dorfman (a fixed
  batch k, a failed batch retested one by one, one run costs one run whatever k) d = S x C(k, p), so N* rises by
  1/C: 5.0 at p = 1 %, 1.7 at 10 %, 1.01 at 30 % (from Dorfman's own table, C19). Under greedy batching ("take what
  waits"), the batch sets itself to K = N F/(Z + F) and the cap becomes the added check time per change (C27).
- **Where our rule stands:** the same as the literature, not a special case and not wrong. For c = 1 it is Denning and
  Buzen's Mb* with the check as the only queue; for c > 1 it equals the exact model's crossing. Three notes:
  (1) its mark "reasoned" should change (section 5); (2) it is a crossing of bounds: with variable times waits begin
  below it (C08), which Step 5's wait test already watches; (3) it assumes S and Z do not change with N (C01, C04).
  If a wait makes a worker redo work, or two runs slow each other, throughput can fall past N* (C12, C13).
- Case A, the square root, is Suleman's case (C16): one task cut into pieces that each pass the check. The rule
  already keeps it apart.

### (b) The largest measured gains and what each needs to know

How reached: the largest figure each paper states, with its baseline, workload and failure rate, read at the line.

| Method | Largest measured gain | Failure rate and check length | Needs to know about a project |
|---|---|---|---|
| Batching | 99 % less median feedback time, no failure missed (C26); 91 % fewer machines for the same feedback time (C25); 72 % fewer runs (C23) | Fallahzadeh 2023: Chrome 8.5 % failing builds, feedback 36.48 min; Ericsson feedback 8.33 h (C25). Najafi: Ericsson projects with 2.8 % culprits; 41 % once flaky tests count (C23); best batch 4 and about 30 % saved at 19-23 % failing (C24); no gain near 30 % (C19) | p per change; flaky share; whether failures are independent (no pair failures); whether a run over k changes costs one run; how many changes wait at once |
| Testing ahead | P50 turnaround 2.98x an oracle against 80x one at a time, about 27 times better (C33; the 27 is a division of two quoted ratios); main line green 52 % of a week before, always after | Mostly passing changes; 500 build machines for 500 changes an hour; 2-5 runs per change, 1.85-2.57 with a success threshold (C34) | Success odds per change (a trained model, 97 % accurate at Uber); a build graph for conflicts; many slots |
| A shorter check | Facebook: half the cost, 99.9 % of faulty changes caught, under a third of the tests build dependencies pick (C39); Ekstazi 32 %, 54 % on long suites (C38); Google 42-55 % with no miss (C42) | Google 99 passes per failure (C32); Ekstazi slower on suites under a minute; selection alone may miss 55 % of failures (C26), so a full run must follow (C39, C44) | A test-to-file or build-target map; months of history for prediction; flaky labels; a suite over a minute |
| Splitting the suite over slots | No paper with a measured speedup was found; greedy by known durations beat random by 30-60 % on synthetic suites (C45) | | Per-file durations; whether files are independent (ours untested, C58) |

### (c) Seconds, minutes, an hour; 3 and 16 workers

How reached: the check binds when N > c (1 + Z/S) (C66, arithmetic on C07). The only fact about Z is ROUND.md's "a
unit lasts minutes"; no Z is assumed beyond that. Each method's own limit is from its paper.

| Check | 3 workers | 16 workers |
|---|---|---|
| Seconds | Z/S is in the tens or more, so N* is far above 3: the check does not bind. No method pays; selection made short suites slower (C38) | Binds only with 1 slot and Z/S < 15. Otherwise as for 3 |
| Minutes (ours: 596 s, C46) | Binds with 2 slots only if Z/S < 0.5, with 1 slot if Z/S < 2. Slots are often free: testing ahead can use them (C61); a greedy batch is usually one change | Binds with 2 slots if Z/S < 7. Batching pays at low p; a shorter check pays; testing ahead takes slots from real runs |
| An hour | If Z is minutes, Z/S < 1 and N* is between c and 2c: binds with 1 or 2 slots. Batch with two rounds, not halving (C21, C22). Today's lane breaks a holder after 20 minutes (C63) | Binds. Batching is the main lever (Rust batches by hand at about 3 hours, C37); each lost speculative run costs an hour |

### (d) What our lane and tree do today

How reached: library records b1-0101 to b1-0126 and BUILD-IN.md section 1, not the code.

- **Lane.** One queue for every heavy command, 2 slots (C47). Waiters have no order (C51). It logs each command's wait
  and run time, not the slot count or how many wait (C49). A holder is broken after 20 minutes though a command may
  have 25 (C50). Over 780 commands: 365 minutes of runs, about 177 minutes of waiting (C47). The queue was the most
  frequent limit in our 25 episodes (C48). One suite run: 596 s, one test file at a time (C46).
- **Check design.** One full-suite run per merge, width from case B with the lane's 2 slots, builder pre-check by
  selection (C54, C57). No batching, no testing ahead, no detaching.
- **Tree.** The coordinator cannot use the lane (C53). Its own checker already batches: 12 candidates (a guess) or when
  nothing else runs, ordered by field and card id, with no wait recorded (C52).

### (e) Ranked proposal for our check, by expected gain

How reached: ranked by the size of the published gain that survives our conditions (few slots, minutes-long units,
a rerun that is not the same run); each mark is the weakest link in its chain.

1. **Batch at the gate.** When a slot frees, merge every change that waits and run the full suite once. If it fails,
   run each change of that batch alone (two rounds: C21, C22). Use no timer (C27, C28). Cap the batch by the measured p
   from Dorfman's table; no batching near 30 % failing (C19). Gain: N* times 1/C(k, p), and fewer runs (C18).
   Mark: mechanism proven (C19, C23-C27); fit to model sessions hypothesis (C59, C60, C64, C65). Measurements: p per
   change at the gate; suite time on a merge of 1, 2 and 4 changes; share of batch failures whose changes each pass
   alone; share of failures that do not repeat on the same tree. Small to large: the batch is one change when nothing
   waits (3 workers, a short check), and grows with the queue (16 workers, a long check); the cap is a ratio, p, so it
   moves with the project, not with its size. The same rule replaces the tree checker's "12, a guess" (C52).
2. **Shorten the run, keep the full gate.** Run test files side by side (C58: towards the longest file if the files are
   independent); select by changed files in the builder's pre-check; keep the full suite at the gate (C44, C57). Gain:
   N* rises by S/S'. Mark: principle proven (C14, C15, C38); our numbers hypothesis. Measurements 3 and 4 of the rule.
   Small: suites under a minute gain nothing from selection (C38). Very large: selection by build graph, then
   prediction (C39, C41), which needs months of history.
3. **Let a waiting worker start its next unit.** Its change waits at the check; a failed change comes back to it
   (C62). Gain: clock time, not tokens (C56); proven only for microsecond transactions (C30). Measurement: the share
   of a worker's cycle spent waiting (rule measurement 2). Needs ready work; helps most where the check binds.
4. **Make the queue visible and fair.** Log the slot count and the number waiting (C49); give a slot to the shortest
   expected check, then the oldest (C51, already designed); a hold limit longer than the longest check (C50, C63).
   Gain: none by itself; it makes measurement 7 and Step 5 possible. Mark: hypothesis.
5. **Testing ahead, last.** Only when a slot is free while a change waits behind an unfinished one; success paths only
   (C36); a window halved on each failure (C35). Gain small with 2 slots: Uber's came with hundreds of build machines
   (C33). Measurements: idle-slot share; p. Fits very large projects with many slots.
6. **The worker cap.** Keep case B; once batching runs, use d in place of S: start no worker past c (S + Z)/d (C18).

## 4. Not found, not opened

From the five collect files and their second attempts.

- **Not found in any source read:** N* for c slots (searched: "machine interference problem several repairmen
  saturation number multiple servers finite source queue M/M/c//N", and Kleinrock vol. II finite population; read
  the Sztrik book, the Haque and Armstrong survey, Lazowska chapters 6, 7, 8, 10, 11); it is computed here (C07).
  N* with batch service in a closed queue (Holman 1981 is open-queue; Kalyanaraman 2023 has no N*). A paper on
  splitting a suite over machines with a measured speedup (web search found vendor write-ups only). A paper whose
  subject is computing affected build targets. A measured gain of drum-buffer-rope against a plain release rule.
- **Closed after a second attempt:** Kleinrock 1976 vol. II sec. 4.12 (book); Reiser and Lavenberg 1980 (ACM page
  behind a bot check; Lazowska chapter 6 stands in); Stecke and Aronson 1985; Chaudhry and Templeton 1983, Bailey
  1954, Downton 1955, Medhi 1975; Hwang 1972 (known through Aldridge); Deb and Serfozo 1973 (threshold policy known
  from a search summary only); Helland 1987; Adams, Balas, Zawack 1988 (paywall, DTIC bot check); Duclos and Spencer
  1995; Hopp and Spearman (book; Choo stands in); Goldratt (books); Beheshtian, Bavand, Rigby TSE 2021 (the 2020
  thesis was read instead); Bavand and Rigby ICSME 2021 (the master's thesis download broke about 15 times);
  Simatupang 1997; arXiv 2110.01465 (damaged file); Lazowska chapters 8 and 20 (load-dependent centres).
- **Needs the owner's sign-in:** https://ieeexplore.ieee.org/document/9392370/ (TSE 2021);
  https://doi.org/10.1109/ICSME52107.2021.00026 (ICSME 2021);
  https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.34.3.391 (shifting bottleneck); DOI 10.1016/0925-5273(95)00197-2
  (Duclos and Spencer); https://dl.acm.org/doi/pdf/10.1145/322186.322195 (Reiser and Lavenberg, bot check).
- **Read only in part:** Fallahzadeh 2025 (abstract and headline lines, C26); Denning and Buzen (bottleneck and
  terminal sections); Najafi 2019 (about 80 %); Uber 2025 (about half).

## 5. Proposed corrections

Each becomes an `open` record "proposed correction of <id>" in step 4; no record is edited here.

| Record or page | What it says | What contradicts it | Claims |
|---|---|---|---|
| o1-0402 (hypothesis, reasoned) | Workers past c (T_out + T_check)/T_check only queue | For c = 1 the form is published; for c > 1 it is the exact model's crossing (computed); waits begin below it | C02-C04, C07, C08 |
| DECISION-RULE.md line 74 (the page r57-0408 rests on) | Case B: "a textbook queueing bound, reasoned" | Same; cite Denning and Buzen 1978, Lazowska 1984 ch. 5, Sztrik (Kleinrock 1976) for c = 1, the computation for c > 1 | C02-C04, C07 |
| BUILD-IN.md line 110 | "case B hyp (C147)" | Same | C02-C04, C07 |
| DECISION-RULE.md lines 41-44 (cause recorded in r57-0610) | "a check shared by separate programs" among the parts with no paper | The finite-source queue, batch testing and merge queues are such checks | C01-C06, C23-C25, C33-C37 |
| x15-0405, x15-0406 (hypothesis, reasoned) | A batch of k pays when (1 − p)^k > 1/k; below 0.29 for 2 to 4 | That is Dorfman 1943 (cost and Table I); a batch of 2 is never best under independent failures | C19, C21 |
| x06-0404 (hypothesis, "no measured number") | Batching loses at a high failure rate | Dorfman's table (30 %: 1 % saved); Najafi (higher culprit rate, smaller batch and saving); the thesis (19-23 % failing: batch 4, about 30 %) | C19, C23, C24 |
| x06-0402 (hypothesis) | Zuul loses with flaky tests or a high failure rate | Zuul's own documentation says so; Uber 2025 says it of GitHub and GitLab | C34, C35 |
| x06-0400 (hypothesis) | A serial gate caps throughput at one check per merge unless batched | Rust's rollup page ("can scale poorly", ~3 h); Google's product law; the c-slot cap c/S (computed) | C32, C37, C07 |
| x06-0333, x15-0353, x06-0334 (summary) | Zuul window 20, +1, halved; GitHub limits 1 to 100 | Read at the documentation pages; GitHub adds "Merge limits do not combine merge_group builds" | C35, C36 |
| x06-0335 (summary) | Najafi: 42 or 47 %, which unconfirmed | Najafi: 72 % without flaky tests, 42 % (abstract) or 41 % (body) with them; 47 % is Bavand and others, as Fallahzadeh 2023 reports it (`P:beheshtian2021/paper.txt:84-91`) | C23 |
| x06-0336 (summary) | Concordia 2023: 72, 91, 81 % | Read in the paper | C25 |
| x06-0354 (textbook), x06-0511 (open) | Luo: of 201 fixes, 45, 20, 12 % | The shares are of the 161 classified fixes | C43 |
| x05-0501 (open) | DeWitt 1984 not opened | Opened; section 5 read | C29 |
| x05-0607 (mistake) | Attributing group commit to DeWitt 1984 was wrong | DeWitt describes commit groups but calls the idea folklore claimed by System R; IMS Fast Path had it before it was named. Holds in part | C29, C31 |
| arXiv 2105.08198 given as a Bavand paper | | No library record carries it: x06-0368 and x06-0707 name 2105.08198, correctly, as Mauerer and others 2021. The "earlier note" named in `R:c1-collect-mergeq.md` was not found in `docs/`, `library/` or `research-tree/`. Nothing to correct in the library; the uncommitted folder `P:bavand-mine/` holds the Mauerer paper, so its name misleads | none |
| o1-0301 to o1-0303 | Suleman 2008, quoted, not re-read | Re-read at the source; the figures match. No change | C16 |
