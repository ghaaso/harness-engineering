# Graph test result (2026-11)

Generated from `docs/program/graph-test/data/data.json` by `docs/program/graph-test/build.js.txt`, the same script that builds the owner page `docs/program/graph-test/index.html`. Data written 2026-11-13T09:11:49.152Z. Do not edit by hand.

## What was tested

Given one changed file of a real commit, which tool puts the other changed files and definitions in front of the reader within an 8,000-token answer? Tools: a typed store of code facts in SQLite (relational), LadybugDB (graph) and the DuckDB graph layer; a scripted text search; a same-folder floor; a changed-together floor. Settings were chosen on 65 tuning commits (June 2026) and frozen; the held-out run used 75 commits (418 tasks, July and August 2026) once.

Recall = the share of the files and definitions the real change touched that the tool put in front of the reader (a definition counts only when its own lines are shown). Intervals are 95 %, paired cluster bootstrap over commits.

## The answer

1. **Engine (held-out, 75 commits).** The three implementations compute the same answers from the same facts with the same method: difference 0.000 [0.000, 0.000]; shown answers identical on 770 of 770 tasks.
2. **Community prior (held-out, 75 commits).** Adding a stored community prior to personalised PageRank gave no gain of 0.05 recall or more: +0.015 [−0.010, +0.042]; five draws +0.009 to +0.032; tests to update −0.037 [−0.083, +0.007]. PageRank iterations run in application code; only the grouping comes from the engine.
3. **Typed store against scripted search (held-out, 75 commits).** +0.076 [+0.036, +0.118] at the same 8,000-token answer size, verdict "better". Mobile-app seeds +0.151 [+0.097, +0.207] (31 commits); outside the mobile app +0.024 [−0.023, +0.075] (48 commits). Mobile seeds were 17 % of tuning tasks and 36 % of held-out tasks. Against the floors: changed-together +0.063 [+0.019, +0.110] (outside mobile +0.001 [−0.051, +0.056]; five most favourable commits dropped +0.029 [−0.008, +0.068]; seeds matched by id only +0.060 [−0.001, +0.118]); same-folder +0.151 [+0.092, +0.207]. The search arm is a scripted search, not an agent; 48 % of its credited recall per task comes from its changed-together padding tail.
4. **What moved the score (tuning, 65 commits, optimistic).** Hop depth moved recall by 0.346 (0.438 at 1 hop to 0.784 unbounded); direction by 0.215; ranking modes by at most 0.023.
5. **Code-reading questions (held-out, 30 questions).** F1 typed minus scripted search +0.100 [−0.060, +0.257]: inconclusive. On 22 untouched questions +0.158 [+0.025, +0.309]; on 23 +0.189 [+0.049, +0.346]. Tokens two ways: final answers median 31 (typed) and 29.5 (search); the scripted search read a median 694.5 tokens. The typed side's own costs (knowing the schema, query programs per kind) are not counted. Recall convention: a non-empty answer to an empty reference counts as recall 1 (precision 0, F1 0); an empty answer to an empty reference counts 1 for all three (arms/common/tq_score.js); F1 is the same under either recall convention.
6. **Engine speed, size and effort (timing run, tuning inputs only, 5 passes, audited).** Selected method, warm median per ranking: SQLite 14.5 ms (tuning graph) and 32.7 ms (frozen graph); LadybugDB 41.5 and 71.2 ms; DuckDB graph layer 70.3 and 98.7 ms. 4-hop PageRank variant, frozen graph: LadybugDB 17.1 ms (PageRank in JavaScript), DuckDB 58.4 ms, SQLite 256 ms (about 270 SQL statements per ranking): this compares PageRank implementations, not graph operators. Questions: 0.30, 1.93 and 9.16 ms. LadybugDB cold times leave out a facts load only it needs. Store sizes and build times compare designs with different extra tables, not engines alone. A model step takes about 6.6 s, so engine speed does not enter the token bill.
7. **Not tested.** Whether an agent finishes work faster or with fewer mistakes with any of these tools. No agent was run.

## Held-out recall at 8,000 tokens (change completion, 75 commits)

| Tool | Recall | Std. error | 2,000 | 4,000 | 16,000 | Tuning |
|---|---|---|---|---|---|---|
| SQLite (relational) | 0.700 | 0.022 | 0.416 | 0.560 | 0.832 | 0.785 |
| LadybugDB (graph) | 0.700 | 0.022 | 0.416 | 0.560 | 0.832 | 0.785 |
| DuckDB graph layer | 0.700 | 0.022 | 0.416 | 0.560 | 0.832 | 0.785 |
| LadybugDB + community prior (stored grouping) | 0.716 | 0.023 | 0.422 | 0.570 | 0.838 | 0.786 |
| 4-hop variant, SQLite | 0.711 | 0.023 | 0.402 | 0.560 | 0.828 | 0.768 |
| scripted search | 0.625 | 0.031 | 0.346 | 0.458 | 0.764 | 0.759 |
| scripted search, best form | 0.634 | 0.031 | 0.360 | 0.476 | 0.768 | 0.764 |
| changed-together floor | 0.638 | 0.033 | 0.362 | 0.475 | 0.772 | 0.752 |
| same-folder floor | 0.549 | 0.031 | 0.338 | 0.435 | 0.720 | 0.719 |

