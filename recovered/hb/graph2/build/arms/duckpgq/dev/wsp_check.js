'use strict';
// Check of the native weighted shortest path (x_wsp, addendum 3 A.2, the LadybugDB definition): the
// engine's cheapest_path_length over the weighted CSR against an independent JavaScript Dijkstra over the
// canonical graph G (not over the engine's tables): arcs per SPEC 4 under the configuration's direction,
// classes and minConf; cost = class cost (LadybugDB table) or kind cost / max(confidence, 0.05); a node
// blocked by an in-degree hub cut (SPEC 5) is reached but not passed through, seeds exempt.
//   node arms/duckpgq/dev/wsp_check.js [limit]   (env STEP = take every n-th TUNE T1/T2 task)
const C = require('../../common/config');
const H = require('../../common/harness');
const { CLASSES, STRUCTURAL } = require('../../common/edgeclasses');
const { graphFor, openArm } = require('../../common/arms');
const S_ = require('../store');
const L = require('../sweep');

const base = L.STAGE1.find((c) => c.name === 'base');
const mk = (name, patch) => ({ name, cfg: C.normalise({ ...JSON.parse(JSON.stringify(base)), ...patch, name: undefined }) });
const CFGS = [
  ...L.STAGE1.filter((c) => c.rank.mode === 'x_wsp').map((c) => ({ name: c.name, cfg: C.normalise(c) })),
  mk('x_wsp hub indeg>5', { rank: { mode: 'x_wsp' }, hub: { mode: 'indeg', k: 5 } }),
  mk('x_wsp hub indeg>10 hops 3', { rank: { mode: 'x_wsp' }, hub: { mode: 'indeg', k: 10 }, traversal: { mode: 'khop', hops: 3 } }),
  mk('x_wsp dependents minConf 0', { rank: { mode: 'x_wsp' }, direction: 'dependents', minConf: 0 }),
  mk('x_wsp dependencies all classes', { rank: { mode: 'x_wsp' }, direction: 'dependencies', classes: CLASSES.filter((c) => c !== 'experimental') }),
];

function dijkstra(G, seeds, cfg) {
  const cls = new Set(cfg.classes.map((c) => CLASSES.indexOf(c))); const minc = cfg.minConf;
  const kc = cfg.rank.kindCosts || {};
  const cost = (e) => (kc[e.kind] != null ? kc[e.kind] : (S_.CLASS_COST[CLASSES[e.c]] ?? 3)) / Math.max(e.w, S_.COST_FLOOR);
  let blocked = new Set();
  if (cfg.hub.mode === 'indeg') {
    const nc = new Set([...cls].filter((c) => !STRUCTURAL.has(CLASSES[c]))); const pin = new Map();
    const inc = (v) => pin.set(v, (pin.get(v) || 0) + 1);
    for (const e of G.edges) {
      if (!nc.has(e.c)) continue;
      if (!G.nodes[e.s - 1].is_test) inc(e.d);
      if (e.kind === 'co_changed' && !G.nodes[e.d - 1].is_test) inc(e.s);
    }
    blocked = new Set([...pin].filter(([, n]) => n > cfg.hub.k).map(([v]) => v));
  }
  const S = new Set(seeds); const adj = new Map();
  const add = (u, v, w) => { if (blocked.has(u) && !S.has(u)) return; if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, w]); };
  for (const e of G.edges) {
    if (!cls.has(e.c) || e.w < minc) continue;
    const w = cost(e);
    if (e.kind === 'co_changed') { add(e.s, e.d, w); add(e.d, e.s, w); continue; }
    if (cfg.direction !== 'dependents') add(e.s, e.d, w);
    if (cfg.direction !== 'dependencies') add(e.d, e.s, w);
  }
  const dist = new Map(); const pq = seeds.map((s) => [0, s]); for (const s of seeds) dist.set(s, 0);
  while (pq.length) {
    let bi = 0; for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[bi][0]) bi = i;
    const [d, u] = pq.splice(bi, 1)[0]; if (d > dist.get(u)) continue;
    for (const [v, w] of adj.get(u) || []) { const nd = d + w; if (!dist.has(v) || nd < dist.get(v) - 1e-12) { dist.set(v, nd); pq.push([nd, v]); } }
  }
  return dist;
}

(async () => {
  const limit = Number(process.argv[2] || 10); const step = Number(process.env.STEP || 1);
  const tasks = H.loadTasks(['T1', 'T2'], 'tune').filter((_, i) => i % step === 0).slice(0, limit);
  let a = null; let parent = null; let G = null; let n = 0; let bad = 0; let unreached = 0; const per = {};
  for (const t of tasks) {
    if (t.parent !== parent) { if (a) await a.close(); parent = t.parent; G = graphFor(parent); a = await openArm('duckpgq', G); }
    const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) continue;
    for (const c of CFGS) {
      if (c.cfg.rank.mode !== 'x_wsp') continue; // a hybrid's fused score is not a cost
      const r = await a.rank(sm.ids, c.cfg, t.seed);
      const dist = dijkstra(G, sm.ids, c.cfg);
      per[c.name] = per[c.name] || { nodes: 0, differences: 0 };
      for (const it of r.ranked) {
        n++; per[c.name].nodes++;
        if (!dist.has(it.i)) unreached++;
        const want = dist.has(it.i) ? Math.round(1e12 / (1 + dist.get(it.i))) / 1e12 : 0;
        if (Math.abs(want - it.score) > 1e-9) { bad++; per[c.name].differences++; if (bad < 10) console.log('DIFF', t.id, c.name, it.i, it.score, want); }
      }
    }
  }
  if (a) await a.close();
  console.log(JSON.stringify({ tasks: tasks.length, node_scores_compared: n, differences: bad, candidates_without_cost_path: unreached, per_config: per }));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
