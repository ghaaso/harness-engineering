'use strict';
// Two-area tasks: which specialist(s) know the candidates that E5 puts in its top 10, and how precise each class is.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const H = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute';
const core = require(H + '/core.js');
const LANE = core.LANE, OUT = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(OUT, 'route-pertask.json'), 'utf8'));
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl')).filter(t => t.late50);
function readCands(sc) {
  const txt = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_' + sc + '.tsv.gz'))).toString('utf8');
  const out = new Map(); const ls = txt.split('\n');
  for (let i = 1; i < ls.length; i++) { if (!ls[i]) continue; const [t, c] = ls[i].split('\t'); if (!out.has(t)) out.set(t, []); out.get(t).push(c); }
  return out;
}
const out = {};
for (const sc of ['pool', 'unrestricted']) {
  const cands = readCands(sc);
  const acc = {};
  const bump = (k, f, v = 1) => { acc[k] = acc[k] || { cand_occ: 0, truth_occ: 0, E5_top10: 0, E5_top10_hits: 0, E1_top10: 0, E1_top10_hits: 0 }; acc[k][f] += v; };
  for (const s of [1, 2, 3]) {
    const t5 = core.readScoreTable(path.join(LANE, 'train/selectB/E5/alone_' + sc + '_s' + s + '.tsv.gz'));
    const t1 = core.readScoreTable(path.join(LANE, 'train/selectB/E1/alone_' + sc + '_s' + s + '.tsv.gz'));
    for (const t of tasks) {
      const p = R.per_task[t.task_id]; if (p.use.length !== 2) continue;
      const by = p[sc].by; const tr = new Set(t.truth);
      const cls = c => { const b = by[c]; if (!b.length) return 'unscored'; if (b.length === 2) return 'both'; return b[0] === p.use[0] ? 'only_own_area' : 'only_second_' + (p.use[1] === 'other' ? 'other' : 'code'); };
      const cl = cands.get(t.task_id) || [];
      if (s === 1) for (const c of cl) { bump(cls(c), 'cand_occ'); if (tr.has(c)) bump(cls(c), 'truth_occ'); }
      const r5 = core.rank(t.task_id, cl, t5.get(t.task_id) || new Map()).slice(0, 10);
      const r1 = core.rank(t.task_id, cl, t1.get(t.task_id) || new Map()).slice(0, 10);
      for (const c of r5) { bump(cls(c), 'E5_top10', 1 / 3); if (tr.has(c)) bump(cls(c), 'E5_top10_hits', 1 / 3); }
      for (const c of r1) { bump(cls(c), 'E1_top10', 1 / 3); if (tr.has(c)) bump(cls(c), 'E1_top10_hits', 1 / 3); }
    }
  }
  for (const k in acc) for (const f in acc[k]) acc[k][f] = +acc[k][f].toFixed(1);
  out[sc] = acc;
}
fs.writeFileSync(path.join(OUT, 'classes-out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
