# c1 collect bottleneck: scheduling around one bottleneck (flow shop, shifting bottleneck, drum-buffer-rope, scalability law, critical sections)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Papers are in `R:papers/check/<short>/paper.txt` (ignored folder).
Line numbers are lines of that `paper.txt`. For `suleman-acs` the text is the plain (non-layout) extraction; for the others it is `pdftotext -layout`.

## Gate summary
1. Gunther 2008 (arXiv 0808.1431): USL equals the synchronous throughput bound of a machine-repairman queue; the Amdahl asymptote is 1/alpha with alpha = S/(S+Z) (reading inferred, see P1), so one-server saturation is (S+Z)/S. quoted, txt lines 11-14, 102-107, 173-177, 273-275.
2. Gunther 2011 (arXiv 1105.4301): memcached peak moved from Nc = 22 to Nc = 48 threads after lock changes (2.2 times); at least half a dozen points needed; Nc may lie outside any attainable size. quoted, txt lines 113-123, 622-624.
3. Suleman, Mutlu, Qureshi, Patt 2009 (ASPLOS): running critical sections on one fast core cut average time 34% against an equal-area 32-core symmetric chip (23% against an asymmetric chip); scalability up in 7 of 12 workloads. quoted, txt lines 40, 914, 1073.
4. Suleman 2009, same paper: MySQL on a symmetric chip saturated at 16 threads; with accelerated critical sections it kept rising to 32 (the cap moves when the serial step is faster, not when workers are added). quoted, txt line 254.
5. Choo 2016 (secondary text citing Hopp and Spearman 1996): critical WIP W0 = rb x T0; above W0 only cycle time grows, below it throughput is lost; with variability W0 alone does not reach the maximum. quoted from a secondary source, txt lines 106-121.
6. Bokor, Seiringer, Altendorfer 2024 (arXiv 2402.14832): drum-buffer-rope has two buffers (CCR buffer keeps the bottleneck from starving); they grew only slightly with load. Gain figure is for search effort only. quoted, txt lines 120-132, 537-543.
7. Tanhaei and others 2017: DBR simulation, 18 job-shop models; extension for second bottleneck and free goods improved throughput significantly in 6 of 18 (plus 1 with lead time). quoted, txt lines 546-553. Weak.
8. Adams, Balas, Zawack 1988 (shifting bottleneck): not opened (paywall; DTIC copy gave a bot-check page). No number used.
9. Library, used and not re-collected: Suleman 2008 widths (o1-0301 to 0303) and their refute round (o1-0202); Anselmi and Cremonesi 2010 (o1-0318); USL fits (r57-0307); untested design o1-0402.

Finding for the lane: the bottleneck literature gives one ratio three ways: machine-repairman asymptote (S+Z)/S, critical WIP rb x T0, and Suleman's sqrt(T_NoCS/T_CS) for a critical section every thread must pass. It also says what moves the cap: a faster serial step (item 4) or a smaller coherency term (item 2), never more workers. No paper read here measures a check shared by model sessions.

## From the library
Searches run: `Scalability Law`, `Amdahl`, `Suleman`, `bottleneck`, `shifting`, `drum`, `Goldratt`. `drum` and `Goldratt`: "not recorded".
- r57-0307 (quoted): USL peak N* = sqrt((1 - alpha)/beta); an early fit predicted 12,000 threads where 2,000 was measured. Place read in P2.
- x05-0327, x05-0322, x05-0330 (quoted): C_p formula; Amdahl form p/(1 + alpha(p-1)) approaching 1/alpha; the abstract's machine-repairman claim. P1 reads the place and confirms it.
- x05-0331, x05-0332, x05-0333, x05-0335, x05-0100 (quoted/measured): half a dozen points, memcached table 27.2, 22 to 48 threads, 12,000 vs 2,000, arithmetic check. Confirmed in P2 except the 12,000 figure (not re-quoted, see P2).
- o1-0301, o1-0302, o1-0303 (quoted): Suleman, Qureshi, Patt 2008 (feedback-driven threading): best thread count sqrt(T_NoCS/T_CS) capped at cores; min(P_CS, P_BW, cores); P_BW = 100/BU1. The 2008 paper was not re-opened (its guessed link returned an error page). Not upgraded.
- o1-0202 (observed): the eight bottleneck-rule claims C1 to C8 all came back PARTIALLY from a refute round; each holds only under its paper's conditions (o1-refute.md). Treat o1-0301 to 0303 as conditional.
- o1-0402 (reasoned, untested): width = round(sqrt(T_out/T_check)) holds only if one task is split into pieces that each pass the check once; when the check runs once per change, output is capped at c changes per T_check and workers past c (T_out + T_check)/T_check only queue. P1 is a source for the second form (asymptote (S+Z)/S).
- o1-0318 (quoted): Anselmi and Cremonesi 2010: the bottleneck migrates with the job mix; a linear program lists which stations can saturate alone or together. Not re-read.
- x05-0203 (quoted): the Amdahl file records no measurement. x05-0601 and x15-0605 (mistakes): Amdahl 1967 has no formula; the formula is Gunther's or later; do not cite Amdahl 1967 for it.
- b1-0125 (reasoned): a waiting session costs tokens at each wake, not while blocked. Bears on the "with model sessions" lines.
- Not recorded: shifting bottleneck (Adams, Balas, Zawack), drum-buffer-rope, Goldratt, Hopp and Spearman.

