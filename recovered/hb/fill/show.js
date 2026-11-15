const { G } = JSON.parse(require('fs').readFileSync('fill-result.json', 'utf8'));
const M = (n) => (n / 1e6).toFixed(0) + 'M', pc = (n, d) => (100 * n / d).toFixed(1) + '%';
let grand = 0; for (const g in G) grand += G[g].actual;
console.log('all groups: November context tokens ' + M(grand));
for (const g of ['slice-main', 'root-main', 'subagents']) {
  const R = G[g]; const tot = Object.values(R.cat).reduce((a, b) => a + b, 0);
  const b = R.bases.slice().sort((x, y) => x - y);
  console.log('\n== ' + g + ': files ' + R.files + ', windows ' + R.segs + ', Nov calls ' + R.calls + ', context tokens ' + M(R.actual) + ' (' + pc(R.actual, grand) + ' of all), cache-read ' + M(R.cr) + ', attributed ' + M(tot) + ' (' + pc(tot, R.actual) + ' of actual), median first-call context ' + Math.round(b[Math.floor(b.length / 2)] / 1000) + 'k');
  for (const [k, v] of Object.entries(R.cat).sort((x, y) => y[1] - x[1])) console.log('  ' + k.padEnd(32) + M(v).padStart(7) + pc(v, tot).padStart(8));
  console.log('  -- read kinds'); for (const [k, v] of Object.entries(R.kind).sort((x, y) => y[1] - x[1])) console.log('  ' + k.padEnd(32) + M(v).padStart(7) + pc(v, tot).padStart(8));
  console.log('  -- Read tool repeats'); for (const [k, v] of Object.entries(R.repeat)) console.log('  ' + k.padEnd(40) + M(v).padStart(7) + pc(v, tot).padStart(8));
  console.log('  -- top shell words'); for (const [k, v] of Object.entries(R.words).sort((x, y) => y[1] - x[1]).slice(0, 14)) console.log('  ' + k.padEnd(32) + M(v).padStart(7) + pc(v, tot).padStart(8));
}
