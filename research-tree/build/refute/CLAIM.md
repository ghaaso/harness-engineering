PASS

# Refute: unit CLAIM (FX-CLAIM), `u/CLAIM` at 14dc9a06 (refute, opus, 2026-11-20)

Blind review against FIX-fence section 2 and its Revision 5 notes (points 1 and 2), the FIX-JOIN points that name FX-CLAIM (2, 7, 8, 11, 2b, 2c, R3/R8/R10/R13), and branches row 1 (Q5a) and row 16 (PROBE 5 reading (i), `--if-unclaimed`), with `units/CLAIM/result.md` and `departures/CLAIM.md`. The mutations ran in the scratch worktree `.claude/worktrees/rCLAIM`. The guard-hook mutations ran in the detached checkout `C:/Users/User/Documents/projects/hx-rCLAIM`. Both are detached at 14dc9a06 and both have been removed. Every run went through MAIN's lane, with labels `rCLAIM-*`. The builder's branch was not changed.

## Verdict

**PASS.** Every invariant that the unit claims has a test that fails under a one-statement mutation (20 of 20 caught). The code reads right against the design. The departures are sound. Nothing here makes the unit fail its purpose or breaks a unit built on it.

There are four findings, none breaking:
1. The end-to-end file fails on the builder's commit.
2. Four surviving mutations show untested code: reconcile by claim, and the `{root}` wiring.
3. There is a residual window under `--if-unclaimed`.
4. T7c's "no slot" check is vacuous.

## Invariants: mutation and result (one statement each)

| # | Invariant (design place) | Mutation | Result |
|---|---|---|---|
| M1 | Step 1: another session is denied `attempt-claimed` | drop the `attempt-claimed` throw | caught: guard-hook T10b |
| M2 | Step 1: a tombstone denies `attempt-cancelled` | a tombstone returns (allow) | caught: T10b |
| M4 | Step 1 runs after the epoch gate (a stale call claims nothing) | `stepClaim` before the stale-epoch check | caught: T10b |
| M5 | Step 1: a malformed `session_id` is `bad-input` | drop the id regex | caught: T10b |
| M6 | Step 2: uncharged only while `nostart < H_nostart` | `<` to `<=` | caught: replace T7b |
| M7 | Step 2: a session claim resets `nostart` | drop the reset | caught: T7b |
| M8 | Step 2: the fence tombstones an unclaimed attempt with a manifest | `fenceTombstone` returns at once | caught: T7b |
| M9 | Step 2: a no-start under the cap is uncharged, with no `fails` entry | `failure && !free` to `failure` | caught: T7b |
| M10 | N7: `nostart` is read only for failure reasons | the claim read for every reason | caught: T7b (hand-over) |
| M11 | Rev 5 point 2: `--if-unclaimed` gives exit 5 `claimed-late` with nothing written | drop `fenceIfUnclaimed` | caught: T7c |
| M12 | Step 4: no claim gives exit 6 `not-claimed` | drop the check | caught: T22b |
| M13 | Step 4: a tombstone or another holder gives exit 1 `not-claim-holder` | accept a tombstone | caught: T22b |
| M14 | Step 6 / rev 5 point 1: a tombstone with a folder session visible is requested, not confirmed | tombstone always confirms at once | caught: stop T3b |
| M15 | Step 6: the request names the claim holder | the claim left out of `session` | caught: T3b |
| M16 | Step 7: +1 `unconfirmed` per folder session that is not the attempt's own | drop the term | caught: lib T96x |
| M17 | Step 7 with H3: `no-such-session` counts only for its own start or when the process list matches nothing | `no-such-session` always counts | caught: T96x |
| M18 | Step 7: the claim holder (of a stop-confirmed attempt) is not counted | the holder counted | caught: T96x |
| M19 | Lease N3: expires only when both ticks and wall time have passed | `&&` to `\|\|` | caught: lib T96y |
| M20 | ORCHESTRATION 9 row 5: no fixed ceiling of 3 | cap `min(N_max, N_ceiling, 3)` | caught: admit T6b |
| M21-M24 | Step 3, reconcile by claim (claim first, `duplicate-session`, tombstone starts nothing, `claim-invalid`). JOIN point 7: status, admit (`gatherFacts`) and handover pass `{root}` to `slotCount` | the four applied together: `kind = 'none'` in `applyReconcile`; `{root}` dropped at status:393, admit:469, handover:277 | **survived**: status, admit and handover test files 86 pass, 0 fail, 7 skipped. Only status.test exercises reconcile |

## The departures the brief named

- **1. `--if-unclaimed` is checked before FX-OUT's writes.** Sound. Rev 5 point 2 asks for two things that cannot both hold:
  - "nothing written" and the check made "at the tombstone create";
  - but FX-OUT step 5 writes the fenced slot before step 6, the tombstone.

  The rev-5 sentence "FX-OUT step 3 runs before it, so no slot exists either" is wrong about the order. Reading first gives "nothing written". It costs the atomic decision point: a claim that lands in the hold between the read and the tombstone create gets the fence charged as `crash`. The departure states this window. The window lasts milliseconds after a 10-minute lease.

  Checked against `u/OUT`: its hold runs `fenceOutcomeSteps` and then `fenceTombstone`, so after the merge the order is: check, OUT's refusals and slot, tombstone, CAS, as the departure intends.

  For S2.2: the order that closes the window entirely is refusals, then tombstone, then slot, for the lease act. No ready slot can exist without a session claim, because the hook claims before the READY slot step. That is a joint FX-OUT and FX-CLAIM order change.

  For FX-PLAN: `fenceIfUnclaimed` does not read the outcome log. A retry that still carried the flag after a death between the slot and the tombstone would therefore answer `claimed-late` even though a slot exists. This is harmless as long as the fence-pending act (FX-PLAN step 1, which matches first) never carries `--if-unclaimed`.
