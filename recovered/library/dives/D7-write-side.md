# D7. The write side: how entries get in, how good they are, what they cost to keep (E1, E3, E4)

Read-only dive. Inputs: fact sheets F1 to F6, the KS design (v1.3.1), HARNESS-V2 §0, the dives D2 and D3 and P (built on, not repeated), and two read-only measurements over `main` run today: `dives/d7-guards.cjs` (which fix commits ship a guard) and `dives/d7-econ.cjs` (the token arithmetic below). Tags: [M] measured, [D] arithmetic on tagged inputs, [E] estimate, [G] guess, [A] argument only.

Terms.
- **Entry**: one solved problem in the store (symptom, cause, failed approaches, fix, check).
- **Guard**: a test, lint rule or CI check in the repository. It runs on every change, for every agent and person, with no lookup.
- **Verified hit**: a lookup whose check returns `applies` on today's code. Only then may a cheap agent act (KS L305, L434).
- **Candidate**: a match the check cannot confirm. Advice, not a licence to act.
- **Negative result**: "approach X does not work, because Y". **Prohibition** (`do_not_apply`): "never do X".
- **S**: the top-tier solve a hit avoids. Nobody has measured it (KS L544). I use 1.5 to 7.5M tokens [E] (one to five agent windows of about 1.49M each [D from F3]) and note where a larger S changes the answer.
- Tokens are context tokens processed, mostly cache reads, the basis F3 uses.

## 0. Verdict

The lead's core stands, but in a sharper form than it was put. The trade-off on the write side is not "corpus size versus hit rate". Recurrence caps hits whatever the corpus size (D2). The real trade-offs are two.

1. **When to record.** Record at the first fix and you store the lesson that later recurs, but in this repository that lesson was wrong or too narrow in 4 of 5 recorded repeats. Record after the hard second solve (the KS write rule) and the lesson is right, but a guard lands in the same commit and the cause does not come back. Recurrence selects the weak lessons.
2. **How much trust to buy.** The admission that published work says makes memory safe for a cheaper reader is a measured with-and-without benefit, per entry and per reader model. Here it has no held-out case for most entries, and costs more per entry than the entry saves at about 0.04 to 0.27 uses per entry.

Two more issues the lead did not name. Use cannot clean the store: outcome feedback exists only for verified hits, while negatives and prohibitions are never tested and candidate outcomes are confounded. And the write and repair path needs the top model for ever, which breaks E4's "works as if they had one".

Two parts of the lead dissolve: "reuse amplifies a wrong entry" for gate-verified entries (the gate and a rerun bound it), and "upkeep falls on one developer" (it falls on the top tier).

## 1. Measurements run today

| What | Result | Source |
|---|---|---|
| Fix commits that ship a test file | 29 of 50; 26 of 47 if three fixes to tests themselves are left out (55 %) [M] | `d7-guards.cjs` |
| Fix commits that ship CI, lint or Dependabot config | 4 of 50 [M] | same |
| First fixes in the five repeat pairs that guarded the path the repeat took | 0 of 5 [M]. `789d522` shipped a test, but for `pendingMedia`, not the press race; `b7a5b98` only renamed a CI script | same, plus `git show` |
| Top-tier models that wrote commits in 65 days of `main` | Four: Opus 4.7 (6 trailers), Opus 4.8 (110), Fable 5 (74), Opus 5 (14) [M] | commit trailers |
| CLAUDE.md's Sentry rule against its source | `6928828` says "re-add the plugin only once a Sentry project + auth token exist". CLAUDE.md L84 says "Never add the Sentry Expo config plugin to app.json — it breaks the gradle build". The condition was dropped. `a31924a` (#176, Opus 5) put the project live and kept the plugin out, citing the unconditional rule [M] | `git show`, CLAUDE.md |

### The five repeat pairs, read for the quality of the first lesson [M, by reading commit bodies; n = 5]

