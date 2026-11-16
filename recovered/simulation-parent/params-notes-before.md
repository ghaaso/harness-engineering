# Why each parameter has its range

One line per parameter. Tag, then low / best / high, then the side (and for a library-side unknown, its good end), then the reason. Source codes are listed in `params.json` under `source_key`. Written 2026-11-12. Facts only: this file proposes no fixes.

## Workload: what the world hands us

- `p_visible` (G, 0.1 / 0.4 / 0.8, other side): The two nearest numbers are far apart and neither counts pieces of work, so the range is wide.
- `need_visible` (G, 0.15 / 0.3 / 0.6, other side): Whole-task failure rates run 29 to 55 percent; an error with text in hand should be easier than a whole task, so the range is centred lower.
- `need_latent` (G, 0.2 / 0.4 / 0.7, other side): Defect rates in reviewed slices (50 to 64 %) are the nearest numbers; slices are bigger than pieces of work and the Sonnet count is only four, so the range is wide.
- `u_exact` (M, 0.02 / 0.06 / 0.22, library side, good end high, group recurrence): Low end is the outside one-project study (2.1 %), high end is the top of the 95 % interval on 5 of 50; best sits just under the measured 6 to 10 % because some counted repeats were not the very same problem.
- `u_similar` (S, 0.03 / 0.15 / 0.45, library side, good end high, group recurrence): The many-contributor figures set the top; the one-project figure sets the bottom; this repository is one developer, so best sits in the lower half, below the many-contributor range.
- `u_composite` (G, 0 / 0.05 / 0.25, library side, good end high, group recurrence): No measurement of parts at all; the range runs from none to a quarter, and the three ceilings together stay under 1.
- `latent_coverage_factor` (G, 0.05 / 0.3 / 1, library side, good end high, group recurrence): Nothing measures silent-problem coverage, so the range spans almost nothing to full; best leans low because the design has no route in.
- `ok_coverage_factor` (G, 0.05 / 0.4 / 1, library side, good end high, group recurrence): Nothing counts how often an entry made from a cheap failure also covers work the cheap model gets right; the range runs from almost never to no penalty.
- `k_fill` (S, 10 / 40 / 300, library side, good end low, group recurrence): Fit to APC's two cache-size points gives 27 to 55, AWM says about 40, SWE-Exp says 300; the 10 floor allows for a fast start. Messy repair work likely fills slower than templated work.
- `v_max` (G, 0.1 / 0.4 / 0.9, library side, good end low, group quality): The replay figure is for a different channel and rests on four true repeats, so the range is wide on both sides.
- `k_distract` (G, 15 / 60 / 250, library side, good end high, group quality): The two key types in the replay give 20 and 180; the range is widened on both sides because the replay is of a different channel.

## Mechanism: lookup, screen, delivery, cheap attempt

