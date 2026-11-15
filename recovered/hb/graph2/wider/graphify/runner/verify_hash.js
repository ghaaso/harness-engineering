'use strict';
// Independent recomputation of the adapter hashes described in FROZEN.json (does not load lib.js).
// adapter_code_hash: sha256 over "<file> <sha256>\n" lines of every .js, .py and .sh file, sorted by name.
// adapter_all_files_sha256: the same over every regular file in the folder (checked as a second view).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = path.resolve(__dirname, '..');
const dir = path.join(G, 'adapter');
const fz = JSON.parse(fs.readFileSync(path.join(G, 'FROZEN.json'), 'utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const all = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
const per = {}; for (const f of all) per[f] = sha(fs.readFileSync(path.join(dir, f)));
const code = all.filter((f) => /\.(js|py|sh)$/.test(f));
const codeHash = sha(code.map((f) => f + ' ' + per[f] + '\n').join(''));
// recipe of grader/freeze.js: recursive walk, sorted relative paths, sha256 over "<path>\0<bytes>" of each
const walk = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d, path.posix.join(rel, e.name)) : [path.posix.join(rel, e.name)]));
const hAll = crypto.createHash('sha256');
for (const f of walk(dir).sort()) { hAll.update(f + '\0'); hAll.update(fs.readFileSync(path.join(dir, f))); }
const allHash = hAll.digest('hex');
const fileMis = Object.keys({ ...per, ...fz.adapter_files }).filter((f) => per[f] !== fz.adapter_files[f]);
const out = { at: new Date().toISOString(), files_in_folder: all, per_file: per,
  adapter_code_hash_now: codeHash, adapter_code_hash_frozen: fz.adapter_code_hash, code_match: codeHash === fz.adapter_code_hash,
  all_files_hash_now: allHash, all_files_hash_frozen: fz.adapter_all_files_sha256, all_match: allHash === fz.adapter_all_files_sha256,
  per_file_mismatches: fileMis };
out.ok = out.code_match && out.all_match && fileMis.length === 0;
console.log(JSON.stringify(out, null, 1));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
process.exit(out.ok ? 0 : 1);
