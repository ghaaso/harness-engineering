'use strict';
// Grader, graphify held-out, step 0 (before any held-out answer is opened for scoring).
// 1. sha256 and size of every file listed in answers/heldout/INVENTORY.json equal the file on disk;
//    no file on disk under answers/heldout/ that the inventory does not list (except INVENTORY.json itself);
//    INVENTORY.json's own sha256 equals the value the runner printed in RUN.md.
// 2. adapter hashes recomputed independently (both recipes of FROZEN.json) equal FROZEN.json.
// 3. the stored comparator answer files equal build/results/heldout/INVENTORY.json.
// Writes verify_inventory.json here. Exit 1 on any problem.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const A = path.join(G, 'answers', 'heldout');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const problems = [];
const inv = JSON.parse(fs.readFileSync(path.join(A, 'INVENTORY.json'), 'utf8'));
const invSha = sha(fs.readFileSync(path.join(A, 'INVENTORY.json')));
const RUN_MD_INV_SHA = 'be3a2e85c98aa2999b07c93a9dffc01cebfe4c26dda2954c0ee8388250e1468a';
if (invSha !== RUN_MD_INV_SHA) problems.push('INVENTORY.json sha256 ' + invSha + ' differs from RUN.md');
const walk = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d, path.posix.join(rel, e.name)) : [path.posix.join(rel, e.name)]));
const onDisk = walk(A).filter((f) => f !== 'INVENTORY.json').sort();
const listed = new Map(inv.files.map((f) => [f.path, f]));
let checked = 0;
for (const f of inv.files) {
  const p = path.join(A, f.path);
  if (!fs.existsSync(p)) { problems.push('missing ' + f.path); continue; }
  const b = fs.readFileSync(p);
  if (b.length !== f.bytes) problems.push('size ' + f.path);
  if (sha(b) !== f.sha256) problems.push('sha256 ' + f.path);
  checked++;
}
const unlisted = onDisk.filter((f) => !listed.has(f));
for (const f of unlisted) problems.push('not in inventory: ' + f);
if (inv.frozen.config_hash !== '66367cd303fdd75b') problems.push('inventory frozen hash');
// adapter hashes
const fz = JSON.parse(fs.readFileSync(path.join(G, 'FROZEN.json'), 'utf8'));
const dir = path.join(G, 'adapter');
const all = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
const per = {}; for (const f of all) per[f] = sha(fs.readFileSync(path.join(dir, f)));
const codeHash = sha(all.filter((f) => /\.(js|py|sh)$/.test(f)).map((f) => f + ' ' + per[f] + '\n').join(''));
const hAll = crypto.createHash('sha256');
for (const f of walk(dir).sort()) { hAll.update(f + '\0'); hAll.update(fs.readFileSync(path.join(dir, f))); }
const allHash = hAll.digest('hex');
if (codeHash !== fz.adapter_code_hash) problems.push('adapter code hash differs from FROZEN.json');
if (allHash !== fz.adapter_all_files_sha256) problems.push('adapter all-files hash differs from FROZEN.json');
if (inv.frozen.adapter_code_hash !== fz.adapter_code_hash) problems.push('inventory adapter hash differs from FROZEN.json');
for (const f of Object.keys({ ...per, ...fz.adapter_files })) if (per[f] !== fz.adapter_files[f]) problems.push('adapter file differs: ' + f);
// comparators: build/results/heldout/INVENTORY.json
const binv = JSON.parse(fs.readFileSync(path.join(BUILD, 'results', 'heldout', 'INVENTORY.json'), 'utf8'));
const bfiles = binv.files || binv;
const needed = [];
for (const arm of ['relational', 'search', 'floor-co', 'floor-dir']) for (const s of ['T1', 'T1x', 'T2', 'T3', 'T4']) needed.push(`${arm}/primary/${s}.jsonl.gz`);
for (const a of ['relational', 'search']) needed.push(`tq/${a}.answers.jsonl`);
let compChecked = 0;
for (const n of needed) {
  const e = bfiles.find((x) => (x.path || x.file || '').replace(/\\/g, '/').endsWith(n));
  if (!e) { problems.push('comparator not in build inventory: ' + n); continue; }
  const b = fs.readFileSync(path.join(BUILD, 'results', 'heldout', n));
  if (sha(b) !== e.sha256) problems.push('comparator sha256 differs: ' + n); else compChecked++;
}
const out = { at: new Date().toISOString(), inventory_sha256: invSha, inventory_files: inv.files.length, files_checked: checked, unlisted_files: unlisted,
  adapter_code_hash_now: codeHash, adapter_all_files_hash_now: allHash, frozen_config_hash: fz.config_hash,
  comparator_files_checked: compChecked, comparator_files_needed: needed.length, problems, ok: problems.length === 0 };
fs.writeFileSync(path.join(__dirname, 'verify_inventory.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(out.ok ? 0 : 1);
