# recheck:E-01

lane=E-01 tool_status=ok checks=13

- F01 ON_PAGE — https://nodejs.org/docs/latest-v24.x/api/sqlite.html
    quote: Stability: 1.2 - Release candidate. Added in: v22.5.0. This module is only available under the `node:` scheme. v23.4.0, v22.13.0: SQLite is no longer behind `--experimental-sqlite`
    note: All parts supported.
- F04 ON_PAGE — https://www.sqlite.org/fts5.html#the_trigram_tokenizer
    quote: Substrings consisting of fewer than 3 unicode characters do not match any rows when used with a full-text query. If a LIKE or GLOB pattern does not contain at least one sequence of non-wildcard unicode characters, FTS5 falls back to a linear scan
    note: Options, LIKE/GLOB, ESCAPE all supported. Case-sensitive index: GLOB only. Local probe not checkable here.
- F04 ON_PAGE — https://www.sqlite.org/releaselog/3_34_0.html
    quote: Enhanced FTS5 to support trigram indexes. (Release 3.34.0 On 2020-12-01)
    note: Page says 'trigram indexes' not 'tokenizer'; date confirmed.
- F04 NOT_A_URL — local probe
    quote: n/a
    note: Local probe, not fetched.
- F05 ON_PAGE — https://www.sqlite.org/fts5.html#the_bm25_function
    quote: k1 and b are both constants, hard-coded at 1.2 and 0.75 respectively. ... remaining columns are assigned a weight of 1.0. ... using "rank" is faster than using bm25().
    note: Negation, weights, highlight, snippet max tokens 'greater than zero and equal to or less than 64' all supported.
- F05 NOT_A_URL — local probe
    quote: n/a
    note: Local probe, not fetched.
- F09 ON_PAGE — https://www.sqlite.org/wal.html
    quote: All processes using a database must be on the same host computer; WAL does not work over a network filesystem. ... there can only be one writer at a time.
    note: All sub-claims supported incl. 1000-page checkpoint, starvation, 3.22.0 read-only/immutable, persistence, 3.7.0. The 'immutable=1' wording is paraphrased from 'immutable query parameter'.
- F11 PARTIAL — https://www.sqlite.org/howtocorrupt.html
    quote: safe to make a copy of an SQLite database file as long as there are no transactions in progress ... any rollback journal or write-ahead log (the *-wal file) be copied together with the database file itself.
    note: Backup API, VACUUM INTO, sqlite3_rsync 3.47.0 supported. Page does not mention Dropbox/OneDrive (fact admits inferred). The 'lose committed transactions' wording is not on this page (it says corrupt); it is on wal.html.
- F11 ON_PAGE — https://www.sqlite.org/wal.html
    quote: If a database file is separated from its WAL file, then transactions that were previously committed to the database might be lost, or the database file might become corrupted.
    note: Supports the lost-transactions claim.
- F13 ON_PAGE — https://github.com/asg017/sqlite-vec
    quote: pre-v1, so expect breaking changes! ... Apache-2.0, MIT licenses found ... pure C, no dependencies ... A successor to sqlite-vss
    note: Mozilla Builders project confirmed; fetcher summary also listed Fly.io, Turso, SQLite Cloud, Shinkai as sponsors.
- F13 PARTIAL — https://registry.npmjs.org/sqlite-vec
    quote: dist-tags: latest 0.1.9, alpha 0.1.10-alpha.4
    note: Dist-tags confirmed. Platform packages seen only for version 0.1.4 (linux-x64, darwin-x64, linux-arm64, windows-x64, darwin-arm64); page truncated before 0.1.9/alpha.4 entries, so their optionalDependencies not verified.
- F13 ON_PAGE — https://api.github.com/repos/asg017/sqlite-vec/releases
    quote: v0.1.10-alpha.4: prerelease true, published_at 2026-05-18T06:52:26Z, asset sqlite-vec-0.1.10-alpha.4-loadable-windows-x86_64.tar.gz
    note: All supported.
- F20 ON_PAGE — https://github.com/modelcontextprotocol/servers-archived
    quote: This repository was archived by the owner on May 29, 2025. It is now read-only. ... archived reference implementations that are no longer maintained.
    note: SQLite, PostgreSQL, Git, GitHub, Redis, Slack listed.
