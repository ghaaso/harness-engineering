'use strict';
// For every contrast: 20-seed Monte-Carlo distribution of lo, hi, p; z of the stored values.
const L = require('./lib.js');
const { core, LANE, SEEDS, SCOPES, WS, METRICS, path, fs } = L;
const tune = JSON.parse(fs.readFileSync(path.join(LANE, 'train/report/tune.json'), 'utf8'));
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const sub = tasks.filter(t => t.late50);
const late = new Set(sub.map(t => t.commit));
const pilotShared = new Set(tasks.filter(t => t.late50_pilot && t.late50).map(t => t.commit));
const sets = { late50: late, late50_pilot_shared: pilotShared };
const cl = { pool: L.readCands('pool'), unrestricted: L.readCands('unrestricted') };
const arms = ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'];
const variants = a => ['alone', 'fused', 'alone_builder', 'fused_builder'].concat(a === 'PLACEBO' ? WS.map(w => 'fused_w' + w) : []);
const pt = new Map();
for (const sc of SCOPES) {
  pt.set('RRF|' + sc, L.evalTable(core.readScoreTable(path.join(LANE, 'eval/comparators/RRF_' + sc + '.tsv.gz')), cl[sc], sub));
  for (const a of arms) for (const v of variants(a)) pt.set(a + '_' + v + '|' + sc, L.meanSeeds(SEEDS.map(s => L.evalTable(core.readScoreTable(path.join(LANE, 'train/selectB', a, v + '_' + sc + '_s' + s + '.tsv.gz')), cl[sc], sub))));
}
const SEEDSX = Array.from({ length: 20 }, (_, i) => 1000 + 17 * i);
const sd = a => { const m = L.mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const rows = [];
for (const [setname, cs] of Object.entries(sets)) for (const sc of SCOPES) for (const a of arms) for (const v of variants(a)) for (let mi = 0; mi < 4; mi++) {
  const key = a + '_' + v; const st = tune.contrasts[setname][sc][key].vs_RRF[METRICS[mi]];
  const A = L.perCommit(pt.get(key + '|' + sc), sub, cs).arr, B = L.perCommit(pt.get('RRF|' + sc), sub, cs).arr;
  const d = A.map((r, i) => r[mi] - B[i][mi]);
  const bs = SEEDSX.map(s => L.bootstrap(d, 10000, s));
  const lo = bs.map(x => x[1]), hi = bs.map(x => x[2]), p = bs.map(x => x[3]);
  rows.push({ id: [setname, sc, key, METRICS[mi]].join('/'), zlo: (st.lo - L.mean(lo)) / sd(lo), zhi: (st.hi - L.mean(hi)) / sd(hi), zp: sd(p) > 0 ? (st.p - L.mean(p)) / sd(p) : 0, st, mlo: [Math.min(...lo), Math.max(...lo)], mhi: [Math.min(...hi), Math.max(...hi)], mp: [Math.min(...p), Math.max(...p)] });
}
const absmax = k => rows.reduce((m, r) => Math.abs(r[k]) > Math.abs(m[k]) ? r : m);
const cnt = (k, t) => rows.filter(r => Math.abs(r[k]) > t).length;
const P10 = rows.filter(r => r.id.endsWith('P@10'));
const out = { n: rows.length, worst_zlo: absmax('zlo'), worst_zhi: absmax('zhi'), worst_zp: absmax('zp'), over3: { lo: cnt('zlo', 3), hi: cnt('zhi', 3), p: cnt('zp', 3) }, over2: { lo: cnt('zlo', 2), hi: cnt('zhi', 2), p: cnt('zp', 2) },
  mean_zlo: L.mean(rows.map(r => r.zlo)), mean_zhi: L.mean(rows.map(r => r.zhi)), P10_inside_minmax: P10.filter(r => r.st.lo >= r.mlo[0] && r.st.lo <= r.mlo[1] && r.st.hi >= r.mhi[0] && r.st.hi <= r.mhi[1]).length, P10_n: P10.length,
  P10_maxabs_z: Math.max(...P10.map(r => Math.max(Math.abs(r.zlo), Math.abs(r.zhi)))) };
L.writeJson(path.join(__dirname, 'mcz-out.json'), { out, rows });
console.log(JSON.stringify(out, null, 1));
