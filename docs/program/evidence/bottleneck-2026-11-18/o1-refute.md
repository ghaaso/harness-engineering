C1 | PARTIALLY | The model and the 1 % result trace, but only in a 32-core simulation of short loop kernels where the serial step is one merge per worker share, and the formula overshot the best count in 2 of 4 programs.
C2 | PARTIALLY | The minimum rule (argued in the model) and the 17 % against 32 threads trace, but no tested program had both limits, and the clause "does not compare it with the best fixed count" is false (section 6.3 compares it with an offline oracle and finds them similar).
C3 | PARTIALLY | Holds for OLTP on 1-2 CPUs and 1-4 disks; the level grows linearly with busy resources, two setups needed about 20, and heavy locking lowered it, so "under 20" is not a constant and the bottleneck type is not irrelevant.
C4 | PARTIALLY | Both quotes trace, but the step collapse is derived only for T >> n >> 1 with global FIFO/LRU paging (the paper says the analysis breaks down otherwise), and the PC test as written measures private memory, not working sets.
C5 | PARTIALLY | DAGOR and Breakwater argue for queueing delay over CPU utilisation in request servers with latency targets but never test a CPU-driven controller; the NSDI'15 quote does not bear on it; Protego (NSDI'23) shows server-queue delay misses lock contention.
C6 | PARTIALLY | The numbers trace (85-92 % of peak at the highest load; up to 85 % waste on TM-1), but only for spin locks with sub-microsecond critical sections on a 64-context Niagara II; where threads block (TPC-C) a plain pthread mutex did as well.
C7 | PARTIALLY | The quotes and the logarithmic counter trace, but the 8x/23x belong to MOCC as a whole (queue lock, lock-order protocol, retrospective lock list), the counter must be reset to switch back, and H = 5-10 means about 30-1,000 aborts before locking.
C8 | PARTIALLY | Every quote traces with nothing against it in the paper, but the results are for 10-100-cycle critical sections on Alewife with thresholds tuned per machine, so the "1,000 critical sections" figure is not portable.

T = C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\f57c0bf8-9eae-432f-bfec-3dbca7e4417a\scratchpad. Counter-paper read in full text: Cho et al., "Protego: Overload Control for Applications with Unpredictable Lock Contention", NSDI 2023, usenix.org/system/files/nsdi23-cho-inho.pdf, text at T\r1-protego\plain.txt. No claim reached CONFIRMED.

## C1 (T\o1-adaptive-sync\p7\raw.txt)
- Traces: Eq. 1 at l.198 is T_P = T_NoCS/P + P x T_CS, so serial time does grow with P; l.256 (min of P_CS and cores); l.260 "within 1% of the minimum execution time".
- The serial step is one merge per worker share: l.46 "each of which gathers the histograms for its portion of the page ... and adds it to the global histogram".
- Formula is not the best count: l.261 PageMine "decreases until 4 threads and begins to increase beyond 6", SAT picks "6.53 (rounded to 7)"; "For EP, having 4 threads minimizes the execution time while SAT predicts 5". The time stays within 1 % because the curve is flat near its minimum.
- Conditions: cycle-accurate simulator, 32 in-order cores (l.96); training single-threaded, stops at stability or "a maximum of 1% of the total iterations" (l.251, l.254), so it needs many short iterations. Failing conditions: neither holds in the text (Figure 8 values are not readable from the text).
- Setting: with a few workers taking minutes per unit, a serial step taken once per unit gives a fixed total N x T_CS that does not grow with P, so the square-root rule does not apply. It applies only to a once-per-worker merge. A 1 % training sample does not exist when there are only a few long units.

