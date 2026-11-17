# Parallel scheduling and speed-up theory: established results (lit 4)
First pass 2026-11-18 by one Sonnet agent from encyclopaedia summaries and memory. Second pass 2026-11-18: nine papers downloaded as PDF and read as text (pdftotext). Folders: scratchpad/papers/<name>/paper.txt; "L" = line of that file.
Marks: QUOTED = words or formula read in the paper's own text; SUMMARY = from a summary page (a small model, not the page); TEXTBOOK = standard knowledge stated by me, not read in a source.
The text extraction loses Greek letters and some signs. Where a quote shows a gap, the symbol in [brackets] is restored from the paper's own context; page numbers are the journal's where the text shows them.
No paper was found open for DeWitt 1984 (group commit) or for Jefferson's measured studies. Search terms were general only (rule 4).

## Corrections against the first pass
- Item 9: N* = sqrt((1 - alpha)/beta) is CONFIRMED (Gunther 0808.1431 eq. 6, L152-155), and its numbers check on a measured fit (item 9b). The arXiv paper has two parameters; the "gamma" form is not in it.
- Item 4: the Cilk-5 critical-path constant was "not recalled". It is measured: for almost all runs T_P <= T1/P + 1.0 T_inf, one run 1.05 (Cilk-5, L690-692).
- Item 4: work overhead for fib is c1 = 3.63 (the first pass said only "2 to 6 times" for a spawn). The paper reads c1 = 3.63 as "a good estimate of the cost of a Cilk spawn versus a traditional C function call". Its abstract-level claim is "between 2 and 6 times" (L25).
- Item 2: Blumofe and Leiserson credit T1/P + T_inf to "Brent [1974] and Graham [1966; 1969]" and call it "universally optimal to within a factor of 2". The "Brent's form" line from Wikipedia was not found in the paper; it stays SUMMARY.
- Item 6: Graham's 1966 main theorem is not "2 - 1/m" only. It bounds the change from four causes at once: 1 + (n - 1)/n' (item 6). The 2 - 1/n case is its special case n = n'.
- Item 6: Graham's critical-path list rule (longest chain first) is NOT near optimal: its best possible bound is stated as 2 - (something like 1/(n+1)), "considerably closer to 1" is called impossible. The first pass listed this rule as the good priority rule without this warning.
- Item 7: Amdahl's 1967 paper has no formula (the SSCS reprint note says so; the text confirms none). The "1/((1-p)+p/s)" form is the later restatement, not his words. His argument is numbers: 40% housekeeping, a limit "five to seven times".
- Item 8: Gustafson's measured figures are 1021, 1020, 1016 on 1024 processors (the first pass said "near 1000", unchecked). His text is "N + (1 - N) x s'" (restored: N + (1-N)s').
- Item 10: Jefferson says there is no "domino effect" (rollback cascading far into the past); the worst case is "all processes in the system roll back to the same virtual time as the original one did". The first pass listed "rollback cascades" as a failure mode. Cascades within that bound exist; unbounded ones do not.
- Item 13: the group commit source found is a 2026 preprint, not DeWitt. Its result runs against the "tune the batch" idea (item 13).

## A. Work, span, greedy bounds

### 1. Work, span, parallelism
- Answers: how much speed-up a computation can ever give.
- Statement (QUOTED, Blumofe and Leiserson 1999, bl99 L290-300): "we define the work of the computation to be the total number of instructions and the critical-path length to be the length of a longest directed path in the dag". Lower bounds: "we must have T_P >= T1/P, because P processors can execute only P instructions per time step, and of course, we must have T_P >= T_inf". Parallelism "T1/T_inf" (L326-328).
- Measured: none (theory).
- Applies: a fixed DAG, identical workers, no cost for communication.
- Failure modes: real task costs are not known in advance; the model ignores memory, communication and spawn cost.
- Reference: Blumofe and Leiserson, J. ACM 46(5), 1999, 720-748; CLRS ch. 27 (TEXTBOOK).
- How known: QUOTED.

