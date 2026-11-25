// Checks a hypothesis against a learning file: which entries each decision block cites, whether the coverage table
// (section 9) agrees with the blocks, and which entries are cited in no block.
// Usage: node check-coverage.cjs <hypothesis.md> <D|N>
const fs = require('fs');
const [, , file, side] = process.argv;
const learn = { D: 'docs/program/learning/MECHANISMS-DATA.md', N: 'docs/program/learning/MECHANISMS-NEURAL.md' }[side];
const entries = [...fs.readFileSync(learn, 'utf8').matchAll(/^\*\*(\d+\.\d+) /gm)].map((m) => m[1]);
const text = fs.readFileSync(file, 'utf8');
const prefix = /^### M\d+\. /m.test(text) ? 'M' : 'D';
const heads = [...text.matchAll(new RegExp('^### (' + prefix + '[0-9]+)[.] .*$', 'gm'))];
const blocks = {};
heads.forEach((h, i) => {
  const end = i + 1 < heads.length ? heads[i + 1].index : text.indexOf('\n## ', h.index);
  blocks[h[1]] = text.slice(h.index, end);
});
const cites = {};
for (const [id, body] of Object.entries(blocks)) {
  for (const m of body.matchAll(new RegExp('(?<![A-Za-z0-9])' + side + ' ([0-9]+[.][0-9]+)', 'g'))) (cites[m[1]] ||= new Set()).add(id);
}
const table = {};
const at = text.indexOf('\n## 9.');
const cov = at < 0 ? '' : text.slice(at);
for (const m of cov.matchAll(new RegExp('[|] ' + side + ' ([0-9]+[.][0-9]+) [|] ([^|]*)(?=[|])', 'g'))) {
  table[m[1]] = [...m[2].matchAll(new RegExp(prefix + '[0-9]+', 'g'))].map((x) => x[0]);
}
let faults = 0;
for (const e of entries) {
  const inBlocks = [...(cites[e] || [])].sort();
  const inTable = (table[e] || []).slice().sort();
  if (!inBlocks.length) { console.log(side + ' ' + e + ': cited in no block' + (inTable.length ? ' (table says ' + inTable.join(', ') + ')' : '')); faults++; continue; }
  if (!(e in table)) { console.log(side + ' ' + e + ': not in the coverage table; blocks ' + inBlocks.join(', ')); faults++; continue; }
  const missing = inTable.filter((b) => !inBlocks.includes(b)), extra = inBlocks.filter((b) => !inTable.includes(b));
  if (missing.length || extra.length) { console.log(side + ' ' + e + ': table ' + inTable.join(', ') + ' | blocks ' + inBlocks.join(', ')); faults++; }
}
console.log(entries.length + ' entries, ' + Object.keys(blocks).length + ' blocks, ' + faults + ' differences');
