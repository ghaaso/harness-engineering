# Concurrency literature 3: coordination-free writing and merging

Collected 2026-11-18 from general-term web searches (no project names, paths or code sent; rule 4) and a few fetches.
Search tool returns a small model's summary, so no item is QUOTED: nothing was read as page text. Items are SUMMARY (search or fetch summary) or TEXTBOOK (my knowledge, standard reference named).
Limits: no PDF could be read (the Bailis PDF came back as compressed bytes; ACM pages gave 403). Numbers from summaries may differ between paper versions; flagged where so.
No mapping to our case, no verdict. Each entry: problem | how | guarantee or measured result | wins/loses | requirements | failure modes | reference | how known.

## A. Commutativity as the condition

### 1. Scalable commutativity rule
- Problem: which operation pairs can run on many cores without contending on shared memory.
- How: if the operations in an interface commute (order does not change results, in a precise state-dependent sense), an implementation exists that is conflict-free (no cache-line sharing). A tool, Commuter, generates tests from an interface model.
- Result (SUMMARY): applied to 18 POSIX calls, 13,664 generated tests; Linux conflict-free on 68 percent, the research kernel sv6 on 99 percent. Journal version: linear scaling on an 80-core machine for apps built on sv6's commutative operations.
- Wins: interface design, where the interface can be changed to make operations commute. Loses: where the interface is fixed and its operations do not commute (the rule says nothing then).
- Needs: operations defined by an interface; commutativity judged per state and arguments, not per operation name; an implementation free to choose its data layout.
- Failure modes: the rule says an implementation exists, not that it is easy; non-commutative cases still need coordination. Figure for sv6 speedups: figure not recalled.
- Ref: Clements, Kaashoek, Zeldovich, Morris, Kohler, SOSP 2013; ACM TOCS 2015.
- Known: SUMMARY (search). URLs in section Z.

### 2. Commutativity-based concurrency control
- Problem: let transactions on abstract data types run concurrently while staying serializable.
- How: the conflict relation between operations comes from whether they commute, using the results the operations return, not just reads and writes. Two algorithms (a locking one and a timestamp-style one) with recovery by intentions lists or undo logs.
- Guarantee: serializability of transactions (proved); a general correctness condition for pairing a recovery method with a conflict relation.
- Wins: types with rich operations (counters, sets, queues) where read/write locking blocks needlessly. Loses: operations that do not commute still block or abort.
- Needs: a typed object with declared operations and their commutativity, including result-dependence.
- Failure modes: the commutativity table must be right; a wrong entry breaks serializability. Measured numbers: figure not recalled.
- Ref: Weihl, IEEE Trans. Computers 37(12), 1988, pp. 1488-1505 (also MIT/LCS/TM-367).
- Known: SUMMARY (search of indexed abstracts).

## B. Several writers of one document

### 3. State-based and operation-based CRDTs
- Problem: replicas accept updates locally, with no coordination, and still agree.
- How: state-based: states form a join-semilattice, updates are monotone, merge is the least upper bound. Operation-based: concurrent operations commute, delivery is causal and exactly once.
- Guarantee (SUMMARY): two sufficient conditions, shown strongly equivalent; replicas that have received the same updates are in the same state (strong eventual consistency); this holds for any number of failures, without consensus.
- Wins: availability, offline work, no central server. Loses: data types where an invariant needs agreement (see 8); metadata can grow.
- Needs: a data type designed to be a CRDT; reliable (eventual) delivery; for op-based, causal delivery.
- Failure modes: the merge result is convergent, not necessarily what the user meant (see 6, 7); metadata growth (tombstones, version vectors); one commentary says "strong eventual consistency" adds convergence, not a stronger meaning of consistency.
- Ref: Shapiro, Preguica, Baquero, Zawirski, SSS 2011 (INRIA RR-7687).
- Known: SUMMARY (search).

