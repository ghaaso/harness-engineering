# T8-JOURNAL result (top session 8, 2026-11-24; ruling r57-0056)

## What was built
- `tools/journal.mjs`: the one way to add records. Records as JSON (array, one object, or one per line; file or stdin),
  without ids or with only a prefix. It gives each the next free number in its kind's range, one above every number of
  that prefix in every date folder, git's index and HEAD, and every number it ever issued (so a lost line's id is never
  given again: t7-0607). `{#n}` names the n-th record of the same input. Fills `date` (today) and `by` (the prefix), puts
  fields in the README order, checks every record by the commit check's rules, prints a dry run by default, appends only
  with `--append`, under a lock, opening the file for appending only, keeping its line end (18 files are CRLF). Refuses
  to append to a file changed outside it. `--check` (read-only) and `--adopt <file> [--apply]` (once, for lines written
  before the tool existed; refuses a changed committed or tool-written line and any invalid record).
- `tools/journal-rules.mjs`: the one rule set (shared by the tool, the commit check and the watch) and the seal: in the
  git common folder, `journal-seal.json` (issued ids, a hash of every line the tool wrote, per checkout the state it
  last wrote, the lines added since HEAD, sizes and times last seen), `journal-seal.d/` (a copy of each file's last good
  state), `journal-tool.log`.
- `.claude/hooks/record-guard.mjs` version 3 (replaced in one step after 245 of 245): every write under
  `library/journal/` other than `node tools/journal.mjs` is refused, appends and new files included (Write, Edit,
  MultiEdit, NotebookEdit, `>>`, `tee -a`, `touch`, `cp`/`mv` into it, `sed -i`, `node -e`/`node -`/`python -c` file
  calls, commands run from inline code, `Add-Content`, `Out-File -Append`, `New-Item`), and so is a write to the seal.
  A command that names the journal and writes to a path the guard cannot read (`$f` of a loop, `$(...)`, a path computed
  in inline code, a PowerShell variable set from a command) is refused: one retry through the tool is cheaper than a
  broken record. Script files (`node x.mjs`, `bash x.sh`, `powershell -File`) are read and their literal paths judged.
  `git revert` and `git reset <commit>` that would take journal lines out are refused (git runs no commit check for
  them: tested, revert and cherry-pick skip pre-commit).
- `.claude/hooks/journal-watch.mjs` (new, PostToolUse on Bash and PowerShell): right after each shell call, every
  journal file must be in the state the tool last wrote, or HEAD's; otherwise it tells the session once (exit 2) what
  changed, with ids, and where the last good copy is. Catches what the guard cannot read (a script that computes its
  path). Fast path one stat per file: median 38 ms a call, node start included (5 runs).
- `tools/check-commit.mjs` version 3: rules from `journal-rules.mjs`; ids read by JSON (a leading space no longer hides a
  reused id); new: an added line the tool did not write (or adopt) is refused (a hand append, or a field moved after:
  t7-0801); a line the tool appended since HEAD that is gone is refused (t7-0800).

## Tests (run once at the end)
- `node .claude/hooks/selftest.mjs`: 245 of 245 (was 202; 43 new T8 cases; 9 old cases that expected an append to pass
  now expect a refusal by design). The old guard on the new suite: 207 pass, 38 fail.
- `node tools/journal.test.mjs`: 22 of 22 (tool and commit rules in real repositories, two appends at once included).
- `node .claude/hooks/journal-watch.test.mjs`: 12 of 12.
- `node research-tree/build/units/P0/check-commit.test.mjs`: 20 of 20 (19 old ones; the two hand appends now go through
  the tool, plus one case: a hand append is refused). The old check on it: 17 pass, 3 fail.
- Measured: the tool's dry run 257 ms on the real journal (4,316 records); the lock's 60 s stale limit and the watch's
  3 s wait are far above that.

## What it cannot see
A script file that computes its path: not refused before; the watch reports it right after (it cannot undo; the last
good copy is kept). A path in a variable, in a command that does not name the journal (same: the watch). Merges,
cherry-picks and rebases: git runs no commit check; the watch accepts what equals HEAD. `git commit --no-verify`, a
change of the seal by a program, the watch's fast path if a writer restores a file's size and time. Two worktrees
committing the same new id: ids are issued from one seal shared by all worktrees of the clone, so only another clone.

## Before wiring (the top session)
1. Adopt the three lines written today before the tool existed (r57-0056, r57-0532, t7-0608; the dry run passes):
   `node tools/journal.mjs --adopt library/journal/2026-11-23/r57.jsonl library/journal/2026-11-23/t7.jsonl --apply`.
   Without it the watch reports both files and the commit check refuses them.
2. Add to `.claude/settings.json` and `library/.claude/settings.json`, in "hooks", "PostToolUse":
   `{ "matcher": "Bash|PowerShell", "hooks": [ { "type": "command", "command": "node \"C:/Users/User/Documents/projects/harness-engineering/.claude/hooks/journal-watch.mjs\"" } ] }`
   (library/.claude/settings.json has no "PostToolUse" yet: add `"PostToolUse": [ <that entry> ]`). The record guard's
   entry is unchanged.
3. Seen live: in a fresh session, `echo x >> library/journal/2026-11-23/t7.jsonl` is refused by the guard;
   `node -e "require('fs').appendFileSync(require('path').join('library','journal','x.jsonl'),'x')"` is refused;
   a script file in the scratchpad that appends to a journal file runs, and the next result shows the watch's report;
   a record piped to `node tools/journal.mjs` prints a dry run, then `--append` adds it and nothing is reported.

## Text for library/README.md, "How to add records" (replaces "Number" under "A new writer")
Records are added only through `node tools/journal.mjs`; the record guard refuses every other write under
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