## Papers

### P1. Gunther, "A General Theory of Computational Scalability Based on Rational Functions", arXiv 0808.1431 (2008). Read from: https://arxiv.org/pdf/0808.1431. Saved: R:papers/check/usl-gunther/paper.txt. Read: abstract, sections 1 to 5 and conclusion (about two thirds; appendices skimmed).
- Problem: why Amdahl's law and the USL fit measured scaling, and which queue they bound.
- Mechanism: a machine-repairman queue (p machines, mean uptime Z, repair time S) has a synchronous throughput bound; with a state-dependent server that bound is the USL; Amdahl is the case with no coherency term.
- Result: "We prove that Cp is equivalent to the synchronous throughput bound for a machine-repairman with state-dependent service rate. Simpler rational functions, such as Amdahl's law and Gustafson speedup, are corollaries of this queue-theoretic bound." (txt lines 11-14).
  "The machine repairman (Fig. 2) is a well-known queueing model [15] which represents an assembly line comprising a finite number of machines p which break down after a mean lifetime Z. A repairman takes a mean time S to repair a broken machine and if multiple machines fail, the additional machines must queue for service in FIFO order." (txt lines 173-177).
  X(p) = p / (R(p) + Z) (eq. 8, txt lines 232-235); when all machines fail together R(p) = pS, which "provides a lower bound on" X(p): p / (pS + Z) (eq. 9, txt lines 273-275).
  Amdahl form: Sp = p / (1 + alpha (p - 1)), which "approaches an asymptote" 1/alpha (txt lines 102-107). The paper ties alpha to the queue by eq. 10 (txt line 313); the extraction scrambles the fraction, and the reading alpha = S/(S+Z) is inferred from the limits printed beside it (alpha tends to 0 as S tends to 0 with Z fixed, and to 1 as Z tends to 0 with S fixed). On that reading the ceiling 1/alpha = (S+Z)/S, the one-slot form of "slots x (time outside + time inside) / time inside". This paper states it as a throughput bound (synchronous, worst case), not as an exact best number of workers.
  "corollary 1 is a lower bound on throughput; synchronous throughput, and therefore represents worst-case scalability" (txt lines 714-715). Past the peak throughput "becomes retrograde" (txt lines 538-540).
