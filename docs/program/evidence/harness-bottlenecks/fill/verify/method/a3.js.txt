// Per-pair failures of the identity, weighted by how many later calls re-read the gap; and single-item chars/token by category.
const { S } = require('./attr.js');
let totW = 0, badHi = 0, badLo = 0, nHi = 0, nLo = 0, nPairs = 0; const R = {}, ex = [];
const add = (o, k, a, b) => { const x = (o[k] = o[k] || { ch: 0, tok: 0, n: 0 }); x.ch += a; x.tok += b; x.n++; };
for (const s of S) { const C = s.calls; let st = 0;
  while (st < C.length) { let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
    for (let k = st; k < en; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx, w = en - k; const inc = a.inc.reduce((x, y) => x + y.ch, 0);
      const pred = a.out + inc / 2.5; const res = d - pred; totW += w * Math.max(0, d); nPairs++;
      if (Math.abs(res) > 2000 && Math.abs(res) > 0.5 * Math.max(d, 1)) { if (res > 0) { badHi += w * Math.max(0, d); nHi++; } else { badLo += w * Math.max(0, d); nLo++; } if (ex.length < 400) ex.push({ f: s.f, k, d, out: a.out, inc, cats: a.inc.map((x) => x.cat + ':' + x.ch + (x.at ? ':' + x.at : '')).join(' ').slice(0, 200) }); }
      const real = a.inc.filter((x) => x.ch > 0); if (real.length === 1 && d - a.out > 300) add(R, real[0].cat + (real[0].tool === 'Read' ? '' : ''), real[0].ch, d - a.out);
    } st = en + 1; } }
console.log('pairs', nPairs, 'gap-weighted tokens', (totW / 1e6).toFixed(0) + 'M', 'bad-high (d far above out+inc/2.5)', nHi, (100 * badHi / totW).toFixed(1) + '% of gap-weighted', 'bad-low', nLo, (100 * badLo / totW).toFixed(1) + '%');
for (const [k, x] of Object.entries(R).sort((p, q) => q[1].tok - p[1].tok)) console.log(k.padEnd(22), 'n', x.n, 'chars/token', (x.ch / x.tok).toFixed(2), 'tokens', (x.tok / 1e6).toFixed(2) + 'M');
require('fs').writeFileSync('bad-pairs.json', JSON.stringify(ex, null, 0));
const lo = ex.filter((e) => e.d < e.out + e.inc / 2.5).sort((p, q) => (q.out + q.inc / 2.5 - q.d) - (p.out + p.inc / 2.5 - p.d)).slice(0, 8); const hi = ex.filter((e) => e.d > e.out + e.inc / 2.5).sort((p, q) => (q.d - q.out - q.inc / 2.5) - (p.d - p.out - p.inc / 2.5)).slice(0, 8);
console.log('LOW'); lo.forEach((e) => console.log(JSON.stringify(e))); console.log('HIGH'); hi.forEach((e) => console.log(JSON.stringify(e)));
