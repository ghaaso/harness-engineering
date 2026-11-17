# Parallel scheduling and speed-up theory: established results (lit 4)
Collected 2026-11-18 by one Sonnet agent with web search and fetch. No mapping, no verdict.
Marks: QUOTED = words seen on a page; SUMMARY = from a fetched or search summary (a small model, not the page); TEXTBOOK = standard knowledge stated by me, not fetched.
Limits: PDFs failed (Cilk-5, USL, commit batching), so almost no measured tables were read. Wikipedia pages and search digests carry the SUMMARY items. Nothing was checked against a primary paper. No item is QUOTED.
Where a figure is not recalled, it says so. Search terms were general only (rule 4).

## A. Work, span, greedy bounds

### 1. Work, span, parallelism
- Answers: how much speed-up a computation can ever give.
- Statement (SUMMARY, en.wikipedia Analysis_of_parallel_algorithms): work T1 = total operations = time on one processor. Span T_inf = longest chain of dependent operations (critical path). Parallelism = T1 / T_inf, "the maximum possible speedup on any number of processors". Work law: p*Tp >= T1. Span law: Tp >= T_inf.
- Measured: none (theory).
- Applies: a fixed DAG of tasks with known costs, identical unit-speed workers, no cost for communication.
- Failure modes: real task costs are not known in advance; the model ignores memory, communication and spawn cost.
- Reference: Cormen, Leiserson, Rivest, Stein, Introduction to Algorithms, chapter "Multithreaded Algorithms" (3rd ed. ch. 27); Blumofe and Leiserson 1999.
- How known: SUMMARY (formulas), TEXTBOOK (reference).

### 2. Brent's theorem and the greedy bound
- Answers: how long p workers need, given work and span.
- Statement (SUMMARY, same page): T1/p <= Tp <= T1/p + T_inf. Brent's form: Tp <= T_N + (T1 - T_N)/p. A greedy scheduler (never leaves a worker idle while a task is ready) meets the upper bound (TEXTBOOK, CLRS Theorem 27.1).
- Corollaries (TEXTBOOK, CLRS 27.2 and 27.3): a greedy schedule is within a factor 2 of optimal; it is within a factor 1+epsilon of optimal when p is small against the parallelism (near-perfect linear speed-up).
- Measured: none.
- Applies: any DAG, any greedy rule, zero scheduling cost.
- Failure modes: assumes zero cost of finding and starting a task; the bound is loose by up to 2x.
- Reference: Brent, "The parallel evaluation of general arithmetic expressions", J. ACM 1974; Eager, Zahorjan, Lazowska, "Speedup versus efficiency in parallel systems", IEEE Trans. Computers 1989 (from memory).
- How known: SUMMARY (formula), TEXTBOOK (rest).

### 3. Work stealing (Blumofe and Leiserson)
- Answers: how to schedule a fully strict computation without a central queue.
- Statement (SUMMARY, search digest; J. ACM 46(5) 720-748, DOI 10.1145/324133.324234): a randomized work-stealing scheduler runs a fully strict computation in expected time T1/P + O(T_inf) on P processors; existentially optimal within a constant factor. Space: O(S1 * P) stack (SUMMARY, Wikipedia Work_stealing; needs continuation stealing, not child stealing). Communication is lower than for work sharing (SUMMARY).
- Method (TEXTBOOK): an idle worker steals from the top of a random victim's deque; owners work from the bottom.
- Applies: tasks form a spawn tree (fully strict); workers share memory.
- Failure modes: worst-case steal counts can be exponential in T_inf (SUMMARY); the bound is in expectation; strictness is required.
- Reference: Blumofe and Leiserson, "Scheduling multithreaded computations by work stealing", J. ACM 1999 (FOCS 1994 first).
- How known: SUMMARY.

### 4. Cilk measurements and the work-first principle
- Answers: what the runtime really costs.
- Statement (SUMMARY, search digests of Frigo, Leiserson, Randall): put scheduling cost on the critical path, not on the work. A spawn costs 2 to 6 times a procedure call. On 12 programs on an 8-processor Sun Enterprise 5000, work overhead (T1 over serial time) was a few percent above 1 for most.
- Fitted model (TEXTBOOK, form only): Tp ~ T1/P + c*T_inf with a small constant c. Value of c not recalled. Fibonacci overhead not recalled.
- Applies: fine-grain spawn code; overhead is worst when tasks do almost nothing.
- Failure modes: tiny tasks dominated by spawn cost (item 18).
- Reference: Frigo, Leiserson, Randall, "The implementation of the Cilk-5 multithreaded language", PLDI 1998.
- How known: SUMMARY (two digests; PDF unreadable).

