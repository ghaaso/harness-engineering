// Folds the reader-test fixes (data/reader-fixes.json) into the build.
//   node reader-fixes.cjs          merge into overrides.json and patch the hand-written files
//   node reader-fixes.cjs --check  report every "find" text that is still printed somewhere
// lit pairs [find, replacement] become literal fixRe rules (ideas, register, glossary) and are also
// applied, literally, to the hand-written text files. set / register / glossary merge into
// overrides.json; addTerms are appended once, by key.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const rd = f => fs.readFileSync(f, 'utf8');
const rf = JSON.parse(rd(path.join(DATA, 'reader-fixes.json')));
const HAND = [
  'data/themes-meta.json', 'data/catalogue-extra.json', 'data/register-extra.json', 'data/packages.json', 'data/sources.json',
  'build/narrative.cjs', 'build/front.cjs', 'build/part1.cjs', 'build/part2.cjs', 'build/part3.cjs', 'build/part4.cjs',
  'build/back.cjs', 'build/build.cjs', 'build/figures.cjs',
];
const OUTS = ['data/catalogue.json', 'data/register.json', 'data/glossary.json'];
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (process.argv.includes('--check')) {
  let left = 0;
  const texts = [...OUTS, ...HAND].map(f => [f, rd(path.join(ROOT, f))]);
  rf.lit.forEach(([a, b]) => {
    if (b.includes(a)) return; // the replacement keeps the find text on purpose
    const where = texts.filter(([, t]) => t.includes(a)).map(([f]) => f);
    if (where.length) { left += 1; console.log(`STILL PRINTED: ${JSON.stringify(a.slice(0, 90))} in ${where.join(', ')}`); }
  });
  console.log(`check: ${rf.lit.length} lit pairs, ${left} still printed`);
  process.exit(0);
}

// 1-3: overrides.json
const ovPath = path.join(DATA, 'overrides.json');
const ov = JSON.parse(rd(ovPath));
ov.fixRe = ov.fixRe || []; ov.set = ov.set || {}; ov.register = ov.register || {}; ov.glossary = ov.glossary || {}; ov.addTerms = ov.addTerms || [];
const haveRe = new Set(ov.fixRe.map(p => p[0]));
let nRe = 0;
rf.lit.forEach(([a, b]) => { const k = reEsc(a); if (!haveRe.has(k)) { ov.fixRe.push([k, b.replace(/\$/g, '$$$$')]); haveRe.add(k); nRe += 1; } });
const merge = (dst, src) => { let n = 0; Object.entries(src || {}).forEach(([k, v]) => { dst[k] = Object.assign({}, dst[k] || {}, v); n += 1; }); return n; };
const nSet = merge(ov.set, rf.set), nReg = merge(ov.register, rf.register), nGl = merge(ov.glossary, rf.glossary);
const haveT = new Set(ov.addTerms.map(t => t.key));
let nT = 0;
(rf.addTerms || []).forEach(t => { if (!haveT.has(t.key)) { ov.addTerms.push(t); haveT.add(t.key); nT += 1; } });
fs.writeFileSync(ovPath, JSON.stringify(ov, null, 1) + '\n');
console.log(`overrides: fixRe +${nRe} (now ${ov.fixRe.length}), set ${nSet}, register ${nReg}, glossary ${nGl}, addTerms +${nT} (now ${ov.addTerms.length})`);

// 4: the hand-written files
HAND.forEach(rel => {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { console.log(`missing ${rel}`); return; }
  const isJson = rel.endsWith('.json');
  let s = rd(f); const before = s; const hits = [];
  rf.lit.forEach(([a, b]) => {
    if (!s.includes(a)) return;
    if (s.includes(b) && b.includes(a)) return; // already applied once; a second pass would double it
    if (!isJson && b.includes("'")) { console.log(`skip (straight quote) ${rel}: ${a.slice(0, 60)}`); return; }
    if (isJson && (b.includes('"') || b.includes('\\'))) { console.log(`skip (JSON-unsafe) ${rel}: ${a.slice(0, 60)}`); return; }
    s = s.split(a).join(b); hits.push(a.slice(0, 50));
  });
  if (s === before) return;
  if (isJson) { try { JSON.parse(s); } catch (e) { console.log(`NOT WRITTEN ${rel}: ${e.message}`); return; } }
  fs.writeFileSync(f, s);
  console.log(`${rel}: ${hits.length} replaced (${hits.join(' | ')})`);
});
