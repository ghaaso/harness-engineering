import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').pop());
console.log(`${r.id} ${r.part||''}: ${r.states} states, complete=${r.complete} ${r.bounded_why||''}`);
const only = process.argv[3] ? process.argv[3].split(',') : null;
for (const [p, v] of Object.entries(r.props)) { if (only && !only.includes(p)) continue; console.log(`  ${p}: ${v.holds === false ? 'FAILS ' + v.trace.length : v.holds}`); if (v.trace && only) v.trace.forEach((l, i) => console.log(`     ${i + 1}. ${l}`)); }
for (const [p, v] of Object.entries(r.diag || {})) { if (only && !only.includes(p)) continue; console.log(`  ${p}: ${v.reached ? 'reached ' + v.trace.length : v}`); if (v.trace && only) v.trace.forEach((l, i) => console.log(`     ${i + 1}. ${l}`)); }
