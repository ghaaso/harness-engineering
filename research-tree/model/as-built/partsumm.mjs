// per-part failing properties of a run-seq result file (MB2b): node partsumm.mjs <file> [Prop]
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const only = process.argv[3];
for (const [k, p] of Object.entries(r.parts)) {
  const f = Object.entries(p.props || {}).filter(([n, v]) => v.holds === false && (!only || n === only)).map(([n, v]) => `${n} ${v.trace.length}`);
  console.log(`${k}: ${p.states} ${p.complete ? 'complete' : 'BOUNDED'} | ${f.join(', ') || 'none fail'}`);
  if (only) for (const [n, v] of Object.entries(p.props || {})) if (n === only && v.holds === false) v.trace.forEach((l, i) => console.log(`   ${i + 1}. ${l.slice(0, 260)}`));
}
