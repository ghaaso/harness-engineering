# lane:E-06

lane=E-06 tool_status=ok facts=22 candidates=11

## Summary
None of the engines in this lane is a good primary store for this workload, and none is needed. The workload is tens to a few hundred entries, a few writes per phase, fuzzy lookup by symptom, and a per-entry outcome history. That is roughly 5 to 7 orders of magnitude below what Cassandra, ScyllaDB, Dragonfly and Redis cluster are built for.

Cassandra and ScyllaDB are rejected. Cassandra wants at least 8 GB RAM and 2 cores per production node. It has no joins, a query-first model, an SAI index that is explicitly "not a replacement for text-based search", and no native Windows support since 4.0. ScyllaDB is Linux-only and source-available since 2025.1, and telemetry may be required.

Redis 8 is the only candidate with real in-engine fuzzy text: BM25 ranking, Snowball stemming, Levenshtein fuzzy matching up to distance 3, plus vectors. It is back under AGPLv3 as of 2025-05-01. It keeps the dataset in RAM, has no native Windows build (Docker, WSL2 or Memurai instead), and adds a daemon to run. Valkey is BSD-licensed but its full-text search only arrived in valkey-search 1.2 (2026-03), with Docker access to those features via the `unstable` image as of 2026-03-13. Memcached, Dragonfly, KeyDB and LevelDB are rejected.

RocksDB and LMDB are embedded libraries. They are useful only as a hidden storage layer or a template-hash to entry-id map, with no query language and no full-text search.

The reusable idea is a cheap exact-handle index: canonical-template hash, file, symbol and dependency fingerprint mapped to an entry id. It works on any engine, and fuzzy search can sit behind the abstraction layer.

## Candidates
- **Redis 8 (Redis Query Engine, AGPLv3 option)** [engine] viable — The only engine in this lane with built-in fuzzy and ranked text search. It has BM25STD, Snowball stemming, Levenshtein fuzzy up to 3, prefix/wildcard, tags, vector KNN and hybrid queries, and a first-party MCP server. It can serve the symptom-search side of the abstraction as a rebuildable index. It is a poor system of record: the dataset is in RAM, there are no joins or relational integrity, and outcome analytics (OLAP) are weak. It is also another daemon to run, and it adds licence reading (AGPLv3 versus RSAL/SSPL) to what the owner must track.
    egress: Self-hosted, no required telemetry found in the docs read. Avoid Redis Insight's Copilot and Redis Cloud features (not evaluated). Defect text stays local. | ops: medium | win: No native Windows build. Needs Docker Desktop (available), WSL2, or Memurai (third-party). Docker works, but it adds a running container to every agent session. | linux: Excellent: packages, Docker, RDB/AOF persistence, ACLs. AGPLv3 is acceptable for internal self-hosted use, where no network service is offered to third parties. | access: Official MCP server (MIT, stdio, Python 3.14+) with query-engine tools. CLI via redis-cli. Mature client libraries for Node. | footprint: Small instance, a few tens of MB RSS for under 10 MB of data (inferred, not measured). One daemon, one port, a persistence dir. | maturity: Redis Query Engine is long-established (RediSearch 1.x to 2.10). Redis 8 GA 2025-05-01. The licence was changed twice in 14 months, which is a governance-risk signal. | facts: F01, F02, F03, F04, F05, F19, F20, F22
- **Valkey 9.x with valkey-search 1.2** [engine] weak — A BSD-3 fork under LF governance, so the licence is clean. Its full-text search is new (1.2, March 2026), the blog gives no stemming, tokenisation or ranking details, and Docker access to 1.2 features required the unstable bundle image as of 2026-03-13. It is a fresh and less documented replacement for a feature RQE already provides. It would only be preferable if a permissive licence were a hard requirement.
    egress: Self-hosted, BSD, no telemetry found. | ops: medium | win: No Windows statement. Docker only. | linux: Good for the core server. The search module needs Linux build toolchains (GCC 12+/Clang 16+) or the bundle image. | access: No official Valkey MCP server was found in this lane. Any Redis-protocol client works with the core commands. Search commands are FT.*. | footprint: Same order as Redis. | maturity: valkey-search first release July 2025, full-text March 2026. Production readiness not stated. | facts: F06, F20
