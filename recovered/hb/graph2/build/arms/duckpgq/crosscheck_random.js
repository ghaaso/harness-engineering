'use strict';
// Cross-check beyond the relational stage-1 list (addendum 3): N seeded random (configuration, task)
// pairs (default 300, seed 20261112), DuckPGQ against the reference arm, over TUNE T1, T1x and T2 tasks.
// Configurations come from the harness's own generator (common/crosscheck_random.js drawConfig):
//   - the first 162 pairs are 3 full cycles of its stratified draw, so every traversal mode (khop, budget,
//     metapath) meets every direction (dependents, dependencies, both) and every ranking (bfs, degnorm,
//     ppr, cochange, text, hybrid) at least 3 times;
//   - the rest are its focused draw: metapaths with direction dependents or dependencies, degnorm alone or
//     in a hybrid, steps leaning against the configured direction and to kinds absent at many commits
//     (the SPEC 8.1 out-degree-0 rule and the absent-step rule, addendum 3 A.1 and A.4).
// Per pair: SPEC 11 equivalence (equiv.js with the reference explanation checker), plus whether the ranked
// lists are byte-identical and whether the packed answers are identical apart from arm, timing and meta.
// For a bounded k-hop pair the PGQ level form (khopImpl = 'levels') must give the same ranked list as the
// default. Nothing here reads sealed/ or runs HELD-OUT.
//   node arms/duckpgq/crosscheck_random.js [--pairs 300] [--seed 20261112] [--out dir]
const fs = require('fs');
const path = require('path');
const C = require('../common/config');
const H = require('../common/harness');
const E = require('../common/equiv');
const P = require('../common/paths');
const { CLASSES } = require('../common/edgeclasses');
const { graphFor, openArm } = require('../common/arms');
const { drawConfig, rng } = require('../common/crosscheck_random');

const STRAT = 162;

function absentStep(G, cfg) {
  if (cfg.traversal.mode !== 'metapath') return false;
  const kinds = new Set(G.edges.map((e) => e.kind)); const cls = new Set(G.edges.map((e) => e.c));
  return cfg.traversal.steps.some((s) => !s.kinds.some((k) => kinds.has(k)) && !s.classes.some((c) => cls.has(CLASSES.indexOf(c))));
}

