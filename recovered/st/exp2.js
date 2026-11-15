'use strict';
const L = require('./lib.js');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/frozenA';
const snap = L.loadSnap(B);
const n = snap.nodes.length;
const nodes = snap.nodes;

// ---------- A. containment hierarchy: path tree, pre/post labels ----------
console.log('== A. Containment hierarchy (path tree) ==');
const tree = new Map(); // key -> {key, parent, kids:[]}
function ensure(key, parent) { let t = tree.get(key); if (!t) { t = { key, parent, kids: [] }; tree.set(key, t); if (parent !== null) tree.get(parent).kids.push(t); } return t; }
ensure('', null);
let withPath = 0;
for (const x of nodes) {
  if (!x.path) continue;
  withPath++;
  const segs = x.path.split('/');
  let cur = '';
  for (let i = 0; i < segs.length; i++) { const nxt = cur ? cur + '/' + segs[i] : segs[i]; ensure(nxt, cur); cur = nxt; }
}
let maxDepth = 0, dirs = 0;
for (const t of tree.values()) { const d = t.key ? t.key.split('/').length : 0; if (d > maxDepth) maxDepth = d; if (t.kids.length) dirs++; }
console.log('nodes with a path', withPath, 'of', n, '| path-tree vertices (dirs+files)', tree.size, 'directories', dirs, 'max depth', maxDepth);
// pre/post
let pre = 0, post = 0; const P = new Map();
(function dfs(t) { const a = ++pre; for (const k of t.kids) dfs(k); P.set(t.key, [a, ++post]); })(tree.get(''));
// ancestor tests over random (dir, descendant file) pairs
const keys = Array.from(tree.keys()); const rand = L.rng(11);
const pairs = []; for (let i = 0; i < 2e6; i++) pairs.push([keys[Math.floor(rand() * keys.length)], keys[Math.floor(rand() * keys.length)]]);
const preA = new Int32Array(pairs.length), postA = new Int32Array(pairs.length), preB = new Int32Array(pairs.length), postB = new Int32Array(pairs.length);
pairs.forEach(([a, b], i) => { const x = P.get(a), y = P.get(b); preA[i] = x[0]; postA[i] = x[1]; preB[i] = y[0]; postB[i] = y[1]; });
let t0 = L.now(), c1 = 0; for (let r = 0; r < 5; r++) for (let i = 0; i < pairs.length; i++) if (preA[i] < preB[i] && postB[i] <= postA[i]) c1++;
const tInt = (L.now() - t0) / (5 * pairs.length) * 1e6;
t0 = L.now(); let c2 = 0; for (let r = 0; r < 5; r++) for (let i = 0; i < pairs.length; i++) { const a = pairs[i][0], b = pairs[i][1]; if (b.length > a.length && b.startsWith(a) && (a === '' || b.charCodeAt(a.length) === 47)) c2++; }
const tStr = (L.now() - t0) / (5 * pairs.length) * 1e6;
console.log('ancestor test ns/op: interval labels', tInt.toFixed(1), '| path-prefix string compare', tStr.toFixed(1), '| agree', c1 === c2);
console.log('=> the node id (a path) already is a Dewey/materialised-path label; interval labels add integers, not capability.');

// ---------- B. slice/runtime quotient graph ----------
console.log('\n== B. Slice / runtime quotient ("spatial" coarse map) ==');
const superOf = nodes.map(x => (x.runtime || '?') + '/' + (x.slice || '?'));
const sup = new Map(); superOf.forEach(s => sup.set(s, (sup.get(s) || 0) + 1));
const runtimes = new Map(); nodes.forEach(x => runtimes.set(x.runtime || '?', (runtimes.get(x.runtime || '?') || 0) + 1));
console.log('runtimes', Array.from(runtimes.entries()).map(([k, v]) => k + ':' + v).join(' '));
console.log('(runtime,slice) super-nodes', sup.size);
const byKind = new Map();
const superEdges = new Set(); const superEdgesDep = new Set();
let cross = 0, crossRt = 0, tot = 0, crossDep = 0, crossRtDep = 0, totDep = 0;
for (const e of snap.edges) {
  const a = superOf[e.a], b = superOf[e.b]; const ra = nodes[e.a].runtime, rb = nodes[e.b].runtime;
  tot++; if (a !== b) { cross++; superEdges.add(a + '>' + b); } if (ra !== rb) crossRt++;
  if (L.DEP_KINDS.has(e.kind)) { totDep++; if (a !== b) { crossDep++; superEdgesDep.add(a + '>' + b); } if (ra !== rb) crossRtDep++; }
  let k = byKind.get(e.kind); if (!k) { k = { tot: 0, xs: 0, xr: 0 }; byKind.set(e.kind, k); } k.tot++; if (a !== b) k.xs++; if (ra !== rb) k.xr++;
}
console.log('all edges', tot, 'cross-slice', cross, (cross / tot * 100).toFixed(1) + '%', 'cross-runtime', crossRt, (crossRt / tot * 100).toFixed(1) + '%', 'distinct slice-level edges', superEdges.size);
console.log('dependency kinds', totDep, 'cross-slice', crossDep, (crossDep / totDep * 100).toFixed(1) + '%', 'cross-runtime', crossRtDep, (crossRtDep / totDep * 100).toFixed(1) + '%', 'distinct slice-level edges', superEdgesDep.size);
const kk = Array.from(byKind.entries()).sort((a, b) => b[1].tot - a[1].tot).slice(0, 40).map(([k, v]) => k + ' n=' + v.tot + ' xslice=' + (v.xs / v.tot * 100).toFixed(0) + '% xruntime=' + (v.xr / v.tot * 100).toFixed(0) + '%');
console.log(kk.join('\n'));

