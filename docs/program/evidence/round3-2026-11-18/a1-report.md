# a1 report (final, step 4): a token allowance that refills, and a few long units

Final of 2026-11-19, written by the a1 fold step (Opus). It folds the gate (`R:a1-gate.md`) and the refuter into the
draft of step 2. The refuter ran in two fresh contexts for size: `R:a1-refute-1.md` (A01 to A41) and
`R:a1-refute-2.md` (A42 to A82). Claims are in `R:a1-claims.md`; `R:` = `docs/program/evidence/round3-2026-11-18/`.
**Confirmed** means the gate found the quotation and the refuter confirmed the claim. **Holds in part** means the
refuter's corrected claim is used. A hypothesis the refuter confirmed only follows from what it cites; it stays a
hypothesis. No number is guessed: a missing one is a measurement (M1 to M11, in 3(e)). Library records:
`library/journal/2026-11-19/a1.jsonl`.

## 1. The answer

1. One window is one budget spent over a known horizon (proven: A01, A02, A04, confirmed). Two published forms pace it. Re-planning spends the rest at (1 - u)/(1 - s) of the even rate, with u the share used and s the share of time gone (A11, self-reported, confirmed). The price form moves a price by the gap between spend and target (A05, holds in part). After a lull, re-planning spends the saved part later and the price form does not (A69, holds in part). We propose re-planning (hypothesis).
2. A window limits starts from the moment u runs ahead of s, not only when it is nearly spent (A82, confirmed inference).
3. Several windows (5-hour, weekly, and a weekly one for one model): a unit starts only if it fits in every window it draws on (A29, A30). Its price is the sum of their prices (A21, A25, A71). All of these are confirmed. "The dearer price binds" holds only while one window alone is ahead of its line (A72, holds in part).
4. The same prices pick the model: the one with the highest value minus summed price times the window usage it charges, counting a redo when the cheaper model fails (A74, holds in part). Bandits with knapsacks prices arms this way (A25); nobody has applied it to models. It needs pass rate and usage by kind of work and model (M8). No saving read is in tokens on code.
5. The provider's pages (fetched 2026-11-19): the 5-hour period starts at the first message and resets in full five hours later. The weekly reset is at a fixed time per account, and some plans add a weekly limit for one model (A36 to A38, confirmed). They give no sizes, no carry-over rule and no cache weight for Claude Code.
6. For a few long units the largest measured gain is EASY++ backfilling: wait -23 % and bounded slowdown -37 % against EASY, on four real logs replayed in a simulator (A55, confirmed). Predictions that ran short, left uncorrected, made wait 454 % worse (A57). It gains only when a unit needs a share of something not free. For units that need one worker and nothing else, it is first come, first served (A79, holds in part).
7. Refuted: ending the plan one unit length before the reset (A76). A reserve for running units does that job.
8. Scale: the pacing bounds hold for any number of steps, but their constants were not read (A03). Numbers at tens of units exist only for known demand (A18, A20) or for the worst case (A27). Eleven measurements set every number (M1 to M11).

## 2. The table

