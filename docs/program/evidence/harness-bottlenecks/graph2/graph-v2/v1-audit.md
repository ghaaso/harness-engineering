# Audit of the current code graph (v1): what each part does, where it came from, how good it is

Lane: audit of v1, research and design pass for graph v2 (2026-11-13). Read-only on the repository and on
the build folder; nothing was installed or downloaded; no agent and no model was run. The only file written
in the repository is this one. Three throw-away files (a PDF text extractor, a rename list and a git log)
were written in the session scratchpad under `scratchpad/v1audit/`, outside the build folder.

Words used below:
- **v1**: the parser-built code graph of the finished graph test (extractor version `59da7b753a4d908e`),
  with its shared retrieval specification (`build/arms/common/SPEC.md`) and the arms that implement it.
- **Frozen commit**: `a31924a`, the commit v1 was measured at (facts in
  `build/facts/cache/a31924a3818f4ac94b695906d107c72c912792b2/`).
- **Tuning tables**: the stage-1 and stage-2 score tables on the tuning split (`build-c/tuner-*.stage1.md`,
  `build-c/selection.json`), never the held-out split.
- **Primary**: recall of the reference files and definitions shown inside an 8,000-token answer (0 to 1),
  averaged per commit (the tuning tables' definition). **se** is its standard error over commits.
- **Origin** labels: **published** (a named technique, with its source), **simplified** (a published
  technique with something left out; what is said), **improvised** (no published source; chosen by hand).
- **Strength** of a literature claim: strong (independent, controlled, replicated), medium, weak (single
  study, self-reported, toy scale, or read only as an abstract or a summary).

`build/` below means `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build`.
`ev/` means `docs/program/evidence/harness-bottlenecks/graph2/`.

---

## 1. Short answer

- v1 is a **typed property graph built by static analysis** (a node and edge store with a kind on every
  node and edge), not a knowledge graph with a schema derived from questions, not a temporal graph, and not
  a learned model. Its **extraction is its strongest part**: calls are resolved by binding and by the
  TypeScript type checker, never by name alone, and sampled precision is 100 % for most edge kinds.
- Its **retrieval is mostly improvised or simplified**: personalised PageRank, BM25 and reciprocal rank
  fusion are published and implemented exactly; the degree-normalised ranking, the hub cuts, the
  per-class budgets, the edge weights, the 0.5 confidence floor, the 30-day half-life, the padding tails,
  the packer and all the parameter values were chosen by hand.
- **The tuning could not see what ranking does.** At the base depth of 2 hops the whole reach of a median
  task fits inside the 8,000-token answer (median 5,010 tokens used), so the order cannot change the
  primary score: every ranking mode moved T1 primary by at most +0.014 over plain breadth-first order
  (se 0.033), and recall at 16,000 tokens was identical (0.680) for all nine modes. Ranking did change the
  top of the list a lot (T1 MRR +0.10 to +0.18; T2 recall at 2,000 tokens up to +0.178). At unbounded
  depth, where order decides the primary, the eight rankings spanned only 0.023 (all within one se), and
  breadth-first order was never run there.
- **At the chosen depth, traversal selects nothing.** The final configuration (unbounded hops, both
  directions) reaches a median of 3,633 of 5,464 nodes (66 %) and 323 files per query (k0 replay); 97.9 %
  of nodes sit in one weakly connected component once the folder-membership edges are removed. The graph
  part of v1 is therefore a ranking over nearly the whole repository, and it was tuned by a
  one-factor-at-a-time sweep that tested ranking only where it could not matter.
- The **cache replay** is the one part built straight from documented theory (verifying traces and early
  cutoff, as in Salsa and Bazel Skyframe, plus a recorded negative-dependency check), and it did what that
  theory predicts.

The two lists the owner asked for are in section 7.

---

## 2. The three measurements asked for

### 2.1 Call edges whose target was chosen by name alone among two or more candidates

Measured on the frozen commit's `edges.jsonl` (4,886 call rows). Each call row was classed by how the
extractor resolved it (`attrs.how` in Python, `attrs.via` or none in TypeScript), and its target's simple
name was counted against all function, method, class and component definitions (1,901 definitions,
1,461 distinct names; 196 names are shared by two or more definitions, covering 636 definitions; the most
shared are Alembic `downgrade` and `upgrade` 46 each, `__init__` 26, test helpers `svc` 12).

| How the call was resolved | Call rows | Target name has 2+ definitions | Confidence below 1 |
|---|---|---|---|
| Python `name`: lexical binding, nested scopes then module scope then imports | 1,156 | 255 | 0 |
| Python `ctor`: a class name called, edge to its `__init__` | 598 | 78 | 0 |
| Python `typed`: receiver type inferred (annotations, return types, query flow) | 541 | 354 | 541 (0.9) |
| Python `self`: method found by walking the class's bases | 111 | 48 | 111 (0.95) |
| Python `module`: `module.attr` through an imported module | 49 | 0 | 0 |
| Python `singleton`, `chained_ctor` | 11 | 2 | 11 (0.9) |
| Python `protocol_impl`: implementations of a Protocol method, 1/k each | 13 | 13 | 0 (k = 1 everywhere) |
| TypeScript type checker (`getSymbolAtLocation`, aliases followed) | 2,360 | 596 | 0 |
| TypeScript `factory_value`: a callable produced by a factory | 47 | 27 | 47 (0.9) |
| **Total** | **4,886** | **1,373 (28.1 %)** | 710 |

Result: **0 call edges were chosen by name alone.** Python never links a call by global name: when a
call cannot be bound it is counted (`calls_unresolved_name_matches_repo_def` = 103 call sites whose name
matches some repository definition) and dropped. The only fan-out is the Protocol rule, and each of its 2
Protocols has exactly 1 implementation. A name-only resolver would have faced a choice on 1,373 of the
4,886 edges (28.1 %), so binding-based resolution is doing real work here.

The guessing that exists is elsewhere:
- **Python `typed`, `self`, `singleton`, `chained_ctor` (663 edges)** rest on a hand-written type
  inference, and 404 of them land on a shared name, so a wrong inferred type would pick a wrong
  same-named method. The base walk for `self` is depth-first over the written bases, not Python's C3
  method resolution order, which differs only under multiple inheritance. Parameters and local
  variables are not checked before the module scope (a simplified form of Python's local, enclosing,
  global, built-in lookup). Precision of these subsets was **not measured separately**; the whole call
  kind sampled 30 of 30 correct and all 4,872 rows of the previous version were machine-checked
  (`ev/build-a/audit-facts-NOTES.md`).
- **TypeScript takes the first declaration** of a symbol (`declarations[0]`); with overloads or merged
  declarations another declaration may be the real target. Not measured.
- **Documents to code are linked by a name dictionary** (`docs_extract.js`, `resolveName`): 1,380
  `mentions` rows from 1,195 mention sites; 1,073 sites have one candidate, 122 sites fan out to 2 to 5
  candidates (85 to 2, 16 to 3, 16 to 4, 5 to 5) at confidence 1/k. Strict precision 27 of 30
  (`ev/build-a/audit-facts-NOTES.md`). `constrains`: 8 anchors chosen by ambiguous name and 38 by
  ambiguous file; precision 19 of 20 (one wrong fan-out of `captured_at`). `cites`: 72 ambiguous rows.
  URL to route: 11 true ties among test-only `*`-method assertions (22 rows at 0.5).

Recall of call resolution is the weak side and is **not measured at scale**: the only probe found 37 of
37 calls over 15 symbols. The extractor's own counters at the frozen commit: Python 10,036 call sites, of
which 5,260 external, about 2,500 resolved, 2,148 unresolved (103 of them name-match a repository
definition); TypeScript 8,804 call sites, of which 4,303 have no declaration (no `node_modules` types, so
library and test-global calls land here), 1,357 external, 690 resolve to a parameter or a destructured
binding and get no edge (callbacks, props, hook results), 18 to other repository bindings. The 690 are a
known recall hole in exactly the mobile and web code where the graph helped most on held-out.
Literature anchor: PyCG reports about 99.2 % precision and 69.9 % recall for Python call graphs on its
own micro- and macro-benchmarks (arXiv 2103.00587, abstract read; self-reported, weak to medium). No
JavaScript or TypeScript figure was found by either earlier round or this one.

### 2.2 Connectivity and hubs

Canonical graph as the arms load it: one edge per (kind, source, target), self loops dropped, `co_changed`
symmetric, experimental layer left out: 5,464 nodes, 16,462 edges (calls 4,832, structure 4,615, imports
1,920, docs 1,817, history 948, membership 611, data 559, tests 530, capability 257, config 210, http 163).
"Definitions" = function, method, class, component, constant and test nodes. Weakly connected components:

| Edge set | Edges | Nodes in largest component | Files in it | Definitions in it | Edges in it | Other components / isolated nodes |
|---|---|---|---|---|---|---|
| All classes | 16,462 | 100 % | 100 % | 100 % | 100 % | 0 / 2 |
| Without membership (runtime/slice `contains`) | 15,851 | 97.9 % | 89.3 % | 99.7 % | 99.8 % | 6 / 87 |
| Code classes only (structure, imports, calls, http, tests, data, config) | 12,829 | 85.7 % | 85.4 % | 99.7 % | 95.5 % | 32 / 175 |
| Code classes without structure | 8,214 | 71.4 % | 77.0 % | 91.4 % | 98.9 % | 34 / 1,442 |
| Calls class alone | 4,832 | 25.7 % | 7.0 % | 40.4 % | 51.6 % | 40 / 2,670 |

So the code graph is one giant component: an unbounded traversal in both directions reaches most of the
repository, which is why "unbounded hops" won tuning and why traversal then selects nothing. The call
graph alone is fragmented (40 % of definitions in its largest component); connectivity comes from
`defines`, `imports` and the cross-runtime edges.

Degree (without membership edges, undirected count of distinct edges per node): mean 5.8, median 3,
90th percentile 12, 99th 44, maximum 140; Gini coefficient 0.526; the top 1 % of nodes hold 11.4 % of
all edge ends. The "production in-degree" that the hub cut uses (non-structural edges from non-test
sources, here over all non-structural classes, so an upper bound on any configuration's count): median 0,
90th percentile 3, 99th 20, maximum 70; Gini 0.783; top 1 % hold 21.9 %. Nodes above the cut thresholds:
328 above 5, 149 above 10, 74 above 15. A rough discrete power-law fit by maximum likelihood with the
cut-off chosen by the Kolmogorov-Smirnov distance (the method of Clauset, Shalizi and Newman,
arXiv 0706.1062; abstract read, the paper's own tests not reproduced) gives an exponent of about 3.5 over
the 82 nodes of degree 37 or more (KS distance 0.057) and about 3.1 for in-degree over 58 nodes of 19 or
more. With 58 to 82 tail points and no likelihood-ratio test against a log-normal, this does **not**
show a power law; it shows a moderately heavy tail. Myers (cond-mat/0305575, abstract only) reports
software collaboration graphs as scale-free; that claim is not tested here.

Hubs by total degree: `backend/app/main.py` 140, `backend/app/features/jobs/tests/test_service.py` 138,
`identity/deps.py#get_current_principal` 113, `jobs/service.py` 112, `attendance/service.py` 103,
table `job` 96, `ops-server.mjs` 91, `core/config.py` 89. By production in-degree: `core/db.py#get_session`
70, `core/config.py` 63, `main.py` 58, `get_current_principal` 58, `require_manager` 57, the document id
`requirements-2026-07-gap-analysis.md#R2` 53, table `job_event` 50, `AppContext.jsx` 48. These are
dependency-injection providers, configuration, the composition root, the busiest tables and one heavily
cited requirement id: the "plumbing" a hub rule is meant to stop, but also the files a change to them
really does reach.

### 2.3 How much each ranking mode differed from plain breadth-first order (tuning tables only)

Breadth-first order (`bfs`) = hop ascending, then the number of reach-DAG parents descending, then node
id. (That second key is itself a weak ranking, so "plain" BFS is not random within a hop.) Same base
configuration otherwise (file granularity, signature form, 2 hops, both directions, base classes, no hub
rule, no padding). Relational arm stage-1 table; the two graph-engine arms gave identical lists. Values are
the ranking mode minus bfs.

T1 (change completion, 388 tasks, 65 commits; bfs primary 0.651, se 0.033; median tokens used 5,010):

| Ranking | primary | recall @2k | recall @4k | top-10 file share | nDCG@10 | MRR |
|---|---|---|---|---|---|---|
| degree-normalised | +0.014 | +0.009 | +0.018 | +0.006 | +0.059 | +0.130 |
| PPR restart 0.30 (base) | +0.013 | -0.012 | +0.010 | +0.009 | +0.080 | +0.166 |
| PPR restart 0.15 | +0.011 | -0.025 | -0.003 | +0.010 | +0.082 | +0.159 |
| PPR restart 0.50 | +0.014 | +0.001 | +0.012 | +0.012 | +0.073 | +0.154 |
| PPR co-change weight 3 | +0.004 | -0.009 | +0.009 | +0.017 | +0.082 | +0.159 |
| co-change score | +0.000 | +0.004 | -0.002 | +0.024 | +0.064 | +0.110 |
| BM25 text | +0.009 | -0.006 | -0.001 | +0.007 | +0.036 | +0.104 |
| fusion PPR + text | +0.010 | -0.008 | +0.017 | +0.047 | +0.089 | +0.176 |
| fusion bfs + co-change + text | +0.010 | +0.007 | +0.004 | +0.044 | +0.099 | +0.180 |

T2 (tests to update, 240 tasks, 47 commits; bfs primary 0.647, se 0.036, recall @2k 0.302, MRR 0.133):
primary +0.007 to +0.030; recall @2k +0.067 (co-change) to +0.178 (text), PPR +0.110 to +0.152; nDCG@10
+0.049 to +0.169; MRR +0.078 (co-change) to +0.283 (fusion PPR + text).
T1x (cross-runtime commits, 144 tasks, 17 commits; bfs primary 0.448, se 0.043): primary -0.004 to
+0.004; MRR +0.110 to +0.221.

Reading:
- At 8,000 tokens the ranking barely mattered (all differences under one se) because the 2-hop reach of a
  median task fits in the budget; recall at 16,000 tokens is the same for every mode (T1 0.680). This is a
  **design defect of the sweep**, not evidence that ranking does not matter.
- At the top of the list ranking mattered a lot: MRR rose by 0.10 to 0.28 over bfs, and for T2 the first
  2,000 tokens held up to 0.178 more recall. An agent that reads only the head is exactly this case.
- At unbounded hops (stage 2, where order decides the 8,000-token answer) the rankings spanned 0.7626
  (`x_wsp`) to 0.7853 (degree-normalised), 0.023, all within one se (0.0254); PPR at restart 0.30 scored
  0.7843. **No bfs run exists at unbounded depth**, so the size of the ranking effect where it matters
  was never measured against the no-ranking baseline.
- The ranking that tuning chose (unbounded, degree-normalised) scored 0.011 lower on held-out T1 than the
  rule's first pick (4 hops, PPR) ([-0.004, +0.026]; `sealed/grader/heldout/NOTES.md` section 6): a choice
  made on differences below one se did not carry over.

### 2.4 One extra measurement: history lost to untracked renames

`git_extract.js` runs `git log --no-renames` and keeps only paths that exist at the build commit. Up to the
frozen commit, git's rename detection (`-M`, similarity of 50 % or more by default) finds 45 renames among
the 233 non-merge commits, 41 of them of code files (mostly the June move of `src/pages` and `src/components`
into `src/features/<x>/`). Of the 177 commits co-change uses (2 to 30 files), 10 touch a path that was later
renamed to a live path; following renames would add 138 file-pair occurrences to the 7,948 counted
(+1.7 %). 58 code paths that appear in history are absent at the frozen commit (deleted or renamed). So at
the frozen commit rename tracking matters little; it matters more at early parents and it would matter for
symbol-level identity. Hora, Silva, Valente and Robbes (ICSE 2018; abstract read through OpenAlex) found
10 % to 21 % of method-level changes untracked in 15 Java systems and about 25 % of entities with split
histories (medium: one study, 15 systems, Java).

---

## 3. Part by part

Each entry: how it works now; origin; measured quality; known gap.

### 3.1 Node kinds, and what has no node

- **How.** 25 node kinds at the frozen commit (5,464 nodes): function 1,236, test 1,128, file 514,
  doc_section 452, column 439, constant 358, method 288, class 242, component 135, client_url_site 122,
  doc_id 108, setting 87, route 85, slice 50, migration 46, table 42, screen 34, doc 27, invariant 20,
  missing_ref 13, outbox_kind 11, invariant_group 8, ambiguous_ref 7, scheduled_job 6, runtime 6. Ids are
  `sym:<path>#<Outer.inner>` and similar. Constants are only names matching `^_?[A-Z][A-Z0-9_]{2,}$` at
  module level. Object-literal members become nodes only when held by a variable (not through `as const`
  or parentheses). Pydantic schema fields exist only in the experimental layer (`has_field`,
  `reads_response_field`; 390 nodes, 1,622 edges; precision 10 of 20), which is not loaded by default.
- **Origin.** Improvised schema, extended lane by lane from the first research round's edge list and the
  critic's list of missing edges (`ev/research/critic.txt`). Not derived from competency questions, from
  an ontology, or from a published code schema (for example the LocAgent directory/file/class/function
  schema, which is a subset of this one).
- **Quality.** Held-out T1 reference definitions with no node: 354 of 3,150 (11.2 %), of which variables
  and object members 252 (8.0 %); tuning T1 364 of 4,162 (8.7 %) (`sealed/grader/heldout/NOTES.md`).
  Question 40 of the held-out questions is answered empty by every typed arm because its member has no node.
- **Gap.** Lower-case module variables, object members (config objects, `jest.mock` factories), schema
  fields, local closures that are not called, SQL columns read (only `writes_column` exists), commits and
  PRs as nodes (history exists only as a weight on file pairs).

### 3.2 Edge kinds and name resolution

- **How.** 36 kinds loaded by default (18,875 evidence rows, 16,462 canonical edges) plus 3 experimental.
  Python: stdlib `ast` with hand-written binding (nested scopes, module scope, imports, relative imports,
  module-level singletons, `self` attribute types, return-type and query-flow typed locals, Protocol
  implementations). TypeScript and JavaScript: TypeScript 5.3.3 compiler API, two programs (mobile,
  web), no `node_modules`, so only repository code is typed. Cross-runtime edges (`calls_url`,
  `test_calls_route`, `registers_route`) by matching URL literals to route patterns: server preference,
  then more literal segments; remaining ties fan out at 1/k. SQL tables from string literals passed to
  `text()`, `execute()`, `exec_driver_sql()`. Settings by `settings.<field>`, `os.environ`, `process.env`,
  `config.<chain>`. Documents by path matching (`cites`) and a name dictionary (`mentions`,
  `constrains`), ties at 1/k after six tie-break rules.
- **Origin.** Simplified forms of published static analysis: Python call resolution is a simplified
  scope-and-type analysis in the family of PyCG (Salis et al., ICSE 2021) without its assignment-graph
  fixpoint; TypeScript uses the compiler's own symbol resolution (published tool, exact within what it
  can see). URL-to-route matching, SQL-literal scanning and the document dictionary linking are
  improvised (dictionary-based entity linking with hand-made tie-break rules).
- **Quality.** Sampled precision 100 % for calls, calls_url, imports, defines, contains, renders,
  depends_injects, passes_callable, overrides, mocks, inherits, foreign_key, maps_table, migration
  edges, navigates and most small kinds; reads_setting 29 of 30 before the fix; mentions 27 of 30 strict;
  constrains 19 of 20; cites 29 of 30 strict; SQL-text table edges now 24 of 24 groups read. Recall: calls
  37 of 37 on 15 symbols (tiny probe); production URL sites 78 of 78; pytest route calls 386 of 386;
  invariant anchors 51 of 51 tokens after the fix; precision and recall of the inferred-type Python calls
  and of TypeScript first-declaration picks not measured separately.
- **Gap.** See 2.1: 690 TypeScript calls through parameters or destructured bindings have no edge; 2,148
  unresolved Python call sites are not characterised; no call graph benchmark for JS/TS. The edge
  `weight` is the extractor's confidence in the edge's existence, which the rankings then use as if it were
  strength of relevance (see 3.6).

### 3.3 Identity across renames and commits

- **How.** A node's identity is its id string: path plus qualified name (tests: path plus the joined
  `describe > it` titles; a duplicate id gets a `~2` suffix by visiting order). Each commit's graph is
  built from scratch; nothing links a node at one commit to the same entity at another. The cache replay
  matched questions across snapshots by id only.
- **Origin.** Improvised (name-based identity). Published alternatives exist and were not used: git's
  rename detection, origin analysis and method-history trackers (CodeShovel, ICSE 2021; CodeTracker,
  FSE 2022; seen only in a search summary, numbers not checked).
- **Quality.** Not measured inside v1. Section 2.4: 45 file renames in the frozen history; following
  them would add 1.7 % pair occurrences to co-change at the frozen commit.
- **Gap.** A moved file, a renamed function or a retitled test is a new entity; anything stored about the
  old id (a cached conclusion, a co-change count, a citation) is orphaned. This matters for v2's
  "what was already concluded and whether it still holds", which needs stable identity first.

### 3.4 History edges (`co_changed`)

- **How.** Non-merge ancestors of the build commit; commits of the task's own PR dropped (leak control);
  commits touching 2 to 30 files; one edge per direction for pairs with support 2 or more;
  `confidence = support / commits touching the source file`; `recency_weight = sum of 0.5^(age_days/30)`
  stored in attributes; renames not followed (`--no-renames`); file level only. Frozen commit: 177 commits
  used, 5,949 pairs with support 1 or more, 948 with 2 or more, 355 with 3 or more.
- **Origin.** Simplified association-rule mining of evolutionary coupling (Zimmermann, Weissgerber, Diehl,
  Zeller, ROSE, ICSE 2004 / TSE 2005, read by the first round): support and confidence as in ROSE, the
  30-file cap as in ROSE's transaction filter. Simplified: pairs only (no rules with several antecedent
  files, which TARMAQ by Rolfsnes et al. adds), file level only, no tangled-change filter. The 30-day
  half-life is improvised (TARMAQ and Moonen et al. report that recent history is worth more, but give no
  half-life); minimum support 2 is improvised (ROSE explored 1 and 3).
