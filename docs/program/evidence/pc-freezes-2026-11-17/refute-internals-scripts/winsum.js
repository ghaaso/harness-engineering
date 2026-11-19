// Summarise refute-internals-events.json per window: counts per log|provider|id, plus non-noise event lines
const fs = require('fs');
const f = 'C:/Users/User/Documents/projects/harness-engineering/docs/program/evidence/pc-freezes-2026-11-17/refute-internals-events.json';
let t = fs.readFileSync(f, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
const o = JSON.parse(t);
console.log('seconds', o.seconds, 'logs', o.logsQueried, '/', o.logsListed, 'errors', o.errors);
console.log(o.drivers.join('\n'));
const wins = [
  ['2026-11-17T05:03:00', '2026-11-17T05:16:00'], ['2026-11-17T05:36:30', '2026-11-17T05:38:30'], ['2026-11-17T07:30:00', '2026-11-17T07:46:00'],
  ['2026-11-17T15:19:30', '2026-11-17T15:24:00'], ['2026-11-17T15:42:30', '2026-11-17T15:46:30'], ['2026-11-17T01:20:00', '2026-11-17T01:45:00'],
  ['2026-11-17T02:30:00', '2026-11-17T02:57:00'], ['2026-11-13T20:45:00', '2026-11-13T21:00:00'], ['2026-11-13T22:55:00', '2026-11-13T23:00:00'],
  ['2026-11-14T16:05:00', '2026-11-14T16:15:00'], ['2026-11-14T17:10:00', '2026-11-14T17:16:00'], ['2026-11-15T02:38:00', '2026-11-15T03:04:00'],
  ['2026-11-06T13:40:00', '2026-11-06T13:45:00'], ['2026-11-06T14:55:00', '2026-11-06T15:14:00'],
];
const noise = process.argv[2] ? new RegExp(process.argv[2]) : /^$/;
for (const [a, b] of wins) {
  const ev = o.events.filter(e => e.t >= a && e.t <= b + '.999').sort((x, y) => x.t < y.t ? -1 : 1);
  const c = {};
  for (const e of ev) { const k = e.log + '|' + e.p + '|' + e.id; c[k] = (c[k] || 0) + 1; }
  console.log('\n=== ' + a + ' .. ' + b.slice(11) + ' : ' + ev.length + ' events');
  for (const [k, n] of Object.entries(c).sort((x, y) => y[1] - x[1])) console.log('  ' + String(n).padStart(5) + '  ' + k);
  const shown = ev.filter(e => !noise.test(e.log + '|' + e.p + '|' + e.id));
  for (const e of shown.slice(0, 60)) console.log('    ' + e.t.slice(11) + ' ' + e.p + ' ' + e.id + ' ' + (e.m || '').replace(/\s+/g, ' ').slice(0, 150));
}
