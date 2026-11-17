# Concurrency literature 2: shared memory and concurrent data structures (collected 2026-11-18)

How collected: about 20 fetches and searches in general terms only (rule 4: nothing of ours went out). Fetch gives a small model's summary, so most items are SUMMARY.
Marks: QUOTED = words seen on a page; SUMMARY = from a fetched summary or search snippet; TEXTBOOK = standard knowledge, not fetched (reference named).
Limits: the original PDFs (Bw-tree, ART sync) could not be read (binary, no PDF renderer). Their numbers come from secondary snippets or are absent. Many figures are "figure not recalled".
No mapping to our case, no verdict. Where a scheme has a standard reference but no number, it says so.

## 1. Mutual exclusion and lock contention
- Problem: one writer at a time on shared data. Lock = mutual exclusion.
- How: a thread takes the lock, runs the critical section, releases. Others wait (block or spin).
- Result: SUMMARY (Wikipedia, Lock): coarse locks cost little but contend more; fine locks contend less but cost memory, time and risk deadlock. Costs paid even without contention: memory, init, acquire and release time. No numbers on the page.
- Failure modes: SUMMARY: convoying (holder descheduled, all wait), priority inversion, deadlock (standard fix: one global lock order). Spinning wastes time when the hold is long.
- Needs: critical sections short; a lock order that all writers obey.
- Queue locks: MCS lock, each waiter spins on its own memory word, so each acquire causes O(1) remote memory references. Mellor-Crummey and Scott, "Algorithms for scalable synchronization on shared-memory multiprocessors", ACM TOCS 9(1), 1991. TEXTBOOK (Herlihy and Shavit, ch. 7). Figure not recalled.
- URL: https://en.wikipedia.org/wiki/Lock_(computer_science) (fetched, SUMMARY).

## 2. Reader-writer locks
- Problem: many readers need not exclude each other. Only writers need exclusion.
- How: shared mode for readers, exclusive for writers; two reads compatible, write incompatible with all.
- Result: SUMMARY (Wikipedia): read-preferring gives most concurrency but can starve writers; write-preferring blocks new readers once a writer waits, no starvation, less concurrency. A write-preferring lock built from two mutexes costs more per operation. No numbers.
- Failure modes: writer starvation; two readers upgrading at once deadlock (fix: one "read with intent to upgrade" holder).
- Needs: reads clearly more frequent than writes, and reads must not write the shared thing. Every read still writes the lock word, which costs cache traffic (see section 14). TEXTBOOK (Herlihy and Shavit ch. 8).
- URL: https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock (SUMMARY).

## 3. Lock striping and lock splitting
- Problem: one lock on a big structure serialises everything.
- How: striping = an array of locks, key hashed to one lock. Splitting = one lock per independent field or part.
- Result: SUMMARY (Wikipedia, Lock): fine granularity helps with many threads, hurts single-thread cost. No figure found.
- Reference: Java ConcurrentHashMap (Doug Lea, util.concurrent, early versions used segment striping). TEXTBOOK. Herlihy and Shavit ch. 13 (concurrent hashing, striped hash set, refinable hash set). Figure not recalled.
- Needs: work spreads evenly over the key space. Failure mode: a hot key sends all writers to one stripe; operations that touch all stripes (resize, count) take every lock.
- How known: TEXTBOOK.

## 4. Fine-grained and hand-over-hand locking
- Problem: lock one node at a time in a list or tree instead of the whole thing.
- How: hold the lock of the current node, take the next node's lock, then release the previous one ("lock coupling"). Writers on different parts run in parallel. Optimistic variant: search without locks, lock the two nodes, validate, retry on failure. Lazy list adds a "marked" bit so reads need no lock (Heller and others, OPODIS 2005).
- Guarantee: deadlock-free if nodes are always locked in the same direction. TEXTBOOK (Herlihy and Shavit ch. 9).
- Measured: figure not recalled. SUMMARY (search snippet of the ART paper, Leis and others, DaMoN 2016): "standard lock coupling performs very badly on modern multi-core CPUs even if the locks do not logically conflict at all". The cause is cache traffic on the lock word at the root and upper nodes (every traversal writes it). QUOTED from a search snippet, not read in the paper.
- Failure modes: root becomes a hot spot; long chains of locks; convoying.
- Needs: structure where a thread can be sure it may let go of the parent once the child is safe.

