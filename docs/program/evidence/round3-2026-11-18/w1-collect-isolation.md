# w1 collect: isolation (failures and isolation levels)

Topic: `isolation`. Date: 2026-11-19. Collector: sonnet. `R:` = `docs/program/evidence/round3-2026-11-18/`.
Paper texts: `R:papers/w1/<short-name>/paper.txt` (line numbers below refer to these files; Berenson and Ports were
extracted with plain `pdftotext`, no `-layout`, so lines are reading order).

Library records reused (all looked up; the sources they rest on were re-read here, so the quotes below are from
the paper texts, not from the records): x02-0209, x02-0363 to x02-0369, x02-0708 (Ports and Grittner; confirmed
at the lines cited below); x02-0215, x02-0502, x07-0305 (Berenson, were `summary`, now upgraded to `quoted` by
this file); x02-0500, x02-0710, x07-0306, x02-0216 (Cahill 2008, still not opened); x15-0305, x15-0306. Lookup of
`Adya`: not recorded. Lookup of `phantom`: only x02-0218 (textbook).

## 1. Berenson, Bernstein, Gray, Melton, O'Neil, O'Neil, "A Critique of ANSI SQL Isolation Levels", SIGMOD 1995 (MSR-TR-95-51)

- Citation and URL fetched: https://arxiv.org/pdf/cs/0701157 (arXiv copy of the MSR tech report). Folder `R:papers/w1/berenson95/`. Status: **quoted** (read in full text, 567 lines).
- **Problem.** The ANSI SQL-92 levels are defined by three phenomena (dirty read, fuzzy read, phantom); are those definitions enough to say what a level allows?
- **Mechanism.** It does not propose an engine; it fixes the definitions. It adds phenomena (dirty write P0, lost update P4, read skew A5A, write skew A5B), restates levels as lock scopes and durations, and defines Snapshot Isolation (reads from a start-timestamp snapshot, first-committer-wins on write-write conflicts).
- **Measured gain.** None: a definitions paper. `R:papers/w1/berenson95/paper.txt` has no throughput or performance measurement (grep for throughput, performance, measure finds only the sentence at line 79 "trade throughput for correctness"). No cost per level is given here; the cost of a level comes from Ports (block 3).
- **What each level lets through (quoted).**
  - The ANSI wording leaves a hole: paper.txt:213 "ANSI SQL does not exclude this anomalous behavior other than ANSI SERIALIZABLE" (dirty write).
  - Dirty write: paper.txt:216 "T1's changes to y and T2's to x both 'survive'. If T1 writes 1 in both x and y while T2 writes 2, the result will be x=2, y =1 violating x = y." Also paper.txt:217 "You don't want to undo w1[x] by restoring its before-image of x, because that would wipe out w2's update."
  - Lost update: paper.txt:303-305 "P4 (Lost Update): ... T1 reads a data item and then T2 updates the data item ..., then T1 (based on its earlier read value) updates the data item and commits ... P4: r1[x]...w2[x]...w1[x]...c1". Possible at READ COMMITTED: paper.txt:349 "P4 is possible at the READ COMMITTED isolation level".
  - Snapshot isolation stops lost update by first-committer-wins: paper.txt:367 "This feature, called Firstcommitter-wins prevents lost updates (phenomenon P4)."
  - Read skew and write skew: paper.txt:385-388 "A5A Read Skew Suppose transaction T1 reads x, and then a second transaction T2 updates x and y to new values and commits. If now T1 reads y, it may see an inconsistent state" and "A5B Write Skew Suppose T1 reads x and y, which are consistent with C(), and then a T2 reads x and y, writes x, and commits. Then T1 writes y. If there were a constraint between x and y, it might be violated."
  - Snapshot isolation allows write skew, REPEATABLE READ does not, and the reverse for phantoms: paper.txt:397 "Write Skew (A5B) obviously can occur in a Snapshot Isolation history ... Therefore Snapshot Isolation admits history anomalies that REPEATABLE READ does not."; paper.txt:398 "Snapshot Isolation histories prohibit histories with anomaly A3, but allow A5B, while REPEATABLE READ does the opposite."
  - A phantom (predicate) variant of write skew under snapshot, the job-task hours example: paper.txt:405 "T1 reads this predicate, determines the sum is only 7 hours and adds a new task of 1 hour duration, while a concurrent transaction T2 does the same thing. Since the two transactions are inserting different data items ... this scenario is not precluded by First-Committer-Wins and can occur in Snapshot Isolation."
  - Oracle's Read Consistency (statement-level snapshot, first-writer-wins): paper.txt:416 "Read Consistency is stronger than READ COMMITTED ... but allows non-repeatable reads (P3), general lost updates (P4), and read skew (A5A)."
  - Table 4 (paper.txt:432-497, extracted in a scrambled column order, so the table is read from the rows given in text): snapshot is "Not Possible" for P0, P1, P4, P2 (single-valued), A5A; "Possible" for A5B write skew; P3 "Sometimes Possible". See paper.txt:397-405 for the prose that backs each cell; I did not re-derive the table from the scrambled cells.