- **Quality.** All 948 pairs reproduced by an independent recomputation (`ev/build-a`). Usefulness: adding
  the history class moved the base primary by +0.056; on held-out, half of the typed primary's recall
  (0.337 of 0.670 per task) was reached through an explanation path that contains a co-change edge, and
  the typed store could not be told apart from the co-change floor outside the mobile app (+0.001
  [-0.051, +0.056]).
- **Gap.** `recency_weight` is computed but **no ranking reads it** (only the CO padding tail does).
  The confidence floor `minConf = 0.5` of unweighted traversals removes 318 of the 948 co-change pairs
  (34 %) from the reach (their higher-direction confidence is below 0.5), while PageRank uses them all:
  the two halves of v1 see different history graphs. ROSE-style confidence is asymmetric and v1 keeps the
  higher direction only.

### 3.5 Traversal modes and the hub cuts

- **How.** Breadth-first k-hop (`khop`) over arcs filtered by direction, edge class and `minConf`;
  per-class budgets (`budget`, a mixed-radix counter of edges used per class); ordered metapaths
  (`metapath`, a small automaton of typed steps with min and max repeats). Hub rules: `indeg` blocks a node
  whose production in-degree exceeds k (k = 5, 10, 15 tried); `transport` blocks structural nodes and
  functions called from 3 or more distinct slices. A blocked node is reached but not expanded.
