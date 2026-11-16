const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const lines = fs.readFileSync(L + '/train/progress.jsonl', 'utf8').split('\n');
let out = [];
const steps = {}; const done = {}; const failed = []; let bad = 0; const nonB = {};
const recs = [];
lines.forEach((ln, i) => {
  if (!ln.trim()) return;
  let r; try { r = JSON.parse(ln); } catch (e) { bad++; out.push('BADLINE ' + (i + 1)); return; }
  steps[r.step + '/' + r.status] = (steps[r.step + '/' + r.status] || 0) + 1;
  if (r.step === 'stageB') {
    recs.push([i + 1, r]);
    if (r.status === 'done') { (done[r.unit] = done[r.unit] || []).push([i + 1, r.t]); }
    else if (r.status === 'failed') failed.push([i + 1, r.unit, r.t]);
    else out.push('OTHER status line ' + (i + 1) + ' ' + ln.slice(0, 200));
  }
});
out.push('total nonblank lines ' + lines.filter(l => l.trim()).length + ' bad ' + bad);
out.push('step/status counts ' + JSON.stringify(steps));
const units = Object.keys(done);
out.push('distinct stageB done units ' + units.length + ' (plan unit present: ' + ('plan' in done) + ')');
const multi = units.filter(u => done[u].length > 1);
out.push('units done more than once ' + multi.length + ' ' + JSON.stringify(multi.map(u => [u, done[u]])));
out.push('failed lines ' + JSON.stringify(failed));
for (const f of failed) out.push('failed unit later done: ' + f[1] + ' -> ' + JSON.stringify(done[f[1]] || null));
// arms/config/seed/checkpoint breakdown
const real = units.filter(u => u !== 'plan');
const by = {}; const ck = new Set();
for (const u of real) { const p = u.split('/'); by[p[0]] = (by[p[0]] || 0) + 1; ck.add(p[3]); }
out.push('per arm ' + JSON.stringify(by) + ' checkpoints ' + ck.size + ' expected 5*3*3*ck=' + 45 * ck.size);
// cap windows: 2560m before 2026-11-15T06:28:25Z (stop), 4g from 06:30:46Z launch
const SW = '2026-11-15T06:28:25Z', SW2 = '2026-11-15T06:29:24Z';
let c2560 = 0, c4g = 0, between = 0; const peak = { '2560m': [0, ''], '4g': [0, ''] };
const rssOver = [];
for (const u of real) {
  const t = done[u][done[u].length - 1][1];
  const r = recs.find(x => x[1].unit === u && x[1].status === 'done')[1];
  let cap;
  if (t < SW) { c2560++; cap = '2560m'; } else if (t > SW2) { c4g++; cap = '4g'; } else { between++; cap = '?'; }
  if (cap !== '?' && r.peak_rss_mb > peak[cap][0]) peak[cap] = [r.peak_rss_mb, u + ' ' + t];
  if (cap === '2560m' && r.peak_rss_mb > 2560) rssOver.push([u, t, r.peak_rss_mb]);
}
out.push('units by cap (time of done line): 2560m ' + c2560 + ' 4g ' + c4g + ' in switch gap ' + between);
out.push('peak rss per cap ' + JSON.stringify(peak));
out.push('2560m-window units with peak_rss_mb > 2560: ' + rssOver.length + ' ' + JSON.stringify(rssOver.slice(0, 50)));
// done count at times of ruling 98 launch lines
for (const T of ['2026-11-15T05:55:39Z', '2026-11-15T06:03:51Z', '2026-11-15T06:27:57Z', '2026-11-15T06:30:46Z']) {
  const n = real.filter(u => done[u][0][1] < T).length; out.push('distinct real units done before ' + T + ': ' + n);
}
// last done
out.push('first/last stageB line t ' + recs[0][1].t + ' / ' + recs[recs.length - 1][1].t);
// keys in done lines
const keys = {}; for (const [, r] of recs) for (const k of Object.keys(r)) keys[k] = (keys[k] || 0) + 1;
out.push('keys ' + JSON.stringify(keys));
// non-finite numbers anywhere
let nf = 0; for (const [, r] of recs) for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !isFinite(v)) nf++;
out.push('nonfinite numeric fields in stageB lines ' + nf);
fs.writeFileSync(__dirname + '/prog.out.txt', out.join('\n') + '\n');
