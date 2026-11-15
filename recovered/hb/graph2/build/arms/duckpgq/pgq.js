'use strict';
// GRAPH ARM on DuckDB 2.0.0 + DuckPGQ: every SPEC.md algorithm, answered through the property-graph
// layer wherever DuckPGQ can express it, and through DuckDB SQL where it cannot (each case is named).
//
// The store (store.js, version D2) holds ONE stored property graph `g` built at store time: the vertex
// table `node` and the edge table `arc`, which holds every SPEC 4 arc once (a directed edge as a forward
// arc o = 0 and a reverse arc o = 1, a co-change edge as two arcs o = 0, sym = 1) with its kind, class,
// confidence and the x_wsp cost. A configuration's projection (direction, classes, minConf, hub cut) is
// therefore not a table: it is a predicate on `arc`, written as an edge-element filter of a fixed-length
// pattern (`-[e:arc WHERE ...]->`) or as the filtered row source of a CSR. The store is opened READ_ONLY as
// the main database (DuckPGQ reads a stored property graph only from the main database; it cannot create
// one in a read-only database), and per-query working tables are TEMP tables.
//
//   traversal khop      bounded (hops H): no path length beyond H is computed (addendum 3, C.6). DuckPGQ has
//                            no bounded shortest-path routine (iterativelength() runs the BFS to the end and
//                            the {1,H} quantifier filters afterwards), so the bound is written by hand, in
//                            two equivalent forms: SQL (default): one recursive statement, level-synchronous,
//                            USING KEY (v), first visit wins, stops at depth H; PGQ (khopImpl = 'levels'):
//                            one statement per level, the one-edge pattern
//                            (a WHERE a.id IN frontier)-[e:arc WHERE projection]->(b), new nodes only. The SQL
//                            form is the default because it was faster (one round trip instead of H).
//                       unbounded: PGQ iterativelength() over a CSR built in the same statement from the
//                            filtered arcs (what MATCH ... ->+ compiles to; nothing to bound).
//                       DAG arcs = PGQ one-edge pattern joined to the hop table; explanation = smallest
//                            (u, kind id) DAG parent chained back (SPEC 7), SQL.
//   traversal metapath  PGQ  ordered steps as fixed-length typed patterns: one filtered `arc` edge per step,
//                            the repeat ranges unrolled (DuckPGQ cannot chain two quantified segments in one
//                            MATCH and a quantified edge takes no filter), one pattern per automaton prefix,
//                            UNION ALL. DAG arcs over automaton states: SQL.
//   traversal budget    SQL  per-class counters are not a regular path pattern: recursive CTE USING KEY
//                            (node, state) with a first-visit check against the recurring table.
//   rank ppr            SQL  recursive CTE power iteration (40 steps). DuckPGQ's pagerank() is global,
//                            unweighted, damping 0.85 with a tolerance stop: it is the native variant
//                            (rank.variant = "duckpgq_global"), not the specified algorithm.
//   rank degnorm, cochange, text (BM25), hybrid (RRF), bfs order: SQL.
//   x_wsp               native weighted shortest path: cheapest_path_length() over a weighted CSR (the
//                            LadybugDB definition, addendum 3 A.2: cost = class cost / max(confidence, 0.05),
//                            optional per-kind costs; a hub-blocked node is never passed through).
//   x_wcc_prior         native weakly_connected_component() (scalar, over a CSR) + PPR.
//   x_ppr_lift          SQL PPR divided by native pagerank() to a power.
//   x_khop_prcut        khop with the top-N nodes of native pagerank() blocked (reached, not expanded).
// Connection caches (TEMP tables, like the relational arm's): hub sets, PageRank transitions, native
// PageRank and WCC results. Their build time is reported per call as meta.setup_ms.
const os = require('os');
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');
const { PPR_ITERS, RRF_K, metapathMoves, metapathAccepting } = require('../common/config');
const { seedQuery } = require('../common/textterms');
const S_ = require('./store');

const HIST = CLASSES.indexOf('history');
const STRUCT_CIDS = new Set([...STRUCTURAL].map((c) => CLASSES.indexOf(c)));
const D = (x) => `${Number(x)}::DOUBLE`; // a double literal from a JavaScript number (shortest round-trip form)
const R12 = (x) => `floor((${x}) * 1e12::DOUBLE + 0.5::DOUBLE) / 1e12::DOUBLE`; // = Math.round(x*1e12)/1e12 for x >= 0
const R9 = (x) => `floor((${x}) * 1e9::DOUBLE + 0.5::DOUBLE) / 1e9::DOUBLE`;
const now = () => Number(process.hrtime.bigint()) / 1e6;
const inList = (a) => (a.length ? a.join(', ') : 'NULL');
const BIGH = 1000000;
const V = '(SELECT count(*) FROM node)';
const DEFAULT_THREADS = (() => { try { return os.availableParallelism(); } catch (e) { return os.cpus().length; } })();

// order keys per rank mode (SPEC 8): columns score, d (hop), npar, v (id)
const ORDER = {
  bfs: 'd ASC, npar DESC, v ASC',
  degnorm: 'score DESC, d ASC, v ASC', ppr: 'score DESC, d ASC, v ASC', hybrid: 'score DESC, d ASC, v ASC',
  cochange: 'score DESC, d ASC, npar DESC, v ASC', text: 'score DESC, d ASC, npar DESC, v ASC',
  x_wsp: 'score DESC, d ASC, v ASC', x_ppr_lift: 'score DESC, d ASC, v ASC', x_wcc_prior: 'score DESC, d ASC, v ASC',
};
const ROUND = { text: R9 };

