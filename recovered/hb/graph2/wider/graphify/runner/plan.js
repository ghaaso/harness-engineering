'use strict';
// Counts held-out tasks per set and the graphs (parent + removal set) they need. Reads only tasks.jsonl
// (seeds and parents; no reference). Prints, writes nothing unless a path is given.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = path.resolve(__dirname, '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const key = (p, rp) => { const r = (rp || []).slice().sort(); return r.length ? p + '-rm-' + sha(r.join('\n')).slice(0, 8) : p; };
const ts = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter((t) => t.split === 'heldout' && ['T1', 'T1x', 'T2', 'T3', 'T4'].includes(t.set));
const per = {}; const keys = new Map(); const noSeed = [];
for (const t of ts) {
  per[t.set] = (per[t.set] || 0) + 1;
  if (!(t.seed && t.seed.path)) noSeed.push(t.id);
  const k = key(t.parent, t.remove_paths);
  if (!keys.has(k)) keys.set(k, { parent: t.parent, remove_paths: t.remove_paths || [], sets: new Set(), tasks: 0 });
  keys.get(k).sets.add(t.set); keys.get(k).tasks++;
}
const exist = new Set(fs.readdirSync(path.join(G, 'graphs')));
const ids = ts.map((t) => t.id);
const out = { tasks_per_set: per, total: ts.length, distinct_ids: new Set(ids).size, without_seed_path: noSeed,
  task_fields: Object.keys(ts[0]).sort(),
  graphs_needed: keys.size, graphs_already_built: [...keys.keys()].filter((k) => exist.has(k)).length,
  with_removal: [...keys.values()].filter((v) => v.remove_paths.length).length,
  distinct_parents: new Set([...keys.values()].map((v) => v.parent)).size,
  graphs: [...keys].sort().map(([k, v]) => ({ key: k, sets: [...v.sets].sort(), tasks: v.tasks, remove_paths: v.remove_paths, already: exist.has(k) })) };
const s = JSON.stringify(out, null, 1);
if (process.argv[2]) fs.writeFileSync(process.argv[2], s);
console.log(JSON.stringify({ ...out, graphs: undefined }, null, 1));
