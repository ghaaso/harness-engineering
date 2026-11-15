'use strict';
// Synthetic scale-up (Barabasi-Albert, mean undirected degree ~5.7 like the measured graph). SYNTHETIC: only for crossover arithmetic.
const L = require('./lib.js'); const X = require('./idx.js');
function ba(n, m, seed) {
  const r = L.rng(seed); const ends = []; const pairs = [];
  for (let v = 1; v < n; v++) {
    const k = Math.min(v, m + (r() < 0.9 ? 0 : 1) - (r() < 0.1 ? 1 : 0));
    const chosen = new Set();
    let tries = 0;
    while (chosen.size < k && tries++ < 50) { const t = ends.length && r() < 0.8 ? ends[Math.floor(r() * ends.length)] : Math.floor(r() * v); if (t !== v) chosen.add(t); }
    for (const t of chosen) { pairs.push([v, t]); pairs.push([t, v]); ends.push(v, t); }
  }
  return pairs;
}
const sizes = [5460, 54600, 546000, 3000000];
for (const n of sizes) {
  const t0 = L.now(); const pairs = ba(n, 3, 42); const gen = L.now() - t0;
  const t1 = L.now(); const g = L.csr(n, pairs); const bt = L.now() - t1;
  const bfs = L.makeBfs(n); const r = L.rng(9); const src = []; for (let i = 0; i < 200; i++) src.push(Math.floor(r() * n));
  const out = [];
  for (const K of [2, 3, 4, 64]) {
    for (const s of src.slice(0, 20)) bfs(g, s, K, null);
    const ts = [], rs = [];
    for (const s of src) { const a = L.now(); const x = bfs(g, s, K, null); ts.push((L.now() - a) * 1000); rs.push(x); }
    out.push('k=' + (K === 64 ? 'inf' : K) + ' reach ' + L.median(rs) + ' ' + L.median(ts).toFixed(1) + 'us');
  }
  console.log('n=' + n, 'arcs', g.m, 'CSR MB', ((g.m * 4 + (n + 1) * 4) / 1048576).toFixed(2), 'build ms', bt.toFixed(0), '|', out.join(' | '), '| closure bitset (n^2/8) MB', (n * n / 8 / 1048576).toFixed(0));
  if (n <= 54600) {
    const t2 = L.now(); const p = X.pllBuild(g); const pt = L.now() - t2;
    console.log('   PLL build ms', pt.toFixed(0), 'entries/vertex', (p.tot / n).toFixed(1), 'index MB at 5 B/entry', (p.tot * 5 / 1048576).toFixed(1));
  }
}