// orientation filter of an arc: 'dependencies' / step 'out' = forward and symmetric arcs (o = 0);
// 'dependents' / step 'in' = reverse and symmetric arcs; 'both' = all
const orient = (a, d) => (d === 'dependencies' || d === 'out' ? ` AND ${a}o = 0` : d === 'dependents' || d === 'in' ? ` AND (${a}o = 1 OR ${a}sym = 1)` : '');
// SPEC 4 arcs for a direction, class ids and a confidence floor (null = none), as a predicate on `arc`
function arcPred(a, dir, cids, minc) {
  if (!cids.length) return 'FALSE';
  return `${a}cid IN (${cids.join(', ')})` + (minc == null ? '' : ` AND ${a}w >= ${D(minc)}`) + orient(a, dir);
}
// arcs matching one metapath step (SPEC 6.3): class in classes or kind in kinds, orientation by step dir.
// A step none of whose kinds or classes exists matches nothing (addendum 3, A.4).
function stepPred(a, step, kindIds, minc) {
  const cids = step.classes.map((c) => CLASSES.indexOf(c));
  const conds = [];
  if (cids.length) conds.push(`${a}cid IN (${cids.join(', ')})`);
  if (kindIds.length) conds.push(`${a}kid IN (${kindIds.join(', ')})`);
  if (!conds.length) return 'FALSE';
  return '(' + conds.join(' OR ') + ')' + ` AND ${a}w >= ${D(minc)}` + orient(a, step.dir);
}
// blocked nodes (hub sets, a PageRank cut) are not expanded; seeds are never blocked (exempt = true)
function blockPred(col, tables, exempt = true) {
  if (!tables.length) return 'TRUE';
  const nb = tables.map((t) => `${col} NOT IN (SELECT id FROM ${t})`).join(' AND ');
  return exempt ? `(${col} IN (SELECT id FROM q_seeds) OR (${nb}))` : `(${nb})`;
}

class PgqGraph {
  constructor(db, info) { Object.assign(this, info); this.db = db; this.cache = new Map(); this.n = 0; this.setupMs = 0; this.khopImpl = null; }

  static async open(file, opts = {}) {
    const threads = Number(opts.threads || process.env.GT_DUCKDB_THREADS || DEFAULT_THREADS);
    const t0 = now();
    const db = await S_.connect(file, { config: { access_mode: 'READ_ONLY', threads: String(threads), memory_limit: opts.memory || '2GB' } });
    await S_.loadPgq(db);
    const rid = await db.all('SELECT rowid AS r, id FROM node ORDER BY rowid');
    const ridMap = new Array(rid.length); let identity = true;
    for (const r of rid) { ridMap[r.r] = r.id; if (r.id !== r.r + 1) identity = false; }
    if (!identity) throw new Error('duckpgq store: vertex rowid != id - 1 in ' + file);
    const kinds = await db.all('SELECT kid, name FROM ekind ORDER BY kid');
    const meta = Object.fromEntries((await db.all('SELECT k, v FROM meta')).map((r) => [r.k, r.v]));
    const pgs = (await db.all('SELECT DISTINCT property_graph AS p FROM __duckpgq_internal')).map((r) => r.p);
    if (!pgs.includes('g') || !pgs.includes('gtq')) throw new Error('duckpgq store: stored property graphs missing in ' + file);
    const g = new PgqGraph(db, { file, threads, ridMap, kindName: new Map(kinds.map((k) => [k.kid, k.name])),
      kindId: new Map(kinds.map((k) => [k.name, k.kid])), meta, N: Number(meta.n_docs), avgdl: Number(meta.total_tokens) / Number(meta.n_docs) });
    await db.run('CREATE TEMP TABLE q_seeds(id BIGINT)');
    g.openMs = now() - t0;
    return g;
  }
  async close() { this.db.close(); }
  all(s) { return this.db.all(s); }
  run(s) { return this.db.run(s); }
  // a connection cache entry (TEMP table); its build time counts as setup
  async cached(key, build) {
    if (!this.cache.has(key)) { const s = now(); this.cache.set(key, await build()); this.setupMs += now() - s; }
    return this.cache.get(key);
  }

