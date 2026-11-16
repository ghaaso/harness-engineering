// Recompute held-out rank metrics from ranked lists with git-derived truth; compare with grader heldout.json.
const fs = require('fs'), z = require('zlib');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10b/heldout2/';
const truth = fs.readFileSync(OUT + 'heldout_truth2.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const G = JSON.parse(fs.readFileSync(L + '/grader-returns/heldout.json', 'utf8'));
const M = ['P@10', 'R@10', 'R@20', 'MRR'];
function tm(ranked, T) { T = new Set(T); const n = Math.max(T.size, 1); let h10 = 0, h20 = 0, mrr = 0;
  ranked.slice(0, 10).forEach((c) => { if (T.has(c)) h10++; }); ranked.slice(0, 20).forEach((c) => { if (T.has(c)) h20++; });
  for (let i = 0; i < ranked.length; i++) if (T.has(ranked[i])) { mrr = 1 / (i + 1); break; }
  return { 'P@10': h10 / 10, 'R@10': h10 / n, 'R@20': h20 / n, MRR: mrr }; }
const load = (v, s) => { const o = {}; for (const l of z.gunzipSync(fs.readFileSync(`${L}/train/heldout/ranked/${v}_${s}.jsonl.gz`)).toString().trim().split('\n')) { const r = JSON.parse(l); o[r.id] = r.ranked; } return o; };
const base = ['RRF', 'PPR', 'CO', 'DIR', 'E1_alone_s1', 'E1_alone_s2', 'E1_alone_s3', 'E1_fused_s1', 'E1_fused_s2', 'E1_fused_s3'];
const ranked = {}; for (const v of base) for (const s of ['pool', 'unrestricted']) ranked[v + '|' + s] = load(v, s);
const commits = [...new Set(truth.map((t) => t.commit))];
function perTask(key, field) { const o = {}; for (const t of truth) o[t.task_id] = tm(ranked[key][t.task_id], t[field]); return o; }
function meanTasks(list) { const o = {}; for (const id in list[0]) { o[id] = {}; for (const m of M) o[id][m] = list.reduce((a, x) => a + x[id][m], 0) / list.length; } return o; }
function perCommit(pt) { return commits.map((c) => { const ts = truth.filter((t) => t.commit === c); const r = {}; for (const m of M) r[m] = ts.reduce((a, t) => a + pt[t.task_id][m], 0) / ts.length; return r; }); }
function summ(pt) { const pc = perCommit(pt); const r = {}; for (const m of M) r[m] = pc.reduce((a, x) => a + x[m], 0) / pc.length; return r; }
// rng: mulberry32
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pct(sorted, q) { const h = (sorted.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); }
function boot(d, seed, B = 10000) { const r = rng(seed), n = d.length, ms = new Float64Array(B); for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(r() * n)]; ms[b] = s / n; } ms.sort(); return [d.reduce((a, x) => a + x, 0) / n, pct(ms, 0.025), pct(ms, 0.975)]; }
const res = {}; const lines = [];
for (const field of ['truth', 'truthB']) {
  const R = {}; const PT = {};
  for (const s of ['pool', 'unrestricted']) {
    for (const v of base) PT[v + '|' + s] = perTask(v + '|' + s, field);
    PT['E1_alone_mean|' + s] = meanTasks([1, 2, 3].map((k) => PT[`E1_alone_s${k}|${s}`]));
    PT['E1_fused_mean|' + s] = meanTasks([1, 2, 3].map((k) => PT[`E1_fused_s${k}|${s}`]));
  }
  let maxd = 0, worst = '';
  for (const key in PT) { const [v, s] = key.split('|'); const sm = summ(PT[key]); (R[v] = R[v] || {})[s] = sm;
    for (const m of M) { const d = Math.abs(sm[m] - G.rank[v][s][m]); if (d > maxd) { maxd = d; worst = key + ' ' + m; } } }
  lines.push(`[${field}] max |mine - grader| over 12 variants x 2 scopes x 4 metrics = ${maxd.toExponential(3)} at ${worst}`);
  // contrasts
  const C = {};
  for (const arm of ['E1_fused_mean', 'E1_alone_mean']) for (const s of ['pool', 'unrestricted']) {
    const a = perCommit(PT[arm + '|' + s]).map((x) => x['P@10']), b = perCommit(PT['RRF|' + s]).map((x) => x['P@10']);
    const d = a.map((x, i) => x - b[i]); const g = G.vs_RRF[arm][s + '_P@10'];
    const bs = [11, 22, 33].map((sd) => boot(d, sd));
    C[arm + '|' + s] = { diff: bs[0][0], grader: g, mine: bs.map((x) => ({ lo: x[1], hi: x[2] })) };
    lines.push(`[${field}] ${arm} - RRF ${s} P@10: diff ${bs[0][0].toFixed(6)} (grader ${g.diff.toFixed(6)}); my intervals ` + bs.map((x) => `[${x[1].toFixed(4)}, ${x[2].toFixed(4)}]`).join(' ') + ` ; grader [${g.lo.toFixed(4)}, ${g.hi.toFixed(4)}]`);
  }
  res[field] = { summary: R, contrasts: C, maxdiff: maxd, worst };
  if (field === 'truth') {
    // sleep unit: E1 seeds on T1-0557..0560, alone and fused, pool and unrestricted
    for (const s of ['pool', 'unrestricted']) for (const k of ['alone', 'fused']) for (const id of ['T1-0557', 'T1-0558', 'T1-0559', 'T1-0560']) {
      const t = truth.find((x) => x.task_id === id);
      lines.push(`sleep ${id} parent ${t.parent.slice(0, 12)} commit ${t.commit.slice(0, 8)} ${k} ${s} P@10 s1/s2/s3 = ` + [1, 2, 3].map((q) => PT[`E1_${k}_s${q}|${s}`][id]['P@10'].toFixed(1)).join('/') + ` | RRF ${PT['RRF|' + s][id]['P@10'].toFixed(1)} | MRR s1/s2/s3 ` + [1, 2, 3].map((q) => PT[`E1_${k}_s${q}|${s}`][id].MRR.toFixed(3)).join('/'));
    }
  }
}
// table at 3 decimals vs RESULT.md
const fmt = (x) => x.toFixed(3); const tbl = [];
for (const v of ['E1_alone_s1', 'E1_alone_s2', 'E1_alone_s3', 'E1_alone_mean', 'E1_fused_s1', 'E1_fused_s2', 'E1_fused_s3', 'E1_fused_mean', 'RRF', 'PPR', 'CO', 'DIR'])
  tbl.push('| ' + v + ' | ' + ['pool', 'unrestricted'].map((s) => M.map((m) => fmt(res.truth.summary[v][s][m])).join(' | ')).join(' | ') + ' |');
lines.push('--- my table (reading A), RESULT.md column order', ...tbl);
lines.push('commits ' + commits.length + ' tasks ' + truth.length + ' tasks with ops-server.mjs in truthB ' + truth.filter((t) => t.truthB.includes('ops-server.mjs')).length);
fs.writeFileSync(OUT + 'score.out', lines.join('\n') + '\n');
fs.writeFileSync(OUT + 'score.json', JSON.stringify(res, null, 1));
console.log(lines.join('\n'));
