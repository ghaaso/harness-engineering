'use strict';
// Development check: build one store, run a few configurations against the reference arm on a few tasks.
//   node arms/duckpgq/dev/try1.js [limit]
const P = require('../../common/paths');
const C = require('../../common/config');
const H = require('../../common/harness');
const E = require('../../common/equiv');
const { graphFor, openArm } = require('../../common/arms');
const RS = require('../../relational/sweep');

(async () => {
  const limit = Number(process.argv[2] || 4);
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  let tasks = H.loadTasks(['T1', 'T2'], 'tune'); if (process.env.TASKS) tasks = tasks.filter((t) => process.env.TASKS.split(',').includes(t.id)); else if (process.env.FROM) tasks = tasks.slice(Number(process.env.FROM)); tasks = tasks.slice(0, limit);
  const list = RS.STAGE1.filter((c) => !only || only.includes(c.name)).map((c) => ({ name: c.name, cfg: C.normalise(c) }));
  let G = null; let a = null; let r = null; let parent = null; let bad = 0; let n = 0;
  const times = {};
  for (const t of tasks) {
    if (t.parent !== parent) {
      if (a) { await a.close(); }
      parent = t.parent; G = graphFor(parent);
      const s = Date.now(); a = await openArm('duckpgq', G); console.log('open', parent.slice(0, 8), Date.now() - s, 'ms', a.raw.build ? JSON.stringify(a.raw.build) : 'cached');
      r = await openArm('reference', G);
    }
    const sm = H.mapSeed(G, t.seed);
    if (!sm.ids.length) continue;
    for (const c of list) {
      let x;
      try { x = H.normRank(await a.rank(sm.ids, c.cfg, t.seed)); } catch (e) { console.log('ERROR', t.id, c.name, String(e.message).slice(0, 600)); bad++; continue; }
      const y = H.normRank(await r.rank(sm.ids, c.cfg, t.seed)); (times['REF '+c.name] = times['REF '+c.name] || []).push(y.engine_ms); if (process.env.SHOWN) console.log('n', c.name, x.ranked.length, x.engine_ms.toFixed(1));
      (times[c.name] = times[c.name] || []).push(x.engine_ms);
      const chk = r.raw.ref.explainChecker(sm.ids, c.cfg);
      const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
      n++;
      if (!ev.ok) { bad++; console.log('MISMATCH', t.id, c.name, JSON.stringify(ev), x.ranked.length, y.ranked.length, JSON.stringify(x.ranked[ev.at || 0]), JSON.stringify(y.ranked[ev.at || 0])); }
    }
  }
  if (a) await a.close();
  for (const [k, v] of Object.entries(times)) { v.sort((p, q) => p - q); console.log('time', k, 'p50', v[Math.floor(v.length / 2)].toFixed(1), 'max', v[v.length - 1].toFixed(1)); }
  console.log('compared', n, 'bad', bad);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
