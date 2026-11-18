# w1 refute (step 3b, Opus, fresh context, 2026-11-19)

Read: `R:w1-brief-common.md`, `R:w1-brief-refute.md`, `R:w1-claims.md`, the paper texts under `P:` = `R:papers/w1/`,
the library records the claims name (`library/journal/2026-11-18/*.jsonl`), the `E:` reading files the claims cite
(`docs/program/evidence/harness-method-status-2026-11-18/`) and `D:` = `docs/program/evidence/bottleneck-2026-11-18/`.
Not read: the report, the collect files, `R:lane-writers.md`. Every line cited below was opened by this refuter.
Default: refute. For claims resting on an `E:` file the paper text is not here: the check is against the library's
quoted record, and that is said. Fields follow the VERDICT schema (section 5.2 of
`docs/ORCHESTRATION-DESIGN-2026-10.md`); `already_fixed_by` and `corrected_severity` do not apply here and are left
out.

---

## A. Failures and isolation levels

### W01
- finding_id: W01 · verdict: CONFIRMED
- reasoning: `P:berenson95/paper.txt:349` "P4 is possible at the READ COMMITTED isolation level"; `:367` defines
  first-committer-wins and says it "prevents lost updates (phenomenon P4)". Definitions paper, no measurement, as
  the block says.

### W02
- finding_id: W02 · verdict: CONFIRMED
- reasoning: `P:berenson95/paper.txt:216` (history w1[x] w2[x] w2[y] c2 w1[y] c1, x=2, y=1) and `:217` (restoring
  w1's before-image "would wipe out w2's update"). Quote and cut are faithful.

### W03
- finding_id: W03 · verdict: CONFIRMED
- reasoning: A5A and A5B are defined separately at `P:berenson95/paper.txt:386-387`; `:398` "Snapshot Isolation
  histories prohibit histories with anomaly A3, but allow A5B". SI also forbids A5A (Remark 8, the lines after
  `:390`), which the block does not need.

### W04
- finding_id: W04 · verdict: CONFIRMED
- reasoning: `P:berenson95/paper.txt:405`: the 8-hour task example; "inserting different data items ... not
  precluded by First-Committer-Wins". The paper calls it P3 (phantom); "phantom form of write skew" is a fair name.

### W05
- finding_id: W05 · verdict: PARTIALLY
- corrected_claim: On DBT-2++ and RUBiS, PostgreSQL's SSI cost under 7 % of throughput against SI (5 % in the
  CPU-bound in-memory run); on the disk-bound 150-warehouse run it was indistinguishable from SI with
  serialization failures under 0.25 %. On the SIBENCH microbenchmark read tracking cost 10-20 % CPU. The low cost
  came from dangerous structures being rare, not from low contention: RUBiS "contains frequent rw-conflicts".
- reasoning: `P:ports12/paper.txt:23` (abstract, two benchmarks), `:582` (10-20 % CPU), `:600` (5 % in memory;
  disk-bound "indistinguishable"), `:604` "The RUBiS workload contains frequent rw-conflicts" and `:608` "dangerous
  structures are rare". The block's "low contention" is contradicted, and "4 to 36 client threads" is not in the
  text (grep for thread/client finds nothing; it may be in a figure).

### W06
- finding_id: W06 · verdict: PARTIALLY
- corrected_claim: In PostgreSQL's SSI, long-running read-only transactions that read much data take more SIREAD
  locks and are more likely to conflict (because they read much), and, because they run long, they hold back
  cleanup of other transactions' SIREAD locks, which "can easily exhaust memory"; deferrable transactions on a safe
  snapshot avoid this.
- reasoning: `P:ports12/paper.txt:298` "Some workloads contain long-running read-only transactions ... Because
  they access large amounts of data, they take more SIREAD locks". The claim drops "read-only" and moves the cause
  of the extra locks from data volume to length. Only the cleanup effect is due to length.

### W07
- finding_id: W07 · verdict: PARTIALLY
- corrected_claim: PostgreSQL's SSI does not track write-read dependencies, partly because some pass through the
  application outside the database and cannot be tracked; this was a reason not to adopt cycle testing (PSSI),
  and it costs false-positive aborts, not correctness. SSI does track every read inside the database.
- reasoning: `P:ports12/paper.txt:334`: the sentence is in the paragraph on why they "did not use" PSSI "because it
  requires tracking ww- and wr-dependencies"; the untracked case is data flowing between transactions through the
  application (`:338`, the REPORT split into two transactions). It is not an untracked read. The analogy the block
  draws (a read through a shell) is a different failure: an untracked read would break SSI's validation itself
  (see W97).

### W08
- finding_id: W08 · verdict: CONFIRMED
- reasoning: `P:ports12/paper.txt:174` "it may have false positives because not every dangerous structure is part
  of a cycle"; PostgreSQL reduces them with the read-only result (`:283`) but keeps them.

### W09
- finding_id: W09 · verdict: PARTIALLY
- corrected_claim: PostgreSQL's documented remedy for a serialization failure is to abort and retry the whole
  transaction; the retry is expected to see the newly committed data and may act differently. The remedy assumes
  the same correct program, not the same run. What does not carry to sessions is the cost of the retry and that the
  "program" (a model session) may itself be wrong differently on each run; non-determinism alone does not break it.
- reasoning: `P:pgdocs/page.txt:147` "The second time through, the transaction will see the previously-committed
  change as part of its initial view ... no logical conflict in using the new version". A retry that differs from
  the first run is the documented normal case. The quoted error at `:145-146` is Repeatable Read's write-write
  error, not an SSI validation failure; `P:ports12/paper.txt:133` covers SSI.

## B. Grain

### W10
- finding_id: W10 · verdict: CONFIRMED
- reasoning: `P:gray76/paper.txt:79` (tradeoff between concurrency and overhead), `:169` (intention mode tags all
  ancestors), `:220` "intention mode is compatible with itself". No measurement in the paper.

