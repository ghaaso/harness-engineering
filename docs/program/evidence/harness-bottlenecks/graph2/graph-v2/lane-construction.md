# Lane: building the graph from code (Python and TypeScript/JavaScript)

Date of the work: 2026-11-13. Written for a reader with no context. Terms are defined at first use.

Short answer first, then the evidence.

## 0. Answer in one page

**Which extraction method gives the most accurate "who uses this" and "what does this reach" for this stack?**
No single published method does. The literature supports a layered answer, and on this repository the measurements say the call-graph layer is not where v1 is weakest.

1. For names, definitions and references (who uses this symbol), the most accurate source is a type-aware compiler front end: the TypeScript checker for TS/JS (v1 already uses it) and a type checker for Python (Pyright, or mypy, which the project already runs in strict mode in CI). A name-matching pass loses precision exactly where method names collide, and a type-aware pass loses recall only where types are unknown (dynamic dispatch, reflection, untyped callbacks).
2. For "what does this reach at run time", the strongest published ground truth is a dynamic call graph recorded while the tests run. Static call graphs for Python are measurably incomplete against it (49 percent of dynamic edges present, independent study, 50 projects). So dynamic edges should be both a measuring stick and a source of edges.
3. For framework facts (routes, dependency injection, response models, tables), the framework can export its own exact description at run time (FastAPI `app.openapi()`, `app.routes`; SQLAlchemy mapper inspection). Reading that is exact by construction. Static inference of the same facts is what the literature shows to be hard.
4. For "what breaks if this changes", the regression-test-selection literature (Ekstazi, STARTS, HyRTS) is the closest theory. Its measured result is that coarse, class/file-level dependencies with run-time (dynamic) data are as good as anything and method-level static call-graph selection is worse (Legunsen et al., FSE 2016: 10.6 percent of revisions unsafe and 55.7 percent imprecise for method-level, against 0.2 percent and 33.0 percent for class-level, both measured against Ekstazi).

**What does v1 lose against compiler-grade extraction?** I measured this on the repository instead of quoting papers. Findings (details in section 3):

- Python calls: of about 4,268 in-repo candidate call sites at the current commit, v1 leaves 290 (6.8 percent) unresolved where the called name matches a repo definition. Most of those are generic names (`get`, `commit`, `scalars`) that are correctly left alone. The genuine misses look like `service.record_punch`, a receiver whose type is declared elsewhere.
- TypeScript/JS direct calls: essentially complete. In the web app, only 7 of 1,789 non-test call sites are unresolved and carry the name of a repo function. Giving the checker the library type declarations (React, React Native) changed the number of resolved repo call edges by zero (764 before and after in the mobile app). My hypothesis that the hermetic export loses edges for lack of `node_modules` is refuted.
- Calls through a parameter or destructured binding look like a big gap (445 mobile, 265 web) but 92 percent (mobile) and 82 percent (web) are React state setters (`setError`, `setBusy`) that have no repo target. The real higher-order gap is roughly 14 plus 22 call sites in mobile and 28 plus 19 in web.
- **Field level is where v1 is weak.** v1's experimental response-field links are name-keyed: only 12.6 percent of the 1,183 read edges have a single candidate field, and 41 percent have six or more. The web app is plain JavaScript (120 files, one file with a type annotation), so there is no type to resolve through. In the mobile app the checker can resolve 194 reads exactly to 58 fields of interfaces named like backend models, but only 21 of 110 backend schema classes have a same-named TypeScript type.

**What would a field-level contract edge across the runtimes take?** Section 6: export the schema from the backend at run time, align it to the client's declared types (exactly where the client is typed, by structure where names differ), and for the untyped web app trace the result of a known API call to the property reads with a small local def-use pass. No new package is required for the first two tiers.

**Which tools run offline in a Linux container?** Section 7 has the table. Short list: scip-typescript, scip-python (Pyright based), the `scip` CLI, Pyright, mypy (already in the project), coverage.py or the standard library `sys.monitoring`, Jelly, Joern (JDK 21). All need one network fetch to install; none needs the network to run (with two caveats noted). CodeQL is excluded by its licence for a private repository.

**Against my own enthusiasm.** Nothing I found shows a better call graph raising an agent's success or lowering its tokens. No study measures SCIP or language-server data inside an agent. The only agent-side numbers for statement-level or data-flow graphs (ARISE) used a 32B open model and one run. At this repository's size the extraction layer is near its ceiling for direct calls; the open measurable gains are field-level links, dynamic (test-derived) edges, and a recall measurement that v1 never had.

## 1. What the earlier rounds got wrong or skipped in this lane

Files read: `research/lane-algorithms.txt`, `lane-schema.txt`, `lane-production.txt`, `lane-agent-graphs.txt`, `verify.txt`, `critic.txt`; `widen/lane-graphify.md`, `lane-agents.md`, `lane-graphrag.md`, `architecture.md`, `critique-assumptions.md`.

