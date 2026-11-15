'use strict';
// Harness entry of the DuckDB + DuckPGQ graph arm (arms/<name>/arm.js exports open(G, opts)).
// The store is built once per (commit, removed document, loader, extractor, store version) into
// opts.store, which inside graphtest:1 is the container filesystem or the named volume gt-duckpgq
// (GT_STORE), never /build. The store holds the property graphs (built at store time); each open attaches
// it READ_ONLY as the main database, with as many DuckDB threads as the container has CPUs
// (os.availableParallelism(), which follows the container's CPU limit; GT_DUCKDB_THREADS overrides).
const fs = require('fs');
const S_ = require('./store');
const { PgqGraph, DEFAULT_THREADS } = require('./pgq');

const THREADS = Number(process.env.GT_DUCKDB_THREADS || DEFAULT_THREADS);

async function open(G, opts) {
  const f = S_.storeFile(G, opts.store);
  let build = null;
  if (!fs.existsSync(f)) build = await S_.buildStore(G, f);
  const g = await PgqGraph.open(f, { threads: THREADS });
  // the store must hold this graph's canonical content
  if (g.meta.sha !== G.sha || Number(g.meta.edges) !== G.edges.length || Number(g.meta.nodes) !== G.nodes.length) throw new Error('duckpgq store does not match the graph: ' + f);
  return {
    async rank(seedIds, cfg, seed) {
      const r = await g.rank(seedIds, cfg, seed);
      return { ranked: r.ranked, engine_ms: r.engine_ms, meta: { ...r.meta, how: g.lastHow } };
    },
    async tq(q) {
      const tq = require('./tq');
      return tq.answer(g, q);
    },
    async close() { await g.close(); },
    build, file: f, graph: g, open_ms: g.openMs,
  };
}

module.exports = { open };
