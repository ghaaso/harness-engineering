# Intake sample check, lane t1 (the kind of tree)

Date: 2026-11-19. Checked by a fresh reader. Reading only; no file changed except this one.

What was checked: the 50 records fixed in `intake-state.md`, section "Samples", line `- t1:` (16 in `t1.jsonl`, 34 in x35, x36, x37, x38, x39, x42, all under `library/journal/2026-11-19/`). For each: the claim, its figures, the cited place (read with a few lines around it), and, where that place quotes a paper under `R:papers/`, the quoted line in the paper text. Plus (a) the refuted claims of `R:t1-refute.md` against the `result` records, and (b) the "self-reported" rule across the whole lane.

Rule for the marks: stands = every number, name and condition is at the cited place; stands in part = something differs (said in the reason); does not stand = the cited place does not say it or says otherwise; cannot be checked = URL only, absent paper text, or missing path.

Where a cited line number was off, the text was found with grep and the reason says "cite off". Where a record cites only a URL beside a `t1-collect-*.md` line, the local paper text under `R:papers/tree/` was read instead (the URL itself was not opened).

## Records

| id | mark | reason |
|---|---|---|
| t1-0104 | stands | protocol v2 lines 172-173 (overflow record {ids, tokens, reason}; ids stay not covered) and 465-466 ("cut the pack and list the rest" replaced once (d) exists) |
| t1-0109 | stands | W* = P + S + sqrt(2H0*g) at v2:473; thresholds.json line 23 W_star_coord 133200 (cost.mjs, source mapping); inputs in ATTACK:93-101 are M/E/G (P is a measured median of main sessions, the rest estimated or guessed) |
| t1-0114 | stands | START-HERE line 17, "Not done" row: thirteen fixes, checks that need the app, pilot, first run of the tree |
| t1-0119 | stands | v2:170-172 (urgent exit, coordinator stops the child, task cut) against DECISION-RULE:30-31 (running work stopped only for memory at its floor); overflow from the cut at v2:172 |
| t1-0303 | stands | lehmanyao 466-470 (livelock on a very slow processor following links; comparable speeds) and 487 ("could be quantified by simulation") |
| t1-0308 | stands | wang2018 line 90 (1.5-4.5x, indirection layer and delta records), 38 and 162-164 (failed CaS, help-along eases starvation) |
| t1-0313 | stands | srinivasan-carey line 10 (B-link most concurrency), 323 (disk bottleneck, 1 CPU 1 disk), 843 (1 CPU 1 disk in memory, appends, pessimistic better, link-chases), 64 (merge only when empty); "barely differ" is stated at line 324, next to the cited 323 |
| t1-0318 | stands | writes-bender-login plain.txt line 55 |
| t1-0323 | stands | versions-rodeh 330-332 (2 x tree-depth, split or fixed on the way down) |
| t1-0328 | stands | s2-lmdb-doc line 74 (COW, serialised writes, no blocking either way) and 119 (long read transactions prevent page reuse) |
| t1-0333 | stands | dremel 444-458: 2900 leaves constant, 1:2900 / 1:100:2900 / 1:10:100:2900, Q3 off the chart at 2 levels and halved by a further level, Q2 3 s at 3 levels |
| t1-0338 | stands | otp/sup.txt 139-145 (MaxR within MaxT, terminates children then itself, next higher supervisor acts, defaults 1 and 5) |
| t1-0343 | stands | h2-redel 340-347 (overcommitment, undercommitment, depth limit or timeout) |
| t1-0348 | stands | innodb-doc 288-293 |
| t1-0353 | stands | rocksdb-cidr2017 341-350 (about 50% less space, 10%-15% of writes, 10%-20% more reads; "review of numerous MySQL installations") |
| t1-0358 | stands | discord-scylla line 136 (p99 40-125 ms to 15 ms), 101 and 119-123 (data services, coalescing, hash routing) |
| x35-0107 | stands | DESIGN-RECORD:127 gives C_node = W_quality - P - R_rev = 180.0k; commit.mjs 761 cap = W_quality - child_prefix_tokens - review_reserve_tokens, thresholds.json 300000, 60000, 75000 = 165,000 |
| x35-0115 | stands | replace.mjs 879-884 admit decide inside the lock, exit 6 at 884; 60,000-token prefix at collect line 139 (x15-0104, x12-0104, r57-0201 say about 60,000) |
| x35-0123 | stands in part | v2:40 and 49 say the child's 400-character note goes into the coordinator's window; "per commit" and "there is no buffer" are not stated there, they are the collector's reading of an absence |
| x36-0307 | stands | bwtree2013 line 357: 5.8x on the synthetic workload against BerkeleyDB, in memory |
| x36-0315 | stands | artsync line 348 with its header: lock coupling 418 / 2787, OLC 348 / 418 (1 and 20 threads) |
| x36-0323 | stands | ariesim line 493 "The SMO is performed as a nested top action" |
| x36-0331 | stands | graefe2010 text is at line 115 (cite says 110, the start of the passage: cite off); the collect line 110 cited is another bullet, the right ones are collect lines 26 and 120 |
| x37-0307 | stands | collect line 66; local plain.txt lines 41-43, 81: buffer in internal nodes, insert/tombstone messages, flush in batches when full |
| x37-0315 | stands | writes-oneil-lsm plain.txt line 189 "nearly two orders of magnitude"; analytic |
| x37-0323 | stands in part | page-sized I/O (B entries per page) and Bloom filters are in the survey text, but "memory large enough for the buffer" is stated only in the collector's "Assumes" bullet (collect line 110), not found in the paper text; the URL is the only other cite |
| x37-0331 | stands | writes-monkey plain.txt line 7 (50% - 80%, increasing margin as data grows) |
| x38-0307 | stands in part | versions-rodeh lines 712-714: checkpoint shows "virtually no degradation" for the Search-100 workload and "between 3% and 10%" for the other workloads; the record drops that condition; URL only cited, local text read |
| x38-0315 | stands | versions-becker line 437 Theorem 4 |
| x38-0323 | stands | versions-grayGraefe line 306 |
| x38-0331 | stands | versions-lmdb lines 199-201 (1027 pages, 10 held current data, over 99% wasted; append-only code) |
| x38-0339 | stands | s2-comer-utah 497-501 |
| x38-0347 | stands | s2-lmdb-doc line 74 |
| x39-0307 | stands | kim-scaling quote is at lines 20-21 (abstract) and 160-165; the cited line 28 is blank (cite off) |
| x39-0315 | stands | kim-scaling 1186-1188 "per-agent reasoning capacity becomes prohibitively thin beyond 3-4 agents"; matched budget at line 993 |
| x39-0323 | stands in part | huang-faulty 551-553: "we recover 96.4%" with Challenger and Inspector together; abstract (line 57) "up to 96.4%"; the record's quoted string is not verbatim and omits that it is the two defences together |
| x39-0331 | stands | dremel 350-351 |
| x39-0339 | stands | astrolabe 1539-1543 (5 to 50 child zones) |
| x39-0347 | stands | tag 84-88 |
| x39-0355 | stands | anthropic-research line 60 (4x, 15x); self-reported stated |
| x39-0363 | stands | anthropic-research line 60 "most coding tasks involve fewer truly parallelizable tasks"; self-reported stated |
| x39-0371 | stands | h2-rao 668-671 "On OOLONG-REAL, nearly all successful rollouts have maximum depth 1"; arXiv id matches |
| x39-0379 | stands | h2-redel lines 290-293 "significantly outperforms its corresponding single-agent baseline" (cite 301 off) |
| x39-0387 | stands | h2-selforg 369-371 (1.22 L1 to 1.56 L4); arXiv id matches |
| x39-0395 | stands | h2-cage2 lines 127 and 559, heading; title and arXiv id match |
| x42-0307 | stands | innodb-doc 305-309 (cite 307-309 lies in the passage) |
| x42-0315 | stands | myrocks 174-180 |
| x42-0323 | stands | fdb-sigmod 710-713, 5-second MVCC window to limit memory |
| x42-0331 | stands | uber-pg-mysql 161-168 (tuple plus three indexes) |
| x42-0339 | stands | lmdb-engine mdb.c 9895-9902, exact |