### 2. Brent and the greedy-scheduling theorem
- Answers: how long p workers need, given work and span.
- Statement (QUOTED, bl99 L316-323, p.726): "Early work on dag scheduling by Brent [1974] and Graham [1966; 1969] shows that there exist P-processor execution schedules with T <= T1/P + T_inf. As the sum of two lower bounds, this upper bound is universally optimal to within a factor of 2." Theorem 1: "For any multithreaded computation with work T1 and critical-path length T_inf, and for any number P of processors, any greedy P-processor execution schedule achieves T <= T1/P + T_inf." Greedy means that "at each step ... if at least P instructions are ready, then P instructions execute, and if fewer than P instructions are ready, then all execute." Linear speed-up "for a greedy schedule ... occurs when the parallelism, ... T1/T_inf, satisfies T1/T_inf = Omega(P)" (L326-328).
- Corollary (TEXTBOOK, CLRS 27.3): near-linear speed-up when p is small against the parallelism.
- Measured: none.
- Applies: any DAG, any greedy rule, zero scheduling cost.
- Failure modes: assumes zero cost of finding and starting a task; loose by up to 2x.
- Reference: Brent, J. ACM 1974; Eager, Zahorjan, Lazowska, IEEE Trans. Computers 1989 (cited in bl99, L1523).
- How known: QUOTED (theorem, factor 2); the Brent form T_p <= T_N + (T1 - T_N)/p is SUMMARY.

### 3. Work stealing (Blumofe and Leiserson)
- Answers: how to schedule a fully strict computation without a central queue.
- Time (QUOTED, abstract, bl99 L20-22): "the expected time to execute a fully strict computation on P processors using our work-stealing scheduler is T1/P + O(T_inf)". Theorem 13 (L1301-1305, p.743-744): "The expected running time, including scheduling overhead, is T1/P + O(T_inf). Moreover, for any epsilon > 0, with probability at least 1 - epsilon, the execution time on P processors is T1/P + O(T_inf + lg P + lg(1/epsilon))."
- Space (QUOTED, L22-24, Theorem 5 L648-650): "the space required by the execution is at most S1 P, where S1 is the minimum serial space requirement."
- Communication (QUOTED, L24-27): "the expected total communication of the algorithm is at most O(P T_inf (1 + n_d) S_max)", n_d = most times any thread synchronizes with its parent. "This communication bound justifies the folk wisdom that work-stealing schedulers are more communication efficient than their work-sharing counterparts. All three of these bounds are existentially optimal to within a constant factor."
- Method (TEXTBOOK): an idle worker steals from the top of a random victim's deque.
- Applies: spawn tree (fully strict); workers share memory.
- Failure modes: bound is in expectation; strictness required. The first pass's "exponential steal counts" claim is not in this paper: unverified, drop it.
- How known: QUOTED.

