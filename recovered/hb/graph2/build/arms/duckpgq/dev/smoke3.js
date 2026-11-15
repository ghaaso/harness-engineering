'use strict';
// Development smoke test of the D2 store (stored property graphs, projections as arc filters): on the
// first N TUNE T1 tasks, every stage-1 entry of this arm and of the relational list plus a few addendum-3
// cases, against the reference arm (spec entries) or just "runs" (extensions); and a timing of the two
// bounded k-hop implementations (PGQ one-edge levels, recursive CTE).
//   node arms/duckpgq/dev/smoke3.js [N]
const C = require('../../common/config');
const H = require('../../common/harness');
const E = require('../../common/equiv');
const { graphFor, openArm } = require('../../common/arms');
const RS = require('../../relational/sweep');
const L = require('../sweep');

const N = Number(process.argv[2] || 6);
const extra = [
  { name: 'mp degnorm dependencies (od0)', direction: 'dependencies', traversal: { mode: 'metapath', hops: null, emit: 'all', steps: [{ classes: ['calls'], dir: 'out', min: 1, max: 1 }, { classes: ['calls'], dir: 'in', min: 1, max: 1 }] }, rank: { mode: 'degnorm' } },
  { name: 'mp degnorm dependents (od0)', direction: 'dependents', traversal: { mode: 'metapath', hops: null, emit: 'all', steps: [{ classes: ['structure'], dir: 'out', min: 0, max: 1 }, { classes: ['calls', 'imports'], dir: 'out', min: 1, max: 2 }] }, rank: { mode: 'hybrid', parts: [{ mode: 'degnorm' }, { mode: 'text' }] } },
  { name: 'mp absent kind step', traversal: { mode: 'metapath', hops: null, emit: 'all', steps: [{ classes: ['structure'], dir: 'out', min: 0, max: 1 }, { kinds: ['enqueues_kind'], dir: 'both', min: 1, max: 1 }, { classes: ['tests'], dir: 'in', min: 0, max: 1 }] }, rank: { mode: 'degnorm' } },
  { name: 'mp absent kind step min0', traversal: { mode: 'metapath', hops: null, emit: 'end', steps: [{ kinds: ['returns_model'], dir: 'both', min: 0, max: 1 }, { classes: ['calls'], dir: 'both', min: 1, max: 1 }] }, rank: { mode: 'bfs' } },
  { name: 'mp hub indeg', hub: { mode: 'indeg', k: 5 }, traversal: RS.METAPATH, rank: { mode: 'degnorm' } },
  { name: 'khop hub transport dependents 3', direction: 'dependents', hub: { mode: 'transport' }, traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'degnorm' } },
].map((c) => ({ name: c.name, cfg: C.normalise({ ...JSON.parse(JSON.stringify(RS.BASE)), ...c, name: undefined }) }));
const lists = [...RS.STAGE1, ...L.STAGE1].map((c) => ({ name: c.name, cfg: C.normalise(c) }));
const seen = new Set(); const all = [];
for (const c of [...lists, ...extra]) { const k = C.rankKey(c.cfg); const h = JSON.stringify(k); if (seen.has(h)) continue; seen.add(h); all.push(c); }

(async () => {
  const tasks = H.loadTasks(['T1'], 'tune').slice(0, N);
  const byP = new Map(); for (const t of tasks) { if (!byP.has(t.parent)) byP.set(t.parent, []); byP.get(t.parent).push(t); }
  let cmp = 0; let fail = 0; let strictDiff = 0; let ext = 0; const errs = []; const tim = { levels: [], cte: [] };
  for (const [parent, ts] of byP) {
    const G = graphFor(parent);
    const t0 = Date.now(); const d = await openArm('duckpgq', G); const ref = await openArm('reference', G);
    process.stderr.write(`parent ${parent.slice(0, 8)} open ${Date.now() - t0} ms\n`);
    for (const t of ts) {
      const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) continue;
      for (const c of all) {
        let x;
        try { x = H.normRank(await d.rank(sm.ids, c.cfg, t.seed)); } catch (e) { errs.push({ task: t.id, cfg: c.name, e: String(e.message).slice(0, 400) }); continue; }
        if (C.isExtension(c.cfg)) { ext++; continue; }
        const y = H.normRank(await ref.rank(sm.ids, c.cfg, t.seed));
        const chk = ref.raw.ref.explainChecker(sm.ids, c.cfg);
        const ev = E.equivalent(x.ranked, y.ranked, chk, chk); cmp++;
        if (!ev.ok) { fail++; if (fail < 6) console.log('FAIL', t.id, c.name, JSON.stringify(ev).slice(0, 400)); }
        if (!E.strict(x.ranked, y.ranked)) strictDiff++;
      }
      // bounded k-hop: levels vs cte, same answers, timing
      for (const h of [1, 2, 3, 4, 6]) {
        const cfg = C.normalise({ ...RS.BASE, traversal: { mode: 'khop', hops: h }, rank: { mode: 'bfs' } });
        const g = d.raw.graph; const out = {};
        for (const impl of ['levels', 'cte']) {
          g.khopImpl = impl; await g.rank(sm.ids, cfg, t.seed);
          const s = Date.now(); for (let k = 0; k < 3; k++) out[impl] = (await g.rank(sm.ids, cfg, t.seed)).ranked; tim[impl].push({ h, ms: (Date.now() - s) / 3 });
        }
        g.khopImpl = null;
        if (JSON.stringify(out.levels) !== JSON.stringify(out.cte)) console.log('KHOP IMPL DIFF', t.id, h);
      }
    }
    await d.close(); await ref.close();
  }
  const agg = (a) => { const r = {}; for (const x of a) (r[x.h] = r[x.h] || []).push(x.ms); return Object.fromEntries(Object.entries(r).map(([h, v]) => [h, +(v.reduce((p, q) => p + q, 0) / v.length).toFixed(1)])); };
  console.log(JSON.stringify({ tasks: tasks.length, configs: all.length, compared: cmp, equiv_fail: fail, strict_diff: strictDiff, extension_runs: ext, errors: errs.length, err_examples: errs.slice(0, 6), khop_ms_levels: agg(tim.levels), khop_ms_cte: agg(tim.cte) }, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
