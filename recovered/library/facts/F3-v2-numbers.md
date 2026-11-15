# F3: Harness v2 library and where tokens go (fact sheet)

Tags: [M] measured, [E] estimate, [T] target, [S] setting, [I] illustrative or guess, [D] derived by me from source numbers (arithmetic only). Paths are under `docs/program/`. Abbreviations: V2 = HARNESS-V2-DESIGN-2026-11.md; TB = TOKEN-BOTTLENECK-2026-11.md; HB = HARNESS-BOTTLENECKS-2026-11.md; TS = evidence/token-spend; ARCH = harness-v2/architecture.json.

Scope of the data: two repos on one PC, one user, Oct-Nov 2026. FixFlow (14 sessions, 1,153 agent transcripts, 14,647 calls) and the Clinic testbed (41 sessions, 506 agent transcripts, 21,187 calls). Nothing is built yet. The library has never been run.

## 1. Where tokens go

**Totals** (TB:9-14; TS/combined.txt scalars). Context tokens processed: FixFlow 2.13 B, Clinic 5.23 B, both 7.35 B [M]. Output 55.4 M total (24.6 M + 30.8 M) [M]. Cache reads are 96.8 % of context tokens, cache writes 3.2 %, uncached input about 0 [M]. Output is 0.75 % of tokens processed [M]. Of output, 45.3 % is thinking (FixFlow 44.0 %, Clinic 46.6 %) [M] (combined.txt "Output composition"). Thinking stays in context at full size (fill/verify/remeasure/report.md).

**What the windows hold, share of all context tokens** (TB:33-39; TS/bottleneck.json pooledBuckets; method is an estimate from context growth between calls, [E]):

| Content | Both | FixFlow | Clinic |
| --- | --- | --- | --- |
| Fixed prefix (first window) | 26.8 % | 46.5 % (bottleneck.json 989.5M of 2,125.7M) | 18.7 % |
| Compaction summaries re-read | 8.4 % | 2 % | 11 % |
| Model's own earlier output carried | 26.4 % | 15 % | 31 % |
| Fetched by reads and searches | 25.6 % | 23 % | 27 % |
| Unclassified shell, messages, rest | 12.8 % | 13 % | 12 % |

TB rounds prefix to 27 %, own 26 %, fetched 26 %, summaries 8 %, other 13 %. Own output split, both repos pooled [D]: thinking 10.5 % of all context, commands 7.4 %, code written 6.8 %, briefs 1.4 %, text 0.4 %.

**Second measurement, November Clinic only** (HB:227; fill/window-fill-output.txt): of 4,331 M context tokens: fetched 26.9 %, own output 32.5 %, window start 28.6 %, unclassified 4.3 %, messages 3.1 %, rest 4.6 % [E]. By group: slice sessions fetched 26.0 %, root 14.8 %, subagents 40.1 %. An independent re-measurement (fill/verify/remeasure/report.md) gave fetched 22.3 % (range 20.6 to 32.2), own 22.8 %, start/carried 47.8 %, other 7.2 %. If only the dedicated Read, Grep, Glob tools count, fetched is 5.4 %. V2 uses 27 to 28.5 % (V2:97).

**Carrying cost** (HB:228; remeasure report): fetched content entered windows once as about 19 M tokens and was processed about 950 M times, about 50 passes each [E]. Reading a file costs by staying, not by repeating.

**Window size per call** (TB:20-30; combined.txt): main session mean 396k (FixFlow) and 333k (Clinic) [M]. Agents 113 to 156k. Share of cache-read tokens in calls whose context passed 200k: 39 % and 74 %. Past 400k: 15 % and 37 %. November: slice sessions about 306k per call over 9,342 calls, root about 499k over 1,335 calls, subagents about 153k (HB:87; V2 table 106). 8,635 of 15,921 November calls ran above 200k (remeasure report). Pooled call share by context bucket [D from combined.txt]: under 100k 26.5 %, 100-199k 38.3 %, 200-299k 16.9 %, 300-399k 7.9 %, 400k+ 10.4 %.

