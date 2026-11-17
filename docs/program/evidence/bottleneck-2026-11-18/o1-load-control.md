# o1 load control: thrashing, admission control, tuning the number of concurrent workers
Collected 2026-11-18. Read in full: 7 papers. Not opened: 2 (Carey et al. 1990 half-and-half; Hellerstein et al. .NET thread pool).
Line numbers refer to paper.txt made by pdftotext, in folders p1..p9 under the scratch folder
`C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\f57c0bf8-9eae-432f-bfec-3dbca7e4417a\scratchpad\o1-load-control`
(p1 Denning WS, p2 Denning thrashing, p3 Heiss-Wagner, p4 Moenkeberg-Weikum, p5 Schroeder, p6 Thomasian, p9 SEDA).

## Summary
- Every paper limits how many units run at once; they differ in the signal that says "too many". Memory: sum of working sets against memory size (Denning). Data contention: conflict ratio, fraction of blocked or active transactions (Moenkeberg-Weikum, Thomasian). Black box: throughput itself, hill-climbed (Heiss-Wagner). Queue length or response time (SEDA).
- The rule is nearly always admission control (hold work at the gate) plus, sometimes, cancelling work that is blocked and blocks others. None of these papers switches between different methods; they choose a number (the level) and move it.
- Measured gains against a fixed level are few and specific: factor 1.5 mean and 1.8 for the 90th percentile of response time against the best fixed level (Moenkeberg-Weikum, one bank trace, one machine). Heiss-Wagner's gain is in a figure, not read.
- The surprising finding of Schroeder et al.: for the throughput target, the number of resources the workload keeps busy sets the level, not whether the workload is CPU-, I/O- or lock-bound; a level under 20 gave near-best throughput in all 17 setups.
- Thomasian: lock thrashing starts at a near workload-independent value (conflict ratio about 1.25 to 1.6; about 1.3 in M-W), so it can be detected without knowing the workload.
- Limits: all test closed or trace-driven transaction systems, not several long-running processes with a serial step; no paper treats a serial section shared by all workers.

## Papers

### P1. Denning, "The working set model for program behavior", CACM 11(5) 1968. Copy read: https://denninginstitute.com/pjd/PUBS/WSModel_1968.pdf. Text: p1/paper.txt, 839 lines.
- Signal measured: working set W(t,T), the pages referenced in the last T units of process time; its size is the memory demand. QUOTED (l.177): "We define the working set of information W(t, z) of a process at time t to be the collection of information referenced by the process during the process time interval (t -- r, t)."
- How it is measured: from the process's own recent references (hardware use bits in the proposal, l.701); no help from programmer or compiler (l.176, SUMMARY).
- Switching or control rule: "balance". QUOTED (l.642): "If the system is balanced, the total demand presented by running processes just consumes the available fractions of processor and memory resources." On imbalance the next job leaving the ready list is the one that restores balance (l.676); memory first, processor second (l.679).
- Measured effect: none; a model and a proposal (the paper says so, l.689 SUMMARY). Cites Oppenheimer and Weizer simulation evidence (l.691).
- Conditions: locality of reference, programs "not too fickle" (p2 l.60).
- What must be true: the recent past predicts the near future (property P2, l.266).
- Failure modes: priority fairness; the author notes balance favours small-demand jobs and is "far from trivial" (l.680-682). QUOTED (l.679): "when too many working sets occupy main memory, each is displacing another's pages in an attempt to have its own pages present."
- For several processes on one machine: REASONED. The test "does the sum of what the active workers need fit in memory" is a direct, cheap memory-bottleneck detector; the unit to measure is each worker's recently touched memory, not its total size.

### P2. Denning, "Thrashing: its causes and prevention", AFIPS Fall Joint Computer Conf. 1968. Copy read: https://denninginstitute.com/pjd/PUBS/thrashing-1968.pdf. Text: p2/paper.txt, 341 lines.
- Signal measured: missing-page probability m, and the sum of working-set sizes against memory M.
- How it is measured: working-set size of each active program (l.58-59).
- Switching or control rule: QUOTED (l.73): "a process shall be active if and only if its working set is fully contained in main memory." Keep n below n0 where the working sets still fit (l.277-285, condition: sum of working-set sizes below M).
- Measured effect: analytic, not an experiment. QUOTED (l.220): "The presence of one additional program has caused a complete collapse of service."
- Conditions: traverse time T to the auxiliary memory much larger than n (l.221): the collapse comes from the speed gap between the levels.
- What must be true: working sets stable enough to be estimated; if memory is too small to hold the desired number of working sets, paging does not help (l.330, SUMMARY).
- Failure modes: an unanticipated working-set expansion at full memory can trigger thrashing (l.263).
- For several processes on one machine: REASONED. The collapse is a cliff, not a slope: one more worker past n0 can turn a gain into a loss, so the rule must hold work back before the cliff.

