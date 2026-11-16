# fsck.mjs: specification (unit U2a)

Source of truth: `CONTRACT.md` §1.4, §2.1, §3.6 (rows, `attempts[].settings_sha`), §3.7 (`fsck` line),
§3.9 (`coord.tcb_commit`), §3.11, §3.14-§3.16, §4.2 (`getObject`, `treeSha`), §4.5 (`verifyLedger`),
decisions 18, 21. Design rules: R23 (store check), R28 (tcb against the owner's commit, every attempt's
`.claude/`), R31 (ledger chain), R13 (status writers), R14, N5.

## Purpose
The store check run before any restart and before each commit record: object hashes, commit records,
the ledger chain, foreign keys, the writers of the status files, `tcb/` against the commit the owner
named, and every attempt's `.claude/`. A breach is tampering: exit 3, all work stops.

## Command line
```
node tcb/scripts/fsck.mjs --root <abs> --ce <n> [--now <iso>] [--dry-run]
```
No mode. `--ce` is required: fsck appends its `fsck` ledger line.

## Reads
Everything under `store/` (`objects/`, `commits/`, `status/card_status.jsonl`, `witness.jsonl`),
`run/ledger.jsonl`, `run/tasks.json`, `run/coord.json`, `wt/*/` (`.claude/` and auto-loaded files only),
`tcb/agents/`, `plan/frozen/`, `completeness/cut-*.md`, `tcb/` through `git -C <root>` (read-only git
commands only, with the hardened flags of CONTRACT §6).

