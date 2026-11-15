'use strict';
// CHECK 2. 300 seeded random (configuration, TUNE task) pairs that no builder used, each graph arm
// against the reference arm under the shared equivalence rule (common/equiv.js + the reference's
// explanation checker). Stores are fresh builds on this lane's volume (GT_STORE=/work), not the
// builders' stores. TUNE only (loadTasks with split "tune"; the held-out lock is untouched).
// Besides equivalence it records whether the ranked lists are byte-identical, whether the order is
// identical (ties included), and whether the packed answers (what the scorer sees) are identical.
//   node crosscheck300.js [--seed 917] [--n 300] [--arms ladybug,duckpgq]
const fs = require('fs');
const path = require('path');
const A = '/build/arms';
const C = require(A + '/common/config');
const H = require(A + '/common/harness');
const E = require(A + '/common/equiv');
const { graphFor, openArm } = require(A + '/common/arms');
const { CLASSES, KIND_CLASS } = require(A + '/common/edgeclasses');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CL = CLASSES.filter((c) => c !== 'experimental');
const KINDS = Object.keys(KIND_CLASS).filter((k) => KIND_CLASS[k] !== 'experimental').concat(['contains']);

function generator(rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const sub = (a, lo, hi) => { const b = [...a]; const k = lo + Math.floor(rnd() * (hi - lo + 1)); const o = []; while (o.length < k && b.length) o.push(b.splice(Math.floor(rnd() * b.length), 1)[0]); return o; };
  const ppr = () => ({ mode: 'ppr', restart: pick([0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.85]), cochange_w: pick([0, 0.25, 0.5, 1, 2, 3, 7]) });
  const simple = () => { const m = pick(['bfs', 'degnorm', 'ppr', 'ppr', 'cochange', 'text']); return m === 'ppr' ? ppr() : { mode: m }; };
  return () => {
    const t = pick(['khop', 'khop', 'khop', 'budget', 'metapath', 'metapath']);
    const c = { granularity: 'file', form: 'signature', pad: 'none', minConf: pick([0, 0.1, 0.25, 0.5, 0.5, 0.6, 0.75, 0.9, 1]), direction: pick(['dependents', 'dependencies', 'both', 'both']) };
    if (t === 'khop') { c.classes = sub(CL, 1, CL.length); c.traversal = { mode: 'khop', hops: pick([0, 1, 2, 2, 3, 4, 5, 6, null]) }; }
    else if (t === 'budget') { const b = {}; for (const k of sub(CL, 1, 5)) b[k] = 1 + Math.floor(rnd() * 3); c.traversal = { mode: 'budget', hops: pick([null, null, 2, 3, 4, 6]), budgets: b }; }
    else {
      const steps = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => {
        const s = { dir: pick(['out', 'in', 'both']) }; const mn = pick([0, 0, 1, 1, 2]); s.min = mn; s.max = Math.max(1, mn + Math.floor(rnd() * 3)); if (s.max > 3) s.max = 3; if (s.min > s.max) s.min = s.max;
        const r = rnd(); if (r < 0.6) s.classes = sub(CL, 1, 3); else if (r < 0.85) s.kinds = sub(KINDS, 1, 3); else { s.classes = sub(CL, 1, 2); s.kinds = sub(KINDS, 1, 2); }
        return s;
      });
      c.traversal = { mode: 'metapath', hops: pick([null, null, 3, 5, 7]), emit: pick(['all', 'end']), steps };
    }
    c.hub = pick([{ mode: 'none' }, { mode: 'none' }, { mode: 'indeg', k: pick([0, 1, 2, 3, 5, 8, 10, 15, 25]) }, { mode: 'transport' }]);
    const rm = pick(['bfs', 'degnorm', 'ppr', 'ppr', 'cochange', 'text', 'hybrid', 'hybrid']);
    if (rm === 'ppr') c.rank = ppr();
    else if (rm === 'hybrid') { const n = 2 + Math.floor(rnd() * 2); c.rank = { mode: 'hybrid', parts: Array.from({ length: n }, simple) }; }
    else c.rank = { mode: rm };
    return c;
  };
}

// configuration hashes the builders used (relational list, both arms' random and extra groups)
function builderHashes() {
  const s = new Set();
  const add = (c) => { try { s.add(C.configHash(c)); } catch (e) { /* ignore */ } };
  for (const c of require(A + '/relational/sweep').STAGE1) add(c);
  for (const c of require(A + '/ladybug/sweep').STAGE1) add(c);
  for (const c of require(A + '/duckpgq/sweep').STAGE1) add(c);
  const lx = require(A + '/ladybug/crosscheck');
  for (const c of lx.randomConfigs()) add(c.cfg);
  for (const c of lx.extraConfigs()) add(c.cfg);
  for (const c of require(A + '/duckpgq/crosscheck_random').makeConfigs(2026, 10)) add(c.cfg);
  return s;
}

