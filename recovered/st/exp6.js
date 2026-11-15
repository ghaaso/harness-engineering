'use strict';
const fs = require('fs'); const path = require('path'); const L = require('./lib.js');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache';
const dirs = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'meta.json')));
const metas = dirs.map(d => ({ d, t: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'meta.json'), 'utf8')).commit_time })).sort((a, b) => a.t - b.t);
const open = new Map(); let intervals = 0, total = 0, distinct = new Set();
const byKind = {};
let prev = new Set();
for (let k = 0; k < metas.length; k++) {
  const edges = L.readJsonl(path.join(ROOT, metas[k].d, 'edges.jsonl'));
  const cur = new Set(); for (const e of edges) cur.add(e.src + '|' + e.dst + '|' + e.kind);
  total += cur.size;
  for (const e of cur) { distinct.add(e); if (!prev.has(e)) { intervals++; const kd = e.split('|')[2]; byKind[kd] = (byKind[kd] || 0) + 1; } }
  prev = cur;
}
console.log('snapshots', metas.length, '| sum of edges over all snapshots (copy-per-snapshot)', total, '| distinct edge keys', distinct.size, '| validity intervals (an edge that disappears and returns counts twice)', intervals);
console.log('compression of interval encoding vs full snapshots', (total / intervals).toFixed(0) + 'x', '| bytes at 12 B/edge record: snapshots', (total * 12 / 1048576).toFixed(1), 'MB vs intervals (+8 B for two timestamps)', (intervals * 20 / 1048576).toFixed(2), 'MB');
console.log('new-interval starts by kind (top):', Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ':' + v).join(' '));
