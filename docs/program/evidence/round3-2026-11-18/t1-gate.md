# t1 gate: does each quote stand at its cited place (step 3a)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Checked 2026-11-19 by Sonnet against the files as they are now; whitespace, hyphenation and ligature or symbol damage from pdftotext were ignored. Words only: whether a claim is right was not judged.

Counts (115 claims): LOCATED 85; MOVED 0; ALTERED 0; DEAD_CITATION 0; NOT_CHECKABLE 30.

The five lines the analyst said had moved (C12, C15, C23, C46, C105) were each found within 3 lines of the cited place. Papers are named by folder under `R:papers/tree/`; line numbers are in the text file the claim cites.

| claim | verdict | cited place | place found | note |
|---|---|---|---|---|
| C01 | LOCATED | PROTOCOL-2026-11-16.md:15; DESIGN-RECORD.md:162 | 15; 162 |  |
| C02 | LOCATED | PROTOCOL-v2:440-441; thresholds.json:43; no plan-tree.mjs, no fill_factor reader | 440-441; 43; confirmed | ls and grep agree |
| C03 | LOCATED | DESIGN-RECORD.md:18; PROTOCOL-v2:461 | 18; 461 |  |
| C04 | LOCATED | PROTOCOL-2026:276; v2:461-462, 20-22; DESIGN-RECORD:69; lane-tree.md:18, 8 | 276; 461; 20; 69; 18; 8 | result.json line 1034 not opened (not quoted) |
| C05 | LOCATED | PROTOCOL-v2:172-173, 465-466 | 172; 465 |  |
| C06 | LOCATED | SELECTIONS-MAP.md:30 | 30 |  |
| C07 | LOCATED | commit.mjs:761; thresholds.json:18-19,25,27,28; DESIGN-RECORD:127 | 761; 18-19,25,27,28; 127 | 300000-60000-75000 = 165000 holds |
| C08 | LOCATED | ATTACK-AND-COST-RECORD.md:93,104; DESIGN-RECORD:127; collect-ours.md:139 | 93; 104; 127; 139 |  |
| C09 | LOCATED | TOKEN-BOTTLENECK-2026-11.md:14,18 | 14; 18 |  |
| C10 | LOCATED | PROTOCOL-v2:473; thresholds.json:23 | 472-473; 23 |  |
| C11 | LOCATED | PROTOCOL-v2:468-469 | 468 |  |
| C12 | LOCATED | FAULTS-AND-FIXES.md:37-40 | 37-39 |  |
| C13 | LOCATED | collect-ours.md:113-115 | 113-114 | admit.mjs lines (158, 220-261) cited second-hand, not quoted, not opened |
| C14 | LOCATED | BUILD-SIZE.md:44,45,46,48,51,52; FAULTS-AND-FIXES:49 | 44-46,48; 49 | FX-W3 and FX-W4 rows (51, 52) not quoted |
| C15 | LOCATED | START-HERE.md:17 | 17 |  |
| C16 | LOCATED | PROTOCOL-2026:20,23; collect-ours:126-128 | 17-23; 126-127 |  |
| C17 | LOCATED | PROTOCOL-v2:498-500 | 498 |  |
| C18 | LOCATED | PROTOCOL-v2:39-40 | 40 |  |
| C19 | LOCATED | lehmanyao 162-164 | 162-164 |  |
| C20 | LOCATED | lehmanyao 233, 359 | 233; 359 |  |
| C21 | LOCATED | lehmanyao 478, 482 | 478; 482 |  |
| C22 | LOCATED | lehmanyao 466, 487 | 466; 487 |  |
| C23 | LOCATED | graefe2010 115 | 115 |  |
| C24 | LOCATED | bwtree2013 70, 246-247 | 70; 247 |  |
| C25 | LOCATED | bwtree2013 280-290, 354; x03.jsonl:47 | 282-288; 354; 47 | table and text disagree as claimed |
| C26 | LOCATED | bwtree2013 357 | 357 |  |
| C27 | LOCATED | wang2018 90, 162 | 90; 162 |  |
| C28 | LOCATED | olc2019 347, 308 | 347; 308 | multiplication sign garbled in text |
| C29 | LOCATED | olc2019 29 | 29 |  |
| C30 | LOCATED | olc2019 244 | 244 |  |
| C31 | LOCATED | ariesim 263, 267, 603, 612 | 267; 603; 612 | OCR spelling of I/Os; line 263 not matched, 267 is |
| C32 | LOCATED | ariesim 493, 513 | 493; 513 |  |
| C33 | LOCATED | s2-mohan-kvl 470-474 | 470-474 |  |
| C34 | LOCATED | srinivasan-carey 10, 471, 64, 323 | 10; 471; 64; 323 |  |
| C35 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C36 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C37 | LOCATED | writes-arge-buffertree 304-306, 492-494 | 305; 494 | O( ) symbols garbled |
| C38 | LOCATED | writes-arge-buffertree 439-441 | 439 |  |
| C39 | LOCATED | writes-bender-login plain 69-75 | 69-75 |  |
| C40 | LOCATED | plain 81 | 81 |  |
| C41 | LOCATED | plain 55 | 55 |  |
| C42 | LOCATED | writes-betrfs plain 148-152 | 148-152 |  |
| C43 | LOCATED | betrfs plain 306 | 306 |  |
| C44 | LOCATED | writes-oneil-lsm plain 189, 242-250, 303 | 189; 242; 303 |  |
| C45 | LOCATED | writes-luo-carey plain 668, 811 | 668; 811 |  |
| C46 | LOCATED | writes-dostoevsky plain 1212-1214, 2189 | 1212; 2189 |  |
| C47 | LOCATED | writes-brodal-fagerberg 126-140 | 126 | symbols restored by collector, as stated |
| C48 | LOCATED | s2-rosenblum 340-362, 316-323 | 355; 319 |  |
| C49 | LOCATED | s2-buchsbaum section 2 (no line) | 31-32 | symbol for root restored as "root"; no line cited |
| C50 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C51 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C52 | LOCATED | versions-rodeh 332 | 332 | multiplication sign garbled |
| C53 | LOCATED | versions-rodeh 580-582 | 580-582 |  |
| C54 | LOCATED | versions-rodeh 541 | 541 |  |
| C55 | LOCATED | versions-rodeh 588 | 588 |  |
| C56 | LOCATED | versions-driscoll alt.txt 1446-1449 | 1447-1448 | OCR text |
| C57 | LOCATED | versions-becker 173, 371-372 | 173; 371 |  |
| C58 | LOCATED | versions-grayGraefe 288, 324, 361, 280 | 288; 324-326; 361; 280 |  |
| C59 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C60 | LOCATED | s2-lmdb-doc 74, 119 | 74; 119 |  |
| C61 | LOCATED | versions-lmdb 346-352 | 349; 350 |  |
| C62 | LOCATED | s2-comer-utah 484-495 | 490-495 |  |
| C63 | LOCATED | versions-btreaps 69-77; s2-comer-utah 731-741 | 73-75; 741 |  |
| C64 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C65 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C66 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C67 | LOCATED | kim-scaling 1153-1166, 976-980 | 1159; 977-980 |  |
| C68 | LOCATED | kim-scaling 1175-1177, 1187, 1162 | 1177; 1187; 1160 | Table row at 1160, cited 1162 |
| C69 | LOCATED | huang-faulty 293-303 | 295-303 |  |
| C70 | LOCATED | dremel 452-457 | 455-457 |  |
| C71 | LOCATED | astrolabe 1588-1589, 1539, 1546-1550 | 1589; 1539-1540; 1548 | "5 to 50" runs across a page break |
| C72 | LOCATED | tag 625, 631-635 | 625; 630-634 |  |
| C73 | LOCATED | macnet 357-359, 291-293 | 357-359; 291-293 |  |
| C74 | LOCATED | anthropic-research 60, 134, 132 | 60; 134; 132 |  |
| C75 | LOCATED | otp sup.txt 139-141, 153-155 | 139; 154 |  |
| C76 | LOCATED | h2-rao 129, 617-618, 646-652, 1216-1220, 1226-1262 | 129; 617-618; 651-652; 1217; 1228-1250 |  |
| C77 | LOCATED | h2-selforg 302-303, 368-370 | 302-303; 369 |  |
| C78 | LOCATED | h2-redel 344, 347 | 344-349 | two-column text |
| C79 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C80 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C81 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C82 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C83 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C84 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C85 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C86 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C87 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C88 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C89 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C90 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C91 | LOCATED | DECISION-RULE.md 30-31, 125-127, 175, 150-151 | 30; 125; 175; 151 |  |
| C92 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C93 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C94 | LOCATED | pg-nbtree readme 17-18, 20-22 | 17; 21 |  |
| C95 | LOCATED | pg-nbtree 666-675, 694-698 | 666; 694 |  |
| C96 | LOCATED | pg-nbtree 235-240, 365-367 | 235; 366 |  |
| C97 | LOCATED | pg-nbtree 112-123 | 114-115; 120 |  |
| C98 | LOCATED | innodb-doc 288-293, 305-309 | 289; 306 |  |
| C99 | LOCATED | lmdb-engine mdb.c 9895-9898, 9902, 1089-1092 | 9895-9902; 1089-1092 |  |
| C100 | LOCATED | rocksdb-cidr2017 182-186, 346, 350 | 184; 346; 350 | "[24]" citation sits inside the quoted sentence |
| C101 | LOCATED | myrocks 174-180 | 174-180 |  |
| C102 | LOCATED | rocksdb-evolution 266-272, 772 | 269-272; 772 |  |
| C103 | LOCATED | fdb-sigmod 710-722 | 712; 722 |  |
| C104 | LOCATED | discord-scylla 101, 119, 135-136 | 101; 119 |  |
| C105 | LOCATED | uber-pg-mysql 153, 179 | 153; 179 |  |
| C106 | LOCATED | pebble-doc 700-712 | 700; 711 |  |
| C107 | LOCATED | wiredtiger-doc 16, 21 | 16 |  |
| C108 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C109 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C110 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C111 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C112 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C113 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C114 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
| C115 | NOT_CHECKABLE | none | none | hypothesis, summary or scope statement with no quote |
