# c1 step 5: check of the extract files (Sonnet), 2026-11-19

Method: node script over every record (no sample). Parse; field order of `library/README.md`; ids unique and in the range for their kind
(0300-0399 for results); every number in the claim looked for in lines N-3 to N+3 of the cited collect-file line (a year, which sits in the
paper's heading, was looked for in the whole collect file); quotation marks in the claim looked for in the same window; status quoted/summary
against the paper block's "Status" line; self-reported marks against company sources; the lane file read for the status record of refuted claims.

| File | Records | Parse faults | Order faults | Id faults | Numbers that did not stand | Removed | Changed |
|---|---|---|---|---|---|---|---|
| x30.jsonl | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| x31.jsonl | 41 | 0 | 0 | 0 | 0 | 0 | 0 |
| x32.jsonl | 41 | 0 | 0 | 0 | 0 | 0 | 0 |
| x33.jsonl | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| x34.jsonl | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| x43.jsonl | 24 | 0 | 0 | 0 | 0 | 0 | 0 |
| c1.jsonl | 73 (35 results) | 0 | 0 | 0 | 0 (see below) | 0 | 0 |

Total removed: 0. Total changed: 0.

## Notes (no change made)

- Years (1943 to 2026) are not in the N-3 to N+3 window but stand in the paper heading of the same collect file; every other number stood in the window.
- c1.jsonl results cite the first line of the paper's block (its heading). Seven results (c1-0301, 0309 to 0312, 0314, 0323, 0325, 0334) have figures
  that stand later in the same block or at another line named in the collect file or the paper.txt lines in their own evidence list, not within three lines of the
  cited heading: 74 % and 50 % (Najafi, paper.txt l.542), 44.70/34.86/52.23 % (Uber, paper.txt l.1029-1032), 840 suites (paper.txt l.571, 621), 42 and 55 %
  (collect mergeq l.179, shorter l.128), 2004 (collect queue l.126). They stand; the cited line is a pointer to the block.
- Status: x31-0302, x33-0317, x33-0318, x34-0302, x34-0307, x34-0315, x34-0326, x43-0309 are `summary` where the paper block says "quoted" (an under-claim, kept).
- Borderline for "self-reported", not marked and not changed: records of academic papers that use a company's data (Ericsson: x32-0306 and others; Chrome; Google:
  x33-0303, x33-0315) and project documentation (Rust forge x32-0337 with "~3hr"; Zuul, GitHub docs, Mozilla). The company's own blog, paper or document records
  (GitHub, Uber, Memon/Google, Chromium, BMW, group-commit preprint) all carry "self-reported".
- Refuted claims C44 and C64: no result record states either. One status record, c1-0201, names both with the reason.