| Pair | First lesson as written | What the repeat showed | Class |
|---|---|---|---|
| expo-audio `stop()` (`dbb3661` then `d440855`, 5 h) | Opus 4.8: "Root cause... the recorder never acquired audio focus" | "throws... regardless of config — audio focus, explicit prepare options, and mono all failed... The root cause is the library binding" | wrong |
| `NoReferencedTableError` (`2f09cec` then `f29f62f`, 8 h) | Fable 5: "scripts that write must side-effect-import app.registry" | the app entrypoint had the same gap; production login returned 500 | narrower than the cause |
| Press race (`789d522` then `0a3b38e`, 6.5 days) | guard in `ArrivalJobStep2` | same race in `CreateJobStep2`; the app has no screen-test harness, so no guard was possible | narrower, unguardable |
| mypy re-export (`75b51f9` then `981ae08`, 1.3 days) | one module | the next module; CI's strict mypy caught both with a message that names the fix | narrower, already guarded by CI |
| SDK-52 pins (`b7a5b98` then `6928828`, 23 days) | right | Dependabot re-drifted the pins; the Dependabot ignore landed with the second fix | right, unguarded |

## 2. The operating points, in tokens (script `d7-econ.cjs`)

Uses per entry come from D2: 15 to 25 entries per 64 days under a strict rule, about 1 verified repeat and 4 true repeats in that time. So 0.04 to 0.07 verified uses per entry, 0.16 to 0.27 counting candidates [D].

| Operating point | Tokens per entry | Trust it buys | Write spend per useful use |
|---|---|---|---|
| Loose: a short note on every fix, written in session | about 0.13 to 0.6M (1 to 2 turns at 125 to 306k) [D, G] | none; first lessons were wrong or narrow in 4 of 5 repeats | 1.6 to 7.7M per use (4 uses per 50 entries), but the uses serve weak lessons |
| KS strict as designed (Opus author, a different Opus approver, control pair) | 0.88 to 2.60M (author 4 to 6 turns, reviewer 3 to 5 turns, 7 to 14k output) [D, G on turn counts] | the cause's condition is present, for lead-capable kinds only (3 of about 55 seed entries without Docker) | 3.3 to 16M per use with candidates; 13 to 65M per verified use [D] |
| KS plus adversarial checking, as the seed got (two xhigh refuters per claim with executed counter-evidence) | plus about 8.6 to 12.9M per claim [D: 43 tool calls per refuter at 100 to 150k]; the workflow itself reported 1.7M "subagent tokens" for 7 agents, unit not stated | catches errors like the 5 of 8 seed examples whose check or history was wrong | 40M and up per use [D] |
| KS plus measured benefit per reader model (the published safe form) | plus 1.0 to 3.0M (one trial per arm, which proves nothing) to 5 to 15M (five per arm) per reader model [D] | a measured gain for that reader, if a held-out case exists | 7 to 35M per use (k = 1); 88 to 437M per verified use (k = 5) [D] |
| A guard instead, written in the fixing PR | 0.38 to 1.52M (2 to 4 turns plus 1 to 2 review turns) [D, G] | fails loudly when wrong; runs before the failure | none per encounter; 26 of 47 product fixes already do it |

Break-even S, the solve a use must avoid to repay one strict entry's writing alone: 3.7 to 17M if every candidate use counts fully, 14 to 66M if only verified uses count, 22 to 110M with five-per-arm measured benefit [D]. Before lookup misses and upkeep. Against an S of 1.5 to 7.5M [E], strict entries sit at or above break-even only at the generous end. If a hard solve really costs a fifth of a slice session (about 30M, a guess), strict KS breaks even; measured-benefit admission still does not.

Re-validating the whole corpus (about 135 to 215 entries) once per reader-model release costs 135 to 640M (one trial per arm) or 0.7 to 3.2B (five per arm) [D]. The repeat-defect work the library could save is 6 to 21M in FixFlow's whole recorded 2.13B (D2's 0.3 to 1 %; a different period from the fix history). Sonnet releases came every 3 to 5 months in 2025-26 (F6). Four top-tier writer models appear in 65 days of this repository.

