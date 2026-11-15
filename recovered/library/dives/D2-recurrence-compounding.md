# D2. Recurrence, compounding "over time", and new work (E1, E4)

Read-only dive. Inputs: fact sheets F1 to F6, the KS design (v1.3.1), HARNESS-V2 §0, and four cheap measurements over `main` (scripts in this folder). Tags: [M] measured here or in a cited source, [D] arithmetic on measured or cited numbers, [G] guess, [A] argument only.

Terms used below.
- **Entry**: one solved problem in the store (symptom, cause, failed approaches, fix, check).
- **Verified hit**: a lookup whose check returns `applies`, meaning the cause's condition is present in today's code. Only then may anyone act on it (KS L305, L434).
- **Candidate**: a match the check cannot confirm. It is advice, not a licence to act.
- **Control pair**: two commits of this repository. At one the check must find the cause; at the other it must not (KS L276).
- **Promotion**: turning an entry's check into a lint, test or CI gate, after which the entry retires (KS D17, L716; V2 L81).
- **r**: share of hard problems that are repeats of an earlier one. **v**: share of those repeats whose entry can return `applies`.

## 0. Verdict in one paragraph

The lead mostly stands, with two corrections. What it gets right: the verified part of the library cannot build up, because anything a machine can check against the code is cheaper as a CI check, and both designs already send it there. Repeats also come in short bursts, hours to days after the first fix. So the hit rate follows the flow of new problems, not the size of the stock. And repeat-defect work is about 1 % of spend. What it misses or overstates: build work really does repeat. 40 % of code commits follow one of six file shapes [M]. But only about a fifth of the lines in those files are shared shape [M]. That shape is already carried by the instruction file, the architecture doc, the skills and the sibling code. It levels off after a handful of recipes. Recipes that models write for models test null to negative on coding work. One thing does recur at session rate: the project facts that every new session lacks. That stock does grow, but the always-loaded file and the index half of the library serve it. It is not the top model's reasoning, and it needs no defect to recur. For a new project, what carries over is shared shape (templates already do this) and generic lessons (current models mostly know them already, or they are tied to a tool version). Four issues survive. Two lead items dissolve.

## 1. Measurements (all read-only, `main` only)

| What | Result | Script |
|---|---|---|
| Commits on main | 368 total, 233 non-merge, 219 touch code, 14 docs-only; 2026-05-31 to 2026-08-03 (63.8 days) [M] | `D2-recipes.js` |
| Fix commits | 50 non-merge (subject `fix`/`@ fix`); 11.5 % of added code lines (lockfiles and docs excluded); 23 % of code commits [M] | one-liner + `D2-recipes.js` |
| Recipe shapes | 88 of 219 code commits (40.2 %) match at least one of six file shapes: new migration (44), router+service edit in one slice (44), new mobile feature file (22), new backend slice (12), outbox change (10), new web feature (3). They carry 75.5 % of added code lines [M] | `D2-recipes.js` |
| Shared shape inside recipe files | Share of a file's meaningful lines that occur in at least half (or a quarter) of its peers: migrations 26 % / 31 % (46 files); router 23 % / 36 %; service 7.5 % / 13 % (largest files, mean 395 lines); repository 20 % / 29 %; schemas 7 % / 15 %; models 35 % / 40 %. Line-weighted over all groups: 19 % / 25 % [M] | `D2-boilerplate.js` |
| Instruction-file churn | CLAUDE.md touched by 22 of 233 non-merge commits (9.4 %) [M] | `D2-recipes.js` |
| Fix footprint churn (file-level proxy) | Of 50 fix footprints, the next commit touching one of its files came within 1 day for 21, within 7 days for 31, within 30 days for 41; 9 never. Median 0.71 days (3 commits). Median 5 later touches per footprint, p75 10, max 37. Footprint files gone from main: 3 of 247 [M] | `D2-staleness.js` |
| Fix-to-merge lag | Median 0.7 h, p75 27.5 h, p90 64.8 h (43 fix commits reached via a merge) [M] | `D2-mergelag.js` |
| Repeat pairs (dates from git) | NoReferencedTableError 8 h apart, different files; expo-audio `stop()` 5 h, same file (a wrong first fix, not a recurrence); mypy re-export 1.3 days, different file; press-race guard 6.5 days, sibling file; Expo SDK-52 pin drift 23 days, same file (`package.json`) [M] | `git show` |
| Guard landed with the second occurrence | Pin drift: `6928828` edits `.github/dependabot.yml`. NoReferencedTableError: `f29f62f` adds `tests/test_app_bootstrap.py`. expo-audio: `d440855` swaps the library. mypy: CI's strict mypy was already the guard [M]. F2 records a guard for every counted repeat | `git show` |
| A class burst | Six import-surface fixes (re-export, registry import, slice boundary): `75b51f9`, `981ae08`, `2f09cec`, `c3754dd`, `f29f62f` on 07-07/07-08, right after `cfd6021` (tenancy slice, shop_id FKs on 8 tables, 07-07), and `82611de` on 07-26. Each in different files. At least three were caught by CI tooling with a message that explains the fix; one reached production (`f29f62f`, login 500) [M] | `git log` |

