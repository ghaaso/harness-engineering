# o2: which scheduling method fits which scarce resource. After refutation, 2026-11-18

Written by an Opus analyst from the five o2 collect files, then checked by an Opus refuter who saw only
the claims (`o2-claims.md`, `o2-refute.md`). The top session folded the verdicts in. Nothing here was run.

## Summary (answer first)
- Refutation: of the 8 claims a decision would rest on, 4 are confirmed and 4 hold in part and are
  reworded here. None was refuted outright. See "Verdicts".
- Each scarce resource has its own published method. No single method covers all five.
- Processor short: share it and slow jobs down. Never kill a job for processor time.
- Memory short: admit a job only if its measured memory fits, with spare room. Memory is a cliff:
  one job too many and service collapses (Denning's model), so hold a reserve back. Kill the least
  important job first (Borg).
- Memory bandwidth short: run a memory-heavy job beside a processor-heavy one. Four memory-heavy
  copies ran 2.7 to 3.9 times slower; mixed pairs barely slowed. If every job is memory-heavy, only
  running fewer helps.
- The serial check short: keep it busy all the time, put short jobs in front, and never let a long,
  light job block it. A never-idle rule can lose badly when long light jobs go first.
- Token allowance short: charge every token to the task that caused it, give each agent a share, and
  spend before the window resets if the unspent part is lost then (not known for this allowance). No
  paper bounds a weekly or 5-hour window; all of this is borrowed from CPU quotas and network rate
  limits.
- Two resources short at once: score each job on all resources at once (dominant share or dot
  product). Do not switch to "share whatever is the bottleneck now": that rule oscillated and lost
  more than half the throughput in one run (two flows on a throttled software router).
- Cheaper model: saves a lot only when its quality gap to the dear model is small on that work. No
  paper tested coding agents, and all savings are counted in money or calls, not tokens.
- Every gain depends on load: gains grow with contention and vanish once the machine is saturated.
- One proposed correction: x05-0317 reads Graham's 4/3 bound as true of any list; it is the bound
  of the longest-first order.

## The table
Rows are what a scheduler needs to be told; detecting the bottleneck is not covered here. The Mark
column grades the method and its measured effect. The column "Must be true here" is always my own
reasoning (`reasoned`). The claim ids refer to `o2-claims.md`. Collect files are in this folder.

| Scarce | Method the literature supports | Scheduler must measure or know | Measured effect | Source | Must be true for agents on one machine | Mark | Claims |
|---|---|---|---|---|---|---|---|
| Processor alone | Treat it as compressible: proportional shares or throttling, never kill for it. Admit by a job count (Quincy's K), and do not add workers past the throughput peak | Each job's share or weight; throughput at 6 or more worker counts to fit the peak | Borg: +0.3 % cycles per instruction (CPI) per added task, mean CPI 1.58 shared against 1.53 dedicated (about 3 %). Lottery shares hit 2.01:1 for 2:1. USL peaks need a first measurement: one fit predicted 12,000 threads where 2,000 was measured | o2-cluster P1 (l.24, 31); o2-quota P3 (l.40); concurrency-lit-4 items 9, 9b | The processor load comes from builds, tests and model checks, not from waiting on the model. Throttling must not break a deadline (Heracles, o2-cluster l.50). Holds: one machine, preemption by the OS | quoted | C2 |
| Memory capacity alone | Admit by working set: run a job only if its measured resident size fits free memory, with headroom for growth (Denning: hold a reserve (1-f)M back; his other cure is a shorter page transfer time). Set the cap from a high percentile of measured use plus a margin. When short, kill or stop the lowest-priority job; the protected class is never reclaimed | Resident size per job (high percentile over its history), free memory, priority class, cost of a kill and restart | Denning: one job past full memory gives "a complete collapse of service" (analytic; the paper cites one measurement: a 10 times shorter page transfer gave about 10 times the throughput). Autopilot: slack 23-31 % against 46-60 % by hand; OOM kills 0.002-0.013 per task-day against 0.069 for hard manual limits | o2-memory P1-P2 (l.23, 31-32); o2-cluster P1 (l.24, 27-28), P2 (l.39, 42) | A paused agent waiting for the model still holds its memory, so its demand is resident size, not recent processor use. Needs per-agent history, which a machine with few jobs has little of. Our own: a check part hit its own 6,000 MB cap; the clinic's second check slot never opened for lack of 8 GiB (own-data rows 6, 19) | quoted | C1, C2 |
| Memory bandwidth alone | Pair memory-heavy jobs with processor-heavy ones; use the last-level-cache miss rate as the cheap signal. If every job is memory-heavy, only the count of jobs is left | A miss rate or memory traffic per job (hardware counters), or each job's own progress rate for a try-and-measure placement | Best against worst pairing: 20 % better average completion, up to 50 % for one job; within 2 % of optimal. Four memory-bound copies 3.9 times slower (Core2), 2.7 (Opteron); mixed pair no significant slowdown. Placement alone moved Google apps up to 25-40 % | o2-memory P5-P9 (l.56, 64, 71, 78, 85) | A mixed workload (the survey: "completely pointless if all the threads are the same"). Counters readable per process tree on Windows: unknown. All figures are from 4- to 8-core chips of 2007-2011; the 7900X is not measured | quoted | C3 |
| Serial check alone | Keep the check busy: start the next run the instant it is free (no waiting to batch). Short jobs not behind long ones (shortest first, or a separate short queue). Short all-or-nothing turns that commit or retry; never hold other resources while waiting for the check | Expected run time per check job; queue length; whether one check run can test several changes at once | Group commit preprint: flush-when-free within 0.1-1.3 % of the best tuned timer (one preprint, not peer reviewed). Omega: holding resources while deciding locked "nearly all" resources; all-or-nothing scheduling doubled conflicts. Sparrow: late binding 2 % loss. Waiting grows as rho/(1-rho) (summary) | concurrency-lit-4 items 13, 16; o2-cluster P5 (l.69-72), P6 (l.78-81) | The check really is one at a time: today by setting (`--test-concurrency=1`, r57-0103), and side-by-side test files are untested (r57-0403). Our own: 177 min waited against 355 min run over 778 commands (r57-0104) | quoted (group commit: one preprint) | none |
| Token allowance alone | A hard quota per window, throttle when spent; the pool is refilled each period, and slices already handed out can carry a little into the next (CFS). Shares among agents (lottery, deficit round robin for turns of uneven size). Charge every token to the task that caused it, sub-agents and retries included (resource containers). A (sigma, rho) envelope per agent gives a delay bound | Window length and whether it is fixed or rolling; burst size and refill rate; tokens per task, including sub-agents; how cache reads count against the limit | Containers held CPU caps of 30 % and 10 % "almost exactly". Lottery 2:1 gave 2.01:1, but 10:1 gave 13.42:1 over 60 s. No paper measures a weekly or 5-hour window | o2-quota P1-P7 (l.22, 30, 38-40, 46, 56, 62, 66-67, 70) | The window is a fixed period with a hard stop (not known). Spend can be read per agent (not today: own-data section 4). Cache-read counting is unknown (TOKEN-BOTTLENECK l.64). Our own: 14 usage-limit episodes in October, 91 of 104 limit errors from subagents (own-data row 22) | quoted (mechanisms); reasoned (mapping to the window) | C6 |
| Processor + memory | Fairness: dominant resource fairness (DRF) equalises each agent's largest share. Throughput: pick the job whose demand vector best matches free resources (dot product); with one binding resource, sort by size and first fit (the authors' suggestion for bin packing, not a result) | A demand vector per job (cores, GB), stated or estimated; over-estimate when unknown | DRF: slot sharing worse than DRF for every slot count; large jobs up to 66 % faster in a trace simulation. Dot product: up to 10 % fewer bins, near 5 % at 6 dimensions, within a few % of optimal (synthetic). Fairness costs welfare up to a factor m | o2-multiresource P1 (l.25, 28), P7 (l.76); o2-classical P1-P2 (l.28, 36, 38) | Demands are stable within a phase (an agent's change by phase). Jobs differ in which resource they use; otherwise packing gains nothing. One machine: no fragmentation across machines, so DRFH reduces to DRF | quoted | C4 |
| Processor or memory + check | Start short heavy jobs (the check) before long light ones; put long, hard-to-fit work first only with the dependency graph known. A job that waits on the check gives back what does not delay it (altruism). Do not hold processor or memory while queued for the check | Remaining time per job, the dependency graph (which job waits on the check), demand vectors | Never-idle rules can be a factor of order n off (theory). Ignoring dependencies costs a factor of order d (a lemma, and a bound for jobs with precedence). Carbyne: 1.26 times efficiency and 1.59 times lower average job time than DRF; 16 % of jobs slowed, by at most 0.62 times. One renewable resource: 3/2 is a floor for any fast rule | o2-classical P5 (l.60), P8 (l.84); o2-multiresource P3 (l.43), P4 (l.51, 53) | Rough durations known in advance (agent durations are estimates). Our own: a part stopped on memory and ran alone while the rest of the PC idled at 13.9 % processor (own-data row 6) | quoted (bounds, Carbyne); summary (Graphene's gain figures) | C4, C5 |
| Tokens + processor | No paper. Borrowed: treat tokens per minute as one more dimension of a DRF or dot-product rule; keep a reserved class safe (constant bandwidth server) while budgeted agents share the rest | Token rate per agent alongside its processor use | none | o2-quota P7 (l.70); o2-multiresource P1 (l.31) | Tokens and processor rarely bind at once: an agent waiting on the model uses little processor. Holds only for runs that both call the model and build or test | reasoned | none |
| Tokens + memory | No paper. Borrowed: when tokens throttle agents, the paused agents still hold memory, so memory admission must count them; suspend or end the lowest-priority paused agent first | Resident size of paused agents; priority | none | o2-memory P1 (l.28, reasoned there); o2-cluster P1 (l.24) | Agents can be paused and resumed without losing work; their memory can be released while paused (untested) | reasoned | C1, C2 |
| Tokens + check | No paper. Borrowed: a failed check costs new tokens for rework, so a cheaper check before the costly one (a filter, like a cascade's scorer) saves both; batch several changes per check only if a failure can be traced to one change | Check failure rate; tokens per rework; whether the check result can act as a cascade's scorer | none for this pair; cascades in money only (row below) | o2-quota P8 (l.83, reasoned there); concurrency-lit-4 item 13 | A failure in a batched check can be traced to one change; the check result is a cheap enough quality signal | reasoned | none |
| Workers of different speed | Largest job first, to the worker where it would finish earliest (LPT). Online: the slowest worker that keeps load under a guess of the optimum, doubling the guess when it fails | Speed of each worker; job sizes; whether a worker is faster in every resource or only some | Worst cases only: LPT within 2m/(m+1) < 2, now known between 1.54 and 1.577; online 2 if the optimum is known, 5.83 if not. For multi-resource jobs the simple slowest-fit rule fails | o2-classical P9-P11 (l.92, 100, 108) | Speed differs on one scale (uniform). If a worker is fast at one resource and slow at another, the problem is as hard as the general case | quoted (restated for the 1977 original) | none |
| Workers of different cost (cheaper model, same output) | Route before generating (a learned router) or cascade (try cheap, escalate when a scorer or the cheap model's agreement says unsure) | Quality gap between the models on this kind of work; a scorer or labelled sample from this work; cost per call | Hybrid LLM: medium gap, 20 % / 40 % of queries to the small model for at most 1 % / 4 % quality loss; large gap, 10.3 % loss at 40 %. RouteLLM 3.66 times cheaper on MT Bench, 1.41-1.49 times on MMLU and GSM8K; chat-trained routers random on MMLU. FrugalGPT 59-98 % cheaper (dollars). Agreement cascades: 40 % of cost but 20 weak samples per question | o2-quota P8-P12 (l.78-115) | The cheap model's gap on coding work is small and measured; a check (tests, type check) can act as the scorer (untested). Under a token allowance a cascade that samples many times can cost more tokens while saving money | quoted (money, calls); reasoned (tokens) | C8 |
| Several at once, demands known (general) | Balance per resource rather than on a sum; d is the number of scarce resources | Every job's demand on every resource, before it runs | Plain list scheduling is within d + 1 for independent jobs when the number of machines is not the limit (Garey-Graham 1975 as restated by Perotin et al.; the original was not read). Chekuri-Khanna's d + 1 is for another problem: splitting jobs across m machines. For jobs with precedence, a list rule that ignores the graph can be d off. Online first fit d + 0.7 (restated) | o2-classical P1, P3, P6 (l.28, 44, 68) | d is small here (2 to 4), so the worst cases are small constants; nothing says how typical agent workloads behave | quoted (restated for the 1975 and 1976 originals) | C4 |
| When the scarce resource changes | Prefer one rule that weighs all resources at once (DRF re-targets the new dominant resource with no reconfiguration). If methods are switched, use two thresholds and a hold time (Heracles: off above 85 %, on below 80 %, 5 min hold). With one binding resource drop to the simple one-dimensional rule | The current demand vectors; the load on each resource; how near saturation the machine is | DRF shares followed CPU, then memory, unprompted. Bottleneck fairness: 75 Mbps against 160 under DRFQ (one run, two TCP flows, router throttled to 200 Mbps and 20 % CPU). Carbyne gains 1.57 times at 1x load, 1.76-1.91 at 2x, nothing more past 4x (saturated). Graphene: more gain at higher load | o2-multiresource P1 (gate l.13), P4 (l.53), P5 (l.60, 62), P3 (l.45); o2-cluster P3 (l.48) | Two resources can be near saturation together (our rows 6, 11, 19 show it). The heuristics' constants were tuned empirically on their own machines | quoted | C7, C4 |

## Verdicts (the refuter saw the claims alone; details in `o2-refute.md`)
- C1 memory is a cliff (Denning): holds in part. The collapse is as quoted; the paper gives two cures
  (a reserve, and a shorter page transfer) and cites one measurement. Reworded above.
- C2 kill for memory, throttle for processor (Borg): confirmed. It is a policy from production, not
  a measured comparison.
- C3 memory-bandwidth slowdowns (Merkel): confirmed as reported in the dissertation; the conference
  paper was not read.
- C4 worst-case bounds with d resources: holds in part. The d + 1 lemma first cited is for splitting
  jobs across machines; the bound that fits here is a 1975 result read only as restated. The
  lower bound d is for jobs with precedence. First-fit for one resource is a suggestion. Reworded above.
- C5 never-idle rules can be far off (Das and Sun): confirmed. Worst case only, no measurement.
- C6 quota per period (CFS): holds in part. The quotation came from the design the paper sets aside,
  and only the shared pool is reset each period; handed-out slices carry over. Reworded above.
- C7 sharing the current bottleneck oscillates (DRFQ): holds in part. One run, two flows, a throttled
  router; the "doubling" is a worked example, not a measurement. Reworded above.
- C8 cheaper model by a learned router: confirmed. One sentence in the claim's evidence line was
  wrong (two more routers were marginally better than random); the claim itself stands.

## Gaps: what the literature does not say for this case
- No paper schedules under a cumulative allowance that refills in windows of hours or days. The
  closest are CPU quota per period (milliseconds) and the (sigma, rho) token bucket. Nested windows
  (5-hour inside weekly) as two buckets is my reasoning only.
- No paper treats tokens as a resource beside processor and memory, so the three token pairs have no
  source at all.
- No paper studies AI agents sharing one desktop. Every cluster result assumes many machines, many
  short tasks, and demands stated or learned from history; agents give none of these.
- All model-routing savings are in money or share of calls, never tokens, and none tested code or
  tool use.
- Memory-bandwidth contention was measured on 4- to 8-core chips of 2007-2011; nothing on a 12-core
  two-chiplet desktop, and nothing on Windows process trees.
- Memory-capacity evidence is analytic (1968) and Google-scale (Borg, Autopilot); the cost of an
  out-of-memory kill on this PC is unknown.
- Gains of Tetris and Graphene cannot be quoted: their digits are missing in the text layer.
- The 1975-1977 originals (Garey-Graham, Garey-Graham-Johnson-Yao, Gonzalez-Ibarra-Sahni) are
  paywalled; their theorems are quoted as restated by later papers.
- What it costs to switch method (state carried, jobs restarted) is in no paper read.

## What was not tested
- Nothing here was run. No method was tried on this PC.
- Not measured here: memory bandwidth contention between two checks or builds; the suite with test
  files side by side (r57-0403); per-agent token, processor and memory use; whether the 5-hour window
  is fixed or rolling, and how cache reads count against it.
- The refuter traced the eight claims to the paper texts. Beyond them the analyst re-checked seven
  quotations (Borg, Carbyne load, Denning, Merkel, Kovacs LPT, Im et al., CFS). Every other row
  stands as its collector read it.

## Contradiction of an existing record
- x05-0317 says that with no precedence "the list bound improves to 4/3 - 1/(3n)". Two later papers
  give 4/3 - 1/(3m) as the bound of the longest-first order (LPT), and 2 - 1/m for list scheduling
  in general on identical machines without precedence (o2-classical l.92 and l.108). Records
  o2-0331 and o2-0500 propose the correction; the file behind x05-0317 (concurrency-lit-4 l.65)
  states it inside the longest-chain rule, which with no precedence is LPT, so it may be the
  record's wording only.
