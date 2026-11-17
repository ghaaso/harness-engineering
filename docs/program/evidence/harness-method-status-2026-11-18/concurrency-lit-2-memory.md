# Concurrency literature 2: shared memory and concurrent data structures (collected 2026-11-18, second pass)

How collected: first pass used encyclopaedia summaries. Second pass downloaded the papers and read them as text (pdftotext). General terms only (rule 4). Folder: scratchpad/papers/<name>/, files raw.txt (plain) and paper.txt (layout).
Marks: QUOTED = exact sentence from a paper read in full text, with the line of that paper's raw.txt; SUMMARY = fetched summary or snippet; TEXTBOOK = standard knowledge, not fetched.
Read in full text (8): ART sync (art), Bw-tree 2013 (bwtree), Wang 2018 (bwwang), Lehman-Yao (blink), TL2 (tl2), Bolosky-Scott (bolosky), McKenney RCU 2001 (rcu2001), McKenney perfbook 2023 (rcudiss), plus the 2011 STM rebuttal (stmrebut) for the Cascaval claims.
Limits: Cascaval 2008 itself blocked (ACM Cloudflare, Penn link 404); its claims are second hand via the rebuttal. No open study of lock striping found. No mapping to our case, no verdict.

## 1. Mutual exclusion and lock contention
- Problem: one writer at a time on shared data. Lock = mutual exclusion.
- Result: SUMMARY (Wikipedia, Lock): coarse locks cost little but contend more; fine locks contend less but cost memory, time and deadlock risk.
- QUOTED (perfbook, line 1619): "The same-CPU compare-and-swap (CAS) operation consumes about seven nanoseconds, a duration more than ten times that of the clock period."
- QUOTED (perfbook, line 1635): "A blind CAS involving CPUs in different cores but on the same socket consumes almost fifty nanoseconds, or almost one hundred clock cycles."
- QUOTED (perfbook, line 1636): "If the pair of CPUs are on different sockets, the operations are considerably more expensive. A blind CAS operation consumes almost 150 nanoseconds, or more than three hundred clock cycles." (Cost of a write to a line another core owns.)
- QUOTED (RCU 2001, line 384): "each acquisition of the lock must do a write to that lock's data structure, so that the lock's data structure will normally only be in "modified" state in the cache of the last acquiring CPU."
- Failure modes: SUMMARY convoying, priority inversion, deadlock (fix: one global lock order).
- Queue locks (MCS): Mellor-Crummey and Scott, TOCS 9(1), 1991. TEXTBOOK (Herlihy and Shavit ch. 7). Figure not read.
- Needs: short critical sections; a lock order all writers obey.

## 2. Reader-writer locks
- How: shared mode for readers, exclusive for writers.
- QUOTED (perfbook, line 2444): "reader-writer locking scalability is decidedly non-ideal, especially for smaller sizes of critical sections. To see why read-acquisition can be so slow, consider that all the acquiring threads must update the pthread_rwlock_t data structure."
- QUOTED (perfbook, line 11046; 448-CPU x86, 30 runs): "reader-writer locking is more than an order of magnitude slower than RCU on a single CPU, and is more than four orders of magnitude slower on 192 CPUs."
- QUOTED (perfbook, line 11108): "the low performance of reader-writer locking in Figures 9.25 and 9.26 is exaggerated by the unrealistic zero-length critical sections." The RCU advantage shrinks as the critical section grows.
- SUMMARY (Wikipedia): read-preferring can starve writers; write-preferring costs concurrency. Upgrade by two readers deadlocks. TEXTBOOK (Herlihy and Shavit ch. 8).

## 3. Lock striping and lock splitting
- How: striping = array of locks, key hashed to one. Splitting = one lock per part.
- QUOTED (perfbook, line 5808): "the per-bucket-locking technique also partitions the address space, so that the overall technique can be said to partition spacetime. If the number of buckets is large enough, this partitioning of space should with high probability permit a given CPU immediate access to a given hash bucket."
- QUOTED (perfbook, line 12411, read-only test): "both RCU and hazard pointers perform and scale much better than per-bucket locking because read-only replication avoids NUMA effects." Line 12413: a globally locked table is "even worse than those of the per-bucket-locked implementation."
- Reference: Herlihy and Shavit ch. 13 (striped, refinable hash sets). TEXTBOOK. No open measured study of striping found.
- Failure modes (TEXTBOOK): hot key sends all writers to one stripe; resize and count take every lock.