## Pre-declared comparisons (held-out)

| Comparison | Change completion | Tests to update | Verdict |
|---|---|---|---|
| LadybugDB minus SQLite | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] | equivalent |
| DuckDB graph layer minus SQLite | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] | equivalent |
| LadybugDB + community minus SQLite | +0.015 [−0.010, +0.042] | −0.037 [−0.083, +0.007] | equivalent |
| typed minus scripted search | +0.076 [+0.036, +0.118] | +0.033 [−0.024, +0.091] | better |
| typed minus search, best form | +0.066 [+0.027, +0.108] | +0.028 [−0.035, +0.100] | better |
| typed minus changed-together floor | +0.063 [+0.019, +0.110] | +0.027 [−0.045, +0.104] | better |
| typed minus same-folder floor | +0.151 [+0.092, +0.207] | +0.289 [+0.162, +0.411] | better |
| questions, typed minus search (F1) | +0.100 [−0.060, +0.257] (30) | – | inconclusive |

Documented chains (25 tasks, 4 parent commits) carry a sign only: typed minus search is positive in all 5 parent-and-document groups. The first-written tie rule's choice scored +0.011 [−0.004, +0.026] higher than the amended choice; that supports no claim about either rule.

## Trust

- An independent scorer reproduced 1,151 point values to four decimals and all 46,200 per-task values; no verdict word changes.
- This v2 recomputation reproduced 21 of 21 stored comparison rows exactly (difference and interval, T1, T2 and T3).
- Every arm scored 0.05 to 0.17 lower on the 75 held-out commits than on the 65 tuning commits it was chosen on. Part of it is selection on the tuning set; part is a different mix of changes (mobile seeds 17 % of tuning tasks, 36 % of held-out tasks).
- 8 held-out questions had their handling changed after their text was read; the question comparison (H4) is shown on 30, 23 and 22 questions.

## Not shown by this test

- Whether an agent finishes a task faster or with fewer mistakes with any of these tools. No agent was run.
- Context that a change needed but did not edit. The reference is what the commit changed.
- Any other repository.
- Engine speed, size and effort: now measured on tuning inputs only (see H); not on held-out tasks, larger graphs or other machines.

## What the owner asked that this test did not cover (section K)

