# R10 completeness critic: the library of cached reasoning

Date: 2026-11-12. Read-only on the repository and the transcripts.
Unit: context tokens processed per call (input + cache write + cache read), summed. Price ratios only where marked.

Tags: [M] measured by me today, [D] arithmetic on tagged inputs, [R] read from a report and not re-derived, [X] could not check.

## 0. Scripts (all in this folder, all read-only)

| Script | Output | What it does |
|---|---|---|
| `r10-spend.cjs` | `r10-spend.json` | Context tokens per project folder and session, deduped by `message.id` + `requestId`. |
| `r10-worktype.cjs` | `r10-worktype.json` | Token share against price-weighted share, by work type. |
| `r10-sessionwrites.cjs` | stdout | Write/Edit targets and daily tokens for one session. |
| `r10-calls.cjs` (+ `r10-fix.cjs`) | `r10-calls.json`, `r10-calls-failsamples.json` | One pass over all transcripts in two groups (FixFlow, clinic). Per call: context, output, price units, lookup-only class, repair spans (strict, tight, broad), windows with a code edit or a failed check. |
| `r10-cmdsample.cjs` | stdout | How check commands are actually run (clinic runs checks to a log, then greps it). |
| `r10-power.cjs` | stdout | Spread of tokens per build session; sessions per arm to see a cut. |
| `r10-units.cjs` | stdout | What unit "subagent tokens" is in the knowledge-store header. |
| `r10-churn.cjs` | stdout | Per-file and per-footprint survival on FixFlow `main`, censored at the last commit. |

Detector limits. The broad repair detector was right on 12 of 25 sampled episodes, wrong on 7, unclear on 6 (about 50 to 70 % precision). So I report strict, tight and broad as a range, never broad alone.

## 1. My measurements

### 1.1 Totals [M]

| Group | Windows | Calls | Context tokens | Output tokens |
|---|---|---|---|---|
| FixFlow (EMS folders + the 23-FixFlow folder) | 1,175 | 16,917 | 2,550M | 28.2M |
| Clinic (24-Clinic-Workshop folders) | 472 | 21,187 | 5,226M | 30.8M |

Three different "FixFlow record" totals are in circulation: 2.126B (F3), 2.419B (inventory-matched sessions), 2.550B (all folders). They differ by scope, not by error.

### 1.2 Where the tokens go [M]

| Share of context tokens | FixFlow | Clinic | Pooled |
|---|---|---|---|
| Lookup-only calls (strict class) | 37.8 % (45.6 % of calls) | 32.5 % (43.0 % of calls) | 34.2 % |
| Same, price-weighted | 31.5 % | 30.0 % | |
| Repair spans, strict (check fails at segment start) | 1.7 % | 4.4 % | 3.5 % |
| Repair spans, tight (failure to next check, max 30 calls) | 2.7 % | 20.2 % | 14.5 % |
| Repair spans, broad (50 to 70 % precise) | 9.7 % | 29.4 % | 23.0 % |
| Windows with any code edit or failed check | **10.9 %** (1 code-edit window, 18 failed-check windows) | 77.9 % | 55.9 % |

### 1.3 Work-type shares in tokens, not price [M]

- FixFlow inventory (14 sessions, 2,419M): labelled harness-meta 46.6 %, labelled product 51.2 %, unrelated 2.2 %.
- The label is wrong for the biggest "product" session (`e24f17dc`, 980M). Its writes are the graph test (534), the ship plan (86), the orchestration design (75). It has about 10 product-code edits, all on 31 Oct. So the FixFlow record is about 85 % harness and programme work.
- Pooled over both projects, build work (clinic-testbed) is 45 % of tokens. The price-weighted figure that D1, D2 and P used is 36 %.
- Labelled programme sessions in the FixFlow folders: knowledge-store design 382M, skill packages 326M, Horthy sweep 244M, V2 design 117M, BAML sweep 40M, token analysis 18.5M. Sum 1,127M in about ten days. This review workflow had passed 103M mid-run.

### 1.4 Units in the knowledge-store header [M]

