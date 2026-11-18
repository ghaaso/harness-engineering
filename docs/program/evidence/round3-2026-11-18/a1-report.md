# a1 report (draft, step 2): a token allowance that refills, and a few long units

Draft of 2026-11-19 by the a1 analyse step (Opus). Claims are in `R:a1-claims.md` (A01 to A82); `R:` =
`docs/program/evidence/round3-2026-11-18/`. Nothing here has been past the gate or the refuter yet. No number is
guessed: where one is missing it is named as a measurement (M1 to M11, listed in (e)).

## 1. The answer

1. A window that resets is a budget to be paced over one known horizon. The published rule (proven: A01-A05) keeps one price per window. The price rises while the share of the window used runs ahead of the share of its time gone. It is zero while spend is at or under that line. A unit starts if its value is at least its tokens times the price (A69, A70: our reading, a hypothesis).
2. Several windows (5-hour, weekly, per-model weekly): a unit must fit in every window (A29, A30). Its price is the sum of the prices of the windows it draws on (A21, A25), not the dearer price alone. The sum equals the dearer price alone only while the other window's price is zero (A72, hypothesis).
3. The same price picks the model. The cheaper model does a unit when the dearer model's extra quality is worth less than the price times the extra tokens (A74, hypothesis). This needs quality per token by kind of work and model, which nobody has measured for code. The largest saving read at equal quality is 98.3 % in dollars, on one classification set, against the best single model (A46).
4. The provider's own pages (fetched 2026-11-19) say the 5-hour window starts at the first message and resets in full five hours later. The weekly window resets at a fixed time for each account, and some plans add a weekly window for one model (A36-A38). They give no window sizes, no carry-over rule and no weight for cached input in Claude Code.
5. For a few long units the largest measured gain on real logs is backfilling: a reservation for the first waiting job, shortest-first behind it, and lengths predicted from the last two jobs and corrected when a job overruns. It cut wait by 23 % and bounded slowdown by 37 % (A55). Exact lengths add almost nothing on wait (A55). Predictions that run short, left uncorrected, made results 4.5 to 5 times worse (A57).
6. Every bound read is asymptotic, or was measured at 10^4 or more steps. At our tens to hundreds of units per window only the shape carries (A78). Eleven measurements set the numbers (M1-M11).

## 2. The table

| Conclusion | From (claim ids) | Measured gain and its conditions | What the refuter left | Still a guess for model sessions | What it would change in our rule or tree |
|---|---|---|---|---|---|
| One window: price from the gap between share used u and share of time gone s; admit if value >= tokens x price | A01-A05, A10, A11 (read); A69, A70 (inferred) | No gain measured for the rule alone. Theory: never runs out early; regret of order [sqrt]T (A02, A03). Real system: budget life +44 % / +149 % (A16, LinkedIn, self-reported, daily budgets, tens of millions of page views) | pending | A value per unit (M9); the step size at tens of units (M6); u read in whole percent | Token row of step 1: a price per window, not only "the units the window can still pay for"; step 3 gate admits by the price |
| Several windows: fit in all; price = sum over the windows a unit draws on | A21-A25, A29, A30 (read); A71-A73 (inferred) | None measured. Sum asymptotically optimal at large volume (A22); "not optimal in general" | pending | Whether the two windows' costs add when they count the same tokens (A23); the size ratio k (M2); whether one-model use is charged twice (M3) | Token row: u, s and price for each window; the frame's "dearer price binds" is replaced by the sum |
| The price picks the model | A44-A48, A54 (read); A74 (inferred) | FrugalGPT 98.3 % / 73.3 % / 59.2 % lower cost (dollars) at the best single model's accuracy (A46); AutoMix over 50 % (A44); RouteLLM 3.66x against random routing at 95 % of GPT-4 (A45); none on code | pending | Quality per token by kind and model (M8); token weight of each model in the windows (M2) | Step 4, last sentence: the gap test becomes "gap worth less than price x extra tokens" |
| Ranking by value carries the gain; the loop carries budget life | A12, A16, A17 (read); A77 (inferred) | Cost per click -72 / -67 / -79 % from value layers against one global rate, same smoothness (A12, Yahoo, self-reported, 3 campaigns, 24 h) | pending | A value measure per unit (M9) | Step 4 order when any price is above zero: value per token first |
| Fast finish and a reserve for tokens in flight | A15, A17, A41 (read); A75, A76 (inferred) | Over-delivery 4.12 % to 2.39 % (A16, self-reported) | pending | Whether unspent allowance is lost at a reset (M5); tokens in flight (M11) | Token row: the reserve = tokens of running units; the plan ends one unit length before the reset |
| The provider's facts | A36-A43 (read, fetched 2026-11-19) | Not a gain | pending | Sizes, carry-over, cached input, double charge, weights (M2-M5) | Rule's measurement 6: "fixed or rolling" is answered; o2-0501 narrowed |
| Backfilling with a reservation, shortest first, corrected predictions | A55-A62 (read); A79 (inferred) | Wait -23 %, bounded slowdown -37 % (EASY++ against EASY), four real logs, 100-1,152 processors, 28,490-223,407 jobs, mean run 73-188 min (A55, A56; simulation replay) | pending | Whether it holds at 3 to 16 workers; length spread by class and model (M10) | Step 4: a reservation for the oldest unit that does not fit replaces the age cap; step 0 keeps the last two lengths per class and model |
| Error direction matters more than accuracy | A57, A58 (read) | Uncorrected predictions: +49 % accuracy but wait +454 %, slowdown +515 % (A57); doubling estimates helps (A58) | pending | Share of our predictions that run short (M10) | A unit's cap is an upper limit, never the prediction; overrun raises the prediction |
| Speculative copies only when no window is short | A64-A67 (read); A80 (inferred) | LATE 27 % faster (58 % with stragglers) than Hadoop's own copies (A65); Dolly 34-46 % within 5 % capacity (A67); MapReduce 44 % (A64), Mantri 32 % (A66), both self-reported | pending | Whether our lengths have a heavy tail (M10); a copy costs a whole unit's tokens | The do_not "no speculative copies" (x19-0701) holds only while a window's price is above zero |
| A fixed batch: longest first has the tighter bound | A68 (library); A81 (inferred) | Worst case 4/3 - 1/(3m) against 2 - 1/m (analytic) | pending | Lengths known only roughly | Step 4: for a batch that must all finish, longest first; for a stream, shortest first |
| Scale: only the shape carries | A03, A18, A25-A27 (read); A78 (inferred) | Only explicit small-n bound: 90 % at 25 units, 95 % at 100 (A18, known demand) | pending | Every constant | Every number of the token and scheduling steps is a measurement (M1-M11) |