## 4. Fine-grained and hand-over-hand locking (lock coupling)
- How: hold the current node's lock, take the next, release the previous. TEXTBOOK (Herlihy and Shavit ch. 9).
- QUOTED (ART, line 136): "it performs very badly on modern multi-core CPUs even if the locks do not logically conflict at all, for example in read-only workloads."
- QUOTED (ART, line 136): "Each time a core acquires a read lock for a node (by writing to that node), all copies of that cache line are invalidated in the caches of all other cores."
- QUOTED (ART, line 342; 50M random 8-byte keys, 20 hyper-threads): "Lock coupling does not scale well, even in the lookup experiment and although we use read-write locks."
- QUOTED (ART, line 356): "the number of L1 misses (highlighted) increases significantly when going from 1 to 20 threads and the CPU cycles increase by a factor of 6.6x." Table (line 343 on), cycles per lookup 1 thread / 20 threads: no sync 211 / 381; lock coupling 418 / 2787; OLC 348 / 418; ROWEX 375 / 427.
- QUOTED (ART, line 458): "lock coupling simply does not scale on modern multi- and many-core CPUs."

## 5. Latch coupling ("crabbing") in B-trees
- How: descend holding parent and child, release parent when child is safe. Bayer and Schkolnick, Acta Informatica 9, 1977; Graefe survey, TODS 35(3), 2010. TEXTBOOK.
- Measured: the ART paper above covers lock coupling on a radix tree, not a B-tree crab. Wang 2018 (section 6) covers a B+tree with OLC. Row 7.
- Needs: a "safe" test; writers rarely split high in the tree.

## 6. B-link trees (Lehman and Yao 1981)
- QUOTED (line 23): "any process for manipulating the tree uses only a small (constant) number of locks at any time. Also, no search through the tree is ever prevented from reading any node (locks only prevent multiple update access)."
- QUOTED (line 29): "Only one process may hold the lock for a given page at any time. Locks do not prevent other processes from reading the locked page."
- QUOTED (line 233): "this procedure does no locking of any kind." (the search)
- QUOTED (line 359): "at most three nodes are ever locked simultaneously, and this occurs relatively infrequently: only when it is necessary to follow a link pointer while inserting a pointer to a split node."
- QUOTED (line 485): "Three nodes are locked only for the duration of one operation."
- QUOTED (line 480): "only one node need be locked by the deleter." Line 478: deletion simply allows "fewer than K entries in a leaf node" (nodes are not merged).
- QUOTED (line 493): "The gain in efficiency of the algorithm presented above, as compared with sequential algorithms, or other concurrent algorithms could be quantified by simulation." So the paper has no throughput figure at all.
- Needs: nodes only split, never merge; a reader tolerates a node stale by a split. Sagiv 1986 proof TEXTBOOK.

## 7. Optimistic lock coupling (OLC) and ROWEX on adaptive radix trees (Leis and others 2016)
- How, OLC: version counter plus lock bit per node; readers take no lock and restart if the version changed. ROWEX: writers exclude only other writers; readers never restart.
- QUOTED (line 342): "Optimistic Lock Coupling and ROWEX, in contrast, scale very well and have very similar performance, with Optimistic Lock Coupling being slightly (around 7%) faster for lookup."
- QUOTED (line 356): "Single-threaded, the overhead of Optimistic Lock Coupling in comparison with the non-synchronized variant is around 65%, mostly due to additional instructions. With 20 threads, the overhead is reduced to only 10%".
- QUOTED (line 219): "Optimistic Lock Coupling performs very well as long as there are few conflicts. The big disadvantage is, however, that all operations may restart."
- QUOTED (line 215): "in pathological cases--a read operation may be restarted repeatedly. A simple solution for ensuring forward progress is to limit the number of optimistic restarts."
- QUOTED (line 397, 1 lookup thread plus 1 insert+remove thread, 10M keys, skew up to 83% on one key): "ROWEX is the only exception, as its lookup performance stays very high even under extreme contention due to the non-blocking reads."
- QUOTED (line 461): "Cervini et al. [3] found that replacing fine-grained locks with (elided) HTM locks at the same granularity does not improve performance."
- Hardware: Xeon E5-2687W v3, 10 cores, 20 hyper-threads (line 338). Gap: this paper never runs many writers on one structure; its contention test has one writer. Throughput curves (Figure 5) are images, not text.
- Needs: torn reads detected by the version; no pointer to freed memory (epoch reclamation).

