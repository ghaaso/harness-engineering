'use strict';
// Check of the relational arm's x_wsp rank (stage 2; definition in NOTES.md "x_wsp").
// Part A: a toy graph whose costs and order are worked out by hand below.
// Part B (--real): TUNE T1/T2 tasks (two per parent), several x_wsp configurations: the relational
// ranked list must equal (node set, hop, via, path) the reference arm's k-hop reach for the same
// configuration ranked bfs, every score must equal Round12(1 / (1 + d)) with d from a plain JavaScript
// Dijkstra written here over the reference arm's arcs (SPEC 4) and hub predicate (SPEC 5) - blocked
// nodes may end a path but are never expanded - and the order must be score desc, hop asc, id asc.
// TUNE only; nothing here reads sealed/ or runs HELD-OUT.
//   node arms/relational/wspcheck.js [--real] [--per-parent 2] [--out <file.json>]
const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('../common/config');
const { CLASSES } = require('../common/edgeclasses');

const CLASS_COST = { structure: 1, membership: 4, imports: 1, calls: 1, http: 1, tests: 1, data: 1.5, config: 1.5, capability: 3, docs: 3, history: 2, experimental: 3 };
const edgeCost = (c, w) => (CLASS_COST[CLASSES[c]] == null ? 3 : CLASS_COST[CLASSES[c]]) / Math.max(w, 0.05);
const r12 = (x) => Math.round(x * 1e12) / 1e12;
let fails = 0; let checks = 0;
function ok(name, cond, info) { checks++; if (!cond) { fails++; console.log('FAIL ' + name + ' ' + JSON.stringify(info)); } else console.log('ok   ' + name); }

