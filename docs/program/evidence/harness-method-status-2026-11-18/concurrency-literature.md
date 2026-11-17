# Concurrency literature for many agents editing the same files (collected 2026-11-18)

Collected with a web search tool and a web fetch tool, with general terms only (rule 4). No verdict, no recommendation.
The fetch tool returns a short summary written by a small model, not the page. Search results are also summaries.
Every figure is marked "from a summary" unless the abstract itself was returned with the number in it ("quoted" = the abstract text as returned).
PDF fetches of Agrawal 1987, Apel 2011 and the 2017 MSR paper returned only compressed bytes, so none of their numbers were read.
Limits: no full paper text was read for any source. Topics 1, 4 and 7 have almost no measured numbers.

## 1. Lock granularity and intention locks
Scheme: locks form a hierarchy (database, area, file, record). Before a node is locked, its ancestors are locked in intention mode (IS, IX, SIX).
Wins/loses: fine locks give more concurrency but cost more to manage; coarse locks are cheap but limit sharing. A transaction touching many records can take one coarse lock.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Granularity trades concurrency against overhead; intention modes IS, IX, SIX; ancestor rule | none | Gray, Lorie, Putzolu, Traiger, 1975/76, Granularity of Locks in a Large Shared Data Base | https://www.vldb.org/dblp/db/conf/vldb/GrayLPT75.html | from a summary |
| Original text copy | none | same | https://www.cs.purdue.edu/homes/bb/cs542-20Spr/readings/cc/granularity-locks.pdf | not read (listed only) |

## 2. Optimistic concurrency control against locking
Scheme: transactions run without locks, validate at commit, and restart on conflict (Kung and Robinson 1981). Locking blocks instead.
Wins/loses: Agrawal, Carey and Livny found the winner depends on resources. Optimistic wins with ample (near infinite) resources; blocking wins when resources are scarce or at medium to high utilization. Earlier studies disagreed because of modelling choices.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Optimistic methods rely on backup and are meant for low-conflict uses | none | Kung, Robinson, 1981, On Optimistic Methods for Concurrency Control | https://typeset.io/papers/on-optimistic-methods-for-concurrency-control-13kptzhred | from a summary |
| Infinite resources: optimistic beats blocking; scarce resources: blocking beats optimistic | no figures given in the summaries | Agrawal, Carey, Livny, 1987, Concurrency Control Performance Modeling: Alternatives and Implications | https://blog.acolyer.org/2016/01/07/concurrency-control-performance/ | from a summary |
| Blocking had the lowest response-time variance; "fake restart" assumption inflates restart-based throughput in earlier work | none | same | same | from a summary |

## 3. Multi-version schemes and snapshot isolation
Scheme: each transaction reads from a snapshot taken at its start. At commit, if another transaction that committed in between wrote the same item, it aborts (first committer wins).
Wins/loses: readers and writers do not block each other. It allows write skew (disjoint writes that together break an invariant), so it is not serializable.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| SI is not serializable; allows write skew; first-committer-wins | none | Berenson, Bernstein, Gray et al., 1995, A Critique of ANSI SQL Isolation Levels | https://arxiv.org/abs/cs/0701157 | from a summary |
| Serializable SI keeps throughput "approaching" SI in most cases; SI much faster than strict 2PL | no figure | Cahill, Roehm, Fekete, 2008/2009, Serializable Isolation for Snapshot Databases | https://courses.cs.washington.edu/courses/csep544/09sp/resources/fekete-sigmod2008.pdf | from a summary |

## 4. Concurrent B-trees
Scheme: lock coupling ("crabbing") holds a parent latch until the child is safe. B-link trees (Lehman and Yao 1981) add a right link and high key so a reader can recover from a concurrent split with fewer latches held.
Wins/loses: B-link variants gave the most concurrency in later simulation studies.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| B-link algorithms gave the most concurrency and best performance in simulation | no figure | Srinivasan, Carey, 1991, Performance of B-tree concurrency control algorithms | https://vldb.org/dblp/db/conf/sigmod/SrinivasanC91.html | from a summary |
| Analytic model of response time and throughput of naive lock-coupling, optimistic descent, Lehman-Yao | no figure | Johnson, Shasha, 1990, A Framework for the Performance Analysis of Concurrent B-tree Algorithms | https://rmarcus.info/dbscholar/papers/h363ef2e5a832d893 | from a summary (abstract missing) |

