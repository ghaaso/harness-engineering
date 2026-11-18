# w1 claims: several writers on one object (draft, step 2, 2026-11-19)

Lane `writers`, research round 3, task r57-0512. Draft for the gate and the refuter. `R:` =
`docs/program/evidence/round3-2026-11-18/`. `P:` = `R:papers/w1/` (paper texts, not committed). `E:` =
`docs/program/evidence/harness-method-status-2026-11-18/` (the earlier round's reading files; a quote there is the
library's `quoted` record of a paper whose text is not in this repository, so its paper line cannot be re-checked
here). `D:` = `docs/program/evidence/bottleneck-2026-11-18/`.

Every quotation below was opened at the cited line by the analyst on 2026-11-19 (grep and read, or a script that
looks for the words within three lines of the cited place). Where the collect file gave another line, the line here
is the one where the words stand. In some texts a multiplication sign comes out as an unprintable mark; it is written
`x` here. OCR texts (Gray 1976, Ries 1977, Srinivasan 1993, Barghouti, split, BKK85, sagas) keep their OCR spelling
except where marked `[sic]`. Two-column texts interleave; a quote is cut where the columns mix and the cut is `...`.

Marks (ROUND.md, r57-0010):
- `proven` = stated in the literature, with the quotation. Qualifiers say when the source is a simulation, a survey,
  documentation, a preprint, an argument without measurement, or a company's own account (`self-reported`: an
  uncontrolled figure by the company about itself, ROUND.md standard 1b).
- `measured here` = a library record of kind `fact` about this project. Those with status `measured` are counts or
  runs; those with status `observed` (read once in our code, or seen once) are marked `measured here (observed)`.
- `hypothesis` = no quotation states it; the block says what it is inferred from. `hypothesis (computed)` =
  arithmetic on the cited claims, method in the block. A claim about model sessions is a hypothesis unless a source
  measured model sessions, and then it holds only under that source's conditions.

Our case (from `R:w1-brief-common.md`): a writer is a model session; a unit lasts minutes; a redo costs tokens; 3 to
16 writers; a rerun is not the same run; the last judge is the serial test suite. Symbols: N = writers at once on one
file; F = independent regions of the file (functions, entries); k = regions one unit touches; T = a unit's time.

Counts: 98 claims. proven 84, measured here 7 (2 measured, 5 observed), hypothesis 7 (2 computed). The table at the
end lists the qualifiers of the proven ones. W98 was added last and sits in section G beside W71.

---

## A. Failures and isolation levels

### W01. Lost update (P4) is possible at READ COMMITTED, and snapshot isolation's first-committer-wins rule prevents it.
- Mark: proven.
- Quote: "P4 is possible at the READ COMMITTED isolation level" and "This feature, called Firstcommitter-wins prevents lost updates (phenomenon P4)."
- Where: `P:berenson95/paper.txt:349`, `:367`.
- Holds when: a writer's write is refused if another committed to the same item after the writer's start (snapshot timestamp); a definitions paper, no measurement (`R:w1-collect-isolation.md:18`).

### W02. Dirty write (P0): two writers' uncommitted changes to two related items both survive and break the invariant between them, and undoing one by its before-image would wipe out the other.
- Mark: proven.
- Quote: "T1's changes to y and T2's to x both 'survive'. If T1 writes 1 in both x and y while T2 writes 2, the result will be x=2, y =1 violating x = y." and "You don't want to undo w1[x] by restoring its before-image of x, because that would wipe out w2's update."
- Where: `P:berenson95/paper.txt:216`, `:217`.
- Holds when: writers write into one shared state before either commits (for us: two sessions in one working copy).

### W03. Read skew (A5A) and write skew (A5B) are separate failures, and snapshot isolation allows write skew.
- Mark: proven.
- Quote: "Suppose T1 reads x and y, which are consistent with C(), and then a T2 reads x and y, writes x, and commits. Then T1 writes y. If there were a constraint between x and y, it might be violated." and "Snapshot Isolation histories prohibit histories with anomaly A3, but allow A5B"
- Where: `P:berenson95/paper.txt:385-388`, `:398`.
- Holds when: each writer reads at its own start point and writes different items.

### W04. Under snapshot isolation, two writers that read the same predicate and each insert a different item are not stopped by first-committer-wins (a phantom form of write skew).
- Mark: proven.
- Quote: "Since the two transactions are inserting different data items ... this scenario is not precluded by First-Committer-Wins and can occur in Snapshot Isolation."
- Where: `P:berenson95/paper.txt:405`.
- Holds when: the two writes are to different items; the conflict is only in what both read.

### W05. Making snapshot isolation serializable (SSI in PostgreSQL) cost under 7 % of throughput, and on a disk-bound run was indistinguishable from snapshot isolation with serialization failures under 0.25 %.
- Mark: proven.
- Quote: "our serializable mode has a performance cost of less than 7% relative to snapshot isolation" and "the performance of SSI is indistinguishable from that of SI. Transactions rarely need to be retried; in all cases, the serialization failure rate was under 0.25%."
- Where: `P:ports12/paper.txt:23`, `:600`.
- Holds when: one machine, 4 to 36 client threads, 3 to 19 GB, short transactions, low contention; the microbenchmark showed 10-20 % CPU overhead for read tracking (`:582`).

### W06. In SSI a long-running transaction takes more read locks, is more likely to conflict, and holds back cleanup of others' read locks.
- Mark: proven.
- Quote: "they take more SIREAD locks and are more likely to conflict"
- Where: `P:ports12/paper.txt:298`.
- Holds when: read dependencies are tracked until all concurrent transactions complete.

### W07. Read dependencies that run partly outside the database cannot be tracked by the engine.
- Mark: proven.
- Quote: "we were concerned about wrdependencies that take place partially outside the database, which we cannot track."
- Where: `P:ports12/paper.txt:334`.
- Holds when: always for an engine; for us the analogue is a read through a shell or from the model's memory (hypothesis).

### W08. SSI's check has false positives: it aborts some transactions that were in no cycle.
- Mark: proven.
- Quote: "it may have false positives because not every dangerous structure is part of a cycle"
- Where: `P:ports12/paper.txt:174`.
- Holds when: validation tracks only pairs of read-write antidependencies.

### W09. The engines' remedy for a validation failure is to abort and rerun the whole transaction, which assumes the rerun repeats the same logic.
- Mark: proven (paper and documentation).
- Quote: "users must already be prepared to handle transactions aborted by serialization failures" and "it should abort the current transaction and retry the whole transaction from the beginning. The second time through, the transaction will see the previously-committed change"
- Where: `P:ports12/paper.txt:133`; `P:pgdocs/page.txt:147`.
- Holds when: aborts are cheap and the rerun runs the same program; for a model session neither holds (rerun differs, redo costs tokens): hypothesis.

## B. Grain: claims smaller than the object

### W10. Gray 1976: the size of the lockable unit trades concurrency against overhead, and a writer of a small unit first marks every ancestor with an intention mode, which is compatible with itself.
- Mark: proven (protocol and argument; no measurement, `R:w1-collect-grain.md:34-37`).
- Quote: "The choice of lockable units presents a tradeoff between concurrency" ... "Intention mode is used to "tag" (lock) all ancestors of" ... "However, intention mode is compatible with itself"
- Where: `P:gray76/paper.txt:79`, `:169`, `:220`.
- Holds when: the objects form a containment tree and every request passes one lock manager.

