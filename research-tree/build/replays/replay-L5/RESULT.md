# replay-L5: held reads made stale by a later edit (with L4's re-fetch count)

**Answer.** Of 35,569 file-content reads in 3,339 windows (four projects, 22.17 B context tokens), 1,855 (5.2 %) were made
stale at range level while still held, and 88 % of those by the window's own edit, which the window sees. Reads made stale
by an edit the window could not see (a helper, the parent, a sibling helper or another session, with no harness notice):
217 reads, 0.77 % of read tokens carried, 0.15 % of all context tokens; 24 of 15,386 own edits (0.16 %) were then made on
such a stale read. Dropping stale reads at the edit saves 271 M cache-read tokens but rewrites 77 M tokens into cache:
on the meter it loses in every project (net -93 M fresh-token equivalents at 1.25x). L4: re-fetch of identical content
in one window is 18 reads; line-overlap re-fetch is 0.15 M tokens, under 0.01 % of context. **By the scoring: do not pilot L5
or L4's state view here.**

## Counts by project (scan.mjs, raw.json, summary.txt)

| | harness | run | fixflow | clinic |
|---|---|---|---|---|
| windows (helpers) | 327 (296) | 302 (301) | 2,163 (2,113) | 547 (506) |
| calls | 13,411 | 7,065 | 64,857 | 21,370 |
| context tokens | 2,213 M | 801 M | 13,928 M | 5,229 M |
| content reads | 4,583 | 3,255 | 19,647 | 8,084 |
| read tokens carried (share of context) | 544 M (24.6 %) | 213 M (26.6 %) | 2,435 M (17.5 %) | 1,087 M (20.8 %) |
| stale, file level: reads; share of read tokens carried | 304; 5.28 % | 42; 1.25 % | 1,936; 10.36 % | 362; 6.62 % |
| stale, range level: reads; share once; carried | 247; 6.70 %; 4.64 % | 39; 2.29 %; 1.23 % | 1,299; 6.39 %; 7.80 % | 270; 4.11 %; 5.24 % |
| file-level flags that are not range-level (false alarms of a file-level rule) | 18.8 % | 7.1 % | 32.9 % | 25.4 % |
| range level by: same / helper / parent / sibling / other | 217/6/11/4/9 | 34/0/0/5/0 | 1,132/3/21/67/76 | 247/2/10/0/11 |
| invisible (not same, no notice): reads | 29 | 5 | 160 | 23 |
| harness notice (`edited_text_file`) received | 1 | 0 | 7 | 0 |
| invisible: share of read tokens carried; of context | 0.80 %; 0.20 % | 0.00 %; 0.00 % | 0.94 %; 0.17 % | 0.52 %; 0.11 % |
| own edit made on an invisible stale read / own edits | 0 / 1,864 | 0 / 590 | 22 / 9,708 (0.23 %) | 2 / 3,224 (0.06 %) |
| harness refused an edit as "modified since read" | 13 | 0 | 7 | 7 |
| calls carrying a stale read after the edit: median, p90 | 17, 50 | 7, 10 | 29, 106 | 35, 172 |
| reads no later own edit needed: once; carried | 93.5 %; 91.4 % | 97.6 %; 96.7 % | 92.9 %; 86.6 % | 95.2 %; 91.8 % |
| same, windows that edit at all (carried) | 91.3 % | 96.6 % | 82.7 % | 89.9 % |
| L4: identical re-fetch while held (reads) | 1 | 0 | 16 | 1 |
| L4: line-overlap re-fetch, share of read tokens | 0.04 % | 0.02 % | 0.19 % | 0.03 % |
| L4: same file read again, any range (upper bound, mostly paging) | 22.0 % | 23.9 % | 27.3 % | 18.4 % |
| drop at the edit: events; saved cache reads; rewrite | 216; 25.6 M; 14.4 M | 35; 2.6 M; 1.3 M | 1,059; 186.5 M; 51.2 M | 207; 56.5 M; 10.3 M |
| drop, net on the meter at 1.25x / 2x (fresh-token equiv.) | -17.6 / -28.3 M | -1.6 / -2.6 M | -61.6 / -100.0 M | -12.2 / -20.0 M |
| drop events that save more than they cost (1.25x) | 0 of 216 | 0 of 35 | 41 of 1,059 | 12 of 207 |

By month: FixFlow October 2026 is the one cell above 1 %: invisible stale reads 3.22 % of its 226 M read tokens carried
(November 0.71 %). Clinic October 0.59 %, November 0.50 %. Harness and the run have November only.

