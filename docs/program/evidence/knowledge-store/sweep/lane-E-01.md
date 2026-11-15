# lane:E-01

lane=E-01 tool_status=ok facts=23 candidates=11

## Summary
SQLite is a strong fit for this workload and the cheapest engine in ops terms. node:sqlite ships inside the Node 24 already on the box (verified locally: Node v24.22.1, SQLite 3.53.4, FTS5, JSON, sessions and trigram all work). It needs no installs and has no egress. FTS5 gives BM25 with per-column weights, snippet/highlight, a trigram tokenizer for substring match on error text, and external-content tables. WAL mode gave one writer plus concurrent readers, and four writer processes completed 1200 inserts with a busy_timeout. Relational tables with JSON columns and generated columns cover the entry/outcome/provenance model and the outcome analytics (tens to hundreds of entries is trivially small). Weak spots: node:sqlite is only Stability 1.2 (release candidate); FTS5 is lexical only, so fuzzy "same cause, different wording" needs several handle types plus template canonicalisation, not embeddings; sqlite-vec is pre-v1 (0.1.9 stable, 0.1.10 alphas) and brute-force, and embeddings need a local model anyway, so it is optional at this scale; WAL does not work over network filesystems, and a raw file copy of a live DB is unsafe, so back up with VACUUM INTO or the backup API rather than copying. Litestream is unofficial on Windows and only adds value on the Linux VPS, where a nightly VACUUM INTO also suffices. The MCP reference sqlite server is archived (2025-05-29); a CLI over node:sqlite, or a thin custom MCP wrapper, is the sound access path. Two worktrees pointing at one file are safe on the same host if the DB lives outside the worktrees, but must not be synced by git or a cloud-sync tool.

## Candidates
- **SQLite via node:sqlite + FTS5 (porter + trigram tables) as primary store** [engine] strong — Zero install (built into Node 24), FTS5 with BM25 weights, trigram for substring on error text, JSON/generated columns for dependency fingerprints, relational tables for entry/outcome history, GROUP BY analytics for hit/refute rates. One file, no daemon, no egress. Risks: node:sqlite is only release-candidate stability, and API drift across Node versions; mitigated by a thin abstraction layer and by better-sqlite3 as a drop-in alternative.
    egress: none: in-process library, local file | ops: low | win: Verified working on this box (Node 24.22.1, SQLite 3.53.4, FTS5, trigram, WAL, multi-process writes). | linux: Same code runs unchanged on Node 24 on Linux; WAL requires a local filesystem, not NFS. | access: CLI built on node:sqlite or a purpose-built MCP server; direct file access from any worktree on the same host | footprint: One .db file plus -wal/-shm; no daemon | maturity: SQLite itself decades old; node:sqlite Stability 1.2 release candidate | facts: F01, F02, F04, F05, F08, F10