### 4. Cilk-5: measured overheads and the work-first principle
- Answers: what the runtime really costs.
- Statement (QUOTED, cilk5 L25 and L634-637): the paper's introduction says the cost of a spawn "is only between 2 and 6 times the cost of a C function call" (the scan cuts the first words); for fib, "the overhead c1 = 3.63 for fib gives a good estimate of the cost of a Cilk spawn versus a traditional C function call". "The work overhead c1 is only a few percent larger than 1 for most programs" (L620-622).
- Measured (QUOTED, Fig. 6, L571-595, Sun Enterprise 5000, 8 x 167 MHz UltraSPARC, "accurate to within about 10%"): fib(35): T1 12.77 s, average parallelism 25540, c1 3.63, T8 1.60 s, speed-up T1/T8 = 8.0, T_S/T8 = 2.2 (so Cilk on 8 processors was only 2.2x faster than the serial C). Other rows (names are scrambled by the scan, so only these are certain): notempmul parallelism 1970, c1 1.05; cilksort parallelism 1108, c1 1.21, T1/T8 6.0; cholesky c1 1.25, T1/T8 6.9. Over all 12 programs c1 ran 0.93 to 1.25 apart from fib, and T1/T8 ran 5.6 to 8.0.
- Measured (QUOTED, L690-692): "for almost all runs of this benchmark, we observed T_P <= T1/P + 1.0 T_inf. (One exceptional data point satisfies T_P <= T1/P + 1.05 T_inf.)" This is the knary fit of the model T_P = T1/P + c T_inf with c about 1.
- Work-first principle (QUOTED, L64-67): "move overheads out of the work and onto the critical path."
- Parallel slackness (QUOTED, L243-246): "the ratio P-bar/P", assumed "much larger than c_inf". The paper measures parallelism of 35 to 96898 on the 12 programs (Fig. 6).
- Applies: fine-grain spawn code; worst when tasks do almost nothing (fib).
- Reference: Frigo, Leiserson, Randall, PLDI 1998 (umass copy).
- How known: QUOTED. Page numbers: the text carries none; L are lines of cilk5b/paper.txt, two columns interleaved.

## B. Task graphs and list scheduling

### 5. Critical-path scheduling of task graphs
- Statement (TEXTBOOK): makespan >= max(critical path, total work / m). "Highest level first" is optimal for in-trees of unit tasks (Hu 1961); optimal for two workers with unit tasks (Coffman and Graham 1972); NP-hard for a general DAG with arbitrary m (Ullman 1975).
- Warning (QUOTED, Graham 1966, graham66 L735-779): for the rule "the 'ready' task ... which currently heads the longest chain of unexecuted tasks", the paper says one would hope the ratio "is considerably closer to 1" than 2 - 1/n, "Unfortunately, this is not possible": the best possible bound is again near 2 (text: "2 - 1/(n+1)" in the garbled scan; the digits are unclear). With no precedence it improves to "4/3 - 1/(3n)", "which, again, is best possible".
- Measured (QUOTED, graham66 L784-787): "empirical results (using computer simulation ...) indicate that examples in which [omega'/omega] >= 1.1 are quite common."
- Applies: known task times and edges. Failure modes: costs are estimates.
- Reference: Hu 1961; Coffman and Graham 1972; Ullman 1975 (all from memory); Kwok and Ahmad 1999 survey.
- How known: QUOTED (Graham parts), TEXTBOOK (rest).

### 6. Graham's list scheduling bound and anomalies
- Answers: how bad can "next free worker takes next ready task" be, and what can go wrong when you improve something.
- System (QUOTED, graham66 L56-80, p.1563-1564): tasks with a partial order, a priority list L; "at any time t a P_i completes a task, it immediately ... scans the list L ... until it comes to the first task T_j which has not yet begun to be executed" and whose predecessors are all complete; otherwise it idles.
- Anomaly (QUOTED, abstract, L7-10): "an increase in the number of processing units can cause an increase in the total length of time needed to process a fixed set of tasks."
- Four changes (L222-228): (i) change the task list, (ii) decrease the task times, (iii) relax the partial order, (iv) change the number of processors n to n'. "easy counterexamples show that is not always the case" that (ii), (iii) or (iv) with n' > n shorten the schedule.
- Bound (QUOTED, L236-241, theorem L420): the finishing time can grow by a factor of at most "1 + (n - 1)/n'" (the scan reads "1 + n -- 1/n'"), and "this bound is the best possible in the sense that it cannot be replaced by any smaller function of n and n'." For n = n' and any list: factor 2 - 1/n (L581, L660: "arbitrarily close to 2 - (1/n)").
- Practical note (L784): worst cases are rare in simulation (see item 5).
- Failure modes: assumes known, fixed task lengths and uninterrupted tasks.
- Reference: Graham, Bell System Tech. J. 45(9), 1966, 1563-1581. The 1969 SIAM paper was not open; the 4/3 - 1/(3m) LPT bound stays SUMMARY (Wikipedia) except as quoted above for the case with no precedence.
- How known: QUOTED (1966 paper).

