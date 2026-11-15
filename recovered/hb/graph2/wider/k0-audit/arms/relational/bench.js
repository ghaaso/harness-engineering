'use strict';
// Engine measures for the relational arm at the frozen commit (protocol section 7, engine measures):
// load time, bytes on disk (per table), memory, p50/p95 latency cold and warm per query class, update
// time for a one-file change, EXPLAIN QUERY PLAN for the hot queries, lines of query code per algorithm.
//   node bench.js            -> results/engine/relational.json, results/engine/query_plans.txt
//   node bench.js mem        -> (child) prints RSS before/after open and after the query classes
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const P = require('../common/paths');
const C = require('../common/config');
const RS = require('./sweep');
const { loadFacts } = require('../common/facts');
const { buildDb, openDb, globalPageRank } = require('./db');
const { RelGraph } = require('./rel');
const { Q, forDir, RANK_ORDER } = require('./queries');
const tq = require('./tq');
const { seedQuery } = require('../common/textterms');

const OUT = path.join(P.RESULTS, 'engine');
const BENCH_DB = path.join(P.storeFor('relational'), 'bench-' + P.FROZEN.slice(0, 12) + '.sqlite');
const now = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(3); };
const stats = (a) => ({ n: a.length, p50_ms: pct(a, 0.5), p95_ms: pct(a, 0.95), max_ms: +Math.max(...a).toFixed(3) });

// 30 benchmark seeds: every k-th production function/method/component of the frozen graph (by id),
// each with its file, as a task seed would be.
function benchSeeds(G) {
  const defs = G.nodes.filter((n) => ['function', 'method', 'component'].includes(n.kind) && !n.is_test && n.file);
  const k = Math.floor(defs.length / 30);
  return Array.from({ length: 30 }, (_, j) => defs[j * k]).map((n) => ({
    ids: [n.file, n.i].sort((a, b) => a - b),
    seed: { path: n.path, symbol: { name: n.sid.split('#')[1], kind: n.kind, start: n.ls, end: n.le } },
  }));
}

