# What is proven

This list holds the pieces of this repository that have a record with a number behind them; each arrived through a pull request the owner approved.
Everything else of this side is on `bilal/build`, and the folders of the archive stay here as evidence.

| piece | what it is | its number | which measure | gain measured | records | promoted on |
| --- | --- | --- | --- | --- | --- | --- |
| Enforcement hooks | Hooks that refuse a helper on the wrong model, a fan-out without a limit or a fresh meter reading, an edit of archived evidence, a call past a session's window ceiling, and rounds of review nobody asked for; with their tests and the eight lean helper types. | Their tests pass (202, 37, 36, 25 and 17 cases) and each was seen refusing a real call | quality | not measured | r57-0151, r57-0120, r57-0164, t8-0108, t8-0110, t8-0111 | 2026-11-25 |
| Journal tool and commit check | The only way a record is added to the record book, and the check that refuses a commit which changes evidence or a journal line. | 19 commit-check tests pass and all 4,131 journal records pass its rules | quality | not measured | r57-0164, r57-0152, t8-0113 | 2026-11-25 |
| Lane and landing scripts | The queue that runs checks side by side and the script that lands a finished unit through the check. | 780 commands went through the lane in the build; the tree's test suite went from 596 s to 120 s with four files at once | time taken | measured: 596 s to 120.4 s | r57-0127, r57-0159 | 2026-11-25 |

How to set these pieces up and use them on another machine: `harness-kit/README.md`. Who has what: `OWNERS.json`.
