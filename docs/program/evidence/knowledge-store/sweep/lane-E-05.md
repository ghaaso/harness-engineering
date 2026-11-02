# lane:E-05

lane=E-05 tool_status=ok facts=27 candidates=13

## Summary
At the stated workload (tens to hundreds of entries, thousands of outcome events, a few writes per phase, several concurrent agents), a hybrid OLTP+search+OLAP stack is not justified. The practitioner thresholds I found are roughly 50M to 100M+ rows, or multi-second dashboard queries at that size, or analytics load that competes with the application database. Those thresholds sit about four orders of magnitude above this workload, so I treat them as an upper bound rather than a target. Every dedicated OLAP or log engine I checked (ClickHouse server, chDB, Loki, Quickwit, VictoriaLogs, TiDB, Citus/Hydra columnar) is built for orders of magnitude more data and writes, and charges a real ops price. That price is a container or WSL2 on Windows, a second backup path, schema drift, consistency lag, and for ClickHouse a default-on crash-report endpoint. ClickHouse also fits this workload badly: the entry lifecycle (confirmed, refuted, invalidated, revised) is mutable state. ClickHouse rewrites parts on mutation and dedups eventually, and it wants about one insert per second in batches of 1,000 or more, not occasional single-row writes. The right design is one transactional engine (SQLite+FTS5 or Postgres+GIN) holding entries plus an append-only outcome table. Analytics are plain SQL aggregates over that table. If analytics ever outgrow it, add DuckDB as a read-only, in-process attach, not a second store. That is zero-copy, adds no daemon, and has nothing to keep in sync. DuckDB's own caveats: it does not persist anything itself, and extension autoinstall should be disabled so nothing is fetched at runtime. Hybrid CDC pipelines (PeerDB/ClickPipes) are cite-for-design only. ClickPipes is a ClickHouse Cloud feature, so using it would send defect data to a third party. PeerDB itself is AGPL and needs Temporal plus a catalog Postgres. I could not find a measured idle-memory figure for ClickHouse in Docker, so that is flagged as unknown.

## Candidates
- **Single transactional engine (SQLite+FTS5, or Postgres+GIN/tsvector) holding entries plus append-only outcome events** [pattern] strong — At 10^3-10^4 rows every search and aggregate is trivial. One engine gives atomic status transitions (confirmed/refuted/invalidated/revised) with the provenance row written in the same transaction, one backup, and no sync. The outcome history is an append-only table, so analytics are plain GROUP BY queries or views.
    egress: None. Local file or local Postgres. | ops: none | win: SQLite runs natively on Windows; Postgres via Docker Desktop. | linux: Excellent for both. | access: CLI or MCP wrapper over SQL. | footprint: SQLite: library, a file. Postgres: one container. | maturity: Decades-old, boring. | facts: F24, F25, F26, F27
- **DuckDB as a read-only analytics attach over the primary store (SQLite scanner or Postgres scanner), pulled in only on demand** [technique] strong — This is the zero-copy escape hatch if outcome analytics ever outgrow plain SQL. DuckDB runs in-process, attaches SQLite or Postgres directly and reads at query time with nothing to sync, so there is no second source of truth. The caveat is that DuckDB's native file is not a multi-process write store, so keep it read-only or ephemeral. Disable extension autoinstall in production.
    egress: No data egress. Disable autoload/autoinstall of extensions so nothing is fetched at runtime; no telemetry page found. | ops: low | win: Good (Node and Python bindings; not verified for Windows in this lane). | linux: Good. | access: CLI one-shot or MCP tool; no server needed. | footprint: In-process library; no daemon. | maturity: Mature; the docs are for DuckDB 2.0. | facts: F16, F17, F18, F19
