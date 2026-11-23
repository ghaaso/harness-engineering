# S0.5 checkpoint 1 (context 300 K reached after reading; successor continues)

Branch `u/S0.5`, worktree `MAIN/.claude/worktrees/S0.5`, last commit **07a09212** (on f852145c). Tokens at the
checkpoint: about 13 M, 70 calls. Brief: `briefs/B0b.md` (common part, S0.5 part). No test run yet.

## Done (commit 07a09212)
- `tcb/thresholds.json`: 17 new keys, all `source: "guess"`, non-null (cost.test.mjs TH1 pins the null list and the
  source pattern `mapping|owner|guess|measured`; selftest validates the schema, which has no `computed`):
  H_nostart 2, start_lease_ticks 10, start_lease_ms 600000, stop_verify_ms 120000, ensure_query_ms 10000,
  release_ms 3000, arm_confirm_ms 45000, alarm_slots 1, realert_runs 6, stuck_raises 3, idle_ticks 30,
  attempt_max_ticks 240, tool_slack_ticks 12, bg_wait_ticks 60, model_ticks 10, watcher_lock_try_ms 5000,
  busy_alert_ticks 10. Left out by branches.md (L1, RL-no): lease_ms, beat_ms, watcher_lease_ticks,
  run_lock_lease_ms (so 14 of the 18 design keys, plus 3 kind deadlines that branches.md's S0.5 line names).
  N_max / N_ceiling: unit text "computed by the decision rule (r57-0414) ... a guess until then", source stays guess.
  Four owner sources: plants_t, unverifiable_share_max -> `measured`; s2_allowed, crossed_design_allowed -> `guess`
  (B_tokens is the cap, rule 5; f5_given the owner's word for downloads, rule 3: kept `owner`).
- `tcb/cost-inputs.json` concurrency.N_cap: tag M -> G, src r57-0032 / r57-0414 (value 3 kept; cost T3 unchanged).

## Departures to write (`MAIN/research-tree/build/departures/S0.5.md`)
1. Keys: 14 of 18 (branches L1, RL-no) + 3 kind deadlines (names mine: tool_slack_ticks, bg_wait_ticks,
   model_ticks; FW:337-344 gives values, no names). No design value for start_lease_ticks (set = hang_ticks 10),
   start_lease_ms and stop_verify_ms (= ticks x delta_ms, so the wall floor binds only under `--once` ticks, N3).
2. Source `computed` (B-documents rows 1, 8) is refused by TH1 (cost.test.mjs:922) and the schema: used
   guess/measured with the reason in `unit`.
3. Formats: claim.json taken from FF:258 `{kind:"session", session_id}` / `{kind:"tombstone", task, epoch}`, not
   FF:264's `{session, sid}`; close-done gets `by` (FF:523, H3) beside FF:389's fields.
4. realProc: signature already `realProc({timeoutMs, exe})`; FX-W2 passes `timeoutMs: ensure_query_ms` (no change).
   acquireLock: external signature unchanged (FX-W7's short try = `retries`/`retryMs`); an internal empty break step.
   slotCount: `{root}` made part of the documented signature only; callers not changed (passing root changes the
   folder match: behaviour; the four callers are FX-CLAIM's).
5. Claim helper names are mine (FF:356 names none).

## Left (the plan, decided; read nothing more than the lines named)
Code: every step an empty named function placed so each fix fills its own function (no adjacent hunks); calls in
the order of FIX-JOIN points 9, 11 and part 2b (`model/as-built/FIX-JOIN.md:194-266, 322-368`).
- **lib.mjs**: new section after `fence` (or at the end), in J11 order, stubs throwing `err('not-built', 70,
  {fn, fix})`: `outcomeState(attemptDir, row)` (FX-OUT; returns {fenced: reason|null, slots, ready (uncommitted
  steps)}; R-a..R-c FF:122-133), `outcomeAppend(attemptDir, slot, opts)` (strict create of the first free
  `outcome/<j>.json`), claim helpers `readClaim(attemptDir)` -> {kind:'none'|'session'|'tombstone', session_id},
  `claimRecord(sessionId)`, `tombstoneRecord(task, epoch)`; `planAct(row, facts)` (FX-PLAN, FF:592-688; facts:
  claim, start, lease, zombieOver, readyPending, blocked, Q5a; one act); `liveness(rec, proc, markers)` ->
  'alive'|'dead'|'unknown' (FW:109). `withRunLock`: option `requireArmed` -> empty step `armedCheck(root, handle)`
  (FX-W3 fills: exit 6 `not-armed`). acquireLock: empty `breakStep(name, doBreak)` returning doBreak() around the
  judged-stale break (FX-W7: watcher.lock under the run lock; keep the unreadable path 1370-1374, LR-4 b).
  parseTranscript: before `return res`, `hidden(res, 'kind', transcriptKind(res))`, step returns null (FX-W6;
  non-enumerable, so deepEqual and JSON unchanged). Constants `TRANSCRIPT_RECORD_TYPES` (the 27 of
  facts/WH5-Wturn.md table) and `TRANSCRIPT_KINDS = ['tool','bg-wait','model','idle']`. `RUNTIME_FILES` table (13
  entries: path, fix, writer, fields) and path helpers in `paths(root)` (no test pins its keys): outcome slot
  `wt/<T>-e<E>/outcome/<j>.json` {kind:'ready',task,epoch,step}|{kind:'fenced',task,epoch,reason}; claim
  `wt/<T>-e<E>/claim.json`; start `wt/<T>-e<E>/start.json` {kind:'start',session,tool_use_id|null,tick,at};
  `run/coord-session-<ce>.json` {session_id}; `run/close/intent/<sid>.json` {kind:'close-intent',session,by,
  tool_use_id}; `run/close/done/<sid>.json` {kind:'close-done',session,outcome:'stopped'|'no-such-session'|
  'owner',by}; `run/arm/slot-<k>.json` {ce,pid,start_time,nonce,turn_seq_at_reg}; `run/arm/<nonce>.json`
  {state:'started'|'registered'|'present'|'abandoned',k?,pid?}; `run/arm/exited-<pid>-<start_time>.json`
  {ce,exit,at}; `run/arm/unarmed-<pid>-<start_time>.json` {ce,turn_seq}; `run/turn.json` {ce,turn_seq,read_seq,
  arm:'unconfirmed'|'confirmed'|'spent',slots:[{k,pid,start_time}],unarmed_turns}; `run/deadman.json`
  {runs_no_alarm,runs_no_watcher,list_hist[5],alerted:{cause,runs}}; `run/watcher-busy.json` {ce,busy_ticks}.
- **guard-hook.mjs** (B2, B3, B4): one context `pass = {hook, root, role, task, epoch, attempt, toolName,
  toolInput, cwd, io, profile, access}`. In decideInner: end of step 4 (task roles) `stepClaim(pass)` (FX-CLAIM);
  step 6 moved verbatim into `checkAccess(pass)` defined right after decideInner's new end (keep line positions:
  same indentation, its `return;` unchanged), with `stepAllowList(pass)` (FX-W1) after `checkTcbNode` in the exec
  branch; then step 7: task roles `stepReadySlot(pass)` (FX-OUT, Write/Edit only); coordinator
  `coordinatorSteps(pass)` = stepBind (CGATE 2), stepCurrentSession (CGATE 3), stepArmed (W3), stepRowAtAdmitted,
  stepStartRecord (CGATE 4), stepStopIntent (CGATE 5). Writing steps write only through `hookCreate` (B4).
- **replace.mjs** (B6): `underLock(env, fn, task, epoch, {requireArmed} = {})` passes `requireArmed` to withRunLock
  only when true; empty `armedFor(mode, reason)` -> false (W3: start, fence `first`), used by modeFence and
  modeStart. In modeFence's hold: `fenceOutcomeSteps(env, handle, hold)` (FX-OUT 1-5) before the M6 block,
  `fenceTombstone(env, handle, hold)` (FX-CLAIM) after it, then `lib.fence` unchanged.
- **status.mjs** (B11, B13): `reconcileHold2(root, ce, pre, res, dry)` calling `hold2ArmSlots(hold)` (W2) then
  `hold2PruneMarkers(hold)` (W1), no lock, returns res; called before `armAtStart` in both paths.
  `ARM_FLAGS = {}` (W2 `arm-nonces`), `DEADMAN_FLAGS = {}` (W4 `deadman`) spread into FLAGS_BY_MODE.default; in
  main after `ctx.dryRun = dry`: `const dm = await deadmanRun(ctx, flags, dry); if (dm) return {...}` (null).
- **watch.mjs** (B14, B15, B16): rowAct step 1 `const planned = rowActPlanned(row, facts)` (PLAN; undefined),
  step 2 `if (ownerOrNone(planned)) return null` (W5 step 1 = PLAN step 2; false), then today's body (steps 3-4).
  runAlarm: in the registration hold before writeAtomic `alarmSlotTurnSeq(reg)` (W3) then `alarmRegisterSlot(reg)`
  (W2); the loop wrapped in try/catch, every exit after registration through `alarmExit(reg, out|exitCode)`:
  `alarmUnarmedRecord` (W3, exit 30 only) then `alarmExitMarker` (W1); rethrow unchanged. evaluate: after the row
  acts loop `actDueIdleAgeCap(env, state, conds, {rows, tick})` (W6); before the newActive loop
  `reraiseStuck(env, state, present, tick)` (W5); after the watcher.json write `adoptState(env, state)` (W7).
- **handover.mjs** (B8): `briefLine(root, ce, tcbCommit, nonce = null)` + `briefNoncePart(nonce)` (CGATE, '') +
  `briefPathPart(root)` (W3, '') appended; output identical.
- **task-row.schema.json** (B18): optional row ints `nostart`, `verify_rounds` (minimum 0).
- **tcb/briefs/coordinator.md** (B19): acts (0)-(9) of FIX-JOIN 2b as headings with the fix that fills each and
  "(empty until <fix>)": wake; bind (CGATE); call 1 ensure (W2, S1: one); call 2 reconcile (W2); restart a dead
  watcher (W1/J1; exit 2: start nothing); revocations (OUT/CLAIM/CLOSE/CGATE stop); work-creating acts only if
  confirmed (W3; start-session only on a turn the owner typed, Q5a); bind --session (CLAIM); close-session (PLAN);
  exit 75; last call endturn always (W3, N2/E1).
- **CONTRACT.md**: `### 3.23 Outcome log [outcome-slot]` heading after 3.22 with one line "filled by FX-OUT";
  decision 41 heading after 40 (FX-W2, W3, W4, J point 1; "filled by those fixes"); 1.4: one added row group
  "reasons added by the round-3 fixes" (W1 exit markers/tri-state 1 and 2; W2 1 `arm-unconfirmed`, 0 `present`/
  `nonce-reused`/`abandoned`; W3 6 `not-armed`; W6 21 by kind, 17 `idle-child`/`age-cap`; CLAIM 5 `claimed-late`,
  6 `not-claimed`, 1 `not-claim-holder`); 3.20 table row N_max/N_ceiling: "2 / 3 | guess; computed by the decision
  rule (r57-0414), memory one width measured per session (Q19)" (the "3 children" line, B-documents row 2).
- **spec/**: one heading section per touched spec (lib.md, guard-hook, replace, status, watch, handover, briefs.md)
  naming the steps or signatures and their fix.
- **Test**: lib.test.mjs (or cost.test.mjs) one test: the 17 keys exist, `source: "guess"`, non-null; plus the
  stub signatures (names, `length`) and `not-built`.
- **Run** (lane, from the worktree's research-tree/; T from facts/lane-measure/alone.txt): lib, replace, status,
  watch, handover, cost (thresholds/cost-inputs), selftest (4 shards, shards.cmds), guard-hook outside `.claude/`
  (`hx-S0.5` detached checkout). Then departures, result.md last.

## Next step
Write lib.mjs's section, then guard-hook, replace, status, watch, handover, schema, brief, CONTRACT, spec; commit
per file group; tests; departures; result.md.