- **Apache Cassandra 5.0.x** [engine] rejected — Built for multi-node, write-heavy, partition-keyed workloads. Production minimum is 8 GB RAM and 2 cores per node with a JVM heap. It has no joins and no ad-hoc queries, with one table per query. SAI explicitly is not text search (no LIKE, equality/CONTAINS only). The tunable consistency it offers is irrelevant at one node. Native Windows support was dropped in 4.0. It is 5 to 7 orders of magnitude over-sized for a few hundred entries, and it forces the schema to be designed around the lookups before the agents have defined them.
    egress: Self-hosted, Apache 2.0, no telemetry. Posture is fine; fit is the problem. | ops: high | win: None natively since 4.0. Docker or WSL2 only. | linux: Fine technically (Java 11, 17 experimental), but the single-node operational cost is a JVM plus compaction, repair and heap tuning for under 10 MB of data. | access: Third-party MCP servers only; no official one, and several execute arbitrary CQL. | footprint: At least 2 GB heap by the docs' own floor, 8 GB RAM recommended minimum. | maturity: Very mature (5.0.9 GA, Aug 2026). | facts: F07, F08, F09, F10, F11, F19, F20
- **ScyllaDB (Enterprise 2025.1+ source-available)** [engine] rejected — A C++ Cassandra-compatible engine with the same data-model limits (no joins, no text search). It is Linux-only and optimised for 20-60 cores per node. After Dec 2024 it is source-available rather than AGPL, with a free tier capped at 10 TB/50 vCPU and a possible licence key and telemetry. Telemetry is incompatible with the data-stays-local constraint if it is ever required. The last AGPL OSS release is 6.2.x, which gets no fixes.
    egress: Telemetry 'may be required' to measure usage (FAQ, as of Dec 2024). Treat as a risk until current terms are verified. | ops: high | win: None. Linux x86_64/AArch64 only (Docker would be needed). | linux: Technically fine, but oversized and subject to the licence and telemetry uncertainty. | access: CQL drivers; no MCP server evaluated. | footprint: At least 1 GB (test) or 4 GB (production) RAM floor. | maturity: Mature engine; the licence regime is new and still shifting. | facts: F12, F13, F20
- **Memcached** [engine] rejected — A volatile LRU cache of opaque blobs: no persistence, no query, no search, no provenance. Memcached can hold nothing the design needs to keep. Extstore keeps keys in RAM and loses flash contents on restart.
    egress: Self-hosted, BSD, no telemetry. | ops: low | win: Poor (third-party Windows builds only). | linux: Fine as a cache; wrong role. | access: None relevant. | footprint: Tiny. | maturity: Very mature. | facts: F16
- **Dragonfly** [engine] rejected — A multi-threaded Redis/Memcached-compatible server aimed at very high throughput on big machines (io_uring, Linux 5.10+ recommended). BSD 1.1 with a use grant that forbids in-memory data store products, and an unresolved change date. It has no Windows build. It adds nothing at this scale over Redis and adds licence risk.
    egress: Self-hosted. No telemetry evaluated. | ops: medium | win: None (not mentioned; Linux-kernel feature dependent). | linux: Fine technically. | access: Redis protocol clients. | footprint: Unmeasured. | maturity: Newer than Redis; search features not evaluated. | facts: F14, F20
- **KeyDB** [engine] rejected — A Redis 6-era multithreaded fork with no sign of the Redis 8 Query Engine, so no maintained full-text path. Current maintenance activity is unverified from the page read (no release dates).
    egress: BSD-3, self-hosted. | ops: medium | win: Not evaluated; assume Docker only. | linux: Technically fine for key-value use. | access: Redis protocol clients. | footprint: Small. | maturity: Unclear: last release date not established. | facts: F15