const cfg = (patch) => C.normalise({ ...RS.BASE, ...patch });
const CLASSES_Q = {
  'k-hop 1 (CTE, both)': cfg({ traversal: { mode: 'khop', hops: 1 }, rank: { mode: 'bfs' } }),
  'k-hop 3 (CTE, both)': cfg({ traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }),
  'k-hop 6 (CTE, both)': cfg({ traversal: { mode: 'khop', hops: 6 }, rank: { mode: 'bfs' } }),
  'unbounded (level-wise, both)': cfg({ traversal: { mode: 'khop', hops: null }, rank: { mode: 'bfs' } }),
  'k-hop 3 dependents (closure table)': cfg({ direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }),
  'k-hop 3 dependents (recursive CTE)': cfg({ direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' }, _noClosure: true }),
  'budget B1 (state machine CTE)': cfg({ traversal: RS.STAGE1.find((c) => c.name === 'budget=B1').traversal, rank: { mode: 'bfs' } }),
  'hub cut indeg>10, 2 hops': cfg({ hub: { mode: 'indeg', k: 10 }, rank: { mode: 'bfs' } }),
  'ranked: degree-normalised, 2 hops': cfg({ rank: { mode: 'degnorm' } }),
  'ranked: PPR r0.30, 2 hops (base)': cfg({}),
  'ranked: PPR r0.30, unbounded': cfg({ traversal: { mode: 'khop', hops: null } }),
  'ranked: co-change, 2 hops': cfg({ rank: { mode: 'cochange' } }),
  'ranked: text (FTS5 BM25), 2 hops': cfg({ rank: { mode: 'text' } }),
  'ranked: hybrid PPR+text, 2 hops': cfg({ rank: { mode: 'hybrid', parts: [{ mode: 'ppr', restart: 0.3, cochange_w: 1 }, { mode: 'text' }] } }),
};

function runClass(r, name, c, s) {
  const noClosure = c._noClosure; const cc = { ...c }; delete cc._noClosure;
  r.useClosure = !noClosure;
  return r.rank(s.ids, cc, s.seed);
}

function latency(G) {
  const seeds = benchSeeds(G); const res = {};
  const nameLookup = (db, s) => db.prepare('SELECT rowid, bm25(fts) s FROM fts WHERE fts MATCH ? ORDER BY s LIMIT 20')
    .all(seedQuery(s.seed).map((t) => '"' + t + '"').join(' OR '));
  // cold: a fresh connection per sample (empty SQLite page cache; the OS file cache is warm)
  // warm: the same connection, 5 repetitions after one discarded run
  const classes = [['name lookup (FTS5, top 20)', null], ...Object.entries(CLASSES_Q)];
  for (const [name, c] of classes) {
    const cold = []; const warm = []; const sizes = [];
    for (const s of seeds) {
      let t = now(); const db = openDb(BENCH_DB); const r = new RelGraph(db);
      const out = c ? runClass(r, name, c, s) : nameLookup(db, s);
      cold.push(now() - t); sizes.push(out.length);
      for (let k = 0; k < 6; k++) { t = now(); if (c) runClass(r, name, c, s); else nameLookup(db, s); if (k) warm.push(now() - t); }
      db.close();
    }
    res[name] = { cold: stats(cold), warm: stats(warm), result_size_p50: pct(sizes, 0.5), result_size_max: Math.max(...sizes) };
  }
  // TQ metapath queries (the 20 tune targets)
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
  const cold = []; const warm = [];
  for (const q of qs) {
    const tg = tq.target(q);
    let t = now(); const db = openDb(BENCH_DB); tq.answer(db, q, tg); cold.push(now() - t);
    for (let k = 0; k < 6; k++) { t = now(); tq.answer(db, q, tg); if (k) warm.push(now() - t); }
    db.close();
  }
  res['TQ metapath queries (20 tune targets)'] = { cold: stats(cold), warm: stats(warm) };
  return res;
}

function sizes(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const rows = db.prepare('SELECT name, SUM(pgsize) AS bytes, COUNT(*) AS pages FROM dbstat GROUP BY name ORDER BY bytes DESC').all();
  const counts = {};
  for (const t of ['node', 'edge', 'edge_ev', 'cochange', 'deg', 'closure', 'fts']) counts[t] = db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
  db.close();
  return { file_bytes: fs.statSync(file).size, by_object: rows.map((r) => ({ name: r.name, bytes: r.bytes })), row_counts: counts };
}

// One-file change: replace every node of one file and every edge touching them, then repair the
// derived tables for the affected nodes (deg, prod_in, transport, closure rows of affected sources,
// FTS rows). The facts are the same, so the result must equal a fresh build (checked).
function updateOneFile(G, file, F) {
  const db = openDb(file);
  const T = {}; let t = now();
  const ids = G.nodes.filter((n) => n.path === F).map((n) => n.i);
  const idSet = new Set(ids);
  const edges = G.edges.filter((e) => idSet.has(e.s) || idSet.has(e.d));
  db.exec('BEGIN');
  db.exec('CREATE TEMP TABLE chg(id INTEGER PRIMARY KEY)');
  const ic = db.prepare('INSERT INTO chg VALUES (?)'); for (const i of ids) ic.run(i);
  // sources whose bounded closure can pass through a changed node (before the change)
  db.exec(`CREATE TEMP TABLE aff AS SELECT DISTINCT src AS id FROM closure WHERE dst IN (SELECT id FROM chg) UNION SELECT id FROM chg`);
  db.exec(`CREATE TEMP TABLE nb AS SELECT DISTINCT dst AS id FROM edge WHERE src IN (SELECT id FROM chg) UNION SELECT DISTINCT src FROM edge WHERE dst IN (SELECT id FROM chg) UNION SELECT id FROM chg`);
  db.exec(`DELETE FROM edge_ev WHERE src IN (SELECT id FROM chg) OR dst IN (SELECT id FROM chg);
    DELETE FROM edge WHERE src IN (SELECT id FROM chg); DELETE FROM edge WHERE dst IN (SELECT id FROM chg);
    DELETE FROM cochange WHERE a IN (SELECT id FROM chg) OR b IN (SELECT id FROM chg);
    DELETE FROM fts WHERE rowid IN (SELECT id FROM chg); DELETE FROM node WHERE id IN (SELECT id FROM chg);`);
  T.delete_ms = now() - t; t = now();
  const kid = new Map(db.prepare('SELECT kid, name FROM nkind').all().map((r) => [r.name, r.kid]));
  const iN = db.prepare('INSERT INTO node(id,sid,kid,path,name,ls,le,signature,runtime,slice,is_test,tokens,file_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const iF = db.prepare('INSERT INTO fts(rowid, body) VALUES (?, ?)');
  for (const i of ids) { const n = G.nodes[i - 1]; iN.run(n.i, n.sid, kid.get(n.kind), n.path, n.name, n.ls, n.le, n.signature, n.runtime, n.slice, n.is_test, n.tokens, n.file); iF.run(n.i, n.text); }
  const iE = db.prepare('INSERT INTO edge VALUES (?,?,?,?,?,?,?)'); const iV = db.prepare('INSERT INTO edge_ev VALUES (?,?,?,?,?,?)');
  const iC = db.prepare('INSERT INTO cochange VALUES (?,?,?,?,?)');
  for (const e of edges) { iE.run(e.s, e.k, e.d, e.c, e.w, e.n, e.sym); if (e.sym) iE.run(e.d, e.k, e.s, e.c, e.w, e.n, 1); for (const [p, l, op] of e.evs) iV.run(e.s, e.k, e.d, p, l, op); if (e.kind === 'co_changed') { iC.run(e.s, e.d, e.support, e.w, e.recency); iC.run(e.d, e.s, e.support, e.w, e.recency); } }
  T.insert_ms = now() - t; t = now();
  db.exec(`DELETE FROM deg WHERE node IN (SELECT id FROM nb);
    INSERT INTO deg SELECT node, cid, SUM(o), SUM(i), SUM(p) FROM (
      SELECT src AS node, cid, 1 AS o, 0 AS i, 0 AS p FROM edge WHERE src IN (SELECT id FROM nb)
      UNION ALL SELECT e.dst, e.cid, 0, 1, 1 - n.is_test FROM edge e JOIN node n ON n.id = e.src WHERE e.dst IN (SELECT id FROM nb)
    ) GROUP BY node, cid;
    UPDATE node SET prod_in = COALESCE((SELECT SUM(d.prod_in) FROM deg d JOIN eclass c ON c.cid = d.cid WHERE d.node = node.id AND c.structural = 0), 0) WHERE id IN (SELECT id FROM nb);`);
  db.exec(`UPDATE node SET transport = CASE WHEN
      kid IN (SELECT kid FROM nkind WHERE name IN ('runtime','slice','invariant_group','ambiguous_ref','missing_ref'))
   OR (kid IN (SELECT kid FROM nkind WHERE name IN ('function','method','class')) AND is_test = 0 AND
      (SELECT COUNT(DISTINCT COALESCE(x.runtime, 'null') || '/' || x.slice) FROM edge e JOIN node x ON x.id = e.src
        WHERE e.dst = node.id AND e.ekid IN (SELECT ekid FROM ekind WHERE name IN ('calls','depends_injects','passes_callable'))
          AND x.is_test = 0 AND x.slice IS NOT NULL) >= 3) THEN 1 ELSE 0 END WHERE id IN (SELECT id FROM nb)`);
  T.degree_transport_ms = now() - t; t = now();
  // closure rows of affected sources (old reach set) plus sources that now reach a changed node
  db.exec('INSERT OR IGNORE INTO aff SELECT DISTINCT src FROM edge WHERE dst IN (SELECT id FROM chg)');
  const mask = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_mask'").get().v);
  const K = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_k'").get().v);
  const minc = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_minc'").get().v);
  // a source within K-1 hops upstream of a changed node may now reach it: widen by the reverse closure
  db.exec(`INSERT INTO aff SELECT DISTINCT c.src FROM closure c WHERE c.dst IN (SELECT id FROM aff) AND c.dist <= ${K - 1} AND c.src NOT IN (SELECT id FROM aff)`);
  db.exec('DELETE FROM closure WHERE src IN (SELECT id FROM aff)');
  db.prepare(`INSERT INTO closure
    WITH RECURSIVE c(src, dst, d) AS (
      SELECT id, id, 0 FROM aff
      UNION
      SELECT c.src, e.dst, c.d + 1 FROM c JOIN edge e ON e.src = c.dst WHERE c.d < $K AND ((1 << e.cid) & $mask) != 0 AND e.w >= $minc
    ) SELECT src, dst, MIN(d) FROM c WHERE src <> dst GROUP BY src, dst`).run({ K, mask, minc });
  T.closure_ms = now() - t; T.affected_closure_sources = db.prepare('SELECT COUNT(*) n FROM aff').get().n;
  db.exec('COMMIT');
  t = now(); db.exec('ANALYZE'); T.analyze_ms = now() - t;
  t = now(); globalPageRank(db); T.global_pagerank_ms = now() - t;
  T.total_without_pagerank_ms = T.delete_ms + T.insert_ms + T.degree_transport_ms + T.closure_ms;
  T.nodes_replaced = ids.length; T.edges_replaced = edges.length;
  db.close();
  return T;
}

function sameStore(a, b) {
  const q = ['SELECT * FROM node ORDER BY id', 'SELECT * FROM edge ORDER BY src, ekid, dst', 'SELECT * FROM deg ORDER BY node, cid',
    'SELECT * FROM closure ORDER BY src, dst', 'SELECT * FROM cochange ORDER BY a, b', 'SELECT rowid, body FROM fts ORDER BY rowid'];
  const A = new DatabaseSync(a, { readOnly: true }); const B = new DatabaseSync(b, { readOnly: true });
  const r = {};
  for (const s of q) {
    const x = A.prepare(s).all().map((o) => { if ('pagerank' in o) o.pagerank = Math.round(o.pagerank * 1e12); return JSON.stringify(o); });
    const y = B.prepare(s).all().map((o) => { if ('pagerank' in o) o.pagerank = Math.round(o.pagerank * 1e12); return JSON.stringify(o); });
    r[s.match(/FROM (\w+)/)[1]] = x.length === y.length && x.every((v, i) => v === y[i]);
  }
  A.close(); B.close(); return r;
}

function plans(db) {
  const out = []; let fullScans = [];
  const show = (label, sql, params = {}) => {
    const rows = db.prepare('EXPLAIN QUERY PLAN ' + sql).all(params);
    out.push('### ' + label + '\n' + rows.map((r) => '  '.repeat(Math.max(0, depth(rows, r))) + r.detail).join('\n'));
    // a full scan = SCAN of a base table (by name or alias) without an index search; scans of per-query
    // temp tables (seeds, hop, cand, dag, CTE queues) are the query's own working set
    for (const r of rows) {
      const m = r.detail.match(/^SCAN (\w+)/);
      if (m && baseAlias(sql, m[1])) fullScans.push(label + ': ' + r.detail);
    }
  };
  function baseAlias(sql, a) {
    if (['edge', 'node', 'deg', 'closure', 'cochange', 'edge_ev'].includes(a)) return true;
    return new RegExp('\\b(edge|node|deg|closure|cochange|edge_ev)\\s+(AS\\s+)?' + a + '\\b').test(sql);
  }
  function depth(rows, r) { let d = 0; let p = r.parent; const by = new Map(rows.map((x) => [x.id, x])); while (p && by.has(p)) { d++; p = by.get(p).parent; } return d; }
  // populate the per-connection caches (hub sets, transitions) so their statements can be explained
  const r = new RelGraph(db);
  const G0 = loadFacts(P.FROZEN); const s0 = benchSeeds(G0)[0];
  for (const c of [cfg({}), cfg({ hub: { mode: 'indeg', k: 10 } }), cfg({ hub: { mode: 'transport' } })]) r.rank(s0.ids, c, s0.seed);
  const ix = [...r.cache.entries()];
  const hc = ix.find(([k]) => k.startsWith('hub|indeg'))[1];
  const trn = ix.find(([k]) => k.startsWith('tr|both') && k.endsWith('|nohub'))[1];
  const names = { ...trn, GB: hc, HC: hc };
  const hot = {
    'k-hop CTE (both)': forDir(Q.khop_cte, 'both'), 'k-hop level step (both)': forDir(Q.khop_level, 'both'),
    'closure lookup (dependencies)': Q.khop_closure_fwd, 'closure lookup (dependents)': Q.khop_closure_rev,
    'budget state CTE (both)': forDir(Q.budget_cte, 'both'), 'reach DAG (khop, both)': forDir(Q.dag_khop, 'both'),
    'reach DAG (budget, both)': forDir(Q.dag_budget, 'both'), 'parents': Q.par, 'candidates': Q.cand,
    'hub set build (per configuration, cached)': r.fill(Q.hub_indeg_build, { HC: 'hcx' }).split(';').map((x) => x.trim()).filter(Boolean)[1].replace('hcx', hc), 'hub cut apply (per query)': r.fill(Q.hub_apply, names), 'hub cut (transport) source': Q.hub_transport,
    'degnorm out-degree': forDir(Q.degnorm_od, 'both'), 'degnorm level': Q.degnorm_level,
    'PPR transitions build (per configuration, cached; global by nature)': forDir(r.fill(Q.ppr_trans_build, { TRC: 'trcx', TRUC: 'trucx', GB: 'nohub' }), 'both').split(';').map((x) => x.trim()).filter((x) => x.startsWith('INSERT INTO trcx'))[0].replace('trcx', trn.TRC),
    'PPR seed transitions (per query)': forDir(r.fill(Q.ppr_trans_seeds, names), 'both').split(';').map((x) => x.trim()).filter(Boolean)[1],
    'PPR step': r.fill(Q.ppr_step, names).split(';').map((x) => x.trim()).filter(Boolean)[1], 'PPR dangling mass': r.fill(Q.ppr_dangling, names),
    'co-change score': Q.cochange_score.split(';').map((s) => s.trim()).filter(Boolean)[1],
    'text score (FTS5)': Q.text_score.split(';').map((s) => s.trim()).filter(Boolean)[1],
    'final ordering (PPR)': Q.rank.replace('{SCORE}', RANK_ORDER.ppr.score).replace('{ORDER}', RANK_ORDER.ppr.order),
  };
  for (const [k, v] of Object.entries(hot)) show(k, v);
  for (const k of Object.keys(tq.SQL)) show('TQ ' + k, tq.sqlWith(db, tq.SQL[k]));
  return { text: out.join('\n\n'), fullScans };
}

function loc() {
  const sqlLines = (s) => s.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('--')).length;
  const groups = {
    'k-hop, recursive CTE (+ DAG, parents, candidates)': ['khop_cte', 'dag_khop', 'par', 'cand', 'parents'],
    'k-hop, level-wise (unbounded)': ['khop_level_seed', 'khop_level'],
    'k-hop, closure table lookup': ['khop_closure_fwd', 'khop_closure_rev'],
    'per-edge-class budgets (metapath state machine)': ['budget_cte', 'budget_hop', 'dag_budget'],
    'hub cuts (in-degree, transport)': ['hub_indeg_build', 'hub_apply', 'hub_transport'],
    'rank: traversal order': ['rank'],
    'rank: degree-normalised': ['degnorm_init', 'degnorm_od', 'degnorm_level', 'degnorm_score'],
    'rank: personalised PageRank': ['ppr_trans_build', 'ppr_trans_seeds', 'ppr_init', 'ppr_dangling', 'ppr_step', 'ppr_restart', 'ppr_swap', 'ppr_score'],
    'rank: co-change weight': ['cochange_score'],
    'rank: text match (FTS5 BM25)': ['text_score'],
    'rank: hybrid (RRF)': ['hybrid_add', 'hybrid_score'],
  };
  const out = {};
  for (const [g, ks] of Object.entries(groups)) out[g] = ks.reduce((a, k) => a + sqlLines(Q[k]), 0);
  out['rank: ordering keys (RANK_ORDER, shared)'] = 8;
  const tqo = {}; for (const [k, v] of Object.entries(tq.SQL)) tqo[k] = sqlLines(v);
  const relApp = fs.readFileSync(path.join(__dirname, 'rel.js'), 'utf8').split('\n').filter((x) => x.trim() && !x.trim().startsWith('//')).length;
  const refAll = fs.readFileSync(path.join(__dirname, '..', 'reference', 'ref.js'), 'utf8').split('\n').filter((x) => x.trim() && !x.trim().startsWith('//')).length;
  const schema = sqlLines(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return { sql_lines_per_algorithm: out, tq_sql_lines_per_kind: tqo, relational_app_glue_lines_rel_js: relApp, schema_sql_lines: schema, reference_arm_lines_ref_js: refAll };
}

function memChild() {
  const r0 = process.memoryUsage().rss;
  const db = openDb(BENCH_DB); const r = new RelGraph(db);
  const r1 = process.memoryUsage().rss;
  const G = loadFacts(P.FROZEN); const g1 = process.memoryUsage().rss;
  const seeds = benchSeeds(G);
  for (const s of seeds) for (const c of Object.values(CLASSES_Q)) runClass(r, '', c, s);
  const r2 = process.memoryUsage().rss;
  const cache = db.prepare('PRAGMA cache_size').get();
  console.log(JSON.stringify({ rss_before_open: r0, rss_after_open: r1, rss_after_facts_loaded: g1, rss_after_all_query_classes: r2, cache_size_pragma: cache }));
}

function main() {
  if (process.argv[2] === 'mem') return memChild();
  fs.mkdirSync(OUT, { recursive: true });
  const res = { commit: P.FROZEN, sqlite: new DatabaseSync(':memory:').prepare('SELECT sqlite_version() v').get().v, node: process.version };
  // load time (3 builds)
  const loads = [];
  for (let k = 0; k < 3; k++) {
    let t = now(); const G = loadFacts(P.FROZEN); const tl = now() - t;
    t = now(); const T = buildDb(G, BENCH_DB); const tb = now() - t;
    loads.push({ facts_load_ms: tl, build_ms: tb, ...T });
  }
  res.load = loads;
  res.disk = sizes(BENCH_DB);
  const G = loadFacts(P.FROZEN);
  res.graph = { nodes: G.nodes.length, edges_unique: G.edges.length, edge_evidence_rows: G.edges.reduce((a, e) => a + e.n, 0) };
  res.memory = JSON.parse(execFileSync(process.execPath, [__filename, 'mem']).toString());
  res.latency = latency(G);
  // update for a one-file change, checked against a fresh build
  const copy = BENCH_DB.replace('.sqlite', '-upd.sqlite');
  const F = 'backend/app/features/jobs/service.py';
  fs.copyFileSync(BENCH_DB, copy);
  res.update_one_file = { file: F, ...updateOneFile(G, copy, F), extractor_full_rebuild_s_note: 'facts extractor has no incremental mode: about 3.8-4.5 s per commit (facts/NOTES.md)' };
  res.update_one_file.equal_to_fresh_build = sameStore(BENCH_DB, copy);
  fs.rmSync(copy);
  const db = openDb(BENCH_DB);
  const pl = plans(db); db.close();
  fs.writeFileSync(path.join(OUT, 'query_plans.txt'), pl.text + '\n');
  res.full_scans_in_plans = pl.fullScans;
  res.lines_of_query_code = loc();
  fs.writeFileSync(path.join(OUT, 'relational.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ load: loads.map((l) => Math.round(l.build_ms)), disk: res.disk.file_bytes, memory: res.memory, full_scans: pl.fullScans, update: res.update_one_file }, null, 1));
}

main();
