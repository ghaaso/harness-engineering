# t1 production: trees in engines people run, and the engine teams' own accounts

Date 2026-11-19. Collector: one more collector of lane t1 (sub-topic 6). Extractor file later: x42.
`R:` = `docs/program/evidence/round3-2026-11-18/`. `P:` = `R:papers/tree/` (git-ignored). Design and reading only.
Marks: `quoted` (exact words read in the source file named), `reasoned` (my inference). Every figure that comes from a
company or an engine team is **self-reported**: uncontrolled, from their own production, not a benchmark we can repeat.
Line numbers are lines of the `paper.txt` (or the named file) in the folder. For two-column PDFs one line holds both
columns; the quote is the left or the right half of that line.

## Library records used / upgraded

Used (all `quoted`, from earlier full readings; not re-read here): x03-0319, x03-0322, x03-0324 (Lehman and Yao 1981:
a small constant number of locks, at most three nodes locked, deletion without merging) and x03-0605 (a first pass
wrongly said empty pages cannot be removed). The PostgreSQL README below confirms and extends x03-0324 in a running
engine. `library/lookup.sh` found no record on WiredTiger, InnoDB pages, LMDB, RocksDB, FoundationDB's storage engine,
Pebble, Discord or Uber: all blocks below are new. Upgraded: none (no earlier `summary` record covers these).

## Gate summary

- G1 PostgreSQL nbtree README: keeps Lehman and Yao's right-link; flags the left page INCOMPLETE_SPLIT until the parent has its downlink; an interrupted split is finished lazily at the next insertion or vacuum, not at recovery (pg-nbtree/readme.txt:666-698). `quoted`.
- G2 Same README: a page is removed only when completely empty, the rightmost page of a level is never deleted, so height never decreases; a "fast root" is kept instead (readme.txt:236-240, 365-376). `quoted`.
- G3 InnoDB manual: sequential inserts leave pages about 15/16 full, random inserts 1/2 to 15/16; a page below 50% (MERGE_THRESHOLD) is merged (innodb-doc/paper.txt:288-293, 305-309). `quoted`.
- G4 Facebook, RocksDB paper 2017: B-tree pages "only 1/2 to 2/3 full (as measured in Facebook production databases)"; RocksDB used about 50% less space than compressed InnoDB. Self-reported (rocksdb-cidr2017/paper.txt:182-186, 341-345). `quoted`.
- G5 Facebook, MyRocks 2020: 25% to 30% of each InnoDB block wasted; defragmentation lost to a stream of random writes; instance size down 62.3%. Self-reported (myrocks/paper.txt:174-180, 28-30). `quoted`.
- G6 RocksDB team 2021: write amplification 10-30 for leveled compaction was "too high" for write-heavy users, so tiered compaction (4-10) was added; most of 42 deployments were space-bound. Self-reported (rocksdb-evolution/paper.txt:266-272, 330-333). `quoted`.
- G7 Discord 2023: Cassandra grew from 12 nodes (2017) to 177 (2022); a hot partition raised latency across the cluster; fixes were request coalescing in front of the store and a move to 72 ScyllaDB nodes. Self-reported (discord-scylla/paper.txt:95-96, 101, 119, 135-136). `quoted`. Not a B-tree.
- G8 Uber 2016: an update in Postgres writes a new tuple and every index entry; a replica bug made B-tree rebalancing a feared failure; the team moved to MySQL. Self-reported, from an archive copy (uber-pg-mysql/paper.txt:153, 161-168, 193). `quoted`.
- G9 LMDB: one write transaction at a time, readers take no locks, nothing overwritten; a long reader stops page reuse (lmdb-engine/lmdb.h:22-26, 107-110); append-order insert splits at the new key (mdb.c:9895-9898); page under 25% full is a merge candidate (mdb.c:1089-1092). `quoted`.
- G10 FoundationDB 2021: a 5-second MVCC window bounds memory; longer work "can be divided into smaller transactions"; storage is an unversioned SQLite B-tree plus an in-memory multi-version log. Self-reported (fdb-sigmod/paper.txt:363-368, 710-722). `quoted`.
- G11 Pebble (CockroachDB) design note: flushes and compactions are paced by an estimate of "compaction debt", kept constant, so background work does not spike foreground latency (pebble-doc/paper.txt:637-657, 700-712). `quoted`.