- **RocksDB (embedded LSM key-value library)** [engine] weak — A strong embedded store, but a library with a programmatic API only: no query language, no secondary indexes, no full-text. Using it as the knowledge store means building the index, query and provenance layers by hand, which is exactly the 'simulate a database' trap. It is worth considering only as a hidden storage layer under another component. Native build on Windows is heavy.
    egress: In-process, no network, nothing sent anywhere. | ops: medium | win: Has a Windows build path, but it needs a C++ toolchain or a prebuilt binding (not evaluated). | linux: Excellent. | access: None native: only ldb and sst_dump CLI tools. A custom CLI or MCP wrapper would be required. | footprint: In-process, small. | maturity: Very mature, but designed for TB-scale write-heavy workloads. | facts: F17, F20
- **LMDB (embedded memory-mapped B+tree)** [engine] viable — A zero-ops embedded ordered KV store: single file, no daemon, ACID-style, permissive licence, Windows wheels. It suits an exact-handle map (template hash or dependency fingerprint to entry ids) or a verification-result cache. It does not give fuzzy search, ranking or provenance queries, so it can only sit behind the abstraction as the cheap exact-lookup index, not as the store.
    egress: In-process, no network. | ops: low | win: Good: py-lmdb publishes Windows wheels. A Node binding was not evaluated. | linux: Good. Beware of one writer at a time and a preset map_size. | access: None native. It needs a CLI wrapper, so it fits the 'agents use a CLI' constraint only if the CLI is written. | footprint: Negligible. | maturity: Very mature (OpenLDAP). | facts: F18, F21
- **LevelDB** [engine] rejected — Receives 'very limited maintenance' (critical fixes only), single process, no indexes. LMDB and RocksDB supersede it for the embedded-KV role.
    egress: In-process. | ops: low | win: Supported (CMake/Visual Studio). | linux: Works, but offers nothing the others lack. | access: None. | footprint: Negligible. | maturity: Maintenance mode. | facts: F18
- **Exact-handle KV index pattern (canonical template hash / dependency fingerprint to entry ids)** [pattern] strong — The one idea that carries over from this lane. Precision-first retrieval needs a cheap exact tier before any fuzzy tier. Canonicalise the error or stack or build text into a template, hash it, and add other exact handles (file, symbol, error code, package@version, platform). Look these up as plain keys. A hit on an exact handle is cheap to verify, and a miss falls through to fuzzy search. It needs no particular engine and can be a table with indexes in whichever engine the design chooses.
    egress: Local only. | ops: none | win: Engine-independent. | linux: Engine-independent. | access: Exposed through the same CLI or MCP tool as the other lookups. | footprint: Negligible. | maturity: Standard practice (log-template mining, known-error databases). | facts: F21, F09

