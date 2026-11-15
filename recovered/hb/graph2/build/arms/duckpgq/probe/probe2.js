'use strict';
// Engine probe 2: the extension's function catalogue, hop caps, path ids, transactions, CSR reuse,
// recursive CTE features, reverse/undirected details.
const { DuckDBInstance } = require('@duckdb/node-api');
const J = (r) => JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
(async () => {
  const inst = await DuckDBInstance.create(':memory:');
  const c = await inst.connect();
  const q = async (x) => (await c.runAndReadAll(x)).getRowObjects();
  const t = async (label, x, n = 900) => {
    try { const s = Date.now(); const r = await q(x); console.log('OK  ', label, (Date.now() - s) + 'ms', J(r).slice(0, n)); return r; } catch (e) { console.log('ERR ', label, String(e.message).split('\n')[0].slice(0, 400)); return null; }
  };
  await q("SET extension_directory='/opt/eng/ext-duckdb'");
  const before = new Set((await q('select distinct function_name from duckdb_functions()')).map((r) => r.function_name));
  await q('LOAD duckpgq');
  const after = await q('select function_name, function_type, parameters::varchar p, parameter_types::varchar pt, return_type from duckdb_functions()');
  const added = after.filter((r) => !before.has(r.function_name));
  console.log('FUNCTIONS ADDED BY duckpgq:', added.length);
  for (const r of added) console.log('  ', r.function_type, r.function_name, r.p, r.pt, '->', r.return_type);
  await q("SET active_grammar_extensions=['duckpgq']");
  // ids 10..17, rows inserted in shuffled order
  await q('create table n(id bigint primary key, blocked int)');
  await q('insert into n values (13,0),(10,0),(11,0),(12,1),(14,0),(15,0),(16,0),(17,0)');
  await q('create table ea(src bigint, dst bigint, kid int)');
  // chain 10->11->12->13->14->15->16->17 plus 11->14
  await q('insert into ea values (16,17,2),(10,11,1),(11,12,1),(12,13,1),(13,14,1),(14,15,1),(15,16,1),(11,14,3)');
  await q('CREATE PROPERTY GRAPH g VERTEX TABLES (n) EDGE TABLES (ea SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id) LABEL a)');
  await t('ids in paths', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len, vertices(p) AS vs, edges(p) AS es)) ORDER BY y');
  await t('rowids', 'SELECT rowid, * FROM n');
  await t('cap {1,2}', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,2}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await t('cap {1,3}', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,3}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await t('no path mode {1,3}', 'FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]->{1,3}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y)) ORDER BY y');
  await t('+ long', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->+(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await t('{1,} ', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await q('create table seeds(id bigint)'); await q('insert into seeds values (10),(13)');
  await t('sources from subquery', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id IN (SELECT id FROM seeds) COLUMNS (x.id AS x, y.id AS y, path_length(p) AS len)) ORDER BY y, x');
  await t('join with seeds outside', 'SELECT g.* FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) COLUMNS (x.id AS x, y.id AS y, path_length(p) AS len)) g JOIN seeds s ON s.id = g.x ORDER BY y, x');
  await t('edge cols in quantified', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, e.kid AS k)) ORDER BY y');
  // transaction visibility: insert an edge inside a transaction, query, roll back
  await q('BEGIN');
  await q('insert into ea values (10,17,9)');
  await t('in txn after insert', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await q('ROLLBACK');
  await t('after rollback', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len)) ORDER BY y');
  await t('delete inside txn', 'BEGIN; DELETE FROM ea WHERE src = 11 AND dst = 14;');
  await t('in txn after delete', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,9}(y:n) WHERE x.id = 10 COLUMNS (y.id AS y, path_length(p) AS len, edges(p) AS es)) ORDER BY y');
  await q('ROLLBACK');
  await t('undirected quant from 14', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]-{1,2}(y:n) WHERE x.id = 14 COLUMNS (y.id AS y, path_length(p) AS len, vertices(p) vs, edges(p) es)) ORDER BY y');
  await t('fixed 2-hop walk', 'FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]->(m:n)-[f:a]->(y:n) WHERE x.id = 10 COLUMNS (m.id AS m, y.id AS y, e.kid ek, f.kid fk))');
  await t('fixed undirected walk repeats', 'FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]-(m:n)-[f:a]-(y:n) WHERE x.id = 11 COLUMNS (m.id AS m, y.id AS y))');
  await t('fixed pattern with two labels', 'CREATE TABLE eb AS SELECT * FROM ea WHERE kid = 3');
  await t('alter pg add edge table', 'ALTER PROPERTY GRAPH g ADD EDGE TABLES (eb SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id) LABEL b)');
  await t('fixed pattern a then b', 'FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]->(m:n)-[f:b]->(y:n) COLUMNS (x.id x, m.id AS m, y.id AS y))');
  await t('quant then fixed', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,3}(m:n)-[f:b]->(y:n) WHERE x.id = 10 COLUMNS (m.id AS m, y.id AS y))');
  await t('fixed then quant', 'FROM GRAPH_TABLE (g MATCH (x:n)-[f:b]->(m:n)-[e:a]->{1,3}(y:n) WHERE x.id = 11 COLUMNS (m.id AS m, y.id AS y))');
  await t('fixed then quant with p', 'FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[f:b]->(m:n)-[e:a]->{1,3}(y:n) WHERE x.id = 11 COLUMNS (m.id AS m, y.id AS y, path_length(p) len))');
  await t('two graph_tables union', "SELECT * FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]->(y:n) WHERE x.id = 10 COLUMNS (y.id AS y)) UNION ALL SELECT * FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (x:n)-[e:a]->{1,2}(y:n) WHERE x.id = 13 COLUMNS (y.id AS y))");
  await t('pagerank signature with damping?', 'FROM pagerank(g, n, a, 0.5)');
  await t('wcc', 'FROM weakly_connected_component(g, n, a)');
  // recursive CTE features
  await t('recursive aggregate', 'WITH RECURSIVE r(it, id, p) AS (SELECT 0, id, CASE WHEN id = 10 THEN 1.0 ELSE 0.0 END FROM n UNION ALL SELECT r.it + 1, ea.dst, SUM(r.p) FROM r JOIN ea ON ea.src = r.id WHERE r.it < 3 GROUP BY r.it, ea.dst) SELECT * FROM r ORDER BY it, id');
  await t('recurring', 'WITH RECURSIVE r(id, d) USING KEY (id) AS (SELECT 10, 0 UNION SELECT ea.dst, r.d + 1 FROM r JOIN ea ON ea.src = r.id WHERE ea.dst NOT IN (SELECT id FROM recurring.r)) SELECT * FROM r ORDER BY id');
  await t('grammar off', "SET active_grammar_extensions=[]");
  await t('sql with any after grammar off', "select 1 where 'ab' ilike any (['a%'])");
  await t('graph table after grammar off', 'FROM GRAPH_TABLE (g MATCH (x:n)-[e:a]->(y:n) WHERE x.id = 10 COLUMNS (y.id AS y))');
  await t('threads', "select current_setting('threads') t, current_setting('memory_limit') m");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