## C. Speed-up laws

### 7. Amdahl
- Answers: limit of speed-up when a fraction of the work is serial.
- Statement (QUOTED, Amdahl 1967, amdahl L8-15 and L48-50, p.483): "the fraction of the computational load which is associated with data management housekeeping ... accounts for 40% of the executed instructions in production runs ... The nature of this overhead appears to be sequential so that it is unlikely to be amenable to parallel processing techniques. Overhead alone would then place an upper limit on throughput of five to seven times the sequential processing rate". Conclusion: "the effort expended on achieving high parallel processing rates is wasted unless it is accompanied by achievements in sequential processing rates of very nearly the same magnitude."
- Formula in a later source (QUOTED, Gunther 0808.1431 L88-108, eq. 2-3): "S_p(alpha) = p / (1 + alpha (p - 1))", approaching "alpha^-1" as p grows. Gustafson writes it as "Speedup = (s + p)/(s + p/N) = 1/(s + p/N)" (gustafson L17-19).
- Measured: none (arithmetic). Amdahl's own figure: probable region "25% data management overhead and 10% of the problem operations forced to be sequential" (L90-93).
- Numbers (SUMMARY, Wikipedia, arithmetic): p=0.95 gives 20x; p=0.99 gives 100x as s grows.
- Failure modes: fixed problem size and serial fraction; ignores overhead that grows with workers (item 9).
- How known: QUOTED (words); the 1/((1-p)+p/s) form is a later restatement.

### 8. Gustafson
- Answers: speed-up when the problem grows with the machine.
- Statement (QUOTED, gustafson L65-71, CACM 31(5), May 1988): "If we use s' and p' to represent serial and parallel time spent on the parallel system, then a serial processor would require time s' + p' x N to perform the task." "Scaled speedup = (s' + p' x N)/(s' + p') = s' + p' x N = N + (1 - N) x s'". The slope: "1 - N". Premise (L56-57): "it may be most realistic to assume that run time, not problem size, is constant." (L59-61): "it is the parallel or vector part of a program that scales with the problem size. Times for vector startup, program loading, serial bottlenecks and I/O that make up the s component of the run do not grow with problem size."
- Measured (QUOTED, L25-28): "for three very practical applications (s = 0.4 - 0.8 percent) ... on a 1024-processor hypercube: 1021 for beam stress analysis ..., 1020 for baffled surface wave simulation ..., and 1016 for unstable fluid flow". The parallel part "scaled by factors of 1023.9969, 1023.9965, and 1023.9965" (L63-65). Amdahl's curve at s near 0 is "approximately -N^2" steep (L24).
- Failure modes: fails when the serial stage grows with the problem. Not a refutation of Amdahl: a different assumption (fixed time, growing work).
- How known: QUOTED.

