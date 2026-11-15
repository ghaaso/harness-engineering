'use strict';
// DuckDB + DuckPGQ store for one (parent commit, removed document): built once from the canonical graph
// (common/facts.js exportCanon CSV files, bulk loaded with read_csv), then opened read-only by every run.
//
// Layout of the store file (<store>/<sha>-<tag>.duckdb):
//   ekind(kid, name), eclass(cid, name, structural)          kind ids = canonical kind order (SPEC 2)
//   node(id PK, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text, transport, dl)
//        rows inserted in id order, so DuckPGQ vertex rowid = id - 1 (checked at open)
//   edge(src, dst, kid, cid, w, n_ev, sym)                     every canonical edge, once (co_changed: src < dst)
//   one label table per (edge kind, class): "l_<kind>" (contains splits into l_contains_structure and
//        l_contains_membership): (src, dst, w, n_ev). These are the typed edge labels of the property graph.
//   deg(node, cid, prod_in)       production in-degree per class (SPEC 5 indeg)
//   term(node, term, tf), df(term, n)   BM25 postings over the shared node text (SPEC 8.4)
//   cochange(a, b, w)             co_changed in both orientations (SPEC 8.3)
//   edge_ev(src, dst, kid, path, line, op)   evidence rows (for the TQ queries only)
//   meta(k, v)                    canon hash, counts, build times, versions
//   arc(src, dst, kid, cid, o, w, sym, cost)   every SPEC 4 arc once: a directed edge gives a forward arc
//        (o = 0) and a reverse arc (o = 1), a co_changed edge gives two arcs (o = 0, sym = 1); cost = the
//        x_wsp arc cost (LadybugDB's class cost / max(confidence, 0.05), addendum 3 A.2)
//   tq_client, tq_exec, tq_up_tests, tq_up_prod, tq_up_entry   the multi-kind labels of the TQ queries
// Two property graphs are STORED in the file at build time (DuckPGQ keeps their definitions in the
// table __duckpgq_internal): `g` = node + arc (label arc), the graph every ranking query matches, a
// configuration's projection being an edge-element filter; `gtq` = node + the TQ labels + single-kind
// labels. The file is then opened READ_ONLY as the main database (a stored graph is not found through
// ATTACH, and a read-only database cannot create one), so nothing is declared per connection.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DuckDBInstance } = require('@duckdb/node-api');
const { exportCanon } = require('../common/facts');
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');