The "15M subagent tokens" in the KS header equals the cache writes (15.14M). Processed context for the same session is 382M, about 25 times more.

### 1.5 Churn on FixFlow main, censored [M]

| Gap | Fix commits: files unchanged | Fix commits: whole footprint unchanged |
|---|---|---|
| 1.1 h | 95.1 % | 88.0 % |
| 24 h | 82.0 % | 61.2 % |
| 93 h (about 4 d) | 73.0 % | 47.9 % |
| 7 d | 57.6 % | 34.9 % |
| 30 d | 30.1 % | 13.0 % |

Median time to the first change of a fix footprint: 3.69 d over all 50; 1.15 d over the 41 that changed. All commits: 0.46 d.

### 1.6 Session spread [M, D]

Clinic build sessions: coefficient of variation 0.58 to 0.84. To see a 10 % cut in mean tokens per session at 80 % power: 529 to 1,108 sessions per arm. A 20 % cut: 132 to 277. So E1 cannot be read from session totals.

### 1.7 Second occurrences and their guards [M, git]

`f29f62f` added `test_app_bootstrap.py`. `6928828` changed the Dependabot ignore list. `3e3db77` added `expo export` to CI. R2 reports the jest-expo leak came back twice after the ignore. So the second fix mostly went into CI or tests, not a note.

## 2. Contradictions and how I resolve them

1. **D1 "81 % of fix files unchanged" against D2 "median 0.71 d to a change".** Different repo (D1 used the clinic), different gap (1.1 h against days), different object (one file against any file of a footprint), and D2 dropped the unchanged ones. On FixFlow I get 95 % of files and 88 % of footprints unchanged at 1.1 h, 48 % of footprints at 4 days. D2's 0.71 d is a median of changed footprints only; over all 50 it is 3.69 d. Churn forces a re-check at lookup. It does not lose the hit: R3 found the fix lines survive at a median of 100 %. Both numbers are right about different things. Neither is a ceiling.
2. **D1 push "13 %" against D6 "3 to 4 %, nets to zero or less".** Different channels. D1 priced pushed exploration answers per run at perfect precision and a repeat share of 0.217. R1 cut that to 8 to 12 % at the measured repeat share 0.12 to 0.20. D6 measured hazard warnings per PR. R8 found D6 let 66 to 71 % of fires land before the entry existed; forward only, 4 to 12.5 %. A content injection costs about 0.73 call per false fire, so it nets near zero. A pointer of about 80 tokens costs about 0.07 call per false fire, so most of the gross token saving survives. The cost moves to quality: about 8 to 24 wrong hints per useful one.
3. **Ceilings: P 6 to 18 %, D1 6 to 31 %, D2 about 1 %.** They price different parts. Split by part:
   - Reused defect reasoning: about 0.5 to 1 %. My re-derivation: repair spans 3.5 to 14.5 % (central about 8 %) times a repeat share of 6 to 10 % (3 to 5 repeats in 50 fixes) gives 0.2 to 1.5 %, central 0.5 to 0.8 %. This confirms D2.
   - Question-level conclusions: 8 to 13 % at perfect precision (R1).
   - Digests of code: 5 to 24 % (R1). That is not cached reasoning.
   - Recipes: 1 to 5 % (R1); P's own 2.6 to 10.5 %.
   - Checks: 3 to 5 %. They belong to CI.
   - Research claims: 1 to 2 %.
   D1's 31 % adds parts that overlap and assumes perfect precision. P's arithmetic (recipes 2.6 to 10.5 % plus rounds 8 to 12 %) gives 10.6 to 22.5 %, not 15 to 30 %; and the rounds are checks.
