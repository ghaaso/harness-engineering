# c1 claims: one serial check shared by many workers (draft, step 2, 2026-11-19)

`R:` = `docs/program/evidence/round3-2026-11-18/`. `P:` = `R:papers/check/` (the paper texts, not committed).
Every quotation below was opened at the cited line of the saved text by the analyst on 2026-11-19 (grep and read).
Where the collect file gave another line, the line here is the one where the words stand. Formulas lost in the
text layer are described in square brackets, never quoted.

Marks (ROUND.md, r57-0010): `proven` = stated in the literature, with the quotation; qualifiers say when the text is
documentation, a secondary text, a preprint or a simulation. `measured here` = a record of our own measurement or of
our own code (library id). `hypothesis` = no quotation states it; the block says what it is inferred from.
`hypothesis (computed)` = arithmetic on a published model, done here, method in the block and in the appendix; no
source states the result, so it stays a hypothesis until the refuter has checked it.

Symbols used in every block: S = mean time of one check run (inside); Z = mean time a worker spends on its own
between two checks (outside); c = check slots; N = workers; p = share of changes that fail the check; k = changes
per check run (batch).

Counts: 66 claims. proven 42, measured here 10, hypothesis 14 (of them 2 computed).

---

## A. The model: workers that alternate between their own work and one shared server

### C01. Denning and Buzen define the saturation point N* = R0 / (Vb Sb): past it, queueing somewhere is certain.
- Mark: proven.
- Quote: "In words, k > N* would imply with certainty that jobs queue somewhere in the system. Since N* thus represents the load beyond which queueing is certain to be observed, we call N* the saturation point of the system." [the formula k < N* = R0/VbSb stands beside it, garbled by the columns]
- Where: `P:denning-buzen/paper.txt:958-966`.
- Holds when: "the visit ratios and mean service times are invariant under changes in N" (`P:denning-buzen/paper.txt:943`). No assumption on the distribution of times (operational analysis). One device saturates first (the largest V_i S_i).

