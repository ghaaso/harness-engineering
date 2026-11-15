# Pathway map for the reasoning library: model brief

Written by the orchestrating session on 2026-11-12. This is the design the engine, the parameter table and the page are built from. It is local and untracked, like the other program documents.

## 1. What this is for

The owner designed a "library": a separate memory of model reasoning conclusions. A cheaper model fetches a stored solution to a similar problem, adapts it and uses it; a problem the cheap model cannot solve goes up a ladder (Sonnet, then Opus, then Fable), is solved once and is stored. Goal: equal output from a cheaper model, at much lower cost, across sessions and projects.

By walking cases through the design we found about sixty limitations. The owner proposed mapping and measuring the pathways with **trees, ensemble models and graphs**. This map does that:

- **Graph**: the master structure. States a piece of work passes through, with the loops (retry, the ladder) and the shared stock of entries.
- **Trees**: views of the graph. Every route from start to an outcome, with its chance and its cost.
- **Ensemble**: most rates are unknown, so the map is run thousands of times across the plausible range of each. The output is a spread, and a ranking of which unknowns move the result most.

It is a model of how the mechanism behaves. It is not a forecast. Every number on screen carries a tag: M measured on this PC, S taken from an outside study, G a guess.

**No fixes.** The owner wants the limitations mapped and measured before any solution is attempted. The map must not contain proposed fixes.

## 2. The unit

One **episode**: a point in the work where a result is produced and checked. It may be a visible problem (an error, a failing check, a stated bug) or a latent one (the model is building something and nothing signals that a choice matters).

Cost is counted in **cheap-call equivalents**: one call by the cheap model (Sonnet) costs 1. A call by Opus costs `m_opus`, by Fable `m_fable` (price ratios).

## 3. Three policies on the same episodes

1. `top_first`: the strong model does the work directly (Opus, then Fable if the gate catches a failure). No library. This is the comparison the owner cares about: today about two-thirds of tokens run on the two strongest tiers.
2. `cheap_ladder`: the cheap model tries first, with the gate and the ladder, and no library.
3. `library`: the cheap model with the library, the gate and the ladder; strong-tier solves are written to the library.

## 4. Episode classes (what the world hands us)

An episode's class is fixed before the mechanism acts. Class chance is the product of four attributes.

| Attribute | Values | Chance |
|---|---|---|
| kind | visible, latent | `p_visible`, `1 - p_visible` |
| need | cheap_ok (the cheap model alone would be right), cheap_wrong | visible: `need_visible` is the chance of cheap_wrong; latent: `need_latent` |
| held | exact (the same problem is stored), similar (one entry fits after adapting), composite (two or more entries each cover part), nothing | depends on the stock of entries, section 8 |
| distractor | yes (a misleading look-alike is retrievable), no | depends on the stock, section 8 |

For `top_first` and `cheap_ladder`, held is always nothing and distractor is always no.

## 5. The mechanism for the `library` policy

Each numbered step is a state; each bullet is a branch with its chance. Costs are in section 6.

**L1 Trigger.** A lookup happens with chance `t_visible` (visible) or `t_latent` (latent). No lookup: go to L5 with no entry.

**L2 Result of the lookup.**
- WRONG (a look-alike comes back on top): chance `f_false` if distractor is yes, else 0.
- Otherwise, by what is held:
  - exact: RIGHT with `r_exact`, else NONE.
  - similar: RIGHT with `r_similar`, else NONE.
  - composite: FULL (all parts) with `r_comp_full`; PART (some parts) with `r_comp_part`; else NONE. `r_comp_full + r_comp_part <= 1`.
  - nothing: NONE.
- A RIGHT, FULL or PART result is in fact a bad entry (wrong or stale) with chance `wrong_share` (section 8). Then it is treated as WRONG from here on.

**L3 Screen (does it apply?).**
- With chance `c_check_share` the entry has a mechanical check: a good entry is accepted, a WRONG one is rejected (becomes NONE).
- Otherwise the cheap model judges: a good entry is accepted with `a_right` (else NONE); a WRONG entry is accepted with `a_wrong` (else NONE).

**L4 Delivery.** An accepted entry is in the acting window at the moment of use with chance `d_deliver`; otherwise it is lost (NONE).

