'use strict';
// v2 post-run corrections (addendum 6 sections B and C), grader lane. Reads stored answers and stored
// scores only; starts no arm; changes no file outside this folder.
// Inputs: ../tasks.jsonl.gz (the grader's per-task scores), ../refs_heldout.jsonl, ../scores.json,
// ../comparisons.json, results/heldout/** (answers, read-only), sealed/tq_reference.jsonl,
// sealed/grader/refs_tune.jsonl and the stage-1/2 per-task TUNE scores (for the tuning mix).
// Statistics: arms/common/compare.js pairedStats (paired cluster bootstrap, 10,000 resamples, mulberry32
// seed 20261112, the grader's generator) and arms/common/tq_score.js, as in compare_heldout.js.
// Writes recompute.json in this folder.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const V2 = __dirname; const HO = path.resolve(V2, '..'); const B = path.resolve(V2, '..', '..', '..', '..');
const S = require(path.join(B, 'arms/common/score.js'));
const CMP = require(path.join(B, 'arms/common/compare.js'));
const TQ = require(path.join(B, 'arms/common/tq_score.js'));
const TOK = require(path.join(B, 'arms/common/tokenizer.js'));
const SEED = 20261112; const NRES = 10000; const EPS = 0.05;
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const r4 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 1e4) / 1e4);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sgn = (x) => (x > 1e-15 ? 1 : x < -1e-15 ? -1 : 0);
const out = { written_at: new Date().toISOString(), method: 'paired cluster bootstrap with arms/common/compare.js pairedStats, 10,000 resamples, seed 20261112 (the grader generator); difference = A - B; cluster = commit for T1 and T2, task for T3 unless stated' };

// ---------- inputs ----------
const per = new Map(); // arm|role|set -> rows
for (const t of gz(path.join(HO, 'tasks.jsonl.gz'))) { const k = [t.arm, t.role, t.set].join('|'); if (!per.has(k)) per.set(k, []); per.get(k).push(t); }
const refRaw = new Map(jl(path.join(HO, 'refs_heldout.jsonl')).map((r) => [r.id, r]));
const ansCache = new Map();
const answers = (arm, role, set) => { const k = [arm, role, set].join('|'); if (!ansCache.has(k)) ansCache.set(k, new Map(gz(path.join(B, 'results/heldout', arm, role, set + '.jsonl.gz')).map((a) => [a.id, a]))); return ansCache.get(k); };
const ARMS = { typed: ['relational', 'primary'], ladybug: ['ladybug', 'primary'], duckpgq: ['duckpgq', 'primary'], s1: ['relational', 's1'], lbs2: ['ladybug', 's2'], lbs2d1: ['ladybug', 's2-draw1'], lbs2d2: ['ladybug', 's2-draw2'], lbs2d3: ['ladybug', 's2-draw3'], lbs2d4: ['ladybug', 's2-draw4'], search: ['search', 'primary'], search2: ['search', 's2'], fdir: ['floor-dir', 'primary'], fco: ['floor-co', 'primary'] };
const LABEL = { typed: 'typed primary', ladybug: 'LadybugDB primary', duckpgq: 'DuckPGQ primary', s1: 'typed S1 (4 hops)', lbs2: 'LadybugDB S2, stored community draw', lbs2d1: 'LadybugDB S2, draw 1', lbs2d2: 'LadybugDB S2, draw 2', lbs2d3: 'LadybugDB S2, draw 3', lbs2d4: 'LadybugDB S2, draw 4', search: 'scripted search primary', search2: 'scripted search S2 (best form)', fdir: 'same-directory floor', fco: 'co-change floor' };
const rows = (k, set) => per.get([...ARMS[k], set].join('|'));
const runtimeOf = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : p.startsWith('src/') ? 'web' : 'root');
const ROOT_TASK = 'T1-0786';

