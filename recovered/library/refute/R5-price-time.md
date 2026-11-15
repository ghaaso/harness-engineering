# R5 refute: a cheaper tier changes the price of a token; time follows output and call count

Date: 2026-11-12. Role: refuter. Read-only on the repository and the transcripts.
Tags: [R] re-derived here by my own method, [O] read only, [W] checked on the web today, [D] arithmetic.

## 0. Verdict

**Narrowed.** Most numbers hold, a few ranges move. Two parts weaken:

1. "May raise the token count" has no support in this record. The 2x context per Sonnet call is the 1M-window setting. Calls per slice session and output per call are about equal by tier.
2. The issue measures only raw tokens. The vendor says Opus uses "meaningfully more" of the subscription quota. So a tier swap does buy more work per window, and the window is the owner's binding limit. That gain comes from the tier's price, though, not from the library.

What survives:
- In tokens, a tier swap saves nothing at equal steps.
- Per lane, time follows output and calls, not window size.
- The library's direct time ceiling is modest.
- Build pace follows the library only when the quota binds.

## 1. Restated issue (under 90 words)

Switching Opus work to Sonnet does not shrink the token count; here it took no fewer calls per slice. It only spends quota more slowly, a gain that needs no library where Sonnet already copes. A call takes about 1 to 3 s plus 6 to 11 s per 1,000 output tokens; window size adds almost nothing. Skipping every exploration run saves 10 to 31 % of a lane's machine time, 4 to 14 % at assumed hit rates. Build pace gains only while the quota is the limit.

## 2. Numbers

### Re-derived by my own method

Method: `r5-extract.cjs` reads every transcript in both groups. It differs from `timing.cjs` in three ways:
- A call starts at the transcript's own `api-request` entry, which exists for 100 % of calls.
- Tool time runs per `tool_use` id, from the block to its matching `tool_result`.
- Active time is the union of model and tool intervals, so streaming overlap is not double counted.

`r5-fit.cjs` fits ordinary least squares and a median (least absolute deviation) regression, adds an output x context term and a cache-write term, and fits each model separately. `r5-more.cjs` splits by role and by model. `r5-waits.cjs` classifies shell time. Outputs: `r5-fit.json`, plus the console output quoted below. FixFlow now holds 7,619 calls, because today's sessions added about 500. The Clinic holds 15,921.