| Conclusion | From (claim ids) | Measured gain and its conditions | What the refuter left | Still a guess for model sessions | What it would change in our rule or tree |
|---|---|---|---|---|---|
| One window: compare u with s; when u > s, spend the rest at (1 - u)/(1 - s) of the even rate | A01, A02, A04, A05, A11, A14, A24 (read); A69, A70, A82 (inferred) | No gain measured for the rule alone. Theory: runs out at most a fixed number of steps early (A02, A05); regret of order [sqrt]T, an optimal order (A03). Production: median budget life +44 % / +149 % and impressions per spend +7.74 % / +10.52 % (A16, LinkedIn, self-reported, daily budgets, pacing on against off) | A01, A02, A04, A11, A14 confirmed. A03 in part: the bound holds for any T, constants unread. A05 in part: no early stop needs a price cap and a small step, and the gap is fixed in steps. A69 in part: the clipped price and re-planning are two rules; only re-planning carries a lull's saving forward. A70 in part: lumpy units raise the price in bursts; admission on expected tokens is outside A01's model. A82 confirmed | Which form works better at tens of units (M6); a value per unit (M9); u read in whole percent | Token row of step 1: per window, u against s and the re-planned rate, not only "the units the window can still pay for"; step 3's gate admits by value against the price |
| Several windows: fit in all; price summed; each kept | A21-A23, A25, A29, A30 (read); A71-A73 (inferred) | None measured. The sum is asymptotically optimal at large volume and "not optimal in general" (A22) | A21-A23, A25, A29, A30, A71 confirmed. A72 in part: under the price form both prices must be kept. A73 in part: 33.6 only with work round the clock; a per-model window adds a second ratio | Which windows a one-model unit draws on (M3); the sizes and k (M2); windows opened per week (M6) | Token row: u, s and price for each window; the frame's "dearer price binds" is replaced by the sum |
| The prices pick the model | A25, A44-A48, A52-A54 (read); A74 (inferred) | FrugalGPT 98.3 / 73.3 / 59.2 % lower cost in dollars at the best single model's accuracy (A46); mixture-of-thought 0.929 against 0.931 at 40 % of the cost (A48); AutoMix over 50 % (A44); RouteLLM 3.66x fewer GPT-4 calls than random routing (A45); none in tokens on code | A25, A46, A48, A53, A54 confirmed. A44 in part: five context-grounded sets, two with long documents, cost a fixed ratio per query. A45 in part: against random routing, to recover half the gap; 95 % of GPT-4 only on MT Bench. A47 in part: a large gap loses 10.3-13.8 %. A52 in part: it also has a coding result (a budget in the prompt). A74 in part: value includes the redo; usage is measured window usage; BwK is the form | Pass rate, usage and redo cost by kind and model (M8); each model's weight in the windows (M2) | Step 4, last sentence: "gap measured small" becomes "value minus summed price x window usage, a redo counted" |
| Ranking by value while a window limits | A12, A16, A17 (read); A77 (inferred) | Cost per click -72 / -67 / -79 % from value layers against one global rate, same smoothness (A12, Yahoo, self-reported, 3 campaigns, 24 h) | A12, A17 confirmed. A16 in part: pacing alone also raised impressions per spend. A77 in part: no system measured value ranking and pacing on one baseline, so the split is only suggestive | A value measure per unit (M9) | Step 4 order while a window limits: value per token first |
| A reserve for units in flight; no fixed fast finish | A15, A17, A41 (read); A75, A76 (inferred) | Over-delivery 4.12 to 2.39 % and 3.8 to 3.4 % (A16, self-reported) | A15, A17 confirmed. A41 in part: the wrap-up is only at the 5-hour limit, for a response under way. A75 in part: the harm is a cut-off unit and its redo, not an overrun; x20-0460's latency margin is a second reserve. A76 refuted | Usage of running units and the meter's lag (M11); whether unspent allowance is lost (M5); forecast error (M6) | Token row: reserve = expected remaining usage of running units, plus the latency margin; no plan to end one unit length early |
| The provider's facts | A35-A43 (read, fetched 2026-11-19) | Not a gain | A35-A39, A42, A43 confirmed. A40 in part: the context-management cost is stated for claude.ai with code execution, not for Claude Code. A41 in part (above) | Sizes, carry-over, cache weight, double charge, weights (M2-M5) | Rule's measurement 6: "fixed or rolling" is answered from the documentation; o2-0501 narrowed |
| Backfilling: a reservation for the oldest unit that does not fit, shortest first behind it, corrected predictions | A55-A62 (read); A79 (inferred) | Wait -23 %, bounded slowdown -37 % (EASY++ against EASY), four real logs, 100-1,152 processors, 28,490-223,407 jobs, mean run 73-188 min, simulation replay (A55, A56) | A55-A59, A61, A62 confirmed. A60 in part: before and after, not controlled. A79 in part: for one-worker units it is first come, first served; the reservation rests on a stop at the cap | Whether it holds at 3 to 16 workers; length spread by class and model (M10); what to do with a unit past its cap | Step 4: a reservation for the oldest unit that does not fit replaces the age cap where a unit needs a share of a window, memory or the check; step 0 keeps the last two lengths per class and model |
| Error direction matters more than accuracy | A57, A58 (read) | Uncorrected predictions: accuracy +49 % but wait +454 % and slowdown +515 % (A57); doubling estimates helps (A58) | Both confirmed | Share of our predictions that run short (M10) | A unit's cap is an upper limit, never the prediction; an overrun raises the prediction to the cap |
| A speculative copy only when the time saved is worth its tokens | A64-A67 (read); A80 (inferred) | LATE 27 % faster (58 % with stragglers induced) than Hadoop's own copies (A65); Dolly 34-46 % within 5 % of capacity (A67); MapReduce 44 % (A64) and Mantri 32 % (A66), both self-reported | A64, A65, A67 confirmed. A66 in part: before and after, across builds. A80 in part: a copy pays when the time saved is worth the summed price x its tokens, not only at price zero; a 5 % cap is no worker at 3-16 workers | Whether slowness comes from the run or from more work; the spread across reruns (M10) | The do_not "no speculative copies" (x19-0701) holds unless the time saved is worth a whole unit's tokens at the current price |
| A fixed batch | A68 (library); A81 (inferred) | Worst case 2 - 1/m for any order, no lengths needed; 4/3 - 1/(3m) for longest first with exact lengths (analytic) | A68 confirmed. A81 in part: longest first's bound needs exact lengths; with rough lengths it has none | Lengths known only roughly (M10) | Step 4: for a batch that must all finish, any order is within 1.67-1.94 of the best with 3-16 workers; longest first only where lengths are well predicted |
| Scale: only the shape carries | A03, A18, A20, A25-A27 (read); A78 (inferred) | At our size: a fixed price gets at least 90 % at 25 units and 95 % at 100 (A18), and at least 94.5 % at 1-20 items in the authors' example (A20), both for known demand; worst case about 29 % at U/L = 10 (A27); all analytic | A25, A27 confirmed. A03, A18, A20, A26 in part. A78 in part: A20 and A27 add numbers at our scale | Every constant | Every number of the token and scheduling steps is a measurement (M1-M11) |

### The frame of the lane file, part by part

