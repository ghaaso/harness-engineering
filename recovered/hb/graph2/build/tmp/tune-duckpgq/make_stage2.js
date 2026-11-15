'use strict';
// Writes arms/duckpgq/stage2.json: the 20 stage-2 configurations of the DuckDB/DuckPGQ arm, built from
// the arm's own BASE (= the relational BASE) so that every field is explicit. Run from the build root:
//   node tmp/tune-duckpgq/make_stage2.js
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..');
const L = require(path.join(B, 'arms/duckpgq/sweep.js'));
const C = require(path.join(B, 'arms/common/config.js'));
const BASE = L.BASE;
const v = (name, patch) => ({ name, ...JSON.parse(JSON.stringify(BASE)), ...patch });
const PPR = { mode: 'ppr', restart: 0.30, cochange_w: 1 };
const H3 = { traversal: { mode: 'khop', hops: 3 } };
const H4 = { traversal: { mode: 'khop', hops: 4 } };
const HN = { traversal: { mode: 'khop', hops: null } };

const STAGE2 = [
  // reach x padding
  v('s2: hops=3 + pad=CO', { ...H3, pad: 'CO' }),
  v('s2: hops=4 + pad=CO', { ...H4, pad: 'CO' }),
  v('s2: hops=null + pad=CO', { ...HN, pad: 'CO' }),
  // ranking at hops=3 (the reach already fills 8,000 tokens, so the order decides the cut)
  v('s2: hops=3 + rank=degnorm', { ...H3, rank: { mode: 'degnorm' } }),
  v('s2: hops=3 + rank=cochange', { ...H3, rank: { mode: 'cochange' } }),
  v('s2: hops=3 + rank=ppr r0.50', { ...H3, rank: { ...PPR, restart: 0.50 } }),
  v('s2: hops=3 + rank=hybrid ppr+text', { ...H3, rank: { mode: 'hybrid', parts: [PPR, { mode: 'text' }] } }),
  v('s2: hops=3 + rank=cochange + pad=CO', { ...H3, rank: { mode: 'cochange' }, pad: 'CO' }),
  // ranking at hops=null (the stage-1 best: reach is far beyond 8,000 tokens)
  v('s2: hops=null + rank=bfs', { ...HN, rank: { mode: 'bfs' } }),
  v('s2: hops=null + rank=degnorm', { ...HN, rank: { mode: 'degnorm' } }),
  v('s2: hops=null + rank=cochange', { ...HN, rank: { mode: 'cochange' } }),
  v('s2: hops=null + rank=ppr r0.50', { ...HN, rank: { ...PPR, restart: 0.50 } }),
  v('s2: hops=null + rank=hybrid ppr+cochange', { ...HN, rank: { mode: 'hybrid', parts: [PPR, { mode: 'cochange' }] } }),
  v('s2: hops=null + rank=hybrid ppr+text', { ...HN, rank: { mode: 'hybrid', parts: [PPR, { mode: 'text' }] } }),
  // hub cuts at hops=null
  v('s2: hops=null + hub=transport', { ...HN, hub: { mode: 'transport' } }),
  v('s2: hops=null + hub=indeg>10', { ...HN, hub: { mode: 'indeg', k: 10 } }),
  v('s2: hops=null + hub=indeg>15', { ...HN, hub: { mode: 'indeg', k: 15 } }),
  // granularity at hops=null
  v('s2: hops=null + gran=symbol', { ...HN, granularity: 'symbol' }),
  // the engine's native rankings at hops=null
  v('s2: native: hops=null + rank=x_wsp', { ...HN, rank: { mode: 'x_wsp' } }),
  v('s2: native: hops=null + rank=ppr lifted by pagerank^0.5', { ...HN, rank: { mode: 'x_ppr_lift', restart: 0.30, cochange_w: 1, beta: 0.5 } }),
];
// complexity as in protocol addendum 3 item 10 (the arm's own complexity() in sweep.js predates it)
function cx3(c) {
  const rk = c.rank; const parts = rk.mode === 'hybrid' ? rk.parts : [rk]; const tr = c.traversal;
  let x = parts.length;
  if (tr.mode === 'budget' || tr.mode === 'metapath') x += 1;
  if (tr.hops == null || tr.hops > 3) x += 1;
  if (c.hub.mode !== 'none') x += 1;
  if (c.pad !== 'none') x += 1;
  if (c.granularity === 'symbol') x += 1;
  if (String(tr.mode).startsWith('x_') || parts.some((p) => String(p.mode).startsWith('x_') || p.variant)) x += 1;
  return x;
}
if (STAGE2.length !== 20) throw new Error('stage 2 has ' + STAGE2.length);
const s1 = new Map(L.STAGE1.map((c) => [C.configHash(c), c.name]));
const seen = new Set();
for (const c of STAGE2) {
  C.normalise(c); const h = C.configHash(c);
  if (s1.has(h)) throw new Error(c.name + ' repeats stage-1 ' + s1.get(h));
  if (seen.has(h)) throw new Error(c.name + ' duplicate'); seen.add(h);
  console.log(h, 'cx', cx3(C.normalise(c)), c.name);
}
fs.writeFileSync(path.join(B, 'arms/duckpgq/stage2.json'), JSON.stringify(STAGE2, null, 1) + '\n');
console.log('wrote 20');
