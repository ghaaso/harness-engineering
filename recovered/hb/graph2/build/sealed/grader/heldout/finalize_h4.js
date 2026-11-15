'use strict';
// HELD-OUT scoring, step 3: the H4 verdict (addendum 3 item 16, addendum 5 item 5) and the H5 note,
// added to comparisons.json, tq.json and report_data.json. Wording rule of addendum 3 item 18 applied
// to the questions: "better" only if the 95 % interval of the macro F1 difference excludes zero, the
// winner's median tokens per question are no higher, and the sign agrees on at least three of T1, T2,
// T3 (typed primary - search primary, H3) and the questions; "equivalent" if the whole interval lies
// within +-0.05 F1; otherwise "inconclusive". The verdict uses all 30 questions; if the 23 untouched
// questions give a different sign or verdict, H4 is inconclusive and both are shown.
const fs = require('fs');
const path = require('path');
const OUT = __dirname;
const cmp = JSON.parse(fs.readFileSync(path.join(OUT, 'comparisons.json'), 'utf8'));
const tq = JSON.parse(fs.readFileSync(path.join(OUT, 'tq.json'), 'utf8'));
const rep = JSON.parse(fs.readFileSync(path.join(OUT, 'report_data.json'), 'utf8'));
const h3 = cmp.comparisons.find((c) => c.id === 'H3-search');
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const setSigns = { T1: sgn(h3.sets.T1.primary.diff_exact), T2: sgn(h3.sets.T2.primary.diff_exact), T3: sgn(h3.sets.T3.primary.diff_exact) };
function v(block) {
  const d = block.typed_minus_search_f1; const ci = d.ci95;
  const tokT = block.arms.relational.median_tokens; const tokS = block.arms.search.median_tokens;
  const signals = { ...setSigns, TQ: sgn(d.diff) };
  const lab = Object.entries(signals).map(([k, x]) => k + (x > 0 ? '+' : x < 0 ? '-' : '0')).join(', ');
  if (d.excludes_zero) {
    const dir = sgn(d.diff); const agree = Object.values(signals).filter((x) => x === dir).length;
    const tokW = dir > 0 ? tokT : tokS; const tokL = dir > 0 ? tokS : tokT;
    if (tokW <= tokL && agree >= 3) return { verdict: 'better', winner: dir > 0 ? 'typed stores' : 'search', decided_by: `F1 interval [${ci}] excludes zero; median tokens per question ${tokW} <= ${tokL}; sign agrees on ${agree} of 4 (${lab}).` };
    if (ci[0] >= -0.05 && ci[1] <= 0.05) return { verdict: 'equivalent', winner: null, decided_by: `interval [${ci}] within +-0.05 (the "better" conditions failed).` };
    return { verdict: 'inconclusive', winner: null, decided_by: `interval [${ci}] excludes zero but tokens or sign agreement fail (${lab}).` };
  }
  if (ci[0] >= -0.05 && ci[1] <= 0.05) return { verdict: 'equivalent', winner: null, decided_by: `the whole F1 interval [${ci}] lies within +-0.05.` };
  return { verdict: 'inconclusive', winner: null, decided_by: `the F1 interval [${ci}] includes zero and is not inside +-0.05.` };
}
const res = {};
for (const k of Object.keys(tq.blocks)) res[k] = { diff: tq.blocks[k].typed_minus_search_f1.diff, ci95: tq.blocks[k].typed_minus_search_f1.ci95, ...v(tq.blocks[k]) };
const a30 = res.all30_with_judgement; const a23 = res.untouched23_with_judgement;
let final = a30.verdict; let why = 'verdict of all 30 questions (with the shared judgement items, as scored).';
if (sgn(a30.diff) !== sgn(a23.diff) || a30.verdict !== a23.verdict) { final = 'inconclusive'; why = `the 23 untouched questions give ${a23.verdict} (difference ${a23.diff} [${a23.ci95}]) while all 30 give ${a30.verdict} (difference ${a30.diff} [${a30.ci95}]); addendum 5 item 5 then makes H4 inconclusive, and both are shown.`; }
const h4 = { id: 'H4', group: 'H4', a: 'typed stores (relational; LadybugDB and DuckPGQ answered identically on all 30)', b: 'search', verdict: final, decided_by: why, by_block: res,
  graph_arms_identical: tq.typed_answers_identical_to_relational,
  rule: 'addendum 3 item 18 applied to macro F1 over questions; signals T1, T2, T3 from H3 (typed primary - search primary) plus the question F1 sign; paired bootstrap over questions, 10,000 resamples, seed 20261112' };
const h5 = { id: 'H5', group: 'H5', verdict: 'not measured here', note: 'Engine measures (H5) are taken after the held-out grading by another lane (addendum 5 section C) and change no answer-quality verdict.' };
cmp.comparisons = cmp.comparisons.filter((c) => c.id !== 'H4' && c.id !== 'H5').concat([h4, h5]);
tq.h4 = h4;
rep.comparisons = rep.comparisons.filter((c) => c.id !== 'H4' && c.id !== 'H5').concat([h4, h5]);
fs.writeFileSync(path.join(OUT, 'comparisons.json'), JSON.stringify(cmp, null, 1));
fs.writeFileSync(path.join(OUT, 'tq.json'), JSON.stringify(tq, null, 1));
fs.writeFileSync(path.join(OUT, 'report_data.json'), JSON.stringify(rep, null, 1));
console.log(JSON.stringify(h4, null, 1));
