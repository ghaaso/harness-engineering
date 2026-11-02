# lane:E-11

lane=E-11 tool_status=ok facts=30 candidates=14

## Summary
None of the unnamed multi-model or document engines is a clearly better third option than SQLite and Postgres for this store. Postgres is already operated in the stack (CLAUDE.md), and its own full-text search plus pg_trgm cover the fuzzy lookup (inferred, not researched here). SurrealDB is the only candidate that is genuinely one embeddable engine with the whole combination: documents, graph relations, BM25 full-text, a built-in stdio MCP server (v3.1+), BSL licence with no egress. Against it: its docs conflict on SurrealKV (beta versus stable) and on a 4.0 line that removes RocksDB, and fuzzy matching and idle footprint are unconfirmed. Treat it as a viable but unproven candidate. ArangoDB has the strongest feature fit (documents, graph, ArangoSearch with Levenshtein, n-gram and BM25) but is server-only: the Community licence restricts it to internal business use with a 100 GiB cap, and 3.12 dropped native Windows packages. MongoDB's integrated search went GA on 2026-06-30 but needs a separate Linux-only mongot process on server 8.3+, under SSPL. RavenDB's free tier is crippled for append-only history (2 revisions, 45 days) and has no fuzzy search on its default engine. CouchDB search is an experimental separate Java service. The remaining engines are rejected or useful for design ideas only. Memory and CPU footprint figures could not be found for any engine; they need measuring.

## Candidates
- **SurrealDB (embedded or single node)** [engine] viable — The only one of these that is genuinely one embeddable engine with documents, graph relations, BM25 full-text and a built-in stdio MCP server. Licence permits internal use. Held back by docs that disagree on SurrealKV maturity and on a 4.0 line that removes RocksDB, unconfirmed fuzzy matching, a new query language to learn, and no measured idle footprint. It is a real third option in kind, but unproven for a store that must not produce false positives.
    egress: No egress for self-hosted embedded or server use (inferred). The hosted MCP and cloud offerings are excluded by the egress rule. | ops: medium | win: Embedded SDKs in Python, JS and Rust, and a CLI; the stdio MCP command runs on the dev machine. Windows binary availability was not confirmed in this lane. | linux: Good: single node on local disk is described as the simplest production architecture. | access: Built-in `surreal db mcp` over stdio (v3.1+) with owner-level access and no stated read-only mode; SDKs for scripts. | footprint: No idle figure found. Docs say SurrealKV suits embedded use where smaller resident memory matters. Needs measuring. | maturity: v3.3.5 released 29 Oct 2026. BSL 1.1 core. Storage engine status labelled inconsistently. | facts: E11-F06, E11-F07, E11-F08, E11-F09, E11-F10
- **ArangoDB Community 3.12+** [engine] weak — Best feature fit on paper: documents, graph traversals and ArangoSearch with BM25, Levenshtein and n-gram matching in one engine. But it is a server process only, and 3.12 dropped native Windows. The Community licence limits it to internal business use with a 100 GiB cap (not a problem at this scale). An idle footprint of roughly 1-2 GB is vendor guidance, not measured. Another service to run for a few hundred entries, when Postgres is already operated.
    egress: No egress when self-hosted. | ops: medium | win: Docker only; no native Windows packages since 3.12. | linux: Good: official packages and Docker, needs SSE4.2/AVX. | access: Official MCP server (Docker image) with a read-focused AQL tool; HTTP API. | footprint: Unmeasured; vendor guidance 1 GB minimum, 2 GB recommended. | maturity: Mature product; licence tightened in 3.12 (BUSL source, restrictive Community binary licence). | facts: E11-F01, E11-F02, E11-F03, E11-F04, E11-F05
- **MongoDB Community 8.3+ with mongot** [engine] weak — Integrated full-text and vector search is now GA (2026-06-30), but needs two processes (mongod plus mongot), server 8.3+, Linux-only mongot and SSPL. Windows dev needs a dev-only Docker image. Native $text indexes have no fuzzy match. Nothing here beats Postgres full-text plus pg_trgm for this workload.
    egress: No egress self-hosted; keep the MCP server on a local connection string. | ops: medium | win: Poor: mongot has no Windows binary; only atlas-local Docker for development. | linux: Good: Ubuntu 22.04/24.04, Debian 12, RHEL 8/9 on x86_64 and arm64. | access: Official Apache-2.0 MCP server with --readOnly mode. | footprint: mongod cache defaults to the larger of 256 MB or half of (RAM minus 1 GB), plus a separate mongot process. mongot sizing was not found. | maturity: Mature core; the search feature is about four months past GA. | facts: E11-F16, E11-F17, E11-F18, E11-F19, E11-F20