| Claim | First round | Re-derived | Result |
| --- | --- | --- | --- |
| Calls in the fit | 21,620 | 6,463 + 15,157 tool-triggered calls = 21,620. My fit uses all 23,540 calls. | confirmed |
| Fixed seconds per call | "about 2 to 3 s" | Pooled least squares: −0.4 s (FixFlow), 3.0 s (Clinic). Median fit: 0.6 s and 2.0 s. By model: 1.2 to 4.2 s (least squares), 0.8 to 2.0 s (median). | corrected to about 1 to 3 s |
| Seconds per 1,000 output tokens | 7.5 to 9 | Pooled 7.6 to 9.5. By model: Sonnet 6.0 to 6.7, Opus 8.7 to 9.4, Fable 10.7 to 11.3. Opus is 1.4x Sonnet's time per token. | confirmed |
| Window size's share of model time | 0 to 14 % | Pooled: 12.4 % (FixFlow), 1.2 % (Clinic). Within one model, all context terms together explain −7 to +8 %. The pooled FixFlow figure is model mix: Fable runs big windows and is slow per token. | confirmed, and stronger: about none within a model |
| Cache reads as a share of context tokens | 97 % | 95.6 % (FixFlow main store), 98.2 % (Clinic) | confirmed |
| Lookup-only calls' share of model time | 39 to 43 % | My loose classifier: 37.2 % (FixFlow), 42.4 % (Clinic). A strict classifier (every shell segment a read verb): 17.3 % and 19.1 %. | corrected to 17 to 42 % by classifier |
| Model time's share of active machine time | 51 to 86 % | 51.4 % (Clinic), 83.0 % (FixFlow). FixFlow is 87 % without human waits (AskUserQuestion 0.9 h, Edit approvals about 1.0 h). | confirmed |
| "The rest is mostly the check" | – | Clinic shell time, 52.7 h: running or polling the check 48 %, other sleeps and polls 37 %, the rest small. FixFlow non-model time is mostly scripts (1.7 h) and web fetches (WebFetch 1.4 h, WebSearch 0.5 h). The check is 0.7 h. | corrected: about half the check in the Clinic; not the check in FixFlow |
| Ceiling: remove every exploration run | 22 to 34 % of a lane's machine time | Loose: 21.8 % (Clinic), 30.9 % (FixFlow). Strict: 9.8 % and 14.3 %. FixFlow adds about 5 % of web lookup tool time. | corrected to about 10 to 31 % |
| At assumed hit rates | 4 to 15 % | D1's formula with my shares [D]: 0.217 x 0.424 x 0.91 x 0.514 = 4.3 %, and 0.46 x 0.372 x 0.95 x 0.83 = 13.5 %. The top end uses plan caching's 0.46, which D1 itself calls optimistic. | confirmed, 4 to 14 % |
| Sonnet slice calls read about 2x the context | 440k vs 222k | 3,297 Sonnet slice calls at 445k each; 5,879 Opus calls at 225k each. Ratio 1.98. | confirmed, but see the next row |
| Output per call about the same by tier | Opus 1,106 to 1,258; Sonnet 978 to 1,395 | Same role (Clinic slice sessions): Opus 1,020, Sonnet 1,115. Across roles: Opus 1,098 to 1,290, Sonnet 869 to 2,141 (Sonnet subagents are higher). | confirmed in like-for-like roles |
| Tokens per finished task by tier (new) | "may raise it" | Clinic slice sessions run on one model only. Calls per session: Opus median 388, mean 352 (16 sessions); Sonnet median 283, mean 391 (7 sessions). Tokens per session: Opus mean 79 M, Sonnet mean 171 M. The whole token gap is context per call, set by Sonnet's 1M window against Opus's 367k. One Sonnet session at 238k per call looks like Opus. In FixFlow, Sonnet calls read less than Opus calls (92k vs 139k). | refuted as evidence of "more tokens"; unknown either way |

### Read only

- Opus is 2:1 against Sonnet per token, including cache reads (F6, from the vendor price page) [O].
- Thinking is 45 % of output, and thinking stays in context at about 10.5 % of all context tokens (F3) [O]. I could not re-derive these: thinking text is redacted in the transcripts (zero characters per block).
- October: 14 limit episodes, and the October fit puts tokens first at about 2.5 lane-hours (V2 §0, lines 39 and 64) [O].
- Plan caching's hit rate of 0.46 (F4 via D1) [O].

### Checked on the web [W]

- **The 76 % figure.** Confirmed at the vendor's Opus 4.5 announcement. At medium effort, Opus 4.5 matched Sonnet 4.5's best SWE-bench Verified score with 76 % fewer output tokens. At highest effort it beat Sonnet 4.5 by 4.3 points with 48 % fewer tokens. Limits on using it:
  - It is two generations old and vendor-run.
  - It counts output tokens only, not calls or context.
  - For today's pair, Sonnet 5.5 leads Opus 5.5 on Terminal-Bench 4.0 (D3), so the direction today is unknown.
  - It also implies [D] that medium effort used about 0.24 / 0.52 = 46 % of high effort's output on Opus 4.5.
- **Quota weighting.** The vendor's current Claude Code help page on models and usage says "Opus costs several times more per turn than Sonnet." It also says Opus "uses meaningfully more of your quota". It gives no number.
  - The general Pro and Max limits page says limits are shared across Claude and Claude Code. Max and Ultra plans have a separate weekly limit for Fable.
  - Neither page says how cached tokens count against the quota. That stays unknown (TB, V2).
  - In November 2025 the vendor raised Max limits so users had "roughly the same number of Opus tokens" as they had with Sonnet. That only makes sense if the quota weights models.

### Could not check

- The exact quota weight per model.
- Thinking share and effort settings per call, because they are redacted or not logged.
- The tokenizer difference between Opus 5.5 and Sonnet 5.5, if any.

## 3. Attempts to dissolve