- **pg_duckdb (DuckDB engine inside Postgres)** [tool] viable — If the store is Postgres and some aggregate ever becomes slow, force_execution runs the same SQL on DuckDB over the same tables with no copy. It needs a Postgres extension install, and Windows is not a listed platform, so it only helps on the Linux production box. At this scale it solves a problem the project does not have.
    egress: Reads local tables; S3/GCS/Azure/R2 access is opt-in and must be left unconfigured. | ops: low | win: Only through a Linux Postgres container. | linux: Good (Ubuntu 22.04-24.04, PG 14-18). | access: Plain SQL through whatever already talks to Postgres. | footprint: A shared library inside the Postgres process. | maturity: v1.1.1 on the README, with no production-readiness statement there. | facts: F15, F26
- **ClickHouse server (single node, Docker)** [engine] rejected — Designed for hundreds of millions to billions of rows and batched appends of 1,000+ rows at about 1 insert/s. It handles mutable per-entry state badly and has no native Windows server. The shipped config sends crash reports to crash.clickhouse.com by default, which would need explicitly switching off. The full-text index is GA from 26.2 and vector indexes exist from 25.8, but neither addresses a corpus of a few hundred entries.
    egress: Crash reports default ON to crash.clickhouse.com; must be disabled in config. Otherwise local. | ops: high | win: Docker Desktop only. | linux: Excellent but oversized. | access: HTTP 8123 or native 9000 plus a custom CLI or MCP layer. | footprint: Idle RAM unmeasured here; the default config mlocks the binary and sets an 8 GiB uncompressed cache. | maturity: Very mature. | facts: F01, F02, F03, F05, F06, F07, F26
- **clickhouse-local** [tool] weak — Useful for ad-hoc SQL over files, but on Windows it needs WSL2, it allows one instance per data dir, and it brings the same crash-report/telemetry question as the server. Nothing it does beats DuckDB attached to SQLite for this workload.
    egress: Crash-report config is part of the same binary; verify before use. | ops: medium | win: WSL2 only. | linux: Good. | access: CLI. | footprint: One binary. | maturity: Mature. | facts: F04, F03
- **chDB (embedded ClickHouse)** [engine] rejected — Python wheels for Linux and macOS only, with no Windows mention on the repo page. One data path per process rules out concurrent agents. DuckDB covers the same in-process OLAP niche with Windows support.
    egress: No telemetry mentioned on the repo page (unverified beyond that). | ops: medium | win: Poor. | linux: Good. | access: Python only. | footprint: In-process library; the ClickHouse core is large. | maturity: Version 4.4.0; actively released. | facts: F08, F26
- **Grafana Loki** [engine] rejected — Label-only index, designed for streams in object storage. It cannot do fuzzy symptom lookup over free text and was designed for volumes far beyond this. Usage reporting to stats.grafana.org is on by default.
    egress: Anonymous usage reports to stats.grafana.org by default (disable reporting_enabled). | ops: high | win: Docker. | linux: Fine but pointless here. | access: LogQL over HTTP. | footprint: Moderate. | maturity: Very mature. | facts: F09, F10
- **Quickwit** [engine] rejected — Petabyte-scale object-storage search engine; heavy for hundreds of entries. It is actively released (v0.9.3, 2026-10-22), but the Datadog ownership adds roadmap uncertainty, and nothing in its design helps with verification or invalidation of entries.
    egress: Local if self-hosted; no telemetry statement found. | ops: high | win: Docker. | linux: Fine but oversized. | access: REST API. | footprint: Daemon plus metastore. | maturity: v0.9.x. | facts: F12
- **VictoriaLogs** [engine] weak — The lightest of the log engines (single binary, Apache-2.0, indexes all fields, LogsQL). It would only make sense for holding raw build and CI log corpora for template mining, which is not the entry store. It is time-retention oriented and has no concept of an entry lifecycle. Its resource claims are vendor-made.
    egress: Local; no telemetry statement found in the pages read. | ops: medium | win: Binary or Docker. | linux: Good. | access: HTTP LogsQL. | footprint: Single binary. | maturity: Active; GA/version not confirmed on the page read. | facts: F11