### W11
- finding_id: W11 · verdict: CONFIRMED
- reasoning: `P:innodb-second/page.txt:280-281` multiple granularity locking; `:342-343` intention locks "do not
  block anything except full table requests".

### W12
- finding_id: W12 · verdict: CONFIRMED
- reasoning: `P:innodb-second/page.txt:408-415` "purely inhibitive" and gap locks "do not conflict with each other";
  `:481-485` insert-intention: transactions inserting into one gap "need not wait for each other if they are not
  inserting at the same position within the gap".

### W13
- finding_id: W13 · verdict: CONFIRMED
- reasoning: `P:innodb-second/page.txt:416-421`: at READ COMMITTED gap locking "is used only for foreign-key
  constraint checking and duplicate-key checking". "Trading it for concurrency" is the block's reading, not the
  manual's words; it is a fair one.

### W14
- finding_id: W14 · verdict: CONFIRMED
- reasoning: `P:eswaran76/paper.txt:466-467` "recursively unsolvable (Kleene [5])"; the paper then restricts to
  simple predicates whose conflicts are decidable (`:633`, `:705`, `:721`).

### W15
- finding_id: W15 · verdict: PARTIALLY
- corrected_claim: Graefe's survey: key-range locking, "a special form of predicate locking" whose predicates are
  intervals in the B-tree's sort order, is what products use; general predicate locking and precision locking were
  not adopted. Deleting a key needs a lock on its neighbour too; fine grain is needed most at hot spots.
- reasoning: `P:graefe10/paper.txt:712-715`: the sentence before the quoted one says "Key range locking is a special
  form of predicate locking". Cut as it is, the claim reads as "predicate locking failed in practice"; the paper
  says a restricted, ordered form of it is standard. That matters for us: an ordered list of entries (W12) is such
  an interval domain.

### W16
- finding_id: W16 · verdict: PARTIALLY
- corrected_claim: Ries and Stonebraker 1977 (simulation): useful I/O rose about 34 % from 1 granule (7,042) to 10
  (9,438), peaked near 20 (9,573; the prose says "peaks at ^0 granules" and is "within 1%" at 10), and fell steeply
  beyond a few hundred granules; the authors concluded about 10 granules suffice. The exact value at 1,000
  granules cannot be fixed from the OCR table.
- reasoning: `P:ries77/paper.txt:483-512`: the OCR table has unlabelled values (rows after 3, 7, 200, 500), garbled
  rows (40, 50, 150) and no values at 2,500 and 5,000, so 3,408.635 may belong to 750 or 1,000; the 64 % figure
  rests on that. `:520-523` and `:871` confirm the peak and the conclusion. The paper also says keeping locks in
  main memory "appears to make little difference in the desired granularity" (`:862-863`), which weakens the
  block's reason that only the shape carries because our lock cost differs.

### W17
- finding_id: W17 · verdict: CONFIRMED
- reasoning: `P:ries77/paper.txt:891-894`. Same paper, `:856-858`: even for transactions touching a very small part
  of the database, "a large number of granules interfere with the system throughput"; the best number rises but
  stays small.

### W18
- finding_id: W18 · verdict: CONFIRMED
- reasoning: `P:srinivasan93/paper.txt:2006-2019`: no difference at batching factor 1; at 10, leaf-page locking
  "performs much worse" from deadlocks, aborts and re-executions; 40,000 records against about 250 leaf pages.
  1 CPU, 8 disks, 200 buffers (`:2000-2001`).

### W19
- finding_id: W19 · verdict: PARTIALLY
- corrected_claim: SQL Server escalates many fine locks to one coarse lock to cut overhead at the price of
  contention, when one Transact-SQL statement acquires at least 5,000 locks on a single reference of a table or
  index, or when lock memory passes a threshold (24 % of engine memory by default); if escalation fails it retries
  every 1,250 new locks.
- reasoning: `P:sqlserver-esc/page.txt:407`, `:429-433` (two triggers; per statement, not per transaction),
  `:437` (memory threshold). The claim names only the count trigger; the memory trigger supports W96's own
  reasoning that the engines' cost is lock memory.

### W20
- finding_id: W20 · verdict: CONFIRMED
- reasoning: `P:graefe07/paper.txt:66-72` "A single ill-advised lock escalation suffices ... to reduce the
  multi-programming level to one"; `:267` "SQL Server does not support lock de-escalation". An argument with an
  example, no measurement.

## C. Versions and validation

### W21
- finding_id: W21 · verdict: PARTIALLY
- corrected_claim: Kung and Robinson: optimistic methods "may well be superior" where conflict is highly unlikely
  (query-dominant systems, very large tree indexes); their major difficulty is starvation, which their protocol
  solves by restarting the starving transaction while holding the critical section, "equivalent to write-locking
  the entire database".
- reasoning: checked against the library's quoted record, not the paper: `E:concurrency-lit-1-databases.md:56-57`.
  "Solved by using locking" means a whole-database lock for the starver (`:56`), which W68 reports as "not
  acceptable" for long transactions. The cut hides that the cure serialises everyone.

### W22
- finding_id: W22 · verdict: PARTIALLY
- corrected_claim: Larson and others (the Hekaton precursor): with only short update transactions the
  single-version engine was twice as fast as the multiversion schemes; one long reader cut its update throughput
  75 % against 5 % for multiversion, and with half the active transactions long readers multiversion had 80 times
  its update throughput.
- reasoning: `E:concurrency-lit-1-databases.md:197` (library quote): "1V is twice as fast as the MV schemes when all
  transactions are short update transactions" opens the same quotation. The claim drops that baseline; the paper's
  conclusion is that 1V is "fragile", not that MV is better in general.