- **Origin.** k-hop: published (breadth-first search; RepoGraph's k-hop ego graph, LocAgent's hop-bounded
  traversal). Metapath: simplified from heterogeneous-network meta paths (Sun et al., PathSim, VLDB 2011;
  the paper could not be opened in this pass: its PDF text is font-encoded) and closer to a regular path
  query with bounded repeats; PathSim's normalised similarity is not used, only reachability. Budgets:
  improvised. Hub cuts: improvised; they resemble the removal of "omnipresent" modules in software
  clustering (Müller et al. 1993; Bunch), not read in this pass, and Aider's x0.1 multiplier for names with
  more than 5 definers, which has no published ablation (first round).
- **Quality (tuning T1 primary, se about 0.03).** Hops: 0.438 at 1, 0.664 at 2, 0.727 at 3, 0.768 at 4,
  0.780 at 6, 0.784 unbounded. One direction only: 0.449 (dependents) and 0.460 (dependencies) against
  0.664 both. Budgets B1 0.779, B2 0.755 (both unbounded, about equal to plain unbounded k-hop). The one
  stage-1 metapath 0.615 (below the base). Hub cuts at 2 hops: indeg>5 0.599, >10 0.635, transport 0.665
  (base 0.664); at unbounded depth transport 0.784 and indeg>15 0.780 against 0.784 without a cut.
