# T8-RECORD: records, board lines, README text and the owner's page (build, Sonnet)

Read `briefs/TOP8-COMMON.md` first (you may edit the files named below; still never `library/journal/` by hand).
Sources, all on disk: `research-tree/build/TOP8-STATE.md` (what happened, in order, with the live checks);
`research-tree/build/units/T8-*/result.md` (CEIL, COUNT, JOURNAL, BASIS, REPORT, TABLE, REFUTE, FIX);
`research-tree/build/ENFORCEMENT-TABLE.md`; `research-tree/build/refute/TOP8.md`. Cite figures as these files give
them; invent none.

## 1. Records, through the journal tool only
`node tools/journal.mjs` (dry run, then `--append`), prefix t8, file `library/journal/2026-11-24/t8.jsonl`; format and
fields as `library/README.md` says. Write: one fact per hook or tool built (what it refuses, tests, seen live or not,
what it cannot see); the measured facts (a hook can read the context size from the transcript; a settings change
does not reach a call in the same message; the app's helper count replay; the cap scan against r57-0170); the
review and its fixes; the cost of this piece (tokens per unit from the result files and the top session's own,
against the 110 M cap and the 80 M expected); the open items (the non-breaking findings, what stays a written rule
from the table); and one record that closes r57-0532 and names what is next (r57-0531 waits for the owner's word).
Skip any record the fixer already added (it adds t8 measurement records for count-gate numbers): check first.

## 2. Text to place
- `library/README.md`, "How to add records": the text given in `units/T8-JOURNAL/result.md`; and its section "What
  enforces these rules": add the new hooks.
- `library/INDEX.md`: update the line on what is enforced (r57-0151's line in "Facts") by adding a new line after it
  that cites the t8 records; add a "Before you do this" row for "Add a record" (the journal tool) and update the rows
  "Decide how many helpers..." and "Carry on past a large context" to name the hooks; replace the NEXT line (item 0)
  with a line saying r57-0532 is done (cite the closing t8 record) and NEXT is r57-0531 (the owner's word). Keep the
  board's style: one line per claim, the id first.
- `CLAUDE.md` "Where things are": one line naming the new hooks and `research-tree/build/ENFORCEMENT-TABLE.md`.

## 3. The owner's page source
`research-tree/build/page/top8-enforcement.html`: one self-contained light page that reads at about 1870 px, plain
words, no record ids, no unit names, no repository paths, no money (a hook refuses a page that has them).
Order: what is now enforced and what it stops (each check one line, in his words, and whether it was seen working
live); what still cannot be enforced and why (from the table, short); what it cost against the cap; how far along
(this piece done; the next work waits for his word). At most a handful of numbers. Plain titles (owner's notes:
no catchy headings). Also `research-tree/build/TOP8-REPORT.md`: the markdown record behind the page, ids allowed.
Do not publish; the top session publishes.
token limit 4 M (expected about 1.1 M, basis r57-0173)