### P3. Heiss and Wagner, "Adaptive load control in transaction processing systems", VLDB 1991. Copy read: Internet Archive copy of https://www.vldb.org/conf/1991/P047.PDF (the vldb.org host answers a plain download with 403). Text: p3/paper.txt, 356 lines.
- Signal measured: throughput T of the whole system; the concurrency level n is the only input. QUOTED (l.219): "In our experiments, the throughput T turned out to be the most significant indicator for overload situations."
- How it is measured: departures counted per measurement interval; interval should hold "rather hundreds of departures than some tens" (l.130, QUOTED in part).
- Switching or control rule: two hill-climbers on the bound n*. Incremental Steps (change n* by a step, keep direction if throughput rose; l.59-67, 80) and Parabola Approximation (fit P(n)=a0+a1 n+a2 n^2 by recursive least squares with fading memory, move to the maximum; l.97-117). Enforced by a gate: admit if load below n*, else FCFS queue (l.122); aborting to enforce n* is an option, not needed in their runs (l.113).
- Measured effect: figure 12 (throughput with and without control) and 13 and 14; numbers are in figures, not read. QUOTED (l.330): "The more sophisticated PA algorithm outperformed the simpler IS algorithm in all cases examined and always avoided thrashing."
- Conditions: simulation only; closed model with N terminals, multiprocessor, disks with no contention, timestamp certification (optimistic) concurrency control, parameters from customer traces (l.221). Parameter k (locks per transaction), fraction of queries and fraction of writes varied in jumps and sinusoids (l.239-243).
- What must be true: QUOTED (l.56): the performance curve has one local maximum that is also global; and the curve must keep its shape from one interval to the next (l.57, SUMMARY).
- Failure modes: IS "may fail when the height of the optimum is growing without changing the position" (l.141); PA fails if the fitted parabola opens upward (flat hump or abrupt shape change, l.202-209); noise against responsiveness trade in the interval length (l.130); static lower and upper bounds needed (l.141).
- For several processes on one machine: REASONED. This is the one rule that needs no knowledge of the bottleneck: it only watches total finished work per interval. It cannot say which resource is the cause, and a serial step that caps throughput flat would look like a hump with no edge.

### P4. Moenkeberg and Weikum, "Performance evaluation of an adaptive and robust load control method for the avoidance of data-contention thrashing", VLDB 1992 (Vancouver). Copy read: Internet Archive copy of https://www.vldb.org/conf/1992/P432.PDF. Text: p4/paper.txt, 603 lines (OCR of the PDF is rough, quotes are as extracted).
- Signal measured: conflict ratio. QUOTED (l.164): "the ratio of the total number of locks that are currently held by all transactions in the system and the total number of locks held by active, i.e., non-blocked transactions." Best value 1.0. Compared in the paper's table with half-and-half (fraction of blocked and mature transactions) and the feedback method of Heiss-Wagner (throughput).
- How it is measured: from the lock table at the moment of each lock event or end of transaction; no sampling interval, no throughput measurement.
- Switching or control rule: QUOTED (l.164): "DC thrashing is about to occur when the conflict ratio exceeds a critical threshold of 1.3." Above 1.3: new transactions wait in a begin-of-transaction queue; below it they are admitted again at each end of transaction (l.161). Also cancel blocked transactions that block others, victims by fewest locks times restarts (l.181-186). Half-and-half, as described by these authors (SUMMARY): admit if more than 50% of mature transactions are active; "mature" means 25% of locks acquired (l.164, l.190).
- Measured effect: QUOTED (l.428): "It gains a factor of 1.5 in terms of the average response time and a factor of 1.8 in terms of the 90th percentile of the response time." Against the best fixed level (DMP) found by a sweep: optimum DMP 45, mean 37 s, 90th percentile 140 s (l.321). Short transaction types gained up to a factor of 4; the very long read-only type was about equal (l.428).
- Conditions: COMFORT prototype on a Sequent Symmetry with 12 processors, 8 disks, 80 MB (l.286); page-reference traces of one hour (about 46,000 transactions) from a Swiss bank, 23 GB database, page locks (l.290). Two-phase locking only.
- What must be true: the 1.3 threshold is claimed workload-independent (l.164, QUOTED: "essentially workload-independent"), found by simulation; it assumes locking with blocking.
- Failure modes: predicting transaction length for admission was worse than not predicting it: QUOTED (l.447): "the Smart method held too many transactions in the BOT queue". The authors say the next step is to compare with half-and-half, which they did not do (l.466). Memory contention is left to future work (l.466).
- For several processes on one machine: REASONED. A ratio of "work held" to "work running" is a signal that exists without knowing the workload; the analogue for processes is the share of workers blocked on the serial step, weighted by what they already hold.

