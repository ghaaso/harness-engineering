# Slice 0 of the build: report (2026-11-19, 19:30 UTC)

**Answer.** Slice 0 is done. Three code units are on the `build` branch: 0b (strict hook writes and a hard-link
check), the landing script, and the skeleton that later fixes fill in. Full suite 1 passed: 969 tests, 0 failures, in
114 s. Every unit had a blind reviewer. All passed. One finding was breaking: the skeleton put a lock step outside the
run lock. It was confirmed in the design and fixed before the skeleton merged. Slice 1 has started: 7 fix builders at
once.

**What was settled.** Five facts were measured (hook ids, hard links, transcript record kinds, coordinator turn
lengths, the allow-list). The 17 branches the change list had left "to the owner" were settled from the record,
with no question to the owner.

**Tokens.** Slice 0 used about 105 M tokens of helper work against 78.6 M planned, 1.35 times the plan. The skeleton
alone took 61 M with its fix round and reviewers, against 17 M planned. The weekly meter went from 64 % to 67 %; the
stop line is 78 %.

**Changed from the plan, each from a measurement.**
1. The root's hand-over point is about 250-270 K of context, not 129 K: the reading the start requires already
   brings a root to 169 K.
2. The build's merge copy lives outside the `.claude` folder, because one test file fails under any `.claude` folder.
3. Batch B1-1 runs 7 builders at once, not 3: builders spend 4-10 % of their time in tests, not 30-40 %.

**Not sure.** Coordinator turns run past 60 minutes even without idle time, so one fix (W2) takes its one-slot
branch. A session start on a turn the app refuses is not in the model yet: the model unit (S2.2) gets it.

**Due.** A successor root: this root is past its hand-over point (340 K of context).
