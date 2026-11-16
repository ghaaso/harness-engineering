'use strict';
// Verifier 5: independent re-test of E5-1 (E5 alone loss by single/two-area tasks; cause = percentile merge).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const core = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const LANE = core.LANE, OUT = __dirname;
const AREAS = ['backend', 'mobile', 'web', 'other'];
const CO = 'co_changed';
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl')).filter(t => t.late50);
const plan = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageB/plan.json'), 'utf8'));

function cands(sc) {
  const L = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_' + sc + '.tsv.gz'))).toString('utf8').split('\n');
  const m = new Map();
  for (let i = 1; i < L.length; i++) { if (!L[i]) continue; const p = L[i].split('\t'); if (!m.has(p[0])) m.set(p[0], []); m.get(p[0]).push(p[1]); }
  return m;
}
const G = new Map();
function graph(sha) {
  if (G.has(sha)) return G.get(sha);
  const d = path.join(LANE, 'export/graphs0', sha);
  const area = new Map();
  for (const l of fs.readFileSync(path.join(d, 'entities.tsv'), 'utf8').split('\n').slice(1)) { if (!l) continue; const p = l.split('\t'); area.set(p[0], p[4]); }
  const A = e => area.has(e) ? area.get(e) : 'other';
  const nb = new Map(); const known = {}; const hasCo = {};
  for (const a of AREAS) { known[a] = new Set(); hasCo[a] = false; }
  for (const l of fs.readFileSync(path.join(d, 'triples.tsv'), 'utf8').split('\n').slice(1)) {
    if (!l) continue; const [h, r, t] = l.split('\t');
    if (h !== t) { if (!nb.has(h)) nb.set(h, new Set()); if (!nb.has(t)) nb.set(t, new Set()); nb.get(h).add(t); nb.get(t).add(h); }
    const ah = A(h), at = A(t);
    for (const a of new Set([ah, at])) { known[a].add(h); known[a].add(t); if (r === CO) hasCo[a] = true; }
  }
  const g = { A, nb, known, hasCo }; G.set(sha, g); return g;
}
function route(g, s) {
  const a1 = g.A(s); const c = new Map();
  for (const n of g.nb.get(s) || []) { const a = g.A(n); if (a !== a1) c.set(a, (c.get(a) || 0) + 1); }
  if (!c.size) return [a1];
  const top = Math.max(...c.values());
  return [a1, AREAS.filter(a => c.get(a) === top)[0]];
}
const SC = ['pool', 'unrestricted'];
const C = {}; for (const sc of SC) C[sc] = cands(sc);
const tab = {};
for (const sc of SC) {
  for (const s of [1, 2, 3]) for (const arm of ['E1', 'E5']) tab[arm + sc + s] = core.readScoreTable(path.join(LANE, 'train/selectB', arm, 'alone_' + sc + '_s' + s + '.tsv.gz'));
  tab['RRF' + sc] = core.readScoreTable(path.join(LANE, 'eval/comparators/RRF_' + sc + '.tsv.gz'));
}
// per task: route + class per candidate
const info = {}; const routes = {}; let checkSet = 0, checkBad = 0;
for (const t of tasks) {
  const ck = plan.assignment[t.parent]; const g = graph(ck); const s = 'file:' + t.seed;
  const r = route(g, s).filter(a => g.hasCo[a] && g.known[a].has(s));
  const rr = route(g, s); routes[rr.join('>')] = (routes[rr.join('>')] || 0) + 1;
  info[t.task_id] = { r, rr };
  for (const sc of SC) {
    const cls = new Map();
    for (const c of C[sc].get(t.task_id) || []) {
      const by = r.filter(a => g.known[a].has('file:' + c));
      let k = by.length === 0 ? 'unscored' : by.length === 2 ? 'both' : by[0] === r[0] ? 'own' : (r[1] === 'other' ? 'second_other' : 'second_code');
      cls.set(c, k);
      // check against E5 table s1: scored iff not unscored
      checkSet++; if ((k !== 'unscored') !== tab['E5' + sc + 1].get(t.task_id)?.has(c)) checkBad++;
    }
    info[t.task_id][sc] = cls;
  }
}
// per-task P@10 for a list builder
function pt(sc, f) { const m = new Map(); for (const t of tasks) m.set(t.task_id, f(t)); return m; }
const seedMean = (sc, arm, t, transform) => [1, 2, 3].reduce((x, s) => {
  let row = tab[arm + sc + s].get(t.task_id) || new Map(); let cl = C[sc].get(t.task_id) || [];
  let ranked = core.rank(t.task_id, cl, row);
  if (transform) ranked = transform(t, ranked);
  return x + core.p10(ranked, t.truth);
}, 0) / 3;
const rrf = (sc, t) => core.p10(core.rank(t.task_id, C[sc].get(t.task_id) || [], tab['RRF' + sc].get(t.task_id) || new Map()), t.truth);
const demote = cl => (sc) => (t, ranked) => { const m = info[t.task_id][sc]; const a = ranked.filter(c => !cl.includes(m.get(c))), b = ranked.filter(c => cl.includes(m.get(c))); return a.concat(b); };
const isTwo = t => info[t.task_id].r.length === 2;
const out = { routes_raw: routes, routes_used_two: tasks.filter(isTwo).length, routes_used_single: tasks.filter(t => !isTwo(t)).length, scored_set_check: { checked: checkSet, mismatched: checkBad } };
for (const sc of SC) {
  const V = {};
  V.E5 = pt(sc, t => seedMean(sc, 'E5', t));
  V.E1 = pt(sc, t => seedMean(sc, 'E1', t));
  V.RRF = pt(sc, t => rrf(sc, t));
  V.E5_demote_second = pt(sc, t => seedMean(sc, 'E5', t, demote(['second_other', 'second_code'])(sc)));
  V.E5_demote_second_other = pt(sc, t => seedMean(sc, 'E5', t, demote(['second_other'])(sc)));
  V.E5_hyb_E1_on_two = pt(sc, t => isTwo(t) ? V.E1.get(t.task_id) : V.E5.get(t.task_id));
  V.E5_hyb_RRF_on_two = pt(sc, t => isTwo(t) ? V.RRF.get(t.task_id) : V.E5.get(t.task_id));
  V.E5_hyb_E1_on_single = pt(sc, t => isTwo(t) ? V.E5.get(t.task_id) : V.E1.get(t.task_id));
  const mean = (m, sub) => core.perCommit(m, sub || tasks).mean;
  const r = {};
  for (const k in V) r[k] = +mean(V[k]).toFixed(4);
  r.diff_vs_RRF = {}; for (const k in V) r.diff_vs_RRF[k] = +(mean(V[k]) - mean(V.RRF)).toFixed(4);
  const subs = { single: tasks.filter(t => !isTwo(t)), two: tasks.filter(isTwo), two_second_other: tasks.filter(t => isTwo(t) && info[t.task_id].r[1] === 'other') };
  r.subsets = {};
  for (const k in subs) { const s = subs[k]; r.subsets[k] = { tasks: s.length, commits: new Set(s.map(t => t.commit)).size, E5: +mean(V.E5, s).toFixed(4), E1: +mean(V.E1, s).toFixed(4), RRF: +mean(V.RRF, s).toFixed(4), E5_demote_second: +mean(V.E5_demote_second, s).toFixed(4) }; }
  // class slots in top 10 on two-area tasks, seed mean
  const slots = {};
  for (const arm of ['E1', 'E5']) for (const t of tasks.filter(isTwo)) for (const s of [1, 2, 3]) {
    const rk = core.rank(t.task_id, C[sc].get(t.task_id) || [], tab[arm + sc + s].get(t.task_id) || new Map()).slice(0, 10);
    const T = new Set(t.truth);
    for (const c of rk) { const k = info[t.task_id][sc].get(c); slots[k] = slots[k] || { E1: 0, E1_hits: 0, E5: 0, E5_hits: 0 }; slots[k][arm] += 1 / 3; if (T.has(c)) slots[k][arm + '_hits'] += 1 / 3; }
  }
  for (const k in slots) for (const f in slots[k]) slots[k][f] = +slots[k][f].toFixed(1);
  r.two_area_top10_slots = slots;
  out[sc] = r;
}
fs.writeFileSync(path.join(OUT, 'v5-out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
