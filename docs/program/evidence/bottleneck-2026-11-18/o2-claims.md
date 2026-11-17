# o2 claims: what a scheduling decision would rest on (draft, 2026-11-18)

## C1
**Claim:** In Denning's analytic model of n identical programs that just fill main memory, with a page transfer time T much larger than n, admitting one more program does not slow service gradually but collapses it; the stated prevention is to keep the sum of the active programs' working sets at or below main memory (no measurement in the paper).

**Evidence:** Denning, "Thrashing: its causes and prevention", AFIPS Fall Joint Computer Conference 1968, p. 919: "The presence of one additional program has caused a complete collapse of service"; p. 919: "The sharp difference between the two cases at first defies intuition, which might lead us to expect a gradual degradation of service"; p. 921: "there must be space in memory for every active process's working set". Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-memory.md`, section "P2. Denning, Thrashing" (lines 31-32, 36).

**Fails if:** the cost of a missing page (today: swapping, reloading, or restarting a killed job) is not large against the number of jobs (the paper: the argument "breaks down when it is not true T >> n", p. 919), or a job's resident memory can be cut without that cost.

## C2
**Claim:** In Google's Borg (cells of thousands of machines), a machine that runs out of memory or disk space kills tasks from the lowest priority upward until reservations fit, while a machine that runs out of CPU throttles usage and kills nothing at first.

**Evidence:** Verma et al., "Large-scale cluster management at Google with Borg", EuroSys 2015, section 6.2 (text line 648-655 of the `-layout` extraction): "If a machine runs out of non-compressible resources, the Borglet immediately terminates tasks, from lowest to highest priority, until the remaining reservations can be met. If the machine runs out of compressible resources, the Borglet throttles usage (favoring LS tasks) so that short load spikes can be handled without killing any tasks." Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-cluster.md`, section "P1. Verma ... Borg" (line 24).

**Fails if:** memory can be taken back from a job without killing it at acceptable cost (paging that does not thrash), or throttling the processor breaks a deadline or latency target of the throttled job (Heracles, same collect file line 50, found that even at low load a co-runner broke the latency target of all three protected workloads).

## C3
**Claim:** On a quad-core Intel Core2 with a shared front-side bus, four copies of a memory-bound microbenchmark ran 3.9 times slower than one copy (a memory-heavy SPEC job 3.2 times), on a quad-core AMD Opteron with an integrated memory controller 2.7 and 2.5 times, while one memory-bound job beside one compute-bound job showed no significant slowdown.

**Evidence:** Merkel, Stoess, Bellosa, EuroSys 2010, as reported in Merkel's dissertation "Task Activity Vectors" (KIT 2010), chapter 5 (text lines 4129-4132): "The [stream] microbenchmark is slowed down by a factor of 3.9, the SPEC benchmark by a factor of 3.2 when four instances of the respective benchmark are running in parallel"; (lines 4202-4207): "slowed down by a factor of 2.7 compared to a single instance (Core2: factor 3.9) ... a slowdown of factor 2.5 (Core2: factor 3.2)"; (lines 3902-3904): "When one benchmark from the first and one from the second group are combined, neither of the benchmarks is slowed down significantly". The EuroSys paper itself was not opened. Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-memory.md`, section "P7. Merkel" (line 71).

