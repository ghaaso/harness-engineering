# Addendum pre-review list — cards from sources published or first readable after the first pass

Built from the addendum sweep (R47, R48, R49, R50, R51, R52, R53, R54, R55). 311 cards, numbered C1907 onward (the first pass ended at C1906). Nothing here is scored. Each card carries the family the mapping stage attached it to (one of the 838 fixed families, never re-clustered) and the relation: restates, supports, updates (the author changed a number or position the family records), contradicts, or NEW (no family makes this claim).

### C1907 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (not in inventory)
- **Claim:** The article adds a caveat the repo report lacks: Astra and Sol seem to do better at xhigh on this benchmark, so the medium-beats-xhigh result is model-specific (Opus 5.5 clearly), not universal.
- **Quote:** "Astra/Sol models *do* seem to perform better on xhigh, for this benchmark"
- **Evidence:** measured — Single runs; Astra 29 to 32 strict at xhigh; but SOL 6 went 30 to 26 per the chart, so the article's Sol remark is looser than the data.
- **Bears on:** L1 · **Landing guess:** Per-model effort routing, not a blanket downgrade of verifiers from xhigh to medium. · **Reader:** R47 (R47-1)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** contradicts · also G4-F022 (supports) · Caveat that Astra does better at xhigh, so medium-beats-xhigh is model-specific (Opus), not universal.

### C1908 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Xhigh cost 2.11x to 4.22x medium across the three complete model pairs, and Opus 5.5 did better at medium than at xhigh.
- **Quote:** "XHigh costs 2.11-4.22x as much as Medium in the three complete pairs"
- **Evidence:** measured — Three pairs, one run each; Opus 28 vs 25 strict.
- **Bears on:** L1 · **Landing guess:** Evidence for testing medium effort on harness verifiers and refuters. · **Reader:** R47 (R47-2)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** supports · also G4-F035 (supports) · Restates 2.11-4.22x xhigh cost across three pairs with Opus better at medium.

### C1909 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Every model and effort setting was run exactly once (one campaign per setting, seed 42), so run-to-run variance is unmeasured and the effort comparisons are single samples.
- **Quote:** "I ran each model and effort setting once."
- **Evidence:** measured — Repeated in the article, and the cost chart notes 'No repeated seeds'.
- **Bears on:** L1, L3 · **Landing guess:** A reminder to repeat harness-effort trials before acting on a single comparison, including P1. · **Reader:** R47 (R47-3)
- **Family:** G4-F022 (adopt) — Single-run benchmark differences (including medium vs xhigh) cannot separate effort from run-to-run variance; treat 1-4 strict-pass gaps as noise unless repeate · **Relation:** supports · also G4-F014 (supports) · Each setting run once, seed 42, so variance unmeasured and comparisons are single samples.

### C1910 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** He explicitly says the effort result does not prove that more reasoning hurts coding, only that higher effort was not a reliable way to buy more strict passes.
- **Quote:** "One campaign per setting can't tell me how much is run-to-run variation."
- **Evidence:** measured — Hedge wording in the article, matching the report; the title still says 'considered harmful'.
- **Bears on:** L1 · **Landing guess:** Treat the effort finding as hypothesis-grade when setting verifier effort. · **Reader:** R47 (R47-4)
- **Family:** G4-F022 (adopt) — Single-run benchmark differences (including medium vs xhigh) cannot separate effort from run-to-run variance; treat 1-4 strict-pass gaps as noise unless repeate · **Relation:** supports · also G4-F034 (supports) · Author hedges that the result does not prove more reasoning hurts; one campaign cannot separate variation.

### C1911 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Cheapest campaign (GPT-6.1 SOL Medium, $178.51) matched Astra Medium's strict count, while Fable at about 8.68x the cost got three fewer strict passes, so cost and quality are decoupled.
- **Quote:** "GPT-6.1 Medium has the lowest recorded cost at $178.51"
- **Evidence:** measured — Recorded cost, not invoice; Fable $1,550.07 with 26 strict vs 29.
- **Bears on:** L1, L3 · **Landing guess:** Cost-per-verdict thinking when choosing models for reviewers. · **Reader:** R47 (R47-5)
- **Family:** G4-F035 (skip) — Cost is a weak predictor of outcome across models: the priciest configuration did not lead and ~5-8x spend bought ~2 points or fewer strict passes. · **Relation:** supports · also G4-F036 (contradicts) · Cheapest campaign ($178.51) matched Astra Medium strict count; Fable at ~8.68x cost got fewer strict passes.

### C1912 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** He reverses his first instinct to exclude scratch and temp files from quality scores after Gabe argued that if humans are not reading the code, leftover junk must be measured, so tests, scratch and generated copies get no free pass.
- **Quote:** "the benchmark should measure how much garbage models leave in the codebase."
- **Evidence:** anecdotal — Change of position, attributed to a chat with Gabe Orlanski.
- **Bears on:** L3, W2 · **Landing guess:** Closing checks should count leftover scratch files; a cleanliness gate on agent working directories. · **Reader:** R47 (R47-6)
- **Family:** G4-F068 (trial) — Scratch files, tests and generated copies should count against quality because leftover garbage must be measured when humans are not reading the code. · **Relation:** updates · Author reverses initial instinct to exclude scratch/temp files after Gabe's argument; same claim, position change recorded.

### C1913 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (not in inventory)
- **Claim:** If humans are not reading agent code, the output has to be measured by tooling, which is the case for backpressure and verifier scripts.
- **Quote:** "If we're not reading the code, we need to measure it."
- **Evidence:** asserted — Principle stated while defending the choice to include scratch code.
- **Bears on:** L3, W2 · **Landing guess:** Measured gates (lint, scanners) in place of self-reported compliance. · **Reader:** R47 (R47-7)
- **Family:** G4-F068 (trial) — Scratch files, tests and generated copies should count against quality because leftover garbage must be measured when humans are not reading the code. · **Relation:** supports · also G4-F070 (supports) · Principle: if not reading the code, measure it with tooling.

### C1914 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Opus 5.5 xhigh left the lowest slop coverage (77.75%) against 94.25% at medium, yet had fewer strict passes (25 vs 28), so effort trades test passing against code cleanliness.
- **Quote:** "Opus XHigh has the lowest slop percentage at 77.75%, versus 94.25% for Opus Medium."
- **Evidence:** measured — 28 matched problems, SLOC-weighted; single run per setting.
- **Bears on:** L1, L3 · **Landing guess:** Effort routing should depend on what the task needs (pass tests vs maintainability). · **Reader:** R47 (R47-8)
- **Family:** G4-F037 (skip) — Higher effort can buy cleaner code while lower effort buys more passes: Opus 5.5 XHigh left far less slop-flagged code than Medium despite fewer strict passes,  · **Relation:** supports · Opus XHigh 77.75% slop coverage vs 94.25% Medium with fewer strict passes; adds figures.

### C1915 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** The article's pull-quote says xhigh code was about 5x cleaner despite fewer strict passes; this '~5x' framing is not backed by the 77.75 vs 94.25 percentage figures (about 3.6x lower unflagged share ratio at most), so the headline is loose.
- **Quote:** "Opus 5.5. XHigh wrote code that was close to ~5x cleaner."
- **Evidence:** asserted — Pull-quote in both report and article; 5x is not derived from the stated percentages.
- **Bears on:** L1 · **Landing guess:** Do not rely on the 5x figure; treat as directional. · **Reader:** R47 (R47-9)
- **Family:** G4-F037 (skip) — Higher effort can buy cleaner code while lower effort buys more passes: Opus 5.5 XHigh left far less slop-flagged code than Medium despite fewer strict passes,  · **Relation:** contradicts · The ~5x cleaner pull-quote is not backed by the 77.75 vs 94.25 percentages; headline is loose.

### C1916 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** The 200+ linter battery was built from patterns of earlier agent-authored PRs, so new models may produce slop that existing linters miss, which means a fixed verifier set goes stale.
- **Quote:** "These new models may produce new maintainability anti-patterns that we haven't built linters for yet"
- **Evidence:** asserted — Speculation, with a promised follow-up from Gabe.
- **Bears on:** L3, W2 · **Landing guess:** Backpressure rules and verifier checklists need periodic refresh against new model output. · **Reader:** R47 (R47-10)
- **Family:** G4-F008 (trial) — Encode recurring defect shapes and domain invariants as deterministic lint, typed and import rules (one new linter per anti-pattern) instead of adding prompt, m · **Relation:** supports · also G4-F085 (supports) · Fixed linter set goes stale as new models make anti-patterns not yet linted; one new linter per anti-pattern needed.

### C1917 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Strict pass rate rose only 14.8% to 16.3% from May to September, and he expects 'keeping the lights on for a while to come', meaning slow gains in multi-checkpoint maintenance.
- **Quote:** "We're getting better at maintaing a codebase over time (14.8% to 16.3% during may->september)"
- **Evidence:** measured — Different subsets are not comparable; this uses the full benchmark v1.0 vs the May official figure.
- **Bears on:** L3 · **Landing guess:** Plan for verifiers and human review to stay load-bearing; do not assume models drop the need. · **Reader:** R47 (R47-11)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** restates · 14.8% to 16.3% strict May to September; slow maintenance gains.

### C1918 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Agents get core behavior right far more often than they keep all tested behavior working as requirements change (core 65.8-74.0% vs strict 12.2-16.3%), so regressions are the main failure mode.
- **Quote:** "the agents get the main behavior right much more often than they keep all tested behavior working"
- **Evidence:** measured — Ten complete campaigns, 196 checkpoints each.
- **Bears on:** L3, W3 · **Landing guess:** Regression-style verifiers over earlier work in each phase; cold-resume trial checks old facts survive. · **Reader:** R47 (R47-12)
- **Family:** G4-F021 (already-done) — Regression is the dominant failure: core pass is 66-74% but strict only 12-16%, erosion stays flat across months and packs, and final code still fails hundreds  · **Relation:** supports · also G4-F020 (supports) · Core 65.8-74.0% vs strict 12.2-16.3% across ten campaigns, 196 checkpoints; regressions dominate.

### C1919 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Sample size moved from 3 to 6 to 36 problems (196 checkpoints), so earlier subset results (including Fable's 30%) cannot be compared; he distrusts his own earlier small-subset numbers.
- **Quote:** "36 problems and 196 checkpoints per setting"
- **Evidence:** measured — Self-correction on comparability of earlier writeups.
- **Bears on:** L3 · **Landing guess:** Do not generalise from small trials; state sample size next to every harness claim. · **Reader:** R47 (R47-13)
- **Family:** G4-F023 (adopt) — Measurement hygiene for any A/B: pin the sample set, prompt, seed and verifier/test-suite version, and never compare subset scores across runs or against the fu · **Relation:** supports · Sample moved 3 to 6 to 36 problems, so earlier subset results are not comparable; author distrusts his earlier numbers.

### C1920 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** For reproducibility he pins catalog version, prompt, seed, pass policy and Docker with Python 3.12 and uv, a pinned-conditions benchmark protocol.
- **Quote:** "the pinned v1.0 catalog, the stock just-solve prompt, seed 42, the any-case runner pass policy"
- **Evidence:** asserted — Repro recipe.
- **Bears on:** L1, L3 · **Landing guess:** Pin conditions when the harness runs its own effort or routing trials. · **Reader:** R47 (R47-14)
- **Family:** G4-F023 (adopt) — Measurement hygiene for any A/B: pin the sample set, prompt, seed and verifier/test-suite version, and never compare subset scores across runs or against the fu · **Relation:** supports · Pins catalog version, prompt, seed, pass policy and Docker with Python 3.12 and uv.

### C1921 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Each checkpoint builds on prior checkpoints' code and counts equally, so problems with more checkpoints weigh more; a failure early can persist.
- **Quote:** "Each checkpoint counts equally toward the pass rate"
- **Evidence:** asserted — Scoring rule.
- **Bears on:** L3 · **Landing guess:** nowhere obvious · **Reader:** R47 (R47-15)
- **Family:** G4-F020 (already-done) — Grade on strict pass (new tests plus all inherited regression tests), not isolated pass, because an early defect carries forward and regressions are the real fa · **Relation:** supports · Each checkpoint builds on prior code and counts equally; early failures persist.

### C1922 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Astra xhigh's lead (32) over SOL 6.1 medium (29 strict) is described as only two checkpoints, though the table shows three; the article treats the top ranks as near-ties.
- **Quote:** "Astra XHigh has the most strict passes in this snapshot. But it's lead over SOL 6.1 Medium is only two checkpoints."
- **Evidence:** measured — Table says 32 vs 29; he says two, likely comparing to SOL 6 Medium at 30. Inconsistent wording.
- **Bears on:** L1 · **Landing guess:** nowhere obvious · **Reader:** R47 (R47-16)
- **Family:** G4-F014 (already-done) — Best frontier models reach only about 12-33% strict pass on multi-checkpoint SlopCodeBench, so the benchmark is unsaturated and unattended maintainability is fa · **Relation:** supports · Top ranks are near-ties (Astra xhigh 32 vs 29); author's 'two checkpoints' wording is inconsistent with the table.

### C1923 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (inventory: 2026-10-15 essay entry (line 80))
- **Claim:** Average complexity is gameable by splitting into helpers and fewer lines is not automatically better, so single metrics mislead and need to be read together.
- **Quote:** "splitting code into more helper functions can lower average complexity without making the code easier to change"
- **Evidence:** asserted — Caveat on the callables chart.
- **Bears on:** L3 · **Landing guess:** Avoid single-number quality gates; pair metrics. · **Reader:** R47 (R47-17)
- **Family:** G4-F011 (skip) — No single quality metric is safe as a gate: mean complexity can be gamed by splitting helpers, lower duplication may mean less consistency, models degrade in di · **Relation:** supports · Average complexity gameable by splitting into helpers; single metrics mislead.

### C1924 · 2026-10-27 · Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article)
- **Source:** x-article, Dex, read — <https://x.com/dexhorthy/status/2115115507183685850> (not in inventory)
- **Claim:** He expects a follow-up (Part II) from Gabe and the SCB team with a qualitative slop-pattern deep dive and new linters, and that findings should reach the main leaderboard soon; a live video breakdown with Vaibhav also exists.
- **Quote:** "Part II"
- **Evidence:** asserted — Forward-looking statement; the tweet text notes leaderboard inclusion soon.
- **Bears on:** L3 · **Landing guess:** Watch for Part II before acting on the slop-metric findings. · **Reader:** R47 (R47-18)
- **Family:** NEW · **Relation:** new · Forward-looking: Part II qualitative slop-pattern deep dive, new linters, leaderboard inclusion and a live video; no family makes this claim.

### C1925 · 2026-10-15 · scb-3-effort.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-effort.png> (not in inventory)
- **Claim:** The chart's footnote says the medium and xhigh pairs differ in date and agent version, so effort is confounded with time and agent build, and Opus Max and GPT-6.1 XHigh are excluded.
- **Quote:** "Single campaigns at different dates/agent versions: these pairs do not isolate effort"
- **Evidence:** measured — Chart footnote; the repo text only says 'single runs'. Costs: Opus $193.47 vs $817.04; Astra $261.05 vs $758.62; SOL $245.69 vs $517.32.
- **Bears on:** L1 · **Landing guess:** Treat the effort finding as confounded. · **Reader:** R47 (R47-19)
- **Family:** G4-F022 (adopt) — Single-run benchmark differences (including medium vs xhigh) cannot separate effort from run-to-run variance; treat 1-4 strict-pass gaps as noise unless repeate · **Relation:** supports · also G4-F034 (contradicts) · Chart footnote: medium and xhigh pairs differ in date and agent version, so effort is confounded; Opus Max and GPT-6.1 XHigh excluded.

### C1926 · 2026-10-15 · scb-3-effort.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-effort.png> (not in inventory)
- **Claim:** Strict deltas going to xhigh: Opus -3, Astra +3, SOL -4, so two of three models lost strict passes at roughly 2x to 4x the cost.
- **Quote:** "Medium to XHigh: Opus 28 to 25; Astra 29 to 32; GPT-6 SOL 30 to 26."
- **Evidence:** measured — Chart: strict rates 14.29/12.76, 14.80/16.33, 15.31/13.27 percent.
- **Bears on:** L1 · **Landing guess:** Medium-effort trial for reviewers. · **Reader:** R47 (R47-20)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** supports · also G4-F035 (supports) · Strict deltas going to xhigh: Opus -3, Astra +3, SOL -4 at roughly 2-4x cost.

### C1927 · 2026-10-15 · scb-3-pass-rates.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-pass-rates.png> (not in inventory)
- **Claim:** Chart gives per-campaign strict/core counts out of 196 (e.g. Astra XHigh 32/136, SOL Medium 30/133, 6.1 SOL Medium 29/129, Opus Medium 28/145, Fable XHigh 26/142, GLM 24/130); the chart shows GPT-5.6 SOL XHigh core 139 while the report table lists 70.92% (consistent).
- **Quote:** "Strict scores stay low. Core success is much higher."
- **Evidence:** measured — Core counts from the chart, including 5.6 SOL XHigh 28/139 and Opus XHigh 25/141.
- **Bears on:** L1, L3 · **Landing guess:** nowhere obvious · **Reader:** R47 (R47-21)
- **Family:** G4-F021 (already-done) — Regression is the dominant failure: core pass is 66-74% but strict only 12-16%, erosion stays flat across months and packs, and final code still fails hundreds  · **Relation:** supports · also G4-F014 (supports) · Per-campaign strict/core counts out of 196; strict low, core much higher.

### C1928 · 2026-10-15 · scb-3-pass-rates.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-pass-rates.png> (not in inventory)
- **Claim:** The chart footnote admits GLM's effort label comes from saved config while its directory says Max, so one effort label is uncertain; Opus Max and GPT-6.1 XHigh were incomplete at capture.
- **Quote:** "GLM labeled XHigh from saved config; directory says Max."
- **Evidence:** measured — Chart footnote; not in the article or the report text.
- **Bears on:** L1 · **Landing guess:** Verify which effort setting a run actually used. · **Reader:** R47 (R47-22)
- **Family:** G4-F022 (adopt) — Single-run benchmark differences (including medium vs xhigh) cannot separate effort from run-to-run variance; treat 1-4 strict-pass gaps as noise unless repeate · **Relation:** supports · GLM effort label uncertain (config says XHigh, directory says Max); Opus Max and GPT-6.1 XHigh incomplete; adds data-quality caveat.

### C1929 · 2026-10-15 · scb-3-cost-strict.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-cost-strict.png> (not in inventory)
- **Claim:** Cost scatter shows 10 campaigns spanning $178.51 to $1,550.07 inside a 12.24-16.33% strict band, with no repeated seeds; GLM 5.3 XHigh $365.13, GPT-5.6 SOL XHigh $753.30; GPT-6.1 uses SOL pricing and Fable had two checkpoints with zero metering.
- **Quote:** "Dates and agent versions differ."
- **Evidence:** measured — Chart notes: recorded cost is not an invoice; Fable cost may be understated by the unmetered checkpoints.
- **Bears on:** L1 · **Landing guess:** Cost estimates are approximate; do not over-fit routing on them. · **Reader:** R47 (R47-23)
- **Family:** G4-F035 (skip) — Cost is a weak predictor of outcome across models: the priciest configuration did not lead and ~5-8x spend bought ~2 points or fewer strict passes. · **Relation:** supports · also G4-F014 (supports) · Cost scatter: $178.51 to $1,550.07 inside a narrow strict band, no repeated seeds; Fable cost possibly understated.

### C1930 · 2026-10-15 · scb-3-final-failures.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-final-failures.png> (not in inventory)
- **Claim:** Final failed test cases per campaign range from 1,435 (Astra XHigh) to 2,831 (SOL Medium), with final strict problems 0 to 3 of 36, so almost no run ends in a fully passing codebase; Skips: 5.6 XHigh 15, SOL6 XHigh 1, others 17.
- **Quote:** "Final strict success does not imply every earlier checkpoint passed."
- **Evidence:** measured — Failure categories: most final failures are Regression (e.g. 1,178 of 1,435; 2,479 of 2,831). Only last checkpoint per problem; not distinct bugs.
- **Bears on:** L3, W3 · **Landing guess:** Failures are mostly regressions of earlier behaviour; verifier should replay earlier tests. · **Reader:** R47 (R47-24)
- **Family:** G4-F021 (already-done) — Regression is the dominant failure: core pass is 66-74% but strict only 12-16%, erosion stays flat across months and packs, and final code still fails hundreds  · **Relation:** supports · Final failed tests 1,435 to 2,831 per campaign, mostly Regression; almost no run ends fully passing.

### C1931 · 2026-10-15 · scb-3-final-failures.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-final-failures.png> (not in inventory)
- **Claim:** Opus 5.5 Medium, the core leader (145/196), ended with 0 of 36 strict final problems and 2,508 failed tests, so high core pass does not mean a working end state; Opus XHigh had 2,446 failed and 1 strict final.
- **Quote:** "Each problem contributes only its last expected checkpoint"
- **Evidence:** measured — Chart numbers; GPT-6.1 SOL Medium 3/36 strict final with 2,757 failed.
- **Bears on:** L3, W3 · **Landing guess:** Judge the final state, not stage success. · **Reader:** R47 (R47-25)
- **Family:** G4-F021 (already-done) — Regression is the dominant failure: core pass is 66-74% but strict only 12-16%, erosion stays flat across months and packs, and final code still fails hundreds  · **Relation:** supports · also G4-F019 (supports) · Core leader Opus Medium ended 0/36 strict final problems with 2,508 failed tests; high core pass is not a working end state.

### C1932 · 2026-10-15 · scb-3-quality-slop-coverage.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-quality-slop-coverage.png> (not in inventory)
- **Claim:** Slop coverage per campaign (main=filtered except Opus Medium): Opus XHigh 77.75, Fable XHigh 82.11, GPT-5.6 SOL XHigh 89.05, Astra XHigh 89.71, GLM 89.86, Astra Medium 90.76, SOL6 XHigh 91.11, 6.1 SOL Medium 91.51, SOL6 Medium 92.58, Opus Medium 94.25/92.90; no model is below 77%, and eight problems omitted for incomplete scanner coverage.
- **Quote:** "Ranked by SLOC-weighted heuristic coverage; not a defective-code percentage."
- **Evidence:** measured — Chart; 28 matched problems; coverage is a union of AST-rule spans and within-file clone spans over total SLOC.
- **Bears on:** L3 · **Landing guess:** Quality scanners flag most lines for all models; a metric with little spread cannot gate. · **Reader:** R47 (R47-26)
- **Family:** G4-F010 (skip) — Slop-rule detectors flag 80-98% of all lines for every model, so they are over-aggressive and useful only to compare models, not as an absolute bad-code verdict · **Relation:** supports · also G4-F037 (supports) · Slop coverage 77.75 to 94.25 across campaigns, framed as heuristic coverage, not defect percentage.

### C1933 · 2026-10-15 · scb-3-quality-volume.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-quality-volume.png> (not in inventory)
- **Claim:** Final source volume varies about 9x across campaigns: Opus Medium 216,881 SLOC (175,616 filtered + 41,265 in tests/_work), Fable XHigh 122,504, Opus XHigh 96,632, GLM 91,907, Astra XHigh 76,448, GPT-5.6 SOL XHigh 66,186, 6.1 SOL Medium 44,019, SOL6 XHigh 41,147, Astra Medium 39,988, SOL6 Medium 24,991.
- **Quote:** "Filtered is not a tests-free scope."
- **Evidence:** measured — Native Radon SLOC; no verified test/non-test split; only the Opus Medium snapshot (45 files in dynamic_buffer) changed under filtering.
- **Bears on:** L3 · **Landing guess:** Output volume is a cheap bloat signal worth capping or monitoring. · **Reader:** R47 (R47-27)
- **Family:** G4-F013 (skip) — Every model's codebase accumulates defects, duplication and complexity as features pile up, so codebase degradation over time is now measured, not just felt. · **Relation:** supports · Final source volume varies about 9x across campaigns; adds measured volume figures.

### C1934 · 2026-10-15 · scb-3-quality-callables.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-quality-callables.png> (not in inventory)
- **Claim:** Callables and mean cyclomatic complexity differ widely: Fable 8,967 / 3.57, Astra XHigh 5,099 / 4.72, Opus XHigh 6,075 / 4.86, GLM 4,883 / 5.78, Astra Medium 2,438 / 6.38, 6.1 SOL Medium 2,531 / 6.38, Opus Medium 13,462 / 7.12, 5.6 SOL XHigh 2,331 / 7.47, SOL6 XHigh 1,803 / 8.74, SOL6 Medium 1,083 / 11.70.
- **Quote:** "Callable count is not body length; complexity does not establish correctness."
- **Evidence:** measured — 28 matched problems; the chart calls the two measures separate, not a combined quality score.
- **Bears on:** L3 · **Landing guess:** nowhere obvious · **Reader:** R47 (R47-28)
- **Family:** G4-F012 (skip) — A deterministic complexity/duplication script (cyclomatic max, clone %) could serve as a backpressure gate; models differ sharply in function count and complexi · **Relation:** supports · also G4-F011 (supports) · Models differ sharply in callable count and mean cyclomatic complexity; measures kept separate.

### C1935 · 2026-10-15 · scb-3-quality-callables.png
- **Source:** repo, Dex, read — <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-quality-callables.png> (not in inventory)
- **Claim:** Scanner policy: missing scans are never counted as clean and both scopes exclude dependency, venv and cache paths, a conservative rule for unmeasured output.
- **Quote:** "Missing scans never count as clean."
- **Evidence:** asserted — Chart footnote across all three quality charts.
- **Bears on:** L3, W2 · **Landing guess:** Unknown-as-fail policy for verifiers, mirroring the 'unknown is not new' completion rule. · **Reader:** R47 (R47-29)
- **Family:** NEW · **Relation:** new · also G4-F068 (supports) · Scanner policy: missing scans never counted as clean, dependency/venv/cache paths excluded; no family covers conservative handling of unmeasured output.

### C1936 · 2026-09-30 · @dexhorthy post: subagent hand-back harness detail in CC
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105431738143080894> (not in inventory)
- **Claim:** Claude Code now wraps a subagent's final report with a notice that it is model output carrying no user authority, a harness-level defence against instruction injection through sub-agent hand-back.
- **Quote:** "It is model output, NOT a message from the user"
- **Evidence:** anecdotal — Quoted harness text from Claude Code; no numbers.
- **Bears on:** W4, W2 · **Landing guess:** Briefing text for sub-agent/reviewer hand-backs in workflows · **Reader:** R48 (R48-1)
- **Family:** NEW · **Relation:** new · also G5-F024 (supports) · Harness wraps subagent hand-back as model output with no user authority; no family covers sub-agent-return injection defence.

