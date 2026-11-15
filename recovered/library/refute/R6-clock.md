# R6 refuted: "the value depreciates on the model-release clock; neither payback nor proof fits inside one release"

Verdict: **narrowed**. Confidence 0.7.

Scripts and outputs in this folder:
- `r6-stats.cjs` / `r6-stats.out.txt`: exact binomial power, a Wald sequential test by simulation, paired and unpaired equivalence sizes, payback recast as "hits needed".
- `r6-seed-split.cjs` / `r6-seed-split.out.txt` / `seed-solved-traps.txt`: my own split of the knowledge-store seed rows into re-derivable conclusions and facts.
- Git queries (read-only) run inline: co-author trailers on all refs, commits per month on main and on all refs.
- Vendor pages opened today: the Sonnet 5, Sonnet 5.5 and Opus 5.5 announcements. ReasoningBank (arXiv 2509.25140) Table 2.

## 1. The numbers

### Re-derived by my own method

| Claim | Source | My method | Result |
|---|---|---|---|
| Co-author model changed five times in 162 days | D5 | `git log --all` trailers, first and last seen per model | **Confirmed, with a caveat.** Six models: Opus 4.8 (31 May), Opus 4.7 (1-3 Jun), Fable 5 (10 Jun), Opus 5 (27 Jul), Opus 5.5 (23 Sep), Fable 5.1 (31 Oct). 153 days from first to last first-seen; 162 to the last commit (9 Nov). One change is a step back to an older model (Opus 4.7). Opus and Fable switches are tier choices, not releases. So four new models adopted after the first, not five releases. |
| Mid-tier gaps 141, 133, 90 days | D5, F6 | date arithmetic; Sonnet 5 (30 Jun) and Sonnet 5.5 (28 Sep) dates opened at the vendor pages today | **Confirmed.** Sonnet 4.5 and 4.6 dates read from F6 only. |
| Payback 4 to 10 months with generous inputs, "only if every repeat is a 20 M hit" | D5 `d5-calc.js` | hits needed = W / (S - L_hit), then months at 2.73 hits a month | **Confirmed, slightly corrected.** W 200 M and S 20 M: 10 hits, 3.7 months. W 500 M: 25 hits, 9.3 months. But W 200 M with S 10 M also gives 7.6 months, so the condition is "10 to 20 M a hit", not only 20 M. |
| W = 200 to 500 M tokens for about ten sessions | D5 | FixFlow summary: 2.126 B context tokens over 14 sessions | **Corrected.** That is 152 M a session (re-derived). The clinic slice session is 159 M (519 calls at 306k; read from F3, not re-derived). Ten sessions are about 1.5 to 1.6 B. 200 to 500 M is three to eight times too low. At the measured size, even "all six repeats hit at 20 M" needs 77 to 81 hits: 28 to 30 months. |
| Realistic inputs give years or never | D5 | same | **Confirmed.** 0.91 hits a month at S 5 to 10 M and W 200 to 500 M: 23 to 118 months. At measured W: 14 to 30 years. |
| 52 encounters to tell 5 % from 15 % | D5 | exact one-sided binomial, alpha 0.05, power 0.8 | **Confirmed.** First n with power 0.8 is 52 (reject at 6 or more hits). Because of the sawtooth, power stays above 0.8 for every larger n only from 59. |
| Kill rule kills a break-even store 41 % of the time | D5 | exact | **Confirmed** (40.5 %; 92.5 % at h = 0.05). |
| "About 20 encounters per checkpoint" | D5, R6 | read KS L669 | **Corrected.** The checkpoint is "20 logged encounters or 8 weeks, whichever comes first". No rate is assumed. X-05 guesses 20 encounters take 7 to 20 phases. |
| Encounter stream zero today | D5 | `git log` all refs since 4 Aug, paths backend/src/technician-app | **Corrected slightly.** Zero on main since 3 Aug. Three product fix commits on side branches (23 Sep, 24 Sep, 1 Nov) and one dependency bump. Effectively zero. |
| 220 to 1,440 paired tasks to show Sonnet + library = Opus | D3, D5 | paired TOST and McNemar, my own formulas | **Corrected.** The range mixes two different tests. 221 to 332 is the paired sample to *detect* an 8.4-point difference. 1,440 is the *unpaired* per-arm sample for equivalence at ±5 points. Showing equivalence on paired tasks (20 to 30 % discordant) needs **172 to 257 tasks at ±10 points** and **686 to 1,028 at ±5 points**. With 140 paired tasks the tightest provable margin is **±11 to 14 points**, wider than the whole 2-to-8-point vendor gap. The conclusion holds. |

### New measurement: how much of the seed depreciates with models

I split the seed rows of lanes R-01a and R-01b myself. Two classes:
- **Re-derivable**: a conclusion a capable model could reach by reading this repository's code with the symptom in hand (state-machine guards, outbox and cursor behaviour, deploy-policy reasoning, design alternatives ruled out by reading code).
- **Fact**: something no reasoning over the repository yields: vendor, library, device, OS, network or operator behaviour, found by running it or from vendor docs.

