'use strict';
// Preflight check 4, step 4: compare the removed-document answers. My own comparison (no equiv.js):
//  - equivalence: relational, ladybug, duckpgq vs reference on 95e990307da3b42b and 6b70cc1222745385:
//    the packed answer (items, budgets, beyond_sample, seeds, n_ranked, n_units, n_head) must be equal;
//    ranked_sha equality is reported too (it hashes raw scores, so float noise may differ);
//  - absence: no removed path occurs anywhere in an answer record's JSON (items, sample, seeds, meta);
//  - bite: how many answers differ from the stored TUNE answer of the same task (no removal).
// usage: node compare_removed.js <build> <out.json>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = process.argv[2];
const D = path.join(B, 'audit', 'preflight', 'r3', 'removed');
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const V = new Map(fs.readFileSync(path.join(D, 'variants.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return [o.id, o]; }));
const runs = ['relational:95e990307da3b42b', 'reference:95e990307da3b42b', 'ladybug:95e990307da3b42b', 'duckpgq:95e990307da3b42b',
  'relational:6b70cc1222745385', 'reference:6b70cc1222745385', 'ladybug:6b70cc1222745385', 'duckpgq:6b70cc1222745385',
  'ladybug:f233ae069bdba0ce', 'search:e70177e5807f0252', 'search:950c029615d337c1', 'floor-dir:714a474060653c1f', 'floor-co:c4d2f0a60a3d199c'];
const load = (arm, h) => {
  const m = new Map();
  for (const s of ['T1', 'T2']) { const f = path.join(D, 'ans', arm + '_' + h, arm, 'tune', h + '.' + s + '.jsonl.gz'); if (fs.existsSync(f)) for (const r of rd(f)) m.set(r.id, r); }
  return m;
};
const stored = (arm, h) => {
  const m = new Map();
  const a = arm === 'reference' ? 'relational' : arm; // the reference arm has no stored TUNE file for the primary; relational's is identical
  for (const s of ['T1', 'T2']) { const f = path.join(B, 'results', a, 'tune', h + '.' + s + '.jsonl.gz'); if (fs.existsSync(f)) for (const r of rd(f)) if (V.has(r.id)) m.set(r.id, r); }
  return m;
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholePath = (p) => new RegExp('(?<![A-Za-z0-9_./-])' + escRe(p) + '(?![A-Za-z0-9_-]|\\.[A-Za-z0-9])');
const packed = (r) => JSON.stringify([r.items, r.budgets, r.beyond_sample, r.seeds, r.n_ranked, r.n_units, r.n_head]);
const res = { runs: {}, equivalence: {}, absence_failures: [], pass: true };
const A = {};
for (const x of runs) {
  const [arm, h] = x.split(':');
  const m = load(arm, h); A[x] = m;
  const st = stored(arm, h);
  let present = 0; let changed = 0; let compared = 0;
  for (const [id, r] of m) {
    const txt = JSON.stringify(r);
    // whole-path match: "README.md" must not count inside "backend/README.md"
    for (const p of V.get(id).remove_paths) if (wholePath(p).test(txt)) { present++; res.absence_failures.push({ run: x, id, path: p }); }
    for (const p of V.get(id).remove_paths) if (txt.includes(p) && !wholePath(p).test(txt)) res.substring_only = (res.substring_only || 0) + 1;
    const s = st.get(id); if (s) { compared++; if (packed(s) !== packed(r)) changed++; }
  }
  // how many stored answers held a removed path (did the removal have something to remove?)
  let storedHeld = 0; for (const [id, s] of st) { const txt = JSON.stringify([s.items, s.beyond_sample]); if (V.get(id).remove_paths.some((p) => wholePath(p).test(txt))) storedHeld++; }
  res.runs[x] = { answers: m.size, removed_path_present: present, stored_answers_compared: compared, stored_answers_holding_a_removed_path: storedHeld, answers_changed_vs_stored: changed };
  if (m.size !== 15 || present) res.pass = false;
}
for (const h of ['95e990307da3b42b', '6b70cc1222745385']) {
  const ref = A['reference:' + h];
  for (const arm of ['relational', 'ladybug', 'duckpgq']) {
    const m = A[arm + ':' + h]; let eq = 0; let sha = 0; const diff = [];
    for (const [id, r] of ref) { const o = m.get(id); if (o && packed(o) === packed(r)) eq++; else diff.push(id); if (o && o.ranked_sha === r.ranked_sha) sha++; }
    res.equivalence[arm + ' vs reference ' + h] = { tasks: ref.size, packed_equal: eq, ranked_sha_equal: sha, differing: diff };
    if (eq !== ref.size || ref.size !== 15) res.pass = false;
  }
}
fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
