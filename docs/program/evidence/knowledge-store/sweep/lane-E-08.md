# lane:E-08

lane=E-08 tool_status=ok facts=27 candidates=14

## Summary
The lineage queries are not beyond recursive CTEs at hundreds of nodes and a few thousand edges. They reduce to a plain join (entries citing changed files), one undirected closure (entries sharing a root cause), one directed closure (what X superseded), and a join on top of the second (failed attempts). I ran the SQL versions in SQLite 3.53.1. Per-query cost is 0.07 ms for the join, under 1 ms on a sparse graph, and 50-80 ms on a dense 300-node, 3000-edge single-component worst case. One trap: putting depth in the UNION key defeated deduplication (1090 ms vs 53 ms). Modelling root cause as a row, not pairwise edges, removes the recursion entirely. A graph engine only pays off for a code call graph, which the store should not hold. Engines: Kuzu is archived (Oct 2025; Apple acquisition reported); its MIT fork Ladybug is churning pre-1.0 (v0.22.1) and has no MCP server I could find. CozoDB (Datalog) has had no release since Dec 2023 and no push since Dec 2024; cite its design only. Neo4j has usage reporting enabled by default. Memgraph has telemetry enabled by default and a BSL licence. FalkorDB is SSPL and a Redis module. SurrealDB is BSL. Dgraph is built for far larger workloads. AGE needs Postgres plus an extension. Soufflé is an analysis compiler, not a store. PostgreSQL 19's SQL/PGQ was committed in March 2026 and reverted on master in September 2026. Recommendation for the lane: recursive CTEs in SQLite (or Postgres), plus Datalog or Cypher as documentation of intent only.

## Candidates
- **Recursive CTEs over a relational schema in SQLite** [technique] strong — All four lineage queries are expressible in 1-6 lines and ran in 0.07 ms to 95 ms on a dense 300-node/3000-edge worst case (sub-ms on a realistic sparse graph). UNION gives cycle safety. No new dependency or process, and a single file the owner controls. Weakness: depth-in-key and undirected traversal need care (f19, f22, f23), and there is no shortest-path or pattern syntax.
    egress: None; embedded, no network code in the engine. | ops: none | win: Excellent: SQLite ships with Python stdlib and Node 24 has node:sqlite; no install. | linux: Excellent: single file, trivially backed up; concurrency limited to one writer (WAL), fine for a few writes per phase. | access: Any CLI or MCP wrapper; SQL is directly writable by an agent; read-only can be enforced by opening the file read-only. | footprint: Kilobytes of code, MBs of data. | maturity: Mature; recursive CTE since 3.8.3 (2014). | facts: f16, f19, f21, f22, f23, f24
- **Recursive CTEs in Postgres (self-hosted, separate from the Supabase app database)** [technique] viable — Same queries, plus built-in CYCLE and SEARCH clauses. Only worthwhile if the store joins the Postgres-based stack; for this workload SQLite does the same job with no server. The existing production Postgres is on Supabase, which is a third party and must not hold this data.
    egress: None if self-hosted; excluded if on Supabase. | ops: low | win: Needs Docker Desktop or a local server; more weight than SQLite. | linux: Good if a Postgres is already operated on the VPS. | access: psql or MCP via a Postgres client; permissions via roles. | footprint: Server process, hundreds of MB. | maturity: Mature. | facts: f17, f25
- **Kuzu (kuzudb/kuzu, original)** [engine] rejected — Repository archived 2025-10-10; company acquired (reported). A frozen v0.11.3 would work but gets no fixes.
    egress: Embedded; no known telemetry (not verified). | ops: medium | win: Prebuilt bindings existed, but frozen. | linux: Frozen. | access: No MCP server verified. | footprint: Embedded library. | maturity: Archived. | facts: f1, f2
