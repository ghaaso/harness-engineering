// Checks the condensed text of the short edition against the records it came from.
// Every number in a theme card, bottleneck pick, package row or "Before you start" item must appear in its
// source record, and a number followed by a tag must carry the same tag there. Prints what does not match.
// Usage: node short-check.cjs [short.json path]
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const load = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const S = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : load('short.json');
const cat = load('catalogue.json'), reg = load('register.json'), pk = load('packages.json'), gl = load('glossary.json');

// Numbers are compared without thousands separators; "855.2" and "855,2" are not merged.
// Ids (D02, WP10a, MAC-16, KS-D1b, PR #185, P0a, R2, B3-LOOP) are not numbers, so they are taken out first.
const norm = s => String(s || '')
  .replace(/(?<![\w.])(?:[A-Z][A-Za-z]*-)*[A-Z][A-Za-z]*\d+[a-z]?(?:-[A-Z]+)?(?!\w|\.\w)/g, ' ID ')
  .replace(/#\d+/g, ' ID ')
  .replace(/(\d),(\d{3})/g, '$1$2').replace(/[–—]/g, '-').replace(/×/g, 'x');
const NUM = /\d+(?:\.\d+)?/g;
// A tagged number: the number, up to 24 characters of unit or words with no other digit, then the tag.
const TAGGED = /(\d+(?:\.\d+)?)[^\d\[\]]{0,24}?\[(M|E|G|S|T|I)\]/g;
const nums = s => (norm(s).match(NUM) || []);
const tagged = s => { const out = []; let m; const t = norm(s); TAGGED.lastIndex = 0; while ((m = TAGGED.exec(t))) out.push([m[1], m[2]]); return out; };
const issues = [];
function check(where, text, src) {
  const t = norm(text), s = norm(src);
  const have = new Set(nums(s));
  nums(t).forEach(n => { if (!have.has(n)) issues.push(`${where}: number ${n} is not in the source`); });
  const srcTags = tagged(s);
  tagged(t).forEach(([n, tag]) => {
    const forN = srcTags.filter(x => x[0] === n).map(x => x[1]);
    if (!forN.length) { if (have.has(n)) issues.push(`${where}: ${n} [${tag}] has no tag in the source`); }
    else if (!forN.includes(tag)) issues.push(`${where}: ${n} [${tag}] is tagged [${forN.join('/')}] in the source`);
  });
}
const ideaText = i => ['name', 'how', 'problem', 'stands', 'next', 'origin'].map(f => i[f] || '').join(' ');
const allIdeas = [].concat(...cat.themes.map(t => t.ideas));

(S.themes || []).forEach(st => {
  const t = cat.themes.find(x => x.code === st.code);
  if (!t) { issues.push(`theme ${st.code}: no such theme`); return; }
  const themeSrc = (t.intro || []).join(' ') + ' ' + t.ideas.map(ideaText).join(' ') + ' ' + (t.covers || '');
  check(`${st.code} summary`, st.summary, themeSrc + ' ' + pk.packages.map(p => [p.id, p.goal, p.first, p.done, p.mine].join(' ')).join(' ') + ' ' + pk.decisions.map(d => d.id + ' ' + d.q).join(' '));
  (st.key || []).forEach(k => {
    const i = t.ideas.find(x => x.id === k.id);
    if (!i) { issues.push(`${st.code} key ${k.id}: not an idea of this theme`); return; }
    check(`${st.code} ${k.id} name`, k.name, ideaText(i));
    check(`${st.code} ${k.id} line`, k.line, ideaText(i) + ' ' + pk.decisions.map(d => d.id).join(' ') + ' ' + pk.packages.map(p => p.id).join(' '));
  });
});
(S.picks || []).forEach(p => {
  const b = reg.bottlenecks.find(x => x.id === p.id);
  if (!b) { issues.push(`pick ${p.id}: not in the register`); return; }
  const src = Object.values(b).filter(v => typeof v === 'string').join(' ');
  check(`pick ${p.id} name`, p.name, src);
  check(`pick ${p.id} big`, p.big, src);
  check(`pick ${p.id} unlocks`, p.unlocks, src);
  if (p.wp && b.wp && p.wp !== b.wp) issues.push(`pick ${p.id}: wp ${p.wp} but the register says ${b.wp}`);
});
(S.rows || []).forEach(r => {
  const p = pk.packages.find(x => x.id === r.id);
  if (!p) { issues.push(`row ${r.id}: no such package`); return; }
  const src = Object.values(p).filter(v => typeof v === 'string').join(' ') + ' ' + JSON.stringify(p.dependsOn || []) + ' ' + pk.decisions.map(d => [d.id, d.q, d.when, d.unblocks].join(' ')).join(' ');
  ['goal', 'first', 'done', 'waits'].forEach(f => check(`row ${r.id} ${f}`, r[f], src));
  const ids = s => (String(s || '').match(/\b(?:D\d{2}|KS-D\d+b?|GT-\d|P0a|PR ?#?\d{3}|WP\d+[a-z]?)\b/g) || []);
  const lost = ids(p.mine).filter(x => !String(r.waits + ' ' + r.first + ' ' + r.done).includes(x));
  if (lost.length) issues.push(`row ${r.id}: ids in “Waiting on me” not carried: ${[...new Set(lost)].join(', ')}`);
});
(S.before || []).forEach((b, k) => {
  const src = pk.before.map(x => x.join(' ')).join(' ');
  check(`before ${k + 1} ${b.title}`, b.title + ' ' + b.text, src);
});
Object.entries(S.glossShort || {}).forEach(([key, s]) => {
  const t = gl.terms.find(x => x.key === key);
  if (!t) { issues.push(`glossary ${key}: no such term`); return; }
  check(`glossary ${key} ${t.term}`, s.def + ' ' + s.from, t.term + ' ' + t.definition + ' ' + t.origin);
});
// House typography: no straight apostrophes or em dashes in printed text, ranges with an en dash.
const typo = (where, s) => {
  s = String(s || '');
  if (/'/.test(s)) issues.push(`${where}: straight apostrophe`);
  if (/—/.test(s)) issues.push(`${where}: em dash`);
  if (/\d-\d/.test(s.replace(/\b[A-Z]+-\d+|\d{4}-\d{2}-\d{2}|[A-Z]\d+-[A-Z]?\d+/g, ''))) issues.push(`${where}: hyphen in a number range: ${s.match(/\S*\d-\d\S*/)[0]}`);
};
(S.themes || []).forEach(t => { typo(`${t.code} summary`, t.summary); (t.key || []).forEach(k => { typo(`${t.code} ${k.id}`, k.name + ' ' + k.line); }); });
(S.picks || []).forEach(p => typo(`pick ${p.id}`, [p.name, p.big, p.unlocks].join(' ')));
(S.rows || []).forEach(r => typo(`row ${r.id}`, [r.goal, r.first, r.done, r.waits].join(' ')));
(S.before || []).forEach(b => typo(`before ${b.title}`, b.title + ' ' + b.text));
Object.entries(S.glossShort || {}).forEach(([key, s]) => typo(`glossary ${key}`, s.def + ' ' + s.from));
console.log(issues.length ? issues.join('\n') : 'no issues');
console.log('issues', issues.length);
