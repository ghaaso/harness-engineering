# Research direction: what makes an agent harness cheaper, faster and more right (draft for the owner, 2026-11-16)

**Status: a draft direction. Nothing starts until the owner says go or changes it.** It was written after
the owner's message of 2026-11-16: one failed experiment concludes little; "for this repository" is the
wrong goal; we may have picked a method built for another kind of problem; research the literature for
clues and leads instead of striking graphs, graph-neural encoders and knowledge graphs off the list; the
graphics card may be under-used and the architecture's assumptions may be wrong.

## 1. The question

Which methods make an agentic coding harness better on the owner's seven measures (throughput,
efficiency, token count, token cost, time taken, quality, hallucinations), **in general and not for one
repository**, in what form, at what scale, and what can a local 12 GB graphics card do for it?

The families in scope, none of them ruled out: code graphs and knowledge graphs, graph-neural and other
learned encoders, neuro-symbolic methods (the owner's "neuro sense": lane 5 confirms the term), agent
memory and knowledge layers with time, caching, orchestration structure, and small local models.

## 2. What our own test does and does not tell us

The embeddings test (`evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`) tested one
form of one use on one repository. It is evidence about that form, not about the family. Assumptions
the research must challenge:

1. **The target.** It ranked files that change together. No agent ran and no tokens were counted.
2. **The model class.** Embeddings of node identities, trained from scratch on each snapshot, with no
   text or code as features, no transfer between repositories and no way to score unseen nodes.
3. **The scale.** Graphs of at most 2,450 nodes; published results use far larger and denser graphs.
   Models of at most 512 dimensions used 0.3 to 2.6 GB of a 12 GB card.
4. **The signal.** Only structure and co-change history, which the baseline already had.
5. **The fusion.** A fixed rank fusion in which co-change dominated; a random score moved the list as
   much as the models did.
6. **The evidence base.** One repository, 50 commits, truth at file level.
7. **The use.** Ranking candidates. Graphs and learned models have other uses in a harness that were
   never tried: memory, planning, checking, compressing, routing, deciding what a cache entry rests on.

## 3. What counts as a lead

A lead is a mechanism, a named source, and a measured effect on at least one of the seven measures:
effect size, the baseline it was compared with, and the conditions (task, repository size, model). For
each lead also record: how strong the evidence is (replicated, independent, or a vendor's own claim),
what the strongest known form needs (data, compute, card memory), what it would cost to try here, and
what result would show it does not work for us. "Not found" is not "does not work". A negative result
is recorded with its conditions, as ours is.

## 4. Lanes

Each lane reads primary sources from 2023 to 2026 (papers, code, benchmarks), extracts numbers, and
returns a table of leads and one page of prose. Sonnet agents read and extract; Opus agents judge and
try to refute; the coordinator only coordinates.

| # | Lane | What it must answer |
|---|---|---|
| 1 | Where the tokens, time and errors go | From our own measurements (`TOKEN-BOTTLENECK-2026-11.md`, `AFTER-COMPACTION-2026-11.md`, `SPLIT-RULE-2026-11.md`, `SUMMARY-CHECK-2026-11.md`, `HARNESS-BOTTLENECKS-2026-11.md`) and published cost breakdowns of agents: the sinks, ranked. Every other lane scores its leads against these sinks. |
| 2 | Graphs and knowledge graphs inside coding agents | Code graphs, symbol indexes and graph retrieval used by real agents and papers: what they did to tokens, steps, cost and success, at what repository size, and where they failed. |
| 3 | Learned encoders on code, in their strongest form | Graph-neural encoders with text and code as features, models that score unseen nodes, pretraining across repositories, fine-tuned retrievers and rerankers, graph adapters into a language model. Which of the seven assumptions above does the literature contradict? What would use a 12 GB card well, and how much data does it need? |
| 4 | Memory, knowledge layer, time, caching | Agent memory systems and knowledge graphs with time, caches of prompts, plans and conclusions, reuse of earlier work, and how entries are invalidated. Effects on tokens, time and quality. Fold in our library work (`LIBRARY-PATHWAYS-2026-11.md`) and graph v2 (`GRAPH-V2-DESIGN-2026-11.md`). |
| 5 | Neuro-symbolic methods | A language model joined with symbolic parts: program analysis, type and constraint checking, logic, solvers, verifiers. Where the field is moving, what it does to hallucinations and quality, and whether exact queries can replace reading. |
| 6 | The local card as a cost lever | Small local models for retrieval, reranking, compression, routing, summarising and scouting; local and cloud models working together; fine-tuning a small model on a repository or on recorded sessions. What fits in 12 GB, what it saves, what quality it loses. |
| 7 | Orchestration structure | Trees and graphs of thoughts and of sessions, ensembles, the owner's B+ tree idea, sub-agents with their own context, plan reuse. Fold in the Horthy and BAML sweeps (section 9 of `HARNESS-BOTTLENECKS-2026-11.md`); do not redo them. |
| 8 | How to measure it in general | Benchmarks and testbeds that report tokens, cost and time for agents across many repositories; how many tasks a claim needs; a testbed plan so the next result is not about one repository. |

## 5. Rules for every lane

1. **The lens is the harness and the seven measures**, not retrieval scores for their own sake.
2. **Best form.** Describe the strongest known version of each idea and what it needs, never a toy.
3. **Generality.** Prefer evidence across many repositories or benchmarks. Say when a result is one
   repository or one model, and separate a vendor's claim from an independent replication.
4. **Build on what exists.** Read the files named in section 4 and the earlier research
   (`evidence/harness-bottlenecks/graph2/research/`, `graph2/graph-v2/`, `evidence/harness-bottlenecks/research.json`)
   first. Fold their findings in and say which lens they were scored against.
5. **The owner's own ideas count**, including those said only in chat. Read his memory notes and search
   his typed messages before compiling (knowledge layer, time, caching, an agent in the loop, the
   popular tool itself as an arm, the library of conclusions, trees of sessions, routed specialists).
6. **Check the sources.** For every top lead an Opus agent opens the source again and confirms the
   number and its conditions. A citation that cannot be opened is dropped.
7. **Privacy.** No project name, path, identifier or code goes into a web search or any outside request.
8. **No installs and no experiments in this phase.** The research ends in test designs; each names
   what it would install, with source and size, for the owner to decide.

## 6. What comes back

1. A map of leads, as a page the owner can look at: family against measure, sized by evidence, with
   the conditions on each. The record behind it is one table per lane.
2. A short note: which assumptions of the embeddings test the literature contradicts.
3. Two or three test designs in their strongest form: what is compared, on which testbed of several
   repositories, how it is scored on the seven measures, what the card does, what result would change
   our mind, and what it costs in tokens and hours.
4. The decisions that are the owner's: which tests to run, what to install, the budget.

## 7. How it runs

- **A fresh coordinator session**, not the long one. The long session is at 80 % of its window, and
  every step there re-reads about 800,000 tokens.
- **Experts first, reviews second** (the owner's instruction of 2026-11-16). No session is asked for
  its opinion of our work until its context has been filled, precisely, with the field's knowledge.
  Each child session researches its field itself and fills its own context with checked,
  high-quality knowledge: its helpers screen the sources so that noise stays out, and it writes what
  it learned as a pack. It passes a short knowledge check, and only then reviews our work and our
  approaches in a fixed form. The tree, the ensembles, the gates and the rules that keep this from
  turning into chaos are in `RESEARCH-TREE-PROTOCOL-2026-11-16.md`, beside this file.
- The coordinator first grounds the direction (the owner's words, the earlier work), then runs the
  fields in waves, then has the top leads checked, then builds the page. It checks free memory before
  starting children (three at a time at most on this PC).
- **Where it lives.** In the harness-engineering repository, which holds this work from now on; the
  product repository keeps the ship plan only.
- **Token budget.** The account's weekly limit was exhausted on 2026-11-16 at 05:02 local time and
  everything stood still for twelve hours. So: the coordinator reads the plan's usage before each wave
  and after it; the whole programme may use at most **10 % of the week** unless the owner sets another
  figure; at the cap it stops and reports. It never waits silently on a limit.
- The ship plan is not touched and not delayed by this track.
