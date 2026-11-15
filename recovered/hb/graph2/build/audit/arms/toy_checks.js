'use strict';
// Hand-computed checks of the relational and reference arms on toy graphs:
//  1. personalised PageRank (restart 0.3, dependencies) on a 4-node graph, solved by hand
//  2. PageRank with a co-change arc weighted x3 and direction both, against an exact linear solve
//  3. a per-class budget walk ("metapath", imports <= 1, calls <= 2), walked by hand
//  node toy_checks.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const ARMS = path.resolve(__dirname, '..', '..', 'arms');
const { CLASSES, classOf } = require(path.join(ARMS, 'common', 'edgeclasses'));
const { buildDb, openDb } = require(path.join(ARMS, 'relational', 'db'));
const { RelGraph } = require(path.join(ARMS, 'relational', 'rel'));
const { RefGraph } = require(path.join(ARMS, 'reference', 'ref'));
const C = require(path.join(ARMS, 'common', 'config'));

function toyG(names, edges, tag) {
  const sids = names.map((n) => 'n:' + n).sort();
  const id = new Map(sids.map((s, i) => [s, i + 1]));
  const nodes = sids.map((sid, i) => ({ i: i + 1, sid, kind: 'function', path: 'toy.py', name: sid.slice(2), ls: i + 1, le: i + 1,
    signature: 'def ' + sid.slice(2), runtime: 'backend', slice: 'toy', is_test: 0, tokens: 1, file: 0, text: sid.slice(2) }));
  const kinds = [...new Set(edges.map((e) => e[1]))].sort();
  const E = edges.map(([a, kind, b, w]) => ({ s: id.get('n:' + a), d: id.get('n:' + b), kind, cls: classOf(kind, 'function'), w: w == null ? 1 : w, n: 1,
    evs: [['toy.py', 1, null]], support: 2, recency: 1, attrs: {}, k: kinds.indexOf(kind) + 1, c: CLASSES.indexOf(classOf(kind, 'function')) }));
  E.sort((x, y) => x.s - y.s || x.k - y.k || x.d - y.d);
  return { sha: 'toy-' + tag, meta: { extractor_version: 'toy' }, nodes, edges: E, kinds, commits: [], removed: [], id };
}
function both(G, cfg, seedNames) {
  const f = path.join(os.tmpdir(), 'toy-' + G.sha + '-' + process.pid + '.sqlite');
  buildDb(G, f); const db = openDb(f);
  const seeds = seedNames.map((n) => G.id.get('n:' + n)).sort((a, b) => a - b);
  const cfgN = C.normalise({ ...C.BASE, ...cfg });
  const rel = new RelGraph(db).rank(seeds, cfgN, { path: 'toy.py', symbol: null });
  const ref = new RefGraph(G).rank(seeds, cfgN, { path: 'toy.py', symbol: null });
  db.close(); fs.rmSync(f, { force: true });
  const nm = (i) => G.nodes[i - 1].sid.slice(2);
  return { rel: rel.map((r) => ({ n: nm(r.i), hop: r.hop, score: r.score, via: r.via.join('>') })), ref: ref.map((r) => ({ n: nm(r.i), hop: r.hop, score: r.score, via: r.via.join('>') })), same: JSON.stringify(rel) === JSON.stringify(ref) };
}
const out = {};
// 1. PPR by hand. a->b, a->c, b->c, c->d (calls, w 1); seed a; restart 0.3; d dangles back to a.
//    p_b = 0.7*0.5 p_a; p_c = 0.7*(0.5 p_a + p_b); p_d = 0.7 p_c; p_a = 0.3 + 0.7 p_d (dangling mass).
{
  const G = toyG(['a', 'b', 'c', 'd'], [['a', 'calls', 'b'], ['a', 'calls', 'c'], ['b', 'calls', 'c'], ['c', 'calls', 'd']], 'ppr1');
  const pa = 0.3 / (1 - 0.7 * 0.7 * 0.595); const hand = { b: 0.35 * pa, c: 0.595 * pa, d: 0.4165 * pa };
  const r = both(G, { direction: 'dependencies', classes: ['calls'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'ppr', restart: 0.3, cochange_w: 1 } }, ['a']);
  out.ppr_hand = { hand, rel: r.rel, ref_equal: r.same, max_abs_err: Math.max(...r.rel.map((x) => Math.abs(x.score - hand[x.n]))), order_hand: Object.keys(hand).sort((x, y) => hand[y] - hand[x]).join(','), order_rel: r.rel.map((x) => x.n).join(',') };
}
// 2. PPR, direction both, co-change arc x3, against an exact solve (Gaussian elimination here).
{
  const edges = [['a', 'calls', 'b'], ['a', 'calls', 'c'], ['b', 'imports', 'c'], ['c', 'calls', 'd'], ['a', 'co_changed', 'd', 0.5], ['d', 'imports', 'e']];
  const G = toyG(['a', 'b', 'c', 'd', 'e'], edges, 'ppr2');
  const r = both(G, { direction: 'both', classes: ['calls', 'imports', 'history'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'ppr', restart: 0.15, cochange_w: 3 } }, ['a']);
  // exact: undirected multigraph, arc weight w (x3 for co_changed); p = alpha e_a + (1-alpha) T^T p, no dangling here
  const names = ['a', 'b', 'c', 'd', 'e']; const ix = Object.fromEntries(names.map((n, i) => [n, i])); const n = 5;
  const W = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [x, k, y, w0] of edges) { const w = (w0 == null ? 1 : w0) * (k === 'co_changed' ? 3 : 1); W[ix[x]][ix[y]] += w; W[ix[y]][ix[x]] += w; }
  const T = W.map((row) => { const s = row.reduce((p, q) => p + q, 0); return row.map((v) => v / s); });
  const al = 0.15; const A = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (j === n ? (i === 0 ? al : 0) : (i === j ? 1 : 0) - (1 - al) * T[j][i])));
  for (let c = 0; c < n; c++) { let p = c; for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[p][c])) p = r2; [A[c], A[p]] = [A[p], A[c]]; for (let r2 = 0; r2 < n; r2++) if (r2 !== c) { const f = A[r2][c] / A[c][c]; for (let j = c; j <= n; j++) A[r2][j] -= f * A[c][j]; } }
  const x = Object.fromEntries(names.map((nm, i) => [nm, A[i][n] / A[i][i]]));
  out.ppr_both_cochange = { exact: x, rel: r.rel, ref_equal: r.same, max_abs_err: Math.max(...r.rel.map((y) => Math.abs(y.score - x[y.n]))), order_exact: names.slice(1).sort((p, q) => x[q] - x[p]).join(','), order_rel: r.rel.map((y) => y.n).join(','), note: '40 fixed iterations: residual about 0.85^40 = 0.0015 of the mass' };
}
// 3. Budget walk by hand (dependencies; imports <= 1, calls <= 2).
{
  const edges = [['s', 'calls', 'a'], ['s', 'imports', 'b'], ['b', 'calls', 'a'], ['a', 'imports', 'e'], ['a', 'calls', 'c'], ['c', 'imports', 'f'], ['c', 'calls', 'g'], ['b', 'imports', 'h']];
  const G = toyG(['s', 'a', 'b', 'c', 'e', 'f', 'g', 'h'], edges, 'meta');
  const r = both(G, { direction: 'dependencies', traversal: { mode: 'budget', hops: null, budgets: { imports: 1, calls: 2 } }, hub: { mode: 'none' }, rank: { mode: 'bfs' } }, ['s']);
  const hand = [{ n: 'a', hop: 1, via: 'calls' }, { n: 'b', hop: 1, via: 'imports' }, { n: 'c', hop: 2, via: 'calls>calls' }, { n: 'e', hop: 2, via: 'calls>imports' }, { n: 'f', hop: 3, via: 'calls>calls>imports' }];
  const got = r.rel.map((y) => ({ n: y.n, hop: y.hop, via: y.via }));
  out.metapath_hand = { hand, rel: got, ref_equal: r.same, match: JSON.stringify(hand) === JSON.stringify(got), unreached_expected: ['g (3 calls)', 'h (2 imports)'] };
}
// 4. Same walk with an ordered metapath the budget form cannot express: calls then imports only.
//    The budget walk also returns imports-then-calls paths (b -> a), so it is a multiset constraint.
out.ordered_metapath_note = 'budget mode counts edges per class on a path (a multiset); an ordered metapath such as calls->imports is not expressible in config.js';
fs.writeFileSync(path.join(__dirname, 'toy_checks.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
