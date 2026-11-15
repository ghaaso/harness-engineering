# Research results, and what they mean for CureFound (2026-11-13)

**Sources.** `TOKEN-BOTTLENECK-2026-11.md`, `HARNESS-BOTTLENECKS-2026-11.md`, `HARNESS-V2-DESIGN-2026-11.md` with `harness-v2/phase1/FINDINGS.md`, `LIBRARY-PATHWAYS-2026-11.md`, `evidence/harness-bottlenecks/{fill,graph,graph2}`, `HARNESS-REVIEW-2026-11-01.md`, the G1 and G2 gates. Five Sonnet agents digested them on 2026-11-13; numbers are copied with the docs' own tags: **[M]** measured, **[E]** estimated, **[G]** guess, **[S]** outside study.

**CureFound** (title defense v5): routed disease-specialist RotatE models, one per MONDO area (PyKEEN), a router that picks the top two, an aggregator that merges percentiles, Neo4j evidence paths of at most 3 hops with hubs penalised, a local LLM that explains with every claim checked; FastAPI, React, D3; trained on free Colab and Kaggle; graph frozen at Dec 2023 and leakage-checked; strict test = where Arimoclomol and Levacetylleucine rank of about 8,000 for Niemann-Pick type C, and Miglustat must come back.

---

## 1. Results in plain words

### 1.1 Where the tokens go [M]

Two testbeds, FixFlow (14 sessions) and the Clinic Workshop (41 sessions), 35,834 API calls.

| | FixFlow | Clinic | both |
| --- | --- | --- | --- |
| context tokens processed | 2.13 B | 5.23 B | 7.35 B |
| cache reads as share of context | 94.9 % | 97.6 % | 96.8 % |
| output tokens (45 % thinking) | 24.6 M | 30.8 M | 55.4 M |
| average context per call, main session | 396k | 333k | |
| calls that only read or searched | 64 % | 52 % | |

**Token usage = calls × window size.** 97 % of all tokens are re-reads of a window that was already there. Output is 0.75 %.

What the windows hold [E]: fixed prefix re-read every call 27 % (47 % in FixFlow: about 60k per agent window, roughly 50k of it tool and connector schemas); the model's own earlier output carried forward 26 % (31 % in Clinic); content fetched by reads and searches 26 %; compaction summaries 8 %; unclassified 13 %. An independent re-measure put fetched at 22.3 % and window start at 47.8 %, about half of that resumed history after restarts, not a fixed prefix.

Levers, in order of size: cap the orchestrator window at 150–200k (39 % of FixFlow's and 74 % of Clinic's cache-read tokens sit in calls past 200k); strip the subagent prefix; fewer steps (batching two lookups removes about a third of calls); stop carrying the model's own output.

Not the bottleneck: model mix, file reads, any one file (the hottest is 1.5 %), human prompts.

Phase-1 correction [M]: 48 compactions, not the 4 the compile counted; 38 fell at 366–387k, all on Opus 5.5. The 400k compaction window *was* in effect for Opus; "never switched on" is withdrawn. 39.8 % of tokens sat in calls past 400k, all Sonnet and Fable.

### 1.2 Caching: seven findings

1. **Prompt caching already works.** 98.2 % of the context sum is cache reads (4,253M cache-read, 78M cache-write, 20M output). The cost is re-reading, not first reads.
2. **A session-local file cache saves almost nothing [E].** Exact repeats are 0.00 %; content truly seen before in the window is 0.5–1.5 %. "Opened again" is mostly a different range of the same file.
3. **A cross-session hot set exists [E].** 3.3 % of paths (72 paths) hold half the fetched tokens; paths read in five or more windows hold 73 %; 74 % of fetched tokens went to files the window never edited. But nothing has shown a shorter digest can stand in for the lines.
4. **A graph-traversal cache has nothing to save.** All 477 "what depends on this file" queries take about 1 ms together.
5. **A lookup returned as a tool result does not break the prompt cache; injecting at the top of the window does.** Pushing an index into `CLAUDE.md` or the system prompt would invalidate every window's cached start on each commit.
6. **Heavier context machinery lost to a notes file [M].** A snapshot/restore compaction adapter used +6.1 % tokens over a plain notes file and +17.0 % over native compaction for the same recall (15 of 15). A compact context packet: identical acceptance. The doc's words: "a disciplined short notes file matched the heavier machinery, and nothing here was shown to save tokens."
7. **Unknown:** how cache reads count against the five-hour limit, so no token cut can yet be promised to reduce limit stops.

### 1.3 The reasoning-cache library (modelled; no verdict)