function clusterMeans(rs, metric, filter, keyOf) {
  const g = new Map();
  for (const t of rs) { if (filter && !filter(t)) continue; const v = t[metric]; if (v == null) continue; const c = keyOf ? keyOf(t) : t.cluster; if (!g.has(c)) g.set(c, []); g.get(c).push(v); }
  const m = new Map(); for (const [c, v] of g) m.set(c, mean(v)); return m;
}
function paired(a, b, set, o = {}) {
  const metric = o.metric || 'primary';
  const ma = clusterMeans(rows(a, set), metric, o.filter, o.keyOf); const mb = clusterMeans(rows(b, set), metric, o.filter, o.keyOf);
  if (o.drop) for (const c of o.drop) { ma.delete(c); mb.delete(c); }
  const ps = CMP.pairedStats(ma, mb, NRES, SEED);
  if (!ps.clusters) return { clusters: 0 };
  return { clusters: ps.clusters, mean_a: r4(ps.mean_a), mean_b: r4(ps.mean_b), diff: r4(ps.diff), diff_exact: ps.diff, ci95: ps.ci95.map(r4), excludes_zero: ps.excludes_zero, a_higher: ps.wins, b_higher: ps.losses, ties: ps.ties };
}
const brief = (p) => (p && p.clusters ? { n_clusters: p.clusters, mean_a: p.mean_a, mean_b: p.mean_b, diff: p.diff, ci95: p.ci95, excludes_zero: p.excludes_zero, a_higher: p.a_higher, b_higher: p.b_higher, ties: p.ties } : null);

// ---------- reproduction check against comparisons.json ----------
const cmpStored = JSON.parse(fs.readFileSync(path.join(HO, 'comparisons.json'), 'utf8')).comparisons;
const H3 = [['H3-search', 'typed', 'search'], ['H3-search-s2', 'typed', 'search2'], ['H3-floor-co', 'typed', 'fco'], ['H3-floor-dir', 'typed', 'fdir']];
out.reproduction = [];
for (const [id, a, b] of [...H3, ['H1b', 'lbs2', 'typed'], ['X-floor-co-search', 'fco', 'search'], ['X-s1-primary', 's1', 'typed']]) for (const set of ['T1', 'T2', 'T3']) {
  const mine = paired(a, b, set); const st = cmpStored.find((c) => c.id === id).sets[set].primary;
  out.reproduction.push({ id, set, stored: { diff: st.diff, ci95: st.ci95 }, recomputed: { diff: mine.diff, ci95: mine.ci95 }, equal: st.diff === mine.diff && JSON.stringify(st.ci95) === JSON.stringify(mine.ci95) });
}

