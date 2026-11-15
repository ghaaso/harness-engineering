'use strict';
// Every SQL statement the relational arm runs, grouped by algorithm (SPEC.md), so that the lines of
// query code per algorithm can be counted (bench.js).
// Direction templates: the edge table holds one row per directed edge and TWO rows (one per
// orientation, sym = 1) per symmetric edge (co_changed). {FWD:...} reads rows by src (the forward
// orientation; under "dependents" only the symmetric rows, via @FS@); {REV:...} reads non-symmetric
// rows by dst (kept for "dependents" and "both"); {BOTH:...} joins the two. So every symmetric edge
// gives exactly one arc from each end in every direction mode.
// $mask is the edge-class bitmask, $minc the confidence floor of unweighted traversals.
const MASK = '((1 << e.cid) & $mask) != 0';

const Q = {
  temp: `
CREATE TEMP TABLE IF NOT EXISTS seeds(id INTEGER PRIMARY KEY);
CREATE TEMP TABLE IF NOT EXISTS blocked(id INTEGER PRIMARY KEY);
CREATE TEMP TABLE IF NOT EXISTS hop(node INTEGER PRIMARY KEY, d INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS temp.hop_d ON hop(d, node);
CREATE TEMP TABLE IF NOT EXISTS st(node INTEGER, s INTEGER, d INTEGER, PRIMARY KEY(node, s)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS bud(cid INTEGER PRIMARY KEY, lim INTEGER, mult INTEGER);
CREATE TEMP TABLE IF NOT EXISTS mst(node INTEGER, j INTEGER, c INTEGER, d INTEGER, PRIMARY KEY(node, j, c)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS mp_move(j INTEGER, c INTEGER, k INTEGER, nc INTEGER, PRIMARY KEY(j, c, k, nc)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS mp_step(k INTEGER PRIMARY KEY, fwd INTEGER, rev INTEGER);
CREATE TEMP TABLE IF NOT EXISTS mp_ok(k INTEGER, ekid INTEGER, cid INTEGER, PRIMARY KEY(k, ekid, cid)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS mp_acc(j INTEGER, c INTEGER, PRIMARY KEY(j, c)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS dag(v INTEGER, u INTEGER, ekid INTEGER, o INTEGER, PRIMARY KEY(v, u, ekid, o)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS par(v INTEGER PRIMARY KEY, npar INTEGER, pk INTEGER);
CREATE TEMP TABLE IF NOT EXISTS sdag(v INTEGER, s INTEGER, u INTEGER, su INTEGER, ekid INTEGER, PRIMARY KEY(v, s, u, su, ekid)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS spar(v INTEGER, s INTEGER, pk INTEGER, PRIMARY KEY(v, s)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS cand(node INTEGER PRIMARY KEY, d INTEGER, npar INTEGER);
CREATE TEMP TABLE IF NOT EXISTS sc(node INTEGER PRIMARY KEY, s REAL);
CREATE TEMP TABLE IF NOT EXISTS act(node INTEGER PRIMARY KEY, a REAL);
CREATE TEMP TABLE IF NOT EXISTS odt(node INTEGER PRIMARY KEY, n INTEGER);
CREATE TEMP TABLE IF NOT EXISTS trs(u INTEGER, v INTEGER, p REAL, PRIMARY KEY(u, v)) WITHOUT ROWID;
CREATE TEMP TABLE IF NOT EXISTS nohub(id INTEGER PRIMARY KEY);
CREATE TEMP TABLE IF NOT EXISTS pv(node INTEGER PRIMARY KEY, s REAL);
CREATE TEMP TABLE IF NOT EXISTS qv(node INTEGER PRIMARY KEY, s REAL);
CREATE TEMP TABLE IF NOT EXISTS fused(node INTEGER PRIMARY KEY, s REAL);
CREATE TEMP TABLE IF NOT EXISTS wd(node INTEGER PRIMARY KEY, c REAL NOT NULL, it INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS temp.wd_it ON wd(it, node);
CREATE TEMP TABLE IF NOT EXISTS wcost(cid INTEGER PRIMARY KEY, cost REAL NOT NULL);`,
  reset: 'DELETE FROM seeds; DELETE FROM blocked; DELETE FROM hop; DELETE FROM st; DELETE FROM bud; DELETE FROM mst; DELETE FROM mp_move; DELETE FROM mp_step; DELETE FROM mp_ok; DELETE FROM mp_acc; DELETE FROM dag; DELETE FROM par; DELETE FROM cand; DELETE FROM sdag; DELETE FROM spar;',

  // ---- hub handling --------------------------------------------------------------------------
  // computed once per (connection, mask, k) into a cached temp table {HC}: the per-query path is
  // then an index-only copy (hub_apply). deg.prod_in counts rows whose source is not a test, so a
  // symmetric edge counts at both ends. The hub measure ignores minConf (SPEC.md 5).
  hub_indeg_build: `
CREATE TEMP TABLE {HC}(id INTEGER PRIMARY KEY);
INSERT INTO {HC} SELECT d.node FROM deg d
WHERE ((1 << d.cid) & $hmask) != 0
GROUP BY d.node HAVING SUM(d.prod_in) > $k`,
  hub_apply: 'INSERT INTO blocked SELECT id FROM {HC} EXCEPT SELECT id FROM seeds',
  hub_transport: `
INSERT INTO blocked
SELECT id FROM node WHERE transport = 1
EXCEPT SELECT id FROM seeds`,

  // ---- k-hop, depth-capped recursive CTE with set semantics ------------------------------------
  khop_cte: `
INSERT INTO hop
WITH RECURSIVE r(node, d) AS (
  SELECT id, 0 FROM seeds
  {FWD:UNION
  SELECT e.dst, r.d + 1 FROM r JOIN edge e ON e.src = r.node
  WHERE r.d < $H AND ${MASK} AND e.w >= $minc @FS@ AND r.node NOT IN (SELECT id FROM blocked)}
  {REV:UNION
  SELECT e.src, r.d + 1 FROM r JOIN edge e ON e.dst = r.node
  WHERE r.d < $H AND ${MASK} AND e.w >= $minc AND e.sym = 0 AND r.node NOT IN (SELECT id FROM blocked)}
)
SELECT node, MIN(d) FROM r GROUP BY node`,
  // ---- k-hop, level-wise (unbounded or any cap): one statement per level -----------------------
  khop_level_seed: 'INSERT INTO hop SELECT id, 0 FROM seeds',
  khop_level: `
INSERT OR IGNORE INTO hop
{FWD:SELECT e.dst, $h + 1 FROM hop x CROSS JOIN edge e ON e.src = x.node
WHERE x.d = $h AND ${MASK} AND e.w >= $minc @FS@ AND x.node NOT IN (SELECT id FROM blocked)}
{BOTH:UNION ALL}
{REV:SELECT e.src, $h + 1 FROM hop x CROSS JOIN edge e ON e.dst = x.node
WHERE x.d = $h AND ${MASK} AND e.w >= $minc AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)}`,
  // ---- k-hop from the bounded closure table (dependencies / dependents, base mask, closure minConf,
  // no hub cut). The closure follows forward rows, so its reverse is exactly the dependents graph.
  khop_closure_fwd: `
INSERT OR IGNORE INTO hop
SELECT dst, MIN(dist) FROM closure
WHERE src IN (SELECT id FROM seeds) AND dist <= $H GROUP BY dst`,
  khop_closure_rev: `
INSERT OR IGNORE INTO hop
SELECT src, MIN(dist) FROM closure
WHERE dst IN (SELECT id FROM seeds) AND dist <= $H GROUP BY src`,

  // ---- per-edge-class budgets: a state machine in a recursive CTE ------------------------------
  budget_cte: `
INSERT INTO st
WITH RECURSIVE r(node, s, d) AS (
  SELECT id, 0, 0 FROM seeds
  {FWD:UNION
  SELECT e.dst, r.s + b.mult, r.d + 1 FROM r JOIN edge e ON e.src = r.node JOIN bud b ON b.cid = e.cid
  WHERE (r.s / b.mult) % (b.lim + 1) < b.lim AND r.d < $H AND e.w >= $minc @FS@ AND r.node NOT IN (SELECT id FROM blocked)}
  {REV:UNION
  SELECT e.src, r.s + b.mult, r.d + 1 FROM r JOIN edge e ON e.dst = r.node JOIN bud b ON b.cid = e.cid
  WHERE (r.s / b.mult) % (b.lim + 1) < b.lim AND r.d < $H AND e.w >= $minc AND e.sym = 0 AND r.node NOT IN (SELECT id FROM blocked)}
)
SELECT node, s, MIN(d) FROM r GROUP BY node, s`,
  budget_hop: 'INSERT INTO hop SELECT node, MIN(d) FROM st GROUP BY node',

  // ---- ordered metapath: an automaton over (step j, count c) in a recursive CTE ----------------
  // mp_move(j, c, k, nc): from state (j, c) an arc matching step k leads to (k, nc); mp_step(k): the
  // step's orientations; mp_ok(k, ekid, cid): the (kind, class) pairs step k matches.
  mp_cte: `
INSERT INTO mst
WITH RECURSIVE r(node, j, c, d) AS (
  SELECT id, 0, 0, 0 FROM seeds
  UNION
  SELECT e.dst, m.k, m.nc, r.d + 1 FROM r CROSS JOIN mp_move m ON m.j = r.j AND m.c = r.c
    CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.src = r.node
    CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid
  WHERE r.d < $H AND e.w >= $minc AND (s.fwd = 1 OR e.sym = 1) AND r.node NOT IN (SELECT id FROM blocked)
  UNION
  SELECT e.src, m.k, m.nc, r.d + 1 FROM r CROSS JOIN mp_move m ON m.j = r.j AND m.c = r.c
    CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.dst = r.node
    CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid
  WHERE r.d < $H AND e.w >= $minc AND s.rev = 1 AND e.sym = 0 AND r.node NOT IN (SELECT id FROM blocked)
)
SELECT node, j, c, MIN(d) FROM r GROUP BY node, j, c`,
  mp_hop: 'INSERT INTO hop SELECT node, MIN(d) FROM mst GROUP BY node',
  mp_dag: `
INSERT OR IGNORE INTO dag
SELECT e.dst, x.node, e.ekid, 0 FROM mst x CROSS JOIN mp_move m ON m.j = x.j AND m.c = x.c
  CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.src = x.node
  CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid CROSS JOIN hop y ON y.node = e.dst
WHERE y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND (s.fwd = 1 OR e.sym = 1) AND x.node NOT IN (SELECT id FROM blocked)
UNION ALL
SELECT e.src, x.node, e.ekid, 1 FROM mst x CROSS JOIN mp_move m ON m.j = x.j AND m.c = x.c
  CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.dst = x.node
  CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid CROSS JOIN hop y ON y.node = e.src
WHERE y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND s.rev = 1 AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)`,
  mp_cand_end: `
INSERT INTO cand SELECT h.node, h.d, COALESCE(p.npar, 0) FROM hop h LEFT JOIN par p ON p.v = h.node
WHERE h.node NOT IN (SELECT id FROM seeds)
  AND h.node IN (SELECT x.node FROM mst x CROSS JOIN mp_acc a ON a.j = x.j AND a.c = x.c)`,

  // ---- reach DAG, parents, candidates (shared by every ranking) -------------------------------
  dag_khop: `
INSERT OR IGNORE INTO dag
{FWD:SELECT e.dst, x.node, e.ekid, 0 FROM hop x CROSS JOIN edge e ON e.src = x.node CROSS JOIN hop y ON y.node = e.dst
WHERE y.d = x.d + 1 AND x.d < $H AND ${MASK} AND e.w >= $minc @FS@ AND x.node NOT IN (SELECT id FROM blocked)}
{BOTH:UNION ALL}
{REV:SELECT e.src, x.node, e.ekid, 1 FROM hop x CROSS JOIN edge e ON e.dst = x.node CROSS JOIN hop y ON y.node = e.src
WHERE y.d = x.d + 1 AND x.d < $H AND ${MASK} AND e.w >= $minc AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)}`,
  dag_budget: `
INSERT OR IGNORE INTO dag
{FWD:SELECT e.dst, x.node, e.ekid, 0 FROM st x CROSS JOIN edge e ON e.src = x.node CROSS JOIN bud b ON b.cid = e.cid
JOIN hop y ON y.node = e.dst
WHERE (x.s / b.mult) % (b.lim + 1) < b.lim AND y.d = x.d + 1 AND x.d < $H AND e.w >= $minc @FS@ AND x.node NOT IN (SELECT id FROM blocked)}
{BOTH:UNION ALL}
{REV:SELECT e.src, x.node, e.ekid, 1 FROM st x CROSS JOIN edge e ON e.dst = x.node CROSS JOIN bud b ON b.cid = e.cid
JOIN hop y ON y.node = e.src
WHERE (x.s / b.mult) % (b.lim + 1) < b.lim AND y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)}`,
  par: 'INSERT INTO par SELECT v, COUNT(DISTINCT u), MIN(u * 4096 + ekid) FROM dag GROUP BY v',
  cand: `
INSERT INTO cand SELECT h.node, h.d, COALESCE(p.npar, 0) FROM hop h LEFT JOIN par p ON p.v = h.node
WHERE h.node NOT IN (SELECT id FROM seeds)`,
  parents: 'SELECT v, pk FROM par',

  // ---- explanation over automaton states (budget and metapath) ---------------------------------
  // A state arc goes from an expanded state (u, su) at depth d to a state (v, s) first visited at
  // depth d + 1. The state parent of (v, s) is the smallest (u, kind id, su); a node is explained from
  // its smallest state at depth hop(v). Metapath state number = j * 8 + c.
  sdag_budget: `
INSERT OR IGNORE INTO sdag
{FWD:SELECT e.dst, x.s + b.mult, x.node, x.s, e.ekid FROM st x CROSS JOIN edge e ON e.src = x.node CROSS JOIN bud b ON b.cid = e.cid
CROSS JOIN st y ON y.node = e.dst AND y.s = x.s + b.mult
WHERE (x.s / b.mult) % (b.lim + 1) < b.lim AND y.d = x.d + 1 AND x.d < $H AND e.w >= $minc @FS@ AND x.node NOT IN (SELECT id FROM blocked)}
{BOTH:UNION ALL}
{REV:SELECT e.src, x.s + b.mult, x.node, x.s, e.ekid FROM st x CROSS JOIN edge e ON e.dst = x.node CROSS JOIN bud b ON b.cid = e.cid
CROSS JOIN st y ON y.node = e.src AND y.s = x.s + b.mult
WHERE (x.s / b.mult) % (b.lim + 1) < b.lim AND y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)}`,
  sdag_mp: `
INSERT OR IGNORE INTO sdag
SELECT e.dst, y.j * 8 + y.c, x.node, x.j * 8 + x.c, e.ekid FROM mst x CROSS JOIN mp_move m ON m.j = x.j AND m.c = x.c
  CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.src = x.node
  CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid
  CROSS JOIN mst y ON y.node = e.dst AND y.j = m.k AND y.c = m.nc
WHERE y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND (s.fwd = 1 OR e.sym = 1) AND x.node NOT IN (SELECT id FROM blocked)
UNION ALL
SELECT e.src, y.j * 8 + y.c, x.node, x.j * 8 + x.c, e.ekid FROM mst x CROSS JOIN mp_move m ON m.j = x.j AND m.c = x.c
  CROSS JOIN mp_step s ON s.k = m.k CROSS JOIN edge e ON e.dst = x.node
  CROSS JOIN mp_ok a ON a.k = m.k AND a.ekid = e.ekid AND a.cid = e.cid
  CROSS JOIN mst y ON y.node = e.src AND y.j = m.k AND y.c = m.nc
WHERE y.d = x.d + 1 AND x.d < $H AND e.w >= $minc AND s.rev = 1 AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)`,
  spar: 'INSERT INTO spar SELECT v, s, MIN(u * 33554432 + ekid * 8192 + su) FROM sdag GROUP BY v, s',
  best_state_budget: 'SELECT x.node AS v, MIN(x.s) AS s FROM st x CROSS JOIN hop h ON h.node = x.node WHERE x.d = h.d GROUP BY x.node',
  best_state_mp: 'SELECT x.node AS v, MIN(x.j * 8 + x.c) AS s FROM mst x CROSS JOIN hop h ON h.node = x.node WHERE x.d = h.d GROUP BY x.node',
  spar_get: 'SELECT pk FROM spar WHERE v = ? AND s = ?',

  // ---- ranking: traversal order ----------------------------------------------------------------

  // ---- ranking: degree-normalised activation over the DAG --------------------------------------
  // od(u) = the number of arcs of u under the direction, mask and minConf (the same arcs a traversal
  // may follow), counted for the DAG's source nodes only. When that number is 0 (metapath mode only:
  // a step may run against the configured direction), od(u) = the number of reach-DAG arcs leaving u,
  // which is at least 1 (SPEC 8.1, addendum 3 A.1). The dag table holds each (u, v, kind,
  // orientation) once, so COUNT(*) over it is that number.
  degnorm_init: 'DELETE FROM act; DELETE FROM odt; INSERT INTO act SELECT id, 1.0 / $nS FROM seeds',
  degnorm_od: `
INSERT INTO odt SELECT x.u, CASE WHEN SUM(x.n) > 0 THEN SUM(x.n) ELSE (SELECT COUNT(*) FROM dag g2 WHERE g2.u = x.u) END FROM (
  {FWD:SELECT g.u AS u, (SELECT COUNT(*) FROM edge e WHERE e.src = g.u AND ${MASK} AND e.w >= $minc @FS@) AS n FROM (SELECT DISTINCT u FROM dag) g}
  {BOTH:UNION ALL}
  {REV:SELECT g.u, (SELECT COUNT(*) FROM edge e WHERE e.dst = g.u AND ${MASK} AND e.w >= $minc AND e.sym = 0) FROM (SELECT DISTINCT u FROM dag) g}
) x GROUP BY x.u`,
  degnorm_level: `
INSERT INTO act SELECT g.v, SUM(a.a / o.n) FROM dag g JOIN hop y ON y.node = g.v
JOIN act a ON a.node = g.u JOIN odt o ON o.node = g.u
WHERE y.d = $h GROUP BY g.v`,
  degnorm_score: 'DELETE FROM sc; INSERT INTO sc SELECT node, a FROM act',

  // ---- ranking: personalised PageRank iterated over SQL rows -----------------------------------
  // transitions, built once per (connection, direction, mask, co-change weight, hub rule) into cached
  // temp tables {TRC}/{TRUC}; the build reads every arc of the mask (all confidences: PageRank is a
  // weighted ranking, minConf does not apply) because PageRank is global by nature. Nodes in the hub
  // set {GB} get no transitions (they dangle back to the seeds); a seed that is in {GB} is exempt, so
  // its own transitions are added per query into trs (index lookups only).
  ppr_trans_build: `
CREATE TEMP TABLE {TRC}(u INTEGER, v INTEGER, p REAL, PRIMARY KEY(u, v)) WITHOUT ROWID;
CREATE TEMP TABLE {TRUC}(u INTEGER PRIMARY KEY);
INSERT INTO {TRC} SELECT u, v, ws / wt FROM (
  SELECT u, v, ws, SUM(ws) OVER (PARTITION BY u) AS wt FROM (
    SELECT u, v, SUM(w * CASE WHEN cid = $hist THEN $ccw ELSE 1.0 END) AS ws FROM (
      {FWD:SELECT e.src AS u, e.dst AS v, e.w, e.cid FROM edge e WHERE ${MASK} @FS@}
      {BOTH:UNION ALL}
      {REV:SELECT e.dst AS u, e.src AS v, e.w, e.cid FROM edge e WHERE ${MASK} AND e.sym = 0}
    ) GROUP BY u, v))
WHERE wt > 0 AND u NOT IN (SELECT id FROM {GB});
INSERT INTO {TRUC} SELECT DISTINCT u FROM {TRC};`,
  ppr_trans_seeds: `
DELETE FROM trs;
INSERT INTO trs SELECT u, v, ws / wt FROM (
  SELECT u, v, ws, SUM(ws) OVER (PARTITION BY u) AS wt FROM (
    SELECT u, v, SUM(w * CASE WHEN cid = $hist THEN $ccw ELSE 1.0 END) AS ws FROM (
      {FWD:SELECT e.src AS u, e.dst AS v, e.w, e.cid FROM seeds s CROSS JOIN edge e ON e.src = s.id WHERE s.id IN (SELECT id FROM {GB}) AND ${MASK} @FS@}
      {BOTH:UNION ALL}
      {REV:SELECT e.dst AS u, e.src AS v, e.w, e.cid FROM seeds s CROSS JOIN edge e ON e.dst = s.id WHERE s.id IN (SELECT id FROM {GB}) AND ${MASK} AND e.sym = 0}
    ) GROUP BY u, v))
WHERE wt > 0;`,
  ppr_init: 'DELETE FROM pv; INSERT INTO pv SELECT id, 1.0 / $nS FROM seeds',
  ppr_dangling: 'SELECT COALESCE(SUM(s), 0) AS dm FROM pv WHERE node NOT IN (SELECT u FROM {TRUC}) AND node NOT IN (SELECT u FROM trs)',
  ppr_step: `
DELETE FROM qv;
INSERT INTO qv SELECT v, SUM(ps) * (1 - $a) FROM (
  SELECT t.v, p.s * t.p AS ps FROM pv p CROSS JOIN {TRC} t ON t.u = p.node
  UNION ALL SELECT t.v, p.s * t.p FROM pv p CROSS JOIN trs t ON t.u = p.node) GROUP BY v;`,
  ppr_restart: `
INSERT INTO qv(node, s) SELECT id, ($a + (1 - $a) * $dm) / $nS FROM seeds WHERE true
ON CONFLICT(node) DO UPDATE SET s = s + excluded.s`,
  ppr_swap: 'DELETE FROM pv; INSERT INTO pv SELECT node, s FROM qv',
  ppr_score: 'DELETE FROM sc; INSERT INTO sc SELECT node, s FROM pv',

  // ---- ranking: co-change weight from the seed's files (both orientations stored) --------------
  cochange_score: `
DELETE FROM sc;
INSERT INTO sc SELECT c.node, x.s FROM cand c JOIN node n ON n.id = c.node
JOIN (SELECT b, SUM(conf) AS s FROM cochange
      WHERE a IN (SELECT DISTINCT n2.file_id FROM seeds JOIN node n2 ON n2.id = seeds.id WHERE n2.file_id > 0)
      GROUP BY b) x ON x.b = n.file_id`,

  // ---- ranking: text match (FTS5 BM25 over names, signatures, doc text) -------------------------
  text_score: `
DELETE FROM sc;
INSERT INTO sc SELECT f.rowid, -bm25(fts) FROM fts f WHERE fts MATCH $q AND f.rowid IN (SELECT node FROM cand)`,

  // ---- ranking x_wsp (arm extension, stage 2): weighted shortest path cost from the nearest seed --
  // The LadybugDB definition (addendum 3 A.2): arc cost = class cost (wcost) / max(confidence, 0.05);
  // arcs under the direction, mask and minConf (SPEC 4); a blocked node may end a path but is never
  // expanded (seeds are never blocked). Set-based Bellman-Ford in rounds: round $it relaxes the arcs
  // leaving every node whose cost improved in round $it - 1 (it = $it); an upsert keeps the smaller
  // cost. The thin loop in rel.js repeats it until a round changes nothing. Path length is unbounded.
  wsp_init: 'DELETE FROM wd; INSERT INTO wd SELECT id, 0.0, 0 FROM seeds',
  wsp_relax: `
INSERT INTO wd(node, c, it)
SELECT v, MIN(c), $it + 1 FROM (
  {FWD:SELECT e.dst AS v, x.c + k.cost / MAX(e.w, 0.05) AS c FROM wd x CROSS JOIN edge e ON e.src = x.node CROSS JOIN wcost k ON k.cid = e.cid
  WHERE x.it = $it AND ${MASK} AND e.w >= $minc @FS@ AND x.node NOT IN (SELECT id FROM blocked)}
  {BOTH:UNION ALL}
  {REV:SELECT e.src AS v, x.c + k.cost / MAX(e.w, 0.05) AS c FROM wd x CROSS JOIN edge e ON e.dst = x.node CROSS JOIN wcost k ON k.cid = e.cid
  WHERE x.it = $it AND ${MASK} AND e.w >= $minc AND e.sym = 0 AND x.node NOT IN (SELECT id FROM blocked)}
) WHERE true GROUP BY v
ON CONFLICT(node) DO UPDATE SET c = excluded.c, it = excluded.it WHERE excluded.c < wd.c`,
  wsp_score: 'DELETE FROM sc; INSERT INTO sc SELECT c.node, 1.0 / (1.0 + w.c) FROM cand c CROSS JOIN wd w ON w.node = c.node',

  // ---- ranking: hybrid (reciprocal rank fusion of the parts) -----------------------------------
  // final ordering: one SELECT over the candidates; ORDER BY is the ranking's key (see RANK_ORDER)
  rank: `
SELECT c.node, c.d, {SCORE} AS score FROM cand c LEFT JOIN sc s ON s.node = c.node
ORDER BY {ORDER}`,
  hybrid_add: `
INSERT INTO fused(node, s)
SELECT c.node, 1.0 / ($rrf + ROW_NUMBER() OVER (ORDER BY {ORDER})) FROM cand c LEFT JOIN sc s ON s.node = c.node
WHERE true ON CONFLICT(node) DO UPDATE SET s = s + excluded.s`,
  hybrid_score: 'DELETE FROM sc; INSERT INTO sc SELECT node, s FROM fused; DELETE FROM fused',
};

