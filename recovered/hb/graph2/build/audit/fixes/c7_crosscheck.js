'use strict';
// Check 7: relational versus reference, STRICT, on N seeded random (configuration, task) pairs drawn
// from TUNE T1+T2, covering every traversal mode (khop, budget, ordered metapath with emit all/end),
// every rank mode (bfs, degnorm, ppr, cochange, text, hybrid), hub modes, direction, minConf
// (0, 0.25, 0.5, 0.75, 1), pad (none, DIR, CO), granularity and form, plus the relational arm's
// closure / recursive-CTE / level-wise query paths switched at random. Strict = the ranked lists are
// byte-identical AND the packed answers are byte-identical (wall and engine times removed).
// Run inside graphtest:1 with GT_STORE and GT_SRCSTORE on a container path.
//   node c7_crosscheck.js [--n 500] [--seed 20261112] [--parents 12] [--out file]
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const ARMS = path.join(B, 'arms', 'common');
const C = require(path.join(ARMS, 'config'));
const H = require(path.join(ARMS, 'harness'));
const { CLASSES, KIND_CLASS } = require(path.join(ARMS, 'edgeclasses'));
const { graphFor, openArm } = require(path.join(ARMS, 'arms'));

const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const N = Number(opt('n', 500)); let s = Number(opt('seed', 20261112)) >>> 0; const NP = Number(opt('parents', 12));
const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const CL = CLASSES.filter((c) => c !== 'experimental');
const KINDS = Object.keys(KIND_CLASS).filter((k) => KIND_CLASS[k] !== 'experimental').concat(['contains']);
function randRank(depth = 0) {
  const m = pick(depth ? ['bfs', 'degnorm', 'ppr', 'cochange', 'text'] : ['bfs', 'degnorm', 'ppr', 'ppr', 'cochange', 'text', 'hybrid', 'hybrid']);
  if (m === 'ppr') return { mode: 'ppr', restart: pick([0.15, 0.3, 0.5, 0.7]), cochange_w: pick([0, 0.5, 1, 3]) };
  if (m === 'hybrid') { const n = pick([2, 3]); const parts = []; for (let i = 0; i < n; i++) parts.push(randRank(1)); return { mode: 'hybrid', parts }; }
  return { mode: m };
}
function randCfg() {
  let classes = CL.filter(() => rnd() < 0.5); if (!classes.length) classes = ['calls'];
  let traversal; const u = rnd();
  if (u < 0.3) {
    const steps = []; const ns = pick([1, 2, 2, 3, 3, 4]);
    for (let j = 0; j < ns; j++) {
      const st = { dir: pick(['out', 'in', 'both']) };
      if (rnd() < 0.7) st.classes = CL.filter(() => rnd() < 0.3); else st.kinds = KINDS.filter(() => rnd() < 0.1);
      if (!(st.classes || []).length && !(st.kinds || []).length) st.classes = [pick(CL)];
      st.max = pick([1, 1, 2, 3]); st.min = Math.min(st.max, pick([0, 1, 1]));
      steps.push(st);
    }
    traversal = { mode: 'metapath', hops: pick([null, null, 3, 5]), emit: pick(['all', 'end']), steps };
  } else if (u < 0.5) {
    const b = {}; for (const c of classes) b[c] = pick([1, 1, 2, 3]);
    for (const c of Object.keys(b)) if (C.budgetStates(b) > C.STATE_LIMIT) delete b[c];
    traversal = { mode: 'budget', hops: pick([null, null, 2, 3, 4]), budgets: b };
  } else traversal = { mode: 'khop', hops: pick([0, 1, 2, 3, 4, 5, 6, null]) };
  const hub = pick([{ mode: 'none' }, { mode: 'indeg', k: pick([5, 10, 15]) }, { mode: 'transport' }]);
  return C.normalise({ granularity: pick(['file', 'symbol']), direction: pick(['both', 'dependents', 'dependencies']), classes, traversal, hub, rank: randRank(),
    form: pick(['paths', 'signature', 'range', 'snippet']), pad: pick(['none', 'DIR', 'CO']), minConf: pick([0, 0.25, 0.5, 0.5, 0.75, 1]) });
}
const tasks = H.loadTasks(['T1', 'T2'], 'tune');
const byParent = new Map(); for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
const allP = [...byParent.keys()].sort(); const parents = [];
while (parents.length < Math.min(NP, allP.length)) { const p = pick(allP); if (!parents.includes(p)) parents.push(p); }
const per = Math.ceil(N / parents.length);
const res = { n_target: N, seed: Number(opt('seed', 20261112)), parents: parents.length, comparisons: 0, strict_ranked_fail: 0, strict_answer_fail: 0, errors_both: 0, errors_one: 0, by: {}, examples: [], seconds: 0 };
const bump = (k, bad) => { const b = res.by[k] = res.by[k] || { n: 0, fail: 0 }; b.n++; if (bad) b.fail++; };
const t0 = Date.now();
(async () => {
  for (const p of parents) {
    const G = graphFor(p); const rel = await openArm('relational', G); const ref = await openArm('reference', G);
    const ts = byParent.get(p);
    for (let k = 0; k < per && res.comparisons + res.errors_both + res.errors_one < N; k++) {
      const t = pick(ts); const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) { k--; continue; }
      let cfg; try { cfg = randCfg(); } catch (e) { k--; continue; }
      rel.raw.rel.useClosure = rnd() < 0.5; rel.raw.rel.useCte = rnd() < 0.5;
      let r1, r2, e1 = null, e2 = null;
      try { r1 = H.normRank(await rel.rank(sm.ids, cfg, t.seed)); } catch (e) { e1 = String(e.message || e); }
      try { r2 = H.normRank(await ref.rank(sm.ids, cfg, t.seed)); } catch (e) { e2 = String(e.message || e); }
      if (e1 || e2) { if (e1 && e2) res.errors_both++; else { res.errors_one++; res.examples.push({ task: t.id, cfg, e1, e2 }); } continue; }
      const strip = (x) => JSON.stringify({ ...x, arm: null, ms: null, engine_ms: null });
      const a1 = strip(H.answer(G, t, sm, r1, cfg, 'x', 0)); const a2 = strip(H.answer(G, t, sm, r2, cfg, 'x', 0));
      const sr = JSON.stringify(r1.ranked) === JSON.stringify(r2.ranked); const sa = a1 === a2;
      res.comparisons++; if (!sr) res.strict_ranked_fail++; if (!sa) res.strict_answer_fail++;
      const bad = !sr || !sa;
      bump('traversal=' + cfg.traversal.mode + (cfg.traversal.mode === 'metapath' ? '/' + cfg.traversal.emit : ''), bad); bump('rank=' + cfg.rank.mode, bad); bump('pad=' + cfg.pad, bad);
      bump('minConf=' + cfg.minConf, bad); bump('hub=' + cfg.hub.mode, bad); bump('dir=' + cfg.direction, bad); bump('gran=' + cfg.granularity + '/' + cfg.form, bad);
      bump('relpath=' + (rel.raw.rel.useClosure ? 'closure' : '') + (rel.raw.rel.useCte ? '+cte' : '+levelwise'), bad);
      bump('reach_' + (r1.ranked.length === 0 ? '0' : r1.ranked.length < 20 ? '1-19' : r1.ranked.length < 200 ? '20-199' : '200+'), bad);
      if (bad && res.examples.length < 10) { let i = 0; while (i < r1.ranked.length && JSON.stringify(r1.ranked[i]) === JSON.stringify(r2.ranked[i])) i++; res.examples.push({ task: t.id, cfg, first_diff: i, rel: r1.ranked[i], ref: r2.ranked[i] }); }
    }
    await rel.close(); await ref.close();
    process.stderr.write(p.slice(0, 8) + ' comparisons ' + res.comparisons + ' fails ' + (res.strict_ranked_fail + res.strict_answer_fail) + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s\n');
  }
  res.seconds = (Date.now() - t0) / 1000;
  const out = opt('out', path.join(__dirname, 'c7_crosscheck.json'));
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ ...res, by: undefined, examples: res.examples.slice(0, 3) }));
})().catch((e) => { console.error(e); process.exit(1); });