### 4. Sequence CRDTs for text: Treedoc, Logoot, LSEQ, RGA
- Problem: concurrent inserts and deletes in an ordered list of characters or lines.
- How: Treedoc gives each atom a path in a tree and keeps tombstones for deleted atoms. Logoot gives each atom a dense position identifier made of tuples and needs no tombstones. LSEQ chooses identifier allocation to keep identifiers short. RGA links each insert to the atom it follows and orders concurrent inserts by timestamp.
- Result (SUMMARY): Treedoc's best case is a plain array; its authors report costs reasonable on real editing traces (figure not recalled). Logoot identifiers grow with editing. LSEQ slides: sub-linear identifier-size bound; a document with 1 million operations ending at 1 line can hold 499,999 tombstones (a tombstone example from the slides). A 2026 preprint says LSEQ still shows unbounded identifier growth under intense editing (qualitative).
- Wins: character-level concurrent editing without a server. Loses: memory and identifier growth; history needs compaction, which itself needs coordination.
- Needs: unique replica ids; causal delivery for the tombstone designs.
- Failure modes: see 5 (interleaving).
- Refs: Preguica and others (Treedoc) 2009; Weiss, Urso, Molli (Logoot) 2009; Nedelec and others (LSEQ) 2013; Roh and others (RGA) 2011. All four refs: TEXTBOOK (years from memory, not fetched).
- Known: SUMMARY for the results above; TEXTBOOK for refs.

### 5. Interleaving anomaly and Fugue
- Problem: two writers insert runs of text at the same place; the merged result mixes the characters.
- How: Kleppmann and others named the anomaly; Fugue and FugueMax are algorithms that minimise interleaving.
- Result (SUMMARY): Logoot and LSEQ show the anomaly; RGA avoids the main one (mechanised proof) but has a milder form; Fugue paper reports almost all surveyed CRDT and OT text algorithms suffer from interleaving. The 2019 paper's own errata page says its non-interleaving definition (section 2.1) cannot be met by any algorithm and its algorithm (section 3.1) does not guarantee convergence.
- Refs: Kleppmann, Gomes, Mulligan, Beresford, PaPoC 2019 (flawed, see errata); Weidner and Kleppmann, "The Art of the Fugue", arXiv 2305.00583 (2023).
- Known: SUMMARY (search).

### 6. Operational transformation (OT)
- Problem: concurrent edits to one document must converge and keep their intent when applied in different orders.
- How: each operation is transformed against the concurrent ones already applied, so it means the same thing in the new context. Origin: dOPT.
- Guarantee: convergence needs transformation properties TP1 (two concurrent ops transformed against each other give the same state) and, in peer-to-peer settings, TP2 (the same for three ops). TP2 is described as very hard to satisfy.
- Result (SUMMARY): dOPT was shown incorrect by a counterexample (Waterloo tech report CS-95-06; error found in 1991; fixed only for two sites). adOPTed (Ressel and others, CSCW 1996) is the follow-up (secondary summary).
- Wins: compact documents, no tombstones, intent-preserving for rich operations. Loses: transformation functions are hard to get right; many published algorithms were later found faulty (SUMMARY: dOPT; wider claim TEXTBOOK, see Oster and others 2006 for formal model checking, not fetched).
- Needs: a transformation function per pair of operation types; either a central ordering server or TP2.
- Refs: Ellis and Gibbs, SIGMOD Record 18(2), 1989, pp. 399-407; Ressel, Nitsche-Ruhland, Gunzenhauser, CSCW 1996 (SUMMARY).
- Known: SUMMARY (search).

### 7. How real-time editors keep many writers on one file
- Jupiter (Nichols and others, UIST 1995): one central server; each client talks only to the server, so transformation happens between two parties at a time. Google Wave followed Jupiter; one source says Google Docs also uses OT (SUMMARY, secondary). The server fixes a total order.
- Cost of that design (SUMMARY): needs a central gatekeeper; CRDT advocates cite this as its weakness.
- Sun and others, "Real Differences between OT and CRDT" (arXiv 1810.02137 and companions, 2018-2019): argue CRDT text solutions also follow a transformation approach, are not natively commutative for concurrent operations, and that OT is still the choice in most production co-editors. This is an authors' position paper, not a neutral benchmark (my note).
- Other editors (Etherpad, Figma, Yjs, Automerge): TEXTBOOK/uncertain, not verified here; details not recalled.
- Known: SUMMARY.

