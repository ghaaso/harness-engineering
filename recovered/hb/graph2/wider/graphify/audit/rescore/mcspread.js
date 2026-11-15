'use strict';
// Monte Carlo spread of the bootstrap interval ends for the cases where my interval differs from the grader's by > 0.005.
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/heldout_tasks.json'), 'utf8'));
const cases = [
  ['G-2 mobile', 'search', 'T1', (r) => r.rt === 'mobile', [0.0382, 0.215]],
  ['G-3 mobile', 'floor-co', 'T1', (r) => r.rt === 'mobile', [0.0351, 0.2253]],
  ['G-2 web', 'search', 'T1', (r) => r.rt === 'web', [-0.3281, 0.0699]],
  ['G-3 web', 'floor-co', 'T1', (r) => r.rt === 'web', [-0.3543, 0.0735]],
  ['G-4 web', 'floor-dir', 'T1', (r) => r.rt === 'web', [-0.4282, -0.1043]],
  ['G-4 T3', 'floor-dir', 'T3', null, [-0.0067, 0.415]],
  ['G-1 T1', 'relational', 'T1', null, [-0.1881, -0.0879]],
];
const out = [];
for (const [name, b, set, fl, gr] of cases) {
  const p = L.paired(rows['graphify/' + set], rows[b + '/' + set], 'r8000', 'cluster', fl);
  const ends = []; for (let s = 1; s <= 20; s++) ends.push(L.boot(p.d, 1000 + s, 10000));
  const lo = ends.map((e) => e[0]); const hi = ends.map((e) => e[1]);
  const big = L.boot(p.d, 7, 400000);
  out.push({ name, clusters: p.clusters, diff: L.r4(p.diff), grader: gr, ref400k: big.map(L.r4),
    lo_range_20seeds: [L.r4(Math.min(...lo)), L.r4(Math.max(...lo))], hi_range_20seeds: [L.r4(Math.min(...hi)), L.r4(Math.max(...hi))],
    grader_within_mc_range: gr[0] >= Math.min(...lo) - 0.001 && gr[0] <= Math.max(...lo) + 0.001 && gr[1] >= Math.min(...hi) - 0.001 && gr[1] <= Math.max(...hi) + 0.001 });
}
fs.writeFileSync(path.join(__dirname, 'out/mcspread.json'), JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
