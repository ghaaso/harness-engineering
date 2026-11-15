'use strict';
// Preflight check 1a: recompute every frozen record's code_hash independently (no harness code loaded).
// code_hash = sha256 over sorted lines "<folder>/<file> <sha256 hex of file bytes>\n" for every
// regular file arms/<arm>/*.js and arms/common/*.js (addendum 4 item 13).
// Also recomputes deps_hash over the files the record lists in deps_files, and searches every arm
// file for require() of another arm folder that the harness regex might miss (dynamic requires).
// usage: node hashcheck.js <build root> <out.json>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const B = process.argv[2];
const OUT = process.argv[3];
const ARMS = path.join(B, 'arms');
const FROZEN = path.join(B, 'results', 'frozen');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const jsIn = (d) => fs.readdirSync(path.join(ARMS, d)).filter((f) => f.endsWith('.js') && fs.statSync(path.join(ARMS, d, f)).isFile()).map((f) => d + '/' + f);
function digest(rels) {
  const lines = [...rels].sort().map((r) => r + ' ' + sha(fs.readFileSync(path.join(ARMS, r))) + '\n');
  return sha(lines.join(''));
}
const out = { records: [], dynamic_requires: [], non_js_runtime_inputs: [] };
for (const arm of fs.readdirSync(FROZEN).filter((d) => fs.statSync(path.join(FROZEN, d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(FROZEN, arm)).filter((x) => x.endsWith('.json'))) {
    const rec = JSON.parse(fs.readFileSync(path.join(FROZEN, arm, f), 'utf8'));
    const files = [...jsIn(arm), ...jsIn('common')];
    const mine = digest(files);
    const deps = Object.keys(rec.deps_files || {});
    const myDeps = digest(deps);
    const recFiles = Object.keys(rec.code_files || {}).sort();
    out.records.push({
      file: arm + '/' + f, arm_field: rec.arm, arm_folder: arm, arm_matches_folder: rec.arm === arm,
      role: rec.role, hash: rec.hash || null, has_role: !!rec.role,
      code_hash_record: rec.code_hash, code_hash_mine: mine, code_equal: mine === rec.code_hash,
      file_list_equal: JSON.stringify(recFiles) === JSON.stringify(files.sort()),
      n_files: files.length, deps_files: deps, deps_hash_record: rec.deps_hash, deps_hash_mine: myDeps, deps_equal: myDeps === rec.deps_hash,
    });
  }
}
// any require() in an arm file whose argument is not a plain string literal, or names another arm folder
for (const d of fs.readdirSync(ARMS).filter((x) => fs.statSync(path.join(ARMS, x)).isDirectory())) {
  for (const r of jsIn(d)) {
    const t = fs.readFileSync(path.join(ARMS, r), 'utf8');
    for (const m of t.matchAll(/require\(([^)]*)\)/g)) {
      const a = m[1].trim();
      const literal = /^['"][^'"]+['"]$/.test(a);
      const other = /\.\.\/(relational|reference|ladybug|duckpgq|search|floor-dir|floor-co)\b/.test(a) || /'(relational|reference|ladybug|duckpgq|search|floor-dir|floor-co)'/.test(a);
      if (!literal || other) out.dynamic_requires.push({ file: r, arg: a.slice(0, 120), literal, names_other_arm: other });
    }
    for (const m of t.matchAll(/readFileSync\(([^;]{0,160})/g)) {
      if (/schema\.sql|stage2\.json|priors|\.sql|\.json'/.test(m[1])) out.non_js_runtime_inputs.push({ file: r, call: m[1].slice(0, 160) });
    }
  }
}
out.all_code_equal = out.records.every((x) => x.code_equal && x.file_list_equal);
out.all_deps_equal = out.records.every((x) => x.deps_equal);
out.all_arm_match = out.records.every((x) => x.arm_matches_folder && x.has_role);
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ records: out.records.length, all_code_equal: out.all_code_equal, all_deps_equal: out.all_deps_equal, all_arm_match: out.all_arm_match, dynamic_requires: out.dynamic_requires.length, non_js_inputs: out.non_js_runtime_inputs.length }));
for (const r of out.records) console.log(r.file, r.role, r.code_equal, r.file_list_equal, r.deps_equal, r.deps_files.join(','));
