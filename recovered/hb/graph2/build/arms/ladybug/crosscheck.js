'use strict';
// Cross-check (arm d) of the LadybugDB arm against the reference arm beyond the relational stage-1
// list (which runs through common/sweep.js): 10 seeded random specification configurations, the 13
// combinations of common/crosscheck_extra.js, the typed-path-pattern metapath variant (compared with
// the reference on the same configuration without the variant), and the in-engine PageRank iterations
// (LB_PPR=engine path) on a subset. Equivalence rule: common/equiv.js (addendum 2, E.19). TUNE only.
//   node crosscheck.js [--sets T1,T2] [--limit N] [--engine-ppr-tasks N] [--groups a,b] [--out dir]
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const C = require('../common/config');
const H = require('../common/harness');
const E = require('../common/equiv');
const { graphFor, openArm } = require('../common/arms');
const RS = require('../relational/sweep');

const ALL = ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'capability', 'docs', 'history'];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 10 random specification configurations, drawn with a fixed seed (20261112) before any run
function randomConfigs(n = 10, seed = 20261112) {
  const rnd = mulberry32(seed); const pick = (a) => a[Math.floor(rnd() * a.length)];
  const sub = (a, k) => { const b = [...a]; const o = []; while (o.length < k && b.length) o.push(b.splice(Math.floor(rnd() * b.length), 1)[0]); return o; };
  const rankOf = (allowHybrid) => {
    const m = pick(allowHybrid ? ['bfs', 'degnorm', 'ppr', 'cochange', 'text', 'hybrid'] : ['bfs', 'degnorm', 'ppr', 'cochange', 'text']);
    if (m === 'ppr') return { mode: 'ppr', restart: pick([0.15, 0.3, 0.5, 0.7]), cochange_w: pick([0, 0.5, 1, 3]) };
    if (m === 'hybrid') return { mode: 'hybrid', parts: [rankOf(false), rankOf(false)] };
    return { mode: m };
  };
  const out = []; let tries = 0;
  while (out.length < n && tries++ < 1000) {
    const t = pick(['khop', 'khop', 'budget', 'metapath']);
    let traversal; let classes = sub(ALL, 1 + Math.floor(rnd() * ALL.length));
    if (t === 'khop') traversal = { mode: 'khop', hops: pick([1, 2, 3, 4, 5, 6, null]) };
    else if (t === 'budget') { const b = {}; for (const c of sub(ALL, 2 + Math.floor(rnd() * 4))) b[c] = 1 + Math.floor(rnd() * 3); traversal = { mode: 'budget', hops: pick([null, 3, 5]), budgets: b }; classes = undefined; }
    else {
      const steps = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => { const mn = pick([0, 1]); return { classes: sub(ALL, 1 + Math.floor(rnd() * 3)), dir: pick(['out', 'in', 'both']), min: mn, max: Math.max(1, mn + Math.floor(rnd() * 3)) }; });
      traversal = { mode: 'metapath', hops: pick([null, 4]), emit: pick(['all', 'end']), steps }; classes = undefined;
    }
    const hub = pick([{ mode: 'none' }, { mode: 'none' }, { mode: 'indeg', k: pick([5, 10, 15]) }, { mode: 'transport' }]);
    const c = { granularity: 'file', form: 'signature', direction: pick(['dependents', 'dependencies', 'both']), classes, minConf: pick([0, 0.25, 0.5, 0.75, 1]), traversal, hub, rank: rankOf(true) };
    try { out.push({ name: 'random-' + out.length, cfg: C.normalise(c) }); } catch (e) { /* invalid draw: redraw */ }
  }
  return out;
}

