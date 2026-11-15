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

- Not tested: meaning read from documents by a model (graphify's extra layer); time validity and cached conclusions with invalidation; orientation; an agent using any tool; tokens in a session.
- Graphify's 71.5x is about 123,488 corpus tokens against about 1,726 tokens per ungraded answer (8.8x on code alone), self-reported, weak. Independent: graphify-bench (940 runs, medium; its doc-and-code positive downgraded to weak and directional) and a file-localisation check on 177 issues (25 % against 32 % for keyword search, medium).
- In the owner's sessions fetched content is 26 % of context tokens; a knowledge layer acts there and on repeated lookups, at most the third lever after capping the orchestrator window and stripping the fixed prefix.
- The wider test (agent baseline; structure, meaning, time, cached conclusions and graphify as switches; phases with stops) is a design with the design check's corrections, not a result.

## Possible next tests (owner decisions, not plans)

- An agent pilot replaying fix commits with each tool set (model tokens and many agents).
- An embedding-search arm (needs a model download).
- Another repository.
- A rolling-origin re-run over several split dates for more power.

Sources: the single held-out run on 75 commits from July and August 2026, scored once; the 65 tuning commits from June 2026 on which every configuration was chosen. Reporting rules: protocol addendum 6, section C.