- **PeerDB / ClickPipes (Postgres CDC to ClickHouse)** [system] cite_design_only — ClickPipes is ClickHouse Cloud, so it sends data to a third party and is disqualified for production. Self-hosted PeerDB is AGPL-3.0 and drags in Temporal plus a catalog Postgres plus ClickHouse. CDC adds slot, WAL and schema-drift risk (no type changes). This is a design reference for the hybrid pattern, nothing more.
    egress: ClickPipes: full row egress to ClickHouse Cloud. Self-hosted PeerDB: local, but a heavy multi-component stack. | ops: high | win: Docker-heavy. | linux: Designed for Linux. | access: n/a | footprint: Several services. | maturity: Mature at large scale (vendor reports 200+ TB/month). | facts: F13, F14
- **HTAP hybrid (OLTP + search + OLAP as separate engines)** [pattern] cite_design_only — Justified only above roughly 50M-100M rows with multi-second analytics, or when analytics load starts hurting the transactional database. None apply here. Cite the pattern for the 'later, if ever' note and record the trigger conditions in the design, not the machinery.
    egress: Depends on engines chosen. | ops: high | win: Poor. | linux: Fine at scale. | access: n/a | footprint: Multiple services. | maturity: Established. | facts: F22, F23, F26, F27
- **TiDB (with TiFlash)** [engine] rejected — Distributed HTAP database whose recommended dev minimum is 8 cores/16 GB for TiDB alone, 32 cores/64 GB for TiFlash. That is orders of magnitude over what one developer's box should run for a few hundred records.
    egress: Telemetry removed or local-only in recent 8.x; deprecated from v8.5.7. | ops: high | win: Poor. | linux: Designed for clusters. | access: MySQL protocol. | footprint: Very large. | maturity: Mature at scale. | facts: F20
- **Citus / Hydra columnar tables** [engine] rejected — Columnar tables cannot UPDATE or DELETE and cannot hold foreign keys, so they do not fit a mutable entry store. At this scale, row storage is already fast enough. Hydra's licensing is ambiguous on its page and shows no maturity stage.
    egress: Local. | ops: medium | win: Via Postgres container. | linux: OK. | access: SQL. | footprint: Postgres extension. | maturity: Citus 14.1 mature; Hydra columnar unclear. | facts: F21

## Design implications
- (strong) Do not build a multi-engine HTAP stack for this track. Use one transactional store for entries, handles, provenance and the append-only outcome log, with the search index inside it (SQLite FTS5 or Postgres GIN). Record the numeric triggers for revisiting (for example analytics queries over 1-2 s, or outcome rows past about 10^6) in the design, not any second engine. [F22, F23, F26, F27]
- (strong) Model outcomes as an append-only table (entry_id, event kind, timestamp, agent, tier, cost, evidence ref). Compute hit/refute/miss rates and cost saved as plain SQL views. This is the OLAP workload, and at the stated size it needs no OLAP engine. [F26]
- (moderate) Keep DuckDB in reserve as a read-only in-process attach over the primary store, with autoinstall/autoload disabled and the config locked in production. It adds no second source of truth, and it is a plain SQL tool call, not a service. [F16, F17, F18, F19]
- (strong) Do not use DuckDB's native file as the shared write store: one writer process, or read-only for many. Concurrent agents write through the primary store, which gives atomic transitions and idempotent writes (the same discipline CLAUDE.md applies to job events). [F18]
- (strong) ClickHouse and Loki are poor semantic fits as well as oversized. ClickHouse wants batched appends and handles mutable status badly, and Loki indexes labels only. The entry lifecycle is mutable and fuzzy-searched, so it needs a transactional row store with a text index. [F05, F06, F09]
- (strong) Any dependency on a ClickHouse binary or image requires explicitly disabling crash reports. Loki needs reporting_enabled=false, and DuckDB needs extension autoinstall off. Add an egress audit line item for each engine considered. [F03, F10, F19]
- (moderate) Windows dev constraints favour embedded libraries over servers. ClickHouse local and chDB are not first-class on native Windows, whereas SQLite runs there natively and Postgres can run in Docker. [F04, F08, F17]
- (moderate) Avoid CDC-based derived stores. A derived OLAP store would need a staleness contract and a rebuild path, and CDC tools carry slot, WAL and schema-drift hazards. If a projection is ever needed, make it a rebuildable view, with the primary store as the only source of truth. [F13, F14, F27]

