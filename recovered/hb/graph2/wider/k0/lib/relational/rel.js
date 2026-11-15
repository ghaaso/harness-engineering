'use strict';
// RELATIONAL arm: the SPEC.md algorithms as SQL over the store built by db.js, with thin application
// code for loops (level-wise BFS, PageRank iterations) and for walking parent pointers into the
// explanation path. Every statement lives in queries.js.
const { CLASSES, STRUCTURAL, maskOf } = require('../common/edgeclasses');
const { PPR_ITERS, RRF_K, metapathMoves, metapathAccepting, isExt } = require('../common/config');
const { seedQuery } = require('../common/textterms');
const { Q, forDir, RANK_ORDER } = require('./queries');

const BIG = 1 << 30;

// Arm-specific modes (SPEC 9.4, addendum 3 D.9): an `x_` traversal or rank that this arm runs in SQL.
// One exists: the rank x_wsp (stage 2, below). A stage-2 entry may add one here, with a written definition and a hand check on a
// toy graph; an `x_` traversal fills the hop and dag tables, an `x_` rank fills sc (score(), below).
// config.normalise accepts any `x_` mode for every arm; this arm refuses, at rank time, an `x_` mode it
// does not implement and every native `variant` (it implements the specification).
const EXT_TRAVERSAL = {};
const EXT_RANK = {};
// x_wsp (stage 2, NOTES.md "x_wsp"): weighted shortest path, the LadybugDB definition of addendum 3 A.2
// (class cost table copied from arms/ladybug/store.js CLASS_COST; any other class 3). Score = 1 / (1 +
// the minimum cost from any seed); ordered like degnorm (score desc, hop asc, id asc). Runs in SQL
// (queries.js wsp_*): one set-based relaxation statement per round, driven by this loop.
const WSP_CLASS_COST = { structure: 1, membership: 4, imports: 1, calls: 1, http: 1, tests: 1, data: 1.5, config: 1.5, capability: 3, docs: 3, history: 2, experimental: 3 };
const WSP_MAX_ROUNDS = 100000;
EXT_RANK.x_wsp = function xWsp(rk, ctx) {
  const { dir, mask, minc } = ctx;
  this.run('DELETE FROM wcost');
  const ic = this.st('INSERT INTO wcost VALUES (?, ?)');
  CLASSES.forEach((c, i) => ic.run(i, WSP_CLASS_COST[c] == null ? 3 : WSP_CLASS_COST[c]));
  this.multi(Q.wsp_init);
  const relax = forDir(Q.wsp_relax, dir);
  let it = 0;
  for (; it < WSP_MAX_ROUNDS; it++) if (Number(this.run(relax, { it, mask, minc }).changes) === 0) break;
  if (it >= WSP_MAX_ROUNDS) throw new Error('x_wsp did not converge');
  this.lastWspRounds = it + 1;
  this.multi(Q.wsp_score);
};
// an x_ rank orders like degnorm (score desc, hop asc, id asc) unless it is given its own entry
const orderOf = (mode) => RANK_ORDER[mode] || RANK_ORDER.degnorm;
function checkModes(cfg) {
  const tr = cfg.traversal || {}; const rk = cfg.rank || {};
  const parts = rk.mode === 'hybrid' ? [rk, ...rk.parts] : [rk];
  if (tr.variant || parts.some((p) => p.variant)) throw new Error('relational arm: native variants are not part of this arm (specification only)');
  if (isExt(tr.mode) && !EXT_TRAVERSAL[tr.mode]) throw new Error('relational arm: no traversal mode ' + tr.mode);
  for (const p of parts) if (isExt(p.mode) && !EXT_RANK[p.mode]) throw new Error('relational arm: no rank mode ' + p.mode);
}
// bind only the named parameters a statement uses
const pick = (sql, p) => { const o = {}; for (const k of Object.keys(p)) if (new RegExp('[$]' + k + '(?![A-Za-z0-9_])').test(sql)) o[k] = p[k]; return o; };
const STRUCT_MASK = maskOf([...STRUCTURAL]);

class RelGraph {
  constructor(db) {
    this.db = db;
    db.exec(Q.temp);
    this.kindName = new Map(db.prepare('SELECT ekid, name FROM ekind').all().map((r) => [r.ekid, r.name]));
    const m = Object.fromEntries(db.prepare('SELECT k, v FROM meta').all().map((r) => [r.k, r.v]));
    this.closureMask = Number(m.closure_mask); this.closureK = Number(m.closure_k); this.closureMinc = Number(m.closure_minc);
    this.stmts = new Map();
    this.useClosure = true;
    this.useCte = true;
    this.cache = new Map(); // per-connection cached temp tables (hub sets, PageRank transitions)
    this.kindCls = db.prepare('SELECT DISTINCT ekid, cid FROM edge ORDER BY ekid, cid').all();
  }
  st(sql) { if (!this.stmts.has(sql)) this.stmts.set(sql, this.db.prepare(sql)); return this.stmts.get(sql); }
  run(sql, p = {}) { return this.st(sql).run(pick(sql, p)); }
  // multi-statement templates (no parameters other than those bound per statement)
  multi(sql, p = {}) { for (const s of sql.split(';').map((x) => x.trim()).filter(Boolean)) this.run(s, pick(s, p)); }

