# S2.1 result (cross-fix tests)
- Branch `u/S2.1`, final commit 2687415f (on build 56918efb).
- Items 1 and 2 already exist and pass on build: lib "FX-PLAN T1 total table" (3 tests; the committed-at-started case is now a real test, CLOSE landed) and guard-hook "FX-W3 hook" (denied start: no start.json, every why). No change.
- Item 3 new in status.test.mjs: "S2.1 N2" x3 (brief text; endturn after handover exit 2; endturn after exit 75 incl. endturn itself busy -> 75, nothing written).
- Item 4: "S2.1 FX-W4 dead-man" written as a `todo` (status --deadman is an empty stub; W4 not landed). Whichever of W4/S2.1 lands second drops `todo`; field names (runs_no_alarm, alert) are guessed from FIX-wake, adapt to W4's output.
- Tests: status.test.mjs lane `S2.1-status-all`: 45 tests, 42 pass, 0 fail, 2 skipped, 1 todo. lib and guard-hook files not changed, not run.
- Wording changes (no departures file): spec/lib.md line 402 (todo wording gone); CONTRACT.md line 1337 (endturn also after handover exit 2 and exit 75). Read-through of CONTRACT/specs/brief found no other disagreement on these points.
- Tokens: build: S2.1 cross tests build | calls 19 | tokens 1.70 M
- Not done: full suite 5 (root's); W4 dead-man real test.
