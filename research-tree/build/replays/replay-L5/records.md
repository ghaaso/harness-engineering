# replay-L5: proposed library records (for the top session to write)

Evidence folder: `research-tree/build/replays/replay-L5/` (SCORING.md, scan.mjs, raw.json, summary.txt, RESULT.md).
All figures over 3,339 windows of four projects (harness, run, fixflow, clinic), 22.17 B context tokens, through 2026-11-23.

1. kind fact, status measured. "Held reads made stale at range level by a later edit: 1,855 of 35,569 content reads
   (5.2 %), 6.42 % of read tokens carried, 1.24 % of context tokens; 88 % of them by the window's own visible edit."
   Evidence: summary.txt, 'ALL four groups' lines 2-3; RESULT.md table.
2. kind fact, status measured. "Reads made stale by an edit the window could not see (helper, parent, sibling, other
   session, no harness notice): 217 reads, 0.77 % of read tokens carried, 0.15 % of context tokens; by project 0.80 %
   harness, 0.00 % run, 0.94 % fixflow, 0.52 % clinic of read tokens carried; one month above 1 % (fixflow 2026-10,
   3.22 %)." Evidence: summary.txt rows invisibleN, invisibleCarried and the by-month lines.
3. kind fact, status measured. "Own edits made on a read that another writer had made stale, with no re-read between:
   24 of 15,386 (0.16 %); the harness refused 27 edits as modified since read and sent 8 change notices on stale reads."
   Evidence: summary.txt rows acted, editErrStale, noticed; raw.json samples.
4. kind fact, status measured. "Dropping stale reads at the edit (C130): saves 271 M cache-read tokens, rewrites 77 M
   into cache; net on the meter -93 M fresh-token equivalents at 1.25x write weight, -151 M at 2x; 53 of 1,517 drop events
   pay for themselves." Evidence: summary.txt rows drop*.
5. kind fact, status measured. "In-window re-fetch of identical content: 18 of 35,569 reads; line-overlap re-fetch of
   Read ranges 0.15 M tokens, under 0.01 % of context tokens; this replaces sheet S14's 0.5-1.5 % estimate for re-fetch."
   Evidence: summary.txt rows refetchHash, overlapShare, overlapOfCtxOnce.
6. kind fact, status measured. "Reads not followed by an own edit of the same file in the same window: 89.0 % of read
   tokens carried (86.6-96.7 % by project); not comparable with the source's 73.4 % 'not needed by the next edit'."
   Evidence: summary.txt rows unneeded*.
7. kind ruling-proposal, status reasoned. "L5 (write-time invalidation by dropping held reads) and L4's state view: do not
   pilot on this PC's records; every do-not-pilot condition in SCORING.md holds in every project. Reopen only if parallel
   writers rise (measure the invisible share monthly) or for a notice-only form that does not rewrite the cache."
   Evidence: RESULT.md, 'What it changes next'.
8. kind limit, status observed. "The scan does not see shell writes or the owner's editor writes except through harness
   notices, so invisible staleness is undercounted by an unknown amount." Evidence: SCORING.md 'An edit'; RESULT.md 'What
   was NOT tested'.
