'use strict';
// Grader, graphify held-out, step 2: comparisons G-1 to G-4 declared in protocol addendum 7 section E.
// Difference = graphify - comparator. Paired cluster bootstrap with build/arms/common/compare.js
// (10,000 resamples, seed 20261112 as in the finished test; cluster = commit for T1, T1x, T2; the task for
// T3; the fix commit for T4). Verdict words by addendum 7 item 17:
//   better       the T1 primary interval excludes zero AND the sign of the difference is the same on T1, T2 and T3
//   equivalent   the whole T1 primary interval lies within plus or minus 0.05
//   inconclusive otherwise
// Also: the same at 2,000 and 4,000 tokens (descriptive, same rule applied to that budget), the split by
// where the seed lives (addendum 6 item 11 groups), T3 clustered by parent commit (addendum 6 item 15),
// the five most favourable commits dropped (addendum 6 item 12 style), and every arm with graphify's
// empty-answer seeds excluded.
// Reads tasks.jsonl.gz from step 1. Writes comparisons.json (aggregates plus per-commit difference arrays).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const CMP = require(path.join(BUILD, 'arms', 'common', 'compare'));
const H = require(path.join(BUILD, 'arms', 'common', 'harness'));
const OUT = __dirname;
const SEED = 20261112; const NRES = 10000; const EPS = 0.05;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const sgn = (x) => (x > 1e-12 ? 1 : x < -1e-12 ? -1 : 0);
const REFS = path.join(BUILD, 'sealed', 'grader', 'heldout', 'refs_heldout.jsonl');
const refs = S.readRefs(REFS);
const refRaw = new Map(fs.readFileSync(REFS, 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const tasks = new Map(fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const t = JSON.parse(l); return [t.id, t]; }));
const per = zlib.gunzipSync(fs.readFileSync(path.join(OUT, 'tasks.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const perOf = (arm, set) => per.filter((t) => t.arm === arm && t.set === set);
const scores = JSON.parse(fs.readFileSync(path.join(OUT, 'scores.json'), 'utf8')).rows;
const row = (arm, set) => scores.find((r) => r.arm === arm && r.set === set);
const FILES = {
  graphify: (s) => path.join(G, 'answers', 'heldout', '66367cd303fdd75b.' + s + '.jsonl.gz'),
  relational: (s) => path.join(BUILD, 'results', 'heldout', 'relational', 'primary', s + '.jsonl.gz'),
  search: (s) => path.join(BUILD, 'results', 'heldout', 'search', 'primary', s + '.jsonl.gz'),
  'floor-co': (s) => path.join(BUILD, 'results', 'heldout', 'floor-co', 'primary', s + '.jsonl.gz'),
  'floor-dir': (s) => path.join(BUILD, 'results', 'heldout', 'floor-dir', 'primary', s + '.jsonl.gz'),
};
const LABEL = { graphify: 'graphify code layer', relational: 'typed primary', search: 'scripted search primary', 'floor-co': 'changed-together floor', 'floor-dir': 'same-folder floor' };
const COMPS = [['G-1', 'relational'], ['G-2', 'search'], ['G-3', 'floor-co'], ['G-4', 'floor-dir']];
const SETS = ['T1', 'T2', 'T3', 'T1x', 'T4'];
const METRICS = ['primary', 'r2000', 'r4000', 'r16000', 'auc'];

function statsOf(ps) {
  return { mean_graphify: r4(ps.mean_a), mean_other: r4(ps.mean_b), diff: r4(ps.diff), diff_exact: ps.diff, ci95: ps.ci95 && ps.ci95.map(r4), ci95_exact: ps.ci95, excludes_zero: ps.excludes_zero,
    p_signflip: ps.p_signflip == null ? null : r4(ps.p_signflip), clusters: ps.clusters };
}
function counts(d) { return { graphify_higher: d.filter((x) => x > 1e-12).length, other_higher: d.filter((x) => x < -1e-12).length, tied: d.filter((x) => Math.abs(x) <= 1e-12).length }; }
function word(t1, t2, t3) {
  const ci = t1.ci95_exact; const s1 = sgn(t1.diff_exact);
  const signs = { T1: s1, T2: sgn(t2.diff_exact), T3: sgn(t3.diff_exact) };
  if (t1.excludes_zero && signs.T2 === s1 && signs.T3 === s1) return { verdict: 'better', winner: s1 > 0 ? 'graphify code layer' : 'comparator', signs, decided_by: `T1 interval [${t1.ci95}] excludes zero and the sign is the same on T1, T2 and T3` };
  if (ci[0] >= -EPS && ci[1] <= EPS) return { verdict: 'equivalent', winner: null, signs, decided_by: `the whole T1 interval [${t1.ci95}] lies within plus or minus ${EPS}` };
  return { verdict: 'inconclusive', winner: null, signs, decided_by: t1.excludes_zero ? `T1 interval [${t1.ci95}] excludes zero but the signs on T1, T2, T3 are ${Object.values(signs).join(', ')} (must all agree), and the interval is not inside plus or minus ${EPS}` : `T1 interval [${t1.ci95}] includes zero and is not inside plus or minus ${EPS}` };
}
const comparisons = [];
for (const [id, other] of COMPS) {
  const c = { id, a: 'graphify code layer (query-seed-full-d3)', b: LABEL[other], b_arm: other, sets: {} };
  for (const s of SETS) {
    const r = CMP.compare(FILES.graphify(s), FILES[other](s), refs, { rule: 'content', resamples: NRES, seed: SEED, metrics: METRICS });
    const m = {};
    for (const k of METRICS) m[k] = statsOf(r.metrics[k]);
    // per-commit paired differences (primary, r2000, r4000), sorted by cluster key
    const va = new Map(S.clusterValues(perOf('graphify', s)).map((x) => [x.cluster, x])); const vb = new Map(S.clusterValues(perOf(other, s)).map((x) => [x.cluster, x]));
    const keys = [...va.keys()].filter((k) => vb.has(k)).sort();
    for (const k of ['primary', 'r2000', 'r4000']) { const d = keys.map((x) => va.get(x)[k] - vb.get(x)[k]); m[k].per_cluster_diffs = d.map(r4); Object.assign(m[k], counts(d)); }
    m.median_tokens_graphify = row('graphify', s).median_tokens_8000; m.median_tokens_other = row(other, s).median_tokens_8000;
    c.sets[s] = m;
  }
  const w = word(c.sets.T1.primary, c.sets.T2.primary, c.sets.T3.primary);
  Object.assign(c, w);
  c.same_rule_at_2000 = word(c.sets.T1.r2000, c.sets.T2.r2000, c.sets.T3.r2000);
  c.same_rule_at_4000 = word(c.sets.T1.r4000, c.sets.T2.r4000, c.sets.T3.r4000);
  comparisons.push(c);
  const t = c.sets.T1.primary;
  console.log(`${id} graphify - ${other}: T1 ${t.mean_graphify} vs ${t.mean_other} diff ${t.diff} [${t.ci95}] | T2 ${c.sets.T2.primary.diff} [${c.sets.T2.primary.ci95}] | T3 ${c.sets.T3.primary.diff} [${c.sets.T3.primary.ci95}] | 2k ${c.sets.T1.r2000.diff} [${c.sets.T1.r2000.ci95}] | 4k ${c.sets.T1.r4000.diff} [${c.sets.T1.r4000.ci95}] => ${w.verdict} ${w.winner || ''} (2k ${c.same_rule_at_2000.verdict}, 4k ${c.same_rule_at_4000.verdict})`);
}

// ---------- split by where the seed lives (T1 and T2) ----------
const rtOf = (p) => (p.startsWith('backend/') ? 'backend' : p.startsWith('technician-app/') ? 'mobile' : p.startsWith('src/') ? 'web' : 'root');
const ROOT_TASK = 'T1-0786';
const ARMS = ['graphify', 'relational', 'search', 'floor-co', 'floor-dir'];
function groupBlock(set, ids) {
  const blk = { tasks: ids.size, arms: {}, diffs: {} };
  const cm = {};
  for (const a of ARMS) { const rows = S.clusterValues(perOf(a, set).filter((t) => ids.has(t.id))); cm[a] = rows; blk.arms[a] = { primary: r4(S.mean(rows.map((r) => r.primary))), r2000: r4(S.mean(rows.map((r) => r.r2000))), commits: rows.length }; }
  for (const [id, o] of COMPS) {
    const out = {};
    for (const k of ['primary', 'r2000', 'r4000']) {
      const ps = CMP.pairedStats(new Map(cm.graphify.map((r) => [r.cluster, r[k]])), new Map(cm[o].map((r) => [r.cluster, r[k]])), NRES, SEED);
      out[k] = { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), commits: ps.clusters, excludes_zero: ps.excludes_zero };
    }
    blk.diffs[id] = out;
  }
  return blk;
}
const runtime = {};
for (const set of ['T1', 'T2']) {
  runtime[set] = {};
  const ofSet = [...refRaw.values()].filter((x) => x.set === set);
  const by = (pred) => new Set(ofSet.filter(pred).map((x) => x.id));
  const groups = {
    mobile: by((x) => rtOf(x.seed.path) === 'mobile'),
    backend: by((x) => rtOf(x.seed.path) === 'backend'),
    web_without_root_task: by((x) => rtOf(x.seed.path) === 'web'),
    web_with_root_task: by((x) => rtOf(x.seed.path) === 'web' || x.id === ROOT_TASK),
    outside_mobile: by((x) => rtOf(x.seed.path) !== 'mobile'),
    root_level_seeds: by((x) => rtOf(x.seed.path) === 'root'),
    all: by(() => true),
  };
  for (const [g, ids] of Object.entries(groups)) if (ids.size) runtime[set][g] = groupBlock(set, ids);
}

// ---------- T3 clustered by parent commit (sign only) ----------
const t3ByParent = {};
{
  const remap = (rows) => rows.map((t) => ({ ...t, cluster: tasks.get(t.id).parent }));
  const cg = S.clusterValues(remap(perOf('graphify', 'T3')));
  for (const [id, o] of COMPS) {
    const co = S.clusterValues(remap(perOf(o, 'T3')));
    const ps = CMP.pairedStats(new Map(cg.map((r) => [r.cluster, r.primary])), new Map(co.map((r) => [r.cluster, r.primary])), NRES, SEED);
    const d = cg.map((r, i) => r.primary - co.find((x) => x.cluster === r.cluster).primary);
    t3ByParent[id] = { parents: ps.clusters, diff: r4(ps.diff), ci95: ps.ci95.map(r4), ...counts(d), note: 'At most 4 parent commits: the interval is not a usable effect size; the sign is what is reported.' };
  }
}

// ---------- five most favourable commits dropped (T1) ----------
const sensitivity = {};
for (const [id, o] of COMPS) {
  const cg = new Map(S.clusterValues(perOf('graphify', 'T1')).map((r) => [r.cluster, r.primary]));
  const co = new Map(S.clusterValues(perOf(o, 'T1')).map((r) => [r.cluster, r.primary]));
  const keys = [...cg.keys()].filter((k) => co.has(k));
  const d0 = S.mean(keys.map((k) => cg.get(k) - co.get(k)));
  const dir = sgn(d0);
  const sorted = [...keys].sort((x, y) => dir * ((cg.get(y) - co.get(y)) - (cg.get(x) - co.get(x))));
  const drop = new Set(sorted.slice(0, 5));
  const ps = CMP.pairedStats(new Map(keys.filter((k) => !drop.has(k)).map((k) => [k, cg.get(k)])), co, NRES, SEED);
  sensitivity[id] = { five_most_favourable_to_the_leader_dropped: { commits: ps.clusters, diff: r4(ps.diff), ci95: ps.ci95.map(r4), excludes_zero: ps.excludes_zero } };
}

// ---------- graphify's empty answers; every arm with those seeds excluded ----------
const empty = {};
for (const s of SETS) {
  const recs = H.readGzJsonl(FILES.graphify(s));
  empty[s] = recs.filter((a) => !a.items.length).map((a) => ({ id: a.id, reason: a.meta && a.meta.empty_reason, seed_runtime: rtOf(tasks.get(a.id).seed.path) }));
}
const emptyIds = new Set(Object.values(empty).flat().map((x) => x.id));
const excl = {};
for (const s of SETS) {
  excl[s] = {};
  for (const a of ARMS) {
    const rows = S.clusterValues(perOf(a, s).filter((t) => !emptyIds.has(t.id)));
    const v = rows.map((r) => r.primary).filter((x) => x != null);
    excl[s][a] = { tasks: perOf(a, s).filter((t) => !emptyIds.has(t.id)).length, clusters: rows.length, primary: r4(S.mean(v)), se: r4(S.seOf(v)) };
  }
  const cg = new Map(S.clusterValues(perOf('graphify', s).filter((t) => !emptyIds.has(t.id))).map((r) => [r.cluster, r.primary]));
  excl[s].diffs = {};
  for (const [id, o] of COMPS) {
    const co = new Map(S.clusterValues(perOf(o, s).filter((t) => !emptyIds.has(t.id))).map((r) => [r.cluster, r.primary]));
    const ps = CMP.pairedStats(cg, co, NRES, SEED);
    excl[s].diffs[id] = { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), clusters: ps.clusters };
  }
}

fs.writeFileSync(path.join(OUT, 'comparisons.json'), JSON.stringify({ written_at: new Date().toISOString(),
  method: 'build/arms/common/compare.js paired cluster bootstrap, 10,000 resamples, seed 20261112; cluster = commit (T1, T1x, T2), task (T3), fix commit (T4); difference = graphify - comparator',
  wording: 'addendum 7 item 17: better only if the T1 interval excludes zero and the sign agrees on T1, T2 and T3; equivalent only if the whole T1 interval lies within +-0.05; otherwise inconclusive',
  comparisons, runtime, t3_by_parent: t3ByParent, sensitivity, graphify_empty_answers: empty, primary_with_graphify_empty_seeds_excluded: excl }, null, 1));
console.log(JSON.stringify({ t3ByParent, sensitivity, empty, excl_T1: excl.T1 }, null, 1));
for (const set of ['T1']) for (const [g, b] of Object.entries(runtime[set])) console.log(set, g, b.tasks, JSON.stringify(b.arms.graphify), JSON.stringify(b.arms.relational), Object.entries(b.diffs).map(([k, v]) => k + ' ' + v.primary.diff + ' [' + v.primary.ci95 + '] n' + v.primary.commits).join(' | '));
