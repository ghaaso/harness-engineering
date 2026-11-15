'use strict';
// Engine bench: the one-file update (protocol section 7 "update time for a one-file change", addendum 3
// item 17, addendum 4 section E). Added by the pre-flight fix, round 1.
//   node bench/update.js <relational|ladybug|duckpgq>      -> <BENCH_OUT>/update_<engine>.json
//
// What one update is, the same for every engine: file F of the bench seeds (plan.json, both graphs) is
// re-ingested into an existing store built by the arm's own builder:
//   1. delete: every node of F (the file node and every node whose path is F), every edge with an end
//      among them (both orientations of a co_changed edge), their evidence rows, and everything the store
//      keeps per node or per edge for them (text index rows, label and arc rows, ...);
//   2. insert: F's nodes and those edges again, from the canonical graph, in the store's own layout;
//   3. refresh, local: every stored value that depends on the changed rows, recomputed for the nodes it
//      can touch (degrees and production in-degree, transport flags, term statistics, the bounded closure);
//   4. refresh, global: every stored value that depends on the whole graph (SQLite: the global PageRank
//      column; LadybugDB: the native priors page_rank, k-core and Louvain, as the arm's build runs them,
//      with the community column read from the stored prior file); DuckDB stores none;
//   5. (DuckDB only) restore the node table to id order: DuckPGQ maps a vertex rowid to id - 1 (the arm
//      checks this at open), and re-inserted rows get new rowids, so the table is rewritten;
//   then application caches keyed on the store are dropped (the bench re-opens the store for the checks).
// The content is the same before and after (the file is re-ingested unchanged), so the work is a real
// one-file update and its result can be checked exactly: (a) a fingerprint of every table (counts and
// sums) is equal before and after all updates; (b) the timed classes (primary, S1, base, LadybugDB S2)
// on the first BENCH_UPDATE_CHECK seeds and the 20 TUNE questions (frozen graph) give the same answers,
// by the bench's answer hashes, before and after. A changed file would add or drop nodes; node ids
// would then be appended, which this measure does not exercise (stated in the output).
// Timing: wall time of steps 1 to 5 per file, at the engine's default threads for a write connection;
// parts reported separately. TUNE inputs only (plan.json); nothing held-out is read.
// Environment: BENCH_UPDATE_N (files per graph, default: every distinct file of the 200 measured seeds),
// BENCH_UPDATE_CHECK (seeds in the answer check, default 10), BENCH_OUT, BENCH_STORE, LB_PRIORS_DIR (a
// container-local copy: bench/run_all.sh), GT_SRCSTORE (likewise).
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./lib');

