# o1: how a system finds its bottleneck and switches method (analysis, 2026-11-18)

Inputs: the five o1 collector files in this folder (32 papers the collectors read in full; every quote a row rests on was
re-checked by grep in the paper text on 2026-11-18), library records r57-0013, -0015, -0103, -0104, -0111, -0116, -0123,
-0301, -0307, and `harness-method-status-2026-11-18/README.md` sections 7 and 7a. Tokens are out of scope here.
Scheduling under several scarce resources is o2's part and is not done here.

## Summary
1. The literature treats finding the bottleneck and choosing the method as one calculation. Work out how many workers each resource can carry and run the smallest of those numbers. The resource that gives the smallest number is the bottleneck.
2. Suleman 2008 argues the minimum is best for two limits (no program it tested had both; refutation C2); each one-limit estimate came within 1 % (serial step) and 3 % (bandwidth) of the best fixed count, in a simulator. Denning 1968 calls the same idea "balance".
3. Each resource has a signal borrowed from the papers:
   - processor: work ready to run above the 24 threads (Johnson 2010)
   - memory: the workers' memory against free memory (Denning)
   - the check: the share of time spent in it (Suleman), or the wait at its queue (Breakwater, DAGOR, CoDel)
   - shared files: conflicts per file (MOCC), or the conflict ratio (Moenkeberg-Weikum)
   - idle: every resource's count is above the current one, and nothing waits.
4. High processor use is not the signal. Time spent waiting is (DAGOR, Breakwater, Ousterhout 2015). But queue delay misses lock contention (Protego, NSDI 2023): a shared serial step needs its own signal.
5. Change the number of workers at once; that is cheap. Change the method (one owner of a file instead of own copies) rarely: only on a lasting count, with a margin before switching back, and only between units of work (Lim, Marathe, CormCC).
6. Act at the gate: hold new work back. Never stop running work, except at the memory floor. An agent's work is minutes long and costs too much to throw away.
7. Controllers that search on throughput (Heiss-Wagner, Schroeder, Cicada) need about 100 finished units per step. At agent speed that is hours, so they can serve only as a slow outer check.
8. The check: Suleman's square root sets the number of workers only if each worker's piece passes the check once. If the check runs once per change, it caps output at its capacity per check time, and more workers only make the queue longer.
9. The papers' numbers were tuned on their own systems (MOCC's 10, which means about 1,000 aborts; 1.3; 20 ms; 5 ms). The shape of each rule carries over; the numbers must be computed here (r57-0002).
10. Not found: a paper that switches method on a live machine by which resource binds, with a measured gain, or a serial step shared by separate programs. Each result is one form on one benchmark family; nothing was tested on this PC.

