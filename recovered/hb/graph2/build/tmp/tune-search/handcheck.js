'use strict';
// Hand check of the stage-2 search additions (fuse.js) on toy inputs; expected values worked out by
// hand in the comments. Run: node tmp/tune-search/handcheck.js (from the build root or anywhere).
const path = require('path');
const assert = require('assert');
const ARM = path.join(__dirname, '..', '..', 'arms', 'search');
const F = require(path.join(ARM, 'fuse.js'));
const { Ctx, Ledger } = require(path.join(ARM, 'engine.js'));
const SR = require(path.join(ARM, 'search.js'));
const L = require(path.join(ARM, 'lib.js'));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', n, m); };
const D = 86400; const T = 100 * D;

// ---- 1. co-change list ----------------------------------------------------------------------------
// seed a/s.py; newest commit time T, so the recency weight of a commit d days old is 0.5^(d/30).
//  C1 T      [s, a/x, b/y]   used          -> x +1 (w 1), y +1 (w 1)
//  C2 T-30d  [s, a/x]        used          -> x +1 (w 0.5)
//  C3 T      [s, b/z, README.md] used      -> z +1 (w 1); README.md not kept (not code)
//  C4 T      [s, b/w]        dropped       -> ignored
//  C5 T      [b/y, b/z]      no seed       -> ignored
//  C6 T-60d  [s, b/z]        no `used`, 2 files (2..30) -> counts: z +1 (w 0.25)
//  C7 T      [s, b/q]        used false    -> ignored
// counts: x 2 (rec 1.5), z 2 (rec 1.25), y 1 (rec 1). Order: x, z, y.
const commits = [
  { time: T, files: ['a/s.py', 'a/x.py', 'b/y.py'], used: true },
  { time: T - 30 * D, files: ['a/s.py', 'a/x.py'], used: true },
  { time: T, files: ['a/s.py', 'b/z.py', 'README.md'], used: true },
  { time: T, files: ['a/s.py', 'b/w.py'], used: true, dropped: true },
  { time: T, files: ['b/y.py', 'b/z.py'], used: true },
  { time: T - 60 * D, files: ['a/s.py', 'b/z.py'] },
  { time: T, files: ['a/s.py', 'b/q.py'], used: false },
];
const co = F.coChanged(commits, 'a/s.py', (p) => p.endsWith('.py'));
ok(JSON.stringify(co.map((r) => r.path)) === JSON.stringify(['a/x.py', 'b/z.py', 'b/y.py']), 'co order x, z, y');
ok(co[0].count === 2 && co[0].rec === 1.5, 'x: count 2, recency 1 + 0.5 = 1.5');
ok(co[1].count === 2 && co[1].rec === 1.25, 'z: count 2, recency 1 + 0.25 = 1.25');
ok(co[2].count === 1 && co[2].rec === 1, 'y: count 1, recency 1');

// ---- 2. RRF (k = 60) -------------------------------------------------------------------------------
// grep [f1, f2, f3], bm25 [f3, f4], co [f4]:
//  f1 = 1/61 = 0.016393..., f2 = 1/62 = 0.016129..., f3 = 1/63 + 1/61 = 0.032266..., f4 = 1/62 + 1/61 = 0.032523...
// order f4, f3, f1, f2.
const r = F.rrf([['f1', 'f2', 'f3'], ['f3', 'f4'], ['f4']]);
ok(JSON.stringify(r.map((x) => x.path)) === JSON.stringify(['f4', 'f3', 'f1', 'f2']), 'rrf order f4, f3, f1, f2');
ok(Math.abs(r[0].score - (1 / 62 + 1 / 61)) < 1e-15 && Math.abs(r[1].score - (1 / 63 + 1 / 61)) < 1e-15, 'rrf f4 = 1/62 + 1/61, f3 = 1/63 + 1/61');
ok(Math.abs(r[2].score - 1 / 61) < 1e-15 && Math.abs(r[3].score - 1 / 62) < 1e-15, 'rrf f1 = 1/61, f2 = 1/62');
// a tie (same fused value) goes to the smaller path
const t = F.rrf([['b', 'c'], ['a']]);
ok(JSON.stringify(t.map((x) => x.path)) === JSON.stringify(['a', 'b', 'c']), 'rrf tie a = b = 1/61 broken by path');

