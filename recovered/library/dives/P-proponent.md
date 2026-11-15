# P: The proponent's case for E1 to E5

Role: make the strongest honest case that the owner's expectations can be met. Sources are the six fact sheets (F1 to F6), two checks I ran on the web today, and two read-only measurements I ran on this repository. Tags: [M] measured, [E] estimate, [T] target, [G] guess, [D] my arithmetic on tagged inputs, [A] argument only.

## 0. The short answer

The library can deliver real but moderate gains. Most of them come from recipes, checks and reused research, not from looking up old diagnoses. The best form pays where work repeats in shape: build slices, gate failures, build and deploy traps, research sources. It pays least where the owner spends half the budget: open-ended design, research and harness work.

| | Owner expects | What I would defend |
|---|---|---|
| E1 | Massive token cut | 6-18 % of all tokens at maturity; 15-30 % on build slices a recipe covers. Not 50 %+. |
| E2 | Much faster | 10-25 % shorter slice cycle on covered build work; hours saved on each of about 1-2 trap hits per quarter. A single response is not faster. |
| E3 | Sonnet = Opus | Parity at the gate on 30-60 % of build slices, if each entry is validated on Sonnet and a gate decides escalation. Not on design, research or a diagnosis with no hit. |
| E4 | Reusable across projects | A second project on the same harness reaches its first milestone with 15-30 % fewer tokens. Project-bound entries transfer close to 0 %. |
| E5 | Accurate, efficient lookups | Acted precision 92-99 % on gate-checkable entries; shown recall 50-75 % where entries have error text or recipe keys; one call per lookup. Recall has a floor that tuning cannot remove. |

## 1. Two measurements I ran

Scripts: `p-recipe.cjs` and `p-research-overlap.cjs` in this folder. Both are read-only.

**Recurring shapes in build work** [M]. Of the 233 non-merge commits on FixFlow's main branch, 48 add an Alembic migration (21 %), and 69 touch two or more backend slice layers (30 %). The full backend-slice shape (models, repository, router, schemas, service, test, migration) recurs 18 times. Coarse layer shapes seen at least twice cover 186 of 233 commits. A layer shape is not a plan, so this is an upper bound on how much a recipe could cover. It still shows that build work repeats in shape, which is the condition plan caching (APC) needs. A separate count: 4 of the 48 fix commits change only config (eas.json, native versions, Dockerfile). Two of those four are the SDK-52 repeat pair. This is the class the KS gate can prove declaratively, and it is the costly class (burned builds and deploys).

**Research repeats** [M]. Today's three literature sheets (F4, F5, F6) cite 43 distinct arXiv papers. 15 of them (35 %) were already in the owner's research record: the knowledge-store sweep lanes from early November, and the graph research in the harness evidence. For the memory topic alone (F4, F5) the share was 43-44 %. So research does repeat in this workload, within about ten days.

**One caution from the same check** [M]. The earlier record held a recheck that marked Dynamic Cheatsheet's "Claude 3.5 Sonnet AIME 2024 23.3 to 50.0" as "not confirmed" because it read only the abstract. I opened the paper today: the figure is in Table 1 under DC-Cu, and Section 4.2 states it. A cache would have frozen a wrong verdict. A research entry therefore needs the quote and the URL so a cheap check can re-confirm it, the same way a code entry needs its control pair.

**AgentBrew re-checked** [M]. On Terminal-Bench (64 test tasks): student alone 45.3 %, student with memory 51.6 %, teacher alone 50.0 %. No teacher-alone score on the other benchmarks. Notes brewed on another student "transfer ineffectively". The curator rejected 24-38 % of drafted notes.

## 2. The best form (the design a competent team could build)

