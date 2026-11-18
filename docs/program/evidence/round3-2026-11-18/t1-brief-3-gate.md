# t1 step 3a: brief for the gate (kind run, Sonnet)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root.

Goal: for every claim C01, C02, ... in `R:t1-claims.md`, check that its quote stands at its cited place.
Do not judge whether the claim is right; only whether the words are there.

How: for a paper, `grep -n -F '<a distinctive part of the quote, 20 to 60 characters>' R:papers/tree/<name>/paper.txt`
(pdftotext breaks lines and hyphenates: try a shorter part, or the words either side of a line break, before
giving up); for a repository file, read the cited line and two lines either side. Numbers must match exactly.

Verdict per claim: `LOCATED` (at the cited line, plus or minus 3); `MOVED` (found at another line: give it);
`ALTERED` (found, but a number or a word differs: give both); `DEAD_CITATION` (not found anywhere in the cited
file); `NOT_CHECKABLE` (no quote, the file is absent, or the claim is marked hypothesis with no quote).

Write `R:t1-gate.md`: a header with the counts per verdict; then a table: claim | verdict | cited place | place
found | note (at most 20 words). Write nothing else. No web. No git command that writes.

Return at most five lines: the path and the counts per verdict, and the ids that are ALTERED or DEAD_CITATION.
