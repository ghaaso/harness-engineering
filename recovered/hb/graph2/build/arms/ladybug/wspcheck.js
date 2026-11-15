'use strict';
// Check of x_wsp (native WSHORTEST plus the blocked-end-node step) against a plain JavaScript Dijkstra
// over the canonical graph (addendum 3, A.2): arcs under the configuration's direction, classes and
// minConf (SPEC 4, via the reference arm's arc lists), cost = store.js edgeCost(class, confidence),
// a hub-blocked node may end a path but is never expanded (SPEC 5 hub rules via the reference arm's
// blockedFn; seeds exempt). Score = Round12(1 / (1 + cost)), 0 when unreachable. TUNE only.
//   node wspcheck.js [--tasks-per-parent 2] [--out file]
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const C = require('../common/config');
const H = require('../common/harness');
const { CLASSES } = require('../common/edgeclasses');
const { graphFor } = require('../common/arms');
const { RefGraph } = require('../reference/ref');
const S = require('./store');
const { openInProc } = require('./arm');
const LS = require('./sweep');

const r12 = (x) => Math.round(x * 1e12) / 1e12;

function dijkstra(ref, seeds, cfg, M, minc, blocked) {
  const dist = new Map(seeds.map((s) => [s, 0]));
  const done = new Set();
  const maskOk = (c) => M.has(c);
  // a small binary heap of [d, v]
  const h = []; const push = (x) => { h.push(x); let i = h.length - 1; while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const top = h[0]; const last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1; const r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
  for (const s of seeds) push([0, s]);
  while (h.length) {
    const [d, u] = pop();
    if (done.has(u) || d > dist.get(u)) continue;
    done.add(u);
    if (blocked(u)) continue;
    for (const a of ref.arcs(u, cfg.direction, maskOk, minc)) {
      const nd = d + S.edgeCost(CLASSES[a.c], a.w);
      if (!dist.has(a.v) || nd < dist.get(a.v)) { dist.set(a.v, nd); push([nd, a.v]); }
    }
  }
  return dist;
}

function main() {
  const a = process.argv.slice(2); let per = 2; let out = path.join(P.RESULTS, 'ladybug', 'xcheck', 'wspcheck.json');
  for (let i = 0; i < a.length; i++) { if (a[i] === '--tasks-per-parent') per = Number(a[++i]); else if (a[i] === '--out') out = a[++i]; else throw new Error('unknown argument ' + a[i]); }
  const base = LS.BASE;
  const cfgs = [];
  for (const direction of ['both', 'dependents', 'dependencies']) {
    for (const hub of [{ mode: 'none' }, { mode: 'indeg', k: 5 }, { mode: 'indeg', k: 10 }, { mode: 'transport' }]) {
      cfgs.push({ name: `x_wsp ${direction} hub=${hub.mode}${hub.k ? hub.k : ''}`, cfg: C.normalise({ ...base, direction, hub, rank: { mode: 'x_wsp' } }) });
    }
  }
  cfgs.push({ name: 'x_wsp both hops=4 minConf=0 all classes indeg5', cfg: C.normalise({ ...base, minConf: 0, classes: ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'capability', 'docs', 'history'], traversal: { mode: 'khop', hops: 4 }, hub: { mode: 'indeg', k: 5 }, rank: { mode: 'x_wsp' } }) });
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); if (byParent.get(t.parent).length < per) byParent.get(t.parent).push(t); }
  const res = Object.fromEntries(cfgs.map((c) => [c.name, { tasks: 0, candidates: 0, scored: 0, blocked_candidates: 0, blocked_scored: 0, diff_gt_1e9: 0, max_abs_diff: 0, would_differ_if_hubs_passable: 0 }]));
  const ex = [];
  const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const ref = new RefGraph(G);
    const arm = openInProc(G, { store: P.storeFor('ladybug') });
    for (const t of byParent.get(parent)) {
      const sm = H.mapSeed(G, t.seed);
      if (!sm.ids.length) continue;
      const seeds = [...sm.ids].sort((x, y) => x - y); const seedSet = new Set(seeds);
      for (const c of cfgs) {
        const cfg = c.cfg; const M = new Set(cfg.classes.map((x) => CLASSES.indexOf(x)));
        const blocked = ref.blockedFn(cfg, seedSet, M);
        const dist = dijkstra(ref, seeds, cfg, M, cfg.minConf, blocked);
        const open = cfg.hub.mode === 'none' ? dist : dijkstra(ref, seeds, cfg, M, cfg.minConf, () => false);
        const got = arm.rank(sm.ids, cfg, t.seed).ranked;
        const R = res[c.name]; R.tasks++;
        for (const x of got) {
          R.candidates++;
          const want = dist.has(x.i) ? r12(1 / (1 + dist.get(x.i))) : 0;
          if (want) R.scored++;
          if (blocked(x.i)) { R.blocked_candidates++; if (want) R.blocked_scored++; }
          const loose = open.has(x.i) ? r12(1 / (1 + open.get(x.i))) : 0;
          if (Math.abs(loose - want) > 1e-9) R.would_differ_if_hubs_passable++;
          const d = Math.abs(want - x.score);
          if (d > R.max_abs_diff) R.max_abs_diff = d;
          if (d > 1e-9) { R.diff_gt_1e9++; if (ex.length < 50) ex.push({ cfg: c.name, task: t.id, node: x.i, got: x.score, want, blocked: blocked(x.i) }); }
        }
      }
    }
    arm.close();
  }
  const tot = Object.values(res).reduce((s, r) => ({ comparisons: s.comparisons + r.candidates, diffs: s.diffs + r.diff_gt_1e9, blocked_scored: s.blocked_scored + r.blocked_scored, would_differ_if_hubs_passable: s.would_differ_if_hubs_passable + r.would_differ_if_hubs_passable }), { comparisons: 0, diffs: 0, blocked_scored: 0, would_differ_if_hubs_passable: 0 });
  const o = { parents: byParent.size, tasks_per_parent: per, wall_s: (Date.now() - t0) / 1000, totals: tot, results: res, examples: ex };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(o, null, 1));
  console.log(JSON.stringify({ wall_s: o.wall_s, totals: tot }));
}

main();