## Design implications
- (strong) Do not choose a wide-column or Dynamo-style engine (Cassandra, ScyllaDB) as any part of this store. Their data model forces query-first denormalisation, they lack joins and usable text search, and their single-node cost (JVM heap, 8 GB RAM floor, compaction and repair) buys only scale and replication that a few hundred entries never need. The owner naming Cassandra should get this reasoning in plain words. [F07, F09, F10, F20]
- (moderate) Redis 8 is the only engine in this lane that does ranked fuzzy text (BM25, stemming, Levenshtein up to 3, prefix) in-engine. If the engine comparison picks a search sidecar, Redis 8 is the one to compare against alternatives from other lanes. Keep the sidecar disposable and rebuildable from the system of record, because Redis keeps its dataset in RAM and offers no relational integrity or good OLAP. [F03, F04, F20]
- (moderate) Redis licence history (RSALv2/SSPL in March 2024, then AGPLv3 added May 2025) is a vendor-governance risk signal. For an internal, self-hosted, non-redistributed tool AGPLv3 is workable. The abstraction layer should keep the engine swappable so a future licence change does not force a rewrite. Valkey (BSD-3, LF) is the fallback, but its full-text search is under a year old and its docs thin. [F01, F02, F06]
- (moderate) Any engine that runs as a daemon (Redis, Valkey, Cassandra, Scylla) means a service must be started before every cheap-agent lookup, with Docker Desktop on the Windows dev box since none has a native Windows build. For a developer who wants less to track, an embedded or in-process engine reached through a CLI is a better fit, and the daemon engines should only be chosen if a lookup quality gap justifies them. [F05, F06, F11, F13, F22]
- (moderate) Design retrieval in two tiers behind the abstraction layer: an exact-handle tier (canonical-template hash, file, symbol, dependency fingerprint) and a fuzzy tier (text plus optional vector). Exact-handle hits are cheap to verify and can be the only tier a Haiku-class agent acts on without escalating. Fuzzy-tier hits are candidates that must pass the verification gate. This keeps the false-positive surface small. [F21, F03]
- (moderate) Egress: nothing in this lane needs a third party, but two cautions apply. ScyllaDB's free tier says telemetry may be required and a licence key may follow, which makes it unsuitable for production under the data-stays-local rule. Redis vendor tools (Insight Copilot, Redis Cloud, the docs-search MCP tool) were not evaluated for egress and should be left out of the agent toolset. [F12, F19]
- (weak) Agent access: the official Redis MCP server exists but needs Python 3.14+ (the dev box has Python 3.12 off PATH) and is stdio-only. For any engine, a thin project CLI that wraps the abstraction layer is more consistent with the constraints than depending on a vendor MCP server, and it keeps one tool surface for the Haiku/Sonnet agents. [F19]

## Rejected paths
- Apache Cassandra 5.0 (with SAI) as the knowledge store — Query-first schema, no joins, SAI is not full-text search (no LIKE), 8 GB RAM and JVM heap floor, no native Windows, third-party MCP only, and a scale gap of 5 to 7 orders of magnitude. It is a worse fit than a single-file or single-node relational engine on every axis this workload cares about.
- ScyllaDB as a lighter Cassandra — Same data-model limits, Linux-only, 20-60 core sizing, and since 2025.1 source-available with a possible licence key and required telemetry. The last AGPL release (6.2.x) gets no fixes.
- Memcached as a verification-result cache — No persistence and no query. Entries or verification results lost on restart would silently turn hits into misses. A table in the main store does this job.
- Dragonfly or KeyDB as a Redis replacement — Dragonfly's BSL use grant forbids in-memory data store products and it targets large multi-core machines. KeyDB tracks Redis 6 with no Query Engine and unverified activity. Neither adds anything at this scale over Redis or Valkey.
- RocksDB or LevelDB as the primary store — No query language, no secondary indexes and no full-text. Using them means hand-building a database in application code, which the brief rules out. LevelDB is also in maintenance mode.
- Valkey with valkey-search as the first-choice search sidecar — Full-text support only arrived in 1.2 (March 2026) with thin documentation and an unstable-image path. Redis 8's Query Engine is more fully documented. Keep Valkey as a licence fallback only.

## Facts
- F01 [LOAD-BEARING] (verified, primary_docs; engine/egress/ops_cost) Redis added AGPLv3 as an additional licence option starting with Redis 8, announced 2025-05-01. Redis had moved to SSPL/RSALv2 in March 2024. Redis 8 integrates JSON, Time Series, probabilistic types and the Redis Query Engine into core Redis Open Source.
    https://redis.io/blog/agplv3/ (published 2025-05-01, updated 2025-05-23)
- F02 (verified, primary_docs; engine/egress) Redis Search features (full-text, vector, geo, aggregation) are licensed RSALv2 OR SSPLv1 OR AGPLv3. Starting with Redis 8 the Query Engine is integral to Redis and standalone RediSearch releases are no longer published. Earlier versions remain RSALv2/SSPLv1 only.
    https://redis.io/docs/latest/develop/ai/search-and-query/ ; https://github.com/RediSearch/RediSearch