### The frame of the lane file, part by part

- "One price, rising as the budget runs short for the time left": **holds** (A01, A05, A11). In ratio form the price follows the gap u - s (A69). The re-planned target rate is (1 - u)/(1 - s) times the even rate (A11).
- "Two nested windows, the dearer price binds": **does not hold as stated.** Every source with several budgets charges the sum of their prices (A21, A25, A26), and admission needs every bucket (A29, A30). The dearer price alone is right only while the other price is zero (A72).
- "The price also answers which model": **no source read does this.** It is our inference (A74). It mirrors the bid shading of A08, where a cheaper model is a shaded bid.
- "For a few long units the gain is in what starts next and what fills the gap": **holds** (A55, A60, A62). The control loop of the ad systems does not carry at tens of units: LinkedIn's fixed 10 % step moves less than one unit (A14, reasoned in the collect file).

## 3. The five points

### (a) The rule for spending a refilling allowance

**One window.** Let u be the share of the window used and s the share of its time gone. The price follows the gap u - s and is clipped at zero (A69). It comes from the gradient pacing rule. That rule moves the multiplier by the step size times (spend - budget/T) each round, inside [0, cap] (A05). Summed from zero, that is the step size times the budget times (u - s). A unit starts if its value is at least its expected tokens times the price (A01, A70). The re-planned form gives the same thing as a rate: spend the next stretch at (1 - u)/(1 - s) of the even rate (A11; Talluri and van Ryzin note that practice re-solves often, A24). Fast finish: plan to reach u = 1 one unit length before the reset (A15, A76). Keep back the tokens of running units (A17, A75).
- Source of each part: the price and its update, A01 and A05 (proven); the never-early property, A02 and A05 (proven for adversarial values too); remaining over remaining, A11 (self-reported); fast finish, A15 (self-reported); the reserve, A17 (self-reported). The mapping to our window is a hypothesis (A69).
- It must know: u per window (the meter); s (the clock, with the window's start, A37, A38); tokens per unit by class and model, estimated before the start and charged after (M1, M2); units per window to set the step size, about 1/[sqrt]T in A03 (M6); a value per unit, or at least a ranking (M9).

**Two nested windows, and a per-model window.** Each window gets its own u_j, s_j and price. A unit is admitted only if its estimate fits in every window it draws on (A29, A30). Its price is the sum of the prices of those windows (A21, A25, A26). A unit on the separately limited model also draws on that model's weekly window (A38). Whether it draws on the all-models week too is not documented (M3).
- Summed or dearest alone: **summed**, from Talluri and van Ryzin (A21), with BwK (A25) and Devanur et al. (A26) keeping one price per budget. No source read uses the dearest alone. In practice the sum equals the dearest alone whenever only one window is ahead of its line (A72). The sum is exact only when costs are additive (A23), and that is not shown for two windows that count the same tokens.
- Which window binds over a week is one ratio: k = weekly size / 5-hour size. With work round the clock, the week binds on average when k is under 33.6 (A73; M2).
- How it was reached: the update rules and acceptance tests were read in A01, A05 and A21. The ratio form is arithmetic on A05. The nesting is a hypothesis built from the two-bucket specifications A29 and A30.

### (b) Choosing between a dearer and a cheaper model

The rule: the cheaper model does the unit when (value of the dearer model's result - value of the cheaper one's) < (sum of the prices of the windows charged) x (extra tokens). The extra tokens are counted in each window's own weight for that model (A40 says the model changes the charge; no weights are given). At price zero the better model runs and tokens only break ties (A74, hypothesis).
- The measurement it needs (M8): for each kind of unit and each model, the share passing our check and the tokens per unit. The library already says the gap must be measured per kind of work (o2-0407). RouteLLM's routers trained on chat were no better than random on MMLU (A45).
- Largest saving read at equal quality: FrugalGPT, 98.3 % lower cost in dollars on HEADLINES against the best single model, GPT-4 (A46; classification, March 2023 prices). Others: AutoMix over 50 % at comparable performance against always-GPT-4, with fixed cost ratios (A44). Mixture-of-thought cascades: 0.929 against 0.931 at 40 % of the cost (A48). RouteLLM: 3.66x against random routing at 95 % of GPT-4 (A45). None is in tokens on code. A self-reported account says a better model gained more than double the token budget (A54).
- How it was reached: no source read applies a pacing price to the choice of model (llmbudget collect, last section). The rule is A01's acceptance test applied to two versions of one unit, with A08's shading versus throttling as the nearest published form.

### (c) The facts of our windows (provider documentation, fetched 2026-11-19)

- "a session limit that resets every five hours, and weekly limits that reset once every week" (A36, `p1.txt:102`).
- "The period starts when you send your first message, and your limit resets in full five hours later." (A37, `p1.txt:107`). So it is neither a fixed clock nor a rolling sum: it is anchored at the first message.
- "Weekly limits apply across all models, and some plans also have a separate weekly limit for Fable. Weekly limits reset at a fixed time each week that is assigned to your account ... you receive your full weekly allowance each cycle." (A38, `p1.txt:111`). Also "Max and Ultra plans also have a separate weekly limit for Fable" (`p2.txt:123`).
- claude.ai, Claude Code and Desktop count "towards the same usage limit" (A39). Length, features, model and effort level count. Automatic context management costs more (A40).
- At a limit, a session may finish the step in progress on a "small and capped" wrap-up allowance that counts toward the weekly limit (A41).
- Cached content in claude.ai projects "counts less against your limits when reused", and caches expire after inactivity (A42). The API's token bucket and its cache-read exemption (A35) are API rules, not plan rules.
- Limits may be adjusted "at our discretion" (A43).
- **Unknown (named as measurements):** the size of each window in tokens and the ratio k (M2). Whether an unspent part carries over, and what starts the next 5-hour period after a reset (M5). How cached input counts in Claude Code (M4). Whether one-model use is charged to both weekly windows (M3). The weights of output, thinking and effort (M2). The reset time of this account (read in Settings, no run).

### (d) A few long units

- **Largest measured gain for what starts next: EASY++** (A55). Its parts: backfilling with a reservation for the first waiting job (A62); later jobs shortest first; lengths predicted as the mean of the same user's last two jobs (A59), raised when a job outlives its prediction. Against EASY with user estimates, averaged over four real logs: wait -23 %, bounded slowdown -37 % (A55). The logs had 100-1,152 processors, 28,490-223,407 jobs, mean run 73-188 minutes and load 56-84 % (A56), replayed in a simulator.
- **How the gain falls as the length estimate worsens** (A55, A57, A58):

| Length information | Accuracy (mean run / estimate) | Wait | Bounded slowdown |
|---|---|---|---|
| Exact (PERFECT++) | 100 % | -22 % | -47 % |
| Predicted, corrected when outlived (EASY++) | about 60 % | -23 % | -37 % |
| Users' estimates, shortest first only (EASY+SJBF) | 31-47 % | -10 % | -22 % |
| Predicted, not corrected | +49 % over users' | +454 % | +515 % |

  So it needs an upper limit that is not too short (the kill limit, A61) and a correction when a unit overruns. The direction of the error matters, not its mean. Doubling every estimate helps, but less than predicting and correcting (A58). More history made predictions worse (A59).
- Straggler copies have larger percentages: LATE 27 % (58 % with stragglers induced) against Hadoop's own copies (A65); Dolly 34-46 % within 5 % of capacity (A67). Both were measured on clusters of 150-200 machines, with tasks of seconds to minutes and copies of the tail only. A copy of our unit costs its whole token count (A80).
- For a fixed batch that must all finish, longest first has a worst case of 1.22-1.31 against 1.67-1.94 for any order, with 3 to 16 workers (A68, A81). With exact durations, project-scheduling search gets within 0.10 % of the optimum at 30 activities. At 60 and 120 activities it stays 10.7-11.7 % and 31.2-34.1 % above a lower bound (A63). There is no result for rough durations.
- How it was reached: the figures were read from Table 4.3 and Table 4.1 of the thesis (A55, A57). The averages were checked by arithmetic on the four rows. The mapping to our units is A79 (hypothesis).

### (e) What each part changes in the rule, ranked by expected gain

The ranking is reasoned, not measured. When demand exceeds a window, the units done per window equal the window divided by the tokens per unit. Only the model choice changes the tokens per unit at equal quality. Ranking by value changes which units get done. The pacing loop changes when they run.

| Rank | Change to the rule | Mark | Small project (demand under the windows) | Very large project (windows bind every week) | Measurement that sets it |
|---|---|---|---|---|---|
| 1 | Step 4: the cheaper model where the gap is worth less than the price x extra tokens | hypothesis (mechanism A01; savings A44-A48 on non-code) | Price zero: the better model; tokens break ties | Active on every unit; the per-model weekly window adds its price | M8, M1, M2 |
| 2 | Step 4 order when a price is above zero: value per token first | hypothesis (A12, self-reported) | Inactive | The main lever on what a week buys | M9 |
| 3 | Token row: a price per window from u_j - s_j; fast finish; a reserve for tokens in flight | mechanism proven (A01-A05, A15, A17); mapping hypothesis | Inactive except the reserve | Prevents a stop before the reset; the week binds when k < 33.6 | M2, M5, M6, M11 |
| 4 | Step 4: a reservation for the oldest unit that does not fit (replaces the age cap); shortest first behind it; lengths from the last two units of the class and model, corrected on overrun | mechanism proven (A55-A62); our scale hypothesis | Few units waiting: little gain | Many units waiting on a window, memory or the check: the logs' regime | M10 |
| 5 | Token row: a unit must fit in every window; price summed | mechanism proven (A21, A29, A30); additivity hypothesis (A23) | No effect | Decides between the 5-hour, weekly and per-model windows | M2, M3 |
| 6 | Speculative copy of the unit expected to finish last, capped at one worker, only at price zero, never for a unit long because it has more work | hypothesis (A64-A67, A80) | Possible, since tokens are free at price zero | Off | M10 (tail) |
| 7 | A reserved share for units that must not stall; a retry budget as a share of units | proven as practice, self-reported, no gain measured (A31-A33) | Small cost | Keeps critical work alive when windows bind | Share of reruns (from transcripts) |

**How far our scale is from the sources' conditions.** Pacing bounds (A03, A07) are asymptotic in the number of rounds. The ad systems decide at 96 slots a day over billions of requests (A11), or every minute over tens of millions of page views (A14). We decide tens to hundreds of times per window, four to six orders of magnitude fewer. The regret term is an unknown constant times 1/[sqrt]T: 0.1 to 0.3 of the optimum at T = 100 to 10 (A78). BwK's OPT[sqrt](m/B) is not small when B is tens of units (A25). Devanur et al. need each request to be a tiny share of each budget (A26). Zhou et al. lose a factor 1/(1 - [eps]0) when one unit is a share [eps]0 of the window (A27). The only explicit bound at our size is 90 % at 25 units and 95 % at 100, and it assumes a known demand (A18). The backfilling logs match our unit lengths (73-188 min, A56) but have 1 to 2 orders more processors and 10^4 to 10^5 jobs.

**Measurements (each needs the owner's word, rule 3, except where noted):**
- M1: tokens per unit by class and model. A count over transcripts on disk; no run (rule item 6).
- M2: each window's size and each model's weight. The change of the 5-hour and weekly meters against tokens counted over many units, which gives k.
- M3: whether a unit on the separately limited model moves the all-models weekly meter.
- M4: how cached input counts in Claude Code windows.
- M5: carry-over at a reset, and what starts the next 5-hour period.
- M6: units per window by class.
- M7: the largest unit's share of each window ([eps]0, [gamma]).
- M8: pass rate and tokens per unit by kind of work and model.
- M9: a value or ranking per unit.
- M10: the length distribution per class and model, the share of last-two predictions that run short, and the tail.
- M11: tokens of units in flight.

## 4. Not found, and not opened

**Not found in the sources read:**
- Pacing against two windows that refill on separate clocks and count the same tokens (allocation and pacing collects, "Unknown").
- A pacing price used to choose a model (llmbudget collect, last section).
- Throttling and bid shading measured against each other on one workload (pacing collect).
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
- DMD, BwK and Devanur et al.: proofs not read.
- Zhou et al.: section 6 is truncated in the only copy.
- Mantri: evaluation numbers did not extract.
- INTENT and ITBC: gains not extracted.
- AllocBench (arXiv 2607.23332): seen in a search listing, not opened.

**Searched:**
- Library: budget pacing, allowance, quota, window, knapsack, bid-price, revenue, bandits, threshold, token bucket, quota window, Graham list backfilling, Borg critical path straggler, cheaper, RouteLLM, FrugalGPT, Hybrid, budget.
- Web, by titles and topic words only: arXiv and its API, OpenAlex, Semantic Scholar (rate-limited), Unpaywall (needs an e-mail address, not used), scholar.archive.org, Wayback copies of authors' pages, and publishers' pages.

## 5. Proposed corrections

| Record or rule line | What it says | Contradicted or narrowed by |
|---|---|---|
| o2-0501 | "No paper read schedules under a token allowance that refills in windows of hours or days ... the window's semantics (fixed or rolling, how cache reads count) must be measured" | Narrowed. Budgets paced over a known horizon are read (A01-A05), including 24-hour budgets in real systems (A14-A16, self-reported), and several budgets at once (A21, A25). The semantics are documented (A37, A38). Open: two clocks counting the same tokens, carry-over, cache weight, sizes |
| o2-0404 | "no paper bounds a window of hours or days"; unspent part lost "not known" | First part contradicted: the bounds are in steps for any horizon (A03, A18), and daily budgets were measured (A16). Second part still unknown (A37, A38 say only "resets in full") |
| r57-0408 | the allowance "limits how many run at once only when a window is nearly spent" | Narrowed by A82 (from A01, A05, A14): when demand exceeds the window, it limits starts from the moment u > s |
| r57-0409 | the allowance as one more width, "which no paper read covers, so that part is reasoning alone" | A29, A30 (the width: fit in every bucket); A01, A21 (the price) |
| DECISION-RULE lines 42-44 | "Three parts have no paper among those read ... the token allowance ... units that last minutes with a handful of workers" | Allowance: A01-A05, A21, A25. Minutes-long units: A55, A56 (mean 73-188 min). "A handful of workers" stays uncovered (100-1,152 processors) |
| DECISION-RULE line 77 | "The mapping to our windows is reasoning: no paper" | Each part has a source (A21, A29, A30, A36-A38); only the assembly is a hypothesis (A69-A73) |
| DECISION-RULE line 117 | "Nothing for a window of hours or days" | A16 (budget life +44 % / +149 %, daily budgets, self-reported), A12 |
| DECISION-RULE line 150, item 6 | "whether the 5-hour window is fixed or rolling" | A37: anchored at the first message, resets in full five hours later. Cache weight is still to measure (M4) |
| DECISION-RULE line 171 | Not covered: "Tokens beside processor and memory, and any allowance that refills" | A25 (several budgets, time as one of them), A01 |
| DECISION-RULE line 175 | "Units that last minutes with 3 to 16 workers" | Partly: A55, A56 cover the unit lengths, not the worker count |
| o2-0321 | "cut cost 3.66 times at 95 % of GPT-4 quality" | Its cited place says the saving is "over random routing" (A45). The record lacks its baseline |
| x19-0701 (reason in a do_not list) | no speculative backup tasks "because they double token cost" | Narrowed by A64, A65, A67: only the tail is copied, capped at 5-10 % of capacity. Per copied unit our cost is whole (A80), so the do_not holds while a window's price is above zero |
| `R:a1-collect-longjobs.md` lines 10 and 47 (not a record) | the 11.73 / 11.10 / 10.71 % row is "120 activities (J120)" | It is the J60 table; J120 is 31.24-34.07 % (A63). The longjobs extractor must not record the J120 label |