**The answer to "is there a point with a large corpus and trustworthy entries?"** No. As the cost per entry falls, the entries become the first-draft lessons that recurrence selects and the literature says weaker readers follow. As trust rises, its cost per entry passes the expected saving per entry, because each entry is used well under once.

**The guard comparison.** Per lesson, a guard costs about the same or less than a strict entry (0.4 to 1.5M against 0.9 to 2.6M). It needs no lookup, no compliance and no tier. It acts before the failure; the store's lookup triggers on the error, after the build has burned. It fails loudly when stale (a blocked PR) where a stale entry fails silently. Both are expensive per prevented repeat, because few lessons repeat. But the guard is already the habit for 55 % of product fixes and doubles as a regression test, so a store entry on top of a guarded lesson is pure extra cost. The store's own write budget belongs only to lessons no guard can hold: negatives, design judgment, races without a harness, outside systems. Those are candidates (D2 issue 1, D3 issue 2).

## 3. Issues

### W1. Recorded early, a lesson recurs but is often wrong; recorded late, it is right and does not recur

- **Claim.** When an entry is written decides its worth. At the first fix it is the lesson that later recurs, and here that lesson was wrong or too narrow in 4 of 5 repeats. After the hard second solve it is right, but a guard lands with it and the cause never comes back.
- **Mechanism.** A cause recurs only if its first fix and lesson failed to stop it: wrong, narrower than the cause, or left unguarded. So recurrence picks the weak lessons. KS records only after an escalation, two failed approaches or a burned build (L452). That fires mostly on the second, hard encounter, when the lesson is finally right and the guard lands in the same commit. A loose rule records the first, easy-looking fix, the one that recurs, so hits land on weak lessons. The only lesson both recorded before the repeat and right is a correct but unguarded one, and the cheapest fix for that is the guard. This is a property of the workload and of what the top model knew at the time, not of retrieval.
- **Evidence.** The pair table above [M]. 0 of 5 first fixes guarded the repeat's path, against 55 % of product fixes shipping a test [M]. The guard landed with the second occurrence in every pair; no same-cause third occurrence in 64 days (D2 [M]). Unfiltered add-all memory scored 55.48 against 70.95 with strict admission (Xiong et al., F5 A1).
- **Best fixes tried.**
  - Two-phase entry (record early as provisional, confirm later): partly. Provisional entries are candidate-only (L437). Confirmation arrives with the second occurrence, which is when the guard lands.
  - Generalise at write time (store the class): fails. Stating the class is the knowledge whose absence caused the repeat. When the top model can state it, it writes a check: `f29f62f` added a boot-time fail-fast and a bootstrap test.
  - Guard at the first fix (a "fix plus guard" Done-when): dissolves the right-but-unguarded case and saves the whole encounter. It leaves the store only wrong, narrow or unguardable lessons. Good for tokens, bad for the library.
  - Better retrieval, embeddings, a push channel: fail. They change which entry is found, not whether its lesson is right.
  - Record the hard second solve's negatives (`d440855`'s four failed approaches): partly. Right and useful, but scoped to expo-audio 0.3.5, and the cause did not recur after the library swap.
- **Residual.** The window in which an entry is both right and still useful is the gap between a correct first record and its guard. In 64 days it held one case (the SDK pins), and a guard closes it with no lookup.
- **Hits.** E3 breaks: at a repeat the cheap reader receives the top model's weakest conclusions. E1 capped: the right entries are not reused.
- **In the design?** Partly. KS-C10 lists "expo-audio `stop()`, first fix wrong" as a repeat, and L545 admits agents follow wrong memories. Neither draws that recurrence selects weak lessons, or that the write rule fires on the second occurrence.
- **Falsifier.** In the KS-0 audit or a longer history, classify each counted repeat's first lesson. If at least half were right, complete and gate-verifiable at the first record, and no guard could have stopped them, W1 fails.

### W2. The trust a cheaper reader needs costs more per entry than the entry saves

