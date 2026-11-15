# recheck:E-05

lane=E-05 tool_status=ok checks=14

- F03 ON_PAGE — https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/programs/server/config.xml
    quote: <enabled>true</enabled> <send_logical_errors>true</send_logical_errors> <endpoint>https://crash.clickhouse.com/</endpoint>; comment: The reports are anonymized
    note: Verified by raw grep at line 2059-2067. The 'must be switched off explicitly' inference follows from the default being true.
- F03 ON_PAGE — https://clickhouse.com/docs/resources/support-center/knowledge-base/cloud-services/opt-out-core-dump-collection
    quote: Starting February 27, 2026, ClickHouse Cloud will begin collecting crash reports when server crashes occur... may include sensitive information that was in memory, such as: Connection credentials, Query strings.
    note: Supports the Cloud half in full.
- F04 ON_PAGE — https://clickhouse.com/docs/operations/utilities/clickhouse-local
    quote: clickhouse-local is also supported on Windows through WSL2. ... Only one instance can work with the same directory at a time. Pass --path to use a different location.
    note: Default app-data directory also confirmed.
- F04 PARTIAL — https://clickhouse.com/docs/install
    quote: Production server: Debian/Ubuntu, Redhat, NixOS, and Other Linux. Local development: quick install script, clickhousectl, Docker, source build.
    note: No native Windows server is listed (supported). But the page lists more than Linux packages plus Docker: also a quick install script, clickhousectl and a source build.
- F05 ON_PAGE — https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy
    quote: We recommend inserting data in batches of at least 1,000 rows, and ideally between 10,000-100,000 rows.
    note: Also confirmed: about one insert per second, too many parts errors, async shifts batching to the server, and wait_for_async_insert=0 called very risky.
- F06 PARTIAL — https://clickhouse.com/docs/updating-data/overview
    quote: I/O-heavy, rewriting all parts that match the WHERE expression ... deduplication is eventual (it only happens during merges)
    note: Mutation, ~10% lightweight-update and ReplacingMergeTree/FINAL claims are supported. The conclusion that a mutable status lifecycle is a poor fit is the agent's inference, not stated verbatim.
- F13 PARTIAL — https://docs.peerdb.io/
    quote: PeerDB is free to use and deploy. It's licensed under AGPL-3.0 license.
    note: AGPL-3.0 and free to deploy are confirmed. The word 'self-host' does not appear.
- F13 ON_PAGE — https://docs.peerdb.io/architecture
    quote: Flow ... written in Golang ... consists of a Flow API and horizontally scalable Flow Workers; Temporal orchestrates; Postgres catalog stores metadata; Nexus is a Rust-implemented service.
    note: All architecture components confirmed.
- F13 PARTIAL — https://clickhouse.com/docs/integrations/clickpipes
    quote: ClickPipes is a ClickHouse Cloud feature that makes it easy for you to connect your ClickHouse services
    note: Cloud feature and self-managed Postgres source are confirmed. 'Fully powered by PeerDB' was not found on this page (PeerDB not mentioned); the claim may live on another page.
- F14 PARTIAL — https://clickhouse.com/blog/postgres-cdc-year-in-review-2025
    quote: we support ADD/DROP COLUMN, but not CHANGE TYPE
    note: Supported: slot growth during large backfills, PK or replica identity validation, no type changes, costly reconnects re-reading from restart_lsn. NOT on page: slot invalidation, max_slot_wal_keep_size and the 200 GB advice. Slot growth is tied to backfills, not specifically schema changes.
- F18 ON_PAGE — https://duckdb.org/docs/2.0/connect/concurrency.html
    quote: Read-write mode: one process can both read and write to the database.
    note: Multiple read-only processes, Quack remote protocol, DuckLake with a PostgreSQL catalog, and multi-threaded writers in one process are all confirmed. The unsuitable-as-shared-store verdict is inference.
- F22 PARTIAL — https://www.techplained.com/clickhouse-vs-postgresql
    quote: The threshold isn't just about row count.
    note: Bands are 10M, 10M-100M and 100M+ with sub-second needs. The page does not state 50M, 5-10 s, P95 under 1 s or analytics competing with the app DB. It does say pre-computed analytics are fine in Postgres at any scale.
- F22 ON_PAGE — https://toolchew.com/en/clickhouse-vs-postgres/
    quote: consistently hit 5-10 seconds on 100M+ rows
    note: Under 50M stay on Postgres, 50M-100M ambiguous so benchmark, tune Postgres first, and 'The break-even isn't row count alone' are all confirmed. No P95 or app-DB-contention trigger was seen.
- F22 PARTIAL — https://hikmahtechnologies.com/blog/clickhouse-vs-postgres/
    quote: Do these before you add a second database. Plenty of teams never need one.
    note: Tune first, no hard numeric cutoff, query shape decides, and rollups are the most effective technique. Gives hundreds of millions of rows, not 50M-100M, and has no P95 or 5-10 s figure.