A store of strong-model solutions that a cheap model fetches, adapts and uses; an unsolved problem climbs a ladder (Sonnet, Opus, Fable) and is stored. A cached answer is reused only if **all** hold: an entry exists, a lookup is triggered, the right entry comes back, it is good, it passes the screen, it is in the window when needed, and the cheap attempt then comes out right.

Of 100 pieces the cheap model would get wrong alone [G]:

| Stage | middle values | all-good setting |
| --- | ---: | ---: |
| entry held | 13.1 | 92.0 |
| looked up | 4.8 | 67.5 |
| right entry back | 2.3 | 59.7 |
| good entry | 1.3 | 55.7 |
| passes the screen | 1.1 | 55.0 |
| in the window | 0.97 | 53.9 |
| cheap attempt right | **0.35** | **31.7** |

At middle values the library's cost and wrong rate against the ladder are 1.03 and 1.01: parity. It beats the ladder on both only in the much-comes-back, high-reach, good-entries corner (0.82, 0.67), 17 of 121 cells. 1,000 Monte-Carlo runs: 0.3–6.1 % of runs cheaper with no higher wrong rate against the ladder.

69 limitations; by "last" weight the **match** step carries 94.0 % and **capture** 78.1 %. 59 real problem cases walked through ten steps: the **check** step broke most often (38), then use (31), afterlife (29), match (26). Of 15 savings, 6 were seen, all via notes that exist today (CLAUDE.md, memory index, project docs). 51 of 60 unknowns are guesses. The doc gives "no judgment on whether the library reaches its goal."

### 1.4 The repo graph test (built and tuned; held-out not run)

The first test was rejected by the owner: a self-made graph against an established relational engine, no ranking or hop tuning, scoring that ignored the value of answers, wrong test bed. Verdict withdrawn 2026-11-12.

The replacement protocol was frozen before any arm was built: vary **facts × algorithm × output form × engine** separately; FixFlow `main` at a31924a; 140 task commits split by date, 65 TUNE (June) and 75 HELD-OUT (July–Aug); arms = search, same-directory floor, co-change floor, SQLite, graph engines, cross-checked references; sweep on TUNE only, then freeze; primary metric = recall of the reference files within an 8,000-token answer on T1 HELD-OUT; smallest difference worth acting on 0.05; smallest detectable at this size about 0.09, so "inconclusive" is likely and is reported as "no evidence either way at this size", never "the graph does not help."

Research lanes [M] on this repo: import neighbours recall 0.38 / 0.72 / 0.87 at 1 / 2 / 3 hops, precision 0.32 / 0.11 / 0.06. Top-10 precision: co-change 0.26, personalised PageRank 0.24, combined 0.28.

Build: 188 parent builds, byte-identical rebuilds; relational and reference agree with 0 mismatches on 25,120 comparisons. TUNE recall at 8k on T1:

| arm | recall@8k |
| --- | ---: |
| relational = LadybugDB = DuckPGQ (same facts, same algorithm) | 0.7843 |
| co-change floor | 0.7521 |
| search | 0.7394 |
| same-directory floor | 0.7191 |
| native-only graph variants | 0.659–0.661 |

Given identical facts and algorithm, three engines returned identical answers. File-granularity recall degenerated (padded answers list every file), so the primary is restricted to signature and snippet forms. The 85-run held-out plan is prepared and not run.

### 1.5 The harness itself

Measured wins [M]: parallel check 855 s → 284 s mean (3.0×); Linux container 230 s vs 367 s native; start-up 43 s → 11.5 s; page at 75,016 documents 9–13 s → 0.1–0.5 s, queries per page 29,346 → 28; 432 commits and 65 merges in eight working days.

Reliability [M]: 25 unexpected power-offs since 1 October, 15 with no Claude call in the prior ten minutes; build load explains at most 6. October: 14 limit episodes, subagents caused 91 of 104 limit errors; each agent pays about 70k tokens before work, 34k of it tool definitions. The 101-agent review: 94 completed, 7 refuters lost to a usage limit. G2: the 12 skeptics were consumed by the first four analysts to finish, so the plan-critical claims overflowed.

Thought structures [S]: Tree/Graph of Thoughts show no gain on current models beyond plain sampling at equal compute. The one exception: candidate fixes chosen by an executed test, 25.7 % resolved by vote alone, 27.0 % with a regression filter, 32.0 % with a reproduction test (SWE-bench Lite, 40 candidates per issue).

Stated lessons: verify a rewrite by content, not by commit message; write the gate record before dispatching the next workflow; allocate a capped verification budget by priority, not first-come; unknown is recorded as "unknown", never 0; decisive checks use `if/raise`, never bare `assert`; one phase per new session, state in the repo.

---

## 2. What this means for CureFound

### A. For CureFound's own design and evaluation

