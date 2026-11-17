# REFUTE-fence-3: the revision-3 delta and FX-PLAN (2026-11-17)

Helper `refute-fence-3`. Reader only. Checked against FIX-fence.md rev 3 (sections 0b, 1 fence steps
132-156, 2 steps 239-279, 3 steps 358-408, 4 steps 473-503, 6 FX-PLAN 550-633) and the scripts under
`BUILD/tcb/`. INFERRED = reasoned, not run.

## 1. The six changes

| # | Closed as specified? | Still breakable (<= 2 faults)? / new hole |
|---|---|---|
| 1 Fence checks before the slot | **Yes.** Steps 3-5 (139-150) run `predictFence`'s refusals (replace.mjs:400-418: stale-epoch, wrong-step, hmax) before the slot; first/cut/drop without a live attempt write no slot (406-412) | **New hole H1 (0 faults).** A `parked/stopped` row is fenceable (replace.mjs:413; lib.mjs:1771) and moves to E+1, so it gets a slot. But a parked row's attempt E was never admitted: the memory fence creates attempt E+1 with no folder (lib.mjs:1815, `newAttempt` 1733) and stop sets `parked` (stop.mjs:185). With 0b(b) the slot's strict create throws `no-parent` -> exit 3 on every cut, drop, handover or failure fence of a parked row, for ever. **Change:** no slot and no tombstone when attempt E has no manifest (nothing can be live there). Minor: `predictFence` and `lib.fence` are two copies of one rule set; the claim "lib.fence has no refusal left" (154-156) holds only while they match. Derive both from one function, or a spec test that they agree |
| 2 Section 0b strict create | **Yes**: no fallback, `selftest` checks links (56-59); no folders (60-63); retry budget to the 5 s deadline (64-68) | H1 above is its side effect. Budget expiry inside the temp unlink (lib.mjs:705, after a `created`) must not turn an allow into a deny; harmless either way (the same session retries `identical`) |
| 3 `nostart` failure-only; lease and verify on ticks and wall | **Yes** (248-256, 274-279, 483-484) | **H2 (1 fault, the watcher dead, D6).** The lease needs `ticks_total` to advance; with no watcher it never expires, FX-PLAN answers `none` (591) for ever, nothing re-orders the start or fences. Not renewable (start.json is never rewritten), so no renewal hole; the stall belongs to the wake group's dead-man fix and should be stated as a dependency of FX-CLAIM |
| 4 Name grammar, split folders, readers check kind/session, (session, tool_use_id), bind after profile checks | **Yes** (364-370, 361-362, 393-394, 375-376) | No new hole found |
| 5 "No such session" counts as done only if PROBE 10(b) | **Partly.** "No such session" is relative to the caller: if the close tool sees only sessions the calling coordinator started (INFERRED, part of PROBE 4/10), a claim holder started by the owner (Q5b hand start), by a previous coordinator (before a raise) or by a duplicate start answers "no such session" while alive. **H3 (1 fault):** done written (402-403), no growth for the floor during a long model call, verify confirms a live session (Slots). **Change:** 10(b) writes done only when `start.json.session` equals the calling coordinator's session id, or a process list is available and matches nothing for that sid |
| 6 FX-PLAN | See section 2 | See section 2 |

## 2. FX-PLAN attacked

- **P1 `owner` the owner cannot leave (liveness; 1 fault: one crashed or unclosable child).** Step 0
  answers `owner` when `verify_rounds >= 3` (582), first match. The owner's act `closed` writes the done
  file (406-408), but nothing resets `verify_rounds`, and step 0 still wins, so the planner never
  orders `stop-verify` again and the coordinator, following acts, never runs it. The row stays
  stop-requested with its slot held. **Change:** step 0's condition is `verify_rounds >= 3` **and** some
  session the verify needs still has no done file; or the owner act resets `verify_rounds`.
- **P2 `bind` ordered while bind must refuse (no busy loop; 0 faults).** Step 6 maps every `started`
  row to `bind` (594). Step 3 of FX-CLAIM keeps transcripts as "a second source" (260). A transcript has
  its cwd record from the first user message, before any tool call (INFERRED from lib.mjs:2310-2331),
  so reconcile can mark a row `started` before the claim exists; bind then exits 6 `not-claimed`
  (263) every tick until the first tool call, and for ever if the session never calls a tool before it
  is fenced. **Change:** started with no claim -> `none` (wait), as admitted does, or reconcile moves to
  `started` only from a claim.
- **P3 the table test cannot see fact-dependent refusals.** It crosses (state, step) with {claim,
  start record, lease, Q5} (608-611) but acceptance also depends on facts it does not enumerate: P2's
  claim-vs-transcript, the outcome log (fenced/ready), `verify_rounds`, H1's manifest. Add the outcome
  log state and attempt-has-manifest to the cross product, and assert the act's script accepts with
  those facts, not only the (state, step) guard.
