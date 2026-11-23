# f{n} record check (kind run, Sonnet, medium)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`;
`F:` = `RUN:fields/{n}-{slug}/`. Description `run: f{n} check`. From round 3's check brief
(`H:docs/program/evidence/round3-2026-11-18/t1-brief-5-check.md`) and `ROUND.md` line 107 (every record, not a sample).

Files: `RUN:journal/2026-11-23/{prefix}.jsonl` and the five extractor files `{x_files}` (`RUN:journal/2026-11-23/x<k>.jsonl`
for each k in that range). Schema: `H:library/README.md`, sections "A record" and "Rules" (kinds, statuses, the id
ranges by kind).

Check every record with a node script you write in `F:work/` (never committed):
1. It parses as JSON; one object per line.
2. Its fields are among the README's, in the README's order (`id, kind, status, claim, when, quote, evidence, see, note,
   handles, footprint, supersedes, date, by`); no empty field; kind and status from the README's lists.
3. Its id has the file's prefix, is unique, and its number lies in the range of its kind.
4. Every number in `claim` (digits, with commas or a decimal point) stands at the first `evidence` place: the cited line
   of the collect file, or for `{prefix}.jsonl` the cited line of the paper text or file, plus or minus 3 lines.
5. `date` and `by` are present and `by` matches the prefix.

Fix in place only what is mechanical: field order, a JSON error, an `#line N` that is off when the same words stand at
another line (use that line). A record whose number stands nowhere in the cited file: remove it and list it. Log every
change. These files are not yet committed, so a correction now is allowed.

Write `F:check.md`: per file, records checked, passed, fixed (with what), removed (with why); then one line of totals.
Then `F:done/check.done` last, one line: `checked <c> passed <p> fixed <f> removed <r>`. No git command that writes.

Limit 4.7 M tokens. Return at most five lines: the totals per file and every removed id.
