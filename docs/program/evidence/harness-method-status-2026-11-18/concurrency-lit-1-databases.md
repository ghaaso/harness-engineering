# Database concurrency control: established schemes (collected 2026-11-18)

How collected: web search and fetch, general terms only (rule 4), then classical results written from memory. Tags: QUOTED = words seen on a page (none here: the fetch tool returns paraphrase, so I quote nothing), SUMMARY = from a search or fetch summary (a small model's text, not the page), TEXTBOOK = standard knowledge stated unfetched.
Limits: no paper PDF was read in full; the PVLDB PDFs fetched as binary or journal front pages. Where I know a result exists but not its figure I write "figure not recalled". Mappings to our case, verdicts and advice are left out on purpose.
Textbook references: Gray and Reuter, Transaction Processing (1993); Bernstein, Hadzilacos, Goodman, Concurrency Control and Recovery in Database Systems (1987); Weikum and Vossen (2001).

## Part A. Schemes (field: name | problem | how | guarantee/measure | wins/loses | needs | failure modes | reference | how known, URL)

### 1. Multigranularity (hierarchical, intention) locking
- Problem: one lock size fits badly; a scan wants one lock on a table, a point update wants one on a row.
- How: locks on a tree (database, table, page, row). Before locking a node in S or X, take intention locks IS, IX (and SIX) on every ancestor. Compatibility matrix lets IS/IX coexist.
- Guarantee: with the protocol and 2PL, histories are serializable (TEXTBOOK). Figure not recalled for lock-count savings.
- Wins: mixed workloads of big scans and small updates. Loses: lock manager overhead on every path; escalation can block others.
- Needs: data that forms a containment hierarchy; transactions that declare access at the right level.
- Failure: lock escalation turns many row locks into one table lock and stalls concurrent writers; deadlocks between escalators (TEXTBOOK).
- Ref: Gray, Lorie, Putzolu, Traiger, "Granularity of locks and degrees of consistency in a shared data base", 1976 (IFIP); Gray and Reuter 1993.
- Known: TEXTBOOK. No URL fetched.

### 2. Two-phase locking (2PL), strict 2PL
- Problem: make interleaved transactions equal to some serial order.
- How: grow phase takes locks (S for read, X for write), shrink phase releases; no lock after first release. Strict 2PL holds X locks to commit.
- Guarantee: every 2PL history is conflict-serializable (Eswaran, Gray, Lorie, Traiger 1976). Strict 2PL also gives recoverability, no cascading aborts (TEXTBOOK).
- Wins: high contention on a few items, when a retry is costly: waiting beats redoing work. Loses: read-heavy workloads (lock traffic), long transactions (hold locks long), hotspots (queues).
- Needs: a lock manager all writers go through; writers that lock before they touch.
- Failure: deadlock; lock thrashing (more waiting than working as concurrency grows, Agrawal et al. below); convoys on hot items.
- Ref: Eswaran, Gray, Lorie, Traiger, "The notions of consistency and predicate locks in a database system", CACM 1976.
- Known: TEXTBOOK. No URL fetched.

### 3. Deadlock handling: detection, wait-die, wound-wait, no-wait
- Problem: 2PL transactions can wait in a cycle forever.
- How: detection builds a waits-for graph and aborts one victim per cycle. Wait-die: older waits for younger, younger requesting from older aborts ("dies") and restarts with its old timestamp. Wound-wait: older requesting from younger aborts ("wounds") the younger; younger waits for older. No-wait: abort on any conflict.
- Guarantee: wait-die and wound-wait are deadlock-free by construction and starvation-free, because a restarted transaction keeps its timestamp and so eventually is oldest (Rosenkrantz, Stearns, Lewis 1978; TEXTBOOK).
- Measured: on 1024 simulated cores, detection hit lock thrashing; no-wait and wait-die gave the best throughput under write contention (SUMMARY of Yu et al., below). Hundreds of cores: figure not recalled beyond that.
- Wins: prevention schemes when cycles are likely and detection cost is high. Loses: prevention aborts transactions that were not in a cycle (false aborts); detection costs a graph and a timeout or periodic scan.
- Needs: a total order of transaction age (timestamps); restartable transactions.
- Failure: no-wait gives very high abort rates (SUMMARY); detection latency leaves victims waiting.
- Ref: Rosenkrantz, Stearns, Lewis, "System level concurrency control for distributed database systems", ACM TODS 1978.
- Known: TEXTBOOK for guarantees; SUMMARY for measures. https://blog.acolyer.org/2015/05/01/staring-into-the-abyss-an-evaluation-of-concurrency-control-with-one-thousand-cores/

### 4. Optimistic concurrency control (OCC), backward and forward validation
- Problem: avoid lock cost and lock waits when conflicts are rare.
- How: three phases. Read: work on private copies, no locks. Validate: check against other transactions. Write: publish. Backward validation (Kung and Robinson): check the committing transaction's read set against write sets of transactions that committed during its life; abort self on overlap. Forward validation: check its write set against read sets of still-running transactions; abort either side.
- Guarantee: serializable in the order of validation (Kung and Robinson 1981, a theorem in the paper; TEXTBOOK). Validation plus write must be atomic or a check-then-use gap appears (SUMMARY of an encyclopaedia entry).
- Wins: low contention, read-mostly, short transactions: no lock waits, higher throughput than locking (SUMMARY). Loses: frequent conflicts, because repeated restarts cost more than waiting (SUMMARY). Long transactions are the hardest hit: they validate against many writers (TEXTBOOK).
- Needs: private workspace per transaction; a read set and write set tracked per transaction; a cheap abort and rerun.
- Failure: starvation of long transactions (backward validation aborts the victim, never the winner); wasted work on abort; validation as a serial point (Kung and Robinson validate in a critical section).
- Ref: Kung and Robinson, "On optimistic methods for concurrency control", ACM TODS 6(2), 1981.
- Known: TEXTBOOK; phases and win/lose conditions SUMMARY. https://en.wikipedia.org/wiki/Optimistic_concurrency_control

### 5. Timestamp ordering (TO) and the Thomas write rule
- Problem: serialize without locks by fixing the order at start.
- How: each transaction gets a timestamp; each item keeps the largest read and write timestamps. A read of an item written by a later timestamp aborts the reader; a write under a later read or write timestamp aborts the writer. Thomas write rule: a write older than the item's write timestamp, with no later reader, is skipped (obsolete), not aborted.
- Guarantee: histories are serializable in timestamp order (TEXTBOOK). Thomas rule gives view-serializable histories that plain TO would abort (Thomas 1979).
- Measured: basic TO spends effort on data copying and a timestamp allocator bottleneck at 1024 simulated cores (SUMMARY, Yu et al.).
- Wins: low contention, no lock manager. Loses: hot items cause abort storms; reads write timestamps (a read becomes a write to shared memory).
- Needs: a global timestamp source; restartable transactions; for recoverability, buffered writes or commit dependency.
- Failure: cascading aborts without extra care; livelock when restarts keep colliding (TEXTBOOK).
- Ref: Thomas, "A majority consensus approach to concurrency control for multiple copy databases", ACM TODS 1979; Bernstein and Goodman, "Concurrency control in distributed database systems", ACM Computing Surveys 1981.
- Known: TEXTBOOK; Yu measure SUMMARY. (URL as scheme 3.)

### 6. Multi-version concurrency control (MVCC)
- Problem: stop readers and writers blocking each other.
- How: each write makes a new version stamped with its writer; a reader sees the version valid at its timestamp. Old versions are garbage collected when no reader can need them.
- Guarantee: read-only transactions never block and never abort (TEXTBOOK). Multiversion TO is serializable (Bernstein and Goodman 1983, TEXTBOOK). Plain MVCC with snapshot reads is weaker than serializable (see 7).
- Measured: the Hekaton-line study found multiversion schemes have higher overhead but are much less sensitive to hotspots and long-running transactions, while single-version locking was good for short, low-contention transactions and degraded under harder conditions (SUMMARY of the paper's abstract, Larson et al. 2012; no numbers in the abstract).
- Wins: long readers, read-heavy mixes, hotspots. Loses: update-heavy, storage and version-chain cost, GC pressure.
- Needs: version storage; a way to know the oldest active reader.
- Failure: long-running reader stops GC and bloats storage (TEXTBOOK); in Yu et al. MVCC bottlenecked on timestamps (SUMMARY).
- Ref: Bernstein and Goodman, "Multiversion concurrency control: theory and algorithms", ACM TODS 1983; Reed's MIT thesis 1978.
- Known: TEXTBOOK; SUMMARY. https://arxiv.org/abs/1201.0228

### 7. Snapshot isolation (SI) and write skew
- Problem: give each transaction a stable view without read locks.
- How: read from the snapshot at start; at commit, abort if another transaction that committed since start wrote the same item (first-committer-wins), or block via a write lock (first-writer-wins).
- Guarantee: avoids the ANSI anomalies (dirty and non-repeatable read, phantoms in the ANSI sense) but is NOT serializable. It admits write skew: two transactions read overlapping data, write disjoint items, and jointly break an invariant neither breaks alone (SUMMARY of Berenson et al. 1995).
- Wins: read-heavy, mostly disjoint writers; no read-write blocking. Loses: when an invariant spans items that different writers update (write skew), and under hot-item write conflicts (aborts).
- Needs: writers whose conflicts show up as overlapping write sets, or invariants confined to the items written. Otherwise add locks on reads or a stronger scheme.
- Failure: write skew; read-only transaction anomaly (Fekete, O'Neil, O'Neil 2004, TEXTBOOK-level recall).
- Ref: Berenson, Bernstein, Gray, Melton, O'Neil, O'Neil, "A critique of ANSI SQL isolation levels", SIGMOD 1995.
- Known: SUMMARY. https://blog.acolyer.org/2016/02/24/a-critique-of-ansi-sql-isolation-levels/ and https://www.cs.umb.edu:443/~poneil/iso.pdf (listed by search, not fetched).

### 8. Serializable snapshot isolation (SSI)
- Problem: keep SI's non-blocking reads and also make it serializable.
- How: track read-write antidependencies between concurrent transactions. A non-serializable SI history contains a cycle with two adjacent rw edges (a "dangerous structure": T1 -rw-> T2 -rw-> T3). Abort a transaction in such a pattern. Detection is conservative: some aborts are false positives.
- Guarantee: serializable (theorem from Fekete et al. 2005, used by Cahill et al. 2008). Measured: close to plain SI and significantly better than 2PL under contention on SmallBank in Berkeley DB (SUMMARY, Cahill et al. 2008; numbers not confirmed). PostgreSQL's implementation reported slightly below SI and clearly above 2PL on read-heavy loads (SUMMARY of the abstract, Ports and Grittner 2012). Overhead from the developer's list posts: negligible to about 5 percent worst case, 2 percent on DBT-2 versus repeatable read, one reported 20 percent case (SUMMARY, mailing-list posts, not peer reviewed).
- Wins: read-heavy and read-only transactions. Loses: more aborts than SI; fine-grained locks give fewer false positives (InnoDB less than Berkeley DB, SUMMARY of a forum relay).
- Needs: tracking of reads (SIREAD marks) that outlive the reader; callers ready to retry aborts.
- Failure: false-positive aborts; a single lock on active-transaction state was a contention point in early PostgreSQL (SUMMARY).
- Ref: Cahill, Roehm, Fekete, "Serializable isolation for snapshot databases", SIGMOD 2008 (journal: ACM TODS 2009); Ports and Grittner, "Serializable snapshot isolation in PostgreSQL", PVLDB 5(12), 2012.
- Known: SUMMARY. https://arxiv.org/abs/1208.4179 ; https://courses.cs.washington.edu/courses/csep544/09sp/resources/fekete-sigmod2008.pdf (listed, not fetched).

### 9. Ordering transactions before they run (Calvin, deterministic execution)
- Problem: avoid distributed commit and distributed deadlock.
- How: a sequencing layer batches requests in short epochs (10 ms in one summary) and agrees a global order. Transactions declare read and write sets in advance. Locks are granted in that order, so execution is deterministic and replicas need no commit protocol.
- Measured: about half a million TPC-C transactions per second on a 100-node EC2 cluster, about 10 percent multipartition (SUMMARY, Thomson et al. 2012 via a blog). Best when most transactions touch one partition.
- Wins: contended, distributed workloads with known access sets. Loses: transactions whose access set depends on what they read ("dependent transactions" need a pre-read step); interactive transactions are not supported (SUMMARY).
- Needs: whole transaction submitted at once (no conversation); declared or derivable read and write sets; deterministic code.
- Failure: a wrong declared set; the epoch adds latency to every transaction (TEXTBOOK inference from design, no figure).
- Ref: Thomson, Diamond, Weng, Ren, Shao, Abadi, "Calvin: fast distributed transactions for partitioned database systems", SIGMOD 2012.
- Known: SUMMARY. https://highscalability.com/paper-calvin-fast-distributed-transactions-for-partitioned-d/ ; https://blog.acolyer.org/2019/03/29/calvin-fast-distributed-transactions-for-partitioned-database-systems/

### 10. Phantoms, predicate locks, index-range and next-key locking
- Problem: locking existing rows cannot stop another transaction inserting a row that matches a range just read.
- How: predicate locks (lock the condition; exact but costly to test) or, in practice, lock index key ranges. Next-key locking locks a key plus the gap before it, so inserts into a scanned range block (ARIES/KVL, Mohan 1990; ARIES/IM 1992).
- Guarantee: with range locks held to commit, no phantoms; serializable (TEXTBOOK). Figure not recalled.
- Wins: range scans under serializable. Loses: gap locks block inserts and raise deadlock rate; need an index on the predicate or the scan locks a whole table.
- Needs: an ordered index over the searched attribute.
- Failure: coarse locking when no index fits; deadlocks between inserters.
- Ref: Eswaran et al. 1976 (predicate locks); Mohan, "ARIES/KVL", VLDB 1990.
- Known: TEXTBOOK. No URL fetched.

### 11. Escrow transactions
- Problem: a hot aggregate (a balance, a stock count) serializes every writer under normal locking.
- How: instead of locking the value, a transaction reserves ("escrows") a quantity against a known lower or upper bound. The system keeps an interval [low, high] of possible values given uncommitted reservations. A request that keeps the bound true under all outcomes is granted at once; otherwise it waits.
- Guarantee: bound invariant (for example balance not below zero) holds under every commit or abort outcome, with concurrent updates, because operations commute within the bound (O'Neil 1986; TEXTBOOK).
- Wins: hot counters with commutative increment and decrement. Loses: reads of the exact value must wait or accept an interval; works only where the operation is a delta, not an overwrite.
- Needs: updates that are commutative deltas with a checkable bound; a log that can undo by inverse delta.
- Failure: non-commutative writes cannot use it; many outstanding reservations widen the interval and force waits (TEXTBOOK).
- Ref: O'Neil, "The escrow transactional method", ACM TODS 11(4), 1986.
- Known: TEXTBOOK. No URL fetched.

## Part B. Measured comparisons

### B1. Agrawal, Carey, Livny 1987
- Study: a closed queueing model comparing blocking (2PL), immediate restart, and optimistic control, varying resources and model assumptions. ACM TODS 12(4):609-654 (SIGMOD 1985 version also).
- Result (SUMMARY, secondary): earlier studies conflicted because of differing assumptions. Blocking tends to win when resource use is high; optimistic wins when resources are plentiful (low utilization). One blog states it; check the paper before relying. Numbers: figure not recalled.
- Their stated aim was to explain why prior results disagreed, not to add another algorithm (SUMMARY).
- URLs: https://web.eecs.umich.edu/~jag/eecs584/papers/acl.pdf (listed, not fetched); https://blog.acolyer.org/2016/01/07/concurrency-control-performance/ (listed).

### B2. Yu, Bezerra, Pavlo, Devadas, Stonebraker 2014 ("Staring into the abyss")
- PVLDB 8(3):209-220. Seven schemes on a main-memory engine, simulated to 1024 cores: 2PL with detection, 2PL no-wait, 2PL wait-die, basic TO, MVCC, OCC, H-Store (partition locks). (SUMMARY, blog and search text.)
- Result: all fail to scale at that size, for different reasons. Read-only: 2PL schemes scale better than TO-family; best 2PL spends about 30 percent of cycles on useful work. Write-intensive: 2PL no-wait and wait-die best; detection thrashes beyond 16 cores. High contention: none scales beyond about 64 cores. H-Store scales best (up to 800 cores) when every transaction is single-partition, and does not scale when four or more partitions are touched.
- Limit: simulation, no absolute throughput in the summary. URL: https://blog.acolyer.org/2015/05/01/staring-into-the-abyss-an-evaluation-of-concurrency-control-with-one-thousand-cores/ ; PDF listed: https://people.csail.mit.edu/devadas/pubs/1000cores.pdf (not fetched).

### B3. Harding, Van Aken, Pavlo, Stonebraker 2017
- PVLDB 10(5):553-564. Deneva framework; six protocols: 2PL (no-wait, wait-die), timestamp, MVCC, OCC, and a deterministic one; YCSB, TPC-C, PPS. (SUMMARY of search text.)
- Result: severe limits of distributed engines and protocol-specific bottlenecks; the authors conclude better CC needs tighter coupling with new network hardware or with the application. Numbers: figure not recalled; the PDF fetch returned binary only (saved by the tool, unread).
- URLs: https://www.pdl.cmu.edu/PDL-FTP/Database/p553-harding_abs.shtml (listed); https://www.vldb.org/pvldb/vol10/p553-harding.pdf (fetched, binary).

### B4. Silo, Tu, Zheng, Kohler, Liskov, Madden 2013
- SOSP 2013. OCC with epochs: no shared-memory write for read-only records, no central timestamp counter; durability by epochs.
- Result: almost 700,000 TPC-C transactions per second on a 32-core machine, near-linear scaling; a commercial main-memory system on the same hardware did at most about 3,000 per second per core (SUMMARY of the abstract via search).
- Reading: an OCC variant won at low-to-moderate conflict by removing shared writes on read. Contended results: figure not recalled.
- URL: https://people.csail.mit.edu/stephentu/papers/silo.pdf (listed, not fetched).

### B5. Hekaton / main-memory MVCC, Larson et al. 2012 (PVLDB 5(4):298-309) and Diaconu et al. 2013
- Two MVCC schemes, optimistic (validation) and pessimistic, plus main-memory single-version locking. Transactions do not block during processing; they may wait before commit to keep serialization order. (SUMMARY.)
- Result: abstract states single-version locking is fine for short, low-contention transactions and degrades otherwise; MVCC costs more but is much less sensitive to hotspots and long transactions. One secondary source says optimistic MVCC beat pessimistic on throughput. No figures in the abstract. Diaconu et al. (SIGMOD 2013, Hekaton in SQL Server): not fetched; figures not recalled.
- URL: https://arxiv.org/abs/1201.0228

### B6. Where optimistic control stops beating locking
- Collected: OCC is described as good at low contention and bad when conflicts are frequent (SUMMARY, Wikipedia). Agrawal et al.: depends on resource level (B1). Yu et al.: OCC loses to 2PL no-wait and wait-die under write-heavy load and its bottleneck is copying, abort cost and timestamps (SUMMARY). Silo shows an OCC design can scale where conflicts are low (B4).
- No single crossover number found. Figure not recalled; no source fetched states a conflict rate at which they cross.

## Part C. What I could not find
- Full texts of any paper; exact figures for Cahill 2008, Harding 2017, Diaconu 2013, Silo under contention, Agrawal 1987.
- No fetched page gave a quoted conflict-rate crossover between OCC and locking.
- Original sources for Kung and Robinson, Gray 1976, O'Neil 1986, Mohan: not reachable by this tool; TEXTBOOK only.

## URLs tried
Worked (summary text only): en.wikipedia.org/wiki/Optimistic_concurrency_control; blog.acolyer.org/2015/05/01/staring-into-the-abyss-...; arxiv.org/abs/1201.0228; web searches for Yu 2014, Ports and Grittner, Silo, Larson, Agrawal, Calvin, Harding, Cahill, Berenson.
Failed: www.vldb.org/pvldb/vol8/p185-yu.pdf (journal home page, not the paper); dl.acm.org/doi/10.1145/1376616.1376690 (HTTP 403); www.vldb.org/pvldb/vol10/p553-harding.pdf (binary PDF, summary unreadable).
Listed by search, not fetched: the PDFs named above (people.csail.mit.edu, web.eecs.umich.edu, cs.umb.edu, arxiv 1208.4179, db.cs.cmu.edu).
