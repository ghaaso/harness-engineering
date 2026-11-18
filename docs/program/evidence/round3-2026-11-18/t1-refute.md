# t1 step 3b: refutation of `R:t1-claims.md` (kind refute, Opus, 2026-11-19)

| Verdict | Count | Claims |
|---|---|---|
| CONFIRMED | 67 | the rest |
| PARTIALLY | 42 | C08 C11 C18 C25 C27 C34 C35 C36 C42 C44 C45 C46 C50 C53 C56 C66 C70 C74 C76 C79 C80 C81 C82 C83 C84 C85 C86 C87 C88 C89 C92 C95 C99 C103 C105 C106 C109 C110 C111 C112 C113 C115 |
| REFUTED | 5 | C51 C59 C90 C108 C114 |
| UNVERIFIABLE | 1 | C65 |

`R:` = `docs/program/evidence/round3-2026-11-18/`; `T:` = `R:papers/tree/`; v1, v2 = the two RESEARCH-TREE-PROTOCOL files; other paths from `research-tree/` unless given in full.

## A. Our tree

**C01** CONFIRMED
Reason: v1:15 "The tree: three levels, never more"; DESIGN-RECORD:162 "Seven leaves expected" with the cost run's sentence (343 [1]), an expectation; `tcb/cost.mjs:401` prints that sentence from a computed row count, not from a run.

**C02** CONFIRMED
Reason: v2:440-441 as quoted; `tcb/thresholds.json:43` 0.75 "(design R47, later)"; `tcb/plan-tree.mjs` absent; grep of `fill_factor` over every `.mjs` under `research-tree/`: no hit.

**C03** CONFIRMED
Reason: DESIGN-RECORD:18 lists plan-tree bulk load, redistribution and split with separator as moved to later; v2:461-463 "(d) Later: a split".

**C04** CONFIRMED
Reason: v1:276-279 withdraws the split as "the coordinator's own application"; v2:461-463 restores it as later; DESIGN-RECORD:69 lists A4-05 among rejected attack points. `R:lane-tree.md:18` cites ATTACK-AND-COST-RECORD:37, which holds only the shape verdict ("The B+ tree analogy does not earn its place"); grep of `RULINGS.md` and `library/journal` for an owner ruling on the split: none.

**C05** CONFIRMED
Reason: v2:172-173 (overflow record, ids kept visible as not covered); v2:465-466.

**C06** CONFIRMED
Reason: SELECTIONS-MAP:30 (D2-02 row) as quoted.

**C07** CONFIRMED
Reason: `tcb/commit.mjs:761` gives 300,000 − 60,000 − 75,000 = 165,000; DESIGN-RECORD:127 gives 180.0k; `thresholds.json` 18-19 (0.8, 0.9 of e_task), 25, 27, 28: four of these five are "source": "guess" (soft_frac is "mapping:D3-05").

**C08** PARTIALLY
Corrected: P = 79,000 is the median first call of recorded main sessions in other repositories (75k-88k by group); 60,000 is FixFlow's "about 60k" fixed prefix per agent window (not a median), and the cost record tags the tree child's P as a guess because the lean folder's prefix is unknown; S0 = 10,000 is a guess. The 767,000 tokens in four minutes is r57-0115 (measured, one trial).
Reason: ATTACK-AND-COST-RECORD:93 "M ... median"; :103 "child.P | 60000 | tokens | G | lean-folder prefix unknown"; TOKEN-BOTTLENECK:44 "about 60k tokens"; DESIGN-RECORD:127 tags both M, so the record disagrees with itself. r57-0115 in `library/journal/2026-11-18/r57.jsonl:39`.

**C09** CONFIRMED
Reason: TOKEN-BOTTLENECK:12 (35,834 API calls over the two repositories), :14, :18.

**C10** CONFIRMED
Reason: v2:473 the law; `thresholds.json:23` W_star_coord 133,200 "cost.mjs compute"; its inputs are E or G at ATTACK-AND-COST-RECORD:93-101.

**C11** PARTIALLY
Corrected: R49 is the design's only rule for splitting a leaf instead of rolling it over, and it is marked "later; only under option (b) of the research child's window" (§12): once S ≥ g·k*, or past n_max calls. The plan-time split of R47 (a lane over f·C splits by group range before any spend) is a separate rule.
Reason: v2:467-470; v2:455-456.

