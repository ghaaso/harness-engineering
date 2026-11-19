// list events from the exported System/Application JSON in a time window (local time strings)
const fs = require('fs');
const dir = 'C:/Users/User/Documents/projects/harness-engineering/docs/program/evidence/pc-freezes-2026-11-17/';
const from = process.argv[2], to = process.argv[3];
const filt = process.argv[4] ? new RegExp(process.argv[4]) : null;
let all = [];
for (const f of ['history-raw-System.json', 'history-raw-Application.json']) {
  let txt = fs.readFileSync(dir + f, 'utf8'); if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
  all = all.concat(JSON.parse(txt));
}
all = all.filter(e => e.time >= from && e.time <= to && (!filt || filt.test(e.provider + ' ' + e.id + ' ' + e.message)));
all.sort((a, b) => a.time < b.time ? -1 : 1);
for (const e of all) {
  if (e.provider === 'disk' && e.id === 51) continue;
  console.log(e.time, e.log, e.provider, e.id, (e.message || '').replace(/\s+/g, ' ').slice(0, 160), e.data ? JSON.stringify(e.data).slice(0, 300) : '');
}
console.log('count', all.length);
