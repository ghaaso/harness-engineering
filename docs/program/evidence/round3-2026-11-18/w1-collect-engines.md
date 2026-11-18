# w1 collect: engines (versions and validation at high speed)

Topic: `engines`. Date: 2026-11-19. Collector: sonnet helper of lane w1. `R:` = `docs/program/evidence/round3-2026-11-18/`.
`E:` = `docs/program/evidence/harness-method-status-2026-11-18/`. `P:` = `R:papers/w1/`.

Library records reused (all `quoted`, from papers read in full in the earlier round; I read the place each cites in
`E:concurrency-lit-1-databases.md` and copied the quote with that file's line; the number in "(paper l.N)" is the line
of the earlier run's `plain.txt`, whose copy is not in the repository, so those lines cannot be re-checked here):
x02-0202, x02-0302 to x02-0308 (Kung and Robinson); x02-0206, x02-0337 to x02-0343 (Silo); x02-0207, x02-0354 to
x02-0361 (Larson, Hekaton); x02-0203, x02-0309 to x02-0323 (Yu 2014); x02-0324 to x02-0336 (Harding 2017); x02-0105
(Silo has no 2PL-versus-OCC curve); o1-0307 (Cicada has one throughput peak). Records x02-0501 (Diaconu "not obtained")
and "TicToc: not recorded" are now answered by blocks 5 and 6 below, read here in full.

Counts: new papers read in full here: 6 (Diaconu 2013, TicToc, Cicada, FoundationDB, Tanabe 2020, PostgreSQL
documentation page). Reused as `quoted` from the library: 6 (Kung and Robinson, Silo, Larson, Yu 2014, Harding 2017,
Agrawal 1987). `summary`: 0. `not opened`: see the end.

How to read the blocks: the status tag on each sentence is `quoted` (words of the paper), `reasoned` (mine).

---

## 1. Kung and Robinson 1981

- **Citation:** H. T. Kung, J. T. Robinson, "On optimistic methods for concurrency control", ACM TODS 6(2), 1981.
  URL (earlier round): https://www.eecs.harvard.edu/~htk/publication/1981-tods-kung-robinson.pdf. Status: `quoted` (library).
- **Problem.** Locking costs even when conflicts are rare; avoid locks and pay only when a conflict is found.
- **Mechanism.** Three phases: read on private copies, validate against transactions that committed meanwhile, write.
  Backward validation aborts the validating transaction on overlap.
- **Measured gain.** None measured. An analytic bound only: `E:concurrency-lit-1-databases.md:58` (paper l.209) —
  "if d = 3, m = 199, and n = 10^4, we have pc < 0.0007. Thus we see that it is very rare that one insertion would cause
  another concurrent insertion to restart for large B-trees." `quoted`. The claimed fit:
  `E:concurrency-lit-1-databases.md:57` (paper l.215) — "These methods may well be superior to locking methods for systems
  where transaction conflict is highly unlikely. Examples include query-dominant systems and very large tree-structured
  indexes." And, stated as unsolved: "Some techniques are definitely needed for determining all instances where an optimistic
  approach is better than a locking approach". `quoted`.
- **Assumes.** Conflicts are rare; abort and rerun is cheap; read and write sets are tracked. Validation as one critical
  section: `E:concurrency-lit-1-databases.md:55` (paper l.151) — "The simplest way to implement this is to place the
  assignment of a transaction number, validation, and the subsequent write phase all in a critical section." `quoted`.
  Starvation is the named weakness: `E:concurrency-lit-1-databases.md:56` (paper l.149, l.214) — "in an optimistic approach, the
  major difficulty is starvation, which can be solved by using locking." `quoted`. A starving transaction restarts while holding
  the critical section, "equivalent to write-locking the entire database" (same line). `quoted`.
- **For model-session writers.** `reasoned`. Rare conflict: holds only if sessions touch different files; fails on a shared
  registry or index file. Cheap abort: does not hold, a redo is minutes and tokens, not microseconds. Read and write sets
  known: the Edit tool gives the written text; what the session read is not recorded by the harness (see lane file; not
  checked here). Validation as a critical section: for 3 to 16 writers this is no bottleneck (a validation is a text compare).
  Starvation: real, a long session that keeps losing to short ones; the paper's remedy (lock the whole object, then rerun)
  is the "one owner" switch the harness already has.
- **Frame.** Bears on failure "lost update" and "write skew" (validate on landing what the change read) and on the claim
  that the harness two-way switch is the fallback of OCC. The frame misses starvation as a named failure.

## 2. Hekaton, Larson and others (VLDB 2011/12) and Diaconu and others (SIGMOD 2013)

- **Citation A:** P.-A. Larson, S. Blanas, C. Diaconu, C. Freedman, J. Patel, M. Zwilling, "High-performance concurrency control
  mechanisms for main-memory databases", PVLDB 5(4), 2012 (arXiv 1201.0228). Status: `quoted` (library, x02-0207).
- **Citation B:** C. Diaconu, C. Freedman, E. Ismert, P.-A. Larson, P. Mittal, R. Stonecipher, N. Verma, M. Zwilling, "Hekaton: SQL
  Server's Memory-Optimized OLTP Engine", SIGMOD 2013. URL: https://www.microsoft.com/en-us/research/wp-content/uploads/2013/06/Hekaton-Sigmod2013-final.pdf
  Status: `quoted`, read here in full: `P:diaconu/paper.txt` (564 lines).
- **Problem.** Run OLTP on memory-resident data without latches or locks, and keep long readers from blocking writers.
- **Mechanism.** Optimistic multiversion: each version has begin and end timestamps; a reader sees the version valid at its
  read time; a serializable transaction re-checks at the end that what it read is unchanged and that no phantom appeared.
  A reader of an uncommitted version takes a commit dependency, with cascading aborts possible.
- **Measured gain (A, via library).** `E:concurrency-lit-1-databases.md:193` (paper l.425) — at low contention, 10M rows, 10 reads
  and 2 writes, single-version locking "reaching a maximum of over 2M transactions/sec"; "MV/L has 30% lower performance than
  MV/O". `quoted`. Hotspot, 1,000 rows: `E:...:194` (l.427) "1V achieves its highest throughput at six threads, then drops and stays
  flat after 8 threads". `quoted`. Read-only share: `E:...:196` (l.470) "When 80% of the transactions are read-only, the MVCC schemes
  achieve 63% and 73% higher throughput than 1V." `quoted`. Long readers: `E:...:197` (l.477-480) "At x=1, update throughput drops 75% for the
  single version engine. In contrast, update throughput drops only 5% for the MV schemes"; "at x=12, MV has 80X higher update
  throughput than 1V". `quoted`. Cost of serializable on the multiversion schemes: `E:...:195` (l.462) "Both MV schemes achieve
  serializability at a cost of 10%- 19% lower throughput". `quoted`. Server: 12 cores, 2 NUMA nodes (`E:...:191`).
- **Measured gain (B, read here).** Engine against regular SQL Server on a contended insert workload, 60 streams, 50 percent update
  and 50 percent read-only, 100 rows inserted per update, 12 cores: `P:diaconu/paper.txt:429` (workload), `:464-465` — "Converting the
  table to a Hekaton table and accessing it through interop already improves throughput to 7,709 transactions per second for 12
  cores, a 3.3X increase over plain SQL Server. Accessing the table through compiled stored procedures improves throughput further
  to 36,375 transactions per second at 12 cores, a total increase of 15.7X." `quoted`. Baseline there is latch contention
  (`:464` "Latch contention limits the CPU utilization to just 40% for more than 6 cores"). The much larger part of the gain is
  not concurrency control but fewer instructions: `P:diaconu/paper.txt:375` "The speedup is 20X when doing 10 or more lookups per
  call." (single-thread CPU cycles) `quoted`. The paper reports no abort rate by contention level. Not found: any figure for
  validation failures.
- **Assumes.** Short transactions; compiled procedures; aborts cheap; all data in memory; one process.
  Isolation levels cost differently: `P:diaconu/paper.txt:261-265` — snapshot isolation "does not guarantee serializability because reads and writes
  logically occur at different times"; serializable adds read stability and phantom avoidance by re-scan; "For snapshot isolation
  or read committed, no validation at all is required." `quoted`. Commit dependency: `P:diaconu/paper.txt:282` "If T2 aborts, T1 must
  also abort so cascading aborts are possible." `quoted`.
- **For model-session writers.** `reasoned`. Multiple versions per file are free (a worktree is a version). The long-reader result
  (80X) maps to a read-only session (review, analysis) that must not stop writers: it is the case for snapshot copies. Commit
  dependency with cascading abort is the dangerous part: a session that built on another's unmerged change is redone if that
  one is redone; whole minutes of work, not microseconds. The re-scan for phantoms has a code analogue (a new function or
  registry entry in the place another change assumed empty), see Frame.
- **Frame.** Confirms "snapshot" for dirty read and "validate at end" for write skew; confirms phantom needs a separate check
  (re-scan), not covered by read-set validation alone. Larson's long-reader figure is the clearest large gain for snapshots.

## 3. Silo (Tu, Zheng, Kohler, Liskov, Madden, SOSP 2013)

- **Citation:** "Speedy transactions in multicore in-memory databases", SOSP 2013. URL (earlier round):
  https://people.csail.mit.edu/stephentu/papers/silo.pdf. Status: `quoted` (library x02-0206).
- **Problem.** An OCC commit protocol with no shared-memory write for records that were only read, and no global counter.
- **Mechanism.** Epoch-based commit ordering (a coarse global epoch, about every 40 ms: TicToc `P:tictoc/paper.txt:57`), per-record
  TID words; read-only transactions run on snapshots; validation locks the write set, checks the read set.
- **Measured gain.** `E:concurrency-lit-1-databases.md:180` (paper l.5) — "Silo achieves almost 700,000 transactions per second on
  a standard TPC-C workload mix on a 32-core machine, as well as near-linear scalability." `quoted`. `:182` (l.19) "Per-core transaction
  throughput at 32 cores is 91% of that at 8 cores" and "a commercial main-memory database system perform at most 3,000 transactions
  per second per core". `quoted`. A shared counter costs: `:184` (l.275) "scalability collapse after 24 workers; Key-Value outperforms
  MemSilo+GlobalTID by 1.80x at 32 workers". `quoted`. Against partition locks under cross-partition load: `:185` (l.434-436) "Partitioned-Store
  outperforms MemSilo by 1.54x at no cross-partition transactions ... At roughly 20%, the throughput of Partitioned-Store drops
  below MemSilo ... At roughly 60% ... MemSilo outperforms Partitioned-Store by 2.98x." `quoted`. Hot counter, 8.20x at 24 workers and
  17.21x at 32 with the counter out of the transaction: `:186` (l.439-440). `quoted`. Read tracking costs 1.07x: `:184` (l.274).
  Scale: 32 cores. Snapshots avoid aborts of large readers, 1.19x: `:187` (l.451-458). The paper has no 2PL-against-OCC curve under heavy write
  contention (`:188`, record x02-0105). `quoted`.
- **Assumes.** One-shot requests: `E:...:183` (l.21) "If high-latency client communication were part of a transaction, the likelihood of
  abort due to concurrent updates would grow." `quoted`. Contended counters abort: `:186` (l.439) "this is not unique to OCC; in 2PL,
  conflicting workers would serialize around write locks held on the shared counter." `quoted`.
- **For model-session writers.** `reasoned`. The one-shot assumption fails: a session works for minutes between reading and landing,
  which is exactly the "high-latency client inside a transaction" the paper says raises aborts. The hot-counter result is the
  strongest analogue: one shared file every change touches (a registry, an index, an import list) aborts everyone under OCC and
  serializes everyone under locks; the paper's remedy is to take the counter out of the transaction (17.21x), which for code
  is to take the shared registry line out of the change and add it at integration.
- **Frame.** Bears on means 1 (smaller grain: a counter is the grain that matters) and on means 3 (lay the object out so writes
  do not meet). The frame's "first writer wins" table row is the Silo rule; what the frame lacks is the cost of the hot item.

## 4. "Staring into the abyss" (Yu, Bezerra, Pavlo, Devadas, Stonebraker, VLDB 2014)

- **Citation:** PVLDB 8(3):209-220. URL (earlier round): https://people.csail.mit.edu/devadas/pubs/1000cores.pdf.
  Status: `quoted` (library x02-0203, x02-0309 to x02-0323).
- **Problem.** Which of seven classic schemes scales to many cores, and why not.
- **Mechanism.** One in-memory engine (DBx1000) in a simulator up to 1024 cores; seven schemes: three 2PL variants, timestamp
  ordering, MVCC, OCC, partitioned (H-STORE); YCSB and TPC-C.
- **Measured gain.** There is no gain claimed; it is a map of failures. `E:...:153` (l.27) "all algorithms fail to scale to this
  magnitude but for different reasons." `quoted`. Contention: `E:...:156` (l.218) "When there is no skew in the workload (theta=0) ...
  the throughput scales almost linearly." "With medium contention (theta=0.6), the throughput peaks at several hundred cores and then
  decreases due to thrashing. At the highest contention level (theta=0.8), the DBMS's throughput peaks at 16 cores and cannot scale
  beyond that." `quoted`. At theta 0.6 with writes: `:157` (l.330-383) "OCC does not perform as well because it spends a large portion of its
  time aborting transactions; the overhead is worse since each transaction has to finish before the conflict is resolved." `quoted`.
  At theta 0.8, 1024 cores: `:158` (l.385) "Surprisingly, OCC performs the best on 1024 cores. This is because although a large number of
  transactions conflict and have to abort during the validation phase, one transaction is always allowed to commit." `quoted`.
  Skew at 64 cores: `:159` (l.386) "for theta values less than 0.6, the contention has little effect on the performance ... approaches
  zero for values greater than 0.8." `quoted`. Transaction length: `:160` (l.472) "DL_DETECT and NO_WAIT have the best performance in
  this scenario [short transactions]", OCC worst. `quoted`. Mix: `:161` (l.517) "MVCC stand out as having the best performance when there
  are small number of write transactions." `quoted`. Partitioning: `:162` (l.587, l.635) H-STORE best to 800 cores for single-partition
  uniform work; "does not scale with transactions accessing four or more partitions". `quoted`. TPC-C with fewer warehouses than cores:
  `:163` (l.644) "all of the schemes fail to scale". `quoted`. Absolute throughputs are in figures only, not read.
- **Assumes.** In-memory, no think time, simulated cores, short transactions.
- **For model-session writers.** `reasoned`. Scale (1024 cores) is far above 3 to 16 writers; at 16 cores the paper's medium
  contention case still scales, and the high-contention case peaks at 16. The useful lesson is the shape: below theta 0.6 contention
  hardly matters; above 0.8 throughput goes toward zero for every scheme. So for us: the question is not which scheme but whether
  the workload sits past the cliff, and the pattern "one transaction always commits" (progress guarantee under OCC) is the one
  property that keeps a hot file from stalling everyone.
- **Frame.** Bears on all four failures indirectly and settles "no design wins everywhere", which the frame already says.
  Frame missing: there is a contention threshold (theta 0.6 to 0.8), past which no engine design helps; only removing the hot item does.

## 5. Harding, Van Aken, Pavlo, Stonebraker (VLDB 2017), added because it is the only direct 2PL / OCC / deterministic comparison

- **Citation:** "An evaluation of distributed concurrency control", PVLDB 10(5):553-564. URL (earlier round):
  https://www.vldb.org/pvldb/vol10/p553-harding.pdf. Status: `quoted` (library x02-0324 to x02-0336). Distributed, 16 to 64 servers, EC2.
- **Measured gain.** `E:...:168` (l.205-206) "the protocols' throughput is relatively unaffected by skew for theta values up to 0.5 ... Once theta
  reaches 0.8, all but one of them converge to the same low performance." `quoted`. `E:...:169` (l.206) "OCC performs worse than the other
  non-deterministic protocols under low contention due to the overheads of validation and copying ... At higher levels of contention,
  however, the benefit of tolerating more conflicts and thus avoiding unnecessary aborts outweighs these overheads." `quoted`.
  `E:...:170` (l.254-255) at 100 percent updates, theta 0.6, "NO_WAIT performs 54% better than the next-best non-deterministic algorithm (OCC)"; "at a 10% update
  rate, there is an average of 1.4 aborts per transaction" (WAIT_DIE). `quoted`. Conclusion `:171` (l.617-618) "when there were few
  updates ... 2PL or a timestamp protocol made the most sense ... past a certain threshold using an optimistic or deterministic protocol was a better choice."
  `quoted`.
- **For model-session writers.** `reasoned`. The papers disagree on a crossover (Yu: OCC wins at theta 0.8; Harding: NO_WAIT wins at 100 percent
  updates, theta 0.6). Disagreement is on the workload; neither gives a conflict rate for the switch. The harness's switch
  has no published threshold to borrow.

## 6. TicToc (Yu, Pavlo, Sanchez, Devadas, SIGMOD 2016)

- **Citation:** X. Yu, A. Pavlo, D. Sanchez, S. Devadas, "TicToc: Time Traveling Optimistic Concurrency Control", SIGMOD 2016.
  URL fetched: https://people.csail.mit.edu/devadas/pubs/tictoc.pdf. Status: `quoted`, read here: `P:tictoc/paper.txt` (1123 lines).
- **Problem.** Timestamp allocation is a global bottleneck, and fixed timestamps abort transactions that could be ordered after all.
- **Mechanism.** Each tuple stores a write and a read timestamp; at commit the transaction computes the commit timestamp from the tuples it
  touched (`:34` "each transaction can compute a valid commit timestamp after it has run, right before it commits"). A reader can be ordered
  before a later writer, so it commits where Silo aborts (`:62-66`).
- **Measured gain.** Abstract, `P:tictoc/paper.txt:23` — "TicToc achieves up to 92% better throughput while reducing the abort rate by 3.3x over these previous
  algorithms." `quoted`. Machine: 40 cores, 80 threads (`:413`); 10 GB, 10M-record YCSB (`:561`). TPC-C 4 warehouses (high contention), `:685`:
  "TICTOC achieves 1.8x better throughput than SILO while reducing its abort rate by 27%." `quoted`; the gain vanishes with parallelism: `:689-691`
  "As the number of warehouses grows ... the advantage of TICTOC over SILO decreases and eventually disappears at 80 warehouses." `quoted`.
  Medium YCSB (theta 0.8, 16 queries, 90 percent reads), `:699` and `:841`: similar throughput to Silo but "TICTOC has a 3.3x lower abort rate". `quoted`.
  High YCSB (theta 0.9, 50 percent writes), `:846` — "The timestamp management policy in TICTOC does not reduce the abort rate because the workload
  is too write-intensive and the contention level is so high that both algorithms have similar behaviors in terms of aborting transactions." `quoted`;
  `:856` without the optimisations "only performs 10% better than SILO". `quoted`. No-wait locking of the write set adds 38 percent at 80 threads (`:855`). `quoted`. Isolation level cost at medium contention, `:1037`: "4.7% for TICTOC and 5.6% for SILO" gain from dropping to repeatable read,
  against "67.4% for DL_DETECT and 200.0% for NO_WAIT" for the pessimistic schemes. `quoted`. Timestamp growth 10x slower than commits at
  high contention, so "this ratio is 10x" is the exploitable parallelism (`:958`). `quoted`.
- **Assumes.** In-memory, short, cheap-abort transactions; read and write sets in the transaction; abort rate measured as aborts over
  attempts (`:408`).
- **For model-session writers.** `reasoned`. The idea carries in kind: a change that read an old version of a file can still be ordered
  *before* a later change if the two do not overlap in what they read and wrote, so a "newer file" alone is no reason to reject.
  The gain (up to 92 percent) comes only where conflicts are real but reorderable; at high write contention it is 10 percent (`:856`).
  With 3 to 16 writers each touching a few files, the contention is low and the gain is small; the cost (a re-check of read versions)
  is paid by a text compare.
- **Frame.** Bears on the "write skew" row: validating by version equality is stricter than needed; validating by overlap of what was read
  and written is the TicToc/Kung condition (2) and (3). The frame does not mention that a rule on overlap commits more than a rule on "file changed".

## 7. Cicada (Lim, Kaminsky, Andersen, SIGMOD 2017)

- **Citation:** "Cicada: Dependably Fast Multi-Core In-Memory Transactions", SIGMOD 2017. URL fetched: https://hyeontaek.com/papers/cicada-sigmod2017.pdf.
  Status: `quoted`, read here: `P:cicada/paper.txt` (1059 lines). (The ACM and CMU addresses returned an error page; this author copy is a public PDF.)
- **Problem.** Each design has a small "sweet spot" of contention, read-write ratio and record size (`:19`).
- **Mechanism.** Optimistic multiversion with loosely synchronised per-thread clocks, best-effort inlining, rapid garbage collection, and a
  globally coordinated randomised backoff tuned by hill climbing on committed throughput (`:97`, `:267`).
- **Measured gain.** `P:cicada/paper.txt:35` — "Cicada achieves 3X and 1.37X higher throughput on contended TPC-C and YCSB workloads, respectively, than the
  next fastest scheme. Under uncontended YCSB scenarios, Cicada achieves up to 69.2% higher throughput than other systems." `quoted`. Scale: "a single 28-core
  machine", 2.07 M TPC-C and 56.5 M YCSB transactions per second (`:35`). `quoted`. High contention: `:559` TPC-C with 1 and 4 warehouses, up to 28
  threads, "All schemes except Cicada scale poorly" and "Cicada achieves up to 3X higher throughput than the next fastest design." `quoted`.
  YCSB, 16 requests, 50 percent read-modify-write, Zipf 0.99: `:663` "with 28 threads, Cicada's throughput is 37.1% higher than TicToc's." `quoted`.
  Baseline caveat: the independent analysis (block 8) reports "Silo and TicToc outperformed Cicada" in one high-skew read-heavy case on a single platform
  (`P:tanabe/paper.txt:748`) and says the earlier result differs "due to the use of different platforms". `quoted`.
- **Abort cost.** `P:cicada/paper.txt:46` — "Aborts can be expensive. ... OCC's lightweightness can aggravate this low-level contention by retrying aborted
  transactions too rapidly." `quoted`. `:850` — "high abort rates are not necessarily harmful; inexpensive aborts can make high abort rates acceptable and achieve
  high throughput"; the best maximum backoff is "workload dependent", often zero. `quoted`. Library record o1-0307 notes the throughput-versus-backoff curve had
  one peak (so hill climbing found it). `quoted`.
- **Assumes.** Aborts cost microseconds; hill climbing sees 5 ms of committed throughput; many finished units per control step.
- **For model-session writers.** `reasoned`. The central claim (high abort rates are acceptable when aborts are cheap) is the one that fails: an
  abort of a model session wastes minutes and tokens. So for us the backoff result inverts: retry quickly is costly, serialising the contended
  pair early (the "one owner" for that file) is the cheaper control. A controller needs many finished units per step; with 3 to 16 sessions and
  units of minutes there are few (reasoned from o1-0307's own condition).
- **Frame.** Bears on the cost of the abort: none of the frame's failures names wasted work. Wasted work, not the anomaly, is the price in our case.

## 8. Tanabe, Hoshino, Kawashima, Tatebe (VLDB 2020), CCBench, the single-platform comparison

- **Citation:** "An Analysis of Concurrency Control Protocols for In-Memory Databases with CCBench", PVLDB 13(13):3531-3544. URL fetched:
  http://vldb.org/pvldb/vol13/p3531-tanabe.pdf. Status: `quoted`, read here: `P:tanabe/paper.txt` (881 lines). Added: it is the only paper that puts Silo, TicToc, MOCC, Cicada,
  SI and 2PL on one platform at 224 threads, and the only one with a transaction-length experiment.
- **Measured gain.** None claimed; it corrects. `P:tanabe/paper.txt:8` lists six insights: "(I3) The effectiveness of two approaches to coping with conflict (wait and no-wait)
  depends on the situation." `quoted`. Length of transaction, `:572` — "The cost of aborts should be smaller for short transactions and larger for long ones. Therefore,
  with long transactions, the abort-retry cost is higher and may exceed the lock waiting cost. ... Fig. 9a shows that Wait began to outperform NoWait as the transaction size increased." `quoted`.
  Write ratio, `:357`: "When the write ratio increased from 0% to 10%, the abort rate rapidly increased, and the performance deteriorated. This is because the write operation produces
  a large number of read validation failures." `quoted`. Long transaction under MVCC, `:796`: "Even state-of-the-art GC cannot hold down the number of versions in MVCC protocols if a single long transaction
  is mixed into the workload." `quoted`. Scale: 224 threads on 224 cores (`:23`). No figure given in the text for abort-rate percentages; the plots were not read.
- **Assumes.** Same as the engines it tests: in-memory, microsecond transactions.
- **For model-session writers.** `reasoned`. It is the paper's own statement that abort cost grows with transaction length and that waiting beats aborting for long
  transactions. A model session is the extreme long transaction (minutes against microseconds), so the published direction is toward waiting (lock the contended file)
  and away from optimistic retry once the pair is known to collide. The magnitude is not available in the text.
- **Frame.** Bears on "how abort rate and wasted work grow with transaction length": direction only, no number.

## 9. FoundationDB (Zhou and others, SIGMOD 2021), an engine in real use

- **Citation:** "FoundationDB: A Distributed Unbundled Transactional Key Value Store", SIGMOD 2021. URL fetched: https://www.foundationdb.org/files/fdb-paper.pdf.
  Status: `quoted`, read here: `P:foundationdb/paper.txt` (497 lines).
- **Problem.** Strictly serializable multi-key transactions over a large key space with an optimistic design and no locks.
- **Mechanism.** A transaction reads at a snapshot version, buffers writes, and at commit sends its read ranges and write ranges to resolvers that check the read ranges
  against recently committed write ranges; a conflict aborts and the client restarts (`:60`, `:130-131`, `:156`). Atomic operations (add, compare-and-clear) write without reading,
  so they do not conflict with each other (`:273`).
- **Measured gain.** A conflict rate rather than a speedup: `P:foundationdb/paper.txt:156` — "Because of the nature of our multi-tenant production workload, the transaction conflict
  rate is very low (less than 1%) and OCC works well. If a conflict happens, the client can simply restart the transaction." `quoted`. The workload class it is built for:
  `:115` "FDB targets OLTP workloads that are read-mostly, read and write a small set of keys, have low contention". `quoted`. Resolver: `:133` "one single-threaded Resolver can easily
  handle 280K TPS (each transaction reads a random key range and writes another random key range)." `quoted`. Scale: `:422` 24 machines, 22 proxies, 336 storage servers, throughput scales linearly with operations per second (mean latencies stable below 100k operations per second), saturation of resolvers and proxies at 2 million operations per second. `quoted`.
- **Assumes.** Short transactions: `:450` "FDB chooses a 5-second MVCC window ... If a transaction exceeds the time limit, it is often the case that the client application is doing something
  inefficient"; long jobs "can be divided into smaller transactions" (`:452`). `quoted`. Conflicts rare (below 1 percent).
- **For model-session writers.** `reasoned`. A minutes-long unit is 60 times or more over this engine's whole transaction limit; its answer is to cut the unit into smaller transactions.
  The analogue is to cut a session's work into smaller commits against a fresh read, not to run one long unit. The atomic-operation point is the commutative-write device (order topic).
- **Frame.** Bears on means 1 (smaller unit) and 3 (writes that do not conflict: atomic add). Shows a production engine accepts "conflict is rare" as a stated condition, not a proven one.

## 10. PostgreSQL documentation, "Transaction Isolation" (an engine in real use)

- **Citation:** PostgreSQL manual, chapter 13.2, https://www.postgresql.org/docs/current/transaction-iso.html, saved `P:pgdocs/page.html`, read as text in `P:pgdocs/page.txt`
  (HTML tags stripped, blank lines removed; line numbers refer to that file). Status: `quoted` (documentation). Fetched 2026-11-19.
- **Problem.** What the three levels allow and what the application must do.
- **Mechanism.** Read committed: a new snapshot per command. Repeatable read: one snapshot per transaction; an update of a row changed since the snapshot fails with "could not serialize access due to concurrent update" (`P:pgdocs/page.txt:145`, `quoted`; the name "first updater wins" is mine, `reasoned`).
  Serializable: snapshot plus predicate (SIRead) locks that "do not cause any blocking" and flag dangerous read-write dependencies.
- **Measured gain.** None in the documentation (cost figures are in Ports and Grittner, lane sub-topic isolation, not here). Read committed anomaly: `P:pgdocs/page.txt:132-137`
  (a DELETE does nothing after a concurrent UPDATE changed the matching value). Repeatable read: `:141` "prevents all of the phenomena described in Table 13.1 except for serialization anomalies",
  `:143` "Applications using this level must be prepared to retry transactions due to serialization failures." `quoted`. Retry text: `:147` "it should abort the current transaction and retry the
  whole transaction from the beginning. The second time through, the transaction will see the previously-committed change". `quoted`.
- **Assumes.** The application can rerun the transaction and reaches the same logic: `:172` "if you can demonstrate that a single transaction, as written, will do the right thing when run by
  itself, you can have confidence that it will do the right thing in any mix of Serializable transactions". `quoted`. And: `:170-171` predicate locks "are based on data actually accessed",
  and "multiple finer-grained locks ... may be combined into fewer coarser-grained locks" (grain coarsens under memory pressure; `:180-181` this raises serialization failures). `quoted`.
  Advice for cost: `:176-179` "Don't put more into a single transaction than needed for integrity purposes". `quoted`.
- **For model-session writers.** `reasoned`. The retry rule "second time the transaction sees the new version" assumes a deterministic rerun of the same logic; a model rerun is not the same
  run, so the rule weakens to: the rerun starts from the new file and may do something different. "Demonstrate a single transaction right alone" corresponds to the project's tests passing on one
  session's branch; the serializable guarantee then corresponds to a serial test run after landing (596 s here, from the common file). The documentation's guidance to keep transactions small
  is the same direction as FoundationDB's 5 s window.
- **Frame.** Confirms the table in the lane's frame (snapshot per writer; first updater wins; predicate locks for phantoms); the documentation also names a failure the frame lacks:
  an error on insert after a check-then-insert that "can be seen even after explicitly checking" (`:173`, unique violation under serializable), the code analogue of two sessions adding the same function.

---

## What the figures say, short (all `reasoned` from the quotes above)

| Question | Answer from the papers read | Where |
|---|---|---|
| Which design wins at low contention | single-version locking or single-version OCC; multi-version costs 10 to 30 percent | Larson `E:193`, `E:195`; Tanabe `:748` |
| At medium contention | locking with no-wait scales best in Yu at theta 0.6; OCC best in Harding beyond one server | Yu `E:157`; Harding `E:173` |
| At very high contention | OCC (one commit guaranteed) in Yu at 1024 cores; deterministic ordering in Harding; but all collapse above theta 0.8 | Yu `E:158-159`; Harding `E:168` |
| Largest gain from versions | 80x update throughput with half long readers; 63 to 73 percent with 80 percent readers | Larson `E:197`, `E:196` |
| Largest gain from lazy ordering (TicToc) | 92 percent over Silo at best, 1.8x at TPC-C 4 warehouses, 10 percent at high write contention | TicToc `:23`, `:685`, `:856` |
| Largest gain from the whole Cicada design | 3x on contended TPC-C against the next best, 28 cores | Cicada `:35`, `:559` |
| Largest gain from removing a hot item | 17.21x (Silo, counter out of transaction, 32 workers) | Silo `E:186` |
| Abort cost against length | grows with length; waiting beats aborting for long transactions, direction only | Tanabe `:572` |

## Not found

- Searches: library lookups `Kung`, `Silo`, `Hekaton`, `TicToc`, `Cicada`, `abyss`, `optimistic concurrency`, `MVCC`, `1000 cores`. Web: one search for the Cicada PDF
  (title, venue, year); a few direct author-page URLs.
- A measured figure for wasted work as a share of cycles at a given abort rate and transaction length, in text: not found in these papers (Yu and Tanabe give it only in plots, not read).
- A conflict-rate threshold at which locking and OCC cross: not found (library line `E:...:B6` also found none).
- Any paper in this set that measures a transaction of minutes: not found; the longest is Tanabe's inserted delay of 0 to 10 ms (`P:tanabe/paper.txt:782`) and FoundationDB's 5 s window.
- Any measurement with non-deterministic or non-identical reruns: not found.
- Hekaton validation-failure rates (Diaconu 2013 and Larson give throughput only): not found in the text.

## Not opened

- ACM copies of Cicada and TicToc (error page at CMU and ACM addresses, not needed: public author copies used).
- Spanner, CockroachDB, LMDB, RocksDB, MySQL InnoDB, Oracle, SQL Server lock-based pages: not opened. Reason: the ten-paper cap and that none changes the answer for this topic
  (they are lock-based or snapshot-based and are covered by the PostgreSQL page and FoundationDB; InnoDB and SQL Server documentation belong to the grain topic).
- Kung and Robinson, Silo, Larson 2012, Yu 2014, Harding 2017 and Agrawal 1987: not fetched again (rule: reuse `quoted` library records); their lines are therefore from `E:` and cannot be
  checked against a `paper.txt` here.
- No sign-in is needed for any paper in this file.