**By session type** (combined.txt, pooled): main sessions 54 % of context tokens (22 % FixFlow, 74 % Clinic), workflow agents 36 %, Agent-tool agents 10 %. Calls: main 37 %, workflow agents 47 %, Agent-tool 16 %. FixFlow is many small windows: 1,118 agent windows, about 12 calls each, 56 % of every agent's tokens is its fixed prefix of about 60k, about 50k of it tool and connector schemas (TB:44). Clinic is one big window. Cost concentration: top session 32 % of cost on average, top 3 58 %, top 10 83 % (cost-weighted, combined.txt).

**Call counts** (TB:12): 14,647 + 21,187 = 35,834. Calls per human prompt: 74 (FixFlow), 30 (Clinic) in fixflow/clinic.summary.txt. TB:60 says 80 and 151 real prompts at about 162 calls each. The two sources disagree on the prompt definition. Compactions in main sessions: 9 (FixFlow), 48 (Clinic) (TB:29).

**October** (HB:84): about 778 M tokens, 94 % cache reads, 14 usage-limit episodes. Subagents made 82.4 % of 4,155 calls and 91 of 104 limit errors. November: 4.25 B cache-read tokens in 184 transcripts (HB:87).

## 2. Breakdown by kind of work

There is no breakdown of tokens by kind of work. The only one is cost-weighted: `TS/cost-by-worktype.json` (key `byWT`), shares of list-price cost, not tokens. Each whole main session got one label from an agent reading its title, first prompt and notes (`inventory.*.sessions[].workType, phase, evidence`). Mixed sessions get one label. Some sessions have zero or missing cost, so the totals are a lower bound (inventory notes).

Pooled shares of cost [D]: harness-meta 24.8 %, Clinic testbed work 14.7 %, design 14.7 %, implementation 12.8 %, research 10.0 %, mixed 9.7 %, FixFlow product 8.1 %, unrelated 2.3 %, ops-deploy 1.9 %, review-verify 0.6 %, unclear 0.2 %. FixFlow alone: harness-meta 27.1 %, research 21.7 %, FixFlow product 21.2 %, mixed 17.9 %, implementation 8.0 %. Clinic alone: clinic-testbed 23.8 %, harness-meta 23.4 %, design 22.4 %, implementation 15.8 %.

The source has no separate classes for "fixing or debugging" or "orchestration". A large share of the spend was research and design of the harness itself, not building product code. The label "building new code" maps at best to implementation plus clinic-testbed. Nothing measures how much work was repeated.

## 3. Model tiers

Share of calls / context tokens / output tokens, pooled (combined.txt): Opus 65.1 / 51.5 / 61.1 %, Sonnet 28.3 / 32.2 / 28.7 %, Fable 6.5 / 16.3 / 10.1 %, Haiku about 0.1 % (TB:57 gives Opus 65 % of calls, 52 % of tokens; Fable 6.5 %, 16 %; Sonnet 28 %, 32 %).

Mean context per call by model, from summaries [M]: FixFlow Opus 125k, Sonnet 121k, Fable 425-439k. Clinic Opus 187k, Sonnet 353k, Fable 516-746k. Output per call [D from shares]: about 1,420 to 1,450 (Opus), 1,470 to 1,710 (Sonnet). The model is confounded with role and task: Fable and Sonnet mostly ran long main or slice sessions, Opus ran many small agents.

