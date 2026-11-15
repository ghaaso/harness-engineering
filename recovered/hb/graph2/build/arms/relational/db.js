'use strict';
// Build (load) the SQLite store for one commit from the canonical graph G, and open it.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { CLASSES, STRUCTURAL, maskOf } = require('../common/edgeclasses');
const { PPR_ITERS, SHARED_DEFAULTS } = require('../common/config');
const { BASE } = require('./sweep');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const CLOSURE_CLASSES = BASE.classes;   // the sweep's base mask
const CLOSURE_K = 3;
const CLOSURE_MINC = SHARED_DEFAULTS.minConf; // the closure is used only when the configuration has this minConf

function now() { return Number(process.hrtime.bigint() / 1000n) / 1000; }

function buildDb(G, file, opts = {}) {
  const T = {}; let t = now();
  for (const f of [file, file + '-wal', file + '-shm']) if (fs.existsSync(f)) fs.rmSync(f);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA page_size = 4096; PRAGMA journal_mode = WAL; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;');
  db.exec(SCHEMA);
  db.exec('BEGIN');
  const ins = (sql) => db.prepare(sql);
  const nkinds = [...new Set(G.nodes.map((n) => n.kind))].sort();
  const iK = ins('INSERT INTO nkind VALUES (?, ?)'); nkinds.forEach((k, i) => iK.run(i + 1, k));
  const kidOf = new Map(nkinds.map((k, i) => [k, i + 1]));
  const iC = ins('INSERT INTO eclass VALUES (?, ?, ?)'); CLASSES.forEach((c, i) => iC.run(i, c, STRUCTURAL.has(c) ? 1 : 0));
  const iE = ins('INSERT INTO ekind VALUES (?, ?)'); G.kinds.forEach((k, i) => iE.run(i + 1, k));
  const iN = ins('INSERT INTO node(id,sid,kid,path,name,ls,le,signature,runtime,slice,is_test,tokens,file_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const iF = ins('INSERT INTO fts(rowid, body) VALUES (?, ?)');
  for (const n of G.nodes) {
    iN.run(n.i, n.sid, kidOf.get(n.kind), n.path, n.name, n.ls, n.le, n.signature, n.runtime, n.slice, n.is_test, n.tokens, n.file);
    iF.run(n.i, n.text);
  }
  const iEd = ins('INSERT INTO edge VALUES (?,?,?,?,?,?,?)');
  const iEv = ins('INSERT INTO edge_ev VALUES (?,?,?,?,?,?)');
  const iCc = ins('INSERT INTO cochange VALUES (?,?,?,?,?)');
  for (const e of G.edges) {
    iEd.run(e.s, e.k, e.d, e.c, e.w, e.n, e.sym);
    if (e.sym) iEd.run(e.d, e.k, e.s, e.c, e.w, e.n, 1);
    for (const [p, l, op] of e.evs) iEv.run(e.s, e.k, e.d, p, l, op);
    if (e.kind === 'co_changed') { iCc.run(e.s, e.d, e.support, e.w, e.recency); iCc.run(e.d, e.s, e.support, e.w, e.recency); }
  }
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('sha', G.sha);
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('closure_mask', String(maskOf(CLOSURE_CLASSES)));
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('closure_k', String(CLOSURE_K));
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('closure_minc', String(CLOSURE_MINC));
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('loader_version', String(G.loader_version));
  db.exec('COMMIT');
  T.load = now() - t; t = now();
  derive(db);
  T.derive = now() - t; t = now();
  db.exec('ANALYZE; PRAGMA optimize;');
  db.exec("INSERT INTO fts(fts) VALUES ('optimize')");
  db.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE; VACUUM;');
  T.analyze_vacuum = now() - t;
  db.close();
  return T;
}

// Derived tables and stored rank columns, all in SQL.
function derive(db) {
  db.exec('BEGIN');
  db.exec(`INSERT INTO deg
    SELECT node, cid, SUM(o), SUM(i), SUM(p) FROM (
      SELECT src AS node, cid, 1 AS o, 0 AS i, 0 AS p FROM edge
      UNION ALL
      SELECT e.dst, e.cid, 0, 1, 1 - n.is_test FROM edge e JOIN node n ON n.id = e.src
    ) GROUP BY node, cid`);
  db.exec(`UPDATE node SET prod_in = COALESCE((SELECT SUM(d.prod_in) FROM deg d JOIN eclass c ON c.cid = d.cid
    WHERE d.node = node.id AND c.structural = 0), 0)`);
  db.exec(`UPDATE node SET transport = 1 WHERE
      kid IN (SELECT kid FROM nkind WHERE name IN ('runtime','slice','invariant_group','ambiguous_ref','missing_ref'))
   OR (kid IN (SELECT kid FROM nkind WHERE name IN ('function','method','class')) AND is_test = 0 AND
      (SELECT COUNT(DISTINCT COALESCE(x.runtime, 'null') || '/' || x.slice) FROM edge e JOIN node x ON x.id = e.src
        WHERE e.dst = node.id AND e.ekid IN (SELECT ekid FROM ekind WHERE name IN ('calls','depends_injects','passes_callable'))
          AND x.is_test = 0 AND x.slice IS NOT NULL) >= 3)`);
  // bounded closure, dependencies direction, depth-capped recursive CTE with set semantics
  const mask = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_mask'").get().v);
  const K = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_k'").get().v);
  const minc = Number(db.prepare("SELECT v FROM meta WHERE k = 'closure_minc'").get().v);
  db.prepare(`INSERT INTO closure
    WITH RECURSIVE c(src, dst, d) AS (
      SELECT id, id, 0 FROM node
      UNION
      SELECT c.src, e.dst, c.d + 1 FROM c JOIN edge e ON e.src = c.dst
       WHERE c.d < $K AND ((1 << e.cid) & $mask) != 0 AND e.w >= $minc
    )
    SELECT src, dst, MIN(d) FROM c WHERE src <> dst GROUP BY src, dst`).run({ K, mask, minc });
  db.exec('COMMIT');
  globalPageRank(db);
}

// Global PageRank (dependencies direction, all edges, restart 0.15, uniform teleport, dangling mass
// spread uniformly), iterated over SQL rows; stored in node.pagerank.
function globalPageRank(db, alpha = 0.15) {
  db.exec(`CREATE TEMP TABLE IF NOT EXISTS gtr(u INTEGER, v INTEGER, p REAL, PRIMARY KEY(u, v)) WITHOUT ROWID;
    CREATE TEMP TABLE IF NOT EXISTS gp(node INTEGER PRIMARY KEY, s REAL);
    CREATE TEMP TABLE IF NOT EXISTS gq(node INTEGER PRIMARY KEY, s REAL);
    DELETE FROM gtr; DELETE FROM gp;`);
  db.exec(`INSERT INTO gtr SELECT u, v, ws / SUM(ws) OVER (PARTITION BY u) FROM
    (SELECT src AS u, dst AS v, SUM(w) AS ws FROM edge GROUP BY src, dst)`);
  const N = db.prepare('SELECT COUNT(*) n FROM node').get().n;
  db.prepare('INSERT INTO gp SELECT id, 1.0 / $N FROM node').run({ N });
  const step = db.prepare(`INSERT INTO gq SELECT t.v, SUM(p.s * t.p) * (1 - $a) FROM gp p JOIN gtr t ON t.u = p.node GROUP BY t.v`);
  const dang = db.prepare('SELECT COALESCE(SUM(s), 0) d FROM gp WHERE node NOT IN (SELECT u FROM gtr)');
  const add = db.prepare(`INSERT INTO gq(node, s) SELECT id, ($a + (1 - $a) * $dm) / $N FROM node WHERE true
    ON CONFLICT(node) DO UPDATE SET s = s + excluded.s`);
  db.exec('BEGIN');
  for (let it = 0; it < PPR_ITERS; it++) {
    const dm = dang.get().d;
    db.exec('DELETE FROM gq');
    step.run({ a: alpha });
    add.run({ a: alpha, dm, N });
    db.exec('DELETE FROM gp; INSERT INTO gp SELECT node, s FROM gq;');
  }
  db.exec('UPDATE node SET pagerank = (SELECT s FROM gp WHERE gp.node = node.id)');
  db.exec('COMMIT');
}

function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA temp_store = MEMORY; PRAGMA cache_size = -65536;');
  return db;
}

module.exports = { buildDb, openDb, derive, globalPageRank, CLOSURE_CLASSES, CLOSURE_K, CLOSURE_MINC };