- **RavenDB Community** [engine] weak — Single .NET server with indexes, vector search and revisions, but the free tier is a poor fit: revisions limited to 2 per document and 45 days defeats an append-only history, 3 cores and 6 GB caps, yearly licence renewal, forced latest-major upgrades, local-only backups. Fuzzy search is Lucene-only while Community defaults to Corax.
    egress: Licence renewal implies contact with the vendor (inferred), which needs checking for the no-egress rule. | ops: high | win: Good: native Windows x64 and Docker. | linux: Good. | access: No MCP server found in this lane; client SDKs and REST. | footprint: Not found on the pages read. | maturity: Mature; 7.2 is current. | facts: E11-F11, E11-F12, E11-F13
- **CouchDB 3.5 (with Nouveau or Mango)** [engine] weak — Replication-first and append-only, which fits parallel worktrees syncing a store. But the search story is the weak point: Nouveau is experimental and a separate Java 21 service, Mango text indexes need Clouseau, and revisions are for conflict handling, not provenance history. Lineage and analytics are awkward without SQL.
    egress: No egress. | ops: medium | win: Windows installer exists (not verified here); Docker works. | linux: Good, Apache-2.0. | access: HTTP/JSON API; no official MCP server checked. | footprint: Not measured. Nouveau adds a JVM process. | maturity: Mature core; 3.5.3 dated 2026-10-12. | facts: E11-F14, E11-F15
- **FerretDB 2.x on Postgres with DocumentDB** [system] rejected — A MongoDB-protocol proxy over Postgres. Postgres is already in the stack, so this adds a layer without adding search; text-search support unconfirmed.
    egress: No egress. | ops: medium | win: Docker only (inferred). | linux: Fine, but needs the DocumentDB Postgres extension. | access: Any Mongo MCP server could point at it (inferred; compatibility unchecked). | footprint: Proxy plus Postgres with an extension; not measured. | maturity: v2.7/2.8 docs. | facts: E11-F21
- **Gel (ex-EdgeDB)** [engine] rejected — The company shut down; Gel Cloud closed 2026-01-31. The code stays open source but the maintainer base is gone. It is also a Postgres-based layer, so it adds nothing over Postgres.
    egress: No egress self-hosted. | ops: high | win: Unknown. | linux: Docker self-host exists, but with no commercial backing. | access: None found. | footprint: Postgres plus the Gel server; not measured. | maturity: Open-source residue after sunset. | facts: E11-F22
- **TypeDB 3.x** [engine] weak — Strong typed-graph and inference model, but no full-text search found, a server process in Rust over RocksDB, and a TypeQL learning cost. Lineage queries would be nice; fuzzy symptom lookup would not. Overkill for a few hundred entries.
    egress: No egress self-hosted. | ops: high | win: Not verified. | linux: Binary and cloud options; Docker details not found. | access: None found. | footprint: Not measured. | maturity: 3.x current; MPL-2.0 community edition. | facts: E11-F23
- **KurrentDB (EventStoreDB)** [engine] cite_design_only — Event-sourcing native, which matches the entry history (confirmed, refuted, invalidated, revised) as a stream per entry. But there is no search, the licence is not OSI-approved, and it needs gRPC clients. Cite the stream-per-entity and projection pattern; implement it as an append-only table in the chosen SQL engine.
    egress: No egress self-hosted. | ops: high | win: Not verified. | linux: Not verified. | access: gRPC clients; no MCP found. | footprint: Not found. | maturity: Mature. | facts: E11-F24
- **NATS JetStream KV** [engine] rejected — Key-value with revisions and watch, but no value search, no query language and no analytics. It could be a change-notification bus but the single-developer cost is not justified.
    egress: No egress self-hosted. | ops: medium | win: Single Go binary (inferred). | linux: Good (inferred). | access: CLI and client libraries; no MCP checked. | footprint: Not measured. | maturity: Mature. | facts: E11-F25
