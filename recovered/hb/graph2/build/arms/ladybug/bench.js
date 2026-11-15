'use strict';
// Engine measures for the LadybugDB arm at the frozen commit (protocol section 7, engine measures),
// mirroring arms/relational/bench.js: load time, bytes on disk, memory, p50/p95 latency cold and warm
// per query class (the relational classes plus the engine-native ones), update time for a one-file
// change checked against a fresh build, EXPLAIN for the hot queries, lines of query code per algorithm.
// Indicative only: one run, inside graphtest:1 with --cpus 6 --memory 4g, threads=1 per query.
//   node bench.js            -> results/ladybug/engine.json, results/ladybug/query_plans.txt
//   node bench.js mem        -> (child) prints RSS before/after open and after the query classes
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const lbug = require('@ladybugdb/core');
const P = require('../common/paths');
const C = require('../common/config');
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');
const { loadFacts } = require('../common/facts');
const { seedQuery } = require('../common/textterms');
const S = require('./store');
const { LbGraph } = require('./lb');
const LS = require('./sweep');
const tq = require('./tq');

const OUT = path.join(P.RESULTS, 'ladybug');
const BENCH = path.join(P.storeFor('ladybug'), 'bench-' + P.FROZEN.slice(0, 12));
const now = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(3); };
const stats = (a) => ({ n: a.length, p50_ms: pct(a, 0.5), p95_ms: pct(a, 0.95), max_ms: +Math.max(...a).toFixed(3) });
const num = S.num;

// the relational bench's 30 seeds: every k-th production function/method/component, with its file
function benchSeeds(G) {
  const defs = G.nodes.filter((n) => ['function', 'method', 'component'].includes(n.kind) && !n.is_test && n.file);
  const k = Math.floor(defs.length / 30);
  return Array.from({ length: 30 }, (_, j) => defs[j * k]).map((n) => ({
    ids: [n.file, n.i].sort((a, b) => a - b),
    seed: { path: n.path, symbol: { name: n.sid.split('#')[1], kind: n.kind, start: n.ls, end: n.le } },
  }));
}

