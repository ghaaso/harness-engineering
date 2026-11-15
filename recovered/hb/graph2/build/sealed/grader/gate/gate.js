'use strict';
// GRADER GATE (stage 1). An independent four-arm cross-check on N seeded random (configuration, TUNE
// task) pairs: relational, reference, ladybug, duckpgq. Written by the grader; starts from
// audit/fixes/c7_crosscheck.js and audit/graph/crosscheck300.js, with its own generator.
//   relational vs reference: STRICT (ranked lists byte-identical AND packed answers identical apart
//                            from arm, timing, meta and lookups fields)
//   ladybug, duckpgq vs reference: arms/common/equiv.js with the reference explanation checker; also
//                            recorded: byte-identical ranked list, identical order, identical answer
//   ladybug native typed path pattern (traversal.variant = "pattern") on every metapath pair: equiv.js
// Three strata (pairs per stratum given in brackets for N = 300):
//   A [120] metapath: 3 directions x 4 ranking cells (degnorm; hybrid with degnorm; hybrid without
//       degnorm; one single non-degnorm ranking), 10 pairs per cell; steps lean against the configured
//       direction and toward kinds or classes absent at many or all commits.
//   B [90]  stage-2 neighbourhood: a specified stage-1 entry of the relational, ladybug or duckpgq list
//       with 1 or 2 random one-factor changes (a plausible stage-2 proposal).
//   C [90]  general random (every traversal mode, ranking, hub rule, minConf, pad, form, granularity).
// Fresh stores on this lane's own volume (GT_STORE), not the builders' stores. TUNE only.
//   node gate.js [--n 300] [--seed 20261120] [--out /out]
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || '/build';
const A = path.join(B, 'arms');
const C = require(A + '/common/config');
const H = require(A + '/common/harness');
const E = require(A + '/common/equiv');
const { graphFor, openArm } = require(A + '/common/arms');
const { CLASSES } = require(A + '/common/edgeclasses');

const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const N = Number(opt('n', 300)); const SEED = Number(opt('seed', 20261120)); const OUT = opt('out', '/out');
const ONLY = opt('only', null);
// --focus: a supplement where every pair is drawn by the harness's own focused generator
// (arms/common/crosscheck_random.js drawConfig(r, i, true): metapath, direction dependents or
// dependencies, degnorm alone or in a hybrid, steps leaning against the direction and to rare kinds),
// with this lane's own seed. Output files get the suffix _focus.
const FOCUS = argv.includes('--focus');
const SUF = (FOCUS ? '_focus' : '') + (ONLY ? '_only' : '');
const FOCUS_DRAW = FOCUS ?require(A + '/common/crosscheck_random').drawConfig : null;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(SEED);
const pick = (a) => a[Math.floor(r() * a.length)];
const sub = (a, lo, hi) => { const b = [...a]; const k = lo + Math.floor(r() * (hi - lo + 1)); const o = []; while (o.length < k && b.length) o.push(b.splice(Math.floor(r() * b.length), 1)[0]); return o; };
const clone = (x) => JSON.parse(JSON.stringify(x));

const CL = CLASSES.filter((c) => c !== 'experimental');
const COMMON_KINDS = ['calls', 'imports', 'calls_url', 'registers_route', 'reads_table', 'writes_table', 'co_changed', 'defines', 'mocks', 'reads_setting', 'depends_injects', 'test_calls_route', 'contains', 'renders', 'cites', 'mentions', 'foreign_key', 'migration_touches'];
const RARE_KINDS = ['enqueues_kind', 'kind_handled_by', 'registers_job', 'runs', 'navigates', 'returns_model', 'has_field', 'reads_response_field', 'overrides', 'passes_callable', 'inherits', 'uses_constant'];
const DIRS = ['dependents', 'dependencies', 'both'];

const ppr = () => ({ mode: 'ppr', restart: pick([0.15, 0.3, 0.5, 0.15, 0.3, 0.7]), cochange_w: pick([0, 0.5, 1, 3]) });
const simpleNonDeg = () => { const m = pick(['bfs', 'ppr', 'ppr', 'cochange', 'text']); return m === 'ppr' ? ppr() : { mode: m }; };
const shared = () => ({ granularity: pick(['file', 'file', 'symbol']), form: pick(['signature', 'signature', 'snippet', 'paths', 'range']), pad: pick(['none', 'none', 'DIR', 'CO']), minConf: pick([0, 0.25, 0.5, 0.5, 0.75, 1]) });
const hub = () => pick([{ mode: 'none' }, { mode: 'none' }, { mode: 'indeg', k: pick([0, 3, 5, 10, 15]) }, { mode: 'transport' }]);

