'use strict';
// Remaining mismatch cases: interval spread for question blocks, the tuning web group and T1x AUC; exact tie checks at
// 2,000 and 4,000 tokens; the exact values behind two 4th-decimal differences.
const L = require('./lib.js');
const { fs, path, B, OUT, mean, clusterMeans, refHO, refTU, clusterOf, rowsOf, gz, runtimeOf, shownItems, creditUnits } = L;
function bootQ(d, seed, n) { const R = L.makeRng(seed); const bs = new Float64Array(n); for (let k = 0; k < n; k++) { let s = 0; for (let i = 0; i < d.length; i++) s += d[Math.floor(R() * d.length)]; bs[k] = s / d.length; } const so = Array.from(bs).sort((x, y) => x - y); const q = (p) => { const h = (so.length - 1) * p; const lo = Math.floor(h); const hi = Math.ceil(h); return so[lo] + (so[hi] - so[lo]) * (h - lo); }; return [q(0.025), q(0.975)]; }
function spread(d, end, data) { const e = []; for (let s = 1; s <= 30; s++) e.push(bootQ(d, 1000 + s, 10000)[end]); const ref = bootQ(d, 99, 200000)[end]; return { n: d.length, data, min30: Math.min(...e), max30: Math.max(...e), ref_200k: ref, data_minus_ref: data - ref }; }
const out = {};
// question blocks
const Q = JSON.parse(fs.readFileSync(path.join(OUT, 'a_questions.json'), 'utf8'));
// rebuild per-question F1 differences per block from a_questions.js logic (re-run scoring inline)
const qmod = fs.readFileSync(path.join(OUT, 'a_questions.js'), 'utf8');
const ref = new Map(L.jl(path.join(B, 'sealed/tq_reference.jsonl')).filter((r) => r.split !== 'tune').map((r) => [r.id, r]));
const ans = {}; for (const a of ['relational', 'search']) ans[a] = new Map(L.jl(path.join(B, 'results/heldout/tq', a + '.answers.jsonl')).map((x) => [x.id, x]));
const JUDGE = { 21: ['device'], 25: ['backend/app/features/jobs/service.py::JobService._money_rates'], 31: ['CLAUDE.md:L239', 'CLAUDE.md:L243', 'CLAUDE.md:L246'], 39: ['CLAUDE.md:L224', 'CLAUDE.md:L199'] };
function items(x) { if (Array.isArray(x)) return x.map((v) => String(v).trim()); const o = []; for (const k of Object.keys(x || {})) for (const v of x[k] || []) o.push(k + '\u0001' + String(v).trim()); return o; }
function f1(answer, r, dj) { const isObj = !Array.isArray(r.answer); const al = r.accept_aliases || {}; let a = items(answer); if (dj) { const J = new Set(JUDGE[r.id] || []); a = a.filter((x) => !J.has(isObj ? x.split('\u0001')[1] : x)); } a = [...new Set(a)]; const R = [...new Set(items(r.answer))];
  const hit = new Set(); let tp = 0; for (const x of a) { const m = R.find((y) => { const [yk, yv] = isObj ? y.split('\u0001') : [0, y]; const [xk, xv] = isObj ? x.split('\u0001') : [0, x]; return yk === xk && (xv === yv || (al[yv] || []).includes(xv)); }); if (m) { tp++; hit.add(m); } }
  if (!a.length && !R.length) return 1; if (!R.length) return 0; const p = a.length ? tp / a.length : 0; const rc = hit.size / R.length; return p + rc ? 2 * p * rc / (p + rc) : 0; }