## 5. Latch coupling ("crabbing") in B-trees
- Problem: concurrent B-tree insert, delete, search without locking the whole tree.
- How: descend holding a latch on parent and child; release the parent when the child is "safe" (will not split or merge). Readers use shared latches, writers exclusive. Optimistic crabbing: descend with shared latches, take exclusive only on the leaf, restart pessimistically if a split is needed.
- Reference: Bayer and Schkolnick, "Concurrency of operations on B-trees", Acta Informatica 9, 1977. TEXTBOOK. Also Graefe, "A survey of B-tree locking techniques", ACM TODS 35(3), 2010. TEXTBOOK (title and venue recalled).
- Measured: figure not recalled. Failure mode as in section 4: root latch is written by every operation.
- Needs: nodes expose a "safe" test; writers rarely split high in the tree.

## 6. B-link trees (Lehman and Yao 1981)
- Problem: avoid read locks and avoid holding more than one lock at a time.
- How: every node has a "next" (right-sibling) pointer and a high key. A reader that arrives at a node after a split follows the right link. A writer locks only one node at a time, plus the parent when it propagates a split.
- QUOTED (Wikipedia, B-tree): the approach avoids read locks by "linking the tree blocks at each level together with a 'next' pointer"; write locks only while a block is modified. Stated cost: empty pages cannot be removed during normal operation (merge strategies exist).
- Reference: Lehman and Yao, "Efficient locking for concurrent operations on B-trees", ACM TODS 6(4), 1981. TEXTBOOK. Proof of correctness: Sagiv (J. Comput. System Sci. 1986) TEXTBOOK.
- Needs: nodes only ever split, never merge; a reader can tolerate seeing a node that is stale by a split.
- URL: https://en.wikipedia.org/wiki/B-tree (SUMMARY and short quotes).

## 7. Optimistic lock coupling (OLC) and ROWEX on adaptive radix trees
- Problem: lock coupling scales badly; lock-free ART is hard to build.
- How, OLC: each node has a version counter plus lock bit. Readers take no lock: read version, read node, re-read version, restart if changed or locked. Writers lock only the node they change (and parent when needed) and bump the version. ROWEX: writers exclude only other writers, readers never restart, but nodes must be changed so readers always see a valid state.
- Result: SUMMARY (search snippets, Leis, Scheibner, Kemper, Neumann, "The ART of Practical Synchronization", DaMoN 2016): both protocols "perform and scale very well while being much easier to implement than lock-free techniques". Throughput figures: not retrieved (PDF unreadable). A student reimplementation reported OLC scaled better than coarse and fine lock coupling under high contention (SUMMARY, secondary, low weight).
- Needs: readers can detect a torn read from the version and discard it; no pointer is followed to freed memory (needs epoch or similar reclamation).
- Loses: write-heavy, high-contention workloads (restarts), per a blog summary (SUMMARY, secondary).
- URL tried: https://db.in.tum.de/~leis/papers/artsync.pdf (binary, summary failed).

