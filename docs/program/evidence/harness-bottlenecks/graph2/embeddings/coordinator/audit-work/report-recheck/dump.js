const fs = require('fs');
const L = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/orchestrator/';
const [,, round, mode, ...ids] = process.argv;
const j = JSON.parse(fs.readFileSync(L + `step10-audit-round${round}.json`, 'utf8'));
const r = j.result;
if (mode === 'keys') { console.log(Object.keys(r)); console.log(Object.keys(r.agents||{})); return; }
if (mode === 'list') {
  for (const [k, a] of Object.entries(r.agents)) for (const f of (a.findings||[])) console.log(k, f.id, f.severity, '|', f.title);
  for (const v of r.verified||[]) console.log('VER', v.finding.from, v.finding.id, v.verdict.outcome, '|', v.finding.title);
  return;
}
if (mode === 'find') {
  for (const [k, a] of Object.entries(r.agents)) for (const f of (a.findings||[])) if (ids.includes(f.id)) console.log(JSON.stringify({agent:k, ...f}, null, 1));
  for (const v of r.verified||[]) if (ids.includes(v.finding.id)) console.log('VERIFIED', JSON.stringify(v, null, 1));
  return;
}
if (mode === 'agent') { const a = r.agents[ids[0]]; console.log(JSON.stringify({summary:a.summary, checks:a.checks, not_checked:a.not_checked}, null, 1)); return; }
if (mode === 'grep') { const s = JSON.stringify(r); const re = new RegExp(ids[0], 'g'); let m; while ((m = re.exec(s))) console.log(s.slice(Math.max(0,m.index-300), m.index+300).replace(/\\n/g,' '), '\n---'); }
