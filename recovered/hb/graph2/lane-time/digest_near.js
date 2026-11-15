'use strict';
// Read-only. How big is a "what changed near this file since I last looked" digest?
// For main-chain snapshot pairs (S_i, S_{i+H}) and sampled anchor files, count the edge delta (added or removed,
// co_changed excluded because history-derived weights move every commit) that has at least one endpoint inside the
// anchor's k-hop neighbourhood in the union of the two snapshots. Hubs (degree > HUB in the union) are not expanded.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2';
const chain = JSON.parse(fs.readFileSync(path.join(ROOT, 'wider/k0/data/chain.json'), 'utf8')).snapshots.map((s) => s.sha);
const cache = path.join(ROOT, 'build/facts/cache');
const HUB = 60;
function loadEdges(sha) {
  const E = new Set();
  const files = new Set();
  for (const line of fs.readFileSync(path.join(cache, sha, 'edges.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const e = JSON.parse(line);
    if (e.kind === 'co_changed') continue;
    E.add(e.kind + '|' + e.src + '|' + e.dst);
  }
  for (const line of fs.readFileSync(path.join(cache, sha, 'nodes.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const n = JSON.parse(line);
    if (n.kind === 'file' && !n.is_test) files.add(n.id);
  }
  return { E, files };
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261113);
function q(arr, p) { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; }

for (const H of [1, 5, 20]) {
  const res = { 1: [], 2: [] }, totalDelta = [];
  let pairs = 0;
  const idxs = [];
  for (let i = 10; i + H < chain.length; i += 4) idxs.push(i);
  for (const i of idxs) {
    const A = loadEdges(chain[i]), B = loadEdges(chain[i + H]);
    const added = [], removed = [];
    for (const k of B.E) if (!A.E.has(k)) added.push(k);
    for (const k of A.E) if (!B.E.has(k)) removed.push(k);
    const delta = added.concat(removed);
    totalDelta.push(delta.length);
    const adj = new Map();
    const addEdge = (k) => { const [, s, d] = k.split('|'); if (!adj.has(s)) adj.set(s, new Set()); if (!adj.has(d)) adj.set(d, new Set()); adj.get(s).add(d); adj.get(d).add(s); };
    for (const k of A.E) addEdge(k); for (const k of B.E) addEdge(k);
    const cand = [...A.files].filter((f) => B.files.has(f));
    // 20 anchors per pair
    for (let n = 0; n < 20 && cand.length; n++) {
      const f = cand[Math.floor(rand() * cand.length)];
      let frontier = new Set([f]); const seen = new Set([f]);
      for (let hop = 1; hop <= 2; hop++) {
        const nxt = new Set();
        for (const u of frontier) {
          if (hop > 1 && (adj.get(u) || new Set()).size > HUB) continue; // do not expand hubs beyond the first hop
          for (const v of adj.get(u) || []) if (!seen.has(v)) { seen.add(v); nxt.add(v); }
        }
        frontier = nxt;
        let near = 0;
        for (const k of delta) { const [, s, d] = k.split('|'); if (seen.has(s) || seen.has(d)) near++; }
        res[hop].push(near);
      }
    }
    pairs++;
  }
  console.log(`horizon H=${H} snapshots (mean gap about ${(H * 1.57).toFixed(1)} commits): pairs ${pairs}; whole-graph delta median ${q(totalDelta, .5)} p90 ${q(totalDelta, .9)}`);
  for (const hop of [1, 2]) {
    const v = res[hop];
    console.log(`   near anchor, ${hop}-hop: n=${v.length} median ${q(v, .5)} p90 ${q(v, .9)} max ${Math.max(...v)}; share with zero changes ${(v.filter((x) => x === 0).length / v.length * 100).toFixed(1)} %`);
  }
}
