'use strict';
// Auditor's answer-level scorer: the scoreTask logic of build/audit/selection/myscore.js (written from protocol
// addendum 2 section A, rule "content", independent of arms/common/score.js), extended to any split and any answer
// file. It reads no grader file. Per task: recall within 8,000 tokens of reference files + definitions.
//   node aud_answer.js <references.jsonl> <out.jsonl> <answers.jsonl.gz>...
// Writes {file, id, r8000, units} rows to <out.jsonl> (sealed audit folder). Prints counts only.
const fs = require('fs'); const zlib = require('zlib');
const [REFS, OUT, ...FILES] = process.argv.slice(2);
const refs = new Map();
for (const l of fs.readFileSync(REFS, 'utf8').split('\n')) { if (!l) continue; const r = JSON.parse(l); refs.set(r.id, r); }
function shownAt(rec, B) {
  const b = rec.budgets[String(B)]; const paths = new Set(); const lines = new Map(); const span = rec.form === 'snippet';
  const add = (p, ls) => {
    if (!lines.has(p)) lines.set(p, []); if (!ls) return;
    if (span) { if (ls.length !== 2) throw new Error('snippet span expected'); for (let x = ls[0]; x <= ls[1]; x++) lines.get(p).push(x); } else for (const x of ls) lines.get(p).push(x);
  };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; paths.add(it.path); add(it.path, it.shown); }
  if (b.cut) { const it = rec.items[b.n_full]; if (!it) throw new Error('cut item missing'); if (b.cut.path_shown) paths.add(it.path); add(it.path, b.cut.shown); }
  return { paths, lines };
}
const out = []; const info = {};
for (const f of FILES) {
  const recs = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let n = 0; let zero = 0; let noncontent = 0; const seen = new Set();
  for (const rec of recs) {
    if (seen.has(rec.id)) throw new Error('duplicate task'); seen.add(rec.id);
    const ref = refs.get(rec.id); if (!ref) throw new Error('no reference');
    const units = ref.files.length + ref.defs.length; if (!units) { zero++; continue; }
    if (rec.form !== 'signature' && rec.form !== 'snippet') { noncontent++; continue; }
    const s = shownAt(rec, 8000); let c = 0;
    for (const x of ref.files) if (s.paths.has(x.path)) c++;
    for (const x of ref.defs) { const ls = s.lines.get(x.path) || []; if (ls.some((l) => l >= x.start && l <= x.end)) c++; }
    out.push({ file: f, id: rec.id, r8000: c / units, units }); n++;
  }
  info[f.split('/').slice(-3).join('/')] = { records: recs.length, scored: n, zero_units: zero, noncontent };
}
fs.writeFileSync(OUT, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log(JSON.stringify(info));
