'use strict';
// Re-audit 2, check 1a. Independent recomputation of every frozen record's code_hash and deps_hash.
// code_hash: sha256 over sorted lines "<folder>/<file> <sha256 of bytes>\n" for arms/<arm>/*.js + arms/common/*.js.
// deps_hash: MY OWN closure of static relative requires that leave the arm and common folders (followed
// transitively, also through common files), plus *.sql and stage2.json of the arm's folder and of each
// dependency folder (the rule stated in harness.js dataFiles); compared with the record's deps_files.
// Also: every file in arms/ newer than the record's frozen time; non-literal require() calls; the record's
// config hashed by arms/common/config.js equals its file name; arm field equals folder.
// usage: node hashcheck2.js <build root> <out.json>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const B = process.argv[2];
const ARMS = path.join(B, 'arms');
const FROZEN = path.join(B, 'results', 'frozen');
const C = require(path.join(ARMS, 'common', 'config.js'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const jsIn = (d) => fs.existsSync(path.join(ARMS, d)) ? fs.readdirSync(path.join(ARMS, d)).filter((f) => f.endsWith('.js') && fs.statSync(path.join(ARMS, d, f)).isFile()).map((f) => d + '/' + f) : [];
const digest = (rels) => sha([...rels].sort().map((r) => r + ' ' + sha(fs.readFileSync(path.join(ARMS, r))) + '\n').join(''));
const RE = /require\(\s*([^)]*?)\s*\)/g;
function myDeps(arm) {
  const out = new Set(); const seen = new Set(); const st = [...jsIn(arm), ...jsIn('common')];
  while (st.length) {
    const r = st.pop(); if (seen.has(r)) continue; seen.add(r);
    for (const m of fs.readFileSync(path.join(ARMS, r), 'utf8').matchAll(RE)) {
      const a = m[1];
      const lit = a.match(/^['"](\.\.?\/[^'"]+)['"]$/);
      if (!lit) continue;
      let t = path.posix.normalize(path.posix.join(path.posix.dirname(r), lit[1]));
      if (!t.endsWith('.js') && !t.endsWith('.json')) t += '.js';
      const top = t.split('/')[0];
      if (top !== arm && top !== 'common') out.add(t);
      if (fs.existsSync(path.join(ARMS, t))) st.push(t);
    }
  }
  const dl = [...out];
  const data = [];
  for (const d of new Set([arm, ...dl.map((x) => x.split('/')[0])])) {
    const dir = path.join(ARMS, d);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if ((f.endsWith('.sql') || f === 'stage2.json') && fs.statSync(path.join(dir, f)).isFile()) data.push(d + '/' + f);
  }
  return [...dl, ...data].sort();
}
const out = { records: [], nonliteral_requires: [], newer_than_freeze: [] };
let lastFreeze = 0;
for (const arm of fs.readdirSync(FROZEN).filter((d) => d !== '_replaced' && fs.statSync(path.join(FROZEN, d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(FROZEN, arm)).filter((x) => x.endsWith('.json'))) {
    const rec = JSON.parse(fs.readFileSync(path.join(FROZEN, arm, f), 'utf8'));
    const files = [...jsIn(arm), ...jsIn('common')].sort();
    const mine = digest(files);
    const md = myDeps(arm);
    const recDeps = Object.keys(rec.deps_files || {}).sort();
    let cfgHash = null;
    if (rec.config) { try { cfgHash = C.configHash(rec.config); } catch (e) { cfgHash = 'ERR ' + e.message; } }
    const t = Date.parse(rec.frozen_at || rec.at || rec.time || 0);
    if (t > lastFreeze) lastFreeze = t;
    out.records.push({
      file: arm + '/' + f, arm_field: rec.arm, arm_ok: rec.arm === arm, role: rec.role, hash: rec.hash || null,
      name_ok: f === 'tq.json' ? rec.role === 'tq' || rec.role === undefined : (rec.hash + '.json' === f && cfgHash === rec.hash),
      cfg_hash: cfgHash, frozen_at: rec.frozen_at || rec.at || rec.time || null,
      code_ok: mine === rec.code_hash, code_mine: mine.slice(0, 16), code_rec: String(rec.code_hash).slice(0, 16),
      list_ok: JSON.stringify(Object.keys(rec.code_files || {}).sort()) === JSON.stringify(files),
      deps_list_ok: JSON.stringify(md) === JSON.stringify(recDeps), deps_mine: md, deps_rec: recDeps,
      deps_ok: digest(md) === rec.deps_hash,
      keys: Object.keys(rec),
    });
  }
}
for (const d of fs.readdirSync(ARMS).filter((x) => fs.statSync(path.join(ARMS, x)).isDirectory())) {
  for (const r of jsIn(d)) {
    for (const m of fs.readFileSync(path.join(ARMS, r), 'utf8').matchAll(RE)) {
      const a = m[1].trim();
      if (!/^['"][^'"]+['"]$/.test(a)) out.nonliteral_requires.push({ file: r, arg: a.slice(0, 140) });
    }
  }
}
(function walk(dir, relp) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f); const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, relp + f + '/'); else if (s.mtimeMs > lastFreeze - 120000) out.newer_than_freeze.push({ file: relp + f, mtime: s.mtime.toISOString() });
  }
})(ARMS, '');
out.last_freeze = new Date(lastFreeze).toISOString();
out.all_ok = out.records.every((r) => r.arm_ok && r.name_ok && r.code_ok && r.list_ok && r.deps_list_ok && r.deps_ok);
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const r of out.records) console.log(r.file, r.role, 'arm', r.arm_ok, 'name', r.name_ok, 'code', r.code_ok, r.code_mine, 'list', r.list_ok, 'depslist', r.deps_list_ok, 'deps', r.deps_ok, r.frozen_at, JSON.stringify(r.deps_mine));
console.log('all_ok', out.all_ok, 'last_freeze', out.last_freeze, 'newer files (within 2 min before or after last freeze):', out.newer_than_freeze.length);
console.log(JSON.stringify(out.newer_than_freeze.slice(0, 30)));
console.log('nonliteral requires', JSON.stringify(out.nonliteral_requires));