**C12** CONFIRMED
Reason: FAULTS-AND-FIXES:37-40. The record's own words show the conflict: D3-12 "Fields are not split mid-research" (SELECTIONS-MAP:154) against D3-01 "split the remaining work instead of handing over again; stop and split at 1.5*W*" (:162).

**C13** CONFIRMED
Reason: `tcb/admit.mjs:158-261` `decide` reads row, rows, thresholds, slots, pending, freeMb, spentOf, halted; grep of `admit.mjs` and `watch.mjs` for parent, level, depth, tree-plan: no hit.

**C14** CONFIRMED
Reason: BUILD-SIZE:44, 45, 46, 48, 51, 52 as quoted; grep of BUILD-SIZE and FIX-VS-SELECTIONS for overflow, C_node, fill, tree-plan: no fix touches them; FAULTS-AND-FIXES:49 as quoted.

**C15** CONFIRMED
Reason: START-HERE:17 "Not done | The thirteen fixes ...; the pilot; a first run of the tree".

**C16** CONFIRMED
Reason: v1:20, 23; b1-0121 at `library/journal/2026-11-18/b1.jsonl:21` says it as quoted.

**C17** CONFIRMED
Reason: v2:498-500.

**C18** PARTIALLY
Corrected: each child's 400-character note (its turn-end note) enters the coordinator's window and serves only as a wake; at the wake the coordinator acts on the status file and every ledger event after the last seq it acknowledged, so the content is already read as a batch. "Per commit" is not in the source; what comes one per child is the wake, and each wake re-reads the window (C09).
Reason: v2:39-40; R30 at v2:327-328 "the coordinator treats a note only as a wake"; R6 at v2:128-129 "acts on the status file and ledger events after the last seq it acknowledged".

## B. Concurrent change

**C19** CONFIRMED
Reason: `T:lehmanyao/paper.txt` 162-164; the same passage: "the pointer from the father must be added quickly for good search time".

**C20** CONFIRMED
Reason: lehmanyao 233; 359, three locks only "when it is necessary to follow a link pointer while inserting a pointer to a split node".

**C21** CONFIRMED
Reason: lehmanyao 478, 482, "under the assumption that insertions take place more often than deletions".

**C22** CONFIRMED
Reason: lehmanyao 466, 487; grep for table, experiment, measured: none. 468-470 bound the livelock argument to processors of "comparable speeds", which a minutes-long session beside a seconds-long script is not.

**C23** CONFIRMED
Reason: `T:graefe2010/paper.txt` 110 (two independent steps), 115.

**C24** CONFIRMED
Reason: `T:bwtree2013/paper.txt` 70, 246-247.

**C25** PARTIALLY
Corrected: Table I gives failed splits 0.25 % (dedup), 1.27 % (Xbox), 8.88 % (synthetic) and failed consolidates 1.19 %, 0.22 %, 7.35 %; the text's "around 1.25 % for both the Xbox and deduplication workloads" disagrees with the table for dedup splits and for Xbox consolidates. x03-0335 credits the text's figure to "Table I"; correct it to the six table figures.
Reason: bwtree2013 280-290, 354; `library/journal/2026-11-18/x03.jsonl:47`.

**C26** CONFIRMED
Reason: bwtree2013 357; 322 "We use 8 worker threads"; 357 "compares the in-memory performance". The designers' own benchmark against BerkeleyDB; C27 is the independent rebuild.

**C27** PARTIALLY
Corrected: rebuilt by others, the Bw-tree under-performs lock-based indexes (a B+ tree and ART with optimistic lock coupling, Masstree) by 1.5 to 4.5 times at 20 threads; being lock-free, its threads are not guaranteed progress because of failed CaS, and help-along is how it eases that starvation.
Reason: `T:wang2018/paper.txt` 38, 90; 162-164 "threads are not guaranteed to make progress because of failed CaS. One way to alleviate this starvation is ... the help-along protocol". The claim gives help-along the defect it is meant to ease.

**C28** CONFIRMED
Reason: `T:olc2019/paper.txt` 308, 346 (10-core system, 100M values), 347.

**C29** CONFIRMED
Reason: olc2019 29, which also assumes "one does not implement merge operations".

**C30** CONFIRMED
Reason: olc2019 244.

**C31** CONFIRMED
Reason: `T:ariesim/paper.txt` 267, 603 ("in general"), 612.

**C32** CONFIRMED
Reason: ariesim 493, 513.

**C33** CONFIRMED
Reason: `T:s2-mohan-kvl/paper.txt` 470-476 (re-opened): S-mode tree latch after releasing page latches, then "Search restarts its tree traversal", optionally at the parent.

