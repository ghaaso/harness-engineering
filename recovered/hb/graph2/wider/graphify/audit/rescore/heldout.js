'use strict';
// Independent re-score of the graphify held-out answers and comparators; checks against the grader's numbers.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const L = require('./lib');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const ARMS = { graphify: (s) => path.join(L.G, 'answers/heldout', s + '.jsonl.gz') };
for (const a of ['relational', 'search', 'floor-co', 'floor-dir']) ARMS[a] = (s) => path.join(L.BUILD, 'results/heldout', a, 'primary', s + '.jsonl.gz');
const refs = L.refs();
const rows = {}; const checks = []; const shas = {};
for (const [arm, f] of Object.entries(ARMS)) for (const set of SETS) {
  const file = f(set); const buf = fs.readFileSync(file); shas[`${arm}/${set}`] = crypto.createHash('sha256').update(buf).digest('hex');
  const recs = L.readGz(file); const ids = new Set(); const out = [];
  for (const rec of recs) {
    if (ids.has(rec.id)) checks.push('dup ' + arm + rec.id); ids.add(rec.id);
    const ref = refs.get(rec.id); if (!ref || ref.split !== 'heldout' || ref.set !== set) { checks.push('ref? ' + arm + ' ' + rec.id); continue; }
    if (ref.parent !== rec.parent) checks.push('parent ' + arm + ' ' + rec.id);
    if (arm === 'graphify' && rec.config_hash !== '66367cd303fdd75b') checks.push('cfg ' + rec.id);
    out.push(L.scoreTask(rec, ref));
  }
  const nref = [...refs.values()].filter((r) => r.split === 'heldout' && r.set === set).length;
  if (out.length !== nref) checks.push(`count ${arm} ${set} ${out.length}/${nref}`);
  rows[`${arm}/${set}`] = out;
}
const table = [];
for (const k of Object.keys(rows)) {
  const r = rows[k]; const st = L.stats(L.clusterMeans(r, 'r8000'));
  table.push({ key: k, tasks: r.length, clusters: st.clusters, primary: L.r4(st.mean), se: L.r4(st.se),
    r2000: L.r4(L.stats(L.clusterMeans(r, 'r2000')).mean), r4000: L.r4(L.stats(L.clusterMeans(r, 'r4000')).mean), r16000: L.r4(L.stats(L.clusterMeans(r, 'r16000')).mean),
    med_tok8000: L.median(r.map((x) => x.tok8000)), empty: r.filter((x) => x.empty).length, med_nfull8000: L.median(r.map((x) => x.nfull8000)),
    file_r2000: L.r4(L.stats(L.clusterMeans(r, 'fr2000')).mean) });
}
// grader's numbers
const gs = JSON.parse(fs.readFileSync(path.join(L.G, 'grader/heldout/scores.json'), 'utf8'));
const mism = [];
for (const t of table) {
  const [arm, set] = t.key.split('/');
  const g = gs.rows.find((x) => x.arm === arm && x.set === set);
  if (!g) { mism.push('no grader row ' + t.key); continue; }
  for (const f of ['primary', 'r2000', 'r4000', 'r16000']) if (Math.abs(g[f] - t[f]) > 0.00005) mism.push(`${t.key} ${f} grader ${g[f]} mine ${t[f]}`);
  if (g.primary_se != null && Math.abs(g.primary_se - t.se) > 0.00005) mism.push(`${t.key} se grader ${g.primary_se} mine ${t.se}`);
  if (g.empty_answers != null && g.empty_answers !== t.empty) mism.push(`${t.key} empty grader ${g.empty_answers} mine ${t.empty}`);
}
// comparisons
const CMP = { 'G-1': 'relational', 'G-2': 'search', 'G-3': 'floor-co', 'G-4': 'floor-dir' };
const gc = JSON.parse(fs.readFileSync(path.join(L.G, 'grader/heldout/comparisons.json'), 'utf8'));
const cmp = {}; const cmpMism = [];
const near = (a, b, tol) => Math.abs(a - b) <= tol;
for (const [id, b] of Object.entries(CMP)) {
  const o = {};
  for (const set of ['T1', 'T2', 'T3', 'T1x', 'T4']) o[set] = L.paired(rows['graphify/' + set], rows[b + '/' + set], 'r8000');
  o.T1_r2000 = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r2000');
  o.T1_r4000 = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r4000');
  o.T3_parent = L.paired(rows['graphify/T3'], rows[b + '/T3'], 'r8000', 'parentCluster');
  // verdict (addendum 7 item 17)
  const s = Math.sign(o.T1.diff); const excl = o.T1.ci[0] > 0 || o.T1.ci[1] < 0;
  const agree = [o.T2, o.T3].every((x) => Math.sign(x.diff) === s);
  o.verdict = excl && agree ? (s < 0 ? 'better: ' + b : 'better: graphify') : (o.T1.ci[0] >= -0.05 && o.T1.ci[1] <= 0.05 ? 'equivalent' : 'inconclusive');
  // sensitivity: drop the five commits most favourable to the leading arm
  const d = [...o.T1.d].sort((x, y) => (s < 0 ? x - y : y - x)).slice(5);
  o.sens = { diff: L.mean(d), ci: L.boot(d), n: d.length };
  // seed split
  o.split = {};
  const groups = { mobile: (r) => r.rt === 'mobile', backend: (r) => r.rt === 'backend', web_noroot: (r) => r.rt === 'web', web_root: (r) => r.rt === 'web' || r.rt === 'root', non_mobile: (r) => r.rt !== 'mobile' };
  for (const [gn, fl] of Object.entries(groups)) {
    const p = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r8000', 'cluster', fl);
    const p2 = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r2000', 'cluster', fl);
    const p4 = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r4000', 'cluster', fl);
    o.split[gn] = { tasks: rows['graphify/T1'].filter(fl).length, commits: p.clusters, diff: L.r4(p.diff), ci: p.ci.map(L.r4), r2000: [L.r4(p2.diff), ...p2.ci.map(L.r4)], r4000: [L.r4(p4.diff), ...p4.ci.map(L.r4)],
      graphify: L.r4(L.stats(L.clusterMeans(rows['graphify/T1'].filter(fl), 'r8000')).mean), other: L.r4(L.stats(L.clusterMeans(rows[b + '/T1'].filter(fl), 'r8000')).mean) };
  }
  // empty-seed exclusion
  const emptyIds = new Set(rows['graphify/T1'].filter((r) => r.empty).map((r) => r.id));
  const ex = L.paired(rows['graphify/T1'], rows[b + '/T1'], 'r8000', 'cluster', (r) => !emptyIds.has(r.id));
  o.emptyExcluded = { diff: L.r4(ex.diff), ci: ex.ci.map(L.r4), clusters: ex.clusters };
  // check against grader
  const g = gc.comparisons.find((x) => x.id === id);
  const chk = (lab, mine, gr) => { if (!gr) { cmpMism.push(`${id} ${lab} grader missing`); return; }
    if (!near(mine.diff, gr.diff_exact ?? gr.diff, 0.00005)) cmpMism.push(`${id} ${lab} diff grader ${gr.diff} mine ${L.r4(mine.diff)}`);
    if (!near(mine.ci[0], gr.ci95[0], 0.005) || !near(mine.ci[1], gr.ci95[1], 0.005)) cmpMism.push(`${id} ${lab} ci grader ${gr.ci95} mine ${mine.ci.map(L.r4)}`); };
  for (const set of ['T1', 'T2', 'T3', 'T1x', 'T4']) if (g.sets[set]) chk(set, o[set], g.sets[set].primary);
  if (g.sets.T1.r2000) chk('T1 r2000', o.T1_r2000, g.sets.T1.r2000);
  if (g.sets.T1.r4000) chk('T1 r4000', o.T1_r4000, g.sets.T1.r4000);
  const gsn = gc.sensitivity[id].five_most_favourable_to_the_leader_dropped; chk('sens', o.sens, gsn);
  for (const [gn, v] of Object.entries(o.split)) {
    const gk = { mobile: 'mobile', backend: 'backend', web_noroot: 'web_without_root_task', web_root: 'web_with_root_task', non_mobile: 'outside_mobile' }[gn];
    const gr = gc.runtime.T1[gk] || gc.runtime.T1[gn]; if (!gr) { cmpMism.push(`${id} split ${gn} no grader key (have ${Object.keys(gc.runtime.T1)})`); continue; }
    chk('split ' + gn, { diff: v.diff, ci: v.ci }, gr.diffs[id].primary);
  }
  const ge = gc.primary_with_graphify_empty_seeds_excluded.T1.diffs[id]; chk('emptyExcl', o.emptyExcluded, ge);
  cmp[id] = { comparator: b, verdict: o.verdict, grader_verdict: g.verdict,
    T1: [L.r4(o.T1.diff), ...o.T1.ci.map(L.r4)], T2: [L.r4(o.T2.diff), ...o.T2.ci.map(L.r4)], T3: [L.r4(o.T3.diff), ...o.T3.ci.map(L.r4)], T1x: [L.r4(o.T1x.diff), ...o.T1x.ci.map(L.r4)], T4: [L.r4(o.T4.diff), ...o.T4.ci.map(L.r4)],
    T1_r2000: [L.r4(o.T1_r2000.diff), ...o.T1_r2000.ci.map(L.r4)], T1_r4000: [L.r4(o.T1_r4000.diff), ...o.T1_r4000.ci.map(L.r4)],
    T1_counts: { graphify_higher: o.T1.higher, lower: o.T1.lower, tied: o.T1.tied },
    T3_parent: { diff: L.r4(o.T3_parent.diff), higher: o.T3_parent.higher, lower: o.T3_parent.lower, tied: o.T3_parent.tied },
    sens: { diff: L.r4(o.sens.diff), ci: o.sens.ci.map(L.r4), n: o.sens.n }, split: o.split, emptyExcluded: o.emptyExcluded };
}
fs.writeFileSync(path.join(OUT, 'heldout.json'), JSON.stringify({ checks, shas, table, score_mismatches: mism, cmp, cmp_mismatches: cmpMism }, null, 1));
fs.writeFileSync(path.join(OUT, 'heldout_tasks.json'), JSON.stringify(rows));
console.log('checks', checks.length, checks.slice(0, 5));
console.log('score mismatches', mism.length, mism.slice(0, 10));
console.log('cmp mismatches', cmpMism.length, cmpMism.slice(0, 30));
for (const t of table.filter((x) => x.key.endsWith('/T1'))) console.log(JSON.stringify(t));
for (const [k, v] of Object.entries(cmp)) console.log(k, v.verdict, '| grader:', v.grader_verdict, JSON.stringify({ T1: v.T1, T2: v.T2, T3: v.T3, c: v.T1_counts, sens: v.sens }));
