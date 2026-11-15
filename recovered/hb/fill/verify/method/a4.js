// Every drop in context: classify by what arrived in the gap (compaction summary, thinking_drop, other).
const { S } = require('./attr.js');
const B = {}; const add = (k, v) => { const x = (B[k] = B[k] || { n: 0, lost: 0, list: [] }); x.n++; x.lost += v.lost; if (x.list.length < 6) x.list.push(v); };
const atts = {};
for (const s of S) { const C = s.calls; for (let k = 0; k + 1 < C.length; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx;
  for (const it of a.inc) if (it.at) atts[it.at] = (atts[it.at] || 0) + 1;
  if (d >= 0) continue; const frac = -d / a.ctx; const sum = a.inc.some((x) => x.cat === 'summary'); const td = a.inc.some((x) => x.at === 'thinking_drop');
  const band = frac > 0.2 ? 'BREAK>20%' : frac > 0.05 ? 'drop5-20%' : 'drop<5%';
  add(band + (sum ? ' +summary' : '') + (td ? ' +thinking_drop' : ''), { f: s.f.slice(0, 50), k, ctx: a.ctx, next: C[k + 1].ctx, lost: -d, frac: +frac.toFixed(2) }); } }
for (const [k, x] of Object.entries(B).sort()) { console.log(k.padEnd(36), 'n', x.n, 'tokens lost', (x.lost / 1e6).toFixed(2) + 'M'); if (k.startsWith('BREAK') || k.includes('thinking') || k.startsWith('drop5')) x.list.forEach((v) => console.log('    ', JSON.stringify(v))); }
console.log(atts);