## B. Task graphs and list scheduling

### 5. Critical-path scheduling of task graphs
- Answers: order the tasks of a DAG on m workers to finish early.
- Statement (TEXTBOOK): makespan >= max(critical path, total work / m). Priority rule: run first the ready task with the longest remaining path ("highest level first"). Optimal for in-trees of unit tasks (Hu 1961); optimal for two workers with unit tasks (Coffman and Graham 1972); NP-hard for a general DAG with arbitrary m (Ullman 1975, unit tasks).
- Measured: none recalled.
- Applies: known task times and edges.
- Failure modes: costs are estimates; wrong estimates degrade the priority order (no figure recalled).
- Reference: Hu, Operations Research 1961; Coffman and Graham, Acta Informatica 1972; Ullman, JCSS 1975; Kwok and Ahmad, ACM Computing Surveys 1999 (survey).
- How known: TEXTBOOK. References from memory.

### 6. Graham's list scheduling bound and anomalies
- Answers: how bad can "next free worker takes next ready task" be.
- Statement (SUMMARY, Wikipedia Multiprocessor_scheduling, independent jobs): any list schedule on m identical machines is a (2 - 1/m) approximation, tight for every m. LPT (longest first) is (4/3 - 1/(3m)) (page rendering lost the brackets; matches textbook).
- With precedence (TEXTBOOK, Graham 1966): list scheduling gives makespan <= (2 - 1/m) * optimal for any priority list.
- Anomalies (TEXTBOOK): with a list schedule, more workers, shorter tasks or fewer edges can lengthen the makespan. Exact bound on the lengthening not recalled.
- Measured: none.
- Applies: tasks run uninterrupted; no worker idles while a task is ready.
- Failure modes: anomalies; worst cases need adversarial task lengths.
- Reference: Graham, "Bounds for certain multiprocessing anomalies", Bell System Tech. J. 1966; Graham, "Bounds on multiprocessing timing anomalies", SIAM J. Appl. Math. 1969.
- How known: SUMMARY (independent jobs), TEXTBOOK (precedence case, anomalies; not on the fetched page).

## C. Speed-up laws

### 7. Amdahl's law
- Answers: limit of speed-up when a fraction of the work is serial.
- Statement (SUMMARY, en.wikipedia Amdahl%27s_law): speed-up = 1 / ((1-p) + p/s); p = fraction of time improved, s = speed-up of that part. Limit as s grows: 1/(1-p).
- Numbers on the page (arithmetic, not experiments): p=0.5 gives at most 2x; p=0.95 gives 20x; p=0.99 with s=100 gives about 50x; p=0.30, s=2 gives about 1.18x; p=0.10, s=10000 gives about 1.11x.
- Applies: fixed problem size; fixed serial fraction.
- Failure modes: ignores serial share shrinking with problem size (item 8) and overhead growing with workers (item 9).
- Reference: Amdahl, "Validity of the single processor approach to achieving large scale computing capabilities", AFIPS 1967.
- How known: SUMMARY.

### 8. Gustafson's law
- Answers: speed-up when the problem grows with the machine.
- Statement (SUMMARY, Wikipedia Gustafson%27s_law): serial fraction s of the parallel run, N processors: S = s + (1-s)*N = N - (N-1)*s. Assumes serial time does not grow with problem size.
- Measured: none on the page. The original paper reported speed-ups near 1000 on 1024 processors (TEXTBOOK, from memory, unchecked).
- Applies: workload can be enlarged to fill the workers; time is held fixed.
- Failure modes: fails if the serial stage grows with the problem.
- Reference: Gustafson, "Reevaluating Amdahl's law", Comm. ACM 1988.
- How known: SUMMARY.

### 9. Universal Scalability Law (Gunther)
- Answers: why throughput can fall when workers are added.
- Statement (SUMMARY, search digests; also TEXTBOOK): C(N) = N / (1 + alpha*(N-1) + beta*N*(N-1)). alpha = contention (serial queueing), beta = coherency (pairwise delay). beta = 0 gives Amdahl's law. Peak at N* = sqrt((1-alpha)/beta) (from a third-party page; unconfirmed in an authoritative source, matches the derivative-zero derivation). A generalised form has a factor gamma on the numerator (SUMMARY).
- Abstract of arXiv 0808.1431 (SUMMARY): C = P(p)/Q(p), P linear, Q quadratic in processors.
- Measured fits: none read. Gunther reports fits to benchmarks; figures not recalled.
- Applies: throughput measured at several N, fitted by nonlinear regression.
- Failure modes: three parameters fitted to few points are unstable (TEXTBOOK); it is a curve fit, not a mechanism.
- Reference: Gunther, Guerrilla Capacity Planning, Springer 2007; Gunther, arXiv 0808.1431.
- How known: SUMMARY (partial).

