'use strict';
// Check 1 and part of check 2: independent recomputation of every held-out aggregate in data.json from the re-scorer's
// per-task values and the stored answers, with my own bootstrap (lib.js). Writes b_heldout.json.
const L = require('./lib.js');
const { fs, path, B, OUT, gz, mean, median, paired, clusterMeans, refHO, refTU, clusterOf, perTask, ARMS, rowsOf, answers, runtimeOf, shownItems, creditUnits } = L;
const out = { table: {}, comparisons: {}, splits: {}, sensitivity: {}, t3: {}, draws: {}, padding: {}, tuning_split: {} };
const auc = (r) => ((0 + r.r2000) / 2 * 2000 + (r.r2000 + r.r4000) / 2 * 2000 + (r.r4000 + r.r8000) / 2 * 4000 + (r.r8000 + r.r16000) / 2 * 8000) / 16000;
for (const rows of perTask().values()) for (const r of rows) if (r.r8000 != null) r.auc = auc(r);
const key = (r, mode) => clusterOf(refHO.get(r.id), mode);
const cm = (rows, metric, mode, filter) => clusterMeans(rows, metric, (r) => key(r, mode), filter);
const pick = (p) => ({ n: p.n, mean_a: p.mean_a, mean_b: p.mean_b, diff: p.diff, ci95: p.ci95, a_higher: p.a_higher, b_higher: p.b_higher, ties: p.ties });

// ---- 1. held-out table ----
for (const [k, rows] of perTask()) {
  const set = k.split('/').pop(); const m = (metric) => { const c = cm(rows, metric); return mean([...c.values()]); };
  const c8 = [...cm(rows, 'r8000').values()]; const mu = mean(c8); const se = Math.sqrt(c8.reduce((s, x) => s + (x - mu) ** 2, 0) / (c8.length - 1)) / Math.sqrt(c8.length);
  out.table[k] = { tasks: rows.length, clusters: c8.length, primary: mu, se, r2000: m('r2000'), r4000: m('r4000'), r8000: mu, r16000: m('r16000'), auc: m('auc'), def: m('def8000'), file: m('file8000'), unpad: m('unpad8000'),
    median_tok8000: median(rows.map((r) => r.tok8000)), median_lookups: median(rows.map((r) => r.lookups)), share_r16000_ge_08: rows.filter((r) => r.r16000 >= 0.8 - 1e-12).length / rows.length };
  if (set === 'T3') { const p = [...cm(rows, 'r8000', 'parent').values()]; out.table[k].primary_parent = mean(p); }
}

// ---- 2. comparisons (every row of comparisons.json with arms) ----
const G = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/comparisons.json'), 'utf8')).comparisons;
for (const c of G) {
  if (!c.a_arm) continue; const ka = c.a_arm + '/' + c.a_role; const kb = c.b_arm + '/' + c.b_role; const o = { a: ka, b: kb, sets: {} };
  for (const set of Object.keys(c.sets)) {
    const A = perTask().get(ka + '/' + set); const Bb = perTask().get(kb + '/' + set); o.sets[set] = {};
    for (const metric of ['r8000', 'r2000', 'r4000', 'r16000', 'auc']) o.sets[set][metric] = pick(paired(cm(A, metric), cm(Bb, metric)));
    o.sets[set].median_tok_a = median(A.map((r) => r.tok8000)); o.sets[set].median_tok_b = median(Bb.map((r) => r.tok8000));
  }
  out.comparisons[c.id] = o;
}