## C2 (T\o1-adaptive-sync\p7\raw.txt)
- Traces: l.626 minimum of the two; l.631 normalised to "32 in our study"; l.634 "reduces the execution time by 17%". The 17 % is the bar "gmean", a geometric mean over 12 (l.631).
- Against the claim's caveat: l.636 "We also compare (SAT+BAT) to an oracle scheme that statically sets the number of threads using off-line information ... For all other applications, the execution time and power with (SAT+BAT) is similar to the oracle scheme". The exception is MTwister, where SAT+BAT uses 31 % less power. The best fixed count was compared, and the comparison is favourable.
- Proof (l.693-701): an argument from the model with figures. Both cases follow if T_P = T_NoCS/min(P, P_BW) + P x T_CS, and I found no flaw in either. Failing conditions: none holds.
- Narrower: every program is CS-limited, BW-limited or neither (l.107), so the two-limit case rests on the Appendix argument alone, in simulation.

## C3 (T\o1-load-control\p5\paper.txt)
- Traces: l.278, l.353, l.356.
- Borderline on "under 20": l.239 "about M P L = 20 for four disks" (WI/O-browsing); l.277 "increases to around 20" (4 disks, 2 CPUs). Both are where maximum throughput is reached; near-optimal may fall below 20.
- Type does matter at the margin: l.280 "increasing the amount of locking lowers the MPL". With one busy resource each, 1 disk needs MPL 2 (l.237) but 1 CPU needs about 5 (l.233). The paper blames secondary I/O or CPU components, so the second failing condition is arguable, not clean.
- Scale: 1-6 disks, 1-2 CPUs, 100 clients, Pentium 4 with DB2/Shore (l.68, l.72). l.419: the needed level "grows linearly with the number of disks" (model up to 16 disks, Figure 7 axis to 100).
- Setting: 12 cores lie outside the tested range, and by the paper's own linear rule a CPU-bound 12-core load would need well over 20. If units wait on an outside service, that service's slots are the resources, and this paper did not study them. The controller needs "around 100 transactions" per observation (l.506), which at minutes per unit is hours per step.

## C4 (T\o1-load-control\p2\paper.txt)
- Traces: l.73, l.220. Conditions: l.196 "We assume that the traverse time T is very large; that is, T (in vtu) >> n >> 1"; l.221 "the preceding analysis breaks down when it is not true T>>n".
- The model also assumes identical programs, memory exactly full (M = ns, l.167) and uniform displacement (l.188). The collapse is shown for global FIFO/LRU; under WS "the missing-page probability is independent of n and M" (l.110). l.265 calls it an average-value approximation. The only measurement cited is secondhand and concerns traverse time, not the WS rule (l.251).
- Failing condition 1 does not hold: within T >> n the model gives a step and says so (l.221).
- Failing condition 2 is UNVERIFIABLE without a run, and it is mis-specified. Denning's quantity is the working set W(t,tau) (l.58-61), not private memory, so private bytes above RAM with no throughput loss would not refute him.
- To settle it: with the owner's word, in a container, log each worker's working set, available memory and hard page faults per second while adding one worker at a time.
- Setting: a disk page fault still costs thousands of memory references (my estimate, not measured), so T >> n holds for n of about 3. Workers that sit idle on network calls have small working sets.

## C5
- DAGOR (T\o1-feedback-control\dagor\p2.txt): l.169 is an argument. The measured comparison is queuing time against response time (l.293 "rather than response time"), with no CPU arm. Its 20 ms threshold assumes a 500 ms timeout and 1 s or 2,000-request windows (l.170).
- Breakwater (T\o1-feedback-control\bw\paper.txt): l.136 argues that CPU utilisation cannot tell full use from livelock. Its baselines are DAGOR and SEDA (l.407), both delay or latency driven, so again no CPU arm. The conditions are l.194 and l.142: "long delays due to head-of-line blocking do not indicate a thread is waiting for resources".
- NSDI'15 (T\o1-bottleneck-detection\nsdi15\p.txt) l.389 asks which resource limits Spark jobs. That paper itself finds the CPU bottleneck through utilisation, l.289 "Because we can't use blocked time analysis to understand the importance of CPU use, we instead examine CPU and disk utilization". It does not support C5.
- Counter-evidence (T\r1-protego\plain.txt): l.21 says lock contention makes it "difficult to prevent contention ... using traditional signals such as queueing delay and CPU utilization". l.540: on Lucene, "Breakwater's admission control and AQM are never triggered, leading to congestion collapse". Protego admits load on marginal throughput gain instead. l.810: when the load was CPU-bound, Breakwater beat Protego.
- Narrower: queueing delay works when measured on the queue of the overloaded resource (CPU or network) in servers with dense short requests, a latency target and no head-of-line blocking.
- Failing condition 1: no passage found, because no CPU-driven controller was tested. Failing condition 2 holds for the target setting: a few workers running minute-long units have built-in head-of-line blocking and sparse samples. A shared serial step is Protego's lock case.

