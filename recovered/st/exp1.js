'use strict';
const L = require('./lib.js');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/' + (process.argv[2] || 'frozenA');
const snap = L.loadSnap(B);
const n = snap.nodes.length;
console.log('nodes', n, 'edges(unique src,dst,kind)', snap.edges.length);
const kinds = {};
for (const e of snap.edges) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
console.log('edge kinds', Object.keys(kinds).length);

const fileIdx = [];
snap.nodes.forEach((x, i) => { if (x.kind === 'file') fileIdx.push(i); });
const allIdx = snap.nodes.map((_, i) => i);

const variants = {
  'ALL-undirected': L.csr(n, L.pairsOf(snap, null, 'und')),
  'ALL-forward': L.csr(n, L.pairsOf(snap, null, 'fwd')),
  'DEP-forward': L.csr(n, L.pairsOf(snap, e => L.DEP_KINDS.has(e.kind), 'fwd')),
  'DEP-reverse(dependents)': L.csr(n, L.pairsOf(snap, e => L.DEP_KINDS.has(e.kind), 'rev')),
  'DEP-undirected': L.csr(n, L.pairsOf(snap, e => L.DEP_KINDS.has(e.kind), 'und')),
};
const bfs = L.makeBfs(n);

console.log('\n== CSR sizes ==');
for (const [k, g] of Object.entries(variants)) {
  console.log(k, 'arcs', g.m, 'bytes CSR (4B ids + 4B offsets)', g.m * 4 + (n + 1) * 4);
}

// degree stats
{
  const g = variants['ALL-undirected'];
  const deg = [];
  for (let v = 0; v < n; v++) deg.push(g.off[v + 1] - g.off[v]);
  const s = deg.slice().sort((a, b) => b - a);
  console.log('\nundirected degree: mean', L.mean(deg).toFixed(2), 'median', L.median(deg), 'p99', L.pct(deg, 0.99), 'max', s[0], 'top5', s.slice(0, 5));
  const top = deg.map((d, i) => [d, i]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(([d, i]) => d + ' ' + snap.nodes[i].id.slice(0, 60));
  console.log('top hubs:', top);
  // top-1% of vertices cover what share of arcs
  const tot = s.reduce((a, b) => a + b, 0);
  const k1 = Math.ceil(n * 0.01);
  console.log('top 1% vertices hold', (s.slice(0, k1).reduce((a, b) => a + b, 0) / tot * 100).toFixed(1) + '% of arc endpoints');
}

console.log('\n== Ball sizes and BFS time per source (file nodes as sources) ==');
const KS = [1, 2, 3, 4, 6, 64];
for (const [name, g] of Object.entries(variants)) {
  const sizes = {}; const times = {};
  for (const K of KS) { sizes[K] = []; times[K] = []; }
  for (const K of KS) {
    // warm
    for (const s of fileIdx.slice(0, 50)) bfs(g, s, K, null);
    for (const s of fileIdx) {
      const t0 = L.now();
      const r = bfs(g, s, K, null);
      times[K].push((L.now() - t0) * 1000);
      sizes[K].push(r);
    }
  }
  console.log('--', name);
  for (const K of KS) {
    console.log('  k=' + (K === 64 ? 'inf' : K), 'reach median', L.median(sizes[K]), 'p90', L.pct(sizes[K], 0.9), 'max', Math.max(...sizes[K]),
      '| BFS us median', L.median(times[K]).toFixed(1), 'p99', L.pct(times[K], 0.99).toFixed(1), 'max', Math.max(...times[K]).toFixed(1));
  }
}

// SCC (iterative Tarjan)
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
  const succ = sets.map(x => Array.from(x));
  return { succ, sz, nc: s.nc };
}

function closure(D) {
  const C = D.nc, W = (C + 31) >>> 5;
  const bits = new Uint32Array(C * W);
  const t0 = L.now();
  // Tarjan numbers components in reverse topological order: successors have smaller ids
  for (let c = 0; c < C; c++) {
    const row = c * W;
    bits[row + (c >>> 5)] |= (1 << (c & 31));
    for (const d of D.succ[c]) { const r2 = d * W; for (let w = 0; w < W; w++) bits[row + w] |= bits[r2 + w]; }
  }
  const ms = L.now() - t0;
  return { bits, W, C, ms };
}
function popcnt(x) { x = x - ((x >>> 1) & 0x55555555); x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }

function grail(D, d, rand) {
  const C = D.nc;
  const lo = new Int32Array(d * C), hi = new Int32Array(d * C);
  // roots: all comps in random order; DFS iterative with random child order
  for (let dim = 0; dim < d; dim++) {
    const vis = new Uint8Array(C);
    let rank = 0;
    const order = Array.from({ length: C }, (_, i) => i);
    for (let i = C - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const base = dim * C;
    for (const r of order) {
      if (vis[r]) continue;
      const st = [r]; const it = new Map();
      vis[r] = 1;
      const kids = (v) => { let k = it.get(v); if (!k) { k = D.succ[v].slice(); for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } it.set(v, { k, p: 0 }); return it.get(v); } return k; };
      while (st.length) {
        const v = st[st.length - 1];
        const ks = kids(v);
        let pushed = false;
        while (ks.p < ks.k.length) {
          const w = ks.k[ks.p++];
          if (!vis[w]) { vis[w] = 1; st.push(w); pushed = true; break; }
        }
        if (!pushed) {
          st.pop();
          rank++;
          hi[base + v] = rank;
          let m = rank;
          for (const w of D.succ[v]) { if (lo[base + w] < m) m = lo[base + w]; }
          lo[base + v] = m;
        }
      }
    }
  }
  return { lo, hi, d, C };
}
function grailMaybe(G, u, v) {
  const C = G.C;
  for (let dim = 0; dim < G.d; dim++) {
    const b = dim * C;
    if (!(G.lo[b + u] <= G.lo[b + v] && G.hi[b + v] <= G.hi[b + u])) return false;
  }
  return true;
}

function closureStats(name, g) {
  console.log('\n== Reachability structure: ' + name + ' ==');
  const s = scc(g);
  const D = condense(g, s);
  const big = Math.max(...D.sz);
  let dagEdges = 0; for (const x of D.succ) dagEdges += x.length;
  console.log('SCCs', s.nc, 'largest SCC', big, 'singletons', Array.from(D.sz).filter(x => x === 1).length, 'condensation DAG edges', dagEdges);
  const cl = closure(D);
  // reach per node (weighted)
  const reach = new Float64Array(D.nc);
  for (let c = 0; c < D.nc; c++) { let t = 0; const row = c * cl.W; for (let d = 0; d < D.nc; d++) if (cl.bits[row + (d >>> 5)] & (1 << (d & 31))) t += D.sz[d]; reach[c] = t; }
  let pairs = 0; for (let v = 0; v < g.n; v++) pairs += reach[s.comp[v]];
  const nodeReach = []; for (let v = 0; v < g.n; v++) nodeReach.push(reach[s.comp[v]]);
  console.log('closure bitset', (cl.bits.byteLength / 1024).toFixed(0) + ' KB', 'build ms', cl.ms.toFixed(1),
    '| reachable ordered pairs', pairs, '=', (pairs / (g.n * g.n) * 100).toFixed(1) + '% of n^2',
    '| per-node reach median', L.median(nodeReach), 'p90', L.pct(nodeReach, 0.9), 'max', Math.max(...nodeReach));
  return { s, D, cl };
}

for (const nm of ['DEP-forward', 'DEP-reverse(dependents)', 'ALL-forward']) {
  const g = variants[nm];
  const { s, D, cl } = closureStats(nm, g);
  // GRAIL on condensation, queries among components weighted as random node pairs
  const rand = L.rng(7);
  const Q = 200000; const qs = [];
  for (let i = 0; i < Q; i++) { qs.push([s.comp[Math.floor(rand() * g.n)], s.comp[Math.floor(rand() * g.n)]]); }
  const truth = (u, v) => (cl.bits[u * cl.W + (v >>> 5)] & (1 << (v & 31))) !== 0;
  let pos = 0; for (const [u, v] of qs) if (truth(u, v)) pos++;
  console.log('random node pairs: reachable', (pos / Q * 100).toFixed(2) + '%');
  for (const d of [1, 2, 3, 5]) {
    const t0 = L.now(); const G = grail(D, d, L.rng(100 + d)); const bt = L.now() - t0;
    let neg = 0, cut = 0, fp = 0;
    for (const [u, v] of qs) { const tr = truth(u, v); const m = grailMaybe(G, u, v); if (!tr) { neg++; if (!m) cut++; else fp++; } else if (!m) throw new Error('false negative'); }
    console.log(' GRAIL d=' + d, 'build ms', bt.toFixed(1), 'index entries', 2 * d * D.nc, '| of non-reachable pairs, answered by labels alone', (cut / neg * 100).toFixed(1) + '%', 'false-positive', (fp / neg * 100).toFixed(1) + '%');
  }
  // time: closure lookup vs plain BFS reachability (early exit) vs GRAIL-guided DFS
  const gg = g;
  const t0 = L.now(); let acc = 0; for (const [u, v] of qs) acc += truth(u, v) ? 1 : 0; const tc = (L.now() - t0) / Q * 1000;
  // BFS point query with early exit on original graph
  const mark = new Int32Array(g.n); let stamp = 0; const q = new Int32Array(g.n);
  function reachBFS(a, b) { if (a === b) return true; stamp++; let h = 0, t = 0; q[t++] = a; mark[a] = stamp; while (h < t) { const u = q[h++]; for (let i = g.off[u]; i < g.off[u + 1]; i++) { const w = g.adj[i]; if (w === b) return true; if (mark[w] !== stamp) { mark[w] = stamp; q[t++] = w; } } } return false; }
  const nodePairs = []; for (let i = 0; i < 20000; i++) nodePairs.push([Math.floor(rand() * g.n), Math.floor(rand() * g.n)]);
  const t1 = L.now(); let acc2 = 0; for (const [a, b] of nodePairs) if (reachBFS(a, b)) acc2++; const tb = (L.now() - t1) / nodePairs.length * 1000;
  console.log(' point query: closure lookup', tc.toFixed(3), 'us | plain BFS with early exit', tb.toFixed(1), 'us (random node pairs, n=' + g.n + ')');
}

