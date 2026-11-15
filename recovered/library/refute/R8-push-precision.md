# R8 refuter: "the only channel that reaches what an agent does not notice is push, and push is mostly wrong"

Verdict: **narrowed**. Confidence about 0.7.

What survives: a warning pushed from a code diff for a hazard that no mechanical check can decide is usually wrong. Over 154 first-parent PRs it was right about 1 time in 8 to 1 in 25 (best estimate). The warning rate rises as such entries pile up. Every fire needs a judge, and nobody knows whether a cheap model can be that judge.

What falls:
- "3 to 4 % for every policy" is too low. D6's replay let entries fire on PRs merged before the entry existed (66-71 % of its fires), and it took hashes from a lockfile. Replayed forward only, precision is 4 to 12.5 %.
- "53 % at 50 entries, 86 % at 133" holds for one policy (K = 3). Old entries go quiet. Projected from their own fire rates, the more selective policies reach 16-51 % at 133 entries.
- "Capped at 19-32 %" holds only for a library that uses the whole 10 % warning budget. The five repeats fall in 4 PRs, so the PR-level ceiling is 26 %.
- The E1 harm is not supported for hazard warnings. D6's break-even was for pushed exploration answers, and nobody measured that channel's precision.
- "Push is mostly wrong" is too broad. Push keyed on an error is precise on about half of repeat errors. But those errors are noticed, and their messages already name the cause, so this does not reach silent hazards.

Scripts (all in this folder, read-only over the repository and transcripts):
- `r8-extract.cjs` writes `r8-prs.json`. It reads per-PR changed-line tokens and files from origin/main first-parent history.
- `r8-replay.cjs` writes `r8-replay.json`. It replays 11 handle policies.
- `r8-stats.cjs` computes intervals, projections, the judge arithmetic and the base-rate scaling.
- `r8-errscan.cjs` writes `r8-errors.jsonl`. It collects every errored tool call in `~/.claude/projects`, with the next call that followed it.
- `r8-errtmpl.cjs` and `r8-errclass.cjs` write `r8-errtmpl.json` and `r8-errclass.json`. They group errors into templates and classify them.

## 1. What D6's replay did (read before trusting it)

`d6-union.cjs`:
- It builds one synthetic entry per fix PR on main (38 entries). Handles are the K rarest identifiers on the PR's `-U0` changed lines that recur in **1 to 7 other PRs** (the 5 % gate is 7 of 154).
- It replays each entry over **all** 154 PRs except its own, **earlier PRs included**.
- A fire counts as "true" only on the second PR of one of F2's five same-cause pairs.

Three artefacts:
1. **Fires backward in time.** An entry written at PR 98 cannot warn on PR 50. In my replica of D6's own policy, 29 of 41 fires (K = 1) and 61 of 92 (K = 3) landed on PRs before the entry existed. That is 66-71 % of fires. The selection rule causes it: "rarest identifier that recurs elsewhere" mostly picks old identifiers that recur in the past. Counting forward fires only, D6's own policies give 1/12 = 8.3 % (K = 1) and 2/31 = 6.5 % (K = 3), not 4 %.
2. **Peeks at the future.** The rule keeps only handles that will recur. An author at write time cannot know that.
3. **Lockfile hashes.** `SKIP` anchors `package-lock.json` at the repo root, so `technician-app/package-lock.json` is scanned. The Expo-pin pair's entry (b7a5b98) has integrity hashes as handles (`MKa3vbCAJtT3...`). An author would name the dependency version.

The entries are synthetic, as D6 says. The design wants author-named handles (KS L261).

## 2. My replay (`r8-replay.cjs`), forward only

- It uses the same 154 PRs (re-derived: 155 first-parent commits on origin/main, minus the root).
- My own tokenizer skips lockfiles anywhere and drops random-looking strings.
- Handles are chosen with **prior-only** document frequency (prior df of 7 or less over the last 150 PRs). They fire only on **later** PRs.
- The fix flag also matches `@ fix` subjects, which gives 41 fix PRs.
- "Symbol-ish" means the token has `_`, an internal capital or is ALL_CAPS. That is closer to the design's symbol, env-name and error-code handles.