- "One price, rising as the budget runs short for the time left": **holds, in two forms that differ** (A01, A05, A11, A14; A69 in part). In ratios, both compare u with s. The re-planned rate is (1 - u)/(1 - s) times the even rate (A11). The clipped price of A05 does not carry a lull's saving forward; re-planning does.
- "Two nested windows, the dearer price binds": **does not hold as stated.** Every source with several budgets charges the sum of their prices (A21, A25), and admission needs every bucket (A29, A30). The dearer price alone is right only while one window alone is ahead of its line, and under A05's form not even then (A72, in part).
- "The price also answers which model": **holds as a hypothesis** (A74, in part). Bandits with knapsacks chooses among arms with one price per budget (A25); nobody has applied it to models. The value must count a redo.
- "For a few long units the gain is in what starts next and what fills the gap": **holds where a unit needs a share of something not free** (A55, A62; A79 in part). Otherwise the order is first come, first served. The control loop of the ad systems does not carry at tens of units: LinkedIn's fixed 10 % step moves less than one unit (A14; reasoned in the pacing collect file).

## 3. The five points

### (a) The rule for spending a refilling allowance

**One window.** Let u be the share of the window used and s the share of its time gone. Two published forms pace a
budget over a known horizon, and they are not the same rule (A69, holds in part).
- **Re-planning.** At each decision the rest of the window is to be spent at (1 - u)/(1 - s) times the even rate (A11, Yahoo, self-reported, confirmed; practice re-solves often, A24). LinkedIn makes the same comparison every minute, spend to date against the plan to date, and moves its rate by 10 % (A14, confirmed). A lull leaves u below s, and the saved allowance is spent later in the window.
- **The price.** The price moves by the step size times (spend - target) at each step, inside [0, cap] (A01, confirmed; A05, holds in part). Unclipped, that is the step size times the budget times (u - s). With the clip, it is the rise of u - s above its lowest value so far. So after a lull the price can be above zero while u < s, and the saved allowance is not spent later (A69). The rule runs out at most a fixed number of steps early, if the cap is at least v_max/[rho] - 1 and the step size times v_max is at most 1 (A05). At tens of units per window, where one unit can cost several steps' budget, that gap can be a large share of the window (the refuter's reading of A05).
- **Proposed (hypothesis).** Re-planning, per window. While u <= s the window does not limit starts. When u > s, it limits starts to the re-planned rate, highest value per token first (A12). The window's price is then above zero only while u > s. Its level is the value per token of the last unit the re-planned rate still lets in: the bid price of A21, re-solved at each decision as A24 says. Why re-planning: both production systems read do it (A11, A14); it needs no step size (A05's must be set from the units per window, M6); and it spends a lull's saving before the reset, which matters if an unspent part is lost there (not documented, M5).
- **A reserve.** A unit's tokens are known only after it runs, so it is admitted on its expected usage. That lies outside A01's model, where a request's use is seen before the choice (A70, holds in part). So every window keeps back the expected remaining usage of the 3 to 16 running units (A75, holds in part). The harm it prevents is a unit cut off after its current step and redone (A41), not an overrun: the provider stops work at the limit. The latency margin of x20-0460 (designed-only) is a second reserve on top.
- **No fixed fast finish.** Planning to end one unit length before the reset is refuted (A76). The reserve already protects a late start, and an early end leaves the window idle for that length in every window. LinkedIn's fast finish plans as if the last 2 of 24 hours had no traffic (A15, confirmed), to spend budget that forecast errors left unspent. A margin of that kind comes from the measured error of forecasting the rest of the window (M6), and only if an unspent part is lost (M5).
- Source of each part: re-planning, A11 and A14 (self-reported); the price, A01 and A05 (proven); no early stop, A02 and A05 (proven, with conditions); value order, A12 (self-reported); the reserve, A17 and A41 (self-reported; documentation). The mapping to our windows is a hypothesis (A69, A70, A75).
- It must know: u per window (the meter); s (the clock: the 5-hour period starts at the first message, A37; the weekly reset is fixed per account, A38); usage per unit by class and model, estimated before the start and counted after (M1, M2); units per window and the forecast error (M6); the expected remaining usage of running units and the meter's lag (M11); a value per unit, or at least a ranking (M9).

**Two nested windows, and a per-model window.**
- Each window j has its own u_j, s_j and price. A unit starts only if its expected usage fits in every window it draws on (A29, A30, confirmed). Its price is the sum of the prices of those windows (A21, A25, confirmed; A71, a confirmed inference). Under re-planning a window behind its line adds zero, so the sum is the price of the windows ahead of their lines. Under the price form both prices must be kept, since a window behind its line can still carry a price after a lull (A72, holds in part).
- Summed or dearest alone: **summed.** No source read uses the dearest alone. The sum is exact only when the opportunity costs add (A23, confirmed). For separate limits that count the same tokens, each limit charges its own price in the Lagrangian, so the sum follows; it only approximates the exact opportunity cost (the refuter on A71).
- Which window binds over a week: the week binds on average when k = weekly size / 5-hour size is below the number of 5-hour windows opened in the week. That number is 168/5 = 33.6 only if work runs round the clock, since a period opens at the first message (A37). The per-model weekly window adds a second ratio: its size against that model's share of usage (A73, holds in part). Whether a unit on that model also draws on the all-models week is not documented (A38; M3).
- How it was reached: the update rules and acceptance tests were read in A01, A05, A11, A14 and A21. The ratio form is arithmetic on A05 and A11, and the refuter showed the two forms differ (A69). The nesting is built from the two-bucket specifications A29 and A30.