### P5. Schroeder, Harchol-Balter, Wierman, Iyengar and Nahum, "How to determine a good multi-programming level for external scheduling", ICDE 2006. Copy read: https://www.cs.cmu.edu/~harchol/Papers/icde06.pdf. Text: p5/paper.txt, 787 lines.
- Signal measured: throughput and mean response time against the level (MPL).
- How it is measured: observation phase then reaction phase; interval sized by confidence intervals (l.360, 506).
- Switching or control rule: QUOTED (l.360): "The control loop then optimizes this starting value in alternating observation and reaction phases... if the throughput is too low the MPL is increased and if it is too high the MPL is decreased." Starting value from a closed queueing model; the target is the lowest MPL whose throughput loss is under a limit the administrator gives (e.g. 5%, l.371).
- Measured effect: QUOTED (l.507): "converges for all our experimental setups in less than 10 iterations to the desired MPL." QUOTED (l.356): "In all experiments an MPL of less than 20 suffices to achieve near optimal throughput". Single CPU: peak at MPL about 5; two CPUs: about 10 or 7 (l.233). Balanced CPU+I/O with 4 disks and 2 CPUs: about 20 (l.277).
- Conditions: 17 setups, two DBMSs (Shore, IBM DB2), TPC-C and TPC-W based workloads, 1-6 disks, 1-2 CPUs, 512 MB to 3 GB (l.72). The aim is a low level for priority scheduling, not the highest throughput.
- What must be true: QUOTED (l.353): "the question of how low one can feasibly make the MPL... is hardly affected by whether the workload is I/O bound, CPU bound, or lock bound... the number of resources that must be utilized to keep throughput high is more important than the type of resources." Response time needs a higher level when the variability of job size is high (l.344, SUMMARY).
- Failure modes: step size too small converges slowly, too large oscillates (l.505); the queueing model is an upper bound built on equal use of all resources (l.372); the paper says its model is simple and may be imprecise (l.420, SUMMARY).
- For several processes on one machine: REASONED. Gives a concrete starting guess: about the number of busy resources (cores, disks) times a small factor, and it shows a low level costs little throughput. Hence a design could start low and raise only when throughput rises. Job-size variability, not the bottleneck type, is what pushes the level up for response time.

### P6. Thomasian, "Concurrency control: methods, performance, and analysis", ACM Computing Surveys 30(1), 1998. Copy read: https://www.csd.uoc.gr/~hy460/pdf/p70-thomasian.pdf. Text: p6/paper.txt, 1752 lines. (Greek letters are lost in the extraction, so the symbol alpha is shown as "alpha" below.)
- Signal measured: for locking, the mean number of lock conflicts per transaction and the conflict ratio, equivalent to a fraction of lock conflicts with blocked transactions.
- How it is measured: analytic and simulation; conflict ratio relation QUOTED (l.568): "conflict ratio = 1/(1 - alpha)" with alpha the fraction of lock conflicts with blocked transactions (symbol lost in text).
- Switching or control rule: QUOTED (l.517 and l.523): the value can be used "for load control, that is, preventing thrashing by limiting the number of txns activated in the system"; the critical mean number of conflicts per transaction is 0.64 for fixed-size transactions (0.75 in simulation) and 0.21 for geometric sizes (l.523). Thrashing sets in when the cubic has a single root, at alpha above 0.226 (l.514, 668).
- Measured effect: analytic; no gain figure against a fixed level. Mean number of active transactions is maximised at alpha near 0.3 (l.677); this corresponds to conflict ratio 1.25 to 1.43 (l.666) and, for multi-class mixes, 1.26 to 1.60 against Weikum et al. 1994 (l.724).
- Conditions: standard (dynamic) two-phase locking, closed and open models, infinite and finite hardware resources (l.162).
- What must be true: QUOTED (l.724): "there is no guarantee that the range of values... will hold" in general (partly quoted).
- Failure modes: a fixed cap fails when the load varies, QUOTED (l.668): the cap "may lead to system underutilization or thrashing behavior"; the more variable the transaction size the earlier thrashing (l.678); heterogeneous access patterns break the single-threshold rule (l.677). Restart-oriented methods and restart waiting are described as load control by delaying restarts (abstract l.4).
- For several processes on one machine: REASONED. A survey-level confirmation that a blocked-fraction threshold exists and is fairly stable, with the range given; it also marks where the threshold is not universal (mixed classes).

