// Prints the verdict table (and with --traces the shortest traces) of run-seq.mjs result files.
//   node model/as-built/summ.mjs [--traces] <file.json>...
import fs from 'node:fs';
const args = process.argv.slice(2); const tr = args.includes('--traces');
for (const f of args.filter((a) => !a.startsWith('--'))) {
  let r; try { r = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(`${f}: unreadable (${e.message})`); continue; }
  console.log(`## ${r.id} (${r.mode}, ${r.parts_done}/${r.parts_total} parts, ${r.complete_parts} complete, ${r.states_sum} states summed)${r.bounded_parts.length ? ' BOUNDED: ' + r.bounded_parts.join(' | ') : ''}`);
  for (const [p, v] of Object.entries(r.props)) console.log(`  ${p}: ${v.holds === true ? 'holds' : v.holds === false ? `FAILS ${v.steps} steps (part ${v.part})` : v.holds}`);
  if (tr) for (const [p, v] of Object.entries(r.props)) if (v.holds === false) { console.log(`  --- ${p}`); v.trace.forEach((l, i) => console.log(`    ${i + 1}. ${l}`)); }
}
