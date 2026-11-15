'use strict';
// CHECK 4. Hand checks on a 7-node toy graph, run through each graph arm's own store builder and
// ranking code (ladybug: store.js + lb.js; duckpgq: store.js + pgq.js) and through the reference arm.
//
// Toy graph (ids follow the sorted string ids n:a=1, n:b=2, n:c=3, n:d=4, n:e=5, n:f=6, n:t=7):
//   a -calls(1.0)-> b      a -imports(1.0)-> c     b -calls(0.8)-> d     c -calls(1.0)-> d
//   e -calls(1.0)-> a      t -mocks(1.0)-> b (t is a test)              d -calls(0.3)-> f
//   a ~co_changed(0.5)~ f  (symmetric)
// Seeds: [a] everywhere.
//
// Hand results (worked in NOTES.md, section "Hand checks"):
// H1 weighted shortest path, direction both, classes imports+calls+tests+history, minConf 0.25, k-hop
//    unbounded. Ladybug x_wsp cost = class cost / max(w, 0.05) (calls 1, imports 1, tests 1, history 2):
//    b 1, c 1, e 1, d 2 (via c), t 2 (via b), f 4 (the direct co-change edge; via d costs 5.33).
//    Scores 1/(1+cost); order (score desc, hop asc, id asc): b, c, e, d, t, f.
//    DuckPGQ x_wsp cost = class cost only (here calls 1, imports 2, tests 1, history 2):
//    b 1, e 1, c 2, d 2, t 2, f 2; order: b, e, c, f, d, t (c and f at hop 1, d and t at hop 2).
// H2 ordered metapath [calls out 1..2] then [tests in 1..1], minConf 0.5, rank bfs:
//    emit end: only t (hop 2, path a-b-t, via calls>mocks); emit all: b (1), d (2), t (2).
// H3 ordered metapath [imports out 0..1] then [calls out 1..1], emit end: b (hop 1), d (hop 2 via c).
// H4 personalised PageRank (SPEC 8.2), direction dependencies, classes calls+imports+history,
//    restart 0.3, cochange weight 2, k-hop unbounded, minConf 0.5: transitions a->{b,c,f} 1/3 each,
//    b->d, c->d, d->f, f->a 1 each. Stationary: a = 0.3 / (1 - 0.7 * 0.462) = 0.44339, b = c = 0.10346,
//    d = 0.14484, f = 0.20485; the 40-iteration values differ from these by about 1e-7, so the exact
//    40-iteration vector is computed below by an independent loop. Order: f, d, b, c.
// Native PageRank routines are compared with hand formulas of the candidate specifications.
const fs = require('fs');
const A = '/build/arms';
const C = require(A + '/common/config');
const { CLASSES, classOf } = require(A + '/common/edgeclasses');
const { nodeText } = require(A + '/common/textterms');
const { RefGraph } = require(A + '/reference/ref');
const LS = require(A + '/ladybug/store');
const { LbGraph } = require(A + '/ladybug/lb');
const DS = require(A + '/duckpgq/store');
const { PgqGraph } = require(A + '/duckpgq/pgq');

const NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 't'];
const EDGES = [['a', 'calls', 'b', 1], ['a', 'imports', 'c', 1], ['b', 'calls', 'd', 0.8], ['c', 'calls', 'd', 1], ['e', 'calls', 'a', 1], ['t', 'mocks', 'b', 1], ['d', 'calls', 'f', 0.3], ['a', 'co_changed', 'f', 0.5]];
function toyG(tag) {
  const sids = NAMES.map((n) => 'n:' + n).sort();
  const id = new Map(sids.map((s, i) => [s, i + 1]));
  const nodes = sids.map((sid, i) => { const nm = sid.slice(2); const n = { i: i + 1, sid, kind: 'function', path: 'toy/' + nm + '.py', name: nm, ls: 1, le: 2, signature: 'def ' + nm + '():', runtime: 'backend', slice: 'toy', is_test: nm === 't' ? 1 : 0, tokens: 3, file: 0 }; n.text = nodeText(n, null); return n; });
  const kinds = [...new Set(EDGES.map((e) => e[1]))].sort();
  const E = EDGES.map(([a, kind, b, w]) => { let s = id.get('n:' + a); let d = id.get('n:' + b); const sym = kind === 'co_changed' ? 1 : 0; if (sym && d < s) [s, d] = [d, s]; const cls = classOf(kind, 'function'); return { s, d, kind, cls, sym, w, n: 1, evp: 'toy', evl: 1, support: 2, recency: 1, evs: [['toy/' + a + '.py', 1, null]], k: kinds.indexOf(kind) + 1, c: CLASSES.indexOf(cls) }; });
  E.sort((x, y) => x.s - y.s || x.k - y.k || x.d - y.d);
  return { sha: 'toy-' + tag, dir: null, meta: { extractor_version: 'toy' }, nodes, edges: E, kinds, commits: [], removed: [], loader_version: 'L5', id };
}
const BASE = { granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, hub: { mode: 'none' } };
const nm = (i) => NAMES.slice().sort()[i - 1];
const show = (list) => list.map((r) => ({ n: nm(r.i), hop: r.hop, score: r.score, via: (r.via || []).join('>'), path: (r.path || []).map(nm).join('-') }));

// ---- hand reference values -------------------------------------------------------------------------
function ppr40(seed, arcs, alpha) { // arcs: Map u -> [[v, w]]; SPEC 8.2 exactly, written independently
  const N = NAMES.length; let p = Array(N + 1).fill(0); p[seed] = 1;
  for (let it = 0; it < 40; it++) {
    const q = Array(N + 1).fill(0); let dm = 0;
    for (let u = 1; u <= N; u++) {
      const out = arcs.get(u) || []; const W = out.reduce((s, x) => s + x[1], 0);
      if (!out.length || W <= 0) { dm += p[u]; continue; }
      for (const [v, w] of out) q[v] += (1 - alpha) * p[u] * w / W;
    }
    q[seed] += alpha + (1 - alpha) * dm; p = q;
  }
  return p;
}
function solvePR(adj, d, opts) { // global or personalised PageRank by 2000 iterations of a stated rule
  const N = NAMES.length; let p = Array(N + 1).fill(opts.init != null ? opts.init : 1 / N); p[0] = 0;
  if (opts.seed) { p = Array(N + 1).fill(0); p[opts.seed] = 1; }
  for (let it = 0; it < 2000; it++) {
    const q = Array(N + 1).fill(0); let dm = 0;
    for (let u = 1; u <= N; u++) { const out = adj.get(u) || []; if (!out.length) { dm += p[u]; continue; } for (const v of out) q[v] += d * p[u] / out.length; }
    for (let v = 1; v <= N; v++) {
      if (opts.seed) q[v] += v === opts.seed ? (1 - d) + (opts.dangling === 'seed' ? d * dm : 0) : 0;
      else q[v] += (1 - d) / N + (opts.dangling === 'uniform' ? d * dm / N : 0);
    }
    p = q;
  }
  return p;
}
const ix = (n) => NAMES.slice().sort().indexOf(n) + 1;

