import { load } from './rec.mjs';
const r = load();
const S = t => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };
function seg(a, b, step) {
  const w = r.filter(x => S(x.t) >= S(a) && S(x.t) <= S(b));
  let ups = 0, downs = 0, upSum = 0, downSum = 0;
  for (let i = 1; i < w.length; i++) { const d = w[i].procs - w[i - 1].procs; if (d > 0) { ups++; upSum += d; } else if (d < 0) { downs++; downSum += d; } }
  const out = [];
  for (let t = S(a); t <= S(b); t += step) { const x = w.find(y => S(y.t) >= t); if (x) out.push(x.t.slice(0, 5) + ' p' + x.procs + ' n' + x.node + ' ps' + x.ps + ' c' + x.cpu + ' f' + x.free + (x.top ? ' ' + x.top.map(([n, m]) => n.slice(0, 8) + ':' + m).join(',') : '')); }
  console.log('== ' + a + '-' + b, 'lines', w.length, 'ups', ups, '+' + upSum, 'downs', downs, downSum);
  console.log(out.join('\n'));
}
seg('05:04:00', '05:14:00', 60);
seg('05:14:00', '07:34:30', 600);
seg('15:42:00', '15:45:40', 20);