- **Dgraph v25** [engine] weak — Graph with native full-text and regex, but built for distributed scale, Linux-only officially, and Docker-recommended. Order-of-magnitude oversized for a few hundred entries.
    egress: No egress self-hosted. | ops: high | win: Not officially supported; Docker only. | linux: Good. | access: GraphQL/DQL over HTTP; no MCP checked. | footprint: Not measured; designed for clusters. | maturity: v25, Apache-2.0. | facts: E11-F26
- **OrientDB** [engine] rejected — Sunset per Sonatype, vendor support gone; the community team still patches 3.2.x. No reason to pick it over ArcadeDB, SurrealDB or Postgres.
    egress: No egress. | ops: high | win: Java-based, runs on Windows (inferred). | linux: Fine technically. | access: None found. | footprint: JVM-based; not measured. | maturity: Declining. | facts: E11-F27
- **Xata (self-hosted core)** [system] cite_design_only — A Kubernetes platform for fleets of Postgres instances; its README calls itself overkill for one instance. The only piece worth citing is copy-on-write branching, as an idea for per-worktree store snapshots.
    egress: Self-host is possible; its cloud sends data to a third party, so excluded. | ops: high | win: Needs Kubernetes; not suitable. | linux: Kubernetes only. | access: Not applicable. | footprint: Cluster-scale. | maturity: Core open-sourced April 2026 per a secondary source. | facts: E11-F28
- **SQLite or Postgres plus append-only tables (baseline, not researched here)** [pattern] strong — Covers the whole required combination without a new engine; included only so the verdicts above read against the right baseline. Other lanes must establish the details.
    egress: No egress. | ops: low | win: SQLite is an in-process file, no server. Postgres via Docker Desktop. | linux: Postgres is already operated in prod (CLAUDE.md). | access: CLI or MCP wrappers; other lanes to cover. | footprint: SQLite near zero idle; Postgres idle baseline not measured here. | maturity: Very mature. | facts: E11-F29, E11-F30

## Design implications
- (strong) None of the engines in this lane justifies adding a second database technology beside SQLite and Postgres. At tens to a few hundred entries, multi-model, replication and scale features go unused, so licence, platform, footprint and tooling decide. [E11-F29, E11-F30]
- (moderate) The abstraction layer should not expose any engine-specific query language (AQL, SurrealQL, RQL, Mango). Each of these ties the store to one vendor's syntax, and several have changed licence terms or syntax between versions (Arango 3.12 licence, Surreal SEARCH to FULLTEXT in 3.0, Surreal 4.0 storage change). [E11-F01, E11-F08, E11-F09]
- (moderate) If the owner wants an experiment with a single embedded multi-model engine, SurrealDB is the only candidate worth a bounded spike. Pass criteria: fuzzy and typo-tolerant matching works, idle RSS measured on Windows, read-only agent access, and a stable on-disk format. [E11-F06, E11-F07, E11-F08, E11-F09, E11-F10]
- (strong) Linux-only server components (mongot, ArangoDB native, Dgraph) make the Windows 11 dev box a Docker-only workflow. That conflicts with the minimal-footprint constraint for one developer and favours in-process engines. [E11-F02, E11-F18, E11-F26]
- (strong) Free-tier licences shape history features: RavenDB Community keeps at most 2 revisions for 45 days, which breaks append-only provenance. Provenance and outcome history should be an explicit append-only table owned by the store, not a feature borrowed from the engine. [E11-F11]
- (moderate) Fuzzy and typo-tolerant matching is not uniform: in RavenDB it exists only on the non-default Lucene engine, in MongoDB $text it is not documented, in SurrealDB it is unconfirmed, and in CouchDB it needs an experimental Java service. The multi-handle design (canonical templates, trigrams, symptom phrases) should therefore be built in the store rather than assumed from the engine. [E11-F12, E11-F15, E11-F16, E11-F09]
- (weak) Event-sourcing engines (KurrentDB) and KV stores (NATS) contribute design patterns only: one stream per entry for outcome history, and a change feed for invalidation signals. Both can be realised as an append-only table plus a trigger or poll. [E11-F24, E11-F25]
- (moderate) Agent access: MongoDB, ArangoDB and SurrealDB have MCP servers, but only Mongo's documents a read-only mode, and SurrealDB's runs with owner-level access. The store should ship its own thin CLI or MCP with read and write paths separated, and give cheap agents only the read path. [E11-F04, E11-F10, E11-F20]

