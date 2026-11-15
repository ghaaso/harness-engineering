const J = JSON.parse(require('fs').readFileSync('fill-result.json', 'utf8'));
const B = { fetched: ['shell-read', 'file-read', 'search'], own: ['out-thinking', 'out-commands', 'out-writes', 'out-briefs', 'out-text'], start: ['window-start', 'window-start-after-compaction'], unclassified: ['shell-other'], messages: ['message-in'] };
const pc = (n, d) => (100 * n / d).toFixed(1) + '%';
const all = { tot: 0, b: {}, rep: {}, act: 0 };
console.log('SUMMARY (shares of November context tokens; estimates from context growth between calls)');
for (const g of ['slice-main', 'root-main', 'subagents']) {
  const R = J.G[g]; const tot = Object.values(R.cat).reduce((a, b) => a + b, 0); all.tot += tot; all.act += R.actual;
  const row = {}; let used = 0;
  for (const k in B) { row[k] = B[k].reduce((s, c) => s + (R.cat[c] || 0), 0); used += row[k]; all.b[k] = (all.b[k] || 0) + row[k]; }
  row.rest = tot - used; all.b.rest = (all.b.rest || 0) + row.rest;
  for (const k in R.repeat) all.rep[k] = (all.rep[k] || 0) + R.repeat[k];
  all.rep.search = (all.rep.search || 0) + (R.cat.search || 0);
  console.log(g.padEnd(11) + Object.entries(row).map(([k, v]) => k + ' ' + pc(v, tot)).join(' | ') + ' | checks: attributed ' + pc(tot, R.actual) + ' of actual');
}
console.log('all'.padEnd(11) + Object.entries(all.b).map(([k, v]) => k + ' ' + pc(v, all.tot)).join(' | ') + ' | actual context tokens ' + (all.act / 1e6).toFixed(0) + 'M, attributed ' + (all.tot / 1e6).toFixed(0) + 'M');
console.log('fetched, all groups: ' + Object.entries(all.rep).map(([k, v]) => k + ' ' + pc(v, all.tot)).join(' | '));
const docs = J.top.slice(0, 30).filter((t) => t.path.endsWith('.md')); const t30 = J.top.slice(0, 30).reduce((s, t) => s + t.tokens, 0);
console.log('distinct file paths ' + J.distinctPaths + ', windows ' + J.windows + '; 30 most-read files ' + pc(t30, all.tot) + ' of all tokens; the ' + docs.length + ' documents among them ' + pc(docs.reduce((s, t) => s + t.tokens, 0), all.tot));