async function main() {
  const a = process.argv.slice(2); const o = { pairs: 300, seed: 20261112, out: path.join(P.RESULTS, 'duckpgq', 'crosscheck') };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pairs') o.pairs = Number(a[++i]); else if (a[i] === '--seed') o.seed = Number(a[++i]);
    else if (a[i] === '--out') o.out = a[++i]; else throw new Error('unknown argument ' + a[i]);
  }
  const r = rng(o.seed);
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  const pairs = [];
  for (let i = 0; i < o.pairs; i++) {
    const focus = i >= STRAT; let cfg = null; let tries = 0;
    while (!cfg && tries++ < 50) { try { cfg = C.normalise(drawConfig(r, focus ? i - STRAT : i, focus)); } catch (e) { cfg = null; } }
    if (!cfg) throw new Error('could not draw a valid configuration for pair ' + i);
    pairs.push({ n: i, focus, task: tasks[Math.floor(r() * tasks.length)], cfg, hash: C.configHash(cfg) });
  }
  const byParent = new Map();
  for (const p of pairs) { const k = p.task.parent; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(p); }
  fs.mkdirSync(o.out, { recursive: true });
  const mm = fs.createWriteStream(path.join(o.out, 'random_mismatches.jsonl'));
  const cov = {}; const bump = (k) => { cov[k] = (cov[k] || 0) + 1; };
  const sum = { pairs: 0, no_seed: 0, equiv_fail: 0, ranked_differ: 0, answers_differ: 0, errors: 0, degnorm_od0_pairs: 0,
    absent_step_pairs: 0, absent_step_reach_empty: 0, reach_empty: 0, khop_levels_checked: 0, khop_levels_differ: 0, by_set: {} };
  const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const d = await openArm('duckpgq', G); const ref = await openArm('reference', G);
    for (const p of byParent.get(parent)) {
      const t = p.task; const cfg = p.cfg; const tr = cfg.traversal;
      const sm = H.mapSeed(G, t.seed);
      sum.pairs++; sum.by_set[t.set] = (sum.by_set[t.set] || 0) + 1;
      if (!sm.ids.length) { sum.no_seed++; continue; }
      bump('mode=' + tr.mode); bump('dir=' + cfg.direction); bump('rank=' + cfg.rank.mode); bump(tr.mode + '|' + cfg.direction + '|' + cfg.rank.mode);
      if (tr.mode === 'metapath') for (const s of tr.steps) bump('step_dir=' + s.dir);
      const od0 = ref.raw.ref.stats.degnorm_od0;
      let x; let y;
      try { x = H.normRank(await d.rank(sm.ids, cfg, t.seed)); y = H.normRank(await ref.rank(sm.ids, cfg, t.seed)); } catch (e) {
        sum.errors++; mm.write(JSON.stringify({ pair: p.n, task: t.id, hash: p.hash, error: String(e.message || e).slice(0, 400), cfg }) + '\n'); continue;
      }
      if (ref.raw.ref.stats.degnorm_od0 > od0) sum.degnorm_od0_pairs++;
      if (absentStep(G, cfg)) { sum.absent_step_pairs++; if (!y.ranked.length) sum.absent_step_reach_empty++; }
      if (!y.ranked.length) sum.reach_empty++;
      const chk = ref.raw.ref.explainChecker(sm.ids, cfg);
      const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
      const sr = E.strict(x.ranked, y.ranked);
      const strip = (q) => JSON.stringify({ ...q, arm: null, ms: null, engine_ms: null, meta: null });
      const sa = strip(H.answer(G, t, sm, x, cfg, 'x', 0)) === strip(H.answer(G, t, sm, y, cfg, 'x', 0));
      if (!ev.ok) sum.equiv_fail++; if (!sr) sum.ranked_differ++; if (!sa) sum.answers_differ++;
      if (tr.mode === 'khop' && tr.hops != null && tr.hops > 0) {
        const g = d.raw.graph; g.khopImpl = 'levels';
        const z = H.normRank(await d.rank(sm.ids, cfg, t.seed)); g.khopImpl = null;
        sum.khop_levels_checked++; if (JSON.stringify(z.ranked) !== JSON.stringify(x.ranked)) sum.khop_levels_differ++;
      }
      if (!ev.ok || !sr || !sa) {
        let k = 0; while (k < Math.max(x.ranked.length, y.ranked.length) && JSON.stringify(x.ranked[k]) === JSON.stringify(y.ranked[k])) k++;
        mm.write(JSON.stringify({ pair: p.n, task: t.id, hash: p.hash, equiv: ev, strict: sr, answers_same: sa, first_diff: k, duckpgq: x.ranked[k], reference: y.ranked[k], n: [x.ranked.length, y.ranked.length], cfg }) + '\n');
      }
    }
    await d.close(); await ref.close();
  }
  await new Promise((res) => mm.end(res));
  const out = { seed: o.seed, pairs_requested: o.pairs, stratified_pairs: Math.min(STRAT, o.pairs), focused_pairs: Math.max(0, o.pairs - STRAT), parents: byParent.size,
    wall_s: (Date.now() - t0) / 1000, summary: sum, coverage: cov, pairs: pairs.map((p) => ({ n: p.n, focus: p.focus, task: p.task.id, set: p.task.set, hash: p.hash, cfg: p.cfg })) };
  fs.writeFileSync(path.join(o.out, 'random.json'), JSON.stringify(out, null, 1));
  const D3 = ['dependents', 'dependencies', 'both'];
  console.log(JSON.stringify({ wall_s: out.wall_s, ...sum, metapath_degnorm_by_dir: Object.fromEntries(D3.map((x) => [x, cov['metapath|' + x + '|degnorm'] || 0])), metapath_hybrid_by_dir: Object.fromEntries(D3.map((x) => [x, cov['metapath|' + x + '|hybrid'] || 0])) }));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
