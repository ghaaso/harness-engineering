const { S, run } = require('./attr.js');
const F = new Set(['shell-read', 'file-read', 'search']);
// fit per-category chars/token by least squares over all gaps (gradient descent on 1/r)
const cats = {}; const rows = [];
for (const s of S) { const C = s.calls; for (let k = 0; k + 1 < C.length; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx; if (d < -0.2 * a.ctx) continue; const y = d - Math.min(a.out, Math.max(0, d)); const x = {}; for (const it of a.inc) { const c = it.cat === 'harness-note' ? 'note:' + (it.at || '') : it.cat; x[c] = (x[c] || 0) + it.ch; cats[c] = 1; } if (Object.keys(x).length) rows.push({ x, y }); } }
const ks = Object.keys(cats); const b = {}; ks.forEach((k) => (b[k] = 0.4));
for (let it = 0; it < 3000; it++) { const g = {}; ks.forEach((k) => (g[k] = 0)); for (const r of rows) { let p = 0; for (const k in r.x) p += b[k] * r.x[k]; const e = p - r.y; for (const k in r.x) g[k] += e * r.x[k]; }
  const n2 = {}; ks.forEach((k) => (n2[k] = 0)); for (const r of rows) for (const k in r.x) n2[k] += r.x[k] * r.x[k]; ks.forEach((k) => { b[k] = Math.max(0, b[k] - 0.5 * g[k] / (n2[k] || 1)); }); }
const tch = {}; for (const r of rows) for (const k in r.x) tch[k] = (tch[k] || 0) + r.x[k];
for (const k of ks.sort((p, q) => tch[q] - tch[p])) console.log(k.padEnd(34), 'chars', (tch[k] / 1e6).toFixed(2) + 'M', 'tokens/char', b[k].toFixed(3), 'chars/token', b[k] > 0 ? (1 / b[k]).toFixed(2) : 'inf');
require('fs').writeFileSync('fit.json', JSON.stringify(b));