const cfg = (patch) => C.normalise({ ...LS.BASE, ...patch });
const B1 = LS.STAGE1.find((c) => c.name === 'budget=B1').traversal;
const PPR = { mode: 'ppr', restart: 0.3, cochange_w: 1 };
// [name, configuration, ppr implementation, number of seeds]
const CLASSES_Q = [
  ['k-hop 1 (recursive SHORTEST, both)', cfg({ traversal: { mode: 'khop', hops: 1 }, rank: { mode: 'bfs' } })],
  ['k-hop 3 (recursive SHORTEST, both)', cfg({ traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } })],
  ['k-hop 6 (recursive SHORTEST, both)', cfg({ traversal: { mode: 'khop', hops: 6 }, rank: { mode: 'bfs' } })],
  ['unbounded (recursive SHORTEST, both)', cfg({ traversal: { mode: 'khop', hops: null }, rank: { mode: 'bfs' } })],
  ['k-hop 3 dependents (recursive SHORTEST)', cfg({ direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } })],
  ['budget B1 (level-wise Cypher, automaton in app)', cfg({ traversal: B1, rank: { mode: 'bfs' } })],
  ['metapath stage-1 (level-wise Cypher, automaton in app)', cfg({ traversal: LS.METAPATH, rank: { mode: 'bfs' } })],
  ['metapath stage-1 (native typed path patterns)', cfg({ traversal: { ...LS.METAPATH, variant: 'pattern' }, rank: { mode: 'bfs' } })],
  ['hub cut indeg>10, 2 hops', cfg({ hub: { mode: 'indeg', k: 10 }, rank: { mode: 'bfs' } })],
  ['ranked: degree-normalised, 2 hops', cfg({ rank: { mode: 'degnorm' } })],
  ['ranked: PPR r0.30, 2 hops (base; iterations in app code over a cached adjacency)', cfg({})],
  ['ranked: PPR r0.30, unbounded (iterations in app code over a cached adjacency)', cfg({ traversal: { mode: 'khop', hops: null } })],
  ['ranked: PPR r0.30, 2 hops (every iteration as Cypher writes)', cfg({}), 'engine', 8],
  ['ranked: PPR native GDS_PPR, 2 hops', cfg({ rank: { ...PPR, variant: 'gds' } })],
  ['ranked: co-change, 2 hops', cfg({ rank: { mode: 'cochange' } })],
  ['ranked: text (BM25 Cypher over the term graph), 2 hops', cfg({ rank: { mode: 'text' } })],
  ['ranked: hybrid PPR+text, 2 hops', cfg({ rank: { mode: 'hybrid', parts: [PPR, { mode: 'text' }] } })],
  ['ranked: x_wsp (native WSHORTEST), 2 hops', cfg({ rank: { mode: 'x_wsp' } })],
  ['ranked: hybrid PPR+x_comm (stored Louvain), 2 hops', cfg({ rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_comm' }] } })],
  ['ranked: hybrid PPR+x_prank (stored page_rank), 2 hops', cfg({ rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_prank' }] } })],
  ['ranked: x_wsp with hub cut indeg>10, 2 hops', cfg({ hub: { mode: 'indeg', k: 10 }, rank: { mode: 'x_wsp' } })],
  ['traversal x_core k4 (k-core hub cut), 2 hops', cfg({ traversal: { mode: 'x_core', hops: 2, k: 4 }, rank: { mode: 'bfs' } })],
];

function openDir(dir, G, opts = {}) {
  const db = new lbug.Database(dir, 1024 * 1024 * 1024, true, false, 2 ** 32);
  const conn = new lbug.Connection(db);
  conn.querySync('CALL threads=1'); conn.querySync('CALL var_length_extend_max_depth=10000');
  const meta = JSON.parse(fs.readFileSync(dir + '.meta.json', 'utf8'));
  const st = { db, conn, dir, meta };
  const g = G ? new LbGraph(st, G, opts) : null;
  return { st, g, close() { if (g) { g.ps.clear(); g.cache.clear(); } conn.closeSync(); db.closeSync(); } };
}

function nameLookup(g, s) {
  const terms = seedQuery(s.seed);
  if (!terms.length) return [];
  const idf = `CASE WHEN ln((${g.nDocs} - t.df + 0.5) / (t.df + 0.5)) <= 0 THEN 0.000001 ELSE ln((${g.nDocs} - t.df + 0.5) / (t.df + 0.5)) END`;
  return g.q(`MATCH (n:N)-[h:HAS]->(t:T) WHERE t.term IN $q RETURN n.id AS v, sum(${idf} * ((h.tf * 2.2) / (h.tf + 1.2 * (0.25 + (0.75 * n.dl) / ${g.avgdl})))) AS s ORDER BY s DESC, v LIMIT 20`, { q: terms });
}

// cold: a fresh Database and Connection per sample (empty buffer pool; the OS file cache is warm),
// timed from the open through the first answer; warm: the same connection, 5 repetitions after one
// discarded run. Samples run in child processes of at most 6 opens each, because a closed Database
// keeps its native memory inside a live process (NOTES.md).
const ALL_CLASSES = [['name lookup (BM25 Cypher over the term graph, top 20)', null], ...CLASSES_Q];
function sampleChild(ci, a, b) {
  const G = loadFacts(P.FROZEN);
  const out = { cold: [], warm: [], sizes: [], qn: [], first: [], warm_uncached: [] };
  if (ci < 0) {
    const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
    for (const q of qs.slice(a, b)) {
      let t = now(); const h = openDir(BENCH, G); tq.answer(h.g, q); out.cold.push(now() - t);
      for (let k = 0; k < 6; k++) { t = now(); tq.answer(h.g, q); if (k) out.warm.push(now() - t); }
      h.close();
    }
  } else {
    const [, c, impl] = ALL_CLASSES[ci];
    const reps = impl === 'engine' ? 2 : 6;
    for (const s of benchSeeds(G).slice(a, b)) {
      let t = now(); const h = openDir(BENCH, G, { pprImpl: impl || 'app' });
      const q0 = h.g.stats.queries; const t1 = now();
      const r = c ? h.g.rank(s.ids, c, s.seed) : nameLookup(h.g, s);
      // cold = open + first answer; first = the first answer alone (application caches empty)
      out.first.push(now() - t1); out.cold.push(now() - t); out.sizes.push(r.length); out.qn.push(h.g.stats.queries - q0);
      for (let k = 0; k < reps; k++) { t = now(); if (c) h.g.rank(s.ids, c, s.seed); else nameLookup(h.g, s); if (k) out.warm.push(now() - t); }
      // warm, but with the application-code caches dropped before every call (PageRank transition CSR,
      // blocked-node sets): what a repeated call costs when nothing is held outside the engine
      for (let k = 0; k < reps; k++) { h.g.dropAppCache(); t = now(); if (c) h.g.rank(s.ids, c, s.seed); else nameLookup(h.g, s); if (k) out.warm_uncached.push(now() - t); }
      h.close();
    }
  }
  console.log(JSON.stringify(out));
}
function latency() {
  const res = {};
  const child = (ci, a, b) => JSON.parse(execFileSync(process.execPath, [__filename, 'sample', String(ci), String(a), String(b)], { maxBuffer: 64 << 20 }).toString().trim().split('\n').pop());
  const gather = (ci, n) => { const o = { cold: [], warm: [], sizes: [], qn: [], first: [], warm_uncached: [] }; for (let a = 0; a < n; a += 6) { const x = child(ci, a, Math.min(n, a + 6)); for (const k of Object.keys(o)) o[k].push(...(x[k] || [])); } return o; };
  res._note = 'cold = a fresh Database and Connection, timed through the first answer; first_call = that first answer alone on the open store (no application-code cache yet); warm = repeated calls on one connection, which for the PageRank classes (iterations in app, the default) reuse the transition CSR cached in application code per configuration, so warm PageRank latency is flattered; warm_uncached = repeated calls with the application-code caches (transition CSR, blocked-node sets) dropped before each call.';
  ALL_CLASSES.forEach(([name, , , nSeeds], ci) => {
    const o = gather(ci, nSeeds || 30);
    res[name] = { cold: stats(o.cold), first_call: o.first.length ? stats(o.first) : null, warm: stats(o.warm), warm_uncached: o.warm_uncached.length ? stats(o.warm_uncached) : null, result_size_p50: pct(o.sizes, 0.5), result_size_max: Math.max(...o.sizes), engine_queries_p50: pct(o.qn, 0.5) };
    process.stderr.write(name + ' ' + JSON.stringify(res[name].warm) + '\n');
  });
  const o = gather(-1, 20);
  res['TQ queries (20 tune targets)'] = { cold: stats(o.cold), warm: stats(o.warm) };
  return res;
}

// table row counts (LadybugDB has no per-table byte statistics; the database is one file)
function counts(h) {
  const run = (q) => S.getAll(h.st.conn.querySync(q));
  const out = { N: num(run('MATCH (n:N) RETURN count(*) AS c')[0].c), T: num(run('MATCH (n:T) RETURN count(*) AS c')[0].c) };
  for (const x of h.st.meta.types) {
    out['f_' + x.t] = num(run(`MATCH ()-[r:f_${x.t}]->() RETURN count(*) AS c`)[0].c);
    if (!x.sym) out['r_' + x.t] = num(run(`MATCH ()-[r:r_${x.t}]->() RETURN count(*) AS c`)[0].c);
  }
  for (const t of ['A', 'EV', 'HAS']) out[t] = num(run(`MATCH ()-[r:${t}]->() RETURN count(*) AS c`)[0].c);
  return out;
}

// One-file change: delete every node of one file (DETACH DELETE removes every edge touching them in
// every table), insert the nodes and edges again from the facts, then repair what depends on them:
// the term graph (HAS, T.df, N.dl), pi_<class> and transport of the changed nodes and their
// neighbours, and the global native priors (page_rank, k-core, Louvain), as the relational arm
// recomputes its global PageRank. The facts are the same, so the result must equal a fresh build.
function updateOneFile(G, dir, F) {
  const h = openDir(dir, null);
  const c = h.st.conn; const ps = new Map();
  const run = (q, p) => {
    if (!p) return S.getAll(c.querySync(q));
    if (!ps.has(q)) { const x = c.prepareSync(q); if (!x.isSuccess()) throw new Error(x.getErrorMessage() + '\n' + q); ps.set(q, x); }
    return S.getAll(c.executeSync(ps.get(q), p));
  };
  const T = {}; let t = now();
  const ids = G.nodes.filter((n) => n.path === F).map((n) => n.i);
  const idSet = new Set(ids);
  const edges = G.edges.filter((e) => idSet.has(e.s) || idSet.has(e.d));
  const nb = [...new Set([...ids, ...edges.map((e) => e.s), ...edges.map((e) => e.d)])];
  const termsBefore = run('MATCH (n:N)-[:HAS]->(t:T) WHERE n.id IN $I RETURN DISTINCT t.term AS t', { I: ids }).map((r) => r.t);
  run('MATCH (n:N) WHERE n.id IN $I DETACH DELETE n', { I: ids });
  T.delete_ms = now() - t; t = now();
  // batched: one UNWIND of literal rows per table (literal text, so integers and doubles keep their
  // column types: every DOUBLE is written with a decimal point)
  const nul = (x) => (x === undefined || x === '' ? null : x);
  const L = (v, dbl) => (v == null ? 'NULL' : typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" : dbl ? (Number.isInteger(v) ? v.toFixed(1) : String(v)) : String(v));
  const DBL = new Set(['w', 'cost']);
  const rowsOf = new Map();
  const add = (lab, s, d, props) => { if (!rowsOf.has(lab)) rowsOf.set(lab, []); rowsOf.get(lab).push({ s, d, ...props }); };
  const lit = (o) => '{' + Object.entries(o).map(([k, v]) => k + ': ' + L(v, DBL.has(k))).join(', ') + '}';
  const NCOL = ['id', 'sid', 'kind', 'path', 'name', 'ls', 'le', 'runtime', 'slice', 'is_test', 'file', 'tokens', 'text'];
  const nrows = ids.map((i) => { const n = G.nodes[i - 1]; return { id: n.i, sid: nul(n.sid), kind: nul(n.kind), path: nul(n.path), name: nul(n.name), ls: n.ls, le: n.le, runtime: nul(n.runtime), slice: nul(n.slice), is_test: n.is_test ? 1 : 0, file: n.file, tokens: n.tokens, text: nul(n.text) }; });
  if (nrows.length) run('UNWIND [' + nrows.map(lit).join(', ') + '] AS r CREATE (n:N {' + NCOL.map((k) => k + ': r.' + k).join(', ') + '})');
  const COST = (e) => S.edgeCost(e.cls, e.w);
  for (const e of edges) {
    const ty = S.typeOf(e.kind, e.cls); const base = { w: e.w, n: e.n, kid: e.k, cls: e.c };
    add('f_' + ty, e.s, e.d, { ...base, o: 0 });
    if (e.sym) add('f_' + ty, e.d, e.s, { ...base, o: 0 }); else add('r_' + ty, e.d, e.s, { ...base, o: 1 });
    add('A', e.s, e.d, { ...base, sym: e.kind === 'co_changed' ? 1 : 0, prim: 1, cost: COST(e) });
    if (e.kind === 'co_changed') add('A', e.d, e.s, { ...base, sym: 1, prim: 0, cost: COST(e) });
    for (const [p, l, op] of e.evs) add('EV', e.s, e.d, { kid: e.k, path: nul(p), line: l || 0, op: nul(op) });
  }
  for (const [lab, rows] of rowsOf) {
    const keys = Object.keys(rows[0]).filter((k) => k !== 's' && k !== 'd');
    run('UNWIND [' + rows.map(lit).join(', ') + '] AS r MATCH (a:N), (b:N) WHERE a.id = r.s AND b.id = r.d CREATE (a)-[:' + lab + ' {' + keys.map((k) => k + ': r.' + k).join(', ') + '}]->(b)');
  }
  T.insert_ms = now() - t; t = now();
  // term graph of the reinserted nodes (the build's tokenisation: split on single spaces, empty dropped)
  run("MATCH (n:N) WHERE n.id IN $I AND n.text IS NOT NULL AND n.text <> '' UNWIND string_split(n.text, ' ') AS t WITH DISTINCT t WHERE t <> '' MERGE (x:T {term: t}) ON CREATE SET x.df = 0", { I: ids });
  run("MATCH (n:N) WHERE n.id IN $I AND n.text IS NOT NULL AND n.text <> '' UNWIND string_split(n.text, ' ') AS t WITH n, t WHERE t <> '' WITH n, t, count(*) AS tf MATCH (x:T) WHERE x.term = t CREATE (n)-[:HAS {tf: tf}]->(x)", { I: ids });
  const termsNow = run('MATCH (n:N)-[:HAS]->(t:T) WHERE n.id IN $I RETURN DISTINCT t.term AS t', { I: ids }).map((r) => r.t);
  const terms = [...new Set([...termsBefore, ...termsNow])];
  run('MATCH (x:T) WHERE x.term IN $Q OPTIONAL MATCH (x)<-[h:HAS]-(:N) WITH x, count(h) AS k SET x.df = k', { Q: terms });
  run('MATCH (x:T) WHERE x.term IN $Q AND x.df = 0 DETACH DELETE x', { Q: terms });
  run('MATCH (n:N)-[h:HAS]->(:T) WHERE n.id IN $I WITH n, sum(h.tf) AS dl SET n.dl = dl', { I: ids });
  T.term_graph_ms = now() - t; t = now();
  // production in-degree and transport of the changed nodes and their neighbours
  const NONSTRUCT = CLASSES.map((x, i) => i).filter((i) => !STRUCTURAL.has(CLASSES[i]));
  run(`MATCH (v:N) WHERE v.id IN $B SET ${NONSTRUCT.map((i) => 'v.pi_' + i + ' = 0').join(', ')}, v.transport = false`, { B: nb });
  for (const ci of NONSTRUCT) {
    const lab = h.st.meta.types.filter((x) => x.cls === ci).map((x) => 'f_' + x.t);
    if (lab.length) run(`MATCH (u:N)-[r:${lab.join('|')}]->(v:N) WHERE v.id IN $B AND u.is_test = 0 WITH v, count(r) AS k SET v.pi_${ci} = k`, { B: nb });
  }
  run("MATCH (n:N) WHERE n.id IN $B AND n.kind IN ['runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref'] SET n.transport = true", { B: nb });
  const callers = h.st.meta.types.filter((x) => ['calls', 'depends_injects', 'passes_callable'].includes(x.kind)).map((x) => 'f_' + x.t);
  if (callers.length) run(`MATCH (x:N)-[:${callers.join('|')}]->(n:N) WHERE n.id IN $B AND n.kind IN ['function', 'method', 'class'] AND n.is_test = 0 AND x.is_test = 0 AND x.slice IS NOT NULL WITH n, count(DISTINCT coalesce(x.runtime, 'null') + '/' + x.slice) AS k WHERE k >= 3 SET n.transport = true`, { B: nb });
  T.degree_transport_ms = now() - t; t = now();
  T.total_without_global_priors_ms = T.delete_ms + T.insert_ms + T.term_graph_ms + T.degree_transport_ms;
  // the same stored priors as a build (store.js nativePriors): page_rank over the projection with both
  // co-change orientations, k-core, and the community grouping of the canonical graph's prior file.
  // The facts here are unchanged, so the canonical hash is the store's; a real one-file change has a
  // new hash, and its first build or update writes a new prior file from its own Louvain run.
  T.comm = S.nativePriors(run, G, h.st.meta.canon_hash);
  T.global_priors_ms = now() - t;
  run('CHECKPOINT');
  T.nodes_replaced = ids.length; T.edges_replaced = edges.length; T.neighbourhood = nb.length; T.terms_touched = terms.length;
  ps.clear(); h.close();
  return T;
}

// table-by-table equality of two stores (prank to 1e-12; Louvain community ids compared as partitions)
function dumpStore(dir) {
  const h = openDir(dir, null); const run = (q) => S.getAll(h.st.conn.querySync(q));
  const out = {};
  const nodes = run('MATCH (n:N) RETURN n.* ORDER BY n.id');
  // prank kept apart: the engine's page_rank counts deleted node slots (see sameStore)
  out.prank = nodes.map((o) => o['n.prank']);
  out.comm = nodes.map((o) => String(o['n.comm']));
  out.N = nodes.map((o) => {
    const x = { ...o }; delete x['n.prank']; delete x['n.comm'];
    return JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
  });
  const sorted = (rows) => rows.map((o) => JSON.stringify(o, (k, v) => (typeof v === 'bigint' ? Number(v) : v))).sort();
  out.T = sorted(run('MATCH (t:T) RETURN t.term AS t, t.df AS d'));
  out.HAS = sorted(run('MATCH (n:N)-[h:HAS]->(t:T) RETURN n.id AS n, t.term AS t, h.tf AS f'));
  out.EV = sorted(run('MATCH (a:N)-[r:EV]->(b:N) RETURN a.id AS a, b.id AS b, r.kid AS k, r.path AS p, r.line AS l, r.op AS o'));
  out.A = sorted(run('MATCH (a:N)-[r:A]->(b:N) RETURN a.id AS a, b.id AS b, r.w AS w, r.n AS n, r.kid AS k, r.cls AS c, r.sym AS s, r.prim AS p, round(r.cost, 9) AS cost'));
  for (const x of h.st.meta.types) for (const pre of x.sym ? ['f_'] : ['f_', 'r_']) out[pre + x.t] = sorted(run(`MATCH (a:N)-[r:${pre}${x.t}]->(b:N) RETURN a.id AS a, b.id AS b, r.w AS w, r.n AS n, r.kid AS k, r.cls AS c, r.o AS o`));
  h.close();
  return out;
}
function ari(a, b) {
  const n = a.length; const ct = new Map(); const ra = new Map(); const rb = new Map();
  for (let i = 0; i < n; i++) { const k = a[i] + '|' + b[i]; ct.set(k, (ct.get(k) || 0) + 1); ra.set(a[i], (ra.get(a[i]) || 0) + 1); rb.set(b[i], (rb.get(b[i]) || 0) + 1); }
  const c2 = (x) => (x * (x - 1)) / 2; const sum = (m) => [...m.values()].reduce((x, v) => x + c2(v), 0);
  const s = sum(ct); const sa = sum(ra); const sb = sum(rb); const e = (sa * sb) / c2(n); const m = (sa + sb) / 2;
  return m === e ? 1 : (s - e) / (m - e);
}
function sameStore(a, b) {
  const A = dumpStore(a); const B = dumpStore(b); const r = {};
  const pa = A.prank; const pb = B.prank; delete A.prank; delete B.prank;
  const ca = A.comm; const cb = B.comm; delete A.comm; delete B.comm;
  const louvain = { communities_fresh: new Set(ca).size, communities_updated: new Set(cb).size, adjusted_rand_index: +ari(ca, cb).toFixed(4) };
  let maxAbs = 0; let ratioMin = Infinity; let ratioMax = 0;
  for (let i = 0; i < pa.length; i++) { maxAbs = Math.max(maxAbs, Math.abs(pa[i] - pb[i])); if (pa[i] > 0) { const q = pb[i] / pa[i]; ratioMin = Math.min(ratioMin, q); ratioMax = Math.max(ratioMax, q); } }
  for (const k of Object.keys(A)) r[k] = !!B[k] && A[k].length === B[k].length && A[k].every((v, i) => v === B[k][i]);
  const bad = Object.entries(r).filter(([, v]) => !v).map(([k]) => k);
  const ex = {}; for (const k of bad.slice(0, 3)) { const i = A[k].findIndex((v, j) => v !== (B[k] || [])[j]); ex[k] = { fresh: A[k][i], updated: (B[k] || [])[i] }; }
  const prank = { equal_to_1e12: maxAbs < 1e-12, max_abs_diff: maxAbs, ratio_updated_to_fresh_min: ratioMin, ratio_updated_to_fresh_max: ratioMax };
  return { tables_compared: Object.keys(r).length, all_equal_except_native_priors: bad.length === 0, prank, louvain, unequal: bad, first_differences: ex };
}

// EXPLAIN of every distinct engine query issued by one rank of the hot classes (first bench seed)
function plans(G) {
  const h = openDir(BENCH, G); const s = benchSeeds(G)[0];
  const texts = new Map(); const orig = h.g.q.bind(h.g);
  h.g.q = (text, params) => { if (!texts.has(text)) texts.set(text, params); return orig(text, params); };
  const out = [];
  for (const [name, c] of CLASSES_Q.filter((x) => !x[2])) {
    texts.clear(); h.g.cache.clear(); h.g.rank(s.ids, c, s.seed);
    out.push('######## ' + name);
    for (const [text, params] of texts) {
      let inl = text; if (params) for (const [k, v] of Object.entries(params)) inl = inl.split('$' + k).join(JSON.stringify(v).replace(/"/g, "'"));
      let p; try { p = S.getAll(h.st.conn.querySync('EXPLAIN ' + inl)).map((r) => Object.values(r).join(' ')).join('\n'); } catch (e) { p = 'EXPLAIN failed: ' + String(e.message).slice(0, 200); }
      out.push('### ' + text.slice(0, 400) + '\n' + p);
    }
  }
  h.g.q = orig; h.close();
  return out.join('\n\n');
}

// lines of query code per algorithm: Cypher lines (lines of string literals holding a Cypher clause)
// and application lines (the rest of the method), from the source of the methods that implement it
function loc() {
  const src = fs.readFileSync(path.join(__dirname, 'lb.js'), 'utf8');
  const method = (name) => {
    const i = src.indexOf('\n  ' + name + '(');
    if (i < 0) throw new Error('no method ' + name);
    let j = src.indexOf('{', i); let d = 0; let k = j;
    for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } }
    return src.slice(i, k + 1);
  };
  const branch = (mode) => {
    const body = method('scoreFor'); const a = body.indexOf(`if (rk.mode === '${mode}'`);
    const b = body.indexOf('\n    if (rk.mode', a + 5); return body.slice(a, b < 0 ? body.length : b);
  };
  const count = (code) => {
    const lines = code.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('//'));
    const cy = lines.filter((x) => /(['`"])[^'`"]*\b(MATCH|CALL|RETURN|SET|UNWIND|WITH|CREATE|DELETE)\b/.test(x) || /^(MATCH|OPTIONAL MATCH|WITH|RETURN|UNWIND)\b/.test(x)).length;
    return { cypher_lines: cy, app_lines: lines.length - cy };
  };
  const add = (...cs) => cs.reduce((a, c) => ({ cypher_lines: a.cypher_lines + c.cypher_lines, app_lines: a.app_lines + c.app_lines }), { cypher_lines: 0, app_lines: 0 });
  const M = (...ns) => add(...ns.map((n) => count(method(n))));
  const pat = fs.readFileSync(path.join(__dirname, 'pattern.js'), 'utf8');
  const out = {
    'k-hop (recursive SHORTEST + arcs, DAG, blocked ends)': M('khop', 'arcsOf'),
    'per-edge-class budgets and metapath (level-wise Cypher, automaton in app)': M('stateBfs', 'arcsOfAny'),
    'metapath as native typed path patterns (pattern.js)': count(pat.slice(pat.indexOf('function labelsFor'))),
    'hub cuts (indeg, transport, x_core predicates)': M('blockedExpr', 'blockedSet'),
    'reach DAG, parents, explanations': M('rank', 'explainer'),
    'rank: degree-normalised': add(count(branch('degnorm')), M('outDegrees')),
    'rank: personalised PageRank (iterations in app)': add(count(branch('ppr')), M('transitions', 'pprApp')),
    'rank: personalised PageRank (iterations as Cypher writes)': M('pprEngine'),
    'rank: native GDS_PPR': M('pprGds'),
    'rank: co-change weight': count(branch('cochange')),
    'rank: text (BM25 over the term graph)': count(branch('text')),
    'rank: hybrid (RRF)': count(branch('hybrid')),
    'rank: x_wsp (native WSHORTEST)': add(count(branch('x_wsp')), M('wsp')),
    'rank: x_comm / x_prank (stored native priors)': count(branch('x_comm')),
  };
  const tqo = {}; for (const [k, f] of Object.entries(tq.Q)) tqo[k] = count(f.toString());
  const lines = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').filter((x) => x.trim() && !x.trim().startsWith('//')).length;
  return { per_algorithm: out, tq_per_kind: tqo, store_js_lines: lines('store.js'), lb_js_lines: lines('lb.js'), pattern_js_lines: lines('pattern.js'), tq_js_lines: lines('tq.js'), reference_arm_lines_ref_js: fs.readFileSync(path.join(__dirname, '..', 'reference', 'ref.js'), 'utf8').split('\n').filter((x) => x.trim() && !x.trim().startsWith('//')).length };
}

function memChild() {
  const r0 = process.memoryUsage().rss;
  const h = openDir(BENCH, null); const r1 = process.memoryUsage().rss;
  const G = loadFacts(P.FROZEN); const g1 = process.memoryUsage().rss;
  const g = new LbGraph(h.st, G);
  for (const s of benchSeeds(G)) for (const [, c, impl] of CLASSES_Q) if (!impl) g.rank(s.ids, c, s.seed);
  const r2 = process.memoryUsage().rss;
  console.log(JSON.stringify({ rss_before_open: r0, rss_after_open: r1, rss_after_facts_loaded: g1, rss_after_all_query_classes: r2, buffer_pool_bytes: 1024 * 1024 * 1024 }));
  g.ps.clear(); h.close();
}

// update for a one-file change on a copy of a freshly built store, checked against that fresh build
function updateCheck(G) {
  const F = 'backend/app/features/jobs/service.py';
  const copy = BENCH + '-upd';
  const clean = () => { for (const f of fs.readdirSync(path.dirname(BENCH))) if (f.startsWith(path.basename(copy))) fs.rmSync(path.join(path.dirname(BENCH), f), { recursive: true, force: true }); };
  clean();
  fs.copyFileSync(BENCH, copy); fs.copyFileSync(BENCH + '.meta.json', copy + '.meta.json');
  if (fs.existsSync(BENCH + '.wal')) fs.copyFileSync(BENCH + '.wal', copy + '.wal');
  const r = { file: F, ...updateOneFile(G, copy, F), extractor_full_rebuild_s_note: 'facts extractor has no incremental mode: about 3.8-4.5 s per commit (facts/NOTES.md)' };
  r.equal_to_fresh_build = sameStore(BENCH, copy);
  clean();
  return r;
}

// Every step that opens a store runs in its own child process: a closed Database keeps its file lock
// and its native memory inside a live process, so the orchestrating process never opens one.
function sub(...args) { return JSON.parse(execFileSync(process.execPath, [__filename, ...args.map(String)], { maxBuffer: 64 << 20 }).toString().trim().split('\n').pop()); }
function main() {
  const mode = process.argv[2];
  if (mode === 'mem') return memChild();
  if (mode === 'sample') return sampleChild(Number(process.argv[3]), Number(process.argv[4]), Number(process.argv[5]));
  if (mode === 'build') {
    let t = now(); const G = loadFacts(P.FROZEN); const tl = now() - t;
    t = now(); const meta = S.build(G, BENCH); const tb = now() - t;
    console.log(JSON.stringify({ facts_load_ms: tl, build_ms: tb, ...meta.build, bytes: meta.bytes })); return;
  }
  if (mode === 'counts') { const h = openDir(BENCH, null); console.log(JSON.stringify({ database_bytes: S.dirBytes(BENCH), row_counts: counts(h) })); h.close(); return; }
  if (mode === 'update') { const G = loadFacts(P.FROZEN); console.log(JSON.stringify(updateCheck(G))); return; }
  if (mode === 'plans') { const G = loadFacts(P.FROZEN); fs.writeFileSync(path.join(OUT, 'query_plans.txt'), plans(G) + '\n'); console.log('{}'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const res = { commit: P.FROZEN, engine: 'LadybugDB ' + JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('@ladybugdb/core')), 'package.json'), 'utf8')).version, node: process.version, threads_per_query: 1, buffer_pool_bytes: 1024 * 1024 * 1024 };
  res.load = [0, 1, 2].map(() => sub('build'));
  const G = loadFacts(P.FROZEN);
  res.graph = { nodes: G.nodes.length, edges_unique: G.edges.length, edge_evidence_rows: G.edges.reduce((x, e) => x + e.n, 0), edge_types: JSON.parse(fs.readFileSync(BENCH + '.meta.json', 'utf8')).types.length };
  res.disk = sub('counts');
  res.update_one_file = sub('update');
  res.memory = sub('mem');
  res.latency = latency();
  sub('plans');
  res.lines_of_query_code = loc();
  fs.writeFileSync(path.join(OUT, 'engine.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ load_ms: res.load.map((l) => Math.round(l.build_ms)), bytes: res.disk.database_bytes, memory: res.memory, update: res.update_one_file }, null, 1));
}

main();
