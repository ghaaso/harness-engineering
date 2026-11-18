# w1 collect: topic `order` (order fixed before work; writes that commute; partition ownership)

Date: 2026-11-19 (papers fetched 2026-11-18/19). Collector: sonnet, lane writers (w1), task r57-0512.
`R:` = `docs/program/evidence/round3-2026-11-18/`. `E:` = `docs/program/evidence/harness-method-status-2026-11-18/`.
Every `paper.txt` line below is of the non-layout `pdftotext` output, so a line is one paragraph (long lines).
A character shown as the multiplication sign comes out as an unprintable mark in some files; I write it "x".

Library records reused (read at their cited place in `E:` first, as the brief says): x02-0370 to x02-0375 (Calvin),
x02-0320 and x02-0324 to x02-0335 (Yu 2014, Harding 2017), x04-0300 to x04-0309 (Clements), x04-0350 to x04-0361
(Bailis), r57-0303. Where I could, I also read the paper itself and cite the paper's line (Calvin, Clements). The
line numbers the library gives for Calvin (l.89, l.200 ...) do NOT match a fresh `pdftotext`; the quotes are right,
the numbers are not (the extractor's text had other line breaks). I cite my own lines.
Bailis and Harding were not fetched again (held `quoted`, read in `E:`); they are cited to `E:`.

Papers: 7 read in full (`quoted`): Calvin, Abadi and Faleiro, Aria, escrow (O'Neil), Doppel, H-Store demo paper
(Kallman and others 2008), Clements. 1 test report read in full (Jepsen on VoltDB). 2 held `quoted` and reused
(Bailis; Harding for Calvin). 1 `summary` (Stonebraker 2007, only a student's slide deck found). Not opened: see end.

---------------------------------------------------------------------------------------------------------------

## 1. Calvin (Thomson, Diamond, Weng, Ren, Shao, Abadi; SIGMOD 2012)

- **Citation / URL**: "Calvin: Fast Distributed Transactions for Partitioned Database Systems";
  http://cs.yale.edu/homes/thomson/publications/calvin-sigmod12.pdf. Saved `R:papers/w1/calvin/paper.txt` (349 lines).
  Status: `quoted` (read the cited paragraphs; not every page).
- **Problem.** Distributed transactions hold locks across two-phase commit, so hot records stall (the "contention
  footprint"). `paper.txt:44-46`: "the total duration that a transaction holds its locks-- which includes the duration of
  any required commit protocol--as the transaction's contention footprint."
- **Mechanism.** A sequencing layer fixes one global order of transaction requests per epoch before any runs;
  locks are then taken in that order, so every replica reaches the same state and no commit agreement is needed.
  `paper.txt:89`: "Calvin divides time into 10-millisecond epochs during which every machine's sequencer component
  collects transaction requests from clients."
- **Measured gain.**
  - TPC-C New Order only, EC2 cluster: `paper.txt:242`: "Calvin is able to achieve around 5000 transactions per second
    per node in clusters larger than 10 nodes, and scales linearly." and "nearly half a million TPC-C transactions per
    second on a 100 node cluster." Baseline named in the paper: "the present TPC-C world record holder (Oracle) runs
    504,161 New Order transactions per second, despite running on much higher end hardware" (same line). That is a
    comparison with a published record, not a controlled run against a lock-based engine. Contention: TPC-C's own
    (about 10 percent multi-warehouse, `paper.txt:198`).
  - Against two-phase commit the paper gives a model, not a measurement. `paper.txt:296` ("a simple model of the
    contention-based slowdown") and `paper.txt:306`: "the model of the system running two-phase commit incurs
    significantly more slowdown than Calvin" at very high contention. The model assumes 8 ms of lock time per
    distributed transaction (library x02-0374; `E:concurrency-lit-1-databases.md:111`). No factor is measured.
  - Its own cost: `paper.txt:306`: "under low contention, Calvin gets the same approximately 5x to 7x slowdown--from 27000
    to about 5000 (4 nodes) or 4000 (8 nodes) transactions per second" going from 1 machine to 4 or 8; cause named
    `paper.txt:257`: "Execution progress skew ... The more machines there are, the more likely at any given time
    there will be at least one that is slightly behind". Worse at high contention.
  - Independent measure of the same design (Harding and others 2017, held; `E:concurrency-lit-1-databases.md:172-175`):
    except Calvin throughput "plummets when transactions touch more than one partition" for the others (12 to 40 percent from
    two to four partitions); Calvin "emerges as the most consistent protocol" once skew reaches a critical point; with
    data-dependent aborts Calvin fell 36 percent at theta 0.6 on 16 servers and from 73k to 19k transactions per second
    between theta 0.8 and 0.9; on PPS (reconnaissance queries) Calvin "flat-lined ... about 7k". `quoted` via `E:`.
- **Assumes.** The whole transaction is submitted at once; every read and write set is known before it starts.
  `paper.txt:120`: "Transactions which must perform reads in order to determine their full read/write sets (which we
  term dependent transactions) are not natively supported in Calvin since Calvin's deterministic locking protocol
  requires advance knowledge of all transactions' read/write sets before transaction execution can begin." The patch
  (OLLP) is a read-only reconnaissance query first and a restart if the set changed (same line): "the process have to
  may be (deterministically) restarted if the 'reconnoitered' read/write set is no longer valid." Also: deterministic
  code, a replicated sequencer.
- **For model-session writers** (`reasoned`).
  - Read and write set known before work: false for a session. What a session edits is found while it works (it reads,
    then decides). OLLP is the nearest form: a cheap first pass that reports the files it would touch, then the real run.
    It costs a full extra pass in tokens, and the second run is not the same run (not deterministic), so the set can
    differ again: the restart case is the normal case, not the rare one.
  - Unit of minutes against a 10 ms epoch: the epoch (batching delay) is no problem; holding a lock for the run is.
    Calvin's locks are held for the transaction's duration (`paper.txt:44-46`); a minutes-long unit means a long
    contention footprint, the very thing the paper sets out to shorten.
  - Determinism (replicas reach the same state from the same input log) has no use here: there are no replicas and a rerun
    differs. Only the ordered lock grant survives.
  - 3 to 16 writers is far under any scale in the paper (4 to 100 nodes of many threads).
- **Frame.** Means (2) "fix the order before work starts, so nothing is redone": the paper says this needs the sets
  in advance; without them the work IS done twice (reconnaissance) or redone (restart). The frame's "nothing is
  redone" is wrong in the general case. Also: the frame has no failure called deadlock; ordered lock acquisition
  removes it (see Abadi and Faleiro, section 3).

## 2. Abadi and Faleiro, "An Overview of Deterministic Database Systems" (CACM 61(9), 2018)

- **Citation / URL**: https://www.cs.umd.edu/~abadi/papers/abadi-cacm2018.pdf (the guessed `abadi-faleiro-2018.pdf` gave
  404; the author's page copy is this one). `R:papers/w1/faleiro/paper.txt` (311 lines). Status: `quoted`. The
  trusted survey for this means.
- **Problem.** What determinism buys and costs, and the ways to run transactions concurrently while staying deterministic.
- **Mechanism.** A canonical record of the input is made first (one thread on one machine; a Paxos log in Calvin).
  Three ways to run concurrently: partitioning (H-Store), locks requested in log order (Calvin), dependency graphs (BOHM).
  `paper.txt:47`: "H-Store partitions the database across the number of cores ... A single thread runs on each core".
- **Measured gain.** This is an overview; its text states no figure of its own. It cites one chart: Figure 2, BOHM against
  single-version locking and non-deterministic MVCC "for a high conflict workload" (`paper.txt:177`: "The higher the
  overlap of the read and write sets across transactions, the higher the improvement in concurrency"). The numbers are
  in the figure, not in the text, and I did not read them off. Also a cited cost: log generation takes "approximately
  11% of all CPU cycles" in non-deterministic engines (`paper.txt:231`, secondary citation).
- **Assumes.** Advance knowledge of the access set; `paper.txt:53`: "if all transactions do not know their access-sets in
  advance, they must run approximately serially with no concurrency whatsoever." And `paper.txt:255`: "OLLP adds latency
  and increases the cost of processing the transaction ... OLLP cannot be used in conjunction with 'interactive
  transactions' ... for interactive transactions, there is an information vs. performance tradeoff: either the client
  must declare the access set ... or otherwise the system will default to (slow) serial execution." The abstract names the
  two drawbacks: no interactive transactions, and preprocessing before execution (`paper.txt:8`).
  OLLP in detail `paper.txt:57`: the trial run "does not write to the database state", then the real run aborts and is
  resubmitted if the lock set was wrong.
- **For model-session writers** (`reasoned`). A session is an interactive transaction by this paper's own definition (a client
  talks to it over many steps and the next step depends on what it saw). The paper's stated choice for that case is to declare
  the set or run serially. That is the harness's two-way switch today: serial per file, or merge. The paper therefore gives
  no third way for interactive work; what it gives is the price list (declare, or serial). Deadlock cannot occur when locks
  are taken in the log order (`paper.txt:35`: "Deadlocks cannot occur in the system"): that part carries.
- **Frame.** Confirms: order-first needs the access set. Adds a means the frame lacks: partition ownership with a single
  thread per partition (no concurrency control at all inside a partition; `paper.txt:47`), which is a limit case of
  "one owner", plus a cost the frame omits: the preprocessing/trial-run pass.

## 3. Aria (Lu, Yu, Cao, Madden; PVLDB 13(11), 2020)

- **Citation / URL**: https://vldb.org/pvldb/vol13/p2047-lu.pdf. `R:papers/w1/aria/paper.txt` (614 lines). Status: `quoted`.
- **Problem.** Deterministic databases (Calvin, BOHM, PWV) need the read and write sets before execution (`paper.txt:6`).
- **Mechanism.** Run a batch of transactions in parallel against one snapshot (execution phase), reserve writes by
  transaction id, then in the commit phase each transaction commits or aborts by a fixed rule from the reservations; aborted ones
  are rerun in the next batch. A reordering rule turns read-after-write dependencies into write-after-read to abort fewer
  (`paper.txt:57-58`). A fallback phase reruns conflicting ones in Calvin style when the abort rate is high (`paper.txt:373-376`).
- **Measured gain** (single node, 12 worker threads per node `paper.txt:417`, YCSB 80/20 read/write, uniform access, batch 1K,
  `paper.txt:430-433`):
  - `paper.txt:437`: "Aria achieves 1.1x, 1.6x, 1.4x, 3.3x, 2.4x and 10.3x higher throughput than AriaFB, BOHM, PWV-A, PWV-B,
    Calvin and PB on YCSB, respectively." PB is a primary-backup engine with strict two-phase locking and NO_WAIT
    (`paper.txt:415`). Contention here is low (uniform; abort rate about 0.4 percent, `paper.txt:434`).
  - Reordering: `paper.txt:517`: "when the skew factor is 0.999, Aria achieves 3.0x higher throughput than Aria w/o D.R."
  - Loss under skew: `paper.txt:515`: "when the skew factor is 0.999, Aria achieves only 39% of its original throughput when
    there is no skew ... many transactions have to be re-run multiple times." Aria falls below PWV-A at skew above 0.8 and
    below BOHM above 0.9 (same line).
  - TPC-C subset, 180 partitions (`paper.txt:524`): "1.9x, 1.2x and 7.4x higher throughput than BOHM, Calvin and PB", and
    "comparable throughput to PWV". With few warehouses Aria is worse because of one contended write (`paper.txt:523`).
  - Cluster of eight nodes, scaling to 192 partitions (`paper.txt:560`); I did not extract figures.
- **Assumes.** Short transactions as pre-compiled stored procedures (`paper.txt:391`); cheap rerun of an aborted transaction
  (aborts "will be re-executed in the next batch", `paper.txt:289`); deterministic code (replicas must agree); a batch
  barrier (all of a batch executes, then commits). The paper's own condition for winning (`paper.txt:372`): "few
  RAW-dependencies and WAW-dependencies between transactions in a batch". Write-write conflicts on one record always abort
  the later transaction (`paper.txt:184`).
- **For model-session writers** (`reasoned`). The mechanism here is optimistic execution plus a deterministic abort rule, i.e.
  first-writer-wins on a batch: the frame's remedy for lost update, moved to the batch boundary. The rerun costs a whole
  session (tokens), not a microsecond; the paper's own numbers show the price of reruns: 39 percent of throughput under high
  skew with reruns. A batch barrier means waiting for the slowest session of the batch. Deterministic reordering needs the
  read and write sets from the finished run (which a session can report), so the reorder rule could be applied after the run,
  without needing the sets in advance; that is the one part that carries well. Determinism itself does not (replicas, same input).
- **Frame.** Corrects means (2): "order first" can drop the advance-knowledge condition (Aria), and the price is that
  conflicting work is redone. So "nothing is redone" holds only for work whose sets were known.

## 4. Escrow (O'Neil; ACM TODS 11(4), 1986)

- **Citation / URL**: "The Escrow Transactional Method"; open copy at the author's page
  https://www.cs.umb.edu/~poneil/EscrowTM.pdf (the ACM gateway link returned a 5 KB page, not a PDF).
  `R:papers/w1/escrow/paper.txt` (577 lines). Status: `quoted`. Upgrades library `x02-0219` (textbook only).
- **Problem.** A hot aggregate field (stock on hand) serialises writers if locked for a transaction's length. Abstract
  (`paper.txt:3`): updates "by long-lived transactions without forbidding simultaneous access by other users"; `paper.txt:26`:
  "holding a lock on a quantity for the length of a transaction, even one that lasts just a second or so, is unacceptable."
- **Mechanism.** A transaction asks the system to set aside a quantity of the field, with a test on what remains
  (`paper.txt:90`). The system keeps bounds `inf(A)` and `sup(A)`, "The lowest / highest value A might assume from any
  combination of commits and aborts of currently live transactions" (`paper.txt:115`). A request that keeps every live test true
  is granted at once; commit applies the journal and abort returns the quantity (`paper.txt:70`, 94). Journals can be applied in any
  order (`paper.txt:70`).
- **Measured gain.** None. The paper is a method with worked examples and a recovery argument; I searched the text for measure,
  experiment, benchmark, speedup, throughput and found no measurement (only a sentence about not bottlenecking throughput,
  `paper.txt:312`). So no gain figure exists in this source.
- **Assumes.** Updates are increments or decrements of a number with a checkable bound; the system is "an expert" on the type
  of update (`paper.txt:53`). Tests restricted to the form `F >= C` (`paper.txt:107`). Mixed reads/writes of the same field force
  normal locking, and the author notes "Since the Escrow Method permits extremely long-lived transactions, this result may be
  less useful than it appears" (`paper.txt:470`). Waiting on a failed test brings deadlock whose detection is NP-complete
  (`paper.txt:379`, "It has been demonstrated in a separate paper that an algorithm to detect this sort of deadlock is
  NP-complete"), treated as rare and handled by heuristics such as timeout (`paper.txt:380`).
- **For model-session writers** (`reasoned`). This is the one paper of the set designed for long-lived units with a human in the
  middle (abstract), the right time scale. But the object must be a number with a bound. Candidates in a repository: a shared
  budget the sessions draw from (tokens, minutes of the serial test run, count of fixes allowed past a gate), not source text.
  Source text is not a delta on a number, so escrow does not apply to editing a file; it applies to reserving a bounded
  resource before starting.
- **Frame.** Belongs to means (3) as the rule for bounded counters. The frame misses a failure: the invariant (bound) violated by
  two individually valid writers (write skew on a counter); escrow is the engine's answer for exactly that.

## 5. Doppel, phase reconciliation (Narula, Cutler, Kohler, Morris; OSDI 2014)

- **Citation / URL**: https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-narula.pdf.
  `R:papers/w1/doppel/paper.txt` (602 lines). Status: `quoted`. Not in the library before ("not recorded").
- **Problem.** Many transactions update the same few records; locks or OCC aborts run them serially (`paper.txt:15`).
- **Mechanism.** For contended records, split the value into one slice per core; during a split phase each core applies only
  one chosen commutative operation (Add, Max...) to its own slice; at a reconciliation phase the slices merge, in time
  proportional to the number of cores. Reads of split data wait for the next joined phase (`paper.txt:23-31`, 61-65, 140-163).
- **Measured gain.** 80-core machine, mostly run on 20 cores (`paper.txt:239`), in-memory, transactions as procedures.
  - `paper.txt:16`: "up to 38x higher than conventional concurrency control protocols on microbenchmarks, and up to 3x on a larger
    application, at the cost of increased latency for some transactions."
  - `paper.txt:334`: INCR1 (1M keys, each transaction increments one key, one hot key; `paper.txt:269`): "When 100% of
    transactions increment the one hot key, Doppel performs 6.2x better than Atomic, 19x better than 2PL, and 38x better than
    OCC." Contention: the extreme (all writers on one key). With little conflict Doppel does not split and matches OCC (`paper.txt:272`).
    Other schemes fall about 20-fold as they go from 20 cores to one useful core (`paper.txt:273`).
  - RUBiS-C auction, high contention: `paper.txt:554`: "Doppel gets three times as much throughput as OCC with alpha = 1.8"; OCC
    "spends roughly 67% of its time running StoreBid; much of this time is consumed by retrying aborted transactions."
  - LIKE benchmark, skewed: "almost twice the throughput of OCC", paid for by read latency of up to 20 ms (`paper.txt:478`).
- **Assumes.** Contended updates commute (`paper.txt:32`: "contentious updates are commutative (they have the same overall effect
  regardless of order)"); the programmer writes them as such. `paper.txt:554`: if one update "had been programmed in a
  non-splittable way (e.g., with explicit read and write operations) Doppel would execute the transactions serially and get
  far less parallel speedup." Only one operation per record per phase; others abort and retry later (`paper.txt:83`). Short
  transactions: `paper.txt:138`: a joined phase cannot end "until all current transactions commit or abort", phases start about every 20 ms
  (`paper.txt:167`).
- **For model-session writers** (`reasoned`). The shape fits two things in a repository: append-style shared structures (a registry,
  an export list, a test list, an index) where each writer adds an entry, and counters. The programmer-must-restate-as-commutative
  condition maps to the harness offering an "append this entry" operation rather than a text edit of the whole file. The phase
  barrier does not fit: with units of minutes, "wait for every in-flight transaction" means waiting for the slowest session. The
  20 ms phases and the 20 ms read stall would be minutes. The gain (38x) is a hot-key figure on 20 cores, no basis for 3 to 16
  writers; the carry-over is the principle: a write that commutes needs no turn.
- **Frame.** Confirms means (3), and adds that the operation set has to be fixed in advance per record (one commutative operation
  per phase) and that reads get slower; the frame had no cost for reads.

## 6. Scalable commutativity rule (Clements, Kaashoek, Zeldovich, Morris, Kohler; SOSP 2013)

- **Citation / URL**: https://pdos.csail.mit.edu/papers/commutativity:sosp13.pdf. `R:papers/w1/clements/paper.txt` (634 lines).
  Status: `quoted`. Reuses x04-0300 to x04-0309, confirmed here at the paper's own lines.
- **Problem.** Which interface operations can be implemented without shared-memory conflicts on many cores.
- **Mechanism.** `paper.txt:16`: "whenever interface operations commute, they can be implemented in a way that scales." A formal
  rule plus a tool, COMMUTER, that generates tests of commutative operation pairs.
- **Measured gain.** (An operating-system result, not a database one.) `paper.txt:6`: "Linux scales for 68% of the 13,664 tests
  generated by COMMUTER"; sv6 conflict-free for 13,528 of 13,664 (`paper.txt:438`) against 9,389 for Linux (`paper.txt:412`);
  `paper.txt:572`: mail server, non-commutative operations make throughput "collapse at a small number of cores", while commutative
  APIs reach "7.5x scalability from 1 socket (10 cores) to 8 sockets" (80 cores). Costs: `paper.txt:485`: "with 80 cores,
  fstat is 3.9x more expensive than on Linux".
- **Assumes.** Operations are defined by an interface; commutativity is judged per state and arguments (`paper.txt:76`: two
  `open("a", O_CREAT|O_EXCL)` "often don't commute"); the designer may change the interface to make operations commute (`paper.txt:486`: a flag
  O_ANYFD because open "must allocate the lowest unused file descriptor"). Limits: `paper.txt:208`: "no correct implementation can be conflict-free
  across all of H ... a system designer must decide which situations involving commutative operations are most important";
  `paper.txt:209`: "commutativity suffices for conflict-free accesses, but it may not be necessary."
- **For model-session writers** (`reasoned`). The useful part is the instruction to change the interface: choose operations that
  commute (append an entry; create a new file; add a function with a unique name) instead of operations that do not (rewrite a
  region; renumber; choose the next free id). The "lowest unused" case has a direct analogue: any "next number" (migration number,
  id) does not commute. It also says commutativity is per state: two additions at the same place do not commute even though each
  is an addition. The rule says nothing where the interface is fixed.
- **Frame.** Supports means (3) and shows its second half: the interface (what the harness offers as an edit) has to be designed.

## 7. Invariant confluence (Bailis, Fekete, Franklin, Ghodsi, Hellerstein, Stoica; PVLDB 8(3), 2014/2015), held

- **Citation**: read at `E:concurrency-lit-3-coordination-free.md:116-130`; library x04-0350 to x04-0361, r57-0303. Status:
  `quoted` (library; the paper was not fetched again). Appendices (proofs) not read (x04-0505).
- **Problem.** Which invariants can hold without coordination.
- **Mechanism.** `E:...coordination-free.md:118`: "divergent but I-valid database states can be merged into a valid database state";
  theorem (`:119`): coordination-free execution is possible "if and only if T is I-confluent with respect to I".
- **Measured gain.** `E:...:120`: "over 12.7M TPC-C New-Order transactions per second on 200 servers, a 25-fold improvement over prior
  results"; `:127`: coordination-free "over 12M transactions per second", the lock-based version "approximately 1.1M"; "for distributed
  transactions locking throughput drops by over three orders of magnitude". Workload: TPC-C and a microbenchmark.
- **Assumes.** Invariants stated explicitly; operations known; a merge function. Not I-confluent (`:121`, `:122`): "On a per-district basis,
  order IDs should be assigned sequentially"; AUTO_INCREMENT insert, uniqueness when the user chooses the value, foreign key delete,
  a counter decrement under a lower bound. I-confluent: foreign key insert, system-chosen unique value, counter increment under a lower
  bound, secondary index and view updates. `:128`: "If invariants are incorrectly or incompletely specified, an I-confluent database
  system may violate application-level correctness."
- **For model-session writers** (`reasoned`). The table maps onto a repository once the invariants are written down: a new file or
  a new function with a fresh name is like a foreign key insert (safe); deleting a function others call is like a foreign key delete
  (unsafe); migration numbers or any sequence is like sequential ids (needs a single allocator); a name chosen by the writer that must be
  unique is "user-chosen uniqueness" (needs a check). The last line is the warning for us: the test suite is the invariant; any invariant
  the suite does not state is not protected by a clean merge.
- **Frame.** Gives the frame its missing test: for each kind of change, is it confluent under the project's invariants. It also names a
  failure the frame lacks: a merge that is clean but breaks an invariant nobody wrote down.

## 8. H-Store (Kallman and others, PVLDB 1(2), 2008) and H-Store as measured by others

- **Citation / URL**: https://www.vldb.org/pvldb/vol1/1454211.pdf. `R:papers/w1/hstore2008/paper.txt` (88 lines). Status: `quoted`.
  Brief names "Kallman 2008, or Stonebraker 2007": the 2007 paper could not be read (see below).
- **Problem.** OLTP on a cluster of single-threaded, in-memory sites without locks.
- **Mechanism.** Each site is one single-threaded daemon on one core with its own data (`paper.txt:37`). Transactions are
  pre-defined stored procedures (`paper.txt:39`). A single-sited transaction needs no undo log, no concurrency control and no
  communication beyond replication (`paper.txt:60`); a one-shot transaction runs each of its queries on one site, with no query using
  another's output (`paper.txt:62`).
- **Measured gain.** This is a demonstration paper; it states no measurement. (`paper.txt:21` refers back to the 2007 paper for results.)
  Independent measurement, held: Yu and others 2014 (1000-core simulation): "H-STORE outperforms all other schemes up to 800 cores"
  for single-partition transactions with uniform access; "does not scale with transactions accessing four or more partitions"
  (`E:concurrency-lit-1-databases.md:162`). Harding and others 2017: from two to four partitions performance drops 12 to 40
  percent for protocols other than Calvin (`E:...:172`).
- **Assumes.** The workload is known in advance as a set of procedures; each touches one partition; the partitioning is chosen
  for the workload (`paper.txt:42`: new procedures "result in poorer performance as the database's physical design will not be optimized").
- **For model-session writers** (`reasoned`). Partition ownership is what the harness's "one owner per file" is: a session that
  owns a part runs on it with no concurrency control. The measurement says this wins only while every unit stays inside one
  partition; a unit touching two or more partitions loses most of the gain. Partitioning "by file" would be crossed by any change
  that spans files. The paper gives no rule for choosing the partition boundary beyond a designer's layout.
- **Stonebraker and others 2007 (VLDB, "The End of an Architectural Era")**: the VLDB URL gave 403 (blocked), and the only copy
  found was a student's slide deck from a course page (https://cs.brown.edu/courses/cs227/archives/2015/slides/week5/5-hawkins-paper-2.pdf,
  `R:papers/w1/hstore2007/paper.txt`). It lists "Factor of 82 speed up on TPC-C benchmark" (`paper.txt:89`) and the transaction
  classes (`paper.txt:92-109`). Status: `summary` (secondary: a student's notes on the paper). The 82x figure is not to be used as read.
- **Frame.** Partition ownership is not in the frame as a means; it is the engine-world name of the harness's existing "one owner".

## 9. VoltDB, an engine in real use (Jepsen analysis, Kingsbury 2016, VoltDB 6.3)

- **Citation / URL**: https://jepsen.io/analyses/voltdb-6-3.pdf (funded by VoltDB, `paper.txt:3`). `R:papers/w1/jepsen-voltdb/paper.txt`
  (248 lines). Status: `quoted`. VoltDB's own technical note could not be fetched (bot check page); see "Not opened".
- **Problem / mechanism.** A production descendant of H-Store: stored procedures must be deterministic; updates on one partition are ordered
  by that partition's leader; multi-partition operations are ordered by a single cluster-wide initiator (`paper.txt:7-8`).
- **Measured gain.** `paper.txt:11`: "transaction throughput scales as node counts ... rise. Multipartition procedures must pass sequentially
  through the MPI, and their throughput slowly drops with node count"; "VoltDB's internal benchmarks suggest multi-partition transactions are
  practically limited to a few hundred updates/sec, or tens of thousands of reads/sec ... This is why VoltDB's performance numbers use
  entirely single-partition workloads." That is the vendor's figure as relayed by the analyst, not a measurement made by him.
- **Assumes.** Deterministic procedures (a nondeterministic run is detected by hashing the resulting statements and "shuts down",
  `paper.txt:243`); most transactions fall in one partition (`paper.txt:12`).
- **Other relevance.** The same engine, the analysis found stale reads, dirty reads and lost updates under partitions and recovery
  (`paper.txt:230`): a fast path can break its own safety claim in the fault case; the engine's design does not by itself prove the guarantee.
- **For model-session writers** (`reasoned`). Confirms the two-lane picture: a fast lane for work inside one owner, a slow single
  queue (the MPI) for work across owners, with a measured gap of orders of magnitude between them.
- **Frame.** Same as section 8.

---------------------------------------------------------------------------------------------------------------

## What this topic says about the lane's frame (summary, for the analyst)

1. **Means (2), "fix the order before work starts, so nothing is redone": wrong as stated.** Every source needs the access sets before
   the run (Calvin `paper.txt:120`; Abadi and Faleiro `paper.txt:53`, `255`; H-Store single-sited `paper.txt:60`). Where the sets are not
   known the cost is an extra reconnaissance pass or a restart (OLLP) or a rerun of the aborted ones (Aria `paper.txt:289`, `515`).
   For an interactive unit, the survey's stated choices are "declare the set, or serial execution" (`paper.txt:255`).
2. **Largest measured gains, by means.** Order first (Aria): 1.6x BOHM, 2.4x Calvin, 10.3x a locking primary-backup engine on uniform
   YCSB at 12 threads (`aria paper.txt:437`), but only 39 percent of its own throughput at skew 0.999 (`:515`); Calvin: half a million
   TPC-C transactions per second on 100 nodes (`calvin paper.txt:242`), with 36 percent loss under data-dependent aborts (Harding, `E`).
   Commute: 38x over OCC at one hot key, 20 cores (`doppel paper.txt:334`); 3x on a larger auction workload (`:554`); 12.7M transactions
   per second on 200 servers (Bailis, `E`); 7.5x from 10 to 80 cores (`clements paper.txt:572`). Ownership: H-Store best to 800 cores for
   one-partition work only (Yu, `E`). None used 3 to 16 writers or a unit longer than a few milliseconds.
3. **What carries and what does not (`reasoned`).** Does not: determinism (no replicas, reruns differ), the advance-known set, millisecond
   barriers. Carries: the choice of operations that commute (Doppel, Clements, Bailis), the per-kind confluence table (Bailis), bounded
   reservation for shared numbers (escrow), ownership of a partition with a slow shared lane across partitions (H-Store, VoltDB).
4. **Missing from the frame.** (a) Deadlock as a failure: order removes it (Abadi and Faleiro `paper.txt:35`), escrow brings back a
   form of it that is NP-complete to detect (`escrow paper.txt:379`). (b) Batches and barriers as a means of their own: Calvin epochs,
   Aria batches, Doppel phases; they trade latency for fewer conflicts, and a barrier waits for the slowest unit. (c) Hot spots (a cost,
   not an anomaly): the engines' gains are all on the one record everybody writes. (d) The invariant that nobody wrote down (Bailis `:128`).
   (e) Sequential identifiers as the standard non-confluent case (Bailis `:121`, `:122`; Clements `paper.txt:486`).

## Not found

- Searched the library for: Calvin, deterministic, Aria, escrow, commutativ, confluence, Doppel, H-Store, Kallman, Bailis, Clements.
  "Doppel" and "Kallman" returned "not recorded". The Aria paper, Abadi and Faleiro, Escrow (paper level), Doppel and H-Store (2008) were
  not held as `quoted` from the paper before this file.
- Web search ("Abadi Faleiro overview deterministic database CACM pdf", "O'Neil Escrow Transactional Method pdf", "Stonebraker End of an
  Architectural Era pdf", "VoltDB partitioned stored procedures documentation").
- No measured figure for escrow exists in its own paper (searched the text). No figure from Calvin for a lock-based baseline run
  by the authors (only a model). No Calvin latency figure read (Figure 2 is a chart).
- Nothing found on any of these mechanisms applied to source-code editing by agents; I did not search for it (belongs to topic `merge`).

## Not opened

- Stonebraker and others 2007, the paper itself: VLDB server returned 403; only a slide deck found (`summary`, section 8).
- VoltDB's technical note (voltactivedata.com): the fetch returned an anti-bot "One moment, please" page. Per the standards, not
  worked round. Needs the owner's sign-in or a different public copy.
- Weihl 1988 (commutativity-based concurrency control) and Eswaran 1976: outside this topic's list.
- BOHM (Faleiro and Abadi, VLDB 2015) and PWV (Faleiro and others 2017): skipped; they change no answer beyond Aria's comparison,
  which gives their throughput relative to Aria (BOHM about two thirds of Aria on YCSB, `aria paper.txt:436`).
- Bailis and Harding were held as `quoted`; not fetched again, so their line numbers are those of `E:`.
- Not read in the papers read: Calvin sections 4 to 5 (disk-resident data, checkpointing; their text at `calvin paper.txt:128-147` was seen
  only in outline), Aria sections 7 and 8.6 to 8.7 (cluster runs) and the correctness proofs, Doppel's phase-length study beyond the
  latency table (`doppel paper.txt:482-483`), Clements's model and test generator sections.

---------------------------------------------------------------------------------------------------------------

## Second attempt (2026-11-19)

Collector: sonnet, step 1b. Nothing above this section was changed. Both files are saved in new folders, so the first
attempt's `hstore2007/` (a slide deck, `summary`) stays as it was.

### Paper 1: Stonebraker, Madden, Abadi, Harizopoulos, Hachem, Helland, VLDB 2007 (opened)

URLs tried (the VLDB server's 403 was the first collector's):
- Web search for the title with "pdf": listed a Princeton course copy, a Buffalo course copy, Scribd, SlideShare, Brown slides and others.
- https://www.cs.princeton.edu/courses/archive/fall10/cos597B/papers/hstore-vldb07.pdf : HTTP 200, 454,678 bytes, `%PDF-`. Used.
  Saved `R:papers/w1/hstore2007b/paper.pdf` and `paper.txt` (291 lines). I stopped there; the Buffalo copy was not needed.

- **Citation / URL**: "The End of an Architectural Era (It's Time for a Complete Rewrite)", VLDB 2007, pp. 1150-1160; the Princeton
  course copy above. Status: `quoted` (read section 5 and the design properties; not every page).
- **Problem.** Disk-oriented, lock-and-log relational engines are the wrong design for OLTP; a main-memory engine built from scratch is claimed to be far faster.
- **Mechanism.** H-Store: shared-nothing main-memory sites, transactions as stored procedures; the TPC-C classes are made "single-sited",
  "sterile" and "one-shot" by schema design, so that "they achieve a valid execution of TPC-C with no controls" (`paper.txt:197`). Tested form
  (`paper.txt:202`): "the tested configuration was sterile, strongly two-phase execution on the one-shot schema."
- **Measured gain** (section 5, `paper.txt:205-216`):
  - Configuration, `paper.txt:206`: "Both DBMSs were run on a dual-core 2.8GHz CPU computer system, with 4 Gbytes of main memory and four 250 GB SATA disk drives. Both DBMSs used horizontal partitioning to advantage."
  - Baseline and workload, `paper.txt:205`: "We implemented a variant of TPC-C on H-Store and on a very popular commercial RDBMS. The same driver was used for both systems and generated transactions at the maximum rate without modeling think time." Stored procedures in both. "High availability and communication with user terminals was not included for either system."
  - Result, `paper.txt:208`: "H-Store ran 70,416 TPC-C transactions per second. In contrast, we could only coax 850 transactions per second from the commercial system, in spite of several days of tuning by a professional DBA ... Hence, H-Store ran a factor of 82 faster". 70,416 / 850 = 82.8.
  - Cause given, `paper.txt:209`: the commercial system "spent about 2/3 of its total elapsed time inside the logging system"; "If logging was turned off completely ... throughput would increase to about 2,500 transactions per second" (an estimate, not a run): about 2.9x of 850. The concurrency control is "the next bottleneck" (`paper.txt:210`).
  - Against the record, `paper.txt:216`: the top TPC-C result is "about 133,000 total transactions per second ... on a 128 core shared memory machine"; H-Store "35,000 transactions per core"; "within a factor of two of the best TPC-C results on a low-end machine". The authors did not implement all of TPC-C ("we did not, for example, model wait times").
  - Scale and contention: one machine, two cores; every TPC-C class made single-site or one-shot by design; TPC-C's own mix (10 percent of new_order and 15 percent of payment go to a remote warehouse, `paper.txt:158`, `162`). One run per system; no variance, no contention sweep, no multi-site result.
- **Assumes.** Short transactions (`paper.txt:54`: "good application design will keep OLTP queries small"; long ones go to a warehouse system); transaction classes known in advance and analysed by hand (`paper.txt:203`: "a knowledgeable human would have to carefully code the transactions classes ... it is an open question how successful automatic transaction class analysis will be."); data in memory; no high availability in the run; a schema redesign so that every class is one-shot or sterile (read-only parts of Stock vertically partitioned and replicated, `paper.txt:200`).
- **For model-session writers** (`reasoned`). The 82x compares a purpose-built engine, with the workload recast to suit it, against a commercial engine whose time the authors report went mostly to its log; it does not measure "one owner per partition" alone. What it rests on (every unit inside one site, classes known and short) is what a session does not meet (minutes, changes across files, set unknown). One machine, two cores, one run: no basis for 3 to 16 writers. The usable content is the claim's shape: gain comes from removing locking and logging when units never cross a partition, which the later independent measures agree with (section 8: best only for single-partition work).
- **Frame.** As section 8: partition ownership. It adds a cost the frame lacks: the design effort to make the workload fit the partitions (here by hand, by "a knowledgeable human").
- This upgrades section 8's `summary` for the 2007 paper to `quoted`. The 82 is now read in the paper's own text with the configuration above; it stays a single-run, partial-TPC-C figure from the engine's authors, against a baseline they tuned.

### Paper 2: VoltDB technical note (opened; vendor overview, no figures)

URLs tried:
- https://www.voltactivedata.com/wp-content/uploads/2017/03/hv-white-paper-voltdb-technical-overview.pdf : HTTP 200, 12,183 bytes, an HTML page, not `%PDF-`. Not read, not worked round.
- https://downloads.voltdb.com/datasheets_collateral/technical_overview.pdf : HTTP 200, 475,514 bytes, `%PDF-`; no bot check on this host. Used.
  Saved `R:papers/w1/voltdb-overview/paper.pdf` and `paper.txt` (115 lines).
- https://www.doc.ic.ac.uk/~theinis/voltdb.pdf : the call ran past two minutes and was moved to the background; I did not use it.

- **Citation / URL**: VoltDB, "Technical Overview" (vendor datasheet, about 4 pages, undated in its text; it cites a 2008 paper as past work),
  https://downloads.voltdb.com/datasheets_collateral/technical_overview.pdf. Status: `quoted`; a vendor document with no measurement.
- **Problem.** Remove the overheads of a disk-based RDBMS: locking, latching, buffer management, logging (`paper.txt:51-54`).
- **Mechanism.** `paper.txt:58`: "Data and the processing associated with it are partitioned together and distributed across the CPU cores ("virtual nodes") in a shared-nothing hardware cluster"; `paper.txt:60`: "Each single-threaded partition operates autonomously, eliminating the need for locking and latching". Multi-partition work, `paper.txt:85`: "For single-partition transactions, each VoltDB engine operates autonomously. For multi-partition transactions, one engine distributes and coordinates work plans for the other engines." The same line goes on that the designer is assumed to construct the partitioning (the rest of the line I did not read to its end).
- **Measured gain.** None in this document: I searched it for "per second", "TPS", "cores" and "multi-partition" and found no throughput figure. The only quantified multi-partition limit stays the vendor figure relayed in the Jepsen report (`R:papers/w1/jepsen-voltdb/paper.txt:11`, section 9 above).
- **Assumes.** Single-partition work is the common case; the application designer chooses the partitioning; data fits in memory; stored procedures only.
- **For model-session writers** (`reasoned`). Confirms section 9 in kind (a fast single-owner lane and a coordinated slow lane); it gives no number for the gap, and as a vendor document it is no evidence for performance. It does not change section 9.
- **Frame.** As sections 8 and 9.

### Lines for the analyst

- Paper 1 opened (`quoted`): H-Store 70,416 against 850 TPC-C transactions per second, 82.8x; dual-core 2.8 GHz, 4 GB, four SATA disks; one commercial engine tuned by a DBA for days; partial TPC-C, no think time, no high availability (`hstore2007b/paper.txt:205-208`). Commercial engine: 2/3 of time in logging, logging off estimated 2,500 (`:209`).
- Paper 2 opened but adds no figure (`voltdb-overview/paper.txt:58-85`).