- **LadybugDB (Kuzu fork)** [engine] weak — Embedded, MIT, Cypher with proper variable-length and shortest-path semantics, in-process so no server. But it is a fork with a successor-risk story, pre-1.0 and moving fast (0.17.1 to 0.22.1 in about four months), with no MCP server found. For hundreds of nodes it solves nothing recursive CTEs do not. Acceptable only as an optional derived index rebuilt from the relational source of truth.
    egress: Embedded, in-process; telemetry not verified either way. | ops: medium | win: Python/Node bindings advertised; Windows wheels not verified. | linux: Embedded library, fine. | access: No MCP server found; would need a thin wrapper. | footprint: Embedded library, tens of MB. | maturity: Pre-1.0, fast-moving fork. | facts: f3, f20
- **CozoDB (embedded Datalog over SQLite/RocksDB)** [engine] cite_design_only — Datalog expresses the closure queries most elegantly (f5), and its relations-as-rules model is a good mental model for the lineage rules. But the last release is v0.7.6 (Dec 2023), last push 2024-12-04, and the README disclaims storage compatibility before 1.0. Adopting it adds an unmaintained dependency for queries SQL already answers.
    egress: Embedded; no known telemetry (not verified). | ops: high | win: Windows .exe CLI releases exist; Node/Python prebuilt assets not visible. | linux: Linux aarch64 listed; x86_64 not confirmed on the page read. | access: No MCP server found. | footprint: Embedded. | maturity: Stalled pre-1.0. | facts: f4, f5
- **Neo4j Community Edition** [engine] rejected — JVM server for a workload of a few hundred nodes. dbms.usage_report.enabled defaults to true with its destination undocumented on the page read (f6). GPLv3 plus the licensing page's 'non-production' wording need legal reading. Has the best-documented MCP server (f7), but that does not offset the footprint and the telemetry default.
    egress: Usage reporting on by default; disableable by setting; destination unknown. | ops: medium | win: Runs on a JVM on Windows or in Docker. | linux: Fine but heavy. | access: Official MCP server with read-only mode. | footprint: JVM, hundreds of MB of RAM. | maturity: Very mature. | facts: f6, f7
- **Memgraph Community** [engine] rejected — BSL licence (internal production use allowed), telemetry enabled by default (counts of vertices and edges, feature usage), in-memory server whose default memory limit is 90-100% of RAM. Designed for streaming and large in-memory graphs. Has an MCP server (f10).
    egress: Telemetry on by default; flag disables it. | ops: medium | win: Docker. | linux: Fine. | access: mcp-memgraph exists. | footprint: Server process, in-memory. | maturity: Mature. | facts: f8, f9, f10
- **FalkorDB** [engine] rejected — SSPLv1 Redis module (RedisGraph successor lineage not confirmed on page); Linux/macOS builds only; needs a Redis server. Oversized for the workload.
    egress: Telemetry not documented on the page read. | ops: medium | win: Docker only. | linux: Good. | access: MIT MCP server in TypeScript. | footprint: Redis process plus module. | maturity: Active. | facts: f11
- **Apache AGE (Postgres extension)** [engine] weak — Apache-2.0 openCypher on Postgres 11-18. Needs a Postgres with the extension compiled in (Linux/macOS builds only documented), and the same Postgres can run recursive CTEs directly. Adds an extension to upgrade with every Postgres major.
    egress: None beyond Postgres. | ops: medium | win: Docker only; Windows build undocumented. | linux: Good if Postgres is already run. | access: Via Postgres client; no dedicated MCP verified. | footprint: Postgres server plus extension. | maturity: Active, v1.8.0. | facts: f12
- **SurrealDB** [engine] rejected — BSL 1.1 multi-model server; recursive path syntax exists but the workload does not need a multi-model server. Default usage-telemetry posture not established, so egress cannot be assumed away.
    egress: Unknown; OTLP export is opt-in. | ops: medium | win: Native binary exists (not verified in this lane). | linux: Fine. | access: Not checked. | footprint: Server process. | maturity: Active. | facts: f13
- **Dgraph** [engine] rejected — A horizontally scalable distributed graph database; designed for orders of magnitude more data than a few thousand edges and carries cluster operations cost.
    egress: Not established. | ops: high | win: Docker. | linux: Heavy. | access: Not checked. | footprint: Multiple processes (Zero/Alpha). | maturity: Mature, v25. | facts: f14