// ---------- C. reordering / compression ----------
console.log('\n== C. Vertex order and adjacency compression (WebGraph-style gap coding) ==');
const g = L.csr(n, L.pairsOf(snap, null, 'fwd'));
function gammaBits(x) { return 2 * (31 - Math.clz32(x + 1)) + 1; }
function cost(perm) { // perm[old]=new
  const lists = Array.from({ length: n }, () => []);
  for (let u = 0; u < n; u++) for (let i = g.off[u]; i < g.off[u + 1]; i++) lists[perm[u]].push(perm[g.adj[i]]);
  let bits = 0, arcs = 0;
  for (let u = 0; u < n; u++) {
    const l = lists[u].sort((a, b) => a - b); if (!l.length) continue; arcs += l.length;
    const d0 = l[0] - u; const z = d0 >= 0 ? 2 * d0 : -2 * d0 - 1; bits += gammaBits(z);
    for (let i = 1; i < l.length; i++) bits += gammaBits(l[i] - l[i - 1] - 1);
    bits += gammaBits(l.length);
  }
  return { bitsPerArc: bits / arcs, bytes: bits / 8 };
}
const ident = Int32Array.from({ length: n }, (_, i) => i);
const pathOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => { const x = nodes[a], y = nodes[b]; const px = (x.path || '\uffff') + '#' + String(x.line_start ?? 0).padStart(6, '0') + x.id; const py = (y.path || '\uffff') + '#' + String(y.line_start ?? 0).padStart(6, '0') + y.id; return px < py ? -1 : px > py ? 1 : 0; });
const permPath = new Int32Array(n); pathOrder.forEach((o, i) => permPath[o] = i);
const rnd = L.rng(5); const ra = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ra[i], ra[j]] = [ra[j], ra[i]]; }
const permRand = Int32Array.from(ra);
// BFS (Cuthill-McKee-like) order on undirected graph from highest-degree vertex, neighbours by ascending degree
const gu = L.csr(n, L.pairsOf(snap, null, 'und'));
const deg = v => gu.off[v + 1] - gu.off[v];
const seen = new Uint8Array(n); const bord = [];
const starts = Array.from({ length: n }, (_, i) => i).sort((a, b) => deg(a) - deg(b));
for (const s of starts) { if (seen[s]) continue; const q = [s]; seen[s] = 1; let h = 0; while (h < q.length) { const u = q[h++]; bord.push(u); const nb = Array.from(gu.adj.subarray(gu.off[u], gu.off[u + 1])).filter(w => !seen[w]).sort((a, b) => deg(a) - deg(b)); for (const w of nb) { seen[w] = 1; q.push(w); } } }
const permCM = new Int32Array(n); bord.reverse().forEach((o, i) => permCM[o] = i);
const permDeg = new Int32Array(n); Array.from({ length: n }, (_, i) => i).sort((a, b) => deg(b) - deg(a)).forEach((o, i) => permDeg[o] = i);
const tests = { 'extractor order (as exported)': ident, 'path+line order (file-tree order)': permPath, 'random': permRand, 'reverse Cuthill-McKee': permCM, 'degree-sorted': permDeg };
console.log('plain CSR = 32 bits per arc =', (g.m * 4 / 1024).toFixed(1), 'KB for', g.m, 'arcs (+ offsets', ((n + 1) * 4 / 1024).toFixed(1), 'KB)');
for (const [k, p] of Object.entries(tests)) { const c = cost(p); console.log(k.padEnd(36), c.bitsPerArc.toFixed(2), 'bits/arc (Elias-gamma gaps) =', (c.bytes / 1024).toFixed(1), 'KB'); }