### C02. With M terminals and think time Z the same paper puts the knee at Mb* = (R0 + Z) / (Vb Sb); with one check as the only queueing centre this is (S + Z) / S.
- Mark: proven (the formula); the substitution R0 = Vb Sb = S is a one-line mapping, not a quotation.
- Quote: "Mb* = (Ro + Z}/VbSb = N* + Mb." and "when there are more than Mb* terminals, queueing is certain to be observed in the central subsystem." Origin: "concept of saturation point was introduced by Kleinrock [KLEI68], who also studied" (all these results in detail in his book).
- Where: `P:denning-buzen/paper.txt:1030-1033`, `:1040-1041`.
- Holds when: as C01. The mapping needs the check to be the only place a worker queues (a worker's own work is the "terminal" think time Z).

### C03. The finite-source single-server queue names the same point the "saturation number", N* = (b + 1/λ)/b, and in a deterministic system it is the most workers that do not interfere.
- Mark: proven (secondary text; it cites Kleinrock vol. II sec. 4.12 p. 209, not opened).
- Quote: "The value of N, denoted by N*, at which two straight lines E[T] = b and the one in (20) as a function of N intersect each other is called the saturation number by [42] (sec.4.12)." "Note that this can be written as N* = (b + 1/λ)/b. Therefore, if nature were kind and all messages required exactly b service time and exactly 1/λ generation time (a deterministic system), then N* would be the maximum number of messages that could be scheduled without causing mutual interference [42] page 209." [symbols restored; the text layer drops λ and the star]
- Where: `P:sztrik-fsqs/paper.txt:561-571`; the same in the book, `P:sztrik-book/paper.txt:381-391` (reference [24] there).
- Holds when: one server; each source asks again an exponential time 1/λ after its last service ends; b = mean service time (here b = S, 1/λ = Z, so N* = (S + Z)/S). Line (20) is the heavy-load line E[T] ≈ N b − 1/λ (`P:sztrik-fsqs/paper.txt:555`).

### C04. Asymptotic bounds hold under one assumption only, and the optimistic bound has a light-load and a heavy-load part that cross at one population N*.
- Mark: proven.
- Quote: "The validity of the bounds depends on only a single assumption: that the service demand of a customer at a center does not depend on how many other customers currently are in the system". Worst case: "each additional customer is forced to queue behind all other customers already in the system"; best case: "each additional customer is not delayed at all by any other customers in the system". "Note that the optimistic bound consists of two components, the first of which applies under heavy load and the second of which applies under light load." "This crossover point occurs where the values of the two bounds are equal". [bounds N/(ND+Z) <= X(N) <= min(1/Dmax, N/(D+Z)) garbled at lines 253-257; equating gives N* = (D + Z)/Dmax]
- Where: `P:lazowska/chap05.txt:103-105`, `:238-240`, `:244-248`, `:259-264`.
- Holds when: demand per customer independent of the population (this fails if a wait causes extra work, or if two runs slow each other).

### C05. For n processors the textbook's first cut divides the demand by n; it warns this is only a first cut, and the true service rate rises with the queue until all processors are busy.
- Mark: proven.
- Quote: "the straightforward approach to modelling n tightly-coupled processors is to create a single center representing them in the model, and to divide the service demands of all customers at that center by n." "This technique provides a simple, first-cut modelling approach, but it ignores two important aspects of multiprocessors. The first aspect is that the total service rate of n processors can be significantly less than n times the rate of a single processor". "Service rates increase with queue length until all four processors are busy, after which increasing the number of jobs contending for the processors does not result in any increase in effective service rate."
- Where: `P:lazowska/chap11.txt:85-88`, `:91-94`, `:126-129`.
- Holds when: tightly coupled processors, one queue. The "divide by n" cut is the origin of the form 1 + cZ/S (a single server c times faster gives light-load response S/c).

### C06. The exact finite-source queue with r servers (M/M/r//N) is published with its steady-state probabilities and its mean times.
- Mark: proven.
- Quote: "Suppose that there are N machines and r operators, (r < N)"; the repair rate is "nμ, n = 1, 2, . . . , r," and "rμ, n = r + 1, . . . , N." [μ restored]; "Letting ρ = λ/μ (the servicing factor), the steady-state probabilities are" (2.1) [P_n = C(N,n) ρ^n P0 for 0 <= n <= r; P_n = N!/((N−n)! r! r^(n−r)) ρ^n P0 for r <= n <= N, garbled]; measures "1. The expected (average) number of down machines", "6. Average down time of machines" [T = E(L)/(λ(N − E(L)))], "7. Mean waiting time of machines" [W = Q/(λ(N − E(L)))].
- Where: `P:sztrik-book/paper.txt:564`, `:585`, `:601-605`, `:639-650`, `:660`, `:702-705`.
- Holds when: exponential times between requests and exponential service, each request served by one server, first come first served. In our terms a "down machine" is a worker waiting for or inside the check; its "down time" T is its time at the check.

### C07. On the exact M/M/c//N model the two asymptotes cross at N* = c (S + Z)/S for every c and Z/S tried; the form 1 + cZ/S is c − 1 too low.
- Mark: hypothesis (computed). No source read states N* for c > 1 (`R:c1-collect-queue.md` Gaps and Second attempt). Inferred from C06 by arithmetic, and from C03's definition of the saturation number (where the light-load line E[T] = b meets the heavy-load line).
- How it was computed: a 60-line Node script (appendix) evaluates Sztrik's (2.1), E[L], measure 6 and measure 7 exactly (log space, no simulation, no measurement) for c = 1, 2, 3, 4 and Z/S = 0.5, 1, 3, 10. Three checks: (A) T/S = 1.000000 for every N <= c (no one waits while each worker has a slot; this also follows from the rate nμ for n <= r, C06); (B) the gap T − (N S/c − Z) is 0.0000 by N = 5 x N*, so the heavy-load line is N S/c − Z; (C) a line fitted through two large N returned slope 1/c and intercept −Z to four or six places, and its crossing with T = T(1) = S was 1.5, 2, 4, 11 (c = 1), 3, 4, 8, 22 (c = 2), 4.5, 6, 12, 33 (c = 3), 6, 8, 16, 44 (c = 4): exactly c (1 + Z/S) in all 16 cases, against 1 + cZ/S = 2, 3, 7, 21 (c = 2), and so on. For c = 1 it reproduces Sztrik's 1 + 1/(λb) (C03).
- Why the other form is wrong: it comes from the "divide by n" first cut (C05), which makes a lone change take S/c. In the exact model a lone change still takes S (check A).
- Holds when: as C06 (exponential times, one queue in front of c equal slots), and S, Z not changed by N (C04). Deterministic times: by the same argument as C03's p. 209 remark, c (S + Z)/S workers can be scheduled without interference (reasoned).

### C08. At N = c (S + Z)/S the exponential model already queues: where N* is a whole number the check is 79 to 84 % busy for c = 1 and 85 to 92 % for c = 2 to 4, and a change waits 0.16 to 2.15 check times on average; so N* is where the bounds cross, not where waiting starts.
- Mark: hypothesis (computed), same script (check B in the appendix). Values (use U = X S / c; W/S = mean wait before the run):
  c = 1: Z/S 1 -> N 2, U 0.80, W/S 0.50; Z/S 3 -> N 4, U 0.79, W/S 1.04; Z/S 10 -> N 11, U 0.84, W/S 2.15.
  c = 2: Z/S 1 -> N 4, U 0.85, W/S 0.35; Z/S 3 -> N 8, U 0.85, W/S 0.71; Z/S 10 -> N 22, U 0.88, W/S 1.48.
  c = 4: Z/S 1 -> N 8, U 0.89, W/S 0.25; Z/S 3 -> N 16, U 0.89, W/S 0.49; Z/S 10 -> N 44, U 0.92, W/S 1.02.
  At 1 + cZ/S (c = 2, Z/S = 3, N = 7) the check is 78 % busy and W/S = 0.49.
- Inferred from C06; agrees in direction with C04 (the real curve lies below both bounds) and C09 (with variability critical WIP alone does not reach the maximum). The knee is sharper for more slots (higher use, less wait at N*), which answers the open question in `R:c1-collect-queue.md` line 103.
- Holds when: exponential times. A test suite has a nearly fixed length, so its wait at N* is lower than this (by C03's deterministic remark; the size of the change is a measurement: mean and spread of S, C11).

### C09. Factory physics states the same point as critical WIP W0 = rb x T0: above it only waiting grows, and with variability holding W0 does not reach full throughput.
- Mark: proven (secondary text quoting Hopp and Spearman 1996; the book was not opened).
- Quote: "'Critical WIP' (W0), which Hopp & Spearman define as the WIP level that achieves the maximum throughput (bottleneck rate, or rb) and minimal cycle time (raw process time, or T0) in a process flow with no variability." "W0 = rb x T0". "Any WIP above this level would not result in additional throughput, but rather increases CT due to additional wait time. Any WIP level below W0 would result in lost throughput." "maximum throughput cannot be achieved by merely setting the target WIP as same as the critical WIP."
- Where: `P:littles-law-prod/paper.txt:106-108`, `:114`, `:116-118`, `:121`.
- Holds when: one bottleneck. With rb = c/S and T0 = S + Z, W0 = c (S + Z)/S (substitution, reasoned; matches C07).

### C10. Mean value analysis is exact only for load-independent centres; a pool of c slots is load dependent, but the models are robust to such violations.
- Mark: proven.
- Quote: "The particular versions of the MVA algorithms presented in this chapter are applicable only to networks consisting entirely of load independent and delay centers." "Experience has shown that the accuracy of queueing network models is extremely robust with respect to violations of these assumptions."
- Where: `P:lazowska/chap06.txt:1024-1025`, `:1032-1034`.
- Holds when: as stated; chapters 8 and 20 (load-dependent centres) were not read.

### C11. With general (non-exponential) service and 15 workers or fewer, a two-moment model of the machine-repair queue is within 15 %, so the spread of the check time matters, not only its mean.
- Mark: proven.
- Quote: "For values of the ratio between 0.1 and 4, the absolute value of the error is at most equal to 15% which can be considered good." "Below seven customers, the error is less" (than 10 %).
- Where: `P:iiasa-mrm/paper.txt:459-460`, `:474`.
- Holds when: one server, an infinite-server delay station (the workers' own time), small N (3 to 16 is its range).

### C12. In the standard machine-repair model throughput only levels off; it can fall with more workers only when service gets slower with load, and synchronous arrival is the worst case.
- Mark: proven.
- Quote: "Retrograde throughput, of the type exhibited in Fig. 1, is not possible in the standard MRM for any choice of N, S or Z." "Synchronous queueing produces worst-case throughput and it therefore represents a lower bound [ZSEG82]".
- Where: `P:gunther-zone/paper.txt:237-240`, `:302-304`. The same page prints the plateau as "N > S/(S + Z)" (line 238), the inverse of C01 to C03; read as a slip (its Fig. 4 normalises by (S+Z)/S).
- Holds when: exponential times, one server. For us: if two check runs slow each other (DECISION-RULE measurement 3), more workers can lower throughput.

### C13. The Universal Scalability Law is the synchronous throughput bound of a machine-repair queue with load-dependent service; Amdahl's law is its special case.
- Mark: proven.
- Quote: "We prove that Cp is equivalent to the synchronous throughput bound for a machine-repairman with state-dependent service rate. Simpler rational functions, such as Amdahl's law and Gustafson speedup, are corollaries of this queue-theoretic bound." "is a lower bound on throughput; synchronous throughput, and therefore represents worst-case" (scalability).
- Where: `P:usl-gunther/paper.txt:11-14`, `:714-715`.
- Holds when: one server, mean values, steady state.

### C14. A scalability peak moves when the serial part is shortened, and a fit needs at least six measured points and must not be trusted outside them.
- Mark: proven.
- Quote: "Measurements should include at least half a dozen data points in order to make the regression analysis statistically meaningful." "Nc may lie outside any physically attainable system configuration." "The original scalability peak at Nc = 22 threads (lower curve) is now moved out to Nc = 48 threads (upper curve)."
- Where: `P:usl-fits/paper.txt:113-114`, `:121-123`, `:622-624`.
- Holds when: memcached on one machine, after lock and statistics changes.

### C15. Running the serial step faster moved a program's saturation from 16 to 32 threads and cut average time 34 %.
- Mark: proven (cycle-accurate simulation of a chip that does not exist).
- Quote: "This contention can become so high that every thread might need to wait for several other threads before it can enter the critical section. In such a case, adding more threads to the program does not improve (and in fact can degrade) performance." MySQL "causes performance to saturate at 16 threads"; "Performance of ACS continues to increase until 32 threads." "We find that ACS reduces the average execution time by 34% over an equal-area 32-core symmetric CMP".
- Where: `P:suleman-acs/paper.txt:254`, `:40`; scalability improved in "7 of the 12 applications" (`:914`).
- Holds when: one critical section every thread passes; 12 workloads.

### C16. When one task is cut into pieces that each pass one serial step, the best count is the square root of (time outside / time inside) (our rule's case A).
- Mark: proven.
- Quote: "When each thread is required to execute the critical section, the total time spent in the critical section increases linearly with the number of threads". "Equation 3 shows that (PCS) increases only as the square-root of the ratio of time outside the critical section to the time inside the critical section." Measured: "the execution time with SAT is within 1% of the minimum execution time" (four programs).
- Where: `P:suleman-fdt2008/plain.txt:30`, `:210`, `:260`.
- Holds when: total serial time grows with the number of pieces (fixed work split N ways). Not the case of one check per change (C07 is).

### C17. The batch-service queues read give no saturation number for workers: the bulk queue read is open (Poisson), and the finite-population one waits until K changes have gathered.
- Mark: proven (model definitions).
- Quote: Holman and others: the server "does not start service until A (quorum, less than B) customers have" accumulated. Kalyanaraman and Janani: "than K customer in the queue the server waits, that is server becomes idle until, the size" reaches K.
- Where: `P:bulk-general/paper.txt:17`; `P:kalyan2023b/paper.txt:100-101`.
- Holds when: as stated. A quorum K above the number of workers in play would never start (reasoned in `R:c1-collect-queue.md` P8).

### C18. With batching, the saturation point keeps the form c (S + Z)/d, where d is the check time spent per change: d = S without batching, d = S x C(k, p) under Dorfman when a run over k changes costs one run.
- Mark: hypothesis. Inferred from C04 (N* = (D + Z)/Dmax with D the light-load time and Dmax the bottleneck demand per customer), C07 (c slots), and C19 (Dorfman's runs per item C(k, p) = 1/k + 1 − (1 − p)^k).
- Arithmetic from Dorfman's own Table I (C19): the gain factor 1/C on N* is 5.0 at p = 1 % (k = 11), 3.7 at 2 %, 2.3 at 5 %, 1.7 at 10 %, 1.2 at 20 %, 1.01 at 30 %.
- Holds when: (a) a run over k changes takes about one run's time (Dorfman's condition 2, C20; for us C59); (b) failures independent across changes (C65); (c) the batch is fixed at k. If the batch is "whatever waits" (greedy), d depends on N and C04's assumption fails; then the group-commit fixed point applies (C27): the cap becomes the added check time per change, 1/δ.

## B. Carrying more per check run

### C19. Dorfman's pooled test costs 1/n + 1 − (1 − p)^n tests per item; at p = 1 % the best pool is 11 and saves 80 %, at 10 % it is 4 and saves 41 %, at 30 % it is 3 and saves 1 %.
- Mark: proven (formula and table; not a measurement on a workload).
- Quote: "E(T) = N/n + n(N/n)p'" and Table I rows "1 11 20 80", "10 4 59 41", "30 3 99 1" (prevalence %, optimum group size, relative cost %, saving %).
- Where: `P:dorfman/paper.txt:121`, `:152-187` (rows at 156, 174, 186).
- Holds when: each item fails independently with one known p; a pool test is as informative as one item test; no test error; two rounds.

### C20. Dorfman's two conditions: the rate must be small, and a test on a group must be cheaper than on its members one by one.
- Mark: proven.
- Quote: "1. That the prevalence rate be sufficiently small to make worth while economies possible; and" "2. That it be easier or more economical to obtain an observation on a group than on the individuals of the group separately."
- Where: `P:dorfman/paper.txt:196-197`, `:205-206`.
- Holds when: always (these are the conditions of use).

### C21. Pools of 3 beat one-by-one testing below p = 0.307, one-by-one is optimal above 0.382, and the two-stage scheme is preferred when each test is slow.
- Mark: proven (survey, theory).
- Quote: "With m = 3, this improves on individual testing for p < 1 − 3^(−1/3) ≈ 0.307. (It turns out that m = 2 is never optimal here, as it is always beaten by either m = 3 or individual" testing). "Small-error i.i.d. Let p* = (3 − √5)/2 ≈ 0.382. Individual testing is optimal for p >= p*". Dorfman's method "was preferred for several reasons including the simplicity of the method, the requirement of only two stages of testing (which is important since PCR testing is quite slow)", "quite effective in the 'uncommon but not super-rare' region where the prevalence is roughly between 2% and 25%". [symbols restored]
- Where: `P:aldridge/paper.txt:7610-7613`, `:7487-7488`, `:1385-1390`.
- Holds when: i.i.d. defectives, exact tests.

### C22. Minimising the number of tests and minimising the time conflict when each round is slow.
- Mark: proven.
- Quote: "if the simultaneous tests are regarded as a stage, each of which lasts the same amount of time, then minimizing the expected number of stages is equivalent to minimizing the expected time required to accomplish the task. These remarks indicate that there may be some conflict in these two aims of reducing the expected time and the expected total number of tests."
- Where: `P:sobel/paper.txt:1656-1661`.
- Holds when: tests in rounds of equal length (a suite run is such a round).

### C23. At Ericsson, batch testing saved 72 % of test runs (2.8 % culprits, batch 9); at 2.4 times the culprit rate the best batch was 4 and saved 46 %; flaky tests cut the best case to batch 4 and 41 %.
- Mark: proven (simulation over 9 months of three projects' test history).
- Quote: "batch testing saves 72% of test executions compared to testing each commit individually." "test flakiness reduces the cost savings to 42%." "Project A has a CulpritRate 2.4 times higher than Project C and with a BatchSize of 4, the savings are 46%. In contrast, Project C can have a BatchSize up to 9 and saves 72% of test executions". "the majority of the savings occurring with BatchSizes up to 4." "Project C's most cost-effective BatchSize and savings are reduced from a BatchSize of 9 and execution savings of 72% to 4 and 41%". Rates: "6.8%, 8.6%," (and 2.8 %).
- Where: `P:najafi2019/paper.txt:37-43`, `:421`, `:539-540`, `:549-555`, `:619-621`.
- Holds when: "At Ericsson each commit under test should be independent of the other commits" (`:817-818`); rates "can be trivially calculated from historical test results" (`:131`); cost counted in runs, not time.

### C24. On nine open-source projects batching saved about half the runs (46 to 50 % on average); batch of four with one-by-one retest is Dorfman's method, and at failure rates of 19 to 23 % the best batch was four with about a third saved.
- Mark: proven (master's thesis behind the closed TSE 2021 paper; simulation).
- Quote: "projects by 46%, 48%, 50%, 44%, and 49% for BatchBisect, Batch4, BatchStop4, RiskTopN, and" RiskBatch. "Batch4 is a special case of the Dorfman [20] method". "On ruby and rspec that have the highest failure rates, 22.51% and 19.36%, we also see that the" best batch size is the lowest at four. "We do not consider projects with a failure rate above 25% as batching" is not effective with high failure rates.
- Where: `P:beheshtian-thesis-2020/paper.txt:60-62`, `:617`, `:1128-1130`, `:710-711`.
- Holds when: failure rate under 25 %; flaky failures counted as failures; a batch size fixed from history.

### C25. With parallel machines, "batch everything waiting" kept the same average feedback time with up to 91 % fewer machines; a fixed batch of 4 lost (−14.29 %) at Ericsson; the feedback time has a knee in the machine count.
- Mark: proven (replay simulation; Ericsson and Chrome).
- Quote: "The results reveal a non-linear impact of test parallelization on feedback time". "BatchAll maintains the actual average feedback time with up to 91% fewer machines". "using 8 machines, resulting in a negative reduction (-14.29%) in" machine usage. "TestAll needs 7 machines to achieve the actual average feedback time of 8.33 hours for Ericsson. For Chrome, we see TestAll needs 217 available machines to achieve the 36.48 minutes average feedback time"; "there is a speedup of 2.65 times in TestAll algorithm" from 6 to 7 machines. BatchAll holds Ericsson's 8.33 hours "by utilizing 5 machines, leading to a 28.57% reduction", and Chrome's 36.48 minutes "with 20 machines, resulting in an impressive 90.78% reduction".
- Where: `P:pbatch/paper.txt:31`, `:36-37`; `P:beheshtian2021/paper.txt:643-646`, `:650`, `:767-768`, `:844-848`.
- Holds when: "about 8.5%" of Chrome builds fail (`P:beheshtian2021/paper.txt:202`), "well below the 40% threshold" (`:1080`); changes batched "and none lead to merge conflict" (`:1101`); "We do not re-run any tests" (`P:pbatch/paper.txt:120`).

### C26. Against selection, batching cut median feedback time by up to 99 % without missing a failure, while selection cut it up to 96 % but missed up to 55 % of failures.
- Mark: proven (replay of 285 million test results; Chrome, a Google project, JMRI).
- Quote: "test selection can reduce actual median feedback time by up to 96% with the same number of machines but may miss up to 55% of failures. In contrast, batching achieves up to a 99% reduction in feedback time without missing any failures."
- Where: `P:contrast-tsp-batch/paper.txt:19-21`.
- Holds when: flaky failures treated as non-blocking; every test still runs (batching keeps full coverage). The collector read a cut line as "except in scenarios with few concurrent builds" (`:161`, collector's reading, not confirmed here).

### C27. In a closed loop, "flush the moment the device is free, taking whatever has queued" was within a median 0.1 % of the best tuned timer; the batch settles at K = N F(K)/(Z + F(K)) and throughput is bounded by the added cost per record.
- Mark: proven (preprint, not peer reviewed; one simulator and two devices).
- Quote: "Greedy-pipelined flushes the instant the device is free, batching whatever queued. By Little's law X = N/(Z + L) and, with the device back-to-back at load, X = K/F and L ≈ F; eliminating gives the fixed point" [K = N F(K)/(Z + F(K)), X ≤ 1/δ (write-bandwidth bound)]. "greedy is within a median 0.1% of the best oracle-tuned timer." On PostgreSQL: "at 32 clients (6.6k tps, above λ*) commit_delay=0 is within 10% of the best tuned value"; "at 2 clients (below λ*) the benefit is slightly larger (17%)". The authors' limit: "The closed-loop competitive bound is conjectured, not proven".
- Where: `P:gc2606/paper.txt:82-86`, `:114-116`, `:134-136`, `:167-168`.
- Holds when: F(K) = F0 + K δ (one fixed cost per batch, small cost per record); no failures; N clients blocked on their own commit (our closed loop).

### C28. PostgreSQL waits for a group only if it is told to; the default is no wait.
- Mark: proven (documentation).
- Quote: "This can improve group commit throughput by allowing a larger number of transactions to commit via a single WAL flush, if system load is high enough that additional transactions become ready to commit within the given interval." "The default commit_delay is zero (no delay)."
- Where: `P:pgdocs/paper.txt:426`.
- Holds when: one engine, current documentation.

### C29. Group commit raised a one-device log from 100 to 1,000 commits a second (ten per group, back-of-envelope); a group may commit only after the groups it depends on.
- Mark: proven (1984 paper as its technical report; a calculation, not a measurement).
- Quote: "Assuming a single log device, the system could commit at most 100 transactions per second". "The transaction throughput can be increased by another order of magnitude, to 1000 transactions per second (1 second / 10 ms to commit 10 transactions = 1000 transactions committed per second)." "A commit group cannot be written to disk, and thus commit, until all the groups it depends on have previously been committed." "The notion of group commits appears to be part of the unwritten database folklore."
- Where: `P:dewitt/paper.txt:829-831`, `:859-863`, `:887-889`, `:875`.
- Holds when: the cost of the shared write does not grow with the group.

### C30. Letting a worker detach while its commit waits for the shared log (flush pipelining) gave the largest single gain, 68 % over the baseline.
- Mark: proven (VLDB 2010, one 64-context machine).
- Quote: agent threads "detach from the transaction, enqueue its state at the log and continue executing other transactions." "For systems today, flush pipelining provides the largest single performance boost, 68% higher than the baseline". "Our solution achieves a 20%-69% speedup".
- Where: `P:aether/raw.txt:260`, `:402`, `:21`.
- Holds when: transactions of microseconds; a worker has other work ready; aborts rare.

### C31. Group commit was in production in IBM's IMS Fast Path (from 1976), with the buffer written when full, on a time limit, or by normal processing; it was named later.
- Mark: proven (experience report, no measurement).
- Quote: the buffer is written on "a buffer becoming full, a time-limit expiring, or standard IMS/VS processing"; "a group of transactions all become committed at one time. This was named ??Group Commit?? long after the development of IMS/VS Fast" Path.
- Where: `P:gawlick/paper.txt:596-599`, `:604-607`.
- Holds when: as stated.

### C32. Testing every change at Google made compute grow with the product of change rate and suite size; Google runs one test pass per "milestone", about every 45 minutes, at 99 passes per failure.
- Mark: proven.
- Quote: "the compute resources were growing quadratically with two multiplicative linear factors: (1) the code submission rate ... and (2) the size of the test pool". "A milestone is typically cut every 45 minutes during peak" development time. "the ratio of PASSED vs. FAILED test targets per code change is 99:1". Cost: "unacceptably large delays of up to 9 hours." Culprit: "Any of the N" changelists between the pass and the failure may have caused the breakage.
- Where: `P:google-ct-2017/paper.txt:46-50`, `:59`, `:179-180`, `:70`, `:615`.
- Holds when: a very low failure rate per change and a later culprit search.

## C. Testing ahead (a merge queue)

### C33. Uber's merge queue, testing a change on top of the changes ahead of it, kept P50 turnaround within 2.98 times an all-knowing oracle where testing one at a time was 80 times; with as many build machines as changes per hour it reached 1.2 times.
- Mark: proven (replay of 9 months of one iOS monorepo; the 27x ratio between the two is the analyst's division of two quoted ratios against one oracle).
- Quote: "leads to maximum of 2.98x slower 50-percentile turnaround time, compared to the optimal Oracle solution." "SubmitQueue's 95-percentile turnaround latency increases by 4x under high contention in which not enough resources are available". "if the maximum number of incoming changes per hour is 500, and with 500 workers, 50-percentile, 95-percentile and 99-percentile turnaround time gets reduced to 1.2x of the Oracle's." Speculate-all "suffers up to 15x"; "speculating deep instead of going wide helps." Single-Queue "With 500 changes per hour, P50, P95, P99 turnaround times grow 80x, 129x and" 132x. Conflicts: "with even two concurrent and potentially conflicting changes, there is a 5% chance of a real conflict. This number grows to 40% with only 16 con-" current changes. Before: "the mainline was green only 52% of the time"; after: "our mainlines have remained green at all times." Model "has an accuracy of 97%".
- Where: `P:uber-submitqueue/paper.txt:1146-1148`, `:1148-1150`, `:1153-1156`, `:1157-1164`, `:1165-1167`, `:229-231`, `:1427-1428`, `:1431-1432`, `:1040-1041`.
- Holds when: "workers" are build machines (check slots), not writers; a trained success model; a build graph for conflicts; mostly passing changes.

### C34. A threshold on the success odds of each speculative build cut builds per change from 3.4 to 5.4 down to 1.9 to 2.6, and CPU hours by 35 to 52 %; plain queues "only speculate the success paths".
- Mark: proven (production, 21 weeks, three monorepos).
- Quote: Go "from a pre-rollout average of 3.39 to a post-rollout average of 1.85), iOS decreased by 47.86% (from 4.93 to 2.57), and Android achieved the largest reduction of 64.02%, dropping from 5.43 to 1.96." CPU: "Go's CPU consumption fell by 44.70%", "iOS decreased by 34.86%", "Android saw a reduction of 52.23%". "GitHub's Merge Queue [3] and GitLab's Merge Train [4] ... only speculate the success paths. When earlier changes in the queue fail, subsequent changes must be retested without the failed ones, which causes delays, especially when the failure rate is high."
- Where: `P:uber-ci-at-scale/paper.txt:1015-1018`, `:1029-1033`, `:197-202`; summary "CI resource usage by approximately 53%, CPU usage by 44%, and P95 waiting times by 37%" (`:28-29`).
- Holds when: trained build-time and success models (weekly retraining on three months).

### C35. Zuul tests queued changes in parallel on the assumption that all pass; its window starts at 20, grows by one per merge and halves per failure.
- Mark: proven (documentation, no numbers).
- Quote: "it assumes that all jobs will succeed and tests them in parallel accordingly." "if one fails, then changes that were expecting it to succeed are re-tested without the failed change. In the best case, as many changes as execution contexts are available may be tested in parallel and merged at once. In the worst case, changes are tested one at a time". "It starts with the window set to a certain value (twenty changes by default). Each time a change successfully merges, the window is increased by one. Each time a change fails, the window is halved." "Ideally if builds frequently succeed, the window should be large in order to maximize throughput, and if they frequently fail, it should be small in order to minimize waste."
- Where: `P:zuul-gating/paper.txt:920-926`, `:970-973`, `:966-968`.
- Holds when: deterministic builds.

### C36. GitHub's merge queue tests each request on top of those ahead of it, with build concurrency and merge limits each from 1 to 100; merge limits do not combine builds.
- Mark: proven (documentation, no numbers).
- Quote: "Build concurrency: The maximum number of merge_group webhooks to dispatch (between 1 and 100)". "Merge limits: Select the minimum and maximum number of pull requests to merge into the base branch at the same time (between 1 and 100)". "Merge limits do not combine merge_group builds." The request is grouped with the base branch "as well as changes from pull requests ahead of it in the queue".
- Where: `P:github-mq/paper.txt:179`, `:185`, `:187`, `:194`.
- Holds when: as documented.

### C37. Rust, with a check of about three hours, merges by hand-built rollups of many changes, rebuilt without the culprit when one fails.
- Mark: proven (documentation, no numbers).
- Quote: "every pull request must be tested after merge before it can be pushed to the default branch. As PR volume increases this can scale poorly, especially given the long (~3hr) current CI duration for Rust." "If the rollup fails, use the logs rust-log-analyzer provides to bisect the failure to a specific PR and unapprove it ... Then close the rollup PR, and recreate it without the offending PR". "Massive rollups are rarely needed" (sizes by hand, about 10 to 20). A change is kept out of rollups for "a high chance of failure".
- Where: `P:rust-rollups/rollups.txt:4-6`, `:34-36`, `:41`; `P:rust-rollups/review-policy.txt:341`.
- Holds when: reviewers can judge risk; a log names the failing change.

## D. A shorter check

### C38. Selecting tests by recorded file dependencies cut test time 32 % on average and 54 % on long suites, but slowed short suites by up to 138 %; it pays for suites over about a minute.
- Mark: proven (615 revisions of 32 Java projects).
- Quote: "Ekstazi reduced the end-to-end testing time 32% on average, and 54% for longer-running test suites, compared to executing all tests." "the time for AE C varies between 9% and 138 % (slowdown)"; "all slowdowns are for projects with short-running test suites." "Ekstazi appears useful for projects whose test suites take over a minute: Ekstazi on average roughly halves their testing time."
- Where: `P:ekstazi/paper.txt:30-32`, `:525-529`, `:532-534`.
- Holds when: deterministic tests; a recorded run of the previous revision.

### C39. Predictive selection halved Facebook's testing cost and still reported over 99.9 % of faulty changes, picking under a third of what build dependencies pick; it relies on later stages that run the rest.
- Mark: proven (production).
- Quote: "the strategy reduces the total infrastructure cost of testing code changes by a factor of two, while guaranteeing that over 95% of individual test failures and over 99.9% of faulty changes are still" reported. "The test selection procedure selects fewer than a third" of the tests selected by build dependencies. "If we train our classifier on flaky test results, we get very poor predictions." "our approximation needs not be conservative, in a sense that it may miss some of the impacted tests, yet it can still be applied in diff- and land-time testing."
- Where: `P:pts/paper.txt:17-19`, `:107`, `:93-94`, `:200-202`.
- Holds when: three months of per-test outcomes; a build graph; a later stage that runs everything.

### C40. Selecting suites by recent failure found 70 to 80 % of failing suites, six times better than random selection of the same size.
- Mark: proven (30 days, 3.5 million suite runs at Google).
- Quote: "reach between 70% and 80% when Wf = 96." Random selection of the same size "performed approximately six times worse in terms of failure detection."
- Where: `P:elbaum/paper.txt:450`, `:452-455`.
- Holds when: a long history of runs per suite; a post-submit stage runs what was skipped.

### C41. Small frequent cycles of predicted-to-break targets cut the median time to detect a new breakage from 107 to 37 minutes.
- Mark: proven (three months of Google production data, replay).
- Quote: "we observed a median (p50) reduction of approximately 65% (from 107 to 37 minutes) in the time taken to detect novel breaking" targets. "With a budget of 25% of the total targets, Transition Prediction achieves a 85% recall rate".
- Where: `P:tap25/paper.txt:28-29`, `:77-79`.
- Holds when: a very large history; post-submit only (it shortens detection, not one run).

### C42. Running only targets within a dependency distance saved 42 to 55 % with no breakage missed in Google's simulation.
- Mark: proven (simulation on one month of data).
- Quote: "We see that we could save 42% and 55% resources if we executed only test targets within MinDist=10 and MinDist=6, respectively. We also note that for this simulation we did not miss a single breakage or fix."
- Where: `P:google-ct-2017/paper.txt:645-648`.
- Holds when: a build dependency graph.

### C43. At Google 4.56 % of test failures were flaky and a failing test is rerun ten times; among 161 classified flaky-test fixes the causes were asynchronous waits 45 %, concurrency 20 %, test order 12 %.
- Mark: proven.
- Quote: "73K out of 1.6M (4.56%) test failures were caused by flaky tests." "at Google, a failing test is rerun 10 times against the same code version". "74 out of 161 (45%) commits are from the Async Wait" category; "32 out of 161 (20%)"; "19 out of 161 (12%)".
- Where: `P:luo/paper.txt:31-32`, `:38`, `:346`, `:352`, `:417`.
- Holds when: 51 Apache projects; Google figure by personal communication.

### C44. BMW selects affected targets by build graph and still keeps the full suite at the merge gate, on purpose.
- Mark: proven.
- Quote: "We did not apply our regression test optimization, as we want to have a fail-safe mechanism (i.e., still revealing a regression spotted before merging)." The affected-target step "heavily reduces load" yet pipelines take "34min" and 56 minutes.
- Where: `P:bmw/paper.txt:95-97`, `:116`, `:118`.
- Holds when: a monorepo with Bazel and Zuul.

### C45. Spreading tests over machines at random was 30 to 60 % worse than a greedy assignment by known durations.
- Mark: proven (randomly generated suites; weak for us).
- Quote: random is 30 % to "60 % worse than greedy".
- Where: `P:tcsched/paper.txt:638`.
- Holds when: test durations known in advance.

## E. What our lane and tree do today

### C46. One run of the tree's suite took 596 s with one test file at a time, 332 MB private memory peak; one run only.
- Mark: measured here (library r57-0103).
- Quote (record): "One run of the tree's test suite (1,018 tests: 965 pass, 53 skipped ...) took 596 s with one test file at a time (--test-concurrency=1)".
- Where: library r57-0103, citing `E:probe-suite-memory.md#Figures`.
- Holds when: one run, other programs running.

### C47. The lane has 2 slots (file `capacity.txt`, at most 4); 780 commands ran 365 minutes and waited about 177; two ran at once in 41 of the 324 minutes any ran, never three.
- Mark: measured here (library r57-0127).
- Quote (record): "Over the 780 commands that had finished in the log by 03:20 on 2026-11-18 they ran 365 minutes and waited about 177 minutes in the queue; two ran at once for 41 of the 324 minutes".
- Where: library r57-0127 (`research-tree/lane/log.jsonl`, `capacity.txt`, `lane.mjs` line 39).
- Holds when: the lane carries all heavy commands, not only the suite.

### C48. The queue at heavy commands was the most frequent limit: named in 9 of 25 recorded episodes.
- Mark: measured here (library r57-0129).
- Quote (record): "the serial queue is named in 9, blocked program starts in 7, memory in 4".
- Where: library r57-0129 (`own-data.md`).
- Holds when: our 25 episodes.

### C49. The lane logs each command's wait and run time but not the slot count or the queue; one slot against two cannot be compared from the log.
- Mark: measured here (observed in code; library b1-0105, b1-0122).
- Quote (record): "a queued command leaves no line until it starts or gives up ... and no line carries the slot count." "the wait with one slot against two cannot be counted from the log."
- Where: library b1-0105, b1-0122.
- Holds when: today's `lane.mjs`.

### C50. A lane holder loses its slot after 20 minutes though a command may be given 25; a shrink of the slot count is not honoured until higher holders end; two waiters can break one stale slot twice.
- Mark: measured here (observed in code; library b1-0102, b1-0103, b1-0104).
- Quote (record): "A lane command's timeout may be set up to 1,500 s (25 minutes) while a live holder loses its slot after 20 minutes". "after the count is lowered a holder of a higher slot is not counted and a waiter can take slot-0". "the break has no fence".
- Where: library b1-0104, b1-0102, b1-0103.
- Holds when: today's `lane.mjs`.

### C51. Waiters at the lane have no order today; the build-in design gives slots to the shortest expected check, then the oldest.
- Mark: measured here (the design document's reading of the code).
- Quote: "Today waiters have no order (C4)." Design: a slot goes "to the shortest expected check time per label (from the log's labels and ms), then the oldest, with an age cap".
- Where: `docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md:222-226`.
- Holds when: today's lane; the design is not built.

### C52. The tree's checker batches 12 candidates (a guess) or runs when nothing else does, orders by field and card id, and records no waiting time.
- Mark: measured here (observed in code; library b1-0115, b1-0116, b1-0113).
- Quote (record): the watcher "makes a checker batch due at 12 candidates or when nothing else runs"; check-queue "orders checker items by field and card id, not by age, and its queue ledger line ... carries batch, n, n_seeds and rng_seed: no waiting time"; "a checker batch of 12 carry source 'guess'".
- Where: library b1-0115, b1-0116, b1-0113.
- Holds when: today's tree.

### C53. In the tree the coordinator may run only `node tcb/<name>.mjs`, so the lane is refused there.
- Mark: measured here (observed in code; library b1-0119).
- Quote (record): "guard-hook lets the coordinator run only node tcb/<name>.mjs, so lane.mjs is refused there".
- Where: library b1-0119.
- Holds when: today's tree.

### C54. Our rule's case B is "slots x (time outside + time inside) / time inside" and marks it "a textbook queueing bound, reasoned"; the build-in design runs one check per merge at 596 s with the lane's 2 slots.
- Mark: measured here (our documents).
- Quote: "Case B, one check per change: slots x (time outside + time inside) / time inside; past that, workers only queue" and "Case B: a textbook queueing bound, reasoned". Build-in: "Check: case A lit (C133), case B hyp (C147)"; default "check width = the lane's 2 slots"; "a check per merge, 596 s per suite run (C115)".
- Where: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md:74`; `BUILD-IN.md:91-92`, `:110`, `:113`, `:306`.
- Holds when: today's documents.

### C55. The rule's answer still lists "a check shared by separate programs" among the parts with no paper among those read.
- Mark: measured here (our document).
- Quote: "Three parts have no paper among those read ... and are reasoning only: the token allowance (weekly and 5-hour), a check shared by separate programs, and units that last minutes with a handful of workers."
- Where: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md:41-44`.
- Holds when: today's page (the library already records the narrow search as mistake r57-0610).

### C56. A session blocked on the check makes no model call, so waiting costs tokens only at each wake, each wake re-reading the context.
- Mark: hypothesis (library b1-0125, status reasoned).
- Quote (record): "A session blocked on a tool call or a helper makes no model call, so waiting costs tokens only at each wake (a poll or a notice), each wake re-reading the whole context".
- Where: library b1-0125.
- Inferred from: how a turn works; not measured.

### C57. Our design has the builder pre-check by selection and the gate run the full suite.
- Mark: hypothesis (library x15-0409, a design).
- Quote (record): "Test selection is the builder's own pre-check ...; the gate runs the full suite, because a lib change selects every test file."
- Where: library x15-0409.
- Inferred from: the several-writers options note; same split as C44.

### C58. Running the suite's test files side by side might cut a run from 596 s to about the longest file, about 270 s; untested because file independence is unknown.
- Mark: hypothesis (library r57-0403).
- Quote (record): "could cut one run from 596 s to about the longest file (about 270 s ...), untested because nobody knows whether the test files are independent."
- Where: library r57-0403.
- Inferred from: earlier per-file runs.

## F. Hypotheses behind the proposal

### C59. For a check that runs the full suite, a run over k merged changes costs about one run, so Dorfman's second condition holds for our gate.
- Mark: hypothesis.
- Inferred from: C57 and C44 (the gate runs the full suite whatever the change), C20 (condition 2), C25 (batch time taken as the longest of its builds). Fails if merged changes add many tests or if a merge of k changes itself fails (C65).
- Measurement that sets it: suite time on a merge of k changes against one change, k = 1, 2, 4.

### C60. "When a slot frees, take every change that is waiting" needs no failure rate and no timer, and a failed batch is best split one by one (two rounds), with the batch capped by the measured failure rate.
- Mark: hypothesis.
- Inferred from: C25 (BatchAll beat fixed batches), C27 and C28 (greedy, no timer, default no wait), C31 (flush when free or full), C21 and C22 (two rounds preferred when a round is slow), C19 (cap from p), C23 and C24 (savings mostly by batch 4; best batch 4 at 19 to 23 % failing).
- Measurement that sets it: p per change at the gate; whether failures are independent; time per run against k (C59).

### C61. Testing ahead pays only while check slots would otherwise idle; when the check binds, each speculative run takes a slot from a real one.
- Mark: hypothesis.
- Inferred from: C33 ("workers" there are build machines: with 500 machines 1.2x of the oracle; under contention P95 4x), C34 (2 to 5 runs per change without a threshold), C35 (window halves on failure), C07 (with c slots the check binds above c (S + Z)/S).
- Measurement that sets it: share of time a slot is idle while a change waits behind an unfinished one; p.

### C62. Letting a worker start its next unit while its change waits keeps the check fed and the workers busy; it needs a second unit ready and a way back for a failed change.
- Mark: hypothesis.
- Inferred from: C30 (flush pipelining), C56 (a blocked session costs tokens only at wakes, so the gain is clock time, not tokens).
- Measurement that sets it: share of a worker's cycle spent waiting at the check (lane waits joined to helper ids, BUILD-IN 1.0 measurement 2).

### C63. A check of about an hour cannot run through today's lane: a live holder is broken after 20 minutes.
- Mark: hypothesis (inferred from C50; not run).
- Inferred from: library b1-0103 and b1-0104 (20-minute hold limit counted from owner.json, no heartbeat).

### C64. "A rerun is not the same run" acts on batching as flakiness does: a failure that does not reproduce on the split shrinks the best batch toward 2 to 4.
- Mark: hypothesis.
- Inferred from: C23 (flakiness moved Ericsson's best batch from 9 to 4 and savings from 72 to 41 %), C43 (flaky failures exist at every scale), ROUND.md's statement that a rerun of a model session is not the same run. A check over fixed code is deterministic unless its tests are flaky; the non-reproduction comes from the worker, not the check, so this holds only where a batch failure leads to redone work.
- Measurement that sets it: share of check failures that do not reproduce on a rerun of the same tree.

### C65. Failures caused by two changes together are outside Dorfman's model, and their chance grows with the number of changes in flight.
- Mark: hypothesis.
- Inferred from: C33 (5 % with two concurrent changes, 40 % with 16, in Uber's monorepo), C19 and C23 (independence assumed), C25 ("none lead to merge conflict" assumed).
- Measurement that sets it: share of batch failures whose changes each pass alone.

### C66. Whether the check binds depends on Z/S only: with c slots it binds above N = c (1 + Z/S), so for 3 workers with 2 slots only if Z/S < 0.5, for 16 workers with 2 slots if Z/S < 7, and with 1 slot if Z/S < 2 and Z/S < 15.
- Mark: hypothesis (arithmetic on C07).
- Inferred from: C07; Z for model sessions is not measured (DECISION-RULE measurement 2); ROUND.md says only that a unit lasts minutes.

---

## Appendix: the computation behind C07 and C08

Run on 2026-11-19 with Node v24 (`node mmcn.js`), from the analyst's scratch folder; arithmetic only, no data read.
Formulas: Sztrik's (2.1), measures 1, 5, 6 and 7 (`P:sztrik-book/paper.txt:639-705`), with S = 1, λ = 1/Z.

```js
function model(N, r, Z) {            // M/M/r//N, S = 1, rho = lambda/mu = S/Z
  const lam = 1 / Z, rho = 1 / Z;
  const lf = (k) => { let s = 0; for (let i = 2; i <= k; i++) s += Math.log(i); return s; };
  const logp = [];
  for (let n = 0; n <= N; n++)       // (2.1), up to log P0
    logp.push(n <= r ? lf(N) - lf(n) - lf(N - n) + n * Math.log(rho)
                     : lf(N) - lf(N - n) - lf(r) - (n - r) * Math.log(r) + n * Math.log(rho));
  const m = Math.max(...logp), w = logp.map((v) => Math.exp(v - m));
  const tot = w.reduce((a, b) => a + b, 0), P = w.map((v) => v / tot);
  let EL = 0, Q = 0;
  for (let n = 0; n <= N; n++) { EL += n * P[n]; if (n > r) Q += (n - r) * P[n]; }
  const X = lam * (N - EL);          // throughput
  return { T: EL / X, W: Q / X, X, U: X / r };  // measure 6, measure 7, use of the slots
}
// Check A: T for N = 1..c. Check B: model() at N = c(1+Z) and at N = 1 + cZ.
// Check C: slope and intercept of T through N = ceil(20 c (1+Z)) and that N + 50;
//          crossing with T(1): (T(1) - intercept) / slope.
```

Output of check C (crossing of the exact curve's asymptotes, against the two forms):

| c | Z/S = 0.5 | Z/S = 1 | Z/S = 3 | Z/S = 10 | c (S+Z)/S | 1 + cZ/S |
|---|---|---|---|---|---|---|
| 1 | 1.5 | 2 | 4 | 11 | same | same |
| 2 | 3 | 4 | 8 | 22 | 3, 4, 8, 22 | 2, 3, 7, 21 |
| 3 | 4.5 | 6 | 12 | 33 | 4.5, 6, 12, 33 | 2.5, 4, 10, 31 |
| 4 | 6 | 8 | 16 | 44 | 6, 8, 16, 44 | 3, 5, 13, 41 |

Fitted slopes were 1/c and intercepts −Z to at least four places in all 16 cases; T(1) = S in all.
