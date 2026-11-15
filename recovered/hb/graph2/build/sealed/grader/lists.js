'use strict';
// Print every arm's stage-1 list (name, hash, extension flag, compact configuration) without logging.
//   node lists.js [arm,...]
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms', 'common', 'harness'));
const C = require(path.join(B, 'arms', 'common', 'config'));
const arms = (process.argv[2] || 'relational,search,ladybug,duckpgq,floor-dir,floor-co').split(',');
const out = {};
for (const arm of arms) {
  const L = H.loadArmList(arm, 1, false);
  out[arm] = { hash: L.hash, n: L.list.length, list: L.list.map((x) => ({ name: x.name, hash: x.hash, ext: C.isExtension ? C.isExtension(x.cfg) : null, cfg: x.cfg })) };
}
if (process.argv[3] === '--json') console.log(JSON.stringify(out));
else for (const arm of arms) {
  console.log('== ' + arm + ' list ' + out[arm].hash + ' n=' + out[arm].n);
  for (const x of out[arm].list) { const c = { ...x.cfg }; console.log((x.ext ? 'X ' : '  ') + x.hash + ' ' + x.name + '  ' + JSON.stringify(c)); }
}