## Papers and pages

### P1. The PostgreSQL project, "src/backend/access/nbtree/README" (source tree, master branch, read 2026-11-19). Read from: raw.githubusercontent.com (postgres/postgres). Folder: P:pg-nbtree/ (readme.txt, 1083 lines). Read: lines 1-160, 232-380, 650-730 in full; the rest by search.
- Problem: put Lehman and Yao's concurrent B-tree into a production engine with shared buffers, crash recovery and background cleanup (VACUUM).
- Mechanism: each page has a right-link and a high key, so a searcher that meets a split follows the link right and needs no read lock beyond one page. A split flags the left page INCOMPLETE_SPLIT until the parent gets its downlink.
- Measured gain: none. A design note, no number. Quoted: "Compared to a classic B-tree, L&Y adds a right-link pointer to each page, to the page's right sibling." (readme.txt:17-18)
- Operations (quoted):
  - Search: the tree can "be searched without holding any read locks (except to keep a single page from being modified while reading it)" (readme.txt:20-22). Because buffers are shared the engine adds page-level read locks: "This reduces concurrency but guarantees correct behavior." (readme.txt:63-68).
  - Split and ascent: "the only point where Lehman and Yao have to simultaneously hold three locks (a lock on the child, the original parent, and the original parent's right sibling)" (readme.txt:139-142). PostgreSQL releases the parent before taking its right sibling.
  - Root change: "we split the root in the same way that any other page would be split, then construct a new root page holding pointers to both of the resulting pages"; "searches will find the data that's been moved into the right sibling even if they read the meta-data page before it got updated" (readme.txt:112-123). An inserter that needs a level above the old root re-descends the tree (readme.txt:127-137).
  - Half-split state and who finishes it: "the left page is flagged to indicate that the split is not yet complete (INCOMPLETE_SPLIT)"; "incompletely split pages should not be seen under normal circumstances; only if insertion to the parent has failed for some reason" (readme.txt:666-675). Completion is lazy: before 9.4 it was done "immediately at end of recovery", now "lazily at the next insertion or vacuum... that made the recovery much more complicated" (readme.txt:694-698). VACUUM does not add missing downlinks because "inserting a downlink might require splitting a page, it might fail if you run out of disk space" (readme.txt:656-662).
  - Merge: pages are removed only when "completely empty of items"; "Merging partly-full pages would allow better space reuse, but it seems impractical to move existing data items left or right" because a scan in the other direction might miss items; "we *never* delete the rightmost page on a tree level" (readme.txt:232-240). Removal has two stages with a "half-dead" page, and "the next VACUUM will find the half-dead leaf page and continue the deletion" (readme.txt:283-316, 690-692).
  - Height: "it's impossible for the height of the tree to decrease"; a "fast root" pointer lets searches start at the lowest single-page level (readme.txt:365-376).
- Assumes: short page-level critical sections; pages in shared memory; a structure change takes microseconds; a background process (VACUUM) exists.
- With sessions as nodes (reasoned): what carries over is the rule, not the locks. A visitor that arrives during a split is never blocked: a pointer and a bound send it right, and a later visitor or a cleanup job adds the missing parent link. For sessions: when a leaf overflows, a sibling can start and the old leaf records "my range now ends at K, go to sibling S" with nobody paused; the coordinator adds the parent link later. The assumption that breaks: PostgreSQL's half-split lasts microseconds, a session's lasts minutes, so completion must be an explicit job of the coordinator, not a side effect of the next visitor. PostgreSQL moved to lazy repair because repair at recovery was "much more complicated"; with minutes per step the same trade favours lazy repair even more. Small work: no splits needed. Very large work: the never-merge, never-shrink rule (height only grows, fast root) suits a project that does not get smaller.
- Status: quoted.