function metapathSteps(direction) {
  const against = direction === 'dependents' ? 'out' : direction === 'dependencies' ? 'in' : null;
  const k = 1 + Math.floor(r() * 4); const steps = [];
  for (let j = 0; j < k; j++) {
    const max = 1 + Math.floor(r() * 3); const s = { dir: against && r() < 0.5 ? against : pick(['out', 'in', 'both']), min: Math.min(max, pick([0, 0, 1, 1, 2])), max };
    const u = r();
    if (u < 0.25) s.kinds = [pick(RARE_KINDS)];
    else if (u < 0.32) s.classes = ['experimental'];
    else if (u < 0.65) s.classes = sub(CL, 1, 3);
    else if (u < 0.9) s.kinds = sub(COMMON_KINDS, 1, 3);
    else { s.classes = sub(CL, 1, 2); s.kinds = sub([...COMMON_KINDS, ...RARE_KINDS], 1, 2); }
    steps.push(s);
  }
  return steps;
}

const RANK_CELLS = ['degnorm', 'hybrid+degnorm', 'hybrid-nodeg', 'single'];
function stratumA(i) {
  const direction = DIRS[i % 3]; const cell = RANK_CELLS[Math.floor(i / 3) % 4];
  let rank;
  if (cell === 'degnorm') rank = { mode: 'degnorm' };
  else if (cell === 'hybrid+degnorm') { const parts = [{ mode: 'degnorm' }, simpleNonDeg()]; if (r() < 0.3) parts.push(simpleNonDeg()); rank = { mode: 'hybrid', parts }; }
  else if (cell === 'hybrid-nodeg') rank = { mode: 'hybrid', parts: [ppr(), pick([{ mode: 'text' }, { mode: 'cochange' }, { mode: 'bfs' }])] };
  else rank = simpleNonDeg();
  return { ...shared(), direction, traversal: { mode: 'metapath', hops: pick([null, null, 3, 4, 6]), emit: pick(['all', 'all', 'end']), steps: metapathSteps(direction) }, hub: hub(), rank, _cell: 'A ' + direction + ' ' + cell };
}

function stage1Spec() {
  const seen = new Map();
  for (const arm of ['relational', 'ladybug', 'duckpgq']) {
    for (const x of H.loadArmList(arm, 1, false).list) if (!C.isExtension(x.cfg) && !seen.has(x.hash)) seen.set(x.hash, { name: x.name, arms: [arm], cfg: x.cfg });
    else if (seen.has(x.hash)) seen.get(x.hash).arms.push(arm);
  }
  return [...seen.values()];
}