async function main() {
  const out = { hand: {}, ladybug: {}, duckpgq: {}, reference: {} };
  const G = toyG('h');
  // stores
  fs.rmSync('/work/toy', { recursive: true, force: true }); fs.mkdirSync('/work/toy', { recursive: true });
  const st = LS.open(G, '/work/toy/lb', {});
  const lb = new LbGraph(st, G, { pprImpl: 'app' });
  const dkFile = '/work/toy/dk.duckdb'; await DS.buildStore(G, dkFile);
  const dk = await PgqGraph.open(dkFile, { threads: 1 });
  const ref = new RefGraph(G);
  const seed = { path: 'toy/a.py', symbol: { name: 'a' } };
  const S = [ix('a')];
  const run = async (label, cfgs) => {
    for (const [arm, cfg] of Object.entries(cfgs)) {
      const c = C.normalise(cfg);
      try {
        let r;
        if (arm === 'ladybug') r = lb.rank(S, c, seed);
        else if (arm === 'ladybug_engine_ppr') { lb.pprImpl = 'engine'; r = lb.rank(S, c, seed); lb.pprImpl = 'app'; }
        else if (arm === 'duckpgq') r = (await dk.rank(S, c, seed)).ranked;
        else if (arm === 'reference') r = ref.rank(S, c, seed);
        (out[arm.startsWith('ladybug') ? 'ladybug' : arm][label + (arm === 'ladybug_engine_ppr' ? ' (engine iterations)' : '')] = show(r));
      } catch (e) { out[arm.startsWith('ladybug') ? 'ladybug' : arm][label] = 'ERROR ' + String(e.message).slice(0, 300); }
    }
  };
  // H1 weighted shortest path
  const wspBase = { ...BASE, direction: 'both', classes: ['imports', 'calls', 'tests', 'history'], minConf: 0.25, traversal: { mode: 'khop', hops: null } };
  out.hand.H1_ladybug = [['b', 1], ['c', 1], ['e', 1], ['d', 2], ['t', 2], ['f', 4]].map(([n, c]) => ({ n, cost: c, score: Math.round(1e12 / (1 + c)) / 1e12 }));
  out.hand.H1_duckpgq = [['b', 1], ['e', 1], ['c', 2], ['f', 2], ['d', 2], ['t', 2]].map(([n, c]) => ({ n, cost: c, score: Math.round(1e12 / (1 + c)) / 1e12 }));
  if (process.env.SKIP_LB_WSP !== '1') await run('H1 x_wsp', { ladybug: { ...wspBase, rank: { mode: 'x_wsp' } } });
  await run('H1 x_wsp', { duckpgq: { ...wspBase, rank: { mode: 'x_wsp', costs: { calls: 1, imports: 2, tests: 1, history: 2 } } } });
  // H2 / H3 ordered metapaths
  const mp2 = (emit) => ({ ...BASE, direction: 'both', traversal: { mode: 'metapath', hops: null, emit, steps: [{ classes: ['calls'], dir: 'out', min: 1, max: 2 }, { classes: ['tests'], dir: 'in', min: 1, max: 1 }] }, rank: { mode: 'bfs' } });
  out.hand.H2_end = [{ n: 't', hop: 2, via: 'calls>mocks', path: 'a-b-t' }];
  out.hand.H2_all = [{ n: 'b', hop: 1 }, { n: 'd', hop: 2 }, { n: 't', hop: 2 }];
  for (const emit of ['end', 'all']) {
    const c = mp2(emit); const cp = JSON.parse(JSON.stringify(c)); cp.traversal.variant = 'pattern';
    await run('H2 metapath emit=' + emit, { ladybug: c, duckpgq: c, reference: c });
    await run('H2 metapath emit=' + emit + ' (pattern variant)', { ladybug: cp });
  }
  const mp3 = { ...BASE, direction: 'both', traversal: { mode: 'metapath', hops: null, emit: 'end', steps: [{ classes: ['imports'], dir: 'out', min: 0, max: 1 }, { classes: ['calls'], dir: 'out', min: 1, max: 1 }] }, rank: { mode: 'bfs' } };
  out.hand.H3_end = [{ n: 'b', hop: 1, path: 'a-b' }, { n: 'd', hop: 2, path: 'a-c-d' }];
  const mp3p = JSON.parse(JSON.stringify(mp3)); mp3p.traversal.variant = 'pattern';
  await run('H3 metapath emit=end', { ladybug: mp3, duckpgq: mp3, reference: mp3 });
  await run('H3 metapath emit=end (pattern variant)', { ladybug: mp3p });
  // H4 personalised PageRank
  const pprCfg = { ...BASE, direction: 'dependencies', classes: ['calls', 'imports', 'history'], traversal: { mode: 'khop', hops: null }, rank: { mode: 'ppr', restart: 0.3, cochange_w: 2 } };
  const arcs = new Map([[ix('a'), [[ix('b'), 1], [ix('c'), 1], [ix('f'), 0.5 * 2]]], [ix('b'), [[ix('d'), 0.8]]], [ix('c'), [[ix('d'), 1]]], [ix('d'), [[ix('f'), 0.3]]], [ix('e'), [[ix('a'), 1]]], [ix('f'), [[ix('a'), 0.5 * 2]]]]);
  const p40 = ppr40(ix('a'), arcs, 0.3);
  const aStat = 0.3 / (1 - 0.7 * 0.462);
  out.hand.H4 = { stationary: { a: aStat, b: 0.7 * aStat / 3, c: 0.7 * aStat / 3, d: 0.98 * aStat / 3, f: 0.462 * aStat }, iter40: Object.fromEntries(['b', 'c', 'd', 'f'].map((n) => [n, Math.round(p40[ix(n)] * 1e12) / 1e12])), order: 'f, d, b, c' };
  await run('H4 ppr', { ladybug: pprCfg, ladybug_engine_ppr: pprCfg, duckpgq: pprCfg, reference: pprCfg });
  // native PageRank routines
  // ladybug GDS_PPR over classes calls+imports+history, each edge once; candidate specs: undirected
  // unweighted PPR (restart 0.3, dangling mass to the seed) vs directed unweighted
  const und = new Map(); const dirA = new Map();
  for (const [a, k, b] of EDGES) { if (!['calls', 'imports', 'co_changed'].includes(k)) continue; const u = ix(a); const v = ix(b); (und.get(u) || und.set(u, []).get(u)).push(v); (und.get(v) || und.set(v, []).get(v)).push(u); (dirA.get(u) || dirA.set(u, []).get(u)).push(v); if (k === 'co_changed') (dirA.get(v) || dirA.set(v, []).get(v)).push(u); }
  const r6 = (p) => Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 't'].map((n) => [n, +p[ix(n)].toFixed(6)]));
  out.hand.gds_ppr_candidates = { undirected_unweighted: r6(solvePR(und, 0.7, { seed: ix('a'), dangling: 'seed' })), directed_unweighted: r6(solvePR(dirA, 0.7, { seed: ix('a'), dangling: 'seed' })) };
  await run('native ladybug GDS_PPR', { ladybug: { ...pprCfg, rank: { mode: 'ppr', restart: 0.3, cochange_w: 2, variant: 'gds' } } });
  try { out.ladybug.gds_ppr_raw = lb.q("CALL GDS_PPR('" + lb.cache.get('gds|' + [3, 2, 10].sort((x, y) => x - y).join(',')) + "', [0], dampingFactor := 0.7) RETURN node.id AS i, rank").map((r) => ({ n: nm(LS.num(r.i)), rank: +r.rank.toFixed(6) })); } catch (e) { out.ladybug.gds_ppr_raw = 'ERROR ' + e.message; }
  // ladybug stored global page_rank prior (x_prank) on its 'code' projection (structure, imports, calls,
  // http, tests, data, config, history; each edge once): candidate = directed, unweighted, damping 0.85,
  // (1 - d) / N teleport, dangling mass dropped (the rule the engine showed on a probe graph)
  const code = new Map();
  for (const [a, k, b] of EDGES) { const u = ix(a); const v = ix(b); (code.get(u) || code.set(u, []).get(u)).push(v); }
  out.hand.page_rank_candidates = { directed_leaky: r6(solvePR(code, 0.85, { dangling: 'drop' })), directed_uniform_dangling: r6(solvePR(code, 0.85, { dangling: 'uniform' })), undirected_uniform: r6(solvePR(new Map([...code].reduce((m, [u, vs]) => { for (const v of vs) { (m.get(u) || m.set(u, []).get(u)).push(v); (m.get(v) || m.set(v, []).get(v)).push(u); } return m; }, new Map())), 0.85, { dangling: 'uniform' })) };
  out.ladybug.stored_prank = lb.q('MATCH (n:N) RETURN n.id AS i, n.prank AS p, n.core AS core, n.comm AS comm ORDER BY n.id').map((r) => ({ n: nm(LS.num(r.i)), prank: +r.p.toFixed(6), core: LS.num(r.core), comm: LS.num(r.comm) }));
  // duckpgq native pagerank() over the projection of direction dependencies, calls+imports+history
  const dirP = new Map();
  for (const [a, k, b] of EDGES) { if (!['calls', 'imports', 'co_changed'].includes(k)) continue; const u = ix(a); const v = ix(b); const w = EDGES.find((e) => e[0] === a && e[2] === b)[3]; if (w < 0.5) continue; (dirP.get(u) || dirP.set(u, []).get(u)).push(v); if (k === 'co_changed') (dirP.get(v) || dirP.set(v, []).get(v)).push(u); }
  out.hand.duckpgq_pagerank_candidates = { directed_uniform_dangling: r6(solvePR(dirP, 0.85, { dangling: 'uniform' })), directed_leaky: r6(solvePR(dirP, 0.85, { dangling: 'drop' })) };
  await run('native duckpgq pagerank (global)', { duckpgq: { ...pprCfg, rank: { mode: 'ppr', restart: 0.3, cochange_w: 2, variant: 'duckpgq_global' } } });
  try { const pj = [...dk.cache.values()].find((x) => x && x.name && x.name.startsWith('pj')); const g = dk.cache.get('gpr|' + pj.name); out.duckpgq.pagerank_raw = (await dk.all(`SELECT v, pr FROM ${g} ORDER BY v`)).map((r) => ({ n: nm(r.v), pr: +r.pr.toFixed(6) })); } catch (e) { out.duckpgq.pagerank_raw = 'ERROR ' + e.message; }
  // compare
  const cmp = {};
  const eqList = (got, want) => Array.isArray(got) && got.length === want.length && want.every((w, j) => got[j].n === w.n && (w.hop == null || got[j].hop === w.hop) && (w.score == null || Math.abs(got[j].score - w.score) < 1e-9) && (w.path == null || got[j].path === w.path));
  cmp.H1_ladybug = eqList(out.ladybug['H1 x_wsp'], out.hand.H1_ladybug);
  cmp.H1_duckpgq = eqList(out.duckpgq['H1 x_wsp'], out.hand.H1_duckpgq);
  for (const arm of ['ladybug', 'duckpgq', 'reference']) {
    cmp['H2_end_' + arm] = eqList(out[arm]['H2 metapath emit=end'], out.hand.H2_end);
    cmp['H2_all_' + arm] = eqList(out[arm]['H2 metapath emit=all'], out.hand.H2_all);
    cmp['H3_end_' + arm] = eqList(out[arm]['H3 metapath emit=end'], out.hand.H3_end);
    const h4 = ['f', 'd', 'b', 'c'].map((n) => ({ n, score: out.hand.H4.iter40[n] }));
    cmp['H4_' + arm] = eqList(out[arm]['H4 ppr'], h4);
  }
  cmp.H2_end_ladybug_pattern = eqList(out.ladybug['H2 metapath emit=end (pattern variant)'], out.hand.H2_end);
  cmp.H2_all_ladybug_pattern = eqList(out.ladybug['H2 metapath emit=all (pattern variant)'], out.hand.H2_all);
  cmp.H3_end_ladybug_pattern = eqList(out.ladybug['H3 metapath emit=end (pattern variant)'], out.hand.H3_end);
  cmp.H4_ladybug_engine = eqList(out.ladybug['H4 ppr (engine iterations)'], ['f', 'd', 'b', 'c'].map((n) => ({ n, score: out.hand.H4.iter40[n] })));
  out.compare = cmp;
  await dk.close(); st.conn.closeSync(); st.db.closeSync();
  fs.writeFileSync('/build/audit/graph/results/toy_checks.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(cmp));
}
main().catch((e) => { console.error(e); process.exit(1); });
