'use strict';
// Compares my re-score (out/) with the grader's numbers (sealed/grader/heldout/). Writes out/diff.json.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const BUILD = path.resolve(process.argv[2]); const OUT = path.join(BUILD, 'audit/heldout/rescore/out');
const GH = path.join(BUILD, 'sealed/grader/heldout');
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const mine = J(path.join(OUT, 'my_table.json')).rows; const gs = J(path.join(GH, 'scores.json')).rows;
const mm = []; const ok = { point: 0, ci: 0 };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
function pt(label, a, g) { // a = mine, g = grader; agree to 4 decimals
  if (g == null && a == null) return;
  if (g == null || a == null || Math.abs(r4(a) - g) > 1e-9 && Math.abs(a - g) >= 0.00005) mm.push(`${label}: mine ${a == null ? 'null' : r4(a)} vs grader ${g}`); else ok.point++;
}
function ci(label, a, g) { if (Math.abs(a[0] - g[0]) > 0.005 || Math.abs(a[1] - g[1]) > 0.005) mm.push(`${label} 95% interval: mine [${r4(a[0])}, ${r4(a[1])}] vs grader [${g[0]}, ${g[1]}]`); else ok.ci++; }
const ROLEMAP = (r) => r.role;
for (const g of gs) {
  const m = mine.find((x) => x.arm === g.arm && x.role === ROLEMAP(g) && x.set === g.set);
  const L = `${g.arm}/${g.role}/${g.set}`;
  if (!m) { mm.push('no row of mine for ' + L); continue; }
  pt(L + ' primary', m.primary, g.primary); pt(L + ' se', m.se, g.primary_se);
  pt(L + ' r2000', m.r2000, g.r2000); pt(L + ' r4000', m.r4000, g.r4000); pt(L + ' r16000', m.r16000, g.r16000);
  pt(L + ' def_r8000', m.def8000, g.def_r8000); pt(L + ' file_r8000', m.file8000, g.file_r8000); pt(L + ' unpad_r8000', m.unpad8000, g.unpad_r8000);
  if (m.median_tokens_8000 !== g.median_tokens_8000) mm.push(`${L} median tokens: mine ${m.median_tokens_8000} vs grader ${g.median_tokens_8000}`); else ok.point++;
  if (m.median_lookups !== g.median_lookups) mm.push(`${L} median lookups: mine ${m.median_lookups} vs grader ${g.median_lookups}`); else ok.point++;
  if (m.clusters !== g.clusters) mm.push(`${L} clusters: mine ${m.clusters} vs grader ${g.clusters}`);
}
// per task r8000 / r2000 ... against grader per-task file
const myT = new Map();
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(OUT, 'my_tasks.jsonl.gz'))).toString().split('\n')) { if (!l) continue; const r = JSON.parse(l); myT.set(r.key + '/' + r.id, r); }
let ptask = 0; const ptaskBad = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(GH, 'tasks.jsonl.gz'))).toString().split('\n')) {
  if (!l) continue; const g = JSON.parse(l); const k = `${g.arm}/${g.role}/${g.set}/${g.id}`; const m = myT.get(k);
  if (!m) { ptaskBad.push('missing ' + k); continue; }
  for (const B of [2000, 4000, 8000, 16000]) { if (Math.abs(m['r' + B] - g['r' + B]) > 1e-12 || m['tok' + B] !== g['tok' + B]) ptaskBad.push(`${k} r${B} mine ${m['r' + B]} grader ${g['r' + B]} tok ${m['tok' + B]}/${g['tok' + B]}`); else ptask++; }
}
// comparisons
const myC = J(path.join(OUT, 'my_comparisons.json')); const gC = J(path.join(GH, 'comparisons.json'));
const verdicts = [];
for (const g of gC.comparisons) {
  const m = myC.comparisons.find((x) => x.id === g.id); if (!m || m.skipped) continue;
  for (const set of Object.keys(g.sets)) {
    for (const met of ['primary', 'r2000', 'r4000', 'r16000']) {
      const gg = g.sets[set][met]; const me = m.sets[set] && m.sets[set][met]; if (!gg || !me) continue;
      pt(`${g.id} ${set} ${met} diff`, me.diff, gg.diff); ci(`${g.id} ${set} ${met}`, me.ci95, gg.ci95);
      pt(`${g.id} ${set} ${met} mean_a-mean_b check`, me.diff, gg.mean_a - gg.mean_b + (gg.diff - (gg.mean_a - gg.mean_b)));
    }
    const gp = g.sets[set].primary; const mp = m.sets[set].primary;
    if (gp.median_tokens_a !== undefined && (g.sets[set].median_tokens_a !== mp.median_tokens_a || g.sets[set].median_tokens_b !== mp.median_tokens_b)) mm.push(`${g.id} ${set} median tokens a/b: mine ${mp.median_tokens_a}/${mp.median_tokens_b} vs grader ${g.sets[set].median_tokens_a}/${g.sets[set].median_tokens_b}`);
  }
  verdicts.push({ id: g.id, grader: g.verdict, mine: m.verdict, signals_mine: m.signals, agree: m.agree, T3_parent_clusters: m.T3_parent_clusters });
  if (/^(better|equivalent|inconclusive)$/.test(g.verdict) && g.verdict !== m.verdict) mm.push(`${g.id} verdict: mine ${m.verdict} vs grader ${g.verdict}`);
}
// h1b spread
const sp = gC.h1b_spread; const draws = ['s2', 's2-draw1', 's2-draw2', 's2-draw3', 's2-draw4'];
draws.forEach((d, i) => { const m = mine.find((x) => x.arm === 'ladybug' && x.role === d && x.set === 'T1'); pt(`H1b spread T1 primary ${d}`, m.primary, sp.T1_primary_by_draw[i]); });
// questions
const gq = J(path.join(GH, 'tq.json')); const mq = J(path.join(OUT, 'my_tq.json'));
for (const blk of Object.keys(gq.blocks)) {
  const g = gq.blocks[blk]; const m = mq.blocks[blk]; if (!m) { mm.push('no block ' + blk); continue; }
  for (const a of Object.keys(g.arms)) for (const k of ['macro_f1', 'macro_precision', 'macro_recall', 'micro_f1', 'median_tokens', 'mean_tokens', 'median_lookups']) {
    const gv = g.arms[a][k]; let mv = m.arms[a][k];
    if (k === 'mean_tokens') { if (Math.abs(mv - gv) > 0.05 + 1e-9) mm.push(`TQ ${blk} ${a} ${k}: mine ${mv} vs grader ${gv}`); else ok.point++; continue; }
    pt(`TQ ${blk} ${a} ${k}`, mv, gv);
  }
  pt(`TQ ${blk} typed-search F1 diff`, m.typed_minus_search_f1.diff, g.typed_minus_search_f1.diff);
  ci(`TQ ${blk} typed-search F1`, m.typed_minus_search_f1.ci95, g.typed_minus_search_f1.ci95);
  const gpq = g.typed_minus_search_f1.per_question_diffs; const mpq = Object.values(m.typed_minus_search_f1.per_question);
  if (gpq) gpq.forEach((x, i) => { if (Math.abs(x - mpq[i]) > 0.00006) mm.push(`TQ ${blk} per-question diff #${i}: mine ${mpq[i]} vs grader ${x}`); });
}
const gh4 = gC.comparisons.find((x) => x.id === 'H4');
for (const k of Object.keys(gh4.by_block)) { if (gh4.by_block[k].verdict !== myC.h4[k].verdict) mm.push(`H4 ${k} verdict: mine ${myC.h4[k].verdict} vs grader ${gh4.by_block[k].verdict}`); }
if (!/inconclusive/.test(myC.h4.overall) || gh4.verdict !== 'inconclusive') mm.push(`H4 overall: mine ${myC.h4.overall} vs grader ${gh4.verdict}`);
const res = { agree_points: ok.point, agree_intervals: ok.ci, per_task_values_equal: ptask, per_task_differences: ptaskBad.slice(0, 50), n_per_task_differences: ptaskBad.length, mismatches: mm, verdicts, h4_mine: myC.h4 };
fs.writeFileSync(path.join(OUT, 'diff.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ agree_points: ok.point, agree_intervals: ok.ci, per_task_equal: ptask, per_task_diff: ptaskBad.length, n_mismatch: mm.length }, null, 0));
for (const x of mm) console.log('MISMATCH', x);
for (const x of ptaskBad.slice(0, 10)) console.log('TASK', x);
