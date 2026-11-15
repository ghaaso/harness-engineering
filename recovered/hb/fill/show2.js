const J = JSON.parse(require('fs').readFileSync('fill-result.json', 'utf8'));
let grand = 0; for (const g in J.G) grand += Object.values(J.G[g].cat).reduce((a, b) => a + b, 0);
for (const g in J.G) { const tot = Object.values(J.G[g].cat).reduce((a, b) => a + b, 0); console.log(g, Object.entries(J.G[g].repeat).map(([k, v]) => k + ': ' + (v / 1e6).toFixed(0) + 'M ' + (100 * v / tot).toFixed(1) + '%').join(' | ')); }
console.log('windows', J.windows, 'distinct paths', J.distinctPaths);
let c = 0; for (const t of J.top.slice(0, 30)) { c += t.tokens; console.log((t.tokens / 1e6).toFixed(1).padStart(6) + 'M ' + (100 * t.tokens / grand).toFixed(2).padStart(5) + '%  windows ' + String(t.windows).padStart(3) + '  ' + t.path); }
console.log('top 30 together', (100 * c / grand).toFixed(1) + '%');