### (b) Choosing between a dearer and a cheaper model

- **The rule (hypothesis; A74, holds in part).** For each model that can do the unit, take the value of its result minus the summed price of the windows it charges times the window usage it charges, and choose the largest. The value counts the chance and the token cost of a redo when the cheaper model fails our check. Usage differs by model and effort level (A40), so "extra tokens" means measured window usage, not raw tokens. At zero prices the better model runs, and usage breaks ties.
- **Its published form.** Bandits with knapsacks keeps one price per budget and chooses the arm whose reward beats its priced use (A25, confirmed). An arm can be a model. No source read applies a pacing price to the choice of model.
- **The measurement it needs (M8):** for each kind of unit and each model, the share passing our check, the window usage per unit and the redo cost. The library already says the gap must be measured per kind of work (o2-0407). RouteLLM's routers trained on chat were no better than random on MMLU (A45).
- **Savings read at equal quality, none in tokens on code.** FrugalGPT: 98.3 / 73.3 / 59.2 % lower cost in dollars than the best single model, on three classification and reading sets at March 2023 prices (A46, confirmed through the o2 note). Mixture-of-thought cascades: 0.929 against 0.931 at 40 % of the cost (A48, confirmed). AutoMix: over 50 % at comparable performance on five context-grounded sets, two with long documents, with cost a fixed ratio per query (A44, holds in part). RouteLLM: 3.66 times fewer GPT-4 calls than random routing to recover half the quality gap on MT Bench, 1.41 on MMLU and 1.49 on GSM8K (A45, holds in part). Hybrid LLM: with a large gap, 10.3 to 13.8 % quality lost at 40 % routed to the small model (A47, holds in part). A self-reported account says a better model gained more than doubling the token budget (A54, confirmed).
- **Budgets on code (not model choice).** Showing the agent its remaining tool budget raised the resolve rate on 500 SWE-bench Verified tasks from 36.8 to 55.4 % at 50 calls, at similar tokens (A52, holds in part). An agent told its costs still broke a hard budget in 32.8 % of tasks (A53, confirmed). So the limit belongs at the gate, not in the prompt.
- How it was reached: the rule is A01's acceptance test applied to two versions of one unit. The refuter pointed to BwK as its published form and added the redo.

### (c) The facts of our windows (provider documentation, fetched 2026-11-19)

- "a session limit that resets every five hours, and weekly limits that reset once every week" (A36, `p1.txt:102`, confirmed).
- "The period starts when you send your first message, and your limit resets in full five hours later." (A37, `p1.txt:107`, confirmed). So the 5-hour window is anchored at first use: neither a fixed clock nor a rolling sum.
- "Weekly limits apply across all models, and some plans also have a separate weekly limit for Fable. Weekly limits reset at a fixed time each week that is assigned to your account ... you receive your full weekly allowance each cycle." (A38, `p1.txt:111`, confirmed). Also "Max and Ultra plans also have a separate weekly limit for Fable" (`p2.txt:123`).
- claude.ai, Claude Code and Desktop count "towards the same usage limit", and use in IDEs counts too (A39, confirmed). The owner's other sessions draw on the same windows.
- Usage depends on factors "including" conversation length, features, model and effort level, with no weights (A40, holds in part). The extra cost of automatic context management is stated for claude.ai chats with code execution; nothing is said of Claude Code's own compaction.
- When Claude Code reaches the five-hour limit in the middle of a response, it may finish the step in progress on a "small and capped" wrap-up allowance charged to the weekly limit: once a week on Pro, at each five-hour limit on Max, rolling out gradually. Nothing is said of a wrap-up at the weekly limit (A41, holds in part).
- Cached content in claude.ai projects "counts less against your limits when reused", and caches expire after inactivity (A42, confirmed). The API's token bucket and its cache-read exemption (A35, confirmed) are API rules, not plan rules.
- Limits may be adjusted "at our discretion", including weekly and monthly caps or model and feature usage (A43, confirmed). A measured size can change, and a window can be added.
- **Unknown (named as measurements):** each window's size in tokens and the ratio k (M2). Whether an unspent part carries over, and what starts the next 5-hour period after a reset (M5). How cached input counts in Claude Code (M4; open in the library as x12-0501). Whether one-model use is charged to both weekly windows (M3). The weights of output, thinking and effort (M2). This account's weekly reset time (read in Settings, no run). The library holds one older size: about 3.4 million subagent tokens in one 5-hour window, on the Pro plan in October, with a Workflow script (x09-0113, an extractor record). It is not today's plan or setup and gives no k.

### (d) A few long units

- **Largest measured gain for what starts next: EASY++** (A55, confirmed). Its parts: a reservation for the oldest waiting job, kept in first-come order; later jobs backfilled shortest first if they cannot delay it (A62, confirmed; `tsafrir/paper.txt:4120-4122`); lengths predicted as the mean of the same user's last two finished jobs (A59, confirmed), raised straight to the user's estimate when a job outlives its prediction (`tsafrir/paper.txt:4711-4714`). Against EASY with user estimates, averaged over four real logs: wait -23 %, bounded slowdown -37 % (A55); on SDSC the wait gain was 10 %. The logs had 100-1,152 processors, 28,490-223,407 jobs, mean run 73-188 minutes and load 56-84 % (A56, confirmed), replayed in a simulator. A job takes many processors, so the processor count overstates how many jobs ran at once.
- **How the gain falls as the length estimate worsens** (A55, A57, A58, all confirmed):