## 8. Bw-tree: delta records and a mapping table (Levandoski and others 2013)
- Problem: avoid in-place update of nodes; avoid latches and cache invalidation.
- How: nodes are reached through a mapping table (id to pointer). An update prepends a delta record to the node's chain and installs it with one compare-and-swap on the table entry. Chains are consolidated into a new base node, again by one CAS. Structure changes (split, merge) are done in several CAS steps that any thread can help finish.
- Result: SUMMARY (search snippet of a 2014 companion paper, "Indexing on Modern Hardware: Hekaton and Beyond"): about 19 times faster than BerkeleyDB and about 3 times faster than a latch-free skip list on real workloads. The ICDE 2013 paper's own tables were not read.
- Independent result: SUMMARY (search results about Wang, Pavlo, Lim, Leis and others, "Building a Bw-Tree takes more than just buzz words", SIGMOD 2018): their optimised version is 1.1 to 2.5 times faster than the original, but the Bw-tree is slower than lock-based indexes by 1.5 to 4.5 times, and slower than a B+tree with OLC. Source says lock-freedom does not always pay. Secondary sources disagree on the skip-list comparison.
- Needs: indirection cost accepted; garbage collection of old deltas (epochs). Failure modes: long delta chains slow reads; failed CAS means wasted work; memory management is hard.
- URLs: https://microsoft.com/en-us/research/wp-content/uploads/2016/02/modde734-levandoski.pdf (PDF, failed to summarise).

## 9. Read-copy-update (RCU)
- Problem: readers must be fast and never block, on read-mostly pointer-linked data.
- How: updater copies, edits the copy, swaps one pointer atomically. Waits a "grace period" until every reader that could hold the old copy has finished, then frees it. Readers see old or new, never a mix.
- QUOTED (Wikipedia): in server-class Linux builds "the read-side overhead is exactly zero". Updaters pay: copy, publish, grace-period wait (or deferred free). Adoption: almost 2,000 uses in the Linux kernel by early 2008, over 9,000 by March 2014 (SUMMARY).
- Needs: reads dominate; the shared thing is reached through one pointer that can be swapped; readers do not block inside the read section.
- Loses: update-heavy loads; updates that must change several structures atomically (SUMMARY). Writers still need their own mutual exclusion among themselves (multi-writer variants use locks).
- Reference: McKenney and Slingwine, "Read-copy update: using execution history to solve concurrency problems", PDCS 1998; McKenney's dissertation 2004. TEXTBOOK.
- URL: https://en.wikipedia.org/wiki/Read-copy-update (SUMMARY).

## 10. Seqlock
- Problem: tiny data, many readers, rare writers, no reader writes at all.
- How: writer takes a lock and bumps a counter before and after the write (odd = in progress). Reader reads the counter, copies, re-reads; retries if odd or changed.
- SUMMARY (Wikipedia): beats a reader-writer lock when readers are many and writers few; writers never wait for readers. Fails for data with pointers; heavy writing or slow readers can livelock and starve readers.
- Needs: data is plain values that can be copied safely; a torn copy is discarded.
- URL: https://en.wikipedia.org/wiki/Seqlock (SUMMARY).

## 11. Lock-free and wait-free structures, CAS, and ABA
- Problem: no thread holding a lock can block others.
- Guarantees: wait-free = every operation finishes in a bounded number of its own steps. Lock-free = some operation finishes (system progress, a thread may starve). Obstruction-free = a thread running alone finishes. QUOTED (Wikipedia): wait-free means "every operation has a bound on the number of steps".
- Theory: Herlihy, "Wait-free synchronization", ACM TOPLAS 13(1), 1991: compare-and-swap has infinite consensus number, so any object has a wait-free implementation from CAS; plain read and write registers have consensus number 1. TEXTBOOK.
- Measured: SUMMARY (Wikipedia): generic universal constructions perform worse than even naive blocking designs. A wait-free queue (Kogan and Petrank 2011) was made about as fast as the lock-free queue. Alistarh, Censor-Hillel, Shavit (STOC 2014) show lock-free algorithms are practically wait-free under reasonable assumptions.
- Classic examples: Treiber stack 1986; Michael-Scott queue (PODC 1996); Harris list (DISC 2001). TEXTBOOK; figures not recalled.
- ABA problem: a CAS succeeds because the value is back to A though it changed to B and back. SUMMARY (Wikipedia): common when memory is reused. Fixes: tag or counter beside the pointer (40 to 60 bits judged enough there), hazard pointers (Michael, IEEE TPDS 2004, TEXTBOOK), double-width CAS, LL/SC (immune), deferred free by garbage collection or RCU.
- Needs: one atomic word that carries the whole state change; safe memory reclamation. Failure modes: ABA, starvation under contention (retry storms), complex code.
- URLs: https://en.wikipedia.org/wiki/Non-blocking_algorithm ; https://en.wikipedia.org/wiki/ABA_problem (SUMMARY).

