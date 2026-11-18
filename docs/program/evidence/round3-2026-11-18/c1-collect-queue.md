# c1 collect queue: the finite-source queue, the saturation point, bulk service

`R:` = `docs/program/evidence/round3-2026-11-18/`. Papers sit in `R:papers/check/<short>/` (not committed).
Marks: quoted = text read in the file saved here; reasoned = derived by me from quoted lines, in no source read.

## Gate summary
- P1 Denning and Buzen 1978: N* = (R0)/(Vb Sb) is "the saturation point"; for M terminals with think time Z the knee is Mb* = (R0 + Z)/(Vb Sb) = N* + Mb; needs visit ratios and service times unchanged as N grows. quoted, `denning-buzen/paper.txt` lines 958, 966, 1030-1033.
- P2 Lazowska and others 1984, ch. 5: bounds N/(ND+Z) <= X(N) <= min(1/Dmax, N/(D+Z)); crossover N* where the two meet; one assumption only: demand does not depend on how many others are present. quoted, `lazowska/chap05.txt` lines 103, 238-264.
- P3 Lazowska ch. 6: MVA is exact only for load-independent (and delay) centres, but "extremely robust" to violations. quoted, `lazowska/chap06.txt` lines 1005-1033.
- P4 Sztrik 2001 (slides citing Kleinrock vol. II sec. 4.12 p. 209): N* = (b + 1/lambda)/b = (S+Z)/S is "the saturation number"; with fixed times N* is "the maximum number ... without causing mutual interference". quoted (secondary; Kleinrock not opened), `sztrik-fsqs/paper.txt` lines 561-571.
- P5 Holtman and Gunther 2008: in the machine repairman model throughput saturates for large N and "retrograde throughput ... is not possible" in the standard model; synchronous queueing gives a worst-case lower bound. quoted, `gunther-zone/paper.txt` lines 237-239, 296-302. Its printed "N > S/(S + Z)" is the inverse of N*; see P5.
- P6 Desruelle 1994: machine-repairman with general (non-exponential) service, analytic model within 15 % of simulation for 15 customers or fewer. quoted, `iiasa-mrm/paper.txt` lines 459-474.
- P7 Holman, Chaudhry, Ghosal 1981: general bulk-service queue (quorum A, capacity B), Poisson arrivals (open, not finite source); no saturation formula for workers. quoted (abstract only), `bulk-general/paper.txt` lines 5-14.
- Not found in any file read: N* with c servers and N* with bulk service in a closed finite-source queue (see "Gaps"). The c-server form below is reasoned.