- F03 [LOAD-BEARING] (verified, primary_docs; retrieval/engine) The Redis Query Engine supports BM25STD as the default scorer (renamed from BM25 in 8.4), TFIDF variants and DISMAX. It also supports Snowball stemming for about 30 languages (plus Chinese tokenisation), fuzzy matching by Levenshtein distance (maximum 3), prefix/infix/suffix/wildcard queries, tag filters, and vector KNN hybrid queries. Prefix expansion is capped at 200 terms by default.
    https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/scoring/ ; .../stemming/ ; .../query_syntax/
- F04 (verified, primary_docs; engine/ops_cost/concurrency) Redis persistence is RDB snapshots, AOF, both, or none. The docs say to use both for safety comparable to PostgreSQL. AOF fsync defaults to every second, so up to 1 s of writes can be lost. RDB files are safe to copy while the server runs. Redis provisions memory from peak usage and bounds user-key allocation with `maxmemory`, i.e. the working set lives in RAM.
    https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ ; https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- F05 (verified, primary_docs; ops_cost/engine) Redis Open Source has no native Windows build. Official routes are Docker, WSL2, or Memurai (a third-party commercial Windows port the docs call the official partner). A preview of Redis OSS 8.2 RC1 was available via Memurai.
    https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/windows/ ; https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/
- F06 [LOAD-BEARING] (verified, primary_docs; engine/retrieval/ops_cost) Valkey is BSD-3-Clause under LF Projects. Platforms listed: Linux, macOS, BSDs; no Windows statement. valkey-search is an official BSD-3 module: the first release (2025-07-07) was vector-only and needed Valkey 8.1.1 or later. valkey-search 1.2 (blog 2026-03-17) added full-text (keyword, phrase, prefix, suffix, wildcard, fuzzy) and FT.AGGREGATE. As of 2026-03-13 Docker users needing 1.2 features were told to use `valkey/valkey-bundle:unstable`. Stemming, tokenisation, ranking and production readiness are not described.
    https://github.com/valkey-io/valkey ; https://valkey.io/blog/introducing-valkey-search/ ; https://valkey.io/blog/valkey-search-1_2/ ; https://github.com/valkey-io/valkey-search
- F07 [LOAD-BEARING] (verified, primary_docs; ops_cost/engine) Cassandra production minimums: at least 2 cores and 8 GB RAM per node; typical production 8+ cores and 32 GB+. Heap should be at least 2 GB and at most 50% of RAM. The docs say to always use ECC RAM. The default heap formula is min(1/2 RAM, 16G with CMS / 31G otherwise). Off-heap use (bloom filters, compression metadata, caches) is additional. The docs say small servers such as a Raspberry Pi work for dev/test but give no minimum.
    https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hardware.html ; https://github.com/apache/cassandra/blob/trunk/conf/jvm-server.options
- F08 (verified, primary_docs; engine/ops_cost/retrieval) Cassandra download page (read 2026-11-02) lists 5.0.9 as latest GA (2026-08-07), 4.1.12 and 4.0.21 also maintained. Per trunk NEWS, 5.0 removed Java 8 (minimum Java 11) and Java 17 support is experimental. 5.0 added SAI and a vector type with ANN via jvector.
    https://cassandra.apache.org/_/download.html ; https://github.com/apache/cassandra/blob/trunk/NEWS.txt
- F09 [LOAD-BEARING] (verified, primary_docs; retrieval/limits) Cassandra SAI FAQ: SAI is not a complete replacement for text-based search. LIKE is unsupported. String operators are equality, CONTAINS, CONTAINS KEY and AND. Each index covers one column (no composite). Default cap is 10 SAI indexes per table. AND queries use at most two SAI indexes and post-filter the rest. SAI needs Murmur3Partitioner and adds roughly 20-35% disk. 5.0 is the only supported database.
    https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-faq.html