- **Assumes.** Transactions have well-defined read and write sets of data items or predicates; a commit point exists; the engine knows each transaction's start and commit timestamp (snapshot isolation); "data item" can be a row, page, table or message (paper.txt, Section 2.1).
- **For model-session writers (reasoned).** The definitions carry over as a vocabulary: a session reads files at a start point (a worktree or a checkout), writes later, and commits (a merge). First-committer-wins maps to "a merge is refused if another session changed the same file since this session started"; that holds at the file or line grain and is cheap to evaluate. It does not stop write skew: two sessions each edit a different file under a shared assumption (one renames what the other calls), and a text merge accepts both. Whether the harness can record "what a session read" is a separate question (see the records the lane names, b1-0101 to b1-0126); I did not check it here. A rerun is not identical, so the "retry gets the new snapshot" step in the engine is a fresh model run that may change its edits.
- **Frame.** Bears on all four rows of the frame. The frame's "dirty read" row: dirty read is only one of the failures the paper lists; the frame **lacks dirty write (P0)**, **read skew (A5A)** and **write skew under predicate reads (the phantom variant, paper.txt:405)** as named failures. The frame's "lost update" remedy (first writer wins, write applies only on the version read) matches paper.txt:367. The frame's "phantom" row is not the same as the paper's phantom (a predicate read changed by an insert or update that makes a row match): in the paper a phantom is a read-set change, not only "two adds at the same place".

## 2. Ports and Grittner, "Serializable Snapshot Isolation in PostgreSQL", PVLDB 5(12), 2012

- Citation and URL fetched: https://www.vldb.org/pvldb/vol5/p1850_danrkports_vldb2012.pdf (same URL as record x02-0708). Folder `R:papers/w1/ports12/`. Status: **quoted** (read in full text, 643 lines).
- **Problem.** Make PostgreSQL's SERIALIZABLE level true serializability on top of snapshot isolation without the blocking of strict two-phase locking.
- **Mechanism.** Run transactions under snapshot isolation; track read dependencies with non-blocking SIREAD locks; flag a "dangerous structure" of two adjacent rw-antidependencies and abort one transaction (chosen by a "safe retry" rule); read-only snapshots can be proven safe and skip tracking.
- **Measured gain (all quoted).**
  - Headline: paper.txt:23 "our serializable mode has a performance cost of less than 7% relative to snapshot isolation, and outperforms two-phase locking significantly on some workloads."
  - Baselines: paper.txt:528 "We compare the performance of our SSI implementation to PostgreSQL's existing snapshot isolation level (REPEATABLE READ) ... we also compare with a simple implementation of strict two-phase locking for PostgreSQL."
  - SIBENCH (one table, N key/value pairs, equal numbers of single-key updates and full-table scans; 2.83 GHz Core 2 Quad, 8 GB): paper.txt:532 and paper.txt:582 "SSI obtains throughput close to that of SI ... tracking read dependencies has a CPU overhead of 10-20%." S2PL: "Locking imposes a clear performance penalty compared to SI, as update transactions cannot run concurrently with query transactions."
  - DBT-2++ in memory (25 warehouses, 3 GB, 4 threads; paper.txt:585-586): paper.txt:600 "SSI causes a 5% slowdown relative to snapshot isolation because of increased CPU usage ... SSI outperforms S2PL for all transaction mixes, and does so by a significant margin when the fraction of read-only transactions is high."
  - DBT-2++ disk-bound (150 warehouses, 19 GB, 16-core Xeon E7310, 36 threads): paper.txt:600 "the performance of SSI is indistinguishable from that of SI. Transactions rarely need to be retried; in all cases, the serialization failure rate was under 0.25%."
  - RUBiS (85% read-only, 6 GB): paper.txt:604-608 "two-phase locking incurs significant overhead from lock contention ... SSI achieves performance comparable to snapshot isolation, because dangerous structures are rare and so transactions are rarely aborted." No percentage is stated in the text; the figure (paper.txt:597, "Figure 6") was not read as numbers.
  - Deferrable read-only transactions, wait for a safe snapshot (paper.txt:611-612): "The median latency was 1.98 seconds, with 90% of transactions able to obtain a safe snapshot within 6 seconds, and all within 20 seconds."
  - Scale is small: 4 to 36 client threads, one machine, datasets of 3 to 19 GB; contention is low (abort rate under 0.25%). The paper reports no high-contention hot-spot run; paper.txt:252-254 says "the workloads we evaluate in Section 8 have a serialization failure rate well under 1%".
