# Summary check evidence (2026-11-14)

Record: `docs/program/SUMMARY-CHECK-2026-11.md`. Page: `docs/program/summary-check/index.html`.

What it measures: how often the compaction summaries on record state something false, and whether that
moves with how full the window was. Scope: the main-session transcripts of FixFlow and the clinic testbed.
The owner's other projects are not opened.

Revised on 14 November after an independent check. The check's findings are in `review-2026-11-14.md`,
written by the checking session; its section "What was done about each finding", added by the session
that ran the count, says what was done about each one, and its section "Second pass, on the revised
record", added by the checking session, lists the later fixes of wording and who applied them.

## Files

- `check.js.txt` is the script. It makes no model calls. Three stages, run from this folder (scripts are
  saved as `.js.txt`, so they run on stdin):
  - `node - index <cacheDir> < check.js.txt` finds every compaction summary in scope, pulls out its
    claims, and scans what each session saw before each boundary. Writes `<cacheDir>/index.json`.
    Set `SUMMARY_CHECK_CUT=2026-11-14T08:49:53.273Z` to read the same 117 summaries as the record;
    without it the cut is the moment the stage starts, and newer summaries are picked up. A transcript
    started after the cut is not read and a folder made after the cut is not counted, so a later run at
    that cut reads the same 83 files in the same 41 folders. The three stages take under a minute.
  - `node - check <cacheDir> < check.js.txt` looks the claims up in the two repositories and on GitHub
    (`gh`, pull request states, merge commits and pull request commits of this repository only) and
    gives each a verdict. Writes `<cacheDir>/checked.json` and the work files for the hand reads.
  - `node - table <cacheDir> . < check.js.txt` reads `checked.json`, `audit.json` and
    `first-count.json` and writes `check-table.txt` and `check.json` here.
- **`<cacheDir>` holds sentences from summaries** (the context of each claim, the kept tails, the last
  sections of each summary). Keep it outside the repository and delete it when done. The run of
  14 November kept it in the session's scratchpad and deleted it. Nothing in this folder holds a
  sentence from a summary or from a message.
- `check-table.txt` is the output table, sections A to L. Every number in the record and on the page is
  in it. Section K is not the script's own measurement: it prints the figures of the independent check,
  which `audit.json` quotes from `review-2026-11-14.md`.
- `check.json` is the same run as data, for the page.
- `audit.json` holds the hand verdicts of the session that ran the count: a code for each claim the
  script marked wrong (both counts), the held samples, the verdict on each of the 117 kept tails, the
  eight summaries read for what the script missed, and the worked examples. The codes are that session's
  own words. The table stage cannot be re-run meaningfully without it: nothing the script marks wrong
  counts as wrong until a reader has confirmed it. Added after the check: `codeRule` (which code a
  hand-over gets when its kept tail did more than one thing), `codeChanges` (the three codes changed to
  follow it; no verdict changed), `review` (the check's figures, for section K) and `changes`.
- `first-count.json` is the record of the first count: totals by kind and the 73 claims it marked
  wrong. `check-first-count.js.txt` is the script as it was for that count (stages `index` and `check`
  only), kept so the first count can be repeated. It is kept as it was, and so **it ignores
  `SUMMARY_CHECK_CUT`**: it takes the moment it starts as the cut. Run on 14 November after the record
  was written it read 121 summaries and 3,075 claims. To get the recorded first count, keep only the
  summaries whose boundary time is at or before `2026-11-14T08:49:53.273Z` (the 117 of the record);
  cut that way its totals match `first-count.json` exactly.
- `scoring-first-saved.md`, `scoring-addendum-first-saved.md`, `scoring-addendum-2-first-saved.md` are
  the scoring sections as first saved, each with its time and a hash: 1.1 to 1.8 before any count, 1.9
  before the kept tails were listed, 1.10 before the lines after a boundary were listed. The record
  holds the same text; corrections found by the check are notes set outside it.
- `page-template.html` and `build-page.js.txt`: `node - < build-page.js.txt` puts `check.json` into the
  template and writes the page.
- `review-2026-11-14.md` is the independent check, with the two blind second readings and the hunt in
  full.

## To run it again

`index`, then `check`, then read every claim `check` marks wrong (`<cacheDir>/wrong-candidates.txt`)
and put a code for each into `audit.json` under `secondCount.flagged`; then `table`, then the page. A
claim with no code in `audit.json` is counted as not checkable, not as wrong. The kept-tail verdicts in
`audit.json` are keyed by summary; a new summary needs its own read (`<cacheDir>/tail-read.txt`).

When reading a kept tail, open each shell or node command instead of trusting the class the script
gives it. A command the script lists as a test run or a status call can edit a file, and both misses
in the second reading came from trusting the label.

## What to know before trusting it

- The script failed the first test the scoring set for it, twice: none of the 84 flags it raised (76
  different claims; 8 were flagged in both counts) was a wrong claim. Its own rate is not a rate. See
  part 2.9 of the record.
- Three kinds of claim (head, merged as, count) carry no rate.
- The upper bounds for a count of zero are one-sided 95 % bounds, printed rounded up. They go beyond
  what scoring 1.6 allows when the script's flags fail the hand read, and the record says so where they
  stand.
- 2,617 of the 2,727 claims are commit ids and paths, held when the identifier is on record. 110 check
  a value against a state.
- One reader made every hand verdict in the counts. The independent check read 30 of the 117 kept tails
  and 35 of the flags a second time, blind: the readers agree on 28 of 30 tails, both misses were
  overtaken cases, and no flag was wrong. It then read the 11 hand-overs of one session
  (fixflow-423aac92) the same way: the readers agree on 9, and the two the first reader left unclear
  the second reader calls overtaken. So 74 of 117 is more likely a few too low than too high. The
  verdicts are kept as the first reader gave them. With the two left unclear read as overtaken the
  count would be 76; with the one miss of the first reading as well, 77 (table K5, K6). 40 of the 117
  kept tails have had a second reading.
- The working files were built from the transcripts again twice on 14 November after the record was
  written: by the independent check, and when the second reading of the 11 arrived. Both times the
  table came out as recorded, apart from its time line and the lines changed on purpose.
- The script's class for a call that changes state under-reports. Counts that lean on it are floors.
- 74 of 117 is the summary scored alone, on its last three sections. The kept tail is part of the same
  hand-over; see part 3.5 of the record and part 6.4 of `docs/program/SPLIT-RULE-2026-11.md`.