  // ---- connection caches: hub sets, transitions, native PageRank and WCC ------------------------------
  hubSet(hub, cids) {
    if (hub.mode === 'none') return null;
    const nc = cids.filter((c) => !STRUCT_CIDS.has(c));
    const key = hub.mode === 'transport' ? 'hub|t' : 'hub|i|' + nc.join(',') + '|' + hub.k;
    return this.cached(key, async () => {
      const name = 'hb' + (this.n++);
      if (hub.mode === 'transport') await this.run(`CREATE TEMP TABLE ${name} AS SELECT id FROM node WHERE transport = 1`);
      else await this.run(`CREATE TEMP TABLE ${name} AS SELECT node AS id FROM deg WHERE cid IN (${inList(nc)}) GROUP BY node HAVING sum(prod_in) > ${hub.k}`);
      return name;
    });
  }
  async blockedSeeds(tables, seedIds) {
    const out = new Set();
    for (const t of tables) for (const r of await this.all(`SELECT id FROM ${t} WHERE id IN (${seedIds.join(', ')})`)) out.add(r.id);
    return [...out].sort((a, b) => a - b);
  }
  // PageRank transitions (SPEC 8.2), global, cached; dangling = nodes without a row
  transitions(dir, cids, ccw, hb) {
    const key = ['tr', dir, cids.join(','), ccw, hb].join('|');
    return this.cached(key, async () => {
      const name = 'tr' + (this.n++);
      await this.run(`CREATE TEMP TABLE ${name} AS ${this.transSql(dir, cids, ccw, hb ? `src NOT IN (SELECT id FROM ${hb})` : 'TRUE')}`);
      return { name, dir, cids, ccw };
    });
  }
  transSql(dir, cids, ccw, uPred) {
    return `WITH a AS (SELECT src AS u, dst AS v, CASE WHEN cid = ${HIST} THEN w * ${D(ccw)} ELSE w END AS x FROM arc WHERE ${arcPred('', dir, cids, null)} AND ${uPred}),
      b AS (SELECT u, v, sum(x) AS x FROM a GROUP BY u, v),
      c AS (SELECT u, v, x, sum(x) OVER (PARTITION BY u) AS tot FROM b)
      SELECT u, v, x / tot AS f FROM c WHERE tot > 0`;
  }
  // the CSR of a filtered arc set, as CTEs `p` (the arcs) and `csr` (built when read); DuckPGQ frees a CSR
  // after the path-finding call that reads it, and its length functions accept only id 0 in-statement
  csrCtes(pred, id, costExpr = null) {
    return `p AS MATERIALIZED (SELECT src, dst${costExpr ? `, ${costExpr} AS c` : ''}, row_number() OVER () - 1 AS eid FROM arc WHERE ${pred}),
      csr AS MATERIALIZED (SELECT count(create_csr_edge(${id}, ${V},
        CAST((SELECT sum(create_csr_vertex(${id}, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM node a LEFT JOIN p t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT),
        (SELECT count(*) FROM p), src.rowid, dst.rowid, t.eid${costExpr ? ', t.c' : ''})) AS temp FROM p t JOIN node src ON t.src = src.id JOIN node dst ON t.dst = dst.id)`;
  }
  // native DuckPGQ PageRank (global, unweighted, damping 0.85, tolerance 1e-6) over a projection whose
  // blocked nodes have no out-arcs (no seed exemption: the result is global and cached)
  nativePagerank(dir, cids, minc, blocks) {
    const key = ['gpr', dir, cids.join(','), minc, blocks.join(',')].join('|');
    return this.cached(key, async () => {
      const name = 'gpr' + (this.n++);
      const pred = arcPred('', dir, cids, minc) + ' AND ' + blockPred('src', blocks, false);
      await this.run(`CREATE TEMP TABLE ${name} AS WITH ${this.csrCtes(pred, 0)} SELECT n.id AS v, pagerank(0, n.rowid) + 0 * csr.temp AS pr FROM csr, node n`);
      return name;
    });
  }
  // native weakly_connected_component() over a hub-free projection: arcs whose ends are both below the
  // in-degree cut (WCC ignores direction)
  nativeWcc(cids, minc, k) {
    const key = ['wcc', cids.join(','), minc, k].join('|');
    return this.cached(key, async () => {
      const hb = await this.hubSet({ mode: 'indeg', k }, cids);
      const name = 'wc' + (this.n++);
      const pred = arcPred('', 'dependencies', cids, minc) + ` AND src NOT IN (SELECT id FROM ${hb}) AND dst NOT IN (SELECT id FROM ${hb})`;
      await this.run(`CREATE TEMP TABLE ${name} AS WITH ${this.csrCtes(pred, 0)} SELECT n.id AS v, weakly_connected_component(0, n.rowid) + 0 * csr.temp AS comp FROM csr, node n`);
      return name;
    });
  }