### W11. InnoDB, an engine in use, locks at several grains at once and its intention locks block only whole-table requests.
- Mark: proven (documentation).
- Quote: "InnoDB supports multiple granularity locking which permits coexistence of row locks and table locks" and intention locks "do not block anything except full table requests"
- Where: `P:innodb-second/page.txt:280-281`, `:342-343`.
- Holds when: MySQL 8.4 manual as fetched 2026-11-19; rules, no measurement.

### W12. InnoDB's gap locks only inhibit inserts and do not conflict with each other, and insert-intention locks let writers inserting at different positions of one gap proceed without waiting.
- Mark: proven (documentation). Mohan 1990 states the same principle for key values (IX compatible with IX, `P:mohan90-second/paper.txt:869`); not rested on alone (brief caveat).
- Quote: gap locks are "purely inhibitive" and transactions inserting into the same gap at different positions "not wait for each other"
- Where: `P:innodb-second/page.txt:403-412`, `:483-485`.
- Holds when: an ordered index names the gaps; for code, the ordered list of definitions or registry entries is the index (hypothesis).

### W13. InnoDB gives up most gap locking (phantom protection) at READ COMMITTED, trading it for concurrency.
- Mark: proven (documentation).
- Quote: "Gap locking can be disabled explicitly. This occurs if you change the transaction isolation level to READ COMMITTED"
- Where: `P:innodb-second/page.txt:416-420`.
- Holds when: as W11; then gap locks are kept only for foreign-key and duplicate-key checks.

### W14. A general predicate lock cannot be checked: deciding whether two predicates conflict is recursively unsolvable, so only simple predicates are usable.
- Mark: proven.
- Quote: "recursively unsolvable (Kleene [5]), so it is not clear / how to make predicate locks "work.""
- Where: `P:eswaran76/paper.txt:466-467`.
- Holds when: predicates over arbitrary data; for code, "all callers of f" is such a predicate (hypothesis).

### W15. Graefe's survey: no major product adopted predicate or precision locking; deleting a key needs a lock on its neighbour as well; fine grain is needed most at hot spots.
- Mark: proven (survey; designs, no measurement).
- Quote: "Neither pure predicate locking nor the more practical precision locking" ... "has been adopted in major products." / "Deletion of a key requires a lock on / both the old key and its neighbor" / "A fine granularity of locking is required most often at hot spots"
- Where: `P:graefe10/paper.txt:714-715`, `:729-730`, `:695-696`.
- Holds when: B-tree indexes, short transactions.

### W16. Ries and Stonebraker 1977 (simulation): going from 1 granule to 10 raised useful I/O about 34 % (7,042 to 9,438), going to 1,000 granules cut it about 64 % from the peak (9,573 at 20 to 3,409), and the authors concluded that about 10 granules suffice.
- Mark: proven (simulation; OCR table; the two ratios are computed here from the quoted rows).
- Quote: rows "1! 7041.957!", "10 9437.987", "20 9572.718", "1000 3408.635 [" and "most cases 10 granules appears sufficient. Hence, a very crude"
- Where: `P:ries77/paper.txt:483`, `:493`, `:495`, `:512`, `:871`.
- Holds when: 10 transactions over 5,000 entities, each touching 50 to 500 (`:435`), uniform access, a lock costs as much I/O as an entity, deadlock cost not counted (`:835-836`). Our lock cost is the opposite (a claim is cheap, a wait is dear), so only the shape carries (hypothesis).

### W17. In the same simulation the best number of granules rose as each transaction touched fewer entities.
- Mark: proven (simulation).
- Quote: "the parameter which had the most effect on the desired number of granules was the number of entities 'touched' by the" ... "transactions. As the transaction size decreased, the desired"
- Where: `P:ries77/paper.txt:891-894`.
- Holds when: as W16.

### W18. Srinivasan and Carey (simulation): with locks held to the end of a transaction of 10 operations, leaf-page locking (about 250 pages) performed much worse than record locking (about 40,000 records) because of deadlocks and re-execution; at 1 operation per transaction the two did not differ.
- Mark: proven (simulation; the size of the loss is in Figure 23, which did not come out as text and was not read).
- Quote: "virtually no difference between leaf-page locking and record locking for a batching factor of 1" and "leaf-page locking with a batching factor of 10 performs much worse" ... "severe loss of throughput" ... "there are many more record IDs (around 40,000) than there are leaf pages (around 250)"
- Where: `P:srinivasan93/paper.txt:2006`, `:2012-2017`, `:2018-2019`.
- Holds when: 50 % inserts and 50 % deletes, uniform keys, 1 CPU, 8 disks, multiprogramming up to 100, deadlock broken by aborting and re-executing the youngest.

### W19. SQL Server turns many fine locks into one coarse lock (escalation) to cut overhead at the price of contention, triggered by a count of 5,000 locks on one table reference.
- Mark: proven (documentation; a rule, no measurement).
- Quote: "Lock escalation is the process of converting many fine-grain locks into fewer coarse-grain locks, reducing system overhead while increasing the probability of concurrency contention." and "acquires at least 5,000 locks on a single reference of a table or index"
- Where: `P:sqlserver-esc/page.txt:407`, `:433`.
- Holds when: a central in-memory lock table whose size is the cost.

### W20. Graefe 2007 argues that one ill-advised escalation to an index lock collapses concurrency to one writer, and notes that SQL Server cannot de-escalate.
- Mark: proven (argument; no workload or measurement in the text).
- Quote: "the multi-programming level collapses" and "does not support lock de-escalation"
- Where: `P:graefe07/paper.txt:71-73`, `:267-270`.
- Holds when: tens or hundreds of transactions on one index; the paper proposes intermediate granules and de-escalation.

## C. Versions and validation

### W21. Kung and Robinson: optimistic control may beat locking where conflict is highly unlikely, and its major difficulty is starvation, which is solved by locking.
- Mark: proven (library quote).
- Quote: "These methods may well be superior to locking methods for systems where transaction conflict is highly unlikely." and "in an optimistic approach, the major difficulty is starvation, which can be solved by using locking."
- Where: `E:concurrency-lit-1-databases.md:57`, `:56`.
- Holds when: abort and rerun are cheap; validation in one critical section.

### W22. Hekaton's multiversion schemes kept update throughput when long readers ran: one long reader cut single-version update throughput 75 % against 5 % for multiversion, and with half the transactions long readers multiversion had 80 times the update throughput.
- Mark: proven (library quote).
- Quote: "At x=1, update throughput drops 75% for the single version engine. In contrast, update throughput drops only 5% for the MV schemes" and "When 50% of the active transactions are long readers, at x=12, MV has 80X higher update throughput than 1V."
- Where: `E:concurrency-lit-1-databases.md:197`.
- Holds when: in memory, 12 cores, readers scanning 10 % of a 10M-row table.

### W23. The same paper's multiversion schemes paid 10 to 19 % throughput for serializability.
- Mark: proven (library quote).
- Quote: "Both MV schemes achieve serializability at a cost of 10%- 19% lower throughput"
- Where: `E:concurrency-lit-1-databases.md:195`.
- Holds when: 24 threads, as W22.