## Writes
One `fsck` ledger line {result: pass|fail|not_run, failing: [{check, id, code}]}. This is fsck's R40
record; no separate `check` line (CONTRACT §3.7: status's `not_run` lists (`fsck`, `store`) from it).
Nothing else.

## Checks (each failing item is `{check, id, code}`)
1. **objects**: every file in `store/objects/` is `<p>_<16hex>.json`, parses, equals its own canonical
   form, has the hash prefix of its name and the prefix of its `kind` (`object-mismatch`); an `s_` file
   → `seed-id`; any other file (`*.tmp` left by a crash) → anomaly `stray-file`, not a failure.
2. **commits**: each `store/commits/<task>.<step>.json` validates [commit-record] and its name matches
   its `task`, `step`; `outputs_sha` recomputes; every output exists and its sha256 equals the object's
   bytes (`commit-mismatch`). A row `commits[step]` with no file, or naming other bytes →
   `commit-mismatch`. A file with no row entry or no `commit` line → anomaly `commit-torn` (completed
   by rerunning `commit record`, N5), not a failure. A `committed` row missing a step → `commit-mismatch`.
3. **ledger**: `verifyLedger` (`ledger-broken` at `brokenAt`); unparseable complete lines →
   `ledger-broken`; a torn tail → anomaly `torn-tail` (lib moves it at the next append).
4. **fk**: card `supersedes`; pack `cards`, `parent`; sentence `cites` within the pack named (a pack's
   own cards, a review's `pack`); review `pack`, `parent`, `verdicts[].supports` and `dismissals[].sid`
   naming sids; certificate `subject`, `pack`, `read_set[].card_id`; rows' `attempts[].manifest`;
   status and witness lines' `card_id`. Missing target → `fk-missing`.
5. **status writers**: `card_status.jsonl` seqs run 1..n with no gap and every seq lies in the
   [first_seq, last_seq] of exactly one `promote` ledger line (`status-unlogged`); each line's
   `card_sha` equals the card object's sha256 (`card-changed`); `witness.jsonl` seqs run 1..n with no
   gap and every seq lies in the [first_seq, last_seq] of exactly one `witness` ledger line
   (`status-unlogged`). Unparseable complete lines → `status-unreadable`.
6. **unlogged objects**: a card, pack, review or `d_` object named by no `intake` line, an `x_` by no
   `certificate` line, an `m_` by no row → anomaly `object-unlogged` (a crash between store and line;
   such objects never reach a commit record), not a failure.
7. **tcb**: `coord.json.tcb_commit` C. Every git call is `git -c core.fsmonitor=false -c
   core.hooksPath=NUL -c core.longpaths=true -c core.autocrlf=false -C <root> ...` with
   `--no-ext-diff --no-textconv` on diff, `spawnSync` timeout 60000, `cwd: root`, `shell: false`.
   `git cat-file -e C^{commit}` fails → `tcb-commit-unknown`; `git diff --quiet C -- tcb` differs, or
   `git ls-files --others -- tcb` lists a file (ignored files included) → `tcb-differs` with the
   paths. No `<root>/.git`, git not found, or a timeout → not_run `no-git`.
8. **claude**: for every attempt of every row whose folder exists: `.claude/settings.json` sha256 equals
   `attempts[].settings_sha` (`settings-differs`; missing → `settings-missing`); `.claude/agents/<t>.md`
   is allowed exactly for the types in the manifest's `agents`, each byte-equal to `tcb/agents/<t>.md`
   and to the manifest's sha256 (`agents-differs`); any other file under `.claude/`, any nested
   `.claude/` folder, or a file anywhere in the folder whose `lib.segmentName` is `claude.md` or
   `claude.local.md` (so `Claude.MD`, `CLAUDE.md.` count) → `claude-extra`; directory names compared
   through `segmentName` too (`.Claude.` is `.claude`). A missing attempt folder → anomaly
   `attempt-gone`.
9. **frozen**: every `plan/frozen/<name>-<sha12>.json` and every `completeness/cut-<sha12>.md` hashes
   (sha256 of its bytes) to a value whose first 12 hex are its name's (`frozen-mismatch`); a frozen
   file named by a `protocol-freeze`, `protocol-amend` or `plan-freeze` ledger line, or a cut named
   by a `cut` line, that is missing → `frozen-missing`.

## Steps
1. Parse args; `coord.json` missing → exit 2 `no-coordinator`; `readTasks` corrupt → 67.
2. Phase 1, without the lock (git runs only here, CONTRACT §2.1): note ledger head H1; run checks 1-9.
3. Phase 2, `withRunLock` + `checkCe` (64): if the head moved past H1, verify the chain from H1 and run
   checks 1, 2, 4 on the objects and records named by the lines after H1 (so a passing line covers every
   `intake`/`commit` before it, decision 18).
4. result = fail if any failing item; else not_run if the tcb check did not run; else pass. Append the
   `fsck` line (in phase 2). If the ledger tail itself is broken, appendLedger refuses: no line, exit 3.

## Exit codes
0 pass; 2 not_run (`no-git`, `no-coordinator`); 3 any failing item (also when another check was not
run); 64, 66, 67, 70, 75. Result: {checks: {objects: {n, failing}, commits, ledger, fk, status, tcb,
claude, frozen}, failing, anomalies: [{code, id}], head_checked: {seq, hash}}.

## Behaviours
- T1 A root with stored objects, a commit record, matching row, promote-logged status lines, a git repo
  whose commit C holds `tcb/`, and attempts whose settings match: exit 0, `fsck` line result pass.
- T2 One object byte changed (still parseable) → exit 3, failing `{objects, <id>, object-mismatch}`,
  `fsck` line result fail. Non-canonical whitespace in an object → same.
- T3 `s_0123456789abcdef.json` in `store/objects/` → exit 3 `seed-id`.
- T4 A leftover `c_x.json.123.abcd1234.tmp` → exit 0, anomaly `stray-file`.
- T5 A commit record naming an output whose bytes differ → 3 `commit-mismatch`; record file present but
  row `commits` empty and no `commit` line → exit 0, anomaly `commit-torn`.
- T6 Ledger line 3 of 5 edited (hash not recomputed) → 3 `ledger-broken` at 3, and the `fsck` line is
  appended after line 5 (the tail is intact). Tail line edited → exit 3, no line appended.
- T7 A review naming a pack that is not stored → 3 `fk-missing`; a status line for an absent card → same.
- T8 A `card_status.jsonl` line 4 with promote lines covering only 1-3 → 3 `status-unlogged`; seq gap →
  same; `card_sha` differing from the object → 3 `card-changed`.
- T9 A card object named by no `intake` line → exit 0, anomaly `object-unlogged`.
- T10 A file added under `tcb/` after C (untracked) → 3 `tcb-differs` naming it; a tracked tcb file
  edited → same; C absent from the repo → 3 `tcb-commit-unknown`.
- T11 No `.git` → exit 2, result not_run, failing empty, `fsck` line result not_run; no `.git` and a
  broken object → exit 3.
- T12 `wt/f1-research-e1/.claude/settings.local.json` present → 3 `claude-extra`; settings edited →
  3 `settings-differs`; `wt/f1-research-e1/staging/CLAUDE.md`, `staging/claude.md` and
  `staging/Claude.MD` → 3 `claude-extra`; `.claude/agents/reader.md` equal to `tcb/agents/reader.md`
  and listed in the manifest → pass; edited → 3 `agents-differs`; `.claude/agents/other.md` not in the
  manifest → 3 `claude-extra`.
- T13 An `intake` line appended by another writer between phase 1 and 2 naming a corrupted object → the
  phase-2 check reports it, exit 3.
- T14 `--ce` stale → 64 and no line; lock busy → 75; `tasks.json` corrupt → 67; `--dry-run` → result
  printed, no ledger line.
- T15 `witness.jsonl` seqs 1-4 with one `witness` ledger line covering 1-3 → 3 `status-unlogged`.
- T16 A byte changed in `plan/frozen/protocol-f1-<sha12>.json` or in `completeness/cut-<sha12>.md` →
  3 `frozen-mismatch`; a frozen file named by a `protocol-freeze` line deleted → 3 `frozen-missing`.
- T17 A repo with `core.hooksPath` and `core.fsmonitor` set in its config to a script that writes a
  marker file → fsck runs, the marker file is never created.

## Needs the app
- None: every check reads files and runs git inside the temp root. (Whether a real session obeys the
  settings fsck guards is §7 item 3, owned by selftest.)
