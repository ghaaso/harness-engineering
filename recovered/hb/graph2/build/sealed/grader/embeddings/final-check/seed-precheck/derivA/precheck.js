'use strict';
// Derivation A: shared harness seed mapping per T1 task (read-only; source text loading stubbed so the
// shared srcstore is never written; seed mapping does not read source text).
const fs = require('fs'); const path = require('path');
const BUILD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const C = path.join(BUILD, 'arms', 'common');
const source = require(path.join(C, 'source.js'));
source.ensureTree = () => {}; source.getLines = () => null;
const { loadFacts } = require(path.join(C, 'facts.js'));
const H = require(path.join(C, 'harness.js'));
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter((t) => t.set === 'T1' && t.seed && t.seed.path);
const truth = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'truth', 'truth.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tById = new Map(truth.map((r) => [r.id, r]));
const byParent = new Map();
for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
const stat = {}; const rows = []; let truthMismatch = 0;
for (const [p, ts] of [...byParent].sort()) {
  const G = loadFacts(p, { removePaths: [] });
  for (const t of ts) {
    const tr = tById.get(t.id);
    if (!tr || tr.parent !== t.parent || tr.seed !== t.seed.path || tr.split !== t.split) truthMismatch++;
    const sm = H.mapSeed(G, t.seed);
    const seeds = sm.ids.map((i) => G.nodes[i - 1].sid);
    const kinds = sm.ids.map((i) => G.nodes[i - 1].kind).join(',');
    const want = 'file:' + t.seed.path;
    const has = seeds.includes(want); const first = seeds[0] === want;
    const s = stat[t.split] || (stat[t.split] = { tasks: 0, with: 0, first: 0, shapes: {}, without: {}, matches: {}, fileFoundNotFileId: 0, late: 0 });
    s.tasks++; if (has) s.with++; if (first) s.first++;
    s.shapes[kinds || '(empty)'] = (s.shapes[kinds || '(empty)'] || 0) + 1;
    s.matches[sm.match] = (s.matches[sm.match] || 0) + 1;
    if (sm.fileFound && !has) s.fileFoundNotFileId++;
    if (!has) { const k = (kinds || '(empty)') + ' | symbol ' + (t.seed.symbol ? t.seed.symbol.kind : 'null') + ' | fileFound ' + sm.fileFound; s.without[k] = (s.without[k] || 0) + 1; }
    rows.push({ id: t.id, split: t.split, has, first, kinds, match: sm.match });
  }
}
// late-50 tuning subset
const late = new Set(truth.filter((r) => r.late50).map((r) => r.id));
const L = { tasks: 0, with: 0, first: 0 };
for (const r of rows) if (late.has(r.id)) { L.tasks++; if (r.has) L.with++; if (r.first) L.first++; }
fs.writeFileSync(path.join(__dirname, 'rows.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const out = { parents: byParent.size, truthMismatch, stat, late50: L };
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