| Policy | Fires | True | Precision | Wilson 95 % | Wrong per right | Forward union, library of 20-29 / 30+ entries | Pairs caught |
|---|---|---|---|---|---|---|---|
| D6 as published, K1 | 25 PRs | 1 | 4.0 % | 0.7-19.5 | 24 | (symmetric) | 1 of 4 |
| D6 replica K1, forward fires only | 12 | 1 | 8.3 % | 1.5-35 | 11 | 12 % / 18 % | 1 |
| D6 replica K3, forward fires only | 31 | 2 | 6.5 % | 1.8-21 | 14.5 | 30 % / 23 % | 2 |
| fwd K1, all tokens | 23 | 2 | 8.7 % | 2.4-27 | 10.5 | 22 % / 30 % | 2 |
| fwd K3, all tokens | 100 | 4 | 4.0 % | 1.6-9.8 | 24 | 63 % / 52 % | 4 |
| fwd K1, symbol-ish | 8 | 1 | 12.5 % | 2.2-47 | 7 | 11 % / 5 % | 1 |
| fwd K3, symbol-ish | 47 | 2 | 4.3 % | 1.2-14 | 22.5 | 43 % / 40 % | 2 |
| fwd K3, symbol-ish, existing symbols only | 79 | 2 | 2.5 % | | 38 | 46 % / 40 % | 2 |
| fwd K3, symbol-ish, removed lines | 73 | 1 | 1.4 % | | 72 | 57 % / 35 % | 1 |
| fwd K5, symbol-ish, AND of 2 or more | 20 | 2 | 10 % | 2.8-30 | 9 | 29 % / 15 % | 2 |
| fwd K10, symbol-ish, AND of 3 or more | 20 | 1 | 5 % | 0.9-24 | 19 | 9 % / 25 % | 1 |
| fwd file overlap (the design forbids it; reference only) | 451 | 3 | 0.7 % | | 150 | 81 % / 74 % | 3 |

Reading:
- The best policies are right about 1 time in 8 to 1 in 10, on 1-2 true catches. Typical policies are right about 1 in 25. The intervals are wide: the whole positive set is 4 evaluable repeats.
- Conjunction (AND) handles help a little. They do not change the order of magnitude.
- Between 33 % and 86 % of the false fires touch a file the fix touched. Some of those might be useful reminders. The KS pilot counts them as false, and so do I. This cuts in the proponent's favour, but nobody can measure it.
- The true catches are mostly incidental:
  - Expo pin: caught through the plain word `native`. An author would use a dep_version key instead.
  - NoReferencedTableError: caught through `registry` and `metadata`.
  - expo-audio stop: same file and same day. The first fix was wrong.
  - Press-race sibling port: caught through shared expo-av API names (`setOnRecordingStatusUpdate`). Those names fire whenever recording code is touched.
  - The mypy pair is never caught by an identifier. CI catches it, and the error names its own cause.

### Union growth (re-derived by projection, not by D6's script)

Per-entry fire rate falls with age for the selective policies. These are rates per later PR:

| Policy | 1-5 PRs after | 6-20 | 21-60 | 61+ |
|---|---|---|---|---|
| fwd K1 all | 3.5 % | 1.1 % | 0.8 % | 0.27 % |
| fwd K1 symbol-ish | 2.1 % | 0 | 0.3 % | 0.13 % |
| fwd AND of 2 or more | 2.6 % | 1.2 % | 0.6 % | 0.54 % |
| fwd K3 all | 6.4 % | 4.2 % | 3.3 % | 4.4 % |

Projection uses independence with the old-entry (61+) rate:
- K1 symbol-ish (catches 1 of 4): 6 % at 50 entries, 16 % at 133.
- K1 all (2 of 4): 13 % and 30 %.
- AND of 2 or more (2 of 4): 24 % and 51 %.
- K3 symbol-ish (2 of 4): 64 % and 93 %.
- K3 all (4 of 4): 90 % and 100 %.