- F10 [LOAD-BEARING] (verified, primary_docs; data_model/concurrency/limits) Cassandra data modelling is query-first and denormalised: no joins, one table per query, partition-key-driven access. Consistency is tunable per operation (ONE/QUORUM/ALL, with W+R>RF for read-your-writes). Replication is multi-master with last-write-wins timestamps. Cross-partition transactions are avoided; lightweight transactions work within a single partition.
    https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html ; https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- F11 (reported, source_repo; ops_cost/engine) Apache Cassandra removed Windows support from 4.0 onward (NEWS: lack of maintenance and testing; Windows scripts removed in CASSANDRA-16171). The project suggests WSL2, Docker or a VM for developers on Windows. Reported via a search summary rather than read on the NEWS page.
    https://cdn09022024.gitlink.org.cn/natas_hw/cassandra/commit/d9e2ed00afd8fae4bcbec02a4b323e55e4f43d88 (mirror of apache/cassandra commit, as returned by WebSearch)
- F12 [LOAD-BEARING] (verified, primary_docs; egress/engine/ops_cost) ScyllaDB's Dec 2024 announcement: from Enterprise 2025.1 the code is source-available; OSS 6.2.x is the last AGPL release (no further AGPL releases or fixes). The free tier is limited to 10 TB total disk and 50 vCPUs per organisation, and Docker for testing/CI follows the same terms. A licence manager (key) may be added later, and the FAQ says telemetry may be required to measure usage. This FAQ states plans as of Dec 2024; the current terms were not verified.
    https://www.scylladb.com/source-available-faq
- F13 (verified, primary_docs; ops_cost/engine) ScyllaDB system requirements: 64-bit Linux only (no Windows on the page), x86_64 with SSE4.2 (it will not boot without it) or AArch64. Minimum memory is 4 GB or 0.5 GB per logical core for production, and 1 GB or 256 MiB per core for test. 20-60 logical cores are recommended.
    https://docs.scylladb.com/manual/stable/getting-started/system-requirements.html
- F14 (verified, primary_docs; engine/egress/ops_cost) Dragonfly is Business Source License 1.1. The Additional Use Grant allows use only in a product that is not an in-memory data store and bans competing hosted services. The LICENSE page fetch gave a Change Date of 2030-11-01 (Apache 2.0), while a search summary reported 2028-09-01, so the date is unresolved. Docs: Linux 4.14+ (5.10+ recommended), x86_64 sandybridge+ or arm64; macOS/Windows not mentioned.
    https://github.com/dragonflydb/dragonfly/blob/main/LICENSE.md ; https://dragonflydb.io/docs/getting-started
- F15 (verified, source_repo; engine/retrieval) KeyDB is BSD-3-Clause, maintained as part of Snap Inc., with no paid product. The README says it keeps in sync with upstream Redis and highlights v6.3.0. The page gave no release dates, so current maintenance activity is unknown. It is a Redis 6.x-era fork and so has no Redis 8 Query Engine.
    https://github.com/Snapchat/KeyDB
- F16 (verified, primary_docs; engine/limits) Memcached is an in-memory key/value store for small opaque blobs. The server does not understand data structures, and eviction is LRU by default. It is Revised BSD (reported). Extstore moves values to flash but keeps keys and the hash table in RAM, and flash contents are lost on restart (reported). It is a cache, not a store: no persistence, no query, no search.
    https://docs.memcached.org/ ; https://docs.memcached.org/features/flashstorage/
- F17 (verified, source_repo; engine/limits/data_model) RocksDB is an embeddable C++ persistent key-value library: LSM tree, WAL, column families, transactions, snapshots, prefix iterators, backup API, and a Windows build. It is dual-licensed GPLv2/Apache 2.0. It has no query language (programmatic Get/Put/iterators; ldb and sst_dump CLI tools only), no full-text search and no secondary indexes.
    https://github.com/facebook/rocksdb ; https://github.com/facebook/rocksdb/wiki/RocksDB-Overview