// ---- Part A: toy graph ------------------------------------------------------------------------
// Nodes a(1) b(2) c(3) d(4) e(5) f(6); seed a. Edges (kind, class, confidence, x_wsp cost):
//   a -calls-> b        calls 1.0   cost 1/1   = 1
//   a -imports-> c      imports 0.5 cost 1/0.5 = 2
//   b -reads_table-> d  data 1.0    cost 1.5/1 = 1.5
//   c -calls-> d        calls 1.0   cost 1
//   d -co_changed- e    history 0.8 cost 2/0.8 = 2.5 (symmetric)
//   a -calls-> e        calls 0.4   cost 1/0.4 = 2.5 (below minConf 0.5)
//   f -calls-> b        calls 1.0   cost 1 (reverse arc b -> f under dependents/both)
// 1) both, minConf 0.5, no hub, hops null: b = 1, c = 2, f = 1 + 1 = 2, d = min(1 + 1.5, 2 + 1) = 2.5,
//    e = 2.5 + 2.5 = 5. Scores 1/(1+d): b 0.5, c 1/3, f 1/3, d 1/3.5, e 1/6. Hops: b 1, c 1, d 2, f 2,
//    e 3. Order (score desc, hop asc, id asc): b, c (hop 1), f (hop 2), d, e.
// 2) dependencies, same: f unreachable; b, c, d, e as in 1).
// 3) both, minConf 0: the a -> e arc counts: e = 2.5 (hop 1), d = 2.5 (hop 2): both 1/3.5, e first by hop.
//    Order b, c, f, e, d (c 1/3 hop 1, f 1/3 hop 2, then e and d at 1/3.5).
// 4) both, minConf 0.5, hub indeg k = 2. prod_in (non-structural classes in the mask, non-test
//    sources, symmetric counts at both ends, minConf ignored): b 2 (a, f), c 1, d 3 (b, c, e), e 2
//    (d, a). d is blocked: reached (cost 2.5) but never expanded, so e is not reached at all (if a
//    blocked node could be passed through, e would score 1/6). Order b, c, f, d.
// 5) dependents, minConf 0.5: arcs = reverse arcs of directed edges + symmetric edges. From a: a has no
//    incoming directed edge, no symmetric edge: nothing is reached (empty list).
function partA() {
  const { buildDb, openDb } = require('./db');
  const { RelGraph } = require('./rel');
  const sids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const nodes = sids.map((s, j) => ({ i: j + 1, sid: 'sym:t.py#' + s, kind: 'function', path: 't.py', name: s, ls: j + 1, le: j + 1,
    signature: 'def ' + s + '():', runtime: 'backend', slice: 'toy', is_test: 0, tokens: 3, file: 0, text: s + 'fn' }));
  const id = (s) => sids.indexOf(s) + 1;
  const kinds = ['calls', 'co_changed', 'imports', 'reads_table'];
  const kcls = { calls: 'calls', co_changed: 'history', imports: 'imports', reads_table: 'data' };
  const mk = (u, kind, v, w) => {
    let s = id(u); let d = id(v); const sym = kind === 'co_changed' ? 1 : 0;
    if (sym && s > d) [s, d] = [d, s];
    return { s, d, kind, cls: kcls[kind], k: kinds.indexOf(kind) + 1, c: CLASSES.indexOf(kcls[kind]), sym, w, n: 1, evs: [['t.py', 1, null]], support: 1, recency: 1 };
  };
  const edges = [mk('a', 'calls', 'b', 1), mk('a', 'imports', 'c', 0.5), mk('b', 'reads_table', 'd', 1), mk('c', 'calls', 'd', 1),
    mk('d', 'co_changed', 'e', 0.8), mk('a', 'calls', 'e', 0.4), mk('f', 'calls', 'b', 1)];
  edges.sort((p, q) => p.s - q.s || p.k - q.k || p.d - q.d);
  const G = { sha: 'toy', dir: null, meta: { extractor_version: 'toy' }, nodes, edges, kinds, commits: [], removed: [], loader_version: 'L5' };
  const dbf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gt-wsp-')), 'toy.sqlite');
  buildDb(G, dbf);
  const db = openDb(dbf); const rel = new RelGraph(db);
  const cfg = (patch) => C.normalise({ granularity: 'file', form: 'signature', direction: 'both', minConf: 0.5,
    classes: ['imports', 'calls', 'data', 'history'], traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'x_wsp' }, ...patch });
  const got = (L) => L.map((r) => [sids[r.i - 1], r.hop, r.score]);
  const t3 = r12(1 / 3); const t35 = r12(1 / 3.5); const t6 = r12(1 / 6);
  const cases = [
    ['1 both minConf 0.5', cfg({}), [['b', 1, 0.5], ['c', 1, t3], ['f', 2, t3], ['d', 2, t35], ['e', 3, t6]]],
    ['2 dependencies', cfg({ direction: 'dependencies' }), [['b', 1, 0.5], ['c', 1, t3], ['d', 2, t35], ['e', 3, t6]]],
    ['3 both minConf 0', cfg({ minConf: 0 }), [['b', 1, 0.5], ['c', 1, t3], ['f', 2, t3], ['e', 1, t35], ['d', 2, t35]]],
    ['4 both hub indeg k=2 (d blocked, e unreachable)', cfg({ hub: { mode: 'indeg', k: 2 } }), [['b', 1, 0.5], ['c', 1, t3], ['f', 2, t3], ['d', 2, t35]]],
    ['5 dependents (nothing reached)', cfg({ direction: 'dependents' }), []],
  ];
  for (const [name, c, want] of cases) {
    const L = rel.rank([id('a')], c, null);
    ok('toy ' + name + ': relational x_wsp = hand-worked list', JSON.stringify(got(L)) === JSON.stringify(want), { got: got(L), want });
  }
  // inside a hybrid (RRF of x_wsp and bfs) the rank runs too and the result is a full order of R
  const hy = rel.rank([id('a')], cfg({ rank: { mode: 'hybrid', parts: [{ mode: 'x_wsp' }, { mode: 'bfs' }] } }), null);
  ok('toy hybrid x_wsp+bfs runs and ranks all 5 candidates', hy.length === 5, got(hy));
  ok('toy: rounds of the last call recorded', rel.lastWspRounds >= 1, rel.lastWspRounds);
  db.close(); fs.rmSync(path.dirname(dbf), { recursive: true, force: true });
}

