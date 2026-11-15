'use strict';
// Writes arms/ladybug/stage2.json (exactly 20) around the stage-1 best "hops=null" (khop unbounded,
// PPR r0.30 w1, file granularity, signature form, no padding, no hub cut). Run on the host:
//   node tmp/tune-ladybug/gen_stage2.js
const fs = require('fs');
const path = require('path');
const ARM = path.join(__dirname, '..', '..', 'arms', 'ladybug');
const { BASE } = require(path.join(ARM, 'sweep.js'));
const PPR = { mode: 'ppr', restart: 0.30, cochange_w: 1 };
const N = { mode: 'khop', hops: null };
const v = (name, patch) => ({ name, ...JSON.parse(JSON.stringify(BASE)), traversal: N, ...patch });
const hyb = (...parts) => ({ mode: 'hybrid', parts });

const S2 = [
  // padding x hop limit
  v('s2 hops=null pad=CO', { pad: 'CO' }),
  v('s2 hops=null pad=DIR', { pad: 'DIR' }),
  v('s2 hops=3 pad=CO', { traversal: { mode: 'khop', hops: 3 }, pad: 'CO' }),
  v('s2 hops=3 pad=DIR', { traversal: { mode: 'khop', hops: 3 }, pad: 'DIR' }),
  v('s2 hops=4 pad=CO', { traversal: { mode: 'khop', hops: 4 }, pad: 'CO' }),
  // ranking under the unbounded reach (where the order decides what fits in 8,000 tokens)
  v('s2 hops=null rank=ppr r0.50', { rank: { mode: 'ppr', restart: 0.50, cochange_w: 1 } }),
  v('s2 hops=null rank=ppr w3', { rank: { mode: 'ppr', restart: 0.30, cochange_w: 3 } }),
  v('s2 hops=null rank=degnorm', { rank: { mode: 'degnorm' } }),
  v('s2 hops=null rank=cochange', { rank: { mode: 'cochange' } }),
  v('s2 hops=null rank=hybrid ppr+text', { rank: hyb(PPR, { mode: 'text' }) }),
  v('s2 hops=null rank=hybrid ppr+cochange', { rank: hyb(PPR, { mode: 'cochange' }) }),
  v('s2 hops=null native rank=x_wsp', { rank: { mode: 'x_wsp' } }),
  v('s2 hops=null native rank=hybrid ppr+x_wsp', { rank: hyb(PPR, { mode: 'x_wsp' }) }),
  v('s2 hops=null native rank=hybrid ppr+x_comm', { rank: hyb(PPR, { mode: 'x_comm' }) }),
  // hub cut x unbounded reach (x padding)
  v('s2 hops=null hub=transport', { hub: { mode: 'transport' } }),
  v('s2 hops=null hub=indeg>10 pad=CO', { hub: { mode: 'indeg', k: 10 }, pad: 'CO' }),
  v('s2 native traversal=x_core k6 hops=null', { traversal: { mode: 'x_core', hops: null, k: 6 } }),
  // granularity, classes, and the two strongest ingredients together
  v('s2 hops=null gran=symbol', { granularity: 'symbol' }),
  v('s2 hops=null classes=base+capability+docs', { classes: [...BASE.classes, 'capability', 'docs'] }),
  v('s2 hops=null rank=hybrid ppr+text pad=CO', { rank: hyb(PPR, { mode: 'text' }), pad: 'CO' }),
];
if (S2.length !== 20) throw new Error('need 20, have ' + S2.length);
fs.writeFileSync(path.join(ARM, 'stage2.json'), JSON.stringify(S2, null, 1) + '\n');
// validate through the harness (sizes, unique names and configurations, no repeat of stage 1); no log
const H = require(path.join(ARM, '..', 'common', 'harness.js'));
const C = require(path.join(ARM, '..', 'common', 'config.js'));
const L = H.loadArmList('ladybug', 2, false);
for (const x of L.list) console.log(x.hash, C.isExtension(x.cfg) ? 'ext ' : 'spec', x.name);
console.log('list hash', L.hash);