// ---------- c. runtime split of every H3 comparison (T1) ----------
const t1ids = rows('typed', 'T1').map((t) => t.id);
const groups = {
  mobile: (t) => runtimeOf(refRaw.get(t.id).seed.path) === 'mobile',
  backend: (t) => runtimeOf(refRaw.get(t.id).seed.path) === 'backend',
  web_without_root_task: (t) => runtimeOf(refRaw.get(t.id).seed.path) === 'web',
  web_with_root_task: (t) => ['web', 'root'].includes(runtimeOf(refRaw.get(t.id).seed.path)),
  not_mobile: (t) => runtimeOf(refRaw.get(t.id).seed.path) !== 'mobile',
  all: () => true,
};
const groupCounts = (ids, refOf, f) => { const sel = ids.filter((id) => f({ id })); return { tasks: sel.length, commits: new Set(sel.map((id) => refOf(id).commit)).size }; };
out.splits = { rule: 'runtime of the seed file: technician-app/ = mobile app, backend/ = backend, src/ = web; the one held-out seed at the repository root (task T1-0786, ops-server.mjs, the ops console server) is shown both outside and inside the web group; a commit with seeds in two groups counts in both', root_task: { id: ROOT_TASK, seed_path: refRaw.get(ROOT_TASK).seed.path }, heldout_counts: {}, comparisons: {} };
for (const [g, f] of Object.entries(groups)) out.splits.heldout_counts[g] = groupCounts(t1ids, (id) => refRaw.get(id), f);
const H3LIST = [['typed_vs_search', 'typed', 'search'], ['typed_vs_search_s2', 'typed', 'search2'], ['typed_vs_cochange_floor', 'typed', 'fco'], ['typed_vs_samedir_floor', 'typed', 'fdir'], ['cochange_floor_vs_search', 'fco', 'search']];
for (const [name, a, b] of H3LIST) {
  out.splits.comparisons[name] = { a: LABEL[a], b: LABEL[b], groups: {} };
  for (const [g, f] of Object.entries(groups)) out.splits.comparisons[name].groups[g] = brief(paired(a, b, 'T1', { filter: f }));
}
// tuning mix and tuning split (frozen configurations, TUNE per-task scores of stage 1 and 2)
const tuneRefs = new Map(jl(path.join(B, 'sealed/grader/refs_tune.jsonl')).filter((r) => r.set === 'T1').map((r) => [r.id, r]));
const tuneIds = [...tuneRefs.keys()];
const tuneGroups = { mobile: groups.mobile, backend: groups.backend, web_without_root_task: groups.web_without_root_task, not_mobile: groups.not_mobile, all: groups.all };
const tuneRuntime = (id) => runtimeOf(tuneRefs.get(id).seed.path);
out.splits.tuning_counts = {};
for (const g of Object.keys(tuneGroups)) {
  const f = g === 'mobile' ? (x) => tuneRuntime(x.id) === 'mobile' : g === 'backend' ? (x) => tuneRuntime(x.id) === 'backend' : g === 'web_without_root_task' ? (x) => tuneRuntime(x.id) === 'web' : g === 'not_mobile' ? (x) => tuneRuntime(x.id) !== 'mobile' : () => true;
  out.splits.tuning_counts[g] = groupCounts(tuneIds, (id) => tuneRefs.get(id), f);
}
out.splits.tuning_root_tasks = tuneIds.filter((id) => tuneRuntime(id) === 'root').length;
const share = (c, tot) => r4(c / tot);
out.splits.mix = {};
for (const g of ['mobile', 'backend', 'web_without_root_task']) out.splits.mix[g] = { tuning_share_of_tasks: share(out.splits.tuning_counts[g].tasks, tuneIds.length), heldout_share_of_tasks: share(out.splits.heldout_counts[g].tasks, t1ids.length), tuning_share_of_commits: share(out.splits.tuning_counts[g].commits, out.splits.tuning_counts.all.commits), heldout_share_of_commits: share(out.splits.heldout_counts[g].commits, out.splits.heldout_counts.all.commits) };
out.splits.mix.root = { tuning_tasks: out.splits.tuning_root_tasks, heldout_tasks: 1 };
// TUNE per-runtime differences for the frozen configurations
const FROZEN = { typed: ['relational', '95e990307da3b42b'], search: ['search', 'e70177e5807f0252'], search2: ['search', '950c029615d337c1'], fco: ['floor-co', 'c4d2f0a60a3d199c'], fdir: ['floor-dir', '714a474060653c1f'] };
const tunePer = {};
for (const [k, [arm, h]] of Object.entries(FROZEN)) {
  for (const st of ['stage1', 'stage2']) { const f = path.join(B, 'sealed/grader', st, arm + '.tasks.jsonl.gz'); if (!fs.existsSync(f)) continue; for (const r of gz(f)) if (r.config_hash === h && r.set === 'T1') (tunePer[k] = tunePer[k] || new Map()).set(r.id, r); }
}
out.splits.tuning_rows_found = Object.fromEntries(Object.entries(tunePer).map(([k, m]) => [k, m.size]));
const pairedTune = (a, b, f) => { const ca = clusterMeans([...tunePer[a].values()], 'primary', f); const cb = clusterMeans([...tunePer[b].values()], 'primary', f); const ps = CMP.pairedStats(ca, cb, NRES, SEED); return ps.clusters ? { n_clusters: ps.clusters, mean_a: r4(ps.mean_a), mean_b: r4(ps.mean_b), diff: r4(ps.diff), ci95: ps.ci95.map(r4) } : null; };
out.splits.tuning_comparisons = {};
for (const [name, a, b] of H3LIST) {
  out.splits.tuning_comparisons[name] = {};
  for (const g of Object.keys(tuneGroups)) {
    const f = g === 'mobile' ? (x) => tuneRuntime(x.id) === 'mobile' : g === 'backend' ? (x) => tuneRuntime(x.id) === 'backend' : g === 'web_without_root_task' ? (x) => tuneRuntime(x.id) === 'web' : g === 'not_mobile' ? (x) => tuneRuntime(x.id) !== 'mobile' : () => true;
    out.splits.tuning_comparisons[name][g] = pairedTune(a, b, f);
  }
}
// held-out per-runtime differences re-weighted by the TUNE task mix (descriptive)
out.splits.heldout_reweighted_to_tuning_mix = {};
for (const [name] of H3LIST) {
  const G = out.splits.comparisons[name].groups; const tc = out.splits.tuning_counts;
  const wt = (g) => tc[g].tasks / tuneIds.length;
  out.splits.heldout_reweighted_to_tuning_mix[name] = r4(G.mobile.diff * wt('mobile') + G.backend.diff * wt('backend') + G.web_without_root_task.diff * wt('web_without_root_task'));
}

