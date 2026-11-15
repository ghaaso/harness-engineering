# R9 refute: the trust a cheaper reader needs costs more per entry than the entry saves, and use cannot clean the store

Verdict: **narrowed**. Confidence 0.75.

Tags: [M] measured by me today, [R] read from a source and not re-derived, [D] arithmetic on tagged inputs, [E] estimate, [G] guess.

Scripts (all read-only, in this folder):
- `R9-git.cjs` → `R9-git.json`: fix commits on `main`, the five same-cause pairs, guards, a crude strict-write-rule classifier.
- `R9-tx.cjs` → `R9-tx.json`: 1,109 FixFlow transcripts, 14,293 calls. Context at `git commit` calls and memory-note writes; fresh-agent sizes; date range.
- `R9-econ.cjs` → `R9-econ.out.txt`: the arithmetic below.

Unit: context tokens processed, mostly cache reads (the owner's unit, F3).

## 1. Numbers

### 1.1 Uses per entry. Issue: 0.04 to 0.27. **Corrected: about 0.06 to 0.14, of which 0.02 to 0.05 gate-verified.** [M, D]

My own git pass over `main` (233 non-merge commits, 2026-05-31 to 2026-08-03, 63.8 days):
- 50 fix commits (subjects `fix` or `@ fix`). Same as D7.
- The five pairs, gaps re-derived: expo-audio 5.2 h, `NoReferencedTableError` 7.9 h, mypy 31.6 h, press race 154.6 h, SDK-52 pins 545.8 h.
- Policy "record every fix": 50 entries, 3 to 5 hits (3 ops lens, 5 repo lens) → 0.06 to 0.10. Gate-verifiable hits 1 to 2 → 0.02 to 0.04.
- Policy "KS strict rule" (L452: escalation, two failed approaches, burned build or deploy). A keyword classifier over commit bodies flags 22 of 50. Of the five pairs, only three first commits meet the rule: `b7a5b98` (burned EAS build), `789d522` (press race), `dbb3661` (expo-audio). `75b51f9` (mypy) and `2f09cec` (a script crash) do not. So 3 hits in about 22 entries → 0.14. One is gate-verifiable (the pin) → 0.045.
- D7's top end, 0.27, assumed 4 hits among 15 entries. At most 3 of the 5 firsts meet the strict rule, so the top end is too generous.
- Caveat: a keyword classifier is crude. D7 guessed 15 to 25 strict entries; 22 sits inside that.

"Each cause recurred at most once before its guard landed": [R] from F2 and D2. I confirmed the second commit ships a test or CI config for two pairs (`f29f62f` test, `6928828` Dependabot ignore). The other three ended with a library swap, CI that already guarded, or no possible guard (no screen-test harness). I did not search for third occurrences.

### 1.2 Cost to write one strict entry. Issue: 0.9 to 2.6M, not 5 to 10k plus 2 to 4k. **Corrected: about 0.4 to 3.8M, centre about 1M.** [M inputs, D, G on turn counts]

Measured inputs (Oct 31 to Nov 12 transcripts; these are harness and docs sessions, a proxy for a fix session):
- Caller context at a `git commit` call: workflow agents median 204k (p25 129k); main sessions median 544k (p25 402k). Fix-subject commits median 430k. D7 used 125k to 306k, which is low.
- A fresh subagent's first call: median 66k, p10 63.5k, minimum 35k. So a "small fresh agent" in this harness never starts small.
- Whole agent windows: p10 0.20M (3 calls), p25 0.28M (4 calls), median 0.53M (7 calls), mean 1.59M.
- After a commit call the window runs a median 19 more calls (p25 8). Carrying a 1 to 2k record over them adds about 20 to 40k. Negligible.

Charging the re-reads is right. Each extra turn is a new call that re-reads the whole window. Under the owner's unit that is the marginal cost. S (the solve avoided) is counted in the same unit, so the ratio holds whatever weight cache reads get.

Lean form (record, capture and control chained in one or two extra turns; reviewer as a 3 to 7 call fresh agent): 0.40 to 1.62M. Heavy form (D7's 4 to 6 author turns at measured contexts): 1.09 to 3.79M. The design's 7 to 14k is about 30 times below even the lean low end. KS L476 itself says the round trip "dominates", then gives an output-sized figure. Its fresh-subagent variant counts one 63k call; the median agent makes 7.

### 1.3 Break-even formula has no per-entry write term. **Confirmed, and easily fixed.** [R]

KS L690: net saving = h·(S − L_hit) − (1 − h)·L_miss − W/E, with W the build. No per-entry write term. V2 L93 names "cost of writing" without a figure (F3 §7). Adding the term, and logging write verbs' cache tokens as the lookup log already does, costs nothing. This part is not a bottleneck. The number it would hold is.

### 1.4 Write spend per useful use. Issue (via D7): 3.3 to 16M per use with candidates. **Corrected: 3 to 63M, centre about 10M (1M per entry at 0.1 uses).** Per verified use 9 to 190M. [D]

S, the top-tier solve a hit avoids: **could not check.** The transcripts on this PC cover 2026-10-31 to 2026-11-12. The fix history is 2026-05-31 to 2026-08-03. F2 says S has no historical prior. D7's 1.5 to 7.5M is a guess. A fix in a main session at 430 to 544k per call, 10 to 30 calls, would be 4 to 16M [E].

So a plain strict entry sits **near break-even, sign unknown**. "Costs more than it saves" is not shown for the plain entry.

### 1.5 Guard cost 0.4 to 1.5M. [R] Not re-derived; same turn guesses. 29 of 50 fix commits ship a test file [M, matches D7].

### 1.6 "About 80 % of the worked examples lack a mechanical check without Docker." **Confirmed by reading.** [R]

KS L281, L495, L604: after splitting ex1 into two and ex2 into three, plus four CLAUDE.md traps, about 15 example entries. Lead-capable without Docker: ex7, ex2a, ex8 (3 of 15, so 80 % without). With Docker, ex1's two siblings, ex5 and ex6 join (60 % without). The wider seed adds 21 traps and about 60 negatives (L495), "few of which record a tried-and-abandoned fix".

### 1.7 "The gates published work shows make memory safe all learn from many uses of each entry." **Refuted as stated.**

- vCache: per-entry thresholds learned from a stream of queries. Yes, many uses [R, F5 D1].
- AgentBrew: I opened the paper. Validation "re-rolls" the student "on the failed task with a candidate note staged in memory"; the note is kept if a re-attempt succeeds, judged by the environment's terminal reward. One source task, not held-out tasks, not many uses. This is the one study where a student matched its teacher (51.6 against 50.0, 64 tasks).
- Xiong et al.: strict admission is a write-time check per record (ground truth standing in for a human). It beat add-all [R, F5 A1].
- Ghosh et al.: abstract only. How many trials per memory its measured-gain gate needs: could not check.

So the literature's working recipe is a cheap per-entry check at write time plus a store-level test over many tasks. It is not per-entry certification from use. The issue's part (a) attacks a requirement the literature does not set.

### 1.8 The Sentry example. **Confirmed, with two corrections.** [M, git]

- `6928828` (2026-06-26, Opus 4.8): the plugin "wires a Sentry gradle step needing org/project/auth we haven't configured… re-add the plugin only once a Sentry project + auth token exist."
- `140428c` (2026-07-18, Fable 5) put the rule into CLAUDE.md: "never add the Sentry Expo config plugin to app.json — it breaks the gradle build". The condition is gone. This is the commit that dropped it.
- `a31924a` (#176, 2026-08-03, Opus 5) wired the DSN and kept the plugin out, citing the CLAUDE.md trap. It validated the DSN against a real Sentry project. It ran "no wizard"; the commit does not show an auth token.
- CLAUDE.md still carries the unconditional rule today, about four months on.

Corrections. (1) The drop happened in an always-loaded prose file, not in a store. A store entry that keeps its source link and a condition field would have carried the condition. (2) Whether #176's choice was wrong is not shown: the project existed, the auth token is not in evidence. What is shown: a top-tier reader obeyed the rule without its condition, and nothing in four months of use re-tested it.

## 2. Trying to dissolve it (the proponent's side)

| Fix | Result |
| --- | --- |
| Record in the fixing turn, reviewer as a 3-call fresh agent | Entry falls to about 0.4M. Break-even S about 3 to 10M per use. Inside the plausible S range. Dissolves "a strict entry costs more than it saves". Buys no trust. |
| Cascade, not trust (P best form): a cheap reader acts only on a gate-verified lead; tests decide; a failure escalates to Opus | **Dissolves part (a) for gated positive actions.** A wrong hit costs one cheap attempt plus an escalation. No per-entry certificate is needed. Covers 3 of about 15 worked examples without Docker, 6 with. |
| One AgentBrew-style replay per entry per reader model (the cheap published gate) | 0.53 to 1.59M per entry per reader model [D]; 3.5 to 32M per use at 0.05 to 0.15 uses. It tests only the entry's own case, never "same symptom, other cause" (KS-C7: templates with two or three causes). |
| Full with-and-without, k = 5, own case plus a different-cause case | 10.6 to 31.8M per entry per reader model; 70 to 635M per use [D]. Far above any plausible S. |
| Store-level probe trial (KS-5 style, 40 to 60 probes, both arms) | About 62 to 250M per reader model [E: 0.5 to 1M to author each probe, G]. Gives a pooled bound (0 in 40 means 7.5 % or less), not per-entry trust. Probes are written by a model that knows the answers. Sonnet releases came every 3 to 5 months (F6). |
| Recipes and other type-level entries | **Escape the argument.** Shapes recur 18 to 48 times (P: full slice shape 18, migrations 48). Uses per entry are high, so trust can come from use. R9 holds only for instance-level entries. |
| Condition field plus source link on every prohibition and negative | Fixes the Sentry-type drift cheaply. Does not create a channel that tests the rule. |
| Scheduled top-tier re-test of prohibitions | Affordable for the few always-loaded or pushed ones (about 21 traps plus 4 CLAUDE.md traps, 0.5 to 1.6M each plus a build where needed). Not for about 60 negatives: one re-test (0.53 to 1.59M) exceeds a negative's lifetime saving of about 0.05 to 0.75M at 0.06 to 0.14 uses [E: a saved dead end worth 1 to 5M, G]. |
| Make every negative executable | Then it is a test, at guard cost. Argued exclusions and design judgement cannot be. |
| Low use bounds harm | True, and it cuts both ways. A wrong negative consulted 0.1 times does little damage. But its correctness cannot be known, and the cheaper reader is the more compliant one (ClashEval: wrong retrieved content adopted over a correct prior more than 60 % of the time). |
| A/B attribution of candidate outcomes | One extra run for deterministic local tests. A build each for EAS, device and deploy symptoms; several for flaky classes (67.73 % of rerun builds flaky, F2). Survives for the build and deploy class. |

## 3. What survives

1. **Ungated content cannot be validated, by use or affordably on purpose.** Negatives, prohibitions and judgement calls (about 80 % of the worked examples at pilot time, plus about 60 negatives) are never tested in use: a prohibition stops the one experiment that could refute it. Testing one on purpose costs an agent run (0.5 to 1.6M) or a build, more than its lifetime saving at 0.06 to 0.14 uses. So that content reaches a cheaper reader on top-tier say-so. This is the content E3 most relies on, because gated content is what CI absorbs.
2. **Writing is not near free.** 0.4 to 3.8M processed tokens per strict entry, about 10M per useful use at the centre, against an unmeasured S. Plain strict entries are near break-even, sign unknown.

What dissolved: the need for per-entry certification for gated positive actions (cascade); the claim that published gates all need many uses (AgentBrew, Xiong); the missing write term as a bottleneck (easy to add); type-level entries (they get many uses).

## 4. Restated (under 90 words)

The cache's untestable part (warnings like "don't do X" or "Y won't work", and judgement calls) is most of what it holds, and nothing in normal use checks it. Obeying a warning skips the experiment that could prove it wrong. Each entry is consulted about 0.06 to 0.14 times. Checking one on purpose costs a full agent run, likely more than it saves. So a cheaper model gets this advice unverified. A strict entry costs 0.4 to 3.8 million tokens to write, not the 7 to 14 thousand stated.

## 5. What the owner can do

- Let a cheaper reader act only on gate-verified entries, and show negatives and prohibitions to Opus only. Cost: coverage (3 of about 15 worked examples are usable without Docker, 6 with).
- Store a condition field and source link on every prohibition, and re-test the always-loaded or pushed ones on a schedule. About 25 rules at 0.5 to 1.6M each plus builds. Leave the roughly 60 negatives as advice.
- Add the per-entry write term and log the write verbs' cache tokens. Free; it settles 1.2 and 1.4 at KS-9.
- Prefer a guard in the fixing PR (29 of 50 fixes already ship a test).
- For E3 evidence on the ungated share: a store-level probe trial per reader model, about 62 to 250M [E]. It buys a pooled bound, not trust in any one entry.
