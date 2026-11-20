# f{n} quote gate (kind run, Sonnet, medium)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `F:` = `RUN:fields/{n}-{slug}/`. Description `run: f{n} gate`.
From round 3's gate brief (`H:docs/program/evidence/round3-2026-11-18/t1-brief-3-gate.md`, `H:` =
`C:/Users/User/Documents/projects/harness-engineering/`).

Goal: for every claim C01, C02, ... in `F:claims.md`, check that its quote stands at its cited place. Do not judge
whether the claim is right; only whether the words are there.

How: for a paper or a raw page, `grep -n -F '<a distinctive part of the quote, 20 to 60 characters>'
RUN:papers/f{n}/<short>/paper.txt` (or its `page.txt`; pdftotext breaks lines and hyphenates: try a shorter part, or the words either side
of a line break, before giving up); for a file of ours, read the cited line and two lines either side. Numbers must
match exactly.

Verdict per claim: `LOCATED` (at the cited line, plus or minus 3); `MOVED` (found at another line: give it); `ALTERED`
(found, but a number or a word differs: give both); `DEAD_CITATION` (not found anywhere in the cited file);
`NOT_CHECKABLE` (no quote, the file is absent, or a hypothesis with no quote).

Write `F:gate.md`: a header with the counts per verdict; then a table: claim | verdict | cited place | place found |
note (at most 20 words). Nothing else. No web. No git command that writes. Then `F:done/gate.done` last.

Limit 4.8 M tokens. Return at most five lines: the path, the counts per verdict, the ids that are ALTERED or
DEAD_CITATION.

## Changes after the review (2026-11-21)
- 5: a quote in a raw page's `page.txt` is checked as one in a paper text.
