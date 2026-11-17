# o1 claims (2026-11-18)
Text root T = C:\Users\User\AppData\Local\Temp\claude\29140a92c6ee6732\f57c0bf8-9eae-432f-bfec-3dbca7e4417a\scratchpad

## C1
- Claim: when every worker must pass a serial step once for its share of a fixed task, the best worker count is sqrt(T_NoCS / T_CS), capped at the core count. Estimated at run time, this count came within 1 % of the best fixed count on 4 programs.
- Evidence: Suleman, Qureshi, Patt, "Feedback-driven threading", ASPLOS 2008. T\o1-adaptive-sync\p7\raw.txt
  - l.30: "When each thread is required to execute the critical section, the total time spent in the critical section increases linearly with the number of threads."
  - l.210: "(PCS) increases only as the square-root of the ratio of time outside the critical section to the time inside the critical section."
  - l.256: "The number of threads is chosen as the minimum of PCS and the number of cores available on the chip."
  - l.260: "For all cases, the execution time with SAT is within 1% of the minimum execution time."
- Failing condition: any of these false or misread:
  - Equation 1 (l.195-205) does not make the serial time grow with the thread count.
  - One of the four programs in Figure 8 or l.260-262 lands more than 1 % from the minimum.

## C2
- Claim: when two limits apply, running at the minimum of the per-limit worker counts and the core count gives the least execution time in the paper's model. Over 12 programs, this cut average time by 17 % against running one thread per core (32 threads); the paper does not compare it with the best fixed count.
- Evidence: Suleman, Qureshi, Patt, ASPLOS 2008. T\o1-adaptive-sync\p7\raw.txt
  - l.626: "In such cases, we choose the minimum of the two values. It can be proved that choosing the minimum of the two values minimizes overall execution time."
  - l.631: "normalized to the case of conventional threading which spawns as many threads as available cores (32 in our study)"
  - l.634: "On average, (SAT+BAT) reduces the execution time by 17% and power by 59%."
- Failing condition: any of these:
  - The proof in the Appendix (l.693-712) fails for one of its two cases.
  - In Figure 15 the oracle beats SAT+BAT clearly on a two-limit program.
  - The 17 % is measured against something other than 32 threads.

## C3
- Claim: for throughput, the number of jobs that must run at once is set mainly by how many resources the work keeps busy, not by whether it is processor-, I/O- or lock-bound; under 20 sufficed in every setup tested.
- Evidence: Schroeder, Harchol-Balter, Wierman, Iyengar, Nahum, ICDE 2006. T\o1-load-control\p5\paper.txt
  - l.278: "the MPL required is largely proportional to the number of resources that are utilized in a system without an MPL"
  - l.353: "is hardly affected by whether the workload is I/O bound, CPU bound, or lock bound. This is a surprising finding, and shows that the number of resources that must be utilized to keep throughput high is more important than the type of resources."
  - l.356: "In all experiments an MPL of less than 20 suffices to achieve near optimal throughput and mean response time"
- Failing condition: either of these:
  - A setup of the paper's 17 needs a level of 20 or more for near-optimal throughput.
  - Two setups with the same number of busy resources but different bottleneck types need clearly different levels.

## C4
- Claim: a process should run only if its working set fits in main memory; one program too many can collapse service. This is shown by a model; no gain was measured.
- Evidence: Denning, "Thrashing: its causes and prevention", AFIPS FJCC 1968. T\o1-load-control\p2\paper.txt
  - l.73: "a process shall be active if and only if its working set is fully contained in main memory"
  - l.220: "The presence of one additional program has caused a complete collapse of service."
- Failing condition: either of these:
  - The paper's model (l.166-220) shows throughput falling gradually, not in a step, past the point where the working sets fill memory.
  - On this PC, a run whose units' private memory exceeds available memory without a fall in throughput.