**L5 Cheap attempt.** Chance the output is right:

| need | no entry | good exact | good similar | good composite, full | good composite, part | WRONG accepted |
|---|---|---|---|---|---|---|
| cheap_ok | 1 | 1 | 1 | 1 | 1 | `1 - h_harm` |
| cheap_wrong | 0 | `q_exact` | `q_similar` | `q_comp` | `q_part` | 0 |

**L6 Gate.** A right output passes. A wrong output is caught with chance `g = 1 - (1 - g_tests)(1 - s_review * g_review)`, where `g_tests` is `g_tests_visible` or `g_tests_latent` by kind. Not caught: ESCAPED.

**L7 Retry.** A caught wrong cheap output gets one cheap retry with the gate's feedback: right with `rho_retry`, then it passes. Otherwise go to L8. (A retry that is wrong is assumed caught again.)

**L8 Opus.** Handoff, then an Opus attempt: right with `o_opus`. A wrong Opus output is caught with the same `g`; caught goes to L9; not caught: ESCAPED.

**L9 Fable.** A Fable attempt: right with `o_fable`. Wrong and caught: UNRESOLVED. Wrong and not caught: ESCAPED.

**L10 Capture.** After a right strong-tier solve (L8 or L9), an entry is written with chance `w_write`. It is a good entry with chance `e_right`, else a bad one. This does not change the episode's outcome; it changes the stock (section 8).

**L11 Afterlife of an escaped output.** ESCAPED is found later with chance `l_found` (outcome ESCAPED_FOUND, rework cost) or never (ESCAPED_SILENT). With chance `z_wrongstore` an escaped output is recorded as a success and adds a bad entry to the stock.

**Outcomes:** EQUAL (accepted and right), ESCAPED_FOUND, ESCAPED_SILENT, UNRESOLVED. The wrong rate is everything except EQUAL.

`cheap_ladder` is the same from L5 with no entry and no capture. `top_first` starts at L8 without a handoff (the Opus attempt is right with chance 1 for cheap_ok episodes and `o_opus` for cheap_wrong ones), then L9, with the same gate.

## 6. Costs (cheap-call equivalents)

| Event | Cost |
|---|---|
| Lookup | `c_lookup` |
| Mechanical check at the screen | `c_screen` |
| Carrying a delivered entry | `c_carry` |
| Cheap attempt, and cheap retry | `n_cheap` each |
| Tests at the gate | 0 (time, not tokens) |
| Review | `s_review * c_review * m_opus` per gate pass |
| Handoff to Opus | `c_handoff` |
| Opus attempt | `n_opus * m_opus` |
| Fable attempt | `n_fable * m_fable` |
| Writing an entry | `c_write * m` of the tier that solved it |
| Rework of a found escape | `R_rework * m_opus` |

## 7. Parameters

Every parameter needs a low, a high, a best value, a tag (M, S or G) and a source. A guess must be labelled a guess and given a wide range.

