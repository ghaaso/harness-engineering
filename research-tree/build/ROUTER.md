# ROUTER: a model and an effort for each operation inside a session (r57-0041), version 2

Version 2, 2026-11-20: the blind review `research-tree/build/refute/ROUTER.md` ("CORRECT: 11 findings") folded in as the
top session decided each finding (r57-0021; brief `research-tree/build/briefs/ROUTER-fold.md`), by a helper of top
session 4 (kind analyse, Opus). Version 1 is kept byte for byte in `ROUTER-v1.md` (the review cites its lines); it was
written by two helpers of top session 4 from `briefs/ROUTER.md` and `briefs/ROUTER-2.md`. "Finding n" = the review's
finding n; "decision n" = the brief's. Design only: nothing built, installed or started. Marks: [m] measured (path), [r]
read (path:line), [c] computed (formula shown), [e] estimate. Tokens = input + cache creation + cache read + output, once
per message id (rule of `tools/tokens-self.mjs`), unless a line says "fresh" (input + cache creation + output, no cache
reads). Scripts (read only, no model), in the scratchpad
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/`:
`router/` (`ivals.mjs`, `scan.mjs`, `fit.mjs`, `dup.mjs`, `ops.mjs`) and `router-2/` (`readings.mjs` the meter readings,
`meter.mjs` and `meter1.mjs` tokens by model and field once per message id across files, `fit2.mjs`, `mc.mjs`, `fit3.mjs`,
`jack.mjs` the meter fits, `ops2.mjs` operations in fresh tokens and result sizes, `save.mjs` and `save2.mjs` version 1's
section 6); the review's `router-refute/` (`scan.mjs` 649 transcripts and 132 readings, `fit.mjs` and `fable.mjs` the
meter fits with an hours term, `counts2.mjs` the count lever split); and `router-fold/save3.mjs` (output `save3.txt`):
the weight vectors and section 6 of this version. One build, one week, one repository: a basis, not a law.

## 0. The answer

1. Worth it, but small: on path e2 it saves 13-49 M of 986 M tokens and 0.7-2.7 of its 13-17 all-models points.
2. On the plan: 19-35 M of 418 M tokens and 0.8-2.2 of its 8-9.5 points. On the Fable meter: from -0.3 to 5 points.
3. These are ranges: the meter's weight per model is measured only within ranges (132 readings, one week).
4. The method is the provider's documented pattern, not one of ours: one model for a session, helpers on cheaper models.
5. A step's effort is lowered before the step moves to a cheaper model. Published routers do not fit here (section 3).
6. A step gets its own model as a helper or a script. A session cannot switch its own model: the app refuses it.
7. Measured: the meter counts fresh tokens (new input, cache writes, output); a cached re-read costs about 1 % of one.
8. Range: per fresh token Sonnet weighs 0.15-0.5 of Opus, Haiku 0.15-0.8 (a fortieth by price), Fable 2.7-5.6 times.
9. Largest lever: a waiting Fable coordinator wakes at least hourly and keeps its cache: 0.5-1.9 of e2's points.
10. Next: quiet scripts (one line printed, the rest to a file); no separate token-count or meter calls.
11. The efforts in section 4 take effect only once written into CLAUDE.md or a skill; nothing is written now.
12. Not known: Haiku's weight, and pass rates by model and effort on our steps; each test needs his word.

## 1. The operations and their share of tokens

**By operation, from transcripts [m: `ops.mjs`; each call's context + output, assigned to the first tool it calls].**
A call's tokens are mostly the re-read of its window, so a share is "calls of this kind x the window they re-read".

| Who (tokens, calls) | Shares |
|---|---|
| Build roots, 3 Opus coordinators (155.3 M, 621 calls; transcripts 8a7db643, 0be12bcd, 873082b7) | no tool (reports, decisions, ending a turn) 21 %; other tools (todo, tool search, pages) 15 %; Write/Edit (STATE.md, briefs, records) 13 %; lane, suites, landing 10 %; shell reads 9 %; helper starts with briefs 9 %; git 7 %; other shell 6 %; token counts and usage-line appends 4 % and get_usage 3 % (42 calls: 18 get_usage, 5 token counts, 19 usage-line appends, which are state writes; review, "checked"); Read 2 %; waits 1 %; SendMessage 1 %. Calls right after a helper's notice: 31, 6 % (my flag finds only the notices with the word task-notification) |
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

cf83865e had 6 gaps over an hour between calls and rewrote 1.00 M of its window after them, 29 % of its fresh tokens
[m: the review's count; 22 % by `ops2.mjs`'s per-call count]; build root 8a7db643 had none.

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

**All-models meter** [m: `fit3.mjs`, and the review's `fit.mjs` on its own token set: reading = constant + weights x
tokens to the reading's minute, least squares, no weight below 0; rounding alone gives 0.29 points]:

| Weighting | RMSE, points | Fit on one half, error on the other (to 11-18 12:00 / after) |
|---|---|---|
| all four fields equal, models equal (**H-raw**, the plan's basis) | 2.12 (constant 5.9) | 5.00 / 7.05 |
| the provider's prices in full (**H-price**), a main session's cache writes at the one-hour rate (finding 6) | 1.79 (review; 1.93 with every write at the five-minute rate on its token set, 1.89 on version 1's) | 2.58 / 6.80 (five-minute writes) |
| the prices' shape across fields, models equal | 1.48 | 4.25 / 4.66 |
| cache reads + fresh, models equal (**H-fresh**): 0.0033 and 0.472 points per M | 1.00 | 4.78 / 2.76 |
| cache reads + fresh at price ratios (Fable 2, Opus 1, Sonnet 0.5, Haiku 0.025) | 0.94 | 3.62 / 2.13 |
| cache reads + Fable's fresh + the others' fresh | 0.72 | 0.86 / 2.76 |
| cache reads + fresh per model, free (**H-fit**) | **0.60** | 2.21 / 1.48 |
| H-fit + an hours term for outside load (finding 5) | **0.53** (0.071 points an hour) | - |

**H-fit [m]:** per M fresh: Fable 1.48, Opus 0.43, Sonnet 0.16, Haiku 0.35 points; per M cache read 0.0046 (the review's
token set; version 1's 1.46, 0.43, 0.15, 0.35, 0.0047). With the hours term (r57-0170: the owner's own sessions about
0.10 points an hour): Fable 1.58, Opus 0.39, Sonnet 0.11, Haiku 0.17, cache read 0.0041, 0.071 points an hour.
**The weights are ranges** [c: `save3.mjs`: both forms, each whole and with one day of readings left out, 12 weight
vectors]: to Opus, Fable 2.7-5.6, Sonnet 0.15-0.51, Haiku 0.15-0.82 (a fortieth by price), a cache read 0.1-3.3 % of an
Opus fresh token (1.0-1.1 % in both whole fits). So a point is 1.8-3.5 M Opus fresh, 0.6-0.7 M Fable fresh, 5-19 M
Sonnet fresh, or 110 M cache reads and more. Haiku is the weak one: 9.1 M of fresh in all, mostly in one stretch on
11-17 and 11-18; its weight moves most with the hours term, and nothing else here can check it.
**What ten readings could and could not settle [m: `fit2.mjs`, `mc.mjs` on the ten intervals, tokens once per id].**
They could show the meter follows fresh tokens (fresh fits 1.05, all fields equal 1.50). They could not give a weight per
model: a free weight per model fitted 0.72 but failed on each left-out interval (leave-one-out 2.01 against 1.09);
Sonnet's and Haiku's tokens fell in the same intervals. They pointed the wrong way on price ratios (equal weights
fitted better; a simulation with price ratios true gave that in 7 % of draws), and an outside load of 0.12 points an
hour would have made the two fit alike. With 132 readings the price ratios fit better than equal weights, and the free
weights hold their order when any one day is left out (above).
**Fable meter [m: the review's `fable.mjs`, the same 132 readings]: its weights are not separated.** Fresh Fable tokens
alone fit with RMSE 1.65 (4.18 Fable points per M fresh, cache reads 0) but leave mean residuals by day of -1.8 (11-17),
-1.5 (11-18) and +1.5 (11-20). With an hours term: RMSE 0.90, fresh 0.74 per M, cache reads 0.062 per M, 0.15 an hour;
cache reads and hours alone: RMSE 0.91, cache reads 0.077 per M, fresh 0. So fresh weighs 0-4.2 Fable points per M and
a cache read 0-0.08; section 6 gives the Fable meter as the range over these three forms. All four fields equal fit
worst (2.42).
**Cache lifetime [m: the usage fields of three transcripts; the review: all writes since the reset]:** a main session
writes its cache for one hour (this top session: 174 writes, all one-hour; cf83865e: 1,772; all main sessions 17.1 M), a
helper for five minutes (a round 3 helper: 74, all five-minute; all helpers 99.4 M). A session idle past an hour, or a
helper past five minutes, rewrites its whole window as fresh tokens at its next call.

Savings below are given on three scales: tokens (H-raw's 62 M a point is the plan's basis; the readings fit it worst);
the all-models meter, as the range over the 12 weight vectors; and the Fable meter, as the range over its three forms.
**H-price** [r: G-models.md; skill `shared/prompt-caching.md`:144]: per M, Fable 8 / 10 / 16 / 0.20 / 40 (input,
5-minute write, one-hour write, read, output), Opus 4 / 5 / 8 / 0.20 / 20, Sonnet 2 / 2.5 / 4 / 0.10 / 10, Haiku 0.10 /
0.125 / 0.20 / 0.01 / 0.50 up to 100 K of prompt and 5 times that above [r: skill SKILL.md, Current Models]; main
sessions write at the one-hour rate, helpers at the five-minute one. By the weights [c: `save3.mjs`: each role's tokens x
its group's fresh and cache-read shares (section 1) x each vector] the plan is **8.0-9.5 points** with its coordinator
at cf83865e's shares, the like-for-like case (finding 8; 7.0-8.5 at the build roots' shares), against 6.7 at 62 M a
point, and **7.1-8.8 Fable points** (6.3-7.2); path e2 is **13.4-17.3 points** against 15.9, and 0.45-0.56 Fable points.

## 3. The mechanisms and their break-evens

**The borrowed form (r57-0040; finding 1, decision 1).** The provider's own documented pattern, taken whole: keep a
session's main loop on one model and give a sub-task to a helper on a cheaper model [r: skill `shared/prompt-caching.md`:238,
"Keep the main loop on one model and spawn a subagent for cheaper sub-tasks"; `shared/agent-design.md`:94; `shared/
cost-optimization.md`:140 and :217: a helper for a self-contained bulky step, not where the deciding model needs its
intermediate context]; and lower the capable model's effort before moving a step to a cheaper model [r:
`shared/cost-optimization.md`:160, "Sweep effort before touching the model", and :180, model choice after every lever
that does not cap intelligence; skill SKILL.md, Thinking & Effort, "Choosing an effort level": before a multi-model
cascade, measure the most capable model at lower effort, since caches are model-scoped and a cascade forfeits cache
reuse]. The provider's own research system has this shape: an Opus lead with Sonnet subagents (x48-0325, self-reported).
Rows (a) to (c) below are its parts; the order "lower effort first, then a cheaper model" governs rows 10 to 13 and 18
of section 4. **Why the published routers and cascades do not fit here.** They route single queries, not steps inside
one cached agent window, and they learn or tune a router on labelled quality data that we do not have. RouteLLM
(a1-0332) routes between two models with routers learned from preference data; its routers trained on chat data alone
were at the random level on MMLU. Hybrid LLM (a1-0333): with a large quality gap its three routers lost 13.8, 13.1 and
10.3 % at 40 % of queries routed. Both count the saving in calls or queries, not tokens. AutoMix (a1-0331, x48-0312,
x48-0314) is a cascade: the small model answers and checks itself, the large one is called when the check fails, with
cost a fixed unit ratio per query (1 against 60 to 200), not tokens; here an escalation would re-send a whole window to
a model whose cache is cold. BATS (a1-0334, x48-0318) budgets tool calls inside one agent, not models, because a token
budget for multi-step agent tasks is often impractical to set. The published form of a model choice under a window's
price is bandits with knapsacks (a1-0405): untested, and it needs pass rates, window usage and redo costs by kind of
work and model, none of which is measured here (section 8). Figures are as the records quote them; a1-0332 and a1-0333
were read through a collector's quotation of the papers (their notes).

Symbols: W the parent's window at the step; n the parent's calls after it; c the step's calls inline; a what the step
adds to the parent's window inline (results and outputs); F a helper's context at call 1, 59 K [m: hc1-0104]; f the
fresh part of F (start loads are 5-28 % of a helper's fresh tokens, section 1); h, g a helper's calls and growth a call
(2.0-7.5 K, E 1b); b brief; r return; w(cr), w(f) a model's weight per cached and per fresh token.

| Mechanism | Cost and limits | Ran here | Break-even [c] |
|---|---|---|---|
| (a) helper on another model (Agent `model`; `effort` only where the owner, CLAUDE.md or a skill asks, section 7) | Inline I = wP(f) a + wP(cr) (c W + n a). Helper H = wH(f) (f F + a_h) + wH(cr) (h F + g h^2/2) + wP(f) (b + r) + wP(cr) (2 W + n (b + r)) | yes, every build and round (r57-0166 to r57-0173) | pays if H < I. Example W 150 K, n 30, a 30 K, c 3, h 8, g 3 K, b 1 K, r 2 K, f = 1, in Opus-fresh units: H-raw, equal models: I 1,380 K, H 1,050 K (pays); H-fit (whole fit), Opus parent: I 45 K; a Sonnet helper 46 K (even), a Haiku helper 85 K, an Opus helper 103 K (neither pays); with Sonnet at 0.15-0.5 of Opus the Sonnet helper runs from cheaper to dearer than inline (not recomputed per vector); H-price, Opus parent: Haiku helper 3.6 times cheaper, Sonnet about even, and with the parent's writes at the one-hour rate (finding 6) the inline side costs more, so the helpers gain a little (not recomputed). Rule: under H-raw a step pays as a helper when n a exceeds about the helper's own run plus 2 W (here a > about 30 K); under H-fit only on a cheaper model and when a exceeds about 30 K (Sonnet) |
| (b) script, no model | the call that runs it (W re-read) plus its printed output re-read n times | yes (lane, land, status, tokens-self) | always below a helper for a step without judgment: the helper also costs a parent call; print one summary line, the rest to a file |
| (c) switch a running session's model or effort (set_session_model, set_session_effort, /model) | caches are model-scoped: a model switch rebuilds the whole window [r: skill `shared/prompt-caching.md`:97, :219, :238]; a top-level effort change invalidates the messages cache; the provider's per-message effort form avoids it on these four models (beta, :226-232). **A session cannot switch itself** [r: the two tools' own text, loaded with ToolSearch, neither called; finding 2, decision 4]: "Refused for this session: a session must not silently re-price its own turns". A parent switches a child session it started, from the child's next turn: no prompt for its own model or a cheaper family (effort at or below its own), otherwise the app asks him; the child's window is then rebuilt | never | a stretch of s calls pays if s (wOld - wNew) x per-call cost > W (wNew(f) + wOld(f)) for the switch and back: H-raw Opus to Sonnet s > about 3; H-price s > about 78 (49 with the rewrite at the five-minute rate; a main session's is at the one-hour rate, finding 6) [c: 49 x 2 / 1.25]; H-fit s > about 90. So never for a coordinator's window under H-fit or H-price |
| (d) a workflow, a model per step | a script runs the steps, no parent wake per step; judgment points return to the parent; needs his explicit words; resume is positional (memory note); the tier hook is not shown to see its agents (ORCHESTRATION.md s2) | in the product folder (tcb-build, 2026-11-16, ORCHESTRATION.md:74-75); not here | saves the parent's wakes and a helper orchestrator's polls: H-raw a wake costs its window (0.13-0.24 M); H-fit 1-2 K Opus-fresh a wake |
| (e) fewer or shorter turns of the dear model; keep the cache | fold usage and counts into calls already made (parallel tool calls; the lane prints the count); returns of at most 2 K with details in files; wake only on a notice or a timer (t1-0403); hand over at the measured W* 247-273 K, not 133 K (r57-0171); a waiting session's timer shorter than its cache lifetime (under an hour for a session, under five minutes for a helper) | partly (wake timer, files; helpers' polls of at most 150 s) | the folds and returns always pay under H-raw and H-fit; a folded get_usage still writes its result into the window (finding 7). The timer: over the 12 weight vectors a call that keeps a 200 K window costs 0.0001-0.002 point, a rewrite 0.06-0.11 (Opus) to 0.28-0.32 (Fable); on the Fable meter a Fable rewrite 0-0.84 Fable point; under H-raw the two cost the same |
| (f) an agent definition's model and effort | the caller's value wins (r57-0108, documented, never tried); a fork inherits its parent's model | never | only a default where a caller names none; the tier hook already requires an explicit model |

## 4. The router

One row per operation. "Inline" = the session's own model and call. Condition: the break-even of section 3. Routes:
`.claude/hooks/tier-routes.json` (locate and extract Haiku; read, collect, run and build Sonnet; build-invariant,
analyse, refute and orchestrate Opus; orchestrate-deep Fable; test Haiku or Sonnet). No row breaks them or r57-0206
without saying so. The efforts take effect only once written (section 7).

| # | Operation | Share [m] | Model, effort | Mechanism | Condition | Mark | Missing measurement |
|---|---|---|---|---|---|---|---|
| 1 | Coordinator: read a helper's return, decide | no-tool turns 21 % of roots (6 % fresh) | the session's model (Opus orchestrate; Fable only for orchestrate-deep, r57-0035); effort high | inline; returns at most 2 K, details in files | always inline: the decision needs the window | [r] rule; [e] effort | coordinator quality at medium against high |
| 2 | Write a brief and start a helper | 9 % (11 % fresh) | inline | brief points at files; fixed parts from a template | - | [m] | - |
| 3 | Write state (STATE.md, usage line, landing lines) | with records 13 % (16 % fresh) | no model for counts, readings and landings; one judgment line inline | script (b) | always | [m] share | the script, not built |
| 4 | Read the meter; count own tokens | 7 % roots (8 % fresh); 7-8 % builders and refuters (4-6 % fresh; 265 calls) | no model | get_usage in the same call as the next action (its result still enters the window, finding 7); the lane prints the caller's count with each result | always: their results (get_usage 1.6-6.8 K characters) are re-read at every later call | [m] | - |
| 5 | Wait, poll | 1-2 % | none | notices wake a session; a background timer as a safety wake, shorter than the cache lifetime (under an hour; a helper's polls under five minutes); no helper orchestrator that must poll (r57-0418) | timer: on the all-models meter always; on the Fable meter from a small cost to 5 points (section 6) | [m] lifetimes | the app's lifetime on long helpers |
| 6 | Hand over | orientation 2.33 M each (r57-0171) | successor on the same model | at W* 247-273 K | - | [m] | W* on Fable |
| 7 | Run scripts: lane, suites, landing, git | 23 % roots; tests 9-15 % of builders and refuters | no model beyond the issuing call | quiet output to a file, one line printed | a `run` helper only when the output needs judgment and a passes section 3: Sonnet (the routes' run kind is Sonnet only); a pass or fail read with no judgment is a Haiku `extract` into a fixed schema (r57-0206: Haiku never for inference) | [m] shares and sizes; [c] | - |
| 8 | Read a few files | 11 % roots; 58 % builders (64 % fresh) | inline, ranges and grep, not whole files | e | a helper only past section 3's break-even | [m] | which part of a read was needed |
| 9 | Locate (where is X) | - | script (grep, `lookup.sh`); Haiku when the target is not a name (the routes' locate kind), effort low | b, else a | - | [r] routes; effort [e]; r57-0208 lists Haiku extractors with a closed schema, not location, and the Haiku explorer never ran (r57-0210) | Haiku against a script on location |
| 10 | Extract one file into a fixed schema | 0.83 M a helper; 13 % of it fresh | Haiku (the routes' extract kind), low for literal, medium when names vary; under 100 K of prompt (Haiku's price step; extractors peaked at 123 K, E 1b) | helper, several files per helper | the order (decision 1): Sonnet at low effort is the alternative measured before either is fixed; on the meter Sonnet costs a third of Haiku to about the same in 11 of the 12 weight vectors (one puts Haiku at a third of Sonnet); by price Haiku is a twentieth of Sonnet. A Sonnet extractor would break the routes: the test runs as kind test | [m] r57-0208; effort [e], never run (r57-0207, r57-0210) | Haiku's meter weight; Haiku against Sonnet low on 10 files |
| 11 | Read across files: maps, cross-references, citation checks | 1.79 M | Sonnet medium; high for cross-references | helper | the order: effort lowered before any cheaper model; Haiku barred across files (r57-0206) | model [m] r57-0208; effort [e] | Sonnet effort never compared |
| 12 | Collect and quote sources | 3.20 M | Sonnet medium | helpers at once | as row 11 | model [m] round 3: 151 sampled, none failed (r57-0140); effort [e] | Sonnet effort never compared |
| 13 | Ordinary code: tests, pages, scripts without invariants | 5.5 M (S2.1) | Sonnet medium | helper | the order: low only after a test shows the same output; Haiku barred (inference, r57-0206) | model [m] one unit; effort [r] skill (Sonnet 5.5: start at medium for agentic coding) | Sonnet medium against high |
| 14 | Invariant-sensitive code | 32.3 M a unit | Opus high | helper (builder) | - | [m] 16 units (r57-0173); effort not recorded | - |
| 15 | Run tests | 4-10 % of builder time | no model beyond the builder's call | b, quiet | - | [m] r57-0173 | - |
| 16 | Analysis, design | 8.05 M | Opus high; xhigh only where measured to gain | helper | - | [m] r57-0207 (no record that xhigh beat high) | - |
| 17 | Refutation | 10.6 M | Opus high, fresh context; xhigh for a claim that would stop the work | helper | - | [m] r57-0208 | Opus medium against high on seeded findings |
| 18 | Fold a decided review | 3.0 M | Opus medium (the decisions are made) | helper | the order: Opus medium first; Sonnet only after a test shows the same output, and it would break the routes (a fold is kind analyse, Opus only) | [e]; the effort cut is a quality risk not measured (finding 10) | Opus medium against high, then Sonnet against Opus, on 3 folds |
| 19 | Build a page | 1-2 M | Sonnet medium | helper | - | model [m] pages so built; effort [e] | Sonnet effort never compared |
| 20 | Records and commits | git 6-7 % | the record's claims inline; commit and check by script | b | - | [r] | - |

**Sessions of the research run.** Each starts on one model and never switches; it cannot switch itself (row (c)).
**Path e2** (COMPLEXITY.md version 2, chosen): the coordinator on Fable throughout (orchestrate-deep: its helpers have
helpers, r57-0035), effort high; it starts the problem sheet and the planted copy (Opus analyse, high), seven field
helpers (Opus orchestrate, high) and the closing helper (Opus, high), and reads ten-line returns: 23-32 calls ending at
153-243 K, under its hand-over point, so it never hands over (COMPLEXITY s2). Between returns it waits up to two hours
(fields of 1.2-2.0 h, three at once): a timer under an hour keeps its cache (row 5). Each field helper runs Sonnet
readers (medium), the Opus report writer (high; R_same in its window), the Sonnet gate and checker (medium), the fresh
Opus refuter (high), the Sonnet blind scorer (medium), the Opus fold (medium) and Haiku extraction (low or medium); its
polls of at most 150 s also keep its five-minute cache. The top session Opus high. The Fable coordinator's 6.0 M
(4.1-8.9) is 0.13-0.18 point of the all-models meter more than an Opus one, and 0.45-0.56 Fable point (0.3-0.8 over
4.1-8.9 M) [c: `save3.mjs`: 2.2 % of its tokens fresh, cf83865e's share, x the 12 vectors and the Fable meter's three
forms], against COMPLEXITY's 0.5-1.9 Fable points at 5.7 M a point. **The plan** (PILOT-PLAN.md version 2): coordinator
Fable, orchestrate-deep, since T's readers give its children children (r57-0035), effort high (the provider's default for
Fable); top session Opus high; T, S1, S2 Opus high; R1, R2 Opus high; STPA, FMEA, mapper Opus high; readers, checkers,
scorer Sonnet medium; control, canary, P3.1 Haiku; P3.2 a script; the run root's set-up by the top session's own
commands. Its 94.3 M on Fable is 1.5-2.8 points of the all-models meter more than on Opus (2.0-2.8 at cf83865e's shares,
the like-for-like case; 1.5-2.0 at the build roots') and 6.3-8.8 Fable points (7.1-8.8) [c: `save3.mjs`]. Both are a
ruling's consequence, not the router's choice. All efforts above apply only once written (section 7).

## 5. Against the documents

- **Routes in force** (`.claude/hooks/tier-routes.json`, version 1): the kinds and models agree with rows 7 and 9-19
  (row 7 now Sonnet, finding 9; the order's tests in rows 10 and 18 would break them and run as kind test). They lack
  effort, the operations inside a session, scripts as a route, the break-even, Haiku's 100 K step, return size, the
  cache lifetime of a waiting session.
- **The plan's assignments against `docs/ORCHESTRATION-DESIGN-2026-10.md` s3** (with r57-0201, r57-0206 to r57-0210):
  accurate on models: Fable only as the main session (s3 row Fable), Opus for analysis and fresh-context refutation,
  Sonnet for reading and collecting, Haiku for extraction and location, no Sonnet on invariant code. Absent from the
  plan: the design's effort levels and its "tiny tasks are inline commands, claims batched per verifier".
- **Is the document good enough? No.** It routes per agent, not per operation; its fixed overhead (7.5 K) is 8 times
  below the measured 60 K (r57-0201), so its inline threshold is wrong by that factor; its Haiku and Sonnet effort levels
  and "raise effort before tier" never ran, and Opus high and xhigh ran once (r57-0207, r57-0210; finding 11); it has no
  break-even and no meter weights; it was written for the product (r57-0206 note); 25 of its 48 rules never ran. What
  carries over (r57-0208): the tier ladder (14 rules ran and worked), schema-bound extraction, fresh-context refuters,
  claims batched per verifier. Judgment-free discovery is designed only (r57-0210).
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

Against the routes in force [c: `save3.mjs`, output `save3.txt`]. Each lever's tokens, its points on the all-models
meter (min-max over the 12 weight vectors of section 2) and on the Fable meter (min-max over its three forms; only Fable
tokens count there); every input that is a range is swept with them. H-raw points = tokens / 62 M. The plan's
coordinator is taken at cf83865e's shares, the like-for-like case (decision 2, finding 8), and at the build roots'
shares; a cell gives both ends. The plan 417.8 M (8.0-9.5 points as cf83865e, 7.0-8.5 as the roots; 6.3-8.8 Fable
points); path e2 986 M (13.4-17.3; 0.45-0.56 Fable points).

| Lever | Plan: M tokens | Plan: all-models points | Plan: Fable points | e2: M tokens | e2: all-models points | e2: Fable points | Mark |
|---|---|---|---|---|---|---|---|
| Counts and meter readings folded into calls already made (rows 3, 4) | 13.6-22.3 | 0.12-0.41 | 0.06-0.72 | 4.2-8.4 | 0.03-0.11 | 0.00-0.01 | [c] from [m]: a folded get_usage keeps its result in the window (finding 7): the roots' rate 7-10 %, not 11.3 %; a group whose count calls are all get_usage at 0.38-0.78 of version 1's lever (the review's split: the call 4.25 M, its result's re-reads 2.43, its output's 4.54); counts printed by the lane, whole. Plan: low ends as cf83865e, high ends as the roots |
| Quiet scripts: tests, lane, landing, git, waits; output over 2 K tokens cut to 0.2 K, the rest to a file (rows 7, 15) | 6.5-7.2 | 0.08-0.12 | 0.01-0.07 | 11.2 | 0.13-0.17 | 0.00 | [c] from [m] sizes; [e] the cut part is not read again |
| The same, other shell commands too (readers' fetches and source reads left out) | 18.4-18.7 | 0.23-0.32 | 0.10-0.15 | 41.2 | 0.53-0.70 | 0.01 | [c]; an upper bound |
| Helper returns at most 2 K (row 1) | 0-0.2 | 0.00-0.01 | 0.00-0.01 | 0.1 | 0.00 | 0.00 | [m]: already met |
| P3.2 and the run root as scripts (rows 9, 7) | about 1.2 | 0.01-0.02 | 0 | - | - | - | [c] |
| A waiting coordinator keeps its cache: a timer under an hour (rows 5, (e)) | -0.5 to -2.0 (the wakes' reads) | **0.63-1.58** | -0.23 to 4.13 | -0.4 to -2.4 | **0.50-1.92** | -0.28 to 5.02 | [c]: plan as cf83865e: its rewrites after gaps over an hour, 0.47 M (0.76 M scaled to 94.3 of its 153.2 M) to 1.00 M (as counted); 0 at the roots' shape, if no wait passes an hour; e2: 3-5 waits over an hour (three waves of fields, the closing helper) x 124-243 K [e]; 1-2 wakes a wait, each reading the window, and the next call reading it instead of rewriting it; the Fable meter's low end is its cache-read form, where the wakes cost and the rewrite saves nothing |
| Polls removed by a workflow per field (d), with his words | - | - | - | 30-59 | 0.09-0.60 | 0 | [c from e]: COMPLEXITY s2's 232-370 polls at 130-160 K |
| Ranged reads (row 8) | not computed | - | - | not computed | - | - | Read results 5-45 K characters (median); reads carry 24-64 % of fresh in builders, refuters, analysts |
| Model switches (c), effort changes | 0 | 0 | 0 | 0 | 0 | 0 | [c] section 3 |
| Not the router's: the coordinator on Fable rather than Opus (r57-0035) | 0 | +1.5 to +2.8 | 6.3-8.8 | 0 | +0.13 to +0.18 | 0.45-0.56 | [c] section 4 |

**Totals of what is computed** [c: sums of the rows' ends, a little wider than any one weight vector gives]. **The plan**,
its coordinator as cf83865e: **19-35 M tokens** (4.6-8.4 %; 0.31-0.56 H-raw points), **0.8-2.2 all-models points** (of
8.0-9.5), -0.2 to 4.5 Fable points (of 7.1-8.8); at the roots' shape, with no wait over an hour and so no timer lever,
27-42 M and 0.3-0.7 points. **Path e2**: **13-49 M tokens** (1.3-5.0 %; 0.21-0.80 H-raw points), **0.7-2.7 all-models
points** (of 13.4-17.3), -0.3 to 5.0 Fable points, most of it the coordinator's cache; its 13.4-17.3 take the coordinator
at cf83865e's fresh share, and without the timer its rewrites add the timer row's 0.5-1.9 points to them. With a
workflow per field, 30-59 M and 0.1-0.6 point more. If e2's briefs give every Opus helper a token counter every 10 calls
as the build's did (round 3's helpers ran none), they add about 35 M [c from e: 7.5 % of e2's 472 M of Opus helpers
besides the field helpers] and 0.26-0.45 point [c: at the builders' count-lever fresh share, 1.3 %, x the 12 vectors],
unless the count is printed by calls already made (row 4). Under H-price the order is the same; Haiku helpers then pay
where the meter's weights leave it open (row 10).

## 7. Enforcement (r57-0011)

- **Effort needs written instructions** (finding 3, decision 5). The Agent tool sets a helper's effort only when the
  owner, CLAUDE.md or a skill asks for it [r: its own parameter text: set it "ONLY when the user, or instructions such as
  CLAUDE.md or a skill, explicitly ask"; otherwise the helper runs at its usual effort]. So the efforts of section 4
  apply only once written into one of them; nothing is written now.
- **Tier hook** (r57-0120): add operation kinds (locate by script, fold, page) and an effort per kind; the hook sees an
  Agent call's `effort` only when one is passed [r: the tool's schema; r57-0106 saw the model "only when passed", effort
  never observed]. It cannot see what a session does in its own turns (rows 1-8), a return's size, whether a step had
  judgment, a session's idle time, or a switch made through the app's controls.
- **The app**: it refuses a session's switch of its own model or effort; a parent's switch of a child passes its gate
  (row (c)).
- **Scripts**: the lane prints the caller's token count and quiets output (rows 4, 7, 15); the plan gate's done-file
  check refuses a return over its size (row 1); a coordinator's brief sets its safety timer under the cache lifetime
  (row 5).
- **Audit**: `ops2.mjs` over each run's transcripts: separate count calls, returns over 2 K, helpers under the
  break-even, rebuilds after idle; `readings.mjs`, `fit3.mjs` and the review's `fit.mjs` and `fable.mjs` refit the meters
  after each run.

## 8. Not known, and what measures it

- Haiku's weight on the all-models meter (0.15-0.8 of Opus over the 12 weight vectors, a fortieth by price; it decides
  row 10): one stretch of about 7.6 M Haiku fresh tokens with no other model running, about 3 points if the whole fit
  holds and 0.1 if the price does [c: `mc.mjs`, three times the noise]; or free, if a later run has such stretches: the
  readings are logged by every get_usage call, and the fits are rerun on them.
- Fable's ratio within 2.7-5.6 of Opus and Sonnet's within 0.15-0.5: more readings of the same kind (free). The Fable
  meter's split between fresh and cached Fable tokens (fresh 0-4.2 per M): readings across stretches where a Fable
  session writes much and where it only re-reads (free).
- Pass rates by model and effort on our operations (a1-0507), in the order of section 3: Sonnet low against Haiku on 10
  extractions; Opus medium against high, then Sonnet against Opus, on 3 folds; Opus medium against high on 3 refutations
  with seeded findings; Sonnet medium against high on reads and ordinary code; each needs his word (r57-0506).
- The plan's longest waits, which decide its timer lever (finding 8): the pilot's own transcript.
- Whether a helper waiting on its own helpers longer than five minutes rewrites its window (its lifetime here was five
  minutes; the polls keep it): the first field of e2 shows it.
- The effort each past helper ran at: no record.
- Known since version 1, no longer open: a session cannot change its own model or effort (the app refuses it; row (c));
  the probe is dropped (r57-0004).

## Changes from version 1

The brief's "findings 2 to 5" are the review's findings 4, 5, 7 and 8, and its "finding 6" is the review's finding 9;
the lines below use the review's numbers.

- Finding 1 (decision 1): sections 0 and 3 name the borrowed form, the provider's pattern (one model per loop, cheaper
  helpers; lower effort before a cheaper model) at its lines, and say why RouteLLM, Hybrid LLM, AutoMix, BATS and
  bandits with knapsacks do not fit, from a1-0331 to a1-0334, a1-0405 and x48-0312 to x48-0325; the order governs rows
  10 to 13 and 18.
- Finding 2 (decision 4): the two tools' text loaded with ToolSearch, neither called: a session cannot switch itself;
  row (c), sections 7 and 8 say so and the probe is dropped.
- Finding 3 (decision 5): row (a) and section 7: effort reaches a helper only when the owner, CLAUDE.md or a skill asks;
  the hook sees it only when passed; nothing is written now.
- Finding 4: the Fable meter is three forms, not one; section 2 gives its weights as ranges and section 6 a Fable
  column for every lever (the timer -0.28 to 5.02 on e2, not 1.6-5.1).
- Finding 5: an hours term added to the all-models fit (RMSE 0.53); the weights are the 12 vectors' ranges (Fable
  2.7-5.6, Sonnet 0.15-0.51, Haiku 0.15-0.82 to Opus); section 0 item 8 and row 10's condition changed.
- Finding 6: H-price takes a main session's writes at the one-hour rate (2x); its RMSE 1.79; row (c)'s H-price
  break-even s > about 78, not 49; row (a) notes the direction.
- Finding 7: the count lever no longer counts the re-reads a folded get_usage keeps: plan 13.6-22.3 M, not 23.8 M;
  e2 4.2-8.4 M, not 10.7 M; row 4 says the result stays.
- Finding 8: the plan's coordinator taken at cf83865e's shares: baseline 8.0-9.5 points, not 7.9; its timer lever
  0.63-1.58 points, not "not computed"; section 1 states cf83865e's gaps.
- Finding 9 (decision 3): row 7: Sonnet for a run helper that needs judgment, Haiku only as an extract into a fixed
  pass or fail schema; section 4 states the routes and that no row breaks them or r57-0206 unsaid.
- Finding 10: marks of rows 9, 11, 12, 18 and 19: model [m] where measured, effort [e]; Sonnet effort never compared;
  the fold's effort cut a quality risk not measured.
- Finding 11: section 5: Haiku and Sonnet efforts and "raise effort before tier" never ran, Opus high and xhigh ran
  once; judgment-free discovery taken out of what carries over.
- Decision 2: every saving is a range on both meters, with tokens: section 6 rebuilt (`save3.mjs`), section 2's totals
  and section 0 rewritten from it (plan 19-35 M and 0.8-2.2 points; e2 13-49 M and 0.7-2.7 points).
- The review's "checked" note: section 1's label of the roots' count calls now names the 19 usage-line appends.