- `t_visible` (G, 0.2 / 0.5 / 1, library side, good end high, group reach): Nothing was measured; the range covers a rarely used lookup to a lookup on every visible problem.
- `t_latent` (G, 0.02 / 0.15 / 0.6, library side, good end high, group reach): Nothing signals a latent problem, so a lookup needs a trigger the agent lacks; the range runs from almost never to sometimes.
- `c_lookup` (G, 0.1 / 1 / 2, library side, good end low, group running_cost): One call is the unit; a script-run lookup costs far less and a lookup with a follow-up costs about two.
- `r_exact` (G, 0.4 / 0.75 / 0.95, library side, good end high, group reach): Misses of 5 to 34 % give 0.66 to 0.95; the low end 0.4 allows for a stored fix being phrased differently from its symptom.
- `r_similar` (G, 0.2 / 0.5 / 0.8, library side, good end high, group reach): Lower than the exact case by construction; no chance was measured, so the range is wide.
- `r_comp_full` (G, 0.02 / 0.1 / 0.4, library side, good end high, group reach): A two-item display cap makes full return rare; the high end allows several lookups per piece of work.
- `r_comp_part` (G, 0.1 / 0.35 / 0.6, library side, good end high, group reach): Some-but-not-all is the likelier outcome under a two-item cap; the highs of the two values sum to exactly 1.
- `f_false` (G, 0.1 / 0.35 / 0.8, library side, good end low, group quality): Multi-cause templates and cache false-hit rates point to 0.1 to 0.8; best is a third.
- `c_check_share` (M, 0.03 / 0.2 / 0.4, library side, good end high, group quality): Low end is 3 of 116 (whole seed), best is 3 of 15 (worked examples, no Docker), high end is 6 of 15 (Docker). A design count, not a run.
- `c_screen` (G, 1 / 2 / 3, library side, good end low, group running_cost): Design says 2 to 3 turns; one call if the check runs inside a turn already being taken.
- `a_right` (G, 0.5 / 0.85 / 0.98, library side, good end high, group quality): Copying behaviour suggests high acceptance; the low end allows a model that sets entries aside often.
- `a_wrong` (S, 0.35 / 0.65 / 0.95, library side, good end low, group quality): The study says over 60 %; a look-alike is less blatant than a planted wrong value, so the low end is 0.35; high end 0.95 allows agents that copy.
- `d_deliver` (G, 0.5 / 0.85 / 0.98, library side, good end high, group reach): Most entries should survive a short piece of work; compaction and handoffs can lose some, so the range is wide below.
- `c_carry` (G, 0.1 / 0.73 / 1.5, library side, good end low, group running_cost): Best is D1's 0.73. Low is a 300-token entry over 100 calls. High is 860 tokens over the whole 519-call session (1.46).
- `q_exact` (S, 0.35 / 0.75 / 0.99, library side, good end high, group quality): Same-template puzzles give 0.99; the design stores a diagnosis and not the whole solve, and cheap models gain less, so best is 0.75 and low is 0.35.
- `q_similar` (S, 0.07 / 0.2 / 0.5, library side, good end high, group quality): Outside gains run 7 to 32 percent but average good and poor matches; the map's entry is a good match, so best is above the median and high is 0.5.
- `q_comp` (G, 0.03 / 0.15 / 0.5, library side, good end high, group quality): Set near the similar-entry value because more items did not help in two studies; wide because nothing measures it.
- `q_part` (G, 0 / 0.08 / 0.3, library side, good end high, group quality): Below the all-parts value by construction; the range runs from no help to a modest help.
- `h_harm` (G, 0.2 / 0.55 / 0.9, library side, good end low, group quality): MemCollab net drops of 4 to 31 percent set the low end; ClashEval's over 60 percent sets the best and the high end.
- `n_cheap` (G, 3 / 10 / 30, other side): Agent windows are the nearest unit: 4 to 12 calls typical; high end allows a long attempt.
- `s_exact` (G, 0.1 / 0.5 / 0.9, library side, good end high, group quality): The one case with a call count gives 0.2 to 0.8 of an attempt; the range is widened both ways because it is a single case.
- `s_similar` (G, 0 / 0.25 / 0.7, library side, good end high, group quality): An entry that must be adapted saves less than an exact one; one case, no call count, so the range is wide.
- `s_comp` (G, 0 / 0.2 / 0.6, library side, good end high, group quality): Joining parts costs calls of its own; nothing measures it, so the range is wide.
- `s_part` (G, 0 / 0.1 / 0.4, library side, good end high, group quality): Below the all-parts value by construction; the range runs from no saving to a modest one.

## Gate: tests and review