4. **First lesson wrong: D7 "4 of 5" against R2 "1 of 5".** R2 read the commit bodies. R9 adds that only 3 of the 5 first fixes meet the strict write rule. I take 1 of 5 wrong, and 2 of 5 never recorded under the strict rule.
5. **"3 of about 55" lead-capable (D2, D3, D7) against "3 of 8 worked examples" (R2) and "3 of about 15 entries" (R9).** Same three entries, different denominators. The 55 includes rows that are not worked examples. Use 3 of about 15 (80 % ungated without Docker, 60 % with).
6. **D2 v = 0.25, h = 0.5 to 2.5 % against R3 v = 0.25 to 0.4, h = 0.5 to 4 % (7.5 % at best).** R3 measured more sources. Use R3.
7. **D5 "no product commits since August" against R6 and git.** Zero on main since 3 Aug; three product fixes on side branches. Effectively zero. Both stand.
8. **Lookup-only share: R1 40 to 56 %, the bottleneck work 43.6 %, mine 32.5 to 37.8 %.** Calls against tokens, and classifier strictness. In calls I get 43 to 46 %, which matches 43.6 %. In tokens, 33 to 38 %.
9. **Fix share: D1/D3 "48 of 368 (13 %)" against 48 to 50 of 233 non-merge commits on main (21 %).** The 368 counts merges and other refs. Use 50 of 233.
10. **Repair work: D1 13 to 30 % (a guess) against measured repair spans.** Pooled 3.5 % strict to 14.5 % tight; 1.7 to 2.7 % on FixFlow. D1's band is too high outside a build-heavy clinic month.
11. **Build cost W: D5 200 to 500M for ten sessions against R6 1.5 to 1.6B.** Sessions measure 79 to 171M (slices) and 382M (the KS design). R6 is right; D5 is three to eight times low.
12. **Push warning rate: D6 "53 % of PRs at 50 entries, 86 % at 133" against R8 16 to 51 % for the selective policies.** D6's figure holds for one policy only.
13. **Fix classes and portability: D4 54/18/28, "85 % of deps a major behind", "2 of 14 portable" against R7 50/22/28 (38/34/28 at the soft line), 64 % of independently versioned packages, 2 to 3 of 14 at commit level and about 10 with the deploy traps.** Use R7.
14. **Uses per entry and write cost: D7 0.04 to 0.27 and 0.9 to 2.6M; KS 7 to 14k; R9 0.06 to 0.14 and 0.4 to 3.8M.** KS gives an output-sized figure for a processed-token cost. Use R9.
15. **Proof size: D3/D5 "220 to 1,440 tasks" against R6.** The range mixes a paired detection test with an unpaired equivalence test. Paired equivalence: 172 to 257 tasks at plus or minus 10 points, 686 to 1,028 at plus or minus 5. The history has 140. The conclusion (cannot be proven here) stands.
16. **Time ceiling: D1 22 to 34 % against R5 10 to 31 %.** R5 fitted call time (1 to 3 s plus 6 to 11 s per 1k output). Use R5.
17. **Model gap "matched within days" (fact sheets) against R6.** On merge-quality work the new Sonnet gained 3.8 points and still trails Opus by 8.2 (FrontierCode). The gap closes fast on tool work, slowly on merge work.
18. **Half-life: D5 3 to 8 months against R6 2 to 11 months.** Neither is measured. An order of magnitude only.

## 3. Unit errors

1. Price-weighted work-type shares used as token shares (D1 §7, D2 issue 3, P for E1 and E4). Build is 45 % of pooled tokens, 36 % of price. The labels are also wrong (`e24f17dc`).
2. D2's 0.7 to 35M range mixes output tokens (14k per record) with processed tokens. In processed tokens the range is 44 to 130M per two months (D7's 0.88 to 2.6M per entry times 50), 2 to 6 % of FixFlow's record.
3. The KS header's "15M subagent tokens" is cache writes. Processed is 382M.
4. The KS write cost (7 to 14k) is output-sized; the real cost is processed tokens on every extra turn, 0.4 to 3.8M (R9).
5. D1 used shares of characters read as shares of runs (R1).
6. D2's recipe bound multiplies a share of commits by a share of price by a share of tokens.
7. D7's saving pool (6 to 21M) is taken from October and November spend, which has almost no product work, then applied to build work.
8. Quota against tokens (R5). Quota weights Opus more, so a token saved on Sonnet is worth about half one saved on Opus.
9. D6's per-PR warning precision compared with D1's per-run exploration push (R8 agrees).
10. Calls against tokens for lookup-only work: 43 to 46 % of calls is 33 to 38 % of tokens.
11. ReasoningBank: absolute points against a share of the remaining failures (R6). The share does not shrink with the stronger model; the points do.
12. The 220 to 1,440 task range mixes two different tests (R6).

