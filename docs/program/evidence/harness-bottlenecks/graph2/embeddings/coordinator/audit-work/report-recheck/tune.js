const fs = require('fs');
const B = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/';
const t = JSON.parse(fs.readFileSync(B + 'train/report/tune.json', 'utf8'));
const c = t.contrasts.late50;
for (const sc of ['pool', 'unrestricted']) for (const k of Object.keys(c[sc])) { const v = c[sc][k].vs_RRF && c[sc][k].vs_RRF['P@10']; if (v) console.log(sc, k, v.diff, v.lo, v.hi, c[sc][k].word || ''); }
console.log('pilot_shared', JSON.stringify(t.contrasts.late50_pilot_shared && t.contrasts.late50_pilot_shared.pool && t.contrasts.late50_pilot_shared.pool.E1_fused).slice(0, 600));
console.log('placebo', JSON.stringify(t.harness_check && t.harness_check.placebo_fixed_w_late50_pool_P10_vs_RRF));
for (const a of Object.keys(t.choices)) {
  const ch = t.choices[a];
  console.log('CHOICE', a, JSON.stringify(ch.final_all65));
  for (const b of ch.blocks || []) { const cs = b.candidates; const arr = Array.isArray(cs) ? cs : Object.values(cs); console.log('  block', arr.map(x => x.mean.toFixed(4) + '/' + x.se.toFixed(4)).join(' ')); }
}
const g = JSON.parse(fs.readFileSync(B + 'grader-returns/tune-item24.json', 'utf8'));
console.log(JSON.stringify(g.labels ? Object.fromEntries(Object.entries(g.labels).map(([k, v]) => [k, v.vs_RRF ? v.vs_RRF.primary : v])) : Object.keys(g)));
