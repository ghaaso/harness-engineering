'use strict';
// Throw-away engine probes for the one-file update measure (no arm store, no task): what LadybugDB and
// DuckDB accept. Inside graphtest:1: node /build/tmp/bench/update_probe.js
const fs = require('fs');
const out = {};
async function lb() {
  const lbug = require('@ladybugdb/core');
  const dir = '/tmp/upd-probe-lb'; for (const s of ['', '.wal', '.shadow']) fs.rmSync(dir + s, { recursive: true, force: true });
  const db = new lbug.Database(dir, 256 * 1024 * 1024, true, false, 2 ** 32); const c = new lbug.Connection(db);
  const all = (r) => { const rs = Array.isArray(r) ? r : [r]; const rows = rs[rs.length - 1].getAllSync(); for (const x of rs) x.close(); return rows; };
  const run = (s) => all(c.querySync(s));
  const ex = (s, p) => { const ps = c.prepareSync(s); return all(c.executeSync(ps, p)); };
  run('CREATE NODE TABLE N(id INT64, sid STRING, ls INT64, text STRING, dl INT64 DEFAULT 0, transport BOOLEAN DEFAULT false, prank DOUBLE DEFAULT 0, PRIMARY KEY(id))');
  run('CREATE REL TABLE A(FROM N TO N, w DOUBLE, n INT64, kid INT64)');
  const r = {};
  try { ex('CREATE (n:N {id: $id, sid: $sid, ls: $ls, text: $text})', { id: 1, sid: "a'b\"c\\d\ne", ls: 5, text: 'x y' }); r.create_params = 'ok'; } catch (e) { r.create_params = String(e.message).slice(0, 200); }
  try { ex('CREATE (n:N {id: $id, sid: $sid})', { id: 2, sid: 'b' }); r.create_omit = 'ok'; } catch (e) { r.create_omit = String(e.message).slice(0, 200); }
  try { r.defaults = run('MATCH (n:N) WHERE n.id = 2 RETURN n.dl AS dl, n.transport AS t, n.prank AS p, n.ls AS ls'); } catch (e) { r.defaults = String(e.message).slice(0, 200); }
  try { ex('CREATE (n:N {id: $id, sid: $sid, ls: $ls})', { id: 3, sid: 'c', ls: null }); r.create_null = 'ok'; } catch (e) { r.create_null = String(e.message).slice(0, 200); }
  try { ex('MATCH (a:N {id: $s}), (b:N {id: $d}) CREATE (a)-[:A {w: $w, n: $n, kid: $k}]->(b)', { s: 1, d: 2, w: 1, n: 2, k: 3 }); r.rel_params = 'ok'; } catch (e) { r.rel_params = String(e.message).slice(0, 200); }
  try { r.rel_back = run('MATCH (a:N)-[e:A]->(b:N) RETURN a.id AS a, b.id AS b, e.w AS w'); } catch (e) { r.rel_back = String(e.message).slice(0, 200); }
  try { ex('UNWIND $rows AS x MATCH (a:N {id: x[1]}), (b:N {id: x[2]}) CREATE (a)-[:A {w: 0.5, n: 1, kid: 1}]->(b)', { rows: [[2, 1], [1, 2]] }); r.unwind_list_param = 'ok'; } catch (e) { r.unwind_list_param = String(e.message).slice(0, 200); }
  try { ex('UNWIND $rows AS x MATCH (a:N {id: x.s}), (b:N {id: x.d}) CREATE (a)-[:A {w: x.w, n: 1, kid: 1}]->(b)', { rows: [{ s: 2, d: 1, w: 0.25 }] }); r.unwind_struct_param = 'ok'; } catch (e) { r.unwind_struct_param = String(e.message).slice(0, 200); }
  try { run('LOAD EXTENSION algo'); run('LOAD EXTENSION algo'); r.load_twice = 'ok'; } catch (e) { r.load_twice = String(e.message).slice(0, 200); }
  try { run('BEGIN TRANSACTION'); ex('CREATE (n:N {id: $id, sid: $sid})', { id: 9, sid: 'z' }); run('COMMIT'); r.txn = 'ok'; } catch (e) { r.txn = String(e.message).slice(0, 200); }
  try { run('MATCH (n:N) WHERE n.id IN [1] DETACH DELETE n'); r.detach = run('MATCH ()-[e:A]->() RETURN count(e) AS c'); } catch (e) { r.detach = String(e.message).slice(0, 200); }
  try { run("CALL PROJECT_GRAPH('p1', ['N'], ['A'])"); run("CALL PROJECT_GRAPH('p2', ['N'], ['A'])"); run("CALL DROP_PROJECTED_GRAPH('p1')"); r.project_drop = 'ok'; } catch (e) { r.project_drop = String(e.message).slice(0, 200); }
  c.closeSync(); db.closeSync(); for (const s of ['', '.wal', '.shadow']) fs.rmSync(dir + s, { recursive: true, force: true });
  out.ladybug = r;
}
async function duck() {
  const { DuckDBInstance } = require('@duckdb/node-api');
  const f = '/tmp/upd-probe.duckdb'; fs.rmSync(f, { force: true }); fs.rmSync(f + '.wal', { force: true });
  let inst = await DuckDBInstance.create(f); let c = await inst.connect();
  const run = async (s) => c.run(s); const all = async (s) => (await c.runAndReadAll(s)).getRowObjectsJS();
  const r = {};
  await run("SET extension_directory='/opt/eng/ext-duckdb'"); await run('LOAD duckpgq'); await run("SET active_grammar_extensions=['duckpgq']");
  await run('CREATE TABLE node(id BIGINT PRIMARY KEY, name VARCHAR)');
  await run("INSERT INTO node VALUES (1,'a'),(2,'b'),(3,'c')");
  await run('CREATE TABLE arc(src BIGINT, dst BIGINT)'); await run('INSERT INTO arc VALUES (1,2),(2,3)');
  await run('CREATE PROPERTY GRAPH g VERTEX TABLES (node) EDGE TABLES (arc SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL arc)');
  try { await run('BEGIN'); await run('DELETE FROM node WHERE id = 2'); await run("INSERT INTO node VALUES (2,'b')"); await run('COMMIT'); r.pk_reinsert_txn = 'ok'; } catch (e) { r.pk_reinsert_txn = String(e.message).slice(0, 200); try { await run('ROLLBACK'); } catch (e2) { /* none */ } }
  r.rowids_after = await all('SELECT rowid AS r, id FROM node ORDER BY id');
  try {
    await run('CREATE TABLE node__new(id BIGINT PRIMARY KEY, name VARCHAR)'); await run('INSERT INTO node__new SELECT * FROM node ORDER BY id');
    await run('DROP TABLE node'); await run('ALTER TABLE node__new RENAME TO node'); r.rewrite = 'ok';
  } catch (e) { r.rewrite = String(e.message).slice(0, 200); }
  r.rowids_rewrite = await all('SELECT rowid AS r, id FROM node ORDER BY id');
  await run('CHECKPOINT'); c.closeSync(); inst.closeSync();
  inst = await DuckDBInstance.create(f, { access_mode: 'READ_ONLY' }); c = await inst.connect();
  await c.run("SET extension_directory='/opt/eng/ext-duckdb'"); await c.run('LOAD duckpgq'); await c.run("SET active_grammar_extensions=['duckpgq']");
  try { r.pgq_after_rewrite = (await c.runAndReadAll('SELECT * FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc]->{1,3}(b:node) COLUMNS (a.id AS a, b.id AS b)) ORDER BY 1, 2')).getRowObjectsJS(); } catch (e) { r.pgq_after_rewrite = String(e.message).slice(0, 200); }
  c.closeSync(); inst.closeSync(); fs.rmSync(f, { force: true }); fs.rmSync(f + '.wal', { force: true });
  out.duckdb = r;
}
(async () => { await lb(); await duck(); console.log(JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 1)); })().catch((e) => { console.error(e); process.exit(1); });