- **Claim.** The admission that published work says makes memory safe for a weaker reader is a measured with-and-without gain per entry and per reader model. It needs a held-out case most entries never get, and costs 1 to 15M tokens per entry per reader model. Entries here are used about 0.04 to 0.27 times. Cheaper admission keeps the errors in.
- **Mechanism.** An entry's value is its expected uses times the solve it avoids. Uses per entry are set by recurrence, not corpus size. A strict KS entry costs 0.9 to 2.6M, mostly the author's and reviewer's turns re-reading their context. KS §7.7 states 5 to 10k plus 2 to 4k while saying the round trip dominates, and its break-even formula leaves per-entry writing out (W is the build). A measured per-entry gain needs a case the entry has not seen. For a solved problem that is the next occurrence: it comes within days, for about one fix in ten, and brings its guard. Synthetic cases written by a model that knows the answer measure the author's paraphrases (L547). Each reader-model release makes the measurement stale. Cheaper gates do not buy the trust: LLM review ranks harmful memories at chance, and replay of the entry's own case re-proves what its control pair shows.
- **Evidence.** Section 2 [D]. KS L476, L690. Ghosh et al.: similarity and LLM judges ranked harmful memories "no better than chance"; gating on measured gain matched an oracle (F2 M02-30, abstract). Xiong et al.: records judged correct and kept were only 44 to 55 % correct on EHR (F5 A1). AgentBrew: notes must be validated per student; 24 to 38 % of drafts rejected (F6, P). In this repository the seed's worked examples, already written by top-tier lanes, had a check or history error in 5 of 8 (ex1, ex2, ex3, ex4, ex8; KS §12.5), found only by two xhigh Opus refuters per claim with executed counter-evidence. Across the design's own claims: 29 of 30 verdicts narrowed or refuted (§12.5), 53 of 69 decidable attacks succeeded (§12.8). Writer models: four in 65 days [M].
- **Best fixes tried.**
  - Measured benefit per entry and reader: fails. No held-out case for about nine entries in ten before the guard lands; where one exists, break-even S is 7 to 110M.
  - Validation by replay of the original failure: fails. It re-proves the entry's own case (what `fails_at`/`passes_at` show) and says nothing about the next case or the reader.
  - One LLM reviewer, as KS: partly. It catches some errors, but first drafts were wrong in 5 of 8 even after top-tier writing.
  - Store-level with-and-without at KS-9: partly. It measures the average, cannot find harmful entries one by one, and 20 encounters cannot separate 15 % from 5 % (F2).
  - Pool across projects to raise uses per entry: partly. Pooled entries lose their repo-bound control pair and become candidates; the portable share is small (D2 issue 4).
  - Spend the tokens on a guard: dissolves for guardable lessons (0.4 to 1.5M, zero per encounter, acts first). It is not the library, and it leaves the unguardable residue.
- **Residual.** No admission rule is both cheap enough for entries used well under once and strong enough to make them safe for a cheaper reader. Safety stays with the gate for lead-capable entries only (3 of about 55 seed entries without Docker). Everything else reaches the reader on top-tier say-so.
- **Hits.** E1 capped: write spend alone is near break-even at the generous end. E3: the safe form costs more than it saves. E4: re-validation per project and per reader.
- **In the design?** Partly. KS L476 states the recording cost but leaves out its re-reads; L690's formula has no per-entry write term; L545 says cheap-tier benefit is unproven. V2 L93 names "cost of writing" without a figure.
- **Falsifier.** Log cache-read and output tokens for every `ks record`, `capture`, `control` and `approve`, as the lookup log already does for lookups. If write spend per useful use at KS-9 is below the measured S, or per-entry with-and-without trials on real second occurrences can be run for most entries before their guard lands, W2 fails.

### W3. Use cannot clean the store

