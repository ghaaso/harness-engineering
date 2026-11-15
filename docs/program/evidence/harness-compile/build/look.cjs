// Looks up ideas, bottlenecks and glossary terms for adjudication.
// Usage: node look.cjs <id-or-text> [...]   ids like MSR-32, B08, LIB-S9; anything else is a case-insensitive text search.
'use strict';
const fs = require('fs'), path = require('path');
const D = path.resolve(__dirname, '..', 'data');
const cat = JSON.parse(fs.readFileSync(path.join(D, 'catalogue.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(D, 'register.json'), 'utf8'));
const gl = JSON.parse(fs.readFileSync(path.join(D, 'glossary.json'), 'utf8'));
const LBL = ['Parked', 'Idea', 'Designed', 'Built', 'Tested', 'In use'];
const ideas = [].concat(...cat.themes.map(t => t.ideas));
const showIdea = i => console.log(`IDEA ${i.id} k=${i.k} wp=${i.wp} mat=${i.maturity}(${LBL[i.maturity]}) status=${i.status}\n  name: ${i.name}\n  how: ${i.how}\n  problem: ${i.problem}\n  stands: ${i.stands}\n  next: ${i.next}\n  origin: ${i.origin}\n  bn: ${(i.bottlenecks || []).join(' ')}`);
const showBn = b => console.log(`BN ${b.id} fam=${b.family} wp=${b.wp} state=${b.state}\n  name: ${b.name}\n  what: ${b.what}\n  evidence: ${b.evidence}\n  potential: ${b.potential}\n  first: ${b.first_step}`);
const showT = t => console.log(`TERM ${t.key} [${t.category}] ${t.term}\n  def: ${t.definition}\n  origin: ${t.origin}`);
process.argv.slice(2).forEach(q => {
  const i = ideas.find(x => x.id === q); if (i) { showIdea(i); return; }
  const b = reg.bottlenecks.find(x => x.id === q); if (b) { showBn(b); return; }
  const t = gl.terms.find(x => x.key === q); if (t) { showT(t); return; }
  const lq = q.toLowerCase();
  const hit = o => JSON.stringify(o).toLowerCase().includes(lq);
  let n = 0;
  ideas.filter(hit).forEach(x => { n += 1; showIdea(x); });
  reg.bottlenecks.filter(hit).forEach(x => { n += 1; showBn(x); });
  gl.terms.filter(hit).forEach(x => { n += 1; showT(x); });
  const files = ['themes-meta.json', 'catalogue-extra.json', 'register-extra.json', 'packages.json'].map(f => path.join(D, f))
    .concat(['narrative.cjs', 'part1.cjs', 'part2.cjs', 'part3.cjs', 'part4.cjs', 'front.cjs', 'build.cjs', 'figures.cjs', 'back.cjs'].map(f => path.join(__dirname, f)));
  files.filter(f => fs.existsSync(f)).forEach(f => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, k) => { if (l.toLowerCase().includes(lq)) { n += 1; console.log(`FILE ${path.basename(f)}:${k + 1}: ${l.trim().slice(0, 400)}`); } });
  });
  if (!n) console.log(`NONE: ${q}`);
});