- Not tested: meaning read from documents by a model (graphify's extra layer); time validity of facts; cached conclusions made by a model (cached deterministic answers were replayed since, section L below); orientation; an agent using any tool; tokens in a session.
- Graphify's 71.5x is about 123,488 corpus tokens against about 1,726 tokens per ungraded answer (8.8x on code alone), self-reported, weak. Independent: graphify-bench (940 runs, medium; its doc-and-code positive downgraded to weak and directional) and a file-localisation check on 177 issues (25 % against 32 % for keyword search, medium).
- In the owner's sessions fetched content is 26 % of context tokens; a knowledge layer acts there and on repeated lookups, at most the third lever after capping the orchestrator window and stripping the fixed prefix.
- The wider test (agent baseline; structure, meaning, time, cached conclusions and graphify as switches; phases with stops) is a design with the design check's corrections, not a result.
- Its cost, estimated in protocol v2, in billion tokens: Cost probe 0.04 to 0.12; Pilot 0.8 to 1.9; Main stage A 1.6 to 3.2; Main stage B 1.7 to 4.7; Option: more arms on change tasks 0.6 to 1.6; probe, pilot and both main stages about 4.0 to 10.0 billion, against 2.13 billion context tokens recorded for all of FixFlow.
- Can it run here (feasibility counts, no model, no agent, nothing installed): at 12 seeded old commits of 141, backend checks and web and mobile tests passed with nothing installed (mobile type-check 7 of 12; alembic check 1 of 2, run at 2 parents only, the June parent having a model-migration drift in its own code); about 25 fresh usable change tasks exist against the 40 a held-out run needs; the strict needed-but-not-edited set is empty in 6 of 12 commits; 212 of 301 recorded lookups open program documents; 4,604 of 18,875 graph edges (routes, URLs, tables, settings, mocks) are of kinds graphify does not build.
- Removed on purpose from the caching row (2026-11-13): a sentence on what a database cache that keeps unneeded content out of the window would do to cached and uncached tokens. It leaned toward a token saving nobody measured; whether stopping a first, unneeded read changes tokens is untested.

## Cached answers with invalidation: the replay (section L)

Deterministic answers only: 350 questions looked up again at each later saved code-graph version where what they ask about existed (40,880 lookups at the 189 versions after the first of 190, in commit order), under 11 rules; an answer was reused only if the rule said it still held, and the true answer was recomputed every time. No model was called and no agent ran. Audited: a recomputation of the true answer at all 40,880 lookups, with the audit's own loader and reconstruction of what each rule served but the finished test's original SQL programs and reference code, found 0 disagreements; a mistake shared with those programs, about what a question means, would not show.

| Rule | All 250 questions: served, wrong among served | The 112 that change | Wide ranking question |
|---|---|---|---|
| No invalidation | 100.0 %, 32.7 % | 100.0 %, 62.5 % | 100.0 %, 89.5 % |
| Time-to-live, 20 commits | 94.4 %, 12.0 % | 94.2 %, 23.0 % | 94.5 %, 64.8 % |
| Time-to-live, 5 commits | 79.6 %, 4.1 % | 78.9 %, 7.9 % | 79.9 %, 41.8 % |
| File level | 86.5 %, 6.5 % | 80.9 %, 13.2 % | 14.8 %, 1.3 % |
| Fact level, without the "nothing else" patterns | 88.5 %, 6.8 % | 84.2 %, 13.6 % | 9.3 %, 0.9 % |
| Fact level, with the "nothing else" patterns | 87.6 %, 0.0 % | 82.5 %, 0.0 % | 9.2 %, 0.0 % |
| Fact level, only the fields read, with early cutoff | 96.2 %, 0.0 % | 94.2 %, 0.0 % | 24.5 %, 0.0 % |

- 138 of 250 questions (55.2 %) never change their answer and 47.6 % of lookups are of them; every rule is right on them.
- 133 of 134 cases behind the wrong answers were a new relation in another file (new caller, test, reader, rule or route); 1 was a route renamed from another file.
- The wide ranking question rests on a median of 323 files; no rule that checks what it rests on served more than 24.5 % of its lookups.
- Tokens were not measured. Estimate, assuming each hit replaces one scripted search: 58,125 tokens per 100 lookups at the median price, 161,515 at the mean, 185,388 at per-kind prices; against a typed query 0.
- Not shown: conclusions made by a model (the costly ones) were not cached and no agent chose what to look up; zero wrong answers is expected by construction for programs whose every read is recorded; "wrong" is judged against the same extractor's facts, not the code.

## Graphify itself, on our tasks (section M)

Graphify 0.9.108, code layer only, in a test container with the network off; no model, no agent. 10 shipped configurations fitted on tuning (typed arms 60 each); the frozen one ran once on the 75 held-out commits (770 tasks) and 30 questions, through our adapter and the shared packer. An independent re-scorer matched all 1,540 graphify values; a run audit and a claims refuter checked the result.

- **Change completion, 8,000 tokens (held-out).** graphify 0.564, typed store 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549. Graphify minus typed −0.137 [−0.188, −0.088]: "better" for the typed store by the declared rule (also at 2,000 and 4,000 tokens). Minus scripted search −0.061 [−0.129, +0.007], minus changed-together floor −0.074 [−0.145, −0.003], minus same-folder floor +0.014 [−0.057, +0.082]: inconclusive, which is neither better nor equivalent.
- **Qualifications.** Part of the typed lead is file size: graphify shows a median 18 files of 422 tokens against 30.5 of 247; the first right file comes equally early (MRR −0.015 [−0.055, +0.027]). Each inconclusive verdict moves with five commits (same-folder floor without its five best commits +0.067 [+0.013, +0.121]; search and changed-together floor without graphify's five best −0.099 [−0.166, −0.037] and −0.115 [−0.184, −0.051]).
- **Where the seed lives.** Mobile app (31 commits): minus typed −0.019 [−0.092, +0.038], minus scripted search +0.131 [+0.038, +0.215], but not at 2,000 or 4,000 tokens, not on top-10 ranking and not after dropping five commits (+0.066 [−0.024, +0.141]). Backend (45 commits): minus typed −0.227 [−0.295, −0.163]. Mobile seeds were 36 % of held-out tasks against 17 % on tuning.
- **Links graphify does not build** (route, table, setting, changed-together): 336 of 2,562 reference files; graphify showed 0, the typed store 66, scripted search 91 inside 8,000 tokens. Tasks without such files still show −0.134 [−0.192, −0.081]; this run does not split that between link kinds, ranking and tuning.
- **Own answer text** (median 2,181.5 tokens) named 0.344 of the reference files; minus the typed store's 2,000-token answer −0.102 [−0.172, −0.033], minus scripted search −0.015 [−0.097, +0.068]. Keyword mode at depth 2; file paths only.
- **Questions** (raw question text, no agent, no vocabulary step): recall 0.194 at its default budget and 0.347 at 8,000 tokens, against 0.808 typed and 0.789 scripted search; F1 0.072 depends on our read-out of candidates. Typed-side costs not counted; scripted search read a median 694.5 tokens.
- **Not shown:** its model-read document layer was not run; no agent used it; nothing about tokens in a session, other repositories, or why graphify's published numbers look good elsewhere. Build times are not comparable (typed facts built earlier under unrecorded conditions).

## Possible next tests (owner decisions, not plans)

- An agent pilot replaying fix commits with each tool set (model tokens and many agents).
- An embedding-search arm (needs a model download).
- Another repository.
- A rolling-origin re-run over several split dates for more power.

Sources: the single held-out run on 75 commits from July and August 2026, scored once; the 65 tuning commits from June 2026 on which every configuration was chosen. Reporting rules: protocol addendum 6, section C.