- **better-sqlite3 as the driver behind the abstraction layer** [tool] viable — Stable, synchronous API; reportedly ships win32 x64/arm64 prebuilds in the npm package with FTS5/JSON1 compiled in. But it needs an npm install (prebuilt native module in the repo's dependency tree), which this research may not do, and it brings no capability node:sqlite lacks for this workload. Keep as a fallback if node:sqlite proves unstable.
    egress: none | ops: low | win: Prebuilt win32 x64 reported in package exports; not verified by install. | linux: Prebuilds for linux and linuxmusl reported. | access: Same as node:sqlite via CLI/MCP wrapper | footprint: Native addon in node_modules | maturity: Mature, v13.0.3 (2026-08-05) | facts: F17, F15
- **FTS5 trigram tokenizer over canonicalised error/log templates** [technique] strong — Handles partial identifiers, paths and error-code fragments with indexed LIKE/GLOB and MATCH; combine with a porter/unicode61 table over symptom prose and weighted bm25 across handle columns (error template, symptom prose, tool name, file path) for precision-tuned retrieval. Limits: queries under 3 characters match nothing; remove_diacritics disables LIKE/GLOB.
    egress: none | ops: low | win: Verified locally | linux: Identical | access: Any SELECT ... MATCH query through the CLI/MCP layer | footprint: Index larger than content (trigrams); trivial at hundreds of rows | maturity: Trigram since 3.34.0 (2020-12-01) | facts: F04, F05, F06, F07
- **sqlite-vec (vec0) for semantic similarity of symptoms** [tool] weak — Pre-v1 with breaking-change warning, and brute-force scale is irrelevant here. The real cost is producing embeddings: that needs a model, and a hosted embedding API would send defect text to a third party (disqualified); a local model adds a runtime and install burden. At tens to hundreds of entries, multiple lexical handle types plus canonicalisation probably beat the added complexity. Revisit only if measured miss rate on paraphrased symptoms is unacceptable.
    egress: none for the extension itself; embedding generation is the egress risk (must be local-only) | ops: medium | win: windows-x64 loadable and npm platform package exist; load via node:sqlite allowExtension not tested locally. | linux: linux-x64 and linux-arm64 packages exist | access: Via same SQL layer | footprint: Small C extension, one more native binary to pin | maturity: Pre-v1: 0.1.9 stable, 0.1.10 alphas | facts: F13, F14, F15, F16, F23
- **sqlite-vss** [tool] rejected — Repository states it is not in active development; superseded by sqlite-vec.
    egress: none | ops: high | win: - | linux: - | access: - | footprint: - | maturity: Deprecated | facts: F16
- **Litestream replication** [tool] viable — Cheap continuous backup for the Linux production box (streams WAL to a local path or a self-controlled object store). Not needed on the dev box (Windows is unofficial) and at this data size a scheduled VACUUM INTO or backup() copy is simpler. Only adopt if the store becomes production-critical on the VPS.
    egress: none if target is a local path or self-hosted store; third-party S3 would egress | ops: medium | win: Unofficial; use at own risk | linux: Officially supported (Linux/macOS) | access: Transparent to agents | footprint: Extra daemon process plus config | maturity: v0.5.x active | facts: F18, F11
- **LiteFS** [tool] rejected — FUSE-based multi-node replication in beta; designed for clusters, orders of magnitude beyond one developer and one box. Adds ops burden for no benefit.
    egress: none, but multi-node | ops: high | win: - | linux: - | access: - | footprint: - | maturity: Beta | facts: F19
- **modelcontextprotocol reference sqlite MCP server** [tool] rejected — Archived 2025-05-29 and unmaintained; a generic SQL passthrough is also the wrong interface for a lookup/verify/record workflow.
    egress: none | ops: medium | win: - | linux: - | access: - | footprint: - | maturity: Archived | facts: F20
- **Community SQLite MCP servers (StacklokLabs/sqlite-mcp, 0xOmarA/mcp-server-sqlite, FastMCP explorers)** [tool] weak — Small projects with read-only modes, but unclear maintenance, no releases/stars to speak of, and generic SQL execution. Better to write a thin purpose-built MCP server (or plain CLI) with named operations over node:sqlite, and use these only as design references for read-only gating.
    egress: none (local) | ops: medium | win: - | linux: - | access: - | footprint: - | maturity: Low adoption | facts: F21, F22
- **Single shared DB file at a fixed absolute path, WAL mode, busy_timeout, short write transactions** [pattern] strong — Matches the concurrency need (few writes, many readers, parallel worktrees on one host). Keep the file outside worktrees, out of git and out of cloud-sync folders, set busy_timeout, and back up with VACUUM INTO or backup() plus a git-tracked export (JSONL/SQL dump) as the portable, reviewable snapshot.
    egress: none | ops: low | win: Multi-process write test passed on this box | linux: Fine on local disk; not on NFS | access: Agents call the CLI/MCP; no direct file editing | footprint: One file, three with WAL | maturity: Standard practice | facts: F09, F10, F11, F12
- **node:sqlite session extension for append-only change export** [technique] cite_design_only — createSession/changeset could ship entry changes between machines, but at this scale a periodic dump to a git-tracked export is simpler and human-reviewable. Cite as an option if two machines ever write independently.
    egress: none | ops: medium | win: - | linux: - | access: - | footprint: - | maturity: Present in node:sqlite, RC stability | facts: F03, F22

## Design implications
- (strong) SQLite is a sufficient single engine for the OLTP, search and analytics workloads at this scale; there is no case for a separate search or OLAP engine for the first year. [F02, F05, F23]
- (strong) Put the store behind a narrow abstraction (lookup, verify-info, record-outcome, revise, invalidate) so the driver (node:sqlite vs better-sqlite3) can be swapped. node:sqlite is only release-candidate stable and its API has changed across 22.x-24.x. [F01, F03, F17]
- (strong) Give each entry several handle columns (canonicalised error template, symptom prose, tool/platform tags, file paths/symbols) in separate FTS5 columns and use weighted bm25 per column. Use a trigram table over raw and canonicalised error text for fragment matching, and require at least 3 characters. [F04, F05, F06]
- (moderate) Store dependency fingerprints (file paths with content hashes, symbol names, package versions, platform) as JSON or child rows so event-driven invalidation is a SQL join against 'what changed'. Use an outcomes table (confirmed, refuted, invalidated, revised) for provenance and rate analytics via GROUP BY. [F08, F07]
- (strong) Concurrent agents are safe with WAL, busy_timeout and short write transactions on one file at a fixed absolute path outside the worktrees. The file must stay on a local disk (no network FS) and out of git and sync folders. Read paths should not hold long transactions, to avoid checkpoint starvation. [F09, F10, F11, F12]
- (moderate) Back up with VACUUM INTO or backup(), never a raw copy of a live DB. Also commit a deterministic text export (JSONL) of entries and outcomes to git as the reviewable, mergeable source of record and rebuild path. Litestream is an optional production add-on on Linux only. [F11, F18]
- (strong) Expose the store through a purpose-built CLI first, with a thin MCP wrapper offering named operations and a read-only mode for cheap agents, since the reference SQLite MCP server is archived and community ones are generic SQL passthroughs. [F20, F21, F22]
- (moderate) Defer vector search. If later needed, sqlite-vec loads via node:sqlite allowExtension and has Windows and Linux builds, but is pre-v1 and requires a strictly local embedding model to preserve the no-egress rule. [F13, F14, F15]

## Rejected paths
- sqlite-vss for vector search — Marked not in active development; sqlite-vec is the successor.
- LiteFS replication — FUSE-based multi-node beta system; large ops burden for a single developer and one host.
- Archived modelcontextprotocol sqlite MCP server — Archived 2025-05-29, unmaintained.
- Copying the .db file as a backup while agents may be writing — Can yield a corrupt mixed-state copy; the -wal file must travel with it.
- One DB file per worktree — Entries diverge and would need merging; defeats a shared store (inferred).
- Placing the DB on a network share or cloud-synced folder — WAL requires same-host shared memory and locks are unreliable on network filesystems; sync tools can copy mid-transaction.

## Facts
- F01 [LOAD-BEARING] (verified, primary_docs; engine/ops_cost/access) node:sqlite is Stability 1.2 (release candidate) in the Node 24.x docs; no flag required since v22.13.0/v23.4.0; added v22.5.0; 'only available under the node: scheme'.
    https://nodejs.org/docs/latest-v24.x/api/sqlite.html (read 2026-11-02)
- F02 [LOAD-BEARING] (verified, local_file; engine/retrieval/ops_cost/access) On this Windows box, Node v24.22.1 bundles SQLite 3.53.4 with ENABLE_FTS5, ENABLE_SESSION, ENABLE_RTREE, ENABLE_GEOPOLY, ENABLE_DBSTAT_VTAB, ENABLE_MATH_FUNCTIONS; JSON functions work; FTS5 trigram table creation and MATCH work; new DatabaseSync(':memory:',{allowExtension:true}) constructs without error. Actual loadExtension of a .dll was NOT tested (none present).
    local probe: node -e with node:sqlite, process.versions.sqlite, PRAGMA compile_options (run 2026-11-02)
- F03 (verified, primary_docs; engine/access/ops_cost) node:sqlite extension loading: DatabaseSync option allowExtension (default false) must be true at construction; then loadExtension(path[,entryPoint]) (added v22.13.0/v23.5.0) and enableLoadExtension(bool) work; if allowExtension is false it cannot be enabled later. Also available: backup() (v23.8.0, async, Promise<pages>), createSession/applyChangeset (v22.12.0/v23.3.0), enableDefensive (v24.12.0; defensive on by default since v24.14.0).
    https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- F04 [LOAD-BEARING] (verified, primary_docs; retrieval/canonicalisation) FTS5 trigram tokenizer: substrings under 3 unicode characters match nothing in a full-text query; options case_sensitive (default 0) and remove_diacritics (default 0, may be 1 only if case_sensitive=0); indexed LIKE/GLOB supported unless remove_diacritics is set (a case-sensitive index supports GLOB only; LIKE with ESCAPE cannot use the index); LIKE/GLOB patterns with no run of 3+ literal chars fall back to a linear scan. Trigram support added in SQLite 3.34.0 (2020-12-01). Locally confirmed: query 'co' returns 0 rows, 'connre' matches 'ECONNRESET'.
    https://www.sqlite.org/fts5.html#the_trigram_tokenizer ; https://www.sqlite.org/releaselog/3_34_0.html ; local probe
- F05 [LOAD-BEARING] (verified, primary_docs; retrieval) FTS5 bm25(): constants hard-coded k1=1.2, b=0.75; returns lower-is-better (negated) scores so ORDER BY bm25(t) is best-first; per-column weights passed positionally e.g. bm25(email,10.0,5.0), unspecified columns default 1.0; rank MATCH 'bm25(...)' form is faster. highlight(t,col,open,close) and snippet(t,col,open,close,ellipsis,max_tokens 1..64) exist. Locally confirmed bm25 with weights and snippet run on node:sqlite.
    https://www.sqlite.org/fts5.html#the_bm25_function ; local probe
- F06 (verified, primary_docs; retrieval/canonicalisation) FTS5 tokenizers: unicode61 is default (options remove_diacritics 0/1/2, categories, tokenchars, separators); porter wraps another tokenizer for English stemming; tokenchars lets identifiers like ECONNRESET or my_func.name stay one token. Multiple FTS tables with different tokenizers (porter for prose, trigram for raw error/stack text) can sit over the same content table.
    https://www.sqlite.org/fts5.html (sections 4.3.1, 4.3.3)
- F07 (verified, primary_docs; data_model/retrieval) FTS5 external-content tables (content=, content_rowid=) read columns from another table; the user must keep the index consistent (triggers suggested; UPDATE = delete+insert; triggers do not backfill; 'rebuild' command recovers). prefix='2 3' creates prefix indexes; without them prefix queries need a range scan. detail=full|column|none trades index size (743/340/134 MiB in the docs example) against phrase/NEAR support. Newer: secure-delete (3.42.0), contentless-delete (3.43.0).
    https://www.sqlite.org/fts5.html (sections 4.2, 4.4.3, 4.6)
- F08 (verified, primary_docs; data_model/invalidation/provenance) JSON: functions built in by default since 3.38.0 (2022-02-22); -> and ->> operators since 3.38.0; JSONB binary format since 3.45.0; json_each/json_tree since 3.9.0; json_valid(X,Y) bitmask. Locally json_extract works as a generated column expression and in WHERE. JSON text/JSONB lookups are O(N) (no O(1) element lookup); indexing JSON is via expression index or generated column (not documented on the JSON page itself).
    https://www.sqlite.org/json1.html ; local probe
- F09 [LOAD-BEARING] (verified, primary_docs; concurrency/ops_cost) WAL mode (since 3.7.0): readers do not block writers and vice versa, readers get snapshot isolation, only ONE writer at a time; all processes must be on the same host, WAL does not work over a network filesystem; -wal and -shm files must travel with the DB; automatic checkpoint at 1000 pages, long-lived overlapping readers can starve checkpoints; read-only WAL access works from 3.22.0 if -shm/-wal exist or directory is writable or immutable=1. WAL mode persists in the DB file.
    https://www.sqlite.org/wal.html
- F10 [LOAD-BEARING] (verified, local_file; concurrency) Local concurrency test on Windows 11 / Node 24.22.1: in WAL mode a second connection saw the pre-commit snapshot (0 rows) during an open write transaction and the row after commit; 4 separate OS processes each inserting 300 rows with busy_timeout=10000 all succeeded (1200 rows total, no SQLITE_BUSY). A second writer on the same thread while an immediate transaction was open got 'database is locked' (expected, one writer).
    local probe in scratchpad (deleted afterwards), 2026-11-02
- F11 [LOAD-BEARING] (verified, primary_docs; ops_cost/concurrency/engine) Backup safety: a raw file copy is safe only if no transaction is in progress; the -wal/-journal file must be copied with the DB; copying a live DB can yield a corrupt mixed-state copy. Safe methods named: backup API, VACUUM INTO, sqlite3_rsync (3.47.0+). Separating a DB from its WAL can lose committed transactions. The page does not discuss Dropbox/OneDrive by name, but file-level sync tools can cause exactly these failure modes (inferred).
    https://www.sqlite.org/howtocorrupt.html (sections 1.2-1.4) ; https://www.sqlite.org/wal.html
- F12 [LOAD-BEARING] (inferred, inferred; concurrency/workflow/ops_cost) Two git worktrees (or subagents) on the same Windows host can safely share one SQLite file in WAL mode if the file lives at a fixed absolute path outside any worktree and is not tracked by git or synced by a cloud tool; the per-worktree alternative (a DB inside each worktree) would diverge and need merging. Git tracking of a binary DB file would create merge conflicts. Not separately tested across two worktree directories, but the 4-process test used one file path.
    inference from F09, F10, F11
- F13 [LOAD-BEARING] (verified, source_repo; engine/retrieval/ops_cost) sqlite-vec: pre-v1 ('expect breaking changes'), Apache-2.0/MIT, pure C no deps, sponsored by Mozilla Builders et al.; npm dist-tags latest=0.1.9, alpha=0.1.10-alpha.4 (GitHub prerelease published 2026-05-18, includes loadable-windows-x86_64 asset); npm package has windows-x64, linux-x64, linux-arm64, darwin optional platform packages. Declared a successor to sqlite-vss.
    https://github.com/asg017/sqlite-vec ; https://registry.npmjs.org/sqlite-vec ; https://api.github.com/repos/asg017/sqlite-vec/releases
- F14 (verified, primary_docs; retrieval/limits) sqlite-vec storage/query: vec0 virtual tables hold float/int8/binary vectors; KNN via 'WHERE vec MATCH :q AND k = N' (LIMIT works on SQLite 3.41+); distance default L2, cosine via distance_metric=cosine; metadata columns (TEXT/INTEGER/FLOAT/BOOLEAN, max 16, operators = != > >= < <= only, strings over ~12 chars inefficient) can filter KNN; partition keys (max 4) restrict search; auxiliary '+' columns are not filterable. Docs do not state brute-force vs ANN explicitly (the manual vec_distance_* query is called brute-force); no ANN statement found.
    https://alexgarcia.xyz/sqlite-vec/features/vec0.html ; .../features/knn.html ; .../api-reference.html
- F15 (verified, primary_docs; access/engine) Loading sqlite-vec from Node: with node:sqlite, new DatabaseSync(path,{allowExtension:true}) then sqliteVec.load(db) (docs say node:sqlite needs Node 23.5.0+); vectors bound as Uint8Array(float32.buffer); with better-sqlite3, bind Float32Array directly. The docs page is marked work-in-progress. Loading was not executed locally (nothing may be installed).
    https://alexgarcia.xyz/sqlite-vec/js.html
- F16 (verified, source_repo; engine) sqlite-vss repository carries a notice that it 'is not in active development' and points users to sqlite-vec.
    https://github.com/asg017/sqlite-vss
- F17 (reported, source_repo; engine/ops_cost) better-sqlite3 v13.0.3 (2026-08-05): engines node >=22; package.json exports prebuilt entries for linux, linuxmusl, darwin and win32 (x64 and arm64) shipped inside the npm package under prebuilds/** (no prebuild-install; GitHub release assets are empty); bundled SQLite 3.53.4 with SQLITE_ENABLE_FTS5, JSON1, FTS3/4, STAT4, GEOPOLY, MATH_FUNCTIONS, DESERIALIZE, DBSTAT_VTAB. Not installed or run locally; read via a summarising fetch of raw package.json and docs/compilation.md.
    https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/package.json ; https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/docs/compilation.md ; https://api.github.com/repos/WiseLibs/better-sqlite3/releases
- F18 (verified, source_repo; ops_cost/egress/engine) Litestream: streams SQLite changes (WAL-based) to cloud storage or local files as a separate process, no app changes; v0.5.x line (latest tag seen v0.5.17); release notes state 'Windows binaries are provided for convenience but Windows is NOT an officially supported platform' (use at own risk). It sends data to object storage, so egress depends on choosing a self-controlled target (local path, own MinIO/SFTP-style target, not a third-party S3).
    https://litestream.io/ ; https://github.com/benbjohnson/litestream/releases/tag/v0.5.17
- F19 (verified, source_repo; ops_cost/engine) LiteFS (superfly): FUSE-based filesystem replicating SQLite across a cluster; README says actively maintained but in beta; platform support not stated, design relies on FUSE (Linux-oriented). Built for multi-node clusters, orders of magnitude beyond one dev plus one VPS.
    https://github.com/superfly/litefs
- F20 [LOAD-BEARING] (verified, source_repo; access) The modelcontextprotocol reference SQLite MCP server was archived: modelcontextprotocol/servers-archived says the repository 'was archived by the owner on May 29, 2025' and 'no longer maintained' (SQLite, PostgreSQL, Git, GitHub, Redis, Slack and others).
    https://github.com/modelcontextprotocol/servers-archived
- F21 (reported, source_repo; access) Community SQLite MCP servers exist but are small and of unclear maintenance: StacklokLabs/sqlite-mcp (Go, Apache-2.0, SSE transport, tools execute_query/execute_statement/list_tables/describe_table, read-only unless -read-write, 16 stars, no releases, FTS5/extension support not mentioned); 0xOmarA/mcp-server-sqlite (Rust, claims read-only default and allow/deny rules); hannesrudolph sqlite-explorer-fastmcp (Python, read-only, about 105 stars, reported). Generic SQL passthrough is also the wrong abstraction for a symptom-lookup store.
    https://github.com/stackloklabs/sqlite-mcp ; web search results (glama.ai, github.com/0xOmarA/mcp-server-sqlite)
- F22 (inferred, inferred; access/workflow/provenance) node:sqlite is synchronous (DatabaseSync); the session extension is compiled in and exposes changeset/patchset/applyChangeset, which could ship entry diffs between machines or export an append-only outcome log. A thin MCP server (TypeScript SDK) or CLI can expose purpose-built tools (lookup, verify, record_outcome) over the same file; read-only by opening with readOnly or restricting to SELECT is the caller's responsibility.
    https://nodejs.org/docs/latest-v24.x/api/sqlite.html ; inference for MCP tool design
- F23 (inferred, inferred; limits/ops_cost) Scale check: FTS5, detail options and sqlite-vec figures are aimed at databases of hundreds of MiB to many GiB; tens to a few hundred entries is roughly 4-6 orders of magnitude below that, so even linear scans, trigram indexes and brute-force vector scans cost milliseconds (inferred from sizes quoted in the FTS5 docs; no benchmark run).
    https://www.sqlite.org/fts5.html (detail table sizes); inference

## Open questions
- Does loadExtension of sqlite-vec's windows-x64 DLL actually work under node:sqlite 24.x on this box (not tested; nothing may be installed)?
- Is C:/Users/User/Documents synced by OneDrive on this machine? If so, the DB must live elsewhere; this lane could not check.
- What is the node:sqlite API stability policy between 24.x minors (release candidate)? Pin the Node version in the repo, and keep the better-sqlite3 fallback tested.
- Can the WAL shared-memory mechanism be relied on when worktrees run under WSL and Windows against the same path? Likely unsafe; mixed Windows/WSL access to one file was not researched.
- Which Node 24 minor first bundled which SQLite version? Only the local Node 24.22.1 value (3.53.4) was observed; the Node docs page did not state it.
- Litestream: does it support WAL files written by node:sqlite on Linux with default settings, and which self-hosted target should it use? Not researched beyond its README-level description.
- Which fuzzy-match quality can lexical FTS5 plus template canonicalisation reach on real paraphrased symptoms? Needs an experiment against a seed corpus, not a lane-E-01 literature question.

## URLs attempted
- https://www.sqlite.org/fts5.html
- https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- https://github.com/asg017/sqlite-vec
- https://api.github.com/repos/asg017/sqlite-vec/releases?per_page=8
- https://alexgarcia.xyz/sqlite-vec/js.html
- https://alexgarcia.xyz/sqlite-vec/features/vec0.html
- https://alexgarcia.xyz/sqlite-vec/features/knn.html
- https://alexgarcia.xyz/sqlite-vec/api-reference.html
- https://registry.npmjs.org/sqlite-vec
- https://github.com/asg017/sqlite-vss
- https://www.sqlite.org/wal.html
- https://www.sqlite.org/howtocorrupt.html
- https://www.sqlite.org/releaselog/3_34_0.html
- https://www.sqlite.org/json1.html
- https://github.com/WiseLibs/better-sqlite3
- https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/docs/compilation.md
- https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/package.json
- https://api.github.com/repos/WiseLibs/better-sqlite3/releases/latest
- https://api.github.com/repos/WiseLibs/better-sqlite3/releases?per_page=4
- https://github.com/modelcontextprotocol/servers-archived
- https://litestream.io/
- https://litestream.io/install/windows/
- https://github.com/benbjohnson/litestream/releases/tag/v0.5.17
- https://github.com/superfly/litefs
- https://github.com/stackloklabs/sqlite-mcp
- web search: Litestream Windows support
- web search: SQLite MCP server read-only alternatives

## Anomalies
- WebFetch uses a small summarising model, so every web-sourced fact is the summary's reading of the page, not raw text. The better-sqlite3 prebuild claim is marked reported for that reason.
- https://litestream.io/install/windows/ returned 404; Windows status comes from the GitHub release notes (v0.5.17), whose page showed only a day and month, not a year.
- The sqlite-vec GitHub releases page via the API was truncated at 100k characters, so the stable 0.1.9 release date was not obtained. Only the alpha dates (0.1.10-alpha.4 on 2026-05-18, alpha.3/alpha.2 on 2026-04-01) and the npm dist-tags were read.
- The better-sqlite3 GitHub releases API shows zero assets for v13.0.0 to v13.0.3, while package.json exports prebuilds, which implies a packaging change; the win32 prebuild claim rests on package.json only and was not verified by install.
- The Node 24 docs page was truncated at 100k of 102k characters; the bundled-SQLite version is therefore taken from the local process.versions.sqlite (3.53.4 on Node 24.22.1), not from the docs.
- In the local concurrency test, the same-thread second-writer 'database is locked' result is an artifact of one synchronous thread; it is not evidence about cross-process contention, which was tested separately (4 processes, no errors).
- Temporary probe scripts and test DBs were written only to the session scratchpad and deleted; no repository files were touched and nothing was installed.