- **Gap.** Hub cuts only removed recall or did nothing; the first round had already found hub damping no
  help. Unbounded both-direction reach covers 66 % of nodes per query (2.2), so traversal is not a
  selection step at the chosen setting. The metapaths were hand-written shapes, not derived from the
  questions or learned.

### 3.6 Rankings and their parameters

- **How.** `bfs` (hop, then reach-DAG parent count, then id); `degnorm` (one pass down the
  shortest-path DAG: a node's score is the sum over its DAG parents of parent score / parent out-degree,
  seeds 1/|S|); `ppr` (personalised PageRank, 40 power iterations, restart to the seeds, dangling mass to
  the seeds, arc weight = edge confidence, history arcs times `cochange_w`); `cochange` (sum of co-change
  confidences from the seed files); `text` (BM25, k1 1.2, b 0.75, as SQLite FTS5); `hybrid` (reciprocal
  rank fusion, k = 60). Native extensions in the engine arms: weighted shortest path with hand-set kind
  costs (`x_wsp`), a Louvain community prior (`x_comm`), engine PageRank (`x_prank`), k-core (`x_core`).
- **Origin.** PPR: published (Page, Brin et al. 1999; Haveliwala 2002 topic-sensitive PageRank; not
  re-read in this pass), implemented exactly. BM25: published (Robertson et al.), copied exactly from
  FTS5. Reciprocal rank fusion: published (Cormack, Clarke, Büttcher, SIGIR 2009, read: k = 60 "was fixed
  during a pilot investigation", found "near-optimal, but the choice was not critical"; RRF beat Condorcet
  fuse 7 of 7 and CombMNZ 6 of 7 TREC combinations, 4 % to 5 % MAP on average; medium). Co-change score:
  simplified ROSE. Degree-normalised: simplified spreading activation (Collins and Loftus 1975; Crestani's
  1997 survey; not read in this pass) with no decay, no firing threshold, and propagation along
  shortest-path arcs only; the exact form is improvised. Louvain: published (Blondel et al. 2008), used
  as a ranking prior in an improvised way, unseeded so each store build gave another partition. Kind
  costs for `x_wsp`: improvised.
