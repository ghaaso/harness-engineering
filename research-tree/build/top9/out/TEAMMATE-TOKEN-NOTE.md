# Token findings handed to the teammate (2026-11-24)

For the teammate who has token optimisation (the record book's store, the router, caching) for now (library r57-0057).
Plain words. Nothing here is a proposal to the owner; each step needs his word and a cap before it runs (CLAUDE.md rule 3).
Marks: [quoted] = a source as a file quotes it, [measured] = counted on records on this PC, [hypothesis] = reasoned, untested.
"Meter" = the weekly all-models usage meter. "Fresh tokens" = new input, cache writes and output (what the meter follows);
a re-read of cached text weighs about 1 % of a fresh Opus token [measured] (library r57-0175; `research-tree/build/ROUTER.md` section 2).
"Replays" = tests run over transcripts already on disk, no new model work. Tokens are counted in millions (M).

## Where the first measurements stand

Seven replays ran on 2026-11-23 over 4,438 transcripts (`research-tree/build/replays/JUDGE-REPLAYS.md`, section 1 and 2).
Two of them are about tokens in your area: cache lapses (L24) and the fixed start-up text (L2). A third (L38) is about the
record book. None led to a trial yet; every trial below is waiting.

## 1. Cache keep-alive and helper waits

**What it is.** The provider keeps a prompt cache for 5 minutes for a helper and 1 hour for a main session
(library r57-0176, `ROUTER.md` section 3, section 7). When a session or helper waits longer, the whole window is rewritten
at full price. Lead L25 is to keep the cache alive across waits.

**What was measured** [measured] (`replays/replay-L24/RESULT.md`, "Answer" and the wait table):
- Lapses rewrote 151.5 M of 927.4 M fresh tokens (16.3 % of fresh; 0.62 % of all tokens) in 703 of 121,284 calls.
  By project: FixFlow 19.8 %, clinic 24.1 %, harness 8.3 %, research run 6.1 % of fresh.
- The largest block: helpers waiting just past 5 minutes, 296 calls, 46.2 M (30 % of lapse tokens). The check wait averages
  283.8 s, right at the 300 s life of a helper's cache. Main-session lapses (owner away, 1 hour to days) are 63.6 M.
- A keep-alive capped at 2 hours would net 95-109 M, 7.9-8.1 % of the meter, at a 1-hour write weight of 1.25 or 2 times
  a fresh token. A cap of 30 minutes nets 5.6 %; 8 hours 10.6-12.2 %. This is a ceiling for a mechanism not known to exist.
- A 1-hour cache for helpers loses at both weights (break-even weight 1.14).
- Breaks that nothing explains (the "break guard" idea): 21 calls, 2.6 M, 0.28 % of fresh. Not worth building. If ever built,
  it must use the request's age, not the gap between responses (the gap rule false-alarmed on 112 of 133).

**Not known** (`replay-L24/RESULT.md`, "What was NOT tested"): whether Claude Code lets a helper or session keep a cache
alive at all (no ping exists for a helper; this PC sleeps after 15 idle minutes); the meter's weight of a 1-hour write;
per-model weights (Fable sessions weigh 2.7-5.6 times Opus per fresh token, so session lapses may weigh more).

**Next step and cost** (`replay-L24/RESULT.md`, "What it changes next"; `JUDGE-REPLAYS.md` section 4, item 3):
1. Refit the 132 meter readings of r57-0175 with 5-minute and 1-hour writes apart. No model run; scan work only.
2. Test whether a helper's wait can be kept under 270 s by polling in shorter steps (the 46.2 M block).
3. Then a pilot on helper waits only, with a cap. The size of that pilot was not costed in the files read; it needs an estimate.
Owner's word is on the open list for steps 1-3 (r57-0531).
**Files:** `replays/replay-L24/` (RESULT.md, scan.mjs, classify.mjs, ka.mjs, age.mjs, raw outputs: summary.txt, ka.txt, age.txt).

## 2. The lean-prefix pilot (L2 with L27)

**What it is.** The "prefix" is the fixed text every window starts with: tool schemas, skill listing, CLAUDE.md, memory.
Lead: a smaller prefix, maybe fewer turns. The source quotes a 12-15 times larger prefix and 2-7 times more turns in Claude
Code than a bare agent, with cost per success 5-30 times [quoted] (`RUN:closing/HAND-BACK.md`, section L27; the refuter noted
the 5-30 times does not transfer without a cache assumption).

**What was measured** [measured] (`replays/replay-L2/RESULT.md`, counts and ceiling tables; `JUDGE-REPLAYS.md` section 3a):
- Prefix median 58,045 tokens (helpers 55-58 K, FixFlow helpers 72 K, sessions 78-91 K); about 70 % of a helper's prefix is
  tool schemas (40-45 K, a chars-per-token estimate, plus or minus 20 %).
- Its fresh part is 12.9 % of fresh tokens on the 1,071 files L2 scanned. L2's scan missed 3,048 workflow helpers;
  with them, **19.8 %** (FixFlow 22.4, clinic 14.0, harness 13.9, run 19.5 %). L2's 30.1 % re-read share and 15.6 % / 1.9 %
  meter ceilings were not recomputed with them (likely higher).
- Ceiling on the meter: a radical lean prefix at most 15.6 % (assumes work gets done with under 5,000 tokens of schemas;
  not tested). Removing only what is loaded and never used (skill listing, deferred-tool names) 1.9 %.
- The skill listing (6-10 K tokens) loaded in 1,029 files and was used in 33 (96.8 % unused), although skills are switched
  off here (r57-0036).
- The saving of a lean prefix and a keep-alive overlap (4.8-5.5 points are the same rewrites); they do not add (`JUDGE-REPLAYS.md` 3b).
- Short helpers carry the highest prefix share (build Sonnet 39.8 %, run Sonnet 35.7 %); long Opus refuters 7 %.

**Next steps and cost** (`replay-L2/RESULT.md` "What it changes next"; `JUDGE-REPLAYS.md` section 4, item 4):
1. Re-run L2's count with the workflow helpers included (no model run, about a minute of scan [measured]).
2. Switch off the skill listing in this repository's sessions and helpers: a settings change needing the owner's word; 1.9 % of
   the meter on the subset.
3. Measure each tool-schema family's size: one probe session per MCP server (a small model run, not costed in the files).
4. The pilot itself, only on short helpers: **384 M tokens, 4.1-5.0 h** [quoted] (HAND-BACK, L27). Quality and turn count under
   a lean prefix are not tested at all.
**Files:** `replays/replay-L2/` (RESULT.md, scan.mjs, aggregate.mjs, raw/aggregate.txt). Fix first: scan.mjs lists
`subagents/*.jsonl` only; L24's walks the whole `subagents/` tree.

## 3. The router (`ROUTER.md`, version 2; library r57-0421, hypothesis)

**What it is.** The provider's own pattern: one model for a session's main loop, helpers on cheaper models, lower the effort
before trying a cheaper model. Per step: coordinator Fable or Opus high; field helpers, analysts, refuters Opus high; a fold
Opus medium; readers and ordinary code Sonnet medium; extraction into a fixed schema Haiku; no-judgment steps as scripts.
A session cannot switch its own model or effort (the app refuses it; r57-0176).

**What it saves** [hypothesis, computed from measured parts] (`ROUTER.md` section 0 and 6): 13-49 M of the 986 M of path e2
(0.7-2.7 of its 13-17 points) and 19-35 M of the pilot plan's 418 M. The biggest lever: a waiting coordinator wakes at least
hourly and keeps its 1-hour cache (0.5-1.9 points on e2). Then quiet scripts (print one line, the rest to a file: 6.5-18.7 M on
the plan) and folding counts into calls already made (13.6-22.3 M). Published routers (RouteLLM, Hybrid LLM, AutoMix) need
labelled preference data and route single queries, so they do not fit (`ROUTER.md` section 3).

**What the meter weighs** [measured, ranges] (r57-0175, 132 readings, one week): per fresh token, Sonnet 0.15-0.5 of Opus,
Haiku 0.15-0.8, Fable 2.7-5.6 times. Counting every token equally (62 M a point) fits worst.

**Not known** (`ROUTER.md` section 8): Haiku's weight (needs a stretch of about 7.6 M Haiku fresh tokens with nothing else
running, or the readings every get_usage call logs); pass rates by model and effort on our steps (a1-0507): Sonnet low vs Haiku
on 10 extractions; Opus medium vs high on 3 folds and 3 refutations; Sonnet medium vs high on reads and code. Each needs the
owner's word (r57-0506). The efforts take effect only once written into CLAUDE.md or a skill; nothing is written now.
**Cost:** the pass-rate table from records is lead L40, 4.7 M (1 replay) [quoted, HAND-BACK L40]. The agentic router (L48,
0.8B core) cost is "likely large, a measurement" [quoted]; not planned.
**Files:** `research-tree/build/ROUTER.md`, `research-tree/build/refute/ROUTER.md`, the tier hook `.claude/hooks/tier-routes.json`.

