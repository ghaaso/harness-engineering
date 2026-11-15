'use strict';
// Harness entry of the LadybugDB graph arm (convention: arms/<name>/arm.js exports open(G, opts)).
// The store is built once per (parent commit, removed document, loader, extractor and store version)
// into opts.store, which inside graphtest:1 is the named volume gt-ladybug (GT_STORE), never /build.
// Options from the environment:
//   LB_THREADS  engine threads per query (default 1; faster than many threads for these small queries)
//   LB_PPR      app | engine: where the 40 PageRank iterations run (the output is the same)
//   LB_INPROC   1 = run the store in this process. Default: one child process per open store.
//   LB_PREPARE  0 = no prepared statements (default: kept for configuration-constant texts, lb.js).
// Why a child process: a closed LadybugDB Database does not give its native memory back to a live
// process (about 25 MB per store with plain queries, about 95 MB with prepared statements, measured
// over 15 stores); the stage-1 sweep opens 53 stores and was killed at the 4 GB container limit. A
// child per store exits on close and returns all of it. The rank work and engine_ms are measured in
// the child; the harness's wall time also includes the IPC round trip (structured clone).
const path = require('path');
const { fork } = require('child_process');
const S = require('./store');
const { LbGraph } = require('./lb');

const now = () => Number(process.hrtime.bigint()) / 1e6;

function openInProc(G, opts) {
  const st = S.open(G, opts.store, { threads: Number(process.env.LB_THREADS || 1) });
  const g = new LbGraph(st, G, { pprImpl: process.env.LB_PPR || 'app' });
  return {
    rank(seedIds, cfg, seed, o = {}) {
      const q0 = g.stats.query_ms; const n0 = g.stats.queries; const keep = g.pprImpl;
      if (o.pprImpl) g.pprImpl = o.pprImpl;
      const t = now();
      let ranked;
      try { ranked = g.rank(seedIds, cfg, seed); } finally { g.pprImpl = keep; }
      const ms = now() - t;
      return { ranked, engine_ms: ms, meta: { query_ms: g.stats.query_ms - q0, queries: g.stats.queries - n0 } };
    },
    tq(q) { return require('./tq').answer(g, q); },
    close() { g.ps.clear(); g.cache.clear(); st.conn.closeSync(); st.db.closeSync(); },
    lb: g, store: st, build: st.built,
  };
}

async function openChild(G, opts) {
  const ch = fork(path.join(__dirname, 'child.js'), [], { serialization: 'advanced', stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let seq = 0; const wait = new Map();
  ch.on('message', (m) => { const w = wait.get(m.id); if (!w) return; wait.delete(m.id); if (m.ok) w.res(m); else w.rej(new Error(m.error)); });
  ch.on('exit', (code) => { for (const w of wait.values()) w.rej(new Error('ladybug child exited with ' + code)); wait.clear(); });
  const call = (msg) => new Promise((res, rej) => { const id = ++seq; wait.set(id, { res, rej }); ch.send({ ...msg, id }); });
  const o = await call({ op: 'open', sha: G.sha, removed: G.removed || [], store: opts.store, threads: Number(process.env.LB_THREADS || 1), pprImpl: process.env.LB_PPR || 'app' });
  return {
    async rank(seedIds, cfg, seed, ro) { return (await call({ op: 'rank', seedIds, cfg, seed, opts: ro })).r; },
    async tq(q) { return (await call({ op: 'tq', q })).r; },
    async close() { if (ch.exitCode == null) { await call({ op: 'close' }); await new Promise((r) => (ch.exitCode != null ? r() : ch.once('exit', r))); } },
    build: o.build, meta: o.meta, child: ch,
  };
}

function open(G, opts) {
  return process.env.LB_INPROC === '1' ? openInProc(G, opts) : openChild(G, opts);
}

module.exports = { open, openInProc };