const STORE_VERSION = 'D2';
// x_wsp class costs: the LadybugDB arm's table (arms/ladybug/store.js CLASS_COST), any other class 3
const CLASS_COST = { structure: 1, membership: 4, imports: 1, calls: 1, http: 1, tests: 1, data: 1.5, config: 1.5, capability: 3, docs: 3, history: 2, experimental: 3 };
const COST_FLOOR = 0.05;
// TQ labels (multi-kind repeated steps of the TQ queries; see tq.js): name and defining query, given the
// kind ids of this store
function tqLabelDefs(kid) {
  const K = (names) => names.map((n) => kid.get(n) ?? -1).join(', ');
  return [
    // client side, downstream: definitions, calls, renders, outbox kinds; HTTP edges only into non-backend nodes
    ['tq_client', `SELECT e.src, e.dst FROM edge e JOIN node x ON x.id = e.dst WHERE x.is_test = 0 AND (e.kid IN (${K(['defines', 'calls', 'renders', 'passes_callable', 'enqueues_kind', 'kind_handled_by'])})
       OR (e.kid IN (${K(['calls_url', 'registers_route'])}) AND coalesce(x.runtime, '') <> 'backend'))`],
    // executed code, downstream, production targets
    ['tq_exec', `SELECT e.src, e.dst FROM edge e JOIN node x ON x.id = e.dst WHERE x.is_test = 0 AND e.kid IN (${K(['calls', 'depends_injects', 'passes_callable'])})`],
    // upstream (reversed) call chains: every caller, tests included
    ['tq_up_tests', `SELECT e.dst AS src, e.src AS dst FROM edge e WHERE e.kid IN (${K(['calls', 'depends_injects', 'passes_callable', 'registers_route', 'test_calls_route', 'renders'])})`],
    // upstream production callers
    ['tq_up_prod', `SELECT e.dst AS src, e.src AS dst FROM edge e JOIN node x ON x.id = e.src WHERE x.is_test = 0 AND e.kid IN (${K(['calls', 'depends_injects', 'passes_callable', 'registers_route'])})`],
    // upstream production entry chains (routes, scheduled jobs, scripts)
    ['tq_up_entry', `SELECT e.dst AS src, e.src AS dst FROM edge e JOIN node x ON x.id = e.src WHERE x.is_test = 0 AND e.kid IN (${K(['calls', 'depends_injects', 'passes_callable', 'registers_route', 'runs'])})`],
  ];
}
// single-kind labels the TQ queries name (label = the kind name, table = l_<kind>; an empty table when absent)
const TQ_SINGLE = ['calls_url', 'registers_route', 'writes_table', 'mocks', 'overrides', 'constrains', 'reads_setting', 'migration_touches', 'calls'];
// the arc rows of the edges matching an edge-table condition (null = every edge), with their x_wsp cost
const ARC_COST = `(CASE cid ${CLASSES.map((c, i) => `WHEN ${i} THEN ${Number(CLASS_COST[c] == null ? 3 : CLASS_COST[c])}::DOUBLE`).join(' ')} ELSE 3.0::DOUBLE END) / greatest(w, ${COST_FLOOR}::DOUBLE)`;
function arcSelect(where) {
  const w = where ? ' WHERE ' + where : '';
  return `SELECT src, dst, kid, cid, o, w, sym, ${ARC_COST} AS cost FROM (SELECT src, dst, kid, cid, 0 AS o, w, sym FROM edge${w}
    UNION ALL SELECT dst, src, kid, cid, CASE WHEN sym = 1 THEN 0 ELSE 1 END, w, sym FROM edge${w})`;
}
const edgeTable = (t, label) => `${t} SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL ${label}`;
const EXT_DIR = process.env.GT_DUCKDB_EXT || '/opt/eng/ext-duckdb';
const now = () => Number(process.hrtime.bigint()) / 1e6;

function storeTag(G) {
  return crypto.createHash('sha1').update([STORE_VERSION, G.loader_version, G.meta.extractor_version, G.removed.join(',')].join('|')).digest('hex').slice(0, 8);
}
function storeFile(G, dir) { return path.join(dir, G.sha + '-' + storeTag(G) + '.duckdb'); }
// label name of an edge kind (and class, for contains)
function labelOf(kind, cls) { return kind === 'contains' ? 'l_contains_' + cls : 'l_' + kind; }

// value conversion: BIGINT -> number, lists recursively
function js(v) {
  if (typeof v === 'bigint') return Number(v);
  if (Array.isArray(v)) return v.map(js);
  if (v && typeof v === 'object' && !(v instanceof Date)) { const o = {}; for (const k of Object.keys(v)) o[k] = js(v[k]); return o; }
  return v;
}
async function connect(file, opts = {}) {
  const inst = await DuckDBInstance.create(file, opts.config || {});
  const conn = await inst.connect();
  const db = {
    inst, conn,
    async all(sql) { const r = await conn.runAndReadAll(sql); return r.getRowObjectsJS().map(js); },
    async run(sql) { await conn.run(sql); },
    async changed(sql) { const r = await conn.run(sql); return Number(r.rowsChanged); },
    async one(sql) { const r = await db.all(sql); return r[0]; },
    close() { try { conn.closeSync(); } catch (e) { /* closed */ } try { inst.closeSync(); } catch (e) { /* closed */ } },
  };
  return db;
}
async function loadPgq(db) {
  await db.run(`SET extension_directory='${EXT_DIR}'`);
  await db.run('LOAD duckpgq');
  await db.run("SET active_grammar_extensions=['duckpgq']");
}
const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const csvField = (v) => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

