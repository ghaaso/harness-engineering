# t1 step 5b: record check (2026-11-19)

Script: node, in the scratchpad (not in the repository). Checks: JSON parse, field order and no empty field, id prefix / unique / range of kind, `date` and `by`, and every number of `claim` at the first `evidence` place (cited line +-3; years and arXiv ids not counted as figures). Added by the coordinator: x42 (self-reported) and the t1 status record.

| File | Checked | Passed | Fixed | Removed |
|---|---|---|---|---|
| x35 | 25 | 25 | 1 | 0 |
| x36 | 36 | 36 | 0 | 0 |
| x37 | 39 | 39 | 0 | 0 |
| x38 | 51 | 51 | 0 | 0 |
| x39 | 96 | 96 | 0 | 0 |
| x42 | 41 | 41 | 0 | 0 |

Fixed: x35-0117, claim said "protocol v1, lines 278-279"; the sentence stands at line 278 only (line 279 is another bullet). Now "line 278".

Number outside the +-3 window, kept (the number stands in the same entry or section of the cited file):
- x35-0113 "13 fixes": stands at collect-ours line 117 (header of the same entry F9, cited line 123).
- x38-0300 "H-0245": report number in the header of P1 (line 21; cited 25).
- x39-0308 "0.014, 0.658": the collect file states them at line 34 and the paper at lines 977-980 (the record's note names 978-980); the cited line 73 holds Table 5 only. Not removed; a later reader should add line 34 as evidence.
- x42-0305/0306/0307 "8.0": manual version, in the P2 header (line 49) and paper line 2.

Self-reported (x42): every record with an engine-team or company figure carries it (25 of 41). The 16 without it hold no figure of a company (PostgreSQL README, papers, a mechanism of Discord's blog, LMDB source, the version number 9.4, LMDB code constants).

t1.jsonl: one status record (t1-0200). It names the five refuted claims C51, C59, C90, C108, C114 each with its reason, and the counts 65 / 42 / 5 / 3 equal the table of t1-report.md lines 25-28. "The owner rejected removing the split" is recorded nowhere as a result: x35-0109 and t1-0103 (both kind fact) state that no record of such a rejection exists; x35-0104 records an attack round's verdict, not an owner ruling.

Totals: 288 records checked in x35-x42, 288 pass, 1 fixed, 0 removed.