// ---------- d. sensitivity (T1) ----------
const commitInfo = new Map();
for (const t of rows('typed', 'T1')) { const r = refRaw.get(t.id); if (!commitInfo.has(t.cluster)) commitInfo.set(t.cluster, { commit: t.cluster, changed_files: r.commit_n_files_all, tasks: 0, units: 0 }); const o = commitInfo.get(t.cluster); o.tasks++; o.units += t.units; }
const largest = (k) => [...commitInfo.values()].sort((x, y) => y[k] - x[k] || (x.commit < y.commit ? -1 : 1)).slice(0, 3).map((o) => o.commit);
const seedMatch = (k, id) => answers(...ARMS[k], 'T1').get(id).seed_match;
out.sensitivity = { largest_commits: { by_changed_files: largest('changed_files').map((c) => commitInfo.get(c)), by_tasks: largest('tasks').map((c) => commitInfo.get(c)), by_reference_units: largest('units').map((c) => commitInfo.get(c)) }, comparisons: {} };
const seedDist = {}; for (const k of Object.keys(ARMS)) { const d = {}; for (const a of answers(...ARMS[k], 'T1').values()) d[a.seed_match] = (d[a.seed_match] || 0) + 1; seedDist[k] = d; }
out.sensitivity.seed_match_distribution_T1_tasks = seedDist;
out.sensitivity.seed_match_identical_in_every_arm = Object.values(seedDist).every((d) => JSON.stringify(d) === JSON.stringify(seedDist.typed)) && [...answers('relational', 'primary', 'T1').keys()].every((id) => Object.keys(ARMS).every((k) => seedMatch(k, id) === seedMatch('typed', id)));
for (const [name, a, b] of H3LIST) {
  const ma = clusterMeans(rows(a, 'T1'), 'primary'); const mb = clusterMeans(rows(b, 'T1'), 'primary');
  const order = [...ma.keys()].map((c) => [c, ma.get(c) - mb.get(c)]).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const tot = order.reduce((s, x) => s + x[1], 0); const loo = order.map((x) => (tot - x[1]) / (order.length - 1));
  const idBoth = (t) => seedMatch(a, t.id) === 'id' && seedMatch(b, t.id) === 'id';
  out.sensitivity.comparisons[name] = { a: LABEL[a], b: LABEL[b],
    full: brief(paired(a, b, 'T1')),
    drop_3_most_favourable_to_a: brief(paired(a, b, 'T1', { drop: order.slice(0, 3).map((x) => x[0]) })),
    drop_5_most_favourable_to_a: brief(paired(a, b, 'T1', { drop: order.slice(0, 5).map((x) => x[0]) })),
    drop_5_most_favourable_to_b: brief(paired(a, b, 'T1', { drop: order.slice(-5).map((x) => x[0]) })),
    drop_3_largest_by_changed_files: brief(paired(a, b, 'T1', { drop: largest('changed_files') })),
    drop_3_largest_by_tasks: brief(paired(a, b, 'T1', { drop: largest('tasks') })),
    drop_3_largest_by_reference_units: brief(paired(a, b, 'T1', { drop: largest('units') })),
    seeds_matched_by_id_only: brief(paired(a, b, 'T1', { filter: idBoth })),
    leave_one_commit_out_range: [r4(Math.min(...loo)), r4(Math.max(...loo))],
    at_2000_tokens: brief(paired(a, b, 'T1', { metric: 'r2000' })), at_4000_tokens: brief(paired(a, b, 'T1', { metric: 'r4000' })), at_16000_tokens: brief(paired(a, b, 'T1', { metric: 'r16000' })) };
}
out.sensitivity.seeds_matched_by_id_only_tasks = rows('typed', 'T1').filter((t) => seedMatch('typed', t.id) === 'id').length;

// ---------- e. T3 clustered three ways ----------
const t3key = { by_task: (t) => t.id, by_parent_commit: (t) => refRaw.get(t.id).parent, by_parent_and_document: (t) => refRaw.get(t.id).parent + '|' + refRaw.get(t.id).doc };
const t3rows = rows('typed', 'T3');
out.t3 = { tasks: t3rows.length, parents: new Set(t3rows.map((t) => refRaw.get(t.id).parent)).size, documents: new Set(t3rows.map((t) => refRaw.get(t.id).doc)).size, parent_document_groups: new Set(t3rows.map((t) => t3key.by_parent_and_document(t))).size,
  largest_group_tasks: Math.max(...[...t3rows.reduce((m, t) => m.set(t3key.by_parent_and_document(t), (m.get(t3key.by_parent_and_document(t)) || 0) + 1), new Map()).values()]),
  note: 'With 4 parent clusters the bootstrap has at most 4^4 = 256 distinct resamples; that interval is shown for completeness and is not a usable effect size. T3 carries a sign only (addendum 6 item 15).', comparisons: {} };