### 8. Replicated tree with move operation
- Problem: concurrent moves of subtrees must not create cycles or duplicates; common in file systems and JSON/XML models.
- How: a single move operation (timestamp, new parent, metadata, child); creation and deletion are moves; operations are applied in timestamp order, with undo and redo of later-ordered ones when a late one arrives; a move that would create a cycle is skipped.
- Guarantee (SUMMARY): replicas converge, tree stays valid, no cycles, no coordination; proved in Isabelle/HOL. The authors show bugs in two commercial cloud file services caused by concurrent moves.
- Cost: undo-redo of recent operations; log retention. Figures: figure not recalled.
- Ref: Kleppmann, Mulligan, Gomes, Beresford, IEEE TPDS 33(7), 2021/2022.
- Known: SUMMARY (search).

### 8b. JSON CRDT (Automerge's model)
- Kleppmann and Beresford, "A Conflict-Free Replicated JSON Datatype", IEEE TPDS 2017. TEXTBOOK; not fetched. Guarantee: convergence; concurrent writes to one register key keep both values (multi-value register); concurrent edits to different keys merge. Cost figures: figure not recalled.

## C. Theory of when no coordination is needed

### 9. CALM theorem
- Problem: when is coordination unavoidable.
- Statement (SUMMARY, QUOTE-free paraphrase): a program has a consistent, coordination-free distributed implementation if and only if it is monotonic (output only grows as input grows). Non-monotonic steps (negation, counting to completion, "all of") need coordination.
- Wins: a design test applied to a program, not a data type. Loses: monotonic is a strong test; says "needs coordination", not how cheap it can be.
- Needs: program expressed in logic where monotonicity can be judged; asynchronous messages, eventual delivery.
- Refs: Hellerstein and Alvaro, "Keeping CALM", arXiv 1901.01930 (2019; CACM venue not confirmed). Formal proof: Ameloot, Neven, Van den Bussche, 2013 (JACM; not fetched, TEXTBOOK). Conjecture: Hellerstein 2010 (TEXTBOOK).
- Known: SUMMARY (arXiv abstract fetch plus search).

