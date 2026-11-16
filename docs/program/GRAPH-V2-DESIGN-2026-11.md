# Graph v2 design: the record behind the owner page

Generated from `docs/program/graph-v2/data/data.json` and `data/extras.json` by `docs/program/graph-v2/build.js.txt`, the script that builds `docs/program/graph-v2/index.html`. Built 2026-11-13. Do not edit by hand. Every number is measured unless marked.

## A. The answer

1. **What agents look up** (measured, 1,452 transcripts, 28,229 lookup calls). Product lookups carried 242.0M tokens, program and document lookups 1147.2M. The form the first test scored (what changed together) is 1.8 % of product cost.
2. **The graph this use calls for.** Documents and earlier conclusions are 68.6 % of program cost; code relations 19.8 % of product cost. The current graph had no path for 5 of 16 forms, partly for 2.
3. **What theory buys at this size.** One node for n-ary facts (change sets, rules with roles, claims with premises); fact-level invalidation: 0 % wrong served on 29,097 replayed lookups against 6.49 % at file level (deterministic answers, judged against the extractor's facts). Not at this size, for this workload: graph databases for speed, reachability indexes, embeddings (measured on this graph (report of 2026-11-16): No arm adds to the simple ranker on this repository; the largest gain fused with the simple ranker, in top-ten precision inside the candidate pool, is +0.0023 [−0.0002, +0.0049] (RotatE), which "matches" it (within 0.02), where "adds" needed at least +0.02, ruling R-6).
4. **Prize as exposure, not forecast.** Forms a graph can serve carry 13.6 % of product context (graph forms only 8.7 %) and 22.0 % of program context. An agent pilot of about 40 tasks would detect a saving only if it were about 20 to 25 % per task or more (80 % power, power script; ruling R-7); an effect the size of these exposures would go unseen, which is why a lookup-level replay comes first.
5. **Not from a source, cut, missing.** Of 43 parts: 9 our own choice, 17 simplified from a source, 11 from a source, 6 measured here. Cut 5, deferred 3, trial 6.

## A2. The seven measures

Page view of numbers already in this record and its sources: 16 of 49 cells measured, 33 not measured. Token cost is not measured in any row. Throughput, efficiency and time wait mostly for the agent test (ruling R-7, step 2); hallucination rates for a citation audit of agents' file:line claims; edge and link precision for 73 to 385 labels per type. Measured: exposures (not savings), cache hit and stale-answer rates (not hallucination rates), arm recall, the first test's sampled edge precision, validation and index times.

## B. Lookup cost by question form (carried tokens, millions)

| Form | Mark | Product | Program |
|---|---|---|---|
| what did an earlier lane/round/agent find (evidence and notes) | graph question | 0.9M (0.4 %) | 521.3M (45.4 %) |
| what is my assignment and what did the plan/design notes decide / what does section Y of plan/design document X say | graph question | 20.4M (8.4 %) | 181.7M (15.8 %) |
| how does this subsystem work now (orientation read) | partly a graph question | 50.0M (20.7 %) | 45.4M (4.0 %) |
| which rule in the invariants/handoff/runbook text applies here | graph question | 21.0M (8.7 %) | 72.0M (6.3 %) |
| where is X defined and what does its body say | index question | 37.7M (15.6 %) | 37.5M (3.3 %) |
| what happened in a past session (transcript) | reading | 5.5M (2.3 %) | 57.0M (5.0 %) |
| external documentation or literature | reading | 0.8M (0.3 %) | 48.6M (4.2 %) |
| run output, logs, job output, PR text, scratch files | reading | 22.9M (9.5 %) | 17.3M (1.5 %) |
| what do the build, CI, ops or lab scripts do | reading | 17.7M (7.3 %) | 21.0M (1.8 %) |
| what do my skill/agent instruction files say | reading | 10.0M (4.1 %) | 28.5M (2.5 %) |
| which files exist here / where is the file for X | index question | 4.6M (1.9 %) | 27.9M (2.4 %) |
| what does this change set (diff, commit, PR) change | graph question | 17.6M (7.3 %) | 14.9M (1.3 %) |
| which tests and fixtures exercise X, and how are they set up | graph question | 11.3M (4.7 %) | 8.9M (0.8 %) |
| who uses, calls or references X (impact of a change) | graph question | 10.2M (4.2 %) | 9.2M (0.8 %) |
| what changed here recently and why (log, blame, commit list) (first test) | graph question | 4.3M (1.8 %) | 13.3M (1.2 %) |
| memory notes, artifacts, session lists | reading | – | 13.0M (1.1 %) |
| where is item ID X defined or cited, and what does it say | partly a graph question | 0.8M (0.3 %) | 9.2M (0.8 %) |
| how does a third-party library behave (its source) | reading | 0.6M (0.2 %) | 6.5M (0.6 %) |
| what sections does this plan/design document have (heading map) | index question | 0.7M (0.3 %) | 6.3M (0.6 %) |
| where is the other half of a contract (route and client, payload, key) | graph question | 2.4M (1.0 %) | 2.9M (0.3 %) |
| what is the data model, migration or setting behind X | graph question | 2.1M (0.9 %) | 2.3M (0.2 %) |
| does this file:line citation still say what the document claims | graph question | 0.2M (0.1 %) | 2.6M (0.2 %) |

Session start: 86.1M of 157.3M carried product lookup tokens (55 %) before the first edit, over 13 sessions. Cost views (product): fetched 0.5 %, carried 23.3 %, lookup-step window 45.0 % of context (the last overlaps carried).
Test set of real lookups: The test set exists and the split is fixed, but for the question “earlier conclusions”, the question “my assignment in the plan” and the question “which rule applies” the truth is mostly "read", not "confirmed used", and only 10.6 % of instances replay against a cached snapshot without possible leakage (product 18.3 %). A zero-model replay can score the graph arms against the index-only arms on the snapshot-ok and read-truth instances; the forms with weak truth (the question “earlier conclusions”, the question “my assignment in the plan”, the question “which rule applies”) need the agent run that recommendation 1 of use-cases.md names. Keyword search over names, paths and headings is the strongest index-only arm on almost every form, and it is the one to beat.

Measured (extras.json): Measured since: the test set holds 4,829 recorded lookups; 27.1 % have a span a later edit, citation or quote used, and 10.6 % replay against the frozen commit with no leak. The arm a graph must beat is already measured: when the agent started from a search, keyword search over names, paths and headings returned a result overlapping the span the agent read in its top 10 for 42.1 % of scorable product lookups and 44 % of program ones (55.3 % and 55.3 % with path seeds included, where the agent already had the file). A hit is an overlap with the read span, not the whole needed span.

## C. Model layers

- **Code structure:** runtime, slice, file, definition, test, fixture, entry point, table, column, setting, migration. Definitions now include module variables and exported object members (the current graph has no node for them).
- **Contracts across the runtimes:** route, client site, outbox kind, string key, schema field. The places where two runtimes must agree: a route and its client calls, an outbox kind and its handler, a storage key or message text matched by two programs.
- **Documents, items, rules and decisions:** document, section, item, phase, rule, decision, span hash. Sections keyed by heading path and content hash, never by line number; ambiguity is a status, not k edges of weight 1/k.
- **Conclusion ledger:** claim, evidence, source. A conclusion with the premises it rests on; only premises inside the repository can be re-checked.
- **Change sets:** change set. One node per commit or PR with its message; changed-together counts become a derived view of these sets.
- **Identity and time:** stable key, lineage, validity. Stable keys, rename and move lineage, validity over the commit graph for code and over content hashes for documents.

## D. One lookup step by step

Three real lookups on the frozen commit's facts (seeded draw, mulberry32 20261113); an explanation, not a result: "Who uses enqueuePendingMedia and what could a change to it affect?" (pool 79, 2,694 tree tokens against 131,070 file tokens); "Which rule constrains backend/app/features/identity/throttle.py?" (pool 2, 167 tree tokens against 260 file tokens); "What usually changes together with technician-app/src/features/attendance/ClockScreen.tsx?" (pool 58, 1,743 tree tokens against 281,677 file tokens).

## E. Cached-answer replay (deterministic answers)

| Rule | Served, all | Wrong among served, all | Served, changing | Wrong, changing |
|---|---|---|---|---|
| file level | 86.5 % | 6.49 % | 80.9 % | 13.2 % |
| facts, without negative patterns | 88.5 % | 6.79 % | 84.2 % | 13.6 % |
| fact level with negative patterns | 87.6 % | 0.00 % | 82.5 % | 0.0 % |
| fact level, compare only fields read | 95.9 % | 0.00 % | 93.8 % | 0.0 % |
| fact level + early cutoff | 88.5 % | 0.00 % | 83.8 % | 0.0 % |
| fields read + early cutoff | 96.2 % | 0.00 % | 94.2 % | 0.0 % |
| time-to-live 5 commits | 79.6 % | 4.10 % | 78.9 % | 7.9 % |
| time-to-live 20 commits | 94.4 % | 12.00 % | 94.2 % | 23.0 % |
| never invalidate (stale control) | 100.0 % | 32.70 % | 100.0 % | 62.5 % |

Limits: a model-made conclusion is re-checked only through recorded premises; 1,780 program files are untracked. Premise share: Answer to the refuter. He is right in direction and the size is now known for this sample: one finding in five rests only on things tracked in this repository (12 %, if a finding that adds any bare judgement is excluded). Three in four have a premise no ledger could re-check (a one-off measurement or bare judgement). The program documents themselves are the main obstacle: a quarter of findings cite untracked notes in the repository folder.

Measured (extras.json): Measured for earlier conclusions: 67.8 % of their carried read tokens come from scratch folders outside the repository and 4.1 % from tracked files; 12 of 60 sampled findings have all their checkable premises tracked.

## F. Parts by status

- **build first (7):** Test set of real lookups [measured here]; Index-only arm [our own choice, no source]; Scripted-search arm [measured here]; Lookup-level replay [our own choice, no source]; Leak rule and cut rules [our own choice, no source]; CQ registry as data [simplified from a named source]; Quality card per build [simplified from a named source]
- **build (16):** Meaning layer, deterministic [simplified from a named source]; Document extractor [simplified from a named source]; Session-start brief (the brief operation) [our own choice, no source]; Competitors for the brief: orchestrator brief and heading-and-ID extraction [our own choice, no source]; Task-context store (degree of interest) [simplified from a named source]; Edit-time warning hook [our own choice, no source]; Citation resolution fact [simplified from a named source]; Identity over time [simplified from a named source]; Output format [measured here]; Description budget [measured here]; Storage choice [measured here]; Code structure layer [simplified from a named source]; Framework export [from a named source]; Type-aware resolution kept, residue trials [from a named source]; Change set as hyperedge [from a named source]; Lexical entry and feature [from a named source]
- **build after the premise measure (3):** Conclusion ledger [simplified from a named source]; Dependency recording with negative dependencies [from a named source]; Ledger revalidation [simplified from a named source]
- **build last (ruling R-5) (1):** Two-stage ranker (rooted PageRank and changed-together evidence, fused) [simplified from a named source]
- **trial (6):** Contract layer [from a named source]; Co-change as weighted projection [simplified from a named source]; Value-density selection with stop [simplified from a named source]; Level of detail per node [simplified from a named source]; Since-view [measured here]; Embeddings and graph neural models (trial) [our own choice, no source]
- **infrastructure (1):** Snapshots as memo, validity sets, overlay [from a named source]
- **folded in (1):** Evidence and confidence split [simplified from a named source]
- **deferred (3):** What-breaks ranker [simplified from a named source]; Depth-3 tier on request [our own choice, no source]; Extraction audit [from a named source]
- **cut (5):** connect via exact Steiner tree [from a named source]; Kind-level relevance filter [from a named source]; Redundancy audit [our own choice, no source]; Calibration [from a named source]; Field contracts, tier 3 (pass over untyped web JavaScript) [simplified from a named source]

## G. Not at this size, for this workload

- Graph database for speed: answers identical across engines, worst query milliseconds; pays at about 10^5 nodes with large frontiers.
- Reachability/distance indexes (closure, GRAIL, pruned landmarks): questions are single-source; GRAIL's own small sets (3.6k-39k nodes) favour plain search; pays at 10^5-10^6 nodes with thousands of point queries.
- Vertex reordering and compression: adjacency is 65 KB; pays at about 10^7 nodes.
- Incremental Datalog/IVM engine (Feldera, Souffle; DDlog archived): recompute is microseconds to milliseconds; pays at a view takes over 1 s or at 100x size.
- Traversal cache: full index rebuild 25 ms vs 5.3 s extraction; cache conclusions instead.
- KG embeddings (RotatE, ComplEx-N3) and GNNs: 6.9 triples per entity vs about 37 in FB15k-237; tuned simple baselines match; pays at about 300 usable commits and 10x edges, tuned and multi-seed only.
- Temporal rule mining (TLogic) and many-feature learned rankers: about 230 commits; 25 features tie 2; pays at thousands of commits.
- AnyBURL rule-mining arm: tier 1 trial only after the two-stage ranker.
- Community summaries (GraphRAG): plain retrieval beat them on detail questions; slices already group code.
- Leiden communities: slices exist; low priority tier 1.
- PCST approximations: exact Steiner feasible below 10-12 terminals.
- Model-written query languages and LLM-driven traversal: accuracy and cost at any size.
- Bitemporal or temporal graph stores: validity sets on stable keys suffice; pays at about 100x history.
- Embeddings (R-6): measured on this graph (report of 2026-11-16): No arm adds to the simple ranker on this repository; the largest gain fused with the simple ranker, in top-ten precision inside the candidate pool, is +0.0023 [−0.0002, +0.0049] (RotatE), which "matches" it (within 0.02), where "adds" needed at least +0.02 (docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md).

**graphify, code layer, same tasks (measured):**
- On the 418 held-out change-completion tasks (change completion, 75 commits), graphify's code layer showed 0.564 of the reference files and definitions inside an 8,000-token answer, against 0.700 for the typed graph: a difference of -0.137 (95 % interval -0.188 to -0.088), and by the declared rule the typed graph is "better" (the sign is the same on all three task sets (change completion, tests to update, documented chains)).
- Against scripted search (0.625), the changed-together floor (0.638) and the same-folder floor (0.549) the declared verdict is "inconclusive" each time: -0.061 [-0.129, +0.007], -0.074 [-0.145, -0.003] with the opposite sign on documented chains, and +0.014 [-0.057, +0.082].
- By where the seed file lives (subgroups at 8,000 tokens only, no verdict): on mobile-app seeds (31 commits, 152 tasks) graphify scored 0.638, -0.019 [-0.092, +0.038] from the typed graph and +0.131 [+0.038, +0.215] above scripted search; on backend seeds (45 commits, 236 tasks) it scored 0.472, -0.227 [-0.295, -0.163] below the typed graph and -0.214 [-0.292, -0.142] below scripted search. The mobile-app difference against scripted search does not hold at 2,000 or 4,000 tokens, on top-10 ranking, or after dropping five commits.
- Of the 336 reference files of change completion that the typed facts connect to the seed only through a route-to-client, table, setting or changed-together link, graphify showed 0 inside 8,000 tokens, the typed graph 66 and scripted search 91; on the remaining 2,226 reference files graphify showed 0.604 of them, the typed graph 0.722 and scripted search 0.613.
- graphify's own default answer text (median 2,182 tokens) named 0.344 of the reference files of change completion, against 0.447 for the typed graph's 2,000-token answer and 0.360 for scripted search's.
- On the 30 held-out code questions (raw question text, no agent, no vocabulary step, printout scored as an item list), graphify's answer to the question text scored macro F1 0.072 (typed graph 0.745, scripted search 0.645), with answers of median 2,547 tokens against median 31 and 29.5 tokens of final answer for the other two. That token comparison is incomplete: it leaves out scripted search's read tokens and the typed store's uncounted costs, and recall, not F1, is the fair reading (claims audit, section 6 item 4).
- Two further caveats from the claims audit: graphify front-loads large files (422 against 247 tokens per shown file), which interacts with the packer; and graphify was below every comparator on tuning, and the held-out mix favoured it.
- Does not show: Nothing about tokens: every answer of every arm filled its budget (median 7,999 tokens), and no session was run. The token-saving claims are neither confirmed nor refuted here. Nothing about the model-read document layer, community labels or the report, where the one independent positive result for graphify sits. Nothing about an agent using graphify: whether it would call it, re-query, or read fewer files. Nothing about other repositories, other languages, orientation questions, or graphify versions other than 0.9.108.

## H. Refuter

Claims: 20 survive, 26 need qualification, 6 refuted. Findings: sources cited for what they do not say 5, choices with no source 3, tests that could not fail 11, leak paths 6, missing arms and parts 7. Rulings R-1 to R-8 are on the page in full.

## I. Prize

Runnable model on the page (simulation). A pilot of 40 tasks would detect a per-task saving only if it were 18.4 to 33.4 % or more (80 % power; below 95 %), across the eight conditions of the power script. A tool can also add tokens (CodexGraph 7 to 15 times keyword search).

## J. Corrections (R-8)

(a) 0 of 4,886 call edges by name; 11.2 % of changed definitions had no node. (b) The first test scored 1.8 % of product lookup cost. (c) Median 5,010 of 8,000 tokens used, so ranking could not matter; at the chosen depth the walk reached a median of 66 % of nodes per query.

## K. Owner decisions

- **Install indexers for the K3 extraction audit:** Approve one Python and one TypeScript indexer; skip coverage.py, since sys.monitoring is built into Python 3.12 (cost: Offline in a Linux container after one fetch; total size not verified).
- **Run the agent pilot:** Run after build steps 1-6 (cost: Model tokens, likely hundreds of thousands to a few million per arm (unverified)).
- **Send repository content to a model:** Not needed for tier 0; decide per step (cost: Content leaves the machine; model tokens).
- **Scope of program documents:** Index them by content hash, flagged separately (cost: Commit-keyed validity is impossible for untracked files).
- **Rule IDs in CLAUDE.md:** Minted IDs first (cost: A repository change if written into the source).
- **Tool form:** CLI (cost: Schemas are paid on every call (each 1,000 tokens is about 0.7% of tokens)).
- **Pin the FastAPI version in the image for K1:** Pin it (cost: Small).
- **Later tier 1 trials:** Defer (cost: Container size and maintenance).
- **Order against other work:** The owner's call; this design touches no product code (cost: Session time).
