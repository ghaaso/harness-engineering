# Notes behind rules.json (session monitor round 3, 2026-11-24)

The rules file has 98 rules and 12 enforcers. 26 rules restate another rule and carry `same`, so 72 are distinct.
By what enforces them, all 98 / distinct 72: hook 34 / 20, both (a hook and the commit check) 6 / 4, setting 1 / 1,
script alone 0 / 0, none 57 / 47. No rule is `whole: true`. Every enforced rule has breaks that get through, and
`cannotSee` names them.

## What was read
- `CLAUDE.md`. The board `library/INDEX.md`: the look-up table (lines 5-47, 40 rows) and the rulings (48-66).
  `library/README.md`: rule 1, and "What enforces these rules" (115-144).
- `research-tree/build/ENFORCEMENT-TABLE.md`, all of it.
- `.claude/settings.json` (the working copy; it differs from HEAD only by `skillListingMaxDescChars`, so every hook
  entry is committed). There is no `.claude/settings.local.json`. The user settings file has no hooks.
- The code of every hook, read in full or around each log, exit and refusal: library-start, tier-hook,
  record-guard (header, the journal, evidence and question paths, main), plan-gate (main and gates), window-ceiling
  (decision and hand-over calls), count-gate (main), fanout-gate (main, meter and cap), owner-report (patterns and
  main), journal-watch. Also `tier-routes.json`, `.claude/hooks/README.md`, `tools/check-commit.mjs`,
  `tools/git-hooks/pre-commit`, `tools/journal.mjs` (header and log), `tools/journal-rules.mjs` (record rules),
  `tools/ensure-tier-hook.sh` and `research-tree/build/WIDTHS.md` (no declaration in force).
- Records looked up with `lookup.sh -f`: r57-0001 to r57-0056, r57-0108, r57-0518, t8-0107 to t8-0117.
- The last line of each `.claude/logs/*.jsonl`, counts of the decisions in each log, and the first line's time.
- `docs/program/pipeline-diagram/build/content.mjs` for pipelines and steps. Each step id is checked against the
  number of cards there.

**The commit check is switched on in this clone.** `git config core.hooksPath` gives the absolute path of
`tools/git-hooks`. I made no commit, so I did not see it run.

## How the fields were set
- `by: hook` only where I read the line that refuses and the hook is wired in `.claude/settings.json`.
  `by: script` (or the script half of `both`) means `tools/check-commit.mjs`, which the switched-on pre-commit hook
  runs.
- The journal tool (`script:journal`) never makes a rule `script` on its own, because nothing calls it
  automatically. Its checks bind only because the record guard leaves it as the only route and the commit check
  repeats them.
- `by: setting` is a value I added for r57-0036 (skillOverrides and permissions.deny). The page should show it as
  "refused", but there is no log, and I did not see the app refuse such a call.
- `reminder: true` means the start hook puts the rule's text in front of the session. That covers all 40 board rows
  (the hook injects the whole look-up table), and the rules its fixed lines name: evidence, journal, tier routes, no
  design questions, and reading the board. A rule that is only in CLAUDE.md is `reminder: false`, because the app
  loads that file and no hook does. `carriedBy: doc:claude-md` says this.
- `same` points to the rule it restates. The order of preference is CLAUDE.md, then README, then the board, then
  rulings. Count a square once per distinct rule.
- Fields I added to the brief's shape:
  - enforcers: `reads`, `logSessionChars` (8, or 36 for the full id), `logAgentField`, `logsTools` (a regex for the
    tool calls that always get a line), `logsEvents`, `logsExcept`, `firstLog`, and `via`/`switchedOn` on the commit
    check.
  - `acts` values: `reports` (journal watch: it runs after the call and cannot undo it) and `route` (journal tool).
- New ids: `doc:library-readme` = `library/README.md`; `store:journal` = `library/journal/` (where the rulings
  themselves are stated).
- For the snapshot (`hk`), use only enforcers with `logsEveryCheck: true`. Count as expected only the calls that
  match `logsTools`, and apply `logsExcept`:
  - The tier hook's matcher is `*`, but it logs only Agent, Task and start_session.
  - The count gate logs a SendMessage only when that message would revive a helper.
  - Owner-report logs an Artifact call only when it publishes. About 1,925 of its 2,003 lines have `session: null`.
    My guess is that these come from the replays and tests of 2026-11-24 (t8-0112); skip them.
  - library-start logs every start, but its lines have no session field.
- Session field names as the code writes them, each checked against a real line: `session` (8 characters) for
  tier-hook, record-guard, window-ceiling, fanout-gate and owner-report; `sess` (8) for plan-gate; `sess` (the full
  id) for count-gate; none for library-start. Journal-watch writes `session` (8) in its code, but it has never
  written a log line, so I could not confirm the field. The commit check writes no log. The journal tool logs to
  `.git/journal-tool.log`, with no session field.

