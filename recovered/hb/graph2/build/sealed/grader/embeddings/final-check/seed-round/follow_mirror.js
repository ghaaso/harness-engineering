'use strict';
// Read-only mirror of handoff.check_answers_follow over a hand-off folder; prints aggregate counts only.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const rd = (f) => { const b = fs.readFileSync(f); return (f.endsWith('.gz') ? zlib.gunzipSync(b) : b).toString('utf8').split('\n').filter(Boolean).map(JSON.parse); };
const d = process.argv[2];
const tf = fs.existsSync(path.join(d, 'tasks_used.jsonl')) ? 'tasks_used.jsonl' : 'tasks.jsonl';
const rows = new Map(rd(path.join(d, tf)).map((r) => [r.id, r]));
const out = { handoff: path.basename(d), tasks: rows.size, variants: 0, answers: 0, head_bad: 0, seed_new_bad: 0, seed_old_bad: 0, budget_bad: 0, file_seed_pos: {}, pad_items: 0 };
for (const f of fs.readdirSync(path.join(d, 'answers')).filter((x) => x.endsWith('.jsonl.gz'))) {
  const n = f.replace('.jsonl.gz', ''); out.variants++;
  const R = new Map(rd(path.join(d, 'ranked', n + '_unrestricted.jsonl.gz')).map((r) => [r.id, r.ranked]));
  for (const a of rd(path.join(d, 'answers', f))) {
    out.answers++;
    const r = R.get(a.id), row = rows.get(a.id);
    const items = Array.isArray(a.items) ? a.items : [];
    const ps = items.map((it) => it.path);
    out.pad_items += items.filter((it) => it.pad).length;
    if (!r || ps.some((p, k) => p !== r[k])) out.head_bad++;
    const s = a.seeds, fs_ = row ? 'file:' + row.seed.path : null;
    const base = !row || a.parent !== row.parent || !Array.isArray(s) || !s.length;
    if (base || !s.includes(fs_)) out.seed_new_bad++;
    if (base || s[0] !== fs_) out.seed_old_bad++;
    if (Array.isArray(s)) { const k = String(s.indexOf(fs_)); out.file_seed_pos[k] = (out.file_seed_pos[k] || 0) + 1; }
    let ok;
    try {
      const b = a.budgets['8000']; const nf = b.n_full, cut = b.cut, used = b.used;
      ok = Number.isInteger(nf) && nf >= 0 && nf <= items.length && used >= 0 && used <= 8000;
      if (ok) { let tot = 0; for (let k = 0; k < nf; k++) tot += Math.trunc(items[k].tok);
        if (cut) { ok = nf < items.length && 0 < cut.tok && cut.tok <= items[nf].tok; tot += cut.tok; }
        ok = ok && tot <= used; }
    } catch (e) { ok = false; }
    if (!ok) out.budget_bad++;
  }
}
console.log(JSON.stringify(out));
