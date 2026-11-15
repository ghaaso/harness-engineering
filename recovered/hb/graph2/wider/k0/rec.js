'use strict';
// Dependency recording. A program reads the snapshot only through a Rec, which logs:
//   nodes   node id -> read positions? (line numbers, token counts, signature)   [positive facts]
//   edges   edge key -> read positions? (evidence lines)                          [positive facts]
//   pats    query patterns whose matched set the answer rests on                  [negative dependencies]
//   subs    sub-derivations (their own Rec, arguments and result), for early cutoff
// finalize() turns a Rec into a Dep: typed arrays of fact keys with the hashes they had at this
// snapshot, pattern hashes, and the files (paths, with their git blob id at this snapshot) of every
// node and edge read. A node that was looked up and absent is recorded with hash 0 (so its appearance
// invalidates). Files of an edge = its evidence paths plus both endpoints' paths. A looked-up id of the
// form sym:/const:/file:<path>#... contributes that path even when absent (fair to the file policy).
const { INT } = require('./load');

const CLS = require('./lib/common/edgeclasses').CLASSES;

class Rec {
  constructor(snap) { this.s = snap; this.nodes = new Map(); this.edges = new Map(); this.pats = new Set(); this.subs = []; this.reads = 0; }
  node(sid, pos) {
    const prev = this.nodes.get(sid);
    this.nodes.set(sid, (prev || 0) | (pos ? 1 : 0));
    this.reads++;
    return this.s.node.get(sid) || null;
  }
  _edges(t, sid, kinds, pos) {
    const pk = t + '|' + sid + '|' + kinds.join(',');
    this.pats.add(pk); this.reads++;
    const ks = new Set(kinds);
    const src = t === 'O' ? this.s.out.get(sid) : this.s.inn.get(sid);
    const r = [];
    for (const e of src || []) if (ks.has(e.kind)) { r.push(e); this.edges.set(e.skey, (this.edges.get(e.skey) || 0) | (pos ? 1 : 0)); this.reads++; }
    return r;
  }
  out(sid, kinds, pos) { return this._edges('O', sid, kinds, pos); }
  inn(sid, kinds, pos) { return this._edges('I', sid, kinds, pos); }
  // every edge at sid whose class is in mask (any confidence): the arcs a traversal may examine
  incident(sid, mask) {
    this.pats.add('A|' + sid + '|' + mask); this.reads++;
    const r = [];
    for (const e of this.s.out.get(sid) || []) if (mask & (1 << e.c)) { r.push(e); this.edges.set(e.skey, this.edges.get(e.skey) || 0); this.reads++; }
    for (const e of this.s.inn.get(sid) || []) if (mask & (1 << e.c)) { r.push(e); this.edges.set(e.skey, this.edges.get(e.skey) || 0); this.reads++; }
    return r;
  }
  byPath(p, pos) {
    this.pats.add('P|' + p); this.reads++;
    const r = this.s.byPath.get(p) || [];
    for (const n of r) this.node(n.sid, pos);
    return r;
  }
  byName(name, pos) {
    this.pats.add('M|' + name); this.reads++;
    const r = this.s.byName.get(name) || [];
    for (const n of r) this.node(n.sid, pos);
    return r;
  }
  sub(name, args, fn) {
    const c = new Rec(this.s);
    const result = fn(c);
    this.subs.push({ name, args, result, rec: c });
    return result;
  }
}

const embeddedPath = (sid) => {
  const m = sid.match(/^(?:sym|const|file|doc):([^#]+)/);
  return m ? m[1] : null;
};

// Dep: own facts only (subs kept separately); flat() merges a Dep with all its subs
function finalize(rec) {
  const s = rec.s;
  const nk = []; const nhf = []; const nhs = []; const npos = [];
  const files = new Set();
  for (const [sid, pos] of rec.nodes) {
    const n = s.node.get(sid);
    nk.push(INT.id('N:' + sid)); nhf.push(n ? n.hf : 0); nhs.push(n ? n.hs : 0); npos.push(pos);
    if (n && n.path) files.add(n.path); else if (!n) { const p = embeddedPath(sid); if (p) files.add(p); }
  }
  const ek = []; const ehf = []; const ehs = []; const epos = [];
  for (const [k, pos] of rec.edges) {
    const e = s.edge.get(k);
    ek.push(e.key); ehf.push(e.hf); ehs.push(e.hs); epos.push(pos);
    for (const v of e.evs) if (v[0]) files.add(v[0]);
    const a = s.node.get(e.ss); const b = s.node.get(e.ds);
    if (a && a.path) files.add(a.path);
    if (b && b.path) files.add(b.path);
  }
  const pk = []; const ph = [];
  for (const p of rec.pats) { const id = INT.id(p); pk.push(id); ph.push(s.patHash(id)); }
  const fk = []; const fb = [];
  for (const f of [...files].sort()) { fk.push(INT.id('F:' + f)); fb.push(s.blobOf(f)); }
  return {
    nk: Int32Array.from(nk), nhf: Int32Array.from(nhf), nhs: Int32Array.from(nhs), npos: Uint8Array.from(npos),
    ek: Int32Array.from(ek), ehf: Int32Array.from(ehf), ehs: Int32Array.from(ehs), epos: Uint8Array.from(epos),
    pk: Int32Array.from(pk), ph: Int32Array.from(ph), fk: Int32Array.from(fk), fb: Int32Array.from(fb),
    reads: rec.reads,
  };
}

function concat(arrs, T) { let n = 0; for (const a of arrs) n += a.length; const r = new T(n); let o = 0; for (const a of arrs) { r.set(a, o); o += a.length; } return r; }
// merge Deps (duplicates kept; they carry the same hashes since all were recorded at one snapshot)
function merge(deps) {
  const f = (k, T) => concat(deps.map((d) => d[k]), T);
  return {
    nk: f('nk', Int32Array), nhf: f('nhf', Int32Array), nhs: f('nhs', Int32Array), npos: f('npos', Uint8Array),
    ek: f('ek', Int32Array), ehf: f('ehf', Int32Array), ehs: f('ehs', Int32Array), epos: f('epos', Uint8Array),
    pk: f('pk', Int32Array), ph: f('ph', Int32Array), fk: f('fk', Int32Array), fb: f('fb', Int32Array),
    reads: deps.reduce((a, d) => a + d.reads, 0),
  };
}
function dedupFiles(d) {
  const m = new Map();
  for (let i = 0; i < d.fk.length; i++) m.set(d.fk[i], d.fb[i]);
  const ks = [...m.keys()];
  d.fk = Int32Array.from(ks); d.fb = Int32Array.from(ks.map((k) => m.get(k)));
  return d;
}

// A derivation record: { result, own: Dep, subs: [{name, args, result, d: Derivation}] }
function derivation(rec, result) {
  return { result, own: finalize(rec), subs: rec.subs.map((x) => ({ name: x.name, args: x.args, d: derivation(x.rec, x.result) })) };
}
function flatDep(dv) {
  const all = [];
  (function walk(x) { all.push(x.own); for (const s of x.subs) walk(s.d); })(dv);
  return dedupFiles(merge(all));
}

module.exports = { Rec, finalize, derivation, flatDep, merge, CLS };