## Rejected paths
- ClickHouse (server, clickhouse-local, chDB) as the outcome analytics or entry store — Built for 10^8-10^9 rows and batched appends of 1,000+ rows at about 1 insert/s; mutations rewrite parts; no native Windows server; crash reports default on; chDB is Linux/macOS only. All of this is for a workload 4-5 orders of magnitude smaller.
- Grafana Loki or Quickwit as a log or search store for entries — Loki indexes labels only; Quickwit is a petabyte-scale object-storage engine; neither supports entry lifecycle or verification, and both are oversized.
- Postgres-to-ClickHouse CDC via PeerDB or ClickPipes — ClickPipes is a cloud service that sends defect data to a third party (disqualified); self-hosted PeerDB needs Temporal, a catalog Postgres and a ClickHouse; adds slot/WAL/schema-drift risk and consistency lag for no gain at this size.
- TiDB, Citus or Hydra columnar for HTAP — TiDB's dev minimums are cluster-sized; columnar tables in Citus/Hydra cannot UPDATE or DELETE; neither is needed at this scale.

## Facts
- F01 (verified, primary_docs; retrieval/engine) ClickHouse text (full-text) index is GA from version 26.2; only the support_phrase_search argument is flagged experimental.
    https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes (read 2026-11-02)
- F02 (verified, primary_docs; retrieval/engine) ClickHouse vector similarity indexes are 'available in ClickHouse version 25.8 and higher'; the page carries no experimental/GA label for them (the Quantized codec on the same page is the one marked experimental).
    https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes (read 2026-11-02)
- F03 [LOAD-BEARING] (verified, source_repo; egress/ops_cost) ClickHouse's shipped server config.xml (master) has send_crash_reports enabled=true, send_logical_errors=true, endpoint https://crash.clickhouse.com/ ('reports are anonymized'). It is on by default in the open-source server and must be switched off explicitly. Separately, ClickHouse Cloud began collecting crash reports on 2026-02-27, and those can include in-memory credentials and query strings.
    https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/programs/server/config.xml ; https://clickhouse.com/docs/resources/support-center/knowledge-base/cloud-services/opt-out-core-dump-collection
- F04 [LOAD-BEARING] (verified, primary_docs; engine/ops_cost/concurrency) clickhouse-local is 'supported on Windows through WSL2', not natively. It persists data under a default app-data dir or --path, and only one instance may use a directory at a time. The ClickHouse install page lists only Linux package routes for the server plus Docker for local development, with no native Windows server.
    https://clickhouse.com/docs/operations/utilities/clickhouse-local ; https://clickhouse.com/docs/install
- F05 [LOAD-BEARING] (verified, primary_docs; engine/limits/concurrency) ClickHouse insert guidance: batches of at least 1,000 rows (ideally 10,000-100,000), about one insert query per second. Many small synchronous inserts create many parts and cause 'too many parts' errors. Async inserts shift batching to the server, and wait_for_async_insert=0 is called 'very risky'.
    https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy
- F06 [LOAD-BEARING] (verified, primary_docs; data_model/provenance/engine) ClickHouse treats updates as non-OLTP: mutations are 'I/O-heavy, rewriting all parts that match the WHERE expression'. Lightweight updates suit small changes of up to about 10% of a table. ReplacingMergeTree dedup is eventual (only at merge), so queries may need FINAL. A mutable entry-status lifecycle is a poor fit.
    https://clickhouse.com/docs/updating-data/overview
