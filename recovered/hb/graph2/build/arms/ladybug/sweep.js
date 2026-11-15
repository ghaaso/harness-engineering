'use strict';
// Stage-1 sweep list of the LadybugDB graph arm (protocol addendum 2, C.10): exactly 40 configurations
// (the harness refuses any other size; base is entry 1), one factor at a time around BASE, written on
// 2026-11-12 before any score was seen. BASE is the relational arm's BASE unchanged, so the shared
// factors move from the same point in every arm.
// Shared factors (addendum 2 B.7 and D.15): pad (none | DIR | CO) and minConf (default 0.5).
// Engine-native modes (SPEC 9.4; definitions in NOTES.md):
//   rank ppr variant "gds"        native GDS_PPR personalised PageRank (undirected, unweighted)
//   rank x_wsp                    native weighted shortest path WSHORTEST(cost), cost per edge class
//   rank hybrid ppr + x_wsp       RRF of the base PageRank and the weighted-shortest-path score
//   rank hybrid ppr + x_comm      RRF of the base PageRank and native Louvain community of a seed
//   rank hybrid ppr + x_prank     RRF of the base PageRank and native global page_rank
//   traversal x_core k            khop 2 with the hub cut "core number > k" (native k-core)
//   traversal metapath "pattern"  a metapath run as native typed path patterns
// Left out of this list, each with its reason in NOTES.md: the "pattern" form of the shared metapath
// and the in-engine PageRank iterations (both cross-checked equal to the specified algorithm, so the
// scores cannot differ), Leiden / label propagation / Katz / betweenness / closeness / eigenvector /
// node2vec (GDS one-table undirected forms; no question here needs them before scores are known).
// Cuts against the relational list to make room for the 7 native entries, judged before any score:
// hops=6 (between 4 and null), classes ladder steps 2 / 4 / 5 (the 3-class step kept as the short
// ladder), classes +membership, rank hybrid bfs+cochange+text, gran=symbol form=paths and
// gran=symbol form=snippet (granularity and form each still move alone).
const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config'];
const BASE = {
  granularity: 'file', form: 'signature', pad: 'none', minConf: 0.5,
  direction: 'both', classes: [...CODE, 'history'],
  traversal: { mode: 'khop', hops: 2 }, hub: { mode: 'none' },
  rank: { mode: 'ppr', restart: 0.30, cochange_w: 1 },
};
const PPR = BASE.rank;
const v = (name, patch) => ({ ...JSON.parse(JSON.stringify(BASE)), ...patch, name });

// the shared ordered metapath (the relational arm's METAPATH)
const METAPATH = {
  mode: 'metapath', hops: null, emit: 'all', steps: [
    { classes: ['structure'], dir: 'out', min: 0, max: 1 },
    { classes: ['imports', 'calls', 'http', 'data', 'config'], dir: 'both', min: 1, max: 2 },
    { classes: ['tests'], dir: 'in', min: 0, max: 1 },
  ],
};
// the native path-pattern metapath: who depends on the seed (one to three incoming code edges), then
// the tests of what was reached; run as typed path patterns over the per-kind tables
const METAPATH_IN = {
  mode: 'metapath', hops: null, emit: 'all', variant: 'pattern', steps: [
    { classes: ['structure'], dir: 'out', min: 0, max: 1 },
    { classes: ['imports', 'calls', 'http', 'data', 'config'], dir: 'in', min: 1, max: 3 },
    { classes: ['tests'], dir: 'in', min: 0, max: 1 },
  ],
};