- F18 (verified, primary_docs; engine/concurrency/limits) LevelDB (BSD-3) states it gets 'very limited maintenance' (critical fixes only). It is a single-process library with no SQL, no indexes and no client-server layer. LMDB (OpenLDAP Public License, permissive) is memory-mapped with a single concurrent writer and non-blocking readers. It needs a preset `map_size` and keeps keys ordered. It has Windows wheels via py-lmdb, and with sync disabled a crash may lose the last transactions but keeps integrity.
    https://github.com/google/leveldb ; https://lmdb.readthedocs.io/en/release/ ; https://openldap.org/software/release/license.html
- F19 (reported, source_repo; access) Agent access: the official Redis MCP server (redis/mcp-redis) is MIT, stdio-only, needs Python 3.14+ and a reachable Redis, and ships query-engine and vector-search tools. Its README warns that main may have breaking changes. Cassandra has only third-party MCP servers (some read-only with allowlists, some executing arbitrary CQL), none official or production-certified; their READMEs warn that database text can be treated as instructions.
    https://github.com/redis/mcp-redis ; WebSearch result summaries for Cassandra MCP servers (glama.ai, mcp.so)
- F20 [LOAD-BEARING] (inferred, inferred; limits/ops_cost) Scale gap: Redis's own Redis 8 launch demonstrates 1 billion 768-dimension vectors; Cassandra and ScyllaDB are multi-node, ring-partitioned systems (RF 3 typical, 8-32 GB+ per node, 20-60 cores recommended for Scylla). The workload here is tens to a few hundred text entries, a few KB each, i.e. well under 10 MB. That is roughly 5-7 orders of magnitude below the designed scale for Cassandra/Scylla/Dragonfly/Redis cluster. For this workload the RAM, JVM heap and daemon overhead are fixed costs that buy nothing.
    https://redis.io/blog/redis-8-ga/ ; F07 ; F13 (the size estimate is the researcher's own, derived from the lane brief)
- F21 [LOAD-BEARING] (inferred, inferred; retrieval/canonicalisation/invalidation/data_model) The part of this lane that carries over to the design is a cheap exact-handle index. Keys would be a canonical-template hash, an error code, a file or symbol, and a dependency-version fingerprint, each mapping to entry ids. This is a plain key lookup that any engine, or an embedded KV, can serve. Fuzzy matching, ranking and provenance history are separate concerns that a KV engine does not provide, so the abstraction layer should treat exact-handle lookup and fuzzy search as separate interfaces.
    Researcher reasoning from F03, F09, F17, F18
- F22 (inferred, inferred; concurrency/ops_cost/access) Redis executes commands single-threaded per instance (I/O threads optional via io-threads, default 1), which gives atomic multi-agent writes without extra locking. RDB snapshots can be copied while the server runs. These are useful properties, but a Redis daemon must be running for any agent session to read, which is more to track than a file-based store for a one-developer setup. This is the researcher's inference and is not documented as a single claim.
    https://redis.io/blog/redis-8-ga/ (io-threads default 1) ; https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Open questions
- What is the actual resident memory of an idle Redis 8 container with Query Engine loaded and a ~100-entry text index? No source gave a number, and this lane is read-only so it was not measured.
- Is there a Node-usable path for LMDB or RocksDB (node-lmdb, lmdb-js, rocksdb bindings) on Windows 11 with Node 24 and prebuilt binaries? Not evaluated in this lane.
- What are ScyllaDB's current licence terms and telemetry requirements? The FAQ read dates from the Dec 2024 announcement and says the full terms were to follow with Enterprise 2025.1.
- What is Dragonfly's actual BSL Change Date (the LICENSE fetch said 2030-11-01, a search summary said 2028-09-01)? It does not affect the verdict.
- Does valkey-search 1.2 full-text support stemming or BM25-style ranking, and is it declared production-ready? The blog post does not say.
- Does the Redis docs page referencing a BACKUP command family 'since Redis 8.10.0' match the Redis version that is actually current? It was not cross-checked against release notes.
- Whether the Redis Query Engine's AGPLv3 option is compatible with the owner's intended use, if the tool is ever distributed beyond the owner's machines, is a legal question this lane does not answer.