- F07 (reported, primary_docs; ops_cost/limits) system.query_log is not pruned automatically ('ClickHouse does not delete data from the table automatically'). The default config also sets mlock_executable=true (mlockall after startup) and an 8 GiB uncompressed_cache_size. I found no authoritative measured idle-RAM figure for the Docker image. A third-party tuning guide says idle can be brought to under 1 GB only after shrinking caches and system logs.
    https://clickhouse.com/docs/operations/system-tables/query_log ; config.xml above ; https://pulse.support/kb/clickhouse-low-memory-configuration
- F08 (verified, source_repo; engine/ops_cost/concurrency) chDB (in-process ClickHouse): Python package 4.4.0, core 26.7.3, Apache-2.0. Supports macOS and Linux (x86_64/ARM64), with no Windows mention on the repo page. chdb.connect() can be in-memory or file-backed, and chdb-core allows only one active data path per process.
    https://github.com/chdb-io/chdb (data date 2026-09-28)
- F09 (verified, primary_docs; retrieval/engine) Grafana Loki indexes only labels/metadata, not log contents ('does not index the contents of the logs'). Queries narrow by label, then fetch and scan chunks from object storage. That is a poor shape for free-text symptom lookup (my inference from the stated design).
    https://grafana.com/docs/loki/latest/get-started/overview/
- F10 (verified, primary_docs; egress) Loki analytics.reporting_enabled defaults to true and posts anonymous usage reports to https://stats.grafana.org/loki-usage-report (configurable usage_stats_url).
    https://grafana.com/docs/loki/latest/configure/
- F11 (reported, primary_docs; retrieval/engine/ops_cost) VictoriaLogs: single zero-config executable, Apache-2.0, LogsQL, full-text search with all ingested fields indexed automatically (up to 2000 fields per entry), default retention 7 days. The 30x-less-RAM-than-Elasticsearch claim is the vendor's own, and the FAQ gives no minimum hardware or telemetry statement.
    https://docs.victoriametrics.com/victorialogs/ ; https://docs.victoriametrics.com/victorialogs/faq/
- F12 (verified, primary_docs; engine/limits) Quickwit: Rust search engine for logs/traces on object storage, aimed at petabyte scale; the project joined Datadog (announced January 2025), with Apache-2.0 relicensing of Quickwit and tantivy. It is still releasing: v0.9.1 (2026-09-23), v0.9.2 (2026-10-16), v0.9.3 (2026-10-22). Docs conflict on whether aggregations are supported.
    https://quickwit.io/docs/overview/introduction ; https://quickwit.io/blog/quickwit-joins-datadog ; https://api.github.com/repos/quickwit-oss/quickwit/releases
- F13 [LOAD-BEARING] (verified, primary_docs; egress/ops_cost/engine) PeerDB is AGPL-3.0 and free to self-host. Architecture is a Go Flow API plus workers, Temporal as orchestrator, a Postgres catalog DB, and a Rust Nexus query layer. ClickPipes' Postgres CDC is 'fully powered by PeerDB' but is a ClickHouse Cloud feature. It accepts self-managed Postgres as a source, so using it means shipping row data to ClickHouse Cloud, a third party.
    https://docs.peerdb.io/ ; https://docs.peerdb.io/architecture ; https://clickhouse.com/docs/integrations/clickpipes
- F14 [LOAD-BEARING] (reported, blog; ops_cost/invalidation/concurrency) Postgres-to-ClickHouse CDC operational hazards (vendor-reported): replication-slot growth when WAL is not consumed (bulk writes, schema changes); slot invalidation with low max_slot_wal_keep_size (they advise at least 200 GB); tables need a primary key or replica identity; column type changes are not supported; costly reconnects re-read WAL from restart_lsn.
    https://clickhouse.com/blog/postgres-cdc-year-in-review-2025