To hold 10 % at 133 entries, each entry may fire on at most 0.079 % of PRs. Every policy that catches at least half the known repeats is 3 to 56 times above that. So D6's 53 % and 86 % are one policy's numbers. The claim that the rate rises with every entry holds. The crossing point, measured forward, is about 10-30 entries (D6 said 10-20).

### Base-rate cap

F2 lists 5 same-cause pairs. They land in 4 distinct PRs, because two second occurrences share PR 113. At a union of exactly 10 % (15.4 PRs), perfect recall gives 3/15.4 to 5/15.4, which is 19.5-32.5 %. At PR level the most is 4/15.4 = 26 %. This is a ceiling **at** the 10 % budget, not a cap on precision. A library that warns on fewer PRs could do better, but no tested policy does that while catching more than 1 of 4.

### A higher repeat rate

With the same false fires and k times the true repeats, precision scales roughly with the repeat rate:
- At 2× it is 8-22 %.
- At 5× it is 17-42 %.

Here about 5 of 41 fix PRs (12 %) have a same-cause predecessor. A 2010 study is reported (second hand) to find 17-45 % of fixes "recurring", in a looser, shape-level sense. So a busier codebase with many peer components could lift diff-push precision toward a coin flip. The owner's other projects are similar small repositories, so nothing points to a much higher rate there. This is unmeasured.

## 3. Attack: push keyed on an error, not a diff (`r8-errscan.cjs`, `r8-errtmpl.cjs`, `r8-errclass.cjs`)

Data: every transcript store on this PC. That is 2,592 files and 66,022 tool calls, with 1,670 errored tool results. The key is the error's first meaningful line, with paths, numbers and quoted names masked. 131 templates recur across two or more sessions, which gives 1,079 repeat fires. I classed the templates by hand:

| Class | Repeat fires | Share | Does the key pick the cause? |
|---|---|---|---|
| Environment fact (python missing, pdftoppm, encoding, too-long names) | 384 | 35.6 % | Yes, one cause, and the message names it |
| Harness rule (read-before-write, file too large, path protected, user rejected) | 148 | 13.7 % | Yes, one cause, and the message names it |
| Slip (quote EOF, SyntaxError, string not found, KeyError, missing file) | 308 | 28.5 % | No: a different specific mistake each time |
| Transient (ECONNRESET, timeouts, session limit) | 139 | 12.9 % | No stable cause |
| Project code, test or build errors | 7 (+ about 7 TypeScript errors in Other) | about 1 % | Too rare to judge. KS-C7 found 2-3 causes per code template |
| Other | 93 | 8.6 % | Mixed |

Result:
- An error-keyed push is precise on about half of repeat errors.
- Those are machine and harness facts. They are not the top model's reasoning, and the message already names the cause (R3 reached the same finding by its own route).
- Errors that come from the project's own code almost never recur by template.
- Most important: an error is **noticed**. Error push automates a pull, so it does not reach silent hazards.

So this attack refutes the issue's broad title ("push is mostly wrong"). It leaves its core untouched: the silent-hazard channel.

## 4. Attack: a cheap model filters each fire

Arithmetic (`r8-stats.cjs`). The prior precision is 4-10 %. Take a judge that keeps 87 % of true fires:

| Judge specificity | Prior 4 % | Prior 10 % |
|---|---|---|
| 80 % | 15 % | 33 % |
| 90 % | 27 % | 49 % |
| 94 % | 38 % | 62 % |
| 98 % | 64 % | 83 % |

Evidence:
- **For a cheap judge.** LLM triage of static-analysis alarms is strong where the alarm is crisp.
  - An industrial study (ICSE 2026 SEIP, arXiv 2601.18844; abstract) used 433 alarms, 76 % of them false. Hybrid LLM-plus-path-analysis methods removed 94-98 % of the false positives "with high recall". The cost was 2-110 s per alarm. A review reports recall 0.86-0.88. The backbone models are not named in the abstract.
  - ZeroFalse (arXiv 2510.02534) reports F1 0.91-0.96 on benchmarks.
  - Checking a **named** hazard against a diff is a focused task, much easier than finding the hazard.
