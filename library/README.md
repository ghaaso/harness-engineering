# The library

What the harness knows, as records and not as prose. First real use: 2026-11-18. The shape follows
"The library" in `docs/program/HARNESS-V2-DESIGN-2026-11.md` (section 0): a journal that is only ever
added to, and a short board built from it. That design was never built or tested before this. This is
its first trial, and the format is version 0: it is tested by a recall test (`tests/`) before it is relied on.

## Where things are

| Path | What |
|---|---|
| `INDEX.md` | The board: what is true now, by topic, one line per record, and a table "before you do X, look up Y". Read this first. It is short on purpose |
| `journal/<date>/<writer>.jsonl` | The records. One JSON object per line. One file per writer per day, so two writers never write the same file |
| `tests/` | Recall tests: questions a new session must be able to answer from the library alone, and what happened |

## A record

One line of JSON with these fields. A record must be understood without any other record.

| Field | Meaning |
|---|---|
| `id` | Writer prefix and a number, for example `r57-0103`. Never reused |
| `kind` | `ruling` (the owner said so), `fact` (true of this project or this PC), `status` (how far a document or method was ever tested), `result` (a published result), `hypothesis` (a design or a guess not yet tested), `open` (a task not done), `mistake` (something done wrong, with the situation it happens in), `pointer` (where something is), `adjudication` (the top session's decision between two records) |
| `claim` | One sentence. Numbers carry their unit and their condition |
| `when` | The situation in which a session must recall this. Present on rulings and mistakes |
| `quote` | The owner's own words, for a ruling |
| `status` | How it is known: `owner`, `measured` (a run or a count here), `observed` (seen once here), `quoted` (exact words read in the source), `summary` (read only as a summary), `textbook` (stated from standard knowledge, not fetched), `reasoned` (an inference), `designed-only` (written, never run), `open` |
| `evidence` | Where to check it: a path in this repository with a section or line, a commit, or a URL. `E:` stands for `docs/program/evidence/harness-method-status-2026-11-18/` |
| `handles` | Words a later session would search for |
| `footprint` | Files whose change makes the record doubtful. A record goes stale by a change to these, never by age |
| `supersedes` | Ids this record replaces |
| `date`, `by` | When it became true, and which session wrote it |

## Rules

1. The journal is only added to. A line is never edited or deleted.
2. A correction is a new record whose `supersedes` names the old one. The old line stays.
3. When a child session's finding contradicts a record, it writes its finding as a record with `kind`
   `result` or `fact` and adds a record of kind `open` named "proposed correction of <id>". The top session
   decides and writes an `adjudication`. Nobody else supersedes another writer's record.
4. A record is written at the moment the thing becomes true, by whoever found it, with its evidence.
5. A `summary` or `textbook` figure is never used for a decision. Read the source and write a `quoted` record.
6. `INDEX.md` lists only records that are not superseded. It is rebuilt when records are added.

## Looking something up

- Read `INDEX.md`. It gives the id and one line for every current record, by topic.
- For the full record: `grep -rh '"id":"r57-0103"' library/journal`.
- By word: `grep -rhi 'hook' library/journal | cut -c1-400`.
- If the library has nothing, say "not recorded". Do not answer from memory.

## Not done yet

No script builds the board or checks the records; both were written by hand. No lookup is counted.
Records for most measured facts and published results are still only in the evidence files they point to.