## 4. Missing issue (one survives)

### M1. Most of the spend E1 targets is out of the triggers' reach, and much of it is the programme itself

Restated (under 90 words): The library acts only when building goes wrong or a diff is pushed. In FixFlow's record only 11 % of tokens sit in a window that edits code or fails a check. The rest is research, design and review, where no trigger fires. About 85 % of that record is the harness and library programme itself: 1,127M tokens in ten days of labelled sessions, plus most of the biggest session. One review round costs about 100M. The cached-reasoning saving is 6 to 55M a month at best.

Evidence:
- Trigger-visible share: 10.9 % FixFlow, 77.9 % clinic, 55.9 % pooled [M, `r10-calls.json`].
- Programme spend [M, `r10-spend.json`, `r10-worktype.json`, `r10-sessionwrites.cjs`]. This workflow passed 103M mid-run.
- Saving pool: D7's 6 to 21M per two months; best corner about 55M a month [R].
- Cached reasoning reaches about 1 % of build-visible tokens (section 2, item 3). On FixFlow's present mix that is about 0.1 % of the total [D].

Why it is not easily solved:
- It is the owner's work mix, not a design defect.
- Reaching research and design spend means caching answers to questions and digests. That is a different product. Its push precision is 4 to 12.5 % (R8). Its ceiling is 8 to 13 % at perfect precision (R1).
- Each evaluation the owner needs is the same size as months of saving: a probe trial costs 62 to 250M per reader model (R9); re-validation costs 1 to 4B per release (R6); replaying the repeats costs tens to hundreds of millions (R6).
- When the mix returns to building (the ship plan), the visible share rises towards the clinic's 78 %. The ceiling is then the build ceiling in section 2. So the issue is the timing and size of E1, not its sign.

Confidence 0.65.

### Candidates checked and dropped

- Incentives and self-reporting. Compliance is self-reported (KS L548). Hits are counted by the agent that benefits. A logging hook fixes it. Moved to easily solved.
- E1 detectability from totals (CV 0.58 to 0.84). Fixed by holding out per trigger. Moved to easily solved. The deeper limit, too few encounters, is R6's issue.
- Effects on the top model. R4 (Opus-led slices had a P1 in round 1 in 9 of 14) and R9 (ClashEval adoption over 60 %) already cover it. I found no new number.
- Harness or vendor change. The design's hooks and deferred tools are vendor features. I found no number that shows harm. Not raised.
- Legal and licence limits for sharing (E4). The design has a scrub step. Personal data in entries is a real risk, but a scrub plus a review fixes it. Not raised as a bottleneck.

## 5. Merges

1. "Verified content becomes CI, so the library keeps the unverifiable rest": D2 issue 1, D3 issue 2, D4 issue 1, D5 issue 1, the W2 part of D7, R2. My git check agrees: the second fixes shipped tests or CI.
2. "The ceiling is small": D1 I1, D2 issue 3, R1. Split by part as in section 2, item 3.
3. "It cannot be proven here": D3 issue 3, D5 issue 3 (proof), D6 issue 2, R6 point 3, and E1 detectability.
4. "The gap that matters is not cacheable; the top model is still needed": D3 issue 1, D4 issue 3, D7 W4, R4, R6 point 1.
5. "It does not travel and it depreciates": D2 issue 4, D4 issues 1 and 2, D5 issue 2, R7, R6 point 1.
6. "Time": D1 I2, R5.
7. "Unverifiable content reaches a cheaper reader on trust": D7 W3, D6 issue 2, R9 point 1.
8. "Push is mostly wrong": D1's push lane, D6 issue 1, R8.
9. "Payback is long": D5 payback, D7 W2 economics, R6 point 2, R9 point 2.

## 6. Easily solved (a day or two each)

