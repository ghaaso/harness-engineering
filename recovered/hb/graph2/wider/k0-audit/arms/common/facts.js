'use strict';
// Loader for facts/cache/<sha>/ (the frozen commit included). Produces the one canonical graph G that
// every arm loads (protocol addendum 2, D.15 and E.18), so a cross-check tests algorithms, not loading.
//   nodes: sorted by string id; integer id = position + 1 (so integer order = string order)
//   edges: one edge per (kind, source, target); self loops dropped; w = highest confidence over the
//          evidence rows; n = number of evidence rows (evidence count); every evidence row kept in evs.
//          co_changed is SYMMETRIC: the two directed rows the extractor writes for a pair become one
//          edge with s = smaller id, d = larger id, w = the higher of the two confidences, n = rows of
//          both directions, sym = 1. Every other kind is directed (sym = 0); the direction is chosen
//          at query time.
//   kinds: sorted edge-kind names; kind id = position + 1
// The loader reads only `extractor_version` from meta.json, and tolerates a commits.jsonl that holds
// only the commits an arm may use (missing `used` / `dropped` fields).
// Options: removePaths (T3/T4: a document dropped from nodes, edges and text), experimental (load the
// reads_response_field class from experimental/), skipClasses (drop classes at load time).
// exportCanon(G, dir) writes the canonical graph as plain CSV files with a content hash, so every
// engine loads byte-identical input.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('./paths');
const { classOf, CLASSES, SYMMETRIC } = require('./edgeclasses');
const { nodeText } = require('./textterms');
const source = require('./source');

const LOADER_VERSION = 'L5';

// facts/cache/<sha>/ is the only location (the frozen commit is in the cache too; there is no fallback)
function factsDir(sha) {
  const c = path.join(P.FACTS_CACHE, sha);
  if (fs.existsSync(path.join(c, 'meta.json'))) return c;
  throw new Error('no facts for ' + sha + ' (looked in ' + P.FACTS_CACHE + ')');
}
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];

const TEXT_KINDS_WITH_BODY = new Set(['doc_section', 'invariant']);

function loadFacts(sha, opts = {}) {
  const dir = factsDir(sha);
  const metaRaw = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const meta = { extractor_version: metaRaw.extractor_version || null };
  let rawN = readJsonl(path.join(dir, 'nodes.jsonl'));
  let rawE = readJsonl(path.join(dir, 'edges.jsonl'));
  if (opts.experimental) {
    rawN = rawN.concat(readJsonl(path.join(dir, 'experimental', 'response_fields.nodes.jsonl')));
    rawE = rawE.concat(readJsonl(path.join(dir, 'experimental', 'response_fields.edges.jsonl')));
  }
  // the source tree at this commit always holds every file and doc node path of the commit, removed
  // documents included (pre-flight fix round 1): trees/<sha>.json is keyed by the commit alone, so a
  // removal run that came first must not leave a tree without the removed document's text for later
  // full loads. The removed document's nodes are filtered below, so its text never reaches the graph.
  const filePaths = new Set();
  for (const n of rawN) if ((n.kind === 'file' || n.kind === 'doc') && n.path) filePaths.add(n.path);
  const removed = new Set(opts.removePaths || []);
  if (removed.size) {
    rawN = rawN.filter((n) => !(n.path && removed.has(n.path)));
    rawE = rawE.filter((e) => !(e.evidence_path && removed.has(e.evidence_path)));
  }
  // de-duplicate node ids (experimental nodes may repeat a main node)
  const nmap = new Map();
  for (const n of rawN) if (!nmap.has(n.id)) nmap.set(n.id, n);
  const sids = [...nmap.keys()].sort();
  const idx = new Map(sids.map((s, i) => [s, i + 1]));

  // source text for doc-section bodies (filePaths: every file and doc path, computed before removal)
  source.ensureTree(sha, filePaths);

  const fileOf = new Map();
  for (const n of nmap.values()) if ((n.kind === 'file' || n.kind === 'doc') && n.path) fileOf.set(n.path, idx.get(n.id));
  const nodes = sids.map((sid, i) => {
    const n = nmap.get(sid);
    let body = null;
    if (TEXT_KINDS_WITH_BODY.has(n.kind) && n.path && n.line_start) {
      const L = source.getLines(sha, n.path);
      if (L) body = L.slice(n.line_start - 1, n.line_end || n.line_start).join('\n');
    }
    return {
      i: i + 1, sid, kind: n.kind, path: n.path, name: n.name, ls: n.line_start, le: n.line_end,
      signature: n.signature, runtime: n.runtime, slice: n.slice, is_test: n.is_test ? 1 : 0,
      tokens: n.tokens || 0, file: (n.path && fileOf.get(n.path)) || 0, text: nodeText(n, body),
    };
  });

  const skip = new Set(opts.skipClasses || []);
  const ekey = new Map();
  for (const e of rawE) {
    let s = idx.get(e.src); let d = idx.get(e.dst);
    if (!s || !d || s === d) continue;
    const sym = SYMMETRIC.has(e.kind) ? 1 : 0;
    // the class of an edge is decided by its source kind as written (only `contains` depends on it)
    const cls = classOf(e.kind, nmap.get(e.src).kind);
    if (skip.has(cls)) continue;
    if (sym && d < s) { const t = s; s = d; d = t; }
    const k = s + '|' + e.kind + '|' + d;
    const ev = [e.evidence_path || '', e.evidence_line || 0];
    const a = e.attrs || {};
    const conf = e.confidence == null ? 1 : e.confidence;
    const op = a.op || a.via || null;
    const prev = ekey.get(k);
    if (!prev) {
      ekey.set(k, { s, d, kind: e.kind, cls, sym, w: conf, n: 1, evp: ev[0], evl: ev[1],
        support: a.support || 0, recency: a.recency_weight || a.recency || 0,
        evs: [[ev[0], ev[1], op]] });
    } else {
      prev.n += 1;
      prev.evs.push([ev[0], ev[1], op]);
      if (conf > prev.w) prev.w = conf;
      if ((a.support || 0) > prev.support) prev.support = a.support || 0;
      const rc = a.recency_weight || a.recency || 0; if (rc > prev.recency) prev.recency = rc;
      if (ev[0] < prev.evp || (ev[0] === prev.evp && ev[1] < prev.evl)) { prev.evp = ev[0]; prev.evl = ev[1]; }
    }
  }
  for (const e of ekey.values()) e.evs.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]));
  const kinds = [...new Set([...ekey.values()].map((e) => e.kind))].sort();
  const kid = new Map(kinds.map((k, i) => [k, i + 1]));
  const edges = [...ekey.values()].map((e) => ({ ...e, k: kid.get(e.kind), c: CLASSES.indexOf(e.cls) }));
  edges.sort((a, b) => a.s - b.s || a.k - b.k || a.d - b.d);
  const commits = readJsonl(path.join(dir, 'commits.jsonl'));
  return { sha, dir, meta, nodes, edges, kinds, commits, removed: [...removed], loader_version: LOADER_VERSION };
}