## 12. Optimistic concurrency control (the general form)
- Problem: conflicts are rare, so do not pay for locks on every access.
- How: read and compute freely, validate at the end that nothing read has changed, commit or retry. Kung and Robinson, "On optimistic methods for concurrency control", ACM TODS 6(2), 1981. TEXTBOOK. Same shape as OLC, seqlock, STM, CAS loops.
- Wins: low conflict. Loses: high conflict and expensive retries (work thrown away); long transactions starve (SUMMARY, Wikipedia on TM). Figure not recalled.

## 13. Transactional memory (hardware and software)
- Problem: make a group of memory updates atomic without hand-built locking.
- Herlihy and Moss, "Transactional memory: architectural support for lock-free data structures", ISCA 1993. SUMMARY (Wikipedia confirms the paper and year). Shavit and Touitou 1995 gave the software-only form.
- STM TL2: Dice, Shalev, Shavit, "Transactional Locking II", DISC 2006, pp. 194-208. SUMMARY: commit-time locking plus a global version clock; each read checks the location's version against the clock taken at start and aborts if newer; commit locks the write set, revalidates, bumps the clock, writes back. URL https://www.doi.org/10.1007/11864219_14 (abstract seen in search).
- Measured: SUMMARY (Wikipedia): on about 1 to 4 processors STM is typically "no worse than twice as slow" as fine-grained locking. Hardware (Intel TSX, SUMMARY from search snippets of third-party studies): best-effort, no commit guarantee, needs a lock fallback path; write set limit about 30.5 KiB, read set up to the L3 size; interrupts abort (a median of 980 aborts per second on an idle system in one study). A 2021 study found best-effort HTM comparable to locking or lock-free and scaling better with threads. Another summary: TSX was disabled after defects and Sun's Rock was cancelled (Wikipedia).
- Abort causes (SUMMARY): true conflicts, false conflicts at cache-line granularity, livelock and starvation of long transactions, interrupts and capacity limits.
- Needs: transactions that can be retried safely (no I/O, idempotent), short and small for HTM.
- URLs: https://en.wikipedia.org/wiki/Transactional_memory (SUMMARY). Cascaval and others, ACM Queue 2008, "Software transactional memory: why is it only a research toy?" is a critical measured study; title recalled, not fetched (search failed).

## 14. Cache coherence, false sharing, contended writes
- Problem: two cores writing different words in one cache line (64 bytes typical) still bounce the line between them.
- SUMMARY (Wikipedia, False sharing): in one measured example, 20 threads each incrementing their own byte took about 50 times more compute time with false sharing than when each was padded to a 64-byte line; the padded time roughly doubled as threads scaled. "Order-of-magnitude" gains are possible. Fixes: padding, alignment, reordering fields; detection with perf c2c.
- SUMMARY (Wikipedia, Cache coherence): write-invalidate forces other caches to re-read; snooping does not scale because of broadcast, so systems above about 64 processors use directories with a 3-hop path. No latency numbers there.
- Consequence for sections 2 to 4: a lock word or counter written by every operation is itself a contended write, even if the work done is disjoint.
- Needs: hot variables kept per thread or padded to their own line.
- URLs: https://en.wikipedia.org/wiki/False_sharing ; https://en.wikipedia.org/wiki/Cache_coherence (SUMMARY).

