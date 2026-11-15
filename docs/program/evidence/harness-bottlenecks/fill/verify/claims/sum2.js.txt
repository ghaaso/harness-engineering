const J = JSON.parse(require('fs').readFileSync('run2-result.json', 'utf8'));
const pc = (n, d) => (100 * n / d).toFixed(1) + '%', M = (n) => (n / 1e6).toFixed(0) + 'M';
let ALL = { tot: 0, fine: {}, rep2: {}, callK: {}, callN: {}, fetched: 0, ctx: 0, use: {} };
for (const g of ['slice-main', 'root-main', 'subagents', 'ALL']) {
  const R = g === 'ALL' ? ALL : J.G[g];
  if (g !== 'ALL') { ALL.tot += R.tot; ALL.fetched += R.cat.fetched; for (const x of ['fine', 'rep2', 'callK', 'callN']) for (const k in R[x]) ALL[x][k] = (ALL[x][k] || 0) + R[x][k]; for (const k in R.use) ALL.use[k] = (ALL.use[k] || 0) + R.use[k]; }
  const fetched = g === 'ALL' ? ALL.fetched : R.cat.fetched;
  console.log('\n== ' + g + ' attributed ' + M(R.tot) + ', fetched ' + M(fetched) + ' = ' + pc(fetched, R.tot));
  console.log('  -- read kinds (share of all tokens | share of fetched)');
  for (const [k, v] of Object.entries(R.fine).sort((a, b) => b[1] - a[1]).slice(0, 26)) console.log('  ' + k.padEnd(44) + M(v).padStart(6) + pc(v, R.tot).padStart(7) + pc(v, fetched).padStart(7));
  console.log('  -- repeat kinds'); for (const [k, v] of Object.entries(R.rep2).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(44) + M(v).padStart(6) + pc(v, R.tot).padStart(7) + pc(v, fetched).padStart(7));
  const ctxT = Object.values(R.callK).reduce((a, b) => a + b, 0), nT = Object.values(R.callN).reduce((a, b) => a + b, 0);
  console.log('  -- Nov calls by what tools they emitted (count | summed context read at that call)');
  for (const k in R.callK) console.log('  ' + k.padEnd(20) + String(R.callN[k]).padStart(6) + pc(R.callN[k], nT).padStart(7) + M(R.callK[k]).padStart(8) + pc(R.callK[k], ctxT).padStart(7));
  const u = R.use; console.log('  usage Nov: input ' + M(u.inp) + ' cache-read ' + M(u.cr) + ' cache-write ' + M(u.cw) + ' (1h ' + M(u.cw1) + ') output ' + M(u.out));
}
const top = J.top, F = top.reduce((s, t) => s + t.t, 0);
console.log('\nfetched with a path ' + M(F) + ' = ' + pc(F, ALL.fetched) + ' of fetched; paths ' + top.length);
for (const n of [10, 30, 100, 218, 300, 500]) { const s = top.slice(0, n).reduce((a, t) => a + t.t, 0); console.log('top ' + n + ' paths: ' + pc(s, ALL.tot) + ' of all tokens, ' + pc(s, ALL.fetched) + ' of fetched'); }
let c = 0, i = 0; while (c < F / 2) c += top[i++].t; console.log('paths holding half of path-fetched tokens: ' + i + ' (' + pc(i, top.length) + ')');
const multi = top.filter((t) => t.n >= 5), mt = multi.reduce((a, t) => a + t.t, 0);
console.log('paths read in >=5 windows: ' + multi.length + ', ' + pc(mt, ALL.fetched) + ' of fetched; their first-open tokens ' + pc(multi.reduce((a, t) => a + t.f, 0), ALL.fetched));
console.log('top 30: ' + top.slice(0, 30).map((t) => t.p + ' ' + t.n).join(', '));
