# T8-JOURNAL: one journal tool, the guard closed to every other write (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first.

## The rule and how it was broken
The journal (`library/journal/<date>/<prefix>.jsonl`) is only appended to; a correction is a new record; records
follow the format and field order in `library/README.md` (README rule 1, r57-0151, r57-0016). Broken on 2026-11-23:
records were appended by an ad-hoc script that reused ids (t7-0607); three lines were later removed and two had a
field moved through `node -e` in the shell (r57-0055, t7-0800, t7-0801); the record guard saw none of these writes;
field order is checked only at commit (`tools/check-commit.mjs`).

## What exists
`.claude/hooks/record-guard.mjs` (version 2, r57-0164; self-tests `.claude/hooks/selftest.mjs`, 202 cases) on
Write, Edit, MultiEdit, NotebookEdit, AskUserQuestion, Bash and PowerShell; `tools/check-commit.mjs` (19 cases) run
by `tools/git-hooks/pre-commit`; `library/lookup.sh`. Read them and `library/README.md` first.

## What to build
1. `tools/journal.mjs`: the only way to add records. Input: a JSON file or stdin of one or more records without ids
   or with a requested prefix. It assigns the next free id per prefix across all journal files (collision check
   across every date folder), puts the fields in the README's order, validates the record as the commit check does
   (one rule set, shared, not copied twice), prints a dry run by default and appends only with an explicit flag,
   appends atomically to the right date file, and refuses anything that would rewrite or remove a line. A
   correction is a new record that names the one it corrects (as README says).
2. The guard closed: refuse every write to `library/journal/` other than through `node tools/journal.mjs`:
   Write/Edit/MultiEdit/NotebookEdit (already partly); Bash and PowerShell commands that write there by any route
   (redirection, `tee`, `sed -i`, `mv`, `cp`, `rm`, `git checkout`/`restore` of those files, `node -e`/`node -`/
   `node <script>` other than tools/journal.mjs, PowerShell Set-Content/Out-File/Add-Content/Remove-Item, and so on).
   Reads (cat, grep, lookup.sh, head, node tools/journal.mjs --dry-run) still pass. Where a shell command cannot be
   judged safely, decide from the record whether to refuse it (a refusal costs one retry through the tool; a missed
   write breaks the record) and say what remains unseen (for example a script file written elsewhere then run).
3. The commit check backs it: a commit that changes or removes an existing journal line, or adds a line with a
   reused id, is refused (check what it does today and close what is open).
Keep the 202 guard tests and 19 commit-check tests passing; add tests for each new route.
Also give the top session the exact text to put in `library/README.md` "How to add records" (it edits that file).

Files: `tools/journal.mjs`, `tools/journal.test.mjs`, `.claude/hooks/record-guard.mjs` (via a copy),
`.claude/hooks/selftest.mjs`, `tools/check-commit.mjs` and its tests. Limit 18 M tokens.
