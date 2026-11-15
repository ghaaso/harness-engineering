'use strict';
// Extra cross-check beyond a stage-1 list: parameter combinations the list does not visit (metapath
// emit=end, kind steps, budgets with other minConf, hub cuts with metapaths) and the relational arm's
// alternative query paths (recursive CTE vs level-wise BFS vs the closure table) forced one at a time.
// Compares full ranked lists (node, hop, score, via, path) byte for byte, relational vs reference, on
// TUNE tasks only.  node crosscheck_extra.js [--tasks id,id] [--limit N] [--out dir]
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const C = require('./config');
const H = require('./harness');
const E = require('./equiv');
const { graphFor, openArm } = require('./arms');
const RS = require('../relational/sweep');

const all = ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'capability', 'docs', 'history'];
const mk = (name, patch, rel = {}) => ({ name, cfg: C.normalise({ ...RS.BASE, ...patch }), rel });
const B2 = RS.STAGE1.find((c) => c.name === 'budget=B2').traversal;
const B1cap = { ...RS.STAGE1.find((c) => c.name === 'budget=B1').traversal, hops: 3 };
const MPEND = { mode: 'metapath', hops: null, emit: 'end', steps: [
  { classes: ['structure'], dir: 'out', min: 0, max: 1 }, { kinds: ['calls', 'depends_injects'], dir: 'in', min: 1, max: 3 }, { kinds: ['registers_route'], dir: 'in', min: 0, max: 1 }] };
const MPTAB = { mode: 'metapath', hops: 5, emit: 'all', steps: [
  { classes: ['structure'], dir: 'both', min: 0, max: 1 }, { classes: ['calls'], dir: 'out', min: 0, max: 2 }, { classes: ['data'], dir: 'out', min: 1, max: 1 }, { classes: ['history'], dir: 'both', min: 0, max: 1 }] };
const EXTRA = [
  mk('dependents h3 via recursive CTE (closure off)', { direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }, { useClosure: false }),
  mk('dependencies h3 via closure table', { direction: 'dependencies', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'degnorm' } }),
  mk('dependents h2 via closure table, cochange', { direction: 'dependents', traversal: { mode: 'khop', hops: 2 }, rank: { mode: 'cochange' } }),
  mk('base via level-wise BFS (CTE off)', {}, { useCte: false }),
  mk('base h5 minConf 0 via level-wise BFS (CTE off)', { minConf: 0, traversal: { mode: 'khop', hops: 5 } }, { useCte: false }),
  mk('dependents h4 indeg>5 degnorm minConf 0.25', { minConf: 0.25, direction: 'dependents', traversal: { mode: 'khop', hops: 4 }, hub: { mode: 'indeg', k: 5 }, rank: { mode: 'degnorm' } }),
  mk('dependencies budget B2 hybrid bfs+cochange+text', { direction: 'dependencies', traversal: B2, rank: { mode: 'hybrid', parts: [{ mode: 'bfs' }, { mode: 'cochange' }, { mode: 'text' }] } }),
  mk('all classes transport ppr r0.15 w3 unbounded', { classes: all, hub: { mode: 'transport' }, traversal: { mode: 'khop', hops: null }, rank: { mode: 'ppr', restart: 0.15, cochange_w: 3 } }),
  mk('budget B1 capped at 3, cochange, indeg>15, minConf 0', { minConf: 0, traversal: B1cap, rank: { mode: 'cochange' }, hub: { mode: 'indeg', k: 15 } }),
  mk('docs+history only, both, h3, ppr r0.5', { classes: ['docs', 'history'], traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'ppr', restart: 0.5, cochange_w: 0.5 } }),
  mk('metapath emit=end callers->routes, degnorm', { traversal: MPEND, rank: { mode: 'degnorm' } }),
  mk('metapath to tables then history, hops 5, transport, bfs', { traversal: MPTAB, hub: { mode: 'transport' }, rank: { mode: 'bfs' } }),
  mk('metapath stage-1 one, minConf 0, text', { minConf: 0, traversal: RS.METAPATH, rank: { mode: 'text' } }),
];

async function main() {
  const a = process.argv.slice(2); const o = {};
  for (let i = 0; i < a.length; i++) { if (a[i] === '--tasks') o.tasks = a[++i].split(','); else if (a[i] === '--limit') o.limit = Number(a[++i]); else if (a[i] === '--out') o.out = a[++i]; }
  let tasks = H.loadTasks(['T1', 'T2'], 'tune');
  if (o.tasks) tasks = tasks.filter((t) => o.tasks.includes(t.id));
  if (o.limit) tasks = tasks.slice(0, o.limit);
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
  const res = Object.fromEntries(EXTRA.map((e) => [e.name, { tasks: 0, mismatches: 0, equiv_fail: 0, examples: [] }]));
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const rel = await openArm('relational', G); const ref = await openArm('reference', G);
    for (const t of byParent.get(parent)) {
      const sm = H.mapSeed(G, t.seed);
      if (!sm.ids.length) continue;
      for (const e of EXTRA) {
        rel.raw.rel.useClosure = e.rel.useClosure !== false; rel.raw.rel.useCte = e.rel.useCte !== false;
        const x = H.normRank(await rel.rank(sm.ids, e.cfg, t.seed)).ranked; const y = H.normRank(await ref.rank(sm.ids, e.cfg, t.seed)).ranked;
        const r = res[e.name]; r.tasks++;
        const chk = ref.raw.ref.explainChecker(sm.ids, e.cfg);
        const ev = E.equivalent(x, y, chk, chk);
        if (!ev.ok) r.equiv_fail++;
        if (!E.strict(x, y) || !ev.ok) { r.mismatches++; if (r.examples.length < 3) r.examples.push({ task: t.id, equiv: ev, n: [x.length, y.length] }); }
      }
    }
    await rel.close(); await ref.close();
  }
  const outDir = path.join(o.out || P.RESULTS, 'sweep');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'crosscheck_extra.json'), JSON.stringify({ tasks: tasks.length, configs: EXTRA.map((e) => ({ name: e.name, hash: C.configHash(e.cfg), cfg: e.cfg, relational_path: e.rel })), results: res }, null, 1));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, [v.tasks, v.mismatches]]))));
}

main().catch((e) => { console.error(e); process.exit(1); });
