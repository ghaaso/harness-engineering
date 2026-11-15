// Checks the seven-metric text of the short edition against the records it was written from.
// Every number in a bottleneck block must appear in that block's dossier (data/metrics/block-<key>.md), and a number
// followed by a tag must carry the same tag there. The scoreboard, the short version and the Part 2 and 3 prose are
// checked against all dossiers, the token report, the chat record and the classification totals together.
// Usage: node lens-check.cjs [short.json path]
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const PROG = path.resolve(__dirname, '..', '..', '..');
const rd = f => fs.readFileSync(f, 'utf8');
const S = JSON.parse(rd(process.argv[2] || path.join(DATA, 'short.json')));
const B = JSON.parse(rd(path.join(DATA, 'metrics', 'blocks.json')));

const norm = s => String(s || '')
  .replace(/(?<![\w.])(?:[A-Z][A-Za-z]*-)*[A-Z][A-Za-z]*\d+[a-z]?(?:-[A-Z]+)?(?!\w|\.\w)/g, ' ID ')
  .replace(/#\d+/g, ' ID ')
  .replace(/(\d),(\d{3})/g, '$1$2').replace(/[–—]/g, '-').replace(/×/g, 'x').replace(/ /g, ' ');
const NUM = /\d+(?:\.\d+)?/g;
const TAGGED = /(\d+(?:\.\d+)?)[^\d\[\]]{0,40}?\[(M|E|G|S|T|I)\]/g;
const nums = s => (norm(s).match(NUM) || []);
const tagged = s => { const out = []; let m; const t = norm(s); TAGGED.lastIndex = 0; while ((m = TAGGED.exec(t))) out.push([m[1], m[2]]); return out; };
const issues = [];
function check(where, text, src) {
  const have = new Set(nums(src));
  nums(text).forEach(n => { if (!have.has(n)) issues.push(`${where}: number ${n} is not in its records`); });
  const srcTags = tagged(src);
  tagged(text).forEach(([n, tag]) => {
    const forN = srcTags.filter(x => x[0] === n).map(x => x[1]);
    if (forN.length && !forN.includes(tag)) issues.push(`${where}: ${n} [${tag}] is tagged [${[...new Set(forN)].join('/')}] in its records`);
  });
}
const dossier = k => rd(path.join(DATA, 'metrics', `block-${k}.md`));
const all = B.blocks.map(b => dossier(b.key)).join('\n');
// Numbers that come from outside the dossiers: the token report, the chat record, the classification and plain counts.
const extra = [
  rd(path.join(PROG, 'TOKEN-BOTTLENECK-2026-11.md')),
  // WP12's split rule and replay (14 November): the record behind the numbers under the split-and-merge figure.
  rd(path.join(PROG, 'SPLIT-RULE-2026-11.md')),
  rd(path.join(DATA, 'added.json')),
  JSON.stringify(B.totals), JSON.stringify(B.general), JSON.stringify(B.blocks.map(b => [b.bottlenecks.length, b.ideas.length, b.hit])),
  // counts of this edition's own making, each stated where it is used
  '7 metrics; 11 bottlenecks; blocks 1 to 11; 12 themes; 16 packages; 130 bottlenecks [M]; 484 ideas [M]; 606 [M] records; 80 of 101 [M]; 86 [M]; 376 [M] messages; 59 [M] sessions; 113 [M]; 5 [M] missing; 31 [M] cut; 13 November; 14 November; 6 October; 26 October; 3 November; 11 November; 2 of 2 [M]; 8,000-token; 30, 40 and 50 % [S]; 94 [E]; 381 [E]; 14 [E]; 330 [E]; 143 [E]; 127 [E]; 68 [E]; 1000 [S]; 0.5 ms [M]; 333k (clinic) and 396k (FixFlow) tokens a call [M]; 52 %, 32 % and 16 % [M]; 3.0x [M]; 1.6x [M]; +0.076 [M]; eight lanes; 432 commits and 65 merges [M]; 35,834 calls [M]; 7.35 billion [M]; 97 % [M]',
].join('\n');

(S.blocks || []).forEach(b => {
  const src = dossier(b.key) + '\n' + rd(path.join(DATA, 'added.json'));
  check(`block ${b.key} title`, b.title, src);
  check(`block ${b.key} what`, b.what, src);
  check(`block ${b.key} measured`, b.measured, src);
  check(`block ${b.key} unmeasured`, b.unmeasured, src);
  (b.hits || []).forEach(h => check(`block ${b.key} hit ${h.metric}`, h.how, src));
  const lb = B.blocks.find(x => x.key === b.key);
  (b.ideas || []).forEach(i => {
    if (!new RegExp('### ' + i.id.replace(/[-]/g, '\\-') + ' ').test(all)) issues.push(`block ${b.key}: idea ${i.id} is not in any dossier`);
    // An idea may be shown under a second block; check it against every dossier that holds it.
    check(`block ${b.key} idea ${i.id}`, i.name + ' ' + i.result, all + '\n' + extra);
    if (lb && !lb.ideas.includes(i.id)) issues.push(`note: block ${b.key} shows ${i.id}, which the classification put in another block`);
  });
});
(S.metrics || []).forEach(m => check(`metric ${m.key}`, [m.means, m.stand, m.limiter, m.gap].join(' '), all + '\n' + extra));
const k = S.short || {};
['t1v', 't1l', 't2v', 't2l', 't3v', 't3l', 't4v', 't4l'].forEach(f => check(`short ${f}`, k[f], all + '\n' + extra));
(k.points || []).forEach((p, i) => check(`short point ${i + 1}`, p.h + ' ' + p.t, all + '\n' + extra));
Object.entries(S.p2 || {}).forEach(([f, v]) => { if (typeof v === 'string') check(`p2.${f}`, v, all + '\n' + extra); });
// The replay table: every cell, with the row's own tag carried to each of its numbers.
if (S.p2 && S.p2.replay) {
  const rp = S.p2.replay, splitRule = rd(path.join(PROG, 'SPLIT-RULE-2026-11.md'));
  check('p2.replay title', rp.title, splitRule);
  check('p2.replay cols', rp.cols.join(' | '), splitRule);
  rp.rows.forEach((r, i) => check(`p2.replay row ${i + 1}`, r.join(' | '), splitRule));
}
Object.entries(S.p3 || {}).forEach(([f, v]) => { if (typeof v === 'string') check(`p3.${f}`, v.replace('{ideas}', '484').replace('{themes}', '12'), all + '\n' + extra); });
(S.howMade || []).forEach((v, i) => check(`howMade ${i + 1}`, v, all + '\n' + extra));
// House typography.
const typo = (where, s) => { s = String(s || ''); if (/'/.test(s)) issues.push(`${where}: straight apostrophe`); if (/—/.test(s)) issues.push(`${where}: em dash`); if (/\d%/.test(s)) issues.push(`${where}: no space before %`); };
(S.blocks || []).forEach(b => typo(`block ${b.key}`, [b.title, b.what, b.measured, b.unmeasured].concat(b.ideas.map(i => i.name + ' ' + i.result)).join(' ')));
(S.metrics || []).forEach(m => typo(`metric ${m.key}`, [m.means, m.stand, m.limiter, m.gap].join(' ')));
console.log(issues.length ? issues.join('\n') : 'no issues');
console.log('issues', issues.length);