| Rows (duplicates dropped) | Fact | Re-derivable | Procedure |
|---|---|---|---|
| Solved and traps (37) | 14 | 23 | 0 |
| Negative results (59) | 20 | 34 | 5 |
| **All 96** | **34 (35 %)** | **57 (59 %)** | **5 (5 %)** |

Plus 25 invariants, which are owner decisions and stay as rule sentences in CLAUDE.md.
The six historical repeat pairs split evenly. Facts: Expo SDK pin drift, expo-audio `stop()`, Sentry plugin. Re-derivable: mypy re-export, ORM registry import, press-race guard.
The worked examples: ex7 and ex8 are facts; ex1, ex3, ex4, ex5 re-derivable; ex2 mixed; ex6 a decision.
This is one reader's judgment. A second reader would move some rows; the 60/35 split could plausibly be 50/45.

### Read and checked against the source, not re-derived

- Sonnet 5 page: "its performance is close to that of Opus 4.8", and "higher-effort performance can match Opus 4.8 on some tasks". **Confirmed.**
- Sonnet 5.5 page: "at Max effort even performs comparably to Opus 5.5"; Opus 5.5 "remains clearly stronger at complex, open-ended work requiring sustained judgment". FrontierCode 1.1: Sonnet 5 42.4, Sonnet 5.5 46.2, Opus 5.5 54.4. **Confirmed, and it corrects the "matched within days" reading.** On the merge-without-edits benchmark the new mid tier gained only 3.8 points and still trails by 8.2. The baseline moves fast on tool and terminal work. It moves slowly on merge-quality work.
- Opus 5.5 page: "costs 40 % less to run than Opus 5" at 20 % lower per-token prices. That is about 25 % fewer tokens on typical workloads [D].
- ReasoningBank Table 2: Flash 34.2 to 38.8 (+4.6), 30.3 to 27.5 steps; Pro 54.0 to 57.4 (+3.4), 21.1 to 19.8 steps. **Numbers confirmed. Meaning corrected.** The memory is written by the same model from its own runs, not by a stronger author. As a share of the failures left, the gain does not shrink (7.0 % against 7.4 %). Only the absolute points and the step cut shrink (9.2 % against 6.2 %).
- KS design: invalidation triggers are footprint, dependency or platform, recipe, runner, scrub version, refutation, supersession, doc and anchor changes (L340). The original solve's model id is stored (L247) and every lookup's model id is logged (L291). Neither is an invalidation trigger. **Confirmed.**

### Could not check