### P2. MySQL reference manual 8.0, "The Physical Structure of an InnoDB Index". Read from: dev.mysql.com. Folder: P:innodb-doc/ (paper.txt, 391 lines, page text). Read: the passage on fill and merge only.
- Problem: how InnoDB packs B-tree pages and when it merges them.
- Mechanism: pages keep 1/16 free on insert; below MERGE_THRESHOLD the tree is contracted.
- Measured gain: none (documentation).
- Operations (quoted): "InnoDB tries to leave 1/16 of the page free for future insertions and updates... If index records are inserted in a sequential order (ascending or descending), the resulting index pages are about 15/16 full. If records are inserted in a random order, the pages are from 1/2 to 15/16 full." (paper.txt:288-293). "The innodb_fill_factor variable defines the percentage of space on each B-tree page that is filled during a sorted index build, with the remaining space reserved for future index growth." (paper.txt:294-299). "If the fill factor of an InnoDB index page drops below the MERGE_THRESHOLD, which is 50% by default... InnoDB tries to contract the index tree to free the page." (paper.txt:305-309).
- Assumes: pages in a buffer pool; many small inserts.
- With sessions as nodes (reasoned): the engine's own statement of the packing law: arrival order decides fill (15/16 for key-ordered arrival, 1/2 to 15/16 for random), and a bulk build sets fill by a parameter. Our planned 0.75 for a bulk load is a parameter here too, not a law; the default of a rival engine is higher. It does not say what "full" is when the unit is tokens. Ratio to carry: merge threshold is half of full.
- Status: quoted (page text by curl, not a model summary).

### P3. Dong, Callaghan, Galanis, Borthakur, Savor, Stumm, "Optimizing Space Amplification in RocksDB", CIDR 2017. Read from: cidrdb.org/cidr2017/papers/p82-dong-cidr17.pdf. Folder: P:rocksdb-cidr2017/. Pages read: abstract, sections 1-3 and 5 (about 60% of 619 lines).
- Problem: at Facebook, space is the first bottleneck on flash; compare an LSM engine with a B-tree engine on social-graph workloads.
- Mechanism: leveled LSM with dynamic level sizes (space amplification under 1.111) plus compression; the B-tree side of the comparison rests on page fill.
- Measured gain (self-reported): "the storage space used by RocksDB is about 50% lower than the space used by InnoDB with compression"; "the amount of data written to storage by RocksDB is between 10% and 15% of what InnoDB writes out"; "the number and volume of reads is 10% - 20% higher in RocksDB that for InnoDB" (paper.txt:341-352). In LinkBench the write volume per transaction "is less than 20% of the volume of data written by InnoDB" (paper.txt:414-418). Baseline InnoDB; workloads LinkBench, TPC-C and a review of Facebook MySQL installations.
- Operations: compaction merges sorted files level to level, in several threads (paper.txt:180-186).
- B-tree occupancy (quoted): "B-tree space utilization will be poor with its pages only 1/2 to 2/3 full (as measured in Facebook production databases). This fragmentation causes space amplification to be worse than 1.5 in B-tree-based storage engines." (paper.txt:182-186).
- Assumes: flash, write-heavy and mixed OLTP, space as the cost driver.
- With sessions as nodes (reasoned): 1/2 to 2/3 is a production measure of B-tree occupancy under mixed random updates; it sits between Yao's ln 2 (about 0.69) and our planned 0.75 and well below InnoDB's 15/16 for ordered arrival. So a tree that grows by random arrival should be budgeted at 0.5 to 0.67, not 0.75. The batch trade it shows: 5 to 10 times fewer writes for 10% to 20% more reads. It assumes background compaction that costs no person's time; a session doing the fold would cost tokens, so the fold must be rare or cheap. Small job known up front: bulk fill. Growing job: expect 1/2 to 2/3.
- Status: quoted.

