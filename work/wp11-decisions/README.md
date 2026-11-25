# WP11 decision board

One page that lists every decision the colleague still owes, and the queue of agent runs booked on the colleague's PC.

- `decisions.json` is the truth for decisions. `queue.json` is the truth for booked runs.
- To change the board, edit a JSON file, then run `python3 build.py` (add `--today YYYY-MM-DD` to pick the day).
- That writes `index.html` (open it in a browser) and `BOARD.md`. Never edit those two by hand.
- A decision open for more than a day is marked "over a day". The goal is that none are.
- When a package has to wait on a decision, add an entry to that decision's `waits` list.
- D24 and D25 are named only in the 17 Nov split. Their exact questions need wording from the colleague.
- The page opens with a table of which package waits on which decision. Decisions that block nothing are folded away.
- Run the tests with `python3 -m unittest test_build`.
