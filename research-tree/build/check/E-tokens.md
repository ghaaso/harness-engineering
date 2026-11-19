# E: tokens per kind of session

Source: `research-tree/build/check/tokens.mjs` over `C:\Users\User\.claude\projects` (3,622 transcripts with at least one counted call), run 2026-11-19 about 11:43 UTC. Tables: `tokens-transcripts.csv`, `tokens-days.csv`, `tokens-calls-harness.csv`, `tokens-10min.csv` (extra: 10-minute buckets from 2026-11-16, for section 4).

**How counted (all sections).** A call is one distinct `message.id` of an assistant line with `message.usage`; where one id is written on several lines, input, cache-creation and cache-read are taken from the last line that has them and output is the maximum over the lines. Synthetic lines are skipped. "Total tokens" is the four fields added: input + cache_creation + cache_read + output (cache reads are counted every time they are re-read, so the total is dominated by cache reads; the tables also show each field). "Context" of a call = input + cache_creation + cache_read. "Growth" = context of call n minus context of call n-1 (can be negative after a compaction); per transcript the median is taken, and the tables give the median of those. Duration = last minus first call timestamp. Cells are `median (Q1-Q3)`, linear interpolation. Time is UTC (the owner's clock is UTC+5). Project label: folder name contains harness-engineering = harness (this repository, its `library` and probe folders; first transcripts 2026-11-17), EMS-workshop1 = product, Clinic-Workshop = clinic, rest = other. Helper = a transcript under `<session>/subagents/` (including `subagents/workflows/`).

**Scope of the harness label.** Harness-folder transcripts start on 2026-11-17 (the repository was split from the product repository on 2026-11-16). Earlier harness research, and the coordinating Fable sessions of this research, were run from the product folders: the harness folder holds no Fable main session at all (models there: opus-5-5, sonnet-5-5, haiku-5-5). So the tables of section 1 describe the Opus/Sonnet/Haiku sessions of this folder, not the Fable coordinator.

## 1. Roles in the harness project

Harness transcripts: 153 (19 main, 134 helper).

**How roles were set.** Helpers: the word before the colon at the start of the meta.json `description` (read 13, analyse 19, test 3, refute 8, run 15, extract 26, collect 49, test (by words) 1); no helper carried locate, build, build-invariant or orchestrate. One had no prefix and is placed by a word in its description (marked "by words"). Main sessions: a main session is an **orchestrator** if it has three or more helper transcripts under it, or called `start_session` three or more times; otherwise a **single worker**. Helper counts and `start_session`/Agent call counts come from the transcripts themselves (columns `agent_calls`, `start_session_calls`); the first prompt of most mains begins "Background (from the session that started this one)" i.e. they are child sessions started by another session (column "child").

### 1a. Total tokens and each usage field (per transcript)

| role / model | n | total | input | cache creation | cache read | output |
|---|---|---|---|---|---|---|
| main: orchestrator / opus | 14 | 4.36M (3.75M-5.55M) | 93 (65.5-103.5) | 100.2k (76.3k-162.7k) | 4.27M (3.65M-5.38M) | 33.3k (19.1k-36.8k) |
| main: single worker / haiku | 2 | 623.4k (623.1k-623.7k) | 15 (14.5-15.5) | 37.3k (34.5k-40.0k) | 582.0k (579.4k-584.6k) | 4.2k (4.1k-4.3k) |
| main: single worker / opus | 2 | 15.79M (10.49M-21.10M) | 159 (109.5-208.5) | 512.4k (362.0k-662.8k) | 15.10M (10.00M-20.20M) | 182.0k (126.1k-238.0k) |
| main: single worker / sonnet | 1 | 1.90M (1.90M-1.90M) | 36 (36-36) | 95.5k (95.5k-95.5k) | 1.77M (1.77M-1.77M) | 36.3k (36.3k-36.3k) |
| analyse / opus | 19 | 8.05M (4.94M-10.39M) | 90 (54-107) | 253.9k (202.9k-287.7k) | 7.82M (4.61M-10.00M) | 99.7k (81.0k-130.5k) |
| collect / sonnet | 49 | 3.20M (1.90M-4.10M) | 62 (40-78) | 104.9k (88.4k-127.6k) | 3.07M (1.80M-3.96M) | 20.5k (15.6k-26.2k) |
| extract / haiku | 26 | 825.7k (566.0k-1.13M) | 17 (12.5-20) | 89.7k (74.0k-112.3k) | 725.7k (459.7k-979.0k) | 35.7k (26.1k-48.8k) |
| read / sonnet | 13 | 1.79M (1.07M-4.68M) | 34 (20-78) | 107.9k (86.7k-117.8k) | 1.66M (955.9k-4.54M) | 16.7k (12.2k-24.3k) |
| refute / opus | 8 | 8.69M (6.16M-14.44M) | 126 (88.5-174.5) | 222.3k (203.4k-247.7k) | 8.43M (5.92M-14.14M) | 79.1k (61.4k-93.4k) |
| run / sonnet | 15 | 1.41M (1.28M-1.82M) | 32 (28-38) | 100.0k (74.6k-107.0k) | 1.32M (1.16M-1.73M) | 13.3k (9.9k-20.3k) |
| test (by words) / haiku | 1 | 124.7k (124.7k-124.7k) | 4 (4-4) | 65.9k (65.9k-65.9k) | 58.4k (58.4k-58.4k) | 501 (501-501) |
| test / haiku | 2 | 127.4k (91.7k-163.0k) | 4 (3-5) | 22.7k (19.1k-26.2k) | 102.8k (71.1k-134.4k) | 1.9k (1.5k-2.4k) |
| test / sonnet | 1 | 752.2k (752.2k-752.2k) | 16 (16-16) | 114.2k (114.2k-114.2k) | 625.7k (625.7k-625.7k) | 12.2k (12.2k-12.2k) |

### 1b. Calls, duration, context

| role / model | n | calls | minutes | peak context | context at call 1 | median growth per call |
|---|---|---|---|---|---|---|
| main: orchestrator / opus | 14 | 34 (30-41) | 48.4 (28.1-69.5) | 154.6k (131.6k-174.1k) | 86.3k (85.9k-87.2k) | 1.3k (1.1k-1.5k) |
| main: single worker / haiku | 2 | 7 (7-7) | 0.3 (0.3-0.3) | 90.8k (90.7k-91.0k) | 85.6k (85.5k-85.7k) | 765.8 (747.9-783.6) |
| main: single worker / opus | 2 | 71.5 (50.3-92.8) | 148.3 (80.3-216.4) | 312.7k (286.3k-339.0k) | 87.0k (85.7k-88.3k) | 3.0k (2.8k-3.1k) |
| main: single worker / sonnet | 1 | 17 (17-17) | 4.2 (4.2-4.2) | 143.8k (143.8k-143.8k) | 85.7k (85.7k-85.7k) | 2.3k (2.3k-2.3k) |
| analyse / opus | 19 | 45 (27-53) | 17.2 (12.3-18.5) | 286.4k (242.0k-315.8k) | 58.7k (58.6k-59.0k) | 2.5k (1.8k-4.2k) |
| collect / sonnet | 49 | 31 (20-38) | 6.1 (3.9-9.9) | 141.6k (122.5k-161.1k) | 58.7k (58.6k-58.9k) | 2.0k (1.5k-2.6k) |
| extract / haiku | 26 | 8.5 (6.3-10) | 2.3 (1.8-3.2) | 123.1k (113.0k-140.8k) | 58.7k (58.6k-58.7k) | 7.5k (5.0k-9.4k) |
| read / sonnet | 13 | 17 (10-39) | 3.3 (1.7-3.6) | 147.1k (121.3k-151.2k) | 59.1k (59.0k-59.1k) | 3.9k (1.8k-4.9k) |
| refute / opus | 8 | 63 (44.3-87.3) | 13.9 (10.5-15.9) | 260.6k (214.6k-286.8k) | 58.5k (58.5k-58.6k) | 1.6k (1.6k-2.3k) |
| run / sonnet | 15 | 16 (14-19) | 1.8 (1.6-3.8) | 107.1k (101.2k-129.3k) | 59.0k (58.6k-59.1k) | 2.2k (2.0k-2.9k) |
| test (by words) / haiku | 1 | 2 (2-2) | 0.0 (0.0-0.0) | 65.9k (65.9k-65.9k) | 58.4k (58.4k-58.4k) | 7.5k (7.5k-7.5k) |
| test / haiku | 2 | 2 (1.5-2.5) | 0.1 (0.1-0.2) | 62.1k (58.6k-65.7k) | 57.2k (56.1k-58.3k) | 4.9k (4.9k-4.9k) |
| test / sonnet | 1 | 8 (8-8) | 1.7 (1.7-1.7) | 114.2k (114.2k-114.2k) | 59.2k (59.2k-59.2k) | 5.1k (5.1k-5.1k) |

Sums over the harness folder (all four fields, tokens): helper sonnet 222.44M; helper opus 245.89M; main opus 98.30M; helper haiku 25.44M; main sonnet 1.90M; main haiku 1.25M.

Main sessions one by one (id = first 8 characters; helpers = helper transcripts under it; child = started by another session):

| id | model | first (UTC) | minutes | calls | helpers | Agent calls | start_session calls | child | total | role |
|---|---|---|---|---|---|---|---|---|---|---|
| 0b62640d | haiku | 11-17T20:48 | 0 | 7 | 1 | 2 | 0 | yes | 624.1k | single worker |
| a29d8b54 | sonnet | 11-17T21:32 | 4 | 17 | 0 | 0 | 0 | yes | 1.90M | single worker |
| eaacbeb6 | haiku | 11-17T21:38 | 0 | 7 | 2 | 6 | 0 | yes | 622.8k | single worker |
| f57c0bf8 | opus | 11-17T21:45 | 31 | 43 | 7 | 7 | 0 | yes | 5.60M | orchestrator |
| 9baa3fc0 | opus | 11-17T21:46 | 25 | 30 | 5 | 5 | 0 | yes | 3.80M | orchestrator |
| db398cc3 | opus | 11-18T00:12 | 33 | 22 | 6 | 6 | 0 | yes | 2.90M | orchestrator |
| 23475471 | opus | 11-18T14:03 | 29 | 23 | 3 | 3 | 0 | yes | 2.55M | orchestrator |
| afb95132 | opus | 11-18T14:48 | 319 | 49 | 11 | 11 | 0 | yes | 7.43M | orchestrator |
| 40282554 | opus | 11-18T14:48 | 287 | 34 | 7 | 7 | 0 | yes | 4.94M | orchestrator |
| 88f1506e | opus | 11-18T14:48 | 296 | 41 | 10 | 10 | 0 | yes | 5.88M | orchestrator |
| b3a078ad | opus | 11-18T20:16 | 27 | 34 | 11 | 11 | 0 | yes | 3.73M | orchestrator |
| 3f32429e | opus | 11-18T20:16 | 65 | 41 | 15 | 15 | 0 | yes | 4.57M | orchestrator |
| 53e109f9 | opus | 11-18T20:16 | 64 | 38 | 12 | 12 | 0 | yes | 4.16M | orchestrator |
| da43d56f | opus | 11-18T20:19 | 70 | 58 | 22 | 22 | 0 | yes | 9.01M | orchestrator |
| 1fe0ac69 | opus | 11-19T01:13 | 28 | 34 | 9 | 9 | 0 | yes | 3.96M | orchestrator |
| 78d1c9ad | opus | 11-19T01:13 | 67 | 26 | 4 | 4 | 0 | yes | 2.79M | orchestrator |
| 34cb9690 | opus | 11-19T06:48 | 284 | 114 | 0 | 0 | 2 | no | 26.40M | single worker |
| 522ff0c0 | opus | 11-19T09:48 | 12 | 29 | 0 | 0 | 0 | yes | 5.19M | single worker |
| 37c5b165 | opus | 11-19T11:27 | 16 | 30 | 9 | 10 | 0 | yes | 5.39M | orchestrator |

Orchestrators: 14; single workers: 5. Helpers that themselves called Agent (spawned more): 0.

## 2. Fresh start

Main sessions of the harness folder with a first call in the last 7 days (from 2026-11-12; in effect all 19): context at call 1 = input + cache_creation + cache_read of the first call. This is what is loaded before the owner's or parent's first prompt is worked on: system prompt, tool list, CLAUDE.md, memory, the start hook, plus the first prompt itself (the prompt is not separated out; it can add a few thousand tokens).

| model | n | context at call 1: median (Q1-Q3) | min | max |
|---|---|---|---|---|
| opus | 16 | 86.3k (85.8k-87.3k) | 84.4k | 91.4k |
| sonnet | 1 | 85.7k (85.7k-85.7k) | 85.7k | 85.7k |
| haiku | 2 | 85.6k (85.5k-85.7k) | 85.4k | 85.8k |

Same measure by date (call 1 context, tokens): 0b62640d 11-17T20:48 haiku 85404; a29d8b54 11-17T21:32 sonnet 85653; eaacbeb6 11-17T21:38 haiku 85774; f57c0bf8 11-17T21:45 opus 86848; 9baa3fc0 11-17T21:46 opus 86943; db398cc3 11-18T00:12 opus 87289; 23475471 11-18T14:03 opus 86187; afb95132 11-18T14:48 opus 85788; 40282554 11-18T14:48 opus 85845; 88f1506e 11-18T14:48 opus 85751; b3a078ad 11-18T20:16 opus 85807; 3f32429e 11-18T20:16 opus 86081; 53e109f9 11-18T20:16 opus 86132; da43d56f 11-18T20:19 opus 86414; 1fe0ac69 11-19T01:13 opus 87427; 78d1c9ad 11-19T01:13 opus 87418; 34cb9690 11-19T06:48 opus 84430; 522ff0c0 11-19T09:48 opus 89591; 37c5b165 11-19T11:27 opus 91424.

Helpers for comparison, context at call 1: sonnet n=78 median 58.9k (58.6k-59.0k); opus n=27 median 58.7k (58.5k-59.0k); haiku n=29 median 58.7k (58.6k-58.7k).

**Orientation cost.** Main sessions whose first prompt (system reminders removed; the first 1,500 characters searched) contains hand over, handed over, continue, continuing, STATE, successor, resume, resumed, predecessor or carry on: 4 of 19. For each, calls and tokens from call 1 up to and including the first call that uses Write, Edit, NotebookEdit or Agent (the first call that changes a file or starts a helper). "Read-in" = context at the last orientation call minus context at call 1 (what the session pulled into its window while reading); "tokens" = sum over those calls of context + output (every call re-reads the whole window, so this is the total the meter sees); "new" = input + cache_creation + output over them.

| id | model | calls to first Write/Edit/Agent | tokens (all four) | read-in (context growth) | context at call 1 | minutes |
|---|---|---|---|---|---|---|
| 23475471 | opus | 6 of 23 | 587.1k | 19.3k | 86.2k | 0.3 |
| b3a078ad | opus | 4 of 34 | 357.1k | 5.2k | 85.8k | 0.2 |
| 3f32429e | opus | 4 of 41 | 361.1k | 6.4k | 86.1k | 0.3 |
| 53e109f9 | opus | 3 of 38 | 266.9k | 4.5k | 86.1k | 0.2 |

Median over these: 4 calls, 359.1k tokens (range 266.9k-587.1k); the orientation is a median 9 % of the session's total tokens.

All 19 main sessions, same measure (calls up to the first Write/Edit/Agent call; tokens = all four fields over those calls): median 7 calls (4-10), 751.4k tokens (359.1k-1.06M), median 15 % of the session total. A session that never calls Write, Edit or Agent is counted whole. Wall-clock minutes of a main session include waiting for helpers and for the owner, so they are far above the time spent computing.
## 3. Later demand (Q37)

Tokens per UTC day, last 21 days (2026-10-30 to 2026-11-19; 11-19 is partial, up to about 11:43 UTC). Source `tokens-days.csv`, all models added. Millions of tokens.

**all four fields added**

| day | harness main | harness helpers | product | clinic | other | all |
|---|---|---|---|---|---|---|
| 2026-10-30 | 0.0 | 0.0 | 0.0 | 0.0 | 2.6 | 2.6 |
| 2026-10-31 | 0.0 | 0.0 | 228.5 | 0.0 | 71.4 | 300.0 |
| 2026-11-01 | 0.0 | 0.0 | 276.9 | 98.9 | 2.9 | 378.7 |
| 2026-11-02 | 0.0 | 0.0 | 273.0 | 30.1 | 41.4 | 344.5 |
| 2026-11-03 | 0.0 | 0.0 | 197.2 | 705.6 | 238.3 | 1141.2 |
| 2026-11-04 | 0.0 | 0.0 | 580.2 | 1426.1 | 260.7 | 2267.0 |
| 2026-11-05 | 0.0 | 0.0 | 0.0 | 854.5 | 0.0 | 854.5 |
| 2026-11-06 | 0.0 | 0.0 | 0.0 | 879.2 | 0.0 | 879.2 |
| 2026-11-07 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2026-11-08 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2026-11-09 | 0.0 | 0.0 | 90.6 | 216.5 | 175.8 | 482.9 |
| 2026-11-10 | 0.0 | 0.0 | 0.0 | 119.7 | 197.3 | 317.0 |
| 2026-11-11 | 0.0 | 0.0 | 311.5 | 20.5 | 102.2 | 434.2 |
| 2026-11-12 | 0.0 | 0.0 | 1416.2 | 0.0 | 450.3 | 1866.4 |
| 2026-11-13 | 0.0 | 0.0 | 3780.4 | 3.3 | 313.3 | 4097.0 |
| 2026-11-14 | 0.0 | 0.0 | 3255.4 | 0.0 | 1.9 | 3257.3 |
| 2026-11-15 | 0.0 | 0.0 | 1388.3 | 0.0 | 0.0 | 1388.3 |
| 2026-11-16 | 0.0 | 0.0 | 812.8 | 0.0 | 0.0 | 812.8 |
| 2026-11-17 | 12.5 | 48.9 | 1063.5 | 0.0 | 59.9 | 1184.9 |
| 2026-11-18 | 45.2 | 365.9 | 29.2 | 0.0 | 0.0 | 440.3 |
| 2026-11-19 | 43.7 | 79.0 | 10.5 | 0.0 | 0.0 | 133.3 |
| **sum** | **101** | **494** | **13714** | **4354** | **1918** | **20582** |

**without cache reads (input + cache creation + output)**

| day | harness main | harness helpers | product | clinic | other | all |
|---|---|---|---|---|---|---|
| 2026-10-30 | 0.0 | 0.0 | 0.0 | 0.0 | 0.3 | 0.3 |
| 2026-10-31 | 0.0 | 0.0 | 13.2 | 0.0 | 6.6 | 19.8 |
| 2026-11-01 | 0.0 | 0.0 | 19.2 | 6.6 | 0.3 | 26.0 |
| 2026-11-02 | 0.0 | 0.0 | 19.4 | 1.5 | 1.6 | 22.5 |
| 2026-11-03 | 0.0 | 0.0 | 11.0 | 15.1 | 20.1 | 46.2 |
| 2026-11-04 | 0.0 | 0.0 | 34.3 | 30.6 | 10.9 | 75.8 |
| 2026-11-05 | 0.0 | 0.0 | 0.0 | 14.3 | 0.0 | 14.3 |
| 2026-11-06 | 0.0 | 0.0 | 0.0 | 18.7 | 0.0 | 18.7 |
| 2026-11-07 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2026-11-08 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2026-11-09 | 0.0 | 0.0 | 6.3 | 7.5 | 8.6 | 22.4 |
| 2026-11-10 | 0.0 | 0.0 | 0.0 | 2.9 | 15.8 | 18.7 |
| 2026-11-11 | 0.0 | 0.0 | 13.3 | 1.0 | 5.5 | 19.8 |
| 2026-11-12 | 0.0 | 0.0 | 61.2 | 0.0 | 20.5 | 81.7 |
| 2026-11-13 | 0.0 | 0.0 | 110.1 | 0.2 | 15.7 | 125.9 |
| 2026-11-14 | 0.0 | 0.0 | 82.3 | 0.0 | 1.8 | 84.1 |
| 2026-11-15 | 0.0 | 0.0 | 35.0 | 0.0 | 0.0 | 35.0 |
| 2026-11-16 | 0.0 | 0.0 | 39.9 | 0.0 | 0.0 | 39.9 |
| 2026-11-17 | 0.5 | 2.2 | 42.7 | 0.0 | 2.5 | 47.9 |
| 2026-11-18 | 1.3 | 15.7 | 1.1 | 0.0 | 0.0 | 18.1 |
| 2026-11-19 | 1.8 | 4.5 | 0.6 | 0.0 | 0.0 | 6.9 |
| **sum** | **4** | **22** | **490** | **98** | **110** | **724** |

**By model over the 21 days (millions of tokens: all four fields / without cache reads / output)**

| project / kind | model | calls | all four | no cache read | output |
|---|---|---|---|---|---|
| clinic helper | opus | 4082 | 586.3 | 26.5 | 4.89 |
| clinic helper | opus-4-8 | 1 | 0.2 | 0.0 | 0.01 |
| clinic helper | sonnet | 1180 | 227.8 | 9.9 | 2.52 |
| clinic main | fable 5.1 | 1217 | 630.2 | 17.6 | 2.23 |
| clinic main | fable 5.2 | 113 | 72.1 | 2.1 | 0.15 |
| clinic main | haiku | 2 | 0.2 | 0.1 | 0.01 |
| clinic main | opus | 6050 | 1367.5 | 24.4 | 6.22 |
| clinic main | sonnet | 3297 | 1470.1 | 17.6 | 3.68 |
| harness helper | haiku | 239 | 25.4 | 3.5 | 0.98 |
| harness helper | opus | 1358 | 245.9 | 9.2 | 2.49 |
| harness helper | sonnet | 2049 | 222.4 | 9.7 | 1.47 |
| harness main | haiku | 14 | 1.2 | 0.1 | 0.01 |
| harness main | opus | 646 | 98.3 | 3.4 | 0.81 |
| harness main | sonnet | 17 | 1.9 | 0.1 | 0.04 |
| other helper | fable 5.1 | 1116 | 123.6 | 12.8 | 3.74 |
| other helper | fable 5.2 | 1987 | 353.8 | 25.1 | 6.01 |
| other helper | haiku | 2 | 0.0 | 0.0 | 0.00 |
| other helper | opus | 4793 | 511.8 | 36.5 | 8.00 |
| other helper | sonnet | 1493 | 161.4 | 12.5 | 3.04 |
| other main | fable 5.1 | 644 | 238.6 | 7.3 | 1.80 |
| other main | fable 5.2 | 1008 | 492.3 | 13.8 | 2.62 |
| other main | opus | 175 | 32.4 | 2.0 | 0.54 |
| other main | sonnet | 38 | 4.1 | 0.1 | 0.03 |
| product helper | haiku | 168 | 19.6 | 5.9 | 1.64 |
| product helper | opus | 36769 | 6503.8 | 288.0 | 48.07 |
| product helper | sonnet | 8125 | 1088.4 | 76.4 | 14.61 |
| product main | fable 5.1 | 1012 | 416.0 | 21.5 | 3.48 |
| product main | fable 5.2 | 6321 | 3165.4 | 60.2 | 14.94 |
| product main | opus | 10527 | 2521.1 | 37.6 | 9.18 |

**Owner's own use outside the harness project (product + clinic + other folders), rate per day.** Main sessions = what the owner opens himself or through the app; helpers = what those sessions start. Millions of tokens per day (all four / without cache reads / output):

| window | who | days | per day: all four | no cache read | output |
|---|---|---|---|---|---|
| 21 days | main only | 21 | 495.7M | 9.74M | 2.138M |
| 21 days | main + helpers | 21 | 951.7M | 33.25M | 6.544M |
| last 7 days | main only | 7 | 801.6M | 13.74M | 3.263M |
| last 7 days | main + helpers | 7 | 1531.2M | 47.40M | 9.073M |
| days with any outside use | main only | 19 | 547.9M | 10.77M | 2.363M |
| days with any outside use | main + helpers | 19 | 1051.9M | 36.75M | 7.233M |

Last days outside the harness project, per day (main+helpers, all four, M): 10-30:3 10-31:300 11-01:379 11-02:344 11-03:1141 11-04:2267 11-05:854 11-06:879 11-07:0 11-08:0 11-09:483 11-10:317 11-11:434 11-12:1866 11-13:4097 11-14:3257 11-15:1388 11-16:813 11-17:1123 11-18:29 11-19:11.
## 4. Weekly-meter calibration

**Readings used and their times (UTC).** Reset 2026-11-16 12:00 = 0 %. The R57 round: the library record r57-0114 gives no time; the round's own notes (`research-tree/notes/section17-draft-2026-11-17.md`, line 912) say "26 % at 15:20 to 39 % at 22:10", owner clock = UTC+5, i.e. 10:20 and 17:10 UTC on 2026-11-17 (the notes show local times that match the file times of the round: 18:48:51 local = 13:48:51 UTC). The 43 % reading (r57-0117, "2026-11-18", no time): its first appearance in any transcript is 2026-11-17 21:31:13 UTC (product folder session, then the harness sessions from 21:45); the owner's date is local (UTC+5), so the reading was taken before 21:31 UTC; **21:30 UTC is used as its time (assumption)**. Fable meter: 35 % at that same reading, 49 % at 09:51 UTC on 2026-11-19. 61 % at 09:51 and 61 % at 11:31 UTC (2026-11-19). Boundaries are cut at 10-minute buckets (09:51 as 09:50, 11:31 as 11:30; 21:31 as 21:30); a call counts in the bucket of the start of its response. Tokens are all transcripts of all projects (main + helpers). The meter's own rounding is +-0.5 point, so an interval of 4 points is known to +-12 %, of 13 points to +-4 %, of 18 points to +-3 %.

Not in the transcripts and so not counted: use of the same account in the claude.ai web chat, other devices, other tools, and anything the app did not write to `~/.claude/projects` (for example sessions whose files were deleted).

### 4a. All-models meter: tokens per interval and points per million tokens

| interval | points | span (h) | all four fields (M tokens) | without cache reads (M tokens) | output only (M tokens) | weighted 1 / 1.25 / 0.1 / 5 (M tokens) |
|---|---|---|---|---|---|---|
| I1 reset to R57 start (11-16T12:00 to 11-17T10:20) | 26 | 22.3 | 1032.5 | 47.0 | 9.3 | 192.3 |
| I2 R57 round (11-17T10:20 to 11-17T17:10) | 13 | 6.8 | 511.4 | 20.4 | 3.6 | 88.2 |
| I3 round end to the 43 % reading (11-17T17:10 to 11-17T21:30) | 4 | 4.3 | 299.4 | 10.8 | 2.5 | 51.8 |
| I4 43 % reading to 2026-11-19 09:51 (11-17T21:30 to 11-19T09:50) | 18 | 36.3 | 698.1 | 33.0 | 7.6 | 136.1 |
| I5 09:51 to 11:31 on 2026-11-19 (11-19T09:50 to 11-19T11:30) | 0 | 1.7 | 15.4 | 0.6 | 0.2 | 3.1 |

**Points per million tokens (all four I1-I4 cumulative = 61 points)**

| form | I1 | I2 | I3 | I4 | I1-I4 together | mean of I1-I4 | spread (max/min) | CV (sd/mean) |
|---|---|---|---|---|---|---|---|---|
| all four fields | 0.03 | 0.03 | 0.01 | 0.03 | 0.024 | 0.022 | 1.93 | 27 % |
| without cache reads | 0.55 | 0.64 | 0.37 | 0.55 | 0.549 | 0.527 | 1.72 | 21 % |
| output only | 2.78 | 3.58 | 1.59 | 2.38 | 2.645 | 2.582 | 2.26 | 32 % |
| weighted 1 / 1.25 / 0.1 / 5 | 0.14 | 0.15 | 0.08 | 0.13 | 0.130 | 0.123 | 1.91 | 25 % |

I5 (09:51-11:31, 0 points shown): tokens in it by form (M): all four fields 15.4; without cache reads 0.6; output only 0.2; weighted 1 / 1.25 / 0.1 / 5 3.1; at the pooled ratios that would be all four fields 0.4; without cache reads 0.3; output only 0.6; weighted 1 / 1.25 / 0.1 / 5 0.4 points - a reading of 61 at both times means the meter moved by less than about 1 point.

### 4b. By model: tokens per interval (M, without cache reads / output only) and points per million

| interval | all-models points | fable no-cache-read | fable output | opus no-cache-read | opus output | sonnet no-cache-read | sonnet output | haiku no-cache-read | haiku output |
|---|---|---|---|---|---|---|---|---|---|
| I1 reset to R57 start | 26 | 4.46 | 0.89 | 31.66 | 5.59 | 10.65 | 2.84 | 0.26 | 0.02 |
| I2 R57 round | 13 | 3.70 | 0.79 | 14.54 | 2.38 | 2.14 | 0.46 | 0.00 | 0.00 |
| I3 round end to the 43 % reading | 4 | 4.01 | 1.48 | 0.96 | 0.10 | 5.44 | 0.91 | 0.40 | 0.04 |
| I4 43 % reading to 2026-11-19 09:51 | 18 | 2.33 | 0.44 | 12.26 | 3.05 | 10.50 | 1.60 | 7.90 | 2.47 |
| I5 09:51 to 11:31 on 2026-11-19 | 0 | 0.00 | 0.00 | 0.61 | 0.23 | 0.00 | 0.00 | 0.00 | 0.00 |

Points per million tokens if one model alone explained the meter (I1-I4 pooled, 61 points): fable: no-cache-read 4.21, output 17.0, all four 0.105; opus: no-cache-read 1.03, output 5.5, all four 0.047; sonnet: no-cache-read 2.12, output 10.5, all four 0.098; haiku: no-cache-read 7.13, output 24.1, all four 1.417 (an upper bound for each model: the others also moved the meter).

### 4c. Two-weight fit (all-models points = w_fable x Fable tokens + w_rest x other tokens, least squares over I1-I4, four data points, two unknowns)

| form | w_fable (points/M) | w_rest (points/M) | residuals I1..I4 (points) | note |
|---|---|---|---|---|
| all four fields | 0.009 | 0.028 | -0.3, 1.6, -1.1, -0.3 | ok |
| without cache reads | 0.357 | 0.578 | -0.2, 2.0, -1.4, -0.5 | ok |
| output only | 2.008 | 2.742 | 1.0, 3.6, -1.8, -2.4 | ok |
| weighted 1 / 1.25 / 0.1 / 5 | 0.067 | 0.145 | -0.0, 2.0, -1.3, -0.8 | ok |

### 4d. Fable meter (35 % at the 43 % reading, 49 % at 09:51 on 11-19): Fable tokens only

| interval | Fable points | all four fields (M) | without cache reads (M) | output only (M) | weighted 1 / 1.25 / 0.1 / 5 (M) | points/M: all four fields / without cache reads / output only / weighted 1 / 1.25 / 0.1 / 5 |
|---|---|---|---|---|---|---|
| reset to 21:30 on 11-17 | 35 | 500.5 | 12.2 | 3.2 | 75.9 | 0.070 / 2.879 / 11.097 / 0.461 |
| 21:30 on 11-17 to 09:50 on 11-19 | 14 | 79.3 | 2.3 | 0.4 | 12.3 | 0.177 / 6.012 / 31.492 / 1.141 |

(Fable meter time of the first reading is the same 21:30 assumption. Fable tokens: models claude-fable-5-1 and 5-2.)

Ratio of the two Fable intervals (larger/smaller points per M): all four fields: 2.52x; without cache reads: 2.09x; output only: 2.84x; weighted 1 / 1.25 / 0.1 / 5: 2.47x.

### 4e. Which form is most stable

Measured on I1-I4 (points per million tokens, `tokens-10min.csv`; five-form table in 4a):

| form | I1 / I2 / I3 / I4 | spread max/min | CV | I1, I2, I4 only (without the 4-point I3) |
|---|---|---|---|---|
| all four fields | 0.025 / 0.025 / 0.013 / 0.026 | 1.93x | 27 % | 0.025 / 0.025 / 0.026: spread 1.02x |
| without cache reads | 0.55 / 0.64 / 0.37 / 0.55 | 1.72x | 21 % | 0.553 / 0.638 / 0.546: spread 1.17x |
| output only | 2.78 / 3.58 / 1.59 / 2.38 | 2.26x | 32 % | 2.78 / 3.58 / 2.38: spread 1.50x |
| weighted 1 / 1.25 / 0.1 / 5 | 0.135 / 0.147 / 0.077 / 0.132 | 1.91x | 25 % | spread 1.11x |

**Sensitivity to the one assumed time (the 43 % reading).** Its true time is not recorded. The owner's date "2026-11-18" is local (UTC+5), so it lies between 19:00 UTC on 11-17 and its first appearance in a transcript at 21:31 UTC. Moving the assumed time through that range (I3 = 39 to 43 %, I4 = 43 to 61 %; sweep in the scratch run, not saved) gives for "all four fields": 21:30 -> 0.013 / 0.026; 21:00 -> 0.016 / 0.024; 20:30 -> 0.018 / 0.023; 20:10 -> 0.023 / 0.022; 20:00 -> 0.033 / 0.021 (I3 / I4, points per M); the four-interval CV for all four fields is 8 % at 20:10 and 19-27 % at 20:00-21:30, for "without cache reads" 11 % at 20:10-20:40 and 16-21 % at 21:00-21:30, for output only 22-32 %. So I3 is the interval whose result moves with the assumption (it is 4 points, 300M tokens, rounding +-12 %); I1, I2 and I4 do not depend on it much.

**Result, as measured.** With the cache reads counted, the four-field total gives the most stable ratio: about **0.025 points per million tokens (1 point = about 40M tokens)** in I1 (26 points) and I2 (13 points), 0.022-0.026 in I4 (18 points, depending on the assumed time), a spread of 1.02x for the three intervals that do not depend on the assumption and 1.1x to 1.4x if I3 is included at a time between 20:10 and 20:30. "Without cache reads" is next (0.55 points per M, 1 point = 1.8M tokens, spread 1.17x for the same three; 1.7x with I3 at 21:30). Output only is the least stable (spread 1.5x to 2.3x; I2 had 3.6 points/M against 2.4 in I4). Cache reads are 95 % of the all-four total, so that form is mostly a count of how many times context is re-read; its stability here means the mix of sessions (long contexts over many calls) was similar in the intervals, not that the meter was shown to count cache reads. Limits: five intervals, one week, one plan, three of them only 4-18 points; the per-model split (4b, 4c) cannot be fitted from four points (all four forms give a positive w_rest above w_fable, w_fable 0.009 vs w_rest 0.028 points/M for all four fields, residuals up to 2 points on I2, which is not better than the one-weight fit and is not a result). Meter points per the Fable meter (4d) do not agree across its two intervals (0.070 vs 0.177 points per M all four; 2.5x), unlike the all-models meter: either Fable tokens used on 11-18/19 are missing from the files read (for example sessions kept outside `~/.claude/projects`) or the Fable meter does not count them the way the all-models meter does; not decided here. I5 (61 % at both times) does not test anything: at 0.025 points per M the 15M tokens in it are 0.4 point.

## 5. Not tested / limits

- The harness folder holds only 2026-11-17 onward and no Fable main session; the cost of the Fable coordinator is in the product-folder transcripts (not split out here: the `product` rows of section 3 include the coordinating sessions of the harness research from 11-17 to 11-19 mixed with product work).
- Roles of main sessions are from helper counts and `start_session` counts, not from reading each prompt (only the first 80 characters were kept).
- A duplicated message id across transcripts (a resumed session that replays earlier lines) would be counted in both transcripts; not checked.
- The 61 %, 26 %, 39 %, 43 % readings are the owner's or the app's, as recorded in the notes and library; the 43 % time is assumed (see 4e).
- Other readings exist in the transcripts without a stated time (for example "53 % all models / 43 % Fable" after step 1 on 11-18 evening, "48 % to 49 %" in another round, "52 %" on 11-19 after a step); not used because the times are not in the records.
- Per-model points per token cannot be determined from these intervals (section 4c).