- **Soufflé (compiled Datalog)** [tool] cite_design_only — A static-analysis compiler (Datalog to C++), not a store: no persistence, no concurrent access, no server or MCP. Its relevance is design: rule-based derivation of facts from relations. A C++ toolchain build step would be extra for one developer.
    egress: None; offline tool. | ops: high | win: MSVC build suggested; unverified. | linux: Good. | access: CLI only; reads and writes fact files. | footprint: Compiler toolchain. | maturity: Mature in research and industry. | facts: f15
- **PostgreSQL SQL/PGQ (GRAPH_TABLE)** [technique] rejected — Committed for PG19 in March 2026, reverted in September 2026 (f18); never had variable-length paths in the committed form, so it would not have answered closure queries anyway.
    egress: N/A | ops: unknown | win: N/A | linux: N/A | access: N/A | footprint: N/A | maturity: Reverted. | facts: f18
- **Root cause as a row plus a supersedes chain column, with recursion only for rare closures** [pattern] strong — Turns the 'shares a root cause' query into an equality join and the 'supersedes' query into a short chain walk, so the common case is not graph-shaped at all (f26). The recursive CTEs remain a fallback for audits and merge detection.
    egress: None. | ops: none | win: Works on any relational engine. | linux: Works on any relational engine. | access: Plain CLI verbs like 'show cluster' and 'show chain'. | footprint: Two tables and one column. | maturity: Standard relational modelling (adjacency list and entity-for-cluster). | facts: f19, f26

## Design implications
- (strong) Do not adopt a graph engine for the lineage queries. At hundreds of nodes and a few thousand edges all four queries are answered by a plain join or one recursive CTE in SQLite; the measured worst case was 95 ms and realistic sparse graphs run in under 1 ms. [f19, f21, f22, f23]
- (moderate) Model 'root cause' as its own row (entries reference it by foreign key, clusters merge on discovery) rather than as pairwise same_root_cause edges, so the most common lineage question needs no recursion. Keep an edge table only for supersedes and related-to links. [f26, f19]
- (strong) If recursive CTEs are used, write the recursive arm to dedupe by node id only (UNION, no depth column in the key) and cap hops; a depth column in the UNION key was 20x slower in the dense test. Wrap this in a tested repository function so agents never write recursion themselves. [f19, f16, f17]
- (moderate) Event-driven invalidation (changed files, symbols, dependency versions) is a one-hop join from the changed set to entry citations, not a graph traversal; keep the code call graph out of the store. [f21, f27]
- (strong) Engine choices on the graph side carry avoidable risk: Kuzu is archived (its fork is pre-1.0 and churning), CozoDB has been unmaintained since 2024, Neo4j and Memgraph both default to usage reporting or telemetry on, and PG19's native graph SQL was reverted. A graph engine would add either a dependency-death risk or an egress setting to police, for no capability gain. [f1, f3, f4, f6, f9, f18]
- (moderate) Hold the store outside the Supabase-hosted FixFlow database. SQLite (a file the owner controls) or a self-hosted Postgres both satisfy the egress constraint; Supabase does not. [f25]
- (moderate) Write the lineage queries in Cypher or Datalog form in the design document as documentation of intent (the Datalog rules are the clearest statement of the recursion), but implement them in SQL behind the abstraction layer; if scale ever demands a graph index, it can be a rebuildable derived projection, not the source of truth. [f5, f20, f22, f23]

## Rejected paths
- Run Neo4j Community or Memgraph as the knowledge store — JVM or in-memory server footprint, usage reporting or telemetry on by default with destination or data not under the owner's control until disabled, licence conditions (GPLv3 non-production wording; BSL), for a workload recursive CTEs handle in milliseconds.
- Adopt original Kuzu — Archived on 2025-10-10; no further fixes.
- Rely on PostgreSQL 19 SQL/PGQ for graph queries — Reverted in September 2026 (124 commits); the committed version also lacked variable-length path traversal.
- Use Soufflé as the store — It is a compile-to-C++ analysis tool with no persistence, concurrency or tool access surface.
- Put the store in the Supabase Postgres used by FixFlow — Third-party host; violates the constraint that code and defect data stay on owner-controlled machines.