// ---------- D. token size of an answer vs serialisation (estimate) ----------
console.log('\n== D. Answer size: what changes it ==');
const files = []; nodes.forEach((x, i) => { if (x.kind === 'file') files.push(i); });
const gAll = gu; const bfs = L.makeBfs(n);
// collect ball members via manual BFS
function ball(g, s, K) { const seen = new Set([s]); let fr = [s]; for (let d = 0; d < K; d++) { const nx = []; for (const u of fr) for (let i = g.off[u]; i < g.off[u + 1]; i++) { const w = g.adj[i]; if (!seen.has(w)) { seen.add(w); nx.push(w); } } fr = nx; } return Array.from(seen); }
const CPT = [3.0, 4.0]; // chars per token range (estimate; no tokenizer available offline)
const stat = { idsFull: [], grouped: [], front: [], contentTok: [], n: [] };
for (const s of files) {
  const b = ball(gAll, s, 2); stat.n.push(b.length);
  let full = 0; for (const v of b) full += nodes[v].id.length + 1;
  stat.idsFull.push(full);
  // grouped by path: path once, then names
  const byPath = new Map(); for (const v of b) { const p = nodes[v].path || nodes[v].id; if (!byPath.has(p)) byPath.set(p, []); byPath.get(p).push(nodes[v].kind === 'file' ? '' : nodes[v].name || nodes[v].id); }
  let gr = 0; for (const [p, arr] of byPath) { gr += p.length + 2; for (const nm of arr) gr += nm.length + 1; }
  stat.grouped.push(gr);
  // front-coded by directory
  const dirsM = new Map(); for (const [p, arr] of byPath) { const i = p.lastIndexOf('/'); const dir = i >= 0 ? p.slice(0, i) : ''; const base = i >= 0 ? p.slice(i + 1) : p; if (!dirsM.has(dir)) dirsM.set(dir, []); dirsM.get(dir).push([base, arr]); }
  let fc = 0; for (const [dir, arr] of dirsM) { fc += dir.length + 2; for (const [base, nm] of arr) { fc += base.length + 2; for (const x of nm) fc += x.length + 1; } }
  stat.front.push(fc);
  let ct = 0; for (const v of b) ct += nodes[v].tokens || 0; stat.contentTok.push(ct);
}
const m = a => L.median(a);
console.log('2-hop ball (all edge kinds, undirected) around each of', files.length, 'file nodes: median members', m(stat.n), 'p90', L.pct(stat.n, 0.9));
for (const [nm, arr] of [['one full id per line', stat.idsFull], ['grouped by path (path once, then names)', stat.grouped], ['front-coded by directory', stat.front]]) {
  console.log(nm.padEnd(44), 'median chars', m(arr), '=> est tokens', (m(arr) / CPT[1]).toFixed(0) + '-' + (m(arr) / CPT[0]).toFixed(0), '| p90 chars', L.pct(arr, 0.9));
}
console.log('reading all the code in the 2-hop ball (sum of node token fields; includes overlapping nodes, e.g. a file and its symbols):  median', m(stat.contentTok), 'p90', L.pct(stat.contentTok, 0.9));
const ratio = stat.idsFull.map((x, i) => stat.front[i] / x); console.log('front-coded / full-id size, median ratio', m(ratio).toFixed(2));
// fixed top-K answer
const K = 20; let topIds = 0; const sampleIds = nodes.slice(0, 2000).map(x => x.id.length); console.log('mean id length (chars)', L.mean(nodes.map(x => x.id.length)).toFixed(1), '| top-' + K + ' ids as full ids', (K * (L.mean(nodes.map(x => x.id.length)) + 1)).toFixed(0), 'chars = ~' + ((K * (L.mean(nodes.map(x => x.id.length)) + 1)) / CPT[1]).toFixed(0) + '-' + ((K * (L.mean(nodes.map(x => x.id.length)) + 1)) / CPT[0]).toFixed(0) + ' tokens');
const fileTok = files.map(i => nodes[i].tokens || 0); console.log('file node tokens: median', m(fileTok), 'p90', L.pct(fileTok, 0.9), 'max', Math.max(...fileTok));
