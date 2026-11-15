'use strict';
// Stage-1 sweep list of the DuckDB + DuckPGQ graph arm (protocol addendum 2, C.10 and E): exactly 40
// configurations, one factor at a time around a BASE equal to the relational BASE, written before any
// score was seen (this arm receives no scores). 33 entries are specified algorithms (shared factors,
// traversal modes, rank modes, hub cuts, output forms, three ordered metapaths); 7 are the engine's native
// options (revised 2026-11-12 evening for addendum 3: x_wsp follows the LadybugDB definition, A.2, and the
// two own metapaths are ordinary specified metapaths, not native modes; configuration hashes of the
// metapaths are unchanged, their names changed):
//   - a native PageRank variant (DuckPGQ pagerank(): global teleport, damping 0.85, unweighted) and a
//     PPR lifted by it (x_ppr_lift);
//   - weighted shortest path x_wsp with the LadybugDB definition and class-cost table (cost of an arc =
//     class cost / max(confidence, 0.05); a hub-blocked node is never passed through), the same with
//     per-kind costs B for the kinds B names, and a hybrid of PPR with x_wsp;
//   - a community prior from the native weakly_connected_component() over a hub-free projection
//     (x_wcc_prior; DuckPGQ has no Louvain/Leiden, and WCC is deterministic, so no seed or spread);
//   - a PageRank hub cut (x_khop_prcut: the top-N nodes by native pagerank() are reached but not
//     expanded; DuckPGQ has no core-number routine, so this is the native stand-in for a k-core cut).
// Two own ordered metapaths (SPEC 6.3, cross-checkable against the reference arm), run as fixed-length
// typed path patterns over the stored graph.
// Left out (judged least informative before any score, all still run in the cross-check because the
// relational list holds them): hops=6, budget=B2, the 2-, 4- and 5-class ladder steps,
// classes=base+capability+docs+membership, hybrid bfs+cochange+text, gran=symbol with a form.
const RS = require('../relational/sweep');
const { CODE, METAPATH } = RS;
const BASE = JSON.parse(JSON.stringify(RS.BASE));
const v = (name, patch) => ({ ...JSON.parse(JSON.stringify(BASE)), ...patch, name });

// per-kind cost numerators (divided by max(confidence, 0.05) like the class costs); other kinds keep their class cost
const KIND_COSTS_B = { defines: 0.5, calls: 1, calls_url: 1, registers_route: 1, test_calls_route: 1, co_changed: 1,
  reads_table: 1.5, writes_table: 1.5, writes_column: 1.5, imports: 2, uses_constant: 3, migration_follows: 4, mentions: 4 };
const PPR = { mode: 'ppr', restart: 0.30, cochange_w: 1 };

// own metapath 1: the seed file's definitions, at most one call/import hop, then one or two HTTP edges
// (client -> route -> handler across runtimes), then at most one call/import hop on the far side
const MP_HTTP = { mode: 'metapath', hops: null, emit: 'all', steps: [
  { classes: ['structure'], dir: 'out', min: 0, max: 1 },
  { classes: ['imports', 'calls'], dir: 'both', min: 0, max: 1 },
  { classes: ['http'], dir: 'both', min: 1, max: 2 },
  { classes: ['imports', 'calls'], dir: 'both', min: 0, max: 1 },
] };
// own metapath 2: definitions, exactly one code edge, then optionally one co-change edge
const MP_HIST = { mode: 'metapath', hops: null, emit: 'all', steps: [
  { classes: ['structure'], dir: 'out', min: 0, max: 1 },
  { classes: ['imports', 'calls', 'http', 'data', 'config'], dir: 'both', min: 1, max: 1 },
  { classes: ['history'], dir: 'both', min: 0, max: 1 },
] };

const STAGE1 = [
  v('base', {}),
  ...[1, 3, 4, null].map((h) => v('hops=' + h, { traversal: { mode: 'khop', hops: h } })),
  v('budget=B1', { traversal: { mode: 'budget', hops: null, budgets: { structure: 1, imports: 2, calls: 3, http: 1, tests: 1, data: 1, config: 1, history: 1 } } }),
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
  v('rank=ppr r0.15', { rank: { ...PPR, restart: 0.15 } }),
  v('rank=ppr r0.50', { rank: { ...PPR, restart: 0.50 } }),
  v('rank=ppr w3', { rank: { ...PPR, cochange_w: 3 } }),
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
  // native options of the engine
  v('native: rank=pagerank (duckpgq global)', { rank: { ...PPR, variant: 'duckpgq_global' } }),
  v('native: rank=ppr lifted by pagerank^0.5', { rank: { mode: 'x_ppr_lift', restart: 0.30, cochange_w: 1, beta: 0.5 } }),
  v('native: rank=x_wsp (LadybugDB class costs)', { rank: { mode: 'x_wsp' } }),
  v('native: rank=x_wsp, kind costs B', { rank: { mode: 'x_wsp', kindCosts: KIND_COSTS_B } }),
  v('native: rank=hybrid ppr+x_wsp', { rank: { mode: 'hybrid', parts: [PPR, { mode: 'x_wsp' }] } }),
  // parameters chosen from component sizes alone (probe8 on the frozen-commit graph, no score): every
  // class set and hub cut leaves one giant component; calls+http+data with in-degree > 3 cut is the
  // most fragmented (largest component 2,573 of 5,464 nodes), so the prior separates the most
  v('native: rank=ppr + wcc community prior', { rank: { mode: 'x_wcc_prior', k: 3, classes: ['calls', 'http', 'data'], ppr: PPR } }),
  v('native: hub=pagerank top 50 not expanded', { traversal: { mode: 'x_khop_prcut', hops: 2, top: 50 } }),
  v('metapath=defs>code0-1>http1-2>code0-1', { traversal: MP_HTTP }),
  v('metapath=defs>code1>history0-1', { traversal: MP_HIST }),
];
if (STAGE1.length !== 40) throw new Error('duckpgq stage-1 list has ' + STAGE1.length + ' entries, not 40');

// "Simplest configuration within one standard error" (addendum 2, C.9): the relational measure, with a
// native extension counted as one more moving part.
function complexity(c) {
  const ext = (m) => typeof m === 'string' && m.startsWith('x_');
  const rk = c.rank || {}; const parts = rk.mode === 'hybrid' ? rk.parts : [rk];
  let x = RS.complexity({ ...c, traversal: ext((c.traversal || {}).mode) ? { mode: 'khop', hops: c.traversal.hops } : c.traversal,
    rank: ext(rk.mode) ? { mode: 'ppr' } : rk });
  if (ext((c.traversal || {}).mode)) x += 1;
  if (parts.some((p) => ext(p.mode) || p.variant)) x += 1;
  return x;
}

module.exports = { BASE, STAGE1, KIND_COSTS_B, MP_HTTP, MP_HIST, complexity };
