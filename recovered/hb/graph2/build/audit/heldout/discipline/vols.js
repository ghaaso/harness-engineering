'use strict';
// Arm volumes: earliest and latest mtime (UTC, container clock) of any entry naming a held-out parent sha.
const fs = require('fs'); const path = require('path');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const D = path.join(B, 'audit/heldout/discipline');
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const ho = [...new Set(tasks.filter((t) => t.split !== 'tune' && t.set !== 'T5').map((t) => t.parent))];
const tune = new Set(tasks.filter((t) => t.split === 'tune').map((t) => t.parent));
const hoOnly = ho.filter((p) => !tune.has(p));
const RUN0 = '2026-11-13T05:55:58'; const RUN1 = '2026-11-13T06:40:32';
const out = { heldout_parents: ho.length, heldout_parents_not_tune: hoOnly.length, volumes: {} };
for (const v of ['gt-relational', 'gt-ladybug', 'gt-duckpgq', 'gt-search']) {
  const L = fs.readFileSync(path.join(D, 'vol_' + v + '.txt'), 'utf8').split('\n').filter(Boolean).map((l) => { const [t, s, ...p] = l.split(' '); return { t: t.slice(0, 19), s: +s, p: p.join(' ') }; });
  const r = { entries: L.length, before_run_naming_heldout: [], after_run_any: [], heldout_parents_seen: 0, newest: L.map((x) => x.t).sort().slice(-1)[0] };
  const seen = new Set();
  for (const x of L) {
    const hit = hoOnly.find((p) => x.p.includes(p) || x.p.includes(p.slice(0, 12)));
    if (hit) { seen.add(hit); if (x.t < RUN0) r.before_run_naming_heldout.push(x.t + ' ' + x.p); }
    if (x.t > RUN1 && x.p !== '/v') r.after_run_any.push(x.t + ' ' + x.p);
  }
  r.heldout_parents_seen = seen.size;
  r.after_run_any = r.after_run_any.slice(0, 20);
  r.before_run_naming_heldout = r.before_run_naming_heldout.slice(0, 20);
  out.volumes[v] = r;
}
fs.writeFileSync(path.join(D, 'vols.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
