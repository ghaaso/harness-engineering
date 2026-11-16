'use strict';
const fs = require('fs'), zlib = require('zlib');
const C = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const LANE = C.LANE, H = LANE + '/train/heldout';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/heldout';
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const tasks = C.readJsonl(H + '/tasks_used.jsonl');
const plan = JSON.parse(fs.readFileSync(LANE + '/train/stageB/plan.json'));
const asg = plan.heldout.assignment;
const parents = [...new Set(tasks.map(t => t.parent))];
// pick 10 parents spread over the list, 3 tasks each (or all if fewer)
const pick = []; for (let i = 0; i < 10; i++) pick.push(parents[Math.floor(i * parents.length / 10)]);
const sel = [];
for (const p of pick) { const ts = tasks.filter(t => t.parent === p); const n = ts.length; const idx = n <= 3 ? ts.map((_, i) => i) : [0, Math.floor(n / 2), n - 1]; for (const i of idx) sel.push(ts[i]); }
function readRanked(p) { const m = new Map(); for (const l of zlib.gunzipSync(fs.readFileSync(p)).toString().split('\n')) if (l.trim()) { const r = JSON.parse(l); m.set(r.id, r.ranked); } return m; }
const gcache = new Map();
function graph(sha) {
  if (gcache.has(sha)) return gcache.get(sha);
  const d = LANE + '/export/graphs/' + sha; const nb = new Map();
  const add = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
  const g = fs.readFileSync(d + '/pilot_graph.tsv', 'utf8').split('\n').slice(1);
  for (const l of g) { if (!l) continue; const [a, b] = l.split('\t'); add(a, b); add(b, a); }
  const co = new Map();
  for (const l of fs.readFileSync(d + '/pilot_co.tsv', 'utf8').split('\n').slice(1)) { if (!l) continue; const [a, b, conf] = l.split('\t'); const v = Number(conf); if (!co.has(a)) co.set(a, new Map()); if (!co.has(b)) co.set(b, new Map()); co.get(a).set(b, v); co.get(b).set(a, v); }
  const code = new Set();
  for (const l of fs.readFileSync(d + '/entities.tsv', 'utf8').split('\n').slice(1)) { if (!l) continue; const p = l.split('\t'); if (p[3] === '1') code.add(p[2]); }
  const G = { nb, co, code }; gcache.set(sha, G); return G;
}
function pool(G, seed) {
  const S = 'F:' + seed; if (!G.nb.has(S)) return [];
  const dist = new Map([[S, 0]]); let fr = [S];
  for (const h of [1, 2]) { const nf = []; for (const u of fr) for (const v of G.nb.get(u)) if (!dist.has(v)) { dist.set(v, h); nf.push(v); } fr = nf; }
  const near = new Set([...dist].filter(([, d]) => d > 0).map(([k]) => k));
  for (const k of (G.co.get(S) || new Map()).keys()) near.add(k);
  const out = new Set([...near].filter(k => k.startsWith('F:') && CODE.test(k.slice(2))).map(k => k.slice(2))); out.delete(seed);
  return [...out].sort();
}
function ppr(G, seed, cands) {
  const S = 'F:' + seed; if (!G.nb.has(S)) return new Map(cands.map(c => [c, 0]));
  const keys = [...G.nb.keys()]; const idx = new Map(keys.map((k, i) => [k, i])); const N = keys.length;
  const deg = keys.map(k => G.nb.get(k).size);
  const src = [], dst = []; for (const a of keys) for (const b of G.nb.get(a)) { src.push(idx.get(a)); dst.push(idx.get(b)); }
  const e0 = new Float64Array(N); e0[idx.get(S)] = 1; let pr = Float64Array.from(e0);
  for (let it = 0; it < 25; it++) { const nx = new Float64Array(N); for (let e = 0; e < src.length; e++) nx[dst[e]] += pr[src[e]] * (1 / Math.max(deg[src[e]], 1)); for (let i = 0; i < N; i++) nx[i] = 0.15 * e0[i] + 0.85 * nx[i]; pr = nx; }
  return new Map(cands.map(c => [c, idx.has('F:' + c) ? pr[idx.get('F:' + c)] : 0]));
}
function coS(G, seed, cands) { const row = G.co.get('F:' + seed) || new Map(); const m = new Map(); for (const c of cands) { const v = row.get('F:' + c); if (v && v > 0) m.set(c, v); } return m; }
const R = { selected: sel.map(t => t.id), parents: pick.map(p => p.slice(0, 12)), checks: {} };
const bump = (k, ok) => { R.checks[k] = R.checks[k] || { ok: 0, bad: 0, ex: [] }; R.checks[k][ok ? 'ok' : 'bad']++; };
const tab = {};
for (const sc of ['pool', 'unrestricted']) { tab['PPR' + sc] = C.readScoreTable(H + '/tables/PPR_' + sc + '.tsv.gz'); tab['CO' + sc] = C.readScoreTable(H + '/tables/CO_' + sc + '.tsv.gz'); tab['RRF' + sc] = C.readScoreTable(H + '/tables/RRF_' + sc + '.tsv.gz'); }
let maxPprDiff = 0;
for (const sc of ['pool', 'unrestricted']) {
  const rRRF = readRanked(H + '/ranked/RRF_' + sc + '.jsonl.gz');
  for (const s of [1, 2, 3]) {
    const rF = readRanked(H + '/ranked/E1_fused_s' + s + '_' + sc + '.jsonl.gz');
    const rA = readRanked(H + '/ranked/E1_alone_s' + s + '_' + sc + '.jsonl.gz');
    const tF = C.readScoreTable(H + '/tables/fused_' + sc + '_s' + s + '.tsv.gz');
    for (const t of sel) {
      const G = graph(t.parent); const seed = t.seed.path;
      const cands = sc === 'pool' ? pool(G, seed) : [...G.code].filter(c => c !== seed).sort();
      const part = C.readScoreTable(H + '/parts/E1/c04/s' + s + '/' + asg[t.parent] + '/' + sc + '.tsv.gz');
      const emb = part.get(t.id) || new Map();
      const P = tab['PPR' + sc].get(t.id) || new Map(), CO = tab['CO' + sc].get(t.id) || new Map();
      // independent PPR/CO vs tables (seed 1 only)
      if (s === 1) {
        const myP = ppr(G, seed, cands); let md = 0; let okk = myP.size === P.size; for (const [c, v] of myP) { const d = Math.abs(v - (P.get(c) ?? NaN)); if (!(d <= 1e-12)) okk = false; md = Math.max(md, d || 0); } maxPprDiff = Math.max(maxPprDiff, md); bump('PPR_table_vs_indep_' + sc, okk);
        const myC = coS(G, seed, cands); let okc = myC.size === CO.size; for (const [c, v] of myC) if (CO.get(c) !== v) okc = false; bump('CO_table_vs_indep_' + sc, okc);
        const rrf = C.rrfScores(t.id, cands, [[P, 1], [CO, 1]]); const rr = C.rank(t.id, cands, rrf); const ok = JSON.stringify(rr) === JSON.stringify(rRRF.get(t.id)); bump('RRF_ranked_full_' + sc, ok);
      }
      const fz = C.rrfScores(t.id, cands, [[P, 1], [CO, 1], [emb, 1]]);
      const mine = C.rank(t.id, cands, fz); const got = rF.get(t.id);
      const ok20 = JSON.stringify(mine.slice(0, 20)) === JSON.stringify(got.slice(0, 20)); bump('fused_top20_' + sc, ok20);
      bump('fused_full_' + sc, JSON.stringify(mine) === JSON.stringify(got));
      if (!ok20 && R.checks['fused_top20_' + sc].ex.length < 3) R.checks['fused_top20_' + sc].ex.push({ id: t.id, s, mine: mine.slice(0, 5), got: got.slice(0, 5) });
      let tdiff = 0; const tf = tF.get(t.id) || new Map(); for (const [c, v] of fz) tdiff = Math.max(tdiff, Math.abs(v - (tf.get(c) ?? NaN)) || 0); bump('fused_table_eq_' + sc, tdiff < 1e-15 && tf.size === fz.size);
      const al = C.rank(t.id, cands, emb); const ga = rA.get(t.id);
      bump('alone_top20_' + sc, JSON.stringify(al.slice(0, 20)) === JSON.stringify(ga.slice(0, 20)));
      bump('alone_full_' + sc, JSON.stringify(al) === JSON.stringify(ga));
      bump('emb_scored_count_' + sc + '_any', emb.size > 0);
      R.nscored = R.nscored || {}; R.nscored[sc + '_s' + s] = (R.nscored[sc + '_s' + s] || 0) + emb.size + '/' ;
    }
  }
}
R.maxPprDiff = maxPprDiff;
delete R.nscored;
fs.writeFileSync(OUT + '/c2_fused.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
