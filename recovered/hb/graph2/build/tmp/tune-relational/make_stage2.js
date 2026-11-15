'use strict';
// Writes arms/relational/stage2.json (exactly 20) and its mirror arms/reference/stage2.json (identical
// file; the reference arm refuses the one x_ entry, which a shared sweep runs on relational only).
// U = the stage-1 base with unbounded hops (the stage-1 best on T1 TUNE).
const fs = require('fs');
const path = require('path');
const ARMS = path.join(__dirname, '..', '..', 'arms');
const C = require(path.join(ARMS, 'common', 'config'));
const { BASE, CODE } = require(path.join(ARMS, 'relational', 'sweep'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const U = { ...clone(BASE), traversal: { mode: 'khop', hops: null } };
const v = (name, from, patch) => ({ ...clone(from), ...patch, name: 's2: ' + name });
const PPR = { mode: 'ppr', restart: 0.30, cochange_w: 1 };
const MEMB = [...CODE, 'history', 'membership'];
const CDM = [...CODE, 'history', 'capability', 'docs', 'membership'];
const kh = (h) => ({ traversal: { mode: 'khop', hops: h } });

const LIST = [
  v('hops=null rank=cochange', U, { rank: { mode: 'cochange' } }),
  v('hops=null rank=degnorm', U, { rank: { mode: 'degnorm' } }),
  v('hops=null rank=ppr r0.50', U, { rank: { ...PPR, restart: 0.50 } }),
  v('hops=null rank=ppr w3', U, { rank: { ...PPR, cochange_w: 3 } }),
  v('hops=null rank=hybrid ppr+cochange', U, { rank: { mode: 'hybrid', parts: [PPR, { mode: 'cochange' }] } }),
  v('hops=null rank=hybrid ppr+text', U, { rank: { mode: 'hybrid', parts: [PPR, { mode: 'text' }] } }),
  v('hops=null rank=hybrid degnorm+cochange', U, { rank: { mode: 'hybrid', parts: [{ mode: 'degnorm' }, { mode: 'cochange' }] } }),
  v('hops=null rank=x_wsp (SQL)', U, { rank: { mode: 'x_wsp' } }),
  v('hops=null classes=base+membership', U, { classes: MEMB }),
  v('hops=null classes=base+capability+docs+membership', U, { classes: CDM }),
  v('hops=null minConf=0', U, { minConf: 0 }),
  v('hops=null hub=transport', U, { hub: { mode: 'transport' } }),
  v('hops=null hub=indeg>15', U, { hub: { mode: 'indeg', k: 15 } }),
  v('hops=null pad=CO', U, { pad: 'CO' }),
  v('hops=null gran=symbol', U, { granularity: 'symbol' }),
  v('hops=3 pad=CO', BASE, { ...kh(3), pad: 'CO' }),
  v('hops=3 rank=cochange', BASE, { ...kh(3), rank: { mode: 'cochange' } }),
  v('hops=4 pad=CO', BASE, { ...kh(4), pad: 'CO' }),
  v('hops=2 classes=base+membership pad=CO', BASE, { classes: MEMB, pad: 'CO' }),
  v('hops=null rank=ppr w3 classes=base+membership', U, { classes: MEMB, rank: { ...PPR, cochange_w: 3 } }),
];
if (LIST.length !== 20) throw new Error('stage-2 list has ' + LIST.length);
const hashes = new Set(LIST.map((c) => C.configHash(C.normalise(c))));
if (hashes.size !== 20) throw new Error('duplicate configuration');
const txt = JSON.stringify(LIST, null, 1) + '\n';
fs.writeFileSync(path.join(ARMS, 'relational', 'stage2.json'), txt);
fs.writeFileSync(path.join(ARMS, 'reference', 'stage2.json'), txt);
for (const c of LIST) console.log(C.configHash(C.normalise(c)), C.isExtension(C.normalise(c)) ? 'EXT' : 'spec', c.name);