- F15 (verified, source_repo; engine/ops_cost) pg_duckdb: MIT, v1.1.1 shown on the README. Supports PG 14-18 on Ubuntu 22.04-24.04 and macOS (no Windows listed). With duckdb.force_execution=true it runs existing SELECTs on DuckDB over normal Postgres tables, and reads Parquet/CSV/Iceberg/Delta on S3/GCS/Azure/R2. The README states no production-readiness claim. Backed by Hydra and MotherDuck.
    https://github.com/duckdb/pg_duckdb
- F16 (verified, primary_docs; engine/concurrency/ops_cost) DuckDB (docs 2.0) can ATTACH Postgres (TYPE postgres): reads go to Postgres at query time, read-write by default (READ_ONLY option exists), binary COPY, default isolation REPEATABLE READ. Caveats: stale schema cache across connections (postgres_clear_cache()), NUMERIC without precision read as DOUBLE, and passwords in connection strings can leak into errors.
    https://duckdb.org/docs/2.0/core_extensions/postgres/overview.html
- F17 (verified, primary_docs; engine/concurrency/ops_cost) DuckDB can ATTACH a SQLite file (or open it directly) and read it at query time. Locking is delegated to SQLite (many readers, one writer, BUSY_TIMEOUT default 5000 ms). SQLite's dynamic typing can cause type-mismatch errors in DuckDB (sqlite_all_varchar works around it). This gives an OLAP layer over SQLite with no copy.
    https://duckdb.org/docs/2.0/core_extensions/sqlite.html
- F18 [LOAD-BEARING] (verified, primary_docs; concurrency/engine) DuckDB native-format concurrency: one process can read and write, or many processes can read with READ_ONLY. Multi-process writing needs the 'Quack' remote protocol or DuckLake with a Postgres catalog. Multiple writer threads within one process are fine. This makes DuckDB unsuitable as the shared multi-agent write store, but fine as a read-only analytics view.
    https://duckdb.org/docs/2.0/connect/concurrency.html
- F19 (verified, primary_docs; egress) DuckDB can autoload and autoinstall core extensions, which can be disabled with SET autoload_known_extensions=false and SET autoinstall_known_extensions=false. allow_community_extensions=false and lock_configuration=true are also available. The securing-DuckDB page contains no telemetry statement, and I did not find a DuckDB telemetry page. An autoinstall fetch is a runtime egress path to disable in production.
    https://duckdb.org/docs/2.0/operations_manual/securing_duckdb/overview.html
- F20 (verified, primary_docs; ops_cost/egress/limits) TiDB recommended minimum for dev/test: TiDB 8 cores/16 GB, PD 4 cores/8 GB, TiKV 8 cores/32 GB, TiFlash 32 cores/64 GB. Telemetry was removed in v8.1.0-v8.5.2, then returned in v8.5.3-8.5.6 as local-only logging, and is deprecated from v8.5.7. This is orders of magnitude more than this workload needs.
    https://docs.pingcap.com/tidb/stable/hardware-and-software-requirements/ ; https://docs.pingcap.com/tidb/stable/telemetry/
- F21 (verified, source_repo; engine/data_model) Citus columnar tables do not support UPDATE, DELETE or foreign keys (README: 'currently unsupported'). Citus is AGPL-3.0, at v14.1 on PG18. Hydra columnar's licensing is inconsistent on its page (AGPL-3.0 in the README, Apache-2.0 in the sidebar), and it shows no release information and no stated maturity stage. Both are poor fits for a mutable entry store.
    https://github.com/citusdata/citus ; https://github.com/hydradatabase/hydra