for (const [name, a, b] of [...H3LIST, ['lbs2_vs_typed', 'lbs2', 'typed'], ['s1_vs_typed', 's1', 'typed']]) {
  out.t3.comparisons[name] = { a: LABEL[a], b: LABEL[b] };
  for (const [k, f] of Object.entries(t3key)) out.t3.comparisons[name][k] = brief(paired(a, b, 'T3', { keyOf: f }));
  // per parent-and-document group sign
  const grp = {}; for (const t of t3rows) { const g = t3key.by_parent_and_document(t); (grp[g] = grp[g] || []).push(t.id); }
  const va = new Map(rows(a, 'T3').map((t) => [t.id, t.primary])); const vb = new Map(rows(b, 'T3').map((t) => [t.id, t.primary]));
  out.t3.comparisons[name].per_group_sign = Object.entries(grp).map(([g, ids], i) => ({ group: 'group ' + (i + 1), tasks: ids.length, mean_a: r4(mean(ids.map((x) => va.get(x)))), mean_b: r4(mean(ids.map((x) => vb.get(x)))), sign: sgn(mean(ids.map((x) => va.get(x) - vb.get(x)))) }));
}

// ---------- f. H1b draws ----------
const verdictWord = (bySet, tqSign) => {
  const t1 = bySet.T1; const d = t1.diff_exact; const ci = t1.ci95;
  const sig = { T1: sgn(d), T2: sgn(bySet.T2.diff_exact), T3: sgn(bySet.T3.diff_exact), TQ: tqSign };
  const agree = Object.values(sig).filter((x) => x === sgn(d)).length;
  if (t1.excludes_zero && agree >= 3) return { verdict: 'better', why: `T1 interval excludes zero, answer tokens equal (7,999 median both), sign agrees on ${agree} of 4` };
  if (ci[0] >= -EPS && ci[1] <= EPS) return { verdict: 'equivalent', why: 'whole T1 interval inside plus or minus 0.05' };
  return { verdict: 'inconclusive', why: t1.excludes_zero ? `T1 interval excludes zero but the sign agrees on only ${agree} of 4 (T1 ${sig.T1 > 0 ? '+' : '-'}, T2 ${sig.T2 > 0 ? '+' : sig.T2 < 0 ? '-' : '0'}, T3 ${sig.T3 > 0 ? '+' : sig.T3 < 0 ? '-' : '0'}, questions 0), and it is not inside plus or minus 0.05` : 'T1 interval includes zero and is not inside plus or minus 0.05' };
};
out.draws = { relational_primary_T1: r4(mean([...clusterMeans(rows('typed', 'T1'), 'primary').values()])), rows: [] };
for (const k of ['lbs2', 'lbs2d1', 'lbs2d2', 'lbs2d3', 'lbs2d4']) {
  const bySet = { T1: paired(k, 'typed', 'T1'), T2: paired(k, 'typed', 'T2'), T3: paired(k, 'typed', 'T3') };
  const v = verdictWord(bySet, 0);
  out.draws.rows.push({ draw: LABEL[k], T1_primary: bySet.T1.mean_a, T1: brief(bySet.T1), T2: brief(bySet.T2), T3: brief(bySet.T3), r2000: brief(paired(k, 'typed', 'T1', { metric: 'r2000' })), r4000: brief(paired(k, 'typed', 'T1', { metric: 'r4000' })), verdict_under_the_rule: v.verdict, why: v.why });
}
const dv = out.draws.rows.map((r) => r.T1_primary); const dm = mean(dv);
out.draws.T1_spread = { min: Math.min(...dv), max: Math.max(...dv), mean: r4(dm), sd: r4(Math.sqrt(dv.reduce((s, x) => s + (x - dm) ** 2, 0) / (dv.length - 1))) };

// ---------- g. ranked-list hash differences ----------
out.ranked_hash = { rows: JSON.parse(fs.readFileSync(path.join(V2, 'rankdiff.json'), 'utf8')) };

