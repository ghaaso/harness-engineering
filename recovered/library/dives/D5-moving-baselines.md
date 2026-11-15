# D5. What the library has to beat, and how fast that changes

Area: incumbents (what already exists) and moving baselines (what keeps getting better without the library). All five expectations.
Method: read the six fact sheets and the KS design's sections 0, 2.4, 3.4, 5.1, 5.5, 5.6, 9, 10 (budget), D17; V2 section 0 (the library). New read-only measurements on this repository's git history (scripts and output in `d5-calc.js` next to this file). One web check (Expo release cadence).
Tags: [M] measured, [E] estimate, [V] vendor-reported, [A] argument only, [D] my arithmetic on tagged inputs.

## 0. Short answer

The lead holds in two of its three parts, dissolves in one, and missed two things.

- **Holds: what keeps its value already has a better home.** The knowledge no future model can derive (build traps, vendor behaviour, owner decisions) is real and lasting. But each part of it already has a home that beats a pulled lookup. Checkable repository traps belong in CI, which catches them before anything breaks and spends no model tokens. The design's own D17 moves them there. Vendor and operator facts sit where the design cannot detect staleness. Decisions sit in CLAUDE.md, which reaches every session. The repository also guards each cause after its second occurrence, so an entry can earn at most one lookup hit, usually within days.
- **Holds: the reasoning half depreciates on the release clock.** Cached how-to-solve reasoning is worth only what the consumer cannot work out itself. The mid tier has matched the previous top tier within 6 days to 3 months at every recent release. This repository's own co-author model changed five times in 162 days. Published memory gains shrink as the consumer model gets stronger. Nothing in the design invalidates an entry when models change.
- **Holds: payback and proof are slower than the release clock.** Generous inputs give a payback of 4 to 10 months. Realistic inputs give 7 to 12 years, or never. Telling a 5 % hit rate from 15 % needs about 52 encounters. Showing "Sonnet plus library equals Opus" needs over a thousand tasks per arm. A new mid tier arrives every 90 to 141 days.
- **Dissolves: prompt caching as an incumbent.** Caching makes re-reads cheap. It does not avoid working a problem out again, which is what the library is for. It discounts the library's savings and its costs by the same factor.
- **Missed by the lead (new):** (a) The lookup trigger is coupled to the gap that releases close. The store looks up "before escalating". A stronger mid tier escalates less, and what it still escalates is the novel work that has no entry [A]. (b) The repository has had no product commits since early August. The library's triggers fire on product defects and build errors, so its encounter stream is currently zero while the release clock keeps running [M].

## 1. The incumbents, tested one by one against the best form