## 5. Version control as optimistic concurrency: merge conflicts in practice
Scheme: each writer works on a copy; the merge is the validation step; a textual conflict is the abort.
Wins/loses: textual conflicts are common but not dominant; a clean textual merge can still fail build or tests (semantic conflict), at rates that differ by study and definition.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| About 1 in 6 merges had a textual conflict (nine projects, 3,562 merges) | 1/6 | Brun, Holmes, Ernst, Notkin, 2011, Proactive Detection of Collaboration Conflicts | https://neverworkintheory.org/2011/09/13/proactive-detection-of-collaboration-conflicts.html | from a summary (search snippet; the page itself gave no rates) |
| Build failures after merges in 3 of those projects: about 0.1%, 4%, 10% of merges; test failures 28% in one | 0.1/4/10%, 28% | same | same | from a summary, unconfirmed on the page |
| 208 Java repos: 15,886 scenarios with textual conflicts, 79 with build conflicts, 33 with test conflicts | 15,886 / 79 / 33 | A Characterization Study of Merge Conflicts in Java Projects (Virginia Tech) | https://vtechworks.lib.vt.edu/handle/10919/112057 | from a summary |
| Up to 10-20% of merge attempts conflict (as cited) | 10-20% | Ghiotto, Murta, Barros, van der Hoek, 2020, On the Nature of Merge Conflicts (2,731 Java projects) | https://neverworkintheory.org/2021/08/12/on-the-nature-of-merge-conflicts.html | from a summary (cited figure, not their result) |
| CI builds: in half the projects, 1 in 6 merge commits did not build | 1/6 | Vasilescu/Muylaert group, 2016-17, merge conflicts and builds on Travis | https://soft.vub.ac.be/~wmuylaer/repository/2017msr.pdf | from a summary (PDF not readable) |
| What raises or lowers the rate: nothing reliable extracted | none | | | nothing found |

## 6. Structured and semistructured merge
Scheme: merge by syntax tree (or by declarations, then lines inside them) instead of by line.
Wins/loses: fewer reported conflicts, but more missed interference (false negatives); renaming raises conflicts; benefit smaller for JavaScript.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Fewer conflicts in 60% of merge scenarios, average 34% (24 projects) | 60%, 34% | Apel et al., 2011 (FSE) | https://www.se.cs.uni-saarland.de/publications/docs/FSE2011.pdf | from a summary |
| Replication: reduction in 55% of scenarios, average 62% in those | 55%, 62% | ESEM 2015 replication | https://twiki.cin.ufpe.br/SPG/SemistructuredMergeReplication.html | from a summary |
| 30,000+ merges, 50 projects: improved tool halves reported conflicts; at least 8% fewer false negatives | 50%, 8% | Cavalcanti, Borba, Accioly, 2017, Evaluating and Improving Semistructured Merge | https://2017.splashcon.org/details/splash-2017-OOPSLA/57/Evaluating-and-Improving-Semistructured-Merge | quoted (abstract via fetch) |
| Semistructured and structured merge differ in 24% of conflict scenarios | 24% | 2019 study, semistructured versus structured merge | https://www.aminer.org/pub/5e2972263a55ac6b5c088946/the-impact-of-structure-on-software-merging-semistructured-versus-structured-merge | from a summary |

## 7. Reducing contention by design (lock splitting, striping, partitioning)
Scheme: split one hot lock into several, or hash the data into stripes, so writers hit different locks.
Wins/loses: throughput rises with threads until stripes or cores run out; reads without locks help further.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Striped map gives almost n times the throughput of a single-lock map with n threads under contention | about n times | Javamex benchmark (quad-core i7); cites Java Concurrency in Practice pp. 242-3 | https://javamex.com/tutorials/concurrenthashmap_scalability.shtml | from a summary |
| Striping helps up to 8 threads; striping plus non-blocking reads held to 13 threads (32-core Opteron) | 8, 13 threads | Sestoft lecture notes, IT University of Copenhagen | https://www.itu.dk/~sestoft/itu/PCPP/E2015/lecture06.pdf | from a summary |

## 8. Limits of speed-up: Amdahl and the Universal Scalability Law
Scheme: Amdahl: speedup = 1/(s + p/N); the cap is 1/s. USL: C(N) = N / (1 + a(N-1) + b N(N-1)), a = contention, b = coherency. With b = 0 it is Amdahl. With b > 0 throughput peaks at N = sqrt((1-a)/b) and then falls.
Wins/loses: a serial step (merge, test run) sets the cap; a coherency cost (every writer must reconcile with every other) makes more writers slower past the peak.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Speedup cap is 1/s; s = 1% gives at most 100 | 1/s, 100 | Amdahl, 1967 | https://www3.cs.stonybrook.edu/~rezaul/Spring-2019/CSE613/reading/Amdahl-1967.pdf | from a summary (via secondary text) |
| USL formula, peak N, Amdahl case at b = 0 | formula | Gunther, perfdynamics | https://www.perfdynamics.com/Manifesto/USLscalability.html | from a summary |
| USL equals a machine-repairman queue throughput bound; Amdahl and Gustafson are corollaries | none | Gunther, 2008, A General Theory of Computational Scalability Based on Rational Functions | https://arxiv.org/abs/0808.1431 | quoted (abstract via fetch) |
| Scaled speedup when problem grows: serial fractions 0.4-0.8% gave speedups on 1024 processors | 0.4-0.8%, 1024 | Gustafson, 1988 | https://www.dma.unina.it/~murli/didattica/2005_2006/cp/p532-gustafson.pdf | from a summary |