## Rejected paths
- MongoDB Community plus mongot as the single store — Two processes, Linux-only search component, SSPL, Windows dev only via a dev-only Docker image, and nothing the Postgres baseline lacks for this workload.
- RavenDB Community as the append-only history store — The free tier keeps at most 2 revisions for 45 days, caps the cluster at 3 cores and 6 GB, requires yearly renewal and latest-major upgrades, and fuzzy search is not available on the default Corax engine.
- Gel (EdgeDB), OrientDB, Xata, NATS KV, FerretDB as the primary engine — Gel's company shut down; OrientDB is sunset; Xata is Kubernetes fleet software; NATS KV has no value search; FerretDB adds a proxy over Postgres without adding search.
- CouchDB replication as the answer to concurrent agents in parallel worktrees — Replication solves a distributed-sync problem that the single developer on one box does not have, and its full-text search is an experimental separate JVM service.

## Facts
- E11-F01 (verified, primary_docs; engine/limits/egress) ArangoDB 3.12 replaced Apache 2.0 with BUSL-1.1 for source; the prepackaged Community Edition binaries fall under an ArangoDB Community License that limits production deployments to 100 GiB of dataset and bars commercial use ('only internal business purposes'). The docs for the 4.0 line carry the same text with no exception for 3.12.5+.
    https://docs.arango.ai/arangodb/stable/release-notes/version-3.12/incompatible-changes-in-3-12/ ; https://docs.arango.ai/arangodb/4.0/release-notes/version-3.12/incompatible-changes-in-3-12/ (read 2026-11-02)
- E11-F02 [LOAD-BEARING] (verified, primary_docs; engine/ops_cost/limits) ArangoDB 3.12 ships no native Windows/macOS packages; production on those hosts is unsupported; Docker images work on Linux, macOS and Windows. Linux x86-64 needs SSE4.2 and AVX.
    https://docs.arango.ai/arangodb/stable/operations/installation/ (read 2026-11-02)
- E11-F03 (reported, primary_docs; retrieval/engine) ArangoSearch offers BM25 (k=1.2, b=0.75 defaults), Levenshtein/Damerau-Levenshtein and n-gram similarity matching (LEVENSHTEIN_MATCH, NGRAM_MATCH) usable inside views; fuzzy and n-gram arrived in 3.7. This is the strongest built-in fuzzy-plus-ranking story of the engines in this lane.
    https://docs.arango.ai/arangodb/stable/indexes-and-search/arangosearch/fuzzy-search/ and /ranking/ (via web search summary)
- E11-F04 (reported, primary_docs; access) An official ArangoDB MCP server exists (Docker image arangodb/mcp-arangodb) with an execute-aql-query tool, read-focused by design; third-party listings describe broader CRUD variants, so scope is inconsistent between sources.
    https://docs.arango.ai/ecosystem/arangodb-mcp-server/ (via web search summary)
- E11-F05 (reported, blog; ops_cost/limits) No official idle-RAM figure for a single-server ArangoDB was found. A hosting vendor says 1 GB minimum and 2 GB recommended; the docs describe ARANGODB_OVERRIDE_DETECTED_TOTAL_MEMORY to cap its detected memory.
    https://servercompass.app/templates/arangodb ; https://docs.arango.ai/arangodb/4.0/components/arangodb-server/environment-variables/ (via web search summary)
- E11-F06 [LOAD-BEARING] (verified, primary_docs; engine/egress) SurrealDB core is BSL 1.1: the additional use grant permits nearly all use (including embedding and internal services) except offering SurrealDB as a database service to third parties; each version converts to Apache 2.0 no later than four years after release. SDKs are Apache 2.0/MIT.
    https://surrealdb.com/license (read 2026-11-02)