// ---------- h. padding share and co-change share ----------
function viaHistShare(k) {
  const ans = answers(...ARMS[k], 'T1'); const refs = S.readRefs(path.join(HO, 'refs_heldout.jsonl'));
  const recs = [];
  for (const [id, a] of ans) {
    const ref = refs.get(id); const base = S.scoreAnswer(a, ref); if (!base) continue;
    const isHist = (it) => !it.pad && (it.via || []).includes('co_changed');
    const m = { ...a, items: a.items.map((it) => ({ ...it, pad: isHist(it) ? 0 : 1 })), budgets: JSON.parse(JSON.stringify(a.budgets)) };
    for (const b of Object.keys(m.budgets)) { const bb = m.budgets[b]; if (bb.cut && a.items[bb.n_full]) bb.cut.pad = isHist(a.items[bb.n_full]) ? 0 : 1; }
    const h = S.scoreAnswer(m, ref);
    recs.push({ id, cluster: base.cluster, r8000: base.r8000, unpad: base.unpad_r8000, hist: h.unpad_r8000 });
  }
  const pt = (f) => r4(mean(recs.map(f)));
  const pc = (f) => { const g = new Map(); for (const r of recs) { if (!g.has(r.cluster)) g.set(r.cluster, []); g.get(r.cluster).push(f(r)); } return r4(mean([...g.values()].map(mean))); };
  return { tasks: recs.length, per_task: { recall: pt((r) => r.r8000), from_own_head: pt((r) => r.unpad), from_padding_tail_only: pt((r) => r.r8000 - r.unpad), via_path_with_cochange_edge: pt((r) => r.hist) }, per_commit: { recall: pc((r) => r.r8000), from_own_head: pc((r) => r.unpad), from_padding_tail_only: pc((r) => r.r8000 - r.unpad), via_path_with_cochange_edge: pc((r) => r.hist) } };
}
out.padding = { rule: 'credited recall inside 8,000 tokens split into units credited by the arm\'s own ranked items (head) and units credited only by the padding tail; for the typed arm also the units credited by a head item whose stored explanation path contains a co_changed edge (one path per item, descriptive)', arms: {} };
for (const k of ['typed', 's1', 'lbs2', 'search', 'search2', 'fdir', 'fco']) { const r = viaHistShare(k); r.share_from_padding_tail_per_task = r4(r.per_task.from_padding_tail_only / r.per_task.recall); r.share_via_cochange_per_task = r4(r.per_task.via_path_with_cochange_edge / r.per_task.recall); out.padding.arms[k] = { label: LABEL[k], ...r }; }

