'use strict';
// Writes ../FROZEN.json from selection.json (protocol addendum 7 item 10). Refuses to overwrite an existing
// FROZEN.json. Two adapter hashes are recorded:
//   adapter_code_hash   the adapter's own definition (lib.js adapterHash: sha256 over "<file> <sha256>\n"
//                       lines of every .js/.py/.sh file, sorted by name), which the held-out lock checks;
//   adapter_all_files_sha256  an independent one over EVERY file in adapter/ (recursive, any extension):
//                       sha256 over "<relative path>\0<file bytes>" of each file in sorted path order.
//   node freeze.js <image id>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = path.resolve(__dirname, '..');
const A = path.join(G, 'adapter');
const LIB = require(path.join(A, 'lib'));
const out = path.join(G, 'FROZEN.json');
if (fs.existsSync(out)) throw new Error('FROZEN.json exists; refusing to overwrite');
const image = process.argv[2];
if (!/^sha256:[0-9a-f]{64}$/.test(image || '')) throw new Error('usage: node freeze.js <image id>');
const sel = JSON.parse(fs.readFileSync(path.join(__dirname, 'selection.json'), 'utf8'));
const walk = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d, path.posix.join(rel, e.name)) : [path.posix.join(rel, e.name)]));
const files = walk(A).sort();
const h = crypto.createHash('sha256');
const per = {};
for (const f of files) { const b = fs.readFileSync(path.join(A, f)); per[f] = crypto.createHash('sha256').update(b).digest('hex'); h.update(f + '\0'); h.update(b); }
const own = LIB.adapterHash(A);
if (Object.keys(own.files).length !== files.length) throw new Error('adapter holds files outside the code hash: ' + files.join(','));
const cfg = LIB.configsAll().find((c) => c.name === sel.chosen.name);
if (!cfg || cfg.hash !== sel.chosen.config_hash) throw new Error('chosen configuration does not hash as selected');
const rec = {
  arm: 'graphify',
  config_name: sel.chosen.name,
  config_hash: sel.chosen.config_hash,
  adapter_code_hash: own.hash,
  adapter_all_files_sha256: h.digest('hex'),
  adapter_files: per,
  image: 'graphtest-graphify:1',
  image_id: image,
  graphify_version: '0.9.108',
  user_command: cfg.user,
  calls: cfg.calls,
  selection: { rule: sel.rule, complexity_rule: sel.complexity_rule, best: sel.best, threshold: sel.threshold, eligible: sel.eligible, chosen: sel.chosen },
  frozen_by: 'grader lane, graphify tuning (protocol addendum 7 item 10)',
  frozen_at: new Date().toISOString(),
  note: 'From now on the adapter must not change. TUNE data only; no held-out task was run or read.',
};
fs.writeFileSync(out, JSON.stringify(rec, null, 1) + '\n');
// The lock as the held-out runner applies it (reads no task): must accept this record.
const ok = LIB.checkLock({ split: 'heldout', allowHeldout: true, lock: out }, A);
console.log('frozen', rec.config_name, rec.config_hash, rec.adapter_code_hash, 'lock accepts:', !!ok);