What the repetition does and does not imply. It shows that build work has a procedural skeleton: which files, in which order, under which rules. It does not show that the skeleton is a large share of the work. Inside the files that follow a recipe, about 75 to 81 % of the lines are new content (service logic, schemas, migration bodies). And the skeleton is what one read of a sibling file teaches.

## 2. The lead, item by item

**(i) What recurs is the class, not the instance. Stands [M].** Of the four true repeats, one was in the same file (the pin drift, a config regression). Three were in different files. KS's own refuter found the fix-diff detector sees 1 of 4 same-cause pairs and 12 of 45 seed pairs share a file (F2, KS-V3). The import-surface class hit six different file sets in 20 days. An instance control pair is bound to the original commits and spans, so it cannot confirm a class repeat elsewhere. A class-level check either is decidable from code, which makes it a lint (see issue 1), or it is not, which makes it advice. KS already caps code-behaviour probes at candidate (L272).

**(ii) The success path drains the library. Stands, and it is stronger than the lead says [M].** The v2 rule promotes after three sightings (V2 L81). History promoted at the second: in every pair checked, the guard landed in the commit that fixed the second occurrence. Of the three seed entries that can return `applies` without Docker (ex7, ex2a, ex8; KS L495), two are named for promotion into CI by D17 (L716). The third is a parsed-data check of the same kind, a uniqueness test over 46 migration files.

**(iii) The repeat rate belongs to the workload. Stands [M + cited].** 3 to 5 same-cause repeats among 48 fixes is 6 to 10 % raw. The strongest one was findable with `git log --grep` (F2). Published rates depend on the definition. Fixes that could be rebuilt from past fixes in the same project: 2.1 to 3.2 %. Bugs involving repeated fixes: 15 to 20 % (unconfirmed). Duplicate bug reports: 2.7 to 10.4 % (F5 H1, H2). Perfect retrieval cannot push the hit rate above r. It can only lose hits below it.