| Length information | Accuracy (mean run / estimate) | Wait | Bounded slowdown |
|---|---|---|---|
| Exact (PERFECT++) | 100 % | -22 % | -47 % |
| Predicted, corrected when outlived (EASY++) | about 60 % | -23 % | -37 % |
| Users' estimates, shortest first only (EASY+SJBF) | 31-47 % | -10 % | -22 % |
| Predicted, not corrected | +49 % over users' | +454 % | +515 % |

- **What it needs to know about a unit's length:** an upper limit that is enforced (EASY kills a job at its estimate to keep the reservation, A61, confirmed), and a correction when a unit overruns. The direction of the error matters, not its mean (A57). Doubling every estimate helps, but less than predicting and correcting (A58). More history made predictions worse; two jobs are slightly better than one (A59).
- **Where it applies to us** (A79, holds in part): only where a unit needs a share of something that is not free now (a window, memory, the check). If a unit needs one worker and nothing else, the head unit always fits when a worker frees, so the rule is first come, first served. The reservation's promise rests on stopping a unit at its cap: a session that is not stopped can delay it without bound, and stopping one wastes its tokens. Keying the prediction on class and model instead of user is untested.
- Backfilling went with utilisation rising from 40-60 % to about 70 % on five supercomputers (A60, holds in part: before and after, not controlled).
- **Straggler copies.** LATE 27 % (58 % with stragglers induced) against Hadoop's own copies (A65); Dolly 34-46 % within 5 % of capacity (A67); MapReduce 44 % and Mantri 32 %, both self-reported (A64, A66). All copy only the tail, on clusters of 150 to about 1,800 machines, with jobs of hundreds of tasks. A copy of our unit pays its whole token count. It pays off when the time saved is worth the summed price times its tokens, and only when the unit is slow from the run, not from more work (A66; A80, holds in part). With 3 to 16 workers a 5 % cap is no worker, and a 10 % cap gives one only from 10 workers up.
- **A fixed batch that must all finish.** Any order is within 2 - 1/m of the best (1.67 to 1.94 for 3 to 16 workers) and needs no lengths. Longest first is within 4/3 - 1/(3m) (1.22 to 1.31) only with exact lengths (A68, confirmed; A81, holds in part). With exact durations, project-scheduling search is within 0.10 % of the optimum at 30 activities, and 10.71-11.73 % and 31.24-34.07 % above a lower bound at 60 and 120 activities, over 480, 480 and 600 instances (A63, confirmed). There is no result for rough durations.
- How it was reached: the figures were read from Tables 4.3 and 4.1 of the thesis (A55, A57), and the averages checked by arithmetic on the four rows by the draft and by the refuter. The mapping to our units is A79 (hypothesis, narrowed).

### (e) What each part changes in the rule, ranked by expected gain

The ranking is reasoned, not measured. When demand exceeds a window, the units done per window equal the window
divided by the usage per unit. Only the model choice changes the usage per unit at equal quality. Ranking by value
changes which units get done. Pacing changes when they run.

| Rank | Change to the rule | Mark | Small project (demand under the windows) | Very large project (windows bind every week) | Measurement that sets it |
|---|---|---|---|---|---|
| 1 | Step 4: the model with the highest value minus summed price x window usage, a redo counted | hypothesis (A74 in part; form A25; savings A44-A48 on non-code work) | Prices zero: the better model; usage breaks ties | Active on every unit; the per-model weekly window adds its price | M8, M1, M2 |
| 2 | Step 4 order while a window limits: value per token first | hypothesis (A12, self-reported; the split is only suggestive, A77) | Inactive | The main lever on what a week buys | M9 |
| 3 | Token row: per window, u against s; when u > s, the re-planned rate (1 - u)/(1 - s); a reserve for running units plus the latency margin; no fixed fast finish | mechanism proven (A01, A05) and run in production (A11, A14, self-reported); mapping hypothesis (A69, A75); A76 refuted | Inactive except the reserve | Keeps work from stopping before the reset; the week binds when k is below the windows opened per week | M2, M5, M6, M11 |
| 4 | Step 4: a reservation for the oldest unit that does not fit (replaces the age cap) where a unit needs a share of a window, memory or the check; shortest first behind it; lengths from the last two units of the class and model, raised to the cap on overrun | mechanism proven (A55-A62); our scale hypothesis (A79 in part) | Few units waiting, or one-worker units only: first come, first served, no gain | Many units waiting on a window, memory or the check: the logs' regime | M10 |
| 5 | Token row: a unit must fit in every window; prices summed, each kept | mechanism proven (A21, A25, A29, A30); assembly hypothesis (A71 confirmed, A72 in part) | No effect | Decides between the 5-hour, weekly and per-model windows | M2, M3 |
| 6 | A speculative copy of the unit expected to finish last, when the time saved is worth the summed price x its tokens; never for a unit long because it has more work | hypothesis (A64-A67; A80 in part) | Only from 10 workers at a 10 % cap | Rarely: a copy pays a whole unit at a high price | M10 (spread across reruns) |
| 7 | A reserved share for units that must not stall; a retry budget as a share of units | practice, self-reported, no gain measured (A31-A33, confirmed) | Small cost | Keeps critical work alive when windows bind | Share of reruns (from transcripts) |

