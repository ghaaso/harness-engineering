# b1 map: what research-tree/tcb already provides for the decision rule

Read-only map, 2026-11-18. Paths: T = research-tree/tcb. Quotes cut to 15 words.
Unit of work in tcb = a task row with an epoch (an attempt, folder `wt/<task>-e<epoch>`), run by a Claude session.

## 1. Event points (start, finish, heartbeat, stop)

F1. No heartbeat exists. Liveness is a polling tick: the watcher reads transcripts every `delta_ms` (60 s) and counts ticks with no new model call as `hang_ticks`. | T/watch.mjs:398-399; T/thresholds.json:4 | "if (newCalls > 0) ts.hang_ticks = 0;"

F2. Start = ledger lines `admit` (replace start mode), `bind`, `started`, all written by scripts the coordinator calls. | T/replace.mjs:926, T/replace.mjs:1007, T/status.mjs:297 | "kind: 'started', task: r.task, epoch: r.epoch, data: { session: sid }"

F3. Stop = `stop-request`, then `stop` after `verify` saw `stop_verify_deltas` ticks of no growth. The script kills nothing. | T/stop.mjs:299, T/stop.mjs:460, T/stop.mjs:1-8 | "reports (never kills) processes that name the attempt"

F4. Finish = `commit intake` (ledger `intake`) then `commit record` (one `commit` line per step). The child signals with `staging/READY.json`; the watcher turns it into class 11 `ready`. | T/commit.mjs:595, T/commit.mjs:860, T/watch.mjs:407-410 | "if (readyCls === 11) conds.push({ ...base, cls: 11"

F5. Fence (retire an attempt by raising its epoch) = `fence` ledger line with reason, restart charge, cut files. Script-called. | T/replace.mjs:500, T/lib.mjs:1740 | "append(env, handle, 'fence', T, to, { reason, from, to, host:"

F6. Watcher events (a ledger `event` line once per condition key): stall 20, hang 21, loop 22, hard-limit 23, memory 24, stop-unconfirmed 25, common-cause 26, tamper 27; reopened 10, ready 11, repair 12, soft-limit 13, checker-batch 14, window-limit 15, drain 16, act-due 17. | T/watch.mjs:19-22, T/watch.mjs:614-620 | "kind: 'event', ... data: { class: CLASS_SLUG[c.cls], code: c.cls"