## Table: bottleneck to method
Marks: QUOTED = method and effect checked word for word in the paper text (collector file and line given; text lines
relative to the scratch folder `...\scratchpad\<collector folder>\`). The column "what must be true" is REASONED in every
row except where it quotes the paper. Windows counters named in column 2 come from general knowledge, not from a source
read here (REASONED); "already logged" means `research-tree/tools/recorder.ps1` (every 2 s) or the lane log.

| bottleneck signal | how it is measured | the method the literature supports | measured effect | source | what must be true for it to apply to agents on one machine | mark |
|---|---|---|---|---|---|---|
| Any: the resource with the largest demand per finished unit (utilisation law U = X D) | busy time per resource and completions over an interval; here CPU % and free memory already logged every 2 s, unit times in the lane log | Bound: throughput at most 1/D_max; past N* workers (where the light-load and heavy-load bounds meet) more only queue; improve only the bottleneck | analytic: "the futility of improving any center but the bottleneck" at heavy load | QSP ch. 3, 5; o1-bottleneck-detection.md l.24-27; qsp5 l.102, 134, 504; qsp3 l.81 | QSP's "single assumption": a unit's demand does not depend on how many others run. False under paging, lock convoys, or a suite that slows when the PC is busy, so this is a first filter | QUOTED |
| Any: time spent waiting, not busy share | wait where work queues: lane `waited_ms` per start (logged); not CPU % | Make queueing delay the overload signal | Ousterhout: CPU near 100 %, disk at most 25 % busy; removing disk waits gains at most 19 % (median). DAGOR: high CPU "does not necessarily infer overload" | Ousterhout 2015, DAGOR 2018, Breakwater 2020; o1-bottleneck-detection.md l.34; o1-feedback-control.md l.47, 63; nsdi15 l.29, 389; dagor l.169; bw l.137 | the wait is measured where a unit waits (lane, merge, a file claim). Windows has no PSI-style stall counter among the sources read | QUOTED |
| Processor: work ready to run above hardware threads ("overload") | Johnson: OS accounting, 1-10 ms. Here: `\System\Processor Queue Length` (not logged yet) and CPU % (logged, 2 s); judge the peak over the last unit-length window, not the mean (USE l.161) | Keep the method. Hold new work while ready work exceeds 24 threads (load control kept apart from contention management) | kept 85 % of peak at 200 % load; plain spinning past 100 % wastes up to 85 % of CPU | Johnson 2010; o1-adaptive-sync.md l.27-33; p3 l.72, 103, 128, 231 | the sample is faster than load changes (l.472: short spikes cause oscillation); 2 s against lane commands of about 27 s mean (r57-0104: 355 min / 778) holds. Running agent commands cannot be thrown away like spinners, so only the gate half carries | QUOTED |
| Processor or any: how many resources the work keeps busy | busy threads per unit from runs (suite 3.1 average, 12 peak of 24: r57-0103; one run) | Set the level from the number of busy resources, start low, raise while throughput rises | MPL under 20 near-optimal in all 17 setups; one CPU peaks at about 5, two at 7-10; type of bottleneck (CPU, I/O, lock) hardly matters | Schroeder 2006; o1-load-control.md l.61, 63; p5 l.233, 278, 353, 356 | per-unit thread use stable within a class of unit; one measured run is not enough (r57-0605) | QUOTED |
| Memory capacity: the active workers' memory against free memory | `Available MBytes` (logged, 2 s) and each unit's private-memory peak (suite 332 MB private, 494 MB working set: r57-0103; model parts up to 5,680 MB: own-data.md row 6) | Denning: a worker is active only if its working set fits; admit the next unit that keeps the balance, memory first; a hard cap | analytic only, no measured gain: "one additional program has caused a complete collapse of service" | Denning 1968a, b; o1-load-control.md l.20, 24, 30-31; p2 l.73, 220; p1 l.642, 679 | a unit's memory is known before it starts (by class, from past units). Windows "working set" is resident memory, not Denning's recently-used set, and overstates (r57-0103) | QUOTED |
| Memory bandwidth: bus busy share with one worker (BU1) | a hardware counter of bus-busy cycles; none read on this PC | Workers P_BW = 100 / BU1, rounded up, minimum with cores | within 3 % of the best count on 4 programs (32-core simulator); 7 picked where 8 was best | Suleman 2008; o1-adaptive-sync.md l.38-42; p7 l.432, 463, 465, 537 | a readable counter on this Ryzen (not checked); bus use grows linearly with workers; no sign that agents' commands are bandwidth-bound | QUOTED |
| The check, scaled by workers: share of time inside the serial step, T_CS / T_NoCS | one worker runs first units alone until the ratio holds within 5 % three times (at most 1 % of units) | P_CS = sqrt(T_NoCS / T_CS), rounded to nearest, minimum with cores | within 1 % of the best thread count on 4 programs; up to 66 % less time | Suleman 2008; o1-adaptive-sync.md l.38-40; p7 l.18, 30, 210, 251, 256, 260 | "When each thread is required to execute the critical section" (l.30): the serial work must grow with the worker count, as when one task is split into P pieces that each pass one check. Units alike | QUOTED |
| The check, scaled by changes: a capacity-c station each change passes once | T_check measured (596 s: r57-0103); lane capacity (2 now: o1-0101); T_work per change not measured | QSP bound: at most c changes per T_check; past N* = c (T_work + T_check) / T_check workers only queue; speeding anything else is futile | none measured here | row 1 applied to the lane | checks are fixed by changes, not by workers; the suite's time does not grow with load | REASONED |
| The check: standing queue against a burst | the minimum wait over a window about one unit long (CoDel), or the oldest waiter's age (Breakwater); from lane `waited_ms` | AIMD on admitted work: add one while the wait is under target, cut by a fraction above it | Breakwater: about 5 % overhead at capacity, 5.7 % more goodput than SEDA at twice capacity; DAGOR: about 50 % higher success under chained overload; equal on simple overload | Breakwater, DAGOR, CoDel RFC 8289, Jacobson 1988; o1-feedback-control.md l.39, 49-50, 59-60, 77-79; bw l.155, 520, 568; dagor l.170, 469; rfc l.381-386 | enough waits per window: DAGOR refreshes every second or 2,000 requests, while the lane saw 778 starts in two days. Targets (20 ms, 5 ms) were tuned for their systems | QUOTED |
| The check saturated: more waiters than keep it busy | queue length at the step | Keep just enough waiting to saturate it and park the rest (Dice); one queue per resource holding its capacity plus one (Monotasks) | Dice: avoids collapse, no harm below saturation (no clean number); Monotasks: 30 % better than hand-set resource use | Dice 2017, Monotasks 2017; o1-adaptive-sync.md l.69-70; o1-bottleneck-detection.md l.43-44; p8 l.497, 515; mono l.59, 199 | Dice's gain comes from a hot cache, which agents lack; Monotasks needs work cut into single-resource pieces (a heavy command is one; an agent session is not) | QUOTED |
| Shared files: aborts (rework) per object | merge conflicts or rejected merges per file or function (not logged) | MOCC: optimistic below a per-object count, a lock above it; reset the count periodically | 8 and 23 times faster than optimistic and locking at high conflict; exactly optimistic on TPC-C | Wang-Kimura 2016; o1-adaptive-cc.md l.16-22; mocc l.12, 161, 165, 376-377, 543, 713 | the count is logarithmic: H = 10 means about 2^10 aborts, and agents' conflicts come in ones. Keep the shape, compute the count from the cost of one conflict against the cost of a lock | QUOTED |
| Shared files: conflict ratio (work held by all, over work held by unblocked) | from a claims table at each claim and release (no sampling); not built | Hold new units at the gate above the threshold; admit again at each finish | 1.5 times better mean and 1.8 times better 90th percentile than the best fixed level; threshold 1.3 "essentially workload-independent" in their simulations (Thomasian: 1.25-1.43, mixes 1.26-1.60) | Moenkeberg-Weikum 1992, Thomasian 1998; o1-load-control.md l.48-53, 71; p4 l.164, 428; p6 l.666, 724 | agents block on claims, as in two-phase locking; claimed files or functions stand for locks held. One bank trace, page locks only; Thomasian: "no guarantee" the range holds | QUOTED |
| Shared files: share of writes and early releases | rolling share over recent units | Lazy if writes under 25 % and early releases over 50 %, else eager; keep adaptation only where one method is far worse | as good as the best fixed system in all scenarios tested; 5 times on one benchmark; elsewhere "neither dramatically outperforms" | Marathe 2005; o1-adaptive-sync.md l.59-63; p6 l.102, 107-108, 227 | recent units predict the next ones (l.108) | QUOTED |
| Shared files: cost of waiting against cost of the alternative (competitive spin-then-block) | accumulated rework against the price of serialising | switch once the cost already paid equals the alternative's cost | adaptive beat non-adaptive among seven strategies (abstract only) | Karlin 1991, unread scan; o1-adaptive-sync.md l.82 | not read; cannot be used for a decision (library rule 5) | SUMMARY |
| Two at once: each limit's width worked out separately | as in the rows above | Run at min(P_CS, P_BW, cores); the paper argues the minimum is best for two limits; no tested program had both (C2) | 17 % less time on average over 12 programs, against "as many threads as available cores", not against the best fixed count; programs limited by neither keep all 32 threads | Suleman 2008; o1-adaptive-sync.md l.39, 44; p7 l.626, 631, 634, 693 | each width comes from a one-limit model; the proof covers serial step plus bandwidth only; memory is a cliff (Denning), so it enters as a hard cap | QUOTED |
| Two at once: time per resource in a stage | time each unit spends on each resource | Stage time is the largest per-resource time; one scheduler per resource | estimates within 28 %; 30 % gain (as above) | Monotasks 2017; o1-bottleneck-detection.md l.43-47; mono l.57, 251, 369-370 | workloads were chosen with no dominant resource (l.251); work cut by resource | QUOTED |
| Two at once: two targets held together | CPU and memory, two control knobs | MIMO PI with LQR gains; a pair of targets can be jointly unreachable | qualitative: "less oscillatory", still tracks; no number read | Diao 2002; o1-feedback-control.md l.69-72; diao l.179, 296, 382 | so give each resource a cap (a maximum), not a target to hold | QUOTED |
| Two at once: the bottleneck moves with the mix of work | demand per class of unit per station | A linear program lists which stations can saturate, alone or together, for each mix | analytic; no live gain | Anselmi 2010; o1-bottleneck-detection.md l.73-77; anselmi l.127 | classes with measured demands; the result holds asymptotically for many units in the system, and agents are few | QUOTED |
| None (idle capacity): every width above the current count, minimum wait zero | as above | Additive increase: admit one more per window (Jacobson, Breakwater, DAGOR); SEDA adds a thread when the queue passes a threshold and removes one idle for a set period | FDT keeps 32 threads for programs limited by neither, losing nothing; after about 20 s of damped oscillation TCP senders ran at wire speed | Suleman 2008, Jacobson 1988, SEDA 2001; o1-adaptive-sync.md l.44; o1-feedback-control.md l.19, 39-40; p7 l.634; jac l.681-683, 851; seda l.312 | more ready work exists to admit (r57-0006: start it) | QUOTED |
| None, black box: throughput against the level | finished units per window: "rather hundreds of departures than some tens" (Heiss-Wagner, OCR), about 100 transactions (Schroeder) | Climb or fit a parabola on the level; start from a queueing model, then small steps | Schroeder: under 10 steps to converge; Heiss-Wagner's parabola "always avoided thrashing" (gain in a figure, not read); Cicada near-optimal | Heiss-Wagner 1991, Schroeder 2006, Cicada 2017; o1-load-control.md l.39-41, 59-61; o1-adaptive-cc.md l.78-81; p3 l.130, 330; p5 l.505-507; cic l.267, 850 | one peak (p3 l.56, cic l.850); about 100 finished units per step: about 45 min at 27 s per lane command, many hours for agent pieces. Too slow as the main rule | QUOTED |
| Switch the method: a contention count, with a run-length margin | count inside the lock; N quiet acquisitions in a row before switching back | Threshold up, N quiet down; only the holder of the valid mode may switch | close to the best static choice at all levels; "modest" gains for locks; worse once contention flips about every 1,000 critical sections, still better than the worst static choice | Lim 1994; o1-adaptive-sync.md l.18-23; p1 l.8, 222, 246, 254-258, 761 | the regime lasts long against the switch's cost. Changing a width is a file write; changing a file's method costs a re-plan. Thresholds are tuned per machine (l.222) | QUOTED |
| Cost of switching the method | throughput during the change | Run a protocol compatible with both during the change (CormCC); switch at unit boundaries | a mediated switch keeps at least 93 % of OCC or 2PL throughput and drops at most about 20 % (PartCC to OCC, long transactions); stop-all "suffers due to waiting" for long transactions and takes no new ones during the switch; Polyjuice switches in 3 s with no loss, but its training is too slow for changes within minutes | CormCC 2018, Polyjuice 2021; o1-adaptive-cc.md l.29, 39-41; corm l.518, 563-564; poly l.698, 716 | agents' units are long, so a stop-and-switch costs much; switch only between units | QUOTED |

Rows: 22. QUOTED 20, SUMMARY 1, REASONED 1.

## Derived decision rule (HYPOTHESIS, untested; every step names its source)
1. **Measure each class of unit first.** Classes: agent piece, suite run, model part, build. Keep from finished units: busy threads (mean, peak), private-memory peak, time in the check, time outside it. A new class runs alone until its ratios hold within 5 % for three units (Suleman's training; r57-0307 also asks for a first measurement).
2. **Work out each resource's width at every unit start and finish:**
   - memory: the units whose private peaks fit in `Available MBytes` above the floor (Denning). The floor today is the 2,500 MB of recorder.ps1's governor; not optimised.
   - processor: admit while the running units' expected busy threads plus the new unit's are at most 24, and the peak queue length over the last unit-length window shows no excess (Johnson).
   - the check: if one task is split into pieces that each pass one check, round(sqrt(T_out / T_check)) (Suleman); if the check runs once per change, c (T_out + T_check) / T_check (QSP).
   - shared files: a file stays optimistic (own copies, merged later) until its conflict count passes a threshold computed from the cost here (MOCC). While the conflict ratio is above its threshold, units that need claimed files wait at the gate (Moenkeberg-Weikum).
3. **Width = min(memory, processor, check, files, units ready)** (Suleman eq. 7). The resource that gives the minimum is the bottleneck. Two resources within one unit of each other are "two at once". If "units ready" is the minimum, capacity is idle.
4. **Act only at the gate.** Start a unit while the running count is below the width. Stop running work only at the memory floor, because the memory limit is a cliff, not a slope (Denning). Round the bandwidth width up and the serial width to the nearest whole number (Suleman l.256, 463).
5. **Speed and margin.** A width follows every event, because changing it is cheap. A file changes method only above its count, changes back only after N quiet units on that file (Lim), and only between units (CormCC). File counts reset after each merge or on a timer (MOCC).
6. **Cross-check with the wait.** Suppose the minimum lane wait over a window of one unit length stays above zero. Then a standing queue exists at the check, and the check is the bottleneck whatever the processor shows (CoDel, DAGOR).
7. **Throughput search only as an outer check**, after about 100 finished units (Schroeder, Heiss-Wagner).

## What must be true for a result to carry over
- **A signal that reads state carries over:** free memory, the ready-work count, queue wait, claims held. Each is read at once and needs no completed units. **A signal that needs many completions does not carry over** (throughput gradients, averages over 2,000 requests), because agents finish a few units per hour. REASONED from p3 l.130, p5 l.506 and dagor l.170.
- **Only admission carries over, not pre-emption.** The papers shed waiters that cost nothing to stop: spinning threads (Johnson), parked threads (Dice), aborted short transactions (Moenkeberg-Weikum). An agent stopped mid-unit loses minutes of work. REASONED.
- **The papers' numbers do not carry over.** The thresholds come from microsecond units and thousands of events: MOCC 2^10 aborts, DAGOR 20 ms, CoDel 5 ms, Lim's 1,000 critical sections. Keep the shape of each rule and compute the number from this PC's measurements. REASONED, as r57-0002 requires.
- **Few workers make the steps coarse.** With 3 to 16 workers, one worker is 6 to 33 % of the level. Schroeder's levels (5 to 20) and Suleman's counts (4 to 32) are in that range. Johnson's and Dice's statistical shedding assumes many threads. REASONED.
- **The serial step here is external, not inside one program.** None of the papers studies such a step: Suleman's critical section lives inside one program, and Moenkeberg-Weikum's locks live inside one database. A lane of capacity c is modelled as a QSP station; that much is textbook, and its fit to the lane is untested.
- **Demand must not depend on load** (QSP's single assumption). It does for memory near the floor and plausibly for the suite on a busy PC. Memory is therefore a hard cap, not a utilisation target.

## Not found
- No paper finds which of several resources binds and switches method on a live, multiprogrammed machine with a measured gain. Detection is offline (QSP, Anselmi), done by redesign (Monotasks), or uses one signal (all the controllers).
- No paper has a serial step shared by separate programs, or work units minutes long with a handful of workers.
- No measured gain for any memory-capacity controller. Denning's papers are analytic; Moenkeberg-Weikum leave memory to future work.
- No measured oscillation near a threshold in the adaptive concurrency-control papers. Switch cost is measured only in CormCC, Polyjuice and Lim.
- No Windows counterpart of PSI stall time in any source read.

## Not opened (from the collectors; the reasons are in their files)
Karlin 1991 and Anderson 1990: scans, no text layer. Yoo-Lee 2008. Carey half-and-half 1990: scan. Denning 1980: scan.
Denning-Buzen 1978 (ACM). Balbo-Serazzi 1997 and Casale-Serazzi 2004. Chiu-Jain 1989: scan. Nichols-Jacobson CACM 2012:
replaced by RFC 8289. Diao NOMS 2002 and Parekh 2002. The Hellerstein book. Plor 2022. Tang CIDR 2017. Spear SPAA 2010.
The .NET thread-pool paper. Tay 1985.
The curves that appear only in figures were not read, in every paper.

## Not tested
Nothing in this file was run on this PC. These have never been measured here:
- the processor queue length
- per-unit private memory over time
- conflict counts between agents
- T_work per piece or change
- whether the suite slows on a loaded PC
- the lane's queue wait under capacity 2.

The table rests on one suite run (r57-0103) and the 25 episodes of r57-0123.

## Refutation
One round, one Opus refuter in a fresh context, given `o1-claims.md` and the paper texts only. Full verdicts and
quoted counter-evidence: `o1-refute.md`. None of the eight claims was confirmed in full; none was refuted outright.

| Claim | Verdict | What narrows it |
|---|---|---|
| C1 Suleman's serial-step width | PARTIALLY | 32-core simulator; each worker merges its share once; the formula overshot the best count in 2 of 4 programs |
| C2 run at the minimum of the widths | PARTIALLY | No tested program had both limits. The paper does compare with an offline oracle (section 6.3), and they were similar |
| C3 Schroeder: level set by busy resources | PARTIALLY | Database transactions on 1-2 CPUs and 1-4 disks; two setups needed about 20; heavy locking lowered the level |
| C4 Denning: memory collapse | PARTIALLY | Derived only when page transfer time far exceeds the program count, with global paging; private memory is not a working set |
| C5 wait time over processor use | PARTIALLY | Never tested against a processor-driven controller. Protego (NSDI 2023, read in full) shows queue delay misses lock contention |
| C6 Johnson's load control | PARTIALLY | Spin locks, sub-microsecond critical sections, one 64-context server; where threads block (TPC-C), a plain mutex did as well |
| C7 MOCC's per-record threshold | PARTIALLY | The 8x/23x belong to all of MOCC, not the threshold; the counter must be reset to switch back; H = 5-10 means about 30-1,000 aborts |
| C8 Lim's switching cost | PARTIALLY | 10-100-cycle critical sections on Alewife with per-machine thresholds; "about 1,000 critical sections" does not carry over |

What changes in this report (applied by the coordinator):
- Summary point 2 and the "two at once" row said Suleman "proves" the minimum is best for two limits. It argues it,
  and no program it tested had both limits (C2). Both now say so.
- Summary point 4 now carries the Protego limit: with a shared lock or serial step, neither queue delay nor processor
  use shows the contention (Protego l.21, QUOTED: "difficult to prevent contention through overload control using
  traditional signals such as queueing delay and CPU utilization."). Protego admits work by marginal throughput gain
  instead. A shared serial step therefore needs its own signal: its own queue and its own share of time.
- Every row stays as written: its number holds under the paper's own conditions, and the column "what must be true"
  already names them. The rows rest on one form per benchmark family; nothing was run on this PC.
- Open: the second test proposed for C4 (does the workers' private memory track their working set on this PC) needs a
  run here, so it waits for the owner's word on an experiment.
