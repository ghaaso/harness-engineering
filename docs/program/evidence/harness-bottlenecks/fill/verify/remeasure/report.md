# Context fill: independent re-measurement (lane: remeasure)

Scope: 184 transcript files (4 root main, 26 slice main, 154 subagent) across the 19 clinic folders; 15,921 real calls, all dated 2026-11. Sum of context over calls (input + cache-read + cache-write) = 4,331.3M tokens.

## Method (my own)
1. Calls = distinct message.id on non-synthetic assistant lines; usage from the last line of each id.
2. Windows: each call's `requestRef` points to an `api-request` line with `base`/`keep`/`tail`. A new window starts at a file's first call, after an `isCompactSummary` line, when the request has no base (restart/resume), or when keep < 50% of the base list. Result: 305 windows (183 starts, 70 restarts, 50 compactions, 2 keep-drops; the "context fell >30%" fallback never fired).
3. Pieces: every block entering the window between call k-1 and call k (assistant output of k-1, tool results, user text, rendered attachments) is a piece entering at call k.
4. Delta attribution: (c) = A at the first call of the window, counted again at every later call. For each later call, delta = A_k - A_(k-1) is split over the pieces that entered in that gap, in proportion to an estimate (assistant output = usage output_tokens incl. thinking; other blocks = chars x fitted rate + 22.5 per block + 1,060 per image). A piece's tokens are then counted at every later November call in its window. This reconciles to the actual total by construction.
5. The estimate rates come from a least-squares fit of 15,616 per-call deltas (R^2 = 0.991): output 0.99, thinking 1.00 (thinking stays in context at full size), read results 2.59 chars/token, other tool results 2.39, text/attachments 2.48, 22.5 tokens per block, 1,060 per image. Only 1 negative delta (-26.8k).
6. (a) = results of Read/Grep/Glob, plus Bash/PowerShell results whose first real command (after cd/export/VAR=) is cat/head/tail/nl/Get-Content, sed with -n, grep/rg/find/ls/wc/awk/jq/tree/stat/du, or git diff/show/log/status/grep/blame. cat with a heredoc or a > redirect counts as a write, not (a). File key = path normalised to repo-relative (worktree prefix removed). "first" = the key's first read in the window; "reopen" = the same key read again (exact-duplicate = same key and same range); "rest" = searches and listings.

## Main result (delta-scaled, rates fitted)
| group | calls | sum context | a | b | c | d |
|---|---|---|---|---|---|---|
| all | 15,921 | 4,331.3M | 22.3% | 22.8% | 47.8% | 7.2% |
| slice main | 9,327 | 2,858.4M | 21.4% | 26.8% | 44.1% | 7.7% |
| root main | 1,331 | 666.1M | 4.1% | 15.4% | 72.1% | 8.5% |
| subagents | 5,263 | 806.8M | 40.1% | 15.0% | 40.6% | 4.3% |

(a) split, all: first open 13.4%, same file again 2.2% (exact duplicate 0.1%), rest 6.7%. Slice: 13.0 / 2.0 / 6.4. Root: 1.6 / 0.1 / 2.4. Sub: 24.4 / 4.5 (0.6) / 11.2.
Thinking is 8.8 of the 22.8 points in (b).
Reconciliation without forcing (estimates only): 4,312.7M of 4,331.3M = 99.6% (slice 99.5, root 99.9, sub 99.7).
Files: 1,450 distinct repo-relative paths read (2,542 when the same path in different worktrees counts separately). All keyed file reads = 15.5% of all tokens. The top 30 files = 5.0% of all tokens (22.4% of (a)). The largest single file is 0.3%.

## Sensitivity (share of (a), all sessions)
- Chars per token: fitted 22.3%; flat 4 chars/token scaled 20.6%; flat 4 unscaled 16.0% (but then only 88.7% of context is accounted for); flat 3 unscaled 19.9% (94.6% accounted for).
- Shell classification: dedicated tools only (Read/Grep/Glob) 5.4%; listed rule 22.3%; every Bash/PowerShell result counted as (a) 26.3%.
- Restart windows: by definition their whole start is (c). Restarts carry the prior context almost unchanged (A0 / previous last call: median 1.02, range 0.84-1.13, n = 70). If that carried start is split by the previous window's mix, (a) is 26.2% and (c) drops from 47.8% to 31.0%. Root main (c) drops from 72.1% to 19.3%.
- Broad shell rule plus carried restarts: 32.2%.
Range for (a) under the task's definition: 20.6%-32.2% with reconciled methods (16.0% if a flat 4 chars/token is used unreconciled). 5.4% if only the dedicated read and search tools count.

## Things a reader must know
- About 56% of (c) (26.9 of the 47.8 points) is the static session-start prefix (system prompt, tools, instructions, first prompt; 55k-80k tokens per call). Most of the rest is restart windows that resume with 100k-940k tokens of earlier history (slice and root restarts alone are 22.2 points), plus compaction summaries (about 98k start each).
- Re-reading a file is small: 2.2% of all tokens, and exact-duplicate re-reads are 0.1%. The cost of (a) is persistence, not repetition. Read content entered the windows once as 18.9M tokens and was processed 953.5M times (about 50 times each). The same holds for (b) (about 54 times) and (d) (about 57 times).
- Shell reads dominate (a): sed -n 6.2, Read 5.2, cat 4.0, grep 3.8, git diff/show/log 1.3 points. Grep and Glob are only 0.2. A rule that counts only the dedicated tools misses three quarters of the read traffic.
- Not in (a) under the listed rule: uv 0.8, `for` loops 0.5, sed without -n 0.35, echo 0.3 points.
- `api-request-blob` records exist, but 38,542 of 57,424 referenced message hashes (67%) have no stored blob, and the hash is not a plain sha256 of the message JSON. So exact request reconstruction was not possible. I used the request records only for window boundaries.
- More than half of calls (8,635 of 15,921) ran with more than 200k tokens of context.