### P4. Matsunobu, Dong, Lee, "MyRocks: LSM-Tree Database Storage Engine Serving Facebook's Social Graph", PVLDB 13(12), 2020. Read from: vldb.org/pvldb/vol13/p3217-matsunobu.pdf. Folder: P:myrocks/. Pages read: abstract, sections 1-2, migration passages (about 40% of 898 lines).
- Problem: halve the number of servers holding the social-graph database; InnoDB's B-tree wasted space and wrote much to flash.
- Mechanism: put RocksDB under MySQL; migrate by loading indexes straight into the LSM.
- Measured gain (self-reported): "MyRocks also reduced the instance size by 62.3% for UDB data sets" against compressed InnoDB; servers went "to less than half" (paper.txt:28-34, 119-121); the goal was "to reduce the number of UDB servers by 50%" (paper.txt:38-40).
- What broke (quoted): "the B-Tree structure wasted space because of index fragmentations... approximately 25% to 30% of each InnoDB block space was wasted. We tried to mitigate the problem with B-tree defragmentation, but it was less effective on our workload than expected. In UDB, a continuous stream of mostly random writes would quickly fragment pages that were just defragmented." (paper.txt:174-180).
- Operations: the bulk load "could load indexes directly into the LSM-tree and bypass all MemTable writes and compactions" (paper.txt:116-117).
- Assumes: a stream of mostly random writes; flash; replicas that can be migrated one at a time with a shadow-traffic tool.
- With sessions as nodes (reasoned): re-packing (redistribution) was tried and lost to the arrival of new writes: the arrival rate set the occupancy. A tree with a steady stream of new questions should not plan on a periodic re-pack. Building sorted and bypassing the live path is the cheap start for a job known up front. Both facts concern growth under random writes, not a small job.
- Status: quoted.

### P5. Dong, Kryczka, Jin, Stumm, "Evolution of Development Priorities in Key-value Stores Serving Large-scale Applications: The RocksDB Experience", FAST 2021. Read from: usenix.org/system/files/fast21-dong.pdf. Folder: P:rocksdb-evolution/. Pages read: abstract, sections 2-3, recap of lessons (about 45% of 1006 lines).
- Problem: what eight years of production taught about what to optimise.
- Mechanism: the target moved from write amplification, to space amplification, to CPU; one engine kept tunable, with a choice of compaction style.
- Measured gain (self-reported): "RocksDB issues only 5% as many writes per transaction as InnoDB, a B-tree based storage engine"; leveled write amplification "in the 10-30 range is too high for write-heavy applications. For this reason we added Tiered Compaction, which brings write amplification down to the 4-10 range, although with lower read performance" (paper.txt:266-272). Of 42 production deployments "Most of the workloads are space constrained" (paper.txt:330-333). Lesson 2: "Space efficiency is the bottleneck for most applications using SSDs." (paper.txt:772).
- Operations: leveled compaction merges a file into the next level when a level exceeds its target; tiered merges the runs of a level when there are too many (paper.txt:176-200).
- Assumes: background threads; SSDs; many instances per host, so "Global, per host, resource management is necessary" (paper.txt:774-775).
- With sessions as nodes (reasoned): two usable ratios, both self-reported: two merge styles trade write cost 10-30 against 4-10 for slower reads, so the right style depends on the ratio of new messages to queries; and the team's main lesson was that the binding resource changed (I/O, space, CPU), so a rule fitted to one bound goes stale. For us the bound is tokens; measure what binds before choosing a form. Not about small jobs.
- Status: quoted.

