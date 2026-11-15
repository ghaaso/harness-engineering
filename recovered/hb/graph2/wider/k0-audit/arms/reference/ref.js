'use strict';
// REFERENCE arm: every algorithm of arms/common/SPEC.md on plain in-memory adjacency arrays. Written
// from the specification without sharing traversal or ranking code with the relational arm, so the two
// act as a cross-check. Input is the canonical graph G from arms/common/facts.js.
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');
const { PPR_ITERS, RRF_K, specOnly } = require('../common/config');
const { seedQuery } = require('../common/textterms');

const r12 = (x) => Math.round(x * 1e12) / 1e12;
const r9 = (x) => Math.round(x * 1e9) / 1e9;
const TRANSPORT_KINDS = new Set(['runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref']);
const CALLER_KINDS = new Set(['calls', 'depends_injects', 'passes_callable']);
const HISTORY = CLASSES.indexOf('history');

class RefGraph {
  constructor(G) {
    this.G = G;
    const N = G.nodes.length + 1;
    this.N = N;
    // out[u]: directed edges u->v (o = 0) and symmetric edges at u in either orientation (sym = 1)
    // inc[v]: directed edges u->v seen from v (o = 1); symmetric edges never appear here
    this.out = Array.from({ length: N }, () => []);
    this.inc = Array.from({ length: N }, () => []);
    for (const e of G.edges) {
      this.out[e.s].push({ v: e.d, k: e.k, c: e.c, w: e.w, sym: e.sym, o: 0 });
      if (e.sym) this.out[e.d].push({ v: e.s, k: e.k, c: e.c, w: e.w, sym: 1, o: 0 });
      else this.inc[e.d].push({ v: e.s, k: e.k, c: e.c, w: e.w, sym: 0, o: 1 });
    }
    this.kindName = [null, ...G.kinds];
    this._transport = null; this._bm25 = null;
    // diagnostics only (never part of an answer): how often degnorm used the DAG out-degree fallback
    this.stats = { degnorm_od0: 0 };
  }

  transport() {
    if (this._transport) return this._transport;
    const G = this.G; const t = new Uint8Array(this.N);
    for (const n of G.nodes) {
      if (TRANSPORT_KINDS.has(n.kind)) { t[n.i] = 1; continue; }
      if (!['function', 'method', 'class'].includes(n.kind) || n.is_test) continue;
      const sl = new Set();
      for (const a of this.inc[n.i]) {
        const x = G.nodes[a.v - 1];
        if (!CALLER_KINDS.has(this.kindName[a.k]) || x.is_test || x.slice == null) continue;
        sl.add(x.runtime + '/' + x.slice);
      }
      if (sl.size >= 3) t[n.i] = 1;
    }
    return (this._transport = t);
  }

  // arcs of u for a direction, a class filter and a confidence floor
  arcs(u, dir, maskOk, minc) {
    const res = [];
    for (const a of this.out[u]) if ((dir !== 'dependents' || a.sym) && maskOk(a.c) && a.w >= minc) res.push(a);
    if (dir !== 'dependencies') for (const a of this.inc[u]) if (maskOk(a.c) && a.w >= minc) res.push(a);
    return res;
  }

  // the hub rule as a predicate (seeds exempt)
  blockedFn(cfg, seeds, allowed) {
    const G = this.G;
    if (cfg.hub.mode === 'indeg') {
      const hd = new Int32Array(this.N);
      for (const e of G.edges) {
        if (!allowed.has(e.c) || STRUCTURAL.has(CLASSES[e.c])) continue;
        if (!G.nodes[e.s - 1].is_test) hd[e.d]++;
        if (e.sym && !G.nodes[e.d - 1].is_test) hd[e.s]++;
      }
      return (v) => !seeds.has(v) && hd[v] > cfg.hub.k;
    }
    if (cfg.hub.mode === 'transport') { const t = this.transport(); return (v) => !seeds.has(v) && t[v] === 1; }
    return () => false;
  }

