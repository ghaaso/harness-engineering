'use strict';
const C = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L = C.LANE;
const P = (...a) => C.path.join(L, ...a);
const tasksAll = C.readJsonl(P('eval', 'tune_tasks.jsonl'));
const late = tasksAll.filter(t => t.late50);
const lateCommits = new Set(late.map(t => t.commit));
function candLists(sc) {
  const zlib = require('zlib'), fs = require('fs');
  const txt = zlib.gunzipSync(fs.readFileSync(P('eval', 'comparators', 'candidates_' + sc + '.tsv.gz'))).toString('utf8').split('\n');
  const m = new Map();
  for (let i = 1; i < txt.length; i++) { if (!txt[i]) continue; const [t, c] = txt[i].split('\t'); if (!m.has(t)) m.set(t, []); m.get(t).push(c); }
  return m;
}
const cache = new Map();
function tbl(p) { if (!cache.has(p)) cache.set(p, C.readScoreTable(p)); return cache.get(p); }
const comp = (n, sc) => tbl(P('eval', 'comparators', n + '_' + sc + '.tsv.gz'));
const stageB = (arm, cid, s, sc) => tbl(P('train', 'stageB', 'tables', `${arm}_${cid}_s${s}_${sc}.tsv.gz`));
const selB = (arm, kind, sc, s) => tbl(P('train', 'selectB', arm, `${kind}_${sc}_s${s}.tsv.gz`));
const EMPTY = new Map();
function get(t, tid) { return t.get(tid) || EMPTY; }
function ranked(tid, cands, scores) { return C.rank(tid, cands, scores); }
function fuse(tid, cands, ppr, co, emb, w) { return C.rrfScores(tid, cands, [[ppr, 1.0], [co, 1.0], [emb, w]]); }
function rrf(tid, cands, ppr, co) { return C.rrfScores(tid, cands, [[ppr, 1.0], [co, 1.0]]); }
// mulberry32 bootstrap over commit values
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boot(vals, B = 10000, seed = 1) {
  const r = rng(seed), n = vals.length, ms = new Float64Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += vals[Math.floor(r() * n)]; ms[b] = s / n; }
  ms.sort(); const m = vals.reduce((a, b) => a + b, 0) / n;
  return { mean: m, lo: ms[Math.floor(0.025 * B)], hi: ms[Math.ceil(0.975 * B) - 1] };
}
// per-task map -> per-commit means (late50) -> mean
function commitVals(perTask) { return C.perCommit(perTask, late, lateCommits).vals; }
function summ(perTask) { const v = commitVals(perTask); return v.reduce((a, b) => a + b, 0) / v.length; }
function diff(a, b) { const va = commitVals(a), vb = commitVals(b); return boot(va.map((x, i) => x - vb[i])); }
function spearman(xs, ys) {
  const rk = v => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = av; i = j + 1; } return r; };
  const a = rk(xs), b = rk(ys), n = a.length; if (n < 3) return NaN;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : NaN;
}
const f3 = x => (x >= 0 ? '+' : '') + x.toFixed(3);
const fb = d => `${f3(d.mean)} [${f3(d.lo)}, ${f3(d.hi)}]`;
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
module.exports = { C, L, P, tasksAll, late, lateCommits, candLists, tbl, comp, stageB, selB, get, ranked, fuse, rrf, boot, commitVals, summ, diff, spearman, f3, fb, median, mean, EMPTY };
