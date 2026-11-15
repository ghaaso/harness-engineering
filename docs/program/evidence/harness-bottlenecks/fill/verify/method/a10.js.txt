const { run } = require('./attr.js'); const K2 = require('./shell2.js');
const recat = (it) => (it.cmd != null && it.cat.startsWith('shell')) ? K2(it.cmd)[0] : it.cat;
const r = run({ recat }); const c = r.cat, t = r.tot; for (const k of Object.keys(c).filter((k) => k.startsWith('shell')).sort()) console.log(k.padEnd(18), (100 * c[k] / t).toFixed(2) + '%');
console.log(JSON.stringify({ fetched: r.fetched, own: r.own, start: r.start, unclassified: r.unclassified, first: r.first, again: r.again }));
// validate against hand labels
const lab = { 'shell-read': { wrong: [12, 19, 24, 26, 30, 32, 38, 41] }, 'shell-other': { read: [5, 8, 11, 15, 21, 35, 42, 52, 57, 59], log: [3, 4, 6, 7, 24, 27, 28, 30, 47, 54, 26, 31, 32, 37, 46, 55] } };
for (const cat of ['shell-read', 'shell-other']) { const s = require('./sample-' + cat + '.json'); const m = {}; s.sample.forEach((p) => { const k = K2(p.cmd)[0]; m[k] = (m[k] || []); m[k].push(p.x); }); console.log(cat, 'sample now:', JSON.stringify(m)); }
