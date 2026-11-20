PASS

# Refute: unit PLAN (FX-PLAN), blind, 2026-11-20

Branch `u/PLAN` at eb0c6810, diff against `build` (b6fabfa0). No test fails, and no defect was found by reading.
30 of 66 mutations survive. All are test gaps in code that reads right; the main ones are under "Findings".

**What was run.** Scratch worktrees `rPLAN`, `rPLAN2`, `rPLAN3` and the checkout `hx-PLAN-r` outside `.claude/`, all
removed after use. Each mutation is one exact replacement. lib.test.mjs ran first, and status.test.mjs with
watch.test.mjs ran when lib passed. Mutations in status.mjs or watch.mjs ran only the file that loads them. Labels
are `PLAN-refute-<id>`. The driver, list and logs are in the scratchpad folder `PLAN-refute/`.
- **Baseline:** lib 201 pass, 0 fail (2 skipped, 1 todo); status and watch 109 pass, 0 fail. These match result.md.
- **End to end:** `e2e/run-e2e.mjs` on eb0c6810 from `hx-PLAN-r`: 232 of 232 steps ok, 0 FAIL.
- **T1 oracle probe:** an exit-code print added to T1's script case. Every script case exits 0 under `--dry-run`:
  bind, stop-request, the first fence, and the lease act. The todo case (committed at started -> stop-request)
  exits 65 `wrong-step`, as departure 10 says. So T1's "accepted" is real acceptance, not a code it lets through.
- **guard-hook.test.mjs was not run.** No mutation touches the hook, and the unit changes no "## Command line".

## Invariants, mutations, results

| Claim | Mutation | Result |
|---|---|---|
| Step 0: owner for failed, limit, zombie over Z, a tampered log | P0a: drop zombieOver | caught: watch "FX-PLAN: a zombie-over row raises no row act" |
| | P0b: drop tamper | caught: lib T2 |
| Step 0, rev 4 P1: verify_rounds >= 3 only while a needed close is missing | P0c: drop closesMissing | caught: T2 |
| | P0d: `>= 4` | caught: T2 |
| Step 1: a torn fence is retried with the log's reason, or goes to the owner where the retry is refused | P1a: never refused | caught: T2 |
| | P1c: hmax `>` for `>=` | caught: T2 |
| | P1b: wrong-step not refused | survives: a torn row stays at a step the fence took, so the branch is not reached |
| | P1d: `first` or an unknown reason not refused | survives: not reached either |
| Step 2: first fence and restart, `none` while halted or draining | P2b: blocked dropped on the first fence | caught: status T3, the halt and drain tests |
| | P2c: blocked dropped on the restart | caught: T2 |
| Step 3: fenced (active or parked), and committed at started or bound -> stop-request | P3a: stop-request in every state | caught: T1, the script guard |
| | P3b: committed at started dropped | caught: status T3 (`f1-comstart`) |
| Step 4: the stop-requested block | P4c: the sample ignored | caught: status T3 |
| | P4b: target `e - 1` for a committed row | survives: an old gap, since no committed stop-requested row is in any test |
| | P4d: confirmed with no sample -> `none` | survives: an old gap |
| Steps 5-6: expectation, rev 4 P2, rev 5 point 2 | P5a: a claim does not bind | caught: T1 |
| | P5b: a tombstone is not the owner's | caught: T1 |
| | P5c: lease act without `--if-unclaimed` | caught: T1 |
| | P5d: start-session while the lease runs | caught: T1 |
| | P5e: started with no start.json -> bind | caught: T1 |
| Step 7: audit, then commit | P7a: the two swapped | caught: status T3 |
| Rev 5 point 1: `close-session <sid>` | P4e: none at an ended row | caught: T3 |
| | O2: a waiting attempt's session closed | caught: T3 |
| | O4: an uncounted done never gives the owner | caught: T3 |
| | C1: slotCount's `done` flag lost | caught: T3 |
| | C2: `opts.counted` never filled | caught: T3 |
| | P2d: no orphan check before replace-start | **survives** |
| | P5f: no orphan check before start-session | **survives** |
| | P7b: no orphan check at bound | **survives** |
| | S5: status does not pass `counted` | **survives** |
| | W8: the watcher does not pass `counted` | **survives** |
| | O1: attempts being stopped are not skipped | survives |
| | O3: owner as soon as one done does not count | survives |
| | F12: other rows' sessions not filtered out | survives |
| Departure 5: a pair no script moves goes to the owner | P2a, P4a, P4f, P7c: `none`, or the old act | all survive. By reading no script makes these pairs: a fence keeps the state at `fenced`, stop.mjs:182-186 sets the end state with `stopped`, and start makes the row active |
| Departure 2: planFacts | F2: lease | caught: watch "FX-PLAN act due" |
| | F4: readyPending | caught: status T3 |
| | F6: claim | caught: status T3 |
| | F8: sample | caught: status T3 |
| | F11: target `k = e` | caught: status T3 |
| | F3: the log's fenced reason not read | **survives**: step 1 is tested only with facts given by hand |
| | F5: tamper not read | survives |
| | F7: an invalid claim read as `none` | survives |
| | F1: a start.json that does not parse counts as absent | survives |
| Departure 6: closesMissing, scoped to the target attempt | F9: the holder dropped | **survives** |
| | F10: the other folder sessions dropped | **survives** |
| Status: nextOf and planContext | S4: blocked dropped | caught: status halt and drain |
| | S2: ticksTotal null | survives: the lease is tested only in the watcher |
| | S6: lease `{}` | survives |
| | S3: zombieOver dropped | survives: an old gap |
| | S1: an audit before a newer intake still counts | survives: old logic |
| | S7: Hmax 0 | survives |
| Watch: rowAct filters and facts (departure 7) | W1: the slot filter dropped | caught: M3, every slot used |
| | W3: audit and commit raised | caught: T6 READY |
| | W4: sample age ignored | caught: M3 stop-verify |
| | W6: zombieOver false | caught: zombie-over test |
| | W7: zombieRows never filled | caught: zombie-over test |
| | W9: lease `{}` | caught: FX-PLAN act due |
| | W10: ticks null | caught: FX-PLAN act due |
| | W11: `plan` not passed | caught: FX-PLAN act due |
| | W2: the blocked filter dropped | survives, and changes nothing: planAct already gives `none` while blocked |
| | W5: `stop-verify@-` dropped | survives: an old gap |
| Departure 1: status.schema.json `next` pattern | J1: `close-session` taken out of the pattern | survives. Nothing checks status.json against this schema, neither a test nor the code |