## C5
- Claim: time spent waiting in a queue, not processor utilisation, is the signal that a resource is overloaded.
- Evidence:
  - Zhou et al., DAGOR, SoCC 2018, T\o1-feedback-control\dagor\p2.txt l.169: "high load does not necessarily infer overload. As long as the server can handle requests in a timely manner (e.g., as re ected by the low queuing time), it is not considered to be overloaded, even if its CPU utilization stays high."
  - Cho et al., Breakwater, OSDI 2020, T\o1-feedback-control\bw\paper.txt l.137: "when RPC service times have high dispersion, queue length is a poor indicator of request latency. A more reliable signal is queuing delay"
  - Ousterhout et al., NSDI 2015, T\o1-bottleneck-detection\nsdi15\p.txt l.389: "CPU utilization is typically close to 100% whereas median disk utilization is at most 25%"
- Failing condition: either of these:
  - A passage in these papers where a controller driven by processor utilisation does as well as one driven by queueing delay.
  - Breakwater's own condition is not met by the measurement used (l.194: "a low-latency network stack", "no head-of-line-blocking").

## C6
- Claim: one sensor, runnable threads in excess of hardware contexts, used to hold back waiting threads, kept 85 % of peak throughput at 200 % load. Without it, spinning wasted up to 85 % of processor time once utilisation passed 100 %.
- Evidence: Johnson, Stoica, Ailamaki, Mowry, ASPLOS 2010. T\o1-adaptive-sync\p3\raw.txt
  - l.231: "The controller uses OS process accounting facilities to monitor a single "sensor" value: overload, defined as the number of excess runnable threads in the system (negative in underload situations)."
  - l.103: "we achieve peak performance for lightly loaded machines, while retaining 85% of that peak even with 200% load (two runnable threads per hardware context)"
  - l.128: "as soon as utilization passes 100% priority inversions quickly dominate, wasting up to 85% of CPU time."
- Failing condition: any of these:
  - Figure 11 (not read) shows less than 85 % of peak at 200 % load.
  - The 85 % comes from a benchmark other than the ones load control was applied to.
  - The controller oscillates in the paper's own runs (l.472 names the case: a spike short against the update interval).

## C7
- Claim: a page switches from optimistic reads to read locks once its abort counter reaches a threshold. This made the system 8 and 23 times faster than pure optimistic and pure locking at high conflict, and identical to optimistic on TPC-C. The counter grows logarithmically: a threshold H stands for about 2^H aborts.
- Evidence: Wang and Kimura, "Mostly-optimistic concurrency control", PVLDB 10, 2016. T\o1-adaptive-cc\mocc\paper.txt (the times sign shows as an odd character)
  - l.12: "MOCC performs 8x and 23x faster than OCC and pessimistic locking, respectively"
  - l.165: "Each page p maintains a temperature tempp, which probabilistically implies that there were about 2tempp aborts in the page."
  - l.543: "MOCC behaves exactly the same as OCC because the temperature statistics of almost all data pages are below the threshold"
  - l.713: "we recommend setting H to 5-10"
- Failing condition: either of these:
  - The temperature is a linear count of aborts; check the increment rule after l.165.
  - A benchmark in the paper where MOCC is clearly slower than the best fixed protocol at the recommended threshold.

## C8
- Claim: switching method on a contention threshold, with a run of quiet acquisitions before switching back, performs close to the best fixed method at every contention level. It degrades once contention flips about every 1,000 critical sections, and it still beats the worst fixed method.
- Evidence: Lim and Agarwal, "Reactive synchronization algorithms for multiprocessors", ASPLOS 1994. T\o1-adaptive-sync\p1\raw.txt
  - l.8: "reactive algorithms perform close to the best static choice of protocols at all levels of contention. Furthermore, with mixed levels of contention, reactive algorithms outperform passive algorithms with fixed protocols, provided that contention levels do not change too frequently."
  - l.254-258: "if a process finds the queue to be empty for some number of consecutive lock acquisitions. This provides some hysteresis to lessen the likelihood of oscillating and thrashing between protocols." (hyphenated across lines in the text)
  - l.761: "the performance of the reactive spin lock begins to deteriorate when forced to change protocols as frequently as every 1000 critical sections. However, the reactive lock is still always better than the worst static choice of protocols even under such extreme circumstances."
- Failing condition: either of these:
  - A measurement in the paper where the reactive lock is worse than the worst fixed protocol.
  - A measurement where it falls far behind the best fixed protocol at a steady contention level.