- **Parameter choice.** Restart 0.30 (tried 0.15, 0.30, 0.50), co-change weight 1 (tried 1 and 3), 40
  iterations, `minConf` 0.5 (tried 0 and 1), BM25 k1 and b at FTS5 defaults, RRF k = 60: all hand-picked
  values, some from the first round's measurements (restart 0.15 to 0.30, weight 1.0 best of 0.5, 1, 3 on
  45 commits) and none fitted to the task. Every non-history edge has weight about 1, so PageRank treats a
  test-to-route edge, an import, a doc mention and a call as equally strong; the confidence that does vary
  is the extractor's certainty, not relevance.
- **Quality.** Section 2.3.
- **Gap.** No ranking learns from the 388 tuning tasks which edge kinds carry change. That is exactly what
  supervised proximity methods do (section 6, R1). No ranking reads time (recency) or uses the
  question kind.

### 3.7 How the 60 configurations were chosen, and what was never tried

- **How.** Stage 1: 40 configurations, one factor at a time around a base (hops, direction, class
  ladder, `minConf`, ranking, hub, padding, granularity, form), "written before any score was seen".
  Stage 2: 20 more written by a tuner after reading the stage-1 table, each with a one-line reason
  (`build/arms/relational/NOTES.md`). Selection: highest T1 primary, then the lowest complexity within one
  se of the best, then fewer tokens, then the configuration name.
