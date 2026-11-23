# replay-L2 (L2 with L27): the fixed prefix per role and per helper start, 2026-11-23

**Answer.** Over 1,071 transcripts of the four projects (68,556 calls), the prefix (context at a window's first call) is a
median 58,045 tokens (helpers 55-58 K, FixFlow helpers 72 K; sessions 78-91 K) and is 30.1 % of all context tokens
(S12's 27 % holds overall). Its fresh part (written at starts and rewritten after lapses) is 61.2 M of 472.8 M fresh tokens,
**12.9 %** (10.2 to 19.5 % by project), but only 0.4 % of all tokens. On a meter that weighs a cached read at 1 % of a fresh
token (S17), a radical lean prefix (brief + 5,000) would save at most 15.6 %; removing only what is loaded and never used
(skill listing, deferred-tool names) saves 1.9 %.

Scoring: `SCORING.md` (written before the counts, unchanged). Scripts: `scan.mjs`, `aggregate.mjs`; raw output:
`raw/scan-*.jsonl` (one line per transcript), `raw/aggregate.txt` (all tables, sections 1 to 6).

## Counts by project (both roles; `raw/aggregate.txt` section 1)

| project | files | calls | prefix P median | prefix re-read / context | prefix fresh: starts + later | / fresh tokens | / all tokens | start written fresh / start context |
|---|---|---|---|---|---|---|---|---|
| harness (this repository) | 321 | 13,140 | 58,400 | 37.2 % | 9.9 M + 2.0 M | 13.9 % | 0.5 % | 51.3 % |
| run (research run) | 302 | 7,065 | 57,645 | 50.3 % | 7.7 M + 1.1 M | 19.5 % | 1.1 % | 44.9 % |
| FixFlow (product) | 270 | 31,578 | 74,451 | 28.6 % | 11.4 M + 17.4 M | 12.6 % | 0.3 % | 59.8 % |
| clinic | 178 | 16,773 | 55,422 | 26.4 % | 6.3 M + 5.3 M | 10.2 % | 0.2 % | 58.9 % |
| four projects | 1,071 | 68,556 | 58,045 | 30.1 % | 35.3 M + 25.9 M | 12.9 % | 0.4 % | 53.3 % |
| (other folders, not judged) | 56 | 2,999 | 51,263 | 22.7 % | 2.1 M + 1.1 M | 9.3 % | 0.3 % | 61.6 % |

By role: helpers carry most of the start writes (35.3 M of starts are 31.5 M helpers); sessions' prefix fresh is mostly
"later" (rewrites after lapses or compactions: FixFlow sessions 7.3 M later against 1.7 M at starts). Helpers' prefix fresh
is 14-19 % of their fresh tokens; sessions' 7-13 %. By kind (section 3): short helpers carry the highest shares (harness
build sonnet 39.8 %, run run sonnet 35.7 %, haiku extract 20-26 % of their fresh); long Opus helpers the lowest (refute
7.0-7.7 %, build-invariant 9.9 %). Months: October records survive only in small number (clinic 13, FixFlow 8 files);
everything else is November (section 2).

## What the prefix is made of (section 4; helpers and sessions with the attachment records, 1,070 files)

Medians, tokens; component characters divided by 3.28 (fitted over 951 helpers, R2 0.65; per-project fits were unstable,
1.8 to 38 chars a token, so each component figure is +-20 %; P itself is exact).

| role | P | skill listing | deferred tool names | CLAUDE.md + memory | system prompt | session ctx + other | brief | rest: tool schemas |
|---|---|---|---|---|---|---|---|---|
| harness helper | 57,565 | 6,305 | 2,493 | 3,917 | 990 | 893 | 257 | 40,717 |
| run helper | 57,635 | 6,305 | 2,545 | 1,810 | 990 | 1,209 | 43 | 44,909 |
| FixFlow helper | 72,030 | 9,807 | 2,493 | 14,359 | 990 | 1,048 | 1,273 | 43,409 |
| clinic helper | 55,260 | 6,271 | 2,517 | 3,755 | 859 | 736 | 1,688 | 39,599 |
| harness session | 85,751 | 9,813 | 2,608 | 3,683 | 10,484 | 6,508 | 1,097 | 51,340 |

The brief is small (a median 43-1,700 tokens for helpers, since briefs point at files); the loaded tool schemas are about
70 % of a helper's prefix (40-45 K); CLAUDE.md and memory weigh 14 K only in FixFlow.

## Loaded and never used (section 5)
- Skill listing (6-10 K tokens): loaded in 1,029 files, no Skill call in 996 (96.8 %). Skills are switched off for this
  repository's work by its settings (r57-0036), yet the listing still loads.
- Deferred tool names (2.5 K): no ToolSearch call in 726 of 916 helper files (79 %) and 18 of 113 sessions.
- Together, unused components are 1.4-2.7 % of sessions' context tokens and 4.0-7.0 % of helpers'.
- Tool schemas: transcripts do not record which schemas were loaded, so their unused part is not measured. Called by
  helpers (of 951): Bash 895, Read 805, Write 665, Edit 242, Grep 215, ToolSearch 190; browser tools 6, Artifact 10,
  Agent 22. The schemas of browser, artifact, docs and session-management tools are in a helper's prefix (40-45 K) and are
  almost never called by a helper; their size is an estimate only (not measured here).

## Ceiling on the meter (section 6; index = fresh + 0.01 x cache reads, S17; tokens, not money)

| project | meter index | lean A (brief + 5,000) saves | lean B (unused parts out) saves |
|---|---|---|---|
| harness | 107.0 M | 18.1 M (16.9 %) | 2.9 M (2.7 %) |
| run | 52.6 M | 11.6 M (22.0 %) | 1.8 M (3.5 %) |
| FixFlow | 313.7 M | 48.4 M (15.4 %) | 4.6 M (1.5 %) |
| clinic | 159.6 M | 20.7 M (12.9 %) | 2.6 M (1.6 %) |
| four projects | 633.0 M | 98.8 M (15.6 %) | 12.0 M (1.9 %) |

Lean A saves 54.8 M fresh (11.6 % of fresh) and 4.39 B cached reads (weighed at 1 %). A is a ceiling: it assumes the
work gets done with no tool schemas beyond 5,000 tokens, which L27's sources (mini-SWE-agent, bash only) suggest is
possible but not here measured; extra turns (L27: 2-7x more turns in Claude Code, the other way) are not modelled.

## Checks against the sheet
- S12 "27 % of context tokens": 30.1 % on the four projects now, within 5 points: holds. Per project it does not
  reproduce (FixFlow 28.6 % against 47 %, clinic 26.4 % against 19 %): TB counted October's 1,118 FixFlow agent windows,
  which are no longer on disk (8 FixFlow files of October remain), so this is not a like-with-like check per project.
- S12 "about 70,000 per fresh agent": holds for FixFlow helpers (72 K, its 14 K CLAUDE.md and memory); elsewhere a
  helper's prefix is 55-58 K (as hc1-0104: 59 K). Sessions 78-91 K.
- Judge's bound for the run (prefix writes at most 10-16 M of 44.5 M fresh): measured 8.8 M of 44.9 M (19.5 %).

## The seven measures
- Token count: prefix re-read is 30.1 % of context tokens (about 4.3 B of the four projects' 14.4 B context tokens), almost
  all of it cache reads.
- Token cost (on the meter index): ceiling 15.6 % (lean A), 1.9 % for dropping unused listings; the fresh side alone is
  12.9 % of fresh tokens, of which 5.5 points are rewrites after lapses (L24/L25's lever, not L2's).
- Throughput, efficiency, time: a smaller prefix shortens a helper's first call; not measured here.
- Quality and hallucinations: not touched by a count; L2's quality claim (curated Skills +16.6 points) needs its pilot.

## What was NOT tested
- Which tool schemas are loaded per transcript and their token size (not in the records); so the unused part of the
  largest component (40-45 K) is an estimate, not a count.
- Component token sizes rest on a chars-per-token fit (3.28, +-20 %).
- After a compaction the prefix is taken as the first window's P (a reset window's prefix is not re-measured).
- Whether a leaner prefix lowers quality or raises turns (L27's turns side); cost per solved task needs tasks.
- October records are mostly gone; other harnesses and other users' setups; Fable and Haiku sessions are few.

## What it changes next
By the rule fixed in SCORING.md, prefix fresh is 10 % or more of fresh tokens in all four projects (10.2-19.5 %), so the
"do not pilot" line is not met. But the share that a prefix change can remove without touching the tool set is small
(1.9 % of the meter), and the larger 15.6 % needs tool schemas cut. Next, in order:
1. Adopt as is, no pilot: stop loading the skill listing in this repository's sessions and helpers (skills are already
   switched off, r57-0036; 96.8 % of files never call Skill). Saves 6-10 K a window, 1.9 % of the meter with the deferred
   names.
2. Measure first (no model run): the token size of each loaded tool schema family, from one probe session with and
   without each MCP server (browser, docs, artifact, session tools), against the call counts above. If helpers' unused
   schemas exceed 15 K, a per-role tool set is the next lever (a settings change, no pilot needed).
3. L2/L27's 384 M pilot only after 2, and only on short helpers (run, build, extract kinds), where the prefix is 20-40 %
   of their fresh tokens; long Opus helpers (7-10 %) and sessions would gain little.
