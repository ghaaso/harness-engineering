'use strict';
// Engine bench: the relational arm on SQLite (node:sqlite, Node 24). Driver: bench/lib.js.
//   node bench/relational.js run
// The arm's own code (arms/relational/db.js, rel.js, tq.js) answers every query, unchanged; this file
// only opens the store, sets the thread knob, wraps the connection to time the engine calls, and drops
// the per-connection caches on request.
const path = require('path');
const fs = require('fs');
const L = require('./lib');

let M = null;
function load() {
  if (!M) M = { sqlite: require('node:sqlite'), db: require('../arms/relational/db'), rel: require('../arms/relational/rel'), tq: require('../arms/relational/tq') };
  return M;
}

// a DatabaseSync look-alike that times every engine call while I.on (statement execution and the
// fetch of its rows into JavaScript objects; prepare counts as engine time, not as a statement)
function wrap(raw, I) {
  const wrapStmt = (st, sql) => ({
    run: (...a) => I.sync(() => st.run(...a), sql),
    get: (...a) => I.sync(() => st.get(...a), sql),
    all: (...a) => I.sync(() => st.all(...a), sql),
  });
  return {
    exec: (sql) => I.sync(() => raw.exec(sql), sql, L.countStmts(sql)),
    prepare: (sql) => wrapStmt(I.sync(() => raw.prepare(sql), null, 0), sql),
    close: () => raw.close(),
  };
}

const A = {
  name: 'relational',
  label: 'SQLite ' + '(node:sqlite in Node 24), relational arm',
  needsGraph: false,
  load,
  version() { const d = new (load().sqlite.DatabaseSync)(':memory:'); const v = d.prepare('SELECT sqlite_version() AS v').get().v; d.close(); return 'SQLite ' + v + ' (node:sqlite, Node ' + process.version + ')'; },
  threadKnob: 'PRAGMA threads = T - 1 on the connection: SQLite runs a statement on the calling thread and may add up to T - 1 auxiliary worker threads for large sorts only (compile-time cap SQLITE_MAX_WORKER_THREADS). Read back with PRAGMA threads.',
  how: 'In process, synchronous client (node:sqlite DatabaseSync). Store opened with the arm\'s openDb (temp_store MEMORY, cache_size -65536 = 64 MiB page cache). Ranking = arms/relational/rel.js RelGraph.rank; TQ = arms/relational/tq.js answer (it prepares its statements on every call, as the arm does).',
  caches: [
    { name: 'PageRank transition tables (trcN, trucN)', where: 'SQLite TEMP tables in the engine, created and keyed per (direction, classes, co-change weight, hub set) by application code (RelGraph.cache)', classes: ['S1', 'base'], dropped_in_warm_uncached: true },
    { name: 'hub sets (hcN)', where: 'SQLite TEMP tables keyed by application code', classes: [], note: 'no timed class uses a hub cut', dropped_in_warm_uncached: true },
    { name: 'prepared-statement cache (RelGraph.stmts)', where: 'application code (statement handles; the plans live in the engine)', classes: ['primary', 'S1', 'base'], dropped_in_warm_uncached: false, note: 'kept in warm_uncached; empty only in a cold sample' },
    { name: 'SQLite page cache (64 MiB)', where: 'engine', classes: ['all'], dropped_in_warm_uncached: false, note: 'engine-internal; empty only in a cold sample' },
  ],
  notComparable: [
    'Synchronous in-process client: a statement round trip is a direct C call (no event-loop hop), unlike the DuckDB Node client.',
    'The thread knob only adds sorter threads; a recursive CTE never runs on more than one thread.',
    'Unbounded k-hop (the primary) is a level-wise loop of SQL statements driven by application code (rel.js), one statement per BFS level.',
  ],
  async build(G, root) {
    const { buildDb } = load().db;
    const f = path.join(root, 'bench-' + G.sha.slice(0, 12) + '.sqlite');
    fs.mkdirSync(root, { recursive: true });
    const t = L.now(); const parts = buildDb(G, f); const ms = L.now() - t;
    return { build_ms: ms, parts, store: f, build_threads: 'one (SQLite builds on the calling thread)' };
  },
  async open({ store, threads }) {
    const m = load();
    const raw = m.db.openDb(store);
    raw.exec('PRAGMA threads = ' + Math.max(0, threads - 1));
    const I = L.makeInstr();
    const db = wrap(raw, I);
    const r = new m.rel.RelGraph(db);
    const noopW = db.prepare('SELECT 1 AS x');
    return {
      instr: I,
      rank: (ids, cfg, seed) => r.rank(ids, cfg, seed),
      tq: (q) => m.tq.answer(db, q, m.tq.target(q)),
      drop() {
        for (const v of r.cache.values()) for (const t of (typeof v === 'string' ? [v] : [v.TRC, v.TRUC])) raw.exec('DROP TABLE IF EXISTS temp.' + t);
        r.cache.clear();
      },
      noop: () => noopW.get(),
      // runtime thread switch (bench/interleaved.js keeps one warm worker per engine and graph)
      setThreads(T) { raw.exec('PRAGMA threads = ' + Math.max(0, T - 1)); },
      readback: () => ({ pragma_threads: raw.prepare('PRAGMA threads').get().threads, pragma_cache_size: raw.prepare('PRAGMA cache_size').get().cache_size }),
      close() { raw.close(); },
    };
  },
};

module.exports = A;
if (require.main === module) L.main(A, __filename);