## How each was counted (SCORING.md, written before the counts)
- Windows: each transcript file, cut at compaction; a read is held from its result to the segment's end. Calls once per
  message id. Reads: Read, Grep in content mode, and shell reads (cat, head, tail, sed, Get-Content, git show/diff) with
  a path; Glob and path-list Grep are fetched tokens but never stale. Image results skipped.
- Edits: Edit, MultiEdit, Write, NotebookEdit that did not return an error, from all 3,339 windows, by timestamp.
  Range level: a Write, a whole-file read, or the edit's `old_string` (first line of 6+ characters) found in the read's
  text (Grep: a shown line inside the `old_string`).
- Tokens: characters over a chars-per-token ratio calibrated in the scan (2.28-2.64; context growth between two calls
  with only text tool results between them). Shares do not depend on it; read tokens carried come out at 17.5-26.6 % of
  context, against TOKEN-BOTTLENECK's 23-27 % for fetched content, a cross-check.
- Drop: all stale reads due at the same call dropped together; rewrite = that call's context minus the position of the
  earliest dropped read minus the dropped tokens; saved = dropped tokens x calls left in the segment. Meter: cached re-read
  0.01, write 1.25 or 2.0 of a fresh token (S17).
- Run: 42 s for 5.4 GB of transcripts, one node process, no model call.

## The seven measures
- **Token count**: the most L5 could remove is the stale reads' carried tokens, 6.42 % of read tokens carried, 1.24 % of
  context tokens (274.7 M of 22.17 B); its own manager adds 0.8-4.7 % in the source, more than the 1.24 % it could remove.
  Only the invisible part (0.15 % of context) is something today's harness does not already show the model.
- **Token cost**: negative. Dropping a held read mid-window breaks the cache prefix (C130): 77 M tokens rewritten against
  271 M cache reads saved; at 1 % weight per re-read the drop costs about 35x what it saves at 1.25x (net -93 M fresh
  equivalents; -151 M at 2x). 53 of 1,517 drop events pay for themselves.
- **Quality / hallucinations**: the risk L5 targets (acting on content another writer changed) occurred on 24 of 15,386
  own edits (0.16 %), 22 of them in FixFlow; the harness itself refused 27 edits as modified since read and sent 8 notices.
  Whether those 24 edits did harm is not known from the scan (their `old_string` still matched, so the edit applied).
- **Throughput, efficiency, time**: not measured; no call is saved by a drop (re-fetching would add calls).

## What was NOT tested
- Edits made through the shell (redirection, `sed -i`, scripts) and by the owner in an editor are not seen, except where the
  harness sent a notice: invisible staleness is an undercount by an unknown amount. This repository's builds write many
  files through node scripts.
- No symbol-level diff (the source's graph): range level here is a text match, coarser at one end (whole-file reads
  always count) and finer at the other (an edit of a function's callers is not counted as falsifying a read of it).
- The source's "not needed by the next edit" (73.4 %) is not the same measure as "no later own edit of the same file"
  (89 % here); this repository's sessions are mostly research and reading, so the two are not comparable as figures.
- Quality effect: no resolve rate; no model run, as the brief asks. The 24 acted-on-stale edits are listed by kind in
  raw.json `samples` (first 40 per group), not judged.
- Shell and Grep reads are not in the line-overlap re-fetch count (L4); identical-content re-fetch covers all kinds.
- Cache life: drops were costed as if the cache had not lapsed; a lapse makes the rewrite free but is L24's count.

## What it changes next
- **Do not pilot L5** (all three scoring conditions hold in every project: invisible stale under 1 % of read tokens
  carried, the drop's net negative at 1.25x, acted-on-stale under 1 % of edits). The token side loses on the meter because
  of the cache, the quality side is small and already partly covered by the harness's notice and refusal.
- **L4's state view has no ceiling here**: in-window re-fetch of the same content is under 0.01 % of context, not S14's
  0.5-1.5 %; sheet S14's re-fetch estimate should be replaced by this count.
- What would reopen L5: a measured rise in parallel writers (the October FixFlow cell, 3.22 %, came from many sessions on
  one tree), or a mechanism that marks a read stale without removing it (a notice, no cache rewrite), which costs only
  its own tokens: that is the harness's `edited_text_file` notice extended to helper and sibling edits, measured first by
  counting the 217 invisible cases' share in the next month.
