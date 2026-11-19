# Intake sample check, lane a1 (2026-11-19)

Checked: 32 records: the nine fixed in `intake-state.md`, "Samples", line `- a1:` in the a1 line (a1-0304@6 a1-0309@11 a1-0314@16 a1-0319@21 a1-0324@26 a1-0329@31 a1-0334@36 a1-0339@41 a1-0344@46, all in `library/journal/2026-11-19/a1.jsonl`), and the 23 extractor records of the second line ("extractor files x44, x45, x46, x47, x48, sample 23", x44-0307 to x48-0323, `id@xNN:line` in `library/journal/2026-11-19/xNN.jsonl`); each id sits on the line named. Rule: a record stands only if every number, name and condition in its claim is at the place it cites (collect-file section, then the paper text or saved page under `R:papers/budget/`). Evidence entries cite section anchors (`#P5`, `#A11`), not `#line N`; the paper-text lines below were found by searching the saved texts. Read only; no file changed except this one.

| id | mark | reason |
|---|---|---|
| a1-0304 | stands | smart-pacing/paper.txt:61 (tens of billions of requests a day), :196 (re-plan remaining budget over remaining slots), :443 (24 h, 15 min). |
| a1-0309 | stands | linkedin/paper.txt:33 and :154 (late spend information, fast spenders served after the daily budget was spent, pacing reduces over-delivery). |
| a1-0314 | stands | bwk/paper.txt:150-160 (stop at first exhausted budget, time as one resource), :268-282 (regret form, B = smallest budget, optimal up to log factors), multiplicative weights at :368. |
| a1-0319 | stands | stripe2/page.txt:3 (2017), :36 (reserve 20 %, non-critical above 80 % rejected with 503). No figures of effect given, as stated. |
| a1-0324 | stands | claude-limits/p1.txt:107 (period starts at first message, resets in full five hours later); nothing on what starts the next period. |
| a1-0329 | stands | claude-limits/p5.txt:111-112, :137-142 (projects cached, count less, caches expire after inactivity, no ratio); Claude Code appears only in navigation links. |
| a1-0334 | stands | bats/raw.txt:124, :1041 (budget 10 vs 100, 12.8 vs 12.6 %, cost -31.3 %; Table 2 is Gemini-2.5-Pro, the 12.6 % equals the BrowseComp ReAct cell of Table 1), :762 (SWE-bench 36.8 to 55.4 %, 45.7 vs 46.0 calls, 18.88 vs 18.50 cents), :65 (token budget impractical). |
| a1-0339 | stands | tsafrir/paper.txt:839 and :1828-1831 (doubling helps, real and perfect), :4401-4402 (EASY++ beats X2 by a wide margin, all traces and both metrics, rather close to SJF). |
| a1-0344 | stands in part | Figures and instance counts match (kolisch06/paper.txt:461, :546, :630, :317). But "the best methods" is not true for the 60-activity row: Debels 11.73 / 11.10 / 10.71 is beaten at 1,000 schedules by Valls et al. 11.56 and Kochetov and Stolyar 11.71, tied at 5,000 (Valls 11.10); only at 50,000 is Debels lowest (10.71 against Valls 10.73). So the row is Debels's, not the best at each budget. |

