'use strict';
// The search engine for one parent commit: a grep over the exported tree (Node scan, line by line),
// a BM25 index over file text, and the cost ledger (lookups, tokens returned).
const L = require('./lib');
const S = require('./spell');

const GREP_LINE_CAP = 300;   // a person refines or abandons a pattern returning more lines than this
const SHOWN_CAP = 250;       // what a Grep call shows by default (head_limit 250)

// One context per parent commit, built from the canonical graph G the harness hands to open():
// the tree is G.sha exported with git archive (code files, plus Markdown when withDocs), minus the
// paths the task removed (G.removed); definitions come from G's node table.
class Ctx {
  constructor(G, { withDocs = false } = {}) {
    this.sha = G.sha;
    this.files = L.exportTree(G.sha, { withDocs });
    for (const p of G.removed || []) this.files.delete(p);
    this.paths = [...this.files.keys()].sort();
    this.codePaths = this.paths.filter((p) => L.CODE_EXT.some((e) => p.endsWith(e)));
    this.lines = new Map();
    for (const p of this.paths) this.lines.set(p, this.files.get(p).split('\n'));
    this.nodes = L.nodesFromG(G);
    this.fileId = L.fileIdsFromG(G);
    this._imports = new Map();
    this._bm25 = null;
  }
  imports(p) {
    if (!this._imports.has(p)) this._imports.set(p, S.parseImports(p, this.files.get(p) || '', this.files));
    return this._imports.get(p);
  }
  importLineSet(p) {
    const s = new Set();
    for (const im of this.imports(p)) for (let i = im.line; i <= im.endLine; i++) s.add(i);
    return s;
  }
  // grep -n over code files; returns hits [{path, line, text}]
  grep(re, scope) {
    const hits = [];
    for (const p of this.codePaths) {
      if (scope && !scope(p)) continue;
      const ls = this.lines.get(p);
      for (let i = 0; i < ls.length; i++) if (re.test(ls[i])) hits.push({ path: p, line: i + 1, text: ls[i] });
    }
    return hits;
  }
  bm25() {
    if (this._bm25) return this._bm25;
    const docs = new Map(); const df = new Map(); let total = 0;
    for (const p of this.codePaths) {
      const tf = new Map(); let len = 0;
      for (const t of tokenize(this.files.get(p))) { tf.set(t, (tf.get(t) || 0) + 1); len++; }
      for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
      docs.set(p, { tf, len }); total += len;
    }
    this._bm25 = { docs, df, N: docs.size, avg: total / Math.max(1, docs.size) };
    return this._bm25;
  }
  bm25Search(queryTokens, k1 = 1.2, b = 0.75) {
    const { docs, df, N, avg } = this.bm25();
    const q = [...new Set(queryTokens)].filter((t) => df.has(t));
    const res = [];
    for (const [p, d] of docs) {
      let s = 0;
      for (const t of q) {
        const f = d.tf.get(t); if (!f) continue;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avg));
      }
      if (s > 0) res.push({ path: p, score: s });
    }
    res.sort((a, b2) => b2.score - a.score || (a.path < b2.path ? -1 : 1));
    return res;
  }
}

// identifier tokens with camelCase / snake_case sub-words, lower case
function tokenize(text) {
  const out = [];
  for (const m of text.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
    const w = m[0];
    if (w.length < 2) continue;
    const lw = w.toLowerCase(); out.push(lw);
    const subs = w.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase().split('_').filter((s) => s.length >= 2);
    if (subs.length > 1) for (const s of subs) out.push(s);
  }
  return out;
}

// The cost ledger of one answer: every grep or read a session would make, and the tokens it returns.
class Ledger {
  constructor() { this.lookups = []; }
  grepCost(label, hits) {
    const shown = hits.slice(0, SHOWN_CAP);
    let t = 0; for (const h of shown) t += L.tokens(`${h.path}:${h.line}:${h.text.trim().slice(0, 300)}`);
    this.lookups.push({ op: 'grep', label, lines: hits.length, shown: shown.length, tokens: t });
    return this.lookups.length;
  }
  readCost(label, text) {
    this.lookups.push({ op: 'read', label, tokens: L.tokens(text) });
    return this.lookups.length;
  }
  listCost(label, paths) {
    this.lookups.push({ op: 'list', label, lines: paths.length, tokens: L.tokens(paths.join('\n')) });
    return this.lookups.length;
  }
  get n() { return this.lookups.length; }
  get tokens() { return this.lookups.reduce((a, l) => a + l.tokens, 0); }
  // tokens read through lookup k (1-based), inclusive
  tokensThrough(k) { let t = 0; for (let j = 0; j < k && j < this.lookups.length; j++) t += this.lookups[j].tokens; return t; }
}

module.exports = { Ctx, Ledger, tokenize, GREP_LINE_CAP, SHOWN_CAP };