## Facts
- f1 [LOAD-BEARING] (verified, source_repo; engine/ops_cost) Kuzu's GitHub repository (kuzudb/kuzu) is archived and read-only, archived by the owner on Oct 10, 2025. License MIT. README says 'Kuzu is working on something new' and directs users to v0.11.3 or a self-hosted extension server.
    https://github.com/kuzudb/kuzu (read 2026-11-02)
- f2 (reported, blog; engine) Apple reportedly agreed to acquire Kuzu on Oct 9, 2025; the deal became public in Feb 2026 via an EU acquisitions filing. The Kuzu website is reported no longer operational.
    https://betakit.com/apple-strikes-deal-to-acquire-canadian-database-software-startup-kuzu/ ; https://uwaterloo.ca/computer-science/news/waterloo-based-graph-database-start-up-kuzu-acquired-apple (via web search summary, not opened)
- f3 [LOAD-BEARING] (verified, source_repo; engine/access/ops_cost) LadybugDB (formerly Kuzu) is an MIT-licensed embedded graph database with Cypher; bindings for Python (ladybug), Node (@ladybugdb/core), Rust, Go, Swift, Java, C/C++, CLI, WASM. Releases seen: v0.22.1 (28 Oct), v0.22.0 (25 Oct), v0.21.2 (1 Oct), 2026 per asset timestamps, so the minor version moved from 0.17.1 (June 2026, reported) to 0.22 in about 4 months. The GitHub page does not mention an MCP server; a web search found none, and one write-up noted no stable Python release yet.
    https://github.com/LadybugDB/ladybug ; https://github.com/LadybugDB/ladybug/releases ; web search summary for MCP/Python-stability claims
- f4 [LOAD-BEARING] (verified, source_repo; engine/ops_cost/limits) CozoDB: MPL-2.0; latest release v0.7.6 (assets dated 11 Dec, 2023 inferred from asset timestamps); GitHub API pushed_at 2024-12-04, not archived, 48 open issues. README calls the project 'still very young' and says pre-1.0 versions do not promise syntax/API stability or storage compatibility. Backends: in-memory, SQLite, RocksDB, Sled, TiKV; Windows .exe CLI builds exist in v0.7.6 releases; no Node/Python binary assets visible on the releases page.
    https://github.com/cozodb/cozo ; https://api.github.com/repos/cozodb/cozo ; https://github.com/cozodb/cozo/releases
- f5 (verified, primary_docs; engine/retrieval) CozoDB Datalog syntax: recursive rules take a base rule plus a self-referencing rule (reachable[x,y] := *edge{fr:x,to:y}; reachable[x,y] := reachable[x,z], *edge{fr:z,to:y}). Aggregation in recursion is allowed with restrictions; magic-set rewrites are applied only to rules without aggregation or recursion, so recursive rules may compute more than needed. Negation requires a closed world.
    https://docs.cozodb.org/en/latest/tutorial.html
- f6 [LOAD-BEARING] (verified, primary_docs; egress/ops_cost/engine) Neo4j Community Edition is GPL v3; the licensing page describes it as 'generally provided for free and internal, non-production use' (wording as relayed by the fetch summary). The operations-manual settings reference lists dbms.usage_report.enabled ('Usage data reporting') with default true; the page does not say what is sent or where. Neo4j runs on a JVM; heap is auto-sized unless set.
    https://neo4j.com/licensing/ ; https://neo4j.com/docs/operations-manual/current/configuration/configuration-settings/ (only first 100k of 200k chars read)
- f7 (verified, source_repo; access) Official neo4j/mcp server (Go, stdio) exposes get-schema, read-cypher, write-cypher, list-gds-procedures; NEO4J_MCP_READ_ONLY=true disables write-cypher; read-only enforcement relies on EXPLAIN/query-type classification with a caveat that misclassified custom procedures may bypass it; connects via bolt:// URI with username/password env vars. Licence file not read.
    https://github.com/neo4j/mcp
