# Fill 1 report (2026-11-18)

Writers: x01 to x24 (Haiku extractors) and `fill` (the checker), files `library/journal/2026-11-18/<prefix>.jsonl`. Helper runs: 24 of 26
(23 files, one each, plus x24 for three rows x19 had no ids for). No file was split.

## How the check was done (a deviation from the brief)
Every record up to 30 per file and every second above was not possible in a coordinator's window (2,524 records), so two layers:
1. Every record, by script: parses as JSON; README field order; unique id in the kind's range; `date` and `by`; every number in the claim (years aside)
   and the claim's words looked for in the cited line plus 3 lines each side. 179 records failed; all 179 were read by hand against the cited place.
2. By hand beyond those: every second unflagged record in the files of 26 to 60 records (x01, x07, x13, x14, x22, x23; x14 and x24 read whole) and every
   fifth in the others (541 records). Read by hand in all: 733 of 2,524 (29 %). The other 1,791 passed the script only, so the error rates are lower bounds.

## Per file (written / read by hand / corrected / removed)
| Prefix: source | W | R | C | X |
|---|---|---|---|---|
| x01 app-enforcement-mechanisms | 53 | 28 | 0 | 0 |
| x02 concurrency-lit-1-databases | 131 | 30 | 0 | 0 |
| x03 concurrency-lit-2-memory | 129 | 28 | 0 | 0 |
| x04 concurrency-lit-3-coordination-free | 153 | 39 | 0 | 0 |
| x05 concurrency-lit-4-scheduling | 108 | 32 | 0 | 0 |
| x06 concurrency-lit-5-integration | 149 | 36 | 1 (x06-0307 cited line 85, text is on 84) | 0 |
| x07 concurrency-literature | 60 | 31 | 0 | 0 |
| x08 enforcement-evidence | 108 | 22 | 0 | 0 |
| x09 harness-v2-status | 128 | 29 | 1 (x09-0102 "each" dropped; the file gives one figure) | 0 |
| x10 horthy-instruction-files | 143 | 29 | 1 (x10-0105 note: 53 trial is first-pass, 54 after the addendum) | 0 |
| x11 horthy-proved-general | 169 | 34 | 0 | 0 |
| x12 orchestration-design-status | 95 | 23 | 0 | 0 |
| x13 probe-hooks | 32 | 17 | 0 | 0 |
| x14 probe-suite-memory | 26 | 26 | 0 | 0 |
| x15 several-writers-options | 163 | 63 | 0 | 0 |
| x16 testing-evidence | 98 | 29 | 0 | 0 |
| x17 write-collision-points | 113 | 42 | 0 | 0 |
| x18 bottleneck-2026-11-18/own-data | 76 | 25 | 0 | 0 |
| x19 research-tree/SELECTIONS-MAP | 155 | 32 | 0 | 0 |
| x20 research-tree/DESIGN-RECORD | 187 | 46 | 0 | 0 |
| x21 research-tree/ATTACK-AND-COST-RECORD | 145 | 33 | 0 | 0 |
| x22 research-tree/BUILD-SIZE | 60 | 36 | 0 | 0 |
| x23 research-tree/FAULTS-AND-FIXES | 40 | 20 | 0 | 0 |
| x24 SELECTIONS-MAP rows D8-09 to D8-11 | 3 | 3 | 0 | 0 |
| **Total** | **2,524** | **733** | **3** | **0** |

Form-only edits (content verified unchanged field by field): 75 lines had `evidence`, `see` or `note` out of README order and were put in order
(x02 1, x03 13, x04 10, x05 24, x06 1, x11 7, x13 1, x14 5, x17 3, x18 4, x22 6). x22-0121 has status `owner` (BUILD-SIZE line 27): valid.
x19 had 103 table rows for 100 hypothesis ids; x24 wrote the last three (x24-0400 to 0402).

## Duplicates with r57.jsonl and r57b.jsonl
None dropped. Where an extractor record states the same as an r57 record, the r57 id was added to its `see` (49 records). Pairs: x08-0202, x16-0100
(r57-0101); x14-0100, x15-0101 (0103); x16-0167 (0104); x23-0113, x22-0116, x22-0101 (0112); x23-0110 (0113); x08-0134, x16-0115 (0114); x16-0118 (0115);
x08-0602 (0119); x23-0119 (0109); x09-0124, x08-0129 (0204); x08-0507, x08-0121 (0205); x09-0202 (0202); x11-0106 (0203); x15-0339 (0308);
x06-0339 (0306); x04-0330 (0304); x06-0356 (0305); x04-0353 (0303); x15-0300, x15-0301 (0301); x15-0347 (0307); x20-0205 (0404); x16-0150 (0601, 0704);
x08-0138 (0019); x23-0700 (0702); x12-0402, 0404, 0406 (0206); x12-0400, 0403 (0207); x12-0605 (0209); x18-0119 (0801); x13-0108 (0105); x08-0147 (0108);
x15-0100, x17-0103, x17-0123, x17-0125 (0111); x17-0200, x23-0200, x16-0207, x08-0506 (0102). Found by word overlap of each r57 claim against all
extractor records (best two matches, read by hand); same-topic records that state different things were not linked.

## Proposed corrections (fill.jsonl)
- fill-0500, proposed correction of r57-0111: it says "7 (8 with 0b first) if each function or block has one" and "by function 5 to 8". The source
  (write-collision-points.md lines 147-155) gives 7 for function or block (5 to 7 across its variants) and 8 only at statement level with 0b built first.
  All 96 r57 claims were compared (first 170 characters, in full where an extractor record overlapped); no other contradiction found.
- Noted, not written (a tally, not a contradiction): r57-0123 counts 8 serial-queue and 6 blocked-start episodes; a plain count of own-data.md's
  table gives 9 and 7, so the writer's rule for rows with two limits decides. Left to the top session.

## What the helpers got wrong most often
1. Field order: `evidence`/`see` swapped or `note` before `evidence` (75 lines, 11 files; x05 worst with 24). Not content.
2. Cited place: one claim one line off (x06-0307). Some claims cite the line of the main statement while a year, chapter or author comes from the heading
   or a neighbouring line; this made the script flag 65 % of x02 at first, none of them wrong.
3. One added word the source does not carry ("each", x09-0102).
4. Reported counts did not always match the files (x07 reported 3, the file holds 60; x03 rewrote its file after one malformed line). Counts here are
   line counts. Counts the helpers derived themselves (x20-0505 53 entries and 50 distinct, x20-0124 15 rejected points, x20-0407 16 moved items, x14
   arithmetic) were right when recounted.
5. Kind choices: x20 files design flaws and attack-finding titles as `mistake`; x23 files designed faults as `fact` with status `summary`; x15 re-records
   results already quoted in the literature files. Left as written.
6. Not seen: a wrong figure in a claim, a claim without a source, a duplicate id, an invented source. The real errors were three and small, so the
   helpers' accuracy on the 733 read records is high; it is not shown for the other 1,791.

## Totals and not done
2,524 records in 24 files; 3 content corrections, 75 form fixes, 49 `see` links, 0 removed, 1 proposed correction; 733 read by hand, all by script.
Not done: the by-hand reading of 1,791 records; INDEX.md (top session); probe-hooks-log.jsonl and probe-suite-memory.csv (raw data, not extracted).