1. **Separate facts, algorithm, output and engine, as the graph protocol does.** Three engines gave identical answers given identical facts and algorithm. Neo4j is an engine choice: score it on native algorithms, latency, size and query effort, not on answer quality. Tune the PrimeKG edge set (each edge class switchable) and the ranking first, and keep a relational or in-memory reference arm so any mismatch is caught as a bug (the standard here was 0 mismatches on 25,120 comparisons).
2. **Hop depth is a recall-against-precision trade.** On code graphs, 1 → 3 hops took recall 0.38 → 0.87 while precision fell 0.32 → 0.06. CureFound's 3-hop paths will be high recall and low precision, so the hub penalty and the ranking carry the precision. Sweep hops 1–3, hub in-degree cuts and per-edge-type budgets (metapaths) rather than one global hop limit. Hybrids beat single rankers only slightly here (0.28 vs 0.26 and 0.24), so expect modest gains and measure them.
3. **Floors every arm must beat.** The co-change floor (0.7521) came close to the tuned graph (0.7843). CureFound's floors are degree or popularity ranking (the Bonner 2022 hub bias itself) and an unpartitioned single model. The specialists must beat both by a pre-registered margin.
4. **Pre-register the protocol before any arm is built**: seal held-out, sweep on tune only, one primary metric, a smallest difference worth acting on, whole curves not one point, and what "inconclusive" is called. CureFound's strict test has two held-out positives for one disease; the smallest detectable difference at that size is enormous. Report "no evidence either way at this size", never "the specialist helps" or "does not help". Gain power the way the protocol does: many diseases in the lysosomal area with approvals split by date, like TUNE June / HELD-OUT July–Aug.
5. **Leakage rule, in the protocol's words:** never in a query anything from the task commit or later, and drop same-PR siblings. For CureFound: nothing dated after the Dec 2023 freeze, and drop evidence edges that derive from the publication that reported the approval.
6. **The one thought-structure with evidence is candidate selection by an executed check** (25.7 → 32.0 %). It maps to "explain + verify": generate several candidate explanations or evidence paths and keep the one that passes the graph check, instead of one long chain of reasoning.
7. **The library funnel is a template for the grounded-LLM pipeline.** A retrieved fact helps only if it exists, is retrieved, is the right one, is good, passes the check, is in the window, and the model then gets it right. Match and capture carried most of the weight, and the check step broke most often in real cases. So instrument CureFound as a funnel with per-stage pass rates (MONDO link hit, path found, path passes the verifier, claim consistent with the path), not one end accuracy.
8. **Caching for the explainer LLM.** Keep a stable prefix (schema, instructions) and append per-query evidence last; a lookup appended as a result keeps the cache, an injection at the top breaks it. Batch the claim checks into one call rather than one call per claim, since cost is calls × window. Do not carry long earlier outputs forward.
9. **A caveat on scope.** The harness research ruled out "a model-extracted graph, graph server and embeddings" for repo navigation. That verdict is about navigating code, not about CureFound, whose task is link prediction where embeddings are the method.

### B. For building CureFound with Claude Code agents

1. **Budget = calls × window.** One phase per session, state in the repo, orchestrator capped at 150–200k, compaction earlier.
2. **Strip the agent prefix.** About 60–70k tokens per agent before any work, 34k of it tool definitions. Fewer tools, connectors and skills in agent sessions.
3. **Batch lookups.** 58 % of calls only read or search; two lookups per command removes about a third of calls and their re-reads.
4. **Write big files through a script**, never by echoing contents through the model (31 % of Clinic's tokens were the model's own output carried forward).
5. **Keep work safe.** 25 unexpected power-offs here; the answer is an off-machine copy, a resume list and a restart chain. For training on Colab and Kaggle that is a checkpoint per disease area and a resume list. "Update one disease area at a time" is already the right partition for cheap restarts.
6. **Size parallel runs from one measured peak-memory number.** The parallel check's 3.0× came from slots sized by measurement. The same applies to running ten specialists at once.
7. **Verification budget by priority, gate record before the next workflow, verify by content, unknown is "unknown" never 0, `if/raise` not `assert`.**
8. **Skip the heavy context machinery for now.** A notes file matched it; the library is unproven and at parity in the model; a session read cache saves about nothing.

---

## 3. Status and limits

- Measured [M]: token totals, compaction counts, graph TUNE results, harness wins, power-offs.
- Estimated [E]: window-fill shares (5–8 % unclassified; the re-measure moved fetched to 22.3 %).
- Guess [G]: almost every library number (51 of 60 unknowns).
- Not done: the graph held-out run (85 runs planned); any library verdict; how cache reads count against the limit; the shutdown cause.
- Everything cited here is uncommitted on branch `docs/orchestration-design-2026-10`, by the owner's choice (the clinic testbed has no remote).
