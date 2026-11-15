'use strict';
// Seeded random cross-check of the LadybugDB arm against the reference arm (addendum 3, A.1 and A.4
// under load), TUNE T1, T1x and T2 only. The configurations come from common/crosscheck_random.js
// drawConfig (the harness lane's generator): the first part draws the stratified cycle (every
// traversal mode meets every direction and every ranking, metapath steps with random directions and
// with kinds absent at many commits), the second part the focused draw (metapath, direction dependents
// or dependencies, degnorm alone or in a hybrid, steps against the configured direction, rare kinds).
// Per pair: the ranked lists must be byte-identical, the packed answers identical apart from arm and
// timing, and equiv.js must accept both lists. Every metapath pair is also run as the native typed
// path pattern variant and must be equivalent (explanations may differ, E.19).
//   node xrandom.js [--pairs 300] [--focus-pairs 100] [--seed 20261114] [--out dir]
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const C = require('../common/config');
const H = require('../common/harness');
const E = require('../common/equiv');
const { CLASSES } = require('../common/edgeclasses');
const { graphFor, openArm } = require('../common/arms');
const { drawConfig, rng } = require('../common/crosscheck_random');

function absentStep(G, cfg) {
  if (cfg.traversal.mode !== 'metapath') return false;
  const kinds = new Set(G.kinds); const cls = new Set(G.edges.map((e) => e.c));
  return cfg.traversal.steps.some((s) => !s.kinds.some((k) => kinds.has(k)) && !s.classes.some((c) => cls.has(CLASSES.indexOf(c))));
}

