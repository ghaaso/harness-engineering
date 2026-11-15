# Independent check of the pathway engine

Written 2026-11-12 by a session that did not write the engine. The specification is `model-brief.md`. I assumed the engine had mistakes until shown otherwise.

**Verdict: sound after fixes.** The engine computes what the brief says, in every case I tested. It could not read the real parameter table at all, and it drew the time horizon as if it were an unknown. Both are fixed. The brief leaves some readings open; the map picked one each time. They are listed in section 5 with their size, and none was changed.

How to re-run, from this folder:

- `node - < verify-engine.js.txt` (31 checks, about 40 seconds). It writes `verify-engine-out.json` and its console output is kept in `verify-engine-console.txt`.
- `node - < engine-test.js.txt` (the original 19 tests plus 3 new ones, all pass).

`verify-engine.js.txt` holds my own model of the brief. I wrote it from sections 4 to 8 of the brief. It does not read `map.json` or the engine's code. The engine is called only to compare.

## What I changed

All in `docs/program/library-pathways/engine.js`. `map.json` is unchanged.

1. **The engine could not read `params.json`.** The table holds its rows as a list, each with an `id`. The engine expected an object keyed by id. `paramsFromTable` returned keys "0", "1", ...; `drawParams`, `swings` and `ensemble` all stopped with an error. Added `tableRows()`, which accepts either shape, and used it in all four places. It is also exported.
2. **The horizon was drawn as an unknown.** `periods` is marked `run_setting` in both `map.json` and `params.json`, and the table says it is "not drawn in the ensemble". The engine still drew it uniformly between 6 and 36 and swung it. Now a run setting is held at its best value in every draw and is left out of the swings. A random number is still taken for its row, so the draw stream does not shift. The brief itself does not say this (section 5, item 1).
3. **Seeds 0 and 1 gave the same stream.** The generator replaced seed 0 with 1. Removed that; mulberry32 works with 0. Minor.

Added three tests to `engine-test.js.txt`: the real table is read by all four functions; a run setting with a range is never drawn or swung; seeds 0 and 1 differ.

## 1. Hand checks

Parameters at the table's best values. Stocks set to 50 good and 20 bad entries, so the bad share (2/7), the coverage and the look-alike chance are all non-zero. My model and the engine agree to at least 13 decimal places in every cell; the table shows six.

| Measure | A | B | C | D | E |
|---|---|---|---|---|---|
| EQUAL | 0.765155 | 0.993539 | 0.725688 | 0.661094 | 1.000000 |
| ESCAPED_FOUND | 0.093391 | 0.003877 | 0.109085 | 0.170432 | 0.000000 |
| ESCAPED_SILENT | 0.062260 | 0.002584 | 0.072724 | 0.113621 | 0.000000 |
| UNRESOLVED | 0.079194 | 0.000000 | 0.092503 | 0.054853 | 0.000000 |
| Expected cost | 51.020384 | 15.529838 | 56.858800 | 37.889529 | 15.000000 |
| cost, cheap | 19.592250 | 10.263055 | 20.989303 | 0.000000 | 10.000000 |
| cost, Opus | 25.316912 | 5.266783 | 28.731259 | 31.223904 | 5.000000 |
| cost, Fable | 6.111221 | 0.000000 | 7.138239 | 6.665625 | 0.000000 |
| calls | 32.045713 | 12.696408 | 35.330456 | 17.833827 | 12.500000 |
| class chance | 0.003722 | 0.093640 | 0.001179 | 0.240000 | 0.280000 |

- A: library; visible, cheap_wrong, exact held, no look-alike. Exercises the exact entry, the screen, delivery, `q_exact`, the full ladder and capture.
- B: library; latent, cheap_ok, nothing held, look-alike. Exercises the look-alike, `a_wrong`, `h_harm`, and Opus after a handoff on a cheap_ok episode.
- C: library; visible, cheap_wrong, composite held, look-alike. Exercises full and part returns, bad entries from the stock, and both composite rows of the L5 table.
- D: top_first; latent, cheap_wrong. No handoff, latent gate.
- E: cheap_ladder; visible, cheap_ok (an extra case).

Case D worked with pencil, as a check on the script itself. Gate catch g = 1 - (1 - 0.25)(1 - 0.5 x 0.65) = 0.49375. Review per gate pass = 0.5 x 5 x 2 = 5. Opus right 0.55. Opus wrong 0.45, caught 0.2221875, Fable right half of that: EQUAL = 0.55 + 0.11109375 = 0.661094. Fable wrong and caught: 0.11109375 x 0.49375 = 0.054853. Escaped: 0.45 x 0.50625 + 0.11109375 x 0.50625 = 0.284054; found 0.6 of that = 0.170432. Cost: Opus 20 + review 5 + Fable 30 x 0.2221875 = 6.665625 + its review 1.110938 + rework 0.170432 x 15 x 2 = 5.112967. Total 37.889529.