## 8. Bw-tree: delta records and a mapping table (Levandoski, Lomet, Sengupta 2013)
- QUOTED (line 108): "We never update a Bw-tree page in place (i.e., modify its memory contents). Rather, we create a delta record describing the update and prepend it to the existing page."
- QUOTED (line 111): "we use the atomic compare and swap (CAS) instruction ... to replace the current address P with the address of D" and "the CAS on the mapping table entry is the only physical pointer change necessary to install a page update." A failed CAS is retried (line 111).
- QUOTED (line 120): "We trigger consolidation if an accessor thread, during a page search, notices a delta chain length has exceeded a system threshold."
- QUOTED (line 354, Table I): "The record update failure rate (e.g., inserts, updates, deletes) is extremely low, below 0.02% for all workloads." Split and consolidate failures: about 1.25% on Xbox and dedup, 8.88% on synthetic (line 354).
- QUOTED (line 357): "the Bw-tree exhibits a throughput of 10.4M operations/second, while BerkeleyDB has a throughput of 555K operations/second, representing a speedup of 18.7x." Dedup 8.6x, synthetic 5.8x, "due to the higher latch-free failure rates".
- QUOTED (line 369): "The Bw-tree outperforms the skip list by a factor of 3.7x." Read-only: "4.4x". Table II: synthetic 3.83M vs 1.02M ops/sec; read-only 5.71M vs 1.30M.
- QUOTED (line 367): "The Bw-tree executes with a processor utilization of about 99% while BerkeleyDB runs at about 60%."
- Gap: all runs use 8 worker threads (line 322). No curve of throughput against writer count in this paper. Hardware: 8 logical cores.
- Needs: epoch-based reclamation. Failure modes: long chains slow search (Figure 5); failed CAS wastes work.

## 9. Independent test of the Bw-tree (Wang and others, SIGMOD 2018)
- QUOTED (line 26): "our optimized variant achieves 1.1-2.5x better performance than the" original Microsoft design for highly concurrent workloads (the sentence continues past the line).
- QUOTED (line 90): "the overhead of the Bw-Tree's indirection layer and delta records causes it to under-perform the lock-based indexes by 1.5-4.5x."
- QUOTED (line 810): "the ART is more than 4x faster than the OpenBw-Tree for point lookups ... The OpenBw-Tree is also slower than the Masstree and the B+Tree, often by a factor of 2x."
- QUOTED (line 1069): "the B+Tree without any optimizations even outperforms the Masstree and ART, and is 3.7x faster than the OpenBw-Tree" (Mono-Int insert-only). Line 1069: B+tree with OLC "is usually 3-5x faster than all other indexes" on Scan/Insert.
- QUOTED (line 810): "Higher instruction count is a consequence of having complicated delta chain traversal routines. Higher cache misses are caused by features such as the Mapping Table."
- QUOTED (line 312): the original's centralized epoch counter "becomes bottleneck when there are many threads because of cache coherence traffic". Line 709: decentralized GC gives "1.3x improvement with 20 threads".
- QUOTED (line 1066): "The Masstree has high single-threaded Mono-Int Insert-only throughput, but scales only by 3x using 20 threads."
- Hardware: two Xeon E5-2680 v2, 20 threads pinned to one socket (lines 387, 808). Their lock-free skip list showed "high variation and low performance for most multi-threaded experiments" (line 811).