1. **What is stored, five kinds.** (a) Recipes: a plan template per recurring slice shape (files, order, invariants, gate commands, known failure modes), written by Opus after it solves the first instance. (b) Solved problems, as the KS design has them. (c) Traps and do-not-apply facts, promoted into lint, test or CI checks whenever possible, so they cost zero tokens per use. (d) Research claims: claim, short quote, URL, date, the question it answered. (e) Work state and measured rates, as in harness v2.
2. **Admission per model.** Opus writes and a different Opus reviews. An entry becomes usable by a tier only after that tier, given the entry, passes the gate on a held-out instance. This is the measured-gain gate from Ghosh et al. and AgentBrew. The entry records the model and effort it was validated on. A model change triggers re-validation.
3. **Lookup at three fixed points, when the caller's context is small.** At session start: recipe and state. Before escalating: solved problems. At diff time: do-not-apply. Exact handles first (error templates, paths, slice type). An embedding plus reranker covers paraphrases but can return only a candidate. At most one lead is shown. Do-not-apply hits are pushed by a diff hook.
4. **A cascade, not trust.** Covered slices run on Sonnet at medium effort. A gate failure or a miss escalates to Opus. Tests decide, not the model's own confidence.
5. **Retirement.** An entry seen three times becomes a check and leaves the lookup path. Entries go stale when their footprint changes.
6. **Travel in three tiers.** Project-bound entries stay where they are (they name commit shas and paths). Stack-bound traps are keyed on package, version and config key, with probes that take no repository paths. Method-bound knowledge (harness scripts, planning recipes, research claims, rate priors) ships as a template repository plus a skills package. A receiving project re-validates both on its first slices.

## 3. Per expectation

### E1. Massive token reduction

**Case.** "Massive" (half or more) is not defensible for this owner's mix of work. A real 6-18 % overall is. The saving does not come from replacing a diagnosis at lookup time; repeats are 3-5 in 48 fix commits. It comes from three cheaper effects. Recipes cut exploration calls on recurring slice shapes. Lessons turned into checks cut review rounds. A research-claim cache stops sources being fetched again. APC shows cost falling 50 % where tasks repeat and a small model adapts a cached plan. But that is a price saving from routing, and in tokens the biggest levers here (the orchestrator window, the subagent prefix) are not library levers.

**Evidence.**
- APC: cost -50.31 % on average, -76.42 % on GAIA, overhead 1.04 %, hit rate 46 % at 100 entries (F4).
- AWM: 5.9 vs 7.9 steps on WebArena. ReasoningBank: 6-15 % fewer steps (F4).
- Here: 48 of 233 main commits add a migration; the full-slice shape recurs 18 times [M].
- Here: 15 of 43 sources gathered today were already held [M].
- v2's own model: at most 10.9 % at a 0.25 hit rate, about 7.5 % at steady state, on guessed inputs (F3 §6).
- 2.8 rounds per slice, 64 % of reviews send a slice back, 38 of 71 practised ideas failed as prose (F3 §8). Prose fails; scripts hold. That supports promoting entries into checks.
- Lookup economics [D]: a slice session is about 519 calls at about 306k, so about 159M tokens. One lookup at session start costs about one call at about 70k, plus 860 answer tokens carried over 519 calls (about 0.45M). One hit pays for itself if it removes two mid-session calls.

**Arithmetic behind the range** [D on tagged inputs, G where noted].
- Recipes on build work: lookup-only calls hold 43.6 % of tokens [E]. Recipe coverage of build slices 0.3-0.6 [G, bounded by the layer-shape count]. A covered slice skips 0.2-0.4 of its lookup-only calls [G, AWM and ReasoningBank step cuts]. Saving: 2.6-10.5 % of build-work tokens.
- Fewer rounds: rounds fall from 2.8 to about 2.4 if checks catch about a fifth of send-back causes [G]. Saving: about 8-12 % of build-work tokens.
- Build work is about 36 % of spend (implementation 12.8 + clinic testbed 14.7 + FixFlow product 8.1, cost-weighted; F3 §2). So 15-30 % on covered build work becomes about 5-11 % overall.
- Research is 10 % of spend. Skipping 35 % of sources saves maybe 10-20 % of research tokens, which is 1-2 % overall.
- Plan templates for the root planner: the root made 1,335 calls at about 499k, about 15 % of November tokens. If templates cut 20-30 % of them, that is 3-5 % overall.
- Total: about 6-18 %. It rises as the ship plan's 40-odd build phases make build work the larger share.

**Conditions of the evidence.** APC: repeated workloads, keyword-matched templates, a GPT-4o planner and a LLaMA-8B actor; savings mostly from routing. AWM and ReasoningBank: web tasks with shared templates, and savings measured in steps. Counter-evidence: ExpeL used 3x the tokens, SWE-Exp 7.5 % more tokens and 25 % more wall time, and Dynamic Cheatsheet 2.8-5x tokens per answer.

**Fit to the owner's workload.** Partial. Build slices repeat in shape, research repeats, and repeat defects are rare. About half of spend is harness, design and research work, where recipes barely apply.

**Defensible number.** 6-18 % of all tokens after six months or more and about 100 admitted entries; 15-30 % on recipe-covered build slices.