**C34** PARTIALLY
Corrected: as C34, except that "with one CPU and one disk the algorithms barely differ" holds in the low and high contention sets, not under extreme contention: with 50 % appends, 1 CPU, 1 disk and the tree in memory, a pessimistic algorithm beat the B-link and optimistic ones because link-chases grew enormously.
Reason: `T:srinivasan-carey/paper.txt` 323-324, 534, 609; 843 "One of the few cases where a pessimistic algorithm actually performs better ... link-chases to increase enormously".

**C35** PARTIALLY
Corrected: the B-link form fits sessions because its first step is local and the parent's post may wait, even past a crash (C19, C23), so no running session is paused. The stated reason fails: B-link's gain is not holding a parent lock during a slow fetch, while here the structure change is a seconds-long script under one run lock (C36) and no scheme would hold a node for a session's minutes; among 3 to 16 sessions this is the few-writer case C89 calls a wash.
Reason: olc2019 29; srinivasan-carey 843 (B-link lost with few resources under heavy appends).

**C36** PARTIALLY
Corrected: as C36, but the ground for keeping passing sessions out is cost only (a session spends minutes and a window re-read on seconds of file work); "no progress guarantee" misreads wang2018 (C27). "No model call" holds only if the watcher's tick or a script runs the post, not the coordinator's turn.
Reason: ariesim 267, 493, 603 support the short serialised step and the nested top action; wang2018 162-164.

## C. Many writes

**C37** CONFIRMED
Reason: `T:writes-arge-buffertree/paper.txt` 304-306, 359, 492-494; the structure serves batched (off-line) problems whose queries need no immediate answer (86-92, 228-232), a condition every transfer must carry.

**C38** CONFIRMED
Reason: arge 439-441.

**C39** CONFIRMED
Reason: `T:writes-bender-login/plain.txt` 69-75; 64-65 "constant overhead of 1/ε", "at most twice as many I/Os" at ε = 1/2; asymptotic I/O counts.

**C40** CONFIRMED
Reason: bender-login 81.

**C41** CONFIRMED
Reason: bender-login 55.

**C42** PARTIALLY
Corrected: per-item flush cost 14/100 I/Os against 2 in a B-tree, so 14.3 times faster inserts; the gain is items per flush over the depth (2 × 100 / 14 = 100 / 7), not over twice the depth (7.1); for 1 TB of 1 KB random inserts with all but the leaves in memory; it grows as items shrink.
Reason: `T:writes-betrfs/plain.txt` 148-152 "height is 1 + log10 2^20 ≈ 7. Each item is therefore involved in 14 I/Os"; "2/(14/100) = 14.3".

**C43** CONFIRMED
Reason: betrfs 306, said of FUSE's lookups before operations (304-305).

**C44** PARTIALLY
Corrected: as C44, with the source's conditions: "nearly two orders of magnitude" is typical and "only possible in regimes where the index has a relatively high temperature as a B-tree"; equal ratios are Theorem 3.1's approximation; the exact optimum (Theorem 3.2) has ratios differing slightly.
Reason: `T:writes-oneil-lsm/plain.txt` 189, 246, 303.

**C45** PARTIALLY
Corrected: leveling costs T times more in writes; tiering costs up to T times in query cost and space, but point lookups lose little thanks to Bloom filters while range queries and space suffer; many write improvements were measured against untuned LevelDB or RocksDB (leveling, size ratio 10).
Reason: `T:writes-luo-carey/plain.txt` 668 "only a small negative impact on point lookup queries due to the Bloom filters. However, range queries and space utilization will be significantly impacted"; 811.

**C46** PARTIALLY
Corrected: lazy leveling cuts update cost from O(T·L/B) to O((L+T)/B) with the same bounds on point lookups, long range lookups and space, but only a "competitive" bound on short range lookups; the best fixed policy moves from tiering to leveling as lookups grow.
Reason: `T:writes-dostoevsky/plain.txt` 8, 49 "while providing a competitive bound on short range lookup cost", 1212-1214, 2189.

**C47** CONFIRMED
Reason: `T:writes-brodal-fagerberg/paper.txt` 126-140 (Theorem 1.1, comparison model; the bound uses that the dictionary does not know when a query comes, 130-134).

**C48** CONFIRMED
Reason: `T:s2-rosenblum/paper.txt` 27-28, 316-323, 340-362; against an improved FFS the cleaned segments must be under 0.5 live (322-323).