## 9. AI coding agents in parallel on one codebase (2025-2026)
All items are preprints; read as claimed by abstracts and summaries.

| Claim | Number | Source | URL | Status |
|---|---|---|---|---|
| Replayed 747 co-active agent PR pairs (33,596 PRs, 2,807 repos): textual conflicts 41.7% cross-agent, 19.8% same agent. Only 0.5% of co-active pairs were cross-agent. 84.4% of conflicted files were source code; nearly 42% of conflicts were modify/delete or add/add | 41.7%, 19.8%, 84.4%, 42% | AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates (2026) | https://arxiv.org/abs/2607.04697 | from a summary |
| 142K agent PRs, 107K simulated: 27.67% had textual conflicts; 336K conflict regions; conflicts were over 1.1% of rejections | 27.67%, 1.1% | Ogenrwot, Businge, 2026, AgenticFlict | https://arxiv.org/pdf/2604.03551 | from a summary |
| 600 trials: parallel agents up to 21.1% faster on some tasks, up to 39.4% slower on others; semantic conflicts 5-10%; 100% convergence | 21.1%, 39.4%, 5-10% | CodeCRDT, 2025 | https://arxiv.org/abs/2510.18893 | from a summary |
| Co-Coder (28 tasks): up to 2.10x wall-clock speedup, up to 35% lower API cost, pass rate +14.0 points (20.1% to 34.1%) on CodeProjectEval; commercial agent teams faster but less accurate | 2.10x, 35%, 14.0 | When Parallelism Pays Off: Cohesion-Aware Task Partitioning for Multi-Agent Coding, 2026 | https://arxiv.org/abs/2606.00953 | from a summary (search snippets) |
| Worktree-per-agent baseline: write-time conflict handling (STORM) beats it by +18.7 on Commit0-Lite, +1.4 on PaperBench; no conflict counts | +18.7, +1.4 | Multi-agent Collaboration with State Management, 2026 | https://arxiv.org/abs/2605.20563 | from a summary |
| Plan-then-isolated-workspace-then-test-verified merge beats single agent: +25.6 points PaperBench, +14.7 points Commit0; no speedup figure | 25.6, 14.7 | CAID (Centralized Asynchronous Isolated Delegation), 2026 | https://arxiv.org/abs/2603.21489 | from a summary |
| Patches that pass alone can fail together: 417 mined Django PR pairs, 834 runs, interference in 1 run; constructed tasks 97%; a message on the concurrent change recovered 82% | 1/834, 97%, 82% | Passes Alone, Fails Together (stale benchmark), 2026 | https://arxiv.org/abs/2609.25396 | quoted (abstract via fetch); authors say constructed rates are not real-world rates |
| Practitioner claim: 3-4 parallel agents is a practical ceiling for one reviewer | 3-4 | Augment Code guide | https://www.augmentcode.com/guides/how-to-run-a-multi-agent-coding-workspace | from a summary; opinion, not measured |

## Topics with no measured result found
- Topic 1: no measured throughput figures for intention locking were retrieved (concept only).
- Topic 4: no throughput numbers for lock coupling versus B-link were retrieved; only the ranking.
- Topic 5: no figure for what raises or lowers conflict rates (file overlap, branch length, team size); the 2017 PDF was unreadable.
- Topic 2: no numbers on the crossover conflict rate between optimistic and locking.
- Topic 9: no study found that measures speedup against number of agents on one repository with merge cost included. CodeCRDT and Co-Coder give task-level speedups only.

## URLs tried
Searches (all returned results): Gray granularity; Agrawal Carey Livny; merge conflicts and builds; semistructured merge; AI agents worktrees; USL and Amdahl; Kung Robinson; snapshot isolation; Lehman Yao and Johnson Shasha; lock striping; multi-agent coding 2026; Brun 2011; Ghiotto; SSI performance; Amdahl 1967; agent semantic conflicts; AgenticFlict; Co-Coder.
Fetches that worked: arxiv.org/abs/2607.04697, 2510.18893, 2605.20563, 2603.21489, 0808.1431, 2609.25396, 1509.04207; perfdynamics.com USL page; neverworkintheory Brun page; splashcon OOPSLA 2017 page; blog.acolyer.org Agrawal summary.
Fetches that failed (PDF bytes, no text): web.eecs.umich.edu/~jag/eecs584/papers/acl.pdf; se.cs.uni-saarland.de FSE2011.pdf; soft.vub.ac.be 2017msr.pdf. The local PDF reader needs poppler, which is not installed, so the saved copies were not read.
Not fetched (known only from search results): all other URLs in the tables.