// ---- Part B: real TUNE tasks against a JavaScript Dijkstra --------------------------------------
function dijkstra(ref, seeds, cfg, blocked) {
  const allowed = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
  const maskOk = (c) => allowed.has(c);
  const dist = new Map(); const done = new Set();
  const heap = []; // [d, v]
  const push = (d, v) => { heap.push([d, v]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1; const r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (const s of seeds) { dist.set(s, 0); push(0, s); }
  while (heap.length) {
    const [d, u] = pop();
    if (done.has(u)) continue; done.add(u);
    if (blocked(u)) continue;
    for (const a of ref.arcs(u, cfg.direction, maskOk, cfg.minConf)) {
      const nd = d + edgeCost(a.c, a.w);
      if (!dist.has(a.v) || nd < dist.get(a.v)) { dist.set(a.v, nd); push(nd, a.v); }
    }
  }
  return dist;
}

async function partB(perParent, outFile) {
  const H = require('../common/harness');
  const { graphFor, openArm } = require('../common/arms');
  const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config'];
  const base = { granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5, direction: 'both', classes: [...CODE, 'history'],
    traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'x_wsp' } };
  const cfgs = [
    ['stage-2 entry: hops=null rank=x_wsp', base],
    ['dependents', { ...base, direction: 'dependents' }],
    ['dependencies', { ...base, direction: 'dependencies' }],
    ['hub indeg>10', { ...base, hub: { mode: 'indeg', k: 10 } }],
    ['hub transport', { ...base, hub: { mode: 'transport' } }],
    ['minConf 0, all classes, hops 4', { ...base, minConf: 0, classes: [...CODE, 'membership', 'capability', 'docs', 'history'], traversal: { mode: 'khop', hops: 4 } }],
  ].map(([n, c]) => [n, C.normalise(c)]);
  const tasks = H.loadTasks(['T1', 'T2'], 'tune');
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); if (byParent.get(t.parent).length < perParent) byParent.get(t.parent).push(t); }
  const sum = { parents: byParent.size, tasks: 0, lists: 0, scores: 0, score_diff: 0, set_or_hop_diff: 0, via_diff: 0, order_diff: 0, blocked_candidates: 0, rounds_max: 0, rel_ms: 0 };
  const bad = [];
  for (const parent of [...byParent.keys()].sort()) {
    const G = graphFor(parent);
    const rel = await openArm('relational', G); const refA = await openArm('reference', G); const ref = refA.raw.ref;
    for (const t of byParent.get(parent)) {
      const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) continue; sum.tasks++;
      const seeds = new Set(sm.ids);
      for (const [name, cfg] of cfgs) {
        const s0 = Date.now();
        const L = H.normRank(await rel.rank(sm.ids, cfg, t.seed)).ranked; sum.rel_ms += Date.now() - s0;
        sum.rounds_max = Math.max(sum.rounds_max, rel.raw.rel ? rel.raw.rel.lastWspRounds || 0 : 0);
        const B = H.normRank(await refA.rank(sm.ids, { ...cfg, rank: { mode: 'bfs' } }, t.seed)).ranked;
        sum.lists++;
        const allowed = new Set(cfg.classes.map((c) => CLASSES.indexOf(c)));
        const blocked = ref.blockedFn(cfg, seeds, allowed);
        const dist = dijkstra(ref, sm.ids, cfg, blocked);
        const bm = new Map(B.map((r) => [r.i, r]));
        const sameSet = L.length === B.length && L.every((r) => bm.has(r.i) && bm.get(r.i).hop === r.hop);
        if (!sameSet) { sum.set_or_hop_diff++; bad.push({ task: t.id, cfg: name, what: 'set/hop', n: [L.length, B.length] }); continue; }
        for (const r of L) {
          sum.scores++; if (blocked(r.i)) sum.blocked_candidates++;
          const want = dist.has(r.i) ? r12(1 / (1 + dist.get(r.i))) : 0;
          if (Math.abs(want - r.score) > 1e-9) { sum.score_diff++; if (bad.length < 50) bad.push({ task: t.id, cfg: name, node: r.i, got: r.score, want }); }
          const b = bm.get(r.i);
          if (JSON.stringify(b.via) !== JSON.stringify(r.via) || JSON.stringify(b.path) !== JSON.stringify(r.path)) sum.via_diff++;
        }
        for (let k = 1; k < L.length; k++) {
          const p = L[k - 1]; const q = L[k];
          if (!(p.score > q.score || (p.score === q.score && (p.hop < q.hop || (p.hop === q.hop && p.i < q.i))))) { sum.order_diff++; break; }
        }
      }
    }
    await rel.close(); await refA.close();
  }
  console.log(JSON.stringify(sum));
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ summary: sum, configs: cfgs.map(([n, c]) => ({ name: n, hash: C.configHash(c), cfg: c })), problems: bad }, null, 1));
  ok('real tasks: same reach set and hops as the reference arm', sum.set_or_hop_diff === 0, sum);
  ok('real tasks: every score = Round12(1/(1+Dijkstra cost)) within 1e-9', sum.score_diff === 0, sum);
  ok('real tasks: explanation paths equal the reference k-hop paths', sum.via_diff === 0, sum);
  ok('real tasks: order score desc, hop asc, id asc', sum.order_diff === 0, sum);
}

async function main() {
  const a = process.argv.slice(2); let real = false; let per = 2; let out = null;
  for (let i = 0; i < a.length; i++) { if (a[i] === '--real') real = true; else if (a[i] === '--per-parent') per = Number(a[++i]); else if (a[i] === '--out') out = a[++i]; else throw new Error('unknown argument ' + a[i]); }
  partA();
  if (real) await partB(per, out);
  console.log(`${checks - fails} of ${checks} checks pass`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
