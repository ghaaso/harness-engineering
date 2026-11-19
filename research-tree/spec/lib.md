# lib.mjs: behaviours to test

Source of truth: `CONTRACT.md` §4 (signatures) and §1-§3 (formats, codes). Each item is one test
(or one table-driven test); "throws X n" means a `TcbError` with `code` X and `exit` n. Tests build
their run roots with `helpers.makeRoot()`, pass `now`, `proc` and other facts as parameters, and
never read a clock to decide an outcome. Items marked **needs-app** are written and skipped with
that reason (CONTRACT §7).

## CLI and output (§4.1)
- T1 `parseArgs` returns `{mode, flags}` for `start --task f1-research --epoch 2 --dry-run`: mode
  `start`, `epoch` the integer 2, `dry-run` true.
- T2 `parseArgs` throws `usage` 66 on an unknown flag, a missing required flag, a mode not in
  `modes`, and `--epoch two` for an int flag; a flag required only in another mode is not required.
  The §1.5 patterns refuse DOS device names: `--task nul`, `--task com1`, `--task con`, `prn`, `aux`,
  `lpt9` → 66; `--task con-research` is accepted (§1.5 refuses a device name only as the whole name
  or before a `.`). A relative `--root` → 66 (§1.1).
- T3 A repeated list flag (`--card a --card b`) gives `["a","b"]`.
- T4 `runMain` prints exactly one line of JSON on stdout with every §1.3 key, and exits with the
  returned code; nothing else is written to stdout.
- T5 `runMain`: a thrown `TcbError('stale-ce', 64)` gives exit 64, `ok:false`, `code` = the §1.4
  slug of 64, `reasons[0].code` `"stale-ce"`; a thrown `TcbError('no-ready', 2)` gives `code`
  `"not-run"` and `reasons[0].code` `"no-ready"`; a returned `{exit: 6, reasons: [{code: "memory"}]}`
  gives `code` `"deferred"`; a thrown plain `Error` gives exit 70 `internal`; stderr carries the message.
- T6 `runMain` exits 3 `run-from-attempt` when the script file lies under `<root>/wt/`.
- T7 `edgeFacts` uses `--now`, `--free-mb`, `--boot` when given, and only then falls back to the
  real values; `boot` is null without a proc and when `proc.boot()` fails.
- T7b `recordIncident` with the tamper form appends one `incident` line `{class: "refusal", detail:
  {tamper: true, script, code}}`; `thresholds(root).line(name)` returns the param's `line` or null.
- T8 `thresholds(root).get(name)` returns the value; an absent name throws `param-missing` 2;
  `isGate` is false for `value: null` or `gate: false`.

## Canonical JSON, hashes, objects (§4.2)
- T9 `canonicalize` sorts keys at every depth, removes whitespace, keeps array order:
  `{"b":1,"a":[2,1]}` → `{"a":[2,1],"b":1}`.
- T10 `canonicalize` NFC-normalises strings: the decomposed and the composed "é" give equal output.
- T11 `canonicalize` writes -0 as `0`, 1.0 as `1`, 1e21 in JS form; it throws `not-canonical` 1 on
  `undefined` (top level or as a property value), NaN, Infinity, a BigInt, a Date and a Map.
- T12 `sha256hex("abc")` equals the known digest `ba7816bf...15ad`; a Buffer and the same UTF-8 string
  hash equal.
- T13 `objectId("c", v)` is `c_` plus 16 lowercase hex and equals the first 16 hex of
  `sha256hex(canonicalize(v))`; two values differing only in key order get the same id.
- T14 `putObject` writes the canonical bytes to `store/objects/<id>.json` and returns
  `created:true`; the same value again returns `created:false` and leaves the file unchanged.
- T15 `putObject` throws `id-collision` 3 when the file for that id exists with different bytes
  (test writes a different file under the computed name first).
- T16 `putObject` throws `seed-id` 3 for a value whose kind maps to `s`, unless `allowSeed`.
- T17 `getObject` returns the value; a missing id throws `missing` 2; a file whose bytes were edited
  throws `object-mismatch` 3.
- T18 `treeSha` is stable under file creation order, changes when one byte of one file changes, when
  a file is added, and when a file is renamed.