## C6 (T\o1-adaptive-sync\p3\raw.txt)
- Traces: l.231, l.103, l.128; l.431 "Even for the highest loads, load control maintains 85-92% of peak performance" (Raytrace, TM-1, TPC-C; 64 threads = 100 % load, l.426).
- Conditions: Niagara II with 64 contexts and Solaris microstate accounting (l.294, l.279); microbenchmark critical section 40-80 ns (l.296); 7 ms update (l.405); "relies on admission control to maintain a reasonable long-term average" (l.219). It acts only on spinning threads: with no contention "most or all sleep slots remain empty" (l.235). The 85 % waste figure is TM-1 only (l.128).
- Against carrying it to blocking work: l.430, TPC-C "pthread_mutex does not become overloaded and performs as well as load control".
- Failing conditions: none holds. l.431 covers Figure 11. The oscillation in l.472 is described for think-time benchmarks, not shown in the paper's runs.
- Setting: worker processes that block on I/O or the network do not spin, so the mechanism has nothing to remove. Only the sensor (runnable minus cores) transfers, and it is untested as an admission signal.

## C7 (T\o1-adaptive-cc\mocc\paper.txt)
- Traces: l.12; l.165 "increments it with probability 2-tempp" (the 2^-temp is flattened in the text), so the counter is logarithmic and that failing condition does not hold; l.543 with Table 3 (16.9 vs 16.9 MTPS); l.713 "setting H to 5-10" (l.376 says 10).
- Overreach: the speed-up belongs to MOCC as a whole: the MQL queue lock (l.77, l.383), the lock-order protocol and the retrospective lock list. The read lock is taken "if temp(t) >= H or t in RLL" (l.197). Only Figure 8 isolates H: H=0 is 24x slower (l.711), and H=20 needs about 10^6 aborts, close to plain OCC (l.712).
- No way back without upkeep: l.377 "The counter must be either reset or decremented"; the experiments reset it now and then. Conditions: 288 cores on 16 sockets, in-memory, microsecond transactions (l.492). No benchmark shows MOCC clearly slower at H=10 (Orthrus comes within 2x, MOCC "consistently faster", l.675).
- Setting: switching takes about 2^H aborts, so H = 5-10 wastes 32-1,000 units, each minutes long. The threshold must be re-derived from the cost of an abort. The logarithmic counter exists to cut cache-line writes among hundreds of cores, a cost that is absent with a few workers.

## C8 (T\o1-adaptive-sync\p1\raw.txt)
- Traces: l.8, l.256-258 (hysteresis), l.761.
- Conditions: steady-level results come from a cycle simulation of Alewife at 33 MHz (l.362) with a 100-cycle critical section (l.403). The flip test ran on a 16-node Alewife with 10- and 100-cycle sections (l.618-619). l.222: "the switching policy will have to be tuned for each machine architecture". Spin-lock application gains over MCS were "limited" (l.544).
- Failing conditions: none found. Figure 10 values are unreadable in the text, and the text says the reactive lock is always better than the worst.
- Setting: 1,000 reflects the ratio of switching cost to critical-section length on that machine. With minute-long units, the flip rate at which switching hurts must be measured again; only the hysteresis principle carries over.