  // ---- ranking -----------------------------------------------------------------------------------
  async rank(seedIds, cfg, seed) {
    const t0 = now(); const s0 = this.setupMs;
    const tr = cfg.traversal; const dir = cfg.direction;
    const minc = cfg.minConf == null ? 0.5 : cfg.minConf;
    const cids = cfg.classes.map((c) => CLASSES.indexOf(c));
    const H = tr.hops == null ? null : tr.hops;
    const hb = await this.hubSet(cfg.hub, cids);
    const S = seedIds.join(', ');
    const native = { traversal: null, rank: null };
    // everything the query needs that does not depend on the seeds is prepared (and cached) first
    let extra = null;
    if (tr.mode === 'x_khop_prcut') {
      const g = await this.nativePagerank(dir, cids, minc, hb ? [hb] : []);
      extra = await this.cached('prcut|' + g + '|' + tr.top, async () => {
        const name = 'pc' + (this.n++);
        await this.run(`CREATE TEMP TABLE ${name} AS SELECT v AS id FROM ${g} ORDER BY pr DESC, v ASC LIMIT ${tr.top}`);
        return name;
      });
    }
    const blocks = [hb, extra].filter(Boolean);
    // the configuration's projection, as a predicate on arc (alias prefix a: '' or 'e.')
    const proj = (a) => arcPred(a, dir, cids, minc) + ' AND ' + blockPred(a + 'src', blocks);
    const rk = cfg.rank;
    const parts = rk.mode === 'hybrid' ? rk.parts : [rk];
    const trans = {};
    for (const p of parts) if ((p.mode === 'ppr' && !p.variant) || p.mode === 'x_ppr_lift' || p.mode === 'x_wcc_prior') {
      const k = (p.mode === 'x_wcc_prior' ? p.ppr.cochange_w : p.cochange_w);
      trans[k] = await this.transitions(dir, cids, k, hb);
    }
    // native routine results are cached temp tables, so they are made here, outside the rolled-back transaction
    const gpr = {};
    for (const p of parts) {
      if ((p.mode === 'ppr' && p.variant) || p.mode === 'x_ppr_lift') gpr.name = await this.nativePagerank(dir, cids, minc, blocks);
      if (p.mode === 'x_wcc_prior') await this.nativeWcc(p.classes ? p.classes.map((c) => CLASSES.indexOf(c)) : cids, minc, p.k);
    }
    const bseeds = hb ? await this.blockedSeeds([hb], seedIds) : [];
    const tPrep = now();
    // noTx (bench plan capture only): no transaction, so a failed EXPLAIN cannot abort the query
    if (!this.noTx) await this.run('BEGIN TRANSACTION');
    let out;
    try {
      await this.run(`INSERT INTO q_seeds VALUES ${seedIds.map((s) => `(${s})`).join(', ')}`);
      // transitions exclude only the hub set (an x_khop_prcut block is a traversal rule); a blocked seed's
      // transitions are added for this query (rolled back afterwards)
      if (bseeds.length) for (const t of Object.values(trans)) await this.run(`INSERT INTO ${t.name} ${this.transSql(t.dir, t.cids, t.ccw, `src IN (${bseeds.join(', ')})`)}`);
      // traversal -> q_hop(v, d), q_dag(u, v, k, o), q_path(v, vs, ks), q_cand(v)
      if (tr.mode === 'khop' || tr.mode === 'x_khop_prcut') native.traversal = await this.khop(proj, H);
      else if (tr.mode === 'budget') { await this.budget(proj, tr, H); native.traversal = 'sql-recursive-cte'; }
      else if (tr.mode === 'metapath') { await this.metapath(tr, H, S, minc, blocks); native.traversal = 'pgq-walk-patterns'; }
      else throw new Error('duckpgq: traversal mode ' + tr.mode);
      await this.run('CREATE OR REPLACE TEMP TABLE q_np AS SELECT v, count(DISTINCT u) AS n FROM q_dag GROUP BY v');
      out = await this.order(rk, { seedIds, S, seed, dir, cids, minc, trans, proj, gpr });
      if (!this.noTx) await this.run('ROLLBACK'); else await this.run('DELETE FROM q_seeds');
    } catch (e) { try { await this.run('ROLLBACK'); } catch (x) { /* already */ } throw e; }
    const ranked = out.map((r) => ({ i: r.v, hop: r.d, score: r.score == null ? null : r.score, via: (r.ks || []).map((k) => this.kindName.get(k)), path: r.vs || [r.v] }));
    return { ranked, engine_ms: now() - t0, meta: { prep_ms: +(tPrep - t0).toFixed(2), setup_ms: +(this.setupMs - s0).toFixed(2), threads: this.threads, native } };
  }

  async khop(proj, H) {
    let how;
    if (H === 0) {
      await this.run('CREATE OR REPLACE TEMP TABLE q_hop AS SELECT id AS v, 0 AS d FROM q_seeds');
      how = 'none';
    } else if (H == null) {
      // unbounded: hop = the extension's shortest-path-length function over the CSR of the projected arcs
      // (what MATCH ... ->+ compiles to), minimum over seeds
      await this.run(`CREATE OR REPLACE TEMP TABLE q_hop AS WITH ${this.csrCtes(proj(''), 0)},
        l AS (SELECT y.id AS v, iterativelength(0, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len
          FROM csr, (SELECT rowid, id FROM node WHERE id IN (SELECT id FROM q_seeds)) x, node y WHERE y.id NOT IN (SELECT id FROM q_seeds))
        SELECT id AS v, 0 AS d FROM q_seeds UNION ALL SELECT v, min(len)::INTEGER AS d FROM l WHERE len IS NOT NULL AND len >= 1 GROUP BY v`);
      how = 'pgq-csr-iterativelength';
    } else if (this.khopImpl !== 'levels') {
      // bounded, one recursive SQL statement: level-synchronous BFS, first visit wins, no level beyond H
      await this.run(`CREATE OR REPLACE TEMP TABLE q_hop AS WITH RECURSIVE
        p AS MATERIALIZED (SELECT src, dst FROM arc WHERE ${proj('')}),
        r(v, d) USING KEY (v) AS (
          SELECT id, 0 FROM q_seeds
          UNION
          SELECT p.dst, min(r.d) + 1 FROM r JOIN p ON p.src = r.v
          WHERE r.d < ${H} AND NOT EXISTS (SELECT 1 FROM recurring.r x WHERE x.v = p.dst) GROUP BY p.dst)
        SELECT v, d::INTEGER AS d FROM r`);
      how = 'sql-recursive-cte-bounded';
    } else {
      // bounded, PGQ: one one-edge pattern per level from the frontier, new nodes only; stops at H or when
      // a level adds nothing
      await this.run('CREATE OR REPLACE TEMP TABLE q_hop AS SELECT id AS v, 0 AS d FROM q_seeds');
      for (let d = 1; d <= H; d++) {
        const n = await this.db.changed(`INSERT INTO q_hop SELECT DISTINCT y, ${d} FROM GRAPH_TABLE (g MATCH
            (a:node WHERE a.id IN (SELECT v FROM q_hop WHERE d = ${d - 1}))-[e:arc WHERE ${proj('e.')}]->(b:node)
            COLUMNS (b.id AS y)) WHERE y NOT IN (SELECT v FROM q_hop)`);
        if (!n) break;
      }
      how = 'pgq-one-edge-levels';
    }
    await this.run('CREATE OR REPLACE TEMP TABLE q_reach AS SELECT v, d FROM q_hop WHERE d >= 1');
    // reach DAG: the one-edge pattern over the projected arcs, kept where hop(b) = hop(a) + 1 and a was expanded
    await this.run(`CREATE OR REPLACE TEMP TABLE q_dag AS SELECT g.u, g.v, g.k, g.o FROM GRAPH_TABLE (g MATCH
        (a:node WHERE a.id IN (SELECT v FROM q_hop WHERE d < ${H == null ? BIGH : H}))-[e:arc WHERE ${proj('e.')}]->(b:node)
        COLUMNS (a.id AS u, b.id AS v, e.kid AS k, e.o AS o)) g JOIN q_hop hu ON hu.v = g.u JOIN q_hop hv ON hv.v = g.v
      WHERE hv.d = hu.d + 1`);
    // explanation (SPEC 7): parent = the DAG arc with the smallest (u, kind id), chained back to a seed
    await this.run(`CREATE OR REPLACE TEMP TABLE q_path AS
      WITH RECURSIVE par AS (SELECT v, arg_min(u, u * 4096 + k) AS u, arg_min(k, u * 4096 + k) AS k FROM q_dag GROUP BY v),
      ch(v0, v, i, vs, ks) AS (SELECT v, v, 0, [v], []::INTEGER[] FROM q_reach
        UNION ALL SELECT ch.v0, p.u, ch.i + 1, list_prepend(p.u, ch.vs), list_prepend(p.k::INTEGER, ch.ks) FROM ch JOIN par p ON p.v = ch.v)
      SELECT v0 AS v, arg_max(vs, i) AS vs, arg_max(ks, i) AS ks FROM ch GROUP BY v0`);
    await this.run('CREATE OR REPLACE TEMP TABLE q_cand AS SELECT v FROM q_reach');
    return how;
  }

