# W3 checkpoint (builder 1, 2026-11-20): FX-W3, acts that create work need a live confirmed arm

Branch `u/W3`, worktree `MAIN/.claude/worktrees/W3`, base `build` 2a8480af. **Last commit faa87c45** (clean tree).
Builder 1 stopped at the 330 K context checkpoint (counter: calls 82, 15.40 M, context 292 K before this file).

## Done (two commits)

**63e36ff6, code** (all FX-W3 steps of the skeleton filled; no flag added, so EXEC_FORMS and T16 are unchanged):
- `lib.mjs`: new exported `armedState(root, ce, io)` (the one file predicate, no process list): armed when
  `run/turn.json` has ce = caller's ce, arm `confirmed`, slots a non-empty array of {integer pid > 0, string
  start_time}, and no `run/arm/exited-<pt>.json` for any slot; else `{armed: false, why}` with why `no-turn`,
  `turn-unreadable`, `other-ce` {turn_ce}, `arm` {arm}, `no-slots`, `bad-slot`, `slot-exited` {pid}. `io`
  {readJson, exists} for the hook. New exported `checkArmed(root, ce)` throws exit 6 `not-armed` {ce, why, ...}.
  `armedCheck(root, handle, ce)` (the stub) calls it; `withRunLock` passes `o.ce` (no ce = not armed).
