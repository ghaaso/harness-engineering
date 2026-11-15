# D3. A cheaper model standing in for the top model (E3)

Expectation under test. E3: "A Sonnet-class model, even at lower reasoning effort, performs the same as Opus, because it reuses cached reasoning from the better model."

Terms used below.
- **Tier gap**: how much better the top model does than the cheaper one on the same work.
- **Coverage**: the share of tasks for which the library holds an entry that truly applies.
- **Lead-capable entry**: an entry whose check can return `applies`, so a cheap agent may act on it (KS L272, L281).
- **CI promotion**: turning an entry's check into a test or lint in the repository's own pipeline (KS D17, L716).
- **Silent failure**: a wrong result that raises no error, so nothing triggers a lookup.

Scripts (read-only, run today): `dives/d3-reserved.js` (classifies the 48 fix commits on main by the areas the ship plan reserves to Opus, and by model trailer), `dives/d3-power.js` (trial sizes, ratios). All numbers below carry a tag: [M] measured, [V] vendor-reported, [D] arithmetic on sourced numbers, [A] argument only.

---

## 1. Bottom line

The library can make Sonnet reach **the same result on cached cases**. That part of E3 is plausible and can be checked at KS-9. It is not the same as "Sonnet performs the same as Opus". Three things stop the second claim. None of them is an implementation choice.

1. **Where the tiers differ, there is nothing to look up.** The gap sits in first-seen, open-ended work whose failures make no error. The library's coverage sits in recurring problems whose cause is a fact about the setup. Those facts help Opus exactly as much as Sonnet. So the gap the library can close is the small part.
2. **On a hit, what can be done mechanically never needed the top model.** The entries a cheap agent may act on are data-value and test checks. These are exactly the checks that belong in CI, where they serve every model with no lookup (the design says so itself, D17). What stays in the library is the class that needs the reader's judgment, which is where the tiers differ.
3. **E3 cannot be shown true on this workload, and is worth at most half the per-token price.** The gap is 2 to 8 points on the vendor's own coding benchmarks. Telling such a gap apart needs roughly 220 to 940 paired tasks. The repository's whole history holds about 140 usable task commits. In tokens, E3 saves nothing; Sonnet slice calls here read about twice the context per call.

Best case: the library carries the gap only on covered work, at most about a quarter of tasks on the design's own guessed ceiling, and less than that share of the gap, because the gap is concentrated where coverage is zero. What it can never carry is the judgment on a first-seen problem that fails silently: noticing it, keeping to scope, and deciding whether a stored lesson applies.

---

## 2. The Sonnet to Opus gap itself

Vendor pages, opened again today [V]:

| Benchmark | Sonnet 5.5 | Opus 5.5 | Note |
|---|---|---|---|
| Terminal-Bench 4.0 | 70.6 | 66.4 (xhigh) | Sonnet leads by 4.2 |
| FrontierCode 1.1 (main) | 46.2 (max effort) | 54.4 (max), 54.6 (default medium) | Opus leads by about 8 |
| CursorBench 4.0 | 55.5 | 57.8 | Opus leads by 2.3 |
| OSWorld 2.1 | 80.1 | 81.8 | 1.7 |
| Humanity's Last Exam (tools) | 64.5 | 67.7 | 3.2 |
| GDPval-AA | 1844 | 1846 | tie |

What FrontierCode measures, per the page: whether a change "could be merged without human edits". It penalises changes outside the task's scope. The page says Sonnet 5.5 scored lower at max effort than at xhigh, partly from extra out-of-scope edits and timeouts. It says Opus 5.5 "remains clearly stronger at complex, open-ended work requiring sustained judgment".

**What this does to E3's plausibility.**
- On tool and terminal work, E3 is already roughly true **without any library**. Sonnet leads or sits within 2 points. Any parity seen there cannot be credited to the library.
- Where the gap is large (about 8 points on merge-without-edits), its stated causes are out-of-scope edits and timeouts. Those are silent: the code runs, no error string appears. A library keyed on errors, escalations and diffs of known hazards has no key for them.
- More effort did not help Sonnet there: max scored below xhigh. Opus at its default medium effort beat Sonnet at max. So "even at lower reasoning effort" is the wrong direction for the one benchmark where the gap is large. Nothing published shows Sonnet at low or medium effort on these benchmarks.

