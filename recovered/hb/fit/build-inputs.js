// Builds the mapper and screener inputs from the Horthy post-review list and its addendum.
const fs = require('fs');
const path = require('path');
const base = process.argv[2];
const src = path.join(base, 'src');
const out = path.join(base, 'in');
const BS = String.fromCharCode(92); const split = (line) => line.split(new RegExp('(?<!' + BS + BS + ')[|]')).map((s) => s.trim());
const strip = (s) => s.replace(/\*\*/g, '').trim();

const rows = new Map();
let anomalies = 0;
for (const line of fs.readFileSync(path.join(src, 'horthy-review_POST-REVIEW-LIST.md'), 'utf8').split(/\r?\n/)) {
  if (!/^\| G\d-F\d+ \|/.test(line)) continue;
  const c = split(line);
  if (c.length !== 10) anomalies++;
  const id = c[1];
  rows.set(id, { id, group: id.slice(0, 2), final: strip(c[2]), claim: c[3], oneLine: c.slice(8, c.length - 1).join(' | '), addendum: '' });
}

let section = '';
const add = [];
for (const line of fs.readFileSync(path.join(src, 'horthy-addendum-2026-11-09_review_ADDENDUM-POST-REVIEW.md'), 'utf8').split(/\r?\n/)) {
  const h = line.match(/^## (.*)$/);
  if (h) {
    section = /changed/.test(h[1]) ? 'changed' : /left as they were/.test(h[1]) ? 'same' : /unrefuted by the cap/.test(h[1]) ? 'overcap' : /New families/.test(h[1]) ? 'new' : 'other';
    continue;
  }
  const m = line.match(/^\| \*\*((?:G\d|N)-F\d+)\*\* \|/);
  if (!m) continue;
  const c = split(line);
  add.push({ id: m[1], section, bearsOn: c[2], firstPass: c[3], verdict: c[4], now: strip(c[5]), survives: c[6], measurement: c[7] });
}
const newFam = JSON.parse(fs.readFileSync(path.join(src, 'horthy-addendum-2026-11-09_review_new-families.json'), 'utf8'));
const label = new Map(newFam.map((f) => [f.id, f.label]));

for (const a of add) {
  if (a.section === 'changed') {
    const r = rows.get(a.id);
    r.final = a.now;
    r.addendum = `Addendum 2026-11-09 (${a.verdict}): ${a.survives}${a.measurement ? ' Measurement: ' + a.measurement : ''}`;
  } else if (a.section === 'overcap') {
    const r = rows.get(a.id);
    r.final = a.now;
    r.oneLine = `[first pass left this unrefuted; addendum verdict ${a.verdict}] ${a.survives}${a.measurement && a.now === 'trial' ? ' Measurement: ' + a.measurement : ''}`;
  } else if (a.section === 'new') {
    rows.set(a.id, { id: a.id, group: 'N', final: a.now, claim: label.get(a.id) || '(label missing)', oneLine: a.survives, addendum: `New family from the addendum; bears on ${a.bearsOn}.` });
  }
}

const all = [...rows.values()];
const tally = {};
for (const r of all) tally[r.final] = (tally[r.final] || 0) + 1;
console.log('rows', all.length, 'column anomalies', anomalies, JSON.stringify(tally));

const surv = all.filter((r) => r.final === 'adopt' || r.final === 'trial');
const fallen = all.filter((r) => !(r.final === 'adopt' || r.final === 'trial'));
const sHead = '| Family | Disposition in PR #186 | Original claim (what Horthy says) | What survived the refuter (the narrowed version; this is the idea) | Addendum |\n| --- | --- | --- | --- | --- |\n';
const sRow = (r) => `| ${r.id} | ${r.final} | ${r.claim} | ${r.oneLine} | ${r.addendum} |`;
const fHead = '| Family | Disposition in PR #186 | Claim (what Horthy says) | Why it fell, or which FixFlow mechanism already covers it |\n| --- | --- | --- | --- |\n';
const fRow = (r) => `| ${r.id} | ${r.final} | ${r.claim} | ${r.oneLine} |`;
const write = (name, title, head, list, rowFn) => {
  const body = `# ${title}\n\n${list.length} families.\n\n${head}${list.map(rowFn).join('\n')}\n`;
  fs.writeFileSync(path.join(out, name), body);
  console.log(name, list.length, 'families', Buffer.byteLength(body), 'bytes');
};
const g = (r, ...gs) => gs.includes(r.group);
write('horthy-survivors-A.md', 'Horthy survivors, groups G1 (CLAUDE.md, context), G3 (agents, skills, workflows), G5 (cross-cutting)', sHead, surv.filter((r) => g(r, 'G1', 'G3', 'G5')), sRow);
write('horthy-survivors-B.md', 'Horthy survivors, group G2 (routine compliance, hooks, cold resume)', sHead, surv.filter((r) => g(r, 'G2')), sRow);
write('horthy-survivors-C.md', 'Horthy survivors, group G4 (effort routing, verifiers, backpressure)', sHead, surv.filter((r) => g(r, 'G4')), sRow);
const g4 = fallen.filter((r) => g(r, 'G4'));
const half = Math.ceil(g4.length / 2);
write('horthy-fallen-1.md', 'Horthy fallen families, group G1 (CLAUDE.md length, context budget, compaction)', fHead, fallen.filter((r) => g(r, 'G1')), fRow);
write('horthy-fallen-2.md', 'Horthy fallen families, group G2 (routine compliance, hooks, cold resume)', fHead, fallen.filter((r) => g(r, 'G2')), fRow);
write('horthy-fallen-3.md', 'Horthy fallen families, groups G3 (agents, skills, workflow library), G5 (cross-cutting) and the addendum\'s new families', fHead, fallen.filter((r) => g(r, 'G3', 'G5', 'N')), fRow);
write('horthy-fallen-4.md', 'Horthy fallen families, group G4 part 1 (effort routing, verifiers, backpressure, benchmarks)', fHead, g4.slice(0, half), fRow);
write('horthy-fallen-5.md', 'Horthy fallen families, group G4 part 2 (effort routing, verifiers, backpressure, benchmarks)', fHead, g4.slice(half), fRow);
fs.writeFileSync(path.join(out, 'horthy-ids.json'), JSON.stringify(all.map((r) => ({ id: r.id, final: r.final })), null, 0));
