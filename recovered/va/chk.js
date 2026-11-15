// Re-count claims from the frozen-commit facts (read-only).
const fs = require('fs');
const D = process.argv[2];
const lines = f => fs.readFileSync(D + '/' + f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const E = lines('edges.jsonl'), N = lines('nodes.jsonl'), C = lines('commits.jsonl');
const kinds = {}; const distinct = new Set(); const distinctNoSelf = new Set();
for (const e of E) { kinds[e.kind] = (kinds[e.kind] || 0) + 1; distinct.add(e.src + '|' + e.dst + '|' + e.kind); }
console.log('edge records', E.length, 'distinct typed', distinct.size, 'kinds', Object.keys(kinds).length, 'nodes', N.length);
console.log('kinds', JSON.stringify(kinds));
// co_changed and commit size
const bySha = {}; for (const c of C) bySha[c.sha.slice(0, 12)] = c;
const used = C.filter(c => c.used);
console.log('commits', C.length, 'used', used.length);
const sizes = used.map(c => c.n_files).sort((a, b) => a - b);
console.log('used size min/median/max', sizes[0], sizes[Math.floor(sizes.length / 2)], sizes[sizes.length - 1], '>2 files', sizes.filter(s => s > 2).length);
let pairInc = 0, pairBig = 0; for (const s of sizes) { const p = s * (s - 1) / 2; pairInc += p; if (s >= 16) pairBig += p; }
console.log('pair incidences', pairInc, 'from 16+', pairBig, (pairBig / pairInc).toFixed(3), 'commits16+', sizes.filter(s => s >= 16).length);
const cc = E.filter(e => e.kind === 'co_changed');
let only10 = 0, missing = 0;
for (const e of cc) {
  const cs = (e.attrs.commits || []).map(s => bySha[s.slice(0, 12)]);
  if (cs.some(x => !x)) missing++;
  if (cs.every(x => x && x.n_files >= 10)) only10++;
}
console.log('co_changed', cc.length, 'only 10+ file commits', only10, 'missing sha', missing);
const conf = {}; for (const e of E) if (e.kind === 'calls') conf[e.confidence] = (conf[e.confidence] || 0) + 1;
console.log('calls confidence', JSON.stringify(conf));
// id forms
const lineIds = N.filter(n => /#L\d+|:\d+:/.test(n.id)).length;
console.log('node ids embedding a line number', lineIds, 'of', N.length);
const nk = {}; for (const n of N) nk[n.kind] = (nk[n.kind] || 0) + 1; console.log('node kinds', Object.keys(nk).length);