// ---- canonical export ---------------------------------------------------------------------------
const csvField = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvLine = (a) => a.map(csvField).join(',') + '\n';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Files (UTF-8, LF, RFC 4180 quoting, header row, numbers in JavaScript's shortest round-trip form):
//   nodes.csv        id,sid,kind,path,name,ls,le,runtime,slice,is_test,file,tokens,text
//   edges.csv        kind,class,src,dst,weight,n_ev        (one row per canonical edge, sorted src, kind, dst)
//   edges_<kind>.csv class,src,dst,weight,n_ev           (the same rows, one file per edge kind)
//   canon.json       content hash (sha256 over "name sha256" lines of the files, sorted by name),
//                    per-file sha256, counts, loader and extractor versions
// co_changed rows appear once with src < dst; they are symmetric (traversed both ways).
function exportCanon(G, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const files = {};
  const put = (name, text) => { fs.writeFileSync(path.join(dir, name), text); files[name] = sha256(text); };
  let t = csvLine(['id', 'sid', 'kind', 'path', 'name', 'ls', 'le', 'runtime', 'slice', 'is_test', 'file', 'tokens', 'text']);
  for (const n of G.nodes) t += csvLine([n.i, n.sid, n.kind, n.path, n.name, n.ls, n.le, n.runtime, n.slice, n.is_test, n.file, n.tokens, n.text]);
  put('nodes.csv', t);
  let e = csvLine(['kind', 'class', 'src', 'dst', 'weight', 'n_ev']);
  const byKind = new Map();
  for (const x of G.edges) {
    e += csvLine([x.kind, x.cls, x.s, x.d, x.w, x.n]);
    if (!byKind.has(x.kind)) byKind.set(x.kind, csvLine(['class', 'src', 'dst', 'weight', 'n_ev']));
    byKind.set(x.kind, byKind.get(x.kind) + csvLine([x.cls, x.s, x.d, x.w, x.n]));
  }
  put('edges.csv', e);
  for (const k of [...byKind.keys()].sort()) put('edges_' + k + '.csv', byKind.get(k));
  const names = Object.keys(files).sort();
  const hash = sha256(names.map((n) => n + ' ' + files[n] + '\n').join(''));
  const manifest = {
    hash, sha: G.sha, removed: G.removed, loader_version: G.loader_version || LOADER_VERSION,
    extractor_version: G.meta.extractor_version, nodes: G.nodes.length, edges: G.edges.length,
    edges_by_kind: Object.fromEntries([...byKind.keys()].sort().map((k) => [k, G.edges.filter((x) => x.kind === k).length])),
    symmetric_kinds: ['co_changed'], files,
  };
  fs.writeFileSync(path.join(dir, 'canon.json'), JSON.stringify(manifest, null, 1));
  return manifest;
}

module.exports = { loadFacts, factsDir, exportCanon, LOADER_VERSION };
