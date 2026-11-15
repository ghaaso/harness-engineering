// Independent re-computation of recall in the 8,000-token answer for a few held-out answers
// (written without score.js: walk the whole items that fit, then the cut item's whole shown lines).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const B = path.resolve(__dirname, '../../..');
const refs = new Map(fs.readFileSync(path.join(__dirname, 'refs_heldout.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const per = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'tasks.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse);
const out = [];
for (const [arm, role, set, pick] of [['relational', 'primary', 'T1', [5, 200, 400]], ['search', 'primary', 'T1', [17, 333]], ['floor-co', 'primary', 'T2', [42]], ['ladybug', 's2', 'T3', [3]]]) {
  const A = zlib.gunzipSync(fs.readFileSync(path.join(B, 'results/heldout', arm, role, set + '.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse);
  for (const i of pick) {
    const a = A[i]; const r = refs.get(a.id);
    const files = [...new Set(r.files.map((f) => f.path))]; const defs = r.defs;
    const gotF = new Set(), gotD = new Set();
    const b = a.budgets['8000'];
    const show = (it, lines, pathShown) => {
      if (pathShown && files.includes(it.path)) gotF.add(it.path);
      if (!lines || !lines.length) return;
      defs.forEach((d, j) => { if (d.path !== it.path) return; if (a.form === 'snippet' ? (lines[0] <= d.end && d.start <= lines[1]) : lines.some((l) => l >= d.start && l <= d.end)) gotD.add(j); });
    };
    for (let k = 0; k < b.n_full; k++) show(a.items[k], a.items[k].shown, true);
    if (b.cut && a.items[b.n_full]) show(a.items[b.n_full], b.cut.shown, b.cut.path_shown !== undefined ? b.cut.path_shown : !!(b.cut.shown && b.cut.shown.length));
    const mine = (gotF.size + gotD.size) / (files.length + defs.length);
    const s = per.find((t) => t.arm === arm && t.role === role && t.set === set && t.id === a.id);
    out.push({ arm, role, set, task_index: i, files_hit: gotF.size, files: files.length, defs_hit: gotD.size, defs: defs.length, recall_independent: mine, recall_score_js: s.r8000, equal: Math.abs(mine - s.r8000) < 1e-12 });
  }
}
fs.writeFileSync(path.join(__dirname, 'handcheck.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