### 9. Universal Scalability Law (Gunther)
- Answers: why throughput can fall when workers are added.
- Statement (QUOTED, Gunther 0808.1431, L135-138, eq. 5): "The USL model is a rational function with P(p) = p and Q(p) a second-degree polynomial: C_p(alpha, beta) = p / (1 + alpha (p - 1) + beta p (p - 1))" (symbols restored from L146-147: alpha for contention, beta for coherency).
- Terms (QUOTED, L140-146): 1. "Ideal concurrency associated with linear scalability (alpha, beta = 0)"; 2. "Contention-limited scalability due to serialization or queueing (alpha > 0, beta = 0)"; 3. "Coherency-limited scalability due to inconsistent copies of data (alpha, beta > 0)". "(2) is identical to (5) with beta = 0." Table 1 examples: SMP cache pinging, "Online reservation systems", "Updating database records" (L181-197).
- Peak (QUOTED, L151-165, eq. 6): "(5) possesses a maximum at p* = sqrt((1 - alpha)/beta)" (the scan shows "r 1 -  / "; check against item 9b). Limits: p* -> 0 as alpha -> 1; p* -> infinity as beta -> 0; p* -> beta^(-1/2) as alpha -> 0. "beyond p* the throughput becomes retrograde".
- Meaning of beta (QUOTED, L587-589): "the latency due to the pairwise exchange of data to maintain cache coherency in a multiprocessor"; the quadratic term is "analogous to Brook's law".
- Proof claims (QUOTED, abstract L12-15): C_p "is equivalent to the synchronous throughput bound for a machine-repairman with state-dependent service rate"; Amdahl and Gustafson are "corollaries"; a Q of second degree is "both necessary and sufficient" (Conjecture 1, L536-540 shows a proof sketch from a latency model, not a measurement).
- Measured fits in this paper: none. See item 9b.
- Failure modes (TEXTBOOK): three parameters on few points are unstable; it is a curve fit.
- Reference: Gunther, arXiv 0808.1431 (v2, 25 Aug 2008); Guerrilla Capacity Planning, 2007.
- How known: QUOTED.

### 9b. USL measured fits (Gunther, arXiv 1105.4301, usl2)
- Method (QUOTED, L108-126): "Measure the system throughput ... Measurements should include at least half a dozen data points in order to make the regression analysis statistically meaningful ... Perform nonlinear statistical regression ... Use the values of alpha and beta to predict N_c, where the scalability maximum is expected to occur. N_c may lie outside any physically attainable system configuration."
- Measured, memcached (QUOTED, L560-583, Table 27.2, up to 12 threads, Sun Fire X4170): release 1.2.8 alpha = 0.0255, beta = 0.0210, N_c = 6.8121; 1.4.1 alpha = 0.0821, beta = 0.0207, N_c = 6.6591; 1.4.5 alpha = 0.0988, beta = 0.0209, N_c = 6.5666. "Each release has a very similar retrograde throughput profile, peaking between N = 6 and N = 7 threads."
- Check of the peak formula (arithmetic on these rows): sqrt((1 - 0.0255)/0.0210) = 6.81; sqrt((1 - 0.0821)/0.0207) = 6.66; sqrt((1 - 0.0988)/0.0209) = 6.57. All match N_c. This confirms N_c = sqrt((1 - alpha)/beta) (eq. 27.12, L490).
- Measured, fix (QUOTED, L613-624): after a partitioned cache lock and per-thread stats, "The original scalability peak at N_c = 22 threads (lower curve) is now moved out to N_c = 48 threads (upper curve)." The single mutex was the contention.
- Measured, GPU (QUOTED, L913-918): alpha = 0.1008, beta = 0.00405, "estimated maximum at N_c = 14.89 threads".
- Measured, J2EE (QUOTED, L707-712): from early data "maximum scalability was estimated to occur at N_c = 12,000 user threads. Further measurements, however, show that this maximum occurs at N_c = 2,000 user threads instead." Gunther: the early data held no information on "a subsequent scaling limitation present in the JVM".
- Lesson for use: a fit predicts a peak only from the range measured; the J2EE peak was off by a factor of 6.
- How known: QUOTED.

## D. Speculation