- f8 (verified, source_repo; engine/ops_cost) Memgraph Community is under the BSL (Licensed Work 'Memgraph Community Edition version 2.0'); production use allowed for an 'Authorised Purpose' (internal business use) with restrictions on distribution, DBaaS and competing products; change licence Apache 2.0 at the earlier of the change date (printed '2030-21-10', malformed) or 4th anniversary of a version's first public distribution. Enterprise (HA, multi-tenancy, fine-grained access control, SSO, encryption) is under the separate MEL licence.
    https://github.com/memgraph/memgraph ; https://github.com/memgraph/memgraph/blob/master/licenses/BSL.txt
- f9 [LOAD-BEARING] (verified, primary_docs; egress/ops_cost) Memgraph flag --telemetry-enabled defaults to true; docs say it collects CPU/memory info, database runtime data (vertex and edge counts, resource usage) and aggregated feature-usage statistics. Default storage mode IN_MEMORY_TRANSACTIONAL; --memory-limit 0 means 100% of physical RAM with swap, 90% without.
    https://memgraph.com/docs/database-management/configuration
- f10 (verified, source_repo; access) Memgraph has an MCP server (mcp-memgraph, pip install mcp-memgraph, 'database queries and schema tools') inside memgraph/ai-toolkit, repo licensed MIT; connection protocol and tool names not stated on the page.
    https://github.com/memgraph/ai-toolkit
- f11 (verified, source_repo; engine/access/egress) FalkorDB is licensed SSPLv1, builds as a Redis module (libfalkordb.so/.dylib, Rust) using GraphBLAS sparse matrices, speaks OpenCypher with proprietary extensions; build prerequisites cover macOS and Linux only. A separate FalkorDB-MCPServer (MIT, TypeScript, Node 18+) exposes query_graph, query_graph_readonly, list/delete graphs, schema tools. Telemetry not documented on the page read.
    https://github.com/FalkorDB/FalkorDB ; https://github.com/FalkorDB/FalkorDB-MCPServer
- f12 (verified, source_repo; engine/egress/ops_cost) Apache AGE: Apache-2.0, a PostgreSQL extension giving openCypher; supports Postgres 11-18; badge v1.8.0; README documents Linux/macOS builds only (links a YouTube Windows install video). Because it is a Postgres extension it adds no network telemetry of its own (inferred); variable-length edge support exists in AGE from my prior knowledge but was not on the page read.
    https://github.com/apache/age
- f13 (verified, primary_docs; engine/egress) SurrealDB core is BSL 1.1 with an Additional Use Grant; each version converts to Apache 2.0 no later than 4 years after release; offering it as a DBaaS to third parties needs a commercial agreement, self-hosting/internal use/embedding allowed. Observability export is opt-in (SURREAL_TELEMETRY_PROVIDER=otlp sends to an OpenTelemetry collector); whether it sends anonymous usage data by default was NOT established. Recursive graph paths use @.{n} syntax.
    https://surrealdb.com/license ; https://surrealdb.com/docs/surrealdb/models/graph ; web search on observability docs
- f14 (verified, source_repo; engine/ops_cost) Dgraph: Apache-2.0, described as a horizontally scalable distributed GraphQL database used in production at Fortune 500 companies; page says it is at v25. Designed for a workload orders of magnitude larger than hundreds of nodes. Telemetry not mentioned on the page.
    https://github.com/dgraph-io/dgraph
