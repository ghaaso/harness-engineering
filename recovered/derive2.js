// One-off, second pass: the remaining hand-typed counts in build.js.txt.
const fs = require('fs');
const p = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/graph-test/build.js.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "for (const [k, v] of Object.entries(N)) if (v == null) throw new Error('count missing from data: ' + k);\n";
if (!s.includes(anchor)) throw new Error('anchor missing');
if (!s.includes('N.inv =')) {
  s = s.replace(anchor,
`{ const m = d.trust.timeline.map(t => t.what).join(' ').match(/(\\d+) of (\\d+) declared invocations/); N.inv = m && +m[1]; N.invT = m && +m[2];
  const j = d.questions.judgement_items_note.match(/the (\\d+) answer items/); N.jud = j && +j[1]; N.t3g = d.t3.parent_document_groups; }
` + anchor);
}
const R = [
  ["'Typed queries scored higher, but not provably on all 30 questions'", "`Typed queries scored higher, but not provably on all ${N.q} questions`"],
  ["Lines from top: all 30 questions; the 23 first listed as untouched; the 22 whose", "Lines from top: all ${N.q} questions; the ${N.q23} first listed as untouched; the ${N.q22} whose"],
  ["'with the 7 judgement items'", "'with the ' + N.jud + ' judgement items'"],
  ["The rule decides on all 30 questions and turns inconclusive when the 23 or the 22 questions give a different verdict. On 23 and on 22 questions", "The rule decides on all ${N.q} questions and turns inconclusive when the ${N.q23} or the ${N.q22} questions give a different verdict. On ${N.q23} and on ${N.q22} questions"],
  ['<p class="note">On 23 questions: ', '<p class="note">On ${N.q23} questions: '],
  ['on the 20 tuning questions.', 'on the ${N.qtu} tuning questions.'],
  ['◇ touched marks the 8 questions', '◇ touched marks the ${N.q8} questions'],
  ["[['all30', 'all 30'], ['addendum5_list23', '23']", "[['all30', 'all ' + N.q], ['addendum5_list23', String(N.q23)]"],
  ['<p class="note">8 questions had their handling', '<p class="note">${N.q8} questions had their handling'],
  ['F1 higher on all 30 questions, with an interval', 'F1 higher on all ${N.q} questions, with an interval'],
  ['inconclusive; on the 22 untouched questions the', 'inconclusive; on the ${N.q22} untouched questions the'],
  ['ran once (89 of 89 invocations, no repeat)', 'ran once (${N.inv} of ${N.invT} invocations, no repeat)'],
  ['The weak points are named: 8 questions changed', 'The weak points are named: ${N.q8} questions changed'],
  [': inconclusive. On 22 untouched questions', ': inconclusive. On ${N.q22} untouched questions'],
  ['positive in all 5 parent-and-document groups', 'positive in all ${N.t3g} parent-and-document groups'],
];
const counts = [];
for (const [a, b] of R) { const n = s.split(a).length - 1; counts.push(n + '  ' + a.slice(0, 70)); s = s.split(a).join(b); }
fs.writeFileSync(p, s);
console.log(counts.join('\n'));
