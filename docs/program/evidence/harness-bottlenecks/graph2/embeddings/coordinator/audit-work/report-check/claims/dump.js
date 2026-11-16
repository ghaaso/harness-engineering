const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/';
const out = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/report-check/claims/';
for (const r of ['1', '2']) {
  const j = JSON.parse(fs.readFileSync(L + 'step10-audit-round' + r + '.json', 'utf8'));
  const res = j.result;
  let s = 'TOP KEYS: ' + Object.keys(j).join(',') + '\nRESULT KEYS: ' + Object.keys(res).join(',') + '\n';
  for (const [k, a] of Object.entries(res.agents)) {
    s += '\n==== AGENT ' + k + ' verdict=' + a.verdict + '\nSUMMARY: ' + a.summary + '\n';
    for (const f of a.findings || []) {
      s += '-- ' + f.id + ' [' + f.severity + '] ' + f.title + '\n   CLAIM: ' + f.claim + '\n   EVID: ' + (typeof f.evidence === 'string' ? f.evidence : JSON.stringify(f.evidence)).slice(0, 1500) + '\n';
    }
    s += 'NOT_CHECKED: ' + JSON.stringify(a.not_checked) + '\n';
  }
  s += '\n\n######## VERIFIED\n';
  for (const v of res.verified || []) {
    s += '\n== ' + JSON.stringify(v.finding).slice(0, 400) + '\n   OUTCOME: ' + v.verdict.outcome + ' sev=' + v.verdict.severity + '\n   REASON: ' + v.verdict.reason + '\n   CORRECTED: ' + v.verdict.corrected_claim + '\n';
  }
  if (res.unverified) s += '\n######## UNVERIFIED\n' + JSON.stringify(res.unverified, null, 1);
  if (res.critic) s += '\n######## CRITIC\n' + JSON.stringify(res.critic, null, 1);
  fs.writeFileSync(out + 'round' + r + '.txt', s);
  console.log(r, s.length);
}