### W24. Silo: a counter every transaction writes makes OCC abort and 2PL serialize alike, and taking the counter out of the transaction gave 17.21 times the throughput of the partitioned store at 32 workers.
- Mark: proven (library quote).
- Quote: "Note that this is not unique to OCC; in 2PL, conflicting workers would serialize around write locks held on the shared counter." and "17.21x at 32 workers"
- Where: `E:concurrency-lit-1-databases.md:186`.
- Holds when: TPC-C with one hot counter per district, in memory, 32 cores.

### W25. Silo assumes one-shot requests and says aborts would grow if slow client communication were part of a transaction.
- Mark: proven (library quote).
- Quote: "If high-latency client communication were part of a transaction, the likelihood of abort due to concurrent updates would grow."
- Where: `E:concurrency-lit-1-databases.md:183`.
- Holds when: stated by the authors as a limit of their model, not measured.

### W26. Silo: a store partitioned by owner beat OCC by 1.54 times with no cross-partition transactions, fell below it at about 20 % cross-partition, and lost by 2.98 times at about 60 %.
- Mark: proven (library quote).
- Quote: "Partitioned-Store outperforms MemSilo by 1.54x at no cross-partition transactions ... At roughly 20%, the throughput of Partitioned-Store drops below MemSilo ... At roughly 60% cross-partition transactions, MemSilo outperforms Partitioned-Store by 2.98x."
- Where: `E:concurrency-lit-1-databases.md:185`.
- Holds when: TPC-C variant, 32 cores, in memory.

### W27. Yu and others (simulation to 1024 cores): with no skew throughput scales almost linearly; at theta 0.8 it peaks at 16 cores; past 0.8 every scheme approaches zero.
- Mark: proven (library quote; simulation).
- Quote: "At the highest contention level (theta=0.8), the DBMS's throughput peaks at 16 cores and cannot scale beyond that." and "there is a sudden drop in throughput that renders all algorithms nonscalable and approaches zero for values greater than 0.8."
- Where: `E:concurrency-lit-1-databases.md:156`, `:159`.
- Holds when: in memory, no think time, short transactions.

### W28. Harding and others: once skew reaches theta 0.8 all protocols but Calvin converge to the same low throughput.
- Mark: proven (library quote).
- Quote: "Once theta reaches 0.8, all but one of them converge to the same low performance. CALVIN is the only protocol to maintain good performance despite high skew."
- Where: `E:concurrency-lit-1-databases.md:168`.
- Holds when: 16 servers, distributed, YCSB.

### W29. TicToc, which computes the commit order from what each transaction read and wrote instead of fixing it at start, gained up to 92 % throughput over earlier optimistic schemes, but did not cut aborts at high write contention.
- Mark: proven.
- Quote: "TicToc achieves up to 92% better throughput while reducing the abort rate by 3.3x" and "The timestamp management policy in TICTOC does not reduce the abort rate because the workload is too write-intensive"
- Where: `P:tictoc/paper.txt:23`, `:846`.
- Holds when: 40 cores, 80 threads, in memory; the advantage over Silo "eventually disappears at 80 warehouses" (`:689-691`).

### W30. Cicada: high abort rates are acceptable only when aborts are cheap; aborts can be expensive.
- Mark: proven.
- Quote: "high abort rates are not necessarily harmful; inexpensive aborts can make high abort rates acceptable" and "Aborts can be expensive."
- Where: `P:cicada/paper.txt:850`, `:46`.
- Holds when: one 28-core machine; Cicada's own gain was 3x on contended TPC-C (`:35`).

### W31. Tanabe and others: abort-and-retry costs grow with transaction length and may exceed the cost of waiting for a lock; waiting began to beat no-wait as transactions grew.
- Mark: proven (direction only; the size is in a plot not read).
- Quote: "with long transactions, the abort-retry cost is higher and may exceed the lock waiting cost" and "Wait began to outperform NoWait as the transaction size increased."
- Where: `P:tanabe/paper.txt:572`.
- Holds when: in memory, 224 cores, transactions of microseconds to milliseconds.

### W32. One long transaction defeats garbage collection of old versions in every multiversion protocol tested.
- Mark: proven.
- Quote: "Even state-of-the-art GC cannot hold down the number of versions in MVCC protocols if a single long transaction is mixed into the workload."
- Where: `P:tanabe/paper.txt:796`.
- Holds when: as W31.