// ---- 3. runtime split of every H3 comparison (T1), with and without T1-0786 ----
const H3 = [['typed_vs_search', 'typed', 'search'], ['typed_vs_search_s2', 'typed', 'search2'], ['typed_vs_cochange_floor', 'typed', 'fco'], ['typed_vs_samedir_floor', 'typed', 'fdir'], ['cochange_floor_vs_search', 'fco', 'search']];
const rt = (id) => runtimeOf(refHO.get(id).seed.path);
const GR = { mobile: (r) => rt(r.id) === 'mobile', backend: (r) => rt(r.id) === 'backend', web_without_root_task: (r) => rt(r.id) === 'web', web_with_root_task: (r) => ['web', 'root'].includes(rt(r.id)), not_mobile: (r) => rt(r.id) !== 'mobile', all: () => true };
const t1 = rowsOf('typed', 'T1');
out.splits.root_tasks = t1.filter((r) => rt(r.id) === 'root').map((r) => [r.id, refHO.get(r.id).seed.path]);
out.splits.counts = {}; for (const [g, f] of Object.entries(GR)) { const s = t1.filter(f); out.splits.counts[g] = { tasks: s.length, commits: new Set(s.map((r) => refHO.get(r.id).commit)).size }; }
out.splits.comparisons = {};
for (const [n, a, b] of H3) { out.splits.comparisons[n] = {}; for (const [g, f] of Object.entries(GR)) out.splits.comparisons[n][g] = pick(paired(cm(rowsOf(a, 'T1'), 'r8000', null, f), cm(rowsOf(b, 'T1'), 'r8000', null, f))); }

// ---- 3b. tuning split: my own re-score of the stored tuning answers of the frozen configurations ----
const FROZEN = { typed: ['duckpgq', '95e990307da3b42b'], typed_lb: ['ladybug', '95e990307da3b42b'], search: ['search', 'e70177e5807f0252'], search2: ['search', '950c029615d337c1'], fco: ['floor-co', 'c4d2f0a60a3d199c'], fdir: ['floor-dir', '714a474060653c1f'] };
const tune = {};
for (const [k, [arm, h]] of Object.entries(FROZEN)) {
  const f = path.join(B, 'results', arm, 'tune', h + '.T1.jsonl.gz'); if (!fs.existsSync(f)) { tune[k] = null; continue; }
  tune[k] = gz(f).map((rec) => { const ref = refTU.get(rec.id); const u = ref.files.length + ref.defs.length; return { id: rec.id, commit: ref.commit, rt: runtimeOf(ref.seed.path), r8000: u ? creditUnits(shownItems(rec, 8000), ref) / u : null, sig: JSON.stringify(rec.items.map((i) => [i.path, i.shown])) }; });
}
out.tuning_split.rows_found = Object.fromEntries(Object.entries(tune).map(([k, v]) => [k, v ? v.length : 0]));
if (tune.typed && tune.typed_lb) out.tuning_split.duckpgq_vs_ladybug_items_identical = tune.typed.filter((r, i) => r.sig === tune.typed_lb.find((x) => x.id === r.id).sig).length;
const TG = { mobile: (r) => r.rt === 'mobile', backend: (r) => r.rt === 'backend', web_without_root_task: (r) => r.rt === 'web', not_mobile: (r) => r.rt !== 'mobile', all: () => true };
out.tuning_split.counts = {}; for (const [g, f] of Object.entries(TG)) { const s = tune.typed.filter(f); out.tuning_split.counts[g] = { tasks: s.length, commits: new Set(s.map((r) => r.commit)).size }; }
out.tuning_split.root = tune.typed.filter((r) => r.rt === 'root').length;
out.tuning_split.comparisons = {};
for (const [n, a, b] of H3) { out.tuning_split.comparisons[n] = {}; for (const [g, f] of Object.entries(TG)) out.tuning_split.comparisons[n][g] = pick(paired(clusterMeans(tune[a], 'r8000', (r) => r.commit, f), clusterMeans(tune[b], 'r8000', (r) => r.commit, f))); }
out.tuning_split.primary = Object.fromEntries(Object.entries(tune).map(([k, v]) => [k, mean([...clusterMeans(v, 'r8000', (r) => r.commit).values()])]));
out.splits.reweighted = {}; const tot = tune.typed.length;
for (const [n] of H3) { const g = out.splits.comparisons[n]; const w = (x) => out.tuning_split.counts[x].tasks / tot; out.splits.reweighted[n] = g.mobile.diff * w('mobile') + g.backend.diff * w('backend') + g.web_without_root_task.diff * w('web_without_root_task'); }