- f15 (verified, source_repo; engine) Soufflé: UPL-1.0 Datalog tool for static analysis (points-to, taint) that translates logic to parallel C++; also lists an efficient interpreter (PLDI'21); repo has MSVC CI badge, vcpkg.json and choco config (Windows build inferred); build is CMake-based. It is a batch analysis compiler, not a persistent store, has no server and no MCP surface.
    https://souffle-lang.github.io/index.html ; https://github.com/souffle-lang/souffle
- f16 [LOAD-BEARING] (verified, primary_docs; engine/retrieval/limits) SQLite recursive CTE semantics: UNION adds a row to the queue only if no identical row was added before (terminates on cycles, at the cost of keeping all prior rows); UNION ALL keeps repeats; without ORDER BY the queue is FIFO (breadth-first) but docs say not to rely on that; ORDER BY in the recursive select gives DFS/BFS; LIMIT is recommended as a safety. CTE/WITH introduced in 3.8.3 (2014-02-03 per release log); compound recursive selects since 3.34.0 (2020-12-01).
    https://www.sqlite.org/lang_with.html ; https://www.sqlite.org/releaselog/3_8_3.html
- f17 (verified, primary_docs; engine/limits) PostgreSQL 18 docs: recursive queries support UNION/UNION ALL, manual array-path cycle detection, and built-in CYCLE ... SET ... USING and SEARCH BREADTH/DEPTH FIRST clauses; a UNION-only guard fails when extra columns such as depth make each row distinct. CYCLE/SEARCH arrived in PG14 (my prior knowledge, not on page).
    https://www.postgresql.org/docs/current/queries-with.html (PostgreSQL 18.6 docs)
- f18 [LOAD-BEARING] (verified, primary_docs; engine) PostgreSQL SQL/PGQ (GRAPH_TABLE, CREATE PROPERTY GRAPH) was committed by Peter Eisentraut on 2026-03-16 for PG19 without variable-length path quantifiers, then reverted: a pgsql-committers post dated 2026-09-07 reverts 124 commits (124 files, 15,859 deletions) on master. The commit message gives no reason; the discussion thread was not read. A search summary says the revert hit REL_19_STABLE, which I did not confirm. Net: no native property-graph SQL in Postgres as of this date.
    https://www.postgresql.org/message-id/E1x3f62-00000003sxD-0vdk@gemulon.postgresql.org ; https://www.depesz.com/?p=4467
- f19 [LOAD-BEARING] (verified, local_file; engine/limits/retrieval) Local measurement, Python stdlib sqlite3 with SQLite 3.53.1, in-memory, 300 entries, 1500 supersedes + 1500 same_root_cause random edges (one dense component, avg degree ~10, a worst case for this workload), indexed on (rel,src) and (rel,dst). Q1 file join: 0.07 ms. Undirected component closure (UNION, single OR join): 63 ms; split into two UNIONed recursive arms: 78 ms. Supersedes closure with depth in the UNION key: 1090 ms; deduped by id only: 53 ms. Failed-attempts-in-component: 95 ms. Sparse graph (400 edges, realistic): 0.006 ms to 0.62 ms. Timings are rough (5-20 reps, one machine).
    C:/Users/User/AppData/Local/Temp/claude/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c/f3bbe503-2a20-4258-976b-7d457d3bf63a/scratchpad/cte_bench.py (and v2.py in the same folder)
- f20 (verified, primary_docs; engine/retrieval) Ladybug Cypher variable-length syntax: -[:L*min..max]->, default max 30 hops, default semantics WALK (nodes/rels may repeat, so use DISTINCT), TRAIL and ACYCLIC keywords, SHORTEST/ALL SHORTEST/WSHORTEST variants (lower bound forced to 1), inline predicates (r, n | WHERE ...).
    https://docs.ladybugdb.com/cypher/query-clauses/match/
- f21 (inferred, inferred; invalidation/retrieval/data_model) Query A (entries citing files changed in a commit; a join, no recursion). SQL (run, works): SELECT DISTINCT e.id FROM entry e JOIN entry_ref r ON r.entry_id=e.id WHERE e.status='active' AND r.kind='file' AND r.target IN (:changed...). Cypher (untested): MATCH (e:Entry)-[:CITES]->(t:Target) WHERE e.status='active' AND t.kind='file' AND t.path IN $changed RETURN DISTINCT e.id. Datalog (untested): ?[e] := *entry{id:e,status:'active'}, *cites{entry:e,kind:'file',target:t}, is_in(t,$changed). Same shape in all three; the graph engine adds nothing.
    Authored for this lane; SQL executed in scratchpad cte_bench.py (Q1); Cypher/Datalog syntax from f5 and f20 docs, not executed
- f22 (inferred, inferred; data_model/retrieval) Query B (entries sharing a root cause with entry :x, undirected transitive closure over same_root_cause edges). SQL (run): WITH RECURSIVE comp(id) AS (SELECT :x UNION SELECT g.dst FROM comp JOIN entry_edge g ON g.rel='same_root_cause' AND g.src=comp.id UNION SELECT g.src FROM comp JOIN entry_edge g ON g.rel='same_root_cause' AND g.dst=comp.id) SELECT id FROM comp. Cypher (untested): MATCH (a:Entry {id:$x})-[:SAME_ROOT_CAUSE* 1..30]-(b:Entry) RETURN DISTINCT b.id. Datalog (untested): comp[y] := y = $x; comp[y] := comp[z], *same{a:z,b:y}; comp[y] := comp[z], *same{a:y,b:z}; ?[y] := comp[y]. Cypher is shortest, but the SQL is 5 lines and exact; the Cypher variant needs an explicit hop cap and DISTINCT.
    Authored for this lane; SQL executed (v2.py Q2b)
- f23 [LOAD-BEARING] (inferred, inferred; data_model/provenance/retrieval) Query C (what entry :x superseded, transitively). SQL (run): WITH RECURSIVE sup(id) AS (SELECT dst FROM entry_edge WHERE rel='supersedes' AND src=:x UNION SELECT g.dst FROM sup JOIN entry_edge g ON g.rel='supersedes' AND g.src=sup.id) SELECT id FROM sup. Cypher (untested): MATCH (a:Entry {id:$x})-[:SUPERSEDES* 1..20]->(b:Entry) RETURN DISTINCT b.id. Datalog (untested): sup[y] := *supersedes{newer:$x,older:y}; sup[y] := sup[z], *supersedes{newer:z,older:y}; ?[y] := sup[y]. Pitfall: adding a depth column to the SQL recursive arm puts depth in the UNION key, defeats dedup and was 20x slower in the dense test (f19); compute depth in a separate pass or cap with WHERE depth<20 only on small graphs. Query D (failed approaches among entries in x's root-cause component) is Query B joined to attempt WHERE outcome='failed' in SQL (95 ms dense worst case) and a three-hop pattern ending in (:Attempt {outcome:'failed'}) in Cypher.
    Authored for this lane; SQL executed (v2.py Q3b, cte_bench.py Q3/Q4)
- f24 (verified, primary_docs; data_model/invalidation) SQLite json_each/json_tree are built in by default since 3.38.0 (2022-02-22) and can unnest a JSON array of file paths in a join, so an entry's cited paths could live in a JSON column; a normalized entry_ref(entry_id, kind, target) table with an index is still the better shape for the 'which entries cite changed files' lookup.
    https://www.sqlite.org/json1.html
- f25 (inferred, local_file; egress/engine) CLAUDE.md names Supabase as the managed Postgres host for the production FixFlow database. A knowledge store holding code and defect text must not be placed in that database or any other third-party-hosted service; Supabase is a third party, so it is excluded by the data-egress constraint even if Postgres is the chosen engine elsewhere.
    CLAUDE.md (project instructions, stack table row 'Database'); task constraints
- f26 [LOAD-BEARING] (inferred, inferred; data_model/canonicalisation) Design observation: the lineage relations in this store are shallow and typed. 'Shares a root cause' can be a root_cause_id foreign key (root cause as a row, entries assigned on write, merged on discovery), making Query B an equality join with no recursion. 'Supersedes' is a version chain (superseded_by column) walked by a short chain query. Only same-cluster merging needs a union-find step at write time. Recursion is needed only for rare closure queries over a few hundred rows.
    Reasoning from f19 and the lane's four queries
- f27 (inferred, inferred; invalidation/engine) A code-level dependency or call graph (symbol A calls symbol B, so an entry citing B is affected by a change to A) is the one workload where a graph engine would pay off, but it belongs to code analysis tooling, not this store. The store only needs entry-to-file/symbol/dependency-version citations with content hashes (a one-hop join), so event-driven invalidation does not require graph traversal.
    Reasoning from the invalidation framing in the task and Query A (f21)

## Open questions
- Why was PG19 SQL/PGQ reverted (the pgsql-hackers thread was not read), and is it targeted at PG20?
- What exactly does Neo4j's dbms.usage_report.enabled send, and where? The settings page is silent; the Community Edition applicability was not confirmed.
- Does LadybugDB send any telemetry, and does it ship Windows wheels or Node prebuilds for Node 24? Not verified.
- Does CozoDB's Node binding install on Node 24 for Windows without a build toolchain? No Node assets were visible on the releases page.
- Does SurrealDB or Dgraph send anonymous usage data by default? Not established from the pages read.
- Is the Memgraph change date '2030-21-10' a typo (the BSL file is malformed), and what is the true conversion date?
- The neo4j/mcp licence file was not read; confirm it before any use.
- Does any Ladybug or Cozo MCP server exist? A web search found none, but absence of results is weak evidence.

## URLs attempted
- https://github.com/kuzudb/kuzu
- https://github.com/cozodb/cozo
- https://api.github.com/repos/cozodb/cozo
- https://github.com/cozodb/cozo/releases
- https://docs.cozodb.org/en/latest/tutorial.html
- https://www.theregister.com/2025/10/14/kuzudb_abandoned/ (failed: getaddrinfo EAI_AGAIN)
- https://github.com/LadybugDB/ladybug
- https://github.com/LadybugDB/ladybug/releases
- https://docs.ladybugdb.com/cypher/query-clauses/match/
- https://www.sqlite.org/lang_with.html
- https://www.sqlite.org/releaselog/3_8_3.html
- https://www.sqlite.org/json1.html
- https://www.postgresql.org/docs/current/queries-with.html
- https://www.depesz.com/?p=4467
- https://www.postgresql.org/message-id/E1x3f62-00000003sxD-0vdk@gemulon.postgresql.org
- https://neo4j.com/licensing/
- https://neo4j.com/docs/operations-manual/current/configuration/neo4j-conf/
- https://neo4j.com/docs/operations-manual/current/configuration/configuration-settings/
- https://github.com/neo4j/mcp
- https://memgraph.com/docs/database-management/enterprise-features (404)
- https://memgraph.com/docs/database-management/configuration
- https://github.com/memgraph/memgraph
- https://github.com/memgraph/memgraph/blob/master/licenses/BSL.txt
- https://github.com/memgraph/ai-toolkit
- https://github.com/FalkorDB/FalkorDB
- https://github.com/FalkorDB/FalkorDB-MCPServer
- https://github.com/apache/age
- https://surrealdb.com/license
- https://surrealdb.com/docs/surrealdb/models/graph
- https://surrealdb.com/docs/surrealdb/security/telemetry (page had no telemetry content)
- https://github.com/dgraph-io/dgraph
- https://souffle-lang.github.io/index.html
- https://github.com/souffle-lang/souffle
- web searches: Kuzu archived/Apple/fork; PG19 SQL/PGQ committed; PG19 SQL/PGQ reverted; SurrealDB telemetry; LadybugDB MCP

## Anomalies
- WebFetch answers come from a small summarising model, so quotes and details (for example the Neo4j 'non-production' wording and Cozo release years) are second-hand renderings of the page, not raw text. Cozo release years in particular are inferred from asset timestamps; the API pushed_at date (2024-12-04) is direct.
- theregister.com fetch failed with a DNS error (EAI_AGAIN); the Kuzu abandonment and Apple acquisition claims rest on search-result summaries only.
- memgraph.com enterprise-features URL returned 404.
- The depesz page fetch returned an 'Important update: this change has been rolled back' note; I confirmed the revert from the PostgreSQL mailing-list message (2026-09-07). The search summary that the revert reached REL_19_STABLE was not confirmed; the message I read says branch master.
- Memgraph BSL file prints Change Date '2030-21-10' (invalid month).
- The Neo4j settings reference page is about 200k characters and only the first 100k were read; other telemetry-related settings may exist beyond that.
- The first benchmark run (200 repetitions) hung past the tool timeout; I killed it with taskkill on python.exe (the tool reported only PID 12004 terminated) and reran with fewer repetitions. Timings are therefore rough (5-50 reps on one machine, not a rigorous benchmark).
- I ran an in-memory SQLite benchmark with the existing Python 3.12 interpreter (python -I, in-memory database, script in the scratchpad). Nothing was installed and no repository files were written; no git writes.
