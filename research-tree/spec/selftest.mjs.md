# selftest.mjs (unit U3b): spec

Source of truth: `CONTRACT.md` §1, §2.1 (`run/selftest.json`), §3.7 (`selftest`, `check` lines),
§3.22 ([selftest], [fixture-case]: defined here), §4.2 (`treeSha`), §4.8 (transcript parser), §4.9
(`killOwnTree`), §5 (the 24 scripts), §6 (the one kill), §7, §8.18.

Layout of this build: the scripts and the library sit flat in `tcb/` (`<root>/tcb/<name>.mjs`), as the contract says (there is no
`scripts` subfolder).

**Revised 2026-11-17 (no bursts).** A smoke run of the first design wrote 1,275 script files in one
second (a copy of the whole script folder for every case, up to 8 cases at once) and the PC stalled
half a minute later. Since then: no copy of the script folder at all (each case runs the script where
it is, against its own small case root of data files); a case root is made only when its case is
about to run and removed as soon as it is judged; one case at a time by default, never more than
two; after every case the tree hash of `tcb/` is checked; every process a case starts has ended
before the next case starts; no case starts a watcher, an alarm or any other background process.

## Purpose
R41: no trusted script is used before it has given the right answer on its known-good and known-bad
fixtures, one per fault class, for the exact `tcb/` tree in use (admission requires a passing
`selftest` line for the current `treeSha(tcb/)`, §8.18). Mode `canary` reads, from a canary
session's transcripts, whether each forbidden call was refused (hooks and user-level denies, G10).

## Command line
```
node <root>/tcb/selftest.mjs run --root <dir> --ce <n> [--jobs 1|2] [--case-timeout-ms <n>]
     [--only <script>]... [--keep-failed] [--now <iso>] [--dry-run]
node <root>/tcb/selftest.mjs canary --root <dir> --ce <n> --transcript <path> --expect <file>
     [--now <iso>] [--dry-run]
```
- `--jobs` default **1** (one case at a time); `2` is the most allowed; any other value is 66
  `usage`. No machine fact (free memory, processor count) raises it. `--case-timeout-ms` default from
  threshold `selftest_case_ms` (60000, guess).
- `--only` runs the named scripts' cases and prints; it writes no file and no ledger line (a partial
  run never certifies a tree). `--keep-failed` keeps failing case roots under `<root>/tmp/`.
- canary takes `--ce` because it appends a ledger line (§1.1, §5).

## Fixture case format (one folder per case; the contract's [fixture-case])
`tcb/fixtures/<script>/<case>/case.json`: `{schema_version: 1, script, kind: good|bad, fault_class:
slug, args: string[], stdin?: relpath, serve?: {"/<path>": relpath}, thresholds?: {name: value},
git?: bool, expect: {exit, code?, result?: object (deep subset), stdout_empty?: bool, stderr_prefix?: string,
files?: {relpath: "absent"|"present"|sha256}}}`, plus an optional `root/` folder of synthetic run
root files. Placeholders in `args`: `{root}` (the case root), `{server}` (the case server's origin).
`git: true` makes the case root a git repository whose one commit holds the case root's `tcb/` (the
data files, after the overrides and the overlay) and sets `run/coord.json` `tcb_commit` to that
commit when the overlay wrote a `coord.json`; it is how an `fsck` case can pass fsck's tcb check
(step 4). A `git` that is not a boolean is `bad-case`.
A `good` case expects exit 0; a `bad` case any non-zero exit it names. `expect.code` matches when it
equals the `code` of some entry of the §1.3 line's `reasons` (the specific causes; the line's own
`code` is the slug of the exit, CONTRACT §1.3).
- **No background process.** A `watch` case must carry both `--once` and `--no-intake` (without
  `--no-intake`, `--once` may spawn the detached intake) and neither `--alarm` nor `--intake`: the
  default loop, a real alarm and the intake are never run by selftest (static check
  `watch-case-loops`). `status` and `handover` have only one-shot modes (each may also use
  `--dry-run`). A script that leaves a process behind fails its case and stops the run (step 4).
- A case whose overlay needs scripts in its case root (a `selftest` case testing selftest on stubs)
  puts them in its own `root/tcb/`; selftest copies no script.

