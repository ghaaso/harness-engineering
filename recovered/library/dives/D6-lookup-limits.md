# D6. Can lookups be made accurate and efficient by optimisation (E5)? What that caps in E1 and E3

Area: E5, "with proper optimisation the lookups are accurate and efficient", and what its limits cap in E1 (tokens) and E3 (Sonnet as good as Opus).

Tags: [M] measured (by me today, or in the fact base), [D] arithmetic on tagged inputs, [V] vendor-reported, [A] argument only, [G] guess.

## Terms

- **Pull**: the agent decides to ask (runs `ks lookup`). **Push**: something other than the agent's judgement fires the lookup (a hook script on an edit, an error or a read) and injects the answer.
- **Instance-level entry**: a conclusion about one problem (this defect, this hazard, this file's trap). **Type-level entry**: a recipe for a kind of work (add a migration, add a slice).
- **Base rate**: how often the thing an entry warns about really recurs, per unit of work.
- **Union warning rate**: share of PRs on which at least one entry fires. The KS pilot ceiling is 10 % (KS L707).
- **Precision**: share of fires that were real. **Recall**: share of real recurrences that fired.
- **Rule of three**: zero failures in n trials bounds the failure rate at about 3/n (95 %).

## 1. Bottom line

Ranking is the part optimisation can fix, and the owner is right about it: vocabulary misses are rare here, and hybrid retrieval handles paraphrase. Cost per lookup can also be fixed: a hook script costs nothing on a miss. Two limits are left, and neither is about ranking.

1. **Push is pinned near the base rate.** The only channel that reaches problems an agent does not notice is push. Its keys (identifiers, paths, error templates) recur for many reasons in a small, busy codebase. Replayed on this repository's 154 first-parent PRs, every handle policy I tried gave 3-4 % precision. Widening handles bought recall only at union rates of 57-88 %. The union passes the owner's 10 % ceiling at about 10-20 entries. Getting precision up needs a top-tier judge on each fire, or a check, which is a CI test.
2. **Acceptance accuracy cannot be gated, or even measured, per entry.** The gates with evidence behind them (a measured with-and-without gain per memory; per-entry learned thresholds) need many uses of each entry. Here each cause recurred once before a guard landed, and footprints change within days. So for the entries without a mechanical check (about 80 % of the worked examples without Docker), whether a hit applies is the reader's judgement, and its accuracy is unknowable at this volume.

Together: "accurate" lookups exist only where a mechanical check or a top-tier judge decides. That caps E3, because the decision left to the cheap model is the judgement it lacks, and it makes E5 unknowable for most entries.

## 2. New measurements (read-only, today)

### 2a. When does an instance-level key exist? (`d6-keytiming.cjs`)

For each recorded window: where do lookup-only calls fall relative to the first edit (Edit/Write tools) and the first tool error? Lookup rules are D1's (strict = `runs.cjs`; loose = `runs-loose.cjs`, which reproduces D1's e = 0.451 Clinic and 0.565 FixFlow).

| Share of lookup-only tokens | Clinic strict | Clinic loose | FixFlow strict | FixFlow loose |
| --- | --- | --- | --- | --- |
| Before the first edit, or in windows that never edit | 34-45 % | 35 % | 72 % | 82 % |
| ... of which in windows that never edit | 19-30 % | 25 % | 48 % | 63 % |
| Before the first tool error, or in windows with none | 43 % | 34 % | 72 % | 72 % |
| Median context at window start / at first edit | 55k / 145-196k | | 64k / 108-144k | |

Clinic: 180 windows, 15,915 calls. FixFlow store: 532 windows, about 7,300 calls. Strict/loose ranges also vary whether Bash writes count as edits.

Reading: in the build testbed most exploration (55-66 %) happens after an edit or error exists, so a hook keyed on edits and errors has a key in hand for it. In the many-agent repository most exploration is in read-only discovery and review windows, keyed only by the brief.

### 2b. Push precision on this repository's history (`d6-union.cjs`)