**What this does to E3's worth.**
- Price per token today: Opus 5.5 is 2x Sonnet 5.5, including cache reads (0.05x of input for both) [V, F6]. It was 5x in the Opus 4 generation and 1.67x for Opus 4.5 to 4.8. So the whole worth of E3 is at most half the per-token price of the work moved.
- Tokens are the owner's unit. E3 saves no tokens. In this harness's November slice calls, Sonnet read about 440k context per call against about 222k for Opus [D from F3 §3: 1,452 M over 3,297 calls; 1,306 M over 5,879]. At the 2:1 price that is the same cost per call. This is confounded by role and by Opus's 367k window, and V2 already proposes a ceiling on every model; but it shows substitution does not save by itself. The vendor's earlier page reported Opus 4.5 at medium effort matching Sonnet 4.5's best with 76 % fewer output tokens [V].
- If all Opus context in the record moved to Sonnet at equal token counts, the price-weighted context spend would fall about 31 % [D: shares 51.5 / 32.2 / 16.3 %; cache-read price 0.2 / 0.1 / 0.2 for Opus / Sonnet / Fable]. That is the ceiling of E3's worth here, before the Opus-reserved areas, which the routing keeps on Opus even on a hit.
- Release cadence: each new mid tier has matched or come within a few points of the previous top tier, 1 to 3 months later, and 6 days for Sonnet 5.5 [V, F6]. A gap the library would close is closed by the next release for most work anyway. The library's own contribution to E3 is the slice of gap that survives a release, which is the judgment-heavy slice it cannot reach.

---

## 3. The lead, tested one part at a time

| Part | Verdict | Why |
|---|---|---|
| (i) Recognise, judge, adapt are reasoning steps | **Stands, narrowed.** Merged into issue 2. | For lead-capable entries the check mechanises "does it apply", so this is dissolved there. It stands for every candidate-only and general entry, which is most of the store and every entry a generalising owner would add. |
| (ii) The inversion | **Stands.** Issue 2. | Measured below: lead-capable without Docker = 3 entries, all data values; about 40 to 46 % of fix commits touch Opus-reserved areas. D17 itself says promoted checks work "for every agent and human, with no store involved". |
| (iii) Nothing fires on a silent wrong answer | **Stands for novel failures; partly dissolved for known hazards.** Issue 1. | The diff arm fires without the agent noticing, so known hazards are covered. Novel silent failures are what FrontierCode measures. Self-assessment cannot be the trigger: agents that succeed 22 % of the time predict 77 % [M, arXiv 2602.06948]. |
| (iv) Compliance with wrong memory | **Dissolves as a tier issue.** | The small-model harms (MemCollab, Pandey, Dynamic Cheatsheet) are on 7B-8B models and GPT-4o-mini, far below Sonnet-class. For larger executors the harm grows with size (Ghosh et al.), and stronger agents lose more in absolute terms (Compliance Trap). So it does not make Sonnet worse relative to Opus. The KS gate withholds the fix until `applies`, which removes it for lead-capable entries. What is left is a library-wide harm (E1, E5), not a tier one. AgentBrew's per-student difference was about 1 point (MATH 74.92 vs 75.96). |
| (v) Lower effort makes it worse | **Argument; folded into issues 1 and 2.** | The only data cuts the other way from E3's hope: on FrontierCode more effort hurt Sonnet, and Opus at medium beat Sonnet at max. No number exists for Sonnet at low effort reading library entries. Settled by: replay the same tasks with Sonnet at low, medium and high effort, with and without the entry. |
| (vi) On a miss Sonnet is Sonnet | **True but empty alone.** Gets its size from issue 1. | It matters only as miss rate x gap on missed work. |

**New angle the lead missed: the store learns from the wrong model's failures.** The write rule records solves that needed an escalation, two or more failed approaches, or a burned build (KS L452). Routine fixes are not recorded. In this repository every one of the 48 fix commits was made by Opus or Fable [M: 27 Opus, 20 Fable, 1 untagged], and no commit on any branch carries a Sonnet trailer [M: 0]. The routing gives Opus the hard areas from the start, so Sonnet never fails there and no entry ever records what Sonnet gets wrong there. The store fills with what was hard for the top model. The tier gap is the set of things that are easy for the top model and hard for Sonnet. Those never trigger a record. AgentBrew, the one parity result, worked the other way round: the teacher wrote notes from the student's failures. This is part of issue 1.

---

## 4. The issues

### Issue 1. Where the tiers differ, there is nothing to look up

**Claim.** The tier gap and the library's coverage sit in different places. The gap is in first-seen, open-ended work that fails silently. Coverage is in recurring problems whose cause is a setup fact, which both tiers lack equally. So the library equalises the tiers mainly where they were already close.