**Fails if:** the jobs are not memory-bound (below the machine's roofline ridge point they are not, o2-memory.md line 40), all running jobs are memory-bound (then no pairing exists; survey, o2-memory.md line 85), or the 12-core, two-chiplet Ryzen 9 7900X divides bandwidth differently from these 2010 four-core chips.

## C4
**Claim:** With d scarce resources and every job's demand on each known in advance, list scheduling on the summed demand is within a factor d + 1 of the shortest schedule, any list scheduler that ranks jobs by their own properties only can be a factor d off, and when a single resource binds the problem is one-dimensional and first-fit decreasing is the method of choice.

**Evidence:** Chekuri and Khanna, SIAM J. Comput. 33(4), 2004, Lemma 2.6, p. 843 (text lines 476-487): treating jobs as "one-dimensional vectors of size equal to the sum of their components ... apply the standard list scheduling algorithm of Graham ... This yields a (d+1)-approximation". Perotin, Sun, Raghavan, ICPP 2021 (arXiv 2106.07059), Theorem 6 (text lines 1138-1139): "Any deterministic list scheduling algorithm with local job priority considerations is no better than d-approximation". Panigrahy, Talwar, Uyeda, Wieder, MSR technical report 2011 (text lines 180-182): "If the placement problem is effectively constrained by a single resource ... the problem is in essence one dimensional and FFD should probably be the algorithm of choice". Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-classical.md`, sections "P1" (line 28), "P6" (line 68), "P2" (line 36).

**Fails if:** demands are not known before a job starts or change while it runs (the bounds are offline; online first fit is d + 7/10 by a restated result, o2-classical.md line 44), demands do not add, or the jobs' demands are strongly negatively correlated across resources while more than one binds (then the one-dimensional rule loses, o2-classical.md line 36, Theorem 1, factor at least (1 - 1/k)d).

## C5
**Claim:** In online, non-preemptive scheduling of jobs that appear only when their predecessors finish and that hold units of reusable resources while they run, every never-idle (greedy) rule can be a factor of order n (the number of jobs) worse than the optimum when long jobs that use little start ahead of short jobs that need all of a resource, and no online rule can be better than (d - 1)/2 for d >= 3 resource types.

**Evidence:** Das and Sun, arXiv 2509.01086 (2025, SPAA 2025 version cited there), text lines 400-407: "every greedy algorithm could be as bad as Omega(n)-competitive, where n is the number of jobs (see Lemma 7.1). The problem arises due to the existence of long and skinny jobs (these jobs use significantly fewer resources but run for a long time) along with short and fat jobs (these jobs use all the resources but run for a very short time)"; Theorem 5.6 (lines 188-190): "Let d >= 3 be the number of resource types. Then, no algorithm (even randomized ones) for online multi-resource scheduling can achieve a competitive ratio better than (d-1)/2" (formulas checked against the arXiv HTML version). Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-classical.md`, section "P5" (line 60).

**Fails if:** jobs can be paused and resumed without loss (the model is non-preemptive), the workload holds no mix of long light jobs and short heavy ones, or the question is typical rather than worst-case behaviour (these are worst-case bounds with no measurement).

## C6
**Claim:** Under Linux CFS bandwidth control a group gets a quota of CPU time per fixed period (for example 100 to 500 ms), is throttled once it has spent the quota and has nothing left to borrow, and its unused quota expires at the end of each period.

**Evidence:** Turner, Rao, Rao, "CPU bandwidth control for CFS", Linux Symposium 2010, pp. 245-254 (text lines 112-116): "the group as a whole will be limited to cpu.cfs_quota_us units of CPU time within the period of cpu.cfs_period_us"; (lines 149-153): "When a CFS group consumes all its runtime and when there are no other CPUs to borrow from, the group is then throttled. At the end of the enforcement interval ... the throttled group becomes eligible to run once again"; (line 341): quota "expire[s] every cfs_period_us seconds". Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md`, section "P6. Turner, Rao, Rao" (lines 62, 66-67).

**Fails if:** the allowance in question carries unspent amount into the next window, is not a hard stop when spent, or its window is not a fixed period (a rolling window or one started by first use behaves differently; the paper covers only the fixed period).

## C7
**Claim:** On a Click software router with a 1 Gbps link, a rule that shares whichever resource is currently the bottleneck gave a bandwidth-bound flow 75 Mbps against 191 Mbps running alone and 160 Mbps under multi-resource fair queueing (DRFQ), because with two resources near saturation the rule oscillates; the same paper shows a flow can double its throughput under that rule by inflating its own use.

**Evidence:** Ghodsi, Sekar, Zaharia, Stoica, "Multi-Resource Fair Queueing for Packet Processing", SIGCOMM 2012, Table 7 (text lines 2085-2090): flow 1 at 191, 75 and 160 Mbps alone, under bottleneck fairness and under DRFQ; "With bottleneck fairness, the oscillations ... cause it to lose packets, back off, and get less than half the share it had running alone"; introduction (line 17): "it is not strategyproof; a flow can manipulate the scheduler ... this can double the manipulative flow's throughput" and "when multiple resources can simultaneously be bottlenecked, this solution can lead to oscillations that substantially lower the total throughput". Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-multiresource.md`, section "P5. Ghodsi ... DRFQ" (lines 60, 62).

**Fails if:** only one resource can be near saturation at a time, the competing jobs share the same dominant resource, or the jobs are not able to change their own reported or actual use.

## C8
**Claim:** Routing queries between a small and a large language model by a learned scorer of their quality gap cost at most 1 % quality for 20 % of queries sent to the small model and at most 4 % for 40 % when the gap was medium (Llama-2 13b against GPT-3.5-turbo), but 10.3 % or more for 40 % when the gap was large (FLAN-t5 800m against Llama-2 13b); and routers trained only on chat preference data routed no better than random on MMLU.

**Evidence:** Ding et al., "Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing", ICLR 2024, Table 1 (text lines 377-381) and text (lines 453-455): "All routers achieve 20% (40%) cost advantage with <= 1% (<= 4%) quality drop"; for the large gap only the transformed router beat random, at 10.3 % drop for 40 % (lines 462-470); quality is BART score, cost advantage is the share of queries sent to the small model. Ong et al., "RouteLLM", ICLR 2025 (text lines 472-476): "all routers perform poorly at the level of the random router when trained only on Arena dataset". Collect file: `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md`, sections "P10. Ding" (lines 94-98) and "P9. Ong" (lines 86-90).

**Fails if:** the work is not of the tested kinds (instruction following, chat, multiple-choice, math; no paper tested code or tool use), quality is judged by a different measure than BART score or the papers' judges, or the saving that matters is tokens rather than the share of calls or money.
