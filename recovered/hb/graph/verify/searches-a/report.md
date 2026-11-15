# searches-a report
Method: read all 200 items (node show.js A B prints id, search cut to 300 chars, said_before, next_calls), judged each by hand, wrote j1-j4.txt, build.js merges to classification.json (200 entries, ids 1-200).
Commands: node show.js 0 40 ... node show.js 160 200 ; node build.js
Counts (hand judgement, search text cut at 420 chars so tails unseen):
- cls: CONTENT 88, NOT_A_SEARCH 60, DEFINITION 28, CONNECTION 13, STATE_OR_LISTING 11
- graph_answer: none 161, partial 38, full 1
- step_saved: unlikely 198, cannot tell 2, likely 0
Pure connection lookups: 13 (6.5 %); 11 of those partial, 2 none (branch/commit refs).
Caveats: next_calls is only two calls, so a saved step further on cannot be seen. Items whose search is a heredoc script were judged NOT_A_SEARCH from the visible head.
