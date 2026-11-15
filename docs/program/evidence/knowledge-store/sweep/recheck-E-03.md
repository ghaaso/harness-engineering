# recheck:E-03

lane=E-03 tool_status=ok checks=7

- F01 ON_PAGE — https://www.postgresql.org/docs/current/textsearch-controls.html
    quote: the ranking functions do not use any global information, so it is impossible to produce a fair normalization to 1% or 100% as sometimes desired.
    note: All parts supported: cover density/Clarke 1999, positional info/stripped lexemes, weights defaults, normalization incl. 32, expense of reading each matching tsvector. 'Not comparable across queries' is an inference from the no-global-info statement. The '18.6' version label was not confirmed (page is 'current').
- F03 ON_PAGE — https://www.postgresql.org/docs/current/pgtrgm.html
    quote: This module is considered 'trusted', that is, it can be installed by non-superusers who have CREATE privilege on the current database.
    note: Functions, operators, thresholds 0.3/0.6/0.5, GIN/GiST opclasses, <-> efficient on GiST not GIN, LIKE/ILIKE and ~/~* support, non-alphanumerics ignored all confirmed; page does not mention non-ASCII handling, as the fact states. Version 18.6 not confirmed.
- F05 PARTIAL — https://github.com/pgvector/pgvector
    quote: With approximate indexes, filtering is applied after the index is scanned. If a condition matches 10% of rows, with HNSW and the default hnsw.ef_search of 40, only 4 rows will match on average.
    note: Confirmed: HNSW vs IVFFlat tradeoffs, 2,000/4,000 dims, Postgres 13+, post-filtering, iterative scans since 0.8.0, exact search perfect recall, RRF mention. Not clearly confirmed from fetch: the exact v0.8.7 label (fetch only referenced it indirectly), README wording 'reasonable for small filtered sets', and 'combining FTS with vectors' phrasing (only RRF/cross-encoder combining quoted). 'No vector index needed at tens-to-hundreds of rows' is an inference.
- F08 PARTIAL — https://github.com/paradedb/paradedb ; https://pgxn.org/dist/pg_search
    quote: ParadeDB Community is licensed under the GNU Affero General Public License v3.0.
    note: AGPL-3.0 for Community, Enterprise commercial, and PGXN listing pg_search as AGPL 3 confirmed. The GitHub page links the paradedb/paradedb Docker Hub repo only via a badge, does not mention :latest, default postgres/postgres credentials, or supported PG versions (fact itself concedes versions unconfirmed).
- F12 PARTIAL — https://www.postgresql.org/docs/current/sql-notify.html
    quote: the notify events are not delivered until and unless the transaction is committed. This is appropriate, since if the transaction is aborted, all the commands within it have had no effect, including NOTIFY.
    note: Confirmed: listening-only delivery, transactional, payload under 8000 bytes, 8GB queue, delivery held while listener in a transaction, no pooler coverage. Fails: page does not state that a disconnected listener misses events nor instruct resynchronising from database state; it only says the notify event means 'take a look at it to see what's new'. 'Wake-up hint not durable queue' is an inference.
- F14 PARTIAL — https://github.com/modelcontextprotocol/servers-archived ; https://securitylabs.datadoghq.com/articles/mcp-vulnerability-case-study-SQL-injection-in-the-postgresql-mcp-server/
    quote: This repository was archived by the owner on May 29, 2025. It is now read-only. No security updates or bug fixes will be provided.
    note: Archive date, read-only, no security fixes, PostgreSQL in archived list confirmed; Datadog stacked-statement COMMIT injection and fix only in an unreleased PR (reference implementation) confirmed. Fails/unverified: 'active servers repo lists no Postgres server' was not fetched; Datadog article does not mention pg_read_all_data (it only advises a restricted-privilege Postgres user).
- F23 PARTIAL — https://github.com/electric-sql/pglite
    quote: PGlite is single user/connection.
    note: Confirmed: WASM Postgres TS library, browser/Node/Bun/Deno, ~3mb gzipped, Apache-2.0/PostgreSQL dual license, filesystem persistence on Node, pgvector supported, pg_trgm not mentioned, Emscripten cannot fork/single-process. The multi-worktree concurrent-sharing conclusion is an inference, not stated on the page.
