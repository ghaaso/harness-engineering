# ROUTER: a model and an effort for each operation inside a session (r57-0041)

Helpers of top session 4 (kind analyse, Opus), 2026-11-20: the first from `research-tree/build/briefs/ROUTER.md` (stopped
at its context line with four items left), the second from `briefs/ROUTER-2.md`, which finished them. Design only:
nothing built, installed or started. Marks: [m] measured (path), [r] read (path:line), [c] computed (formula shown), [e]
estimate. Tokens = input + cache creation + cache read + output, once per message id (rule of `tools/tokens-self.mjs`),
unless a line says "fresh" (input + cache creation + output, no cache reads). Scripts (read only, no model), in the
scratchpad `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/`:
`router/` (`ivals.mjs`, `scan.mjs`, `fit.mjs`, `dup.mjs`, `ops.mjs`) and `router-2/` (`readings.mjs` the meter readings,
`meter.mjs` and `meter1.mjs` tokens by model and field once per message id across files, `fit2.mjs`, `mc.mjs`, `fit3.mjs`,
`jack.mjs` the meter fits, `ops2.mjs` operations in fresh tokens and result sizes, `save.mjs` and `save2.mjs` section 6).
One build, one week, one repository: a basis, not a law.

## 0. The answer

1. Routing inside sessions pays in single points. On path e2 (about 1.0 B tokens) the levers computed here save 22-52 M
   tokens, and 0.8-2.6 of its about 17 points by the meter's measured weights; on the plan, 32-44 M, 0.5-0.7 points.
2. Two ways to give a step its own model work today: a helper on a cheaper model, or a script with no model. Switching
   a running session's model re-sends its whole window (the cache is kept per model) and never ran here.
3. The meter is now measured on 132 readings found in our transcripts, not 10: it counts fresh tokens (new input, cache
   writes, output). Re-reading a cached window costs about 1 % of the same tokens fresh.
4. Per fresh token Sonnet weighs about a third of Opus, Fable about 3.4 times Opus. Haiku is not settled: half to
   0.8 of Opus here, against a fortieth by price.
5. So long windows are cheap to re-read; what costs is what each call writes: outputs, tool results, helper starts (59 K
   each), and windows rewritten after the cache runs out (an hour for a session, five minutes for a helper).
6. Largest win on e2: the waiting Fable coordinator wakes at least once an hour, so its cache never runs out (0.5-1.8
   points). Next: no separate token-count or meter calls; quiet scripts (one line printed, the rest to a file).
7. Already right, measured: helper returns are short. Reads carry a quarter to two thirds of fresh tokens, but the
   transcripts cannot show which part was needed.
8. The Fable coordinator costs little on e2 (about 0.2 point, 0.6 Fable point); on the plan it costs 1.6 points more
   than an Opus one would.
9. Effort is set once per session: high for coordinators, builders, refuters, analysts; medium for Sonnet; low or
   medium for Haiku.
10. The plan's models match the orchestration document, which is not good enough: per agent only, overhead 8 times too
   low, effort never tried, no break-even. The EMS folder's skill and 12 agent files repeat it and add one rule.
11. Not known: Haiku's weight on the meter, and pass rates by model and effort on our steps; each test needs his word.

## 1. The operations and their share of tokens

