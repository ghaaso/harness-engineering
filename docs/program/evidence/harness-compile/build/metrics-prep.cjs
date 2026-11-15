// Prepares the item files for the seven-metric classification of every idea and bottleneck.
// The owner's lens (14 Nov 2026): throughput, efficiency, token count, token cost, time taken, quality of output, hallucinations.
// Writes data/metrics/items-<n>.md (what a classifier reads) and data/metrics/sample.md (every 6th item, for a blind second reading).
// Usage: node metrics-prep.cjs
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const OUT = path.join(DATA, 'metrics');
fs.mkdirSync(OUT, { recursive: true });
const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogue.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(DATA, 'register.json'), 'utf8'));
const LBL = ['Parked', 'Idea', 'Designed', 'Built', 'Tested', 'In use'];
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const ideaLine = (i, theme) => `### ${i.id} (idea, theme ${theme}, ${LBL[i.maturity]})\nname: ${i.name}\nproblem it is meant to solve: ${cut(i.problem, 420)}\nhow: ${cut(i.how, 320)}\nwhere it stands: ${cut(i.stands, 260)}\n`;
const bnLine = b => `### ${b.id} (bottleneck, family ${b.family}, ${b.state ? cut(b.state, 60) : b.stateKey})\nname: ${b.name}\nwhat happens: ${cut(b.what, 420)}\nevidence: ${cut(b.evidence, 320)}\nwhat fixing it unlocks: ${cut(b.potential, 220)}\n`;
// Groups sized for one reader each.
const groups = [
  ['MAC', 'CHK'], ['REV'], ['PAR', 'TOK'], ['MEM'], ['RET', 'MTH'], ['SKL', 'MSR', 'REL', 'OWN'],
];
const files = [];
const all = [];
groups.forEach((g, k) => {
  let t = `# Items to classify, file ${k + 1}: ideas of themes ${g.join(', ')}\n\n`;
  let n = 0;
  cat.themes.filter(th => g.includes(th.code)).forEach(th => th.ideas.forEach(i => { const l = ideaLine(i, th.code); t += l + '\n'; all.push([i.id, l]); n += 1; }));
  const f = `items-${k + 1}.md`; fs.writeFileSync(path.join(OUT, f), t); files.push({ f, n, chars: t.length });
});
const half = Math.ceil(reg.bottlenecks.length / 2);
[reg.bottlenecks.slice(0, half), reg.bottlenecks.slice(half)].forEach((bs, k) => {
  let t = `# Items to classify, file ${groups.length + k + 1}: bottlenecks from the register\n\n`;
  bs.forEach(b => { const l = bnLine(b); t += l + '\n'; all.push([b.id, l]); });
  const f = `items-${groups.length + k + 1}.md`; fs.writeFileSync(path.join(OUT, f), t); files.push({ f, n: bs.length, chars: t.length });
});
// Blind sample: every 6th item, in the same wording.
const sample = all.filter((x, i) => i % 6 === 3);
fs.writeFileSync(path.join(OUT, 'sample.md'), `# Items to classify (a sample across all themes and the register)\n\n` + sample.map(x => x[1]).join('\n'));
fs.writeFileSync(path.join(OUT, 'sample-ids.json'), JSON.stringify(sample.map(x => x[0])));
console.log(files.map(x => `${x.f}: ${x.n} items, ${x.chars} chars`).join('\n'));
console.log(`sample.md: ${sample.length} items; total ${all.length}`);
