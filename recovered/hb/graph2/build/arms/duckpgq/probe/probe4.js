'use strict';
// Engine probe 4: attached read-only store, qualified table names in a property graph, persistence of a
// property graph definition, rowid joins on temp tables, quantified-then-fixed patterns, JS conversion.
const fs = require('fs');
const { DuckDBInstance } = require('@duckdb/node-api');
const J = (r) => JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
(async () => {
  const f = '/tmp/p4.duckdb'; fs.rmSync(f, { force: true });
  {
    const inst = await DuckDBInstance.create(f);
    const c = await inst.connect();
    const q = async (x) => (await c.runAndReadAll(x)).getRowObjectsJS();
    await q("SET extension_directory='/opt/eng/ext-duckdb'"); await q('LOAD duckpgq'); await q("SET active_grammar_extensions=['duckpgq']");
    await q('create table node(id bigint primary key, kind varchar, is_test int)');
    await q("insert into node select i, CASE WHEN i % 3 = 0 THEN 'route' ELSE 'function' END, (i = 5)::int from range(1, 11) t(i)");
    await q('create table e_calls(src bigint, dst bigint, w double)');
    await q('insert into e_calls values (1,2,1),(2,3,1),(3,4,1),(4,5,1),(5,6,1),(2,7,0.3)');
    await q('create table e_url(src bigint, dst bigint, w double)');
    await q('insert into e_url values (7,9,1),(4,6,1)');
    await q('CREATE PROPERTY GRAPH gfull VERTEX TABLES (node) EDGE TABLES (e_calls SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL calls, e_url SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL url)');
    console.log('tables in file', J(await q("select table_name from information_schema.tables")));
    c.closeSync ? c.closeSync() : null; inst.closeSync ? inst.closeSync() : null;
  }
  const inst = await DuckDBInstance.create(':memory:', { threads: '4' });
  const c = await inst.connect();
  const q = async (x) => (await c.runAndReadAll(x)).getRowObjectsJS();
  const t = async (label, x, n = 900) => {
    try { const s = Date.now(); const r = await q(x); console.log('OK  ', label, (Date.now() - s) + 'ms', J(r).slice(0, n)); return r; } catch (e) { console.log('ERR ', label, String(e.message).split('\n').slice(0, 2).join(' | ').slice(0, 500)); return null; }
  };
  await q("SET extension_directory='/opt/eng/ext-duckdb'"); await q('LOAD duckpgq'); await q("SET active_grammar_extensions=['duckpgq']");
  await t('attach ro', `ATTACH '${f}' AS st (READ_ONLY)`);
  await t('pg list in attached', 'FROM st.__duckpgq_internal');
  await t('query persisted pg (main mem)', 'FROM GRAPH_TABLE (gfull MATCH (a:node)-[e:calls]->(b:node) COLUMNS (a.id AS a, b.id AS b))');
  await t('pg over qualified attached tables', 'CREATE PROPERTY GRAPH g2 VERTEX TABLES (st.node) EDGE TABLES (st.e_calls SOURCE KEY (src) REFERENCES st.node (id) DESTINATION KEY (dst) REFERENCES st.node (id) LABEL calls)');
  await t('query g2', 'FROM GRAPH_TABLE (g2 MATCH p = ANY SHORTEST (a:node)-[e:calls]->{1,3}(b:node) WHERE a.id = 1 COLUMNS (b.id AS b, path_length(p) len))');
  await t('use st', 'USE st');
  await t('pg after USE st (read only)', 'CREATE PROPERTY GRAPH g3 VERTEX TABLES (node) EDGE TABLES (e_calls SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL calls)');
  await t('use memory', 'USE memory');
  await t('temp copy', 'CREATE TEMP TABLE vnode AS SELECT id, kind, is_test FROM st.node ORDER BY id');
  await t('temp pk?', 'CREATE TEMP TABLE vnode2 (id BIGINT PRIMARY KEY, kind VARCHAR, is_test INT)');
  await t('temp fill', 'INSERT INTO vnode2 SELECT id, kind, is_test FROM st.node ORDER BY id');
  await t('temp edges', 'CREATE TEMP TABLE pc AS SELECT src, dst, 1 AS kid FROM st.e_calls WHERE w >= 0.5 UNION ALL SELECT src, dst, 2 FROM st.e_url');
  await t('pg over temp (no pk vertex)', 'CREATE PROPERTY GRAPH g4 VERTEX TABLES (vnode) EDGE TABLES (pc SOURCE KEY (src) REFERENCES vnode (id) DESTINATION KEY (dst) REFERENCES vnode (id) LABEL pc)');
  await t('query g4', 'FROM GRAPH_TABLE (g4 MATCH p = ANY SHORTEST (a:vnode)-[e:pc]->{1,5}(b:vnode) WHERE a.id IN (1, 4) COLUMNS (a.id AS a, b.id AS b, path_length(p) len, vertices(p) vs, edges(p) es))');
  await t('pg over temp pk vertex', 'CREATE PROPERTY GRAPH g5 VERTEX TABLES (vnode2) EDGE TABLES (pc SOURCE KEY (src) REFERENCES vnode2 (id) DESTINATION KEY (dst) REFERENCES vnode2 (id) LABEL pc)');
  await t('rowid join temp', `WITH x AS (FROM GRAPH_TABLE (g5 MATCH p = ANY SHORTEST (a:vnode2)-[e:pc]->{1,5}(b:vnode2) WHERE a.id = 1 COLUMNS (b.id AS b, edges(p) es)))
     SELECT x.b, list(pc.kid ORDER BY u.i) AS kinds FROM x, unnest(x.es) WITH ORDINALITY AS u(r, i) JOIN pc ON pc.rowid = u.r GROUP BY x.b ORDER BY x.b`);
  await t('rowid join temp v2', `WITH x AS (FROM GRAPH_TABLE (g5 MATCH p = ANY SHORTEST (a:vnode2)-[e:pc]->{1,5}(b:vnode2) WHERE a.id = 1 COLUMNS (b.id AS b, edges(p) es))),
     y AS (SELECT b, unnest(es) AS r, generate_subscripts(es, 1) AS i FROM x)
     SELECT y.b, list(pc.kid ORDER BY y.i) AS kinds FROM y JOIN pc ON pc.rowid = y.r GROUP BY y.b ORDER BY y.b`);
  await t('quant then fixed', 'FROM GRAPH_TABLE (gfull MATCH p = ANY SHORTEST (a:node)-[e:calls]->{0,5}(m:node)-[u:url]->(b:node) WHERE a.id = 1 COLUMNS (m.id AS m, b.id AS b))');
  await t('quant then fixed no p', 'FROM GRAPH_TABLE (gfull MATCH (a:node)-[e:calls]->{0,5}(m:node)-[u:url]->(b:node) WHERE a.id = 1 COLUMNS (m.id AS m, b.id AS b))');
  await t('fixed left then quant', 'FROM GRAPH_TABLE (gfull MATCH (b:node)<-[u:url]-(m:node)-[e:calls]->{0,5}(a:node) WHERE b.id = 9 COLUMNS (m.id AS m, a.id AS a))');
  await t('vertex filter in source element', "FROM GRAPH_TABLE (gfull MATCH p = ANY SHORTEST (a:node WHERE a.kind = 'function')-[e:calls]->{1,2}(b:node WHERE b.kind = 'route') WHERE a.id < 3 COLUMNS (a.id AS a, b.id AS b))");
  await t('list types', "SELECT [1,2,3]::BIGINT[] AS l, {'a': 1} AS s");
  await t('recursive two refs', 'WITH RECURSIVE r(it, v, p) AS (SELECT 0, 1, 1.0 UNION ALL SELECT r.it + 1, e.dst, r.p * (SELECT count(*) FROM r) FROM r JOIN st.e_calls e ON e.src = r.v WHERE r.it < 3) SELECT * FROM r');
  await t('recursive using key + recurring', `WITH RECURSIVE b(v, s, d, par) USING KEY (v, s) AS (SELECT 1::BIGINT, 0, 0, NULL::STRUCT(u BIGINT, k INT, su INT)
     UNION SELECT e.dst, b.s + 1, min(b.d) + 1, min({'u': b.v, 'k': 1, 'su': b.s}) FROM b JOIN st.e_calls e ON e.src = b.v
     WHERE b.s < 3 AND NOT EXISTS (SELECT 1 FROM recurring.b r WHERE r.v = e.dst AND r.s = b.s + 1) GROUP BY e.dst, b.s + 1) SELECT * FROM b ORDER BY v, s`);
  await t('pagerank on temp pg', "FROM pagerank('g5', 'vnode2', 'pc') ORDER BY id");
  await t('wcc on temp pg', "FROM weakly_connected_component('g5', 'vnode2', 'pc') ORDER BY id");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
