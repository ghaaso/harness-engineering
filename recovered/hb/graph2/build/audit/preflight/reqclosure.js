'use strict';
// Preflight check 1b: the transitive closure of static relative require() calls from the held-out entry
// points (arms/common/run.js plus each arm's arm.js and, where present, tq.js), and whether every file
// reached is covered by that arm's code_hash or deps_hash. Also lists non-.js files the closure reads
// (readFileSync / __dirname paths) and their modification times against the freeze time.
// usage: node reqclosure.js <build root> <out.json>
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
const ARMS = path.join(B, 'arms');
const RE = /require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
function closure(starts) {
  const seen = new Set(); const st = [...starts];
  while (st.length) {
    const r = st.pop(); if (seen.has(r)) continue; seen.add(r);
    const t = fs.readFileSync(path.join(ARMS, r), 'utf8');
    for (const m of t.matchAll(RE)) {
      let x = path.posix.normalize(path.posix.join(path.posix.dirname(r), m[1]));
      if (!x.endsWith('.js') && !x.endsWith('.json')) x += '.js';
      if (fs.existsSync(path.join(ARMS, x))) st.push(x); else seen.add('MISSING:' + x);
    }
  }
  return [...seen].sort();
}
const out = {};
for (const arm of ['relational', 'reference', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  const starts = ['common/run.js', arm + '/arm.js'];
  if (fs.existsSync(path.join(ARMS, arm, 'tq.js'))) starts.push(arm + '/tq.js');
  const files = closure(starts);
  const rec = JSON.parse(fs.readFileSync(path.join(B, 'results', 'frozen', arm, fs.readdirSync(path.join(B, 'results', 'frozen', arm)).find((f) => /^[0-9a-f]{16}\.json$/.test(f))), 'utf8'));
  const covered = new Set([...Object.keys(rec.code_files), ...Object.keys(rec.deps_files || {})]);
  const notCovered = files.filter((f) => !covered.has(f));
  // non-js inputs referenced from closure files via __dirname
  const dataRefs = [];
  for (const f of files) {
    if (f.startsWith('MISSING')) continue;
    const t = fs.readFileSync(path.join(ARMS, f), 'utf8');
    for (const m of t.matchAll(/path\.join\(__dirname,\s*([^)]*)\)/g)) dataRefs.push({ file: f, arg: m[1].slice(0, 100) });
  }
  out[arm] = { closure: files, not_covered: notCovered, data_refs: dataRefs, frozen_at: rec.frozen_at };
}
const mtimes = {};
for (const f of ['relational/schema.sql', 'relational/stage2.json', 'ladybug/stage2.json', 'duckpgq/stage2.json', 'search/stage2.json', 'reference/stage2.json']) {
  if (fs.existsSync(path.join(ARMS, f))) mtimes[f] = fs.statSync(path.join(ARMS, f)).mtime.toISOString();
}
let newest = null;
for (const d of fs.readdirSync(ARMS)) for (const f of fs.readdirSync(path.join(ARMS, d))) {
  const p = path.join(ARMS, d, f); const s = fs.statSync(p);
  if (s.isFile() && (!newest || s.mtime > newest.m)) newest = { f: d + '/' + f, m: s.mtime };
}
out._mtimes = mtimes; out._newest_file_in_arms = { file: newest.f, mtime: newest.m.toISOString() };
const pri = path.join(ARMS, 'ladybug', 'priors');
out._priors = { count: fs.readdirSync(pri).length, newest: fs.readdirSync(pri).map((f) => fs.statSync(path.join(pri, f)).mtime.toISOString()).sort().pop() };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) if (!k.startsWith('_')) console.log(k, 'closure', v.closure.length, 'not covered:', JSON.stringify(v.not_covered), 'data:', JSON.stringify(v.data_refs));
console.log(JSON.stringify(out._mtimes), JSON.stringify(out._newest_file_in_arms), JSON.stringify(out._priors));
