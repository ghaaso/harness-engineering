// Extra report from fill-result.json: splits as shares of ALL attributed context tokens.
const J = JSON.parse(require('fs').readFileSync('fill-result.json', 'utf8'));
const B = { fetched: ['shell-read', 'file-read', 'search'], own: ['out-thinking', 'out-commands', 'out-writes', 'out-briefs', 'out-text'], start: ['window-start', 'window-start-after-compaction'], unclassified: ['shell-other'], messages: ['message-in'] };
let tot = 0, act = 0; const cat = {}, kind = {};
const groups = {};
for (const g in J.G) {
  const R = J.G[g]; const t = Object.values(R.cat).reduce((a, b) => a + b, 0); tot += t; act += R.actual;
  for (const k in R.cat) cat[k] = (cat[k] || 0) + R.cat[k];
  for (const k in R.kind) kind[k] = (kind[k] || 0) + R.kind[k];
  groups[g] = { t, R };
}
const out = { totalAttributed: tot, totalActual: act, ratio: tot / act, cpt: J.cpt, windows: J.windows, distinctPaths: J.distinctPaths, cats: {}, kinds: {}, byGroup: [], top: [] };
for (const k of Object.keys(cat).sort((a, b) => cat[b] - cat[a])) out.cats[k] = +(cat[k] / tot).toFixed(4);
for (const k of Object.keys(kind).sort((a, b) => kind[b] - kind[a])) out.kinds[k] = +(kind[k] / tot).toFixed(4);
for (const g in groups) {
  const { t, R } = groups[g]; const row = { group: g, attributedTokens: Math.round(t), contextTokens: R.actual, calls: R.calls, files: R.files, segs: R.segs, shareOfAll: +(t / tot).toFixed(4) };
  let used = 0; for (const k in B) { const v = B[k].reduce((s, c) => s + (R.cat[c] || 0), 0); row[k] = +(v / t).toFixed(4); used += v; }
  row.rest = +((t - used) / t).toFixed(4); row.attrOverActual = +(t / R.actual).toFixed(4);
  out.byGroup.push(row);
}
out.top = J.top.slice(0, 15).map((x) => ({ path: x.path, share: +(x.tokens / tot).toFixed(4), windows: x.windows }));
console.log(JSON.stringify(out, null, 1));
