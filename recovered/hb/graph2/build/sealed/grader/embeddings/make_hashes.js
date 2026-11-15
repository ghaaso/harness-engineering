'use strict';
// Writes HASHES.txt: "<sha256>  <path>" for every code and test file of this folder (.py, .js, .sh), sorted by
// path; outputs (work/, test-out/, logs/, truth/*.jsonl, *.json) are not listed. Host: node make_hashes.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HERE = __dirname;
const SKIP = new Set(['work', 'test-out', 'logs', '__pycache__']);
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!SKIP.has(f.name)) walk(p); continue; }
    if (!/\.(py|js|sh)$/.test(f.name)) continue;
    out.push(path.relative(HERE, p).split(path.sep).join('/'));
  }
})(HERE);
out.sort();
const lines = out.map((r) => crypto.createHash('sha256').update(fs.readFileSync(path.join(HERE, r))).digest('hex') + '  ' + r);
fs.writeFileSync(path.join(HERE, 'HASHES.txt'), lines.join('\n') + '\n');
console.log(lines.length + ' files; HASHES.txt sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(path.join(HERE, 'HASHES.txt'))).digest('hex'));
