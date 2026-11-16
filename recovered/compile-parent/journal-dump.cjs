// Dumps reader-test results from a workflow journal into a readable text file.
// Usage: node journal-dump.cjs <journal.jsonl> <out.txt>
'use strict';
const fs = require('fs');
const [, , jp, op] = process.argv;
const L = fs.readFileSync(jp, 'utf8').trim().split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const started = L.filter(j => j.type === 'started').map(j => j.label);
const byKey = {};
L.filter(j => j.type === 'started').forEach(j => { byKey[j.key] = j.label; });
const results = L.filter(j => j.type === 'result');
let out = '';
let n = 0;
results.forEach((j, k) => {
  const r = j.result || {};
  const label = byKey[j.key] || r.file || ('result ' + k);
  out += `\n==================== ${label} (${(r.findings || []).length} findings)\n`;
  (r.findings || []).forEach(f => {
    n += 1;
    out += `\n[${n}] ${f.kind}\n  Q: ${f.quote}\n  P: ${f.problem}\n  F: ${f.fix}\n`;
  });
  if (r.notes) out += `\nNOTES: ${r.notes}\n`;
});
fs.writeFileSync(op, out);
console.log('started', started.length, 'results', results.length, 'findings', n);
console.log(Object.keys(L[L.length - 1]).join(','));
