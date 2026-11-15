'use strict';
// Grader check after the round-2 re-freeze (host, pure computation, reads no task and no answer):
// every frozen record (13 configuration records, 4 question-code records) has the declared arm, role and
// hash; its configuration equals (as JSON) the one in sealed/grader/selection_v2.json (chosen,
// chosen_rule_v1 or best_form of its arm; the reference rows use relational's); its code_hash equals an
// independent recomputation (sha256 over sorted lines "<folder>/<file> <sha256 of file>\n" for
// arms/<arm>/*.js and arms/common/*.js, addendum 4 item 13).
//   node sealed/grader/r2/verify_records.js > sealed/grader/r2/verify_records.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const B = path.resolve(__dirname, '..', '..', '..');
const sel = JSON.parse(fs.readFileSync(path.join(B, 'sealed', 'grader', 'selection_v2.json'), 'utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function codeHash(arm) {
  const lines = [];
  for (const d of [arm, 'common']) for (const f of fs.readdirSync(path.join(B, 'arms', d)).filter((x) => x.endsWith('.js')))
    lines.push(d + '/' + f + ' ' + sha(fs.readFileSync(path.join(B, 'arms', d, f))) + '\n');
  return sha(lines.sort().join(''));
}
const ROWS = [
  ['relational', 'primary', '95e990307da3b42b', 'chosen'], ['ladybug', 'primary', '95e990307da3b42b', 'chosen'], ['duckpgq', 'primary', '95e990307da3b42b', 'chosen'],
  ['search', 'primary', 'e70177e5807f0252', 'chosen'], ['floor-dir', 'primary', '714a474060653c1f', 'chosen'], ['floor-co', 'primary', 'c4d2f0a60a3d199c', 'chosen'],
  ['relational', 's1', '6b70cc1222745385', 'chosen_rule_v1'], ['ladybug', 's1', '6b70cc1222745385', 'chosen_rule_v1'], ['duckpgq', 's1', '6b70cc1222745385', 'chosen_rule_v1'],
  ['ladybug', 's2', 'f233ae069bdba0ce', 'best_form'], ['search', 's2', '950c029615d337c1', 'best_form'],
  ['reference', 'crosscheck', '95e990307da3b42b', 'chosen', 'relational'], ['reference', 'crosscheck', '6b70cc1222745385', 'chosen_rule_v1', 'relational'],
];
const out = { at: new Date().toISOString(), rows: [], tq: [], problems: [] };
const ch = {};
for (const [arm, role, hash, key, selArm] of ROWS) {
  const rec = JSON.parse(fs.readFileSync(path.join(B, 'results', 'frozen', arm, hash + '.json'), 'utf8'));
  const s = sel.arms[selArm || arm][key];
  const now = ch[arm] || (ch[arm] = codeHash(arm));
  const r = { arm, role, hash, arm_ok: rec.arm === arm, role_ok: rec.role === role, hash_ok: rec.hash === hash && s.config_hash === hash,
    config_equal_selection: JSON.stringify(rec.config) === JSON.stringify(s.config), code_hash: rec.code_hash, code_hash_recomputed_equal: rec.code_hash === now, deps_hash: rec.deps_hash, frozen_at: rec.frozen_at || rec.at || null };
  for (const k of ['arm_ok', 'role_ok', 'hash_ok', 'config_equal_selection', 'code_hash_recomputed_equal']) if (!r[k]) out.problems.push(arm + ' ' + role + ' ' + hash + ': ' + k);
  out.rows.push(r);
}
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search']) {
  const rec = JSON.parse(fs.readFileSync(path.join(B, 'results', 'frozen', arm, 'tq.json'), 'utf8'));
  const cfgRec = JSON.parse(fs.readFileSync(path.join(B, 'results', 'frozen', arm, (arm === 'search' ? 'e70177e5807f0252' : '95e990307da3b42b') + '.json'), 'utf8'));
  const r = { arm, code_hash: rec.code_hash, deps_hash: rec.deps_hash, code_hash_recomputed_equal: rec.code_hash === ch[arm], equals_primary_record_hashes: rec.code_hash === cfgRec.code_hash && rec.deps_hash === cfgRec.deps_hash };
  if (!r.code_hash_recomputed_equal || !r.equals_primary_record_hashes) out.problems.push('tq ' + arm);
  out.tq.push(r);
}
const files = []; for (const d of fs.readdirSync(path.join(B, 'results', 'frozen'))) { const p = path.join(B, 'results', 'frozen', d); if (!d.startsWith('_') && fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) files.push(d + '/' + f); }
out.live_record_files = files.length; out.live_records = files.sort();
if (files.length !== 17) out.problems.push('expected 17 live record files, found ' + files.length);
console.log(JSON.stringify(out, null, 1));
process.exitCode = out.problems.length ? 1 : 0;