**Key assumptions.**
1. Recipes cover 30-60 % of build slices, and a hit skips 20-40 % of that slice's lookup-only calls.
2. Promoted checks cut rounds from 2.8 to about 2.4.
3. Lookups sit at session start (about 70k context), not mid-session (about 306k).

**Unanswered objections.**
- The biggest token levers (orchestrator window 39-74 % of cache reads past 200k; subagent prefix 47 % of FixFlow) are not library levers. Design admits: partly (v2 lists them as separate methods).
- The import-graph sample found 0 of 200 search steps likely saved. Recipes are not an import index, but no sample shows that recipes save steps either. Design admits: partly (HB §6, verdict withdrawn).
- Memory often raises tokens (ExpeL, SWE-Exp, Dynamic Cheatsheet). Design admits: no.
- A token cut may not cut limit stops: how cache reads count against the five-hour limit is unknown. Design admits: yes (TB caveats).

### E2. Much faster responses and build work

**Case.** A single response is not faster: a lookup adds a call. A slice can be faster, moderately, by three routes. When the token window binds first (the October fit is about 2.5 lane-hours), each token saved is work gained per window. Fewer rounds save check and review time directly (a check is 230-367 s, the median wait 409 s). And each trap hit saves a burned build or deploy, which is hours. Routing covered slices to Sonnet at medium effort also cuts thinking, which is 45 % of output. APC measured 27 % lower latency and AWM 25 % fewer steps. SWE-Exp shows the opposite (25 % more wall time) when retrieval is heavy.

**Evidence.** APC latency -27.28 %. AWM 5.9 vs 7.9 steps. Sleep-time compute: 5x less test-time compute on predictable queries, 1.5x on a 33-PR SWE case. Here: 4 config-only fix commits in about 65 days, two of them a repeat pair; median wait 409 s; check 230 s in a container; tokens are the first limit at the October window size.

**Conditions.** Web and tool benchmarks with repeated structure. Sleep-time compute gains track how predictable the query is; at high budgets standard compute scored better on SWE.

**Fit.** Good where tokens bind and slices repeat. Weak for design and research sessions, where time is thinking and reading the owner wants done.

**Defensible number.** 10-25 % shorter slice cycle on covered build work; 5-15 % more slices per token window overall; hours saved on each of about 1-2 trap hits per quarter [A for the hours: build and deploy durations are not in the fact base].

**Key assumptions.**
1. Tokens are the binding limit.
2. Rounds drop from 2.8 to about 2.4.
3. Lookups run off the critical path, at session start or in a background check.

**Unanswered objections.**
- Whether tokens or the check binds first depends on the size of the token window, which nobody knows. Design admits: yes (V2 §0 limits).
- SWE-Exp's 25 % slower wall time is the closest coding result, and it points the wrong way. Design admits: no.
- The trap hits that save hours are rare, and the strongest repeat was findable with `git log --grep`. Design admits: yes (KS §0, §9; F2).

### E3. Sonnet at lower effort performs like Opus

**Case.** The gap the library must close is smaller than it looks, and it shrinks on its own. Sonnet 5.5 scored 70.6 against Opus 5.5's 66.4 on Terminal-Bench 4.0, 55.5 against 57.8 on CursorBench, and 46.2 against 54.4 on FrontierCode (vendor). AgentBrew put a student with validated teacher notes at 51.6 against the teacher's 50.0 (I confirmed this today). ExpeL's GPT-4 insights lifted GPT-3.5 from 40 to 59. So parity is reachable on work that turns on repository knowledge rather than open reasoning: recurring slices whose invariants (money in minor units, NOT VALID foreign keys, outbox client ids) Sonnet would otherwise miss. That needs validation per model and a gate that decides escalation. It does not reach novel design, research, or a diagnosis with no hit.

**Evidence.** AgentBrew Terminal-Bench 45.3 to 51.6 vs teacher 50.0. ExpeL 40 to 59 (weaker reader). APC: a small planner keeps 96.61 % of large-planner accuracy. SkillsBench: human-curated skills +16.6 points on average (software engineering only about +4.5, secondary report). Release cadence: the mid tier came within a few points of the previous top tier in every generation, and the delay shrank from about 3 months to 6 days. Opus 4.5 at medium effort matched Sonnet 4.5's best with 76 % fewer output tokens.

**Conditions.** Tool and web benchmarks, one benchmark family at a time, open-weight or DeepSeek pairs. No paper ran Sonnet against Opus with a cache on real repository work. AgentBrew notes transfer poorly across students. Raw memory from a stronger model pushed weaker models below their own baseline (MemCollab).

