'use strict';
// Per-commit change size and index rebuild cost over the 190 cached snapshots
const fs = require('fs'); const path = require('path');
const L = require('./lib.js'); const X = require('./idx.js');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache';
const dirs = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'meta.json')));
const metas = dirs.map(d => { const m = JSON.parse(fs.readFileSync(path.join(ROOT, d, 'meta.json'), 'utf8')); return { d, t: m.commit_time, nodes: m.counts.nodes_total, edges: m.counts.edges_total }; }).sort((a, b) => a.t - b.t);
console.log('snapshots', metas.length, 'nodes first/last', metas[0].nodes, metas[metas.length - 1].nodes, 'edges first/last', metas[0].edges, metas[metas.length - 1].edges);
let prev = null; const adds = [], rems = [], nadd = [], nrem = [], rebuild = [], idxMs = [], pllMs = [], closMs = [];
const take = process.argv[2] ? Number(process.argv[2]) : metas.length;
for (let k = 0; k < Math.min(take, metas.length); k++) {
  const m = metas[k];
  const nodes = L.readJsonl(path.join(ROOT, m.d, 'nodes.jsonl'));
  const edges = L.readJsonl(path.join(ROOT, m.d, 'edges.jsonl'));
  const ids = new Set(nodes.map(x => x.id));
  const es = new Set(); for (const e of edges) es.add(e.src + '|' + e.dst + '|' + e.kind);
  if (prev) {
    let a = 0, r = 0; for (const e of es) if (!prev.es.has(e)) a++; for (const e of prev.es) if (!es.has(e)) r++;
    let na = 0, nr = 0; for (const i of ids) if (!prev.ids.has(i)) na++; for (const i of prev.ids) if (!ids.has(i)) nr++;
    adds.push(a); rems.push(r); nadd.push(na); nrem.push(nr);
  }
  prev = { es, ids };
  // rebuild all indexes from scratch for this snapshot
  const idx = new Map(); nodes.forEach((x, i) => idx.set(x.id, i));
  const pairsF = [], pairsU = [], pairsDF = [];
  for (const e of edges) { const a = idx.get(e.src), b = idx.get(e.dst); if (a === undefined || b === undefined) continue; pairsF.push([a, b]); pairsU.push([a, b]); pairsU.push([b, a]); if (L.DEP_KINDS.has(e.kind)) pairsDF.push([a, b]); }
  const n = nodes.length;
  const t0 = L.now();
  const gF = L.csr(n, pairsF), gU = L.csr(n, pairsU), gD = L.csr(n, pairsDF);
  const t1 = L.now();
  const s = X.scc(gF); const D = X.condense(gF, s); const cl = X.closure(D); const G = X.grail(D, 3, L.rng(1));
  const sd = X.scc(gD); const DD = X.condense(gD, sd); const cd = X.closure(DD);
  const t2 = L.now();
  const pl = X.pllBuild(gU);
  const t3 = L.now();
  rebuild.push(t3 - t0); idxMs.push(t1 - t0); closMs.push(t2 - t1); pllMs.push(t3 - t2);
}
const f = a => 'median ' + L.median(a) + ' p90 ' + L.pct(a, 0.9) + ' max ' + Math.max(...a);
console.log('edges added per consecutive snapshot:', f(adds));
console.log('edges removed per consecutive snapshot:', f(rems));
console.log('nodes added:', f(nadd), '| nodes removed:', f(nrem));
const frac = adds.map((a, i) => (a + rems[i]));
console.log('total edge churn (add+remove) / edges at snapshot, median %', (L.median(frac.map((x, i) => x / metas[i + 1].edges)) * 100).toFixed(1));
const g = a => 'median ' + L.median(a).toFixed(0) + ' ms, p90 ' + L.pct(a, 0.9).toFixed(0) + ' ms, max ' + Math.max(...a).toFixed(0) + ' ms';
console.log('full from-scratch rebuild (3 CSRs + SCC+closure+GRAIL d=3 on all-forward and dependency subgraph + PLL undirected):', g(rebuild));
console.log('  of which CSR build', g(idxMs), '| closure+GRAIL', g(closMs), '| PLL', g(pllMs));
