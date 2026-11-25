# c1 report (final, step 4): one serial check shared by many workers

Lane `check`, research round 3, 2026-11-19. Final: the gate (`R:c1-gate.md`) and the refuter (`R:c1-refute.md`) are folded
in (section 6). Claims C01 to C66 are in `R:c1-claims.md` (`R:` = `docs/program/evidence/round3-2026-11-18/`), each with
its quotation, its line and its mark; `P:` = `R:papers/check/`. S = time of one check run, Z = a worker's own time between
checks, c = check slots, N = workers, p = share of changes that fail the check, k = changes per run. "Holds in part" means
the refuter's narrowed claim is the one used; such a claim is never called supported.

## 1. The answer

1. Workers sharing one check are the machine-repair queue. For one slot the saturation point (S + Z)/S is published
   (Denning and Buzen 1978; Lazowska 1984; Kleinrock via Sztrik). For c slots no source read states it: it is c (S + Z)/S,
   computed on the exact model and following from two bounds for any time distribution. Our rule's case B is this form.
2. Waiting starts below it (the check is 79-92 % busy there), and it assumes runs side by side do not slow each other.
3. More workers never move the cap; less check time per change does. Shorter runs: 32 % on average, 54 % on long suites;
   with few concurrent builds batching lost its lead in feedback time. Batching: 41 to 72 % fewer runs (Ericsson, simulated),
   only where changes wait. Testing ahead on the success path is how a serial gate uses its second slot.
4. For us, ranked: shorten the run; batch what waits; test ahead on the success path; let a waiting worker start its next
   unit, with a cap; make the queue visible; keep case B as the worker cap. Numbers wait on S and its spread, Z, p.
5. Verdicts: 66 claims, 41 confirmed, 23 hold in part, 2 refuted (C44, C64), 0 cannot be checked.

## 2. The table