## 15. Copy-on-write and persistent data structures
- Problem: let readers keep a consistent old version while a writer makes a new one; make retry cheap.
- How: path copying (copy nodes from the changed one to the root, share the rest), fat nodes, or both. SUMMARY (Wikipedia): path copying costs O(log n) per update on a balanced tree, O(n) worst case on a list; Driscoll and others (1989) get O(1) access slowdown and O(1) amortised space and time per update with bounded in-degree. Copy-on-write of a whole array costs O(n) per update.
- Concurrency use: immutable versions make retries safe and work with one CAS on the root pointer (Clojure, SUMMARY). Java CopyOnWriteArrayList is the whole-array form.
- Needs: updates are small relative to the structure, or the structure is shared by path; one root pointer to swap. Failure modes: under concurrent writers, a CAS on the root fails and all but one writer redo their copy (cost of a retry is the whole copy); garbage to collect.
- References: Driscoll, Sarnak, Sleator, Tarjan, "Making data structures persistent", JCSS 38, 1989; Okasaki, "Purely Functional Data Structures", 1998. TEXTBOOK.
- URL: https://en.wikipedia.org/wiki/Persistent_data_structure (SUMMARY).

## 16. Log-structured writing: LSM trees and log-structured file systems
- Problem: random in-place writes are slow; make all writes sequential appends and sort out the order later.
- LSM tree: SUMMARY (Wikipedia): writes go to an in-memory component (with a write-ahead log), flushed as immutable sorted runs; later merges (compaction) drop obsolete entries and tombstones. Leveling: fewer runs, more write amplification. Tiering: less write amplification, more read cost. Amortised leveling write cost about O(T*L/B) (the page renders it inconsistently). Point lookup O(L) runs without Bloom filters. No measured numbers on the page.
- Reference: O'Neil, Cheng, Gawlick, O'Neil, "The log-structured merge-tree", Acta Informatica 33(4), 351-385, 1996.
- LFS: SUMMARY (Wikipedia): all data and metadata appended to a log in segments; a cleaner reclaims the tail, taking least-full segments first, less effective near capacity; crash recovery from the last consistent point; reads can slow from fragmentation. Reference: Rosenblum and Ousterhout, "The design and implementation of a log-structured file system", ACM TOCS 10(1), 1992. The paper's headline claim of using most of raw disk bandwidth for writes: TEXTBOOK, figure not recalled.
- Needs: writes dominate or must be fast to acknowledge; readers can merge several versions; a background cleaner has spare capacity. Failure modes: write amplification from compaction, read amplification, cleaning stalls near full.
- Single appender is the common case; concurrency among appenders is solved elsewhere (one log tail, one lock or CAS on the tail). TEXTBOOK.
- URLs: https://en.wikipedia.org/wiki/Log-structured_merge-tree ; https://en.wikipedia.org/wiki/Log-structured_file_system (SUMMARY).

## Tally
Schemes: 16 sections (about 24 named schemes counting sub-forms). Marks: mostly SUMMARY and TEXTBOOK. QUOTED only for short phrases in 4 places (B-link, RCU read cost, wait-free, lock coupling snippet).

## URLs tried
Worked (SUMMARY): en.wikipedia.org pages: Read-copy-update, B-tree, False_sharing, Transactional_memory, ABA_problem, Log-structured_merge-tree, Log-structured_file_system, Non-blocking_algorithm, Lock_(computer_science), Persistent_data_structure, Seqlock, Readers-writer_lock, Cache_coherence.
Web search worked: Bw-tree, ART OLC, Wang et al. Bw-tree, TL2, TSX evaluation (the STM-toy query returned unrelated pages).
Failed: https://db.in.tum.de/~leis/papers/artsync.pdf (binary, no text); https://microsoft.com/en-us/research/wp-content/uploads/2016/02/modde734-levandoski.pdf (binary, no text); local PDF render (no pdftoppm); https://nan01ab.github.io/2018/04/The-ART-of-Practical-Sync.html (404); https://nan01ab.github.io/2018/06/Bw-Tree.html (404).
Not found: throughput tables of the ART and Bw-tree papers; numbers for lock coupling, MCS, striping, LFS, LSM write amplification; Cascaval 2008 text.