- **Origin.** One-factor-at-a-time screening: a published but weak design of experiments (it cannot see
  interactions); the selection's "within one standard error, prefer the simplest" is the published
  one-standard-error rule (Breiman et al. 1984; Hastie, Tibshirani, Friedman; not re-read here). The
  factor levels are improvised. Random search was shown by Bergstra and Bengio (JMLR 2012, abstract read)
  to find models "as good or better" than grid search in "a small fraction of the computation", and to tie
  manual-plus-grid tuning on 4 of 7 data sets and beat it on 1 (medium, neural networks).
- **Quality.** The design hid the main interaction: ranking can matter only when the reach exceeds the
  budget, and stage 1 tested every ranking at 2 hops where it does not. The tie-break by name picked the
  weakest of 15 tied configurations (`ev/build-c/audit-selection-NOTES.md`, D3); after the amendment, the
  tuned pick lost 0.011 to the first pick on held-out.
- **Never tried.** Ranking modes at any depth other than 2 and unbounded; bfs at unbounded depth; any
  learned weights (per edge kind, per question kind); random or factorial search; cross-validation by
  commit inside tuning; per-runtime configurations (held-out showed the effect is almost all mobile);
  hop limits per edge class other than two hand-written budgets; token budgets per item; any form between
  "signature of every definition in the file" and "paths only" (for example top-k definitions per file);
  diversity in the packed list.

### 3.8 The packer (choosing items for a token budget)

- **How.** Ranked nodes are projected to files (or symbols), padded with an optional tail, rendered in one
  form, and laid in rank order until the budget (2,000, 4,000, 8,000, 16,000 tokens) is full; the last
  item is cut on whole lines; an 8-token footer says how many were not shown. Tokens are counted by a
  regex approximation of a code tokenizer (`tokenizer.js`), not a model's tokenizer.
- **Origin.** Improvised greedy prefix fill. Aider packs by binary search on the number of ranked tags to
  land within 15 % of the budget (first round, read); budgeted selection as a knapsack or a submodular
  coverage problem is the published framing, not used (not read in this pass).
- **Quality.** Form dominated: snippets 0.363 against signatures 0.664 at the base; symbol granularity
  0.518. The signature form of a file lists every definition, so a large file costs its whole outline
  whether one or fifty definitions matter.
- **Gap.** No value per token: a 2,000-token outline at rank 3 pushes out four 300-token files at ranks
  4 to 7. No redundancy control. No per-item choice of form.

### 3.9 Seeds and padding

- **How.** A task seed (a file and optionally a definition) maps to the file node plus the definition by
  id, by name and line, by line, or every definition inside the range (at most 50). Padding tails: DIR
  (same directory, same-named capability folders, then parent directories) and CO (files co-changed with
  the seed file, by count then recency, then DIR).
- **Origin.** Improvised; the floors were built as baselines modelled on what an agent does, as the first
  round asked.
- **Quality.** Padding was the largest single gain at 2 hops (CO +0.107); on held-out the scripted search
  drew 48 % of its recall from the CO tail; the CO floor alone was within noise of the typed store outside
  mobile.
- **Gap.** Seed matching is identical in every arm, so it biases none, but 105 of 418 held-out T1 tasks
  matched by file only and 6 matched nothing.

### 3.10 The per-kind question programs

- **How.** Eight question kinds (screens to tables, tests that reach a function, invariants on a file, the
  other half of a contract, readers of a setting, migrations touching a table, clients of a route, change
  reach), each one hand-written SQL with recursive common table expressions (depth cap 12) over the
  canonical graph, ported to Cypher-like patterns in the graph arms; targets parsed from the question text
  by one shared parser.
- **Origin.** Improvised: metapath-style query programs written per question, after the schema existed.
  Competency questions (Grüninger and Fox 1995) are the published method for deriving a schema from the
  questions it must answer; here the direction was the reverse.
- **Quality.** Held-out, 30 questions: typed macro F1 0.745 against scripted search 0.645, +0.100
  [-0.060, +0.257], inconclusive; the typed arms lost "the other half of a rule" by -0.306 mean F1 over 4
  questions and won six kinds; answers about 31 tokens against search's 695 tokens read. The typed side's
  cost of knowing the schema and writing the programs is not counted.
- **Gap.** Eight fixed programs do not cover an agent's open questions; no general query interface was
  tested with an agent; schema gaps (3.1) show up as empty answers.

### 3.11 Cache replay and dependency recording (k0)

- **How.** Each answer of 250 questions (and 100 change-completion rankings) was computed once and stored
  with what it read: every node and edge (whole-record and semantic hashes), every query pattern with a
  hash of its matched set (negative dependencies: "the in-edges of kind X of node Y"), the files, and
  sub-results for early cutoff. Policies from "never invalidate" to fact level with early cutoff were
  replayed over 190 snapshots in their ancestry tree.
- **Origin.** Published: verifying traces and early cutoff of build systems (Mokhov, Mitchell, Peyton
  Jones, "Build systems à la carte"; Salsa backdating; Bazel Skyframe change pruning; rustc red-green),
  read by the second round from documentation and slides (the paper's PDF was unreadable there). The
  pattern-level negative dependency is the database idea of predicate or range locks applied to
  invalidation; v1 did not cite a source for it and none was read in this pass.
- **Quality.** Fact level with patterns: 87.6 % of 29,097 lookups served, 0 stale; read-field hashes
  95.9 %, 0 stale; file level 86.5 % with 6.5 % stale (13.2 % on the questions that change); without the
  patterns 6.8 % stale. The whole-graph ranking cached at 9 % to 25 %. Zero stale is expected by
  construction for programs whose every read is recorded, and is judged against the extractor's own facts.
- **Gap.** Only cheap deterministic answers were cached; nothing a model derived. Identity is the id string
  (3.3), so a rename invalidates rather than migrates. No time validity on facts (no valid-from or
  valid-to), so "was this true at commit X" needs the snapshot.

---

## 4. What the earlier rounds got wrong or skipped in this area

- **They tuned and judged ranking where it could not matter.** The first round's algorithm lane measured
  rankings at 10 files on an import graph; the build then put every stage-1 ranking at 2 hops, where the
  reach fits the budget. Neither round noticed that the primary score could not move; the stage-2 tuner
  noticed it after stage 1 (`relational/NOTES.md`), but bfs was not re-run at depth.
- **They treated the extractor's confidence as a ranking weight** without saying so. Neither round asks
  what the arc weight in PageRank should mean; the literature on learning edge strengths for random walks
  (supervised random walks) was not read. Ranking as link prediction or learning to rank was out of scope
  in both rounds.
- **The first round's rename warning was half right.** It said the HEAD file set "lost over half the
  co-change coverage", but that was mostly the HEAD-versus-parent problem, which v1 fixed by building at
  every parent. With per-parent builds, following renames adds 1.7 % of pair occurrences at the frozen
  commit (2.4). Rename tracking was still not implemented, and nobody measured its effect.
- **Call recall was never measured beyond a 15-symbol probe**, although the first round predicted about
  70 % for Python from PyCG and found no JS/TS figure. The extractor's own counters (690 TypeScript calls
  through parameters with no edge) were reported but not turned into a recall estimate.
