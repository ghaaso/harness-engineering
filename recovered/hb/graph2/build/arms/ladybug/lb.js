'use strict';
// GRAPH ARM on LadybugDB 0.22.3: every algorithm of arms/common/SPEC.md as Cypher over the store built
// by store.js, plus the engine-native modes (SPEC 9.4 extensions and variants). Where a step is not in
// the engine it says so (NOTES.md has the table):
//   reach + hop (khop)         Cypher recursive pattern  -[:A* SHORTEST 1..H (r, n | WHERE ...)]-
//                              with class / weight / direction / hub predicates (native)
//   reach DAG, parents, npar   Cypher: the arcs out of every expanded node in one query; the DAG rule
//                              (hop(v) = hop(u) + 1) and parent choice in application code
//   budget, metapath (spec)    Cypher: one expansion query per BFS level; the automaton bookkeeping
//                              (state counters, first-visit depth, state parents) in application code
//   metapath (variant pattern) Cypher typed path patterns over the per-kind tables (native)
//   hubs                       Cypher node predicates on precomputed properties (native)
//   degnorm                    Cypher (arcs, out-degrees); activation spreading in application code
//   ppr (spec)                 Cypher (transition arcs, cached per configuration); 40 iterations in
//                              application code (pprImpl "app"), or every iteration as Cypher writes
//                              on node properties (pprImpl "engine"; same output, about 1.6 s a query)
//   ppr (variant gds)          native GDS_PPR (icebug): undirected, unweighted, one table
//   cochange, text (BM25)      Cypher (BM25 over the term graph T/HAS)
//   hybrid                     reciprocal rank fusion in application code
//   x_wsp                      native weighted shortest path WSHORTEST(cost)
//   x_comm, x_prank, x_core    stored native Louvain / page_rank / k-core properties read by Cypher
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');
const { PPR_ITERS, RRF_K } = require('../common/config');
const { seedQuery } = require('../common/textterms');
const S = require('./store');

const r12 = (x) => Math.round(x * 1e12) / 1e12;
const r9 = (x) => Math.round(x * 1e9) / 1e9;
const HISTORY = CLASSES.indexOf('history');
const num = S.num;
const lit = (x) => String(x);
const list = (a) => '[' + a.join(', ') + ']';
const now = () => Number(process.hrtime.bigint()) / 1e6;
const PS_CAP = 48; // about 2.3 MB of pinned buffer pool each (recursive patterns), so at most about 110 MB
// a parameter as a Cypher literal (numbers keep their JS type: integers print without a point, so
// callers that need a DOUBLE CAST it, as the prepared form already does)
function litOf(x) {
  if (Array.isArray(x)) return '[' + x.map(litOf).join(', ') + ']';
  if (typeof x === 'number') { if (!Number.isFinite(x)) throw new Error('non-finite parameter'); return String(x); }
  if (typeof x === 'string') return "'" + x.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  if (typeof x === 'boolean') return x ? 'true' : 'false';
  if (x == null) return 'NULL';
  if (typeof x === 'object') return '{' + Object.entries(x).map(([k, v]) => k + ': ' + litOf(v)).join(', ') + '}';
  throw new Error('unsupported parameter ' + typeof x);
}
function inline(text, params) {
  if (!params) return text;
  return text.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, k) => (k in params ? litOf(params[k]) : m));
}

class LbGraph {
  constructor(st, G, opts = {}) {
    this.st = st; this.c = st.conn; this.G = G;
    this.kindName = [null, ...G.kinds];
    this.kindId = new Map(G.kinds.map((k, i) => [k, i + 1]));
    this.types = st.meta.types;
    this.ps = new Map();
    this.cache = new Map();
    this.pprImpl = opts.pprImpl || 'app';
    this.prepare = opts.prepare != null ? opts.prepare : process.env.LB_PREPARE !== '0';
    this.stats = { queries: 0, query_ms: 0 };
    const r = this.q('MATCH (n:N) RETURN count(*) AS n, sum(n.dl) AS t')[0];
    this.nDocs = num(r.n); this.avgdl = num(r.t) / this.nDocs;
    this.algoLoaded = false;
  }

