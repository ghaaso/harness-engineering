'use strict';
// Part 6 and extras: oracle under each arm's block w schedule, ties, absent tasks, memorisation AUC (emb separates CO-scored from not).
const fs = require('fs');
const X = require('./lib.js');
const { late, comp, stageB, selB, get, ranked, rrf, fuse, diff, fb, mean, median, C, P } = X;
const out = []; const log = s => out.push(s);
const CH = { E1: 'c04', E2: 'c07', E3: 'c03', E4: 'c12', E5: 'c03' };
const sc = 'pool'; const cl = X.candLists(sc); const PPR = comp('PPR', sc), CO = comp('CO', sc);
const rrfP = new Map(); for (const t of late) { const c = cl.get(t.task_id) || []; rrfP.set(t.task_id, C.p10(ranked(t.task_id, c, rrf(t.task_id, c, get(PPR, t.task_id), get(CO, t.task_id))), t.truth)); }
for (const a of [...Object.keys(CH), 'PLACEBO']) {
  const ch = require(P('train', 'selectB', a, 'choices.json'));
  const wOf = new Map(); for (const b of ch.blocks) for (const c of b.commits) wOf.set(c, b.w);
  const pm = new Map(), hm = new Map();
  for (const t of late) { const tid = t.task_id, c = cl.get(tid) || [], T = new Set(t.truth), w = wOf.get(t.commit);
    const e = new Map(c.map(x => [x, T.has(x) ? 1 : 0])); pm.set(tid, C.p10(ranked(tid, c, fuse(tid, c, get(PPR, tid), get(CO, tid), e, w)), t.truth));
    const h = new Map(c.map(x => [x, C.tiebreak(tid + '#o', x) + (T.has(x) ? 0.5 : 0)])); hm.set(tid, C.p10(ranked(tid, c, fuse(tid, c, get(PPR, tid), get(CO, tid), h, w)), t.truth)); }
  const ws = ch.blocks.map(b => b.w).join(',');
  log(`${a} block w schedule ${ws}: ORACLE embedding at that schedule fused-RRF pool P@10 ${fb(diff(pm, rrfP))}; HALF oracle ${fb(diff(hm, rrfP))}`);
}
// ties and absent tasks, memorisation AUC
for (const a of Object.keys(CH)) {
  for (const s of [1]) {
    const E = stageB(a, CH[a], s, sc);
    let absent = 0, tieTasks = 0, tieTop = 0; const auc = [], aucT = [];
    for (const t of late) {
      const tid = t.task_id, e = E.get(tid); if (!e || e.size === 0) { absent++; continue; }
      const vals = [...e.values()]; if (new Set(vals).size < vals.length) tieTasks++;
      const top = ranked(tid, cl.get(tid) || [], e).slice(0, 10).map(c => e.get(c)); if (new Set(top).size < top.length) tieTop++;
      const co = get(CO, tid); const pos = [...e].filter(([c]) => co.has(c)).map(x => x[1]), neg = [...e].filter(([c]) => !co.has(c)).map(x => x[1]);
      if (pos.length && neg.length) { let g = 0; for (const p of pos) for (const n of neg) g += p > n ? 1 : p === n ? 0.5 : 0; auc.push(g / pos.length / neg.length); }
      const T = new Set(t.truth); const tp = [...e].filter(([c]) => T.has(c) && !co.has(c)).map(x => x[1]), tn = [...e].filter(([c]) => !T.has(c) && !co.has(c)).map(x => x[1]);
      if (tp.length && tn.length) { let g = 0; for (const p of tp) for (const n of tn) g += p > n ? 1 : p === n ? 0.5 : 0; aucT.push(g / tp.length / tn.length); }
    }
    log(`${a} s${s} pool: tasks absent/empty ${absent}; tasks with any tied score ${tieTasks}; with a tie inside the top 10 ${tieTop}; AUC emb separating CO-scored from non-CO candidates: median ${median(auc).toFixed(3)} mean ${mean(auc).toFixed(3)} (n=${auc.length}); AUC truth vs non-truth among non-CO candidates mean ${mean(aucT).toFixed(3)} (n=${aucT.length})`);
  }
}
// PPR AUC on the same non-CO truth question, for reference
{ const aucT = []; for (const t of late) { const tid = t.task_id, e = get(PPR, tid), co = get(CO, tid), T = new Set(t.truth); const c = cl.get(tid) || []; const tp = c.filter(x => T.has(x) && !co.has(x)).map(x => e.get(x) || 0), tn = c.filter(x => !T.has(x) && !co.has(x)).map(x => e.get(x) || 0); if (tp.length && tn.length) { let g = 0; for (const p of tp) for (const n of tn) g += p > n ? 1 : p === n ? 0.5 : 0; aucT.push(g / tp.length / tn.length); } } log(`PPR pool: AUC truth vs non-truth among non-CO candidates mean ${mean(aucT).toFixed(3)} (n=${aucT.length})`); }
fs.writeFileSync(__dirname + '/a3.out.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