**How far our scale is from the sources' conditions.** Balseiro, Lu and Mirrokni's bound holds for any number of
steps, but its constants are garbled in the text, so no number was read at tens of steps (A03, holds in part). The
no-early-stop gap of A05 is fixed in steps, so it is a larger share of a short horizon. The ad systems decide at 96
slots a day over billions of requests (A11), or every minute over tens of millions of page views (A14); we decide
tens to hundreds of times per window. BwK's term OPT[sqrt](m/B) is not small when B is tens of units (A25). Devanur et
al. need each request to be at most about [eps]^2 of each budget, so at tens of requests [eps] is not small (A26,
holds in part). Numbers at our size: a fixed price gets at least 90 % of the best dynamic policy at 25 units and 95 %
at 100, when there is time to sell all at the run-out price (A18, holds in part); in the authors' example the best
fixed price got at least 94.5 % with 1 to 20 items (A20, holds in part). Both assume a known demand. In the worst
case, the online-knapsack threshold keeps about 29 % of the offline optimum at U/L = 10 with a unit 5 % of the window
(A27, confirmed; the arithmetic is in A78). The backfilling logs match our unit lengths (73-188 min, A56) but have 1
to 2 orders more processors, one job on many, and 10^4 to 10^5 jobs. What carries is the shape. The fixed-price
examples suggest that at our size the gain lies in knowing demand and value, not in a fine loop (A19, A20; reasoned).

