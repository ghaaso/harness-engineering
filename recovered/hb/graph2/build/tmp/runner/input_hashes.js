'use strict';
// Re-audit 3: sha256 of the held-out run's inputs as they stand at this audit, so anyone can check later
// that they did not change before or during the run (the lock hashes code only, not inputs):
// tasks/tasks.jsonl, tasks/tq_questions.jsonl, tasks/parents.txt, and per held-out parent (plus the frozen
// commit) a digest over every file of facts/cache/<sha>/ (sorted "name sha256" lines), plus one digest of all.
// usage: node input_hashes.js <build> <out.json>     (re-run and diff the JSON to verify)
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const B = process.argv[2];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const parents = [...new Set(tasks.filter((t) => t.split !== 'tune' && t.set !== 'T5').map((t) => t.parent)), 'a31924a3818f4ac94b695906d107c72c912792b2'].sort();
const out = { files: {}, facts: {} };
for (const f of ['tasks/tasks.jsonl', 'tasks/tq_questions.jsonl', 'tasks/parents.txt']) out.files[f] = sha(fs.readFileSync(path.join(B, f)));
function dirDigest(d) {
  const rows = [];
  (function walk(x, rel) { for (const f of fs.readdirSync(x).sort()) { const p = path.join(x, f); if (fs.statSync(p).isDirectory()) walk(p, rel + f + '/'); else rows.push(rel + f + ' ' + sha(fs.readFileSync(p))); } })(d, '');
  return { n: rows.length, digest: sha(rows.join('\n')) };
}
for (const p of parents) out.facts[p] = dirDigest(path.join(B, 'facts', 'cache', p));
out.parents = parents.length;
out.all = sha(JSON.stringify([out.files, out.facts]));
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ parents: out.parents, all: out.all, files: out.files }));