### C1937 · 2026-09-30 · @dexhorthy post: leverage and /show-me vs specs as long as code
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105378572215153095> (not in inventory)
- **Claim:** Dex endorses the view that a spec can be compressed far below the code (a quoted 40:1 on a 30k LOC codebase, the quoted author's own measurement) and that you should review at the right abstraction level, which /show-me serves.
- **Quote:** "this is exactly why we talk about leverage and what /show-me is for"
- **Evidence:** asserted — The 40:1 figure is the quoted third party's; Dex only endorses it.
- **Bears on:** L3, W1 · **Landing guess:** Review artefacts at higher abstraction (show-me style) in the PR/owner view · **Reader:** R48 (R48-2)
- **Family:** G1-F128 (skip) — A spec detailed enough to generate quality code is as long as the code, so reviewing it adds little over reviewing code. · **Relation:** contradicts · also G2-F007 (contradicts) · Endorses a 40:1 spec-to-code compression, against the claim that a spec as detailed as code is as long as the code.

### C1938 · 2026-09-30 · @dexhorthy post: SCB pending results across new models
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105330056579170551> (not in inventory)
- **Claim:** Dex keeps re-running SlopCodeBench on each new model (Sol 6, Opus 5.5, an Opus 5.5 Max run still going), implying model-specific harness settings need re-measuring per release.
- **Quote:** "y'all keep releasing models faster than I can bench them"
- **Evidence:** anecdotal — Results are in images not visible here; no numbers in the text.
- **Bears on:** L1 · **Landing guess:** Re-measure effort routing on each model change · **Reader:** R48 (R48-3)
- **Family:** G4-F183 (unrefuted (over cap)) — Durable skill is re-evaluating on each new model/harness release: production-grounded evals survive models, so vary one dimension at a time, test each new model · **Relation:** supports · also G4-F014 (supports) · Re-benches SlopCodeBench on each new model; per-release re-measurement.

### C1939 · 2026-09-25 · @dexhorthy post: performative tokenmaxxing
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2103569794004124008> (not in inventory)
- **Claim:** Dex argues against maximising token spend as a show of productivity, saying it will harm the profession more than any model.
- **Quote:** "performative tokenmaxxing is going to do way more damage"
- **Evidence:** asserted — Opinion; mentions running 32x Opus 5.5 that day without analysis.
- **Bears on:** L1 · **Landing guess:** Supports cost-aware effort routing over maxed verifiers · **Reader:** R48 (R48-4)
- **Family:** G4-F204 (skip) — The meta has shifted from 'token harder' (spend maximally via Ralph loops, RPI, parallel worktrees) to 'token smarter': more tokens do not substitute for skill  · **Relation:** supports · also G4-F062 (supports) · Performative token maximising criticised; token smarter not harder.

### C1940 · 2026-09-27 · @dexhorthy post: plan mode removed from Claude Code
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2104009871247262185> (not in inventory)
- **Claim:** Dex notes, wryly, that Claude Code is removing its built-in plan mode while other tools add one, a sign that planning is moving into skills and workflows rather than a mode.
- **Quote:** "just in time for claude code to remove plan mode"
- **Evidence:** anecdotal — One-line reaction.
- **Bears on:** W3 · **Landing guess:** Do not rely on a built-in plan mode for the phase routine · **Reader:** R48 (R48-5)
- **Family:** G2-F075 (skip) — Plan/design templates carry fixed sections (current state, desired end state, what we are not doing, open questions, testing patterns) and verification steps th · **Relation:** supports · Plan mode removed from Claude Code; custom planning templates and skills over generic plan mode.

### C1941 · 2026-09-28 · @dexhorthy post: scoring as RAG reranker
- **Source:** x-thread, Dex, summarised — <https://x.com/dexhorthy/status/2104415621589164181> (not in inventory)
- **Claim:** Dex finds using a learned decision/scoring model as a reranker for retrieval sensible, relevant to any knowledge-store retrieval.
- **Quote:** "jev scoring as a RAG reranker makes a ton of sense"
- **Evidence:** asserted — Endorsement of a third-party article that was not read.
- **Bears on:** none · **Landing guess:** Knowledge-store retrieval design (reranking) · **Reader:** R48 (R48-6)
- **Family:** NEW · **Relation:** new · Learned scoring model as a RAG reranker; no retrieval-reranking family exists.

### C1942 · 2026-10-01 · @dexhorthy post: limit work in progress (exe.dev)
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105698983142449180> (not in inventory)
- **Claim:** Dex says the old XP/Lean rule of limiting work in progress still holds for agent work: fewer parallel streams, done well, optimising for incremental value shipped.
- **Quote:** "Do fewer things in parallel, do them very well"
- **Evidence:** asserted — Endorses a blog post; no numbers.
- **Bears on:** W3, W5 · **Landing guess:** Cap parallel workflows/PRs; one phase at a time · **Reader:** R48 (R48-7)
- **Family:** G1-F110 (already-done) — Limit parallel agents and work in progress: one primary task plus one or two secondary; heavy parallelism and overnight runs backfire. · **Relation:** supports · also G4-F210 (supports) · Limit work in progress: fewer parallel streams, done well.

### C1943 · 2026-10-01 · @dexhorthy post: AI makes unnecessary code free
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105510244894076959> (not in inventory)
- **Claim:** Dex endorses the argument that agents eagerly invent unrequested work, so the risk is that unnecessary code becomes free, which argues for scope-minimal verification.
- **Quote:** "this guy gets it"
- **Evidence:** asserted — Endorsement of a third-party post; no data.
- **Bears on:** L3 · **Landing guess:** Reviewer checklist item: unrequested changes · **Reader:** R48 (R48-8)
- **Family:** G4-F185 (trial) — Models over-engineer by default (unrequested abstractions, impossible-case handling, huge line counts), so state scope and explicit non-goals in the plan and ch · **Relation:** supports · also G4-F208 (supports) · Agents invent unrequested work, so unnecessary code is free; scope-minimal verification.

### C1944 · 2026-10-01 · @dexhorthy post: SWE-sweep benchmark
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2105681934852747601> (not in inventory)
- **Claim:** Dex flags that models proactively finding unreported bugs is far from solved (quoted: top models under 5% on 4k bugs, 100 repos), so unprompted bug-finding agents should not be trusted as verifiers.
- **Quote:** "yet another deeply unsaturated benchmark on model's ability to maintain a codebase"
- **Evidence:** measured — Figures are from the quoted SWE-sweep post: 100 repos, 22 languages, 4k bugs, under 5% for top models.
- **Bears on:** L3 · **Landing guess:** Verifiers need pointed targets, not open bug hunts · **Reader:** R48 (R48-9)
- **Family:** G4-F014 (already-done) — Best frontier models reach only about 12-33% strict pass on multi-checkpoint SlopCodeBench, so the benchmark is unsaturated and unattended maintainability is fa · **Relation:** supports · also G4-F019 (supports) · Another unsaturated benchmark on maintaining a codebase and finding bugs unprompted (under 5% for top models).

### C1945 · 2026-10-05 · @dexhorthy post: factories vs codebases
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2106942965776269347> (not in inventory)
- **Claim:** Unlike a factory, a codebase's past output affects future output quality, so quality gates on each change matter cumulatively.
- **Quote:** "everything you "ship out the door" impacts your ability to/ agility to ship the next thing"
- **Evidence:** asserted — Argument in reply to the factory-metaphor post; no data.
- **Bears on:** L3 · **Landing guess:** Justifies per-PR refute-by-default review · **Reader:** R48 (R48-10)
- **Family:** G4-F134 (already-done) — Slop compounds: each change that ships affects all later changes, a 10-12% bad-decision rate per feature degrades unattended factories toward unrecoverable, and · **Relation:** supports · also G4-F137 (supports) · Codebase past output affects future output, unlike a factory; cumulative quality gates.

### C1946 · 2026-10-05 · @dexhorthy post: alpha in reviewing
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2107158343718723850> (not in inventory)
- **Claim:** Human review still adds value until models are far smarter than us, though the thing reviewed need not be the code (plans, artifacts); without review you get the same slop as everyone.
- **Quote:** "there will always be alpha in reviewing something"
- **Evidence:** asserted — Opinion; no data.
- **Bears on:** L3, W2 · **Landing guess:** Owner view reviews plan/decisions, not only diffs · **Reader:** R48 (R48-11)
- **Family:** G4-F095 (skip) — Teams that skip review entirely converge on whatever the model would produce for anyone, losing domain-specific differentiation. · **Relation:** supports · also G4-F192 (supports) · Always alpha in reviewing, though the reviewed artifact may be plans rather than code; no review gives the same slop as everyone.

### C1947 · 2026-10-05 · @dexhorthy post: context across sessions and handoff
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2107211004132368843> (not in inventory)
- **Claim:** To survive compaction, new sessions or human handoff, put all context and decisions in artifact docs and resume by an iterate skill or @-mentioning the artifacts.
- **Quote:** "nothing that matters should ever live ONLY in your context window"
- **Evidence:** asserted — Practice tip; no numbers.
- **Bears on:** W3, L2 · **Landing guess:** Matches P1 cold-resume trial and the draft-PR decisions journal · **Reader:** R48 (R48-12)
- **Family:** G1-F099 (already-done) — Skip built-in compaction (it is lossy and can drop goals); persist what matters to markdown artifacts so any session can resume. · **Relation:** supports · also G2-F053 (supports) · Put all decisions in artifact docs to survive compaction and handoff.

### C1948 · 2026-10-06 · @dexhorthy post: outline skill with show-me and HTML plans
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2107267652628672855> (not in inventory)
- **Claim:** HumanLayer bundles an outline skill that mixes /show-me with a planning language, and Dex likes HTML plans with questions and interactive diagrams.
- **Quote:** "the "outline" skill we bundle with @humanlayer_dev that mixes in /show-me"
- **Evidence:** anecdotal — Reaction to a third-party skill; no data.
- **Bears on:** W4 · **Landing guess:** Plan-phase skill that outputs a visual outline · **Reader:** R48 (R48-13)
- **Family:** G3-F037 (skip) — A /show-me skill makes agents explain code, plans and diffs with compact forms (component and call trees, file layouts with one-line responsibilities, signature · **Relation:** supports · also G3-F029 (supports) · Outline skill mixing /show-me with HTML plans containing questions and diagrams.

### C1949 · 2026-10-06 · @dexhorthy post: out with the factory, in with the forge
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2107325017512153332> (not in inventory)
- **Claim:** Dex retires the 'software factory' framing in favour of 'forge' (HumanLayer repositioned as a software forge), a change of vocabulary from his earlier factory essays.
- **Quote:** "out with the factory in with the forge"
- **Evidence:** asserted — One-line slogan; positioning only.
- **Bears on:** L3 · **Landing guess:** Note that factory-essay guidance may be superseded · **Reader:** R48 (R48-14)
- **Family:** NEW · **Relation:** new · Vocabulary change from software factory to forge; positioning only.

### C1950 · 2026-10-06 · @dexhorthy post: show-me installs
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2107557043565666502> (not in inventory)
- **Claim:** His /show-me skill, installable through a shared skills registry, reached about 25k installs, evidence that a small single-purpose skill spreads.
- **Quote:** "/show-me up to 25k installs"
- **Evidence:** measured — 25k installs, self-reported.
- **Bears on:** W4 · **Landing guess:** Shape for skill packages: small, single purpose, shared registry · **Reader:** R48 (R48-15)
- **Family:** G3-F037 (skip) — A /show-me skill makes agents explain code, plans and diffs with compact forms (component and call trees, file layouts with one-line responsibilities, signature · **Relation:** supports · also G3-F072 (supports) · Adds adoption evidence: /show-me about 25k installs via a skills registry.

### C1951 · 2026-10-08 · @dexhorthy post: Fold harness design
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2108044760753783272> (not in inventory)
- **Claim:** HumanLayer's Fold harness stores agent state as a portable append-only log and runs on durable objects, a state-as-log design.
- **Quote:** "stores state as a portable append only log"
- **Evidence:** asserted — Feature list of a colleague's project.
- **Bears on:** W3, L2 · **Landing guess:** Append-only decisions journal as resumable state · **Reader:** R48 (R48-16)
- **Family:** G1-F154 (skip) — Keep agent state as an append-only event log with built-in auto-compaction. · **Relation:** supports · also G2-F161 (supports) · Fold harness stores agent state as a portable append-only log.

### C1952 · 2026-10-09 · @dexhorthy post: smart zone size and small-task escape hatches
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2108588513436582357> (not in inventory)
- **Claim:** Dex now puts the smart-zone line near 200-400k tokens (a change from his earlier smaller figure), says heavy planning on small tasks feels slower, and predicts skills will add escape hatches; HumanLayer is trying research-to-implement and research-short-design-implement.
- **Quote:** "line is closer to 200-400k now I think"
- **Evidence:** anecdotal — 'I think'; no measurement given.
- **Bears on:** L2, W3, W1 · **Landing guess:** Phase routine: add a small-task escape hatch; revisit compaction threshold · **Reader:** R48 (R48-17)
- **Family:** G1-F081 (already-done) — The dumb-zone threshold has risen and experts regularly go well past it (200-400k); it is a guideline for newcomers, not a hard limit, so tier the rule by task. · **Relation:** updates · also G2-F070 (supports) · Dex moves the smart-zone line to about 200-400k; small tasks get escape hatches from heavy planning.

### C1953 · 2026-10-09 · @dexhorthy post: /hl:teleport and /hl:orchestrate
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2108628891904745931> (not in inventory)
- **Claim:** HumanLayer's release adds teleporting a session to another host without losing context, and an orchestrate command that splits tasks, forks workflows and moves artifacts.
- **Quote:** "/hl:orchestrate - use humanlayer to drive humanlayer - split tasks, fork workflows"
- **Evidence:** marketing — Product release note.
- **Bears on:** W5, L2 · **Landing guess:** Reusable orchestration commands · **Reader:** R48 (R48-18)
- **Family:** G3-F021 (skip) — An orchestrator skill breaks work into tasks in separate worktrees, starts sessions, checks task/PR status and moves artifacts between tasks; a manager persona  · **Relation:** supports · also G2-F164 (supports) · Orchestrate command splits tasks and forks workflows; teleport moves a session across hosts without context loss.

### C1954 · 2026-10-09 · @dexhorthy repost of Fold webhook agent (quoting 0xblacklight)
- **Source:** x-thread, Dex+others, read — <https://x.com/dexhorthy/status/2108662823585038774> (not in inventory)
- **Claim:** In the quoted HumanLayer design, tools are generated per event so the agent only gets scoped ones (create PR from this issue, list failing checks for this PR) and deterministic code is interleaved; Dex only applauds it.
- **Quote:** "tools are generated from the webhook event so the agent gets tightly-scoped tools"
- **Evidence:** anecdotal — Quoted colleague's post, which Dex endorses with 'he cook'; no numbers.
- **Bears on:** L3, W4 · **Landing guess:** Scoped tools per phase; deterministic steps in workflows · **Reader:** R48 (R48-19)
- **Family:** G3-F093 (already-done) — Give agents narrow, purpose-named tools and name skills, agents and commands carefully since names affect how accurately the model uses them. · **Relation:** supports · also G3-F078 (supports) · Tools generated per webhook event so the agent gets tightly scoped tools, interleaved with deterministic code.

### C1955 · 2026-10-12 · @dexhorthy post: personas and roles
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2109792508347826684> (not in inventory)
- **Claim:** Prompts, skills and roles are useful as instruction modules or SOPs the weights lack, but naming agents or casting them as adversaries mostly adds nothing.
- **Quote:** "if you're naming your agents or modeling them as "adversaries" you're mostly just playing house"
- **Evidence:** asserted — Opinion; no experiment.
- **Bears on:** W4, L3 · **Landing guess:** Challenge to refuter/reviewer personas; keep SOP-style agent definitions · **Reader:** R48 (R48-20)
- **Family:** G3-F001 (already-done) — Subagents exist for context control (isolate expensive search, return a short finding), not to model job roles or personas, so define custom agents by task shap · **Relation:** supports · also G3-F003 (contradicts) · Naming agents or casting adversaries adds nothing; instruction modules/SOPs useful.

### C1956 · 2026-10-13 · @dexhorthy post: Anthropic in-house version control
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2110080282279719187> (not in inventory)
- **Claim:** Dex relays Anthropic's move to a central VCS (quoted: about 2,500 merges a day in May, over 30,000 in September) but doubts the premise that code changes autonomously with no human reading it.
- **Quote:** "I'm not sure I buy this"
- **Evidence:** measured — Merge counts are from the quoted Anthropic post; Dex's doubt is opinion.
- **Bears on:** L3 · **Landing guess:** Reject 'don't read the code' as a default · **Reader:** R48 (R48-21)
- **Family:** G4-F094 (already-done) — Keep humans reading the code: if teams replace review with loops, one failure can leave nobody able to recover; keep a human review point and sampled inspection · **Relation:** supports · also G4-F093 (supports) · Dex doubts code changing autonomously with no human reading it, despite Anthropic's 30k merges a day.

### C1957 · 2026-10-14 · @dexhorthy post: Agent Baseline reference architecture
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2110430733009600654> (not in inventory)
- **Claim:** Dex says giving coding agents useful tool access (MCPs to ticketing, email, chat) must be balanced against exfiltration and injection, and welcomes a draft reference architecture for securing software factories.
- **Quote:** "avoiding data exfiltration, prompt injection, credential hijacks"
- **Evidence:** anecdotal — Recalls a podcast discussion with a CISO; no numbers.
- **Bears on:** L3 · **Landing guess:** Tool and credential scoping for agent runs · **Reader:** R48 (R48-22)
- **Family:** G5-F024 (trial) — Prompt-injection risk is the lethal trifecta (untrusted content, private data, external communication); removing any one leg (cut prod DB access, network sandbo · **Relation:** supports · also G3-F109 (supports) · Tool access must be balanced against exfiltration, injection and credential hijack; reference architecture.

### C1958 · 2026-10-14 · @dexhorthy post: idle compaction in Claude Code
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2110507128762851492> (not in inventory)
- **Claim:** Dex approves Claude Code's idle compaction just before the ~1h prompt cache expires, reasoning you eat the cache miss on compaction input anyway so compacting before expiry is cheaper.
- **Quote:** "always confused why claude would ask me if i wanna compact after 24h"
- **Evidence:** asserted — Cache-cost reasoning; no measurement.
- **Bears on:** L2 · **Landing guess:** Compaction/resume timing relative to cache TTL · **Reader:** R48 (R48-23)
- **Family:** G1-F206 (already-done) — Keep the stable prefix identical and put dynamic content last to benefit from prompt caching. · **Relation:** supports · also G1-F165 (contradicts) · Approves idle compaction before prompt-cache expiry on cost grounds; the built-in compaction is acceptable.

### C1959 · 2026-11-07 · @dexhorthy post 2026-11-07 on compaction
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119165267368698188> (not in inventory)
- **Claim:** CHANGE OF POSITION: better compaction means you often no longer need to clear or externalize context for model focus, though it is still useful for human collaboration and handoff between agents or machines.
- **Quote:** "compaction is much better now so for certain things you may not need to explicitly clear"
- **Evidence:** anecdotal — Personal practice; no numbers.
- **Bears on:** L2, W3 · **Landing guess:** Phase routine's one-phase-per-new-session defence; handoff files stay justified for agent handoff · **Reader:** R49 (R49-1)
- **Family:** G1-F165 (already-done) — Do not rely on built-in /compact or auto-compaction because it is generic and obscured; control compaction explicitly via a file and clear (while one HN user fi · **Relation:** updates · also G1-F099 (updates) · Dex softens his skip-built-in-compaction stance: compaction is now good enough that clearing is often unnecessary, still useful for handoff.

### C1960 · 2026-11-07 · @dexhorthy post 2026-11-07 on compaction
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119165267368698188> (not in inventory)
- **Claim:** On 1M-context frontier models he sets auto-compact at 400k and compacts manually between 200k and 400k depending on model and harness, clearing less than before.
- **Quote:** "I usually my autocompact to 400k and tend to do a manual compact between 200-400k"
- **Evidence:** anecdotal — Stated personal settings, no experiment.
- **Bears on:** L2 · **Landing guess:** Auto-compaction window threshold (harness considers only past 500k) · **Reader:** R49 (R49-2)
- **Family:** G1-F081 (already-done) — The dumb-zone threshold has risen and experts regularly go well past it (200-400k); it is a guideline for newcomers, not a hard limit, so tier the rule by task. · **Relation:** supports · also G1-F080 (updates) · Gives his concrete settings (auto-compact 400k, manual 200-400k), moving past the flat 100k warning.

### C1961 · 2026-11-07 · @dexhorthy post 2026-11-07 on compaction
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119165267368698188> (not in inventory)
- **Claim:** The dumb zone is more flexible on 1M-context frontier models than earlier fixed-fraction guidance suggested.
- **Quote:** ""dumb zone" a little more flexible for 1m frontier models."
- **Evidence:** anecdotal — No numbers beyond the 200-400k working range.
- **Bears on:** L2 · **Landing guess:** Context budget rule in the phase routine · **Reader:** R49 (R49-3)
- **Family:** G1-F081 (already-done) — The dumb-zone threshold has risen and experts regularly go well past it (200-400k); it is a guideline for newcomers, not a hard limit, so tier the rule by task. · **Relation:** supports · also G1-F079 (updates) · Dumb zone is more flexible on 1M models than the fixed 40% rule.

### C1962 · 2026-11-07 · @dexhorthy post 2026-11-07 on sub-agent nesting
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119165267368698188> (not in inventory)
- **Claim:** A top-level orchestrator launching sub-agents that launch their own sub-agents (three tiers) lets the orchestrator steer two levels instead of the human, and he sees no reason to nest deeper for most tasks.
- **Quote:** "i don't think there's any good reason to go beyond 3-levels of subagent nesting today"
- **Evidence:** asserted — Guideline, no data.
- **Bears on:** W4, W5, L2 · **Landing guess:** Workflow-tool orchestration depth (main session, readers, refuters) · **Reader:** R49 (R49-4)
- **Family:** G1-F117 (already-done) — Cap subagent nesting depth at three levels to stop runaway fork chains. · **Relation:** supports · Restates the 3-level nesting cap and adds the rationale that the orchestrator steers two levels.

### C1963 · 2026-11-07 · @dexhorthy post 2026-11-07 on compaction
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119165267368698188> (not in inventory)
- **Claim:** These thresholds are training wheels; the operator's own judgement of whether the model is on track outranks any fixed number.
- **Quote:** "your intuition as to whether model is on track or getting dumb is always the best source!"
- **Evidence:** asserted — Caveat attached to the thresholds.
- **Bears on:** L2, W2 · **Landing guess:** Closing-message / owner-view check on drift · **Reader:** R49 (R49-5)
- **Family:** G1-F081 (already-done) — The dumb-zone threshold has risen and experts regularly go well past it (200-400k); it is a guideline for newcomers, not a hard limit, so tier the rule by task. · **Relation:** supports · Thresholds are training wheels; operator intuition outranks them.

### C1964 · 2026-10-30 · @dexhorthy post 2026-10-30 on summaries vs source
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2116003536098263419> (not in inventory)
- **Claim:** A doc or per-directory compacted summary is only justified if it raises speed without lowering quality, and absent codebase-specific evals watched closely the simpler answer is to accept a speed hit and read source each time.
- **Quote:** "just go from source every time"
- **Evidence:** asserted — Opinion; he declines to endorse a cited $32m paper.
- **Bears on:** W1, W3 · **Landing guess:** Knowledge-store pilot design and P1 cold-resume trial (store vs source baseline) · **Reader:** R49 (R49-6)
- **Family:** G1-F185 (already-done) — Persistent code documentation goes stale; prefer pointers to authoritative code and on-demand regenerated research over stored copies or generated docs. · **Relation:** supports · also G1-F131 (supports) · Prefer reading from source over stored summaries unless evals show a gain.

### C1965 · 2026-10-30 · @dexhorthy post 2026-10-30 on summaries vs source
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2116003536098263419> (not in inventory)
- **Claim:** He objects to the framing of codebases for humans versus codebases for agents, and notes docs remain a primary source when the code is closed and users' agents must integrate it.
- **Quote:** "codebases for humans" vs "codebases for agents"
- **Evidence:** asserted — Opinion.
- **Bears on:** W1, W3 · **Landing guess:** Docs/CODE-MAP role versus reading source · **Reader:** R49 (R49-7)
- **Family:** NEW · **Relation:** new · Objection to the humans-vs-agents codebase framing; docs stay primary for closed code. No family covers it.

### C1966 · 2026-10-24 · @dexhorthy post 2026-10-24 on sub-agent overuse
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114117782111752262> (not in inventory)
- **Claim:** Sub-agents are high leverage in the right place but the hype culture pushes more parallelism instead of careful context management.
- **Quote:** "Subagent overuse and abuse has been a problem since mid 2025."
- **Evidence:** anecdotal — Reacts to an Anthropic article recommending folding unneeded sub-agents into the main loop.
- **Bears on:** W4, L2 · **Landing guess:** Sizing the 11 new agent definitions; justify each against a skill · **Reader:** R49 (R49-8)
- **Family:** G3-F001 (already-done) — Subagents exist for context control (isolate expensive search, return a short finding), not to model job roles or personas, so define custom agents by task shap · **Relation:** supports · also G1-F113 (supports) · Sub-agent overuse as a hype problem; keep for context control.

### C1967 · 2026-10-24 · @dexhorthy reply 2026-10-24 on sub-agents and skills
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114118885750521875> (not in inventory)
- **Claim:** Sub-agents manage context while skills are the instruction modules; before skills sub-agents were the only way to hold different system prompts, now skills are the better method and can be invoked from parent or sub-agent.
- **Quote:** "Conflating context management with instruction modules (these are quite orthogonal concerns)"
- **Evidence:** asserted — Argument, no data.
- **Bears on:** W4 · **Landing guess:** Choosing skill package versus agent definition for each fixflow-* item · **Reader:** R49 (R49-9)
- **Family:** G3-F002 (skip) — Keep subagents (context isolation) and skills (on-demand instruction modules) as orthogonal concepts; do not put custom instructions in agent files. · **Relation:** restates · Sub-agents for context, skills for instruction modules; orthogonal.

### C1968 · 2026-10-25 · @dexhorthy reply 2026-10-25 to hortonhearsafoo
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114422670846759339> (not in inventory)
- **Claim:** Sub-agents are good for code research and sequential sub-context implementation, but about 90% of sub-agent usage is role-play.
- **Quote:** "90% of subagent usage is ppl playing house"
- **Evidence:** asserted — Estimate, no measurement.
- **Bears on:** W4 · **Landing guess:** Keep the Haiku file locator; scrutinize role-named agents · **Reader:** R49 (R49-10)
- **Family:** G3-F001 (already-done) — Subagents exist for context control (isolate expensive search, return a short finding), not to model job roles or personas, so define custom agents by task shap · **Relation:** supports · 90% of sub-agent use is role-play; good uses are research and sequential sub-context work.

### C1969 · 2026-10-25 · @dexhorthy post 2026-10-25 on stacking skills in one session
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114408588991222156> (not in inventory)
- **Claim:** Running a five-step process with a skill per step in a single session is fine, since each skill takes some attention from earlier ones.
- **Quote:** "my intuition says 5 steps in a process is fine."
- **Evidence:** anecdotal — Intuition, no test.
- **Bears on:** W4, L2 · **Landing guess:** Phase routine steps as skills in one session · **Reader:** R49 (R49-11)
- **Family:** G1-F026 (already-done) — Do not store memory as hundreds of one-fact skills: skills stack poorly and there is no known benchmark of adherence with many skills invoked. · **Relation:** updates · Softens the skills-stack-poorly claim: around five stacked skills per session is fine.

### C1970 · 2026-10-25 · @dexhorthy post 2026-10-25 on stacking skills
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114408588991222156> (not in inventory)
- **Claim:** When skills must stack (skill 2's rules still binding during skill 6) or ~200 skills must be active, use fresh context, sub-agents, or precombine into one user message, at the cost of recency bias; agent memory as skills is probably an anti-pattern.
- **Quote:** "you want fresh context, subagents, or to synthetically precombine many skill contents"
- **Evidence:** asserted — Reasoned heuristic; 200 is an illustrative count.
- **Bears on:** W4, L2, W1 · **Landing guess:** Skill-package count and loading policy; knowledge store as skills · **Reader:** R49 (R49-12)
- **Family:** G1-F026 (already-done) — Do not store memory as hundreds of one-fact skills: skills stack poorly and there is no known benchmark of adherence with many skills invoked. · **Relation:** supports · When skills must stack or number ~200, use fresh context, sub-agents or precombining; memory-as-skills is an anti-pattern.

### C1971 · 2026-10-25 · @dexhorthy post 2026-10-25 on stacking skills
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114408588991222156> (not in inventory)
- **Claim:** Behavioural rules in skills decay over a long session, so repeat important rules in every step of a process or enforce them with something deterministic like hooks; instruction-heavy skills should be strung out, information-heavy ones can be combined.
- **Quote:** "Adherence can decay over a long session."
- **Evidence:** anecdotal — Experience-based; no numbers.
- **Bears on:** W2, W1, L2 · **Landing guess:** Hooks the harness review skipped; phase-routine rule repetition · **Reader:** R49 (R49-13)
- **Family:** G2-F122 (already-done) — If the agent repeats a mistake, add a lint rule, type check or test rather than tuning CLAUDE.md; use hooks for must-happen rules. · **Relation:** supports · also G1-F026 (supports) · Rule adherence decays in long sessions; repeat rules per step or enforce with hooks.

### C1972 · 2026-10-25 · @dexhorthy post 2026-10-25 on stacking skills
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114408588991222156> (not in inventory)
- **Claim:** Content already in the model weights should not go in skills, as it wastes time and locks in a specific, possibly suboptimal behaviour.
- **Quote:** "PLEASE stop putting stuff that’s in the weights in your skills."
- **Evidence:** asserted — Plea; no data.
- **Bears on:** W1, W4 · **Landing guess:** Audit CLAUDE.md and the 13 skill packages for generic content · **Reader:** R49 (R49-14)
- **Family:** G1-F015 (skip) — Remove rules and skills the current model already follows; keep only information that is not in the weights and not obvious from the code. · **Relation:** supports · Do not put weight-resident content in skills.

### C1973 · 2026-10-25 · @dexhorthy post 2026-10-25 on testing the weights
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2114411775550693527> (not in inventory)
- **Claim:** To test whether a skill is redundant, ask the model to write that skill with light steering, read it, and delete your skill if the generated one looks correct.
- **Quote:** "If the skill contents look correct, delete the skill. It’s in the weights."
- **Evidence:** anecdotal — Procedure, no results.
- **Bears on:** W1, W4 · **Landing guess:** Pruning check for CLAUDE.md trim and skill packages · **Reader:** R49 (R49-15)
- **Family:** G1-F015 (skip) — Remove rules and skills the current model already follows; keep only information that is not in the weights and not obvious from the code. · **Relation:** supports · Adds a concrete redundancy test: have the model write the skill and compare.

### C1974 · 2026-10-20 · @dexhorthy post 2026-10-20 on slowing down
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2112553628481556568> (not in inventory)
- **Claim:** Slow down, prioritize, and run less in parallel, even at the cost of idle time for the human.
- **Quote:** "do less in parallel, elevate getting things #1/2 done over maximizing utilization"
- **Evidence:** asserted — Opinion; echoes his earlier limit-WIP post (30 years since XP/Lean).
- **Bears on:** L2, W3 · **Landing guess:** One phase per new session; owner view · **Reader:** R49 (R49-16)
- **Family:** G1-F110 (already-done) — Limit parallel agents and work in progress: one primary task plus one or two secondary; heavy parallelism and overnight runs backfire. · **Relation:** supports · Do less in parallel, prioritize over utilization.

### C1975 · 2026-10-23 · @dexhorthy post 2026-10-23 on software factories masterclass
- **Source:** podcast, Dex+others, summarised — <https://x.com/dexhorthy/status/2113777513675801074> (not in inventory)
- **Claim:** A software factory should start with measurement then self-improve against those metrics, and turn successful agent runs into evals for testing future models and harnesses.
- **Quote:** "a good software factory starts with measurement, then self improvement against those metrics"
- **Evidence:** asserted — Dex's bullet summary of a video with Zach Lloyd and Vaibhav; video not read.
- **Bears on:** L3, W2, W5 · **Landing guess:** Measurement pipeline the review skipped; evidence folders as eval seeds · **Reader:** R49 (R49-17)
- **Family:** G4-F162 (already-done) — Turn every complaint, production failure or escape into a new eval, snapshot case or pre-merge check, so the system (not the person) is fixed. · **Relation:** supports · also G4-F183 (supports) · Start with measurement; convert successful runs into evals for new models and harnesses.

### C1976 · 2026-10-23 · @dexhorthy post 2026-10-23 on software factories masterclass
- **Source:** podcast, Dex+others, summarised — <https://x.com/dexhorthy/status/2113777513675801074> (not in inventory)
- **Claim:** Lines of code is a bad productivity metric, and counting PRs (with DORA) may be good enough.
- **Quote:** "why counting lines of code is bad metric, and why counting PRs might be good enough"
- **Evidence:** asserted — Bullet in summary post only.
- **Bears on:** L3, W2 · **Landing guess:** One-page owner view metrics · **Reader:** R49 (R49-18)
- **Family:** G4-F059 (already-done) — Prefer outcome-ish measures (customer outcomes, features, PR count) over lines or tokens, which are a last-resort proxy; PR count is hard to game because many s · **Relation:** supports · Lines of code is bad; PR counts with DORA may suffice.

### C1977 · 2026-11-06 · @dexhorthy post 2026-11-06 on software factory term
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2118718628627464571> (not in inventory)
- **Claim:** The term software factory is diffusing through hype, but the pre-AI NATO/DoD concept of automating more things remains a useful mental model.
- **Quote:** "term software factory is being semantically diffused"
- **Evidence:** asserted — Opinion.
- **Bears on:** L3, W5 · **Landing guess:** Vocabulary in program docs · **Reader:** R49 (R49-19)
- **Family:** NEW · **Relation:** new · Semantic diffusion of the term software factory; no family covers it (G5-F003 is about the word spec).

### C1978 · 2026-11-06 · @dexhorthy post 2026-11-06 on software factory term
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2118718628627464571> (not in inventory)
- **Claim:** The key parts of a factory (stack, linters, tests, previews) are too heterogeneous to generalize in a product, so building blocks beat drop-in solutions and vendors disappoint.
- **Quote:** "the best products in software factory space are building blocks, not drop in solutions"
- **Evidence:** asserted — Argument.
- **Bears on:** W5, W4, L3 · **Landing guess:** Per-repo verifiers and a reusable workflow library rather than a bought factory · **Reader:** R49 (R49-20)
- **Family:** G3-F096 (already-done) — Own the factory as open, composable, repo-held files (markdown plus code extension files, declared in code, tools the agent can read and patch) rather than a bl · **Relation:** supports · Building blocks beat drop-in factory products.

### C1979 · 2026-10-24 · @dexhorthy post 2026-10-24 on emergent model behaviour
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2113884720983658730> (not in inventory)
- **Claim:** Apparently novel model behaviour (agents using processor cache to pass secrets) is likely recombination of techniques already in the weights, not invention.
- **Quote:** "this technique had already been demonstrated and so was likely present in the weights"
- **Evidence:** asserted — Commentary on OpenAI sandbox escape anecdote.
- **Bears on:** L3 · **Landing guess:** Sandbox/permission assumptions for agent runs · **Reader:** R49 (R49-21)
- **Family:** NEW · **Relation:** new · Commentary on emergent model behaviour being recombination of known techniques.

### C1980 · 2026-10-29 · @dexhorthy post 2026-10-29 retraction of 2024 view
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2115825513948393937> (not in inventory)
- **Claim:** CHANGE OF POSITION: his 2024 claim that models excel at relaying context now looks naive; models do deep technical work and the worst part of people's days is unreviewed verbose AI-written messages and docs.
- **Quote:** "the worst parts of most people’s days are reading verbose, AI-written slack messages"
- **Evidence:** anecdotal — Self-assessment.
- **Bears on:** W1, L3 · **Landing guess:** Output caps and brevity rules for agent-written PR bodies, closing messages and owner view · **Reader:** R49 (R49-22)
- **Family:** G4-F241 (skip) — Slop is any low-effort or derivative output nobody put effort into, most commonly AI text the author did not read. · **Relation:** supports · Self-retraction of the 2024 context-relay view; unread verbose AI text is the worst part of the day.

### C1981 · 2026-10-23 · @dexhorthy post 2026-10-23 on decision command centers
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2113745739939811447> (not in inventory)
- **Claim:** Endorses a third party's view that the bottleneck is shifting from reviewing intent to human decision-making across many contexts, needing per-decision command centers.
- **Quote:** "this guy gets it"
- **Evidence:** asserted — Endorsement of Plannotator-style author's post; author is other.
- **Bears on:** L3, W3 · **Landing guess:** One-page owner view as decision surface · **Reader:** R49 (R49-23)
- **Family:** G4-F097 (already-done) — Generation is fast but human comprehension takes hours, so human understanding is the bottleneck and the process should be designed around owner comprehension c · **Relation:** supports · also G4-F208 (supports) · Bottleneck is human decision-making across many contexts; endorses a third party.

### C1982 · 2026-11-03 · @dexhorthy post 2026-11-03 skill packs
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2117618957146345827> (not in inventory)
- **Claim:** He argues more skill packs, not more tooling, are what is needed (image only, no further text).
- **Quote:** "what we actually need is more skill packs"
- **Evidence:** asserted — One line plus a photo not seen; possibly ironic.
- **Bears on:** W4 · **Landing guess:** 13 skill packages in PR #185 · **Reader:** R49 (R49-24)
- **Family:** NEW · **Relation:** new · also G3-F066 (contradicts) · One-line plea for more skill packs, image unseen and possibly ironic; cuts against the no-gain finding.

### C1983 · 2026-11-08 · @dexhorthy post 2026-11-08 on slop
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2119524005044768950> (not in inventory)
- **Claim:** He is preparing material with swyx/AI Engineer on defining slop, why it happens and how to prevent it, soliciting input (a pointer to upcoming content, no answers yet).
- **Quote:** "Why is slop worth fighting?"
- **Evidence:** asserted — Question post only.
- **Bears on:** L3 · **Landing guess:** Watch for the resulting slop-prevention content · **Reader:** R49 (R49-25)
- **Family:** NEW · **Relation:** new · Pointer to upcoming slop content with no answers yet.

### C1984 · 2026-11-06 · @dexhorthy post 2026-11-06 on upcoming talk
- **Source:** x-thread, Dex, read — <https://x.com/dexhorthy/status/2118840971609755649> (not in inventory)
- **Claim:** He announced a talk combining 12-factor agents with software factories as design patterns for agentic engineering (about 2026-11-12), plus recalling RPI as context engineering and semantic diffusion.
- **Quote:** "Twelve Factor Factories: Design Patterns for Agentic Engineering"
- **Evidence:** asserted — Talk announcement; content not yet available.
- **Bears on:** W5, L2, L3 · **Landing guess:** Source to read once published · **Reader:** R49 (R49-26)
- **Family:** NEW · **Relation:** new · Talk announcement on 12-factor agents plus software factories; content not available.

### C1985 · 2026-11-04 · HumanLayer is joining Factory
- **Source:** blog, Dex+others, read — <https://www.humanlayer.dev/blog/humanlayer-joins-factory> (not in inventory)
- **Claim:** Their stated shared principle is composable tools over monolithic black-boxes, and large multi-repo teams are poorly served by off-the-shelf coding agents and harnesses.
- **Quote:** "Great engineers want flexible, composable tools, not monolithic, opinionated black-boxes."
- **Evidence:** marketing — Acquisition announcement.
- **Bears on:** W4, W5 · **Landing guess:** Supports a self-built composable harness · **Reader:** R49 (R49-27)
- **Family:** G3-F096 (already-done) — Own the factory as open, composable, repo-held files (markdown plus code extension files, declared in code, tools the agent can read and patch) rather than a bl · **Relation:** supports · Composable tools over monolithic black-boxes; marketing source.

### C1986 · 2026-11-04 · HumanLayer is joining Factory
- **Source:** blog, Dex+others, read — <https://www.humanlayer.dev/blog/humanlayer-joins-factory> (not in inventory)
- **Claim:** Next in Factory: multiplayer tasks/workstreams, collaboration on docs and plans, live diff streaming, and open-sourcing HumanLayer, so HumanLayer-based tooling will migrate to Factory.
- **Quote:** "multiplayer tasks/workstreams, in-app collaboration on docs and plans, and live session diff streaming"
- **Evidence:** marketing — Roadmap statement.
- **Bears on:** W3, W4 · **Landing guess:** Dependence risk if the harness borrows HumanLayer RPI skills/repo · **Reader:** R49 (R49-28)
- **Family:** NEW · **Relation:** new · Factory roadmap and HumanLayer open-sourcing; product news with no matching claim.

### C1987 · 2026-10-23 · Open sourcing HumanLayer (post)
- **Source:** x-article, Dex, summarised — <https://x.com/dexhorthy/status/2113750268043210767> (inventory: Blog index, 2026-10-23 Open sourcing HumanLayer)
- **Claim:** HumanLayer core was open-sourced (same code as the cloud), with a third-party recap noting it needs WorkOS/Slack/Linear keys to start; article body not present in my bundle.
- **Quote:** "its time."
- **Evidence:** marketing — Only a Chinese-language third-party recap read.
- **Bears on:** none · **Landing guess:** nowhere obvious · **Reader:** R49 (R49-29)
- **Family:** NEW · **Relation:** new · Open-sourcing announcement; no harness claim.

### C1988 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Reviewing the plan instead of the code ('trust the plan, skip the code') ran 4-5 months at HumanLayer and left the codebase unusable, with each change regressing something else.
- **Quote:** "we ran this for like four or five months before we realized"
- **Evidence:** anecdotal — Own team's 4-5 month experiment; no numbers beyond duration.
- **Bears on:** W1, L3 · **Landing guess:** Reinforces keeping code review per PR and the Opus reviewer; argues against plan-only review. · **Reader:** R50 (R50-1)
- **Family:** G2-F009 (already-done) — A plan-review gate with no code or behaviour check is not a safe substitute for review: HumanLayer's 'read the plan, skip the code' PR experiment ran 4-5 months · **Relation:** restates · also G5-F015 (restates) · Same 4-5 month plan-review-only experiment; no new evidence.

### C1989 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** After the experiment HumanLayer rebuilt the product from scratch, and the cofounder hand-typed the data architecture for the first two weeks.
- **Quote:** "we literally rebuilt the whole product from scratch"
- **Evidence:** anecdotal — Own team's rebuild.
- **Bears on:** none · **Landing guess:** Human-owned data architecture decided early; relevant to phase-0 design decisions. · **Reader:** R50 (R50-2)
- **Family:** G5-F016 (skip) — After the failed experiment the product was rebuilt from scratch with the data architecture hand-typed by a human for two weeks. · **Relation:** restates · also G4-F091 (supports) · Rebuild from scratch with hand-typed data architecture for two weeks.

### C1990 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Plans written as inline diffs made reviewers read the same code twice (plan then implementation drift), so plan review did not save review effort.
- **Quote:** "the plans contained all of the code that was gonna be written"
- **Evidence:** anecdotal — Observed at HumanLayer and at 50-developer client teams.
- **Bears on:** W3 · **Landing guess:** Plan @ sha PR body: keep plans at design level, not inline code. · **Reader:** R50 (R50-3)
- **Family:** G2-F007 (already-done) — Long line-by-line plans give no leverage (a 1000-line plan costs as much to read as the code and drifts ~20% from it), so keep plans short and decision-level an · **Relation:** supports · Adds the angle that plans containing the code make reviewers read it twice and drift from implementation.

### C1991 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Letting the model own architecture produced a six-service system (Rust, Golang daemon, Unix sockets, MCP, SQLite) of needless complexity; humans must own architecture decisions.
- **Quote:** "let the model own the system architecture too"
- **Evidence:** anecdotal — Own team's case.
- **Bears on:** W3 · **Landing guess:** Architecture/schema decisions stay human-set in the plan phase. · **Reader:** R50 (R50-4)
- **Family:** G4-F093 (already-done) — Until models can architect, humans must steer architecture: unattended models produce spaghetti and overcomplex systems nobody chose, so keep architecture and b · **Relation:** supports · also G3-F102 (supports) · Concrete case of model-owned architecture producing an overcomplex six-service system.

### C1992 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Citing the Kernighan/Knuth-style principle, he argues systems must stay simpler than peak intelligence because models write clever code they cannot debug (and cites Steve Yegge's recent retraction).
- **Quote:** "to debug code, you need to be like much smarter than you were"
- **Evidence:** asserted — Principle plus a third-party anecdote.
- **Bears on:** L3 · **Landing guess:** Simplicity bias in reviewer rubric. · **Reader:** R50 (R50-5)
- **Family:** G4-F099 (skip) — Keep the system simpler than your peak understanding of it (debugging needs being smarter than when you wrote the code); add review or simplify if the owner can · **Relation:** restates · Same debug-needs-smarter principle; adds the Yegge anecdote.

### C1993 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Changed position: the main value of a plan file in mid-2025 was making a model work longer and resumable (compaction of intent), a leverage that has shifted with better models.
- **Quote:** "in July of 2025, plan file was a reliable way to get a model to work longer"
- **Evidence:** anecdotal — Retrospective on the planning metagame.
- **Bears on:** L2, W3 · **Landing guess:** Plan file as cold-resume artifact (P1 trial). · **Reader:** R50 (R50-6)
- **Family:** G2-F073 (skip) — Plans used to work mainly by keeping the model running longer (an anchor and completion checklist); models are now RL'd to keep going, so that reason has lapsed · **Relation:** restates · also G1-F102 (supports) · Plan file in mid-2025 mainly kept the model working longer; that leverage has shifted.

### C1994 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** The 'dumb zone' was about 100k tokens in July 2025; the number is higher now, though he still thinks context engineering and less context always give better results.
- **Quote:** "around a hundred thousand tokens. If you went over a hundred thousand tokens"
- **Evidence:** anecdotal — Change of number: 100k then, higher now, no new figure given.
- **Bears on:** L2 · **Landing guess:** Supports one-phase-per-session; do not hard-code a threshold. · **Reader:** R50 (R50-7)
- **Family:** G1-F080 (skip) — The dumb zone begins around 100,000 tokens for Claude; HumanLayer's context warning moved from 40% to a flat 100k. · **Relation:** updates · also G1-F081 (supports) · Dumb zone ~100k in July 2025, higher now; no new figure.

### C1995 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Context engineering is a first principle that will stay true while transformer LLMs are used, unchanged since 18 months ago.
- **Quote:** "you will get better quality if you use less context"
- **Evidence:** asserted — Argued from how transformers work.
- **Bears on:** L2, W1 · **Landing guess:** Justifies trimming CLAUDE.md. · **Reader:** R50 (R50-8)
- **Family:** G1-F082 (already-done) — Using less context always gives better results, regardless of window size; every token diminishes quality. · **Relation:** restates · also G1-F091 (supports) · Less context gives better quality as a transformer-level first principle.

### C1996 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Drowning in PRs is a symptom of people turning off their brains while coding; planning/alignment up front makes PRs easy to review.
- **Quote:** "you don't have too many PRs, you have too many bad PRs"
- **Evidence:** asserted — Argument from pre-AI practice.
- **Bears on:** W3 · **Landing guess:** Plan-before-build reduces review cost. · **Reader:** R50 (R50-9)
- **Family:** G4-F100 (skip) — 'Too many PRs' really means too many bad PRs: a good PR is a joy to review, so fix quality upstream and reject on rework burden, not volume. · **Relation:** restates · also G4-F209 (supports) · Too many bad PRs, not too many PRs; up-front alignment makes review easy.

### C1997 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Choose how much to plan by expected pain (chance of rework times cost of rework): align on the database schema, do not argue about button colour.
- **Quote:** "I think about this in terms of expected pain."
- **Evidence:** asserted — Heuristic with illustrative 50%/10%/0% rework chances.
- **Bears on:** W3, W4 · **Landing guess:** Plan-depth rule: heavier planning only for schema/migration/money work. · **Reader:** R50 (R50-10)
- **Family:** G2-F069 (already-done) — Scale planning depth by expected pain (probability of rework times its cost): spend effort on hard-to-change things like tables, skip easy ones, and avoid over- · **Relation:** restates · also G4-F053 (supports) · Expected pain heuristic; schema vs button colour.

### C1998 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** A two-sentence prompt has about a 50% chance of rework; never send unread code of that kind to another person to review.
- **Quote:** "Don't YOLO a two-sentence prompt and not read the code"
- **Evidence:** asserted — Illustrative estimate, not measured.
- **Bears on:** W2 · **Landing guess:** Author self-review before PR. · **Reader:** R50 (R50-11)
- **Family:** G2-F069 (already-done) — Scale planning depth by expected pain (probability of rework times its cost): spend effort on hard-to-change things like tables, skip easy ones, and avoid over- · **Relation:** supports · also G4-F209 (supports) · Illustrative 50% rework chance for a two-sentence prompt; do not send unread code to reviewers.

### C1999 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** HumanLayer keeps several planning workflows (design doc then ship; design plus ordering; a 3-4 stage PRD flow) chosen by feature size, each slicing off bad outcomes.
- **Quote:** "We have a bunch of different planning workflows."
- **Evidence:** anecdotal — Own practice.
- **Bears on:** W4, W5 · **Landing guess:** Tiered planning workflows in a reusable workflow library. · **Reader:** R50 (R50-12)
- **Family:** G2-F070 (already-done) — Use the shortest workflow that covers the main risk: small changes (copy tweaks, obvious-repro bugs, pure components) go straight to the agent or a mini outline · **Relation:** restates · Several planning workflows chosen by feature size.

### C2000 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Intent is best captured by rambling by voice for 60 seconds, then having the model interview the user relentlessly (grill-me style) down the decision tree.
- **Quote:** "relentlessly interview the user"
- **Evidence:** anecdotal — Personal practice; cites popularity of Matt Pocock's grill-me skill.
- **Bears on:** W4 · **Landing guess:** A grill-me skill in the skill packages. · **Reader:** R50 (R50-13)
- **Family:** G5-F001 (skip) — Dictate prompts by voice because speaking injects far more context detail than typing. · **Relation:** supports · also G3-F024 (supports) · Voice-ramble intent capture followed by relentless model interview.

### C2001 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** A good spec plus backpressure (feedback the model can get without a human) lets agents work two hours unattended and parallelise.
- **Quote:** "we call it like back pressure"
- **Evidence:** anecdotal — Practice claim.
- **Bears on:** L3 · **Landing guess:** Backpressure scripts as verifier inputs. · **Reader:** R50 (R50-14)
- **Family:** G4-F070 (already-done) — Backpressure: make it as easy as possible for the model to check its own work with fast, reliable, deterministic feedback (tests, linters, CI timing, a measurab · **Relation:** supports · also G4-F149 (supports) · Spec plus backpressure allows two-hour unattended runs.

### C2002 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Not reading code is fine for prototypes that prove what is possible (evolutionary subagent hill-climbing on 45 evals); then distil to a spec and reimplement cleanly.
- **Quote:** "I'm not reading any of that code."
- **Evidence:** anecdotal — Own code-search harness experiment, 45 evals.
- **Bears on:** L3, W5 · **Landing guess:** Throwaway prototype lane distinct from shipped code. · **Reader:** R50 (R50-15)
- **Family:** G2-F080 (skip) — Prototype big or unattended first, then reverse-engineer the result into a spec or a PR-splitting plan and rebuild as small reviewable PRs. · **Relation:** supports · Unread prototype is fine for proving possibility (45-eval hill-climb), then distil to spec and reimplement.

### C2003 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Frontier models improved at computer use and other domains but not at writing maintainable code; waiting for the next model is not a plan.
- **Quote:** "it didn't actually get that much better at writing code that is maintainable"
- **Evidence:** anecdotal — Reports of 'every good builder he knows'.
- **Bears on:** L3 · **Landing guess:** Keep human/Opus review of maintainability. · **Reader:** R50 (R50-16)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** supports · also G4-F141 (supports) · Models improved elsewhere but not at maintainable code; do not wait for the next model.

### C2004 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Maintainability lacks a fast oracle (you learn two months later), so RL cannot train it and models improve slowly at it.
- **Quote:** "There's no fast oracle for software maintainability."
- **Evidence:** asserted — Reasoning; credited partly to riffing with Addy Osmani.
- **Bears on:** L3 · **Landing guess:** Do not expect automated verifiers to judge maintainability; keep human review. · **Reader:** R50 (R50-17)
- **Family:** G4-F017 (trial) — Maintainability has no fast oracle: the cost of bad architecture shows up weeks to years later while tests answer in seconds, so fast loops reward the wrong thi · **Relation:** restates · also G4-F141 (supports) · No fast oracle for maintainability, so RL cannot train it.

### C2005 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** SlopCodeBench (not his; a University of Wisconsin lab, Dex helping with runs): sequential feature tasks inheriting the codebase; GPT-5.5 scored 14.8% in May and Astra 16.3% on the first run.
- **Quote:** "I think GPT-5.5 in May got a 14.8%."
- **Evidence:** measured — 14.8% (GPT-5.5, May); 16.3% (Astra first run); benchmark under-saturated.
- **Bears on:** L1, L3 · **Landing guess:** Benchmark baseline for maintaining a codebase over time; slow improvement. · **Reader:** R50 (R50-18)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** supports · also G4-F014 (supports) · SlopCodeBench 14.8% (GPT-5.5, May) to 16.3% (Astra first run).

### C2006 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** CLAUDE.md or AGENTS.md accumulating many always/never bullets means most are not followed because it is too much context; split opinions into skills.
- **Quote:** "a hundred bullet points into their claude MD, most of them don't get followed"
- **Evidence:** anecdotal — Observation of common practice.
- **Bears on:** W1, W4 · **Landing guess:** Trim CLAUDE.md and move rules into skills. · **Reader:** R50 (R50-19)
- **Family:** G1-F095 (skip) — Every prompt, CLAUDE.md, system prompt, tool and MCP draws on one instruction budget of roughly 150-250 instructions, beyond which adherence to all drops. · **Relation:** supports · also G1-F003 (supports) · Hundreds of always/never bullets mostly not followed; split into skills.

### C2007 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** HumanLayer runs four or five nightly cron/GitHub Action agents (same harness, different user message) with deterministic detectors (React Doctor, lint) that open PRs improving the codebase along one dimension.
- **Quote:** "every morning we wake up to five pull requests"
- **Evidence:** anecdotal — Own practice, 4-5 nightly agents.
- **Bears on:** W4, W5, L3 · **Landing guess:** Nightly cleanup workflows driven by deterministic detectors. · **Reader:** R50 (R50-20)
- **Family:** G3-F056 (skip) — Run scheduled overnight cleanup agents (linter/anti-pattern fix, janitor bots) that fix one thing and open one small PR a human reads, using loops for code qual · **Relation:** restates · 4-5 nightly agents with deterministic detectors opening improvement PRs.

### C2008 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Many codified opinions force clever context engineering: splitting into skills, parallelising and orchestrating multiple agents.
- **Quote:** "the more opinions you have, the more clever you have to be"
- **Evidence:** asserted — Argument.
- **Bears on:** W1, W4 · **Landing guess:** Skill packaging of conventions. · **Reader:** R50 (R50-21)
- **Family:** G1-F192 (skip) — Use progressive disclosure: keep a small root CLAUDE.md and move task-specific content into on-demand files, skills or directory-scoped CLAUDE.md files. · **Relation:** supports · also G1-F095 (supports) · More codified opinions force skill splitting and orchestration.

### C2009 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Building a software factory by throwing everything out and designing from scratch loses to getting 1% better every day or week.
- **Quote:** "big design up front is always gonna lose to iterate fast"
- **Evidence:** asserted — Argument.
- **Bears on:** W3, W5 · **Landing guess:** Incremental harness change, not a big-bang rebuild. · **Reader:** R50 (R50-22)
- **Family:** G3-F117 (adopt) — Grow the skill/agent/workflow library from workflows actually reused and from real agent failures (prune what does not help), abstracting only after patterns re · **Relation:** supports · Big design up front loses to iterating; grow the factory 1% at a time.

### C2010 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Unlike a car factory, bad output in a software factory degrades all later work because the model copies bad patterns; stop the bleeding before scaling.
- **Quote:** "it degrades every future piece of work that goes through that factory"
- **Evidence:** asserted — Analogy-based argument.
- **Bears on:** L3 · **Landing guess:** Gate bad patterns at merge; humans in the loop. · **Reader:** R50 (R50-23)
- **Family:** G4-F134 (already-done) — Slop compounds: each change that ships affects all later changes, a 10-12% bad-decision rate per feature degrades unattended factories toward unrecoverable, and · **Relation:** restates · Bad factory output compounds into all later work, unlike a car factory.

### C2011 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Siphon PR review comments and session traces into factory improvements (skills, review skill) by finding where people get frustrated; if not improving you are getting worse.
- **Quote:** "analyzing the session traces of everyone on your team"
- **Evidence:** asserted — Practice recommendation.
- **Bears on:** W2, W5 · **Landing guess:** Mining transcripts for corrections feeds the knowledge store. · **Reader:** R50 (R50-24)
- **Family:** G2-F066 (trial) — Run a weekly post-mortem loop that records where humans had to step in (PR comments, traces, user messages) and turns a few items per week into harness changes, · **Relation:** restates · also G4-F162 (supports) · Mine PR comments and session traces for factory improvements.

### C2012 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Shift from caring about each output to the velocity of the system that makes outputs, spending less time on individual code review over time.
- **Quote:** "from kind of building the car to building the factory"
- **Evidence:** asserted — Framing.
- **Bears on:** W5 · **Landing guess:** Invest in reusable workflows. · **Reader:** R50 (R50-25)
- **Family:** G3-F081 (already-done) — Investing in the factory (harness, CI, sandboxes, shared pipeline) compounds, quality comes from the apparatus around the model, and fixing the pipeline is ever · **Relation:** supports · Shift from building the car to building the factory; system velocity.

### C2013 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Humans will always have to review something (now code, later something else), or output matches everyone else's median; a founder's remark that he adopts.
- **Quote:** "there will probably always be alpha in reviewing something"
- **Evidence:** anecdotal — Dinner poll: all AI-written, about half still read code; 1-2 years to stop reviewing.
- **Bears on:** L3, W2 · **Landing guess:** Keep human review as a deliberate lane. · **Reader:** R50 (R50-26)
- **Family:** G4-F095 (skip) — Teams that skip review entirely converge on whatever the model would produce for anyone, losing domain-specific differentiation. · **Relation:** supports · also G4-F094 (supports) · Always something to review or output matches the median; adds a dinner-poll anecdote.

### C2014 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Advice to large enterprises: move fast without giving up control or taste; accept a ~1% chance of missing upside.
- **Quote:** "do not mortgage your code base for the future"
- **Evidence:** asserted — Client positioning.
- **Bears on:** none · **Landing guess:** Risk posture for a money-handling system. · **Reader:** R50 (R50-27)
- **Family:** NEW · **Relation:** new · Enterprise positioning advice about speed without mortgaging the codebase; no family.

### C2015 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** The durable moat is understanding the customer problem and knowing what to ask the factory for, which lets you context-engineer better than competitors.
- **Quote:** "understanding the problem better than anyone else"
- **Evidence:** asserted — Opinion.
- **Bears on:** none · **Landing guess:** Owner domain knowledge captured in the store. · **Reader:** R50 (R50-28)
- **Family:** NEW · **Relation:** new · Durable moat is customer-problem understanding; no family.

### C2016 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Build faster-than-reading-code review aids (50-80% faster) so the model explains what it did to the human efficiently, and brain-drains the human of tastes quickly.
- **Quote:** "let the model context engineer the human"
- **Evidence:** asserted — Aspirational.
- **Bears on:** L3, W2 · **Landing guess:** Six-question closing message and one-page owner view are this. · **Reader:** R50 (R50-29)
- **Family:** G4-F225 (trial) — Help the human review large diffs with generated aids: per-folder HTML summaries, a dependency diagram that shows a broken module boundary without reading code, · **Relation:** supports · also G3-F037 (supports) · Build review aids faster than reading code so the model explains itself to the human.

### C2017 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Predicts factory stacks will become open, portable components like Kubernetes, and advises against building on a single vendor's walled-garden stack.
- **Quote:** "the entire software factory stack will decompose into good interfaces"
- **Evidence:** asserted — Prediction.
- **Bears on:** W4 · **Landing guess:** Keep harness vendor-portable. · **Reader:** R50 (R50-30)
- **Family:** G3-F096 (already-done) — Own the factory as open, composable, repo-held files (markdown plus code extension files, declared in code, tools the agent can read and patch) rather than a bl · **Relation:** supports · Factory stack will decompose into open portable components; avoid walled gardens.

### C2018 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Taste rules such as duplicating three lines instead of abstracting are hard to put in a model and must be written as explicit opinions.
- **Quote:** "three copies, press hard"
- **Evidence:** anecdotal — Anecdote from a former boss.
- **Bears on:** W1 · **Landing guess:** Short named taste rules in skills. · **Reader:** R50 (R50-31)
- **Family:** G1-F070 (already-done) — The model lacks taste (adds contexts, spread hacks) until explicitly steered; keep a known-tics list in a skill or reviewer prompt. · **Relation:** supports · Taste rules like three-copies-over-abstraction must be written as explicit opinions.

### C2019 · 2026-09-22 · Tessl AI Native Dev 124
- **Source:** podcast, Dex, read — <https://tessl.io/podcast/124> (not in inventory)
- **Claim:** Chose a real-time sync database early; early architecture decisions cascade, and he reads code to catch slop patterns models create unattended.
- **Quote:** "there's just slop everywhere right now"
- **Evidence:** anecdotal — Own experience.
- **Bears on:** L3 · **Landing guess:** Early decisions human-owned. · **Reader:** R50 (R50-32)
- **Family:** G4-F140 (trial) — Humans must keep reading the code (at least on money, auth and lifecycle paths): an unread lights-off software factory quietly rots and ends in an unfixable 3am · **Relation:** supports · also G4-F093 (supports) · Early architecture cascades; reads code to catch slop models create unattended.

### C2020 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Core thesis: models left unattended do not improve or even maintain codebase quality, so a no-review (lights-out) factory is premature.
- **Quote:** "unattended, models will not improve or maintain your code-based quality over time"
- **Evidence:** asserted — Backed by SlopCodeBench and the May report, but stated as thesis.
- **Bears on:** L3 · **Landing guess:** Keep refuter/reviewer stage; do not drop human review of maintainability. · **Reader:** R51 (R51-1)
- **Family:** G2-F008 (already-done) — Letting agents run unattended (lights-off, no code reading) degrades the codebase within roughly 3-6 months, so human review gates and code reading must stay, a · **Relation:** supports · also G4-F140 (supports) · Restates the unattended-degradation thesis, citing SlopCodeBench and the May report as support.

### C2021 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** RL and verifiers need a fast oracle, but maintainability is only discovered months later, so models are not trained against it.
- **Quote:** "maintainability has no fast oracle"
- **Evidence:** asserted — Reasoned argument, no numbers.
- **Bears on:** L3 · **Landing guess:** Rationale for why verifier scripts cannot replace a human on architecture. · **Reader:** R51 (R51-2)
- **Family:** G4-F017 (trial) — Maintainability has no fast oracle: the cost of bad architecture shows up weeks to years later while tests answer in seconds, so fast loops reward the wrong thi · **Relation:** restates · Same claim: no fast oracle for maintainability, so models are not trained on it.

### C2022 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (inventory: SlopCodeBench reports (2026-10-15 update entry))
- **Claim:** SlopCodeBench (multi-checkpoint, evolving-feature benchmark from a Wisconsin lab) scored the best model 14.8% at launch, against 95% on saturated benchmarks.
- **Quote:** "GPT 5.5 was the best model on the market. It got a 14.8%."
- **Evidence:** measured — 14.8% GPT 5.5 at launch; contrasted with ~95% terminal-bench-type scores.
- **Bears on:** L3, L1 · **Landing guess:** Evidence base for treating verifier quality, not model choice, as the lever. · **Reader:** R51 (R51-3)
- **Family:** G4-F014 (already-done) — Best frontier models reach only about 12-33% strict pass on multi-checkpoint SlopCodeBench, so the benchmark is unsaturated and unattended maintainability is fa · **Relation:** supports · also G4-F015 (supports) · Adds the launch figure of 14.8% for the best model against about 95% on saturated benchmarks.

### C2023 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (inventory: 2026-10-15 SlopCodeBench update)
- **Claim:** Newest model gains only about 1.5 points on SlopCodeBench over GPT 5.5, so maintainability improves slower than claimed.
- **Quote:** "Astra is 1.5% percentage points higher than GPD 5.5."
- **Evidence:** measured — +1.5 percentage points (Astra X-high vs GPT-5.5).
- **Bears on:** L1, L3 · **Landing guess:** Do not assume next model fixes quality; matches 'do not mortgage' rule. · **Reader:** R51 (R51-4)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** supports · also G4-F014 (supports) · Newest model is only 1.5 points above GPT 5.5, matching the slow 14.8 to 16.3 improvement.

### C2024 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Changes the earlier 'sloppy now, next model fixes it' stance: models got better at computer use and demos but not at code-quality, so he stops betting on future models.
- **Quote:** "that'll be GPT-7's problem. Folks, we're at GPT6"
- **Evidence:** anecdotal — Cites online reports and benchmark; no numbers beyond SlopCodeBench.
- **Bears on:** L3 · **Landing guess:** Supports reading code now; informs W1/W4 decision not to wait for models. · **Reader:** R51 (R51-5)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** updates · also G5-F007 (supports) · Author drops the earlier 'next model fixes it' stance after seeing slow maintainability gains.

### C2025 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Cites a May report that since Opus 4.5 adoption review quality fell, more PRs skip review, incidents per PR and bugs per developer rose, and he rejects 'skill issue'.
- **Quote:** "since January ... code review quality is way down"
- **Evidence:** measured — Third-party report cited, no figures given in talk.
- **Bears on:** L3, W2 · **Landing guess:** Argument for keeping review gates and PR-bound reviewer. · **Reader:** R51 (R51-6)
- **Family:** G4-F101 (already-done) — Faros AI report: after AI adoption review quality fell (31.3% of PRs skip review, incidents per PR +242.7%, bugs per developer +54%), correlational, supporting  · **Relation:** supports · Cites the same May report on skipped reviews and rising incidents and bugs, adding his rejection of 'skill issue'.

### C2026 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Because unattended output degrades, the engineer should read the code; his 12-factor-factories list starts from that.
- **Quote:** "for now we should probably read the code"
- **Evidence:** asserted — Conclusion of thesis.
- **Bears on:** L3, W2 · **Landing guess:** Owner-read step in closing message / owner view. · **Reader:** R51 (R51-7)
- **Family:** G4-F140 (trial) — Humans must keep reading the code (at least on money, auth and lifecycle paths): an unread lights-off software factory quietly rots and ends in an unfixable 3am · **Relation:** restates · Conclusion that engineers should keep reading the code for now.

### C2027 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Factor one: 20-30 minutes of planning before building saves hours in review, as teams did before AI.
- **Quote:** "Plan before you build. 20 minutes, 30 minutes up front, can save you hours"
- **Evidence:** asserted — No measurement.
- **Bears on:** W3 · **Landing guess:** Phase routine plan phase (Plan @ sha). · **Reader:** R51 (R51-8)
- **Family:** G2-F005 (already-done) — Front-load alignment: 20-30 minutes reviewing a short (~200 line) product/design/spec document saves hours of PR review and rework, so put the human checkpoint  · **Relation:** restates · Plan for 20-30 minutes up front to save hours of review.

### C2028 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Plan depth is an expected-pain curve: a two-sentence prompt has ~50% rework chance, a five-hour hand-written spec ~10%, hand-writing 0%; tune per task by how likely and how painful the change is.
- **Quote:** "Don't overplan, though."
- **Evidence:** anecdotal — Illustrative percentages (50%, 10%, 0%), not measured.
- **Bears on:** W3 · **Landing guess:** Gate on plan depth by task risk instead of one routine for all. · **Reader:** R51 (R51-9)
- **Family:** G2-F069 (already-done) — Scale planning depth by expected pain (probability of rework times its cost): spend effort on hard-to-change things like tables, skip easy ones, and avoid over- · **Relation:** supports · Same expected-pain planning-depth idea, with illustrative rework percentages at each depth.

### C2029 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Align visually: a 'show me' skill (open source, ~20K installs) has the model present plans, stacked-PR breakdown and order of changes visually rather than as prose.
- **Quote:** "Find ways to let the model give you information in a way that doesn't make you have to read walls"
- **Evidence:** anecdotal — ~20K installs claimed.
- **Bears on:** W4, W3 · **Landing guess:** Skill candidate; owner one-page view. · **Reader:** R51 (R51-10)
- **Family:** G3-F037 (skip) — A /show-me skill makes agents explain code, plans and diffs with compact forms (component and call trees, file layouts with one-line responsibilities, signature · **Relation:** supports · also G5-F010 (supports) · The 'show me' skill in use, with an install count of about 20K.

### C2030 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Help agents test their own work with browser, running app, curl and video, as backpressure.
- **Quote:** "Give them a browser, let them run the app, let them use curl, let them record videos."
- **Evidence:** asserted — No numbers.
- **Bears on:** L3 · **Landing guess:** Verifier tooling for web/mobile slices. · **Reader:** R51 (R51-11)
- **Family:** G4-F070 (already-done) — Backpressure: make it as easy as possible for the model to check its own work with fast, reliable, deterministic feedback (tests, linters, CI timing, a measurab · **Relation:** supports · Backpressure by giving agents a browser, curl and video so they can check their own work.

### C2031 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Points to a third-party catalogue of ~100 Oxlint rules for agent anti-patterns in TypeScript, plus rules in the SlopCodeBench paper, as steal-able deterministic backpressure.
- **Quote:** "There's about 100 anti-slop rules."
- **Evidence:** anecdotal — ~100 rules; repo by Dylan Milroy as transcribed.
- **Bears on:** L3 · **Landing guess:** Custom ESLint rules in web/mobile CI; Ruff rules for backend. · **Reader:** R51 (R51-12)
- **Family:** G4-F008 (trial) — Encode recurring defect shapes and domain invariants as deterministic lint, typed and import rules (one new linter per anti-pattern) instead of adding prompt, m · **Relation:** supports · also G4-F010 (supports) · Points to roughly 100 third-party Oxlint anti-slop rules as ready deterministic backpressure.

### C2032 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Feed incidents and support tickets into the factory: the alert arrives with an agent-drafted fix PR, even if only half are mergeable.
- **Quote:** "have the pager alert come with the PR the agent thinks will fix it"
- **Evidence:** asserted — 50% merge illustrative.
- **Bears on:** L3, W5 · **Landing guess:** Sentry-to-PR workflow idea for the ops console. · **Reader:** R51 (R51-13)
- **Family:** G3-F057 (skip) — Route incidents, Sentry crashes and triaged tickets straight into the factory so alarms produce pull requests, extending shipping beyond coding. · **Relation:** supports · The pager alert arrives with an agent-drafted fix PR.

### C2033 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Demystifies 'loops': triggers that start work (schedules, webhooks) plus feedback while working so the agent hill-climbs without a human.
- **Quote:** "loops are basically a combination of forward pressure and back pressure"
- **Evidence:** asserted — Definition.
- **Bears on:** L3, W5 · **Landing guess:** Framing for workflow library: trigger plus backpressure. · **Reader:** R51 (R51-14)
- **Family:** G3-F049 (skip) — Frame recurring agent work as a control loop (set point, sensor, controller, actuator, optional dampener regression gate) with a human on the loop. · **Relation:** supports · also G4-F149 (supports) · Defines loops as forward pressure (triggers) plus back pressure (feedback).

### C2034 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Compound over time: analyze team sessions for struggles and feed them into skills or memory.
- **Quote:** "go analyze the sessions of your team, figure out what they're struggling with"
- **Evidence:** asserted — No data.
- **Bears on:** W4, W5, W2 · **Landing guess:** Transcript review feeding skills; helps distinguish skipped routine from unused store. · **Reader:** R51 (R51-15)
- **Family:** G2-F066 (trial) — Run a weekly post-mortem loop that records where humans had to step in (PR comments, traces, user messages) and turns a few items per week into harness changes, · **Relation:** supports · also G2-F068 (supports) · Analyse team sessions to find struggles and feed them into skills or memory.

### C2035 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** The AI-native forge needs a central system of record for sessions, plans and prompts, instead of pasting between chats; diffs stream to the cloud so review need not wait for PRs.
- **Quote:** "sessions and plans and prompts and all this stuff kind of lives in a centralized"
- **Evidence:** asserted — Product vision.
- **Bears on:** W3, W2 · **Landing guess:** Plan @ sha PR body and journal as the interim record. · **Reader:** R51 (R51-16)
- **Family:** G2-F087 (already-done) — Plans, designs and sessions should live in shared, commentable documents (a 'GitHub for pre-code work') and continuous review rather than late PR review or disc · **Relation:** supports · Central shared system of record for sessions, plans and prompts.

### C2036 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Cites Steve Yegge's reversal (after a year of 'read code and fall behind') that models write unreadable complexity they cannot debug, as support for reading code.
- **Quote:** "even Steve's come around"
- **Evidence:** anecdotal — Third-party statement relayed.
- **Bears on:** L3 · **Landing guess:** nowhere obvious · **Reader:** R51 (R51-17)
- **Family:** G4-F140 (trial) — Humans must keep reading the code (at least on money, auth and lifecycle paths): an unread lights-off software factory quietly rots and ends in an unfixable 3am · **Relation:** supports · also G4-F094 (supports) · Steve Yegge's reversal relayed as third-party support for reading code.

### C2037 · 2026-09-18 · State of Software Factories // Slop Bench
- **Source:** talk, Dex, read — <https://www.youtube.com/watch?v=ix1qQK1IvmA> (not in inventory)
- **Claim:** Back pressure for UI: ship several variants behind flags and let user behaviour pick, since models cannot see UI as humans do.
- **Quote:** "Let models experiment, give them feature flagging tooling"
- **Evidence:** asserted — No data.
- **Bears on:** L3 · **Landing guess:** Low relevance to single-tenant shop app; mobile UI verification idea. · **Reader:** R51 (R51-18)
- **Family:** G4-F220 (already-done) — Build backpressure and feedback automation incrementally (CLI/MCP plus a manual agent session first, loop later), and gradually ramp features via flags with an  · **Relation:** supports · Feature-flagged UI variants picked by user behaviour, matching the gradual flag ramp.

### C2038 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (inventory: podcast listing (line 86, description only))
- **Claim:** Do not accept sloppy code hoping a future model will fix it; labs hill-climb other things and the last 10% of maintainability may be as hard as the first 90%.
- **Quote:** "do not mortgage your code base"
- **Evidence:** asserted — Judgement.
- **Bears on:** L3 · **Landing guess:** Standing rule for reviewer: no deferring structural debt to future models. · **Reader:** R51 (R51-19)
- **Family:** G4-F015 (already-done) — Models improve fast at one-off tickets but slowly (14.8% to 16.3% strict May to September) at maintaining a codebase over time, and no benchmark shows otherwise · **Relation:** supports · also G4-F142 (supports) · Do not accept sloppy code hoping a future model fixes it.

### C2039 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (inventory: 2026-10-15 SlopCodeBench update)
- **Claim:** SlopCodeBench differs from SWE-bench-style, marathon and judge-model benchmarks by evolving one codebase over 3-10 checkpoints without disclosing the whole problem; failing tests trend up for all models.
- **Quote:** "it gives the model a thing to build, Greenfield. And then it says, cool, now take that code base"
- **Evidence:** measured — 3-10 checkpoints per challenge; GPT 5.5 about 15% in May, newest model 16.5% (his sponsored run).
- **Bears on:** L3, L1 · **Landing guess:** Design verifiers around evolution across tasks, not one-shot tests. · **Reader:** R51 (R51-20)
- **Family:** G4-F018 (skip) — A trustworthy maintainability benchmark feeds a model features one at a time from a hidden roadmap (about 20) and scores how the codebase evolves; whole-project · **Relation:** supports · also G4-F014 (supports) · Explains how SlopCodeBench evolves one codebase over 3-10 checkpoints; newest model scores 16.5%.

### C2040 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Planning in zoom levels (one-pager, then design) eliminates about 50% then 80% of bad solutions, aiming for 0-10% rework versus 25-55% when one-shotting large agent PRs; the code, not the spec, stays source of truth.
- **Quote:** "from 25,000 foot view ... eliminate like 50% of the bad things"
- **Evidence:** anecdotal — Estimated percentages 50%, 80%, 0-10% vs 25-55% rework; not measured.
- **Bears on:** W3 · **Landing guess:** Plan phase structure: one-page first, design second. · **Reader:** R51 (R51-21)
- **Family:** G2-F091 (already-done) — Plan in zoom levels (sentence, one-pager, outline, code), spending about 10 minutes per level for ~80% correctness and checking each level, rather than one big  · **Relation:** supports · Zoom-level planning with estimated 50% then 80% elimination of bad solutions.

### C2041 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** A design doc separates end state from how to get there; teams customize it, e.g. four required questions at the top, and conventions vary per team.
- **Quote:** "we call it a design doc rather than a plan"
- **Evidence:** anecdotal — Forward-deployed customer practice.
- **Bears on:** W3, W1 · **Landing guess:** Plan @ sha body template with required top questions. · **Reader:** R51 (R51-22)
- **Family:** G2-F075 (skip) — Plan/design templates carry fixed sections (current state, desired end state, what we are not doing, open questions, testing patterns) and verification steps th · **Relation:** supports · also G1-F142 (supports) · Design doc separates end state from how to get there; teams customise the template.

### C2042 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Some enterprise teams ban the most expensive model by default and require a request for temporary access per task, as a model-spend control.
- **Quote:** "plenty of teams where Fable has just been banned."
- **Evidence:** anecdotal — Customer anecdote.
- **Bears on:** L1 · **Landing guess:** Effort/model routing default with justified escalation. · **Reader:** R51 (R51-23)
- **Family:** NEW · **Relation:** new · Default-ban of the most expensive model with per-task access requests as a spend control; no family covers this.

### C2043 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** PM-written 10-page AI documents were rejected as slop and detached from the code; fix with concision skills plus a pipeline that researches all repos, then interrogates the author (grill-me style) on problem and success measure.
- **Quote:** "give the model better steering and skills of like, hey, here's how to keep it concise"
- **Evidence:** anecdotal — Customer example, 200 repos.
- **Bears on:** W4, W3 · **Landing guess:** Skill pairing: concise-writing skill plus interrogation step before specs. · **Reader:** R51 (R51-24)
- **Family:** G3-F024 (skip) — Interview skills ask the owner one question at a time with a recommended answer, and read the repo (or CI, skills, loops) first so they arrive with proposals ra · **Relation:** supports · also G2-F061 (supports) · Concision skills plus an author-interrogating pipeline to fix PM-written slop documents.

### C2044 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Dark-factory claims from executives are mostly posturing; a principal-engineer example shows 30,000-line slop PRs where 90% AI-written claims are made.
- **Quote:** "I think most of it is BS."
- **Evidence:** anecdotal — One meeting anecdote.
- **Bears on:** L3 · **Landing guess:** nowhere obvious · **Reader:** R51 (R51-25)
- **Family:** G4-F105 (already-done) — Agents author oversized, unfocused PRs (40,000-line loop output); split big prototypes into separate 1-3k-line PRs and use HTML diff walkthroughs to order chang · **Relation:** supports · also G2-F008 (supports) · Dark-factory claims called posturing, with a 30,000-line slop PR anecdote.

### C2045 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Aim for 2-4x incrementally and compound, not 10x-100x by discarding all engineering practice.
- **Quote:** "figure out how to go two to three times faster."
- **Evidence:** asserted — Judgement; says 10x possible.
- **Bears on:** W3, W5 · **Landing guess:** Expectation setting for adoption of routine/workflow library. · **Reader:** R51 (R51-26)
- **Family:** G2-F089 (skip) — Realistic gains for production work are 2-4x, not 10-100x, and reliability matters more than demos. · **Relation:** restates · also G4-F205 (restates) · Aim for 2-4x incrementally, not 10-100x.

### C2046 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** On dropping pull requests: ownership culture (author owns it alone, no shared blame with reviewer) matters more than PR process; but he sends design docs to the CTO early because fixing before merge is cheaper.
- **Quote:** "culture beats process every single time"
- **Evidence:** anecdotal — First-job experience.
- **Bears on:** W2, L3 · **Landing guess:** Early plan-review step; owner is author of record. · **Reader:** R51 (R51-27)
- **Family:** G2-F124 (skip) — Safety through culture rather than enforcing hooks and gates worked at about 20 engineers, a counterweight to adding pre-commit or review gates. · **Relation:** supports · also G2-F006 (supports) · Ownership culture over PR process, while still sending design docs to the CTO early.

### C2047 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Screenshots and videos show correctness only; linters and cyclomatic-complexity limits block categories of slop, but nothing deterministic or prompted drives maintainability without a human in the loop.
- **Quote:** "I have never seen a prompt or a deterministic tool that can like drive code base maintainability"
- **Evidence:** anecdotal — Experience across many linters.
- **Bears on:** L3, W2 · **Landing guess:** Backpressure scripts as floor; reviewer/human remains for architecture. · **Reader:** R51 (R51-28)
- **Family:** G4-F009 (already-done) — Linters cannot generally catch slop patterns (blanket try/catch, double casts) because the same code is sometimes correct; team rules can go in a prompt or lint · **Relation:** restates · also G4-F142 (supports) · No deterministic tool or prompt drives maintainability without a human in the loop.

### C2048 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Uses Matt Pocock's improve-codebase-architecture skill, sometimes accepting first fixes unseen, but its value comes from a human steering the refactor direction.
- **Quote:** "the thing that makes that skill useful is is having a human in the loop"
- **Evidence:** anecdotal — Personal use.
- **Bears on:** W4, L3 · **Landing guess:** Candidate skill for the 13-package set. · **Reader:** R51 (R51-29)
- **Family:** G3-F028 (already-done) — An architecture-review skill outputs a self-contained HTML report with before/after and a strength badge per candidate, then stops so the human chooses before a · **Relation:** supports · Architecture-improvement skill is useful only with a human steering the refactor direction.

### C2049 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Good review comments probe and point to existing patterns; but pasting comments to an AI means the author learns nothing, so design-doc review becomes the place to coach prompting.
- **Quote:** "The worst pull request comment is like this is wrong I rewrote it for you"
- **Evidence:** anecdotal — Observations; Hashimoto 'ask your Claude why' example relayed.
- **Bears on:** W3, L3 · **Landing guess:** Reviewer comments that point to repo patterns rather than rewrite. · **Reader:** R51 (R51-30)
- **Family:** G4-F133 (skip) — AI changes PR review pedagogy: say what is wrong and make the author work out why, since location hints just get pasted into Claude. · **Relation:** supports · also G2-F092 (supports) · Probing review comments; pasting them to an AI teaches nothing, so coach in design-doc review.

### C2050 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Because a design doc is a prompt, commenting on it teaches the author better prompting and may become as important as code review.
- **Quote:** "design doc is basically a prompt"
- **Evidence:** asserted — Prediction.
- **Bears on:** W3 · **Landing guess:** Plan @ sha PR as reviewable prompt. · **Reader:** R51 (R51-31)
- **Family:** G2-F092 (already-done) — The design doc is the cheap place to steer: have the agent dump its understanding and patterns, then correct bad-pattern choices before any code exists; writing · **Relation:** supports · A design doc is a prompt, so commenting on it teaches prompting.

### C2051 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** His team's mix: 50-60% small one-shot changes (under a couple hundred lines) with no up-front planning, ~10% of PRs from overnight janitor bots, ~30% via the research-plan-implement family.
- **Quote:** "at least 50 to 60% of our work is like basically one-shotted"
- **Evidence:** anecdotal — Self-reported shares 50-60%, 10%, 30%.
- **Bears on:** W3, W5 · **Landing guess:** Tier the routine: skip plan phase for small changes. · **Reader:** R51 (R51-32)
- **Family:** G2-F070 (already-done) — Use the shortest workflow that covers the main risk: small changes (copy tweaks, obvious-repro bugs, pure components) go straight to the agent or a mini outline · **Relation:** supports · also G3-F056 (supports) · Self-reported mix of one-shot changes, janitor-bot PRs and the full planning flow.

### C2052 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Janitor bots hold a desired end state (refactors, lint-rule fixes, migrations) via small nightly PRs, at most one open per PR type tracked by labels, and no new run until the last is merged (kanban limit).
- **Quote:** "It's kind of like a thermostat, right?"
- **Evidence:** anecdotal — 3-6 PR types; one open each.
- **Bears on:** W5, L3 · **Landing guess:** Scheduled workflow candidate with WIP limit by label. · **Reader:** R51 (R51-33)
- **Family:** G4-F076 (already-done) — Flow control: exit a loop at start if its previous PR is still open, so work never stacks on unreviewed work (at most one PR open per loop). · **Relation:** supports · also G3-F056 (supports) · Janitor bots with at most one open PR per type, no new run until the last is merged.

### C2053 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Automated PRs must be small and digestible.
- **Quote:** "If the PR is too big, it never gets merged."
- **Evidence:** anecdotal — Experience.
- **Bears on:** L3, W5 · **Landing guess:** Size cap on agent PRs. · **Reader:** R51 (R51-34)
- **Family:** G4-F105 (already-done) — Agents author oversized, unfocused PRs (40,000-line loop output); split big prototypes into separate 1-3k-line PRs and use HTML diff walkthroughs to order chang · **Relation:** supports · also G3-F056 (supports) · Automated PRs must stay small enough to be merged.

### C2054 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Research is run in a session that does not know the ticket so it stays objective, then plan sessions (product requirements first if ambiguous, then design, then an ordering doc).
- **Quote:** "another session that doesn't know what the ticket was"
- **Evidence:** anecdotal — Own process; acronym garbled by transcription.
- **Bears on:** W3, L2 · **Landing guess:** Research phase with blind brief; one phase per session. · **Reader:** R51 (R51-35)
- **Family:** G2-F013 (skip) — The research agent should receive only neutral current-state questions and never the ticket or intended change, so findings are not steered toward the planned s · **Relation:** restates · Research session that does not know the ticket; adds the plan sequence of requirements, design and ordering.

### C2055 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Large work is broken into checkpointed chunks (about every 1,000 lines), sometimes as stacked PRs, to shrink the debug surface.
- **Quote:** "it's a lot easier to ship 10,000 lines of code if you check it every thousand lines"
- **Evidence:** anecdotal — 1,000 vs 10,000 lines illustration.
- **Bears on:** L3, L2 · **Landing guess:** Ordering doc plus stacked PR per checkpoint. · **Reader:** R51 (R51-36)
- **Family:** G4-F104 (already-done) — Review in 100-200 line increments, peek after the first steps of a vertical slice and re-steer early; prefer five mini diffs to one 2,000-line change, and write · **Relation:** supports · Checkpoint about every 1,000 lines, sometimes as stacked PRs.

### C2056 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Parent and subagent model pairings are chosen per task (big orchestrating small, or same model), he uses one model for nearly everything, and cross-provider orchestration needs the Codex CLI for now.
- **Quote:** "I use Soul for almost everything now."
- **Evidence:** anecdotal — Model names as transcribed (Soul, Fable, Opus).
- **Bears on:** L1, W4 · **Landing guess:** Model routing per agent definition. · **Reader:** R51 (R51-37)
- **Family:** G4-F206 (already-done) — Default to the smartest model and generic mechanisms, and only do token pinching, context engineering or first-class integration on the high-use paths once usag · **Relation:** supports · Uses one model for nearly everything; pairings are chosen per task.

### C2057 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Internal cultural rule: read your agent's code before sending it for review; he sometimes changes half of it or throws it out and returns to design.
- **Quote:** "do not send anyone code for review that you yourself have not read"
- **Evidence:** anecdotal — Team rule.
- **Bears on:** W2, L3 · **Landing guess:** Closing-message question: did the author read the diff. · **Reader:** R51 (R51-38)
- **Family:** G4-F140 (trial) — Humans must keep reading the code (at least on money, auth and lifecycle paths): an unread lights-off software factory quietly rots and ends in an unfixable 3am · **Relation:** supports · also G4-F094 (supports) · Team rule: read your agent's code before sending it for review.

### C2058 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Incremental zoom-in planning (product, tech, steps) lets you discard output and return to an earlier level at any point.
- **Quote:** "you can just throw out the output and try again"
- **Evidence:** anecdotal — Process claim.
- **Bears on:** W3, L2 · **Landing guess:** Allow phase rollback to design instead of patching. · **Reader:** R51 (R51-39)
- **Family:** G2-F091 (already-done) — Plan in zoom levels (sentence, one-pager, outline, code), spending about 10 minutes per level for ~80% correctness and checking each level, rather than one big  · **Relation:** supports · also G2-F090 (supports) · Zoom-in planning lets you discard output and return to an earlier level.

### C2059 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Fewer concurrent tasks give faster end-to-end value; plan two things, watch them, always keep one most important thing that wins when unblocked; do not wake to 10,000 lines overnight.
- **Quote:** "do less things in parallel"
- **Evidence:** anecdotal — No measurements; he says he wants a study.
- **Bears on:** L2, W3 · **Landing guess:** WIP limit on parallel phases/PRs. · **Reader:** R51 (R51-40)
- **Family:** G1-F110 (already-done) — Limit parallel agents and work in progress: one primary task plus one or two secondary; heavy parallelism and overnight runs backfire. · **Relation:** supports · Fewer concurrent tasks and one most-important task; no overnight bulk output.

### C2060 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** A 10-20 minute async research step in a large repo gives the model 90-99% of needed context and misses are easy to find, which beats steering it interactively.
- **Quote:** "I'm willing to, like, async for 15, 20 minutes"
- **Evidence:** anecdotal — 10-20 minutes; 90-99% context estimate.
- **Bears on:** L2, W3 · **Landing guess:** Research phase as a separate async session producing a doc. · **Reader:** R51 (R51-41)
- **Family:** G2-F153 (skip) — Research pays off: about 30 minutes documenting the codebase saves hours of thrashing, and research-backed plans put fixes in the right place. · **Relation:** supports · A 10-20 minute async research step gives 90-99% of context.

### C2061 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Token-maxing on subscriptions does not transfer to serious work; enterprises pay per token for security and retention, so spend discipline (L1) matters and 'skill issue' is not 'too few tokens'.
- **Quote:** "no enterprise has subscription plans. They're all paying per token."
- **Evidence:** anecdotal — Customers with 15 engineers on per-token plans.
- **Bears on:** L1 · **Landing guess:** Cost-aware effort routing for verifiers. · **Reader:** R51 (R51-42)
- **Family:** G4-F204 (skip) — The meta has shifted from 'token harder' (spend maximally via Ralph loops, RPI, parallel worktrees) to 'token smarter': more tokens do not substitute for skill  · **Relation:** supports · also G4-F062 (supports) · Subscription token-maxing does not transfer to enterprise per-token work.

### C2062 · 2026-09-30 · Beyond Coding ep. 270
- **Source:** podcast, Dex, read — <https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627> (not in inventory)
- **Claim:** Architectural taste comes from being bitten over years; models lack it, so humans must supply it, and juniors need mentorship by probing questions to build it.
- **Quote:** "We haven't figured out how to put that taste into models."
- **Evidence:** asserted — No data; relays a peer's plea for deletion/refactor RL tasks.
- **Bears on:** L3, W1 · **Landing guess:** Encode owner's architectural rules as reviewer checklist items. · **Reader:** R51 (R51-43)
- **Family:** G3-F102 (already-done) — Models cannot be RL-trained on architecture quality, so keep human architecture review and bake architecture opinions into skills. · **Relation:** supports · also G4-F090 (supports) · Architectural taste is not in the models, so humans must supply it.

### C2063 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** On the October SlopCodeBench run Opus 5.5 at medium effort beat Opus 5.5 at xhigh on strict pass rate; the video says about three points, whereas the article's 28 vs 25 of 196 checkpoints is about 1.5 points (a discrepancy).
- **Quote:** "Opus 5.5 median did way better than Opus 5.5x high, like three percentage points."
- **Evidence:** measured — One run per setting, 36 problems, 196 checkpoints; strict pass rate. The video gives no run-to-run variance; the article states one campaign per setting.
- **Bears on:** L1 · **Landing guess:** Effort routing: default Claude-family verifiers and workers to medium rather than xhigh, pending a repeat on a FixFlow task. · **Reader:** R52 (R52-1)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** supports · also G4-F022 (supports) · Same medium-over-xhigh result for Opus on one run; video says ~3 points vs article 1.5 (28 vs 25); single run, so noise caveat applies.

### C2064 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** The effort effect is model-family specific: medium is cheaper and better for Opus, but for the OpenAI models (Astra) medium is cheaper and worse, so xhigh pays off there.
- **Quote:** "if you use medium, it's cheaper and better for Opus. But if you use medium for Astra, it's cheaper, but not as good."
- **Evidence:** measured — Same single-run-per-setting data; Dex adds the caveat that this may just be the shape of this benchmark.
- **Bears on:** L1 · **Landing guess:** Effort routing table keyed per model family, not one global effort setting; do not copy an OpenAI-family xhigh finding to Claude verifiers. · **Reader:** R52 (R52-2)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** contradicts · Narrows the family: for the OpenAI models medium is cheaper but worse, so medium-by-default does not hold across model families.

### C2065 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Dex hedges his own effort finding live: the Claude-medium versus OpenAI-xhigh split may be an artefact of this benchmark, so it is not a general rule (the article says one campaign per setting cannot show variance).
- **Quote:** "And that might just be the shape of this benchmark."
- **Evidence:** asserted — Self-caveat; no repeat runs or variance given in the video.
- **Bears on:** L1 · **Landing guess:** Treat 'medium beats xhigh' as a hypothesis to test on FixFlow's own verifier tasks, not a settled routing rule. · **Reader:** R52 (R52-3)
- **Family:** G4-F022 (adopt) — Single-run benchmark differences (including medium vs xhigh) cannot separate effort from run-to-run variance; treat 1-4 strict-pass gaps as noise unless repeate · **Relation:** supports · also G4-F034 (supports) · Dex's own live caveat that the split may be the shape of this benchmark; consistent with treating single-run gaps as noise.

### C2066 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** For the OpenAI-family models more effort buys more strict passes at higher cost, with an overall upward cost-versus-success trend, except where a model spends heavily and does not improve.
- **Quote:** "you're paying more, but you get better performance from these models when you use X high"
- **Evidence:** measured — Cost versus success-rate chart described on screen; exact dollar numbers not spoken (article: xhigh costs 2.11-4.22x medium in the three full pairs).
- **Bears on:** L1 · **Landing guess:** Cost-aware effort setting: spend xhigh only on model families where it is shown to help. · **Reader:** R52 (R52-4)
- **Family:** G4-F034 (trial) — Medium effort matched or beat xhigh on strict passes for most model pairs at 2-4x lower cost, so default verifiers to medium and escalate only for named reasons · **Relation:** contradicts · also G4-F035 (contradicts) · For OpenAI models more effort buys more strict passes at higher cost, with an upward cost-vs-success trend, against the claim that spend is a weak predictor.

### C2067 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Fable 5.1 at xhigh was far more expensive and not impressive at solving the benchmark, so Dex sees it as a spec double-checker rather than a coder.
- **Quote:** "fable 5.1 x high which was like way more expensive and not impressive at all"
- **Evidence:** anecdotal — Chart read on screen; the article puts Fable's cost at about 8.68x GPT-6.1 Medium with three fewer strict passes.
- **Bears on:** L1, L3 · **Landing guess:** Model routing: use the expensive model for verifying against a spec, not for implementation. · **Reader:** R52 (R52-5)
- **Family:** G4-F035 (skip) — Cost is a weak predictor of outcome across models: the priciest configuration did not lead and ~5-8x spend bought ~2 points or fewer strict passes. · **Relation:** supports · also G4-F170 (supports) · Fable xhigh very expensive and not impressive on strict passes; Dex repositions it as a spec double-checker.

### C2068 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Dex's current use of Fable is as a checker of whether work abides by a spec, which is a verifier-role routing suggestion.
- **Quote:** "Fable is great in my opinion just for like double checking a spec"
- **Evidence:** anecdotal — Personal usage opinion, no numbers.
- **Bears on:** L3, L1 · **Landing guess:** Reviewer and refuter model choice: consider a spec-conformance checker role distinct from the implementer. · **Reader:** R52 (R52-6)
- **Family:** G4-F170 (already-done) — Route by stage: strongest model for research, planning and checking/review, a smaller cheaper model for plan-guided implementation, escalating when it struggles · **Relation:** supports · Dex uses Fable as a spec/verifier role rather than a coder; same cheap-writer, smart-checker routing.

### C2069 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Strict pass rate means the current checkpoint's tests plus every earlier checkpoint's tests all pass, and one regression locks the model out of any later strict pass, which is why Dex treats it as the metric that matters.
- **Quote:** "basically the strict pass is basically the current checkpoints. tests and every previous test has to pass"
- **Evidence:** asserted — Metric definition; the video also notes a failing checkpoint caps all later strict scores.
- **Bears on:** L3 · **Landing guess:** Verifier design: check regression against all earlier requirements, not only the latest change. · **Reader:** R52 (R52-7)
- **Family:** G4-F020 (already-done) — Grade on strict pass (new tests plus all inherited regression tests), not isolated pass, because an early defect carries forward and regressions are the real fa · **Relation:** restates · Strict pass definition: current plus all inherited regression tests; adds that one regression caps all later strict scores.

### C2070 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** The benchmark is about 196 checkpoints across 30-36 problems (he says 30 then 36 in the same talk), each checkpoint inheriting the previous code so the model builds on its own slop.
- **Quote:** "each challenge has three to eight checkpoints, and there's like 30 challenges with 196 checkpoints."
- **Evidence:** measured — Benchmark size only; one run per model-effort setting.
- **Bears on:** L1, L3 · **Landing guess:** Sample-size context when weighing any effort-level claim: 196 checkpoints, one run per setting. · **Reader:** R52 (R52-8)
- **Family:** G4-F184 (skip) — Benchmarks need to go beyond pass/fail: judge-model scoring against a golden patch plus a rule-based quality judge, and long-horizon multi-change benchmarks (e. · **Relation:** supports · Benchmark description: ~196 checkpoints, 3-8 per challenge, each inheriting prior code (30 vs 36 problems inconsistency).

### C2071 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Even the best run finished with failing tests: only Astra ended with all tests passing on 3 of 36 problems, so checkpoint success is not the same as a working final program.
- **Quote:** "only Astra was like basically like three out of, yeah, three out of six, 36."
- **Evidence:** measured — Final-snapshot test run on 36 problems; transcript wording is garbled, so the exact count is uncertain.
- **Bears on:** L3 · **Landing guess:** Run the full suite on the final state, not only per-step checks. · **Reader:** R52 (R52-9)
- **Family:** G4-F021 (already-done) — Regression is the dominant failure: core pass is 66-74% but strict only 12-16%, erosion stays flat across months and packs, and final code still fails hundreds  · **Relation:** supports · Even the best run ends with failing final tests (Astra 3 of 36 clean), so checkpoint success is not a working final program.

### C2072 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** A lights-off factory that feeds a model features and high-level design accumulates slop, so the odds of a correct answer without breaking earlier requirements fall over time.
- **Quote:** "if you just do the lights off factory thing and just feed a model features and high-level design"
- **Evidence:** asserted — Framing of the SlopCodeBench thesis; supported by the benchmark's low strict pass rates.
- **Bears on:** L3, W3 · **Landing guess:** Argues for refactor and maintenance checkpoints in the phase routine rather than only feature checkpoints. · **Reader:** R52 (R52-10)
- **Family:** G4-F134 (already-done) — Slop compounds: each change that ships affects all later changes, a 10-12% bad-decision rate per feature degrades unattended factories toward unrecoverable, and · **Relation:** supports · also G2-F008 (supports) · Lights-off factory feeding features accumulates slop and compounds, so correctness odds fall over time.

### C2073 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Models lack maintainability intuition because RL makes them good at coding but nobody has worked out how to train for maintainability, which is partly an act of disobeying the instruction.
- **Quote:** "we haven't figured out how RL models on like software maintainability."
- **Evidence:** asserted — Reasoned opinion, no data.
- **Bears on:** L3 · **Landing guess:** Maintainability has to be imposed from outside (rules, linters, reviewers) because the model will not volunteer it. · **Reader:** R52 (R52-11)
- **Family:** G4-F016 (already-done) — Models are trained and rewarded on FAIL_TO_PASS/PASS_TO_PASS tests that never penalise design erosion or complexity, producing try/catch-everywhere and lazy cas · **Relation:** supports · also G4-F141 (supports) · Nobody has worked out how to RL for maintainability, so models are good at coding but not maintainability.

### C2074 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Dex says token cost and agent time matter far less than long-term maintainability because maintainability compounds, a position that argues against optimising for cheap runs.
- **Quote:** "tokens it cost to produce tasks matters way less than the maintainability of the software over time"
- **Evidence:** asserted — Stated in the intro; he and the co-host agree users would pay roughly twice the tokens, even for 20% cleaner code.
- **Bears on:** L1, L3 · **Landing guess:** Cost-versus-quality trade-off for effort and verifier spend: weigh maintainability gains over per-run cost. · **Reader:** R52 (R52-12)
- **Family:** G4-F160 (skip) — Optimise human wall-clock time and attention, not token cost: tokens are cheap, human time lost to an agent in the dumb zone costs 10x or more, so pipeline stag · **Relation:** supports · Token cost and agent time matter less than long-term maintainability; users would pay about twice the tokens for cleaner code.

### C2075 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Dex reports that the SlopCodeBench researcher persuaded him not to exclude scratch, test and verifier files from the quality score: leftover junk is slop the benchmark should count.
- **Quote:** "we actually want to measure like how much garbage the models leaving your code base."
- **Evidence:** anecdotal — The article gives the filter result: only Opus Medium's _work folder (45 files, 41,265 lines) was affected; slop presence dropped to 92.90%.
- **Bears on:** L3, W2 · **Landing guess:** Verifier or CI check that flags leftover scratch files and stray artifacts, since a skipped cleanup is otherwise invisible. · **Reader:** R52 (R52-13)
- **Family:** G4-F068 (trial) — Scratch files, tests and generated copies should count against quality because leftover garbage must be measured when humans are not reading the code. · **Relation:** supports · Scratch, test and verifier leftovers count against quality; article gives the filter result (only Opus Medium _work folder affected).

### C2076 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** The benchmark's quality measure combines about 150 custom AST-based AI-slop linters with 50-60 standard code metrics (cyclomatic complexity, traversal depth, pass-through 'tramp' data) for about 212 detectors, with function-level hits marking every line of the function as slop.
- **Quote:** "about two, I think it was 212 custom like slop detectors."
- **Evidence:** anecdotal — Counts given from memory ('I think'); machine transcript.
- **Bears on:** L3 · **Landing guess:** Mechanical code-quality metrics as a verifier signal; the linter set is an example of a ready-made battery. · **Reader:** R52 (R52-14)
- **Family:** G4-F010 (skip) — Slop-rule detectors flag 80-98% of all lines for every model, so they are over-aggressive and useful only to compare models, not as an absolute bad-code verdict · **Relation:** supports · Adds the detector composition: ~150 custom AST slop linters plus 50-60 standard metrics (~212), with function-level hits marking whole functions as slop.

### C2077 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Opus 5.5 xhigh had the lowest slop coverage even though Opus medium had more strict passes, so cleaner code and passing regression tests diverged and the quality metric did not predict the pass rate.
- **Quote:** "Opus 5.5 X high did the best on the slop metrics. It had the least like triggers."
- **Evidence:** measured — Article numbers: 77.75% versus 94.25% slop coverage, 25 versus 28 strict passes; he cautions the linters date from March and may miss new patterns.
- **Bears on:** L1, L3 · **Landing guess:** Quality metrics and pass rates are different verifier signals; do not use one as a proxy for the other when choosing effort. · **Reader:** R52 (R52-15)
- **Family:** G4-F037 (skip) — Higher effort can buy cleaner code while lower effort buys more passes: Opus 5.5 XHigh left far less slop-flagged code than Medium despite fewer strict passes,  · **Relation:** supports · also G4-F011 (supports) · Opus xhigh lowest slop coverage (77.75% vs 94.25%) despite fewer strict passes; quality metric did not predict pass rate.

### C2078 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** The slop linters are partly stale (many from March), so newer models may have new slop patterns they do not catch and the detector set needs regular refresh.
- **Quote:** "a lot of them are from March. So it's like traded. Probably need to be updated."
- **Evidence:** asserted — Caveat stated live; a follow-up episode with the researcher was suggested.
- **Bears on:** L3 · **Landing guess:** Any lint or quality battery adopted needs a refresh loop; a static set will miss newer failure patterns. · **Reader:** R52 (R52-16)
- **Family:** G4-F010 (skip) — Slop-rule detectors flag 80-98% of all lines for every model, so they are over-aggressive and useful only to compare models, not as an absolute bad-code verdict · **Relation:** supports · also G4-F025 (supports) · Slop linters are partly stale (many from March), so detectors need regular refresh and may miss new patterns.

### C2079 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Fable wrote nearly the most functions and had the lowest mean cyclomatic complexity, but Dex warns that smaller functions do not mean the code is not slop, so a single metric can be gamed.
- **Quote:** "Fable actually had the like the almost the most functions ... and had the lowest like average complexity"
- **Evidence:** measured — Chart of function counts and weighted mean cyclomatic complexity; he had not read the code. Opus 5.5 wrote about 200,000 lines, Sol medium the fewest.
- **Bears on:** L3 · **Landing guess:** Do not gate on a single complexity metric; pair it with test pass rate and a human or reviewer read. · **Reader:** R52 (R52-17)
- **Family:** G4-F011 (skip) — No single quality metric is safe as a gate: mean complexity can be gamed by splitting helpers, lower duplication may mean less consistency, models degrade in di · **Relation:** supports · also G4-F012 (supports) · Fable had lowest mean complexity and nearly most functions, but small functions do not mean not slop; single metric can be gamed.

### C2080 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Each model was run in its own default harness (Claude Code for Claude, Codex for GPT, OpenCode for GLM), so the comparison mixes model and harness effects.
- **Quote:** "we're using the best possible harness for that model at that given time"
- **Evidence:** asserted — Clarified after the co-host asked; he corrects 'best' to 'most aligned default'.
- **Bears on:** L1 · **Landing guess:** Caveat when transferring results to FixFlow: the Claude Code harness result is the relevant one for Claude effort settings. · **Reader:** R52 (R52-18)
- **Family:** G4-F178 (skip) — Model and harness are coupled: models are post-trained on (and can be over-fitted to) their own harness, labs owning both have an edge, and a coding agent split · **Relation:** supports · Each model ran in its own default harness, so model and harness effects are mixed in the comparison.

### C2081 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Dex endorses baking quality metrics into the compiler or loop as back pressure (telling the agent it made the codebase worse), noting lower complexity often means fewer bugs; he calls this the missing feedback in the benchmark.
- **Quote:** "if you give the model more back pressure, then boom, you actually get to like this whole thing"
- **Evidence:** anecdotal — Dex relays this from the co-host's BAML experiment (guidelines beat baseline on most complexity metrics, but not worst-function complexity); no Dex-run numbers.
- **Bears on:** L3 · **Landing guess:** Back-pressure script feeding complexity and slop metrics to the agent during the work, not only at review. · **Reader:** R52 (R52-19)
- **Family:** G4-F012 (skip) — A deterministic complexity/duplication script (cyclomatic max, clone %) could serve as a backpressure gate; models differ sharply in function count and complexi · **Relation:** supports · also G4-F070 (supports) · Complexity/quality metrics as back pressure; relayed from co-host's BAML experiment, no Dex-run numbers.

### C2082 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Next step: Dex wants to compare plain 'build it' prompts against runs with a feedback battery or target quality score on SlopCodeBench, which he lists as a task for next week.
- **Quote:** "I'd be really interested to see the difference between a, like, here's the thing, go build it, prompt"
- **Evidence:** asserted — Stated intention; no results yet.
- **Bears on:** L3 · **Landing guess:** If run, this tests exactly whether backpressure verifiers change outcomes; worth watching. · **Reader:** R52 (R52-20)
- **Family:** G4-F085 (skip) — Whether deterministic linters, complexity backpressure and alternating-model adversarial review actually improve outcomes is untested and could make results wor · **Relation:** supports · Dex plans to test plain 'build it' vs feedback battery or quality target; confirms the effect is still untested.

### C2083 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** With a benchmark plus quality metrics you can compare many variants of a skill or linter (ten rather than three) by measuring the git diff after each variant, so skills and rules can be tested rather than assumed.
- **Quote:** "you can start measuring skills, you can measure linters, you can measure all sorts of things"
- **Evidence:** anecdotal — Stated while Dex reacts to the co-host's BAML run, which re-ran the same challenge N times per prompt variant; no counts given.
- **Bears on:** W4, L3 · **Landing guess:** A measurement loop for the 13 new skill packages: run each with and without the skill on a fixed task and compare metrics. · **Reader:** R52 (R52-21)
- **Family:** G3-F069 (already-done) — Evaluate skills and harness changes by replaying a known-good plan or fixed task set with one variable changed, since plan, skills and environment are the only  · **Relation:** supports · also G4-F183 (supports) · With a benchmark plus quality metrics, many skill/linter variants can be measured by git diff, so skills are tested not assumed.

### C2084 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** In passing Dex says that for fast zero-to-one work thrown out every few months, tests are close to pointless now, a hint of a position he does not develop here.
- **Quote:** "I have a whole other thing to go on about like how tests are freaking pointless now."
- **Evidence:** asserted — Aside, undeveloped; contrasts with his insistence on regression tests as the strict metric.
- **Bears on:** L3 · **Landing guess:** Nowhere obvious; FixFlow has a live ledger, so this would not apply there without more argument. · **Reader:** R52 (R52-22)
- **Family:** NEW · **Relation:** new · Undeveloped aside that tests are pointless for fast zero-to-one throwaway work; no family makes this claim.

### C2085 · 2026-10-30 · Why Opus Medium Beats X-High at Writing Maintainable Code
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=VLonoD9m4VY> (not in inventory)
- **Claim:** Models will refactor well when told to but do not volunteer centralising or refactoring as requirements change, so refactor steps must be explicitly asked for.
- **Quote:** "models are not good at centralizing, at redefining abstractions, at creating, like doing refactoring."
- **Evidence:** asserted — Thesis statement for the benchmark; backed only by the benchmark's low strict rates.
- **Bears on:** W3, L3 · **Landing guess:** Add an explicit refactor or consolidation step to the phase routine instead of expecting the agent to do it unprompted. · **Reader:** R52 (R52-23)
- **Family:** G3-F102 (already-done) — Models cannot be RL-trained on architecture quality, so keep human architecture review and bake architecture opinions into skills. · **Relation:** supports · also G4-F131 (supports) · Models refactor well when told but do not volunteer centralising or abstraction redefinition, so refactor steps must be asked for.

### C2086 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: A-section line 136)
- **Claim:** Dex defines harness engineering as engineering on top of the harness you are given (configuration surface of Claude Code: CLAUDE.md, skills, MCP) with a systems and context-engineering approach, not building a harness.
- **Quote:** "harness engineering is not like how do you build a harness"
- **Evidence:** asserted — Definition stated in discussion; no data.
- **Bears on:** W4, L2 · **Landing guess:** Frames the whole harness work as configuration engineering; supports skills/agent packages as the surface to tune. · **Reader:** R53 (R53-1)
- **Family:** G3-F122 (already-done) — Harness engineering is optimising the integration points of the coding agent (commands, MCPs, skills, codebase organisation): the user-customised outer harness  · **Relation:** restates · Same definition: engineering the user-customised surface around a vendor harness, not building one.

### C2087 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex describes what a harness adds over a raw agent loop as extension points (CLAUDE.md loading, skill files, built-in MCP, context compression) that pull things from the environment into the system prompt or tools.
- **Quote:** "extension points, right? So you have MCPs and CloudMD"
- **Evidence:** asserted — Whiteboard explanation; no data.
- **Bears on:** W1, W4 · **Landing guess:** CLAUDE.md and skills are the harness extension points; sets what counts as harness config in the repo. · **Reader:** R53 (R53-2)
- **Family:** G3-F122 (already-done) — Harness engineering is optimising the integration points of the coding agent (commands, MCPs, skills, codebase organisation): the user-customised outer harness  · **Relation:** supports · Names the extension points (CLAUDE.md, skills, MCP, compression) that make up the integration surface.

### C2088 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex says the genuinely new thing in harness engineering is RL-training a model on a specific tool set (apply-patch vs old-string/new-string), which is where product advantage lies, and that this does not apply to teams configuring a vendor harness.
- **Quote:** "harness engineering is only genuinely new when you're RLing a model on a specific set of tools"
- **Evidence:** anecdotal — Claims Claude-code models do badly in the Codex harness and gpt-oss-120b cannot do old-string/new-string; no numbers.
- **Bears on:** W4, L1 · **Landing guess:** Nowhere obvious; argues that FixFlow should not build its own harness, only tune config. · **Reader:** R53 (R53-3)
- **Family:** G3-F082 (already-done) — Harnesses work best when they mirror the tools the model was RL-trained on (simple flat tools, line-numbered reads); prefer built-in tool shapes and the stock h · **Relation:** supports · also G4-F178 (supports) · RL on a specific tool set is where harness advantage lies; vendor-harness configurers do not get it.

### C2089 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex distinguishes an inner harness (model plus tools) from an outer harness (even a bash while-true loop or orchestrator) and notes the dumbest outer loop (Ralph) still works well.
- **Quote:** "the outer harness may not even look anything like the inner harness"
- **Evidence:** anecdotal — Conceptual; Ralph cited as working.
- **Bears on:** W5, L3 · **Landing guess:** The Workflow-tool scripts are the outer harness; supports saving them as a library. · **Reader:** R53 (R53-4)
- **Family:** G4-F178 (skip) — Model and harness are coupled: models are post-trained on (and can be over-fitted to) their own harness, labs owning both have an edge, and a coding agent split · **Relation:** supports · also G3-F083 (supports) · Inner (model+tools) vs outer harness split; even a trivial outer loop pays.

### C2090 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex endorses wrapping deterministic or non-deterministic orchestration code around a good vendor harness as a high-leverage move, using Ralph as the proof that a trivial orchestration layer pays.
- **Quote:** "building deterministic or non-deterministic code around a good harness is incredibly powerful"
- **Evidence:** anecdotal — Ralph loop cited; no measurements.
- **Bears on:** W5, W2 · **Landing guess:** Supports script-level orchestration around the phase routine rather than prose-only compliance. · **Reader:** R53 (R53-5)
- **Family:** G3-F078 (already-done) — Good agent systems are mostly deterministic software with LLM steps inserted at chosen points, with agent loops as small elements of a deterministic workflow. · **Relation:** supports · also G5-F043 (supports) · Deterministic or non-deterministic code around a good harness; Ralph as proof.

### C2091 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex says the fundamental that made agents good is one goal per context window, with Claude Code continually recycling contexts.
- **Quote:** "These context windows are good for one goal, one activity with the right context"
- **Evidence:** asserted — Stated as fundamental; no data.
- **Bears on:** L2, W3 · **Landing guess:** Backs the one-phase-per-new-session routine. · **Reader:** R53 (R53-6)
- **Family:** G1-F105 (already-done) — Run each phase or loop iteration in its own fresh context window with one goal, the document carrying state; carve small units into independent windows. · **Relation:** supports · One goal per context window as the fundamental behind recycling contexts.

### C2092 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex's answer to the bitter lesson is surfing the models: new releases make prior code irrelevant but you can immediately do more context engineering and stay 5-10 percent ahead; the principles persist.
- **Quote:** "you can always do more context engineering on top of a new model release"
- **Evidence:** anecdotal — Credits Dan Shipper's term 'surfing the models'; the 5-10 percent figure is an estimate, unmeasured.
- **Bears on:** W1, L1 · **Landing guess:** Argues for re-auditing CLAUDE.md and routing on each model release rather than freezing config. · **Reader:** R53 (R53-7)
- **Family:** G3-F080 (already-done) — Building your own context engineering, prompts and workflows on top of the model beats waiting for the lab, because hand-tuned work extends the jagged frontier  · **Relation:** supports · also G4-F183 (supports) · Surfing the models: more context engineering on each new release; principles persist.

### C2093 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex argues that code written around a model is cheap to throw away if you have a decent eval, so the eval is the durable asset and the eval acts as the deterministic spec (auto research loop).
- **Quote:** "if you have good evals, the new code is cheap to write"
- **Evidence:** asserted — Argument; references auto research without data.
- **Bears on:** W3, L3 · **Landing guess:** P1 cold-resume trial as a durable eval for the harness; keep evals, expect to rewrite routine text. · **Reader:** R53 (R53-8)
- **Family:** G4-F183 (unrefuted (over cap)) — Durable skill is re-evaluating on each new model/harness release: production-grounded evals survive models, so vary one dimension at a time, test each new model · **Relation:** supports · also G3-F063 (supports) · Evals are the durable asset; code around the model is cheap to throw away.

### C2094 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex warns that the common failure in context, harness and eval-loop work is never looking at the data, and says do not spend a week automating what takes five seconds by hand.
- **Quote:** "people just say 'Claude, figure it out' and never look at what's coming back"
- **Evidence:** anecdotal — Says he sees it 'all the time'; no counts.
- **Bears on:** W2, W3, L3 · **Landing guess:** Argues for reading transcripts of the first routine runs before adding compliance machinery. · **Reader:** R53 (R53-9)
- **Family:** G2-F025 (already-done) — Look at the actual traces and returned data rather than trusting summaries; understanding of agent work must be cheap enough to maintain. · **Relation:** supports · Failure is never looking at the returned data; do not automate what takes five seconds.

### C2095 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex says a model trained on one harness's tool format is poor in another, so tool formats are harness-specific and cannot be swapped freely.
- **Quote:** "Don't write a git patch man"
- **Evidence:** anecdotal — Claims Claude-code models are 'complete trash' in the Codex harness; no numbers.
- **Bears on:** W4 · **Landing guess:** Nowhere obvious; caution when porting skills/agents across harnesses. · **Reader:** R53 (R53-10)
- **Family:** G4-F177 (skip) — Prompts, tool shapes and skills tuned for one model do not transfer: running the same harness or Opus prompts on a differently trained model degrades results. · **Relation:** supports · also G3-F082 (supports) · Tool formats trained on one harness degrade in another.

### C2096 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex+others, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Co-guest Viv argues, and Dex does not dispute, that one should exhaust the single-loop stack (system prompt, tool design, context funnelling, skills) before adding another orchestration loop; Vaibhav counters that nested loops buy speed.
- **Quote:** "exhaust all the avenues in this, like, intelligence one stack before you even think about"
- **Evidence:** asserted — Position in debate; Dex's own stance partly shown by his single-loop-first framing.
- **Bears on:** W5, W4 · **Landing guess:** Tension with multi-agent workflow scripts: tune the single agent's instructions first. · **Reader:** R53 (R53-11)
- **Family:** G3-F084 (already-done) — Exhaust the single agent loop and fix instructions before adding another orchestration layer; new orchestrators are about a hundred lines with no moat, so do no · **Relation:** supports · Exhaust the single-loop stack before adding an orchestration loop; Vaibhav's nested-loop speed counterpoint.

### C2097 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex endorses Simon Willison's advice to keep trying dumb or futuristic things to keep your model-capability understanding current, and that flexibility beats locking in a workflow.
- **Quote:** "you need to constantly be trying things that you don't think will work"
- **Evidence:** anecdotal — Cites Simon; also Jeff says it is too soon to lock in loops/workflows.
- **Bears on:** W3, W5 · **Landing guess:** Warns against freezing a workflow library early. · **Reader:** R53 (R53-12)
- **Family:** G5-F043 (skip) — Ralph's lesson is that dumb things can work surprisingly well, so try everything and ask what the smart version would be; loop prompts commit with plain message · **Relation:** supports · also G4-F183 (supports) · Keep trying dumb or futuristic things to keep capability understanding current (Simon Willison).

### C2098 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Guest warns that auto-research outputs can overfit (60 enumerated if-else cases in the prompt, like benchmark cheating), so look at them yourself; Dex responds that production data and a human in the loop are needed.
- **Quote:** "overfit to the entire email set. And this will completely not generalize"
- **Evidence:** anecdotal — Anecdote about auto-research prompts and Terminal-Bench cheating; no numbers.
- **Bears on:** L3, W3 · **Landing guess:** Caution for any automated tuning of CLAUDE.md or skills against a small eval set. · **Reader:** R53 (R53-13)
- **Family:** G4-F227 (skip) — Auto-research and tuning of prompts, models and effort need a good metric first, and testing should automate confidence with many sliceable dimensions per case  · **Relation:** supports · also G4-F228 (supports) · Adds the overfit failure of auto-research prompts (60 enumerated cases); needs production data and a human.

### C2099 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex states that every team should have an AI code review bot in the PR flow, calling it an objectively right take.
- **Quote:** "every team that doesn't have an AI code review bar is freaking dumb"
- **Evidence:** asserted — Said in passing on a no-sponsors show; names CodeRabbit as the one they use.
- **Bears on:** L3 · **Landing guess:** Matches the Opus reviewer per PR; no change. · **Reader:** R53 (R53-14)
- **Family:** G4-F143 (already-done) — AI review agents and review bots are unproven against slop and mostly add noise (a model always finds something to say); AI reviewing AI is not the answer, and  · **Relation:** contradicts · Dex says every team needs an AI code review bot; family says review bots mostly add noise.

### C2100 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex (with Jeff) holds every engineer should hand-build an agent loop and read Claude Code/Codex source, since sub-agents, delegation of command-safety checks to Haiku and context recycling are the techniques to understand before relying on higher-level harnesses.
- **Quote:** "Every engineer needs to build an agent and do their first tool registration"
- **Evidence:** asserted — Opinion; the Haiku safety delegation example is from the source leak, unquantified.
- **Bears on:** W4 · **Landing guess:** Supports the Haiku locator agent pattern and cheap-model delegation for sub-tasks. · **Reader:** R53 (R53-15)
- **Family:** NEW · **Relation:** new · Every engineer should hand-build an agent loop and read Claude Code/Codex source; no family covers this.

### C2101 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex endorses designing so capabilities are easy to delete when the model improves and being careful what you expose as a product substrate, to avoid accumulating tech debt.
- **Quote:** "design it so it's easy to delete"
- **Evidence:** asserted — Principle; no data.
- **Bears on:** W1, W4, W5 · **Landing guess:** Argues skill and agent packages should be small and removable, and that CLAUDE.md rules be re-justified each model release. · **Reader:** R53 (R53-16)
- **Family:** G1-F016 (trial) — Re-validate CLAUDE.md, skills and prompts at every model release, because harness pieces expire as models improve. · **Relation:** supports · Design capabilities to be easy to delete as models improve; harness pieces expire.

### C2102 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex adopts the practical recipe of an unopinionated harness plus task plus production traces as an eval set, fit the harness (skills, system prompt, context) to the evals and then review it as a human, and says the easiest leverage is editing the harness.
- **Quote:** "harness engineering is all about wrapping the model to do useful work"
- **Evidence:** asserted — Recommendation; Dex says he is bullish on auto-research and evals encoding behaviour.
- **Bears on:** W3, W1, L3 · **Landing guess:** Use real session transcripts as the eval set for CLAUDE.md and skills tuning. · **Reader:** R53 (R53-17)
- **Family:** G4-F183 (unrefuted (over cap)) — Durable skill is re-evaluating on each new model/harness release: production-grounded evals survive models, so vary one dimension at a time, test each new model · **Relation:** supports · also G4-F162 (supports) · Unopinionated harness plus production traces as eval set; fit harness to evals then human review.

### C2103 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex agrees a human in the loop inside the outer loop is a good way to inject intelligence, and warns against over-engineering automation of small tasks.
- **Quote:** "the wild loop having a human in the loop is a great process"
- **Evidence:** asserted — Brief agreement; no data.
- **Bears on:** W2 · **Landing guess:** Supports owner checkpoints in the phase routine over full automation. · **Reader:** R53 (R53-18)
- **Family:** G2-F185 (already-done) — Human on the loop (designing and steering the loop, stopping at chosen points) is better than human in the loop. · **Relation:** supports · Human inside the outer loop as intelligence injection; nuanced against on-the-loop framing.

### C2104 · 2026-04-21 · AI That Works #54 Harness Engineering Without the Hype
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=gX9WpYY61xA> (inventory: line 136)
- **Claim:** Dex tells (as an analogy from Google/Facebook deploys) that an agent loop needs a prod metric and gradual rollout with a human watching at release, since without prod data you overfit to the wrong thing.
- **Quote:** "every feature has a metric tied to it"
- **Evidence:** anecdotal — Recollection of 2015-era deploy practice; paraphrase of the speaker; no numbers.
- **Bears on:** L3, W2 · **Landing guess:** Nowhere obvious; supports a measurement-first gate before the dispatcher switch-on. · **Reader:** R53 (R53-19)
- **Family:** G4-F220 (already-done) — Build backpressure and feedback automation incrementally (CLI/MCP plus a manual agent session first, loop later), and gradually ramp features via flags with an  · **Relation:** supports · also G2-F078 (supports) · Every feature has a metric and gradual rollout watched by a human; prod data prevents overfitting.

### C2105 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex says control flow written as prompt instructions (control flow via prompt) is a mistake: if you know the order, use a script, as a make-task agent needed two hours of added instructions where a 90-second bash script sufficed.
- **Quote:** "you probably don't need an agent if you know the workflow order"
- **Evidence:** anecdotal — Own anecdote: 2 hours vs 90 seconds, one project.
- **Bears on:** W2, W3, W5 · **Landing guess:** Phase routine steps that are fixed could be script/hook-driven instead of prose the agent must self-report. · **Reader:** R53 (R53-20)
- **Family:** G3-F077 (already-done) — Break one large prompt or skill into several small focused workflows and use code, not prompts, for control flow; there is no magic prompt, and the 12-factor 'n · **Relation:** supports · also G2-F114 (supports) · Control flow in prompts is a mistake; 2 hours of prompt vs 90-second script anecdote.

### C2106 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex's headline takeaway: do not use prompts for control flow; start broad and robust, learn actual inputs, add more deterministic happy paths and keep a fully agentic escape hatch.
- **Quote:** "don't use prompts for control flow"
- **Evidence:** asserted — Closing takeaway; backed by the make-file anecdote.
- **Bears on:** W2, W3 · **Landing guess:** Direct pressure on a self-reported phase routine; favours encoding steps in scripts or hooks. · **Reader:** R53 (R53-21)
- **Family:** G2-F114 (trial) — Sequence and control flow belong in code or separate workflow steps, not in a monolithic prompt or magic words; a tool that needs magic words is broken. · **Relation:** supports · also G3-F077 (supports) · Headline takeaway: do not use prompts for control flow; keep an agentic escape hatch.

### C2107 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex reports that with the create-plan prompt customers rushed and the model skipped the early design-question and outline phases, which are what make the plan good; without them the plan is little better than 'go write the code'.
- **Quote:** "the model would basically skip steps"
- **Evidence:** anecdotal — Customer observation; no rate given.
- **Bears on:** W2, W3 · **Landing guess:** Evidence that a prose phase routine is skipped under pressure; matches W2 (skipped looks like unconsulted). · **Reader:** R53 (R53-22)
- **Family:** G2-F115 (trial) — Models skip interactive steps of a prompt even when instructed (even Opus 4.1/4.5), so the key orders must be reinforced in the user message, and novices will n · **Relation:** supports · also G1-F098 (supports) · Customers rushed create-plan and the model skipped design-question and outline phases.

### C2108 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex cites Kyle's study that frontier LLMs follow roughly 150-200 instructions reliably (as of about mid-2026 minus six months, probably higher now) and says the create-plan prompt holds over a hundred, repeated and in caps.
- **Quote:** "frontier thingy allums can fall about 150 to 200"
- **Evidence:** measured — Figure 150-200 instructions from Kyle Mistele's CLAUDE.md post study, recalled by Dex as six or seven months old; his own count of 'over a hundred' is an estimate.
- **Bears on:** W1 · **Landing guess:** Instruction-count basis for the 390-line CLAUDE.md trim; note he says the limit is probably higher now. · **Reader:** R53 (R53-23)
- **Family:** G1-F187 (skip) — Frontier models follow about 150-200 instructions reliably, the Claude Code system prompt already uses ~50, and quality drops uniformly as the count grows, so c · **Relation:** supports · also G1-F188 (supports) · Restates 150-200 instruction figure, recalled as 6-7 months old and probably higher now; create-plan prompt holds over a hundred.

### C2109 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex says emphatic caps (must, critical, never) do not buy compliance because the model can attend to only so many instructions; split the prompt into separate smaller workflows instead.
- **Quote:** "every time you put in all caps, like you must important, critical, never"
- **Evidence:** asserted — Explanation; no measurement.
- **Bears on:** W1 · **Landing guess:** Argues against the MUST/Never emphasis style in CLAUDE.md invariants; split by phase. · **Reader:** R53 (R53-24)
- **Family:** G1-F060 (skip) — Prompt emphasis (shouting, capitals) is model-specific and can detune some models. · **Relation:** supports · also G1-F095 (supports) · Capitalised emphasis does not buy compliance; split the prompt instead.

### C2110 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex explains why design questions come before the plan: feedback early in the context is high leverage, whereas after a 1000-line plan (5-10 percent of context) most attention is on the model's own decisions and feedback is low leverage and degrades toward the dumb zone.
- **Quote:** "short back and forth which are still very early in the context window"
- **Evidence:** anecdotal — Plan size stated as ~1000 lines, 5-10 percent of context; no experiment.
- **Bears on:** L2, W3 · **Landing guess:** Supports questions-before-plan ordering and fresh session per phase. · **Reader:** R53 (R53-25)
- **Family:** G1-F083 (already-done) — Make architecture and design decisions early in a short window, where reasoning is best and not yet biased by written code; later discovery costs more. · **Relation:** supports · also G2-F092 (supports) · Early design-question feedback is high leverage; after a 1000-line plan feedback degrades.

### C2111 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex+others, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Editing a plan after feedback in the same context yields inconsistent partial application; when a fast one-shot plan is not ~95 percent right, delete it and restart down the interactive path rather than re-steer.
- **Quote:** "editing with consistency is a much harder task than creating with consistency"
- **Evidence:** anecdotal — Vaibhav's observation, Dex agrees; '95 percent' is a rule of thumb.
- **Bears on:** L2, W3 · **Landing guess:** Restart-over-repair rule for plans; fits one phase per new session. · **Reader:** R53 (R53-26)
- **Family:** G2-F144 (already-done) — When implementation reveals a plan or spec error, fix the plan upstream and rerun implementation rather than patching code; editing a plan in flight remains an  · **Relation:** supports · also G1-F087 (supports) · Editing a plan in-context applies feedback inconsistently; restart if one-shot plan is not ~95% right.

### C2112 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex's structured-planning SDK splits one big prompt into design, structure and plan agents with schema-typed outputs and deterministic code between phases, forcing intentional compaction at phase boundaries instead of relying on users to know when to start fresh.
- **Quote:** "you're forcing the compaction workflows in between"
- **Evidence:** anecdotal — Live demo (alpha); the exit condition is an empty open-questions array.
- **Bears on:** W2, W3, W5, L2 · **Landing guess:** Exit conditions as structured data checked by code is a model for hook-checked phase gates. · **Reader:** R53 (R53-27)
- **Family:** G1-F163 (already-done) — Design the whole workflow around frequent intentional compaction: each step ends in a compacted artifact and the next starts in a fresh small window. · **Relation:** supports · also G2-F041 (supports) · SDK splits design/structure/plan agents with schema outputs, forcing compaction at phase boundaries.

### C2113 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex's design has an inner Claude-Code loop per phase and an outer deterministic harness that checks the structured output (all questions answered) before moving to a different prompt built for the next phase.
- **Quote:** "you have an outer harness, which is like, okay, cool, like all questions answered"
- **Evidence:** anecdotal — Demo with SDK; also done with BAML parse step as alternative to built-in structured output.
- **Bears on:** W2, W5 · **Landing guess:** Pattern for a phase runner that verifies phase completion from output, not from the agent's report. · **Reader:** R53 (R53-28)
- **Family:** G3-F083 (already-done) — Stack outer loops that carry more process information than the inner agent loop (a supervisor of a few small structured-output prompts that classify done-ness a · **Relation:** supports · also G3-F079 (supports) · Inner Claude loop per phase with an outer deterministic harness checking structured output.

### C2114 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex endorses a more opinionated coding agent that forces a process, making the default path the correct one, and a junior gets better consistency from robust steps than generic Claude Code.
- **Quote:** "enforcing a style guide that says if you're going to use a coding agent"
- **Evidence:** asserted — Endorses Vaibhav's style-guide framing; no data.
- **Bears on:** W2, W4 · **Landing guess:** Supports making the phase routine the default via commands/skills rather than prose. · **Reader:** R53 (R53-29)
- **Family:** G2-F131 (already-done) — Expert-led workflow results do not transfer to teams (RPI degraded when handed over; oral tradition), so workflow knowledge must be encoded in tools, skills and · **Relation:** supports · also G3-F076 (supports) · Opinionated agent that forces the process gives juniors consistency; workflow encoded in tooling.

### C2115 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex changes his research-plan-implement split: an internal five- or six-step version (questions, objective research, design discussion, outline, plan) breaks compaction up further, but costs users six slash commands to learn, so the UI should show the next step rather than force it.
- **Quote:** "you have like five, six slices of the original three prompts"
- **Evidence:** anecdotal — Internal practice; no results.
- **Bears on:** W3, W4, L2 · **Landing guess:** Phase granularity trade-off: more phases mean more commands to learn; have the tool suggest next step. · **Reader:** R53 (R53-30)
- **Family:** G2-F093 (already-done) — Run staged phases (questions, research, design, structure, plan, implement) with a human checkpoint at each, rather than one-shotting big features; QRSPI is the · **Relation:** updates · also G2-F094 (supports) · Dex's internal five/six-step split of RPI, but six slash commands to learn; UI should show next step.

### C2116 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex retracts plan review as the mental-alignment artifact: plans are too long to review (250 lines of code per phase), so the team moved back to reviewing the structure outline, the plan's overview without code.
- **Quote:** "plans sucked. They're actually too long"
- **Evidence:** anecdotal — Change of position; owner review practice; no numbers beyond the 250-line example.
- **Bears on:** W3, W2 · **Landing guess:** Owner review should target the outline/Plan @ sha summary, not the full plan body. · **Reader:** R53 (R53-31)
- **Family:** G4-F197 (skip) — Do not read 1,000-2,000 line implementation plans (a plan is as long as the code and duplicates code review); review the short design discussion and outline, sp · **Relation:** updates · also G2-F007 (supports) · Dex retracts plan review as alignment artifact; plans too long, back to reviewing structure outline.

### C2117 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex (with Vaibhav) notes a 500-line design doc can be run through a cheap model (Haiku) with a simple structured-output prompt to detect open questions, so gating checks do not need the frontier model.
- **Quote:** "you can give that to Haiku, it can tell you if there's open questions"
- **Evidence:** asserted — Claim in discussion; not measured.
- **Bears on:** L1, W2, W4 · **Landing guess:** Cheap-model checker for phase-complete gates, consistent with the Haiku locator agent. · **Reader:** R53 (R53-32)
- **Family:** G4-F173 (already-done) — Use a small cheap model (Haiku, a 'really small dumb model') as a guardrail, classifier or quick-question tool where the main agent is not needed. · **Relation:** supports · A cheap model (Haiku) can gate open questions on a 500-line design doc.

### C2118 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex likes the idea of a background verifier or re-researcher that runs while the human proceeds down the golden path and interrupts only when it finds a problem; design what is fast, slow, synchronous or background.
- **Quote:** "just doing constant re-research in the back background while everything else is running"
- **Evidence:** asserted — Dex says he had not thought of it and likes it; takeaways closing the show.
- **Bears on:** L3, W2 · **Landing guess:** Background verifier pattern for the review stage without blocking the main session. · **Reader:** R53 (R53-33)
- **Family:** G4-F190 (already-done) — Layer guardrails cheap to expensive (string/regex/structured validation, then light classifier, then slower background checks, deterministic first), including a · **Relation:** supports · also G4-F191 (supports) · Background verifier runs while human proceeds and interrupts only on a problem.

### C2119 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Vaibhav (Dex agrees, restating context-length and accuracy levers) says only two levers improve an agent system, fewer steps or more accurate step selection, and per-step error compounds (99 percent over 20 steps veers off).
- **Quote:** "have fewer steps or have a more accurate step selection system"
- **Evidence:** asserted — Compounding illustrated with a chart (99 percent accuracy, 20 steps); the 60 percent figure for 50 steps is stated loosely.
- **Bears on:** L2, L3 · **Landing guess:** Fewer steps in a phase beats adding judges; argues against growing step counts in the routine. · **Reader:** R53 (R53-34)
- **Family:** G1-F067 (skip) — A 1% per-call accuracy loss compounds over 100+ tool calls to a large end-to-end drop, so fewer steps and fewer unverified handoffs matter. · **Relation:** supports · also G4-F231 (supports) · Two levers (fewer steps, more accurate selection); 99% over 20 steps compounding.

### C2120 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex shows a Ralph loop built in the SDK where a structured output decides whether the exit condition has been met, instead of a bare bash loop.
- **Quote:** "you can wrap it in a deterministic harness of like it's either run once or run forever"
- **Evidence:** anecdotal — Demo; burrito SaaS toy task.
- **Bears on:** W5, L3 · **Landing guess:** Exit-condition-as-typed-output for any loop-style workflow script. · **Reader:** R53 (R53-35)
- **Family:** G3-F062 (skip) — The simplest saved workflow is a one-line bash loop feeding a prompt file to an agent; Dex still uses 5-line bash loops and has compared bash loop vs the stop-h · **Relation:** supports · also G3-F083 (supports) · Ralph loop in the SDK with a structured-output exit decision instead of a bare bash loop.

### C2121 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Guest Mike reports that a heavily codified research-plan-implement process lowered team adoption because people wanted their own way, and Dex's team coaching relies on reading threads to teach; Dex hosts and endorses revisiting in a month.
- **Quote:** "the more I codified it, the less other people wanted to do it"
- **Evidence:** anecdotal — One team of 25 engineers; the tool was 24 hours old.
- **Bears on:** W3, W4 · **Landing guess:** Adoption risk of a prescriptive routine for any additional humans; one owner today. · **Reader:** R53 (R53-36)
- **Family:** G3-F076 (skip) — Opinionated workflows should be 'squishy', flexible to varied inputs, so users cannot hold them wrong. · **Relation:** supports · also G2-F131 (supports) · Heavily codified process lowered adoption on one team; people want their own way.

### C2122 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** A guest keeps the plan state in a PRD.json with a todo/in-progress/done status enum so deterministic code, not the model, orchestrates which story runs next; Dex gives the reason that deterministic code reads it.
- **Quote:** "JSON versus Markdown a lot... a status enum like to do in progress done"
- **Evidence:** anecdotal — Guest's tool, 24 hours old; Dex only glosses the rationale.
- **Bears on:** W2, W3 · **Landing guess:** Machine-readable phase state beside the markdown plan. · **Reader:** R53 (R53-37)
- **Family:** G2-F043 (already-done) — Externalise workflow phase state as a ticket status ladder or tracker state so phase is visible outside the transcript. · **Relation:** supports · also G2-F162 (supports) · PRD.json with todo/in-progress/done status enum so deterministic code orchestrates next story.

### C2123 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Vaibhav enforces zero build warnings at compile time to cut context bloat from noisy build output, plus dependency-boundary checks in CI/pre-commit and a diffable dependency-graph visual reviewed in PRs.
- **Quote:** "every build step that you run needs to run warning free"
- **Evidence:** anecdotal — BAML team practice; no numbers.
- **Bears on:** L3, L2 · **Landing guess:** Backpressure: warning-free builds and import-boundary checks reduce output noise; FixFlow already has import-linter in CI. · **Reader:** R53 (R53-38)
- **Family:** G1-F048 (trial) — Default check scripts should run quiet so only failures print, since passing-test lines are wasted context. · **Relation:** supports · also G4-F008 (supports) · Zero build warnings to cut context bloat, plus dependency-boundary checks in CI.

### C2124 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex+others, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Vaibhav argues design docs are time-stamped checkpoints that may live outside the repo, with an AI pass verifying every review comment was addressed; Dex frames the SDLC shift as moving human leverage upstream to thinking and design.
- **Quote:** "design docs leave outside of our code base, because code evolves much faster than design"
- **Evidence:** asserted — Opinion; markdown-with-comments tool is in use at BAML for two weeks.
- **Bears on:** W3, W1 · **Landing guess:** Tension with keeping decisions in-repo; the PR body journal is a checkpoint, not a living spec. · **Reader:** R53 (R53-39)
- **Family:** G2-F019 (skip) — Keep workflow artifacts out of git (git-ignored, synced to an external store) because in-repo plan files go stale and get lost across branches and worktrees; th · **Relation:** supports · also G2-F063 (supports) · Design docs as time-stamped checkpoints outside the repo; AI pass verifies review comments addressed.

### C2125 · 2026-01-13 · AI That Works #40 Applying 12-Factor Principles to Coding Agent SDKs
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=qgAny0sEdIk> (inventory: line 158)
- **Claim:** Dex's closing: if the user experience is a tight loop keep it fast and push heavy verification to background tasks; a rewritten workflow should ask what is synchronous, asynchronous or background (the guest's design-comment verifier does that).
- **Quote:** "he gets a message in Slack saying, hey, all comments are taken care of"
- **Evidence:** asserted — Final takeaways; attribution of the Slack example is to the Vaibhav side.
- **Bears on:** L3, W2 · **Landing guess:** Verifier runs async and reports; owner view stays one page. · **Reader:** R53 (R53-40)
- **Family:** G4-F190 (already-done) — Layer guardrails cheap to expensive (string/regex/structured validation, then light classifier, then slower background checks, deterministic first), including a · **Relation:** supports · also G4-F160 (supports) · Keep tight loops fast and push heavy verification to background tasks.

### C2126 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Where the workflow is known, make steps deterministic code with small LLM steps inside rather than steering the sequence with prompt text.
- **Quote:** "don't use prompts for control flow. If you know the workflow, make the parts that are deterministic"
- **Evidence:** anecdotal — Based on founders he interviewed building enterprise AI (legal, fintech, insurance, compliance tech).
- **Bears on:** W2, W3 · **Landing guess:** Phase routine enforced by scripts or hooks, not prose · **Reader:** R54 (R54-1)
- **Family:** G3-F078 (already-done) — Good agent systems are mostly deterministic software with LLM steps inserted at chosen points, with agent loops as small elements of a deterministic workflow. · **Relation:** supports · also G2-F114 (supports) · Deterministic steps with small LLM steps, not prompts for control flow.

### C2127 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** A single create-plan prompt carrying design, structure and plan instructions got steps skipped, so he split it into separate prompts and context windows (a change from the one-prompt RPI planning step).
- **Quote:** "That prompt has 50 to 100 instructions in it, and the design and the structure would get skipped all the time."
- **Evidence:** anecdotal — Observed while rolling RPI out to many users; no counts.
- **Bears on:** W1, W2, W3 · **Landing guess:** Split the phase routine into separate fresh-context steps; shorter always-loaded rules · **Reader:** R54 (R54-2)
- **Family:** G1-F098 (trial) — A monolithic multi-step prompt of 50-85 instructions had steps skipped about half the time; splitting it into prompts under 40 instructions each fixed the skipp · **Relation:** supports · also G2-F114 (supports) · Same split of one long create-plan prompt; skipped design/structure steps.

### C2128 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** The old workaround for long planning prompts was to repeat important instructions at start and end, which he now calls a bad product experience and replaced with a split workflow.
- **Quote:** "repeat the instructions at the beginning, and then you repeat the important ones at the end."
- **Evidence:** anecdotal — Coaching experience with RPI users.
- **Bears on:** W1, W2 · **Landing guess:** CLAUDE.md trim; do not rely on repetition · **Reader:** R54 (R54-3)
- **Family:** G1-F061 (skip) — Repeat the most important instruction at both the start and the end of a prompt. · **Relation:** updates · Dex now calls repeat-at-start-and-end a bad workaround and replaced it with a split workflow.

### C2129 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** The workflow places human review only at thinking-heavy steps (design discussion, structure outline) and automates the rest.
- **Quote:** "we're forcing the human into the parts of the workflow where thinking is required."
- **Evidence:** asserted — Design principle, no data.
- **Bears on:** W3 · **Landing guess:** Owner checkpoints at design and plan, not every step · **Reader:** R54 (R54-4)
- **Family:** G2-F088 (already-done) — Humans must own architecture and the ordering of slices (models cannot architect or order for incremental testability); design workflows so humans enter only at · **Relation:** supports · also G2-F137 (supports) · Humans only at thinking-heavy steps, rest automated.

### C2130 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** AI amplifies thinking or its absence; skipping the human thinking step yields poorly thought-out code (he saw it in a demo run the night before).
- **Quote:** "you can't outsource the thinking. AI cannot replace thinking. It can only amplify your thinking"
- **Evidence:** anecdotal — One failed demo run cited.
- **Bears on:** W3 · **Landing guess:** Owner plan review before implementation · **Reader:** R54 (R54-5)
- **Family:** G2-F060 (already-done) — Do not outsource the thinking: ask the model for options and decide yourself, because a model told to do a thing follows its first tokens down one path. · **Relation:** supports · also G4-F198 (supports) · Cannot outsource thinking; adds a failed demo anecdote.

### C2131 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Ticket becomes research questions; research runs in a fresh context given only the questions, so the research stays objective and carries no implementation intent (refinement of RPI).
- **Quote:** "we do not include the ticket in that context, fresh context window, just the questions."
- **Evidence:** anecdotal — Found after intent leaked into research docs; no numbers.
- **Bears on:** W3, W5, L2 · **Landing guess:** Research step of phase routine and the P1 cold-resume test · **Reader:** R54 (R54-6)
- **Family:** G2-F149 (skip) — Turn the ticket into an editable list of objective research questions that a fresh context answers without seeing the ticket. · **Relation:** restates · also G2-F013 (supports) · Ticket to questions; fresh context sees only questions.

### C2132 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Coding rules loaded during research steer the model toward making changes, so research documents leak opinions; coding rules should not be in context during research.
- **Quote:** "if you tell it how to write code and you tell it to go research, it's going to get steered"
- **Evidence:** anecdotal — Experience; he is unsure whether such rules belong in CLAUDE.md or elsewhere.
- **Bears on:** W1, L2 · **Landing guess:** Move coding rules out of always-loaded CLAUDE.md; load per phase · **Reader:** R54 (R54-7)
- **Family:** G2-F116 (already-done) — Prompted phase constraints (research prompt says document only, do not propose fixes) are frequently ignored by Claude Code, so prompt-only phase rules are unre · **Relation:** supports · also G1-F190 (supports) · Coding rules in context steer research toward opinions; golden-rule placement unsettled.

### C2133 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Golden rules come from patterns that burned you; where they live (CLAUDE.md or elsewhere) and when they are pulled into context is still unsettled.
- **Quote:** "you don't really know bad patterns until they burn you and then you go put in your golden rules"
- **Evidence:** anecdotal — Cites a Netflix engineer's talk; Dex admits open question.
- **Bears on:** W1 · **Landing guess:** Invariants section of CLAUDE.md and its trim · **Reader:** R54 (R54-8)
- **Family:** G1-F068 (already-done) — Models do not know repo-specific conventions or incident lessons that are not in the weights (pure vs wired components, hard-won pain), so they must be stated e · **Relation:** supports · also G1-F199 (supports) · Golden rules from patterns that burned you; placement still open.

### C2134 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Research run per ticket by sub-agents replaces a hand-maintained, always-loaded context file because the file always drifts; research can also target an open source repo or the web.
- **Quote:** "Dynamically generating that context by doing research to your code base is a more effective way"
- **Evidence:** asserted — Argued; the 'more effective' phrasing is the host's, Dex shows the research animation.
- **Bears on:** W1, W4 · **Landing guess:** Knowledge-store pilot; trim CLAUDE.md in favour of on-demand research · **Reader:** R54 (R54-9)
- **Family:** G1-F185 (already-done) — Persistent code documentation goes stale; prefer pointers to authoritative code and on-demand regenerated research over stored copies or generated docs. · **Relation:** supports · also G1-F131 (supports) · Per-ticket research replaces always-loaded drifting context file.

### C2135 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Research dispatches sub-agents on vertical slices of the codebase and writes one compacted research document.
- **Quote:** "launch a bunch of sub-agents to do these, like, vertical slices through the code base."
- **Evidence:** anecdotal — Shown in a demo; no numbers.
- **Bears on:** W4, W5, L2 · **Landing guess:** Reusable research workflow · **Reader:** R54 (R54-10)
- **Family:** G3-F017 (already-done) — Research fans out to parallel read-only subagents on independent, bounded areas (lead reads mentioned files first), waits for all, then synthesises one account  · **Relation:** supports · also G1-F113 (supports) · Research dispatches sub-agents on vertical slices into one compacted doc.

### C2136 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He prefers slow and reliable agentic search (grep plus model) over optimised retrieval for codebase understanding.
- **Quote:** "the agentic rag thing which is basically Claude models plus grep is pretty good sometimes a little slower"
- **Evidence:** asserted — Preference stated.
- **Bears on:** W4, L3 · **Landing guess:** Keep the Haiku file locator plain; no call-graph tooling · **Reader:** R54 (R54-11)
- **Family:** NEW · **Relation:** new · Prefers slow reliable agentic grep search over optimised retrieval; no family covers it.

### C2137 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Each stage compacts context into a document with a specific output format, and later stages deterministically allocate the existing docs into the next context window.
- **Quote:** "at every one of these stages we're compacting context"
- **Evidence:** anecdotal — Demo description.
- **Bears on:** L2, W3 · **Landing guess:** Phase hand-off documents (Plan @ sha journal) as designed compaction · **Reader:** R54 (R54-12)
- **Family:** G1-F163 (already-done) — Design the whole workflow around frequent intentional compaction: each step ends in a compacted artifact and the next starts in a fresh small window. · **Relation:** supports · also G1-F101 (supports) · Each stage compacts into a document; later stages allocate docs deterministically.

### C2138 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He describes four levels of autonomy: per-step human advance, a fourth that double-runs research and design for variants, a mid level that automates after the structure outline, and full auto.
- **Quote:** "So we're getting right now is level three which is like you are at each step check the results"
- **Evidence:** asserted — Product roadmap description (transcript wording muddled).
- **Bears on:** W3, W5 · **Landing guess:** Per-task autonomy setting in the phase routine · **Reader:** R54 (R54-13)
- **Family:** G3-F058 (skip) — Grade autonomy deliberately: from human-in-the-loop review up to unattended CI fixes, with a single approval gate after which the system runs to a PR, and a hap · **Relation:** supports · Four graded autonomy levels from per-step advance to full auto.

### C2139 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Try the one-shot version first; if the result is poor, rewind to the design discussion and lower the autonomy level rather than start over.
- **Quote:** "If you don't like that, then it rewinds you to the design discussion."
- **Evidence:** anecdotal — Planned feature.
- **Bears on:** W3 · **Landing guess:** Escalation rule in phase routine · **Reader:** R54 (R54-14)
- **Family:** G2-F144 (already-done) — When implementation reveals a plan or spec error, fix the plan upstream and rerun implementation rather than patching code; editing a plan in flight remains an  · **Relation:** supports · also G1-F087 (supports) · Rewind to design discussion and lower autonomy instead of restarting.

### C2140 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Models default to horizontal plans (DB, then service, then API, then UI) with nothing checkable until the end; require vertical tracer-bullet phases validated at each step.
- **Quote:** "models really like to make what I like call horizontal plans"
- **Evidence:** anecdotal — Observed pattern; credits Pragmatic Programmers and Matt Pocock.
- **Bears on:** W3, L3 · **Landing guess:** Plan template: vertical phases, each verifiable · **Reader:** R54 (R54-15)
- **Family:** G2-F145 (skip) — Models default to horizontal plans (DB, service, API, UI) with nothing testable until late; require vertical slices wired end-to-end early. · **Relation:** restates · also G2-F001 (restates) · Models default to horizontal plans; require vertical tracer bullets.

### C2141 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Tracer bullets: wire the feature end to end with mock logic first, then add logic in further vertical passes.
- **Quote:** "wire it all the way end to end with no logic, very simple logic"
- **Evidence:** anecdotal — Practice described.
- **Bears on:** W3, L3 · **Landing guess:** Plan template · **Reader:** R54 (R54-16)
- **Family:** G2-F001 (already-done) — Plans must be thin vertical slices (tracer bullets), each runnable and checkable on its own, because models default to horizontal stack-order plans that cannot  · **Relation:** supports · also G4-F155 (supports) · Tracer bullets wired end to end with mock logic first.

### C2142 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** The structure outline carries the testing strategy and is ordered so each step can be checked, a shorter alignment document than the long RPI plan.
- **Quote:** "the structure outline is going to have the testing strategy built into it."
- **Evidence:** anecdotal — Shown on a shipped example.
- **Bears on:** W3, L3 · **Landing guess:** Plan @ sha body: test strategy per phase · **Reader:** R54 (R54-17)
- **Family:** G4-F152 (trial) — Every plan step should carry its exact, automated verification command and expected result (manual curl steps converted to tests), with rules and acceptance cri · **Relation:** supports · also G2-F140 (supports) · Structure outline carries testing strategy and ordered checkable steps.

### C2143 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Full RPI plans (a thousand lines) were too long for human alignment, so a short outline with current state, desired state, patterns, design summary and phases is reviewed instead.
- **Quote:** "The plans really ended up being really long for people to read."
- **Evidence:** anecdotal — Change from RPI plan reading.
- **Bears on:** W3, L1 · **Landing guess:** One-page owner view; shorter plan · **Reader:** R54 (R54-18)
- **Family:** G2-F007 (already-done) — Long line-by-line plans give no leverage (a 1000-line plan costs as much to read as the code and drifts ~20% from it), so keep plans short and decision-level an · **Relation:** supports · also G4-F197 (supports) · Thousand-line plans too long; review short outline instead.

### C2144 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** The design discussion template surfaces patterns to follow from the codebase so the human can reject an old pattern (for example six ways to do atomic inserts) before planning.
- **Quote:** "patterns to follow gets surface at the top."
- **Evidence:** anecdotal — Demo; replaces reading the whole objective research doc.
- **Bears on:** W3, W1 · **Landing guess:** Plan template section: patterns to follow · **Reader:** R54 (R54-19)
- **Family:** G2-F142 (already-done) — The design step lets the human catch which codebase patterns the agent chose and reject legacy ones, via a 'patterns to follow' section, before any code is writ · **Relation:** supports · also G1-F069 (supports) · Design discussion surfaces patterns to follow so human can reject old ones.

### C2145 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He rarely reads the research document himself, which makes it a model-to-model hand-off, while still reading the design discussion and answering its questions.
- **Quote:** "I rarely read these anymore"
- **Evidence:** anecdotal — Self-report.
- **Bears on:** L2, W3 · **Landing guess:** Owner reads plan, not research · **Reader:** R54 (R54-20)
- **Family:** G2-F135 (already-done) — Review leverage is highest on the research and plan: a bad plan line is a hundred bad code lines, so humans should review plans and research (for mental alignme · **Relation:** updates · also G1-F125 (supports) · Rarely reads research doc himself (model-to-model hand-off) but still reads the design.

### C2146 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He answers design questions in a flat file (often by voice) instead of the ask-user-question tool, because it is faster and allows pointing at other code.
- **Quote:** "I prefer this. ... a flat file with option A, option B"
- **Evidence:** anecdotal — Personal preference.
- **Bears on:** W3 · **Landing guess:** Owner answers in PR body or file · **Reader:** R54 (R54-21)
- **Family:** NEW · **Relation:** new · Answer design questions in a flat file by voice rather than the ask-user tool.

### C2147 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Leverage is ordered spec, then plan, then coding; he says planning gives about 3x and research about 3x, roughly 9 to 10x together.
- **Quote:** "Specs have way more impact than the plan has way more impact than the actual coding cycles."
- **Evidence:** asserted — Rough multipliers, not measured.
- **Bears on:** W3, L1 · **Landing guess:** Spend owner time on spec and plan · **Reader:** R54 (R54-22)
- **Family:** G4-F054 (skip) — Writing code is only 25-50% of feature delivery, so AI used only for coding leaves planning, review and verification unaccelerated; measure where phase time goe · **Relation:** supports · also G2-F135 (supports) · Leverage ordered spec over plan over coding; rough 3x multipliers.

### C2148 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Do not automate everything; take the 3x gains, fix the last mile only when it becomes the bottleneck, to avoid meta-tooling soup.
- **Quote:** "you should learn to be happy with 10 times leverage"
- **Evidence:** asserted — Advice.
- **Bears on:** W5, W4 · **Landing guess:** Restraint on workflow library building · **Reader:** R54 (R54-23)
- **Family:** G4-F206 (already-done) — Default to the smartest model and generic mechanisms, and only do token pinching, context engineering or first-class integration on the high-use paths once usag · **Relation:** supports · also G4-F205 (supports) · Do not automate everything; be happy with ~10x leverage; fix last mile only if bottleneck.

### C2149 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Autonomous loops only pay off with good specs and a verifiable problem; otherwise they run diligently and produce something not useful (compiler example).
- **Quote:** "the Ralph Wiggum is like the specs have to be good ... problem has to be verifiable"
- **Evidence:** anecdotal — Cites Geoffrey Huntley's language project; no numbers beyond his remarks.
- **Bears on:** L3, W5 · **Landing guess:** Verifier-first before any loop · **Reader:** R54 (R54-24)
- **Family:** G4-F150 (already-done) — Throwing more tokens at a problem works only when the problem is verifiable by a deterministic check; agents do well with automatic feedback and badly where out · **Relation:** supports · also G4-F214 (supports) · Autonomous loops pay only with good specs and a verifiable problem.

### C2150 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** A pre-PR agent review step is just another workflow step, so AI review bots add little beyond a well-honed prompt.
- **Quote:** "If the agent can write the code, the agent can review the code."
- **Evidence:** asserted — Opinion.
- **Bears on:** L3, W5 · **Landing guess:** Pre-PR reviewer step in the workflow · **Reader:** R54 (R54-25)
- **Family:** G4-F143 (already-done) — AI review agents and review bots are unproven against slop and mostly add noise (a model always finds something to say); AI reviewing AI is not the answer, and  · **Relation:** supports · also G4-F079 (supports) · Pre-PR agent review adds little beyond a well-honed prompt.

### C2151 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Skimping on code attention gives about three months of 3x speed, then a bug the model cannot solve and a week of cleanup; patterns the model sees leak in (React useEffect).
- **Quote:** "every couple months ... you will hit a moment where you will have a bug that the model cannot solve"
- **Evidence:** anecdotal — Team experience of ignoring code for 1-2 months, then rewriting parts.
- **Bears on:** L3, W3 · **Landing guess:** Keep human code review gate · **Reader:** R54 (R54-26)
- **Family:** G4-F091 (already-done) — HumanLayer's own lights-off factory (July 2025, nobody reading code) ended in an unfixable production bug, downtime, a two-week manual rewrite and a rebuild fro · **Relation:** supports · also G4-F134 (supports) · Skimping on code attention yields ~3 months of speed then a model-unsolvable bug.

### C2152 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Shipping (test, deploy, fix, keep maintainable and non-thrashy) is the engineer's job; the role moves from writing to producing.
- **Quote:** "Models can code. Models can't ship."
- **Evidence:** asserted — Opinion; attributes the coding vs shipping line to another.
- **Bears on:** L3 · **Landing guess:** Closing-message questions focus on shipped outcomes · **Reader:** R54 (R54-27)
- **Family:** G2-F194 (already-done) — Engineers now oversee the entire shipping lifecycle (testing, deployment, maintenance), not just code. · **Relation:** supports · also G4-F238 (supports) · Shipping is the engineer's job: models code, cannot ship.

### C2153 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He runs at most two hard-feature workflows in parallel, cannot do five, and stays away from parallelism bragging; small bugs go to a hands-off assistant.
- **Quote:** "I'll usually just work two of these in parallel"
- **Evidence:** anecdotal — Personal practice.
- **Bears on:** W5, L2 · **Landing guess:** Cap concurrent phases · **Reader:** R54 (R54-28)
- **Family:** G2-F109 (skip) — Best throughput is two humans each running two parallel agent tasks. · **Relation:** supports · also G1-F110 (supports) · Max two hard workflows in parallel; cannot do five.

### C2154 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Larger teams measure about 20 to 30 percent productivity gain from AI coding versus the 10x solo claim; his target is 2 to 3x on hard code.
- **Quote:** "20, 30% if you're just like mostly doing it"
- **Evidence:** anecdotal — Figures relayed from conversations with team customers (mid-conversation, unclear which speaker states the 20-30%); target of 2-3x is his.
- **Bears on:** none · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-29)
- **Family:** G4-F201 (skip) — Third-party studies (Stanford, 100k developers) show AI raises output but about half is rework, with gains of roughly 15-20% on average and slowdowns on complex · **Relation:** supports · also G4-F205 (supports) · Teams measure 20-30% gain; his target 2-3x on hard code.

### C2155 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Research and design artifacts are written to a separate synced repo (write hook auto-syncs) and attached to the ticket, treated as revision-history storage rather than real VCS.
- **Quote:** "we put artifacts in a separate repo ... treat it as like an S3 bucket"
- **Evidence:** anecdotal — Product description.
- **Bears on:** W2, W1 · **Landing guess:** Evidence folders; knowledge store · **Reader:** R54 (R54-30)
- **Family:** G2-F019 (skip) — Keep workflow artifacts out of git (git-ignored, synced to an external store) because in-repo plan files go stale and get lost across branches and worktrees; th · **Relation:** supports · also G1-F149 (supports) · Artifacts in a separate synced repo treated like an S3 bucket.

### C2156 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He retires RPI as taught in August 2025 for ticket, questions, research, design discussion, structure outline, plan, worktree implementation, PR (five human-facing steps).
- **Quote:** "we found a bunch of issues with it. ... refined that workflow even more."
- **Evidence:** anecdotal — Change of position stated; issues named are the intent-leak and skipped-steps.
- **Bears on:** W3, W4 · **Landing guess:** Phase routine redesign · **Reader:** R54 (R54-31)
- **Family:** G2-F093 (already-done) — Run staged phases (questions, research, design, structure, plan, implement) with a human checkpoint at each, rather than one-shotting big features; QRSPI is the · **Relation:** updates · also G2-F094 (supports) · Dex retires August 2025 RPI for the QRSPI-style staged pipeline.

### C2157 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Frequent model idioms become hard-to-debug patterns; the longer the model sees them the more they leak in.
- **Quote:** "Claude likes to use the use effect hook and react."
- **Evidence:** anecdotal — Example only.
- **Bears on:** L3 · **Landing guess:** Golden rule per repo anti-pattern · **Reader:** R54 (R54-32)
- **Family:** G1-F070 (already-done) — The model lacks taste (adds contexts, spread hacks) until explicitly steered; keep a known-tics list in a skill or reviewer prompt. · **Relation:** supports · also G1-F073 (supports) · Frequent model idioms (useEffect) leak in the longer the model sees them.

### C2158 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Build infrastructure for previewing a change (preview deploys, sandbox) and make it dead simple to share, since human testing is the bottleneck.
- **Quote:** "have a really good way to preview stuff and poke around at it and send it to someone else"
- **Evidence:** asserted — Advice.
- **Bears on:** L3 · **Landing guess:** Preview/verification environment · **Reader:** R54 (R54-33)
- **Family:** G4-F225 (trial) — Help the human review large diffs with generated aids: per-folder HTML summaries, a dependency diagram that shows a broken module boundary without reading code, · **Relation:** supports · Build preview and share infrastructure since human testing is the bottleneck.

### C2159 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** Browser-agent testing is improving but he does not pursue perfect automated validation; taste and customer understanding stay human.
- **Quote:** "I don't think it's worth trying to get to perfect"
- **Evidence:** asserted — Opinion.
- **Bears on:** L3 · **Landing guess:** Limit verifier ambition · **Reader:** R54 (R54-34)
- **Family:** G4-F165 (skip) — Screenshot-based self-checking is weak backpressure for UI because model vision cannot get things pixel perfect even with a browser feedback loop. · **Relation:** supports · Browser-agent testing improving but not worth pursuing perfect automated validation.

### C2160 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** For AI, codebases older than about six months already behave like legacy, so research on existing patterns matters even for young repos.
- **Quote:** "legacy for AI is like anything older than six months"
- **Evidence:** asserted — Aside.
- **Bears on:** W1 · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-35)
- **Family:** G1-F073 (already-done) — Agents imitate the repo, so bad patterns and first-checkpoint conventions compound into precedent; guard codebase patterns because the codebase is part of the p · **Relation:** supports · also G1-F185 (supports) · Codebases older than six months behave as legacy for AI; research existing patterns.

### C2161 · 2026-03-04 · AI Tinkerers One-Shot
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=c630qv03i8g> (not in inventory)
- **Claim:** He runs headless Claude Code from GitHub Actions on a cron over a markdown CRM repo for routine automation.
- **Quote:** "GitHub actions is a really good way to do serverless on a cron"
- **Evidence:** anecdotal — Personal setup.
- **Bears on:** W5, W4 · **Landing guess:** Scheduled workflow runs · **Reader:** R54 (R54-36)
- **Family:** G3-F107 (skip) — An event-driven workflow (email to webhook to GitHub Actions to Claude editing a markdown store, commit, Slack summary) is a working automation pattern. · **Relation:** restates · also G3-F056 (supports) · Headless Claude Code on GitHub Actions cron over a markdown CRM repo.

### C2162 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Code generation is cheap but review is not, so aim for PRs that are 95 to 99 percent correct on arrival; teams are drowning in bad PRs, not PRs.
- **Quote:** "the code is cheaper now, but the review isn't cheaper."
- **Evidence:** asserted — Rule of thumb; says unprompted PRs need about 50% rework, 20% rework 'generous'.
- **Bears on:** L3, W3 · **Landing guess:** Reviewer load; plan-first · **Reader:** R54 (R54-37)
- **Family:** G4-F209 (already-done) — The problem is bad PRs, not PR volume: AI-era PRs often need 50% or more rework, so improve quality upstream so a PR lands ~95-99% correct and review is easy. · **Relation:** supports · also G4-F208 (supports) · Review not cheaper; aim for 95-99% correct PRs; bad PRs, not volume.

### C2163 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Re-steering early (design discussion, plan) beats fixing after the build, which cuts a six-hour review to 5 or 20 minutes.
- **Quote:** "if you can re-steer early in the process before the model's already committed to a direction"
- **Evidence:** anecdotal — No data.
- **Bears on:** W3, L3 · **Landing guess:** Plan review before implementation · **Reader:** R54 (R54-38)
- **Family:** G4-F104 (already-done) — Review in 100-200 line increments, peek after the first steps of a vertical slice and re-steer early; prefer five mini diffs to one 2,000-line change, and write · **Relation:** supports · also G4-F055 (supports) · Re-steer early in design and plan rather than after the build.

### C2164 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** A lights-off software factory (no code reading) degrades the codebase after 3 to 6 months; keep architecture planning, goal planning and code review.
- **Quote:** "don't sacrifice the architecture planning, don't sacrifice the sprint planning, and don't sacrifice the code review."
- **Evidence:** anecdotal — His team built one in Sept 2025 and watched it decay over roughly nine months.
- **Bears on:** L3, W3 · **Landing guess:** Keep human gates; no unattended merge · **Reader:** R54 (R54-39)
- **Family:** G2-F008 (already-done) — Letting agents run unattended (lights-off, no code reading) degrades the codebase within roughly 3-6 months, so human review gates and code reading must stay, a · **Relation:** supports · also G4-F091 (supports) · Lights-off factory decayed after months; keep architecture planning and review.

### C2165 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Coding benchmarks (SWE-bench style) and test-pass rewards give no penalty for maintainability, so models are not trained to avoid sloppy design; the verifier cannot be only tests.
- **Quote:** "nowhere in here in the verification loop are we able to punish the model for bad code design"
- **Evidence:** asserted — His thesis from reading about RL training, no experiment.
- **Bears on:** L3 · **Landing guess:** Verifiers must judge design, not just tests · **Reader:** R54 (R54-40)
- **Family:** G4-F016 (already-done) — Models are trained and rewarded on FAIL_TO_PASS/PASS_TO_PASS tests that never penalise design erosion or complexity, producing try/catch-everywhere and lazy cas · **Relation:** restates · also G4-F141 (supports) · Test-pass rewards give no maintainability penalty; verifier cannot be only tests.

### C2166 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** A long-horizon benchmark (about 20 stacked feature requests, Harbor adapter) hands a later issue to a smaller model to measure the code quality the first model left behind.
- **Quote:** "hand issue 21 to Sonnet or even Haiku and see can a smaller dumber model solve an issue"
- **Evidence:** asserted — Benchmark being built, no results given.
- **Bears on:** L1, L3 · **Landing guess:** Cheap-model probe of repo quality · **Reader:** R54 (R54-41)
- **Family:** G4-F018 (skip) — A trustworthy maintainability benchmark feeds a model features one at a time from a hidden roadmap (about 20) and scores how the codebase evolves; whole-project · **Relation:** supports · also G4-F184 (supports) · Long-horizon benchmark with ~20 stacked features then hand issue 21 to a smaller model.

### C2167 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Harness engineering is split into the inner harness (agent builder's) and the outer harness (feedback loops you engineer as part of the software factory).
- **Quote:** "you have the inner harness that the labs build ... and then you have the outer harness that you engineer"
- **Evidence:** asserted — Definition; he argues to defend useful terms against dilution.
- **Bears on:** W2, W4 · **Landing guess:** Vocabulary for the harness review · **Reader:** R54 (R54-42)
- **Family:** G3-F122 (already-done) — Harness engineering is optimising the integration points of the coding agent (commands, MCPs, skills, codebase organisation): the user-customised outer harness  · **Relation:** restates · Inner harness by labs vs outer harness you engineer.

### C2168 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** With agents building, the backlog becomes a review backlog, so add agentic code review and agentic browser testing to raise the floor before the human looks.
- **Quote:** "Agentic code review ... the bottleneck moved"
- **Evidence:** asserted — Software factory diagram walk-through.
- **Bears on:** L3, W5 · **Landing guess:** Opus reviewer per PR · **Reader:** R54 (R54-43)
- **Family:** G4-F126 (already-done) — Add agentic code review and regression testing to the pipeline and plan first and keep reading code as produced, while accepting that review stays the slowest s · **Relation:** supports · also G4-F208 (supports) · Backlog becomes review backlog; add agentic review and browser testing to raise floor.

### C2169 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Route support tickets and Sentry errors straight into the tracker for an agent to attempt, accepting about 30 percent one-shot success as a win.
- **Quote:** "even if the agent only one shot's like 30% of those, that's 30% of time"
- **Evidence:** asserted — Illustrative figure, hypothetical.
- **Bears on:** W5 · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-44)
- **Family:** G3-F057 (skip) — Route incidents, Sentry crashes and triaged tickets straight into the factory so alarms produce pull requests, extending shipping beyond coding. · **Relation:** supports · also G4-F120 (supports) · Route support tickets and Sentry errors to the tracker; ~30% one-shot success is a win.

### C2170 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Deterministic checks and agentic review are good, but if they are the only plan the codebase devolves; planning must precede them.
- **Quote:** "anything you can do with deterministic [checks] is great"
- **Evidence:** asserted — Opinion (transcript garbled at 'deterministic enters').
- **Bears on:** L3, W2 · **Landing guess:** Backpressure scripts plus plan review · **Reader:** R54 (R54-45)
- **Family:** G4-F142 (skip) — Harness engineering, loops and review agents cannot close the maintainability gap; they raise the floor but not the ceiling, and the real fix is at model level. · **Relation:** supports · also G4-F072 (supports) · Deterministic checks and agentic review alone devolve the codebase; planning must precede.

### C2171 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** He warns that agent, spec-driven dev, harness engineering and software factory are being diluted into meaningless terms; define them before adopting.
- **Quote:** "Specdriven dev ... now means a hundred different things"
- **Evidence:** asserted — Opinion.
- **Bears on:** none · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-46)
- **Family:** NEW · **Relation:** new · Warning that agent, spec-driven dev, harness engineering and software factory terms are diluted.

### C2172 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** Human Layer is now marketed as an AI IDE and collaboration platform claiming engineers on hard codebases move two to three times faster across the SDLC through design review before agents run.
- **Quote:** "Do not use if you are allergic to reasoning about complex systems."
- **Evidence:** marketing — Launch video; hundreds of engineers claimed, no data.
- **Bears on:** none · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-47)
- **Family:** G5-F009 (already-done) — Headline speed-up claims (2-3x across the SDLC, a week's work in a day, 7 hours for 1-2 weeks) rest on product copy or single unmeasured sessions. · **Relation:** supports · also G5-F008 (supports) · Human Layer marketing claims of 2-3x faster, no data.

### C2173 · 2026-07-07 · Mastra Agents Hour: The Software Factory
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=d0AY7zVKZ6E> (inventory: July 2026)
- **Claim:** A Mastra host says that skipped architecture planning makes slop fester; Dex adds that review comments are really aimed at the author's agent, so a human reviewer need not be gentle.
- **Quote:** "The ceremonies have decreased ... planning still has to happen"
- **Evidence:** anecdotal — Host's team practice; Dex endorses planning point.
- **Bears on:** W3 · **Landing guess:** nowhere obvious · **Reader:** R54 (R54-48)
- **Family:** G2-F088 (already-done) — Humans must own architecture and the ordering of slices (models cannot architect or order for incremental testability); design workflows so humans enter only at · **Relation:** supports · also G4-F093 (supports) · Skipped architecture planning makes slop fester; host endorsement of planning.

### C2174 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Dex changes his earlier position: research-plan-implement (three steps) was insufficient, and in mid-December 2025 his team moved to a six-step workflow, while still saying the exact prompts and step count are not the point.
- **Quote:** "RPI's not enough. We actually need six steps."
- **Evidence:** anecdotal — Based on rolling out RPI to customers; team results varied widely; no numbers
- **Bears on:** W3, W4 · **Landing guess:** Phase routine: do not treat the number of phases as fixed; split planning into more steps if results vary across people · **Reader:** R55 (R55-1)
- **Family:** G2-F093 (already-done) — Run staged phases (questions, research, design, structure, plan, implement) with a human checkpoint at each, rather than one-shotting big features; QRSPI is the · **Relation:** updates · also G1-F211 (supports) · Dex moves from three-step RPI to six steps (mid-Dec 2025) while saying step count is not the point.

### C2175 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** A prompt set that gives one person excellent results (after about a thousand hours) gives a team a wide spread of quality, so he rebuilt the product around guided workflows instead of asking people to wield six prompts.
- **Quote:** "people pick up these prompts... their team would have a vast spectrum of quality of results"
- **Evidence:** anecdotal — Observed across customer rollouts; no numbers
- **Bears on:** W3, W4, W5 · **Landing guess:** Workflow library / skills: encode the routine as guided steps rather than prose the agent must remember · **Reader:** R55 (R55-2)
- **Family:** G2-F131 (already-done) — Expert-led workflow results do not transfer to teams (RPI degraded when handed over; oral tradition), so workflow knowledge must be encoded in tools, skills and · **Relation:** supports · also G1-F141 (supports) · Prompt set works for one expert but quality varies across a team, so product rebuilt around guided workflows.

### C2176 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** The create-plan prompt had about 50 instructions; he now splits planning into multiple steps wrapped in deterministic code, applying 12-factor-agents advice not to use prompts for control flow.
- **Quote:** "use control flow for control flow because it's going to be much more reliable."
- **Evidence:** asserted — Stated as design principle; one prompt of about 50 instructions cited
- **Bears on:** W2, W3, W5 · **Landing guess:** Phase routine compliance: move ordering from prose into scripts or hooks; split long multi-instruction prompts · **Reader:** R55 (R55-3)
- **Family:** G1-F098 (trial) — A monolithic multi-step prompt of 50-85 instructions had steps skipped about half the time; splitting it into prompts under 40 instructions each fixed the skipp · **Relation:** supports · also G3-F077 (supports) · Create-plan prompt of about 50 instructions split into steps wrapped in code; control flow in code, not prompts.

### C2177 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** The durable skill is context engineering and intentional compaction; the specific prompts, and even the number of steps, will change (a bitter-lesson stance).
- **Quote:** "the magic is not in the prompts. There is no perfect prompt."
- **Evidence:** asserted — Recalled from his earlier talk
- **Bears on:** L2, W4 · **Landing guess:** Treat skill and prompt text as disposable; invest in context discipline · **Reader:** R55 (R55-4)
- **Family:** G1-F211 (already-done) — The phase names are not essential; the durable idea is compaction and staying in the smart zone, and the routine is provisional. · **Relation:** restates · No perfect prompt; durable skill is context engineering and compaction.

### C2178 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Smart zone versus dumb zone: output quality falls as context fills, because attention cost grows quadratically with tokens (per layer and per head), so work should stay in the early part of the window.
- **Quote:** "the more context you use, the worst results you'll get"
- **Evidence:** asserted — Whiteboard explanation; no experiment cited
- **Bears on:** L2 · **Landing guess:** Context budget: one phase per new session; CLAUDE.md, tools and MCPs consume smart-zone room · **Reader:** R55 (R55-5)
- **Family:** G1-F091 (already-done) — Attention (quadratic cost, falling quality as the window fills) is the durable reason context management stays relevant across model generations. · **Relation:** supports · Quadratic attention cost explanation for smart zone versus dumb zone.

### C2179 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** His rule of thumb puts the smart-zone limit at roughly 40% context usage, but he says the exact number does not matter, varies by task type, and that his token count differs from Claude Code's because it includes the autocompact buffer.
- **Quote:** "I always say like 40% contact usage"
- **Evidence:** anecdotal — Rule of thumb, no data
- **Bears on:** L2 · **Landing guess:** Compare with harness plan to consider auto-compaction only past 500k tokens; a 40% line is far lower · **Reader:** R55 (R55-6)
- **Family:** G1-F159 (trial) — Keep context utilisation under roughly 40% (range 30-60%) and restart before hitting limits. · **Relation:** supports · also G1-F081 (supports) · 40% rule of thumb with caveat that the number varies and counting method differs.

### C2180 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Before every message, ask whether it should be a new context window instead; sometimes keep the old one because re-reading files is slow or a summary cannot be trusted.
- **Quote:** "should this be a new user message or should this be a new context window?"
- **Evidence:** anecdotal — Habit described, no numbers
- **Bears on:** L2, W3 · **Landing guess:** One phase per new chat; explicit keep-vs-fresh test in the closing message · **Reader:** R55 (R55-7)
- **Family:** G2-F172 (skip) — Plan commits and show them to the user for approval, stage by explicit file only, with no Claude attribution lines. · **Relation:** supports · Ask before each message whether it should be a new context window; sometimes keep the old one.

### C2181 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Needle-in-a-haystack long-context benchmarks mislead because real work needs acting on all the information, or teasing out the relevant 50,000 words, which models are worse at.
- **Quote:** "needle in a haystack is not useful because most of the time you don't need"
- **Evidence:** asserted — Attributes the point to Geoff Huntley; no benchmark numbers
- **Bears on:** L2 · **Landing guess:** Do not trust advertised long-context windows as proof that large contexts are safe · **Reader:** R55 (R55-8)
- **Family:** G1-F088 (already-done) — A bigger window does not make a smarter model; isolate small contexts rather than expand, because relevant tokens get harder to find in a bigger haystack. · **Relation:** supports · Needle-in-haystack benchmarks mislead; acting on all information in a big window is harder.

### C2182 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** The available smart-zone room is smaller than people think, because system prompt, built-in tools, custom MCPs and CLAUDE.md/AGENTS.md all sit in context before the task; levers are tighter specs, cheaper source traversal, fewer MCPs and fewer built-in tools.
- **Quote:** "the context window is much longer. The cup is smaller than you think it is"
- **Evidence:** anecdotal — Whiteboard walkthrough
- **Bears on:** W1, L2 · **Landing guess:** CLAUDE.md trim: its 390 always-loaded lines spend smart-zone budget · **Reader:** R55 (R55-9)
- **Family:** G1-F094 (skip) — Claude Code starts a session with ~50k tokens of tools and system prompt (harness overhead ~16k of a 200k window), so baseline load counts against working conte · **Relation:** supports · also G1-F038 (supports) · System prompt, tools, MCPs and CLAUDE.md consume the smart-zone room before the task starts.

### C2183 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Change of position on tools: with the tool-search feature, large custom MCP sets are less of a context problem than before, though he had not tried it himself.
- **Quote:** "custom MCPs is no longer as much of a problem"
- **Evidence:** asserted — Untested expectation
- **Bears on:** L2 · **Landing guess:** MCP/tool loading policy · **Reader:** R55 (R55-10)
- **Family:** G1-F038 (skip) — Large tool/MCP definition lists fill the context window and instruction budget (50k tokens at start); load tools on demand and switch off unused servers. · **Relation:** contradicts · also G1-F157 (contradicts) · Dex expects tool search to make large MCP sets less of a context problem (untested).

### C2184 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** A Ralph tool should chart context used per iteration and per component so you see that loops always reach 60% and shrink the task; he and Matt note observability here is currently poor.
- **Quote:** "give people visibility and metrics into how much of the context is being used"
- **Evidence:** asserted — Proposal, not built
- **Bears on:** L2, W2 · **Landing guess:** Measurement of context use per phase (a skipped measurement pipeline in the review) · **Reader:** R55 (R55-11)
- **Family:** G1-F042 (trial) — Make context use visible (a /context breakdown, an always-visible meter, model-aware warnings, tracked token counts) so budget decisions use a number. · **Relation:** supports · Proposes charting context used per iteration and component in a Ralph tool.

### C2185 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Ralph is framed as a Kubernetes-style control loop: read specs (desired state) and source (current state), implement one thing, repeat, so every iteration starts in the smart zone.
- **Quote:** "Ralph is a system that optimizes for always working in the early part"
- **Evidence:** asserted — Conceptual framing
- **Bears on:** L2, W5 · **Landing guess:** Fresh-context-per-task loop pattern for long work · **Reader:** R55 (R55-12)
- **Family:** G4-F219 (skip) — Frame an agent as a control loop (desired state, current state, one action, re-read) borrowed from Kubernetes controllers. · **Relation:** restates · also G1-F107 (supports) · Ralph as Kubernetes-style control loop, every iteration in the smart zone.

### C2186 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Size a task so edit, test, fix, retest and commit all fit in as little context as possible, but not so small that a signature change cannot pass tests without touching other files.
- **Quote:** "make the changes, run the test, fix any issues, run the test"
- **Evidence:** anecdotal — Rule of thumb
- **Bears on:** L2, L3 · **Landing guess:** Plan task sizing in the phase routine · **Reader:** R55 (R55-13)
- **Family:** G1-F108 (already-done) — Size each phase to fit one context window, leaving headroom for tests and commit/PR steps, and plan so errors are recoverable within a session. · **Relation:** supports · Size a task so edit, test, fix, commit fit in minimal context but not too small.

### C2187 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Context percentages are not comparable across tools: Claude Code's displayed percentage includes the reserved autocompact buffer, so thresholds must be stated with the counting method.
- **Quote:** "the way I count tokens... they include the end buffer in their percentage"
- **Evidence:** anecdotal — Minor aside
- **Bears on:** L2 · **Landing guess:** Any context-threshold rule in the harness should name how tokens are counted · **Reader:** R55 (R55-14)
- **Family:** G1-F159 (trial) — Keep context utilisation under roughly 40% (range 30-60%) and restart before hitting limits. · **Relation:** supports · Context percentages differ across tools because of the autocompact buffer; state the counting method.

### C2188 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Worked Ralph example: a 30-minute Claude interview plus 30 minutes with a front-end engineer produced about 25-27 React style rules, then a Ralph loop on a cloud VM refactored toward them for about six hours.
- **Quote:** "the desired state of the world was all the code adheres to the style guide."
- **Evidence:** measured — About 6 hours, 20 commits, about 20,000-line PR (some plan files); 10 minutes to set up and 10 to tear down the VM
- **Bears on:** W5, L3 · **Landing guess:** Style guide as the desired-state spec for an overnight refactor loop · **Reader:** R55 (R55-15)
- **Family:** G1-F156 (skip) — Ran a Ralph loop on a refactoring experiment and drew lessons about incremental improvement. · **Relation:** supports · Adds the measured worked Ralph example: style-guide interview, 6 hours, 20 commits, 20,000-line PR.

### C2189 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** The six-hour Ralph PR was never merged (a hundred merge conflicts two days later); his advice is not to send huge autonomous PRs, and Ralph output can simply be thrown away and rerun from the same specs.
- **Quote:** "do not send your coworkers 20,000 line PR that refactors the entire code base"
- **Evidence:** anecdotal — One failed merge, 20,000 lines, ~100 conflicts
- **Bears on:** L3 · **Landing guess:** Cap autonomous PR size; the review burden is the limit · **Reader:** R55 (R55-16)
- **Family:** G4-F105 (already-done) — Agents author oversized, unfocused PRs (40,000-line loop output); split big prototypes into separate 1-3k-line PRs and use HTML diff walkthroughs to order chang · **Relation:** supports · also G3-F063 (supports) · The 20,000-line Ralph PR was never merged; do not send huge autonomous PRs; rerun from specs.

### C2190 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Ralph can be over-baked: left running past the point of done, the model invents extra work (for example post-quantum cryptography in a toy language), analogous to rolling back an overfit model to a checkpoint.
- **Quote:** "if you leave it going too long it will come up with more stuff to do"
- **Evidence:** anecdotal — Attributes the cases to Geoff Huntley's experience and his own six-hour run
- **Bears on:** L3, W5 · **Landing guess:** Bound loops by max iterations and a completion check · **Reader:** R55 (R55-17)
- **Family:** G4-F215 (already-done) — Bound every unattended loop with iteration, time or turn caps and an external stop, because a left-running loop invents new work and 'overbakes', moving to a ne · **Relation:** supports · Ralph left running too long invents extra work (overbaking).

### C2191 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Ralph is valuable mainly as a lesson in how context windows work; engineers should learn the theory rather than just install the plugin; a chained spec-to-spec-to-code Ralph pipeline he tried did not produce a product he liked.
- **Quote:** "Ralph is probably not the right final answer for how we build production software."
- **Evidence:** anecdotal — One failed experiment with chained Ralph loops
- **Bears on:** L2, W5 · **Landing guess:** Do not adopt autonomous loops as production practice; take the context lesson · **Reader:** R55 (R55-18)
- **Family:** G1-F135 (already-done) — Ralph loops are valuable for the context-engineering lessons, not as a production technique. · **Relation:** restates · Ralph valuable as a lesson in context windows, not final answer for production software; adds one failed chained-loop experiment.

### C2192 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** His production-safe version of Ralph is a nightly cron or GitHub Action running three iterations against a spec of the desired architecture, producing small incremental PRs he need not merge.
- **Quote:** "run it on a cron every night and only run three iterations of the loop"
- **Evidence:** anecdotal — Used on an internal repo; no outcome numbers
- **Bears on:** W5, L3 · **Landing guess:** Scheduled low-iteration improvement run; relates to the harness's scheduler and workflow ideas · **Reader:** R55 (R55-19)
- **Family:** G3-F056 (skip) — Run scheduled overnight cleanup agents (linter/anti-pattern fix, janitor bots) that fix one thing and open one small PR a human reads, using loops for code qual · **Relation:** supports · also G3-F053 (supports) · Production-safe Ralph as nightly cron running three iterations to produce small PRs.

### C2193 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Never feed community-submitted issues to an agent running with skipped permissions; his team's Linear queue route requires a human to check for hidden prompts in HTML or markdown comments before the model sees anything.
- **Quote:** "it is technically untrusted input"
- **Evidence:** anecdotal — Internal practice
- **Bears on:** L3, W2 · **Landing guess:** Prompt-injection screening before any ticket text reaches an agent · **Reader:** R55 (R55-20)
- **Family:** G5-F025 (skip) — Put a human triage queue between public issues and the tickets a background agent can read, so outsiders cannot inject the agent or steer product work. · **Relation:** restates · also G3-F109 (supports) · Community issues are untrusted input; human checks for hidden prompts before the agent sees them.

### C2194 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** For hard problems, work stays human-in-the-loop; the CodeLayer plan prompt uses a parent agent that runs each task in a sub-agent, checks the work, commits and moves to the next phase.
- **Quote:** "the hardest software problems in the world are not going to be done completely autonomously"
- **Evidence:** asserted — Describes his tooling
- **Bears on:** W4, W5, L3 · **Landing guess:** Parent-checks-sub-agent pattern in workflows · **Reader:** R55 (R55-21)
- **Family:** G3-F020 (already-done) — The implementation skill is an orchestrator launching one implementer sub-agent per plan phase with a one-line prompt pointing at the plan, re-running checks it · **Relation:** supports · CodeLayer plan prompt uses a parent agent running each task in a sub-agent; hard problems stay human-in-the-loop.

### C2195 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Models default to horizontal phases (move 40 things, then wire the endpoint, then refactor the front end); a human would move one thing end to end first, learn, and then continue, so plans need steering toward that.
- **Quote:** "models are not good at planning work in the way that, like, a human would"
- **Evidence:** anecdotal — One example with 40 front-end items moving to an API
- **Bears on:** W3, L3 · **Landing guess:** Plan review checklist: phases must be vertical slices that surface surprises early · **Reader:** R55 (R55-22)
- **Family:** G2-F001 (already-done) — Plans must be thin vertical slices (tracer bullets), each runnable and checkable on its own, because models default to horizontal stack-order plans that cannot  · **Relation:** supports · also G2-F145 (supports) · Models default to horizontal phases; steer toward moving one thing end to end first.

### C2196 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Size plan tasks by how much code you would write by hand before running the app or tests; engineering instincts and old books (tracer bullets, from The Pragmatic Programmer) still apply when programming in English.
- **Quote:** "your instincts as an engineer are still really really good"
- **Evidence:** asserted — Experience-based; Matt Pocock supplied the tracer-bullet name, Dex agreed
- **Bears on:** W3, L3 · **Landing guess:** Vertical-slice rule for plans; matches the repo's vertical-slice layout · **Reader:** R55 (R55-23)
- **Family:** G2-F001 (already-done) — Plans must be thin vertical slices (tracer bullets), each runnable and checkable on its own, because models default to horizontal stack-order plans that cannot  · **Relation:** supports · Tracer-bullet sizing by how much code you would write before running; engineering instincts still apply.

### C2197 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Write 'learning tests' that assert the real contract of an external system (his example is the closed-source Claude Agent SDK) before building on it; rerun them when behaviour seems to change, as when session-ID behaviour changed.
- **Quote:** "a learning test is... for verifying how an external library behaves"
- **Evidence:** anecdotal — Session-ID contract change caught by rerunning a learning test three months later
- **Bears on:** L3, W3 · **Landing guess:** Contract tests for external services (Meta WhatsApp API, R2, FCM) kept outside the default test run · **Reader:** R55 (R55-24)
- **Family:** G4-F168 (already-done) — For black-box dependencies write small runnable learning tests/proofs (kept out of the normal suite, re-run manually on upgrades, agent can author new ones from · **Relation:** supports · Learning tests on the closed-source Agent SDK; rerun caught a session-ID contract change.

### C2198 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Size phases to a verifiable chunk, checking in every 100-200 lines on hard work, because a 2,000-line result that is broken gives you no way to know how to change the prompt.
- **Quote:** "I'd rather check every 100 200 lines of code"
- **Evidence:** anecdotal — Numbers 100-200 and 2,000 lines are his illustration
- **Bears on:** L3, W3 · **Landing guess:** Review cadence and per-phase size cap · **Reader:** R55 (R55-25)
- **Family:** G4-F104 (already-done) — Review in 100-200 line increments, peek after the first steps of a vertical slice and re-steer early; prefer five mini diffs to one 2,000-line change, and write · **Relation:** supports · Check in every 100-200 lines on hard work; a broken 2,000-line result gives no steering signal.

### C2199 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** Write plans that work both ways: fire-and-forget through all phases, or check in after every phase when the work is delicate; and the key new skill is knowing how the model will know its output matches human intent.
- **Quote:** "dual purpose plans"
- **Evidence:** asserted — Stated practice
- **Bears on:** L3, W3 · **Landing guess:** Plan format with phase-level verification criteria · **Reader:** R55 (R55-26)
- **Family:** G2-F165 (already-done) — Default to one phase per run with a mandatory pause after automated checks and a fixed 'Ready for Manual Verification' message; manual boxes are ticked only aft · **Relation:** supports · also G4-F151 (supports) · Dual-purpose plans (fire-and-forget or per-phase check-ins); skill is knowing how the model verifies intent.

### C2200 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** His target for brownfield codebases is a 2-3x speed-up for staff and principal engineers, plus standardisation across a team, because many engineers each using AI differently produces chaos even if each is fast.
- **Quote:** "two to three X faster on most things"
- **Evidence:** asserted — Self-described best-in-class figure, no study
- **Bears on:** W4, W5 · **Landing guess:** Shared team workflow and skills library rather than individual styles · **Reader:** R55 (R55-27)
- **Family:** G4-F205 (already-done) — Target a sustainable 2-3x speedup at near-human quality, not 10x with slop that is thrown away; agent swarms and maximal token spend are the wrong bottleneck. · **Relation:** restates · also G2-F089 (supports) · 2-3x target for brownfield staff engineers plus team standardisation.

### C2201 · 2026-01-16 · Matt Pocock livestream: Chat with AI Coding Wizard Dex Horthy
- **Source:** podcast, Dex, read — <https://www.youtube.com/watch?v=NKu3T9FUjmU> (inventory: line 157 (third-party summary only))
- **Claim:** In six weeks he rebuilt CodeLayer from scratch around more guided workflows after rolling it out to customers.
- **Quote:** "rebuilt the entire product from scratch"
- **Evidence:** anecdotal — Self-reported product history
- **Bears on:** W4 · **Landing guess:** Context for CodeLayer as a source of workflow patterns · **Reader:** R55 (R55-28)
- **Family:** G2-F131 (already-done) — Expert-led workflow results do not transfer to teams (RPI degraded when handed over; oral tradition), so workflow knowledge must be encoded in tools, skills and · **Relation:** supports · also G5-F045 (supports) · CodeLayer rebuilt in six weeks around more guided workflows after customer rollout.

### C2202 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Two agents in one checkout step on each other (for example contending on the Cargo lock, slowing both builds), so parallel agents need separate working directories.
- **Quote:** "you really don't want to run two clods in the same repo at the same time"
- **Evidence:** anecdotal — Rust Cargo lock example from his own codebase
- **Bears on:** W5, L3 · **Landing guess:** Parallel Workflow agents should use separate worktrees · **Reader:** R55 (R55-29)
- **Family:** G1-F051 (already-done) — Give each parallel agent its own worktree stack and never stop another worktree's stack. · **Relation:** supports · Two agents in one checkout contend (Cargo lock); separate working directories.

### C2203 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** A worktree is only usable if one setup script (for example make setup) installs dependencies and copies untracked files such as .env and .claude; the repo defines setup, a generic create-worktree script runs it, and a failed setup auto-cleans the worktree.
- **Quote:** "you will fail using GitWorkTree. That's my experience."
- **Evidence:** anecdotal — Describes HumanLayer's open-source create-worktree script
- **Bears on:** W4, W5 · **Landing guess:** Create-worktree script with setup and cleanup for the harness; this repo's .claude worktrees · **Reader:** R55 (R55-30)
- **Family:** NEW · **Relation:** new · also G2-F085 (supports) · One make-setup script run by a generic create-worktree script with auto-clean on failure.

### C2204 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** On creating a worktree, copy the git-ignored settings.local.json (personal permissions) by copying the whole .claude directory, since only committed files arrive in a new worktree.
- **Quote:** "copy the whole cloud directory"
- **Evidence:** anecdotal — Describes his create-worktree script
- **Bears on:** W4 · **Landing guess:** Worktree bootstrap must carry local settings · **Reader:** R55 (R55-31)
- **Family:** G2-F085 (skip) — Make a worktree's start state reproducible: start from a pinned remote ref, copy local settings and env files, run a setup command, and show setup status to the · **Relation:** supports · Copy the whole .claude directory so git-ignored local settings reach the new worktree.

### C2205 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** He rarely runs many agents at once (his maximum is usually two) and warns against over-parallelising because progress drops; worktrees are mostly a way to park work in a ready directory and resume tomorrow.
- **Quote:** "by max is usually two"
- **Evidence:** anecdotal — Personal usage, no numbers beyond two
- **Bears on:** W5, L2 · **Landing guess:** Cap parallel agents; do not design for fan-out of six · **Reader:** R55 (R55-32)
- **Family:** G1-F110 (already-done) — Limit parallel agents and work in progress: one primary task plus one or two secondary; heavy parallelism and overnight runs backfire. · **Relation:** supports · Maximum usually two agents; over-parallelising drops progress.

### C2206 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Worktrees are not mandatory; he uses them because he keeps editing prompts and workflows on main while agents work elsewhere, calling it git stash on steroids.
- **Quote:** "If you don't need this, you probably shouldn't use it."
- **Evidence:** anecdotal — Personal preference
- **Bears on:** W5 · **Landing guess:** Adopt worktrees only where parallel work exists · **Reader:** R55 (R55-33)
- **Family:** NEW · **Relation:** new · Worktrees are optional; used because prompts are edited on main while agents work elsewhere.

### C2207 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** A merge-watcher agent looping every 60 seconds can merge worker branches (with pre-commit tests mandatory in agent-only worktrees), but more automation means more deviation; his multi-claude manager-agent tool predates sub-agents and he warns not to over-parallelise.
- **Quote:** "the more you automate and the less you look into it the more likely it might deviate"
- **Evidence:** anecdotal — Live demo, translating a repo's server and client in parallel
- **Bears on:** L3, W5 · **Landing guess:** Mandatory test pre-commit hook only inside agent worktrees; merge-gate by a watcher · **Reader:** R55 (R55-34)
- **Family:** G3-F085 (already-done) — Parallelism is capped by human design and review capacity (2-3 parallel runs; agent teams create stitching work), so fan out only after a good plan. · **Relation:** supports · also G3-F021 (supports) · Merge-watcher loop demo; more automation means more deviation; warns against over-parallelising.

### C2208 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** tmux lets one Claude list panes and capture the screen of another agent's terminal, so a manager agent can monitor workers.
- **Quote:** "you can actually prompt Claude to monitor the terminal of another Claude session"
- **Evidence:** anecdotal — Live demo
- **Bears on:** W2, W5 · **Landing guess:** Outside-observer check of agent state, relevant to self-reported compliance · **Reader:** R55 (R55-35)
- **Family:** NEW · **Relation:** new · tmux pane capture lets a manager Claude monitor another agent's terminal; no family covers it.

### C2209 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** A branch can be checked out in only one worktree at a time, which forces a structured one-branch-one-directory layout.
- **Quote:** "you cannot have the same branch checked out in two directories"
- **Evidence:** anecdotal — Demonstrated with an error
- **Bears on:** W5 · **Landing guess:** Worktree-per-branch convention · **Reader:** R55 (R55-36)
- **Family:** NEW · **Relation:** new · Git allows a branch in only one worktree at a time.

### C2210 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Fix a worktree convention up front (all under ~/worktree/repo/branch) and name branches person/feature (sometimes with a date); worktrees should be cleaned up after merge like local branches.
- **Quote:** "Spend five minutes thinking about how you want to organize it"
- **Evidence:** anecdotal — Team convention
- **Bears on:** W4, W5 · **Landing guess:** Naming and cleanup convention for harness worktrees · **Reader:** R55 (R55-37)
- **Family:** G2-F084 (already-done) — Run each task in its own worktree with a predictable branch name, decide worktree timing after plan review, and exclude tool state from git. · **Relation:** supports · Fixed worktree path convention, person/feature branch names, cleanup after merge.

### C2211 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** He has not added worktree support to CodeLayer because the target users already know Git, and UIs that hide worktrees (Vibe Kanban, Conductor, Claude desktop) are worth trying for their opinions.
- **Quote:** "we're really targeting developers who already know how Git works"
- **Evidence:** asserted — Product prioritisation statement; note HumanLayer release 0.201.0 later added worktrees (inventory line 62), a change of position
- **Bears on:** W5 · **Landing guess:** Dated position: later reversed in the product · **Reader:** R55 (R55-38)
- **Family:** NEW · **Relation:** new · CodeLayer worktree-support prioritisation and a later change of position; no family on it.

### C2212 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Review workflow: stage everything at each good checkpoint so the diff view shows only what the agent changed since the last reviewed state, keeping the risk within 10% of recoverable.
- **Quote:** "I literally just stage everything... then I let it go rip again"
- **Evidence:** anecdotal — The statement is attributed by content to Vaibhav, the co-host, speaking about his own workflow; Dex may not own it
- **Bears on:** L3 · **Landing guess:** Checkpoint-staging review habit · **Reader:** R55 (R55-39)
- **Family:** NEW · **Relation:** new · Stage-everything checkpoint review workflow, attributed to co-host Vaibhav.

### C2213 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Adopt a new practice as a two-week time-bounded experiment, then re-evaluate; the worst case is perhaps 20-30% slower for two weeks.
- **Quote:** "give yourself a time-bounded bet"
- **Evidence:** asserted — Advice; the 20-30% is a guess
- **Bears on:** W3 · **Landing guess:** Time-boxed trial framing, like the P1 cold-resume trial · **Reader:** R55 (R55-40)
- **Family:** G2-F049 (already-done) — Adopt incrementally and treat early trials as experiments: hill-climb from the current process, pilot first, dry-run a new routine before trusting it, and expec · **Relation:** supports · Adopt a practice as a two-week time-bounded experiment.

### C2214 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** A standard research-plan-implement workflow makes parallel agents comparable, because every checkpoint artifact has the same shape (three research docs look alike) so check-ins do not require rebuilding context.
- **Quote:** "the more standardized you can make your process, the easier it is"
- **Evidence:** anecdotal — Argued by analogy to standardised interviews
- **Bears on:** W3, W4, L2 · **Landing guess:** Uniform phase artifacts and closing message for fast re-entry · **Reader:** R55 (R55-41)
- **Family:** G2-F193 (already-done) — Use a multi-stage pipeline (questions, research, design, structure, plan, worktree, implement, PR; or research/plan/implement), each stage a fresh context produ · **Relation:** supports · also G2-F131 (supports) · Standard RPI shape makes parallel agent check-ins comparable.

### C2215 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Do research and planning on main, keep the markdown docs outside the code worktree (separate repo or vault, not merge-sensitive) and create the worktree only once the plan is good; overusing worktrees creates chaos.
- **Quote:** "don't try to create work trees for each step of the workflow"
- **Evidence:** anecdotal — HumanLayer practice; people who make worktrees for research later need to merge only the documents
- **Bears on:** W3, W5 · **Landing guess:** Plan files belong outside the implementation worktree; the draft-PR plan-first routine · **Reader:** R55 (R55-42)
- **Family:** G2-F084 (already-done) — Run each task in its own worktree with a predictable branch name, decide worktree timing after plan review, and exclude tool state from git. · **Relation:** supports · Research and plan on main with docs outside the worktree; create the worktree after plan review.

### C2216 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, Dex, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** For shared design docs, plain git markdown forces pull/push sync and cannot be commented; he wants something between git and Google Docs that is live, version-viewable and agent-accessible (from a talk with Jeff Huber).
- **Quote:** "you want something more like Google Docs where it's like there's only one state"
- **Evidence:** asserted — Opinion; no product
- **Bears on:** W3 · **Landing guess:** Plan-document storage and the knowledge-store design · **Reader:** R55 (R55-43)
- **Family:** G2-F087 (already-done) — Plans, designs and sessions should live in shared, commentable documents (a 'GitHub for pre-code work') and continuous review rather than late PR review or disc · **Relation:** supports · Wants live commentable shared design docs between git and Google Docs.

### C2217 · 2025-12-09 · AI That Works: Git Worktrees for AI Coding Agents
- **Source:** aitw-episode, other, read — <https://www.youtube.com/watch?v=OpM-G3WNH4g> (not in inventory)
- **Claim:** Co-host Vaibhav runs the same task on several models in separate worktrees and merges the best pieces, finding design work benefits since no single model gets it right; Dex responds with parallel markdown drafts in different styles (not Dex's own idea).
- **Quote:** "I actually just run the same thing on like five different models"
- **Evidence:** anecdotal — Vaibhav's practice; Dex only listens
- **Bears on:** L1, W5 · **Landing guess:** Best-of-N for subjective output, if ever · **Reader:** R55 (R55-44)
- **Family:** G3-F022 (skip) — Run multiple agents or competing plans in parallel (separate worktrees, divergent constraints) and keep or synthesise the best, via judgement or a comparing orc · **Relation:** supports · Co-host runs the same task on several models in worktrees and merges best pieces.
