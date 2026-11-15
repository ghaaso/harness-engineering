# recheck:E-02

lane=E-02 tool_status=ok checks=15

- F03 ON_PAGE — https://duckdb.org/docs/2.0/core_extensions/full_text_search.html
    quote: By default, the FTS index will not update automatically when the input table changes. ... Okapi BM25 ... k defaults 1.2, b 0.75; stemmer 'Defaults to porter', 'none' allowed; incremental via triggers; NOT NULL or PRIMARY KEY
    note: All parts supported; schema named after the input table (example fts_main_table_name); id must be NOT NULL or PRIMARY KEY.
- F04 ON_PAGE — https://duckdb.org/docs/2.0/core_extensions/vss.html
    quote: we still recommend that you do not use this feature in production environments. ... every time DuckDB performs a checkpoint the entire index will be serialized to disk and overwrite itself.
    note: VSS docs support every claim (in-memory default, WAL recovery, not buffer managed, memory_limit, compaction, FLOAT only).
- F04 ON_PAGE — https://github.com/duckdb/duckdb-vss
    quote: This is an experimental extension for DuckDB that adds indexing support to accelerate Vector Similarity Search ... serves as a proof of concept for providing a custom index type
    note: README supports the experimental/proof-of-concept claim.
- F05 PARTIAL — https://duckdb.org/docs/2.0/connect/concurrency.html
    quote: Writing to DuckDB's native database format from multiple processes is supported through the Quack remote protocol.
    note: MVCC/optimistic, Quack, DuckLake+Postgres catalog, and same-row conflict supported. Page does not mention quack_serve or ATTACH 'quack:host'; READ_ONLY attach is implied via access_mode not stated as 'only'; rerun is a 'common workaround'.
- F05 PARTIAL — https://duckdb.org/2026/10/21/announcing-duckdb-200
    quote: By default, the server only listens on localhost. ... keep the server on localhost and put it behind a TLS-terminating reverse proxy.
    note: Localhost default and TLS proxy supported. Post does not mention multi-process writes via Quack.
- F06 ON_PAGE — https://registry.npmjs.org/@duckdb/node-api/latest
    quote: version 2.0.0-r.1; license MIT; dependency @duckdb/node-bindings 2.0.0-r.1
    note: Supports version, MIT, and dependency.
- F06 ON_PAGE — https://duckdb.org/docs/2.0/clients/node_neo/overview.html
    quote: Some features are not yet complete: Binding and appending the MAP and UNION data types; User-defined types & functions; APIs for Arrow
    note: Platforms windows_amd64/arm64, linux (amd64, arm64, musl variants), osx listed. Page does not say 'glibc' (non-musl entries) or 'promise-based' explicitly; examples use async/await.
- F06 NOT_ON_PAGE — https://github.com/duckdb/duckdb-node-neo
    quote: Node bindings to the DuckDB C API, plus a friendly API for using DuckDB in Node applications.
    note: Repo page does not mention the incomplete features or promise-based API; those are covered by the docs page instead.
- F07 ON_PAGE — https://duckdb.org/docs/2.0/core_extensions/sqlite.html
    quote: Attached SQLite databases support both read and write operations.
    note: INSERT/UPDATE/DELETE/ALTER/transactions, strict typing mismatch error, BUSY_TIMEOUT default 5000, autoload all supported. Page documents only BUSY_TIMEOUT and JOURNAL_MODE options; no READ_ONLY flag mentioned, consistent with the fact's caveat. The SQLite-locking sentence is a general claim, not clearly quoted.
- F11 ON_PAGE — https://github.com/kuzudb/kuzu
    quote: This repository was archived by the owner on Oct 10, 2025. ... Kuzu is working on something new!
    note: Archive date, README note, v0.11.3, MIT, 4.0k stars all supported.
- F11 ON_PAGE — https://uwaterloo.ca/computer-science/news/waterloo-based-graph-database-start-up-kuzu-acquired-apple
    quote: Apple reached an agreement in October 2025 to purchase all shares of the company and hire select members of its team.
    note: Page dated Feb 24, 2026. Does not discuss Apple not having announced it or EU filing.
- F11 NOT_ON_PAGE — https://www.theregister.com/2025/10/14/kuzudb_abandoned/
    quote: some users speculated that a note reading 'Kuzu is working on something new' suggests an impending acquisition or shift in focus
    note: Article does not name Apple, EU filing, or an offline website (says docs/blog moved to GitHub).
- F15 ON_PAGE — https://docs.lancedb.com/search/full-text-search
    quote: Rows you add after building an FTS index aren't part of the index until you optimize the table.
    note: BM25, TS API, no legacy Tantivy-only params, default stem true/English, flat scan of unindexed, optimize after ~100,000 row changes or 20 modification operations all supported. Default-stemming is only inferred from the defaults list.
- F16 PARTIAL — https://docs.lancedb.com/tables/versioning
    quote: optimize() can prune older versions based on its retention setting (cleanup_older_than, 7 days by default).
    note: New versions, restore, tags kept from pruning, writable branches, 7-day default supported. Page says checkout/checkout_latest/list_versions do not create versions (consistent with the fact). The 'not per-entry outcome semantics' conclusion is the agent's inference, not on the page.
- F18 PARTIAL — https://docs.lancedb.com/faq/faq-oss
    quote: For small datasets of ~100K records or applications that can accept ~100ms latency, a vector index is usually not necessary.
    note: All LanceDB scale statements supported (>1M index, millions on one node, Enterprise for hundreds of millions). The 'tens to hundreds of entries is 3-4 orders of magnitude below' claim is the agent's inference, not on the page.