## URLs attempted
- https://redis.io/blog/agplv3/
- https://redis.io/blog/redis-8-ga/
- https://redis.io/docs/latest/develop/ai/search-and-query/
- https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/scoring/
- https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/stemming/
- https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
- https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/windows/
- https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/
- https://github.com/RediSearch/RediSearch
- https://github.com/redis/mcp-redis
- https://valkey.io/blog/introducing-valkey-search/
- https://valkey.io/blog/valkey-search-ga/ (404)
- https://valkey.io/blog/
- https://valkey.io/blog/valkey-search-1_2/
- https://valkey.io/blog/beyond-vectors-full-text-search/ (404)
- https://valkey.io/topics/search/
- https://github.com/valkey-io/valkey
- https://github.com/valkey-io/valkey-search
- https://cassandra.apache.org/doc/latest/cassandra/getting-started/production.html
- https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hardware.html
- https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-overview.html
- https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-faq.html
- https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html
- https://cassandra.apache.org/_/download.html
- https://github.com/apache/cassandra/blob/trunk/NEWS.txt
- https://github.com/apache/cassandra/blob/trunk/conf/jvm-server.options
- https://github.com/apache/cassandra/blob/trunk/src/java/org/apache/cassandra/index/sai/README.md
- https://www.scylladb.com/2024/12/18/why-were-moving-to-a-source-available-license/ (network error)
- https://www.scylladb.com/source-available-faq
- https://docs.scylladb.com/manual/stable/getting-started/system-requirements.html
- https://github.com/dragonflydb/dragonfly
- https://github.com/dragonflydb/dragonfly/blob/main/LICENSE.md
- https://dragonflydb.io/docs/getting-started
- https://github.com/Snapchat/KeyDB
- https://docs.memcached.org/
- https://github.com/facebook/rocksdb
- https://github.com/facebook/rocksdb/wiki/RocksDB-Overview
- https://github.com/google/leveldb
- http://www.lmdb.tech/doc/ (SSL error)
- https://github.com/LMDB/lmdb
- https://lmdb.readthedocs.io/en/release/
- https://openldap.org/software/release/license.html
- WebSearch: ScyllaDB source-available licence; Dragonfly licence; Cassandra Windows support; Valkey search 1.2; Memcached extstore; Cassandra MCP servers

## Anomalies
- Dragonfly Change Date conflicts between sources: the LICENSE.md page fetch said 2030-11-01 while a WebSearch summary said 2028-09-01. Unresolved; it does not change the verdict.
- The ScyllaDB announcement blog URL failed with a network error (EAI_AGAIN). The source-available FAQ was used instead, and it describes Dec 2024 plans, not necessarily current terms. A search summary hinted at a 2025-09-30 update that was not read.
- The WebFetch summariser sometimes reported 'not stated' for facts that are probably on linked sub-pages (e.g. Valkey full-text stemming, RocksDB release version, Memcached licence). Those were left as open or marked 'reported' and not filled from memory.
- The Redis persistence page mentions a BACKUP command family 'since Redis 8.10.0', a version number not cross-checked against release notes.
- Cassandra's Windows-removal fact comes from a search-result summary of a mirrored commit, not a page read directly, so it is marked reported. The 5.0 NEWS section itself did not mention Windows.
- The Valkey README and blog fetches did not state a Valkey core version, and Redis 8 doc sections reference both 8.x features (8.4 scorer rename, 8.10 BACKUP). Version numbers were taken only as quoted.
- No web search queries contained repository code, file contents or defect text.