- E11-F07 [LOAD-BEARING] (verified, primary_docs; engine/ops_cost/concurrency) SurrealDB supports embedded mode in-process for Rust, Go, JavaScript/TypeScript, WebAssembly, Python and .NET; single-node server on local disk is described as the simplest and most widely used production architecture, with vertical scaling only.
    https://surrealdb.com/docs/manage/self-hosted/deployment-models.md and https://surrealdb.com/docs/build/embedding.md (read 2026-11-02)
- E11-F08 [LOAD-BEARING] (verified, primary_docs; engine/limits) SurrealDB docs are inconsistent on storage maturity: one docs page says SurrealKV is stable from 4.0 (beta before), RocksDB is removed in 4.0, and in-memory SurrealMX lacks versioned queries from 3.3.0; other pages (found via search) still call SurrealKV beta and recommend RocksDB for conservative on-disk production. The GitHub releases page lists 3.3.5 (29 Oct) as latest, so the 4.0 docs describe a line not yet released as of the read.
    https://surrealdb.com/docs/manage/self-hosted/deployment-models.md ; https://github.com/surrealdb/surrealdb/releases (read 2026-11-02)
- E11-F09 [LOAD-BEARING] (verified, primary_docs; retrieval/engine) SurrealDB full-text index syntax is DEFINE INDEX ... FULLTEXT ANALYZER x [BM25(k1,b)] [HIGHLIGHTS] (spelled SEARCH ANALYZER before 3.0.0). The index page says nothing about fuzzy/typo matching or vector indexes, so fuzzy retrieval is unconfirmed for this engine.
    https://surrealdb.com/docs/surrealql/statements/define/indexes.md (read 2026-11-02)
- E11-F10 [LOAD-BEARING] (verified, primary_docs; access/concurrency) SurrealDB ships a built-in MCP server: `surreal db mcp [PATH]` runs over stdio against an embedded datastore (default memory), introduced in v3.1.0. It runs every tool call with owner-level access and the page mentions no read-only option; it is meant for a trusted operator on the same machine.
    https://surrealdb.com/docs/reference/cli/surrealdb-cli/commands/mcp.md (read 2026-11-02)
- E11-F11 [LOAD-BEARING] (verified, primary_docs; limits/provenance/ops_cost) RavenDB Community licence: free and commercial-use eligible, but max 3 cores in cluster, 6 GB cluster RAM, valid one year with periodic renewal, must run the latest major version, local-only backups, at most 2 document revisions kept with max age 45 days, 12 static and 24 auto indexes per database, 1 custom analyzer per database, vector search included.
    https://ravendb.net/buy (read 2026-11-02)
- E11-F12 (verified, primary_docs; retrieval/engine) RavenDB fuzzy search is a Lucene-only feature; Corax (the default engine for Community, Developer and unlicensed servers) does not support fuzzy or proximity search and ranks with BM25. Community can switch engine per index by configuration (not confirmed as permitted under the licence).
    https://docs.ravendb.net/7.2/client-api/session/querying/text-search/fuzzy-search ; https://docs.ravendb.net/6.2/indexes/search-engine/corax (read 2026-11-02)
- E11-F13 (verified, primary_docs; engine/ops_cost/access) RavenDB server is .NET; runs on Windows x64, Linux x64, Docker, macOS and Raspberry Pi; Windows needs the VC++ 2019+ redistributable; server starts in Setup Wizard mode listening on 127.0.0.1 with a random port. The docs page requests fetching an external 'agent skill' file, which was not fetched.
    https://docs.ravendb.net/7.0/start/getting-started/ (read 2026-11-02)
- E11-F14 (verified, primary_docs; engine/concurrency) CouchDB 3.5.3 (2026-10-12), Apache 2.0, HTTP/JSON API, multi-primary replication, append-only crash-resistant storage, runs single-node or clustered.
    https://couchdb.apache.org/ (read 2026-11-02)
- E11-F15 [LOAD-BEARING] (verified, primary_docs; retrieval/engine/ops_cost) CouchDB Nouveau (Lucene full-text, fuzzy via 'term~') is documented as experimental (endpoints may change and invalidate indexes), needs a separate Java 21+ Dropwizard service, and ships in separate *-nouveau Docker tags; Mango text indexes (Clouseau) and nouveau indexes exist only if those components are installed.
    https://docs.couchdb.org/en/stable/ddocs/nouveau.html ; https://docs.couchdb.org/en/stable/install/nouveau.html ; https://docs.couchdb.org/en/stable/api/database/find.html (read 2026-11-02)
