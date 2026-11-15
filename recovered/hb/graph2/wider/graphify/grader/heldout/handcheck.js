'use strict';
// Independent re-scoring (does not load score.js) of every graphify held-out answer at 2,000 and 8,000
// tokens, against the stored per-task values of step 1. Rule content: a file counts when the item's path
// line is shown (whole items; the cut item only when its path line is shown); a definition counts when a
// shown signature line of the same path lies inside its range. Writes handcheck.json.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const refs = new Map(fs.readFileSync(path.join(BUILD, 'sealed', 'grader', 'heldout', 'refs_heldout.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const per = new Map(gz(path.join(__dirname, 'tasks.jsonl.gz')).filter((t) => t.arm === 'graphify').map((t) => [t.id, t]));
let n = 0; let diff = 0; const bad = [];
for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) for (const a of gz(path.join(G, 'answers', 'heldout', '66367cd303fdd75b.' + set + '.jsonl.gz'))) {
  const r = refs.get(a.id); const files = [...new Set((r.files || []).map((f) => (typeof f === 'string' ? f : f.path)))]; const defs = r.defs || [];
  for (const b of ['2000', '8000']) {
    const bb = a.budgets[b]; const shown = [];
    for (let i = 0; i < bb.n_full; i++) shown.push({ p: a.items[i].path, lines: a.items[i].shown || [], pathShown: true });
    if (bb.cut && a.items[bb.n_full]) shown.push({ p: a.items[bb.n_full].path, lines: bb.cut.shown || [], pathShown: bb.cut.path_shown !== undefined ? bb.cut.path_shown : !!(bb.cut.shown && bb.cut.shown.length) });
    const fHit = files.filter((f) => shown.some((s) => s.pathShown && s.p === f)).length;
    const dHit = defs.filter((d) => shown.some((s) => s.p === d.path && s.lines.some((l) => l >= d.start && l <= (d.end != null ? d.end : d.start)))).length;
    const v = (fHit + dHit) / (files.length + defs.length);
    const st = per.get(a.id)['r' + b]; n++;
    if (Math.abs(v - st) > 1e-12) { diff++; if (bad.length < 5) bad.push({ id: a.id, b, mine: v, stored: st }); }
  }
}
const out = { values_checked: n, differing: diff, examples: bad };
fs.writeFileSync(path.join(__dirname, 'handcheck.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
