# audit.mjs: spec

Source of truth: `CONTRACT.md` (§1, §2.1, §3.5, §3.6, §3.7 `audit`/`check`, §3.20, §3.21, §4.8, §5 row U4a, §6).
Design: R22, R27, R29, R30, R34, R50, R54 (refuses an analysis that read the full design), R21, R40, R58;
sections 9 (P2, P5, P13, N16) and 13. Items marked **needs-app** are written and skipped (CONTRACT §7).

## Purpose
After a step, from the transcripts of the session and its helpers (the harness writes them, no session does),
decide mechanically: did the session read anything it did not declare (label `clean` or `tainted`, R22/R27); did
it write into a protected path (exit 3, R29); what did it search and fetch (R34 log, discovered fetch addresses);
did it leave any note but `TURN-END <field>` (R30); how large was its first call (R22); did it break its role
profile or send a project term to the web. A second mode audits the coordinator's own transcript (turns above
1.5 W*, R50). No script reads a note's text to decide anything else (contract §6).

## Command line
```
node audit.mjs --root R --ce N --task <id> --epoch <e> [--now iso] [--dry-run]
node audit.mjs --root R --ce N --coordinator --session <id> [--now iso] [--dry-run]
```
Exactly one of the two forms (both or neither -> 66). `--ce` is required (it writes under `run/`); `--epoch` is
compared with the row inside the lock (65). Thresholds are read from `<root>/tcb/thresholds.json`, never a flag.

## Reads
`run/tasks.json` (row, `lib.attemptOf(row, epoch)`: `folder`, `session`, `manifest`); the manifest `m_*` (`getObject`:
inputs, agents, user_files); `tcb/profiles/<role>.json` (and `tcb/profiles/coordinator.json` for the coordinator form);
`tcb/denylist.txt` (format below); transcripts via `sessionTranscripts` + `parseTranscript` under threshold
`transcripts_root` (parsed before the lock, CONTRACT §2.1); `F/in/must_read.json` (the URL list, for `fetch:
witnessed`, as guard-hook reads it); thresholds `tcb_paths_protected`, `lean_baseline_tokens`, `lean_tolerance_tokens`
(both null until measured), `W_star_coord`, `coord_over_factor` (1.5).

## Writes
`run/audit/<task>-e<e>.json` and `run/audit/search-<task>-e<e>.jsonl` (writeAtomic); coordinator form:
`run/audit/coordinator-ce<ce>.json` (CONTRACT §2.1). Task form: one `audit` line {label, undeclared[],
protected_writes[], first_context, notes_bad} and one `check` line (check `audit`, subject `<task>-e<e>`, result
pass|fail|not_run, reasons). Coordinator form: one `check` line (subject `coordinator-ce<ce>`), no `audit` line.
Under `run.lock`, `--ce` inside it. On exit 3 the audit file and the lines are still written, plus the §1.4 tamper
`incident` line. `tcb/denylist.txt` (the owner's file; this script defines and reads it): UTF-8 (a leading BOM is
stripped), one term per line (CRLF or LF), blank lines and lines starting `#` ignored, terms matched as case-folded
substrings.

## Steps (task form)
1. Row exists (`no-task` 1); `--epoch` = row epoch (65); `attemptOf(row, epoch).session` and the manifest exist, else 2
   `no-session` / `missing`; transcripts found (`transcript-not-found` 2); a transcript with bytes but no parsed
   record and `badLines` > 0 -> 2 `format-unknown`.
2. Allowed read roots, from the attempt folder `F = wt/<task>-e<e>/`: `F/in/` entries listed in the manifest
   `inputs` (plus `brief.md`, `manifest.json`), `F/staging/`, `F/view/`, `F/.claude/agents/<type>.md` of the manifest
   `agents`, each manifest `user_files` path, and the
   profile's `read_prefixes` rendered with `{root}`, `{attempt}`, `{batch}`. Relative paths resolve against `F`;
   comparison through lib `isUnder` (case, slashes, junctions). Reads = every tool use of kind `read` in the main and
   helper transcripts (Read, Glob, Grep with their `path`, default `.` = `F`); a directory is allowed when it is
   an allowed root or under one. Everything else is `undeclared` (sorted, unique, root-relative where possible).