### W23
- finding_id: W23 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-1-databases.md:195` (library quote). The same line gives 1V's serializable cost as
  2 % and Repeatable Read under 2 %; the 10-19 % is a property of the MV schemes.

### W24
- finding_id: W24 · verdict: PARTIALLY
- corrected_claim: Silo: one hot counter per district makes OCC abort and 2PL serialize alike. Against the
  partition-locked store, Silo with the counter was up to 8.20 times faster (24 workers) and with the counter taken
  out of the transaction 17.21 times (32 workers); the gain from taking the counter out within Silo is not stated in
  the lines read.
- reasoning: `E:concurrency-lit-1-databases.md:186` (library quote). 17.21x compares two different engines; read
  as the effect of removing the counter it is the wrong baseline. The record also says Silo has "no direct
  2PL-versus-OCC curve under heavy write contention" (`:188`).

### W25
- finding_id: W25 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-1-databases.md:183` (library quote): "Silo assumes a one-shot request model ... If
  high-latency client communication were part of a transaction, the likelihood of abort ... would grow." Stated,
  not measured.

### W26
- finding_id: W26 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-1-databases.md:185` (library quote), figures as quoted.

### W27
- finding_id: W27 · verdict: PARTIALLY
- corrected_claim: Yu and others (simulation to 1,024 cores): a 2PL engine with a fixed lock order (DL_DETECT)
  scaled almost linearly with no skew and peaked at 16 cores at theta 0.8; in a separate skew sweep at 64 cores,
  every scheme's throughput dropped sharply above theta 0.6 and approached zero above 0.8. At theta 0.8 on 1,024
  cores OCC did best, because one transaction always commits.
- reasoning: `E:concurrency-lit-1-databases.md:156` labels the first quote "thrashing, 2PL with fixed lock order"
  (one scheme), `:159` is the 64-core sweep (all schemes), and `:158` gives OCC best at 1,024 cores. The claim merges two experiments into a statement about all schemes.

### W28
- finding_id: W28 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-1-databases.md:168` (library quote), 16 servers, YCSB.