// the 13 combinations of common/crosscheck_extra.js (relational query-path flags dropped)
function extraConfigs() {
  const mk = (name, patch) => ({ name, cfg: C.normalise({ ...RS.BASE, ...patch }) });
  const B2 = RS.STAGE1.find((c) => c.name === 'budget=B2').traversal;
  const B1cap = { ...RS.STAGE1.find((c) => c.name === 'budget=B1').traversal, hops: 3 };
  const MPEND = { mode: 'metapath', hops: null, emit: 'end', steps: [{ classes: ['structure'], dir: 'out', min: 0, max: 1 }, { kinds: ['calls', 'depends_injects'], dir: 'in', min: 1, max: 3 }, { kinds: ['registers_route'], dir: 'in', min: 0, max: 1 }] };
  const MPTAB = { mode: 'metapath', hops: 5, emit: 'all', steps: [{ classes: ['structure'], dir: 'both', min: 0, max: 1 }, { classes: ['calls'], dir: 'out', min: 0, max: 2 }, { classes: ['data'], dir: 'out', min: 1, max: 1 }, { classes: ['history'], dir: 'both', min: 0, max: 1 }] };
  return [
    mk('extra dependents h3 bfs', { direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }),
    mk('extra dependencies h3 degnorm', { direction: 'dependencies', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'degnorm' } }),
    mk('extra dependents h2 cochange', { direction: 'dependents', traversal: { mode: 'khop', hops: 2 }, rank: { mode: 'cochange' } }),
    mk('extra base h5 minConf 0', { minConf: 0, traversal: { mode: 'khop', hops: 5 } }),
    mk('extra dependents h4 indeg>5 degnorm minConf 0.25', { minConf: 0.25, direction: 'dependents', traversal: { mode: 'khop', hops: 4 }, hub: { mode: 'indeg', k: 5 }, rank: { mode: 'degnorm' } }),
    mk('extra dependencies budget B2 hybrid bfs+cochange+text', { direction: 'dependencies', traversal: B2, rank: { mode: 'hybrid', parts: [{ mode: 'bfs' }, { mode: 'cochange' }, { mode: 'text' }] } }),
    mk('extra all classes transport ppr r0.15 w3 unbounded', { classes: ALL, hub: { mode: 'transport' }, traversal: { mode: 'khop', hops: null }, rank: { mode: 'ppr', restart: 0.15, cochange_w: 3 } }),
    mk('extra budget B1 capped 3 cochange indeg>15 minConf 0', { minConf: 0, traversal: B1cap, rank: { mode: 'cochange' }, hub: { mode: 'indeg', k: 15 } }),
    mk('extra docs+history h3 ppr r0.5 w0.5', { classes: ['docs', 'history'], traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'ppr', restart: 0.5, cochange_w: 0.5 } }),
    mk('extra metapath emit=end callers->routes degnorm', { traversal: MPEND, rank: { mode: 'degnorm' } }),
    mk('extra metapath tables then history h5 transport bfs', { traversal: MPTAB, hub: { mode: 'transport' }, rank: { mode: 'bfs' } }),
    mk('extra metapath stage-1 minConf 0 text', { minConf: 0, traversal: RS.METAPATH, rank: { mode: 'text' } }),
    mk('extra base base', {}),
  ];
}

const withVariant = (cfg, v) => { const c = JSON.parse(JSON.stringify(cfg)); c.traversal.variant = v; return c; };
const stripPattern = (cfg) => { const c = JSON.parse(JSON.stringify(cfg)); if (c.traversal && c.traversal.variant === 'pattern') delete c.traversal.variant; return c; };

