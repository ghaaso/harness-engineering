'use strict';
// Audit check 2 (and 3): an independent recomputation of the true answer for a seeded sample of
// (question, step) pairs of the replay's tree lane, and a reconstruction of what each policy served.
//   Truth: the audit's own loader (myload.js) + the finished test's ORIGINAL SQL question programs
//   (arms/relational/tq.js, copied unchanged, hashes in arms_copied_sha256.txt) over an in-memory SQLite
//   store built here; kind 9 by the original reference arm (ref.js) and the shared packer.
//   Served: from k0's per-lookup log (out/final1/lookups_tree.jsonl.gz: one code per policy:
//   C cold, H hit fresh, S hit stale, A recompute same, R recompute changed). A served answer is the
//   answer stored at the nearest earlier lookup on the tree path where that policy (re)computed
//   (C, A or R); its value is recomputed here at that snapshot.
// Usage: node a2_truth.js [n_uniform] [n_change] [n_comp_uniform] [n_comp_change]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');
const { loadG } = require('./myload');
const tq = require('./arms/relational/tq');
const { RefGraph } = require('./arms/reference/ref');
const packer = require('./arms/common/packer');
const { CLASSES, STRUCTURAL } = require('./arms/common/edgeclasses');
const K0 = path.resolve(__dirname, '..', 'k0');
const POL = ['none', 'repo', 'file', 'fact_pos', 'fact', 'fact_sem', 'cutoff', 'cutoff_sem', 'ttl5', 'ttl20', 'never'];
const [NU, NC, NCU, NCC] = [2, 3, 4, 5].map((i, j) => Number(process.argv[i] || [260, 140, 60, 40][j]));

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(777001);
const sample = (arr, k) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };

