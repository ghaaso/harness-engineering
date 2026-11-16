const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const f = process.argv[2];
const path = process.argv[3] || '';
const depth = +(process.argv[4] || 1);
let j = JSON.parse(fs.readFileSync(L + f, 'utf8'));
for (const k of path.split('.').filter(Boolean)) j = j[k];
function show(o, d, ind) {
  if (o === null || typeof o !== 'object') { return JSON.stringify(o).slice(0, 300); }
  if (d <= 0) return Array.isArray(o) ? `[array ${o.length}]` : `{${Object.keys(o).slice(0, 40).join(',')}${Object.keys(o).length > 40 ? ',...' + Object.keys(o).length : ''}}`;
  const out = [];
  const keys = Array.isArray(o) ? o.map((_, i) => i).slice(0, 20) : Object.keys(o);
  for (const k of keys) out.push(ind + k + ': ' + show(o[k], d - 1, ind + '  '));
  return '\n' + out.join('\n');
}
console.log(show(j, depth, ''));