- **Connectivity was noted, not used.** The critic warned that "within 5 hops says nothing" because most
  nodes are within 5 hops; the build then chose unbounded reach without reporting that it covers about
  two thirds of the graph per query.
- **The sweep design itself was not questioned**: one factor at a time, levels by hand, a tie-break by
  configuration name. The audit caught the tie-break, not the design.
- **The cache work is the exception**: it followed the published build-system theory and tested it the way
  that theory says to.

---

## 5. Literature checked in this pass

| Source | What was read | Claim used here | Measured how | Strength |
|---|---|---|---|---|
| Backstrom, Leskovec, "Supervised Random Walks", WSDM 2011, arXiv 1011.4071 | ar5iv full text (tables 1 to 4) | Learns edge strengths a_uv = f_w(features) for random walk with restart by gradient descent on a ranking loss. Hep-Ph (12,527 nodes, 118,515 edges, 340 source nodes): AUC 0.712 against 0.638 for unweighted walk with restart, 0.674 logistic regression; Facebook Iceland (174,000 nodes, 29 M edges, 200 sources): 0.828 against 0.817 and 0.817; precision@20 statistically tied with logistic regression on all five networks. Restart 0.3 best for unweighted walks, 0.3 to 0.7 equal for weighted. | Link prediction on co-authorship and social graphs, half the sources for training | medium (one paper, five networks) |
| Cormack, Clarke, Büttcher, SIGIR 2009 | full text (PDF extracted) | RRF k = 60 fixed in a pilot, near-optimal, not critical; beat Condorcet 7/7 and CombMNZ 6/7, about 4 % to 5 % MAP | TREC collections, sign test | medium |
| Salis et al., PyCG, ICSE 2021, arXiv 2103.00587 | abstract | Python call graph precision about 99.2 %, recall about 69.9 % | authors' micro- and macro-benchmarks | weak to medium (self-reported) |
| Bergstra, Bengio, JMLR 2012 | abstract | Random search as good or better than grid search at a fraction of the cost; ties manual+grid on 4 of 7 data sets, better on 1 | neural networks, deep belief networks | medium |
| Clauset, Shalizi, Newman, arXiv 0706.1062 | abstract | Power laws must be fitted by maximum likelihood and tested (KS, likelihood ratios); some of 24 claimed power laws are ruled out | 24 data sets | strong for the method |
| Myers, cond-mat/0305575 | abstract | Software collaboration graphs reported scale-free and small-world | several open-source systems | weak here (abstract only) |
| Hora, Silva, Valente, Robbes, ICSE 2018 | abstract via OpenAlex | 10 % to 21 % of method-level changes untracked; about 25 % of entities with split histories | 15 Java systems | medium |
| CodeShovel (ICSE 2021), CodeTracker (FSE 2022) | search summary only | method-history tracking tools; reported about 90 % recall, later contested | not checked | not used as evidence |
| Sun et al., PathSim, VLDB 2011 | could not open (PDF text font-encoded) | named only | - | - |

Not read in this pass and named only as the origin of a technique: PageRank and topic-sensitive PageRank,
BM25, spreading activation, Louvain, the one-standard-error rule, omnipresent-module removal in software
clustering, competency questions, predicate locks, budgeted submodular selection. Numbers from the first
and second rounds (ROSE, TARMAQ, RepoGraph, LocAgent, LARGER, Aider, Legunsen et al., Salsa) are cited as
those rounds recorded them.

---

## 6. What the audit implies for v2 (concrete, each with the test that can reject it)

Scale note for all of these: the graph has about 5,500 nodes and 16,500 edges, the tuning split 388 T1
tasks over 65 commits; everything below runs in milliseconds to seconds on one CPU at this size and at 10
times it. At 100 times (half a million nodes) power-iteration PageRank per query would need a precomputed
or approximate form (push-based local PPR), and learning would still be cheap.

**R1. Learn the edge weights of the walk from the tuning tasks (supervised random walks).**
Build: PageRank with restart whose arc weight is `sigmoid(w · features)`, features = edge kind (one-hot over
the 36 kinds), extractor confidence, co-change support and recency, source and target degree, same runtime
or not, test endpoint or not; learn `w` on tuning T1/T2 seeds with the Wilcoxon-Mann-Whitney ranking loss as
in Backstrom and Leskovec. Replaces: `ppr` with uniform weights and `cochange_w`, and `degnorm`.
Expect: a small gain in the head of the list (the paper's gains are +0.01 to +0.07 AUC, with precision@20
tied against a plain classifier), concentrated where edge kinds differ in value (cross-runtime and test
edges). Test that rejects it: 5-fold cross-validation by commit inside tuning; it fails if recall at 2,000
tokens and the primary at unbounded depth do not beat the current degree-normalised ranking by more than
one se in the held-in folds, or if a plain logistic regression on the same features (the paper's own
strongest baseline) matches it. Install: nothing (a gradient loop in Node over the existing adjacency).