**Mechanism.**
- A library holds what happened before. A problem is in it only if it recurred. Recurring causes in this repository are facts about tools and setup: a mypy re-export rule (which "diagnoses itself from the error message"), an ORM registry import (findable by `git log --grep` 8 hours later), an Expo version pin, an audio library's `stop()` behaviour, a press-race guard ported to a sibling (F2 §2). None of the five repeat pairs is an invariant-heavy judgment problem. Opus also had to discover each of them; an entry helps Opus as much as Sonnet.
- The gap is where Opus "remains clearly stronger": complex, open-ended work needing sustained judgment, and merge-without-edits quality, lost by Sonnet partly to out-of-scope edits [V]. Each such task is new by nature, and its failure raises no error, so no lookup fires.
- The write rule samples the top model's hard cases, not Sonnet's failures (section 3).

**Evidence.**
- Same-cause repeats: 3 to 5 of 48 fix commits (6 to 10 %); fix commits are 48 of 368 on main, so repeats are about 1 % of commits [M, F2].
- 0 of 48 fix commits by a cheaper tier; 0 Sonnet-trailered commits on any ref [M, `d3-reserved.js`, git].
- Overconfidence: 22 % actual success, 77 % predicted [M, arXiv 2602.06948].
- FrontierCode gap about 8 points, Terminal-Bench reversed [V].
- V2's own guessed top hit rate is 0.25 [I, F3 §6].

**Best fixes tried.**
1. *Teacher notes written from the student's failures, validated per student (AgentBrew).* Partly. It is the one published case where the student reached the teacher: Terminal-Bench 2.0, student 45.3 to 51.6, teacher 50.0. But that is 29 to 33 of 64 tasks against the teacher's 32, about one standard error of a single run (6.3 points) [D]. The build cost equalled about 2,900 student tasks, with break-even at about 5,800 tasks [D from F6 ratios]. Validation needs a checker that says the student now succeeds. On repository work the checker for "mergeable without edits" is the Opus reviewer, so the top model stays in the loop. It also needs Sonnet to work, and fail, in the reserved areas to learn anything there.
2. *A router that escalates from signals in the trajectory (SWE-Router, RouteLLM).* Dissolves the economics, not E3. RouteLLM kept 87 to 95 % of the strong model's quality while sending 13 to 35 % of calls to it [M]. But it works by calling Opus, and it needs no library. Routers trained on general preference data were near random on two of three benchmarks without in-domain labels [M]; this repository has no outcome labelled by tier (F3 §3). SWE-Router's 0.63 to 0.75 AUC is unconfirmed.
3. *Generalised entries, skills, recipes.* Partly, and for both tiers. Curated skills gained about 4.5 points in software engineering (secondary, unconfirmed) against 16.6 overall; repository context files gave no significant gain [M, Gloaguen]. Gains that reach Opus too leave the gap where it was, unless the notes are student-specific (fix 1).
4. *Opus review on every Sonnet PR.* Works, by keeping the top model. 64 % of reviews send a slice back, 2.8 rounds per slice [M], not split by model.
5. *A push channel and the v2 lookup before exploring.* Partly. They fire without the agent's doubt, but on a first-seen task the library has no entry to push.

**Residual.** Even in its best form the library equalises the tiers only on covered work. Where the gap is largest, work is new and fails silently. Closing it there needs either student-failure notes checked by the top model, or a router to the top model. Both keep Opus in the loop. So "Sonnet performs the same as Opus" means "Sonnet plus some Opus", not "Sonnet instead of Opus".

**Hits.** E3 capped. Carried share is at most coverage of gap-bearing work: under 0.25 on the design's own guess, and likely low single digits for exact entries here. E4's "no access to the top model" clause breaks, because every working fix keeps Opus.

**Already in design?** Partly. KS L545 admits it is unproven that Sonnet benefits from a hit. Nothing says the gap lies where coverage is zero, or that the write rule never samples Sonnet's failures.

**Falsifier.** Replay held-out tasks where Sonnet failed and Opus succeeded. If a library built only from earlier history covers a large share of them (say over 30 %) and Sonnet then succeeds, the claim falls.

Confidence 0.75.

### Issue 2. On a hit, what can be done mechanically never needed the top model

**Claim.** The entries a cheap agent may act on (data values, test ids) are exactly the checks that belong in CI. There they serve every model, with no lookup. What stays in the library needs the reader's judgment, and that is where the tiers differ.