**By operation, from transcripts [m: `ops.mjs`; each call's context + output, assigned to the first tool it calls].**
A call's tokens are mostly the re-read of its window, so a share is "calls of this kind x the window they re-read".

| Who (tokens, calls) | Shares |
|---|---|
| Build roots, 3 Opus coordinators (155.3 M, 621 calls; transcripts 8a7db643, 0be12bcd, 873082b7) | no tool (reports, decisions, ending a turn) 21 %; other tools (todo, tool search, pages) 15 %; Write/Edit (STATE.md, briefs, records) 13 %; lane, suites, landing 10 %; shell reads 9 %; helper starts with briefs 9 %; git 7 %; other shell 6 %; token counts 4 % and get_usage 3 % (42 calls); Read 2 %; waits 1 %; SendMessage 1 %. Calls right after a helper's notice: 31, 6 % (my flag finds only the notices with the word task-notification) |
| Top sessions 1-2, Opus (94.0 M, 390 calls; 34cb9690, 957a3bc0) | other tools 20 %; Write/Edit 19 %; no tool 17 %; shell reads 13 %; other shell 7 %; git 6 %; tests 6 %; session tools 5 %; Read 4 %; usage 2 % |
| Builders, build-invariant Opus (524.1 M, 3,119 calls) | shell reads 48 %; Write/Edit 11 %; Read/Grep/Glob 10 %; tests and lane 9 %; own token counts 7 % (181 calls); other shell 6 %; git 6 % |
| Refuters, Opus (185.5 M, 1,113 calls) | shell reads 41 %; tests 15 %; git 12 %; token counts 8 % (84 calls); Write 8 %; other shell 6 %; Read 6 % |
| Analysers, Opus (36.0 M) | other shell 43 %; shell reads 30 %; Read 8 % |

**In fresh tokens [m: `ops2.mjs`].** Each call is charged what it writes: its output plus what its results add to the
next call's cache writes; a session's first prompt ("start") and windows rewritten after the cache ran out ("rebuilds")
are apart. Charging each call its own fresh fields instead moves a few points between rows.

| Who: fresh of all | start; rebuilds | Fresh shares by operation |
|---|---|---|
| Build roots: 2.48 of 155.3 M (1.6 %) | 4 %; 0 % | Write 16 %; other tools 13 %; lane, suites, landing 12 %; Read 11 %; helper starts 11 %; shell reads 8 %; other shell 7 %; no tool 6 %; git 6 %; token counts 5 %; get_usage 3 % |
| Builders: 13.01 of 524.1 M (2.5 %) | 9 %; 1 % | shell reads 47 %; Read 17 %; Write 12 %; tests 8 %; git 5 %; other shell 5 %; token counts 4 % |
| Build refuters: 5.46 of 185.5 M (2.9 %) | 5 %; 7 % | shell reads 39 %; git 15 %; Read 13 %; Write 12 %; tests 9 %; token counts 6 % |
| Top sessions 1-2: 3.85 of 94.5 M (4.1 %) | 2 %; 19 % | other tools 36 %; Write 22 %; shell reads 9 %; other shell 9 %; Read 6 % |
| Round 3 lane sessions, 7 Opus: 1.11 of 39.7 M (2.8 %) | 18 %; 16 % | Write 31 %; no tool 19 %; helper starts 13 %; other tools 11 %; Read 7 %; get_usage 5 % |
| Round 3 readers, 38 Sonnet: 4.73 of 128.1 M (3.7 %) | 17 %; 2 % | other shell (fetching and reading sources) 42 %; Read 15 %; Write 15 %; shell reads 13 % |
| Round 3 extraction, 24 Haiku: 3.22 of 24.6 M (13 %) | 17 %; 0 % | shell reads 34 %; Write 26 %; other shell 22 %; Read 13 % |
| Round 3 report and fold, 10 Opus: 3.34 of 83.9 M (4.0 %) | 8 %; 0 % | shell reads 30 %; Write 27 %; Read 22 %; other shell 15 % |
| Round 3 refuters, 5 Opus: 1.41 of 64.2 M (2.2 %) | 7 %; 0 % | shell reads 51 %; other shell 25 %; Read 11 %; Write 10 % |
| Round 3 top session, Fable (whole transcript cf83865e): 3.43 of 153.2 M (2.2 %) | 2 %; 22 % | Write 25 %; other tools 18 %; other shell 11 %; Read 11 %; no tool 8 %; git 7 % |

**Tool results [m: `ops2.mjs`; characters, median / 90th percentile, by group].** Read 5-45 K / 13-56 K (most 6-25 K);
shell reads 1.3-4.7 K / 4-14 K; tests, lane and landing 0.1-8 K / 0.6-18 K; git 0.1-4 K / 0.1-13 K; helper returns
1.1-2.1 K / 2-8 K; Write 0.2-0.7 K. About 2.2-2.9 characters a token [m: builders' shell reads, 5.00 M characters, 2.30 M
tokens of window growth]. Helper returns over 2 K tokens: 9 in all the groups; cutting them to 2 K saves 0.4 M tokens
with their re-reads.

**By role in the plan** [r: PILOT-PLAN.md s1-2, 417.8 M]: coordinator 94.3 (23 %, Fable); top session 20.5; fix round
142.7 (34 %: builder units 3 x 32.3, refuters 3 x 10.6, root share 14); readers 31.9; T, S1, S2 38.5; R_same 9.9; R1, R2
20.5; STPA, FMEA, mapper and inputs 32.2; checkers 16.1; scorer 1.8; tests and probes 7.2; P3.2 0.83; run root 1.41.
**Path e2** [r: COMPLEXITY.md version 2 s3 (e2), chosen]: 986 M [c: sum below; its text says 985]: the fields' helpers
7 x 83.1 = 582 (a field: Sonnet readers 34.3, Haiku extraction 5.5, Opus report and fold 20.0, gate and check 5.0, Opus
refuter 15.5, round 3's medians); 7 field helpers, Opus, 7 x 15.6 = 109; the Fable coordinator 6.0 (4.1-8.9); the closing
helper 13.7; intake readers 32.9; intake fold 37.1; board, recall test and synthesis 40.5; top session 15; problem
sheet 8.1; the F1 arms 142 (R_same and the planted copy 77.4, the fresh arm's review 51.8, the scorer 12.5). Per helper
by kind [m: E-tokens 1a]: extract/Haiku 0.83 M, run/Sonnet 1.41, read/Sonnet 1.79, collect/Sonnet 3.20, analyse/Opus
8.05, refute/Opus 8.69 (10.6 in the build, r57-0173), builder unit 32.3 (r57-0173).

## 2. What a token weighs on each meter (the objective, r57-0003, r57-0514)

**Readings [m: `readings.mjs`].** Every get_usage result in the transcripts since the reset: 132 with a time, from 2 %
(11-16 12:45 UTC) to 83 % (11-20 13:58), with the Fable meter beside. They replace the ten readings used first, some of
whose times were assumed and off by up to about an hour (43 % was read at 20:47 on 11-17, not 21:30; 66 % at 17:47 on
11-19, not 18:40). **Tokens [m: `meter1.mjs`]:** by minute, model and field, once per message id across files: 3,620 M
to 11-20 13:00 against 3,727 M counted per file (107 M of Fable stand in two files, inside the first day and a half).

**All-models meter** [m: `fit3.mjs`: reading = constant + weights x tokens to the reading's minute, least squares, no
weight below 0; rounding alone gives 0.29 points]:

| Weighting | RMSE, points | Fit on one half, error on the other (to 11-18 12:00 / after) |
|---|---|---|
| all four fields equal, models equal (**H-raw**, the plan's basis) | 2.12 (constant 5.9) | 5.00 / 7.05 |
| the provider's prices in full (**H-price**) | 1.89 | 2.58 / 6.80 |
| the prices' shape across fields, models equal | 1.48 | 4.25 / 4.66 |
| cache reads + fresh, models equal (**H-fresh**): 0.0033 and 0.472 points per M | 1.00 | 4.78 / 2.76 |
| cache reads + fresh at price ratios (Fable 2, Opus 1, Sonnet 0.5, Haiku 0.025) | 0.94 | 3.62 / 2.13 |
| cache reads + Fable's fresh + the others' fresh | 0.72 | 0.86 / 2.76 |
| cache reads + fresh per model, free (**H-fit**) | **0.60** | 2.21 / 1.48 |

**H-fit [m]:** per M fresh: Fable 1.46, Opus 0.43, Sonnet 0.15, Haiku 0.35 points; per M cache read 0.0047. Dropping one
day of readings at a time [m: `jack.mjs`]: to Opus, Fable 2.6-5.4, Sonnet 0.22-0.46, Haiku 0.49-0.81; a cache read 0.1-3.1 %
of an Opus fresh token. So a point is about 2.3 M Opus fresh (1.7-3.4), 6.5 M Sonnet fresh, 0.7 M Fable fresh, or 210 M
cache reads. Haiku is the weak one: 9.1 M of fresh in all, mostly in one stretch on 11-17 and 11-18; the fit puts it
far above its price ratio, and nothing else here can check it.
**What ten readings could and could not settle [m: `fit2.mjs`, `mc.mjs` on the ten intervals, tokens once per id].**
They could show the meter follows fresh tokens (fresh fits 1.05, all fields equal 1.50). They could not give a weight per
model: a free weight per model fitted 0.72 but failed on each left-out interval (leave-one-out 2.01 against 1.09);
Sonnet's and Haiku's tokens fell in the same intervals. They pointed the wrong way on price ratios (equal weights
fitted better; a simulation with price ratios true gave that in 7 % of draws), and an outside load of 0.12 points an
hour would have made the two fit alike. With 132 readings the price ratios fit better than equal weights, and the free
weights hold when any one day is left out (above).
**Fable meter [m: `fit3.mjs`]:** fresh Fable tokens fit (RMSE 1.65; 4.18 Fable points per M fresh, cache reads weigh 0)
better than all four fields (2.42; 9.9 M a Fable point) or the price shape (1.80).
**Cache lifetime [m: the usage fields of three transcripts]:** a main session writes its cache for one hour (this top
session: 174 writes, all one-hour; cf83865e: 1,772), a helper for five minutes (a round 3 helper: 74, all five-minute).
A session idle past an hour, or a helper past five minutes, rewrites its whole window as fresh tokens at its next call.

Three hypotheses carry the savings below: **H-raw** (the plan's 62 M a point; the readings fit it worst), **H-fit**
(measured above; Haiku's weight unsettled) and **H-price** [r: G-models.md; skill `shared/prompt-caching.md`:144]: per M,
Fable 8 / 10 / 0.20 / 40 (input, 5-minute write, read, output), Opus 4 / 5 / 0.20 / 20, Sonnet 2 / 2.5 / 0.10 / 10, Haiku
0.10 / 0.125 / 0.01 / 0.50 up to 100 K of prompt and 5 times that above [r: skill SKILL.md, Current Models]. Under H-fit
the plan is **7.9 points** (Fable 2.6, Opus 4.5, Sonnet 0.6, Haiku 0.2) against 6.7 at 62 M a point, and path e2 **16.9**
(Opus 11.2, Sonnet 3.5, Haiku 2.0, Fable 0.2) against 15.9 [c: `save2.mjs`: each role's tokens x its group's fresh and
cache-read shares (section 1) x the weights].

## 3. The mechanisms and their break-evens

Symbols: W the parent's window at the step; n the parent's calls after it; c the step's calls inline; a what the step
adds to the parent's window inline (results and outputs); F a helper's context at call 1, 59 K [m: hc1-0104]; f the
fresh part of F (start loads are 5-28 % of a helper's fresh tokens, section 1); h, g a helper's calls and growth a call
(2.0-7.5 K, E 1b); b brief; r return; w(cr), w(f) a model's weight per cached and per fresh token.

| Mechanism | Cost and limits | Ran here | Break-even [c] |
|---|---|---|---|
| (a) helper on another model (Agent `model`, `effort`) | Inline I = wP(f) a + wP(cr) (c W + n a). Helper H = wH(f) (f F + a_h) + wH(cr) (h F + g h^2/2) + wP(f) (b + r) + wP(cr) (2 W + n (b + r)) | yes, every build and round (r57-0166 to r57-0173) | pays if H < I. Example W 150 K, n 30, a 30 K, c 3, h 8, g 3 K, b 1 K, r 2 K, f = 1, in Opus-fresh units: H-raw, equal models: I 1,380 K, H 1,050 K (pays); H-fit, Opus parent: I 45 K; a Sonnet helper 46 K (even), a Haiku helper 85 K, an Opus helper 103 K (neither pays); H-price, Opus parent: Haiku helper 3.6 times cheaper, Sonnet about even. Rule: under H-raw a step pays as a helper when n a exceeds about the helper's own run plus 2 W (here a > about 30 K); under H-fit only on a cheaper model and when a exceeds about 30 K (Sonnet) |
| (b) script, no model | the call that runs it (W re-read) plus its printed output re-read n times | yes (lane, land, status, tokens-self) | always below a helper for a step without judgment: the helper also costs a parent call; print one summary line, the rest to a file |
| (c) switch a running session's model or effort (set_session_model, set_session_effort, /model) | caches are model-scoped: a model switch rebuilds the whole window [r: skill `shared/prompt-caching.md`:97, :219, :238]; a top-level effort change invalidates the messages cache; the provider's per-message effort form avoids it on these four models (beta, :226-232); whether the app uses it, and whether a session may switch itself, are not known (a probe needs his word, r57-0506) | never | a stretch of s calls pays if s (wOld - wNew) x per-call cost > W (wNew(f) + wOld(f)) for the switch and back: H-raw Opus to Sonnet s > about 3; H-price s > about 49; H-fit s > about 90. So never for a coordinator's window under H-fit or H-price |
| (d) a workflow, a model per step | a script runs the steps, no parent wake per step; judgment points return to the parent; needs his explicit words; resume is positional (memory note); the tier hook is not shown to see its agents (ORCHESTRATION.md s2) | in the product folder (tcb-build, 2026-11-16, ORCHESTRATION.md:74-75); not here | saves the parent's wakes and a helper orchestrator's polls: H-raw a wake costs its window (0.13-0.24 M); H-fit 1-2 K Opus-fresh a wake |
| (e) fewer or shorter turns of the dear model; keep the cache | fold usage and counts into calls already made (parallel tool calls; the lane prints the count); returns of at most 2 K with details in files; wake only on a notice or a timer (t1-0403); hand over at the measured W* 247-273 K, not 133 K (r57-0171); a waiting session's timer shorter than its cache lifetime (under an hour for a session, under five minutes for a helper) | partly (wake timer, files; helpers' polls of at most 150 s) | always pays under H-raw and H-fit for the folds and returns. The timer: under H-fit a call that keeps a 200 K window costs about 0.001 point, a rewrite 0.09 (Opus) to 0.29 (Fable); under H-raw the two cost the same |
| (f) an agent definition's model and effort | the caller's value wins (r57-0108, documented, never tried); a fork inherits its parent's model | never | only a default where a caller names none; the tier hook already requires an explicit model |

## 4. The router

One row per operation. "Inline" = the session's own model and call. Condition: the break-even of section 3.

| # | Operation | Share [m] | Model, effort | Mechanism | Condition | Mark | Missing measurement |
|---|---|---|---|---|---|---|---|
| 1 | Coordinator: read a helper's return, decide | no-tool turns 21 % of roots (6 % fresh) | the session's model (Opus orchestrate; Fable only for orchestrate-deep, r57-0035); effort high | inline; returns at most 2 K, details in files | always inline: the decision needs the window | [r] rule; [e] effort | coordinator quality at medium against high |
| 2 | Write a brief and start a helper | 9 % (11 % fresh) | inline | brief points at files; fixed parts from a template | - | [m] | - |
| 3 | Write state (STATE.md, usage line, landing lines) | with records 13 % (16 % fresh) | no model for counts, readings and landings; one judgment line inline | script (b) | always | [m] share | the script, not built |
| 4 | Read the meter; count own tokens | 7 % roots (8 % fresh); 7-8 % builders and refuters (4-6 % fresh; 265 calls) | no model | get_usage in the same call as the next action; the lane prints the caller's count with each result | always: their results (get_usage 1.6-6.8 K characters) are re-read at every later call | [m] | - |
| 5 | Wait, poll | 1-2 % | none | notices wake a session; a background timer as a safety wake, shorter than the cache lifetime (under an hour; a helper's polls under five minutes); no helper orchestrator that must poll (r57-0418) | timer: under H-fit always | [m] lifetimes | the app's lifetime on long helpers |
| 6 | Hand over | orientation 2.33 M each (r57-0171) | successor on the same model | at W* 247-273 K | - | [m] | W* on Fable |
| 7 | Run scripts: lane, suites, landing, git | 23 % roots; tests 9-15 % of builders and refuters | no model beyond the issuing call | quiet output to a file, one line printed | a `run` helper (Sonnet; Haiku for a pass or fail read) only when the output needs judgment and a passes section 3 | [m] shares and sizes; [c] | - |
| 8 | Read a few files | 11 % roots; 58 % builders (64 % fresh) | inline, ranges and grep, not whole files | e | a helper only past section 3's break-even | [m] | which part of a read was needed |
| 9 | Locate (where is X) | - | script (grep, `lookup.sh`); Haiku low when the target is not a name | b, else a | - | [m] Haiku worked (r57-0208) | - |
| 10 | Extract one file into a fixed schema | 0.83 M a helper; 13 % of it fresh | Haiku, low for literal, medium when names vary; under 100 K of prompt (Haiku's price step; extractors peaked at 123 K, E 1b) | helper, several files per helper | under H-fit Haiku's weight decides: at 0.5-0.8 of Opus (this fit) Sonnet costs half as much on the meter; at its price, Haiku | [m] r57-0208; effort never run (r57-0210) | Haiku's meter weight; Haiku against Sonnet on 10 files |
| 11 | Read across files: maps, cross-references, citation checks | 1.79 M | Sonnet medium; high for cross-references | helper | - | [m] r57-0208 | - |
| 12 | Collect and quote sources | 3.20 M | Sonnet medium | helpers at once | - | [m] round 3: 151 sampled, none failed (r57-0140) | - |
| 13 | Ordinary code: tests, pages, scripts without invariants | 5.5 M (S2.1) | Sonnet medium (provider: start at medium for agentic coding) | helper | - | [m] one unit; effort [r] skill | Sonnet medium against high |
| 14 | Invariant-sensitive code | 32.3 M a unit | Opus high | helper (builder) | - | [m] 16 units (r57-0173); effort not recorded | - |
| 15 | Run tests | 4-10 % of builder time | no model beyond the builder's call | b, quiet | - | [m] r57-0173 | - |
| 16 | Analysis, design | 8.05 M | Opus high; xhigh only where measured to gain | helper | - | [m] r57-0207 (no record that xhigh beat high) | - |
| 17 | Refutation | 10.6 M | Opus high, fresh context; xhigh for a claim that would stop the work | helper | - | [m] r57-0208 | Opus medium against high on seeded findings |
| 18 | Fold a decided review | 3.0 M | Opus medium (the decisions are made) | helper | Sonnet only after a test shows the same output | [e] | Sonnet against Opus on 3 folds |
| 19 | Build a page | 1-2 M | Sonnet medium | helper | - | [m] pages so built | - |
| 20 | Records and commits | git 6-7 % | the record's claims inline; commit and check by script | b | - | [r] | - |

**Sessions of the research run.** Each starts on one model and never switches (row (c)). **Path e2** (COMPLEXITY.md
version 2, chosen): the coordinator on Fable throughout (orchestrate-deep: its helpers have helpers, r57-0035), effort
high; it starts the problem sheet and the planted copy (Opus analyse, high), seven field helpers (Opus orchestrate,
high) and the closing helper (Opus, high), and reads ten-line returns: 23-32 calls ending at 153-243 K, under its
hand-over point, so it never hands over (COMPLEXITY s2). Between returns it waits up to two hours (fields of 1.2-2.0 h,
three at once): a timer under an hour keeps its cache (row 5). Each field helper runs Sonnet readers (medium), the Opus
report writer (high; R_same in its window), the Sonnet gate and checker (medium), the fresh Opus refuter (high), the
Sonnet blind scorer (medium), the Opus fold (medium) and Haiku extraction (low or medium); its polls of at most 150 s
also keep its five-minute cache. The top session Opus high. Under H-fit the Fable coordinator's 6.0 M (4.1-8.9) is
about 0.2 point of the all-models meter (an Opus one about 0.1) and 0.6 Fable point (0.4-0.8) [c: 2.2 % of its tokens
fresh, cf83865e's share, x 1.46 or 0.43 and x 4.18; + cache reads x 0.0047], against COMPLEXITY's 0.5-1.9 Fable points
at 5.7 M a point. **The plan** (PILOT-PLAN.md version 2): coordinator Fable, orchestrate-deep, since T's readers give
its children children (r57-0035), effort high (the provider's default for Fable); top session Opus high; T, S1, S2 Opus
high; R1, R2 Opus high; STPA, FMEA, mapper Opus high; readers, checkers, scorer Sonnet medium; control, canary, P3.1
Haiku; P3.2 a script; the run root's set-up by the top session's own commands. Under H-fit its 94.3 M on Fable is 2.6
points of the all-models meter against 1.1 on Opus [c: 1.6 % fresh, the build roots' share], and about 6 Fable points.
Both are a ruling's consequence, not the router's choice.

## 5. Against the documents

- **Routes in force** (`.claude/hooks/tier-routes.json`, version 1): the kinds and models agree with rows 9-19. They
  lack effort, the operations inside a session, scripts as a route, the break-even, Haiku's 100 K step, return size,
  the cache lifetime of a waiting session.
- **The plan's assignments against `docs/ORCHESTRATION-DESIGN-2026-10.md` s3** (with r57-0201, r57-0206 to r57-0210):
  accurate on models: Fable only as the main session (s3 row Fable), Opus for analysis and fresh-context refutation,
  Sonnet for reading and collecting, Haiku for extraction and location, no Sonnet on invariant code. Absent from the
  plan: the design's effort levels and its "tiny tasks are inline commands, claims batched per verifier".
- **Is the document good enough? No.** It routes per agent, not per operation; its fixed overhead (7.5 K) is 8 times
  below the measured 60 K (r57-0201), so its inline threshold is wrong by that factor; its effort levels and "raise
  effort before tier" never ran (r57-0207, r57-0210); it has no break-even and no meter weights; it was written for the
  product (r57-0206 note); 25 of its 48 rules never ran. What carries over: the tier ladder (14 rules ran and worked,
  r57-0208), judgment-free discovery, schema-bound extraction, fresh-context refuters, claims batched per verifier.
- **The EMS workshop folder** (read-only). `../EMS_workshop1/docs/ORCHESTRATION-DESIGN-2026-10.md` is the file (byte for
  byte this repository's, per the brief); of its other `docs/*.md` and `CLAUDE.md`, only `docs/HANDOFF.md` names a model,
  once. `../EMS_workshop1/.claude/skills/fixflow-orchestration/SKILL.md` [r: lines 3-99] is the main session's contract
  drawn from that document: its tier table (lines 47-53) is design s3 (cited "design:98", ":99") with the same efforts
  (Haiku low or medium, prompts under about 100 K; Sonnet medium, high for cross-references; Opus high, xhigh for two
  roles; Fable main session only; "raise effort on the current tier before moving up", line 42); its agent registry
  (lines 67-80) and a workflow's task table with a model and an effort per task (lines 88-99) come from the design's s9
  (lines 724-736) and s4. The 12 agent files under `../EMS_workshop1/.claude/agents/` pin model and effort [m: grep]: 6
  Opus (5 high, 1 xhigh), 5 Sonnet (2 high, 3 medium), 1 Haiku (no effort line). **They add nothing to s3 on what the
  models do.** One rule is not in s3: when a workflow task names an agent, its own `model` and `effort` must be left out,
  since "opts.model overrides the model for this agent call" and would re-tier a pinned definition (SKILL.md:62-65); it
  is r57-0108's "the caller's value wins". The workflow's task table is the product's form of a model per step (row (d)).
  None of it ran here; the skill is archived and switched off in this repository (r57-0036, r57-0155).
- **The build's `research-tree/ORCHESTRATION.md`** s2, s3, s13: one model per node, as the routes; the root moved from
  Fable to Opus when no node had grandchildren (s13 row 2), as r57-0035 reads; no effort column; no rule inside a node.
- **PILOT-PLAN.md**: agrees with the routes node by node; no effort anywhere; P3.2 and the run root are helpers where
  scripts do (rows 9 and 7).

## 6. The saving on the research run

Against the routes in force. H-raw: M tokens and points at 62 M a point; H-fit: points by the measured weights (section
2), each role's tokens taken at its group's fresh and cache-read shares (section 1) [c: `save2.mjs`; rates from
`ops2.mjs`]. The plan 417.8 M (6.7 points H-raw, 7.9 H-fit); path e2 986 M (15.9 and 16.9).

| Lever | Plan, H-raw | Plan, H-fit | e2, H-raw | e2, H-fit | Mark |
|---|---|---|---|---|---|
| Counts and meter readings folded into calls already made, with their results' re-reads (row 4) | 23.8 M (0.38) | 0.35 | 10.7 M (0.17) | 0.11 | [c] from [m] rates: roots 11.3 % of tokens, builders 7.7 %, refuters 10.1 %, lane sessions 7.3 % |
| Quiet scripts: tests, lane, landing, git, waits; output over 2 K tokens cut to 0.2 K, the rest to a file (rows 7, 15) | 7.2 M (0.12) | 0.11 | 11.2 M (0.18) | 0.16 | [c] from [m] sizes; [e] the cut part is not read again |
| The same, other shell commands too (readers' fetches and source reads left out) | 18.7 M (0.30) | 0.30 | 41.2 M (0.66) | 0.67 | [c]; an upper bound |
| Helper returns at most 2 K (row 1) | 0 | 0 | 0.1 M | 0.00 | [m]: already met |
| P3.2 and the run root as scripts (rows 9, 7) | about 1.2 M (0.02) | 0.02 | - | - | [c] |
| A waiting coordinator keeps its cache: a timer under an hour (rows 5, (e)) | not computed (the build roots rebuilt 0 %) | - | 0 | **0.5-1.8**; 1.6-5.1 Fable points | [c from e]: 3-5 waits over an hour (three waves of fields, the closing helper) x a rewrite of 124-243 K of Fable at 1.46 and 4.18 per M; the timer's calls about 0.02 |
| Polls removed by a workflow per field (d), with his words | - | - | 30-59 M (0.5-0.95) | 0.19-0.36 | [c from e]: COMPLEXITY s2's 232-370 polls at 130-160 K |
| Ranged reads (row 8) | not computed | - | not computed | - | Read results 5-45 K characters (median); reads carry 24-64 % of fresh in builders, refuters, analysts |
| Model switches (c), effort changes | 0 | 0 | 0 | 0 | [c] section 3 |
| Not the router's: the coordinator on Fable rather than Opus (r57-0035) | 0 tokens | +1.6; about 6 Fable points | 0 tokens | +0.14; 0.6 Fable point | [c] section 4 |

**Totals of what is computed** [c]: the plan 32-44 M (7.7-10.5 %; 0.52-0.70 points H-raw), 0.48-0.67 points H-fit (6-8 %
of 7.9). Path e2 22-52 M (2.2-5.3 %; 0.36-0.84 points H-raw), **0.8-2.6 points H-fit** (5-15 % of 16.9), most of it the
coordinator's cache. The 16.9 take the coordinator at cf83865e's fresh share (2.2 %); without the timer its rewrites
add the same 0.5-1.8 points to them. With a workflow per field, 30-59 M and 0.19-0.36 points more. If e2's briefs give every Opus helper
a token counter every 10 calls as the build's did (round 3's helpers ran none), they add about 35 M [c from e: 7.5 % of
e2's 472 M of Opus helpers besides the field helpers] and about 0.5 point H-fit, unless the count is printed by calls
already made (row 4). Under H-price the order is the same; Haiku helpers then pay where H-fit says Sonnet does (row 10).

## 7. Enforcement (r57-0011)

- **Tier hook** (r57-0120): add operation kinds (locate by script, fold, page) and an effort per kind; the Agent tool's
  input carries `effort`, so the hook can check it (today it does not). It cannot see what a session does in its own
  turns (rows 1-8), a return's size, whether a step had judgment, a session's idle time, or a switch made through the
  app's controls.
- **Scripts**: the lane prints the caller's token count and quiets output (rows 4, 7, 15); the plan gate's done-file
  check refuses a return over its size (row 1); a coordinator's brief sets its safety timer under the cache lifetime
  (row 5).
- **Audit**: `ops2.mjs` over each run's transcripts: separate count calls, returns over 2 K, helpers under the
  break-even, rebuilds after idle; `readings.mjs` and `fit3.mjs` refit the meter after each run.

## 8. Not known, and what measures it

- Haiku's weight on the all-models meter (0.5-0.8 of Opus by this fit, a fortieth by price; it decides row 10): one
  stretch of about 7.6 M Haiku fresh tokens with no other model running, about 3 points if the fit holds and 0.1 if the
  price does [c: `mc.mjs`, three times the noise]; or free, if a later run has such stretches: the readings are logged
  by every get_usage call, and `fit3.mjs` refits them.
- Fable's ratio within 2.6-5.4 of Opus and Sonnet's within 0.22-0.46: more readings of the same kind (free).
- Pass rates by model and effort on our operations (a1-0507): Haiku against Sonnet on 10 extractions; Sonnet against
  Opus on 3 folds; Opus medium against high on 3 refutations with seeded findings; each needs his word (r57-0506).
- Whether a session may change its own model or effort, and its cache cost: a probe, his word.
- Whether a helper waiting on its own helpers longer than five minutes rewrites its window (its lifetime here was five
  minutes; the polls keep it): the first field of e2 shows it.
- The effort each past helper ran at: no record.