Beyond the four cases, the script compared every class of every policy (4 + 4 + 32) on 300 random draws with random stocks: 120,000 numbers, largest relative gap 1.3e-15.

## 2. Conservation

1,000 draws, uniform inside the table's ranges, from my own generator (not the engine's). For each draw, the full 12-period time path, and at every period's stocks:

- every branch chance out of every state lies in 0 to 1 and they sum to 1, for every class of every policy;
- every class's outcome chances sum to 1 (engine, and separately my model);
- the class chances sum to 1 (my formula, and the engine's own attribute shares).

52.8 million sums over 12,000 draw-periods. Largest error 6.7e-16. No draw needed the constraint scaling: the table's highs keep `r_comp_full + r_comp_part` at 1.0 and the three ceilings at 0.92.

## 3. The picture is the model

- Every one of the 75 branches carries flow, and every one of the 37 states is reached, under some policy and period (30 draws).
- `engine.js` names no parameter, state or branch of the model. It names the three policy ids and the horizon `periods`, which it must. Everything else comes from `map.json`.
- Every parameter except the horizon moves some output when nudged. Pure cost parameters never move a chance (the original tests).
- No cost is counted twice. For each policy, three independent totals agree: the graph's flow times branch cost, the route view's carried cost summed over all routes (630 for the library), and my model. Library at the last period's stocks: 27.900009 all three ways.
- Stock equations and time path (section 8): my own recursion gives the same good and bad stocks, library cost, wrong rate and all four ratios at every period, at best values and over 100 random draws (largest relative gap 7e-15).
- Things in `map.json` that the engine does not compute from: `steps`, `entry_kinds`, `groups`, labels, notes, and `tiers[].price`. They are words for the page. The `price` strings ("1", "m_opus", "m_fable") match the multipliers in the branch costs of each tier, which I checked by eye. If the page shows them, it shows true statements.

## 4. The ensemble machinery

- The generator is mulberry32 and is seeded: 1,000 numbers equal a reference written from scratch; the same seed gives an identical ensemble; another seed differs.
- Spearman, worked by hand: [1..5] against [2,1,4,3,5] gives 1 - 6 x 4 / (5 x 24) = 0.8; [1,2,2,3] against [1,3,2,4] (a tie, average ranks) gives 4.5 / sqrt(22.5) = 0.948683; [1..6] against [6,5,4,3,1,2] gives 1 - 6 x 68 / 210 = -0.942857. The engine matches all three.
- The ranking in a 300-draw ensemble equals Spearman recomputed from its kept draws with my own code (gap 0).
- Every drawn value lies in its range; `periods` stays at 12; `m_opus` and `periods` (which do not vary) are left out of the ranking.
- Swings: one row per varying parameter (50). For six parameters I set each to its low and its high with all others at best and ran my own model; the engine's swing values match (gap 1e-14). The base is the all-best path.

## 5. The brief: what is ambiguous, inconsistent or missing

For each open reading, the map's choice and the size of the other reading at best values (last-period ratios, library over top_first; the map's reading gives cost 0.93260 and wrong rate 1.62756).