1. **Quota weights Opus more heavily.** True [W]. At equal tokens, a swap uses less quota, so more work fits in each five-hour or weekly window. The record says the window binds: 14 limit episodes in October, and the October fit puts tokens first. So in the owner's practical unit, quota, E3 would feed E1, by up to the weight on moved work. D3 put this at about 31 % of price-weighted context at 2:1 if all Opus work moved.
   - This narrows "E3 cannot feed E1" to raw tokens only.
   - It does not dissolve the issue. The gain is the tier's price, and it exists without a library wherever Sonnet already does the work. Vendor: Sonnet 5.5 leads or sits within 2 to 3 points on terminal and tool work.
   - The library's own part is only the work Sonnet fails alone and passes with entries. D3 bounds that part as small and unmeasurable here.
2. **Lower effort cuts thinking, and so time.** Yes. Output drives about 75 to 90 % of model time. On the vendor's Opus 4.5 figures, medium effort used about half the output of high.
   - Halving output would cut model time per call by about 35 to 45 % [D].
   - Carried thinking would also shrink: about 5 % of tokens if thinking halves (0.5 x 10.5 %) [D].
   - This is a real E2 lever and a small E1 lever. But it works on any model with no library. The library matters only if entries are what let low effort keep quality, and nothing measures that. So it is not the library's lever.
3. **A hit removes a whole subagent and its fixed prefix.** In tokens, yes: D1 bounds it at 1.2 to 11.6 %. In time, a removed agent's non-lookup calls go too, and those include the long report-writing calls. FixFlow workflow and Agent subagents are 73 % of model time. Their read-set overlap of 0.5 or more (Jaccard: shared files over all files) is 16 %. So the bound is about 0.16 x 0.73 x 0.83 = 10 % of FixFlow lane machine time, and about 1 % in the Clinic [D]. Agents run in parallel, so wall time gains less. This adds little to the ceiling. Not dissolved.
4. **A plan or recipe also cuts thinking in the calls that remain.** Thinking in non-lookup calls is about 0.6 x 0.45 x 0.8 ≈ 22 % of model time [D, read-only inputs]. Halving it on a recipe coverage of 0.3 to 0.6 gives 3 to 7 % of model time, or 2 to 5 % of lane time. Small, and unmeasured.
5. **A push hook instead of a pull lookup.** It removes the miss cost (D1 case A3). The lane-time gain is already inside the 4 % figure.
6. **A context ceiling on every model.** It removes the window artefact behind "2x per call". After that, tokens per slice by tier are equal on the record's evidence, not higher.
7. **Build level.** "Nothing at build level when a serial gate binds" is true only in that case, which is v2's intended state.
   - In the record's state, tokens or quota bind first. Then build pace follows the token saving: S = 13 % gives x1.15, and 28 % gives x1.39 (D1).
   - A tier swap on quota would give about x2 at a 2:1 weight, on work Sonnet can take, until review or the check binds. That is the tier again, not the library.
   - So the time and token split holds per lane and per response. At build level, time follows tokens whenever the quota is the limit.

## 4. Strongest counter

The owner's real pain is the quota stop, not the raw token count. Opus counts "several times more per turn". So moving work to Sonnet at equal tokens buys more work per window and, when the window binds, faster builds. Sonnet is also 1.4x faster per output token.

This cuts against the issue's framing. It does not touch the library's own contribution. That gain belongs to routing by tier, which needs no library wherever Sonnet already does the job.

## 5. What the owner can do

- **Count quota, not tokens.** Use the account's usage view per model on matched slices, under a context ceiling on every model. Route by quota per accepted slice. Cost: a matched trial of tens of slices.
- **Take speed from levers that need no library.** Effort settings, Sonnet where it passes the gate, the container check (367 to 230 s), parked waits, and the fix-round contract.
- **Expect little speed from the library itself.** At most 10 to 31 % of a lane's machine time if it removed every exploration run, and about 4 to 14 % at assumed hit rates. It adds build pace only while the quota binds.

## 6. Files (all under this folder)

- `r5-extract.cjs` → `ff-r5.jsonl`, `cl-r5.jsonl` (per-call timing from `api-request` entries, per-transcript time partition)
- `r5-fit.cjs` → `r5-fit.json` (fits: least squares, median, interaction, per model; lookup-only shares; partition)
- `r5-more.cjs` (role split and fits within each model), `r5-toolcmds.cjs` and `r5-waits.cjs` (what non-model time is)
