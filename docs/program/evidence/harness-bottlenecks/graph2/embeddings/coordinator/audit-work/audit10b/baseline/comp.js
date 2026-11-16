'use strict';
// Independent Node port of evalcore.PilotGraph (ppr, pool, unrestricted), co_scores, dir_scores, rrf; compare with stored tables.
const fs = require('fs'), path = require('path');
const C = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const LANE = C.LANE, OUT = __dirname;
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const tasks = C.readJsonl(LANE + '/eval/tune_tasks.jsonl');

function loadGraph(sha) {
  const d = LANE + '/export/graphs/' + sha;
  const nb = new Map();
  const add = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
  const gl = fs.readFileSync(d + '/pilot_graph.tsv', 'utf8').split('\n');
  for (let i = 1; i < gl.length; i++) { if (!gl[i]) continue; const [a, b] = gl[i].split('\t'); add(a, b); add(b, a); }
  const co = new Map();
  const cl = fs.readFileSync(d + '/pilot_co.tsv', 'utf8').split('\n');
  let coRows = 0;
  for (let i = 1; i < cl.length; i++) {
    if (!cl[i]) continue; const [a, b, conf, sup, rec, cmax] = cl[i].split('\t'); coRows++;
    const v = { conf: Number(conf), support: Number(sup), recency: Number(rec), conf_max: Number(cmax) };
    if (!co.has(a)) co.set(a, new Map()); if (!co.has(b)) co.set(b, new Map());
    co.get(a).set(b, v); co.get(b).set(a, v);
  }
  const code = new Set();
  const el = fs.readFileSync(d + '/entities.tsv', 'utf8').split('\n');
  for (let i = 1; i < el.length; i++) { if (!el[i]) continue; const p = el[i].split('\t'); if (p[3] === '1') code.add(p[2]); }
  const keys = [...nb.keys()], idx = new Map(keys.map((k, i) => [k, i]));
  const nbr = keys.map(k => [...nb.get(k)].map(x => idx.get(x)));
  const deg = nbr.map(a => a.length);
  return { nb, co, code, keys, idx, nbr, deg, coRows };
}
function ppr(g, seed, alpha = 0.15, iters = 25) {
  const S = 'F:' + seed; if (!g.idx.has(S)) return null;
  const N = g.keys.length, s = g.idx.get(S);
  let pr = new Float64Array(N); pr[s] = 1;
  for (let it = 0; it < iters; it++) {
    const nx = new Float64Array(N);
    for (let a = 0; a < N; a++) { const w = pr[a] / Math.max(g.deg[a], 1); if (w === 0) continue; for (const b of g.nbr[a]) nx[b] += w; }
    for (let a = 0; a < N; a++) nx[a] *= (1 - alpha);
    nx[s] += alpha; pr = nx;
  }
  return pr;
}
function pool(g, seed) {
  const S = 'F:' + seed; if (!g.idx.has(S)) return [];
  const dist = new Map([[S, 0]]); let fr = [S];
  for (const h of [1, 2]) { const nf = []; for (const u of fr) for (const v of g.nb.get(u)) if (!dist.has(v)) { dist.set(v, h); nf.push(v); } fr = nf; }
  const near = new Set([...dist].filter(([k, d]) => d > 0).map(([k]) => k));
  for (const k of (g.co.get(S) || new Map()).keys()) near.add(k);
  const out = new Set([...near].filter(k => k.startsWith('F:') && CODE.test(k.slice(2))).map(k => k.slice(2)));
  out.delete(seed); return [...out].sort();
}
function unrestricted(g, seed) { return [...g.code].filter(c => c !== seed).sort(); }
function pprScores(g, seed, cands) { const pr = ppr(g, seed); const m = new Map(); for (const c of cands) m.set(c, pr && g.idx.has('F:' + c) ? pr[g.idx.get('F:' + c)] : 0.0); return m; }
function coScores(g, seed, cands, field = 'conf') { const row = g.co.get('F:' + seed) || new Map(); const m = new Map(); for (const c of cands) { const v = row.get('F:' + c); if (v && v[field] > 0) m.set(c, v[field]); } return m; }
function dirScores(seed, cands) { const sd = seed.split('/').slice(0, -1); const m = new Map(); for (const c of cands) { const cd = c.split('/').slice(0, -1); let n = 0; while (n < Math.min(sd.length, cd.length) && sd[n] === cd[n]) n++; m.set(c, n); } return m; }
function metrics(ranked, truth) {
  const T = new Set(truth), n = Math.max(T.size, 1); let h10 = 0, h20 = 0, mrr = 0;
  ranked.slice(0, 10).forEach(c => { if (T.has(c)) h10++; }); ranked.slice(0, 20).forEach(c => { if (T.has(c)) h20++; });
  for (let i = 0; i < ranked.length; i++) if (T.has(ranked[i])) { mrr = 1 / (i + 1); break; }
  return { 'P@10': h10 / 10, 'R@10': h10 / n, 'R@20': h20 / n, 'MRR': mrr };
}
function summary(perTask, set) {
  const by = new Map(), ord = new Map();
  for (const t of tasks) { if (set && !set.has(t.commit)) continue; if (!by.has(t.commit)) by.set(t.commit, []); by.get(t.commit).push(perTask.get(t.task_id)); ord.set(t.commit, t.date_order); }
  const out = {}; for (const m of ['P@10', 'R@10', 'R@20', 'MRR']) { const vals = [...by.values()].map(a => a.reduce((s, x) => s + x[m], 0) / a.length); out[m] = vals.reduce((s, x) => s + x, 0) / vals.length; } return out;
}
const sets = { all: null, late50: new Set(tasks.filter(t => t.late50).map(t => t.commit)), late50_pilot: new Set(tasks.filter(t => t.late50_pilot).map(t => t.commit)) };