1. **Is the horizon drawn?** Section 9.5 says "N draws of all parameters"; section 7 lists `periods` as a parameter. The map and table call it a run setting, not drawn. I made the engine follow the map and table. If the owner wants the horizon drawn, that is a one-line change, and "last period" would then mean different dates in different draws.
2. **Opus after a handoff on a cheap_ok episode.** L8 says "right with `o_opus`". The cheap_ok split (right with chance 1) is stated only for top_first. Under the library this route exists only when a wrong entry spoiled work. The map uses 1. With `o_opus` instead: cost 0.93486, wrong 1.63899.
3. **Stored escapes (L11, `z_wrongstore`).** Three gaps. (a) Which escapes: the text says "an escaped output", so the map stores cheap-tier escapes too, though L10 writes only after strong-tier solves. This is the largest stock effect in the model: over a year at best values, 180 of the 221 bad entries that arrive come from stored escapes, and 150 of those from the cheap tier. Storing only Opus and Fable escapes: bad stock 89 instead of 228; cost 0.93070, wrong 1.62421. (b) Whether that write costs anything: section 6 charges `c_write` for "writing an entry", L11 is silent, and the map charges nothing. Charged at its tier: cost 0.94264. (c) Whether it is gated by `w_write`: not said; the map does not gate it.
4. **Staleness order inside a period.** Staleness can act on the stock at the start of the period (the map) or after the period's new entries. Small: cost 0.93266, wrong 1.62770.
5. **Which stocks "the last period" uses.** The engine evaluates each period at its starting stocks; the stocks after the final update are never evaluated. The brief does not say.
6. **What counts as a call.** Section 9.1 asks for the expected number of calls. A lookup, a mechanical check, carrying an entry and a handoff all have costs in cheap-call equivalents, but the map counts them as zero calls. The table's note for `c_lookup` says a lookup "is one extra model call". Costs are unaffected; only the calls figure.
7. **Which tier pays for lookup, screen, carry and handoff.** Costs are given in cheap-call equivalents but not assigned to a tier. The map puts all four on the cheap tier. The table's note for `c_handoff` describes the receiving agent re-reading. Totals are unaffected; only the split by tier.
8. **The retry's gate is not the gate.** A wrong first output is caught with chance g (0.49 for latent work at best values). A wrong retry "is assumed caught again", that is, with chance 1. It is stated, so the model is defined, but the two halves of the same gate disagree, and the retry route can never escape.
9. **Constraints.** The brief states `r_comp_full + r_comp_part <= 1` but not what to do with a draw that breaks it. It does not state that the three ceilings must sum to at most 1, which "P(held = nothing) is the rest" needs. The map adds both and scales a breaking draw down in proportion. Neither binds with the current table.
10. **Period length is not fixed.** `delta_stale` and `episodes_per_period` are per period, so their meaning depends on a length the brief never gives. The table assumes 30 days.
11. **Price ratios per token or per call.** The cost unit is one cheap call, and `m_opus` is called a price ratio. Vendor ratios are per token. They equal the per-call ratio only if calls are the same size in every tier. The brief does not say; the table assumes equal size (see section 6 below).
12. **Does a wrong accepted entry stay in play after L5?** Silent for the retry and for Opus. The map lets it act only at L5.
13. **Does the cheap model's own judgment at the screen cost anything?** Section 6 prices only the mechanical check. The map charges nothing for judging. Probably intended, but not said.

## 6. The parameter table

Mechanical checks on all 52 rows: every map parameter has a row; every best lies inside its range; every chance range lies inside 0 to 1; every row has a tag and a source. No problem found.

I opened the cited source for ten rows: the six tagged M (`u_exact`, `c_check_share`, `c_carry`, `rho_retry`, `w_write`, `e_right`) and four tagged S (`r_exact`, `k_fill`, `q_exact`, `h_harm`), plus `a_wrong` alongside `h_harm`. The sources are in the earlier session's scratchpad (`.../0bf1c4f3-.../scratchpad/lib/`) and `docs/program/`. Each figure quoted in those rows was found in its source, with one misreading (under `k_fill` below).

Tags that are too generous. The table's own rule is that a number that only loosely relates to a parameter is a hint, tagged G.

- `c_carry` (M). D1 marks 0.73 as derived, and one of its three inputs, 260 remaining calls, is an assumption ("half the session"). The low and high ends are also constructed. A derived figure with an assumed factor is not a measurement.
- `rho_retry` (M). The measured 64 % is the share of Clinic reviews that sent a whole slice back, over first and later rounds, with mostly Opus-led fixes. The parameter is the chance one cheap retry on one episode is right. The table's note says as much. By its own rule this is a hint.
- `w_write` (M). R9 ran a crude keyword classifier over 50 fix commits to see whether the design's strict write rule would fire (22 of 50). That counts eligibility under the rule. No entry was ever written, so the chance an entry is written after a strong solve was not measured. The top of the range (1.0) comes from the owner's description.
- `r_exact` (S). KS-O19 gives the share of duplicate bug reports that share no words (5 to 34 %). That is a property of bug-report text, used as a stand-in for a lookup's recall on stored entries. The note says "bug reports, not stored fixes". By the table's rule this is a hint.

Borderline, worth a line in their notes:

- `u_exact` (M). The count (3 to 5 of 48 to 50) is real but its unit is a hard fix commit over 64 days, including the same cause in a different file. The parameter is a per-episode ceiling on the very same problem, over all episodes, latent ones included.
- `c_check_share` (M). Counted over the design's planned seed (3 of about 15 worked examples; about 3 of 116 rows), not over entries written in use.
- `q_exact` (S). The study (one repeated puzzle template) gives 0.99. The best (0.75) and low (0.35) are judgments, so most of the range is not from the study.
- `h_harm` and `a_wrong` (both S). Both cite the same ClashEval figure: models adopted wrong retrieved content over a correct prior more than 60 % of the time. In the map the two act one after the other (accept, then spoil). At best values their product is 0.65 x 0.55 = 0.36, so the one figure is used as support for two steps and the chain does not reproduce it.

