'use strict';
// Self-test of the scorer, comparison, TQ scorer, whole-line cut rule, configuration validation,
// metapath automaton and equivalence check, on small synthetic references written here (no sealed
// file is read).  node selftest.js   -> prints each check and exits 1 on any failure.
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const S = require('./score');
const CMP = require('./compare');
const TQ = require('./tq_score');
const C = require('./config');
const E = require('./equiv');
const { shownOfPrefix } = require('./packer');
const { prefixWithin, countTokens } = require('./tokenizer');

let pass = 0; let fail = 0;
const near = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-9);
function ok(name, cond, info) { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, info === undefined ? '' : JSON.stringify(info)); } }

// ---- synthetic answers --------------------------------------------------------------------------
const B = (n_full, cut, used, extra = {}) => ({ n_full, cut, used, beyond: 0, ...extra });
const it = (p, shown, tok, extra = {}) => ({ kind: 'file', path: p, symbol: null, ls: 1, le: 100, hop: 1, via: [], score: 1, tok, shown, pad: 0, ...extra });
const ref = (id, cluster, files, defs) => ({ id, cluster, files, defs: defs.map(([p, s, e]) => ({ path: p, start: s, end: e })) });

// 1. signature form, whole items: file and def credit by shown signature lines
{
  const a = { id: 't1', form: 'signature', items: [it('a.py', [10, 30], 1000), it('b.py', [5], 1000)],
    budgets: { 2000: B(2, null, 2000), 4000: B(2, null, 2000), 8000: B(2, null, 2000), 16000: B(2, null, 2000) } };
  const r = ref('t1', 'c1', ['a.py', 'b.py', 'z.py'], [['a.py', 8, 12], ['a.py', 40, 50], ['b.py', 1, 4]]);
  const s = S.scoreAnswer(a, r);
  ok('sig: recall@8k = 3 of 6 (2 files, 1 def)', near(s.r8000, 3 / 6), s.r8000);
  ok('sig: file recall 2/3, def recall 1/3', near(s.file_r8000, 2 / 3) && near(s.def_r8000, 1 / 3), [s.file_r8000, s.def_r8000]);
  ok('sig: primary = r8000', near(s.primary, s.r8000));
  ok('sig: mrr 1, file_r10 2/3', near(s.mrr, 1) && near(s.file_r10, 2 / 3));
  const idcg = 1 + 1 / Math.log2(3) + 1 / Math.log2(4);
  ok('sig: ndcg10', near(s.ndcg10, (1 + 1 / Math.log2(3)) / idcg), s.ndcg10);
}
// 2. cut item: path line shown but no signature line fits -> file only; path line cut -> nothing
{
  const mk = (cut) => ({ id: 't2', form: 'signature', items: [it('a.py', [10], 900), it('b.py', [20], 900)],
    budgets: { 2000: B(1, cut, 1000), 4000: B(2, null, 1800), 8000: B(2, null, 1800), 16000: B(2, null, 1800) } });
  const r = ref('t2', 'c1', ['b.py'], [['b.py', 20, 25]]);
  ok('cut: path line shown, no signature -> file only (0.5)', near(S.scoreAnswer(mk({ tok: 5, path_shown: true, shown: [] }), r).r2000, 0.5));
  ok('cut: path line incomplete -> nothing (0)', near(S.scoreAnswer(mk({ tok: 2, path_shown: false, shown: [] }), r).r2000, 0));
  ok('cut: path and signature line fit -> both (1)', near(S.scoreAnswer(mk({ tok: 9, path_shown: true, shown: [20] }), r).r2000, 1));
}
// 3. snippet cut range
{
  const a = { id: 't3', form: 'snippet', items: [it('a.py', [1, 100], 3000)],
    budgets: { 2000: B(0, { tok: 1990, path_shown: true, shown: [1, 14] }, 2000), 4000: B(1, null, 3000), 8000: B(1, null, 3000), 16000: B(1, null, 3000) } };
  const r = ref('t3', 'c1', [], [['a.py', 12, 20], ['a.py', 15, 20]]);
  const s = S.scoreAnswer(a, r);
  ok('snippet cut: def overlapping shown lines credited, def after them not (0.5)', near(s.r2000, 0.5), s.r2000);
  ok('snippet whole: both (1)', near(s.r4000, 1));
}
// 4. paths form: no primary, ranking only; locate rule still credits defs
{
  const a = { id: 't4', form: 'paths', items: [it('x.py', null, 5), it('a.py', null, 5)],
    budgets: { 2000: B(2, null, 10), 4000: B(2, null, 10), 8000: B(2, null, 10), 16000: B(2, null, 10) } };
  const r = ref('t4', 'c1', ['a.py'], [['a.py', 1, 5]]);
  const s = S.scoreAnswer(a, r);
  ok('paths: primary null, recall null', s.primary === null && s.r8000 === null);
  ok('paths: mrr 0.5, file_r10 1', near(s.mrr, 0.5) && near(s.file_r10, 1));
  const l = S.scoreAnswer(a, r, { rule: 'locate' });
  ok('paths, locate rule: recall 1 (old behaviour kept as a flag)', near(l.r8000, 1) && l.primary === null);
}
// 5. tokens to 80 %, unpadded recall, grid
{
  const a = { id: 't5', form: 'signature', items: [it('a.py', [1], 600), it('b.py', [1], 600, { pad: 1 }), it('c.py', [1], 600), it('d.py', [1], 600)],
    budgets: { 2000: B(3, null, 1800), 4000: B(4, null, 2400), 8000: B(4, null, 2400), 16000: B(4, null, 2400) } };
  const r = ref('t5', 'c1', ['a.py', 'b.py', 'c.py', 'd.py', 'e.py'], []);
  const s = S.scoreAnswer(a, r);
  ok('t80: 4 of 5 files reached at 2,400 tokens', s.t80 === 2400 && s.reach80 === 1, [s.t80, s.reach80]);
  ok('unpadded recall@8k ignores the tail item (3/5), padded 4/5', near(s.unpad_r8000, 3 / 5) && near(s.r8000, 4 / 5));
  ok('grid: recall at 500 tokens 0, at 1,200 tokens 2/5', near(s.grid[0], 0) && near(s.grid[1], 1 / 5) && near(s.grid[2], 2 / 5), s.grid.slice(0, 3));
  ok('auc: trapezoid over 0,2k,4k,8k,16k / 16k', near(s.auc, ((2000 * (0 + 0.6)) / 2 + (2000 * (0.6 + 0.8)) / 2 + 4000 * 0.8 + 8000 * 0.8) / 16000), s.auc);
}
// 6. cluster averaging and standard error
{
  const per = [{ cluster: 'A', primary: 1, grid: S.GRID.map(() => 0) }, { cluster: 'A', primary: 0, grid: S.GRID.map(() => 0) }, { cluster: 'B', primary: 1, grid: S.GRID.map(() => 0) }];
  const rows = S.clusterValues(per); const sm = S.summarise(per, rows);
  ok('cluster mean 0.75 (A = 0.5, B = 1)', near(sm.metrics.primary.mean, 0.75));
  ok('standard error over clusters 0.25', near(sm.metrics.primary.se, 0.25), sm.metrics.primary.se);
}
// 7. scoreFile end to end + compare.js bootstrap
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gt-selftest-'));
  const refs = new Map(); const ansA = []; const ansB = [];
  for (let c = 0; c < 30; c++) for (let t = 0; t < 2; t++) {
    const id = 'c' + c + 't' + t;
    refs.set(id, ref(id, 'C' + c, ['r.py'], []));
    const hitA = (c * 7 + t) % 10 < 7; const hitB = (c * 7 + t) % 10 < 4; // A better than B
    const mk = (hit, arm) => ({ id, set: 'T1', split: 'tune', arm, config_hash: arm, form: 'signature', granularity: 'file', pad: 'none',
      items: [it(hit ? 'r.py' : 'x.py', [1], 100)], budgets: { 2000: B(1, null, 100), 4000: B(1, null, 100), 8000: B(1, null, 100), 16000: B(1, null, 100) } });
    ansA.push(mk(hitA, 'A')); ansB.push(mk(hitB, 'B'));
  }
  const fa = path.join(dir, 'a.jsonl.gz'); const fb = path.join(dir, 'b.jsonl.gz');
  fs.writeFileSync(fa, zlib.gzipSync(ansA.map((x) => JSON.stringify(x)).join('\n') + '\n'));
  fs.writeFileSync(fb, zlib.gzipSync(ansB.map((x) => JSON.stringify(x)).join('\n') + '\n'));
  const [sa] = S.scoreFile(fa, refs); const [sb] = S.scoreFile(fb, refs);
  const trueA = S.mean(sa._rows.map((r) => r.primary)); const trueB = S.mean(sb._rows.map((r) => r.primary));
  ok('scoreFile: 30 clusters, 60 tasks', sa.clusters === 30 && sa.tasks === 60);
  const r1 = CMP.compare(fa, fb, refs, { metrics: ['primary', 'matched'], resamples: 10000, seed: 7 });
  const r2 = CMP.compare(fa, fb, refs, { metrics: ['primary'], resamples: 10000, seed: 7 });
  const m = r1.metrics.primary;
  ok('compare: diff = mean A - mean B', near(m.diff, trueA - trueB), [m.diff, trueA - trueB]);
  ok('compare: 95% interval contains the difference and excludes zero', m.ci95[0] <= m.diff && m.diff <= m.ci95[1] && m.excludes_zero, m.ci95);
  ok('compare: seeded, identical on rerun', JSON.stringify(r2.metrics.primary) === JSON.stringify(m));
  ok('compare: sign-flip p < 0.01', m.p_signflip < 0.01, m.p_signflip);
  ok('compare: matched tokens = 100 rounded to grid (500)', r1.metrics.matched.tokens === 500, r1.metrics.matched);
  const r0 = CMP.compare(fa, fa, refs, { metrics: ['primary'], resamples: 2000, seed: 1 });
  ok('compare: A vs A -> diff 0, interval [0, 0]', r0.metrics.primary.diff === 0 && r0.metrics.primary.ci95[0] === 0 && r0.metrics.primary.ci95[1] === 0);
  fs.rmSync(dir, { recursive: true, force: true });
}
// 8. whole-line cut rule in the packer
{
  const sig = { text: 'a/b.py\n  3: def f(x):\n  9: def g(y):\n', layout: 'sigfile', shown: [3, 9] };
  const p1 = prefixWithin(sig.text, countTokens('a/b.py\n  3: def f'));
  const s1 = shownOfPrefix(sig, p1.text);
  ok('packer cut: signature line 3 not whole -> not shown, path shown', s1.path_shown === true && s1.shown.length === 0, s1);
  const s2 = shownOfPrefix(sig, 'a/b.py\n  3: def f(x):\n');
  ok('packer cut: line 3 whole -> [3]', JSON.stringify(s2.shown) === '[3]');
  const sn = { text: '--- a.py\nl1\nl2\nl3\n', layout: 'snippet', shown: [5, 7], first: 5 };
  ok('packer cut: snippet header only -> nothing', shownOfPrefix(sn, '--- a.py\nl1').shown === null);
  ok('packer cut: snippet two whole lines -> [5, 6]', JSON.stringify(shownOfPrefix(sn, '--- a.py\nl1\nl2\nl').shown) === '[5,6]');
  ok('packer cut: header not whole -> path not shown', shownOfPrefix(sn, '--- a.p').path_shown === false);
}
// 9. TQ scorer
{
  const refs = [
    { id: 1, split: 'tune', kind: 'k', answer: ['job', 'job_event'], accept_aliases: { job: ['jobs'] } },
    { id: 2, split: 'tune', kind: 'k', answer: { real: ['t1.py'], fake: ['t2.py', 't3.py'] }, accept_aliases: {} },
    { id: 3, split: 'tune', kind: 'k', answer: [], accept_aliases: {} },
    { id: 4, split: 'held_out', kind: 'k', answer: ['x'], accept_aliases: {} },
  ];
  const ans = [{ id: 1, answer: ['jobs', 'other'], tokens: 10, lookups: 1 }, { id: 2, answer: { real: ['t1.py'], fake: ['t2.py'] }, tokens: 20, lookups: 2 }, { id: 3, answer: [], tokens: 1, lookups: 1 }];
  const r = TQ.scoreTq(ans, refs, { split: 'tune', judgement: { 1: ['job_event'] } });
  const q = (id) => r.all.per_question.find((x) => x.id === id);
  ok('tq: alias counts (q1 P 1/2 R 1/2)', near(q(1).p, 0.5) && near(q(1).r, 0.5));
  ok('tq: object answer pooled (q2 TP 2 of 2 answered, 3 reference)', q(2).tp === 2 && q(2).na === 2 && q(2).nr === 3 && near(q(2).r, 2 / 3));
  ok('tq: per-part scores kept', near(q(2).parts.fake.r, 0.5) && near(q(2).parts.real.f1, 1));
  ok('tq: empty answer to empty reference = 1', q(3).f1 === 1);
  ok('tq: split filter (3 tune questions)', r.all.questions === 3);
  ok('tq: without judgement items, q1 recall 1/1', near(r.without_judgement.per_question.find((x) => x.id === 1).r, 1));
  ok('tq: micro from summed counts', near(r.all.micro.p, 3 / 4) && near(r.all.micro.r, 3 / 5));
}
// 10. configuration validation and the metapath automaton
{
  const base = { granularity: 'file', form: 'signature', direction: 'both', classes: ['calls'], traversal: { mode: 'khop', hops: 2 }, hub: { mode: 'none' }, rank: { mode: 'bfs' } };
  const n = C.normalise(base);
  ok('config: defaults pad none, minConf 0.5', n.pad === 'none' && n.minConf === 0.5);
  let threw = null;
  try { C.normalise({ ...base, traversal: { mode: 'budget', budgets: { structure: 9, imports: 9, calls: 9, http: 9 } } }); } catch (e) { threw = e.message; }
  ok('config: budget state space 10,000 > 8,192 refused', /exceeds the limit 8192/.test(threw || ''), threw);
  threw = null;
  try { C.normalise({ ...base, traversal: { mode: 'metapath', steps: [{ classes: ['calls'], min: 0, max: 7 }] } }); } catch (e) { threw = e.message; }
  ok('config: metapath repeat above 6 refused', /repeat range/.test(threw || ''), threw);
  const mp = C.normalise({ ...base, traversal: { mode: 'metapath', steps: [{ classes: ['structure'], dir: 'out', min: 0, max: 1 }, { kinds: ['calls'], dir: 'both', min: 1, max: 2 }, { classes: ['tests'], dir: 'in', min: 0, max: 1 }] } });
  ok('config: metapath classes = union of step classes and kind classes', JSON.stringify(mp.classes) === JSON.stringify(['structure', 'calls', 'tests']), mp.classes);
  const mv = C.metapathMoves(mp.traversal.steps).map((x) => x.j + ',' + x.c + '>' + x.k + ',' + x.nc).join(' ');
  ok('metapath moves', mv === '0,0>0,1 0,0>1,1 0,1>1,1 1,0>1,1 1,1>1,2 1,1>2,1 1,2>2,1 2,0>2,1', mv);
  const acc = C.metapathAccepting(mp.traversal.steps).map((x) => x.j + ',' + x.c).join(' ');
  ok('metapath accepting states', acc === '1,1 1,2 2,0 2,1', acc);
  ok('config: rankKey ignores pad, form and granularity', C.rankKey({ ...base, pad: 'DIR', form: 'paths', granularity: 'symbol' }) === C.rankKey(base));
}
// 11. equivalence
{
  const A = [{ i: 5, hop: 1, score: 0.5 }, { i: 7, hop: 1, score: 0.5 + 1e-12 }, { i: 9, hop: 2, score: 0.1 }];
  const Bq = [{ i: 7, hop: 1, score: 0.5 }, { i: 5, hop: 1, score: 0.5 }, { i: 9, hop: 2, score: 0.1 }];
  ok('equiv: ties within 1e-9 in any order', E.equivalent(A, Bq).ok);
  ok('equiv: different order where scores differ fails', !E.equivalent(A, [Bq[2], Bq[0], Bq[1]]).ok);
  ok('equiv: different reach fails', !E.equivalent(A, Bq.slice(0, 2)).ok);
  ok('equiv: unscored ranking needs identical order', !E.equivalent([{ i: 1, hop: 1, score: null }, { i: 2, hop: 1, score: null }], [{ i: 2, hop: 1, score: null }, { i: 1, hop: 1, score: null }]).ok);
}
// 12. degnorm when a node has out-degree 0 under the configured direction (SPEC 8.1, addendum 3 A.1),
//     reference and relational, on a tiny metapath graph.
//
//   Nodes (integer id = position of the sorted string id): a=1 b=2 c=3 d=4 e=5 f=6 x=7, all functions.
//   Edges, all kind `calls` (class calls), weight 1:  a->b  a->c  c->f  d->b  e->b  x->b  x->c
//   Configuration: direction dependencies; metapath step 0 = calls out (1..1), step 1 = calls in (1..1);
//   hops unbounded; emit all; hub none; rank degnorm; seed {a}.
//
//   Traversal: depth 1 from a (state 0,0) along out-arcs: b, c (state 0,1). Depth 2 from b and c along
//   in-arcs (state 1,1): from b -> d, e, x (a is a seed at depth 0, not a DAG arc); from c -> x. f is
//   never reached (c->f is an out-arc and step 1 takes only in-arcs).
//   Reach DAG arcs: a->b, a->c, b->d, b->e, b->x, c->x.
//   Out-degree under `dependencies` (forward calls arcs): od(a) = 2 (b, c); od(c) = 1 (f);
//   od(b) = 0  -> the rule: od(b) = reach-DAG arcs leaving b = 3 (d, e, x).
//   act(a) = 1; act(b) = act(c) = 1/2; act(d) = act(e) = (1/2)/3 = 1/6;
//   act(x) = (1/2)/3 + (1/2)/1 = 2/3.
//   Scores (Round12): x 0.666666666667, b 0.5, c 0.5, d 0.166666666667, e 0.166666666667.
//   Order (score desc, hop asc, id asc): x(7), b(2), c(3), d(4), e(5).
//   (Before the rule: the reference divided by zero (x, d, e infinite) and the relational arm dropped
//   the term (d = e = 0, x = 1/2).)
// 13. a metapath step whose edge kinds are all absent at a commit reaches nothing (addendum 3, A.4):
//   step 1 = kind enqueues_kind (absent from the toy graph): emit all -> only b, c (hop 1);
//   emit end -> nothing; a single step of class data (absent) -> nothing. No error in either arm.
{
  const { RefGraph } = require('../reference/ref');
  const { buildDb, openDb } = require('../relational/db');
  const { RelGraph, checkModes } = require('../relational/rel');
  const { CLASSES } = require('./edgeclasses');
  const sids = ['a', 'b', 'c', 'd', 'e', 'f', 'x'];
  const nodes = sids.map((s, j) => ({ i: j + 1, sid: 'sym:t.py#' + s, kind: 'function', path: 't.py', name: s, ls: j + 1, le: j + 1,
    signature: 'def ' + s + '():', runtime: 'backend', slice: 'toy', is_test: 0, tokens: 3, file: 0, text: s + 'fn' }));
  const id = (s) => sids.indexOf(s) + 1;
  const E2 = [['a', 'b'], ['a', 'c'], ['c', 'f'], ['d', 'b'], ['e', 'b'], ['x', 'b'], ['x', 'c']].map(([u, v]) => ({
    s: id(u), d: id(v), kind: 'calls', cls: 'calls', k: 1, c: CLASSES.indexOf('calls'), sym: 0, w: 1, n: 1, evs: [['t.py', 1, null]], support: 0, recency: 0 }));
  E2.sort((p, q) => p.s - q.s || p.k - q.k || p.d - q.d);
  const G = { sha: 'toy', dir: null, meta: { extractor_version: 'toy' }, nodes, edges: E2, kinds: ['calls'], commits: [], removed: [], loader_version: 'L5' };
  const dbf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gt-toy-')), 'toy.sqlite');
  buildDb(G, dbf);
  const db = openDb(dbf); const rel = new RelGraph(db); const ref = new RefGraph(G);
  const mkc = (steps, emit = 'all', rank = { mode: 'degnorm' }) => C.normalise({ granularity: 'file', form: 'signature', direction: 'dependencies',
    traversal: { mode: 'metapath', hops: null, emit, steps }, hub: { mode: 'none' }, rank });
  const OUTIN = [{ kinds: ['calls'], dir: 'out', min: 1, max: 1 }, { kinds: ['calls'], dir: 'in', min: 1, max: 1 }];
  const cfg = mkc(OUTIN);
  const A = ref.rank([id('a')], cfg, null); const R = rel.rank([id('a')], cfg, null);
  const want = [[7, 2, 0.666666666667], [2, 1, 0.5], [3, 1, 0.5], [4, 2, 0.166666666667], [5, 2, 0.166666666667]];
  const got = (L) => L.map((r) => [r.i, r.hop, r.score]);
  ok('degnorm od=0 rule: reference = hand-worked scores and order', JSON.stringify(got(A)) === JSON.stringify(want), got(A));
  ok('degnorm od=0 rule: relational = hand-worked scores and order', JSON.stringify(got(R)) === JSON.stringify(want), got(R));
  ok('degnorm od=0 rule: relational and reference byte-identical (via and path too)', E.strict(A, R), { A, R });
  ok('degnorm od=0 rule: the fallback was used (reference counter)', ref.stats.degnorm_od0 >= 1, ref.stats);
  const hy = mkc(OUTIN, 'all', { mode: 'hybrid', parts: [{ mode: 'degnorm' }, { mode: 'bfs' }] });
  ok('degnorm od=0 rule inside a hybrid: relational = reference', E.strict(ref.rank([1], hy, null), rel.rank([1], hy, null)));
  const ABSENT = [{ kinds: ['calls'], dir: 'out', min: 1, max: 1 }, { kinds: ['enqueues_kind'], dir: 'both', min: 1, max: 1 }];
  const c1 = mkc(ABSENT); const c2 = mkc(ABSENT, 'end'); const c3 = mkc([{ classes: ['data'], dir: 'both', min: 1, max: 2 }]);
  const r1 = [ref.rank([1], c1, null), rel.rank([1], c1, null)];
  ok('absent-kind step, emit all: both arms reach only b, c at hop 1', r1.every((L) => JSON.stringify(L.map((r) => [r.i, r.hop])) === '[[2,1],[3,1]]') && E.strict(r1[0], r1[1]), r1);
  const r2 = [ref.rank([1], c2, null), rel.rank([1], c2, null)];
  ok('absent-kind step, emit end: both arms reach nothing', r2.every((L) => L.length === 0), r2);
  const r3 = [ref.rank([1], c3, null), rel.rank([1], c3, null)];
  ok('absent-class single step: both arms reach nothing', r3.every((L) => L.length === 0), r3);
  // x_ modes pass config validation for every arm; the relational arm refuses only unimplemented ones
  const xcfg = { granularity: 'file', form: 'signature', traversal: { mode: 'x_community', seed: 7 }, rank: { mode: 'x_louvain', resolution: 1 } };
  let xn = null; let xe = null; try { xn = C.normalise(xcfg); } catch (e) { xe = e.message; }
  ok('config: x_ traversal and rank (no direction) pass validation', xn && C.isExtension(xn) && xn.traversal.seed === 7, xe);
  const xh = C.normalise({ ...cfg, rank: { mode: 'hybrid', parts: [{ mode: 'degnorm' }, { mode: 'x_louvain' }] } });
  ok('config: x_ part inside a hybrid passes validation, marked as extension', C.isExtension(xh));
  let relMsg = null; try { checkModes(xn); } catch (e) { relMsg = e.message; }
  ok('relational: unimplemented x_ mode refused at rank time with its name', /no traversal mode x_community/.test(relMsg || ''), relMsg);
  ok('config: a specified configuration is not an extension', !C.isExtension(cfg));
  db.close(); fs.rmSync(path.dirname(dbf), { recursive: true, force: true });
}
// 14. answer record: lookups counted once in the harness (addendum 3 D.11) and meta carried (D.12)
{
  const H = require('./harness');
  const G = { sha: 'toy', nodes: [{ i: 1, sid: 'file:a.py', kind: 'file', path: 'a.py', name: 'a.py', ls: 1, le: 3, file: 1, is_test: 0 }], edges: [], kinds: [], commits: [] };
  const t = { id: 'x', set: 'T1', split: 'tune', parent: 'toy', seed: { path: 'a.py' } };
  const sm = { ids: [1], match: 'file' };
  const base = { granularity: 'file', form: 'paths', pad: 'none' };
  const a1 = H.answer(G, t, sm, { ranked: [], lookups: 5, meta: { tokens_read: 120, ledger: [[1], [2], [3]] } }, { ...base, pad: 'CO' }, 's', 0);
  ok('lookups: head 5 + CO tail 2 = 7', a1.lookups === 7 && a1.lookups_head === 5 && a1.lookups_pad === 2, [a1.lookups, a1.lookups_head, a1.lookups_pad]);
  ok('meta: tokens_read kept, ledger replaced by ledger_len', a1.meta && a1.meta.tokens_read === 120 && a1.meta.ledger_len === 3 && !('ledger' in a1.meta), a1.meta);
  const a2 = H.answer(G, t, sm, [], { ...base, pad: 'DIR' }, 'g', 0);
  ok('lookups: an arm that reports none = 1 query, + DIR tail 1 = 2; meta null', a2.lookups === 2 && a2.lookups_head === 1 && a2.meta === null);
  const a3 = H.answer(G, t, sm, { ranked: [], lookups: 0 }, { ...base, pad: 'DIR' }, 'floor-dir', 0);
  ok('lookups: DIR floor (empty head) = 1', a3.lookups === 1);
  const fl = H.loadArmList('floor-co', 1, false);
  ok('floor list: floor-co loads its fixed list of 8 as stage 1', fl.list.length === 8 && fl.kind === 'floor');
  let s2 = null; try { H.loadArmList('floor-co', 2, false); } catch (e) { s2 = e.message; }
  ok('floor list: a floor has no stage 2', /no stage2/.test(s2 || ''), s2);
  let v19 = null; try { H.validateList('x', 2, Array.from({ length: 19 }, (_, j) => ({ ...base, name: 'n' + j, minConf: j / 100 })), 20); } catch (e) { v19 = e.message; }
  ok('stage-2 list of 19 refused', /must be exactly 20/.test(v19 || ''), v19);
  const v20 = H.validateList('x', 2, Array.from({ length: 20 }, (_, j) => ({ ...base, name: 'n' + j, minConf: j / 100 })), 20);
  ok('stage-2 list of 20 distinct configurations accepted', v20.length === 20);
}
console.log(JSON.stringify({ pass, fail }));
if (fail) process.exit(1);