async function main() {
  const a = process.argv.slice(2); const o = { seed: 917, n: 300, arms: ['ladybug', 'duckpgq'] };
  for (let i = 0; i < a.length; i++) { if (a[i] === '--seed') o.seed = Number(a[++i]); else if (a[i] === '--n') o.n = Number(a[++i]); else if (a[i] === '--arms') o.arms = a[++i].split(','); else if (a[i] === '--only') o.only = a[++i].split(',').map(Number); else throw new Error('arg ' + a[i]); }
  const rnd = mulberry32(o.seed); const gen = generator(rnd);
  const used = builderHashes();
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  const pairs = []; let rejected = 0; let collisions = 0;
  while (pairs.length < o.n) {
    const task = tasks[Math.floor(rnd() * tasks.length)];
    let cfg; try { cfg = C.normalise(gen()); } catch (e) { rejected++; continue; }
    const tr = cfg.traversal;
    if (tr.mode === 'budget' && C.budgetStates(tr.budgets) > 1024) { rejected++; continue; }
    const h = C.configHash(cfg);
    if (used.has(h)) { collisions++; continue; }
    pairs.push({ k: pairs.length, task, cfg, hash: h });
  }
  const byParent = new Map();
  for (const p of pairs) { if (o.only && !o.only.includes(p.k)) continue; if (!byParent.has(p.task.parent)) byParent.set(p.task.parent, []); byParent.get(p.task.parent).push(p); }
  const res = { seed: o.seed, n: pairs.length, rejected_draws: rejected, builder_hash_collisions: collisions, arms: {}, by_mode: {}, examples: {} };
  for (const arm of o.arms) res.arms[arm] = { compared: 0, equiv_fail: 0, errors: 0, ranked_identical: 0, order_identical: 0, answers_identical: 0, ms: [] };
  const rows = [];
  const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const ref = await openArm('reference', G);
    const opened = {};
    for (const arm of o.arms) opened[arm] = await openArm(arm, G);
    for (const p of byParent.get(parent)) {
      const sm = H.mapSeed(G, p.task.seed);
      const y = sm.ids.length ? H.normRank(await ref.rank(sm.ids, p.cfg, p.task.seed)) : { ranked: [] };
      const ansY = JSON.stringify({ ...H.answer(G, p.task, sm, y, p.cfg, 'x', 0), ms: null, engine_ms: null });
      const chk = ref.raw.ref.explainChecker(sm.ids, p.cfg);
      const row = { k: p.k, task: p.task.id, set: p.task.set, parent: parent.slice(0, 8), mode: p.cfg.traversal.mode + '/' + p.cfg.rank.mode, hash: p.hash, n_ref: y.ranked.length };
      for (const arm of o.arms) {
        const R = res.arms[arm]; R.compared++;
        let x; const s = Date.now();
        try { x = sm.ids.length ? H.normRank(await opened[arm].rank(sm.ids, p.cfg, p.task.seed)) : { ranked: [] }; } catch (e) { R.errors++; row[arm] = { error: String(e.message).slice(0, 300) }; continue; }
        R.ms.push(Date.now() - s);
        const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
        const ident = E.strict(x.ranked, y.ranked);
        const orderSame = x.ranked.length === y.ranked.length && x.ranked.every((q, j) => q.i === y.ranked[j].i);
        const ansX = JSON.stringify({ ...H.answer(G, p.task, sm, x, p.cfg, 'x', 0), ms: null, engine_ms: null });
        if (!ev.ok) R.equiv_fail++;
        if (ident) R.ranked_identical++;
        if (orderSame) R.order_identical++;
        if (ansX === ansY) R.answers_identical++;
        row[arm] = { ok: ev.ok, reason: ev.ok ? null : ev.reason, n: x.ranked.length, ident, orderSame, ansSame: ansX === ansY };
        const bm = res.by_mode[arm + ' ' + row.mode] = res.by_mode[arm + ' ' + row.mode] || { n: 0, fail: 0 };
        bm.n++; if (!ev.ok) bm.fail++;
        if (!ev.ok && (res.examples[arm] || []).length < 5) {
          res.examples[arm] = res.examples[arm] || [];
          const at = ev.at == null ? 0 : ev.at;
          res.examples[arm].push({ k: p.k, task: p.task.id, cfg: p.cfg, reason: ev.reason, seeds: sm.ids, arm_items: x.ranked.slice(Math.max(0, at - 2), at + 3), ref_items: y.ranked.slice(Math.max(0, at - 2), at + 3), n: [x.ranked.length, y.ranked.length] });
        }
        if (!orderSame && ev.ok && (res.examples[arm + ' order-only'] || []).length < 3) {
          res.examples[arm + ' order-only'] = res.examples[arm + ' order-only'] || [];
          let j = 0; while (j < x.ranked.length && x.ranked[j].i === y.ranked[j].i) j++;
          res.examples[arm + ' order-only'].push({ k: p.k, task: p.task.id, cfg: p.cfg, first_diff: j, arm_items: x.ranked.slice(j, j + 3), ref_items: y.ranked.slice(j, j + 3) });
        }
      }
      rows.push(row);
      if (rows.length % 25 === 0) process.stderr.write(`${rows.length}/${pairs.length} pairs, ${((Date.now() - t0) / 1000).toFixed(0)} s, fails ${o.arms.map((x) => x + '=' + res.arms[x].equiv_fail).join(' ')}\n`);
    }
    for (const arm of o.arms) await opened[arm].close();
    await ref.close();
  }
  for (const arm of o.arms) { const m = res.arms[arm].ms.sort((x, y) => x - y); res.arms[arm].ms_p50 = m[Math.floor(m.length / 2)]; res.arms[arm].ms_max = m[m.length - 1]; delete res.arms[arm].ms; }
  res.wall_s = (Date.now() - t0) / 1000;
  res.pairs = pairs.map((p) => ({ k: p.k, task: p.task.id, hash: p.hash, cfg: p.cfg }));
  fs.mkdirSync('/build/audit/graph/results', { recursive: true });
  fs.writeFileSync('/build/audit/graph/results/crosscheck300' + (o.only ? '_subset' : '') + '.json', JSON.stringify(res, null, 1));
  fs.writeFileSync('/build/audit/graph/results/crosscheck300' + (o.only ? '_subset' : '') + '.rows.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(JSON.stringify({ arms: res.arms, wall_s: res.wall_s, rejected, collisions }));
}
main().catch((e) => { console.error(e); process.exit(1); });