const { mine } = JSON.parse(fs.readFileSync(path.join(__dirname, 'mytree.json'), 'utf8'));
const shas = Object.keys(mine); const full = new Map(shas.map((s) => [s.slice(0, 10), s]));
const QS = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'questions.json'), 'utf8')).questions;
const qById = new Map(QS.map((q) => [q.qid, q]));
const rows = zlib.gunzipSync(fs.readFileSync(path.join(K0, 'out', 'final1', 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const R = new Map(); for (const r of rows) R.set(full.get(r.s) + '|' + r.q, r);
const warm = rows.filter((r) => r.o[4] !== 'C'); // warm for the fact policy (k0's rates count warm lookups)
const isComp = (r) => qById.get(r.q).kind === 'completion';
const changeLike = (r) => r.ch === 1 || r.o.includes('S') || r.o.includes('R');
const pick = process.env.ALL ? warm : [
  ...sample(warm.filter((r) => !isComp(r)), NU),
  ...sample(warm.filter((r) => !isComp(r) && changeLike(r)), NC),
  ...sample(warm.filter(isComp), NCU),
  ...sample(warm.filter((r) => isComp(r) && changeLike(r)), NCC),
];
const seen = new Set(); const P = [];
for (const r of pick) { const k = full.get(r.s) + '|' + r.q; if (!seen.has(k)) { seen.add(k); P.push({ sha: full.get(r.s), q: r.q, row: r }); } }

// where each policy's served (or replaced) entry was computed
function storeOf(sha, q, pi) {
  for (let a = mine[sha].parent; a; a = mine[a].parent) { const r = R.get(a + '|' + q); if (r && 'CAR'.includes(r.o[pi])) return a; }
  return null;
}
const need = new Map(); const addNeed = (s, q) => { if (!need.has(s)) need.set(s, new Set()); need.get(s).add(q); };
for (const p of P) {
  addNeed(p.sha, p.q); p.store = {};
  for (let pi = 1; pi < POL.length; pi++) { const c = p.row.o[pi]; if (c === 'C') continue; const st = storeOf(p.sha, p.q, pi); p.store[POL[pi]] = st; if (st) addNeed(st, p.q); }
  // previous lookup on the path (for the ch flag)
  for (let a = mine[p.sha].parent; a; a = mine[a].parent) if (R.has(a + '|' + p.q)) { p.prev = a; addNeed(a, p.q); break; }
}

// in-memory SQLite with the arm's schema and its insert rules (buildDb), no derived tables
const SCHEMA = fs.readFileSync(path.join(__dirname, 'arms', 'relational', 'schema.sql'), 'utf8');
function memDb(G) {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA); db.exec('BEGIN');
  const nk = [...new Set(G.nodes.map((n) => n.kind))].sort(); const kidOf = new Map(nk.map((k, i) => [k, i + 1]));
  const a = db.prepare('INSERT INTO nkind VALUES (?, ?)'); nk.forEach((k, i) => a.run(i + 1, k));
  const c = db.prepare('INSERT INTO eclass VALUES (?, ?, ?)'); CLASSES.forEach((k, i) => c.run(i, k, STRUCTURAL.has(k) ? 1 : 0));
  const e = db.prepare('INSERT INTO ekind VALUES (?, ?)'); G.kinds.forEach((k, i) => e.run(i + 1, k));
  const n = db.prepare('INSERT INTO node(id,sid,kid,path,name,ls,le,signature,runtime,slice,is_test,tokens,file_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const x of G.nodes) n.run(x.i, x.sid, kidOf.get(x.kind), x.path ?? null, x.name ?? null, x.ls ?? null, x.le ?? null, x.signature ?? null, x.runtime ?? null, x.slice ?? null, x.is_test, x.tokens, x.file);
  const ed = db.prepare('INSERT INTO edge VALUES (?,?,?,?,?,?,?)'); const ev = db.prepare('INSERT INTO edge_ev VALUES (?,?,?,?,?,?)');
  for (const x of G.edges) { ed.run(x.s, x.k, x.d, x.c, x.w, x.n, x.sym); if (x.sym) ed.run(x.d, x.k, x.s, x.c, x.w, x.n, 1); for (const [pp, l, op] of x.evs) ev.run(x.s, x.k, x.d, pp, l, op); }
  db.exec('COMMIT');
  return db;
}
const CFG = { granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, direction: 'both', classes: ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'degnorm' } };
function completion(G, ref, tg) {
  const f = G.fileOf.get(tg.path); const fn = G.nodes.find((n) => n.sid === 'file:' + tg.path);
  if (!fn) return { items: [], n_full: 0, cut: null };
  void f;
  const ranked = ref.rank([fn.i], CFG, { path: tg.path, symbol: null });
  const us = packer.project(G, ranked, [fn.i], 'file');
  const pk = packer.pack(G, us, 'signature', 'file', [8000]);
  const b = pk.budgets[8000];
  const shown = pk.items.slice(0, b.n_full + (b.cut ? 1 : 0)).map((it) => it.path);
  return { items: shown, n_full: b.n_full, cut: b.cut ? shown[shown.length - 1] : null };
}

const truth = new Map(); const t0 = Date.now(); let k = 0;
for (const [sha, qs] of need) {
  const G = loadG(sha); let db = null; let ref = null;
  for (const qid of qs) {
    const q = qById.get(qid); let a;
    if (q.kind === 'completion') { if (!ref) ref = new RefGraph(G); a = completion(G, ref, q.target); } else { if (!db) db = memDb(G); a = tq.answer(db, q, q.target); }
    truth.set(sha + '|' + qid, JSON.stringify(a));
  }
  if (db) db.close();
  if (++k % 20 === 0) console.log('snapshots', k, 'of', need.size, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}

// compare
const res = { pairs: P.length, pairs_by_kind: {}, by_policy: {}, ch_flag: { agree: 0, disagree: 0 }, answer_changed_vs_prev: 0, mismatches: [] };
for (const p of P) {
  const q = qById.get(p.q); res.pairs_by_kind[q.kind] = (res.pairs_by_kind[q.kind] || 0) + 1;
  const T = truth.get(p.sha + '|' + p.q);
  if (p.prev) { const prevAns = truth.get(p.prev + '|' + p.q); const ch = prevAns !== T ? 1 : 0; if (ch) res.answer_changed_vs_prev++; if (ch === p.row.ch) res.ch_flag.agree++; else { res.ch_flag.disagree++; res.mismatches.push({ what: 'ch', sha: p.sha, q: p.q }); } }
  for (let pi = 1; pi < POL.length; pi++) {
    const pol = POL[pi]; const c = p.row.o[pi];
    const b = res.by_policy[pol] || (res.by_policy[pol] = { lookups: 0, served: 0, served_stale_mine: 0, log_S: 0, agree: 0, disagree: 0, recompute_agree: 0, recompute_disagree: 0, cold: 0 });
    if (c === 'C') { b.cold++; continue; }
    b.lookups++;
    const st = p.store[pol]; const cached = st ? truth.get(st + '|' + p.q) : undefined;
    if (cached === undefined) { b.disagree++; res.mismatches.push({ what: 'no store', pol, sha: p.sha, q: p.q }); continue; }
    if (c === 'H' || c === 'S') {
      b.served++; const stale = cached !== T; if (stale) b.served_stale_mine++; if (c === 'S') b.log_S++;
      if (stale === (c === 'S')) b.agree++; else { b.disagree++; res.mismatches.push({ what: 'serve', pol, code: c, sha: p.sha, q: p.q, store: st }); }
    } else { const same = cached === T; if (same === (c === 'A')) b.recompute_agree++; else { b.recompute_disagree++; res.mismatches.push({ what: 'recompute', pol, code: c, sha: p.sha, q: p.q }); } }
  }
}
res.snapshots_loaded = need.size; res.truths = truth.size; res.seconds = (Date.now() - t0) / 1000;
res.sample = { seed: 777001, uniform_kinds_1_8: NU, change_kinds_1_8: NC, uniform_completion: NCU, change_completion: NCC };
res.mismatches = res.mismatches.slice(0, 50);
fs.writeFileSync(path.join(__dirname, '' + (process.env.ALL ? 'a2_truth_all.json' : 'a2_truth.json') + ''), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
