'use strict';
const L = require('./lib.js');

function scc(g) {
  const nn = g.n;
  const index = new Int32Array(nn).fill(-1), low = new Int32Array(nn), onst = new Uint8Array(nn);
  const comp = new Int32Array(nn).fill(-1);
  const stack = []; let idc = 0, nc = 0;
  const cs = new Int32Array(nn), ci = new Int32Array(nn);
  for (let r = 0; r < nn; r++) {
    if (index[r] !== -1) continue;
    let sp = 0; cs[0] = r; ci[0] = g.off[r]; index[r] = low[r] = idc++; stack.push(r); onst[r] = 1;
    while (sp >= 0) {
      const v = cs[sp];
      if (ci[sp] < g.off[v + 1]) {
        const w = g.adj[ci[sp]++];
        if (index[w] === -1) { index[w] = low[w] = idc++; stack.push(w); onst[w] = 1; sp++; cs[sp] = w; ci[sp] = g.off[w]; }
        else if (onst[w]) { if (index[w] < low[v]) low[v] = index[w]; }
      } else {
        if (low[v] === index[v]) { let w; do { w = stack.pop(); onst[w] = 0; comp[w] = nc; } while (w !== v); nc++; }
        sp--;
        if (sp >= 0) { const u = cs[sp]; if (low[v] < low[u]) low[u] = low[v]; }
      }
    }
  }
  return { comp, nc };
}
function condense(g, s) {
  const sz = new Int32Array(s.nc);
  for (let v = 0; v < g.n; v++) sz[s.comp[v]]++;
  const sets = Array.from({ length: s.nc }, () => new Set());
  for (let u = 0; u < g.n; u++) for (let i = g.off[u]; i < g.off[u + 1]; i++) { const a = s.comp[u], b = s.comp[g.adj[i]]; if (a !== b) sets[a].add(b); }
  return { succ: sets.map(x => Array.from(x)), sz, nc: s.nc };
}
function closure(D) {
  const C = D.nc, W = (C + 31) >>> 5;
  const bits = new Uint32Array(C * W);
  for (let c = 0; c < C; c++) {
    const row = c * W;
    bits[row + (c >>> 5)] |= (1 << (c & 31));
    for (const d of D.succ[c]) { const r2 = d * W; for (let w = 0; w < W; w++) bits[row + w] |= bits[r2 + w]; }
  }
  return { bits, W, C };
}
function grail(D, d, rand) {
  const C = D.nc;
  const lo = new Int32Array(d * C), hi = new Int32Array(d * C);
  for (let dim = 0; dim < d; dim++) {
    const vis = new Uint8Array(C); let rank = 0;
    const order = Array.from({ length: C }, (_, i) => i);
    for (let i = C - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const base = dim * C;
    for (const r of order) {
      if (vis[r]) continue;
      const st = [r]; const it = new Map(); vis[r] = 1;
      const kids = (v) => { let k = it.get(v); if (!k) { const a = D.succ[v].slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } k = { k: a, p: 0 }; it.set(v, k); } return k; };
      while (st.length) {
        const v = st[st.length - 1]; const ks = kids(v); let pushed = false;
        while (ks.p < ks.k.length) { const w = ks.k[ks.p++]; if (!vis[w]) { vis[w] = 1; st.push(w); pushed = true; break; } }
        if (!pushed) { st.pop(); rank++; hi[base + v] = rank; let m = rank; for (const w of D.succ[v]) if (lo[base + w] < m) m = lo[base + w]; lo[base + v] = m; }
      }
    }
  }
  return { lo, hi, d, C };
}
function pllBuild(g) {
  const n = g.n;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => (g.off[b + 1] - g.off[b]) - (g.off[a + 1] - g.off[a]));
  const labH = Array.from({ length: n }, () => []); const labD = Array.from({ length: n }, () => []);
  const T = new Int32Array(n).fill(1e9); const dist = new Int32Array(n).fill(-1); const q = new Int32Array(n);
  for (let r = 0; r < n; r++) {
    const root = order[r];
    for (let i = 0; i < labH[root].length; i++) T[labH[root][i]] = labD[root][i];
    let h = 0, t = 0; q[t++] = root; dist[root] = 0;
    while (h < t) {
      const u = q[h++]; const du = dist[u]; let best = 1e9; const hs = labH[u], ds = labD[u];
      for (let i = 0; i < hs.length; i++) { const x = T[hs[i]] + ds[i]; if (x < best) best = x; }
      if (best <= du) continue;
      hs.push(r); ds.push(du);
      for (let i = g.off[u]; i < g.off[u + 1]; i++) { const w = g.adj[i]; if (dist[w] === -1) { dist[w] = du + 1; q[t++] = w; } }
    }
    for (let i = 0; i < t; i++) dist[q[i]] = -1;
    for (let i = 0; i < labH[root].length; i++) T[labH[root][i]] = 1e9;
  }
  let tot = 0; for (let v = 0; v < n; v++) tot += labH[v].length;
  return { labH, labD, tot };
}
module.exports = { scc, condense, closure, grail, pllBuild };