**C49** CONFIRMED
Reason: `T:s2-buchsbaum/paper.txt` 31-39 (insert to the root buffer, distribute on overflow; extract also reads the ancestors' buffers).

**C50** PARTIALLY
Corrected: batching messages per wake divides only the fixed part of a wake (the re-read window), and only where the wake can be deferred: today each child's note is a wake (C18) and each wake already reads every event since the last acknowledged seq (R6). The full-buffer trigger comes from structures with no cost of delay (Arge's off-line problems; Bε flushes when fixed node space is full); a correction held back lets a running leaf spend tokens on stale work, so the trigger must weigh wake cost against delay. Not measured.
Reason: arge 86-92, 226-232; bender-login 81; v2:128-129, 327-328.

**C51** REFUTED
Corrected: choose the merge policy by the ratio of parent reads to child reports (Dostoevsky). Every parent call re-reads its window (C09), so reads dominate, the end of Dostoevsky's curve where leveling is best: merge each report into one summary. Lazy leveling pays with several levels growing by a ratio T and cheap skips of unmerged runs (Bloom filters); a three-level session tree has neither, and unmerged reports at the inner level make it the pass-through C80 says gains nothing.
Reason: dostoevsky 2189 "As the proportion of lookups increases ... finally to leveling"; luo-carey 668; TOKEN-BOTTLENECK:18.

## D. Versions, bulk loading, node size

**C52** CONFIRMED
Reason: `T:versions-rodeh/paper.txt` 330-332, worst case, "if a node needs to be split or fixed during the downward traversal".

**C53** PARTIALLY
Corrected: in Rodeh's top-down B-tree (nodes of b to 3b keys, middle splits), trees built by appends were 50 % full because the right edge kept splitting; engines that split at the arrival point keep sequential pages near full (InnoDB about 15/16, C98; LMDB, C99).
Reason: rodeh 543 ("between b and 3b"), 580-582; `T:innodb-doc/paper.txt` 288-293.

**C54** CONFIRMED
Reason: rodeh 538-543 "We found that not to be a problem in practice ... the root and all of its children are almost always cached".

**C55** CONFIRMED
Reason: rodeh 584-588 (no difference in memory, one CPU; about x6 with disk parallelism); Table 8 at 744-745 (re-opened): 1303/1307, 733/763, 394/407, 350/359, a cost of 0.3 to 3.9 %.

**C56** PARTIALLY
Corrected: for linked structures whose updates change O(1) nodes amortised (red-black trees with lazy recoloring in the source), node splitting gives persistence at O(1) amortised space per update against O(log n) for copying the access path.
Reason: `T:versions-driscoll/alt.txt` 1440-1449; the O(1) is stated for "red-black trees with lazy recoloring".

**C57** CONFIRMED
Reason: `T:versions-becker/paper.txt` 162-166, 173, 371-372; the strong version condition (176-182) bounds a new block on both sides (see C66).

**C58** CONFIRMED
Reason: `T:versions-grayGraefe/paper.txt` 280, 288, 324, 361.