async function main() {
  const a = process.argv.slice(2); const o = { pairs: 300, focus: 100, seed: 20261114, out: path.join(P.RESULTS, 'ladybug', 'xcheck') };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pairs') o.pairs = Number(a[++i]); else if (a[i] === '--focus-pairs') o.focus = Number(a[++i]);
    else if (a[i] === '--seed') o.seed = Number(a[++i]); else if (a[i] === '--out') o.out = a[++i];
    else throw new Error('unknown argument ' + a[i]);
  }
  const r = rng(o.seed);
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  const pairs = [];
  for (let i = 0; i < o.pairs; i++) {
    const focus = i >= o.pairs - o.focus; const j = focus ? i - (o.pairs - o.focus) : i;
    let cfg = null; let tries = 0;
    while (!cfg && tries++ < 50) { try { cfg = C.normalise(drawConfig(r, j, focus)); } catch (e) { cfg = null; } }
    if (!cfg) throw new Error('could not draw a valid configuration for pair ' + i);
    pairs.push({ n: i, focus, task: tasks[Math.floor(r() * tasks.length)], cfg, hash: C.configHash(cfg) });
  }
  const byParent = new Map();
  for (const p of pairs) { const k = p.task.parent; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(p); }
  fs.mkdirSync(o.out, { recursive: true });
  const mm = [];
  const cov = {}; const bump = (k) => { cov[k] = (cov[k] || 0) + 1; };
  const sum = { pairs: 0, no_seed: 0, ranked_differ: 0, answers_differ: 0, equiv_fail: 0, errors: 0, pattern_pairs: 0, pattern_equiv_fail: 0, pattern_identical: 0,
    degnorm_od0_pairs: 0, absent_step_pairs: 0, absent_step_reach_empty: 0, reach_empty: 0, by_set: {} };
  const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const lb = await openArm('ladybug', G); const ref = await openArm('reference', G);
    for (const p of byParent.get(parent)) {
      const t = p.task; const cfg = p.cfg; const tr = cfg.traversal;
      const sm = H.mapSeed(G, t.seed);
      sum.pairs++; sum.by_set[t.set] = (sum.by_set[t.set] || 0) + 1;
      if (!sm.ids.length) { sum.no_seed++; continue; }
      bump(tr.mode + '|' + cfg.direction + '|' + cfg.rank.mode);
      if (tr.mode === 'metapath') for (const s of tr.steps) bump('step_dir=' + s.dir);
      const od0 = ref.raw.ref.stats.degnorm_od0;
      let x; let y;
      try { x = H.normRank(await lb.rank(sm.ids, cfg, t.seed)); y = H.normRank(await ref.rank(sm.ids, cfg, t.seed)); } catch (e) {
        sum.errors++; mm.push({ pair: p.n, task: t.id, hash: p.hash, error: String(e.message || e).slice(0, 400), cfg }); continue;
      }
      if (ref.raw.ref.stats.degnorm_od0 > od0) sum.degnorm_od0_pairs++;
      if (absentStep(G, cfg)) { sum.absent_step_pairs++; if (!y.ranked.length) sum.absent_step_reach_empty++; }
      if (!y.ranked.length) sum.reach_empty++;
      const chk = ref.raw.ref.explainChecker(sm.ids, cfg);
      const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
      const sr = E.strict(x.ranked, y.ranked);
      const strip = (q) => JSON.stringify({ ...q, arm: null, ms: null, engine_ms: null, meta: null });
      const sa = strip(H.answer(G, t, sm, x, cfg, 'x', 0)) === strip(H.answer(G, t, sm, y, cfg, 'x', 0));
      if (!sr) sum.ranked_differ++; if (!sa) sum.answers_differ++; if (!ev.ok) sum.equiv_fail++;
      if (!sr || !sa || !ev.ok) {
        let k = 0; while (k < Math.max(x.ranked.length, y.ranked.length) && JSON.stringify(x.ranked[k]) === JSON.stringify(y.ranked[k])) k++;
        mm.push({ pair: p.n, task: t.id, hash: p.hash, equiv: ev, first_diff: k, lb: x.ranked[k], ref: y.ranked[k], n: [x.ranked.length, y.ranked.length], cfg });
      }
      if (tr.mode === 'metapath') {
        const pc = JSON.parse(JSON.stringify(cfg)); pc.traversal.variant = 'pattern';
        let z;
        try { z = H.normRank(await lb.rank(sm.ids, pc, t.seed)); } catch (e) { sum.errors++; mm.push({ pair: p.n, task: t.id, variant: 'pattern', error: String(e.message || e).slice(0, 400), cfg: pc }); continue; }
        sum.pattern_pairs++;
        const pv = E.equivalent(z.ranked, y.ranked, chk, chk);
        if (E.strict(z.ranked, y.ranked)) sum.pattern_identical++;
        if (!pv.ok) { sum.pattern_equiv_fail++; mm.push({ pair: p.n, task: t.id, variant: 'pattern', equiv: pv, n: [z.ranked.length, y.ranked.length], cfg: pc }); }
      }
    }
    await lb.close(); await ref.close();
  }
  const out = { seed: o.seed, pairs_requested: o.pairs, focus_pairs: o.focus, parents: byParent.size, wall_s: (Date.now() - t0) / 1000, summary: sum, coverage: cov,
    metapath_degnorm_by_dir: Object.fromEntries(['dependents', 'dependencies', 'both'].map((d) => [d, cov['metapath|' + d + '|degnorm'] || 0])),
    metapath_hybrid_by_dir: Object.fromEntries(['dependents', 'dependencies', 'both'].map((d) => [d, cov['metapath|' + d + '|hybrid'] || 0])),
    pairs: pairs.map((p) => ({ n: p.n, focus: p.focus, task: p.task.id, set: p.task.set, hash: p.hash, cfg: p.cfg })) };
  fs.writeFileSync(path.join(o.out, 'xrandom_ladybug.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(o.out, 'xrandom_ladybug_mismatches.jsonl'), mm.map((x) => JSON.stringify(x)).join('\n') + (mm.length ? '\n' : ''));
  console.log(JSON.stringify({ wall_s: out.wall_s, ...sum, metapath_degnorm_by_dir: out.metapath_degnorm_by_dir, metapath_hybrid_by_dir: out.metapath_hybrid_by_dir }));
}

main().catch((e) => { console.error(e); process.exit(1); });