// Score expression and ordering key per ranking (ties: hop, then npar for bfs/cochange/text, then id).
const S12 = 'ROUND(COALESCE(s.s, 0), 12)'; const S9 = 'ROUND(COALESCE(s.s, 0), 9)';
const RANK_ORDER = {
  bfs: { score: 'NULL', order: 'c.d, c.npar DESC, c.node' },
  degnorm: { score: S12, order: S12 + ' DESC, c.d, c.node' },
  ppr: { score: S12, order: S12 + ' DESC, c.d, c.node' },
  hybrid: { score: S12, order: S12 + ' DESC, c.d, c.node' },
  cochange: { score: S12, order: S12 + ' DESC, c.d, c.npar DESC, c.node' },
  text: { score: S9, order: S9 + ' DESC, c.d, c.npar DESC, c.node' },
};

// Keep the parts of a template that belong to a direction (see the header).
function forDir(sql, dir) {
  const fwd = dir !== 'dependents'; const rev = dir !== 'dependencies';
  return sql
    .replace(/{FWD:([^}]*)}/g, (m, a) => a.replace(/@FS@/g, fwd ? '' : 'AND e.sym = 1'))
    .replace(/{REV:([^}]*)}/g, (m, a) => (rev ? a : ''))
    .replace(/{BOTH:([^}]*)}/g, (m, a) => (rev ? a : ''));
}

module.exports = { Q, forDir, RANK_ORDER };