## Findings (test gaps; the code reads right)

1. **Rev 5 point 1 is tested only in lib, and only for an ended row.** Five mutations survive (P2d, P5f, P7b, S5,
   W8):
   - in two of them, `close-session` never reaches status or the watcher, the two runners the design names;
   - in the other three, the act drops out on a row that continues: before replace-start, before start-session,
     and at bound. That is where a late session of a crash-fenced attempt shows.

   With P2d, replace-start waits for a slot that the orphan holds, and nothing closes the orphan. That is the
   AlwaysCanResolve hole rev 5 point 1 closes. One status build and one watcher tick on an active row at
   `stopped` with a late folder session would cover all five.
2. **Facts tested only by hand.** Step 1 and step 0 get their facts by hand in T2. So planFacts' fenced reason
   (F3), tamper (F5), invalid claim (F7) and closesMissing (F9, F10) are untested. FX-CLOSE (B1-3) builds on
   closesMissing.
3. **Status's lease path is untested** (S2, S6). The lease act is tested in the watcher and T1 only.

## Small items

- **A start record whose lease never runs out.** A start.json that does not parse counts as present (departure 2).
  `startLeaseExpired(null)` is false, so the row is `none` for ever and no owner act is raised. The same happens
  for a start.json with `tick: null`. The hook writes that when watcher.json is missing or has no ticks_total
  (guard-hook.mjs `watcherTick`), and it can happen until FX-W3's arm gates starts on a live watcher. This
  concerns FX-CLAIM and FX-CGATE as well as FX-PLAN.
- **The watcher's empty process list.** With it, step 0's closesMissing can be false in the watcher where status,
  using the real list, has it true. The watcher then raises stop-verify for a row that status gives to the owner.
  FX-W5's re-raise and its stuck count bound this. Departure 4 covers the same split for close-session only.
- **A stop sample that does not parse, or has no integer tick, while the stop is `requested`.** The old rowAct
  raised `stop-session`. Now planAct gives `stop-verify`, and rowAct raises nothing.
- **T1's script runs.** T1 runs four acts against their scripts. The torn-fence retry, replace-start, stop-verify,
  audit and commit are not run (result.md says so).
- **Committed at started -> stop-request.** stop.mjs refuses it (65) until FX-CLOSE step 3, so defect (b)'s
  repeat stays until B1-3 (departure 10).
- **The schema pattern.** status.schema.json's `next` pattern matches REASONS without `first`, and session ids
  as lowercase UUIDs.

Tokens: refute: PLAN blind review | calls 68 | tokens 10.24 M | context now 223.1 K (before this file).