## Counts by mark

- stands: 46
- stands in part: 4
- does not stand: 0
- cannot be checked: 0
- total: 50

## Ids that do not stand

None. Stands in part: x35-0123, x37-0323, x38-0307, x39-0323 (reasons in the table).

## (a) Refuted claims against `result` records

`R:t1-refute.md` marks five claims refuted (summary line 7): C51, C59, C90, C108, C114. They are design claims of the lane, not literature quotes. Searched `t1.jsonl` and x35-x39, x42 by key words (Dostoevsky, lazy leveling, merge policy; Gray and Graefe, benefit per cost, overhead floor; mid-research split, B-link, D3-12; PostgreSQL, downlink, named job; FDB, MVCC window).

| claim | content of the refuted claim | appears as a `result` record? |
|---|---|---|
| C51 | merge policy chosen by the ratio of parent reads to child reports; lazy leveling for the session tree | no. The result records on Dostoevsky and Luo and Carey (t1-0320, t1-0321, x37-0320 to x37-0327) quote the papers only. The refuted idea survives only as t1-0407, a `hypothesis` that names itself as replacing the refuted 'merge once at the top', and open t1-0505 |
| C59 | Gray and Graefe optimum read as an overhead floor | no. t1-0327 and x38-0321 to x38-0323 state the formula and the table only (16 KB best at 0.78), no overhead-floor transfer |
| C90 | the record's split rules agree after the B-link reading | no. t1-0111 (a `fact`) says the rules disagree and stay unsettled, the corrected form; t1-0401 and t1-0405 are `hypothesis` |
| C108 | PostgreSQL finishes a split by a named job | no. t1-0345 and x42-0302 say it is finished lazily at the next insertion or vacuum |
| C114 | the FDB window is evidence for split over hand-over | no. t1-0357 and x42-0322 to x42-0324 state the 5-second window and "can be divided into smaller transactions" only |

Result: none of the five refuted claims appears as a `result` record.

## (b) Self-reported check, whole lane (t1, x35, x36, x37, x38, x39, x42)

Searched every non-status record whose claim or evidence names a company source (blog, Discord, Facebook, Uber, Anthropic, FoundationDB, RocksDB, MyRocks, Pebble and others). Every record that carries a figure from a company's own account says "self-reported" (Discord t1-0358, Facebook t1-0353, Anthropic x39-0355 and x39-0363, FDB t1-0357 and x42-0323, MyRocks x42-0315, Uber t1-0360, x42-0330 and x42-0331, InnoDB manual x42-0307, among others). No figure-bearing record lacks it.

Records of company sources that lack "self-reported" but carry no figure (a mechanism or a lesson only): x42-0316 (MyRocks bulk load), x42-0321 (RocksDB FAST 2021, lesson 2), x42-0322 and x42-0324 (FoundationDB design), x42-0328 (Discord blog 2023, request coalescing), x42-0336 (Pebble design note, compaction pacing), t1-0361 (Pebble, says "design note, no measurement"). If the rule is read as covering any claim from a company account, these seven lack it.
