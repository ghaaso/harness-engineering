// For each Kernel-Power 41 boot, what the Claude app's main log did before it: last line, silence, last process-memory, spawn stalls/timeouts
const fs = require('fs');
const D = process.env.LOCALAPPDATA + '/Claude/logs/';
const lines = [];
for (const f of ['main3.log', 'main2.log', 'main1.log', 'main.log']) {
  let t; try { t = fs.readFileSync(D + f, 'latin1'); } catch { continue; }
  for (const l of t.split(/\r?\n/)) { const m = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) (.*)$/.exec(l); if (m) lines.push([m[1], m[2]]); }
}
lines.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
console.log('app log lines', lines.length, 'from', lines[0][0], 'to', lines[lines.length - 1][0]);
let txt = fs.readFileSync('C:/Users/User/Documents/projects/harness-engineering/docs/program/evidence/pc-freezes-2026-11-17/history-raw-System.json', 'utf8'); if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
const ev = JSON.parse(txt);
const boots = ev.filter(e => e.provider === 'Microsoft-Windows-Kernel-General' && e.id === 12).map(e => e.time.replace('T', ' ').slice(0, 19)).sort();
const k41 = ev.filter(e => e.provider === 'Microsoft-Windows-Kernel-Power' && e.id === 41).map(e => ({ t: e.time.replace('T', ' ').slice(0, 19), d: e.data || {} })).sort((a, b) => a.t < b.t ? -1 : 1);
const sec = s => Date.parse(s.replace(' ', 'T') + '+05:00') / 1000;
const tag = s => { const m = /^\[(\w+)\]\s*(\[[^\]]+\])?\s*(.{0,70})/.exec(s); return m ? (m[1] + ' ' + (m[2] || '') + ' ' + m[3].replace(/[A-Z]:\\[^ ]*/g, '<path>')) : s.slice(0, 80); };
for (const k of k41) {
  const boot = boots.filter(b => b <= k.t).pop() || k.t;
  const prevBoot = boots.filter(b => b < boot).pop() || '0';
  const before = lines.filter(l => l[0] < boot && l[0] > prevBoot);
  if (!before.length) { console.log(boot, '41', 'no app log line since previous boot'); continue; }
  const last = before[before.length - 1];
  const gapMin = ((sec(boot) - sec(last[0])) / 60).toFixed(1);
  // previous process-memory line and the longest silence in the last 3 h before the last line
  const win = before.filter(l => sec(l[0]) > sec(last[0]) - 10800);
  let maxGap = 0, maxAt = '';
  for (let i = 1; i < win.length; i++) { const g = sec(win[i][0]) - sec(win[i - 1][0]); if (g > maxGap) { maxGap = g; maxAt = win[i - 1][0]; } }
  const bad = win.filter(l => /timed out after 120000|spawn EPERM|blocked for \d{5,}ms|Windows session ending|before-quit|will-quit/.test(l[1])).map(l => l[0].slice(11) + ' ' + tag(l[1]).slice(0, 60));
  const sl = (k.d.SleepInProgress && k.d.SleepInProgress !== '0') ? 'sleep=' + k.d.SleepInProgress : '';
  const cs = k.d.ConnectedStandbyInProgress === 'true' ? 'cs' : '';
  const pb = (k.d.PowerButtonTimestamp && k.d.PowerButtonTimestamp !== '0') ? 'pwrbtn' : '';
  const bc = (k.d.BugcheckCode && k.d.BugcheckCode !== '0') ? 'bugcheck=' + k.d.BugcheckCode : '';
  console.log(boot, '| last app line', last[0].slice(5), '(' + gapMin + ' min before boot)', '|', [sl, cs, pb, bc].filter(Boolean).join(' '), '| longest silence in 3 h before it: ' + Math.round(maxGap / 60) + ' min after ' + maxAt.slice(11), '| last:', tag(last[1]).slice(0, 70), bad.length ? '| FLAGS: ' + bad.slice(-3).join(' ; ') : '');
}