### 10. Time Warp (optimistic execution with rollback)
- Answers: run events in parallel without knowing whether they conflict.
- Statement (QUOTED, Jefferson 1985, jefferson L408-413 and L420-425): each process "is constantly gambling that no message will arrive with a virtual receive time less than the one stamped on the message it is now processing ... whenever the bet is lost the process pays a performance penalty by rolling back". "lookahead generally is successful when the overhead of occasional undoing is outweighed by improved performance the rest of the time."
- Rollback limit (QUOTED, L668-672): "the worst case is that all processes in the system roll back to the same virtual time as the original one did, and then proceed forward again."
- When it pays (QUOTED, L675-689): "We conjecture that most programs obey a temporal locality principle; namely, that most messages arrive in the virtual future at their destination, not causing any rollback at all ... The extent to which the temporal locality principle applies is obviously application-dependent, and can only be verified empirically." Analogy: a rolled-back message is a "time fault" like a page fault (L994-998).
- Cost accounting (QUOTED, L691-699): "The 'cost' of virtual time synchronization is only the cost of the rollback and antimessage overhead. The time taken for computation that is subsequently rolled back ... should not be considered a cost when comparing to alternative synchronization mechanisms. The only alternative ... is for the process to be blocked (i.e., doing nothing) for the same length of real time". This holds only if the processor would otherwise idle.
- Global control (QUOTED, L493, L502): saved state "older than global virtual time (GVT)" can be freed; states and messages with times "greater than or equal to GVT must be retained."
- Measured: none in this paper. It says (L703-705): "Each study indicates that speedup of discrete event simulations is possible", with the numbers left to later studies. A measured study of when rollback does not pay was not found open.
- Failure modes (QUOTED, L781-788): memory for saved states and antimessages; "four additional kinds of memory overhead to be managed".
- How known: QUOTED (design and argument), no measurement.

### 11. Thread-level speculation (TLS): measured
- Answers: parallelise serial code whose independence cannot be proved.
- Method (Steffan, Colohan, Zhai, Mowry, ISCA 2000, tls raw.txt L14, L97): TLS "allows the compiler to automatically parallelize portions of code in the presence of statically ambiguous data dependences". A violation squashes the later epochs (L361).
- Measured (QUOTED, raw L606, simulation of a 4-processor single-chip multiprocessor, 4-issue superscalar): "we achieve speedups on the regions of code that we parallelized ranging from 27% to 126%. The overall program speedups are limited by the coverage ... and they range from 8% to 46%."
- Measured, multi-chip (QUOTED, raw L952): "best performance ... 2x8 for buk, and 2x4 for equake. These region speedups of 331% and 164% ... translate into program speedups of 75% and 39%."
- Cost of speculation (QUOTED, raw L743-744, Table 4, four processors): dynamic instruction overhead 5.3% (buk), 30.6% (compress95), 3.7% (equake), 7.0% (ijpeg); "significant for compress95 (over 30%) due to the large amount of data forwarding and the relatively small size of each epoch." The share of cache misses served from another processor's cache was 34.47% (buk), 3.02%, 1.67%, 65.00% (ijpeg).
- When it stops paying (QUOTED, raw L703-710): "buk continues to enjoy speedups up through eight processors. For the other three cases, however, performance levels off and starts to degrade prior to eight processors." ijpeg degrades beyond four because regions have only four epochs and "an unfortunate mapping conflict in the cache causes many violations due to replacements. In general, the more epochs one attempts to execute in parallel, the greater the likelihood of dependence violations."
- Failed speculation (QUOTED, raw L332): replacement of a speculative line fails speculation and the epoch is re-executed; "this will affect performance but neither correctness nor forward progress." A separate figure for time lost to failed speculation was not found in the text (the paper says it "can contribute to any one" of the bar segments, raw L608).
- Applies: loops where dependences are rare at run time; hardware tracks them.
- Failure modes: small epochs, heavy forwarding, cache conflicts, too many parallel epochs.
- Not read: Steffan TOCS 2005 and the thesis (listed by search, not opened).
- How known: QUOTED (simulated results; no real hardware).

### 12. When speculation pays (expected-value condition)
- Statement (TEXTBOOK, my arithmetic, not a named theorem): q = chance the guess is right, t = time saved on a hit, r = extra time lost on a miss. Expected latency falls when q*t > (1-q)*r. Each miss also wastes work w, so latency and total work must be checked separately.
- Support from the papers: Jefferson's "bet" and "temporal locality" (item 10) and Steffan's violation growth with epochs (item 11) are both this trade, stated qualitatively; neither gives q or r in this form.
- Failure modes: if workers are not free, wasted work delays real work; inexact rollback leaves wrong state.
- How known: TEXTBOOK.

