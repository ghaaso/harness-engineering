# selftest.mjs (unit U3b): spec

Source of truth: `CONTRACT.md` §1, §2.1 (`run/selftest.json`), §3.7 (`selftest`, `check` lines),
§3.22 ([selftest], [fixture-case]: defined here), §4.2 (`treeSha`), §4.8 (transcript parser), §4.9
(`killOwnTree`), §5 (the 24 scripts), §6 (the one kill), §7, §8.18.

## Purpose
R41: no trusted script is used before it has given the right answer on its known-good and known-bad
fixtures, one per fault class, for the exact `tcb/` tree in use (admission requires a passing
`selftest` line for the current `treeSha(tcb/)`, §8.18). Mode `canary` reads, from a canary
session's transcripts, whether each forbidden call was refused (hooks and user-level denies, G10).

## Command line
```
node <root>/tcb/scripts/selftest.mjs run --root <dir> --ce <n> [--jobs <n>] [--case-timeout-ms <n>]
     [--only <script>]... [--keep-failed] [--now <iso>] [--dry-run]
node <root>/tcb/scripts/selftest.mjs canary --root <dir> --ce <n> --transcript <path> --expect <file>
     [--now <iso>] [--dry-run]
```
- `--jobs` default `max(1, min(8, availableParallelism() − 2, ⌊(free_mb − reserve_mb) / 200⌋))` (200 MB a
  case, a guess), from `edgeFacts` once at the CLI edge; `--case-timeout-ms` default from threshold
  `selftest_case_ms` (60000, guess).
- `--only` runs the named scripts' cases and prints; it writes no file and no ledger line (a partial
  run never certifies a tree). `--keep-failed` keeps failing case roots under `<root>/tmp/`.
- canary takes `--ce` because it appends a ledger line (§1.1, §5).

## Fixture case format (one folder per case; the contract's [fixture-case])
`tcb/fixtures/<script>/<case>/case.json`: `{schema_version: 1, script, kind: good|bad, fault_class:
slug, args: string[], stdin?: relpath, serve?: {"/<path>": relpath}, thresholds?: {name: value},
expect: {exit, code?, result?: object (deep subset), stdout_empty?: bool, stderr_prefix?: string,
files?: {relpath: "absent"|"present"|sha256}}}`, plus an optional `root/` folder of synthetic run
root files. Placeholders in `args`: `{root}` (the case root), `{server}` (the case server's origin).
A `good` case expects exit 0; a `bad` case any non-zero exit it names. `expect.code` matches when it
equals the `code` of some entry of the §1.3 line's `reasons` (the specific causes; the line's own
`code` is the slug of the exit, CONTRACT §1.3). A `watch` case must use `--once`, `--alarm` with a `--sleep-ms` below the case timeout,
or `--intake`; the default loop never ends by itself (static check `watch-case-loops`).

## Reads
`tcb/` (scripts, fixtures, schemas, profiles, settings, agents, thresholds), `run/coord.json`;
canary: the transcript under `transcripts_root` and its helpers (`lib.sessionTranscripts`), the
expect file under `<root>/tcb/fixtures/selftest/`.

## Writes
- Case roots `<root>/tmp/st-<nonce8>/<n>/` with `n` the case's index in the sorted case list (short,
  so attempt paths below it stay under 260 characters; `cases[].n` in `selftest.json` maps n to
  `<script>/<case>`),
  removed at the end unless kept.
- `run/selftest.json` ([selftest]): `{schema_version, tcb_sha, ce, ran_at, result: pass|fail|not_run,
  cases: [{n, script, case, kind, fault_class, expect_exit, exit, pass, why?}] (sorted by script,
  case), checks: [{check, pass, detail}], failed: string[]}` by `lib.writeAtomic` under the lock.
- Ledger: `selftest` `{tcb_sha, result, failed}` and `check` `{check: "selftest", subject: tcb_sha,
  result, reasons}`; canary: one `check` `{check: "canary", subject: "canary:<session>", result,
  reasons: [{code: <probe>, detail: {outcome, tcb_sha}}]}` (subject a string, CONTRACT §3.7).

