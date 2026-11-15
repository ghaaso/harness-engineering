# Method refuter: window-fill measurement

All figures are from my own runs in this folder (scripts: dump.js, attr.js, a2-a14.js, again.js, collide.js, shell2.js; samples: sample-*.json, again-sample.json).
I reproduced the original exactly first (run.js + summary.js copied here): fetched 26.9, own 32.5, start 28.6, first open 18.7, opened again 7.0, 4331M actual, 233 windows, 2.21 chars per token.

Verdict: the method holds. Two headline numbers need a correction or a caveat: fetched (shell classification) and "opened again" (it is not a measure of redundant reading).

## 1. Accounting identity: holds
- Thinking stays in the window. Incoming chars per token, (d - out) taken as the arrival: 2.37-2.51 after calls with thinking and 2.50-2.58 after calls without. If thinking were dropped the thinking calls would give 1.37-1.77. This also holds across a human message (2.28-2.53). In 3 of 15,688 pairs d < out.
- Pairs where d misses out + chars/2.5 by more than 2,000 tokens and more than 50 %: 37 pairs, holding 0.6 % of gap-weighted tokens.
- There are 38 `thinking_drop` attachments. 36 fall on compactions. The rest cause 3 drops inside windows (15-20 %). The method keeps counting what was dropped, so attributed is 4361M against 4331M actual. Own output is overstated by at most 0.7 points.

## 2. Window detection: holds
- All 50 drops over 20 % carry a compaction summary, and no summary arrives without one. The smallest compaction drop is 63 %. Thresholds from 0.2 to 0.6, and a rule of "break on summary", give the same 233 windows and the same shares.
- A threshold of 0.1 or lower adds 3 windows at thinking drops, with start +2.6 and own -1.6. Those 3 windows are invented, so 0.2 is the right setting.

## 3. Character split and the 2.21 estimate: hold
- Fitted chars per token are 2.47-2.60 for shell-read, file-read, shell-other and messages. Re-splitting the gaps with the fitted rates moves fetched by +0.1 and nothing else. Only 7.9 % of fetched tokens sit in mixed gaps.
- The 2.21 rate only splits own output internally, so own (32.5) does not depend on it. Thinking is 12.3 (12.7 with per-kind rates: commands 1.98, writes 2.5, text 2.8). Across rates from 1.6 to 2.8 it runs from 9.5 to 15.2.

## 4. Shell classification: fetched is about 1.6 points low
- **Hand sample, 60 shell-read:** 8 are not reads (13 % by count, 1.5 % by tokens). They are `cat > / cat >>` heredoc writes, `sed -i`, and scripts written and then run.
- **Hand sample, 60 shell-other**, by tokens:
  - 35 % reads of code or docs. Most begin with a variable assignment (`S="..."; grep ...`), which the classifier takes as the command word ("scratchpad\"" and the like). The others are `for` loops that `cat` files.
  - 27 % reads of logs or waits.
  - 22 % runs, 5 % edits, 2 % git writes, 8 % file moves.
- **Hand sample, 30 shell-run:** 22 % by tokens is read-dominated and 14 % is heredoc edits.
- **Population, re-classified with a stricter classifier** (shell2.js; it agrees with the hand labels):
  - writes and runs sitting in shell-read: 0.77 points
  - reads sitting in shell-other: 2.43 points (1.54 repo files, 0.89 logs)
  - reads sitting in shell-run: about 0.27 points
  - Fetched becomes **28.5** and unclassified 4.3 becomes 0.5. With every log or temp read taken out, fetched is 26.8. The original 26.9 is close to "repo reads only" because two errors offset each other, not by design.
- `sed`: `sed -n` is 10.3 points and is a range read. `sed -i` is 346 commands and 0.28 points, all counted as reads.
- Heredoc writes counted as reads come to 0.52 points. They also land in "opened again" and in the top-files list.

## 5. "Same file opened again" (7.0) is mostly not redundant reading
- Automated: an identical command or an identical Read range accounts for 0.00 points. A re-read after an edit is at least 0.47 points. Everything else is a different command on the same key.
- Hand sample of 40:

  | Kind | Cases | Share of tokens |
  | --- | --- | --- |
  | Different part or different content of the file | 22 | 68-87 % |
  | Strict subset of an earlier read | 3 | 3-8 % |
  | Partial overlap | 4 | 5-13 % |
  | Re-read after an edit | 1 | — |
  | Writes counted as reads | 8 | 3-7 % |
  | Log poll or run | 2 | — |

  Where a range is given, the lower figure includes the two largest cases and the upper one excludes them.
- Content genuinely seen earlier in the window is about 0.6-1.5 points, not 7.0.
- Path-key collisions are 0.11 points at most.

## 6. Grouping, filters, de-duplication, bill
- All 15,921 calls fall in November. No message id appears in two files, no main file has sidechain lines, and no session is resumed into a new file (the largest first context is 136k).
- The subagents of slice sessions (75 files, 9.3 % of tokens) are counted under "subagents". Slice work is therefore 75.3 % of tokens, not 66.0 %.
- The context sum is 98.2 % cache reads. Weighting input by price (cache read 0.1, write 1.25) leaves the shares within 0.6 points (fetched 27.5). Output generation at 5x, however, is about 16 % of a price-weighted bill (98M of about 620M input-equivalents). As shares of that bill: fetched 23.0, own (re-read) 27.1, start 23.7, output generation 16.3. "Share of context tokens" is the right description; "share of the bill" is not.
- Window start contains the first user message (about 0.9 points). Content carried through compactions above the session's base context is 2.1 points.

## Corrected figures
| Number | As reported | Corrected | Notes |
| --- | --- | --- | --- |
| Fetched | 26.9 | 28.5 | Consistent classifier, logs counted. 26.8 with logs and temp reads excluded. |
| Own output | 32.5 | 31.8-32.5 | At most -0.7 from thinking drops. |
| Window start | 28.6 | 28.6 | Holds. |
| First open | 18.7 | 19.5 | 18.5 with logs excluded. |
| Opened again | 7.0 | 7.5 | Of which only about 0.6-1.5 is content already seen in the window. |