## Reads
`tcb/` (scripts, fixtures, schemas, profiles, settings, agents, thresholds), `run/coord.json`;
canary: the transcript under `transcripts_root` and its helpers (`lib.sessionTranscripts`), the
expect file under `<root>/tcb/fixtures/selftest/`.

## Writes
- Case roots `<root>/tmp/st-<nonce8>/<n>/` with `n` the case's index in the sorted case list (short,
  so attempt paths below it stay under 260 characters; `cases[].n` in `selftest.json` maps n to
  `<script>/<case>`). A case root is made when its case is about to run and removed as soon as the
  case is judged (a failing one is kept under `--keep-failed`). Its `tcb/` holds **data files only**:
  `schemas/`, `profiles/`, `settings/`, `agents/`, `briefs/`, `thresholds.json` (with the case's
  overrides), `cost-inputs.json`, `denylist.txt`, `README.md`; never a script, `fixtures/` or `test/`.
  At most `--jobs` case roots exist at a time.
- `run/selftest.json` ([selftest]): `{schema_version, tcb_sha, ce, ran_at, result: pass|fail|not_run,
  cases: [{n, script, case, kind, fault_class, expect_exit, exit, pass, why?}] (sorted by script,
  case; only the cases that ran), checks: [{check, pass, detail}], failed: string[]}` by
  `lib.writeAtomic` under the lock.
- Ledger: `selftest` `{tcb_sha, result, failed}` and `check` `{check: "selftest", subject: tcb_sha,
  result, reasons}`; canary: one `check` `{check: "canary", subject: "canary:<session>", result,
  reasons: [{code: <probe>, detail: {outcome, tcb_sha}}]}` (subject a string, CONTRACT §3.7).