const D = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8'));
const T7 = [24, 27, 33, 40, 41, 46, 47]; const ids = [...ref.keys()].sort((a, b) => a - b);
const blocks = { untouched23_without_judgement: [ids.filter((i) => !T7.includes(i)), true, 0], touched8_with_judgement: [[...T7, 25].sort((a, b) => a - b), false, 1], touched8_without_judgement: [[...T7, 25].sort((a, b) => a - b), true, 1] };
out.questions = {};
for (const [n, [qs, dj, end]] of Object.entries(blocks)) { const d = qs.map((i) => f1(ans.relational.get(i).answer, ref.get(i), dj) - f1(ans.search.get(i).answer, ref.get(i), dj)); out.questions[n] = spread(d, end, D.questions.blocks[n].typed_minus_search_f1.ci95[end]); }
// tuning web group
const FROZEN = { typed: ['duckpgq', '95e990307da3b42b'], search: ['search', 'e70177e5807f0252'], search2: ['search', '950c029615d337c1'], fco: ['floor-co', 'c4d2f0a60a3d199c'] };
const tune = {}; for (const [k, [arm, h]] of Object.entries(FROZEN)) tune[k] = gz(path.join(B, 'results', arm, 'tune', h + '.T1.jsonl.gz')).map((rec) => { const r = refTU.get(rec.id); const u = r.files.length + r.defs.length; return { id: rec.id, commit: r.commit, rt: runtimeOf(r.seed.path), r8000: u ? creditUnits(shownItems(rec, 8000), r) / u : null }; });
out.tuning_web = {};
for (const [n, b] of [['typed_vs_search', 'search'], ['typed_vs_search_s2', 'search2'], ['typed_vs_cochange_floor', 'fco']]) { const f = (r) => r.rt === 'web'; const A = clusterMeans(tune.typed, 'r8000', (r) => r.commit, f); const Bm = clusterMeans(tune[b], 'r8000', (r) => r.commit, f); const ks = [...A.keys()].sort(); out.tuning_web[n] = spread(ks.map((k) => A.get(k) - Bm.get(k)), 0, D.splits.tuning_comparisons[n].web_without_root_task.ci95[0]); }
// T1x AUC typed - floor-dir
{ const auc = (r) => ((0 + r.r2000) / 2 * 2000 + (r.r2000 + r.r4000) / 2 * 2000 + (r.r4000 + r.r8000) / 2 * 4000 + (r.r8000 + r.r16000) / 2 * 8000) / 16000;
  const cm = (rows) => { const m = new Map(); for (const r of rows) { if (r.r8000 == null) continue; const c = refHO.get(r.id).commit; if (!m.has(c)) m.set(c, []); m.get(c).push(auc(r)); } return new Map([...m].map(([k, v]) => [k, mean(v)])); };
  const A = cm(rowsOf('typed', 'T1x')); const Bm = cm(rowsOf('fdir', 'T1x')); const ks = [...A.keys()].sort(); out.t1x_auc_typed_vs_fdir = spread(ks.map((k) => A.get(k) - Bm.get(k)), 0, -0.125); }
// exact tie checks at 2,000 and 4,000 tokens
function fracMean(rows, B_) { let N = 0n; let Dn = 1n; for (const r of rows) { const a = BigInt(r['cf' + B_] + r['cd' + B_]); const b = BigInt(r.units); N = N * b + a * Dn; Dn = Dn * b; } return [N, Dn * BigInt(rows.length)]; }
out.ties = [];
for (const [a, b, set, Bd] of [['lbs2d2', 'typed', 'T1', 4000], ['lbs2d3', 'typed', 'T1', 2000], ['typed', 'search2', 'T1', 4000]]) {
  const byC = (rows) => { const m = new Map(); for (const r of rows) { if (!r.units) continue; const c = clusterOf(refHO.get(r.id)); if (!m.has(c)) m.set(c, []); m.get(c).push(r); } return m; };
  const ca = byC(rowsOf(a, set)); const cb = byC(rowsOf(b, set)); const near = [];
  for (const [c, ra] of ca) { const rb = cb.get(c); const d = mean(ra.map((r) => r['r' + Bd])) - mean(rb.map((r) => r['r' + Bd])); if (d !== 0 && Math.abs(d) < 1e-9) { const [n1, d1] = fracMean(ra, Bd); const [n2, d2] = fracMean(rb, Bd); near.push({ cluster: c.slice(0, 10), float_diff: d, exact_equal: n1 * d2 === n2 * d1 }); } }
  out.ties.push({ a, b, set, budget: Bd, near });
}
// exact values for two 4th-decimal cases
const M = JSON.parse(fs.readFileSync(path.join(OUT, 'b_heldout.json'), 'utf8'));
const g = M.splits.comparisons.cochange_floor_vs_search; const c = M.tuning_split.counts; const tot = c.all.tasks; const w = (x) => c[x].tasks / tot;
out.reweighted_cochange_floor_vs_search = { exact: M.splits.reweighted.cochange_floor_vs_search, from_rounded_group_diffs: L.r4(L.r4(g.mobile.diff) * w('mobile') + L.r4(g.backend.diff) * w('backend') + L.r4(g.web_without_root_task.diff) * w('web_without_root_task')), data: D.splits.heldout_reweighted_to_tuning_mix.cochange_floor_vs_search };
out.lbs2_share_co = { exact: M.padding.lbs2.share_co, from_rounded: L.r4(L.r4(M.padding.lbs2.per_task.co) / L.r4(M.padding.lbs2.per_task.recall)), data: D.padding.arms.lbs2.share_via_cochange_per_task };
fs.writeFileSync(path.join(OUT, 'f_spread.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