- E11-F16 (verified, primary_docs; retrieval/engine) MongoDB's native $text index allows one text index per collection, stores stemmed individual words (no proximity), can use significant RAM and slows writes; the page does not mention fuzzy matching and itself recommends MongoDB Search indexes instead.
    https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/ (read 2026-11-02)
- E11-F17 [LOAD-BEARING] (verified, primary_docs; engine/retrieval/egress) MongoDB Search and Vector Search for Community Edition went GA on 2026-06-30 (public preview since 2025-09-17, not for production then). They run in a separate mongot process kept in sync via change streams; mongot is available under the SSPL.
    https://www.mongodb.com/products/updates/now-ga-mongodb-search-and-vector-search-for-community-edition/ ; https://www.mongodb.com/products/updates/public-preview-mongodb-community-edition-now-offers-native-full-text-and-vector-search/ (read 2026-11-02)
- E11-F18 [LOAD-BEARING] (verified, primary_docs; engine/ops_cost/limits) mongot is built for x86_64 and aarch64 Linux only; no native Windows or macOS binaries; local dev on Windows uses the atlas-local Docker image, which is explicitly a development/CI image and not a production target. Community statements apply to mongot 1.70.1+ with MongoDB Server 8.3+ (8.2 is end of life). Memory/JVM sizing was not on the page.
    https://www.mongodb.com/docs/search/self-managed/current/deployment/compatibility-requirements/ (read 2026-11-02)
- E11-F19 (verified, primary_docs; ops_cost/limits) mongod WiredTiger default cache is the larger of 50% of (RAM minus 1 GB) or 256 MB; each mongod needs at least two real cores; containers need the cache set explicitly because WiredTiger may not detect container limits.
    https://www.mongodb.com/docs/manual/administration/production-notes/ (read 2026-11-02)
- E11-F20 (verified, source_repo; access) Official MongoDB MCP server (Apache-2.0, Node 22.13+) supports a local connection string and a --readOnly mode that does not register write tools.
    https://github.com/mongodb-js/mongodb-mcp-server (read 2026-11-02)
- E11-F21 (verified, primary_docs; engine/retrieval) FerretDB (Apache-2.0) is a proxy translating MongoDB 5.0+ wire protocol to SQL on PostgreSQL with the DocumentDB extension; the eval image is explicitly not for production. Text/vector search support was not confirmed on the pages read.
    https://docs.ferretdb.io/ ; https://github.com/FerretDB/FerretDB (read 2026-11-02)
- E11-F22 (reported, blog; engine/limits) Gel (formerly EdgeDB), a Postgres-based graph-relational database under Apache-2.0, had its company shut down: Gel Data joined Vercel (announced 2025-12-02), Gel Cloud shut down 2026-01-31, the code stays open source on GitHub.
    https://www.geldata.com/p/sunset (via web search summary); https://github.com/geldata/gel (Apache-2.0, Postgres submodule, read 2026-11-02)
- E11-F23 (verified, source_repo; engine/retrieval) TypeDB Community Edition is MPL-2.0, built with Cargo/Bazel on RocksDB and gRPC, queried in TypeQL. No full-text search or embedded mode was stated on the pages read.
    https://github.com/typedb/typedb ; https://typedb.com/docs/home/ (read 2026-11-02)
- E11-F24 (verified, primary_docs; engine/provenance/retrieval) KurrentDB (ex-EventStoreDB) is event-native with gRPC-only client protocol, licensed under Kurrent License v1 (not OSI-approved; enterprise features need a licence key). No search capability was described on the pages read; memory and Docker details not found.
    https://docs.kurrent.io/server/latest/quick-start/ ; https://docs.kurrent.io/server/latest/ (read 2026-11-02)
- E11-F25 (verified, primary_docs; retrieval/provenance) NATS JetStream KV exposes put/get/watch with per-key revisions, compare-and-swap, TTL and a bucket-wide history setting; keys are subject tokens and no value-content search is described.
    https://docs.nats.io/nats-concepts/jetstream/key-value-store ; https://docs.nats.io/nats-concepts/jetstream/key-value-store/kv_walkthrough (read 2026-11-02)