const STAGE1 = [
  v('base', {}),
  ...[1, 3, 4, null].map((h) => v('hops=' + h, { traversal: { mode: 'khop', hops: h } })),
  v('budget=B1', { traversal: { mode: 'budget', hops: null, budgets: { structure: 1, imports: 2, calls: 3, http: 1, tests: 1, data: 1, config: 1, history: 1 } } }),
  v('budget=B2', { traversal: { mode: 'budget', hops: null, budgets: { structure: 2, imports: 1, calls: 2, http: 2, tests: 1, data: 2, config: 2, history: 1 } } }),
  v('metapath=defs>code1-2>tests', { traversal: METAPATH }),
  v('dir=dependents', { direction: 'dependents' }),
  v('dir=dependencies', { direction: 'dependencies' }),
  v('classes=structure+imports+calls', { classes: CODE.slice(0, 3) }),
  v('classes=code (no history)', { classes: [...CODE] }),
  v('classes=base+capability', { classes: [...CODE, 'history', 'capability'] }),
  v('classes=base+capability+docs', { classes: [...CODE, 'history', 'capability', 'docs'] }),
  v('minConf=0', { minConf: 0 }),
  v('minConf=1', { minConf: 1 }),
  v('rank=bfs', { rank: { mode: 'bfs' } }),
  v('rank=degnorm', { rank: { mode: 'degnorm' } }),
  v('rank=ppr r0.15', { rank: { mode: 'ppr', restart: 0.15, cochange_w: 1 } }),
  v('rank=ppr r0.50', { rank: { mode: 'ppr', restart: 0.50, cochange_w: 1 } }),
  v('rank=ppr w3', { rank: { mode: 'ppr', restart: 0.30, cochange_w: 3 } }),
  v('rank=cochange', { rank: { mode: 'cochange' } }),
  v('rank=text', { rank: { mode: 'text' } }),
  v('rank=hybrid ppr+text', { rank: { mode: 'hybrid', parts: [PPR, { mode: 'text' }] } }),
  ...[5, 10].map((k) => v('hub=indeg>' + k, { hub: { mode: 'indeg', k } })),
  v('hub=transport', { hub: { mode: 'transport' } }),
  v('pad=DIR', { pad: 'DIR' }),
  v('pad=CO', { pad: 'CO' }),
  v('gran=symbol', { granularity: 'symbol' }),
  v('form=paths', { form: 'paths' }),
  v('form=snippet', { form: 'snippet' }),
  // engine-native modes
  v('native rank=ppr gds', { rank: { mode: 'ppr', restart: 0.30, cochange_w: 1, variant: 'gds' } }),
  v('native rank=x_wsp', { rank: { mode: 'x_wsp' } }),
  v('native rank=hybrid ppr+x_wsp', { rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_wsp' }] } }),
  v('native rank=hybrid ppr+x_comm', { rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_comm' }] } }),
  v('native rank=hybrid ppr+x_prank', { rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_prank' }] } }),
  v('native traversal=x_core k4', { traversal: { mode: 'x_core', hops: 2, k: 4 } }),
  v('native traversal=x_core k6', { traversal: { mode: 'x_core', hops: 2, k: 6 } }),
  v('native metapath=defs>code-in1-3>tests (pattern)', { traversal: METAPATH_IN }),
];
if (STAGE1.length !== 40) throw new Error('ladybug stage-1 list has ' + STAGE1.length + ' entries, not 40');

// "Simplest configuration within one standard error" (addendum 2, C.9): the relational arm's measure,
// with each engine-native mode counted as one more moving part than the specified mode it extends.
function complexity(c) {
  const tr = c.traversal || {};
  let x = 0;
  x += tr.mode === 'khop' ? (tr.hops == null ? 3 : tr.hops / 2) : tr.mode === 'x_core' ? (tr.hops == null ? 3 : tr.hops / 2) + 1 : tr.mode === 'budget' ? 3 : 3.5;
  if (tr.variant) x += 1;
  x += (c.classes || []).length / 4;
  x += c.direction === 'both' ? 0.5 : 0;
  x += c.hub && c.hub.mode !== 'none' ? 1 : 0;
  const rk = c.rank || {};
  const base = { bfs: 0, cochange: 0.5, text: 0.5, degnorm: 1, ppr: 1.5, hybrid: 2.5, x_wsp: 2, x_comm: 2, x_prank: 2 };
  x += base[rk.mode] || 0;
  if (rk.variant) x += 1;
  if (rk.mode === 'hybrid' && rk.parts.some((p) => /^x_/.test(p.mode) || p.variant)) x += 1;
  x += c.pad && c.pad !== 'none' ? 0.5 : 0;
  x += c.granularity === 'symbol' ? 0.5 : 0;
  return x;
}

module.exports = { BASE, STAGE1, CODE, METAPATH, METAPATH_IN, complexity };