- **Claim.** Outcome feedback exists only after a verified `applies`. The entries actually read at a repeat are candidates, negatives and prohibitions. Negatives and prohibitions are never tried, so never refuted. Candidate outcomes are confounded by flaky or multi-cause symptoms. Each entry gets well under one use. So quality is frozen at admission.
- **Mechanism.** Demotion needs a trial whose result can be pinned on the entry. KS records outcomes only after `applies` (L313-318). A negative or prohibition steers the reader away from X, so the one experiment that could show it wrong never runs. Both are shown without the gate (L434). For candidates, the reader uses the hint partly and with other changes, and a rerun often passes anyway, so "resolved" can confirm a wrong lesson. With 0.04 to 0.27 uses per entry there are no per-entry statistics; the first sign of a bad entry is its harm. Distillation adds drift that use never tests: the Sentry lesson lost its condition on the way into CLAUDE.md, and a later top-tier session obeyed the unconditional rule.
- **Evidence.** KS L313-318, L434 (prohibitions never withheld; negatives shown under an UNVERIFIED banner even on a candidate). About 60 negatives, the largest seed class, "few of which record a tried-and-abandoned fix" (L495). The Sentry rule [M], and KS-C8: ex8's probe "returns applies for ever" because the deciding condition is an EAS-side secret. A GitHub Actions study: 67.73 % of 52,610 rerun builds were flaky, and "the same root cause can manifest as different failure symptoms" (F2 X-05 F05). EAS build 15 had two causes (`6928828`). ClashEval: models adopted wrong retrieved content over a correct prior more than 60 % of the time, less confident models more (F5 C1). MemCollab: a stronger model's raw memory lowered weaker readers, 57.1 to 55.0 and 41.7 to 36.3 (F5 C3).
- **Best fixes tried.**
  - A/B outcome (revert and rerun): partly. One extra run for deterministic local tests; for EAS, device or deploy symptoms each outcome costs another build, and flaky classes need several.
  - Sometimes try what a negative forbids: partly. It spends the attempt the negative exists to save, and at well under one use per entry no negative is busy enough to repay it.
  - Make every negative and prohibition executable: partly. Then it is a test, at guard cost, and argued exclusions (most of the seed) cannot be made executable.
  - Expire on footprint or tool-version change (KS does): partly. It bounds the damage, but footprints change within about a day (D2), so negatives die before reuse, and the Sentry rule's deciding condition lies outside every footprint.
  - Show cheap readers only gate-verified entries: dissolves the risk and leaves 3 of about 55 seed entries usable without Docker. Safety traded for coverage.
- **Residual.** Wrong prohibitions and negatives persist until a top-tier session happens to re-derive the question. Wrong candidates can be confirmed by coincidence. The cheaper reader, the one most likely to comply, sees the least-checked content. Retrieval accuracy (E5) can be tuned; the correctness of what is retrieved cannot be measured in use.
- **Hits.** E3 breaks for the unverified share. E5 unknowable for content. E1: a wrong negative prunes the right approach.
- **In the design?** Partly. L518 (the gate proves a condition, not a cause), L521 (symptoms mislead), L545 (agents comply with wrong memories). Not drawn: negatives and prohibitions have no correcting channel, and outcomes are confounded in the build and deploy class the design calls its v1 value.
- **Falsifier.** At KS-9, re-test a sample of stored negatives and prohibitions on a branch with a top-tier session. If at least 95 % hold, and candidate outcomes in the recurring classes can be attributed by A/B at one extra run each, W3 shrinks to a cost.

### W4. The write and repair path needs the top model for ever (E4)

