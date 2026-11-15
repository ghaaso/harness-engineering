const fs = require('fs');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
const o = JSON.parse(fs.readFileSync(T + '/coststate/recon.json', 'utf8'));
const f = (x) => (x / 1e6).toFixed(2) + 'M';
for (const s of o) {
  console.log(`\n=== ${s.g} ${s.sid.slice(0, 8)} cs$=${s.usd.toFixed(2)} start=${new Date(s.startTime).toISOString()} cut=${s.lastCsPrevTs}`);
  let tot = { main: 0, agent: 0, workflow: 0 }, totAll = { main: 0, agent: 0, workflow: 0 };
  for (const [k, a] of Object.entries(s.agg)) { const [b, role] = k.split('|'); (b === 'upto' ? tot : totAll)[role] += a.usd; }
  console.log(' list$ upto cut:', JSON.stringify(Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +v.toFixed(2)]))), ' all:', JSON.stringify(Object.fromEntries(Object.entries(totAll).map(([k, v]) => [k, +v.toFixed(2)]))));
  const models = new Set([...Object.keys(s.modelUsage), ...Object.keys(s.agg).map(k => k.split('|')[2])]);
  for (const m of models) {
    const u = s.modelUsage[m];
    const g = (role, b = 'upto') => s.agg[`${b}|${role}|${m}`] || { in: 0, cc: 0, cr: 0, out: 0, th: 0, n: 0, usd: 0, cc5m: 0, cc1h: 0 };
    const M = g('main'), A = g('agent'), W = g('workflow');
    console.log(` ${m}`);
    if (u) {
      const p = P[m];
      const c5 = u.cacheCreationEphemeral5mInputTokens, c1 = u.cacheCreationEphemeral1hInputTokens;
      let listOwn = null; var listOwnAll1h = null, listOwnAll5m = null;
      if (p) {
        const cc5 = c5 !== undefined ? c5 : u.cacheCreationInputTokens, cc1 = c1 !== undefined ? c1 : 0;
        listOwn = (u.inputTokens * p.input + u.cacheReadInputTokens * p.cache_read + u.outputTokens * p.output + cc5 * p.cache_write_5m + cc1 * p.cache_write_1h) / 1e6;
        var listOwnAll1h = (u.inputTokens * p.input + u.cacheReadInputTokens * p.cache_read + u.outputTokens * p.output + u.cacheCreationInputTokens * p.cache_write_1h) / 1e6;
        var listOwnAll5m = (u.inputTokens * p.input + u.cacheReadInputTokens * p.cache_read + u.outputTokens * p.output + u.cacheCreationInputTokens * p.cache_write_5m) / 1e6;
      }
      console.log(`   CS   in=${u.inputTokens} cc=${f(u.cacheCreationInputTokens)} (5m=${c5} 1h=${c1}) cr=${f(u.cacheReadInputTokens)} out=${u.outputTokens} th=${u.thinkingTokens} cost=${u.costUSD.toFixed(2)} listOwn(split)=${listOwn && listOwn.toFixed(2)} allCc@5m=${listOwnAll5m && listOwnAll5m.toFixed(2)} allCc@1h=${listOwnAll1h && listOwnAll1h.toFixed(2)}`);
    } else console.log('   CS   (absent)');
    for (const [nm, a] of [['main', M], ['agent', A], ['wf', W]]) if (a.n) console.log(`   ${nm.padEnd(5)}n=${a.n} in=${a.in} cc=${f(a.cc)} (5m=${a.cc5m} 1h=${a.cc1h}) cr=${f(a.cr)} out=${a.out} th=${a.th} list$=${(+a.usd||0).toFixed(2)}`);
    const sum = (arr) => arr.reduce((x, y) => ({ cr: x.cr + y.cr, cc: x.cc + y.cc, out: x.out + y.out, in: x.in + y.in }), { cr: 0, cc: 0, out: 0, in: 0 });
    if (u) {
      const MA = sum([M, A]), MAW = sum([M, A, W]);
      console.log(`   ratio cr CS/main=${(u.cacheReadInputTokens / M.cr).toFixed(3)} CS/m+a=${(u.cacheReadInputTokens / MA.cr).toFixed(3)} CS/m+a+w=${(u.cacheReadInputTokens / MAW.cr).toFixed(3)}; out CS/m+a+w=${(u.outputTokens / MAW.out).toFixed(3)} cc CS/m+a+w=${(u.cacheCreationInputTokens / MAW.cc).toFixed(3)}`);
    }
  }
}
