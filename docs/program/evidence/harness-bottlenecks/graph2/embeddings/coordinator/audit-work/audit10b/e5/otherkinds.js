'use strict';
// What makes 'other' the second area: kinds and path presence of the seeds' 1-hop neighbours in area 'other';
// and the size of each specialist's known set per area on the late-50 parents.
const fs = require('fs'), path = require('path');
const H = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute';
const core = require(H + '/core.js');
const LANE = core.LANE, OUT = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(OUT, 'route-pertask.json'), 'utf8'));
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl')).filter(t => t.late50);
const kinds = {}, withPath = { yes: 0, no: 0 }, examplesNoPath = new Set(), rel = {};
const sizes = {};
let n = 0;
const byP = new Map(); for (const t of tasks) { if (!byP.has(t.parent)) byP.set(t.parent, []); byP.get(t.parent).push(t); }
for (const [P, ts] of byP) {
  const d = path.join(LANE, 'export/graphs0', P);
  const ents = new Map();
  for (const l of fs.readFileSync(path.join(d, 'entities.tsv'), 'utf8').split('\n').slice(1)) { if (!l) continue; const [id, kind, p, code, area] = l.split('\t'); ents.set(id, { kind, p, area, code }); }
  const tri = fs.readFileSync(path.join(d, 'triples.tsv'), 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
  const area = e => (ents.has(e) ? ents.get(e).area : 'other');
  const adj = new Map(); const add = (a, b, r) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, r]); };
  for (const [h, r, t] of tri) if (h !== t) { add(h, t, r); add(t, h, r); }
  for (const A of ['backend', 'mobile', 'web', 'other']) { const k = new Set(); for (const [h, , t] of tri) if (area(h) === A || area(t) === A) { k.add(h); k.add(t); } (sizes[A] = sizes[A] || []).push(k.size); }
  for (const t of ts) {
    const p = R.per_task[t.task_id]; if (p.route.length !== 2 || p.route[1] !== 'other') continue;
    n++;
    const seen = new Set();
    for (const [b, r] of adj.get('file:' + t.seed) || []) {
      if (area(b) !== 'other' || seen.has(b)) continue; seen.add(b);
      const e = ents.get(b); const k = e ? e.kind : '(not in entities)';
      kinds[k] = (kinds[k] || 0) + 1; rel[r] = (rel[r] || 0) + 1;
      if (e && e.p) withPath.yes++; else { withPath.no++; if (examplesNoPath.size < 8) examplesNoPath.add(b.slice(0, 60)); }
    }
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const out = { tasks_second_other: n, other_neighbour_kinds: kinds, other_neighbour_relations: rel, other_neighbours_with_path: withPath, examples_without_path: [...examplesNoPath], specialist_known_set_median_per_parent: Object.fromEntries(Object.entries(sizes).map(([A, v]) => [A, med(v)])), parents: byP.size };
fs.writeFileSync(path.join(OUT, 'otherkinds-out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
