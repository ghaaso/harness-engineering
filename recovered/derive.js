// One-off: replace hand-typed counts in build.js.txt with values read from data.json.
const fs = require('fs');
const p = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/graph-test/build.js.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "const set = id => d.sets.find(s => s.id === id);\n";
if (!s.includes(anchor)) throw new Error('anchor missing');
if (!s.includes('const N = {')) {
  s = s.replace(anchor, anchor +
`// Counts shown in prose and tags, read from the data (never typed by hand).
const QB = k => { const b = d.questions.blocks; const key = Object.keys(b).find(x => x.startsWith(k)); return key ? b[key].n_questions : null; };
const N = { ho: set('T1').heldout.commits, tu: set('T1').tuning.commits, tasks: set('T1').heldout.tasks, t2: set('T2').heldout.commits,
  t3: d.t3.tasks, t3p: d.t3.parents, t3d: d.t3.documents, q: set('TQ').heldout.questions, q23: QB('addendum5_list23'), q22: QB('untouched22'),
  q8: d.questions.touched_questions.length, qtu: d.questions.tuning.questions };
for (const [k, v] of Object.entries(N)) if (v == null) throw new Error('count missing from data: ' + k);
`);
}
const R = [
  ["tagHO('75 commits')", "tagHO(N.ho + ' commits')"],
  ["tagTU('65 commits')", "tagTU(N.tu + ' commits')"],
  ["tagTU('65 commits, optimis", "tagTU(N.tu + ' commits, optimis"],
  ["tagHO('75 commits for change completion')", "tagHO(N.ho + ' commits for change completion')"],
  ["tagHO('418 tasks')", "tagHO(N.tasks + ' tasks')"],
  ["tagHO('25 tasks from 4 parent commits, 3 documents')", "tagHO(N.t3 + ' tasks from ' + N.t3p + ' parent commits, ' + N.t3d + ' documents')"],
  ["tagHO('30 questions')", "tagHO(N.q + ' questions')"],
  ["tagHO('30, 23, 22 and 8 questions')", "tagHO(N.q + ', ' + N.q23 + ', ' + N.q22 + ' and ' + N.q8 + ' questions')"],
  ["(held-out, 75 commits)", "(held-out, ${N.ho} commits)"],
  ["(tuning, 65 commits, optimistic)", "(tuning, ${N.tu} commits, optimistic)"],
  ["(held-out, 30 questions)", "(held-out, ${N.q} questions)"],
  ["L.push('## Held-out recall at 8,000 tokens (change completion, 75 commits)', '')", "L.push(`## Held-out recall at 8,000 tokens (change completion, ${N.ho} commits)`, '')"],
  ["Documented chains (25 tasks, 4 parent commits)", "Documented chains (${N.t3} tasks, ${N.t3p} parent commits)"],
];
const counts = [];
for (const [a, b] of R) { const n = s.split(a).length - 1; counts.push(n + '  ' + a); s = s.split(a).join(b); }
fs.writeFileSync(p, s);
console.log(counts.join('\n'));
