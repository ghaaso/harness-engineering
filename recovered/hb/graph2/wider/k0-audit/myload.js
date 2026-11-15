'use strict';
// The audit's own loader: reads facts/cache/<sha>/{nodes,edges}.jsonl directly (read only) and builds the
// canonical graph the finished test's arms consume (rules as stated in arms/common/facts.js's header),
// written here without k0/load.js. Doc text is left empty (no question here reads it).
const fs = require('fs');
const path = require('path');
const { classOf, CLASSES, SYMMETRIC } = require('./arms/common/edgeclasses');
const FACTS = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache';

function loadG(sha, dirOverride) {
  const dir = dirOverride || path.join(FACTS, sha);
  const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const rawN = rd('nodes.jsonl'); const rawE = rd('edges.jsonl');
  const first = new Map();
  for (const n of rawN) if (!first.has(n.id)) first.set(n.id, n);
  const ids = [...first.keys()].sort();
  const num = new Map(); ids.forEach((s, i) => num.set(s, i + 1));
  const fileOf = new Map();
  for (const n of first.values()) if ((n.kind === 'file' || n.kind === 'doc') && n.path) fileOf.set(n.path, num.get(n.id));
  const nodes = ids.map((sid, i) => {
    const n = first.get(sid);
    return { i: i + 1, sid, kind: n.kind, path: n.path, name: n.name, ls: n.line_start, le: n.line_end, signature: n.signature,
      runtime: n.runtime, slice: n.slice, is_test: n.is_test ? 1 : 0, tokens: n.tokens || 0, file: (n.path && fileOf.get(n.path)) || 0, text: '' };
  });
  const m = new Map();
  for (const e of rawE) {
    let s = num.get(e.src); let d = num.get(e.dst);
    if (!s || !d || s === d) continue;
    const sym = SYMMETRIC.has(e.kind) ? 1 : 0;
    if (sym && d < s) { const t = s; s = d; d = t; }
    const key = s + ' ' + e.kind + ' ' + d;
    const a = e.attrs || {};
    const w = e.confidence == null ? 1 : e.confidence;
    const op = a.op || a.via || null;
    const evp = e.evidence_path || ''; const evl = e.evidence_line || 0;
    const rc = a.recency_weight || a.recency || 0; const sup = a.support || 0;
    let x = m.get(key);
    if (!x) { x = { s, d, kind: e.kind, cls: classOf(e.kind, first.get(e.src).kind), sym, w, n: 0, evp, evl, support: sup, recency: rc, evs: [] }; m.set(key, x); }
    x.n++; x.evs.push([evp, evl, op]);
    if (w > x.w) x.w = w; if (sup > x.support) x.support = sup; if (rc > x.recency) x.recency = rc;
    if (evp < x.evp || (evp === x.evp && evl < x.evl)) { x.evp = evp; x.evl = evl; }
  }
  const kinds = [...new Set([...m.values()].map((e) => e.kind))].sort();
  const kid = new Map(kinds.map((k, i) => [k, i + 1]));
  const edges = [...m.values()];
  for (const e of edges) { e.evs.sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : p[1] - q[1])); e.k = kid.get(e.kind); e.c = CLASSES.indexOf(e.cls); }
  edges.sort((a, b) => a.s - b.s || a.k - b.k || a.d - b.d);
  return { sha, dir, meta: {}, nodes, edges, kinds, commits: [], removed: [], loader_version: 'L5', fileOf };
}
module.exports = { loadG, FACTS };
