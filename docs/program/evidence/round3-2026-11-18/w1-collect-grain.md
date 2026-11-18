# w1 collect: grain (lock granularity, intention modes, key-range and predicate locks, escalation)

Topic `grain`. Date 2026-11-19. Lane w1, round 3, task r57-0512. Sonnet collector.
`R:` = `docs/program/evidence/round3-2026-11-18/`. Paper text under `R:papers/w1/<short-name>/`.
Line numbers are those of the `pdftotext -layout` output kept in each folder.

Library records reused (searched `granularity`, `intention`, `escalation`, `key-range`, `next-key`, `predicate`,
`phantom`, `ARIES`, `Mohan`, `Lomet`, `Graefe`): x02-0300, x02-0301, x02-0101, x02-0201, x02-0700 (Gray 1976, status
`quoted`, evidence `E:concurrency-lit-1-databases.md` lines 13 to 17, `E:` = `docs/program/evidence/harness-method-status-2026-11-18/`).
Upgraded by reading the sources: x02-0211 (textbook), x02-0218 (textbook: predicate locks and next-key locking),
x02-0503 (open: Eswaran, Mohan not read), x07-0202 and x07-0203 (no measured figures for lock granularity), x07-0300
(summary), x03-0300 (Wikipedia summary), x03-0704 (Graefe 2010 cited as textbook). Not recorded in the library: Lomet 1993,
Ries and Stonebraker 1977, the SQL Server escalation page, the PostgreSQL explicit-locking page.

Counts: 7 sources opened in full or in part and quoted (Gray 1976 re-read for its line numbers, Eswaran 1976, Lomet 1993,
Graefe 2010, Ries and Stonebraker 1977, SQL Server escalation page, PostgreSQL explicit-locking page); 0 `summary`;
3 `not opened` (Mohan 1990, Graefe 2007, InnoDB manual page), plus 1 skipped (Srinivasan and Carey 1991).

Important caveat for the whole file: only one source here measures anything about grain (Ries and Stonebraker, a
simulation of 1977, with OCR noise in its tables). Gray, Eswaran, Lomet and Graefe argue or define; the engine pages
state rules and thresholds, not measured gains.

---

## 1. Gray, Lorie, Putzolu, Traiger 1976, "Granularity of Locks and Degrees of Consistency in a Shared Data Base"