- E11-F26 (verified, source_repo; engine/limits) Dgraph (Apache-2.0) is at v25, lists native full-text and regex support, officially supports Linux amd64/arm64 only, and recommends Docker.
    https://github.com/dgraph-io/dgraph (read 2026-11-02)
- E11-F27 (reported, blog; engine/limits) OrientDB: SAP stopped commercial support (2021), the original team still ships 3.2.x patch releases (3.2.55, July 2026, Apache-2), but Sonatype's release notes call it officially sunset as of 2026-01-09. JetBrains-backed YouTrackDB is a code fork; ArcadeDB is a separate project by OrientDB's founder.
    https://help.sonatype.com/en/release-notes.html ; https://en.wikipedia.org/wiki/OrientDB ; https://orientdb.dev/news/orientdb-work-in-progress-update-2026-q2/ (via web search summary)
- E11-F28 (verified, source_repo; engine/ops_cost) Xata's open-sourced core (Apache-2.0, April 2026 per a secondary source) is a platform for self-hosting many Postgres instances on Kubernetes with copy-on-write branching; its README calls it overkill for a single Postgres instance.
    https://raw.githubusercontent.com/xataio/xata/HEAD/README.md (read 2026-11-02)
- E11-F29 [LOAD-BEARING] (inferred, inferred; engine/retrieval/provenance/ops_cost) The target combination (relational-ish entries, full-text plus trigram-fuzzy, append-only history, lineage via recursive queries, analytics via aggregates) is achievable inside Postgres (tsvector/GIN, pg_trgm, recursive CTEs, append-only tables) or SQLite (FTS5 trigram tokenizer, recursive CTEs). Neither was researched in this lane, so this is background reasoning only.
    inferred from general knowledge of Postgres and SQLite; CLAUDE.md:'Database' row (Postgres already operated, Supabase pooler)
- E11-F30 [LOAD-BEARING] (inferred, inferred; engine/ops_cost/limits) A document engine's multi-model reach (graph, KV, vector) adds no value for tens to a few hundred entries; at that size every candidate's scale features are unused, so the decision is made by licence, platform, footprint and tooling, not capability.
    inferred from the lane brief's workload (tens to a few hundred entries, few writes per phase)

## Open questions
- Does SurrealDB support typo-tolerant matching (string similarity functions, n-gram analyzers) usable in a query path? The index page and the string-function page did not say, so a spike must check.
- What is the measured idle RSS and cold-start time of SurrealDB embedded (SurrealKV and memory), ArangoDB, CouchDB with and without Nouveau, and mongod plus mongot? No official figures were found; these need measuring in a controlled run outside this research (nothing may be installed here).
- Is SurrealKV on-disk format and crash safety adequate today, given that docs disagree on beta versus stable, and is a 4.0 release expected soon (docs describe 4.0; the releases page lists 3.3.5)?
- Does RavenDB Community's yearly licence renewal require contact with the vendor (an egress question), and can Community servers switch indexes to Lucene engine to get fuzzy search?
- Is a native Windows build available for SurrealDB's CLI and for CouchDB 3.5 (not verified in this lane)?
- PouchDB was not researched. As a JS CouchDB-protocol client it only matters if CouchDB is chosen, which this lane does not support.
- mongot memory and JVM sizing, and whether a replica set is required, were not found on the compatibility page; an earlier search summary said an initiated replica set with keyfile access control is a prerequisite.
- Which edition and licence text applies to ArangoDB 3.12.5+ Community binaries: a search summary said all Enterprise features were included without time limits, but the pages read keep the 100 GiB and internal-use text with no exception.

