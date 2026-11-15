'use strict';
// Stage-1 sweep list of the relational arm (protocol addendum 2, C.10): exactly 40 configurations, one
// factor at a time around this arm's own BASE, written before any score was seen. The reference arm
// mirrors this list (arms/reference/sweep.js), so the two are compared byte for byte.
// Shared factors (addendum 2 B.7 and D.15): pad (none | DIR | CO) and minConf (default 0.5).
// Removed from the earlier 40-entry list to make room, each judged the least informative of its
// factor before any score: file form=range (its file ranking equals form=paths), hops=5 (between 4
// and 6), hub=indeg>15 (between 10 and none), the 6-class ladder step, ppr cochange_w 0.5 (w 1 and 3
// kept); gran=symbol form=range became gran=symbol form=paths (same ranking, the form the task asks).
const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config'];
const BASE = {
  granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5,
  direction: 'both', classes: [...CODE, 'history'],
  traversal: { mode: 'khop', hops: 2 }, hub: { mode: 'none' },
  rank: { mode: 'ppr', restart: 0.30, cochange_w: 1 },
};
const v = (name, patch) => ({ ...JSON.parse(JSON.stringify(BASE)), ...patch, name });

// Ordered metapath: the seed file's definitions, then one or two code edges in either direction, then
// optionally the tests that point at what was reached. Every reached node is a candidate (emit all).
const METAPATH = {
  mode: 'metapath', hops: null, emit: 'all', steps: [
    { classes: ['structure'], dir: 'out', min: 0, max: 1 },
    { classes: ['imports', 'calls', 'http', 'data', 'config'], dir: 'both', min: 1, max: 2 },
    { classes: ['tests'], dir: 'in', min: 0, max: 1 },
  ],
};

const STAGE1 = [
  v('base', {}),
  ...[1, 3, 4, 6, null].map((h) => v('hops=' + h, { traversal: { mode: 'khop', hops: h } })),
  v('budget=B1', { traversal: { mode: 'budget', hops: null, budgets: { structure: 1, imports: 2, calls: 3, http: 1, tests: 1, data: 1, config: 1, history: 1 } } }),
  v('budget=B2', { traversal: { mode: 'budget', hops: null, budgets: { structure: 2, imports: 1, calls: 2, http: 2, tests: 1, data: 2, config: 2, history: 1 } } }),
  v('metapath=defs>code1-2>tests', { traversal: METAPATH }),
  v('dir=dependents', { direction: 'dependents' }),
  v('dir=dependencies', { direction: 'dependencies' }),
  ...[2, 3, 4, 5, 7].map((n) => v('classes=' + CODE.slice(0, n).join('+'), { classes: CODE.slice(0, n) })),
  v('classes=base+capability', { classes: [...CODE, 'history', 'capability'] }),
  v('classes=base+capability+docs', { classes: [...CODE, 'history', 'capability', 'docs'] }),
  v('classes=base+capability+docs+membership', { classes: [...CODE, 'history', 'capability', 'docs', 'membership'] }),
  v('minConf=0', { minConf: 0 }),
  v('minConf=1', { minConf: 1 }),
  v('rank=bfs', { rank: { mode: 'bfs' } }),
  v('rank=degnorm', { rank: { mode: 'degnorm' } }),
  v('rank=ppr r0.15', { rank: { mode: 'ppr', restart: 0.15, cochange_w: 1 } }),
  v('rank=ppr r0.50', { rank: { mode: 'ppr', restart: 0.50, cochange_w: 1 } }),
  v('rank=ppr w3', { rank: { mode: 'ppr', restart: 0.30, cochange_w: 3 } }),
  v('rank=cochange', { rank: { mode: 'cochange' } }),
  v('rank=text', { rank: { mode: 'text' } }),
  v('rank=hybrid ppr+text', { rank: { mode: 'hybrid', parts: [{ mode: 'ppr', restart: 0.30, cochange_w: 1 }, { mode: 'text' }] } }),
  v('rank=hybrid bfs+cochange+text', { rank: { mode: 'hybrid', parts: [{ mode: 'bfs' }, { mode: 'cochange' }, { mode: 'text' }] } }),
  ...[5, 10].map((k) => v('hub=indeg>' + k, { hub: { mode: 'indeg', k } })),
  v('hub=transport', { hub: { mode: 'transport' } }),
  v('pad=DIR', { pad: 'DIR' }),
  v('pad=CO', { pad: 'CO' }),
  v('gran=symbol', { granularity: 'symbol' }),
  v('form=paths', { form: 'paths' }),
  v('form=snippet', { form: 'snippet' }),
  v('gran=symbol form=paths', { granularity: 'symbol', form: 'paths' }),
  v('gran=symbol form=snippet', { granularity: 'symbol', form: 'snippet' }),
];
if (STAGE1.length !== 40) throw new Error('relational stage-1 list has ' + STAGE1.length + ' entries, not 40');

// "Simplest configuration within one standard error" (addendum 2, C.9): fewer moving parts first.
function complexity(c) {
  const tr = c.traversal || {};
  let x = 0;
  x += tr.mode === 'khop' ? (tr.hops == null ? 3 : tr.hops / 2) : tr.mode === 'budget' ? 3 : 3.5;
  x += (c.classes || []).length / 4;
  x += c.direction === 'both' ? 0.5 : 0;
  x += c.hub && c.hub.mode !== 'none' ? 1 : 0;
  x += { bfs: 0, cochange: 0.5, text: 0.5, degnorm: 1, ppr: 1.5, hybrid: 2.5 }[(c.rank || {}).mode] || 0;
  x += c.pad && c.pad !== 'none' ? 0.5 : 0;
  x += c.granularity === 'symbol' ? 0.5 : 0;
  return x;
}

module.exports = { BASE, STAGE1, CODE, METAPATH, complexity };
