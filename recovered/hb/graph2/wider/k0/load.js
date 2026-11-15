'use strict';
// Snapshot loader for the K0 cache replay.
// Builds, from facts/cache/<sha>/{nodes,edges}.jsonl (read only):
//   G       the canonical graph exactly as arms/common/facts.js builds it (same node order, edge merge,
//           symmetric co_changed, class, kind ids), except that node text for doc sections has no body
//           (text is used only by BM25 rankings, which no question here uses), so the source store is
//           never touched.
//   facts   one fact per node (key = node id string) and per canonical edge (key = kind|src|dst, with the
//           smaller id first for the symmetric co_changed). Two content hashes per fact:
//             hf  = hash of the whole raw record(s): every field, line numbers and token counts included
//                   (an edge's hf covers all its evidence rows with their attributes)
//             hs  = hash of the "semantic" fields only: node (id, kind, path, name, runtime, slice,
//                   is_test); edge (kind, src, dst, highest confidence, set of (evidence path, op))
//   indexes out / in adjacency by node id string, nodes by path and by name.
//   patterns  the hash of the set of facts matching a query pattern (memoised per snapshot): the basis
//           of negative dependencies ("a new matching fact invalidates").
// Hash: FNV-1a 32-bit over the UTF-16 code units, never 0 (0 means "absent").
const fs = require('fs');
const path = require('path');
const C = require('./conf');
const { classOf, CLASSES, SYMMETRIC } = require('./lib/common/edgeclasses');
const { nodeText } = require('./lib/common/textterms');

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h |= 0;
  return h === 0 ? 1 : h;
}

// global string interner (fact keys, pattern keys, paths, blob ids)
class Interner {
  constructor() { this.m = new Map(); this.a = [null]; }
  id(s) { let v = this.m.get(s); if (v === undefined) { v = this.a.length; this.a.push(s); this.m.set(s, v); } return v; }
  str(i) { return this.a[i]; }
  get size() { return this.a.length; }
}
const INT = new Interner();

const blobCache = new Map();
function blobsOf(sha) {
  if (!blobCache.has(sha)) {
    const m = JSON.parse(fs.readFileSync(path.join(C.DATA, 'blobs', sha + '.json'), 'utf8'));
    const r = new Map();
    for (const [p, b] of Object.entries(m)) r.set(p, INT.id('B:' + b));
    blobCache.clear(); // keep one at a time (the current snapshot); callers copy what they need
    blobCache.set(sha, r);
  }
  return blobCache.get(sha);
}

