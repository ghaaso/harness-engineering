# recheck:E-08

lane=E-08 tool_status=ok checks=7

- f1 ON_PAGE — https://github.com/kuzudb/kuzu
    quote: This repository was archived by the owner on Oct 10, 2025. It is now read-only. ... we have a new release 0.11.3 that bundles many (but not all) of the extensions.
    note: Archive date, MIT, 'working on something new', v0.11.3 and self-hosted extension server all confirmed.
- f3 PARTIAL — https://github.com/LadybugDB/ladybug ; https://github.com/LadybugDB/ladybug/releases ; web search summary
    quote: an embedded graph database built for query speed and scalability
    note: Confirmed: MIT, Cypher, bindings (Python, Node, Rust, Go, Swift, Java, C/C++, CLI, Wasm), no MCP mention on page, releases v0.22.1 (28 Oct), v0.22.0 (25 Oct), v0.21.2 (01 Oct), year taken from asset timestamps. Not checkable from these pages: the @ladybugdb/core package name, the 0.17.1 June 2026 figure, and the web-search claims (no MCP server, no stable Python release). The Python page gives only a pip install command and says nothing on stability.
- f4 ON_PAGE — https://github.com/cozodb/cozo ; https://api.github.com/repos/cozodb/cozo ; https://github.com/cozodb/cozo/releases
    quote: Versions before 1.0 do not promise syntax/API stability or storage compatibility.
    note: MPL-2.0, 'still very young', backends (in-memory, SQLite, RocksDB, Sled, TiKV), pushed_at 2024-12-04, archived false, 48 open issues, v0.7.6 dated 2023-12-11, Windows exe assets all confirmed. The releases page lists no Node or Python assets, but 85 assets exist and only some were visible.
- f6 PARTIAL — https://neo4j.com/licensing/ ; https://neo4j.com/docs/operations-manual/current/configuration/configuration-settings/
    quote: Usage data reporting. Valid values: boolean. Default value: true
    note: GPL v3 for Community Edition and the 'free and internal, non-production use' wording are on the licensing page, though the fetch summary attached that wording to developer offerings generally. The usage_report setting (default true, no detail on what is sent) is confirmed. The JVM and heap auto-sizing claim is not on the part of the settings page that was read (the first 100k of 200k characters).
- f9 ON_PAGE — https://memgraph.com/docs/database-management/configuration
    quote: Set to 0 to use the default values which are 100% of the physical memory if the swap is enabled ... and 90% of the physical memory otherwise.
    note: Telemetry default true and the three collected categories are confirmed. Default storage mode IN_MEMORY_TRANSACTIONAL is confirmed.
- f16 ON_PAGE — https://www.sqlite.org/lang_with.html ; https://www.sqlite.org/releaselog/3_8_3.html
    quote: The ability for the recursive-select to be a compound was added in version 3.34.0 (2020-12-01).
    note: UNION and UNION ALL semantics, the FIFO caveat, ORDER BY giving DFS or BFS, and the LIMIT safety advice are all on lang_with. The 3.8.3 release log gives 2014-02-03 and CTE support.
- f18 PARTIAL — https://www.postgresql.org/message-id/E1x3f62-00000003sxD-0vdk@gemulon.postgresql.org ; https://www.depesz.com/?p=4467
    quote: pgsql: Revert SQL Property Graph Queries (SQL/PGQ) ... 2026-09-07 ... master ... 124 files changed, 77 insertions(+), 15,859 deletions(-)
    note: The revert (Eisentraut, 2026-09-07, master, 124 files, 15,859 deletions, no reason given) and the 16 March 2026 original commit date (from depesz) are confirmed. Two parts fail. The notice says it reverts 49 commits, not 124 (124 is the file count). 'Without variable-length path quantifiers' is not stated by depesz, and only commenters imply it. REL_19_STABLE is not mentioned on either page.