const ADAPTERS = { relational: () => require('./relational'), ladybug: () => require('./ladybug'), duckpgq: () => require('./duckpgq') };
const CHECK_N = Number(process.env.BENCH_UPDATE_CHECK || 10);
const r3 = L.r3;
// the CSV bulk loads (LadybugDB, DuckDB) read '' as NULL; a boolean is written as 0/1 there
const emptyNull = (v) => (v === '' ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

// the rows of one file in the canonical graph
function selection(G, F) {
  const X = G.nodes.filter((n) => n.path === F).map((n) => n.i);
  const xs = new Set(X);
  const E = G.edges.filter((e) => xs.has(e.s) || xs.has(e.d));
  const Y = new Set(X); for (const e of E) { Y.add(e.s); Y.add(e.d); }
  return { F, X, xs, E, Y: [...Y].sort((a, b) => a - b), nodes: G.nodes.filter((n) => xs.has(n.i)), ev: E.reduce((a, e) => a + e.evs.length, 0) };
}
const inList = (ids) => '(' + (ids.length ? ids.join(', ') : 'NULL') + ')';

// ================================ SQLite (relational arm) ================================
const REL = {
  name: 'relational',
  threads: 'one (SQLite writes on the calling thread)',
  async open(G, store) {
    const D = require('../arms/relational/db');
    const db = D.openDb(store);
    db.exec('CREATE TEMP TABLE upd_x(id INTEGER PRIMARY KEY); CREATE TEMP TABLE upd_y(id INTEGER PRIMARY KEY); CREATE TEMP TABLE upd_a(id INTEGER PRIMARY KEY);');
    const meta = Object.fromEntries(db.prepare('SELECT k, v FROM meta').all().map((r) => [r.k, r.v]));
    const kidOf = new Map(db.prepare('SELECT kid, name FROM nkind').all().map((r) => [r.name, r.kid]));
    const q = (sql) => db.prepare(sql);
    const S = {
      iN: q('INSERT INTO node(id,sid,kid,path,name,ls,le,signature,runtime,slice,is_test,tokens,file_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
      iF: q('INSERT INTO fts(rowid, body) VALUES (?, ?)'),
      iEd: q('INSERT INTO edge VALUES (?,?,?,?,?,?,?)'),
      iEv: q('INSERT INTO edge_ev VALUES (?,?,?,?,?,?)'),
      iCc: q('INSERT INTO cochange VALUES (?,?,?,?,?)'),
    };
    const K = Number(meta.closure_k); const mask = Number(meta.closure_mask); const minc = Number(meta.closure_minc);
    // sources whose bounded closure (<= K mask edges of confidence >= minc) can pass through an edge of F
    const upstream = q(`INSERT OR IGNORE INTO upd_a WITH RECURSIVE u(n, d) AS (
        SELECT id, 0 FROM upd_x UNION
        SELECT e.src, u.d + 1 FROM u JOIN edge e ON e.dst = u.n WHERE u.d < $K AND ((1 << e.cid) & $mask) != 0 AND e.w >= $minc)
      SELECT DISTINCT n FROM u`);
    return { db, D, S, kidOf, K, mask, minc, upstream };
  },
  update(h, G, sel) {
    const { db, S } = h; const T = {}; let t = L.now();
    const fill = (tab, ids) => { db.exec('DELETE FROM ' + tab); const st = db.prepare('INSERT INTO ' + tab + ' VALUES (?)'); for (const i of ids) st.run(i); };
    db.exec('BEGIN');
    fill('upd_x', sel.X); fill('upd_y', sel.Y); db.exec('DELETE FROM upd_a');
    h.upstream.run({ K: h.K, mask: h.mask, minc: h.minc }); // closure sources before the change
    db.exec(`DELETE FROM edge WHERE src IN (SELECT id FROM upd_x) OR dst IN (SELECT id FROM upd_x);
      DELETE FROM edge_ev WHERE src IN (SELECT id FROM upd_x) OR dst IN (SELECT id FROM upd_x);
      DELETE FROM cochange WHERE a IN (SELECT id FROM upd_x) OR b IN (SELECT id FROM upd_x);
      DELETE FROM fts WHERE rowid IN (SELECT id FROM upd_x);
      DELETE FROM node WHERE id IN (SELECT id FROM upd_x);`);
    T.delete_ms = L.now() - t; t = L.now();
    for (const n of sel.nodes) { S.iN.run(n.i, n.sid, h.kidOf.get(n.kind), n.path, n.name, n.ls, n.le, n.signature, n.runtime, n.slice, n.is_test, n.tokens, n.file); S.iF.run(n.i, n.text); }
    for (const e of sel.E) {
      S.iEd.run(e.s, e.k, e.d, e.c, e.w, e.n, e.sym);
      if (e.sym) S.iEd.run(e.d, e.k, e.s, e.c, e.w, e.n, 1);
      for (const [p, l, op] of e.evs) S.iEv.run(e.s, e.k, e.d, p, l, op);
      if (e.kind === 'co_changed') { S.iCc.run(e.s, e.d, e.support, e.w, e.recency); S.iCc.run(e.d, e.s, e.support, e.w, e.recency); }
    }
    T.insert_ms = L.now() - t; t = L.now();
    h.upstream.run({ K: h.K, mask: h.mask, minc: h.minc }); // and after (the union)
    // degrees, production in-degree and transport flags of every node an edge of F touches (db.js derive)
    db.exec(`DELETE FROM deg WHERE node IN (SELECT id FROM upd_y);
      INSERT INTO deg SELECT node, cid, SUM(o), SUM(i), SUM(p) FROM (
        SELECT src AS node, cid, 1 AS o, 0 AS i, 0 AS p FROM edge WHERE src IN (SELECT id FROM upd_y)
        UNION ALL
        SELECT e.dst, e.cid, 0, 1, 1 - n.is_test FROM edge e JOIN node n ON n.id = e.src WHERE e.dst IN (SELECT id FROM upd_y)
      ) GROUP BY node, cid;
      UPDATE node SET prod_in = COALESCE((SELECT SUM(d.prod_in) FROM deg d JOIN eclass c ON c.cid = d.cid
        WHERE d.node = node.id AND c.structural = 0), 0) WHERE id IN (SELECT id FROM upd_y);
      UPDATE node SET transport = CASE WHEN
          kid IN (SELECT kid FROM nkind WHERE name IN ('runtime','slice','invariant_group','ambiguous_ref','missing_ref'))
       OR (kid IN (SELECT kid FROM nkind WHERE name IN ('function','method','class')) AND is_test = 0 AND
          (SELECT COUNT(DISTINCT COALESCE(x.runtime, 'null') || '/' || x.slice) FROM edge e JOIN node x ON x.id = e.src
            WHERE e.dst = node.id AND e.ekid IN (SELECT ekid FROM ekind WHERE name IN ('calls','depends_injects','passes_callable'))
              AND x.is_test = 0 AND x.slice IS NOT NULL) >= 3) THEN 1 ELSE 0 END
        WHERE id IN (SELECT id FROM upd_y);`);
    T.local_ms = L.now() - t; t = L.now();
    // closure rows of every source whose bounded walk can pass through an edge of F (before or after)
    db.exec('DELETE FROM closure WHERE src IN (SELECT id FROM upd_a)');
    db.prepare(`INSERT INTO closure
      WITH RECURSIVE c(src, dst, d) AS (
        SELECT id, id, 0 FROM upd_a
        UNION
        SELECT c.src, e.dst, c.d + 1 FROM c JOIN edge e ON e.src = c.dst
         WHERE c.d < $K AND ((1 << e.cid) & $mask) != 0 AND e.w >= $minc)
      SELECT src, dst, MIN(d) FROM c WHERE src <> dst GROUP BY src, dst`).run({ K: h.K, mask: h.mask, minc: h.minc });
    T.closure_ms = L.now() - t; t = L.now();
    db.exec('COMMIT');
    T.commit_ms = L.now() - t; t = L.now();
    h.D.globalPageRank(db); // the stored global PageRank column (db.js; 40 iterations over SQL rows)
    T.global_ms = L.now() - t;
    T.closure_sources = db.prepare('SELECT COUNT(*) n FROM upd_a').get().n;
    return T;
  },
  fingerprint(h) {
    const one = (sql) => h.db.prepare(sql).get();
    return {
      node: one('SELECT COUNT(*) n, SUM(id) s, SUM(prod_in) pi, SUM(transport) tr, TOTAL(pagerank) pr, SUM(LENGTH(sid)) sb, SUM(file_id) f FROM node'),
      edge: one('SELECT COUNT(*) n, SUM(src) s, SUM(dst) d, TOTAL(w) w, SUM(n) ne, SUM(cid) c FROM edge'),
      edge_ev: one('SELECT COUNT(*) n, SUM(src) s, SUM(line) l, SUM(LENGTH(path)) p FROM edge_ev'),
      cochange: one('SELECT COUNT(*) n, SUM(a) a, TOTAL(conf) c, TOTAL(recency) r FROM cochange'),
      deg: one('SELECT COUNT(*) n, SUM(out_n) o, SUM(in_n) i, SUM(prod_in) p FROM deg'),
      closure: one('SELECT COUNT(*) n, SUM(src) s, SUM(dst) d, SUM(dist) k FROM closure'),
      fts: one('SELECT COUNT(*) n, SUM(rowid) s FROM fts'),
      fts_hits: one("SELECT COUNT(*) n FROM fts WHERE fts MATCH 'service'"),
    };
  },
  close(h) { h.db.close(); },
};

// ================================ LadybugDB ================================
const LB = {
  name: 'ladybug',
  threads: 'engine default for the connection (no CALL threads), as the arm\'s store build',
  async open(G, store, root) {
    const S = require('../arms/ladybug/store');
    const meta = JSON.parse(fs.readFileSync(store + '.meta.json', 'utf8'));
    const st = S.open(G, root, {});
    if (st.dir !== store) throw new Error('ladybug store mismatch ' + st.dir + ' vs ' + store);
    const c = st.conn;
    const ps = new Map();
    const ex = (text, params) => { let p = ps.get(text); if (!p) { p = c.prepareSync(text); ps.set(text, p); } return S.getAll(c.executeSync(p, params || {})); };
    const run = (text) => S.getAll(c.querySync(text));
    run('LOAD EXTENSION algo');
    const types = S.edgeTypes(G);
    const prior = JSON.parse(fs.readFileSync(S.priorFile(meta.canon_hash, 0), 'utf8'));
    if (prior.comm.length !== G.nodes.length) throw new Error('prior file does not match the graph');
    return { S, st, c, ex, run, types, meta, prior, ps, tag: 0 };
  },
  update(h, G, sel) {
    const { S, ex, run } = h; const T = {}; let t = L.now();
    const X = sel.X; const Y = sel.Y;
    run('BEGIN TRANSACTION');
    const oldTerms = ex('MATCH (n:N)-[:HAS]->(t:T) WHERE n.id IN $X RETURN DISTINCT t.term AS term', { X }).map((r) => r.term);
    ex('MATCH (n:N) WHERE n.id IN $X DETACH DELETE n', { X }); // every rel table: f_, r_, A, EV, HAS
    T.delete_ms = L.now() - t; t = L.now();
    // nodes: the canonical columns (NULL left out, so the column is NULL as in the CSV load), defaults for the rest
    const NC = ['sid', 'kind', 'path', 'name', 'ls', 'le', 'runtime', 'slice', 'is_test', 'file', 'tokens', 'text'];
    for (const n of sel.nodes) {
      const p = { id: n.i }; for (const k of NC) { const v = emptyNull(n[k]); if (v != null) p[k] = v; }
      ex('CREATE (n:N {' + Object.keys(p).map((k) => k + ': $' + k).join(', ') + '})', p);
    }
    // edges, as store.js build lays them out (doubles passed as text and cast in the engine: a list of
    // structs takes one type per field, and a whole number would make the field INT64)
    const byType = new Map();
    const push = (lab, row) => { if (!byType.has(lab)) byType.set(lab, []); byType.get(lab).push(row); };
    const arcs = []; const evRows = [];
    for (const e of sel.E) {
      const ty = S.typeOf(e.kind, e.cls);
      push('f_' + ty, { s: e.s, d: e.d, w: String(e.w), n: e.n, kid: e.k, cls: e.c, o: 0 });
      if (e.sym) push('f_' + ty, { s: e.d, d: e.s, w: String(e.w), n: e.n, kid: e.k, cls: e.c, o: 0 });
      else push('r_' + ty, { s: e.d, d: e.s, w: String(e.w), n: e.n, kid: e.k, cls: e.c, o: 1 });
      const co = e.kind === 'co_changed' ? 1 : 0; const cost = S.edgeCost(e.cls, e.w);
      arcs.push({ s: e.s, d: e.d, w: String(e.w), n: e.n, kid: e.k, cls: e.c, sym: co, prim: 1, cost: String(cost) });
      if (co) arcs.push({ s: e.d, d: e.s, w: String(e.w), n: e.n, kid: e.k, cls: e.c, sym: 1, prim: 0, cost: String(cost) });
      for (const [p, l, op] of e.evs) evRows.push({ s: e.s, d: e.d, kid: e.k, path: emptyNull(p), line: l || 0, op: emptyNull(op) });
    }
    for (const [lab, rows] of byType) ex(`UNWIND $rows AS x MATCH (a:N {id: x.s}), (b:N {id: x.d}) CREATE (a)-[:${lab} {w: CAST(x.w AS DOUBLE), n: x.n, kid: x.kid, cls: x.cls, o: x.o}]->(b)`, { rows });
    if (arcs.length) ex('UNWIND $rows AS x MATCH (a:N {id: x.s}), (b:N {id: x.d}) CREATE (a)-[:A {w: CAST(x.w AS DOUBLE), n: x.n, kid: x.kid, cls: x.cls, sym: x.sym, prim: x.prim, cost: CAST(x.cost AS DOUBLE)}]->(b)', { rows: arcs });
    for (const r of evRows) { // per row: path or op may be NULL
      const p = { s: r.s, d: r.d, kid: r.kid, line: r.line }; if (r.path != null) p.path = r.path; if (r.op != null) p.op = r.op;
      ex('MATCH (a:N {id: $s}), (b:N {id: $d}) CREATE (a)-[:EV {' + ['kid', 'line', 'path', 'op'].filter((k) => k in p).map((k) => k + ': $' + k).join(', ') + '}]->(b)', p);
    }
    // the BM25 term index of the file's nodes (store.js: terms = text split on single spaces, empty dropped)
    const has = []; const newTerms = new Set();
    for (const n of sel.nodes) {
      const tx = emptyNull(n.text); if (tx == null) continue;
      const tf = new Map(); for (const w of tx.split(' ')) if (w !== '') tf.set(w, (tf.get(w) || 0) + 1);
      for (const [term, k] of tf) { has.push({ id: n.i, term, tf: k }); newTerms.add(term); }
    }
    if (has.length) {
      ex('UNWIND $rows AS x MERGE (t:T {term: x}) ON CREATE SET t.df = 0', { rows: [...newTerms] });
      ex('UNWIND $rows AS x MATCH (n:N {id: x.id}), (t:T {term: x.term}) CREATE (n)-[:HAS {tf: x.tf}]->(t)', { rows: has });
    }
    T.insert_ms = L.now() - t; t = L.now();
    // term statistics, document length, production in-degree per class, transport flags
    const terms = [...new Set([...oldTerms, ...newTerms])];
    if (terms.length) {
      ex('UNWIND $rows AS x MATCH (t:T {term: x}) OPTIONAL MATCH (n:N)-[:HAS]->(t) WITH t, count(n) AS c SET t.df = c', { rows: terms });
      ex('MATCH (t:T) WHERE t.term IN $rows AND t.df = 0 DELETE t', { rows: terms });
    }
    ex('MATCH (n:N)-[h:HAS]->(:T) WHERE n.id IN $X WITH n, sum(h.tf) AS dl SET n.dl = dl', { X });
    ex('MATCH (v:N) WHERE v.id IN $Y SET ' + S.NONSTRUCT.map((ci) => 'v.pi_' + ci + ' = 0').join(', ') + ', v.transport = false', { Y });
    for (const ci of S.NONSTRUCT) {
      const lab = h.types.filter((x) => x.cls === ci).map((x) => 'f_' + x.t);
      if (lab.length) ex(`MATCH (u:N)-[r:${lab.join('|')}]->(v:N) WHERE u.is_test = 0 AND v.id IN $Y WITH v, count(r) AS k SET v.pi_${ci} = k`, { Y });
    }
    ex("MATCH (n:N) WHERE n.id IN $Y AND n.kind IN ['runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref'] SET n.transport = true", { Y });
    const callers = h.types.filter((x) => ['calls', 'depends_injects', 'passes_callable'].includes(x.kind)).map((x) => 'f_' + x.t);
    if (callers.length) ex(`MATCH (x:N)-[:${callers.join('|')}]->(n:N) WHERE n.id IN $Y AND n.kind IN ['function', 'method', 'class'] AND n.is_test = 0 AND x.is_test = 0 AND x.slice IS NOT NULL WITH n, count(DISTINCT coalesce(x.runtime, 'null') + '/' + x.slice) AS k WHERE k >= 3 SET n.transport = true`, { Y });
    T.local_ms = L.now() - t; t = L.now();
    run('COMMIT');
    T.commit_ms = L.now() - t; t = L.now();
    // the native priors, as store.js nativePriors runs them (page_rank on PR_FILTER, k-core and Louvain on
    // CODE_FILTER); the community column comes from the stored prior file of this canonical graph (its
    // content is unchanged here; a changed file would give a new canonical graph and a new Louvain draw)
    const tag = 'u' + (h.tag++);
    run(`CALL PROJECT_GRAPH('code_${tag}', ['N'], {'A': '${S.CODE_FILTER}'})`);
    run(`CALL PROJECT_GRAPH('pr_${tag}', ['N'], {'A': '${S.PR_FILTER}'})`);
    run(`CALL page_rank('pr_${tag}') WITH node, rank SET node.prank = rank`);
    run(`CALL k_core_decomposition('code_${tag}') WITH node, k_degree SET node.core = k_degree`);
    const lv = run(`CALL louvain('code_${tag}') RETURN node.id AS i, louvain_id AS c`);
    T.louvain_communities = new Set(lv.map((r) => S.num(r.c))).size;
    S.setComm(run, h.prior.comm);
    run(`CALL DROP_PROJECTED_GRAPH('code_${tag}')`); run(`CALL DROP_PROJECTED_GRAPH('pr_${tag}')`);
    T.global_ms = L.now() - t;
    return T;
  },
  fingerprint(h) {
    const one = (s) => h.run(s)[0];
    const fp = {
      N: one('MATCH (n:N) RETURN count(n) AS n, sum(n.id) AS s, sum(n.dl) AS dl, sum(CASE WHEN n.transport THEN 1 ELSE 0 END) AS tr, sum(n.core) AS core, sum(n.comm) AS comm, sum(n.prank) AS pr, sum(size(n.sid)) AS sb, sum(n.file) AS f'),
      pi: one('MATCH (n:N) RETURN ' + h.S.NONSTRUCT.map((ci) => 'sum(n.pi_' + ci + ') AS p' + ci).join(', ')),
      T: one('MATCH (t:T) RETURN count(t) AS n, sum(t.df) AS df'),
      HAS: one('MATCH ()-[r:HAS]->() RETURN count(r) AS n, sum(r.tf) AS tf'),
      A: one('MATCH (a:N)-[r:A]->(b:N) RETURN count(r) AS n, sum(a.id) AS s, sum(b.id) AS d, sum(r.w) AS w, sum(r.cost) AS c, sum(r.sym) AS sym, sum(r.prim) AS prim'),
      EV: one('MATCH (a:N)-[r:EV]->(b:N) RETURN count(r) AS n, sum(a.id) AS s, sum(r.line) AS l, sum(size(coalesce(r.path, \'\'))) AS p'),
    };
    for (const x of h.types) {
      for (const pre of ['f_', 'r_']) {
        if (pre === 'r_' && x.sym) continue;
        fp[pre + x.t] = one(`MATCH (a:N)-[r:${pre}${x.t}]->(b:N) RETURN count(r) AS n, sum(a.id) AS s, sum(b.id) AS d, sum(r.w) AS w, sum(r.o) AS o`);
      }
    }
    return JSON.parse(JSON.stringify(fp, (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  },
  close(h) { h.ps.clear(); h.st.conn.closeSync(); h.st.db.closeSync(); },
};

// ================================ DuckDB + DuckPGQ ================================
const DK = {
  name: 'duckpgq',
  threads: 'DuckDB default for the write instance (store.js connect without a threads setting), as the arm\'s store build',
  async open(G, store) {
    const S_ = require('../arms/duckpgq/store');
    const db = await S_.connect(store);
    await S_.loadPgq(db);
    const kid = new Map(G.kinds.map((k, i) => [k, i + 1]));
    const labels = (await db.all('SELECT DISTINCT k.name AS kind, c.name AS cls, e.kid, e.cid FROM edge e JOIN ekind k ON k.kid = e.kid JOIN eclass c ON c.cid = e.cid ORDER BY 1, 2'))
      .map((r) => ({ table: S_.labelOf(r.kind, r.cls), kid: r.kid, cid: r.cid }));
    const tqDefs = S_.tqLabelDefs(kid);
    const extra = S_.TQ_SINGLE.map((k) => 'l_' + k).filter((tb) => !labels.some((x) => x.table === tb)); // empty TQ tables
    return { S_, db, kid, labels, tqDefs, extra };
  },
  async update(h, G, sel) {
    const { S_, db } = h; const T = {}; let t = L.now();
    const lit = S_.lit; const v = (x) => (x == null ? 'NULL' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toExponential()) : lit(x));
    const X = inList(sel.X); const Y = inList(sel.Y);
    const inc = `(src IN ${X} OR dst IN ${X})`;
    await db.run('BEGIN TRANSACTION');
    await db.run('CREATE TEMP TABLE IF NOT EXISTS upd_terms(term VARCHAR)'); await db.run('DELETE FROM upd_terms');
    await db.run(`INSERT INTO upd_terms SELECT DISTINCT term FROM term WHERE node IN ${X}`);
    for (const s of [`DELETE FROM edge WHERE ${inc}`, `DELETE FROM edge_ev WHERE ${inc}`, `DELETE FROM arc WHERE ${inc}`,
      ...h.labels.map((l) => `DELETE FROM ${l.table} WHERE ${inc}`), ...h.tqDefs.map(([n]) => `DELETE FROM ${n} WHERE ${inc}`),
      `DELETE FROM cochange WHERE a IN ${X} OR b IN ${X}`, `DELETE FROM term WHERE node IN ${X}`, `DELETE FROM node WHERE id IN ${X}`]) await db.run(s);
    T.delete_ms = L.now() - t; t = L.now();
    // nodes (store.js: '' read as NULL by the CSV load; transport 0, then refreshed; dl from the text)
    const NC = ['i', 'sid', 'kind', 'path', 'name', 'ls', 'le', 'runtime', 'slice', 'is_test', 'file', 'tokens', 'text'];
    if (sel.nodes.length) {
      await db.run(`INSERT INTO node SELECT id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text, 0,
        CASE WHEN text IS NULL OR text = '' THEN 0 ELSE len(string_split(text, ' ')) END
        FROM (VALUES ${sel.nodes.map((n) => '(' + NC.map((k) => v(emptyNull(n[k]))).join(', ') + ')').join(', ')})
        AS z(id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text)`);
    }
    if (sel.E.length) {
      await db.run('INSERT INTO edge VALUES ' + sel.E.map((e) => `(${e.s}, ${e.d}, ${e.k}, ${e.c}, ${v(e.w)}, ${e.n}, ${e.kind === 'co_changed' ? 1 : 0})`).join(', '));
      const evs = []; for (const e of sel.E) for (const [p, l, op] of e.evs) evs.push(`(${e.s}, ${e.d}, ${e.k}, ${v(emptyNull(p))}, ${v(l)}, ${v(emptyNull(op))})`);
      if (evs.length) await db.run('INSERT INTO edge_ev VALUES ' + evs.join(', '));
      await db.run(`INSERT INTO arc ${S_.arcSelect(inc)}`);
      for (const l of h.labels) await db.run(`INSERT INTO ${l.table} SELECT src, dst, w, n_ev FROM edge WHERE kid = ${l.kid} AND cid = ${l.cid} AND ${inc}`);
      for (const [n, sql] of h.tqDefs) await db.run(`INSERT INTO ${n} SELECT * FROM (${sql}) z WHERE z.src IN ${X} OR z.dst IN ${X}`);
      const cc = h.kid.get('co_changed') || -1;
      await db.run(`INSERT INTO cochange SELECT a, b, w FROM (SELECT src AS a, dst AS b, w FROM edge WHERE kid = ${cc} AND ${inc} UNION ALL SELECT dst, src, w FROM edge WHERE kid = ${cc} AND ${inc})`);
    }
    await db.run(`INSERT INTO term SELECT id AS node, t AS term, count(*)::INTEGER AS tf FROM (
        SELECT id, unnest(string_split(text, ' ')) AS t FROM node WHERE text IS NOT NULL AND text <> '' AND id IN ${X}) GROUP BY id, t`);
    await db.run(`INSERT INTO upd_terms SELECT DISTINCT term FROM term WHERE node IN ${X}`);
    T.insert_ms = L.now() - t; t = L.now();
    await db.run('DELETE FROM df WHERE term IN (SELECT term FROM upd_terms)');
    await db.run('INSERT INTO df SELECT term, count(*)::INTEGER AS n FROM term WHERE term IN (SELECT DISTINCT term FROM upd_terms) GROUP BY term');
    await db.run(`DELETE FROM deg WHERE node IN ${Y}`);
    await db.run(`INSERT INTO deg SELECT node, cid, count(*)::INTEGER AS prod_in FROM (
        SELECT e.dst AS node, e.cid FROM edge e JOIN node s ON s.id = e.src WHERE s.is_test = 0 AND e.dst IN ${Y}
        UNION ALL SELECT e.src, e.cid FROM edge e JOIN node d ON d.id = e.dst WHERE e.sym = 1 AND d.is_test = 0 AND e.src IN ${Y})
      GROUP BY node, cid`);
    await db.run(`UPDATE node SET transport = CASE WHEN kind IN ('runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref')
      OR (kind IN ('function', 'method', 'class') AND is_test = 0 AND id IN (
        SELECT e.dst FROM edge e JOIN node x ON x.id = e.src JOIN ekind k ON k.kid = e.kid
        WHERE k.name IN ('calls', 'depends_injects', 'passes_callable') AND e.sym = 0 AND x.is_test = 0 AND x.slice IS NOT NULL
        GROUP BY e.dst HAVING count(DISTINCT coalesce(x.runtime, 'null') || '/' || x.slice) >= 3)) THEN 1 ELSE 0 END
      WHERE id IN ${Y}`);
    T.local_ms = L.now() - t; t = L.now();
    await db.run('COMMIT');
    T.commit_ms = L.now() - t; t = L.now();
    // DuckPGQ vertex rowid = id - 1 (pgq.js checks it at open): rewrite the node table in id order
    await db.run('BEGIN TRANSACTION');
    await db.run(`CREATE TABLE node__new(id BIGINT PRIMARY KEY, sid VARCHAR, kind VARCHAR, path VARCHAR, name VARCHAR, ls INTEGER, le INTEGER,
      runtime VARCHAR, slice VARCHAR, is_test INTEGER, file BIGINT, tokens INTEGER, text VARCHAR, transport INTEGER, dl INTEGER)`);
    await db.run('INSERT INTO node__new SELECT * FROM node ORDER BY id');
    await db.run('DROP TABLE node');
    await db.run('ALTER TABLE node__new RENAME TO node');
    await db.run('COMMIT');
    T.reorder_ms = L.now() - t; t = L.now();
    await db.run('CHECKPOINT');
    T.checkpoint_ms = L.now() - t;
    T.global_ms = 0;
    return T;
  },
  async fingerprint(h) {
    const one = async (s) => (await h.db.all(s))[0];
    const fp = {
      node: await one("SELECT count(*) AS n, sum(id) AS s, sum(transport) AS tr, sum(dl) AS dl, sum(strlen(coalesce(text, ''))) AS tb, sum(strlen(sid)) AS sb, sum(file) AS f, sum(coalesce(ls, 0)) AS ls FROM node"),
      rowid_misordered: await one('SELECT count(*) AS n FROM (SELECT rowid AS r, id FROM node) WHERE r <> id - 1'),
      edge: await one('SELECT count(*) AS n, sum(src) AS s, sum(dst) AS d, sum(w) AS w, sum(n_ev) AS ne, sum(kid) AS k, sum(cid) AS c FROM edge'),
      edge_ev: await one("SELECT count(*) AS n, sum(src) AS s, sum(line) AS l, sum(strlen(coalesce(path, ''))) AS p, count(op) AS ops FROM edge_ev"),
      arc: await one('SELECT count(*) AS n, sum(src) AS s, sum(dst) AS d, sum(o) AS o, sum(cost) AS c FROM arc'),
      deg: await one('SELECT count(*) AS n, sum(node) AS s, sum(prod_in) AS p FROM deg'),
      term: await one('SELECT count(*) AS n, sum(node) AS s, sum(tf) AS tf FROM term'),
      df: await one('SELECT count(*) AS n, sum(n) AS s FROM df'),
      cochange: await one('SELECT count(*) AS n, sum(a) AS a, sum(w) AS w FROM cochange'),
      graphs: await one('SELECT count(*) AS n FROM __duckpgq_internal'),
    };
    for (const tb of [...h.labels.map((l) => l.table), ...h.tqDefs.map(([n]) => n), ...h.extra]) fp[tb] = await one(`SELECT count(*) AS n, sum(src) AS s, sum(dst) AS d FROM ${tb}`);
    return fp;
  },
  async close(h) { await h.db.run('CHECKPOINT'); h.db.close(); },
};

const UPD = { relational: REL, ladybug: LB, duckpgq: DK };

// answer hashes of the timed classes on the first CHECK_N seeds (+ the TUNE questions on the frozen graph),
// through the bench adapter (the arm's own query code), one thread
async function answers(A, plan, graph, G, store, root) {
  const o = await A.open({ G, store, root, threads: 1 });
  const out = {};
  for (const cls of plan.classes.filter((c) => (!c.engines || c.engines.includes(A.name)) && c.graphs.includes(graph))) {
    const items = cls.kind === 'tq' ? plan.tq : plan.graphs[graph].seeds.slice(0, CHECK_N);
    out[cls.key] = [];
    for (const x of items) {
      let r = cls.kind === 'tq' ? o.tq(x) : o.rank(x.ids, cls.config, x.seed);
      if (r && typeof r.then === 'function') r = await r;
      out[cls.key].push(cls.kind === 'tq' ? L.tqHash(r) : L.rankedHashes(L.asRanked(r)));
    }
  }
  await o.close();
  return out;
}
// Fingerprint differences that are an engine effect, not an update error, reported apart (not a failure).
// LadybugDB page_rank counts deleted node slots: after DETACH DELETE and CREATE the node offsets run to
// N + (nodes re-inserted so far), and the teleport term becomes 0.15 / (that count) (measured in
// tmp/bench/prank_probe.json: minimum rank 0.15/2450 on a fresh store, 0.15/2458 after re-inserting 8
// nodes; a page_rank re-run on an unchanged store gives the identical sum). The ladybug arm's own update
// bench noted the same (arms/ladybug/bench.js sameStore). No timed class reads prank (x_prank is in no
// addendum-4 configuration; S2 is PPR + x_comm), and the answer check below covers the timed classes.
const KNOWN = { ladybug: { '.N.pr': 'LadybugDB page_rank counts deleted node slots (see bench/update.js KNOWN); no timed class reads the stored prank column' } };
// numbers equal up to 1e-9 relative (DuckDB and LadybugDB sums of doubles are order dependent)
function sameFp(a, b, path0 = '') {
  const diff = [];
  const walk = (x, y, p) => {
    if (typeof x === 'number' && typeof y === 'number') { if (!(x === y || Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y)))) diff.push(p + ': ' + x + ' vs ' + y); return; }
    if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + '.' + k); return; }
    if (x !== y) diff.push(p + ': ' + JSON.stringify(x) + ' vs ' + JSON.stringify(y));
  };
  walk(a, b, path0);
  return diff;
}