Entries synthesised from the 38 fix PRs on main (first-parent). Each takes its K rarest identifiers on its own `-U0` changed code lines that recur in 1 to 7 other PRs: every handle passes the design's own 5 % selectivity gate (KS L262). Replayed over all 154 first-parent PRs. "True" = the entry from the first PR of a known same-cause pair (F2, KS-C10) fires on the second; 4 of the 5 pairs are evaluable.

| Handles per entry | Mean per-entry fire rate | Union at 5 / 10 / 15 / 20 / 38 entries | True pairs caught | Precision at 38 |
| --- | --- | --- | --- | --- |
| 1 | 0.7 % | 3.2 / 6.5 / 8.4 / 11.0 / 16.2 % | 1 of 4 | 1/25 = 4.0 % |
| 3 | 1.5 % | 5.8 / 11.7 / 16.9 / 22.1 / 31.8 % | 2 of 4 | 2/49 = 4.1 % |
| 10 | 4.2 % | 13.0 / 27.9 / 37.7 / 44.8 / 57.1 % | 3 of 4 | 3/88 = 3.4 % |
| all gate-passing | 48 % | 84 / 86 / 86 / 87 / 88 % | 4 of 4 | 4/136 = 2.9 % |

Caveats: synthetic entries; the design wants author-named handles, but the refuters' hand-picked high-specificity 15-entry seed fired on 44 of 154 PRs (28.6 %), or 27 (17.5 %) without whole-file preconditions, which is no better than K = 1 to 3 here. Four true pairs is a tiny sample. A fire on a PR that touches a hazard area without re-breaking it may still be a useful reminder; the KS pilot counts it as a false fire, and so do I.

## 3. The lead, point by point