**R2. Re-run the ranking comparison where ranking can matter, with the no-ranking baseline.**
Build: bfs, PPR, degree-normalised, co-change, text and their fusions at unbounded depth and at 3 and 4
hops, scored at 2,000, 4,000 and 8,000 tokens. Replaces: the stage-1 ranking rows at 2 hops. Expect: the
spread grows at 2,000 tokens, as T2 already shows. Test: if no ranking beats bfs at unbounded depth by more
than one se at any budget, ranking work is not worth doing on this graph. Install: nothing.

**R3. Replace one-factor-at-a-time tuning with random search plus cross-validation by commit.**
Build: 60 configurations drawn at random from the same factor space (Bergstra and Bengio), scored by
5-fold commit-clustered cross-validation inside tuning, selection by the one-se rule with a tie-break that
is not a name. Replaces: stage 1 and the hand-written stage 2. Test: if the best random draw is within one
se of the current best and the cross-validated choice is the same configuration, the old design was
adequate. Install: nothing.

**R4. Pack by value per token, not by rank order.**
Build: greedy selection by (rank score or predicted relevance) divided by item tokens, with per-file
choice between "outline of the top m definitions" and "path only". Replaces: prefix fill in `packer.js`.
Test: same ranked lists, recall at 2,000, 4,000 and 8,000 tokens on tuning; reject if not better by one se
at 2,000 and 4,000 tokens. Install: nothing. (The source framing, budgeted coverage, was not read in this
pass.)

**R5. Measure call recall before adding anything else to extraction.**
Build: a seeded sample of 30 of the 690 TypeScript parameter or destructured calls and 30 of the 2,148
unresolved Python call sites, read by hand, to estimate how many have one repository target. Test: if fewer
than one in five does, the hole is mostly external calls and not worth closing. Install: nothing.

**R6. Stable identity before cached conclusions.**
Build: follow git renames (`-M`) in co-change, and keep a per-commit map from old to new ids for files
(git renames) and for definitions (same qualified name in the renamed file, or same body hash). Replaces:
id-string identity. Expected effect on retrieval at the frozen commit: small (+1.7 % pair occurrences).
Its real use is keeping conclusions attached across moves. Test: on the 190 snapshots, count cached
entries orphaned by renames under each identity rule; if under 1 % of entries, skip the definition map.
Install: nothing.

Not recommended from this audit: hub cuts (every cut tried lost recall or did nothing; the first round
found the same), and more hand-written metapath shapes (the one in stage 1 scored below the base).

---

## 7. The two lists

### What in v1 rests on the literature

1. Personalised PageRank with restart (Page, Brin et al.; Haveliwala), implemented exactly to a written
   specification.
2. BM25 text ranking (Robertson et al.), copied exactly from SQLite FTS5.
3. Reciprocal rank fusion with k = 60 (Cormack, Clarke, Büttcher 2009).
4. Co-change support and confidence and the 30-file transaction cap (Zimmermann et al., ROSE), in a
   simplified pair-only form.
5. k-hop ego-graph retrieval as in RepoGraph and LocAgent; the hop sweep follows their measured results.
6. TypeScript call, import and render resolution by the TypeScript compiler's own symbol resolution.
7. Python call resolution by scope, import and type analysis in the PyCG family (simplified: no
   assignment-graph fixpoint, no local-variable shadowing check, depth-first base walk instead of C3).
8. Ordered metapaths, as a simplified form of heterogeneous-network meta paths (reachability only, no
   PathSim normalisation).
9. Louvain communities (Blondel et al.) as an optional prior in one engine arm.
10. The cache replay: verifying traces and early cutoff from build systems (Salsa, Skyframe, rustc,
    "Build systems à la carte").
11. Selection within one standard error of the best, preferring the simplest (the one-se rule).
12. The evaluation discipline: leak-free per-parent builds, a date split, held-out once, clustered
    bootstrap by commit, cheap floors as baselines (from the first round's reading of LARGER, CodeCompass
    and test-selection studies).

### What in v1 was improvised

1. The node and edge schema itself (25 node kinds, 36 edge kinds), grown lane by lane, not derived from
   questions; constants only by an upper-case regex; no nodes for variables, object members or schema
   fields in the default graph.
2. Edge weights: the extractor's confidence used as relevance; every non-history edge weighted about 1.
3. The confidence floor `minConf = 0.5`, which silently drops 34 % of co-change pairs from traversal but
   not from PageRank.
4. The 30-day half-life and minimum support 2 for co-change; recency computed and never used by a ranking.
5. Identity by path and qualified name; no rename tracking (`--no-renames`), no cross-commit identity.
6. Document linking by a name dictionary with six hand-made tie-break rules and 1/k fan-out.
7. URL-to-route matching rules and SQL-literal table extraction.
8. The degree-normalised ranking (a one-pass spreading activation along the shortest-path DAG).
9. The hub rules (in-degree thresholds 5, 10, 15 and the "called from 3 slices" transport rule).
10. Per-class traversal budgets and the hand-written metapath shapes.
11. The weighted-shortest-path kind costs in the engine arms.
12. Every numeric parameter: restart 0.30, co-change weight 1 and 3, 40 iterations, hops 2 as the base.
13. The 60 configurations: one factor at a time around a hand-picked base, plus 20 picked after reading
    the first table; the tie-break by configuration name.
14. The packer: rank-order prefix fill with a whole-file outline per item; the regex tokenizer.
15. The padding tails (DIR, CO) and the seed-mapping rules.
16. The eight question programs and their depth cap of 12.
17. The negative-dependency (query-pattern) record in the cache replay, sound in effect but cited to no
    source.
</content>
</invoke>
