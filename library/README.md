# The library (version 1)

What the harness knows, as records and not as prose. The shape follows "The library" in
`docs/program/HARNESS-V2-DESIGN-2026-11.md` (section 0): a journal that is only ever added to, and a short
board built from it. **This is version 1.** Version 0 (first used 2026-11-18) was replaced as a whole after
recall test 1 (`tests/recall-test-1.md`); git keeps it (`git log -- library`). **From now on the journal is only
added to**: no line is edited or deleted. Version 1 is tested by recall test 2 before the library is filled.

## Where things are

| Path | What |
|---|---|
| `INDEX.md` | The board: a table "before you do X, look up Y", one line per current record of the top session (`id [status] claim`), the open tasks in work order, a directory of every journal file, the known gaps. Read this first |
| `GLOSSARY.md` | The words the records use (R57, the tree, tcb, 0b, FX-*, lane, skeleton, the check) |
| `lookup.sh` | `bash library/lookup.sh <id or word>` prints `id | kind | status | claim`; `-f <id>` prints the whole line |
| `journal/<date>/<writer>.jsonl` | The records. One JSON object per line. One file per writer per day, so two writers never write one file |
| `tests/` | Recall tests: questions a new session must answer from the library alone, and what happened |

## Looking something up (records are long lines)

A record is one line of 300 to 1,500 characters. Search tools such as the Grep tool may drop it ("[Omitted long
matching line]"). Use Bash. These work:

- One record: `grep -rh '"id":"r57-0103"' library/journal` (the whole line), or `bash library/lookup.sh r57-0103`.
- By word: `bash library/lookup.sh hook`, or several words, `bash library/lookup.sh lane slots`: a record must hold
  all of them (a quoted phrase counts as one word); if none does, the records holding any one are printed and the
  first line says so. The first line gives the counts; the top session's and its child sessions' records come
  first, the extractor records (`x`) after them. Plain grep also works: `grep -rhi 'hook' library/journal | cut -c1-400`.
  The fields come in an order that keeps `id`, `kind`, `status` and the start of `claim` inside the first 400 characters.
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
3. When a child session's finding contradicts a record, it writes its finding as a `result` or `fact` and adds a record of kind `open` whose claim begins "proposed correction of <id>". The top session decides and writes an `adjudication`. Nobody else supersedes another writer's record. A proposed correction is closed by the adjudication that names it in `see`; the board then lists the adjudication, not the proposal.
4. A record is written when the thing becomes true, by whoever found it, with its evidence.
5. A `summary` or `textbook` figure is never used for a decision. Read the source and write a `quoted` record.
6. `evidence` names sources, `see` names records. A record that only points at a document must copy the answer in or say "the library does not hold this".

## A new writer: prefix, file, number

- Prefix: a short name for your session or task, lowercase letters and digits, not already a file name in `journal/` (`ls library/journal/*`). Use it for every id you write.
- File: `journal/<date>/<prefix>.jsonl`, created by you, written only by you.
- How to add records: records are added only through `node tools/journal.mjs`; the record guard refuses every other write under
  `library/journal/`, and the commit check refuses a line the tool did not write. Write the records as JSON without ids
  (an array, one object, or one per line) and pipe them in or name the file: `node tools/journal.mjs records.json
  --prefix <prefix>` prints what it would add (a dry run); add `--append` to write. The tool gives each record the next
  free number in its kind's range for that prefix, across every date folder and every id it ever issued; fills `date`
  (today) and `by` (the prefix); puts the fields in the order above; and refuses the whole input if one record breaks a
  rule. To name another record of the same input, write `{#n}` (the n-th, from 1), for example `"see": ["{#1}"]`. A
  correction is a new record whose `supersedes` names the old id. The tool never changes or removes a line; if a journal
  file was changed by another route it refuses to append, the journal watch reports it after the call, and putting it
  right needs the owner's word. `node tools/journal.mjs --check` reports whether every journal file is in a state the tool
  wrote. `--adopt <file> --apply` is for lines written before the tool existed (2026-11-24) only.
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

