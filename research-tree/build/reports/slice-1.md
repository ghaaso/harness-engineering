# Slice 1 of the build: report (2026-11-20, 02:00 UTC)

**Answer.** Slice 1 is done. All 13 fixes are on the `build` branch (tip 2a45365c), with S2.1, the tests that cross
fixes. Full suite 5 passed: 1,118 tests, 1,063 pass, 53 skipped (they need the real app). One test failed under the
full load and passed alone, so it is listed as flaky. The end-to-end run passed 239 of 239 steps. Every fix had a
blind reviewer: 11 reviews covered the 14 units. Three found a breaking fault (W5, W3, S2.1). Each was fixed and
tested before its merge. The 15-point cap is used up (meter 78 %), so slice 2 waits for the owner's word on the cap.

**The fixes, by what they do.**
- Waking and watching the coordinator: W1 (liveness and the hook's allow-list), W2 (the alarm slot), W3 (the run
  lock and arming a turn, so a child starts only on a turn the owner typed), W4 (the dead-man alert), W5 (stuck
  rows), W6 (reading transcripts), W7 (locks).
- Starting, claiming and stopping child sessions: CGATE (the hook gates the start and stop tools), CLAIM (claims),
  PLAN (the planner's table of acts), CLOSE (stop, then verify).
- Results and redone work: OUT (the READY fence on outputs), REDO (the redo ledger).

**Tokens (helper work).** About 508 M against about 222 M planned, 2.3 times. B1-1 (8 fixes) about 286 M; B1-2 (W2,
PLAN) 84.6 M; B1-3 (W3, CLOSE) 84.8 M; B1-4 (W4, S2.1, the combined review) 52.3 M. A fix's builder used 15 to 47 M
against 11.7 M planned. The weekly meter went from 67 % to 78 %, about 46 M helper tokens a point.

**Time.** Slice 1 took 6.5 hours (19:16 to 01:48 UTC); the whole build so far 9.4 hours (16:22 to 01:48). Helpers ran
1.8 at a time on average (plan gate log): 3.2 in B1-1, which had 8 independent fixes (8 at most); 1.5 to 1.6 in the
three batches after it, where only two units were ready at once. The chain W1, W2, W3, W4 set the time: each link
took 80 to 117 minutes (build 40 to 60 helper-minutes with take-overs at the 330 K checkpoint, review 15 to 35
minutes, fixes, merge, suite). No helper ran for 42 minutes in all, at batch boundaries.

**Found by the reviews, not breaking.**
- W6: an acknowledgement re-arms the age cap, so a stuck attempt whose coordinator only acknowledges may never reach
  the owner. For S2.2 to model; S2.4 sends it back to its fix if the property fails.
- CLOSE: the app's session id and the CLI's id are not tied, so every close ends with the owner's relayed `closed`.
- W4: long coordinator turns (89 measured turns ran over 60 minutes) will raise false dead-man alerts.
- Changes no test caught (test gaps, the code right in each): on the end list in `STATE.md`.

**Not done or not known.**
- Nothing has run for real. The pilot (slice 3) is the first real run.
- The dead-man's task file was never imported (nothing is registered on this PC), so its alert has not been seen.
- `stop_verify_ms` is a guess. The end-to-end run covers neither the hook's close path nor a second session in one
  folder; unit tests do.
- Wrong claims found by the reviews: one test (S2.1's N2) named a path it did not reach; its reviewer caught it.

**Due.**
- Slice 2 needs a larger cap. S2.2 (the model brought to the code as built): 25.4 M planned, about 70 M at the
  measured ratio (the last two fixes used 2.77 times their plan). S2.3 and S2.4 (one model check, judged): 9.4 M
  planned, about 10 to 20 M. If the check sends a fix back: about 41 M more (W4's builder and review). Total about 80
  to 90 M (about 2 points), about 125 to 130 M (about 3 points) with one fix round.
- A successor root: this root has been compacted twice; it starts on a turn the owner types.
