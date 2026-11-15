# Graph v2: a design derived from theory (2026-11-13)

Lane: GRAPH V2 DESIGN. Inputs: `use-cases.md`, `v1-audit.md`, the six lane notes (`lane-*.md` in this folder), the two verifiers (`verify-a.md`, `verify-b.md`, which override the lanes), round 1 (`../research/`) and round 2 (`../widen/`). I built and ran nothing; every number below comes from those notes, which name the script or the paper it came from. Reference keys in [brackets] resolve in section 13. Strength marks: S strong, M medium, W weak.

**Terms, defined once.** *Competency question (CQ)*: a question the model must be able to answer, written before the schema [Gru]. *Property graph*: typed nodes and typed edges that both carry properties. *Knowledge graph*: a graph with a schema, stable identity, provenance and quality measures [Hogan]. *Metapath*: a sequence of edge kinds on the schema, used as a typed query [Shi]. *Hyperedge (n-ary relation)*: one relation over more than two nodes [Zhou06]. *PPR*: personalised PageRank, a random walk that restarts at the seed nodes. *RRF*: reciprocal-rank fusion, score = sum of 1/(k + rank) over rankers [RRF]. *P@10*: share of the top 10 files that are in the truth set. *Rolling origin*: train only on commits earlier than the commit being scored. *Premise*: a recorded fact an answer or conclusion rests on. *Early cutoff*: stop invalidating when a recomputed premise gives the same result [BSaC]. *Carried tokens*: fetched tokens times the later calls in the same window that re-read them (`use-cases.md` §2.3). *Tuning data*: the 65 tuning commits (388 seeds) with leak-free parent builds and the 191 cached snapshots.

**Counting rule** (verify-a): the frozen commit has 5,464 nodes, 36 edge kinds (not 37), 18,875 edge records and 17,410 distinct (source, target, kind) edges, and 441 test-to-route records (not 39). All v2 counts use these.

## 0. What kind of graph this is, and the ceiling

v2 is a **typed property graph used as a knowledge graph** in Hogan's sense [Hogan]: a schema derived from CQs, stable identity, provenance and a quality card on every fact. It has a **temporal layer** (each fact and conclusion valid over a set of commits, with premises re-checked on change), and an **n-ary layer** (change sets, rules with roles, claims with premise sets). It is **not** a temporal knowledge graph in the forecasting sense (TLogic, RE-Net): those models need thousands of events per relation and this history has about 230 non-merge commits; only their cheap parts (recency decay, noisy-OR) are reused [TLogic][Gast]. It is not an embedding or GNN model (section 9 says why, with numbers). Model-written content enters only as conclusions with recorded premises, never as code edges.

**Ceiling, from the owner's own records.** Fetched content is 22.5 to 28.5 % of context tokens; lookup-only calls re-read 43.6 to 55 % (exposure, overlapping) (`../widen/architecture.md` §2). The CQs a graph can serve (section 1, marked G) carry 91.9M of 242M product carried tokens (38 %, about 8.8 % of product context) and 845M of program work (about 21 % of program context, the upper end because CQ1's label is the noisiest). CQ3 cards add up to 4.8 % and 1.1 %. My illustration, not a forecast: if an answer is one fifth the size of the read it replaces and agents use the tool for half of these lookups (58 % of CodeCompass trials made no graph call, `../widen/lane-agents.md`), v2 could move about 3 to 5 % of product context and about 8 % of program context, minus its own prefix (each 1,000 tokens present in every window is about 0.7 % of tokens). It could also cost tokens: CodexGraph's graph interface used 7 to 15 times the tokens of BM25 for equal or slightly better results [CodexGraph] (S, verify-a). **Only an agent test can show the real share**; everything below is designed so zero-model tests on tuning data can kill parts of it first.

## 1. Competency questions, ranked by what they cost today

From `use-cases.md` §5 (1,452 transcripts, rule labels right about 3 calls in 4). Carried tokens, millions. G = graph question; P = partly (graph narrows, bodies are still read); I = an index answers it, a graph adds nothing; R = reading.

| CQ | Question (short) | Product | Program | Role | Served by |
|---|---|---|---|---|---|
| CQ1 | What did an earlier lane, review or agent conclude about X; does it still hold? | 0.9 | 521 | G | M4, T4 |
| CQ2 | What does the plan say about my phase: findings, decisions, sections? | 20.4 | 182 | G | M3, A1 `brief` |
| CQ3 | How does subsystem S work: files, entry points, state, flows? | 50.0 | 45.4 | P | M1 card + spans |
| CQ4 | Which rule constrains the code I am changing, and why? | 21.0 | 72.0 | G | M3, A1 `rules` |
| CQ5 | Where is X defined; signature; body? | 37.7 | 37.5 | I | symbol index (K2) |
| CQ16 | What do build, CI, ops and lab scripts do? | 17.7 | 21.0 | R | none (left to reading) |
| CQ6 | What does this change set change, and what depends on it? | 17.6 | 14.9 | G | M5, R5 |
| CQ11 | Which files exist; where is the file for X? | 4.6 | 27.9 | I | file index |
| CQ7 | Which tests and fixtures exercise X? | 11.3 | 8.9 | G | M1 test edges |
| CQ8 | Who uses or references X, including by string literal; what breaks? | 10.2 | 9.2 | G | M1, M2, R5 |
| CQ10 | What changed here recently, and why? | 4.3 | 13.3 | G | M5, T6 |
| CQ9 | Where is item ID X defined and cited? | 0.8 | 9.2 | G | M3 |
| CQ12 | What sections does document X have? | 0.7 | 6.3 | G | M3 outline |
| CQ13 | Where is the other half of a contract? | 2.4 | 2.9 | G | M2 |
| CQ15 | Which table, migration or setting is behind X? | 2.1 | 2.3 | G | M1 |
| CQ14 | Does this file:line citation still say what the document claims? | 0.2 | 2.6 | G | T5 |

Left to reading (not graph questions): reading bodies once located, operations output (gate logs, CI status; 22.9M product), instruction files, checking a known line, past transcripts, web pages and library source. v1 was scored on CQ10's form only (1.8 % of product carried tokens) (`use-cases.md` §6, §7).