1. **KS-9 values a hit at the recorded cost of the first solve.** That overstates what a hit avoids. Fix: replay the incumbent once per claimed hit (about 1.5M each) and log both.
2. **Compliance is self-reported (L548).** Fix: a hook logs every escalation, lookup and injection.
3. **E1 judged from session totals.** It needs 529 to 1,108 sessions per arm. Fix: a randomised holdout per trigger fire, scored per encounter.
4. **V2 is judged by the KS stop rule (R3).** Fix: one metric per part (digests, recipes, solved problems).
5. **The fixed "3 hits in 20" kill rule kills a break-even store 41 % of the time (R6).** Fix: a sequential stop rule (about 25 to 30 encounters on average).
6. **The stored model id is not a rule (R6).** Fix: a hit written by an older model shows to a newer reader as a candidate.
7. **No per-entry write term in the break-even (R9).** Fix: add it; log the write verbs' cache tokens.
8. **The Sentry rule lost its condition in CLAUDE.md.** Fix: a condition field and source link on every prohibition; audit CLAUDE.md rules against their source commits.
9. **The jest-expo Dependabot leak came back twice.** Fix: `expo install --check` or `expo-doctor` in CI.
10. **The interface's standing cost.** FixFlow made 16,917 calls in about two weeks. Each 1k tokens loaded on every call costs about 17M per two weeks, as much as the whole cached-reasoning pool saves in about 2 to 11 months (6 to 21M per two months) [D]. Fix: a deferred tool, a one-line pointer, and injection only at triggers.

## 7. Closest to true

| Expectation | Form closest to true | Number I would defend |
|---|---|---|
| E1 tokens | Gated entries plus recipes trim build work a little. Cached reasoning itself is a small part. Larger levers (digests, CI checks, a smaller orchestrator window) are not cached reasoning. | 2 to 6 % of build-work tokens; about 1 % from reused reasoning; about 0.1 % of FixFlow's present total. Perfect-precision ceiling for question-level reuse: 8 to 13 %. |
| E2 speed | Faster only where a hit removes calls inside a build lane. Wall-clock pace improves only while the quota binds. | 4 to 14 % of machine time in a lane at assumed hit rates; ceiling 10 to 31 % (R5). |
| E3 Sonnet as Opus | "Sonnet builds, Opus reviews": a cascade held by tests. Parity only on gate-checked, covered cases. | Covered: 3 of about 15 worked examples (6 with Docker). Elsewhere the gap stays: 8.2 points on merge-quality work. Lever: price ratio about 2 to 1. Parity provable here only within plus or minus 11 to 14 points. |
| E4 reuse | The harness, templates, recipes and a small rule pack travel. Project entries transfer about nothing. | About 10 portable rules (R7); 2 to 3 of 14 stack-wide causes at commit level. A second project's 17 to 26 % (R7 on P's arithmetic) rests on an unmeasured input and mostly needs no library. |
| E5 accuracy | Pull lookups on gate-checked entries are accurate because the check decides. Diff push is mostly wrong. | Gated pull: precision near 1 on 3 of about 15 entries. Diff push: 4 to 12.5 % (R8). Error-keyed push: about half of repeat errors, but those errors already name their cause. Pooled bound: 0 errors in 40 probes means at most 7.5 %. |

## 8. Which numbers I re-derived, read, or could not check

Re-derived today [M]: totals and windows; lookup-only shares in tokens, calls and price; repair spans (strict, tight, broad); trigger-visible share; work-type token shares and the mislabel; KS header unit; churn per file and footprint; session spread and sample sizes; the guards on second occurrences; the broad detector's precision on 25 samples.

Read and not re-derived [R]: R1 to R9 figures (lookup 40 to 56 %, question level 8 to 13 %, digests 5 to 24 %, v and h, P1 in 9 of 14, the call-time fit, payback, write cost, forward push precision, fix classes); D1 to D7 and P figures; literature figures; price ratios.

Could not check [X]: S, the solve cost a hit avoids (no transcripts from the June to August fix period); quota weighting; Sonnet-Opus parity on this repository; the half-life; the repeat share on future work.
