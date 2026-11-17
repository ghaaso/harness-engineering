# r3-changes: what each proposed fix needs (helper C, round 3, 2026-11-17)

Sources, revision 4 (both final):
- `F` = `model/as-built/FIX-fence.md` (section numbers: 0 table, 0b hook write, 1 FX-OUT, 2 FX-CLAIM, 3 FX-CGATE, 4 FX-CLOSE, 5 FX-REDO, 6 FX-PLAN, 9 probes, 10 open, 12 modeller).
- `W` = `model/as-built/FIX-wake.md` (headings: top tables, FX-W1..FX-W7, change log, For the modeller).

Nothing here is invented. Where a file names a change without a place, it is in section 10. Line numbers are those the design files cite (today's scripts).
Script abbreviations: lib = lib.mjs, hook = guard-hook.mjs.
Harness-fact numbering differs: F uses PROBE 1-12; W uses H1, H2, H4, H5, H7 (HARNESS-FACTS numbers 2, 4, -, 5, 8).

## 1. All fixes

"Attacked?" = was the last change attacked by a refuter.

| Id | Defects closed | Verdict (pass 3) | Last change (rev 4) attacked? | Depends on |
|---|---|---|---|---|
| 0b hook write (strict `exclusiveWrite`) | N5, C9, O5/X5 (as far as the hook controls), part of N1/N2 | Part of FX-OUT/CLAIM/CGATE (F 0b) | No (rev 3 primitive) | PROBE 6 (harness side), PROBE 12 (hard links; `selftest` answers) |
| FX-OUT | D4a, half-written READY, M6 gap, N1 | Stands with a change | No (rev 4: no slot/tombstone without a manifest, H1) | Q6 (both branches equal); PROBE 2, 3, 6, 9 |
| FX-CLAIM | D4b, D3 child backstop, RC gap, C1, C2/N7 | Stands | Rev 3 change yes (stands); rev 4 changed no step (H2 dependency stated) | PROBE 1, 7, 9; transcript-lag bound (PROBE 5); wake group's dead-man fix for H2 |
| FX-CGATE | D3, coordinator retry, CE gap for session tools and helpers, N2, N6 | Stands with a change | No (rev 4: "no such session" recorded as such, H3) | Q5 (both branches); PROBE 1, 4, 6, 7, 8, 10 |
| FX-CLOSE | D4c, N8 as probe condition | Stands with a change | No (rev 4: verify counts "no such session" only for own start or empty list match, H3) | Q5; PROBE 10; FX-CGATE; FX-PLAN |
| FX-REDO | A missing ledger line after a death | Stands | Yes (stands) | none |
| FX-PLAN | Planners' double start (status.mjs:542, watch.mjs:164), committed/started `bind` loop (status.mjs:543), Q5b wake loop (N9), N1 rest | Stands with a change | No (rev 4: owner rule ends, P1; `started` with no claim, P2) | Q5; FX-CLAIM lease; FX-CGATE `start.json`; FX-OUT log |
| FX-W1 | D1 (except a hard kill under L1), M1 superseded exits, endturn exit 2 hiding a dead alarm, reconcile exit 67, test-flag forgery | Stands with a change | **No** (allow-list, marker prune) | L1/L2; H2 (hook believed) |
| FX-W2 | M2 window; D6 paths 2, 3, 4; B2.2, B2.3, B1.4 | **Stands** | Yes (pass 3) | H1; S1/S2 |
| FX-W3 | D2 (an enforcer for each act); B1.1, B1.2 | Stands with a change | **No** (`unarmed` record) | H2; FX-W1 marker; FX-W2 `turn.json` |
| FX-W4 | D6 paths 1, 5, 6, 7; B3.2; B4.1; B4.5; B6.1 alert | Stands with a change | **No** (`watcher-busy.json`, 3 of 5, latency stated) | H4 A/B; owner install; FX-W5, FX-W7, FX-W3 inputs |
| FX-W5 | M3 gap; feeds B3.2 alert | **Stands** | Yes (pass 3) | R1/R2 |
| FX-W6 | D5 (slow call, waiting child, first tick), B5.2 bounded, B5.3 | Stands with a change | **No** (age cap uncharged act-due) | H5; B1/B2 |
| FX-W7 | D1b; restart loop on exit 67; two writers of watcher state; B6.1 | Stands with a change | **No** (copy of state, adopted after hold) | L1/L2; RL-yes/RL-no |

Verdict line for F: "Rev 4 changes only four points" (F status). P3, P4, P5 and the "one source for the fence's refusal rules" are open (F 10).

## 2. Probes first (check before building)

Each probe once. "Branch" = what follows if it is true / false.

| Probe | Fact | Fixes that lean on it | If true / if false |
|---|---|---|---|
| F-P1a | PreToolUse input carries `session_id` | FX-CLAIM step 1, FX-CGATE steps 2-6, FX-PLAN | True: build as designed. False: no claim, no coordinator identity; FX-CLAIM and FX-CGATE cannot be built (inferred; F does not give a fallback) |
| F-P1b | Exact `session_id` format | FX-CGATE `SID_RE` | Fix `SID_RE` (hex and hyphens, fixed length; INFERRED UUID) |
| F-P1c | Helper shares the id (a) or has its own (c) | FX-CGATE, FX-CLAIM | (c): every helper call denied; recorded open, protocol choice for the owner (F 3, 10) |
| F-P1d | Where helper transcripts live (N10) | FX-CLAIM step 7 (`slotCount`), FX-CLOSE verify (b) | Top-level `.jsonl` in the project folder: helpers counted as folder sessions (open N10) |
| F-P2 | Write input carries full `content` | FX-OUT hook step 3 | False: hook cannot copy READY bytes; FX-OUT has no hook half (inferred) |
| F-P3 | A helper's tool calls run the attempt's hook | FX-OUT | False: helper writes pass unchecked (inferred) |
| F-P4 | Session tools' input names the folder or target session | FX-CGATE steps 4-6 | False: `tool-not-allowed` (F 3 unknown cases) |
| F-P5 | Bound on transcript lag after a start (measure in pilot) | FX-CLAIM lease, step 7 | Bound known: Slots invariant. Unknown: Slots holds only "eventually within N_max"; modeller runs both readings (F 2) |
| F-P6 | What the harness does with a hook that times out or is killed | FX-OUT, FX-CLAIM, FX-CGATE (0b(c)) | "Lets it run": READY.json lands with no slot, work lost, attempt hangs and is charged; recorded open (F 1, 10) |
| F-P7a/b | `session_id` survives compaction and resume | FX-CLAIM, FX-CGATE | (b) false (id changes): child locked out of its attempt; coordinator locked out, recover from a terminal; recorded open (F 2, 3, 10) |
| F-P8 | Input carries `tool_use_id`; do duplicate hook entries run twice | FX-CGATE step 4 | No `tool_use_id`: repeated hook denied, start waits for lease, ends in a `crash` no-start fence (pace, not safety) |
| F-P9 | Matcher `*` runs the hook for every tool incl. MCP | FX-OUT, FX-CLAIM, FX-CGATE, FX-PLAN | A precondition; false breaks all hook-based fixes |
| F-P10a | Close "success" means the session process is gone (N8) | FX-CGATE step 6a, FX-CLOSE | False: verify can confirm while the session finishes its model call; recorded open |
| F-P10b | "No such session" is distinguishable (N4) | FX-CGATE step 6b, FX-CLOSE | False: every crashed child ends with the owner (stated trade; Q5a too) |
| F-P10c | A PostToolUse hook exists and response is readable | FX-CGATE step 6, FX-CLOSE | No: every close goes to the owner (F 4 unknown cases) |
| F-P11 | When several hooks answer, does a deny win | FX-CGATE, FX-W3 (both run in one hook) | Not stated; both designs assume deny wins (inferred) |
| F-P12 | `run/` and `wt/` support hard links | 0b(a) | `selftest` fails closed |
| W-H1 | A background exit reaches a session in a turn at its next tool call (observed) | FX-W2 | Observed true |
| W-H2 | PreToolUse hooks deny (believed, not observed) | FX-W1 allow-list, FX-W3 gating | CONTRACT section 7 needs-app item 1; observe a denial once (owner). False: every flag and gate denial fails |
| W-H4 | Only the owner, a child note, or the session's own background command wakes a session | FX-W4 | Derived from HARNESS-FACTS facts 1-2 |
| W-H5 | Kinds of transcript record (believed) | FX-W6 `parseTranscript` | False: kind detection fails; a transcript that cannot be read counts as `model` |
| W-H6 | What Windows logs for a suspend | M5 gap reader (withdrawn) | Check H6, then a reader that counts suspended time out of a tick (W open table) |
| W-H7a | PC sleeps after 15 idle min unless a turn runs; keep-awake lapses about 5 min after idle (HARNESS-FACTS 34-36) | FX-W4 timing | Quoted fact |
| W-H7b | Whether timers count while the PC sleeps | FX-W4, M5 gap, ALARM_FIRE timer branches a/b | One measured suspend with a running alarm (owner). Model runs both branches |
| W-toast | A toast from a scheduled task shows; anyone reads it | FX-W4 branch B | Branch A needs an app-level scheduled session (not in HARNESS-FACTS) |
| W-helpers | Profiles' `bash` grammar for helpers started through the coordinator's Agent tool (checker, mapper) | FX-W1 step 5 | Read the profiles; whether a test flag can reach a script through them |
| W-allow | Allow-list content vs each script's spec of production calls | FX-W1 step 5 | One targeted check each (flag left off blocks coordinator; test flag left on reopens forgery) |

## 3. By script

Order within a script: as given. "(F)" / "(W)" = source file.

### tcb/lib.mjs

| Fix | Place (cited) | Change |
|---|---|---|
| 0b | `exclusiveWrite` 659-710; folders 660; fallback 676-688 | Options arg `{strict}`: no fallback (throws `no-hardlink`), no parent creation (`no-parent`) (F 0b) |
| 0b | `fsRetry` 162-173 | New `budget` arg = time left to `hook_deadline_ms` (thresholds.json:52, 5000) (F 0b) |
| FX-OUT | new | `outcomeState(attemptDir,row)` (rules R-a, R-b, R-c) and `outcomeAppend` (F 1) |
| FX-OUT | `lib.fence` callback 1774 | Becomes the log check (Q6a widen) (F 1) |
| FX-CLAIM | new | Claim helpers (strict create of `claim.json`) (F 2) |
| FX-CLAIM | tasks schema; `lib.fence` 1773, 1785-1791, 1782 | `nostart` field, counted and charged for `FAILURE_REASONS` only; reset to 0 on a session claim; `host` unchanged (F 2 step 2) |
| FX-CLAIM | `lib.slotCount` 3063-3102 | +1 `unconfirmed` per folder session without a done file and not the claim holder of a stop-confirmed attempt (F 2 step 7) |
| FX-CLAIM | thresholds | `H_nostart` (default 2), `start_lease_ticks`, `start_lease_ms` (F 2) |
| FX-CLOSE | tasks schema; thresholds | `verify_rounds`; `stop_verify_ms` (F 4) |
| FX-PLAN | new | `planAct(row, facts)`, used by status `nextOf` and watch `rowAct` (F 6) |
| FX-W1 | beside 1202 | `liveness(rec, proc, markers)` (W) |
| FX-W2 | `realProc` 2755-2759 (fixed 30 s) | Timeout argument (`ensure_query_ms` 10 s) (W) |
| FX-W2 | thresholds | `ensure_query_ms`, `release_ms`, `arm_confirm_ms`, `alarm_slots` (W) |
| FX-W3 | `withRunLock` 1463-1472 | Option `{requireArmed: true}`; not armed gives exit 6 `not-armed` (W) |
| FX-W6 | `parseTranscript` tail | Return the kind (`tool`, `bg-wait`, `model`, `idle`); thresholds `idle_ticks`, `attempt_max_ticks` (W) |
| FX-W7 | `acquireLock` 1315-1328, 1366-1369 (for `watcher.lock`) | Break only under the run lock after re-reading bytes; thresholds `watcher_lock_try_ms`, `busy_alert_ticks`, `watcher_lease_ticks` (L2) (W) |
| FX-W1 (L2) | thresholds | `lease_ms`, `beat_ms` (W) |
| FX-W7 (RL-yes) | thresholds | `run_lock_lease_ms` (W, R5 text) |
| FX-W5 | thresholds | `stuck_raises` (3) (W) |

### tcb/guard-hook.mjs

| Fix | Place (cited) | Change |
|---|---|---|
| FX-OUT | new step after 459; checks at 412-459, 394-409, 93, 130-145 | Child Write/Edit: Edit to READY denied `ready-write-only`; Write to READY checked (`checkFormat('ready')`, task, epoch, step in `row.steps`, `repair` marker allowed with no slot); read log; fenced -> deny `attempt-fenced`; create ready slot (F 1 child steps 1-4) |
| FX-CLAIM | `parseInput` 210-226; after 409 | Keep `session_id`; check `SID_RE`; strict-create `claim.json`; deny `attempt-claimed` / `attempt-cancelled` (F 2 step 1) |
| FX-CGATE | coordinator path (step 4 skipped today, 394); `SID_RE`; TASK_RE/EPOCH_RE at 27-28 | Coordinator branch: bind call (after profile and Bash grammar checks 412-413, 519-521), current-ce check, session-start tool `start.json`, session-stop PreToolUse intent, PostToolUse mode for done; name validation (`bad-target`) (F 3 steps 2-6) |
| FX-W1 | `checkTcbNode` 315-353 | Per-script allow-list of production flags; any other `--` token refused `flag not allowed` (W FX-W1 step 5) |
| FX-W3 | coordinator branch | Deny the session-start tool when not armed (file predicate) (W FX-W3) |
| 0b | all hook writes | Use strict create with budget (F 0b) |

### tcb/replace.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readyValid` 183-201 | Removed (F 1 Changes) |
| FX-OUT | M6 block 473-477, fence 451-522 | Replaced by fence steps 1-7 (retry path, refusal checks before any write, no slot without manifest, ready check, fenced slot, tombstone, CAS) |
| FX-OUT | `predictFence` 400-426 | Also called in the real run, not only dry run |
| FX-OUT | `start` | Create `outcome/` with the manifest |
| FX-CLAIM | fence | Strict-create tombstone at FX-OUT step 6 (attempt with manifest); `nostart` handling |
| FX-CLAIM | bind 976-1013 (987-998) | No claim: exit 6 `not-claimed`; holder not S: exit 1 `not-claim-holder` |
| FX-W3 | `underLock` 271-277 | `requireArmed` on `start` and on fence reason `first` |

### tcb/commit.mjs, tcb/stop.mjs, tcb/handover.mjs, tcb/fsck, tcb/render.mjs, tcb/selftest

| Fix | Script and place | Change |
|---|---|---|
| FX-OUT | commit.mjs 674-694 | Read the outcome log (refuse when fenced) |
| FX-CLAIM | stop.mjs 283-302 | Tombstone confirms at once; otherwise request names the claim holder |
| FX-CLOSE | stop.mjs 278-283 (guard 277-279), 426-449 | `stop request` accepts committed && started; `stop verify` rules (a)(b)(c), `verify_rounds`; escalation to owner at 3 (stop.mjs 405-418 is today's list-unavailable exit 2, cited, not changed) |
| FX-W6 | stop.mjs | B2 only: one refund (place not given, see section 10) |
| FX-CGATE | handover.mjs 209-213 (`init`), 338-343 (`raise`), 351-353 (brief line), bind 371- | `successor_nonce` into `coord.json`; nonce in the brief line; bind checks nonce, copies session, clears nonce |
| FX-W3 | handover `briefLine` 351-354 | Carry the new coordinator brief |
| FX-OUT | fsck | Gapless log, slots parse, nothing after a fenced slot |
| FX-REDO | fsck; render.mjs:625 | Fsck warns about missing lines; render orders by epoch when `redo` is set |
| 0b | selftest | Check hard-link support in `run/` and `wt/`, fail closed |
| FX-CGATE | `init` | Creates `run/close/intent`, `run/close/done`, `run/` (0b(b)) |

### tcb/watch.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readReady` 118-121 | Read the log via `outcomeState` |
| FX-PLAN | `rowAct` 135, 157-165 | Delegate to `planAct`; transcript-visible branch 157-164 goes |
| FX-W1 | `runAlarm` exits 776-795 | Write `run/arm/exited-<pid>-<start_time>.json` before every exit (30, 0 superseded, 64, errors); L2: beat renewal |
| FX-W2 | new flags | `--ensure`, `--nonce`; `runAlarm` ensure steps 2-4, 8 |
| FX-W3 | `runAlarm` | Slot record gets `turn_seq_at_reg`; on fire write `unarmed-<pid>-<start_time>.json` if `turn.json.turn_seq` unchanged |
| FX-W5 | `rowAct`, evaluate | `rowAct` null for owner-owned rows (also S:523); re-raise at `min(15 x 2^b, 60)` ticks; `stuck_count`, `watcher.json.stuck` |
| FX-W6 | `evaluate` 347-421; `freshTaskState` | Fresh-epoch tick uncounted; per-kind deadlines (tool timeout+12, bg-wait 60, model 10); `idle-child` act-due at 30; `age-cap` act-due |
| FX-W7 | `evaluate` 627-668; `loadWatcherState`; W:725, 730-733 | Evaluate `structuredClone(state)`, adopt after hold; short-wait run lock; busy tick drops copy and writes `run/watcher-busy.json`; quarantine corrupt state |

### tcb/status.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readReady` 326-334 | Read the log |
| FX-CLAIM | reconcile 263-322 (`setSession` 319-322) | Claim -> `started`, session from the claim; other folder session = anomaly `duplicate-session` |
| FX-CLAIM | stop (see stop.mjs) | n/a |
| FX-CGATE | owner act `closed` | `--act closed --subject <sid> --quote-file P`: check `SID_RE`, write done with `outcome: "owner"`, add owner line |
| FX-PLAN | `nextOf` 520 | Delegates to `planAct` |
| FX-W1 | `runEndturn` 643-658; `computeStatus` 353-354 | Three-state report (exit 1 dead, 2 unknown and none dead, 0); `readLoose`; corrupt = `state-corrupt` anomaly |
| FX-W2 | `runBuild` (both holds), `--arm-nonces`; `armAtStart` 593-602 | Add the flag; write `run/turn.json`; wait; remove `armAtStart` |
| FX-W3 | endturn | K = `turn.json.read_seq`, then `arm = spent` |
| FX-W4 | new mode | `--deadman --root R` (read-only, writes `run/deadman.json`) |
| FX-W4 | status view | Anomaly `deadman-nowake` |

### tcb/admit.mjs, tcb/lib.mjs-adjacent

FX-CLAIM step 7 says "admit and handover" run `slotCount`; no change to admit.mjs is named beyond using the new count (see section 10).

### New files

| Fix | File | Content |
|---|---|---|
| FX-W3 | `tcb/briefs/coordinator.md` | New coordinator brief (R6 acts A1-A6) |
| FX-W4 | `tcb/settings/deadman-task.xml` | Task template, WakeToRun true |
| FX-W1 | `.gitignore` | Add `run/arm/` |
| FX-OUT | `wt/<T>-e<E>/outcome/<j>.json` (runtime) | Slots |
| FX-CLAIM/CGATE | runtime files | `claim.json`, `start.json`, `run/coord-session-<ce>.json`, `run/close/intent/`, `run/close/done/` |
| FX-W2/W3/W4/W7 | runtime files | `run/arm/slot-<k>.json`, `run/arm/<nonce>.json`, `run/arm/exited-*.json`, `run/arm/unarmed-*.json`, `run/turn.json`, `run/deadman.json`, `run/watcher-busy.json` |

## 4. CONTRACT and spec

| Where | Change | Fix |
|---|---|---|
| CONTRACT 1.1 | (none named) | - |
| CONTRACT 1.2 | Amended R5 sentence, L2 only | FX-W1 |
| CONTRACT 1.4 | Wake and arm text | FX-W1, W2, W3, W6 |
| CONTRACT 2.1 | Dead-man | FX-W4 |
| CONTRACT 3.6 (338-344) | Outcome log; claim; stop for committed/started (341) | FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE |
| CONTRACT 3.9 | Exit markers, arm files | FX-W1, W2, W3 |
| CONTRACT 3.10 and 4 | Watcher lock under run lock | FX-W7 |
| CONTRACT 3.12 | Outcome log / READY copy | FX-OUT |
| CONTRACT 3.20 | Hang deadlines | FX-W6 |
| CONTRACT 4.6 (770-785) | READY / M6 text | FX-OUT (Q6) |
| CONTRACT 4.10 | Claim | FX-CLAIM |
| CONTRACT 8.20 | Hook writes: exclusive creates only | FX-OUT, FX-CGATE |
| CONTRACT, new section | Outcome log | FX-OUT |
| CONTRACT `coord.json` | `successor_nonce`, `coord-session-<ce>` | FX-CGATE |
| CONTRACT R6, R8, R10, R12 | R6 acts; R8 and R10 claim and slots; R12 coordinator hook | FX-CLAIM, FX-CGATE, FX-W2..W4 |
| CONTRACT R5 | Amended text (L2) and deadlines in ticks | FX-W1, FX-W6 |
| CONTRACT decision 41 | Arm and dead-man | FX-W2, W3, W4 |
| CONTRACT class 17 (CONTRACT.md:97) | "Steps first match" text | FX-PLAN |
| spec/lib | Matching entries (T56 for Q6a) | FX-OUT, FX-CLAIM, FX-PLAN, W-fixes |
| spec/ for replace, stop, status, commit, guard-hook, handover, watch | Matching entries (F: "Matching entries"; W: spec of production flags per script for the allow-list) | all |
| spec: table test | Enumerate (state, step) x {claim, start, lease, Q5}; one act, script guard accepts; fails on (b) today | FX-PLAN |
| spec: stop | Verify rules | FX-CLOSE |
| spec: hook | Allow-list per script | FX-W1 |

## 5. Briefs, profiles, hooks, owner-installed parts

| Item | Change | Fix |
|---|---|---|
| Child brief `child.md:41` | READY is a copy; log decides. Add: "if every tool is denied `attempt-claimed` or `attempt-cancelled`, end your turn" | FX-OUT, FX-CLAIM |
| The four helper briefs | READY wording (F 1 Changes, names not given) | FX-OUT |
| Coordinator brief (`tcb/briefs/coordinator.md`, new) | R6 acts: reconcile first, arm via `--ensure`, act on status.json at exit 17, retry nothing on exit 75 | FX-W3 (closes D2) |
| Handover brief line (`briefLine` 351-354) | Carries the nonce and the brief | FX-CGATE, FX-W3 |
| `settings/coordinator.json` | A PostToolUse entry for session stop | FX-CGATE |
| `settings/child.json` | Hook 30 s timeout cited (line 43); no change named | - |
| `profiles/coordinator.json` | Name session-tool prefixes (Q5a); line 46 `tcb-node` grammar is the only place with `bash` | FX-CGATE, FX-PLAN (Q5b detection reads it) |
| Helper profiles (checker, mapper) | Read only; `bash: none` elsewhere | FX-W1 (open) |
| Hooks | Child hook gets READY/claim steps; coordinator hook gets bind, start, stop, allow-list, armed gate | FX-OUT, CLAIM, CGATE, W1, W3 |
| Owner installs | Scheduled task, 5 min, logged-on only, wake the computer to run (required), wake timers allowed, also run at logon | FX-W4 |
| Owner runbook line | Coordinator dead or locked out: owner runs drain and `handover raise` from a terminal, then starts the successor with the brief line | FX-CGATE |
| Owner acts | `status owner --act closed --subject <sid> --quote-file P` | FX-CGATE, FX-CLOSE |
| Owner checks | Observe the hook denying a call once; test toast; one measured suspend; H6 check; read helper profiles' bash grammar | W open table |

## 6. New tests

| Fix | Test (one line) |
|---|---|
| 0b | `selftest` hard-link check in `run/` and `wt/`; strict create throws `no-hardlink` / `no-parent`; hook denies when budget runs out |
| FX-OUT | Hook slot: READY write creates a ready slot; fenced slot denies `attempt-fenced` (F 1 steps) |
| FX-OUT | Fence with refusal (`stale-epoch`, `wrong-step`, `hmax`) writes no slot |
| FX-OUT | Fence of a parked row (no manifest) writes no slot and no tombstone (FX_OUT_MANIFEST, schedule 1) |
| FX-OUT | Torn tainted fence then commit refuses (R-a, schedule 7); R-b uncommitted ready slot |
| FX-OUT | fsck: gapless log, parse, nothing after fenced |
| FX-CLAIM | Second session denied `attempt-claimed`; tombstone denies `attempt-cancelled`; bind to loser exit 1 |
| FX-CLAIM | Failure no-start loop capped by `H_nostart`; handover reasons uncharged (schedule 8) |
| FX-CLAIM | Lease needs ticks and wall time; `--once` cannot expire it |
| FX-CGATE | Bind by nonce, wrong first binder denied; stale session read-only |
| FX-CGATE | Forged close names denied (`bad-target`); start with repeated `tool_use_id` allowed; different one denied `start-issued` |
| FX-CGATE | Post hook writes `done` only on success or "no such session" with `by` |
| FX-CLOSE | `stop request` accepts committed/started; verify confirms only per (a)(b)(c); "no such session" counted only for own start or empty list match |
| FX-REDO | Each repeat call completes a missing ledger line only at the exact post-state, via the fs seam (lib.mjs:155) |
| FX-PLAN | Total-table spec test (one act per (state, step), script accepts); started-before-claim waits; Q5b gives `owner` |
| FX-W1 | Exit marker written on every alarm exit; flag allow-list refuses `--once`, `--boot`, `--tick`, `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake`; marker prune only when no slot names it |
| FX-W2 | Ensure and reconcile: reused nonce harmless; confirm deadline 45 s vs 10 s query; second reconcile keeps `confirmed` |
| FX-W3 | `not-armed` exit 6 on `replace start` and `first`; revocation never gated; `unarmed` record written |
| FX-W4 | Dead-man alerts: `runs_no_alarm`, 3 of 5 list failures, stuck, `busy_ticks`, `unarmed_turns`; alerts once per onset |
| FX-W5 | Re-raise interval and `stuck_count` |
| FX-W6 | Per-kind deadline; idle becomes act-due; age cap uncharged |
| FX-W7 | Watcher lock break only under run lock; busy tick drops state copy, no duplicate append, hang count not advanced |
| Model checks (W/F "For the modeller") | One run with all fixes on; one ablation per fix; sub-flag ablations FX_OUT_MANIFEST, FX_CLOSE_NOSUCH, FX_PLAN_OWNEREND, FX_PLAN_STARTWAIT, FIX_MARKER_PRUNE, FIX_UNARMED_REC, FIX_BUSY_FILE, FIX_LIST_WINDOW, FIX_AGE_ASK, FIX_TICK_COPY, FIX_FLAG_ALLOWLIST; F's 14 and W's 18 final schedules |

## 7. Depends on the owner's ruling

The six open questions of section 16 point 9 (lines 1187-1194), then property choices from the design files.

| Question | Fixes touched | What each branch changes |
|---|---|---|
| U3-F8 mapper: task role or helper | none in F or W (W lists helpers through Agent tool as open) | (a) drop mapper from coordinator agent types; (b) second profile anchored at the root. Not touched by a fix; the W open row on the checker and mapper profiles is related |
| U2-F2 harvested cards URL-checked | none | not touched |
| U5-PF-1 draft file hash in the owner line | none | not touched; FX-CGATE owner act `closed` is a different owner line |
| LR-4 unreadable lock reported | FX-W7 (stuck run lock), FX-W4 reads busy state | (a) a lock-unreadable anomaly; (b) none (library breaks such a lock about 30 s). Neither design resolves it; W's RL-yes/RL-no is the related choice |
| Coordinator session tools (this is Q5) | FX-CGATE, FX-CLOSE, FX-PLAN, FX-CLAIM | Q5a: coordinator hook gates start and stop tools (steps 4-6), prefixes named in `profiles/coordinator.json`. Q5b: steps 1-3 and 7 only, tools stay refused, FX-PLAN answers `owner` for start/stop (N9) |
| M6 library half (Q6) | FX-OUT | (a) log check moves into `lib.fence`, replace.mjs:473-477 goes; (b) replace runs steps 1-5 before `lib.fence`. Behaviour the same |

Property choices left to the owner (W "Owner branches"; F 3, 10):

| Choice | Fixes | Branches |
|---|---|---|
| L1 / L2 | FX-W1, FX-W7, FX-W2 | L1: no lease, hard kill under u open, R5 unchanged. L2: lease with `lease_ms`, `beat_ms`, `watcher_lease_ticks`; amended R5 |
| S1 / S2 | FX-W2 | S1: one slot, death after alarm wake leaves no source. S2: two slots, slot 2 period 1.5 x `alarm_ms` |
| B1 / B2 | FX-W6 | B1: stated bound per kind and age cap. B2: one refund per task, RestartLimit restated R + 1 |
| R1 / R2 | FX-W5 | R1: re-raise. R2: as built |
| RL-yes / RL-no | FX-W7 | Run-lock lease while the list is unknown (R5 text) or not |
| H4 A / B | FX-W4 | A: app-level scheduled session messages coordinator. B: toast. Model unchanged |
| H7 a / b | FX-W4, M5, FX-W6 | Whether timers count during sleep; a fact, both run |
| PROBE 1(c) | FX-CGATE | Helper ids: protocol choice for the owner |
| Q5 / Q6 | see above | |

## 8. Open after this round

F section 10:

| Id | Defect | Reason |
|---|---|---|
| G6 | `plan/` Write in flight across a raise | Needs the write fenced; no small change |
| O5 / PROBE 6 | Harness lets a timed-out hook's tool run | Harness side unknown |
| C4 / G4 / PROBE 7(b) | `session_id` changes on compaction | No stable identity |
| PROBE 1(c) | Helpers with their own ids | Protocol choice |
| N8 / PROBE 10(a) | Close "success" not a stop | Harness semantics |
| N4 / PROBE 10(b) false | Crashed children go to owner | Stated trade |
| N10 | Helper transcripts counted as sessions | PROBE 1 |
| H2 | Watcher dead: lease never expires | Wake group's dead-man fix (see section 10, first item) |
| P3 | Table test does not cross log state, manifest, `verify_rounds` | Outside rev 4 |
| P4 | Old watcher keeps old planner after an upgrade | Outside rev 4; options: exit on `tcb_commit` change, or upgrade requires a raise |
| P5 | No owner supersede path for a refused fence-pending row | Unreachable without owner act; hand edit |
| Fence rules | `predictFence` and `lib.fence` two copies | Outside rev 4; one function or agreement test |
| FX-OUT not covered | A READY whose outputs commit rejects blocks untainted fences; O7 READY not a snapshot; PROBE 6 "lets it run" | F 1 |
| FX-CLAIM not covered | Duplicate's tokens before first tool call | F 2 |
| FX-CGATE not covered | G6; window between allow and effect for a start; PROBE 1(c), 7(b) | F 3 |
| FX-PLAN not covered | Start record lost by a skipped hook (PROBE 9) | F 6 |
| Schedules 5 and 6 (F 12) | Rollout old watcher (P4), watcher dead during lease (H2) | Expected to fail; report as open/dependency |

W open table (13 rows):

| Defect | Reason |
|---|---|
| Hard-killed alarm during list outage, L1 | Marker only written by a running alarm; closes in L2 or FX-W4 `runs_no_list` alert |
| Suspends shorter than 2 Delta counted as ticks (M5 gap, branch b) | H6 unchecked; schedule 15 fails in branch b |
| Do timers count during sleep (H7 b) | Not in HARNESS-FACTS |
| Alert reach (toast, branch A) | Unverified |
| One failure shared by every program start | Dead-man is itself a program start; needs an off-PC channel |
| Dead-man task missing or disabled | Only an anomaly shows it |
| Child imitating activity (B5.2) | Age cap only asks |
| Healthy operation beyond kind deadline (D5 in B1) | Ping withdrawn; B1 or B2 |
| Script cannot know which status.json the model read | Limit of a file interface; accepted |
| Every flag denial rests on the hook (H2 believed) | Needs-app item 1 |
| Helpers' profiles (checker, mapper) | Not checked |
| The allow-list's content | New artefact, not attacked |
| `stuck` alert takes about 4.75 h | Bounded by FX-W5 cap; owner (stated in R6) |
| 10 s process query times out under load | Makes L1 hard-kill row more frequent; L2 or longer timeout |

Also in W: the model's "Not run" list (schedule 4 with extra `sp`; schedule 15 with B2 second episode; each-flag-alone matrices) and the final-schedule rows marked "fails (open)": 4 (L1) and 15 (timer branch b).

## 9. Reported follow-up, not a protocol defect

`e2e/run-e2e.mjs` fails when the folder that holds the scripts has a path longer than 114 characters. Its setup runs `git add tcb` without `-c core.longpaths=true` and does not check the result.

Fix:
- pass the switch on every git call of that script;
- check the result of the add;
- add a test that runs the setup from a deeper folder.

Reported by the main coordinating session on 2026-11-17; evidence in its scratchpad as `coord/verify-clone-164df64.txt`. Source for this item is the task text only, not a design file.

## 10. Unclear in the design files

1. **Dead watcher and the lease (F 2 "Rev 4 dependency H2", F 10 H2, F 12 schedule 6) versus W (FX-W4, FX-W7).** F says the lease stall rests on "the wake group's dead-man fix (D1/D6)". W's dead-man only alerts (H4 says it cannot reset its subject), and under L1 nobody restarts a dead watcher (FX-W7). So the lease freeze while the watcher is dead is not closed by W; only the owner is told. Decide whether F's dependency is met by an alert.
2. **Briefs named without a place:** "the four helper briefs" (F 1 Changes) are not named; only `child.md:41` has a line.
3. **`profiles/coordinator.json`, change "Q5" (F 3 Changes):** what to add (session-tool prefixes) is not given; F 6 says Q5b is detected by their absence.
4. **CONTRACT sections:** F names "an outcome-log section" with no number. FX-W3/FX-W2 name "R6 and decision 41" with no text. FX-W1's section 1.2 (L2 only) text is only the R5 sentence. CONTRACT 3.12 is named without content beyond "FX-OUT".
5. **stop.mjs for B2 (W FX-W6 Changes):** no line or step given for the refund.
6. **FX-W1 prune of `run/arm/`:** the daily prune is described as "mine, rev 2", but no script is named that runs it.
7. **`admit` (F 2 runners, step 7):** "admit and handover" run the new `slotCount`; no change to admit.mjs or its line is named.
8. **`spec/` entries:** both files say only "Matching entries"; the spec files per fix are not listed except the table test and stop.
9. **Hook conflict between two fixes in one hook:** W FX-W3 says FX-CGATE's checks run in the same hook and a call is denied if either denies; F's PROBE 11 (does a deny win) is the unchecked fact behind that. Not listed as a dependency in W.
10. **FX-PLAN step 5 versus FX-W3 gate:** F's planner orders `start-session` when there is no `start.json`; W gates the session-start tool on "armed". A not-armed coordinator is then asked to start and refused. W does not say what the planner answers. The two files do not discuss this.
11. **`rowAct` is edited by three fixes (FX-PLAN, FX-W5, FX-W6) and `lib.fence`/`withRunLock`/`acquireLock` by several; no order is given between them.** The order in section 3 follows the source files, not a stated dependency.
12. **F's section 12 flag lists:** FX_CLAIM_WALL and FX_CGATE_NAMES/TUID are rev-3 flags kept; the final 14-schedule table and the rev-3 13-schedule table use different numbers (stated in F). Not a conflict, but the modeller must use the 14.
13. **Test location:** neither file says where the table test, the dead-man tests or the allow-list check live (file names).
