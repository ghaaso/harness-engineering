const { S, run } = require('./attr.js'); const b = JSON.parse(require('fs').readFileSync('fit.json', 'utf8'));
const pick = (r) => { const o = {}; for (const k of ['attM', 'fetched', 'own', 'start', 'unclassified', 'messages', 'rest', 'first', 'again']) o[k] = r[k]; return o; };
console.log('char split    ', JSON.stringify(pick(run())));
console.log('fitted weights', JSON.stringify(pick(run({ itemW: (it) => it.ch * (b[it.cat === 'harness-note' ? 'note:' + (it.at || '') : it.cat] ?? 0.4) }))));
// how much fetched sits in gaps that also carry non-fetched content (>10% of chars)
const F = new Set(['shell-read', 'file-read', 'search']); let fAll = 0, fMixed = 0;
for (const s of S) { const C = s.calls; let st = 0; while (st < C.length) { let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
  for (let k = st; k < en; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx, inT = Math.max(0, d - Math.min(a.out, Math.max(0, d))), w = en - k; const tot = a.inc.reduce((x, y) => x + y.ch, 0); if (!tot) continue;
    const fch = a.inc.filter((x) => F.has(x.cat)).reduce((x, y) => x + y.ch, 0); const ft = w * inT * fch / tot; fAll += ft; if (fch < 0.9 * tot) fMixed += ft; } st = en + 1; } }
console.log('fetched tokens in gaps where >10% of chars are not fetched content:', (100 * fMixed / fAll).toFixed(1) + '% of fetched');