## From the library
- o1-0309 (quoted, Lazowska ch. 3 and 5): utilisation = throughput x demand; the largest-demand centre is the bottleneck and caps throughput. Upgraded: I read chapters 3 (not used further) and 5 in the authors' text; the quoted bound and single assumption stand at the lines above.
- x05-0363 (summary, Wikipedia: M/M/1 stable if rho < 1): open queue, no finite source; not used. x05-0361 (summary, Little's law, Wikipedia): upgraded here by Denning and Buzen, who use it for R = M/X0 - Z (line 977) and by Sztrik line 456-458 ("Little's theorem").
- x05-0353 (quoted, group-commit preprint: closed-loop throughput X = N/(Z + L) by Little's law): the same closed-loop law as P2, in a log setting; not re-read (belongs to sub-topic `group`).
- r57-0610 (mistake): the finite-source queue was never searched; this file is that search. r57-0512 (open): the task.
- "not recorded": Reiser and Lavenberg, Zahorjan, Kleinrock's own books, machine repair, bulk service.

## Papers

### P1. Denning and Buzen, "The Operational Analysis of Queueing Network Models", ACM Computing Surveys 10(3), 1978.
Read from: https://www.cs.ucf.edu/courses/cop6614/fall2004/p225-denning.pdf (a course-hosted copy). Saved: `R:papers/check/denning-buzen/paper.txt` (damaged-xref PDF, text recovered; two-column layout interleaves). Read: section "Bottleneck Analysis" (lines 936-1045) and the interactive-workload section (lines 500-560, 763-880); not the whole survey.
- Problem: when does a closed system with N jobs, or M terminals with think time, start to queue.
- Mechanism: utilisation law plus job-flow balance; the device with the largest V_i S_i saturates first and caps throughput at 1/(V_b S_b).
- Result: "X0 ... 1/VbSb is the maximum possible value of system throughput" (lines 936-977 region, formula garbled by the columns). "k < N* = R0 / (Vb Sb) = (V1S1 + ... + VKSK) / (Vb Sb)" and "we call N* the saturation point of the system" (lines 958, 966). With think time: "Mb* = (R0 + Z)/VbSb = N* + Mb" and "when there are more than Mb* terminals, queueing is certain to be observed in the central subsystem" (lines 1030-1033). "concept of saturation point was introduced by Kleinrock [KLEI68], who also studied all these results in detail in his book [KLEI76]" (line 1040).
- Measured gain: none; analytic. Also "much improvement at device b will move the bottleneck elsewhere" (line ~1035, after Mb*).
- Assumes: "the visit ratios and mean service times are invariant under changes in N" (line 943); job-flow balance. No assumption on the distribution of service or think times.
- With model sessions: for our check (one server, D = S = one check run, Z = a worker's own time per unit) this gives N* = (S + Z)/S exactly as our rule uses. The invariance assumption is the one that may fail: a worker's Z and the check time S do not change with N only if there is no extra work caused by queueing (a worker waiting does not get stale or redo work). If a rerun is not the same run, a longer wait can add work, so R0 grows with N; mark reasoned. Holds at seconds, minutes, an hour: the ratio is what matters, not the size.
- Needs to know: S (check time per unit of work, per slot) and Z (worker time per unit outside the check); both measurable from a log of start and end times.
- Status: quoted.

### P2. Lazowska, Zahorjan, Graham, Sevcik, "Quantitative System Performance", Prentice-Hall 1984, chapter 5 "Bounds on Performance".
Read from: https://homes.cs.washington.edu/~lazowska/qsp/Images/Chap_05.pdf (the authors' site, free). Saved: `R:papers/check/lazowska/chap05.txt`. Read: sections 5.1 to 5.2.3 in full (lines 1-330); 5.4 balanced bounds only scanned.
- Problem: bounds on throughput and response time of a closed network from two numbers, total demand D and bottleneck demand Dmax, plus think time Z.
- Mechanism: light load: customers never delay each other, X = N/(D+Z); heavy load: bottleneck saturates, X = 1/Dmax; the real curve lies between and below both.
- Result: "N / (ND + Z) <= X(N) <= min(N/(D+Z), 1/Dmax)" (lines 253-257); the smallest throughput occurs "when each additional customer is forced to queue behind all other customers already in the system" (lines 238-240); the largest "when each additional customer is not delayed at all" (lines 246-248); the optimistic bound "consists of two components, the first of which applies under heavy load and the second of which applies under light load", crossing at one population N* where "the values of the two bounds are equal" (lines 258-264), i.e. N* = (D + Z) / Dmax (the formula is garbled in the text layer; it follows from equating N/(D+Z) with 1/Dmax, line 255). Response time: "max(D, N Dmax - Z) < R(N) < ND" (line ~281, formula as in Table 5.1).
- Measured gain: none; a worked case study in section 5.3.1 (not used).
- Assumes: "The validity of the bounds depends on only a single assumption: that the service demand of a customer at a center does not depend on how many other customers currently are in the system, or at which service centers they are located" (lines 103-105). Bounds are lines, so "very little computation" (lines 8-9).
- With model sessions: same as P1. One consequence for us: the lower bound N/(ND+Z) is the worst case (everyone arrives together); our workers on one project are likely closer to it when they finish at the same moment after a shared start. Mark reasoned.
- Needs to know: D and Dmax of the check per unit; with one server D = Dmax = S so N* = (S+Z)/S.
- Status: quoted.

### P3. Lazowska and others 1984, chapter 6 "Models with One Job Class" (mean value analysis, after Reiser and Lavenberg 1980).
Read from: https://homes.cs.washington.edu/~lazowska/qsp/Images/Chap_06.pdf. Saved: `R:papers/check/lazowska/chap06.txt`. Read: the assumptions and summary (lines 1005-1045) only; the algorithm text was not read line by line.
- Problem: an exact, cheap recursion for mean queue length and throughput at every N, not only the bounds.
- Mechanism: response at a queueing centre = service demand x (1 + mean queue seen by an arriving customer with one fewer customer in the network); throughput from Little's law; repeat from N = 1.
- Result: the algorithms apply "only to networks consisting entirely of load independent and delay centers" (lines 1022-1024); load-dependent centres (such as c servers) are deferred to chapters 8 and 20 (line 1025-1027, not read). "Experience has shown that the accuracy of queueing network models is extremely robust with respect to violations of these assumptions" (lines 1032-1034).
- Measured gain: none stated here.
- Assumes: service time homogeneity (rate of completion independent of queue length) for exactness.
- With model sessions: a pool of c check slots is a load-dependent centre, so the one-server recursion is not exact for c > 1. Mark reasoned.
- Needs to know: S, Z.
- Status: quoted (assumptions); algorithm itself not read.

### P4. Sztrik, "Finite-Source Queueing Systems and their Applications", lecture slides, Univ. of Debrecen, 2001.
Read from: https://irh.inf.unideb.hu/user/jsztrik/education/Slides/fsqs.pdf. Saved: `R:papers/check/sztrik-fsqs/paper.txt`. Read: the M/G/1//N section and asymptotics (lines 100-135, 440-575) and the M/M/r section heading and assumptions (734-800); the formulas for P_n of the r-server case not read.
- Problem: the machine-interference (machine repair, terminal) model with N sources, one server, general service time b.
- Mechanism: E[T] = N b - 1/lambda + (correction) as N grows; the straight lines E[T] = b and E[T] ~ N b - 1/lambda cross at N*.
- Result: "The value of N, denoted by N*, at which two straight lines E[T] = b and the one in (20) ... intersect each other is called the saturation number by [42] (sec. 4.12). It is given by N* = 1 + 1/(lambda b) ... Note that this can be written as N* = (b + 1/lambda)/b" (lines 561-566); "if nature were kind and all messages required exactly b service time and exactly 1/lambda generation time (a deterministic system), then N* would be the maximum number of messages that could be scheduled without causing mutual interference [42] page 209" (lines 567-571). [42] is Kleinrock, Queueing Systems vol. II (line 2618). Also: availability E = (N - E[L])/N; Little's theorem E[L] = lambda E[T] (lines 455-458).
- Measured gain: none; analytic.
- Assumes: one server; exponential or general service time; each source generates its next request after an exponential time 1/lambda after completing the previous one; stationarity.
- With model sessions: this is our case with c = 1: N* = (S + Z)/S. The slide says the idle/mean-time curve only "approaches" the two lines, so N* is where interference begins, not a cliff; above it each added worker adds about S of waiting for everyone (slope N b). Mark reasoned for the last clause; the slope is E[T] ~ N b - 1/lambda at line 560.
- Needs to know: b and 1/lambda, measured.
- Status: quoted from a secondary text; the cited Kleinrock volume was not opened (not free online).

### P5. Holtman and Gunther, "Getting in the Zone for Successful Scalability", arXiv:0809.2541, 2008.
Read from: https://arxiv.org/pdf/0809.2541. Saved: `R:papers/check/gunther-zone/paper.txt`. Read: abstract, section 3.1 to 3.3, section 5 and conclusion (lines 1-30, 215-330, 765-790); the simulations not read.
- Problem: tie the Universal Scalability Law to the machine repairman model (M/M/1//N), for threads, cores, users.
- Mechanism: standard MRM has no throughput decline; adding load-dependent service (a "prepping repairman" whose ranking work grows as N(N-1)/2) gives the USL's decline.
- Result: "Retrograde throughput ... is not possible in the standard MRM for any choice of N, S or Z" (lines 238-240); synchronous queueing "produces worst-case throughput and it therefore represents a lower bound [ZSEG82]" (lines 296-300); "the USL is equivalent to synchronous queueing in a load-dependent machine repairman model" (abstract, lines 7-9). Interpretation table: Z = think time / up time, S = CPU or service time (lines 252-262). The printed saturation text "reaches a saturation plateau at high loads when N > S/(S + Z)" (line 237-238) is the inverse of P1, P2, P4; the paper's own Fig. 4 normalises by (S+Z)/S; treat the printed form as a slip, not as a second formula (reasoned; I did not find the correct form stated elsewhere in the paper).
- Measured gain: none for us; simulation only.
- Assumes: exponential up and service times; one server.
- With model sessions: saturation as in P1; if the shared check gets slower as more workers queue (shared machine, disk, memory), service becomes load dependent and throughput can fall past N*, not just plateau. That is a USL case and is the one thing that would break "adding workers only adds waiting"; hypothesis for a shared PC. Cross-ref to sub-topic `bottleneck`.
- Needs to know: whether check time grows with the number of concurrent runs (a measurement: run time vs. slots busy).
- Status: quoted.

### P6. Desruelle, "An Analytical Model for Closed Networks with a General Single Server Queue and an Infinite Server Station", IIASA WP-94-018, 1994.
Read from: https://pure.iiasa.ac.at/id/eprint/4191/1/WP-94-018.pdf. Saved: `R:papers/check/iiasa-mrm/paper.txt`. Read: abstract, introduction, sections 4.1 to 4.4 on accuracy (lines 1-75, 440-540); the derivation was not read.
- Problem: machine-repairman model when service and delay times are not exponential, for small N.
- Mechanism: exact mean value analysis plus two-moment (mean and squared coefficient of variation) approximation of the GI/G/1 queue.
- Result: "We consider a class of networks with a small number of customers (say 15 or less)" (line 75). "For values of the ratio between 0.1 and 4, the absolute value of the error is at most equal to 15%" and "excellent when the mean service time is larger than the mean delay time" (lines 459-462). "even with fifteen customers, the relative error is still less than 20%. Below seven customers, the error is less than 10%" (lines 472-474).
- Measured gain: none (accuracy of an approximation versus simulation).
- Assumes: one server; general service; general delay.
- With model sessions: 3 to 16 workers is exactly its range. Variance of the check time matters, so the model needs the mean and the variance of S (a test suite that sometimes hangs or retries has a large variance). Mark reasoned.
- Needs to know: mean and squared coefficient of variation of S and of Z, from a log.
- Status: quoted (accuracy section); derivation not read.

### P7. Holman, Chaudhry, Ghosal, "Some results for the general bulk service queueing system", Bull. Austral. Math. Soc. 23, 1981.
Read from: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/3167652B591F6B8B4D9E8DDF88D7C476/S0004972700007012a.pdf/some-results-for-the-general-bulk-service-queueing-system.pdf. Saved: `R:papers/check/bulk-general/paper.txt`. Read: abstract, introduction and the numerical section (lines 1-80, 690-735); not the generating-function derivation.
- Problem: one server takes up to B customers per service, starts only when A (quorum) have gathered, general service time; arrivals Poisson.
- Mechanism: supplementary-variable generating functions for queue size; the mean queue size related to mean waiting.
- Result: "The maximum number of customers to be served in one lot is B (capacity), but the server does not start service until A (quorum, less than B) customers have accumulated" (lines 5-12). Numerical tables at traffic intensity 0.9, B = 5: mean queue size falls as the service-time shape k grows and as the quorum A grows from 1 to 5 in the quoted cells (27.126 at A=1 down to 25.009 at A=5 for k=1; lines 716-722), so a larger quorum lowered the queue only slightly there.
- Measured gain: none beyond those tabulated values; analytic.
- Assumes: Poisson arrivals (open queue, an unlimited population), a service time that does not depend on batch size (the model says "general", with one distribution B(x), lines 56-58).
- With model sessions: the arrival stream is not Poisson and the population is 3 to 16, so the closed finite-source version is the right one; this paper gives the open-queue behaviour only. A check whose time does not depend on the batch size is false for most test suites (more changes, more tests); mark reasoned.
- Needs to know: how check time grows with the number of changes in a batch (a measurement).
- Status: quoted (abstract and tables); derivations not read. Not read for a formula for workers.

## Gaps (searched, not found)
- N* with c servers: no source read states it. By the same argument as P1 and P2 (throughput bounded by capacity, N/(D+Z) for light load), N* = c (S + Z)/S, i.e. c times the single-server value; for c slots of the same size, with equal slots and a single queue. Mark reasoned, derived from lines 255 (P2) and 958 (P1) with the capacity 1/S replaced by c/S. Whether the line meets the real curve as sharply for c > 1 is not shown; for the exact multi-server (M/M/c//N) case Sztrik's section lists it (line 734) but its formulas were not read, and the multi-server MVA needs load-dependent centres (P3).
- Bulk service in a finite-source queue: the closest titles found were Kalyanaraman and Janani on a finite-population batch-service queue (journal) and Stecke and Aronson 1985 (bulk service in the machine-repairman setting); the first could not be text-extracted, the second is paywalled. Not read.
- Mean waiting time of a bulk queue as a function of batch size: Bailey 1954, Downton 1955, Medhi 1975, Chaudhry and Templeton 1983 (book) named in results; none read.
- Reiser and Lavenberg 1980 itself (open copy not found); chapter 6 of Lazowska stands in for it.
- Kleinrock 1976 vol. II sec. 4.12, p. 209: the source of N* = (b + 1/lambda)/b; not free; not opened.

## Could not open
| Title | Routes tried | Why |
|---|---|---|
| Reiser and Lavenberg 1980, "Mean-value analysis of closed multichain queuing networks", JACM 27(2) | Web search for an open PDF; scilit, researchr, the JACM bibliography | Only abstracts and citation pages; no open full text found. |
| Kalyanaraman and Janani, finite-population batch-service queue (journal, Communications in Mathematics and Applications) | Direct download of the journal's link (a PDF of 245 KB with a damaged cross-reference table) | `pdftotext` could not read it; no other open copy tried. Saved without text in `R:papers/check/kalyan-batch/`. |
| core.ac.uk copies of Denning and Buzen, and of a machine-interference paper | curl | A bot check ("Just a moment") was returned; not worked round. |
| Stecke and Aronson 1985; Chaudhry and Templeton 1983 | Named in search results only | Paywalled book and journal. |
| Bailey 1954; Downton 1955; Medhi 1975 | Named only | No open full text found in one search. |

## Needs the owner's sign-in
(none; the core.ac.uk pages show a bot check and are listed above, not worked round.)
