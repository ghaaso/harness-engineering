'use strict';
// Check 4b (audit-selection lane): hand checks of every stage-2 arm-only mode on toy graphs of my own,
// run through each arm's own harness entry (relational arm.open, ladybug arm.openInProc, duckpgq
// arm.open). Expected values are worked out by hand below; PPR and global PageRank, which have no
// short closed form, are computed by an independent loop written here from SPEC 8.2 and from the
// textbook PageRank definition.
// Run inside graphtest:1:  LB_PRIORS_DIR=/tmp/toyprior node toy_modes.js
//
// TOY A (ids by sorted string id: a1 b2 c3 h4 s5 t6 x7 y8 z9; seed s)
//   s -calls 1.0-> a     s -imports 0.5-> b    a -reads_table 1.0-> c   b -calls 1.0-> c
//   s ~co_changed 0.8~ h h -calls 1.0-> x      a -calls 0.6-> x         y -calls 1.0-> x
//   z -calls 1.0-> y     t -mocks 1.0-> a (t is a test)                 b -calls 1.0-> a
// Config base: direction both, classes imports+calls+data+history, minConf 0.5, k-hop unbounded.
// W1 x_wsp, hub none. Costs (class cost / confidence): calls 1, imports 1, data 1.5, history 2.
//    a = 1 (s-a); b = 2 (s-b 1/0.5; also s-a-b 1+1 = 2); h = 2/0.8 = 2.5; c = min(a+1.5, b+1) = 2.5;
//    x = min(a + 1/0.6, h + 1) = 2.6667; y = x + 1 = 3.6667; z = y + 1 = 4.6667.
//    score = 1/(1+cost); ties by hop then id: h (hop 1) before c (hop 2). Order a b h c x y z.
// W2 x_wsp, hub indeg k=1 (blocked when production in-degree > 1): a (s, b) = 2, c (a, b) = 2,
//    x (h, a, y) = 3 are blocked; b, h, y have 1. Traversal: a, b, h at hop 1; c (via b), x (via h)
//    at hop 2; a, c, x are not expanded, so y and z are not reached. Costs never pass through a blocked
//    node: a 1, b 2, h 2.5, c = b + 1 = 3, x = h + 1 = 3.5. Order a b h c x.
// K1 x_core k=1, rank bfs. Code graph undirected, each edge once: degrees s3 a5 b3 c2 h2 x3 y2 z1 t1.
//    Peel degree < 2: z, t, then y -> 2-core {s,a,b,c,h,x}; peel degree < 3 empties it. Core numbers:
//    s a b c h x = 2; y z t = 1. k=1 blocks a b c h x (seed s exempt): reach a, b, h only; bfs order
//    hop, npar desc, id -> a b h.
// K2 x_core k=2: nothing blocked; reach a b h (hop 1), c x (hop 2, npar 2 each), y (3), z (4).
//    Order a b h c x y z.
// TOY B: two 4-cliques {s,a,b,c} and {h,x,y,z} (calls, weight 1, one directed edge per pair) and one
//    bridge c -calls-> h. Direction both, classes calls.
// C1 x_comm alone: Louvain must give the two cliques; x_comm = 1 for a, b, c (the seed's community), 0
//    for h, x, y, z; order score desc, hop asc, id asc -> a b c h x y z.
// C2 hybrid ppr(0.3, w 1) + x_comm: reciprocal rank fusion 1/(60 + r) of my own PPR order and C1's order.
// L1 x_ppr_lift (restart 0.3, cochange_w 1, beta 0.5): my PPR / my global PageRank^0.5 (damping 0.85,
//    uniform teleport, every node has arcs so no dangling mass), order by score desc, hop asc, id asc.
const fs = require('fs');
const A = '/build/arms';
const C = require(A + '/common/config');
const { CLASSES, classOf } = require(A + '/common/edgeclasses');
const { nodeText } = require(A + '/common/textterms');
const { RefGraph } = require(A + '/reference/ref');