**Mechanism.**
- KS lets a check return `applies` only where the matched value is itself the cause, or through an executable test (L272). That is a sound rule: a text pattern cannot prove code behaviour (KS-C14: a presence probe returned `applies` on a correctly fixed tree).
- But any check that is mechanical and has a control pair is already a regression test or a lint. D17 promotes it to CI and says it then works "for every agent and human, with no store involved" (L716). V2 retires an entry once its check lands (V2 line 81). After that, the hit class serves no tier difference.
- What stays is the class a check cannot settle: code-behaviour entries without a test, `prod_db` and remote causes, do-not-apply prose, general lessons. For these the cheap agent must judge whether the stored cause caused today's symptom (the gate "proves a condition, not a cause", §9 limit 4) and adapt the fix. That judgment is the tier gap.
- Inside the reserved areas (outbox, migrations, auth, money, job lifecycle) Opus applies the fix even on a verified hit (L444).

**Evidence.**
- Lead-capable without Docker after the refuters: ex7, ex2a, ex8 only, all config or data values (F1 §3, KS L495).
- Fix commits touching an Opus-reserved area: 22 of 48 by path pattern, about 19 of 48 after removing three type-checker fixes that only touched those files, so about 40 to 46 % [M, `d3-reserved.js`]. Non-fix code commits: 76 of 158 (48 %).
- None of the five repeat pairs is a reserved-area judgment problem [M, read from the list].

**Best fixes tried.**
1. *Lift the reservation and let Sonnet apply verified hits in the reserved areas.* Partly. It turns the trade into the issue: the reserved areas hold the money, auth and outbox invariants that CLAUDE.md says were each "paid for" by a past defect. Lifting it rests on the E3 claim, which issue 3 shows cannot be measured here.
2. *Write executable checks for code-behaviour entries.* Dissolves the gate problem, and in doing so makes the entry a test, which then belongs in CI (back to D17).
3. *Keep checks in the library to map a symptom to a cause.* Partly. This is the library's lasting value, but it is diagnosis, and it is tier-neutral: Opus reading the same card saves the same work.
4. *Record step-by-step adaptation recipes.* Partly. The more general a recipe, the more applying it is a reasoning step. AgentBrew's most reused note worked 55.6 % of the times it was applied [M].

**Residual.** The verified, mechanical half of the library is a short-lived bridge into CI and is tier-neutral. The half that stays needs judgment from its reader. So "same result on cached cases" is true mostly where any tier, or a CI message, would do.

**Hits.** E3 capped: the durable hit class carries no tier gap. E3's "lower effort" variant is hit hardest, since the remaining class is all judgment. [A] for the effort part.

**Already in design?** Partly. D17 (L716), the probe rule (L272) and the Opus reservation (L444) are all stated. The consequence for E3 is not drawn.

**Falsifier.** Find recorded entries whose check is mechanical but cannot run in CI, which save a Sonnet agent real work, and which would have cost Opus noticeably less than Sonnet without the entry. If such entries are a large share of KS-9 hits, the claim weakens.

Confidence 0.7.

### Issue 3. E3 cannot be shown true here, and the gap it would close is small

**Claim.** The gap E3 would close is 2 to 8 points on the vendor's own benchmarks. Telling such a gap apart needs hundreds of paired tasks. The repository produces far fewer. So the owner can never know whether E3 holds, which matters most in the reserved areas, where a few points more defects is costly.

**Mechanism.** "Performs the same" is an equivalence claim. Proving it needs a trial whose noise is smaller than the gap. Success rates near 50 % carry large variance per task. A paired trial on the same tasks helps, but Sonnet and Opus solve partly different task sets (SWE-Router read), so many tasks are discordant. The library's entries are specific to this repository, so public benchmarks cannot stand in. KS-9 can measure "same result on cached cases" over 20 encounters. It cannot measure general parity.

**Evidence** [D, `d3-power.js`, power 0.8, alpha 0.05]:
- Unpaired: 557 tasks per arm for an 8.4-point gap, 1,570 for 5 points, 7,419 for 2.3 points.
- Paired, with 20 to 30 % discordant tasks: 221 to 332 tasks for 8.4 points, 626 to 940 for 5 points.
- Non-inferiority within 3 points: 3,436 tasks per arm.
- The repository: about 140 usable task commits, 133 merged PRs over about 65 days [M]. With 140 per arm the smallest detectable gap is about 17 points; with the 75 held-out commits of the frozen graph protocol, about 23 points.
- Token cost of a 365 to 940-task paired trial: 1.0 to 3.5 B tokens at FixFlow agent-window size, against 7.35 B recorded on both repositories; 116 to 299 B at slice-session size.

