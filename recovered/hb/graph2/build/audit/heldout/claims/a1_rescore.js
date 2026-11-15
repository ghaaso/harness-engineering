'use strict';
// Refuter 3 (claims). Independent re-scoring of stored held-out answers and sensitivity analyses.
// Reads only; writes only into this folder. No arm is started.
const fs = require('fs'); const zlib = require('zlib'); const path = require('path');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = B + '/audit/heldout/claims';
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

// references (own parser)
const refs = new Map();
for (const r of jl(B + '/sealed/grader/heldout/refs_heldout.jsonl')) {
  const files = [...new Set((r.files || []).map((f) => f.path))];
  const defs = (r.defs || []).map((d) => ({ path: d.path, s: d.start, e: d.end == null ? d.start : d.end, kind: d.kind }));
  refs.set(r.id, { id: r.id, set: r.set, commit: r.commit || r.fix_commit || null, nfiles_all: r.commit_n_files_all, files, defs, seed: r.seed });
}
const runtimeOf = (p) => (!p ? 'other' : p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : (p.startsWith('src/') || /^[^/]+\.(m?js|jsx|html)$/.test(p)) ? 'web' : 'other');

const ROWS = {
  typed: 'relational/primary', lb: 'ladybug/primary', dp: 'duckpgq/primary', s1: 'relational/s1',
  lbs2: 'ladybug/s2', lbs2d1: 'ladybug/s2-draw1', lbs2d2: 'ladybug/s2-draw2', lbs2d3: 'ladybug/s2-draw3', lbs2d4: 'ladybug/s2-draw4',
  search: 'search/primary', search2: 'search/s2', fdir: 'floor-dir/primary', fco: 'floor-co/primary',
};
const SETS = ['T1', 'T2', 'T3', 'T4'];
const BUD = [2000, 4000, 8000, 16000];

function scoreOne(a, ref) {
  const units = ref.files.length + ref.defs.length; if (!units) return null;
  const res = { id: a.id, units, seed_match: a.seed_match, n_head: a.n_head, lookups: a.lookups };
  const crediting = (it, shown, pathShown) => {
    const f = pathShown && ref.files.includes(it.path) ? ['f:' + it.path] : [];
    const d = [];
    if (shown && shown.length && (a.form === 'signature' || a.form === 'snippet')) {
      ref.defs.forEach((x, j) => {
        if (x.path !== it.path) return;
        const hit = a.form === 'snippet' ? (shown[0] <= x.e && x.s <= shown[1]) : shown.some((l) => l >= x.s && l <= x.e);
        if (hit) d.push('d:' + j);
      });
    }
    return f.concat(d);
  };
  for (const b of BUD) {
    const bb = a.budgets[b] || a.budgets[String(b)];
    const all = new Set(); const head = new Set(); const padU = new Set(); const hist = new Set(); const struct = new Set();
    const take = (it, keys, isPad) => {
      keys.forEach((k) => {
        all.add(k);
        if (isPad) padU.add(k); else head.add(k);
        if (!isPad) { const v = it.via || []; if (v.includes('co_changed')) hist.add(k); else struct.add(k); }
      });
    };
    for (let i = 0; i < bb.n_full; i++) take(a.items[i], crediting(a.items[i], a.items[i].shown, true), a.items[i].pad);
    if (bb.cut && a.items[bb.n_full]) {
      const it = a.items[bb.n_full];
      const ps = bb.cut.path_shown !== undefined ? bb.cut.path_shown : !!(bb.cut.shown && bb.cut.shown.length);
      take(it, crediting(it, bb.cut.shown, ps), bb.cut.pad !== undefined ? bb.cut.pad : it.pad);
    }
    res['r' + b] = all.size / units; res['head' + b] = head.size / units;
    res['padonly' + b] = [...padU].filter((k) => !head.has(k)).length / units;
    res['viaHist' + b] = hist.size / units; res['viaStructOnly' + b] = [...struct].filter((k) => !hist.has(k)).length / units;
    res['tok' + b] = bb.used;
  }
  res.fileR8 = ref.files.length ? (function () { let n = 0; const bb = a.budgets['8000']; const s = new Set(); for (let i = 0; i < bb.n_full; i++) if (ref.files.includes(a.items[i].path)) s.add(a.items[i].path); return s.size / ref.files.length; })() : null;
  return res;
}

const per = {}; // per[row][set] = Map id -> score
for (const [k, rel] of Object.entries(ROWS)) {
  per[k] = {};
  for (const s of SETS) {
    const m = new Map();
    for (const a of gz(`${B}/results/heldout/${rel}/${s}.jsonl.gz`)) { const r = refs.get(a.id); if (!r) continue; const sc = scoreOne(a, r); if (sc) m.set(a.id, sc); }
    per[k][s] = m;
  }
}

// compare with the grader's per-task scores
const grader = new Map();
for (const t of gz(B + '/sealed/grader/heldout/tasks.jsonl.gz')) grader.set([t.arm, t.role, t.set, t.id].join('|'), t);
let cmp = 0; let mism = 0; const mismEx = [];
for (const [k, rel] of Object.entries(ROWS)) {
  const [arm, role] = rel.split('/');
  for (const s of SETS) for (const [id, sc] of per[k][s]) {
    const g = grader.get([arm, role, s, id].join('|')); if (!g) { mism++; mismEx.push(['missing', k, s, id]); continue; }
    for (const b of BUD) { cmp++; if (Math.abs(g['r' + b] - sc['r' + b]) > 1e-12) { mism++; if (mismEx.length < 10) mismEx.push([k, s, id, b, g['r' + b], sc['r' + b]]); } }
  }
}

fs.writeFileSync(OUT + '/a1_per.json', JSON.stringify({ per: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([s, m]) => [s, [...m.values()]]))])) }));
fs.writeFileSync(OUT + '/a1_refs_meta.json', JSON.stringify([...refs.values()].map((r) => ({ id: r.id, set: r.set, commit: r.commit, nfiles_all: r.nfiles_all, units: r.files.length + r.defs.length, seed_runtime: runtimeOf(r.seed && r.seed.path) }))));
console.log(JSON.stringify({ comparisons: cmp, mismatches: mism, examples: mismEx }, null, 1));
