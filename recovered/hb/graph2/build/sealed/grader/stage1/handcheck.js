'use strict';
// Step 3 hand check: three answers re-scored by hand (independent code, printed for reading) against
// score.js's per-task values. node handcheck.js > handcheck.txt
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms', 'common', 'harness'));
const refs = new Map(fs.readFileSync(path.join(__dirname, '..', 'refs_tune.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const CASES = [
  { arm: 'relational', hash: '8067b9cf65e59b2f', name: 'base', set: 'T1' },
  { arm: 'search', hash: '6dc9af96e07d22da', name: 'pad=CO', set: 'T2' },
  { arm: 'ladybug', hash: '4a391e15daf32a78', name: 'gran=symbol', set: 'T1x' },
];
const pickTask = (answers, set) => {
  // a task with a small reference (3 to 8 units) so the listing can be read whole
  const ok = answers.filter((a) => { const r = refs.get(a.id); const u = r.files.length + r.defs.length; return u >= 3 && u <= 8; });
  return ok[Math.floor(ok.length / 2)];
};
for (const c of CASES) {
  const answers = H.readGzJsonl(path.join(B, 'results', c.arm, 'tune', c.hash + '.' + c.set + '.jsonl.gz'));
  const a = pickTask(answers, c.set); const r = refs.get(a.id);
  console.log('\n==== ' + c.arm + ' ' + c.name + ' ' + c.set + ' task ' + a.id + ' (form ' + a.form + ', granularity ' + a.granularity + ', pad ' + a.pad + ')');
  console.log('seed:', JSON.stringify(r.seed));
  console.log('reference files:', JSON.stringify(r.files.map((f) => f.path || f)));
  console.log('reference defs:', JSON.stringify(r.defs.map((d) => d.path + ':' + d.start + '-' + d.end + ' ' + d.name)));
  const b = a.budgets['8000']; console.log('budget 8000: n_full', b.n_full, 'cut', JSON.stringify(b.cut), 'used', b.used);
  const shownItems = [];
  for (let i = 0; i < b.n_full; i++) shownItems.push({ path: a.items[i].path, symbol: a.items[i].symbol, lines: a.items[i].shown, pathShown: true, pad: a.items[i].pad });
  if (b.cut) shownItems.push({ path: a.items[b.n_full].path, symbol: a.items[b.n_full].symbol, lines: b.cut.shown, pathShown: b.cut.path_shown, pad: b.cut.pad, cut: true });
  const refFiles = r.files.map((f) => f.path || f);
  for (const it of shownItems) {
    const rel = refFiles.includes(it.path) || r.defs.some((d) => d.path === it.path);
    if (rel) console.log('  shown', it.cut ? '(cut)' : '', it.path, it.symbol || '', 'lines', JSON.stringify(it.lines), 'pad', it.pad);
  }
  console.log('  shown items in all:', shownItems.length);
  // independent credit
  const fHit = new Set(); const dHit = new Set();
  for (const it of shownItems) {
    if (it.pathShown && refFiles.includes(it.path)) fHit.add(it.path);
    if (!it.lines || !it.lines.length) continue;
    r.defs.forEach((d, j) => {
      if (d.path !== it.path) return;
      const hit = a.form === 'snippet' ? (it.lines[0] <= d.end && d.start <= it.lines[1]) : it.lines.some((l) => l >= d.start && l <= d.end);
      if (hit) dHit.add(j);
    });
  }
  const mine = (fHit.size + dHit.size) / (refFiles.length + r.defs.length);
  const per = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, c.arm + '.tasks.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse).find((x) => x.config_hash === c.hash && x.set === c.set && x.id === a.id);
  console.log('  hand: files credited', [...fHit].length, 'of', refFiles.length, '; defs credited', dHit.size, 'of', r.defs.length, '; recall@8000 =', mine.toFixed(4));
  console.log('  score.js r8000 =', per.r8000, ' file_r8000 =', per.file_r8000, ' def_r8000 =', per.def_r8000, ' agree:', Math.abs(per.r8000 - mine) < 1e-12);
}