- **Citation / URL:** Gray, Lorie, Putzolu, Traiger, IBM Research / IFIP 1976 (the VLDB 1975 paper reprinted).
  https://www.cs.purdue.edu/homes/bb/cs542-20Spr/readings/cc/granularity-locks.pdf . Text: `R:papers/w1/gray76/paper.txt` (OCR scan, 2371 lines).
  Status: `quoted` (library x02-0300, x02-0301 reused; I re-read the cited place and give this copy's line numbers).
- **Problem.** One lock size fits badly: a transaction touching one record and one scanning a file want different units.
- **Mechanism.** Lockable units form a tree (database, file, page, record). To lock a node in S or X, first tag every
  ancestor with an intention mode (IS, IX, SIX); intention modes are compatible with each other, so writers of different
  descendants do not collide, while a coarse S or X on an ancestor does collide with them.
- **Measured gain.** None. The paper is an argument and a protocol. Quoted: `gray76/paper.txt:79` "The choice of lockable units
  presents a tradeoff between concurrency / and overhead"; `:93` "Such a transaction would have to set and reset a large / number of locks";
  `:106` "such a coarse unit discriminates against / transactions which only want to lock one member of the file"; `:112` "lockable units of
  different granularities coexisting in the same" system. No baseline, workload or scale is given (x07-0202 records the same absence).
- **Assumes.** Data that forms a containment tree (or DAG); transactions that declare the level they need up front; a central
  lock manager through which every request passes; short transactions (lock hold time is not a topic).
- **For model-session writers (reasoned).** A repository is a tree (repo, directory, file, class, function), so the tree holds.
  The lock manager does not exist: the harness would need one, and a session does not declare its access set before it
  starts (it discovers files while working). Units of minutes make lock waits cost real time, not microseconds. Holds with no preemption
  by deadlock detection are a risk when each holder is a session that can stall for minutes.
- **Frame.** Bears on means (1), "claim smaller units than the file, with an intention mark above". The frame's phrase is
  accurate: the paper's own tag is an intention lock on every ancestor. `gray76/paper.txt:169` "Intention mode is used to "tag" (lock) all ancestors of"; `:220` "However, intention mode is compatible with itself".
  The paper does not contain the word escalation (x02-0101, searched).

## 2. Eswaran, Gray, Lorie, Traiger 1976, "The Notions of Consistency and Predicate Locks in a Database System"

- **Citation / URL:** CACM 19(11): 624-633, Nov 1976. https://www.csd.uoc.gr/~hy460/pdf/p624-eswaran.pdf (a course-hosted copy). Text: `R:papers/w1/eswaran76/paper.txt` (748 lines, two-column, read in the parts cited). Status: `quoted` (read the concept sections, not the whole proof).
- **Problem.** Locking existing records misses records that do not exist yet: a new tuple inserted into a set another transaction selected by a predicate (the phantom).
- **Mechanism.** Lock a logical set described by a predicate, not physical items. A new request conflicts with an outstanding lock when the two predicates are mutually satisfiable (a real or phantom tuple would satisfy both).
- **Measured gain.** None; no measurement. The paper itself says the general test cannot be done: `eswaran76/paper.txt:466` "recursively unsolvable (Kleene [5]), so it is not clear / how to make predicate locks "work."" and `:625` "In general this is a recursively unsolvable / problem (even if predicates are restricted..." It then restricts predicates to a "simple" class (`:631`, and `:721`, "if only simple predicates are al-").
- **Assumes.** Predicates drawn from a decidable class; one lock manager comparing all pairs of outstanding predicates.
- **For model-session writers (reasoned).** The "phantom" in code is an addition (a new function, a new registry entry, a new import) where another session assumed none. A predicate such as "all callers of f" is a query over the code, and a model's change can be tested against it, but "mutually satisfiable" for arbitrary code predicates is undecidable too; only a restricted class (names, file regions, a fixed list of registries) is checkable.
- **Frame.** Bears on the Phantom row. Confirms the frame's "range or next-key locks" are the practical, restricted forms of predicate locking (see Graefe 2010 below), not a full solution. Upgrades library x02-0218 and closes the "Eswaran not read" part of x02-0503.

## 3. Lomet 1993, "Key Range Locking Strategies for Improved Concurrency"

- **Citation / URL:** D. Lomet, VLDB 1993, pp. 655-664. https://www.vldb.org/conf/1993/P655.PDF . Text: `R:papers/w1/lomet93/paper.txt` (583 lines, OCR with errors). Status: `quoted`.
- **Problem.** Prevent phantoms in range scans with high concurrency and few locks.
- **Mechanism.** Ranges are the half-open intervals between existing index keys; each is locked with multigranularity (intention) modes, then with new modes (insert-into-range, delete-in-range) so that an insert into a range does not block reads of a key; then range, key (and finally record) are merged into one lockable resource to cut the number of locks.
- **Measured gain.** None measured. Overhead is counted as locks per operation: `lomet93/paper.txt:311` "Lock overhead is measured by the / number of locks needed by the locking protocol."; conclusion `:569` "This reduces the locking overhead dramatically." and `:570` "Maximum concurrency was retained when we intro- / duced KRL compound lock modes". The last step trades concurrency: `:453-454` "is a great simplification and reduces locking overhead, / but at the expense of concurrency" (ARIES/IM, one lock for range, key and record). No workload, contention level or scale.
- **Assumes.** A sorted index whose keys name the ranges; ranges that adapt as keys are inserted and deleted; one lock manager.
- **For model-session writers (reasoned).** The code analogue of an index is a file's ordered list of definitions or a registry's entries; "range" = the gap between two neighbouring definitions. It makes the shared-registry insert case explicit: two sessions inserting into the same gap are the case the range lock serialises, two inserting into different gaps are not. Needs an ordering of the object (source order), which a file has.
- **Frame.** Bears on the Phantom row and means (1). The frame's "Range or next-key locks" is the standard remedy; this paper shows the cost axis (number of locks versus concurrency lost).

## 4. Graefe 2010, "A Survey of B-Tree Locking Techniques"

- **Citation / URL:** G. Graefe, ACM TODS 35(3), Art. 16, July 2010. https://users.cs.utah.edu/~pandey/courses/cs6530/fall24/papers/trees/a16-graefe.pdf (course-hosted copy). Text: `R:papers/w1/graefe10/paper.txt` (1310 lines). Status: `quoted`. This is the field's trusted survey; it reports designs, not measurements (library x03-0704 was `textbook`).
- **Problem.** B-tree concurrency control is hard to understand; the survey separates it into locks (database contents, transactions) and latches (in-memory structures, threads).
- **Mechanism.** Key-range locking defined by intervals in the sort order, built on hierarchical locking applied to keys and the gaps between them; ghost (pseudo-deleted) records keep a lockable key in place after delete or before insert.
- **Measured gain.** None in this survey. It cites one comparison it does not reproduce: `graefe10/paper.txt:143` "Srinivasan and Carey [1991] compared the / performance of various locking techniques." (not opened). It states a rule of thumb: `:695` "A fine granularity of locking is required most often at hot spots, for exam-/ple, "popular" insertion points such as the high end of a time-organized B-tree." and `:697` "Coarse locks such as intention locks on a database, table, or index may be / retained from one transaction to another."
- **Quotes on the designs.** `:131` "A key value lock covers both a gap / between two B-tree keys and the upper boundary key." (ARIES/KVL, Mohan 1990, read here only through this survey); `:146` Lomet's design "attempts to adapt hierarchical and multigranularity locking to keys and half-open intervals but requires additional lock modes"; `:149` "Graefe's design [2007] applies traditional hierarchical locking more rigorously to keys and gaps (open intervals) between keys ... and achieves more concurrency with fewer special cases"; `:714` "Neither pure predicate locking nor the more practical precision locking / [Jordan et al. 1981] has been adopted in major products."; `:729` "Deletion of a key requires a lock on / both the old key and its neighbor; the latter is required to ensure the ability to / reinsert the key in case of transaction rollback."; `:746` a lock on the key value alone "cannot guarantee serializability". Escalation: `:1189` latches "do not provide advanced services such as deadlock detection or escalation", so escalation is a property of locks only.
- **Assumes.** Short transactions of microseconds to milliseconds; a latch protects the structure for the instant of the change; locks are held to end of transaction; one lock manager; a sorted structure.
- **For model-session writers (reasoned).** The lock/latch split maps to two different things: a short exclusive "apply this edit atomically" step (the Edit tool's write, seconds or less) versus the claim held while a session works (minutes). The survey's remedy for hot spots (finer lock at the insertion point, coarse intention locks retained between transactions) suggests the harness needs a fine claim at the shared registry or appended list, and a cheap coarse mark per file. Ghost records have a direct code analogue: leave a stub or tombstone line so the gap stays lockable until the delete is merged. All reasoned; nothing here was tried.
- **Frame.** Bears on means (1) and the Phantom row. Tells the frame what it misses: a lock needs a long-lived and a short-lived level (locks and latches), and deleting needs the neighbour as well as the item (`:729`), so "claim the function" is not enough when a delete or a move must be undone.

## 5. Ries and Stonebraker 1977, "A Study of the Effects of Locking Granularity in a Data Base Management System"

- **Citation / URL:** D. R. Ries, M. Stonebraker, UCB/ERL M77/34, 2 May 1977 (journal version ACM TODS 2(3), 1977, not opened). https://www2.eecs.berkeley.edu/Pubs/TechRpts/1977/ERL-m-77-34.pdf . Text: `R:papers/w1/ries77/paper.txt` (1098 lines, OCR with digit errors; numbers below are those that read clean). Status: `quoted`. Found by search; not on the brief's list; it is the one measured study of grain I found, so it was read.
- **Problem.** How large should a lockable granule be, and is predicate locking viable?
- **Mechanism.** A simulation model: a data base of `dbsize` entities divided into `lgran` equal granules; transactions lock the minimum number of granules that cover what they touch; the simulator counts useful I/O and CPU and the cost of setting locks and of conflict retries.
- **Measured gain (simulation, not an engine).** Baseline = one granule (the whole data base locked). Workload (`ries77/paper.txt:419-445`): 10 transactions, 5000 entities, transactions touching 50 to 500 entities each, lock I/O cost equal to the entity I/O cost, i.e. a lock table on disk. Result (Table 2): useful I/O 7041.957 at 1 granule (`:483`), 9437.987 at 10 (`:493`), 9572.718 at 20 (`:495`), falling to 7359.828 at 500 (`:509`), 4764.175 at 750 (`:511`), 3408.635 at 1000 (`:512`). Text: `:520` useful I/O peaks near 10-30 granules and is within about 1 % of the peak "with only 10 locks" (the OCR of the digits is damaged there). So going from the whole data base to about 10 granules gives about 34 % more useful I/O (9438 / 7042), and going to 1000 granules loses about 64 % from the peak (3409 / 9573). I computed the two ratios from the quoted table lines. `:594` "The average response time and the total number of transactions / completed at time tmax reached extremums at 100 granules." Conclusion, `:820` "it appears that a small number of granules is sufficient" and `:871` "in / most cases 10 granules appears sufficient. Hence, a very crude / concurrency control scheme seems most desirable." Abstract, `:68`: "surprisingly coarse granularity is called for".
- **Sensitivity the paper reports.** The best number of granules rose as transactions got smaller: `:891-894` "the parameter which had the most effect on the desired number of granules was the number of entities 'touched' by the transactions. As the transaction size decreased, the desired number of granules increased." Holding locks only half the transaction time (experiment 7) needed even fewer granules (`:791`); idle holds of 100 time units (about 20 seconds in their scenario) gave "remarkably similar" results with the peak at 50 granules (`:807-810`). Their model favours fine grain by design: `:831` locks are "well placed", the first granule is uncorrelated, and "no cost is added for the deadlock detection and rollback" (`:835-836`).
- **Assumes.** Uniform random access over granules, no hot spot, a single disk, a lock table with a known per-lock cost, deadlock cost ignored. Contention is moderate (10 transactions); with 20 transactions "no appreciable effect" (`:461`).
- **For model-session writers (reasoned).** The cost side of the trade does not transfer as is: a "lock" in the harness is a record in a file or a hook call, almost free, whereas a coarse lock costs minutes of waiting by a model session; so the 1977 optimum (very coarse) comes from lock cost being large against work, which is the opposite of our case. The point that transfers is the shape: the optimum moves with how much a unit of work touches (`:891`), and the curve is flat near the optimum, so an approximate grain is enough. The accesses of sessions are not uniform (hot files exist), which the model excludes.
- **Frame.** Bears on means (1). It gives the only measured shape for grain, with a stated lock cost. It also warns that "finer is faster" is not general: the same paper finds the finest grain costly under its cost assumptions.

## 6. SQL Server: "Lock Escalation (Database Engine)" documentation page

- **Citation / URL:** Microsoft Learn, "Lock Escalation (Database Engine)", fetched copy of the SQL Server 2005 version page. https://msdn2.microsoft.com/en-us/library/ms184286(v=sql.90) . Text: `R:papers/w1/sqlserver-esc/page.txt` (HTML stripped to text; the page carries no version marker in the lines I kept; it redirected to the current Learn page, so its thresholds are those of that page, fetched 2026-11-19). Status: `quoted`.
- **Problem.** Many fine locks cost memory and time; a lock manager must be able to turn them into a coarse lock.
- **Mechanism.** Escalation converts many fine locks into one table (or partition) lock, trading contention for overhead.
- **Measured gain.** None given. Rules, quoted: `sqlserver-esc/page.txt:407` "Lock escalation is the process of converting many fine-grain locks into fewer coarse-grain locks, reducing system overhead while increasing the probability of concurrency contention."; `:415` the engine "attempts to change the intent lock on the table to the corresponding full lock" and if it cannot, "no lock escalation happens at that time"; `:416` "does not escalate row or key-range locks to page locks, but escalates them directly to table locks"; `:417` retry "for each additional 1,250 locks acquired"; `:433` triggered when "a Transact-SQL statement acquires at least 5,000 locks on a single reference of a table or index"; `:437` an instance-wide trigger at 24 percent of the engine's memory by default, with "approximately 100 bytes" per lock. `:461` for relief the page lists snapshot isolation or read-committed snapshot, and warns that forcing coarse hints "should not be used in systems with more than a few concurrent users" (the page's own words, around line 460).
- **Assumes.** A central lock table in memory whose size is the cost; a statement-level count of locks; ability to wait or to fail the escalation without losing work.
- **For model-session writers (reasoned).** Escalation is the engine's own answer to "too many fine claims": count the fine claims and swap them for a coarse one above a threshold, falling back to fine ones when the coarse lock is blocked. For code: a session that has claimed many functions of one file is promoted to a claim on the file, which turns it into the present one-owner switch (r57-0406, r57-0128); the engine's rule is the same switch, set by a count of fine claims (5,000 here) and by memory. The risk the page implies, and that Graefe repeats, is that a promotion is refused while others hold fine claims, so it has to retry.
- **Frame.** Bears on means (1): the frame says "claim smaller units with an intention mark above" but not what happens when claims multiply; escalation is the missing half. Note: the Gray paper has no escalation (x02-0101).

## 7. PostgreSQL documentation, "Explicit Locking" (13.3)

- **Citation / URL:** PostgreSQL current docs, chapter 13.3. https://www.postgresql.org/docs/current/explicit-locking.html . Text: `R:papers/w1/pg-explicit-locking/page.txt`, fetched 2026-11-19. Status: `quoted`. (A sibling folder `pg-docs` of another collector holds the isolation page; not mine.)
- **Problem.** What is the grain of PostgreSQL's locks, and does it escalate?
- **Mechanism.** Table-level lock modes (eight, with ROW SHARE and ROW EXCLUSIVE as the intention-style modes taken by statements) plus row-level locks stored in the row itself.
- **Measured gain.** None given. `pg-explicit-locking/page.txt:203` "PostgreSQL doesn't remember any information about modified rows in memory, so there is no limit on the number of rows locked at one time." and the cost: "locking a row might cause a disk write". So it has no escalation: row locks are not counted in a lock table. Advisory locks (`:246`) are "application-defined meanings" which "the system does not enforce".
- **Assumes.** The lock lives in the data (row header), so the cost per lock is a write to the row, not a lock-table entry.
- **For model-session writers (reasoned).** The analogue is a claim marker stored with the item (a header comment or a sidecar record) so claiming costs one write and has no count limit; advisory locks match a harness convention nobody forces (hooks can enforce it).
- **Frame.** Shows a second answer to the overhead problem besides escalation: make the per-lock cost small instead of cutting the number of locks. The frame lists only one.

---

## What each grain would be for code (reasoned, nothing measured)

| Grain | Analogue of | What it lets two sessions do | Cost / problem |
|---|---|---|---|
| Repository / directory | database / file | Nothing in parallel under one coarse lock; a directory intention mark lets others work below | Same as one owner for the whole tree |
| File | table (or page) | Two sessions in different files; the present switch works at this grain | A very large file or a shared registry serialises all writers |
| Class / module block | page | Two sessions editing different classes of one file | Needs a parser per language; moves and renames change the unit |
| Function | row | Two sessions editing different functions | A new function between two others is the phantom (Lomet's range = the gap between neighbours) |
| Statement or line | field | Finest | Lock count grows with the edit; Ries and Stonebraker's finest grain was costly in their model; a claim that the session must set before knowing what it will touch |

The Gray protocol would require an intention mark on the file and the directory when a function is claimed, so that a
whole-file claim by another session conflicts. Escalation is the promotion from many function claims to a file claim
(SQL Server's count-based rule). None of this was tried here; the harness's enforcement points are for records
b1-0101 to b1-0126 and BUILD-IN.md section 1 to decide, not this file.

## What the frame misses (from this topic)

1. A lock needs two time scales: a short atomic step and a long claim (Graefe's latch and lock). The frame has only one.
2. Claims multiply and must be cut by a threshold and a promotion rule (escalation; SQL Server page lines 407 to 439), and promotion can be refused.
3. A delete or a move needs the neighbour's claim too (Graefe `:729`), not only the item's.
4. Predicate locking in full is undecidable (Eswaran `:466`); the engines use restricted forms (key-range). "Phantom" in code can only be guarded for a fixed class of predicates (names, registries, a position in a list).
5. Measured evidence for grain is old, simulated, and says coarse is enough when a lock is expensive and uniform access holds (Ries and Stonebraker). The lock cost in our case is the opposite (cheap lock, dear wait), so the figure is a shape, not a number to use.

## Not found

- A measurement of throughput against lock grain in a real engine on current hardware: searched "lock granularity" in the library (x07-0202, x07-0203 say none retrieved) and by web search ("Ries Stonebraker locking granularity"; "SQL Server lock escalation threshold"); found only the 1977 simulation and documentation thresholds. Paul White's 2022 articles on SQL Server escalation (sqlperformance.com) appeared in search and say the documented 5,000-lock trigger does not match what he observed; I did not open them.
- No open paper that varies the grain of locks on code or on files shared by several agents.

## Not opened

- Mohan 1990, ARIES/KVL (VLDB 1990, P392): https://vldb.org/conf/1990/P392.PDF returned "403 Forbidden" on two attempts (with and without a browser agent string); no other open copy found by one search. Known here only through Graefe 2010 (`graefe10/paper.txt:131`) and Lomet (`lomet93/paper.txt:320`, "The best locking protocol for range locking using existing MGL lock modes is ARIES/KVL"): `summary` level, no figures used.
- Graefe 2007, "Hierarchical locking in B-tree indexes" (BTW 2007): no PDF found in one search (a dl.gi.de record exists; patents carry the same technique). Described in Graefe 2010 `:149`. Skipped: the survey covers the answer.
- MySQL InnoDB locking pages (record, gap, next-key, insert-intention locks): dev.mysql.com returned a "Technical Difficulties" page to curl on three versions (8.0, 8.4, 9.1); no sign-in, a block of automated clients. Search snippets (not read as the page) state that a next-key lock is an index-record lock plus a gap lock and that gap locking can be turned off by READ COMMITTED; that is `summary`, not used.
- Srinivasan and Carey 1991, "Performance of B-tree concurrency algorithms" (cited by Graefe `:143`): the one measured comparison of B-tree locking I know of from the references; not searched for in the time available. Worth a later read if grain gains are needed in numbers.
- Oracle, FoundationDB, CockroachDB, Spanner, LMDB, RocksDB: not opened; none of them changes the grain answer (FoundationDB and LMDB lock at whole-database or key-range level and are covered by lanes `engines` and `order`).
- Needs the owner's sign-in: none.

---

## Second attempt (2026-11-19)

Sonnet collector, brief `R:w1-brief-second.md`. Paper text under `R:papers/w1/<short-name>/`. Counts: 4 papers tried; 4 opened
(Mohan 1990, Graefe 2007, Srinivasan and Carey 1993, the InnoDB manual page). Only one of them (Srinivasan and Carey) measures
anything about grain, and its figure is a curve whose values the text does not give. Nothing above this section was changed.

### URLs tried

- Mohan 1990: `https://vldb.org/conf/1990/P392.PDF`, `https://www.vldb.org/conf/1990/P392.PDF`, `http://www.vldb.org/conf/1990/P392.PDF` (plain curl):
  all 403. Two searches for another host ("ARIES/KVL", Mohan, key-value locking, pdf) returned only vldb.org, dblp, bibtex and
  reviewer pages and Graefe 2010. One other hit, `https://ics.uci.edu/~cs223/papers/p371-mohan.pdf`, is Mohan's SIGMOD 1992 paper (p371), not this
  one; I stopped that download unread. I made one test request to the vldb.org URL with a browser agent string; it returned a PDF of about 560 KB. I
  deleted it unread, because the brief says a block is not to be worked round. A copy already sat in the checkout at
  `R:papers/w1/mohan90/paper.pdf` (1,682,631 bytes, written 00:13 on 2026-11-19, by a session that left no note; its title page reads VLDB 1990,
  Brisbane, ARIES/KVL). I did not change it; I copied it to `R:papers/w1/mohan90-second/paper.pdf` and read that copy. Where it came from is not
  recorded, so the text is `quoted` for what the paper says, but the route is not one I can name. If the owner wants the route clean, he can fetch
  the vldb.org file himself.
- Graefe 2007: search found the GI record `https://dl.gi.de/items/a5289524-9b39-4b10-8cc8-3d9a1082be44/full` (BTW 2007, LNI P-103, pages 18-42); it lists
  one file, `18.pdf`, 233 KB. `https://dl.gi.de/bitstreams/9f283897-1a24-4714-aa57-c773e6c2da96/download` returned 200, `application/pdf`, 238,797 bytes,
  `%PDF-`. Open, no sign-in (the record's tooltip says "Request a copy", but the file downloaded without a request).
- Srinivasan and Carey: the SIGMOD 1991 version is in the ACM library (account needed; not tried). The Wisconsin report (TR999, `minds.wisc.edu`) not tried
  because the journal copy opened. `https://www.csd.uoc.gr/~hy460/pdf/P361.pdf` (VLDB Journal 2(4):361-406, 1993; course-hosted): 200,
  `application/pdf`, 2,681,839 bytes. The first download stopped at 1,604,944 bytes (connection fault); resumed with `curl -C -` to the full size, then read.
- InnoDB: `https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html` returned 200, 112,691 bytes, title "MySQL 8.4 Reference Manual 17.7.1 InnoDB Locking".
  The first collector got the "Technical Difficulties" page from this host; today it answered with the real page on the first try with no special headers. Also tried:
  a `web.archive.org` copy (403, not used); `mariadb.com/kb/en/innodb-lock-modes/` (200, 2 MB, MariaDB's own manual, not read: a different product);
  `docs.oracle.com/cd/E17952_01/mysql-8.0-en/innodb-locking.html` (200, 30 KB, same title, not needed).

## 8. Mohan 1990, "ARIES/KVL: A Key-Value Locking Method for Concurrency Control of Multiaction Transactions Operating on B-Tree Indexes"

- **Citation / URL:** C. Mohan, VLDB 1990, pp. 392-405. Copy: `R:papers/w1/mohan90-second/paper.pdf` (see the provenance note above). Text: `R:papers/w1/mohan90-second/paper.txt`
  (`pdftotext` raw mode, one paragraph per line, so a line number is a paragraph). Status: `quoted`.
- **Problem.** Serializable multi-operation transactions on B-tree indexes, with fine-grain locks, rollback without deadlock, and more concurrency than the System R index protocol.
- **Mechanism.** Lock the key value (not the page); a lock on a key value is a range lock for the gap below it ("next key locking"); IX and SIX, made for table locks, are reused for key values so
  that two inserters of the same value do not block each other; latches (cheap, short, for the page) are kept apart from locks (long, for the transaction).
- **Measured gain.** None. The paper has no experiment, simulation or throughput figure; it is a protocol with tables of modes. What it says on cost:
  `mohan90-second/paper.txt:128` "Acquiring a latch is much cheaper than acquiring a lock (in the no-conflict case, 10s of instructions versus 100s of instructions)";
  `:418` "checking for compatibility among predicates is much more expensive than checking for compatibility among locks" (a hash table for locks; "No such simple data structure exists" for predicates).
  On the problem it solves: `:9` the System R protocol's concurrency "has been found to be inadequate by some customers [IBM85]" (a claim, no figure).
- **Quotes on the design.** `:399` "a lock on a key value is really a range lock on the range of keys spanning the values from the preceding key value that is currently present in the index to the locked key value";
  `:405` "We call this design principle range locking via next key locking" and "This is a conservative approach since the nongrantability of the X lock on the next key is interpreted to imply that the holder of that lock does not want the insert to happen ... when in fact the holder might have the lock on the next key for a totally different reason"
  (so an insert can be refused for a reason that has nothing to do with it); `:869` IX on the key value "allows the insertion of the same key value ... by multiple transactions concurrently since IX is compatible with IX";
  `:289` for unique indexes, insert and delete must take X, not IX, or a rollback can put back a duplicate; `:406` a delete holds the next-key lock to commit, an insert only for an instant, "since an uncommitted inserted key is visible to transactions that visit the page later, whereas an uncommitted deleted key is not visible".
- **Assumes.** A sorted index; a lock manager with hashed lock names; short transactions; locks owned by transactions and latches by processes; an X lock already held on the data record or page before the index call (`:235`).
- **For model-session writers (reasoned).** The shared-registry case is the point: two sessions adding different entries to one registry need not wait on each other (IX with IX) if the harness knows the entries differ,
  but the next-key rule is conservative and can make a session wait for a reason that has nothing to do with it (`:405`), which at minutes per hold is dear. The delete asymmetry carries: a delete leaves a claim on the neighbour to the end,
  an add only for the instant of the add (`:406`). The latch cost ratio (10s against 100s of instructions) says nothing about the harness, where both costs are tiny next to a session's minutes.
- **Frame.** Means (1) and the Phantom row. Settles what the first collector had only at `summary` level (via Graefe 2010 `:131` and Lomet `:320`): the key-value lock covers a gap plus a key. No figure for the lane.

## 9. Graefe 2007, "Hierarchical locking in B-tree indexes"

- **Citation / URL:** G. Graefe, BTW 2007 (LNI P-103), pp. 18-42, HP Labs (much of it done at Microsoft). https://dl.gi.de/bitstreams/9f283897-1a24-4714-aa57-c773e6c2da96/download . Text: `R:papers/w1/graefe07/paper.txt` (1295 lines, `pdftotext -layout`). Status: `quoted`.
- **Problem.** The step from "lock the whole index" to "lock a page or a key" is too large for very large indexes (millions of pages, billions of keys).
- **Mechanism.** Three designs of intermediate granule: locks on separator keys in interior nodes (a range of any size), key-prefix levels for multi-column keys, and the traditional page level; plus online lock escalation and de-escalation and a
  simplified key-range lock whose modes are those of ordinary hierarchical locking applied to keys and the gaps between them.
- **Measured gain.** None: no experiment, simulation or benchmark in the text (searched: measure, experiment, performance, benchmark, percent). The case is arithmetic and argument. Figures given: `graefe07/paper.txt:53` "Each lock structure takes 64-128 bytes in most implementations";
  `:61` "Acquiring and releasing a single lock costs thousands of CPU cycles"; `:62-65` "millions of locks require billions of CPU cycles, which is why hierarchical locking and automatic lock escalation are very important for commercial workloads";
  `:67-73` "A single ill-advised lock escalation suffices, however, to reduce the multi-programming level to one ... tens or hundreds of such transactions operate concurrently on a single B-tree index. If a single one of them ... escalates to an index lock, no other transaction can update even a single B-tree entry, the multi-programming level collapses and server throughput drops accordingly." These are claims, with no workload or count behind them.
- **What it says engines do.** `:258-270` SQL Server escalates from keys or pages to the index by an initial and an incremental threshold, and "does not support lock de-escalation"; `:274-275` "The only commercial database system that supports lock de-escalation seems to be Oracle's (formerly Digital's) RDB product", only for lock caching in a shared-disk cluster.
- **Assumes.** A sorted B-tree; one lock manager with a hash table; a transaction that remembers, in private memory, the fine locks it would need to de-escalate (`:348-351`); that escalation thresholds and the starting level can be tuned (it says the policy research is not done, `:862-864`).
- **For model-session writers (reasoned).** The collapse at `:67-73` is the failure of today's two-way switch: one session promoted to whole-file ownership stops everyone else in that file. De-escalation is the missing move: a session holding a file claim hands back to function claims when others wait, if it kept a list of the functions it actually read. Whether a model session can do this is unknown; nothing was tried. The lock count does not worry us (3 to 16 writers), so the memory argument (`:53`) does not carry; the throughput-collapse argument does.
- **Frame.** Means (1): supplies the other half of escalation (de-escalation, absent from section 6 above) and says the one-owner switch can be the mistake of one escalation. No figure for the lane; this is the design Graefe 2010 `:149` cites as getting "more concurrency with fewer special cases".

## 10. Srinivasan and Carey 1993, "Performance of B+ Tree Concurrency Control Algorithms"

- **Citation / URL:** V. Srinivasan, M. J. Carey, VLDB Journal 2(4): 361-406, 1993 (the longer version of SIGMOD 1991, pp. 416-425, not opened). https://www.csd.uoc.gr/~hy460/pdf/P361.pdf . Text: `R:papers/w1/srinivasan93/paper.txt` (2296 lines, OCR-like layout; the throughput curves are images whose numbers did not come out as text). Status: `quoted`. Read: abstract, workload model, the long-term locking section (lines 1955-2060), conclusions in part. Not read line by line: the experiments 1 to 3 on the B-tree algorithms themselves (they are about lock-coupling and latching of the tree, not about the grain of locks held by a transaction).
- **Problem.** Which B+-tree concurrency algorithm gives the most throughput, and does a coarse lock held to the end of a transaction cancel the gain?
- **Mechanism.** A simulation of a centralized DBMS (buffer manager, lock manager, CPUs, disks). Algorithms compared: lock-coupling with X locks (B-X), with SIX locks (B-SIX), optimistic descent, top-down, and B-link (LY-LC). In the last experiment a transaction holds locks to its end at one of two grains: the leaf page (PAGE-LOCK) or the record (RECORD-LOCK).
- **Measured gain, grain change (the only one in the paper).** Section 7 (`srinivasan93/paper.txt:1955-2020`). Workload: 50% inserts, 50% deletes; transactions of 1 or 10 tree operations ("batching factor"); initial tree 40,000 entries and "around 250 leaf pages" (`:1999`), the high-fanout tree (200 entries per page, `:694`); 1 CPU, 8 disks, 200 buffers; multiprogramming level 0 to 100 (Figure 23, `:2026`); B-link algorithm LY-LC throughout; keys uniform, no hot spot (`:617-618, :637-638`); deadlocks broken by aborting the most recently started transaction, which undoes its work and re-executes (`:1990-1993`).
  Result in words: `:2006` "virtually no difference between leaf-page locking and record locking for a batching factor of 1"; `:2010` record locking at batching factor 10 "performs very close to record locking with a batching factor of 1"; `:2012-2017` "leaf-page locking with a batching factor of 10 performs much worse ... The reduced performance of leaf-page locking at higher batching factors is due to deadlocks ... These deadlocks cause transaction aborts and re-executions that result in a severe loss of throughput." The cause given: `:2018-2019` "there are many more record IDs (around 40,000) than there are leaf pages (around 250), so very few deadlocks occur with record locking". No throughput number or ratio can be quoted: the values are in Figure 23, which `pdftotext` returned as noise (`:2027-2035`), and I did not read the figure from the image. So the size of the loss is `not read`.
  Conclusion `:2022-2023, :2049-2051`: using a highly concurrent B+-tree algorithm "is warranted only if highly concurrent long-term locking strategies are used", and "leaf page locking is unlikely to be sufficient, and it appears necessary to use record locking (or another highly concurrent strategy like key-value locking [Mohan, 1990])". Abstract `:23` "we demonstrate the need for a highly concurrent long-term lock holding strategy".
  Also in the paper, for the tree algorithms (not grain): abstract `:19-22` updaters that "lock-couple using exclusive locks perform poorly as compared to those that permit more optimistic index descents" and "the B-link algorithms are seen to provide the most concurrency and the best overall performance".
- **Assumes.** Uniform access (no hot spot, by design, `:617-618, :637-638`); short operations; deadlock detection at one site; aborted work is undone and rerun at no extra model cost beyond the re-execution; transactions of 10 operations at most. The lock grain was varied only between two levels, the page and the record.
- **For model-session writers (reasoned).** Direction transfers, size does not. The mechanism it gives for the loss is the one that matters here: when a unit is large compared to the number of things being touched (250 pages against 40,000 records), many writers hold overlapping coarse units to the end of their transaction, wait on each other in cycles, and deadlock; every deadlock costs a full redo. For a session the redo is minutes of tokens, not milliseconds, so the loss per deadlock is far larger, while the number of writers (3 to 16) is far below an MPL of 100, so deadlocks are rarer. The finer grain is worth more than 40,000/250 = 160 times only if the writers' accesses are spread; hot files (a shared registry) are what the model excludes. Both the access spread and the ratio of units to writers are measurable in a repository's history; none was measured.
- **Frame.** Means (1) and the claim that finer is better when claims are held long. This is the only measured support in the lane's literature for "a coarse claim held to end of transaction costs aborts"; it gives its mechanism (deadlock), not a number we can use. It also says a fine grain on the structure (B-link) is wasted if the long-held lock is coarse: a hint for the harness that a file-level "own copies" merge protocol and a function-level claim must be chosen together.

## 11. MySQL 8.4 Reference Manual, 17.7.1 "InnoDB Locking" (record, gap, next-key, insert-intention, intention locks)

- **Citation / URL:** https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html , fetched 2026-11-19. Text: `R:papers/w1/innodb-second/page.txt` (HTML stripped, 617 lines; the first 270 lines are the navigation menu). Status: `quoted`. A documentation page: rules, no measurement.
- **Problem.** What grains does InnoDB lock at, and what does the gap lock cost in concurrency?
- **Mechanism.** Row locks are index-record locks (`:353-362`, the hidden clustered index is used if none exists); a gap lock is on "a gap between index records" (`:376`); a next-key lock is a record lock plus a gap lock on the gap before the record (`:432-440`); table-level intention locks IS and IX let row and table locks coexist.
- **Measured gain.** None given. The page states the trade in words: `innodb-second/page.txt:386` "Gap locks are part of the tradeoff between performance and concurrency, and are used in some transaction isolation levels and not others." Rules quoted: `:280-281` "InnoDB supports multiple granularity locking which permits coexistence of row locks and table locks"; `:342-343` intention locks "do not block anything except full table requests"; `:389-392` gap locking "is not needed for statements that lock rows using a unique index to search for a unique row" but does occur if the search uses only some columns of a multi-column unique index; `:403-412` gap locks are "purely inhibitive": shared and exclusive gap locks do not conflict, and several transactions can hold the same gap; `:416-420` "Gap locking can be disabled explicitly. This occurs if you change the transaction isolation level to READ COMMITTED ... gap locking is disabled for searches and index scans and is used only for foreign-key constraint checking and duplicate-key checking"; `:461-465` by default (REPEATABLE READ) next-key locks are used for searches and index scans, "which prevents phantom rows"; `:483-485` insert-intention locks let transactions inserting at different positions of one gap "not wait for each other".
- **Assumes.** Row locks live in an index; the gap is a gap between existing keys; the user picks the isolation level that sets how many gaps are locked.
- **For model-session writers (reasoned).** It is the production form of the Lomet and Mohan range lock, with two features the earlier papers do not state so plainly: gap locks do not conflict with each other (they only block inserts), and the insert-intention lock removes the wait between two inserts into the same gap at different positions. For two sessions adding different entries into one registry between the same two neighbours, that is the case that would not need to serialise. The cost it names is the one we have: a gap lock held to the end of a transaction blocks every insert in that gap, and the engine's own remedy is to give up phantom protection (READ COMMITTED) for the sake of concurrency. A harness choosing "guard the gap" or "do not guard it, and let the test suite catch the phantom" is making the same choice.
- **Frame.** Phantom row, means (1). Upgrades the first collector's search-snippet `summary` to `quoted`.

## Findings that bear on the lane's frame (second attempt)

1. Srinivasan and Carey `:2012-2019`: coarse units held to end of transaction (250 leaf pages) against fine (40,000 records), 10 operations per transaction, produced "a severe loss of throughput" through deadlock and re-execution; the size is only in Figure 23 and was not read. The mechanism is the one a session pays most for (the redo).
2. Graefe 2007 `:67-73`: one escalation to an index lock lets no other transaction update a single entry and "the multi-programming level collapses"; the remedy proposed is de-escalation and intermediate granules. An argument, not a measurement.
3. Mohan 1990 `:405-406` and InnoDB `:403-412, :483-485`: a gap claim blocks inserts only; a delete holds its neighbour to the end, an insert only for an instant; inserts at different positions of one gap need not wait. All rules, no figures.
4. The measured evidence for grain is still two items, Ries and Stonebraker 1977 (simulated, 10 granules enough when locks are dear) and Srinivasan and Carey 1993 (simulated, record against leaf page); neither measured an engine on current hardware, and neither measured code.

## Still not opened after the second attempt

- Srinivasan and Carey, SIGMOD 1991 short version: ACM library, account needed; the 1993 journal version was read in its place. Figure 23 values: in the image only.
- Mohan 1990 from vldb.org by plain curl: still 403; read from a copy of unrecorded route (see above).