- **Claim.** Only Opus may write, approve or repair, and entries bind to this repository's commits and files. A user without the top model reads an imported snapshot that cannot be verified in their repository, and can add only lower-model lessons. The library stops carrying top-tier reasoning the day the top model leaves.
- **Mechanism.** The library's value is maintained, not stored. Here footprints change within days (median first touch 0.71 days, median 5 touches in two months, D2), each change makes an entry suspect, and repair needs an Opus author and a different Opus approver (L350). In a new repository an imported entry has no `fails_at`/`passes_at` commits and no blobs, so it can never return `applies`. The new project's own lessons, most of a curated set (22 of 28 CLAUDE.md items name this project's design or defects, D2), would be written by the lower model, and self-written knowledge tests null to negative. What carries over with verification is stack-bound probes, which are lint rules.
- **Evidence.** KS L437, L350; F1 §4 (40-hex mainline shas, blob OIDs, repo paths); D2 churn and CLAUDE.md counts [M]. SkillsBench: curated skills +16.6 points; self-generated about −1.3 (secondary report, F6). LLM-written context files −0.5 to −2 points at +20 to 23 % cost (F5 B1). AgentBrew notes moved poorly to another student, 74.92 against 75.96 (F6).
- **Best fixes tried.** Let the lower model write and repair: fails for E4's promise (lower-model reasoning). A central curator with top-model access: partly; it works for stack-bound traps (a rule pack), not for project-specific lessons. Re-anchor imported entries mechanically: fails; there is no commit where the cause was present and then fixed. Occasional top-model access for writes: partly; then W2's costs land on the user who was meant to need no top model.
- **Residual.** The user without the top model gets candidates plus portable lint rules; their project's own lessons carry lower-model reasoning.
- **Hits.** E4 breaks ("works as if they had one"); E3.
- **In the design?** Partly. Opus-only writing is stated (L437); KS is silent on other projects; V2's refuter item 12 says transfer is not shown.
- **Falsifier.** A new project run on Sonnet, with an imported library plus Sonnet-written entries, matches Opus without a library on its own lessons in a with-and-without trial.

## 4. What dissolved, or is not new

- **"Strict admission keeps the corpus tiny, which caps the hit rate."** Dissolves as framed. Recurrence, not corpus size, caps hits (h is at most r × v, D2). A larger corpus from looser admission adds mostly entries that never recur. The real trade-offs are W1 and W2.
- **"Reuse amplifies a wrong entry, and the cheap reader cannot catch it", for gate-verified entries.** Dissolves. Nothing acts until `verify` returns `applies` on today's code, and for deterministic symptoms a rerun refutes a wrong cause after one wasted cheap attempt (L315, L318). It survives for unverified content (W3).
- **"Upkeep falls on one developer."** Dissolves. No per-phase owner work (L458); repair is Opus's (L350); the owner keeps a Node-upgrade ritual and a never-do list (L532-533). The top-tier cost is in W2 and W4.
- **"Upkeep grows with the corpus" as its own issue.** Folds into W2. It bites only entries with checks, which cost about what a guard costs and are promoted away; prose entries have no check to keep, and no trust. [A] A CI test is repaired by the PR that breaks it, with the context loaded; a store check is repaired out of band by two Opus sessions.
- **"Several seed checks duplicate CI."** Not new: KS §9 (L524), and D17 promotes them.
- **"The highest-value entries are the ones no check can verify."** True, but admitted (KS §9, L515-516) and owned by D2 issue 1 and D3 issue 1.

## 5. New angles

- KS §7.7's recording cost leaves out the per-turn re-read that the same section says dominates, and the break-even formula has no per-entry write term. A one-line change to the lookup log (also log write verbs' cache tokens) would measure it.
- Audit CLAUDE.md rules against their source commit bodies for dropped conditions. The Sentry rule is one case. No build needed; it measures how often distilled lessons overstate.
- KS-0 should classify each counted repeat's first lesson as right, narrow, wrong or unguarded. That tests W1 directly.
- The press-race pair recurred because the app has no screen-test harness. Building that harness turns a whole class of store candidates into guards. That is a better use of top-tier tokens than entries for that class.
- A "fix plus guard" Done-when rule is the zero-lookup alternative. Measure from history which repeats a first-occurrence guard would have stopped.

## 6. Files

- `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/0bf1c4f3-76dc-4144-995c-2af5a213db41/scratchpad/lib/dives/d7-guards.cjs`
- `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/0bf1c4f3-76dc-4144-995c-2af5a213db41/scratchpad/lib/dives/d7-econ.cjs`