F7. Hook versus script: only guard-hook.mjs is a hook (PreToolUse, matcher "*", in each settings/*.json except user-deny). No Stop, SessionStart or SubagentStop hook. All else (watch, status, replace, stop, commit, handover, admit) is a script the coordinator or owner calls; watch.mjs is a long-running process. | T/settings/coordinator.json:57-70; T/settings/child.json:31-47 | "\"PreToolUse\": [ { \"matcher\": \"*\""

F8. The ledger is the event log: hash-chained, append-only, one writer at a time under run.lock. Kinds are a closed list, so a new kind (unit-start, unit-end with readings) needs an entry in LEDGER_KINDS and a schema. | T/lib.mjs:75-80, T/lib.mjs:1522 | "if (!LEDGER_KINDS.includes(kind)) throw err('usage', 66"

## 2. Resource readings already taken

F9. Memory: free MB only, from os.freemem(), read at the edge each tick and each admit. Not logged as a series; it shows only inside an `event` line below the floor (class 24) and in status.json. | T/lib.mjs:413, T/watch.mjs:462-465, T/status.mjs:496 | "freeMb = Math.floor(os.freemem() / 1048576);"

F10. Memory parameters: `reserve_mb` 1024, `peak_mb` 1200, both "guess", gate true. Admission: free - reserve - peak x pending must cover one peak. | T/thresholds.json:16-17, T/admit.mjs:235-242 | "freeMb - reserve - peak * pending < peak"

F11. Processor: no reading in tcb (grep cpu, loadavg: no hit). A process list exists (realProc over PowerShell) but serves pid, start time and command-line matching, to count live children. | T/lib.mjs:2755, T/lib.mjs:3063 | "slotCount(rows, procList, transcriptsRoot, opts = {})"

F12. Tokens per task: parsed from the session and helper transcripts every tick: calls, input, cache read/write, output, total, peak_context, last_context. Spend against `e_task` at soft_frac 0.8 (class 13) and hard_frac 0.9 (class 23). | T/lib.mjs:2677-2695, T/watch.mjs:378, T/watch.mjs:425-428 | "if (spend >= hard) conds.push({ ...base, cls: 23"

F13. Coordinator context: `last_context` of its transcript against `W_star_coord` (class 16, appends `drain`) and `W_quality` 300000 (class 15). | T/watch.mjs:515-522 | "if (typeof wStar === 'number' && win >= wStar) {"

F14. Week or 5-hour window share: not read. `B_tokens` and `r_tokens` are owner parameters, both null. The only usage figure is `status.mjs meter --pct P`, a percent the coordinator types in, stored as ledger `meter`. | T/thresholds.json:21-22, T/status.mjs:744-750, T/cost.mjs:974-975 | "kind: 'meter', data: { pct, self_reported: true }"

F15. The check's wait: not measured. check-queue.mjs builds batches (class 14 when candidates >= batch_size 12 or no row active) and writes a `queue` line; no enqueue time, start time or wait length is recorded. Gap for step 5 of the rule. | T/check-queue.mjs:467, T/watch.mjs:541 | "kind: 'queue', data: w.ledger"

F16. Time gap: a tick later than 2 x delta after the last is read as a PC sleep and not counted toward hang; `sleep_gap_ms` 600000 is information only. | T/watch.mjs:340-345, T/render.mjs:594 | "nowMs - prevMs > 2 * env.delta"

F17. Where readings live: run/watcher.json (per-task calls, spend, window, hang_ticks), run/status.json (slots, memory, budget), the ledger. No file keeps a history of resource levels. | T/watch.mjs:15-20, T/status.mjs:488-498 | "watcherJson: 'run/watcher.json'"

## 3. Locks, claims, leases, fences

F18. Two locks only, run.lock and watcher.lock, in run/. Grain: the whole run (ledger, tasks table, status), never a work file. Create-exclusive file with pid, start time, nonce; a dead holder is broken by process query; busy waits `lock_retries` (300 x ~100 ms) then exit 75 `lock-busy`. | T/lib.mjs:1282-1290, T/lib.mjs:1377 | "if (name !== 'run.lock' && name !== 'watcher.lock') throw err('usage'"

F19. Fence = epoch, grain one task. The old attempt becomes a zombie: staging cut (length, hash), later writes logged `zombie-write`, its spend counted (class 25 above Z_frac 0.1 of e_task). The hook refuses a call whose epoch differs from the row. No expiry or renewal, so not a lease. | T/lib.mjs:1740, T/lib.mjs:1831, T/watch.mjs:442-452 | "if (!(k < e)) continue;"

F20. tasks.json writes are compare-and-set on `rev`; a stale writer gets exit 65 `rev-moved` and must re-read. Grain: the table, not a work file. | T/lib.mjs:1665, T/lib.mjs:1684 | "if (expectRev !== curRev) throw err('rev-moved', 65"

F21. Claims on files: none. Ownership is by folder: an attempt writes only `wt/<task>-e<epoch>/staging/`. Parallel children never share a file. That is "own copy per writer" by construction. | T/profiles/child.json:23-25, T/lib.mjs:533 | "\"write_prefixes\": [ \"{attempt}/staging/\" ]"

F22. Merge of two writers' copies: none. `commit intake` validates each staging object and stores it by exclusive create under its content hash; an equal object is a no-op, a different one is a new id, never a merge. Two checker verdicts that disagree are only flagged. No conflict count per file. | T/commit.mjs:6-7, T/lib.mjs:713, T/lib.mjs:3585 | "reasons[item] = 'verdict-conflict';"

F23. The one count-then-switch rule in tcb: two or more non-host fails within `W_cc_ticks` (30) give class 26 and a `halt` line until the owner resumes. It counts failures, not conflicts. | T/watch.mjs:470-499 | "if (cluster.length >= 2) {"

## 4. handover.mjs

F24. handover.mjs has NO token threshold. Modes: init, raise (coordinator epoch N to N+1, ledger `ce-raise`), bind (`coord-bind`). Starts and kills nothing. | T/handover.mjs:1-8, T/handover.mjs:341 | "kind: 'ce-raise', data: { from: N, to }"

F25. The number is `W_star_coord` = 133200 in thresholds.json ("cost.mjs compute rounded to 100", source mapping:D3-01, gate true). watch.mjs reads it (class 16, `drain` line); audit.mjs flags a coordinator turn above 1.5 x. grep "133" in tcb/*.mjs: no hit; it lives only in the json. The handover is the coordinator's act after class 16. | T/thresholds.json:23, T/watch.mjs:516-520, T/audit.mjs:460 | "\"W_star_coord\": {\"value\": 133200"

## 5. guard-hook.mjs

F26. Event: PreToolUse, every tool. It reads files and writes nothing. Exit 0 = no objection; exit 2 with `[guard-hook] deny <code>: <detail>`. Its own failure or the 5 s deadline is a deny. Role comes from profiles/*.json. | T/guard-hook.mjs:1-8, T/guard-hook.mjs:556-568 | "Every failure of its own ... is a deny"

F27. It refuses: a stale attempt (row epoch, state or step differs), a tool outside the role's lists, read or write outside the role's prefixes, writes under tcb/ sealed/ review-in/ .claude/ run/ store/ .git/, Bash outside the coordinator's `node tcb/<script>.mjs` form, an unlisted helper type, a script run from inside an attempt folder. | T/guard-hook.mjs:36, T/guard-hook.mjs:405-412, T/guard-hook.mjs:450-458, T/guard-hook.mjs:519 | "throw new Deny('write-protected', p);"

F28. It knows nothing of resources or of other writers; its only table read is tasks.json for the epoch check. | T/guard-hook.mjs:394-407 | "throw new Deny('stale-epoch'"

## 6. Where the two new parts would plug in

F29. Per-resource width. Facts are gathered in one place (`edgeFacts`, lib.mjs:407-427: now, freeMb, boot; the only place a clock or os call is allowed) and judged in `evaluate` (watch.mjs:309). Add cpu and window-share readings to edgeFacts and the minimum-of-resources next to the memory check (watch.mjs:462-466). The gate is admit.mjs `decide(facts)`: section 6 slots (221-233) and 7 memory (235-243); it returns refusal reasons and runs inside replace.mjs's run lock. Width = min over its sections instead of the fixed N_max. | T/lib.mjs:407, T/watch.mjs:462, T/admit.mjs:221-243 | "slots-full', { live, unknown, unconfirmed, N_max: nMax }"

F30. Events with readings at each start and finish: add the reading to `data` of the existing appends at replace.mjs:926 (admit), stop.mjs:460 (stop), commit.mjs:860 (commit); or new kinds in LEDGER_KINDS (lib.mjs:75) plus a schema in tcb/schemas. | T/replace.mjs:926, T/stop.mjs:460, T/commit.mjs:860 | "kind: 'commit',"

F31. Per-file writer mode. Conflicts would be counted where two attempts' objects for one place meet: `commit record` (commit.mjs:860) and `putObject` (lib.mjs:713). A mode table per file is a new state file under run/, written under run.lock like tasks.json with a `rev` (lib.mjs:1665) and read by the plan/admit step. Own-copy mode is today's only mode. One-owner mode needs a path claim with no counterpart today (F21). The merge step and its check have no code; the check would go through tms/gate. | T/commit.mjs:860, T/lib.mjs:713, T/lib.mjs:1665 | "export function putObject(root, value, { allowSeed = false } = {})"

F32. Conflict counter and quiet-unit counter: model on watch's per-task state (`freshTaskState`, watch.mjs:286, kept in run/watcher.json) and on the W_cc_ticks window logic (watch.mjs:470-499). | T/watch.mjs:286, T/watch.mjs:470 | "function freshTaskState(epoch) {"

F33. Enforcing one owner per file at the hook: guard-hook step 6 write branch (guard-hook.mjs:436-458) takes `write_prefixes` per role, today per attempt folder. One more `Deny('write-not-owner', p)` fed from the mode table fits there. The hook writes nothing and has a 5 s deadline, so the table must be a plain read. | T/guard-hook.mjs:436-458, T/thresholds.json (hook_deadline_ms) | "throw new Deny('write-outside-role'"

## Directory lists

settings/: canary, child-reviewing, child, control, coordinator, fmea, fresh-reviewer, mapper, stpa, user-deny (.json; all but user-deny carry the one PreToolUse hook).
profiles/: canary, checker, child-reviewing, child, control, coordinator, fmea, fresh-reviewer, mapper, reader, stpa (.json).
scripts/: guard-hook.mjs (613 lines), selftest.mjs (1149 lines); the tcb-level copies are 631 and 1279 lines, so they differ (not diffed).