function toyG(tag, names, edges, tests) {
  const sids = names.map((n) => 'n:' + n).sort();
  const id = new Map(sids.map((s, i) => [s.slice(2), i + 1]));
  const nodes = sids.map((sid, i) => { const nm = sid.slice(2); const n = { i: i + 1, sid, kind: 'function', path: 'toy/' + nm + '.py', name: nm, ls: 1, le: 2, signature: 'def ' + nm + '():', runtime: 'backend', slice: 'toy', is_test: tests.includes(nm) ? 1 : 0, tokens: 3, file: 0 }; n.text = nodeText(n, null); return n; });
  const kinds = [...new Set(edges.map((e) => e[1]))].sort();
  const E = edges.map(([a, kind, b, w]) => { let s = id.get(a); let d = id.get(b); const sym = kind === 'co_changed' ? 1 : 0; if (sym && d < s) [s, d] = [d, s]; const cls = classOf(kind, 'function'); return { s, d, kind, cls, sym, w, n: 1, evp: 'toy', evl: 1, support: 2, recency: 1, evs: [['toy/' + a + '.py', 1, null]], k: kinds.indexOf(kind) + 1, c: CLASSES.indexOf(cls) }; });
  E.sort((x, y) => x.s - y.s || x.k - y.k || x.d - y.d);
  return { G: { sha: 'audsel-toy-' + tag, dir: null, meta: { extractor_version: 'toy' }, nodes, edges: E, kinds, commits: [], removed: [], loader_version: 'L5' }, id, name: (i) => sids[i - 1].slice(2) };
}

const TA = toyG('A', ['s', 'a', 'b', 'c', 'h', 'x', 'y', 'z', 't'], [
  ['s', 'calls', 'a', 1], ['s', 'imports', 'b', 0.5], ['a', 'reads_table', 'c', 1], ['b', 'calls', 'c', 1], ['s', 'co_changed', 'h', 0.8],
  ['h', 'calls', 'x', 1], ['a', 'calls', 'x', 0.6], ['y', 'calls', 'x', 1], ['z', 'calls', 'y', 1], ['t', 'mocks', 'a', 1], ['b', 'calls', 'a', 1]], ['t']);
const cliq = (xs) => { const o = []; for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) o.push([xs[i], 'calls', xs[j], 1]); return o; };
const TB = toyG('B', ['s', 'a', 'b', 'c', 'h', 'x', 'y', 'z'], [...cliq(['s', 'a', 'b', 'c']), ...cliq(['h', 'x', 'y', 'z']), ['c', 'calls', 'h', 1]], []);