November slice calls (HARNESS-V2 phase1/compaction-by-model-2026-11.txt; V2:103-104): Opus 5,879 calls, 1,306 M cache-read, largest context 367k. Sonnet 3,297 calls, 1,452 M, largest 963k. Fable 151 calls. Root: Fable 1,158 calls, Opus 171. Compactions: 48. 38 near 367k, all on Opus (Opus's own window). 6 between (5 Sonnet at about 747-758k, 1 Fable). 4 near 970k (3 Fable, 1 Sonnet). V2 and FINDINGS.md call the Opus versus Sonnet difference "a comparison across models doing different work, not a trial" (harness-v2/phase1/FINDINGS.md:21).

**Result quality by tier: nothing was measured in these sources.** No success rate, defect rate, pass rate or rework rate is split by model. Rounds per slice (2.8 [M], V2:36) are not split by model. The one orchestration rule on tier is that the top model alone works the risky areas (V2:114, quoting the orchestration document). Outside literature cited in graph2/research/result.json: CodexGraph on Qwen2-72B scored 1.95 % against 9.34 % for a no-graph baseline; graph tools help most "at hop 0-1 and with small models" (author-run studies, not tested here).

## 4. Lookups and searches

**Share of calls and tokens** (definitions differ, all [E] from transcripts):
- "Only read or search" calls, November Clinic: 8,701 of 15,921 calls = 54.7 % [M count], re-reading 43.6 % of context tokens (slice main 42.4 %, subagents 70.9 %) (HB:229).
- Reported base, both repos: 46.5 % of calls, 36.9 % of tokens (46.4/38.0 FixFlow; 46.6/35.9 Clinic) (combined.txt).
- Full-command classification (refute/check7.json): mean 57.9 % calls / 47.7 % tokens; with web 64.5 % / 52.5 %. TB:28 headlines 64 % of calls, 55 % of tokens (FixFlow) and 52 %, 41 % (Clinic). TB lever 3 says 58 %.
- Calls that only searched or listed: 5 % of tokens (strict) to 15 % (loose) (HB:229).

**What they ask for** (tool result characters, pooled, combined.txt): file-read 38.7 %, shell-read 19.6 %, shell-other 16.0 %, shell-search 8.9 %, web 5.1 %, search 4.0 %, git-read 3.7 %. 86.9 % of shell-other result chars are lookups (check4.json). Tool errors 2.2 % of calls.

**Connection questions** (graph/verify/check.txt, "CLASSIFIERS"; two independent readers; sample of 200 of 8,303 Clinic search-bearing calls in November): content 88-90, not a search 50-60, definition 28-29, connection 13-14 (6.5-7 %), listing 11-16. Reader agreement: same class 166/200. The index fully answers 1 of 200. Step saved judged likely: 0 of 200 (198 and 197 "unlikely", 2-3 "cannot tell"). Limits: first 420 characters judged, Django codebase, 1,958 of 7,033 greps were output filters; 7 % from 200 has range about 4 to 11 %.

**Batching:** 151 of 200 sampled commands already chain two or more lookups (check.txt). TB:53 says batching two lookups would remove about a third of all calls [E, claimed]. These two statements are not reconciled in the sources.

**Re-reads inside a window:** content genuinely seen earlier in the same window 0.5 to 1.5 % [E] (HB:230). Reopening a file: 7.0 points first run, mostly another part of the same file; independent method 2.2 % (exact duplicate 0.1 %). Identical repeat commands: zero. A session-local cache saves almost nothing (TB:58).

**Across windows:** 72 paths (3.3 %) hold half the fetched tokens; 294 paths read in 5+ windows hold 73 %; top 30 paths 7.7 % of all tokens (independent: 5.0 %); largest file 0.57 % (HB:231; fill output; TB:59 says any one file at most 1.5 %). 2,179 distinct paths over 233 windows (independent: 1,450 paths, 305 windows). **Files read but not edited:** 74 % of fetched tokens (HB:232). The sources say this is not proof of waste.

**Reading style** (HB:233): slice sessions: range reads 8.8 + search hits 4.9 outweigh whole-file reads 7.4 (points of all tokens); subagents: whole files 16.8 vs 14.5. Shell reads (sed, cat, grep) dominate: sed -n 6.2, Read 5.2, cat 4.0, grep 3.8 points (remeasure).

## 5. Indexes, graphs and context mechanisms actually tested

1. **Codex compaction adapter** (HB:97): recall 15/15 and task success the same in all arms; +6.1 % tokens over a notes file and +17.0 % over native compaction; "context gain proven: false". Different project, no index or graph.
2. **Compact context packet, with-and-without** (A7-06, HB:98): identical acceptance, near-identical time. **Synthetic pilot** (A7-03): 20.6 % fewer bytes delivered, no outcome measured.
3. **Corpus map** (A6, HB:100): 3,361 records for a 167 KB corpus, extraction recall 0.52, validation contract frozen and never run.
4. **Context system** (A5): 85 tests, never installed or run live. About 20 outside tools surveyed, none adopted. A disciplined short notes file matched the heavier machinery (HB:104).
5. **File-level import graph of FixFlow** (HB:240-247; graph/): 618 files, 1,119 distinct file links, 0.2 s build, 197 KB (32 KB gzipped); import links matched an independent method 441/441 Python, 678/678 JS/TS. One file's graph answer is about 560 tokens against about 200 for one `grep -l` (the 70,000-token comparison was ruled a straw man). Reach: median 2, p90 30, max 112; 42 % of code-file changes and 73 % of code commits touch a file with reach over 15. Reaching all dependants by search: median 3 rounds, p90 15. **The verdict "no graph, few tokens saved" was withdrawn on 2026-11-12** (HB:251; owner objections: no real engine, naive graph, one query, search sample from another project).
6. **Replacement test** (graph2/protocol.md, frozen, not run): 140 FixFlow commits (65 tune, 75 held out), 50 questions, hops 1-6, SQLite arm, graph engine only if the owner installs one. Smallest detectable recall difference with 75 commits about 0.09; "inconclusive" is expected as likely. Research found (HB:253-257, measured on this repo): import neighbours reach recall 0.38 (1 hop, 9 files), 0.72 (2 hops, 45), 0.87 (3 hops, 90) with precision 0.32, 0.11, 0.06; "depends on" alone caps at 0.25. Precision at 10: traversal order 0.19, PageRank 0.24, co-change 0.26, combined 0.28, same directory 0.22 (45 test commits, intervals overlap). Engine does not change the answer for identical facts and algorithm.
7. **Outside studies** (graph2/research/result.json, author-run, not tested here): RepoGraph +2 to +6.7 points with more tokens in every case; 2-hop flattened was below no-graph at 4x tokens; one Claude Code study cut tokens 17-39 % with success unchanged on two benchmarks and raised tokens on a third; Codebase-Memory about 10x fewer tokens at 0.83 vs 0.92 answer quality; repos under 10,000 commits lost 13 points from history features (the testbed has 432).
8. **Library itself:** never tested. "No index or graph was ever tried in the testbed" (V2:42, 85). V2:88 plans a zero-token replay of the recorded windows first.

## 6. Harness v2 library model (ARCH model.params, equations at architecture.json:780-781)

Equations: `library factor = 1 - lookup-step share x hit rate + cost of looking up`; `hit rate = top hit rate x entries / (entries + half point)`; `burn = (...) x context factor x library factor`; entries: plus per merged slice, minus a share of them per merge.

| Parameter | Value | Tag | Note |
| --- | --- | --- | --- |
| Lookup-step share (`explore`) | 0.436 | [E] | 43.6 % token share of lookup-only calls; "exposure, not a saving" |
| Top hit rate (`hitMax`) | 0.25 | [I] | "a guess; nobody has measured it" |
| Half point (`khalf`) | 20 entries | [I] | guess |
| Entries per merged slice | 4 | [I] | guess |
| Stale share per merge | 0.03 | [I] | guess; by merge, not by age |
| Lookup cost (`lookupCost`) | 0.02 of burn | [I] | guess |
| Answer size | 860 tokens | [S] | KS cap 2,000 characters |
| Calls per slice session | 519 | [M] | 9,342 calls over 18 slice sessions |
| Context factor under ceiling | 0.72 | [E] | 220k vs 306k, cross-model comparison |
| Slices in default run | 11 | [M] | |

Derived [D]: maximum saving at infinite entries = 0.436 x 0.25 = 10.9 % of burn, 8.9 % after the 2 % cost. Break-even at about 4.5 entries. At the steady state of 4 per merge against 3 % loss (about 133 entries) the net is about 7.5 % [D, using guessed inputs]. The library switch is off by default in the model; V2:64 says with few entries it costs more than it saves.

**What the refuter found** (evidence/harness-v2-design/refute-architecture.md items 3, 12, 13; rulings in refute-adjudication.md architecture rows 3, 12, 13):
- Item 3: the saving was counted twice (it shortened work time and scaled burn), giving a 47 % cut in work tokens, above the 27 % ceiling; capacity and simulation used different hit rates; no lookup, miss or write cost; `hitMax` 0.6 was mislabelled (it was a KS pilot recall target, not a share of reading avoided). Ruling: taken. Saving applied once, every lookup costs, exposure restated as 43.6 %.
- Item 12: the library contradicts KS scope (KS "not the defect register", lookups host-local and not journalled, lookup on error/escalation/diff only; "ask before exploring" is a new and costliest trigger). KS is FixFlow-specific; transfer to the clinic is not shown. Self-evolution only partly mechanised: no writer named for stale-by-change, lookup-key fixes, or the rates tally; "defect stops arriving" overclaims; promotion is manual, owner rules (D17). KS kill rule not carried over. Ruling: taken; three departures listed (V2:91), kill rule carried over (V2:92).
- Item 13: residency calculator omits the lookup turn (a full-context re-read), the double cost of a miss, and compaction ending re-reads early at about 367k. Ruling: partly taken; each route costs one call, left out of the calculator and noted.
- Also: the token window is uncalibrated; calibrated to the October record (75 minutes at six lanes) it is about 7.5 lane-hours and tokens bind first (item 1). V2 adopted about 2.5 lane-hours [E] as the October fit. The refuter notes `explore` and fill shares were tagged [M] and moved to [E].

## 7. Fixed cost, lookup cap, lookup turn

- **Fixed cost per agent:** about 70,000 tokens before any work [M, October, CR-11]: tool definitions 34k, connector definitions 17k, skills 9k, system prompt 8k, memory 2k (HB:85). November: 55-80k start per call (remeasure); about 42k per main call by chars/4 (combined.txt prefixTokPerMainCall); 56 % of agent tokens in FixFlow. FixFlow's CLAUDE.md alone is about 7.5k (not a per-agent fixed cost; refuter item 9).
- **Cap on a lookup's output:** 2,000 characters in the KS design, about 860 tokens [S] (ARCH numbers `answer_cap`; V2:107). The KS design file is on another branch (PR #183) and was not read here.
- **Cost of one lookup turn:** no measured number exists. Stated: each lookup is a turn whose answer stays in context (ARCH `lookupCost` 0.02 of burn [I]); the refuter says a turn re-reads the caller's whole context, about 306k per call for slice sessions, and KS §6 says per-call cost is dominated by the caller's context re-read (item 3, via refuter). [D]: one extra call is 1/519 = 0.19 % of a slice session's calls; the 2 % guess equals about 10 turns per session. KS's own value formula: hit rate x (cost of solving again minus cost of a hit) minus miss rate x cost of a miss minus cost of writing; "None of those is measured yet" (V2:93).

## 8. Recurrence and volume

- Clinic repo: 432 commits and 65 merges in eight working days, 150 commits on the peak day [M] (HB:72). V2 says co-change history is weak at 432 commits (V2:88). 36 of the 65 merges went straight to main (adjudication notes).
- FixFlow repo: 383 commits (graph/verify/check.txt C6), 233 non-merge commits on main, 140 usable task commits (graph2/protocol.md). 174 code-touching commits in the co-change analysis.
- KS expects **3 to 5 [E] same-cause repeats among 48 fix commits** before its audit (V2:90; ARCH `ks_prior`).
- Library entries: 4 per merged slice [I]; 11 slices in the default run [M]. "Seen three times" promotes an entry to a check.
- KS stop rule [S]: fewer than 3 verified hits in 20 encounters or 8 weeks (V2:92).
- Other counts: 38 of 71 practised ideas failed as prose [M]; 183 minor findings with no status [M]; 2.8 rounds per slice, 64 % of reviews send a slice back [M]; board document 221 KB [M].
- Ten parallel lanes lasted about 15 minutes; one window covered about 3.4 M subagent tokens [M] (V2:326-340).

## 9. What the documents say is unknown

- How cache reads count against the five-hour usage limit (TB:64; V2:118, 215, 353; HB:90, 397). So no token cut can be promised to cut limit stops.
- Whether a shorter digest can stand in for the lines read (V2:87).
- Whether the reading was needed at all (74 % to unedited files is "not proof of waste").
- What a compaction loses; no trial compared thresholds on real Claude Code slice work (HB:395). The 400k window effect is "anecdotal" at best.
- Every library parameter (hit rate, half point, entries per slice, lookup cost) is a guess. Savings by the library: "not measured".
- Whether the index replay's pass marks hold: 3 % of tokens and recall 0.8 [T] are a refuter's suggestion; the owner sets them (decision D23).
- Result quality by model tier; fidelity of cached conclusions.
- Reuse across projects: V2 says KS is FixFlow-specific and the transfer is not shown (refuter item 12). No cross-project measurement exists.
- Caveats on tallies: about 1 % of calls (harness Haiku) missing from transcripts; the live measurement session is in the FixFlow group; harness cost-state is a lower bound (TB:65-67).