### 10. Invariant confluence and coordination avoidance
- Problem: which application invariants can hold with no coordination between replicas.
- How: an operation set is invariant confluent (I-confluent) if every pair of replica states that each satisfy the invariant, after any divergent operations, merge to a state that also satisfies it. Theorem: a transaction set can be executed with global invariants, convergence, transaction availability and no coordination if and only if it is I-confluent. Analysis is per (invariant, operation) pair.
- Result (SUMMARY, version-dependent): final version reports linear scaling of TPC-C New-Order to 12.7 million transactions per second on 200 servers, 25 times prior distributed results; an earlier version said over 1 million per second on 100 servers. One secondary summary says 10 of 12 TPC-C invariants are I-confluent; search said twelve; not settled, check the paper.
- Wins: uniqueness not needed or generated per replica, foreign-key inserts, counters up; loses: uniqueness of chosen values, sequential ids, balances that must not go negative (TEXTBOOK from the paper's examples).
- Needs: invariants stated explicitly; operations known in advance.
- Failure modes: an invariant nobody wrote down is not protected.
- Ref: Bailis, Fekete, Franklin, Ghodsi, Hellerstein, Stoica, PVLDB 8(3), 2014/2015.
- Known: SUMMARY (search; PDF fetch failed).

## D. Convergence and reconciliation

### 11. Eventual consistency and session guarantees
- Problem: replicas without coordination must at least converge; clients need sane views meanwhile.
- How: eventual consistency: if updates stop, replicas converge (Vogels 2009, CACM; TEXTBOOK). Session guarantees (read your writes, monotonic reads, writes follow reads, monotonic writes): Terry and others, PDIS 1994 (TEXTBOOK).
- Guarantee: convergence only after quiescence; says nothing about the converged value being right. Strong eventual consistency (3) adds determinism of the converged state.
- Failure modes: last-writer-wins silently drops a concurrent write (TEXTBOOK).
- Known: TEXTBOOK.

### 12. Bayou: application-specific conflict handling
- Problem: weakly connected replicas accept writes while apart; conflicts depend on the application.
- How (SUMMARY): every write carries a dependency check (a query plus the expected answer) and a merge procedure; if the check fails at a replica, the merge procedure runs, may rewrite the write (for example book another room) or record it for a person to fix. Writes are tentative until committed in a primary's order; replicas replay in that order (rollback and redo; TEXTBOOK).
- Guarantee: replicas applying the same writes in the same order reach the same state. No bound recalled.
- Wins: semantic conflicts that a generic rule cannot settle. Loses: the application author writes merge code per operation.
- Ref: Terry, Theimer, Petersen, Demers, Spreitzer, Hauser, SOSP 1995.
- Known: SUMMARY (search).

### 13. Dynamo: version vectors and application merge
- Problem: a store always writable even during failures.
- How (SUMMARY, partly third-party): sloppy quorum takes the first healthy nodes on the ring; vector clocks tag versions; if neither version dominates, the store returns both and the client merges (shopping cart: union).
- Result: paper reports at the 99.9th percentile (SLA basis); figures disagree between secondary sources (about 200 ms; sub-300 ms); not confirmed against the paper. Treat as figure not recalled.
- Failure modes: deleted items can reappear after a union merge (TEXTBOOK, from the paper's cart example); sloppy quorum loses the read-write overlap guarantee (SUMMARY).
- Ref: DeCandia and others, SOSP 2007.
- Known: SUMMARY (third-party), TEXTBOOK for the cart example.

## E. Merging versions of a file

### 14. Three-way merge (diff3)
- Problem: combine two edits of a common ancestor of a text file.
- How: diff each side against the ancestor, find regions where both changed, apply the non-overlapping changes, mark overlaps as conflicts.
- Guarantee (SUMMARY): the formal paper gives an abstract presentation and a careful analysis of the idea that edits to well separated regions never conflict; several intuitive properties turn out false in general; the property is delicate to state. Exact theorems: figure not recalled.
- Wins: line-based text, edits in different places. Loses: moved or reordered text, adjacent edits, any edit whose meaning depends on code elsewhere (a clean merge can be wrong: TEXTBOOK, standard criticism).
- Needs: common ancestor; text as a list of lines.
- Ref: Khanna, Kunal, Pierce, FSTTCS 2007 (LNCS 4855), doi 10.1007/978-3-540-77050-3_40.
- Known: SUMMARY (search).

### 15. Patch theory (Darcs, categorical theory, Pijul)
- Problem: a formal account of changes so that merge is well defined and order-insensitive.
- How: Darcs: patches commute when order does not matter; conflicts handled by extra constructs (SUMMARY: "mergers, conflictors, graphictors" were proposals). Categorical theory: files are objects, patches are morphisms, merge of two patches with a common source is a pushout; a pushout need not exist when patches conflict, so the authors extend the category (free finite cocompletion) so conflicts become first-class objects. Pijul is commonly said to build on this (SUMMARY).
- Guarantee: merge is unique up to isomorphism when it exists; merge is independent of order (follows from the pushout definition; TEXTBOOK).
- Failure modes: Darcs had exponential-time merge cases (TEXTBOOK, well known; figure not recalled); a forum post argues the model of deletion makes the category a groupoid (one user's opinion, SUMMARY).
- Refs: Mimram and Di Giusto, "A Categorical Theory of Patches", arXiv 1311.3903 (2013); Roundy, Darcs, 2005 (TEXTBOOK).
- Known: SUMMARY (search).

### 16. Semistructured merge
- Problem: line merge conflicts where a structure-aware tool would not.
- How: parse classes into a tree down to method level; match nodes by name and kind; merge methods' bodies as text; so reordering of members is no conflict.
- Result (SUMMARY, from FSE 2011): conflicts reduced in 60 percent of sampled merge scenarios, by 34 plus or minus 21 percent; renaming raised conflicts by 109 plus or minus 170 percent in 26 percent of scenarios; combining with unstructured merge cut conflicts 35 percent against unstructured alone.
- Later (SUMMARY): Cavalcanti and others, ASE 2019: semistructured and structured merge differ in only 24 percent of scenarios with conflicts; semistructured reports more false positives, structured more false negatives.
- Needs: a parser and a matching rule per language; syntax that parses.
- Failure modes: renames; code outside the parsed structure; false negatives mean a clean merge that is wrong.
- Ref: Apel, Liebig, Brandl, Lengauer, Kastner, "Semistructured Merge", ESEC/FSE 2011.
- Known: SUMMARY (search).

### 17. Structured merge (tree merge, JDime)
- Problem: same, with full abstract-syntax-tree matching.
- How: tree differencing then merge on the tree; JDime adds auto-tuning: cheap line merge first, switch to tree merge only where a conflict appears.
- Result (SUMMARY): structured merge reports on average 59 percent fewer conflicts than unstructured, in a figure quoted by Cavalcanti and others; the exact source of 59 percent was not shown; different data from 34 percent above, so not comparable. Auto-tuning is up to 92 times faster than pure structured merge, 10 times on average, at lower precision.
- Costs: tree matching is slow; per-language grammar; failures on code that does not parse.
- Ref: Apel, Leßenich, Lengauer, "Structured Merge with Auto-Tuning", ASE 2012; Leßenich and others, ASE 2017 (journal: Autom. Softw. Eng. 22, "Balancing precision and performance in structured merge").
- Known: SUMMARY (search).

## F. What the schemes share (reading aid, no mapping)
- Each scheme names a condition on operations (commute, monotone, invariant-confluent, transformable) or hands residual conflicts to code or a person (Bayou, Dynamo, merge tools).
- Where the condition fails, every scheme in this file falls back on ordering by a server, on application merge code, or on a reported conflict.

## Not found or not verified
- No QUOTED item: no page text was read.
- Bailis theorem statement and its TPC-C invariant count not confirmed in the paper (PDF unreadable).
- Dynamo latency figures unconfirmed. Treedoc, Logoot, LSEQ measured sizes: no head-to-head found.
- OT survey with failure counts (Oster and others 2006) not fetched.
- Production co-editor internals beyond Jupiter/Wave: not fetched.
- Darcs merge complexity figure: not found.

## URLs tried
Fetched OK: arxiv.org/abs/1901.01930 (summary only, informal).
Fetch returned unreadable PDF: vldb.org/pvldb/vol8/p185-bailis.pdf.
Fetch failed 403: dl.acm.org/doi/10.1145/2491245; dl.acm.org/doi/10.1145/1190216.1190250.
Fetch failed 404: cs.cmu.edu/~jcreed/papers/ASE2011.pdf (a guessed URL).
Search only (results seen as summaries; pages not fetched): arxiv.org/abs/1402.2237; read.seas.harvard.edu/~kohler/pubs/clements13scalable.pdf; dspace.mit.edu/handle/1721.1/86882; se.cs.uni-saarland.de/publications/docs/FSE2011.pdf; .../ASE2012.pdf; infosun.fim.uni-passau.de/publications/docs/CBS+19.pdf; cs.tufts.edu/~nr/cs257/archive/marc-shapiro/CRDTs_SSS-2011.pdf; cis.upenn.edu/~sanjeev/papers/fsttcs07_diff3.pdf; arxiv.org/abs/1311.3903; martin.kleppmann.com/papers/move-op.pdf; arxiv.org/pdf/2305.00583; arxiv.org/abs/1810.02137; cs.uwaterloo.ca/research/tr/1995/06/CS-95-06.pdf; dblp.dagstuhl.de Weihl88 record; mwhittaker.github.io/papers/html/terry1995managing.html; uist.acm.org/uist1995/abstracts/Nichols.html.