- **Assumes.** Short transactions with cheap abort and automatic retry ("users must already be prepared to handle transactions aborted by serialization failures", paper.txt:133); read sets visible to the engine through reads it performs itself (paper.txt:322 "tracking read dependencies using SIREAD locks"); dependencies that run partly outside the database cannot be tracked (paper.txt:334 "we were concerned about wr-dependencies that take place partially outside the database, which we cannot track"); memory for tracking is bounded by summarizing committed transactions (paper.txt:399-433); a long-running transaction raises the cost (paper.txt:298 "they take more SIREAD locks and are more likely to conflict ... they inhibit cleanup of other transactions' SIREAD locks, because these locks must be kept until all concurrent transactions complete").
- **For model-session writers (reasoned).**
  - Short units, cheap abort: **fails**. A unit is minutes and an abort costs tokens; the paper's own wording on long transactions (paper.txt:298) is the case that hurts most.
  - Known read sets: partly. A session's reads of files go through tools the harness could log; reads it does through a shell or from the model's memory are not seen (compare paper.txt:334, outside-the-database dependencies).
  - Safe retry (paper.txt:339-369: abort so that an immediate retry cannot fail the same way; abort the middle transaction T2): the idea is useful (pick the session to redo so the redo does not meet the same conflict), but "retry gives the same transaction" fails because a model rerun differs.
  - Abort rate under 0.25% was measured with thousands of short transactions; with 3 to 16 sessions of long units, the chance two overlap is high and the rate cannot be taken from this paper. A measurement here would be needed.
  - The test suite (serial, 596 s) is the commit-time check; the paper's analogue is the SSI check at commit, which costs microseconds, so the trade is very different.
- **Frame.** Bears on the write-skew row (remedy "track what each change read, validate when it lands": this is SSI, but SSI tracks only rw-antidependencies and accepts false positives, paper.txt:174 "it may have false positives because not every dangerous structure is part of a cycle"). Adds to the frame: (a) a **false positive** cost: validation aborts a session that would have been fine; (b) a **third-transaction** anomaly with a read-only reader (paper.txt:57-88 Example 2, "this anomaly requires all three transactions, including T1 - even though it is read-only"), which the frame does not name: a session that only reads (for example one that reports or runs tests) can see a state no serial order explains; (c) the **cost of SIREAD state** growing with the longest running transaction (paper.txt:298).

## 3. PostgreSQL documentation, 13.2 Transaction Isolation (version 18)

- Citation and URL fetched: https://www.postgresql.org/docs/current/transaction-iso.html, saved as `R:papers/w1/pg-docs/page.html`, text in `page.txt`; a copy fetched 2026-11-19. Status: **quoted**. (The folder `R:papers/w1/pgdocs/` belongs to another helper.)
- **Problem.** What each PostgreSQL level allows, and what the application must do.
- **Mechanism.** Three real levels (read committed, repeatable read = snapshot isolation, serializable = SSI); Read Uncommitted maps to Read Committed.
- **Measured gain.** None given in the page (documentation); it points to Ports and Grittner for performance (page.txt, last paragraph of 13.2.3: "Please see [ports12] for detailed information").
- **What each level lets through (quoted, `page.txt`).** Table 13.1: Read committed allows nonrepeatable read, phantom read and serialization anomaly; Repeatable read allows only serialization anomaly ("Phantom Read: Allowed, but not in PG"); Serializable allows none. Page text: "this view will not necessarily always be consistent with some serial (one at a time) execution ... even a read-only transaction at this level may see a control record updated to show that a batch has been completed but not see one of the detail records which is logically part of the batch" and "Attempts to enforce business rules by transactions running at this isolation level are not likely to work correctly without careful use of explicit locks". Lost update at repeatable read becomes an error: "ERROR: could not serialize access due to concurrent update ... it should abort the current transaction and retry the whole transaction from the beginning." At read committed, a second updater re-evaluates the WHERE clause on the updated row, which gives the inconsistent-snapshot case (the website.hits example).
  Note on line numbers: `page.txt` is an HTML-to-text strip, so cite its text by section (13.2.1, 13.2.2, 13.2.3); I did not index lines for it.