### P6. Zhou and others, "FoundationDB: A Distributed Unbundled Transactional Key Value Store", SIGMOD 2021. Read from: foundationdb.org/files/fdb-paper.pdf. Folder: P:fdb-sigmod/. Pages read: sections 1-2, recovery, lessons in section 6 (about 35% of 908 lines).
- Problem: transactions over a key-value store at scale, with a way to test it.
- Mechanism: a sequencer, resolvers and log servers fix the order; storage servers pull the committed log; each holds an SQLite B-tree plus an in-memory multi-version window.
- Measured gain: no tree figure used.
- Operations (quoted): "storage engine consists of an unversioned SQLite B-tree and in-memory multi-versioned redo log data. Only mutations leaving the MVCC window (i.e., committed data) are written to SQLite. The rollback is simply discarding in-memory multi-versioned data" (paper.txt:363-368). "FDB chooses a 5-second MVCC window to limit the memory usage of the transaction system and storage servers... If a transaction exceeds the time limit, it is often the case that the client application is doing something inefficient"; "many can be divided into smaller transactions" (paper.txt:710-722). Self-reported.
- Assumes: transactions of seconds, not minutes; memory holds the window.
- With sessions as nodes (reasoned): a hard bound on how long a unit may stay open, with the instruction to split long work into short units that each commit. A node's context window plays the role of the 5 seconds: a unit that outgrows its window is split, not extended. The B-tree is a leaf detail here. No small versus large result.
- Status: quoted.

### P7. Discord engineering, "How Discord Stores Trillions of Messages", 2023 (company blog). Read from: discord.com/blog/how-discord-stores-trillions-of-messages. Folder: P:discord-scylla/ (paper.txt is the page text, 430 lines). Read: the whole article.
- Problem: a Cassandra message store (LSM) that needed ever more upkeep.
- Mechanism: keep ordering by channel and time bucket; put a service in front that coalesces identical requests and bounds concurrency per hot partition; move to ScyllaDB.
- Measured gain (self-reported): "In 2017, we ran 12 Cassandra nodes... At the beginning of 2022, it had 177 nodes with trillions of messages" (paper.txt:95-96); afterwards "from running 177 Cassandra nodes to just 72 ScyllaDB nodes. Each ScyllaDB node has 9 TB of disk space, up from the average of 4 TB" (paper.txt:135); "fetching historical messages had a p99 of between 40-125ms on Cassandra, with ScyllaDB having a nice and chill 15ms p99"; inserts "from 5-70ms p99 on Cassandra, to a steady 5ms p99" (paper.txt:136). Not a controlled comparison: the store and the service in front changed together.
- What broke (quoted): "When we encountered a hot partition, it frequently affected latency across our entire database cluster" (paper.txt:101); "We were prone to falling behind on compactions... we'd also see cascading latency as a node tried to compact" (paper.txt:103); "High traffic to a given partition resulted in unbounded concurrency, leading to cascading latency" (paper.txt:115).
- Operations: "request coalescing. If multiple users are requesting the same row at the same time, we'll only query the database once. The first user... causes a worker task to spin up... Subsequent requests... subscribe to it." (paper.txt:119). The migrator "reads token ranges from a database, checkpoints them locally via SQLite" and cut the estimate from three months to nine days (paper.txt:128-130); the last part stuck on "gigantic ranges of tombstones that were never compacted away" (paper.txt:131).
- Assumes: key space split by channel and time; reads cost more than writes.
- With sessions as nodes (reasoned): the closest match to a leaf that many writers hit. The fix was upstream of the store: coalesce duplicates and cap concurrency per hot range, before any new structure. For sessions: a coordinator-side step that merges identical questions and caps sessions per hot leaf. Migration checkpointed by range matches a resumable hand-over. The fall from 177 to 72 nodes shows a change of engine pays when the load is far above what one node serves. No B-tree evidence.
- Status: quoted (blog text fetched by curl, stripped to text); self-reported.