class Snap {
  constructor(sha) {
    this.sha = sha;
    const dir = path.join(C.FACTS, sha);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const nLines = fs.readFileSync(path.join(dir, 'nodes.jsonl'), 'utf8').split('\n').filter(Boolean);
    const eLines = fs.readFileSync(path.join(dir, 'edges.jsonl'), 'utf8').split('\n').filter(Boolean);
    this.bytes = nLines.reduce((a, l) => a + l.length + 1, 0) + eLines.reduce((a, l) => a + l.length + 1, 0);
    // nodes: first occurrence of each id (as facts.js)
    const nmap = new Map();
    for (const l of nLines) { const n = JSON.parse(l); if (!nmap.has(n.id)) nmap.set(n.id, { n, raw: l }); }
    const sids = [...nmap.keys()].sort();
    const idx = new Map(sids.map((s, i) => [s, i + 1]));
    const fileOf = new Map();
    for (const { n } of nmap.values()) if ((n.kind === 'file' || n.kind === 'doc') && n.path) fileOf.set(n.path, idx.get(n.id));
    this.fileOf = fileOf; // path -> integer id of its file or doc node
    this.node = new Map(); // sid -> G node (+ hf, hs, key)
    const nodes = sids.map((sid, i) => {
      const { n, raw } = nmap.get(sid);
      const g = {
        i: i + 1, sid, kind: n.kind, path: n.path, name: n.name, ls: n.line_start, le: n.line_end,
        signature: n.signature, runtime: n.runtime, slice: n.slice, is_test: n.is_test ? 1 : 0,
        tokens: n.tokens || 0, file: (n.path && fileOf.get(n.path)) || 0, text: nodeText(n, null),
      };
      g.hf = fnv(raw);
      g.hs = fnv(JSON.stringify([sid, n.kind, n.path, n.name, n.runtime, n.slice, n.is_test ? 1 : 0]));
      g.key = INT.id('N:' + sid);
      this.node.set(sid, g);
      return g;
    });
    // edges: one per (kind, src, dst); symmetric kinds stored once with the smaller id first
    const ekey = new Map();
    for (const l of eLines) {
      const e = JSON.parse(l);
      let s = idx.get(e.src); let d = idx.get(e.dst);
      if (!s || !d || s === d) continue;
      const sym = SYMMETRIC.has(e.kind) ? 1 : 0;
      const cls = classOf(e.kind, nmap.get(e.src).n.kind);
      let ss = e.src; let ds = e.dst;
      if (sym && d < s) { const t = s; s = d; d = t; ss = e.dst; ds = e.src; }
      const k = e.kind + '|' + ss + '|' + ds;
      const a = e.attrs || {};
      const conf = e.confidence == null ? 1 : e.confidence;
      const op = a.op || a.via || null;
      const ev = [e.evidence_path || '', e.evidence_line || 0, op];
      let p = ekey.get(k);
      if (!p) {
        p = { s, d, ss, ds, kind: e.kind, cls, sym, w: conf, n: 1, evp: ev[0], evl: ev[1], support: a.support || 0,
          recency: a.recency_weight || a.recency || 0, evs: [ev], raws: [l] };
        ekey.set(k, p);
      } else {
        p.n += 1; p.evs.push(ev); p.raws.push(l);
        if (conf > p.w) p.w = conf;
        if ((a.support || 0) > p.support) p.support = a.support || 0;
        const rc = a.recency_weight || a.recency || 0; if (rc > p.recency) p.recency = rc;
        if (ev[0] < p.evp || (ev[0] === p.evp && ev[1] < p.evl)) { p.evp = ev[0]; p.evl = ev[1]; }
      }
    }
    const kinds = [...new Set([...ekey.values()].map((e) => e.kind))].sort();
    const kid = new Map(kinds.map((k, i) => [k, i + 1]));
    this.edge = new Map(); // key string -> edge
    this.out = new Map(); this.inn = new Map();
    const push = (m, k, v) => { let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(v); };
    const edges = [];
    for (const [k, e] of ekey) {
      e.evs.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]));
      e.k = kid.get(e.kind); e.c = CLASSES.indexOf(e.cls);
      e.hf = fnv(e.raws.slice().sort().join('\n'));
      const sem = [...new Set(e.evs.map((v) => v[0] + '\u0001' + (v[2] == null ? '' : v[2])))].sort();
      e.hs = fnv(k + '\u0002' + e.w + '\u0002' + sem.join('\u0003'));
      delete e.raws;
      e.skey = k; e.key = INT.id('E:' + k);
      this.edge.set(k, e);
      push(this.out, e.ss, e);
      if (e.sym) push(this.out, e.ds, e); else push(this.inn, e.ds, e);
      edges.push(e);
    }
    edges.sort((a, b) => a.s - b.s || a.k - b.k || a.d - b.d);
    this.G = { sha, dir, meta: { extractor_version: meta.extractor_version }, nodes, edges, kinds, commits: [], removed: [], loader_version: 'L5' };
    this.byPath = new Map(); this.byName = new Map();
    for (const g of nodes) { if (g.path) push(this.byPath, g.path, g); if (g.name != null) push(this.byName, g.name, g); }
    this.patMemo = new Map();
    this.blobs = blobsOf(sha);
    this.extractor_version = meta.extractor_version;
  }

  // current hashes of a fact key id: [hf, hs] or [0, 0] when absent
  factHash(keyId) {
    const s = INT.str(keyId);
    if (s.charCodeAt(0) === 78) { const n = this.node.get(s.slice(2)); return n ? n : null; }
    const e = this.edge.get(s.slice(2)); return e || null;
  }

  // pattern evaluation: returns the matched list (sorted keys) and memoises its hash.
  //   O|sid|k1,k2   out edges of sid with those kinds (symmetric edges at sid included)
  //   I|sid|k1,k2   in edges (directed only)
  //   A|sid|mask    every edge at sid (out, in, symmetric) whose class index bit is in mask
  //   P|path        nodes with that path
  //   M|name        nodes with that name
  patMatch(pk) {
    const t = pk[0]; const rest = pk.slice(2);
    if (t === 'P') return (this.byPath.get(rest) || []).map((n) => n.sid).sort();
    if (t === 'M') return (this.byName.get(rest) || []).map((n) => n.sid).sort();
    const bar = rest.lastIndexOf('|'); const sid = rest.slice(0, bar); const arg = rest.slice(bar + 1);
    if (t === 'A') {
      const mask = Number(arg); const r = [];
      for (const e of this.out.get(sid) || []) if (mask & (1 << e.c)) r.push(e.skey);
      for (const e of this.inn.get(sid) || []) if (mask & (1 << e.c)) r.push(e.skey);
      return r.sort();
    }
    const ks = new Set(arg.split(','));
    const src = t === 'O' ? this.out.get(sid) : this.inn.get(sid);
    const r = [];
    for (const e of src || []) if (ks.has(e.kind)) r.push(e.skey);
    return r.sort();
  }
  patHash(pkId) {
    let h = this.patMemo.get(pkId);
    if (h === undefined) { h = fnv(this.patMatch(INT.str(pkId)).join('\n')); this.patMemo.set(pkId, h); }
    return h;
  }
  blobOf(p) { return this.blobs.get(p) || 0; }
}

module.exports = { Snap, INT, fnv };
