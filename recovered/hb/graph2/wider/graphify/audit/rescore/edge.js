'use strict';
// Interval ends near zero: precise (400,000 resamples) and spread over 20 seeds of 10,000.
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/heldout_tasks.json'), 'utf8'));
const cases = [['G-2 T1 r2000', 'search', 'T1', 'r2000'], ['G-4 T1x', 'floor-dir', 'T1x', 'r8000'], ['G-3 T1', 'floor-co', 'T1', 'r8000'], ['G-2 T1', 'search', 'T1', 'r8000']];
const out = [];
for (const [n, b, s, m] of cases) {
  const p = L.paired(rows['graphify/' + s], rows[b + '/' + s], m);
  const e = []; for (let k = 1; k <= 20; k++) e.push(L.boot(p.d, 500 + k));
  out.push({ n, diff: L.r4(p.diff), ref400k: L.boot(p.d, 9, 400000).map(L.r4), hi_range: [L.r4(Math.min(...e.map((x) => x[1]))), L.r4(Math.max(...e.map((x) => x[1])))], lo_range: [L.r4(Math.min(...e.map((x) => x[0]))), L.r4(Math.max(...e.map((x) => x[0])))] });
}
fs.writeFileSync(path.join(__dirname, 'out/edge.json'), JSON.stringify(out, null, 1)); for (const o of out) console.log(JSON.stringify(o));
