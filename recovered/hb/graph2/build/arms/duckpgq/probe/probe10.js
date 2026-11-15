'use strict';
// Engine probe 10 (addendum 3, C.6): can a DuckPGQ property graph be stored in the database file at
// build time and used later (read-write open, read-only open, read-only ATTACH)? Plus: edge element
// filters in fixed-length patterns, subqueries in a vertex element filter, temp tables and temp
// property graphs in a read-only database, native routines over a stored graph.
const fs = require('fs');
const S_ = require('../store');
const t = async (db, label, sql) => {
  try { const s = Date.now(); const r = await db.all(sql); console.log('OK ', label, (Date.now() - s) + 'ms', JSON.stringify(r.slice(0, 4))); return r; } catch (e) { console.log('ERR', label, String(e.message).split('\n')[0].slice(0, 260)); return null; }
};
(async () => {
  const f = '/tmp/probe10.duckdb'; for (const x of [f, f + '.wal']) fs.rmSync(x, { force: true });
  let db = await S_.connect(f); await S_.loadPgq(db);
  await db.run('CREATE TABLE node(id BIGINT PRIMARY KEY, name VARCHAR)');
  await db.run("INSERT INTO node SELECT i, 'n' || i FROM range(1, 9) t(i)");
  await db.run('CREATE TABLE arc(src BIGINT, dst BIGINT, k INTEGER, w DOUBLE)');
  await db.run('INSERT INTO arc VALUES (1,2,1,1.0),(2,3,1,1.0),(3,4,2,0.4),(4,5,1,1.0),(5,6,2,1.0),(6,7,1,1.0),(7,8,1,1.0),(1,5,2,0.9)');
  await t(db, 'create pg (build)', 'CREATE PROPERTY GRAPH g VERTEX TABLES (node) EDGE TABLES (arc SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL arc)');
  await t(db, 'internal table', 'SELECT * FROM __duckpgq_internal LIMIT 3');
  await db.run('CHECKPOINT'); db.close();

  console.log('--- reopen read-write');
  db = await S_.connect(f); await S_.loadPgq(db);
  await t(db, 'rw one-edge', 'SELECT * FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc]->(b:node) COLUMNS (a.id AS u, b.id AS v)) ORDER BY 1, 2 LIMIT 3');
  db.close();

  console.log('--- reopen read-only (main)');
  db = await S_.connect(f, { config: { access_mode: 'READ_ONLY' } }); await S_.loadPgq(db);
  await t(db, 'ro one-edge', 'SELECT count(*) AS n FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc]->(b:node) COLUMNS (a.id AS u, b.id AS v))');
  await t(db, 'ro edge filter in fixed pattern', 'SELECT * FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc WHERE e.k = 2 AND e.w >= 0.5]->(b:node) COLUMNS (a.id AS u, b.id AS v)) ORDER BY 1, 2');
  await t(db, 'ro quantified reach', 'SELECT * FROM GRAPH_TABLE (g MATCH (a:node WHERE a.id = 1)-[e:arc]->{1,3}(b:node) COLUMNS (b.id AS v)) ORDER BY 1');
  await t(db, 'ro pagerank on stored graph', "SELECT * FROM pagerank('g', 'node', 'arc') ORDER BY 1 LIMIT 3");
  await t(db, 'ro temp table', 'CREATE TEMP TABLE tf AS SELECT 1::BIGINT AS v UNION ALL SELECT 4');
  await t(db, 'ro subquery in vertex filter', 'SELECT * FROM GRAPH_TABLE (g MATCH (a:node WHERE a.id IN (SELECT v FROM tf))-[e:arc]->(b:node) COLUMNS (a.id AS u, b.id AS v)) ORDER BY 1, 2');
  await t(db, 'ro temp pg over temp table', 'CREATE PROPERTY GRAPH gt VERTEX TABLES (node) EDGE TABLES (tf2 SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL tf2)');
  await t(db, 'ro create temp arc', 'CREATE TEMP TABLE tf2 AS SELECT src, dst FROM arc WHERE k = 1');
  await t(db, 'ro temp pg over temp table (after)', 'CREATE PROPERTY GRAPH gt VERTEX TABLES (node) EDGE TABLES (tf2 SOURCE KEY (src) REFERENCES node (id) DESTINATION KEY (dst) REFERENCES node (id) LABEL tf2)');
  await t(db, 'ro csr over filtered subquery', `WITH csr AS MATERIALIZED (SELECT count(create_csr_edge(0, (SELECT count(*) FROM node),
      CAST((SELECT sum(create_csr_vertex(0, (SELECT count(*) FROM node), sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM node a LEFT JOIN (SELECT * FROM arc WHERE k = 1) t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT),
      (SELECT count(*) FROM arc WHERE k = 1), src.rowid, dst.rowid, t.r)) AS temp FROM (SELECT *, row_number() OVER () - 1 AS r FROM arc WHERE k = 1) t JOIN node src ON t.src = src.id JOIN node dst ON t.dst = dst.id)
    SELECT y.id, iterativelength(0, (SELECT count(*) FROM node), x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM node WHERE id = 1) x, node y ORDER BY 1`);
  db.close();

  console.log('--- in-memory + ATTACH read-only');
  db = await S_.connect(':memory:'); await S_.loadPgq(db);
  await db.run(`ATTACH '${f}' AS st (READ_ONLY)`);
  await t(db, 'attach: g', 'SELECT count(*) AS n FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc]->(b:node) COLUMNS (a.id AS u))');
  await t(db, 'attach: st.g', 'SELECT count(*) AS n FROM GRAPH_TABLE (st.g MATCH (a:node)-[e:arc]->(b:node) COLUMNS (a.id AS u))');
  await db.run('USE st');
  await t(db, 'attach + USE st: g', 'SELECT count(*) AS n FROM GRAPH_TABLE (g MATCH (a:node)-[e:arc]->(b:node) COLUMNS (a.id AS u))');
  db.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
