# Protocol: tuned repo graph against a relational store (frozen 2026-11-12, before any arm is built)

Sources: the six research lanes and three verifiers in research/ (result.json, lane-*.txt, verify.txt, critic.txt). Where a lane and its verifier disagree, the verifier's corrected figure is used.

## 1. What is being tested
Four things are varied separately, because the research showed they are separate: FACTS (which typed nodes and edges exist) x ALGORITHM (direction, hop budget, ranking) x OUTPUT (what the model receives, in tokens) x ENGINE (where the facts live and what runs the query). Given identical facts and an identical algorithm, two engines must return the identical answer; a mismatch is a bug, not a result. So answer quality is decided by the first three, and the engine axis is scored on what it does change: which algorithms it offers natively, the effort to write each query, latency, size on disk, memory and update cost.

## 2. Test bed
The FixFlow repo, branch main frozen at the commit the scoring lane recorded (a31924a; re-check and record the full SHA). Non-merge commits on main: 233. Usable task commits (2 to 30 existing code, test or migration files): 140, split by date at 2026-07-01 into TUNE (65, June) and HELD-OUT (75, July and August). Nothing is ever tuned on HELD-OUT; it is run once.

## 3. Facts (one shared extractor, both stores load the same files)
Built at each task's PARENT commit from a clean export of that commit, cached by SHA. Start from research/schema (py_extract.py, ts_extract.js, join.js, docs_extract.js, git_extract.js) and fix what the verifier found:
- URL matching: real ambiguity handling (more literal segments wins; count true ambiguities), not a slice to the first candidate.
- Test detection by path (tests/, __tests__/, test_*.py, *.test.*, conftest.py), never by substring of a symbol id.
- The TypeScript stage pinned and deterministic: two builds of one commit are byte-identical.
- Table edges labelled read or write; constructor and unit-of-work edges from test files dropped; session.delete handled.
- State which edge types each number refers to.
Node types: runtime, slice, file, symbol (function, class, method, component), route, client URL site, table, column, migration, settings key, outbox kind, screen name, test, doc, doc section, doc id, invariant. Edge types: defines, imports, calls (Python and TS/JS), renders, depends_injects, registers_route, calls_url, test_calls_route, overrides (test replaces a provider), reads_table, writes_table, writes_column, foreign_key, migration_follows, migration_touches, reads_setting, enqueues_kind, kind_handled_by, passes_callable, inherits, mocks (JS mock calls and Python string patches), contract (import-linter allow and forbid), same_capability, cites (doc to file, with status resolved, ambiguous or not-in-repo), mentions (doc to symbol), constrains (invariant to its anchors), co_changed (from ANCESTOR commits only, with support, confidence and a recency weight; same-PR sibling commits dropped). Every edge carries its kind, its evidence (file and line) and a confidence. Each edge class can be switched off. Attempt one more class and report whether it is reliable: response-schema field to the client code that reads that key.
Each node stores path, line range, signature line, runtime, slice, test flag and size in tokens, so any arm can answer at file, symbol or signature granularity.

## 4. Task sets (sealed before any arm exists; arm builders never read sealed/)
- T1 (primary) change completion: seed = one changed file and symbol of a task commit; reference = the other existing changed files and changed definitions. 140 commits (65/75).
- T1x: the cross-runtime subset of T1. Descriptive only (too few commits).
- T2: seed = changed production code; reference = existing test files changed in the same commit.
- T3: documented chains from the lifecycle audit, the open-work handoff and the CLAUDE.md invariants: seed = first named file or symbol; reference = the others. Facts built at the commit before the doc, with the doc removed.
- TQ: 50 structured questions whose answers are fixed by reading the code, not by running the extractor: screen to tables written, tests reaching a function, invariants on a file, the other half of a rule, readers of a setting, migrations touching a table, clients of a route, what a service function's change reaches. Each answer is produced by one reader with evidence lines and checked blind by a second; disagreements are resolved by a third pass. Split 20 tune / 30 held-out.
- T4 (defect register to fix files) and T5 (document lookups from this repo's sessions): descriptive only.
Never in a query: the commit message, files added by the task commit, anything from the task commit or later.

## 5. Arms
(a) SEARCH: what sessions do today, scripted: text search for the seed's names, module path and route strings, one and two rounds; plus two floors every arm must beat: same directory, and plain co-change.
(b) RELATIONAL: SQLite (built into Node 24) with a strong design: integer ids, typed node and edge tables, covering indexes in both directions, WITHOUT ROWID, ANALYZE, FTS5 for names and doc text, a co-change table, depth-capped recursive queries with set semantics, a bounded closure table, stored rank columns. Queries are the ones natural to SQL.
(c) GRAPH ENGINE: the same facts in an established graph engine with its native queries and algorithms (typed variable-length paths and metapaths, shortest paths returned as explanations, PageRank and personalised ranking, communities). Engine chosen by the owner; not built until the owner decides.
(d) CROSS-CHECK: the best design from (b) and from (c), each re-implemented in the other engine and in a plain in-memory reference. Outputs must be identical on TUNE before anything is scored.
All arms share one packer and one deterministic tokenizer, and return the same output forms.

## 6. Parameters, swept on TUNE only, the same number of configurations per arm
Hops 1 to 6 and unbounded; one global limit against a budget per edge type (metapaths); direction (dependents, dependencies, both); edge classes added one at a time; ranking (traversal order, degree-normalised, personalised PageRank with restart 0.15, 0.30, 0.50, co-change weight 0.5, 1, 3, text-match score, hybrids); hub handling (none, production in-degree cut at 5, 10, 15, exclusion of transport nodes); granularity (file, symbol); output form (paths; path plus signature; path plus line range; snippet); token budget 2k, 4k, 8k, 16k. Choose per arm by the primary metric with the simplest configuration within one standard error of the best, then freeze its hash. Report whole curves, never one point.

## 7. Scoring
Primary: recall of the reference evidence (files and definitions) within an 8,000-token answer, on T1 HELD-OUT, averaged per seed and then per commit. Secondary: the same at 2k, 4k and 16k; precision; tokens to reach 80 % recall; number of lookups to reach 80 % recall; rank quality (MRR, nDCG@10); area under recall against tokens; exact-answer precision, recall and tokens on TQ; share of references no store can reach; stale returns counted as wrong. Engine measures: build time, update time for a one-file change, p50 and p95 latency cold and warm, bytes on disk, memory, lines of query code per algorithm, and which algorithms were native.
Statistics: the commit is the unit, paired across arms; cluster bootstrap 95 % intervals (10,000 resamples) and sign-flip permutation tests; smallest difference worth acting on 0.05 recall (the owner may change this before HELD-OUT is run). With 75 held-out commits the smallest detectable difference is about 0.09, so "inconclusive" is a likely outcome and is reported as "no evidence either way at this size", never as "the graph does not help". A rolling-origin re-run over several split dates is a secondary analysis to gain power.
A design wins only if the interval of its difference excludes zero, its median tokens per answer are no higher, and the sign agrees on at least three of T1, T2, T3, TQ.

## 8. Not in this protocol (owner decisions)
Installing a graph engine; an embedding-search arm (the strongest non-graph baseline in the literature; needs a model download); an end-to-end pilot where an agent replays fix commits with each tool set (needs model tokens and many agents).
