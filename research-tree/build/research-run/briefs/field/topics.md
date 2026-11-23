# The five topics of each field

Read by `fill.mjs` (column 2 names the topic) and by each reader (its own row only:
`grep -F '| f<n> | <topic> |' RUN:briefs/field/topics.md`). "What to find" is taken from the words of the field's row of
`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` (lines 55-61). Topic `prior` is our own earlier work, read with no web,
as round 3's `ours` reader was (`H:docs/program/evidence/round3-2026-11-18/t1-brief-1-collect.md` lines 76-102). Every
other topic: papers of 2023-2026 and the papers the topic is built on (direction line 48; ROUND.md standard 1), systems
in real use with their makers' figures marked self-reported (ROUND.md standard 1b), and where the method failed.
Library words: `bash H:library/lookup.sh <word>` (counts in `RUN:briefs/FIELD.md` section 1).

| Field | Topic | Kind | What to find | Library words |
|---|---|---|---|---|
| f2 | prior | read | our graph work: what was built and measured, on what, against which lens | graph, symbol, co-change, embedding |
| f2 | code-graphs | collect | code graphs and knowledge graphs of a repository given to coding agents: what they did to tokens, steps, cost and success, at what repository size | graph, co-change |
| f2 | symbol-index | collect | symbol indexes and repository maps used by agents in place of reading files | symbol |
| f2 | graph-retrieval | collect | graph retrieval for code against text and embedding search, and where it failed | graph, embedding |
| f2 | real-agents | collect | graphs and indexes inside agents and tools in real use: makers' accounts (self-reported) apart from independent evaluations | graph |
| f3 | prior | read | the embeddings test, its seven assumptions and limits, the graph v2 modelling lane | embedding, graph |
| f3 | gnn-text | collect | graph-neural encoders with text and code as features, and models that score unseen nodes | graph |
| f3 | pretraining | collect | pretraining across repositories and transfer to unseen repositories | embedding |
| f3 | retrievers | collect | fine-tuned retrievers and rerankers on code: gains, and how much data they need | embedding |
| f3 | adapters | collect | graph adapters into a language model, and what of these uses a 12 GB card well | graph |
| f4 | prior | read | our library and graph v2 work and the owner's knowledge layer, time, caching and library of conclusions | cache, compaction, reuse, invalidat, memory |
| f4 | agent-memory | collect | agent memory systems and knowledge graphs with time: effects on tokens, time and quality | memory |
| f4 | caching | collect | caches of prompts and of results: tokens and time saved, quality kept or lost | cache, prompt cach |
| f4 | reuse | collect | caches of plans and conclusions, and reuse of earlier work across tasks | reuse |
| f4 | invalidation | collect | how entries are invalidated or kept fresh | invalidat |
| f5 | prior | read | our verification and review-fix loop work and the checks our harness runs | verifier, proof, solver, linter |
| f5 | analysis | collect | program analysis joined with a language model | verifier |
| f5 | types | collect | type and constraint checking with a language model | type check |
| f5 | solvers | collect | logic, solvers and verifiers with a language model: what they do to hallucinations and quality | solver, verifier, proof |
| f5 | exact-queries | collect | whether exact queries can replace reading, and where the field is moving | solver |
| f6 | prior | read | our model routing, cheaper-model records and what the card has done so far | cheaper model, router, small model, GPU |
| f6 | small-models | collect | small local models for retrieval, reranking, compression, summarising and scouting: what they save, what quality they lose | small model |
| f6 | local-cloud | collect | local and cloud models working together, and routing between them | router, RouteLLM |
| f6 | fine-tuning | collect | fine-tuning a small model on a repository or on recorded sessions: data needed, gains | small model |
| f6 | fit-12gb | collect | what fits in 12 GB of card memory and what quality it loses | GPU |
| f7 | prior | read | the Horthy and BAML sweeps (fold in, do not redo), our tree of sessions, its round-3 lane and the B+ tree idea | orchestrat, Horthy, hierarchy, subagent, B+ tree |
| f7 | thoughts | collect | trees and graphs of thoughts: tokens against quality | hierarchy |
| f7 | sessions | collect | trees and graphs of sessions, sub-agents with their own context | hierarchy, subagent |
| f7 | ensembles | collect | ensembles of agents or answers: when they pay in tokens and quality | orchestrat |
| f7 | plan-reuse | collect | plan reuse in orchestration | reuse |
| f8 | prior | read | how we measure today (tokens, the seven measures, one repository) and the comparisons designed | benchmark, testbed, replicat |
| f8 | benchmarks | collect | benchmarks that report tokens, cost and time for agents across many repositories | benchmark, SWE-bench |
| f8 | task-counts | collect | how many tasks and runs a claim needs | replicat |
| f8 | cost-reporting | collect | how tokens, cost and time are reported and compared across agents | benchmark |
| f8 | testbeds | collect | testbeds of several repositories for agents, as the basis of a testbed plan | testbed |
