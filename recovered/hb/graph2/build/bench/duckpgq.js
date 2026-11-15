'use strict';
// Engine bench: the DuckDB + DuckPGQ graph arm (@duckdb/node-api, DuckDB 2.0.0, duckpgq extension).
// Driver: bench/lib.js.
//   node bench/duckpgq.js run
// The arm's own code (arms/duckpgq/store.js, pgq.js, tq.js) answers every query, unchanged; this file
// opens the store with the thread setting, wraps the connection to time the engine calls, and drops
// the per-connection caches on request.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

let M = null;
function load() {
  if (!M) M = { duck: require('@duckdb/node-api'), S_: require('../arms/duckpgq/store'), pgq: require('../arms/duckpgq/pgq'), tq: require('../arms/duckpgq/tq') };
  return M;
}

const A = {
  name: 'duckpgq',
  label: 'DuckDB with the DuckPGQ extension (@duckdb/node-api), graph arm',
  needsGraph: false,
  load,
  version() { return 'DuckDB (node-api ' + JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('@duckdb/node-api/package.json')), 'package.json'), 'utf8')).version + ') with duckpgq, Node ' + process.version; },
  threadKnob: 'DuckDB instance setting threads=T at open (arms/duckpgq/pgq.js PgqGraph.open, config {threads}), read back with SELECT current_setting(\'threads\'). The arm default is the container CPU count (os.availableParallelism()).',
  how: 'In process, asynchronous client (@duckdb/node-api: every statement is a promise resolved from a DuckDB worker). Store opened READ_ONLY as the main database with memory_limit 2GB, extension loaded at open (PgqGraph.open). Ranking = PgqGraph.rank; TQ = arms/duckpgq/tq.js answer. Statements = db.all / db.run / db.changed calls.',
  caches: [
    { name: 'PageRank transition tables (trN)', where: 'DuckDB TEMP tables in the engine, keyed per (direction, classes, co-change weight, hub set) by application code (PgqGraph.cache)', classes: ['S1', 'base'], dropped_in_warm_uncached: true },
    { name: 'hub sets, native pagerank / WCC results (hbN, gprN, wcN)', where: 'DuckDB TEMP tables keyed by application code', classes: [], note: 'no timed class uses them', dropped_in_warm_uncached: true },
    { name: 'rowid map, kinds, meta (read at open)', where: 'application code (PgqGraph fields)', classes: ['all'], dropped_in_warm_uncached: false, note: 'part of open; empty only in a cold sample' },
    { name: 'DuckDB buffer manager (memory_limit 2GB)', where: 'engine', classes: ['all'], dropped_in_warm_uncached: false, note: 'engine-internal; empty only in a cold sample' },
  ],
  notComparable: [
    'Asynchronous client: every statement is a promise; the per-statement round trip (worker thread, promise, event loop) is inside engine_api and estimated apart (roundtrip_estimate).',
    'Bounded k-hop (S1, base) is a recursive SQL statement and unbounded k-hop (the primary) is iterativelength() over a CSR built inside the statement: DuckPGQ has no bounded graph traversal operator.',
    'Sums on several threads are not bit-stable (addendum 4 item 21); answers are compared with scores rounded to 1e-9 as well as exactly.',
    'The store build includes a CSV export of the canonical graph, the label tables, the arc table and two stored property graphs.',
  ],
  async build(G, root) {
    const { S_ } = load();
    fs.mkdirSync(root, { recursive: true });
    const f = S_.storeFile(G, root);
    for (const x of [f, f + '.wal']) fs.rmSync(x, { force: true });
    const t = L.now(); const parts = await S_.buildStore(G, f); const ms = L.now() - t;
    return { build_ms: ms, parts, store: f, build_threads: 'DuckDB default for the build instance (store.js connect without a threads setting)' };
  },
  async open({ store, threads }) {
    const { pgq, tq } = load();
    const g = await pgq.PgqGraph.open(store, { threads });
    const I = L.makeInstr();
    const db = g.db; const o = { all: db.all, run: db.run, changed: db.changed };
    db.all = (sql) => I.async(() => o.all(sql), sql);
    db.run = (sql) => I.async(() => o.run(sql), sql);
    db.changed = (sql) => I.async(() => o.changed(sql), sql);
    return {
      instr: I,
      rank: async (ids, cfg, seed) => (await g.rank(ids, cfg, seed)).ranked,
      tq: (q) => tq.answer(g, q),
      async drop() {
        for (const v of g.cache.values()) { const name = typeof v === 'string' ? v : v && v.name; if (name) await o.run('DROP TABLE IF EXISTS ' + name); }
        g.cache.clear();
      },
      noop: () => db.all('SELECT 1 AS x'),
      // runtime thread switch (bench/interleaved.js keeps one warm worker per engine and graph): the same
      // instance-wide scheduler setting the arm passes at open, read back after every switch
      async setThreads(T) { await o.run('SET threads = ' + T); g.threads = T; },
      async readback() { const r = await o.all("SELECT current_setting('threads') AS threads, current_setting('memory_limit') AS memory_limit"); return r[0]; },
      close: () => g.close(),
    };
  },
};

module.exports = A;
if (require.main === module) L.main(A, __filename);
