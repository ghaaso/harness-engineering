'use strict';
// Strict cross-check, relational versus reference, on N seeded random (configuration, task) pairs
// (default 500), TUNE T1 and T2 only. Every pair draws its own configuration; the draw is stratified
// so that every traversal mode (khop, budget, metapath) meets every direction (dependents,
// dependencies, both) and every ranking (bfs, degnorm, ppr, cochange, text, hybrid) in a 54-pair
// cycle. Metapath steps take random directions (out, in, both) and random classes or kinds, including
// kinds that are absent at many commits, so the SPEC 8.1 out-degree-0 rule and the absent-step rule
// (addendum 3, A.1 and A.4) are exercised. Shared factors (granularity, form, pad, minConf) and hub
// rules are drawn too. Per pair: the ranked lists must be byte-identical (node, hop, score, via,
// path), the packed answers identical apart from arm and timing, and equiv.js must accept both lists
// with the reference explanation checker. Nothing here reads sealed/ or runs HELD-OUT.
//   node crosscheck_random.js [--pairs 500] [--seed 20261112] [--focus] [--out <results root>]
// Writes <out>/sweep/crosscheck_random[_focus].json and crosscheck_random[_focus]_mismatches.jsonl.
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const C = require('./config');
const H = require('./harness');
const E = require('./equiv');
const { CLASSES } = require('./edgeclasses');
const { graphFor, openArm } = require('./arms');

const CLS = ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'capability', 'docs', 'history'];
// kinds for metapath steps: common ones plus some that are absent at many or all commits
const KINDS = ['calls', 'imports', 'calls_url', 'registers_route', 'reads_table', 'writes_table', 'co_changed', 'defines',
  'mocks', 'reads_setting', 'depends_injects', 'test_calls_route', 'enqueues_kind', 'kind_handled_by', 'registers_job',
  'runs', 'navigates', 'returns_model', 'has_field'];
const MODES = ['khop', 'budget', 'metapath'];
const DIRS = ['dependents', 'dependencies', 'both'];
const RANKS = ['bfs', 'degnorm', 'ppr', 'cochange', 'text', 'hybrid'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// kinds absent at many or all TUNE commits (focus mode draws one step from these half the time)
const RARE = ['enqueues_kind', 'kind_handled_by', 'registers_job', 'runs', 'navigates', 'returns_model', 'has_field'];

// focus = true: every pair is a metapath with direction dependents or dependencies and a degnorm
// ranking (alone or inside a hybrid), and steps lean to directions against the configured one and to
// rare kinds: the two addendum-3 rules (A.1, A.4) under load.
function drawConfig(r, i, focus = false) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const sub = (a, lo, hi) => { let s = a.filter(() => r() < 0.4); while (s.length < lo) s = [...new Set([...s, pick(a)])]; return s.slice(0, hi); };
  if (focus) {
    const direction = ['dependents', 'dependencies'][i % 2];
    const against = direction === 'dependents' ? 'out' : 'in';
    const k = 2 + Math.floor(r() * 2); const steps = [];
    for (let j = 0; j < k; j++) {
      const max = 1 + Math.floor(r() * 2); const s = { dir: r() < 0.6 ? against : pick(['out', 'in', 'both']), min: Math.min(max, Math.floor(r() * 2)), max };
      if (r() < 0.25) s.kinds = [pick(RARE)]; else if (r() < 0.5) s.classes = sub(CLS, 1, 3); else s.kinds = sub(KINDS, 1, 2);
      steps.push(s);
    }
    const rank = Math.floor(i / 2) % 2 === 0 ? { mode: 'degnorm' } : { mode: 'hybrid', parts: [{ mode: 'degnorm' }, pick([{ mode: 'text' }, { mode: 'cochange' }, { mode: 'bfs' }])] };
    return { granularity: pick(['file', 'symbol']), form: pick(['paths', 'signature']), pad: 'none', minConf: pick([0, 0.5, 0.5, 1]), direction,
      classes: [], traversal: { mode: 'metapath', hops: pick([null, 3, 4]), emit: pick(['all', 'end']), steps },
      hub: pick([{ mode: 'none' }, { mode: 'none' }, { mode: 'indeg', k: pick([5, 10]) }, { mode: 'transport' }]), rank };
  }
  const mode = MODES[i % 3]; const direction = DIRS[Math.floor(i / 3) % 3]; const rankMode = RANKS[Math.floor(i / 9) % 6];
  let traversal; let classes = sub(CLS, 2, 8);
  if (mode === 'khop') traversal = { mode, hops: pick([1, 2, 3, 4, null]) };
  else if (mode === 'budget') {
    const b = {}; for (const c of sub(CLS, 2, 4)) b[c] = 1 + Math.floor(r() * 3);
    traversal = { mode, hops: pick([null, 3, 5]), budgets: b }; classes = Object.keys(b);
  } else {
    const k = 1 + Math.floor(r() * 3); const steps = [];
    for (let j = 0; j < k; j++) {
      const max = 1 + Math.floor(r() * 3); const s = { dir: pick(['out', 'in', 'both']), min: Math.min(max, Math.floor(r() * 2)), max };
      if (r() < 0.55) s.classes = sub(CLS, 1, 3); else s.kinds = sub(KINDS, 1, 2);
      steps.push(s);
    }
    traversal = { mode, hops: pick([null, 3, 4, 6]), emit: pick(['all', 'all', 'end']), steps };
  }
  const ppr = () => ({ mode: 'ppr', restart: pick([0.15, 0.3, 0.5]), cochange_w: pick([0, 0.5, 1, 3]) });
  const rank = rankMode === 'ppr' ? ppr()
    : rankMode === 'hybrid' ? { mode: 'hybrid', parts: [pick([{ mode: 'degnorm' }, ppr(), { mode: 'bfs' }]), pick([{ mode: 'text' }, { mode: 'cochange' }, { mode: 'degnorm' }])] }
      : { mode: rankMode };
  if (rank.mode === 'hybrid' && rank.parts[0].mode === rank.parts[1].mode) rank.parts[1] = { mode: 'text' };
  return {
    granularity: pick(['file', 'symbol']), form: pick(['paths', 'signature', 'range']), pad: pick(['none', 'DIR', 'CO']),
    minConf: pick([0, 0.25, 0.5, 0.5, 0.75, 1]), direction, classes, traversal,
    hub: pick([{ mode: 'none' }, { mode: 'none' }, { mode: 'indeg', k: pick([3, 5, 10, 20]) }, { mode: 'transport' }]), rank,
  };
}