## E. Hiding a serial stage

### 13. Group commit (batching behind one serial resource)
- Answers: one slow serial step (a log flush) limits throughput.
- Mechanism (SUMMARY, search digest, first pass): concurrent transactions share one flush. A 2026 preprint states it (QUOTED, groupcommit L38-41): "Group commit amortizes the fixed cost of a durable log flush across many committing transactions; the release rule - a timer, a batch size, or an adaptive policy - is a classic tuning knob."
- Model (QUOTED, L52-54 and L73-78): flush cost "F(K) = F0 + K*delta (fixed barrier F0 plus per-record delta)". Open loop: timer overhead per transaction "F0/(T lambda) + T/2, minimized at the EOQ square-root rule T* = sqrt(2 F0/lambda)". Closed loop (N clients, think time Z): by Little's law "X = N/(Z + L)", fixed point K = N F(K)/(Z + F(K)).
- Result (QUOTED, abstract L12-19): "the parameter-free greedy-pipelined policy (flush the instant the device is free) self-clocks to a computable fixed point and is within about 0.1% of the best oracle-tuned timer at every load." "T* < F0 exactly when lambda > lambda* = 2/F0; above this device-set load threshold the timer collapses onto greedy and tuning is vacuous."
- Measured (QUOTED, L98-112): EBS gp3 F0 = 0.90 ms (p99 2.5 ms), lambda* about 2200/s; instance NVMe F0 = 0.036 ms (25x faster), lambda* about 55000/s ("group commit barely matters until extreme load"). Greedy within 1.3% (EBS) and 0.1% (NVMe) of best-tuned. PostgreSQL pgbench, WAL on EBS: at 32 clients (6.6k tps) "commit_delay=0 is within 10% of the best tuned value with no reliable or monotonic signal"; at 2 clients (below lambda*) the benefit was "slightly larger (17%)". Model check: batch error 10%, throughput error 7% over N from 2 to 256.
- Open loop with rate shifts (QUOTED, L88-92): a parameter-free ski-rental policy lands at 1.34x the offline optimum, a fixed timer at 1.44x.
- Limits (QUOTED, L128-135): "The closed-loop competitive bound is conjectured, not proven"; "pgbench has non-commit bottlenecks and spot/EBS latency is variable, so the PostgreSQL arm is noisy". The authors "add no new logger". It is a small-company preprint (arXiv 2606.18187, June 2026), not peer reviewed; I treat its numbers as one measured case, not an established result.
- Applies: many concurrent clients; flush cost far above per-record cost; closed-loop clients.
- Failure modes: single client; open-loop bursts; relaxed durability.
- Reference for the origin: DeWitt, Katz, Olken, Shapiro, Stonebraker, Wood, SIGMOD 1984 (cited by the preprint, L152; not opened); Johnson and others, "Aether", VLDB 2010 (flush pipelining; not opened).
- How known: QUOTED for the preprint; SUMMARY for DeWitt.

### 14. Pipelining
- Statement (TEXTBOOK): in a k-stage pipeline with stage times t_i, steady throughput = 1 / max(t_i); latency of one item = sum of t_i; fill and drain cost about (k-1) stage times.
- Applies: independent items through the same stages. Failure modes: unbalanced stages; dependencies stall the pipe.
- Reference: Hennessy and Patterson.
- How known: TEXTBOOK.

## F. Queueing for one serial server

### 15. Little's law
- Statement (SUMMARY, Wikipedia): L = lambda * W. Needs a stationary system. The group-commit preprint uses it as "X = N/(Z + L)" (QUOTED, groupcommit L75).
- Reference: Little, Operations Research 1961.
- How known: SUMMARY, one QUOTED use.