### P7. Welsh, Culler and Brewer, "SEDA: an architecture for well-conditioned, scalable Internet services", SOSP 2001. Copy read: https://www.mdw.la/papers/seda-sosp01.pdf. Text: p9/paper.txt, 906 lines.
- Signal measured: input queue length of each stage (thread pool); output rate (batching); mean response time (load shedding).
- How it is measured: periodic sampling of queue; moving average of output rate (l.314, 354).
- Switching or control rule: QUOTED (l.314): "The controller periodically samples the input queue and adds a thread when the queue length exceeds some threshold, up to a maximum number of threads per stage. Threads are removed from a stage when they are idle for a specified period of time." Batching controller lowers the batching factor until throughput starts to fall (l.354). Load shedding: QUOTED (l.604, 646): when response time exceeds 5 s, the queue threshold is reduced exponentially; below it, increased by a fixed amount.
- Measured effect: threaded server throughput collapses at many threads, QUOTED (l.89): "throughput increases until the number of threads grows large, after which throughput degrades substantially" (the numbers are in a figure, not read). Under overload the SEDA server's mean response time was 547 ms with maximum 3.8 s (l.597). With the response-time controller: QUOTED (l.647): "90% of requests exhibiting a response time below 11.8 sec, and a maximum response time of only 22.1 sec. In this run, 98% of requests were rejected".
- Conditions: Java web server (Haboob) against Apache and Flash, 4-way 500 MHz Pentium III, 1024 clients (l.89, 480).
- What must be true: the work splits into stages with queues; the controller thresholds are set by hand (l.314).
- Failure modes: QUOTED (l.647): "this controller is unable to guarantee a response time below the target value, since bursts occurring when the queue threshold is high can induce spikes". A fixed bound on threads is "unfair": clients wait arbitrarily long outside the system (l.44).
- For several processes on one machine: REASONED. The queue length in front of a resource is a bottleneck signal that is cheap to read and names the stage; load shedding drops work, which an agent workload would not accept, so only the admission delay carries over.

## Across the papers (agreements, disagreements, gaps)
- Agree: past a point, adding workers lowers total output (cliff, not slope: P2, P3, P6, P7). A static cap is fragile when the mix changes (P3 l.38, P4 l.43-44, P6 l.668).
- Disagree on the signal. Throughput as a black box (P3) needs no model but cannot name the cause and is slow on jumps. A structural ratio (P4, P6) reacts at once and needs access to the lock table. The memory test (P1, P2) needs per-worker recent-use measurement. P5 argues from the number of busy resources, regardless of type.
- Disagree on direction: P3, P4, P6 look for the highest safe level; P5 looks for the lowest level that costs little throughput.
- Gap: no paper has a serial section that only one worker can enter (merge, test suite). P6's lock-queue model is the nearest; a single exclusive lock is a degenerate case, not treated. REASONED.
- Gap: no paper switches methods when the bottleneck changes; they tune one number. Detecting which of processor, memory or serial step binds has to be assembled from these signals. REASONED.
- Gap: no paper handles processor and memory contention together on one controller, except Denning's balance (P1) which is a proposal without measurements. P4 defers memory contention to later work.
- Gap: the 1.3 conflict ratio was found on page locks and two-phase locking; whether it holds for other forms of blocking is not tested in these papers.

## Could not open (title, each route tried, why it failed)
- Carey, Krishnamurthi, Livny, "Load control for locking: the half-and-half approach", PODS 1990. ACM page not tried (paywall). Found the Wisconsin technical report TR880 at https://minds.wisc.edu/bitstreams/c0cfb61d-7ab0-46b7-aad9-85f8dbdedc2d/download (a PDF), but it is a scan with no text layer: pdftotext gave 0 lines. No OCR installed and none to be installed without the owner's word. The half-and-half rule is described above only second-hand from P4 (SUMMARY).
- Denning, "Working sets past and present", IEEE TSE 1980. https://denninginstitute.com/pjd/PUBS/WSPastPresent_1980.pdf downloaded (2.4 MB) but is a scan with no text layer (0 lines). Not read.
- vldb.org direct download of P3 and P4 returned 403 to curl (also http, mail.vldb.org); used the Internet Archive copies of the same files. The P4 copy is the one that was complete on a second try (the first was cut at 1 MB).

## Needs the owner's sign-in (title, URL)
- None. The only full-text blocks were scans, not logins.

## Searched and not chosen (one line each, why)
- Hellerstein et al., "Optimizing concurrency levels in the .NET ThreadPool", 2008 (a workshop paper, FeBID): venue not on the brief's list; not searched further.
- Thomasian, "Two-phase locking performance and its thrashing behavior", ACM TODS 1993: no open copy found; the 1998 survey (P6) covers it.
- Tay, Goodman and Suri, "Locking performance in centralized databases", TODS 1985: the source of the k^2 n / D below 1.5 rule (cited in P3 l.39, SUMMARY); not downloaded.
- Weikum et al. 1994 (COMFORT), Denning et al. 1976 "Optimal multiprogramming": cited in P3 and P4; not downloaded.
- Welsh and Culler, "Adaptive overload control for busy internet servers", USITS 2003: venue not on the list.