// does a metapath configuration have a step none of whose kinds or classes has an edge in G?
function absentStep(G, cfg) {
  if (cfg.traversal.mode !== 'metapath') return false;
  const kinds = new Set(G.kinds); const cls = new Set(G.edges.map((e) => e.c));
  return cfg.traversal.steps.some((s) => !s.kinds.some((k) => kinds.has(k)) && !s.classes.some((c) => cls.has(CLASSES.indexOf(c))));
}

async function main() {
  const a = process.argv.slice(2); const o = { pairs: 500, seed: 20261112, out: P.RESULTS, focus: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pairs') o.pairs = Number(a[++i]); else if (a[i] === '--seed') o.seed = Number(a[++i]);
    else if (a[i] === '--focus') o.focus = true;
    else if (a[i] === '--out') o.out = a[++i]; else throw new Error('unknown argument ' + a[i]);
  }
  const r = rng(o.seed);
  const tasks = H.loadTasks(['T1', 'T2'], 'tune');
  const pairs = [];
  for (let i = 0; i < o.pairs; i++) {
    let cfg = null; let tries = 0;
    while (!cfg && tries++ < 50) { try { cfg = C.normalise(drawConfig(r, i, o.focus)); } catch (e) { cfg = null; } }
    if (!cfg) throw new Error('could not draw a valid configuration for pair ' + i);
    pairs.push({ n: i, task: tasks[Math.floor(r() * tasks.length)], cfg, hash: C.configHash(cfg) });
  }
  const byParent = new Map();
  for (const p of pairs) { const k = p.task.parent; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(p); }
  const outDir = path.join(o.out, 'sweep'); fs.mkdirSync(outDir, { recursive: true });
  const mm = fs.createWriteStream(path.join(outDir, 'crosscheck_random' + (o.focus ? '_focus' : '') + '_mismatches.jsonl'));
  const cov = {}; const bump = (k) => { cov[k] = (cov[k] || 0) + 1; };
  const sum = { pairs: 0, no_seed: 0, ranked_differ: 0, answers_differ: 0, equiv_fail: 0, errors: 0, mismatches: 0,
    degnorm_od0_pairs: 0, absent_step_pairs: 0, absent_step_reach_empty: 0, reach_sizes: [] };
  const t0 = Date.now(); let relMs = 0; let refMs = 0;
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const rel = await openArm('relational', G); const ref = await openArm('reference', G);
    for (const p of byParent.get(parent)) {
      const t = p.task; const cfg = p.cfg; const tr = cfg.traversal;
      const sm = H.mapSeed(G, t.seed);
      sum.pairs++;
      if (!sm.ids.length) { sum.no_seed++; continue; }
      bump('mode=' + tr.mode); bump('dir=' + cfg.direction); bump('rank=' + cfg.rank.mode);
      bump(tr.mode + '|' + cfg.direction + '|' + cfg.rank.mode);
      if (tr.mode === 'metapath') for (const s of tr.steps) bump('step_dir=' + s.dir);
      const od0 = ref.raw.ref.stats.degnorm_od0;
      let x; let y; let s;
      try {
        s = Date.now(); x = H.normRank(await rel.rank(sm.ids, cfg, t.seed)); relMs += Date.now() - s;
        s = Date.now(); y = H.normRank(await ref.rank(sm.ids, cfg, t.seed)); refMs += Date.now() - s;
      } catch (e) {
        sum.errors++; sum.mismatches++;
        mm.write(JSON.stringify({ pair: p.n, task: t.id, hash: p.hash, error: String(e.message || e).slice(0, 400), cfg }) + '\n');
        continue;
      }
      if (ref.raw.ref.stats.degnorm_od0 > od0) sum.degnorm_od0_pairs++;
      const absent = absentStep(G, cfg);
      if (absent) { sum.absent_step_pairs++; if (y.ranked.length === 0) sum.absent_step_reach_empty++; }
      sum.reach_sizes.push(y.ranked.length);
      const chk = ref.raw.ref.explainChecker(sm.ids, cfg);
      const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
      const sr = E.strict(x.ranked, y.ranked);
      const strip = (q) => JSON.stringify({ ...q, arm: null, ms: null, engine_ms: null });
      const sa = strip(H.answer(G, t, sm, x, cfg, 'x', 0)) === strip(H.answer(G, t, sm, y, cfg, 'x', 0));
      if (!sr) sum.ranked_differ++; if (!sa) sum.answers_differ++; if (!ev.ok) sum.equiv_fail++;
      if (!sr || !sa || !ev.ok) {
        sum.mismatches++;
        let k = 0; while (k < Math.max(x.ranked.length, y.ranked.length) && JSON.stringify(x.ranked[k]) === JSON.stringify(y.ranked[k])) k++;
        mm.write(JSON.stringify({ pair: p.n, task: t.id, hash: p.hash, equiv: ev, first_diff: k, rel: x.ranked[k], ref: y.ranked[k], n: [x.ranked.length, y.ranked.length], cfg }) + '\n');
      }
    }
    await rel.close(); await ref.close();
  }
  await new Promise((res) => mm.end(res));
  const rs = sum.reach_sizes.sort((p, q) => p - q);
  sum.reach_median = rs.length ? rs[Math.floor(rs.length / 2)] : null; sum.reach_max = rs.length ? rs[rs.length - 1] : null;
  sum.reach_empty = rs.filter((v) => v === 0).length; delete sum.reach_sizes;
  const out = { focus: o.focus, seed: o.seed, pairs_requested: o.pairs, parents: byParent.size, wall_s: (Date.now() - t0) / 1000, rank_ms_total: { relational: relMs, reference: refMs },
    summary: sum, coverage: cov, pairs: pairs.map((p) => ({ n: p.n, task: p.task.id, hash: p.hash, cfg: p.cfg })) };
  fs.writeFileSync(path.join(outDir, 'crosscheck_random' + (o.focus ? '_focus' : '') + '.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ wall_s: out.wall_s, ...sum, metapath_degnorm_by_dir: Object.fromEntries(DIRS.map((d) => [d, cov['metapath|' + d + '|degnorm'] || 0])), metapath_hybrid_by_dir: Object.fromEntries(DIRS.map((d) => [d, cov['metapath|' + d + '|hybrid'] || 0])) }));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { drawConfig, rng };