### 16. M/M/1: waiting time against utilisation
- Statement (SUMMARY, Wikipedia; rho = lambda/mu): stable only if rho < 1. Mean response time 1/(mu - lambda). Mean number in system rho/(1-rho): 1 at rho=0.5, 9 at 0.9, 99 at 0.99 (arithmetic).
- Applies: Poisson arrivals, exponential service, one server. Failure modes: real service is not exponential; arrivals are bursty.
- Reference: Kleinrock 1975.
- How known: SUMMARY.

### 17. M/G/1 and the variability term
- Statement (TEXTBOOK, Pollaczek-Khinchine): Wq = lambda E[S^2] / (2(1-rho)) = ((1 + c_s^2)/2) (rho/(1-rho)) E[S]. Kingman heavy-traffic G/G/1: Wq ~ ((c_a^2 + c_s^2)/2) (rho/(1-rho)) E[S] (approximation).
- How known: TEXTBOOK.

## G. Granularity

### 18. Granularity control
- Answers: when a task is too small to run in parallel.
- Statement: a spawn costs "between 2 and 6 times the cost of a C function call" (QUOTED, cilk5 L25); fib's measured work overhead is 3.63 (item 4). "the work overhead c1 ... is only a few percent larger than 1" for programs "which perform significant work for each spawn" (QUOTED, L620-640). Parallel slackness: parallelism should exceed P by a wide margin (QUOTED, item 4; the factor of 10 is TEXTBOOK, from memory). Remedy: a cutoff below which code runs serially (TEXTBOOK). TLS shows the same effect: small epochs cost 30.6% extra instructions (item 11).
- Failure modes: cutoff too high loses parallelism; too low loses time to overhead.
- Reference: CLRS ch. 27; Acar, Charguéraud, Rainey, OOPSLA 2011 (from memory).
- How known: QUOTED (spawn cost, TLS overhead), TEXTBOOK (rest).

## Addresses
Opened as PDF and read (9): arxiv.org/pdf/0808.1431 (Gunther theory); arxiv.org/pdf/1105.4301 (Gunther measured fits); cs.utexas.edu/~venkatar/sys_perf_analysis/ws_theory.pdf (Blumofe and Leiserson, journal version); people.cs.umass.edu/~emery/classes/cmpsci691w-spring2006/papers/cilk5.pdf (Cilk-5); ia801900.us.archive.org/27/items/bstj45-9-1563/bstj45-9-1563_text.pdf (Graham 1966, scan with OCR errors); gdo-pdes-course-2014.llnl.gov/attachments/20776356/20907222.pdf (Jefferson 1985); eecg.utoronto.ca/~steffan/papers/isca00.pdf (TLS); arxiv.org/pdf/2606.18187 (group commit); jeewhanchoi.github.io/uocis531f23/Amdahl.pdf (Amdahl 1967); johngustafson.net/pubs/pub13/amdahl.pdf (Gustafson 1988).
Returned an HTML page, not a PDF: supertech.csail.mit.edu/papers/steal.pdf and cilk5.pdf. Failed: klasses.cs.uchicago.edu cilk5 copy (empty). Fetched and dropped: pages.cs.wisc.edu pldi98_cilk.pdf (duplicate of Cilk-5).
Not found open: Graham 1969 (SIAM; preview only), DeWitt 1984, a measured Time Warp study, Aether. Listed, not opened: arxiv.org/pdf/0809.2541 (Gunther, platform classification), eecg.utoronto.ca steffan_tocs_05.pdf and thesis, pgcon.org 261_CommitBatching.pdf.
Earlier pass (first-pass URLs): en.wikipedia.org pages on parallel analysis, work stealing, Amdahl, Gustafson, multiprocessor scheduling, speculative multithreading, Little, M/M/1; arxiv.org/abs/0808.1431 (abstract).
