// One-off, third pass: hand-typed counts in src/client.js.txt read from D.N (the build's data-derived counts) instead.
const fs = require('fs');
const root = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/graph-test/';
// 1. the build passes N to the client
let b = fs.readFileSync(root + 'build.js.txt', 'utf8');
if (!b.includes('  engines: d.engines,\n  N,\n')) {
  if (!b.includes('  engines: d.engines,\n  tuneSE\n')) throw new Error('P anchor missing');
  b = b.replace('  engines: d.engines,\n  tuneSE\n', '  engines: d.engines,\n  N,\n  tuneSE\n');
  fs.writeFileSync(root + 'build.js.txt', b);
}
// 2. the client reads them
const p = root + 'src/client.js.txt';
let s = fs.readFileSync(p, 'utf8');
const HC = "D.splits.heldout_counts";
const R = [
  ["' (held-out, 75 commits)'}", "' (held-out, '+D.N.ho+' commits)'}"],
  ["lab:'all 75 commits',tip:'All 75 commits: '", "lab:'all '+D.N.ho+' commits',tip:'All '+D.N.ho+' commits: '"],
  ["'Seeds in the mobile app (31 commits): '", "'Seeds in the mobile app ('+" + HC + ".mobile.commits+' commits): '"],
  ["'Seeds outside the mobile app (48 commits): '", "'Seeds outside the mobile app ('+" + HC + ".not_mobile.commits+' commits): '"],
  ["lab:'30',tip:'All 30 questions: F1 '", "lab:String(D.N.q),tip:'All '+D.N.q+' questions: F1 '"],
  ["lab:'23',tip:'23 questions (list first written): '", "lab:String(D.N.q23),tip:D.N.q23+' questions (list first written): '"],
  ["lab:'22',tip:'22 untouched questions: '", "lab:String(D.N.q22),tip:D.N.q22+' untouched questions: '"],
  ["var SENS=[['full','all 75 commits (as scored)']", "var SENS=[['full','all '+D.N.ho+' commits (as scored)']"],
  ["label:'leave one commit out, 75 times'", "label:'leave one commit out, '+D.N.ho+' times'"],
  ["tip:'Each of the 75 commits left out in turn:", "tip:'Each of the '+D.N.ho+' commits left out in turn:"],
  ["[['by_task','clustered by task (as scored): 25'],['by_parent_commit','clustered by parent commit: 4'],['by_parent_and_document','clustered by parent and document: 5']].map(function(s){ var v=c[s[0]]; return {label:s[1],",
   "[['by_task','clustered by task (as scored)'],['by_parent_commit','clustered by parent commit'],['by_parent_and_document','clustered by parent and document']].map(function(s){ var v=c[s[0]]; s=[s[0],s[1]+': '+v.n_clusters]; return {label:s[1],"],
  ["var total=770;", "var total=parseInt(String(I.shown_answers_identical_to_reference_arm[s[0]]).split(' of ')[1],10);"],
  ["every square is one held-out task (770). Filled", "every square is one held-out task ('+total+'). Filled"],
  ["'Change completion (T1), 75 commits'", "'Change completion (T1), '+D.N.ho+' commits'"],
  ["'Tests to update (T2), 49 commits'", "'Tests to update (T2), '+D.N.t2+' commits'"],
  ["'Documented chains (T3), 25 tasks'", "'Documented chains (T3), '+D.N.t3+' tasks'"],
  ["'), tuning, 65 commits\\nchange against '", "'), tuning, '+D.N.tu+' commits\\nchange against '"],
  ["' (tuning, 65 commits)\\n'", "' (tuning, '+D.N.tu+' commits)\\n'"],
  ["[['all30','all 30 held-out questions'],['addendum5_list23','23 questions (the untouched list as first written)'],['untouched22','22 questions untouched in every arm'],['touched8','8 questions whose",
   "[['all30','all '+D.N.q+' held-out questions'],['addendum5_list23',D.N.q23+' questions (the untouched list as first written)'],['untouched22',D.N.q22+' questions untouched in every arm'],['touched8',D.N.q8+' questions whose"],
  ["[['all30','all 30 questions'],['addendum5_list23','23 questions (list first written)'],['untouched22','22 untouched questions']]",
   "[['all30','all '+D.N.q+' questions'],['addendum5_list23',D.N.q23+' questions (list first written)'],['untouched22',D.N.q22+' untouched questions']]"],
  ["axis:'first-written choice minus amended choice (held-out, 75 commits)'", "axis:'first-written choice minus amended choice (held-out, '+D.N.ho+' commits)'"],
];
const counts = [];
for (const [a, c] of R) { const n = s.split(a).length - 1; counts.push(n + '  ' + a.slice(0, 70)); s = s.split(a).join(c); }
fs.writeFileSync(p, s);
console.log(counts.join('\n'));