- `replace.mjs`: `armedFor(mode, reason)` = start, or fence with reason `first`. `underLock`'s dry run also runs
  `lib.checkArmed` after the ce check (a dry run gives the real run's 6).
- `watch.mjs`: `alarmSlotTurnSeq(reg)` adds `turn_seq_at_reg: reg.turnSeq` (read by ensureHold1 in the same hold)
  to the slot record; `alarmUnarmedRecord(reg)` (exit 30 only, before the marker, no lock): when `turnSeqOf(root)`
  still equals the slot record's `turn_seq_at_reg`, strict-create `run/arm/unarmed-<pt>.json` {ce, turn_seq};
  a failure is one stderr line.
- `status.mjs` endturn step 1 (FX-W3 A3, FIX-JOIN 2b row 9): in the hold, `readTurn`; not of this ce (absent,
  corrupt, other ce) -> exit 1 `turn-stale` {ce, turn_ce}, nothing written; K > head -> `acked-ahead` {acked_seq,
  head}; K > turn.read_seq (or no integer read_seq) -> `acked-ahead` {acked_seq, read_seq}; K < stored ->
  `acked-backwards`; turn.json of this ce is rewritten `arm: 'spent'` in every case (also on a K refusal); acked.json
  only without a refusal. **Step 2 (the tri-state report) now runs after a refusal too** (N2): reasons = [refusal,
  then the sources' reasons]; exit 1 on a refusal, else as FX-W1; result `acked_seq` null and `written` false on a
  refusal.
- `guard-hook.mjs` `stepArmed`: only for the session-start tool (`isSessionTool(pass,'start')`); ce from
  `coordOf(pass)`; `lib.armedState(root, ce, {readJson: pass.io.readJson, exists: pass.io.exists})`; deny
  `not-armed` "ce N: why {...}"; it sits before stepRowAtAdmitted and stepStartRecord, so a denial writes no
  start.json. Stop tools and Bash are not gated by the hook.
- `handover.mjs` `briefPathPart`: ` Then act every turn as <tcb>/briefs/coordinator.md says, in its order.`
  (forward slashes, quoted when the path has a blank).

**faa87c45, brief** `tcb/briefs/coordinator.md`: places 0b (the unarmed record), 4 (watcher restart, FIX-JOIN point
1: `watcher.alive` false or `watcher.ce` not yours -> background `watch.mjs --root --ce`; null or endturn exit 2:
start nothing), 6 (replace start / fence first only after call 2 exited 0; `start-session` only on a turn the owner
typed, with `initiation` user_asked, absolute `cwd` `<root>\wt\<T>-e<E>`, `use_worktree` false, `context` fresh,
`title`, `prompt`, `background` >= 80 chars, no host/preset/environment/repository/proposal_id/source_branch/
branch_name; armed until endturn or the confirmed alarm's exit), 8 (heading changed to "retry nothing, then
endturn"; N2), 9 (N2 + E1: endturn last always; K = reconcile's `result.status.ledger.seq`, else `run/status.json`
`ledger.seq`; act on exit 1 once: alarm-missing -> ensure again, watcher-missing -> place 4; acked-*/turn-stale
alone: nothing; exit 2 start nothing; 75 end).

## First test run (before adapting tests): lane `W3-first`, at faa87c45

`node --test` of status, watch, replace, handover (one call, 75.5 s): 233 tests, 187 pass, **35 fail**, 11 skipped.
Log: `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/8a7db643-dc9c-42d9-8dea-e9f99c2d3b69/scratchpad/W3-build/first.log`.
Every failure is the new behaviour meeting an old fixture (none is a bug seen so far):
- replace.test.mjs: every `replace start` and `fence --reason first` (T3, T13-T20b and their subtests) now exits 6
  `not-armed`: their fixtures must arm the turn first. A helper is enough: write `run/turn.json` {ce: 1, turn_seq: 1,
  read_seq: 0, arm: 'confirmed', slots: [{k: 1, pid: 4242, start_time: '2026-11-20T00:00:00.0000000Z'}],
  unarmed_turns: 0} (armedState reads only files; no marker = armed).
- status.test.mjs T10, T11 (x3), T12, M1 (line 909), FX-W1 (947, 966), and T16's endturn: no turn.json ->
  `turn-stale`. Write a turn.json of the ce with `read_seq` = the K the test passes (T12: read_seq 3).
- watch.test.mjs M1 (line 1282, endturn K 0 needs a turn.json of ce 1 with read_seq >= 0); "FX-W2 a reused nonce"
  (line 1727) and T20 alarm: the slot record now has `turn_seq_at_reg` (add it to the expected record).
- handover.test.mjs T6 (line 409) and H1 (lines 503, 518): the brief line now ends with the brief-path sentence
  after `--nonce X.`; extend the regexes (and assert the path ends `briefs/coordinator.md`).
- Not run yet: guard-hook.test.mjs (from a checkout outside `.claude/`): its FX-CGATE start-tool tests (G4) now
  meet stepArmed first and need an armed turn.json in their root; lib.test.mjs (no stub of W3 in the `stubs` line).

## Left, in order

1. Adapt the old fixtures above (only to what FX-W3's actors now do).
2. **The 5 new tests** (BUILD-PLAN FX-W3; r3-changes section 6):
   a. replace.test.mjs "FX-W3 not-armed": start and fence first exit 6 `not-armed` for no turn.json, `unconfirmed`,
      `spent`, another ce, a slot with an exit marker; nothing written (no ledger line, no incident, row unchanged,
      no folder); the same call passes once armed; `--dry-run` gives the same 6.
   b. replace/stop "FX-W3 revocation never gated": with no turn.json, `fence --reason hang|crash|handover` and
      `stop request` are not refused for the arm.
   c. watch.test.mjs "FX-W3 unarmed record": slot record carries `turn_seq_at_reg`; a fired alarm (`--sleep-ms`
      short) with turn_seq unmoved writes `unarmed-<pt>.json` {ce, turn_seq} and its marker; with turn.json's
      turn_seq moved during the sleep, no unarmed record.
   d. guard-hook.test.mjs "FX-W3 hook": the start tool is denied `not-armed` (each why) and leaves no start.json;
      allowed once armed (then start.json is written); the stop tools pass unarmed.
   e. status.test.mjs "FX-W3 endturn": `turn-stale` (absent, other ce) writes nothing; K > read_seq is
      `acked-ahead`; a passing endturn writes acked.json and arm `spent`; a refused K also spends the arm; a second
      endturn with the same K exits as the first; the sources are reported after a refusal (alarm-missing beside
      the refusal). Optionally a lib test of `armedState` (the seven whys).
3. Specs: lib.md (armedState, checkArmed, withRunLock), replace.mjs.md (armedFor, dry run), watch.mjs.md (the two
   steps), status.mjs.md (endturn step 1 and the exit list: `turn-stale`), guard-hook.mjs.md (stepArmed, deny
   `not-armed`), handover.mjs.md (the brief line's last sentence), briefs.md (FX-W3 line).
4. CONTRACT: 1.4 round-3 row (FX-W3 also 1 `turn-stale`); 3.9 [arm-slot] `turn_seq_at_reg` (already named), a new
   [arm-unarmed] item, [turn] `spent` by endturn (in every endturn of this ce); decision 41: the FX-W3 paragraph
   (R6-c sentence of FIX-JOIN part 3, A3, N2 with E1, the hook's start gate).
5. `MAIN/research-tree/build/departures/W3.md`: (1) the report after a K refusal (N2); (2) `spent` also on a K
   refusal; (3) `turn-stale` for an absent turn.json too; (4) armedState needs >= 1 well-formed slot (fail closed);
   (5) replace's dry run checks the arm; (6) the hook gates only the start tool (scripts gate replace); (7) place 8's
   heading; (8) the brief's K fallback to status.json; (9) the brief-path sentence's wording.
6. Run the touched test files through the lane; guard-hook from `hx-W3` outside `.claude/`; commit.
7. Merge `build`; e2e from a detached checkout: its `replace start` / `fence first` steps now need an armed turn
   (a stand-in turn.json, or the stand-in slot plus `status --reconcile --arm-nonces` before them); its endturn at
   O already follows a reconcile. Adapt only `e2e/run-e2e.mjs`.
8. `result.md` last.