  async budget(proj, tr, H) {
    const cls = Object.keys(tr.budgets).map((c) => CLASSES.indexOf(c)).sort((a, b) => a - b);
    let mult = 1; const rows = [];
    for (const c of cls) { const L = tr.budgets[CLASSES[c]]; rows.push(`(${c}, ${L}, ${mult})`); mult *= L + 1; }
    await this.run(`CREATE OR REPLACE TEMP TABLE q_bud AS SELECT * FROM (VALUES ${rows.join(', ')}) t(cid, lim, mult)`);
    await this.run(`CREATE OR REPLACE TEMP TABLE q_pj AS SELECT src, dst, kid, cid, o FROM arc WHERE ${proj('')}`);
    const HH = H == null ? BIGH : H;
    // BFS over (node, budget state); first-visit depth and the smallest (u, kind, u's state) parent
    await this.run(`CREATE OR REPLACE TEMP TABLE q_st AS
      WITH RECURSIVE b(v, s, d, par) USING KEY (v, s) AS (
        SELECT id, 0, 0, NULL::STRUCT(u BIGINT, k INTEGER, su INTEGER) FROM q_seeds
        UNION
        SELECT a.dst, b.s + m.mult, min(b.d) + 1, min({'u': b.v, 'k': a.kid, 'su': b.s})
        FROM b JOIN q_pj a ON a.src = b.v JOIN q_bud m ON m.cid = a.cid
        WHERE b.d < ${HH} AND (b.s // m.mult) % (m.lim + 1) < m.lim
          AND NOT EXISTS (SELECT 1 FROM recurring.b r WHERE r.v = a.dst AND r.s = b.s + m.mult)
        GROUP BY a.dst, b.s + m.mult)
      SELECT v, s, d, par FROM b`);
    await this.run('CREATE OR REPLACE TEMP TABLE q_hop AS SELECT v, min(d)::INTEGER AS d FROM q_st GROUP BY v');
    await this.run(`CREATE OR REPLACE TEMP TABLE q_dag AS SELECT DISTINCT b.v AS u, a.dst AS v, a.kid AS k, a.o AS o
      FROM q_st b JOIN q_pj a ON a.src = b.v JOIN q_bud m ON m.cid = a.cid JOIN q_hop h ON h.v = a.dst
      WHERE b.d < ${HH} AND (b.s // m.mult) % (m.lim + 1) < m.lim AND h.d = b.d + 1`);
    await this.statePaths();
    await this.run('CREATE OR REPLACE TEMP TABLE q_cand AS SELECT v FROM q_hop WHERE v NOT IN (SELECT id FROM q_seeds)');
  }
  // explanation over automaton states (SPEC 7): from v's smallest state at depth hop(v), follow state parents
  async statePaths(T = 'q_st') {
    await this.run(`CREATE OR REPLACE TEMP TABLE q_path AS
      WITH RECURSIVE ch(v0, v, s, i, vs, ks) AS (
        SELECT x.v, x.v, min(x.s), 0, [x.v], []::INTEGER[] FROM ${T} x JOIN q_hop h ON h.v = x.v AND h.d = x.d
          WHERE x.v NOT IN (SELECT id FROM q_seeds) GROUP BY x.v
        UNION ALL
        SELECT ch.v0, x.par.u, x.par.su, ch.i + 1, list_prepend(x.par.u, ch.vs), list_prepend(x.par.k, ch.ks)
        FROM ch JOIN ${T} x ON x.v = ch.v AND x.s = ch.s WHERE x.par IS NOT NULL)
      SELECT v0 AS v, arg_max(vs, i) AS vs, arg_max(ks, i) AS ks FROM ch GROUP BY v0`);
  }

