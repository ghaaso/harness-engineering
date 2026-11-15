'use strict';
const L = require('./lib.js');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/frozenA';
const snap = L.loadSnap(B); const n = snap.nodes.length;
const g = L.csr(n, L.pairsOf(snap, null, 'und'));
const outdeg = new Float64Array(n); for (let v = 0; v < n; v++) outdeg[v] = g.off[v+1]-g.off[v];
function ppr(src, iters, alpha) {
  let x = new Float64Array(n), y = new Float64Array(n); x[src] = 1;
  for (let it = 0; it < iters; it++) {
    y.fill(0);
    for (let u = 0; u < n; u++) { const xu = x[u]; if (xu === 0) continue; const d = outdeg[u]; if (d === 0) { y[src] += alpha * xu; continue; } const share = (1 - alpha) * xu / d; for (let i = g.off[u]; i < g.off[u+1]; i++) y[g.adj[i]] += share; }
    y[src] += alpha; // teleport
    [x, y] = [y, x];
  }
  return x;
}
const files = []; snap.nodes.forEach((x, i) => { if (x.kind === 'file') files.push(i); });
for (const s of files.slice(0, 30)) ppr(s, 40, 0.15);
const ts = []; for (const s of files) { const a = L.now(); ppr(s, 40, 0.15); ts.push(L.now() - a); }
console.log('PPR 40 iterations, whole graph, typed-array CSR, per seed ms: median', L.median(ts).toFixed(2), 'p90', L.pct(ts, 0.9).toFixed(2), 'max', Math.max(...ts).toFixed(2));
// top-k selection from the score vector
const t0 = L.now(); let acc = 0; for (const s of files.slice(0, 100)) { const x = ppr(s, 40, 0.15); const idx = Array.from({length:n},(_,i)=>i).sort((a,b)=>x[b]-x[a]).slice(0,20); acc += idx.length; } console.log('PPR + full sort for top-20, ms per seed', ((L.now()-t0)/100).toFixed(2));