- F22 [LOAD-BEARING] (reported, blog; limits/engine/ops_cost) Practitioner thresholds for adding a ClickHouse-class OLAP engine to Postgres cluster around 50M-100M+ rows. Under about 50M rows, tune Postgres first. A common trigger is dashboard queries consistently at 5-10 s on 100M+ rows after partitioning and tuning, or a P95 target under 1 s at 100M+ rows. The other trigger is analytics load competing with the app database. Sources disagree on the exact line, are vendor-adjacent, and say shape matters more than count. Pre-aggregated views serve at any scale.
    https://www.techplained.com/clickhouse-vs-postgresql ; https://toolchew.com/en/clickhouse-vs-postgres/ ; https://hikmahtechnologies.com/blog/clickhouse-vs-postgres/ (surfaced via web search; not each page read in full)
- F23 (reported, blog; ops_cost/limits/engine) 'Just use Postgres' guidance: each extra datastore adds its own backups, monitoring, failure modes and upgrade cycle. Reported escape hatches are log analytics and petabyte-scale search, a checklist that favors Postgres below roughly 500 GB, and DuckDB worth considering when analytical queries scan more than 20% of a large table. These are advocacy and vendor-adjacent posts (TigerData and others).
    https://www.tigerdata.com/blog/its-2026-just-use-postgres ; https://env.dev/guides/just-use-postgres (via search summary)
- F24 (verified, primary_docs; retrieval/engine/canonicalisation) SQLite FTS5 has built-in bm25() ranking (rank column default), a trigram tokenizer for substring match (needs 3+ chars), porter stemming, and contentless/external-content tables. With external content the user must keep the index consistent (triggers or a 'rebuild' command). contentless_delete needs SQLite 3.43.0+.
    https://www.sqlite.org/fts5.html
- F25 (verified, primary_docs; retrieval/engine) Postgres 18.6 docs: GIN is the preferred full-text index type (inverted, one entry per lexeme). GiST is lossy and needs heap rechecks. GIN stores no weights, so weighted queries need a row recheck.
    https://www.postgresql.org/docs/current/textsearch-indexes.html
- F26 [LOAD-BEARING] (inferred, inferred; limits/engine/ops_cost) Scale arithmetic: tens to hundreds of entries and perhaps thousands of outcome events is about 10^3-10^4 rows, which is 4-5 orders of magnitude below the 50M-100M row thresholds in F22. Any aggregate (hit/refute/miss rates, cost saved) over that table is a sub-millisecond-to-low-millisecond scan in SQLite or Postgres without special indexes. At this size no latency or write-rate threshold pushes toward a second engine. The first triggers worth watching would be analytics contending with the primary store, or a multi-process write bottleneck, neither of which is likely here.
    inferred from F22 and the stated workload
- F27 [LOAD-BEARING] (inferred, inferred; ops_cost/provenance/workflow) Operational price of a second engine for one developer: another process or container (on Windows, ClickHouse server needs Docker and clickhouse-local needs WSL2), a second backup/restore and upgrade path, schema drift between two stores (CDC cannot do type changes per F14), consistency lag between write and read model, and a second place for outcome-history truth to diverge. For a stack with an invariant culture of 'one source of truth', a derived store means a rebuildable projection with a staleness contract. That is extra state to track for a developer who wants less.
    inferred from F04, F13, F14, F23

## Open questions
- Measured idle RAM and CPU of the clickhouse/clickhouse-server Docker image on the owner's Docker Desktop (not found in primary docs; needs a docker stats measurement, which this research was not allowed to run).
- Does DuckDB ship any telemetry? The pages read contain no statement. Confirm by reading the DuckDB source or privacy page, and confirm whether the extension repository is fetched at runtime in the owner's chosen binding (Node or Python).
- Is DuckDB 2.0 stable for Windows with the sqlite scanner on Node 24? Not verified in this lane (the docs I read are the 2.0 pages).
- Exact practitioner thresholds are from vendor-adjacent blogs, found through search summaries rather than page-by-page reads of each. Confirm the 50M-100M row and 5-10 s figures against a primary benchmark if the design cites them as numbers.
- Whether pg_duckdb is available or allowed on the owner's Supabase tier (moot for the self-hosted Linux target), and whether it supports Windows (README lists only Ubuntu and macOS).
- Whether VictoriaLogs collects telemetry (the FAQ and main page I read are silent); only matters if raw CI log corpora are later stored.