**Best fixes tried.**
1. *Run a paired trial on replayed history.* Fails: not enough tasks, and it costs more tokens than the whole record.
2. *Use public benchmarks.* Fails: the library is repository-specific. The public numbers already show near-parity without it.
3. *Measure only cached cases (KS-9).* Partly: it measures "same result on cached cases", the half that is plausible, and nothing about the rest. Even there, 20 observations cannot separate a 15 % hit rate from 5 % (F2 §4).
4. *Pool across projects (E4).* Partly: more tasks, but different entries and different gaps, so it measures an average no project owns.

**Residual.** E3's general claim stays unknowable at this volume. The owner can only rely on the vendor's numbers, which do not involve the library.

**Hits.** E3 made unknowable. Its worth is capped at half the per-token price, about 31 % of price-weighted context spend in this record at equal tokens, and zero in tokens.

**Already in design?** Partly. KS L545 defers the with/without comparison to KS-9; F2 §4 notes 20 observations cannot separate 15 % from 5 %. Parity with Opus is never addressed.

**Falsifier.** A trial design that shows equivalence within 3 points using under about 150 tasks of this repository; or a vendor or third-party result showing the 5.x gap is much larger than 8 points on repository work, which would make it detectable.

Confidence 0.7.

---

## 5. How much of the top model's advantage could a library carry?

Write the carried share as a sum over kinds of work: share of work x gap there x coverage there x share of the gap removed on a hit, divided by the total gap.

| Kind of work | Gap | Coverage | Gap removed on a hit | Carried |
|---|---|---|---|---|
| Well-specified screens, read models, docs, tests (routed to Sonnet today) | about 0 (Terminal-Bench reversed) | high with templates | n/a | about 0, nothing to carry |
| Recurring setup and tooling traps | small; both tiers lacked the fact | the repeats: 6-10 % of fixes | about all (mechanical check) | small, tier-neutral, moves to CI |
| Invariant-heavy fixes in reserved areas | believed large [A]: the routing rule encodes it; never measured by tier | about 0 exact; no repeat pair here | diagnosis only, Opus applies | about 0 |
| Open-ended design, research, harness work | largest ("sustained judgment") | about 0 | n/a | 0 |

Best case: if the gap were spread evenly, the carried share would equal coverage, at most 0.25 on V2's guessed ceiling. Because the gap concentrates where coverage is zero, the true share is lower. For exact entries in this repository it is likely in the low single digits [D/A].

The one exception would be student-specific notes in the AgentBrew form. These carried the whole 4.7-point gap on one benchmark of 64 tasks, within one standard error. That form is no longer a cache of solved problems; it is a teacher-written skill set with the top model as validator.

**What it can never carry:** the judgment on a first-seen problem whose failure is silent. That means noticing there is a problem, keeping to scope, and deciding that a stored lesson applies and adapting it. This is where the measured gap is (out-of-scope edits on FrontierCode), and no entry exists for it before it has happened once.

## 6. Two claims, kept apart

- **"Sonnet reaches the same result on cached cases."** Plausible for lead-capable entries, and measurable at KS-9. But it is tier-neutral (Opus with the same card does the same) and short-lived (D17 moves it to CI). It is a statement about the cases, not the model.
- **"Sonnet performs the same as Opus."** Not carried by the library. On terminal and tool work it is roughly true already without a library. On judgment-heavy, merge-quality work Sonnet trails by about 8 points even at max effort, through silent failures the library cannot key on. On this workload it cannot be shown either way.

## 7. Dissolved
- Compliance with wrong memory, as a tier issue (section 3, iv).
- Per-student note validation as a big cost: AgentBrew's per-student difference was about 1 point.
- "Sonnet cannot use what it retrieves": the evidence is on 7B-8B models; nothing shows it for Sonnet-class.

## 8. Sources
- F1 to F6 fact sheets (this lane); KS design L272, L281, L444, L452, L495, L518, L545, L716; V2 lines 79-93, 103-104; ship plan Routing (SHIP-PLAN-2026-11.md line 47).
- Vendor pages re-opened today: Sonnet 5.5 and Opus 5.5 announcements (benchmarks, FrontierCode definition and effort notes).
- `git log main` on this repository, read-only; scripts in `dives/`.