## Steps (run)
1. Parse (66); `lib.checkCe` without the lock; `t0 = treeSha(tcb/)`.
2. Static checks: every script of §5's list exists under `tcb/scripts/` (`missing-script`); each
   has ≥1 good and ≥1 bad case (`no-fixtures`); every `case.json` validates (`bad-case`); every
   schema loads (`schema-load`); `thresholds.json` validates and `allow_loopback` is false
   (`loopback-on`); the role files agree (guard-hook spec T14: profiles valid, settings consistent
   with profiles, agent files' tools and bodies) (`role-files`); every `watch` case is bounded
   (`watch-case-loops`).
3. `--dry-run`: print the case list and the static results; nothing run or written.
4. Per case, up to `--jobs` at once: make the case root; copy into its `tcb/` the subfolders and files
   a script reads (`scripts/`, `schemas/`, `profiles/`, `settings/`, `agents/`, `briefs/`,
   `thresholds.json`, `cost-inputs.json`, `denylist.txt`; never `fixtures/` or `test/`); write the
   `thresholds` overrides into that copy only, with `transcripts_root` = `<case root>/transcripts`
   unless the case sets it (no case reads the owner's real transcripts); overlay `root/`; start a
   loopback server for `serve` (selftest's own, closed after the case; CONTRACT §6); spawn
   `process.execPath <root>/tcb/scripts/<script>.mjs <args>` with `cwd` = the case root, `shell:
   false`, `windowsHide: true`, `stdin` piped from the case file or closed; record the child's `{pid,
   start_time}`; past the timeout end it with `lib.killOwnTree(proc, child)` (its own child and that
   child's verified descendants only, CONTRACT §4.9) and record `why: timeout`.
5. Judge: exit equal; stdout one §1.3 line whose `code` and `result` subset match (or empty when
   `stdout_empty`); `stderr_prefix`; `files`; if the case's ledger verified before the run, it must
   verify after (`ledger-broken`). Any miss fails the case.
6. `t1 = treeSha(tcb/)`; `t1 ≠ t0` → result `not_run`, `tcb-changed`. Spawn failure or an
   unwritable `tmp/` → `not_run`. Else pass iff every case and check passed.
7. Lock (`withRunLock` with `ce`), write `selftest.json`, append the two lines; remove case roots.

## Steps (canary)
1. Parse; `--transcript` not under `transcripts_root`, or `--expect` not under
   `tcb/fixtures/selftest/` → 2 `untrusted-path`; files missing → 2.
2. Expect file: `{schema_version: 1, probes: [{probe, actor: main|helper, tool, match: {field:
   substring}, expect: refused|allowed, layer: hook|permission|any}]}`; `{root}` and `{cwd}` (the
   transcript's `cwd`) are rendered in `match`.
3. Per probe: the first tool use (by `ts`) of that tool in the actor's transcripts whose input
   fields contain every `match` substring, and its result by `toolUseId`. `refused` = `isError` and
   (hook: text holds `[guard-hook] deny`; permission: it does not; any). `allowed` = a result
   without `isError`. No such use → `not-attempted`; no result → `no-result` (both not-run).
4. Exit 1 if any probe contradicts its `expect`, else 2 if any is not-run, else 0; append the line.

## Exit codes
0 pass; 1 a case gave a wrong answer, a static check failed, a canary probe was not refused (or not
allowed); 2 could not run (`tcb-changed`, spawn failure, untrusted or missing path, a not-run probe);
64, 66, 67, 70, 75.

## Rules implemented
R41 (tested before use, canary for hooks and user-level denies, on every tcb change), R40 (not-run
is its own value and gates count it as fail), R28 (bound to the tree hash), R31, §8.18; problems
G10, N10.

## Behaviours (the test writes a stub `tcb/scripts/` of the 24 names: each stub exits with the code
and prints the JSON its args ask for, so cases can be made right or wrong at will)
- T1 All cases right: exit 0; `selftest.json` `result: pass`, `tcb_sha` = `treeSha(tcb/)`; a
  `selftest` and a `check` line; `verifyLedger` ok; no case root left under `tmp/`.
- T2 One bad case whose stub exits 0 instead of 1: exit 1, `failed` names `<script>/<case>`, the
  `selftest` line has result `fail`.
- T3 A script with only good cases: exit 1 `no-fixtures`; a missing script file: `missing-script`.
- T4 A case whose stub prints two stdout lines, or a `result` missing an expected key: that case fails.
- T5 A stub that sleeps past `--case-timeout-ms 300` and has spawned a grandchild: the case fails with
  `why: timeout`, `killOwnTree` ends both (neither alive afterwards), the run completes; a process the
  test spawned itself outside selftest is still alive.
- T5b A `watch` case with no `--once`, `--alarm` or `--intake` → exit 1 `watch-case-loops` before any
  case runs.
- T5c A case's stub reads its `transcripts_root` threshold: it is under that case's root; the case
  root path has the form `<root>/tmp/st-<8 hex>/<n>/`; the case copy has no `tcb/fixtures/`.
- T5d `expect.code: "memory"` matches a stub printing `code: "deferred", reasons: [{code: "memory"}]`
  with exit 6, and fails a stub printing `code: "memory"` with no reasons.
- T6 `--jobs 4` and `--jobs 1` give byte-equal `cases` arrays.
- T7 `thresholds` overrides reach only the case copy: the live `tcb/thresholds.json` is unchanged and
  `treeSha(tcb/)` equals t0.
- T8 A stub that edits a file of the live `tcb/` during its case: result `not_run` `tcb-changed`,
  exit 2.
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
  on a `layer: hook` probe: exit 1; on a `layer: permission` probe: pass.
- T18 canary: a helper probe matches only in a helper transcript under `<id>/subagents/`.
- T19 canary `--transcript` outside `transcripts_root` (test sets it to a temp folder) or `--expect`
  outside `tcb/fixtures/selftest/`: exit 2 `untrusted-path`, no ledger line.

## Cannot be tested without the app
- needs-app 11: a real canary session's refusals, read by `canary`; through it needs-app 1-3 (hooks
  fire for helpers, user-level denies bind, the folder's settings apply). Testing the user-level
  denies alone needs a canary folder without the hook (open: the canary-denies role and its probe
  list are not yet defined).
- needs-app 7: that real transcripts carry the refusal as an error result with the hook's stderr.