## URLs attempted
- https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes
- https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- https://grafana.com/docs/loki/latest/get-started/overview/
- https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/programs/server/config.xml
- https://github.com/duckdb/pg_duckdb
- https://github.com/chdb-io/chdb
- https://docs.victoriametrics.com/victorialogs/
- https://docs.victoriametrics.com/victorialogs/faq/
- https://clickhouse.com/docs/operations/utilities/clickhouse-local
- https://clickhouse.com/docs/install
- https://quickwit.io/docs/overview/introduction
- https://quickwit.io/blog/quickwit-joins-datadog
- https://github.com/quickwit-oss/quickwit
- https://api.github.com/repos/quickwit-oss/quickwit/releases?per_page=3
- https://duckdb.org/docs/2.0/core_extensions/postgres/overview.html
- https://duckdb.org/docs/2.0/core_extensions/sqlite.html
- https://duckdb.org/docs/2.0/connect/concurrency.html
- https://duckdb.org/docs/2.0/operations_manual/securing_duckdb/overview.html
- https://docs.peerdb.io/
- https://docs.peerdb.io/architecture
- https://clickhouse.com/docs/integrations/clickpipes
- https://clickhouse.com/blog/postgres-cdc-year-in-review-2025
- https://docs.pingcap.com/tidb/stable/hardware-and-software-requirements/
- https://docs.pingcap.com/tidb/stable/telemetry/
- https://github.com/citusdata/citus
- https://github.com/hydradatabase/hydra
- https://grafana.com/docs/loki/latest/configure/
- https://hub.docker.com/r/clickhouse/clickhouse-server
- https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy
- https://clickhouse.com/docs/updating-data/overview
- https://clickhouse.com/docs/operations/system-tables/query_log
- https://www.sqlite.org/fts5.html
- https://www.postgresql.org/docs/current/textsearch-indexes.html
- WebSearch: ClickHouse telemetry/crash reports; ClickHouse docker idle memory; chDB 2026; pg_duckdb 2026; Postgres-to-ClickHouse thresholds; Postgres CDC ClickHouse pitfalls; Quickwit Datadog; just-use-Postgres cost

## Anomalies
- WebFetch summarises pages with a small model, and several answers were partial (pages longer than 100,000 characters were read only in part). Facts rely on quotes returned by the tool, not on my own reading of the full page text.
- The ClickHouse server-settings docs page did not expose send_crash_reports; the fact comes from the master config.xml in the GitHub repo instead. The second half of config.xml was read for send_crash_reports but I could not independently confirm whether a packaged release overrides the master default.
- duckdb.org/docs/stable/* pages returned redirect notices to /docs/2.0/, so DuckDB facts cite the 2.0 docs.
- Several search-result summaries (practitioner thresholds, 'just use Postgres', chDB version via dev.co) were not read at page level and are marked reported or blog. The chDB version fact was upgraded to verified only because the GitHub README fetch also showed it.
- The Quickwit GitHub README fetch said 'Quickwit 0.8' with an empty Releases section, while the GitHub API listing showed v0.9.1-v0.9.3 in Sept-Oct 2026. The API result was used as the more current source.
- The Quickwit docs page contradicts itself about aggregation support; not resolved.
- The fetch for the ClickPipes page lists self-managed Postgres as a supported source, but the page does not literally say 'Cloud only'. The 'third-party egress' conclusion rests on the FAQ describing it as 'a ClickHouse Cloud feature' (inference marked in the fact).