## Files (§4.3)
- T19 `tempName` contains the pid and an 8-hex nonce, and two calls differ.
- T20 `writeAtomic` creates missing parent folders, leaves no `.tmp` file behind, and returns the
  sha256 of the bytes written.
- T21 `writeAtomic` over an existing file replaces it whole; a reader never sees a partial file (read
  the target in a loop while 200 writes of alternating 1 MB contents run; every read is one of the two
  full contents, and no read surfaces EPERM/EACCES: the reader's retries absorb the rename window).
  `writeAtomic` fsyncs the file only (no directory handle is opened).
- T21b Windows sharing: through an injected `fs` seam whose `renameSync` fails with EPERM (then
  EACCES, then EBUSY) for the first three calls, `writeAtomic` retries and succeeds; failing on every
  call it throws after the retry budget, leaving the old file and no `.tmp`. (Node itself opens files
  with delete sharing, so a real holder needs another program; the seam stands in for it.)
- T22 `createExclusive` returns `created`, then `identical` for the same bytes; different bytes throw
  `exists-different` 1 and leave the file unchanged.
- T22b (0b) `createExclusive(p, data, {strict: true})` behaves as T22; a missing parent folder → `no-parent` 2 and no
  folder made (without `strict` the parent is made, as before); a `linkSync` failing with ENOTSUP, EINVAL, EXDEV,
  ENOSYS or EMLINK (seam) → `no-hardlink` 3, nothing at the name, no temp left (without `strict` the `wx` fallback
  still creates it); `budget` 0 or below → `budget-spent` 2 with no file touched; a temp create failing EPERM
  every time with `budget` 150 → `budget-spent` 2 inside about the budget, nothing made.
- T22c (0b) `fsRetry(op, budget)`: an op failing EPERM with budget 0 is tried once → `budget-spent` 2 (`detail.code`
  EPERM, `tries` 1); with budget 150 it is retried (2 to 40 tries) and gives up inside about the budget; one
  failing 3 times then succeeding returns within 5000; ENOENT is thrown at once; a budget that is not a number
  → `bad-budget` 70; no budget → the 40 retries (T21b, T25b).
- T23 `readJson` throws `missing` 2 and `unparseable` 2 in those cases.
- T23b `readJson` of a file starting with a UTF-8 BOM parses (the BOM is stripped); a UTF-16LE file
  with its BOM throws `unparseable` 2 with detail `utf16`.
- T24 `readJsonl` on `a\nb\n{"x":` returns two records (if a, b parse), `torn` = the bytes `{"x":`;
  an unparseable complete middle line appears in `badLines`, not as a throw.
- T25 `appendJsonl` with a held lock moves a torn tail to `<file>.corrupt` (appending to it if it
  exists), truncates it away and appends the new line; the file then parses fully.
- T25b A rename or unlink that fails with EPERM twice (an injected `fs` seam) and then succeeds is
  retried and never surfaces; one failing on every attempt throws after the retry budget.
- T26 `appendJsonl` without a held lock (released handle) throws `lock-lost` 75 and writes nothing.
- T27 `isUnder`: `root/wt/a` under `root` is true; `root/../x`, a sibling `root2`, and a case- or
  slash-variant path are handled (`C:\R\wt` vs `c:/r/wt/` true); a junction inside `root` pointing
  outside makes its children not under `root` (skip on a machine where creating a junction fails).
- T27b `walkFiles` over a folder holding a file, a nested folder, a junction to outside, a symbolic
  link (skipped where it cannot be made) and a hard-linked file (`nlink` 2) → `files` lists the two
  plain files, `links` the other three; nothing behind the junction is listed. `removeTree` on a
  folder with a junction inside throws `untrusted-path` 3 and removes nothing (the junction's target
  is untouched); on a plain folder it removes everything.
- T27c `segmentName`: `.claude.` → `.claude`, `CLAUDE.md ` → `claude.md`, `Claude.Local.MD..` →
  `claude.local.md`, `a.b` → `a.b`.

## Locks (§4.4)
- T28 `acquireLock(run.lock)` creates the file holding `{pid, start_time, nonce, script, ce,
  acquired_at}`; `start_time` is the own start time from the own clock (now minus
  `process.uptime()`, 7-digit `Z` form; equal to `selfInfo(null).start_time`), not a value the
  provider lists; `release` deletes it; a second `release` does nothing.
- T29 With the lock held by a live process (a `spawnSleeper` child whose record the test writes),
  `acquireLock` with `retries: 3` retries three times and throws `lock-busy` 75; the lock file is
  unchanged; `proc.list` is never called (the own start time needs no listing), and `alive` judges
  only the holder.
- T30 A lock whose holder is dead (fake proc: `alive` → false) is broken: the new lock holds the new
  nonce, no `.stale` file remains, and a `lock-break` ledger line with the stale record is appended.
- T31 A lock whose pid is alive with a different start time (pid reuse; fake proc) is stale and is
  broken as in T30.
- T32 `alive` → null (PowerShell failed) is treated as alive: busy, never broken.
- T33 Two breakers race on one stale lock (simulate: after breaker A renames and creates its lock,
  breaker B renames A's fresh lock): B finds the renamed record differs from the one it judged stale,
  restores it with a hard link, and A still holds `run.lock`; `A.assertHeld()` passes.
- T34 Restore when a third lock already sits at `run.lock`: the renamed file is kept as
  `.orphan`, `run.lock` is not overwritten, and an `incident` line is appended at the next
  acquisition.
- T35 `assertHeld` throws `lock-lost` 75 after another process's record replaced `run.lock`.
- T36 `release` does not delete a lock file that holds another nonce.
- T36c The normal path makes no process query: with a provider whose `list`, `alive` and `boot`
  throw on every call, a free `run.lock` is taken, a ledger line appended and the lock released (also
  through `withRunLock` with `ce`, and a `watcher.lock`); the provider is never called.
- T36d The same with `realProc`: a spy on `child_process` sees no subprocess at all.
- T36e A stale lock whose holder is gone is broken only after verification: `alive(pid, start_time)`
  of the recorded holder is asked first and answers false, the rename comes after it; with no
  provider, or an `alive` that throws, the same lock stays (busy, not broken).
- T36f A lock whose holder is a real process the test spawned and ended is broken with `realProc`
  (one real verification).
- T36j An empty or truncated-JSON `run.lock` stays with `retries` 3 (`lock-busy` 75); with `retries`
  50 (`LOCK_UNREADABLE_MIN_RETRIES`) and the bytes unchanged throughout, it is broken with no process
  query, no `.stale` leftover, and a `lock-break` line with `stale` all null plus
  `unreadable: {bytes, sha256}` of the old bytes.
- T36k An unreadable lock that becomes a live record during the budget is not broken (75).
- T36l `aliveFromQuery`: `NONE` is false; a process created before the recorded start (a slow
  start-up) is the holder; one created more than `START_TOLERANCE_MS` after it (pid reuse) is not;
  output this query never gives is null.
- T37 `withRunLock` with `ce` = coord's ce runs `fn` and releases; with a different ce it throws
  `stale-ce` 64 without calling `fn` and still releases; `fn` throwing still releases.
- T38 `checkCe`: missing `coord.json` throws `no-coordinator` 2; unparseable throws `table-corrupt`
  67.

## Ledger (§4.5)
- T39 The first append gets `seq 1`, `prev` = 64 zeros, and `hash = sha256hex(prev +
  canonicalize(line without hash))`; the second gets `seq 2` and `prev` = the first hash.
- T40 Each append pushes its seq to `ctx.ledgerSeq` and carries `writer`, `writer_sha`, `ts` (the
  `now` passed in), `ce`, `kind`, `task`, `epoch`, `data`.
- T41 A kind outside `LEDGER_KINDS` throws `usage` 66 and writes nothing.
- T42 Appending without holding the lock throws `lock-lost` 75.
- T43 A torn last line is moved to `ledger.jsonl.corrupt`, a `torn-tail` line is appended first,
  then the requested line; `verifyLedger` passes on the result.
- T44 If the tail line's hash does not recompute (test edits a byte of `data`), append throws
  `ledger-broken` 3 and the file is unchanged.
- T45 `verifyLedger` reports `ok:false` with `brokenAt` for: an edited middle line, a deleted middle
  line (seq gap), two lines swapped, and a recomputed-but-relinked rewrite only when `prev` breaks;
  a fully recomputed chain passes (tamper-evident only against a noted head, R31).
- T46 Concurrency: 2 child processes each append 200 lines through `withRunLock` (two, to keep within
  the machine's limit of four Node processes at once: runner, test file, two workers; `retries: 1000`, so
  a slow machine never turns waiting into 75); the result has 400 lines, seq 1..400 with no gap or
  duplicate, and verifies.
- T47 `ledgerHead` of an empty or absent ledger is `{seq:0, hash: 64 zeros}`; otherwise the last line.
- T48 `scriptSha(import.meta.url)` equals the sha256 of the file's bytes.

## Task table and fence (§4.6)
- T49 `readTasks` throws `table-corrupt` 67 on a missing file, bad JSON, and a row violating
  [task-row] (e.g. `step: "running"`).
- T50 `writeTasks` with the current rev writes `rev + 1`, copies the old file to `tasks.json.prev`,
  and validates; a schema-invalid table throws `schema-invalid` 1 and writes nothing.
- T51 `writeTasks` with a stale `expectRev` throws `rev-moved` 65 and writes nothing.
- T52 `updateRow` on an unknown task throws `no-task` 1; with a wrong epoch throws 65; with a step not
  in `steps` throws `wrong-step` 65; in each case the file is byte-identical afterwards.
- T53 `updateRow` whose mutate returns an equal row writes nothing and returns `changed:false`.
- T53b `attemptOf(row, 2)` returns the entry with `epoch` 2 even when it is not at index 1 (an array
  whose entries are out of order); an absent epoch throws `no-attempt` 2.
- T54 `fence` with reason `first` on a planned row (epoch 0, step none) gives epoch 1, step
  `stopped`, state `active`, `restarts` 0, and appends a new `attempts` entry.
- T54b `fence` with reason `cut` or `drop` on a planned/none row and on an active/stopped row → state
  `cut`/`dropped`, epoch unchanged, no new attempt; with reason `tainted` and a READY present → the
  fence is applied (`readyCheck` not called), counted like a stall.
- T55 `fence` with `expectEpoch` ≠ the row's epoch throws 65 (the compare-and-set): two fences racing
  on epoch e (two processes) end with exactly one at e+1 and the other at 65.
- T56 `fence` with a failure reason and `readyCheck()` true throws `ready-wins` 5; the row is
  unchanged.
- T57 `fence` with reason `stall`, `restarts` 0, R 1, not host: epoch e+1, step `fenced`, restarts 1,
  a `fails` entry with the given tick, `restartCharged:true`.
- T58 `fence` with reason `crash` and `host:true`: restarts unchanged, `fails` entry `host:true`,
  `restartCharged:false`.
- T59 `fence` with a failure reason when restarts = R: the fence is applied (epoch e+1, step fenced),
  `limit:true` on the row and in the return, restarts unchanged.
- T60 `fence` with `handover` or `memory` when handovers + parks ≥ Hmax throws `hmax` 1, row
  unchanged; below it, the matching counter rises by 1.
- T61 `fence` records `cut` and `spendAtFence` in the fenced attempt's entry.
- T62 `stagingCut` lists every file under `staging/` (incl. `harvested/`), not `READY.json`, with its
  byte length and the sha256 of its bytes, sorted by posix relpath; an empty staging gives `{files:
  {}, links: []}`.
- T62b `stagingCut` with a junction in `staging/` pointing at a folder outside the attempt (and a
  hard-linked file) → both in `links`, nothing behind them read or hashed.
- T63 `readCutPrefix` returns exactly the first `len` bytes of files appended to after the cut; a file
  rewritten (prefix changed) or truncated below `len` is in `mismatched` and absent from `files`; a
  file replaced by a link after the cut is in `mismatched` and never read.
- T64 `readCutPrefix` on a `.jsonl` whose cut ends mid-line drops the partial line.

## Validator (§4.7)
- T65 Each supported keyword accepts a conforming value and rejects one violating value, with the
  JSON-pointer `path` and the `keyword` in the error (table-driven, one row per keyword:
  type incl. integer and type lists, enum, const, properties, required, additionalProperties false
  and schema, patternProperties, items, minItems, maxItems, uniqueItems, minLength, maxLength
  counting code points, pattern with `u`, minimum, maximum, exclusiveMinimum, anyOf, oneOf (two
  matches fail), allOf, $ref to `#/$defs`).
- T66 A `$ref` to `sentence.schema.json#/$defs/x` resolves from `tcb/schemas/`; a ref to a missing
  file or def is reported as an error, not a crash.
- T67 `x-maxWords: 15` accepts 15 words and rejects 16 (words split on whitespace runs; leading and
  trailing space ignored).
- T68 An unknown keyword (e.g. `format`, `dependentRequired`) throws `schema-keyword` 70;
  `$schema`, `$id`, `title`, `description`, `x-version` are ignored.
- T69 `checkFormat` throws `schema-version` 1 when `schema_version` ≠ the schema's `x-version`, and
  `schema-invalid` 1 with the error list otherwise.
- T70 Every schema file the library writes in `tcb/schemas/` validates its own §3 example fixture and
  rejects that fixture with one extra property (`status` on a card, R27).

## Transcript parser (§4.8) — synthetic transcripts from `fakeTranscript`
- T71 Three assistant records sharing one `message.id` (thinking, text, tool_use blocks), usage
  repeated, count as one model call with that usage; a second id is a second call.
- T72 Records with `message.model` `<synthetic>` are not calls; their tool uses are still listed.
- T73 Usage fields map to input, cache_read, cache_write, output; `context` and `total` add up as §4.8
  says; a missing field counts 0 and marks the call `partial`.
- T74 Tool uses carry `sig`; equal inputs with keys in another order give equal `sig`; a different
  input value gives a different `sig`.
- T75 `toolAccess` table: Read, Glob (no path → '.'), Grep, Write, Edit, MultiEdit, NotebookEdit,
  WebFetch, WebSearch, Bash, PowerShell, Agent, Task and an unknown tool each give the kind and fields
  of §4.8; a non-string `file_path` gives an empty `paths`.
- T76 Tool results pair with their tool use by `tool_use_id`, carry `is_error`, and `text` is cut at
  2,000 characters.
- T76b A tool result carries the URLs of its full text as a non-enumerable `urls`, also a URL past
  the 2,000-character cut: distinct, in order, trailing punctuation dropped; `urls` is not an
  enumerable key.
- T77 `structured` holds the input of a `StructuredOutput` tool use and the `data` of an
  `attachment` record of type `structured_output`.
- T78 A torn last line is skipped with `torn:true`; a bad middle line is counted in `badLines`;
  unknown record types (e.g. `queue-operation`) are skipped without error.
- T78b `turnEnds`: two turns (assistant records, then a real user record, then assistant records)
  give two entries whose `text` is the last assistant record's joined text blocks; a tool-result user
  record does not end a turn.
- T79 `fromByte` = a previous `endByte` returns only the calls after it; parsing in two parts and in
  one gives the same totals. A call whose records straddle `endByte` (the same `message.id` before
  and after) is returned once more with `continued: true` and the full usage, and the two-part totals
  still equal the one-part totals once the caller replaces `lastCall.usage`.
- T79b A 50 MB transcript parses in 1 MiB chunks: the process's heap growth stays well below the file
  size (no whole-file string), and a multi-byte UTF-8 character split across a chunk boundary is
  decoded intact.
- T80 `spendOf` sums a main transcript and two helper transcripts; `peak_context` is the largest call
  context, `last_context` the context of the last call by timestamp in the main transcript.
- T81 `loopRun` gives `run 3` for three equal signatures at the end, `run 1` after a different one.
- T82 `projectDirName("C:\\Users\\U\\runs\\wt\\f1-e2")` replaces `:`, `\`, `.`, `_`, space with `-`
  (expected string written out in the test). **needs-app** for the claim that the harness names
  folders this way.
- T83 `sessionTranscripts` finds the main file in any project folder and every `agent-*.jsonl` below
  `<id>/subagents/` (nested folders included), sorted; none → `main: null, helpers: []`.
- T84 `transcriptsForFolder` returns only files whose first `cwd` record names the folder
  (case-folded), and skips a file in the same project folder with another cwd; when the exact
  project folder is absent, a folder whose name starts with the first 100 characters of
  `projectDirName(folder)` is scanned the same way.
- T84b `urlKey("HTTPS://Example.com/a")` equals `sha256hex("https://example.com/a")`.

## Process information (§4.9)
All tests in this section set `{concurrency: false}` (§4.11).
- T85 `realProc({exe: <proc_exe>}).list()` returns an array (also when one process would match)
  that includes the test process's own pid with a `start_time` of the exact form
  `YYYY-MM-DDTHH:MM:SS.fffffffZ` and its command line; `alive(pid, start_time)` is true for it and
  false with a changed start time; the own-clock start (`selfInfo`) lies within two seconds of the
  listed one and `alive` is true for it; the listed start shifted by one second is alive, shifted by
  five seconds is not; `boot()` returns a string of the same form, equal on two calls.
- T85b A command line holding non-ASCII characters (a sleeper with an `é` marker) comes back intact
  (the UTF-8 output encoding).
- T86 For a `spawnSleeper` child, `alive` is true; after the test kills it (`sleeper.kill()`), false.
- T87 `killOwnTree(proc, child)` on a sleeper that spawned a grandchild ends both (grandchild first),
  each verified by start time; with a recorded `start_time` that does not match it kills nothing.
- T88 `killOwnTree` never passes `/T` (a spy on the spawn arguments) and spawns taskkill by its
  absolute path.
- T89 `realProc` with an unrunnable PowerShell path (test seam: `realProc({exe: 'no-such.exe'})`)
  makes `list` throw `proc-unavailable` 2, `alive` return null and `boot` return null.
- T90 `descendants` and `attemptProcesses` over a fake list: a process naming the folder (either
  slash style, any case) or the session id matches, with its descendants; others do not; `wt/f1-e1`
  does not match a command line naming `wt/f1-e10`.
- T90b `descendants` ignores a "child" whose `start_time` is earlier than its parent's (a reused
  parent pid).
- T90c `sameStartTime` (tolerance `START_TOLERANCE_MS` = 2000): start times one second apart match
  (either direction), five seconds apart do not; exactly two seconds matches, 2.001 s does not; the
  number of fractional digits and an offset do not matter; null never matches. `killOwnTree` with a
  recorded start one second off the listed one kills grandchild then child; five seconds off kills
  nothing (`start-mismatch`).
- T92 **needs-app**: a real session's `claude.exe` command line names its folder or session id.

## Numerics and shared computations (§4.10)
- T93 `rng("s")` gives the same sequence on every run and a different one for `rng("t")`; `int(n)`
  stays in `[0, n)`; `shuffle` returns a permutation and leaves its input unchanged.
- T94 `clopperPearson(0, 14)` lower 0, upper ≈ 0.2316; `clopperPearson(14, 14)` lower ≈ 0.7684,
  upper 1; `clopperPearson(5, 10)` ≈ (0.1871, 0.8129) to 1e-4; `n = 0` gives `{0, 1}`.
- T95 `reservation`: two finished attempts with spent 100 and 50 plus one bound row with e_task 1000
  and spent 300 give 100 + 50 + 300 + 700 = 1150; a row at step `fenced` adds only its spent; a
  spent above e_task adds max(0, ·) = 0 for the open part.
- T96 `slotCount`: an attempt whose matched process is alive is live; one with no matching process but
  a transcript is unknown; one with `stop: unconfirmed` is unconfirmed; a confirmed stop and a planned
  row count nothing; one attempt is never counted twice; the current attempt of a row at step admitted
  with no process and no transcript is unknown (one slot), as is the last attempt of a committed row
  whose stop is not confirmed; `procList` null makes every such attempt unknown.
- T96b `variant`: a research row with question ids [a, b, c] and a witnessed card of the task carrying
  a → V 2, uncovered [b, c]; with `f5Given` false a stored card of another task carrying b also covers
  b; a design-check row → V null.
- T96c `currentDesign`: two committed mapper rows for the current cut, the earlier-committed one with
  the higher `updated_rev` → the one whose `commit` ledger line has the higher seq is chosen; no `cut`
  line → all null.
- T96d `runFlags`: a `halt` line then `owner {act: resume}` → not halted; a `drain` line of ce 2 with
  ce 2 → draining, with ce 3 → not.
- T96e `intakeCandidates`: a witnessed card with no check → candidate; a card re-witnessed after an
  `unqualified-revert` while J1 is unqualified → not, and once J1, J2 and J4 are qualified → yes; a card
  that is a real item of an earlier batch with no status line from it → `in_flight: true`.
- T96f `flagCleared` and `checkerVerdicts` per CONTRACT §3.15 and §4.10 (cleared only by a confirmed
  sentence-check line with the node from a batch queued after the flag, reopened by a later
  `unqualified-revert` of one of its classes; off-enum, missing and conflicting verdicts → unclear
  with their reasons). `readSetSha` equals `sha256hex(canonicalize(readSet))`. `currentProtocol` returns
  the frozen file named by the last `protocol-freeze`/`protocol-amend` line of `protocol-<field>`;
  `questionsSha` is order-independent.

## Test helpers (§4.11)
- T97 `makeRoot` creates every §2 folder, `tcb/` copies (schemas, profiles, settings, agents, briefs),
  `coord.json` with the given ce and an empty valid `tasks.json`, all under `tcb-build/tmp` with a
  6-character prefix; its thresholds set `transcripts_root` to `<root>/transcripts` (which exists and
  is empty); `cleanup` removes the whole root.
- T98 `fakeTranscript` output parses with `parseTranscript` into exactly the calls, tool uses, results
  and structured items given.

## Round-3 skeleton (S0.5): signatures fixed, bodies filled by the fixes
Until its fix lands, each API function below throws `not-built` (exit 70, detail `{fn, fix}`) and each
empty step returns its neutral value, so behaviour is unchanged (FIX-JOIN point 11, build order).
- `outcomeState(attemptDir, row)` -> `{present, fenced, slots, ready, next}`; `outcomeAppend(attemptDir, slot,
  {row, check, create})` -> `{result: created|identical|fenced, j, state}`; `outcomeSlotBytes(slot)`: FX-OUT, built
  (CONTRACT §3.23 and §4.6). outcomeState: no `outcome/` → an empty log (`present` false); R-a fenced (the
  fenced slot's reason), R-b `ready` = steps of ready slots not in `row.commits`; R-c only `<j>.json` names,
  a regular file whose bytes are exactly a slot of the folder's task and epoch; a gap, a slot after the
  fenced one, a leading-zero name or a non-folder `outcome` → `outcome-tamper` 3 (detail `why`). outcomeAppend:
  reads the log, returns `fenced` on a fenced log, runs `check(state)` on every read before writing, returns
  `identical` for a slot with the same bytes, else creates `<next>.json` (`create` default: the strict create
  of 0b) and reads again when another writer took the name. T56 (`fence`'s callback) is not widened (Q6 b).
- `readClaim(attemptDir)` -> `{kind: 'none'|'session'|'tombstone', session_id}`; `claimRecord(sessionId)`;
  `tombstoneRecord(task, epoch)`: FX-CLAIM.
- `planAct(row, facts)` -> one act name, `none` and `owner` included: FX-PLAN.
- `liveness(rec, proc, markers)` -> `alive` | `dead` | `unknown` (FX-W1 step 1, built; branch L1, no
  lease): `dead` when `rec` is not an object (it names no process) or `markers` holds
  `markerKey(rec.pid, rec.start_time)` (a Set of keys, anything with `has`, or an array): an exit
  marker beats the process list. Else `proc.alive(Number(pid), start_time)`: true → `alive`, false →
  `dead`; null, an absent `alive` or one that throws → `unknown`. Never called inside a run-lock hold:
  the caller passes a list taken outside every lock (status: `listProc`); inside a hold the reader
  re-reads the record and keeps the verdict only while its bytes are unchanged.
  `exitMarkers(root)` -> the Set of keys of the names `run/arm/exited-<key>.json` present (names only,
  no parse: the strict create is all or nothing); a missing folder gives an empty set; `unarmed-*`, slot
  files and `*.tmp` names are not markers. Tested in `tcb/test/lib.test.mjs` (FX-W1 liveness).
- `realProc({timeoutMs, exe})`: unchanged; FX-W2 (built) passes `timeoutMs: ensure_query_ms` for the
  ensure's one list; a list cut by the timeout throws `proc-unavailable` {why: `ETIMEDOUT`}, which the
  ensure reads as unknown (tested in `tcb/test/watch.test.mjs`, FX-W2 confirm deadline).
- `withRunLock(root, {requireArmed})`: `requireArmed: true` runs the empty step `armedCheck(root, handle)`
  after the ce check: FX-W3 (exit 6 `not-armed`).
- `acquireLock`: the break of a lock judged stale passes `breakStep(c, doBreak)`. For run.lock it
  returns `doBreak()`. For watcher.lock (FX-W7 step 1, built) it takes run.lock with the caller's
  retries, re-reads watcher.lock and `watcher.json`, and breaks only when both are as they were at the
  judgement (`watcher.json` is read before the judgement); `progress` drops the verdict. The break of
  an unreadable lock does not pass there (LR-4 kept). Test W7a: a busy run lock → `lock-busy` 75 and
  both locks untouched; a holder that writes `watcher.json` during its judgement → not broken, the run
  lock taken and released; run lock free and `watcher.json` unchanged → broken under the run lock.
- `parseTranscript` (FX-W6): option `tail` and the result's non-enumerable `tail` and `kind`. The tail
  state `{n, last, msg, pending, bg}` (lib.mjs `tailState`) is moved only by `assistant` and `user`
  records; attachment and the 24 skipped types of `TRANSCRIPT_RECORD_TYPES` (and unknown types) are
  neutral, not unreadable; an attachment's `queued_command` prompt is read for task notifications.
  `transcriptKind`: nothing read → `model`; a pending tool use of the last call → `tool`; the turn ended
  (a stop_reason other than null, tool_use, pause_turn; or an interrupt notice) → `bg-wait` while a
  background task (toolUseResult `backgroundTaskId`, `taskId`, or `isAsync` with `agentId`) has no
  task notification and no TaskStop/KillShell/KillBash naming it, else `idle`; else → `model`. Tested
  in `tcb/test/watch.test.mjs` (W6a).
  `TRANSCRIPT_KINDS` = tool, bg-wait, model, idle; `TRANSCRIPT_RECORD_TYPES` = the 27 record types
  measured in `build/facts/WH5-Wturn.md`.
- `slotCount(rows, procList, transcriptsRoot, {root} = {})`: `{root}` is part of the signature; FX-CLAIM's
  callers pass it.
- `RUNTIME_FILES`: the 13 runtime files of the round-3 fixes (path, helper of `paths(root)`, fix, writer,
  fields, rewritten); `markerKey(pid, start_time)` names the arm markers `exited-<pt>`, `unarmed-<pt>`.

## FX-CLAIM (round 3)

`readClaim`, `claimRecord`, `tombstoneRecord`, `startLeaseExpired` (CONTRACT 4.10); `fence` reads the claim of attempt E for `nostart` (failure reasons, not host); `slotCount` step 7. Tests: lib T96x (step 7 and H3), T96y (the lease), T96z (claims).

## FX-PLAN (round 3)
- `planAct(row, facts)` -> one act string, first match (CONTRACT "FX-PLAN (round 3)"); pure.
- `planFacts(root, row, ctx)` -> its facts: claim, start.json, lease (`startLeaseExpired`), the outcome log's
  fenced reason, ready slots and tamper, the stop sample, `closesMissing`, the row's step-7 sessions; ctx gives
  ticksTotal, nowMs, lease, procList, counted, Hmax, zombieOver, blocked, audited.
- `slotCount`'s `opts.counted` (an array) receives `{task, epoch, session, claim, done}` per counted step-7 session.
- Tests: lib FX-PLAN T1 (the total table; committed at started is a todo until FX-CLOSE step 3), T2, T3.