async function buildStore(G, file) {
  const T = {}; let t = now();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.csv';
  fs.rmSync(tmp, { recursive: true, force: true });
  const manifest = exportCanon(G, tmp);
  // evidence rows are not part of the canonical CSV export; they come from the same loaded graph
  const kid = new Map(G.kinds.map((k, i) => [k, i + 1]));
  let ev = 'src,dst,kid,path,line,op\n';
  for (const e of G.edges) for (const [p, l, op] of e.evs) ev += [e.s, e.d, kid.get(e.kind), p, l, op].map(csvField).join(',') + '\n';
  fs.writeFileSync(path.join(tmp, 'edge_ev.csv'), ev);
  T.export_ms = now() - t; t = now();
  // built under the same file name in a side folder, then moved: the stored property graphs record the
  // database (catalog) name, which is the file name without its extension
  const part = path.join(path.dirname(file), '.building', path.basename(file));
  fs.mkdirSync(path.dirname(part), { recursive: true });
  fs.rmSync(part, { force: true }); fs.rmSync(part + '.wal', { force: true });
  const db = await connect(part);
  await loadPgq(db);
  const P = (f) => lit(path.join(tmp, f).replace(/\\/g, '/'));
  const csv = (f, cols) => `read_csv(${P(f)}, header = true, delim = ',', quote = '"', escape = '"', columns = {${cols}})`;
  const stmts = [
    'CREATE TABLE ekind(kid INTEGER PRIMARY KEY, name VARCHAR)',
    'INSERT INTO ekind VALUES ' + G.kinds.map((k, i) => `(${i + 1}, ${lit(k)})`).join(', '),
    'CREATE TABLE eclass(cid INTEGER PRIMARY KEY, name VARCHAR, structural INTEGER)',
    'INSERT INTO eclass VALUES ' + CLASSES.map((c, i) => `(${i}, ${lit(c)}, ${STRUCTURAL.has(c) ? 1 : 0})`).join(', '),
    `CREATE TABLE node(id BIGINT PRIMARY KEY, sid VARCHAR, kind VARCHAR, path VARCHAR, name VARCHAR, ls INTEGER, le INTEGER,
      runtime VARCHAR, slice VARCHAR, is_test INTEGER, file BIGINT, tokens INTEGER, text VARCHAR, transport INTEGER, dl INTEGER)`,
    `INSERT INTO node SELECT id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text, 0,
      CASE WHEN text IS NULL OR text = '' THEN 0 ELSE len(string_split(text, ' ')) END
      FROM ${csv('nodes.csv', "'id': 'BIGINT', 'sid': 'VARCHAR', 'kind': 'VARCHAR', 'path': 'VARCHAR', 'name': 'VARCHAR', 'ls': 'INTEGER', 'le': 'INTEGER', 'runtime': 'VARCHAR', 'slice': 'VARCHAR', 'is_test': 'INTEGER', 'file': 'BIGINT', 'tokens': 'INTEGER', 'text': 'VARCHAR'")} ORDER BY id`,
    'CREATE TABLE edge(src BIGINT, dst BIGINT, kid INTEGER, cid INTEGER, w DOUBLE, n_ev INTEGER, sym INTEGER)',
    `INSERT INTO edge SELECT e.src, e.dst, k.kid, c.cid, e.weight, e.n_ev, CASE WHEN e.kind = 'co_changed' THEN 1 ELSE 0 END
      FROM ${csv('edges.csv', "'kind': 'VARCHAR', 'class': 'VARCHAR', 'src': 'BIGINT', 'dst': 'BIGINT', 'weight': 'DOUBLE', 'n_ev': 'INTEGER'")} e
      JOIN ekind k ON k.name = e.kind JOIN eclass c ON c.name = e.class ORDER BY e.src, k.kid, e.dst`,
    `CREATE TABLE edge_ev AS SELECT * FROM ${csv('edge_ev.csv', "'src': 'BIGINT', 'dst': 'BIGINT', 'kid': 'INTEGER', 'path': 'VARCHAR', 'line': 'INTEGER', 'op': 'VARCHAR'")}`,
    // transport hubs (SPEC 5), independent of the configuration
    `UPDATE node SET transport = 1 WHERE kind IN ('runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref')
      OR (kind IN ('function', 'method', 'class') AND is_test = 0 AND id IN (
        SELECT e.dst FROM edge e JOIN node x ON x.id = e.src JOIN ekind k ON k.kid = e.kid
        WHERE k.name IN ('calls', 'depends_injects', 'passes_callable') AND e.sym = 0 AND x.is_test = 0 AND x.slice IS NOT NULL
        GROUP BY e.dst HAVING count(DISTINCT coalesce(x.runtime, 'null') || '/' || x.slice) >= 3))`,
    // production in-degree per class: target of an edge whose source is not a test; a symmetric edge
    // counts for both ends
    `CREATE TABLE deg AS SELECT node, cid, count(*)::INTEGER AS prod_in FROM (
        SELECT e.dst AS node, e.cid FROM edge e JOIN node s ON s.id = e.src WHERE s.is_test = 0
        UNION ALL SELECT e.src, e.cid FROM edge e JOIN node d ON d.id = e.dst WHERE e.sym = 1 AND d.is_test = 0)
      GROUP BY node, cid ORDER BY node, cid`,
    `CREATE TABLE term AS SELECT id AS node, t AS term, count(*)::INTEGER AS tf FROM (
        SELECT id, unnest(string_split(text, ' ')) AS t FROM node WHERE text IS NOT NULL AND text <> '') GROUP BY id, t ORDER BY term, node`,
    'CREATE TABLE df AS SELECT term, count(*)::INTEGER AS n FROM term GROUP BY term ORDER BY term',
    `CREATE TABLE cochange AS SELECT a, b, w FROM (SELECT src AS a, dst AS b, w FROM edge WHERE kid = ${kid.get('co_changed') || -1}
      UNION ALL SELECT dst, src, w FROM edge WHERE kid = ${kid.get('co_changed') || -1}) ORDER BY a, b`,
  ];
  for (const s of stmts) await db.run(s);
  T.load_ms = now() - t; t = now();
  // one typed label table per (kind, class)
  const kc = await db.all('SELECT DISTINCT k.name AS kind, c.name AS cls, e.kid, e.cid FROM edge e JOIN ekind k ON k.kid = e.kid JOIN eclass c ON c.cid = e.cid ORDER BY 1, 2');
  for (const r of kc) await db.run(`CREATE TABLE ${labelOf(r.kind, r.cls)} AS SELECT src, dst, w, n_ev FROM edge WHERE kid = ${r.kid} AND cid = ${r.cid} ORDER BY src, dst`);
  T.labels_ms = now() - t; t = now();
  // the arc table and the stored property graphs (addendum 3, C.6: built once per store)
  await db.run(`CREATE TABLE arc AS ${arcSelect(null)} ORDER BY src, kid, dst, o`);
  await db.run(`CREATE PROPERTY GRAPH g VERTEX TABLES (node) EDGE TABLES (${edgeTable('arc', 'arc')})`);
  const T_ = tqLabelDefs(kid);
  for (const [n, sql] of T_) await db.run(`CREATE TABLE ${n} AS ${sql} ORDER BY 1, 2`);
  const have = new Set(kc.map((r) => labelOf(r.kind, r.cls)));
  for (const k of TQ_SINGLE) if (!have.has('l_' + k)) await db.run(`CREATE TABLE l_${k}(src BIGINT, dst BIGINT, w DOUBLE, n_ev INTEGER)`);
  await db.run(`CREATE PROPERTY GRAPH gtq VERTEX TABLES (node) EDGE TABLES (${[...T_.map(([n]) => edgeTable(n, n)), ...TQ_SINGLE.map((k) => edgeTable('l_' + k, k))].join(', ')})`);
  T.graph_ms = now() - t; t = now();
  // load check against the canonical graph (counts and sums per kind, node text bytes)
  const chk = await db.all('SELECT k.name AS kind, count(*) AS n, sum(src) AS s, sum(dst) AS d, sum(w) AS w, sum(n_ev) AS ne FROM edge e JOIN ekind k USING (kid) GROUP BY 1 ORDER BY 1');
  const exp = new Map();
  for (const e of G.edges) { const x = exp.get(e.kind) || { n: 0, s: 0, d: 0, w: 0, ne: 0 }; x.n++; x.s += e.s; x.d += e.d; x.w += e.w; x.ne += e.n; exp.set(e.kind, x); }
  const bad = [];
  for (const r of chk) { const x = exp.get(r.kind); if (!x || x.n !== r.n || x.s !== r.s || x.d !== r.d || x.ne !== r.ne || Math.abs(x.w - r.w) > 1e-6) bad.push(r.kind); exp.delete(r.kind); }
  if (exp.size) bad.push(...exp.keys());
  const nchk = await db.one('SELECT count(*) AS n, sum(id) AS s, sum(strlen(coalesce(text, ""))) AS tb, sum(strlen(sid)) AS sb, sum(is_test) AS nt FROM node'.replace(/""/g, "''"));
  const enc = (s) => Buffer.byteLength(s || '', 'utf8');
  const ne = { n: G.nodes.length, s: G.nodes.reduce((a, n) => a + n.i, 0), tb: G.nodes.reduce((a, n) => a + enc(n.text), 0), sb: G.nodes.reduce((a, n) => a + enc(n.sid), 0), nt: G.nodes.reduce((a, n) => a + n.is_test, 0) };
  for (const k of Object.keys(ne)) if (ne[k] !== nchk[k]) bad.push('node.' + k + ' ' + ne[k] + ' vs ' + nchk[k]);
  const rid = await db.one('SELECT count(*) AS n FROM (SELECT rowid AS r, id FROM node) WHERE r <> id - 1');
  if (rid.n) bad.push('node rowid order');
  const ac = await db.one('SELECT count(*) AS n, sum(o) AS r, count(*) FILTER (sym = 1) AS s FROM arc');
  const nsym = G.edges.filter((e) => e.kind === 'co_changed').length;
  if (ac.n !== 2 * G.edges.length || ac.r !== G.edges.length - nsym || ac.s !== 2 * nsym) bad.push('arc counts ' + JSON.stringify(ac));
  const pg = await db.all('SELECT property_graph AS p, count(*) AS n FROM __duckpgq_internal GROUP BY 1 ORDER BY 1');
  if (pg.map((r) => r.p).join(',') !== 'g,gtq') bad.push('stored property graphs ' + JSON.stringify(pg));
  if (bad.length) { db.close(); throw new Error('duckpgq store load check failed: ' + bad.join(', ')); }
  T.check_ms = now() - t;
  const nt = await db.one('SELECT count(*) AS n, sum(dl) AS total FROM node');
  const meta = { store_version: STORE_VERSION, canon_hash: manifest.hash, sha: G.sha, removed: G.removed.join(','), loader_version: G.loader_version,
    extractor_version: G.meta.extractor_version, nodes: G.nodes.length, edges: G.edges.length, n_docs: nt.n, total_tokens: nt.total,
    labels: kc.length, ...Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(1)])) };
  await db.run('CREATE TABLE meta(k VARCHAR PRIMARY KEY, v VARCHAR)');
  await db.run('INSERT INTO meta VALUES ' + Object.entries(meta).map(([k, v]) => `(${lit(k)}, ${lit(v)})`).join(', '));
  await db.run('CHECKPOINT');
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(file + '.wal', { force: true });
  fs.renameSync(part, file);
  meta.bytes = fs.statSync(file).size;
  return meta;
}

module.exports = { STORE_VERSION, storeTag, storeFile, labelOf, connect, loadPgq, buildStore, lit, js, EXT_DIR, CLASS_COST, COST_FLOOR, tqLabelDefs, TQ_SINGLE, arcSelect };
