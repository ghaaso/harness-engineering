# t1 step 5b: brief for the record check (kind run, Sonnet)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root.

Files to check: `library/journal/2026-11-19/x35.jsonl` to `x39.jsonl` and `library/journal/2026-11-19/t1.jsonl`.
Schema: `library/README.md`, sections "A record" and "Rules".

Check every record, with a node script you write in the scratchpad (not in the repository):
1. It parses as JSON; one object per line.
2. Its fields are among the README's and come in the README's order; no empty field.
3. Its id has the file's prefix, is unique, and its number lies in the range of its kind.
4. Every number in `claim` (digits, with commas or a decimal point) stands at the first `evidence` place:
   the cited line of the collect file or report, plus or minus 3 lines. For `t1.jsonl`, the first evidence
   place is the one to check; if it is a paper text, check there.
5. `date` and `by` are present and `by` matches the prefix.

Fix in place only what is mechanical: field order, a JSON error, an `#line N` that is off when the same words
stand at another line (use that line). A record whose number stands nowhere in the cited file: remove it from
the file and list it. Log every change. These files are not yet committed, so a correction now is allowed.

Write `R:t1-check.md`: per file, records checked, passed, fixed (with what), removed (with why). Then one line
of totals. No git command that writes.

Return at most five lines: the totals per file and every removed id.