## Steps (run)
1. Parse (66, also `--jobs` outside 1..2); `lib.checkCe` without the lock; `t0 = treeSha(tcb/)`.
2. Static checks: every script of §5's list exists under `tcb/` (`missing-script`); each has ≥1 good
   and ≥1 bad case (`no-fixtures`); every `case.json` validates (`bad-case`); every schema loads
   (`schema-load`); `thresholds.json` validates (`thresholds-invalid`) and `allow_loopback` is false
   (`loopback-on`); the role files agree (guard-hook spec T14: profiles valid, settings consistent
   with profiles, agent files' tools and bodies) (`role-files`); every `watch` case is a one-tick case
   that starts nothing (`watch-case-loops`). Any failed static check: no case runs.
3. `--dry-run`: print the case list and the static results; nothing run or written, no `tmp/` folder.
4. Cases in sorted order, at most `--jobs` (1 or 2) in flight; a slot takes its next case only after
   its previous case has fully ended (child exited, pipes closed, server closed, any kill finished).
   Per case, just before it runs: make the case root with its data-only `tcb/` (above); write the
   `thresholds` overrides into that copy only, with `transcripts_root` = `<case root>/transcripts`
   unless the case sets it (no case reads the owner's real transcripts); overlay `root/`; for a
   `git: true` case write `.gitattributes` (`* -text`) and run `git init`, `git add .gitattributes tcb`,
   `git commit` and `git rev-parse HEAD` in the case root, one call at a time, `shell: false`, with
   hooks off (`core.hooksPath=NUL`), no system or global git config, `core.autocrlf=false`, and a
   60 s limit per call, then set `tcb_commit` (a failing git call fails the case with
   `why: "harness: git-case"`); start a
   loopback server for `serve` (selftest's own, in-process, closed after the case; CONTRACT §6);
   spawn `process.execPath <root>/tcb/<script>.mjs <args>` (the live script, not a copy) with `cwd` =
   the case root, `shell: false`, `windowsHide: true`, `stdin` piped from the case file or closed.
   Past the timeout, take one process list for the child's `{pid, start_time}` and end it with
   `lib.killOwnTree(proc, child)` (its own child and that child's verified descendants only,
   CONTRACT §4.9), await the kill, and record `why: timeout`.
   **Every process a case starts is ended before the next case starts:**
   - the child must exit; one that is still alive `case_timeout + 30 s` after its kill stops the run
     (`not_run`, reason `case-not-ended`);
   - after the exit its stdout and stderr must close within 3 s; a pipe still open means a process
     the case started still holds it: the case fails (`why: left-process`) and the run stops
     (`not_run`, reason `case-left-process`). selftest never kills a process of an exited child
     (the one kill is the timed-out child's tree, CONTRACT §6).
   After every case, `treeSha(tcb/)` is taken again; a value other than `t0` stops the run (`not_run`,
   `tcb-changed`, detail names the case). A stop lets an in-flight case finish and starts no other;
   the cases that never started are listed in the stdout `result.not_started`.
   The case root is removed right after the case is judged (unless kept).
5. Judge: exit equal; stdout one §1.3 line whose `code` and `result` subset match (or empty when
   `stdout_empty`; guard-hook's stdout is expected empty); `stderr_prefix`; `files`; if the case's
   ledger verified before the run, it must verify after (`ledger-broken`). Any miss fails the case.
6. `t1 = treeSha(tcb/)`; `t1 ≠ t0` → result `not_run`, `tcb-changed`. Spawn failure, an unwritable
   `tmp/`, `case-not-ended` or `case-left-process` → `not_run`. Else pass iff every case and check
   passed. `reasons` lists every not-run cause (`tcb-changed` first), then failed checks, then one
   `case-failed` per failing case.
7. Lock (`withRunLock` with `ce`), write `selftest.json`, append the two lines.

## Steps (canary)
1. Parse; `--transcript` not under `transcripts_root`, or `--expect` not under
   `tcb/fixtures/selftest/` → 2 `untrusted-path`; files missing → 2.
2. Expect file: `{schema_version: 1, probes: [{probe, actor: main|helper, tool, match: {field:
   substring}, expect: refused|allowed, layer: hook|permission|any}], permission_patterns?:
   [non-blank string]}`; `{root}` and `{cwd}` (the transcript's `cwd`) are rendered in `match`. Any
   other field, or a `permission_patterns` that is not an array of non-blank strings → 2 `bad-expect`.
3. Per probe: the first tool use (by `ts`) of that tool in the actor's transcripts whose input
   fields contain every `match` substring, and its result by `toolUseId`. An error result is
   `refused-hook` when its text holds `[guard-hook] deny`, `refused-permission` when its text holds
   one of `permission_patterns` (case-insensitive substring: the harness's permission-denial
   wording, to be confirmed by needs-app 7; the shipped expect file names none), and otherwise
   `error-not-refusal` (a missing file, "read it first", a bad input: it proves nothing about either
   layer). `refused` = `refused-hook` on a hook probe, `refused-permission` on a permission probe,
   either on an any probe; the other refusal is a contradiction. `error-not-refusal` is not-run on
   every refused probe. `allowed` = a result without `isError`. No such use → `not-attempted`; no
   result → `no-result` (both not-run).
4. Exit 1 if any probe contradicts its `expect`, else 2 if any is not-run, else 0; append the line.

## Exit codes
0 pass; 1 a case gave a wrong answer, a static check failed, a canary probe was not refused (or not
allowed); 2 could not run (`tcb-changed`, `case-not-ended`, `case-left-process`, spawn failure,
untrusted or missing path, a not-run probe); 64, 66, 67, 70, 75.

## Rules implemented
R41 (tested before use, canary for hooks and user-level denies, on every tcb change), R40 (not-run
is its own value and gates count it as fail), R28 (bound to the tree hash), R31, §8.18; problems
G10, N10.

## Behaviours (the test writes a stub `tcb/` of the 24 names, flat: `<root>/tcb/<name>.mjs`, each stub
exits with the code and prints the JSON its args ask for, so cases can be made right or wrong at
will; the stubs run where they are, and read their data through `--root {root}`)
- T1 All cases right: exit 0; `selftest.json` `result: pass`, `tcb_sha` = `treeSha(tcb/)`; a
  `selftest` and a `check` line; `verifyLedger` ok; no case root left under `tmp/`.
- T2 One bad case whose stub exits 0 instead of 1: exit 1, `failed` names `<script>/<case>`, the
  `selftest` line has result `fail`.
- T3 A script with only good cases: exit 1 `no-fixtures`; a missing script file: `missing-script`.
- T4 A case whose stub prints two stdout lines, or a `result` missing an expected key: that case fails.
- T5 A stub that sleeps past a short `--case-timeout-ms` and has spawned a grandchild: the case fails
  with `why: timeout`, `killOwnTree` ends both (neither alive afterwards) before the next case
  starts, the run completes; a process the test spawned itself outside selftest is still alive. The
  stub starts its grandchild detached, so the grandchild is outside the stub's kill-on-close job
  object and only `killOwnTree` can end it in time.
- T5b A `watch` case without both `--once` and `--no-intake`, or with `--alarm` or `--intake` → exit 1
  `watch-case-loops` before any case runs (nothing spawned, no `tmp/` case root).
- T5c A case's stub reads its `transcripts_root` threshold: it is under that case's root; the case
  root path has the form `<root>/tmp/st-<8 hex>/<n>/`; the case root's `tcb/` has no `fixtures/`, no
  `test/` and no `.mjs` file; the stub's own path (`process.argv[1]`) is `<root>/tcb/<name>.mjs`.
- T5d `expect.code: "memory"` matches a stub printing `code: "deferred", reasons: [{code: "memory"}]`
  with exit 6, and fails a stub printing `code: "memory"` with no reasons; a stub printing
  `code: "deferred", reasons: [{code: "other"}]` with exit 6 fails with `why: "code"`.
- T5e One at a time: with the default `--jobs`, no two case roots exist at once (a stub records
  the number of folders under `tmp/st-*/` when it starts: always 1); with `--jobs 2`, never more
  than 2. `--jobs 3` and `--jobs 0` → 66.
- T5f A stub that exits 0 but leaves a grandchild holding its stdout: the case fails `left-process`,
  exit 2 `case-left-process`, the later cases are listed in `result.not_started` and never ran. The
  grandchild expires by itself after a few seconds (the test waits for its pid file to say so and
  kills nothing it did not spawn).
- T6 `--jobs 2` and `--jobs 1` give byte-equal `cases` arrays.
- T7 `thresholds` overrides reach only the case copy: the live `tcb/thresholds.json` is unchanged and
  `treeSha(tcb/)` equals t0.
- T8 A stub that edits a file of the live `tcb/` during its case: result `not_run` `tcb-changed`
  (detail names that case), exit 2, and no case after it in sorted order ran.
- T9 A `serve` case: the stub fetches `{server}/a.html` and must see the served bytes.
- T10 A case whose stub breaks its ledger chain while the input chain verified: fails `ledger-broken`.
- T11 `allow_loopback: true` in the live thresholds: exit 1 `loopback-on`; a profile with an extra
  field: exit 1 `role-files`.
- T12 `--only seed`: runs seed's cases only, writes no file and no ledger line.
- T13 `--dry-run`: lists cases, spawns nothing, no `tmp/` folder, no lock.
- T14 Stale ce: exit 64 and nothing written; lock busy at the end: exit 75, no `selftest.json`.
- T15 canary over a `fakeTranscript` where every forbidden call has an error result with the hook
  text and the control write succeeded: exit 0, one `check` line pass with subject `canary:<session>`.
- T16 canary: one forbidden Write has a success result: exit 1, reasons name the probe.
- T17 canary: a probe's call never appears: exit 2 `not-attempted`; a refusal without the hook text
  on a `layer: hook` probe: exit 1; on a `layer: permission` probe whose text matches a
  `permission_patterns` entry: pass. An error result that is neither (the harness's "read it first")
  on a permission, an any or a hook probe: exit 2 `error-not-refusal`; the shipped expect file (no
  patterns) gives a permission refusal of the any probe the same not-run; a malformed
  `permission_patterns` is exit 2 `bad-expect` with no ledger line.
- T18 canary: a helper probe matches only in a helper transcript under `<id>/subagents/`.
- T19 canary `--transcript` outside `transcripts_root` (test sets it to a temp folder) or `--expect`
  outside `tcb/fixtures/selftest/`: exit 2 `untrusted-path`, no ledger line.

## Cannot be tested without the app
- needs-app 11: a real canary session's refusals, read by `canary`; through it needs-app 1-3 (hooks
  fire for helpers, user-level denies bind, the folder's settings apply). Testing the user-level
  denies alone needs a canary folder without the hook (open: the canary-denies role and its probe
  list are not yet defined).
- needs-app 7: that real transcripts carry the refusal as an error result with the hook's stderr.
