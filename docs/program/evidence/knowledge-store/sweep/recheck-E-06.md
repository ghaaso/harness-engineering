# recheck:E-06

lane=E-06 tool_status=ok checks=14

- F01 ON_PAGE — https://redis.io/blog/agplv3/
    quote: Adding the OSI-approved AGPL as an additional licensing option for Redis, starting with Redis 8 (available now); Integrating Redis Stack technologies, including JSON, Time Series, probabilistic data types, Redis Query Engine
    note: Published 2025-05-01, updated 2025-05-23. March 2024 SSPL move is stated; RSALv2 is not named in the fetched text.
- F03 ON_PAGE — https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/scoring/
    quote: The BM25 scorer was renamed BM25STD in Redis Open Source 8.4. BM25 is deprecated.
    note: BM25STD (default), TFIDF variants (TFIDF, TFIDF.DOCNORM) and DISMAX are all listed.
- F03 PARTIAL — https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/stemming/
    quote: The current stemming support is based on the Snowball stemmer library... Chinese tokenization is done by scanning the input text and checking every character... against a dictionary
    note: Snowball and Chinese tokenisation confirmed. The page lists 31 language entries (including chinese), which is consistent with about 30, but it does not state a count.
- F03 ON_PAGE — https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
    quote: The maximum LD for fuzzy matching is 3. ... Expansion is limited to 200 terms or less. You can change this number by using the MAXEXPANSIONS setting
    note: Prefix, infix, suffix and wildcard queries, tag filters and KNN hybrid queries are all present. The 200-term cap is described as a limit that is configurable. The page does not use the word 'default'.
- F06 ON_PAGE — https://github.com/valkey-io/valkey
    quote: Valkey can be compiled and used on Linux, macOS, OpenBSD, NetBSD, FreeBSD.
    note: BSD-3-Clause and LF Projects are both present. Windows is not mentioned.
- F06 PARTIAL — https://valkey.io/blog/introducing-valkey-search/
    quote: This first release of valkey-search focuses on vector search ... is compatible with Valkey versions 8.1.1 and above.
    note: BSD-3 and 8.1.1+ confirmed. 'Vector-only' is not exact, because hybrid queries filter on numeric and tag metadata. The 2025-07-07 date is the post date and is not explicitly tied to the first release.
- F06 PARTIAL — https://valkey.io/blog/valkey-search-1_2/
    quote: As of March 13, 2026, if you want to use Valkey Search 1.2 features on docker, use the current valkey/valkey-bundle:unstable image.
    note: Full-text (keyword, phrase, prefix, suffix, wildcard, fuzzy) and the Docker note are confirmed. FT.AGGREGATE appears in an example, but the page does not explicitly say 1.2 introduced it. The blog date 2026-03-17 was not verified. The page does not describe stemming, tokenisation, ranking or production readiness, which matches the fact's claim.
- F06 PARTIAL — https://github.com/valkey-io/valkey-search
    quote: Valkey-Search (BSD-3-Clause), provided as a Valkey module, is a high-performance Search engine...
    note: BSD-3 module is confirmed. The word 'official' is not on the page, and the page has no valkey-bundle:unstable or 1.2 mention.
- F07 ON_PAGE — https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hardware.html
    quote: The Cassandra heap should be no less than 2GB, and no more than 50% of your system RAM. ECC RAM should always be used
    note: Minimum (2 cores, 8GB), typical (8+ cores, 32GB+) and off-heap use are confirmed. Raspberry Pis are named for testing or development, and no dev/test minimum is given.
- F07 ON_PAGE — https://github.com/apache/cassandra/blob/trunk/conf/jvm-server.options
    quote: Heap size is automatically calculated by cassandra-env.sh based on the formula: min(1/2 ram, CMS ? 16G : 31G)
    note: Matches the fact.
- F09 PARTIAL — https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-faq.html
    quote: SAI produces an additional 20-35% disk usage compared with unindexed data.
    note: Everything is confirmed except that the Murmur3Partitioner text is 'SAI supports only the Murmur3Partitioner', which is a support limit rather than a stated need. The '5.0 is the only supported database' text appears as an unrendered {cass-50} placeholder.
- F10 ON_PAGE — https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html
    quote: Apache Cassandra in contrast de-normalizes data by duplicating data in multiple tables for a query-centric data model.
    note: Query-driven modelling, no joins and partition focus are confirmed. The phrase 'one table per query' is not used verbatim, but 'each query is backed by a table' is.
- F10 ON_PAGE — https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
    quote: Cassandra, like Dynamo, chooses not to provide cross-partition transactions.
    note: Consistency levels, W + R > RF, multi-master replication, last write wins, and single-partition lightweight transactions are all confirmed. The exact phrase 'read-your-writes' is not used.
- F12 ON_PAGE — https://www.scylladb.com/source-available-faq
    quote: ScyllaDB OSS AGPL 6.2.x will stand as the final OSS AGPL release. ... we may add a license manager; if so, paid and free usage of ScyllaDB Enterprise will require a license key.
    note: The 10TB and 50 vCPU limits, the Docker terms and the telemetry statement are all confirmed. The 'Enterprise 2025.1' version label was not seen verbatim in the fetched answer. The fetch did not check whether the page is dated Dec 2024.