## 4. Library (record book) store leads

**What was measured:** L38, a recorded conclusion worked out again (`JUDGE-REPLAYS.md` section 2, last row): 57 pairs judged blind,
**0 returns** (18 continuations, 10 checks by design, 29 different); 949 helpers; 95 % upper bound about 100 of 949 (10.5 %),
mostly the 0.3-0.5 similarity bin. A null for one form: direct helpers, briefs, 1,800 characters. Not covered: main sessions,
the 3,048 workflow helpers (with them the helper token share is about 56 % FixFlow, 26 % clinic, not 30 / 17.5 %),
hand-overs as records, similarity under 0.3.
**Next step and cost:** only if wanted: about 300 more judged pairs from the 0.3-0.5 bin, **1.7 M** [quoted], with workflow
helpers and main-session sub-questions added [reasoned]. No pilot.
**Other leads** (`RUN:closing/HAND-BACK.md`, listed with costs there): L46 plan cache keyed by intent, count recurring brief
kinds, 4.7 M [quoted], quoted gain -50 % but not on code; L51 experience memory, no-memory pilot first, 384 M [quoted];
L33 a local 3-8B reader under the cloud planner (with L23, the 4-bit 8B model), 9.4 M cloud tokens, a 4.9 GB download that
is the owner's decision [quoted]; L64 self-hosted KV reuse, only applies to a local model, a measurement not costed.
**Files:** `replays/replay-L38/` (same folder pattern; scan.mjs has the same workflow-helper gap as L2).