- **2. Step 7 leaves out every claim holder.** Sound. It is the model's checked reading (`model/as-built/model.mjs:288-291`, `tv && !dn && !ch`). The design's text would count an unconfirmed holder twice: once by the attempt term, which counts any attempt that is not stop-confirmed and whose folder transcript exists, and once by the new term. One count per live session is exact, and the model's Slots verdict applies to it directly. The extension to the recorded `session` when there is no session claim follows the same single-count logic. M18 shows the exclusion is tested.
- **4. bind drops the round-2 started-session check.** Sound, and needed. The design keeps "today's checks", but with them a `started` row whose session reconcile took from a transcript, before another session claimed, could never be bound:
  - binding the holder fails `session-differs`;
  - binding the recorded session fails `not-claim-holder`.

  The claim is write-once, so the old check is subsumed whenever reconcile took the session from the claim. T22b's last part shows the holder binding.

## Judged items

1. **The CLI id and `local_<uuid>` gap (CGATE M1).** CLAIM's code does not make a close unsafe. It only leaves the close to the owner's `closed` act.
   - Step 7 only reads done records, named by the CLI id taken from the folder transcript's `sessionId`. A miss counts the session: it fails closed.
   - The hook's close records, named `local_<uuid>` on `u/CGATE`, are never matched. The only record named by a CLI id is the owner's `closed` (CGATE status `runOwnerClosed`: `run/close/done/<CLI id>.json`, outcome `owner`), and `closeDoneCounts` accepts it.
   - The unsafe direction needs a `no-such-session` record under a CLI id, which H3's start-equality would count. That requires a stop given a bare CLI id, and CGATE's `APP_SESSION_ID_RE` refuses one. So until something maps the two id spaces, every session that step 7 counts ends with the owner. This costs liveness, never safety.
   - Aside: watch passes `[]` as its process list, so H3's "matches nothing" branch releases such a record in the watcher's count only. That count is a wake hint; admit counts with the real list.
2. **The "not done" items.**
   - **(a) No status test of reconcile by claim.** Confirmed: M22 survives. It breaks neither the unit nor a unit built on it:
     - bind, the fence, stop and FX-PLAN steps 5 and 6 read the claim directly;
     - reconcile's claim-first only sets `started` and the session earlier, and raises `duplicate-session`.

     The code reads right. S2.1 should add the test: a claim with no transcript gives `started`; a duplicate gives the anomaly; a tombstone does nothing; an unparseable claim gives `claim-invalid`.
   - **(b) The end-to-end file.** I ran it on 14dc9a06 from `hx-rCLAIM` through the lane (label `rCLAIM-e2e`, 88 s). **It fails, with exit 2.**
     - 31 steps pass. The first failure is `d-stpa: replace bind e1 -- exit=6 ... not-claimed`.
     - The failure cascades: 64 ok in all, then a crash reading `sealed/plants/f1-review.json`.
     - The cause is that the e2e simulates a session start with a transcript only, never the hook's first tool call.
     - I added two lines that write the session's claim before each bind: one in `bind()` and one before f1-research's bind. With them the file passes **232/232** on the same commit (label `rCLAIM-e2e-claimsim`, 121 s).

     So the scripts are right and only the e2e's stand-in for the app is behind. No landing runs the e2e (BUILD-PLAN's suites are the test files), so no unit built on CLAIM breaks. But the tree's e2e stays red until those two lines go in, preferably as a guard-hook call with the session's id. Route this to the root or S2.1.

## Small items

- **Untested wiring and an unrecorded departure.** M21, M23 and M24 survive: no test fails when status, admit or handover stop passing `{root}`. Without a root, `slotCount`'s new term skips every relative folder, so step 7 counts nothing: it fails open. FIX-JOIN point 7 says that without the root the term "must count every folder session as `unconfirmed`, which fails closed". All five callers pass `{root}` today (read: admit 469 and 571, handover 277, status 393, watch 564), so nothing is broken now. The departure is not in `departures/CLAIM.md`, and the wiring has no test.
- **T7c's "no slot" check is vacuous.** Its fixture folder has no `outcome/`. On `u/OUT`, `fenceOutcomeSteps` writes no slot when `!log.present`, so the check would pass even if the `claimed-late` check came after the slot. The joint test (S2.1) needs `outcome/` present.
- **On `u/CLAIM` alone, the tombstone is written before `lib.fence`'s own refusals.** FX-OUT step 3 is empty there. After OUT lands, `predictFence`'s refusals come first. The cases where this matters (stale or stopped attempts) are harmless.
- **`predictFence` (the dry run) ignores the no-start rule.** A `--dry-run` of an uncharged no-start failure fence predicts `restart_charged: true`, or `limit` at restarts = R. OUT uses `predictFence` for refusals only, so this is not a joint defect.
- **Departure 7: there may be no `SID_RE` to use at the merge.** CGATE names its constants `SESSION_ID_RE` and `APP_SESSION_ID_RE`, to avoid a duplicate const. The merge should use `SESSION_ID_RE` in place of the local `/^[0-9a-f-]{36}$/`, which also admits shapes that are not UUIDs.
- **Two smaller differences from the model.** `lib.fence` resets `nostart` only on a session claim; the model also resets it when there is no claim. Pre-fix attempts with no claim are tombstoned, so they read as no-start (stated in the result). Neither matters before the pilot.

Tokens: `refute: CLAIM claims and tombstones review | calls 66 | tokens 10.76 M | context now 251.5 K`. That counter line was read before this file was written (expected 5.4 M, limit 15.6 M).
