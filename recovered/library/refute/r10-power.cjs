// R10: how many slices would it take to see an E1 saving? Spread of tokens per build session (Clinic testbed),
// then sample sizes for a two-arm comparison of means (normal approximation, alpha 0.05 two-sided, power 0.8).
// Read-only. Usage: node r10-power.cjs <cost-by-worktype.json> <r10-calls.json>
const fs = require('fs');
const cw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const calls = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const inv = cw.inventory.clinic.sessions;
const S = calls.clinic.sessions;
const rows = inv.filter(s => s.workType === 'clinic-testbed' && S[s.sid]).map(s => ({ t: s.title, ctx: S[s.sid].ctx / 1e6, phase: s.phase }));
function stats(a) { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n; const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1)); const s = a.slice().sort((x, y) => x - y); return { n, mean: +m.toFixed(1), sd: +sd.toFixed(1), cv: +(sd / m).toFixed(2), median: s[Math.floor(n / 2)], min: +s[0].toFixed(1), max: +s[n - 1].toFixed(1) }; }
const all = rows.map(r => r.ctx);
const impl = rows.filter(r => r.phase === 'implementation').map(r => r.ctx);
const logs = all.map(Math.log);
console.log('clinic-testbed sessions, M context tokens:', JSON.stringify(stats(all)));
console.log('implementation-phase sessions only:', JSON.stringify(stats(impl)));
const ls = stats(logs); console.log('log scale sd (multiplicative spread):', ls.sd, '-> x' + Math.exp(ls.sd).toFixed(2));
const z = 1.96 + 0.8416;
for (const cv of [stats(all).cv, stats(impl).cv, 0.5, 0.3]) {
  const per = d => Math.ceil(2 * z * z * cv * cv / (d * d));
  console.log(`CV ${cv}: sessions per arm to detect a mean cut of 5% / 10% / 20% / 50%: ${per(0.05)} / ${per(0.10)} / ${per(0.20)} / ${per(0.50)}`);
}
console.log('rows:', rows.map(r => r.ctx.toFixed(0) + ' ' + r.t.slice(0, 40)).join(' | '));