**Q1. CQ registry as data** (all CQs; tier 0; about a day). Each CQ stored with its type, stratum, metapath(s) on the schema, answer shape and token ceiling; scripts run the forward check (every node and edge kind serves some CQ) and the backward check (every CQ has a path).
- Theory: CQ-driven ontology design, stratified questions, the pruning rule and completeness check [Gru][Noy][Keet]; heterogeneous-network schema and metapaths [Shi]; violations counted per constraint [Hogan §7].
- Replaces: v1's schema grown lane by lane and scored on one question family. Rejected: designing from what parsers can extract (v1); PathSim similarity (no CQ asks for similar peers) [PathSim].
- Effect: no recall change by itself; a justified kind list. Measured on v1: no path for CQ1, CQ2, CQ6, CQ10, CQ14, partial for CQ4, CQ9 (`lane-modelling.md`). The method cannot rank two valid designs; agent tokens must [Gru].
- Tuning test: remove each prune candidate (same_capability, migration_follows, mocks, registers_screen and navigates, contains and defines as traversal edges, pairwise co_changed) and re-score tuning T1 plus the 20 tuning typed questions at equal answer size. A kind stays only if recall falls beyond the paired 95 % interval.

## 2. The model

**M1. Code structure layer** (CQ3, CQ7, CQ8, CQ15; tier 0; extractor work, days). Nodes: runtime, slice, file, symbol (function, method, class, component, module constant or variable, exported object member), test, fixture, route (identity: runtime + method + path template), table, column, setting, migration, outbox kind, storage key, message literal, screen, scheduler job. Edges: contains (kept as an attribute and a path tree, not a traversal edge), defines, imports, calls, references, references_literal, reads/writes table and column, reads_setting, migrates, enqueues, handles, reads_key, writes_key, test_calls, test_requests, uses_fixture. Each answer is a card plus exact spans (`path:line`), because CQ3 bodies must still be read.
- Theory: CQ-derived schema [Gru]; the kinds v1 lacks are named by CQ3/CQ8/CQ13 (`use-cases.md` R4); spans as the returned unit because maps that return code let agents skip reads (`../widen/lane-agents.md`, M).
- Replaces: v1's 25 kinds with no node for 11.2 % of held-out reference definitions (8.0 % variables and members), no reads_column, literals only partly. Rejected: code property graph layers (CFG, PDG) — no CQ needs them, no measured agent benefit [CPG]; statement-level nodes — no granularity ablation exists (`lane-construction.md`).
- Effect: closes the 11.2 % definition gap; literal edges turn CQ8's cross-client greps into one lookup.
- Tuning test: (a) share of tuning T1 reference definitions with a node (target from 88.8 % to over 97 %); (b) on the recorded usage searches, if under a third target a literal, drop references_literal (`use-cases.md` R4).

**M2. Contract layer** (CQ13, CQ8; tiers 1 and 2 of K4 at tier 0, tier 3 trial). Nodes: schema (response or request model), schema field, client type, client field read. Edges: route returns_schema, has_field, client_call resolves_to route, client type aligned_to schema, read resolves_to field, drift (declared on one side only).
- Theory: interface-description-based cross-language linking; framework export is exact by construction [FastAPI].
- Replaces: v1's experimental name-keyed field reads (1,183, only 12.6 % with a single candidate).
- Rejected: name matching (v1); Joern or a full CPG as main store (no agent evidence, JDK 21) [CPG].
- Effect, and test: see K4.