### P8. Uber Engineering, "Why Uber Engineering Switched from Postgres to MySQL", 2016 (company blog). Read from: web.archive.org copy of uber.com/blog/postgres-to-mysql-migration/ (the live page answered a plain download with "Not Acceptable"; nothing was done to get round that, the public Internet Archive copy was read instead). Folder: P:uber-pg-mysql/ (paper.txt, 340 lines). Read: the whole article.
- Problem: Postgres 9.2 write cost, replication volume, replica MVCC, a corruption bug, upgrades.
- Mechanism: Postgres writes a new row version and every index entry points to the row's disk location, so an update changes every index; InnoDB's secondary indexes point to the primary key, so an unchanged index is not touched.
- Measured gain: no number. A worked example: a one-row update writes the tuple and three index entries (paper.txt:161-168). Self-reported, no baseline.
- What broke (quoted): "When a tuple location changes, all indexes must be updated" (paper.txt:153); replication of disk changes "can still cause an overwhelming amount of data for a database that uses a lot of indexes" (paper.txt:172). On a replica bug: "because replication happens at the physical level, we could end up completely corrupting our database indexes. An essential aspect of B-trees are that they must be periodically rebalanced, and these rebalancing operations can completely change the structure of the tree as sub-trees are moved to new on-disk locations" (paper.txt:193); the repair was "resyncing all of them from a new snapshot", "a laborious process" (paper.txt:194).
- Assumes: many indexes per table, many replicas, a stream of in-place updates.
- With sessions as nodes (reasoned): what a pointer names matters. A pointer to a physical place forces every pointer to change when the place changes; a pointer to a stable key does not. A node that records "my questions are in leaf S" by a stable name survives a split or move; one that records a position must be rewritten. Replicating the physical form of a rebalance was the dangerous part; replicating the logical change is safer. One company, one version.
- Status: quoted, from an archive copy; self-reported.

### P9. Chu and others, LMDB source `libraries/liblmdb/lmdb.h` and `mdb.c` (master branch). Read from: raw.githubusercontent.com/LMDB/lmdb. Folder: P:lmdb-engine/ (lmdb.h; mdb.c, 11552 lines). Read: the lmdb.h header comments; in mdb.c the fill, split and rebalance code only. (Another collector holds P:versions-lmdb and P:s2-lmdb-doc; this block adds source lines.)
- Problem: a small fast embedded B-tree with no log and no recovery step.
- Mechanism: copy-on-write pages; one writer at a time; readers see a version and take no locks; freed pages are reused after the oldest reader leaves.
- Measured gain: none in these files.
- Operations (quoted): "no active data pages are ever overwritten... Writes are fully serialized; only one write transaction may be active at a time, which guarantees that writers can never deadlock. The database structure is multi-versioned so readers run with no locks; writers cannot block readers, and readers don't block writers." (lmdb.h:20-26). "Avoid long-lived transactions. Read transactions prevent reuse of pages freed by newer write transactions, thus the database can grow quickly. Write transactions prevent other write transactions, since writes are serialized." (lmdb.h:107-110). Split: on an append the new key starts the new page (`split_indx = newindx; nkeys = 0`, mdb.c:9895-9898), otherwise the middle (`split_indx = (nkeys+1) / 2`, mdb.c:9902). Merge: "The minimum page fill factor, in tenths of a percent. Pages emptier than this are candidates for merging." with `FILL_THRESHOLD 250` (mdb.c:1089-1092); a leaf below it takes keys from a neighbour or merges (mdb.c:9572-9575); branch pages use a threshold of one key (mdb.c:9467-9472).
- Assumes: writes short; readers short.
- With sessions as nodes (reasoned): the closest design to "one session at a time changes the structure": a serialised writer removes every deadlock and needs no latch design, and readers need no pause. The authors state the cost: a long reader blocks page reuse and a long writer blocks the other writers. With 3 to 16 sessions of minutes each, serialising only the structure change (not the work in the leaves) is cheap because structure changes are rare next to leaf work; but a session that holds the write role for minutes stalls all, so a structure change must be a short step by the coordinator, never done by a leaf still thinking. Ratio: a split at the end for ordered arrival leaves full pages, a middle split leaves halves, so arrival order alone sets packing (as in InnoDB); LMDB's merge candidate is a page under 25% full, InnoDB's is under 50%.
- Status: quoted.