const MUTATIONS = ['hops', 'direction', 'classes', 'minConf', 'rank', 'rank', 'hub', 'pad', 'granularity', 'form', 'traversal'];
function mutate(c0, m) {
  const c = clone(c0); const tr = c.traversal;
  if (m === 'hops') tr.hops = tr.mode === 'khop' ? pick([1, 2, 3, 4, 5, 6, null]) : pick([null, 3, 4, 6]);
  else if (m === 'direction') c.direction = pick(DIRS);
  else if (m === 'classes') {
    if (tr.mode === 'khop') { if (r() < 0.5 && c.classes.length > 1) c.classes.splice(Math.floor(r() * c.classes.length), 1); else c.classes = [...new Set([...c.classes, pick(CL)])]; }
    else if (tr.mode === 'budget') { tr.budgets[pick(CL)] = 1 + Math.floor(r() * 2); }
    else { const s = pick(tr.steps); s.classes = [...new Set([...(s.classes || []), pick(CL)])]; }
  } else if (m === 'minConf') c.minConf = pick([0, 0.25, 0.75, 1]);
  else if (m === 'rank') {
    const u = r();
    if (u < 0.2) c.rank = { mode: 'degnorm' };
    else if (u < 0.45) c.rank = ppr();
    else if (u < 0.6) c.rank = simpleNonDeg();
    else { const parts = [pick([ppr(), { mode: 'degnorm' }, { mode: 'bfs' }]), pick([{ mode: 'text' }, { mode: 'cochange' }, { mode: 'degnorm' }])]; if (r() < 0.3) parts.push(simpleNonDeg()); c.rank = { mode: 'hybrid', parts }; }
  } else if (m === 'hub') c.hub = hub();
  else if (m === 'pad') c.pad = pick(['none', 'DIR', 'CO']);
  else if (m === 'granularity') c.granularity = c.granularity === 'file' ? 'symbol' : 'file';
  else if (m === 'form') c.form = pick(['signature', 'snippet', 'paths', 'range']);
  else if (m === 'traversal') {
    const u = r();
    if (u < 0.4) { const b = {}; for (const k of sub(CL, 1, 4)) b[k] = 1 + Math.floor(r() * 3); c.traversal = { mode: 'budget', hops: pick([null, 3, 4, 6]), budgets: b }; }
    else if (u < 0.8) c.traversal = { mode: 'metapath', hops: pick([null, 3, 4]), emit: pick(['all', 'end']), steps: metapathSteps(c.direction) };
    else c.traversal = { mode: 'khop', hops: pick([1, 2, 3, null]) };
    if (c.traversal.mode === 'khop' && !c.classes.length) c.classes = sub(CL, 2, 8);
  }
  return c;
}
let S1 = null;
function stratumB() {
  const base = pick(S1); const k = r() < 0.5 ? 1 : 2; let c = clone(base.cfg); const ms = [];
  for (let j = 0; j < k; j++) { const m = pick(MUTATIONS); ms.push(m); c = mutate(c, m); }
  c._cell = 'B ' + base.name + ' + ' + ms.join('+');
  return c;
}

function stratumC() {
  const t = pick(['khop', 'khop', 'khop', 'budget', 'metapath']);
  const c = { ...shared(), direction: pick(DIRS) };
  if (t === 'khop') { c.classes = sub(CL, 1, CL.length); c.traversal = { mode: 'khop', hops: pick([0, 1, 2, 2, 3, 4, 5, 6, null]) }; }
  else if (t === 'budget') { const b = {}; for (const k of sub(CL, 1, 5)) b[k] = 1 + Math.floor(r() * 3); c.traversal = { mode: 'budget', hops: pick([null, null, 2, 3, 4, 6]), budgets: b }; }
  else c.traversal = { mode: 'metapath', hops: pick([null, 3, 5]), emit: pick(['all', 'end']), steps: metapathSteps(c.direction) };
  c.hub = hub();
  const rm = pick(['bfs', 'degnorm', 'ppr', 'ppr', 'cochange', 'text', 'hybrid', 'hybrid']);
  if (rm === 'ppr') c.rank = ppr();
  else if (rm === 'hybrid') { const n = 2 + Math.floor(r() * 2); c.rank = { mode: 'hybrid', parts: Array.from({ length: n }, () => (r() < 0.3 ? { mode: 'degnorm' } : simpleNonDeg())) }; }
  else c.rank = { mode: rm };
  c._cell = 'C ' + t + '/' + c.rank.mode;
  return c;
}

function absentStep(G, cfg) {
  if (cfg.traversal.mode !== 'metapath') return false;
  const kinds = new Set(G.edges.map((e) => e.kind)); const cls = new Set(G.edges.map((e) => e.c));
  return cfg.traversal.steps.some((s) => !s.kinds.some((k) => kinds.has(k)) && !s.classes.some((c) => cls.has(CLASSES.indexOf(c))));
}
const strip = (x) => { const o = { ...x }; for (const k of ['arm', 'ms', 'engine_ms', 'meta', 'lookups', 'lookups_head', 'lookups_pad']) delete o[k]; return JSON.stringify(o); };