- The "value half-life of 3 to 8 months" (D5). It rests on two cross-tier analogs (one with self-written memory, one abstract only), not on release-to-release data. My own reworking of the same inputs gives about 2 to 11 months. It is an order of magnitude, not a measurement.
- S, the solve cost a hit avoids. No June or July transcripts are on this PC (they start in late October). No historical prior exists, as the design says.
- Whether Sonnet 5.5 beats Opus 4.8 (June's author) on this repository's work. No benchmark reports both on the same version.

## 2. Trying to dissolve it

**Attack 1: most of the library is facts, and facts do not depreciate with models.**
Partly works. About 35 % of seed rows and half the historical repeats are facts. Facts lose value only on the vendor clock: Expo ships three SDKs a year, and the W2 negatives invalidate on an SDK upgrade. But facts are tier-neutral. Opus lacks them as much as Sonnet. So they support E1 and do nothing for E3. The part that could carry a tier gap is the re-derivable 59 %, and that is the part each new reader needs less.

**Attack 2: for E1, a stronger reader still pays tokens to re-derive.**
Works for E1. The claim "worth only what its reader cannot work out alone" is right for accuracy (E3) and wrong for tokens (E1). In tokens an entry is worth what re-deriving would cost. Newer models cut that cost, but they cut the no-library baseline by about the same factor (about 25 % fewer tokens from Opus 5 to 5.5, vendor). The library's *percentage* saving falls only if its relative step cut falls. The one analog says by about a third per tier step (9.2 % to 6.2 %). That erodes E1; it does not collapse it. **What kills E1 payback is how rare hits are, not the release clock.**

**Attack 3: the "inversion" (June's author weaker than November's reader).**
Mostly dissolves for gated entries. A lead-capable entry's authority is its control pair (`fails_at` / `passes_at`) and a check run on today's code, not its author's reasoning. Author strength matters only for prose and candidate entries, where a weaker author's wrong diagnosis can anchor a stronger reader (ClashEval: over 60 % adoption of wrong retrieved content). That is a small residual.

**Attack 4: tagging entries with their model is trivial.**
True. The model id is already stored. Turning it into a rule ("a reader newer than the author sees the hit as a candidate") is a small change. But a tag prevents misplaced trust; it does not restore value. Restoring value means re-validation per reader model (the proponent's "admission per model"). No cause in this history recurred a third time, so there are no held-out instances. Re-validation must replay the original instance at `fails_at`, once per entry per release. At a few to 20 M tokens per replay arm, a 100-entry corpus costs about 1 to 4 B tokens per release [D on guessed replay sizes], the same order as or above the build. Lazy re-validation at hit time doubles the cost of each hit. So it is a trade, not a fix.

**Attack 5: proof is small-sample reality, not a design flaw; use a better test or a cheap proxy.**
Partly works.
- A Wald sequential test at KS-9 (5 % against 15 %) stops after **30 encounters on average (median 25, 90th percentile 58)** instead of a fixed 52. At a pace of 20 encounters per 8 weeks that is about 84 days, inside one release (90 to 141 days). So "proof of the hit rate is longer than a release" holds for the fixed test, not for a sequential one. It still never completes at today's pace of about zero.
- The zero-token replay of history (KS-0) gives a prior for the hit rate. It cannot give S or the reader effect.
- Replaying the historical second occurrences on today's Sonnet, with and without the entry, can show a *large* per-hit effect cheaply (six of six in favour is p = 0.016 by sign test). But only two or three of the six pairs run on the dev box (mypy, the ORM registry import, the press-race guard). The Expo and EAS ones need a device or a cloud build. Three pairs give an anecdote, not a rate.
- E3 parity cannot be shown at all here. 140 task commits are the whole history. They prove parity only within ±11 to 14 points. New tasks arrive at the product commit rate, about zero.
This is not a design defect. No design changes the encounter rate of one developer's young repository. It is a hard limit on what the owner can know, and it is not easily solved.

**Attack 6: the proponent's best form pays back faster through recipes.**
Unproven either way. Recipes on build slices could produce a hit per covered slice, far more often than solved-problem repeats. But the 6 to 18 % saving the proponent defends rests on guessed coverage and step cuts. The clinic's month of trials found no measurable gain from context machinery, and the graph sample found 0 of 200 steps likely saved. Recipes are plans, so they also depreciate as readers plan better. And the checks part of that saving belongs to CI, not to lookups. This does not rescue the solved-problem lookup; it is a different product.

**Attack 7: give up "Sonnet instead of Opus" for a cascade.**
Run Sonnet first, let tests and the Opus review hold quality, escalate on failure, and measure only cost. Cost differences on paired tasks need far fewer tasks than an equivalence proof. This dissolves the proof problem for E3, but by giving up E3 as stated: Opus stays in the loop.

## 3. What survives

1. **E3 depreciates; E1 mostly does not.** The re-derivable share (about 60 % of seed rows) is the only part that could let a cheaper model act like the top one. Each new mid tier needs it less. The fact share (about 35 %) helps every tier equally, so it closes no gap. The release clock is fast on tool and terminal work. It is slow on merge-quality work (Sonnet +3.8 on FrontierCode per release, still 8.2 behind), but D3 shows that is where entries do not exist.
2. **Payback of the solved-problem lookup is long, for a reason that is not the release clock.** A build of ten sessions needs 10 to 80 verified hits at 20 M tokens a hit (10 to 25 at the generous W; 77 to 81 at the measured W). History offered at most 2.7 candidate repeats a month at peak build pace, none came back a third time, and the pace is about zero since August.
3. **Proof.** The hit rate needs about 25 to 60 encounters (sequential to fixed); that is about one release at the design's checkpoint pace and never at today's pace. E3 parity cannot be shown on this repository at all.

What dissolved: the model-change invalidation gap as a correctness issue (for gated entries nothing becomes wrong, only less needed; the tag is already stored); the inversion for gated entries; "the hit-rate proof is necessarily longer than a release" (a sequential test fits); the "20 M only" condition in the payback; the mixed 220-to-1,440 range.

## 4. Restated (under 90 words)

What could let Sonnet stand in for Opus is conclusions about this repository's code (60 % of seed entries). Each new mid-tier model needs them less; the vendor and device facts help every model equally, so close no gap. The core lookup repays a ten-session build only after 10 to 80 hits, even at 20 million tokens a hit; history gave at most 2.7 repeats a month, about zero since August. And 140 tasks prove Sonnet-Opus parity only within ±11 to 14 points, wider than the 2-to-8-point gap.

## 5. What the owner can do

- Cheap: make the stored model id a rule (a newer reader sees an older author's hit as a candidate). Replace KS-9's fixed "3 hits in 20" with a sequential stop rule (about 25 to 30 encounters on average).
- Moderate: before building, replay the two or three historical repeats that run on the dev box with today's Sonnet, with and without the entry. That shows whether the mid tier still needs such entries, for tens to a few hundred million tokens.
- Trades: build minimal (structured notes plus grep, about one session) and give up the gate and staleness machinery. Or run a Sonnet-then-Opus cascade held by tests and review and measure cost only, giving up "Sonnet instead of Opus".
- Nothing within this design makes E3 parity provable on this repository.