- Measured gain: none; the paper has no measurements (library x05-0204 agrees). Measured fits are in P2.
- Assumes: exponential uptime and service (M/M/1//p); one server; mean values; steady state. The coherency term needs a state-dependent server. No batching and no c servers: not found in this paper (sub-topic 1 holds the multi-server case).
- With model sessions: a worker is a machine with Z = minutes of its own work, S = the check. For a check of seconds against minutes of work, (S+Z)/S is large and the check does not bind; at about ten minutes with Z of a few minutes the ceiling is near 1 to 2; at an hour the check is always the bottleneck. Reasoned. Exponential times are unlikely (a suite has a near fixed length; the paper says the repairman metrics are "robust", line 663, with no figure). A rerun is not the same run, so S for a retried unit differs.
- Needs to know: S (check length) and Z (time a worker takes between checks), as medians and spread.
- Status: quoted.

### P2. Gunther, USL chapter with measured fits, arXiv 1105.4301 (2011). Read from: https://arxiv.org/pdf/1105.4301. Saved: R:papers/check/usl-fits/paper.txt. Read: method steps and the memcached case (sampled), other cases through the library.
- Problem: how to fit the USL to measurements and use the fit to find where throughput peaks.
- Mechanism: fit alpha (contention) and beta (coherency) by regression of capacity ratio against N; peak at Nc = sqrt((1 - alpha)/beta).
- Result: "Measurements should include at least half a dozen data points in order to make the regression analysis statistically meaningful." (txt lines 113-114). "Use the values of alpha and beta to predict Nc, where the scalability maximum is expected to occur. Nc may lie outside any physically attainable system configuration." (txt lines 121-123).
  Memcached, table 27.2 (txt lines 578-583): 1.2.8 alpha 0.0255, beta 0.0210, Nc 6.8121; 1.4.1 alpha 0.0821, beta 0.0207, Nc 6.6591; 1.4.5 alpha 0.0988, beta 0.0209, Nc 6.5666.
  "The original scalability peak at Nc = 22 threads (lower curve) is now moved out to Nc = 48 threads (upper curve)." (txt lines 622-624) after the cache-lock and statistics changes.
- Measured gain: the peak of a lock-bound server moved from 22 to 48 threads (2.2 times) after the serial section was shortened (txt lines 622-624). The J2EE fit that gave 12,000 against 2,000 measured is held from the library (x05-0335); the extraction renders its numbers as chart axes, so it is not re-quoted here.
- Assumes: closed system with a fixed number of users or threads, throughput measured at several N, one resource with contention and pairwise coherency.
- With model sessions: N is 3 to 16, so a fit has few points (the paper wants six). With sessions that do not interfere, beta is near 0, the peak is far beyond 16 and the ceiling is Amdahl's 1/alpha (library x15-0431, reasoned); with shared files or rework, beta is above 0. The 12,000-against-2,000 miss warns against predicting beyond the measured range. Reasoned.
- Needs to know: at least six measured throughputs at different worker counts; or only S and Z (P1) when no coherency cost is expected.
- Status: quoted.

### P3. Suleman, Mutlu, Qureshi, Patt, "Accelerating Critical Section Execution with Asymmetric Multi-Core Architectures", ASPLOS 2009. Read from: https://utw10235.utweb.utexas.edu/pub/suleman_asplos09.pdf (authors' site; the download had to be resumed; file 977,969 bytes). Saved: R:papers/check/suleman-acs/paper.txt (plain extraction, 1,132 lines). Read: abstract, sections 1 to 3, the evaluation headline and the scalability table, conclusion.
- Problem: threads serialise at critical sections; past a point more threads only add waiting, so a lock-bound program stops scaling.
- Mechanism: selected critical sections run on one large fast core (asymmetric chip) instead of on the small core that reached them; lock and shared data stay in the large core's caches; a selector turns acceleration off for sections that serialise falsely.
- Result: "We find that ACS reduces the average execution time by 34% over an equal-area 32-core symmetric CMP (SCMP) and by 23% over an equal-area ACMP." (txt line 40; same in the conclusion, line 1073).
  "This contention can become so high that every thread might need to wait for several other threads before it can enter the critical section. In such a case, adding more threads to the program does not improve (and in fact can degrade) performance." (txt line 254).
  "causes performance to saturate at 16 threads." MySQL on the symmetric chip; "Performance of ACS continues to increase until 32 threads." (txt line 254).
  "For 7 of the 12 applications (is, pagemine, puzzle, qsort, sqlite, oltp-1, and oltp-2) ACS improves scalability: it increases the number of threads at which the execution time of the application is minimized." (txt line 914; table 7 follows, garbled by extraction).
  The gain depends on size: "ACS's performance improvement becomes more likely when the number of cores on the chip increases" (txt line 374); at 8 small-core area some workloads did worse (txt line 536).
- Measured gain: 34% less average execution time against an equal-area 32-core symmetric chip, 12 critical-section-heavy workloads (databases, sorting, puzzle, web cache), cycle-accurate simulator, best thread count per system (txt lines 40, 435). Simulation of hardware that does not exist.
- Assumes: one serial section every thread must pass; the fast core runs it faster (one large core = four small cores of area); sections known (marked in the code); hardware request queue.
- With model sessions: the analogue is a faster serial check (quicker machine, warm cache, smaller suite), and it also raises the number of workers that pay off (7 of 12 here), the same message as P2. The fast core does not carry over; the principle that the cap is set by the serial step's speed does. A faster check helps in proportion to its share of a worker's cycle, so it matters most at minutes and an hour. Its false-serialisation finding has an analogue: changes that touch different files need not wait on one another. Reasoned.
- Needs to know: which step is the serial one and its share of a cycle; for us S and Z.
- Status: quoted.

### P4. Choo (Project Production Institute), "Little's Law: A Practical Approach to Understanding Production System Performance", 2016, quoting Hopp and Spearman, Factory Physics (1996). Read from: https://projectproduction.org/wp-content/uploads/2016/12/Littles-Law-%E2%80%93-A-Practical-Approach-to-Understanding-Production-System-Performance-.pdf. Saved: R:papers/check/littles-law-prod/paper.txt. Read: all 164 lines.
- Problem: how much work in process a line with a bottleneck should hold.
- Mechanism: with no variability, throughput reaches the bottleneck rate rb once WIP reaches critical WIP W0 = rb x T0 (T0 = raw process time); more WIP only lengthens cycle time.
- Result: critical WIP is "the WIP level that achieves the maximum throughput (bottleneck rate, or rb) and minimal cycle time (raw process time, or T0) in a process flow with no variability" (txt lines 106-108). "W0 = rb x T0" (txt line 114). "Any WIP above this level would not result in additional throughput, but rather increases CT due to additional wait time. Any WIP level below W0 would result in lost throughput." (txt lines 116-118). "maximum throughput cannot be achieved by merely setting the target WIP as same as the critical WIP." (txt lines 120-121). Wait grows steeply with utilisation, with 80 to 85% named as where cycle time explodes (txt lines 138-143).
- Measured gain: none (a worked example only).
- Assumes: a line with one bottleneck; W0 is the no-variability case; with variability more WIP is needed.
- With model sessions: with rb = 1/S (one check per S) and T0 = S + Z, W0 = (S+Z)/S, the same number as P1's one-server ceiling. With c slots rb = c/S and W0 = c(S+Z)/S, which is the lane file's formula; c is not stated in this text, it follows by substituting rb (reasoned). "Hold WIP near W0, not above it" matches "do not start workers past saturation" (workers are WIP here). Reasoned.
- Needs to know: rb and T0 only.
- Status: quoted from a secondary text. Hopp and Spearman's book was not opened (no free copy); treat as `textbook` grade until read at the source.

### P5. Bokor, Seiringer, Altendorfer, "Integrating Simulation Budget Management into Drum-Buffer-Rope: A Study on Parametrization and Reducing Computational Effort", arXiv 2402.14832 (2024). Read from: https://arxiv.org/pdf/2402.14832v2.pdf. Saved: R:papers/check/dbr-bokor/paper.txt. Read: all (758 lines).
- Problem: choosing the buffer sizes of drum-buffer-rope by simulation with less computation.
- Mechanism: the drum is the bottleneck's schedule; the rope ties release of work to the bottleneck's pace; the CCR buffer (a time cushion before the bottleneck) keeps it from starving; a shipping buffer protects delivery.
- Result: "Its fundamental concept revolves around scheduling the bottleneck workstation, thereby aligning the entire production system with the throughput of this critical constraint." (txt lines 120-122). "the CCR (capacity-constrained resource)-Buffer, aiming to protect the bottleneck from starvation" (txt lines 131-132). "variations in the production system environment have a marginal effect on the CCR-Buffer, with only a slightly longer buffer required at higher shop load" (txt lines 537-538); "a slight increase in process uncertainty at the bottleneck workstation necessitates a longer Shipping-Buffer" (txt lines 541-543).
- Measured gain: only for search effort ("significant reduction in simulation budget" against full factorial enumeration, abstract, txt lines 28-30); no throughput gain against another policy.
- Assumes: multi-stage multi-item shop, stochastic times, one fixed bottleneck, simulated.
- With model sessions: the mechanism maps to keeping the check always supplied (a buffer of ready changes before it so it never idles) and holding back new work when the buffer is full (the rope). The paper's buffer sizes are in its own time units (CCR buffer 6 to 8 at 0.85 to 0.95 load) and do not translate. Reasoned.
- Needs to know: which station is the bottleneck, its load, the spread of process times.
- Status: quoted. Weak for measured gains.

### P6. Tanhaei, Nahavandi, Ahmadi Motlagh, "Improving Drum-Buffer-Rope material flow management with attention to second bottlenecks and free goods in a job shop environment", J. Quality Engineering and Production Optimization 2017. Read from: https://journals.shahed.ac.ir/article_460_381f40611617a5845f377146b0cf5d1e.pdf. Saved: R:papers/check/dbr-tanhaei/paper.txt. Read: abstract, method, results and conclusions (most of it).
- Problem: plain DBR schedules only the first bottleneck; work that skips it ("free goods") and a second near-bottleneck are neglected.
- Mechanism: extend DBR to release by the second bottleneck and to throttle free goods.
- Result: "The simulation result shows that the proposed methodology significantly improved the lead time and throughput." (txt lines 24-26). Detail: lead time improved significantly in 9 of 18 models, throughput in 6, both in 1, neither in 2 (txt lines 546-553). One model had a first bottleneck at 93% and a second at 89% utilisation (txt line 260).
- Measured gain: significance only (t-test at 5%, txt lines 541-542); throughputs are about 337,000 to 355,000 units across models (txt lines 346-348); no percentage gain was found in the lines read. No usable number.
- Assumes: job shop, fixed routings, simulation, known utilisations.
- With model sessions: a second stage close in load to the first becomes the new limit once the first is relieved (93% against 89%): making the check shorter may move the limit to the next serial stage. Reasoned.
- Needs to know: utilisation of every stage.
- Status: quoted; low strength (one small simulation study, p-values only).

## Could not open
| Title | Routes tried | Why |
|---|---|---|
| Adams, Balas, Zawack 1988, "The Shifting Bottleneck Procedure for Job Shop Scheduling", Management Science 34(3) | INFORMS page; DTIC report ADA173110 (html and pdf URLs); search for author copies; a student reproduction (damaged download, removed) | Journal paywall; the DTIC route returned a 1,484-byte bot-check page, not worked round. Only search-result text seen (sequences machines one at a time, each time the bottleneck among unsequenced machines, re-optimising earlier ones). No number used. |
| Hopp and Spearman, Factory Physics (book); Hopp and Spearman 2004 "To pull or not to pull" | web search | No free copy found; P4 is a secondary text citing the book. |
| Goldratt and Cox, The Goal (1984); Goldratt 1990 | web search | Books, no open copy; DBR is read through P5 and P6. |
| Suleman, Qureshi, Patt 2008, "Feedback-driven threading" (ASPLOS 2008) | a link guessed from the 2009 paper's path | Returned a 196-byte error page; held in the library as quoted (o1-0301 to 0303), not re-read. |
| Simatupang 1997 (Massey thesis on DBR buffers); Politou and Georgiadis (Albany) | direct links from a search | Damaged file / bot-check page. |
| Duclos and Spencer 1995, "The impact of a constraint buffer in a flow shop" | repository page only | No PDF in the results; not fetched. |

## Needs the owner's sign-in
| Title | URL |
|---|---|
| Adams, Balas, Zawack 1988, The Shifting Bottleneck Procedure for Job Shop Scheduling | https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.34.3.391 (DOI 10.1287/mnsc.34.3.391) |
| Duclos and Spencer 1995 | DOI 10.1016/0925-5273(95)00197-2 (repository page https://scholarworks.uni.edu/facpub/4261) |

## What this sub-topic did not settle
- The best number of workers with c servers is not in these papers; here it is c x (S+Z)/S by substituting rb = c/S into P4's W0 (reasoned). Sub-topic 1 holds the source for c servers.
- No paper read here measures drum-buffer-rope against a plain release rule; P5 and P6 are weak on that, and Goldratt's originals were not opened.
- Read in full: P4 and P5. Read in large part: P1, P3 (text through the end, evaluation sampled), P6. Sampled: P2. The brief asks for 5 to 8 papers in full; the shortfall is the blocked shifting bottleneck paper and the sampled second USL file.

## Second attempt
`R:` = `docs/program/evidence/round3-2026-11-18/`.

### P7. Suleman, Qureshi, Patt, "Feedback-Driven Threading: Power-Efficient and High-Performance Execution of Multi-threaded Workloads on CMPs", ASPLOS 2008. Read from: https://utw10235.utweb.utexas.edu/people/suleman/papers/fdt.pdf (the URL cited by library record o1-0301; the author's own site). Saved: `R:papers/check/suleman-fdt2008/` (`plain.txt` is the non-layout text and is what the lines below refer to; `paper.txt` is the two-column layout text). The first download was cut off at 130,561 of 216,268 bytes; a repeat with resume returned the whole file. Read: abstract, sections 1, 4 (critical-section model), 5 (bandwidth model), the combination and the limits; related work sampled.
- Problem: how many threads to run when threads share a serial step (a critical section) or a limited bus.
- Mechanism: a short single-thread training run measures time in the serial step (T_CS) and outside it (T_NoCS); a formula gives the thread count, capped by cores and by the bus limit.
- Result: "When each thread is required to execute the critical section, the total time spent in the critical section increases linearly with the number of threads" (plain.txt line 30). Model T_P = T_NoCS / P + P x T_CS, so P_CS = sqrt(T_NoCS / T_CS) (equations 1 to 3, plain.txt lines 196-204, garbled in extraction): "Equation 3 shows that (PCS) increases only as the square-root of the ratio of time outside the critical section to the time inside the critical section" (plain.txt line 210). Worked example: 2 threads 8 units, 4 threads 10 units, 8 threads 17 units (plain.txt line 193). "the execution time with SAT is within 1% of the minimum execution time" on four synchronisation-limited programs (plain.txt line 260). Bus: P_BW = 100 / BU1 (plain.txt line 440); combined: P_FDT = MIN(P_BW, P_CS, num available cores) (plain.txt line 629).
- Measured gain: "SAT can reduce both execution time and power by up to 66% and 78%"; "When SAT and BAT are combined, the average execution time reduces by 17% and power reduces by 59%", 12 programs, against one thread per core (plain.txt lines 18 and 634).
- Assumes: every thread passes the serial step so its total time grows linearly with the thread count; one program at a time; a representative training run. "Our model for bandwidth utilization assumes that bandwidth requirement increases linearly with the number of threads" (plain.txt line 653); BAT predicted 7 where 8 was best (plain.txt line 537).
- With model sessions: the square root holds when one job is cut into pieces that each pass the serial step once. It does not describe workers that each pass a shared check once per change; there the cap is the check's capacity, c changes per check time (library hypothesis o1-0402). A check of seconds, minutes or an hour changes T_CS, not the form. Reasoned.
- Needs to know: T_CS and T_NoCS per unit, from a short run.
- Status: quoted. Upgrades library records o1-0301 to o1-0303 (the 1%, 17% and 7-for-8 figures match).

### Still closed
Adams, Balas, Zawack 1988 (Management Science 34(3) 391-401, DOI 10.1287/mnsc.34.3.391) | INFORMS page and DOI: paywall; Unpaywall and OpenAlex: closed, with a DTIC repository location (technical report ADA173110) and an ACM record 10.5555/2841176.2841184 (not opened); DTIC pdf routes (apps.dtic.mil/sti/pdfs/ADA173110.pdf, apps.dtic.mil/sti/tr/pdf/ADA173110.pdf, apps.dtic.mil/dtic/tr/fulltext/u2/a173110.pdf, and ADA261797.pdf) all returned a 1,484-byte bot-check page, not worked round; authors' pages: a search "Balas shifting bottleneck ... Carnegie Mellon Tepper working paper" found none; arXiv: not there; RePEc and IDEAS: abstract only; Internet Archive scholar: no result list | paywall and bot check. URLs for the owner: https://apps.dtic.mil/sti/html/tr/ADA173110/index.html and https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.34.3.391.
Duclos and Spencer 1995 (Int. J. Production Economics 42(2) 175-185, DOI 10.1016/0925-5273(95)00197-2) | Unpaywall and OpenAlex: closed; University of Northern Iowa repository page https://scholarworks.uni.edu/facpub/4261 (abstract only; its download link returned a 5,613-byte bot-check page); core.ac.uk copy 131355426 returned a bot-check page; ScienceDirect paywall | closed. Abstract only: a simulation of a diesel engine plant, analysis of variance says the constraint buffer raised output; no number used.
