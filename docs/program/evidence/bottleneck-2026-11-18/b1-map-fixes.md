# b1: map of the thirteen fixes and 0b, for the decision rule

Read only. Nothing built or run. Made 2026-11-18.
Short names: S17 = `research-tree/notes/section17-draft-2026-11-17.md`; FF = `research-tree/FAULTS-AND-FIXES.md`;
SH = `research-tree/START-HERE.md`; WCP = `E:write-collision-points.md`; SWO = `E:several-writers-options.md`;
E = `docs/program/evidence/harness-method-status-2026-11-18/`; TJ = `research-tree/tcb/thresholds.json`.
`research-tree/BUILD-PLAN.md` does NOT exist (checked). Script names are without `tcb/` and `.mjs`.
Files and functions come from WCP table A (line numbers there are today's lines of the scripts, which are unchanged).
S17 gives the design rows at lines 247-260 (design table), 341-357 (model rows), 510-526 (rule sentences).
Library lookups: r57-0401, r57-0403, r57-0128, r57-0112, r57-0113 all exist (read; used in F-notes below).

## 1. Table

Columns last: A = admission or gating, L = lane or check queue, C = counts of lanes or concurrency,
K = claims, locks, fences, T = cost or tokens, H = handover. "none" = none of the six.

| id | fault it fixes | files and functions it changes | S17 line | touches |
|---|---|---|---|---|
| 0b | a hook write that falls back or waits; hard links | lib `exclusiveWrite` (strict), `fsRetry` (budget arg); guard-hook (arg on every hook write call); selftest (hard-link check) | 247 | K: strict exclusive create. Else none |
| FX-OUT | READY raced by a fence (D4a); half-written READY | lib `outcomeState`, `outcomeAppend`, `fence`; guard-hook `decideInner` write branch; replace `readyValid` (removed), `modeFence`, `predictFence`, `modeStart`; commit `recordPass`; watch/status `readReady`; fsck | 248 | K: log of write-once slots, fence order, ready-wins. A: refusal checks before a fence. Else none |
| FX-CLAIM | two sessions for one attempt (D4b); late transcript | lib claim helpers, `fence` (`nostart`), `slotCount`; task-row schema; TJ (`H_nostart`, `start_lease_ticks`, `start_lease_ms`); guard-hook `parseInput`, `decideInner` child gate; replace `modeFence`, `modeBind`; stop `modeRequest`; status `applyReconcile`, `computeStatus`; handover `doRaise`; admit (callers of `slotCount`); briefs | 249 | K: `claim.json`, tombstone, lease. C: `slotCount` counts folder sessions (step 7). A: planner waits on the lease. H: `doRaise` gets `{root}`. T: charge to restart count R, not tokens |
| FX-CGATE | stale coordinator starts a session (D3); retry; helpers | guard-hook `decideInner` coordinator branch, PostToolUse mode, `PROFILE_KEYS`/`toolListed`; handover `doInit`, `doRaise`, `briefLine`, `doBind`, `RUN_DIRS`; status `runOwner`, `ACTS`; settings/profiles coordinator.json | 250 | A: gate on session start and stop. K: ce fence, `start.json`, one-time nonce. H: nonce hand-over, `doBind`. Else none |
| FX-CLOSE | committed child keeps its slot (D4c) | stop `modeRequest` guard, `modeVerify`; task-row schema (`verify_rounds`); TJ (`stop_verify_ms`) | 251 | C: frees a slot only after verified close. K: none. Else none |
| FX-REDO | missing ledger line after a death | fsck (check); render `main` (order by epoch); repeat-call branches in replace, status, stop (named by file only) | 252 | none |
| FX-PLAN | planners start twice; `bind` loop; Q5b wake loop | lib `planAct` (new); status `nextOf`; watch `rowAct` (becomes a filter) | 253 | A: one planner decides next legal act, with expectations. C: indirect (a start waits on its own expectation). Else none |
| FX-W1 | superseded alarm loop (D1); exit 2 hides dead alarm; test-flag forgery | lib `liveness`; guard-hook `checkTcbNode` (allow-list); watch `runAlarm` (exit marker); status `runEndturn`, `computeStatus`, `runBuild` hold 2 (prune `run/arm/`); TJ (`lease_ms`, `beat_ms`, L2); handover `GITIGNORE_LINES` | 254 | A: flag allow-list on the coordinator. C: alarm-process count (markers). H: handover file lines only. Else none |
| FX-W2 | turn dies before the alarm is armed (M2; D6 2,3,4) | lib `realProc` timeout; watch `FLAGS`, `runAlarm` (ensure, slot registration); status `runBuild`, `armAtStart` (removed), `turn.json`; TJ (`ensure_query_ms`, `release_ms`, `arm_confirm_ms`, `alarm_slots`) | 255 | C: `alarm_slots` (S1 one, S2 two alarm slots). K: arm nonces. Else none |
| FX-W3 | no enforcer for "armed before work" (D2) | lib `withRunLock` (`requireArmed`); replace `underLock`, fence hold step 1; guard-hook coordinator branch; handover `briefLine`; watch `runAlarm`; status `runEndturn`; briefs/coordinator.md (new) | 256 | A: work-creating acts need an armed turn. K: `withRunLock` option. H: `briefLine`. Else none |
| FX-W4 | all wakes lost; only the owner can wake (D6 1,5,6,7) | status `--deadman` (new), `computeStatus` anomaly `deadman-nowake`; TJ (`realert_runs`); settings/deadman-task.xml (new) | 257 | none of the six (an alert outside the tree; paces by runs and minutes) |
| FX-W5 | act-due raised once, then silent (M3) | watch `rowAct` step 1, `evaluate` act-due set; TJ (`stuck_raises`) | 258 | none (re-raise at capped interval; shares `rowAct` with FX-PLAN) |
| FX-W6 | healthy slow call taken for a hang (D5) | lib `parseTranscript` (returns kind); watch `evaluate`, `freshTaskState`; TJ (`idle_ticks`, `attempt_max_ticks`); stop `modeVerify` (B2 only, not designed) | 259 | none for A/L/C. T: B2 refunds one restart charge, not tokens |
| FX-W7 | two writers of watcher state; restart loop on exit 67; hung run lock | lib `acquireLock`; watch `evaluate` (state copy, adopt after hold), `loadWatcherState`, `runWatcher`; TJ (`watcher_lock_try_ms`, `busy_alert_ticks`, `watcher_lease_ticks`, `run_lock_lease_ms`) | 260 | K: watcher lock under the run lock, leases. C: one watcher. Else none |

## 2. Findings

Format: claim | path:line | exact quote (at most 15 words).

What 0b is:
- F1. 0b is a shared primitive, "strict hook write", counted under FX-OUT, FX-CLAIM, FX-CGATE | S17:247 | "exclusive create with no fallback (part of FX-OUT, FX-CLAIM, FX-CGATE)"
- F2. 0b has no model flag; it is merged into each hook step | S17:311 | "merged into each hook step with no flag of its own"
- F3. Rule sentence R13 says what the hook may do: no lock, strict create only | S17:525 | "The guard-hook takes no lock and writes only by strict exclusive create"
- F4. 0b's code places: `exclusiveWrite` strict option and `fsRetry` budget argument in lib | WCP:15 | "`exclusiveWrite` 659-712 (strict option); `fsRetry` 166-176 (budget argument)"
- F5. 0b is also the place several writers collide: its arguments sit in the calls OUT, CLAIM, CGATE add (B4) | WCP:92 | "SAME: 0b's arguments sit in the calls the other three add"
- F6. In the build plan 0b is built first; with 0b as a library option the largest one-writer-per-statement set is 8 | WCP:155 | "8 (6 sets), for example {0b, OUT, CGATE, CLOSE, REDO, PLAN, W2, W6}"
- F7. The earlier record chose "0b first, then a skeleton change" (hypothesis, untested) | SWO:13 | "Chosen: 0b first. Then one \"skeleton\" change fixes the interfaces"

Numbers in the fixes that set a concurrency, lane count, threshold or budget, with origin:
- F8. N_max = 2 live child processes; a guess until memory is measured; not changed by any fix | TJ:14 | "live child processes until memory is measured (design R10)"
- F9. Restart budget R = 1; source "guess"; FX-CLAIM and FX-W6 B2 change how it is charged, not its value | TJ:10 | "attempts replaced after a failure (design R8)"
- F10. New thresholds of the fixes ship as guesses until the pilot measures them | FF:68-69 | "So the fixes' new thresholds ship as marked guesses"
- F11. Admission reservation and hand-over windows are derived in the record (not by the fixes) | FF:68 | "The record derives the hand-over windows, the admission reservation and the cost law."
- F12. Hang threshold h = 10 ticks (about ten minutes); the model's H_HANG = 2 stands for it; origin: as-built script | S17:229 | "H_HANG = 2 stands for h = 10, about ten"
- F13. FX-W6 per-kind deadlines in ticks: tool timeout + 12, background wait 60, model call 10; designer's proposal, B1 premise unmeasured | S17:515 | "a tool call: its timeout + 12; a background wait: 60; a model call: 10"
- F14. FX-W4 re-alert pace: P1 `realert_runs` = 6 (every 30 min) or P2 6, 12, 24; origin: designer, owner to choose, model is untimed | S17:617 | "P1, constant: `realert_runs` = 6, every 30 min"
- F15. FX-W2 S2 second slot period 1.5 x `alarm_ms`; premise: every turn shorter than 0.5 x `alarm_ms`; unmeasured | S17:572 | "every turn shorter than 0.5 × `alarm_ms` (30 min)"
- F16. `alarm_ms` = 3,600,000 ms (60 min), guess, gate false | TJ:22 | "ms (long silence before the alarm exits, design R6)"
- F17. FX-W5 cap makes a stuck alert take about 4.75 h; derived from the cap, no source number given here | S17:545 | "The `stuck` alert takes about 4.75 h"
- F18. Model-run memory cap 400 MB per run, up to 3,000 MB for one rerun; these are model runs, not fix parameters | S17:79 | "400 MB per run by default."
- F19. Fault budget: R57 text asks 4 events, the owner's ruling runs 2 (model faults, not lanes) | S17:727 | "R57's text asks for 4 events (line 538); the owner's ruling runs 2."
- F20. Number of build lanes is not set by any fix; it is "computed" by a plan check that is not written | FF:49-51 | "How many lanes run is computed by"
- F21. How many fixes can be built at once: 3 by file, 7 by function or block, 8 by statement; counted from the change list, not diffs | WCP:150 | "7: {0b, CLOSE, REDO, PLAN, W3, W4, W6}; the other maximum set has W7 for W6"
- F22. Library fact r57-0128 repeats it: "3 at once ... 7 ... 8 only at statement level, 0b first"; 20 shared places (9 entries, 7 sequences, 4 same statements) | library r57-0128 | "3 can be built at once if each file has one writer"
- F23. Eight fixes add 18 keys to one object in TJ, the largest collision (B17) | WCP:105 | "18 new keys: CLAIM 3, CLOSE 1, W1 2, W2 4, W4 1, W5 1, W6 2, W7 4"
- F24. Token window: the earlier round used about 7.67 million helper tokens over 33 runs; the coordinator window reached about 404,000 (twice the 200,000 line, rule R59) | S17:908 | "stood at about 404,000 tokens at the end, twice the 200,000 line"
- F25. Build size: 14 units, 12 scripts plus TJ, 52 tests to add; estimates from the change list | library r57-0112 | "14 units (4 large: FX-OUT, FX-CLAIM, FX-CGATE, FX-W4; 8 medium; 2 small)"
- F26. Check time and run parallelism in the earlier option note: one suite run 596 s; parallel test files untested (r57-0403); the check keeps up while builders < write-minutes / 10 | SWO:17 | "The check keeps up only while builders < (minutes to write one fix) / 10."
- F27. That rate and "3 of 24 threads" are measurements of the suite on this PC; "wait over redo" assumes tokens scarce, PC not, from one run (r57-0401) | SWO:10 | "Tokens are the scarce resource; the PC is not"

Places that assume one writer per file or a merge:
- F28. The build-time cut by file needs the function signatures and file formats fixed first; the sources name them, give no signatures | FF:53-56 | "A cut by file needs the function signatures and file formats between the files"
- F29. The designs share one object or one function across fixes; build by several writers needs a merge: 7 ordered sequences, 4 same-statement points | WCP:111 | "Of B1 to B20: S 7 (B2, B3, B6, B11, B15, B16, B19), SAME 4"
- F30. Join of the two groups: 17 places where two fixes touch the same state | S17:297 | "17 places where two fixes touch the same state (part 2c)"
- F31. The fix-order inside hooks and scripts is fixed in the join (turn order rows 0 to 9); the guard-hook has one entry per role | S17:294 | "a turn order with both groups' fixes on"
- F32. Runtime one-writer rule: a session writes only its staging; only lib appends to the ledger | S17:525 | "A session writes only its `staging/`; ... only lib.mjs appends to the ledger."
- F33. OneWriterPerAttempt is a model property for the runtime writer, not for build | S17:486 | "**OneWriterPerAttempt** (fence, `FX_PROPS`): an observer on the writer mark"
- F34. FX-W7 fixes "two writers of watcher state" at run time, under the run lock | S17:260 | "two writers of watcher state"
- F35. Two copies of one rule set (`predictFence`, `lib.fence`) stay a known gap | S17:559 | "`predictFence` and `lib.fence` are two copies of one rule set"
- F36. One brief file, coordinator.md, is a single ordered list of acts for five fixes (B19) | WCP:107 | "S: J 2b order of acts (r3:250)"
- F37. The designs themselves say nothing on a merge by builders; the merge assumption lives only in SWO (and the old BUILD-SIZE) | SWO:12 | "So no two builders write one function at once"
- F38. SWO's merge claim is unproven: the theorem covers two edited regions only; clean merges that fail tests are 1 to 6 of 13 in studies | SWO:18 | "Textual merge conflicts: near 0 with the skeleton, but not proven"

What "the plan check" and "lanes" mean:
- F39. "The plan check" is named, not defined: it computes the lane count from four limits; its file is absent | FF:49-51 | "from four limits (collisions, the check, the review, the token window)"
- F40. START-HERE: no plan runs before it passes the plan check; BUILD-PLAN.md "being drafted"; lane count "computed, not guessed" | SH:34-36 | "How many lanes run is computed by the plan check, not guessed here."
- F41. In S17 "the lane" means the lane that model runs go through (a run slot for Node commands), not a build lane; it is not defined there | S17:54 | "Node commands outside the lane."
- F42. S17 uses "the check" for model checking (liveness counts unexpanded states as resolvable); SWO uses "the check" for the test suite (596 s). Two meanings; SH/FF's "the check" in the four limits is not defined | S17:408 | "Liveness counts every unexpanded state as able to resolve (check.mjs:189)"
- F43. A lane directory exists in the repo (`research-tree/lane/`: capacity.txt, slot-1, log.jsonl); no text read here defines it | research-tree/lane | (directory listing only; no quote)
- F44. Admission in S17 means admitting a task into a slot (N_max, status `admitted`), not build admission | S17:203 | "three processes against N_max = 2"
- F45. FAULTS-AND-FIXES counts files per fix: ten fixes edit lib, nine status, eight watch | FF:49 | "Ten fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs`."
- F46. WCP counts differ by one: lib 9 fixes (10 if CLOSE counted), so the file counts depend on grouping | WCP:117 | "(BS counts CLOSE too: 10)"
- F47. Two facts to measure before building FX-CLAIM and FX-CGATE: hook input carries session id; coordinator may start a session on a turn the owner did not type | FF:59-63 | "Does a hook's input carry the session id?"
- F48. If a coordinator cannot start sessions (Q5b), FX-CGATE's gate "has nothing to gate" | FF:63-64 | "FX-CGATE's gate on session starts has nothing to gate"