// ---- 4. sensitivity (T1) ----
const info = new Map();
for (const r of t1) { const ref = refHO.get(r.id); if (!info.has(ref.commit)) info.set(ref.commit, { commit: ref.commit, changed_files: ref.commit_n_files_all, tasks: 0, units: 0 }); const o = info.get(ref.commit); o.tasks++; o.units += r.units; }
const largest = (f) => [...info.values()].sort((x, y) => y[f] - x[f] || (x.commit < y.commit ? -1 : 1)).slice(0, 3);
out.sensitivity.largest = { by_changed_files: largest('changed_files'), by_tasks: largest('tasks'), by_reference_units: largest('units') };
// tie check at the cut-off of each "largest" list
out.sensitivity.largest_ties = Object.fromEntries(['changed_files', 'tasks', 'units'].map((f) => { const s = [...info.values()].sort((x, y) => y[f] - x[f]); return [f, s.slice(0, 5).map((x) => x[f])]; }));
const seedDist = {}; for (const k of Object.keys(ARMS)) { const d = {}; for (const a of answers(k, 'T1').values()) d[a.seed_match] = (d[a.seed_match] || 0) + 1; seedDist[k] = d; }
out.sensitivity.seed_dist = seedDist;
const idOnly = (r) => answers('typed', 'T1').get(r.id).seed_match === 'id';
out.sensitivity.id_only = { tasks: t1.filter(idOnly).length, commits: new Set(t1.filter(idOnly).map((r) => refHO.get(r.id).commit)).size };
out.sensitivity.comparisons = {};
for (const [n, a, b] of H3) {
  const A = rowsOf(a, 'T1'); const Bb = rowsOf(b, 'T1');
  const full = paired(cm(A, 'r8000'), cm(Bb, 'r8000'));
  const order = full.keys.map((k, i) => [k, full.diffs[i]]).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const P = (opts, metric = 'r8000', filter) => pick(paired(cm(A, metric, null, filter), cm(Bb, metric, null, filter), opts));
  const loo = order.map((x) => (full.diff * order.length - x[1]) / (order.length - 1));
  const idBoth = (r) => answers(a, 'T1').get(r.id).seed_match === 'id' && answers(b, 'T1').get(r.id).seed_match === 'id';
  out.sensitivity.comparisons[n] = { full: pick(full), drop_3_most_favourable_to_a: P({ drop: order.slice(0, 3).map((x) => x[0]) }), drop_5_most_favourable_to_a: P({ drop: order.slice(0, 5).map((x) => x[0]) }),
    drop_5_most_favourable_to_b: P({ drop: order.slice(-5).map((x) => x[0]) }), drop_3_largest_by_changed_files: P({ drop: out.sensitivity.largest.by_changed_files.map((x) => x.commit) }),
    drop_3_largest_by_tasks: P({ drop: out.sensitivity.largest.by_tasks.map((x) => x.commit) }), drop_3_largest_by_reference_units: P({ drop: out.sensitivity.largest.by_reference_units.map((x) => x.commit) }),
    seeds_matched_by_id_only: P({}, 'r8000', idBoth), leave_one_commit_out_range: [Math.min(...loo), Math.max(...loo)],
    at_2000_tokens: P({}, 'r2000'), at_4000_tokens: P({}, 'r4000'), at_16000_tokens: P({}, 'r16000'),
    order_ties_at_cut: { fifth: order[4][1], sixth: order[5][1], third: order[2][1], fourth: order[3][1], last5: order[order.length - 5][1], last6: order[order.length - 6][1] } };
}

