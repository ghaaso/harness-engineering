# w1 step 3a: gate (sonnet, run): does each quote stand at its cited place

Read first: `R:w1-brief-common.md`. Then `R:w1-claims.md`.

For every claim `Wnn` in `R:w1-claims.md`: open the cited `path:line` (a `paper.txt` under `R:papers/w1/`, a
collect file, or a library record) and check that the quoted words stand there, and that every number in the
claim appears in the quote or at that place. Use `sed -n '<a>,<b>p'` and `grep -n -F`; text from `pdftotext` may
break words across lines or hyphenate them: search a distinctive fragment before you call a quote absent.

Write `R:w1-gate.md`: one row per claim: `id | verdict | found at | note`, where verdict is `STANDS` (at the cited
line or within 3 lines), `MOVED` (found elsewhere in the same file: give the line), `NUMBER-ABSENT` (the words
stand, a number of the claim does not), `ABSENT` (not in the file), `NO-FILE` (cited file missing), or
`NO-QUOTE` (a hypothesis with nothing to check). End with the counts. Judge nothing beyond whether the text is
there.

Done returns (at most ten lines): the path; the counts by verdict; the ids not `STANDS` or `NO-QUOTE`.