### P10. WiredTiger (MongoDB's engine), "Architecture Guide: B-Tree", source.wiredtiger.com/develop/arch-btree.html. Folder: P:wiredtiger-doc/ (paper.txt, 35 lines; the page is short). Read: all.
- Operations (quoted): "pages will split once their configured limit is reached, causing the B-Tree to expand"; "The root and internal pages only store keys and references to other pages, while leaf pages store keys and values." New keys go in an insert structure on the leaf; updates are "chained into an update list", so an entry "may have some old values, or deleted values, which may be visible depending on the timestamp used by a reader" (paper.txt:16, 21).
- Measured gain: none. Nothing on merge or fill in this page; the eviction page (arch-eviction.html) was fetched but not read for this file.
- With sessions as nodes (reasoned): little. A second engine splits on a configured size limit and keeps readers on timestamped versions. No law.
- Status: quoted (short page); low yield.

### P11. CockroachDB team, "Pebble vs RocksDB: Implementation Differences" (docs/rocksdb.md in the Pebble repository, master). Read from: raw.githubusercontent.com/cockroachdb/pebble. Folder: P:pebble-doc/ (paper.txt, 757 lines). Read: lines 1-72 and 637-712 (the pacing section); the rest only by search.
- Problem: flushes and compactions in an LSM contend with foreground traffic.
- Mechanism: pace flushes and compactions so that background work stays at a constant rate.
- Measured gain: none in the file (design note).
- Operations (quoted): "Flushes and compactions in LSM trees are problematic because they contend with foreground traffic, resulting in write and read latency spikes." (paper.txt:639-641). "For compaction pacing, Pebble uses an estimation of compaction debt, which is the number of bytes which need to be compacted before no further compactions are needed... We multiply the number of bytes exceeded by the level ratio and add that number to the compaction debt estimate." (paper.txt:700-709); "we want to keep the compaction debt at a constant level" (paper.txt:711).
- Assumes: background threads; bytes as the unit of work.
- With sessions as nodes (reasoned): a ratio-style law for the "buffer flush": measure the backlog (debt) in the unit of cost, here tokens, and pace the fold-in of buffered messages to keep the backlog level, rather than flush at a fixed count. Backlog is computed from level sizes times the level ratio. Self-description of a design, no measured result.
- Status: quoted.

## Could not open

| Title | Routes tried | Why |
|---|---|---|
| Uber blog, live page | plain curl to uber.com | answered "Not Acceptable"; read through the Internet Archive copy (P8), nothing done to get round the block |

Sources named in the lane list and all tried: PostgreSQL (P1), the MySQL engine (P2), MongoDB's engine (P10), LMDB (P9), RocksDB and Facebook (P3-P5), Discord (P7), plus FoundationDB, Uber and Pebble. Not in the lane list and not searched in this pass: TiKV and the history of MongoDB's change of engine; they are not closed, only unsearched, and belong to a later pass.

## Needs the owner's sign-in

None. No source needed a login. The one blocked request was the live Uber page (see above).

## What the lane can take from this file (reasoned, for the later analysis)

1. In every engine read, a structure change that must not stall readers is done with a pointer and a bound, and the missing parent link is repaired later by a named job (PostgreSQL README). With minutes per step, the "later" job must belong to the coordinator.
2. Engines do not keep a tree tight after growth: PostgreSQL never merges partly full pages and never shrinks the tree; InnoDB merges below 50%, LMDB below 25%; Facebook measured B-tree pages at 1/2 to 2/3 full and found re-packing lost to arriving random writes. Occupancy about 0.5 to 0.67 under random growth, near 15/16 for ordered arrival.
3. When write load was the problem, the teams that changed moved the cost out of the hot path (LSM compaction, request coalescing, bounded windows, paced backlog) and paid in reads: 10% to 20% more reads for several times fewer writes (self-reported, Facebook). The form depended on which resource bound, and that changed over eight years (RocksDB).
4. Everything here is self-reported, from large fleets with units of microseconds to seconds. None was measured with units that last minutes, and none says what a small job needs.

Collect finished.