// ---- 3. the search on a toy tree ------------------------------------------------------------------
// seed backend/app/features/x/service.py :: seed_fn. router.py imports and calls it; co.py changed
// with the seed twice, other.py once. Round 1 only, no routes, no spellings, no BM25.
//  lookups: 1 read seed, 2 grep "name seed_fn", 3 git log co-change -> 3.
//  grep part = [router.py] (its hits: the import line and the call); co part = [co.py (2), other.py (1)].
//  rrf: router 1/61, co.py 1/61, other 1/62 -> router, co (tie by path: features/x < features/y), other.
//  sum: router 1 (grep / max), co.py 2/2 = 1, other 1/2 = 0.5 -> the same order, scores 1, 1, 0.5.
const files = new Map([
  ['backend/app/features/x/service.py', 'def seed_fn():\n    return 1\n'],
  ['backend/app/features/x/router.py', 'from .service import seed_fn\n\ndef handler():\n    return seed_fn()\n'],
  ['backend/app/features/y/other.py', 'def unrelated():\n    pass\n'],
  ['backend/app/features/y/co.py', 'def z():\n    pass\n'],
]);
const ctx = Object.create(Ctx.prototype);
ctx.files = files; ctx.paths = [...files.keys()].sort(); ctx.codePaths = ctx.paths;
ctx.lines = new Map([...files].map(([p, s]) => [p, s.split('\n')]));
let id = 1; ctx.fileId = new Map(); ctx.nodes = new Map();
for (const p of ctx.paths) ctx.fileId.set(p, id++);
const def = (p, name, start, end) => { if (!ctx.nodes.has(p)) ctx.nodes.set(p, []); const d = { i: id++, sid: p + '#' + name, name, kind: 'function', start, end, signature: '' }; ctx.nodes.get(p).push(d); return d; };
const seedDef = def('backend/app/features/x/service.py', 'seed_fn', 1, 2);
def('backend/app/features/x/router.py', 'handler', 3, 4);
def('backend/app/features/y/other.py', 'unrelated', 1, 2);
def('backend/app/features/y/co.py', 'z', 1, 2);
ctx._imports = new Map(); ctx._bm25 = null;
ctx.commits = [
  { time: T, files: ['backend/app/features/x/service.py', 'backend/app/features/y/co.py', 'backend/app/features/y/other.py'], used: true },
  { time: T - 30 * D, files: ['backend/app/features/x/service.py', 'backend/app/features/y/co.py'], used: true },
];
const base = { rounds: 1, routes: false, spellings: false, nullNames: 8, seedImports: true, namesPerFile: 3, genericCap: 300, followImports: false, k2: 5, decay: 0.5, bm25: false, bm25only: false, bm25K1: 1.2, bm25B: 0.75, bm25Top: 50, prox: 0, typeW: { def: 3, import: 2, mock: 1.5, call: 1 }, countW: 0.25, idf: true };
const seed = { path: 'backend/app/features/x/service.py', symbol: { name: 'seed_fn', kind: 'function', start: 1, end: 2 } };
for (const fuse of ['rrf', 'sum']) {
  const res = SR.search(ctx, seed, SR.checkSearch({ ...base, fuse, co: true }));
  const order = res.files.map((f) => f.path.split('/').pop());
  ok(JSON.stringify(order) === JSON.stringify(['router.py', 'co.py', 'other.py']), fuse + ': file order router, co, other (got ' + order.join(',') + ')');
  const want = fuse === 'rrf' ? [1 / 61, 1 / 61, 1 / 62] : [1, 1, 0.5];
  ok(res.files.every((f, k) => Math.abs(f.score - want[k]) < 1e-12), fuse + ': scores ' + want.map((x) => x.toFixed(6)).join(', '));
  ok(res.ledger.n === 3 && res.ledger.lookups[2].label === 'git log co-change ' + seed.path, fuse + ': 3 lookups, the third the git log');
  ok(res.ledger.lookups[2].tokens === L.tokens('2 backend/app/features/y/co.py\n1 backend/app/features/y/other.py'), fuse + ': git log tokens = its two "count path" lines');
  const rk = SR.toRanked(ctx, res, seed, [ctx.fileId.get(seed.path), seedDef.i]);
  const coRow = rk.find((x) => x.i === ctx.fileId.get('backend/app/features/y/co.py'));
  ok(coRow && coRow.via[0] === 'L3' && coRow.hop === 1, fuse + ': co.py reached by lookup L3 in round 1');
}
// without the new fields the search behaves as in stage 1 (no git log lookup)
const r0 = SR.search(ctx, seed, SR.checkSearch({ ...base }));
ok(r0.ledger.n === 2 && r0.files.map((f) => f.path.split('/').pop()).join(',') === 'router.py', 'defaults (fuse sum, co off): 2 lookups, router only');
console.log('handcheck: ' + n + ' of ' + n + ' passed');
