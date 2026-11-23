# replay-L24: proposed library records (for the top session to write)

Evidence paths are relative to `research-tree/build/replays/replay-L24/`.

1. kind fact, status measured. "Cache lapses rewrote 151.5 M of 927.4 M fresh tokens (16.3 %; 0.62 % of all tokens) in
   703 of 121,284 calls over all transcripts on this PC (Oct-Nov 2026): FixFlow 19.8 %, clinic 24.1 %, harness 8.3 %,
   research run 6.1 % of each project's fresh tokens; helpers 87.9 M, sessions 63.6 M." Evidence: RESULT.md table 1;
   summary.txt lines 1-10.
2. kind fact, status measured. "Prefix breaks inside a stream (cache lost with no first call, lapse, compaction or model
   change) are 21 calls, 2.6 M tokens, 0.28 % of fresh tokens; L24's break guard has little to act on here." Evidence:
   age.txt lines 1-2; RESULT.md "What it changes next".
3. kind mistake, status measured. "Telling a lapse from a break by the gap between response timestamps misclassifies:
   112 of 133 such 'breaks' (14.48 M) were lapses when the cache age is taken between requests (a long generation plus
   the wait). Measure cache age from request to request." Evidence: age.txt line 3; SCORING.md amendment.
4. kind fact, status measured. "The largest lapse block is helpers waiting 5-10 minutes: 296 calls, 46.2 M tokens, 30 %
   of lapse tokens, next to the mean check wait of 283.8 s (S7) and a helper cache life of 300 s." Evidence: summary.txt,
   the helper:300-600 line; RESULT.md table 2.
5. kind fact, status measured (on assumed weights). "A keep-alive capped at 2 h would save net 95.5 M (w1h 1.25) to
   109.1 M (w1h 2) meter tokens, 7.9-8.1 % of the meter; capped at 30 min 5.0-5.6 %; at 8 h 10.6-12.2 %. A 1-hour cache
   on all helper writes loses unless a 1-hour write weighs under 1.14 fresh tokens (-79.5 M at 1.25, -502 M at 2)."
   Evidence: ka.txt; summary.txt, the break-even line. Not tested: that any keep-alive is available in Claude Code.
6. kind fact, status measured. "Helpers that start within 300 s of a sibling (same parent and model) already read cache
   on their first call in 2,672 of 3,053 cases (87.5 %), alone in 226 of 942 (24 %); the unshared part is estimated at
   17.8 M (1.9 % of fresh)." Evidence: agg.json `sibStats`; RESULT.md "How it was counted".
7. kind task, status reasoned. "Before an L25 pilot: refit the 132 meter readings (r57-0175) with 5-minute and 1-hour
   writes apart to get the 1-hour write weight, and check whether helper waits can be split under 270 s; L24's break
   guard is not piloted." Evidence: RESULT.md "What it changes next".