const baseA = { granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, direction: 'both', classes: ['imports', 'calls', 'data', 'history'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' } };
const baseB = { granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, direction: 'both', classes: ['calls'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' } };

// ---- independent PPR (SPEC 8.2) and global PageRank (textbook) over toy B, direction both ----------
function arcsBoth(T) { const m = new Map(); for (const e of T.G.edges) { for (const [u, v] of [[e.s, e.d], [e.d, e.s]]) { if (!m.has(u)) m.set(u, []); m.get(u).push([v, e.w]); } } return m; }
function ppr(T, seeds, alpha) {
  const N = T.G.nodes.length; const arcs = arcsBoth(T); let p = Array(N + 1).fill(0); for (const s of seeds) p[s] = 1 / seeds.length;
  for (let it = 0; it < 40; it++) { const q = Array(N + 1).fill(0); let dm = 0;
    for (let u = 1; u <= N; u++) { const out = arcs.get(u) || []; const W = out.reduce((s, x) => s + x[1], 0); if (!W) { dm += p[u]; continue; } for (const [v, w] of out) q[v] += (1 - alpha) * p[u] * w / W; }
    for (const s of seeds) q[s] += (alpha + (1 - alpha) * dm) / seeds.length; p = q; }
  return p;
}
function pagerank(T, d) {
  const N = T.G.nodes.length; const arcs = arcsBoth(T); let p = Array(N + 1).fill(1 / N); p[0] = 0;
  for (let it = 0; it < 1000; it++) { const q = Array(N + 1).fill((1 - d) / N); q[0] = 0;
    for (let u = 1; u <= N; u++) { const out = arcs.get(u); for (const [v] of out) q[v] += d * p[u] / out.length; }
    p = q; }
  return p;
}
const hopB = (T) => { const s = T.id.get('s'); const arcs = arcsBoth(T); const h = new Map([[s, 0]]); let fr = [s]; while (fr.length) { const nx = []; for (const u of fr) for (const [v] of arcs.get(u)) if (!h.has(v)) { h.set(v, h.get(u) + 1); nx.push(v); } fr = nx; } return h; };
const order = (T, score) => { const h = hopB(T); const c = [...h.keys()].filter((i) => i !== T.id.get('s')); return c.sort((a, b) => score[b] - score[a] || h.get(a) - h.get(b) || a - b); };

const r12 = (x) => Math.round(x * 1e12) / 1e12;
const out = { checks: [] };
function expectList(label, arm, T, got, exp) {
  const names = got.map((r) => T.name(r.i));
  const ok = names.join(' ') === exp.map((e) => e[0]).join(' ') && exp.every((e, k) => e[1] == null || (got[k].score != null && Math.abs(got[k].score - e[1]) < 1e-9));
  out.checks.push({ label, arm, ok, got: got.map((r) => [T.name(r.i), r.hop, r.score]), expected: exp });
}

async function main() {
  process.env.LB_INPROC = '1';
  const rel = require(A + '/relational/arm'); const lb = require(A + '/ladybug/arm'); const dk = require(A + '/duckpgq/arm');
  fs.mkdirSync('/tmp/toystore', { recursive: true });
  const open = async (T) => ({ relational: await rel.open(T.G, { store: '/tmp/toystore/rel' + T.G.sha }), ladybug: await lb.openInProc(T.G, { store: '/tmp/toystore/lb' }), duckpgq: await dk.open(T.G, { store: '/tmp/toystore/dk' }), reference: { rank: (s, c, sd) => new RefGraph(T.G).rank(s, c, sd) } });
  for (const d of ['/tmp/toystore/relaudsel-toy-A', '/tmp/toystore/relaudsel-toy-B']) fs.mkdirSync(d, { recursive: true });
  const run = async (arm, s, cfg) => { const r = await arm.rank(s, C.normalise(cfg), { path: 'toy/s.py', symbol: { name: 's', start: 1, end: 2 } }); return Array.isArray(r) ? r : r.ranked; };

  const armsA = await open(TA); const sA = [TA.id.get('s')];
  const inv = (c) => 1 / (1 + c);
  const W1 = [['a', inv(1)], ['b', inv(2)], ['h', inv(2.5)], ['c', inv(2.5)], ['x', inv(1 + 1 / 0.6)], ['y', inv(2 + 1 / 0.6)], ['z', inv(3 + 1 / 0.6)]];
  const W2 = [['a', inv(1)], ['b', inv(2)], ['h', inv(2.5)], ['c', inv(3)], ['x', inv(3.5)]];
  for (const a of ['relational', 'ladybug', 'duckpgq']) {
    expectList('W1 x_wsp hub none', a, TA, await run(armsA[a], sA, { ...baseA, rank: { mode: 'x_wsp' } }), W1);
    expectList('W2 x_wsp hub indeg k=1', a, TA, await run(armsA[a], sA, { ...baseA, hub: { mode: 'indeg', k: 1 }, rank: { mode: 'x_wsp' } }), W2);
  }
  // the stage-2 entries in the arms' own form: ladybug x_core with its stage-2 rank (ppr) checked for reach, bfs for order
  expectList('K1 x_core k=1 bfs', 'ladybug', TA, await run(armsA.ladybug, sA, { ...baseA, traversal: { mode: 'x_core', hops: null, k: 1 }, rank: { mode: 'bfs' } }), [['a'], ['b'], ['h']]);
  expectList('K2 x_core k=2 bfs', 'ladybug', TA, await run(armsA.ladybug, sA, { ...baseA, traversal: { mode: 'x_core', hops: null, k: 2 }, rank: { mode: 'bfs' } }), [['a'], ['b'], ['h'], ['c'], ['x'], ['y'], ['z']]);
  const k1p = await run(armsA.ladybug, sA, { ...baseA, traversal: { mode: 'x_core', hops: null, k: 1 }, rank: { mode: 'ppr', restart: 0.3, cochange_w: 1 } });
  out.checks.push({ label: 'K1p x_core k=1 with ppr: reach {a,b,h}', arm: 'ladybug', ok: k1p.map((r) => TA.name(r.i)).sort().join(' ') === 'a b h', got: k1p.map((r) => [TA.name(r.i), r.hop, r.score]) });
  // spec part of x_core k=2: equals plain k-hop (nothing blocked) under the reference arm
  const refK = await run(armsA.reference, sA, { ...baseA, rank: { mode: 'ppr', restart: 0.3, cochange_w: 1 } });
  const lbK = await run(armsA.ladybug, sA, { ...baseA, traversal: { mode: 'x_core', hops: null, k: 2 }, rank: { mode: 'ppr', restart: 0.3, cochange_w: 1 } });
  out.checks.push({ label: 'K2p x_core k=2 ppr equals reference k-hop ppr', arm: 'ladybug', ok: JSON.stringify(refK.map((r) => [r.i, r.hop, r.score])) === JSON.stringify(lbK.map((r) => [r.i, r.hop, r.score])) });

  const armsB = await open(TB); const sB = [TB.id.get('s')];
  const C1 = [['a', 1], ['b', 1], ['c', 1], ['h', 0], ['x', 0], ['y', 0], ['z', 0]];
  expectList('C1 x_comm alone', 'ladybug', TB, await run(armsB.ladybug, sB, { ...baseB, rank: { mode: 'x_comm' } }), C1);
  const P = ppr(TB, sB, 0.3).map(r12); const pOrd = order(TB, P);
  const cScore = {}; for (const [n, v] of C1) cScore[TB.id.get(n)] = v; const cOrd = order(TB, cScore);
  const fused = {}; pOrd.forEach((i, r) => { fused[i] = (fused[i] || 0) + 1 / (60 + r + 1); }); cOrd.forEach((i, r) => { fused[i] += 1 / (60 + r + 1); });
  for (const k of Object.keys(fused)) fused[k] = r12(fused[k]);
  expectList('C2 hybrid ppr+x_comm', 'ladybug', TB, await run(armsB.ladybug, sB, { ...baseB, rank: { mode: 'hybrid', parts: [{ mode: 'ppr', restart: 0.3, cochange_w: 1 }, { mode: 'x_comm' }] } }), order(TB, fused).map((i) => [TB.name(i), fused[i]]));
  const PR = pagerank(TB, 0.85); const L = {}; for (const i of pOrd) L[i] = P[i] / Math.pow(PR[i], 0.5);
  const gotL = await run(armsB.duckpgq, sB, { ...baseB, rank: { mode: 'x_ppr_lift', restart: 0.3, cochange_w: 1, beta: 0.5 } });
  const expL = order(TB, L).map((i) => [TB.name(i), null]);
  expectList('L1 x_ppr_lift beta 0.5 (order)', 'duckpgq', TB, gotL, expL);
  out.checks.push({ label: 'L1 x_ppr_lift values (relative difference, tolerance stop of the engine)', arm: 'duckpgq', ok: gotL.every((r) => Math.abs(r.score - L[r.i]) / L[r.i] < 1e-4), got: gotL.map((r) => [TB.name(r.i), r.score, L[r.i]]) });
  out.summary = { checks: out.checks.length, ok: out.checks.filter((c) => c.ok).length };
  for (const T of [armsA, armsB]) for (const a of ['relational', 'ladybug', 'duckpgq']) { try { await T[a].close(); } catch (e) { /* ignore */ } }
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e.stack || e); process.exit(2); });
