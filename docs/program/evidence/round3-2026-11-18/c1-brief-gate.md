# c1 step 3 brief: gate (Sonnet, runs commands to read)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

## Goal
Check that every quotation in `R:c1-claims.md` stands at the place it cites. Judge nothing else.

## How
For each claim block (C01, C02, ...): take each quotation and its cited place (`R:papers/check/<short>/paper.txt:N`,
or a library id with the place that record cites). Open the text at lines N-5 to N+5 (use `sed -n`). pdftotext
breaks lines and hyphenates words: compare after joining lines and collapsing white space and hyphen breaks.
Every number in the quotation must appear there with its unit. If not near N, grep the whole file for a distinctive
phrase of the quotation and report where it is.

Verdicts per quotation: `STANDS` (at the line, words and numbers equal), `MOVED` (found at another line: give it),
`ALTERED` (found, but a word or number differs: give the true text), `NOT FOUND`, `NO QUOTE` (the claim cites no
quotation; fine for a `hypothesis`, a fault for `proven`).

## Write one file `R:c1-gate.md`
A header line with counts by verdict, then a table: claim | quotation (first 60 characters) | cited place |
verdict | the true line or text when not STANDS. Write nothing else; edit no other file; no git writes.

## Return (at most ten lines)
The path; the counts by verdict; the claim ids that are not STANDS with one phrase each.