**(iv) Most spend is not defect diagnosis. Stands, with numbers [D].** Cost-weighted work types (F3 §2, a proxy for tokens): harness-meta, design and research about 50 %. Implementation, testbed, product and mixed work about 45 %. Fix commits are 11.5 % of added code lines and 23 % of code commits. So fix work is roughly 5 to 10 % of spend, and repeat-defect work is 0.3 to 1 % (up to about 2 % at the literature's 20 % high end). The lead's "new project is mostly new code" also holds: 75 to 81 % of the lines in recipe files are new content.

## 3. The strongest counter: recipes for build work

**Is there repeated procedure? Yes [M].** 40 % of code commits follow one of six shapes, and those commits carry three quarters of the added lines. Plan caching (APC) and workflow memory (AWM) made their gains on exactly this kind of structure.

**What a recipe layer adds over what already carries recipes.** The repository already holds them in four places:
- CLAUDE.md, always loaded, about 7.5k tokens. It holds the slice layout, migration rules, invariants and commands, and 9.4 % of commits edit it.
- ARCHITECTURE.md "Adding a new feature": the slice rectangle, and "new ORM models are registered in `app/registry.py`".
- PLAYBOOK, CODE-MAP, and 13 skills plus 11 agents on PR #185.
- The sibling files themselves.

The shared shape is 19 to 25 % of lines, and one sibling read delivers it. A recipe that replaces that read saves its carrying cost only if the agent then does not open the sibling anyway, and it usually must open it to match the real code. Generous bound [D, G]: recipe commits 40 % × code-adjacent spend 45 % × fetched share 26 % × half of that being structure = about 2.3 % of spend. That is before taking out what the incumbents already provide.

**Does a recipe stock compound? No [M + A].** Six shapes cover every recipe commit. After the first instance of each, the sibling is the recipe. The stock levels off at a handful, and each further recipe adds less. Recipes also go stale with the project. Head numbers, `*_paisa` versus `*_minor`, and the NOT VALID FK rule all changed during the history, and CLAUDE.md is edited every tenth commit.

**Does recipe knowledge prevent build defects? The repository says no [M].** The import-surface class repeated six times in 20 days, five of them within two days of one structural change. The rules that would have prevented it were already written in ARCHITECTURE.md and CLAUDE.md. CI tools caught it, not the text. Recipe knowledge does not stop slips. Checks do.

**Recipes written by models for models [cited].**
- LLM-written repository context files changed success by −0.5 points on SWE-bench Lite and about −2 points on CTXbench, and raised cost 20 to 23 %. Developer-written files gave about +2.4, which is not significant (F5 B1).
- SkillsBench: human-curated skills gave +16.6 points on average. Secondary reports put software engineering at only +4.5, and self-generated skills at about −1.3 (unconfirmed, F6).
- AWM's +51 % relative is on WebArena, whose tasks are built from shared templates, against a no-memory baseline (F4).
- APC's −50 % cost comes from replacing a large planner's calls. Here output is 0.75 % of tokens and 96.8 % are cache reads of context (F3), so the plan is a small slice of the cost.
- ExpeL and Dynamic Cheatsheet used 3x to 5x more tokens per task (F4).

The supported gains come from templated workloads against empty baselines. Coding evidence with incumbents present is null to small, and negative when models write the recipes.

**Net.** A recipe layer is real but small. It is a one-off gain over incumbents. It does not give the library a stock that compounds. For E4 its portable form is a template repository, which is a known technique and needs no reasoning cache.

## 4. Stock and flow, with numbers

**Inflow.**
- Seed: about 20 solved entries, 21 traps and about 15 from the worked examples, so about 55, plus about 60 negative results. Three of these can return `applies` without Docker (KS L488-495).
- New entries: "a few per phase" over about 40 phases, so about 80 to 160 (KS L123).
- History: 50 fix commits in 64 days. If 30 to 50 % meet the write rule [G], that is 15 to 25 entries per 64 days, about 2 to 3 a week. V2 guesses 4 per merged slice [G].

**Outflow and decay.**
1. *Instance closure, by construction.* Merging the fix makes the instance probe read "absent" on main. After that, the entry can return `applies` only on three routes. A same-place regression happened once in history (the pin drift). A fix stranded off main happened once (ex8). A class repeat elsewhere happened three times, and the instance probe cannot confirm it.
2. *Promotion.* In history the guard landed with the second occurrence every time. The design promotes at three sightings (V2) or after verification (D17). Either way, each entry yields at most about one or two verified hits.
3. *Staleness.* This is not removal: the entry is re-checked on lookup and re-stamped if its controls still flip (KS L344). But it is fast. 21 of 50 footprints changed within a day and 41 within 30 days. The median footprint was touched 5 more times in about two months. Every touch is a re-verification on the next lookup. Docker checks take 1 to 5 minutes. A refactor that breaks the controls needs two Opus sessions to repair (KS L350).

**Stock.** It grows roughly linearly, mostly in dormant entries: never hit, never promoted, fixed in place.

**Hit rate at steady state.** Per hard encounter, h ≈ r × v.
- r: 2 to 10 %. Raw 3 to 5 of 48 gives 6 to 10 %. KS's own counting rule (not findable by grep, not trivial) lowers it. The literature's closest definition is 2.1 to 3.2 %.
- v: about 0.25. One of the four true repeats (the dependency pin) is a data-value check that can return `applies`.
- So verified h ≈ 0.5 to 2.5 % [D]. Counting candidates as hits, 2 to 10 % [D].
- This rate does not rise with stock size. Repeats arrive 5 hours to 23 days after the first fix (median about 1.3 days), so the recent inflow serves them, not the old stock.
- V2's model assumes the opposite shape: hit = 0.25 × n / (n + 20), which rises from 0.05 at 5 entries to 0.22 at 133 entries [D]. That curve measures a different quantity (share of lookup steps spared), but its shape is the compounding assumption.

**Against the design's own decision rules [D].**
- KS-9 kills the store on fewer than 3 verified hits in 20 encounters. At verified h of 0.5 to 2.5 %, the expected number of hits in 20 encounters is 0.1 to 0.5, and P(at least 3) is 0.0 to 1.3 %.
- Even if every repeat were verified (h = 6 to 10 %), P(at least 3) is 12 to 32 %.
- The design's own illustrative break-even is h ≈ 0.15 (F2, inputs guessed). The workload sets h below it by an order of magnitude, whatever the retrieval quality.

## 5. Issues that survive

### Issue 1. The verified stock drains through its own success path (verify-or-promote squeeze)

- **Claim.** An entry that a machine can confirm against current code is, by that very fact, a cheap CI check. Both designs promote it, after which the defect stops arriving. An entry that cannot be confirmed is advice. So the set of entries that both return `applies` and keep paying stays near empty.
- **Mechanism.** Verification and promotion use the same thing: a decidable condition on the code. If the condition is decidable from code, a lint, test or gate decides it on every PR, for every agent, at no lookup cost. That beats a pull lookup by any cheaper model. This is why history guarded every repeat at its second occurrence, and why D17 promotes ex7 and ex8. If it is not decidable (races, data state, outside resolvers, code behaviour without a test), KS caps it at candidate. Class-level generalisation does not escape this: a decidable class check is a lint, and an undecidable one is advice. The only middle ground is checks that need the live environment (prod data, Docker). KS caps those at candidate too (L279).
- **Evidence.** 3 of about 55 seed entries can return `applies` without Docker, and D17 names 2 of the 3 for CI. Guards landed with the second occurrence in every pair checked. 1 of the 4 true repeats was lead-capable. At least 3 of 6 import-surface repeats were caught by CI with a message that explains the fix, so the solve cost avoided S is about zero.
- **Best fixes.**
  - Do not promote, so that hits keep coming: fails. Prevention saves the whole encounter, so the owner loses tokens.
  - Count the promoted checks as the library's product: partly. It is real, but the saving is then prevention, capped by recurrence (issue 3), and the "fix plus guard" habit already does it without a store.
  - Keep the entry as the story behind a CI failure: fails, because the CI message already names the fix (S ≈ 0).
  - Generalised class entries: fails, as above.
- **Residual.** The verified layer is a short-lived staging area on the way to checks. What the library holds for the long term is unverified advice, which is exactly where weaker models copy wrong memories (F5 A1, C1, C3). That hits E3, and it makes E5's verified accuracy apply to almost nothing.
- **Expectations hit.** E1 capped. E3 raises cost and risk. E5 made moot for verified hits.
- **Already in the design?** Partly. D17 and V2 "Lessons become checks" say promotion happens. Neither draws the consequence that the verified stock cannot accumulate (F1 §6: "does not state the effect on corpus size").

### Issue 2. The hit rate follows the flow of new problems, not the size of the stock (no compounding)

- **Claim.** Repeats arrive in bursts hours to days after the first fix, then a guard ends them. So the hit rate is set by recent inflow and by r. Old entries sit dormant. A larger stock does not raise the hit rate, and "over time" adds maintenance but not hits.
- **Mechanism.**
  - Measured repeat gaps: 8 h, 1.3 d, 6.5 d, 23 d (median about 1.3 d). Five of the six import-surface fixes came within 2 days of one structural change.
  - Guards end the class.
  - Footprints churn: median 0.71 days to the first change, 41 of 50 within 30 days, a median of 5 later touches.
  - So an entry is most useful in its first days and is suspect after that.
  - Steady-state verified h ≈ r × v ≈ 0.5 to 2.5 % per hard encounter, flat in stock size. V2's curve rises with the stock to 0.22 at 133 entries.
  - At this prior, KS-9's kill rule (fewer than 3 verified hits in 20) is expected to fire, with a pass chance of 1.3 % or less.
- **Best fixes.**
  - Better retrieval or embeddings: fails, because h ≤ r × v whatever the retrieval.
  - A push channel during bursts across parallel lanes: partly. It speeds up propagation inside a burst, but CI and the PR journal already reach every lane, and the fix-to-merge median is 0.7 h.
  - Broaden the write rule to record every fix: partly. It catches repeats whose first occurrence looked easy (mypy, `2f09cec`), at about 0.7M to 35M tokens per two months [D, G: 50 records at 14k each, up to a fresh Opus subagent of about 10 calls at 70k]. The upper end is about 1.6 % of FixFlow's recorded context tokens (a different period), the same order as the whole ceiling in issue 3.
- **Residual.** Long-gap repeats tied to rare events (SDK upgrades, deploy-target moves) might exist beyond 64 days of history. They would be checklist items, served by a runbook or skill, and they decay with tool versions.
- **Expectations hit.** E1's "over time" broken. E2 capped.
- **Already in the design?** Partly. "3 to 5 repeats" and "unproven" are admitted (V2 L90, KS L45). The time-clustering, the flat curve and the expected kill-rule outcome are not drawn, and V2's model assumes the opposite curve (V2 L56).

### Issue 3. Reuse of reasoning addresses about 1 % of spend; the parts that are large do not compound

- **Claim.** Re-deriving solved defects is about 0.3 to 1 % of spend (at most about 2 %). The library's large exposures are fetched reading and lookup-only calls, served by the code-edge and work-state halves. Scripts rebuild those from the code. They do not hold the top model's reasoning and do not grow with time.
- **Mechanism.**
  - About 50 % of cost-weighted spend is harness-meta, design and research. About 45 % is code-adjacent work.
  - Fix work is 11.5 % of added lines and 23 % of commits, so roughly 5 to 10 % of spend. Repeats are 6 to 10 % of that, giving 0.3 to 1 %.
  - Sensitivity: if a fix commit cost three times an ordinary commit, fix work would be about 21 % of spend and repeat-defect work 1.3 to 2.1 %. At the literature's 20 % repeat rate it would be about 4 %.
  - The 43.6 % lookup-only exposure is about reading current code and state. A code index is rebuilt in 0.2 s and is worth as much on day one as on day 300. So the half of the library that compounds is small, and the half that is large does not compound.
  - Decisions and findings do accumulate. They are what CLAUDE.md and the docs already hold, and nobody has measured whether sessions re-derive them.
- **Best fixes.**
  - Optimise lookups: fails, because the ceiling is the work mix.
  - Cache design and research conclusions too: partly. They are already cached as documents. The open question is whether sessions re-derive them, and nobody has measured it.
  - Turn the index into cached reasoning: fails by definition, because an index is regenerated, not reasoned.
- **Residual.** Any "massive" token cut from this library would come from index and state lookups, which do not depend on the top model or on time. That gain, if real, belongs to E5 and the index replay, not to E1's compounding.
- **Expectations hit.** E1 capped at a low single-digit share from the reasoning-cache part.
- **Already in the design?** Partly. KS L690: "repays itself only through h·S". V2 L86: "neither is a saving nor a ceiling". F3 §2 says there is no breakdown of tokens by work type. The work-mix ceiling is not drawn.

### Issue 4. A new project can reuse shared shape and generic lessons, and both are already covered elsewhere

- **Claim.** What carries over to a new project is shared shape (about 19 to 25 % of recipe-file lines, already carried by templates, skills and siblings) and generic lessons (mostly known to current models, or tied to a tool version). The valuable entries name this repository's own decisions and defects, and they are bound to its shas, paths and blobs.
- **Mechanism.**
  - CLAUDE.md is the curated distillate of this project's lessons. Of its 28 trap, invariant and do-not-assume items, 22 name this project's own design or defects (outbox, bill freeze, dispatcher, login lock, Railway layout).
  - 3 are generic knowledge a mid-tier model already has: integer minor units, NOT VALID/VALIDATE on populated tables, `compare_digest` failing on non-ASCII `str`.
  - 3 are tied to tool versions (an empty EAS env value, the Sentry Expo plugin, `expo export` not compiling native code).
  - KS entries are bound to 40-hex shas, blob OIDs and repo paths (F1 §4).
  - Cross-repository evidence: SWE-Exp's other-repo experiences gave +4 to 5 points at +7.5 % tokens and +25 % wall time. MemGovern's 135K cards gave +4.65 %. AgentBrew notes lost value even when moved to another student. Agent KB's transfer was asymmetric (F2, F4, F6).
  - The mid tier now matches the previous top tier within days to months (F6), which erodes the generic share.
- **Best fixes.**
  - A shared template repository for the same stack: partly. It is a real head start, but a one-off, about a fifth of the lines, and it is not a reasoning cache.
  - Generalise entries into portable lessons: fails. They become generic advice that models already hold, or that ages with the tool.
  - Share across projects at scale: partly. The best published result is single-digit points of success at higher token cost, the reverse of "faster and cheaper".
- **Residual.** Someone without the top model gains a template and a generic checklist. They do not gain the top model's judgement on new code, which is most of a new project.
- **Expectations hit.** E4 broken as stated (from zero to finished much faster and cheaper, as if they had the top model). E1 capped for build work.
- **Already in the design?** Partly. V2's refuter item 12 says KS is FixFlow-specific and that transfer is not shown. KS itself is silent on cross-project use (F1 §9).

## 6. What dissolved

- **Entries are not yet lead-capable when a burst repeat arrives.** Dissolves. An entry stays `pending_anchor` (candidate-only) until its PR merges (KS L452). The median fix-to-merge lag is 0.7 h (p75 27.5 h), so this bites only the quarter of fixes whose PRs stay open longer than a day.
- **Nothing recurs, so nothing compounds (the lead's narrowest reading).** Partly dissolves. Project facts and agent misconceptions recur once per session: "the things that keep biting" in CLAUDE.md. That stock grows with the project. But it is the always-loaded file's job, and the index and state halves serve it. It is facts, not the top model's reasoning, and it does not depend on defects recurring. Other dives own it.
- **Build work has no repeated structure.** Dissolves as stated (40 % of code commits follow six shapes). It does not rescue compounding (section 3).

## 7. What would settle each issue

1. In the KS-9 log, three or more verified hits come from entries that could not have become a small CI check, or a promoted entry keeps producing verified hits.
2. Tally verified hits by entry age, in the KS-9 log or in a history of at least a year. If 30 % or more come from entries older than 30 days, and the hit rate per encounter rises with stock size, compounding is real.
3. Label session tokens by work type. If diagnosing previously-seen defects is 10 % or more of tokens, the ceiling is wrong.
4. Run a new project on a cheaper model with the library, against the same model with only a template and an instruction file. A token or time cut of 20 % or more at equal quality would refute the issue.

## 8. New angles for other dives

- A model-written recipe layer is the cheapest version to test. The evidence predicts it does not help (LLM-written context files: −0.5 to −2 points, +20 % cost). That makes it a good negative control for the KS pilot.
- Issue 1's squeeze implies the library's lasting output is a pipeline that turns solved problems into checks, a Getafix-style product (F2 M03-F01). Its value is prevention, which can be measured from history without building a store: count repeats that a guard installed at the first occurrence would have stopped.
- The session-rate stock (project facts every session lacks) is the one that does grow. Pull or push for it is an E5 question.
