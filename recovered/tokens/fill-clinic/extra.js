const J = JSON.parse(require('fs').readFileSync('fill-result.json', 'utf8'));
let tot = 0; const cat = {}, kind = {}, rep = {}; const g = {};
for (const k in J.G) { const R = J.G[k]; const t = Object.values(R.cat).reduce((a, b) => a + b, 0); tot += t; g[k] = { attributed: t, actual: R.actual, calls: R.calls, files: R.files, segs: R.segs };
  for (const c in R.cat) cat[c] = (cat[c] || 0) + R.cat[c]; for (const c in R.kind) kind[c] = (kind[c] || 0) + R.kind[c]; for (const c in R.repeat) rep[c] = (rep[c] || 0) + R.repeat[c]; }
const s = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / tot).toFixed(4)]));
const byKind = {}; for (const k in kind) { const kk = k.split(':')[1] || '(none)'; byKind[kk] = (byKind[kk] || 0) + kind[k]; }
console.log(JSON.stringify({ cpt: J.cpt, windows: J.windows, distinctPaths: J.distinctPaths, totAttributed: tot, totActual: Object.values(g).reduce((a, b) => a + b.actual, 0), groups: g, cat: s(cat), kind: s(kind), byKind: s(byKind), repeat: s(rep), top15: J.top.slice(0, 15).map((t) => ({ path: t.path, share: +(t.tokens / tot).toFixed(4), windows: t.windows })) }, null, 1));