## D. Speculation

### 10. Time Warp (optimistic execution with rollback)
- Answers: run events in parallel without knowing whether they conflict.
- Statement (SUMMARY, search digest of ACM TOPLAS 7(3) 404-425): processes run ahead on a virtual clock. A message with a receive time earlier than the process's virtual time forces a rollback to a time before it. Anti-messages cancel messages sent by rolled-back work (digest incomplete; TEXTBOOK). Global virtual time (GVT) bounds how far back any rollback can go, so older saved state can be freed (TEXTBOOK).
- Measured: none read.
- Applies: state can be saved and restored cheaply; conflicts are rare.
- Failure modes: rollback cascades; memory for saved state; thrashing when conflicts are common (TEXTBOOK).
- Reference: Jefferson, "Virtual time", ACM TOPLAS 1985, DOI 10.1145/3916.3988.
- How known: SUMMARY.

### 11. Thread-level speculation (TLS)
- Answers: parallelise serial code whose independence cannot be proved.
- Statement (SUMMARY, Wikipedia Speculative_multithreading): speculative threads run beside a safe thread; a monitor keeps sequential semantics; a thread whose assumptions fail is discarded or re-run. Three recovery choices: restart all; restart the offender and its successors; restart only the offender and the threads that consumed its data.
- Measured: none on the page; named papers (Jrpm, STAMPede) not read; figures not recalled.
- Applies: spare compute exists; violations are rare.
- Failure modes: rollback cost; the page carries accuracy tags.
- Reference: Steffan and Mowry, HPCA 1998; Steffan and others, ISCA 2000 (from memory).
- How known: SUMMARY (page), TEXTBOOK (references).

### 12. When speculation pays (expected-value condition)
- Answers: whether to guess and run ahead.
- Statement (TEXTBOOK, my arithmetic, not a named theorem): q = chance the guess is right, t = time saved on a hit, r = extra time lost on a miss (undo and redo). Expected latency falls when q*t > (1-q)*r. Each miss also wastes work w, so total work and latency must be checked separately.
- Measured: none.
- Applies: spare workers are free; rollback is exact.
- Failure modes: if workers are not free, wasted work delays real work; inexact rollback leaves wrong state.
- Reference: same shape as branch prediction, Hennessy and Patterson, Computer Architecture.
- How known: TEXTBOOK.

## E. Hiding a serial stage

### 13. Group commit (batching behind one serial resource)
- Answers: one slow serial step (a log flush) limits throughput.
- Statement (SUMMARY, search digest): concurrent transactions share one flush; one already covered by another's flush skips its own. Batch by time window, count, or both. A PostgreSQL talk notes hundreds of commits can share one flush. Batching adds latency; a leader waiting for followers that never come adds pure tail latency; one connection cannot benefit.
- Vendor figures (SUMMARY, not benchmarks): MySQL guide advises 1000 to 5000 microseconds delay; one Rust WAL defaults to 20 ms and 20 transactions; another caps groups at 64 frames. A crate's "10-100x" claim is explicitly unverified.
- Applies: many concurrent clients; flush cost far above per-item cost.
- Failure modes: single client; latency-bound work; durability relaxed to get the gain.
- Reference: DeWitt, Katz, Olken, Shapiro, Stonebraker, Wood, "Implementation techniques for main memory database systems", SIGMOD 1984 (from memory); PGCon 2012 commit batching talk (PDF unreadable).
- How known: SUMMARY (search digest only).

### 14. Pipelining
- Answers: overlap stages so a serial stage never idles.
- Statement (TEXTBOOK): in a k-stage pipeline with stage times t_i, steady throughput = 1 / max(t_i); latency of one item = sum of t_i; fill and drain cost about (k-1) stage times.
- Measured: none.
- Applies: independent items flowing through the same stages.
- Failure modes: unbalanced stages; dependencies between items stall the pipe.
- Reference: Hennessy and Patterson, Computer Architecture: a Quantitative Approach, pipelining chapter.
- How known: TEXTBOOK.