**Measurements (each needs the owner's word, rule 3, except where noted):**
- M1: window usage per unit by class and model, estimated before the start and counted after. A count over transcripts on disk; no run.
- M2: each window's size, and each model's and effort level's weight: the change of the 5-hour and weekly meters against tokens counted over many units. It gives k.
- M3: whether a unit on the separately limited model moves the all-models weekly meter.
- M4: how cached input counts in Claude Code windows.
- M5: whether an unspent part is lost at a reset, and what starts the next 5-hour period. This account's weekly reset time is read in Settings (no run).
- M6: units per window by class, the 5-hour windows opened per week, and the error of forecasting the rest of a window.
- M7: the largest unit's share of each window ([eps]0, [gamma]).
- M8: pass rate, window usage and redo cost per unit by kind of work and model.
- M9: a value or a ranking per unit.
- M10: the length distribution per class and model, the share of last-two predictions that run short, the tail, and the spread of length and tokens across reruns of the same unit.
- M11: usage of units in flight, and the lag of the provider's usage figure behind tokens spent.

## 4. Verdicts

**Gate:** 125 quotations STANDS, 1 ALTERED, 14 NO QUOTE; no MOVED or NOT FOUND. A10's ALTERED is a lost Greek
letter: the text reads "even with [alpha]i = 1" where the claim wrote "even with the multiplier of 1". The meaning
holds, so the quotation is fixed to the true text. The 14 NO QUOTE rows are A69 to A82, all hypotheses, which carry no
quotation.

**Refuter (two fresh contexts):** 48 CONFIRMED, 33 PARTIALLY, 1 REFUTED, 0 UNVERIFIABLE.

**Final:** confirmed 48 (46 published findings, plus A71 and A82, inferences that follow and stay hypotheses); holds in
part 33; refuted 1; cannot be checked 0.

Confirmed: A01, A02, A04, A07, A08, A09, A11, A12, A14, A15, A17, A21, A22, A23, A25, A27, A28, A29, A30, A31, A32,
A33, A34, A35, A36, A37, A38, A39, A42, A43, A46, A48, A53, A54, A55, A56, A57, A58, A59, A61, A62, A63, A64, A65,
A67, A68, A71, A82. A45 to A48 and A68 were checked against the earlier collector's notes
(`docs/program/evidence/bottleneck-2026-11-18/o2-quota.md`, `o2-classical.md`), not the paper texts, which are not in
`R:papers`. Figures the refuter added and the library records carry (A16, A20, A52, A59, A65, A79) were found at their
lines by this step. INTENT's figure for GPT 5 nano could not be placed in its table row and is left out.

Holds in part (the refuter's correction, in short):
- A03: the bound holds for any T >= 1; only the optimality of the order is asymptotic; its constants were not read.
- A05: no early stop needs a cap >= v_max/[rho] - 1 and a step with step x v_max <= 1; the gap is fixed in steps.
- A06: against the perfect pacing sequence, gradient pacing has vanishing regret even for adversarial values.
- A10: the quotation is fixed (above); "wins more auctions at lower prices" is the authors' stated reason, citing Balseiro et al. 2021, not a result of this paper.
- A13: Yahoo gives three reasons for throttling; decoupling pacing from the bid is the third.
- A16: campaign life is the time to spend 95 % of the budget; impressions per spend also rose 7.74 % and 10.52 %; over-delivery fell 3.8 to 3.4 % in Direct Ads.
- A18: the 90-97.5 % need time to sell every item at the run-out price ([lambda]*t >= n).
- A19: it also needs each instance (day, flight) priced on its own.
- A20: understated: Table 1 gives at least 94.5 % at 1 to 20 items.
- A24: what is re-solved is the value-function approximation; no industry is named.
- A26: it needs [gamma] = O([eps]^2/log(n/[delta])); at tens of requests per budget [eps] is not small.
- A40: the context-management cost is stated for claude.ai with code execution, not for Claude Code.
- A41: the wrap-up is only at the 5-hour limit, for a response already under way; once a week on Pro; nothing at the weekly limit.
- A44: five context-grounded sets, two with long documents; cost is a fixed unit ratio per query.
- A45: 3.66 times fewer GPT-4 calls than random routing to recover half the gap; the quality level differs by benchmark (95, 92, 87 %).
- A47: with a large gap the three routers lost 13.8, 13.1 and 10.3 %; only one beat random.
- A49: predicted difficulty bins worked too, at an uncounted cost of 2,048 verifier samples per question.
- A50: expense fell 59 %; accuracy went from 83.75 to 81.03 % on average and fell 8 points on the hardest set.
- A51: "six times" counts suppressions of the end of thinking, not a multiple of tokens.
- A52: cost is tool fees plus priced tokens; understated: on SWE-bench Verified the tracker raised resolve from 36.8 to 55.4 %.
- A60: a before-and-after observation in a cited study, not a controlled comparison.
- A66: the 32 % is before and after across builds, self-reported.
- A69: the clipped price is not zero whenever u <= s; the price form and re-planning are two rules.
- A70: lumpy units raise the price in bursts under the line; admission on expected tokens is outside A01's model.
- A72: under A05's rule both prices must be kept.
- A73: 33.6 only with work round the clock; a per-model window adds a second ratio.
- A74: the value includes a redo; usage is measured window usage; BwK is the published form.
- A75: the harm is a cut-off unit and its redo, not an overrun; x20-0460's latency margin is a second reserve.
- A77: no system measured value ranking and pacing on one baseline; the split is only suggestive.
- A78: A27 gives a worst-case number at any scale (about 29 % at U/L = 10, a unit 5 % of the window); A20 adds numbers for known demand.
- A79: for one-worker units it is first come, first served; the reservation rests on a stop at the cap.
- A80: a copy pays when the time saved is worth the summed price x its tokens; a 5 % cap is no worker at 3-16 workers, 10 % gives one from 10 workers.
- A81: longest first's bound needs exact lengths; the any-order bound needs none.

Refuted:
- A76, "the plan should reach the end of the window's allowance one unit length before the reset". The reserve for running units (A75) protects a unit started near the limit at any time, and ending early leaves the window idle for that length in every window. LinkedIn's fast finish exists to spend budget that forecast errors left unspent (`linkedin/paper.txt:78`), so any margin comes from measured forecast error. Not to be proposed again.

## 5. Not found, not opened, and errors in the collect files

**Not found in the sources read:**
- Pacing against two windows that refill on separate clocks and count the same tokens (allocation and pacing collects, "Unknown").
- A pacing price used to choose a model. BwK chooses arms with prices (A25), but no source applies it to models (llmbudget collect, last section).
- Throttling and bid shading measured against each other on one workload; value ranking and pacing measured against one baseline (A77).
- A team's account of hitting a usage limit and changing its design. The Anthropic post states no window (A54).
- Project scheduling with rough durations (A63).
- Window sizes, carry-over and cache weight on the plans (A36-A43).

**Not opened:**
- Balseiro and Gur 2019, and Balseiro, Kim, Mahdian and Mirrokni 2017/2021. Both are behind SSRN's bot check and publisher 403s, and neither is on arXiv. They need the owner's sign-in.
- Wang et al., SIGMETRICS 2017 (burstable instances): behind ACM's bot check.
- Mu'alem and Feitelson 2001: the PDF was saved, but it has no text layer and needs OCR, which needs the owner's word. Its finding rests on A58.
- Kolisch 1996: paywalled.
- ITU-T I.371: purchase only. The ATM Forum text (A30) was read instead.
- Tsafrir, Etsion and Feitelson TPDS 2007: replaced by the thesis, which holds the same work.
- Agrawal and Devanur 2015: introduction only, so summary grade.

**Read in part:**
- DMD, BwK and Devanur et al.: proofs not read; DMD's constants are garbled in the text.
- Zhou et al.: section 6 is truncated in the only copy.
- Mantri: evaluation numbers did not extract.
- INTENT and ITBC: gains not extracted beyond A53.
- AllocBench (arXiv 2607.23332): seen in a search listing, not opened.

**Searched:**
- Library: budget pacing, allowance, quota, window, knapsack, bid-price, revenue, bandits, threshold, token bucket, quota window, Graham list backfilling, Borg critical path straggler, cheaper, RouteLLM, FrugalGPT, Hybrid, budget.
- Web, by titles and topic words only: arXiv and its API, OpenAlex, Semantic Scholar (rate-limited), Unpaywall (needs an e-mail address, not used), scholar.archive.org, Wayback copies of authors' pages, and publishers' pages.

**Errors found in the collect files** (the claims and the library records carry the corrected form; step 5's
extractors must not copy these places):
- `R:a1-collect-longjobs.md` lines 10 and 47 call the Kolisch and Hartmann row 11.73 / 11.10 / 10.71 % "120 activities (J120)". It is the 60-activity table (`kolisch06/paper.txt:546`, caption `:623`); the 120-activity gaps are 31.24-34.07 % (`:630`, caption `:707`). A63 carries the correction. Line 10 also calls the 10.7 % "above optimum or lower bound": it is above the critical-path lower bound. The extractor records x47-0318 and x47-0319 already say J60.
- `R:a1-collect-llmbudget.md` line 64 calls AutoMix's tasks "short context-answer tasks". Two of the five sets are long documents (QASPER, QUALITY; `automix/raw.txt:333`) (A44).
- `R:a1-collect-llmbudget.md` line 8 says Snell's "difficulty came from an oracle check". The gain held with model-predicted difficulty too, whose cost of 2,048 verifier samples per question the analysis leaves out (`snell/raw.txt:182`, `:320-322`, `:786`) (A49).
- `R:a1-collect-allocation.md` line 24 puts our units in the band "where the bound is 90 to 97.5 %" without the condition that there is time to sell every item at the run-out price (`gvr/paper.txt:566-569`) (A18).

## 6. Proposed corrections

Library records: the result and the `open` record "proposed correction of <id>" for each are in
`library/journal/2026-11-19/a1.jsonl` (a1-0511 to a1-0518). The decision-rule lines are a document, not records: they
are listed for the top session.

| Record or rule line | What it says | Contradicted or narrowed by |
|---|---|---|
| o2-0501 | "No paper read schedules under a token allowance that refills in windows of hours or days ... the window's semantics (fixed or rolling, how cache reads count) must be measured" | Narrowed. Budgets paced over a known horizon are read (A01, A02, A04 confirmed; A05 in part), including 24-hour budgets in real systems (A11, A14 confirmed; A16 in part; self-reported), and several budgets at once (A21, A25 confirmed). No source models a refill inside a horizon (A04): a window that resets is one horizon, the next window a new one (hypothesis). The semantics are documented (A37, A38). Open: two clocks counting the same tokens, carry-over, cache weight in Claude Code, sizes |
| o2-0404 | "no paper bounds a window of hours or days"; unspent part lost "not known" | First part contradicted: the bounds are stated per number of steps for a horizon of any clock length (A03 in part: any T >= 1; A18, A20 in part: 1 to 400 items, known demand; A27 confirmed: any scale), and daily budgets were measured (A16 in part). Second part still unknown (A37, A38 say only "resets in full") |
| o2-0317 (note) | "no paper read bounds a window of hours or days" | As o2-0404. The result itself (Parekh and Gallager) is not questioned |
| r57-0408 | the allowance "limits how many run at once only when a window is nearly spent" | Narrowed by A82 (confirmed inference from A05, A11, A14): when demand exceeds the window, it limits starts from the moment u > s |
| r57-0409 | the allowance as one more width, "which no paper read covers, so that part is reasoning alone" | A29, A30 (the width: fit in every bucket); A21, A25 (the price), all confirmed. Only the assembly is a hypothesis. Its age cap has a published alternative, a reservation for the oldest waiting unit (A62, A55; A79 in part) |
| o2-0321 | "cut cost 3.66 times at 95 % of GPT-4 quality on MT Bench" | The 3.66 is fewer GPT-4 calls than random routing, to recover half the quality gap; 95 % of GPT-4 holds on MT Bench only (A45, in part) |
| o2-0320 | with a large gap the routers "lost 10.3 % at 40 %" | The three routers lost 13.8, 13.1 and 10.3 %; only the transformed router beat random (A47, in part) |
| x19-0701 (reason in a do_not list) | no speculative backup tasks "because they double token cost" | Narrowed by A64, A65, A67 (confirmed): only the tail is copied, within a few percent to 10 % of capacity. Per copied unit our cost is whole, so a copy is justified only when the time saved is worth the summed price x its tokens and the unit is slow from the run (A80, in part) |
| DECISION-RULE lines 42-44 | "Three parts have no paper among those read ... the token allowance ... units that last minutes with a handful of workers" | Allowance: A01, A02, A05, A11, A14, A21, A25. Minutes-long units: A55, A56 (mean 73-188 min). "A handful of workers" stays uncovered (100-1,152 processors, one job on many) |
| DECISION-RULE line 77 | "The mapping to our windows is reasoning: no paper" | Each part has a source (A21, A25, A29, A30, A36-A38); only the assembly is a hypothesis (A69-A73) |
| DECISION-RULE line 117 | "Nothing for a window of hours or days" | A16 (budget life +44 % / +149 %, daily budgets, self-reported, in part), A12 |
| DECISION-RULE line 150, item 6 | "whether the 5-hour window is fixed or rolling" | A37: anchored at the first message, resets in full five hours later. Cache weight is still to measure (M4) |
| DECISION-RULE line 171 | Not covered: "Tokens beside processor and memory, and any allowance that refills" | A25 (several budgets, time as one of them), A01 |
| DECISION-RULE line 175 | "Units that last minutes with 3 to 16 workers" | Partly: A55, A56 cover the unit lengths, not the worker count |