**M3. Meaning layer, deterministic** (CQ2, CQ4, CQ9, CQ12, CQ14; tier 0; about a week). Nodes: document, section (heading path, line span, content hash), item (any registered ID pattern: finding, ruling, phase, limitation, card), rule (an invariant or open defect: text span, hash), decision (date, status). Edges: defines (section to item), cites (section to code span, with the span's hash at citing time and a status), constrains (rule to symbol, table, setting, route, outbox kind, with a **role**: guard, client half, condition input, example, violation), justified_by (rule to item, PR or commit), covers (phase to item), supersedes (decision to decision), anchored_at (item to span). Ambiguity and absence are **statuses** (exact, resolved, ambiguous(k), unresolved, not_in_repo), never k edges of weight 1/k.
- Theory: PROV-O qualified relations [PROV]; Wikidata statements with references and ranks, refuted claims kept with a deprecated rank [Wikidata]; ADR numbering, superseded never edited [ADR]; entity linking with a NIL outcome and context-based doc-to-code linking (96 % precision and recall on four Java systems, abstract only, W) [DR12]; a rule with role-carrying anchors is n-ary, so it is a node, not an edge [Nary].
- Replaces: v1's titled invariant nodes with 38 constrains edges at 1/k, citations with no hash, no item, phase or decision node. Rejected: model-extracted claims as graph edges (graphify style; 0 to 12 % id retention on re-extraction, `../widen/architecture.md` L2b); RDF or OWL stack (no reasoning need; one publisher) [Hogan §3].
- Effect: the largest candidate saving: CQ2 + CQ4 are 17 % of product and 22 % of program carried tokens, and the 13 main product sessions spent 55 % of carried lookup tokens before the first edit, re-reading plan sections, design notes and defect IDs (`use-cases.md` §3.2).
- Tuning test: (i) anchor precision with a Wilson interval on 73 to 385 labels per anchor type; (ii) replay of the phase-start reads in recorded sessions: if the sections the session later cited or acted on are more than half of what it read, the layer is a convenience, not a lever, and drops below the ranker in the build order.

**M4. Conclusion ledger** (CQ1; tier 0 for the store, model content is the owner's knowledge-store design). Nodes: claim (a deterministic query and its answer where possible, else prose), evidence, source (session, model, prompt hash). Edges: rests_on (claim to typed premise), supports, refutes, supersedes, about. Premise classes: graph-query result (hash and negative-dependency patterns), text span (path, range, hash, symbol), absence search (scope, result hash), document section (hash, anchor). A claim with its premise set is n-ary, so it is a node [Nary].
- Theory: justifications with in-lists and out-lists [deKleer]; verifying traces and relaxed correctness for non-deterministic tasks [BSaC]; lineage and why-provenance [Green]; cite-and-verify memory (vendor, W) [Copilot].
- Replaces: nothing (v1 stores no conclusion). Rejected: model-judged freshness (self-correction without external feedback is unreliable [Huang]); free reuse of model summaries (22.22 % vs 26.26 % baseline, SWE Context Bench, M).
- Effect: no stale conclusion served; savings bounded by reuse rate, untested; nearby evidence is flat to negative [ETH] (VibeMemBench 11 of 12 pairings no better than memory off, `lane-time-incremental.md`).
- Tuning test: see T4.

**M5. Change set as a hyperedge** (CQ6, CQ10; tier 0; about an hour plus history extraction). Node changeset (sha, date, message, PR, size, sweep flag); edge touches (to file and definition, with role and hunk spans). Co-change is a
**derived** weighted projection, not a stored pairwise fact.
- Theory: hypergraph random walk, clique weight w(e)/|e| [Zhou06]; transactions and rules over entity sets [ROSE]; star-to-clique loses information [Fatemi20].
- Replaces: 1,896 pairwise co_changed rows with no commit node or message; 49 % of them rest only on commits of 10+ files. Rejected: TARMAQ multi-antecedent rules (history too short); ROSE's 30-entity cap as a noise rule (it was a CVS branch-merge filter, verify-a).
- Effect: answers the "and why" of CQ6 and CQ10 through message and PR; no ranking gain expected (verify-a).
- Tuning test: see R2 (the weighting) and the CQ10 check that every touched file resolves to its message and PR.

**M6. Identity over time** (precondition for M3, M4, T1-T6; tier 0; days). Separate entity key, occurrence and lineage. Keys: route = runtime + method + path template; table.column; setting, outbox kind and literal values; commit sha with patch-id across rebases; (document family, item ID); section = heading path + content hash, never a line number; rule = an ID written into the source (owner decision) or a minted ID with an alias table; definition = minted opaque ID with an alias table of qualified names in SCIP descriptor form [SCIP]. Lineage edges renamed_from, moved_from, split_from, merged_into, candidate_of from a ladder: git rename detection, exact qualified name, name and signature in another file, body similarity, else created or deleted. An uncertain match marks dependents suspect.
- Theory: persistent identifiers [Hogan §3.2]; origin analysis and method-history tools [HF]; entity resolution with NIL; PROV specializationOf [PROV].
- Replaces: v1's ids with line numbers or ordinals (580 of 5,464), `--no-renames` history. Measured: a quarter of section ids and half of URL-site ids gone within three weeks; 13 section and 11 invariant ids silently re-pointed over 110 transitions; 736 of 2,179 vanished ids are line-number moves (`lane-modelling.md`, `lane-storage.md`). Rejected: PyRef (F1 0.64 independent, summaries only); Kythe or SCIP identity (path- and version-bound) [SCIP].
- Effect: none on one-snapshot retrieval; it is what lets a stored conclusion or citation survive an unrelated commit.
- Tuning test: replay the 191 snapshots, treating each snapshot's anchors as pseudo-claims; count at the frozen commit anchors resolved by id string, natural key, ladder, and **wrong entity**. Mis-binding must be 0; skip the body step if it rescues under 1 % of anchors beyond the name key; sweep its threshold from 0.70 to 0.80 (HistoryFinder uses 0.70 and 0.75 [HF]; its Java accuracy is self-evaluated, verify-a). Cut condition for stable ids: they must cut spurious invalidations by about a third.

**M7. Evidence and confidence** (all; tier 0; small). Each fact carries method class, evidence span and hash, resolution status, calibrated probability of correctness per method class, and a separate strength (support, call count) for ranking.
- Theory: extractor scores are not on one scale; calibrate per method on a labelled sample [KV]; references vs ranks [Wikidata]; sample sizes and clustered sampling [Gao19].
- Replaces: v1's one confidence field mixing 1, 0.9, 0.95, 1/k and support ratios, used as relevance. Rejected: Platt scaling (needs far more labels; use bins with Wilson intervals); provenance-semiring machinery (no CQ needs it).
- Effect: hygiene only; no ranking gain expected (parser kinds are already near 1.0, verify-a).
- Tuning test: reliability table per method class; seeded errors must show on the quality card (K6).

## 3. Construction

**K1. Framework export for routes, schemas, tables, injection** (M1, M2; tier 0; a day). Import the app with stub settings in the project's own image, write `app.openapi()`, walk `app.routes` (handler, file, line, dependencies, response model), read SQLAlchemy metadata. Keep v1's AST edges as a cross-check.
- Theory: runtime reflection is exact where static inference is the documented hard case [FastAPI].
- Replaces: AST detection in `py_extract.py` (registers_route, returns_model, maps_table, depends_injects). Rejected: static REST-spec inference (best F1 0.79 in one comparison, snippet, W).
- Effect: exact routes (v1: 85 route nodes) and schemas; adds dependency trees and required flags.
- Tuning test: diff against v1 on every tuning commit; each difference is read by hand. Pin the FastAPI version: the backend allows `>=0.115,<1.0` and APIRoute internals are being refactored (verify-a); prefer the public `openapi()`.

**K2. Type-aware name resolution, kept** (M1; tier 0). TypeScript: the compiler's own symbol resolution (measured: 764 repo call edges with and without library types; 7 of 1,789 web call sites recoverable by name). Python: scope, import and receiver binding (residue 290 of 4,268 candidate sites, 6.8 %). Trial: resolve the residue with mypy's resolved trees (mypy is already a dev dependency; `dmypy inspect --show definition` is experimental) and bind
`onX={handler}` callbacks one hop (about 41 edges). Name matching is already absent from calls (0 of 4,886).
- Theory: type-aware resolution [Jarvis][DyPy]. Rejected: Jelly (no React, JSX or React Native evaluated, verify-a) [Jelly]; CodeQL (licence excludes private repos) [CodeQL]; Kythe, Glean (built for monorepo scale).
- Tuning test: hand-label 60 residue sites; keep mypy only if it resolves at least half correctly with no wrong edge.

**K3. Extraction audit before more extraction** (all code edges; tier 1). Score v1's calls, imports, defines and test edges against an independent resolver and against a dynamic call record from the Python test run (`sys.monitoring`, built into Python 3.12, tier 0 [sysmon]).
- Theory: dynamic edges and independent tools as ground truth [DyPy][Jelly]. Weakened (verify-a): dynamic test edges as an *edge source* is a trial that must beat file-level static edges, because class-level static test selection was unsafe in only 0.2 % of revisions vs dynamic selection [Leg16], and v1 already has 441 test-to-route records.
- Test: if v1 recall on dynamic in-repo edges is 95 % or more, stop extraction work.
- Install: scip-python 0.6.8 (npm, MIT, 20.3 MB unpacked, offline with `--environment` JSON) or Pyright (MIT, size not checked); scip-typescript 0.6.2 (npm, Apache-2.0, needs Node >= 22.23.4, bundles TypeScript 6 while the app pins 5.3, so some disagreement is compiler version); coverage.py optional (not a backend dependency). Offline in a Linux container after one fetch.

**K4. Field-level contract edges in three tiers** (M2; tiers 1-2 now, tier 3 trial). (1) backend fields from the OpenAPI export; (2) mobile reads resolved by the TypeScript checker to client interface properties, each interface aligned to a schema once; (3) web reads by a small intra-procedural def-use pass from an API call already linked to its route, candidates restricted to that route's schema (the web app is untyped JavaScript: 120 files, 0 TypeScript). Unresolvable reads are marked unresolved.
- Theory: checker-resolved property access; def-use only narrowly supported (ARISE, abstract, one backbone, W) [ARISE]. Effect: from 12.6 % single-candidate reads upward; lower bound today 194 exact mobile reads.
- Tuning test: tuning commits whose diff adds, removes or renames a schema field; truth = client files changed in the same PR. Compare v1 name-keyed, co-change only, and the tiers at equal answer size; **cut any tier that does not beat co-change only**. Build tier 3 last.

**K5. Document extractor** (M3; tier 0). Headings, registered ID patterns, citation spans with hashes, invariant anchors with roles hand-assigned once for the 20 invariants, contextual entity linking for code terms with statuses. Index untracked program documents only if the owner rules them in (section 11).
- Theory: [DR12]; entity linking with NIL; a stale-reference check finds a small real share (1.27 % of 18,048 references stale; 24 % false positives in a 50-sample) [CtxRot].
- Replaces: name dictionary with six hand-made tie-break rules and 1/k fan-out (122 of 1,195 sites fan out).
- Tuning test: precision on 73 to 385 labels per link type (v1's 20 to 30 give about plus or minus 10 to 20 points).

**K6. Quality card per build** (all; tier 0; small). Sampled precision with interval per heuristic edge kind, completeness against independent sources (K1 export, K3 dynamic edges, share of document terms that resolve), counted constraint violations, extractor version, tokens per answer, and kinds with no CQ. Theory: [Hogan §7][Gao19]. Test: seed known errors (delete an edge, rename a route); the card must flag each.

## 4. Derived facts, time and invalidation

**T1. Snapshots as a memo table, history as validity sets** (tier 0). A snapshot is a pure function of (commit, extractor version), so it is a rebuildable cache entry. History is stored once per fact as validity (first commit, last commit) on stable keys; "holds at commit K" is an ancestry test over the commit graph, not a linear interval. Working-tree overlay (trial): re-extract changed files and hide their units, re-run cross-file joins.
- Theory: DBSP streams of snapshots and differences [DBSP]; versions from a partial order [McSherry]; tool version as part of the key [BSaC]; ownership units per file and stacked databases [Glean].
- Replaces: one full snapshot per commit (1,737,146 edge records over 190 snapshots vs 24,579 validity records, 71x). Rejected: bitemporal or interval stores, Graphiti's linear time (does not fit a branching history).
- Test: overlay graph must equal a full rebuild of the edited tree on random edits at tuning commits.

**T2. Dependency recording, extended** (tier 0). Every deterministic answer records its premises at query-result granularity, including negative dependencies ("nothing else writes table X" depends on the in-edge set of that kind). All CQ programs read through one API (lint-enforced). Exhaustive single-fact mutation test at one tuning snapshot: remove every node and edge, add sampled plausible edges per kind, check each of the 250 questions.
- Theory: verifying traces and early cutoff [BSaC]; the negative pattern is the phantom problem and predicate locks [Eswaran], irrelevant-update detection [Blakeley], why-not provenance, Skyframe's directory nodes.
- Replaces: K0's recorder validated only by what real history exercised (87.6 % served, 0 stale; file level 6.5 % stale).
- Test: stale must be 0; any nonzero is a recorder bug. Trial T3 below must keep 0 stale.

**T3. Kind-level relevance filter** (trial, tier 0). Per CQ program, the kinds it reads; an update adding or removing no fact of those kinds cannot change the answer [Blakeley]. Indicative selectivity 21 % (calls) to 88 % (constrains) of steps. Cut if not faster than fact-level validation (0.31 ms per snapshot) or any stale answer appears.

**T4. Ledger revalidation** (M4; tier 0). On each commit, find conclusions whose premises intersect the diff; re-run deterministic premises; statuses VALID, VALID-BY-CUTOFF, SUSPECT, UNVERIFIABLE; prose is never compared, only premise results (verify-b's wording). The trigger is an external diff, never a model's self-check [Huang].
- Test: (i) the 250 K0 questions as stand-in conclusions over tuning steps: 0 stale; (ii) about 50 findings from existing transcripts labelled "still true at C+k": a trigger is cut if it misses a non-trivial share of false findings or flags nearly everything.

**T5. Citation resolution as a fact** (CQ14; tier 0). Each cites edge carries "resolves at this commit" and "hash unchanged since citing"; pushed as a warning at edit time. Test: every flip after a rename or removal is detected with no false negative against full re-resolution.

**T6. Since-view** (CQ10, resume; tier 0). Diff of the agent's last-seen snapshot and the current one, cut to the 2-hop neighbourhood of its anchors (hubs not expanded), plus its conclusions whose premises changed. Measured: about 1 % of edges change per commit; near a file the 1-hop digest is empty 70.5 % of the time after about 2 commits; 2-hop median 27 edges after about 8 commits, 151 after about 31. Test: must be smaller than the scripted
`git diff --stat` for the same neighbourhood and find the next changed files more often than recency alone.

## 5. Ranking (for "what else is involved", CQ6, CQ8, CQ10)

**R1. Two-stage ranker** (tier 0; days). Pool: code files within 2 typed hops on the file-collapsed graph plus all co-change neighbours (ceiling 71.3 % of truth pairs, mean 46 candidates). Score: Arm F = RRF (k = 60) of the PPR rank (restart 0.15) and the co-change rank; Arm L = ridge logistic regression on at most 8 features, refit before each scored commit on earlier commits only, kept for calibrated probabilities (S1).
- Theory: path-sum link prediction [LNK][SEAL]; local indices and their ties [ZLZ]; memorisation baselines (co-change is an EdgeBank) [EdgeBank][Gast]; binary path features with a logistic model [SFE]; rank fusion [RRF].
- Replaces: v1's hand-weighted fusions, degree-normalised spreading, hub cuts (which only removed recall) and the 60-configuration one-factor sweep.
- Rejected: GNNs, KG embeddings, LambdaMART (section 9); PathSim; Louvain prior.
- Effect, measured on tuning (rolling origin, late 50 commits, verify-b reproduced): P@10 random-in-pool 0.118, PPR 0.204, co-change 0.199, RRF 0.233; RRF minus PPR +0.030 [+0.015, +0.044] for k 10 to 120; 25 features minus 2 features +0.001 [-0.007, +0.009]. Small and coverage-limited: only seeds with co-change history gain.
- Test: arms declared in advance — plain co-change list (ROSE confidence), v1 final config and v1 rule pick, PPR alone, directory and file proximity (best on 6 of 10 systems in [HistoRank]), Arm F, Arm L. Keep F only if its paired interval over the best simpler arm is above zero **and** the gain is at least 0.02 P@10 (the resolution); keep L only if the packer needs probabilities and L does not lose to F. Sweep restart {0.1, 0.15, 0.3, 0.5} on an inner split.

**R2. Co-change rebuilt as a weighted projection** (M5; tier 0; hours). Each commit spreads one unit over its file pairs (1/(files-1), resource allocation), Laplace-smoothed confidence, size cap and recency half-life swept.
- Theory: bipartite projection [NBI]; hypergraph weights [Zhou06]; smoothing pc about 5 [AnyBURL]; recency beats confidence ranking [HistoRank]. The 8-file cap and 25,000-commit figure (Moonen et al.) are unverified (blocked PDFs, verify-b) and are not used as rationale.
- Test: 12 variants of co-change alone (confidence; smoothing 0/2/5/10; size-weighted; cap 8/15/30; half-life 14/30/60/120/none) chosen on an inner rolling split; cut if none beats v1's confidence by a paired interval above 0.

**R3. Depth-3 tier on request** (tier 0). Raises the pool ceiling to 92.3 % at about 75 more candidates. Cut if R@20 does not rise by at least 0.05.

**R4. Lexical entry and feature** (tier 0). BM25 over names, signatures, paths and section text (SQLite FTS5). Theory: in LocAgent's ablation the search entry point was worth 19 points of file accuracy and traversal about 2 (fine-tuned 7B, unnamed dataset: direction only, verify-b) [LocAgent]. Test: paired contrast with and without, late 50 commits.

**R5. A separate "what breaks" ranker** (CQ8, CQ6; tier 0 code, ground truth needs test runs). Directed dependents only (reverse imports, calls, client-to-route, table readers, setting readers), depth 2, edge-kind priors from the share of edges that carried a failing test, Laplace-smoothed. Truth: apply each commit's production diff to its parent and run the parent's tests (89 of 141 usable commits runnable). Theory: [Leg16] (Java; numbers are revisions with any violation, verify-a); never scored against co-change truth. Test: recall of failing tests at equal answer size vs the undirected 2-hop list; cut if not higher.

## 6. Selection: the smallest sufficient answer

**S1. Calibration** (tier 0). Isotonic regression (pool-adjacent-violators, written by hand) mapping ranker scores to probability of relevance, fitted on tuning folds. Test: reliability curve and Brier score on inner folds.

**S2. Value-density selection with a stop** (trial, tier 0). Order items by probability per rendered token; stop when it falls below 1/F, where F is the tokens a scripted search spends to find one omitted item (about 695 in the first test, to be re-measured on tuning); hard cap B. Exact knapsack DP is trivial at this size.
- Theory: knapsack and budgeted coverage (ratio greedy plus best singleton, 0.405) [BMC]; the stop rule is the selection lane's own derivation; the published gap-based stop scored 73.33 vs 76.33 to 78.00 for fixed budgets [AdaK] (verify-b), so this is a trial.
- Replaces: v1's rank-prefix fill to the budget with a padding tail (Aider's rule). Effect: shorter answers at file-signature and snippet granularity (cost spread 1.8 to 5.4); none at symbol-signature (spread 0.4).
- Test: recall-vs-tokens curves at 1k/2k/4k/8k and tokens to 80 % recall, paired by commit, padding tail removed; cut if the curve does not move at any granularity.

**S3. Level of detail per node** (trial). Choose path, signature line, file outline or snippet per item by multiple-choice knapsack, with the rule that a symbol line is not shown when its file outline is (tree knapsack) [TKP]. The mapping to code is an inference. Test: recall per token vs the best single fixed form at each budget.

**S4. `connect` for 2 to 8 named entities** (trial; explanation questions only). Exact minimum Steiner tree by Dreyfus-Wagner [DW] with edge cost -log(reliability). Evidence is thin: G-Retriever never ablated its PCST step [GR]; plain top-k triple scoring reached Hit 89.80 [SGR]; a bare tree can lose the answer [AGRAG]. Test: evidence recall per token vs PPR top-k at equal size on connection questions only; cut if not better.

**S5. Redundancy** (audit first). Measure the share of shown items sharing a file or slice; add an MMR term [MMR] only if over a quarter. The best submodular packer won 1 of 14 contrasts [Pack].

## 7. The agent tool

**A1. One command-line program called through Bash** (tier 0; days). Operations:
`find <words>` (exact name then BM25; at most 8 lines); `around <entity> --intent uses|impact|contract|tests|rules|history` (default 1,000 tokens, hard 2,000); `rules <path|symbol|diff>` (constraining rules with role, source line, status);
`brief <phase|slice>` (the phase's sections, its items with defining blocks, the rules on its area, the slice card, under a budget); `connect <a> <b> ...` (S4, at most 12 lines); `since <commit> [anchors]` (T6);
`notes <entity>` and `record ...` (M4, only with the ledger). No query-language tool; no next-page command.
- Theory: few fixed tools plus an exact-name and lexical entry point [LocAgent]; summarised search beat paging, 18.0 % vs 12.0 % resolved, and a 100-line window beat 30 lines and whole files [SWEA]; caps of about 4,000 characters per output [SmallAg]; consolidate operations used together [AnthWrite]. `brief` follows from the measured session start (55 % of carried lookup tokens before the first edit) and from budgeted selection.
- Rejected: model-written Cypher or SQL (best 61.58 % execution accuracy, under 20 % below 10B parameters [Cypher]; CodexGraph +35 % tokens [CodexGraph]); LLM-driven step-by-step traversal (ToG; cost comparison is uncontrolled, verify-b) [ToG][GCR]; community summaries [GraphRAG][RvG]; round 2's eight tools (more definitions, `explain` and `neighbors` merged into `around`).
- Test, zero model: answer tokens, recall per token, p50/p90 output size per operation on tuning seeds; for `brief`, on recorded phase starts, the card must contain the files and sections the session went on to edit or cite in at least 70 % of sessions (threshold fixed before the run) at no more than a quarter of the tokens read before the first edit; cut otherwise. The decisive test is the agent pilot (section 10).

**A2. Output format** (tier 0). File-grouped tree in rank order: each file once, definitions under it, relation tags (`calls`, `<-called_by`, `writes_table`) with the evidence `path:line`, ids the model can paste back, a footer naming what was omitted by kind and slice and which argument would include it, and `unknown` or `unanchored` where the store cannot answer. Measured on v1 (regex tokenizer): tree 0.43x and adjacency 0.61x the tokens of triples; JSON 1.07x. Accuracy evidence is weak (tree vs JSON is about one sample of 37 [LocAgent]) [TLG]. Test: tokens per fact with the measured 2.42 characters per token; reading test only with owner approval.

**A3. Description budget** (tier 0). A pushed pointer of at most 500 tokens, stable across commits (a changing prefix breaks the prompt cache); each operation's help at most 80 tokens. Arithmetic: each 1,000 tokens in every window is about 0.7 % of tokens; three definitions of about 120 tokens break even at about 1.1 avoided searches per 40-call task. Richer descriptions raised success 5.85 points but steps 67 % [Desc]; tool search pays only above about 10 tools [AnthTools]. Test: in the pilot, total tokens with and without the pointer loaded, and per-run call logs (adoption must be measured: 58 % of trials made no graph call in CodeCompass).

## 8. Storage

**ST1. Deliberate choice** (tier 0). Facts as JSON lines per (commit, extractor version); SQLite as system of record with covering indexes (kind, src, dst) and (kind, dst, src), FTS5 for R4, a validity table for T1, the ledger as an append-only table; PPR and pools over in-process arrays loaded from the fact table (about 0.15 MB, 4 ms to build).
- Theory and measurement: arrays are 28 to 148x faster than a recursive SQL query, but the worst case is 17 ms, 0.26 % of one model step; three engines gave identical answers on 770 of 770 held-out tasks; the engine figures of 0.3 to 270 ms were per-call overhead (about 270 statements per ranking), not storage [Hohenstein][GRAIL] (`lane-storage.md`).
- Replaces: the three-engine comparison as a research axis. Rejected: a graph database, for answers or for speed (section 9). Test: identical ranked answers on all 200 tuning seeds; arrays optional unless per-call latency shows.
- Spatial topology, made concrete: the path tree (646 vertices, depth 6) gives containment from the id itself; the (runtime, slice) quotient (58 super-nodes, 172 dependency links, about 800 to 1,100 tokens as text) is a view for `brief` and a ranker feature (same slice, same runtime). Interval labels add nothing here.

## 9. Not worth it at this size (reason; scale at which to revisit)

- Graph database for speed: answers identical, worst query milliseconds; revisit at about 10^5 nodes with large frontiers.
- Reachability or distance indexes (closure, GRAIL, pruned landmarks): questions are single-source; GRAIL's own small sets (3.6k to 39k nodes) favour plain search [GRAIL]; revisit at 10^5 to 10^6 nodes with thousands of point queries.
- Vertex reordering and compression: whole adjacency is 65 KB [Faldu][WebGraph]; revisit past about 10^7 nodes.
- Incremental Datalog or view-maintenance engine (Feldera, Souffle; DDlog archived): recompute is microseconds to milliseconds; maintenance can lose to rematerialisation [Motik]; revisit when a view takes over 1 s or 100x size.
- Traversal cache: full index rebuild 25 ms vs 5.3 s extraction; cache conclusions instead (M4).
- KG embeddings (RotatE, ComplEx-N3) and GNNs (SEAL, HGT): 6.9 triples per entity vs about 37 in FB15k-237; translational models fell below baselines on sparse graphs [Pujara]; tuned simple baselines match published models [Akrami][Sun20][Dacrema]; heterogeneous GNNs matched by plain GCN [HGB]; linear latent proxy +0.001 here; revisit at about 300 usable commits and 10x edges, tuned and multi-seed only (tier 1: PyKEEN 1.11.1, MIT, plus PyTorch CPU).
- Temporal rule mining (TLogic) and learned many-feature rankers: about 230 commits; 25 features tie 2; revisit at thousands of commits.
- Rule mining arm (AnyBURL, BSD-3, needs a Java runtime, size unstated): trial only after R1, tier 1.
- Community summaries (GraphRAG): built for whole-corpus sensemaking; plain retrieval beat them on detail questions [RvG]; slices already group the code.
- Leiden communities (igraph + leidenalg, tier 1): slices exist; low priority.
- PCST approximations (pcst_fast): exact Steiner is feasible below about 10 to 12 terminals.
- Model-written query languages and LLM-driven traversal: accuracy and cost (section 7) at any size.
- Bitemporal or temporal graph stores: validity sets on stable keys suffice; revisit at about 100x history.

## 10. Validation plan

1. **Data.** Tuning only: 65 tuning commits (388 T1 seeds, leak-free parent builds), the 191 cached snapshots, the tuning typed questions extended to 40 to 60 hand-verified questions whose truth is read from code, not from the extractor (round 1 critic), and recorded transcripts for the `brief` and ledger replays (13 product sessions, one day, one plan: descriptive weight only).
2. **Splits.** Rolling origin (train on at least 15 earlier commits, score the late 50); inner rolling split for any parameter; no random splits (they leak the future [Ji]).
3. **Statistics.** Paired bootstrap clustered by commit; arm list declared before running; random tie-breaking with the tie share reported (ties inflated published results [Sun20]); a placebo feature; a learning curve; prefer the simpler form within one standard error. Resolution is about 0.02 P@10 and about 0.065 recall (paired SD 0.263), so any component whose gain is under that is cut for the simpler form [Cawley].
4. **Zero-model tests first:** Q1 checks, M6 identity replay, T2 mutation test, T4 replay, K1 diff, K4 field test, R1 to R5, S1 to S5, A1 and A2 size tests.
5. **Held-out.** The 75 held-out commits are spent. One run of the final configuration, declared in advance, reported as descriptive only, never used to choose. Commits after the frozen commit are few: descriptive only.
6. **Agent pilot (decisive, owner decision).** Same tasks, arms: no tool; v2 tool; a non-graph index (BM25 only); a placebo tool; graphify as shipped (round 2). Outcome: total tokens for the same correct work, with adoption, steps and stale serves logged. Every graph arm must beat the plain-search arm on tokens, not only on recall.

## 11. Build order

1. Q1 registry, K6 quality card, the evaluation harness of section 10 (measure first).
2. M6 identity and T1 validity sets (precondition for anything stored).
3. M3 + K5 meaning layer, A1 `brief` and `rules`, T5 citations (largest measured cost, CQ2 and CQ4).
4. K1 framework export, M2 and K4 tiers 1-2, M1 additions (literals, members, reads_column).
5. M5 + R2 co-change, R1 ranker, R4 lexical; R3 tier; then R5 once its test-run truth exists.
6. S1 calibration, A2 format, S2 trial; S3, S4, S5 as trials.
7. M4 ledger with T2 and T4; T6 since-view; T3 and the overlay as trials.
8. K3 audit when the owner approves the installs; then the agent pilot.

## 12. Owner decisions

| Decision | Options | Cost | Recommendation |
|---|---|---|---|
| Install indexers for the K3 audit | scip-python 0.6.8 (npm, MIT, 20.3 MB unpacked), scip-typescript 0.6.2 (npm, Apache-2.0, Node >= 22.23.4), or Pyright (MIT); coverage.py optional | Offline in a container after one fetch | Approve one Python and one TS indexer; skip coverage.py (sys.monitoring is built in) |
| Agent pilot | Run or not; arms of section 10 | Model tokens, likely hundreds of thousands to a few million per arm (unverified) | Run after steps 1-6 |
| Content sent to a model | Model-read rationale from prose; labelling transcript findings; a reading test of formats (about 0.3 to 0.6M tokens) | Repository content leaves the machine | Not needed for tier 0; decide per step |
| Scope of program documents | Index untracked `docs/program` files or not | Commit-keyed validity impossible for untracked files | Index them by content hash, separately flagged |
| Rule IDs in CLAUDE.md | Write stable IDs into the source, or mint IDs with an alias table | A repo change | Minted IDs first; source IDs if aliasing breaks |
| Tool form | CLI through Bash vs a tool server with schemas | Schema tokens every call | CLI |
| Pin FastAPI in the image | Pin exact version | Small | Yes |
| Tier 1 trials later | AnyBURL (Java), PyKEEN + PyTorch, igraph + leidenalg | Container size | Defer |
| Order vs other work | This track vs ship-plan phases | Session time | Owner's call; this design touches no product code |

## 12a. The owner's words, and what answers each

| Owner's words | Answer in v2 |
|---|---|
| "graph database and spatial and temporal topology" | Property graph as a knowledge graph (sections 0, 2); spatial = path tree and slice quotient (ST1); temporal = validity sets over the commit graph (T1) |
| "caching concepts and invalidation ... intensely documented" | Build-system traces, early cutoff, predicate locks, truth maintenance, provenance (T2, T4) |
| "not fetch unnecessary context ... small small time very fast" | Selection with a stop (S2), level of detail (S3), caps (A1); speed is already milliseconds and is not the cost (ST1) |
| "wouldnt cache databases help" | Caching conclusions with premises (M4, T4); caching traversals has nothing to save (section 9) |
| "semantic relations and actual connections that will or wont break" | Contract layer (M2), rules with roles (M3), break ranker on failing tests (R5) |
| "a lot of info in small size compared to relational" | Size comes from the answer, not the engine (A2, S2); engines gave identical answers (ST1) |
| "caching on top so we dont traverse unnecessary nodes" | Pool then rank (R1); hub handling by restart, not cuts |
| "the type of graph we make makes a huge difference" | CQ-derived schema with ablation per kind (Q1) |
| "including the algorithms we use on it" | Link-prediction theory with declared arms (R1, R2) |
| "optimizations catered to this repo" | Framework export (K1), field contracts (K4), slices as structure (ST1) |
| "research ... then start testing" | Validation plan (section 10) |
| "strictly graphs or knowledge graphs or TKGs" | Section 0 |
| "flaws in your reasoning and assumptions" | Section 12b |
| **Gap named:** model-read meaning (rationale extracted from prose) | Not in tier 0; needs an owner decision to send content to a model, and enters only as M4 claims with premises |
| **Gap named:** whether any of this lowers tokens | Not shown by any zero-model test; only the agent pilot |

## 12b. What earlier rounds got wrong in this lane's area

- Round 1 critic framed the test as {facts} x {algorithm} x {format} x {engine}; the engine axis cost a full round and changed no answer. Its schema was extractor-led, not question-led, and it tuned weights on held-out commits.
- Round 2 (`architecture.md`) took "connection questions are about 7 % of searches" from another codebase; here relational forms are 20 % of product carried tokens, documents 18 %, and the session start 55 %. It proposed eight tools with no CQ costs, no `brief`, and model-extracted claims as a layer of the graph; v2 keeps model content in the ledger only.
- Neither round treated ranking as link prediction, selection as a knapsack, identity over time, or n-ary modelling; v1 compared rankings only where the whole reach fit the budget, so ordering was invisible (`v1-audit.md`).

## 13. References

- Questions and modelling: [Gru] Uschold, Gruninger, "Ontologies: principles, methods and applications", AIAI-TR-191, 1996. [Noy] Noy, McGuinness, "Ontology Development 101", Stanford KSL-01-05, 2001. [Keet] Keet, Khan, arXiv 2412.13688. [Shi] Shi et al., TKDE 2017, arXiv 1511.04854. [PathSim] Sun et al., PVLDB 4(11) 2011. [Hogan] Hogan et al., "Knowledge Graphs", ACM CSUR 2021, arXiv 2003.02320. [Nary] W3C, https://www.w3.org/TR/swbp-n-aryRelations/ . [PROV] W3C, https://www.w3.org/TR/prov-o/ . [Wikidata] https://www.wikidata.org/wiki/Help:Ranking . [ADR] Nygard, https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions . [Zhou06] Zhou, Huang, Scholkopf, "Learning with hypergraphs", NIPS 2006. [ROSE] Zimmermann et al., ICSE 2004. [Fatemi20] arXiv 1906.00137. [HF] arXiv 2507.14716. [KV] Dong et al., "Knowledge Vault", KDD 2014. [Gao19] arXiv 1907.09657. [DR12] Dagenais, Robillard, ICSE 2012. [SCIP] https://github.com/sourcegraph/scip . [CPG] https://cpg.joern.io ; Yamaguchi et al., IEEE S&P 2014.
- Construction: [FastAPI] https://fastapi.tiangolo.com/how-to/extending-openapi/ . [DyPy] arXiv 2403.00539. [Jarvis] arXiv 2305.05949. [Jelly] Laursen, Xu, Moller, PLDI 2024. [Leg16] Legunsen et al., FSE 2016. [ARISE] arXiv 2605.03117. [sysmon] https://docs.python.org/3/library/sys.monitoring.html . [CodeQL] https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md . [CtxRot] arXiv 2606.09090.
- Time and invalidation: [BSaC] Mokhov, Mitchell, Peyton Jones, "Build systems a la carte", ICFP 2018. [deKleer] de Kleer, "An assumption-based TMS", AIJ 28, 1986. [Green] Green, Karvounarakis, Tannen, "Provenance semirings", PODS 2007. [Eswaran] Eswaran et al., CACM 19(11) 1976. [Blakeley] Blakeley, Coburn, Larson, VLDB 1986. [Motik] Motik et al., AIJ 2019. [DBSP] arXiv 2203.16684. [McSherry] McSherry et al., "Differential dataflow", CIDR 2013. [Glean] https://glean.software/docs/implementation/incrementality/ . [Copilot] GitHub blog, "Building an agentic memory system for GitHub Copilot", 9 Jan 2026. [Huang] arXiv 2310.01798. [ETH] arXiv 2602.11988.
- Ranking: [LNK] Liben-Nowell, Kleinberg, JASIST 58(7) 2007. [ZLZ] arXiv 0901.0553. [SEAL] arXiv 1802.09691. [HGB] arXiv 2112.14936. [SFE] Gardner, Mitchell, EMNLP 2015. [AnyBURL] arXiv 2004.04412; Rossi et al. arXiv 2002.00819. [Pujara] Pujara, Augustine, Getoor, EMNLP 2017. [Akrami] arXiv 2003.08001. [Sun20] arXiv 1911.03903. [EdgeBank] arXiv 2207.10128. [Gast] arXiv 2404.16726. [TLogic] arXiv 2112.08025. [RRF] Cormack, Clarke, Buettcher, SIGIR 2009. [HistoRank] Mondal et al., SANER 2020. [NBI] arXiv 0707.0540. [Dacrema] arXiv 1907.06902. [Ji] arXiv 2010.11060. [Cawley] Cawley, Talbot, JMLR 11, 2010.
- Selection and interface: [BMC] arXiv 2008.05391. [AdaK] arXiv 2506.08479. [Pack] arXiv 2607.00725. [MMR] Carbonell, Goldstein, SIGIR 1998. [TKP] Johnson, Niemi, Math. of OR 8(1) 1983. [DW] Dreyfus, Wagner, Networks 1(3) 1971. [GR] arXiv 2402.07630. [SGR] arXiv 2410.20724. [AGRAG] arXiv 2511.05549. [GraphRAG] arXiv 2404.16130. [RvG] arXiv 2502.11371. [TLG] arXiv 2310.04560. [LocAgent] arXiv 2503.09089. [SWEA] arXiv 2405.15793. [SmallAg] arXiv 2610.33958 v2. [Cypher] arXiv 2412.18702. [CodexGraph] arXiv 2408.03910. [ToG] arXiv 2307.07697. [GCR] arXiv 2410.13080. [AnthTools] https://www.anthropic.com/engineering/advanced-tool-use . [AnthWrite] https://www.anthropic.com/engineering/writing-tools-for-agents . [Desc] arXiv 2602.14878.
- Storage: [GRAIL] Yildirim et al., PVLDB 3(1) 2010. [Hohenstein] Hohenstein, Jergler, DATA 2019. [Faldu] arXiv 2001.08448. [WebGraph] Boldi, Vigna, WWW 2004.

Could not verify here: everything rests on the lanes' and verifiers' reading; I opened no paper in this lane. Moonen et al. (history length, 8-file cap) stays unverified (blocked). Model tokenizer counts were not available offline.