## F. Queueing for one serial server

### 15. Little's law
- Statement (SUMMARY, Wikipedia Little%27s_law): L = lambda * W. Needs a stationary, ergodic system; no assumption on arrival or service distribution or order. Not directly valid on short finite intervals.
- Reference: Little, "A proof for the queuing formula L = lambda W", Operations Research 1961.
- How known: SUMMARY.

### 16. M/M/1: waiting time against utilisation
- Statement (SUMMARY, Wikipedia M/M/1_queue; rho = lambda/mu): stable only if rho < 1. Mean response time 1/(mu - lambda) = 1/(mu(1-rho)). Mean wait rho/(mu(1-rho)). Mean number in system rho/(1-rho). Response time is exponential with rate (mu - lambda).
- Arithmetic from the formula: number in system is 1 at rho=0.5, 9 at 0.9, 99 at 0.99. Wait grows without bound as rho nears 1.
- Applies: Poisson arrivals, exponential service, one server.
- Failure modes: real service times are not exponential; arrivals are bursty.
- Reference: Kleinrock, Queueing Systems vol. 1, 1975.
- How known: SUMMARY.

### 17. M/G/1 and the variability term
- Statement (TEXTBOOK, Pollaczek-Khinchine): mean wait Wq = lambda*E[S^2] / (2*(1-rho)) = ((1 + c_s^2)/2) * (rho/(1-rho)) * E[S], c_s^2 = squared coefficient of variation of service time. Deterministic service (c_s^2 = 0) halves the M/M/1 wait.
- Heavy-traffic approximation for G/G/1 (TEXTBOOK, Kingman 1961): Wq ~ ((c_a^2 + c_s^2)/2) * (rho/(1-rho)) * E[S]. An approximation, not a bound.
- Measured: none recalled.
- Applies: one server; Poisson arrivals (P-K); heavy traffic (Kingman).
- Reference: Pollaczek 1930; Khinchine 1932; Kingman, Proc. Cambridge Phil. Soc. 1961.
- How known: TEXTBOOK.

## G. Granularity

### 18. Granularity control
- Answers: when a task is too small to run in parallel.
- Statement: a spawn costs 2 to 6 times a procedure call (SUMMARY, Cilk-5). Parallel pays only when work per task is much larger than spawn plus steal cost; the usual remedy is a cutoff below which code runs serially (TEXTBOOK). Parallel slackness: the parallelism T1/T_inf should exceed P by a margin, a factor of about 10 as a rule of thumb (TEXTBOOK, CLRS; factor from memory). A common loop grain default is about n/(8P) in Cilk and TBB (from memory).
- Oracle approach (TEXTBOOK): estimate task cost at run time, spawn only above a threshold.
- Measured: only the 2-6x figure.
- Failure modes: a cutoff too high loses parallelism; too low loses time to overhead; cost estimates can be wrong.
- Reference: CLRS ch. 27; Acar, Charguéraud, Rainey, "Oracle scheduling", OOPSLA 2011 (from memory).
- How known: SUMMARY (2-6x), TEXTBOOK (rest).

## URLs tried
Worked (fetch): en.wikipedia.org/wiki/Analysis_of_parallel_algorithms; /Work_stealing; /Amdahl%27s_law; /Gustafson%27s_law; /Multiprocessor_scheduling; /Speculative_multithreading; /Little%27s_law; /M/M/1_queue; /Thread_(computing); /Neil_J._Gunther (no USL formula); arxiv.org/abs/0808.1431 (abstract only).
Failed: en.wikipedia.org/wiki/Time_Warp_(computing) (404); /Graham%27s_scheduling_anomalies (404); /Virtual_time (404); /Group_commit (404); people.cs.umass.edu/~emery/classes/cmpsci691w-spring2006/papers/cilk5.pdf (PDF unreadable); arxiv.org/pdf/1401.1912 (wrong paper, unreadable); pgcon.org/2012/schedule/attachments/261_CommitBatching.pdf (PDF unreadable).
Web searches that gave usable digests: Blumofe-Leiserson abstract; Cilk-5; group commit; USL formula; Jefferson 1985. No tool was denied.
Listed by search, not opened: perfdynamics.com/Manifesto/USLscalability.html; queue.acm.org/detail.cfm?id=2789974; gdo-pdes-course-2014.llnl.gov/attachments/20776356/20907222.pdf (scan of Jefferson).
