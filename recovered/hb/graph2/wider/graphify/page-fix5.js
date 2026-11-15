// One-off source edit for the owner page, section M (fix5, 2026-11-14): non-breaking space before % in M,
// per-kind table in a narrow-fit wrapper. Fails if any target text is missing.
'use strict';
const fs = require('fs');
const G = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/graph-test/';
function edit(file, pairs) {
  let s = fs.readFileSync(G + file, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(file + ': expected 1 match, got ' + n + ' for ' + a.slice(0, 60));
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(G + file, s);
  console.log('edited', file, pairs.length);
}
edit('build.js.txt', [
  ["const t3p = MS.t3byParent['G-1'];", "const t3p = MS.t3byParent['G-1'];\nconst pctn = x => pct(x).replace(' %', '\\u00a0%');"],
  ['Mobile-app seeds were ${pct(mobMix.heldout_share_of_tasks)} of held-out tasks against ${pct(mobMix.tuning_share_of_tasks)} on tuning',
   'Mobile-app seeds were ${pctn(mobMix.heldout_share_of_tasks)} of held-out tasks against ${pctn(mobMix.tuning_share_of_tasks)} on tuning'],
  ['The text is about ${MNF.longerPct} % longer', 'The text is about ${MNF.longerPct}\\u00a0% longer'],
  ['(a median ${MNF.driftMedianPct} % of printed nodes', '(a median ${MNF.driftMedianPct}\\u00a0% of printed nodes'],
  ['these are ${pct(MLK.onlyShare)} of the reference files', 'these are ${pctn(MLK.onlyShare)} of the reference files'],
  ["${fold('F1 by kind of question (held-out, 1 to 4 questions per kind)', table(['Kind of question', 'Questions', 'graphify (default)', 'typed store', 'scripted search'], kindRows) +",
   "${fold('F1 by kind of question (held-out, 1 to 4 questions per kind)', '<div class=\"mkind\">' + table(['Kind of question', 'Questions', 'graphify (default)', 'typed store', 'scripted search'], kindRows) + '</div>' +"]
]);
edit('src/page.css', [
  ['.lgaptab table.t{min-width:0;width:100%}', '.lgaptab table.t{min-width:0;width:100%}\n.mkind table.t{min-width:0;width:100%}.mkind table.t th,.mkind table.t td{padding:5px 4px;overflow-wrap:anywhere}']
]);
