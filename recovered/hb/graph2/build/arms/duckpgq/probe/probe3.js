'use strict';
// Engine probe 3: how DuckPGQ rewrites a shortest-path query (to reach the weighted CSR functions), and
// whether cheapest_path_length (weighted shortest path) can be called on a CSR with DOUBLE weights.
const { DuckDBInstance } = require('@duckdb/node-api');
const J = (r) => JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
(async () => {
  const inst = await DuckDBInstance.create(':memory:');
  const c = await inst.connect();
  const q = async (x) => (await c.runAndReadAll(x)).getRowObjects();
  const t = async (label, x, n = 3000) => {
    try { const s = Date.now(); const r = await q(x); console.log('OK  ', label, (Date.now() - s) + 'ms', J(r).slice(0, n)); return r; } catch (e) { console.log('ERR ', label, String(e.message).split('\n').slice(0, 3).join(' | ').slice(0, 600)); return null; }
  };
  await q("SET extension_directory='/opt/eng/ext-duckdb'");
  await q('LOAD duckpgq'); await q("SET active_grammar_extensions=['duckpgq']");
  await q('create table n(id bigint primary key)');
  await q('insert into n select i from range(1, 7) t(i)');
  await q('create table e(src bigint, dst bigint, w double, wi bigint)');
  // 1->2 (1), 2->3 (1), 1->3 (5), 3->4 (1), 1->5 (0.5), 5->4 (0.5), 4->6 (2)
  await q('insert into e values (1,2,1,1),(2,3,1,1),(1,3,5,5),(3,4,1,1),(1,5,0.5,1),(5,4,0.5,1),(4,6,2,2)');
  await q('CREATE PROPERTY GRAPH g VERTEX TABLES (n) EDGE TABLES (e SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id) LABEL e)');
  const ex = null; await t('explain-skip', "EXPLAIN FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[r:e]->*(y:n) WHERE x.id = 1 COLUMNS (y.id AS y, path_length(p) AS len))");
  if (ex) for (const r of ex) console.log(String(r.explain_value || Object.values(r).join('\n')).slice(0, 6000));
  // try the low-level CSR API: vertex pass then edge pass with weights, then cheapest_path_length
  const V = '(SELECT count(*) FROM n)';
  const vtx = `CAST((SELECT sum(create_csr_vertex(7, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM n a LEFT JOIN e t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT)`;
  await t('csr weighted double (8 args)', `SELECT min(create_csr_edge(7, ${V}, ${vtx}, (SELECT count(*) FROM e t JOIN n a ON a.id = t.src JOIN n c ON c.id = t.dst), src.rowid, dst.rowid, t.rowid, t.w)) AS ok FROM e t JOIN n src ON t.src = src.id JOIN n dst ON t.dst = dst.id`);
  await t('w type', 'SELECT csr_get_w_type(7) AS wt');
  await t('cheapest from 1', `SELECT y.id AS y, cheapest_path_length(7, ${V}, x.rowid, y.rowid) AS cost FROM n x, n y WHERE x.id = 1 ORDER BY y.id`);
  await t('get_csr_w', 'FROM get_csr_w(7)');
  await t('delete', 'SELECT delete_csr(7)');
  await t('csr weighted bigint (8 args)', `SELECT min(create_csr_edge(8, ${V}, CAST((SELECT sum(create_csr_vertex(8, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM n a LEFT JOIN e t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT), (SELECT count(*) FROM e t JOIN n a ON a.id = t.src JOIN n c ON c.id = t.dst), src.rowid, dst.rowid, t.rowid, t.wi)) AS ok FROM e t JOIN n src ON t.src = src.id JOIN n dst ON t.dst = dst.id`);
  await t('cheapest bigint from 1', `SELECT y.id AS y, cheapest_path_length(8, ${V}, x.rowid, y.rowid) AS cost FROM n x, n y WHERE x.id = 1 ORDER BY y.id`);
  await t('csr unweighted (7 args)', `SELECT min(create_csr_edge(9, ${V}, CAST((SELECT sum(create_csr_vertex(9, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM n a LEFT JOIN e t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT), (SELECT count(*) FROM e t JOIN n a ON a.id = t.src JOIN n c ON c.id = t.dst), src.rowid, dst.rowid, t.rowid)) AS ok FROM e t JOIN n src ON t.src = src.id JOIN n dst ON t.dst = dst.id`);
  await t('iterativelength', `SELECT y.id AS y, iterativelength(9, ${V}, x.rowid, y.rowid) AS len FROM n x, n y WHERE x.id = 1 ORDER BY y.id`);
  await t('shortestpath', `SELECT y.id AS y, shortestpath(9, ${V}, x.rowid, y.rowid) AS p FROM n x, n y WHERE x.id = 1 ORDER BY y.id`);
  await t('pagerank scalar', `SELECT id, pagerank(9, rowid) pr FROM n ORDER BY id`);
  await t('wcc scalar', `SELECT id, weakly_connected_component(9, rowid) c FROM n ORDER BY id`);
  await t('lcc', "FROM local_clustering_coefficient('g', 'n', 'e')");
  await t('pagerank string args', "FROM pagerank('g', 'n', 'e') ORDER BY id");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