| Conclusion | From | Measured gain and its conditions | Refuter left | Still a guess for model sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| One slot: N* = (S + Z)/S is the published saturation point | C01-C04, C09 (proven) | None; analytic. Holds while S and Z do not change with N | All five confirmed; Denning and Buzen also assume job-flow balance | Z per change; whether a wait makes a worker redo work | Case B for c = 1 becomes "proven" (DECISION-RULE line 74) |
| c slots: N* = c (S + Z)/S; 1 + cZ/S is c − 1 too low | C05, C06 (proven), C07 (computed) | None; analytic | Confirmed and widened: it follows from X <= c/S and X <= N/(S + Z) for any distribution, not only exponential (C07) | Whether two suite runs at once slow each other (C66; rule measurement 3) | Case B stays; mark "computed on the exact model; follows from the operational bounds" |
| Waiting starts below N* | C04, C08 (computed), C09, C66 | At N*: check 79-92 % busy, mean wait 0.16-2.15 check times (exponential times) | C08 confirmed (a fixed-length suite waits less, not zero); C66 holds in part: below N* waits are already about 0.6 S in the two cases computed | Spread of S and Z (C11 holds in part) | Rule keeps "past that, workers only queue" as a bound; Step 5's wait test covers the range below |
| The cap moves only with the serial step | C12-C15 | Memcached peak 22 -> 48 threads after a lock change; MySQL 16 -> 32 threads on a simulated chip, 34 % less time averaged over 12 workloads | C13 confirmed; C12, C14, C15 hold in part (wording; no warning against extrapolating; the MySQL figure is one program) | none beyond S and Z | Confirms the lever "make the check wider or shorter" |
| A shorter check pays at every worker count | C38-C43, C45, C57, C58; C26 | Ekstazi 32 % (54 % on longer suites), time 9-138 % of all tests on short suites; Facebook half the cost, 99.9 % of faulty changes still caught (self-reported); Google 42-55 % with no miss (self-reported, cut chosen on the same data); with few concurrent builds (JMRI) a selection algorithm was fastest though it missed up to 55 % of failures | C39-C43, C45 confirmed; C38 in part (short suites up to 38 % slower); C26 in part (batching's 99 % needs many builds); C44 refuted: BMW's gate runs the dependency-selected targets, not the full suite; C57 in part | A dependency map for our tests; whether our test files run side by side (C58) | Rank 1: side-by-side files; selection in the pre-check; full suite at the gate until a dependency map exists, then dependency selection, never prediction |
| Batching at the check, where changes wait | C17-C27 | 72 % fewer runs at 2.8 % culprits, batch 9 (Ericsson, simulated; maximum 74 %), 41 % with flaky tests; 44-50 % on nine projects under 25 % failing; same feedback time with 5 machines instead of 7 at Ericsson and 20 instead of 217 at Chrome (8.5 % failing) | C17, C19, C20, C27 confirmed; C18, C21-C26 hold in part: failing batches were bisected, not split one by one; 44-50 %, not 46-50; the 99 % needs many concurrent builds; the batched N* is a crossing of upper bounds | p for model changes; independence (C65); whether a run over k changes costs one run (C59) | Rank 2: greedy batch capped by p; one run per batch only while the gate runs the full suite |
| Testing ahead on the success path | C33-C37, C61 | P50 2.98x an oracle against 80x for one queue at 500 changes an hour; 1.2x with 500 build machines (Uber, self-reported); 3.39-5.43 builds per change before a rollout, 1.85-2.57 after (self-reported) | C33, C35-C37 confirmed; C34 in part (before and after three changes, not the threshold alone); C61 in part: a speculative run whose base passes is the real check | Success odds of model changes; conflicts among 3-16 sessions | Rank 3 (was 5): in a free slot, success path only, window halved per failure |
| Detach the waiting worker | C30, C31, C56, C62 | 68 % on one TATP transaction, from relieving scheduler overload: does not carry | C31, C56 confirmed; C30, C62 in part: only the idea carries, and it needs a cap on changes in flight per worker | A second unit ready; tokens to redo stacked work after a late failure | Rank 4: a worker starts its next unit, with a cap |
| Our lane cannot see or carry its own queue | C46-C53, C63 | 177 minutes waited against 365 run (780 commands) | C46-C53 confirmed; C63 in part: the lane's timeout kills a command at 25 minutes; the 20-minute break lets a waiter start beside a live holder | none | Rank 5: log slot count and queue; order waiters; timeout and hold above the longest check |

## 3. The five points

### (a) The model and its formula

How reached: the c = 1 form is quoted from three sources; for c > 1 no source was found after two searches, so the
published exact model (Sztrik's M/M/r//N formulas, C06) was evaluated in Node for 16 cases (C07, appendix of the claims
file); the refuter re-ran it and derived the same point from two operational bounds. Arithmetic on a model, not a measurement.

- **One slot, no batching:** N* = 1 + Z/S (C03: "the saturation number"; C02: Mb* = (R0 + Z)/VbSb). Proven.
- **c slots, no batching:** N* = c (1 + Z/S). The exact curve has T = S while N <= c and approaches T = N S/c − Z for
  large N; the two lines cross at c (S + Z)/S in all 16 cases (C07). It needs no exponential assumption: each slot is
  at most fully busy (X <= c/S) and a cycle takes at least S + Z (X <= N/(S + Z)); the bounds cross there for any
  distribution, as C01-C04 do for one slot. Factory physics gives the same by substitution (C09). The form 1 + cZ/S comes
  from treating c slots as one slot c times faster (C05, a "first-cut"); it makes a lone change take S/c, which is false.
  MVA's chapter 6 does not cover a pool of slots, but chapters 8 and 20 extend it to load-dependent centres (C10, in part).
- **With batching:** batching raises the throughput ceiling from c/S to c/(S C(k, p)), and N* = c (S + Z)/(S C) is where
  that ceiling meets the light-load bound (C18, in part): a crossing of upper bounds, reached only where full batches
  form. A greedy batch capped at k fits it (alone at light load, k at heavy load); a fixed k that must first gather does
  not (C17). The gain 1/C is 5.0 at p = 1 %, 1.7 at 10 %, 1.01 at 30 % (Dorfman's table, C19). The group-commit bound
  1/δ (C27) assumes no failures, so it leaves out Dorfman's retest runs.
- **Where our rule stands:** the same as the literature. For c = 1 it is Denning and Buzen's Mb* with the check as the only
  queue; for c > 1 it is the exact model's crossing. Four notes: (1) its mark "reasoned" should change (section 5);
  (2) waits begin below it (C08, C66); (3) it assumes S and Z do not change with N (C01, C04): if a wait makes a worker
  redo work, or two runs slow each other, throughput can fall past N* (C12 in part, C13); (4) it assumes c runs side by
  side at full speed on one PC (C66), not measured.
- Case A, the square root, is Suleman's case (C16): one task cut into pieces that each pass the check. The rule
  already keeps it apart.

### (b) The largest measured gains and what each needs to know

How reached: the largest figure each paper states, with its baseline, workload and failure rate, read at the line, as
the refuter left it. A company's own figure is marked self-reported.

| Method | Largest measured gain | Failure rate and check length | Needs to know about a project |
|---|---|---|---|
| Batching | 99 % less median feedback time with no failure missed, in large projects with many concurrent builds (C26, in part); up to 91 % fewer machines at the same feedback time, 90.78 % at Chrome (C25, in part); 72 % fewer runs, maximum 74 % (C23, in part) | Chrome about 8.5 % failing builds, feedback 36.48 min; Ericsson 8.33 h with 5 machines instead of 7 (C25). Najafi: 2.8 % culprits; 41 % once flaky tests count; failing batches bisected (C23). Nine projects under 25 % failing: 44-50 % (C24). Dorfman: 1 % saved at 30 % failing (C19). In the smaller project with few builds (JMRI) a selection algorithm that misses up to 55 % of failures was fastest; batching gains most with many builds and few machines, and the authors advise it where missed failures are intolerable (C26) | p per change; flaky share; whether failures are independent (C65); whether the gate runs the full suite (a selecting gate runs the union of the batch's selections, C59); how many changes wait at once |
| Testing ahead | P50 turnaround 2.98x an oracle against 80x for one queue (C33; self-reported); main line green 52 % of the time before, always after | Mostly passing changes; 500 build machines for 500 changes an hour; 3.39-5.43 builds per change before a rollout, 1.85-2.57 after it (C34, in part: three changes at once) | Success odds per change (a trained model, 97 % accurate at Uber); a build graph for conflicts; whether the gate is serial (then the second slot needs it, C61) |
| A shorter check | Facebook: half the cost, 99.9 % of faulty changes caught, under a third of the tests build dependencies pick (C39, self-reported); Ekstazi 32 %, 54 % on long suites (C38); Google 42-55 % with no miss (C42, self-reported) | Google: 99 passed test targets per failed one per change (C32, in part); Ekstazi's time on short suites 9-138 % of running all tests (C38); selection may miss up to 55 % of failures (C26); BMW's gate runs the dependency-selected targets and keeps its history-based selection out (C44 refuted, read at `P:bmw/paper.txt:94-97`) | A test-to-file or build-target map; months of history for prediction; flaky labels; a suite over a minute |
| Splitting the suite over slots | No paper with a measured speedup was found; greedy by known durations beat random by 30-60 % on generated suites (C45) | | Per-file durations; whether files are independent (ours untested, C58) |

### (c) Seconds, minutes, an hour; 3 and 16 workers

How reached: the cap is reached when N > c (1 + Z/S) (C66, arithmetic on C07, holds in part: waits start below it, and
c runs are assumed to go at full speed side by side). The only fact about Z is ROUND.md's "a unit lasts minutes". Each
method's own limit is from its paper.

| Check | 3 workers | 16 workers |
|---|---|---|
| Seconds | Z/S is in the tens or more, so N* is far above 3: the cap is not reached. No method pays; selection made short suites slower (C38) | Reaches the cap only with 1 slot and Z/S < 15. Otherwise as for 3 |
| Minutes (ours: 596 s, C46) | Reaches the cap with 2 slots only if Z/S < 0.5, with 1 slot if Z/S < 2; waits come earlier (C66). Few concurrent builds: batching loses its lead in feedback time (C26); a greedy batch is usually one change; with a serial gate the second slot carries a real check only by testing ahead (C61) | Cap with 2 slots if Z/S < 7. Batching pays where changes wait; a shorter check pays; testing ahead on the success path keeps both slots on real checks |
| An hour | If Z is minutes, Z/S < 1 and N* is between c and 2c: the cap binds with 1 or 2 slots. Split a failed batch in the fewest rounds the free slots allow (C21, C22 in part; the CI papers bisect, C23, C25). Today's lane kills a command at 25 minutes (C63, in part) | Binds. Batching is the main lever (Rust rolls up by hand with a CI run of about 3 hours, C37); each lost speculative run costs an hour |

### (d) What our lane and tree do today

How reached: library records b1-0101 to b1-0126, r57-0103, r57-0127, r57-0129 and BUILD-IN.md section 1, not the code;
the refuter re-read the cited lines of `lane.mjs` and recounted the log.

- **Lane.** One queue for every heavy command, 2 slots (C47). Waiters have no order (C51). It logs each command's wait
  and run time, not the slot count or how many wait (C49). A command is killed at its timeout, at most 25 minutes, and
  from 20 minutes a waiter may break a live holder's slot and start beside it (C50, C63). Over 780 commands: 365 minutes
  of runs, about 177 minutes of waiting (C47). The queue was the most frequent limit in our 25 episodes (C48). One suite
  run: 596 s, one test file at a time (C46).
- **Check design.** One full-suite run per merge, width from case B with the lane's 2 slots, builder pre-check by
  selection (C54, C57). No batching, no testing ahead, no detaching. BUILD-IN.md section 1 does not say whether two
  merges checked at once share one base or one is checked on top of the other (it matters for C61 and C65).
- **Tree.** The coordinator cannot use the lane (C53). Its own checker already batches: 12 candidates (a guess) or when
  nothing else runs, ordered by field and card id, with no wait recorded (C52).

### (e) Ranked proposal for our check, by expected gain

How reached: ranked by the size of the published gain that survives our conditions (2 slots, 3 to 16 workers,
minutes-long units, a rerun that is not the same run), after the fold; each mark is the weakest link in its chain. The
fold moved shortening above batching (C26, C44, C59) and testing ahead from fifth to third (C61): shortening cuts every
change's check at every worker count, while batching pays only where changes wait and its large published gains came
with many concurrent builds.

1. **Shorten the run, at every worker count.** Run the suite's test files side by side (C58: towards the longest file,
   about 270 s from 596 s, if the files are independent); select by changed files in the builder's pre-check (C57); at
   the gate run the full suite while there is no dependency map (our design's reason, x15-0409: a lib change selects
   every test file), then the dependency-selected targets as BMW's gate does; keep prediction-based selection out of the
   gate (C39 relies on later full runs). Gain: N* rises by S/S' and every change's feedback time falls, whether or not
   changes wait. Mark: principle proven (C14, C15 in part; C38 in part); our numbers hypothesis. Measurements: suite time
   with files side by side and their independence (rule measurement 4); whether two runs at once slow each other
   (measurement 3, C66); the share of changes that touch lib and so select every file. Small to large: suites under a
   minute gain nothing from selection (C38); very large projects select by build graph, then by prediction before the
   gate (C39, C41), which needs months of history.
2. **Batch what waits at the gate.** When a slot frees, merge every change that waits, capped by the measured p (best
   pool 11 at 1 %, 4 at 10 %, 3 at 30 %, where it saves 1 %: C19), and run once. Split a failed batch in the fewest
   rounds the free slots allow: one by one when it fits them, else by halving (the CI papers bisect, C23, C25; one by one
   in one more round saves time when rounds are slow, C21, C22 in part). No timer (C27, C28). Gain: runs per change fall
   to C(k, p), only where changes wait; a batch of one costs nothing. One run per batch holds only while the gate runs the
   full suite (C59, in part). Mark: mechanism proven (C19, C20, C27); CI figures hold in part (C23-C26); fit to model
   sessions hypothesis (C59, C60, C65). Measurements: p per change at the gate; suite time on a merge of 1, 2 and 4
   changes; share of batch failures whose changes each pass alone (C65); the flaky share of our tests, failures that do
   not repeat on the same tree (flakiness moved Ericsson's best batch from 9 to 4 and its saving from 72 to 41 %, C23).
   Where a returned change is redone, each batch failure also costs tokens for a new run of the unit; no source sizes
   it. Small to large: a batch of one at 3 workers and a short check, growing with the queue at 16 workers and a long
   check; the cap is a ratio, p, so it moves with the project, not with its size. The same rule replaces the tree
   checker's "12, a guess" (C52).
3. **Test ahead on the success path.** If the gate tests each change on the main line with the changes ahead of it, start
   the next waiting change on top of an unfinished one in a free slot, success path only (C34, C36), with a window
   halved on each failure (C35). A speculative run whose base passes is the real check, and it is how a serial gate uses
   its second slot (C61, in part). Gain: up to c checks at once for a serial gate, less the runs lost when a change ahead
   fails, in proportion to p and the depth; Uber's figures came with hundreds of build machines (C33, self-reported).
   Mark: hypothesis. Checking two merges on one base instead accepts failures caused by two changes together (C65).
   Measurements: p; the window. Small to large: depth 1 with 2 slots; very large projects with many slots go deeper, and
   speculating on every path costs 3.39-5.43 builds per change without a threshold (C34).
4. **Let a waiting worker start its next unit, with a cap.** Its change waits at the check; a failed change comes back to
   it. Gain: clock time, not tokens (C56); no measured gain carries over (C30, in part: Aether's 68 % came from relieving
   scheduler overload). It needs a second unit ready, a way back for a failed change, and a limit on changes in flight
   per worker, since a late failure invalidates stacked work and each redo costs tokens (C62, in part); IMS Fast Path's
   dummy region is the closer precedent (C31). Mark: hypothesis. Measurements: the share of a worker's cycle spent
   waiting at the check (rule measurement 2); tokens of a redone unit. Helps only where the check binds.
5. **Make the queue visible and fair.** Log the slot count and the number waiting (C49); give a slot to the shortest
   expected check, then the oldest (C51, designed); set the lane's timeout cap and hold-break age above the longest check
   (C50, C63). Gain: none by itself; it makes measurement 7 and Step 5 possible and lets an hour-long check run. Mark:
   hypothesis.
6. **The worker cap.** Keep case B; once batching runs, use S C(k, p) in place of S (C18, in part); start fewer workers
   where waits must stay short, since they begin below the cap (C08, C66). Mark: c = 1 proven, c > 1 computed.

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
- **Read only in part:** Fallahzadeh 2025 (abstract and headline lines, C26; the refuter read lines 1080-1086, 1557-1566,
  1752-1756); Denning and Buzen (bottleneck and terminal sections); Najafi 2019 (about 80 %); Uber 2025 (about half).
- **Read at the source in the fold:** `P:bmw/paper.txt:88-120`, to settle C44 (gate STANDS, refuter REFUTED);
  `P:contrast-tsp-batch/paper.txt:157-163, 1078-1087, 1555-1567`, to word C26's narrowed form exactly.

## 5. Proposed corrections

Each is an `open` record "proposed correction of <id>" in `library/journal/2026-11-19/c1.jsonl`, beside a `result` of
this lane; no record is edited here.

| Record or page | What it says | What contradicts it | Claims | Open record |
|---|---|---|---|---|
| o1-0402 (hypothesis, reasoned); DECISION-RULE.md line 74 and BUILD-IN.md line 110 carry the same mark | Workers past c (T_out + T_check)/T_check only queue | For c = 1 the form is published; for c > 1 it is the exact model's crossing and follows from two bounds for any distribution; waits begin below it | C02-C04, C07, C08 | c1-0500 |
| x15-0405, x15-0406 (hypothesis, reasoned) | A batch of k pays when (1 − p)^k > 1/k; below 0.29 for 2 to 4 | That is Dorfman 1943 (cost and Table I); pools of 3 beat one by one below 0.307 and a pool of 2 is never best | C19, C21 | c1-0501, c1-0502 |
| x06-0404 (hypothesis, "no measured number") | Batching loses at a high failure rate | Dorfman's table (30 %: 1 % saved); Najafi (2.4 times the culprit rate: batch 4, 46 %); the thesis (best batch four at 19.36 and 22.51 %, nothing over 25 %) | C19, C23, C24 | c1-0503 |
| x06-0402 (hypothesis) | Zuul loses with flaky tests or a high failure rate | Zuul's own documentation says so; Uber 2025 says it of GitHub and GitLab (self-reported); a run whose base passes is not lost | C34, C35, C61 | c1-0504 |
| x06-0400 (hypothesis) | A serial gate caps throughput at one check per merge unless batched | Testing ahead also passes it (Zuul: at best as many changes as execution contexts at once); Rust batches at about 3 hours | C35, C37, C61 | c1-0505 |
| x06-0333, x15-0353, x06-0334 (summary) | Zuul window 20, +1, halved; GitHub limits 1 to 100 | Read at the documentation pages; GitHub adds "Merge limits do not combine merge_group builds" | C35, C36 | c1-0506, c1-0507, c1-0508 |
| x06-0335 (summary) | Najafi: 42 or 47 %, which unconfirmed | Najafi: 72 % without flaky tests, 41 % (body) or 42 % (abstract) with them; maximum savings 50, 47 and 74 % in its three projects | C23 | c1-0509 |
| x06-0336 (summary) | Concordia 2023: 72, 91, 81 % | Read in the paper: 91 % is BatchAll (90.78 % at Chrome), 72 % is Batch4 at Chrome (71.89 %), which at Ericsson needed more machines; 81 % not checked | C25 | c1-0510 |
| x06-0354 (textbook), x06-0511 (open) | Luo: of 201 fixes, 45, 20, 12 % | 201 commits were examined; the shares are of the 161 classified fixes | C43 | c1-0511, c1-0512 |
| x05-0501 (open) | DeWitt 1984 not opened | Opened; the group-commit section read | C29 | c1-0513 |
| x05-0607 (mistake) | Attributing group commit to DeWitt 1984 was wrong | Holds in part: DeWitt describes and sizes it but calls it folklore; IMS Fast Path had it before it was named | C29, C31 | c1-0514 |
| DECISION-RULE.md lines 41-44 (the mistake r57-0610 records) | "a check shared by separate programs" among the parts with no paper | The finite-source queue, batch testing and merge queues are such checks | C01-C06, C23-C25, C33-C37 | c1-0515 (open task) |
| arXiv 2105.08198 given as a Bavand paper | | No library record carries it: x06-0368 and x06-0707 name it, correctly, as Mauerer and others 2021; the uncommitted folder `P:bavand-mine/` holds the Mauerer paper, so its name misleads | none | none |
| o1-0301 to o1-0303 | Suleman 2008, quoted | Re-read at the source; the figures match. No change | C16 | none |

## 6. Verdicts

Gate: 178 rows, 167 STANDS, 11 NO QUOTE (all hypotheses), no fault, so no quotation was moved or dropped. Refuter, folded:
**66 claims: 41 confirmed, 23 hold in part, 2 refuted, 0 cannot be checked.** Confirmed: C01-C09, C13, C16, C17, C19,
C20, C27-C29, C31, C33, C35-C37, C39-C43, C45-C56, C58, C65. Not confirmed, one line each (the narrowed form is the one used):

- C10 in part: MVA's chapter 6 excludes load-dependent centres, but chapters 8 and 20 extend it; the robustness sentence is about homogeneity.
- C11 in part: within 15 % at five customers for ratios 0.1 to 4; with 2 to 15 customers the error grew, under 20 % at fifteen.
- C12 in part: the paper "associates" retrograde throughput with load-dependent servers; "only when" is not its word.
- C14 in part: the paper gives no warning against extrapolating (it extends its own fit to N = 100); the peak moved after a lock change.
- C15 in part: 16 -> 32 threads is MySQL alone; 34 % is the average over 12 workloads; 7 of 12 improved.
- C18 in part: the batched N* is a crossing of upper bounds; condition (c) was backwards (a greedy batch capped at k fits it).
- C21 in part: 0.307 is exact for pools of 3; 0.382 is an asymptotic result, not a finite batch.
- C22 in part: the setting is parallel testers, and the text says "may be some conflict", a remark.
- C23 in part: failing batches were bisected; "best" is most cost-effective; maximum savings 50 and 74 %; 42 % abstract, 41 % body.
- C24 in part: savings 44 to 50 % (RiskTopN 44 %), not 46 to 50; owncloud's best batch was 15 (failures in runs).
- C25 in part: Batch4 needed 61 machines at Chrome (71.89 % fewer) but more at Ericsson; batches run the union of selected tests.
- C26 in part: the 99 % comes from projects with many builds; with few builds (JMRI) a selection algorithm missing up to 55 % of failures was fastest.
- C30 in part: the 68 % is one TATP transaction, from relieving scheduler overload; only "detach and continue" carries.
- C32 in part: 99:1 is passed to failed test targets per change, not a failure rate per change.
- C34 in part: a before-and-after of a rollout that changed three things, not a test of the threshold alone.
- C38 in part: on short suites the time was up to 138 % of running all tests, so up to 38 % slower.
- C44 refuted: BMW's gate runs the same Bazel-affected targets as its pre-submit pipeline; only history-based selection is left out.
- C57 in part: our split (pre-check selects, gate runs all) is our own design, not BMW's.
- C59 in part: one run per batch rests on our full-suite gate alone; a selecting gate runs the union of the selections.
- C60 in part: the batch cap needs p; the CI papers bisect; one by one in two rounds saves time, not runs.
- C61 in part: success-path speculation loses runs only when a change ahead fails; it is how a serial gate uses c > 1.
- C62 in part: detaching needs a cap on changes in flight per worker; C30's cause does not carry.
- C63 in part: the timeout (at most 25 minutes) kills the command; the 20-minute break lets a waiter start beside it.
- C64 refuted: a split reruns the same merged code; non-reproduction comes from flaky tests or pair failures; "2 to 4" has no source.
- C66 in part: the arithmetic holds, but waits start below N*, and c runs side by side at full speed is assumed.

### What the two refutations changed

**C44** (BMW keeps the full suite at the merge gate, on purpose). The fold read `P:bmw/paper.txt:88-120`: the gate
"runs the same tests as our pre-submit pipelines", which run the Bazel-affected targets, and running all tests against
every change is "infeasible"; only the history-based optimisation is kept out of the gate, as a fail-safe.

- Before (draft section 3(e), item 2): "select by changed files in the builder's pre-check; keep the full suite at the gate
  (C44, C57)." After (item 1): "at the gate run the full suite while there is no dependency map (our design's reason,
  x15-0409: a lib change selects every test file), then the dependency-selected targets as BMW's gate does; keep
  prediction-based selection out of the gate (C39 relies on later full runs)."
- Before (draft section 3(b)): "selection alone may miss 55 % of failures (C26), so a full run must follow (C39, C44)."
  After: "selection may miss up to 55 % of failures (C26); BMW's gate runs the dependency-selected targets and keeps its
  history-based selection out (C44 refuted)."
- Before (draft answer, line 3): "Shorter runs: 32 to 54 %, nothing under a minute (C38). The two multiply." After: the
  sentence "The two multiply" is withdrawn: through C59 (which leaned on C44), one run per batch holds only while the gate
  runs the full suite; a selecting gate runs the union of the batch's selections.
- Moved: no number. Conclusions: "full suite at the gate" lost its published precedent and is now our own choice;
  dependency selection at the gate is the published practice; with C26, shortening moved from rank 2 to rank 1.

**C64** ("a rerun is not the same run" acts on batching as flakiness does and shrinks the best batch toward 2 to 4).
A split reruns the same merged code, so a batch failure that does not reproduce comes from flaky tests (C23) or from
changes failing together (C65), not from a session's nondeterminism; the claim's own inference line said as much.

- Before (draft section 3(e), item 1): "Mark: mechanism proven (C19, C23-C27); fit to model sessions hypothesis (C59, C60,
  C64, C65). Measurements: ...; share of failures that do not repeat on the same tree." After (item 2): "Mark: mechanism
  proven (C19, C20, C27); CI figures hold in part (C23-C26); fit to model sessions hypothesis (C59, C60, C65).
  Measurements: ...; the flaky share of our tests, failures that do not repeat on the same tree (flakiness moved
  Ericsson's best batch from 9 to 4 and its saving from 72 to 41 %, C23). Where a returned change is redone, each batch
  failure also costs tokens for a new run of the unit; no source sizes it."
- Moved: the claim's "2 to 4" for model sessions is dropped (no source; Ericsson's 4 under flaky tests stands). The
  measurement stays but now measures our tests' flakiness, not session behaviour; session nondeterminism enters only as
  the token cost of redoing a returned change, a second reason for small batches whose size is unmeasured.

## Addendum: queues in real use (added after the refutation; checked by the gate only)

These findings came after the analysis and the refutation, were not refuted, and are checked only for their quotes
(ranks are those of section 3 (e); `R/` is the folder `R:`; brackets give the saved text's line, as the collect file
states it).

- **A1.** GitHub's queue builds groups from what waits: "dynamically forms groups of pull requests that are candidates
  for deployment, kicks off builds and tests". Source:
  https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/
  . Quote at R/c1-collect-production.md#line 24 [gh.txt l.173].
  - Rank 2 (batch what waits): agrees; no group size is given.
- **A2.** Before the queue, GitHub's hand-run trains: "Trains could also grow large, containing the changes of 15 pull
  requests. Large trains frequently derailed due to a deployment issue, conflicts, or the need for an engineer to
  remove their change. On painful occasions, developers could wait 8+ hours after joining a train for it to ship, only
  for it to be removed due to a conflict". Self-reported: 15 pull requests in a train; waits of 8+ hours. Source: as
  A1. Quote at R/c1-collect-production.md#line 25 [gh.txt l.158].
  - Rank 2: agrees that a group needs a cap; no failure rate is given, so it says nothing on the cap's size.
- **A3.** GitHub's stated rule: "Those causing conflicts or build failures should not impact all other pull requests
  waiting to merge. The throughput of the overall system should be favored over fairness to an individual pull
  request." Source: as A1. Quote at R/c1-collect-production.md#line 26 [gh.txt l.164].
  - Rank 2: agrees that a failing change is taken out so the rest go on. Rank 5 (visible and fair): narrows its
    fairness; the rule puts the whole queue's throughput before fairness to one change.
- **A4.** GitHub's result: "shipping 30,000+ pull requests with their associated 4.5 million CI runs" (before general
  availability) and "Every month, over 500 engineers merge 2,500 pull requests into our large monorepo with merge
  queue, more than double the volume from a few years ago. The average wait time to ship a change has also been reduced
  by 33%." Self-reported: 30,000+ pull requests and 4.5 million CI runs (runs across all checks, not one serial check);
  500 engineers and 2,500 pull requests a month; average wait to ship 33 % lower than before the queue, the absolute
  wait not given. Source: as A1. Quotes at R/c1-collect-production.md#line 27 [gh.txt l.172, l.176].
  - Says nothing on any rank: no batch size, failure rate or absolute wait is given, so the drop ties to no measure.
- **A5.** Shopify's batch size: "Shopify changes 40 times a day ... merge around 400 commits to master daily" and
  "Larger batches result in higher theoretical throughput, but higher risk. In practice, the increased risk of larger
  batches impedes throughput by causing failures that are harder to isolate, and results in an increased number of
  rollbacks. In our application, we went with a batch size of 8". Self-reported: 40 times a day; about 400 commits a
  day; batch size 8, where a batch is the most pull requests allowed in one deploy (line 36). Source:
  https://shopify.engineering/successfully-merging-work-1000-developers . Quotes at
  R/c1-collect-production.md#line 37 [shop1000.txt l.93, l.139].
  - Rank 2: agrees that the cap is set by the risk of failures that are hard to isolate; narrows: this cap is tied to
    a deploy, and no failure rate is given, where the report's cap comes from a measured p.
- **A6.** Shopify runs ahead in the queue: "At any given time, we run CI on 3 batches worth of pull requests in the
  queue." Self-reported: 3 batches. Each pull request is tested on top of those ahead of it (line 40). Source: as A5.
  Quote at R/c1-collect-production.md#line 37 [shop1000.txt l.140].
  - Rank 3 (test ahead on the success path): agrees on a bounded window; no gain is given, and no rule for shrinking
    the window after a failure.
- **A7.** Shopify's rule for flaky tests: "legitimate failures will propagate to all later CI runs, but flaky tests
  will not block later CI runs". The collect file also reads their table (values in order, header labels lost in the
  strip, so not a quote): for an assumed 25 % flake rate, 6.25, 1.5, 0.39 and 0.097 % false removal after 2, 3, 4 and
  5 failures in a row; tolerance 3 chosen, so a pull request is removed on its 4th failure in a row. Self-reported:
  all these figures; the 25 % is an example, not their measured rate (line 40). Source: as A5. Quote at
  R/c1-collect-production.md#line 38 [shop1000.txt l.122, l.126-135].
  - Rank 2 (its measurement of the flaky share): agrees that a real failure is one that repeats; the removal after
    several failures in a row is a rule the report does not have.