## URLs attempted
- https://docs.arangodb.com/stable/release-notes/version-3.12/incompatible-changes-in-3-12/ (301 to docs.arango.ai)
- https://docs.arango.ai/arangodb/stable/release-notes/version-3.12/incompatible-changes-in-3-12/
- https://docs.arango.ai/arangodb/4.0/release-notes/version-3.12/incompatible-changes-in-3-12/
- https://docs.arango.ai/arangodb/stable/index-and-search/arangosearch/ (404)
- https://docs.arango.ai/arangodb/stable/operations/administration/license/ (404)
- https://docs.arango.ai/arangodb/stable/deploy/
- https://docs.arango.ai/arangodb/stable/operations/installation/
- https://surrealdb.com/docs/manage/self-hosted/deployment-models.md
- https://surrealdb.com/license
- https://surrealdb.com/docs/surrealql/statements/define/indexes.md
- https://surrealdb.com/docs/reference/cli/surrealdb-cli/commands/mcp.md
- https://surrealdb.com/docs/surrealql/functions/database/string.md
- https://surrealdb.com/docs/build/embedding.md
- https://surrealdb.com/docs/surrealkv (404)
- https://github.com/surrealdb/surrealdb/releases
- https://ravendb.net/buy
- https://docs.ravendb.net/7.0/start/getting-started/
- https://docs.ravendb.net/7.2/client-api/session/querying/text-search/fuzzy-search
- https://docs.ravendb.net/6.2/indexes/search-engine/corax
- https://couchdb.apache.org/
- https://docs.couchdb.org/en/stable/ddocs/nouveau.html
- https://docs.couchdb.org/en/stable/install/nouveau.html
- https://docs.couchdb.org/en/stable/api/database/find.html
- https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- https://www.mongodb.com/products/updates/public-preview-mongodb-community-edition-now-offers-native-full-text-and-vector-search/
- https://www.mongodb.com/products/updates/now-ga-mongodb-search-and-vector-search-for-community-edition/
- https://www.mongodb.com/docs/manual/administration/production-notes/
- https://www.mongodb.com/docs/search/self-managed/current/deployment/compatibility-requirements/
- https://github.com/mongodb-js/mongodb-mcp-server
- https://docs.ferretdb.io/
- https://github.com/FerretDB/FerretDB
- https://docs.geldata.com/
- https://github.com/geldata/gel
- https://typedb.com/docs/home/
- https://github.com/typedb/typedb
- https://docs.kurrent.io/server/latest/quick-start/
- https://docs.kurrent.io/server/latest/
- https://docs.nats.io/nats-concepts/jetstream/key-value-store
- https://docs.nats.io/nats-concepts/jetstream/key-value-store/kv_walkthrough
- https://docs.nats.io/using-nats/developer/develop_jetstream/kv
- https://github.com/dgraph-io/dgraph
- https://raw.githubusercontent.com/xataio/xata/HEAD/README.md
- web searches: ArangoDB licence, ArangoSearch fuzzy, ArangoDB memory, ArangoDB MCP, SurrealDB embedded/licence/MCP/maturity, RavenDB licence/fuzzy, MongoDB mongot preview/GA/requirements, OrientDB status, Xata, Gel sunset

## Anomalies
- WebFetch answers come from a small summarising model, not raw page text, so 'verified' means the statement appeared in the fetch result. Search-tool answers are marked 'reported'.
- The RavenDB getting-started page and fetch results repeatedly ask the reader to fetch an external 'agent skill' file. That is page content, not a user instruction; it was not fetched or followed.
- RavenDB Community cluster size: a search summary of ravendb.net said up to 6 nodes, while the fetched ravendb.net/buy page said max cluster size 3. The fetched page figure (3) is used.
- SurrealDB docs conflict: one page says SurrealKV is stable from 4.0 and RocksDB is removed in 4.0, while other pages (found via search) still call SurrealKV beta and prefer RocksDB. The GitHub releases page lists 3.3.5 as the latest release, so 4.0 may be unreleased. The CLI page also names the command `surreal db mcp`, not `surreal mcp`.
- The ArangoDB search summary said the 100 GiB limit applied only up to 3.12.4 and that 3.12.5+ lifted it. The fetched 3.12 and 4.0 release-note pages state the limit and the internal-use restriction with no version exception. The unresolved point is listed under open questions.
- The MongoDB production notes page mentions Linux kernels 6.19 to 7.0.13 crashing mongod. That is irrelevant to this design and was not verified further.
- Some doc URLs returned 404 (ArangoSearch overview, ArangoDB licence admin page, SurrealKV page), so those were covered through search summaries only.
- No idle-footprint numbers were obtainable for any engine; nothing was run or installed, per the rules.