async function main() {
  S1 = stage1Spec();
  const s1hash = new Set(S1.map((x) => C.configHash(x.cfg)));
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  if (tasks.some((t) => t.split !== 'tune')) throw new Error('non-tune task');
  const nA = Math.round(N * 0.4); const nB = Math.round(N * 0.3);
  const pairs = []; let rejected = 0;
  for (let i = 0; pairs.length < N; i++) {
    const k = pairs.length; const stratum = k < nA ? 'A' : k < nA + nB ? 'B' : 'C';
    let raw; let cfg = null; let tries = 0;
    while (!cfg && tries++ < 100) {
      raw = FOCUS ? { ...FOCUS_DRAW(r, k, true), _cell: 'F' } : stratum === 'A' ? stratumA(k) : stratum === 'B' ? stratumB() : stratumC();
      const cell = raw._cell; delete raw._cell;
      try { cfg = C.normalise(raw); cfg._cell = cell; } catch (e) { rejected++; cfg = null; }
      if (cfg && cfg.traversal.mode === 'budget' && C.budgetStates(cfg.traversal.budgets) > 1024) { rejected++; cfg = null; }
    }
    if (!cfg) throw new Error('no valid configuration for pair ' + k);
    const cell = cfg._cell; delete cfg._cell;
    pairs.push({ k, stratum, cell, task: tasks[Math.floor(r() * tasks.length)], cfg, hash: C.configHash(cfg), in_stage1: s1hash.has(C.configHash(cfg)) });
  }
  const byParent = new Map();
  for (const p of pairs) { if (ONLY && !ONLY.split(',').map(Number).includes(p.k)) continue; if (!byParent.has(p.task.parent)) byParent.set(p.task.parent, []); byParent.get(p.task.parent).push(p); }
  const ARMS = ['relational', 'ladybug', 'duckpgq'];
  const res = { seed: SEED, n: pairs.length, rejected_draws: rejected, parents: byParent.size, arms: {}, pattern: { compared: 0, equiv_fail: 0, identical: 0, errors: 0 }, coverage: {}, failures: [] };
  for (const a of ARMS) res.arms[a] = { compared: 0, errors: 0, equiv_fail: 0, ranked_identical: 0, order_identical: 0, answers_identical: 0, strict_fail: 0 };
  const cov = res.coverage; const bump = (k) => { cov[k] = (cov[k] || 0) + 1; };
  const rows = []; const t0 = Date.now();
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const ref = await openArm('reference', G);
    const op = {}; for (const a of ARMS) op[a] = await openArm(a, G);
    for (const p of byParent.get(parent)) {
      const t = p.task; const cfg = p.cfg; const sm = H.mapSeed(G, t.seed);
      const row = { k: p.k, stratum: p.stratum, cell: p.cell, task: t.id, set: t.set, parent: parent.slice(0, 8), hash: p.hash, mode: cfg.traversal.mode + '/' + cfg.direction + '/' + cfg.rank.mode, in_stage1: p.in_stage1 };
      if (!sm.ids.length) { row.no_seed = true; rows.push(row); bump('no_seed'); continue; }
      bump('stratum=' + p.stratum); bump('trav=' + cfg.traversal.mode); bump('rank=' + cfg.rank.mode); bump('dir=' + cfg.direction); bump('hub=' + cfg.hub.mode); bump('pad=' + cfg.pad); bump('form=' + cfg.form); bump('gran=' + cfg.granularity);
      const hasDeg = cfg.rank.mode === 'degnorm' || (cfg.rank.mode === 'hybrid' && cfg.rank.parts.some((q) => q.mode === 'degnorm'));
      if (cfg.traversal.mode === 'metapath') bump('metapath|' + cfg.direction + '|' + (cfg.rank.mode === 'degnorm' ? 'degnorm' : cfg.rank.mode === 'hybrid' ? (hasDeg ? 'hybrid+degnorm' : 'hybrid-nodeg') : 'other'));
      const od0 = ref.raw.ref.stats.degnorm_od0;
      let y;
      try { y = H.normRank(await ref.rank(sm.ids, cfg, t.seed)); } catch (e) { row.ref_error = String(e.message || e).slice(0, 300); res.failures.push({ arm: 'reference', k: p.k, task: t.id, error: row.ref_error, cfg }); rows.push(row); continue; }
      row.od0 = ref.raw.ref.stats.degnorm_od0 > od0; if (row.od0) bump('degnorm_od0_used');
      row.absent = absentStep(G, cfg); if (row.absent) { bump('absent_step'); if (!y.ranked.length) bump('absent_step_reach_empty'); }
      row.n_ref = y.ranked.length; if (!y.ranked.length) bump('reach_empty');
      const chk = ref.raw.ref.explainChecker(sm.ids, cfg);
      const ansY = strip(H.answer(G, t, sm, y, cfg, 'x', 0));
      for (const a of ARMS) {
        const R = res.arms[a]; R.compared++;
        let x;
        try { x = H.normRank(await op[a].rank(sm.ids, cfg, t.seed)); } catch (e) { R.errors++; row[a] = { error: String(e.message || e).slice(0, 300) }; res.failures.push({ arm: a, k: p.k, task: t.id, stratum: p.stratum, cell: p.cell, error: row[a].error, cfg }); continue; }
        const ev = E.equivalent(x.ranked, y.ranked, chk, chk);
        const ident = E.strict(x.ranked, y.ranked);
        const orderSame = x.ranked.length === y.ranked.length && x.ranked.every((q, j) => q.i === y.ranked[j].i);
        const ansSame = strip(H.answer(G, t, sm, x, cfg, 'x', 0)) === ansY;
        if (ident) R.ranked_identical++; if (orderSame) R.order_identical++; if (ansSame) R.answers_identical++;
        let bad = !ev.ok;
        if (a === 'relational') { const sf = !ident || !ansSame; if (sf) R.strict_fail++; bad = bad || sf; }
        if (!ev.ok) R.equiv_fail++;
        row[a] = { ok: !bad, equiv: ev.ok, reason: ev.ok ? null : ev.reason, ident, orderSame, ansSame, n: x.ranked.length };
        if (bad) {
          const at = ev.at == null ? 0 : ev.at; let j = 0; while (j < Math.min(x.ranked.length, y.ranked.length) && JSON.stringify(x.ranked[j]) === JSON.stringify(y.ranked[j])) j++;
          res.failures.push({ arm: a, k: p.k, task: t.id, stratum: p.stratum, cell: p.cell, in_stage1: p.in_stage1, reason: ev.ok ? 'strict difference (ranked identical ' + ident + ', answer identical ' + ansSame + ')' : ev.reason, first_diff: j, arm_items: x.ranked.slice(Math.max(0, at - 1), at + 2), ref_items: y.ranked.slice(Math.max(0, at - 1), at + 2), n: [x.ranked.length, y.ranked.length], cfg });
        }
      }
      if (cfg.traversal.mode === 'metapath') {
        const pc = clone(cfg); pc.traversal.variant = 'pattern';
        try {
          const z = H.normRank(await op.ladybug.rank(sm.ids, pc, t.seed)); res.pattern.compared++;
          const pv = E.equivalent(z.ranked, y.ranked, chk, chk); if (!pv.ok) { res.pattern.equiv_fail++; res.failures.push({ arm: 'ladybug-pattern', k: p.k, task: t.id, stratum: p.stratum, cell: p.cell, reason: pv.reason, n: [z.ranked.length, y.ranked.length], cfg: pc }); }
          if (E.strict(z.ranked, y.ranked)) res.pattern.identical++;
          row.pattern = pv.ok;
        } catch (e) { res.pattern.errors++; row.pattern = 'error: ' + String(e.message || e).slice(0, 200); res.failures.push({ arm: 'ladybug-pattern', k: p.k, task: t.id, error: row.pattern, cfg: pc }); }
      }
      rows.push(row);
      if (rows.length % 25 === 0) process.stderr.write(rows.length + '/' + pairs.length + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s fails ' + res.failures.length + '\n');
    }
    for (const a of ARMS) await op[a].close();
    await ref.close();
  }
  res.wall_s = (Date.now() - t0) / 1000;
  res.in_stage1_pairs = pairs.filter((p) => p.in_stage1).length;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'gate' + SUF + '.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(OUT, 'gate' + SUF + '.rows.jsonl'), rows.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'gate' + SUF + '.pairs.jsonl'), pairs.map((p) => JSON.stringify({ k: p.k, stratum: p.stratum, cell: p.cell, task: p.task.id, hash: p.hash, cfg: p.cfg })).join('\n') + '\n');
  console.log(JSON.stringify({ arms: res.arms, pattern: res.pattern, failures: res.failures.length, wall_s: res.wall_s, parents: res.parents }));
}
main().catch((e) => { console.error(e); process.exit(1); });
