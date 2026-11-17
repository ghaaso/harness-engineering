# The library (version 1)

What the harness knows, as records and not as prose. The shape follows "The library" in
`docs/program/HARNESS-V2-DESIGN-2026-11.md` (section 0): a journal that is only ever added to, and a short
board built from it. **This is version 1.** Version 0 (first used 2026-11-18) was replaced as a whole after
recall test 1 (`tests/recall-test-1.md`); git keeps it (`git log -- library`). **From now on the journal is only
added to**: no line is edited or deleted. Version 1 is tested by recall test 2 before the library is filled.

## Where things are

| Path | What |
|---|---|
| `INDEX.md` | The board: one line per current record, `id [status] claim`, a table "before you do X, look up Y", the open tasks in work order, the known gaps. Read this first |
| `GLOSSARY.md` | The words the records use (R57, the tree, tcb, 0b, FX-*, lane, skeleton, the check) |
| `lookup.sh` | `bash library/lookup.sh <id or word>` prints `id | kind | status | claim`; `-f <id>` prints the whole line |
| `journal/<date>/<writer>.jsonl` | The records. One JSON object per line. One file per writer per day, so two writers never write one file |
| `tests/` | Recall tests: questions a new session must answer from the library alone, and what happened |

## Looking something up (records are long lines)

A record is one line of 300 to 1,500 characters. Search tools such as the Grep tool may drop it ("[Omitted long
matching line]"). Use Bash. These work:

- One record: `grep -rh '"id":"r57-0103"' library/journal` (the whole line), or `bash library/lookup.sh r57-0103`.
- By word: `bash library/lookup.sh hook`, or `grep -rhi 'hook' library/journal | cut -c1-400`. The fields come in an
  order that keeps `id`, `kind`, `status` and the start of `claim` inside the first 400 characters.
- All ids: `grep -rho '"id":"[^"]*"' library/journal | sort`.
- If the library has nothing, say "not recorded". Do not answer from memory. The board's section "Known gaps" lists what is known not to be here.

## A record

One line of JSON. Fields come in this order; a field that is empty is left out. A record must be understood alone.

| Field | Meaning |
|---|---|
| `id` | Writer prefix and a number, for example `r57-0103`. Never reused |
| `kind` | `ruling` (the owner said so), `fact` (true of this project or this PC), `status` (how far a document or method was ever tested), `result` (a published result), `hypothesis` (a design or guess not yet tested), `open` (a task not done), `mistake` (something done wrong, with the situation it happens in), `pointer` (where something is), `adjudication` (the top session's decision between two records) |
| `status` | How it is known: `owner`, `measured` (a run or count here), `observed` (seen once here), `quoted` (exact words read in the source), `summary` (read only as a summary), `textbook` (standard knowledge, not fetched), `reasoned` (an inference), `designed-only` (written, never run), `open` |
| `claim` | One sentence, as short as it can be. Numbers carry their unit and condition. A caveat that changes how a figure may be used (what it counts, how many runs, what was not tested) is inside the claim |
| `when` | The situation in which a session must recall this. On rulings and mistakes |
| `quote` | The owner's own words, for a ruling. Never altered |
| `evidence` | Sources only: a path in this repository with a section or line, a commit, or a URL. `E:` stands for `docs/program/evidence/harness-method-status-2026-11-18/`. Never another record |
| `see` | Other records this one depends on or answers with |
| `note` | A short doubt the writer could not settle, or what an earlier version got wrong |
| `handles` | Words a later session would search for |
| `footprint` | Files whose change makes the record doubtful. A record goes stale by a change to these, never by age. Nothing checks it yet |
| `supersedes` | Ids this record replaces |
| `date`, `by` | When it became true, and which session wrote it |

Id ranges by kind (the number is four digits): rulings 0001 to 0099, facts 0100 to 0199, statuses 0200 to 0299,
results 0300 to 0399, hypotheses 0400 to 0499, open tasks 0500 to 0599, mistakes 0600 to 0699, pointers 0700 to
0799, adjudications 0800 to 0899.

## Rules

1. The journal is only added to. A line is never edited or deleted.
2. A correction is a new record whose `supersedes` names the old one. The old line stays and `INDEX.md` stops listing it.
3. When a child session's finding contradicts a record, it writes its finding as a `result` or `fact` and adds a record of kind `open` whose claim begins "proposed correction of <id>". The top session decides and writes an `adjudication`. Nobody else supersedes another writer's record.
4. A record is written when the thing becomes true, by whoever found it, with its evidence.
5. A `summary` or `textbook` figure is never used for a decision. Read the source and write a `quoted` record.
6. `evidence` names sources, `see` names records. A record that only points at a document must copy the answer in or say "the library does not hold this".

## A new writer: prefix, file, number

- Prefix: a short name for your session or task, lowercase letters and digits, not already a file name in `journal/` (`ls library/journal/*`). Use it for every id you write.
- File: `journal/<date>/<prefix>.jsonl`, created by you, written only by you.
- Number: the next free number in the range of the kind, among your own ids: `grep -rho '"id":"<prefix>-01[0-9]*"' library/journal | sort | tail -1`. A second prefix may reuse a number; ids stay distinct because the prefix differs.
- Top session or child: the top session is the one the owner talks to. A session started by another session from a brief is a child. If unsure, you are a child.

## Worked examples (invented: prefix `demo`, not in the journal)

A record that supersedes another. The writer of `r57-0103` repeats the suite run and gets a different time:

    {"id":"r57-0160","kind":"fact","status":"measured","claim":"One run of the tree's suite took 410 s with one file at a time (the 596 s of r57-0103 had other programs running).","evidence":["E:probe-suite-memory.md#Figures"],"see":["r57-0103"],"supersedes":["r57-0103"],"date":"2026-11-20","by":"r57"}

A proposed correction. A child (`demo`) finds that a published figure is misquoted; it may not supersede, so it writes:

    {"id":"demo-0301","kind":"result","status":"quoted","claim":"Brun and others: the 1 % and 6 % are shares of all merges, not of clean merges.","evidence":["E:concurrency-lit-5-integration.md#line 183"],"date":"2026-11-20","by":"demo"}
    {"id":"demo-0501","kind":"open","status":"open","claim":"proposed correction of r57-0305: it reads 1 % and 6 % as shares of clean merges","see":["r57-0305","demo-0301"],"date":"2026-11-20","by":"demo"}

An adjudication. The top session reads both, decides, and supersedes by its own new record:

    {"id":"r57-0801","kind":"adjudication","status":"reasoned","claim":"demo-0501 is right: the paper counts the 1 % and 6 % over all merges; r57-0305 is replaced by r57-0170.","evidence":["E:concurrency-lit-5-integration.md#line 183"],"see":["demo-0501","demo-0301","r57-0305","r57-0170"],"date":"2026-11-20","by":"r57"}

## The board

`INDEX.md` lists only records that are not superseded, at most 150 lines. The top session rebuilds it by hand
when it ends a session in which records were added, and when it has collected the files of its child sessions;
a child session never edits it. A recall test starts from a freshly rebuilt board. Check after a rebuild: every
id in `journal/` is on the board or is named in a `supersedes` field.

## Not done yet

No script builds the board; `lookup.sh` only reads. Nothing compares a `footprint` with the files. Records for
most measured facts and published results are still only in the evidence files (open task r57-0501).