- **Assumes.** The application retries on SQLSTATE 40001; transactions are short ("Don't put more into a single transaction than needed for integrity purposes", "Don't leave connections dangling idle in transaction"); a read-only deferrable transaction can wait for a safe snapshot.
- **For model-session writers (reasoned).** The page's own advice (short transactions, retry, no idle-in-transaction) is the opposite of a minutes-long session that holds a snapshot. Read committed's behaviour, "re-evaluate the row against the latest committed version", is closest to what a model does when it re-reads a file before editing; repeatable read's behaviour (fail on a row changed since the snapshot) is closest to a merge refusal.
- **Frame.** Confirms the levels as a ladder and that PostgreSQL's phantom row is closed by snapshot but write skew is not; the page has the example that matches the frame's "write skew" row (control record and detail records).

## 4. Fekete, Liarokapis, O'Neil, O'Neil, Shasha, "Making Snapshot Isolation Serializable", ACM TODS 30(2), 2005

- Citation and URL fetched: https://cs.nyu.edu/~shasha/papers/serializablesnap, which is an instructor's lecture note that restates the paper's Theorem 2.1 and its proof, **not** the paper (saved as `R:papers/w1/fekete05/shasha-note.txt`). The TODS paper itself: the Minnesota course copy (www-users.cselabs.umn.edu and classpages.cselabs.umn.edu) timed out twice (curl exit 60); no other open copy found. Status: **summary** (read only a secondary text).
- **Problem.** When is a mix of snapshot-isolation programs serializable, and how to make it so.
- **Mechanism.** In any snapshot-isolation history, a cycle in the serialization graph contains two consecutive rw-antidependency edges between concurrent transactions; so preventing "two rw edges in a row" is enough.
- **Measured gain.** Not read; none claimed in the note. The note says (shasha-note.txt, near the end) of the follow-on 2008 paper that it "eliminated any chance of deadlocks at the cost of aborting some transactions that did not need to be aborted." That sentence is a lecturer's remark, mark `summary`.
- **Assumes.** Same as Ports (concurrent transactions known by snapshot and commit times; a runtime that can abort).
- **For model-session writers (reasoned).** The theorem is what makes "validate at the end" sound: only edges between concurrent sessions can form a cycle, because a write-write or write-read edge to a transaction that committed before the start is just an ordinary order. So a session that started after another merged cannot be in a cycle with it. This gives a cheap rule: only sessions that overlapped in time need a dependency check. Holds for any unit length; the cost is aborts when the overlap is long.
- **Frame.** Supports the frame's write-skew remedy; the minimum condition for an anomaly is two overlapping sessions, each reading what the other writes.

## 5. Adya, "Weak Consistency: A Generalized Theory and Optimistic Implementations for Distributed Transactions", MIT PhD thesis 1999 (MIT-LCS-TR-786); and the ICDE 2000 paper