- `g_tests_visible` (G, 0.5 / 0.8 / 0.95, other side): Tests are sharp on errors with text and blind to build-time failures; the range runs from half to nearly all.
- `g_tests_latent` (G, 0.05 / 0.25 / 0.5, other side): A latent problem gives tests nothing to fail on, so best is low; the rate is unmeasured, so the range is wide.
- `s_review` (G, 0.2 / 0.5 / 1, other side): 100 percent per slice and 100 percent per PR, but a piece of work is smaller than a slice; the low end assumes about five pieces of work per reviewed unit.
- `g_review` (G, 0.3 / 0.65 / 0.85, other side): Reviews find many defects (9 of 14 slices) but nobody counted misses; range is wide and best is above half.
- `c_review` (G, 2 / 5 / 15, other side): R9 and D7 give 3 to 7; the range is widened for large diffs.
- `p_promote` (G, 0 / 0.5 / 1, library side, good end high, group quality): Nothing counts promoted checks; the range runs from none to all, and best sits in the middle.
- `k_promo_exact` (G, 0.3 / 0.7 / 0.95, library side, good end high, group quality): A check aimed at the same problem catches much, but tests can assert the wrong behaviour, so the range is wide.
- `k_promo_similar` (G, 0 / 0.05 / 0.3, library side, good end high, group quality): A check aimed at another problem rarely fits a new one, so best is low; the top allows checks written broadly.

## Ladder: retry, Opus, Fable

- `rho_retry` (G, 0.2 / 0.36 / 0.6, other side): Best is 1 minus 0.64. Low end allows for fixes that create new defects (9 of 14 slices); high end allows a cheap retry with sharper feedback.
- `c_handoff` (G, 1 / 3 / 10, other side): One call to write the brief at the least; ten if the new agent must re-read most of what the first one saw.
- `n_opus` (G, 3 / 10 / 35, other side): Same range as n_cheap because the record shows no difference in calls per task by tier.
- `n_fable` (G, 3 / 10 / 35, other side): Same range as n_cheap; nothing separates Fable's calls per attempt.
- `m_opus` (G, 1 / 2 / 2, other side): An unknown drawn from 1 to 2 (brief R10). The per-token ratio, 2, is the top and the best; the per-call figure on this PC's call sizes, near 1, is the bottom.
- `m_fable` (S, 2 / 3 / 4, other side): Bounds are the two vendor ratios; best is 3 because a call's cost splits about evenly between re-reads, output and cache writes.
- `o_opus` (G, 0.15 / 0.55 / 0.9, other side): Nested failures give 0.15 and independent failures give 0.54; best is the upper end because the ladder escalates only after a caught failure.
- `o_fable` (G, 0.2 / 0.5 / 0.9, other side): Stronger model but a harder remainder; no data, so the range is wide.

## Capture and what happens to escapes

- `w_write` (G, 0.2 / 0.45 / 1, library side, good end high, group reach): Best is 22 of 50; 3 of 5 gives 0.6; the owner's description (every strong solve stored) gives 1.0; the low end allows for compliance gaps.
- `c_write` (G, 2 / 5 / 15, library side, good end low, group running_cost): R9's 0.4 to 3.8 M tokens converts to about 2 to 15 calls; best near the centre of R9's range (1 M).
- `e_right` (S, 0.35 / 0.75 / 0.95, library side, good end high, group quality): 1 of 5 wrong gives 0.8, an outside rejection rate gives 0.62 to 0.76, and 5 of 8 seed examples flawed gives 0.375; best is the middle.
- `l_found` (G, 0.2 / 0.6 / 0.95, other side): The share found later cannot be counted by looking at records of found defects; range is wide with best above half because fixes are 21 percent of commits.
- `R_rework` (G, 5 / 15 / 60, other side): R9's 10 to 30 calls is the only figure; the range is widened both ways.
- `fix_on_found` (G, 0.05 / 0.3 / 0.8, library side, good end high, group quality): Corrections often did not reach the stored copy in the walkthroughs, so best is well below 1; no rate was counted, so the range is wide.
- `delta_stale` (G, 0.01 / 0.05 / 0.25, library side, good end low, group quality): Lost lines (6 percent over two months) give the low end; a half-life of 2 months would give 29 percent a month; 30-day period assumed.
- `retire_bad` (G, 0 / 0.05 / 0.3, library side, good end high, group quality): Nothing counts retirements; the range runs from never to almost a third each period, and best matches the staleness rate.

## Time

- `episodes_per_period` (G, 50 / 300 / 1500, other side): FixFlow's pace is the low end, the Clinic's peak pace the high end; pieces of work are not commits, so the range is wide.
- `periods` (G, 6 / 12 / 36, other side): A horizon of half a year to three years; best is one year.

