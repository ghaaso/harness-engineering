// node tokens.mjs <unit|run> [--root <transcript folder>]
import fs from 'node:fs';
import path from 'node:path';
import { RUN, tokensByUnit, totalOf, M } from './lib.mjs';

const a = process.argv.slice(2);
let root; const i = a.indexOf('--root'); if (i >= 0) { root = a[i + 1]; a.splice(i, 2); }
const unit = a[0];
if (!unit) { console.log('usage: node tokens.mjs <unit|run> [--root <folder>]'); process.exit(64); }
const units = tokensByUnit(root);
let r, rows = [];
if (unit === 'run') { r = totalOf(units); for (const [k, u] of units) for (const x of u.rows) rows.push({ ...x, label: k + ' ' + x.label }); }
else { const u = units.get(unit); r = u || { calls: 0, total: 0, fresh: 0 }; rows = u ? u.rows : []; }
try {
  fs.mkdirSync(path.join(RUN, 'run'), { recursive: true });
  fs.writeFileSync(path.join(RUN, 'run', `tokens-${unit}.txt`),
    ['calls\ttotal\tfresh\ttranscript', ...rows.map(x => `${x.calls}\t${x.total}\t${x.fresh}\t${x.label}`), `${r.calls}\t${r.total}\t${r.fresh}\tTOTAL`].join('\n') + '\n');
} catch {}
console.log(`${unit} ${r.calls} calls ${M(r.total)} M tokens (${M(r.fresh)} M fresh)`);