  // ---- query helpers ----------------------------------------------------------------------------
  // Engine limit found here: every prepared statement pins buffer-pool pages until the connection
  // closes (no close() on PreparedStatement, a forced GC does not release it; about 2.3 MB for a
  // recursive pattern, so a 256 MB pool is full after about 110 distinct texts). querySync does not
  // pin. So: texts that are constant per configuration are prepared once and kept (at most PS_CAP);
  // texts that carry per-task literals (seed-exemption lists inside recursive predicates, which take
  // no parameters) or overflow the cap go through querySync with the parameters inlined.
  q(text, params) {
    const t = now();
    let rows;
    const once = !this.prepare || /\.id IN \[|GDS_PPR\(/.test(text);
    let ps = once ? null : this.ps.get(text);
    if (!ps && !once && this.ps.size < PS_CAP) {
      ps = this.c.prepareSync(text);
      if (!ps.isSuccess()) throw new Error(ps.getErrorMessage() + '\n' + text);
      this.ps.set(text, ps);
    }
    if (ps) rows = S.getAll(this.c.executeSync(ps, params || {}));
    else {
      const qr = this.c.querySync(inline(text, params));
      rows = S.getAll(qr);
    }
    this.stats.queries++; this.stats.query_ms += now() - t;
    return rows;
  }
  // drop the caches held in application code (PageRank transition CSRs, blocked-node sets); the named
  // GDS projections stay (they live in the engine). bench.js uses it for the uncached latency.
  dropAppCache() { for (const k of [...this.cache.keys()]) if (k.startsWith('tr|') || k.startsWith('blk|')) this.cache.delete(k); }
  algo() { if (!this.algoLoaded) { S.getAll(this.c.querySync('LOAD EXTENSION algo')); this.algoLoaded = true; } }

  // ---- predicates -------------------------------------------------------------------------------
  // hub rule as a Cypher predicate on node variable v (true = blocked); seeds exempt
  blockedExpr(hub, M, seeds, v = 'n') {
    let e = null;
    if (hub.mode === 'indeg') {
      const cols = [...M].filter((c) => !STRUCTURAL.has(CLASSES[c])).map((c) => v + '.pi_' + c);
      if (!cols.length) return null;
      e = '(' + cols.join(' + ') + ') > ' + hub.k;
    } else if (hub.mode === 'transport') e = v + '.transport';
    else if (hub.mode === 'x_core') e = v + '.core > ' + hub.k;
    if (!e) return null;
    return '(' + e + ' AND NOT ' + v + '.id IN ' + list(seeds) + ')';
  }
  blockedSet(hub, M, seeds) {
    const e = this.blockedExpr(hub, M, [], 'n');
    if (!e) return new Set();
    const key = 'blk|' + e;
    if (!this.cache.has(key)) this.cache.set(key, new Set(this.q('MATCH (n:N) WHERE ' + e + ' RETURN n.id AS i').map((r) => num(r.i))));
    const b = this.cache.get(key);
    if (!seeds.some((s) => b.has(s))) return b;
    const out = new Set(b); for (const s of seeds) out.delete(s); return out;
  }
  // class filter on rel variable r
  clsExpr(M, r = 'r') { return r + '.cls IN ' + list([...M].sort((a, b) => a - b)); }

  // arcs out of a set of nodes (SPEC 4): rows {u, v, k, c, o, w}
  arcsOf(U, dir, M, minc, extra = '') {
    if (!U.length || !M.size) return [];
    const base = this.clsExpr(M) + (minc == null ? '' : ' AND r.w >= ' + lit(minc)) + extra;
    const parts = [];
    parts.push(`MATCH (u:N)-[r:A]->(v:N) WHERE u.id IN $U AND ${base}${dir === 'dependents' ? ' AND r.sym = 1' : ''} RETURN u.id AS u, v.id AS v, r.kid AS k, r.cls AS c, 0 AS o, r.w AS w`);
    if (dir !== 'dependencies') parts.push(`MATCH (u:N)<-[r:A]-(v:N) WHERE u.id IN $U AND ${base} AND r.sym = 0 RETURN u.id AS u, v.id AS v, r.kid AS k, r.cls AS c, 1 AS o, r.w AS w`);
    return this.q(parts.join(' UNION ALL '), { U }).map((x) => ({ u: num(x.u), v: num(x.v), k: num(x.k), c: num(x.c), o: num(x.o), w: x.w }));
  }

  // ---- traversals -------------------------------------------------------------------------------
  // khop: hop of every non-blocked reached node by the native recursive SHORTEST pattern, then one
  // query for the arcs out of every expanded node (DAG arcs, blocked end nodes, out-degrees)
  khop(seeds, cfg, M, minc, H, hub) {
    const hop = new Map(seeds.map((s) => [s, 0]));
    const out = { hop, dag: [], arcsByU: new Map() };
    if (H === 0 || !M.size) return out;
    const blk = this.blockedExpr(hub, M, seeds, 'n');
    const dir = cfg.direction;
    const [a, b] = dir === 'dependencies' ? ['-', '->'] : dir === 'dependents' ? ['<-', '-'] : ['-', '-'];
    const pred = this.clsExpr(M) + ' AND r.w >= ' + lit(minc) + (dir === 'both' ? ' AND (r.sym = 0 OR r.prim = 1)' : '') + (blk ? ' AND NOT ' + blk : '');
    const rows = this.q(`MATCH (s:N)${a}[p:A* SHORTEST 1..${H == null ? 10000 : H} (r, n | WHERE ${pred})]${b}(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`, { S: seeds });
    for (const r of rows) { const v = num(r.v); if (!hop.has(v)) hop.set(v, num(r.h)); }
    const E = [...hop.keys()].filter((v) => H == null || hop.get(v) < H);
    const arcs = this.arcsOf(E, dir, M, minc);
    for (const x of arcs) {
      if (!out.arcsByU.has(x.u)) out.arcsByU.set(x.u, []);
      out.arcsByU.get(x.u).push(x);
    }
    // blocked end nodes (the recursive pattern never ends on them): reached, never expanded, at the
    // minimum hop(u) + 1 over the expanded nodes u with an arc to them
    const base = new Set(hop.keys());
    for (const x of arcs) {
      if (base.has(x.v)) continue;
      const h = hop.get(x.u) + 1;
      if (!hop.has(x.v) || hop.get(x.v) > h) hop.set(x.v, h);
    }
    for (const x of arcs) {
      const hv = hop.get(x.v);
      if (hv !== hop.get(x.u) + 1) continue;
      out.dag.push(x);
    }
    return out;
  }

  // budget and metapath (SPEC 6.2, 6.3): BFS over (node, automaton state); one engine query per
  // level for the arcs out of the frontier's nodes; the automaton in application code
  stateBfs(seeds, cfg, M, minc, H, hub) {
    const tr = cfg.traversal; const dir = cfg.direction;
    const blocked = this.blockedSet(hub, M, seeds);
    const hop = new Map(seeds.map((s) => [s, 0]));
    const dagKey = new Set(); const dag = [];
    const sdep = new Map(); const spar = new Map();
    let accepted = null;
    let step; let fetch;
    if (tr.mode === 'budget') {
      const lim = new Map(); const mult = new Map(); let m = 1;
      for (const c of Object.keys(tr.budgets).map((x) => CLASSES.indexOf(x)).sort((x, y) => x - y)) { lim.set(c, tr.budgets[CLASSES[c]]); mult.set(c, m); m *= tr.budgets[CLASSES[c]] + 1; }
      fetch = (U) => this.arcsOf(U, dir, M, minc);
      step = (a, st) => { const L = lim.get(a.c); const Mu = mult.get(a.c); return Math.floor(st / Mu) % (L + 1) >= L ? null : [st + Mu]; };
    } else {
      const A = automaton(tr.steps);
      const stepCls = new Set(); const stepKid = new Set();
      for (const s of A.st) { for (const c of s.cls) stepCls.add(c); for (const k of s.kinds) if (this.kindId.has(k)) stepKid.add(this.kindId.get(k)); }
      if (tr.emit === 'end') { accepted = new Set(); if (A.accepting(0, 0)) for (const s of seeds) accepted.add(s); }
      const allCls = new Set(CLASSES.map((c, i) => i));
      const kidExpr = stepKid.size ? ' OR r.kid IN ' + list([...stepKid]) : '';
      fetch = (U) => this.arcsOfAny(U, stepCls, kidExpr, minc, allCls);
      step = (a, st) => {
        const j = st >> 3; const c = st & 7; const moves = A.next(j, c); const ns = [];
        for (const [k, nc] of moves) {
          if (!A.stepOk(A.st[k], a, this.kindName)) continue;
          ns.push(k * 8 + nc);
          if (accepted && A.accepting(k, nc)) accepted.add(a.v);
        }
        return ns.length ? ns : null;
      };
    }
    let frontier = seeds.map((s) => [s, 0]);
    for (const s of seeds) sdep.set(s + ',0', 0);
    const arcsByU = new Map();
    let d = 0;
    while (frontier.length && (H == null || d < H)) {
      const U = [...new Set(frontier.map((f) => f[0]).filter((u) => !blocked.has(u)))].filter((u) => !arcsByU.has(u));
      if (U.length) {
        for (const u of U) arcsByU.set(u, []);
        for (const x of fetch(U)) arcsByU.get(x.u).push(x);
      }
      const next = [];
      for (const [u, st] of frontier) {
        if (blocked.has(u)) continue;
        for (const a of arcsByU.get(u)) {
          const nss = step(a, st);
          if (!nss) continue;
          if (!hop.has(a.v)) hop.set(a.v, d + 1);
          if (hop.get(a.v) === d + 1) { const key = u + '|' + a.v + '|' + a.k + '|' + a.o; if (!dagKey.has(key)) { dagKey.add(key); dag.push(a); } }
          for (const ns of nss) {
            const key = a.v + ',' + ns; const cand = [u, a.k, st];
            if (!sdep.has(key)) { sdep.set(key, d + 1); spar.set(key, cand); next.push([a.v, ns]); continue; }
            if (sdep.get(key) === d + 1) {
              const p = spar.get(key);
              if (cand[0] < p[0] || (cand[0] === p[0] && (cand[1] < p[1] || (cand[1] === p[1] && cand[2] < p[2])))) spar.set(key, cand);
            }
          }
        }
      }
      frontier = next; d++;
    }
    return { hop, dag, sdep, spar, accepted, arcsByU: tr.mode === 'budget' ? arcsByU : null };
  }

  // arcs in every orientation whose class is in C or kind matches kidExpr (metapath steps)
  arcsOfAny(U, C, kidExpr, minc) {
    if (!U.length) return [];
    const base = '(' + this.clsExpr(C) + kidExpr + ') AND r.w >= ' + lit(minc);
    const t = `MATCH (u:N)-[r:A]->(v:N) WHERE u.id IN $U AND ${base} RETURN u.id AS u, v.id AS v, r.kid AS k, r.cls AS c, 0 AS o, r.sym AS sym UNION ALL MATCH (u:N)<-[r:A]-(v:N) WHERE u.id IN $U AND ${base} AND r.sym = 0 RETURN u.id AS u, v.id AS v, r.kid AS k, r.cls AS c, 1 AS o, r.sym AS sym`;
    return this.q(t, { U }).map((x) => ({ u: num(x.u), v: num(x.v), k: num(x.k), c: num(x.c), o: num(x.o), sym: num(x.sym) }));
  }

  // ---- ranked list ------------------------------------------------------------------------------
  rank(seedIds, cfg, seed) {
    const tr = cfg.traversal; const rk = cfg.rank;
    const minc = cfg.minConf == null ? 0.5 : cfg.minConf;
    const M = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
    const seeds = [...seedIds].sort((a, b) => a - b);
    const seedSet = new Set(seeds);
    const H = tr.hops;
    let hub = cfg.hub;
    let T;
    if (tr.mode === 'khop' || tr.mode === 'x_core') {
      if (tr.mode === 'x_core') hub = { mode: 'x_core', k: tr.k };
      T = this.khop(seeds, cfg, M, minc, H, hub);
    } else if (tr.mode === 'budget' || (tr.mode === 'metapath' && tr.variant !== 'pattern')) T = this.stateBfs(seeds, cfg, M, minc, H, hub);
    else if (tr.mode === 'metapath' && tr.variant === 'pattern') T = require('./pattern').metapathPattern(this, seeds, cfg, minc, H, hub);
    else throw new Error('traversal mode ' + tr.mode);
    const { hop, dag } = T;
    const npar = new Map(); const parent = new Map(); const dagIn = new Map();
    for (const a of dag) {
      if (!dagIn.has(a.v)) dagIn.set(a.v, []);
      dagIn.get(a.v).push(a);
      if (!npar.has(a.v)) npar.set(a.v, new Set());
      npar.get(a.v).add(a.u);
      const p = parent.get(a.v);
      if (!p || a.u < p[0] || (a.u === p[0] && a.k < p[1])) parent.set(a.v, [a.u, a.k]);
    }
    const R = [...hop.keys()].filter((v) => !seedSet.has(v) && (!T.accepted || T.accepted.has(v)));
    const np = (v) => (npar.get(v) ? npar.get(v).size : 0);
    const Hh = (v) => hop.get(v);
    const ctx = { seeds, seedSet, cfg, M, minc, hub, T, R, np, Hh, dagIn, seed };
    const o = this.scoreFor(rk, ctx);
    const chain = this.explainer(T, tr, parent, seedSet);
    return R.sort(o.key).map((v) => { const [via, path] = chain(v); return { i: v, hop: Hh(v), score: o.score(v), via, path }; });
  }

  explainer(T, tr, parent, seedSet) {
    const memo = new Map();
    if (T.explain) return T.explain;
    if (!T.sdep) {
      const chainN = (v) => {
        if (seedSet.has(v)) return [[], [v]];
        if (memo.has(v)) return memo.get(v);
        const [u, k] = parent.get(v);
        const [vu, pu] = chainN(u);
        const r = [[...vu, this.kindName[k]], [...pu, v]];
        memo.set(v, r); return r;
      };
      return chainN;
    }
    const { sdep, spar, hop } = T;
    const bestS = new Map();
    for (const [key, dep] of sdep) {
      const c = key.indexOf(','); const v = Number(key.slice(0, c)); const s = Number(key.slice(c + 1));
      if (dep === hop.get(v) && (!bestS.has(v) || s < bestS.get(v))) bestS.set(v, s);
    }
    const chainS = (v, s) => {
      const key = v + ',' + s;
      if (sdep.get(key) === 0) return [[], [v]];
      if (memo.has(key)) return memo.get(key);
      const [u, k, su] = spar.get(key);
      const [vu, pu] = chainS(u, su);
      const r = [[...vu, this.kindName[k]], [...pu, v]];
      memo.set(key, r); return r;
    };
    return (v) => chainS(v, bestS.get(v));
  }

  // out-degree od(u) under cfg.direction, cfg.classes and minConf (SPEC 8.1)
  outDegrees(U, ctx) {
    const { T, cfg, M, minc } = ctx;
    const od = new Map();
    const reuse = T.arcsByU && (cfg.traversal.mode !== 'metapath');
    const need = [];
    for (const u of U) { if (reuse && T.arcsByU.has(u)) od.set(u, T.arcsByU.get(u).length); else need.push(u); }
    if (need.length) {
      const rows = this.arcsOf(need, cfg.direction, M, minc);
      for (const u of need) od.set(u, 0);
      for (const x of rows) od.set(x.u, od.get(x.u) + 1);
    }
    return od;
  }

  scoreFor(rk, ctx) {
    const { seeds, R, np, Hh, cfg, M, hub } = ctx;
    if (rk.mode === 'bfs') return { key: (a, b) => Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: () => null };
    if (rk.mode === 'degnorm') {
      const act = new Map(); for (const s of seeds) act.set(s, 1 / seeds.length);
      const srcs = new Set(); for (const a of ctx.T.dag) srcs.add(a.u);
      const od = this.outDegrees([...srcs], ctx);
      // SPEC 8.1 (addendum 3, A.1): a DAG source with no arc under cfg.direction (possible only in
      // metapath mode, where a step may run against the configured direction) divides by the number of
      // reach-DAG arcs leaving it, each (u, v, kind, orientation) once, which is at least 1
      const zero = [...srcs].filter((u) => !od.get(u));
      if (zero.length) {
        this.stats.degnorm_od0 = (this.stats.degnorm_od0 || 0) + 1;
        const seen = new Set(); const z = new Set(zero);
        for (const u of zero) od.set(u, 0);
        for (const a of ctx.T.dag) {
          if (!z.has(a.u)) continue;
          const k = a.u + '|' + a.v + '|' + a.k + '|' + a.o;
          if (!seen.has(k)) { seen.add(k); od.set(a.u, od.get(a.u) + 1); }
        }
      }
      const order = [...ctx.T.hop.keys()].filter((v) => !ctx.seedSet.has(v)).sort((a, b) => Hh(a) - Hh(b) || a - b);
      for (const v of order) { let s = 0; for (const a of ctx.dagIn.get(v) || []) s += (act.get(a.u) || 0) / od.get(a.u); act.set(v, s); }
      const sc = (v) => r12(act.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
    }
    if (rk.mode === 'ppr') {
      let p;
      if (rk.variant === 'gds') p = this.pprGds(seeds, rk, M);
      else if (rk.variant) throw new Error('unknown ppr variant ' + rk.variant);
      else p = this.pprImpl === 'engine' ? this.pprEngine(seeds, rk, cfg, M, hub) : this.pprApp(seeds, rk, cfg, M, hub);
      const sc = (v) => r12(p.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
    }
    if (rk.mode === 'cochange') {
      const F = [...new Set(seeds.map((s) => this.G.nodes[s - 1].file).filter(Boolean))];
      const cc = new Map();
      if (F.length && R.length) {
        for (const r of this.q(`MATCH (v:N) WHERE v.id IN $R MATCH (f:N)-[r:A]->(x:N) WHERE f.id IN $F AND r.sym = 1 AND r.cls = ${HISTORY} AND x.id = v.file RETURN v.id AS v, sum(r.w) AS s`, { R, F })) cc.set(num(r.v), r.s);
      }
      const sc = (v) => r12(cc.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: sc };
    }
    if (rk.mode === 'text') {
      const terms = seedQuery(ctx.seed);
      const bm = new Map();
      if (terms.length && R.length) {
        const idf = `CASE WHEN ln((${this.nDocs} - t.df + 0.5) / (t.df + 0.5)) <= 0 THEN 0.000001 ELSE ln((${this.nDocs} - t.df + 0.5) / (t.df + 0.5)) END`;
        const rows = this.q(`MATCH (n:N)-[h:HAS]->(t:T) WHERE t.term IN $q AND n.id IN $R RETURN n.id AS v, sum(${idf} * ((h.tf * 2.2) / (h.tf + 1.2 * (0.25 + (0.75 * n.dl) / ${lit(this.avgdl)})))) AS s`, { q: terms, R });
        for (const r of rows) bm.set(num(r.v), r.s);
      }
      const sc = (v) => r9(bm.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: sc };
    }
    if (rk.mode === 'hybrid') {
      const fused = new Map();
      for (const part of rk.parts) {
        const o = this.scoreFor(part, ctx); const order = [...R].sort(o.key);
        order.forEach((v, idx) => fused.set(v, (fused.get(v) || 0) + 1 / (RRF_K + idx + 1)));
      }
      const sc = (v) => r12(fused.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
    }
    if (rk.mode === 'x_wsp') return this.wsp(seeds, ctx);
    if (rk.mode === 'x_comm' || rk.mode === 'x_prank') {
      const m = new Map();
      if (R.length) {
        if (rk.mode === 'x_comm') {
          const sc = new Set(this.q('MATCH (n:N) WHERE n.id IN $S RETURN n.comm AS c', { S: seeds }).map((r) => num(r.c)));
          for (const r of this.q('MATCH (n:N) WHERE n.id IN $R RETURN n.id AS v, n.comm AS c', { R })) m.set(num(r.v), sc.has(num(r.c)) ? 1 : 0);
        } else for (const r of this.q('MATCH (n:N) WHERE n.id IN $R RETURN n.id AS v, n.prank AS s', { R })) m.set(num(r.v), r.s);
      }
      const sc = (v) => r12(m.get(v) || 0);
      return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
    }
    throw new Error('rank mode ' + rk.mode);
  }

  // ---- personalised PageRank (SPEC 8.2) ---------------------------------------------------------
  // transition arcs of every node under direction and classes (every confidence), from the engine,
  // cached per (direction, classes, cochange weight); blocked nodes are dangling
  transitions(cfg, M, ccw) {
    const key = ['tr', cfg.direction, [...M].sort((a, b) => a - b).join(','), ccw].join('|');
    if (this.cache.has(key)) return this.cache.get(key);
    const dir = cfg.direction; const N = this.G.nodes.length + 1;
    const parts = [`MATCH (u:N)-[r:A]->(v:N) WHERE ${this.clsExpr(M)}${dir === 'dependents' ? ' AND r.sym = 1' : ''} RETURN u.id AS u, v.id AS v, r.w AS w, r.cls AS c`];
    if (dir !== 'dependencies') parts.push(`MATCH (u:N)<-[r:A]-(v:N) WHERE ${this.clsExpr(M)} AND r.sym = 0 RETURN u.id AS u, v.id AS v, r.w AS w, r.cls AS c`);
    const rows = M.size ? this.q(parts.join(' UNION ALL ')) : [];
    // CSR with parallel arcs summed per (u, v) and normalised by the total
    const acc = new Map();
    for (const r of rows) {
      const u = num(r.u); const v = num(r.v); const w = r.w * (num(r.c) === HISTORY ? ccw : 1);
      if (!acc.has(u)) acc.set(u, new Map());
      const m = acc.get(u); m.set(v, (m.get(v) || 0) + w);
    }
    const start = new Int32Array(N + 1); const nbr = []; const frac = [];
    for (let u = 1; u < N; u++) {
      start[u] = nbr.length;
      const m = acc.get(u);
      if (!m) continue;
      let W = 0; for (const w of m.values()) W += w;
      if (W <= 0) continue;
      for (const [v, w] of m) { nbr.push(v); frac.push(w / W); }
    }
    start[N] = nbr.length;
    const t = { start, nbr: Int32Array.from(nbr), frac: Float64Array.from(frac), N };
    this.cache.set(key, t);
    return t;
  }
  pprApp(seeds, rk, cfg, M, hub) {
    const t = this.transitions(cfg, M, rk.cochange_w);
    const blocked = this.blockedSet(hub, M, seeds);
    const alpha = rk.restart; const N = t.N;
    let p = new Float64Array(N); for (const s of seeds) p[s] = 1 / seeds.length;
    let q = new Float64Array(N);
    // follow the reference's accumulation order: sources in first-touched order
    let order = [...seeds];
    for (let it = 0; it < PPR_ITERS; it++) {
      q.fill(0); let dm = 0; const seen = new Uint8Array(N); const nextOrder = [];
      const touch = (v) => { if (!seen[v]) { seen[v] = 1; nextOrder.push(v); } };
      for (const u of order) {
        const pu = p[u];
        const a = t.start[u]; const b = t.start[u + 1];
        if (blocked.has(u) || a === b) { dm += pu; continue; }
        for (let j = a; j < b; j++) { const v = t.nbr[j]; touch(v); q[v] += (1 - alpha) * pu * t.frac[j]; }
      }
      for (const s of seeds) { touch(s); q[s] += (alpha + (1 - alpha) * dm) / seeds.length; }
      const tmp = p; p = q; q = tmp; order = nextOrder;
    }
    const out = new Map(); for (const v of order) out.set(v, p[v]);
    return out;
  }
  // every iteration inside the engine: node properties p, q, W written by Cypher (same specification)
  pprEngine(seeds, rk, cfg, M, hub) {
    const dir = cfg.direction; const a = rk.restart; const ccw = rk.cochange_w;
    const blk = this.blockedExpr(hub, M, seeds, 'u');
    const wexpr = `r.w * CASE WHEN r.cls = ${HISTORY} THEN ${lit(ccw)} ELSE 1.0 END`;
    const F = this.clsExpr(M);
    const fwd = dir === 'dependents' ? ' AND r.sym = 1' : '';
    const P0 = { S: seeds };
    this.q('MATCH (n:N) WHERE n.W <> 0 OR n.p <> 0 OR n.q <> 0 SET n.W = 0.0, n.p = 0.0, n.q = 0.0');
    const blkU = blk ? ' AND NOT (' + this.blockedExpr(hub, M, [], 'u') + ' AND NOT u.id IN $S)' : '';
    this.q(`MATCH (u:N)-[r:A]->(v:N) WHERE ${F}${fwd}${blkU} WITH u, sum(${wexpr}) AS W SET u.W = W`, blk ? P0 : undefined);
    if (dir !== 'dependencies') this.q(`MATCH (u:N)<-[r:A]-(v:N) WHERE ${F} AND r.sym = 0${blkU} WITH u, sum(${wexpr}) AS W SET u.W = u.W + W`, blk ? P0 : undefined);
    this.q('MATCH (n:N) WHERE n.id IN $S SET n.p = 1.0 / CAST($ns AS DOUBLE)', { S: seeds, ns: seeds.length });
    for (let it = 0; it < PPR_ITERS; it++) {
      const dm = this.q('MATCH (n:N) WHERE n.p <> 0 AND n.W <= 0 RETURN sum(n.p) AS dm')[0].dm || 0;
      this.q('MATCH (n:N) WHERE n.q <> 0 SET n.q = 0.0');
      this.q(`MATCH (u:N)-[r:A]->(v:N) WHERE u.p <> 0 AND u.W > 0 AND ${F}${fwd} WITH v, sum(u.p * (${wexpr}) / u.W) AS s SET v.q = s`);
      if (dir !== 'dependencies') this.q(`MATCH (u:N)<-[r:A]-(v:N) WHERE u.p <> 0 AND u.W > 0 AND ${F} AND r.sym = 0 WITH v, sum(u.p * (${wexpr}) / u.W) AS s SET v.q = v.q + s`);
      this.q('MATCH (n:N) WHERE n.q <> 0 OR n.p <> 0 OR n.id IN $S SET n.p = (1.0 - CAST($a AS DOUBLE)) * n.q + CASE WHEN n.id IN $S THEN (CAST($a AS DOUBLE) + (1.0 - CAST($a AS DOUBLE)) * CAST($dm AS DOUBLE)) / CAST($ns AS DOUBLE) ELSE 0.0 END', { S: seeds, a, dm, ns: seeds.length });
    }
    const out = new Map(this.q('MATCH (n:N) WHERE n.p <> 0 RETURN n.id AS i, n.p AS p').map((r) => [num(r.i), r.p]));
    S.getAll(this.c.querySync('CHECKPOINT'));
    return out;
  }
  // native GDS_PPR (icebug): undirected, unweighted, one relationship table, its own stopping rule
  pprGds(seeds, rk, M) {
    this.algo();
    const key = 'gds|' + [...M].sort((x, y) => x - y).join(',');
    if (!this.cache.has(key)) {
      const name = 'gp' + this.cache.size;
      S.getAll(this.c.querySync(`CALL PROJECT_GRAPH('${name}', ['N'], {'A': '${this.clsExpr(M)} AND (r.sym = 0 OR r.prim = 1)'})`));
      this.cache.set(key, name);
    }
    const name = this.cache.get(key);
    const off = this.q('MATCH (n:N) WHERE n.id IN $S RETURN offset(id(n)) AS o', { S: seeds }).map((r) => num(r.o));
    const rows = this.q(`CALL GDS_PPR('${name}', ${list(off)}, dampingFactor := ${lit(1 - rk.restart)}) WITH node, rank WHERE rank > 0 RETURN node.id AS i, rank`);
    return new Map(rows.map((r) => [num(r.i), r.rank]));
  }

  // ---- x_wsp: weighted shortest path cost from the nearest seed (native WSHORTEST over A.cost) -----
  // One definition for both graph engines (addendum 3, A.2): the cost of an edge is its kind's cost
  // (store.js CLASS_COST, by the kind's class; NOTES.md has the table) divided by its confidence
  // (floored at 0.05); arcs under cfg.direction, cfg.classes and minConf; a node blocked by the hub cut
  // can end a path but never be passed through (seeds are never blocked). Score = 1 / (1 + cost), 0 when
  // no path exists.
  wsp(seeds, ctx) {
    const { cfg, M, minc, R, Hh, hub } = ctx;
    const m = new Map();
    if (R.length && M.size) {
      const dir = cfg.direction;
      const [a, b] = dir === 'dependencies' ? ['-', '->'] : dir === 'dependents' ? ['<-', '-'] : ['-', '-'];
      const blk = this.blockedExpr(hub, M, seeds, 'n');
      const pred = this.clsExpr(M) + ' AND r.w >= ' + lit(minc) + (dir === 'both' ? ' AND (r.sym = 0 OR r.prim = 1)' : '') + (blk ? ' AND NOT ' + blk : '');
      const cost = new Map();
      let targets = R;
      // a blocked candidate v: its cost is min over its predecessors u (not blocked, or a seed) of
      // cost(u) + c(u, v); the predecessors' own costs come from the same recursive query
      const blocked = blk ? this.blockedSet(hub, M, seeds) : null;
      const B = blocked ? R.filter((v) => blocked.has(v)) : [];
      let inArcs = [];
      if (B.length) {
        const flip = dir === 'dependencies' ? 'dependents' : dir === 'dependents' ? 'dependencies' : 'both';
        inArcs = this.arcsOf(B, flip, M, minc).filter((x) => !blocked.has(x.v));
        targets = [...new Set([...R, ...inArcs.map((x) => x.v)])];
      }
      const rows = this.q(`MATCH (s:N)${a}[p:A* WSHORTEST(cost) (r, n | WHERE ${pred})]${b}(v:N) WHERE s.id IN $S AND v.id IN $R RETURN v.id AS v, min(cost(p)) AS c`, { S: seeds, R: targets });
      for (const r of rows) cost.set(num(r.v), r.c);
      for (const s of seeds) cost.set(s, 0);
      if (B.length) {
        for (const x of inArcs) {
          if (!cost.has(x.v)) continue;
          const c = cost.get(x.v) + S.edgeCost(CLASSES[x.c], x.w);
          if (!cost.has(x.u) || c < cost.get(x.u)) cost.set(x.u, c);
        }
      }
      for (const v of R) if (cost.has(v)) m.set(v, 1 / (1 + cost.get(v)));
    }
    const sc = (v) => r12(m.get(v) || 0);
    return { key: (x, y) => sc(y) - sc(x) || Hh(x) - Hh(y) || x - y, score: sc };
  }
}

// metapath automaton (SPEC 6.3), the same rules as config.metapathMoves / metapathAccepting
function automaton(steps) {
  const S = steps.length;
  const st = steps.map((s) => ({ cls: new Set(s.classes.map((c) => CLASSES.indexOf(c))), kinds: new Set(s.kinds), dir: s.dir, min: s.min, max: s.max }));
  const next = (j, c) => {
    const r = [];
    if (c < st[j].max) r.push([j, c + 1]);
    if (c >= st[j].min) for (let k = j + 1; k < S; k++) { r.push([k, 1]); if (st[k].min > 0) break; }
    return r;
  };
  const accepting = (j, c) => { if (c < st[j].min) return false; for (let k = j + 1; k < S; k++) if (st[k].min > 0) return false; return true; };
  const stepOk = (s, a, kindName) => {
    if (!(s.cls.has(a.c) || s.kinds.has(kindName[a.k]))) return false;
    if (a.sym || s.dir === 'both') return true;
    return s.dir === 'out' ? a.o === 0 : a.o === 1;
  };
  return { st, next, accepting, stepOk };
}

module.exports = { LbGraph, automaton };