- **P4 two planners during a rollout (no busy loop; 0 faults).** Both delegate to `lib.planAct`, but a
  watcher started before an upgrade keeps the old code until it exits (it exits on a ce change,
  watch.mjs:315), while `status` runs the new code each call. The old `rowAct` raises `start-session`
  for an admitted row with no transcript (watch.mjs:164) every tick while the new planner says `none`:
  a wake per tick (the second start itself is refused by FX-CGATE's start record). **Change:** the
  watcher exits when `coord.tcb_commit` (handover.mjs:340) differs from its own at an evaluation, or
  the upgrade procedure requires a raise.
- **P5 `owner` for a fence-pending retry that would be refused (585).** Reachable after rev 3 only if
  something moves the row between the slot and the CAS, which no script does (the hold pins it); so the
  branch is a guard. But the owner cannot act on it either: a `drop` or `cut` by the owner is a fence
  with another reason -> 65 `fence-pending` (136). If the branch is kept, give the owner a supersede
  path (a drop accepted over a fenced log), or say that only a hand edit resolves it.
- **P6 a dead start's lease renewed.** Not possible: `start.json` is a strict create, never rewritten;
  a repeated hook with the same `tool_use_id` writes nothing (393-394). Only H2's frozen ticks stop it.
- **P7 stop-request against a running commit.** Not a race: `commit record` sets `committed` in the
  same lock hold as its record and ledger line (commit.mjs:808-866), and a multi-step row is `active`
  until its last step commits; `stop request` takes the lock after. Closing a child that is still
  making tool calls after its last commit loses nothing committed.
- **P8 Q5b.** `start-session` and `stop-session` -> `owner` (588, 593): the wake loop N9 is closed. The
  owner's hand start writes no `start.json`, so the planner keeps answering `owner` until the claim
  appears; a second hand start is made inert by the claim. Sound.

## 3. Final verdicts (section 0b counted under FX-OUT, FX-CLAIM and FX-CGATE)

| Fix | Verdict | Smallest change left |
|---|---|---|
| FX-OUT | **Stands with a change** | No fenced slot and no tombstone when attempt E has no manifest (H1); one source for the fence's refusal rules |
| FX-CLAIM | **Stands** | State the lease's dependency on a live watcher (H2; the wake group's dead-man fix) |
| FX-CGATE | **Stands with a change** | "No such session" counts as done only for a target this coordinator's start record names, or with a process list that matches nothing (H3) |
| FX-CLOSE | **Stands with a change** | Inherits H3's change |
| FX-REDO | **Stands** | - |
| FX-PLAN | **Stands with a change** | Step 0's owner rule ends when every needed done file exists (P1). Also: `started` with no claim -> wait (P2); the table test crosses the log state and the manifest (P3); an old watcher exits on a tcb change (P4) |

## 4. Final fault schedules for the modeller

1. **Parked fence (H1).** Memory fence; stop -> parked/stopped at E+1 (no folder); the owner drops or the
   coordinator cuts the row. Property: EventuallyResolves. 0 faults.
2. **Owner close, then nothing (P1).** Child crashes (1 fault); fence; stop request; close fails three
   rounds; owner `closed`; planner. Property: AlwaysCanResolve after the owner acts.
3. **Started before the claim (P2).** Start; transcript with cwd appears; reconcile -> started; the
   session's first call is slow. Property: NoBusyLoop. 0 faults.
4. **Close of a session the caller did not start (H3).** Owner hand start or a pre-raise start; the
   coordinator closes it, "no such session"; the session is in a long call; verify. Property: Slots.
   1 fault.
5. **Rollout (P4).** Old watcher, new status; admitted row, start record, no transcript. Property:
   NoBusyLoop. 0 faults.
6. **Watcher dead during a lease (H2).** Start; the start tool's session never comes; watcher dies (1
   fault). Property: EventuallyResolves (expected to fail without the wake group's fix; report as a
   dependency).
7. **Torn tainted fence** (kept): ready slot, tainted fence dies after its slot, commit of E.
   NoStaleAccepted.
8. **No-start loop** (kept): start always fails; lease; no-start fence; repeat; variant with reason
   handover. RestartLimit, budget untouched by handover.
9. **Bind to the loser** (kept): two sessions (1 fault), bind the non-holder. OneSessionPerAttempt.
10. **Late session past the lease** (kept): both lag readings. Slots vs eventually within N_max.
11. **Forged and false dones** (kept, now expected to pass): close target `S1.done` (refused by the name
    grammar); close success that is only a request (PROBE 10(a) false: expected to fail, record).
12. **Hook repeated across a tick** (kept, expected to pass with (session, tool_use_id)).
13. **Planner loops** (kept): 12(a) double start, 12(b) committed/started -> bind; ablations of FX-PLAN.
14. **Wrong first binder** (kept): raise; another hooked session first; helper variant (PROBE 1c).