async function main() {
  const a = process.argv.slice(2); const o = { sets: ['T1', 'T2'], limit: 0, enginePpr: 40 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--sets') o.sets = a[++i].split(',');
    else if (a[i] === '--limit') o.limit = Number(a[++i]);
    else if (a[i] === '--engine-ppr-tasks') o.enginePpr = Number(a[++i]);
    else if (a[i] === '--out') o.out = a[++i];
    else if (a[i] === '--groups') o.groups = a[++i].split(',');
    else if (a[i] === '--tasks') o.tasks = a[++i].split(',');
    else throw new Error('unknown argument ' + a[i]);
  }
  let tasks = H.loadTasks(o.sets, 'tune');
  if (o.tasks) tasks = tasks.filter((t) => o.tasks.includes(t.id));
  if (o.limit) tasks = tasks.slice(0, o.limit);
  const rnd = randomConfigs(); const extra = extraConfigs();
  const mpCfgs = [...RS.STAGE1.filter((c) => c.traversal.mode === 'metapath').map((c) => ({ name: 'pattern of ' + c.name, cfg: C.normalise(c) })),
    ...[...rnd, ...extra].filter((c) => c.cfg.traversal.mode === 'metapath').map((c) => ({ name: 'pattern of ' + c.name, cfg: c.cfg }))];
  const pprCfgs = RS.STAGE1.filter((c) => c.rank.mode === 'ppr' || (c.rank.mode === 'hybrid' && c.rank.parts.some((p) => p.mode === 'ppr'))).map((c) => ({ name: 'engine-ppr ' + c.name, cfg: C.normalise(c) }));
  // this arm's own stage-1 entries that are specification algorithms (or the "pattern" variant of
  // one) and are not already in the relational list: run as listed, compared with the reference on
  // the same configuration without the variant
  const relKeys = new Set(RS.STAGE1.map((c) => C.rankKey(c)));
  const own = require('./sweep').STAGE1.map((c) => ({ name: 'own ' + c.name, lcfg: C.normalise(c), cfg: C.normalise(stripPattern(c)) }))
    .filter((c) => { try { C.specOnly(c.cfg); } catch (e) { return false; } return !relKeys.has(C.rankKey(c.cfg)) || c.lcfg.traversal.variant; });
  const groups = { random: rnd, extra, pattern: mpCfgs, engine_ppr: pprCfgs, own };
  if (o.groups) for (const k of Object.keys(groups)) if (!o.groups.includes(k)) delete groups[k];
  const res = {}; const ex = [];
  for (const [g, list] of Object.entries(groups)) for (const c of list) res[g + ' | ' + c.name] = { group: g, hash: C.configHash(c.cfg), tasks: 0, equiv_fail: 0, identical: 0, ms_lb: 0, ms_ref: 0 };
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
  const t0 = Date.now(); let done = 0; let eppr = 0;
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const lb = await openArm('ladybug', G); const ref = await openArm('reference', G);
    for (const t of byParent.get(parent)) {
      const sm = H.mapSeed(G, t.seed);
      if (!sm.ids.length) continue;
      const doPpr = eppr < o.enginePpr; if (doPpr) eppr++;
      for (const [g, list] of Object.entries(groups)) {
        if (g === 'engine_ppr' && !doPpr) continue;
        for (const c of list) {
          const lcfg = g === 'pattern' ? withVariant(c.cfg, 'pattern') : g === 'own' ? c.lcfg : c.cfg;
          const ro = g === 'engine_ppr' ? { pprImpl: 'engine' } : undefined;
          let s = Date.now(); let x;
          x = H.normRank(await lb.rank(sm.ids, lcfg, t.seed, ro)).ranked;
          const ms1 = Date.now() - s; s = Date.now();
          const y = H.normRank(await ref.rank(sm.ids, c.cfg, t.seed)).ranked; const ms2 = Date.now() - s;
          const chk = ref.raw.ref.explainChecker(sm.ids, c.cfg);
          const ev = E.equivalent(x, y, chk, chk);
          const r = res[g + ' | ' + c.name]; r.tasks++; r.ms_lb += ms1; r.ms_ref += ms2;
          if (E.strict(x, y)) r.identical++;
          if (!ev.ok) { r.equiv_fail++; if (ex.length < 200) { ex.push({ group: g, config: c.name, task: t.id, equiv: ev, n: [x.length, y.length] }); process.stderr.write('FAIL ' + JSON.stringify(ex[ex.length - 1]).slice(0, 600) + '\n'); } }
        }
      }
      done++;
      if (done % 25 === 0) process.stderr.write(`${done}/${tasks.length} tasks, ${((Date.now() - t0) / 1000).toFixed(0)} s, fails ${Object.values(res).reduce((s, v) => s + v.equiv_fail, 0)}\n`);
    }
    await lb.close(); await ref.close();
  }
  const outDir = path.join(o.out || path.join(P.RESULTS, 'ladybug'), 'crosscheck');
  fs.mkdirSync(outDir, { recursive: true });
  const summary = { sets: o.sets, tasks: tasks.length, engine_ppr_tasks: eppr, wall_s: (Date.now() - t0) / 1000,
    configs: Object.fromEntries(Object.entries(groups).map(([g, l]) => [g, l.map((c) => ({ name: c.name, hash: C.configHash(c.cfg), cfg: c.cfg }))])), results: res,
    totals: Object.fromEntries(Object.keys(groups).map((g) => [g, Object.values(res).filter((r) => r.group === g).reduce((s, r) => ({ comparisons: s.comparisons + r.tasks, equiv_fail: s.equiv_fail + r.equiv_fail, identical: s.identical + r.identical }), { comparisons: 0, equiv_fail: 0, identical: 0 })])) };
  fs.writeFileSync(path.join(outDir, 'crosscheck_ladybug.json'), JSON.stringify(summary, null, 1));
  fs.writeFileSync(path.join(outDir, 'crosscheck_ladybug_mismatches.jsonl'), ex.map((x) => JSON.stringify(x)).join('\n') + (ex.length ? '\n' : ''));
  console.log(JSON.stringify({ tasks: tasks.length, wall_s: summary.wall_s, totals: summary.totals }));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { randomConfigs, extraConfigs };