| x44-0307 | stands | budget-pacing-regret/paper.txt:243 (Gaitonde: decreases/increases multiplier by an amount proportional to the current deviation). |
| x44-0315 | stands | dyn-throttling/paper.txt:18 (pacing generally superior to throttling, stochastic case); theory only, as noted. |
| x44-0323 | stands | mpe/paper.txt:13 (abstract: multiple pacing equilibria, large variations in several natural objectives). |
| x44-0331 | stands | smart-pacing/paper.txt:672 (their approach 96 %, ours 18 %, one-minute slots). |
| x44-0339 | stands | linkedin/paper.txt:246-256, :265 (+10.52 %, +0.96 %, 4.12 to 2.39 %, over-delivery loss 42 %). |
| x45-0307 | stands | talluri/paper.txt:22 (constant over time, even when demand is nonstationary, may not be unique). |
| x45-0315 | stands | devanur2/paper.txt:458-460 (Theorem 2.2, epsilon >= 1/m, probability 1 - delta, no knowledge of the distribution); the significance-of-one-request condition is at :450-453. |
| x45-0323 | stands | zhou/paper.txt:598-600 (Theorem 3.3, at least ln(U/L) + 1; archived copy). |
| x45-0331 | stands | talluri/paper.txt:257 (accept iff capacity available and fare exceeds sum of bid prices; line wraps). |
| x46-0307 | stands | cloudflare-sliding/page.txt:71 (400 million requests, 270,000 sources, 0.003 %); marked self-reported. |
| x46-0315 | stands | aws-credits/page.txt:61-62 (continuously earns below baseline, spends above). |
| x46-0323 | stands | claude-limits/p1.txt:127-128 (code execution enabled; Claude Code not mentioned). |
| x46-0331 | stands | claude-limits/p4.txt:71, :76 (cache_read not counted toward ITPM). |
| x46-0339 | stands | gcra2/tm40.txt:1408 (conforms to all instances), section 4.4.2 at :1326, April 1996 at :7. |
| x46-0347 | stands | sre-cascading/page.txt:202 (randomized exponential backoff); marked self-reported. |
| x47-0307 | stands | tsafrir/paper.txt:4127-4131 (SJBF alone 10-20 %, up to 42 % BLUE bounded slowdown). |
| x47-0315 | stands | kolisch06/paper.txt:448-450. |
| x47-0323 | stands | mapreduce/paper.txt:344 (sort 1283 s, +44 % with backup tasks disabled); marked self-reported. |
| x47-0331 | stands | late/paper.txt:452 (58 %, 220 %, up to 93 %). |
| x47-0339 | stands | dolly/paper.txt:258 (budget a configurable fraction of total capacity). |
| x48-0307 | stands | tale/raw.txt:169 and :84 say it (token elasticity, too small a budget raises token cost); the cited "paper.txt 303-306" is off, paper.txt has it at :262-264. |
| x48-0315 | stands | bats/raw.txt:5 (lack budget awareness, performance ceiling). |
| x48-0323 | stands | itbc/raw.txt:5 and paper.txt:20 (budget-dependent penalty, main performance gain); the note on raw.txt 3 vs 5 is right. |

Counts over all 32 (9 in a1.jsonl, 23 extractor records in x44 to x48): stands 31, stands in part 1, does not stand 0, cannot be checked 0. The 23 extractor records: all stand (one cites a wrong line number in its note, x48-0307, text still found).

Ids that do not stand: none, in all 32. Stands in part: a1-0344 (the only one) (60-activity row is one method's row, not the best at 1,000 and 5,000 schedules).

## (a) Refuted claims against results

`a1-refute-1.md`: REFUTED 0. `a1-refute-2.md`: REFUTED 1, A76 ("the plan should reach the end of the window's allowance one unit length before the reset, a fast finish, because a unit started near the limit may stop after its current step"). Searched `a1.jsonl` and `x44` to `x48` for "fast finish", "unit length", "before the reset", "last two hours", "22 hours", "may stop after". No record of kind `result` carries A76's claim. Related records: a1-0307 and x44-0335 (result) state only what LinkedIn does and why (self-reported); a1-0400 (hypothesis) is a different rule; a1-0505 (open) asks for the forecast error that sets a margin. Check passes.

## (b) "self-reported" on company or provider accounts

Searched all result and fact records in a1.jsonl and x44 to x48.
- Marked: all LinkedIn, Yahoo, Stripe, Google SRE, Cloudflare, AWS, Anthropic multi-agent post (a1-0336, x48-0325 to x48-0329), Mantri and Google-via-LATE (x47-0332 to x47-0335) records.
- Lacking the word, provider documentation (rules and limits, not measured results; the fetch date is given): a1-0322, a1-0323, a1-0324, a1-0325, a1-0326, a1-0327, a1-0328, a1-0329, a1-0330; x46-0319 to x46-0335 (17 ids). Strictly these are a provider's own account of its rules; whether a rule counts as a "figure" is for the owner of the rule (five hours, caps, no ratios).
- Borderline, not company blogs: x47-0340 (Lifka 1995, ANL/IBM scheduler, "extremely inefficient", qualitative), a1-0334 (BATS, Google authors, own experiments). Academic papers by universities (Tsafrir, Kolisch, BwK, Dolly, LATE) not counted.