  // metapath tables for one configuration
  loadMetapath(tr) {
    const im = this.st('INSERT INTO mp_move VALUES (?, ?, ?, ?)');
    for (const x of metapathMoves(tr.steps)) im.run(x.j, x.c, x.k, x.nc);
    const ia = this.st('INSERT INTO mp_acc VALUES (?, ?)');
    for (const x of metapathAccepting(tr.steps)) ia.run(x.j, x.c);
    const is = this.st('INSERT INTO mp_step VALUES (?, ?, ?)');
    const io = this.st('INSERT INTO mp_ok VALUES (?, ?, ?)');
    tr.steps.forEach((s, k) => {
      is.run(k, s.dir === 'in' ? 0 : 1, s.dir === 'out' ? 0 : 1);
      const cls = new Set(s.classes.map((c) => CLASSES.indexOf(c))); const kinds = new Set(s.kinds);
      for (const r of this.kindCls) if (cls.has(r.cid) || kinds.has(this.kindName.get(r.ekid))) io.run(k, r.ekid, r.cid);
    });
  }

  rank(seedIds, cfg, seed) {
    checkModes(cfg);
    const db = this.db; const dir = cfg.direction; const tr = cfg.traversal;
    const mask = maskOf(cfg.classes);
    const minc = cfg.minConf == null ? 0.5 : cfg.minConf;
    const H = tr.hops == null ? BIG : tr.hops;
    db.exec('BEGIN');
    try {
      db.exec(Q.reset);
      const insSeed = this.st('INSERT INTO seeds VALUES (?)');
      for (const s of seedIds) insSeed.run(s);
      // hub handling
      const gb = this.hubTable(cfg.hub, mask);
      if (gb !== 'nohub') this.run(Q.hub_apply.replace('{HC}', gb));
      // traversal
      if (EXT_TRAVERSAL[tr.mode]) {
        EXT_TRAVERSAL[tr.mode].call(this, cfg, { H, mask, minc, dir });
      } else if (tr.mode === 'budget') {
        const cls = Object.keys(tr.budgets).map((c) => CLASSES.indexOf(c)).sort((a, b) => a - b);
        let mult = 1; const ib = this.st('INSERT INTO bud VALUES (?, ?, ?)');
        for (const c of cls) { const L = tr.budgets[CLASSES[c]]; ib.run(c, L, mult); mult *= L + 1; }
        this.run(forDir(Q.budget_cte, dir), { H, minc });
        this.run(Q.budget_hop);
        this.run(forDir(Q.dag_budget, dir), { H, minc });
      } else if (tr.mode === 'metapath') {
        this.loadMetapath(tr);
        this.run(Q.mp_cte, { H, minc });
        this.run(Q.mp_hop);
        this.run(Q.mp_dag, { H, minc });
      } else {
        const closureOk = this.useClosure && dir !== 'both' && mask === this.closureMask && minc === this.closureMinc &&
          cfg.hub.mode === 'none' && tr.hops != null && tr.hops <= this.closureK;
        if (closureOk) {
          this.run(Q.khop_level_seed);
          this.run(dir === 'dependencies' ? Q.khop_closure_fwd : Q.khop_closure_rev, { H });
        } else if (tr.hops != null && this.useCte) {
          this.run(forDir(Q.khop_cte, dir), { H, mask, minc });
        } else {
          this.run(Q.khop_level_seed);
          const lvl = forDir(Q.khop_level, dir);
          for (let h = 0; h < H; h++) if (Number(this.run(lvl, { h, mask, minc }).changes) === 0) break;
        }
        this.run(forDir(Q.dag_khop, dir), { H, mask, minc });
      }
      this.run(Q.par);
      this.run(tr.mode === 'metapath' && tr.emit === 'end' ? Q.mp_cand_end : Q.cand);
      const out = this.order(cfg.rank, { seedIds, seed, dir, mask, minc, gb });
      let ranked;
      if (tr.mode === 'khop') {
        const par = new Map(this.st(Q.parents).all().map((r) => [r.v, r.pk]));
        ranked = this.withVia(out, par, new Set(seedIds));
      } else {
        this.run(tr.mode === 'budget' ? forDir(Q.sdag_budget, dir) : Q.sdag_mp, { H, minc });
        this.run(Q.spar);
        const best = new Map(this.st(tr.mode === 'budget' ? Q.best_state_budget : Q.best_state_mp).all().map((r) => [r.v, r.s]));
        ranked = this.withStateVia(out, best, new Set(seedIds));
      }
      db.exec('COMMIT');
      return ranked;
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  fill(sql, names) { return sql.replace(/{(HC|GB|TRC|TRUC)}/g, (m, k) => names[k]); }

  // the hub set of a rule (without seed exemption), cached per connection as a temp table
  hubTable(hub, mask) {
    if (hub.mode === 'none') return 'nohub';
    const key = hub.mode === 'transport' ? 'hub|transport' : 'hub|indeg|' + (mask & ~STRUCT_MASK) + '|' + hub.k;
    if (!this.cache.has(key)) {
      const name = 'hc' + this.cache.size;
      if (hub.mode === 'transport') this.multi('CREATE TEMP TABLE ' + name + '(id INTEGER PRIMARY KEY); INSERT INTO ' + name + ' SELECT id FROM node WHERE transport = 1');
      else this.multi(this.fill(Q.hub_indeg_build, { HC: name }), { hmask: mask & ~STRUCT_MASK, k: hub.k });
      this.cache.set(key, name);
    }
    return this.cache.get(key);
  }

  // fill sc for one ranking and return the ordered rows
  score(rk, ctx) {
    const { seedIds, seed, dir, mask, minc, gb } = ctx; const nS = seedIds.length;
    if (EXT_RANK[rk.mode]) return EXT_RANK[rk.mode].call(this, rk, ctx);
    if (rk.mode === 'bfs') return;
    if (rk.mode === 'degnorm') {
      this.multi(Q.degnorm_init, { nS });
      this.run(forDir(Q.degnorm_od, dir), { mask, minc });
      const maxd = this.st('SELECT MAX(d) m FROM hop').get().m || 0;
      for (let h = 1; h <= maxd; h++) this.run(Q.degnorm_level, { h });
      this.multi(Q.degnorm_score);
    } else if (rk.mode === 'ppr') {
      const p = { mask, hist: CLASSES.indexOf('history'), ccw: rk.cochange_w };
      const key = ['tr', dir, mask, rk.cochange_w, gb].join('|');
      if (!this.cache.has(key)) {
        const n = this.cache.size;
        this.cache.set(key, { TRC: 'trc' + n, TRUC: 'truc' + n });
        this.multi(forDir(this.fill(Q.ppr_trans_build, { ...this.cache.get(key), GB: gb }), dir), p);
      }
      const names = { ...this.cache.get(key), GB: gb };
      this.multi(forDir(this.fill(Q.ppr_trans_seeds, names), dir), p);
      this.multi(Q.ppr_init, { nS });
      const dang = this.fill(Q.ppr_dangling, names); const step = this.fill(Q.ppr_step, names);
      for (let it = 0; it < PPR_ITERS; it++) {
        const dm = this.st(dang).get().dm;
        this.multi(step, { a: rk.restart });
        this.run(Q.ppr_restart, { a: rk.restart, dm, nS });
        this.multi(Q.ppr_swap);
      }
      this.multi(Q.ppr_score);
    } else if (rk.mode === 'cochange') {
      this.multi(Q.cochange_score);
    } else if (rk.mode === 'text') {
      this.run('DELETE FROM sc');
      const q = seedQuery(seed);
      if (q.length) this.run(Q.text_score.replace('DELETE FROM sc;', '').trim(), { q: q.map((t) => '"' + t + '"').join(' OR ') });
    } else if (rk.mode === 'hybrid') {
      this.run('DELETE FROM fused');
      for (const part of rk.parts) {
        this.run('DELETE FROM sc');
        this.score(part, ctx);
        this.run(Q.hybrid_add.replace('{ORDER}', orderOf(part.mode).order), { rrf: RRF_K });
      }
      this.multi(Q.hybrid_score);
    } else throw new Error('rank mode ' + rk.mode);
  }

  order(rk, ctx) {
    this.run('DELETE FROM sc');
    this.score(rk, ctx);
    const o = orderOf(rk.mode);
    return this.st(Q.rank.replace('{SCORE}', o.score).replace('{ORDER}', o.order)).all();
  }

  // explanation over automaton states: walk state parents from v's smallest state at depth hop(v)
  withStateVia(rows, best, seeds) {
    const memo = new Map(); const get = this.st(Q.spar_get);
    const chain = (v, s) => {
      if (s === 0 && seeds.has(v)) return [[], [v]];
      const key = v + ',' + s;
      if (memo.has(key)) return memo.get(key);
      const pk = get.get(v, s).pk;
      const u = Math.floor(pk / 33554432); const k = Math.floor(pk / 8192) % 4096; const su = pk % 8192;
      const [vu, pu] = chain(u, su);
      const r = [[...vu, this.kindName.get(k)], [...pu, v]];
      memo.set(key, r); return r;
    };
    return rows.map((r) => { const [via, path] = chain(r.node, best.get(r.node)); return { i: r.node, hop: r.d, score: r.score, via, path }; });
  }

  // explanation: the parent chain (parent = smallest (u id, kind id) among DAG arcs into v)
  withVia(rows, par, seeds) {
    const memo = new Map();
    const chain = (v) => {
      if (seeds.has(v)) return [[], [v]];
      if (memo.has(v)) return memo.get(v);
      const pk = par.get(v);
      const u = Math.floor(pk / 4096); const k = pk % 4096;
      const [vu, pu] = chain(u);
      const r = [[...vu, this.kindName.get(k)], [...pu, v]];
      memo.set(v, r); return r;
    };
    return rows.map((r) => { const [via, path] = chain(r.node); return { i: r.node, hop: r.d, score: r.score, via, path }; });
  }
}

module.exports = { RelGraph, EXT_TRAVERSAL, EXT_RANK, checkModes };