## 5. Items left open on r57-0531 (the owner's go-list; page section 6)

r57-0531 lists, each blocked on his "approve":
1. Read the 11 helpers that said DONE after a failing check (under 1 M) - quality track, not tokens.
2. Measure the 1-hour cache write weight and helper waits under 270 s, then a helper-wait pilot with a cap - **yours (section 1)**.
3. Switch off the skill listing here - **yours (section 2)**; owner's word, a settings change.
4. The stronger quality test with D1 Phase A (70.5 M) - quality, the owner's track.
5. Five new replays of wave 2 (23.5 M, cap 54.1 M) - the files read do not name them; see `RUN:closing/wave2/` (not opened in detail).
6. D4, the ranker test (18.8 M, cap 43.2 M, installs named first) - graph track, the owner's, not yours.
7. L65's arm: a BM25 ranked candidate list given at task start, 192 M joined to D2 Phase B or 384 M alone [quoted]; a gain quoted
   on text questions, not code; graph/search track.
Also open: commit of the round's files; the paper behind a bot check (Jigsaw-LightRAG, IOP 10.1088/3050-287X/ae4a3e).

## 6. The large token trials, in one list

| trial | tokens (quoted) | needs first |
|---|---|---|
| lean-prefix pilot (L2/L27) | 384 M, 4.1-5.0 h | steps 1 and 3 of section 2 |
| experience memory pilot (L51) | 384 M | nothing named |
| BM25 list arm (L65) | 192 M with D2 Phase B, or 384 M alone | D2 gate |
| D2 optional third arm (typed store as a tool, L15) | 192 M | D2 Phase A |
| helper-wait pilot | not costed in the files | section 1 steps 1-2 |

The research run's own pace: helpers ran at 0.53 of expected tokens against 2.3 times in the 2026-11-19/20 build
(`JUDGE-HANDBACK.md`, hand-back list item 6); use that for sizing.

## Not read
- `RUN:closing/wave2/` detail (the five new replays' names), `refute/ROUTER.md`, the sources behind the quoted papers.
- `replays/replay-L38/` files themselves (only its row in JUDGE-REPLAYS.md).
- `JUDGE-HANDBACK.md` was searched for token lines, not read through; HAND-BACK.md only the cited lead blocks.
- Cost of the helper-wait pilot and the tool-schema probe: not in the files.
