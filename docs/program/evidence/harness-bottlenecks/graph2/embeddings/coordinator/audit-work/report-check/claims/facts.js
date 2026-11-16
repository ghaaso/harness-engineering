const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const J = p => JSON.parse(fs.readFileSync(L + p, 'utf8'));
for (const r of ['1', '2']) {
  const j = J('orchestrator/step10-audit-round' + r + '.json');
  console.log('ROUND', r, 'what', JSON.stringify(j.what).slice(0, 300));
  console.log(' workflow_run', JSON.stringify(j.workflow_run).slice(0, 600));
  console.log(' agents_total', j.agents_total, 'verdicts', JSON.stringify(j.verdicts));
  let checks = 0;
  for (const [k, a] of Object.entries(j.result.agents)) { const n = Array.isArray(a.checks) ? a.checks.length : (a.checks && typeof a.checks === 'object' ? Object.keys(a.checks).length : 0); checks += n; process.stdout.write(' ' + k + ':' + n); }
  console.log('\n checks total', checks, 'verified', j.result.verified.length, 'unverified', (j.result.unverified || []).length);
}
const t = J('train/report/tune.json');
for (const sc of ['pool', 'unrestricted']) for (const a of ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']) for (const k of ['fused', 'alone']) {
  const c = t.contrasts.late50[sc][a + '_' + k];
  if (c) { const x = c.vs_RRF['P@10']; console.log(sc, a, k, x.diff.toFixed(4), x.lo.toFixed(4), x.hi.toFixed(4), t.verdicts.late50[a] ? t.verdicts.late50[a][k + '_' + sc] : ''); }
}
console.log('pilot_shared');
const ps = t.contrasts.late50_pilot_shared;
if (ps) for (const sc of ['pool']) for (const a of ['E1', 'E2', 'E3', 'E4', 'E5']) { const c = ps[sc][a + '_fused']; if (c) { const x = c.vs_RRF['P@10']; console.log(sc, a, x.diff.toFixed(4), x.lo.toFixed(4), x.hi.toFixed(4)); } }
const i24 = J('grader-returns/tune-item24.json');
for (const [k, v] of Object.entries(i24.labels)) if (/mean|RRF/.test(k)) console.log('AL', k, v.mean && v.mean.primary, v.vs_RRF ? JSON.stringify(v.vs_RRF.primary) : '');