// ---------- a and b. questions ----------
const tqRefs = jl(path.join(B, 'sealed/tq_reference.jsonl')).filter((r) => r.split === 'held_out');
const judgement = JSON.parse(fs.readFileSync(path.join(HO, 'judgement_heldout.json'), 'utf8'));
const TOUCHED7 = [24, 27, 33, 40, 41, 46, 47]; const TOUCHED8 = [24, 25, 27, 33, 40, 41, 46, 47];
const TQARMS = ['relational', 'ladybug', 'duckpgq', 'search'];
const tqAns = {}; for (const a of TQARMS) tqAns[a] = jl(path.join(B, 'results/heldout/tq', a + '.answers.jsonl'));
const allIds = tqRefs.map((r) => r.id).sort((x, y) => x - y);
const SETSQ = { all30: allIds, untouched23: allIds.filter((i) => !TOUCHED7.includes(i)), untouched22: allIds.filter((i) => !TOUCHED8.includes(i)), touched7: TOUCHED7, touched8: TOUCHED8 };
const kindOf = new Map(tqRefs.map((r) => [r.id, r.kind]));
const h3signs = { T1: 1, T2: 1, T3: 1 }; // typed primary - search primary (comparisons.json, H3-search)
for (const s of ['T1', 'T2', 'T3']) h3signs[s] = sgn(cmpStored.find((c) => c.id === 'H3-search').sets[s].primary.diff_exact);
const ansTok = (a) => TOK.countTokens(JSON.stringify(a.answer));
out.questions = { touched_7_addendum5: TOUCHED7, touched_8_addendum6: TOUCHED8, judgement_items: judgement, recall_convention: 'a non-empty answer to an empty reference counts as recall 1 (precision 0, F1 0); an empty answer to an empty reference counts 1 for all three (arms/common/tq_score.js); F1 is the same under either recall convention', blocks: {} };
const median = S.median;
for (const [bname, ids] of Object.entries(SETSQ)) for (const withJ of [true, false]) {
  const rs = tqRefs.filter((r) => ids.includes(r.id)); const key = bname + (withJ ? '_with_judgement' : '_without_judgement');
  const blk = { questions: rs.length, arms: {}, per_kind: {} }; const perQ = {};
  for (const a of TQARMS) {
    const res = TQ.scoreTq(tqAns[a], rs, withJ ? {} : { judgement }); const b = withJ ? res.all : (res.without_judgement || res.all);
    perQ[a] = new Map(b.per_question.map((q) => [q.id, q]));
    const am = new Map(tqAns[a].map((x) => [x.id, x]));
    blk.arms[a] = { macro_f1: r4(b.macro.f1), macro_precision: r4(b.macro.p), macro_recall: r4(b.macro.r), micro_f1: r4(b.micro.f1), median_answer_tokens: median(rs.map((r) => ansTok(am.get(r.id)))), mean_answer_tokens: r4(mean(rs.map((r) => ansTok(am.get(r.id))))), median_lookups: median(rs.map((r) => am.get(r.id).lookups)) };
    if (a === 'search') { blk.arms[a].median_tokens_read = median(rs.map((r) => am.get(r.id).tokens)); blk.arms[a].mean_tokens_read = r4(mean(rs.map((r) => am.get(r.id).tokens))); }
  }
  const fa = new Map([...perQ.relational].map(([k, q]) => [String(k).padStart(3, '0'), q.f1])); const fb = new Map([...perQ.search].map(([k, q]) => [String(k).padStart(3, '0'), q.f1]));
  const ps = CMP.pairedStats(fa, fb, NRES, SEED);
  blk.typed_minus_search_f1 = { diff: r4(ps.diff), ci95: ps.ci95.map(r4), excludes_zero: ps.excludes_zero, typed_higher: ps.wins, search_higher: ps.losses, ties: ps.ties };
  // verdict word under the addendum 3 item 18 rule applied to questions (finalize_h4.js logic; tokens = the stored per-question tokens as scored)
  const tokT = median(rs.map((r) => perQ.relational.get(r.id).tokens)); const tokS = median(rs.map((r) => perQ.search.get(r.id).tokens));
  const sig = { ...h3signs, TQ: sgn(ps.diff) }; const agree = Object.values(sig).filter((x) => x === sgn(ps.diff)).length;
  let vw; if (ps.excludes_zero && (sgn(ps.diff) > 0 ? tokT <= tokS : tokS <= tokT) && agree >= 3) vw = 'better (typed)'; else if (ps.ci95[0] >= -EPS && ps.ci95[1] <= EPS) vw = 'equivalent'; else vw = 'inconclusive';
  blk.verdict_word_on_its_own = vw;
  for (const k of [...new Set(rs.map((r) => r.kind))].sort()) { const q = rs.filter((r) => r.kind === k); blk.per_kind[k] = { questions: q.length, typed_mean_f1: r4(mean(q.map((r) => perQ.relational.get(r.id).f1))), search_mean_f1: r4(mean(q.map((r) => perQ.search.get(r.id).f1))), mean_difference: r4(mean(q.map((r) => perQ.relational.get(r.id).f1 - perQ.search.get(r.id).f1))) }; }
  if (bname === 'all30') blk.per_question = rs.map((r) => { const t = perQ.relational.get(r.id); const s = perQ.search.get(r.id); const at = tqAns.relational.find((x) => x.id === r.id); const as = tqAns.search.find((x) => x.id === r.id); return { id: r.id, kind: r.kind, touched: TOUCHED8.includes(r.id), touched_in_addendum5_list: TOUCHED7.includes(r.id), typed: { f1: r4(t.f1), precision: r4(t.p), recall: r4(t.r), answer_items: t.na, reference_items: t.nr, answer_tokens: ansTok(at), lookups: at.lookups }, search: { f1: r4(s.f1), precision: r4(s.p), recall: r4(s.r), answer_items: s.na, answer_tokens: ansTok(as), tokens_read: as.tokens, lookups: as.lookups } }; });
  out.questions.blocks[key] = blk;
}
const b30 = out.questions.blocks.all30_with_judgement; const b23 = out.questions.blocks.untouched23_with_judgement; const b22 = out.questions.blocks.untouched22_with_judgement;
out.questions.h4 = { verdict: (b30.verdict_word_on_its_own !== b23.verdict_word_on_its_own || b30.verdict_word_on_its_own !== b22.verdict_word_on_its_own) ? 'inconclusive' : b30.verdict_word_on_its_own, rule: 'the verdict uses all 30 questions; if a subset of untouched questions gives a different verdict or sign, H4 is inconclusive and both are shown (addendum 5 item 5; addendum 6 item 3)', all30: b30.typed_minus_search_f1, untouched23: b23.typed_minus_search_f1, untouched22: b22.typed_minus_search_f1, words: { all30: b30.verdict_word_on_its_own, untouched23: b23.verdict_word_on_its_own, untouched22: b22.verdict_word_on_its_own } };
const t7 = out.questions.blocks.touched7_with_judgement.typed_minus_search_f1; const t8 = out.questions.blocks.touched8_with_judgement.typed_minus_search_f1;
out.questions.corrected_sentence = `On the 7 first-listed touched questions the typed arms win ${t7.typed_higher}, lose ${t7.search_higher} and tie ${t7.ties} (F1 against search). They score F1 0 on 4 of them (24, 40, 46, 47); on 24 and 40 search also scores 0. With question 25 added (8 touched questions) they win ${t8.typed_higher}, lose ${t8.search_higher} and tie ${t8.ties}.`;
out.questions.tokens_two_ways = Object.fromEntries(['all30', 'untouched23', 'untouched22'].map((k) => { const b = out.questions.blocks[k + '_with_judgement']; return [k, { typed_final_answer_tokens_median: b.arms.relational.median_answer_tokens, search_final_answer_tokens_median: b.arms.search.median_answer_tokens, search_tokens_read_median: b.arms.search.median_tokens_read, typed_tokens_read: 'not measured: the typed side\'s own costs (knowing the schema, the query programs written per question kind) are not counted', typed_final_answer_tokens_mean: b.arms.relational.mean_answer_tokens, search_final_answer_tokens_mean: b.arms.search.mean_answer_tokens, search_tokens_read_mean: b.arms.search.mean_tokens_read }]; }));
out.questions.typed_arms_identical = Object.fromEntries(['ladybug', 'duckpgq'].map((a) => [a, tqAns[a].filter((x) => JSON.stringify(x.answer) === JSON.stringify(tqAns.relational.find((y) => y.id === x.id).answer)).length]));
out.questions.tokens_stored_equal_recount_typed = tqAns.relational.every((x) => x.tokens === ansTok(x));