- **A8.** Shopify before its second queue: "upwards of 50 pull requests ... could take hours to merge and deploy".
  Self-reported: 50 or more pull requests; hours. No figure for the same case after (line 39). Source: as A5. Quote at
  R/c1-collect-production.md#line 39 [shop1000.txt l.105].
  - Says nothing on any rank: a before figure with no after.
- **A9.** Rust's serial gate: "at most a single auto build is being executed" and "testing a single PR at a time,
  combined with our long CI (~2 hours for a full run), means we can't merge a lot of PRs in a single day, and a single
  failure greatly impacts our throughput. The maximum number of PRs we can merge in a day is around ~10."
  Self-reported: about 2 hours a full run; about 10 pull requests a day at most. Source:
  https://raw.githubusercontent.com/rust-lang/rustc-dev-guide/master/src/tests/ci.md . Quotes at
  R/c1-collect-production.md#line 50 [rustci.txt l.109] and #line 48 [rustci.txt l.307-310, line corrected by the gate, c1-addendum-gate.md].
  - Rank 6 (the worker cap, c = 1) and rank 1 (shorten the run): agrees; one slot and the run time set the daily
    ceiling (line 49: the self-reported 2 hours allow at most 12 a day, the collector's arithmetic). No failure rate
    is given.
- **A10.** Rust's rollups: "a PR where we merge several pending trivial PRs so they can be tested together ... created
  manually by a team member ... uses their judgment to decide if a PR is risky or not." Source: as A9. Quote at
  R/c1-collect-production.md#line 48 [rustci.txt l.325-330].
  - Rank 2: agrees on testing waiting changes together; narrows: a person picks which changes are safe to group, and
    no rollup size, failure rate or gain is given (line 49).
- **A11.** Chromium's flaky tests: "The CQ has roughly ~20,000 unique flaky tests, without retries, pretty much no CL
  would ever pass the CQ." and "adding retries increases the probability that a flaky test will land on tip of tree
  sublinearly, but mitigates the impact of the flaky test on unrelated CLs exponentially". Self-reported: about 20,000
  flaky tests. Source: https://chromium.googlesource.com/chromium/src/+/main/docs/infra/cq.md . Quotes at
  R/c1-collect-production.md#line 58 [chromcq.txt l.158, l.157].
  - Rank 2 (its measurement of the flaky share): agrees that flakiness can decide whether anything passes. The report
    ranks no retry rule, so on retries it says nothing.
- **A12.** Chromium's limit on run time: "Median cycle time needs to be under 40 minutes for trybots. 90th percentile
  should be around an hour (preferably shorter)." A builder must "catch enough failures to be worth adding"; one that
  fails once every couple of weeks is "probably not worth adding". Self-reported: under 40 minutes median, about an
  hour at the 90th percentile; a requirement for a builder to join, not a measurement. Source: as A11. Quotes at
  R/c1-collect-production.md#line 58 [chromcq.txt l.140, l.141].
  - Rank 1: agrees that run time is held down by rule; no gain is given. The failure yield per builder is not among
    the ranked measures: says nothing there.
- **A13.** Chromium's two sizes of check: the normal run "optimizes for quick turn-around time while still catching
  most but not all regressions"; a Mega CQ runs far more tests "regardless of cycle time" for risky changes. Source: as
  A11. Quotes at R/c1-collect-production.md#line 59 [chromcq.txt l.46].
  - Rank 1: narrows its rule of the full suite at the gate: here the gate's normal run is a curated set that misses some
    regressions, with a long run for risky changes; how the set is chosen is not stated.
- **A14.** Kubernetes Tide batches first: "Automatically runs batch tests and merges multiple PRs together whenever
  possible." and "Tide prioritizes batches over individual PRs ... will wait for the batch to complete and will merge
  the individual PR only if the batch fails." Source:
  https://raw.githubusercontent.com/kubernetes-sigs/prow/main/site/content/en/docs/components/core/tide/_index.md and
  the maintainer's guide beside it (the collect file gives its path only as `.../maintainers.md`). Quotes at
  R/c1-collect-production.md#line 67 [tide-index.txt l.23; tidemaint.txt l.19].
  - Rank 2: agrees; no batch size, gain or failure rate is given (line 68).
- **A15.** Tide on merges made outside it: "Don't let humans (or other bots) merge especially if tests have a long
  duration. Every merge invalidates currently running tests for that pool." and "Any merge to a pool kicks all other
  PRs in the pool back into `Queued for retest`." Source: the maintainer's guide, as A14. Quotes at
  R/c1-collect-production.md#line 67 [tidemaint.txt l.10, l.18].
  - Rank 3: agrees that a run counts only for the base it ran on, so a merge outside the queue voids the runs in
    flight; no figures.
- **A16.** Mozilla's autoland: patches land on a shared integration branch "that is continuously tested", and the
  branch is closed to new pushes while sheriffs back out a failing change (line 74, the collector's words). The checks
  run after landing, not before. Source: https://firefox-source-docs.mozilla.org/testing/automated-testing/tree-closure.html
  . Quote at R/c1-collect-production.md#line 74 [moztree.txt l.163-164].
  - Says nothing on any rank: the check comes after landing, and no closure, backout or batch figures are given.

Not found (the collect file's own gaps):

- None of the six accounts gives a controlled before and after for batching at a known failure rate (line 98).
- GitHub: no wait time before the self-reported 33 % drop, no batch size, no failure rate (lines 27, 81).
- Shopify: no before and after figures for the second queue (line 39); a later move to a vendor's queue was seen only
  as a search snippet on a vendor page that returned 404, and is not cited (lines 79, 87).
- Rust: no failure rate, rollup size or rollup gain (line 49); its blog post on the GHA migration returned 404 (line 88).
- Chromium: no measured gain (line 60).
- Kubernetes: no batch size, gain or failure rate in the pages read, and no project account with batch figures (lines
  68, 80).
- Mozilla: no closure, backout or batch figures; an older team page with figures was seen in a search, not opened,
  and is not cited (lines 75, 89).