  // BM25 exactly as SQLite FTS5's bm25() (k1 1.2, b 0.75, idf floor 1e-6), over the shared node text.
  bm25(qterms) {
    if (!this._bm25) {
      const docs = []; let total = 0; const df = new Map();
      for (const n of this.G.nodes) {
        const toks = n.text ? n.text.split(' ') : [];
        const tf = new Map(); for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
        for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
        docs.push({ i: n.i, dl: toks.length, tf }); total += toks.length;
      }
      this._bm25 = { docs, df, nrow: docs.length, avgdl: total / docs.length };
    }
    const { docs, df, nrow, avgdl } = this._bm25;
    const k1 = 1.2; const b = 0.75;
    const idf = qterms.map((t) => { const nh = df.get(t) || 0; const v = Math.log((nrow - nh + 0.5) / (nh + 0.5)); return v <= 0 ? 1e-6 : v; });
    const s = new Map();
    for (const d of docs) {
      let any = false; let sc = 0;
      for (let q = 0; q < qterms.length; q++) {
        const f = d.tf.get(qterms[q]) || 0;
        if (f) any = true;
        sc += idf[q] * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.dl) / avgdl)));
      }
      if (any) s.set(d.i, sc);
    }
    return s;
  }

  // metapath: does arc a match step st?
  stepOk(st, a) {
    const okSet = st.cls.has(a.c) || st.kinds.has(this.kindName[a.k]);
    if (!okSet) return false;
    if (a.sym || st.dir === 'both') return true;
    return st.dir === 'out' ? a.o === 0 : a.o === 1;
  }
  // metapath automaton, written here from the SPEC (not shared with the relational arm)
  automaton(steps) {
    const S = steps.length;
    const st = steps.map((s) => ({ cls: new Set(s.classes.map((c) => CLASSES.indexOf(c))), kinds: new Set(s.kinds), dir: s.dir, min: s.min, max: s.max }));
    const next = (j, c) => { // list of [k, nc]
      const r = [];
      if (c < st[j].max) r.push([j, c + 1]);
      if (c >= st[j].min) for (let k = j + 1; k < S; k++) { r.push([k, 1]); if (st[k].min > 0) break; }
      return r;
    };
    const accepting = (j, c) => { if (c < st[j].min) return false; for (let k = j + 1; k < S; k++) if (st[k].min > 0) return false; return true; };
    return { st, next, accepting, W: Math.max(...st.map((s) => s.max)) + 1 };
  }

  // ranked list for one seed set and one configuration: [{i, hop, score, via, path}], seeds excluded
  rank(seedIds, cfg, seed) {
    specOnly(cfg);
    const G = this.G; const dir = cfg.direction; const tr = cfg.traversal;
    const minc = cfg.minConf == null ? 0.5 : cfg.minConf;
    const allowed = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
    const maskOk = (c) => allowed.has(c);
    const seeds = new Set(seedIds);
    const blocked = this.blockedFn(cfg, seeds, allowed);
    // Traversal. A state is (node, automaton state); khop has one state per node. A DAG arc is an arc
    // used from an expanded state at depth d into a node whose hop (minimum depth) is d + 1; arcs are
    // identified by (u, v, kind, orientation) and counted once.
    const hop = new Map();
    for (const s of seedIds) hop.set(s, 0);
    const dag = new Map();
    const addArc = (u, a) => { const key = u + '|' + a.v + '|' + a.k + '|' + a.o; if (!dag.has(key)) dag.set(key, [u, a.v, a.k]); };
    let accepted = null; // metapath emit=end: nodes with an accepting state
    const sdep = new Map(); const spar = new Map(); // budget/metapath: state depth and state parent
    const H = tr.hops;
    if (tr.mode === 'khop') {
      let frontier = [...seedIds]; let h = 0;
      while (frontier.length && (H == null || h < H)) {
        const next = [];
        for (const u of frontier) {
          if (blocked(u)) continue;
          for (const a of this.arcs(u, dir, maskOk, minc)) {
            if (!hop.has(a.v)) { hop.set(a.v, h + 1); next.push(a.v); }
            if (hop.get(a.v) === h + 1) addArc(u, a);
          }
        }
        frontier = next; h++;
      }
    } else if (tr.mode === 'budget' || tr.mode === 'metapath') {
      // state machine: budget state = mixed-radix class counters; metapath state = j * 8 + c.
      // sdep: depth of each (node, state) at first visit; spar: its explanation parent, the smallest
      // (u, kind id, u's state) over state arcs from depth d into a state first visited at d + 1.
      let step; let init = 0;
      if (tr.mode === 'budget') {
        const lim = new Map(); const mult = new Map(); let m = 1;
        for (const c of Object.keys(tr.budgets).map((x) => CLASSES.indexOf(x)).sort((a, b) => a - b)) { lim.set(c, tr.budgets[CLASSES[c]]); mult.set(c, m); m *= tr.budgets[CLASSES[c]] + 1; }
        step = (u, st) => {
          const out = [];
          for (const a of this.arcs(u, dir, maskOk, minc)) {
            const L = lim.get(a.c); const M = mult.get(a.c);
            if (Math.floor(st / M) % (L + 1) >= L) continue;
            out.push([a, [st + M]]);
          }
          return out;
        };
      } else {
        const A = this.automaton(tr.steps); const all = () => true;
        if (tr.emit === 'end') { accepted = new Set(); for (const sd of seedIds) if (A.accepting(0, 0)) accepted.add(sd); }
        step = (u, st) => {
          const j = st >> 3; const c = st & 7; const moves = A.next(j, c); const out = [];
          if (!moves.length) return out;
          for (const a of this.arcs(u, 'both', all, minc)) {
            const ns = [];
            for (const [k, nc] of moves) if (this.stepOk(A.st[k], a)) { ns.push(k * 8 + nc); if (accepted && A.accepting(k, nc)) accepted.add(a.v); }
            if (ns.length) out.push([a, ns]);
          }
          return out;
        };
      }
      let frontier = seedIds.map((sd) => [sd, init]); let d = 0;
      for (const sd of seedIds) sdep.set(sd + ',' + init, 0);
      while (frontier.length && (H == null || d < H)) {
        const next = [];
        for (const [u, st] of frontier) {
          if (blocked(u)) continue;
          for (const [a, nss] of step(u, st)) {
            if (!hop.has(a.v)) hop.set(a.v, d + 1);
            if (hop.get(a.v) === d + 1) addArc(u, a);
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
    } else throw new Error('traversal mode ' + tr.mode);
    const npar = new Map(); const parent = new Map(); const dagIn = new Map();
    for (const [u, v, k] of dag.values()) {
      if (!dagIn.has(v)) dagIn.set(v, []);
      dagIn.get(v).push(u);
      if (!npar.has(v)) npar.set(v, new Set());
      npar.get(v).add(u);
      const p = parent.get(v);
      if (!p || u < p[0] || (u === p[0] && k < p[1])) parent.set(v, [u, k]);
    }
    // explanation chain: khop -> node parents; budget/metapath -> state parents from the smallest state
    // of v at depth hop(v)
    const bestS = new Map();
    for (const [key, dep] of sdep) {
      const c = key.indexOf(','); const v = Number(key.slice(0, c)); const s = Number(key.slice(c + 1));
      if (dep === hop.get(v) && (!bestS.has(v) || s < bestS.get(v))) bestS.set(v, s);
    }
    const memo = new Map();
    const chainS = (v, s) => {
      const key = v + ',' + s;
      if (sdep.get(key) === 0) return [[], [v]];
      if (memo.has(key)) return memo.get(key);
      const [u, k, su] = spar.get(key);
      const [vu, pu] = chainS(u, su);
      const r = [[...vu, this.kindName[k]], [...pu, v]];
      memo.set(key, r); return r;
    };
    const chainN = (v) => {
      if (seeds.has(v)) return [[], [v]];
      if (memo.has(v)) return memo.get(v);
      const [u, k] = parent.get(v);
      const [vu, pu] = chainN(u);
      const r = [[...vu, this.kindName[k]], [...pu, v]];
      memo.set(v, r); return r;
    };
    const chain = (v) => (tr.mode === 'khop' ? chainN(v) : chainS(v, bestS.get(v)));
    const R = [...hop.keys()].filter((v) => !seeds.has(v) && (!accepted || accepted.has(v)));
    const np = (v) => (npar.get(v) ? npar.get(v).size : 0);
    const Hh = (v) => hop.get(v);

    const scoreFor = (rk) => {
      if (rk.mode === 'bfs') return { key: (a, b) => Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: () => null };
      if (rk.mode === 'degnorm') {
        // activation spread over the DAG, divided by each source's full arc count, in order of hop.
        // SPEC 8.1 (addendum 3, A.1): when u has no arc under cfg.direction (possible only in metapath
        // mode, where a step may run against the configured direction), od(u) = the number of reach-DAG
        // arcs leaving u, which is at least 1 because u is a DAG source.
        const act = new Map(); for (const s of seedIds) act.set(s, 1 / seedIds.length);
        const dagOut = new Map(); for (const [u] of dag.values()) dagOut.set(u, (dagOut.get(u) || 0) + 1);
        const odMemo = new Map();
        const od = (u) => {
          if (!odMemo.has(u)) {
            let n = this.arcs(u, dir, maskOk, minc).length;
            if (n === 0) { n = dagOut.get(u) || 0; this.stats.degnorm_od0++; }
            odMemo.set(u, n);
          }
          return odMemo.get(u);
        };
        const order = [...hop.keys()].filter((v) => !seeds.has(v)).sort((a, b) => Hh(a) - Hh(b) || a - b);
        for (const v of order) {
          let s = 0;
          for (const u of dagIn.get(v) || []) s += (act.get(u) || 0) / od(u);
          act.set(v, s);
        }
        const sc = (v) => r12(act.get(v) || 0);
        return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
      }
      if (rk.mode === 'ppr') {
        const alpha = rk.restart; const ccw = rk.cochange_w;
        const trans = new Map();
        for (let u = 1; u < this.N; u++) {
          if (blocked(u)) continue;
          const arcs = this.arcs(u, dir, maskOk, -Infinity);
          if (!arcs.length) continue;
          let W = 0; const acc = new Map();
          for (const a of arcs) { const w = a.w * (a.c === HISTORY ? ccw : 1); W += w; acc.set(a.v, (acc.get(a.v) || 0) + w); }
          if (W <= 0) continue;
          trans.set(u, [...acc].map(([v, w]) => [v, w / W]));
        }
        let p = new Map(); for (const s of seedIds) p.set(s, 1 / seedIds.length);
        for (let it = 0; it < PPR_ITERS; it++) {
          const q = new Map(); let dm = 0;
          for (const [u, pu] of p) {
            const t = trans.get(u);
            if (!t) { dm += pu; continue; }
            for (const [v, f] of t) q.set(v, (q.get(v) || 0) + (1 - alpha) * pu * f);
          }
          for (const s of seedIds) q.set(s, (q.get(s) || 0) + (alpha + (1 - alpha) * dm) / seedIds.length);
          p = q;
        }
        const sc = (v) => r12(p.get(v) || 0);
        return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
      }
      if (rk.mode === 'cochange') {
        const sf = new Set(seedIds.map((s) => G.nodes[s - 1].file).filter(Boolean));
        const cc = new Map();
        for (const f of sf) for (const a of this.out[f]) if (a.c === HISTORY) cc.set(a.v, (cc.get(a.v) || 0) + a.w);
        const sc = (v) => r12(cc.get(G.nodes[v - 1].file) || 0);
        return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: sc };
      }
      if (rk.mode === 'text') {
        const bm = this.bm25(seedQuery(seed));
        const sc = (v) => r9(bm.get(v) || 0);
        return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || np(b) - np(a) || a - b, score: sc };
      }
      if (rk.mode === 'hybrid') {
        const fused = new Map();
        for (const part of rk.parts) {
          const o = scoreFor(part); const order = [...R].sort(o.key);
          order.forEach((v, idx) => fused.set(v, (fused.get(v) || 0) + 1 / (RRF_K + idx + 1)));
        }
        const sc = (v) => r12(fused.get(v) || 0);
        return { key: (a, b) => sc(b) - sc(a) || Hh(a) - Hh(b) || a - b, score: sc };
      }
      throw new Error('rank mode ' + rk.mode);
    };
    const o = scoreFor(cfg.rank);
    return R.sort(o.key).map((v) => { const [via, path] = chain(v); return { i: v, hop: Hh(v), score: o.score(v), via, path }; });
  }

  // Validator for explanation paths (used by common/equiv.js): returns null when item.path is a valid
  // shortest path under cfg (starts at a seed, hop edges, each edge exists with the named kind and is
  // allowed by direction, classes, minConf and the traversal's state machine, no blocked interior node).
  explainChecker(seedIds, cfg) {
    const dir = cfg.direction; const tr = cfg.traversal;
    const minc = cfg.minConf == null ? 0.5 : cfg.minConf;
    const allowed = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
    const seeds = new Set(seedIds);
    const blocked = this.blockedFn(cfg, seeds, allowed);
    const A = tr.mode === 'metapath' ? this.automaton(tr.steps) : null;
    return (item) => {
      const p = item.path; const via = item.via || [];
      if (!Array.isArray(p) || !p.length) return 'no path';
      if (!seeds.has(p[0])) return 'path does not start at a seed';
      if (p[p.length - 1] !== item.i) return 'path does not end at the node';
      if (p.length !== item.hop + 1 || via.length !== item.hop) return 'path length is not the hop';
      let states = A ? [[0, 0]] : null; const used = new Map();
      for (let t = 0; t < item.hop; t++) {
        const u = p[t]; const v = p[t + 1];
        if (t > 0 && blocked(u)) return 'blocked node expanded at step ' + t;
        const cands = (A ? this.arcs(u, 'both', () => true, minc) : this.arcs(u, dir, (c) => allowed.has(c), minc))
          .filter((a) => a.v === v && this.kindName[a.k] === via[t]);
        if (!cands.length) return 'no allowed ' + via[t] + ' edge at step ' + t;
        if (tr.mode === 'budget') {
          const a = cands[0]; const c = CLASSES[a.c]; const n = (used.get(c) || 0) + 1;
          if (n > tr.budgets[c]) return 'budget of ' + c + ' exceeded at step ' + t;
          used.set(c, n);
        } else if (A) {
          const ns = new Map();
          for (const [j, c] of states) for (const [k, nc] of A.next(j, c)) if (cands.some((a) => this.stepOk(A.st[k], a))) ns.set(k + ',' + nc, [k, nc]);
          states = [...ns.values()];
          if (!states.length) return 'metapath does not admit step ' + t;
        }
      }
      return null;
    };
  }
}

module.exports = { RefGraph };
