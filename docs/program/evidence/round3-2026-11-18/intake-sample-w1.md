# Intake sample check, lane w1 (2026-11-19)

What was checked: the 15 records of the sample line `- w1:` in `intake-state.md` (in `w1.jsonl`, lines 5, 10, ..., 75) and the 24 extractor records of the line `extractor files x25, ... sample 24` (in x25-x29, x40, x41, as `id@xNN:line`); 39 in all. For each: the claim, its figures and conditions against the cited place (`R:` collect file lines, `E:` library lines, the paper text under `R:papers/w1/`), with grep where a cited line looked off. Then (a) the refuted claims of `w1-refute.md` against `result` records, and (b) the self-reported rule on all company-account records of the lane's files (w1, x25-x29, x40, x41).

Rule: stands = every number, name and condition is at the cited place; in part = something differs; does not stand = the place does not say it; cannot be checked = URL only, absent text or missing path. Only reading; no file changed except this one.

| id | mark | reason |
|---|---|---|
| w1-0304 | stands | Ports and Grittner: ports12 lines 23, 582, 600, 604, 608 give under 7 %, 5 % in memory, indistinguishable on disk-bound with failures under 0.25 %, 10-20 % CPU on SIBENCH, rare dangerous structures, frequent rw-conflicts in RUBiS |
| w1-0309 | stands | InnoDB page lines 280-281 and 342-343 say multiple granularity locking, coexistence, intention locks block only full table requests |
| w1-0314 | stands | Ries lines 854-863, 891-894: fine granules interfere, main-memory locks make little difference, most effect from entities touched |
| w1-0319 | stands | E:195-199 (and collect) quote 1V twice as fast, 75 % against 5 % at x=1, 80X at x=12 with 50 % long readers; 10 % of 10M rows is in the collect file |
| w1-0324 | stands | E:168 quotes unaffected up to theta 0.5, convergence at 0.8, Calvin alone keeps good performance; 16 servers there |
| w1-0329 | stands | E:143-147 give the crossover with the "in addition ... large number of transactions" condition, think times 1, 5, 10 s, and the open question |
| w1-0334 | stands | Aria lines 415, 434, 437, 515: 2.4x Calvin, 10.3x PB (strict 2PL), abort about 0.4 %, 39 % at 0.999, below PWV-A at 0.8 and BOHM at 0.9 (the claim says "PWV", the paper says PWV-A) |
| w1-0339 | stands | escrow line 26 holds the hot-spot and "just a second or so" sentences; no measurement in the paper |
| w1-0344 | stands | E:197-198: up to 12x, 5x on average, 8 projects, 72 scenarios, 39 % of the conflicts |
| w1-0349 | stands | agentpr lines 190, 193, 330-333: 19.8 % of 601, 41.7 % of 115, no build or semantic tracking, conservative lower bound |
| w1-0354 | stands | storm lines 1127-1136: file_editor mediated not bash, false-positive rejection within one file, __init__.py bottleneck |
| w1-0359 | stands | barghouti lines 893-937: restart undesirable, snapshot validation counts only reads made before the other transaction finished, longer means more starvation, whole-database lock not acceptable |
| w1-0364 | stands | bkk85 lines 508-512: short transactions essentially for recovery, system abort hits only the current short transaction; no measurement in the collect file |
| w1-0369 | stands | figma lines 93, 130, 132: process per document, conflict on same property of same object, last value wins, AB or BC never ABC; no figures; "self-reported" present |
| w1-0374 | stands | foundationdb line 450 (5 s window), tanabe lines 782-792 (0 to 10 ms, 1 s out of memory), ries lines 434-452 and 871 (50-500 entities, 100 msecs per entity, 10 granules sufficient); the lane-wide "longest units" superlative cannot be checked at one place but is the refuter's corrected W95 and nothing read contradicts it |
| x25-0308 | stands | collect-isolation line 37 and ports12 lines 174, 181: SIREAD locks do not block, dangerous structure of two adjacent rw-antidependencies |
| x25-0316 | stands | collect-isolation line 62 and PostgreSQL 18 Table 13.1 in pg-docs: the repeatable read phantom cell reads "Allowed, but not in PG", so "only serialization anomaly" holds for PostgreSQL |
| x26-0308 | stands | collect-grain lines 102, 105; pg-explicit-locking page line 203: no limit on rows locked, locking a row might cause a disk write |
| x27-0308 | stands | diaconu paper line 464: latch contention limits CPU use to 40 % for more than 6 cores |
| x27-0316 | stands | tictoc paper lines 685, 691: 1.8x, abort rate down 27 %, advantage gone at 80 warehouses; Fig. 4 is 4 warehouses |
| x27-0324 | stands | tanabe line 357: write ratio 0 to 10 %, abort rate rose, read validation failures |
| x27-0332 | stands | E:158 (l.385) quote: OCC best on 1024 cores at theta 0.8, one transaction always commits |
| x27-0340 | stands | foundationdb line 422: 24 machines, 22 proxies, 336 storage servers, linear scaling, saturated at 2m Ops |
| x28-0308 | stands | faleiro paper lines 46-58: partitioning (H-Store), ordered locking (Calvin), dependency graphs (BOHM) |
| x28-0316 | stands | aria paper lines 523-524: 1.9x, 1.2x, 7.4x at 180 partitions, comparable to PWV, worse with few warehouses |
| x28-0324 | stands | doppel paper line 553 holds the non-splittable sentence (collect cites 554, one line off); serial execution, far less parallel speedup |
| x28-0332 | stands | E:120 and E:127: 12.7M on 200 servers, 25-fold; over 12M against about 1.1M; three orders of magnitude |
| x28-0340 | stands | jepsen-voltdb lines 3 and 229: stale reads, dirty reads, lost updates due to network partitions and fault recovery |
| x29-0308 | stands | collect-merge lines 55-56 and E:188 hold 34,030 scenarios, 19,238 against 14,544, about 24 % (the record cites E line 187, which is the 2019 study: off by one) |
| x29-0316 | stands | E:161-175 (diff3 section): several regions no longer ensure conflict-free, not idempotent, not stable |
| x29-0324 | stands | agenticflict lines 306 and 338-345: table 15.24 to 31.85 %, text 15.43 % Copilot and 20.06 % Cursor |
| x29-0332 | stands | cocoder lines 567-569: Pearson r=0.65, 16 projects |
| x29-0340 | stands | caid line 450: improves from 2 to 4 engineers, decreases at 8 |
| x40-0308 | stands | barghouti lines 1296, 1309: compensation functions per committed transaction; edit, compile, debugger as a saga |
| x40-0316 | stands | sagas text (cornell-text.txt, paper.txt there is empty): abstract has the potential to improve performance; no measurement word found |
| x40-0324 | stands | split paper line 136 (quiescent), lines 113-130 (read and write sets), versions assumed |
| x40-0332 | stands | perry lines 715-716: 46 % of IMRs and 50 % of MRs opened and solved on the same day, 5ESS subsystem |
| x41-0308 | stands | google-docs ot.txt line 129 and conflict.txt line 13: "if OT is implemented correctly" guarantee |
| x41-0316 | stands | discord-billions lines 126-127: last write wins per column, upserts, row left with only primary key and text |

