# Departures: FX-CLOSE (unit CLOSE, branch u/CLOSE)

Design: FIX-fence.md section 4 (from line 498) and rev 5 point 1 (line 951); branches row 1 (Q5a) and its per-fix
line 60; PLAN's open items (`units/PLAN/result.md` "Not done", `departures/PLAN.md` lines 37-38, 51); CGATE's item 1
and the anchored answer (`departures/CGATE.md`, `refute/CGATE.md`). Code: `tcb/stop.mjs` (request at `started`,
verify (a)-(c), `closesMissing`, `verify_rounds`), `tcb/lib.mjs` (`closeDoneCounts` exported, the fence reset),
`tcb/guard-hook.mjs` (`closeOutcome`), `tcb/watch.mjs` (`rowAct`), `tcb/schemas/stop-sample.schema.json` (`at`),
CONTRACT 3.6, `spec/stop.mjs.md`, `tcb/briefs/coordinator.md` 5c.

1. **The id gap stays open; the relay is kept, for S2.2.** The app's stop and archive tools take `local_<uuid>`;
   the hook's `session_id` is the CLI id. The hook names its close record by the tool's subject (`closeDone(t)`),
   and stop verify looks records up by the CLI id (the claim holder, the folder sessions), so a hook record never
   counts. No measured fact ties the two ids:
   - `research-tree/build/facts/` holds no `local_` id;
   - the hook input keys that `.claude/logs/plan-gate.jsonl` logs are session_id, transcript_path, cwd,
     scratchpad_dir, prompt_id, permission_mode, agent_id, agent_type, effort, hook_event_name, stop_hook_active,
     agent_transcript_path, background_tasks, session_crons (with tool_name, tool_input, tool_response,
     tool_use_id on tool events); none is a `local_` id;
   - the log's one `local_` is a `resume` event's target (`to`), another session's id, not a map of the caller's;
   - CGATE's M1 app record is not in `facts/` and is internal to the app.

   So no map is built and no id form is guessed (B1-3). Every close ends with the owner's `closed` act, which the
   coordinator relays with a quote file; brief 5c has it ask the owner at the first `close-missing`. **For S2.2:**
   measure the map on one live session (its CLI id from the hook input, its `local_` id from the app's list) and
   build it with a test; until then stop verify cannot confirm a stop without the owner.
2. **`closeDoneCounts` exported** (`lib.mjs:3272-3282`, CLAIM's function, body unchanged). Verify (a) and (b) count
   a close by the same H3 rule as the slot count and the planner, not by a copy. A shared place (CLAIM's line).
3. **`lib.fence` resets `verify_rounds`** (`lib.mjs:1905`): to 0 when the row has the field, on the path that moves
   the epoch; a row without it gets none. This is PLAN's open item (the model's `t.vr = 0`), but FIX-fence's change
   table names no lib line for it, and `lib.fence` is shared. Test: lib "FX-CLOSE T2".
4. **The watcher's stop-verify act waits for the wall floor** (`watch.mjs:173-178`; the call passes `svm` at
   `watch.mjs:698`), lines of PLAN's and M3's `rowAct`. Why: liveness. An act raised before `stop_verify_ms` has
   passed since the sample's `at` could only wait (exit 6), and its key would stay acknowledged, so no new line
   would wake the coordinator once the floor passed. A sample without `at` (written before FX-CLOSE) stays due on
   the ticks alone, because verify takes such a sample again. Test: watch "FX-CLOSE T3 watch: stop-verify waits".
5. **Other units' tests changed to follow FX-CLOSE's actors.** `guard-hook.test.mjs` G5 case 4 now gives the bare
   sentence `Session <t> not found.` (it was `Error: ...`, which the anchored match no longer reads), and four new
   cases (k 21-24) write nothing. `redo.test.mjs` sets `stop_verify_ms` 0 in its root and records the holder's
   close before the comparing verify.
6. **The anchored match fails closed on a wrapped error.** PostToolUseFailure's `error` shape is inferred (CGATE
   M3), not measured. If the app wraps the sentence (`Error: Session <t> not found.`), the hook writes nothing and
   the close falls to the owner's act. It needs the app to settle, and it is moot while the id gap stands.
7. **Survivors still block a confirm** (kept from as-built). Verify confirms on (a), (b) and (c), and a matched
   surviving process still refuses the confirm, as before FX-CLOSE. Stricter than the design, never looser.
8. **No cap on `verify_rounds` in stop.mjs.** Each unconfirmed verify adds 1. The bound is planAct's step 0 (the
   owner at 3 or more while a close is missing); the model's `min(3)` is its encoding of the same bound.
9. **The older stop tests run with `stop_verify_ms` 0.** `stop.test.mjs` `mk()` sets 0 for the tests written before
   FX-CLOSE, so they keep testing what they tested; "FX-CLOSE T1" tests the floor.
10. **An unconfirmed verify always takes a new sample** (as-built), so each round waits both windows again (the
    ticks and the wall floor). Under the id gap every close takes the owner's act, at the latest after 3 rounds.
11. **The e2e stands in for the owner's `closed` act and moves its clock by `stop_verify_ms`** (572bb8eb, the e2e
    only; no script changed). After each `stop request`, the new `closeAttempt` reads the target attempt's claim (its
    holder, else the attempt's `session`) and runs `status owner --act closed --subject <sid> --quote-file
    plan/notes/closed.txt` (the quote file is written with the approvals), then checks `run/close/done/<sid>.json`.
    Before each comparing verify the clock moves by the run root's `stop_verify_ms` (120000). This covers the
    f1-control stop (its stalled e1) and `stopCommitted`. Under the id gap (item 1), the owner's act is the only close
    that verify finds, so the e2e takes that path. Two things are tested only in the unit tests: the hook's close
    record (`closeOutcome`, guard-hook G5) and a second session in a folder (b); each e2e attempt has one session.
    The e2e went from 232 to 239 steps: 7 owner acts (d-stpa, d-fmea, d-map, f1-control e1, and at the end
    f1-research, f1-control e2, f1-review).
