'use strict';
const fs = require('fs'), zlib = require('zlib');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const H = LANE + '/train/heldout';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/heldout';
const ck = fs.readdirSync(H + '/parts/E1/c04/s1');
function table(s, C, sc = 'pool') { const m = new Map(); for (const l of zlib.gunzipSync(fs.readFileSync(`${H}/parts/E1/c04/s${s}/${C}/${sc}.tsv.gz`)).toString().split('\n').slice(1)) { if (!l) continue; const [t, c, v] = l.split('\t'); m.set(t + '\t' + c, Number(v)); } return m; }
function meta(s, C) { return JSON.parse(fs.readFileSync(`${H}/parts/E1/c04/s${s}/${C}/meta.json`)); }
function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = av; i = j + 1; } return r; }
function pearson(x, y) { const n = x.length; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxy / Math.sqrt(sxx * syy); }
function spear(A, B) { const keys = [...A.keys()].filter(k => B.has(k)); return { n: keys.length, nA: A.size, nB: B.size, rho: pearson(ranks(keys.map(k => A.get(k))), ranks(keys.map(k => B.get(k)))) }; }
function perTaskSpear(A, B) { const by = new Map(); for (const k of A.keys()) if (B.has(k)) { const t = k.split('\t')[0]; if (!by.has(t)) by.set(t, []); by.get(t).push(k); } const out = []; for (const [t, ks] of by) if (ks.length >= 3) out.push(pearson(ranks(ks.map(k => A.get(k))), ranks(ks.map(k => B.get(k))))); return out; }
const rows = [];
for (const C of ck) {
  const T = [1, 2, 3].map(s => table(s, C)); const M = [1, 2, 3].map(s => meta(s, C));
  const L = M.map(m => m.losses);
  const gap = (a, b) => { let g = 0; for (let i = 5; i < 70; i++) g = Math.max(g, Math.abs(a[i] - b[i])); return g; };
  const gapAll = (a, b) => { let g = 0; for (let i = 0; i < 70; i++) g = Math.max(g, Math.abs(a[i] - b[i])); return g; };
  const rise = a => { let r = -Infinity; for (let i = 1; i < 70; i++) r = Math.max(r, a[i] - a[i - 1]); return r; };
  const rise5 = a => { let r = -Infinity; for (let i = 6; i < 70; i++) r = Math.max(r, a[i] - a[i - 1]); return r; };
  const sp12 = spear(T[0], T[1]), sp13 = spear(T[0], T[2]), sp23 = spear(T[1], T[2]);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  rows.push({ C: C.slice(0, 12), tasks: M[0].tasks, nPool: T[0].size, wall: M.map(m => +m.wall_s.toFixed(1)),
    gap_after5: { '12': gap(L[0], L[1]), '13': gap(L[0], L[2]), '23': gap(L[1], L[2]) },
    gap_all: { '12': gapAll(L[0], L[1]), '13': gapAll(L[0], L[2]), '23': gapAll(L[1], L[2]) },
    rise: L.map(rise), rise_after5: L.map(rise5), final: L.map(l => l[69]),
    sp: { '12': sp12.rho, '13': sp13.rho, '23': sp23.rho }, spn: [sp12.n, sp13.n, sp23.n],
    sptask: { '12': mean(perTaskSpear(T[0], T[1])), '13': mean(perTaskSpear(T[0], T[2])), '23': mean(perTaskSpear(T[1], T[2])) } });
}
const tgt = rows.find(r => r.C === 'f57288f1f9a1');
const others = rows.filter(r => r !== tgt);
// yardstick: for every other checkpoint, s3-vs-siblings and s1-vs-s2
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const allPairs = others.flatMap(r => [r.sp['12'], r.sp['13'], r.sp['23']]).filter(Number.isFinite);
const s3pairs = others.flatMap(r => [r.sp['13'], r.sp['23']]).filter(Number.isFinite);
const minS3 = others.map(r => Math.min(r.sp['13'], r.sp['23']) - r.sp['12']).filter(Number.isFinite);
const tgtDelta = Math.min(tgt.sp['13'], tgt.sp['23']) - tgt.sp['12'];
const gapRatio = others.map(r => Math.max(r.gap_after5['13'], r.gap_after5['23'])).filter(Number.isFinite);
const R = { target: tgt,
  yardstick: { n_ckpt: others.length, spearman_all_pairs: { min: Math.min(...allPairs), p10: q(allPairs, .1), median: q(allPairs, .5), p90: q(allPairs, .9), max: Math.max(...allPairs) },
    target_s3_minus_s12_delta: tgtDelta, rank_of_target_delta_among_others: minS3.filter(x => x < tgtDelta).length + ' of ' + minS3.length + ' lower',
    s3_gap_after5_others: { median: q(gapRatio, .5), p90: q(gapRatio, .9), max: Math.max(...gapRatio) },
    rise_all_others_max: Math.max(...others.flatMap(r => r.rise)), rise_others_median: q(others.flatMap(r => r.rise), .5),
    small_pools: others.filter(r => r.nPool < 30).map(r => r.C + ':' + r.nPool) } };
fs.writeFileSync(OUT + '/c4_sleep.json', JSON.stringify({ R, rows }, null, 1));
console.log(JSON.stringify(R, null, 1));
