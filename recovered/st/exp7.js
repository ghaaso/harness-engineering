'use strict';
const fs = require('fs'); const path = require('path'); const L = require('./lib.js');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache';
const dirs = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'meta.json')));
const metas = dirs.map(d => ({ d, t: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'meta.json'), 'utf8')).commit_time })).sort((a, b) => a.t - b.t);
let prev = null; const remByKind = {}; let remTot = 0, lineShift = 0; const addByKind = {};
const hasLine = {}; // kinds whose ids embed a line number
for (const m of metas) {
  const nodes = L.readJsonl(path.join(ROOT, m.d, 'nodes.jsonl'));
  const cur = new Map(nodes.map(x => [x.id, x]));
  for (const x of nodes) if (/#L\d+$|:\d+:/.test(x.id)) hasLine[x.kind] = (hasLine[x.kind] || 0) + 1;
  if (prev) {
    const added = []; for (const [id, x] of cur) if (!prev.has(id)) added.push(x);
    const keyOf = x => x.kind + '|' + x.path + '|' + x.name;
    const addKeys = new Map(); for (const x of added) addKeys.set(keyOf(x), (addKeys.get(keyOf(x)) || 0) + 1);
    for (const [id, x] of prev) if (!cur.has(id)) { remTot++; remByKind[x.kind] = (remByKind[x.kind] || 0) + 1; if (/#L\d+$|:\d+:/.test(id) && addKeys.get(keyOf(x))) lineShift++; }
    for (const x of added) addByKind[x.kind] = (addByKind[x.kind] || 0) + 1;
  }
  prev = cur;
}
console.log('node ids that vanished between consecutive snapshots (total over 189 steps):', remTot);
console.log('by kind:', Object.entries(remByKind).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ':' + v).join(' '));
console.log('of those, ids with a line number in the id and a same (kind,path,name) node appearing in the same step (identity break by line shift):', lineShift);
console.log('kinds whose ids embed a line number (node-snapshots counted):', JSON.stringify(hasLine));