### W29
- finding_id: W29 · verdict: PARTIALLY
- corrected_claim: TicToc gained up to 92 % throughput over four earlier schemes (two 2PL variants, Hekaton, Silo;
  the best case of the paper's sweeps). The data-driven commit order alone gave 35.6 % over Silo on TPC-C with 4
  warehouses and 10 % on high-contention YCSB; most of the high-contention gain came from no-wait locking and
  pre-emptive aborts. At high write contention it did not reduce aborts, and its advantage over Silo disappeared at
  80 warehouses.
- reasoning: `P:tictoc/paper.txt:23` ("over these previous algorithms", not only optimistic ones), `:855-856`
  (35.6 %; "TICTOC without any optimizations only performs 10% better than SILO, and most of the performance
  improvement comes from the no-wait and preemptive abort optimizations"), `:846`, `:691`. The claim credits the
  92 % to the commit-order mechanism.

### W30
- finding_id: W30 · verdict: PARTIALLY
- corrected_claim: Cicada: "inexpensive aborts can make high abort rates acceptable"; aborts can be expensive (CPU
  cycles and cache-line invalidation, worsened by retrying too fast). The paper does not say high abort rates are
  acceptable only when aborts are cheap.
- reasoning: `P:cicada/paper.txt:850` states sufficiency, not necessity; "only" is added. `:46` defines the expense
  at the scale of CPU caches on one 28-core machine (`:850`, 28 threads).

### W31
- finding_id: W31 · verdict: PARTIALLY
- corrected_claim: Tanabe and others: in 2PL, Wait began to outperform NoWait as the number of operations per
  transaction grew, which the authors explain by abort-retry cost rising with length; but in Silo, NoWait
  outperformed Wait. Their conclusion: "One cannot give a general statement about which is better, NoWait or Wait";
  adaptive control matters.
- reasoning: `P:tanabe/paper.txt:572` (the quoted reasoning and Fig. 9a) is followed in the same paragraph by "In
  contrast, Silo-NoWait outperformed Silo(-Wait)" and by Insight 3 at `:573`. The claim keeps one side of a stated
  draw. "Transaction size" here is operations per transaction in memory, not duration.

### W32
- finding_id: W32 · verdict: PARTIALLY
- corrected_claim: Tanabe and others tested one multiversion protocol, Cicada with RapidGC: one long transaction
  (an inserted delay of 0 to 10 ms; 1 s ran out of memory) kept old versions alive and throughput saturated; the
  authors generalise this to MVCC protocols as Insight 6, by reasoning about how current GC works.
- reasoning: `P:tanabe/paper.txt:782-792`: "We measured the performance of Cicada under the workload described
  above"; `:792` the 1 s case could not be run. "Every multiversion protocol tested" overstates one tested protocol.

### W33
- finding_id: W33 · verdict: PARTIALLY
- corrected_claim: FoundationDB chose OCC to avoid lock logic; its drawback (no commit guarantee) is tolerable
  because its multi-tenant production conflict rate is under 1 % (self-reported). It keeps a 5-second MVCC window to
  bound memory and tells transactions longer than that to split into smaller ones.
- reasoning: `P:foundationdb/paper.txt:156`: "The OCC design of FDB avoids the complicated logic of acquiring and
  releasing (logical) locks"; the low conflict rate explains why "OCC works well", not why it was chosen. `:450`,
  `:452` as quoted. Workload: read-mostly, small key sets, low contention (`:115`).

### W34
- finding_id: W34 · verdict: PARTIALLY
- corrected_claim: Agrawal, Carey and Livny (simulation): blocking beat immediate restart and optimistic control at
  medium to high resource use; a restart-oriented algorithm won only when resource use was low enough to tolerate
  much wasted work and, in addition, a large number of transactions were available to run (many resource units, or
  interactive think times of 1 to 10 s); the authors doubt such low use occurs in real systems.
- reasoning: `E:concurrency-lit-1-databases.md:143` (library quote) contains "and in addition there are a large
  number of transactions available to execute"; the claim drops it. With 3 to 16 sessions that condition is not
  obviously met. `:147` "It is an open question whether or not such low utilizations will ever actually occur".

### W35
- finding_id: W35 · verdict: PARTIALLY
- corrected_claim: Hekaton: a transaction that reads a version created by a transaction already in its validation
  phase (finished, awaiting commit) takes a commit dependency instead of blocking, so aborts can cascade. Versions of
  transactions still executing are never read.
- reasoning: `P:diaconu/paper.txt:282` "Any transaction T1 that begins while a transaction T2 is in the validation
  phase becomes dependent on T2". The claim says "another's uncommitted version" in general. For sessions the
  analogue is building on a change already finished and under test, not on unfinished work.

## D. Order first, commuting writes, ownership

### W36
- finding_id: W36 · verdict: CONFIRMED
- reasoning: `P:calvin/paper.txt:120` as quoted; OLLP restarts if the reconnaissance results changed. The paper
  expects restarts to be rare because the sets depend on rarely updated indexes (`:121`); for code, the set depends
  on code being changed, so that expectation does not carry (reasoned).

### W37
- finding_id: W37 · verdict: CONFIRMED
- reasoning: `P:faleiro/paper.txt:53` "must run approximately serially"; `:255` OLLP "cannot be used in conjunction
  with 'interactive transactions'".

### W38
- finding_id: W38 · verdict: PARTIALLY
- corrected_claim: Requesting and granting locks in the order transactions appear in the input log is deadlock-free
  (survey); it needs each transaction's access set before it runs. (Ordering by resource instead, where each new
  lock is above all held ones, needs no advance set; see W93.)
- reasoning: the cited `P:faleiro/paper.txt:35` "Deadlocks cannot occur in the system" is a requirement on
  deterministic databases in general, followed by "either ... non-locking ... or ... deadlock avoidance". The
  ordered-locking statement is `:52` "clearly deadlock-free". Citation wrong, claim true for the log-order case.

### W39
- finding_id: W39 · verdict: PARTIALLY
- corrected_claim: Aria (one node, 12 workers, YCSB 80/20, batches of 1,000) ran 2.4 times Calvin and 10.3 times
  PB, a replicated primary-backup engine with strict 2PL and no-wait, at low contention (abort rate about 0.4 %).
  At skew 0.999 it kept 39 % of its own throughput because aborted transactions rerun, and above skew 0.8 and 0.9
  it fell below PWV and BOHM.
- reasoning: `P:aria/paper.txt:415` (PB is primary-backup S2PL, so the 10.3x includes replication cost: a different
  baseline from "a two-phase-locking engine"), `:437`, `:515` (the same sentence group says Aria's throughput "is
  lower than PWV-A and BOHM when the skew factor is larger than 0.8 and 0.9").

### W40
- finding_id: W40 · verdict: PARTIALLY
- corrected_claim: As stated, plus the cost the paper names: transactions that read split data are delayed until
  the next joined phase ("at the cost of increased latency for some transactions"); the 38x is the end point of a
  sweep (100 % of transactions on the hot key); a larger application gained 3x.
- reasoning: `P:doppel/paper.txt:16`, `:236` "Doppel transactions which read split data have high latency", `:334`.
  The "serially" quote stands at `:553`, not `:554`. For sessions, a read of the split file during a split phase
  is the common case, so the latency cost is not minor.

### W41
- finding_id: W41 · verdict: CONFIRMED
- reasoning: `P:doppel/paper.txt:138` "cannot leave a joined phase ... until all current transactions commit or
  abort".

### W42
- finding_id: W42 · verdict: PARTIALLY
- corrected_claim: For each situation in which operations commute there exists an implementation whose memory
  accesses are conflict-free in that situation; no single implementation need be conflict-free in all of them, and
  commutativity is sufficient, not necessary. Interfaces can be changed to commute (open with O_ANYFD instead of
  the lowest free descriptor). "Conflict" here means cache-line sharing between cores.
- reasoning: `P:clements/paper.txt:16` ("In any situation where several operations commute ... they have an
  implementation"), `:208` "no correct implementation can be conflict-free across all of H", `:209`, `:486`.

### W43
- finding_id: W43 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-3-coordination-free.md:120`, `:121`, `:128` (library quotes). The 25-fold figure is
  against prior published results on other systems, as the claim says.

### W44
- finding_id: W44 · verdict: CONFIRMED
- reasoning: `P:escrow/paper.txt:26` as quoted; no experiment in the text (grep for measur/experiment/simulat finds
  none).

### W45
- finding_id: W45 · verdict: CONFIRMED
- reasoning: `P:hstore2007b/paper.txt:208-209`; `:209` also estimates the commercial engine at about 2,500 per second
  with logging off, so roughly 28x would remain; the claim's "does not isolate the effect of ownership" stands.

### W46
- finding_id: W46 · verdict: PARTIALLY
- corrected_claim: In Yu and others' simulation, H-Store (single-partition work, uniform access) led up to 800 cores
  and did not scale once transactions touched four or more partitions. Separately, in Harding and others (16
  servers), every protocol except Calvin lost 12-40 % going from two to four partitions per transaction: a cost of
  distribution in general, not a result about partition ownership.
- reasoning: `E:concurrency-lit-1-databases.md:162` and `:172` (library quotes). Harding's protocols are NO_WAIT,
  WAIT_DIE, TIMESTAMP, MVCC, OCC, Calvin (record B3); none is an ownership design.

### W47
- finding_id: W47 · verdict: CONFIRMED
- reasoning: `P:jepsen-voltdb/paper.txt:11` "VoltDB's internal benchmarks suggest multi-partition transactions are
  practically limited to a few hundred updates/sec".

## E. Merging by structure

### W48
- finding_id: W48 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-3-coordination-free.md:184-185` (library quotes).

### W49
- finding_id: W49 · verdict: PARTIALLY
- corrected_claim: On 34,030 scenarios semistructured merge reported about 24 % fewer conflicts than line merge;
  its estimated additional false negatives (wrong clean merges) were 20.60 ± 21.30 % against 9.62 ± 16.29 % for line
  merge (upper bounds, "overestimated"), so no evidence of fewer and a sign of more; the improved tool s3m halved
  reported conflicts with at least 8 % fewer false negatives.
- reasoning: `E:concurrency-lit-3-coordination-free.md:188` (library quote) holds both figures and the s3m result;
  the claim keeps only "no evidence of fewer".

### W50
- finding_id: W50 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-3-coordination-free.md:197-198` (library quotes); the conflicts left are mostly
  ordering conflicts.

### W51
- finding_id: W51 · verdict: CONFIRMED
- reasoning: `P:spork/paper.txt:1276-1281` (right column), as quoted; inherited from 3DM.

### W52
- finding_id: W52 · verdict: CONFIRMED
- reasoning: `P:refmerge/paper.txt:15-17`; RefMerge also raised conflicting lines in 11 % (in the quote).

### W53
- finding_id: W53 · verdict: PARTIALLY
- corrected_claim: diff3 is guaranteed conflict-free for two replicas only under a specific condition (edits at the
  two ends around an untouched middle that holds an element occurring exactly once in each of the three versions);
  the obvious separation conditions are not enough ("this guess is wrong on both counts"); with several edited
  regions there is no guarantee; diff3 is neither idempotent nor stable.
- reasoning: `E:concurrency-lit-3-coordination-free.md:164-167` and record r57-0302 ("only under stated conditions").
  "Separated edits" in the claim is the intuition the paper shows to be insufficient.

### W54
- finding_id: W54 · verdict: CONFIRMED
- reasoning: `P:safemerge/paper.txt:1013-1014` (52), `:1156-1159` (five, two false positives), `:1098` (0.5 s).
  Same place: of 14 merges that kdiff3 could not merge and humans resolved, 8 could not be verified (`:1161-1164`).

### W55
- finding_id: W55 · verdict: CONFIRMED
- reasoning: `P:sam/paper.txt:44` "(nine detected conflicts out of 28)".

### W56
- finding_id: W56 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-5-integration.md:183` (library quote), shares of all merges as record r57-0305 corrects.

### W57
- finding_id: W57 · verdict: CONFIRMED
- reasoning: `E:concurrency-lit-3-coordination-free.md:74` (library quote): five algorithms, a counterexample each.

## F. AI coding agents in one repository

### W58
- finding_id: W58 · verdict: CONFIRMED
- reasoning: `P:agentpr/paper.txt:190`, `:193` (with 95 % CIs 16.8-23.2 and 33.1-50.9), `:330-333`. One sampled pair
  per repository and cross-agent pairs 0.50 % of co-active pairs, mostly involving Codex (`:155-176`, two columns).

### W59
- finding_id: W59 · verdict: CONFIRMED
- reasoning: `P:agentpr/paper.txt:335-336`.

### W60
- finding_id: W60 · verdict: PARTIALLY
- corrected_claim: Of agent pull requests that were open or closed without merging (merged ones excluded), 27.67 %
  conflicted with their base (the current base for open PRs, the base at closing time for closed ones). The rate
  rose from about 9.9 % at a median churn of 2 lines to nearly 30 % at 25 lines, levelled at 32-33 % for 46-185
  lines and fell slightly for larger PRs.
- reasoning: `P:agenticflict/paper.txt:68`, `:113-116` "we retain PRs that are either open or closed without
  evidence of having been merged", `:147-152`, `:317-325` (plateau and fall). Excluding merged PRs selects the ones
  least likely to have merged cleanly; the claim reads as a rate for all agent PRs.

### W61
- finding_id: W61 · verdict: PARTIALLY
- corrected_claim: CodeCRDT (one author, Claude Sonnet 4.5, up to 5 agents, 6 tasks, 50 runs per mode, 13.8 % of
  times removed as outliers): parallel was 13.1 % slower overall (21.1 % faster to 39.4 % slower), but it produced
  82-189 % more code and was faster per 1,000 characters in 5 of 6 tasks (11-52 %). A hand check of 60 runs gave a
  "5-10 %" semantic conflict rate with per-task figures of 20 % and 80 % that the paper does not reconcile with it.
- reasoning: `P:codecrdt/paper.txt:280-290` (normalised analysis in the same paragraph as the quote), `:258-260`,
  `:276-278` (outlier removal). The claim keeps the slowdown and drops the authors' explanation of it.

### W62
- finding_id: W62 · verdict: CONFIRMED
- reasoning: `P:storm/paper.txt:175-178`, `:76-78`, `:169-170`, `:264` (4 engineers). Qualifiers to carry: the
  manager deployed 3.6 engineers on average at a maximum of 4 (`:374`); gains concentrate on large repositories
  (`:322-323`); the text read reports no repeated runs or variance (grep for runs/seed/confidence finds none). On
  rejection STORM returns a diff and grants a short reservation (`:180-186`): the redo is of one write, not the unit.

### W63
- finding_id: W63 · verdict: CONFIRMED
- reasoning: `P:storm/paper.txt:1127-1129`, `:1134-1136`; also no coordination of shell commands (`:1131-1132`).

### W64
- finding_id: W64 · verdict: PARTIALLY
- corrected_claim: In STORM, first-round overlap of file scopes rose from 21.7 % at 4 engineers to 35.1 % at 8 and
  correlated with rejected reviews (r = 0.28 overall, 0.78 within k = 8). Cost rose from $199 to $429 (2.2 times) as
  the maximum went from 2 to 8 engineers (deployed 2.0 to 6.4, 3.2 times), so sublinear in engineers, while
  wall-clock time stayed about constant; dollars per point of score stayed $5-6.
- reasoning: `P:storm/paper.txt:491-495` (r = 0.28 overall dropped by the claim), `:374`, `:379-382`. The paper
  writes "approximately linearly"; its own figures say otherwise.

### W65
- finding_id: W65 · verdict: PARTIALLY
- corrected_claim: As stated for CAID's own runs (Sonnet 4.5), with two limits: the abstract's +14.3 and +26.7
  points are not Sonnet's (Sonnet gained 6.0 and 6.1); and STORM's rerun of this worktree method ("GitWorktree",
  Geng and Neubig 2026, Sonnet 4.6, 4 engineers) scored 63.8 % against 66.4 % for one agent on Commit0-Lite, below
  the single agent, while STORM's shared workspace with write-time validation scored 82.5 %.
- reasoning: `P:caid/paper.txt:324`, `:420-430`, `:448-450`, `:303-304`; `P:storm/paper.txt:261-262` (GitWorktree is
  Geng and Neubig), `:76-78`, `:325` "GitWorktree performs worst across the board, dropping up to 18 points below
  single-agent on Commit0-Lite". A later paper contradicts the worktree-over-single-agent gain.

### W66
- finding_id: W66 · verdict: PARTIALLY
- corrected_claim: Co-Coder (all methods on gpt-5-mini): on DevEval it lifted pass rate from 56.8 % to 68.1 % with
  1.81x speed-up and 28 % less cost, and file-per-agent cost 44 % more for no gain; Claude Code with Agent Teams,
  run on gpt-5-mini through a proxy, scored lowest on DevEval (54.1 %, 536 s) and on CodeProjectEval (16.3 %, the
  fastest and cheapest there).
- reasoning: `P:cocoder/paper.txt:102-104`, `:484-487` (DevEval), `:546-548` (CodeProjectEval), `:468-470` "all
  methods use gpt-5-mini ... Claude Code runs at v2.1.119 with LiteLLM". The claim mixes the two benchmarks, and
  "Claude Code" here is the harness off its own model.

## G. Long and cooperative transactions

### W67
- finding_id: W67 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:755-757`; a survey statement, no measurement.

### W68
- finding_id: W68 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:894-895`, `:927`, `:931-937`. Not in the claim but in the same passage
  (`:895-917`): Pradel's snapshot validation restarts a transaction only for "serious" conflicts, on objects read
  before the other transaction finished (see Missing).

### W69
- finding_id: W69 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:1799-1800`, `:1824-1826`.

### W70
- finding_id: W70 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:1983-1986`, `:1992-1993` "humans might not really resolve conflicts, resulting in
  inconsistent data".

### W71
- finding_id: W71 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:2406-2408`.

### W98
- finding_id: W98 · verdict: CONFIRMED
- reasoning: `P:barghouti/paper.txt:706-712`.

### W72
- finding_id: W72 · verdict: CONFIRMED
- reasoning: `P:bkk85/paper.txt:508-512` (right column): the guarantee covers aborts "induced by the system, due to a
  deadlock or system crash", not validation conflicts (bears on W94).

### W73
- finding_id: W73 · verdict: CONFIRMED
- reasoning: `P:split/paper.txt:24-27` (right column), `:113-141`; a design, no experiment.

### W74
- finding_id: W74 · verdict: CONFIRMED
- reasoning: `P:sagas/cornell-text.txt:79-88` (right column).

### W75
- finding_id: W75 · verdict: CONFIRMED
- reasoning: `P:perry/paper.txt:1142-1143`, `:1154-1159`.

### W76
- finding_id: W76 · verdict: CONFIRMED
- reasoning: `P:perry/paper.txt:1291-1294`, `:875-877` (55 % never more than one MR at a time; 0.6 % more than 6).

## H. Real systems (self-reported)

### W77
- finding_id: W77 · verdict: CONFIRMED
- reasoning: `P:figma-multiplayer/paper.txt:130`, `:132`, `:93` (one process per document).

### W78
- finding_id: W78 · verdict: CONFIRMED
- reasoning: `P:figma-multiplayer/paper.txt:146`.

### W79
- finding_id: W79 · verdict: CONFIRMED
- reasoning: `P:google-docs/ot.txt:52-59` (the first reason given is that locks hamper editing; the race is the
  second), `:128-130`, `:235-237`, `:257-259`.

### W80
- finding_id: W80 · verdict: CONFIRMED
- reasoning: `P:google-piper-cacm/paper.txt:83`, `:101`, `:102`, `:105` ("on almost every change").

### W81
- finding_id: W81 · verdict: PARTIALLY
- corrected_claim: Moving Windows to Git (about 3,500 of 4,000 engineers at the time), Microsoft found in the first
  week that its web UI for pull requests and conflict resolution hung on merges of tens of thousands of changes with
  thousands of conflicts; it was fixed within a couple of days by virtualising lists and fetching incrementally, and
  the move "went very smoothly".
- reasoning: `P:msft-bharry/paper.txt:73` (same sentence: "We had it resolved within a couple of days"), `:77`.
  The claim reads as a lasting limit of the tools; the post reports a UI fix.

### W82
- finding_id: W82 · verdict: PARTIALLY
- corrected_claim: As stated for last-write-wins and the edit/delete race; the later migration was driven by hot
  partitions from concurrent reads, compaction backlogs and JVM garbage-collection pauses (on-call toil); write
  contention is not named.
- reasoning: `P:discord-billions/paper.txt:126-130`; `P:discord-trillions/paper.txt:101-108`, `:110-111` (GC "a huge
  source of on-call toil").

## I. Our harness (library facts)

### W83
- finding_id: W83 · verdict: PARTIALLY
- corrected_claim: Of 14 units, 3 can be built at once at file grain (3 to 5 by how files are grouped) and 7 at
  function or block grain (5 to 7 by how places are grouped); 8 only at statement grain with 0b built first; counted
  from the change list, not from diffs.
- reasoning: record r57-0128 (`library/journal/2026-11-18/r57b.jsonl:18`) and its source
  `E:write-collision-points.md:141-155`. The claim drops both ranges; they meet at 5, which W91 needs.

### W84
- finding_id: W84 · verdict: CONFIRMED
- reasoning: r57-0103 (`library/journal/2026-11-18/r57.jsonl:27`): 1,018 tests, 965 pass, 53 skipped; one run.

### W85
- finding_id: W85 · verdict: CONFIRMED
- reasoning: b1-0108 (`library/journal/2026-11-18/b1.jsonl:8`); `.claude/hooks/tier-hook.mjs` has no Write or Edit
  branch (grep, this refuter).

### W86
- finding_id: W86 · verdict: CONFIRMED
- reasoning: r57-0105 (`library/journal/2026-11-18/r57.jsonl:29`).

### W87
- finding_id: W87 · verdict: CONFIRMED
- reasoning: b1-0121 (`library/journal/2026-11-18/b1.jsonl:21`).

### W88
- finding_id: W88 · verdict: CONFIRMED
- reasoning: `D:DECISION-RULE.md:76`, `D:BUILD-IN.md:303-305`, `:312`; `research-tree/tools/` holds no `merge.mjs`
  and `research-tree/build/` does not exist (ls, this refuter).

### W89
- finding_id: W89 · verdict: CONFIRMED
- reasoning: b1-0111 (`library/journal/2026-11-18/b1.jsonl:11`); holds where a redo runs as its own helper with a
  kept transcript.

## J. Our case against the literature (hypotheses)

### W90
- finding_id: W90 · verdict: PARTIALLY
- corrected_claim: For two units each touching k of F regions chosen uniformly, the chance of overlap is exactly
  1 − C(F−k, k)/C(F, k); 1 − (1 − k/F)^k is the with-replacement approximation and about k²/F when that is small. The
  rest (1 − (1 − p)^(N−1), up to 15 times from 2 to 16 writers) is correct. It counts textual overlap of regions
  only: it misses semantic conflicts with no overlap (W54-W56, W75) and counts as conflicts overlaps that merge
  cleanly (separate entries, W12; 9 of our 20 shared places, W83).
- reasoning: arithmetic checked: F = 10, k = 3 gives 0.708 exact against 0.657 approximate; p = 1 % gives 14 % at
  N = 16, p = 10 % gives 79 %. The uniform assumption is flagged by the block itself.
- what_would_settle_it: per-region overlap and conflict counts from the repository's history of concurrent
  changes (the measurement the block already names).

### W91
- finding_id: W91 · verdict: PARTIALLY
- corrected_claim: Under file-grain claims any two units touching one file conflict by definition (p = 1); with
  merged own copies they conflict only where edits overlap or interfere. The count of 3 (3-5) units at file grain
  against 7 (5-7) at function grain (W83) was computed with the same definition, so it illustrates the rule and
  does not test it.
- reasoning: W83's file-grain count treats two units on one file as conflicting (`E:write-collision-points.md`
  section (a)); agreeing with p = 1 is by construction. Git's line merge of two edits to one file often succeeds
  (W56: 76 % of human merges clean).

### W92
- finding_id: W92 · verdict: REFUTED
- corrected_claim: On a place every unit writes, if the claim on it is held for the whole unit, landings are about
  one per unit time and abort-and-rerun wastes up to N − 1 units per landing. Methods in this same claims file
  avoid both bounds: taking the hot write out of the long transaction (Silo's counter, W24), holding it only for a
  short final step (escrow W44, split W73), making the writes commute (W12, W40, W42), or resolving a rejected
  write by re-planning that write from a diff instead of redoing the unit (STORM, `P:storm/paper.txt:180-186`; NSE
  merges instead of rolling back, W69).
- reasoning: "every method lands at most about one unit per unit time" is contradicted by W24 (17.21x after the
  counter left the transaction) and W40 (38x on one hot key). The cited "one transaction always commits under OCC"
  is Yu and others (`E:concurrency-lit-1-databases.md:158`), not Kung and Robinson (W21). The
  strongest reason the hypothesis fails for sessions: the hot edit (a registry line) is a small, late part of a
  unit and can be applied at landing.
- what_would_settle_it: from history, the share of each unit's diff on hot places and when in the unit it was
  written; and, from transcripts (W89), tokens to re-apply a rejected hunk against tokens to redo the unit.

### W93
- finding_id: W93 · verdict: PARTIALLY
- corrected_claim: Claims named before start can be taken in one order and cannot deadlock. Places found while
  working can still be claimed without deadlock by resource ordering (take a new claim only above all held ones,
  else release and retake), by wait-die or wound-wait (waiting allowed in one direction of age, the younger aborts),
  or by detecting deadlock and aborting one; validating at landing and claiming without waiting are two of these
  options, not the only two. Each option that aborts costs a redo in tokens.
- reasoning: W38's support (`P:faleiro/paper.txt:52`) is log-order locking, which needs the set first; resource
  ordering and wait-die do not (reasoned, classical; WAIT_DIE is among Yu and others' measured schemes,
  `E:concurrency-lit-1-databases.md:157`: "NO_WAIT and WAIT_DIE are the only 2PL schemes that
  scale past 512 cores").
- what_would_settle_it: from history, how often a unit's later-found places sort below places it already holds,
  and the abort rate wait-die would cause at our N.

### W94
- finding_id: W94 · verdict: PARTIALLY
- corrected_claim: A checkpoint bounds the loss to the steps since it only for aborts not caused by what the unit
  read (crash, deadlock: W72) and for conflicts on items first read after the checkpoint; a conflict on something
  read before it invalidates the steps built on that read. The model's context at the checkpoint must also be
  rebuilt, at a token cost.
- reasoning: BKK85's guarantee is for system-induced aborts only (`P:bkk85/paper.txt:508-512`); split-transactions
  commit a part only when the read and write sets allow a serial order (`P:split/paper.txt:113-141`); Pradel's rule
  (`P:barghouti/paper.txt:895-917`) makes the dividing line the time of the read, not of the checkpoint.
- what_would_settle_it: for past conflicts, the step at which the conflicting item was first read against the last
  checkpoint before landing; tokens to resume from a checkpoint (W89).

### W95
- finding_id: W95 · verdict: PARTIALLY
- corrected_claim: Among real-engine measurements read, the longest units are FoundationDB's 5-second limit and
  Tanabe's inserted delays of up to 10 ms (1 s ran out of memory). The 1977 Ries-Stonebraker simulation, read in
  topic grain, modelled transactions of 50 to 500 entities at 100 ms of I/O each (5 to 50 s of I/O, minutes elapsed
  with 10 sharing one I/O path) and found a few coarse granules best. No paper read has a rerun that differs from
  the first run, except as a modelling assumption (see Missing, "fake restarts").
- reasoning: `P:ries77/paper.txt:434-436`, `:446-452` ("iorate of 100 msecs per entity"), `:436-438` (overlap 1);
  `P:tanabe/paper.txt:782`, `:792`; `P:foundationdb/paper.txt:450`. The claim's first sentence is false for a paper
  in its own scope, and that paper's long units point to coarse grain.

### W96
- finding_id: W96 · verdict: UNVERIFIABLE
- reasoning: Reasoned design; nothing read tests a share threshold. Strongest reason it fails: a share needs the
  unit to name its regions, and a session learns them while working (W37), so escalation comes late, after the
  unit has already taken most of the file; de-escalation needs the exact set the holder touched (Graefe keeps fine
  locks for that, `P:graefe07/paper.txt:347-351`), which for a session means diffing its copy at the moment another
  waits, and one wrong escalation stops every other writer of the file (W20).
- what_would_settle_it: replay recorded units (regions per file per unit from history) against share thresholds and
  count waits and conflicts; no run is needed.

### W97
- finding_id: W97 · verdict: PARTIALLY
- corrected_claim: Tool hooks see reads by the harness's own read and search tools; reads inside shell commands are
  seen only as command text unless file access is traced at the operating-system level (possible in a container).
  What the model holds comes from earlier tool results, which are in its transcript, so the set of reads a write
  may rest on is bounded by the transcript; which of them it rests on is unknown. Ports's untracked dependencies
  are a different case (write-read flows through the application, W07); an untracked read would break SSI's
  validation itself, and bash writes bypass STORM (W63).
- reasoning: `P:ports12/paper.txt:334`, `:338`; `P:storm/paper.txt:1127-1129`; record b1-0111 (transcripts on disk).
  "Only through its file-reading tool" is too strong; "invisible" overstates for the model's memory.
- what_would_settle_it: one probe of a PreToolUse hook on the read, search and shell tools (W86 lists them
  untested), and a check of what the transcript holds for a shell read.

---

## Counts

| Verdict | Claims | Count |
|---|---|---|
| CONFIRMED | W01-W04, W08, W10-W14, W17, W18, W20, W23, W25, W26, W28, W36, W37, W41, W43-W45, W47, W48, W50-W52, W54-W59, W62, W63, W67-W80, W84-W89, W98 | 57 |
| PARTIALLY | W05-W07, W09, W15, W16, W19, W21, W22, W24, W27, W29-W35, W38-W40, W42, W46, W49, W53, W60, W61, W64-W66, W81-W83, W90, W91, W93-W95, W97 | 39 |
| REFUTED | W92 | 1 |
| UNVERIFIABLE | W96 | 1 |

Total 98. Of the 39 PARTIALLY, the ones that change how a claim can be used: W09 (a differing rerun is the
documented normal case), W21 (the starvation cure is a whole-database lock), W27 (one scheme, not all), W29 (the
gain is mostly from no-wait, not commit order), W31 (the same paragraph says Silo favours no-wait), W34 (needs many
transactions available), W35 (only finished, validating work is read), W60 (merged PRs excluded), W61 (the slowdown
is from more code), W64 (cost sublinear), W65 (the worktree gain did not reproduce in STORM), W66 (Claude Code on
gpt-5-mini; benchmarks mixed), W95 (a minutes-long unit was simulated and favoured coarse grain).

## Missing

Claims the report would need that are absent:
1. **The serial check caps landings before write conflicts do** (reasoned, computed from W84): at 596 s per suite
   run, one check per landing allows about 6 landings an hour. N writers with units of T minutes ask for 60N/T an
   hour, so the check binds when T < 10N minutes (3 writers at 10-minute units ask 18 an hour). Batching landings
   and bisecting on failure, or selecting tests, is the means of parallelism this needs; no claim covers it.
2. **Dirty reads by the judge** in one working copy: a test run sees another session's half-done edits (P1 and A1 at
   `P:berenson95/paper.txt:112`, `:220`), so a pass or fail can belong to someone else's work. W02 covers dirty writes
   only.
3. **Agrawal's "fake restart" assumption**: a restarted transaction replaced by a different one, the engine
   literature's nearest model of "a rerun is not the same run"; it inflated restart-based throughput in earlier
   studies. The library has it only as a summary (`E:concurrency-literature.md:26`); it should be read before any
   claim rests on "no source models a differing rerun".
4. **Pradel's snapshot validation** (`P:barghouti/paper.txt:895-917`): restart only for conflicts on objects read
   before the other transaction finished. Directly usable for sessions (reads made after another landed are
   current) and absent from the claims.
5. **Wait-die, wound-wait and deadlock detection** as deadlock-free ways to wait on places found while working
   (W93).
6. **STORM's rejection payload and post-rejection reservation** (`P:storm/paper.txt:180-186`): a rejected write is
   re-planned from a diff, and a short per-file reservation stops two agents invalidating each other in a loop (a
   narrow form of Kung and Robinson's starvation cure). W62-W64 omit both.
7. **Ries 1977 experiment 2**: keeping locks in main memory "appears to make little difference in the desired
   granularity" (`P:ries77/paper.txt:862-863`); needed wherever the lane argues that cheap claims move the best grain.
8. **Variance**: none of STORM, CAID or Co-Coder reports repeated runs in the lines read; CodeCRDT reports ±21.57 s
   at temperature 0 (`P:codecrdt/paper.txt:288-289`). Pass-rate gaps of a few points (W65 on PaperBench, W62 on
   PaperBench 74.1 against 72.7) are within what a rerun could move; no claim says so.

Failures or means of parallelism the claims ignore: the judge as the bottleneck (1); speculative landing on work
already under test (Hekaton's commit dependency, W35, is the database form; a merge queue that tests stacked
changes is the build form); livelock between two optimistic writers (6); and the straggler cost of every
batch-barrier design (Aria's batches, Doppel's phase change, Calvin's epochs) when units last minutes and differ
in length, which W41 notes for Doppel only.
