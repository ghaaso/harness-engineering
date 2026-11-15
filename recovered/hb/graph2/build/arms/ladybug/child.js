'use strict';
// One store per child process (see arm.js): opens the store of one (parent, removed documents) graph,
// answers rank and tq requests over IPC, and exits on close, which returns every byte of native memory
// the engine kept (a closed LadybugDB Database does not release it inside a live process).
const { graphFor } = require('../common/arms');
const S = require('./store');
const { LbGraph } = require('./lb');

const now = () => Number(process.hrtime.bigint()) / 1e6;
let st = null; let g = null;

process.on('message', (m) => {
  try {
    if (m.op === 'open') {
      const G = graphFor(m.sha, m.removed || []);
      if (G.sha !== m.sha) throw new Error('graph mismatch');
      st = S.open(G, m.store, { threads: m.threads });
      g = new LbGraph(st, G, { pprImpl: m.pprImpl });
      process.send({ id: m.id, ok: true, build: st.built, meta: st.meta });
    } else if (m.op === 'rank') {
      const q0 = g.stats.query_ms; const n0 = g.stats.queries; const keep = g.pprImpl;
      if (m.opts && m.opts.pprImpl) g.pprImpl = m.opts.pprImpl;
      const t = now();
      let ranked;
      try { ranked = g.rank(m.seedIds, m.cfg, m.seed); } finally { g.pprImpl = keep; }
      const ms = now() - t;
      process.send({ id: m.id, ok: true, r: { ranked, engine_ms: ms, meta: { query_ms: g.stats.query_ms - q0, queries: g.stats.queries - n0, ipc: true } } });
    } else if (m.op === 'tq') {
      process.send({ id: m.id, ok: true, r: require('./tq').answer(g, m.q) });
    } else if (m.op === 'close') {
      if (g) { g.ps.clear(); g.cache.clear(); }
      if (st) { st.conn.closeSync(); st.db.closeSync(); }
      process.send({ id: m.id, ok: true }, () => process.exit(0));
    }
  } catch (e) {
    process.send({ id: m.id, ok: false, error: String(e && e.stack || e) });
  }
});