## Where the table and the code disagree
The table was written before five hooks were built that day. Where the code says otherwise, rules.json follows the
code.
1. **Record guard and the journal.** The table says the guard allows shell appends to the journal (`>>`, `tee -a`,
   Add-Content). Version 3 of the guard refuses every write under `library/journal/` except through the journal tool
   (record-guard.mjs:10-20, 274, 323). Appends are included, and so is a command that names the journal and writes to
   a path the guard cannot read (262-264).
2. **Rules the table marks "written" or "being built" that a hook now refuses in part:**
   - rule 5, reading the meter before a fan-out (fanout-gate.mjs:207-213);
   - rule 5, the cap (fanout-gate.mjs:300-301, 319-325);
   - rule 5, the coordinator's window, and the board row "Carry on past a large context" (window-ceiling.mjs:360-367);
   - "How many at once" and r57-0032 (count-gate.mjs:164-177);
   - "Set a limit", r57-0002 and r57-0038 (fanout-gate.mjs:290-299);
   - "Pace a refilling window" and "two or more windows", through the meter lines (fanout-gate.mjs:215-220);
   - rule 6, r57-0003, r57-0017 and r57-0029 (owner-report.mjs:100-101, 229-288);
   - the journal rows (T8-JOURNAL is built: t8-0113).
3. **r57-0019 and "Write a skill".** The table says these are enforced by the settings. The settings only switch the
   13 archived skills off and deny the 12 archived agents. Nothing refuses a new skill or an edit to an always-loaded
   file, so both are marked `none`. The settings do enforce r57-0036.
4. **r57-0010, the design-document row, and r57-0031.** The table credits the commit check. The check requires id,
   kind, status and claim on a journal record (journal-rules.mjs:59-61). It does not see a rule taken from a design
   document, and it does not require a source (evidence is optional). These are marked `none`. Structured records
   (r57-0016, "Save a finding") stay `both`.
5. **The tier hook and agent definitions.** The table says the hook cannot see a model passed through an agent
   definition only (r57-0108). The code refuses any helper start without an explicit model (tier-hook.mjs:73-76),
   so a model set only in the definition is refused, not missed.
6. **"Fix the order of writes" and "Which unit starts next".** The table credits the plan gate. The gate holds starts
   only to the dependency order of one plan, the finished build of 2026-11-19 (plan-gate.mjs:68, 129-132). It does
   not check how an order is chosen, so both are marked `none`.
7. **The hooks path.** `CLAUDE.md:56` and `library/README.md:123` both say `git config core.hooksPath tools/git-hooks`,
   a relative path. The pre-commit header (lines 2-5) says it must be the absolute path, or a worktree cut from an old
   base has no copy of the hook. This clone uses the absolute path.
8. **The start hook's own text is out of date.** Its fixed text (library-start.mjs:28) still names only the tier
   hook, the record guard and the commit check, not the five hooks built later. README lines 120-122 still describe
   record guard version 2 ("a write that is not a pure append"); lines 132-133 correct this.
9. **The map's guards box.** It says "Not tested: whether the hooks run inside helpers". The window-ceiling log (813 lines)
   and the tier log (472 lines) hold lines with helper ids, so PreToolUse hooks do run inside helpers of sessions in
   this repository. This is observed, not tested. The fan-out log has none yet.

## Rulings left out (one-off approvals, past runs or later tasks)
- r57-0022: the library test, which has been done.
- r57-0023: a later study.
- r57-0037 and r57-0039: the build of 2026-11-19.
- r57-0043 to r57-0055: one-time approvals and caps. r57-0050 to r57-0052 are held by the research run's own gate in
  its folder outside this repository, which I did not read.
- r57-0055: a one-time removal.

## Placement on the map (my judgment, from the step texts)
- Evidence (rule 1) is in G.0, because evidence is the record of measurements. The journal rules are in B3.1.
- Reports to the owner are in S3.3 ("Report"), because the map has no owner-report step.
- Model routes are in S2.2. Starts by plan or folder are in S2.3.
- The meter reading and the cap are in S1.1, where the map lists "Check token usage and agree a cap".
- The window rules are in E.2. Limits and concurrency are in D.
- r57-0020 has no fitting step (S3, step null).

## Not settled
- Whether the app really refuses the denied FixFlow agents and the skills that are switched off. Nothing logs it.
- Whether the pre-commit hook runs on this machine's git. I did not exercise it (t8-0113 reports the check's tests
  pass).
- Whether helpers started by a Workflow script pass through Agent-matched hooks. This was not probed.
- A session started in a worktree reads that worktree's committed settings. A worktree cut before 2026-11-24 would
  lack the five new hooks. I inferred this and did not check it per worktree; the snapshot's per-folder test handles
  it.
- Every hook fails open on a crash or a timeout. No settings entry sets a timeout (still open in r57-0518), and the
  manifest files are still unprotected.
- **Publishing the page.** rules.json is about 65 KB, and its `id`/`source`/`evidence`/`sources` fields hold record ids
  and paths. If the page is ever published through Artifact, owner-report scans data files for ids anywhere
  (owner-report.mjs:120-121) and would refuse it. Keep the page a local file, or drop those fields from the inlined
  copy. `text`, `trigger` and `cannotSee` carry no record ids or paths; a script checked this.