## 10. Read-copy-update (RCU)
- How: copy, edit the copy, swap one pointer, wait a grace period, free the old.
- QUOTED (RCU 2001, line 270): "The search() function contains absolutely no locks or atomic instructions, which means that the performance of this function will scale with CPU core clock rate, rather than the much slower memory latencies for an implementation based on locks or atomic operations."
- QUOTED (RCU 2001, line 387): "'Read intensive' means that the update fraction ... f is much smaller than the reciprocal of the number of CPUs: if you have eight CPUs, then a 'read-intensive' workload would have f much less than 0.125."
- QUOTED (RCU 2001, line 824; Linux 2.4.2 chat benchmark, PIII Xeon 700MHz, 1 to 4 CPUs): "The read-copy update version attains over 30% more throughput at four CPUs".
- QUOTED (perfbook, line 11043; Quick Quiz 9.59): the question itself puts RCU read-side overhead at "less than a 300-picosecond overhead", at 2.1 GHz, 448 CPUs. Line 11046: RCU "scales quite well".
- QUOTED (perfbook, line 12411): at read-only hash lookups RCU beats per-bucket locking; line 12413: "RCU does slightly better than hazard pointers"; line 12454 notes RCU's non-ideal curve past 224 CPUs is from hardware multithreading.
- QUOTED (perfbook, line 11942): "The deferred-processing techniques called out in this chapter are most directly applicable to read-mostly situations, which begs the question 'But what about updates?'" Line 11693: "update-mostly workloads requiring consistent data are rarely good places to use RCU".
- QUOTED (RCU 2001, line 277): the simple deletion "will therefore give good speedups only if there are many more searches than deletions." Writers still serialise on a lock (line 11202 context; Figure 9, spin_lock around delete).
- Reference: McKenney and Slingwine, PDCS 1998 (copy not open: typeset.io gave an HTML error page). TEXTBOOK. Wikipedia counts (2,000 uses 2008, 9,000 in 2014) stay SUMMARY.

## 11. Seqlock
- SUMMARY (Wikipedia): beats a reader-writer lock when readers are many and writers few; fails for pointer data; heavy writing can starve readers.
- Perfbook (line 11815): "sequence locks incur the overhead of a pair of memory barriers for each attempt to execute the critical section." QUOTED, comparison row.

## 12. Lock-free and wait-free structures, CAS, ABA
- Definitions (QUOTED, Wikipedia): wait-free means "every operation has a bound on the number of steps". Herlihy 1991, TOPLAS 13(1), CAS has infinite consensus number. TEXTBOOK.
- Measured: SUMMARY (Wikipedia) universal constructions are slower than naive blocking designs; Kogan-Petrank queue 2011 about as fast as lock-free; Alistarh and others STOC 2014.
- QUOTED (Wang, line 162): "Although the Bw-Tree is lock-free, threads are not guaranteed to make progress because of failed CaS."
- ABA: SUMMARY (Wikipedia) fixes are tags, hazard pointers (Michael 2004, TEXTBOOK), double-width CAS, LL/SC, deferred free.