3. Protected writes: every `write` access (Write, Edit, MultiEdit, NotebookEdit) whose resolved path is under
   `<root>/` + a prefix of `tcb_paths_protected` (`tcb/`, `sealed/`, `review-in/`, `.claude/`, `run/`, `store/`,
   `.git/`), or under `F/staging/harvested/` (harvest's, §8.7), or has a path segment whose `lib.segmentName` is
   `.claude` anywhere, or a last segment whose `segmentName` is `claude.md` or `claude.local.md` (R29). Listed in
   `protected_writes`.
4. Search log: one JSONL line per WebSearch / WebFetch tool use of main and helpers, in transcript order:
   `{n, ts, tool, source: "main"|<helper file name>, query?, url?, is_error, result_chars, result_urls, truncated,
   repeatable:false}`; results come from the paired tool result (first 2,000 characters only: `result_urls` counts
   distinct http(s) addresses in that text, `truncated` is true at 2,000). `discovered_urls` = sorted unique fetch
   addresses (S11 discovered inputs).
5. Denylist: terms vs the search `query`, fetch `url` and WebFetch `prompt`; hits `{term, tool_use_id, tool, where}`.
6. Profile check (reading, not an exit cause): tool not in `tools_allow` or in `tools_deny`, write outside
   `write_prefixes`, Agent type not in `agent_types`, any fetch when `fetch: none`, a fetch URL whose `href` is not in
   `F/in/must_read.json` when `fetch: witnessed`, any Bash/PowerShell when `bash: none`, a command not starting
   `node tcb/scripts/` when `bash: tcb-node` -> `out_of_profile: [{tool_use_id, kind, detail}]`.
7. Notes (R30): from `parsed.turnEnds` of the main transcript (CONTRACT §4.8), a turn end is bad when the last
   non-blank line of its text is not exactly `TURN-END <field>`, or `TURN-END <task>` for a design-check role (whose
   `field` is null); `notes_bad` = their count (flag only, never the label).
8. First-call context: `context` of the first call of the main transcript. Flag `first_context_over` only when
   `lean_baseline_tokens` and `lean_tolerance_tokens` are both non-null gates and `first_context >
   baseline + tolerance`; else it is a reading (`over: null`). A task of role `control` records and never flags.
9. Label: `tainted` iff `undeclared` is non-empty, or there are denylist hits, or `first_context_over` is true; else
   `clean`. Write the audit file `{schema_version, task, epoch, session, label, undeclared, protected_writes,
   denylist_hits, out_of_profile, notes_bad, first_context, first_context_over, discovered_urls, n_search, n_fetch,
   transcripts: {main, helpers[]}, at}`; the search log; the lines.

## Steps (coordinator form)
`--session` -> `sessionTranscripts`. Protected writes as in 3 (exit 3); every call whose `context > coord_over_factor *
W_star_coord` (1.5 x 133,200 = 199,800) goes to `calls_over: [{id, ts, context}]` (a turn here is one model call);
`peak_context`; reads of `wt/*/staging/` (untrusted) as `udi_reads`; Bash not `node tcb/scripts/` as `out_of_profile`.
File `run/audit/coordinator-ce<ce>.json`. Exit 1 `over-window` only if `W_star_coord` is a gate and `calls_over` is non-empty.

## Exit codes
0 clean (task) / within window (coordinator); 1 tainted, with code `tainted` (reads, denylist, first context) or
`over-window`; 1 also `no-task`; 2 a missing session, manifest, transcript or profile, and `format-unknown`;
3 `protected-write` (wins over 1); 64 stale ce; 65 stale epoch; 66 usage; 67 table corrupt; 70; 75 busy lock.

## Behaviours
- T1 Clean attempt: transcript reads only `in/brief.md`, a manifest input and a file in `staging/`, writes in
  `staging/` -> exit 0, label `clean`, `undeclared: []`, audit file and `audit` line `{label:"clean", ...}`, `check` pass.
- T2 A Read of `<root>/store/objects/x` or of the repository root's `CLAUDE.md` -> exit 1 `tainted`, that path in `undeclared`.
- T3 An `in/` file not listed in the manifest is undeclared; the same file listed is declared; `brief.md` is always declared.
- T4 A Read through a different case or slash style of an allowed path is allowed; a path with `..` leaving the attempt
  is undeclared; a junction inside `in/` pointing outside is undeclared (skip where junctions cannot be made).
- T5 A helper transcript's read outside the roots taints the session; a helper's read of an allowed root does not.
- T6 Glob/Grep without `path` counts as `F` (allowed); with `path: <root>/run` it is undeclared.
- T7 A Write to `<root>/tcb/scripts/x.mjs`, `<root>/sealed/a`, `<root>/review-in/t/a`, `<root>/run/tasks.json`,
  `<root>/store/a`, `<root>/.git/config`, `F/staging/harvested/x.json`, `wt/<task>-e<e>/.claude/settings.json`,
  `F/staging/.Claude./x` or `F/staging/CLAUDE.md.` -> exit 3 `protected-write`, each path in `protected_writes`,
  label `tainted`, audit file, lines and a tamper `incident` line still written; a Write in `staging/` is not listed.
- T8 Search log: two WebSearch and one WebFetch (one tool result with 2 URLs) -> 3 lines in order with `repeatable:false`,
  `result_urls` 2 for that result, `truncated` true for a 2,000-character result; `discovered_urls` holds the fetch URL.
- T9 Denylist hit: query containing a listed term in other case -> label `tainted`, `denylist_hits` has it, exit 1;
  comment and blank lines in the file are ignored; a missing `denylist.txt` is an empty list; a file saved with a BOM
  and CRLF line ends matches its first term (the BOM is not part of it).
- T10 Notes: turn ends `TURN-END f1`, `done` and `all fine\nTURN-END f1` -> `notes_bad` 1; with field `f2` expected, 3.
  `notes_bad` > 0 does not change the label or exit. A `stpa` row (field null) whose turns end `TURN-END <its task>`
  -> `notes_bad` 0.
- T11 First context: baseline 1,000 and tolerance 500 (both gates), first call context 1,800 -> `first_context_over`
  true, `tainted`; 1,400 -> clean; baseline `null` -> `over: null`, never a taint, `first_context` still recorded.
- T12 Profile reading: a Bash call under `bash: none`, an Agent of another type, a fetch under `fetch: none` appear in
  `out_of_profile` and do not change exit or label (T1 stays clean).
- T13 Design-check role (`stpa`) whose transcript reads a path outside `in/` (the "full design") -> tainted (R54).
- T14 Coordinator form: calls with contexts 150,000 and 250,000 and `W_star_coord` a gate -> `calls_over` one entry,
  exit 1 `over-window`; with the threshold `value: null` -> exit 0 and the same `calls_over` as a reading; a Write
  to `tcb/` -> exit 3; Bash `git status` -> `out_of_profile`, `node tcb/scripts/status.mjs` is not.
- T15 `--epoch` older than the row's -> 65, nothing written; stale `--ce` -> 64; busy lock -> 75; unknown task -> 1.
- T16 No bound session -> 2; transcript missing -> 2; a transcript of only garbage lines -> 2 `format-unknown`; for
  each, no audit file and a `check` line with result `not_run` and an `incident` line.
- T17 `--dry-run`: result with `dry_run:true` and the label, no file, no lines; exit code as the real run.
- T18 Rerunning on unchanged transcripts rewrites a byte-identical audit file (same `--now`) and appends new lines
  (the ledger stays valid under `verifyLedger`); no `.tmp` file remains.
- T19 `audit` and `check` lines: `data.undeclared` sorted and unique, `first_context` an integer, `notes_bad` an
  integer; both forms (task, coordinator) given or neither -> 66.
- T20 The script run from `<root>/wt/...` -> 3 `run-from-attempt` (lib), nothing written.

## Cannot be tested without the app
- That real transcripts hold the fields assumed (helper linking, tool-result text, turn-end text, CONTRACT §7 item 7).
- The lean first-call baseline and its tolerance (item 11): both are measured on a real control session.
- That the harness runs `guard-hook.mjs` and honours its refusal (items 1-3): audit is the detective layer behind it.
- What the coordinator is actually shown of a child's turn end (the first 400 characters, design R30).
