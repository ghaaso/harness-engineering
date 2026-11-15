'use strict';
// Classify every path and child process in the access logs of the leakage re-run.
const fs = require('fs'); const path = require('path');
const B = path.resolve(__dirname, '..', '..').split(path.sep).join('/');
const T = fs.readFileSync(B + '/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tune = new Set(T.filter((t) => t.split === 'tune').map((t) => t.parent));
const held = new Set(T.filter((t) => t.split === 'heldout').map((t) => t.parent));
const res = {};
for (const f of ['rel', 'ref', 'search', 'heldout_lock']) {
  const L = fs.readFileSync(path.join(__dirname, 'leak', f + '.log'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const r = { entries: L.length, sealed: [], held_out_sha: [], other_sha: new Set(), git: new Set(), areas: {} };
  for (const o of L) {
    const s = o.path || (o.cmd + ' ' + (o.args || []).join(' '));
    if (/sealed/i.test(s)) r.sealed.push(s);
    for (const m of s.match(/[0-9a-f]{40}/g) || []) { if (held.has(m)) r.held_out_sha.push(o.op + ' ' + s.slice(-90)); else if (!tune.has(m)) r.other_sha.add(m); }
    if (o.op.startsWith('cp.')) r.git.add(o.cmd + ' ' + (o.args || []).map((a) => /^[0-9a-f]{40}$/.test(a) ? (tune.has(a) ? '<tune-parent>' : '<OTHER ' + a.slice(0, 8) + '>') : a).join(' ').replace(/[A-Z]:\/[^ ]*\/build\//g, 'build/'));
    if (o.path) { const rel = o.path.startsWith(B) ? o.path.slice(B.length + 1) : o.path; const area = rel.split('/').slice(0, 2).join('/').replace(/[0-9a-f]{40}.*/, '<sha>'); r.areas[area] = (r.areas[area] || 0) + 1; }
  }
  r.other_sha = [...r.other_sha]; r.git = [...r.git];
  res[f] = r;
}
fs.writeFileSync(path.join(__dirname, 'leak', 'analysis.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
