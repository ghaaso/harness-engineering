# Departures: FX-PLAN (unit PLAN, branch u/PLAN)

Design: FIX-fence.md section 6 (FF), rev 4 P1/P2, rev 5 points 1-2; FIX-JOIN points 10, 11, 13 (FJ); branches rows 1
and 16. Code: `tcb/lib.mjs` (`planAct`, `planFacts`, `fenceRetryRefused`, `orphanAct`), `tcb/status.mjs` (`nextOf`,
`planContext`), `tcb/watch.mjs` (`rowAct`, `rowActPlanned`), `tcb/schemas/status.schema.json`.

1. **Acts with arguments are strings.** `planAct` returns one string: the act name, and for three acts the script's
   own words, as FF writes them: `replace-fence --reason <r>` (step 1, a torn fence), `replace-fence --reason crash
   --if-unclaimed` (the lease act), `close-session <sid>` (rev 5 point 1). Bare `replace-fence` stays the first fence.
   status.json `next` is a `pattern` over these forms in place of the enum (CONTRACT 3.8); the watcher's class-17 key
   carries the same string (`17|<task>:<act>|<epoch>|<onset>`; no `|` in any act). Tests: watch "FX-PLAN act due".
2. **One fact reader, `lib.planFacts(root, row, ctx)`**, for status and the watcher (S0.5 departure 8 has rowAct
   read the facts from the attempt folder). Its per-row facts: claim, start.json present (one that does not parse
   counts as present: never a second start), the lease (`startLeaseExpired`), the outcome log (fenced reason,
   ready, tamper), the stop sample, `closesMissing`, the row's step-7 sessions. The caller's facts: zombieOver,
   blocked, audited, H_max, ticks, wall time, process list.
3. **Step-7 sessions from slotCount's own scan (a shared place, CLAIM's).** `slotCount`'s `opts.counted` (an array)
   receives `{task, epoch, session, claim, done}` for each session `folderSessionSlots` counts; `folderSessionSlots`
   gains a fifth parameter and the claim kind (`ck`). Count unchanged; one scan serves the count and the planner, so
   "the sessions step 7 counts" is the same set by construction.
4. **close-session's place in the first match (FF gives none).** The orphan act takes the place only of `none`, of
   the work-creating `replace-start` and `start-session`, and of `none` at an ended row (committed, cut, dropped at
   stopped): revocations (step 1, steps 3-4, the lease act) and bind, audit, commit come first. Why: an orphan
   holds a slot a start needs (rev 5 point 1's scenario), and its `owner` fallback must not hold up a revocation
   or a commit. Orphan = a counted session whose attempt's stop is not requested or unconfirmed (no stop closing
   it), and not the current attempt's session while the row waits for its claim (active at admitted or started
   with no session claim: the lease decides). A session with a done record that does not count (H3) gives `owner`
   only when no other orphan of the row can be closed. In the watcher (empty process list, as its slotCount) a
   `no-such-session` done counts by H3's list branch, so it raises close-session or nothing, never an owner gap.
5. **Owner for pairs no script moves.** planned at any step but none; fenced unless active or parked;
   stop-requested unless active, parked or committed; admitted, started, bound or none unless active; active at
   none. Today these fell to an act a script refuses or to `none`. A tampered outcome log (`outcome-tamper`) and an
   invalid claim are `owner` too; a tombstone at the current attempt with no fenced log (only an attempt made
   before the fix: `replace start` makes `outcome/`) is `owner`, its fence's reason being unknown.
6. **Step 0's verify rule is scoped to the stop's target attempt** (committed: e, else e - 1) of a stop-requested
   row: the claim holder (the recorded session when the attempt holds no claim) and every other counted folder
   session of that attempt. For FX-CLOSE: `verify_rounds` is not reset by FX-PLAN; the model resets it at the fence
   (`t.vr = 0`); if FX-CLOSE does not, a later stop of the same row meets step 0 at once.
7. **Watcher facts.** zombieOver is the watcher's own class-25 predicate (summed zombie tokens over Z), not status's
   per-attempt one: the sum is at least each attempt's, so whenever status says owner the watcher raises no row act.
   Section c of `evaluate` gains `zombieRows` (two lines); section j's slotCount call passes `counted: sessions7`
   and the rowAct call passes `plan`. audit and commit stay class 11's (null). `replace-fence` (first) and
   `replace-start` keep the free-slot and not-blocked filters; the torn-fence retry and the lease act do not wait
   for a slot (revocations).
8. **Q5a only** (branches row 1): no Q5b detection; the total table's Q5 column has one value.
9. **Updated tests:** status T3 (`f1-started` holds a claim -> bind; `f1-startnc` started with no claim and no
   start.json -> owner; `f1-comstart` committed at started -> stop-request); watch "M3 act due: an admitted row is
   start-session, and bind once its folder has a transcript" replaced by "FX-PLAN act due" (the transcript-visible
   branch is gone by design); lib.test's `stubs` line loses `planAct` only.
10. **Not yet accepted by its script:** committed at started -> `stop-request`; stop.mjs accepts it only with
    FX-CLOSE step 3 (B1-3). Until then that row's act is refused (wrong-step 65), as today's `bind` was.
