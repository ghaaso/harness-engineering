'use strict';
// Shared helpers for the storage-lane measurements. Read-only on the build facts.
const fs = require('fs');
const path = require('path');

function readJsonl(p) {
  const txt = fs.readFileSync(p, 'utf8');
  const out = [];
  let s = 0;
  for (let i = 0; i <= txt.length; i++) {
    if (i === txt.length || txt.charCodeAt(i) === 10) {
      if (i > s) out.push(JSON.parse(txt.slice(s, i)));
      s = i + 1;
    }
  }
  return out;
}

const DEP_KINDS = new Set([
  'imports', 'calls', 'calls_url', 'inherits', 'overrides', 'depends_injects', 'includes_router',
  'passes_callable', 'uses_constant', 'reads_table', 'writes_table', 'reads_setting', 'mocks',
  'test_calls_route', 'renders', 'navigates', 'foreign_key', 'maps_table', 'writes_column', 'registers_route',
]);

function loadSnap(dir, opts) {
  opts = opts || {};
  const nodes = readJsonl(path.join(dir, 'nodes.jsonl'));
  const edges = readJsonl(path.join(dir, 'edges.jsonl'));
  const idx = new Map();
  nodes.forEach((n, i) => idx.set(n.id, i));
  const seen = new Set();
  const E = [];
  for (const e of edges) {
    const a = idx.get(e.src), b = idx.get(e.dst);
    if (a === undefined || b === undefined) continue;
    const key = a + '|' + b + '|' + e.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    E.push({ a, b, kind: e.kind });
  }
  return { nodes, idx, edges: E };
}

// Build CSR from list of [a,b] pairs (deduped). Returns {n, off:Int32Array, adj:Int32Array}
function csr(n, pairs) {
  const deg = new Int32Array(n + 1);
  const seen = new Set();
  const P = [];
  for (const [a, b] of pairs) {
    if (a === b) continue;
    const k = a * n + b;
    if (seen.has(k)) continue;
    seen.add(k);
    P.push([a, b]);
    deg[a + 1]++;
  }
  for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
  const off = deg;
  const adj = new Int32Array(P.length);
  const pos = off.slice(0, n);
  for (const [a, b] of P) adj[pos[a]++] = b;
  // sort each list
  for (let v = 0; v < n; v++) {
    const sub = adj.subarray(off[v], off[v + 1]);
    sub.sort();
  }
  return { n, off, adj, m: P.length };
}

function pairsOf(snap, filter, mode) {
  const out = [];
  for (const e of snap.edges) {
    if (filter && !filter(e)) continue;
    if (mode === 'fwd') out.push([e.a, e.b]);
    else if (mode === 'rev') out.push([e.b, e.a]);
    else { out.push([e.a, e.b]); out.push([e.b, e.a]); }
  }
  return out;
}

function median(a) { const s = Array.from(a).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; }
function pct(a, p) { const s = Array.from(a).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; }
function mean(a) { let s = 0; for (const x of a) s += x; return a.length ? s / a.length : NaN; }
const now = () => Number(process.hrtime.bigint()) / 1e6; // ms

// mulberry32
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// BFS with level sizes. stamp arrays reused. returns array of cumulative counts by depth (index = depth)
function makeBfs(n) {
  const mark = new Int32Array(n);
  let stamp = 0;
  const q = new Int32Array(n);
  return function bfs(g, src, maxK, levelOut) {
    stamp++;
    let head = 0, tail = 0;
    q[tail++] = src; mark[src] = stamp;
    let depth = 0, levelEnd = tail, reached = 1;
    if (levelOut) levelOut[0] = 1;
    while (head < tail && depth < maxK) {
      while (head < levelEnd) {
        const u = q[head++];
        for (let i = g.off[u], e = g.off[u + 1]; i < e; i++) {
          const v = g.adj[i];
          if (mark[v] !== stamp) { mark[v] = stamp; q[tail++] = v; reached++; }
        }
      }
      depth++;
      levelEnd = tail;
      if (levelOut) levelOut[depth] = reached;
    }
    return reached;
  };
}

module.exports = { readJsonl, loadSnap, csr, pairsOf, median, pct, mean, now, rng, makeBfs, DEP_KINDS };