## 13. Optimistic concurrency control and transactional memory
- OCC: Kung and Robinson, TODS 6(2), 1981. TEXTBOOK. Same shape as OLC, seqlock, STM.
- TL2 (Dice, Shalev, Shavit, DISC 2006). QUOTED (line 39): "concurrent red-black trees derived in a mechanical fashion from sequential code using the TL2 algorithm ... tend to perform as well as prior algorithms, exhibiting performance comparable to that of hand-crafted fine-grained lock-based algorithms. Overall TL2 is an order of magnitude faster than sequential code made concurrent using a single lock."
- QUOTED (TL2, line 241; 16-processor Sun V890, red-black tree, 5% and 30% puts and deletes, key ranges 100-200 and 10,000-20,000): "all algorithms scale quite well to 16 processors, with the exception of the mutual exclusion based one."
- QUOTED (TL2, line 242): "The hand-crafted algorithm of Hanke provides the highest throughput in most cases because its single thread performance (a measure of overhead) is superior to all STM algorithms."
- QUOTED (TL2, line 241): "Ennals's algorithm performs badly on the contended write-dominated benchmark, apparently suffering from frequent transaction collisions".
- QUOTED (TL2, line 242): the global version clock causes "invalidation traffic caused by updates of the version clock" and makes TL/PO beat TL2 on small trees.
- QUOTED (TL2, line 244): "In all benchmarks they are an order of magnitude faster than the single lock Mutex implementation."
- Cascaval and others 2008 (CACM 51(11), the "research toy" paper): not read (blocked). Second hand, QUOTED from the 2011 rebuttal (stmrebut, line 37): "[8] shows that with real hardware STM performs worse than sequential code ... These findings are based on experiments with a subset of the STAMP benchmark suite with specific configurations and one micro-benchmark, all using up to 8 threads." Line 284: in [8] vacation "stops scaling at 4 threads"; genome about 2.5x at 8 threads.
- QUOTED (rebuttal, line 13; SwissTM on SPARC 64 threads, x86 16 threads): STM "outperforms sequential code by up to 29 times on SPARC with 64 concurrent threads and by up to 9 times on x86 with 16 concurrent threads." Line 271: on STMBench7 write (90% write operations, "very high contention") STM-ME does not beat sequential.
- QUOTED (rebuttal, line 399): "STM-MT outperforms sequential code by up to 23 times compared to 29 times with STM-ME, and by 5.6 times on average compared to 9.1 times with STM-ME." (cost of transparent privatization)
- QUOTED (rebuttal, line 278): on x86, STM beats sequential in "3 out of 17 workloads with 2 threads, and in 13 workloads with 4 threads."
- HTM (SUMMARY, search snippets): best-effort, needs a lock fallback; write set about 30.5 KiB; a 2021 study found comparable to locking. ART paper (line 342): HTM insert slowed by "contention in the memory allocator causing frequent aborts".
- Needs: retry-safe transactions; for HTM short and small.

## 14. Cache coherence, false sharing, contended writes
- QUOTED (Bolosky and Scott 1993, line 216): "for applications we have studied, the contribution of false sharing to the total cost of shared memory could range from nothing to over 90% of total cost." (trace simulation, 16 programs, not wall-clock)
- QUOTED (Bolosky, line 426): quicksort data transfer cost at 8K blocks "1.2 billion cost units. At a 1K block size ... 138 million, for a ratio of 8.7"; at 128 bytes "28 million cost units, or 43 times less than that at 8K".
- QUOTED (Bolosky, line 427): "SOR application has very little false sharing. Its data transfer cost component is never greater than 10% of the total cost".
- QUOTED (Bolosky, line 430 context): "Most of the applications in our suite display performance like that of the quicksort, scene rendering, and Cholesky programs".
- Bolosky line 177 cites others: false sharing removal cut "overall bus utilization ... of up to about 25%, for cache lines no larger than 64 bytes."
- SUMMARY (Wikipedia, False sharing): 20 threads each incrementing their own byte, about 50 times more compute time than when padded to 64 bytes. Stays SUMMARY; no paper read for it. Cache coherence snooping limit about 64 processors: SUMMARY.
- QUOTED (perfbook, line 5892): "if there are 8 CPUs all incrementing the same shared variable, then each CPU must wait at least 35 nanoseconds for each of the other CPUs to do its increment before consuming an additional 5 nanoseconds doing its own increment." (writers on one word)
- QUOTED (Wang, line 709): cache-line invalidation on a shared epoch counter; "1.3x improvement with 20 threads" when removed.

## 15. Copy-on-write and persistent data structures
- SUMMARY (Wikipedia): path copying O(log n) per update on a balanced tree; Driscoll and others 1989 JCSS 38 get O(1) slowdown. Okasaki 1998. TEXTBOOK.
- Under concurrent writers a CAS on the root fails and all but one redo their copy. TEXTBOOK (reasoning, not measured here).

## 16. Log-structured writing: LSM trees and log-structured file systems
- SUMMARY (Wikipedia): memtable flushed as sorted runs, compaction; leveling vs tiering trade write amplification against read cost. O'Neil and others, Acta Informatica 33(4), 1996. Rosenblum and Ousterhout, TOCS 10(1), 1992. TEXTBOOK. Not re-read this pass.
- Single appender is the common case; one tail lock or CAS for several. TEXTBOOK.