Workload: `p_visible`, `need_visible`, `need_latent`, `u_exact`, `u_similar`, `u_composite` (long-run ceilings on what the library could ever hold for an episode), `latent_coverage_factor` (ceilings are multiplied by this for latent episodes, because much of the strong model's advantage there is mistakes it never makes and never records), `k_fill`, `v_max`, `k_distract`.

Mechanism: `t_visible`, `t_latent`, `c_lookup`, `r_exact`, `r_similar`, `r_comp_full`, `r_comp_part`, `f_false`, `c_check_share`, `c_screen`, `a_right`, `a_wrong`, `d_deliver`, `c_carry`, `q_exact`, `q_similar`, `q_comp`, `q_part`, `h_harm`, `n_cheap`.

Gate: `g_tests_visible`, `g_tests_latent`, `s_review`, `g_review`, `c_review`.

Ladder: `rho_retry`, `c_handoff`, `n_opus`, `n_fable`, `m_opus`, `m_fable`, `o_opus`, `o_fable`.

Capture and afterlife: `w_write`, `c_write`, `e_right`, `z_wrongstore`, `l_found`, `R_rework`, `delta_stale`.

Time: `episodes_per_period`, `periods`.

## 8. The stock of entries over time (the feedback loop)

Two stocks: good entries `E_good` and bad entries `E_bad` (wrong, or gone stale). Start both at 0. Each period of `episodes_per_period` episodes, under the `library` policy:

- `E_good += episodes * P(right strong-tier solve) * w_write * e_right`
- `E_bad += episodes * P(right strong-tier solve) * w_write * (1 - e_right) + episodes * P(ESCAPED) * z_wrongstore`
- staleness: `delta_stale * E_good` moves from good to bad each period.
- `wrong_share = E_bad / (E_good + E_bad)` (0 when both are 0).
- coverage: `fill = 1 - exp(-E_good / k_fill)`; `P(held = exact) = u_exact * fill`, likewise similar and composite, each multiplied by `latent_coverage_factor` for latent episodes; `P(held = nothing)` is the rest.
- `P(distractor = yes) = v_max * (1 - exp(-(E_good + E_bad) / k_distract))`.

The class chances of section 4 are recomputed each period from the stocks, so the picture shows cost and wrong rate moving over time, starting with an empty library.

## 9. What the engine must compute

For a parameter set and a policy:
1. Per episode class and overall: chance of each outcome, expected cost, cost by tier (cheap, Opus, Fable), expected number of calls.
2. Every route from the start to an outcome with its chance and cost (the tree view), with a bound on loops. Routes sorted by chance and by cost carried.
3. The time path for the `library` policy (section 8), and the same measures for the two other policies (constant in time).
4. Headline ratios at each period: cost of `library` over `top_first`, wrong rate of `library` over `top_first`, and both against `cheap_ladder`.
5. Ensemble: N draws of all parameters from their ranges (uniform between low and high unless the table says otherwise), each giving the headline ratios at the last period and at the first period. Report the spread (percentiles), the share of draws in which `library` is cheaper than `top_first` with a wrong rate no higher, and a ranking of parameters by the absolute Spearman rank correlation with each ratio. Also a one-at-a-time swing (each parameter at its low and at its high, the others at best).
6. Conservation: the chances of the outcomes sum to 1 for every class and every parameter set; branch chances out of every state sum to 1.

**The picture is the model.** The states and branches the page draws must be the ones the engine computes, read from one declarative description (`map.json`). Nothing may be drawn that is not computed, and no term may be computed that is not drawn or listed.

## 10. Where each limitation sits

Each limitation found in the walkthroughs lowers a branch chance or raises a cost. The map carries an index from limitation to the parameter or parameters it acts through, so that the ensemble's ranking of parameters is also a ranking of limitations. The index is filled in after the real-case walkthroughs return; the engine only needs to carry an optional list of limitation ids on each branch.

## 12. Revision 2 (2026-11-12, after the engine check and 59 real-case walkthroughs)

The first version tilted against the library in two places (R1, R3) and was unclear in several. Revision 2 replaces the text above wherever they differ.

- **R1. A good entry shortens the cheap attempt.** With a good entry in hand the cheap attempt costs `n_cheap * (1 - s_exact)` (exact), `n_cheap * (1 - s_similar)` (similar), `n_cheap * (1 - s_comp)` (composite, full) or `n_cheap * (1 - s_part)` (composite, part), and counts that many calls. This holds for cheap_ok and cheap_wrong episodes alike. A wrong accepted entry does not shorten the attempt. New parameters `s_exact`, `s_similar`, `s_comp`, `s_part`, each between 0 and 1. Reason: version 1 let the library help only by turning a wrong output into a right one. In the real cases its clearest savings were calls: a stored route would have saved 2 to 8 calls per agent in one case and a detour of two commits and a review in another.
- **R2. Coverage of work the cheap model gets right alone.** Entries exist for problems a strong model solved. Under the library policy the strong model works only on what the cheap model failed, so an episode the cheap model gets right alone is less likely to have an entry. For cheap_ok episodes the three held chances are multiplied by `ok_coverage_factor` (between 0 and 1) on top of the other factors. New parameter.
- **R3. What gets stored.** Entries are written only after a strong-tier solve that passes the gate. A right solve writes a good entry with chance `w_write * e_right` and a bad one with `w_write * (1 - e_right)`. A wrong solve that passes the gate (an escape at the Opus or Fable step) writes a bad entry with chance `w_write`. Cheap-tier outputs are never stored. `z_wrongstore` is removed. Every write costs `c_write` at the tier that produced the solve. Reason: the owner's design stores strong-model solves; version 1 also stored every cheap-tier escape, which made the bad stock outgrow the good one.
- **R4. Repair.** When an escaped strong-tier output is found later, its bad entry is corrected with chance `fix_on_found`: in the stock update one bad entry becomes a good one, `episodes * P(strong-tier escape that is found later) * w_write * fix_on_found` per period. New parameter. In the real cases corrections often did not reach the stored copy, so this chance is well below 1.
- **R5. The retry goes through the same gate.** A wrong cheap retry is caught with chance `g` (then L8). Not caught: ESCAPED.
- **R6. Units.** One episode is a fix-sized piece of work of about ten cheap calls. One period is 30 days. `periods` is a run setting and is never drawn or swung.
- **R7.** At L8 the Opus attempt is right with chance 1 on cheap_ok episodes and `o_opus` on cheap_wrong ones, under every policy.
- **R8.** A wrong accepted entry acts only at the cheap attempt. The cheap model's own judgment at the screen costs nothing. Lookup, screen, carry and handoff are paid at the cheap tier; a lookup counts `c_lookup` calls.
- **R9.** Each period is evaluated on its starting stocks.
- **Tags.** `c_carry`, `rho_retry`, `w_write` and `r_exact` are guesses that cite a hint, not measurements. `h_harm` is a guess that cites the same outside figure as `a_wrong`. `k_fill`'s note is corrected (the figure is a hit rate at a share of queries, not at a number of entries).
- **Two comparisons, always shown together.** Against `cheap_ladder`: what the library itself adds. Against `top_first`: the owner's goal, which also depends on the ladder and the gate.

## 13. Revision 3 (2026-11-12, the orchestrator's rulings after the refuter pass)

The refuter (`refute-map.md`) left six questions that change the model's meaning. These are the rulings. They override the earlier sections where they differ.

- **R10. The Opus price ratio is an unknown.** `m_opus` has a range of 1 to 2, best 2, tag G, and is drawn like any other unknown. The price per token is 2 (S). Per call it is 2 only if calls are the same size in both tiers; on this PC's records an Opus call read about half the cached tokens of a Sonnet call, which the earlier review traced to window settings, not to the work.
- **R11. Coverage counts every entry.** `fill = 1 - exp(-(E_good + E_bad) / k_fill)`. An entry a lookup returns is bad with chance `wrong_share`, as before. Version 2 took coverage from good entries only and then also removed the bad share from the hits, which charged bad entries twice.
- **R12. Bad entries can leave.** Each period `retire_bad * E_bad` leaves the stock (withdrawn, replaced or invalidated; both designs have such a step). New unknown `retire_bad`, between 0 and 1, a guess whose range includes 0.
- **R13. Which side an unknown is on.** Each unknown carries `side`: `library` if it exists only because of the library (trigger, lookup, what comes back, screen, delivery, carry, use with an entry, calls saved, harm from a wrong entry, writing, entry quality, repair, staleness, retiring, coverage ceilings and factors, fill, look-alikes), else `other` (the mix of work, the gate, the ladder, prices, the horizon). Each library-side unknown also carries `good_end`: `high` or `low`, the end at which the mechanism works as intended (for example high for the trigger rates, the return of the right entry, delivery, the calls saved, entry quality, repair and retiring; low for the false match, harm, the costs of lookup, screen, carry and writing, staleness, the fill scale and the look-alike ceiling). `w_write` has `good_end` high.
- **R14. Tied draws.** The ensemble takes a `tie` between 0 and 1. For each run one shared level `U` is drawn; each library-side unknown is placed at the quantile `tie * U + (1 - tie) * V` of its range, counted from its unfavourable end, with `V` its own draw. Other unknowns are drawn on their own as before. `tie = 0` is the old behaviour. Reason: a library that is built well is likely to be good at several steps together, and with thirty-odd independent draws the favourable corner is almost never sampled. The page shows `tie` at 0, 0.5 and 1 side by side.
- **R15. Three reference settings.** Every library-side unknown at its unfavourable end, at its best value, and at its favourable end, with the other unknowns at best. All measures are reported for the three.
- **R16. The funnel.** For the library policy at a given period: of 100 pieces of work the cheap model would get wrong alone, how many (a) have an entry held, (b) are looked up, (c) get the right entry back, (d) get a good entry, not a bad one, (e) pass the screen, (f) have it in the window at the moment of use, (g) come out right at the cheap attempt. Each number is a flow through states of the graph, declared in `map.json` as a measure, so the picture stays the model. The same funnel is reported for all work (where the last stage is calls saved).
- **R17. The weight of a limitation.** For each limitation that acts through unknowns: move those unknowns to their favourable end, keep the rest at best, and report the change in the four ratios and in the funnel's last number. The same for all limitations of one design step together, and for steps added one after another in order of largest change. This measures how much each limitation holds the result down. It proposes nothing.
- **Today's notes.** CLAUDE.md, the memory notes and the checks in the shared test run are present in every policy, so they cancel out. `need_visible` and `need_latent` describe the cheap model working as it does today, with those notes. The coverage ceilings therefore mean what the library could hold beyond today's notes. The page must say this, and must not say the ladder "keeps no notes".
- Left as they are, and listed under what the map leaves out: a good entry does not help the retry or the Opus attempt; the mechanical check never passes a wrong entry; correcting an entry costs nothing beyond the rework.

## 14. Revision 4 (2026-11-12, the orchestrator's rulings after the check of the second build)

The check (`check-second-build.md`) showed that revision 3's devices lean toward the library: the "unfavourable" setting was a barely used library, the single shared level tied heavy use to good entries, and the weight of a limitation was measured only with everything else at its middle value, where most weights are near zero or below it. These rulings replace R13's use in R14, R15 and R17. `side` and `good_end` stay as they are. Scripts behind the numbers quoted here: `rev4-explore.js.txt` and `rev4-explore-gate.js.txt` in this folder.

- **R18. Four groups of library-side unknowns.** Each library-side unknown carries `lib_group`:
  - `recurrence`, what the work holds, not a property of the design: `u_exact`, `u_similar`, `u_composite`, `latent_coverage_factor`, `ok_coverage_factor`, `k_fill`.
  - `reach`, whether an entry gets to the cheap model when one could exist (written, looked up, found, in the window): `t_visible`, `t_latent`, `r_exact`, `r_similar`, `r_comp_full`, `r_comp_part`, `d_deliver`, `w_write`.
  - `quality`, whether what arrives is right and is used rightly: `v_max`, `k_distract`, `f_false`, `c_check_share`, `a_right`, `a_wrong`, `q_exact`, `q_similar`, `q_comp`, `q_part`, `h_harm`, `e_right`, `fix_on_found`, `delta_stale`, `retire_bad`, `s_exact`, `s_similar`, `s_comp`, `s_part`, and R21's three new unknowns.
  - `running_cost`: `c_lookup`, `c_screen`, `c_carry`, `c_write`.
  The groups and their plain labels are declared in `map.json`; the membership is generated into `params.json` by `build-params.js.txt`.
- **R18a. Reference settings (replaces R15).** Declared in `map.json`: `middle` (every unknown at its best value); the eight corners of recurrence, reach and quality, each group at its unfavourable or its good end, with running cost and every other-side unknown at best; `all_good` (all four groups at their good ends); `worst_corner` (recurrence and reach at their good ends, quality and running cost at their unfavourable ends). The name "unfavourable" is retired. The funnel shows one faint mark, at `all_good`.
- **R18b. Tied draws (replaces R14's single level).** Each run draws four shared levels, one per group, independently, from the separate stream, in the fixed order recurrence, reach, quality, running cost. A library-side unknown sits at the quantile `tie * U_group + (1 - tie) * V`, counted from its unfavourable end. No group is tied to another. Tie 0 reproduces the present tie-0 ensemble draw for draw.
- **R18c. The square.** A grid of reach level by quality level (11 by 11, levels 0 to 1 between each group's two ends), with recurrence at its unfavourable end, at best, or at its good end, and running cost at best. Each cell gives the four ratios. Declared in `map.json`, computed by the engine.
- **R19. Two weights (replaces R17's single weight).** Score `S(x)` = the mean of the relative fall in the library route's cost and in its wrong rate, from `middle` to `x`. This equals the present score, because library-side unknowns never move the other two ways. The full fall is `S(all_good)`. For a set `X` of library-side unknowns:
  - `alone(X) = S(middle with X at its good ends) / S(all_good)`: what moving only this gives.
  - `last(X) = (S(all_good) - S(all_good with X back at its middle values)) / S(all_good)`: what is lost if only this stays where it is.
  Both are shares of the full fall. `alone` can be below zero and `last` above one; the shares do not add up, because the steps multiply. Reported for every limitation, every design step (the union of its limitations' unknowns, by `main_step`), each of the four groups, and one row for the library-side unknowns that no limitation names. Ranked by `last`. The steps moved one after another stay, as the cumulative share of the full fall, ending with the share left to the unnamed unknowns. Limitations with the same set of library-side unknowns share a weight; each row says how many others share it.
- **R20. The gate and the ladder are shared.** Limitations that act only through other-side unknowns get no weight on R19's measure, because those unknowns move all three ways. Instead `map.json` declares two shared groups with a direction: `gate` (`g_tests_visible`, `g_tests_latent`, `g_review`, `s_review`, all to their high ends) and `ladder` (`rho_retry`, `o_opus`, `o_fable` to their high ends, `c_handoff` to its low end). The engine reports cost and wrong rate of all three ways at `middle` and at `all_good`, each as it is, with the gate group moved, with the ladder group moved, and with both. Those limitation rows read "acts through the gate or the ladder" and point to that table. Limitations with no setting at all stay "not in the model".
- **R21. Checks promoted into the shared test run (new pathway).** The design promotes an entry's mechanical check into the tests every piece of work passes. That path needs no lookup, so it does not pass through the funnel. In the library way of working only, the gate's catch chance becomes `g_lib = 1 - (1 - g) * (1 - promo)` with `promo = (held_exact * k_promo_exact + held_similar * k_promo_similar) * (1 - wrong_share) * c_check_share * p_promote`, at every gate pass. New unknowns, all library-side, group quality, good end high, tag G: `p_promote` (share of entries with a mechanical check whose check also runs in the shared tests; 0 / 0.5 / 1), `k_promo_exact` (chance such a check catches a wrong output on the same problem; 0.3 / 0.7 / 0.95), `k_promo_similar` (the same for a similar problem; 0 / 0.05 / 0.3). Regression tests a team writes anyway are in every way of working; `p_promote` counts only checks that exist because an entry was written, and its low end is 0. With `p_promote = 0` every number of revision 3 is reproduced. A measure reports, per 100 pieces the cheap model would get wrong alone, how many more are caught at the first gate through promoted checks. Left out and listed: a bad entry's promoted check can pin a defect in place (seen in the real cases); leaving it out leans toward the library.
- **Targets, before R21 (with `p_promote = 0`), last period, all G.** Each line reads cost over the ladder, wrong rate over the ladder, cost over the strong model, wrong rate over the strong model.
  - `middle`: 1.034, 1.008, 0.887, 1.911; funnel end 0.35.
  - Corners (recurrence, reach, quality; 0 unfavourable end, 1 good end): 000: 1.034, 1.023, 0.887, 1.940. 001: 1.011, 1.000, 0.868, 1.897. 010: 1.429, 1.558, 1.226, 2.956. 011: 1.062, 0.997, 0.912, 1.891. 100: 1.035, 1.025, 0.889, 1.944. 101: 1.007, 0.997, 0.864, 1.890. 110: 1.530, 1.713, 1.313, 3.250. 111: 0.803, 0.710, 0.689, 1.348.
  - `all_good`: 0.739, 0.710, 0.634, 1.348; funnel end 31.71; `S(all_good)` 0.290. `worst_corner`: 1.750, 1.713, 1.502, 3.250.
  - Groups, alone then last, as shares of the full fall: recurrence -0.4 % and 82.0 %; reach -13.0 % and 75.5 %; quality 5.4 % and 105.1 %; running cost 3.5 % and 10.7 %.
  - Steps, alone then last: 1: 1.5, 19.4. 2: -5.6, 74.9. 3: 2.0, 26.5. 4: 11.3, 95.7. 5: -0.3, 13.0. 6: 0.5, 33.3. 7: 2.1, 12.6. 8: -3.8, 10.0. 9: 8.9, 78.3. 10: 3.9, 31.2. Steps one after another: 4, 2, 9, 6, 7, 1 reach 11.3, 24.7, 52.4, 59.6, 61.9, 63.3 % of the full fall.
  - Gate and ladder, cost and wrong rate of library, ladder, strong: `middle` 26.6 and 21.4 %, 25.7 and 21.2 %, 29.9 and 11.2 %. Gate moved: 39.2 and 7.9 %, 37.9 and 7.9 %, 36.4 and 8.5 %. Ladder moved: 23.7 and 17.1 %, 23.1 and 16.9 %, 26.0 and 1.6 %. Both: 32.9 and 2.8 %, 31.8 and 2.8 %, 31.4 and 0.5 %. Library at `all_good`: 19.0 and 15.1 %; gate moved 29.0 and 5.5 %; ladder moved 17.0 and 12.0 %; both 24.8 and 2.0 %.
- **What stays.** R10 to R12, R16, today's notes, and everything revision 3 listed as left out.

## 15. Rulings after the check of the third build (2026-11-13)

The check (`check-third-build.md`) confirmed every number and found the lean roughly balanced, with signs both ways. It left seven items that touch the model's meaning. The orchestrator's rulings, all "kept as built", with the reason:

- **Group placement.** Look-alikes (`v_max`, `k_distract`) and staleness (`delta_stale`) stay in entry quality: the limitations that act through them are about what the design stores and how it keys it. `p_promote` stays in entry quality: with it there, the corner table shows that promoted checks act without a lookup, which is a property of the design. `a_right` and the calls saved stay. The page says the placement is a judgment. The corners move by up to 0.2 under other placements; which corner is below the ladder does not change.
- **Promoted checks only in the library way.** Kept. The low end of `p_promote` is 0, which is the case where the other ways have the same checks. The page lists it under what the map leaves out.
- **The all-good setting is not the cheapest point of the ranges** (0.726 against 0.750 on cost over the ladder, at a higher wrong rate). Kept: the setting is defined as every library unknown at its good end, and promoted checks trade cost for wrong rate.
- **The anchor of the "last" weight.** Kept at the all-good setting. With the anchor three quarters of the way the full fall is 12.9 % instead of 30.6 %, the group order and the top three steps (4, 9, 2) are unchanged, and steps 6 and 10, and 1 and 7, swap. Quote this beside the ranking.
- **The gate and ladder table moves each group one way only.** Kept; the table says so.
- **"Cheaper with a wrong rate no higher"** stays as the count of runs better than another way.
- **"All good but this" at a glance.** Not added. With all else good, no single measured limitation left at its middle values puts the library above the ladder (highest 0.912 cost, 0.873 wrong rate); the entry-quality group does (1.029, 1.038) and step 4 does on cost (1.027). Quote this when the ranking is discussed.
- **Added by the orchestrator, not on the page:** how much must come back. With reach and entry quality at their good ends the library's cost crosses the ladder's when about half of the work could have an entry (middle running cost), or about a fifth (low running cost); at three quarters of the way on reach and quality it crosses only at the top of the range. Middle value: about a quarter. Script: `comes-back-sweep.js.txt`. All G.

## 11. Files

- `docs/program/library-pathways/map.json`: the declarative graph (classes, states, branches with chance and cost expressions, outcomes, parameter ids with plain-language meanings).
- `docs/program/library-pathways/params.json`: values, ranges, tags, sources.
- `docs/program/library-pathways/engine.js`: pure functions, no dependencies, usable from node and inlined in the page.
- `docs/program/evidence/library-pathways/`: this brief, tests, build script, notes. Scripts kept as evidence are saved as `.js.txt` and run from their own folder with `node - < name.js.txt` (use `process.cwd()`, not `__dirname`).
