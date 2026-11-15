# After-compaction count: evidence (2026-11-14)

Record: `docs/program/AFTER-COMPACTION-2026-11.md`. Page: `docs/program/after-compaction/index.html`.

What it measures: whether a session makes more mistakes in the 30 tool calls after a compaction than in
the 30 calls before it, on the transcripts already on record. Scope: the main-session transcripts of
FixFlow and the clinic testbed. The owner's other projects are not opened. No model calls.

## Files

- `after.js.txt` is the script. Stages, run from this folder (scripts are saved as `.js.txt`, so they run
  on stdin):
  - `node - survey < after.js.txt` prints the figures the two surveys gave before the scoring was fixed:
    boundaries, calls between them, tool names, error results by kind over the whole record. Nothing by
    position. It uses the final patterns and reads to the call cut, so a few figures differ from the
    ones part 1.0 of the record keeps as first saved.
  - `node - index <cacheDir> < after.js.txt` reads every main transcript in scope and writes the call
    stream to `<cacheDir>/calls.json`. It needs `<cacheDir>/index.json` from the summary check's own
    reader first, made with the call cut:
    `cd ../summary-check && SUMMARY_CHECK_CUT=2026-11-14T10:30:00.000Z node - index <cacheDir> < check.js.txt`.
    The boundaries, the input ends, the call classes and the fingerprints are that reader's. Boundaries
    counted are those up to its own cut, `2026-11-14T08:49:53.273Z`: the same 117.
  - `node - sample <cacheDir> < after.js.txt` draws the hand-read sample by hash and writes
    `<cacheDir>/hand-read.txt`, which does not say which window an event is in, and
    `<cacheDir>/audit-skeleton.json`.
  - `node - count <cacheDir> . < after.js.txt` builds the windows, counts the signals, resamples whole
    sessions and writes `after-table.txt` and `after.json` here. It reads `audit.json`. While any
    sampled event has no verdict it runs dry: the two sides of every pair are scrambled at random, the
    numbers mean nothing, and nothing is written here.
- **`<cacheDir>` holds commands and tool results** (`calls.json`, `hand-read.txt`, and the summary
  check's `index.json` with summary text). Keep it outside the repository and delete it when done. The
  run of 14 November kept it in the session's scratchpad and deleted it. Nothing in this folder holds a
  sentence from a message, a summary or a tool result, or a command.
- `after-table.txt` is the output table, sections A to N. Every number in parts 2 and 3 of the record
  and on the page is in it.
- `after.json` is the same run as data, for the page.
- `audit.json` holds the hand verdicts of the session that ran the count: one code for each of the 239
  events read, keyed by session id and transcript line, and notes in that session's own words. The count
  cannot be run meaningfully without it: which kinds of error count as mistakes is decided by it.
- `scoring-first-saved.md` is part 1 of the record (1.0 to 1.10) as first saved, with its time and a
  hash, before any count. `scoring-addendum-first-saved.md` is section 1.11, saved after the hand read
  and before the first count.
- `page-template.html` and `build-page.js.txt`: `node - < build-page.js.txt` puts `after.json` into the
  template and writes the page.

## To run it again

The reader's `index`, then `index`, `sample`, a hand read of `<cacheDir>/hand-read.txt` with a code for
each event put into `audit.json` under `verdicts`, then `count`, then the page. The sample is drawn by a
hash of the kind, the session id and the transcript line, so the same transcripts give the same sample.
New transcripts give new events, and those need their own read.

To add a trial's hand-overs: the script counts around every compaction boundary it finds. A hand-over
that is not a compaction (a new session started from a brief) is not found by it. Its first 30 calls
are what table section G counts for every session, and a list of the trial's session ids would have to
be added there.

## What to know before trusting it

- The lead measure is the error results that one reader called the session's own mistakes. All error
  results together, which needs no judgement, rise too, but the range of that rise holds zero.
- Sections J, K and L of the table, and the rows EnM, EinM, MP, Msh, ST and RD, were added after the
  first count, with it in view. They describe. The one test fixed beforehand is the lead comparison.
- The placebo did not behave as a level line: it sits where the count is still running down from the
  last compaction. Read section K with it.
- Neither count of files read again measures learning a file again. The hand read says why.
- One reader made every hand verdict.
- The first count's table was not kept as a file of its own. Before the scratch files were deleted the
  session compared it with the final table line by line: sections A to I are the same except the two
  reworded lines the record names in 2.1.