- **Against.** Those alarms come with a static path and three crisp bug types. The residual here is the hazards that **no check can decide**, which is the fuzzy case. Ghosh (fact sheet F2, abstract only) found that LLM judges ranked harmful memories no better than chance. That is a different task, but a close one.
- **Not measurable here.** The repository has 4 evaluable positives. Sensitivity cannot be estimated, and a single missed true fire changes it by 25 points.

Result: "it needs a **top-model** judge on every fire" is not shown. "It needs a judge on every fire" stands. Whether a cheap one is good enough is open, and this repository cannot settle it. The design already sends each diff warning to the PR's Opus reviewer (KS L36, L470). So the accuracy of warnings that are acted on is protected, at the price of keeping a top-tier reviewer in that step.

## 5. Attack: are silent hazards worth reaching at all?

Of the five repeats:
- **mypy re-export.** CI caught it, and it diagnoses itself. Not silent.
- **NoReferencedTableError.** It became a prod login 500. Silent. The guard (a bootstrap test) could have been written at the first occurrence.
- **Expo SDK pin.** CI was green both times, and the EAS build failed after merge. Silent. The guard (a dependabot ignore) is mechanical.
- **expo-audio stop.** A wrong first fix, corrected the same day. This is not a case of reusing a diagnosis.
- **Press race ported to a sibling.** Found on a device. Silent. It needs judgement, because no lint is obvious.

Every fix was written by a top-tier model already (F2: 0 cheap-tier trailers). So top-model work plus CI did not stop silent repeats. That part of the issue holds. But with guards written at the first occurrence, which is the proponent's best form, item (c), about **one** judgement-only silent repeat is left in 65 days. The precision problem is real, but here it governs a channel worth about one catch per two months.

## 6. Attack: E1

D6's E1 harm uses pushed exploration answers: an 860-token card, 0.73 of a call, and break-even at 3.5-6.6 %. Nobody measured precision for that channel; D6 itself says the PR-level number "may not" transfer. For hazard warnings the costs are different:
- A `--diff` miss line is 70-90 tokens.
- A warning line goes to the Opus reviewer, plus at most one card of up to 860 tokens.
- The D21 hook gives one warning of at most 300 characters per session and entry.
- At 7-25 false warnings per true one, carrying 175 tokens over about 250 remaining calls costs about 1.1M tokens per true catch at most. That is under 1 % of one slice session: 159M by the proponent's arithmetic, which I read and did not re-derive.
- A true catch averts a prod incident or a burned build.

The E1 hit is not supported for hazard warnings.

## 7. Numbers: what I re-derived, read, or could not check

- **Re-derived by my own scripts:**
  - 154 PRs.
  - D6's backward-fire share (66-71 %).
  - Forward precision for 11 policies.
  - Forward union by library size.
  - Old-entry fire rates and the projections at 50 and 133 entries.
  - The base-rate ceiling and its PR-level correction (26 %).
  - The 0.079 % per-entry limit.
  - Judge arithmetic and base-rate scaling.
  - The error-template distribution over 1,670 errors.
- **Read only:**
  - The five pairs and "3 to 5" (F2).
  - The 10 % ceiling (KS L707).
  - The 5 % gate and author-named handles (KS L261).
  - The Opus-reviewer route (KS L36, L470).
  - D21's 300-character hook (KS-O15).
  - The SAST-triage figures (abstracts).
  - Ghosh (fact sheet).
  - 17-45 % recurring fixes (second hand).
  - 159M per slice session (proponent).
- **Could not check:**
  - Any judge's sensitivity on real hazard fires (no positives).
  - Silent re-encounters inside sessions that never reached git.
  - Whether false fires in the hazard's own files were useful reminders.

## 8. Restated issue (what survives)

Hazards an agent does not notice can be reached only by warnings keyed on code identifiers. Replayed forward over 154 PRs, those warnings were right about 1 time in 8 to 1 in 25, on 1-4 true catches. The rate of warned PRs rises as hazard entries accumulate. Policies that catch half the known repeats would warn on 30-100 % of PRs at 133 entries. Each warning needs a judge. Whether a cheap model can judge is untested, and 4 repeats cannot test it. Here this governs about one catch per two months.
