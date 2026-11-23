# replay-L2: proposed library records (for the top session to write)

Evidence root: `research-tree/build/replays/replay-L2/` (RESULT.md; raw/aggregate.txt sections 1-6; SCORING.md).

1. kind fact, status measured. "The fixed prefix (context at a window's first call) is a median 58,045 tokens over 1,071
   transcripts of the four projects (helpers 55-58 K, FixFlow helpers 72 K, sessions 78-91 K) and is 30.1 % of their
   context tokens; S12's 27 % holds overall but not per project (FixFlow 28.6 % against 47 %, clinic 26.4 % against 19 %;
   TB's October FixFlow windows are no longer on disk)." Evidence: raw/aggregate.txt section 1, rows "four projects",
   "fixflow (both)", "clinic (both)"; RESULT.md "Checks against the sheet".
2. kind fact, status measured. "The prefix's fresh part (written at starts plus rewritten after lapses or compactions) is
   61.2 M of 472.8 M fresh tokens, 12.9 % (harness 13.9, run 19.5, FixFlow 12.6, clinic 10.2 %), 0.4 % of all tokens;
   5.5 points of it are rewrites after the first call (L24/L25 ground)." Evidence: raw/aggregate.txt section 1.
3. kind fact, status measured. "At a helper's start 53.3 % of the start context is written fresh and 46.7 % read from a
   cache a sibling or parent wrote (run helpers 44.9 % written)." Evidence: raw/aggregate.txt section 1, last-but-one column.
4. kind fact, status measured. "The skill listing (6-10 K tokens) loads in 1,029 transcripts and Skill is never called in
   996 (96.8 %), though skills are switched off for this repository (r57-0036); the deferred-tool list (2.5 K) goes unused
   in 726 of 916 helpers. Unused listings are 4.0-7.0 % of helpers' context tokens, 1.4-2.7 % of sessions'." Evidence:
   raw/aggregate.txt section 5.
5. kind fact, status observed (component sizes by a chars-per-token fit, 3.28, +-20 %). "Loaded tool schemas are about 70 %
   of a helper's prefix (40-45 K of 55-58 K); the brief is a median 43-1,700 tokens; CLAUDE.md and memory 14 K in FixFlow,
   2-4 K elsewhere; the session system prompt about 10 K, a helper's about 1 K." Evidence: raw/aggregate.txt section 4.
6. kind result, status computed. "Ceiling on the meter (fresh + 1 % of cache reads): a lean prefix of brief + 5,000 tokens
   saves at most 15.6 % (12.9-22.0 % by project); dropping only the unused listings saves 1.9 % (1.5-3.5 %)." Evidence:
   raw/aggregate.txt section 6.
7. kind decision proposal, status reasoned. "Adopt without pilot: stop loading the skill listing here. Measure next, no
   model run: each tool-schema family's token size (probe with and without each MCP server). Pilot L2/L27 (384 M) only
   after that, only on short helpers (run, build, extract), where the prefix is 20-40 % of their fresh tokens." Evidence:
   RESULT.md "What it changes next".