- Round 1 told the owner to "expect Python call recall around 70 percent (PyCG)". That figure is PyCG's own abstract number, the verifier marked it "not confirmed", and it does not describe v1 anyway: v1 is not PyCG. Independent measurements of PyCG disagree with each other by method: 49 percent of dynamic edges (DyPyBench, 50 projects) but 59 percent of what it misses there are method calls on built-in types such as `"abc".strip()`, which do not matter for a repo graph; a second group's table on six real applications gives recall 0.48 to 0.76 depending on the evaluation mode (section 2.2). None of these can be applied to v1 without measuring v1.
- Round 1 said "no JS/TS call-graph precision or recall figures were retrieved". They exist now for Jelly (section 2.3).
- Round 1 and 2 never measured what v1's extractors lose. The schema lane listed "recall of the Python call graph against an independent tool" as unmeasured. I did not install an independent tool (rule 1), but I measured v1's own unresolved residue directly (section 3), which bounds the loss.
- Nobody noticed that the web app is untyped JavaScript, which decides how field-level links can be built, or that v1 already has an experimental field-link stage whose candidate sets are 87 percent ambiguous. That stage sits in `experimental/response_fields.*.jsonl` of every cached build, outside the 37 edge kinds the retrieval used.
- The graphify lane (round 2) describes graphify's code layer as tree-sitter parsing "with cross-file resolution passes". Tree-sitter itself does no name resolution; how graphify resolves calls I did not verify and do not claim. For TypeScript, v1's compiler-API pass is already type-resolved.
- Neither round tested the framework's own export (OpenAPI, route table) as an extraction source. This is the cheapest exact source in the stack.
- Neither round considered dynamic (test-run) edges as a source or as ground truth, although the call-graph literature uses them as the standard ground truth (PyCG successors, Jelly, DyPyBench).

## 2. The theory and the evidence, by topic

Strength labels: strong = independent, controlled, replicated; medium = independent or large but single study, or authors' own on real data; weak = single study, self-reported, toy scale, or read only as an abstract or snippet. "Read" means I opened the primary text, not a summary.

### 2.1 Symbol indexers and their schemas