// PLL on undirected ALL
{
  const g = variants['ALL-undirected'];
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => (g.off[b + 1] - g.off[b]) - (g.off[a + 1] - g.off[a]));
  const rankOf = new Int32Array(n); order.forEach((v, r) => rankOf[v] = r);
  const labH = Array.from({ length: n }, () => []); const labD = Array.from({ length: n }, () => []);
  const T = new Int32Array(n).fill(1e9);
  const dist = new Int32Array(n).fill(-1); const q = new Int32Array(n);
  const t0 = L.now();
  for (let r = 0; r < n; r++) {
    const root = order[r];
    for (let i = 0; i < labH[root].length; i++) T[labH[root][i]] = labD[root][i];
    let h = 0, t = 0; q[t++] = root; dist[root] = 0;
    while (h < t) {
      const u = q[h++]; const du = dist[u];
      // prune test
      let best = 1e9; const hs = labH[u], ds = labD[u];
      for (let i = 0; i < hs.length; i++) { const x = T[hs[i]] + ds[i]; if (x < best) best = x; }
      if (best <= du) continue;
      hs.push(r); ds.push(du);
      for (let i = g.off[u]; i < g.off[u + 1]; i++) { const w = g.adj[i]; if (dist[w] === -1) { dist[w] = du + 1; q[t++] = w; } }
    }
    for (let i = 0; i < t; i++) dist[q[i]] = -1;
    for (let i = 0; i < labH[root].length; i++) T[labH[root][i]] = 1e9;
  }
  const bt = L.now() - t0;
  let tot = 0, mx = 0; for (let v = 0; v < n; v++) { tot += labH[v].length; mx = Math.max(mx, labH[v].length); }
  console.log('\n== PLL (pruned landmark labelling), undirected, all edge kinds ==');
  console.log('build ms', bt.toFixed(1), 'label entries', tot, 'mean per vertex', (tot / n).toFixed(2), 'max', mx, 'bytes at 5 B/entry', tot * 5, '= ' + (tot * 5 / 1024).toFixed(0) + ' KB', ' vs CSR ' + ((g.m * 4 + (n + 1) * 4) / 1024).toFixed(0) + ' KB');
  const rand = L.rng(3);
  const pairs = []; for (let i = 0; i < 100000; i++) pairs.push([Math.floor(rand() * n), Math.floor(rand() * n)]);
  function qpll(a, b) { const ha = labH[a], da = labD[a], hb = labH[b], db = labD[b]; let i = 0, j = 0, best = 1e9; while (i < ha.length && j < hb.length) { if (ha[i] === hb[j]) { const x = da[i] + db[j]; if (x < best) best = x; i++; j++; } else if (ha[i] < hb[j]) i++; else j++; } return best; }
  const tq = L.now(); let s1 = 0; for (const [a, b] of pairs) { const x = qpll(a, b); if (x < 1e9) s1++; } const tp = (L.now() - tq) / pairs.length * 1000;
  // BFS distance (full) and bidirectional
  const mark = new Int32Array(n); let stamp = 0;
  function bfsd(a, b) { if (a === b) return 0; stamp++; let h = 0, t = 0; q[t++] = a; mark[a] = stamp; dist[a] = 0; while (h < t) { const u = q[h++]; for (let i = g.off[u]; i < g.off[u + 1]; i++) { const w = g.adj[i]; if (mark[w] !== stamp) { mark[w] = stamp; dist[w] = dist[u] + 1; if (w === b) { const r = dist[w]; return r; } q[t++] = w; } } } return 1e9; }
  const sub = pairs.slice(0, 20000);
  const tb0 = L.now(); let s2 = 0; for (const [a, b] of sub) { const x = bfsd(a, b); if (x < 1e9) s2++; } const tb = (L.now() - tb0) / sub.length * 1000;
  // verify equality on 2000 pairs
  let bad = 0; for (const [a, b] of sub.slice(0, 2000)) { const x = qpll(a, b), y = bfsd(a, b); if (x !== y) bad++; }
  console.log('query: PLL', tp.toFixed(3), 'us | BFS with early exit', tb.toFixed(1), 'us | mismatches on 2000 pairs', bad, '| connected share of random pairs', (s1 / pairs.length * 100).toFixed(1) + '%');
}
