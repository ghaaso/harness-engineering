'use strict';
// Agent A, round r58c (staging completeness): an independent count, NOT train/heldout_inputs.js, of a staged folder:
// for every staged tree (common/srcstore/trees/<P>.json of each facts/<P>), every blob it names must be a file under
// common/srcstore/blobs/ AND be listed in the folder's sha256 manifest with that file's sha256.
// usage: node staging_blobs.js <dir> <dir>.sha256   -> one JSON line {ok, trees, named, present, listed, hash_equal, problems}
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [dir, man] = process.argv.slice(2);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pre = path.basename(path.resolve(dir)) + '/';
const M = new Map();
for (const l of fs.readFileSync(man, 'utf8').split('\n')) { const r = /^([0-9a-f]{64}) [ *](.+)$/.exec(l.replace(/\r$/, '')); if (r) M.set(r[2], r[1]); }
const parents = fs.readdirSync(path.join(dir, 'facts')).sort();
const named = new Set(); const problems = []; let trees = 0;
for (const P of parents) {
  const tf = path.join(dir, 'common', 'srcstore', 'trees', P + '.json');
  if (!fs.existsSync(tf)) { problems.push('no tree for staged parent ' + P.slice(0, 12)); continue; }
  trees++;
  for (const h of Object.values(JSON.parse(fs.readFileSync(tf, 'utf8')))) named.add(h + '.txt');
}
let present = 0, listed = 0, equal = 0;
for (const b of [...named].sort()) {
  const f = path.join(dir, 'common', 'srcstore', 'blobs', b); const rel = pre + 'common/srcstore/blobs/' + b;
  const isf = fs.existsSync(f) && fs.statSync(f).isFile(); if (isf) present++; else problems.push('named blob missing: ' + b);
  if (M.has(rel)) listed++; else problems.push('named blob not in the manifest: ' + b);
  if (isf && M.has(rel) && M.get(rel) === sha(f)) equal++; else if (isf && M.has(rel)) problems.push('named blob differs from its manifest sha256: ' + b);
}
console.log(JSON.stringify({ ok: problems.length === 0 && trees === parents.length && present === named.size && listed === named.size && equal === named.size,
  parents: parents.length, trees, named: named.size, present, listed, hash_equal: equal, problems: problems.slice(0, 5), n_problems: problems.length }));