| Incumbent | What it already does | Survives the best form of the library? |
|---|---|---|
| CI and pre-commit checks | Deterministic. Runs before the symptom, on every change, for humans and agents, at zero model tokens. | Yes, for every entry that can return `applies`. See issue 1. |
| The repository's fix-then-guard loop | Each repeated cause in history ended with a structural guard: a dependabot ignore, a bootstrap test, a CLAUDE.md trap, or a library switch (KS-C10). | Yes. It caps lifetime hits per entry at one. See issue 1. |
| CLAUDE.md (always loaded) | Pushes traps and invariants into every session, including sessions that never look anything up. | Yes for reach. The cost is about 3.1k tokens per call for the durable sections, and adherence falls past about 200 lines (now 390). This is the one real opening for a pulled store. |
| `git log --all --grep` over commit bodies | The strongest historical repeat was findable 8 hours before it recurred. | Already a pilot arm with a kill rule in the design. Known; not presented as new. |
| Provider prompt caching | A cache read costs 0.05x of fresh input on Opus 5.5 and Sonnet 5.5 [V]. | Dissolves as an issue (section 6). |
| Vendor memory tools and skills | Claude Code auto-memory, skills (the owner has 13 packages on PR #185). SkillsBench: human-curated skills +16.6 points on average [M]. | Incumbent only for generic, cross-project know-how. Folded into issue 2 (E4). |
| **The next model release** | Each new Sonnet roughly equals the previous Opus [V]. | Yes. This is the incumbent the expectations leave out. Issues 2 and 3. |

## 2. Fresh measurements on this repository (read-only)

**Repeat timing** (the KS-C10 pairs; `git log` dates on main):

| Pair | Gap | Commits between | How it ended |
|---|---|---|---|
| expo-audio `stop()` (dbb3661 → d440855) | 5.2 h | 8 | library switch |
| `NoReferencedTableError` (2f09cec → f29f62f) | 7.9 h | 21 | bootstrap test; first body held the error token |
| mypy re-export (75b51f9 → 981ae08) | 31.6 h | 36 | self-diagnosing; CI mypy |
| press-race guard (789d522 → 0a3b38e) | 6.4 d | 25 | shape-level; a checklist serves |
| Sentry plugin, ex8 (a6f9048 → 6928828) | 16.0 d | 64 (first fix stranded off main) | CLAUDE.md trap; D17 CI check proposed |
| Expo SDK-52 pin drift (b7a5b98 → 6928828) | 22.7 d | 192 | dependabot ignore |

Median gap is about 3.9 days. Three of six came back within 32 hours. In this list no cause appears a third time. Every pair ended with a guard. [M; based on the refuters' pair list, not an exhaustive audit.]

**Who wrote the "top-model reasoning"** (Co-Authored-By trailers, all refs) [M]: Opus 4.8 (first seen 31 May), Opus 4.7 (1 to 3 June), Fable 5 (10 June), Opus 5 (27 July), Opus 5.5 (23 September), Fable 5.1 (31 October). That is six distinct top-tier models in 162 days. The current lineup adds Fable 5.2.

**Activity** [M]: main had 208 commits in June, 153 in July, 6 in August, and none since. There were 19 fix commits in June, 29 in July, 2 in August, and none since. All later commits are program documents.

**CLAUDE.md** [M]: 29,605 characters, about 7.5k tokens. The durable-fact sections (Invariants, Build and deploy traps, Do NOT assume) are 41 %, about 3.1k tokens per call. Across FixFlow's 14,647 calls that is about 2.1 % of its 2.13 B context tokens [D].

**Release clock** [V, F6]: mid-tier gaps were 141, 133 and 90 days (Sonnet 4.5 → 4.6 → 5 → 5.5). The time for a mid tier to reach the previous top tier went from about 3 months to 2, 3, 1, then 6 days. Opus:Sonnet price per token went 5:1 (4.x) → 1.67:1 (Opus 4.5 to 4.8 against Sonnet 4.6) → 2:1 (5.5). Expo ships three SDK versions a year, each supported for about a year (Expo docs, checked today). This repository pins SDK 52, five versions behind.

## 3. Issue 1: what keeps its value already has a better home

**What lasts however good models get.** No model can derive these by reasoning:
(a) repository data or config traps (ex7's empty `eas.json` value, ex8's plugin, ex2a's duplicate revision);
(b) vendor and operator facts (EAS, Railpack, Supabase pooler, `railway up` from the repo root, "`expo export` bundles JS only");
(c) owner decisions and negative results (the login lock must block a correct PIN; Supabase chosen as Postgres only);
(d) project state (which fix is on main, what is deployed).

**Where each part already lives, and why that home beats a pulled lookup.**
- (a) **CI.** By design, only entries whose matched value is itself the root cause can return `applies` (L272). That is exactly what a lint checks deterministically, before the build burns, at zero model tokens, with no retrieval step to miss. D17 (L716) promotes ex7's and ex8's probes into CI as "the ITIL permanent fix". Yet L41, L520 and L524 name those same traps as the store's realistic v1 value, which "CI cannot see". After D17, CI sees them. The design's realistic v1 value is the class its own D17 removes from it.
- (b) **CLAUDE.md, HANDOFF §2, and wrapper scripts.** The design cannot detect a vendor-side change (§5.5). It caps causes outside the repository at `inconclusive` (limit 1). So for exactly the facts that outlast model releases, the gate and code-bound staleness add nothing. Operator hazards are reached only by the wording-based `action` handle (L522), and CLAUDE.md reaches every session anyway.
- (c) **CLAUDE.md invariants (10.3k characters) and D17's caller-pin test.** A do-not-apply entry acts only through a protective test, which is CI.
- (d) **Git.** `is-ancestor` and the deploy record already answer this.

**The fix-then-guard loop caps lifetime hits.** History shows a guard after the second occurrence, and no third occurrence. So an entry can earn at most one lookup hit. That hit comes a median of about 4 days later, 8 to 64 commits after the first fix in five of six pairs: while the knowledge is still in the session, the recent log or a fresh commit body. V2's rule "an entry seen three times is proposed as a lint" (V2 §0) would never have fired in this history, because the team guards sooner.

**Best fixes a competent team would try:**
1. *Promote every checkable entry to CI at write time.* This removes the duplication. But the lookup then earns nothing for that class: the saving belongs to CI, which is the repository's existing practice. → partly.
2. *Move durable narratives out of CLAUDE.md into the pulled store* (KS-7 trim). This saves at most about 3.1k tokens per call (about 2 % of FixFlow context). In return, the trap disappears from sessions that never look up, and those are the unknown-unknowns a trap exists for. → fails as a free win. It is a trade: about 2 % of tokens against reach.
3. *Add a push channel* (a hook on error text or on the edit). This raises reach for the symptomatic class. But a pre-commit hook or CI step does the same for checkable traps, deterministically and for humans too. → partly.
4. *Share entries across projects* so that each entry gets more than one chance to hit. Only vendor or generic entries transfer, and they are version-bound (three Expo SDKs a year), public, and so likely to reach the next model's training data. → partly. It raises hits only for the class that depreciates (issue 2).

**What survives the fixes.** CLAUDE.md cannot grow forever: adherence falls past about 200 lines and it is at 390. So a pulled index for the overflow of durable prose is a real need. That job is smaller than this design. It is a ranked, abstaining search over prose, and for vendor facts the gate and staleness machinery does not apply.

**Hits:** E1 caps (the lookup's share of savings is confined to causes that are not checkable, not in CLAUDE.md, not findable by grep, and not yet guarded: in this history at most 2 of 6 pairs, both arguably served by the same session or a checklist). E4 caps (the lasting part is bound to this project). E5 is moot where it is accurate: the class where lookups can be exact is the class CI already holds.
**Already in the design:** partly. D17, limit 10, L524, and the judges' blind spot on the CLAUDE.md trim are there. The consequences are not drawn: D17 empties the v1-value class, one hit per entry is the ceiling, and repeats come within days.
**Falsifier:** a KS-0 audit or replay that finds 3 or more same-cause repeats that were not machine-checkable, not in CLAUDE.md or HANDOFF, not grep-findable, and recurred more than about 50 commits after the first fix. Or any cause seen three times.

## 4. Issue 2: the reasoning half depreciates on the release clock

**Mechanism.** A cached conclusion is worth what the consumer would otherwise get wrong or spend.
- Published memory gains shrink as the consumer gets stronger [M, cross-study]:
  - ReasoningBank on SWE-bench Verified: +4.6 points and −9 % steps for Gemini Flash, against +3.4 points and −6 % for Pro.
  - ExpGraph: +12.1 % against +4.5 % (static tasks) and +21.4 % against +12.7 % (agentic), smaller against larger executor.
  - Dynamic Cheatsheet: minimal gain for reasoning models.
- The harm from wrong memory does not shrink with strength. Compliance Trap: stronger agents lose more in absolute terms. Ghosh et al.: harm grew with executor size (both abstracts only).
- The lift shrinks 30 to 60 % per tier step [D]. The consumer moves up about one tier per mid-tier release (90 to 141 days). The reasoning half therefore has a value half-life of roughly 3 to 8 months [D on analogs, not measured here].

**The premise inverts.** Entries written by Opus 4.8 in June would today be read by Sonnet 5.5. Sonnet 5 was "close to" Opus 4.8, and Sonnet 5.5 beats Sonnet 5 by 21 points on CursorBench [V]. So the "better model" whose reasoning is cached is now likely the weaker one. Anchoring then works against the reader (ClashEval: models adopt wrong retrieved content over a correct prior more than 60 % of the time).

**Where the remaining gap lives.** Sonnet 5.5 against Opus 5.5 [V]: Terminal-Bench 4.0 +4.2, CursorBench −2.3, FrontierCode −8.2. The vendor says Opus is "still stronger on open-ended work". Open-ended work is novel by nature, so it has no recurring entry [A].

**A coupling the lead missed** [A]. The store looks up "before escalating to a higher tier" (L444). A stronger mid tier escalates less often. The escalations that remain are the problems it cannot solve, which are disproportionately novel. So the hit rate on escalation-triggered lookups should fall with each release.

**E4.** "Someone without the top model works as if they had one" is what the next mid tier delivers by itself, within about 3 to 4 months. At 2:1 the most that moving work from Opus to Sonnet can save is half the price; at the earlier 5:1 it was 80 %. What transfers between projects (generic know-how) is what skills and the next model's training already carry. What does not depreciate does not transfer.

**Best fixes:**
1. *Re-validate or re-author entries per model release* (AgentBrew: notes must be validated per student). → partly. It restores fit but adds a top-tier cost per release that grows with the corpus.
2. *Store only facts no model can derive; drop the reasoning.* → dissolves depreciation, but gives up E3's premise, and those facts have homes (issue 1).
3. *Add model id as an invalidation trigger.* The model id is already logged (L291, L432); an entry written by a model older than the consumer would be capped at candidate. → partly. It is cheap to build, but most of the corpus turns into candidates within one cycle.
4. *Run the cheap model at lower effort with the library.* → fails as evidence: effort settings already exist without a library, and nothing measures library plus low effort.

**Hits:** E3 is capped by the current tier gap on this repository's work (−4 to +8 points on vendor benchmarks), and that lift decays. E3 is also unknowable: telling 60 % from 70 % success needs 354 tasks per arm, and showing equivalence within ±5 points needs about 1,440 per arm [D]. The repository gives about 20 encounters per checkpoint. E4 is delayed into irrelevance on the generic side.
**Already in the design:** no. Invalidation is by code, dependencies and recipe only (§5.1). The model id is logged for analysis and never used to invalidate.
**Falsifier:** replay the six historical second occurrences with Sonnet 5 and with Sonnet 5.5, each with and without the entry. If the with/without gap does not shrink for the newer model, or Sonnet 5.5 alone still fails at least 10 points more often without the entry, this issue fails.

## 5. Issue 3: payback and proof take longer than one model generation

Formula (KS L690, best form): net per month = hits × (S − L_hit) − entries × write cost − overhead; payback = W / net.

Assumptions (stated; S has no prior):
- **W (build cost):** 10 sessions at 20 to 50 M context tokens each, so 200 to 500 M. This is generous to the library: measured sessions average about 152 M (FixFlow) and 159 M (a clinic slice).
- **Hits:** this repository produced 6 same-cause pairs over 2.2 product-active months. If every pair were a store hit, that is 2.7 a month (an upper bound). If incumbents keep the ones they already serve, it is 0.5 to 0.9 a month.
- **S (top-tier solve cost avoided):** 3 to 20 M context tokens per hit [G]. That is 10 to 65 calls at a slice session's 306k.
- **Best-form costs:** lookup through a hook with no extra turn; the diff arm in CI; the entry written inside the solving session at 0.4 M; 7 entries a month; L_hit 0.35 M for the verify agent.
- **As designed:** a turn per lookup, three `--diff` turns plus a reviewer per phase (about 1 M per phase), and writes at 0.8 M.

| Scenario | Net per month | Payback |
|---|---|---|
| Best form, all 6 pairs hit, S = 20 M, W = 200 M | 50.8 M | 3.9 months |
| Same, W = 500 M | 50.8 M | 9.8 months |
| Same, W at the measured session mean (about 1.5 B) | 50.8 M | about 30 months |
| Best form, 2 store-only hits, S = 10 M, W = 500 M | 6.0 M | 84 months |
| Best form, 2 hits, S = 5 M, W = 200 M | 1.4 M | 140 months |
| Best form, 1 hit, S = 3 M | −1.6 M | never |
| As designed, 6 hits, S = 20 M, W = 500 M | 39.3 M | 12.7 months |
| As designed, 2 hits, S = 5 M | −9.3 M | never |

With the reasoning half's 3 to 8 month half-life (issue 2), the mid case earns 26 to 69 M over its whole life against a 200 to 500 M build. It never pays back. Only the corner where every historical repeat becomes a 20 M hit pays back within about one release. The encounter stream that would feed even that corner is zero today: no product commits since August.

**Proof is slower still** [D, exact binomial].
- The kill rule ("fewer than 3 hits in 20 encounters") kills a store at break-even (h = 0.15) 41 % of the time. It kills a useless one (h = 0.05) 93 % of the time.
- Separating 5 % from 15 % needs 52 encounters (α 0.05, power 0.8). Separating 10 % from 20 % needs 78. "20 encounters could take 7 to 20 phases" (X-05), so 52 encounters take roughly 18 to 52 phases. That spans at least one and probably several mid-tier releases.
- Over that span S, the escalation rate and the consumer's response all change, so the pooled estimate mixes model regimes.

**Best fixes:**
1. *Build minimal*: structured notes plus grep, no gate and no engine. W drops to about one session and payback is quick. But that is the incumbent (CLAUDE.md and commit bodies) with a schema, and the gate and staleness machinery is gone. → partly. It is a trade.
2. *Pool encounters across projects to reach 52 faster.* Entries are bound to this repository (control pairs are its shas; F1 §9), so pooled h averages different libraries. → partly.
3. *Zero-token replay of history first* (KS-0). It gives a prior for h, but neither S nor the consumer effect. → partly. It is already in the design.
4. *Re-measure S per model and restart the clock at each release.* This is honest, but at this encounter rate the measurement never completes. → fails.

**Hits:** E1 and E2 are delayed (payback from about 4 months at best to never). E1 and E3 are unknowable inside one release cycle.
**Already in the design:** partly. The break-even formula, W at about ten sessions, and the X-05 note that 20 observations cannot separate 15 % from 5 % are there (the last in the lane evidence, not the design text). There is no comparison with the release cadence and no decay term.
**Falsifier:** KS-9 measures S of at least 20 M per hit, with at least 2 verified hits a month, and a per-hit saving that does not shrink across one model release.

## 6. What dissolves

- **Prompt caching as an incumbent.** Caching cheapens re-reading the same prefix. It does not avoid working a problem out, which is the library's job. Both sides of the library's ledger are mostly cache reads: the exploration it avoids is carried about 50 passes, and the lookup turn re-reads the caller's context. So caching discounts savings and costs alike. In the owner's unit (tokens counted) caching changes nothing. The separate unknown of how cache reads count against usage limits is already known.
- **Vendor memory tools as a separate issue.** None does verified applicability. The API memory tool is not a Claude Code feature, and there is no independent evaluation. Their real role (generic, cross-project know-how) is covered under issue 2.
- **"The price ratio collapse makes the library pointless."** In tokens, E1 does not depend on price. The ratio matters only for the money headroom of E3 and E4, which issue 2 covers.
- **`git log --grep` and the CI duplication of Docker checks.** Both are already in the design: a pilot arm with a kill rule, and limit 10. They are not new.

## 7. Which part keeps its value, and does it need this design?

| Part | Keeps value as models improve? | Decays on | Existing home | Needs this design? |
|---|---|---|---|---|
| How-to-solve reasoning, diagnosis paths | No | the model clock (about one tier per 90 to 141 days) | commit bodies | The gate and staleness fit it, but its value decays faster than it pays back |
| Repo data and config traps | Yes | code change | CI or pre-commit (D17) | No: CI dominates |
| Vendor and operator facts | Yes, until the vendor changes | the vendor clock (Expo: 3 SDKs a year) | CLAUDE.md, HANDOFF §2, wrapper scripts | No: the design cannot see their staleness |
| Owner decisions, invariants | Yes | owner decision | CLAUDE.md, protective tests | No, except for overflow once CLAUDE.md is too long |
| Negative results | Mixed: environment ones last, reasoning ones decay | both clocks | commit bodies, W2 notes | Partly: a footprint helps for repository-bound ones |

The lasting part does not need this design. The part that needs this design does not last.

## Sources checked today
- Expo docs, SDK reference: "new SDK versions come out three times a year": https://docs.expo.dev/versions/latest/ ; SDK 57 changelog (30 June 2026): https://expo.dev/changelog/sdk-57
- All other figures: fact sheets F1 to F6, the KS design (lines cited), V2 §0, and `git log` on this repository (script `d5-calc.js` in this folder).