`INDEX.md` lists only records that are not superseded, at most 220 lines (board version 1.2, since research round 3; 200 lines until then). It
lists the top session's records one by one and names every other journal file in its directory "Journal
files", with what the file was written from and what to search it for. Records of a child session or of an
extractor are listed one by one only where the top session's work rests on them; a run of ids may stand as one
line ("o1-0301 to o1-0319"). The top session rebuilds the board by hand when it ends a session in which
records were added, and when it has collected the files of its child sessions; a child session never edits it.
A recall test starts from a freshly rebuilt board. Check after a rebuild: every id of the top session and of
its child sessions is on the board (alone or inside a run), or is named in a `supersedes` field, or is a
proposed correction closed by an adjudication; every other journal file is in the directory; no superseded id
is on the board except in the line of the adjudication that replaced it.

Records whose id begins with `x` come from fill 1: one small-model reader per evidence file, each record
checked by a script (its numbers and words stand at the place it cites), 29 % also read by hand. Before a
decision rests on one, read the place it cites (r57-0130).

## What enforces these rules (since 2026-11-19, r57-0151)

- `.claude/hooks/library-start.mjs` (SessionStart): every start, resume, clear and compaction of a session started at
  the repository root or in `library/` gets the board's look-up table and its NEXT task, cut from `INDEX.md` at that
  moment, and is told to read the board.
- `.claude/hooks/record-guard.mjs` (PreToolUse): refuses a Write or Edit of a journal file that is not a pure append
  (rule 1), an edit or overwrite of archived evidence, and a question to the owner that does not start "approve:",
  "cap:" or "fact:" (r57-0001).
- `tools/check-commit.mjs` (git pre-commit, `git config core.hooksPath tools/git-hooks`, a local setting each clone
  repeats): refuses a commit that changes or drops a journal line, adds a line that is not a valid record (fields in
  the order above, kind and status from the lists above, an id not used before and in its writer's own file), or
  changes archived evidence. It catches what the hook cannot see: writes made through shell commands.
- `node .claude/hooks/selftest.mjs` runs the hooks' self-tests. Blind spots: a question typed as plain text, a
  mislabelled question, and `git commit --no-verify`.

Added 2026-11-24 (top session 8, r57-0056; records t8-0107 to t8-0117; every rule with what enforces it and what it
cannot see: `research-tree/build/ENFORCEMENT-TABLE.md`). Each hook has a test file beside it, run with `node <file>`.
- `tools/journal.mjs`, `tools/journal-rules.mjs`: the only way to add records (above). The record guard is version 3:
  every other write under `library/journal/` is refused. `.claude/hooks/journal-watch.mjs` (PostToolUse on Bash and
  PowerShell) reports a journal file changed by another route; `tools/check-commit.mjs` version 3 refuses a line the
  tool did not write.
- `.claude/hooks/window-ceiling.mjs` (PreToolUse, every tool): a notice and then a refusal of every call but the
  hand-over ones once a session's context passes its line, read from the transcript (r57-0008, r57-0604).
- `.claude/hooks/count-gate.mjs` (PreToolUse on Agent, Task, SendMessage): refuses a helper start past the app's limit
  of 20 or a width declared in `research-tree/build/WIDTHS.md` (r57-0414).
- `.claude/hooks/fanout-gate.mjs` (PreToolUse on Agent, Task): refuses a start whose token limit has no measured basis,
  whose limits sum past the cap, or that follows no meter reading in an earlier message (r57-0038, r57-0614, r57-0615).
- `.claude/hooks/owner-report.mjs` (PreToolUse on wrap_up and Artifact, PostToolUse on wrap_up, Stop): refuses record
  ids, unit names, repository paths and money in what reaches the owner (r57-0017, r57-0027).

## Not done yet

No script builds the board; `lookup.sh` only reads. Nothing compares a `footprint` with the files. 1,791 of the
2,524 extractor records were checked by script only (r57-0130). Recall test 3 ran on the filled library
(`tests/recall-test-3.md`, r57-0132); its changes to the board and to `lookup.sh` are in, and no test has run
since them.