**SCIP** (Sourcegraph Code Intelligence Protocol). Read: the repository README, `scip.proto`, `docs/DESIGN.md`, the announcement post. A Protobuf schema: an `Index` holds `Document`s (one per file, with `relative_path`), each with `Occurrence`s (a source range, a `symbol` string, `symbol_roles` as a bit set: Definition 0x1, Import 0x2, WriteAccess 0x4, ReadAccess 0x8, Generated 0x10, Test 0x20, ForwardDefinition 0x40, an optional `enclosing_range`) and `SymbolInformation` (kind, documentation, signature, `relationships` with flags is_reference / is_implementation / is_type_definition / is_definition, `enclosing_symbol` for locals). Symbols are human-readable strings: scheme, package (manager, name, version), then descriptors with suffixes (`/` namespace, `#` type, `.` term, `().` method).
Design statements, from the design document: it is a transmission format, not a storage or query format; string identifiers instead of numbers; data grouped by document instead of one global graph; file-level incremental indexing is a primary goal; non-goals include refactoring and efficient navigation. It has no call edge and no data flow: a call is just a reference occurrence with a role, so a call graph must be derived by joining occurrences with the syntax tree (a call expression at that position) and with the enclosing definition's range.
Measured claims (all from Sourcegraph's announcement, which says no controlled benchmark): LSIF payloads about 4x larger gzip-compressed and about 5x larger uncompressed than SCIP; a 10x CI speed-up replacing lsif-node with scip-typescript (not attributed to the protocol alone); one Meta engineer reporting 8x smaller and 3x faster processing for Glean's ingestion, via a social-media post. Strength: weak to medium (vendor, informal). Scale: these are size and speed claims; at 480 files they are irrelevant. What matters here is the resolution accuracy of the indexers.
Indexers listed on the README: scip-typescript (TypeScript, JavaScript, Svelte; Apache-2.0; Node 22 or 24; `--infer-tsconfig` for JS projects; out-of-memory advice for large code), scip-python (Python; a Sourcegraph fork of Pyright, so type-aware; needs Node 16 or later and Python 3.10 or later; calls `pip` to learn package names and versions, or takes a JSON `--environment` file; out-of-memory advice), plus Java, C++, Rust, Ruby, .NET, Dart, PHP. I could not confirm from the README how scip-typescript resolves references (the page does not say it uses the TypeScript compiler API), nor the scip-python licence beyond a LICENSE file that carries Pyright's MIT text.

**LSIF** (Language Server Index Format). Read: the 0.6.0 specification page. A graph of vertices (documents, ranges, result sets, results) and edges named after language-server requests, with `resultSet` hubs and `moniker`s for cross-project symbols. It answers definition, references, hover, implementation, type definition; the page does not mention call hierarchy. The page calls 0.6.0 "under construction". Sourcegraph replaced it with SCIP (section above). Not recommended: older, numeric-id graph encoding, no advantage for this use.

**Kythe** (Google). Read: the storage page and the repository README. Graph of entries (source node, edge kind, target, fact label, value) with five-field node names (signature, corpus, root, path, language). The README lists indexers for C++, Go and Java only; a Bazel build; Apache-2.0. Python and TypeScript are not mentioned, so their status is unknown from what I read. Not recommended: built for monorepo scale and build-system integration, no Python or TypeScript indexer evidenced.

**Glean** (Meta). Read: the introduction page and repository README. Immutable typed facts in a DAG, deduplicated in RocksDB, queried with Angle (Datalog-like, non-recursive); BSD licence; full indexers for C++, Hack, Haskell, JavaScript/Flow, Python (the README lists Python both as supported and as "not yet open-sourced", so unclear) and ingestion of SCIP for TypeScript, Python (scip-python), Go, Java; Haskell build, a demo Docker image exists. Prior round already took its design idea (derived facts that carry the facts they rest on). Not recommended as a dependency at this size.

**Language servers as a source of resolved references.** Pyright's own documentation lists find-references, rename, call hierarchy ("what a function calls and where it is called") and go to definition; MIT licence (per the LICENSE file text). Its inference: unannotated parameters take the `self` type, inherited types or defaults; return types are inferred, with call-site return type inference when all parameters are unannotated, recursion capped at "a small number"; what it cannot infer becomes `Unknown`, which is a blind spot. Source: Pyright docs `features.md` and `type-inference.md`. Pyrefly (Meta, Rust, MIT, version 1.0.0 in May 2026 per its package page) lists find-references; I could not confirm call hierarchy. The TypeScript language service and `tsserver` sit on the same checker that v1's compiler-API pass already calls.
**mypy** is already a development dependency and runs `mypy app` in strict mode in CI (`backend/pyproject.toml`). It exposes (a) `dmypy inspect --show definition` (documented, marked experimental: the definition location of a name or member expression) and `dmypy suggest --callsites` (experimental), and (b) an in-process API: `mypy.build.build(...)` returns a result whose `files` map module names to resolved syntax trees and whose `types` map each expression node to its inferred type when the `export_types` option is on (read in `mypy/build.py`). No published evaluation of mypy as a call-graph resolver exists that I found. Strength: none for accuracy; the mechanism is documented.

**Evidence that these are useful to an agent: none.** No measurement of SCIP, LSIF or language-server data inside an agent was found by this lane or by the earlier ones.

### 2.2 Call-graph construction theory and measured accuracy

Definitions. A call graph has an edge from a function to each function it may call. Class hierarchy analysis (CHA) resolves a call on an object to every method of that name in the receiver's static type and all subtypes. Rapid type analysis (RTA) keeps only subtypes that are instantiated somewhere. 0-CFA (a points-to analysis, "control-flow analysis") tracks which functions or objects each variable may hold, without distinguishing calling contexts. Precision is the share of reported edges that are real; recall (soundness) is the share of real edges reported.

- Java, measured through test selection (Legunsen et al., FSE 2016, read the PDF text): WALA call graphs with CHA, RTA, 0-CFA, 0-1-CFA on 22 projects. Without library exclusion RTA selects the same tests as CHA in every case where neither timed out, so the more expensive RTA "does not pay off"; more precise call graphs do not give a clear trend in safety. Strength: medium (one group, Java).
- Python: PyCG (ICSE 2021; abstract read): flow-insensitive, inter-procedural assignment-relation analysis; authors report precision about 99.2 percent, recall about 69.9 percent, 0.38 seconds per thousand lines, on a micro-benchmark and several real packages (sizes not on the abstract page). Weak to medium (authors' numbers).
  - Independent re-run on the PyCG micro-benchmark of 126 cases (Venkatesh et al., arXiv 2410.00603, read the HTML): 107 of 126 complete (84.9 percent), 110 of 126 sound (87.3 percent). Micro-benchmark, hand-made. Weak for real code.
  - Jarvis (arXiv 2305.05949 v5, read the HTML): flow-sensitive; micro-benchmark of 138 programs, macro-benchmark of six real applications. PyCG average precision/recall in application-wide mode 0.19 / 0.48; Jarvis 0.35 / 0.60; in exhaustive mode PyCG 0.99 / 0.76, Jarvis 0.99 / 0.82. PyCG took on average 502.8 s on the six projects (one project 1,705 s), Jarvis 301.3 s, Jarvis application-centred 8.2 s. I could not confirm what the table's mode labels stand for beyond the paper's table headings. Authors comparing their own tool with PyCG: medium. Still misses functions stored in lists, tuples and dicts, and reflective calls.
  - DyPyBench (FSE 2024, read the PDF text): the only large independent comparison. 50 projects; PyCG failed on 11 (six exceeded six hours, three exceeded 60 GB, two crashed); on the 39 where it ran, static graphs averaged 1,552 edges per project against 191 dynamic edges per project; only 49 percent of dynamic edges and 48.5 percent of dynamic callees are in PyCG's graph; 59 percent of the missing callees are methods of built-in types; about 12 percent of mismatches are name-resolution differences. Dynamic recording took 215 minutes per project on average. Caveat: dynamic edges only cover what the tests execute (95 percent of dynamic callers appear in the static graph, the other way round the static graph has many callers the tests never ran). Strength: medium to strong (independent, 50 projects), but about PyCG, not about v1.
  - Static call graphs beat language models at building call graphs (arXiv 2410.00603 abstract: PyCG and Jelly outperform 24 models; models beat static tools at Python type inference). Only the abstract was read for the claim. Medium.
- JavaScript: Jelly (PLDI 2024, Laursen, Xu, Møller; read the PDF text; BSD-3-Clause; Node.js programs). Approximate interpretation (a forced, unsound pre-execution that records "hints" for dynamically computed property names and module names) raises average call-edge recall from 75.9 to 88.1 percent on 36 benchmarks that have dynamic call graphs, at a per-call precision cost of 1.5 percent on average (individual projects lose up to 12.3 points). On all 141 benchmarks it adds 55.1 percent call edges, 21.8 percent reachable functions, 17.7 percent resolved call sites; static analysis time rose under 10 percent for 76 of 141 programs and over 2x for 20; 9 ran out of memory. Their own caveats: the ground truth comes from the projects' test suites and may be incomplete; recall stays low where module names are computed at run time (kraken-js 37.1 to 41.6 percent); other tools (WALA, js-callgraph, FAST) fail on modern module systems or reach 12.3 percent recall on the motivating example. Strength: medium (single group, node libraries, not React or React Native). Whether Jelly handles JSX and Metro-style bundling I did not verify.
  - SWARM-JS micro-benchmark (126 hand-made cases): Jelly with approximate interpretation completeness 38.8 percent, soundness 67.4 percent (arXiv 2410.00603; the page's denominators are inconsistent). Weak.
  - Antal et al., SCAM 2018 (search results only, not opened): five tools on 26 SunSpider programs and six Node modules; ACG highest precision (above 99 percent on 348 hand-checked edges). Old, weak for today's code.
- What dynamic dispatch, decorators, injection, higher-order functions and framework magic do. The numbers above are the evidence: method calls on built-in types, `super()` calls, functions held in containers, reflective calls and dynamically computed property or module names are the named misses (DyPyBench, Jarvis, Jelly). Calls made by a framework (a route handler invoked by the web framework, a dependency invoked by `Depends`) have no caller in application code at all, so no call-graph algorithm finds them without a model of the framework (section 2.5).
- Dynamic call graphs as a source. Python 3.12 added `sys.monitoring` (low-impact monitoring): events `PY_START`, `PY_RETURN`, `CALL`, `LINE`, and a callback may return `DISABLE` to switch an event off at one code location, which the documentation says is "very important for high performance"; it gives no overhead figure. coverage.py can record per-test contexts (`dynamic_context = test_function`) into a SQLite file: which lines each test ran. Both documentation-level facts; strength medium as mechanism, no overhead measured by me.

### 2.3 Code property graphs and slicing

A code property graph (CPG, Yamaguchi et al., IEEE S&P 2014) merges the abstract syntax tree, control-flow graph and program-dependence graph into one property graph. Joern's CPG specification 1.1 (read): layers for files, namespaces, methods, types, AST, call graph, CFG, dominators, program dependence (REACHING_DEF for data flow, CDG for control dependence); frontends must create the AST and may create CALL edges (otherwise they are derived from `METHOD_FULL_NAME`). Joern: Apache-2.0, JDK 21 (others untested), launchers `joern-parse`, `joern-slice`, `joern-flow`, Docker image `ghcr.io/joernio/joern`. Frontends list `pysrc2cpg` (Python) and `jssrc2cpg` (JavaScript); TypeScript is not named on the frontends page. Call linking for dynamic languages depends on a type-recovery pass (`XTypeRecovery`); open issues from 2024 describe it as work in progress (search snippet only). The 2014 paper's result is 18 previously unknown vulnerabilities in the Linux kernel: evidence for vulnerability discovery, not for retrieval context. Strength for this use: none. Scale: Joern's own claim is low memory and parallelism; I did not measure it.

Program slicing (Weiser): the statements that can affect (backward) or be affected by (forward) a value at a point. Evidence of slices as model context: Katana (arXiv 2205.00180, search snippet) cuts the average context for learned bug fixing from 39 to 15 lines; a taint-slicing study for npm malware (arXiv 2512.12313, snippet) reports a median context of 31 lines static and 18 taint-based, largest input 545k lines down to under 2,300; ARISE (arXiv 2605.03117, abstract read): statement-level nodes with intra-procedural definition-use edges added to SWE-agent with Qwen2.5-Coder-32B on SWE-bench Lite (300 tasks, 11 Python repositories): resolve rate 22.0 percent (66 of 300), a gain of 4.7 points; function recall at 1 from 0.43 to 0.60; the abstract attributes the gain to the data-flow graph. Single model, a weak 32B open model, abstract only, no token figures: weak, and a case of "helps weak models". I could not retrieve the average static slice size from Binkley, Gold and Harman (TOSEM 2007; 43 programs up to 136,000 lines; the page snippets do not give the percentage), so I do not state one.
Implication: whole-program slicing is too coarse for "what breaks"; only the narrow intra-procedural def-use needed to trace a field read has any support here.

### 2.4 Change impact analysis and regression test selection (RTS)

RTS runs only the tests a change can affect. Its measured safety (no affected test missed) and precision (no unaffected test selected) are the nearest thing the literature has to "what breaks if this changes".

- Ekstazi (Gligoric, Eloussi, Marinov, ISSTA 2015): dynamic file-level dependencies recorded per test; end-to-end testing time down 32 percent on average, 54 percent for longer suites (abstract). The tests-selected percentage per project was not in what I opened. Medium.
- Static RTS, class level (STARTS) against method level, measured relative to Ekstazi (Legunsen et al., 985 revisions of 22 Java projects; read): tests selected 20.6 percent Ekstazi, 29.4 percent class-level static, 43.8 percent method-level static (from the earlier lane note); safety violations in 0.2 percent of revisions for class-level (all from reflection) against 10.6 percent for method-level; precision violations in 33.0 percent against 55.7 percent; method-level static selection was slower than running every test. Caveat from the paper: safety is relative to Ekstazi, not to an absolute oracle. Java and JUnit. Medium to strong (independent, large, but one language and one reference technique).
- HyRTS (Zhang, ICSE 2018; search result only): combines method- and file-level; 2,707 revisions of 32 projects; fewer selected tests than file-level. Not opened; weak here.
- Predictive test selection (Machalica et al., Facebook, arXiv 1810.05286, abstract): a model trained on historical test outcomes halves testing cost while reporting over 95 percent of individual test failures and over 99.9 percent of faulty changes. Needs a large outcome history; this repository's history is 230 commits and no stored outcomes. Strength: medium (vendor scale), applies at a different scale.
- Structural versus history-based impact (search snippets of WCRE 2010, ICSE 2012 and others): structural coupling alone misses many change ripple effects; combining conceptual and evolutionary (co-change) coupling raised precision and recall by up to 17 and 41 percent over single sources on four open-source systems. Medium to weak (snippets). This supports v1's design of structure plus co-change, and says nothing against it.
- Hub files (a database module everything imports) select everything in a file-level scheme; this was noted by the first round and is a precision limit, not a bug.

### 2.5 Framework-aware extraction

- FastAPI (the backend framework). The app object has a public `.openapi()` method returning the OpenAPI schema (documentation page "Extending OpenAPI"); it uses `app.routes` and places the Pydantic models used as request bodies and `response_model` into `components/schemas`. It can be called without starting a server. Internals at master: each `APIRoute` carries `dependant` (the injection tree built from the function signature), `response_model`, `response_field`, `endpoint`, `dependencies`, `operation_id`, `tags` (read in `fastapi/routing.py`); these are not a stable public interface, so pin the version. The repository has 63 `response_model=` uses in `backend/app` and a test of the docs endpoints, so the schema is already produced and trusted.
- SQLAlchemy exposes a runtime inspection API (`inspect()` returns a `Mapper` for a mapped class). I opened the page but it did not state the column and relationship accessors, so that part is from general knowledge and unverified here. Alembic's drift check, which CI already runs, uses the same metadata.
- Static spec inference is hard: Respector (ICSE 2022) and AutoOAS generate REST specifications by static analysis of Java server code and were evaluated against hand-built ground truth (search snippets only; no numbers read). A 2024 comparison of static architecture-recovery tools for microservices (arXiv 2412.08352, snippet) found three tools detected no endpoints at all and the best F1 was 0.79. Weak (snippets), but the direction is the reason to prefer the framework's own export.
- React: components and navigation. v1's compiler-API pass resolves JSX tags to repo components (31 resolved in mobile, the other 901 are library components). Nothing in the literature I found measures component-tree extraction accuracy.
- CodeQL models web frameworks and has data-flow, but its licence (read: the CLI binaries' LICENSE.md) allows automated analysis only of open-source code on GitHub or under a paid Advanced Security licence, not a private codebase. Excluded.

### 2.6 Cross-language links through an interface description

- The accepted mechanism is the interface description itself: the OpenAPI schema generated by the backend, and typed clients generated from it (openapi-typescript, MIT; I could not confirm from its page how property names map). The link from a response field to the client code that reads it then needs only the client's typed field accesses (checker-resolved) to be matched to schema property paths.
- Measured evidence for static client-to-server linking is thin: one AngularJS study reports 93.2 percent recall and 92.2 F-measure on one application (search snippet); tool-by-tool reports (CodePrism, Callix, Trailmark) are descriptions without accuracy. Weak. I found no study of field-level links. This is a gap in the literature, not a result.

### 2.7 Granularity: file, definition, statement, field

- RTS: file/class level is as good as dynamic file-level selection and better than method level (section 2.4). Strength medium (Java).
- Agent literature: Aider file-level map, LocAgent function-level, RepoGraph line-level, ARISE statement-level. I searched for a controlled granularity ablation inside an agent and found none; the closest is a two-stage file-then-function design (CoSIL, snippet). So which granularity pays for an agent is untested, including by the first two rounds.
- The prior round's read-displacement finding (map returns code bodies, so the agent skips Read calls; 109 of 109 fewer-token runs in one arm) says the return unit matters more than the edge unit: edges can be coarse, but what the graph returns should be a definition card with signature and exact line range, so the agent reads lines, not files.
- My working rule, to be tested (section 8, test T6): file-level edges for impact and test selection; definition-level nodes for who-calls and for what is returned; field-level only where a contract exists (response fields, settings, table columns, config keys), because only there is a field a unit that code outside its own file depends on.

## 3. What I measured on this repository

All measurements are read-only on the repository and on the build folder; scripts are in the scratchpad folder `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/g2c/` (`measure_ts.js`, `measure_web.js`, `measure_fields.js`, `param_names.js`). The TypeScript used is the 5.3.3 already in `technician-app/node_modules`. Nothing was installed. The working tree is the current checkout, which is later than v1's frozen commit, so counts differ from v1's cached build; v1 numbers below come from the largest cached build (`facts/cache/c1adf54e...`, 546 exported files, 5,464 nodes, 18,875 edges) or from re-running v1's `py_extract.py` on the current `backend/`.

**3.1 v1 Python call resolution** (v1 `py_extract.py`, run on the current `backend/`, 13,572 call sites): 6,116 external (library or built-in), 3,978 resolved (2,337 by name in scope, 777 constructors, 608 typed receivers, 153 `self`, 76 module attributes, 17 chained constructors, 10 singletons), 290 unresolved but the called name matches a repo definition, 2,989 unresolved and matching nothing. In-repo candidates are 3,978 + 290 = 4,268, so the measurable residue is 6.8 percent. Top residue names: `result.scalars` 25, `session.commit` 9, `counts.get` 8 (generic, correctly unresolved) and `service.record_punch` 7, `service.record_presence` 6, `_service(tech).login` 3, `_service(tech).set_pin` 2 (genuine: a receiver whose type is declared in a fixture or helper). v1 is therefore not "name matching only": it resolves through scopes, constructors, annotated receivers, return-typed locals and Protocols. At the older cached build the numbers were similar (103 of about 2,600 resolved-or-matching sites, 4 percent). Caveat: the 2,989 "other" sites may hide a few calls through aliases or `getattr`; I cannot count those without an independent resolver.

**3.2 v1 TypeScript call resolution, with and without library types** (`measure_ts.js`, mobile program over `technician-app/src`, 138 files). Non-test calls 2,538: resolved to a repo definition 764 in both runs; external 598 (hermetic) against 1,276 (with `node_modules`); unresolved 689 against 11; through a parameter or destructured binding 443 in both; other 44 in both. Test files: repo definitions 932 in both. JSX tags 932: 31 resolve to repo components in both, 901 are library components (unresolved when hermetic, external with types). Result: the hermetic export does not lose repo edges. The 678 calls that move from unresolved to external are library calls.

**3.3 Web app** (`measure_web.js`, 120 JS/JSX files, `checkJs` off as in `jsconfig.json`): non-test calls 1,789: 500 repo definitions, 783 external, 241 unresolved, 265 through parameters. Of the 241 unresolved, 234 have a name that matches no repo function, 6 match exactly one, 1 matches several. So at most 7 call sites (0.4 percent) are recoverable by any name-based fallback.

**3.4 Calls through parameters** (`param_names.js`): mobile 445: 409 `set*`, 22 `on*`, 380 from array destructuring of a hook call; web 265: 218 `set*`, 19 `on*`, 218 from hook destructuring. The remaining unexplained call sites are 14 (mobile) and 28 (web). Ceiling for what points-to or approximate interpretation (Jelly-style) could add: about 36 call sites in mobile and 47 in web, including the `on*` handlers, which a one-hop rule (the JSX attribute `onSave={handleSave}` binds the child's `onSave` parameter) would capture deterministically.

**3.5 Field-level contract** (v1 `experimental/response_fields.*.jsonl`, `measure_fields.js`, `git ls-files`):
- Backend: 110 classes in `backend/app/**/schemas.py`; 49 route-to-model edges (`returns_model`) in v1.
- v1's name-keyed reads: 1,183 edges (625 mobile, 558 web) to 390 fields; candidate fields per read: 1 candidate 149 (12.6 percent), 2: 148, 3: 120, 4: 216, 5: 65, 6 or more: 485 (41.0 percent).
- Mobile checker-exact reads: of 3,589 non-test property accesses, 2,141 resolve to a repo declaration; 194 resolve to a property declared in an interface or type alias whose name equals a backend schema class (58 distinct fields; `Job` 102 reads, `JobDetail` 30, `ActiveGeofence` 13, `MediaItem` 11). Same-name alignment covers only 21 of 110 backend classes and the 120 exported TypeScript type names; destructured reads (`const { a } = job`) are not counted, so 194 is a lower bound for the exact tier.
- Web: 120 JS files, 1 with a JSDoc type annotation, 0 TypeScript files. No declared type to resolve through.

## 4. What v1 loses, in one table

| Area | v1 today | Measured or cited loss against a compiler-grade extractor | Strength |
|---|---|---|---|
| TS/JS direct calls | TypeScript checker, hermetic | Near zero: 7 of 1,789 web calls recoverable by name; adding library types changes resolved repo edges by 0 of 764 | My measurement, this repo; medium |
| TS/JS callbacks | `passes_callable` is Python-only; param calls unresolved | About 36 (mobile) and 47 (web) call sites | My measurement |
| Python calls | scopes, constructors, annotated receivers, return-typed locals, Protocols | At most 290 of 4,268 candidates (6.8 percent), mostly generic names; unknown share genuine | My measurement |
| Dynamic dispatch, reflection, framework-invoked code | Not modelled except Protocol impls, `Depends`, route registration | Literature: static Python recall 49 percent of dynamic edges (DyPyBench, other tool), Jelly 75.9 percent baseline recall on Node libraries | Medium, other tools |
| Recall of v1 itself | Never measured | No ground truth exists in the project | Gap |
| Field-level cross-runtime links | Name-keyed, experimental | 87.4 percent of reads ambiguous; web side untyped | My measurement |
| Test-to-code links | 39 route-call edges and file links | No per-test coverage edges | Gap |

## 5. Which extraction method for which question

| Question | Best-supported source | Why | Alternative named and rejected |
|---|---|---|---|
| Who uses this definition (Python) | Type-aware resolution: v1 plus mypy/Pyright resolution for residual receivers | Annotations are everywhere (mypy strict); residue is 6.8 percent | PyCG or Jarvis: flow-insensitive or research tools, timeouts at scale (PyCG: 6 of 50 projects over six hours) |
| Who uses this (TS) | TypeScript checker (v1) | Already near ceiling here | Jelly: gains are for dynamic property names in Node libraries, bounded here by about 80 call sites |
| What does this reach at run time | Recorded edges from the test run | The standard ground truth in the literature | Static closure alone (49 percent of dynamic edges for PyCG) |
| What breaks if this changes | File-level structural closure + dynamic test coverage + co-change | Ekstazi and STARTS results; combination study | Method-level static call-graph selection: worse, slower in the measured study |
| Which route, schema, table, dependency | Framework export at run time | Exact by construction | Static inference (hard, snippets) |
| Which client code reads this field | Checker-exact where typed; schema-restricted def-use where not | Section 3.5 | Name-keyed (12.6 percent unique) |

## 6. What a field-level contract edge across the runtimes would take

Goal: an edge `response_field(Job.status) <- reads <- code(file:line)` that an agent can query as "who breaks if I rename or retype this field".

Build, in three tiers with an honest confidence class on each edge:

1. **Backend side, exact.** In a container with the project's own dependencies, import the FastAPI app (with stub environment variables), write `app.openapi()` to a file, and walk `app.routes`. Nodes: `operation` (method plus path plus operationId plus handler qualified name with file and line), `schema` and `schema_field` (component name plus property path, with required and type), `depends` (the injection tree). Edges: handler returns schema; schema contains field; schema field defined at the Pydantic class field's file and line (via `inspect`). This replaces v1's AST detection of routes and models (77 routes, 110 classes). The OpenAPI document is the stable public interface; `APIRoute.dependant` is semi-private, so pin the FastAPI version.
2. **Client side, typed (mobile).** Use the checker: for every property access, resolve the property declaration (done in `measure_fields.js`). Align each client interface to a schema once, not per read: by name where equal, otherwise by structure (property names and types match above a stated overlap threshold), and record "client declares field X that the schema does not have" and "schema field Y that no client reads". Optionally, generate canonical TypeScript types from the schema with openapi-typescript and compare them structurally with the hand-written interfaces, which gives an exact drift check. Expected output: 194 exact reads today (lower bound).
3. **Client side, untyped (web).** The call site already links to an operation by URL (v1: all 78 production client sites matched at the early build). From the call's result, follow a small intra-procedural def-use: assignment, destructuring, `await`, `.then(x => ...)`, returns through a one-hop wrapper in the same file, then property reads on that variable; the candidate set is restricted to that operation's response schema, so most reads have one candidate. Edges that pass through a mapper function in another file get a lower confidence class. This is def-use at field level; Joern's REACHING_DEF is a ready-made implementation but a heavy dependency (JDK 21, no TypeScript frontend named), so write the small pass first.

Costs: tier 1 about a day with the project's own container; tier 2 is already half-built in v1 and in `measure_fields.js`; tier 3 is the real work. No new package is needed for tiers 1 to 3.

What it will not do: anything that goes through the offline outbox, string-built field names, `Object.keys` loops, or generic form components that read fields by a runtime key. Those stay unresolved and should be marked so, not guessed.

## 7. Tools that run offline in a Linux container

"Offline" means: one network fetch to install, none to run. Sizes marked "not stated" were not on the pages I read.

| Tool | Source | Licence | Size | Runs offline in a Linux container | Notes |
|---|---|---|---|---|---|
| scip-typescript | npm `@sourcegraph/scip-typescript` | Apache-2.0 | not stated | Yes after install; Node 22 or 24; `--infer-tsconfig` for JS | OOM flags documented |
| scip-python | npm `@sourcegraph/scip-python` | LICENSE file shows Pyright's MIT text; not named on the README | not stated | Yes after install if `--environment` JSON is given (otherwise it calls `pip`); Node 16+ and Python 3.10+ | Pyright fork; OOM advice |
| `scip` CLI | github.com/sourcegraph/scip | Apache-2.0 | not stated | Yes (read and print an index) | Go binary |
| Pyright | npm or pip | MIT (LICENSE text) | not stated | Yes | Language-server features include find references and call hierarchy |
| mypy | already a project dev dependency | MIT | already installed | Yes | `build.build` with `export_types`; `dmypy inspect` |
| coverage.py or stdlib `sys.monitoring` | PyPI or Python 3.12 itself | Apache-2.0 / PSF | small / none | Yes | The project runs Python 3.12; monitoring is built in |
| pytest-testmon | PyPI | MIT | small | Yes | Dependency-database plug-in; I could not confirm its granularity from its page |
| Jelly | npm `@cs-au-dk/jelly` | BSD-3-Clause | not stated | Yes (Node); dynamic call graphs need NodeProf (GraalVM, JDK, C++ compiler; a Docker image is offered) | Node.js programs; JSX and bundlers unverified |
| Joern | github.com/joernio/joern | Apache-2.0 | not stated | Yes; JDK 21; Docker image `ghcr.io/joernio/joern` | TypeScript frontend not named |
| openapi-typescript | npm | MIT | not stated | Yes if given a local schema file (not confirmed on its page) | Optional |
| Glean | github.com/facebookincubator/Glean | BSD | not stated | Demo Docker image; Haskell build | Not recommended here |
| Kythe | github.com/kythe/kythe | Apache-2.0 | not stated | Bazel build | Not recommended here |
| CodeQL | GitHub | Free only for open-source codebases and research (LICENSE.md read) | n/a | n/a | Excluded: private repository |

I could not open size figures for any of them; installed sizes must be measured at install time.

## 8. Recommendations

Each item: what to build; theory source; what it replaces; expected effect; test on tuning data; install; verdict. "Tuning data" means the commits used for tuning, never the sealed held-out commits.

**R1. Add a measurement of v1's extraction recall and precision before changing it.** Run an independent resolver and a recorded dynamic call graph, and score v1's `calls`, `imports`, `defines` and `test_calls_route` edges against both.
- Theory: the call-graph literature's standard method (dynamic ground truth, Jelly and DyPyBench; independent tool agreement).
- Replaces: nothing; closes the "never measured" gap.
- Expected effect: it tells the owner whether the extraction layer is a bottleneck; my measurements predict it is not for direct calls (under 7 percent Python residue, about 0 for TS) and that disagreement concentrates in framework-invoked code and aliasing.
- Test: sample 60 disagreeing edges by hand and label which tool was right; report v1 recall and precision against dynamic edges on the tuning commits' test runs; if v1 recall on dynamic in-repo edges is at or above 95 percent, stop extraction work.
- Install: scip-typescript, scip-python and the `scip` CLI (or Pyright alone) in the container; coverage.py or nothing (use `sys.monitoring`). Strength of the plan: sound method; verdict: do.

**R2. Record dynamic edges from the Python test run and store them as `exercised_by` (test to definition) and `called_at_runtime` edges.**
- Theory: Ekstazi-style dynamic dependencies; dynamic call graphs as ground truth (DyPyBench); `sys.monitoring` or coverage contexts.
- Replaces: the 39 `test_calls_route` edges and file-level test links as the only test evidence.
- Expected effect: an exact "which tests touch this definition" answer, the part of "what breaks" that RTS literature rates safest; closes the gap for framework-invoked handlers. Risk: needs the integration database (the project has a Docker gate with Postgres) and covers only what tests run (DyPyBench: static graphs hold many callers the tests never reached).
- Test: for tuning commits, does adding the edges raise recall of "tests that failed or were edited together with the change" at equal answer size over the file-level baseline? Overhead check: time the suite with and without recording (the Python documentation gives no figure).
- Install: none beyond the container; coverage.py optional. Verdict: do, after R1.

**R3. Replace AST route, model, table and injection detection by the framework's own export (section 6, tier 1), and keep the AST edges only as a cross-check.**
- Theory: runtime reflection is exact where static inference is the documented hard case.
- Expected effect: removes any route or model the AST missed (v1 found 77 routes and 110 models; the true counts are unknown), adds dependency trees and response schemas with required flags.
- Test: diff against v1's route, table and `depends_injects` edges on every tuning commit; every difference is a defect in one of them, read by hand.
- Install: none (project dependencies in the project's own Docker image). Risk: import side effects. Verdict: do.

**R4. Build the three-tier field-level contract edges (section 6).**
- Theory: interface-description-based linking; checker-resolved property accesses; intra-procedural def-use.
- Replaces: v1's experimental name-keyed `reads_response_field` (12.6 percent unique).
- Expected effect: raises unique-candidate reads from 12.6 percent to the share of reads the three tiers cover; I will not state that share without building it.
- Test: take tuning commits whose diff adds, removes or renames a field in a `schemas.py`; the ground truth is the client files changed in the same pull request. Score precision and recall of "client files predicted to be affected" at equal answer size for (a) v1 name-keyed, (b) co-change only, (c) tiers 1 to 3. If (c) is not better than (b), drop the tiers.
- Install: none for tiers 1 to 3; openapi-typescript optional. Verdict: do; this is the one place the measurement shows a large gap.

**R5. Resolve the 290 residual Python receivers with mypy's resolved trees (trial).**
- Theory: type-aware resolution beats name matching (the ECOOP 2014 Scala result cited in a search summary says name-based resolution is imprecise when unrelated classes share method names; weak).
- Replaces: v1's name-only residue (6.8 percent of candidates).
- Expected effect: converts the genuine misses (`service.record_punch`) into edges; small. Risk: `mypy.build` is an internal API; use `dmypy inspect --show definition` as the documented fallback.
- Test: hand-label 60 random residual sites; count how many mypy resolves correctly, how many wrongly.
- Install: none. Verdict: trial, low cost, low expected effect.

**R6. One-hop callback binding for TypeScript (`onX={handler}` to the child's `onX()` call).**
- Replaces: nothing; adds about 41 edges (22 mobile plus 19 web `on*` calls).
- Test: count against a hand-check of 30 edges. Verdict: low priority; do only if R1 shows callbacks matter.

**R7. Granularity test (T6).** Build three arms on identical tuning tasks: file-level edges and file cards; definition-level edges and definition cards (signature plus line range); definition-level plus field-level contract nodes. Measure agent tokens for the same correct result. Theory: RTS granularity results (medium, Java) and the read-displacement finding; no agent ablation exists. Verdict: do before committing to a granularity.

**Do not adopt (with the reason):**
- Joern or a full code property graph as the main store: no measured benefit for agent context, JDK 21, TypeScript frontend not named, type recovery described as work in progress. Keep only as a fallback for the web def-use if the small pass fails.
- Kythe, Glean: built for monorepo scale; no evidenced Python or TypeScript indexer for Kythe; no benefit at 480 files.
- CodeQL: licence.
- Jelly and approximate interpretation: bounded gain here (about 80 call sites), Node-library benchmarks, JSX and React Native unverified.
- Method-level static call-graph selection for "what breaks": worse and slower than class level in the only large measurement.
- Whole-program slicing.

## 9. Scale: what changes at 10 and 100 times the size

- At about 480 files and 5,400 nodes: every extractor above runs in seconds (v1's Python stage 1.8 s on the backend). The size and speed arguments for SCIP over LSIF, Glean and Kythe do not apply. PyCG's published failures (timeouts above six hours, memory over 60 GB) were on much larger programs than this backend, but would matter at 100 times.
- At 10 times (about 5,000 files): file-level incremental re-indexing (SCIP's design aim) and dynamic recording cost start to matter; Pyright-based indexing may need memory flags (documented OOM guidance); Jelly's analysis time doubled for 20 of 141 programs and ran out of memory on 9.
- At 100 times: Glean or Kythe style stores, SCIP uploads, selective test selection by learned models (Meta's predictive test selection needs outcome history at that scale) become relevant. None is relevant now.

## 10. What I could not open or verify

- scip-python's licence beyond the LICENSE file's Pyright MIT text; installed sizes of every tool; how scip-typescript resolves references.
- Pyrefly call hierarchy support; Joern's TypeScript handling and type-recovery accuracy; Kythe's Python and TypeScript indexers and its cross-language edges (README and storage page only); Glean's Python indexer open-source status.
- CodeQL's framework models (the language-guide page I opened does not say).
- Primary text for Ekstazi's tests-selected figures, HyRTS, Katana, the npm slicing paper, Respector and AutoOAS, the microservice recovery comparison, the AngularJS cross-language study, Antal et al. (SCAM 2018): search results or abstracts only.
- The meaning of the application-wide and exhaustive mode labels in the Jarvis table beyond their column headings.
- Binkley, Gold and Harman's average slice size.
- Whether Jelly handles JSX and React Native; the actual SQLAlchemy `Mapper` accessor names (the page did not state them).
- mypy's `build.build` stability across versions; I read only the `BuildResult` docstring.
- Any measurement of v1 against an independent resolver or against dynamic edges: no tool was installed and no tests were run (rule 1). The section 3 numbers bound v1's residue from its own statistics and from checker-based re-measurement; they are not an accuracy score.
- Whether the 12.6 percent figure would rise much if v1's name-keyed candidates were restricted by route; I only measured the current ambiguity.