  async metapath(tr, H, S, minc, blocks) {
    const steps = tr.steps; const n = steps.length;
    const kids = steps.map((s) => s.kinds.map((x) => this.kindId.get(x)).filter((x) => x != null));
    const sp = (a, k) => stepPred(a, steps[k], kids[k], minc);
    const bp = (a) => blockPred(a + 'src', blocks);
    // prefix combinations: steps before j with counts in [min, max] (0 allowed when min = 0), step j with 1..max
    const combos = [];
    const rec = (j, acc, L) => {
      for (let c = 1; c <= steps[j].max; c++) if (H == null || L + c <= H) combos.push({ seq: [...acc, ...Array(c).fill(j)], j, c, L: L + c });
      if (j + 1 < n) for (let c = steps[j].min; c <= steps[j].max; c++) if (H == null || L + c <= H) rec(j + 1, [...acc, ...Array(c).fill(j)], L + c);
    };
    rec(0, [], 0);
    // a prefix through a step that matches nothing reaches nothing: its pattern is left out
    const live = steps.map((s, k) => sp('', k) !== 'FALSE');
    const sel = combos.filter((cb) => cb.seq.every((k) => live[k])).map((cb) => {
      let pat = `(n0:node WHERE n0.id IN (${S}))`;
      cb.seq.forEach((k, i) => { pat += `-[e${i + 1}:arc WHERE ${sp(`e${i + 1}.`, k)} AND ${bp(`e${i + 1}.`)}]->(n${i + 1}:node)`; });
      return `SELECT DISTINCT v, ${cb.L} AS d, ${cb.j} AS j, ${cb.c} AS c FROM GRAPH_TABLE (g MATCH ${pat} COLUMNS (n${cb.L}.id AS v))`;
    });
    const walks = sel.length ? sel.join(' UNION ALL ') : 'SELECT NULL::BIGINT AS v, 0 AS d, 0 AS j, 0 AS c WHERE FALSE';
    // first-visit depth of every automaton state (v, j, c) = the shortest typed walk that ends in it
    await this.run(`CREATE OR REPLACE TEMP TABLE q_st AS
      SELECT v, j, c, min(d)::INTEGER AS d FROM (${walks} UNION ALL SELECT id, 0, 0, 0 FROM q_seeds) GROUP BY v, j, c`);
    await this.run('CREATE OR REPLACE TEMP TABLE q_hop AS SELECT v, min(d)::INTEGER AS d FROM q_st GROUP BY v');
    const mv = metapathMoves(steps);
    await this.run(`CREATE OR REPLACE TEMP TABLE q_mv AS SELECT * FROM (VALUES ${mv.length ? mv.map((m) => `(${m.j}, ${m.c}, ${m.k}, ${m.nc})`).join(', ') : '(-1, -1, -1, -1)'}) t(j, c, k, nc)`);
    // the arcs of every step (blocked sources left out), for the state DAG
    await this.run(`CREATE OR REPLACE TEMP TABLE q_sa AS ${steps.map((s, k) => `SELECT ${k} AS step, src, dst, kid, o FROM arc WHERE ${sp('', k)} AND ${bp('')}`).join(' UNION ALL ')}`);
    await this.run(`CREATE OR REPLACE TEMP TABLE q_dag AS SELECT DISTINCT s.v AS u, a.dst AS v, a.kid AS k, a.o AS o
      FROM q_st s JOIN q_mv m ON m.j = s.j AND m.c = s.c JOIN q_sa a ON a.step = m.k AND a.src = s.v JOIN q_hop h ON h.v = a.dst
      WHERE s.d < ${H == null ? BIGH : H} AND h.d = s.d + 1`);
    // explanation (SPEC 7) over automaton states: the state parent of (v, s) is the smallest (u, kind id, su)
    // among state arcs from an expanded state at depth d into (v, s) whose first-visit depth is d + 1
    await this.run(`CREATE OR REPLACE TEMP TABLE q_sst AS
      SELECT t.v, t.j * 8 + t.c AS s, t.d, p.par FROM q_st t LEFT JOIN (
        SELECT a.dst AS v, m.k * 8 + m.nc AS s, min({'u': s.v, 'k': a.kid, 'su': s.j * 8 + s.c}) AS par
        FROM q_st s JOIN q_mv m ON m.j = s.j AND m.c = s.c JOIN q_sa a ON a.step = m.k AND a.src = s.v
          JOIN q_st t ON t.v = a.dst AND t.j = m.k AND t.c = m.nc AND t.d = s.d + 1
        WHERE s.d < ${H == null ? BIGH : H} GROUP BY a.dst, m.k * 8 + m.nc) p ON p.v = t.v AND p.s = t.j * 8 + t.c`);
    await this.statePaths('q_sst');
    if (tr.emit === 'end') {
      const acc = metapathAccepting(steps);
      await this.run(`CREATE OR REPLACE TEMP TABLE q_cand AS SELECT DISTINCT v FROM q_st WHERE (j * 8 + c) IN (${inList(acc.map((a) => a.j * 8 + a.c))}) AND v NOT IN (SELECT id FROM q_seeds)`);
    } else await this.run('CREATE OR REPLACE TEMP TABLE q_cand AS SELECT v FROM q_hop WHERE v NOT IN (SELECT id FROM q_seeds)');
  }