const rep = { scopes: {} };
const metricsStored = JSON.parse(fs.readFileSync(LANE + '/eval/comparators/metrics.json', 'utf8'));
const gcache = new Map(); const G = sha => { if (!gcache.has(sha)) gcache.set(sha, loadGraph(sha)); return gcache.get(sha); };
const perSeedInfo = [];
for (const scope of ['pool', 'unrestricted']) {
  const st = {}; for (const n of ['PPR', 'CO', 'DIR', 'RRF', 'RANDOM']) st[n] = C.readScoreTable(LANE + `/eval/comparators/${n}_${scope}.tsv.gz`);
  const cand = C.readScoreTable(LANE + `/eval/comparators/candidates_${scope}.tsv.gz`);
  const diff = { cand_set: [], PPR: [], CO: [], DIR: [], RRF: [], RANDOM: [], extra_tasks: [] };
  let maxPPR = 0, maxRRF = 0, nrows = { PPR: 0, CO: 0, DIR: 0, RRF: 0 };
  const mine = { PPR: new Map(), CO: new Map(), DIR: new Map(), RRF: new Map(), RANDOM: new Map() };
  for (const t of tasks) {
    const g = G(t.parent); const tid = t.task_id;
    const cands = scope === 'pool' ? pool(g, t.seed) : unrestricted(g, t.seed);
    const sc = (cand.get(tid) || new Map()); const cs = new Set(sc.keys());
    if (cs.size !== cands.length || cands.some(c => !cs.has(c))) diff.cand_set.push({ tid, mine: cands.length, stored: cs.size });
    const p = pprScores(g, t.seed, cands), co = coScores(g, t.seed, cands), dr = dirScores(t.seed, cands);
    const rr = C.rrfScores(tid, cands, [[p, 1.0], [co, 1.0]], 60);
    const cmp = (name, m, tol) => {
      const s = st[name].get(tid) || new Map();
      const keysM = [...m.keys()], keysS = [...s.keys()];
      if (keysM.length !== keysS.length || keysM.some(k => !s.has(k))) diff[name].push({ tid, kind: 'keys', mine: keysM.length, stored: keysS.length });
      for (const k of keysM) if (s.has(k)) { const d = Math.abs(m.get(k) - s.get(k)); nrows[name] = (nrows[name] || 0) + 1; if (name === 'PPR') maxPPR = Math.max(maxPPR, d); if (name === 'RRF') maxRRF = Math.max(maxRRF, d); if (d > tol) diff[name].push({ tid, k, mine: m.get(k), stored: s.get(k) }); }
    };
    cmp('PPR', p, 1e-9); cmp('CO', co, 0); cmp('DIR', dr, 0); cmp('RRF', rr, 1e-12);
    const rz = new Map(cands.map(c => [c, 0.0])); cmp('RANDOM', rz, 0);
    for (const [n, m] of [['PPR', p], ['CO', co], ['DIR', dr], ['RRF', rr], ['RANDOM', rz]]) mine[n].set(tid, metrics(C.rank(tid, cands, m), t.truth));
    if (scope === 'pool') perSeedInfo.push({ tid, commit: t.commit, n: cands.length, coN: co.size, inPool: t.truth.filter(x => cands.includes(x)).length, truth: t.truth.length, seedInGraph: g.idx.has('F:' + t.seed), seedIsCode: g.code.has(t.seed), truthNotCode: t.truth.filter(x => !g.code.has(x)) });
  }
  for (const n of Object.keys(st)) for (const tid of st[n].keys()) if (!tasks.some(t => t.task_id === tid)) diff.extra_tasks.push(n + ':' + tid);
  const metr = {}, mdiff = [];
  for (const n of Object.keys(mine)) { metr[n] = {}; for (const w of Object.keys(sets)) { metr[n][w] = summary(mine[n], sets[w]); const s = metricsStored[`${n}_${scope}`][w]; for (const m of Object.keys(s)) if (Math.abs(s[m] - metr[n][w][m]) > 1e-12) mdiff.push({ n, w, m, mine: metr[n][w][m], stored: s[m] }); } }
  rep.scopes[scope] = { maxPPR, maxRRF, nrows, diffs: Object.fromEntries(Object.entries(diff).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 5) }])), metrics_mine: metr, metrics_mismatch: mdiff, cand_rows: cand.rows };
}
// pilot rows (pilot's pickle dumped to tsv) vs my pool / ppr / co
const pr = new Map();
const pl = fs.readFileSync(LANE + '/eval/git/pilot_rows.tsv', 'utf8').split('\n');
for (let i = 1; i < pl.length; i++) { if (!pl[i]) continue; const [ci, s, t, y, hop, p, co] = pl[i].split('\t'); const key = (+ci + 1) + '|' + s.slice(2); if (!pr.has(key)) pr.set(key, new Map()); pr.get(key).set(t.slice(2), { ppr: +p, co: +co, y: +y }); }
let samePool = 0, diffPool = [], maxd = 0, coMis = 0, yMis = 0, rowsCmp = 0;
for (const t of tasks) {
  const g = G(t.parent); const mine = pool(g, t.seed); const th = pr.get(t.pilot_order + '|' + t.seed) || new Map();
  if (mine.length === th.size && mine.every(c => th.has(c))) samePool++; else diffPool.push(t.task_id);
  const p = pprScores(g, t.seed, mine), co = coScores(g, t.seed, mine);
  for (const c of mine) if (th.has(c)) { rowsCmp++; maxd = Math.max(maxd, Math.abs(p.get(c) - th.get(c).ppr)); if (Math.abs((co.get(c) || 0) - th.get(c).co) > 1e-12) coMis++; if ((t.truth.includes(c) ? 1 : 0) !== th.get(c).y) yMis++; }
}
rep.pilot_rows = { samePool, diffPool, rowsCmp, pilotRowsTotal: [...pr.values()].reduce((s, m) => s + m.size, 0), pilotSeeds: pr.size, maxd, coMis, yMis };
// seed-level facts
rep.seed_facts = { seeds_not_in_graph: perSeedInfo.filter(x => !x.seedInGraph).map(x => x.tid), seeds_not_code_entity: perSeedInfo.filter(x => !x.seedIsCode).map(x => x.tid), truth_not_code_entity: perSeedInfo.filter(x => x.truthNotCode.length).map(x => [x.tid, x.truthNotCode]), empty_pool: perSeedInfo.filter(x => x.n === 0).map(x => x.tid), seeds_no_co: perSeedInfo.filter(x => x.coN === 0).length, pool_ceiling_pairs: [perSeedInfo.reduce((s, x) => s + x.inPool, 0), perSeedInfo.reduce((s, x) => s + x.truth, 0)] };
fs.writeFileSync(OUT + '/comp-result.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify(rep, (k, v) => k === 'metrics_mine' ? undefined : v, 1).slice(0, 6000));
for (const s of ['pool', 'unrestricted']) for (const n of ['RRF', 'PPR', 'CO', 'RANDOM', 'DIR']) console.log(s, n, ['late50_pilot', 'late50', 'all'].map(w => rep.scopes[s].metrics_mine[n][w]['P@10'].toFixed(4)).join(' '));