Fair as tagged: `e_right` (M; 1 of 5 first lessons wrong and 5 of 8 seed examples with an error, both counted in this repository, small samples), `k_fill` (S; a curve fitted to the plan-caching study, with an assumed ceiling stated in the note). One point in the `k_fill` source line is misread: F4 gives "14.29 % hit rate at the 20th percentile of queries" (a cold-start curve over the query stream), and the table cites it as "14 % at 20" entries. Fitting the two cache-size points alone (2 % at 1 entry, 46 % at 100, ceiling 55 %) gives about 27 to 55 entries, so the range 10 to 300 still covers it.

Ranges: none excludes its best value and no chance lies outside 0 to 1. One range is collapsed: `m_opus` is fixed at 2 (low = high), so the ensemble cannot vary it. Its own note says slice-session Sonnet calls were about twice as large; F3 gives Opus 1,306 M cache-read tokens over 5,879 calls (about 222k per call) and Sonnet 1,452 M over 3,297 (about 440k). On that data the per-call price ratio would be near 1, not 2. This is the brief's item 11 showing up in the table.

## 7. First ensemble (for the orchestrator only)

2,000 draws, seed 20261112, uniform inside `params.json`'s ranges, horizon 12 periods. No draw needed the constraint scaling. Ratios are library over top_first.

**These numbers follow from the assumed ranges. They are not findings.** 37 of the 52 parameters are guesses, and several measured ones are measured on a different unit (section 6).

| | p10 | p50 | p90 |
|---|---|---|---|
| Cost ratio, first period | 0.581 | 0.905 | 1.526 |
| Cost ratio, last period | 0.594 | 0.925 | 1.551 |
| Wrong-rate ratio, first period | 1.000 | 1.536 | 3.437 |
| Wrong-rate ratio, last period | 1.018 | 1.579 | 3.559 |

Share of draws where the library is cheaper than top_first with a wrong rate no higher: 6.5 % at the first period, 5.7 % at the last.

Parameters that move each ratio most (absolute Spearman, last period; the first period has the same names in nearly the same order):

- Cost ratio: `n_opus` -0.73, `n_cheap` +0.48, `o_opus` +0.16, `need_latent` +0.14, `rho_retry` -0.13, `s_review` +0.12, `c_review` +0.11, `need_visible` +0.11.
- Wrong-rate ratio: `o_opus` +0.85, `o_fable` +0.31, `s_review` -0.16, `g_review` -0.14, `g_tests_visible` -0.12, `rho_retry` -0.11, `g_tests_latent` -0.11, `p_visible` -0.10.

How to read them:

- With 2,000 draws a rank correlation carries noise of about plus or minus 0.044. Past the top two or three, the names are not well separated.
- None of the sixteen is a library parameter. Against top_first, the spread comes from the cheap-first ladder. At the first period the library is empty, so its wrong rate equals cheap_ladder's exactly.
- The library's own parameters appear only when it is compared with cheap_ladder. Last period, cost ratio over cheap_ladder 1.023 / 1.050 / 1.101 (p10 / p50 / p90), driven by `c_write` +0.42, `w_write` +0.35, `n_cheap` -0.31, `p_visible` +0.24, `t_visible` +0.22, `c_lookup` +0.20, `f_false` +0.19, `t_latent` +0.19. Wrong-rate ratio over cheap_ladder 1.003 / 1.015 / 1.056, driven by `h_harm` +0.38, `v_max` +0.33, `need_latent` -0.32, `t_latent` +0.31, `f_false` +0.31, `a_wrong` +0.28, `need_visible` -0.19, `d_deliver` +0.17.
- The one-at-a-time swings put the same parameters first (`n_opus`, `n_cheap`, `R_rework` for cost; `o_opus`, `o_fable`, `s_review` for the wrong rate). They are in `verify-engine-out.json`.
- At best values the bad stock outgrows the good one (228 against 90 after a year), mostly through stored cheap-tier escapes. That rests on reading 3(a) in section 5.

## Files

- `docs/program/library-pathways/engine.js`: changed as above.
- `docs/program/evidence/library-pathways/engine-test.js.txt`: three tests added; 22 of 22 pass.
- `docs/program/evidence/library-pathways/verify-engine.js.txt`: my model of the brief and every check here.
- `docs/program/evidence/library-pathways/verify-engine-out.json`: its results, including the full ensemble summary and swings.
- `docs/program/evidence/library-pathways/verify-engine-console.txt`: its console output.