**Fit.** Partial. Sonnet already makes 28 % of calls. Every one of the 48 historical fixes was done by a top-tier model, so there is no Sonnet baseline here. About half of spend is open-ended work, where the vendor says Opus is still stronger.

**Defensible number.** Gate-pass parity (within about 5 points) on 30-60 % of build slices. Across the whole workload, no. On uncovered work the gap stays the base gap: 2-8 points on vendor coding benchmarks, more on open-ended work.

**Key assumptions.**
1. Entries are admitted only after Sonnet-with-entry passes the gate on a held-out instance.
2. The Sonnet–Opus gap on this repository's build work is close to the vendor benchmark gap, not larger.
3. The gate and tests decide escalation, not the model's self-assessment (agents that succeed 22 % of the time predict 77 %).

**Unanswered objections.**
- No study measures Sonnet with an Opus cache against Opus on real repository work. The best evidence is one pair on 64 tasks. Design admits: yes (KS §9 item 16).
- A moving baseline: each new Sonnet closes most of the gap without a library. Entries validated on the old model must be re-validated, and stronger agents lose more to wrong memory (Compliance Trap; Ghosh: harm grows with executor size). Design admits: no.
- Lower effort is a separate variable. The library cannot supply thinking that the task itself needs, and Opus at medium effort may use fewer tokens than Sonnet at high. Design admits: no (effort is never discussed, F1 §10).
- Experience-following: weaker models copy similar records, including wrong ones. Only strict admission avoids it. Design admits: yes (KS §9, M02-28).

### E4. Reusable across projects; zero to finished on lower models

**Case.** The KS core does not travel: its footprints, control pairs and handles name this repository's shas, paths and blobs. Two other layers do. Stack-bound traps can be keyed on package, version and config key and shipped as checks: an empty env value breaks eas.json, the Sentry plugin breaks Gradle, RAILPACK builds the wrong app from the repo root, compare_digest raises on non-ASCII input. Method-bound knowledge travels to any project: harness scripts, planning and gate recipes, research claims, rate priors. Harness, design and research work were about half of spend here, and 35 % of today's sources were already held. The transfer evidence is cross-task, not cross-repository: Agent KB, Memento (+4.7 to +9.6 out of distribution), ExpeL (63 to 70), SkillsBench. A user without the top model gets the executable part, not the judgment.

**Evidence.** Agent KB: GAIA 55.2 to 61.2, transfer asymmetric. Memento +4.7 to +9.6 out of distribution. ExpeL HotpotQA to FEVER 63 to 70. AWM cross-domain step success 35.5 vs 18.6. Voyager skills carry to a new world. SkillsBench +16.6 with human-curated skills across 8 domains. Here: harness-meta 24.8 %, design 14.7 %, research 10 % of cost; 15 of 43 sources already held.

**Arithmetic** [D, G]. Project #2 saves on: harness-meta (24.8 % × 0.5-0.8 not redone) + research (10 % × 0.35 held) + design (14.7 % × 0.1-0.2). That is about 17-26 %, so 15-30 % at the first milestone.

**Conditions.** Neighbouring benchmarks of the same type. No cross-repository coding transfer with numbers exists. SWE-Exp excluded same-repository experience to avoid leakage.

**Fit.** Medium. One owner, one machine, two repositories that share the harness (the clinic repo is the harness testbed). The stacks overlap only partly (FastAPI against Django).

**Defensible number.** A second project on the same harness: 15-30 % fewer tokens to the same first milestone. Project-bound entries: close to 0 % transfer. A user without the top model avoids each catalogued trap (a burned build or an outage) but works at their own model's level on novel work.

**Key assumptions.**
1. Project #2 shares the harness and part of the stack.
2. Portable knowledge ships as executable artefacts (checks, scaffolds, validated skills), not prose.
3. Entries are re-validated on the receiving model and project (AgentBrew: notes transfer poorly across students).

**Unanswered objections.**
- Most of this saving is artefact reuse (a template repository, scripts, skills) that needs no lookup library. The library's own marginal share is the research-claim cache and the design rationale, about 3-5 %. Design admits: no (KS is silent on reuse, F1 §9).
- No cross-repository coding transfer has been measured, and transfer in Agent KB was asymmetric. Design admits: partly (refuter item 12: "transfer not shown").
- "Works as if they had the top model": the evidence says notes help a student that can execute the task. Where it cannot, notes "may appear plausible" to the teacher and still fail. Design admits: no.
- Stack versions move (Expo SDK 52, RN 0.76.9). Stack-bound traps decay as the receiving project upgrades. Design admits: partly (staleness by dependency change, KS §6).