**C59** REFUTED
Corrected: with utility log b and cost = start + work proportional to b, benefit per cost peaks where work per visit = start / (ln b − 1). That is an optimum, not an overhead floor: there the start is (ln b − 1)/ln b of the cost (84 % at Gray and Graefe's 16 KB page), and "mostly overhead" means work below the start itself. Neither the routing utility nor work proportional to fan-out holds for research sessions; no figure transfers.
Reason: d/db [ln b / (L + cb)] = 0 gives cb = L/(ln b − 1); grayGraefe 288, 324, 361 (16 KB: 11.6 ms per access, about 10 ms latency, b = 541, L/5.3).

**C60** CONFIRMED
Reason: `T:s2-lmdb-doc/paper.txt` 74, 119.

**C61** CONFIRMED
Reason: `T:versions-lmdb/paper.txt` 344-352: a header line and three data rows; read with labels shifted one row, back-mdb 12.0 s at 16 against 3 m 04 s for back-hdb (17 m 15 s, Debian build). The engine author's own test; flag kept.

**C62** CONFIRMED
Reason: `T:s2-comer-utah/paper.txt` 484-495.

**C63** CONFIRMED
Reason: `T:versions-btreaps/paper.txt` 72-75 (ln 2 ≈ 69 %; 2 ln(3/2) ≈ 81 % for B*); comer-utah 735-738 (ln 2 for "B-trees of higher order"). Second-hand, as marked.

**C64** CONFIRMED
Reason: comer-utah 739-750 is Comer's account of Bayer and Schkolnick.

**C65** UNVERIFIABLE
Reason: the cited place is a collect file this brief forbids opening, and the paper was not read. Search summaries of Johnson and Shasha (JCSS 47(1):45-76, 1993) agree on a negligible gain and lost concurrency for merge-at-half, but add a condition: the gap nearly vanishes only while deletes are at most about 47 % of modifications; at 50 % free-at-empty falls under 40 % against about 60 %. srinivasan-carey 64 cites their 1989 paper: occupancy "not found to decrease ... by much" for practical workloads.
Settle by: reading the 1993 paper's utilisation results by delete share.

**C66** PARTIALLY
Corrected: a split should move only keys not yet started, and the new leaf's load must sit in a band, neither near full nor near empty (MVBT: (1+ε)d to (k−ε)d live entries, a merge on underflow). A hand-over to a successor of the same leaf (R49, R50) carries its reloaded state S, not only unstarted keys; keys in progress at the cut move only as far as they were committed to files (C16).
Reason: becker 176-182 "must be in the range from (1 + ε)·d to (k − ε)·d ... a merge is attempted"; v2:467-470.

## E. Hierarchies of workers

**C67** CONFIRMED
Reason: `T:kim-scaling/paper.txt` 1153-1162, 974-980; 2227-2229 (3 sub-agents, 1 orchestrator, at most 5 rounds).

**C68** CONFIRMED
Reason: kim 1175-1177, 1187, 1162; fitted on architecture means at a matched budget of 4,800 reasoning tokens per trial (1171), far below one session.

**C69** CONFIRMED
Reason: `T:huang-faulty/paper.txt` 293-303.

**C70** PARTIALLY
Corrected: with 2,900 leaf servers, the two-level tree was off the chart for Q3, a GROUP BY returning many groups, because the root aggregated near-sequentially; three levels (1:100:2900) ran it, and a fourth (1:10:100:2900) halved Q3 again, while Q2 (3 s at three levels) gained little. The extra level paid for the many-group aggregation, not for another query.
Reason: `T:dremel/paper.txt` 444-450, 452-458.

**C71** CONFIRMED
Reason: `T:astrolabe/paper.txt` 1536-1550, 1588-1589; the 5-50 advice is tied to "present day network packet sizes, CPU speeds, and memory sizes".

**C72** CONFIRMED
Reason: `T:tag/paper.txt` 622-625, 631-635 ("for our simulation topology").

**C73** CONFIRMED
Reason: `T:macnet/paper.txt` 291-293, 357-366; the paper ties the result to its own propagation mechanism, under which deeper topologies "may cause agents to lose sight of farther contexts".

**C74** PARTIALLY
Corrected: as C74, marked self-reported: a company's account of its own production system ("In our data"), with no method or public baseline.
Reason: `T:anthropic-research/paper.txt` 60 "In our data ... multi-agent systems use about 15× more tokens than chats"; 93 (3-5 subagents), 132, 134.

**C75** CONFIRMED
Reason: `T:otp/sup.txt` 139-141, 153-155.

**C76** PARTIALLY
Corrected: as C76, with the conditions: the token tables cover only tasks both methods solved (Oolong: both above zero), where recursive agents had much higher success on DeepDive and Oolong. On Oolong the single agent, trained at 32K context, could not print the 55K+ input and used regex and string matching, so the 21× buys a different, more accurate strategy; only DeepDive is the sequentially dependent case. The paper adds that KV caching eases much of the single agent's quadratic cost.
Reason: `T:h2-rao/paper.txt` 620-625, 644-652, 1216-1220, 1223-1230, 1265-1271.

**C77** CONFIRMED
Reason: `T:h2-selforg/paper.txt` 298-303, 366-370 (simulated tasks).

**C78** CONFIRMED
Reason: `T:h2-redel/paper.txt` 340-347 ("until they reached a configured depth limit or timed out").

**C79** PARTIALLY
Corrected: the direction (width before depth; an inner level when one parent cannot hold its children, as at Dremel's root) stands as a hypothesis. "Only RAO and the self-organising study varied depth" is wrong inside the claim's own sources: MacNet compared deeper (chain, tree, layered) with wider (star, mesh) topologies at equal density, and Huang compared a linear chain with a hierarchy; MacNet ties its result to its own mechanism.
Reason: macnet 291-293, 357-366; huang-faulty 293-303. A web search (title words only) also lists a debate study varying depth and width (arXiv 2510.04311), seen as a summary only.

**C80** PARTIALLY
Corrected: for tokens, an inner level pays only when its output is much smaller than what it reads, since the root then reads b summaries instead of every report (MEDIAN gains nothing). TAG's saving came from fewer relayed messages over many radio hops, and TAG gains nothing in a flat single-hop network, which is what files a parent reads directly are. "Only" omits quality: an inner level that checks reports before passing them on may pay in errors (C67's centralised check), untested.
Reason: tag 622-625, 631-635; kim 1159.

**C81** PARTIALLY
Corrected: depth saved tokens where one agent would re-read a long history and the work split into parallel parts (TextCraft 196K against 1,029K); on sequentially dependent work it cost 28 times the tokens and 18 times the time (DeepDive, 1.6 % concurrent). Oolong's 21× is not that case (C76). The saving is in cache reads (1,021K of 1,029K), so it shows in token count more than in token cost.
Reason: h2-rao 620-625, 646-652, 1223-1230 (Table 9), 1265-1271 (Table 11).

## F. Derived laws and choices

**C82** PARTIALLY
Corrected: depth = ⌈log_b L⌉ with L the leaves the packer makes (whole groups in key order against two capacities, R47), not N/C. And b is not a hard capacity as a page is: a coordinator hands over to a successor (R50) and admits children in waves, so N/C > b means choosing between an inner level and more coordinator epochs, priced in tokens; it does not by itself require an inner level.
Reason: v2:451-457, 471-473; grayGraefe 280 (the height law, for full pages of equal entries).

**C83** PARTIALLY
Corrected: W* − P − S = √(2H0·g) = g·k* is by construction the growth of the parent's own k* calls between hand-overs; child summaries arriving within an epoch share that growth with the parent's own work, and summaries kept across hand-overs belong to S (raising H0 and W*). So b ≤ (g·k* − own growth per epoch)/s_summary; s_summary and the split of g are not measured. `cost.mjs`'s root fan-out (rows of 200 tokens, tagged G, over all of W* − P − S) counts that room twice.
Reason: v2:473; `tcb/cost.mjs:271, 277, 401`.

**C84** PARTIALLY
Corrected: overflow with chance p needs f = 1/q_{1−p}(R) in the usual notation (q_x the x-quantile), R the leaf-level ratio Σ realised / Σ estimated. That ratio cannot be built from per-key ratios assumed independent, since a field's keys share context and their errors move together; each capacity (A_leaf, C_node) needs its own f.
Reason: P(R·f·A > A) = P(R > 1/f) = p; v2:454-455; SELECTIONS-MAP:160 "keys share context".

**C85** PARTIALLY
Corrected: the arithmetic holds (occupancy 0.5 against a bulk load at f = 0.75 gives 1.5 times the start overhead per unit of work). C100's 1/2 to 2/3 is Facebook's fragmentation under its read/write workload with updates (self-reported), not random arrival (ln 2 ≈ 0.69, C63, second-hand); under the design's own split (C86, C109) the old leaf ends near full and the overhead falls on the new leaf, the more the smaller the moved remainder.
Reason: `T:rocksdb-cidr2017/paper.txt` 182-186 "Under read/write workloads similar to those at Facebook"; btreaps 72-75.

**C86** PARTIALLY
Corrected: as C86, but only where the unstarted keys form one range above a separator, which needs the leaf to work its keys in key order (or a separator fixed before work); otherwise the moved set is a list of ids, as the overflow record already is, and the B-link high-key test does not route it. Keys in progress at the cut stay with the old leaf only as far as they were committed to files.
Reason: lehmanyao 162-164 and graefe2010 110 (a high key bounds one contiguous range); v2:172 (overflow record = {ids, tokens, reason}).

**C87** PARTIALLY
Corrected: no merge of running leaves stands (C06, C21, C96). An under-full leaf costs more than its start: its admission and its end note each wake the parent, a re-read of the parent's window (C09, C18), and while it runs it holds a full slot and the same memory peak as any session. So: fewer, fuller leaves at plan time, free at empty for running ones.
Reason: v2:327-328; TOKEN-BOTTLENECK:18; `tcb/admit.mjs` decide (one peak_mb for every session; b1-0112 at `library/journal/2026-11-18/b1.jsonl:12`).

**C88** PARTIALLY
Corrected: moving keys into a running session costs a message and one wake of the receiver (a re-read of its window); it is a cost, not an impossibility, to be priced against a new leaf (P about 60,000 plus S0, C08). The record itself plans to move a cross-field key to its co-owner (R48(c), later) and to redistribute an overflow range to a sibling with slack, else defer it to the next wave (D2-02).
Reason: v2:461; SELECTIONS-MAP:161.

**C89** PARTIALLY
Corrected: the sources show the schemes alike single-threaded (C28) and with one CPU and one disk (C34), when one resource binds, not "with few writers"; with low contention and more resources B-link and optimistic schemes did much better. The tree fits the alike case because admission caps live children at three (b1-0112) and structure changes are rare, short and under one run lock. "Buffering adds nothing" does not follow: batching parent wakes (C50) saves tokens whatever the tree's size.
Reason: olc2019 308, 347; srinivasan-carey 600; b1-0112.

**C90** REFUTED
Corrected: the record's rules still disagree after the B-link reading. D3-12: "Fields are not split mid-research. A field whose window exceeds W* gets a second session after it, from its frozen pack (a hand-over)." D3-01: "split the remaining work instead of handing over again; stop and split at 1.5*W*." D2-02: redistribute to a sibling with slack, else defer. Moving a running field's unstarted keys to a new leaf is the mid-research split D3-12 rules out; the B-link form gives a split's mechanism, not the choice between split and hand-over, which R49 leaves to measurement.
Reason: SELECTIONS-MAP:154, 161, 162; FAULTS-AND-FIXES:37-40 ("settle that from the record").

**C91** CONFIRMED
Reason: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md` 30-31, 125-127, 150-151; 175 under "## Not covered" (169).

**C92** PARTIALLY
Corrected: the new leaf is admitted at the gate and the two shared files take one writer at a time. But the overflow that triggers a split comes from the budget cut, where "the coordinator stops the child, the task cut" (R11): a stop of running work that the decision rule allows for memory only. Either the cut becomes "commit at soft_frac and end", or the rule names budget as a second stop.
Reason: v2:170-172; DECISION-RULE:30-31.

**C93** CONFIRMED
Reason: a scope statement; r57-0505 (`library/journal/2026-11-18/r57.jsonl:65`) and r57-0512 (c) name it; astrolabe 175-176 as quoted.

## G. Engines people run

**C94** CONFIRMED
Reason: `T:pg-nbtree/readme.txt` 17-22 (re-opened).

**C95** PARTIALLY
Corrected: PostgreSQL flags the left page INCOMPLETE_SPLIT and normally finishes the split at once, keeping the child locked until the parent has its downlink; only if that fails is the split left incomplete, and then a later writer that meets the flag finishes it; the next VACUUM finishes an interrupted page deletion. Before 9.4 both were finished at end of recovery.
Reason: pg-nbtree 666-673, 687-698, 719-724 ("each writer would attempt to complete the unfinished split").

**C96** CONFIRMED
Reason: pg-nbtree 235-240, 365-367; the reason for no merge is concurrency ("a scan moving in the opposite direction might miss the items").

**C97** CONFIRMED
Reason: pg-nbtree 112-123 (re-opened).

**C98** CONFIRMED
Reason: innodb-doc 286-299, 305-309 (clustered index).

**C99** PARTIALLY
Corrected: LMDB splits at the new key when the caller passes MDB_APPEND (the old page stays full) and otherwise in the middle, except that when the new item goes on a page's last spot it biases the split "so the new page is emptier than the old page", for sequential inserts; pages under 25 % full are merge candidates.
Reason: `T:lmdb-engine/mdb.c` 9895-9902, 9985-9990, 1089-1092.

**C100** CONFIRMED
Reason: rocksdb-cidr2017 182-186, 341-350 (self-reported).

**C101** CONFIRMED
Reason: `T:myrocks/paper.txt` 28-29, 174-180 (self-reported).

**C102** CONFIRMED
Reason: `T:rocksdb-evolution/paper.txt` 264-272, 330-333, 772 (self-reported).

**C103** PARTIALLY
Corrected: FDB bounds transactions by a 5-second MVCC window to limit resolver and storage-server memory; the window is "long enough for the majority of OLTP use cases", and of longer transactions "many can be divided into smaller transactions" (self-reported), not "usually".
Reason: `T:fdb-sigmod/paper.txt` 712-718, 722.

**C104** CONFIRMED
Reason: `T:discord-scylla/paper.txt` 101, 115, 119-123, 135-136; 123: coalescing "help a lot, but they don't solve all of our problems".

**C105** PARTIALLY
Corrected: Uber (self-reported, PostgreSQL 9.2): indexes point to on-disk tuple offsets, so "when a tuple location changes, all indexes must be updated" (the source's condition, not every update). Its statement that B-tree rebalancing moves sub-trees is Uber's own and does not match PostgreSQL's B-tree, which never merges partly full pages and never loses height (C96).
Reason: `T:uber-pg-mysql/paper.txt` 153, 179; pg-nbtree 235-240, 365-367.

**C106** PARTIALLY
Corrected: Pebble paces flushes by the bytes still to be flushed from the memtables and compactions by an estimate of compaction debt; each is held near a target, slowed below it (with a minimum rate) and unthrottled above it, to cut latency spikes for foreground reads and writes. A design note, no measurement.
Reason: `T:pebble-doc/paper.txt` 672-687, 700-712, 723-725.

**C107** CONFIRMED
Reason: `T:wiredtiger-doc/paper.txt` 16, 21.

**C108** REFUTED
Corrected: PostgreSQL does not finish a split by a named job: the splitting backend posts the downlink at once while holding the child's lock, and after a failure the next writer that meets the flag finishes it (C95), as Graefe's "side effect of any future root-to-leaf traversal" and the Bw-tree's help-along also do. A script under the run lock is a choice for sessions, justified by cost (a passing session spends minutes and a window re-read), not by PostgreSQL.
Reason: pg-nbtree 668-673, 719-724; graefe2010 115.

**C109** PARTIALLY
Corrected: an append split keeps pages full because later keys keep arriving at the right edge and fill the new page. A session split moves a remainder with no later arrivals during a run (keys frozen, R46; C89's own assumption), so the old leaf is near full only because it overflowed and the new leaf stays as empty as the remainder is small, paying a full start on it (C85). The full-page analogue is moving the remainder to a sibling with room not yet started (C88), or deferring it to the next wave (D2-02).
Reason: rodeh 580-582; mdb.c 9895-9898, 9985-9988; SELECTIONS-MAP:161.

**C110** PARTIALLY
Corrected: Facebook says defragmentation was "less effective on our workload than expected" because a continuous stream of mostly random writes re-fragmented pages quickly (self-reported, one workload), not that re-packing does not hold. No stream of new questions exists during a run today (keys frozen, R46; C89), so the conditional has no current case; the bulk-load half stands (R47).
Reason: myrocks 174-180; v2:448-450.

**C111** PARTIALLY
Corrected: each key has one owning field (R46) and one research session per field, so sessions per range are already capped at one; a hot leaf for sessions is one woken by many messages, which de-duplication in C50's buffer covers. Discord says coalescing and routing reduced hot partitions but did not end them, and the store was then replaced (self-reported, uncontrolled); no hot range is observed in our files.
Reason: discord-scylla 119-123; v2:448-450.

**C112** PARTIALLY
Corrected: records should name the key (approved question id) and find its leaf through one map (`tree-plan.json`). A leaf id is the analogue of Uber's physical location (where a key lives now), and a question-id range changes at a split, so neither is the stable name; with references by question id, a split rewrites one map entry.
Reason: uber-pg-mysql 153; v2:443-444 (key = approved question id).

**C113** PARTIALLY
Corrected: count the backlog in tokens, not messages, as Pebble counts bytes. But Pebble's level-keeping is a rate controller that stops continuous background I/O from spiking foreground latency, with no fixed cost per flush; a parent's wake has a fixed cost (its window, C09), so the token-least trigger weighs that cost against delay (C50), and Pebble says nothing about it. C106 also misstated flush pacing.
Reason: pebble-doc 672-687, 711-714, 723-725.

**C114** REFUTED
Corrected: the record's rule for a session that reaches its window is a hand-over to a successor of the same leaf continuing from commits (R50), with a split only under R49's ratio (later, option (b)). FDB bounds a shared multi-version window in resolver and storage-server memory and says many long transactions can be divided by the client: a reason to keep units short, not evidence for split over hand-over.
Reason: v2:467-473; fdb-sigmod 712-718, 722.

**C115** PARTIALLY
Corrected: what binds changes (RocksDB: space for most deployments, self-reported), so each part is chosen against measured tokens per message and per read, with memory as a hard limit. C09 shows where tokens go, not that tokens bind ahead of memory, which caps live children at three (b1-0112) and is the only resource the decision rule stops running work for.
Reason: rocksdb-evolution 330-333, 772; TOKEN-BOTTLENECK:14-18; DECISION-RULE:30-31.