async function main() {
  const engine = process.argv[2];
  if (!UPD[engine]) throw new Error('usage: node bench/update.js relational|ladybug|duckpgq');
  const A = ADAPTERS[engine](); const U = UPD[engine];
  const plan = L.readPlan();
  const res = {
    engine, measure: 'one-file update (re-ingest of one file into an existing store, local and global refresh); see bench/update.js header',
    version: A.version(), generated_at: new Date().toISOString(), threads: U.threads, host_start: L.hostInfo(), labels: L.LABELS, plan_hash: plan.plan_hash,
    check_seeds: CHECK_N, not_exercised: 'node ids are kept (the file is re-ingested unchanged); a changed file would append new ids and, for LadybugDB, give a new canonical graph and a new Louvain draw', graphs: {},
  };
  for (const graph of ['tune', 'frozen']) {
    const g = plan.graphs[graph];
    const { G } = L.graphFacts(g.sha);
    const files = [...new Set(g.seeds.map((x) => x.seed.path))].filter((p) => G.nodes.some((n) => n.path === p && n.kind === 'file'));
    const N = Math.min(Number(process.env.BENCH_UPDATE_N || files.length), files.length);
    const root = path.join(L.STORE_ROOT, 'update-' + engine, graph);
    fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true });
    const b = await A.build(G, root);
    process.stderr.write(`[update ${engine}] ${graph}: store built in ${Math.round(b.build_ms)} ms; ${N} files\n`);
    const before = await answers(A, plan, graph, G, b.store, root);
    const h = await U.open(G, b.store, root);
    const fp0 = await U.fingerprint(h);
    const samples = [];
    for (const F of files.slice(0, N)) {
      const sel = selection(G, F);
      const t = L.now(); const parts = await U.update(h, G, sel); const total = L.now() - t;
      samples.push({ file: F, nodes: sel.X.length, edges: sel.E.length, evidence_rows: sel.ev, touched_nodes: sel.Y.length, total_ms: r3(total), parts: Object.fromEntries(Object.entries(parts).map(([k, x]) => [k, typeof x === 'number' && /_ms$/.test(k) ? r3(x) : x])) });
    }
    const fp1 = await U.fingerprint(h);
    await U.close(h);
    const after = await answers(A, plan, graph, G, b.store, root);
    const ansDiff = [];
    for (const k of Object.keys(before)) before[k].forEach((x, i) => { const y = after[k][i]; if (JSON.stringify(x) !== JSON.stringify(y)) ansDiff.push({ cls: k, i, before: x, after: y, score9_equal: x.score9 === y.score9 && x.order === y.order }); });
    const partNames = [...new Set(samples.flatMap((s) => Object.keys(s.parts).filter((k) => /_ms$/.test(k))))];
    res.graphs[graph] = {
      sha: g.sha, nodes: G.nodes.length, edges: G.edges.length, files_available: files.length, files_updated: samples.length,
      store_build_ms: r3(b.build_ms),
      update_ms: L.stats(samples.map((s) => s.total_ms)),
      parts_ms: Object.fromEntries(partNames.map((k) => [k, L.stats(samples.map((s) => s.parts[k] || 0))])),
      size: { nodes: L.statsPlain(samples.map((s) => s.nodes)), edges: L.statsPlain(samples.map((s) => s.edges)), evidence_rows: L.statsPlain(samples.map((s) => s.evidence_rows)), touched_nodes: L.statsPlain(samples.map((s) => s.touched_nodes)) },
      check: { fingerprint_differences: sameFp(fp0, fp1).filter((d) => !(KNOWN[engine] || {})[d.split(':')[0]]),
        known_engine_effects: sameFp(fp0, fp1).filter((d) => (KNOWN[engine] || {})[d.split(':')[0]]).map((d) => ({ difference: d, why: KNOWN[engine][d.split(':')[0]] })),
        answers_compared: Object.fromEntries(Object.entries(before).map(([k, x]) => [k, x.length])), answers_differing: ansDiff },
      fingerprint: fp1, samples,
      rss_mb: r3(process.memoryUsage().rss / 1048576),
    };
    const c = res.graphs[graph].check;
    process.stderr.write(`[update ${engine}] ${graph}: median ${res.graphs[graph].update_ms.median_ms} ms, p95 ${res.graphs[graph].update_ms.p95_ms} ms over ${samples.length}; fingerprint differences ${c.fingerprint_differences.length}; answers differing ${c.answers_differing.length}\n`);
    fs.rmSync(root, { recursive: true, force: true });
  }
  res.host_end = L.hostInfo();
  res.problems = Object.entries(res.graphs).flatMap(([g, x]) => [...x.check.fingerprint_differences.map((d) => g + ' fingerprint ' + d), ...x.check.answers_differing.map((d) => g + ' answer ' + d.cls + ' #' + d.i + (d.score9_equal ? ' (exact score only; order and 1e-9 scores equal)' : ''))]);
  fs.mkdirSync(L.OUT, { recursive: true });
  fs.writeFileSync(path.join(L.OUT, 'update_' + engine + '.json'), JSON.stringify(res, null, 1));
  process.stderr.write(`[update ${engine}] wrote ${path.join(L.OUT, 'update_' + engine + '.json')}; problems ${res.problems.length}\n`);
  if (res.problems.some((p) => !/exact score only/.test(p))) process.exitCode = 3;
}

if (require.main === module) main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
module.exports = { selection, UPD };
void os;
