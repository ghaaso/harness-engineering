# PC2 (refute FX-PILOT-PC B1): a control row's age cap of its own

Branch u/PC2, commit a0a6c7caface4ab0d224e28e69b38de1f270f12b; landed on build at 2662bb997faeb8c55dfe28b4bb0a0db4c4fbe48c
(pre f32dbdd6, landings/20261124T083152Z-PC2-45712).

attempt_max_ticks_control = 246 ticks (4.1 h at delta 60 s); tree rows keep attempt_max_ticks 107. Inputs: round 3's four
lanes, serial helper-minutes min 118, median 163, max 181 (COMPLEXITY.md:126, :191-192, :198). The record holds only those
three, not the four values, so Q3 + 1.5 IQR (type-7 quantiles, which reproduce 107's Q1 0.611, Q3 1.075) is bounded:
3 x c - 2.25 x 163 + 68.875 with c the third lane in 163-181 gives 191.1-245.1 min; taken the top, rounded up, so the cap
stays above every field whatever the middle lanes were (PILOT-PLAN s4 item 4). Departure from "the record's own method":
the bounded rule, not the record's min-max range (181 alone would leave no margin).

Files: tcb/watch.mjs (actDueIdleAgeCap by role), tcb/thresholds.json, tcb/fixtures/watch/_testdata.json,
tcb/briefs/coordinator.md 7b, tcb/test/watch.test.mjs (new: control row at 181 not flagged, at 246 flagged; tree row at 181 flagged).

Tests (landing, one lane call): watch 83 pass / 0 fail / 4 skipped; guard-hook 32/0/3; selftest shards 29/0/2 + rest 2/0.
Left: CONTRACT.md's threshold table still shows attempt_max_ticks 240 (stale since PC); not changed.