### W33. FoundationDB runs optimistic control because its production conflict rate is under 1 %, limits a transaction to 5 seconds, and tells long jobs to split into smaller transactions.
- Mark: proven (the engine's own paper; the conflict rate is self-reported).
- Quote: "the transaction conflict rate is very low (less than 1%) and OCC works well." and "FDB chooses a 5-second MVCC window"
- Where: `P:foundationdb/paper.txt:156`, `:450`; and "For some transactions that may span more than 5s, many can be divided into smaller transactions." at `:452`.
- Holds when: read-mostly OLTP with low contention (`:115`).

### W34. Agrawal, Carey and Livny (simulation): blocking beat restart and optimistic control at medium to high resource use; optimistic control won only where wasted work could be tolerated, including interactive workloads with long think times.
- Mark: proven (library quote; simulation). Library record r57-0301 holds the same.
- Quote: "Dynamic two-phase locking was found to outperform the immediate-restart and optimistic algorithms for medium to high levels of resource utilization. However, if resource utilizations are low enough so that a large amount of wasted resources can be tolerated" and "Such low resource utilizations arose in our experiments with large numbers of resource units and in our interactive workload experiments with large intratransaction think times."
- Where: `E:concurrency-lit-1-databases.md:143`, `:145`.
- Holds when: simulated single-site database; think times of 1 to 10 s.

### W35. Hekaton: a transaction that reads another's uncommitted version takes a commit dependency, so aborts can cascade.
- Mark: proven.
- Quote: "If T2 aborts, T1 must also abort so cascading aborts are possible."
- Where: `P:diaconu/paper.txt:282`.
- Holds when: speculative reads of uncommitted versions are allowed (for us: a session building on another's unmerged change, hypothesis).

## D. Order first, writes that commute, ownership

### W36. Calvin fixes the order before execution and therefore needs every transaction's read and write sets in advance; a transaction that must read to learn them runs a reconnaissance pass and is restarted if the set changed.
- Mark: proven.
- Quote: "Calvin's deterministic locking protocol requires advance knowledge of all transactions' read/write sets before transaction execution can begin."
- Where: `P:calvin/paper.txt:120`.
- Holds when: always for Calvin; its measured scale was about 500,000 TPC-C new-order transactions per second on 100 nodes (`:242`).

### W37. The survey of deterministic databases: without access sets in advance transactions run almost serially, and for interactive transactions the choice is to declare the set or run serially.
- Mark: proven (survey).
- Quote: "if all transactions do not know their access-sets in advance, they must run approximately serially with no concurrency whatsoever." and "either the client must declare the access set ... or otherwise the system will default to (slow) serial execution."
- Where: `P:faleiro/paper.txt:53`, `:255`.
- Holds when: deterministic execution; a model session is an interactive transaction in this sense (hypothesis).

### W38. When locks are taken in one fixed order, deadlock cannot occur.
- Mark: proven (survey).
- Quote: "Deadlocks cannot occur in the system"
- Where: `P:faleiro/paper.txt:35`.
- Holds when: every lock is requested in the log's order, which needs the set before the run (W36).

### W39. Aria drops the need for advance sets by running a batch on one snapshot and aborting by a fixed rule: 2.4 times Calvin and 10.3 times a two-phase-locking engine at low contention, but only 39 % of its own throughput at skew 0.999, because aborted transactions are rerun.
- Mark: proven.
- Quote: "Aria achieves 1.1x, 1.6x, 1.4x, 3.3x, 2.4x and 10.3x higher throughput than AriaFB, BOHM, PWV-A, PWV-B, Calvin and PB on YCSB, respectively." and "when the skew factor is 0.999, Aria achieves only 39% of its original throughput when there is no skew"
- Where: `P:aria/paper.txt:437`, `:515`.
- Holds when: one node, 12 worker threads, YCSB 80/20, batch of 1,000, abort rate about 0.4 % in the uniform case (`:434`); reruns are cheap (`:289`).

### W40. Doppel: when every transaction increments one hot key, splitting it per core and applying the commuting updates separately gave 38 times OCC and 19 times 2PL; it requires the contended updates to commute and runs serially otherwise.
- Mark: proven.
- Quote: "When 100% of transactions increment the one hot key, Doppel performs 6.2x better than Atomic, 19x better than 2PL, and 38x better than OCC." and "contentious updates are commutative" and "Doppel would execute the transactions serially"
- Where: `P:doppel/paper.txt:334`, `:32`, `:554`.
- Holds when: 20 cores, in memory, one operation per record per phase; on a larger application the gain was 3 times (`:16`).

### W41. Doppel's phase change waits for every running transaction to finish.
- Mark: proven.
- Quote: "until all current transactions commit or abort"
- Where: `P:doppel/paper.txt:138`.
- Holds when: phases of about 20 ms; with units of minutes a barrier waits for the slowest unit (hypothesis).

### W42. The scalable commutativity rule: operations that commute can be implemented without conflicts, and an interface can be changed to make them commute (an open that must return the lowest free number does not).
- Mark: proven (operating-system result).
- Quote: "whenever interface operations commute, they can be implemented in a way that scales" and "must allocate the lowest unused file descriptor" and "commutativity suffices for conflict-free accesses, but it may not be necessary"
- Where: `P:clements/paper.txt:16`, `:486`, `:209`.
- Holds when: operations defined by an interface; a mail server reached 7.5 times from 10 to 80 cores with commutative APIs (`:572`).

### W43. Invariant confluence: operations that keep an invariant under merge need no coordination (25 times prior TPC-C results on 200 servers); sequential order numbers are the standard case that does need it; a wrongly stated invariant is not protected.
- Mark: proven (library quote).
- Quote: "over 12.7M TPC-C New-Order transactions per second on 200 servers, a 25-fold improvement over prior results" / "On a per-district basis, order IDs should be assigned sequentially" / "If invariants are incorrectly or incompletely specified, an I-confluent database system may violate application-level correctness."
- Where: `E:concurrency-lit-3-coordination-free.md:120`, `:121`, `:128`.
- Holds when: invariants and operations written down; a merge function exists.

### W44. Escrow lets long transactions draw on one bounded number without holding a lock for their whole length; the paper measures nothing.
- Mark: proven (method; no measurement in the text, `R:w1-collect-order.md:154-156`).
- Quote: "holding a lock on a quantity for the length of a transaction, even one that lasts just a second or so, is unacceptable."
- Where: `P:escrow/paper.txt:26`.
- Holds when: the shared object is a number with a checkable bound; source text is not such an object (hypothesis).

### W45. H-Store, single-threaded partitions with no concurrency control, ran 82 times a tuned commercial engine on a TPC-C variant, but the commercial engine spent about two thirds of its time in logging.
- Mark: proven (the authors' own single run).
- Quote: "H-Store ran 70,416 TPC-C transactions per second" and "spent about 2/3 of its total elapsed time inside the logging system"
- Where: `P:hstore2007b/paper.txt:208`, `:209`.
- Holds when: one dual-core machine, every transaction class made single-site by hand (`:203`), partial TPC-C, no high availability; it does not isolate the effect of ownership.

### W46. Partition ownership wins only while work stays in one partition: H-Store led to 800 cores for single-partition work and did not scale at four or more partitions per transaction; in another study, going from two to four partitions cut throughput 12 to 40 %.
- Mark: proven (library quotes).
- Quote: "H-STORE outperforms all other schemes up to 800 cores" ... "The DBMS does not scale with transactions accessing four or more partitions" and "From two to four partitions, performance drops by 12-40%."
- Where: `E:concurrency-lit-1-databases.md:162`, `:172`.
- Holds when: simulation to 1024 cores (Yu); 16 servers (Harding).

### W47. VoltDB, a production engine of the same design, limits work that crosses partitions to a few hundred updates per second by the vendor's own benchmarks.
- Mark: proven (self-reported: the vendor's figure as relayed by Jepsen).
- Quote: "multi-partition transactions are practically limited to a few hundred updates/sec"
- Where: `P:jepsen-voltdb/paper.txt:11`.
- Holds when: VoltDB 6.3; not measured by the analyst.

## E. Merging by structure, and the wrong clean merge

### W48. Semistructured merge cut conflicts in 60 % of 180 Java merge scenarios by 34 ± 21 %, and raised them in 26 % of scenarios by 109 ± 170 %.
- Mark: proven (library quote).
- Quote: "can reduce the number of conflicts in 60 % of the sample merge scenarios by 34±21 %" and "semistructured merge increases the number of conflicts by 109±170 %"
- Where: `E:concurrency-lit-3-coordination-free.md:184`, `:185`.
- Holds when: code parses; elements matched by name (a rename breaks it, `:185`).

### W49. On 34,030 scenarios from 50 Java projects semistructured merge reported about 24 % fewer conflicts than line merge, with no evidence of fewer wrong clean merges.
- Mark: proven (library quote).
- Quote: "This represents a semistructured merge reduction of approximately 24%" and "we find no evidence that semistructured merge leads to fe[wer false negatives]" (the line is cut at the file's width; the collector gives the same words at `R:w1-collect-merge.md:56-57`).
- Where: `E:concurrency-lit-3-coordination-free.md:188`.
- Holds when: real merge scenarios of human work; a false negative is a clean merge that is wrong.

### W50. Full structured merge reported 39 % of the conflicts of line merge; trying line merge first and switching to tree merge only where it conflicts was 5 times faster on average than pure tree merge.
- Mark: proven (library quote).
- Quote: "On average, structured merge reports 39 % of the number of conflicts and 24 % of the number of conflicting lines of unstructured merge." and "structured merge with auto-tuning is up to 12 times faster than purely structured merge, 5 times on average"
- Where: `E:concurrency-lit-3-coordination-free.md:198`, `:197`.
- Holds when: 8 Java projects, 72 scenarios.

### W51. A structured merge tool (Spork, after 3DM) does not report delete-versus-edit: a deletion silently overrides the other side's edits in the subtree.
- Mark: proven.
- Quote: "SPORK ig-" ... "nores so-called delete/edit conflicts, which occur when one" ... "revision deletes a subtree where the other revision performs" ... "edits. In 3DM-MERGE, such a deletion silently overrides any" ... "edits in the subtree"
- Where: `P:spork/paper.txt:1276-1280` (right column).
- Holds when: Java; the paper names it as its own limit.

### W52. Refactoring-aware merge, on 2,001 scenarios chosen for refactoring conflicts: RefMerge resolved or reduced conflicts in 25 %, IntelliMerge in 24 % while raising conflicting lines in 30 %.
- Mark: proven (preprint).
- Quote: "RefMerge resolves or reduces conflicts in 497 (25%) merge scenarios while increasing conflicting LOC in only 214 (11%) scenarios. On the other hand, we find that IntelliMerge resolves or reduces conflicts in 478 (24%) merge scenarios but increases conflicting LOC in 597 (30%) merge scenarios."
- Where: `P:refmerge/paper.txt:15-17`.
- Holds when: 20 Java projects; a pre-filtered set.

### W53. Three-way line merge (diff3) is guaranteed clean only for separated edits of two replicas; with several edited regions the guarantee fails, and it is not idempotent.
- Mark: proven (library quote; record r57-0302).
- Quote: "this generalization no longer ensures a conflict-free synchronization." and "Diff3 is not idempotent."
- Where: `E:concurrency-lit-3-coordination-free.md:166`, `:167`.
- Holds when: line-based text merge, as git runs it.

### W54. Of 52 non-trivial real merges, a textual tool (kdiff3) produced 5 merges that a verifier judged semantically incorrect, 3 after removing the verifier's own 2 false positives; the verifier took about 0.5 s per merge.
- Mark: proven.
- Quote: "we find five benchmarks for which kdiff3 generates a textual merge that is" ... "semantically incorrect according to SafeMerge. Among these five instances, two correspond to" ... "the false positives discussed earlier, leaving us with three benchmarks" and "an average of 0.5 second to verify each benchmark."
- Where: `P:safemerge/paper.txt:1156-1159`, `:1098`; the 52 at `:1013-1014`.
- Holds when: Java, one method at a time, a filtered set; not a rate for all merges.

### W55. Unit tests generated per change detected 9 of 28 known semantic conflicts in the best configuration.
- Mark: proven (preprint).
- Quote: "(nine detected conflicts out of 28)"
- Where: `P:sam/paper.txt:44`.
- Holds when: Java, 5 minutes of generation per tool, a hand-made ground truth.

### W56. Over 5,355 merges of three human projects, 16 % had textual conflicts, 1 % build failures and 6 % test failures (shares of all merges).
- Mark: proven (library quote; record r57-0305).
- Quote: "76 percent of merges completed cleanly, 16 percent of merges resulted in a textual conflict ..., 1 percent of merges resulted in a build failure ..., and 6 percent of merges resulted in a test failure"
- Where: `E:concurrency-lit-5-integration.md:183`.
- Holds when: open-source human merges; another study (four projects) found 5.6 to 35 % test failures of correct builds (`:184`).

### W57. All five operational-transformation algorithms model-checked fail to converge once there are more than two sites.
- Mark: proven (library quote; record r57-0304).
- Quote: "if the number of sites exceeds 2 then the convergence property is not satisfied for all OT algorithms considered here."
- Where: `E:concurrency-lit-3-coordination-free.md:74`.
- Holds when: those five algorithms, sites exchanging operations without a central order (compare W79).

## F. AI coding agents in one repository

### W58. Co-active pull requests by AI agents to one repository had textual conflicts in 19.8 % of same-agent pairs and 41.7 % of cross-agent pairs, a lower bound since build and semantic conflicts were not tracked.
- Mark: proven (preprint).
- Quote: "Intra-Agent Pairs (601 evaluatable out of 625): 19.8% tex-" ... "Cross-Agent Pairs (115 evaluatable out of 122): 41.7% tex-" and "no tracking is done for" ... "deeper build or semantic conflicts. Our results therefore provide a" ... "conservative lower bound."
- Where: `P:agentpr/paper.txt:190`, `:193`, `:330-333`.
- Holds when: PRs of hours to days against a moving main, overlap window 0 to 7 days, git merge-tree; a pair rate, not a rate for 3 to 16 sessions.

### W59. 42 % of those conflicts were structural (modify/delete or add/add).
- Mark: proven (preprint).
- Quote: "we have determined that 42% of the conflicts were struc-" ... "tural (modify/delete or add/add) whereas 58% were content-based"
- Where: `P:agentpr/paper.txt:335-336`.
- Holds when: as W58.

### W60. 27.67 % of agent pull requests conflicted with their target branch (not a pair rate), and the rate rose with size: about 9.9 % at a median churn of 2 lines, nearly 30 % at 25 lines.
- Mark: proven (preprint).
- Quote: "a conflict rate of 27.67%" and "PRs with a median churn of" ... "2 lines have a conflict rate of approximately 9.9%, whereas PRs with" ... "a median churn of 25 lines exhibit a conflict rate of nearly 30%."
- Where: `P:agenticflict/paper.txt:70`, `:317-320` (right column).
- Holds when: 107,026 simulated PRs from 59,412 repositories; conflicts against a base with human work; textual only; size is confounded with other factors.

### W61. Up to 5 Claude agents editing one shared CRDT document were 13.1 % slower than one agent on average (from 21.1 % faster to 39.4 % slower), and a 10 % inspection found 5-10 % semantic conflicts.
- Mark: proven (preprint, one author).
- Quote: "Parallel 13.1% slower overall with significant task-to-task" ... "variation: ranging from -21.1% speedup (Tic-Tac-Toe) to" ... "+39.4% slowdown (Algorithm Visualizer)" and "Manual inspection of 60/600 runs (10% sample)" ... "identified 5-10% semantic conflict rate with high task" ... "variance (20% for simple tasks, 80% for complex tasks)"
- Where: `P:codecrdt/paper.txt:280-282`, `:258-260`.
- Holds when: 6 TypeScript tasks, 50 runs per mode, Claude Sonnet 4.5; writes commute at the character level.

### W62. STORM put the database remedy on model sessions: each file has a version counter, a write must name the version it read, and it is rejected if the file or anything the agent read changed; with 4 engineers it reached 82.5 % macro pass rate against 63.8 % for isolated git worktrees and 66.4 % for one agent.
- Mark: proven (preprint; the authors' own benchmark runs).
- Quote: "every write must declare the" ... "expected version. The STORM layer validates the write against Eq. 3 by comparing the agent's full" ... "read snapshot Si to the current workspace state." and "On Commit0-Lite, STORM achieves 82.5% macro pass rate and" ... "46.2% weighted pass rate, outperforming single-agent (66.4% / 20.7%) and GitWorktree" ... "(63.8% / 24.6%)"
- Where: `P:storm/paper.txt:175-177`, `:76-78`; the mechanism is "inspired by optimistic concurrency control (Kung and Robinson, 1981)" (`:169-170`).
- Holds when: Sonnet 4.6, Commit0-Lite, a manager that assigns file sets; on PaperBench with 2 engineers the gain was 74.1 against 72.7 (`R:w1-collect-merge.md:216`).

### W63. STORM's own limits: writes through bash bypass it, its file grain rejects two agents editing different functions of one file, and heavily shared files become serial points.
- Mark: proven (preprint).
- Quote: "STORM mediates the file_editor tool but not direct filesystem writes" ... "through bash" and "Two agents editing different functions in the same file trigger a false-positive" ... "rejection. Heavily shared files (e.g., __init__.py) become serialization bottlenecks."
- Where: `P:storm/paper.txt:1127-1128`, `:1134-1135`.
- Holds when: as W62.

### W64. In STORM, first-round overlap of file scopes rose from 21.7 % at 4 engineers to 35.1 % at 8 and tracked rejected reviews (r = 0.78 within 8); cost grew about linearly with engineers while wall-clock time stayed about constant.
- Mark: proven (preprint).
- Quote: "21.7% of first-round tasks overlap another's file scope. At k=8" ... "first-round overlap rises to 35.1%" ... "r = 0.78 within k=8" ... "additional engineers create contention faster than useful" and "Cost scales approximately linearly with the number of engineers" ... "clock time remains roughly constant"
- Where: `P:storm/paper.txt:491-495`, `:379-380`.
- Holds when: 2, 4, 8 engineers; 16 repositories; cost in the paper's dollars (199, 292, 429: 2.2 times from 2 to 8).

### W65. CAID (isolated worktrees, a manager, tests per merge): on Commit0-Lite with Claude Sonnet 4.5, 59.1 % against 53.1 % for one agent but 1,583 s against 693 s and about 4.3 times the cost; worktrees beat instruction-only separation (59.1 against 56.1; 63.3 against 55.5 on PaperBench); going from 4 to 8 engineers lowered the score.
- Mark: proven (preprint).
- Quote: table row "53.1 692.6 1.9 59.1 1583.2 8.1"; "soft isolation" ... "improves over single-agent from 53.1% to 56.1%" ... ""worktree isolation" further increases perfor-" ... "mance to 59.1%" ... "On PaperBench" ... "Soft isolation drops to 55.5%, below the single-agent score" ... "of 57.2%, while "worktree isolation" reaches 63.3%."; "performance improves when increasing engineers from 2 to" ... "4 (53.1% single-agent to 59.1%), but decreases when expanding to 8 engineers."
- Where: `P:caid/paper.txt:324`, `:420-430`, `:448-450`.
- Holds when: greenfield library and paper-reproduction tasks; the abstract gives +14.3 and +26.7 points (`:27`).

### W66. Co-Coder, which partitions the work by a static dependency graph and starts a file only when its upstream files are done, lifted DevEval pass rate from 56.8 % to 68.1 % with a 1.81 times speed-up and 28 % less cost; one file per agent without that structure cost 44 % more for no gain, and Claude Code with Agent Teams was fastest and cheapest but scored lowest (16.3 %).
- Mark: proven (preprint; generation from a specification, not edits to an existing repository).
- Quote: "it lifts average pass rate from" ... "56.8% to 68.1% over the sequential version while delivering a 1.81x speedup and a 28% cost" ... "reduction" and "inflates cost by 44% ($0.36 vs. $0.25) for a negligible pass-rate gain (57.7% vs. 56.8%)." and "Claude Code w/ Agent Teams achieves the lowest latency (680 s) and cost" ... "($0.38) but again at the expense of the lowest pass rate (16.3%), falling below even the sequential"
- Where: `P:cocoder/paper.txt:102-104`, `:484`, `:546-548`.
- Holds when: base model gpt-5-mini; 28 projects; on CodeProjectEval the speed-up was 2.10 times (`:104`).

## G. Long and cooperative transactions

### W67. Long transactions make automatic aborts (deadlock avoidance, failed optimistic validation) more likely.
- Mark: proven (survey).
- Quote: "LTs" ... "also increase the likelihood of automatic aborts (rollback), in order to avoid deadlock, or in the" ... "case of failing validation in optimistic concurrency control."
- Where: `P:barghouti/paper.txt:755-757`.
- Holds when: units of minutes to weeks in design and software environments (`:747-749`).

### W68. Restarting a long transaction that did much work is very undesirable, starvation risk grows with length, locking the whole database for the starver is not acceptable, and the proposed remedy lets a substitute with the starver's sets validate first.
- Mark: proven (survey; the remedy is Pradel and others 1986, not opened).
- Quote: "It is very undesirable, however, to restart a long transaction that has done" ... "a significant amount of work." / "the longer the transaction is the greater the risk of starvation." / "Such a solution is clearly not acceptable for advanced applications." / "a substitute transaction"
- Where: `P:barghouti/paper.txt:894-895`, `:927`, `:933`, `:934`.
- Holds when: optimistic control; the substitute assumes the rerun has the same read and write sets (for a model session it does not: hypothesis).

### W69. In Sun's NSE, writers in private copies merge with what others deposited instead of rolling back, and a command tells a writer which objects others changed since its copy.
- Mark: proven (survey).
- Quote: "If conflicts are discovered, rather than rolling back transactions, the users of conflicting" ... "updates have to merge their changes, producing a new version of the object." and "NSE provides a command, resync, to do that" ... "automatically on demand. Resync will inform Mary that John has changed procedure p5."
- Where: `P:barghouti/paper.txt:1799-1800`, `:1824-1825`.
- Holds when: human developers who merge by hand.

### W70. Conflicts can be notified as soon as they occur or only at commit, with people resolving them, and people may not really resolve them.
- Mark: proven (survey).
- Quote: "Immediate notification alerts the user of any conflict" ... "as soon as the conflict occurs. Delayed notification alerts the user of all the conflicts that have" ... "occurred only when one of the conflicting transactions attempts to commit." and "humans might not really"
- Where: `P:barghouti/paper.txt:1983-1986`, `:1992`.
- Holds when: interactive users.

### W71. The survey found no performance metrics for these mechanisms and only one empirical study.
- Mark: proven (survey).
- Quote: "A problem that remains unsolved is the lack of performance metrics by which to evaluate" ... "We have encountered only one empirical study [Yeh et al. 87]"
- Where: `P:barghouti/paper.txt:2406-2408`.
- Holds when: the survey's field as of 1991; the collectors of topic `long` found no later measurement either (`R:w1-collect-long.md:243-246`).

### W98. Writers modifying two parts of one object may need to look at each other's unfinished work to keep their parts easy to integrate, which serializable control (a snapshot per writer) forbids.
- Mark: proven (survey).
- Quote: "modifying two parts of the same object concurrently, with the intent of integrating" ... "these parts to create a new version of the object. In this case, they might need to" ... "look at each others' work" ... "To insist on" ... "serializable concurrency control in design environments might thus decrease con-" ... "currency or, more significantly, actually disallow desirable forms of cooperation"
- Where: `P:barghouti/paper.txt:706-712`.
- Holds when: cooperating human designers; for sessions, a notice of another's change (W69) is the nearest form (hypothesis).

### W72. In the CAD transaction model a system-induced abort (deadlock, crash) aborts only the current short transaction, not the designer's enclosing cooperating transaction.
- Mark: proven (formal model; no implementation or figure).
- Quote: "an abort induced by the system, due to a" ... "deadlock or system crash, will result in an abort of the current" ... "shortduration transaction, rather than the cooperating transac-"
- Where: `P:bkk85/paper.txt:508-512` (right column).
- Holds when: the designer divides the work into short transactions "essentially for recovery purposes" (left column, same lines).

### W73. Split-transactions: a long transaction becomes a concurrency bottleneck because it keeps what it updated; it can be split so a finished part commits early, when the two parts' read and write sets allow a serial order.
- Mark: proven (design; no experiment).
- Quote: "ond, long transactions become concurrency bottlenecks" ... "because updated resources are retained for the dura-" ... "tion of the transaction." and "If both ShareSet and BUriteLast are empty, we call" ... "this the independent case"
- Where: `P:split/paper.txt:24-26` (right column), the split conditions at `:113-141`.
- Holds when: the transaction is quiescent when split (`:136`) and the sets of both parts can be named.

### W74. A saga's compensating step undoes a step semantically and need not restore the earlier state; the paper reports no measurement.
- Mark: proven (poor OCR copy; no measurement, `R:w1-collect-long.md:290`).
- Quote: "The compensatmg [sic]" ... "transaction undoes, from a semantic point of" ... "view, any of the actions performed by T,, but" ... "does not necessarily return the database to the" ... "state that existed when the execution of T,"
- Where: `P:sagas/cornell-text.txt:79-88` (right column).
- Holds when: every step has a programmer-written compensation; partial results are visible to others.

### W75. In one subsystem of a large telephone switch over 12 years, 12.5 % of deltas were made to the same file by different developers within 24 hours, 3 % of those physically overlapped, and the authors believe many more conflicts are semantic.
- Mark: proven (observational study; the semantic share is the authors' belief, not measured).
- Quote: "12.5% of all deltas are" ... "made to the same file by different developers within 24 hours of each other." and "3% of the deltas made within 24 hours by different" ... "developers physically overlap each others' changes." ... "We believe that many more conflicts arise as a result of parallel" ... "result of semantic interference."
- Where: `P:perry/paper.txt:1142-1143`, `:1154-1159`.
- Holds when: human changes lasting hours to days; up to 200 developers.

### W76. In the same study the degree of parallel change on a file correlated with its defects even after lifetime, size and number of deltas; 55 % of files never had more than one change open at a time and 0.6 % had more than 6.
- Mark: proven (observational; a correlation, cor 0.63 with PCdays at `:1060`).
- Quote: "There is a significant correlation between files with a high degree of" ... "parallel development and the number of defects. Moreover, even account-" ... "ing for lifetime, size, and number of deltas" and "55% of the files never had more than one MR at a time" ... "0.6% of the files had more" ... "than 6 parallel MRs."
- Where: `P:perry/paper.txt:1291-1293`, `:875-878`.
- Holds when: as W75.

## H. Real systems (company accounts; every figure self-reported)

### W77. Figma resolves simultaneous edits at a central server per (object, property): different properties or objects never conflict; the same property ends with the last value sent; two edits of one text value keep only one.
- Mark: proven (self-reported; the post gives no figures).
- Quote: "A conflict happens when two clients change the same property on the same object, in which case the document will just end up with the last value that was sent to the server." and "the end result will be either AB or BC but never ABC."
- Where: `P:figma-multiplayer/paper.txt:130`, `:132`.
- Holds when: one server process per document (`:93`); data as independent properties.

### W78. Figma's server rejects any parent change that would create a cycle in the document tree: an invariant across items checked at each write.
- Mark: proven (self-reported).
- Quote: "Figma's multiplayer servers reject parent property updates that would cause a cycle"
- Where: `P:figma-multiplayer/paper.txt:146`.
- Holds when: as W77.

### W79. Google Docs rejected paragraph locks (two editors can each believe they hold one) and instead orders all changes at a server that transforms a late change against revisions committed since the editor last synced; each client keeps one change in flight.
- Mark: proven (self-reported; no figures).
- Quote: "locking paragraphs isn't a great solution" and "one of the editors will find out that he didn't actually acquire the paragraph lock" and "The server will use OT to transform John's change so that it can be stored as Revision 3." and "we never send more than one pending change at a time"
- Where: `P:google-docs/ot.txt:52-55`, `:56-59`, `:257-259`, `:235-237`.
- Holds when: three change types with a transform for every pair; the posts' own hedge "If OT is implemented correctly" (`:128-130`).

### W80. Google's single repository lands all changes in one serial order (about 16,000 human and 24,000 automated changes a day), rebuilds affected dependencies after each change and undoes a change that breaks widely; long-lived branches are exceedingly rare; no conflict or rollback rate is given.
- Mark: proven (self-reported, January 2015 figures).
- Quote: "Changes are made to the repository in a single, serial ordering." / "they commit 16,000 changes to the codebase, and another 24,000 changes are committed by automated systems" / "a system is in place to automatically undo the change." / "Use of long-lived branches with parallel development on the branch and mainline is exceedingly rare."
- Where: `P:google-piper-cacm/paper.txt:101`, `:83`, `:105`, `:102`.
- Holds when: per-person workspaces, presubmit checks, a large build farm.

### W81. Microsoft moved Windows (about 4,000 engineers) to one Git repository and found its pull-request and merge-conflict tools did not scale to bulk merges of tens of thousands of changes with thousands of conflicts.
- Mark: proven (self-reported).
- Quote: "often has VERY large merges across branches (10,000's of changes with" ... "1,000's of conflicts" ... "simply didn't scale to changes that large."
- Where: `P:msft-bharry/paper.txt:73` (HTML entities in the text).
- Holds when: many long-lived branches merged in bulk (not trunk-based).

### W82. Discord's store resolved conflicts by last write wins per column; an edit racing a delete left a row with only its key and text, which they detected and deleted at read; the later migration was driven by read hot spots, not write contention.
- Mark: proven (self-reported).
- Quote: "'last write wins' semantics on a per column basis" and "we ended up with a row that was missing all the data except the primary key and the text" and "reads are more expensive than writes"
- Where: `P:discord-billions/paper.txt:126`, `:127`; `P:discord-trillions/paper.txt:101`.
- Holds when: Cassandra, every write an upsert.

## I. Our harness and our work (library facts)

### W83. Of our 14 units to build, 3 can run at once if each file has one writer, 7 if each function or block has one, and 8 only when places are split to statements with 0b built first; they share 20 places: 9 separate entries, 7 ordered sequences, 4 places where the same statements change.
- Mark: measured here (r57-0128, status measured: counted from the change list, not from diffs).
- Quote: "3 can be built at once if each file has one writer (3 to 5 by how files are grouped) and 7 if each function or block has one (5 to 7 by how places are grouped); 8 is reached only when places are split down to statements and 0b is built first"
- Where: `library/journal/2026-11-18/r57b.jsonl:18`.
- Holds when: our harness build; one repository (r57-0028).

### W84. One run of our tree's suite took 596 s with one test file at a time.
- Mark: measured here (r57-0103, status measured; one run).
- Quote: "took 596 s with one test file at a time (--test-concurrency=1)"
- Where: `library/journal/2026-11-18/r57.jsonl:27`.
- Holds when: other programs running; side-by-side files untested.

### W85. The tier hook acts only before helper starts and session starts: it does not look at Write, Edit or shell calls.
- Mark: measured here (observed; b1-0108).
- Quote: "The tier hook acts on PreToolUse only, looks only at helper (Agent) and start_session calls and refuses by exit 2"
- Where: `library/journal/2026-11-18/b1.jsonl:8`.
- Holds when: this repository's project settings only.

### W86. A hook was seen to refuse a write outside an allowed folder, and hooks fire for tool calls inside a helper; not tested for the Edit tool, writes through shell commands or a hook that times out.
- Mark: measured here (observed once; r57-0105).
- Quote: "a hook refused a write outside an allowed folder" ... "and hooks fire for the tool calls inside a helper" ... "not tested for a hook that times out, the Edit tool or writes through shell commands."
- Where: `library/journal/2026-11-18/r57.jsonl:29`.
- Holds when: one session, Haiku, app version 2.1.325.

### W87. The tree's run-time writers share no work file: each child writes only its staging folder, objects are stored by exclusive create, disagreeing verdicts become 'unclear', and the task table is written by compare-and-set on its revision.
- Mark: measured here (observed; b1-0121).
- Quote: "a child writes only its own staging folder, objects are stored by exclusive create and never repaired, two disagreeing verdicts make the item 'unclear', and the task table is written by compare-and-set on its revision."
- Where: `library/journal/2026-11-18/b1.jsonl:21`.
- Holds when: the research tree, not harness builds.

### W88. For harness builds, every several-writers part of the rule is unbuilt: conflicts per file are not logged, and the merge script, the modes table, the Write/Edit refusal branch and the build plan are new files still to write.
- Mark: measured here (observed; the gated build-in design).
- Quote: "| Shared files | Conflicts per file or function; claims held | See "Several writers" below | MOCC, Moenkeberg-Weikum (both narrowed) | No |" and "New `research-tree/tools/merge.mjs` (`mergeUnit`, `countConflict`); a modes table" ... "`tier-hook.mjs` Write/Edit branch; the build" ... "plan, which does not exist yet (C110)." and "only Write was seen refused (C48)."
- Where: `D:DECISION-RULE.md:76`; `D:BUILD-IN.md:303-305`, `:312`.
- Holds when: as read on 2026-11-19.

### W89. Tokens per helper can be counted from the transcripts on disk, so the token cost of a redone unit can be counted without a run.
- Mark: measured here (observed; b1-0111).
- Quote: "tokens per unit by kind and model can be counted without a run."
- Where: `library/journal/2026-11-18/b1.jsonl:11`.
- Holds when: helpers whose transcripts are kept.

## J. Our case against the literature (hypotheses, and one bound)

### W90. A law in ratios for one file: if N writers each touch k of F equally likely regions, the chance two units overlap is p = 1 − (1 − k/F)^k, about k²/F, and the chance a given unit meets at least one other is 1 − (1 − p)^(N−1), about (N − 1) k²/F while that is small. So going from 2 to 16 writers multiplies a unit's conflict chance by up to 15, and holding it fixed needs F/k² 15 times larger (finer claims or smaller units).
- Mark: hypothesis (computed). Examples: p = 1 % gives 1 % at N = 2 and 14 % at N = 16; p = 10 % gives 10 % and 79 %.
- Basis: standard counting under uniform access, the assumption of the measured grain studies (W16, W18); hot spots break it (W15, W24), so p must be measured per region from history, not computed from F.
- Where: arithmetic in this block; no source states it for files.

### W91. At file grain F = 1, so p = 1: every pair of writers of a file conflicts; this matches our count of 3 units at once at file grain against 7 at function grain (W83).
- Mark: hypothesis (computed; the match is with a count, not a run).
- Basis: W90 with F = k = 1; W83.

### W92. On a file every unit touches (a small file, or one hot place such as a registry), every method lands at most about one unit per unit time, and optimistic control spends up to N − 1 redone units per landing on top; so only waiting or reshaping the file is token-efficient there, and the waste of optimism grows with N.
- Mark: hypothesis (reasoned).
- Basis: under very high contention all engine designs converge to the same low throughput (W27, W28); a hot counter aborts under OCC and serializes under 2PL alike (W24); one transaction always commits under OCC but the rest redo (W21); aborts are acceptable only when cheap (W30) and long units favour waiting (W31, W34).

### W93. Claims a unit names before it starts can be taken in one fixed order and then cannot deadlock; places a session discovers while working cannot be ordered, so they must be validated at landing (optimistic) or claimed without waiting.
- Mark: hypothesis (reasoned).
- Basis: ordered acquisition removes deadlock but needs the set first (W38, W36, W37); coarse claims held to the end deadlocked and forced re-execution (W18); a model session learns its set as it works (W37, interactive).

### W94. If a unit commits its work in its own copy at checkpoints, a conflict or failed check costs the steps since the last checkpoint, not the whole unit.
- Mark: hypothesis (reasoned; no source measured it, W71).
- Basis: system aborts that cost only the current short transaction (W72); early commit of a finished part (W73); compensation per step (W74).

### W95. The longest units in the engine papers read are seconds: FoundationDB's 5-second window and Tanabe's inserted delay of up to 10 ms; no engine paper measured a unit of minutes or a rerun that differs from the first run.
- Mark: proven (the two figures); the absence is the collectors' search (`R:w1-collect-engines.md:297-298`).
- Quote: "FDB chooses a 5-second MVCC window" and "Inserted delays for long transactions: 0 to 10 ms."
- Where: `P:foundationdb/paper.txt:450`; `P:tanabe/paper.txt:782`.
- Holds when: the engine papers of topics `isolation`, `grain`, `engines`, `order`.

### W96. Escalation by share, not by count: promote a unit's claims on regions of a file to a claim on the whole file when they cover a set share of its regions, and hand back (de-escalate) when another writer waits.
- Mark: hypothesis (reasoned).
- Basis: engines escalate by an absolute count because their cost is lock memory (W19), which is not our cost; the best grain moves with how much a unit touches (W17); one bad escalation stops all others (W20); a ratio holds for small and very large files alike (r57-0028).

### W97. The harness could record what a session read only through its file-reading tool: reads through a shell, and what the model holds from earlier, are invisible, as reads outside the database are to SSI and bash writes are to STORM.
- Mark: hypothesis (reasoned; a hook on the read tool was never tested, W86).
- Basis: W07, W63, W86.

---

## Counts by mark

| Mark | Claims |
|---|---|
| proven | W01-W82, W95 and W98 (84). Of them: self-reported W33 (its conflict rate), W47, W77-W82; preprint W52, W55, W58-W66; simulation W16-W18, W27, W34; documentation W09 (in part), W11-W13, W19; survey, model, design or argument without measurement W10, W15, W20, W37, W38, W44, W67-W74, W98; library quotes whose paper text is not in this repository W21-W28, W34, W43, W46, W48-W50, W53, W56, W57 |
| measured here | W83, W84 (status measured); W85-W89 (status observed) |
| hypothesis | W90, W91 (computed); W92, W93, W94, W96, W97 |

Totals: 98 claims: proven 84 (W01-W82, W95, W98), measured here 7 (2 measured, 5 observed), hypothesis 7 (2 computed).
