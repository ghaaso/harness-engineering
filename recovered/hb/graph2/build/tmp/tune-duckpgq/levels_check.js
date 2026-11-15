'use strict';
// Stage-2 check: the bounded k-hop entries of arms/duckpgq/stage2.json answered through the property-graph
// layer (khopImpl = 'levels': one one-edge GRAPH_TABLE pattern per level from the frontier) must give the
// same ranked list as the default recursive-SQL bound. TUNE T1 tasks only (every STEP-th task), no scoring.
//   node tmp/tune-duckpgq/levels_check.js [STEP]
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const C = require(path.join(B, 'arms/common/config'));
const H = require(path.join(B, 'arms/common/harness'));
const { graphFor, openArm } = require(path.join(B, 'arms/common/arms'));

async function main() {
  const step = Number(process.argv[2] || 2);
  const list = JSON.parse(fs.readFileSync(path.join(B, 'arms/duckpgq/stage2.json'), 'utf8'));
  const bounded = list.map((c) => C.normalise(c)).filter((c) => c.traversal.mode === 'khop' && c.traversal.hops != null);
  const keys = new Map(); for (const c of bounded) { const k = JSON.stringify(C.rankKey(c)); if (!keys.has(k)) keys.set(k, c); }
  const tasks = H.loadTasks(['T1'], 'tune').filter((_, i) => i % step === 0);
  const byParent = new Map(); for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
  const r = { tasks: tasks.length, rank_keys: keys.size, bounded_entries: bounded.length, compared: 0, differ: 0, no_seed: 0, ms_sql: [], ms_pgq: [] };
  const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent); const d = await openArm('duckpgq', G); const g = d.raw.graph;
    for (const t of byParent.get(parent)) {
      const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) { r.no_seed++; continue; }
      for (const cfg of keys.values()) {
        g.khopImpl = null; const x = H.normRank(await d.rank(sm.ids, cfg, t.seed));
        g.khopImpl = 'levels'; const y = H.normRank(await d.rank(sm.ids, cfg, t.seed)); g.khopImpl = null;
        r.compared++; r.ms_sql.push(x.engine_ms); r.ms_pgq.push(y.engine_ms);
        if (JSON.stringify(x.ranked) !== JSON.stringify(y.ranked)) r.differ++;
      }
    }
    await d.close();
  }
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? +s[Math.floor(s.length / 2)].toFixed(1) : null; };
  r.median_engine_ms = { sql_recursive: med(r.ms_sql), pgq_levels: med(r.ms_pgq) }; delete r.ms_sql; delete r.ms_pgq;
  r.wall_s = (Date.now() - t0) / 1000;
  console.log(JSON.stringify(r));
}
main().catch((e) => { console.error(e); process.exit(1); });
