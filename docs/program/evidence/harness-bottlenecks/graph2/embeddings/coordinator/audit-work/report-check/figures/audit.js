const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/';
const mode = process.argv[2];
const files = { r1: 'step10-audit-round1.json', r2: 'step10-audit-round2.json' };
if (mode === 'struct') {
  for (const [r, f] of Object.entries(files)) {
    const j = JSON.parse(fs.readFileSync(L + f, 'utf8'));
    console.log(r, 'top', Object.keys(j), 'result', Object.keys(j.result));
    for (const [k, a] of Object.entries(j.result.agents)) {
      console.log(`  ${r}.${k}: verdict=${a.verdict} findings=${(a.findings||[]).length} checks=${Array.isArray(a.checks)?a.checks.length:typeof a.checks}`);
      for (const fd of a.findings || []) console.log(`     ${fd.id} [${fd.severity}] ${fd.title}`);
    }
    console.log('  verified', j.result.verified.length);
    for (const v of j.result.verified) console.log(`     ${typeof v.finding==='string'?v.finding:JSON.stringify(v.finding).slice(0,100)} -> ${v.verdict.outcome} / ${v.verdict.severity}`);
  }
} else if (mode === 'grep') {
  const re = new RegExp(process.argv[3], 'g');
  const ctx = +(process.argv[4] || 200);
  for (const [r, f] of Object.entries(files)) {
    const j = JSON.parse(fs.readFileSync(L + f, 'utf8'));
    const walk = (o, p) => {
      if (typeof o === 'string') {
        let m; re.lastIndex = 0;
        while ((m = re.exec(o))) { console.log(`${r}:${p} :: ...${o.slice(Math.max(0, m.index - ctx), m.index + ctx).replace(/\n/g, ' ')}...`); }
      } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p + '.' + k);
    };
    walk(j, '');
  }
} else if (mode === 'show') {
  const j = JSON.parse(fs.readFileSync(L + files[process.argv[3]], 'utf8'));
  let o = j; for (const k of process.argv[4].split('.')) o = o[k];
  console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 1));
}