fs.writeFileSync(path.join(V2, 'recompute.json'), JSON.stringify(out, null, 1));
console.log('reproduction all equal:', out.reproduction.every((r) => r.equal), out.reproduction.filter((r) => !r.equal));
console.log('H4', JSON.stringify(out.questions.h4)); console.log(out.questions.corrected_sentence);
console.log('tokens', JSON.stringify(out.questions.tokens_two_ways.all30));
for (const [n, c] of Object.entries(out.splits.comparisons)) console.log('split', n, Object.entries(c.groups).map(([g, v]) => `${g} ${v.diff} [${v.ci95}] n=${v.n_clusters}`).join(' | '));
console.log('counts', JSON.stringify(out.splits.heldout_counts), JSON.stringify(out.splits.tuning_counts), JSON.stringify(out.splits.mix));
for (const [n, c] of Object.entries(out.sensitivity.comparisons)) console.log('sens', n, 'best5', JSON.stringify(c.drop_5_most_favourable_to_a && [c.drop_5_most_favourable_to_a.diff, c.drop_5_most_favourable_to_a.ci95]), 'id', JSON.stringify([c.seeds_matched_by_id_only.diff, c.seeds_matched_by_id_only.ci95, c.seeds_matched_by_id_only.n_clusters]), 'big3', JSON.stringify([c.drop_3_largest_by_changed_files.diff, c.drop_3_largest_by_changed_files.ci95]));
for (const r of out.draws.rows) console.log('draw', r.draw, r.T1.diff, r.T1.ci95, r.T2.diff, r.T2.ci95, r.T3.diff, r.verdict_under_the_rule);
for (const [n, c] of Object.entries(out.t3.comparisons)) console.log('t3', n, JSON.stringify([c.by_task.diff, c.by_task.ci95]), JSON.stringify([c.by_parent_commit.diff, c.by_parent_commit.ci95]), JSON.stringify([c.by_parent_and_document.diff, c.by_parent_and_document.ci95]));
for (const [k, v] of Object.entries(out.padding.arms)) console.log('pad', k, JSON.stringify(v.per_task), v.share_from_padding_tail_per_task, v.share_via_cochange_per_task);