- Status: **not opened.** Reason: a public copy was found by search (https://www.aphyr.com/data/posts/294/adya-phd.pdf, a third-party host; MIT DSpace https://dspace.mit.edu/handle/1721.1/149899 is the official record) but the thesis download failed: the aphyr host gave a truncated 720,335-byte file (damaged: pdftotext "Couldn't read xref table") on the first try and no connection on three later tries (curl exit 7 and 0 bytes); the MIT DSpace bitstream URL I tried returned a 1,515-byte HTML page, and the ICDE 2000 copy at pmg.csail.mit.edu returned nothing. The partial files were removed. Not a sign-in or a bot check.
- What is known only second hand: the Fekete note above cites "By Adya et al. [2000], a cycle exists in DSG(H)" (shasha-note.txt): the definition of a serialization graph used for snapshot histories is Adya's. Nothing else is claimed.
- Retry later with the MIT DSpace item page, to find the real bitstream link.

## 6. Cahill, Röhm, Fekete, "Serializable Isolation for Snapshot Databases", SIGMOD 2008 (and TODS 2009; Cahill's thesis 2009)

- Status: **not opened.** Reasons: the Washington course copy (https://courses.cs.washington.edu/courses/csep544/09sp/resources/fekete-sigmod2008.pdf) returned a 2,204-byte HTML page, not a PDF (matches record x02-0500/x02-0710: a login page); Cahill's thesis at https://core.ac.uk/download/41233593.pdf returned a Cloudflare "Just a moment..." bot-check page (5,414 bytes). Per the rules this is a sign-in / bot check: **needs the owner's sign-in** (or an open copy from the Sydney repository, https://ses.library.usyd.edu.au/handle/2123/5353, which was listed by the search but not tried here, and the ACM TODS 2009 page at DOI 10.1145/1620585.1620587).
- Held only as summary in the library: x07-0306 ("throughput 'approaching' SI"; no figure) and x02-0216. I give no figure from it.
- Use of Ports instead: Ports and Grittner (block 2) restates the SSI algorithm and measures it in a real engine, so it stands in (library x02-0209), but its numbers are for PostgreSQL, not for Cahill's Berkeley DB and InnoDB runs.

## Findings that bear on the lane's frame (short)

1. The frame's failure list is missing at least: **dirty write** (Berenson paper.txt:213-217), **read skew** (paper.txt:385-386), **lost update under read committed** vs prevented under snapshot (paper.txt:349, 367), and **write skew through a predicate read, which snapshot isolation does not stop** (paper.txt:405). The frame's "dirty read to own copies" row is right only if the copy is taken at one point (a snapshot); a copy refreshed in the middle of a unit gives read skew.
2. First-committer-wins (a write is accepted only if no one committed to the same item since the writer's snapshot) is what prevents lost update (paper.txt:367). It costs nothing in blocking, but the loser must redo the whole unit; for a unit of minutes that is the whole cost (reasoned).
3. The measured price of making snapshot serializable is small only in the conditions measured: under 7% overall, 5% in memory, 10-20% on a microbenchmark, abort rate under 0.25%, 4 to 36 threads, short transactions (Ports paper.txt:23, 600, 582, 600). Nothing in the paper measures minutes-long units or hot-spot contention.

## Not found

- Any measurement of the cost of each level in one table from a single study: Berenson has none; Ports compares only snapshot, SSI and S2PL (not read committed or read uncommitted). Searched: "cost of isolation levels" was not searched on the web; only the named papers were sought. Not recorded in the library either (lookup `snapshot isolation`, `Serializable`).
- Adya's generalized definitions in his own text (see block 5).
- Cahill 2008 figures (SmallBank, InnoDB, Berkeley DB) (see block 6).

## Not opened (with reasons)

| Paper | Reason |
|---|---|
| Adya thesis 1999 / ICDE 2000 | Download failed (truncated, then host unreachable; MIT bitstream URL guess returned HTML). Retry from the DSpace item page. |
| Cahill, Röhm, Fekete 2008 / TODS 2009 / thesis | Washington copy is a login page; core.ac.uk gave a bot-check page. Needs the owner's sign-in, or try the Sydney repository. |
| Fekete and others 2005 (TODS) | No open PDF reached (Minnesota course copy timed out twice); a lecture note was read and is marked `summary`. |

Papers read in full: 2 (Berenson, Ports) plus 1 documentation page; the limit of 10 was not reached. No paper skipped as a variant.

## Second attempt (2026-11-19)

Result: none of the three papers opened. No folder keeps a partial file (failed downloads were removed; `papers/w1/adya99/` and `papers/w1/cahill08/` are empty, `papers/w1/fekete05/` is as before). No figure is added.

### (1) Adya thesis 1999 / ICDE 2000 (`still closed`)
- MIT DSpace item page https://dspace.mit.edu/handle/1721.1/149899: 200 (543,732 bytes of HTML); it names two bitstreams. Both `https://dspace.mit.edu/bitstreams/83a95ef0-65a0-4d5c-80ee-4c33150689b7/download` and `.../d516fe15-2541-44fd-b605-264cba6100da/download` returned HTTP 429 from the site's web firewall ("The service is under heavy load ... Log in, then open the item again", `Retry-After: 900`, 1,515 bytes of HTML). The old guessed bitstream URL (`/bitstream/handle/1721.1/149899/MIT-LCS-TR-786.pdf`) gave the same 429 page. This is a rate limit that asks for a sign-in; not worked round. Possibly open after the 900 s wait, from a browser started from the item page (not tried: the page asks not to reload repeatedly).
- https://www.aphyr.com/data/posts/294/adya-phd.pdf: connection failed (curl exit 7, host unreachable from this machine; the front page https://www.aphyr.com/ also failed).
- https://pmg.csail.mit.edu/papers/icde00.pdf and /adya-phd.pdf: no connection (000); http://pmg.csail.mit.edu/papers/adya-icde00.pdf: 403; http://pmg.csail.mit.edu/papers/: 403. https://www.csail.mit.edu/sites/default/files/pubs/MIT-LCS-TR-786.pdf: 404.
- https://dcmpx.remotevs.com/edu/mit/csail/pmg/PL/papers/icde00.pdf (a mirror of the ICDE paper found by search; not an official host): connection failed (curl exit 28). Not tried further.
- Scribd copy (search hit): not tried (sign-in site).
- Verdict: `still closed (MIT DSpace rate limit/firewall with sign-in prompt; the other hosts unreachable)`.

### (2) Cahill, Röhm, Fekete 2008 / TODS 2009 / thesis 2009 (`still closed`)
- Sydney repository https://ses.library.usyd.edu.au/bitstream/2123/5353/1/michael-cahill-2009-thesis.pdf and `/bitstream/handle/2123/5353/michael-cahill-2009-thesis.pdf`: HTTP 403 (94,9xx bytes of HTML, a block page); item page https://ses.library.usyd.edu.au/handle/2123/5353?show=full: 403; https://hdl.handle.net/2123/5353: 403.
- ACM https://dl.acm.org/doi/pdf/10.1145/1620585.1620587 (TODS 2009) and .../10.1145/1376616.1376690 (SIGMOD 2008): 403 (5,576 bytes, bot/sign-in page).
- https://core.ac.uk/download/pdf/41233593.pdf: 403 (5,426 bytes, bot check page, as the first collector found; core.ac.uk/download/41233593.pdf is the same).
- https://courses.cs.washington.edu/courses/csep544/09sp/resources/fekete-sigmod2008.pdf: 302 redirect (to a sign-in page, as before).
- A search hit https://www.arxiv.org/pdf/1901.10615 opened as a PDF but is Xiong and others, "Data Consistency in Transactional Storage Systems" (a different paper; deleted, not used).
- Verdict: `still closed (needs the owner's sign-in: ACM, Sydney, CORE and Washington all block automated fetch)`. Ports and Grittner (block 2) still stands in for the algorithm.

### (3) Fekete, Liarokapis, O'Neil, O'Neil, Shasha, TODS 2005 (`still closed`)
- University of Minnesota copies https://classpages.cselabs.umn.edu/Spring-2018/csci8980/Papers/ConcurrencyControl/serializable-snapshot.pdf: curl exit 60 "SEC_E_UNTRUSTED_ROOT" (the host's certificate chain is not trusted by this machine; this time a clear certificate error, not a timeout). I did not turn off certificate checking. The www-users.cselabs.umn.edu mirror: no connection (000).
- ACM https://dl.acm.org/doi/pdf/10.1145/1071610.1071615: 403 (bot/sign-in page).
- Guessed author-site URLs on cs.umb.edu and a Berkeley course path: 404 (guesses, not search hits).
- The NYU talk https://cs.nyu.edu/~shasha/papers/SItalk.pdf and a Seoul National University slide deck were search hits but are talks, not the paper; the SNU file did not connect. Not used.
- Verdict: `still closed (Minnesota copy fails certificate check; ACM blocks automated fetch)`. The block-4 status stays `summary`.

### Bearing on the lane's frame
Nothing new: no new figure from this attempt. Open routes for the owner: a browser session started from the MIT DSpace item page (Adya), a browser with ACM access (Cahill 2008/2009, Fekete 2005), or the Minnesota copy opened in a browser that trusts its certificate.
