'use strict';
const fs = require('fs'), zlib = require('zlib');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const H = LANE + '/train/heldout';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/heldout';
function readRanked(p) { const m = new Map(); for (const l of zlib.gunzipSync(fs.readFileSync(p)).toString().split('\n')) if (l.trim()) { const r = JSON.parse(l); m.set(r.id, r.ranked); } return m; }
const tasks = fs.readFileSync(H + '/tasks_used.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tgt = new Set(['T1-0557', 'T1-0558', 'T1-0559', 'T1-0560']);
const out = {};
for (const sc of ['pool', 'unrestricted']) for (const k of ['fused', 'alone']) {
  const R = [1, 2, 3].map(s => readRanked(`${H}/ranked/E1_${k}_s${s}_${sc}.jsonl.gz`));
  const diff = (a, b) => { const B = new Set(b.slice(0, 10)); return a.slice(0, 10).filter(x => !B.has(x)).length; };
  const per = {}; const all13 = [], all12 = [];
  for (const t of tasks) {
    const a = R[0].get(t.id), b = R[1].get(t.id), c = R[2].get(t.id);
    const d = { d12: diff(a, b), d13: diff(a, c), d23: diff(b, c) };
    if (tgt.has(t.id)) per[t.id] = d; else { all12.push(d.d12); all13.push(Math.max(d.d13, d.d23)); }
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  out[k + '_' + sc] = { target: per, others_mean_d12: mean(all12), others_mean_max_s3_vs_sib: mean(all13) };
}
fs.writeFileSync(OUT + '/c4b_top10.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