| Lead | Verdict | Why |
| --- | --- | --- |
| (i) The agent must know to ask, and what to ask | **Partly dissolves.** | A hook on edits and errors removes "knowing to ask". Timing is not the binding limit in build sessions: 55-66 % of Clinic exploration tokens come after an edit or error exists [M, 2a]. What is left is how well that key picks the right entry (Issue 1), plus the brief-only share (34-45 % Clinic, 72-82 % FixFlow), which only type-level entries or question-level repeats can serve (D1's C1 oracle: rh ≤ 0.16). Pull for silent problems stays gated by the agent's own doubt, and agents are overconfident (22 % actual vs 77 % predicted; D3 covers this). |
| (ii) Push fills windows and has null evidence | **Volume dissolves; accuracy stands.** | Hit-only injection is small: at most 860 tokens, carried at about 0.73 of a call (D1). The AGENTS.md evidence is about always-loaded files, not hit-only injection. What stands is precision (Issue 1). |
| (iii) Fuzzy keys: overlapping scores, k > 1 worse, similarity and judges at chance, only with-and-without gating works | **Stands, but not where the lead put it.** | For entries with a discriminating check, retrieval only proposes and the check decides, so overlap costs check runs, not accuracy. For the rest, the gate that works needs per-entry data this workload never makes (Issue 2). Even mechanical keys (identifiers) show the overlap: 3-4 % precision whatever the threshold [M, 2b]. |
| (iv) Ask before exploring in a 519-call session: most lookups miss, each a full-window call | **Dissolves.** | A hook script does the retrieval: no model turn on a miss (D1 case A3). Its cost moves to false injections (Issue 1). |
| (v) Accuracy comes from verification, which costs and proves the condition, not the cause | **Admitted (KS §9 limit 4); folded into Issue 2.** | The new consequence is in Issue 2: verification exists only for mechanically decidable causes. |

## 4. Issue 1. Push precision is pinned near the base rate, and the union rises with every entry

**Claim.** The channel that reaches problems an agent does not notice is push. Its mechanical keys recur in unrelated work far more often than the cause recurs. On this repository every handle policy gave 3-4 % precision, and the union passes the 10 % ceiling at about 10-20 entries. Higher precision needs a top-tier judge per fire, or a check that belongs in CI.

**Mechanism.**
- The base rate is low: 3 to 5 same-cause recurrences in 154 first-parent PRs over 65 days, about 2-3 % of PRs [M, F2].
- Identifiers recur for many reasons. Even the single rarest identifier of a fix that recurs at all (K = 1) recurred in an unrelated PR 24 times out of 25.
- Precision is at most true fires over all fires. At the owner's own 10 % ceiling (about 15 fires in 154 PRs), even perfect recall gives at most 3-5/15, so 19-32 %.
- The union grows with the number of entries, because each entry adds its own unrelated recurrences. To hold 10 % at N entries each entry may fire on at most 1 − 0.9^(1/N) of PRs: 0.7 % at 15, 0.28 % at 38, 0.08 % at 133 (v2's guessed steady state) [D]. The measured floor for a key that can fire at all is 0.65 % (one recurrence in 153 PRs).
- So a library growing toward v2's steady state must either print warnings on most PRs or catch almost nothing.

**Best fixes tried.**
| Fix | Result |
| --- | --- |
| Hand-picked, distinctive handles instead of mechanical ones | Fails. The refuters' high-specificity 15-entry seed fired on 17.5-28.6 % of PRs, no better than K = 1-3 here [M]. |
| Selectivity gate (refuse handles above 5 %) | Partly; already in my replay. It bounds each entry, not the union. |
| Zero-token check in a side process before anything is shown | Dissolves for entries whose cause is a config or dependency value (one of the 4 pairs, the Expo pin, was that class). Those are the entries CI absorbs (D2 Issue 1). |
| Learned relevance model | Fails. 3-5 positives in the whole history. The data-rich case, Google's Graph2Diff, reached 61 % precision at 46 % coverage on 500k+ build errors [F2]. |
| LLM filter on each fire | Partly. To reach 50 % precision it must reject about 96 % of fires and keep the real ones. Similarity and LLM judges ranked harmful memories no better than chance (Ghosh, abstract). The judge that works is the Opus reviewer the design already pays on every warning. A cheap judge brings back the E3 question. Unmeasured here. |
| Stay pull-only for silent hazards | Fails as a fix. It trades precision for recall gated by the agent noticing, and agents are overconfident (22 % actual vs 77 % predicted; D3). |
| Typed keys (config pointer, dependency version) | Dissolves, for that class. 12 PRs fired on the ex7/ex8 config pointers, which the refuter called precise. Same class as the zero-token check. |

**Residual.** A push channel for instance-level entries is about 4 % precise at this repository's base rate, and it gets worse as entries are added. Accuracy above about a third needs either a check (CI, so the entry leaves) or a top-tier judge on every fire. Both ends of the trade: recall of unnoticed problems against warnings that are mostly wrong.

**What it caps.**
- E5: caps the precision of pushed hits at about 4 % [M], at most 19-32 % even at the 10 % ceiling with perfect recall [D].
- E3: the one channel that reaches what a cheaper model misses delivers about 25 wrong warnings per right one. Sorting them is top-tier judgement.
- E1: raises cost. D1's case A3 (hook push, 13 % net) assumes the hook injects only true hits. Each false injection costs about 0.73 of a call in carry (D1). At 4 % precision that is about 18 call-equivalents per useful hit, against the about 11 calls (Clinic) or 21 (FixFlow) one hit removes (D1's `mt`). Break-even precision for pushed exploration answers is 0.73/11 to 0.73/21, so 3.5-6.6 % [D]. This assumes the measured precision transfers from PR-level hazard keys to exploration keys; it may not. For path-keyed digests, relevance holds by construction (the agent is reading that file), and their open question is substitution (V2:87), not precision.

**Already in the design?** Partly. KS measured 48.7 % and 27-44 % and set the 10 % ceiling (L707, §12.8 KS-V1). It does not draw that the union grows with entries, that the base rate bounds precision, or the precision number.

**Falsifier.** On the 154-PR replay, an author-named seed of 40 or more entries, or a filter that spends no top-tier tokens, keeps the union at or below 10 % and catches at least 3 of the 4 evaluable same-cause pairs (precision about 25 % or better).

## 5. Issue 2. Acceptance accuracy cannot be gated, or even measured, per entry

**Claim.** The gates that work in the literature learn from many uses of each entry. Here each cause recurred once before its guard landed, footprints change within days, and about 20 encounters arrive per 8 weeks across all entries. For entries without a mechanical check, about 80 % of the worked examples, "does this hit apply" stays the reader's judgement, and its accuracy cannot be known.

**Mechanism.**
- Similarity and LLM judges ranked harmful memories no better than chance. Only a measured with-and-without gain worked as a gate (Ghosh, abstract) [F2, F5].
- vCache's per-entry learned thresholds cut error about 26-fold over static ones, but they learn from a stream of queries per entry. The benchmark had 60k queries, and error had not converged at 150k [F5].
- AgentBrew validated notes that each serve many tasks: one note was applied to 1,200 test tasks (55.6 % success when applied) [F6]. Type-level notes pool evidence. Instance-level entries do not.
- Here [M, F2, D2]:
  - every one of the 5 same-cause pairs ended with a structural guard at its second occurrence, so at most 1 re-encounter per cause;
  - 21 of 50 fix footprints changed within a day and 41 within 30 days, so the entry goes suspect again before a second use;
  - about 20 encounters per 8 weeks is the whole library's rate, about 0.15 per entry per window at 133 entries.
- By the rule of three, bounding one entry's harm rate below 10 % needs about 30 clean uses. That never happens here.
- The pooled gate falls back to a static threshold, where right and wrong hits overlap: vCache static at 2.5 % error and 37 % hits, up to 5.2 % error and 67 % hits, on chat queries [F5].
- Multi-cause keys make this worse. The templates here carry 2-3 causes, and a wrong-cause query scores full coverage (KS-C7) [F2]. With no check, showing one item is right about 1 time in 2-3. Showing more measurably hurts: ReasoningBank 49.7 at k = 1 against 44.4 at k = 4; SWE-Exp 42.0 against 39.0 [F4].

**Best fixes tried.**
| Fix | Result |
| --- | --- |
| Deterministic check per entry (the KS gate) | Dissolves for decidable causes: 3 of about 15 example entries without Docker (ex7, ex2a, ex8), 6 with Docker. Those are the ones that become CI tests and retire (D2 Issue 1). Even then the check proves a condition, not a cause (admitted). |
| Admission per model on a held-out instance (proponent's best form) | Partly. For an instance-level entry the held-out instance is its own reverted fix. That tests recall on the easy case. It never tests the harmful case, the same key with a different cause. One trial per entry gives no rate. Cost per model release, roughly 133 entries × 2 tiers × with and without ≈ 532 agent runs at about 1.3M tokens each ≈ 0.7B tokens. That is about a third of FixFlow's whole recorded 2.13B [D, the entry count is guessed]. Sonnet releases came every 3 to 5 months in 2025-26 [V, F6]. |
| Pool evidence across entries (one global learned gate) | Partly. It becomes a static threshold and inherits the overlap above. The data-rich case, Graph2Diff, reached 61 % precision at 46 % coverage. |
| Synthetic probes (KS-5 pilot, 40-60) | Partly. Bounds the pooled rate (0 in 40 means 7.5 % or less) on entries the corpus already holds. The design says pilot recall may not transfer. 20 live encounters cannot separate 5 % from 15 %. |
| Make entries type-level so evidence pools | Partly. That works for recipes (a handful of shapes, D2). A decidable class check is a lint (D2). |
| Send acceptance to Opus | Dissolves accuracy, but gives up the E3 and E1 saving. The design already does this inside Opus-reserved areas: "the store has saved the diagnosis, not the whole solve" (L444). |

**Residual.** For the judgement-needed majority of instance-level entries, nothing can learn or certify whether a hit applies at this workload's rate. Accuracy there is whatever the reader's judgement is, and it stays unmeasured per entry. Accurate acceptance exists only where a check or a top-tier reader decides.

**What it caps.**
- E5: unknowable for about 80 % of the worked examples (60 % with Docker) [D, KS L495]. Only a pooled bound of 7.5 % or less after 40 probes is reachable.
- E3: caps it. On those entries the cheap model must make the call (apply, or same symptom with another cause) that separates tiers (D3). Wrong retrieved content was adopted over a correct prior more than 60 % of the time across six top models (ClashEval) [F5].

**Already in the design?** Partly. It admits small-sample bounds (L546), uncalibrated thresholds, that pilot recall may not transfer, and caps code-behaviour entries at candidate (L272, L545). It does not draw that the evidence-backed gate cannot be fed per entry, or that an admission replay tests only the original instance.

**Falsifier.** A gate fed only by data at this workload's rate (at most 1 re-encounter per cause) decides, with 90 % accuracy or better, whether candidate entries apply. It is scored on held-out probes with the same symptom and a different cause, read by a Sonnet-class agent. Or the prospective log shows entries reaching 3 or more re-encounters before their guard lands.

## 6. What each best-form technique caps

| Technique | Share of relevant entries ever surfaced | Floor on wrong hits | Cost per useful hit |
| --- | --- | --- | --- |
| Hybrid retrieval (lexical + embeddings + rerank) | Raises it a little: vocabulary misses are rare here (E[k] 0.01-0.2 per window; 5.1 % of duplicate bug reports share no terms in both fields) | No change: the overlap is in the key, not the ranker (identifier keys 3-4 % precise) | Small; a local model spends no tokens |
| Learned gating | n/a | Cannot be trained here (3-5 positives; at most 1 use per entry). Data-rich ceiling: 61 % precision at 46 % coverage | n/a |
| Hook that looks up on edits and errors | Removes "knowing to ask"; a key exists for 55-66 % of Clinic exploration tokens, 18-28 % in FixFlow | Pinned near the base rate: 3-4 % [M] | Miss is free; each false injection about 0.73 of a call |
| Side-process retrieval (no main-session tokens) | No change | No change unless it runs a check | Removes the miss tax (D1: from 9.5-12 % per turn to 0) |
| Typed keys (error template + tool + phase; config pointer; dependency version) | Good for errors and config | Multi-cause templates stay (2-3 causes); precise for config and dependency values, which are CI material | Low |

## 7. Dissolved or not mine

- Ranking quality and vocabulary mismatch: solvable and small here.
- Miss tax of pulled lookups: dissolved by a hook script (D1 A3).
- Push volume filling windows: dissolved for hit-only injection.
- Timing of the key in build sessions: mostly dissolved [M, 2a].
- "Checkable entries leave for CI" (D2 Issue 1) and "the tier gap is where nothing is cached" (D3): used, not repeated.

## 8. New angles

- The zero-token replay V2:88 should replay a push hook too. Run the recorded windows' edits, reads and errors against a seed, and count fires per useful fire. My PR-level replay is the first data point (3-4 %).
- Measure an LLM relevance filter's specificity on the 154-PR replay: a cheap model against Opus, with the 4 evaluable pairs as positives. That settles whether push precision can rise without the top model.
- For the brief-only exploration (72-82 % of FixFlow exploration tokens), the key is the orchestrator's question. A question-level cache sits under D1's C1 ceiling (16 % of tokens).

## Files

- Scripts: `d6-keytiming.cjs`, `d6-union.cjs` (this folder).
- Outputs: `d6-keytiming-clinic.json`, `d6-keytiming-clinic-strict.json`, `d6-keytiming-clinic-loose.json`, `d6-keytiming-fixflow.json`, `d6-keytiming-fixflow-loose.json`, `d6-union.json` (K = 3), `d6-union-K1.json`, `d6-union-K10.json`, `d6-union-K1000.json`.