// ---- 5. T3 three ways ----
const T3C = [...H3, ['lbs2_vs_typed', 'lbs2', 'typed'], ['s1_vs_typed', 's1', 'typed']];
const t3rows = rowsOf('typed', 'T3');
out.t3.counts = { tasks: t3rows.length, parents: new Set(t3rows.map((r) => refHO.get(r.id).parent)).size, documents: new Set(t3rows.map((r) => refHO.get(r.id).doc)).size, groups: {} };
for (const r of t3rows) { const k = key(r, 'parentdoc'); out.t3.counts.groups[k] = (out.t3.counts.groups[k] || 0) + 1; }
out.t3.comparisons = {};
for (const [n, a, b] of T3C) {
  const A = rowsOf(a, 'T3'); const Bb = rowsOf(b, 'T3'); const o = {};
  for (const mode of ['task', 'parent', 'parentdoc']) o[mode] = pick(paired(cm(A, 'r8000', mode), cm(Bb, 'r8000', mode)));
  const pa = cm(A, 'r8000', 'parentdoc'); const pb = cm(Bb, 'r8000', 'parentdoc');
  o.per_group = [...pa.keys()].map((k) => ({ tasks: out.t3.counts.groups[k], mean_a: pa.get(k), mean_b: pb.get(k), sign: Math.sign(Math.abs(pa.get(k) - pb.get(k)) < 1e-12 ? 0 : pa.get(k) - pb.get(k)) }));
  out.t3.comparisons[n] = o;
}

// ---- 6. five community draws ----
out.draws.rows = {};
for (const d of ['lbs2', 'lbs2d1', 'lbs2d2', 'lbs2d3', 'lbs2d4']) {
  const o = {};
  for (const set of ['T1', 'T2', 'T3']) o[set] = pick(paired(cm(rowsOf(d, set), 'r8000'), cm(rowsOf('typed', set), 'r8000')));
  for (const m of ['r2000', 'r4000']) o[m] = pick(paired(cm(rowsOf(d, 'T1'), m), cm(rowsOf('typed', 'T1'), m)));
  o.median_tok = [median(rowsOf(d, 'T1').map((r) => r.tok8000)), median(rowsOf('typed', 'T1').map((r) => r.tok8000))];
  out.draws.rows[d] = o;
}
const p1 = Object.values(out.draws.rows).map((o) => o.T1.mean_a); const pm = mean(p1);
out.draws.spread = { min: Math.min(...p1), max: Math.max(...p1), mean: pm, sd_sample: Math.sqrt(p1.reduce((s, x) => s + (x - pm) ** 2, 0) / (p1.length - 1)), sd_pop: Math.sqrt(p1.reduce((s, x) => s + (x - pm) ** 2, 0) / p1.length) };

// ---- 7. padding and co-change shares (from the stored answers, my own credit code) ----
for (const k of ['typed', 's1', 'lbs2', 'search', 'search2', 'fdir', 'fco']) {
  const rows = []; const A = answers(k, 'T1');
  for (const [id, rec] of A) {
    const ref = refHO.get(id); const u = ref.files.length + ref.defs.length; if (!u) continue;
    const all = creditUnits(shownItems(rec, 8000), ref) / u;
    const head = creditUnits(shownItems(rec, 8000, (it) => !it.pad), ref) / u;
    const noCo = creditUnits(shownItems(rec, 8000, (it) => !it.pad && !((it.via || []).includes('co_changed'))), ref) / u;
    rows.push({ id, recall: all, head, pad: all - head, co: head - noCo });
  }
  const pc = (m) => mean([...clusterMeans(rows, m, (r) => refHO.get(r.id).commit).values()]);
  const pt = (m) => mean(rows.map((r) => r[m]));
  out.padding[k] = { tasks: rows.length, per_task: { recall: pt('recall'), head: pt('head'), pad: pt('pad'), co: pt('co') }, per_commit: { recall: pc('recall'), head: pc('head'), pad: pc('pad'), co: pc('co') } };
  out.padding[k].share_pad = out.padding[k].per_task.pad / out.padding[k].per_task.recall; out.padding[k].share_co = out.padding[k].per_task.co / out.padding[k].per_task.recall;
}
fs.writeFileSync(path.join(OUT, 'b_heldout.json'), JSON.stringify(out, (k, v) => (k === 'diffs' || k === 'keys' ? undefined : v), 1));
console.log('done', Object.keys(out.table).length, 'table rows;', Object.keys(out.comparisons).length, 'comparisons');