### E5. Accurate, efficient lookups

**Case.** The precision of what is acted on can be made very high, because the KS gate does not trust retrieval: nothing acts until the check finds the cause's condition in today's code. The literature agrees that gated or exact matching beats similarity alone. APC's keyword match kept 96.61 % of accuracy where semantic caching lost heavily. vCache bounded error at 0.5 % with 41 % hits. Strict admission beat add-all (Xiong et al.). One retrieved item is optimal (k=1 in ReasoningBank and SWE-Exp), which matches one lead plus one candidate. Efficiency is a question of placement: a lookup costs one call at the caller's context, so it belongs at session start (about 70k), not mid-session (about 306k). Recall has a floor that optimisation cannot lift: problems that share no words with the entry, and problems the agent does not know it has.

**Evidence.** APC 96.61 %, overhead 1.04 % (1.31 % when nothing hits). vCache 0.5 % error at 41 % hits with a user bound. GPT Semantic Cache over 97 % correct hits (abstract). BM25F beat deep detectors on 5 of 6 bug trackers (Zhang). Duplicate reports sharing no terms: 5.1 % in both title and description. KS: 0 acted false positives in 40 probes bounds the rate at 7.5 % or less. The answer is capped at about 860 tokens and a miss line at 70-90.

**Conditions.** Caches for chat and search queries, not code. vCache assumes independent, identically distributed queries, and its error had not converged. The KS numbers are targets: the pilot is unbuilt.

**Fit.** Good for entries with error text, paths or a slice type (build traps, gate failures, recipes). Poor for silent hazards and operator actions.

**Defensible number.** Acted precision 92-99 % on gate-checkable entries. Shown recall 50-75 % for entries with error text or recipe keys. Much lower for silent hazards without a push. Cost per lookup: one call at the caller's context plus at most 860 tokens.

**Key assumptions.**
1. Entries carry exact handles (error templates, paths, slice type) and conditions a gate can check.
2. Lookups sit at fixed early points.
3. Each gate condition is specific to one cause. Multi-cause templates stay candidates.

**Unanswered objections.**
- The gate proves a condition, not a cause. Templates with several causes (EAS_BUILD_UNKNOWN_GRADLE_ERROR had two; ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH three) defeat any amount of tuning. Design admits: yes (KS §9 item 4).
- Correct and incorrect hits overlap in similarity (vCache authors), so at any hit rate some error remains. Design admits: partly (dense hits capped at candidate).
- Recipes and research claims have no control pair. Their fit is a judgment, and similarity scores and LLM judges ranked harmful memories "no better than chance" (Ghosh). Design admits: no (KS gates code entries only).
- Silent hazards are reachable only by the diff arm or a push, and the false-fire rate of the diff rule was measured at 27-49 % of commits. Design admits: yes (KS §12.8 KS-V1).

## 4. Objections I could not answer, ranked

1. **Half the spend is open-ended work** (harness-meta, design, research, about 50 %). Recipes and gates barely apply there, and that is where Opus's edge is. This caps E1, E3 and E4.
2. **The moving baseline.** The mid tier reaches the previous top tier within days to months. The library's E3 value shrinks each generation, and every model change forces re-validation.
3. **No parity study on real repository work.** E3 rests on one 64-task pair.
4. **Artefact reuse needs no library.** Most of E4's saving, and the promote-to-check part of E1, come from scripts, checks and templates that a plain repository delivers.
5. **Memory often costs tokens** (ExpeL, SWE-Exp, Dynamic Cheatsheet). Only the gated, k=1, early-placement form avoids that, and it has not been run.
6. **Cached research conclusions can be wrong.** The recheck I tested got the Dynamic Cheatsheet figure wrong. Research entries need quote and URL re-verification, which costs a fetch.

## 5. Measurements that would settle each number

- E1, E2: replay ten recorded build slices with and without a recipe written by Opus from the first slice of the same shape. Count calls, tokens and rounds.
- E3: run 20 held-out FixFlow slices on Sonnet at medium effort, with and without validated entries, against Opus without. Compare gate-pass rate and review send-backs.
- E4: start a small second repository from the template plus portable entries, and count tokens to the first milestone against the clinic repository's equivalent phase.
- E5: the KS pilot as designed, plus an equal number of recipe and research-claim probes with a with/without gain gate.