## Writers on one structure: how throughput changes (what the papers give)
- No paper here plots throughput against the number of writers on one shared structure for all schemes. Best available:
- ART: one update thread only (row 7). Lock coupling at 20 threads, lookups: 6.6x more cycles per lookup than at 1 thread (row 4).
- Bw-tree 2013: fixed 8 threads (row 8). Wang 2018: 20 threads vs 1 thread, Masstree insert-only "scales only by 3x" (row 9).
- TL2: all schemes "scale quite well to 16 processors" except the single mutex; with the single lock "an order of magnitude" lower (row 13).
- Perfbook 10.x: update-side scaling of hash tables not read; line 11942 admits updates are the open question for RCU (row 10).
- Missing: an open paper that varies writer count on one B-tree or hash table with striping.

## Corrections against the first pass
1. Bw-tree vs BerkeleyDB: first pass "about 19 times" (a 2014 snippet). Paper: 18.7x on Xbox only; 8.6x on dedup; 5.8x on synthetic.
2. Bw-tree vs skip list: first pass "about 3 times". Paper: 3.7x synthetic, 4.4x read-only; and Wang found the paper's skip list comparison shaky: their lock-free skip list was low and varied (row 9).
3. Wang 2018: first pass said "1.1 to 2.5 times faster than the original" and "1.5 to 4.5 times slower than lock-based". Both confirmed, but the first holds for multi-threaded runs and the second compares with Masstree, B+tree OLC and ART; ART more than 4x on point lookups, B+tree 3.7x on insert-only.
4. ART: first pass attributed "OLC loses write-heavy contention" to a blog. The paper's own test has one writer and one reader and shows OLC lookups slowing under extreme skew; no many-writer test exists in it.
5. ART: first pass put the "performs very badly" quote as a search snippet; it is in the paper (line 136), with its cause (read-lock writes invalidate cache lines) also quoted.
6. B-link: first pass said empty pages cannot be removed (Wikipedia). The paper deletes by allowing nodes with fewer than K entries (line 478) and has no throughput data.
7. RCU: first pass "read-side overhead is exactly zero" (Wikipedia). Perfbook discusses a figure under 300 picoseconds on a 448-CPU machine and says reader-writer locks are four orders of magnitude slower at 192 CPUs; zero holds only for some kernel builds.
8. STM: first pass "no worse than twice as slow" (Wikipedia, 1 to 4 CPUs). TL2 paper shows STM an order of magnitude faster than one global lock, and slower than hand-built fine-grained trees on single-thread overhead. The 2008 critique's claim (slower than sequential up to 8 threads) is disputed by the 2011 rebuttal; the rebuttal itself says workloads differ.
9. False sharing: first pass "50 times" is a Wikipedia count. Bolosky and Scott give a simulated cost share of 0 to over 90%, not a wall-clock slow-down.

## URLs worked (full text)
https://db.in.tum.de/~leis/papers/artsync.pdf ; https://www.csd.uoc.gr/~hy460/pdf/p650-lehman.pdf ; https://people.csail.mit.edu/shanir/publications/Transactional_Locking.pdf ; https://15721.courses.cs.cmu.edu/spring2019/papers/07-oltpindexes1/mod342-wangA.pdf ; https://www.cs.rochester.edu/u/scott/papers/1993_SEDMS_false_sharing.pdf ; https://www.kernel.org/doc/ols/2001/read-copy.pdf ; https://www.kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.2023.06.11a.pdf ; https://infoscience.epfl.ch/record/141907/files/paper.pdf?version=1 ; Bw-tree: microsoft.com/en-us/research/wp-content/uploads/2016/02/bw-tree-icde2013-final.pdf.
## URLs failed
Cascaval: cis.upenn.edu/~blundell/stm-cacm2008.pdf (404 page), queue.acm.org/detail.cfm?id=1454466 and dl.acm.org doi pdf (Cloudflare block), wisc.edu trans-memory pdf (HTML). McKenney 1998: typeset.io copy (HTML page). First-pass failures (modde734 Bw-tree link, nan01ab pages) superseded.
Wikipedia pages used in the first pass (SUMMARY rows kept): Lock, Readers-writer lock, Seqlock, Non-blocking algorithm, ABA problem, Transactional memory, False sharing, Cache coherence, Persistent data structure, LSM tree, LFS, Read-copy-update, B-tree.