  // fills q_sc(v, x) with the raw score of one (non-hybrid) ranking
  async score(rk, ctx) {
    const { seedIds, S, seed, dir, cids, minc, trans, proj, gpr } = ctx; const nS = seedIds.length;
    if (rk.mode === 'bfs') { await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, NULL::DOUBLE AS x FROM q_cand'); return 'sql'; }
    if (rk.mode === 'degnorm') {
      // od(u) = u's arcs under (direction, classes, minConf); when that is 0 (a metapath step against the
      // configured direction), the number of reach-DAG arcs leaving u (SPEC 8.1, addendum 3 A.1)
      await this.run(`CREATE OR REPLACE TEMP TABLE q_od AS SELECT d.u, coalesce(a.n, d.n) AS od
        FROM (SELECT u, count(*) AS n FROM (SELECT DISTINCT u, v, k, o FROM q_dag) GROUP BY u) d
        LEFT JOIN (SELECT src AS u, count(*) AS n FROM arc WHERE ${arcPred('', dir, cids, minc)} AND src IN (SELECT DISTINCT u FROM q_dag) GROUP BY src) a ON a.u = d.u`);
      await this.run(`CREATE OR REPLACE TEMP TABLE q_act AS SELECT id AS v, 1.0::DOUBLE / ${nS} AS a FROM q_seeds`);
      const maxd = (await this.all('SELECT coalesce(max(d), 0) AS m FROM q_hop'))[0].m;
      for (let h = 1; h <= maxd; h++) {
        await this.run(`INSERT INTO q_act SELECT d.v, sum(a.a / o.od) FROM q_dag d JOIN q_act a ON a.v = d.u JOIN q_od o ON o.u = d.u
          JOIN q_hop h ON h.v = d.v WHERE h.d = ${h} AND d.v NOT IN (${S}) GROUP BY d.v`);
      }
      await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, a AS x FROM q_act');
      return 'sql';
    }
    if (rk.mode === 'ppr' && rk.variant) {
      // native variant: DuckPGQ pagerank() over the traversal's projection (global teleport, damping 0.85,
      // tolerance stop, unweighted); restart and cochange_w are not parameters of the native routine
      await this.run(`CREATE OR REPLACE TEMP TABLE q_sc AS SELECT c.v, coalesce(g.pr, 0) AS x FROM q_cand c LEFT JOIN ${gpr.name} g ON g.v = c.v`);
      return 'native-pagerank';
    }
    if (rk.mode === 'ppr' || rk.mode === 'x_ppr_lift' || rk.mode === 'x_wcc_prior') {
      const p = rk.mode === 'x_wcc_prior' ? rk.ppr : rk;
      await this.ppr(trans[p.cochange_w].name, p.restart, nS);
      if (rk.mode === 'ppr') { await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, x FROM q_pr'); return 'sql'; }
      if (rk.mode === 'x_ppr_lift') {
        await this.run(`CREATE OR REPLACE TEMP TABLE q_sc AS SELECT c.v, coalesce(p.x, 0) / pow(greatest(coalesce(g.pr, 0), 1e-12::DOUBLE), ${D(rk.beta)}) AS x
          FROM q_cand c LEFT JOIN q_pr p ON p.v = c.v LEFT JOIN ${gpr.name} g ON g.v = c.v`);
        return 'sql+native-pagerank';
      }
      const w = await this.nativeWcc(rk.classes ? rk.classes.map((c) => CLASSES.indexOf(c)) : cids, minc, rk.k);
      await this.run(`CREATE OR REPLACE TEMP TABLE q_sc AS SELECT c.v, coalesce(p.x, 0) + CASE WHEN w.comp IN (SELECT w2.comp FROM ${w} w2 WHERE w2.v IN (${S})) THEN 1.0::DOUBLE ELSE 0.0::DOUBLE END AS x
        FROM q_cand c LEFT JOIN q_pr p ON p.v = c.v LEFT JOIN ${w} w ON w.v = c.v`);
      return 'sql+native-wcc';
    }
    if (rk.mode === 'cochange') {
      await this.run(`CREATE OR REPLACE TEMP TABLE q_sc AS SELECT c.v, sum(cc.w) AS x FROM q_cand c JOIN node n ON n.id = c.v
        JOIN cochange cc ON cc.b = n.file AND cc.a IN (SELECT DISTINCT file FROM node WHERE id IN (${S}) AND file <> 0) GROUP BY c.v`);
      return 'sql';
    }
    if (rk.mode === 'text') {
      const q = seedQuery(seed);
      if (!q.length) { await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, 0.0::DOUBLE AS x FROM q_cand WHERE FALSE'); return 'sql'; }
      await this.run(`CREATE OR REPLACE TEMP TABLE q_sc AS
        WITH q(term) AS (VALUES ${q.map((t) => `(${S_.lit(t)})`).join(', ')}),
        f AS (SELECT q.term, coalesce(df.n, 0) AS nh FROM q LEFT JOIN df ON df.term = q.term),
        idf AS (SELECT term, CASE WHEN ln((${D(this.N)} - nh + 0.5::DOUBLE) / (nh + 0.5::DOUBLE)) <= 0 THEN 1e-6::DOUBLE
                 ELSE ln((${D(this.N)} - nh + 0.5::DOUBLE) / (nh + 0.5::DOUBLE)) END AS idf FROM f)
        SELECT t.node AS v, sum(idf.idf * ((t.tf * 2.2::DOUBLE) / (t.tf + 1.2::DOUBLE * (0.25::DOUBLE + (0.75::DOUBLE * n.dl) / ${D(this.avgdl)})))) AS x
        FROM term t JOIN idf ON idf.term = t.term JOIN node n ON n.id = t.node WHERE t.node IN (SELECT v FROM q_cand) GROUP BY t.node`);
      return 'sql';
    }
    if (rk.mode === 'x_wsp') {
      await this.weightedShortest(proj(''), rk.kindCosts || {});
      await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, 1.0::DOUBLE / (1.0::DOUBLE + cost) AS x FROM q_cost WHERE cost IS NOT NULL');
      return 'native-cheapest-path';
    }
    throw new Error('duckpgq: rank mode ' + rk.mode);
  }

  // SPEC 8.2 as one recursive SQL statement (40 power-iteration steps; restart and dangling mass to the seeds)
  async ppr(T, a, nS) {
    await this.run(`CREATE OR REPLACE TEMP TABLE q_pr AS
      WITH RECURSIVE pr(it, v, p) AS (
        SELECT 0, id, 1.0::DOUBLE / ${nS} FROM q_seeds
        UNION ALL
        SELECT it + 1, v, sum(x) FROM (
          SELECT pr.it, t.v, (1.0::DOUBLE - ${D(a)}) * pr.p * t.f AS x FROM pr JOIN ${T} t ON t.u = pr.v WHERE pr.it < ${PPR_ITERS}
          UNION ALL
          SELECT i.it, s.id, (${D(a)} + (1.0::DOUBLE - ${D(a)}) * i.dm) / ${nS} FROM (
            SELECT max(it) AS it, coalesce(sum(CASE WHEN v IN (SELECT u FROM ${T}) THEN 0.0::DOUBLE ELSE p END), 0.0::DOUBLE) AS dm
            FROM pr WHERE it < ${PPR_ITERS} HAVING count(*) > 0) i CROSS JOIN q_seeds s
        ) GROUP BY it, v)
      SELECT v, p AS x FROM pr WHERE it = ${PPR_ITERS}`);
  }

  // x_wsp (addendum 3 A.2, the LadybugDB definition): native cheapest_path_length over a weighted CSR of
  // the configuration's projection (direction, classes, minConf; a hub-blocked node keeps no out-arc, so a
  // path never passes through it). Arc cost = the stored class cost / max(confidence, 0.05), or, for a kind
  // named in kindCosts, that kind's cost / max(confidence, 0.05). Cost = the minimum over seeds.
  async weightedShortest(pred, kindCosts = {}) {
    const kc = Object.entries(kindCosts).filter(([k]) => this.kindId.has(k));
    const cexpr = kc.length ? `CASE kid ${kc.map(([k, x]) => `WHEN ${this.kindId.get(k)} THEN ${D(x)} / greatest(w, 0.05::DOUBLE)`).join(' ')} ELSE cost END` : 'cost';
    // cheapest_path_length cannot read a weighted CSR built in its own statement ("CSR not found with ID 0",
    // probe9), so the CSR is built by a separate statement under a fresh id; it is freed after one call
    const id = this.wcsr = (this.wcsr || 100) + 1;
    const built = await this.all(`WITH ${this.csrCtes(pred, id, cexpr)} SELECT temp, (SELECT count(*) FROM p) AS ne FROM csr`);
    try {
      if (!built.length || !Number(built[0].ne)) { await this.run('CREATE OR REPLACE TEMP TABLE q_cost AS SELECT NULL::BIGINT AS v, NULL::DOUBLE AS cost WHERE FALSE'); return; }
      await this.run(`CREATE OR REPLACE TEMP TABLE q_cost AS WITH
        l AS (SELECT y.id AS v, cheapest_path_length(${id}, ${V}, x.rowid, y.rowid) AS cost
          FROM (SELECT rowid, id FROM node WHERE id IN (SELECT id FROM q_seeds)) x, (SELECT rowid, id FROM node WHERE id IN (SELECT v FROM q_cand)) y)
        SELECT v, min(cost)::DOUBLE AS cost FROM l WHERE cost IS NOT NULL GROUP BY v`);
    } finally { await this.all(`SELECT delete_csr(${id}) AS d`); }
  }

  async order(rk, ctx) {
    const sel = async (r) => {
      const how = await this.score(r, ctx);
      const sc = r.mode === 'bfs' ? 'NULL::DOUBLE' : (ROUND[r.mode] || R12)('coalesce(s.x, 0.0::DOUBLE)');
      return { how, sql: `SELECT c.v, h.d, coalesce(n.n, 0) AS npar, ${sc} AS score FROM q_cand c JOIN q_hop h ON h.v = c.v
        LEFT JOIN q_np n ON n.v = c.v LEFT JOIN q_sc s ON s.v = c.v` };
    };
    let base;
    if (rk.mode === 'hybrid') {
      await this.run('CREATE OR REPLACE TEMP TABLE q_fused(v BIGINT, x DOUBLE)');
      const hows = [];
      for (const p of rk.parts) {
        const s = await sel(p); hows.push(s.how);
        await this.run(`INSERT INTO q_fused SELECT v, 1.0::DOUBLE / (${RRF_K} + row_number() OVER (ORDER BY ${ORDER[p.mode]})) FROM (${s.sql})`);
      }
      await this.run('CREATE OR REPLACE TEMP TABLE q_sc AS SELECT v, sum(x) AS x FROM q_fused GROUP BY v');
      base = `SELECT c.v, h.d, coalesce(n.n, 0) AS npar, ${R12('coalesce(s.x, 0.0::DOUBLE)')} AS score FROM q_cand c JOIN q_hop h ON h.v = c.v
        LEFT JOIN q_np n ON n.v = c.v LEFT JOIN q_sc s ON s.v = c.v`;
      this.lastHow = hows;
    } else { const s = await sel(rk); base = s.sql; this.lastHow = [s.how]; }
    return this.all(`SELECT b.v, b.d, b.score, p.vs, p.ks FROM (${base}) b LEFT JOIN q_path p ON p.v = b.v ORDER BY ${ORDER[rk.mode].replace(/\b(d|v|npar|score)\b/g, 'b.$1')}`);
  }
}

module.exports = { PgqGraph, arcPred, stepPred, blockPred, ORDER, DEFAULT_THREADS };