## Counts by mark

Over all 39 records (15 w1 + 24 extractor): stands 39, stands in part 0, does not stand 0, cannot be checked 0.

## Ids that do not stand

None of the 39. Three small citation slips that do not change a mark: x29-0308 cites E line 187 (the text is at 188), x28-0324 cites doppel line 554 (it is 553), x40-0316 reads in cornell-text.txt because sagas/paper.txt is empty.

## (a) Refuted claims against `result` records

`w1-refute.md` marks one claim refuted: W92 ("on a place every unit writes every method lands at most about one unit per unit time, and optimism adds up to N - 1 redone units per landing"). Searched w1.jsonl and x25-x29, x40, x41 for its key words (unit per unit time, N - 1, landing, every method, redone, every unit): no record of kind `result` states it. It appears only in `w1-0200` (kind `status`, "refuted and not to be proposed again") and in hypothesis records (w1-0405, w1-0407, kind `hypothesis`, which use N-1 in a different formula). Check passes.

## (b) Self-reported check, all company-account records of the lane

All company-account records that quote a figure carry "self-reported": x41-0309, 0310, 0313-0318, 0321; w1-0328, 0341, 0369-0374; x27-0307-0309, 0338-0340; x28-0338, 0342, 0343. Records of company accounts that give no figure (x41-0301-0308, 0311, 0312, 0319, 0320) do not all say it (0302-0308, 0311, 0312, 0319 lack it), which the rule does not need.

Ids lacking it where a figure is quoted:
- x27-0341: FoundationDB's 5-second MVCC window from the company's own paper; its sister records x27-0338-0340 and w1-0328 say self-reported.
- x26-0307 (borderline, a vendor documentation page, not an account): Microsoft Learn, 5,000 locks trigger escalation.
- x28-0344 (borderline, authors' own paper, not a company account): Stonebraker 2007, about 133,000 against 35,000 transactions per core.
