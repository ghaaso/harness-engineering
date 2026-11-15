// Lists ideas whose "where it stands" text opens with a stage word that disagrees with the maturity label.
// Usage: node matscan.cjs
'use strict';
const fs = require('fs'), path = require('path');
const cat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'catalogue.json'), 'utf8'));
const LBL = ['Parked', 'Idea', 'Designed', 'Built', 'Tested', 'In use'];
const WORDS = [
  [/^in use\b/i, 5], [/^(tested|measured|trialled)\b/i, 4], [/^(built|partly built|built in part)\b/i, 3],
  [/^(designed|adopted|specified)\b/i, 2], [/^(idea|proposed|deferred|trial|untested idea|not built)\b/i, 1],
  [/^(parked|rejected|superseded|refuted|withdrawn|dropped)\b/i, 0],
];
let n = 0;
cat.themes.forEach(t => t.ideas.forEach(i => {
  const s = String(i.stands || '').trim();
  const w = WORDS.find(([re]) => re.test(s));
  if (w && w[1] !== i.maturity) { n += 1; console.log(`${i.id} k=${i.k} label=${LBL[i.maturity]} text=${LBL[w[1]]} status=${i.status} :: ${s.slice(0, 150)}`); }
}));
console.log('mismatches', n);
